import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Shield,
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  Cloud,
  Cpu,
  Activity,
} from 'lucide-react';

const FEATURES = [
  { label: 'Zero-Trust policy engine with contextual PBAC', color: '' },
  { label: 'RFC 6238 TOTP multi-factor authentication', color: 'green' },
  { label: 'AWS Secrets Manager key vault integration', color: 'cyan' },
  { label: 'Bcrypt-hashed credentials (cost 12)', color: 'amber' },
];

const DEMO_ACCOUNTS = [
  { label: 'Admin', username: 'admin', password: 'AdminPassword123!', color: '#7c5ef6' },
  { label: 'Developer', username: 'developer', password: 'DevPassword123!', color: '#1d6ff0' },
  { label: 'Sec Manager', username: 'secmgr', password: 'SecPassword123!', color: '#ff3b5b' },
  { label: 'Viewer', username: 'viewer', password: 'ViewerPassword123!', color: '#00d68f' },
];

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
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

          {/* Headline */}
          <h1 className="auth-headline">
            Cloud Identity<br />
            <span>& Access</span><br />
            Governance
          </h1>

          <p className="auth-description">
            A production-grade Zero-Trust IAM platform with role-based
            access control, contextual policy evaluation, MFA, and live
            AWS Secrets Manager integration.
          </p>

          {/* Feature list */}
          <ul className="auth-features">
            {FEATURES.map((f) => (
              <li key={f.label} className="auth-feature-item">
                <span className={`auth-feature-dot ${f.color}`} />
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative topology SVG */}
        <svg
          className="auth-topology"
          width="320"
          height="400"
          viewBox="0 0 320 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.12 }}
        >
          <circle cx="160" cy="200" r="100" stroke="#1d6ff0" strokeWidth="1" />
          <circle cx="160" cy="200" r="60" stroke="#00c2e0" strokeWidth="0.5" />
          <circle cx="160" cy="200" r="20" fill="#1d6ff0" opacity="0.5" />
          <line x1="160" y1="100" x2="80" y2="300" stroke="#1d6ff0" strokeWidth="0.5" />
          <line x1="160" y1="100" x2="240" y2="300" stroke="#00c2e0" strokeWidth="0.5" />
          <line x1="80" y1="300" x2="240" y2="300" stroke="#7c5ef6" strokeWidth="0.5" />
          <circle cx="160" cy="100" r="8" fill="#1d6ff0" />
          <circle cx="80" cy="300" r="8" fill="#00c2e0" />
          <circle cx="240" cy="300" r="8" fill="#7c5ef6" />
        </svg>
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
              <Cloud size={12} /> Secure Authentication
            </div>
            <h2 className="auth-form-title">Sign in to NEXUS</h2>
            <p className="auth-form-subtitle">
              Enter your credentials to access the platform.
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
          <form onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div className="input-wrapper">
                <UserIcon size={15} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn-auth"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Activity size={15} style={{ animation: 'beacon 1s linear infinite' }} />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security strip */}
          <div className="auth-security-strip">
            <div className="security-item">
              <span className="security-item-dot" />
              HS256 JWT
            </div>
            <div className="security-item">
              <span className="security-item-dot" />
              Bcrypt·12
            </div>
            <div className="security-item">
              <span className="security-item-dot" />
              TOTP MFA
            </div>
            <div className="security-item">
              <span className="security-item-dot" />
              Rate Limited
            </div>
          </div>

          {/* Quick demo accounts */}
          <div className="demo-accounts">
            <div className="demo-label">Quick Demo Accounts</div>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  id={`demo-${acc.username}`}
                  className="demo-btn"
                  onClick={() => handleQuickLogin(acc.username, acc.password)}
                >
                  <Cpu size={12} style={{ color: acc.color, flexShrink: 0 }} />
                  <div>
                    <div>{acc.label}</div>
                    <div className="demo-role">{acc.username}</div>
                  </div>
                  <span className="demo-indicator" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer link */}
          <div className="auth-footer-link">
            New to NEXUS?{' '}
            <Link to="/register" style={{ fontWeight: 700 }}>
              Provision an Identity →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
