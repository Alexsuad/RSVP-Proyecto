

const GUEST_TOKEN_KEY = 'rsvp_token';
const ADMIN_TOKEN_KEY = 'rsvp_admin_token';

// --- Guest Token Helpers ---
export const getToken = (): string | null => {
  return sessionStorage.getItem(GUEST_TOKEN_KEY);
};

export const setToken = (token: string): void => {
  sessionStorage.setItem(GUEST_TOKEN_KEY, token);
};

export const clearToken = (): void => {
  sessionStorage.removeItem(GUEST_TOKEN_KEY);
};

// --- Admin Token Helpers ---
export const getAdminToken = (): string | null => {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string): void => {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminToken = (): void => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
};
