export type Role =
  | 'super_admin'
  | 'admin'
  | 'security_manager'
  | 'developer'
  | 'analyst'
  | 'viewer'
  | 'user';

export type Status = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  username: string;
  role: Role;
  organization_id?: string;
  status: Status;
  mfa_enabled: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface Policy {
  id: string;
  name: string;
  role: string;
  application: string;
  require_mfa: boolean;
  require_trusted_device: boolean;
  max_risk_score: number;
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_MFA';
  enabled: boolean;
}

export interface AccessCheckRequest {
  application: string;
  device_trusted: boolean;
  mfa_verified: boolean;
  risk_score: number;
}

export interface AccessCheckResponse {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_MFA';
  reason: string;
  policy_id?: string;
}

export interface AuditEvent {
  id: string;
  user_id?: string;
  action: string;
  resource?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

export interface AuditListResponse {
  events: AuditEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface MFASetupResponse {
  secret: string;
  totp_uri: string;
  message: string;
}

export interface MFAVerifyResponse {
  message: string;
  mfa_verified: boolean;
  user_id: string;
}

export interface Application {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: string;
}
