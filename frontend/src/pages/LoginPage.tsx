import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
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
      <div className="auth-box">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="brand-logo"
            style={{ width: '48px', height: '48px', margin: '0 auto 12px' }}
          >
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>NEXUS Identity Platform</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Zero-Trust Cloud Access & Identity Governance
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., admin"
                required
                style={{ paddingLeft: '40px' }}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{ paddingLeft: '40px' }}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
            Quick Demo Accounts (click to fill):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'AdminPassword123!')}
              className="badge badge-purple"
              style={{ cursor: 'pointer', border: '1px solid rgba(139, 92, 246, 0.4)' }}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('developer', 'DevPassword123!')}
              className="badge badge-blue"
              style={{ cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.4)' }}
            >
              Developer
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('viewer', 'ViewerPassword123!')}
              className="badge badge-green"
              style={{ cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.4)' }}
            >
              Viewer
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Need a new identity?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Register Organization User
          </Link>
        </div>
      </div>
    </div>
  );
};
