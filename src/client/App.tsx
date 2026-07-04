import {
  Bot,
  Braces,
  Eye,
  FileCode2,
  Files,
  FolderOpen,
  Gamepad2,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  TerminalSquare,
  Wand2
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  LanguageId,
  ProjectFile,
  RunResult,
  TransformKind,
  TransformResult
} from "../shared/types";
import { languageLabels } from "../shared/types";

const starterFiles: ProjectFile[] = [
  {
    path: "index.html",
    language: "html",
    content: `<section class="stage">
  <h1>PolyCompile</h1>
  <button id="run">Click me</button>
  <output id="out"></output>
</section>
<script src="./main.js"></script>`
  },
  {
    path: "styles.css",
    language: "css",
    content: `.stage {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 16px;
  font-family: system-ui, sans-serif;
  background: #101820;
  color: #f8fafc;
}

button {
  border: 0;
  padding: 10px 14px;
  background: #2dd4bf;
  color: #042f2e;
  font-weight: 700;
}`
  },
  {
    path: "main.js",
    language: "javascript",
    content: `document.querySelector("#run").addEventListener("click", () => {
  document.querySelector("#out").value = "Browser preview is live.";
});`
  }
];

const transformKinds: TransformKind[] = [
  "minify",
  "obfuscate",
  "strip-comments",
  "squash-whitespace",
  "identifier-noise",
  "reverse-lines"
];

const runnableLanguages: LanguageId[] = ["python", "javascript", "c", "cpp", "csharp", "rust", "html", "css"];

type WorkspaceMode = "code" | "website" | "transform" | "graphics" | "files" | "agent";

const workspaceModes: Array<{ id: WorkspaceMode; label: string }> = [
  { id: "code", label: "Code" },
  { id: "website", label: "Website" },
  { id: "transform", label: "Transform" },
  { id: "graphics", label: "Graphics" },
  { id: "files", label: "Files" },
  { id: "agent", label: "Agent" }
];

export function App() {
  const [files, setFiles] = useState<ProjectFile[]>(starterFiles);
  const [activePath, setActivePath] = useState(starterFiles[0].path);
  const [language, setLanguage] = useState<LanguageId>("html");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<RunResult | null>(null);
  const [transformKind, setTransformKind] = useState<TransformKind>("minify");
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("code");

  const activeFile = useMemo(
    () => files.find((file) => file.path === activePath) ?? files[0],
    [activePath, files]
  );

  const previewDoc = useMemo(() => buildPreviewDocument(files), [files]);

  function updateActiveFile(content: string) {
    setFiles((current) =>
      current.map((file) => (file.path === activeFile.path ? { ...file, content } : file))
    );
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const form = new FormData();
    Array.from(fileList).forEach((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      form.append("files", file, relativePath);
    });

    const response = await fetch("/api/projects/upload", {
      method: "POST",
      body: form
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Upload failed.");
    }

    setFiles(payload.files);
    setActivePath(payload.files[0]?.path ?? activePath);
  }

  async function runProject() {
    setIsBusy(true);
    setOutput(null);
    try {
      if ((language === "html" || language === "css") && mode === "website") {
        setPreviewKey((key) => key + 1);
        setOutput({
          id: "browser-preview",
          status: "completed",
          stdout: "Preview refreshed in the browser pane.",
          stderr: "",
          exitCode: 0,
          durationMs: 0
        });
        return;
      }

      if (language === "html" || language === "css") {
        setOutput({
          id: "preview-disabled",
          status: "unsupported",
          stdout: "Switch to Website mode to render HTML, CSS, and JavaScript.",
          stderr: "",
          exitCode: null,
          durationMs: 0
        });
        return;
      }

      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          files,
          entrypoint: activeFile.path,
          stdin
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Run failed.");
      }
      setOutput(payload);
    } catch (error) {
      setOutput({
        id: "client-error",
        status: "failed",
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unexpected client error.",
        exitCode: null,
        durationMs: 0
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function transformActiveFile() {
    if (!activeFile || activeFile.language === "python") return;
    setIsBusy(true);
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: activeFile.language ?? language,
          kind: transformKind,
          file: activeFile
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Transform failed.");
      }
      setTransformResult(payload);
      updateActiveFile(payload.content);
    } catch (error) {
      setTransformResult({
        path: activeFile.path,
        beforeBytes: activeFile.content.length,
        afterBytes: activeFile.content.length,
        content: activeFile.content,
        warnings: [error instanceof Error ? error.message : "Unexpected transform error."]
      });
    } finally {
      setIsBusy(false);
    }
  }

  const fileRail = (
    <aside className="file-rail">
      <div className="rail-title">Files</div>
      <div className="file-list">
        {files.map((file) => (
          <button
            type="button"
            key={file.path}
            className={file.path === activeFile.path ? "file-row active" : "file-row"}
            onClick={() => {
              setActivePath(file.path);
              if (file.language) setLanguage(file.language);
            }}
          >
            <FileCode2 aria-hidden="true" />
            <span>{file.path}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  const transformControls = (
    <div className="transform-strip">
      <select value={transformKind} onChange={(event) => setTransformKind(event.target.value as TransformKind)}>
        {transformKinds.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <button
        className="command secondary"
        type="button"
        disabled={activeFile.language === "python" || isBusy}
        onClick={transformActiveFile}
      >
        <Wand2 aria-hidden="true" />
        Transform
      </button>
    </div>
  );

  const editorPane = (
    <section className="editor-pane">
      <div className="pane-head">
        <span>{activeFile.path}</span>
        {mode === "transform" ? transformControls : <span>{languageLabels[language]}</span>}
      </div>
      <textarea
        spellCheck={false}
        value={activeFile.content}
        onChange={(event) => updateActiveFile(event.currentTarget.value)}
      />
    </section>
  );

  const consolePane = (
    <section className="console-region">
      <div className="pane-head">
        <span>Console</span>
        <span>{output ? output.status : "idle"}</span>
      </div>
      <pre>{formatOutput(output, transformResult)}</pre>
      <textarea
        className="stdin"
        placeholder="stdin"
        value={stdin}
        onChange={(event) => setStdin(event.currentTarget.value)}
      />
    </section>
  );

  const previewPane = (
    <section className="preview-region">
      <div className="pane-head">
        <span>Preview</span>
        <button
          className="icon-button slim"
          type="button"
          title="Refresh preview"
          onClick={() => setPreviewKey((key) => key + 1)}
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </div>
      <iframe key={previewKey} title="Web preview" sandbox="allow-scripts allow-forms" srcDoc={previewDoc} />
    </section>
  );

  const assistantPane = (
    <aside className="assistant-pane">
      <div className="assistant-title">
        <Bot aria-hidden="true" />
        <span>AI Side Agent</span>
      </div>
      <p>
        A side agent fits this product well when it explains errors, suggests dependency files, and helps users convert
        small snippets across languages. It should ask before editing, cite changed files, and never run hidden code on
        the user&apos;s behalf.
      </p>
      <div className="assistant-log">
        <span>Good first tools:</span>
        <span>Explain compiler output</span>
        <span>Generate tests</span>
        <span>Suggest safe transforms</span>
      </div>
    </aside>
  );

  const modeClass = `workspace mode-${mode}${assistantOpen && mode !== "agent" ? " assistant-visible" : ""}`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Braces aria-hidden="true" />
          <div>
            <strong>PolyCompile</strong>
            <span>Multi-language workspace</span>
          </div>
        </div>

        <div className="toolbar">
          <label className="icon-button" title="Upload files or a folder">
            <FolderOpen aria-hidden="true" />
            <input
              type="file"
              multiple
              // React does not type browser-specific directory upload attributes.
              ref={(input) => {
                if (input) input.webkitdirectory = true;
              }}
              onChange={(event) => uploadFiles(event.currentTarget.files).catch(console.error)}
            />
          </label>
          <div className="mode-tabs" aria-label="Workspace modes">
            {workspaceModes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? "mode-tab active" : "mode-tab"}
                onClick={() => setMode(item.id)}
              >
                {renderModeIcon(item.id)}
                {item.label}
              </button>
            ))}
          </div>
          <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageId)}>
            {runnableLanguages.map((item) => (
              <option key={item} value={item}>
                {languageLabels[item]}
              </option>
            ))}
          </select>
          <button className="command" type="button" onClick={runProject} disabled={isBusy}>
            {isBusy ? <RefreshCw aria-hidden="true" /> : <Play aria-hidden="true" />}
            Run
          </button>
          <button
            className="icon-button"
            type="button"
            title={assistantOpen ? "Hide assistant" : "Show assistant"}
            onClick={() => setAssistantOpen((open) => !open)}
          >
            {assistantOpen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </button>
        </div>
      </header>

      <section className={modeClass}>
        {mode === "code" && (
          <>
            {fileRail}
            {editorPane}
            {consolePane}
            {assistantOpen && assistantPane}
          </>
        )}

        {mode === "website" && (
          <>
            {fileRail}
            {editorPane}
            <section className="result-pane">
              {previewPane}
              {consolePane}
            </section>
            {assistantOpen && assistantPane}
          </>
        )}

        {mode === "transform" && (
          <>
            {fileRail}
            {editorPane}
            <section className="tool-pane">
              <div className="pane-head">
                <span>Transform Lab</span>
                <Wand2 aria-hidden="true" />
              </div>
              <div className="mode-panel">
                <button className="big-action" type="button" disabled={activeFile.language === "python" || isBusy} onClick={transformActiveFile}>
                  <Wand2 aria-hidden="true" />
                  Apply selected transform
                </button>
                <div className="metric-grid">
                  <span>Active file</span>
                  <strong>{activeFile.path}</strong>
                  <span>Mode</span>
                  <strong>{transformKind}</strong>
                  <span>Bytes</span>
                  <strong>{activeFile.content.length}</strong>
                </div>
                <pre>{formatTransformDetails(transformResult)}</pre>
              </div>
            </section>
            {assistantOpen && assistantPane}
          </>
        )}

        {mode === "graphics" && (
          <>
            {fileRail}
            {editorPane}
            <section className="tool-pane">
              <div className="pane-head">
                <span>Graphics Runner</span>
                <Gamepad2 aria-hidden="true" />
              </div>
              <div className="mode-panel">
                <div className="mode-card">
                  <strong>raylib / SDL2</strong>
                  <span>Use isolated runner images with xvfb or Wayland headless capture.</span>
                </div>
                <div className="mode-card">
                  <strong>Python turtle</strong>
                  <span>Render through a virtual display and return PNG, MP4, or streamed frames.</span>
                </div>
                <div className="mode-card">
                  <strong>Safety limits</strong>
                  <span>Frame budget, wall-clock timeout, output cap, and no default network access.</span>
                </div>
              </div>
            </section>
            {consolePane}
            {assistantOpen && assistantPane}
          </>
        )}

        {mode === "files" && (
          <>
            {fileRail}
            <section className="tool-pane wide">
              <div className="pane-head">
                <span>Project Files</span>
                <Files aria-hidden="true" />
              </div>
              <div className="file-table">
                {files.map((file) => (
                  <button key={file.path} type="button" className="file-card" onClick={() => setActivePath(file.path)}>
                    <FileCode2 aria-hidden="true" />
                    <strong>{file.path}</strong>
                    <span>{file.language ? languageLabels[file.language] : "text"} · {file.content.length} chars</span>
                  </button>
                ))}
              </div>
            </section>
            {assistantOpen && assistantPane}
          </>
        )}

        {mode === "agent" && (
          <>
            <section className="tool-pane wide">
              <div className="pane-head">
                <span>Agent Mode</span>
                <Bot aria-hidden="true" />
              </div>
              <div className="agent-layout">
                {assistantPane}
                <div className="mode-panel">
                  <div className="mode-card">
                    <strong>Suggested role</strong>
                    <span>Explain errors, suggest fixes, generate tests, and ask before editing files.</span>
                  </div>
                  <div className="mode-card">
                    <strong>Runner rule</strong>
                    <span>Never execute hidden code. Every run should be visible in the console.</span>
                  </div>
                  <div className="mode-card">
                    <strong>Future hook</strong>
                    <span>Connect this panel to an API route once a model provider is selected.</span>
                  </div>
                </div>
              </div>
            </section>
            {consolePane}
          </>
        )}
      </section>
    </main>
  );
}

function buildPreviewDocument(files: ProjectFile[]): string {
  const map = new Map(files.map((file) => [file.path, file.content]));
  const html = (map.get("index.html") ?? "<main id=\"app\"></main>")
    .replace(/<script[^>]+src=["'][^"']+["'][^>]*><\/script>/gi, "")
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
  const css = [...map.entries()]
    .filter(([path]) => path.endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");
  const js = [...map.entries()]
    .filter(([path]) => path.endsWith(".js") || path.endsWith(".mjs"))
    .map(([, content]) => content)
    .join("\n");

  return html.includes("</body>")
    ? html
        .replace("</head>", `<style>${css}</style></head>`)
        .replace("</body>", `<script type="module">${js}</script></body>`)
    : `<!doctype html><html><head><style>${css}</style></head><body>${html}<script type="module">${js}</script></body></html>`;
}

function formatOutput(output: RunResult | null, transformResult: TransformResult | null): string {
  const chunks: string[] = [];
  if (output) {
    chunks.push(`status: ${output.status}`);
    chunks.push(`exit: ${output.exitCode ?? "n/a"}`);
    if (output.stdout) chunks.push(`\nstdout\n${output.stdout}`);
    if (output.stderr) chunks.push(`\nstderr\n${output.stderr}`);
  }
  if (transformResult) {
    chunks.push(
      `\ntransform: ${transformResult.path} ${transformResult.beforeBytes}b -> ${transformResult.afterBytes}b`
    );
    if (transformResult.warnings.length) {
      chunks.push(transformResult.warnings.join("\n"));
    }
  }
  return chunks.join("\n") || "Run code, refresh the preview, or transform the active file.";
}

function formatTransformDetails(transformResult: TransformResult | null): string {
  if (!transformResult) {
    return "Choose a transform and apply it to the active non-Python file.";
  }

  return [
    `${transformResult.path}`,
    `${transformResult.beforeBytes} bytes -> ${transformResult.afterBytes} bytes`,
    transformResult.warnings.length ? `warnings\n${transformResult.warnings.join("\n")}` : "no warnings"
  ].join("\n");
}

function renderModeIcon(mode: WorkspaceMode) {
  if (mode === "code") return <TerminalSquare aria-hidden="true" />;
  if (mode === "website") return <Eye aria-hidden="true" />;
  if (mode === "transform") return <Wand2 aria-hidden="true" />;
  if (mode === "graphics") return <Gamepad2 aria-hidden="true" />;
  if (mode === "files") return <Files aria-hidden="true" />;
  return <Bot aria-hidden="true" />;
}
