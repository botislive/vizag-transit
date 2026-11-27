package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"vizag-transit/internal/config"
	"vizag-transit/internal/db"
	"vizag-transit/internal/rt"
)

func TestAPIWithEmptyDBAndEndpoints(t *testing.T) {
	dir := t.TempDir()
	conn, err := db.Open(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer conn.Close()

	_, err = conn.Exec(`
		INSERT INTO routes(route_id, short_name, long_name, category, is_vizag, stop_count, trip_count)
		VALUES ('r1', '28K', 'R.K.Beach – Kothavalasa', 'City', 1, 2, 10);
		INSERT INTO stops(stop_id, name, lat, lon, in_vizag) VALUES
		('s1', 'R.K.Beach', 17.71422, 83.32211, 1),
		('s2', 'Maddilapalem', 17.73615, 83.32006, 1);
		INSERT INTO route_stops(route_id, stop_sequence, stop_id) VALUES ('r1', 1, 's1'), ('r1', 2, 's2');
	`)
	if err != nil {
		t.Fatalf("seed db: %v", err)
	}

	poller, err := rt.NewPoller(conn, config.Load())
	if err != nil {
		t.Fatalf("new poller: %v", err)
	}
	h := NewServer(conn, poller)

	// Test /api/health
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("/api/health status = %d", rec.Code)
	}

	// Test /api/search?q=28K
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/search?q=28K", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("/api/search status = %d", rec.Code)
	}
	var searchResp struct {
		Routes []routeSummary `json:"routes"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &searchResp)
	if len(searchResp.Routes) != 1 || searchResp.Routes[0].ShortName != "28K" {
		t.Fatalf("unexpected search routes: %+v", searchResp.Routes)
	}

	// Test /api/journey?from=s1&to=s2
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/journey?from=s1&to=s2", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("/api/journey status = %d", rec.Code)
	}
	var jResp struct {
		Journeys []journeyOption `json:"journeys"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &jResp)
	if len(jResp.Journeys) != 1 || jResp.Journeys[0].Type != "direct" {
		t.Fatalf("unexpected journeys: %+v", jResp.Journeys)
	}

	// Test GET / serves embedded index.html
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET / status = %d, expected 200", rec.Code)
	}

	// Test GET /routes/28K (SPA route fallback to index.html)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/routes/28K", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /routes/28K status = %d, expected 200", rec.Code)
	}

	// Test GET /api/unknown returns 404 and not index.html
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/unknown-endpoint", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET /api/unknown-endpoint status = %d, expected 404", rec.Code)
	}

	// Test GET /assets/missing.js returns 404
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/assets/missing.js", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("GET /assets/missing.js status = %d, expected 404", rec.Code)
	}

	// Test GET /robots.txt
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/robots.txt", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Sitemap: https://vizagtransit.duckdns.org/sitemap.xml") {
		t.Fatalf("GET /robots.txt unexpected response: status=%d body=%q", rec.Code, rec.Body.String())
	}

	// Test GET /sitemap.xml
	_, _ = conn.Exec(`INSERT INTO route_catalogue(route_number, primary_route_id, primary_long_name, classification, confidence, classification_reason, variant_count, total_trips, total_stops) VALUES ('28K', 'r1', 'R.K.Beach – Kothavalasa', 'City', 'high', 'test', 1, 10, 2)`)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "https://vizagtransit.duckdns.org/routes/r1") {
		t.Fatalf("GET /sitemap.xml unexpected response: status=%d body=%q", rec.Code, rec.Body.String())
	}

	// Test .onrender.com host receives X-Robots-Tag: noindex, nofollow
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Host = "vizag-transit.onrender.com"
	h.ServeHTTP(rec, req)
	if rec.Header().Get("X-Robots-Tag") != "noindex, nofollow" {
		t.Fatalf("expected X-Robots-Tag: noindex, nofollow for .onrender.com, got %q", rec.Header().Get("X-Robots-Tag"))
	}
}
