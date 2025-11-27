// src/index.tsx  // Punto de entrada principal
//
// =================================================================================
// 🚀 ENRUTADOR CLIENT-SIDE SIMPLE (Basado en data-page)
// ---------------------------------------------------------------------------------
// Renderiza la página correcta según el atributo data-page del div#root.
// Incluye Providers globales (Auth, I18n) y manejo de rutas protegidas.
// =================================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import PrivateRoute from '@/components/PrivateRoute';

// Page Components
import LoginPage from '@/pages/app/LoginPage';
import RequestAccessPage from '@/pages/app/RequestAccessPage';
import RecoverCodePage from '@/pages/app/RecoverCodePage';
import RsvpFormPage from '@/pages/app/RsvpFormPage';
import ConfirmedPage from '@/pages/app/ConfirmedPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminEventPage from '@/pages/admin/AdminEventPage';
import AdminGuestsPage from '@/pages/admin/AdminGuestsPage';


// =================================================================================
// 🛡️ Definiciones de Tipos
// =================================================================================

// Tipos permitidos para el atributo data-page del HTML
type PageName =
  | 'login'
  | 'request-access'
  | 'recover-code'
  | 'rsvp-form'
  | 'confirmed'
  | 'admin-dashboard'
  | 'admin-event'
  | 'admin-guests';


// =================================================================================
// 🎨 Wrapper Visual y Lógica de Montaje
// =================================================================================

// Wrapper for global styles, extracted from the original App.tsx
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

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

// Leemos data-page con tipado seguro
const pageName = rootElement.dataset.page as PageName | undefined;
let PageToRender: React.FC | null = null;
let usePageWrapper = true;

// Selección de componente según pageName
switch (pageName) {
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
    case 'admin-dashboard':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminDashboardPage /></PrivateRoute>;
        usePageWrapper = false;
        break;
    case 'admin-event':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminEventPage /></PrivateRoute>;
        usePageWrapper = false;
        break;
    case 'admin-guests':
        PageToRender = () => <PrivateRoute adminOnly={true}><AdminGuestsPage /></PrivateRoute>;
        usePageWrapper = false;
        break;
    default:
        console.warn(`Unknown or missing data-page "${pageName}", redirecting to login.`);
        if (!window.location.pathname.endsWith('/app/login.html') && window.location.pathname !== '/') {
            window.location.href = '/app/login.html';
        } else {
            PageToRender = LoginPage;
        }
        break;
}

const root = ReactDOM.createRoot(rootElement);

if (PageToRender) {
    const AppContent = (
      <React.StrictMode>
        <I18nProvider>
          <AuthProvider>
            <PageToRender />
          </AuthProvider>
        </I18nProvider>
      </React.StrictMode>
    );

    root.render(
      usePageWrapper ? <PageWrapper>{AppContent}</PageWrapper> : AppContent
    );
}