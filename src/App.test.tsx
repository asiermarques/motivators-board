import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { ConfigProblems } from "./App";
import { createI18n } from "./i18n";
import type { Config, Fulfilments } from "./model";
import { SHIPPED_STRINGS } from "./strings";
import { readShareLink, type SharedState } from "./urlState";

const config: Config = {
  settings: { title: "Our Motivators", locale: "en", footer: "Made by [us](https://example.com)" },
  motivators: [
    { key: "craft", title: "Craft", description: "Doing the work **well**.", icon: "/craft.svg", colour: "#2f7d6d" },
    { key: "discovery", title: "Discovery", description: "Learning.", icon: "/discovery.svg", colour: "#c0361c" },
    { key: "belonging", title: "Belonging", description: "A team.", icon: "/belonging.svg", colour: "#24497d" },
  ],
  strings: SHIPPED_STRINGS.en,
};

const linked = (order: string[], name = "", fulfilment: Fulfilments = {}): SharedState => ({
  person: { name, locale: "en", order, fulfilment },
  dealt: false,
  notice: null,
});

function renderApp(initial: SharedState, appConfig: Config = config) {
  return render(
    <I18nextProvider i18n={createI18n(appConfig)}>
      <App config={appConfig} initial={initial} />
    </I18nextProvider>,
  );
}

const board = () => screen.getByRole("list", { name: "Your Board, from least to most important" });
const titles = () => within(board()).getAllByRole("listitem").map((card) => card.querySelector(".card-title")!.textContent);
const card = (title: string) => screen.getByRole("button", { name: title });
const hash = () => decodeURIComponent(window.location.hash);
/** What a screen reader says after the name of a Card: the elements that describe its button. */
const description = (button: HTMLElement) =>
  (button.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)!.textContent)
    .join(" ");
const placeOf = (title: string) => card(title).closest("li")!.dataset.fulfilment;

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", "/");
  // happy-dom fires hashchange for replaceState, a moment later: let it pass before the next test renders.
  await new Promise((resolve) => setTimeout(resolve, 0));
});

describe("App", () => {
  it("shows the title and the footer of the Configuration", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Our Motivators");
    expect(screen.getByRole("link", { name: "us" }).getAttribute("href")).toBe("https://example.com");
  });

  it("shows one Card per Motivator on the Board, in the given Order, from least to most important", () => {
    renderApp(linked(["discovery", "belonging", "craft"]));
    expect(titles()).toEqual(["Discovery", "Belonging", "Craft"]);
    expect(screen.getByText("Least important")).toBeTruthy();
    expect(screen.getByText("Most important")).toBeTruthy();
  });

  it("shows the icon and the colour of each Motivator on its Card", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    const item = card("Craft").closest("li")!;
    expect(item.querySelector("img")!.getAttribute("src")).toBe("/craft.svg");
    expect(item.style.getPropertyValue("--motivator-colour")).toBe("#2f7d6d");
  });
});

describe("Moves with the keyboard", () => {
  it("moves a Card one Position with the up and down arrows, up is more important, and announces it", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    expect(titles()).toEqual(["Discovery", "Craft", "Belonging"]);
    expect(screen.getByRole("status", { name: "Moves" }).textContent).toBe("Craft moved to position 2 of 3.");

    fireEvent.keyDown(card("Belonging"), { key: "ArrowDown" });
    expect(titles()).toEqual(["Discovery", "Belonging", "Craft"]);
    expect(screen.getByRole("status", { name: "Moves" }).textContent).toBe("Belonging moved to position 2 of 3.");
  });

  it("sends a Card to either end with Home and End", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.keyDown(card("Craft"), { key: "End" });
    expect(titles()).toEqual(["Discovery", "Belonging", "Craft"]);
    fireEvent.keyDown(card("Belonging"), { key: "Home" });
    expect(titles()).toEqual(["Belonging", "Discovery", "Craft"]);
  });

  it("keeps the focus on the Card that moved", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    card("Craft").focus();
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(card("Craft"));
  });

  it("does nothing at the ends of the Board", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.keyDown(card("Craft"), { key: "ArrowDown" });
    fireEvent.keyDown(card("Belonging"), { key: "End" });
    expect(titles()).toEqual(["Craft", "Discovery", "Belonging"]);
    expect(screen.getByRole("status", { name: "Moves" }).textContent).toBe("");
  });

  it("tells keyboard users how to move a Card and how to change its Fulfilment", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    const instructions = document.getElementById(card("Craft").getAttribute("aria-describedby")!)!;
    expect(instructions.textContent).toMatch(/up and down arrows/i);
    expect(instructions.textContent).toMatch(/left and right arrows/i);
  });

  it("renders a single Motivator, which cannot move", () => {
    const single = { ...config, motivators: config.motivators.slice(0, 1) };
    renderApp(linked(["craft"]), single);
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    expect(titles()).toEqual(["Craft"]);
  });
});

describe("Fulfilment with the keyboard", () => {
  const announced = () => screen.getByRole("status", { name: "Moves" }).textContent;

  it("slides a Card to the right with the right arrow: it is Met, keeps its Position, and the Share link says so", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    card("Craft").focus();
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    expect(placeOf("Craft")).toBe("met");
    expect(titles()).toEqual(["Craft", "Discovery", "Belonging"]);
    expect(announced()).toBe("Craft is met.");
    expect(document.activeElement).toBe(card("Craft"));
    await waitFor(() => expect(hash()).toBe("#lang=en&met=craft&order=craft,discovery,belonging"));
  });

  it("steps through every place, one at a time, and stops at either end", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.keyDown(card("Craft"), { key: "ArrowLeft" });
    expect(placeOf("Craft")).toBe("unmet");
    expect(announced()).toBe("Craft is not met.");
    fireEvent.keyDown(card("Craft"), { key: "ArrowLeft" });
    expect(placeOf("Craft")).toBe("unmet");
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    expect(placeOf("Craft")).toBeUndefined();
    expect(announced()).toBe("Craft is back in the centre: neither met nor unmet.");
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    expect(placeOf("Craft")).toBe("met");
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    expect(placeOf("Craft")).toBe("met");
  });

  it("does not announce a step past either end", () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    expect(announced()).toBe("");
  });

  it("keeps the Fulfilment when the vertical keys move the Card", () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    for (const key of ["ArrowUp", "ArrowDown", "End", "Home"]) fireEvent.keyDown(card("Craft"), { key });
    expect(placeOf("Craft")).toBe("met");
  });

  it("writes the Order too on the first change of a new Board, so the link shows the same Board", async () => {
    renderApp({ ...linked(["belonging", "craft", "discovery"]), dealt: true });
    fireEvent.keyDown(card("Craft"), { key: "ArrowRight" });
    await waitFor(() => expect(hash()).toBe("#lang=en&met=craft&order=belonging,craft,discovery"));
    expect(readShareLink(window.location.hash, config).person).toMatchObject({
      order: ["belonging", "craft", "discovery"],
      fulfilment: { craft: "met" },
    });
  });

  it("removes met from the Share link when the only Met Card goes back to the centre", async () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    fireEvent.keyDown(card("Craft"), { key: "ArrowLeft" });
    await waitFor(() => expect(hash()).toBe("#lang=en&order=craft,discovery,belonging"));
  });
});

describe("Fulfilment by dragging", () => {
  // happy-dom lays nothing out: give each Card a place in the column, most important on top, 60px apart, and leave
  // 28px between two sideways places (a column 356px wide, Cards 300px wide).
  const ROW = 60;
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const item = this.closest("li[data-key]");
      if (!item) return new DOMRect(0, 0, 356, 3 * ROW);
      const cards = [...item.parentElement!.children];
      const top = (cards.length - 1 - cards.indexOf(item)) * ROW;
      return new DOMRect(28, top, 300, ROW - 10);
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(356);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
  });
  afterEach(() => vi.restoreAllMocks());

  /** Picks up the Card with the mouse and carries it (x, y) pixels, in small steps as a hand would; returns the drop. */
  async function carry(title: string, x: number, y: number) {
    const button = card(title);
    const rect = button.getBoundingClientRect();
    const start = { clientX: rect.left + 150, clientY: rect.top + 25 };
    fireEvent.mouseDown(button, { ...start, button: 0 });
    for (const step of [0.25, 0.5, 0.75, 1]) {
      await act(async () => {
        fireEvent.mouseMove(document, { clientX: start.clientX + x * step, clientY: start.clientY + y * step });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    return async () =>
      act(async () => {
        fireEvent.mouseUp(document, { clientX: start.clientX + x, clientY: start.clientY + y });
        // dnd-kit swallows clicks for 50ms after a drag, so the drop does not flip the Card: let that pass.
        await new Promise((resolve) => setTimeout(resolve, 60));
      });
  }

  /** A mouse drag of the Card by (x, y) pixels. */
  async function drag(title: string, x: number, y: number) {
    const drop = await carry(title, x, y);
    await drop();
  }

  const markOf = (title: string) => card(title).closest("li")!.querySelector<HTMLElement>(".fulfilment-mark");
  const places = () => document.querySelector<HTMLElement>(".board-places")!;
  const announced = () => screen.getByRole("status", { name: "Moves" }).textContent;

  it("settles a Card dragged clearly to the right as Met, keeps its Position, announces it and writes the link", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    await drag("Discovery", 40, 0);
    expect(placeOf("Discovery")).toBe("met");
    expect(titles()).toEqual(["Craft", "Discovery", "Belonging"]);
    expect(announced()).toBe("Discovery is met.");
    await waitFor(() => expect(hash()).toBe("#lang=en&met=discovery&order=craft,discovery,belonging"));
  });

  it("changes the Position and the Fulfilment in one diagonal drag", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    await drag("Craft", -40, -2 * ROW);
    expect(titles()).toEqual(["Discovery", "Belonging", "Craft"]);
    expect(placeOf("Craft")).toBe("unmet");
    expect(announced()).toBe("Craft moved to position 3 of 3. Craft is not met.");
    await waitFor(() => expect(hash()).toBe("#lang=en&unmet=craft&order=discovery,belonging,craft"));
  });

  it("only moves a Card dragged down one Position with a small sideways wobble", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    await drag("Belonging", 8, ROW);
    expect(titles()).toEqual(["Craft", "Belonging", "Discovery"]);
    expect(placeOf("Belonging")).toBeUndefined();
    expect(announced()).toBe("Belonging moved to position 2 of 3.");
  });

  it("puts a Met Card dragged back to the centre in the centre, and takes it out of met", async () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    await drag("Craft", -30, 0);
    expect(placeOf("Craft")).toBeUndefined();
    expect(announced()).toBe("Craft is back in the centre: neither met nor unmet.");
    await waitFor(() => expect(hash()).toBe("#lang=en&order=craft,discovery,belonging"));
  });

  it("shows where a dragged Card will settle before it is dropped, on the Card and on the sideways scale", async () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { discovery: "unmet" }));
    const drop = await carry("Discovery", 60, 0);
    expect(placeOf("Discovery")).toBe("unmet");
    expect(markOf("Discovery")!.dataset.fulfilment).toBe("met");
    expect(places().dataset.target).toBe("met");
    await drop();
    expect(placeOf("Discovery")).toBe("met");
    expect(places().dataset.target).toBeUndefined();
  });

  it("shows no mark while a Card dragged to the centre is carried there", async () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    const drop = await carry("Craft", -30, 0);
    expect(markOf("Craft")).toBeNull();
    expect(places().dataset.target).toBe("centre");
    await drop();
  });

  it("still flips a Card on a click, without changing its Fulfilment", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.click(card("Craft"));
    expect(card("Craft").getAttribute("aria-expanded")).toBe("true");
    expect(placeOf("Craft")).toBeUndefined();
  });
});

describe("Flipping a Card", () => {
  it("shows the Description, rendered from Markdown, when the Card is flipped, and hides it again", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    expect(card("Craft").getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(card("Craft"));
    expect(card("Craft").getAttribute("aria-expanded")).toBe("true");
    const description = document.getElementById(card("Craft").getAttribute("aria-controls")!)!;
    expect(description.hidden).toBe(false);
    expect(description.querySelector("strong")!.textContent).toBe("well");
    fireEvent.click(card("Craft"));
    expect(card("Craft").getAttribute("aria-expanded")).toBe("false");
  });

  it("never renders raw HTML from a Description", () => {
    const unsafe = { ...config, motivators: [{ ...config.motivators[0], description: 'Hi <img src=x onerror="alert(1)">' }] };
    renderApp(linked(["craft"]), unsafe);
    fireEvent.click(card("Craft"));
    expect(document.querySelector("img[src=x]")).toBeNull();
  });
});

describe("The Share link", () => {
  it("writes the Order to the address bar after a Move, without a history entry", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    const length = window.history.length;
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    await waitFor(() => expect(hash()).toBe("#lang=en&order=discovery,craft,belonging"));
    expect(window.history.length).toBe(length);
  });

  it("does not write anything when a link is just opened", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(window.location.hash).toBe("");
  });

  it("writes the name, but not a dealt Order, until the first Move", async () => {
    renderApp({ ...linked(["belonging", "craft", "discovery"]), dealt: true });
    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), { target: { value: "Ana López" } });
    await waitFor(() => expect(hash()).toBe("#name=Ana+López&lang=en"));
    fireEvent.keyDown(card("Craft"), { key: "Home" });
    await waitFor(() => expect(hash()).toBe("#name=Ana+López&lang=en&order=craft,belonging,discovery"));
  });

  it("copies the Share link with a button", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderApp(linked(["craft", "discovery", "belonging"], "Ana"));
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Link copied" })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/#name=Ana&lang=en&order=craft,discovery,belonging`);
  });

  it("follows the address bar when the fragment is edited by hand, and says what it changed", async () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    act(() => {
      window.history.replaceState(null, "", "/#name=Bo&order=belonging,status,craft");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(titles()).toEqual(["Belonging", "Craft", "Discovery"]);
    expect((screen.getByRole("textbox", { name: "Your name" }) as HTMLInputElement).value).toBe("Bo");
    expect(screen.getByRole("region", { name: "About this link" }).textContent).toContain("status");
  });
});

describe("The Link notice", () => {
  const notice = { ignored: ["status", "craft"], added: ["belonging"], locale: "fr", parameters: ["colour"], fulfilment: { ignored: [], both: [] } };

  it("says what Normalisation ignored or added, by Title for the Motivators it added", () => {
    renderApp({ ...linked(["craft", "discovery", "belonging"]), notice });
    const region = screen.getByRole("region", { name: "About this link" });
    expect(region.textContent).toContain("Ignored from the link: status, craft.");
    expect(region.textContent).toContain("Added at the end: Belonging.");
    expect(region.textContent).toContain('The language "fr" is not available, so the default one is used.');
    expect(region.textContent).toContain("Unknown parts of the link were ignored: colour.");
  });

  it("can be dismissed", () => {
    renderApp({ ...linked(["craft", "discovery", "belonging"]), notice });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("region", { name: "About this link" })).toBeNull();
  });

  it("is shown for the notice of a real link", () => {
    renderApp(readShareLink("#order=craft,craft,discovery", config));
    expect(screen.getByRole("region", { name: "About this link" }).textContent).toContain("Added at the end: Belonging.");
  });
});

describe("Fulfilment", () => {
  it("places Met Cards to the right and Unmet ones to the left, and says so beyond the place", () => {
    renderApp(readShareLink("#met=craft&unmet=belonging&order=craft,discovery,belonging", config));
    expect(placeOf("Craft")).toBe("met");
    expect(placeOf("Belonging")).toBe("unmet");
    expect(placeOf("Discovery")).toBeUndefined();
    expect(description(card("Craft"))).toMatch(/^Met /);
    expect(description(card("Belonging"))).toMatch(/^Unmet /);
    expect(description(card("Discovery"))).not.toMatch(/^(Met|Unmet) /);
    expect(card("Craft").closest("li")!.querySelector(".fulfilment-mark[data-fulfilment=met]")).toBeTruthy();
  });

  it("keeps the mark on a flipped Card", () => {
    renderApp(linked(["craft", "discovery", "belonging"], "", { craft: "met" }));
    fireEvent.click(card("Craft"));
    expect(card("Craft").closest("li")!.querySelector(".fulfilment-mark[data-fulfilment=met]")).toBeTruthy();
    expect(description(card("Craft"))).toMatch(/^Met /);
  });

  it("keeps the Fulfilment in the Share link after a Move", async () => {
    renderApp(readShareLink("#met=craft&order=craft,discovery,belonging", config));
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    await waitFor(() => expect(hash()).toBe("#lang=en&met=craft&order=discovery,craft,belonging"));
    expect(placeOf("Craft")).toBe("met");
  });

  it("follows a hand edit of the Fulfilment in the address bar", () => {
    renderApp(readShareLink("#order=craft,discovery,belonging", config));
    act(() => {
      window.history.replaceState(null, "", "/#unmet=discovery&order=craft,discovery,belonging");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(placeOf("Discovery")).toBe("unmet");
  });

  it("says in the Link notice which Fulfilment entries were ignored", () => {
    renderApp(readShareLink("#met=craft,ghost,craft&unmet=craft,belonging&order=craft,discovery,belonging", config));
    const region = screen.getByRole("region", { name: "About this link" });
    expect(region.textContent).toContain("Ignored from met and unmet: ghost, craft.");
    expect(region.textContent).toContain("Listed as both met and unmet, so neither: Craft.");
    expect(placeOf("Craft")).toBeUndefined();
    expect(placeOf("Belonging")).toBe("unmet");
  });
});

describe("ConfigProblems", () => {
  it("lists every problem of an invalid Configuration instead of the Board", () => {
    render(<ConfigProblems problems={["config/motivators/order.md: reserved", "config/settings.yml needs a locale"]} />);
    const alert = screen.getByRole("alert");
    expect(within(alert).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "config/motivators/order.md: reserved",
      "config/settings.yml needs a locale",
    ]);
    expect(screen.queryByRole("list", { name: /Board/ })).toBeNull();
  });
});

describe("Summary", () => {
  const summary = () => screen.getByRole("complementary", { name: "Summary" });
  const listed = (heading: string) =>
    within(within(summary()).getByRole("heading", { name: heading }).parentElement!)
      .getAllByRole("listitem")
      .map((item) => item.querySelector(".summary-title")!.textContent);

  it("shows the most motivating Motivators, most first, and the least motivating ones, least first", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    expect(listed("Most motivating")).toEqual(["Belonging", "Discovery"]);
    expect(listed("Least motivating")).toEqual(["Craft"]);
    expect(within(summary()).getByText("A team.")).toBeTruthy();
  });

  it("numbers each listed Motivator with its rank, 1 being the most important, decoratively only", () => {
    const five: Config = {
      ...config,
      motivators: [
        ...config.motivators,
        { key: "impact", title: "Impact", description: "Changing things.", icon: "/impact.svg", colour: "#7d5a24" },
        { key: "freedom", title: "Freedom", description: "My own way.", icon: "/freedom.svg", colour: "#5a247d" },
      ],
    };
    renderApp(linked(["craft", "discovery", "belonging", "impact", "freedom"]), five);
    const seals = (end: string) =>
      [...summary().querySelectorAll<HTMLElement>(`.summary-list[data-end="${end}"] .summary-rank`)].map((seal) => {
        expect(seal.getAttribute("aria-hidden")).toBe("true");
        return seal.textContent;
      });
    expect(seals("most")).toEqual(["1", "2", "3"]);
    expect(seals("least")).toEqual(["5", "4"]);
  });

  it("follows the Moves", () => {
    renderApp(linked(["craft", "discovery", "belonging"]));
    fireEvent.keyDown(card("Craft"), { key: "End" });
    expect(listed("Most motivating")).toEqual(["Craft", "Belonging"]);
    expect(listed("Least motivating")).toEqual(["Discovery"]);
  });

  it("waits for the first Move on a Board just dealt", () => {
    renderApp({ ...linked(["craft", "discovery", "belonging"]), dealt: true });
    expect(within(summary()).queryByRole("heading")).toBeNull();
    fireEvent.keyDown(card("Craft"), { key: "ArrowUp" });
    expect(listed("Most motivating")).toEqual(["Belonging", "Craft"]);
  });

  describe("with Fulfilment", () => {
    const five: Config = {
      ...config,
      motivators: [
        ...config.motivators,
        { key: "impact", title: "Impact", description: "Changing things.", icon: "/impact.svg", colour: "#7d5a24" },
        { key: "freedom", title: "Freedom", description: "My own way.", icon: "/freedom.svg", colour: "#5a247d" },
      ],
    };
    const item = (title: string) => within(summary()).getByRole("heading", { name: title }).closest("li")!;
    const mark = (title: string) => item(title).querySelector<HTMLElement>(".fulfilment-mark");

    it("marks each Podium Motivator Met or Unmet with a symbol and accessible text, and the others not at all", () => {
      renderApp(linked(["craft", "discovery", "belonging", "impact", "freedom"], "", { freedom: "met", impact: "unmet" }), five);
      expect(mark("Freedom")!.dataset.fulfilment).toBe("met");
      expect(mark("Freedom")!.textContent).toBe("Met");
      expect(mark("Impact")!.dataset.fulfilment).toBe("unmet");
      expect(mark("Impact")!.textContent).toBe("Unmet");
      expect(mark("Belonging")).toBeNull();
    });

    it("marks an Unmet Motivator among the least motivating", () => {
      renderApp(linked(["craft", "discovery", "belonging", "impact", "freedom"], "", { craft: "unmet" }), five);
      expect(listed("Least motivating")).toEqual(["Craft", "Discovery"]);
      expect(mark("Craft")!.textContent).toBe("Unmet");
      expect(mark("Discovery")).toBeNull();
    });

    it("follows the Fulfilment changes on the Board", () => {
      renderApp(linked(["craft", "discovery", "belonging"]));
      expect(mark("Belonging")).toBeNull();
      fireEvent.keyDown(card("Belonging"), { key: "ArrowRight" });
      expect(mark("Belonging")!.textContent).toBe("Met");
    });

    it("stops waiting on a Board just dealt after the first Fulfilment change", () => {
      renderApp({ ...linked(["craft", "discovery", "belonging"]), dealt: true });
      fireEvent.keyDown(card("Belonging"), { key: "ArrowLeft" });
      expect(mark("Belonging")!.textContent).toBe("Unmet");
    });
  });
});
