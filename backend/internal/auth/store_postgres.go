package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/nexus/identity-platform/internal/users"
)

// PostgresUserStore implements UserStore using a PostgreSQL database.
type PostgresUserStore struct {
	db *sql.DB
}

// NewPostgresUserStore creates a new PostgresUserStore.
func NewPostgresUserStore(db *sql.DB) *PostgresUserStore {
	return &PostgresUserStore{db: db}
}

func (s *PostgresUserStore) CreateUser(u *users.User) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	u.CreatedAt = now
	u.UpdatedAt = now

	query := `
		INSERT INTO users (id, username, password_hash, role, organization_id, status, mfa_secret, mfa_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8, $9, $10)
	`
	_, err := s.db.Exec(query,
		u.ID,
		u.Username,
		u.PasswordHash,
		string(u.Role),
		u.OrganizationID,
		string(u.Status),
		u.MFASecret,
		u.MFAEnabled,
		u.CreatedAt,
		u.UpdatedAt,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("postgres create user: %w", err)
	}
	return nil
}

func (s *PostgresUserStore) GetUserByUsername(username string) (*users.User, error) {
	query := `
		SELECT id, username, password_hash, role, COALESCE(organization_id, ''), status, COALESCE(mfa_secret, ''), mfa_enabled, created_at, updated_at
		FROM users
		WHERE username = $1
	`
	var u users.User
	var roleStr, statusStr string
	err := s.db.QueryRow(query, username).Scan(
		&u.ID,
		&u.Username,
		&u.PasswordHash,
		&roleStr,
		&u.OrganizationID,
		&statusStr,
		&u.MFASecret,
		&u.MFAEnabled,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("postgres get user by username: %w", err)
	}

	u.Role = users.Role(roleStr)
	u.Status = users.Status(statusStr)
	return &u, nil
}

func (s *PostgresUserStore) GetUserByID(id string) (*users.User, error) {
	query := `
		SELECT id, username, password_hash, role, COALESCE(organization_id, ''), status, COALESCE(mfa_secret, ''), mfa_enabled, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u users.User
	var roleStr, statusStr string
	err := s.db.QueryRow(query, id).Scan(
		&u.ID,
		&u.Username,
		&u.PasswordHash,
		&roleStr,
		&u.OrganizationID,
		&statusStr,
		&u.MFASecret,
		&u.MFAEnabled,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("postgres get user by id: %w", err)
	}

	u.Role = users.Role(roleStr)
	u.Status = users.Status(statusStr)
	return &u, nil
}

func (s *PostgresUserStore) ListUsers() ([]*users.User, error) {
	query := `
		SELECT id, username, password_hash, role, COALESCE(organization_id, ''), status, COALESCE(mfa_secret, ''), mfa_enabled, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("postgres list users: %w", err)
	}
	defer rows.Close()

	var result []*users.User
	for rows.Next() {
		var u users.User
		var roleStr, statusStr string
		if err := rows.Scan(
			&u.ID,
			&u.Username,
			&u.PasswordHash,
			&roleStr,
			&u.OrganizationID,
			&statusStr,
			&u.MFASecret,
			&u.MFAEnabled,
			&u.CreatedAt,
			&u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("postgres scan user: %w", err)
		}
		u.Role = users.Role(roleStr)
		u.Status = users.Status(statusStr)
		result = append(result, &u)
	}
	return result, rows.Err()
}

func (s *PostgresUserStore) UpdateUser(u *users.User) error {
	u.UpdatedAt = time.Now().UTC()
	query := `
		UPDATE users
		SET username = $1, password_hash = $2, role = $3, organization_id = NULLIF($4, ''), status = $5, mfa_secret = $6, mfa_enabled = $7, updated_at = $8
		WHERE id = $9
	`
	res, err := s.db.Exec(query,
		u.Username,
		u.PasswordHash,
		string(u.Role),
		u.OrganizationID,
		string(u.Status),
		u.MFASecret,
		u.MFAEnabled,
		u.UpdatedAt,
		u.ID,
	)
	if err != nil {
		return fmt.Errorf("postgres update user: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrUserNotFound
	}
	return nil
}
