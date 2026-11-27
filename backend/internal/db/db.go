package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Open initializes the SQLite database at path with WAL mode and schema.
func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create db dir: %w", err)
	}

	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&_pragma=busy_timeout(5000)&_pragma=cache_size(-32000)", path)
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	conn.SetMaxOpenConns(4)
	conn.SetMaxIdleConns(4)

	if err := initSchema(conn); err != nil {
		conn.Close()
		return nil, fmt.Errorf("init schema: %w", err)
	}

	return conn, nil
}

func initSchema(conn *sql.DB) error {
	const schema = `
CREATE TABLE IF NOT EXISTS meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- Separate verified route catalogue grouped by passenger-facing route numbers
CREATE TABLE IF NOT EXISTS route_catalogue (
	route_number TEXT PRIMARY KEY,
	primary_route_id TEXT NOT NULL,
	primary_long_name TEXT NOT NULL,
	classification TEXT NOT NULL, -- "vizag_city" | "vizag_regional" | "intercity"
	confidence TEXT NOT NULL DEFAULT 'High',
	classification_reason TEXT NOT NULL DEFAULT '',
	variant_count INTEGER NOT NULL DEFAULT 1,
	total_trips INTEGER NOT NULL DEFAULT 0,
	total_stops INTEGER NOT NULL DEFAULT 0,
	origin TEXT NOT NULL DEFAULT '',
	destination TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_catalogue_class ON route_catalogue(classification, route_number);
CREATE INDEX IF NOT EXISTS idx_catalogue_num ON route_catalogue(route_number);

-- Detailed GTFS routes (each variant/direction preserves internal route_id)
CREATE TABLE IF NOT EXISTS routes (
	route_id TEXT PRIMARY KEY,
	short_name TEXT NOT NULL,
	long_name TEXT NOT NULL,
	route_desc TEXT NOT NULL DEFAULT '',
	category TEXT NOT NULL DEFAULT '',
	classification TEXT NOT NULL DEFAULT 'other_statewide',
	confidence TEXT NOT NULL DEFAULT 'High',
	classification_reason TEXT NOT NULL DEFAULT '',
	origin TEXT NOT NULL DEFAULT '',
	destination TEXT NOT NULL DEFAULT '',
	route_type INTEGER NOT NULL DEFAULT 3,
	is_vizag INTEGER NOT NULL DEFAULT 0,
	stop_count INTEGER NOT NULL DEFAULT 0,
	trip_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_routes_vizag ON routes(is_vizag, short_name);
CREATE INDEX IF NOT EXISTS idx_routes_short ON routes(short_name);
CREATE INDEX IF NOT EXISTS idx_routes_class ON routes(classification);

CREATE TABLE IF NOT EXISTS stops (
	stop_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	lat REAL NOT NULL,
	lon REAL NOT NULL,
	in_vizag INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stops_vizag ON stops(in_vizag, name);
CREATE INDEX IF NOT EXISTS idx_stops_coords ON stops(lat, lon);

CREATE TABLE IF NOT EXISTS trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	service_id TEXT NOT NULL,
	short_name TEXT NOT NULL DEFAULT '',
	headsign TEXT NOT NULL DEFAULT '',
	shape_id TEXT NOT NULL DEFAULT '',
	trip_type TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id);

CREATE TABLE IF NOT EXISTS stop_times (
	trip_id TEXT NOT NULL,
	stop_id TEXT NOT NULL,
	stop_sequence INTEGER NOT NULL,
	arrival_sec INTEGER NOT NULL,
	departure_sec INTEGER NOT NULL,
	arrival_str TEXT NOT NULL,
	departure_str TEXT NOT NULL,
	timepoint INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_stop_times_stop_dep ON stop_times(stop_id, departure_sec);

CREATE TABLE IF NOT EXISTS route_stops (
	route_id TEXT NOT NULL,
	stop_sequence INTEGER NOT NULL,
	stop_id TEXT NOT NULL,
	PRIMARY KEY (route_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_stop ON route_stops(stop_id);

CREATE TABLE IF NOT EXISTS route_shapes (
	route_id TEXT PRIMARY KEY,
	coords_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shapes (
	shape_id TEXT PRIMARY KEY,
	coords_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
	vehicle_id TEXT PRIMARY KEY,
	label TEXT NOT NULL DEFAULT '',
	license_plate TEXT NOT NULL DEFAULT '',
	registration_number TEXT NOT NULL DEFAULT '',
	display_label TEXT NOT NULL DEFAULT '',
	trip_id TEXT NOT NULL DEFAULT '',
	route_id TEXT NOT NULL DEFAULT '',
	lat REAL NOT NULL,
	lon REAL NOT NULL,
	bearing REAL NOT NULL DEFAULT 0,
	speed_mps REAL NOT NULL DEFAULT 0,
	gps_timestamp INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	is_stale INTEGER NOT NULL DEFAULT 0,
	next_stop_id TEXT NOT NULL DEFAULT '',
	next_stop_name TEXT NOT NULL DEFAULT '',
	next_stop_seq INTEGER NOT NULL DEFAULT 0,
	eta_sec INTEGER NOT NULL DEFAULT 0,
	eta_source TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_vehicles_route ON vehicles(route_id);
`
	_, err := conn.Exec(schema)
	return err
}
