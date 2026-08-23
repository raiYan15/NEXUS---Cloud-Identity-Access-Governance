-- Migration 005: Policies table
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    application VARCHAR(64) NOT NULL,
    require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
    require_trusted_device BOOLEAN NOT NULL DEFAULT FALSE,
    max_risk_score INT NOT NULL DEFAULT 0,
    decision VARCHAR(32) NOT NULL DEFAULT 'ALLOW',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO policies (id, name, role, application, require_mfa, require_trusted_device, max_risk_score, decision, enabled) VALUES
    ('pol-dev-aws', 'Developer AWS Console Access', 'developer', 'aws-console', TRUE, TRUE, 70, 'ALLOW', TRUE),
    ('pol-admin-all', 'Admin Full Access', 'admin', '*', TRUE, FALSE, 50, 'ALLOW', TRUE),
    ('pol-viewer-read', 'Viewer Read-Only', 'viewer', '*', FALSE, FALSE, 0, 'ALLOW', TRUE),
    ('pol-sec-vault', 'Security Manager Vault Access', 'security_manager', 'secrets-vault', TRUE, TRUE, 40, 'ALLOW', TRUE)
ON CONFLICT (id) DO NOTHING;
