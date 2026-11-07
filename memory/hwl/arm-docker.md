---
name: hwl-arm-docker
description: Docker image is published multi-arch (amd64 + arm64) via native GitHub runners
type: decision
---

*(as of 2026-11-07)* User: "on hwl we now need a arm docker build".
- `.github/workflows/docker.yml`: matrix build on `ubuntu-latest` (amd64) + `ubuntu-24.04-arm` (arm64, free for
  public repos), push by digest, then a `merge` job makes the multi-arch `:VERSION` + `:latest` manifest.
- No QEMU on purpose: better-sqlite3 compiles from source on arm64.
- The Dockerfile already was arch-aware: Camoufox picked by TARGETARCH, yt-dlp is the arch-independent Python zipapp.
- Local: `make build-arm64`.
