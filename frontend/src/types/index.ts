// frontend/src/types/index.ts
// =================================================================================
// 📦 DEFINICIÓN DE TIPOS (TypeScript Interfaces)
// ---------------------------------------------------------------------------------
// - Este archivo actúa como el "contrato" de datos entre el Frontend y el Backend.
// - Define la forma exacta que deben tener los objetos JSON.
// - Si el Backend cambia un nombre de campo, TypeScript nos avisará aquí.
// =================================================================================

// 1. Idiomas soportados por la aplicación (usado en i18n y API)
export type Lang = 'es' | 'en' | 'ro';

// 2. Estructura de un Acompañante
// Se usa en dos momentos:
// A) Al recibir los datos guardados (GET /me)
// B) Al enviar el formulario (POST /rsvp)
export interface Companion {
  name: string;
  is_child: boolean;       // true = Niño, false = Adulto
  allergies: string | null; // Puede venir como string "gluten,nuts" o null
}

// 3. Datos del Invitado (Lo que recibimos con GET /api/guest/me)
// Representa el estado actual del usuario en la base de datos.
export interface GuestData {
  guest_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  language: string;
  max_accomp: number;      // Límite de acompañantes permitidos (Lógica de Negocio)
  
  // Estado de confirmación (null = no ha respondido aún)
  confirmed: boolean | null;
  
  // Lógica de invitación (calculada en backend, define qué textos ve el usuario)
  invited_to_ceremony: boolean;
  invite_type: 'full' | 'ceremony' | 'party'; // Canon normalizado
  
  // Datos guardados previamente en la BD
  allergies: string | null;
  notes: string | null;
  companions: Companion[];

  // Campos calculados que pueden venir del backend
  num_adults?: number;
  num_children?: number;
  attending?: boolean;
}

// 4. Payload para enviar RSVP (Cuerpo de POST /api/guest/me/rsvp)
// Es lo que el Frontend le manda al Backend para guardar.
export interface RsvpPayload {
  attending: boolean;      // Decisión crítica: Sí o No
  email: string | null;    // Contacto actualizado
  phone: string | null;    // Contacto actualizado
  allergies: string | null;
  notes: string | null;
  companions: Companion[]; // Lista de acompañantes final
}

// 5. Estructura para el importador CSV (Panel de Admin)
// Define las columnas esperadas al subir el Excel/CSV.
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
  guest_code?: string; // Opcional en el CSV, se ignora o se valida contra el existente
}
