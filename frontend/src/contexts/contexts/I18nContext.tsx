import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { I18N_DICT, Language } from '../i18n';

type I18nContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, ...args: any[]) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>('es');

  const setLang = useCallback((newLang: Language) => {
    if (I18N_DICT[newLang]) {
      setLangState(newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  const t = useCallback((key: string, ...args: any[]) => {
    const dict = I18N_DICT[lang] || I18N_DICT.es;
    let value = (dict as any)[key] || key;

    // This change allows the dictionary to be a simple key-value store (JSON-friendly)
    // by handling placeholder replacement here.
    if (typeof value === 'string') {
        return value.replace(/\{(\d+)\}/g, (match, index) => {
            const arg = args[index];
            return typeof arg !== 'undefined' ? String(arg) : match;
        });
    }
    
    // For backward compatibility with any function-based values, though the goal is to phase them out.
    if (typeof value === 'function') {
        return value(...args);
    }
    
    return value;
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
