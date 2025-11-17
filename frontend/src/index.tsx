
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

const pageName = rootElement.dataset.page;
let PageToRender: React.FC | null = null;
let usePageWrapper = true;

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
