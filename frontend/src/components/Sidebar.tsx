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
    {
      name: 'Overview',
      path: '/dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      name: 'Applications',
      path: '/applications',
      icon: <Grid size={18} />,
    },
  ];

  const adminNav: NavItemConfig[] = [
    {
      name: 'Users',
      path: '/users',
      icon: <Users size={18} />,
      allowedRoles: ['admin', 'super_admin'],
    },
    {
      name: 'Roles & Matrix',
      path: '/roles',
      icon: <KeyRound size={18} />,
      allowedRoles: ['admin', 'security_manager', 'super_admin'],
    },
    {
      name: 'Policy Engine',
      path: '/policies',
      icon: <FileCheck size={18} />,
      allowedRoles: ['admin', 'security_manager', 'super_admin', 'developer', 'analyst', 'viewer', 'user'],
    },
    {
      name: 'Audit Logs',
      path: '/audit',
      icon: <ScrollText size={18} />,
      allowedRoles: ['admin', 'security_manager', 'analyst', 'super_admin'],
    },
    {
      name: 'Security & MFA',
      path: '/security',
      icon: <Lock size={18} />,
    },
  ];

  const settingsNav: NavItemConfig[] = [
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings size={18} />,
    },
  ];

  const isAllowed = (item: NavItemConfig) => {
    if (!item.allowedRoles) return true;
    return hasRole(item.allowedRoles);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo">
          <Shield size={22} />
        </div>
        <div>
          <div className="brand-name">NEXUS</div>
          <div className="brand-badge">Cloud IAM</div>
        </div>
      </div>

      <div className="nav-section-title">Navigation</div>
      <ul className="nav-links">
        {mainNav.filter(isAllowed).map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}

        <div className="nav-section-title">Governance & Access</div>
        {adminNav.filter(isAllowed).map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}

        <div className="nav-section-title">System</div>
        {settingsNav.filter(isAllowed).map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {user && (
        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="user-name">{user.username}</div>
              <div className="user-role-badge">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="btn btn-secondary"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
