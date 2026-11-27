package rt

import "testing"

func TestClassifyFreshness(t *testing.T) {
	if f, stale := ClassifyFreshness(30, 300); f != "fresh" || stale {
		t.Errorf("30s = (%q, %v), want (fresh, false)", f, stale)
	}
	if f, stale := ClassifyFreshness(180, 300); f != "aging" || stale {
		t.Errorf("180s = (%q, %v), want (aging, false)", f, stale)
	}
	if f, stale := ClassifyFreshness(301, 300); f != "stale" || !stale {
		t.Errorf("301s = (%q, %v), want (stale, true)", f, stale)
	}
}

func TestVehicleChanged(t *testing.T) {
	a := Vehicle{VehicleID: "v1", Lat: 17.7, Lon: 83.3, GPSTimestamp: 100}
	b := a
	if vehicleChanged(a, b) {
		t.Error("identical vehicles should not report changed")
	}
	b.Lat = 17.701
	if !vehicleChanged(a, b) {
		t.Error("moved vehicle should report changed")
	}
}
