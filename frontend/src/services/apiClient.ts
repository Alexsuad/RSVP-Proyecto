// frontend/src/services/apiClient.ts
// =================================================================================
// 📡 CLIENTE HTTP CENTRALIZADO (Wrapper de Fetch)
// ---------------------------------------------------------------------------------
// - Se encarga de hacer todas las peticiones al Backend.
// - Inyecta automáticamente el Token JWT en la cabecera (Authorization).
// - Maneja la URL base dependiendo del entorno (.env).
// - Procesa los errores HTTP para que la UI sepa si es un 401, 429, 500, etc.
// =================================================================================

import { getToken, clearToken, getAdminToken, clearAdminToken } from '@/utils/auth'; // 📝 Utilidades de autenticación

// Configuración de URL: Intenta leer .env, si falla usa localhost:8000 (Backend local)
const BASE_URL = (import.meta as any).env.VITE_BASE_URL ?? 'http://127.0.0.1:8000';

// Función genérica <T>: T es el tipo de dato que esperamos recibir (ej: GuestData)
async function apiClient<T>(endpoint: string, { body, ...customConfig }: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<T> {
  
  // 1. Preparación de Cabeceras
  let token = getToken();
  
  // Lógica de selección de token: Si es ruta admin, usamos token de admin si existe.
  if (endpoint.startsWith('/api/admin/') || endpoint.startsWith('/admin/')) {
      const adminToken = getAdminToken();
      if (adminToken) {
          token = adminToken;
      }
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  // Si hay sesión iniciada, pegamos el token JWT
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: body ? 'POST' : 'GET', // Si hay cuerpo es POST, si no GET
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  // 2. Ejecución de la llamada (Fetch)
  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // 3. Manejo de Errores Globales

  // Caso: Token vencido o inválido (401) -> Cerrar sesión automáticamente
  if (response.status === 401) {
    // Detectar si fue un fallo de admin o de invitado para limpiar lo correcto
    if (endpoint.startsWith('/api/admin/') || endpoint.startsWith('/admin/')) {
        clearAdminToken();
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/admin/login.html';
        }
    } else {
        clearToken();
        // Redirigir al login si no estamos ya allí
        if (!window.location.pathname.includes('login')) {
           window.location.href = '/app/login.html';
        }
    }
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  // Caso: Cualquier otro error (400, 429, 500)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

  let errorMessage: any =
    errorData.message !== undefined
      ? errorData.message
      : errorData.detail !== undefined
      ? errorData.detail
      : 'API Error';

  // Si detail / message viene como array (típico de errores 422 de FastAPI),
  // convertimos el array en un texto legible.
  if (Array.isArray(errorMessage)) {
    errorMessage = errorMessage
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  // Aseguramos que el mensaje final sea un string
  if (typeof errorMessage !== 'string') {
    errorMessage = 'API Error';
  }

  const error: any = new Error(errorMessage);
  error.status = response.status;
  throw error;
  }

  // Caso especial: 204 No Content (éxito sin cuerpo). No se debe intentar parsear JSON.
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Algunos endpoints pueden responder 200 sin body (o sin JSON válido). Evitamos el crash.
  const raw_body = await response.text();

  if (!raw_body) {
    return undefined as unknown as T;
  }

  return JSON.parse(raw_body) as T;
}

export default apiClient;