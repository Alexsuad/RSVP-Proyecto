import { getToken, clearToken } from '../utils/auth';

const BASE_URL = (import.meta as any).env.VITE_BASE_URL ?? 'http://localhost:5000';
const ADMIN_KEY = (import.meta as any).env.VITE_ADMIN_KEY;
const TOKEN_KEY = 'rsvp_token';

async function apiClient<T>(endpoint: string, { body, ...customConfig }: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (endpoint.startsWith('/api/admin/') && ADMIN_KEY) {
      headers['x-admin-key'] = ADMIN_KEY;
  }

  const config: RequestInit = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    clearToken();
    window.location.href = '/app/login.html';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export default apiClient;