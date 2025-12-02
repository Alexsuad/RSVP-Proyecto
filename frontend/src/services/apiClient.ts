// frontend/src/services/apiClient.ts
// =================================================================================
// 📡 CLIENTE HTTP CENTRALIZADO (Wrapper de Fetch)
// ---------------------------------------------------------------------------------
// - Se encarga de hacer todas las peticiones al Backend.
// - Inyecta automáticamente el Token JWT en la cabecera (Authorization).
// - Maneja la URL base dependiendo del entorno (.env).
// - Procesa los errores HTTP para que la UI sepa si es un 401, 429, 500, etc.
// =================================================================================

import { getToken, clearToken } from '@/utils/auth'; // 📝 Utilidades de autenticación

// Configuración de URL: Intenta leer .env, si falla usa localhost:8000 (Backend local)
const BASE_URL = (import.meta as any).env.VITE_BASE_URL ?? 'http://127.0.0.1:8000';
const ADMIN_KEY = (import.meta as any).env.VITE_ADMIN_KEY;

// Función genérica <T>: T es el tipo de dato que esperamos recibir (ej: GuestData)
async function apiClient<T>(endpoint: string, { body, ...customConfig }: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<T> {
  
  // 1. Preparación de Cabeceras
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  // Si hay sesión iniciada, pegamos el token JWT
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si es una petición administrativa, pegamos la clave maestra
  if (endpoint.startsWith('/api/admin/') && ADMIN_KEY) {
      headers['x-admin-key'] = ADMIN_KEY;
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
    clearToken();
    // Redirigir al login si no estamos ya allí
    if (!window.location.pathname.includes('login')) {
       window.location.href = '/app/login.html';
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

  return response.json();
}

export default apiClient;