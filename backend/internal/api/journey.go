package api

import (
	"context"
	"database/sql"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"vizag-transit/internal/gtfs"
	"vizag-transit/internal/rt"
)

type journeyLiveBus struct {
	VehicleID          string  `json:"vehicleId"`
	Label              string  `json:"label"`
	RegistrationNumber string  `json:"registrationNumber,omitempty"`
	Freshness          string  `json:"freshness"`
	AgeSec             int64   `json:"ageSec"`
	SpeedKmh           float64 `json:"speedKmh"`
	NextStopName       string  `json:"nextStopName,omitempty"`
	ETASec             *int64  `json:"etaSec,omitempty"`
	DirectionMatch     bool    `json:"directionMatch"`
}

type journeyScheduledTrip struct {
	TripID        string `json:"tripId"`
	DepartureTime string `json:"departureTime"`
	ArrivalTime   string `json:"arrivalTime"`
	MinutesAway   int    `json:"minutesAway"`
	Headsign      string `json:"headsign,omitempty"`
}

type journeyLeg struct {
	RouteID             string                 `json:"routeId"`
	ShortName           string                 `json:"shortName"`
	LongName            string                 `json:"longName"`
	FromStopID          string                 `json:"fromStopId"`
	FromStopName        string                 `json:"fromStopName"`
	ToStopID            string                 `json:"toStopId"`
	ToStopName          string                 `json:"toStopName"`
	StopCount           int                    `json:"stopCount"`
	EstMinutes          int                    `json:"estMinutes"`
	TotalScheduledToday int                    `json:"totalScheduledToday"`
	LiveBuses           []journeyLiveBus       `json:"liveBuses"`
	ScheduledTrips      []journeyScheduledTrip `json:"scheduledTrips"`
}

type journeyOption struct {
	Type           string       `json:"type"` // "direct" | "transfer"
	TotalMinutes   int          `json:"totalMinutes"`
	WalkDistanceM  int          `json:"walkDistanceM"`
	Transfers      int          `json:"transfers"`
	Legs           []journeyLeg `json:"legs"`
	DurationSource string       `json:"durationSource"` // "gtfs_schedule" | "stop_estimate"
}

type candidateStop struct {
	stopID string
	name   string
	lat    float64
	lon    float64
	walkM  int
}

func (s *Server) handleJourney(w http.ResponseWriter, r *http.Request) {
	fromParam := strings.TrimSpace(r.URL.Query().Get("from"))
	toParam := strings.TrimSpace(r.URL.Query().Get("to"))
	if fromParam == "" || toParam == "" {
		writeError(w, http.StatusBadRequest, "from and to parameters are required")
		return
	}

	fromStops, err := s.resolveStops(r.Context(), fromParam)
	if err != nil || len(fromStops) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"journeys": []journeyOption{},
			"message":  "Could not find any Vizag bus stops near the starting location.",
		})
		return
	}

	toStops, err := s.resolveStops(r.Context(), toParam)
	if err != nil || len(toStops) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"journeys": []journeyOption{},
			"message":  "Could not find any Vizag bus stops near the destination.",
		})
		return
	}

	fromMap := make(map[string]candidateStop, len(fromStops))
	fromIDs := make([]string, len(fromStops))
	for i, c := range fromStops {
		fromMap[c.stopID] = c
		fromIDs[i] = c.stopID
	}
	toMap := make(map[string]candidateStop, len(toStops))
	toIDs := make([]string, len(toStops))
	for i, c := range toStops {
		toMap[c.stopID] = c
		toIDs[i] = c.stopID
	}

	vehicles, _ := s.poller.Snapshot()
	vehiclesByRoute := make(map[string][]rt.Vehicle)
	for _, v := range vehicles {
		if v.RouteID != "" {
			vehiclesByRoute[v.RouteID] = append(vehiclesByRoute[v.RouteID], v)
		}
	}
	nowSec := istSecondsSinceMidnight()

	// 1. Direct routes across all GTFS trips (both outbound & inbound)
	direct := s.findDirectJourneys(r.Context(), fromMap, toMap, fromIDs, toIDs, vehiclesByRoute, nowSec)

	// 2. Single-transfer routes if fewer than 3 direct options
	var transfers []journeyOption
	if len(direct) < 3 {
		transfers = s.findTransferJourneys(r.Context(), fromMap, toMap, fromIDs, toIDs, direct, vehiclesByRoute, nowSec)
	}

	options := append(direct, transfers...)
	sort.Slice(options, func(i, j int) bool {
		if options[i].Transfers != options[j].Transfers {
			return options[i].Transfers < options[j].Transfers
		}
		// Prefer routes with live buses running right now, then shorter duration
		iLive := len(options[i].Legs[0].LiveBuses) > 0
		jLive := len(options[j].Legs[0].LiveBuses) > 0
		if iLive != jLive {
			return iLive
		}
		return options[i].TotalMinutes < options[j].TotalMinutes
	})
	if len(options) > 12 {
		options = options[:12]
	}

	msg := ""
	if len(options) == 0 {
		msg = "No direct or single-transfer APSRTC Vizag route found between these stops in the current GTFS dataset."
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"journeys": options,
		"message":  msg,
	})
}

func istSecondsSinceMidnight() int {
	loc := time.FixedZone("IST", 5*3600+30*60)
	now := time.Now().In(loc)
	return now.Hour()*3600 + now.Minute()*60 + now.Second()
}

func (s *Server) resolveStops(ctx context.Context, param string) ([]candidateStop, error) {
	if strings.Contains(param, ",") {
		parts := strings.Split(param, ",")
		if len(parts) == 2 {
			lat, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
			lon, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
			if err1 == nil && err2 == nil && gtfs.ValidCoord(lat, lon) {
				return s.nearbyCandidates(ctx, lat, lon, 900, 5)
			}
		}
	}

	var c candidateStop
	err := s.db.QueryRowContext(ctx, `SELECT stop_id, name, lat, lon FROM stops WHERE stop_id = ?`, param).
		Scan(&c.stopID, &c.name, &c.lat, &c.lon)
	if err == nil {
		c.walkM = 0
		nearby, _ := s.nearbyCandidates(ctx, c.lat, c.lon, 350, 4)
		out := []candidateStop{c}
		for _, n := range nearby {
			if n.stopID != c.stopID {
				out = append(out, n)
			}
		}
		return out, nil
	}

	rows, err := s.db.QueryContext(ctx, `SELECT stop_id, name, lat, lon FROM stops WHERE in_vizag = 1 AND name LIKE ? LIMIT 5`, "%"+param+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []candidateStop
	for rows.Next() {
		var st candidateStop
		if err := rows.Scan(&st.stopID, &st.name, &st.lat, &st.lon); err == nil {
			out = append(out, st)
		}
	}
	return out, nil
}

func (s *Server) nearbyCandidates(ctx context.Context, lat, lon, radiusM float64, limit int) ([]candidateStop, error) {
	dLat := radiusM / 111000.0
	dLon := radiusM / 105000.0
	rows, err := s.db.QueryContext(ctx,
		`SELECT stop_id, name, lat, lon FROM stops WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?`,
		lat-dLat, lat+dLat, lon-dLon, lon+dLon)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []candidateStop
	for rows.Next() {
		var c candidateStop
		if err := rows.Scan(&c.stopID, &c.name, &c.lat, &c.lon); err == nil {
			d := gtfs.HaversineMeters(lat, lon, c.lat, c.lon)
			if d <= radiusM {
				c.walkM = int(d)
				out = append(out, c)
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].walkM < out[j].walkM })
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (s *Server) findDirectJourneys(
	ctx context.Context,
	fromMap, toMap map[string]candidateStop,
	fromIDs, toIDs []string,
	vehiclesByRoute map[string][]rt.Vehicle,
	nowSec int,
) []journeyOption {
	inFrom := placeholders(len(fromIDs))
	inTo := placeholders(len(toIDs))
	args := make([]any, 0, len(fromIDs)+len(toIDs))
	for _, id := range fromIDs {
		args = append(args, id)
	}
	for _, id := range toIDs {
		args = append(args, id)
	}

	// Query actual stop_times across all trips so both outbound and inbound directions are found
	query := `
		SELECT
			t.route_id, r.short_name, r.long_name,
			a.stop_id, b.stop_id,
			MIN(b.stop_sequence - a.stop_sequence) as stops_cnt,
			COUNT(DISTINCT t.trip_id) as trip_cnt
		FROM stop_times a
		JOIN stop_times b ON a.trip_id = b.trip_id AND b.stop_sequence > a.stop_sequence
		JOIN trips t ON t.trip_id = a.trip_id
		JOIN routes r ON r.route_id = t.route_id
		WHERE r.is_vizag = 1 AND a.stop_id IN (` + inFrom + `) AND b.stop_id IN (` + inTo + `)
		GROUP BY t.route_id
		ORDER BY stops_cnt ASC, trip_cnt DESC
		LIMIT 25`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var out []journeyOption
	for rows.Next() {
		var rid, sn, ln, fsid, tsid string
		var stopsCnt, tripCnt int
		if err := rows.Scan(&rid, &sn, &ln, &fsid, &tsid, &stopsCnt, &tripCnt); err != nil {
			continue
		}

		f := fromMap[fsid]
		t := toMap[tsid]
		mins, src := s.estimateLegMinutes(ctx, rid, fsid, tsid, stopsCnt)
		walkM := f.walkM + t.walkM
		totalMins := mins + walkM/75

		schedTrips, matchingTripIDs := s.fetchScheduledLegTrips(ctx, rid, fsid, tsid, nowSec)
		liveBuses := filterLegLiveBuses(vehiclesByRoute[rid], matchingTripIDs)

		out = append(out, journeyOption{
			Type:           "direct",
			TotalMinutes:   totalMins,
			WalkDistanceM:  walkM,
			Transfers:      0,
			DurationSource: src,
			Legs: []journeyLeg{{
				RouteID:             rid,
				ShortName:           sn,
				LongName:            ln,
				FromStopID:          fsid,
				FromStopName:        f.name,
				ToStopID:            tsid,
				ToStopName:          t.name,
				StopCount:           stopsCnt,
				EstMinutes:          mins,
				TotalScheduledToday: tripCnt,
				LiveBuses:           liveBuses,
				ScheduledTrips:      schedTrips,
			}},
		})
	}

	// Fallback to canonical route_stops if stop_times returned no matches
	if len(out) == 0 {
		fbQuery := `
			SELECT r.route_id, r.short_name, r.long_name, a.stop_id, b.stop_id, (b.stop_sequence - a.stop_sequence) as stops_cnt
			FROM route_stops a
			JOIN route_stops b ON a.route_id = b.route_id AND b.stop_sequence > a.stop_sequence
			JOIN routes r ON r.route_id = a.route_id
			WHERE r.is_vizag = 1 AND a.stop_id IN (` + inFrom + `) AND b.stop_id IN (` + inTo + `)
			ORDER BY stops_cnt ASC
			LIMIT 20`
		fbRows, fbErr := s.db.QueryContext(ctx, fbQuery, args...)
		if fbErr == nil {
			defer fbRows.Close()
			seen := make(map[string]bool)
			for fbRows.Next() {
				var rid, sn, ln, fsid, tsid string
				var stopsCnt int
				if err := fbRows.Scan(&rid, &sn, &ln, &fsid, &tsid, &stopsCnt); err != nil || seen[rid] {
					continue
				}
				seen[rid] = true
				f := fromMap[fsid]
				t := toMap[tsid]
				mins, src := s.estimateLegMinutes(ctx, rid, fsid, tsid, stopsCnt)
				walkM := f.walkM + t.walkM
				out = append(out, journeyOption{
					Type:           "direct",
					TotalMinutes:   mins + walkM/75,
					WalkDistanceM:  walkM,
					Transfers:      0,
					DurationSource: src,
					Legs: []journeyLeg{{
						RouteID:        rid,
						ShortName:      sn,
						LongName:       ln,
						FromStopID:     fsid,
						FromStopName:   f.name,
						ToStopID:       tsid,
						ToStopName:     t.name,
						StopCount:      stopsCnt,
						EstMinutes:     mins,
						LiveBuses:      filterLegLiveBuses(vehiclesByRoute[rid], nil),
						ScheduledTrips: []journeyScheduledTrip{},
					}},
				})
			}
		}
	}
	return out
}

func (s *Server) fetchScheduledLegTrips(ctx context.Context, routeID, fromStopID, toStopID string, nowSec int) ([]journeyScheduledTrip, map[string]bool) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT t.trip_id, a.departure_sec, b.arrival_sec, t.headsign
		FROM trips t
		JOIN stop_times a ON a.trip_id = t.trip_id AND a.stop_id = ?
		JOIN stop_times b ON b.trip_id = t.trip_id AND b.stop_id = ? AND b.stop_sequence > a.stop_sequence
		WHERE t.route_id = ?
		ORDER BY a.departure_sec ASC`, fromStopID, toStopID, routeID)
	if err != nil {
		return []journeyScheduledTrip{}, nil
	}
	defer rows.Close()

	matchingTrips := make(map[string]bool)
	upcoming := make([]journeyScheduledTrip, 0)

	for rows.Next() {
		var tid, headsign string
		var depSec, arrSec int
		if err := rows.Scan(&tid, &depSec, &arrSec, &headsign); err != nil {
			continue
		}
		matchingTrips[tid] = true
		if depSec >= nowSec && len(upcoming) < 6 {
			upcoming = append(upcoming, journeyScheduledTrip{
				TripID:        tid,
				DepartureTime: gtfs.FormatSeconds(depSec),
				ArrivalTime:   gtfs.FormatSeconds(arrSec),
				MinutesAway:   (depSec - nowSec) / 60,
				Headsign:      headsign,
			})
		}
	}
	return upcoming, matchingTrips
}

func filterLegLiveBuses(routeVehicles []rt.Vehicle, matchingTripIDs map[string]bool) []journeyLiveBus {
	out := make([]journeyLiveBus, 0, len(routeVehicles))
	for _, v := range routeVehicles {
		dirMatch := v.TripID != "" && matchingTripIDs[v.TripID]
		// Include buses on matching direction trips, or all fresh/aging buses on this route if trip not matched
		if !dirMatch && len(matchingTripIDs) > 0 && v.TripID != "" {
			continue
		}
		var etaPtr *int64
		if v.ETASec > 0 && v.ETASource == "trip_update" {
			val := v.ETASec
			etaPtr = &val
		}
		out = append(out, journeyLiveBus{
			VehicleID:          v.VehicleID,
			Label:              v.DisplayLabel,
			RegistrationNumber: v.RegistrationNumber,
			Freshness:          v.Freshness,
			AgeSec:             v.AgeSec,
			SpeedKmh:           v.SpeedKMH,
			NextStopName:       v.NextStopName,
			ETASec:             etaPtr,
			DirectionMatch:     dirMatch,
		})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Freshness != out[j].Freshness {
			return out[i].Freshness == "fresh"
		}
		return out[i].AgeSec < out[j].AgeSec
	})
	return out
}

func (s *Server) findTransferJourneys(
	ctx context.Context,
	fromMap, toMap map[string]candidateStop,
	fromIDs, toIDs []string,
	direct []journeyOption,
	vehiclesByRoute map[string][]rt.Vehicle,
	nowSec int,
) []journeyOption {
	directRoutes := make(map[string]bool)
	for _, d := range direct {
		for _, l := range d.Legs {
			directRoutes[l.RouteID] = true
		}
	}

	inFrom := placeholders(len(fromIDs))
	inTo := placeholders(len(toIDs))
	args := make([]any, 0, len(fromIDs)+len(toIDs))
	for _, id := range fromIDs {
		args = append(args, id)
	}
	for _, id := range toIDs {
		args = append(args, id)
	}

	query := `
		SELECT
			r1.route_id, r1.short_name, r1.long_name, a.stop_id, t1.stop_id, st.name, (t1.stop_sequence - a.stop_sequence) as s1,
			r2.route_id, r2.short_name, r2.long_name, b.stop_id, (b.stop_sequence - t2.stop_sequence) as s2
		FROM route_stops a
		JOIN route_stops t1 ON a.route_id = t1.route_id AND t1.stop_sequence > a.stop_sequence
		JOIN route_stops t2 ON t1.stop_id = t2.stop_id AND t1.route_id != t2.route_id
		JOIN route_stops b ON t2.route_id = b.route_id AND b.stop_sequence > t2.stop_sequence
		JOIN routes r1 ON r1.route_id = a.route_id AND r1.is_vizag = 1
		JOIN routes r2 ON r2.route_id = b.route_id AND r2.is_vizag = 1
		JOIN stops st ON st.stop_id = t1.stop_id
		WHERE a.stop_id IN (` + inFrom + `) AND b.stop_id IN (` + inTo + `)
		ORDER BY (s1 + s2) ASC
		LIMIT 20`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	seenPair := make(map[string]bool)
	var out []journeyOption
	for rows.Next() {
		var r1id, r1sn, r1ln, fsid, xsid, xname string
		var s1 int
		var r2id, r2sn, r2ln, tsid string
		var s2 int
		if err := rows.Scan(&r1id, &r1sn, &r1ln, &fsid, &xsid, &xname, &s1, &r2id, &r2sn, &r2ln, &tsid, &s2); err != nil {
			continue
		}
		if directRoutes[r1id] && directRoutes[r2id] {
			continue
		}
		key := r1sn + "->" + r2sn
		if seenPair[key] {
			continue
		}
		seenPair[key] = true

		f := fromMap[fsid]
		t := toMap[tsid]
		m1, src1 := s.estimateLegMinutes(ctx, r1id, fsid, xsid, s1)
		m2, _ := s.estimateLegMinutes(ctx, r2id, xsid, tsid, s2)
		walkM := f.walkM + t.walkM
		totalMins := m1 + m2 + 5 + walkM/75

		sched1, trips1 := s.fetchScheduledLegTrips(ctx, r1id, fsid, xsid, nowSec)
		sched2, trips2 := s.fetchScheduledLegTrips(ctx, r2id, xsid, tsid, nowSec)

		out = append(out, journeyOption{
			Type:           "transfer",
			TotalMinutes:   totalMins,
			WalkDistanceM:  walkM,
			Transfers:      1,
			DurationSource: src1,
			Legs: []journeyLeg{
				{
					RouteID: r1id, ShortName: r1sn, LongName: r1ln,
					FromStopID: fsid, FromStopName: f.name,
					ToStopID: xsid, ToStopName: xname,
					StopCount: s1, EstMinutes: m1,
					TotalScheduledToday: len(trips1),
					LiveBuses:           filterLegLiveBuses(vehiclesByRoute[r1id], trips1),
					ScheduledTrips:      sched1,
				},
				{
					RouteID: r2id, ShortName: r2sn, LongName: r2ln,
					FromStopID: xsid, FromStopName: xname,
					ToStopID: tsid, ToStopName: t.name,
					StopCount: s2, EstMinutes: m2,
					TotalScheduledToday: len(trips2),
					LiveBuses:           filterLegLiveBuses(vehiclesByRoute[r2id], trips2),
					ScheduledTrips:      sched2,
				},
			},
		})
		if len(out) >= 4 {
			break
		}
	}
	return out
}

func (s *Server) estimateLegMinutes(ctx context.Context, routeID, fromStopID, toStopID string, stopsCnt int) (int, string) {
	var diffSec sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT (b.arrival_sec - a.departure_sec)
		 FROM trips t
		 JOIN stop_times a ON a.trip_id = t.trip_id AND a.stop_id = ?
		 JOIN stop_times b ON b.trip_id = t.trip_id AND b.stop_id = ? AND b.stop_sequence > a.stop_sequence
		 WHERE t.route_id = ? AND b.arrival_sec > a.departure_sec
		 LIMIT 1`, fromStopID, toStopID, routeID).Scan(&diffSec)
	if err == nil && diffSec.Valid && diffSec.Int64 > 0 {
		mins := int(diffSec.Int64 / 60)
		if mins < 1 {
			mins = 1
		}
		return mins, "gtfs_schedule"
	}
	mins := stopsCnt * 5 / 2
	if mins < 2 {
		mins = 2
	}
	return mins, "stop_estimate"
}

func placeholders(n int) string {
	if n <= 0 {
		return "''"
	}
	return strings.Repeat("?,", n-1) + "?"
}
