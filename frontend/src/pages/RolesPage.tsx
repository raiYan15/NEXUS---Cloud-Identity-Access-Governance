import React from 'react';
import { KeyRound, Check, X } from 'lucide-react';

interface RolePermissionMatrix {
  role: string;
  description: string;
  permissions: {
    usersRead: boolean;
    usersCreate: boolean;
    usersUpdate: boolean;
    usersDelete: boolean;
    appsRead: boolean;
    appsManage: boolean;
    policiesRead: boolean;
    policiesManage: boolean;
    auditRead: boolean;
    securityManage: boolean;
  };
}

export const RolesPage: React.FC = () => {
  const matrix: RolePermissionMatrix[] = [
    {
      role: 'SUPER_ADMIN',
      description: 'Full root tenant authority across all governance and compute systems',
      permissions: {
        usersRead: true,
        usersCreate: true,
        usersUpdate: true,
        usersDelete: true,
        appsRead: true,
        appsManage: true,
        policiesRead: true,
        policiesManage: true,
        auditRead: true,
        securityManage: true,
      },
    },
    {
      role: 'ADMIN',
      description: 'Organization administrator managing team accounts and application definitions',
      permissions: {
        usersRead: true,
        usersCreate: true,
        usersUpdate: true,
        usersDelete: false,
        appsRead: true,
        appsManage: true,
        policiesRead: true,
        policiesManage: true,
        auditRead: true,
        securityManage: false,
      },
    },
    {
      role: 'SECURITY_MANAGER',
      description: 'Information security officer managing risk policies, audits, and MFA enforcement',
      permissions: {
        usersRead: true,
        usersCreate: false,
        usersUpdate: false,
        usersDelete: false,
        appsRead: true,
        appsManage: false,
        policiesRead: true,
        policiesManage: true,
        auditRead: true,
        securityManage: true,
      },
    },
    {
      role: 'DEVELOPER',
      description: 'Software engineer deploying and managing backend services and cloud consoles',
      permissions: {
        usersRead: true,
        usersCreate: false,
        usersUpdate: false,
        usersDelete: false,
        appsRead: true,
        appsManage: true,
        policiesRead: true,
        policiesManage: false,
        auditRead: false,
        securityManage: false,
      },
    },
    {
      role: 'ANALYST',
      description: 'Security & compliance auditor reviewing access logs and policy rules',
      permissions: {
        usersRead: true,
        usersCreate: false,
        usersUpdate: false,
        usersDelete: false,
        appsRead: true,
        appsManage: false,
        policiesRead: true,
        policiesManage: false,
        auditRead: true,
        securityManage: false,
      },
    },
    {
      role: 'VIEWER',
      description: 'Read-only viewer for authorized application catalog items',
      permissions: {
        usersRead: false,
        usersCreate: false,
        usersUpdate: false,
        usersDelete: false,
        appsRead: true,
        appsManage: false,
        policiesRead: false,
        policiesManage: false,
        auditRead: false,
        securityManage: false,
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">RBAC Governance Matrix</h1>
          <p className="page-subtitle">
            Single Source of Truth: Canonical role-to-permission capabilities mapping
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <KeyRound size={18} color="#3b82f6" />
            Role Permission Matrix
          </div>
          <span className="badge badge-purple">Enforced by Middleware</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Users Read</th>
                <th>Users Write</th>
                <th>Users Delete</th>
                <th>Apps Read</th>
                <th>Apps Manage</th>
                <th>Policies Read</th>
                <th>Policies Manage</th>
                <th>Audit Logs</th>
                <th>Security Manage</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.role}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{row.role}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '200px' }}>
                      {row.description}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.usersRead ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.usersCreate ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.usersDelete ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.appsRead ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.appsManage ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.policiesRead ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.policiesManage ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.auditRead ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.permissions.securityManage ? <Check size={16} color="#10b981" /> : <X size={16} color="#4b5563" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
