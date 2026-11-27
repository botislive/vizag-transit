package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"vizag-transit/internal/gtfs"
	"vizag-transit/internal/rt"
	"vizag-transit/internal/web"
)

// Server holds dependencies for all HTTP API handlers.
type Server struct {
	db          *sql.DB
	poller      *rt.Poller
	reportMu    sync.Mutex
	reportRate  map[string][]int64
}

// NewServer creates an API Server and registers routes on a ServeMux.
func NewServer(conn *sql.DB, poller *rt.Poller) http.Handler {
	s := &Server{
		db:         conn,
		poller:     poller,
		reportRate: make(map[string][]int64),
	}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/catalogue", s.handleCatalogue)
	mux.HandleFunc("GET /api/routes", s.handleListRoutes)
	mux.HandleFunc("GET /api/routes/{id}", s.handleGetRoute)
	mux.HandleFunc("GET /api/stops", s.handleListStops)
	mux.HandleFunc("GET /api/stops/{id}", s.handleGetStop)
	mux.HandleFunc("GET /api/vehicles", s.handleListVehicles)
	mux.HandleFunc("GET /api/vehicles/{id}", s.handleGetVehicle)
	mux.HandleFunc("GET /api/search", s.handleSearch)
	mux.HandleFunc("GET /api/nearby-stops", s.handleNearbyStops)
	mux.HandleFunc("GET /api/journey", s.handleJourney)
	mux.HandleFunc("GET /api/live", s.handleLiveSSE)
	mux.HandleFunc("POST /api/reports", s.handleCreateReport)

	// SEO discovery endpoints
	mux.HandleFunc("GET /robots.txt", s.handleRobotsTxt)
	mux.HandleFunc("GET /sitemap.xml", s.handleSitemapXML)

	// Explicit 404 for unmatched /api/ endpoints to avoid falling through to the SPA
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})

	// Mount embedded frontend SPA handler for all non-API routes
	mux.Handle("/", web.Handler())

	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		// Consolidate search engine indexing exclusively on vizagtransit.duckdns.org
		if strings.Contains(strings.ToLower(r.Host), "onrender.com") && !strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("X-Robots-Tag", "noindex, nofollow")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleRobotsTxt(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write([]byte("User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://vizagtransit.duckdns.org/sitemap.xml\n"))
}

func (s *Server) handleSitemapXML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")

	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	b.WriteString("  <url><loc>https://vizagtransit.duckdns.org/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>\n")

	rows, err := s.db.QueryContext(r.Context(), `SELECT primary_route_id FROM route_catalogue ORDER BY total_trips DESC`)
	if err == nil {
		for rows.Next() {
			var rid string
			if err := rows.Scan(&rid); err == nil && rid != "" {
				b.WriteString(fmt.Sprintf("  <url><loc>https://vizagtransit.duckdns.org/routes/%s</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n", rid))
			}
		}
		rows.Close()
	}

	srows, err := s.db.QueryContext(r.Context(), `
		SELECT rs.stop_id FROM route_stops rs
		GROUP BY rs.stop_id
		ORDER BY COUNT(*) DESC
		LIMIT 150`)
	if err == nil {
		for srows.Next() {
			var sid string
			if err := srows.Scan(&sid); err == nil && sid != "" {
				b.WriteString(fmt.Sprintf("  <url><loc>https://vizagtransit.duckdns.org/stops/%s</loc><changefreq>daily</changefreq><priority>0.6</priority></url>\n", sid))
			}
		}
		srows.Close()
	}

	b.WriteString("</urlset>\n")
	_, _ = w.Write([]byte(b.String()))
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	meta := make(map[string]string)
	rows, err := s.db.QueryContext(r.Context(), `SELECT key, value FROM meta`)
	if err == nil {
		for rows.Next() {
			var k, v string
			if err := rows.Scan(&k, &v); err == nil {
				meta[k] = v
			}
		}
		rows.Close()
	}

	_, feedStatus := s.poller.Snapshot()
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"gtfs":   meta,
		"feed":   feedStatus,
	})
}

// CatalogueEntry represents a verified passenger-facing route grouping (e.g. "28K", "TV03").
type CatalogueEntry struct {
	RouteNumber          string `json:"routeNumber"`
	PrimaryRouteID       string `json:"primaryRouteId"`
	PrimaryLongName      string `json:"primaryLongName"`
	Classification       string `json:"classification"`
	Confidence           string `json:"confidence"`
	ClassificationReason string `json:"classificationReason"`
	VariantCount         int    `json:"variantCount"`
	TotalTrips           int    `json:"totalTrips"`
	TotalStops           int    `json:"totalStops"`
	Origin               string `json:"origin"`
	Destination          string `json:"destination"`
	ActiveVehicles       int    `json:"activeVehicles"`
}

func (s *Server) handleCatalogue(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	classFilter := strings.TrimSpace(r.URL.Query().Get("classification"))
	limit := parseLimit(r.URL.Query().Get("limit"), 120, 500)
	offset := parseOffset(r.URL.Query().Get("offset"))

	vehicles, _ := s.poller.Snapshot()
	activeByShort := make(map[string]int)
	for _, v := range vehicles {
		if v.RouteShortName != "" && !v.IsStale {
			activeByShort[v.RouteShortName]++
		}
	}

	where := []string{"1=1"}
	var args []any

	if classFilter != "" && classFilter != "all" {
		where = append(where, "classification = ?")
		args = append(args, classFilter)
	}

	if q != "" {
		like := "%" + q + "%"
		where = append(where, "(route_number LIKE ? OR primary_long_name LIKE ? OR origin LIKE ? OR destination LIKE ?)")
		args = append(args, like, like, like, like)
	}

	whereSQL := strings.Join(where, " AND ")
	var total int
	if err := s.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM route_catalogue WHERE "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	queryArgs := append(append([]any{}, args...), limit, offset)
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT route_number, primary_route_id, primary_long_name, classification, confidence, classification_reason, variant_count, total_trips, total_stops, origin, destination
		FROM route_catalogue
		WHERE `+whereSQL+`
		ORDER BY total_trips DESC, route_number ASC
		LIMIT ? OFFSET ?
	`, queryArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	list := make([]CatalogueEntry, 0)
	for rows.Next() {
		var e CatalogueEntry
		if err := rows.Scan(
			&e.RouteNumber, &e.PrimaryRouteID, &e.PrimaryLongName,
			&e.Classification, &e.Confidence, &e.ClassificationReason,
			&e.VariantCount, &e.TotalTrips, &e.TotalStops,
			&e.Origin, &e.Destination,
		); err == nil {
			e.ActiveVehicles = activeByShort[e.RouteNumber]
			list = append(list, e)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"catalogue": list,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

type routeSummary struct {
	RouteID        string `json:"routeId"`
	ShortName      string `json:"shortName"`
	LongName       string `json:"longName"`
	Category       string `json:"category"`
	Classification string `json:"classification"`
	Confidence     string `json:"confidence"`
	Origin         string `json:"origin"`
	Destination    string `json:"destination"`
	RouteDesc      string `json:"routeDesc"`
	StopCount      int    `json:"stopCount"`
	TripCount      int    `json:"tripCount"`
	ActiveVehicles int    `json:"activeVehicles"`
}

func (s *Server) handleListRoutes(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	cls := strings.TrimSpace(r.URL.Query().Get("classification"))
	cat := strings.TrimSpace(r.URL.Query().Get("category"))
	limit := parseLimit(r.URL.Query().Get("limit"), 100, 500)
	offset := parseOffset(r.URL.Query().Get("offset"))

	vehicles, _ := s.poller.Snapshot()
	activeByRoute := make(map[string]int)
	for _, v := range vehicles {
		if v.RouteID != "" && !v.IsStale {
			activeByRoute[v.RouteID]++
		}
	}

	where := []string{"is_vizag = 1"}
	var args []any
	if cls != "" && cls != "all" {
		where = append(where, "classification = ?")
		args = append(args, cls)
	}
	if cat != "" && cat != "All" {
		where = append(where, "category = ?")
		args = append(args, cat)
	}
	if q != "" {
		where = append(where, "(short_name LIKE ? OR long_name LIKE ? OR route_id LIKE ? OR origin LIKE ? OR destination LIKE ?)")
		like := "%" + q + "%"
		args = append(args, like, like, like, like, like)
	}

	whereSQL := strings.Join(where, " AND ")
	var total int
	if err := s.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM routes WHERE "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	queryArgs := append(append([]any{}, args...), limit, offset)
	rows, err := s.db.QueryContext(r.Context(),
		`SELECT route_id, short_name, long_name, category, classification, confidence, origin, destination, route_desc, stop_count, trip_count
		 FROM routes WHERE `+whereSQL+`
		 ORDER BY trip_count DESC, short_name ASC
		 LIMIT ? OFFSET ?`, queryArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	list := make([]routeSummary, 0)
	for rows.Next() {
		var item routeSummary
		if err := rows.Scan(
			&item.RouteID, &item.ShortName, &item.LongName, &item.Category,
			&item.Classification, &item.Confidence, &item.Origin, &item.Destination,
			&item.RouteDesc, &item.StopCount, &item.TripCount,
		); err == nil {
			item.ActiveVehicles = activeByRoute[item.RouteID]
			list = append(list, item)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"routes": list,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (s *Server) handleGetRoute(w http.ResponseWriter, r *http.Request) {
	param := strings.TrimSpace(r.PathValue("id"))

	// Resolve route: could be exact route_id OR passenger-facing route_number
	var item routeSummary
	var isVizag int
	err := s.db.QueryRowContext(r.Context(),
		`SELECT route_id, short_name, long_name, category, classification, confidence, origin, destination, route_desc, stop_count, trip_count, is_vizag
		 FROM routes WHERE route_id = ?`, param).
		Scan(
			&item.RouteID, &item.ShortName, &item.LongName, &item.Category,
			&item.Classification, &item.Confidence, &item.Origin, &item.Destination,
			&item.RouteDesc, &item.StopCount, &item.TripCount, &isVizag,
		)

	if err == sql.ErrNoRows {
		// Try matching by route_short_name / route_number case-insensitively
		err = s.db.QueryRowContext(r.Context(),
			`SELECT route_id, short_name, long_name, category, classification, confidence, origin, destination, route_desc, stop_count, trip_count, is_vizag
			 FROM routes WHERE (short_name = ? COLLATE NOCASE OR route_id = ?) AND is_vizag = 1
			 ORDER BY trip_count DESC LIMIT 1`, param, param).
			Scan(
				&item.RouteID, &item.ShortName, &item.LongName, &item.Category,
				&item.Classification, &item.Confidence, &item.Origin, &item.Destination,
				&item.RouteDesc, &item.StopCount, &item.TripCount, &isVizag,
			)
	}

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "route not found in catalogue")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	// 1. Ordered stops for canonical route variant
	srows, err := s.db.QueryContext(r.Context(),
		`SELECT rs.stop_sequence, st.stop_id, st.name, st.lat, st.lon
		 FROM route_stops rs
		 JOIN stops st ON st.stop_id = rs.stop_id
		 WHERE rs.route_id = ?
		 ORDER BY rs.stop_sequence ASC`, item.RouteID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	type routeStop struct {
		Sequence int     `json:"sequence"`
		StopID   string  `json:"stopId"`
		Name     string  `json:"name"`
		Lat      float64 `json:"lat"`
		Lon      float64 `json:"lon"`
	}
	stops := make([]routeStop, 0)
	for srows.Next() {
		var rs routeStop
		if err := srows.Scan(&rs.Sequence, &rs.StopID, &rs.Name, &rs.Lat, &rs.Lon); err == nil {
			stops = append(stops, rs)
		}
	}
	srows.Close()

	// 2. Shape coordinates
	var coordsRaw string
	coords := make([][2]float64, 0)
	if err := s.db.QueryRowContext(r.Context(), `SELECT coords_json FROM route_shapes WHERE route_id = ?`, item.RouteID).Scan(&coordsRaw); err == nil {
		_ = json.Unmarshal([]byte(coordsRaw), &coords)
		if coords == nil {
			coords = make([][2]float64, 0)
		}
	}

	// 3. Direction / variant alternatives sharing the same passenger route number
	type variant struct {
		RouteID     string `json:"routeId"`
		LongName    string `json:"longName"`
		Origin      string `json:"origin"`
		Destination string `json:"destination"`
		StopCount   int    `json:"stopCount"`
		TripCount   int    `json:"tripCount"`
	}
	variants := make([]variant, 0)
	variantIDs := make(map[string]bool)
	variantIDs[item.RouteID] = true

	vrows, err := s.db.QueryContext(r.Context(),
		`SELECT route_id, long_name, origin, destination, stop_count, trip_count FROM routes
		 WHERE is_vizag = 1 AND short_name = ? ORDER BY trip_count DESC`, item.ShortName)
	if err == nil {
		for vrows.Next() {
			var v variant
			if err := vrows.Scan(&v.RouteID, &v.LongName, &v.Origin, &v.Destination, &v.StopCount, &v.TripCount); err == nil {
				variants = append(variants, v)
				variantIDs[v.RouteID] = true
			}
		}
		vrows.Close()
	}

	// 4. Associated Trips
	type tripSummary struct {
		TripID    string `json:"tripId"`
		RouteID   string `json:"routeId"`
		ShortName string `json:"shortName"`
		Headsign  string `json:"headsign"`
		TripType  string `json:"tripType"`
	}
	trips := make([]tripSummary, 0)
	trows, err := s.db.QueryContext(r.Context(),
		`SELECT trip_id, route_id, short_name, headsign, trip_type FROM trips WHERE route_id = ? LIMIT 60`, item.RouteID)
	if err == nil {
		for trows.Next() {
			var ts tripSummary
			if err := trows.Scan(&ts.TripID, &ts.RouteID, &ts.ShortName, &ts.Headsign, &ts.TripType); err == nil {
				trips = append(trips, ts)
			}
		}
		trows.Close()
	}

	// 5. Active vehicles operating on this route or its variants
	allVehicles, _ := s.poller.Snapshot()
	routeVehicles := make([]rt.Vehicle, 0)
	for _, v := range allVehicles {
		if variantIDs[v.RouteID] || v.RouteShortName == item.ShortName {
			routeVehicles = append(routeVehicles, v)
		}
	}
	item.ActiveVehicles = len(routeVehicles)

	writeJSON(w, http.StatusOK, map[string]any{
		"route":      item,
		"stops":      stops,
		"shape":      coords,
		"variants":   variants,
		"trips":      trips,
		"vehicles":   routeVehicles,
		"isVizag":    isVizag == 1,
	})
}

type stopItem struct {
	StopID  string  `json:"stopId"`
	Name    string  `json:"name"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`
	InVizag bool    `json:"inVizag"`
}

func (s *Server) handleListStops(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	limit := parseLimit(r.URL.Query().Get("limit"), 600, 1000)
	offset := parseOffset(r.URL.Query().Get("offset"))

	where := []string{"in_vizag = 1"}
	var args []any
	if q != "" {
		where = append(where, "(name LIKE ? OR stop_id LIKE ?)")
		like := "%" + q + "%"
		args = append(args, like, like)
	}
	whereSQL := strings.Join(where, " AND ")

	var total int
	if err := s.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM stops WHERE "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	queryArgs := append(append([]any{}, args...), limit, offset)
	rows, err := s.db.QueryContext(r.Context(),
		`SELECT stop_id, name, lat, lon, in_vizag FROM stops WHERE `+whereSQL+` ORDER BY name ASC LIMIT ? OFFSET ?`, queryArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	list := make([]stopItem, 0)
	for rows.Next() {
		var st stopItem
		var iv int
		if err := rows.Scan(&st.StopID, &st.Name, &st.Lat, &st.Lon, &iv); err == nil {
			st.InVizag = iv == 1
			list = append(list, st)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"stops":  list,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (s *Server) handleGetStop(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var st stopItem
	var iv int
	err := s.db.QueryRowContext(r.Context(), `SELECT stop_id, name, lat, lon, in_vizag FROM stops WHERE stop_id = ?`, id).
		Scan(&st.StopID, &st.Name, &st.Lat, &st.Lon, &iv)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "stop not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	st.InVizag = iv == 1

	// Routes serving this stop
	rrows, err := s.db.QueryContext(r.Context(),
		`SELECT DISTINCT r.route_id, r.short_name, r.long_name, r.category
		 FROM route_stops rs
		 JOIN routes r ON r.route_id = rs.route_id
		 WHERE rs.stop_id = ?
		 ORDER BY r.short_name ASC`, id)
	type stopRoute struct {
		RouteID   string `json:"routeId"`
		ShortName string `json:"shortName"`
		LongName  string `json:"longName"`
		Category  string `json:"category"`
	}
	routes := make([]stopRoute, 0)
	if err == nil {
		for rrows.Next() {
			var sr stopRoute
			if err := rrows.Scan(&sr.RouteID, &sr.ShortName, &sr.LongName, &sr.Category); err == nil {
				routes = append(routes, sr)
			}
		}
		rrows.Close()
	}

	live := s.poller.GetStopUpcoming(id)
	if live == nil {
		live = make([]rt.StopArrival, 0)
	}
	_, feedStatus := s.poller.Snapshot()

	ist := time.FixedZone("IST", 5*3600+30*60)
	nowIST := time.Now().In(ist)
	nowSec := nowIST.Hour()*3600 + nowIST.Minute()*60 + nowIST.Second()

	schedRows, err := s.db.QueryContext(r.Context(),
		`SELECT st.trip_id, st.departure_sec, st.departure_str, t.route_id, r.short_name, r.long_name, t.headsign
		 FROM stop_times st
		 JOIN trips t ON t.trip_id = st.trip_id
		 JOIN routes r ON r.route_id = t.route_id
		 WHERE st.stop_id = ? AND st.departure_sec >= ?
		 ORDER BY st.departure_sec ASC
		 LIMIT 12`, id, nowSec)
	type schedDep struct {
		TripID        string `json:"tripId"`
		RouteID       string `json:"routeId"`
		ShortName     string `json:"shortName"`
		LongName      string `json:"longName"`
		Headsign      string `json:"headsign"`
		DepartureTime string `json:"departureTime"`
		MinutesAway   int    `json:"minutesAway"`
	}
	scheduled := make([]schedDep, 0)
	if err == nil {
		for schedRows.Next() {
			var sd schedDep
			var depSec int
			if err := schedRows.Scan(&sd.TripID, &depSec, &sd.DepartureTime, &sd.RouteID, &sd.ShortName, &sd.LongName, &sd.Headsign); err == nil {
				sd.MinutesAway = (depSec - nowSec) / 60
				sd.DepartureTime = gtfs.FormatSeconds(depSec)
				scheduled = append(scheduled, sd)
			}
		}
		schedRows.Close()
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"stop":         st,
		"routes":       routes,
		"liveArrivals": live,
		"scheduled":    scheduled,
		"feedStatus":   feedStatus,
	})
}

func (s *Server) handleListVehicles(w http.ResponseWriter, r *http.Request) {
	vehicles, status := s.poller.Snapshot()
	routeFilter := strings.TrimSpace(r.URL.Query().Get("routeId"))
	shortNameFilter := strings.TrimSpace(r.URL.Query().Get("routeNumber"))

	if routeFilter != "" || shortNameFilter != "" {
		filtered := make([]rt.Vehicle, 0)
		for _, v := range vehicles {
			if routeFilter != "" && v.RouteID == routeFilter {
				filtered = append(filtered, v)
			} else if shortNameFilter != "" && v.RouteShortName == shortNameFilter {
				filtered = append(filtered, v)
			}
		}
		vehicles = filtered
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"vehicles": vehicles,
		"status":   status,
	})
}

type vehicleStopProgress struct {
	Sequence      int     `json:"sequence"`
	StopID        string  `json:"stopId"`
	Name          string  `json:"name"`
	Lat           float64 `json:"lat"`
	Lon           float64 `json:"lon"`
	ScheduledTime string  `json:"scheduledTime,omitempty"`
	Status        string  `json:"status"` // "completed" | "next" | "upcoming" | "unknown"
}

func (s *Server) handleGetVehicle(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	v, ok := s.poller.GetVehicle(id)
	if !ok {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}

	stops := make([]vehicleStopProgress, 0)
	if v.TripID != "" {
		rows, err := s.db.QueryContext(r.Context(), `
			SELECT st.stop_sequence, s.stop_id, s.name, s.lat, s.lon, st.departure_sec
			FROM stop_times st
			JOIN stops s ON s.stop_id = st.stop_id
			WHERE st.trip_id = ?
			ORDER BY st.stop_sequence ASC`, v.TripID)
		if err == nil {
			for rows.Next() {
				var sp vehicleStopProgress
				var depSec int
				if err := rows.Scan(&sp.Sequence, &sp.StopID, &sp.Name, &sp.Lat, &sp.Lon, &depSec); err == nil {
					if depSec > 0 {
						sp.ScheduledTime = gtfs.FormatSeconds(depSec)
					}
					sp.Status = "unknown"
					stops = append(stops, sp)
				}
			}
			rows.Close()
		}
	}

	// Fallback to canonical route_stops if trip stop_times weren't found
	if len(stops) == 0 && v.RouteID != "" {
		rows, err := s.db.QueryContext(r.Context(), `
			SELECT rs.stop_sequence, s.stop_id, s.name, s.lat, s.lon
			FROM route_stops rs
			JOIN stops s ON s.stop_id = rs.stop_id
			WHERE rs.route_id = ?
			ORDER BY rs.stop_sequence ASC`, v.RouteID)
		if err == nil {
			for rows.Next() {
				var sp vehicleStopProgress
				if err := rows.Scan(&sp.Sequence, &sp.StopID, &sp.Name, &sp.Lat, &sp.Lon); err == nil {
					sp.Status = "unknown"
					stops = append(stops, sp)
				}
			}
			rows.Close()
		}
	}

	// Determine completed / next / upcoming using TripUpdate + GPS segment snapping (fixes lag)
	nextIdx := -1
	if v.NextStopSeq > 0 {
		for i, sp := range stops {
			if sp.Sequence == v.NextStopSeq {
				nextIdx = i
				break
			}
		}
	}
	if nextIdx == -1 && v.NextStopID != "" {
		for i, sp := range stops {
			if sp.StopID == v.NextStopID {
				nextIdx = i
				break
			}
		}
	}

	// Only snap GPS onto ordered stops when we know the exact trip direction (v.TripID != "")
	if v.TripID != "" && len(stops) >= 2 && gtfs.ValidCoord(v.Lat, v.Lon) {
		gpsNextIdx := inferNextStopIdxFromGPS(v.Lat, v.Lon, stops)
		if gpsNextIdx >= 0 && (nextIdx == -1 || gpsNextIdx > nextIdx) {
			nextIdx = gpsNextIdx
		}
	}

	if nextIdx >= 0 && nextIdx < len(stops) {
		for i := range stops {
			if i < nextIdx {
				stops[i].Status = "completed"
			} else if i == nextIdx {
				stops[i].Status = "next"
			} else {
				stops[i].Status = "upcoming"
			}
		}
		// Keep vehicle.nextStopName synced with the non-lagging next stop
		v.NextStopID = stops[nextIdx].StopID
		v.NextStopName = stops[nextIdx].Name
		v.NextStopSeq = stops[nextIdx].Sequence
	}

	origin := ""
	destination := ""
	if len(stops) > 0 {
		origin = stops[0].Name
		destination = stops[len(stops)-1].Name
	}

	// Resolve exact trip shape if available, falling back to canonical route shape
	var shape [][2]float64
	var shapeRaw string
	if v.TripID != "" {
		_ = s.db.QueryRowContext(r.Context(), `
			SELECT sh.coords_json
			FROM trips t
			JOIN shapes sh ON sh.shape_id = t.shape_id
			WHERE t.trip_id = ?`, v.TripID).Scan(&shapeRaw)
	}
	if shapeRaw == "" && v.RouteID != "" {
		_ = s.db.QueryRowContext(r.Context(), `SELECT coords_json FROM route_shapes WHERE route_id = ?`, v.RouteID).Scan(&shapeRaw)
	}
	if shapeRaw != "" {
		_ = json.Unmarshal([]byte(shapeRaw), &shape)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"vehicle":     v,
		"stops":       stops,
		"shape":       shape,
		"origin":      origin,
		"destination": destination,
	})
}

// inferNextStopIdxFromGPS projects the vehicle's GPS coordinates onto consecutive trip stop segments
// to detect when the bus has already passed a stop even if TripUpdate lags behind.
func inferNextStopIdxFromGPS(lat, lon float64, stops []vehicleStopProgress) int {
	if len(stops) < 2 {
		return -1
	}
	const metersPerLat = 111132.0
	metersPerLon := 111320.0 * math.Cos(lat*math.Pi/180.0)

	bestDist := math.MaxFloat64
	bestSeg := -1
	bestT := 0.0

	for i := 0; i < len(stops)-1; i++ {
		ax := (stops[i].Lon - lon) * metersPerLon
		ay := (stops[i].Lat - lat) * metersPerLat
		bx := (stops[i+1].Lon - lon) * metersPerLon
		by := (stops[i+1].Lat - lat) * metersPerLat

		dx := bx - ax
		dy := by - ay
		lenSq := dx*dx + dy*dy
		t := 0.0
		if lenSq > 1.0 {
			// Project origin (0,0) onto segment A->B: t = -dot(A, B-A) / |B-A|^2
			t = -(ax*dx + ay*dy) / lenSq
			if t < 0 {
				t = 0
			} else if t > 1 {
				t = 1
			}
		}
		px := ax + t*dx
		py := ay + t*dy
		dist := math.Hypot(px, py)
		if dist < bestDist {
			bestDist = dist
			bestSeg = i
			bestT = t
		}
	}

	// Only accept if bus is within 750m of the route corridor
	if bestSeg < 0 || bestDist > 750 {
		return -1
	}
	// If the bus has moved past 15% of segment i -> i+1, stop i is completed and i+1 is next
	if bestT > 0.15 {
		return bestSeg + 1
	}
	return bestSeg
}

// resolveSearchQuery maps verified Vizag landmarks & Telugu place names to GTFS search terms.
func resolveSearchQuery(raw string) string {
	q := strings.TrimSpace(raw)
	ql := strings.ToLower(q)
	aliases := map[string]string{
		"విశాఖపట్నం":        "Visakhapatnam",
		"వైజాగ్":             "Visakhapatnam",
		"ఆర్టీసీ కాంప్లెక్స్": "Rtc Complex",
		"సింహాచలం":          "Simhachalam",
		"గాజువాక":           "Gajuwaka",
		"మద్దిలపాలెం":        "Maddilapalem",
		"అనకాపల్లి":          "Anakapalli",
		"భీమిలి":            "Bheemunipatnam",
		"భీమునిపట్నం":       "Bheemunipatnam",
		"ఆర్కే బీచ్":         "R.K.Beach",
		"ఎయిర్పోర్ట్":        "Airport",
		"విమానాశ్రయం":        "Airport",
		"రైల్వే స్టేషన్":     "Railway Station",
		"జగదాంబ":            "Jagadamba",
		"గోపాలపట్నం":         "Gopalapatnam",
		"పెందుర్తి":           "Pendurthi",
		"కొత్తవలస":          "Kottavalasa",
		"కూర్మన్నపాలెం":      "Kurmannapalem",
		"రుషికొండ":           "Rushikonda",
		"యలమంచిలి":          "Yelamanchili",
		"bheemili":          "Bheemunipatnam",
		"rk beach":          "R.K.Beach",
		"r k beach":         "R.K.Beach",
		"submarine":         "R.K.Beach",
		"ins kurusura":      "R.K.Beach",
		"steel plant":       "Kurmannapalem",
		"ukku nagaram":      "Kurmannapalem",
		"pm palem":          "Pothinamallayyapalem",
		"mvp":               "Mvp Colony",
		"nad":               "Nad X Road",
		"vsp airport":       "Airport",
		"elamanchili":       "Yelamanchili",
	}
	for k, v := range aliases {
		if ql == k || strings.Contains(ql, k) {
			return v
		}
	}
	return q
}

func (s *Server) handleCreateReport(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	var req struct {
		Kind      string `json:"kind"`
		RouteID   string `json:"routeId"`
		StopID    string `json:"stopId"`
		VehicleID string `json:"vehicleId"`
		Note      string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}
	validKinds := map[string]bool{
		"bus_did_not_arrive":  true,
		"bus_skipped_stop":    true,
		"wrong_stop_location": true,
		"wrong_route_info":    true,
		"wrong_gps_position":  true,
	}
	if !validKinds[req.Kind] {
		writeError(w, http.StatusBadRequest, "unsupported report category")
		return
	}
	note := strings.TrimSpace(req.Note)
	if len(note) > 300 {
		note = note[:300]
	}

	// Rate limit per IP to prevent abuse (max 6 reports/hour, 10s cooldown)
	ip := r.Header.Get("X-Forwarded-For")
	if idx := strings.Index(ip, ","); idx > 0 {
		ip = strings.TrimSpace(ip[:idx])
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	now := time.Now().Unix()

	s.reportMu.Lock()
	recent := s.reportRate[ip]
	kept := make([]int64, 0, len(recent))
	for _, ts := range recent {
		if now-ts < 3600 {
			kept = append(kept, ts)
		}
	}
	if len(kept) > 0 && now-kept[len(kept)-1] < 10 {
		s.reportMu.Unlock()
		writeError(w, http.StatusTooManyRequests, "please wait before submitting another report")
		return
	}
	if len(kept) >= 6 {
		s.reportMu.Unlock()
		writeError(w, http.StatusTooManyRequests, "hourly report limit reached")
		return
	}
	kept = append(kept, now)
	s.reportRate[ip] = kept
	s.reportMu.Unlock()

	res, err := s.db.ExecContext(r.Context(), `
		INSERT INTO passenger_reports(kind, route_id, stop_id, vehicle_id, note, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		req.Kind, req.RouteID, req.StopID, req.VehicleID, note, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record report")
		return
	}
	id, _ := res.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         id,
		"status":     "recorded_unverified",
		"recordedAt": now,
		"message":    "Thank you. Report recorded for review (unverified commuter feedback).",
	})
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	q := resolveSearchQuery(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]any{
			"catalogue": []any{},
			"routes":    []any{},
			"stops":     []any{},
			"vehicles":  []any{},
		})
		return
	}

	like := "%" + q + "%"
	prefix := q + "%"

	// Count live vehicles per route and short name so search results show accurate live counts
	allVehicles, _ := s.poller.Snapshot()
	activeByRoute := make(map[string]int)
	activeByShort := make(map[string]int)
	for _, v := range allVehicles {
		if !v.IsStale {
			if v.RouteID != "" {
				activeByRoute[v.RouteID]++
			}
			if v.RouteShortName != "" {
				activeByShort[v.RouteShortName]++
			}
		}
	}

	// 1. Catalogue passenger routes
	crows, err := s.db.QueryContext(r.Context(), `
		SELECT route_number, primary_route_id, primary_long_name, classification, confidence, variant_count, total_trips, total_stops, origin, destination
		FROM route_catalogue
		WHERE route_number LIKE ? OR primary_long_name LIKE ? OR origin LIKE ? OR destination LIKE ?
		ORDER BY (route_number = ? COLLATE NOCASE) DESC, (route_number LIKE ?) DESC, total_trips DESC
		LIMIT 10
	`, like, like, like, like, q, prefix)
	catalogueResults := make([]CatalogueEntry, 0)
	if err == nil {
		for crows.Next() {
			var ce CatalogueEntry
			if err := crows.Scan(
				&ce.RouteNumber, &ce.PrimaryRouteID, &ce.PrimaryLongName,
				&ce.Classification, &ce.Confidence, &ce.VariantCount,
				&ce.TotalTrips, &ce.TotalStops, &ce.Origin, &ce.Destination,
			); err == nil {
				ce.ActiveVehicles = activeByShort[ce.RouteNumber]
				catalogueResults = append(catalogueResults, ce)
			}
		}
		crows.Close()
	}

	// 2. Specific Route variants
	rrows, err := s.db.QueryContext(r.Context(),
		`SELECT route_id, short_name, long_name, category, classification, confidence, origin, destination, route_desc, stop_count, trip_count
		 FROM routes
		 WHERE is_vizag = 1 AND (short_name LIKE ? OR long_name LIKE ? OR origin LIKE ? OR destination LIKE ?)
		 ORDER BY (short_name = ? COLLATE NOCASE) DESC, (short_name LIKE ?) DESC, trip_count DESC
		 LIMIT 12`, like, like, like, like, q, prefix)
	routes := make([]routeSummary, 0)
	if err == nil {
		for rrows.Next() {
			var rs routeSummary
			if err := rrows.Scan(
				&rs.RouteID, &rs.ShortName, &rs.LongName, &rs.Category,
				&rs.Classification, &rs.Confidence, &rs.Origin, &rs.Destination,
				&rs.RouteDesc, &rs.StopCount, &rs.TripCount,
			); err == nil {
				rs.ActiveVehicles = activeByRoute[rs.RouteID]
				if rs.ActiveVehicles == 0 && activeByShort[rs.ShortName] > 0 {
					rs.ActiveVehicles = activeByShort[rs.ShortName]
				}
				routes = append(routes, rs)
			}
		}
		rrows.Close()
	}

	// 3. Stops
	srows, err := s.db.QueryContext(r.Context(),
		`SELECT stop_id, name, lat, lon, in_vizag
		 FROM stops
		 WHERE in_vizag = 1 AND (name LIKE ? OR stop_id LIKE ?)
		 ORDER BY (name LIKE ?) DESC, name ASC
		 LIMIT 10`, like, like, prefix)
	stops := make([]stopItem, 0)
	if err == nil {
		for srows.Next() {
			var st stopItem
			var iv int
			if err := srows.Scan(&st.StopID, &st.Name, &st.Lat, &st.Lon, &iv); err == nil {
				st.InVizag = iv == 1
				stops = append(stops, st)
			}
		}
		srows.Close()
	}

	// 4. Vehicles (search by plate/registration, label, route number, or route name)
	ql := strings.ToLower(q)
	matchedVehicles := make([]rt.Vehicle, 0)
	for _, v := range allVehicles {
		if strings.Contains(strings.ToLower(v.RegistrationNumber), ql) ||
			strings.Contains(strings.ToLower(v.DisplayLabel), ql) ||
			strings.Contains(strings.ToLower(v.LicensePlate), ql) ||
			strings.Contains(strings.ToLower(v.RouteShortName), ql) ||
			strings.Contains(strings.ToLower(v.RouteLongName), ql) ||
			strings.Contains(strings.ToLower(v.VehicleID), ql) {
			matchedVehicles = append(matchedVehicles, v)
			if len(matchedVehicles) >= 12 {
				break
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"catalogue": catalogueResults,
		"routes":    routes,
		"stops":     stops,
		"vehicles":  matchedVehicles,
	})
}

func (s *Server) handleNearbyStops(w http.ResponseWriter, r *http.Request) {
	lat, err1 := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lon, err2 := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if err1 != nil || err2 != nil || !gtfs.ValidCoord(lat, lon) {
		writeError(w, http.StatusBadRequest, "valid lat and lon required")
		return
	}

	radiusM := 2500.0
	if radStr := r.URL.Query().Get("radius"); radStr != "" {
		if v, err := strconv.ParseFloat(radStr, 64); err == nil && v > 0 && v <= 15000 {
			radiusM = v
		}
	}
	limit := parseLimit(r.URL.Query().Get("limit"), 15, 50)

	dLat := radiusM / 111000.0
	dLon := radiusM / 105000.0

	rows, err := s.db.QueryContext(r.Context(),
		`SELECT stop_id, name, lat, lon FROM stops
		 WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?`,
		lat-dLat, lat+dLat, lon-dLon, lon+dLon)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type nearbyStop struct {
		StopID    string   `json:"stopId"`
		Name      string   `json:"name"`
		Lat       float64  `json:"lat"`
		Lon       float64  `json:"lon"`
		DistanceM float64  `json:"distanceM"`
		Routes    []string `json:"routes"`
	}

	var results []nearbyStop
	for rows.Next() {
		var ns nearbyStop
		if err := rows.Scan(&ns.StopID, &ns.Name, &ns.Lat, &ns.Lon); err == nil {
			d := gtfs.HaversineMeters(lat, lon, ns.Lat, ns.Lon)
			if d <= radiusM {
				ns.DistanceM = float64(int(d))
				results = append(results, ns)
			}
		}
	}

	sort.Slice(results, func(i, j int) bool { return results[i].DistanceM < results[j].DistanceM })
	if len(results) > limit {
		results = results[:limit]
	}

	for i := range results {
		rrows, err := s.db.QueryContext(r.Context(),
			`SELECT DISTINCT r.short_name FROM route_stops rs JOIN routes r ON r.route_id = rs.route_id WHERE rs.stop_id = ? ORDER BY r.short_name LIMIT 8`,
			results[i].StopID)
		if err == nil {
			for rrows.Next() {
				var sn string
				if err := rrows.Scan(&sn); err == nil {
					results[i].Routes = append(results[i].Routes, sn)
				}
			}
			rrows.Close()
		}
		if results[i].Routes == nil {
			results[i].Routes = []string{}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"stops": results,
	})
}

func (s *Server) handleLiveSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch, unsub := s.poller.Subscribe()
	defer unsub()

	vehicles, status := s.poller.Snapshot()
	initEv := rt.DeltaEvent{
		Type:          "snapshot",
		FeedTimestamp: status.FeedTimestamp,
		ServerTime:    time.Now().Unix(),
		Updated:       vehicles,
		Status:        status,
	}
	if err := writeSSE(w, flusher, "vehicles", initEv); err != nil {
		return
	}

	keepalive := time.NewTicker(25 * time.Second)
	defer keepalive.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case ev, ok := <-ch:
			if !ok {
				return
			}
			if err := writeSSE(w, flusher, "vehicles", ev); err != nil {
				return
			}
		case <-keepalive.C:
			if _, err := fmt.Fprint(w, ": keepalive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func writeSSE(w http.ResponseWriter, flusher http.Flusher, event string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

func parseLimit(s string, def, max int) int {
	if n, err := strconv.Atoi(s); err == nil && n > 0 {
		if n > max {
			return max
		}
		return n
	}
	return def
}

func parseOffset(s string) int {
	if n, err := strconv.Atoi(s); err == nil && n >= 0 {
		return n
	}
	return 0
}
