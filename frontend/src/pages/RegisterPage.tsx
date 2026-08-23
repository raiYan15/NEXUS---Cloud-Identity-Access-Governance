import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Shield,
  Cloud,
  ChevronDown,
} from 'lucide-react';
import { Role } from '../types';

const ROLES: { value: Role; label: string; desc: string; color: string }[] = [
  { value: 'viewer',           label: 'Viewer',           desc: 'Read-only catalog access',          color: '#00d68f' },
  { value: 'developer',        label: 'Developer',        desc: 'Application manage + AWS console',   color: '#1d6ff0' },
  { value: 'analyst',          label: 'Analyst',          desc: 'Audit logs + reports access',        color: '#00c2e0' },
  { value: 'security_manager', label: 'Security Manager', desc: 'Policy & MFA governance',           color: '#f5a623' },
  { value: 'admin',            label: 'Administrator',    desc: 'Full org management',               color: '#7c5ef6' },
];

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const selectedRole = ROLES.find((r) => r.value === role)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(username, password, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* ── Left panel ───────────────────────────────────────── */}
      <div className="auth-panel-left">
        <div className="auth-left-content">
          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Shield size={22} />
            </div>
            <span className="auth-brand-text">NEXUS</span>
          </div>

          <h1 className="auth-headline">
            Provision<br />
            <span>Your Cloud</span><br />
            Identity
          </h1>

          <p className="auth-description">
            Create a role-governed user identity within the NEXUS
            organization. Roles determine RBAC permissions and
            contextual PBAC policy evaluation across all applications.
          </p>

          {/* Role info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {ROLES.map((r) => (
              <div
                key={r.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: role === r.value ? 'rgba(29,111,240,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${role === r.value ? 'rgba(29,111,240,0.3)' : 'var(--border-dim)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'default',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{r.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="auth-panel-right">
        {/* AWS live badge */}
        <div className="auth-aws-badge">
          <span className="aws-dot" />
          AWS LIVE
        </div>

        <div className="auth-box">
          {/* Header */}
          <div className="auth-form-header">
            <div className="auth-form-eyebrow">
              <Cloud size={12} /> Identity Provisioning
            </div>
            <h2 className="auth-form-title">Create NEXUS Identity</h2>
            <p className="auth-form-subtitle">
              Provision a new role-governed user in the organization.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="register-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">
                Username
              </label>
              <div className="input-wrapper">
                <UserIcon size={15} className="input-icon" />
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="form-help">Minimum 3 characters, alphanumeric.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-help">Minimum 8 characters. Stored as Bcrypt hash (cost 12).</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-role">
                Assigned Role
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              {/* Selected role pill */}
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: selectedRole.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedRole.label}</span>
                <span>— {selectedRole.desc}</span>
                <UserCheck size={12} style={{ marginLeft: 'auto', color: selectedRole.color }} />
              </div>
              <div className="form-help">Determines RBAC permissions and PBAC policy evaluation.</div>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              className="btn-auth"
              disabled={isSubmitting}
              style={{ marginTop: '4px' }}
            >
              {isSubmitting ? 'Provisioning Identity...' : (
                <>
                  Create Identity
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security strip */}
          <div className="auth-security-strip">
            <div className="security-item">
              <span className="security-item-dot" />
              RBAC Governed
            </div>
            <div className="security-item">
              <span className="security-item-dot" />
              PBAC Policy
            </div>
            <div className="security-item">
              <span className="security-item-dot" />
              Bcrypt·12
            </div>
          </div>

          {/* Footer link */}
          <div className="auth-footer-link">
            Already provisioned?{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
