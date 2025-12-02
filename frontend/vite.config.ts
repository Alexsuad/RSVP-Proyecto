/// <reference types="vitest" />
// ============================================================================
// Archivo: vite.config.ts
// Propósito:
//   Configuración principal de Vite para un proyecto React basado en estructura
//   Multi-Page Application (MPA).
// ============================================================================

import { defineConfig } from 'vite';            // Función para definir configuración Vite.
import react from '@vitejs/plugin-react';       // Plugin oficial para habilitar React + JSX.
import path from 'path';                        // Utilidad para trabajar con rutas absolutas.
import { fileURLToPath } from 'url';            // Necesario para calcular __dirname en ESM.

// -----------------------------------------------------------------------------
// Cálculo manual de __dirname en módulos ES
// -----------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Configuración principal de Vite
// ============================================================================
export default defineConfig({
  // ---------------------------------------------------------------------------
  // Plugins de desarrollo
  // ---------------------------------------------------------------------------
  plugins: [react()],

  // ---------------------------------------------------------------------------
  // Alias de rutas
  // ---------------------------------------------------------------------------
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // ---------------------------------------------------------------------------
  // Configuración del build (MPA)
  // ---------------------------------------------------------------------------
  build: {
    rollupOptions: {
      input: {
        // --- Sección APP (Invitados) ---
        appLogin: path.resolve(__dirname, 'public/app/login.html'),
        appRequest: path.resolve(__dirname, 'public/app/request-access.html'),
        appRecover: path.resolve(__dirname, 'public/app/recover-code.html'),
        appRsvp: path.resolve(__dirname, 'public/app/rsvp-form.html'),
        appConfirmed: path.resolve(__dirname, 'public/app/confirmed.html'),

        // --- Sección ADMIN (Organizadores) ---
        adminDashboard: path.resolve(__dirname, 'public/admin/dashboard.html'),
        adminEvent: path.resolve(__dirname, 'public/admin/event.html'),
        adminGuests: path.resolve(__dirname, 'public/admin/guests.html'),
      }
    }
  }, // <--- ¡AQUÍ ESTABA EL ERROR! Faltaba esta coma.

  // ---------------------------------------------------------------------------
  // Configuración de Tests (Vitest)
  // ---------------------------------------------------------------------------
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false, // Desactiva procesamiento CSS en tests para mayor velocidad
  },
} as any);