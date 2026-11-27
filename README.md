# VizagTransit — Live APSRTC Bus Tracker

**Live App**: **[https://vizagtransit.duckdns.org](https://vizagtransit.duckdns.org)**

A local-first, real-time public transport tracker for **Visakhapatnam, Andhra Pradesh, India**, built with **Go + SQLite + SSE** on the backend and **React + TypeScript + Tailwind CSS + MapLibre GL JS** on the frontend.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/botislive/vizag-transit)
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/botislive/vizag-transit&branch=main&name=vizag-transit)

## Data Sources & Attribution

- **Static GTFS**: APSRTC statewide feed (`apsrtc.zip`) from [`reclaimchennai/India_GTFS`](https://github.com/reclaimchennai/India_GTFS) (mirror: `https://maps.reclaim.city/gtfs/apsrtc.zip`).
- **Live GTFS-Realtime**:
  - Vehicle Positions: `https://maps.reclaim.city/apsrtc/rt/vehicle_positions.pb`
  - Trip Updates: `https://maps.reclaim.city/apsrtc/rt/trip_updates.pb`
- **Map Tiles**: High-performance OpenStreetMap vector tiles via OpenFreeMap (`positron` & `dark` styles, completely free, zero API keys, zero watermarks) with automatic fallback to standard OpenStreetMap raster tiles.

On first startup, the backend automatically downloads `apsrtc.zip` (if not already cached in `backend/data/apsrtc.zip`), filters it to the Visakhapatnam metropolitan area (`lat: 17.50..18.00, lon: 82.95..83.50`), and imports **312 Vizag routes**, **521 Vizag stops**, **5,251 trips**, and **74,515 stop times** into a local SQLite database (`backend/data/vizag_transit.db`) in ~3.3 seconds.

## Quick Start (Linux)

### Prerequisites
- Go 1.24+
- Node.js 20+ and npm

### 1. Install frontend dependencies
```bash
cd frontend && npm install
```

### 2. Start both backend & frontend with one command
```bash
./scripts/dev.sh
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`

## Architecture

```text
vizag-transit/
  backend/
    cmd/server/main.go          # HTTP server & lifecycle
    internal/config/config.go   # Env config & Vizag bounding box
    internal/db/db.go           # SQLite schema & indexes (WAL mode)
    internal/gtfs/importer.go   # Static GTFS download, Vizag filter, bulk import
    internal/rt/poller.go       # GTFS-RT protobuf decoder, freshness validation, SSE
    internal/api/handlers.go    # REST endpoints & SSE stream
    internal/api/journey.go     # Direct & 1-transfer journey planner
  frontend/
    src/components/TransitMap.tsx    # MapLibre GL JS GeoJSON layers (vehicles, stops, routes)
    src/components/SearchBar.tsx     # Debounced instant search
    src/components/ExplorePanel.tsx  # Live stats, journey planner, nearby stops
    src/components/RoutesPanel.tsx   # Route explorer with category filter
    src/components/StopsPanel.tsx    # Stop explorer
    src/components/DetailDrawer.tsx  # Vehicle, Route, and Stop inspector
    src/hooks/useLiveVehicles.ts     # SSE client with incremental delta updates
  scripts/dev.sh                     # Single-command local dev launcher
```

## API Endpoints

- `GET /api/health` — GTFS import metadata & live feed health
- `GET /api/routes?q=&category=&limit=&offset=` — Paginated Vizag routes
- `GET /api/routes/{id}` — Route details, ordered stops, GeoJSON shape, direction variants, active buses
- `GET /api/stops?q=&limit=&offset=` — Vizag bus stops
- `GET /api/stops/{id}` — Stop details, serving routes, live TripUpdate arrivals, and scheduled timetable
- `GET /api/vehicles` — Current validated Vizag vehicles
- `GET /api/vehicles/{id}` — Single vehicle details
- `GET /api/search?q=` — Unified search across routes, stops, and live buses
- `GET /api/nearby-stops?lat=&lon=&radius=&limit=` — Spatial nearby stops query
- `GET /api/journey?from=&to=` — Direct & single-transfer route planner
- `GET /api/live` — Server-Sent Events (SSE) stream of incremental vehicle deltas

## Data Accuracy Guarantees

- **Live vs. Scheduled**: Live arrivals come strictly from fresh GTFS-RT `TripUpdates` paired with non-stale vehicle GPS (`<= 300s`). Static timetable departures are always labeled **Scheduled Timetable (Static GTFS)**.
- **Freshness Classification**: Vehicles are classified as `fresh` (`<= 120s`), `aging` (`121–300s`), or `stale` (`> 300s`), and visually distinguished on both the map and detail panels.
- **No Fake Data**: If a live feed is unreachable, the UI displays an offline indicator rather than fabricating bus positions.

## Running Tests

```bash
cd backend && go test ./...
cd frontend && npm run build
```

## Production Single-Binary & Docker Build

### 1. Build Unified Single-Binary Distribution
Build both the frontend and Go backend into a single self-contained binary containing all static assets, SPA routes, and APIs:
```bash
./scripts/build.sh
```
Run the compiled binary:
```bash
./bin/vizag-transit
```

### 2. Multi-Stage Docker Container
Build the production Docker container:
```bash
docker build -t vizag-transit .
docker run -p 8080:8080 -e PORT=8080 vizag-transit
```
The Docker image features:
- Multi-stage build (Node 20 Alpine frontend builder -> Go 1.24 Alpine builder -> Alpine 3.21 runner)
- Bundles cached GTFS static bundle (`apsrtc.zip`) for instant startup without runtime network downloads
- Non-root unprivileged container user (`transit`, UID 10001)
- Automatic dynamic `$PORT` environment binding (Render/Fly/Koyeb/Hugging Face Spaces compatible)
- Built-in container healthcheck against `/api/health`

## Zero-Cost Cloud Deployment ($0/month)

Vizag Transit is designed to run 24/7 on free-tier cloud infrastructure with zero recurring costs. See [`DEPLOYMENT.md`](file:///home/thh/.gemini/antigravity/scratch/vizag-transit/DEPLOYMENT.md) for full blueprints, comparisons, and 1-click guides:

- **Instant Zero-Install Public Tunnel**: Run `./scripts/tunnel.sh` for an instant public HTTPS preview via Cloudflare Quick Tunnels (no account, no fees).
- **Koyeb Nano (Recommended)**: 24/7 always-on service without idle sleep via [`koyeb.yaml`](file:///home/thh/.gemini/antigravity/scratch/vizag-transit/koyeb.yaml).
- **Render Web Service**: 1-click Blueprint deployment via [`render.yaml`](file:///home/thh/.gemini/antigravity/scratch/vizag-transit/render.yaml).
- **Hugging Face Spaces**: 16 GB free RAM & 2 vCPUs via [`deploy/huggingface/README.md`](file:///home/thh/.gemini/antigravity/scratch/vizag-transit/deploy/huggingface/README.md).
- **Fly.io**: Fast global edge deployment via [`fly.toml`](file:///home/thh/.gemini/antigravity/scratch/vizag-transit/fly.toml).

