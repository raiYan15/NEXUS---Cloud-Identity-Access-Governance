package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log"
	"sort"
	"time"

	_ "github.com/lib/pq"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// Config holds DB connection parameters.
type Config struct {
	URL          string
	MaxOpenConns int
	MaxIdleConns int
	MaxIdleTime  time.Duration
}

// ConnectPostgres connects to PostgreSQL and applies embedded SQL migrations.
func ConnectPostgres(cfg Config) (*sql.DB, error) {
	if cfg.URL == "" {
		return nil, fmt.Errorf("database: empty connection URL")
	}

	db, err := sql.Open("postgres", cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("database: failed to open postgres connection: %w", err)
	}

	maxOpen := cfg.MaxOpenConns
	if maxOpen <= 0 {
		maxOpen = 25
	}
	maxIdle := cfg.MaxIdleConns
	if maxIdle <= 0 {
		maxIdle = 5
	}
	maxIdleTime := cfg.MaxIdleTime
	if maxIdleTime <= 0 {
		maxIdleTime = 15 * time.Minute
	}

	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxIdleTime(maxIdleTime)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database: ping failed: %w", err)
	}

	if err := RunMigrations(db); err != nil {
		return nil, fmt.Errorf("database: migrations failed: %w", err)
	}

	log.Println("[INFO] PostgreSQL connected and all migrations applied successfully")
	return db, nil
}

// RunMigrations executes all embedded SQL migrations in lexicographical order.
func RunMigrations(db *sql.DB) error {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && len(entry.Name()) > 4 && entry.Name()[len(entry.Name())-4:] == ".sql" {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		content, err := migrationFiles.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", name, err)
		}

		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", name, err)
		}
		log.Printf("[INFO] Migration applied: %s", name)
	}

	return nil
}
