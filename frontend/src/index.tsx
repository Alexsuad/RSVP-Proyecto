// =============================================================================
// Archivo: src/index.tsx
// -----------------------------------------------------------------------------
// Propósito: Punto de entrada principal de la aplicación React.
// Rol:
//   - Determina qué árbol de componentes renderizar basado en `data-page`.
//   - Inicializa los proveedores de contexto globales (Auth, I18n).
//   - Configura el enrutador manual client-side para la estructura MPA.
// Dependencias: React DOM, Context Providers, Page Components.
// =============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
// Importación de estilos globales (Sistema Visual)
// Se importan individualmente para asegurar orden de carga en Vite
import '@/styles/theme.css';
import '@/styles/base.css';
import '@/styles/layout.css';
import '@/styles/forms.css';
import '@/styles/components.css';
import '@/styles/login.css';
import '@/styles/app.css';
import '@/styles/admin.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import PrivateRoute from '@/components/PrivateRoute';

// Importación de Componentes de Página
import LoginPage from '@/pages/app/LoginPage';
import RequestAccessPage from '@/pages/app/RequestAccessPage';
import RecoverCodePage from '@/pages/app/RecoverCodePage';
import RsvpFormPage from '@/pages/app/RsvpFormPage';
import ConfirmedPage from '@/pages/app/ConfirmedPage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminEventPage from '@/pages/admin/AdminEventPage';
import AdminGuestsPage from '@/pages/admin/AdminGuestsPage';
import AdminIndexPage from '@/pages/admin/AdminIndexPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';

// -----------------------------------------------------------------------------
// Definición de Tipos
// -----------------------------------------------------------------------------

// Nombres de página válidos mapeados desde el atributo HTML `data-page`
type PageName =
  | 'login'
  | 'request-access'
  | 'recover-code'
  | 'rsvp-form'
  | 'confirmed'
  | 'admin-dashboard'
  | 'admin-event'
  | 'admin-guests'
  | 'admin-landing'
  | 'admin-login';

// -----------------------------------------------------------------------------
// Inicialización y Montaje
// -----------------------------------------------------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

// Lectura del atributo de enrutamiento del DOM
const pageName = rootElement.dataset.page as PageName | undefined;
let PageToRender: React.FC | null = null;

// Lógica de Enrutamiento (Router Switch)
switch (pageName) {
    // --- Rutas de Invitados (App Module) ---
    case 'login':
        PageToRender = LoginPage;
        break;
    case 'request-access':
        PageToRender = RequestAccessPage;
        break;
    case 'recover-code':
        PageToRender = RecoverCodePage;
        break;
    case 'rsvp-form':
        PageToRender = RsvpFormPage;
        break;
    case 'confirmed':
        PageToRender = ConfirmedPage;
        break;

    // --- Rutas de Administrador (Admin Module) ---
    case 'admin-dashboard':
        // Ruta protegida por PrivateRoute
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminDashboardPage /></PrivateRoute>;
        break;
    case 'admin-event':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminEventPage /></PrivateRoute>;
        break;
    case 'admin-guests':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminGuestsPage /></PrivateRoute>;
        break;
    case 'admin-landing':
        // Pasarela pública de administración
        PageToRender = AdminIndexPage;
        break;
    case 'admin-login':
        // Formulario de login de administrativo
        PageToRender = AdminLoginPage;
        break;

    // --- Fallback por defecto ---
    default:
        console.warn(`Unknown or missing data-page "${pageName}", redirecting to login.`);
        if (!window.location.pathname.endsWith('/app/login.html') && window.location.pathname !== '/') {
            window.location.href = '/app/login.html';
        } else {
            PageToRender = LoginPage;
        }
        break;
}

// Renderizado de React
const root = ReactDOM.createRoot(rootElement);

if (PageToRender) {
    root.render(
      <React.StrictMode>
        {/* Proveedores Globales de Estado */}
        <I18nProvider>
          <AuthProvider>
            <PageToRender />
          </AuthProvider>
        </I18nProvider>
      </React.StrictMode>
    );
}