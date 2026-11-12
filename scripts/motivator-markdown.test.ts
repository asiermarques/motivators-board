import { describe, expect, it } from "vitest";
import { readMotivatorFile } from "./motivator-markdown";

const label = "config.example/motivators/craft.md";

const file = (front: string, body = "\nDoing the work **well**.\n") => `---\n${front}\n---\n${body}`;

describe("readMotivatorFile", () => {
  it("reads the icon, the colour and the Title from the frontmatter, and the Description from the body", () => {
    const reading = readMotivatorFile(file('icon: craft.svg\ncolour: "#2f7d6d"\ntitle: Craft'), label);
    expect(reading).toEqual({
      motivator: { icon: "craft.svg", colour: "#2f7d6d", title: "Craft", description: "Doing the work **well**." },
      problems: [],
    });
  });

  it("accepts Windows line endings", () => {
    const reading = readMotivatorFile(file('icon: craft.svg\ncolour: "#2f7d6d"\ntitle: Craft').replace(/\n/g, "\r\n"), label);
    expect(reading.problems).toEqual([]);
    expect(reading.motivator?.description).toBe("Doing the work **well**.");
  });

  it("reports a file without a frontmatter", () => {
    expect(readMotivatorFile("# Craft\n", label)).toEqual({
      problems: [`${label}:1: the file must start with a frontmatter ("---" on the first line) holding "icon", "colour" and "title"`],
    });
  });

  it("reports a frontmatter that is not closed", () => {
    expect(readMotivatorFile("---\ntitle: Craft\n", label).problems).toEqual([
      `${label}:1: the frontmatter is not closed; add a "---" line after it`,
    ]);
  });

  it("reports every missing or empty field, with its line", () => {
    const reading = readMotivatorFile(file('colour: "#2f7d6d"\ntitle: "  "', "\n"), label);
    expect(reading.motivator).toBeUndefined();
    expect(reading.problems).toEqual([
      `${label}:1: the frontmatter needs an "icon"`,
      `${label}:3: "title" must be a non-empty text`,
      `${label}:5: the Description is empty; write it below the frontmatter`,
    ]);
  });

  it("reports a colour that is not #rgb or #rrggbb", () => {
    const reading = readMotivatorFile(file("icon: craft.svg\ncolour: teal\ntitle: Craft"), label);
    expect(reading.motivator).toBeUndefined();
    expect(reading.problems).toEqual([`${label}:3: "colour" must be a hex colour such as "#2f7d6d"`]);
  });

  it("reports fields that are not allowed in the frontmatter", () => {
    const reading = readMotivatorFile(file('icon: craft.svg\ncolour: "#2f7d6d"\ntitle: Craft\nkey: craft'), label);
    expect(reading.problems).toEqual([
      `${label}:5: "key" is not allowed in the frontmatter; use only "icon", "colour" and "title" (the Motivator key is the file name)`,
    ]);
  });

  it("fails on a YAML syntax error, naming the file and the line", () => {
    // The line is the file's, not the frontmatter's: yaml's own "at line N" is left out.
    expect(() => readMotivatorFile(file('icon: craft.svg\ncolour: "#2f7d6d\ntitle: Craft'), label)).toThrow(
      new RegExp(`^${label}:\\d+: Missing closing "quote$`),
    );
  });
});
