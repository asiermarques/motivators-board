// Reads one Motivator file (Markdown with a YAML frontmatter) into the raw shape of a Motivator. The Motivator key is
// the file name, so it is not read here. Build time only: it never reaches the bundle.
// Adapted from progression-radar 1.3.0 (scripts/category-markdown.ts).
import { LineCounter, isMap, isScalar, parseDocument } from "yaml";

export interface RawMotivator {
  /** File name of the icon image in the config folder. */
  icon: string;
  colour: string;
  title: string;
  /** Markdown. */
  description: string;
}

export interface MotivatorReading {
  /** Missing when the file has any problem. */
  motivator?: RawMotivator;
  /** Each mistake as `<file>:<line>: <message>`. */
  problems: string[];
}

const FIELDS = ["icon", "colour", "title"] as const;
const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Splits "---\n…\n---\n" off the start of the file. `bodyLine` is the line (1-based) where the body begins. */
function splitFrontmatter(source: string): { yaml: string; body: string; bodyLine: number } | "missing" | "unclosed" {
  const lines = source.split("\n");
  if (lines[0].trimEnd() !== "---") return "missing";
  const end = lines.findIndex((line, index) => index > 0 && line.trimEnd() === "---");
  if (end === -1) return "unclosed";
  return { yaml: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n"), bodyLine: end + 2 };
}

/**
 * Reads a Motivator file. `label` is how the file is named in problems, e.g. "config/motivators/craft.md".
 * Throws on a YAML syntax error in the frontmatter, like the other YAML files do.
 */
export function readMotivatorFile(source: string, label: string): MotivatorReading {
  const problems: string[] = [];
  const report = (line: number, message: string) => problems.push(`${label}:${line}: ${message}`);

  const parts = splitFrontmatter(source.replace(/\r\n?/g, "\n"));
  if (parts === "missing") {
    report(1, 'the file must start with a frontmatter ("---" on the first line) holding "icon", "colour" and "title"');
    return { problems };
  }
  if (parts === "unclosed") {
    report(1, 'the frontmatter is not closed; add a "---" line after it');
    return { problems };
  }

  const front = readFrontmatter(parts.yaml, label, report);
  const description = parts.body.trim();
  if (description === "") report(parts.bodyLine, "the Description is empty; write it below the frontmatter");

  if (problems.length > 0 || !front) return { problems };
  return { motivator: { ...front, description }, problems };
}

function readFrontmatter(yaml: string, label: string, report: (line: number, message: string) => void) {
  // The frontmatter starts on line 2 of the file, after the opening "---".
  const lineCounter = new LineCounter();
  const document = parseDocument(yaml, { lineCounter });
  if (document.errors.length > 0) {
    const error = document.errors[0];
    const line = (error.linePos?.[0].line ?? 1) + 1;
    const message = error.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, "");
    throw new Error(`${label}:${line}: ${message}`);
  }

  const map = document.contents;
  if (!isMap(map)) {
    report(2, 'the frontmatter must be a list of "key: value" lines');
    return undefined;
  }

  const lineOf = (offset: number) => lineCounter.linePos(offset).line + 1;
  const values: Record<string, unknown> = {};
  const lines: Record<string, number> = {};
  for (const pair of map.items) {
    const name = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
    const line = isScalar(pair.key) && pair.key.range ? lineOf(pair.key.range[0]) : 2;
    if (!(FIELDS as readonly string[]).includes(name)) {
      report(line, `"${name}" is not allowed in the frontmatter; use only "icon", "colour" and "title" (the Motivator key is the file name)`);
      continue;
    }
    values[name] = isScalar(pair.value) ? pair.value.value : pair.value?.toJSON?.();
    lines[name] = line;
  }

  let valid = true;
  for (const name of FIELDS) {
    if (!(name in values)) {
      report(1, `the frontmatter needs ${name === "icon" ? "an" : "a"} "${name}"`);
      valid = false;
    } else if (typeof values[name] !== "string" || values[name].trim() === "") {
      report(lines[name], `"${name}" must be a non-empty text`);
      valid = false;
    } else if (name === "colour" && !HEX_COLOUR.test(values[name])) {
      report(lines[name], '"colour" must be a hex colour such as "#2f7d6d"');
      valid = false;
    }
  }
  if (!valid) return undefined;
  return { icon: values.icon as string, colour: values.colour as string, title: (values.title as string).trim() };
}
