# Vizag Transit - Zero-Cost Cloud Deployment Guide

This guide details how to deploy **Vizag Transit** to the cloud with **$0/month recurring infrastructure costs** and **zero maintenance overhead**.

Vizag Transit is architected as a **self-contained, single-binary distribution** with an embedded React frontend, native SQLite storage (WAL mode), pre-packaged APSRTC GTFS static data, and an automated background GTFS-Realtime poller. It requires **zero external databases, zero cache servers, and zero third-party paid subscriptions**.

---

## Table of Contents
1. [Platform Comparison Matrix](#platform-comparison-matrix)
2. [Zero-Install Instant Public Preview (Cloudflare Quick Tunnels)](#1-instant-public-preview-cloudflare-quick-tunnels)
3. [Koyeb Nano (Recommended: 24/7 No-Sleep Free Tier)](#2-koyeb-nano-recommended-247-no-sleep-tier)
4. [Render Web Service (1-Click Blueprint)](#3-render-web-service-1-click-blueprint)
5. [Hugging Face Spaces (16 GB Free RAM Alternative)](#4-hugging-face-spaces-16-gb-free-ram)
6. [Fly.io Edge Deployment](#5-flyio-edge-deployment)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Performance & Resource Footprint](#performance--resource-footprint)
9. [Zero-Cost Uptime Keep-Alive Automation](#zero-cost-uptime-keep-alive-automation)

---

## Platform Comparison Matrix

Every blueprint in this repository is designed to fit 100% within the free tiers of reputable cloud providers:

| Platform | Cost | RAM | vCPU | Idle Sleep? | Cold Start Wakeup | Free Storage / FS | Custom Domain + Free SSL | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Koyeb Nano** | **$0/mo** | 512 MB | 0.1 vCPU | **Never (Always-On 24/7)** | 0s (Instant) | Ephemeral container | ✅ Yes | **Recommended for production public use without cold starts** |
| **Hugging Face Spaces** | **$0/mo** | **16 GB** | **2 vCPU** | Sleeps after 48h idle | ~8s | 50 GB free disk | Subdomain / Iframe | **Best for high memory, large GTFS datasets, and unlimited traffic** |
| **Fly.io** | **$0/mo** | 256 MB | 1 shared | Configurable auto-stop | ~300ms (Fastest) | 3 GB persistent volume | ✅ Yes | **Ultra-fast cold starts and global edge routing** |
| **Render Web Service** | **$0/mo** | 512 MB | 0.1 vCPU | Sleeps after 15m idle | ~30-50s | Ephemeral container | ✅ Yes | **Simplest 1-click GitOps deployment with Blueprint** |
| **Cloudflare Quick Tunnel** | **$0/mo** | Local | Local | When script stops | 0s | Local host | `*.trycloudflare.com` | **Zero-install instant sharing from your local machine** |

---

## 1. Instant Public Preview (Cloudflare Quick Tunnels)

Need to share your running local instance with a colleague, stakeholder, or mobile phone right now without creating accounts, configuring DNS, or setting up cloud billing?

Vizag Transit includes a turnkey script that provisions an encrypted, public HTTPS tunnel using Cloudflare's edge network:

```bash
# 1. Start your local server (if not already running)
cd backend && go run ./cmd/server
# Or using the dev script:
# ./scripts/dev.sh

# 2. In another terminal, run the instant tunnel script:
./scripts/tunnel.sh
```

### What this script does:
- Automatically detects your OS and architecture (`linux-amd64`, `linux-arm64`, `darwin-arm64`, etc.).
- Auto-downloads the standalone `cloudflared` binary into `~/.cache/vizag-transit/bin` if not already installed.
- Probes `http://localhost:8080/api/health` to confirm the local service is healthy.
- Exposes your service securely through an encrypted Cloudflare Quick Tunnel (`https://xxxx-xxxx.trycloudflare.com`).
- Prints the live public URL and API endpoints in your terminal.
- **Requires zero accounts, zero login, zero credit card, and zero recurring fees.**

To change the target port:
```bash
PORT=3000 ./scripts/tunnel.sh
```

---

## 2. Koyeb Nano (Recommended: 24/7 No-Sleep Tier)

Koyeb offers **1 free Nano instance (512 MB RAM, 0.1 vCPU) in Singapore (`sin`) or Frankfurt (`fra`) that runs 24/7 without sleeping on inactivity**. This makes Koyeb the premier choice for zero-maintenance hosting where users should never experience a 45-second cold start.

### Step-by-Step Deployment:

#### Option A: Koyeb Control Panel (2 Minutes)
1. Fork or push this repository to GitHub.
2. Sign in to [Koyeb](https://app.koyeb.com/) (free tier, no card required for initial setup).
3. Click **Create Service** -> select **GitHub**.
4. Select your `vizag-transit` repository.
5. In the builder settings:
   - **Builder**: `Dockerfile`
   - **Instance type**: `Nano` ($0/month)
   - **Regions**: `Singapore (sin)` (closest to Visakhapatnam / India)
   - **Ports**: Expose `8080` (HTTP) with public path `/`
   - **Health Check**: HTTP on `/api/health`
6. Click **Deploy**. Koyeb will build the multi-stage Dockerfile and issue a global SSL certificate on `https://<your-app>.koyeb.app`.

#### Option B: Koyeb CLI using `koyeb.yaml`
```bash
# Install Koyeb CLI
curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | sh

# Initialize and deploy using the repository's koyeb.yaml blueprint
koyeb service create --git github.com/<your-username>/vizag-transit \
  --git-branch main \
  --git-builder docker \
  --instance-type nano \
  --regions sin \
  --ports 8080:http \
  --routes /:8080 \
  --env PORT=8080 \
  --app vizag-transit
```

---

## 3. Render Web Service (1-Click Blueprint)

Render provides automated GitHub GitOps deployments. This repository includes a pre-configured `render.yaml` Blueprint specification.

### 1-Click Deployment:
1. Push this repository to your GitHub account.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **Blueprints** -> **New Blueprint Instance**.
4. Connect your `vizag-transit` repository.
5. Render detects `render.yaml` and sets up:
   - Service Name: `vizag-transit`
   - Runtime: `Docker`
   - Plan: `Free`
   - Region: `Singapore`
   - Health Check: `/api/health`
   - Dynamic Port Binding: `$PORT` (Render defaults to 10000)
6. Click **Apply**. Within 3 minutes, your live URL will be active at `https://vizag-transit.onrender.com`.

### Note on Render Free Tier Sleeping:
Render free web services spin down after 15 minutes of zero HTTP traffic. The first incoming visitor after sleep triggers a cold start (~30-45 seconds). To prevent sleeping, see [Zero-Cost Uptime Keep-Alive Automation](#zero-cost-uptime-keep-alive-automation).

---

## 4. Hugging Face Spaces (16 GB Free RAM)

Hugging Face Spaces provides an extraordinary free tier: **2 vCPUs and 16 GB of RAM** with 50 GB of disk space. This is ideal if you want zero memory constraints, high concurrency, and long uptime.

### Step-by-Step Deployment:
1. Log in to [Hugging Face](https://huggingface.co/) and click **New Space**.
2. Settings:
   - **Space Name**: `vizag-transit`
   - **License**: `MIT`
   - **SDK**: Select **Docker** -> **Blank**
   - **Hardware**: `CPU Basic · 2 vCPU · 16 GB RAM · Free`
3. Clone your Space repository locally or link it as a remote:
   ```bash
   git remote add space https://huggingface.co/spaces/<your-hf-username>/vizag-transit
   ```
4. Copy the Hugging Face metadata header from `deploy/huggingface/README.md` to the top of your repository's `README.md`:
   ```yaml
   ---
   title: Vizag Transit
   emoji: 🚌
   colorFrom: blue
   colorTo: indigo
   sdk: docker
   app_port: 8080
   pinned: false
   license: mit
   ---
   ```
5. Push to Hugging Face:
   ```bash
   git push space main
   ```
6. Hugging Face automatically compiles the Docker container and serves your application at `https://<your-hf-username>-vizag-transit.hf.space`.

---

## 5. Fly.io Edge Deployment

Fly.io runs applications as lightweight micro-VMs in regions worldwide, including Singapore (`sin`) and Chennai/Mumbai.

### Step-by-Step Deployment:
1. Install Fly CLI:
   ```bash
   # Linux / macOS
   curl -L https://fly.io/install.sh | sh
   ```
2. Log in to your Fly account:
   ```bash
   fly auth login
   ```
3. Initialize the app using the included `fly.toml`:
   ```bash
   # Launch using existing config
   fly launch --copy-config --name vizag-transit --region sin
   ```
4. Deploy the application:
   ```bash
   fly deploy
   ```
5. View status and health:
   ```bash
   fly status
   fly open
   ```

### Fly.io Free Allowance Features:
- Micro-VM auto-sleeps when inactive and wakes on HTTP traffic in **under 400 milliseconds**.
- Configured in `fly.toml`:
  - `auto_stop_machines = "stop"`
  - `auto_start_machines = true`
  - `min_machines_running = 0`

---

## Environment Variables Reference

All runtime parameters can be adjusted via environment variables without re-compiling the binary:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | HTTP listen port. Automatically bound by cloud hosts ($PORT on Render/Koyeb). |
| `DATA_DIR` | `data` | Directory where SQLite database and GTFS archive are stored. |
| `DB_PATH` | `data/vizag_transit.db` | Absolute or relative path to the SQLite database file. |
| `GTFS_ZIP_PATH` | `data/apsrtc.zip` | Path to APSRTC GTFS static archive (auto-downloaded if absent). |
| `GTFS_URL` | `https://raw.githubusercontent.com/.../apsrtc.zip` | Remote fallback URL if static GTFS zip is not present locally. |
| `VEHICLE_POSITIONS_URL`| `https://maps.reclaim.city/apsrtc/rt/vehicle_positions.pb` | Live GTFS-Realtime vehicle GPS coordinates protobuf feed. |
| `TRIP_UPDATES_URL` | `https://maps.reclaim.city/apsrtc/rt/trip_updates.pb` | Live GTFS-Realtime trip updates and delays protobuf feed. |
| `RT_POLL_SECONDS` | `12` | Polling frequency for real-time protobuf feeds (minimum 5s). |
| `STALE_THRESHOLD_SECONDS` | `300` | Number of seconds after which a vehicle's GPS ping is marked stale (5 min). |
| `MAX_VEHICLE_AGE_SECONDS`| `3600` | Inactivity duration after which a vehicle is pruned from live memory (1 hr). |

---

## Performance & Resource Footprint

Vizag Transit was engineered specifically for low-spec, zero-cost cloud compute:

- **Single Container / Single Process**: The Go HTTP server embeds the built React SPA using `embed.FS`, eliminating the need for Nginx or Node.js runtime.
- **Memory Consumption**:
  - Base startup / idle: **~35 MB RAM**
  - Active GTFS-RT polling + live SSE broadcasting: **~55 MB RAM**
  - High concurrency route planning queries: **< 90 MB RAM**
  *(Fits easily inside 256 MB or 512 MB free tier limits!)*
- **Binary & Image Footprint**:
  - Standalone compiled Go binary: ~18 MB
  - Final multi-stage Docker image: ~45 MB (compressed)
- **Database Engine**:
  - SQLite with WAL mode (`PRAGMA journal_mode = WAL`) and memory caching.
  - Read-heavy queries execute in **< 3ms**.
  - No background database daemon needed.

---

## Zero-Cost Uptime Keep-Alive Automation

If hosting on **Render** or **Fly.io** and you wish to keep the service permanently warm (preventing the 30-second cold start):

Set up a free pinging monitor that pings your `/api/health` endpoint once every 10–14 minutes:

### Option A: Free External Pingers ($0 forever)
- [UptimeRobot](https://uptimerobot.com/): Free 50 monitors at 5-minute intervals. Set HTTP monitor to `https://<your-app>/api/health`.
- [cron-job.org](https://cron-job.org/): Free web cron service. Ping `https://<your-app>/api/health` every 12 minutes.
- [Freshping](https://www.freshworks.com/website-monitoring/): Free 50 checks at 1-minute intervals.

### Option B: GitHub Actions Scheduled Workflow
Create `.github/workflows/keepalive.yml` in your repository:

```yaml
name: Keep Service Awake
on:
  schedule:
    # Run every 12 minutes past the hour
    - cron: '*/12 * * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Health Endpoint
        run: |
          curl -fsSL https://<your-app-domain>/api/health || exit 0
```

---

## Summary Checklist for Go-Live

- [x] Dockerfile compiles React frontend and Go backend into single binary
- [x] SQLite database pre-seeded with APSRTC GTFS data
- [x] Health check registered at `/api/health`
- [x] `PORT` dynamically read from environment variable
- [x] Deployment configs created:
  - `render.yaml` for 1-click Render deploy
  - `fly.toml` for Fly.io edge deploy
  - `koyeb.yaml` for Koyeb 24/7 no-sleep deploy
  - `deploy/huggingface/README.md` for 16GB Hugging Face Space
  - `scripts/tunnel.sh` for instant local-to-web sharing
