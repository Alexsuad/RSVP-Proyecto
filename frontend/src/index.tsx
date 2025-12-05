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
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import PrivateRoute from '@/components/PrivateRoute';

// Importación de Componentes de Página
// Organizamos por módulo APP (Invitado) y ADMIN (Organizador)
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
// Wrapper Visual Global
// -----------------------------------------------------------------------------

// Contenedor para aplicar estilos base y fondos en las vistas de invitados
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="page-background">
        <div 
            className="page-background__image"
            style={{backgroundImage: "url('https://images.unsplash.com/photo-1496062031456-07b8f162a322?q=80&w=1974&auto=format&fit=crop')"}}
        ></div>
        <div className="page-background__content">
            {children}
        </div>
    </div>
);

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
let usePageWrapper = true;

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
        usePageWrapper = false; // El admin tiene su propio layout
        break;
    case 'admin-event':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminEventPage /></PrivateRoute>;
        usePageWrapper = false;
        break;
    case 'admin-guests':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminGuestsPage /></PrivateRoute>;
        usePageWrapper = false;
        break;
    case 'admin-landing':
        // Pasarela pública de administración
        PageToRender = AdminIndexPage;
        usePageWrapper = false; 
        break;
    case 'admin-login':
        // Formulario de login de administrativo
        PageToRender = AdminLoginPage;
        usePageWrapper = false; 
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
    const AppContent = (
      <React.StrictMode>
        {/* Proveedores Globales de Estado */}
        <I18nProvider>
          <AuthProvider>
            <PageToRender />
          </AuthProvider>
        </I18nProvider>
      </React.StrictMode>
    );

    // Aplicación condicional del wrapper visual
    root.render(
      usePageWrapper ? <PageWrapper>{AppContent}</PageWrapper> : AppContent
    );
}