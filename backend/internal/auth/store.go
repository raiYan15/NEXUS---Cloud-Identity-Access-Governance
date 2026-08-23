package auth

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nexus/identity-platform/internal/users"
)

// UserStore defines the persistence interface for user data.
// This interface is implemented by both the in-memory store (Layer 1)
// and the PostgreSQL store (Layer 3), allowing seamless substitution.
type UserStore interface {
	CreateUser(u *users.User) error
	GetUserByUsername(username string) (*users.User, error)
	GetUserByID(id string) (*users.User, error)
	ListUsers() ([]*users.User, error)
	UpdateUser(u *users.User) error
}

// MemoryUserStore is a thread-safe in-memory implementation of UserStore.
// Used in Layer 1 before PostgreSQL integration.
type MemoryUserStore struct {
	mu    sync.RWMutex
	byID  map[string]*users.User
	byUsername map[string]*users.User
}

// NewMemoryUserStore creates an empty in-memory store.
func NewMemoryUserStore() *MemoryUserStore {
	return &MemoryUserStore{
		byID:       make(map[string]*users.User),
		byUsername: make(map[string]*users.User),
	}
}

func (s *MemoryUserStore) CreateUser(u *users.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.byUsername[u.Username]; exists {
		return ErrUserAlreadyExists
	}

	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	u.CreatedAt = now
	u.UpdatedAt = now

	// Store a copy to prevent external mutation
	copy := *u
	s.byID[copy.ID] = &copy
	s.byUsername[copy.Username] = &copy
	return nil
}

func (s *MemoryUserStore) GetUserByUsername(username string) (*users.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.byUsername[username]
	if !ok {
		return nil, ErrUserNotFound
	}
	copy := *u
	return &copy, nil
}

func (s *MemoryUserStore) GetUserByID(id string) (*users.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.byID[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	copy := *u
	return &copy, nil
}

func (s *MemoryUserStore) ListUsers() ([]*users.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*users.User, 0, len(s.byID))
	for _, u := range s.byID {
		copy := *u
		result = append(result, &copy)
	}
	return result, nil
}

func (s *MemoryUserStore) UpdateUser(u *users.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.byID[u.ID]
	if !ok {
		return ErrUserNotFound
	}

	u.UpdatedAt = time.Now().UTC()
	copy := *u
	s.byID[copy.ID] = &copy
	s.byUsername[copy.Username] = &copy

	// Remove old username mapping if it changed
	if existing.Username != u.Username {
		delete(s.byUsername, existing.Username)
	}
	return nil
}
