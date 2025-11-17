
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        appLogin: path.resolve(__dirname, 'public/app/login.html'),
        appRequest: path.resolve(__dirname, 'public/app/request-access.html'),
        appRecover: path.resolve(__dirname, 'public/app/recover-code.html'),
        appRsvp: path.resolve(__dirname, 'public/app/rsvp-form.html'),
        appConfirmed: path.resolve(__dirname, 'public/app/confirmed.html'),
        adminDashboard: path.resolve(__dirname, 'public/admin/dashboard.html'),
        adminEvent: path.resolve(__dirname, 'public/admin/event.html'),
        adminGuests: path.resolve(__dirname, 'public/admin/guests.html'),
      }
    }
  }
});
