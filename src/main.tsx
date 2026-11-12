import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App, { ConfigProblems } from "./App";
import { ConfigError, loadConfig } from "./config";
import { createI18n } from "./i18n";
import { readShareLink } from "./urlState";
import "./styles.css";
import "virtual:motivators-board-theme";

const root = createRoot(document.getElementById("root")!);
const render = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>);

try {
  const config = loadConfig();
  document.title = config.settings.title;
  document.documentElement.lang = config.settings.locale;
  render(
    <I18nextProvider i18n={createI18n(config)}>
      <App config={config} initial={readShareLink(window.location.hash, config)} />
    </I18nextProvider>,
  );
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.error(error);
  render(<ConfigProblems problems={error.problems} />);
}
