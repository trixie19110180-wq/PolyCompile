import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { config } from "./config";
import { createRunner } from "./runners";
import { createPreviewHtml, sanitizeProjectPath, validateProjectFiles } from "./security";
import { transformFile } from "./transforms";
import type { LanguageId, ProjectFile } from "../shared/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const runner = createRunner();

const projectFileSchema = z.object({
  path: z.string().min(1).max(240),
  content: z.string(),
  language: z
    .enum(["python", "javascript", "c", "cpp", "csharp", "rust", "html", "css"])
    .optional()
});

const runSchema = z.object({
  language: z.enum(["python", "javascript", "c", "cpp", "csharp", "rust", "html", "css"]),
  files: z.array(projectFileSchema),
  entrypoint: z.string().min(1).max(240),
  stdin: z.string().max(64_000).optional()
});

const transformSchema = z.object({
  language: z.enum(["javascript", "c", "cpp", "csharp", "rust", "html", "css"]),
  kind: z.enum([
    "minify",
    "obfuscate",
    "strip-comments",
    "squash-whitespace",
    "reverse-lines",
    "identifier-noise"
  ]),
  file: projectFileSchema
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: config.MAX_FILES,
    fileSize: config.MAX_UPLOAD_MB * 1024 * 1024
  }
});

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(
  cors({
    origin: config.NODE_ENV === "production" ? config.ALLOWED_ORIGIN : true
  })
);
app.use(express.json({ limit: `${config.MAX_UPLOAD_MB}mb` }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    runner: config.RUNNER_PROVIDER,
    aiAssistantEnabled: config.AI_ASSISTANT_ENABLED
  });
});

app.post("/api/projects/upload", upload.array("files"), (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const parsed: ProjectFile[] = validateProjectFiles(
      files.map((file) => ({
        path: sanitizeProjectPath(file.originalname),
        content: file.buffer.toString("utf8"),
        language: detectLanguage(file.originalname)
      })),
      config.MAX_FILES
    );

    res.json({ files: parsed });
  } catch (error) {
    next(error);
  }
});

app.post("/api/preview", (req, res, next) => {
  try {
    const files = validateProjectFiles(z.array(projectFileSchema).parse(req.body.files), config.MAX_FILES);
    res.type("html").send(createPreviewHtml(files));
  } catch (error) {
    next(error);
  }
});

app.post("/api/run", async (req, res, next) => {
  try {
    const payload = runSchema.parse(req.body);
    const files = validateProjectFiles(payload.files, config.MAX_FILES);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.RUN_TIMEOUT_MS);

    try {
      const result = await runner.run({ ...payload, files }, controller.signal);
      res.json(result);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    next(error);
  }
});

app.post("/api/transform", async (req, res, next) => {
  try {
    const payload = transformSchema.parse(req.body);
    const [file] = validateProjectFiles([payload.file], 1);
    res.json(await transformFile({ ...payload, file }));
  } catch (error) {
    next(error);
  }
});

const clientDir = path.resolve(__dirname, "../client");
app.use(express.static(clientDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(400).json({ error: message });
});

app.listen(config.PORT, "0.0.0.0", () => {
  console.log(`PolyCompile listening on ${config.PORT}`);
});

function detectLanguage(filename: string): LanguageId | undefined {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".ts")) return "javascript";
  if (lower.endsWith(".c")) return "c";
  if (lower.endsWith(".cc") || lower.endsWith(".cpp") || lower.endsWith(".cxx")) return "cpp";
  if (lower.endsWith(".cs")) return "csharp";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".css")) return "css";
  return undefined;
}
