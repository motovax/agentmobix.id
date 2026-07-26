package main

import (
	"errors"
	"flag"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	addr := flag.String("addr", envOrDefault("ADDR", ":8080"), "alamat HTTP server")
	staticDir := flag.String("static-dir", envOrDefault("STATIC_DIR", "dist"), "direktori hasil build frontend")
	flag.Parse()

	handler, err := newSPAHandler(os.DirFS(*staticDir))
	if err != nil {
		log.Fatalf("menyiapkan frontend dari %q: %v", *staticDir, err)
	}

	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Printf("webserver aktif di %s, menyajikan %s sebagai SPA", *addr, *staticDir)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func newSPAHandler(frontend fs.FS) (http.Handler, error) {
	if _, err := fs.Stat(frontend, "index.html"); err != nil {
		return nil, errors.New("index.html tidak ditemukan")
	}

	files := http.FileServer(http.FS(frontend))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok\n"))
			return
		}

		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "." || name == "" {
			name = "index.html"
		}

		info, err := fs.Stat(frontend, name)
		if err == nil && !info.IsDir() {
			setCacheHeader(w, name)
			files.ServeHTTP(w, r)
			return
		}

		// URL tanpa ekstensi adalah route milik router React.
		if filepath.Ext(name) == "" {
			serveIndex(w, r, frontend)
			return
		}

		http.NotFound(w, r)
	}), nil
}

func serveIndex(w http.ResponseWriter, r *http.Request, frontend fs.FS) {
	content, err := fs.ReadFile(frontend, "index.html")
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Content-Length", "")
	if r.Method == http.MethodHead {
		return
	}
	_, _ = w.Write(content)
}

func setCacheHeader(w http.ResponseWriter, name string) {
	if name == "index.html" {
		w.Header().Set("Cache-Control", "no-cache")
		return
	}
	if strings.HasPrefix(name, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
	if contentType := mime.TypeByExtension(filepath.Ext(name)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
