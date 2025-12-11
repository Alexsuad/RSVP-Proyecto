// frontend/src/pages/app/RsvpFormPage.tsx
// -----------------------------------------------------------------------------
// Página de formulario RSVP.
//
// Este componente React muestra y gestiona el formulario principal de respuesta
// a la invitación. Carga los datos del invitado y las opciones desde la API,
// permite indicar asistencia, gestionar acompañantes, registrar alergias y
// enviar la respuesta al backend respetando la lógica de negocio definida.
// -----------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { guestService } from '@/services/guestService';
import { useI18n } from '@/contexts/I18nContext';
import { GuestData, RsvpPayload, Companion } from '@/types';
import { Card, Button, FormField, Alert, Loader } from '@/components/common';
import PageLayout from '@/components/PageLayout';
import apiClient from '@/services/apiClient';

const normalize_phone_for_frontend = (raw: string): string => {
    // Eliminamos espacios, guiones, paréntesis y puntos
    let result = raw.trim().replace(/[\s\-().]/g, '');

    // Si el usuario ha puesto un '+' al inicio (formato E.164),
    // lo dejamos tal cual.
    if (result.startsWith('+')) {
        return result;
    }

    // Si no empieza por '+', devolvemos el número tal y como queda
    // tras la limpieza básica. El backend podrá aplicar su normalización.
    return result;
};

const isValidPhone = (phone: string) => {
    const normalized = normalize_phone_for_frontend(phone);
    const digits = normalized.replace(/\D/g, '');
// Validación de longitud mínima y máxima
    return digits.length >= 7 && digits.length <= 15;
};

const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Imagen de fondo específica (Wedding Aisle/Matrimonio)
const BG_IMAGE = 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?q=80&w=2070&auto=format&fit=crop';

const RsvpFormPage: React.FC = () => {
    // --- ESTADO LOCAL ---
    const [guest, setGuest] = useState<GuestData | null>(null); // Datos originales
    const [metaOptions, setMetaOptions] = useState<{ allergens: string[] }>({ allergens: [] }); // Opciones del backend
    
    // Estado para código público (si viene en URL)
    const [publicCode, setPublicCode] = useState<string | null>(null);

    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Campos del Formulario (Estado mutable)
    const [attending, setAttending] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [allergies, setAllergies] = useState<string[]>([]); // Array de códigos ["gluten", "soy"]
    const [notes, setNotes] = useState('');
    const [companions, setCompanions] = useState<Companion[]>([]); // Lista dinámica

    const { t } = useI18n(); // Traducciones

    // --- MANEJADOR DE ASISTENCIA ---
    const handle_attending_change = (value: boolean) => {
        // Solo actualizamos el estado de asistencia.
        setAttending(value);
    };

    // --- 1. CARGA INICIAL DE DATOS ---
    useEffect(() => {
        const initData = async () => {
            try {
                // Detectar código en URL
                const params = new URLSearchParams(window.location.search);
                const codeFromUrl = params.get('code');
                
                if (codeFromUrl) {
                    setPublicCode(codeFromUrl);
                }

                // Carga paralela: Guest + Meta
                // Si hay código, usamos endpoint público. Si no, endpoint "/me" (requiere token).
                const guestRequest = codeFromUrl 
                    ? guestService.getGuestByCode(codeFromUrl)
                    : guestService.getMe();

                // Hacemos la carga de metadata resiliente. Si falla, no bloquea la página.
                const metaRequest = apiClient<{ allergens: string[] }>('/api/meta/options')
                    .catch((err) => {
                        console.warn('⚠️ Fallo carga de metadatos (no bloqueante):', err);
                        return { allergens: [] };
                    });

                const [guestData, metaData] = await Promise.all([
                    guestRequest,
                    metaRequest
                ]);

                setGuest(guestData);
                setMetaOptions(metaData);

                // Pre-llenado del formulario si ya existían datos
                if (guestData.confirmed !== null) {
                    setAttending(guestData.confirmed);
                }
                setEmail(guestData.email || '');
                setPhone(guestData.phone || '');
                setNotes(guestData.notes || '');

                if (guestData.allergies) {
                    setAllergies(guestData.allergies.split(',').map(s => s.trim()));
                }

                setCompanions(guestData.companions || []);

            } catch (err: any) {
                console.error('Error cargando datos RSVP', err);
                // Si falla loading, error fatal
                setError(t('form.generic_error')); // O "Código inválido" si status 404
            } finally {
                setLoading(false);
                setSubmitting(false);
            }
        };

        initData();
    }, [t]); 

    // --- 2. GESTIÓN DE ACOMPAÑANTES ---
    const handleAddCompanion = () => {
        if (!guest) return;
        // Regla de negocio: No superar el máximo permitido
        if (companions.length >= guest.max_accomp) return;

        setCompanions([...companions, { name: '', is_child: false, allergies: null }]);
    };

    const handleRemoveCompanion = (index: number) => {
        const newComps = [...companions];
        newComps.splice(index, 1);
        setCompanions(newComps);
    };

    const updateCompanion = (index: number, field: keyof Companion, value: any) => {
        const newComps = [...companions];
        newComps[index] = { ...newComps[index], [field]: value };
        setCompanions(newComps);
    };

    // Helper: alternar alergias de un acompañante concreto
    const toggle_companion_allergy = (index: number, code: string) => {
        setCompanions(prev => {
            const updated = [...prev];
            const current = updated[index];

            if (!current) {
                return prev;
            }

            // Convertimos string "gluten,soy" -> ["gluten", "soy"]
            const current_list = current.allergies
                ? current.allergies.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const exists = current_list.includes(code);
            const new_list = exists
                ? current_list.filter(c => c !== code)
                : [...current_list, code];

            updated[index] = {
                ...current,
                allergies: new_list.length > 0 ? new_list.join(',') : null,
            };

            return updated;
        });
    };

    // --- 3. GESTIÓN DE ALERGIAS (Checkbox Logic) ---
    const toggleAllergy = (code: string) => {
        setAllergies(prev => 
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    // --- 4. ENVÍO DEL FORMULARIO (Submit) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validación A: ¿Asiste o no?
        if (attending === null) {
            setError(t('form.select_option'));
            return;
        }

        // Validación B: Datos de contacto (limpieza y validación)
        const emailClean = email.trim();
        const phoneClean = normalize_phone_for_frontend(phone);

        if (!emailClean && !phoneClean) {
            setError(t('form.contact_required_one'));
            return;
        }
        if (emailClean && !isValidEmail(emailClean)) {
            setError(t('form.contact_invalid_email'));
            return;
        }
        if (phoneClean && !isValidPhone(phoneClean)) {
            setError(t('form.contact_invalid_phone'));
            return;
        }

        // Validación C: Nombres de acompañantes obligatorios
        if (attending) {
            const emptyName = companions.some(c => !c.name.trim());
            if (emptyName) {
                setError(t('form.companion_name_required'));
                return;
            }
        }

        setSubmitting(true);

        try {
            // Construcción del Payload (Lógica de limpieza)
            const payload: RsvpPayload = {
                attending,
                // Si NO asiste, enviamos null/vacio en datos logísticos para limpiar la BD
                email: emailClean || null,
                phone: phoneClean || null,
                notes: notes.trim() || null,
                
                // Si NO asiste, alergias y acompañantes se envían como null/vacío
                allergies: attending 
                    ? (allergies.length > 0 ? allergies.join(',') : null) 
                    : null,
                companions: attending ? companions : [] 
            };

            // Llamada API
            if (publicCode) {
                await guestService.submitRsvpByCode(publicCode, payload);
            } else {
                await guestService.submitRsvp(payload);
            }
            
            // Redirección a página de éxito
            window.location.href = '/app/confirmed.html';

        } catch (err: any) {
            console.error('Error al enviar RSVP', err);

            let key: string | null = null;
            const status = err?.response?.status ?? err?.status ?? 0;

            // REGLA: Si es 401/403 (Sesión expirada), redirigir a Login
            if (status === 401 || status === 403) {
                sessionStorage.removeItem('rsvp_token');
                window.location.href = '/app/login.html';
                return;
            }

            // 1) Si el servicio ya nos manda una clave i18n
            if (err?.message && typeof err.message === 'string' && err.message.includes('.')) {
                key = err.message;
            }
            // 2) Mapeo de otros status HTTP
            else if (status === 429) {
                key = 'form.error_rate_limit';
            } else if (status >= 500) {
                key = 'form.error_server';
            }

            // 3) Fallback genérico
            if (!key) {
                key = 'form.generic_error';
            }

            setError(t(key));
        } finally {
            setSubmitting(false);
        }
    };

    // --- RENDERIZADO ---
    if (loading) {
        return (
            <PageLayout>
                <div className="flex justify-center items-center h-full p-10">
                    <Loader />
                </div>
            </PageLayout>
        );
    }

    if (!guest) {
        return (
            <PageLayout>
                <Card className="rsvp-card w-full max-w-3xl mx-auto">
                    <div className="p-6">
                        <Alert
                            message={error ?? t('form.generic_error')}
                            variant="danger"
                        />
                    </div>
                </Card>
            </PageLayout>
        );
    }

    return (
        <PageLayout backgroundImage={BG_IMAGE}>
             {/* Increased max-w-4xl for wider card and increased spacing */}
            <div className="rsvp-container">
                 {/* Relative for LanguageSwitcher positioning */}
                <Card className="rsvp-card relative border-none shadow-xl bg-white"> 
                    {/* LanguageSwitcher removed (handled by PageLayout) */}

                    <div className="text-center mb-8 pt-6">
                        <h1 className="form-title font-serif text-3xl text-[var(--color-gold-primary)] mb-2">
                            {t('form.hi')}, {guest.full_name}!
                        </h1>
                        <p className="form-subtitle text-[var(--color-text-muted)] italic">
                            {t('form.subtitle')}
                        </p>
                        
                        {/* Invitation Details Section (Restored) */}
                        <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-[var(--color-border)] inline-block">
                             <p className="text-lg text-[var(--color-text-main)] mb-1">
                                {guest.invited_to_ceremony 
                                    ? t('invite.scope.full').split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
                                    : t('invite.scope.reception').split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
                                }
                             </p>
                             <p className="text-sm text-[var(--color-text-muted)]">
                                {t('form.companions_db_note')} <strong>{guest.max_accomp} {t('form.companions_suffix')}</strong>
                             </p>
                        </div>
                    </div>
                    
                    {/* Increased space-y-12 for better vertical rhythm */}
                    <form onSubmit={handleSubmit} className="form-body space-y-12" noValidate>
                        {/* 1. SELECCIÓN DE ASISTENCIA */}
                        {/* 1. SELECCIÓN DE ASISTENCIA (Big Cards) */}
                        {/* 1. SELECCIÓN DE ASISTENCIA (Big Cards) */}
                        <div className="rsvp-section mb-8">
                            <label className="rsvp-section__title rsvp-text-center block">
                                {t('form.attending')}
                            </label>
                            
                            <div className="rsvp-selection-grid">
                                {/* Opción SÍ */}
                                <div 
                                    className={`rsvp-selection-card ${attending === true ? 'active' : ''}`}
                                    onClick={() => handle_attending_change(true)}
                                >
                                    <div className="rsvp-selection-card__icon">
                                        {/* Icono Check/Celebración */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="rsvp-selection-card__label">{t('form.yes')}</span>
                                    {/* Radio oculto para accesibilidad */}
                                    <input 
                                        type="radio" 
                                        name="attending" 
                                        checked={attending === true} 
                                        onChange={() => handle_attending_change(true)} 
                                        className="sr-only" 
                                    />
                                </div>

                                {/* Opción NO */}
                                <div 
                                    className={`rsvp-selection-card ${attending === false ? 'active' : ''}`}
                                    onClick={() => handle_attending_change(false)}
                                >
                                    <div className="rsvp-selection-card__icon">
                                        {/* Icono Face Frown (Neutro/Triste) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm6.75 0c0 .414-.168.75-.375.75S15 10.164 15 9.75 15.168 9 15.375 9s.375.336.375.75z" />
                                        </svg>
                                    </div>
                                    <span className="rsvp-selection-card__label">{t('form.no')}</span>
                                    <input 
                                        type="radio" 
                                        name="attending" 
                                        checked={attending === false} 
                                        onChange={() => handle_attending_change(false)} 
                                        className="sr-only" 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Mensaje si NO asiste */}
                        {attending === false && (
                            <div className="rsvp-message--info">
                                {t('form.no_attend_short')}
                            </div>
                        )}

                        {/* 2. DATOS DE CONTACTO (Siempre visibles) */}
                        <div className="rsvp-section">
                            <h3 className="rsvp-section__title">
                                {t('form.contact_title')}
                            </h3>
                            <div className="rsvp-form-grid">
                                <FormField 
                                    id="email" label={t('form.field_email')} type="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder={t('form.placeholder_email')}
                                    className="form-control"
                                />
                                <FormField 
                                    id="phone" label={t('form.field_phone')} type="tel"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder={t('form.placeholder_phone')}
                                    className="form-control"
                                />
                            </div>
                            <p className="rsvp-helper-text">{t('form.contact_caption')}</p>
                        </div>

                        {/* 3. CAMPOS ADICIONALES (Solo si asiste) */}
                        {attending && (
                            <>
                                {/* Alergias Dinámicas (Desde Backend) */}
                                {/* Alergias Dinámicas (Chips) */}
                                {/* Alergias Dinámicas (Desde Backend) */}
                                <div className="rsvp-section mt-8">
                                    <h3 className="rsvp-section__title">
                                        {t('form.titular_allergies')}
                                    </h3>
                                    <p className="rsvp-subsection-subtitle">{t('form.allergies_caption')}</p>
                                    
                                    <div className="rsvp-allergy-grid">
                                        {metaOptions.allergens.map(code => (
                                            <div 
                                                key={code}
                                                className={`rsvp-allergy-chip ${allergies.includes(code) ? 'active' : ''}`}
                                                onClick={() => toggleAllergy(code)}
                                            >
                                                {/* Checkbox oculto para mantener lógica html si fuera necesaria (opcional) */}
                                                 <input 
                                                    type="checkbox" 
                                                    checked={allergies.includes(code)}
                                                    onChange={() => {}} // Manejado por el onClick del div
                                                    className="sr-only"
                                                />
                                                <span>{t(`options.allergen.${code}`)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Acompañantes (Si la invitación lo permite) */}
                                {guest.max_accomp > 0 && (
                                    <div className="rsvp-section mt-8">
                                        <div className="rsvp-header-flex">
                                            <h3 className="rsvp-section__title mb-0 border-none p-0">
                                                {t('form.companions_title')}
                                            </h3>
                                            <span className="rsvp-badge">
                                                {companions.length} / {guest.max_accomp}
                                            </span>
                                        </div>
                                        
                                        <div className="rsvp-companion-list mb-6">
                                            {companions.map((comp, idx) => {
                                                const comp_allergies = comp.allergies
                                                    ? comp.allergies.split(',').map(s => s.trim()).filter(Boolean)
                                                    : [];

                                                return (
                                                    <div key={idx} className="rsvp-companion-card animate-fade-in">
                                                        <div className="rsvp-companion-card__header">
                                                            <span className="rsvp-companion-card__title">
                                                                {t('form.companion_label')} #{idx + 1}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCompanion(idx)}
                                                                className="rsvp-companion-card__remove-btn"
                                                                title={t('form.cancel')}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        <div className="rsvp-two-columns--compact">
                                                            <FormField
                                                                id={`comp-name-${idx}`}
                                                                label={t('form.field_name')}
                                                                value={comp.name}
                                                                onChange={e => updateCompanion(idx, 'name', e.target.value)}
                                                                placeholder={t('form.placeholder_fullname')}
                                                                className="form-control"
                                                            />
                                                            <div className="form-field">
                                                                <label className="form-field__label">{t('form.profile_label') || 'Perfil'}</label>
                                                                <select
                                                                    className="form-control"
                                                                    value={comp.is_child ? 'child' : 'adult'}
                                                                    onChange={e => updateCompanion(idx, 'is_child', e.target.value === 'child')}
                                                                >
                                                                    <option value="adult">{t('form.adult')}</option>
                                                                    <option value="child">{t('form.child')}</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Alergias del acompañante (Chips) */}
                                                        {metaOptions.allergens.length > 0 && (
                                                            <div className="rsvp-section-divider mt-4 pt-4">
                                                                <p className="rsvp-label--small">
                                                                    {t('form.companion_allergies_label')}
                                                                </p>
                                                                <div className="rsvp-allergy-grid">
                                                                    {metaOptions.allergens.map(code => (
                                                                        <div 
                                                                            key={code}
                                                                            className={`rsvp-allergy-chip ${comp_allergies.includes(code) ? 'active' : ''}`}
                                                                            onClick={() => toggle_companion_allergy(idx, code)}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={comp_allergies.includes(code)}
                                                                                onChange={() => {}} 
                                                                                className="sr-only"
                                                                            />
                                                                            <span>{t(`options.allergen.${code}`)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {companions.length < guest.max_accomp && (
                                            <Button type="button" variant="secondary" onClick={handleAddCompanion} className="btn-dashed">
                                                + {t('form.companion_label')}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Notas / Mensaje - Wrapped in Section for spacing */}
                                <div className="rsvp-section mt-8">
                                    <h3 className="rsvp-subsection-title mb-4">
                                        {t('form.notes.expander_label')}
                                    </h3>
                                    <FormField 
                                        as="textarea" 
                                        id="notes" 
                                        label="" 
                                        value={notes} 
                                        onChange={e => setNotes(e.target.value)} 
                                        placeholder={t('form.notes.placeholder')} 
                                        className="form-control"
                                        rows={4}
                                    />
                                </div>
                            </>
                        )}
                        
                        <div className="rsvp-footer-actions">
                            <Button 
                                type="submit" 
                                loading={submitting} 
                                disabled={submitting || attending === null} 
                                className="w-full text-lg h-14 btn-primary shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                            >
                                {t('form.submit')}
                            </Button>
                             {/* Error Alert moved below submit button */}
                             {error && (
                                <div className="rsvp-error-container">
                                     <Alert message={error} variant="danger" />
                                </div>
                             )}
                        </div>
                    </form>
                </Card>
            </div>
        </PageLayout>
    );
};

export default RsvpFormPage;