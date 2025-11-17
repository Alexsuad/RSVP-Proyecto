
import type { Lang } from './types';

// Minimal fallback dictionary for keys not found in the backend translations.
export const FALLBACK_I18N: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "Boda RSVP",
    "error.generic": "Ocurrió un error. Intenta de nuevo.",
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
    "app.loading": "Se încarcă...",
    "ad_title": "Panou de Administrare", "ad_nav_dashboard": "Dashboard", "ad_nav_event": "Eveniment", "ad_nav_guests": "Invitați",
    "ad_kpi_confirmed": "Confirmați", "ad_kpi_pending": "În așteptare", "ad_kpi_no": "Nu participă",
    "ad_event_title": "Detalii Eveniment", "ad_event_name": "Nunta lui Jenny & Cristian", "ad_event_date": "Sâmbătă, 25 Octombrie, 2025", "ad_event_location": "Domeniul La Romántica, Afară din Oraș", "ad_event_time": "Ceremonie: 16:00 | Recepție: 18:00",
    "ad_guests_title": "Gestionare Invitați", "ad_search": "Caută invitat...", "ad_import": "Importă CSV", "ad_importing": "Se importă...", "ad_import_success": '{inserted} inserați, {updated} actualizați.',
    "ad_table_name": "Nume", "ad_table_rsvp": "RSVP", "ad_table_people": "Însoțitori", "ad_empty": "Nu există invitați de afișat.",
  }
};
