import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { CheckCircle2, XCircle, Search } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Identity & User Management</h1>
          <p className="page-subtitle">
            Manage organization members, RBAC role assignments, and authentication posture
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn btn-secondary"
        >
          Refresh Directory
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
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
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="security_manager">Security Manager</option>
              <option value="developer">Developer</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Identity</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>MFA Enforced</th>
                <th>Identity ID</th>
                <th>Provisioned</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="user-avatar"
                          style={{ width: '32px', height: '32px', fontSize: '12px' }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'super_admin'
                            ? 'badge-purple'
                            : u.role === 'admin'
                            ? 'badge-blue'
                            : u.role === 'security_manager'
                            ? 'badge-amber'
                            : u.role === 'developer'
                            ? 'badge-blue'
                            : 'badge-green'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">
                        <CheckCircle2 size={12} />
                        {u.status}
                      </span>
                    </td>
                    <td>
                      {u.mfa_enabled ? (
                        <span className="badge badge-green">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }}>
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="code-inline">{u.id.substring(0, 13)}...</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No identities match your current filter.
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
