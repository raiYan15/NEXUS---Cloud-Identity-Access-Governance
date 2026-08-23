import React, { useState } from 'react';
import { Cloud, Database, BarChart3, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { AccessCheckResponse } from '../types';

interface AppItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconType: 'aws' | 'db' | 'chart' | 'vault';
  sensitivity: 'Critical' | 'High' | 'Medium';
}

export const ApplicationsPage: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [checkResult, setCheckResult] = useState<AccessCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const apps: AppItem[] = [
    {
      id: 'app-aws-console',
      name: 'AWS Management Console',
      slug: 'aws-console',
      description: 'Production cloud infrastructure orchestration, ECS clusters, VPC and IAM roles.',
      iconType: 'aws',
      sensitivity: 'Critical',
    },
    {
      id: 'app-prod-db',
      name: 'Production PostgreSQL Database',
      slug: 'prod-db',
      description: 'Core transactional customer data warehouse and identity store replica.',
      iconType: 'db',
      sensitivity: 'Critical',
    },
    {
      id: 'app-reporting',
      name: 'Executive Reporting Dashboard',
      slug: 'reporting-dashboard',
      description: 'Business intelligence telemetry, analytics exports, and compliance reporting.',
      iconType: 'chart',
      sensitivity: 'Medium',
    },
    {
      id: 'app-vault',
      name: 'Cloud Secrets Vault',
      slug: 'secrets-vault',
      description: 'AWS Secrets Manager signing keys, HSM tokens, and database credentials.',
      iconType: 'vault',
      sensitivity: 'Critical',
    },
  ];

  const handleLaunchApp = async (app: AppItem) => {
    setSelectedApp(app);
    setIsChecking(true);
    setCheckResult(null);

    try {
      // Evaluate access using the policy engine
      const res = await api.checkAccess({
        application: app.slug,
        device_trusted: true,
        mfa_verified: true,
        risk_score: 15,
      });
      setCheckResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCheckResult({
          decision: 'DENY',
          reason: err.message,
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'aws':
        return <Cloud size={24} color="#f59e0b" />;
      case 'db':
        return <Database size={24} color="#3b82f6" />;
      case 'chart':
        return <BarChart3 size={24} color="#10b981" />;
      case 'vault':
        return <Key size={24} color="#8b5cf6" />;
      default:
        return <Cloud size={24} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Application Resource Catalog</h1>
          <p className="page-subtitle">
            Protected organizational workloads governed by Zero-Trust contextual security policies
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {apps.map((app) => (
          <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {renderIcon(app.iconType)}
                </div>
                <span
                  className={`badge ${
                    app.sensitivity === 'Critical' ? 'badge-red' : 'badge-green'
                  }`}
                >
                  {app.sensitivity}
                </span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{app.name}</h3>
              <div className="code-inline" style={{ display: 'inline-block', marginBottom: '12px', fontSize: '11px' }}>
                {app.slug}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {app.description}
              </p>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Policy Enforced
              </span>
              <button
                onClick={() => handleLaunchApp(app)}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                Request Access
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedApp && (
        <div className="card" style={{ border: '1px solid #3b82f6' }}>
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} color="#3b82f6" />
              Policy Engine Access Decision: {selectedApp.name}
            </div>
          </div>

          {isChecking ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Evaluating contextual security policies against your role...
            </div>
          ) : checkResult ? (
            <div
              className={`alert ${
                checkResult.decision === 'ALLOW'
                  ? 'alert-success'
                  : checkResult.decision === 'REQUIRE_MFA'
                  ? 'alert-info'
                  : 'alert-danger'
              }`}
              style={{ margin: 0 }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', textTransform: 'uppercase' }}>
                  Decision: {checkResult.decision}
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  {checkResult.reason}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
