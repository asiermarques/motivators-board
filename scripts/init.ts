// `motivators-board init`: prepares an Adopter repository. It copies the whole Sample configuration to config/, makes
// the package.json depend on motivators-board with the npm scripts that call it, and keeps node_modules/ and dist/
// out of git. It never overwrites a file that exists.
// Adapted from progression-radar 1.3.0 (scripts/init.ts).
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { DEFAULT_CONFIG_FOLDER, EXAMPLE_FOLDER } from "./config-sources.ts";

export class InitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitError";
  }
}

const PACKAGE = "motivators-board";

/** The npm scripts of an Adopter repository, each calling the binary. */
export const SCRIPTS: Record<string, string> = {
  dev: `${PACKAGE} dev`,
  build: `${PACKAGE} build`,
  preview: `${PACKAGE} preview`,
  check: `${PACKAGE} check`,
};

const IGNORED = ["node_modules/", "dist/"];

export interface InitOptions {
  /** The Adopter repository. */
  cwd: string;
  /** The installed motivators-board, where config.example/ is. */
  packageRoot: string;
  log?: (line: string) => void;
}

function copyMissing(from: string, to: string, root: string, copied: string[], kept: string[]) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) copyMissing(source, target, root, copied, kept);
    else if (existsSync(target)) kept.push(relative(root, target));
    else {
      copyFileSync(source, target);
      copied.push(relative(root, target));
    }
  }
}

function writeManifest(cwd: string, packageRoot: string, log: (line: string) => void) {
  const path = join(cwd, "package.json");
  const { version } = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const exists = existsSync(path);
  const manifest = exists ? JSON.parse(readFileSync(path, "utf8")) : { name: basename(cwd).toLowerCase().replace(/[^a-z0-9-]+/g, "-"), private: true };

  const scripts: Record<string, string> = manifest.scripts ?? {};
  const added = Object.keys(SCRIPTS).filter((name) => !(name in scripts));
  manifest.scripts = { ...scripts, ...Object.fromEntries(added.map((name) => [name, SCRIPTS[name]])) };
  const dependencies: Record<string, string> = manifest.dependencies ?? {};
  const depends = PACKAGE in dependencies || PACKAGE in (manifest.devDependencies ?? {});
  if (!depends) manifest.dependencies = { ...dependencies, [PACKAGE]: `^${version}` };

  if (exists && added.length === 0 && depends) return;
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  if (!exists) log(`Created package.json depending on ${PACKAGE} ^${version}; run npm install`);
  else {
    if (added.length > 0) log(`Added to package.json scripts: ${added.join(", ")}`);
    if (!depends) log(`Added ${PACKAGE} ^${version} to package.json dependencies; run npm install`);
  }
}

/** Creates the .gitignore, or appends the lines it lacks. Other lines are not touched. */
function writeGitignore(cwd: string, log: (line: string) => void) {
  const path = join(cwd, ".gitignore");
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = text.split(/\r?\n/).map((line) => line.trim().replace(/^\//, "").replace(/\/$/, ""));
  const missing = IGNORED.filter((entry) => !lines.includes(entry.replace(/\/$/, "")));
  if (missing.length === 0) return;
  appendFileSync(path, `${text === "" || text.endsWith("\n") ? "" : "\n"}${missing.join("\n")}\n`);
  log(`Added ${missing.join(" and ")} to .gitignore`);
}

export function initAdopterRepository({ cwd, packageRoot, log = console.log }: InitOptions): void {
  const configPath = join(cwd, DEFAULT_CONFIG_FOLDER);
  if (existsSync(configPath) && !statSync(configPath).isDirectory()) {
    throw new InitError(`${DEFAULT_CONFIG_FOLDER} exists and is not a folder.`);
  }

  const copied: string[] = [];
  const kept: string[] = [];
  copyMissing(join(packageRoot, EXAMPLE_FOLDER), configPath, cwd, copied, kept);
  // The README of the config folder is upstream's config/README.md, not part of the Sample configuration.
  const readme = join(packageRoot, DEFAULT_CONFIG_FOLDER, "README.md");
  if (existsSync(readme)) {
    if (existsSync(join(configPath, "README.md"))) kept.push(join(DEFAULT_CONFIG_FOLDER, "README.md"));
    else {
      copyFileSync(readme, join(configPath, "README.md"));
      copied.push(join(DEFAULT_CONFIG_FOLDER, "README.md"));
    }
  }
  for (const file of kept) log(`${file} already exists, kept`);
  if (copied.length > 0) log(`Copied ${copied.length} files of the Sample configuration to ${DEFAULT_CONFIG_FOLDER}/. Edit them to make the Board yours.`);

  writeManifest(cwd, packageRoot, log);
  writeGitignore(cwd, log);
}
