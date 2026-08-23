package audit

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// PostgresLogger writes audit logs to PostgreSQL and falls back to console logging.
type PostgresLogger struct {
	db *sql.DB
}

// NewPostgresLogger creates a new PostgresLogger.
func NewPostgresLogger(db *sql.DB) *PostgresLogger {
	return &PostgresLogger{db: db}
}

// Log records an audit event to PostgreSQL.
func (p *PostgresLogger) Log(event Event) {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_logs (id, user_id, action, resource, ip_address, user_agent, metadata, timestamp)
		VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7, $8)
	`
	go func() {
		_, err := p.db.Exec(query,
			event.ID,
			event.UserID,
			string(event.Action),
			event.Resource,
			event.IPAddress,
			event.UserAgent,
			metadataJSON,
			event.Timestamp,
		)
		if err != nil {
			log.Printf("[ERROR] PostgresLogger failed to write audit event: %v", err)
		}
	}()

	log.Printf("[AUDIT] %s user=%s ip=%s", event.Action, event.UserID, event.IPAddress)
}

// List returns a page of audit logs from PostgreSQL.
func (p *PostgresLogger) List(page, pageSize int) ([]Event, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM audit_logs`
	if err := p.db.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("postgres count audit logs: %w", err)
	}

	offset := (page - 1) * pageSize
	query := `
		SELECT id, COALESCE(user_id, ''), action, resource, ip_address, user_agent, metadata, timestamp
		FROM audit_logs
		ORDER BY timestamp DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := p.db.Query(query, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("postgres query audit logs: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var actionStr string
		var metaRaw []byte
		if err := rows.Scan(
			&e.ID,
			&e.UserID,
			&actionStr,
			&e.Resource,
			&e.IPAddress,
			&e.UserAgent,
			&metaRaw,
			&e.Timestamp,
		); err != nil {
			return nil, 0, fmt.Errorf("postgres scan audit log: %w", err)
		}
		e.Action = Action(actionStr)
		if len(metaRaw) > 0 {
			_ = json.Unmarshal(metaRaw, &e.Metadata)
		}
		events = append(events, e)
	}

	return events, total, rows.Err()
}
