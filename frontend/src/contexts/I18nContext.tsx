
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Lang, FALLBACK_I18N, fetchTranslations } from '@/i18n';

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  // Helper to determine initial language with priority: URL > LocalStorage > Default
  const getInitialLang = (): Lang => {
    try {
      // 1. Check URL param
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      
      if (urlLang) {
        // Normalize: 'ro-RO' -> 'ro'
        const normalized = urlLang.split('-')[0].toLowerCase();
        if (FALLBACK_I18N[normalized as Lang]) {
          return normalized as Lang;
        }
      }

      // 2. Check LocalStorage
      const localLang = localStorage.getItem('rsvp_lang');
      if (localLang) {
        const normalized = localLang.split('-')[0].toLowerCase();
        if (FALLBACK_I18N[normalized as Lang]) {
          return normalized as Lang;
        }
      }
    } catch (e) {
      console.warn('Error reading language preferences:', e);
    }
    
    // 3. Fallback
    return 'es';
  };

  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const [translations, setTranslations] = useState<Record<string, string>>(() => FALLBACK_I18N[lang]);

  // Sync lang to LocalStorage whenever it changes (including initial load from URL)
  useEffect(() => {
    try {
      localStorage.setItem('rsvp_lang', lang);
    } catch (e) {
      console.warn('Could not persist language to localStorage:', e);
    }
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    if (FALLBACK_I18N[newLang]) {
      setLangState(newLang);
      
      // Update URL without reloading (replaceState) to persist if user copies link or refreshes
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', newLang);
        window.history.replaceState({}, '', url.toString());
      } catch (e) {
        console.warn('Could not update URL params:', e);
      }
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
