package rt

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	gtfspb "github.com/MobilityData/gtfs-realtime-bindings/golang/gtfs"
	"google.golang.org/protobuf/proto"

	"vizag-transit/internal/config"
	"vizag-transit/internal/gtfs"
)

var indianRegexp = regexp.MustCompile(`^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$`)

// IsIndianRegistration reports whether s matches standard Indian vehicle registration format (e.g. AP31Z0344).
func IsIndianRegistration(s string) bool {
	c := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
	if len(c) < 7 || len(c) > 12 {
		return false
	}
	return indianRegexp.MatchString(c)
}

// CleanBusID extracts a human-readable suffix or identifier from a raw GTFS vehicle ID.
func CleanBusID(vid string) string {
	parts := strings.Split(vid, "_")
	if len(parts) >= 2 {
		return parts[1]
	}
	if len(vid) > 8 {
		return vid[len(vid)-6:]
	}
	return vid
}

// Vehicle represents a validated live or recently-seen APSRTC bus in Visakhapatnam.
type Vehicle struct {
	VehicleID          string  `json:"vehicleId"`
	Label              string  `json:"label"`
	LicensePlate       string  `json:"licensePlate"`
	RegistrationNumber string  `json:"registrationNumber,omitempty"` // Real registration plate only if supplied (e.g. AP31Z0344)
	DisplayLabel       string  `json:"displayLabel"`                 // Real plate if available, otherwise neutral "Bus #ID"
	TripID             string  `json:"tripId,omitempty"`
	RouteID            string  `json:"routeId,omitempty"`
	RouteShortName     string  `json:"routeShortName,omitempty"`
	RouteLongName      string  `json:"routeLongName,omitempty"`
	Headsign           string  `json:"headsign,omitempty"`
	IsVizagRoute       bool    `json:"isVizagRoute"`
	Lat                float64 `json:"lat"`
	Lon                float64 `json:"lon"`
	Bearing            float64 `json:"bearing"`
	SpeedMPS           float64 `json:"speedMps"`
	SpeedKMH           float64 `json:"speedKmh"`
	GPSTimestamp       int64   `json:"gpsTimestamp"`
	UpdatedAt          int64   `json:"updatedAt"`
	AgeSec             int64   `json:"ageSec"`
	Freshness          string  `json:"freshness"` // "fresh" | "aging" | "stale"
	IsStale            bool    `json:"isStale"`
	NextStopID         string  `json:"nextStopId,omitempty"`
	NextStopName       string  `json:"nextStopName,omitempty"`
	NextStopSeq        int     `json:"nextStopSeq,omitempty"`
	ETASec             int64   `json:"etaSec,omitempty"`
	ETASource          string  `json:"etaSource,omitempty"` // "trip_update" | "speed_estimate" | ""
}

// FeedStatus describes the health of the GTFS-Realtime feeds.
type FeedStatus struct {
	Online          bool   `json:"online"`
	FeedTimestamp   int64  `json:"feedTimestamp"`
	LastFetchAt     int64  `json:"lastFetchAt"`
	LastSuccessAt   int64  `json:"lastSuccessAt"`
	LastError       string `json:"lastError,omitempty"`
	VehicleCount    int    `json:"vehicleCount"`
	FreshCount      int    `json:"freshCount"`
	StaleCount      int    `json:"staleCount"`
	TripUpdateCount int    `json:"tripUpdateCount"`
}

// DeltaEvent is broadcast over SSE when vehicles change.
type DeltaEvent struct {
	Type          string     `json:"type"` // "snapshot" | "delta" | "status"
	FeedTimestamp int64      `json:"feedTimestamp"`
	ServerTime    int64      `json:"serverTime"`
	Updated       []Vehicle  `json:"updated,omitempty"`
	Removed       []string   `json:"removed,omitempty"`
	Status        FeedStatus `json:"status"`
}

type routeMeta struct {
	shortName string
	longName  string
	isVizag   bool
}

type stopMeta struct {
	name string
	lat  float64
	lon  float64
}

type tripUpdateStop struct {
	stopID  string
	seq     int
	arrTime int64
}

// Poller periodically fetches GTFS-RT feeds, validates vehicles, persists changes, and notifies SSE clients.
type Poller struct {
	cfg    config.Config
	db     *sql.DB
	client *http.Client

	routes       map[string]routeMeta
	stops        map[string]stopMeta
	trips        map[string]string   // trip_id -> headsign
	tripRoutes   map[string]string   // trip_id -> route_id
	blockRoutes  map[string]string   // unambiguous block/duty code -> route_id
	prefixRoutes map[string]string   // unambiguous route_id prefix -> route_id
	routeStops   map[string][]string // route_id -> ordered stop_ids

	mu          sync.RWMutex
	vehicles    map[string]Vehicle
	tripUpdates map[string][]tripUpdateStop // trip_id -> upcoming stop updates
	status      FeedStatus
	subs        map[chan DeltaEvent]struct{}
}

// NewPoller creates a Poller and loads static GTFS lookup maps from SQLite.
func NewPoller(conn *sql.DB, cfg config.Config) (*Poller, error) {
	p := &Poller{
		cfg:          cfg,
		db:           conn,
		client:       &http.Client{Timeout: 12 * time.Second},
		routes:       make(map[string]routeMeta),
		stops:        make(map[string]stopMeta),
		trips:        make(map[string]string),
		tripRoutes:   make(map[string]string),
		blockRoutes:  make(map[string]string),
		prefixRoutes: make(map[string]string),
		routeStops:   make(map[string][]string),
		vehicles:     make(map[string]Vehicle),
		tripUpdates:  make(map[string][]tripUpdateStop),
		subs:         make(map[chan DeltaEvent]struct{}),
	}
	if err := p.loadStaticLookups(); err != nil {
		return nil, err
	}
	return p, nil
}

func (p *Poller) loadStaticLookups() error {
	prefixCandidates := make(map[string]map[string]string) // prefix -> shortName -> routeID
	rows, err := p.db.Query(`SELECT route_id, short_name, long_name, is_vizag FROM routes`)
	if err != nil {
		return fmt.Errorf("load routes: %w", err)
	}
	for rows.Next() {
		var id, sn, ln string
		var iv int
		if err := rows.Scan(&id, &sn, &ln, &iv); err == nil {
			p.routes[id] = routeMeta{shortName: sn, longName: ln, isVizag: iv == 1}
			if iv == 1 {
				if dash := strings.IndexByte(id, '-'); dash > 0 {
					pfx := strings.ToUpper(id[:dash])
					if prefixCandidates[pfx] == nil {
						prefixCandidates[pfx] = make(map[string]string)
					}
					prefixCandidates[pfx][sn] = id
				}
			}
		}
	}
	rows.Close()
	for pfx, shorts := range prefixCandidates {
		if len(shorts) == 1 {
			for _, rid := range shorts {
				p.prefixRoutes[pfx] = rid
			}
		}
	}

	srows, err := p.db.Query(`SELECT stop_id, name, lat, lon FROM stops`)
	if err != nil {
		return fmt.Errorf("load stops: %w", err)
	}
	for srows.Next() {
		var id, name string
		var lat, lon float64
		if err := srows.Scan(&id, &name, &lat, &lon); err == nil {
			p.stops[id] = stopMeta{name: name, lat: lat, lon: lon}
		}
	}
	srows.Close()

	blockShorts := make(map[string]map[string]string) // blockCode -> shortName -> routeID
	trows, err := p.db.Query(`SELECT trip_id, route_id, headsign FROM trips`)
	if err != nil {
		return fmt.Errorf("load trips: %w", err)
	}
	for trows.Next() {
		var id, rid, hs string
		if err := trows.Scan(&id, &rid, &hs); err == nil {
			p.trips[id] = hs
			p.tripRoutes[id] = rid
			if rm, ok := p.routes[rid]; ok && rm.isVizag {
				if us := strings.IndexByte(id, '_'); us > 0 {
					blk := strings.ToUpper(id[:us])
					if blockShorts[blk] == nil {
						blockShorts[blk] = make(map[string]string)
					}
					blockShorts[blk][rm.shortName] = rid
				}
			}
		}
	}
	trows.Close()
	for blk, shorts := range blockShorts {
		if len(shorts) == 1 {
			for _, rid := range shorts {
				p.blockRoutes[blk] = rid
			}
		}
	}

	rsrows, err := p.db.Query(`SELECT route_id, stop_id FROM route_stops ORDER BY route_id, stop_sequence`)
	if err != nil {
		return fmt.Errorf("load route_stops: %w", err)
	}
	for rsrows.Next() {
		var rid, sid string
		if err := rsrows.Scan(&rid, &sid); err == nil {
			p.routeStops[rid] = append(p.routeStops[rid], sid)
		}
	}
	rsrows.Close()

	return nil
}

// Start begins the background polling loop until ctx is canceled.
func (p *Poller) Start(ctx context.Context) {
	p.pollOnce(ctx)
	ticker := time.NewTicker(p.cfg.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.pollOnce(ctx)
		}
	}
}

// Subscribe registers an SSE listener and returns its channel plus an unsubscribe function.
func (p *Poller) Subscribe() (chan DeltaEvent, func()) {
	ch := make(chan DeltaEvent, 16)
	p.mu.Lock()
	p.subs[ch] = struct{}{}
	p.mu.Unlock()
	return ch, func() {
		p.mu.Lock()
		delete(p.subs, ch)
		close(ch)
		p.mu.Unlock()
	}
}

// Snapshot returns all current Vizag vehicles and feed status.
func (p *Poller) Snapshot() ([]Vehicle, FeedStatus) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	now := time.Now().Unix()
	list := make([]Vehicle, 0, len(p.vehicles))
	for _, v := range p.vehicles {
		v.AgeSec = max64(0, now-v.GPSTimestamp)
		v.Freshness, v.IsStale = ClassifyFreshness(v.AgeSec, p.cfg.StaleThresholdSec)
		list = append(list, v)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].VehicleID < list[j].VehicleID })
	return list, p.status
}

// GetVehicle returns a single vehicle by ID if present.
func (p *Poller) GetVehicle(id string) (Vehicle, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	v, ok := p.vehicles[id]
	if !ok {
		return Vehicle{}, false
	}
	now := time.Now().Unix()
	v.AgeSec = max64(0, now-v.GPSTimestamp)
	v.Freshness, v.IsStale = ClassifyFreshness(v.AgeSec, p.cfg.StaleThresholdSec)
	return v, true
}

// GetStopUpcoming returns live predicted/estimated arrivals at a given stop from TripUpdates & fresh vehicles.
func (p *Poller) GetStopUpcoming(stopID string) []StopArrival {
	p.mu.RLock()
	defer p.mu.RUnlock()
	now := time.Now().Unix()
	var arrivals []StopArrival

	byTrip := make(map[string]Vehicle, len(p.vehicles))
	for _, v := range p.vehicles {
		if v.TripID != "" {
			byTrip[v.TripID] = v
		}
	}

	for tripID, updates := range p.tripUpdates {
		for _, u := range updates {
			if u.stopID != stopID {
				continue
			}
			if u.arrTime < now-60 || u.arrTime > now+7200 {
				continue
			}
			v, hasVeh := byTrip[tripID]
			if !hasVeh {
				continue
			}
			age := max64(0, now-v.GPSTimestamp)
			freshness, isStale := ClassifyFreshness(age, p.cfg.StaleThresholdSec)
			if isStale {
				continue // Do not present stale predictions as live arrivals
			}
			arrivals = append(arrivals, StopArrival{
				VehicleID:          v.VehicleID,
				Label:              v.Label,
				RegistrationNumber: v.RegistrationNumber,
				DisplayLabel:       v.DisplayLabel,
				RouteID:            v.RouteID,
				RouteShortName:     v.RouteShortName,
				RouteLongName:      v.RouteLongName,
				Headsign:           v.Headsign,
				ETASec:             max64(0, u.arrTime-now),
				ArrivalTime:        u.arrTime,
				Source:             "trip_update",
				Freshness:          freshness,
				GPSTimestamp:       v.GPSTimestamp,
			})
		}
	}

	sort.Slice(arrivals, func(i, j int) bool { return arrivals[i].ETASec < arrivals[j].ETASec })
	return arrivals
}

// StopArrival represents a live arrival prediction at a stop.
type StopArrival struct {
	VehicleID          string `json:"vehicleId"`
	Label              string `json:"label"`
	RegistrationNumber string `json:"registrationNumber,omitempty"`
	DisplayLabel       string `json:"displayLabel"`
	RouteID            string `json:"routeId"`
	RouteShortName     string `json:"routeShortName"`
	RouteLongName      string `json:"routeLongName"`
	Headsign           string `json:"headsign,omitempty"`
	ETASec             int64  `json:"etaSec"`
	ArrivalTime        int64  `json:"arrivalTime"`
	Source             string `json:"source"`
	Freshness          string `json:"freshness"`
	GPSTimestamp       int64  `json:"gpsTimestamp"`
}

func (p *Poller) pollOnce(ctx context.Context) {
	now := time.Now().Unix()
	tuMap, tuCount, tuErr := p.fetchTripUpdates(ctx)
	if tuErr != nil {
		slog.Warn("TripUpdates fetch failed", "err", tuErr)
	}

	vpFeed, vpErr := p.fetchFeed(ctx, p.cfg.VehiclePositionsURL)
	if vpErr != nil {
		slog.Warn("VehiclePositions fetch failed", "err", vpErr)
		p.mu.Lock()
		p.status.Online = false
		p.status.LastFetchAt = now
		p.status.LastError = vpErr.Error()
		st := p.status
		p.mu.Unlock()
		p.broadcast(DeltaEvent{Type: "status", ServerTime: now, Status: st})
		return
	}

	feedTS := int64(vpFeed.GetHeader().GetTimestamp())
	if feedTS == 0 {
		feedTS = now
	}

	nextVehicles := make(map[string]Vehicle)
	freshCount, staleCount := 0, 0

	for _, ent := range vpFeed.GetEntity() {
		vp := ent.GetVehicle()
		if vp == nil || vp.GetPosition() == nil {
			continue
		}
		pos := vp.GetPosition()
		lat := float64(pos.GetLatitude())
		lon := float64(pos.GetLongitude())
		if !gtfs.ValidCoord(lat, lon) {
			continue
		}

		vid := ent.GetId()
		if vp.GetVehicle() != nil && vp.GetVehicle().GetId() != "" {
			vid = vp.GetVehicle().GetId()
		}
		tripID := vp.GetTrip().GetTripId()
		routeID := vp.GetTrip().GetRouteId()
		rm, hasRoute := p.routes[routeID]
		if !hasRoute && tripID != "" {
			if trid, ok := p.tripRoutes[tripID]; ok {
				if trm, ok2 := p.routes[trid]; ok2 {
					routeID = trid
					rm = trm
					hasRoute = true
				}
			}
		}
		if !hasRoute && vid != "" {
			parts := strings.Split(vid, "_")
			if len(parts) >= 4 {
				tripCand := parts[1] + "_" + parts[2] + "_" + parts[3]
				if trid, ok := p.tripRoutes[tripCand]; ok {
					if trm, ok2 := p.routes[trid]; ok2 && trm.isVizag {
						routeID = trid
						rm = trm
						hasRoute = true
						if tripID == "" {
							tripID = tripCand
						}
					}
				}
			}
			if !hasRoute && len(parts) >= 2 {
				code := strings.ToUpper(parts[1])
				if brid, ok := p.blockRoutes[code]; ok {
					routeID = brid
					rm = p.routes[brid]
					hasRoute = true
				} else if prid, ok := p.prefixRoutes[code]; ok {
					routeID = prid
					rm = p.routes[prid]
					hasRoute = true
				}
			}
		}
		inBBox := config.InVizagBBox(lat, lon)

		// Filter to Visakhapatnam: inside metro bbox OR assigned to a Vizag route
		if !inBBox && !(hasRoute && rm.isVizag) {
			continue
		}

		gpsTS := int64(vp.GetTimestamp())
		if gpsTS == 0 {
			gpsTS = feedTS
		}
		if gpsTS > now+120 {
			gpsTS = now
		}
		age := max64(0, now-gpsTS)
		if age > p.cfg.MaxAgeSec {
			continue
		}

		freshness, isStale := ClassifyFreshness(age, p.cfg.StaleThresholdSec)
		if isStale {
			staleCount++
		} else {
			freshCount++
		}

		label := ""
		plate := ""
		if vp.GetVehicle() != nil {
			label = vp.GetVehicle().GetLabel()
			plate = vp.GetVehicle().GetLicensePlate()
		}

		// Requirement 10 & 11: Extract real vehicle registration number ONLY if supplied by data.
		// If absent, display neutral bus label e.g. "Bus #1234" without inventing plates.
		var regNumber string
		for _, cand := range []string{plate, label} {
			c := strings.ToUpper(strings.ReplaceAll(cand, " ", ""))
			if IsIndianRegistration(c) {
				regNumber = c
				break
			}
		}

		displayLabel := regNumber
		if displayLabel == "" {
			if label != "" && !strings.Contains(label, "_") {
				displayLabel = label
			} else {
				displayLabel = "Bus #" + CleanBusID(vid)
			}
		}

		speedMPS := float64(pos.GetSpeed())
		if math.IsNaN(speedMPS) || speedMPS < 0 || speedMPS > 45 {
			speedMPS = 0
		}
		bearing := float64(pos.GetBearing())
		if math.IsNaN(bearing) || bearing < 0 || bearing >= 360 {
			bearing = 0
		}

		v := Vehicle{
			VehicleID:          vid,
			Label:              label,
			LicensePlate:       plate,
			RegistrationNumber: regNumber,
			DisplayLabel:       displayLabel,
			TripID:             tripID,
			RouteID:            routeID,
			RouteShortName:     rm.shortName,
			RouteLongName:      rm.longName,
			Headsign:           p.trips[tripID],
			IsVizagRoute:       rm.isVizag,
			Lat:                lat,
			Lon:                lon,
			Bearing:            bearing,
			SpeedMPS:           speedMPS,
			SpeedKMH:           math.Round(speedMPS*3.6*10) / 10,
			GPSTimestamp:       gpsTS,
			UpdatedAt:          now,
			AgeSec:             age,
			Freshness:          freshness,
			IsStale:            isStale,
		}

		// Associate next stop and ETA from TripUpdates if available & vehicle is not stale
		if !isStale && tripID != "" {
			if updates := tuMap[tripID]; len(updates) > 0 {
				for _, u := range updates {
					if u.arrTime >= now-30 {
						v.NextStopID = u.stopID
						v.NextStopSeq = u.seq
						if sm, ok := p.stops[u.stopID]; ok {
							v.NextStopName = sm.name
						}
						v.ETASec = max64(0, u.arrTime-now)
						v.ETASource = "trip_update"
						break
					}
				}
			}
		}

		nextVehicles[vid] = v
	}

	p.mu.Lock()
	var updated []Vehicle
	var removed []string

	// Grace period: keep vehicles that temporarily drop from a single GTFS-RT poll
	// for up to 120s before removing them, preventing buses from flickering/disappearing.
	const missingGraceSec = int64(120)
	for id, prev := range p.vehicles {
		if _, exists := nextVehicles[id]; !exists {
			if now-prev.UpdatedAt < missingGraceSec {
				if prev.GPSTimestamp > 0 {
					prev.AgeSec = now - prev.GPSTimestamp
					if prev.AgeSec < 0 {
						prev.AgeSec = 0
					}
					prev.Freshness, prev.IsStale = ClassifyFreshness(prev.GPSTimestamp, now)
				}
				nextVehicles[id] = prev
			} else {
				removed = append(removed, id)
			}
		}
	}

	for id, v := range nextVehicles {
		prev, exists := p.vehicles[id]
		if !exists || vehicleChanged(prev, v) {
			updated = append(updated, v)
		}
	}

	p.vehicles = nextVehicles
	if tuErr == nil {
		p.tripUpdates = tuMap
	}
	p.status = FeedStatus{
		Online:          true,
		FeedTimestamp:   feedTS,
		LastFetchAt:     now,
		LastSuccessAt:   now,
		VehicleCount:    len(nextVehicles),
		FreshCount:      freshCount,
		StaleCount:      staleCount,
		TripUpdateCount: tuCount,
	}
	st := p.status
	p.mu.Unlock()

	if len(updated) > 0 || len(removed) > 0 {
		if err := p.persistChanges(updated, removed); err != nil {
			slog.Warn("Failed to persist vehicle changes", "err", err)
		}
		p.broadcast(DeltaEvent{
			Type:          "delta",
			FeedTimestamp: feedTS,
			ServerTime:    now,
			Updated:       updated,
			Removed:       removed,
			Status:        st,
		})
	} else {
		p.broadcast(DeltaEvent{
			Type:          "status",
			FeedTimestamp: feedTS,
			ServerTime:    now,
			Status:        st,
		})
	}
}

func (p *Poller) fetchFeed(ctx context.Context, url string) (*gtfspb.FeedMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "VizagTransit/1.0")
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, err
	}
	var msg gtfspb.FeedMessage
	if err := proto.Unmarshal(data, &msg); err != nil {
		return nil, fmt.Errorf("unmarshal pb: %w", err)
	}
	return &msg, nil
}

func (p *Poller) fetchTripUpdates(ctx context.Context) (map[string][]tripUpdateStop, int, error) {
	msg, err := p.fetchFeed(ctx, p.cfg.TripUpdatesURL)
	if err != nil {
		return nil, 0, err
	}
	out := make(map[string][]tripUpdateStop)
	count := 0
	for _, ent := range msg.GetEntity() {
		tu := ent.GetTripUpdate()
		if tu == nil || tu.GetTrip() == nil {
			continue
		}
		tid := tu.GetTrip().GetTripId()
		rid := tu.GetTrip().GetRouteId()
		if tid == "" {
			continue
		}
		if rm, ok := p.routes[rid]; !ok || !rm.isVizag {
			hasVizagStop := false
			for _, stu := range tu.GetStopTimeUpdate() {
				if _, ok := p.stops[stu.GetStopId()]; ok {
					hasVizagStop = true
					break
				}
			}
			if !hasVizagStop {
				continue
			}
		}
		count++
		var stops []tripUpdateStop
		for _, stu := range tu.GetStopTimeUpdate() {
			var t int64
			if stu.GetArrival() != nil && stu.GetArrival().GetTime() > 0 {
				t = stu.GetArrival().GetTime()
			} else if stu.GetDeparture() != nil && stu.GetDeparture().GetTime() > 0 {
				t = stu.GetDeparture().GetTime()
			}
			if t > 0 {
				stops = append(stops, tripUpdateStop{
					stopID:  stu.GetStopId(),
					seq:     int(stu.GetStopSequence()),
					arrTime: t,
				})
			}
		}
		if len(stops) > 0 {
			sort.Slice(stops, func(i, j int) bool { return stops[i].seq < stops[j].seq })
			out[tid] = stops
		}
	}
	return out, count, nil
}

func (p *Poller) persistChanges(updated []Vehicle, removed []string) error {
	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if len(updated) > 0 {
		stmt, err := tx.Prepare(`
			INSERT INTO vehicles(vehicle_id, label, license_plate, registration_number, display_label, trip_id, route_id, lat, lon, bearing, speed_mps, gps_timestamp, updated_at, is_stale, next_stop_id, next_stop_name, next_stop_seq, eta_sec, eta_source)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(vehicle_id) DO UPDATE SET
				label=excluded.label, license_plate=excluded.license_plate,
				registration_number=excluded.registration_number, display_label=excluded.display_label,
				trip_id=excluded.trip_id, route_id=excluded.route_id, lat=excluded.lat, lon=excluded.lon,
				bearing=excluded.bearing, speed_mps=excluded.speed_mps, gps_timestamp=excluded.gps_timestamp,
				updated_at=excluded.updated_at, is_stale=excluded.is_stale, next_stop_id=excluded.next_stop_id,
				next_stop_name=excluded.next_stop_name, next_stop_seq=excluded.next_stop_seq,
				eta_sec=excluded.eta_sec, eta_source=excluded.eta_source
		`)
		if err != nil {
			return err
		}
		defer stmt.Close()
		for _, v := range updated {
			staleInt := 0
			if v.IsStale {
				staleInt = 1
			}
			if _, err := stmt.Exec(
				v.VehicleID, v.Label, v.LicensePlate, v.RegistrationNumber, v.DisplayLabel,
				v.TripID, v.RouteID, v.Lat, v.Lon, v.Bearing, v.SpeedMPS, v.GPSTimestamp, v.UpdatedAt,
				staleInt, v.NextStopID, v.NextStopName, v.NextStopSeq, v.ETASec, v.ETASource,
			); err != nil {
				return err
			}
		}
	}

	if len(removed) > 0 {
		stmtDel, err := tx.Prepare(`DELETE FROM vehicles WHERE vehicle_id = ?`)
		if err != nil {
			return err
		}
		defer stmtDel.Close()
		for _, id := range removed {
			if _, err := stmtDel.Exec(id); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (p *Poller) broadcast(ev DeltaEvent) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for ch := range p.subs {
		select {
		case ch <- ev:
		default:
		}
	}
}

// ClassifyFreshness returns ("fresh"|"aging"|"stale", isStale).
func ClassifyFreshness(ageSec, staleThresholdSec int64) (string, bool) {
	if ageSec > staleThresholdSec {
		return "stale", true
	}
	if ageSec > 120 {
		return "aging", false
	}
	return "fresh", false
}

func vehicleChanged(a, b Vehicle) bool {
	return a.Lat != b.Lat ||
		a.Lon != b.Lon ||
		a.Bearing != b.Bearing ||
		a.SpeedMPS != b.SpeedMPS ||
		a.GPSTimestamp != b.GPSTimestamp ||
		a.TripID != b.TripID ||
		a.RouteID != b.RouteID ||
		a.IsStale != b.IsStale ||
		a.NextStopID != b.NextStopID ||
		a.ETASec != b.ETASec
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
