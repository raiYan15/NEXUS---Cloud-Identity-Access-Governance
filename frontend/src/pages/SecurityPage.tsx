import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Lock, QrCode, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [secret, setSecret] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [verifyStatus, setVerifyStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSetupMFA = async () => {
    setIsLoading(true);
    setVerifyStatus(null);
    try {
      const res = await api.setupMFA();
      setSecret(res.secret);
      setTotpUri(res.totp_uri);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setVerifyStatus({ success: false, message: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVerifyStatus(null);
    try {
      const res = await api.verifyMFA(verifyCode);
      setVerifyStatus({ success: true, message: res.message });
      setVerifyCode('');
      await refreshProfile();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setVerifyStatus({ success: false, message: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Multi-Factor Authentication & Security Controls</h1>
          <p className="page-subtitle">
            RFC 6238 TOTP enrollment, dynamic token verification, and Redis brute-force protection
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* MFA Enrollment Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Lock size={18} color="#3b82f6" />
              RFC 6238 TOTP Multi-Factor Authentication
            </div>
            <span className={`badge ${user?.mfa_enabled ? 'badge-green' : 'badge-amber'}`}>
              {user?.mfa_enabled ? 'Enforced' : 'Not Enrolled'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            NEXUS implements standard RFC 6238 Time-based One-Time Passwords using HMAC-SHA1 and dynamic 30-second time steps.
          </p>

          {!secret ? (
            <button
              onClick={handleSetupMFA}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <QrCode size={16} />
              {isLoading ? 'Generating Secret...' : 'Generate New TOTP Secret'}
            </button>
          ) : (
            <div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Base32 Shared Secret:
                </div>
                <div className="code-inline" style={{ fontSize: '15px', letterSpacing: '2px', wordBreak: 'break-all', display: 'block', padding: '8px' }}>
                  {secret}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  URI: <span className="code-inline" style={{ fontSize: '10px' }}>{totpUri}</span>
                </div>
              </div>

              <form onSubmit={handleVerifyMFA}>
                <div className="form-group">
                  <label className="form-label">Enter 6-Digit Authenticator Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verifyCode.length !== 6}
                  className="btn btn-success"
                  style={{ width: '100%' }}
                >
                  <CheckCircle2 size={16} />
                  {isLoading ? 'Verifying...' : 'Verify & Enable MFA'}
                </button>
              </form>
            </div>
          )}

          {verifyStatus && (
            <div
              className={`alert ${verifyStatus.success ? 'alert-success' : 'alert-danger'}`}
              style={{ marginTop: '16px', margin: '16px 0 0 0' }}
            >
              {verifyStatus.success ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
              <span>{verifyStatus.message}</span>
            </div>
          )}
        </div>

        {/* Security Controls & Threat Defense */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="#10b981" />
              Active Defense Controls
            </div>
            <span className="badge badge-green">Operational</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Redis Login Rate Limiter</div>
                <span className="badge badge-blue">Sliding Window</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                5 failed consecutive authentication attempts from an IP address triggers an automatic 15-minute lockout and fires an audit alert.
              </p>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Bcrypt Password Hashing</div>
                <span className="badge badge-purple">Work Factor 12</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Adaptive hashing with 4096 rounds prevents offline dictionary attacks. Passwords are never logged or stored in plaintext.
              </p>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>AWS Secrets Manager Integration</div>
                <span className="badge badge-amber">HS256 Key Vault</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                JWT signing secrets loaded dynamically from AWS Secrets Manager with zero secrets committed to version control.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
