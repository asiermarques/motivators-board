import { describe, expect, it } from "vitest";
import { deal, fulfilled, moveCard, normaliseFulfilment, normaliseOrder, setFulfilment, sidewaysDrop, stepFulfilment } from "./model";

const keys = ["craft", "discovery", "belonging", "impact", "security"];

/** A random source that returns the given values in turn, then starts again. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("deal", () => {
  it("places every Motivator exactly once", () => {
    for (let run = 0; run < 50; run++) {
      const order = deal(keys);
      expect([...order].sort()).toEqual([...keys].sort());
    }
  });

  it("never deals the Configuration order", () => {
    for (let run = 0; run < 200; run++) {
      expect(deal(["craft", "discovery"])).toEqual(["discovery", "craft"]);
    }
  });

  it("deals again when the shuffle gives back the Configuration order", () => {
    // Fisher-Yates from the end: 0.99 keeps every card in place, 0 swaps each one with the first.
    const random = sequence(0.99, 0.99, 0.99, 0.99, 0, 0, 0, 0);
    const order = deal(keys, random);
    expect(order).not.toEqual(keys);
    expect([...order].sort()).toEqual([...keys].sort());
  });

  it("deals different Orders", () => {
    const orders = new Set(Array.from({ length: 50 }, () => deal(keys).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("deals a single Motivator as it is, since there is no other Order", () => {
    expect(deal(["craft"])).toEqual(["craft"]);
  });

  it("does not change the Configuration order it is given", () => {
    const configured = [...keys];
    deal(configured);
    expect(configured).toEqual(keys);
  });
});

describe("moveCard", () => {
  const order = ["craft", "discovery", "belonging", "impact"];

  it("takes the Card out of its Position and puts it at the new one, shifting the others", () => {
    expect(moveCard(order, "craft", 2)).toEqual(["discovery", "belonging", "craft", "impact"]);
    expect(moveCard(order, "impact", 0)).toEqual(["impact", "craft", "discovery", "belonging"]);
  });

  it("keeps the Order strict: every Motivator exactly once", () => {
    for (let to = 0; to < order.length; to++) {
      expect([...moveCard(order, "belonging", to)].sort()).toEqual([...order].sort());
    }
  });

  it("clamps the new Position to the ends of the Board", () => {
    expect(moveCard(order, "discovery", -1)).toEqual(["discovery", "craft", "belonging", "impact"]);
    expect(moveCard(order, "discovery", 99)).toEqual(["craft", "belonging", "impact", "discovery"]);
  });

  it("gives back the same Order for an unknown Motivator key", () => {
    expect(moveCard(order, "status", 1)).toBe(order);
  });

  it("does not change the Order it is given", () => {
    const copy = [...order];
    moveCard(copy, "craft", 3);
    expect(copy).toEqual(order);
  });
});

describe("normaliseOrder", () => {
  const configured = ["craft", "discovery", "belonging", "impact"];

  it("keeps a valid Order as it is", () => {
    expect(normaliseOrder(["impact", "craft", "belonging", "discovery"], configured)).toEqual({
      order: ["impact", "craft", "belonging", "discovery"],
      ignored: [],
      added: [],
    });
  });

  it("drops unknown keys and duplicates, first occurrence wins, and appends the missing ones in Configuration order", () => {
    expect(normaliseOrder(["impact", "status", "craft", "impact", "status"], configured)).toEqual({
      order: ["impact", "craft", "discovery", "belonging"],
      ignored: ["status", "impact", "status"],
      added: ["discovery", "belonging"],
    });
  });

  it("ignores empty keys without naming them", () => {
    expect(normaliseOrder(["", "craft", "", "discovery", "belonging", "impact"], configured)).toEqual({
      order: ["craft", "discovery", "belonging", "impact"],
      ignored: [],
      added: [],
    });
  });
});

describe("normaliseFulfilment", () => {
  const configured = ["craft", "discovery", "belonging", "impact"];

  it("gives each listed Motivator its Fulfilment", () => {
    expect(normaliseFulfilment(["craft", "impact"], ["discovery"], configured)).toEqual({
      fulfilment: { craft: "met", impact: "met", discovery: "unmet" },
      ignored: [],
      both: [],
    });
  });

  it("drops unknown keys and duplicates, and names them in the order they appeared", () => {
    expect(normaliseFulfilment(["craft", "ghost", "craft"], ["impact", "impact", ""], configured)).toEqual({
      fulfilment: { craft: "met", impact: "unmet" },
      ignored: ["ghost", "craft", "impact"],
      both: [],
    });
  });

  it("drops a Motivator listed both as Met and as Unmet from both", () => {
    expect(normaliseFulfilment(["craft", "discovery"], ["craft", "belonging"], configured)).toEqual({
      fulfilment: { discovery: "met", belonging: "unmet" },
      ignored: [],
      both: ["craft"],
    });
  });
});

describe("fulfilled", () => {
  it("lists the Motivators with one Fulfilment in the Order, from least to most important", () => {
    const fulfilment = { impact: "met", craft: "unmet", discovery: "met" } as const;
    expect(fulfilled(["discovery", "craft", "impact", "belonging"], fulfilment, "met")).toEqual(["discovery", "impact"]);
    expect(fulfilled(["discovery", "craft", "impact", "belonging"], fulfilment, "unmet")).toEqual(["craft"]);
  });
});

describe("stepFulfilment", () => {
  it("moves one place to the right, from Unmet to the centre to Met, and stops there", () => {
    expect(stepFulfilment("unmet", "right")).toBeUndefined();
    expect(stepFulfilment(undefined, "right")).toBe("met");
    expect(stepFulfilment("met", "right")).toBe("met");
  });

  it("moves one place to the left, from Met to the centre to Unmet, and stops there", () => {
    expect(stepFulfilment("met", "left")).toBeUndefined();
    expect(stepFulfilment(undefined, "left")).toBe("unmet");
    expect(stepFulfilment("unmet", "left")).toBe("unmet");
  });
});

describe("setFulfilment", () => {
  it("gives a Motivator its Fulfilment, or takes it away, without changing the one it is given", () => {
    const fulfilment = { craft: "met" } as const;
    expect(setFulfilment(fulfilment, "impact", "unmet")).toEqual({ craft: "met", impact: "unmet" });
    expect(setFulfilment(fulfilment, "craft", undefined)).toEqual({});
    expect(fulfilment).toEqual({ craft: "met" });
  });
});

describe("sidewaysDrop", () => {
  // 28px between two places: the centre and Met, or Unmet and the centre.
  const distance = 28;

  it("settles a Card dragged clearly sideways in the nearest place", () => {
    expect(sidewaysDrop(undefined, 30, distance)).toBe("met");
    expect(sidewaysDrop(undefined, -22, distance)).toBe("unmet");
    expect(sidewaysDrop("met", -30, distance)).toBeUndefined();
    expect(sidewaysDrop("met", -60, distance)).toBe("unmet");
    expect(sidewaysDrop("unmet", 55, distance)).toBe("met");
  });

  it("stops at either end however far the Card is dragged", () => {
    expect(sidewaysDrop(undefined, 300, distance)).toBe("met");
    expect(sidewaysDrop("unmet", -300, distance)).toBe("unmet");
  });

  it("ignores a small sideways wobble, such as the one of a vertical Move", () => {
    expect(sidewaysDrop(undefined, 8, distance)).toBeUndefined();
    expect(sidewaysDrop("met", -13, distance)).toBe("met");
  });

  it("asks for a clear sideways intent even when the places are close together", () => {
    expect(sidewaysDrop(undefined, 12, 12)).toBeUndefined();
    expect(sidewaysDrop(undefined, 16, 12)).toBe("met");
  });

  it("changes nothing when there is no distance between the places", () => {
    expect(sidewaysDrop(undefined, 40, 0)).toBeUndefined();
  });
});
