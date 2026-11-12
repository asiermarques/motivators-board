import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configModuleSource, describeSources, isConfigPath, resolveConfigSources } from "./config-sources";

let root: string;
const example = () => join(root, "config.example");
const own = () => join(root, "config");

function write(path: string, content = "") {
  const file = join(root, path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

/** The Sample configuration every test starts from. */
function sample() {
  write("config.example/settings.yml");
  write("config.example/theme.css");
  write("config.example/motivators/discovery.md");
  write("config.example/motivators/craft.md");
  write("config.example/motivators/belonging.md");
  write("config.example/craft.svg");
  write("config.example/logo.PNG");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "motivators-board-"));
  sample();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("resolveConfigSources", () => {
  it("reads everything from the Sample configuration when there is no config folder", () => {
    const sources = resolveConfigSources(root, undefined);
    expect(sources.settings).toEqual({ path: join(example(), "settings.yml"), label: "config.example/settings.yml" });
    expect(sources.theme).toEqual({ path: join(example(), "theme.css"), label: "config.example/theme.css" });
    expect(sources.motivators.label).toBe("config.example/motivators/");
    expect(sources.motivators.files).toEqual(
      ["belonging", "craft", "discovery"].map((key) => ({
        key,
        path: join(example(), "motivators", `${key}.md`),
        label: `config.example/motivators/${key}.md`,
      })),
    );
    expect(sources.images).toEqual({ "craft.svg": join(example(), "craft.svg"), "logo.PNG": join(example(), "logo.PNG") });
    expect(sources.strings).toEqual({});
    expect(sources.folders).toEqual(["config/", "config.example/"]);
  });

  it("takes each file of the config folder instead of the sample one of the same name", () => {
    write("config/settings.yml");
    write("config/theme.css");
    write("config/craft.svg");
    write("config/brand.png");
    const sources = resolveConfigSources(root, undefined);
    expect(sources.settings).toEqual({ path: join(own(), "settings.yml"), label: "config/settings.yml" });
    expect(sources.theme.label).toBe("config/theme.css");
    expect(sources.images).toEqual({
      "craft.svg": join(own(), "craft.svg"),
      "logo.PNG": join(example(), "logo.PNG"),
      "brand.png": join(own(), "brand.png"),
    });
  });

  it("takes the motivators/ folder of the config folder as the whole set of Motivators", () => {
    write("config/motivators/craft.md");
    write("config/motivators/money.md");
    const sources = resolveConfigSources(root, undefined);
    expect(sources.motivators.label).toBe("config/motivators/");
    expect(sources.motivators.files.map((file) => file.label)).toEqual(["config/motivators/craft.md", "config/motivators/money.md"]);
  });

  it("has no Motivator files when the config folder has an empty motivators/ folder", () => {
    mkdirSync(join(own(), "motivators"), { recursive: true });
    const sources = resolveConfigSources(root, undefined);
    expect(sources.motivators).toEqual({ label: "config/motivators/", path: join(own(), "motivators"), files: [] });
  });

  it("only takes the .md files of the motivators/ folder as Motivator files, leaving out its README and hidden files", () => {
    write("config/motivators/craft.md");
    write("config/motivators/README.md");
    write("config/motivators/.draft.md");
    write("config/motivators/notes.txt");
    expect(resolveConfigSources(root, undefined).motivators.files.map((file) => file.key)).toEqual(["craft"]);
  });

  it("reads the UI strings of each Locale from i18n/, the config folder's file winning over the sample one", () => {
    write("config.example/i18n/en.yml");
    write("config.example/i18n/es.yml");
    write("config/i18n/es.yml");
    write("config/i18n/notes.txt");
    expect(resolveConfigSources(root, undefined).strings).toEqual({
      en: { path: join(example(), "i18n", "en.yml"), label: "config.example/i18n/en.yml" },
      es: { path: join(own(), "i18n", "es.yml"), label: "config/i18n/es.yml" },
    });
  });

  it("reads the config folder named by the setting, relative to the working directory", () => {
    write("ladder/settings.yml");
    const sources = resolveConfigSources(root, "ladder/");
    expect(sources.settings.label).toBe("ladder/settings.yml");
    expect(sources.folders).toEqual(["ladder/", "config.example/"]);
  });

  it("fails when the folder named by the setting does not exist", () => {
    expect(() => resolveConfigSources(root, "missing")).toThrow(/MOTIVATORS_BOARD_CONFIG_DIR is set to "missing"/);
  });

  it("reads the Sample configuration from the package root, and the config folder from the working directory", () => {
    const adopter = mkdtempSync(join(tmpdir(), "motivators-board-adopter-"));
    try {
      mkdirSync(join(adopter, "config"));
      writeFileSync(join(adopter, "config", "settings.yml"), "");
      const sources = resolveConfigSources(adopter, undefined, root);
      expect(sources.settings.path).toBe(join(adopter, "config", "settings.yml"));
      expect(sources.theme.path).toBe(join(example(), "theme.css"));
    } finally {
      rmSync(adopter, { recursive: true, force: true });
    }
  });

  it("lists the files of the config folder that are not used", () => {
    write("config/settings.yml");
    write("config/README.md");
    write("config/notes.txt");
    write("config/motivators/draft.txt");
    expect(resolveConfigSources(root, undefined).unrecognised).toEqual(["notes.txt", "motivators/draft.txt"]);
  });
});

describe("isConfigPath", () => {
  it("is true for the files whose addition or removal changes the Configuration", () => {
    const folders = [own(), example()];
    expect(isConfigPath(join(own(), "settings.yml"), folders)).toBe(true);
    expect(isConfigPath(join(example(), "motivators", "craft.md"), folders)).toBe(true);
    expect(isConfigPath(join(own(), "i18n", "es.yml"), folders)).toBe(true);
    expect(isConfigPath(join(own(), "motivators"), folders)).toBe(true);
    expect(isConfigPath(join(root, "snapshots", "a.csv"), folders)).toBe(false);
  });
});

describe("describeSources", () => {
  it("says where each part of the Configuration comes from, and warns about unused files", () => {
    write("config/settings.yml");
    write("config/notes.txt");
    const { info, warnings } = describeSources(resolveConfigSources(root, undefined));
    expect(info).toEqual(["motivators/ ← config.example/ (3 files)", "settings.yml ← config/", "theme.css ← config.example/"]);
    expect(warnings).toEqual([expect.stringContaining("config/notes.txt is not a configuration file and is ignored")]);
  });
});

describe("configModuleSource", () => {
  it("imports every Motivator file, the settings, the UI strings and the images", () => {
    write("config/i18n/en.yml");
    const source = configModuleSource(resolveConfigSources(root, undefined));
    expect(source).toContain(`${join(example(), "motivators", "craft.md")}?motivator`);
    expect(source).toContain(join(example(), "settings.yml"));
    expect(source).toContain(join(own(), "i18n", "en.yml"));
    expect(source).toContain(`${join(example(), "craft.svg")}?url`);
  });
});
