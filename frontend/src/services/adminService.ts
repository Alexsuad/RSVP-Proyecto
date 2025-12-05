
import apiClient from './apiClient';
// import { CsvGuest } from '@/types'; // Archivo no encontrado, definimos localmente

export interface CsvGuest {
    full_name: string;
    email?: string;
    phone?: string;
    language: 'es' | 'en' | 'ro';
    max_accomp: number;
    invite_type: 'full' | 'ceremony' | 'party';
    side?: 'bride' | 'groom';
    relationship?: string;
    group_id?: string;
}

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

// Interfaz alineada con el schema GuestResponse del backend
export interface Guest {
    id: number;
    full_name: string;
    email?: string;
    phone?: string;
    language: string;
    side?: string;
    // El backend devuelve 'confirmed' como nulo o booleano, y 'rsvp_status' si se filtra
    confirmed?: boolean | null;
    max_accomp: number;
    num_adults: number;
    num_children: number;
    allergies?: string;
    menu_choice?: string;
    notes?: string;
    guest_code?: string;
    invite_type?: string;
}

// =============================================================================
// Servicio Admin
// =============================================================================

export const adminService = {
  // --- Autenticación (Solo Client-Side para MVP) ---
  // El login real se maneja en el componente comparando con VITE_ADMIN_KEY.
  // Este método queda reservado para futura expansión.
  
  // --- Gestión de Invitados ---
  getGuests: (filters?: { search?: string; rsvp_status?: string; side?: string }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.rsvp_status) params.append('rsvp_status', filters.rsvp_status);
      if (filters?.side) params.append('side', filters.side);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      return apiClient<Guest[]>(`/api/admin/guests${queryString}`);
  },

  createGuest: (guestData: Partial<Guest>) => {
      // El backend espera fields como full_name, etc.
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
      body: { items: guests },
      method: 'POST',
    });
  },
};
