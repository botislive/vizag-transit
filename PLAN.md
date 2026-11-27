# Vizag Transit — Technical Implementation Plan & Milestone 1 Findings

## Milestone 1: Data Source Inspection

### Verified Sources
1. **Static GTFS**: `https://raw.githubusercontent.com/reclaimchennai/India_GTFS/main/andhra-pradesh/apsrtc.zip` (mirror: `https://maps.reclaim.city/gtfs/apsrtc.zip`, 21.3 MB zip, ~101 MB uncompressed).
   - Publisher: `reclaim.city` (`feed_version: 202611111411`, service `2026-11-01` to `2027-10-31`).
   - Statewide totals: 5,095 routes, 11,156 stops, 54,812 trips, 11,543 shapes.
   - Files: `agency.txt`, `calendar.txt`, `feed_info.txt`, `routes.txt`, `shapes.txt`, `stop_times.txt`, `stops.txt`, `trips.txt`.
2. **Live GTFS-Realtime**:
   - `https://maps.reclaim.city/apsrtc/rt/vehicle_positions.pb` (~995 KB protobuf, HTTP 200, updated ~every 10-15s).
   - `https://maps.reclaim.city/apsrtc/rt/trip_updates.pb` (~1.4 MB protobuf, HTTP 200).
   - Verified `6,250` live vehicles statewide (`5,007` on-trip, `4,878` trip updates).

### Visakhapatnam Filtering & Data Nuances
- **Bounding Box**: Visakhapatnam metro area (`lat: 17.50..18.00, lon: 82.95..83.50`, covering Anakapalle, Steel Plant, Gajuwaka, NAD, Simhachalam, Pendurthi, Maddilapalem, MVP, RK Beach, Madhurawada, Tagarapuvalasa, Bheemunipatnam, Atchutapuram).
  - Contains **521 stops** inside the metro bbox.
  - **312 routes** have `>=50%` (and `>=2`) of their stops inside the metro bbox (`244` City, `56` Intercity, `12` Neo2308 community routes), comprising `5,251` trips, `598` shapes, and `74,515` stop_times rows.
  - At inspection time, **555 live vehicles** were inside the Vizag metro bbox and **388** were assigned to Vizag routes.
- **Data Limitations Identified**:
  1. `trips.txt` has no `direction_id` column; reverse directions and variants are separate `route_id`s sharing the same `route_short_name` (e.g., `196` unique short names across `312` routes; `74` short names have multiple variants/directions).
  2. Some live vehicles inside the Vizag bbox have empty `trip_id`/`route_id` (deadheading/unassigned) or belong to long-distance intercity routes passing through Vizag. We store all 5,095 route headers so intercity buses in Vizag still show their route number/name, while clearly distinguishing Vizag local routes.
  3. `calendar.txt` has a single `daily` service (`20261101`–`20271031`).
  4. Static GTFS source licence is listed as "none stated by the source" by `reclaim.city`; we will credit APSRTC and `reclaim.city` / `India_GTFS` in the UI footer/about.
  5. Stale GPS timestamps exist in the live feed (e.g., vehicles parked at depots with timestamps >10 minutes old). We will explicitly classify freshness (`fresh` <= 120s, `aging` <= 300s, `stale` > 300s, and filter/flag invalid coordinates or timestamps > 30 minutes old).

## Architecture
- **Backend**: Single Go binary (`backend/cmd/server`) using `net/http` (Go 1.22+ routing), `modernc.org/sqlite` (WAL mode, indexed queries), `gtfs-realtime-bindings`, and SSE (`/api/live`) broadcasting only changed Vizag vehicles.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + MapLibre GL JS (OpenStreetMap / Carto vector/raster tiles) + Lucide icons. GeoJSON layers for stops and live vehicles (no per-marker React components).
