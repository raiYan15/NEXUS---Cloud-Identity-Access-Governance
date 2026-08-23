import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { AuditPage } from './pages/AuditPage';
import { SecurityPage } from './pages/SecurityPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin & Security Manager Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'security_manager', 'super_admin']} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'security_manager', 'analyst', 'super_admin']} />}>
            <Route path="/audit" element={<AuditPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};
