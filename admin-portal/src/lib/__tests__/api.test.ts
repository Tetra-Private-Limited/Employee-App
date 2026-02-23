import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the ApiClient class, so we'll import and create a fresh instance
// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Prevent window.location redirect in tests
const originalLocation = window.location;

// Import the api client after mocking
import { api } from '../api';

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  };
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('get()', () => {
    it('makes a GET request with Bearer token', async () => {
      mockStorage['accessToken'] = 'test-token-123';
      mockFetch.mockResolvedValue(
        mockResponse({ success: true, data: { id: 1, name: 'Test' } })
      );

      const result = await api.get('/employees');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/employees'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      expect(result).toEqual({ success: true, data: { id: 1, name: 'Test' } });
    });

    it('makes a GET request without token when not logged in', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ success: true, data: [] })
      );

      await api.get('/public');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('post()', () => {
    it('sends JSON body', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ success: true, data: { id: 'new' } }, 201)
      );

      await api.post('/employees', { name: 'Bob', email: 'bob@test.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/employees'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Bob', email: 'bob@test.com' }),
        })
      );
    });
  });

  describe('login()', () => {
    it('stores tokens on successful login', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          success: true,
          data: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            employee: { id: '1', name: 'Test' },
          },
        })
      );

      const result = await api.login('test@test.com', 'password');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
      expect(result.employee.name).toBe('Test');
    });

    it('throws on failed login', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ success: false, error: 'Invalid credentials' }, 401)
      );

      await expect(api.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('token refresh on 401', () => {
    it('retries request after successful token refresh', async () => {
      mockStorage['accessToken'] = 'expired-token';
      mockStorage['refreshToken'] = 'valid-refresh';

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce(
          mockResponse({ success: false, error: 'Token expired' }, 401)
        )
        // Refresh call succeeds
        .mockResolvedValueOnce(
          mockResponse({
            success: true,
            data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          })
        )
        // Retry succeeds
        .mockResolvedValueOnce(
          mockResponse({ success: true, data: { items: [] } })
        );

      const result = await api.get('/employees');

      // 3 fetch calls: original, refresh, retry
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true, data: { items: [] } });
    });

    it('clears tokens on failed refresh', async () => {
      mockStorage['accessToken'] = 'expired-token';
      mockStorage['refreshToken'] = 'bad-refresh';

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce(
          mockResponse({ success: false, error: 'Token expired' }, 401)
        )
        // Refresh call fails
        .mockResolvedValueOnce(
          mockResponse({ success: false, error: 'Invalid' }, 401)
        );

      // Prevent actual redirect
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });

      await expect(api.get('/employees')).rejects.toThrow('Session expired');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ success: false, error: 'Not found' }, 404)
      );

      await expect(api.get('/nonexistent')).rejects.toThrow('Not found');
    });
  });
});
