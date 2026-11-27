export interface FeedStatus {
  online: boolean;
  feedTimestamp: number;
  lastFetchAt: number;
  lastSuccessAt: number;
  lastError?: string;
  vehicleCount: number;
  freshCount: number;
  staleCount: number;
  tripUpdateCount: number;
}

export type Freshness = 'fresh' | 'aging' | 'stale';

export interface Vehicle {
  vehicleId: string;
  label: string;
  licensePlate: string;
  registrationNumber?: string;
  displayLabel?: string;
  tripId?: string;
  routeId?: string;
  routeShortName?: string;
  routeLongName?: string;
  headsign?: string;
  isVizagRoute: boolean;
  lat: number;
  lon: number;
  bearing: number;
  speedMps: number;
  speedKmh: number;
  gpsTimestamp: number;
  updatedAt: number;
  ageSec: number;
  freshness: Freshness;
  isStale: boolean;
  nextStopId?: string;
  nextStopName?: string;
  nextStopSeq?: number;
  etaSec?: number;
  etaSource?: 'trip_update' | 'speed_estimate' | '';
}

export interface CatalogueEntry {
  routeNumber: string;
  primaryRouteId: string;
  primaryLongName: string;
  classification: 'vizag_city' | 'vizag_regional' | 'intercity' | string;
  confidence: string;
  classificationReason: string;
  variantCount: number;
  totalTrips: number;
  totalStops: number;
  origin: string;
  destination: string;
  activeVehicles: number;
}

export interface CatalogueResponse {
  catalogue: CatalogueEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface VehicleStopProgress {
  sequence: number;
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  scheduledTime?: string;
  status: 'completed' | 'next' | 'upcoming' | 'unknown';
}

export interface VehicleDetailResponse {
  vehicle: Vehicle;
  stops: VehicleStopProgress[];
  shape?: [number, number][];
  origin?: string;
  destination?: string;
}

export interface RouteSummary {
  routeId: string;
  shortName: string;
  longName: string;
  category: string;
  origin?: string;
  destination?: string;
  routeDesc?: string;
  stopCount: number;
  tripCount: number;
  activeVehicles: number;
}

export interface RouteStop {
  sequence: number;
  stopId: string;
  name: string;
  lat: number;
  lon: number;
}

export interface RouteVariant {
  routeId: string;
  longName: string;
  stopCount: number;
  tripCount: number;
}

export interface RouteDetail {
  route: RouteSummary;
  stops: RouteStop[];
  shape: [number, number][];
  variants: RouteVariant[];
  vehicles: Vehicle[];
  isVizag: boolean;
  classification?: string;
  confidence?: string;
  classificationReason?: string;
  origin?: string;
  destination?: string;
}

export interface StopItem {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  inVizag: boolean;
}

export interface NearbyStop {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  routes: string[];
}

export interface LiveArrival {
  vehicleId: string;
  label: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  headsign?: string;
  etaSec: number;
  arrivalTime: number;
  source: string;
  freshness: Freshness;
  gpsTimestamp: number;
}

export interface ScheduledDeparture {
  tripId: string;
  routeId: string;
  shortName: string;
  longName: string;
  headsign: string;
  departureTime: string;
  minutesAway: number;
}

export interface StopDetail {
  stop: StopItem;
  routes: { routeId: string; shortName: string; longName: string; category: string }[];
  liveArrivals: LiveArrival[];
  scheduled: ScheduledDeparture[];
  feedStatus: FeedStatus;
}

export interface SearchResponse {
  routes: RouteSummary[];
  stops: StopItem[];
  vehicles: Vehicle[];
}

export interface JourneyLiveBus {
  vehicleId: string;
  label: string;
  registrationNumber?: string;
  freshness: Freshness;
  ageSec: number;
  speedKmh: number;
  nextStopName?: string;
  etaSec?: number;
  directionMatch: boolean;
}

export interface JourneyScheduledTrip {
  tripId: string;
  departureTime: string;
  arrivalTime: string;
  minutesAway: number;
  headsign?: string;
}

export interface JourneyLeg {
  routeId: string;
  shortName: string;
  longName: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  stopCount: number;
  estMinutes: number;
  totalScheduledToday?: number;
  liveBuses?: JourneyLiveBus[];
  scheduledTrips?: JourneyScheduledTrip[];
}

export interface JourneyOption {
  type: 'direct' | 'transfer';
  totalMinutes: number;
  walkDistanceM: number;
  transfers: number;
  legs: JourneyLeg[];
  durationSource: 'gtfs_schedule' | 'stop_estimate';
}

export interface JourneyResponse {
  journeys: JourneyOption[];
  message?: string;
}

export interface SavedItem {
  kind: 'route' | 'stop';
  id: string;
  title: string;
  subtitle: string;
  savedAt: number;
}

export interface SavedJourney {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  tag?: 'home' | 'work' | 'commute';
  savedAt: number;
}

export type Language = 'en' | 'te';

export type ReportKind =
  | 'bus_did_not_arrive'
  | 'bus_skipped_stop'
  | 'wrong_stop_location'
  | 'wrong_route_info'
  | 'wrong_gps_position';

export interface BusAlert {
  id: string;
  routeId: string;
  routeShortName: string;
  stopId: string;
  stopName: string;
  thresholdMin: 10 | 5 | 2;
  triggered: boolean;
  createdAt: number;
}

export type NavTab = 'explore' | 'routes' | 'saved' | 'stops' | 'buses';

export type Selection =
  | { kind: 'vehicle'; id: string }
  | { kind: 'route'; id: string }
  | { kind: 'stop'; id: string }
  | null;
