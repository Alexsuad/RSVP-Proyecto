// src/components/PageLayout.tsx
// -----------------------------------------------------------------------------
// Componente de layout público para las páginas de invitado (login, recover,
// request-access, rsvp-form, etc.). Reutiliza la misma estructura visual que
// las plantillas HTML actuales: hero header, contenedor principal y footer.
//
// -----------------------------------------------------------------------------

import React from 'react';
import Footer from './Footer';

// -----------------------------------------------------------------------------
// Props del layout
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Props del layout
// -----------------------------------------------------------------------------
interface PageLayoutProps {
  children: React.ReactNode;
  /**
   * Defines the visual structure of the page:
   * - 'default': Stacked layout (Hero Header -> Main -> Footer). Good for simple pages/mobile.
   * - 'split': 2-Column layout (Image Left | Content Right). Good for login/forms on desktop.
   */
  variant?: 'default' | 'split';
  /**
   * Optional background image URL for the hero/cover section.
   * If not provided, falls back to the default CSS background.
   */
  backgroundImage?: string;
}

/**
 * Componente: LanguageSwitcher
 * Selector de idiomas con estilo "Pill" para mejor contraste
 */
import { useI18n } from '@/contexts/I18nContext';
import type { Lang } from '@/i18n/types';

const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useI18n();

  const languages: { code: Lang; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ro', flag: '🇷🇴', label: 'Română' },
  ];

  return (
    <div className="lang-switcher-pill">
      <span className="lang-switcher__label text-xs text-white/90 font-medium uppercase tracking-wider hidden md:inline-block mr-1">
        {useI18n().t('common.language')}:
      </span>
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          className={`lang-switcher__btn mx-1 text-lg transition-all hover:scale-110 ${lang === l.code ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'}`}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
};

/**
 * Componente: PageLayout
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children, variant = 'default', backgroundImage }) => {
  const { t } = useI18n();

  // ---------------------------------------------------------------------------
  // VARIANT: SPLIT (Nuevo diseño Boda Desktop)
  // ---------------------------------------------------------------------------
  if (variant === 'split') {
    return (
      <div className="layout-split-wrapper relative">
        {/* Columna Izquierda: Imagen Decorativa */}
        <div 
          className="split-cover"
          style={backgroundImage ? { backgroundImage: `url('${backgroundImage}')` } : undefined}
        >
          {/* Overlay opcional para mejorar contraste si se pone texto encima */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        {/* Columna Derecha: Contenido */}
        <div className="split-content relative">
          {/* Selector de idioma esquina superior derecha del contenido */}
          <div className="hero-lang-position">
             <LanguageSwitcher />
          </div>

          <div className="split-content__inner w-full">
            {/* Cabecera simplificada para el lado del formulario */}
            <header className="mb-8 text-center lg:text-left">
              <h1 className="hero-header__title text-3xl lg:text-4xl">Daniela &amp; Cristian</h1>
              <p className="hero-header__subtitle text-sm text-[var(--color-text-muted)]">RSVP Online</p>
            </header>
            
            <main>
              {children}
            </main>

            <Footer />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VARIANT: DEFAULT (Diseño Clásico / Móvil)
  // ---------------------------------------------------------------------------
  return (
    <div className="site-body relative">
      <header 
        className="hero-header relative"
        style={{
          backgroundImage: backgroundImage ? `url('${backgroundImage}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay para mejorar contraste si hay imagen de fondo */}
        {backgroundImage && <div className="absolute inset-0 bg-black/30 z-0"></div>}

        <div className="hero-lang-position">
          <LanguageSwitcher />
        </div>
        <div className="hero-header__content mt-8 relative z-10">
          <h1 className="hero-header__title">Daniela &amp; Cristian</h1>
          <div className="hero-tagline-box">
            <p className="hero-header__subtitle">
              {t('hero.tagline')}
            </p>
          </div>
        </div>
      </header>

      <main className="site-main flex-grow">
        <div className="container mx-auto px-4 py-16">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PageLayout;
export { LanguageSwitcher };
