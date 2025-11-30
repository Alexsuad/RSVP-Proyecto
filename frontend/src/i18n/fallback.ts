// frontend/src/i18n/fallback.ts
// =================================================================================
// DICCIONARIO FALLBACK DE TEXTOS I18N
// ---------------------------------------------------------------------------------
// Este módulo define un conjunto mínimo de textos por defecto (fallback) para los
// distintos idiomas soportados por la aplicación (es, en, ro).
//
// Su objetivo principal es:
//   - Proporcionar mensajes de reserva cuando el backend no devuelve una traducción.
//   - Garantizar que las pantallas críticas (login, panel de administración, etc.)
//     siempre muestren textos legibles aunque falle la carga remota de i18n.
//
// IMPORTANTE:
//   - Estas claves no sustituyen a las traducciones del backend, solo las complementan.
//   - Deben mantenerse alineadas con las claves usadas en el frontend (t('...')) y,
//     siempre que sea posible, con el módulo de traducciones del backend.
// =================================================================================

import type { Lang } from './types';

// Minimal fallback dictionary for keys not found in the backend translations.
export const FALLBACK_I18N: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "Boda RSVP",
    "error.generic": "Ocurrió un error. Intenta de nuevo.",
    // Claves específicas de la página de login
    "login.errors_contact_invalid": "Por favor, introduce un correo o teléfono válido.",
    "login.loading": "Validando datos...",
    "app.loading": "Cargando...",
    // Admin keys (not present in backend translations)
    "ad_title": "Panel de Administración", "ad_nav_dashboard": "Dashboard", "ad_nav_event": "Evento", "ad_nav_guests": "Invitados",
    "ad_kpi_confirmed": "Confirmados", "ad_kpi_pending": "Pendientes", "ad_kpi_no": "No asisten",
    "ad_event_title": "Detalles del evento", "ad_event_name": "Boda de Jenny & Cristian", "ad_event_date": "Sábado, 25 de Octubre, 2025", "ad_event_location": "Finca La Romántica, Afueras de la Ciudad", "ad_event_time": "Ceremonia: 4:00 PM | Recepție: 6:00 PM",
    "ad_guests_title": "Gestionar Invitados", "ad_search": "Buscar invitado...", "ad_import": "Importar CSV", "ad_importing": "Importando...", "ad_import_success": '{inserted} insertados, {updated} actualizados.',
    "ad_table_name": "Nombre", "ad_table_rsvp": "RSVP", "ad_table_people": "Acompañantes", "ad_empty": "No hay invitados para mostrar.",
  },
  en: {
    "app.title": "Wedding RSVP",
    "error.generic": "Something went wrong. Try again.",
    // Login-specific keys
    "login.errors_contact_invalid": "Please enter a valid email address or phone number.",
    "login.loading": "Checking your details...",
    "app.loading": "Loading...",
    "ad_title": "Admin Panel", "ad_nav_dashboard": "Dashboard", "ad_nav_event": "Event", "ad_nav_guests": "Guests",
    "ad_kpi_confirmed": "Confirmed", "ad_kpi_pending": "Pending", "ad_kpi_no": "Not Attending",
    "ad_event_title": "Event Details", "ad_event_name": "Wedding of Jenny & Cristian", "ad_event_date": "Saturday, October 25, 2025", "ad_event_location": "La Romántica Estate, Outskirts of the City", "ad_event_time": "Ceremony: 4:00 PM | Reception: 6:00 PM",
    "ad_guests_title": "Manage Guests", "ad_search": "Search guest...", "ad_import": "Import CSV", "ad_importing": "Importing...", "ad_import_success": '{inserted} inserted, {updated} updated.',
    "ad_table_name": "Name", "ad_table_rsvp": "RSVP", "ad_table_people": "Companions", "ad_empty": "No guests to display.",
  },
  ro: {
    "app.title": "Nuntă RSVP",
    "error.generic": "A apărut o eroare. Încearcă din nou.",
    // Chei specifice paginii de autentificare (login)
    "login.errors_contact_invalid": "Te rugăm să introduci un email sau un număr de telefon valid.",
    "login.loading": "Se verifică datele...",
    "app.loading": "Se încarcă...",
    "ad_title": "Panou de Administrare", "ad_nav_dashboard": "Dashboard", "ad_nav_event": "Eveniment", "ad_nav_guests": "Invitați",
    "ad_kpi_confirmed": "Confirmați", "ad_kpi_pending": "În așteptare", "ad_kpi_no": "Nu participă",
    "ad_event_title": "Detalii Eveniment", "ad_event_name": "Nunta lui Jenny & Cristian", "ad_event_date": "Sâmbătă, 25 Octombrie, 2025", "ad_event_location": "Domeniul La Romántica, Afară din Oraș", "ad_event_time": "Ceremonie: 16:00 | Recepție: 18:00",
    "ad_guests_title": "Gestionare Invitați", "ad_search": "Caută invitat...", "ad_import": "Importă CSV", "ad_importing": "Se importă...", "ad_import_success": '{inserted} inserați, {updated} actualizați.',
    "ad_table_name": "Nume", "ad_table_rsvp": "RSVP", "ad_table_people": "Însoțitori", "ad_empty": "Nu există invitați de afișat.",
  }
};
