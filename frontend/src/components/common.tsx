// frontend/src/components/common.tsx
// -----------------------------------------------------------------------------
// Componentes compartidos de interfaz para el proyecto RSVP.
// Incluye tarjetas, botones, campos de formulario, mensajes de alerta,
// indicador de carga y el layout básico de la zona de administración.
// -----------------------------------------------------------------------------

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';

// -----------------------------------------------------------------------------
// Componente: Card
// Tarjeta contenedora genérica para agrupar contenido relacionado.
// -----------------------------------------------------------------------------
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`card ${className}`}>
    {children}
  </div>
);

// -----------------------------------------------------------------------------
// Componente: Button
// Botón reutilizable con soporte para variantes visuales y estado de carga.
// -----------------------------------------------------------------------------
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}) => {
  const variantClass = `btn--${variant}`;

  return (
    <button
      className={`btn ${variantClass} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Loader /> : children}
    </button>
  );
};

// -----------------------------------------------------------------------------
// Componente: FormField
// Campo de formulario con etiqueta, control de error accesible y soporte para
// input o textarea según la configuración recibida.
// -----------------------------------------------------------------------------
interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  as?: 'input' | 'textarea';
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  as = 'input',
  ...props
}) => {
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const baseClass = as === 'textarea' ? 'textarea' : 'input';
  const errorClass = error ? `${baseClass}--error` : '';
  const hasVisibleError = !!(error && error.trim().length > 0);

  const describedBy = [
    hasVisibleError ? `${id}-error` : undefined,
    props['aria-describedby'],
  ]
    .filter(Boolean)
    .join(' ');

  const commonProps = {
    id,
    className: `${baseClass} ${errorClass}`,
    'aria-invalid': !!error,
    'aria-describedby': describedBy || undefined,
    ...props,
  };

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
      </label>
      <Tag {...commonProps} />
      {hasVisibleError && (
        <p
          id={`${id}-error`}
          className="form-error"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Componente: Alert
// Mensaje de alerta para mostrar errores o confirmaciones en los formularios.
// -----------------------------------------------------------------------------
interface AlertProps {
  message: string;
  variant?: 'success' | 'danger';
}

export const Alert: React.FC<AlertProps> = ({
  message,
  variant = 'danger',
}) => {
  return (
    <div className={`alert alert--${variant}`} role="alert">
      {message}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Componente: Loader
// Indicador de carga simple para mostrar mientras se realiza una petición.
// -----------------------------------------------------------------------------
export const Loader: React.FC = () => (
  <div className="loader" />
);

// -----------------------------------------------------------------------------
// Componente: AdminLayout
// Estructura base para las páginas de administración (dashboard, evento, invitados).
// Renderiza la cabecera con navegación y un contenedor principal para el contenido.
// -----------------------------------------------------------------------------
interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'event' | 'guests';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentPage,
}) => {
  const { t } = useI18n();

  const navItems = [
    { key: 'dashboard', label: 'ad_nav_dashboard', path: '/admin/dashboard' },
    { key: 'event', label: 'ad_nav_event', path: '/admin/event' },
    { key: 'guests', label: 'ad_nav_guests', path: '/admin/guests' },
  ];

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <nav className="container admin-nav">
          <h1 className="admin-nav__title">{t('ad_title')}</h1>
          <div className="admin-nav__links">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={`${item.path}.html`}
                className={`admin-nav__link ${
                  currentPage === item.key ? 'admin-nav__link--active' : ''
                }`}
              >
                {t(item.label)}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main className="container admin-main">
        {children}
      </main>
    </div>
  );
};
