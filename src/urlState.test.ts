import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "./model";
import { readShareLink, saveUrl, toFragment, toUrl } from "./urlState";

const motivator = (key: string) => ({ key, title: key, description: key, icon: `/${key}.svg`, colour: "#2f7d6d" });

const config: Config = {
  settings: { title: "Motivators", locale: "en" },
  motivators: ["craft", "discovery", "belonging", "impact"].map(motivator),
  strings: {},
};

describe("readShareLink", () => {
  it("reads the name, the Locale and the Order", () => {
    expect(readShareLink("#name=Ana+L%C3%B3pez&lang=en&order=impact,craft,belonging,discovery", config)).toEqual({
      person: { name: "Ana López", locale: "en", order: ["impact", "craft", "belonging", "discovery"], fulfilment: {} },
      dealt: false,
      notice: null,
    });
  });

  it("deals a new Board when the link has no order, and says nothing about it", () => {
    const random = vi.fn(() => 0);
    const { person, dealt, notice } = readShareLink("#name=Ana", config, random);
    expect(dealt).toBe(true);
    expect(random).toHaveBeenCalled();
    expect([...person.order].sort()).toEqual(["belonging", "craft", "discovery", "impact"]);
    expect(person.order).not.toEqual(["craft", "discovery", "belonging", "impact"]);
    expect(notice).toBeNull();
  });

  it("deals a new Board for an empty fragment, with no name and the Default locale", () => {
    const { person, dealt, notice } = readShareLink("", config);
    expect(dealt).toBe(true);
    expect(person.name).toBe("");
    expect(person.locale).toBe("en");
    expect(notice).toBeNull();
  });

  it("normalises an outdated link and says what was ignored or added", () => {
    const { person, dealt, notice } = readShareLink("#lang=fr&order=impact,status,craft,impact", config);
    expect(dealt).toBe(false);
    expect(person).toEqual({ name: "", locale: "en", order: ["impact", "craft", "discovery", "belonging"], fulfilment: {} });
    expect(notice).toEqual({ ignored: ["status", "impact"], added: ["discovery", "belonging"], locale: "fr", parameters: [], fulfilment: { ignored: [], both: [] } });
  });

  it("deals a full Board when the order holds no configured Motivator, never an empty one", () => {
    const { person, dealt, notice } = readShareLink("#order=status,money", config);
    expect(dealt).toBe(true);
    expect(person.order).toHaveLength(4);
    expect(notice).toEqual({ ignored: ["status", "money"], added: [], parameters: [], fulfilment: { ignored: [], both: [] } });
  });

  it("opens a hand-edited link with unknown parameters and a broken name encoding", () => {
    const { person, notice } = readShareLink("#name=%E0%A4%A&colour=red&order=craft,discovery,belonging,impact", config);
    expect(person.order).toEqual(["craft", "discovery", "belonging", "impact"]);
    expect(typeof person.name).toBe("string");
    expect(notice).toEqual({ ignored: [], added: [], parameters: ["colour"], fulfilment: { ignored: [], both: [] } });
  });

  it("reads which Motivators are Met and which are Unmet", () => {
    const { person, notice } = readShareLink("#lang=en&met=craft&unmet=impact,belonging&order=impact,craft,belonging,discovery", config);
    expect(person.fulfilment).toEqual({ craft: "met", impact: "unmet", belonging: "unmet" });
    expect(notice).toBeNull();
  });

  it("applies the Fulfilment to a dealt Board when the link has no order", () => {
    const { person, dealt, notice } = readShareLink("#met=craft", config);
    expect(dealt).toBe(true);
    expect(person.fulfilment).toEqual({ craft: "met" });
    expect(notice).toBeNull();
  });

  it("normalises the Fulfilment: drops unknown keys, duplicates and keys listed as both, and says so", () => {
    const { person, notice } = readShareLink("#met=craft,ghost,craft&unmet=craft,impact&order=craft,discovery,belonging,impact", config);
    expect(person.fulfilment).toEqual({ impact: "unmet" });
    expect(notice).toEqual({ ignored: [], added: [], parameters: [], fulfilment: { ignored: ["ghost", "craft"], both: ["craft"] } });
  });
});

describe("toFragment", () => {
  const person = { name: "Ana López", locale: "en", order: ["impact", "craft", "belonging", "discovery"], fulfilment: {} };

  it("writes the name, the Locale and the Order last", () => {
    expect(toFragment(person, true)).toBe("#name=Ana+L%C3%B3pez&lang=en&order=impact,craft,belonging,discovery");
  });

  it("leaves out an empty name, and the Order until the first Move", () => {
    expect(toFragment({ ...person, name: "" }, false)).toBe("#lang=en");
  });

  it("round-trips through readShareLink", () => {
    expect(readShareLink(toFragment(person, true), config).person).toEqual(person);
  });

  it("writes the Met and Unmet Motivators in the Order, after the Locale and before the Order", () => {
    const fulfilled = { ...person, fulfilment: { discovery: "met", impact: "met", craft: "unmet" } } as const;
    expect(toFragment(fulfilled, true)).toBe("#name=Ana+L%C3%B3pez&lang=en&met=impact,discovery&unmet=craft&order=impact,craft,belonging,discovery");
    expect(readShareLink(toFragment(fulfilled, true), config).person).toEqual(fulfilled);
  });

  it("writes the Fulfilment of a dealt Board without its Order", () => {
    expect(toFragment({ ...person, name: "", fulfilment: { craft: "met" } }, false)).toBe("#lang=en&met=craft");
  });
});

describe("toUrl and saveUrl", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("puts the fragment on the current address", () => {
    expect(toUrl({ name: "", locale: "en", order: ["craft"], fulfilment: {} }, true, "https://example.com/board/#old")).toBe(
      "https://example.com/board/#lang=en&order=craft",
    );
  });

  it("rewrites the address bar without adding a history entry", () => {
    const length = window.history.length;
    saveUrl({ name: "Ana", locale: "en", order: ["craft", "discovery"], fulfilment: {} }, true);
    expect(window.location.hash).toBe("#name=Ana&lang=en&order=craft,discovery");
    expect(window.history.length).toBe(length);
  });
});
