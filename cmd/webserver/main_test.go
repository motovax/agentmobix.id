package main

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func testFrontend() fs.FS {
	return fstest.MapFS{
		"index.html":           {Data: []byte("<h1>Mobix</h1>")},
		"assets/app-1234.js":   {Data: []byte("console.log('ok')")},
		"sell-car-matrix.json": {Data: []byte("{}")},
	}
}

func TestSPAHandler(t *testing.T) {
	handler, err := newSPAHandler(testFrontend())
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name       string
		method     string
		target     string
		wantStatus int
		wantBody   string
		wantCache  string
	}{
		{"root", http.MethodGet, "/", http.StatusOK, "<h1>Mobix</h1>", "no-cache"},
		{"spa route", http.MethodGet, "/unit/toyota-avanza", http.StatusOK, "<h1>Mobix</h1>", "no-cache"},
		{"static asset", http.MethodGet, "/assets/app-1234.js", http.StatusOK, "console.log('ok')", "public, max-age=31536000, immutable"},
		{"missing asset", http.MethodGet, "/assets/missing.js", http.StatusNotFound, "404 page not found\n", ""},
		{"health", http.MethodGet, "/healthz", http.StatusOK, "ok\n", ""},
		{"method", http.MethodPost, "/", http.StatusMethodNotAllowed, "Method Not Allowed\n", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.target, nil)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, ingin %d", response.Code, tt.wantStatus)
			}
			if response.Body.String() != tt.wantBody {
				t.Fatalf("body = %q, ingin %q", response.Body.String(), tt.wantBody)
			}
			if got := response.Header().Get("Cache-Control"); got != tt.wantCache {
				t.Fatalf("Cache-Control = %q, ingin %q", got, tt.wantCache)
			}
		})
	}
}

func TestSPAHandlerRequiresIndex(t *testing.T) {
	if _, err := newSPAHandler(fstest.MapFS{}); err == nil {
		t.Fatal("mengharapkan error jika index.html tidak tersedia")
	}
}
