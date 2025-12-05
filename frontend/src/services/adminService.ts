
import apiClient from './apiClient';
import { CsvGuest } from '@/types';

// =============================================================================
// Interfaces de Respuesta (DTOs)
// =============================================================================

export interface ImportResponse {
    ok: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export interface Guest {
    id: number;
    full_name: string;
    email?: string;
    phone?: string;
    language: string;
    side?: string;
    rsvpStatus?: string; // Mapeado desde confirmed en el componente o backend
    confirmed?: boolean; // Valor crudo del backend
    companions?: any[]; // Estructura flexible por ahora
    max_accomp: number;
    notes?: string;
    // Otros campos que vengan del backend
}

export interface LoginResponse {
    token: string;
    user?: {
        username: string;
        role: string;
    };
}

// =============================================================================
// Servicio Admin
// =============================================================================

export const adminService = {
  // --- Autenticación ---
  login: (password: string) => {
      // POST /api/admin/login
      // Asumimos que el backend espera { password: ... } o similar
      // Revisa la documentación si el endpoint espera otro body
      return apiClient<LoginResponse>('/api/admin/login', {
          body: { password }
      });
  },

  // --- Gestión de Invitados ---
  getGuests: (filters?: { search?: string; rsvp_status?: string; side?: string }) => {
      // Construcción de query params
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.rsvp_status) params.append('rsvp_status', filters.rsvp_status);
      if (filters?.side) params.append('side', filters.side);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      return apiClient<Guest[]>(`/api/admin/guests${queryString}`);
  },

  createGuest: (guestData: Partial<Guest>) => {
      return apiClient<Guest>('/api/admin/guests', {
          body: guestData,
          method: 'POST'
      });
  },

  deleteGuest: (id: number) => {
      return apiClient<void>(`/api/admin/guests/${id}`, {
          method: 'DELETE'
      });
  },
  
  updateGuest: (id: number, guestData: Partial<Guest>) => {
      return apiClient<Guest>(`/api/admin/guests/${id}`, {
          body: guestData,
          method: 'PUT'
      });
  },

  // --- Importación Masiva ---
  importGuests: (guests: CsvGuest[]) => {
    return apiClient<ImportResponse>('/api/admin/import-guests', {
      body: { items: guests }, // Ajuste: backend espera { items: [...] } o payload similar según schemas anteriores
      method: 'POST',
    });
  },
};
