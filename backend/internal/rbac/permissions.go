package rbac

import "github.com/nexus/identity-platform/internal/users"

// Permission is a fine-grained capability string.
type Permission string

const (
	// User management
	PermUsersRead   Permission = "users.read"
	PermUsersCreate Permission = "users.create"
	PermUsersUpdate Permission = "users.update"
	PermUsersDelete Permission = "users.delete"

	// Application management
	PermApplicationsRead   Permission = "applications.read"
	PermApplicationsManage Permission = "applications.manage"

	// Policy management
	PermPoliciesRead   Permission = "policies.read"
	PermPoliciesManage Permission = "policies.manage"

	// Audit
	PermAuditRead Permission = "audit.read"

	// Security
	PermSecurityManage Permission = "security.manage"

	// Organizations
	PermOrgsRead   Permission = "organizations.read"
	PermOrgsManage Permission = "organizations.manage"

	// Roles
	PermRolesRead   Permission = "roles.read"
	PermRolesManage Permission = "roles.manage"
)

// rolePermissions maps each role to its set of allowed permissions.
// This is the single source of truth for RBAC — handlers must NOT hardcode role checks.
var rolePermissions = map[users.Role][]Permission{
	users.RoleSuperAdmin: {
		PermUsersRead, PermUsersCreate, PermUsersUpdate, PermUsersDelete,
		PermApplicationsRead, PermApplicationsManage,
		PermPoliciesRead, PermPoliciesManage,
		PermAuditRead,
		PermSecurityManage,
		PermOrgsRead, PermOrgsManage,
		PermRolesRead, PermRolesManage,
	},
	users.RoleAdmin: {
		PermUsersRead, PermUsersCreate, PermUsersUpdate,
		PermApplicationsRead, PermApplicationsManage,
		PermPoliciesRead, PermPoliciesManage,
		PermAuditRead,
		PermOrgsRead,
		PermRolesRead,
	},
	users.RoleSecurityManager: {
		PermUsersRead,
		PermApplicationsRead,
		PermPoliciesRead, PermPoliciesManage,
		PermAuditRead,
		PermSecurityManage,
		PermRolesRead,
	},
	users.RoleDeveloper: {
		PermUsersRead,
		PermApplicationsRead, PermApplicationsManage,
		PermPoliciesRead,
	},
	users.RoleAnalyst: {
		PermUsersRead,
		PermApplicationsRead,
		PermPoliciesRead,
		PermAuditRead,
	},
	users.RoleViewer: {
		PermApplicationsRead,
	},
	users.RoleUser: {
		PermApplicationsRead,
	},
}

// HasPermission returns true if the given role holds the requested permission.
func HasPermission(role users.Role, perm Permission) bool {
	perms, ok := rolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == perm {
			return true
		}
	}
	return false
}

// PermissionsForRole returns all permissions granted to a role.
func PermissionsForRole(role users.Role) []Permission {
	return rolePermissions[role]
}
