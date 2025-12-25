//frontend/src/services/adminService.ts

import apiClient from './apiClient';
import { getAdminToken } from '@/utils/auth';

import { CsvGuest } from '@/types';

// Configuración de URL consistente con apiClient
const BASE_URL = (import.meta as any).env.VITE_BASE_URL ?? 'http://127.0.0.1:8000';

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

// Nueva interfaz para respuesta de KPIs
export interface AdminStatsResponse {
    total_guests: number;
    responses_received: number;
    confirmed_attendees: number;
    pending_rsvp: number;
    not_attending: number;
    total_companions: number;
    total_children: number;
    guests_with_allergies: number;
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
// Interfaces para Import/Export CSV (Épica B)
// =============================================================================

export interface CsvImportError {
    row_number: number;
    phone_raw: string;
    reason: string;
}

export interface CsvImportResult {
    created_count: number;
    updated_count: number;
    rejected_count: number;
    errors: CsvImportError[];
}

// =============================================================================
// Servicio Admin
// =============================================================================

export const adminService = {
  // --- Autenticación (Solo Client-Side para MVP) ---
  // El login real se maneja en el componente comparando con VITE_ADMIN_KEY.
  // Este método queda reservado para futura expansión.
  
  // --- Gestión de Invitados ---
  getStats: () => {
      return apiClient<AdminStatsResponse>('/api/admin/stats');
  },

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

  // --- Importación Masiva (Legacy JSON) ---
  importGuests: (guests: CsvGuest[]) => {
    return apiClient<ImportResponse>('/api/admin/import-guests', {
      body: { items: guests },
      method: 'POST',
    });
  },

  // --- Export/Import CSV (Épica B) ---

  /**
   * Exporta todos los invitados a un archivo CSV.
   * Retorna un Blob que puede descargarse.
   */
  exportGuestsCsv: async (): Promise<Blob> => {
    // Obtiene el token correcto (sessionStorage rsvp_admin_token)
    const token = getAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Usa URL absoluta con BASE_URL para no depender de proxy
    const response = await fetch(`${BASE_URL}/api/admin/guests-export`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Error exportando CSV: ${response.status}`);
    }
    
    return response.blob();
  },

  /**
   * Importa invitados desde un archivo CSV.
   * Envía el archivo como multipart/form-data.
   */
  importGuestsCsv: async (file: File): Promise<CsvImportResult> => {
    const token = getAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${BASE_URL}/api/admin/guests-import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error importando CSV: ${response.status}`);
    }
    
    return response.json();
  },
};

