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

# Vizag Transit - Real-Time Public Transit Tracker & Journey Planner

A modern, high-performance web platform and API for Visakhapatnam (APSRTC) public transit.

## Features
- 🗺️ **Live Vehicle Tracking**: Real-time GPS bus positions with directional heading and staleness detection.
- 🚏 **Stop & Route Catalogue**: Full browse and search for routes, platforms, and timetable schedules.
- 🧭 **Multi-Modal Journey Planner**: Multi-criteria trip routing with walking legs and transfer optimizations.
- ⚡ **Zero External Dependencies**: Single embedded Go binary serving React SPA frontend and REST/SSE APIs.
- 📡 **Automated GTFS-RT Polling**: Live vehicle positions and trip updates feed ingestion.

## Hugging Face Free Tier Specifications
- **Hardware**: 2 vCPU, 16 GB RAM (CPU Basic)
- **Persistent Disk**: 50 GB free storage
- **Cost**: $0 / month forever
- **Protocol**: HTTPS over standard port 8080
