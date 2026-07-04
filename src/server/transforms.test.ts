import { describe, expect, it } from "vitest";
import { transformFile } from "./transforms";

describe("transformFile", () => {
  it("minifies JavaScript", async () => {
    const result = await transformFile({
      language: "javascript",
      kind: "minify",
      file: {
        path: "main.js",
        content: "function hello(name) { console.log('hello ' + name); }\nhello('PolyCompile');"
      }
    });

    expect(result.afterBytes).toBeLessThan(result.beforeBytes);
    expect(result.content).toContain("console.log");
  });

  it("runs silly transforms for C-like languages", async () => {
    const result = await transformFile({
      language: "rust",
      kind: "identifier-noise",
      file: {
        path: "main.rs",
        content: "fn main() { let greeting = \"hello\"; println!(\"{}\", greeting); }"
      }
    });

    expect(result.content).toContain("_pc_");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
