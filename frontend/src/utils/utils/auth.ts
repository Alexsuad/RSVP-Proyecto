
const TOKEN_KEY = 'rsvp_token';

export const getToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
};
