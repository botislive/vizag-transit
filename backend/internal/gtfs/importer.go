package gtfs

import (
	"archive/zip"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"vizag-transit/internal/config"
)

type rawStop struct {
	id      string
	name    string
	lat     float64
	lon     float64
	inVizag bool
}

type rawRoute struct {
	id        string
	shortName string
	longName  string
	desc      string
	category  string
	routeType int
}

type rawTrip struct {
	tripID    string
	routeID   string
	serviceID string
	shortName string
	headsign  string
	shapeID   string
	tripType  string
}

type rawStopTime struct {
	tripID    string
	stopID    string
	seq       int
	arrSec    int
	depSec    int
	arrStr    string
	depStr    string
	timepoint int
}

type shapePt struct {
	seq int
	lat float64
	lon float64
}

type routeClassification struct {
	class      string // "vizag_city" | "vizag_regional" | "intercity" | "other_statewide"
	confidence string // "High" | "Medium"
	reason     string
}

// EnsureImported downloads the APSRTC GTFS zip if needed and imports Visakhapatnam data into SQLite.
func EnsureImported(conn *sql.DB, cfg config.Config) error {
	if err := ensureZipExists(cfg.GTFSZipPath, cfg.GTFSURL); err != nil {
		return err
	}

	zr, err := zip.OpenReader(cfg.GTFSZipPath)
	if err != nil {
		return fmt.Errorf("open gtfs zip: %w", err)
	}
	defer zr.Close()

	files := make(map[string]*zip.File, len(zr.File))
	for _, f := range zr.File {
		files[filepath.Base(f.Name)] = f
	}

	feedVersion := readFeedVersion(files["feed_info.txt"])
	if feedVersion != "" {
		var existingVersion, catCount string
		_ = conn.QueryRow(`SELECT value FROM meta WHERE key = 'feed_version'`).Scan(&existingVersion)
		_ = conn.QueryRow(`SELECT COUNT(*) FROM route_catalogue`).Scan(&catCount)
		if existingVersion == feedVersion && catCount != "" && catCount != "0" {
			slog.Info("GTFS route catalogue already imported", "feed_version", feedVersion, "catalogue_routes", catCount)
			return nil
		}
	}

	start := time.Now()
	slog.Info("Importing APSRTC GTFS data and building Route Catalogue...", "zip", cfg.GTFSZipPath)

	// 1. Parse stops.txt
	stops, err := parseStops(files["stops.txt"])
	if err != nil {
		return fmt.Errorf("parse stops: %w", err)
	}

	// 2. Parse routes.txt
	routes, err := parseRoutes(files["routes.txt"])
	if err != nil {
		return fmt.Errorf("parse routes: %w", err)
	}

	// 3. Parse trips.txt
	trips, tripToRoute, err := parseTrips(files["trips.txt"])
	if err != nil {
		return fmt.Errorf("parse trips: %w", err)
	}

	// 4. Pass 1 of stop_times.txt: collect stop sets & sequence for classification and origin/destination
	routeStopSets := make(map[string]map[string]struct{})
	tripFirstLast := make(map[string][2]string) // tid -> [firstStopID, lastStopID]
	tripMinMaxSeq := make(map[string][2]int)    // tid -> [minSeq, maxSeq]

	if err := streamCSV(files["stop_times.txt"], func(idx map[string]int, row []string) error {
		tid := getCol(row, idx, "trip_id")
		sid := getCol(row, idx, "stop_id")
		seq, _ := strconv.Atoi(getCol(row, idx, "stop_sequence"))
		rid, ok := tripToRoute[tid]
		if !ok {
			return nil
		}
		set := routeStopSets[rid]
		if set == nil {
			set = make(map[string]struct{})
			routeStopSets[rid] = set
		}
		set[sid] = struct{}{}

		fl, exists := tripFirstLast[tid]
		mm := tripMinMaxSeq[tid]
		if !exists {
			tripFirstLast[tid] = [2]string{sid, sid}
			tripMinMaxSeq[tid] = [2]int{seq, seq}
		} else {
			if seq < mm[0] {
				fl[0] = sid
				mm[0] = seq
			}
			if seq > mm[1] {
				fl[1] = sid
				mm[1] = seq
			}
			tripFirstLast[tid] = fl
			tripMinMaxSeq[tid] = mm
		}
		return nil
	}); err != nil {
		return fmt.Errorf("pass 1 stop_times: %w", err)
	}

	// Classify all routes based on stop geography & GTFS attributes
	routeClassMap := make(map[string]routeClassification)
	for rid, sids := range routeStopSets {
		totalStops := len(sids)
		if totalStops == 0 {
			continue
		}
		metroCount := 0
		for sid := range sids {
			if st, ok := stops[sid]; ok && st.inVizag {
				metroCount++
			}
		}

		metroRatio := float64(metroCount) / float64(totalStops)
		rMeta := findRoute(routes, rid)
		longLower := strings.ToLower(rMeta.longName)
		desc := rMeta.desc

		if metroCount == 0 {
			routeClassMap[rid] = routeClassification{
				class:      "other_statewide",
				confidence: "High",
				reason:     "Zero stops in Visakhapatnam region",
			}
		} else if metroRatio >= 0.80 && totalStops >= 2 {
			conf := "High"
			if !strings.HasPrefix(desc, "City") {
				conf = "Medium"
			}
			routeClassMap[rid] = routeClassification{
				class:      "vizag_city",
				confidence: conf,
				reason:     fmt.Sprintf("%d/%d stops (%.0f%%) within Vizag metro corridor", metroCount, totalStops, metroRatio*100),
			}
		} else if metroRatio >= 0.35 || (metroCount >= 2 && containsAny(longLower, "anakapalle", "pendurthi", "bheemili", "tagarapu", "sabbavaram", "kottavalasa", "atchutapuram", "simhachalam", "gajuwaka")) {
			conf := "High"
			if !strings.HasPrefix(desc, "City") && !strings.Contains(desc, "Express") {
				conf = "Medium"
			}
			routeClassMap[rid] = routeClassification{
				class:      "vizag_regional",
				confidence: conf,
				reason:     fmt.Sprintf("Regional feeder connecting Vizag metro (%d stops) with peri-urban centers", metroCount),
			}
		} else {
			routeClassMap[rid] = routeClassification{
				class:      "intercity",
				confidence: "High",
				reason:     fmt.Sprintf("Long-distance intercity corridor with %d/%d stop(s) in Vizag", metroCount, totalStops),
			}
		}
	}

	// Identify routes to store in full detail: vizag_city and vizag_regional
	vizagRouteIDs := make(map[string]bool)
	for rid, c := range routeClassMap {
		if c.class == "vizag_city" || c.class == "vizag_regional" {
			vizagRouteIDs[rid] = true
		}
	}

	// Filter trips belonging to Vizag routes
	vizagTrips := make(map[string]rawTrip)
	routeTripCount := make(map[string]int)
	for _, t := range trips {
		if vizagRouteIDs[t.routeID] {
			vizagTrips[t.tripID] = t
			routeTripCount[t.routeID]++
		}
	}

	// 5. Pass 2 of stop_times.txt: load stop_times for Vizag trips
	var vizagStopTimes []rawStopTime
	tripStopCount := make(map[string]int)
	tripStopTimesMap := make(map[string][]rawStopTime)
	neededStops := make(map[string]bool)

	for sid, st := range stops {
		if st.inVizag {
			neededStops[sid] = true
		}
	}

	if err := streamCSV(files["stop_times.txt"], func(idx map[string]int, row []string) error {
		tid := getCol(row, idx, "trip_id")
		if _, ok := vizagTrips[tid]; !ok {
			return nil
		}
		sid := getCol(row, idx, "stop_id")
		seq, _ := strconv.Atoi(getCol(row, idx, "stop_sequence"))
		arrStr := getCol(row, idx, "arrival_time")
		depStr := getCol(row, idx, "departure_time")
		arrSec, arrOK := ParseGTFSTime(arrStr)
		depSec, depOK := ParseGTFSTime(depStr)
		if !arrOK && depOK {
			arrSec = depSec
		} else if !depOK && arrOK {
			depSec = arrSec
		}
		tp := 1
		if v := getCol(row, idx, "timepoint"); v == "0" {
			tp = 0
		}
		st := rawStopTime{
			tripID:    tid,
			stopID:    sid,
			seq:       seq,
			arrSec:    arrSec,
			depSec:    depSec,
			arrStr:    arrStr,
			depStr:    depStr,
			timepoint: tp,
		}
		vizagStopTimes = append(vizagStopTimes, st)
		tripStopCount[tid]++
		tripStopTimesMap[tid] = append(tripStopTimesMap[tid], st)
		neededStops[sid] = true
		return nil
	}); err != nil {
		return fmt.Errorf("pass 2 stop_times: %w", err)
	}

	// Count shape_id frequency per route so we pick the primary/majority corridor
	// instead of a 1-off outlier/detour trip that happens to have more stops.
	routeShapeFreq := make(map[string]map[string]int)
	for _, t := range vizagTrips {
		if t.shapeID == "" {
			continue
		}
		if routeShapeFreq[t.routeID] == nil {
			routeShapeFreq[t.routeID] = make(map[string]int)
		}
		routeShapeFreq[t.routeID][t.shapeID]++
	}

	// Find canonical trip and endpoints (origin/destination) per Vizag route
	canonicalTrip := make(map[string]rawTrip)
	routeEndpoints := make(map[string][2]string) // rid -> [origin, destination]

	for _, t := range vizagTrips {
		cur, exists := canonicalTrip[t.routeID]
		cnt := tripStopCount[t.tripID]
		curCnt := tripStopCount[cur.tripID]
		tFreq := routeShapeFreq[t.routeID][t.shapeID]
		curFreq := routeShapeFreq[t.routeID][cur.shapeID]
		if !exists || tFreq > curFreq || (tFreq == curFreq && (cnt > curCnt || (cnt == curCnt && cur.shapeID == "" && t.shapeID != ""))) {
			canonicalTrip[t.routeID] = t
		}
	}

	for rid, ct := range canonicalTrip {
		if fl, ok := tripFirstLast[ct.tripID]; ok {
			originName := stops[fl[0]].name
			destName := stops[fl[1]].name
			if originName == "" {
				originName = "N/A"
			}
			if destName == "" {
				destName = "N/A"
			}
			routeEndpoints[rid] = [2]string{originName, destName}
		}
	}

	neededShapes := make(map[string]bool)
	for _, t := range vizagTrips {
		if t.shapeID != "" {
			neededShapes[t.shapeID] = true
		}
	}

	// 6. Parse shapes.txt for canonical Vizag route shapes
	shapePoints := make(map[string][]shapePt)
	if files["shapes.txt"] != nil {
		if err := streamCSV(files["shapes.txt"], func(idx map[string]int, row []string) error {
			shid := getCol(row, idx, "shape_id")
			if !neededShapes[shid] {
				return nil
			}
			lat, err1 := strconv.ParseFloat(getCol(row, idx, "shape_pt_lat"), 64)
			lon, err2 := strconv.ParseFloat(getCol(row, idx, "shape_pt_lon"), 64)
			seq, err3 := strconv.Atoi(getCol(row, idx, "shape_pt_sequence"))
			if err1 != nil || err2 != nil || err3 != nil || !ValidCoord(lat, lon) {
				return nil
			}
			shapePoints[shid] = append(shapePoints[shid], shapePt{seq: seq, lat: lat, lon: lon})
			return nil
		}); err != nil {
			return fmt.Errorf("parse shapes: %w", err)
		}
	}

// VizagPublicRouteNumbers maps APSRTC GTFS corridors to passenger-facing public route numbers
// verified via OpenStreetMap Visakhapatnam APSRTC bus routes and the Vizag commuter route catalogue.
var VizagPublicRouteNumbers = map[string]string{
	// 55 series
	"gk11-kottavalasa-scindia":      "55K",
	"bo43-devarapalle-scindia":      "55D",
	"j082-scindia-simhachalam":      "55",
	"j011-scindia-simhachalam-hill": "55",
	"bo47-gwk-depot-tagarapuvalasa": "55T",
	"bo23-pendurthi-tagarapuvalasa": "55T",

	// 400 series
	"co71-old-gajuwaka-rtc-complex-vsp":     "400",
	"jn04-rtc-complex-vsp-vadachipurapalli": "400N",
	"jp01-old-gajuwaka-vizianagaram":        "411V",

	// 38 series
	"do01-duvvada-rtc-complex-vsp":             "38Y",
	"ds03-kurmannapalem-rtc-complex-vsp":       "38",
	"ao81-nadupuru-part-rtc-complex-vsp":       "38D",
	"jn01-rtc-complex-vsp-sector-5":            "38K",
	"go01-gantyada-hb-colony-rtc-complex-vsp":  "38H",
	"jo71-gantyada-hb-colony-rtc-complex-vsp":  "38H",

	// 500 series
	"la24-anakapalli-rtc-complex-vsp":    "500",
	"jn65-anakapalli-rtc-complex-vsp":    "500",
	"k151-rtc-complex-vsp-yelamanchili":  "500Y",

	// 99 & 900 series
	"or92-old-gajuwaka-r-k-beach":             "99",
	"bm06-maddilapalem-railway-station-vsp":   "900",
	"a033-bheemunipatnam-railway-station-vsp": "900K",
	"k121-bheemunipatnam-rtc-complex-vsp":     "999",

	// 6 series
	"ao21-old-head-post-office-simhachalam":      "6",
	"ao31-dabbanda-old-head-post-office":         "6D",
	"b011-rtc-complex-vsp-simhachalam":           "6A",
	"gy01-rtc-complex-vsp-simhachalam-hill":      "6A/H",
	"ao22-old-head-post-office-simhachalam-hill": "6H",

	// 10, 12, 14 series
	"gv99-kailasagiri-rtc-complex-vsp":       "10K",
	"dv05-devarapalle-rtc-complex-vsp":       "12D",
	"gc21-old-head-post-office-venkojipalem": "14",
	"a221-arilova-colony-old-head-post-office": "14A",

	// 25 series
	"ng02-town-koth-raod-vambay-colony":              "25D/V",
	"sv01-railway-station-vsp-seva-nagar":            "25J",
	"pp20-old-head-post-office-pothinamallayyapalem": "25P",

	// 28 series
	"kv03-pendurthi-r-k-beach":        "28A",
	"g035-kottavalasa-r-k-beach":      "28K",
	"f016-r-k-beach-sabbavaram":       "28P",
	"f017-r-k-beach-simhachalam-hill": "28Z/H",

	// 48, 52, 60, 69 series
	"ch03-madhavadhara-vuda-colony-old-head-post-office": "48A",
	"a011-old-head-post-office-ravindranagar":           "52D",
	"a024-old-head-post-office-sagarnagar":              "52S",
	"a232-arilova-colony-old-head-post-office":          "60C",
	"ar04-arilova-colony-railway-station-vsp":           "69",

	// Regional & connecting series
	"s056-simhachalam-vizianagaram":                             "700",
	"vz13-kurmannapalem-vizianagaram":                           "111V",
	"dv01-srungavarapu-kota-vizianagaram":                       "122",
	"9191-anakapalli-vizianagaram":                              "205",
	"it02-railway-station-vsp-vizianagaram":                     "211",
	"bm02-rtc-complex-vsp-tagarapu-valasa-citybus-stop":         "222",
	"tv03-railway-station-vsp-tagarapu-valasa-citybus-stop":     "222R",
	"rj01-rtc-complex-vsp-vizianagaram":                         "222V",
	"ch15-chodavaram-rtc-complex-vsp":                           "300C",
	"9092-madugula-rtc-complex-vsp":                             "300M",
	"mg83-madugula-rtc-complex-vsp":                             "300M",
	"cd02-chodavaram-scindia":                                   "311",
	"g009-kottavalasa-maddilapalem":                             "541",
	"kv07-maddilapalem-padmanabham":                             "541P",
	"as02-anakapalli-scindia":                                   "600",
	"9541-simhachalam-hill-vizianagaram":                        "700",
	"bm02-anakapalli-tagarapu-valasa-citybus-stop":              "888",
	"am10-old-gajuwaka-visakhapatnam-asr-international-airport": "ASR-1",
}

	// Group routes into passenger-facing catalogue by route_short_name
	type catalogueGroup struct {
		routeNumber   string
		primaryRoute  rawRoute
		primaryTrip   rawTrip
		classification string
		confidence    string
		reason        string
		variantCount  int
		totalTrips    int
		maxStops      int
		origin        string
		destination   string
	}

	groups := make(map[string]*catalogueGroup)
	for rid := range vizagRouteIDs {
		rMeta := findRoute(routes, rid)
		sn := rMeta.shortName
		if pub, ok := VizagPublicRouteNumbers[rid]; ok {
			sn = pub
		}
		c := routeClassMap[rid]
		ct := canonicalTrip[rid]
		ep := routeEndpoints[rid]
		tripsCnt := routeTripCount[rid]
		stopsCnt := tripStopCount[ct.tripID]

		grp, exists := groups[sn]
		if !exists {
			groups[sn] = &catalogueGroup{
				routeNumber:    sn,
				primaryRoute:   rMeta,
				primaryTrip:    ct,
				classification: c.class,
				confidence:     c.confidence,
				reason:         c.reason,
				variantCount:   1,
				totalTrips:     tripsCnt,
				maxStops:       stopsCnt,
				origin:         ep[0],
				destination:    ep[1],
			}
		} else {
			grp.variantCount++
			grp.totalTrips += tripsCnt
			if stopsCnt > grp.maxStops {
				grp.maxStops = stopsCnt
			}
			// Prefer city over regional, and trip with more trips/shapes as primary
			if c.class == "vizag_city" {
				grp.classification = "vizag_city"
			}
			if tripsCnt > routeTripCount[grp.primaryRoute.id] {
				grp.primaryRoute = rMeta
				grp.primaryTrip = ct
				grp.origin = ep[0]
				grp.destination = ep[1]
				grp.reason = c.reason
			}
		}
	}

	// 7. Write to SQLite in a single transaction
	tx, err := conn.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	tables := []string{"route_catalogue", "routes", "stops", "trips", "stop_times", "route_stops", "route_shapes", "shapes"}
	for _, tbl := range tables {
		if _, err := tx.Exec("DELETE FROM " + tbl); err != nil {
			return fmt.Errorf("clear %s: %w", tbl, err)
		}
	}

	// Insert route_catalogue master entries
	stmtCat, err := tx.Prepare(`
		INSERT INTO route_catalogue(route_number, primary_route_id, primary_long_name, classification, confidence, classification_reason, variant_count, total_trips, total_stops, origin, destination)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmtCat.Close()

	for _, g := range groups {
		if _, err := stmtCat.Exec(
			g.routeNumber, g.primaryRoute.id, g.primaryRoute.longName,
			g.classification, g.confidence, g.reason,
			g.variantCount, g.totalTrips, g.maxStops, g.origin, g.destination,
		); err != nil {
			return err
		}
	}

	// Insert all routes
	stmtRoute, err := tx.Prepare(`
		INSERT INTO routes(route_id, short_name, long_name, route_desc, category, classification, confidence, classification_reason, origin, destination, route_type, is_vizag, stop_count, trip_count)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmtRoute.Close()

	for _, r := range routes {
		isVizag := 0
		stopCnt := 0
		cls := routeClassMap[r.id]
		if cls.class == "" {
			cls = routeClassification{class: "other_statewide", confidence: "High", reason: "Zero stops in Vizag"}
		}
		if vizagRouteIDs[r.id] {
			isVizag = 1
			if ct, ok := canonicalTrip[r.id]; ok {
				stopCnt = tripStopCount[ct.tripID]
			}
		}
		ep := routeEndpoints[r.id]
		shortName := r.shortName
		desc := r.desc
		if pub, ok := VizagPublicRouteNumbers[r.id]; ok {
			shortName = pub
			if desc != "" {
				desc = fmt.Sprintf("%s · Duty Code: %s", desc, r.shortName)
			}
		}
		if _, err := stmtRoute.Exec(
			r.id, shortName, r.longName, desc, r.category,
			cls.class, cls.confidence, cls.reason,
			ep[0], ep[1], r.routeType, isVizag, stopCnt, routeTripCount[r.id],
		); err != nil {
			return err
		}
	}

	// Insert Vizag & needed stops
	stmtStop, err := tx.Prepare(`INSERT INTO stops(stop_id, name, lat, lon, in_vizag) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtStop.Close()
	vizagStopCount := 0
	for sid := range neededStops {
		st, ok := stops[sid]
		if !ok {
			continue
		}
		iv := 0
		if st.inVizag {
			iv = 1
			vizagStopCount++
		}
		if _, err := stmtStop.Exec(st.id, st.name, st.lat, st.lon, iv); err != nil {
			return err
		}
	}

	// Insert Vizag trips
	stmtTrip, err := tx.Prepare(`INSERT INTO trips(trip_id, route_id, service_id, short_name, headsign, shape_id, trip_type) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtTrip.Close()
	for _, t := range vizagTrips {
		if _, err := stmtTrip.Exec(t.tripID, t.routeID, t.serviceID, t.shortName, t.headsign, t.shapeID, t.tripType); err != nil {
			return err
		}
	}

	// Insert Vizag stop_times
	stmtST, err := tx.Prepare(`INSERT INTO stop_times(trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, arrival_str, departure_str, timepoint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtST.Close()
	for _, st := range vizagStopTimes {
		if _, err := stmtST.Exec(st.tripID, st.stopID, st.seq, st.arrSec, st.depSec, st.arrStr, st.depStr, st.timepoint); err != nil {
			return err
		}
	}

	// Insert canonical route_stops and route_shapes
	stmtRS, err := tx.Prepare(`INSERT INTO route_stops(route_id, stop_sequence, stop_id) VALUES (?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmtRS.Close()

	stmtShape, err := tx.Prepare(`INSERT INTO route_shapes(route_id, coords_json) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmtShape.Close()

	stmtShapeByID, err := tx.Prepare(`INSERT OR REPLACE INTO shapes(shape_id, coords_json) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer stmtShapeByID.Close()

	// Insert all individual trip shapes used by Vizag trips
	insertedShapes := make(map[string]bool)
	for _, t := range vizagTrips {
		if t.shapeID == "" || insertedShapes[t.shapeID] {
			continue
		}
		if pts := shapePoints[t.shapeID]; len(pts) >= 2 {
			sort.Slice(pts, func(i, j int) bool { return pts[i].seq < pts[j].seq })
			coords := make([][2]float64, len(pts))
			for i, p := range pts {
				coords[i] = [2]float64{p.lon, p.lat}
			}
			b, _ := json.Marshal(coords)
			if _, err := stmtShapeByID.Exec(t.shapeID, string(b)); err != nil {
				return err
			}
			insertedShapes[t.shapeID] = true
		}
	}

	for rid, ct := range canonicalTrip {
		seqList := append([]rawStopTime(nil), tripStopTimesMap[ct.tripID]...)
		sort.Slice(seqList, func(i, j int) bool { return seqList[i].seq < seqList[j].seq })
		for idx, st := range seqList {
			if _, err := stmtRS.Exec(rid, idx+1, st.stopID); err != nil {
				return err
			}
		}

		if pts := shapePoints[ct.shapeID]; len(pts) >= 2 {
			sort.Slice(pts, func(i, j int) bool { return pts[i].seq < pts[j].seq })
			coords := make([][2]float64, len(pts))
			for i, p := range pts {
				coords[i] = [2]float64{p.lon, p.lat}
			}
			b, _ := json.Marshal(coords)
			if _, err := stmtShape.Exec(rid, string(b)); err != nil {
				return err
			}
		}
	}

	// Save metadata
	metaPairs := map[string]string{
		"feed_version":           feedVersion,
		"gtfs_imported_at":       time.Now().UTC().Format(time.RFC3339),
		"catalogue_route_count":  strconv.Itoa(len(groups)),
		"vizag_route_id_count":   strconv.Itoa(len(vizagRouteIDs)),
		"vizag_stop_count":       strconv.Itoa(vizagStopCount),
		"vizag_trip_count":       strconv.Itoa(len(vizagTrips)),
	}
	for k, v := range metaPairs {
		if _, err := tx.Exec(`INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)`, k, v); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit gtfs import: %w", err)
	}

	slog.Info("GTFS Route Catalogue import complete",
		"duration", time.Since(start).Round(time.Millisecond),
		"catalogue_passenger_routes", len(groups),
		"individual_vizag_routes", len(vizagRouteIDs),
		"vizag_stops", vizagStopCount,
		"vizag_trips", len(vizagTrips),
	)
	return nil
}

func findRoute(routes []rawRoute, id string) rawRoute {
	for _, r := range routes {
		if r.id == id {
			return r
		}
	}
	return rawRoute{id: id}
}

func containsAny(s string, terms ...string) bool {
	for _, t := range terms {
		if strings.Contains(s, t) {
			return true
		}
	}
	return false
}

func ensureZipExists(zipPath, url string) error {
	if info, err := os.Stat(zipPath); err == nil && info.Size() > 1024*1024 {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(zipPath), 0o755); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}
	slog.Info("Downloading APSRTC GTFS static zip...", "url", url, "dest", zipPath)
	client := &http.Client{Timeout: 120 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "VizagTransit/1.0")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download gtfs: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download gtfs: HTTP %d", resp.StatusCode)
	}

	tmpPath := zipPath + ".tmp"
	f, err := os.Create(tmpPath)
	if err != nil {
		return err
	}
	if _, err := io.Copy(f, resp.Body); err != nil {
		f.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write gtfs zip: %w", err)
	}
	if err := f.Close(); err != nil {
		os.Remove(tmpPath)
		return err
	}
	return os.Rename(tmpPath, zipPath)
}

func readFeedVersion(f *zip.File) string {
	if f == nil {
		return ""
	}
	var version string
	_ = streamCSV(f, func(idx map[string]int, row []string) error {
		if version == "" {
			version = getCol(row, idx, "feed_version")
		}
		return nil
	})
	return version
}

func parseStops(f *zip.File) (map[string]rawStop, error) {
	out := make(map[string]rawStop, 12000)
	err := streamCSV(f, func(idx map[string]int, row []string) error {
		id := getCol(row, idx, "stop_id")
		name := getCol(row, idx, "stop_name")
		lat, err1 := strconv.ParseFloat(getCol(row, idx, "stop_lat"), 64)
		lon, err2 := strconv.ParseFloat(getCol(row, idx, "stop_lon"), 64)
		if id == "" || err1 != nil || err2 != nil || !ValidCoord(lat, lon) {
			return nil
		}
		out[id] = rawStop{
			id:      id,
			name:    name,
			lat:     lat,
			lon:     lon,
			inVizag: config.InVizagBBox(lat, lon),
		}
		return nil
	})
	return out, err
}

func parseRoutes(f *zip.File) ([]rawRoute, error) {
	var out []rawRoute
	err := streamCSV(f, func(idx map[string]int, row []string) error {
		id := getCol(row, idx, "route_id")
		if id == "" {
			return nil
		}
		desc := getCol(row, idx, "route_desc")
		cat := "Other"
		if strings.HasPrefix(desc, "City") {
			cat = "City"
		} else if strings.HasPrefix(desc, "Intercity") {
			cat = "Intercity"
		} else if strings.Contains(desc, "Neo2308") {
			cat = "Community"
		}
		rt, _ := strconv.Atoi(getCol(row, idx, "route_type"))
		if rt == 0 && getCol(row, idx, "route_type") == "" {
			rt = 3
		}
		out = append(out, rawRoute{
			id:        id,
			shortName: getCol(row, idx, "route_short_name"),
			longName:  getCol(row, idx, "route_long_name"),
			desc:      desc,
			category:  cat,
			routeType: rt,
		})
		return nil
	})
	return out, err
}

func parseTrips(f *zip.File) ([]rawTrip, map[string]string, error) {
	var out []rawTrip
	tripToRoute := make(map[string]string, 60000)
	err := streamCSV(f, func(idx map[string]int, row []string) error {
		tid := getCol(row, idx, "trip_id")
		rid := getCol(row, idx, "route_id")
		if tid == "" || rid == "" {
			return nil
		}
		tripToRoute[tid] = rid
		out = append(out, rawTrip{
			tripID:    tid,
			routeID:   rid,
			serviceID: getCol(row, idx, "service_id"),
			shortName: getCol(row, idx, "trip_short_name"),
			headsign:  getCol(row, idx, "trip_headsign"),
			shapeID:   getCol(row, idx, "shape_id"),
			tripType:  getCol(row, idx, "trip_type"),
		})
		return nil
	})
	return out, tripToRoute, err
}

func streamCSV(f *zip.File, fn func(idx map[string]int, row []string) error) error {
	if f == nil {
		return fmt.Errorf("missing required GTFS file")
	}
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	r := csv.NewReader(rc)
	r.ReuseRecord = true
	header, err := r.Read()
	if err != nil {
		return err
	}
	idx := make(map[string]int, len(header))
	for i, col := range header {
		idx[strings.TrimPrefix(strings.TrimSpace(col), "\ufeff")] = i
	}

	for {
		row, err := r.Read()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		if err := fn(idx, row); err != nil {
			return err
		}
	}
}

func getCol(row []string, idx map[string]int, name string) string {
	if i, ok := idx[name]; ok && i < len(row) {
		return strings.TrimSpace(row[i])
	}
	return ""
}
