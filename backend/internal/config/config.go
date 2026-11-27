package config

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Config holds runtime configuration for the Vizag Transit backend.
type Config struct {
	Port               string
	DBPath             string
	DataDir            string
	GTFSZipPath        string
	GTFSURL            string
	VehiclePositionsURL string
	TripUpdatesURL     string
	PollInterval       time.Duration
	StaleThresholdSec  int64
	MaxAgeSec          int64
}

// BBox defines the Visakhapatnam metropolitan area bounding box.
const (
	VizagMinLat = 17.50
	VizagMaxLat = 18.00
	VizagMinLon = 82.95
	VizagMaxLon = 83.50
)

// InVizagBBox reports whether a coordinate falls within the Visakhapatnam metro area.
func InVizagBBox(lat, lon float64) bool {
	return lat >= VizagMinLat && lat <= VizagMaxLat && lon >= VizagMinLon && lon <= VizagMaxLon
}

// Load reads configuration from environment variables with sensible local defaults.
func Load() Config {
	dataDir := getEnv("DATA_DIR", filepath.Join("data"))
	rawPort := getEnv("PORT", "8080")
	port := strings.TrimPrefix(strings.TrimSpace(rawPort), ":")
	if port == "" {
		port = "8080"
	}
	dbPath := getEnv("DB_PATH", filepath.Join(dataDir, "vizag_transit.db"))
	gtfsZip := getEnv("GTFS_ZIP_PATH", filepath.Join(dataDir, "apsrtc.zip"))

	pollSec := getEnvInt("RT_POLL_SECONDS", 12)
	if pollSec < 5 {
		pollSec = 5
	}

	return Config{
		Port:                port,
		DBPath:              dbPath,
		DataDir:             dataDir,
		GTFSZipPath:         gtfsZip,
		GTFSURL:             getEnv("GTFS_URL", "https://raw.githubusercontent.com/reclaimchennai/India_GTFS/main/andhra-pradesh/apsrtc.zip"),
		VehiclePositionsURL: getEnv("VEHICLE_POSITIONS_URL", "https://maps.reclaim.city/apsrtc/rt/vehicle_positions.pb"),
		TripUpdatesURL:      getEnv("TRIP_UPDATES_URL", "https://maps.reclaim.city/apsrtc/rt/trip_updates.pb"),
		PollInterval:        time.Duration(pollSec) * time.Second,
		StaleThresholdSec:   int64(getEnvInt("STALE_THRESHOLD_SECONDS", 300)),
		MaxAgeSec:           int64(getEnvInt("MAX_VEHICLE_AGE_SECONDS", 3600)),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
