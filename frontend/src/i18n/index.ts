// src/i18n/index.ts
// ---------------------------------------------
// Barrel de i18n para el frontend.
// No guarda textos grandes, solo re-exporta:
//  - tipos de idioma (Lang)
//  - función fetchTranslations (futuro backend)
//  - diccionario mínimo FALLBACK_I18N
// ---------------------------------------------

export * from './types';
export * from './api';
export { FALLBACK_I18N } from './fallback';
