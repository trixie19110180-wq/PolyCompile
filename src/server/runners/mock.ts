import { nanoid } from "nanoid";
import type { RunRequest, RunResult } from "../../shared/types";
import type { Runner } from "./types";

export class MockRunner implements Runner {
  async run(request: RunRequest): Promise<RunResult> {
    const started = performance.now();
    return {
      id: nanoid(),
      status: "unsupported",
      stdout: [
        `PolyCompile received ${request.files.length} file(s) for ${request.language}.`,
        "Execution is in safe mock mode.",
        "Set RUNNER_PROVIDER=piston and PISTON_URL to a Piston-compatible service to run code."
      ].join("\n"),
      stderr: "",
      exitCode: null,
      durationMs: Math.round(performance.now() - started)
    };
  }
}
