# Render Deployment

This repository includes `render.yaml` and a Dockerfile. Render builds the Docker image from the repo and starts the web service on `PORT=10000`.

## GitHub Upload

```bash
cd /Users/jinheean/Documents/PolyCompile
git init
git add .
git commit -m "Initial PolyCompile scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PolyCompile.git
git push -u origin main
```

Create the empty GitHub repository first at `https://github.com/new`, or use:

```bash
gh repo create YOUR_USERNAME/PolyCompile --private --source=. --remote=origin --push
```

## Render Blueprint Deploy

1. Go to Render.
2. Choose **New > Blueprint**.
3. Connect GitHub if it is not already connected.
4. Pick the `PolyCompile` repository.
5. Choose the `main` branch.
6. Confirm the detected `render.yaml`.
7. Apply the Blueprint.
8. Wait for the first build and deploy.
9. Open `https://YOUR-SERVICE.onrender.com/api/health`.

## Important Environment Variables

| Key | Default | Purpose |
| --- | --- | --- |
| `PORT` | `10000` | Render web service port |
| `RUNNER_PROVIDER` | `mock` | `mock` or `piston` |
| `PISTON_URL` | public demo URL | Piston-compatible execution endpoint |
| `ALLOWED_ORIGIN` | local dev URL | Production CORS origin |
| `MAX_UPLOAD_MB` | `8` | Per-file upload cap |
| `MAX_FILES` | `80` | Files per upload |
| `RUN_TIMEOUT_MS` | `5000` | API-side runner timeout |

## Switching on Execution

Do this only after you deploy or choose a trusted isolated runner:

```text
RUNNER_PROVIDER=piston
PISTON_URL=https://your-runner.example.com/api/v2/piston
ALLOWED_ORIGIN=https://your-polycompile.onrender.com
```

The public Piston demo endpoint is useful for experiments but should not be treated as production infrastructure.
