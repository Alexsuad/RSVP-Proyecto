
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Lang, FALLBACK_I18N, fetchTranslations } from '@/i18n';

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>('es');
  const [translations, setTranslations] = useState<Record<string, string>>(() => FALLBACK_I18N.es);

  const setLang = useCallback((newLang: Lang) => {
    if (FALLBACK_I18N[newLang]) {
      setLangState(newLang);
    }
  }, []);

  useEffect(() => {
    const loadTranslations = async () => {
      document.documentElement.lang = lang;
      // Start with fallback
      let newTranslations = FALLBACK_I18N[lang];
      try {
        // Attempt to fetch from backend
        const backendTranslations = await fetchTranslations(lang);
        // Merge backend translations over fallback
        newTranslations = { ...newTranslations, ...backendTranslations };
      } catch (error) {
        console.warn(`Could not fetch translations for '${lang}', using fallback. Error:`, (error as Error).message);
      }
      setTranslations(newTranslations);
    };

    loadTranslations();
  }, [lang]);

  const t = useCallback((key: string, replacements?: Record<string, string | number>) => {
    let value = (translations as any)[key] || key;

    if (replacements && typeof value === 'string') {
      for (const placeholder in replacements) {
        // Use a regex to replace all occurrences of {placeholder}
        value = value.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacements[placeholder]));
      }
    }
    
    return value;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
