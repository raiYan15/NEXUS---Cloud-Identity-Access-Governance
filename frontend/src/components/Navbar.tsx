import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Activity, Key } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<string>('checking...');
  const secretsManagerSource = 'AWS Secrets Manager (Fallback: Env)';

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await api.checkHealth();
        if (res.status === 'ok') {
          setHealthStatus('ONLINE');
        }
      } catch {
        setHealthStatus('DEGRADED');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/dashboard':
        return 'Security Operations Center';
      case '/users':
        return 'Identity & User Management';
      case '/roles':
        return 'RBAC Permissions Matrix';
      case '/applications':
        return 'Application Resource Catalog';
      case '/policies':
        return 'Policy-Based Access Control (PBAC)';
      case '/audit':
        return 'Security Audit Trail';
      case '/security':
        return 'Multi-Factor Authentication & Controls';
      case '/settings':
        return 'Session & Profile Settings';
      default:
        return 'NEXUS Security Platform';
    }
  };

  return (
    <header className="top-navbar">
      <div className="nav-breadcrumbs">
        <ShieldCheck size={18} color="#3b82f6" />
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {getPageTitle(location.pathname)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="badge badge-purple" title="Cryptographic Key Provider">
          <Key size={12} />
          <span>{secretsManagerSource}</span>
        </div>

        <div
          className={`badge ${
            healthStatus === 'ONLINE' ? 'badge-green' : 'badge-amber'
          }`}
          title="Backend Cluster Health"
        >
          <Activity size={12} />
          <span>API: {healthStatus}</span>
        </div>
      </div>
    </header>
  );
};
