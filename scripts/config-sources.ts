// Decides, at build time, which files make up the Configuration, and writes the virtual modules the app imports.
// Used by the Vite plugin in vite.config.ts; the app itself never sees these paths.
// Adapted from progression-radar 1.3.0 (scripts/config-sources.ts).
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const EXAMPLE_FOLDER = "config.example";
export const DEFAULT_CONFIG_FOLDER = "config";
export const CONFIG_DIR_VARIABLE = "MOTIVATORS_BOARD_CONFIG_DIR";
export const SETTINGS_FILE = "settings.yml";
export const THEME_FILE = "theme.css";
export const MOTIVATORS_FOLDER = "motivators";
export const STRINGS_FOLDER = "i18n";
export const IMAGE_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif"] as const;

interface Source {
  path: string;
  /** How the file is named in problems, e.g. "config/settings.yml". */
  label: string;
}

export interface ConfigSources {
  /** How the config folder is named in messages: "config", "our-board"… */
  configLabel: string;
  /** Absolute path of the config folder. */
  configPath: string;
  /** Absolute path of config.example/ in the package root. */
  examplePath: string;
  settings: Source;
  theme: Source;
  motivators: {
    /** The folder as named in problems, e.g. "config/motivators/". */
    label: string;
    path: string;
    /** One Motivator file per Motivator, in Configuration order: by file name. */
    files: (Source & { key: string })[];
  };
  /** The UI strings file of each Locale, e.g. { es: config/i18n/es.yml }. */
  strings: Record<string, Source>;
  /** Image files by name; those of the config folder win over the sample ones. */
  images: Record<string, string>;
  /** Files of the config folder the app does not use, e.g. "notes.txt" or "motivators/draft.txt". */
  unrecognised: string[];
  /** Where files are looked up, in order, with a trailing slash: ["config/", "config.example/"]. */
  folders: string[];
}

const isImage = (name: string) => IMAGE_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(`.${extension}`));
const isMotivatorFile = (name: string) => name.endsWith(".md") && name !== "README.md";
const isStringsFile = (name: string) => /\.ya?ml$/.test(name);

/** The visible entries of a folder, folders with a trailing slash; none when it does not exist. */
function listFiles(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
}

function configFolder(root: string, setting: string | undefined) {
  if (!setting) return { path: join(root, DEFAULT_CONFIG_FOLDER), label: DEFAULT_CONFIG_FOLDER };
  const path = resolve(root, setting);
  if (!existsSync(path)) throw new Error(`${CONFIG_DIR_VARIABLE} is set to "${setting}" but the folder ${path} does not exist.`);
  if (!statSync(path).isDirectory()) throw new Error(`${CONFIG_DIR_VARIABLE} is set to "${setting}" but ${path} is not a folder.`);
  // An absolute path stays out of the messages, which end up in the bundle.
  return { path, label: isAbsolute(setting) ? CONFIG_DIR_VARIABLE : setting.replace(/[\\/]+$/, "") };
}

/**
 * Resolves the Configuration. The config folder (`setting`, the value of MOTIVATORS_BOARD_CONFIG_DIR, or `config`)
 * resolves from `workingDir`, where a command runs; config.example/ resolves from `packageRoot`, where
 * motivators-board is installed. In a clone both are the same folder. Each file of the config folder replaces the
 * sample file of the same name; its motivators/ folder, when there is one, is the whole set of Motivators.
 * Throws when the folder named by the setting is wrong.
 */
export function resolveConfigSources(workingDir: string, setting: string | undefined, packageRoot = workingDir): ConfigSources {
  const config = configFolder(workingDir, setting);
  const examplePath = join(packageRoot, EXAMPLE_FOLDER);
  const present = new Set(listFiles(config.path));

  const pick = (name: string): Source => {
    const mine = present.has(name);
    return { path: join(mine ? config.path : examplePath, name), label: `${mine ? config.label : EXAMPLE_FOLDER}/${name}` };
  };

  const ownMotivators = present.has(`${MOTIVATORS_FOLDER}/`);
  const motivatorsPath = join(ownMotivators ? config.path : examplePath, MOTIVATORS_FOLDER);
  const motivatorsLabel = `${ownMotivators ? config.label : EXAMPLE_FOLDER}/${MOTIVATORS_FOLDER}/`;
  const files = listFiles(motivatorsPath)
    .filter(isMotivatorFile)
    .sort()
    .map((name) => ({ key: name.replace(/\.md$/, ""), path: join(motivatorsPath, name), label: `${motivatorsLabel}${name}` }));

  const strings: Record<string, Source> = {};
  const images: Record<string, string> = {};
  for (const [path, label] of [[examplePath, EXAMPLE_FOLDER], [config.path, config.label]]) {
    for (const name of listFiles(join(path, STRINGS_FOLDER)).filter(isStringsFile)) {
      strings[name.replace(/\.ya?ml$/, "")] = { path: join(path, STRINGS_FOLDER, name), label: `${label}/${STRINGS_FOLDER}/${name}` };
    }
    for (const name of listFiles(path).filter(isImage)) images[name] = join(path, name);
  }

  const known = (name: string) =>
    [SETTINGS_FILE, THEME_FILE, `${MOTIVATORS_FOLDER}/`, `${STRINGS_FOLDER}/`, "README.md"].includes(name) || isImage(name);
  const unusedIn = (folder: string, used: (name: string) => boolean) =>
    listFiles(join(config.path, folder))
      .filter((name) => !used(name) && name !== "README.md")
      .map((name) => `${folder}/${name}`);

  return {
    configLabel: config.label,
    configPath: config.path,
    examplePath,
    settings: pick(SETTINGS_FILE),
    theme: pick(THEME_FILE),
    motivators: { label: motivatorsLabel, path: motivatorsPath, files },
    strings,
    images,
    unrecognised: [
      ...[...present].filter((name) => !known(name)),
      ...unusedIn(MOTIVATORS_FOLDER, isMotivatorFile),
      ...unusedIn(STRINGS_FOLDER, isStringsFile),
    ],
    folders: [`${config.label}/`, `${EXAMPLE_FOLDER}/`],
  };
}

/** Whether adding or removing `file` can change the Configuration: used by the dev server to reload. */
export function isConfigPath(file: string, folders: string[]): boolean {
  const parent = dirname(file);
  return folders.some((folder) =>
    [folder, join(folder, MOTIVATORS_FOLDER), join(folder, STRINGS_FOLDER)].some((watched) => parent === watched || file === watched),
  );
}

/** The build log: where each part comes from, and a warning per file of the config folder that is not used. */
export function describeSources(sources: ConfigSources): { info: string[]; warnings: string[] } {
  const own = sources.configLabel === CONFIG_DIR_VARIABLE ? sources.configPath : sources.configLabel;
  const folderOf = (label: string) => (label.startsWith(`${EXAMPLE_FOLDER}/`) ? `${EXAMPLE_FOLDER}/` : `${own}/`);
  const count = sources.motivators.files.length;
  return {
    info: [
      `${MOTIVATORS_FOLDER}/ ← ${folderOf(sources.motivators.label)} (${count} ${count === 1 ? "file" : "files"})`,
      `${SETTINGS_FILE} ← ${folderOf(sources.settings.label)}`,
      `${THEME_FILE} ← ${folderOf(sources.theme.label)}`,
      ...Object.entries(sources.strings).map(([, source]) => `${source.label.slice(source.label.indexOf(STRINGS_FOLDER))} ← ${folderOf(source.label)}`),
    ],
    warnings: sources.unrecognised.map(
      (name) =>
        `${own}/${name} is not a configuration file and is ignored. ` +
        `The app reads ${SETTINGS_FILE}, ${MOTIVATORS_FOLDER}/*.md, ${STRINGS_FOLDER}/<locale>.yml, ${THEME_FILE} and the images they reference.`,
    ),
  };
}

/**
 * Source of the virtual module `virtual:motivators-board-config`: the raw Configuration and where it came from.
 * Each Motivator file is imported with `?motivator`, which the Vite plugin reads with scripts/motivator-markdown.ts.
 */
export function configModuleSource(sources: ConfigSources): string {
  const { files } = sources.motivators;
  const imageNames = Object.keys(sources.images);
  const locales = Object.keys(sources.strings);
  const origins = {
    settings: sources.settings.label,
    motivators: sources.motivators.label,
    folders: sources.folders,
    strings: Object.fromEntries(locales.map((locale) => [locale, sources.strings[locale].label])),
    stringsFolder: `${sources.configLabel}/${STRINGS_FOLDER}/`,
  };

  return [
    ...files.map((file, index) => `import motivator${index} from ${JSON.stringify(`${file.path}?motivator`)};`),
    `import settings from ${JSON.stringify(sources.settings.path)};`,
    ...locales.map((locale, index) => `import strings${index} from ${JSON.stringify(sources.strings[locale].path)};`),
    ...imageNames.map((name, index) => `import image${index} from ${JSON.stringify(`${sources.images[name]}?url`)};`),
    `const readings = [${files.map((file, index) => `{ key: ${JSON.stringify(file.key)}, ...motivator${index} }`).join(", ")}];`,
    `const read = readings.filter((reading) => reading.motivator);`,
    `export const raw = {`,
    `  motivators: read.map((reading) => ({ key: reading.key, ...reading.motivator })),`,
    `  settings,`,
    `  strings: { ${locales.map((locale, index) => `${JSON.stringify(locale)}: strings${index}`).join(", ")} },`,
    `  problems: readings.flatMap((reading) => reading.problems),`,
    `};`,
    `export const images = { ${imageNames.map((name, index) => `${JSON.stringify(name)}: image${index}`).join(", ")} };`,
    // Only the Motivators that could be read are in `raw`: their labels stay aligned with them.
    `const labels = ${JSON.stringify(Object.fromEntries(files.map((file) => [file.key, file.label])))};`,
    `export const origins = { ...${JSON.stringify(origins)}, keys: labels, motivatorFiles: read.map((reading) => labels[reading.key]) };`,
  ].join("\n");
}

/** Source of the virtual module `virtual:motivators-board-theme`: the resolved stylesheet. */
export function themeModuleSource(sources: ConfigSources): string {
  return `import ${JSON.stringify(sources.theme.path)};`;
}
