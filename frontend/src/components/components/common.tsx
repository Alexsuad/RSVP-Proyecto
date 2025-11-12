import React from 'react';

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`card ${className}`}>
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', loading = false, disabled, ...props }) => {
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

// --- FormField ---
interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  as?: 'input' | 'textarea';
}
export const FormField: React.FC<FormFieldProps> = ({ label, id, error, as = 'input', ...props }) => {
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const baseClass = as === 'textarea' ? 'textarea' : 'input';
  const errorClass = error ? `${baseClass}--error` : '';
  const hasVisibleError = error && error.trim().length > 0;

  const describedBy = [
    hasVisibleError ? `${id}-error` : undefined,
    props['aria-describedby']
  ].filter(Boolean).join(' ');

  const commonProps = {
    id,
    className: `${baseClass} ${errorClass}`,
    'aria-invalid': !!error,
    'aria-describedby': describedBy || undefined,
    ...props
  };

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">{label}</label>
      <Tag {...commonProps} />
      {hasVisibleError && <p id={`${id}-error`} className="form-error" aria-live="polite">{error}</p>}
    </div>
  );
};


// --- Alert ---
interface AlertProps {
  message: string;
  variant?: 'success' | 'danger';
}
export const Alert: React.FC<AlertProps> = ({ message, variant = 'danger' }) => {
  return (
    <div className={`alert alert--${variant}`} role="alert">
      {message}
    </div>
  );
};

// --- Loader ---
export const Loader: React.FC = () => (
    <div className="loader"></div>
);

// --- LanguageSwitcher ---
import { useI18n } from '../contexts/I18nContext';
export const LanguageSwitcher: React.FC = () => {
    const { setLang, lang, t } = useI18n();
    const languages = [
        { code: 'es', flag: '🇪🇸' },
        { code: 'en', flag: '🇬🇧' },
        { code: 'ro', flag: '🇷🇴' },
    ];
    return (
        <div className="lang-switcher">
            {languages.map(l => (
                <button
                    key={l.code}
                    onClick={() => setLang(l.code as 'es' | 'en' | 'ro')}
                    className={`lang-switcher__btn ${lang === l.code ? 'lang-switcher__btn--active' : ''}`}
                    aria-label={t('lang_switcher_label', l.code)}
                >
                    {l.flag}
                </button>
            ))}
        </div>
    );
};

// --- Page Layout ---
export const PageLayout: React.FC<{children: React.ReactNode}> = ({children}) => (
     <main className="page-layout">
        <LanguageSwitcher />
        {children}
     </main>
);

// --- Admin Layout ---
interface AdminLayoutProps {
    children: React.ReactNode;
    currentPage: 'dashboard' | 'event' | 'guests';
}
export const AdminLayout: React.FC<AdminLayoutProps> = ({children, currentPage}) => {
    const {t} = useI18n();
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
                        {navItems.map(item => (
                             <a key={item.key} href={`${item.path}.html`} className={`admin-nav__link ${currentPage === item.key ? 'admin-nav__link--active' : ''}`}>
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
    )
}