// Domain types and pure functions of the Board. Never imports a UI or effects library.
import type { UiStrings } from "./strings";

/** Something that can motivate a Person, as configured in one Motivator file. */
export interface Motivator {
  /** The Motivator key, `[a-z0-9-]+`: the name of its Motivator file. */
  key: string;
  title: string;
  /** Markdown, rendered without raw HTML. */
  description: string;
  /** URL of the icon image. */
  icon: string;
  /** A CSS colour, `#rrggbb` or `#rgb`. */
  colour: string;
}

export interface Settings {
  title: string;
  /** URL of the logo image. */
  logo?: string;
  /** Markdown. */
  footer?: string;
  /** The single declared Locale, which is the Default locale. */
  locale: string;
}

export interface Config {
  settings: Settings;
  /** In Configuration order. */
  motivators: Motivator[];
  /** The UI strings in the declared Locale: the shipped ones with the Adopter's overrides. */
  strings: UiStrings;
}

/** The parameters of the Share link, in the order they are written, which can never be Motivator keys. */
export const RESERVED_PARAMETERS = ["name", "lang", "met", "unmet", "order"] as const;

/** What a Motivator key may be made of, so the comma in `order` never needs escaping. */
export const MOTIVATOR_KEY = /^[a-z0-9-]+$/;

/** Motivator keys from least to most important: every configured Motivator exactly once. */
export type Order = string[];

/** Whether a Motivator is currently met in the Person's life: its Card sits to the right (Met) or to the left (Unmet). */
export type Fulfilment = "met" | "unmet";

/** The Fulfilment of each Motivator that has one. A Motivator missing here has no Fulfilment: its Card is in the centre. */
export type Fulfilments = Partial<Record<string, Fulfilment>>;

/** The Person whose Board is shown: the whole state of the app, and of the Share link. */
export interface Person {
  /** May be empty. */
  name: string;
  /** One of the declared Locales. */
  locale: string;
  order: Order;
  /** Independent of the Order: it never changes a Position. */
  fulfilment: Fulfilments;
}

/**
 * A Deal: every Motivator in a random Order, so the Configuration order does not anchor the Person. With two or more
 * Motivators it is never the Configuration order itself; every other Order is equally likely.
 */
export function deal(keys: string[], random: () => number = Math.random): Order {
  if (keys.length < 2) return [...keys];
  for (;;) {
    const order = shuffle(keys, random);
    if (order.some((key, position) => key !== keys[position])) return order;
  }
}

/** Fisher-Yates. */
function shuffle(keys: string[], random: () => number): Order {
  const order = [...keys];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A Move: the Card of `key` taken out of the Order and put at Position `to` (0-based, clamped to the Board). */
export function moveCard(order: Order, key: string, to: number): Order {
  const from = order.indexOf(key);
  if (from === -1) return order;
  const rest = order.filter((other) => other !== key);
  const position = Math.min(Math.max(to, 0), rest.length);
  return [...rest.slice(0, position), key, ...rest.slice(position)];
}

export interface Normalised {
  order: Order;
  /** Unknown keys and duplicates that were dropped, in the order they appeared. */
  ignored: string[];
  /** Configured Motivators missing from the input, appended at the end in Configuration order. */
  added: string[];
}

/**
 * Normalisation of an Order read from a Share link: unknown keys and duplicates are dropped (first occurrence wins)
 * and the configured Motivators it lacks are appended in Configuration order, so the Order is always strict.
 */
export function normaliseOrder(keys: string[], configured: string[]): Normalised {
  const known = new Set(configured);
  const order: Order = [];
  const ignored: string[] = [];
  for (const key of keys) {
    if (key === "") continue;
    if (known.has(key) && !order.includes(key)) order.push(key);
    else ignored.push(key);
  }
  const added = configured.filter((key) => !order.includes(key));
  return { order: [...order, ...added], ignored, added };
}

export interface NormalisedFulfilment {
  fulfilment: Fulfilments;
  /** Unknown keys and duplicates that were dropped, in the order they appeared, Met first. */
  ignored: string[];
  /** Motivators listed both as Met and as Unmet, dropped from both. */
  both: string[];
}

/**
 * Normalisation of the Met and Unmet lists of a Share link: unknown keys and duplicates are dropped (first occurrence
 * wins), and a Motivator listed as both is ambiguous, so it gets neither.
 */
export function normaliseFulfilment(met: string[], unmet: string[], configured: string[]): NormalisedFulfilment {
  const known = new Set(configured);
  const ignored: string[] = [];
  const read = (keys: string[]) => {
    const kept: string[] = [];
    for (const key of keys) {
      if (key === "") continue;
      if (known.has(key) && !kept.includes(key)) kept.push(key);
      else ignored.push(key);
    }
    return kept;
  };
  const metKeys = read(met);
  const unmetKeys = read(unmet);
  const both = metKeys.filter((key) => unmetKeys.includes(key));
  const fulfilment: Fulfilments = {};
  for (const key of metKeys) if (!both.includes(key)) fulfilment[key] = "met";
  for (const key of unmetKeys) if (!both.includes(key)) fulfilment[key] = "unmet";
  return { fulfilment, ignored, both };
}

/** The Motivators with that Fulfilment, in the Order (least to most important), so a Board always gives the same link. */
export function fulfilled(order: Order, fulfilment: Fulfilments, which: Fulfilment): string[] {
  return order.filter((key) => fulfilment[key] === which);
}

/** The three sideways places of a Card, from left to right. */
const PLACES: (Fulfilment | undefined)[] = ["unmet", undefined, "met"];

/** One place to the left or to the right (Unmet, centre, Met), staying put at either end. */
export function stepFulfilment(current: Fulfilment | undefined, direction: "left" | "right"): Fulfilment | undefined {
  const place = PLACES.indexOf(current) + (direction === "right" ? 1 : -1);
  return PLACES[Math.min(Math.max(place, 0), PLACES.length - 1)];
}

/** The Fulfilments with the one of `key` changed; `undefined` puts its Card back in the centre. */
export function setFulfilment(fulfilment: Fulfilments, key: string, value: Fulfilment | undefined): Fulfilments {
  const { [key]: _previous, ...others } = fulfilment;
  return value ? { ...others, [key]: value } : others;
}

/** The least sideways drag, in pixels, that says the Person meant to change a Fulfilment, however close the places. */
const SIDEWAYS_INTENT = 16;

/**
 * Where a Card dropped `deltaX` pixels sideways from its place settles: the nearest place, `distance` pixels apart, but
 * only for a clear sideways intent (half the way to the next place, and never less than SIDEWAYS_INTENT), so the wobble
 * of a vertical Move does not change it.
 */
export function sidewaysDrop(current: Fulfilment | undefined, deltaX: number, distance: number): Fulfilment | undefined {
  if (distance <= 0 || Math.abs(deltaX) < Math.max(distance / 2, SIDEWAYS_INTENT)) return current;
  const steps = Math.max(1, Math.round(Math.abs(deltaX) / distance));
  const place = PLACES.indexOf(current) + Math.sign(deltaX) * steps;
  return PLACES[Math.min(Math.max(place, 0), PLACES.length - 1)];
}
