// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
let outDir: string;

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "motivators-board-build-"));
  await build({ root, logLevel: "silent", build: { outDir, emptyOutDir: true } });
}, 60_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

const files = (folder: string) => readdirSync(join(outDir, folder));

describe("the build", () => {
  it("references every file of the page with a relative path, so it can be served from any sub-path", () => {
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    const paths = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(path).toMatch(/^\.\//);
  });

  it("never points the scripts at an asset at the root of the host", () => {
    // Small icons are inlined; larger images an adopter adds are emitted to assets/ and loaded relative to the script.
    for (const name of files("assets").filter((name) => name.endsWith(".js"))) {
      expect(readFileSync(join(outDir, "assets", name), "utf8")).not.toContain('"/assets/');
    }
  });
});
