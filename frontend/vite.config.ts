// ============================================================================
// Archivo: vite.config.ts
// Propósito:
//   Configuración principal de Vite para un proyecto React basado en estructura
//   Multi-Page Application (MPA). Define las páginas HTML que actúan como
//   "contenedores" independientes para cada sección del sistema: invitado (RSVP)
//   y administración.
//
//   Esta configuración indica:
//     1. Qué plugin de React usar.
//     2. Qué alias global utilizar para importar módulos (ej: "@/services/...").
//     3. Qué archivos HTML deben compilarse como entradas separadas.
// ============================================================================

import { defineConfig } from 'vite';            // Función para definir configuración Vite.
import react from '@vitejs/plugin-react';       // Plugin oficial para habilitar React + JSX.
import path from 'path';                        // Utilidad para trabajar con rutas absolutas.
import { fileURLToPath } from 'url';            // Necesario para calcular __dirname en ESM.

// -----------------------------------------------------------------------------
// Cálculo manual de __dirname:
//   En módulos ES (type: "module"), __dirname no existe. Esta línea lo recrea.
// -----------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Configuración principal de Vite
// ============================================================================
export default defineConfig({
  // ---------------------------------------------------------------------------
  // Plugins de desarrollo
  //   - react(): habilita Fast Refresh, JSX y optimizaciones propias de React.
  // ---------------------------------------------------------------------------
  plugins: [react()],

  // ---------------------------------------------------------------------------
  // Alias de rutas:
  //   '@' se usa para referirse a la carpeta 'src' desde cualquier archivo.
  //   Ejemplo: import { apiClient } from '@/services/apiClient';
  // ---------------------------------------------------------------------------
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // ---------------------------------------------------------------------------
  // Configuración del build:
  //   Definimos múltiples puntos de entrada HTML para crear una aplicación MPA.
  //   Cada HTML actúa como una página independiente con su propio bundle.
  // ---------------------------------------------------------------------------
  build: {
    rollupOptions: {
      // -----------------------------------------------------------------------
      // Entradas HTML del sistema:
      //   - Páginas del flujo del invitado (RSVP) → public/app/
      //   - Páginas del panel de administración → public/admin/
      //
      //   Cada entrada se compila como una página independiente.
      // -----------------------------------------------------------------------
      input: {
        // ----------------------
        // Sección APP (Invitados)
        // ----------------------
        appLogin: path.resolve(__dirname, 'public/app/login.html'),
        appRequest: path.resolve(__dirname, 'public/app/request-access.html'),
        appRecover: path.resolve(__dirname, 'public/app/recover-code.html'),
        appRsvp: path.resolve(__dirname, 'public/app/rsvp-form.html'),
        appConfirmed: path.resolve(__dirname, 'public/app/confirmed.html'),

        // ---------------------------
        // Sección ADMIN (Organizadores)
        // ---------------------------
        adminDashboard: path.resolve(__dirname, 'public/admin/dashboard.html'),
        adminEvent: path.resolve(__dirname, 'public/admin/event.html'),
        adminGuests: path.resolve(__dirname, 'public/admin/guests.html'),
      }
    }
  }
});
