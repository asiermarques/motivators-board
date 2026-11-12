// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const cli = join(import.meta.dirname, "cli.mjs");
let adopter: string;

function run(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: adopter, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

beforeAll(() => {
  adopter = mkdtempSync(join(tmpdir(), "motivators-board-cli-"));
  const broken = join(adopter, "broken", "motivators");
  mkdirSync(broken, { recursive: true });
  writeFileSync(join(broken, "Order.md"), '---\nicon: craft.svg\ncolour: "#2f7d6d"\ntitle: Order\n---\n\nText.\n');
  writeFileSync(join(broken, "name.md"), '---\nicon: craft.svg\ncolour: "#2f7d6d"\ntitle: Name\n---\n');
});

afterAll(() => {
  rmSync(adopter, { recursive: true, force: true });
});

describe("motivators-board", () => {
  it("lists its commands", () => {
    const { status, out } = run(["--help"]);
    expect(status).toBe(0);
    for (const command of ["dev", "build", "preview", "check", "init"]) expect(out).toContain(`  ${command}`);
  });

  it("fails on an unknown command", () => {
    const { status, err } = run(["deal"]);
    expect(status).toBe(1);
    expect(err).toContain('Unknown command "deal"');
  });

  it("checks the Sample configuration when the directory has no config folder", () => {
    const { status, out } = run(["check"]);
    expect(status).toBe(0);
    expect(out).toContain("The Configuration is valid.");
  }, 30_000);

  it("lists every problem of an invalid Configuration and fails", () => {
    const { status, err } = run(["check"], { MOTIVATORS_BOARD_CONFIG_DIR: "broken" });
    expect(status).toBe(1);
    expect(err).toContain("broken/motivators/Order.md: the Motivator key \"Order\" must use only lowercase letters");
    expect(err).toContain('broken/motivators/name.md: "name" is reserved for the Share link');
    expect(err).toContain("broken/motivators/name.md:6: the Description is empty");
  }, 30_000);

  it("does not build an invalid Configuration", () => {
    const { status, err } = run(["build"], { MOTIVATORS_BOARD_CONFIG_DIR: "broken" });
    expect(status).toBe(1);
    expect(err).toContain("The build was not run.");
  }, 30_000);
});
