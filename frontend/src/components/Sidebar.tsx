import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Shield,
  LayoutDashboard,
  Users,
  KeyRound,
  Grid,
  FileCheck,
  ScrollText,
  Lock,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Role } from '../types';

interface NavItemConfig {
  name: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles?: Role[];
}

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  const mainNav: NavItemConfig[] = [
    { name: 'Overview',     path: '/dashboard',    icon: <LayoutDashboard size={16} /> },
    { name: 'Applications', path: '/applications', icon: <Grid size={16} /> },
  ];

  const adminNav: NavItemConfig[] = [
    { name: 'Users',           path: '/users',    icon: <Users size={16} />,    allowedRoles: ['admin', 'super_admin'] },
    { name: 'Roles & Matrix',  path: '/roles',    icon: <KeyRound size={16} />, allowedRoles: ['admin', 'security_manager', 'super_admin'] },
    { name: 'Policy Engine',   path: '/policies', icon: <FileCheck size={16} />, allowedRoles: ['admin', 'security_manager', 'super_admin', 'developer', 'analyst', 'viewer', 'user'] },
    { name: 'Audit Logs',      path: '/audit',    icon: <ScrollText size={16} />, allowedRoles: ['admin', 'security_manager', 'analyst', 'super_admin'] },
    { name: 'Security & MFA',  path: '/security', icon: <Lock size={16} /> },
  ];

  const settingsNav: NavItemConfig[] = [
    { name: 'Settings', path: '/settings', icon: <Settings size={16} /> },
  ];

  const isAllowed = (item: NavItemConfig) =>
    !item.allowedRoles || hasRole(item.allowedRoles);

  const roleColors: Record<string, string> = {
    admin:            '#7c5ef6',
    super_admin:      '#ff3b5b',
    security_manager: '#f5a623',
    developer:        '#1d6ff0',
    analyst:          '#00c2e0',
    viewer:           '#00d68f',
    user:             '#8ba3c4',
  };

  const roleColor = user ? (roleColors[user.role] ?? '#8ba3c4') : '#8ba3c4';

  return (
    <aside className="sidebar">
      {/* Brand header */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <Shield size={20} />
        </div>
        <div>
          <div className="brand-name">NEXUS</div>
          <div className="brand-badge">Cloud IAM</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Main navigation */}
        <div className="nav-section-title">Navigation</div>
        <ul className="nav-links" style={{ marginBottom: 0 }}>
          {mainNav.filter(isAllowed).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.name}</span>
                <ChevronRight size={12} style={{ opacity: 0.3 }} />
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Governance */}
        <div className="nav-section-title" style={{ marginTop: '8px' }}>Governance & Access</div>
        <ul className="nav-links" style={{ marginBottom: 0 }}>
          {adminNav.filter(isAllowed).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.name}</span>
                <ChevronRight size={12} style={{ opacity: 0.3 }} />
              </NavLink>
            </li>
          ))}
        </ul>

        {/* System */}
        <div className="nav-section-title" style={{ marginTop: '8px' }}>System</div>
        <ul className="nav-links">
          {settingsNav.filter(isAllowed).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.name}</span>
                <ChevronRight size={12} style={{ opacity: 0.3 }} />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      {user && (
        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar" style={{ borderColor: `${roleColor}40`, color: roleColor }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="user-name">{user.username}</div>
              <div className="user-role-badge" style={{ color: roleColor }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={logout}
              title="Sign Out"
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
