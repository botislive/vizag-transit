package gtfs

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// ParseGTFSTime converts "HH:MM:SS" (including >= 24:00:00) into seconds since service midnight.
func ParseGTFSTime(s string) (int, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	parts := strings.Split(s, ":")
	if len(parts) != 3 {
		return 0, false
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	sec, err3 := strconv.Atoi(parts[2])
	if err1 != nil || err2 != nil || err3 != nil {
		return 0, false
	}
	if h < 0 || m < 0 || m >= 60 || sec < 0 || sec >= 60 {
		return 0, false
	}
	return h*3600 + m*60 + sec, true
}

// FormatSeconds formats seconds since midnight as HH:MM (wrapping >= 24h for display).
func FormatSeconds(sec int) string {
	if sec < 0 {
		return ""
	}
	h := (sec / 3600) % 24
	m := (sec % 3600) / 60
	return fmt.Sprintf("%02d:%02d", h, m)
}

// HaversineMeters returns the great-circle distance in meters between two WGS84 coordinates.
func HaversineMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371000.0
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

// ValidCoord checks whether lat/lon are finite, non-zero, and within WGS84 bounds.
func ValidCoord(lat, lon float64) bool {
	if math.IsNaN(lat) || math.IsNaN(lon) || math.IsInf(lat, 0) || math.IsInf(lon, 0) {
		return false
	}
	if lat == 0 && lon == 0 {
		return false
	}
	return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}
