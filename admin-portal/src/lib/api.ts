const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;
  private refreshing: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const json = await res.json();
      if (json.success && json.data) {
        this.setTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    // If 401, try refreshing the token
    if (res.status === 401 && token) {
      if (!this.refreshing) {
        this.refreshing = this.refreshAccessToken();
      }
      const refreshed = await this.refreshing;
      this.refreshing = null;

      if (refreshed) {
        const newToken = this.getAccessToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers,
        });
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    const json = await res.json();

    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Request failed with status ${res.status}`);
    }

    return json as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Login doesn't need auth headers
  async login(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Login failed');
    }

    this.setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data;
  }
}

export const api = new ApiClient(API_URL);
