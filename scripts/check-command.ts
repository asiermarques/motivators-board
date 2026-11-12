// The `check` command and the validation `build` runs first. The Configuration is read with the same loadConfig() as
// the app, so the problems and their wording are those of the app's problems screen.
// Adapted from progression-radar 1.3.0 (scripts/check-command.ts).
import { ConfigError, loadConfig } from "../src/config.ts";

export interface Context {
  io: { out: (line: string) => void; err: (line: string) => void };
  loadConfig?: typeof loadConfig;
}

/** Every problem of the Configuration; empty when it is valid. Other errors are not Configuration problems. */
export function configurationProblems(load: typeof loadConfig = loadConfig): string[] {
  try {
    load();
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
}

/** The message that lists the problems, for `check` and `build`. */
export const problemsMessage = (problems: string[]) => `The Configuration has problems:\n- ${problems.join("\n- ")}`;

/** Validates the Configuration. Returns the exit code: 1 when it has any problem, 0 otherwise. */
export function runCheck(context: Context): number {
  const problems = configurationProblems(context.loadConfig);
  if (problems.length > 0) {
    context.io.err(problemsMessage(problems));
    return 1;
  }
  context.io.out("The Configuration is valid.");
  return 0;
}
