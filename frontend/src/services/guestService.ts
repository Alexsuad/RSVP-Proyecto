
import apiClient from './apiClient';
import { GuestData, RsvpPayload } from '@/types';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const guestService = {
  login: (data: { guest_code: string; email?: string; phone?: string; }) => {
    const payload: any = { guest_code: data.guest_code };
    if(data.email) payload.email = data.email;
    if(data.phone) payload.phone = data.phone;
    return apiClient<LoginResponse>('/api/auth/login', { body: payload, method: 'POST' });
  },

  requestAccess: (data: { full_name: string; phone_last4: string; email: string, lang: string }) => {
    return apiClient<{ ok: boolean; message: string; expires_in_sec: number }>('/api/request-access', { body: data, method: 'POST' });
  },

  recoverCode: (data: { email?: string; phone?: string }) => {
    return apiClient<{ ok: boolean; message: string }>('/api/recover-code', { body: data, method: 'POST' });
  },

  getMe: () => {
    return apiClient<GuestData>('/api/guest/me', { method: 'GET' });
  },

  submitRsvp: (data: RsvpPayload) => {
    return apiClient<{ ok: boolean; confirmed: boolean; summary: { attending: boolean; total_people: number } }>('/api/guest/me/rsvp', { body: data, method: 'POST' });
  },
};
