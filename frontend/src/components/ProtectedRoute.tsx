import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-wrapper">
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Verifying cryptographic token...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-wrapper">
          <Navbar />
          <main className="page-content">
            <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>403 — Access Forbidden</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Your current role (<span className="code-inline">{user.role}</span>) does not hold the permissions required to view this area.
              </p>
              <a href="/dashboard" className="btn btn-primary">
                Return to Overview
              </a>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
