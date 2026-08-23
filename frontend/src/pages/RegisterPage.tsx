import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, User as UserIcon, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { Role } from '../types';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(username, password, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box" style={{ maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="brand-logo"
            style={{ width: '48px', height: '48px', margin: '0 auto 12px' }}
          >
            <UserCheck size={26} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Create NEXUS Identity</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Provision a role-governed user in the organization
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
            <label className="form-label" htmlFor="reg-username">
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
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                required
                style={{ paddingLeft: '40px' }}
                autoComplete="username"
              />
            </div>
            <div className="form-help">Minimum 3 characters, alphanumeric.</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
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
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{ paddingLeft: '40px' }}
                autoComplete="new-password"
              />
            </div>
            <div className="form-help">Minimum 8 characters. Bcrypt hashed (Cost 12).</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">
              Assigned Role
            </label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="viewer">Viewer (Read-only catalog access)</option>
              <option value="developer">Developer (Application manage + AWS Console)</option>
              <option value="analyst">Analyst (Audit logs + reports)</option>
              <option value="security_manager">Security Manager (Policy & MFA governance)</option>
              <option value="admin">Administrator (Full org management)</option>
            </select>
            <div className="form-help">Determines RBAC permissions and PBAC policy evaluation.</div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Provisioning Identity...' : 'Create Account'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already provisioned?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
