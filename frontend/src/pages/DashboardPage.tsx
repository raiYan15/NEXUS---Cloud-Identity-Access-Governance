import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { AuditEvent } from '../types';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(4);
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    status: number | string;
    message: string;
    success: boolean;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const auditRes = await api.listAuditLogs(1, 6);
        setAuditEvents(auditRes.events || []);
      } catch {
        // Fallback for non-admin roles where audit is protected
      }

      try {
        const usersRes = await api.listUsers();
        setTotalUsers(usersRes.count || 4);
      } catch {
        // Non-admin roles
      }
    };

    fetchData();
  }, []);

  const testEndpoint = async (type: 'admin' | 'user') => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (type === 'admin') {
        const res = await api.getAdminOnly();
        setTestResult({
          endpoint: 'GET /api/v1/admin-only',
          status: 200,
          message: `${res.message} (Authenticated as ${res.user}, role: ${res.role})`,
          success: true,
        });
      } else {
        const res = await api.getUserOrAdmin();
        setTestResult({
          endpoint: 'GET /api/v1/user-or-admin',
          status: 200,
          message: `${res.message} (Authenticated as ${res.user}, role: ${res.role})`,
          success: true,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTestResult({
          endpoint: type === 'admin' ? 'GET /api/v1/admin-only' : 'GET /api/v1/user-or-admin',
          status: '403 / 401',
          message: err.message,
          success: false,
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">
            Organization Identity Posture & Zero-Trust Access State
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/policies" className="btn btn-secondary">
            <Key size={16} />
            Evaluate Access
          </Link>
          <Link to="/security" className="btn btn-primary">
            <Lock size={16} />
            MFA Settings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div>
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{totalUsers}</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '4px' }}>
              ● 100% Active Directory
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Current Role</div>
            <div className="stat-value" style={{ fontSize: '20px', textTransform: 'uppercase' }}>
              {user?.role}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              ID: {user?.id.substring(0, 8)}...
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">MFA Status</div>
            <div className="stat-value" style={{ fontSize: '22px' }}>
              {user?.mfa_enabled ? 'Enforced' : 'Optional'}
            </div>
            <div style={{ fontSize: '12px', color: user?.mfa_enabled ? 'var(--accent-green)' : 'var(--accent-amber)', marginTop: '4px' }}>
              RFC 6238 TOTP
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Lock size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Rate Limiter</div>
            <div className="stat-value" style={{ fontSize: '22px', color: '#60a5fa' }}>
              Active
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Redis 5-Attempt Sliding
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <ShieldAlert size={24} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Real-time RBAC Access Prover */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} color="#3b82f6" />
              Live RBAC Endpoint Prover
            </div>
            <span className="badge badge-blue">Interactive Test</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Exercise backend RBAC authorization middleware in real-time. Verify whether your token is accepted (200) or rejected (403/401).
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => testEndpoint('user')}
              disabled={isTesting}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Play size={14} />
              Call <code style={{ fontSize: '12px' }}>/user-or-admin</code>
            </button>
            <button
              onClick={() => testEndpoint('admin')}
              disabled={isTesting}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Play size={14} />
              Call <code style={{ fontSize: '12px' }}>/admin-only</code>
            </button>
          </div>

          {testResult && (
            <div
              className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'}`}
              style={{ alignItems: 'flex-start', margin: 0 }}
            >
              {testResult.success ? (
                <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <XCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  {testResult.endpoint} → HTTP {testResult.status}
                </div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  {testResult.message}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Architecture Box */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="#10b981" />
              Access Decision Pipeline
            </div>
            <span className="badge badge-green">Zero Trust</span>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', lineHeight: 1.8, color: '#93c5fd' }}>
            <div>USER → AUTHENTICATION (Bcrypt Cost 12)</div>
            <div>&nbsp;&nbsp;↓</div>
            <div>JWT SIGNATURE (AWS Secrets Manager / HS256)</div>
            <div>&nbsp;&nbsp;↓</div>
            <div>MFA VERIFICATION (RFC 6238 TOTP HMAC-SHA1)</div>
            <div>&nbsp;&nbsp;↓</div>
            <div>RBAC PERMISSIONS CHECK (Fine-grained capabilities)</div>
            <div>&nbsp;&nbsp;↓</div>
            <div>POLICY ENGINE EVALUATION (Risk + Device Trust)</div>
            <div>&nbsp;&nbsp;↓</div>
            <div>ACCESS DECISION → AUDIT TRAIL RECORDED</div>
          </div>
        </div>
      </div>

      {/* Recent Security Logs Preview */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Activity size={18} color="#8b5cf6" />
            Recent Security Audit Stream
          </div>
          <Link to="/audit" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            View Full Trail <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event Action</th>
                <th>Resource / User</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.length > 0 ? (
                auditEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td>
                      <span
                        className={`badge ${
                          evt.action.includes('SUCCESS') || evt.action.includes('GRANTED') || evt.action.includes('REGISTERED')
                            ? 'badge-green'
                            : evt.action.includes('DENIED') || evt.action.includes('FAILED') || evt.action.includes('RATE_LIMIT')
                            ? 'badge-red'
                            : 'badge-blue'
                        }`}
                      >
                        {evt.action}
                      </span>
                    </td>
                    <td className="code-inline">{evt.resource || evt.user_id || 'system'}</td>
                    <td>{evt.ip_address || '127.0.0.1'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No audit records available for your role or event stream is currently initializing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
