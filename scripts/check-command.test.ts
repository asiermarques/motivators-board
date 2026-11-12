import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config";
import { configurationProblems, problemsMessage, runCheck } from "./check-command";

function io() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (line: string) => out.push(line), err: (line: string) => err.push(line) } };
}

const failing = () => {
  throw new ConfigError(["config/motivators/Order.md: bad key", "config/motivators/name.md: reserved"]);
};

describe("configurationProblems", () => {
  it("is empty for the Sample configuration", () => {
    expect(configurationProblems(loadConfig)).toEqual([]);
  });

  it("lists every problem of an invalid Configuration", () => {
    expect(configurationProblems(failing)).toEqual(["config/motivators/Order.md: bad key", "config/motivators/name.md: reserved"]);
  });

  it("lets other errors through", () => {
    expect(() =>
      configurationProblems(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
  });
});

describe("runCheck", () => {
  it("says the Configuration is valid and exits with 0", () => {
    const { out, io: streams } = io();
    expect(runCheck({ io: streams, loadConfig })).toBe(0);
    expect(out).toEqual(["The Configuration is valid."]);
  });

  it("lists every problem and exits with 1", () => {
    const { err, io: streams } = io();
    expect(runCheck({ io: streams, loadConfig: failing })).toBe(1);
    expect(err).toEqual([problemsMessage(["config/motivators/Order.md: bad key", "config/motivators/name.md: reserved"])]);
    expect(err[0]).toBe("The Configuration has problems:\n- config/motivators/Order.md: bad key\n- config/motivators/name.md: reserved");
  });
});
