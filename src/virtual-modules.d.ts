// Virtual module generated at build time by the plugin in vite.config.ts.
declare module "virtual:motivators-board-config" {
  /** The resolved Configuration, untyped: src/config.ts validates it. `problems` are found while reading the files. */
  export const raw: { motivators: unknown[]; settings: unknown; strings: Record<string, unknown>; problems: string[] };
  /** Image files of the config folder by name, as URLs. */
  export const images: Record<string, string>;
  /** Where each file was read from, so problems can name it. */
  export const origins: {
    settings: string;
    motivators: string;
    motivatorFiles: string[];
    folders: string[];
    strings: Record<string, string>;
    stringsFolder: string;
    keys: Record<string, string>;
  };
}

declare module "virtual:motivators-board-theme" {}
