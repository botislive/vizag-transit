package web

import (
	"embed"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"path/filepath"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

// DistFS returns an fs.FS rooted at the embedded "dist" directory.
func DistFS() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}

// Handler returns an http.Handler that serves the embedded single-page application.
// - Static assets (e.g. under /assets/*) are served with long-term caching.
// - Root files (e.g. /favicon.ico, /vite.svg) are served directly.
// - Non-existent file requests with extensions return 404 (preventing HTML fallback for missing assets).
// - All other routes (e.g. /, /routes, /stops, /journey) fallback to index.html with no-cache headers.
func Handler() http.Handler {
	sub, err := DistFS()
	if err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Web assets not available", http.StatusServiceUnavailable)
		})
	}
	return SPAHandler(sub)
}

// SPAHandler returns an http.Handler for any fs.FS representing the SPA.
func SPAHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if cleanPath == "" || cleanPath == "." {
			serveIndexHTML(w, r, fsys)
			return
		}

		// Check if file exists in the filesystem
		f, err := fsys.Open(cleanPath)
		if err == nil {
			stat, statErr := f.Stat()
			_ = f.Close()
			if statErr == nil && !stat.IsDir() {
				if strings.HasPrefix(cleanPath, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				ext := filepath.Ext(cleanPath)
				if ctype := mime.TypeByExtension(ext); ctype != "" {
					w.Header().Set("Content-Type", ctype)
				}
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// If path has a file extension (e.g. .js, .css, .png) and was not found, return 404
		if filepath.Ext(cleanPath) != "" {
			http.NotFound(w, r)
			return
		}

		// Otherwise, it's an SPA route (e.g. /routes, /stops, /explore)
		serveIndexHTML(w, r, fsys)
	})
}

func serveIndexHTML(w http.ResponseWriter, r *http.Request, fsys fs.FS) {
	indexFile, err := fsys.Open("index.html")
	if err != nil {
		http.Error(w, "Index file not found", http.StatusNotFound)
		return
	}
	defer indexFile.Close()

	stat, err := indexFile.Stat()
	if err != nil {
		http.Error(w, "Cannot stat index.html", http.StatusInternalServerError)
		return
	}

	seeker, ok := indexFile.(io.ReadSeeker)
	if !ok {
		content, err := io.ReadAll(indexFile)
		if err != nil {
			http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(content)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeContent(w, r, "index.html", stat.ModTime(), seeker)
}
