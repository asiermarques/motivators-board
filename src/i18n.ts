// Builds the i18next instance from the UI strings of the Configuration: the shipped ones with the Adopter's overrides.
import { createInstance, type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import type { Config } from "./model";

export function createI18n(config: Pick<Config, "settings" | "strings">): i18n {
  const instance = createInstance();
  instance.use(initReactI18next).init({
    lng: config.settings.locale,
    resources: { [config.settings.locale]: { translation: config.strings } },
    initAsync: false,
    // React escapes what it renders.
    interpolation: { escapeValue: false },
  });
  return instance;
}
