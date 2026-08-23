import {
  AuthResponse,
  RegisterResponse,
  User,
  Policy,
  AccessCheckRequest,
  AccessCheckResponse,
  AuditListResponse,
  MFASetupResponse,
  MFAVerifyResponse,
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = sessionStorage.getItem('nexus_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      sessionStorage.setItem('nexus_auth_token', token);
    } else {
      sessionStorage.removeItem('nexus_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // Auth endpoints
  async register(username: string, password: string, role: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Protected demo endpoints
  async getAdminOnly(): Promise<{ message: string; user: string; role: string }> {
    return this.request<{ message: string; user: string; role: string }>('/admin-only');
  }

  async getUserOrAdmin(): Promise<{ message: string; user: string; role: string }> {
    return this.request<{ message: string; user: string; role: string }>('/user-or-admin');
  }

  // Users management
  async listUsers(): Promise<{ users: User[]; count: number }> {
    return this.request<{ users: User[]; count: number }>('/users');
  }

  // Policies
  async listPolicies(): Promise<{ policies: Policy[]; count: number }> {
    return this.request<{ policies: Policy[]; count: number }>('/policies');
  }

  async createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
    return this.request<Policy>('/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async deletePolicy(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/policies/${id}`, {
      method: 'DELETE',
    });
  }

  // Access check
  async checkAccess(req: AccessCheckRequest): Promise<AccessCheckResponse> {
    return this.request<AccessCheckResponse>('/access/check', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // MFA
  async setupMFA(): Promise<MFASetupResponse> {
    return this.request<MFASetupResponse>('/mfa/setup', {
      method: 'POST',
    });
  }

  async verifyMFA(code: string): Promise<MFAVerifyResponse> {
    return this.request<MFAVerifyResponse>('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Audit logs
  async listAuditLogs(page = 1, pageSize = 50): Promise<AuditListResponse> {
    return this.request<AuditListResponse>(`/audit?page=${page}&page_size=${pageSize}`);
  }

  // Health check
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch('/health');
    return res.json();
  }
}

export const api = new ApiClient();
