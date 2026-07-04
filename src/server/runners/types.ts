import type { RunRequest, RunResult } from "../../shared/types";

export interface Runner {
  run(request: RunRequest, signal?: AbortSignal): Promise<RunResult>;
}
