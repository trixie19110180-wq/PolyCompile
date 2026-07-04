import path from "node:path";
import type { ProjectFile } from "../shared/types";

const dangerousPathSegments = new Set(["", ".", ".."]);
const maxTextFileBytes = 512 * 1024;

export function sanitizeProjectPath(input: string): string {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  const parts = normalized.split("/");

  if (parts.some((part) => dangerousPathSegments.has(part))) {
    throw new Error(`Invalid project path: ${input}`);
  }

  const safePath = path.posix.normalize(parts.join("/"));
  if (safePath.startsWith("../") || path.posix.isAbsolute(safePath)) {
    throw new Error(`Invalid project path: ${input}`);
  }

  return safePath;
}

export function validateProjectFiles(files: ProjectFile[], maxFiles: number): ProjectFile[] {
  if (files.length === 0) {
    throw new Error("At least one file is required.");
  }

  if (files.length > maxFiles) {
    throw new Error(`Too many files. Maximum allowed is ${maxFiles}.`);
  }

  return files.map((file) => {
    const contentBytes = Buffer.byteLength(file.content, "utf8");
    if (contentBytes > maxTextFileBytes) {
      throw new Error(`${file.path} is too large for inline execution.`);
    }

    return {
      ...file,
      path: sanitizeProjectPath(file.path)
    };
  });
}

export function createPreviewHtml(files: ProjectFile[]): string {
  const fileMap = new Map(files.map((file) => [sanitizeProjectPath(file.path), file.content]));
  const explicitIndex = fileMap.get("index.html");

  if (explicitIndex) {
    return explicitIndex;
  }

  const css = [...fileMap.entries()]
    .filter(([name]) => name.endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");
  const js = [...fileMap.entries()]
    .filter(([name]) => name.endsWith(".js") || name.endsWith(".mjs"))
    .map(([, content]) => content)
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${css}</style>
  </head>
  <body>
    <main id="app"></main>
    <script type="module">${js}</script>
  </body>
</html>`;
}
