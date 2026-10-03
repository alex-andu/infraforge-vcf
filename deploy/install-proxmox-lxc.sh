#!/usr/bin/env bash
# Run INSIDE a Debian 12 LXC (or VM) on Proxmox, from the project folder.
# Installs Docker if missing, builds the image and starts the site on port 8080 (override with INFRAFORGE_PORT).
set -euo pipefail
if ! command -v docker >/dev/null; then
  apt-get update && apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi
docker compose up -d --build
ip=$(hostname -I | awk '{print $1}')
echo "InfraForge VCF is running at http://${ip}:${INFRAFORGE_PORT:-8080}"
