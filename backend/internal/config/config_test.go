package config

import (
	"os"
	"testing"
)

func TestConfigPortBinding(t *testing.T) {
	tests := []struct {
		name         string
		envPort      string
		expectedPort string
	}{
		{
			name:         "Default port when unset",
			envPort:      "",
			expectedPort: "8080",
		},
		{
			name:         "Plain port number",
			envPort:      "3000",
			expectedPort: "3000",
		},
		{
			name:         "Port with leading colon",
			envPort:      ":9000",
			expectedPort: "9000",
		},
		{
			name:         "Port with whitespace",
			envPort:      "  8888  ",
			expectedPort: "8888",
		},
		{
			name:         "Empty after colon trim",
			envPort:      ":",
			expectedPort: "8080",
		},
	}

	origPort := os.Getenv("PORT")
	defer func() {
		if origPort != "" {
			_ = os.Setenv("PORT", origPort)
		} else {
			_ = os.Unsetenv("PORT")
		}
	}()

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if tc.envPort != "" {
				_ = os.Setenv("PORT", tc.envPort)
			} else {
				_ = os.Unsetenv("PORT")
			}

			cfg := Load()
			if cfg.Port != tc.expectedPort {
				t.Fatalf("expected Port=%q, got %q", tc.expectedPort, cfg.Port)
			}
		})
	}
}
