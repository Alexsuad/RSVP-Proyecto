// frontend/src/components/common.tsx
// -----------------------------------------------------------------------------
// Componentes compartidos de interfaz para el proyecto RSVP.
// Incluye tarjetas, botones, campos de formulario, mensajes de alerta,
// indicador de carga y el layout básico de la zona de administración.
// -----------------------------------------------------------------------------

import React from 'react';

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
  rows?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  as = 'input',
  rows,
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
    // Solo añadimos "rows" cuando el campo es un textarea
    ...(as === 'textarea' && typeof rows === 'number' ? { rows } : {}),
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
// -----------------------------------------------------------------------------
// Componente: ActionRow
// Link de acción visualmente destacado para opciones secundarias (Login, etc.)
// Utiliza un diseño de fila con icono y texto, optimizado para UX móvil.
// -----------------------------------------------------------------------------
interface ActionRowProps {
  href: string;               // URL de destino del enlace
  icon: React.ReactNode;      // Elemento SVG o icono a mostrar
  text: string;               // Texto principal del enlace
  subtext?: string;           // (Opcional) Texto secundario o descriptivo
}

export const ActionRow: React.FC<ActionRowProps> = ({
  href,
  icon,
  text,
  subtext,
}) => {
  return (
    <a href={href} className="auth-card__action-row">
      <div className="auth-card__icon">{icon}</div>
      <div className="auth-card__text-group">
        {subtext && <span className="auth-card__text-muted">{subtext}</span>}
        <span className="auth-card__link-text">{text}</span>
      </div>
    </a>
  );
};


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
  // Eliminamos useI18n para el admin, usamos textos fijos en español.

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { key: 'event', label: 'Evento', path: '/admin/event' },
    { key: 'guests', label: 'Invitados', path: '/admin/guests' },
  ];

  return (
    <div className="admin-scope admin-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="admin-header">
        <nav className="admin-nav">
          <h1 className="admin-nav__title">Panel de gestión</h1>
          <div className="admin-nav__links">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={`${item.path}.html`}
                className={`admin-nav__link ${
                  currentPage === item.key ? 'admin-nav__link--active' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
            <button
                onClick={() => {
                  sessionStorage.removeItem('rsvp_admin_token');
                  window.location.href = '/admin/login.html';
                }}
                className="admin-nav__link"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  marginLeft: '20px',
                  fontSize: '0.9rem',
                  color: '#c62828',
                  textDecoration: 'underline'
                }}
            >
              Cerrar Sesión
            </button>
          </div>
        </nav>
      </header>

      <main className="admin-page">
        {children}
      </main>
    </div>
  );
};
