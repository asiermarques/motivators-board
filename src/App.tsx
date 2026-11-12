import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import Board from "./components/Board";
import LinkNotice from "./components/LinkNotice";
import PersonPanel from "./components/PersonPanel";
import Summary from "./components/Summary";
import { moveCard, setFulfilment, type Config, type Person, type Settings } from "./model";
import { readShareLink, saveUrl, toFragment, toUrl, type SharedState } from "./urlState";

interface Props {
  config: Config;
  /** The Share link the page was opened with, already normalised. */
  initial: SharedState;
}

interface State {
  person: Person;
  /** False while a dealt Board has had no Move or Fulfilment change: `order` is not written to the Share link yet. */
  orderShared: boolean;
}

/** The address bar is written this long after the last change, so typing a name does not hammer the history API. */
const URL_WRITE_DELAY = 250;

export default function App({ config, initial }: Props) {
  const { settings, motivators } = config;
  const [initialState] = useState<State>(() => ({ person: initial.person, orderShared: !initial.dealt }));
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState(initial.notice);
  const { person, orderShared } = state;
  /** The fragment the app wrote last, so reading it back (some environments fire hashchange for it) changes nothing. */
  const written = useRef<string | null>(null);

  // Keep the address bar in sync, so it can be bookmarked or shared; nothing is written until something changes.
  useEffect(() => {
    if (state === initialState) return;
    const write = () => {
      written.current = toFragment(state.person, state.orderShared);
      saveUrl(state.person, state.orderShared);
    };
    const timeout = window.setTimeout(write, URL_WRITE_DELAY);
    const flush = () => {
      window.clearTimeout(timeout);
      write();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", flush);
    };
  }, [state, initialState]);

  // The fragment can be edited by hand in the address bar; the app's own writes (replaceState) do not fire this.
  useEffect(() => {
    function readFragment() {
      if (window.location.hash === written.current) return;
      const shared = readShareLink(window.location.hash, config);
      setState({ person: shared.person, orderShared: !shared.dealt });
      setNotice(shared.notice);
    }
    window.addEventListener("hashchange", readFragment);
    return () => window.removeEventListener("hashchange", readFragment);
  }, [config]);

  return (
    <div className="app">
      <Header settings={settings}>
        <PersonPanel
          name={person.name}
          onNameChange={(name) => setState((current) => ({ ...current, person: { ...current.person, name } }))}
          link={toUrl(person, orderShared, window.location.href)}
        />
      </Header>
      <main className="app-main">
        {notice && <LinkNotice notice={notice} motivators={motivators} onDismiss={() => setNotice(null)} />}
        <Board
          motivators={motivators}
          order={person.order}
          fulfilment={person.fulfilment}
          onMove={(key, to) =>
            setState((current) => ({ person: { ...current.person, order: moveCard(current.person.order, key, to) }, orderShared: true }))
          }
          // The first change on a dealt Board writes the Order too, so the Share link shows the Board the Person sees.
          onFulfilment={(key, fulfilment) =>
            setState((current) => ({
              person: { ...current.person, fulfilment: setFulfilment(current.person.fulfilment, key, fulfilment) },
              orderShared: true,
            }))
          }
        />
        <Summary motivators={motivators} order={person.order} fulfilment={person.fulfilment} ordered={orderShared} />
      </main>
      <Footer settings={settings} />
    </div>
  );
}

export function Header({ settings, children }: { settings: Pick<Settings, "title" | "logo">; children?: ReactNode }) {
  return (
    <header className="app-header">
      <div className="app-brand">
        {settings.logo ? <img className="app-logo" src={settings.logo} alt="" /> : <Enso />}
        <h1 className="app-title">{settings.title}</h1>
      </div>
      {children}
    </header>
  );
}

/** The mark shown next to the title when the Configuration has no logo: an ensō brushed in ink, and a seal. */
function Enso() {
  return (
    <svg className="app-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path
        className="app-mark-stroke"
        d="M40.6 10.1L43.7 11.1L46.8 12.6L49.6 14.6L51.6 17.5L53.1 20.5L54.2 23.8L54.9 27.2L55 30.7L54.6 34.1L53.7 37.5L52.3 40.6L50.5 43.5L48.3 46.1L45.8 48.4L43 50.2L40 51.6L36.8 52.5L33.6 53L30.4 53.1L27.2 52.7L24.2 51.9L21.3 50.7L18.6 49.1L16.1 47.3L14 45.1L12.1 42.7L10.6 40L9.4 37.3L8.6 34.3L8.2 31.3L8.2 28.3L8.6 25.3L9.4 22.4L10.6 19.5L12.2 16.9L14.1 14.5L16.4 12.4L18.9 10.7L21.7 9.3L24.6 8.4L24.9 9.4L22.2 10.6L19.7 12L17.4 13.8L15.5 15.9L13.9 18.2L12.7 20.7L11.8 23.2L11.2 25.9L11.1 28.5L11.2 31.1L11.8 33.7L12.6 36.1L13.7 38.4L15.1 40.6L16.7 42.5L18.6 44.2L20.7 45.6L22.9 46.8L25.3 47.6L27.8 48.2L30.3 48.4L32.9 48.3L35.4 47.8L37.8 46.9L40.1 45.8L42.3 44.3L44.2 42.5L45.8 40.4L47.1 38.1L48 35.7L48.6 33.1L48.8 30.5L48.6 27.9L48 25.4L47 23L45.8 20.8L44.2 18.8L42.8 16.7L41.1 14.7L39.1 12.9Z"
      />
      <rect className="app-mark-seal" x="48" y="48" width="10" height="10" rx="1.5" transform="rotate(-4 53 53)" />
    </svg>
  );
}

export function Footer({ settings }: { settings: Pick<Settings, "footer"> }) {
  if (!settings.footer) return null;
  return (
    <footer className="app-footer">
      <Markdown>{settings.footer}</Markdown>
    </footer>
  );
}

/** Shown instead of the Board when the Configuration is invalid (in dev; `check` and `build` fail on it). */
export function ConfigProblems({ problems }: { problems: string[] }) {
  return (
    <div className="app">
      <Header settings={{ title: "Motivators Board" }} />
      <main className="app-main">
        <div className="config-problems" role="alert">
          <p>The Configuration has problems:</p>
          <ul>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
