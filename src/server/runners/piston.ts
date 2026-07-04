import { nanoid } from "nanoid";
import type { LanguageId, RunRequest, RunResult } from "../../shared/types";
import type { Runner } from "./types";

const pistonLanguageMap: Record<LanguageId, string | null> = {
  python: "python",
  javascript: "javascript",
  c: "c",
  cpp: "c++",
  csharp: "csharp",
  rust: "rust",
  html: null,
  css: null
};

const pistonDefaultVersions: Partial<Record<LanguageId, string>> = {
  python: "3.10.0",
  javascript: "18.15.0",
  c: "10.2.0",
  cpp: "10.2.0",
  csharp: "6.12.0",
  rust: "1.68.2"
};

interface PistonResponse {
  run?: {
    stdout?: string;
    stderr?: string;
    code?: number | null;
    signal?: string | null;
    output?: string;
  };
  compile?: {
    stdout?: string;
    stderr?: string;
    code?: number | null;
    output?: string;
  };
  message?: string;
}

export class PistonRunner implements Runner {
  constructor(private readonly baseUrl: string) {}

  async run(request: RunRequest, signal?: AbortSignal): Promise<RunResult> {
    const started = performance.now();
    const pistonLanguage = pistonLanguageMap[request.language];

    if (!pistonLanguage) {
      return {
        id: nanoid(),
        status: "unsupported",
        stdout: "",
        stderr: `${request.language} uses the browser preview path instead of the remote runner.`,
        exitCode: null,
        durationMs: Math.round(performance.now() - started)
      };
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/execute`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        language: pistonLanguage,
        version: pistonDefaultVersions[request.language] ?? "*",
        files: request.files.map((file) => ({
          name: file.path,
          content: file.content
        })),
        stdin: request.stdin ?? "",
        args: [],
        compile_timeout: 8000,
        run_timeout: 5000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      })
    });

    const payload = (await response.json()) as PistonResponse;
    if (!response.ok) {
      return {
        id: nanoid(),
        status: "failed",
        stdout: "",
        stderr: payload.message ?? `Runner failed with HTTP ${response.status}.`,
        exitCode: null,
        durationMs: Math.round(performance.now() - started)
      };
    }

    const stdout = [payload.compile?.stdout, payload.run?.stdout].filter(Boolean).join("");
    const stderr = [payload.compile?.stderr, payload.run?.stderr, payload.message]
      .filter(Boolean)
      .join("");
    const exitCode = payload.run?.code ?? payload.compile?.code ?? null;

    return {
      id: nanoid(),
      status: exitCode === 0 || exitCode === null ? "completed" : "failed",
      stdout,
      stderr,
      exitCode,
      durationMs: Math.round(performance.now() - started)
    };
  }
}
