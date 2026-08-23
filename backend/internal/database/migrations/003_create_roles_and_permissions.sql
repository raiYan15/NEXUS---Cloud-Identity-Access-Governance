-- Migration 003: Roles and Permissions
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(32) PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    name VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_name VARCHAR(32) REFERENCES roles(name) ON DELETE CASCADE,
    permission_name VARCHAR(64) REFERENCES permissions(name) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_name)
);

-- Seed standard roles
INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Full system access across all tenants and subsystems'),
    ('admin', 'Organization administrator with user and app management'),
    ('security_manager', 'Security officer managing policies, audits, and security controls'),
    ('developer', 'Software engineer with application manage and deployment rights'),
    ('analyst', 'Security and data analyst with read permissions and audit view'),
    ('viewer', 'Read-only access to assigned resources'),
    ('user', 'Standard user with basic viewer access')
ON CONFLICT (name) DO NOTHING;

-- Seed standard permissions
INSERT INTO permissions (name, description) VALUES
    ('users.read', 'Read user profiles and lists'),
    ('users.create', 'Create new user accounts'),
    ('users.update', 'Update existing user profiles and status'),
    ('users.delete', 'Permanently delete user accounts'),
    ('applications.read', 'View registered applications'),
    ('applications.manage', 'Create, update, and delete applications'),
    ('policies.read', 'View access control policies'),
    ('policies.manage', 'Create, modify, and delete access policies'),
    ('audit.read', 'View security audit logs and events'),
    ('security.manage', 'Manage security settings, rate limits, and MFA'),
    ('organizations.read', 'View organization details'),
    ('organizations.manage', 'Manage organization settings'),
    ('roles.read', 'View roles and permission matrices'),
    ('roles.manage', 'Assign and customize role permissions')
ON CONFLICT (name) DO NOTHING;
