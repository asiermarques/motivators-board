// Turns the Configuration resolved at build time into a validated, typed Config.
// Adapted from progression-radar 1.3.0 (src/config.ts).
import { images as configImages, origins as configOrigins, raw as rawConfig } from "virtual:motivators-board-config";
import { SHIPPED_STRINGS, type UiStrings } from "./strings";
import { MOTIVATOR_KEY, RESERVED_PARAMETERS, type Config, type Motivator, type Settings } from "./model";

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

export function loadConfig(): Config {
  return parseConfig(rawConfig, configImages, configOrigins);
}

/** Where each file was read from, e.g. "config.example/settings.yml", so problems can name it. */
export interface Origins {
  settings: string;
  /** The motivators/ folder. */
  motivators: string;
  /** The Motivator file of each raw Motivator, in the same order. */
  motivatorFiles: string[];
  /** Folders searched for images, in order, e.g. ["config/", "config.example/"]. */
  folders: string[];
  /** The UI strings file of each Locale that has one, e.g. { es: "config/i18n/es.yml" }. */
  strings: Record<string, string>;
  /** Where a UI strings file is added, e.g. "config/i18n/". */
  stringsFolder: string;
  /** Every Motivator file by its Motivator key, the ones that could not be read too. */
  keys: Record<string, string>;
}

interface RawConfig {
  /** The Motivator files that could be read, in Configuration order, each with its key. */
  motivators: unknown[];
  settings: unknown;
  /** The parsed UI strings file of each Locale that has one. */
  strings: Record<string, unknown>;
  /** Mistakes already found while reading the Motivator files, listed with the ones found here. */
  problems: string[];
}

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const LOCALE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const DEFAULT_TITLE = "Motivators Board";
const SETTINGS = ["title", "logo", "footer", "locale"];

/** Validates the raw Configuration. Throws a ConfigError listing every problem found. */
export function parseConfig(raw: RawConfig, images: Record<string, string>, origins: Origins): Config {
  const problems = [...raw.problems];
  const searched = origins.folders.join(" or ");
  const image = (name: string, where: string, what: string) => {
    if (!images[name]) problems.push(`${where}: ${what} "${name}" was not found in ${searched}`);
    return images[name];
  };

  const motivators = raw.motivators.map((item, index): Motivator => {
    const motivator = item as Motivator;
    return { ...motivator, icon: image(motivator.icon, origins.motivatorFiles[index], "icon") };
  });
  for (const [key, file] of Object.entries(origins.keys)) keyProblem(key, file, problems);
  // When a Motivator file was reported as wrong there is nothing more to say about the missing list.
  if (raw.motivators.length === 0 && raw.problems.length === 0) {
    problems.push(`${origins.motivators} has no Motivator file; add a .md file for each Motivator`);
  }

  const settings = parseSettings(raw.settings, origins.settings, image, problems);
  // Without a valid Locale there is no way to tell which UI strings are missing.
  const strings = LOCALE.test(settings.locale) ? parseStrings(raw.strings, settings.locale, origins, problems) : {};

  if (problems.length > 0) throw new ConfigError(problems);
  return { settings, motivators, strings };
}

const SHIPPED: Record<string, UiStrings> = SHIPPED_STRINGS;

/** Every UI string by its dotted name, e.g. "board.least". */
function flatten(strings: UiStrings, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [name, value] of Object.entries(strings)) {
    if (typeof value === "string") result.set(prefix + name, value);
    else for (const [inner, text] of flatten(value, `${prefix}${name}.`)) result.set(inner, text);
  }
  return result;
}

function unflatten(flat: Map<string, string>): UiStrings {
  const result: UiStrings = {};
  for (const [name, text] of flat) {
    const parts = name.split(".");
    let node = result;
    for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as UiStrings;
    node[parts[parts.length - 1]] = text;
  }
  return result;
}

/**
 * The UI strings of the declared Locale: the shipped ones, each replaced by the Adopter's override when there is one.
 * A Locale that is not shipped must translate every UI string.
 */
function parseStrings(raw: Record<string, unknown>, locale: string, origins: Origins, problems: string[]): UiStrings {
  const reference = flatten(SHIPPED_STRINGS.en);
  const shipped = SHIPPED[locale] ? flatten(SHIPPED[locale]) : new Map<string, string>();
  const file = origins.strings[locale] ?? `${origins.stringsFolder}${locale}.yml`;

  for (const other of Object.keys(raw).filter((name) => name !== locale)) {
    problems.push(`${origins.strings[other]}: the Locale "${other}" is not declared in ${origins.settings} ("${locale}"); remove the file or change the locale`);
  }

  const overrides = new Map<string, string>();
  const own = raw[locale];
  if (own !== undefined && own !== null) {
    if (!isObject(own)) problems.push(`${file} must be a list of "key: value" lines`);
    else readOverrides(own, "", file, reference, overrides, problems);
  }

  const strings = new Map<string, string>();
  for (const name of reference.keys()) {
    const text = overrides.get(name) ?? shipped.get(name);
    if (text === undefined) problems.push(`${file}: the UI string "${name}" is missing for the Locale "${locale}"`);
    else strings.set(name, text);
  }
  return unflatten(strings);
}

function readOverrides(node: Raw, prefix: string, file: string, reference: Map<string, string>, into: Map<string, string>, problems: string[]) {
  for (const [key, value] of Object.entries(node)) {
    const name = prefix + key;
    if (reference.has(name)) {
      if (typeof value === "string") into.set(name, value);
      else problems.push(`${file}: "${name}" must be a text`);
    } else if (isObject(value) && [...reference.keys()].some((known) => known.startsWith(`${name}.`))) {
      readOverrides(value, `${name}.`, file, reference, into, problems);
    } else {
      problems.push(`${file}: "${name}" is not a UI string`);
    }
  }
}

function keyProblem(key: string, file: string, problems: string[]) {
  if ((RESERVED_PARAMETERS as readonly string[]).includes(key)) {
    problems.push(`${file}: "${key}" is reserved for the Share link (${RESERVED_PARAMETERS.join(", ")}) and cannot be a Motivator key; rename the file`);
  } else if (!MOTIVATOR_KEY.test(key)) {
    const suggestion = key.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const example = suggestion && !(RESERVED_PARAMETERS as readonly string[]).includes(suggestion) ? `, e.g. "${suggestion}.md"` : "";
    problems.push(`${file}: the Motivator key "${key}" must use only lowercase letters, digits and "-"; rename the file${example}`);
  }
}

function parseSettings(
  raw: unknown,
  file: string,
  image: (name: string, where: string, what: string) => string | undefined,
  problems: string[],
): Settings {
  if (!isObject(raw) && raw !== null && raw !== undefined) problems.push(`${file} must be a list of "key: value" lines`);
  const values = isObject(raw) ? raw : {};

  for (const name of Object.keys(values).filter((name) => !SETTINGS.includes(name))) {
    problems.push(
      /^(locales|languages?|default_?locale)$/i.test(name)
        ? `${file}: "${name}" is not a setting; only one Locale can be declared, with "locale"`
        : `${file}: "${name}" is not a setting; use title, logo, footer and locale`,
    );
  }

  if (Array.isArray(values.locale)) {
    problems.push(`${file}: "locale" must be one language code such as "en"; only one Locale can be declared`);
  } else if (!isNonEmptyString(values.locale)) {
    problems.push(`${file} needs a "locale", the Locale of the Titles, Descriptions and UI strings, e.g. "en"`);
  } else if (!LOCALE.test(values.locale)) {
    problems.push(`${file}: locale "${values.locale}" must be a language code such as "en" or "pt-BR"`);
  }

  const settings: Settings = {
    title: isNonEmptyString(values.title) ? values.title : DEFAULT_TITLE,
    locale: typeof values.locale === "string" ? values.locale : "",
  };
  if (isNonEmptyString(values.logo)) settings.logo = image(values.logo, file, "logo");
  if (isNonEmptyString(values.footer)) settings.footer = values.footer;
  return settings;
}
