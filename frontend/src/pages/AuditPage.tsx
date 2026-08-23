import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEvent } from '../types';
import { Filter, ChevronLeft, ChevronRight, ShieldAlert, RefreshCw } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const fetchLogs = async (p = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listAuditLogs(p, pageSize);
      setEvents(res.events || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (actionFilter === 'ALL') return true;
    return e.action === actionFilter;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('GRANTED') || action.includes('REGISTERED')) {
      return 'badge-green';
    }
    if (action.includes('FAILED') || action.includes('DENIED') || action.includes('RATE_LIMIT') || action.includes('REJECTED')) {
      return 'badge-red';
    }
    if (action.includes('POLICY') || action.includes('ROLE')) {
      return 'badge-purple';
    }
    return 'badge-blue';
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Audit Trail</h1>
          <p className="page-subtitle">
            Immutable, timestamped security event stream recording authentications, authorization checks, and policy modifications
          </p>
        </div>
        <button onClick={() => fetchLogs(page)} className="btn btn-secondary">
          <RefreshCw size={15} />
          Refresh Stream
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Filter by Action:
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ width: '260px' }}
          >
            <option value="ALL">All Actions ({total} total)</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="USER_REGISTERED">USER_REGISTERED</option>
            <option value="ACCESS_GRANTED">ACCESS_GRANTED</option>
            <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            <option value="MFA_SUCCESS">MFA_SUCCESS</option>
            <option value="MFA_FAILED">MFA_FAILED</option>
            <option value="POLICY_CREATED">POLICY_CREATED</option>
            <option value="RATE_LIMIT_TRIGGERED">RATE_LIMIT_TRIGGERED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Subject ID</th>
                <th>Target Resource</th>
                <th>IP Address</th>
                <th>Metadata</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    Reading audit log stream...
                  </td>
                </tr>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className={`badge ${getActionBadge(e.action)}`}>
                        {e.action}
                      </span>
                    </td>
                    <td>
                      {e.user_id ? (
                        <span className="code-inline">{e.user_id.substring(0, 14)}...</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>anonymous</span>
                      )}
                    </td>
                    <td>
                      {e.resource ? (
                        <span className="code-inline">{e.resource}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>auth-service</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px' }}>{e.ip_address || '127.0.0.1'}</td>
                    <td>
                      {e.metadata ? (
                        <pre style={{ fontSize: '11px', color: '#93c5fd', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {JSON.stringify(e.metadata)}
                        </pre>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing page {page} of {totalPages} ({total} events logged)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
