// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initAdopterRepository, InitError, SCRIPTS } from "./init";

let packageRoot: string;
let cwd: string;
let lines: string[];

const read = (path: string) => readFileSync(join(cwd, path), "utf8");
const manifest = () => JSON.parse(read("package.json"));
const init = () => initAdopterRepository({ cwd, packageRoot, log: (line) => lines.push(line) });

beforeEach(() => {
  packageRoot = mkdtempSync(join(tmpdir(), "motivators-board-package-"));
  cwd = mkdtempSync(join(tmpdir(), "motivators-board-adopter-"));
  lines = [];
  mkdirSync(join(packageRoot, "config.example", "motivators"), { recursive: true });
  writeFileSync(join(packageRoot, "config.example", "settings.yml"), "locale: en\n");
  writeFileSync(join(packageRoot, "config.example", "motivators", "craft.md"), "craft");
  mkdirSync(join(packageRoot, "config"));
  writeFileSync(join(packageRoot, "config", "README.md"), "# Your configuration\n");
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: "motivators-board", version: "1.0.0" }));
});

afterEach(() => {
  rmSync(packageRoot, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

describe("initAdopterRepository", () => {
  it("copies the Sample configuration to config/", () => {
    init();
    expect(read("config/settings.yml")).toBe("locale: en\n");
    expect(read("config/motivators/craft.md")).toBe("craft");
  });

  it("adds the README that explains the config folder", () => {
    init();
    expect(read("config/README.md")).toBe("# Your configuration\n");
  });

  it("never overwrites a file the Adopter already has", () => {
    mkdirSync(join(cwd, "config"));
    writeFileSync(join(cwd, "config", "settings.yml"), "locale: es\n");
    init();
    expect(read("config/settings.yml")).toBe("locale: es\n");
    expect(lines).toContain(join("config", "settings.yml") + " already exists, kept");
  });

  it("creates a package.json that depends on motivators-board, with the npm scripts", () => {
    init();
    expect(manifest()).toMatchObject({ private: true, scripts: SCRIPTS, dependencies: { "motivators-board": "^1.0.0" } });
    expect(SCRIPTS).toEqual({
      dev: "motivators-board dev",
      build: "motivators-board build",
      preview: "motivators-board preview",
      check: "motivators-board check",
    });
  });

  it("adds what is missing to an existing package.json and keeps the rest", () => {
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify({ name: "our-board", scripts: { dev: "vite" }, dependencies: { "motivators-board": "~1.0.0" } }),
    );
    init();
    expect(manifest()).toEqual({
      name: "our-board",
      scripts: { dev: "vite", build: SCRIPTS.build, preview: SCRIPTS.preview, check: SCRIPTS.check },
      dependencies: { "motivators-board": "~1.0.0" },
    });
  });

  it("keeps the build and the dependencies out of git", () => {
    init();
    expect(read(".gitignore")).toBe("node_modules/\ndist/\n");
    writeFileSync(join(cwd, ".gitignore"), "dist\n.env");
    init();
    expect(read(".gitignore")).toBe("dist\n.env\nnode_modules/\n");
  });

  it("refuses a config that is not a folder", () => {
    writeFileSync(join(cwd, "config"), "");
    expect(init).toThrow(InitError);
    expect(existsSync(join(cwd, "package.json"))).toBe(false);
  });
});
