// File: frontend/src/services/guestService.ts
// ──────────────────────────────────────────────────────────────────────
// Descripción: Servicio que centraliza las llamadas HTTP del flujo de
// invitados (login, solicitud de acceso, recuperación de código y RSVP).
// ──────────────────────────────────────────────────────────────────────

import apiClient from './apiClient';              // Cliente HTTP genérico que unifica peticiones al backend.
import { GuestData, RsvpPayload } from '@/types'; // Tipos compartidos para datos del invitado y payload del RSVP.

// --- Tipos de respuesta de la API ---
// Ayudan a tipar las estructuras que devuelve el backend en las operaciones
// principales del flujo de invitado.
interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface RequestAccessResponse {
  ok: boolean;
  message: string;
  expires_in_sec: number;
  email_conflict?: boolean;
  message_key?: string;
}

interface RecoverCodeResponse {
  ok: boolean;
  message: string;
}

interface SubmitRsvpSummary {
  attending: boolean;
  total_people: number;
}

interface SubmitRsvpResponse {
  ok: boolean;
  confirmed: boolean;
  summary: SubmitRsvpSummary;
}

// --- Servicio de invitado (guestService) ---
// Expone funciones específicas para operar contra los endpoints del backend
// relacionados con invitados del flujo RSVP.
export const guestService = {
  // --- Login de invitado ---
  // Autentica al invitado usando el guest_code y un dato de contacto
  // (email o teléfono) y devuelve el token JWT de acceso.
  login: (data: { guest_code: string; email?: string; phone?: string }) => {
    const payload: any = { guest_code: data.guest_code };

    if (data.email) {
      payload.email = data.email;
    }

    if (data.phone) {
      payload.phone = data.phone;
    }

    return apiClient<LoginResponse>('/api/login', {
      body: payload,
      method: 'POST',
    });
  },

  // --- Solicitud de acceso (request-access) ---
  // Envía los datos básicos del invitado para que el backend verifique si
  // existe una invitación y, en caso válido, pueda enviar el enlace o código.
  requestAccess: (data: {
    full_name: string;
    phone_last4: string;
    email: string;
    lang: string;
    consent: boolean;
  }) => {
    return apiClient<RequestAccessResponse>('/api/request-access', {
      body: data,
      method: 'POST',
    });
  },

  // --- Recuperación de código (recover-code) ---
  // Permite solicitar de nuevo el guest_code usando email o teléfono
  // registrados en la invitación del invitado.
  recoverCode: (data: { email?: string; phone?: string }) => {
    return apiClient<RecoverCodeResponse>('/api/recover-code', {
      body: data,
      method: 'POST',
    });
  },

  // --- Datos del invitado autenticado (getMe) ---
  // Obtiene la ficha del invitado asociada al token actual: datos de contacto
  // y estado de RSVP según lo registrado en el backend.
  getMe: () => {
    return apiClient<GuestData>('/api/guest/me', {
      method: 'GET',
    });
  },

  // --- Envío del RSVP (submitRsvp) ---
  // Envía al backend la respuesta de asistencia del invitado (asiste o no,
  // número de personas, acompañantes, alergias, etc.).
  submitRsvp: (data: RsvpPayload) => {
    return apiClient<SubmitRsvpResponse>('/api/guest/me/rsvp', {
      body: data,
      method: 'POST',
    });
  },
};
