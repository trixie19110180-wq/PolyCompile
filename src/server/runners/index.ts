import { config } from "../config";
import { MockRunner } from "./mock";
import { PistonRunner } from "./piston";
import type { Runner } from "./types";

export function createRunner(): Runner {
  if (config.RUNNER_PROVIDER === "piston") {
    return new PistonRunner(config.PISTON_URL);
  }

  return new MockRunner();
}
