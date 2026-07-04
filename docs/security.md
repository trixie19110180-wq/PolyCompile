# Security Model

## Boundary

The Render web service is not the sandbox. It should never directly execute user-submitted code with local shell commands. The only supported production design is:

1. Web app receives files and validates metadata.
2. Web app sends a bounded job to an isolated runner.
3. Runner executes inside a short-lived container or microVM.
4. Runner returns stdout, stderr, exit code, and approved artifacts.
5. Runner workspace is destroyed.

## Required Runner Controls

- One job per isolated container or microVM.
- Non-root user.
- Read-only root filesystem.
- Temporary writable workspace with size limit.
- No Docker socket mounted into the container.
- CPU, memory, process, file, and wall-clock limits.
- Network disabled by default.
- Seccomp/AppArmor profile or equivalent.
- Output size caps for stdout, stderr, generated files, and frames.
- Kill switch for runaway jobs.
- Audit log with job ID, language, duration, and resource usage.

## API Protections in This Scaffold

- Request validation with Zod.
- Upload count and size limits.
- Project path normalization.
- Rejection of absolute paths and parent directory traversal.
- Preview iframe sandboxing.
- Helmet, compression, and CORS setup.
- Mock runner default so deploys cannot accidentally execute code.

## Abuse Cases to Plan For

- Fork bombs and process bombs.
- Infinite compilation or rendering loops.
- Large stdout/stderr floods.
- Network scanning from runner containers.
- Attempts to read cloud metadata endpoints.
- Archive bombs and oversized upload trees.
- Malicious HTML previews attempting top-level navigation.
- Compiler bugs triggered by hostile input.

## Resource Defaults

For a public hobby deploy:

- Max files: 80.
- Max upload: 8 MB.
- Run timeout: 5 seconds.
- Stdout/stderr cap: 256 KB each.
- No network from runners.
- No persistent runner filesystem.

Raise limits only after adding authentication, per-user quotas, and billing-aware rate limits.
