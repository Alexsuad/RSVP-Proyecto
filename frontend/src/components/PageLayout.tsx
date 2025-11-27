// src/components/PageLayout.tsx
// -----------------------------------------------------------------------------
// Componente de layout público para las páginas de invitado (login, recover,
// request-access, rsvp-form, etc.). Reutiliza la misma estructura visual que
// las plantillas HTML actuales: hero header, contenedor principal y footer.
//
// -----------------------------------------------------------------------------

import React from 'react';

// -----------------------------------------------------------------------------
// Props del layout
// -----------------------------------------------------------------------------
interface PageLayoutProps {
  children: React.ReactNode;
}

/**
 * Componente: LanguageSwitcher
 *
 * Encapsula el bloque visual del selector de idioma que aparece en las páginas
 * públicas (botones con banderas). De momento solo es presentacional, sin
 * lógica de cambio de idioma. Más adelante se podrá conectar con el contexto
 * de I18n si hace falta.
 */
// Importamos el hook y los tipos
import { useI18n } from '@/contexts/I18nContext';
import type { Lang } from '@/i18n/types';

const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useI18n(); // <-- Usamos el contexto

  const languages: { code: Lang; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ro', flag: '🇷🇴', label: 'Română' },
  ];

  return (
    <div className="lang-switcher">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)} // <-- ¡Aquí está la magia!
          title={l.label}
          className={`lang-switcher__btn ${lang === l.code ? 'lang-switcher__btn--active' : ''}`}
          // Estilos inline opcionales para feedback visual inmediato
          style={{ opacity: lang === l.code ? 1 : 0.6 }}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
};

/**
 * Componente: PageLayout
 *
 * Define la estructura común de las páginas públicas:
 *  - Cabecera tipo "hero" con nombre de la pareja y subtítulo.
 *  - Selector de idioma reutilizable.
 *  - Zona principal .site-main con un contenedor .container donde se inyecta
 *    el contenido específico de cada pantalla (tarjeta de login, recover, etc.).
 *  - Pie de página académico.
 *
 * El contenido concreto de cada página se pasa como children.
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="site-body">
      {/* Cabecera hero reutilizada tal como en login.html / rsvp-form.html */}
      <header className="hero-header">
        <div className="hero-header__content">
          <h1 className="hero-header__title">Daniela &amp; Cristian</h1>
          <p className="hero-header__subtitle">
            Una fecha, un lugar, un amor eterno. Solo falta tu presencia.
          </p>
        </div>

        {/* Selector de idioma común */}
        <LanguageSwitcher />
      </header>

      {/* Contenido principal: aquí se inyectan las tarjetas de cada página */}
      <main className="site-main">
        <div className="container">
          {children}
        </div>
      </main>

      {/* Pie de página académico reutilizado */}
      <footer className="site-footer">
        <div className="container">
          <small className="site-footer__text">
            Proyecto académico – Sistema RSVP para bodas
          </small>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
export { LanguageSwitcher };
