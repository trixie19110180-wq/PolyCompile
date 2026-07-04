import { minify as minifyHtml } from "html-minifier-terser";
import { transform as transformCss } from "lightningcss";
import { minify as minifyJs } from "terser";
import type { TransformRequest, TransformResult } from "../shared/types";

const cFamilyExtensions = new Set(["c", "cpp", "csharp", "rust"]);

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*#.*$/gm, "");
}

function squashWhitespace(content: string): string {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function addIdentifierNoise(content: string): string {
  const names = new Map<string, string>();
  const reserved = new Set([
    "if",
    "for",
    "while",
    "return",
    "class",
    "struct",
    "const",
    "let",
    "var",
    "function",
    "public",
    "private",
    "using",
    "namespace",
    "include",
    "int",
    "float",
    "double",
    "char",
    "void",
    "fn",
    "mut",
    "use"
  ]);

  return content.replace(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g, (name) => {
    if (reserved.has(name)) return name;
    if (!names.has(name)) {
      names.set(name, `_pc_${names.size.toString(36)}_${name.length}`);
    }
    return names.get(name) ?? name;
  });
}

export async function transformFile(request: TransformRequest): Promise<TransformResult> {
  const warnings: string[] = [];
  const { file, kind, language } = request;
  let content = file.content;

  if (kind === "minify" || kind === "obfuscate") {
    if (language === "javascript") {
      const result = await minifyJs(content, {
        compress: true,
        mangle: kind === "obfuscate",
        format: { comments: false }
      });
      content = result.code ?? content;
    } else if (language === "css") {
      const result = transformCss({
        filename: file.path,
        code: Buffer.from(content),
        minify: true
      });
      content = Buffer.from(result.code).toString("utf8");
    } else if (language === "html") {
      content = await minifyHtml(content, {
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        removeComments: true
      });
    } else if (cFamilyExtensions.has(language)) {
      content = squashWhitespace(stripComments(content));
      if (kind === "obfuscate") {
        content = addIdentifierNoise(content);
        warnings.push("Identifier obfuscation is lexical, not compiler-aware.");
      }
    }
  }

  if (kind === "strip-comments") {
    content = stripComments(content);
  }

  if (kind === "squash-whitespace") {
    content = squashWhitespace(content);
  }

  if (kind === "reverse-lines") {
    content = content.split("\n").reverse().join("\n");
    warnings.push("Reverse-lines is deliberately useless and probably breaks programs.");
  }

  if (kind === "identifier-noise") {
    content = addIdentifierNoise(content);
    warnings.push("Identifier-noise is a fun lexical transform and can change program behavior.");
  }

  return {
    path: file.path,
    beforeBytes: Buffer.byteLength(file.content, "utf8"),
    afterBytes: Buffer.byteLength(content, "utf8"),
    content,
    warnings
  };
}
