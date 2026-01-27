import React, { useState, useEffect } from 'react';
import { Button, AdminLayout, FormField, Loader } from '@/components/common';
import { adminService, Guest as ServiceGuest, CsvImportResult, AdminStatsResponse } from '@/services/adminService';
import AssistedRsvpModal from '@/components/admin/AssistedRsvpModal';

// ─────────────────────────────────────────────────────────────────────────────
// Definiciones de Tipos (Adaptador Local)
// ─────────────────────────────────────────────────────────────────────────────

interface Guest extends ServiceGuest {}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminGuestsPage
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Integration Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Emojis Pre-URL-Encoded (Solución Nuclear para evitar corrupción de encoding)
const E = {
  wave: '%F0%9F%91%8B',    // 👋
  ring: '%F0%9F%92%8D',    // 💍
  point: '%F0%9F%91%87',   // 👇
  clock: '%E2%8F%B3',      // ⏳
  plate: '%F0%9F%8D%BD',   // 🍽
  relief: '%F0%9F%98%8C',  // 😌
  one: '1%EF%B8%8F%E2%83%A3', // 1️⃣
  two: '2%EF%B8%8F%E2%83%A3', // 2️⃣
  memo: '%F0%9F%93%9D',    // 📝
  check: '%E2%9C%85',      // ✅
  dance: '%F0%9F%92%83',   // 💃
  man: '%F0%9F%95%BA',     // 🕺
};

const WHATSAPP_TEMPLATES = {
  // ... (Estructura idéntica, referencia E.wave, E.ring, etc.)
  invite: {
    es: `*¡Hola {name}!* ${E.wave}\n\nQueremos celebrar este gran día contigo y tu familia. ${E.ring}\n\nEsta es una *invitación grupal*. Hemos preparado una App especial donde podrás confirmar tu asistencia y registrar a los acompañantes de tu grupo familiar fácilmente.\n\n${E.point} *Gestiona la lista de tu familia aquí:*\n{link}\n\n¡Esperamos contar con todos!`,
    en: `*Hi {name}!* ${E.wave}\n\nWe want to celebrate this big day with you and your family. ${E.ring}\n\nThis is a *group invitation*. We have prepared a special App where you can easily RSVP and register your family group guests.\n\n${E.point} *Manage your family list here:*\n{link}\n\nWe hope to see you all!`,
    ro: `*Salut {name}!* ${E.wave}\n\nVrem să sărbătorim această zi mare alături de tine și familia ta. ${E.ring}\n\nAceasta este o *invitație de grup*. Am pregătit o aplicație specială unde poți confirma prezența și înregistra însoțitorii grupului tău familial foarte ușor.\n\n${E.point} *Gestionează lista familiei tale aici:*\n{link}\n\nSperăm să fiți cu toții alături de noi!`
  },
  reminder: {
    es: `*¡Hola de nuevo, {name}!* ${E.clock}\n\nYa estamos en la recta final y afinando los últimos detalles para la boda.\n\nPara tener todo listo (y no dejar a nadie de tu grupo sin plato ${E.plate}), necesitamos que nos confirmes si podrán acompañarnos.\n\nPor favor, finaliza tu registro y el de tu familia hoy mismo aquí:\n${E.point}\n{link}\n\n¡Gracias por ayudarnos a organizarnos!`,
    en: `*Hi again, {name}!* ${E.clock}\n\nWe are in the final stretch and finalizing the details for the wedding.\n\nTo have everything ready (and not leave anyone in your group without a meal ${E.plate}), we need you to confirm if you can join us.\n\nPlease finalize your and your family's registration today here:\n${E.point}\n{link}\n\nThanks for helping us organize!`,
    ro: `*Salut din nou, {name}!* ${E.clock}\n\nSuntem pe ultima sută de metri și punem la punct ultimele detalii pentru nuntă.\n\nPentru a avea totul pregătit (și a nu lăsa pe nimeni din grupul tău fără meniu ${E.plate}), avem nevoie să ne confirmi dacă ne puteți fi alături.\n\nTe rugăm să finalizezi înregistrarea ta și a familiei tale chiar azi aici:\n${E.point}\n{link}\n\nVă mulțumim pentru ajutor!`
  },
  rescue: {
    es: `*¡Entendido, {name}!* No te preocupes. ${E.relief}\n\nA veces la tecnología se pone difícil. Si la App no te carga, hagámoslo de forma manual por aquí.\n\nPor favor, respóndeme este mensaje con:\n${E.one} Cuántos adultos asistirán (contigo).\n${E.two} Nombres de tus acompañantes.\n\nYo me encargo de subirlos al sistema personalmente. ${E.memo}`,
    en: `*Understood, {name}!* Don't worry. ${E.relief}\n\nSometimes technology gets tricky. If the App doesn't load, let's do it manually here.\n\nPlease reply to this message with:\n${E.one} How many adults will attend (including you).\n${E.two} Names of your guests.\n\nI will personally upload them to the system. ${E.memo}`,
    ro: `*Am înțeles, {name}!* Nu-ți face griji. ${E.relief}\n\nUneori tehnologia ne dă bătăi de cap. Dacă aplicația nu se încarcă, hai să rezolvăm manual aici.\n\nTe rog răspunde-mi la acest mesaj cu:\n${E.one} Câți adulți vor participa (inclusiv tu).\n${E.two} Numele însoțitorilor tăi.\n\nMă ocup eu personal să îi introduc în sistem. ${E.memo}`
  },
  success: {
    es: `*¡Todo listo, {name}!* ${E.check}\n\nHemos recibido correctamente tu confirmación y la de tus acompañantes. Sus lugares ya están asegurados en nuestra lista. ${E.memo}\n\n¡Ahora solo queda preparar el outfit y las ganas de celebrar! ${E.dance}${E.man}\n\nNos vemos muy pronto.`,
    en: `*All set, {name}!* ${E.check}\n\nWe have correctly received your confirmation and that of your guests. Your spots are secured on our list. ${E.memo}\n\nNow just get your outfit and party mood ready! ${E.dance}${E.man}\n\nSee you very soon.`,
    ro: `*Totul este pregătit, {name}!* ${E.check}\n\nAm primit confirmarea ta și a însoțitorilor tăi. Locurile voastre sunt asigurate în lista noastră. ${E.memo}\n\nAcum rămâne doar să vă pregătiți ținutele și cheful de petrecere! ${E.dance}${E.man}\n\nNe vedem foarte curând.`
  }
};

type WhatsAppMsgType = 'invite' | 'reminder' | 'rescue' | 'success';

const getWhatsAppUrl = (guest: Guest, type: WhatsAppMsgType = 'invite'): string => {
    // 1. Base URL
    const baseUrl = (import.meta as any).env.VITE_APP_URL || 'https://rsvp.suarezsiicawedding.com';
    
    // 2. Language selection (default 'es')
    const lang = (guest.language || 'es') as 'es'|'en'|'ro';
    
    // 3. Magic Link construction
    const code = guest.guest_code || '';
    const phone = guest.phone || '';
    const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
    const link = `${baseUrl}/app/login.html?lang=${lang}&c=${code}&p=${phoneClean}`;
    
    // 4. Template selection
    const msgTypeTemplates = WHATSAPP_TEMPLATES[type] || WHATSAPP_TEMPLATES['invite'];
    const template = msgTypeTemplates[lang] || msgTypeTemplates['es'];
    
    // 5. Text replacement and Encoding
    const name = guest.full_name || 'Invitado';
    
    // IMPORTANT: We construct the raw message first with placeholders
    let messageRaw = template
        .replace('{name}', name)
        .replace('{link}', link);

    // 6. Manual Encoding Strategy
    // encodeURIComponent encodes everything, including our pre-encoded emojis (turning % into %25).
    // We need to encode the dynamic parts (name, link, text) BUT preserve our custom emojis.
    
    // Step A: Encode the full string standardly. This will encode our emojis incorrectly (e.g. %F0 becomes %25F0)
    let messageEncoded = encodeURIComponent(messageRaw);

    // Step B: Repair the double-encoded emojis. We replace %25 back to % for our specific emoji patterns.
    // This is safe because normal text won't have these specific sequences unless user typed them explicitly.
    Object.values(E).forEach(emojiCode => {
        // emojiCode is like "%F0%9F..."
        // encodeURIComponent(emojiCode) would be "%25F0%259F..."
        // We want to revert that specific sequence back to the original emojiCode
        const doubleEncoded = encodeURIComponent(emojiCode);
        messageEncoded = messageEncoded.split(doubleEncoded).join(emojiCode);
    });

    return `https://wa.me/${phoneClean}?text=${messageEncoded}`;
};

// --- Custom Dropdown Component for WhatsApp Actions ---
const WhatsAppDropdown: React.FC<{ guest: Guest }> = ({ guest }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleAction = (type: WhatsAppMsgType) => {
        window.open(getWhatsAppUrl(guest, type), '_blank');
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                title="Menú WhatsApp"
                style={{ 
                    padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, 
                    color: '#ffffff', backgroundColor: '#25D366', 
                    border: 'none', borderRadius: '6px', 
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1ebc57'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#25D366'; }}
            >
                WhatsApp 
                <span style={{ fontSize: '0.6rem' }}>▼</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    zIndex: 50, minWidth: '160px', overflow: 'hidden'
                }}>
                    <div style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f8fafc', textTransform: 'uppercase' }}>
                        Enviar mensaje
                    </div>
                    {[
                        { type: 'invite', label: '💌 Invitación', color: '#334155' },
                        { type: 'reminder', label: '⏰ Recordatorio', color: '#b45309' },
                        { type: 'rescue', label: '🆘 Ayuda / Rescate', color: '#dc2626' },
                        { type: 'success', label: '✅ Confirmación', color: '#15803d' }
                    ].map((opt) => (
                        <button
                            key={opt.type}
                            onClick={() => handleAction(opt.type as WhatsAppMsgType)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '8px 12px', fontSize: '0.85rem',
                                border: 'none', backgroundColor: 'transparent',
                                cursor: 'pointer', color: opt.color,
                                borderTop: '1px solid #f1f5f9'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const AdminGuestsPage: React.FC = () => {
    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------
    
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState<AdminStatsResponse | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [rsvpFilter, setRsvpFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');

    // --- Control de Modales ---
    // Editor (Create/Edit)
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
    const [editorData, setEditorData] = useState<Partial<Guest>>({
        full_name: '', email: '', phone: '', language: 'es', side: 'bride', max_accomp: 0, invite_type: 'full'
    });
    
    // Eliminar
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);

    // RSVP Asistido
    const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false);
    const [guestToRsvp, setGuestToRsvp] = useState<Guest | null>(null);
    
    // Import CSV (Opciones y Resultados)
    const [isImportOptionsOpen, setIsImportOptionsOpen] = useState(false);
    const [isImportResultOpen, setIsImportResultOpen] = useState(false);
    
    const [importMode, setImportMode] = useState<string>('UPSERT');
    const [dryRun, setDryRun] = useState<boolean>(true); // Default to safer option
    const [confirmText, setConfirmText] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);

    // -------------------------------------------------------------------------
    // Efectos (Carga de Datos)
    // -------------------------------------------------------------------------

    const fetchGuests = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getGuests(searchTerm ? { search: searchTerm } : undefined);
            setGuests(data);
        } catch (err) {
            console.error("Error cargando invitados:", err);
            setError("No se pudieron cargar los invitados. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await adminService.getStats();
            setStats(data);
        } catch (err) {
            console.error("Error cargando estadísticas:", err);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
             fetchGuests();
             fetchStats();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Leer filtro de URL al montar
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter');
        if (filterParam === 'confirmed' || filterParam === 'pending' || filterParam === 'declined') {
            setRsvpFilter(filterParam);
        }
    }, []);

    // Filtrar guests por rsvpFilter
    const filteredGuests = guests.filter(guest => {
        if (rsvpFilter === 'all') return true;
        if (rsvpFilter === 'confirmed') return guest.confirmed === true;
        if (rsvpFilter === 'pending') return guest.confirmed === null || guest.confirmed === undefined;
        if (rsvpFilter === 'declined') return guest.confirmed === false;
        return true;
    });

    // -------------------------------------------------------------------------
    // Manejadores (Handlers)
    // -------------------------------------------------------------------------

    const handleResetDatabase = async () => {
        if (!window.confirm("⚠️ PELIGRO: ¿Estás seguro de que quieres BORRAR TODA LA BASE DE DATOS?\n\nEsta acción eliminará TODOS los invitados, acompañantes y registros de auditoría permanentemente.\n\nEsta acción es IRREVERSIBLE.")) {
            return;
        }

        const confirmation = window.prompt("Para confirmar, escribe 'BORRAR TODO' en mayúsculas:");
        if (confirmation !== "BORRAR TODO") {
            alert("Acción cancelada. El texto de confirmación no coincide.");
            return;
        }

        setLoading(true);
        try {
            await adminService.resetDatabase();
            setGuests([]);                  
            setImportResult(null);          
            alert("Base de datos reseteada correctamente.");
            await fetchGuests();
        } catch (error) {
            console.error("Error durante reset:", error);
            alert("Error crítico al resetear la base de datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await adminService.exportGuestsCsv();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'guests_export.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exportando CSV:", err);
            alert("Error al exportar el CSV.");
        }
    };

    const handleDownloadRsvpCsv = async () => {
        try {
            await adminService.downloadRsvpCsv();
        } catch (err) {
            console.error("Error descargando reporte:", err);
            alert("Error al descargar el reporte detallado.");
        }
    };

    // --- Import Handlers ---

    const handleOpenImportOptions = () => {
        // Reset states
        setImportMode('UPSERT');
        setDryRun(true); // Default to Safe
        setConfirmText('');
        setSelectedFile(null);
        setImportResult(null);
        setShowErrorDetails(false);
        setIsImportOptionsOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleExecuteImport = async () => {
        if (!selectedFile) {
            alert("Por favor selecciona un archivo CSV.");
            return;
        }
        
        // Validación de seguridad frontend
        if ((importMode === 'SYNC' || importMode === 'REPLACE') && confirmText !== 'BORRAR TODO') {
            alert("Para los modos destructivos (Sincronizar/Reemplazar) debes escribir 'BORRAR TODO' para confirmar.");
            return;
        }

        setImportLoading(true);
        setImportResult(null);

        try {
            const result = await adminService.importGuestsCsv(selectedFile, importMode, dryRun, confirmText);
            setImportResult(result);
            setIsImportOptionsOpen(false); // Cierra opciones
            setIsImportResultOpen(true);   // Abre resultados
            setShowErrorDetails(false);    // Resetear toggle
            
            // Si NO fue dry-run y salió bien, refrescamos la tabla real
            if (!result.dry_run) {
                await fetchGuests();
                await fetchStats();
            }
        } catch (err: any) {
            console.error("Error importando CSV:", err);
            alert(err.message || "Error al importar el CSV.");
        } finally {
            setImportLoading(false);
        }
    };


    // --- Editor (Create / Edit) ---

    const openCreate = () => {
        setEditorMode('create');
        setEditorData({
            full_name: '', 
            email: '', 
            phone: '', 
            language: 'es', 
            side: 'bride', 
            max_accomp: 0, 
            invite_type: 'full',
            relationship: '',
            group_id: ''
        });
        setIsEditorOpen(true);
    };

    const openEdit = (guest: Guest) => {
        setEditorMode('edit');
        setEditorData({ ...guest }); // Copia datos
        setIsEditorOpen(true);
    };

    const handleSubmitEditor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editorMode === 'create') {
                await adminService.createGuest(editorData);
            } else {
                if (!editorData.id) return;
                await adminService.updateGuest(editorData.id, editorData);
            }
            setIsEditorOpen(false);
            fetchGuests();
        } catch (err: any) {
            console.error("Error guardando invitado:", err);
            
            // UX Mejorada: Mostrar mensaje específico del backend si existe
            const backendMsg = err.response?.data?.detail;
            const status = err.response?.status || err.status;
            
            if (backendMsg) {
                alert(`Error: ${backendMsg}`);
            } else if (status === 409) {
                alert("Error: El email o teléfono ya está en uso por otro invitado.");
            } else {
                alert("No se pudo guardar. Revisa los datos o intenta de nuevo.");
            }
        }
    };

    // --- RSVP Asistido ---

    const openRsvp = (guest: Guest) => {
        setGuestToRsvp(guest);
        setIsRsvpModalOpen(true);
    };

    const handleSubmitRsvp = async (guestId: number, data: any, channel: string) => {
        // adminService gestiona la llamada
        await adminService.submitAssistedRsvp(guestId, data, channel);
        // Al volver, refrescamos lista
        fetchGuests();
    };

    // --- Delete ---

    const handleOpenDeleteModal = (guest: Guest) => {
        setGuestToDelete(guest);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteGuest = async () => {
        if (!guestToDelete) return;
        try {
            await adminService.deleteGuest(guestToDelete.id);
            setGuests(guests.filter(g => g.id !== guestToDelete.id));
            setIsDeleteModalOpen(false);
            setGuestToDelete(null);
        } catch (err) {
            console.error("Error eliminando:", err);
            alert("No se pudo eliminar el invitado.");
        }
    };

    // Helper estado visual
    const getStatusParams = (g: Guest) => {
        if (g.confirmed === true) return { label: 'Confirmado', className: 'badge-status badge-status--confirmed' };
        if (g.confirmed === false) return { label: 'No asiste', className: 'badge-status badge-status--declined' };
        return { label: 'Pendiente', className: 'badge-status badge-status--pending' };
    };

    return (
        <AdminLayout currentPage="guests">
            <div className="admin-page-header">
                <div>
                  <h2 className="admin-page-title" style={{ marginBottom: 0 }}>Listado de invitados</h2>
                  <p className="admin-text-muted">Gestiona la lista de asistentes a la boda</p>
                </div>
                <div className="admin-toolbar">
                    <Button 
                        onClick={handleResetDatabase} 
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white', marginRight: '1rem' }}
                    >
                        <span style={{ marginRight: '0.5rem' }}>🗑️</span>
                        Reset BD
                    </Button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }}></div>
                    <Button className="admin-btn-secondary" onClick={handleDownloadRsvpCsv}>
                        📋 Exportar Detallado
                    </Button>
                    <Button className="admin-btn-secondary" onClick={handleExport}>Exportar CSV</Button>
                    <Button className="admin-btn-secondary" onClick={handleOpenImportOptions}>
                        Importar CSV
                    </Button>
                    <Button className="admin-btn-primary" onClick={openCreate}>Añadir nuevo invitado</Button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e8dcc8', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 600 }}>Total Invitados</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#5d4e37' }}>{stats.total_guests}</div>
                        <div style={{ fontSize: '0.8rem', color: '#b8860b' }}>{stats.responses_received} respuestas</div>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e8dcc8', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 600 }}>Asistencia Confirmada</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2e7d32' }}>{stats.confirmed_attendees}</div>
                        <div style={{ fontSize: '0.8rem', color: '#5d4e37' }}>{stats.total_companions} PAX Total</div>
                    </div>
                    <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e8dcc8', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 600 }}>Alergias Detectadas</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c62828' }}>{stats.guests_with_allergies}</div>
                        <div style={{ fontSize: '0.8rem', color: '#5d4e37' }}>Invitaciones con restricciones</div>
                    </div>
                </div>
            )}

            <div className="admin-card">
                <div className="admin-toolbar" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                     <div style={{ minWidth: '280px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Buscar invitado</label>
                        <input
                            id="search-guests"
                            data-testid="search-guests-input"
                            placeholder="Nombre, email o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#ffffff', color: '#5d4e37' }}
                        />
                     </div>
                     <div style={{ minWidth: '180px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Filtrar por estado</label>
                        <select 
                            value={rsvpFilter} 
                            onChange={(e) => setRsvpFilter(e.target.value as any)}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#ffffff', color: '#5d4e37' }}
                        >
                            <option value="all">Todos</option>
                            <option value="confirmed">✅ Confirmados</option>
                            <option value="pending">⏳ Pendientes</option>
                            <option value="declined">❌ No asisten</option>
                        </select>
                     </div>
                     <div style={{ alignSelf: 'flex-end', paddingBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#8b7355' }}>
                            Mostrando {filteredGuests.length} de {guests.length} invitados
                        </span>
                     </div>
                </div>

                {error && <div className="admin-alert-error mb-4">{error}</div>}
                
                {loading ? (
                    <div className="flex justify-center p-8"><Loader /></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Invitado</th>
                                    <th>Estado RSVP</th>
                                    <th>Max. Acomp</th>
                                    <th>Confirmados</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGuests.length > 0 ? (
                                    filteredGuests.map((guest) => {
                                        const status = getStatusParams(guest);
                                        const confirmedCount = (guest.num_adults || 0) + (guest.num_children || 0);
                                        
                                        return (
                                            <tr key={guest.id} className="admin-table-row--striped">
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{guest.full_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{guest.email || guest.phone}</div>
                                                </td>
                                                <td><span className={status.className}>{status.label}</span></td>
                                                <td>{guest.max_accomp}</td>
                                                <td>{confirmedCount > 0 ? confirmedCount : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => openRsvp(guest)} 
                                                            style={{ 
                                                                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, 
                                                                color: '#b8860b', backgroundColor: '#fdf8e8', 
                                                                border: '1px solid #e8d9a0', borderRadius: '6px', 
                                                                cursor: 'pointer', transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#b8860b'; e.currentTarget.style.color = '#ffffff'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fdf8e8'; e.currentTarget.style.color = '#b8860b'; }}
                                                        >
                                                            RSVP
                                                        </button>
                                                        {guest.phone && (
                                                            <WhatsAppDropdown guest={guest} />
                                                        )}
                                                        <button 
                                                            onClick={() => openEdit(guest)} 
                                                            style={{ 
                                                                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 500, 
                                                                color: '#5d4e37', backgroundColor: '#ffffff', 
                                                                border: '1px solid #e8dcc8', borderRadius: '6px', 
                                                                cursor: 'pointer', transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#faf6f0'; e.currentTarget.style.borderColor = '#c9a86c'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e8dcc8'; }}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOpenDeleteModal(guest)} 
                                                            style={{ 
                                                                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 500, 
                                                                color: '#a15c38', backgroundColor: '#ffffff', 
                                                                border: '1px solid #e8dcc8', borderRadius: '6px', 
                                                                cursor: 'pointer', transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#faf0ea'; e.currentTarget.style.borderColor = '#d4a088'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e8dcc8'; }}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={5} className="text-center p-8">No se encontraron invitados.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Editor (Create / Edit) */}
            {isEditorOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <h3 className="admin-modal-title">{editorMode === 'create' ? 'Nuevo Invitado' : 'Editar Invitado'}</h3>
                        
                        <div className="admin-modal-body">
                            <form id="editor-form" onSubmit={handleSubmitEditor} className="space-y-4">
                                <FormField label="Nombre Completo" id="ed-name" value={editorData.full_name || ''} 
                                    onChange={(e) => setEditorData({...editorData, full_name: e.target.value})} required />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Email" id="ed-email" type="email" value={editorData.email || ''} 
                                        onChange={(e) => setEditorData({...editorData, email: e.target.value})} />
                                    <FormField label="Teléfono" id="ed-phone" type="tel" value={editorData.phone || ''} 
                                        onChange={(e) => setEditorData({...editorData, phone: e.target.value})} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Idioma</label>
                                        <select value={editorData.language || 'es'} onChange={(e) => setEditorData({...editorData, language: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="es">Español</option>
                                            <option value="en">Inglés</option>
                                            <option value="ro">Rumano</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Lado</label>
                                        <select value={editorData.side || 'bride'} onChange={(e) => setEditorData({...editorData, side: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="bride">Novia</option>
                                            <option value="groom">Novio</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <FormField label="Relación (ej: Amigo)" id="ed-relationship" value={editorData.relationship || ''} 
                                        onChange={(e) => setEditorData({...editorData, relationship: e.target.value})} />
                                     <FormField label="Grupo / Familia" id="ed-group" value={editorData.group_id || ''} 
                                        onChange={(e) => setEditorData({...editorData, group_id: e.target.value})} />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Máx. Acomp" id="ed-max" type="number" min={0} value={editorData.max_accomp || 0} 
                                        onChange={(e) => setEditorData({...editorData, max_accomp: parseInt(e.target.value) || 0})} />
                                    
                                    <div>
                                        <select value={editorData.invite_type || 'full'} onChange={(e) => setEditorData({...editorData, invite_type: e.target.value})} className="w-full p-2 border rounded">
                                            <option value="full">Ceremonia y Recepción</option>
                                            <option value="party">Solo Recepción</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="admin-modal-actions">
                            <Button className="admin-btn-secondary" onClick={() => setIsEditorOpen(false)} type="button">Cancelar</Button>
                            <Button className="admin-btn-primary" type="submit" form="editor-form">Guardar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal RSVP Asistido */}
            <AssistedRsvpModal
                isOpen={isRsvpModalOpen}
                onClose={() => setIsRsvpModalOpen(false)}
                onSubmit={handleSubmitRsvp}
                guest={guestToRsvp}
            />

            {/* Modal Eliminación */}
            {isDeleteModalOpen && guestToDelete && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                         <h3 className="admin-modal-title">¿Eliminar invitado?</h3>
                         <div className="admin-modal-body">
                            <p className="admin-text-muted mb-6">
                                ¿Seguro que quieres eliminar a <strong>{guestToDelete.full_name}</strong>? 
                                Esta acción no se puede deshacer.
                            </p>
                         </div>
                         <div className="admin-modal-actions">
                            <Button className="admin-btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                            <Button className="admin-btn-primary" onClick={handleDeleteGuest} style={{ backgroundColor: '#e53e3e', borderColor: '#e53e3e' }}>
                                Eliminar
                            </Button>
                         </div>
                    </div>
                </div>
            )}

            {/* Modal de Opciones de Importación - COLORES TIERRA/DORADO */}
            {isImportOptionsOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content" style={{ maxWidth: '560px', width: '95%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        {/* Header - Fondo crema con título dorado */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8dcc8', backgroundColor: '#faf6f0' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#5d4e37' }}>Importar invitados</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#8b7355' }}>Elige cómo procesar tu archivo CSV</p>
                        </div>
                        
                        {/* Body - Fondo beige suave */}
                        <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto', backgroundColor: '#faf8f5' }}>
                            
                            {/* Sección: Modos de Importación */}
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5d4e37', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                    Modo de Importación
                                </p>
                                
                                {/* Opción UPSERT - Selección dorada */}
                                <label 
                                    style={{ 
                                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                                        padding: '14px 16px', marginBottom: '10px', borderRadius: '8px', cursor: 'pointer',
                                        border: importMode === 'UPSERT' ? '2px solid #c9a86c' : '2px solid #e8dcc8',
                                        backgroundColor: importMode === 'UPSERT' ? '#faf6f0' : '#ffffff',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <input type="radio" name="importMode" checked={importMode === 'UPSERT'} onChange={() => setImportMode('UPSERT')} style={{ marginTop: '3px', accentColor: '#b8860b' }} />
                                    <div>
                                        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: importMode === 'UPSERT' ? '#5d4e37' : '#6b7280' }}>
                                            Actualizar y agregar
                                            <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 500, color: '#7a5c3e', backgroundColor: '#f5e6d3', padding: '2px 8px', borderRadius: '4px' }}>Recomendado</span>
                                        </span>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b7355', marginTop: '4px', lineHeight: 1.4 }}>
                                            Actualiza invitados existentes (mismo teléfono) y crea los nuevos. Respeta las confirmaciones RSVP.
                                        </span>
                                    </div>
                                </label>

                                {/* Opción ADD_ONLY */}
                                <label 
                                    style={{ 
                                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                                        padding: '14px 16px', marginBottom: '10px', borderRadius: '8px', cursor: 'pointer',
                                        border: importMode === 'ADD_ONLY' ? '2px solid #c9a86c' : '2px solid #e8dcc8',
                                        backgroundColor: importMode === 'ADD_ONLY' ? '#faf6f0' : '#ffffff',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <input type="radio" name="importMode" checked={importMode === 'ADD_ONLY'} onChange={() => setImportMode('ADD_ONLY')} style={{ marginTop: '3px', accentColor: '#b8860b' }} />
                                    <div>
                                        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: importMode === 'ADD_ONLY' ? '#5d4e37' : '#6b7280' }}>Solo agregar nuevos</span>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b7355', marginTop: '4px' }}>
                                            Si un teléfono ya existe, lo omite (no lo modifica).
                                        </span>
                                    </div>
                                </label>

                                {/* Opciones Avanzadas */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                    {/* SYNC - Tono terracota */}
                                    <label 
                                        style={{ 
                                            display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                            border: importMode === 'SYNC' ? '2px solid #a0826d' : '2px solid #e8dcc8',
                                            backgroundColor: importMode === 'SYNC' ? '#f5ebe4' : '#ffffff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <input type="radio" name="importMode" checked={importMode === 'SYNC'} onChange={() => setImportMode('SYNC')} style={{ accentColor: '#a0826d' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#7a5c50' }}>Sincronizar</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#8b7355', lineHeight: 1.3 }}>Elimina invitados que no estén en el CSV.</span>
                                    </label>

                                    {/* REPLACE - Rojo terracota oscuro */}
                                    <label 
                                        style={{ 
                                            display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '8px', cursor: 'pointer',
                                            border: importMode === 'REPLACE' ? '2px solid #a15c38' : '2px solid #e8dcc8',
                                            backgroundColor: importMode === 'REPLACE' ? '#faf0ea' : '#ffffff'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <input type="radio" name="importMode" checked={importMode === 'REPLACE'} onChange={() => setImportMode('REPLACE')} style={{ accentColor: '#a15c38' }} />
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#8b4513' }}>Reemplazo Total</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#8b7355', lineHeight: 1.3 }}>Borra <strong>todo</strong> y carga desde cero.</span>
                                    </label>
                                </div>
                            </div>

                            {/* Sección: Archivo CSV */}
                            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8dcc8', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5d4e37', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                    Archivo CSV
                                </p>
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleFileChange} 
                                    style={{ display: 'block', width: '100%', fontSize: '0.875rem', color: '#8b7355' }}
                                />
                            </div>

                            {/* Sección: Modo Simulación - Tono ocre/dorado */}
                            <div style={{ backgroundColor: '#fdf8e8', border: '1px solid #e8d9a0', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <input 
                                    type="checkbox" 
                                    id="dryRunCheck"
                                    checked={dryRun} 
                                    onChange={(e) => setDryRun(e.target.checked)} 
                                    style={{ width: '18px', height: '18px', accentColor: '#b8860b' }}
                                />
                                <label htmlFor="dryRunCheck" style={{ fontSize: '0.9rem', fontWeight: 500, color: '#7a6520', cursor: 'pointer' }}>
                                    Modo Simulación (Previsualizar sin aplicar cambios)
                                </label>
                            </div>

                            {/* Sección Confirmación (Conditional) - Rojo terracota */}
                            {(importMode === 'SYNC' || importMode === 'REPLACE') && (
                                <div style={{ backgroundColor: '#faf0ea', border: '1px solid #d4a088', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '1.75rem' }}>⚠️</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem', color: '#8b4513' }}>CONFIRMACIÓN REQUERIDA</p>
                                        <p style={{ margin: '4px 0 8px', fontSize: '0.75rem', color: '#a15c38' }}>Esta acción eliminará datos.</p>
                                        <input 
                                            type="text" 
                                            placeholder="Escribe: BORRAR TODO"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d4a088', borderRadius: '6px', fontSize: '0.875rem' }}
                                        />
                                    </div>
                                </div>
                            )}

                        </div>
                        
                        {/* Footer - Fondo crema con botones dorados */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8dcc8', backgroundColor: '#faf6f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setIsImportOptionsOpen(false)}
                                style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500, color: '#5d4e37', backgroundColor: '#ffffff', border: '1px solid #c9a86c', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleExecuteImport} 
                                disabled={importLoading || !selectedFile || ((importMode === 'SYNC' || importMode === 'REPLACE') && confirmText !== 'BORRAR TODO')}
                                style={{ 
                                    padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', 
                                    backgroundColor: (importLoading || !selectedFile || ((importMode === 'SYNC' || importMode === 'REPLACE') && confirmText !== 'BORRAR TODO')) ? '#c9b896' : '#b8860b',
                                    border: 'none', borderRadius: '6px', cursor: (importLoading || !selectedFile) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {importLoading ? 'Procesando...' : (dryRun ? '👁️ Simular Importación' : '✅ Ejecutar Importación')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Import Results - COLORES TIERRA/DORADO */}
            {isImportResultOpen && importResult && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content" style={{ maxWidth: '520px', width: '95%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8dcc8', backgroundColor: '#faf6f0' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#5d4e37' }}>
                                {importResult.dry_run ? 'Previsualización de Cambios' : 'Resultado de Importación'}
                            </h3>
                        </div>
                        
                        {/* Body */}
                        <div style={{ padding: '24px', backgroundColor: '#faf8f5' }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ backgroundColor: '#f0faf0', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '20px 12px', textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: '2rem', lineHeight: 1.1, color: '#2e7d32', marginBottom: '8px' }}>{importResult.created_count}</span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#388e3c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Se crearán</span>
                                </div>
                                <div style={{ backgroundColor: '#fdf8e8', border: '1px solid #e8d9a0', borderRadius: '10px', padding: '20px 12px', textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: '2rem', lineHeight: 1.1, color: '#b8860b', marginBottom: '8px' }}>{importResult.updated_count}</span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#7a6520', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Se actualizarán</span>
                                </div>
                                <div style={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '20px 12px', textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontWeight: 700, fontSize: '2rem', lineHeight: 1.1, color: '#5d4e37', marginBottom: '8px' }}>{importResult.skipped_count + importResult.rejected_count}</span>
                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Omitidos</span>
                                </div>
                            </div>
                            
                            {/* Errors Section */}
                            {importResult.errors.length > 0 ? (
                                <div>
                                    <div 
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', backgroundColor: '#f5ebe4', borderRadius: '6px' }}
                                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                                    >
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#5d4e37' }}>
                                            {showErrorDetails ? '▼ Ocultar detalles' : `▶ Ver detalles de errores/alertas (${importResult.errors.length})`}
                                        </span>
                                    </div>
                                    
                                    {showErrorDetails && (
                                        <div style={{ marginTop: '8px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e8dcc8' }}>
                                            {importResult.errors.map((err, idx) => (
                                                <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < importResult.errors.length - 1 ? '1px solid #e8dcc8' : 'none' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ backgroundColor: '#faf0ea', color: '#a15c38', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>Fila {err.row_number}</span>
                                                        <span style={{ fontWeight: 600, color: '#5d4e37' }}>{err.code}</span>
                                                    </div>
                                                    <p style={{ margin: '4px 0', color: '#8b7355' }}>{err.message}</p>
                                                    {err.field && <div style={{ fontSize: '0.75rem', color: '#a09080', fontFamily: 'monospace' }}>Campo: {err.field} | Valor: {err.value}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ backgroundColor: '#f0faf0', border: '1px solid #c8e6c9', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '2rem', marginBottom: '8px' }}>✅</span>
                                    <strong style={{ color: '#2e7d32' }}>¡Todo parece correcto!</strong>
                                    <p style={{ fontSize: '0.85rem', color: '#388e3c', marginTop: '4px' }}>No se encontraron conflictos ni errores en el archivo.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8dcc8', backgroundColor: '#faf6f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setIsImportResultOpen(false)}
                                style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', backgroundColor: '#b8860b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminGuestsPage;
