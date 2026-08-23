-- Migration 004: Applications
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon VARCHAR(64) NOT NULL DEFAULT 'cloud',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO applications (id, name, slug, description, icon) VALUES
    ('app-aws-console', 'AWS Management Console', 'aws-console', 'Core cloud infrastructure console', 'aws'),
    ('app-prod-db', 'Production PostgreSQL Database', 'prod-db', 'Customer data & transaction storage', 'database'),
    ('app-reporting', 'Executive Reporting Dashboard', 'reporting-dashboard', 'Business analytics & intelligence portal', 'chart'),
    ('app-vault', 'Cloud Secrets Vault', 'secrets-vault', 'Production secrets & encryption keys', 'key')
ON CONFLICT (id) DO NOTHING;
