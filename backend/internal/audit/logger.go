package audit

import (
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// MemoryLogger is a thread-safe in-memory audit logger for use before PostgreSQL.
type MemoryLogger struct {
	mu     sync.RWMutex
	events []Event
}

// NewMemoryLogger creates an empty MemoryLogger.
func NewMemoryLogger() *MemoryLogger {
	return &MemoryLogger{
		events: make([]Event, 0, 256),
	}
}

// Log records an audit event. It fills in the ID and Timestamp if not set.
func (m *MemoryLogger) Log(event Event) {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	m.mu.Lock()
	m.events = append(m.events, event)
	m.mu.Unlock()

	log.Printf("[AUDIT] %s user=%s ip=%s", event.Action, event.UserID, event.IPAddress)
}

// List returns a page of audit events in reverse-chronological order.
func (m *MemoryLogger) List(page, pageSize int) ([]Event, int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	total := len(m.events)
	if total == 0 {
		return []Event{}, 0, nil
	}

	// Reverse a copy
	reversed := make([]Event, total)
	for i, e := range m.events {
		reversed[total-1-i] = e
	}

	start := (page - 1) * pageSize
	if start >= total {
		return []Event{}, total, nil
	}
	end := start + pageSize
	if end > total {
		end = total
	}

	return reversed[start:end], total, nil
}
