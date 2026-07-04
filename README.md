# PolyCompile

PolyCompile is a GitHub-ready, Render-deployable scaffold for a multi-language code workspace. It includes:

- A React editor UI with desktop and mobile layouts.
- Workspace modes for plain code editing, website preview, transforms, graphics planning, file browsing, and an AI side panel.
- Multi-file and folder upload.
- Live HTML/CSS/JavaScript preview in a sandboxed iframe.
- API contracts for Python, JavaScript, C, C++, C#, and Rust execution.
- A safe mock runner by default, plus a Piston-compatible remote runner adapter.
- Non-Python transforms: minify, obfuscate, strip comments, squash whitespace, identifier noise, and reverse lines.
- Architecture and security docs for adding isolated graphical runners for raylib, SDL2, and turtle.

## Local Run

```bash
pnpm install
pnpm run dev
```

Open `http://localhost:5173`.

The default `RUNNER_PROVIDER=mock` does not execute untrusted code. To execute code, point `RUNNER_PROVIDER=piston` at a trusted Piston-compatible service:

```bash
RUNNER_PROVIDER=piston PISTON_URL=https://your-runner.example.com/api/v2/piston pnpm run dev
```

## Upload to GitHub

From the `PolyCompile` folder:

```bash
git init
git add .
git commit -m "Initial PolyCompile scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PolyCompile.git
git push -u origin main
```

If you prefer GitHub CLI:

```bash
gh repo create YOUR_USERNAME/PolyCompile --private --source=. --remote=origin --push
```

## Deploy on Render

1. Push this repository to GitHub.
2. Open Render and choose **New > Blueprint**.
3. Connect the GitHub repository.
4. Select the branch named `main`.
5. Let Render read `render.yaml`.
6. Create/apply the Blueprint.
7. After the first deploy, open the service URL and check `/api/health`.

For real execution, set these Render environment variables:

```text
RUNNER_PROVIDER=piston
PISTON_URL=https://your-isolated-runner.example.com/api/v2/piston
ALLOWED_ORIGIN=https://your-polycompile.onrender.com
```

Keep `RUNNER_PROVIDER=mock` until you have a runner with process isolation, timeouts, network controls, and filesystem cleanup.

## AI Side Agent

An AI side agent is useful if it stays scoped: explain compiler errors, suggest file organization, generate tests, and offer refactors. It should ask before changing code, show diffs, avoid hidden execution, and clearly distinguish guesses from verified output.

## Docs

- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Render deployment](docs/render.md)
