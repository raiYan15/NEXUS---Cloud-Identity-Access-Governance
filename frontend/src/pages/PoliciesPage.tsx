import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Policy, AccessCheckResponse } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  FileCheck,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
} from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Policy Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [targetRole, setTargetRole] = useState<string>('developer');
  const [targetApp, setTargetApp] = useState('aws-console');
  const [requireMFA, setRequireMFA] = useState(true);
  const [requireTrusted, setRequireTrusted] = useState(true);
  const [maxRisk, setMaxRisk] = useState<number>(70);
  const decision = 'ALLOW';

  // Sandbox Evaluation State
  const [sandboxApp, setSandboxApp] = useState('aws-console');
  const [sandboxTrusted, setSandboxTrusted] = useState(true);
  const [sandboxMFA, setSandboxMFA] = useState(true);
  const [sandboxRisk, setSandboxRisk] = useState<number>(25);
  const [sandboxResult, setSandboxResult] = useState<AccessCheckResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.listPolicies();
      setPolicies(res.policies);
    } catch {
      // Non-admin roles
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPolicy({
        name: policyName,
        role: targetRole,
        application: targetApp,
        require_mfa: requireMFA,
        require_trusted_device: requireTrusted,
        max_risk_score: maxRisk,
        decision,
        enabled: true,
      });
      setShowCreateForm(false);
      setPolicyName('');
      fetchPolicies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this security policy?')) return;
    try {
      await api.deletePolicy(id);
      fetchPolicies();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await api.checkAccess({
        application: sandboxApp,
        device_trusted: sandboxTrusted,
        mfa_verified: sandboxMFA,
        risk_score: sandboxRisk,
      });
      setSandboxResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSandboxResult({
          decision: 'DENY',
          reason: err.message,
        });
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const canManagePolicies = hasRole(['admin', 'security_manager', 'super_admin']);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Policy-Based Access Control (PBAC)</h1>
          <p className="page-subtitle">
            Fine-grained access control policies evaluating contextual factors (MFA, Device Trust, Risk Score)
          </p>
        </div>
        {canManagePolicies && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            {showCreateForm ? 'Cancel' : 'Create Access Policy'}
          </button>
        )}
      </div>

      {/* Policy Creation Form */}
      {showCreateForm && (
        <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--accent-blue)' }}>
          <div className="card-header">
            <div className="card-title">
              <Plus size={18} color="#3b82f6" />
              Define New Security Policy
            </div>
          </div>

          <form onSubmit={handleCreatePolicy}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g., Strict Vault Access Rule"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                >
                  <option value="developer">Developer</option>
                  <option value="admin">Administrator</option>
                  <option value="security_manager">Security Manager</option>
                  <option value="analyst">Analyst</option>
                  <option value="viewer">Viewer</option>
                  <option value="*">Wildcard (* - All Roles)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Application Resource</label>
                <select
                  value={targetApp}
                  onChange={(e) => setTargetApp(e.target.value)}
                >
                  <option value="aws-console">AWS Management Console (aws-console)</option>
                  <option value="prod-db">Production PostgreSQL Database (prod-db)</option>
                  <option value="secrets-vault">Cloud Secrets Vault (secrets-vault)</option>
                  <option value="reporting-dashboard">Reporting Dashboard (reporting-dashboard)</option>
                  <option value="*">Wildcard (* - All Resources)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Max Allowed Risk Score (0 = No limit)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', margin: '16px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={requireMFA}
                  onChange={(e) => setRequireMFA(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Require MFA Verification
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={requireTrusted}
                  onChange={(e) => setRequireTrusted(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Require Trusted Device
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Save Policy to Cluster
            </button>
          </form>
        </div>
      )}

      {/* Live Policy Evaluation Sandbox */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div className="card-title">
            <Sliders size={18} color="#8b5cf6" />
            Interactive Policy Evaluation Sandbox
          </div>
          <span className="badge badge-purple">POST /api/v1/access/check</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Simulate an inbound access request with custom risk factors and verify real-time policy decisions.
        </p>

        <div className="grid-3" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">Target Resource</label>
            <select
              value={sandboxApp}
              onChange={(e) => setSandboxApp(e.target.value)}
            >
              <option value="aws-console">aws-console</option>
              <option value="prod-db">prod-db</option>
              <option value="secrets-vault">secrets-vault</option>
              <option value="reporting-dashboard">reporting-dashboard</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Simulated Risk Score: {sandboxRisk} / 100</label>
            <input
              type="range"
              min="0"
              max="100"
              value={sandboxRisk}
              onChange={(e) => setSandboxRisk(parseInt(e.target.value))}
              style={{ accentColor: '#3b82f6' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={sandboxMFA}
                onChange={(e) => setSandboxMFA(e.target.checked)}
                style={{ width: 'auto' }}
              />
              MFA Verified (TOTP)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={sandboxTrusted}
                onChange={(e) => setSandboxTrusted(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Device Trusted
            </label>
          </div>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isEvaluating}
          className="btn btn-primary"
          style={{ marginBottom: '16px' }}
        >
          <Play size={15} />
          {isEvaluating ? 'Evaluating...' : 'Evaluate Access Policy'}
        </button>

        {sandboxResult && (
          <div
            className={`alert ${
              sandboxResult.decision === 'ALLOW'
                ? 'alert-success'
                : sandboxResult.decision === 'REQUIRE_MFA'
                ? 'alert-info'
                : 'alert-danger'
            }`}
            style={{ margin: 0 }}
          >
            {sandboxResult.decision === 'ALLOW' ? (
              <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
            ) : sandboxResult.decision === 'REQUIRE_MFA' ? (
              <AlertTriangle size={22} style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={22} style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>
                DECISION: {sandboxResult.decision}
              </div>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>
                Reason: {sandboxResult.reason}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Policies Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileCheck size={18} color="#10b981" />
            Active Policy Cluster Rules
          </div>
          <span className="badge badge-green">{policies.length} Active Rules</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Policy Rule</th>
                <th>Role</th>
                <th>Application</th>
                <th>MFA Required</th>
                <th>Trusted Device</th>
                <th>Max Risk</th>
                <th>Action</th>
                {canManagePolicies && <th>Manage</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading active policies...
                  </td>
                </tr>
              ) : policies.length > 0 ? (
                policies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div className="code-inline" style={{ fontSize: '10px' }}>{p.id.substring(0, 14)}...</div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{p.role}</span>
                    </td>
                    <td className="code-inline">{p.application}</td>
                    <td>
                      {p.require_mfa ? (
                        <span className="badge badge-green">Required</span>
                      ) : (
                        <span className="badge" style={{ color: 'var(--text-muted)' }}>Optional</span>
                      )}
                    </td>
                    <td>
                      {p.require_trusted_device ? (
                        <span className="badge badge-green">Required</span>
                      ) : (
                        <span className="badge" style={{ color: 'var(--text-muted)' }}>Optional</span>
                      )}
                    </td>
                    <td>
                      {p.max_risk_score > 0 ? (
                        <span className="badge badge-amber">&lt; {p.max_risk_score}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-green">{p.decision}</span>
                    </td>
                    {canManagePolicies && (
                      <td>
                        <button
                          onClick={() => handleDeletePolicy(p.id)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px' }}
                          title="Delete Policy"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No policies defined.
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
