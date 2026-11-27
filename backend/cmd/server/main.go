package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"vizag-transit/internal/api"
	"vizag-transit/internal/config"
	"vizag-transit/internal/db"
	"vizag-transit/internal/gtfs"
	"vizag-transit/internal/rt"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := config.Load()
	conn, err := db.Open(cfg.DBPath)
	if err != nil {
		slog.Error("Failed to open SQLite database", "err", err)
		os.Exit(1)
	}
	defer conn.Close()

	if err := gtfs.EnsureImported(conn, cfg); err != nil {
		slog.Error("Failed to import GTFS static data", "err", err)
		os.Exit(1)
	}

	poller, err := rt.NewPoller(conn, cfg)
	if err != nil {
		slog.Error("Failed to initialize RT poller", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go poller.Start(ctx)

	handler := api.NewServer(conn, poller)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("Vizag Transit backend listening", "addr", "http://localhost:"+cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down server...")
	shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutCtx)
}
