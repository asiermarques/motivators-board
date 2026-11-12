/// <reference types="vitest/config" />
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "yaml";
import {
  CONFIG_DIR_VARIABLE,
  configModuleSource,
  describeSources,
  isConfigPath,
  MOTIVATORS_FOLDER,
  resolveConfigSources,
  STRINGS_FOLDER,
  themeModuleSource,
  type ConfigSources,
} from "./scripts/config-sources.ts";
import { readMotivatorFile } from "./scripts/motivator-markdown.ts";

// Where motivators-board is installed: its config.example/ is the Sample configuration.
const packageRoot = dirname(fileURLToPath(import.meta.url));

// Turns `import data from "./file.yml"` into the parsed YAML document.
// A syntax error in a YAML file fails the dev server and the build with a clear message.
function yaml(): Plugin {
  const yamlFile = /\.ya?ml$/;
  return {
    name: "yaml",
    transform: {
      filter: { id: yamlFile },
      handler(source) {
        return { code: `export default ${JSON.stringify(parse(source) ?? null)};`, map: null, moduleType: "js" };
      },
    },
  };
}

const CONFIG_MODULE = "virtual:motivators-board-config";
const THEME_MODULE = "virtual:motivators-board-theme";
const resolvedId = (id: string) => `\0${id}`;

// Reads the Configuration at build time from the folder in MOTIVATORS_BOARD_CONFIG_DIR (default: config/) of the
// directory the command runs in, and from config.example/ of motivators-board for every file that folder does not
// have. The app imports the result through two virtual modules, so it never sees where the files came from and never
// fetches them at runtime.
function configuration(): Plugin {
  let resolved: ResolvedConfig;
  const sources = (): ConfigSources => resolveConfigSources(process.cwd(), process.env[CONFIG_DIR_VARIABLE], packageRoot);

  return {
    name: "motivators-board-config",
    configResolved(config) {
      resolved = config;
      sources(); // fails the dev server and the build when the folder is wrong
    },
    buildStart() {
      if (resolved.mode === "test") return;
      const { info, warnings } = describeSources(sources());
      for (const line of info) resolved.logger.info(`config: ${line}`);
      for (const warning of warnings) resolved.logger.warn(`config: ${warning}`);
    },
    // Turns `import reading from "craft.md?motivator"` into { motivator, problems }: see scripts/motivator-markdown.ts.
    transform: {
      filter: { id: /\.md\?motivator$/ },
      handler(source, id) {
        const path = id.replace(/\?motivator$/, "");
        const label = sources().motivators.files.find((file) => file.path === path)?.label ?? path;
        // A YAML syntax error in the frontmatter throws, failing the dev server and the build.
        return { code: `export default ${JSON.stringify(readMotivatorFile(source, label))};`, map: null, moduleType: "js" };
      },
    },
    configureServer(server) {
      const { configPath, examplePath } = sources();
      // In an Adopter repository the config folder is outside motivators-board: let the dev server read it.
      server.config.server.fs.allow.push(configPath);
      // Vite only watches imported files: reload when a file is added to or removed from the Configuration too.
      const folders = [configPath, examplePath];
      server.watcher.add(folders.flatMap((folder) => [folder, join(folder, MOTIVATORS_FOLDER), join(folder, STRINGS_FOLDER)]));
      const reload = (file: string) => {
        if (!isConfigPath(file, folders)) return;
        for (const id of [CONFIG_MODULE, THEME_MODULE]) {
          const module = server.moduleGraph.getModuleById(resolvedId(id));
          if (module) server.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", reload).on("unlink", reload).on("addDir", reload).on("unlinkDir", reload);
    },
    resolveId(id) {
      return id === CONFIG_MODULE || id === THEME_MODULE ? resolvedId(id) : null;
    },
    load(id) {
      if (id === resolvedId(CONFIG_MODULE)) return configModuleSource(sources());
      if (id === resolvedId(THEME_MODULE)) return themeModuleSource(sources());
      return null;
    },
  };
}

export default defineConfig({
  // Relative asset URLs: the build works from any path (root domain, sub-folder, GitHub Pages...).
  base: "./",
  plugins: [react(), yaml(), configuration()],
  test: {
    environment: "happy-dom",
  },
});
