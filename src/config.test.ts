import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig, parseConfig, type Origins } from "./config";
import { SHIPPED_STRINGS } from "./strings";

const origins: Origins = {
  settings: "config.example/settings.yml",
  motivators: "config.example/motivators/",
  motivatorFiles: ["config.example/motivators/craft.md", "config.example/motivators/discovery.md"],
  folders: ["config/", "config.example/"],
  strings: {},
  stringsFolder: "config/i18n/",
  keys: { craft: "config.example/motivators/craft.md", discovery: "config.example/motivators/discovery.md" },
};

const images = { "craft.svg": "/assets/craft.svg", "discovery.svg": "/assets/discovery.svg", "logo.svg": "/assets/logo.svg" };

const craft = { key: "craft", icon: "craft.svg", colour: "#2f7d6d", title: "Craft", description: "Doing it well." };
const discovery = { key: "discovery", icon: "discovery.svg", colour: "#c0361c", title: "Discovery", description: "Learning." };
const settings = { title: "Our Motivators", logo: "logo.svg", footer: "Made by us", locale: "en" };

function problemsOf(raw: Parameters<typeof parseConfig>[0]): string[] {
  try {
    parseConfig(raw, images, origins);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
}

describe("parseConfig", () => {
  it("turns the raw Configuration into Motivators in Configuration order and the settings", () => {
    const config = parseConfig({ motivators: [craft, discovery], settings, problems: [], strings: {} }, images, origins);
    expect(config).toEqual({
      settings: { title: "Our Motivators", logo: "/assets/logo.svg", footer: "Made by us", locale: "en" },
      motivators: [
        { key: "craft", icon: "/assets/craft.svg", colour: "#2f7d6d", title: "Craft", description: "Doing it well." },
        { key: "discovery", icon: "/assets/discovery.svg", colour: "#c0361c", title: "Discovery", description: "Learning." },
      ],
      strings: SHIPPED_STRINGS.en,
    });
  });

  it("leaves the logo and the footer out when they are not set, and gives a default title", () => {
    const config = parseConfig({ motivators: [craft], settings: { locale: "en" }, problems: [], strings: {} }, images, origins);
    expect(config.settings).toEqual({ title: "Motivators Board", locale: "en" });
  });

  it("lists the problems found while reading the Motivator files with its own", () => {
    expect(problemsOf({ motivators: [craft], settings: {}, problems: ["config.example/motivators/x.md:1: broken"], strings: {} })).toEqual([
      "config.example/motivators/x.md:1: broken",
      'config.example/settings.yml needs a "locale", the Locale of the Titles, Descriptions and UI strings, e.g. "en"',
    ]);
  });

  it("reports a Configuration with no Motivator", () => {
    expect(problemsOf({ motivators: [], settings, problems: [], strings: {} })).toEqual([
      "config.example/motivators/ has no Motivator file; add a .md file for each Motivator",
    ]);
  });

  it("reports an icon or a logo that is not in the config folder", () => {
    expect(
      problemsOf({ motivators: [{ ...craft, icon: "lens.svg" }], settings: { ...settings, logo: "brand.png" }, problems: [], strings: {} }),
    ).toEqual([
      'config.example/motivators/craft.md: icon "lens.svg" was not found in config/ or config.example/',
      'config.example/settings.yml: logo "brand.png" was not found in config/ or config.example/',
    ]);
  });

  it("reports a Motivator key outside [a-z0-9-]+, which is the name of its Motivator file", () => {
    const keys = { "Craft Work": "config.example/motivators/Craft Work.md" };
    expect(() => parseConfig({ motivators: [craft], settings, problems: [], strings: {} }, images, { ...origins, keys })).toThrow(
      new ConfigError([
        'config.example/motivators/Craft Work.md: the Motivator key "Craft Work" must use only lowercase letters, digits and "-"; rename the file, e.g. "craft-work.md"',
      ]),
    );
  });

  it("reports a Reserved parameter used as a Motivator key, even in a file that could not be read", () => {
    const keys = { order: "config.example/motivators/order.md", name: "config.example/motivators/name.md" };
    const raw = { motivators: [craft], settings, problems: ["config.example/motivators/name.md:5: the Description is empty"], strings: {} };
    expect(() => parseConfig(raw, images, { ...origins, keys })).toThrow(
      new ConfigError([
        "config.example/motivators/name.md:5: the Description is empty",
        'config.example/motivators/order.md: "order" is reserved for the Share link (name, lang, met, unmet, order) and cannot be a Motivator key; rename the file',
        'config.example/motivators/name.md: "name" is reserved for the Share link (name, lang, met, unmet, order) and cannot be a Motivator key; rename the file',
      ]),
    );
  });

  it("reports met and unmet, the Fulfilment parameters, as Reserved parameters", () => {
    const keys = { met: "config.example/motivators/met.md", unmet: "config.example/motivators/unmet.md" };
    expect(() => parseConfig({ motivators: [craft], settings, problems: [], strings: {} }, images, { ...origins, keys })).toThrow(
      new ConfigError([
        'config.example/motivators/met.md: "met" is reserved for the Share link (name, lang, met, unmet, order) and cannot be a Motivator key; rename the file',
        'config.example/motivators/unmet.md: "unmet" is reserved for the Share link (name, lang, met, unmet, order) and cannot be a Motivator key; rename the file',
      ]),
    );
  });

  it("reports a locale that is not a language code", () => {
    expect(problemsOf({ motivators: [craft], settings: { ...settings, locale: "English" }, problems: [], strings: {} })).toEqual([
      'config.example/settings.yml: locale "English" must be a language code such as "en" or "pt-BR"',
    ]);
  });

  it("reports settings it does not know, such as a second Locale", () => {
    expect(problemsOf({ motivators: [craft], settings: { ...settings, locales: ["en", "es"], colour: "red" }, problems: [], strings: {} })).toEqual([
      'config.example/settings.yml: "locales" is not a setting; only one Locale can be declared, with "locale"',
      'config.example/settings.yml: "colour" is not a setting; use title, logo, footer and locale',
    ]);
  });

  it("reports a locale that is a list of Locales", () => {
    expect(problemsOf({ motivators: [craft], settings: { ...settings, locale: ["en", "es"] }, problems: [], strings: {} })).toEqual([
      'config.example/settings.yml: "locale" must be one language code such as "en"; only one Locale can be declared',
    ]);
  });

  it("reports settings that are not a list of key: value lines", () => {
    expect(problemsOf({ motivators: [craft], settings: ["en"], problems: [], strings: {} })).toEqual([
      'config.example/settings.yml must be a list of "key: value" lines',
      'config.example/settings.yml needs a "locale", the Locale of the Titles, Descriptions and UI strings, e.g. "en"',
    ]);
  });
});

describe("UI strings", () => {
  const withStrings = (locale: string, strings: Record<string, unknown>, labels: Record<string, string>) =>
    parseConfig({ motivators: [craft], settings: { ...settings, locale }, problems: [], strings }, images, { ...origins, strings: labels });

  it("uses the shipped UI strings of the Locale", () => {
    expect(withStrings("en", {}, {}).strings).toEqual(SHIPPED_STRINGS.en);
  });

  it("replaces the shipped UI strings with the Adopter's overrides, one by one", () => {
    const strings = withStrings("en", { en: { board: { least: "Matters less" } } }, { en: "config/i18n/en.yml" }).strings;
    expect(strings.board).toEqual({ ...SHIPPED_STRINGS.en.board, least: "Matters less" });
    expect(strings.share).toEqual(SHIPPED_STRINGS.en.share);
  });

  it("reports overrides that are not UI strings, or not texts", () => {
    expect(() =>
      withStrings("en", { en: { board: { least: 3, lest: "x" }, extra: "y" } }, { en: "config/i18n/en.yml" }),
    ).toThrow(
      new ConfigError([
        'config/i18n/en.yml: "board.least" must be a text',
        'config/i18n/en.yml: "board.lest" is not a UI string',
        'config/i18n/en.yml: "extra" is not a UI string',
      ]),
    );
  });

  it("reports every UI string missing for a Locale that is not shipped", () => {
    let problems: string[] = [];
    try {
      withStrings("es", { es: { board: { least: "Menos importante" } } }, { es: "config/i18n/es.yml" });
    } catch (error) {
      problems = (error as ConfigError).problems;
    }
    expect(problems).toContain('config/i18n/es.yml: the UI string "board.most" is missing for the Locale "es"');
    expect(problems).not.toContain('config/i18n/es.yml: the UI string "board.least" is missing for the Locale "es"');
  });

  it("names the file to write when a Locale that is not shipped has no UI strings at all", () => {
    let problems: string[] = [];
    try {
      withStrings("es", {}, {});
    } catch (error) {
      problems = (error as ConfigError).problems;
    }
    expect(problems[0]).toBe('config/i18n/es.yml: the UI string "board.label" is missing for the Locale "es"');
  });

  it("reports a strings file for a Locale that settings.yml does not declare", () => {
    expect(() => withStrings("en", { fr: { board: { least: "Moins" } } }, { fr: "config/i18n/fr.yml" })).toThrow(
      new ConfigError(['config/i18n/fr.yml: the Locale "fr" is not declared in config.example/settings.yml ("en"); remove the file or change the locale']),
    );
  });

  it("reports a strings file that is not a list of key: value lines", () => {
    expect(() => withStrings("en", { en: ["x"] }, { en: "config/i18n/en.yml" })).toThrow(
      new ConfigError(['config/i18n/en.yml must be a list of "key: value" lines']),
    );
  });
});

describe("loadConfig", () => {
  it("loads the Sample configuration without problems", () => {
    const config = loadConfig();
    expect(config.settings.locale).toBe("en");
    expect(config.motivators.length).toBeGreaterThanOrEqual(8);
    for (const motivator of config.motivators) {
      expect(motivator.key).toMatch(/^[a-z0-9-]+$/);
      expect(motivator.icon).toBeTruthy();
    }
  });
});
