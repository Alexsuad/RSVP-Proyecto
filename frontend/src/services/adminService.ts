//frontend/src/services/adminService.ts

import apiClient from './apiClient';
import { getAdminToken } from '@/utils/auth';

import { CsvGuest, Companion } from '@/types';

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
    allergy_breakdown: Record<string, number>;
}

// Interfaces para actividad reciente
export interface RecentActivityItem {
    guest_id: number;
    guest_name: string;
    action: 'confirmed' | 'declined' | 'updated' | 'created';
    timestamp: string;
    channel?: string;
}

export interface RecentActivityResponse {
    items: RecentActivityItem[];
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
    invite_type?: string; 
    relationship?: string;
    group_id?: string;
    allergies?: string;
    menu_choice?: string;
    notes?: string;
    guest_code?: string;
}

// =============================================================================
// Interfaces para Import/Export CSV (Épica B)
// =============================================================================

export interface ImportReportError {
  row_number: number;
  field: string;
  code: string;
  message: string;
  value?: string;
}

export interface CsvImportResult {
  mode: string;
  dry_run: boolean;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  rejected_count: number;
  errors: ImportReportError[];
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

  getActivity: (limit: number = 10) => {
      return apiClient<RecentActivityResponse>(`/api/admin/activity?limit=${limit}`);
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

  // --- Modo Asistido (Épica C) ---
  getGuestDetail: (id: number) => {
      return apiClient<Guest & { companions: Companion[] }>(`/api/admin/guests/${id}`);
  },

  getMetaOptions: () => {
      return apiClient<{ allergens: string[] }>('/api/meta/options');
  },

  submitAssistedRsvp: (guestId: number, data: any, channel: string) => {
      // data debe cumplir interfaz RSVPUpdateRequest del backend.
      const params = new URLSearchParams();
      if (channel) params.append('channel', channel);

      return apiClient<Guest>(`/api/admin/guests/${guestId}/rsvp?${params.toString()}`, {
          body: data,
          method: 'POST'
      });
  },

  // --- Integridad (Épica D) ---
  resetDatabase: () => {
      return apiClient<void>('/api/admin/guests/reset', {
          method: 'DELETE'
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
   * Descarga el reporte detallado de RSVP (Catering).
   */
  downloadRsvpCsv: async (): Promise<void> => {
      const token = getAdminToken();
      if (!token) throw new Error("No token");
      
      const response = await fetch(`${BASE_URL}/api/admin/reports/rsvp-csv`, {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      
      if (!response.ok) throw new Error("Error downloading CSV");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_rsvp_detallado_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  },

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
  importGuestsCsv: async (
    file: File, 
    mode: string, 
    dryRun: boolean, 
    confirmText?: string
  ): Promise<CsvImportResult> => {
    const token = getAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // FormData: file + mode + dry_run + confirm_text
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('dry_run', dryRun ? 'true' : 'false');
    if (confirmText) {
      formData.append('confirm_text', confirmText);
    }
    
    const response = await fetch(`${BASE_URL}/api/admin/guests-import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error importando CSV: ${response.status}`);
    }
    
    return response.json();
  },
};

