export type LanguageId =
  | "python"
  | "javascript"
  | "c"
  | "cpp"
  | "csharp"
  | "rust"
  | "html"
  | "css";

export type TransformKind =
  | "minify"
  | "obfuscate"
  | "strip-comments"
  | "squash-whitespace"
  | "reverse-lines"
  | "identifier-noise";

export interface ProjectFile {
  path: string;
  content: string;
  language?: LanguageId;
}

export interface RunRequest {
  language: LanguageId;
  files: ProjectFile[];
  entrypoint: string;
  stdin?: string;
}

export interface RunResult {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "unsupported";
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  artifacts?: Array<{
    name: string;
    mimeType: string;
    url?: string;
    content?: string;
  }>;
}

export interface TransformRequest {
  language: Exclude<LanguageId, "python">;
  kind: TransformKind;
  file: ProjectFile;
}

export interface TransformResult {
  path: string;
  beforeBytes: number;
  afterBytes: number;
  content: string;
  warnings: string[];
}

export const languageLabels: Record<LanguageId, string> = {
  python: "Python",
  javascript: "JavaScript",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  rust: "Rust",
  html: "HTML",
  css: "CSS"
};
