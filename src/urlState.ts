// Reads and writes the Share link: the whole Person in the URL fragment, which browsers never send to a server.
//   #name=Ana+L%C3%B3pez&lang=en&met=craft&unmet=impact&order=impact,craft,belonging,discovery
// See docs/adr/0001 and docs/adr/0003. Adapted from progression-radar 1.3.0 (src/urlState.ts).
import { deal, fulfilled, normaliseFulfilment, normaliseOrder, RESERVED_PARAMETERS, type Config, type Person } from "./model";

/** What Normalisation ignored or added when a Share link was opened. */
export interface LinkNotice {
  /** Motivator keys of `order` that are unknown or repeated. */
  ignored: string[];
  /** Configured Motivators missing from `order`, appended at the end. */
  added: string[];
  /** A `lang` that is not declared, replaced by the Default locale. */
  locale?: string;
  /** Parameters the Share link does not have. */
  parameters: string[];
  fulfilment: {
    /** Motivator keys of `met` or `unmet` that are unknown or repeated. */
    ignored: string[];
    /** Motivators listed both in `met` and in `unmet`, which get neither. */
    both: string[];
  };
}

export interface SharedState {
  person: Person;
  /** The link had no usable `order`, so the Board was dealt: `order` is written on the first Move. */
  dealt: boolean;
  /** Null when the link was read as it is. */
  notice: LinkNotice | null;
}

/** Reads a Share link fragment. It never fails: anything it cannot use is dropped and named in the notice. */
export function readShareLink(hash: string, config: Config, random: () => number = Math.random): SharedState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const configured = config.motivators.map((motivator) => motivator.key);
  const defaultLocale = config.settings.locale;

  const lang = params.get("lang");
  const locale = lang === null || lang === "" || lang === defaultLocale ? undefined : lang;

  const rawOrder = params.get("order");
  const normalised = normaliseOrder(rawOrder ? rawOrder.split(",") : [], configured);
  // An `order` with no configured Motivator in it would be all "added": deal instead, so the Board is never anchored.
  const dealt = normalised.added.length === configured.length;

  const list = (name: string) => params.get(name)?.split(",") ?? [];
  const fulfilment = normaliseFulfilment(list("met"), list("unmet"), configured);

  const notice: LinkNotice = {
    ignored: normalised.ignored,
    added: dealt ? [] : normalised.added,
    ...(locale !== undefined && { locale }),
    parameters: [...new Set(params.keys())].filter((name) => !(RESERVED_PARAMETERS as readonly string[]).includes(name)),
    fulfilment: { ignored: fulfilment.ignored, both: fulfilment.both },
  };
  const hasNotice =
    notice.ignored.length + notice.added.length + notice.parameters.length + fulfilment.ignored.length + fulfilment.both.length > 0 ||
    locale !== undefined;

  return {
    person: {
      name: params.get("name") ?? "",
      locale: defaultLocale,
      order: dealt ? deal(configured, random) : normalised.order,
      fulfilment: fulfilment.fulfilment,
    },
    dealt,
    notice: hasNotice ? notice : null,
  };
}

/**
 * The Share link fragment. `met` and `unmet` are left out when empty. `order` is written last, and only once the Person
 * has changed something on a dealt Board.
 */
export function toFragment(person: Person, withOrder: boolean): string {
  const params = new URLSearchParams();
  if (person.name) params.append("name", person.name);
  params.append("lang", person.locale);
  // Motivator keys are [a-z0-9-]+: the commas stay readable instead of being escaped as %2C.
  const lists: [string, string[]][] = [
    ["met", fulfilled(person.order, person.fulfilment, "met")],
    ["unmet", fulfilled(person.order, person.fulfilment, "unmet")],
    ["order", withOrder ? person.order : []],
  ];
  const written = lists.filter(([, keys]) => keys.length > 0).map(([name, keys]) => `&${name}=${keys.join(",")}`);
  return `#${params.toString()}${written.join("")}`;
}

/** `href` with the Person in its fragment. */
export function toUrl(person: Person, withOrder: boolean, href: string): string {
  const url = new URL(href);
  url.hash = toFragment(person, withOrder);
  return url.toString();
}

/** Rewrites the address bar without a history entry. Browsers throw when this is called too often: survive that. */
export function saveUrl(person: Person, withOrder: boolean): void {
  try {
    window.history.replaceState(null, "", toUrl(person, withOrder, window.location.href));
  } catch (error) {
    console.warn("The Share link could not be written to the address bar", error);
  }
}
