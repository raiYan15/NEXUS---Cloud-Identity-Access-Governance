import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { User, Key, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const token = api.getToken();

  // Decode JWT payload for inspection (client-side visualization only)
  let decodedPayload: Record<string, unknown> | null = null;
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        decodedPayload = JSON.parse(atob(parts[1]));
      }
    } catch {
      decodedPayload = null;
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Session & Profile Settings</h1>
          <p className="page-subtitle">
            Authenticated identity context, active session claims, and cryptographic token inspection
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <User size={18} color="#3b82f6" />
              Authenticated Identity
            </div>
            <span className="badge badge-blue">Verified</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Username</span>
              <span style={{ fontWeight: 600 }}>{user?.username}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Assigned Role</span>
              <span className="badge badge-purple">{user?.role}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Account Status</span>
              <span className="badge badge-green">{user?.status}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>MFA Verified</span>
              <span>{user?.mfa_enabled ? 'Enforced' : 'Optional'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Identity ID</span>
              <span className="code-inline">{user?.id}</span>
            </div>
          </div>
        </div>

        {/* Token Storage Architecture Note */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Shield size={18} color="#10b981" />
              Security Architecture & Storage Note
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why not localStorage?</strong>
            </p>
            <p style={{ marginBottom: '12px' }}>
              In accordance with security best practices, NEXUS stores JWT tokens in React memory / session storage, preventing persistent exposure to cross-site scripting (XSS) attacks.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Token Expiration:</strong> Tokens are issued with a 24-hour expiration window signed via HS256 with keys loaded securely from AWS Secrets Manager.
            </p>
          </div>
        </div>
      </div>

      {/* Raw JWT Token Inspector */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Key size={18} color="#8b5cf6" />
            JWT Token Inspector (Decoded Claims)
          </div>
          <span className="badge badge-purple">RFC 7519 Compliant</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Decoded Payload Claims:
          </div>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: '#93c5fd',
              background: 'rgba(0,0,0,0.4)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              overflowX: 'auto',
            }}
          >
            {decodedPayload ? JSON.stringify(decodedPayload, null, 2) : 'No token present'}
          </pre>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Raw Signed Token:
          </div>
          <div
            className="code-inline"
            style={{
              display: 'block',
              padding: '12px',
              fontSize: '11px',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              color: '#a78bfa',
            }}
          >
            {token || 'No active token'}
          </div>
        </div>
      </div>
    </div>
  );
};
