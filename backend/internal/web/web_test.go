package web

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestSPAHandler(t *testing.T) {
	mockFS := fstest.MapFS{
		"index.html": &fstest.MapFile{
			Data: []byte("<!DOCTYPE html><html><head><title>Vizag Transit</title></head><body><div id=\"root\"></div></body></html>"),
		},
		"assets/index-12345.js": &fstest.MapFile{
			Data: []byte("console.log('vizag-transit');"),
		},
		"assets/index-12345.css": &fstest.MapFile{
			Data: []byte("body { margin: 0; }"),
		},
		"vite.svg": &fstest.MapFile{
			Data: []byte("<svg></svg>"),
		},
	}

	handler := SPAHandler(mockFS)

	tests := []struct {
		name           string
		method         string
		path           string
		expectedStatus int
		expectInBody   string
		expectHeader   string
		expectHeaderVal string
	}{
		{
			name:           "Root returns index.html",
			method:         http.MethodGet,
			path:           "/",
			expectedStatus: http.StatusOK,
			expectInBody:   "Vizag Transit",
			expectHeader:   "Cache-Control",
			expectHeaderVal: "no-cache",
		},
		{
			name:           "SPA route returns index.html",
			method:         http.MethodGet,
			path:           "/routes/28K",
			expectedStatus: http.StatusOK,
			expectInBody:   "Vizag Transit",
		},
		{
			name:           "Another SPA route returns index.html",
			method:         http.MethodGet,
			path:           "/stops/s101",
			expectedStatus: http.StatusOK,
			expectInBody:   "Vizag Transit",
		},
		{
			name:           "Asset JS served with cache headers",
			method:         http.MethodGet,
			path:           "/assets/index-12345.js",
			expectedStatus: http.StatusOK,
			expectInBody:   "console.log('vizag-transit');",
			expectHeader:   "Cache-Control",
			expectHeaderVal: "max-age=31536000",
		},
		{
			name:           "Static SVG served",
			method:         http.MethodGet,
			path:           "/vite.svg",
			expectedStatus: http.StatusOK,
			expectInBody:   "<svg></svg>",
		},
		{
			name:           "Missing asset with extension returns 404",
			method:         http.MethodGet,
			path:           "/assets/missing.js",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "POST request not allowed",
			method:         http.MethodPost,
			path:           "/",
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(tc.method, tc.path, nil)
			handler.ServeHTTP(rec, req)

			if rec.Code != tc.expectedStatus {
				t.Fatalf("expected status %d, got %d", tc.expectedStatus, rec.Code)
			}
			body, _ := io.ReadAll(rec.Body)
			if tc.expectInBody != "" && !strings.Contains(string(body), tc.expectInBody) {
				t.Fatalf("expected body to contain %q, got %q", tc.expectInBody, string(body))
			}
			if tc.expectHeader != "" && tc.expectHeaderVal != "" {
				val := rec.Header().Get(tc.expectHeader)
				if !strings.Contains(val, tc.expectHeaderVal) {
					t.Fatalf("expected header %s to contain %q, got %q", tc.expectHeader, tc.expectHeaderVal, val)
				}
			}
		})
	}
}
