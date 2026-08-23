package users

import "time"

// Role represents a user's role in the system.
type Role string

const (
	RoleSuperAdmin      Role = "super_admin"
	RoleAdmin           Role = "admin"
	RoleSecurityManager Role = "security_manager"
	RoleDeveloper       Role = "developer"
	RoleAnalyst         Role = "analyst"
	RoleViewer          Role = "viewer"
)

// RoleUser is an alias for viewer — accepted during registration for spec compatibility.
const RoleUser Role = "user"

// ValidRoles is the set of roles allowed during registration.
var ValidRoles = map[Role]bool{
	RoleSuperAdmin:      true,
	RoleAdmin:           true,
	RoleSecurityManager: true,
	RoleDeveloper:       true,
	RoleAnalyst:         true,
	RoleViewer:          true,
	RoleUser:            true, // alias: treated as viewer
}

// Status represents whether a user account is active.
type Status string

const (
	StatusActive    Status = "active"
	StatusInactive  Status = "inactive"
	StatusSuspended Status = "suspended"
)

// User is the core user domain model.
type User struct {
	ID             string    `json:"id"`
	Username       string    `json:"username"`
	PasswordHash   string    `json:"-"` // never expose in JSON
	Role           Role      `json:"role"`
	OrganizationID string    `json:"organization_id,omitempty"`
	Status         Status    `json:"status"`
	MFASecret      string    `json:"-"` // never expose in JSON
	MFAEnabled     bool      `json:"mfa_enabled"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// PublicUser is the safe representation returned to API consumers.
type PublicUser struct {
	ID             string    `json:"id"`
	Username       string    `json:"username"`
	Role           Role      `json:"role"`
	OrganizationID string    `json:"organization_id,omitempty"`
	Status         Status    `json:"status"`
	MFAEnabled     bool      `json:"mfa_enabled"`
	CreatedAt      time.Time `json:"created_at"`
}

// ToPublic returns the safe, non-sensitive view of a user.
func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:             u.ID,
		Username:       u.Username,
		Role:           u.Role,
		OrganizationID: u.OrganizationID,
		Status:         u.Status,
		MFAEnabled:     u.MFAEnabled,
		CreatedAt:      u.CreatedAt,
	}
}
