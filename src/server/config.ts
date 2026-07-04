import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  RUNNER_PROVIDER: z.enum(["mock", "piston"]).default("mock"),
  PISTON_URL: z.string().url().default("https://emkc.org/api/v2/piston"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(8),
  MAX_FILES: z.coerce.number().int().positive().default(80),
  RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  AI_ASSISTANT_ENABLED: z
    .string()
    .transform((value) => value === "true")
    .default("false"),
  AI_ASSISTANT_MODEL: z.string().optional()
});

export const config = envSchema.parse(process.env);
