package gtfs

import (
	"math"
	"testing"
)

func TestParseGTFSTime(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"00:00:00", 0, true},
		{"08:30:15", 8*3600 + 30*60 + 15, true},
		{"24:15:00", 24*3600 + 15*60, true},
		{"25:59:59", 25*3600 + 59*60 + 59, true},
		{"", 0, false},
		{"12:65:00", 0, false},
		{"invalid", 0, false},
	}

	for _, tc := range cases {
		got, ok := ParseGTFSTime(tc.in)
		if ok != tc.ok || got != tc.want {
			t.Errorf("ParseGTFSTime(%q) = (%d, %v), want (%d, %v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestValidCoord(t *testing.T) {
	if !ValidCoord(17.7231, 83.3012) {
		t.Error("expected Vizag coord to be valid")
	}
	if ValidCoord(0, 0) {
		t.Error("expected (0,0) to be invalid")
	}
	if ValidCoord(91, 83) || ValidCoord(17, 181) {
		t.Error("expected out-of-range coords to be invalid")
	}
	if ValidCoord(math.NaN(), 83.3) {
		t.Error("expected NaN to be invalid")
	}
}

func TestHaversineMeters(t *testing.T) {
	// Maddilapalem to RK Beach is roughly 2.4-2.6 km
	d := HaversineMeters(17.73615, 83.32006, 17.71422, 83.32211)
	if d < 2000 || d > 3000 {
		t.Errorf("unexpected distance between Maddilapalem and RK Beach: %.1f m", d)
	}
}
