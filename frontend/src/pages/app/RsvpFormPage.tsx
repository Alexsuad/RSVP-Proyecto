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
import apiClient from '@/services/apiClient'; // Para llamar a meta/options

// --- HELPERS DE VALIDACIÓN ---
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
};

const RsvpFormPage: React.FC = () => {
    // --- ESTADO LOCAL ---
    const [guest, setGuest] = useState<GuestData | null>(null); // Datos originales
    const [metaOptions, setMetaOptions] = useState<{ allergens: string[] }>({ allergens: [] }); // Opciones del backend
    
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
        setAttending(value);

        // Si marca "No asisto", limpiamos acompañantes y alergias
        if (!value) {
            setCompanions([]);
            setAllergies([]);
        }
    };

    // --- 1. CARGA INICIAL DE DATOS ---
    useEffect(() => {
        const initData = async () => {
            try {
                // Carga paralela: más rápido que esperar una tras otra
                const [guestData, metaData] = await Promise.all([
                    guestService.getMe(),
                    apiClient<{ allergens: string[] }>('/api/meta/options')
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

                // Transformación: String de BD "gluten,soy" -> Array JS ["gluten", "soy"]
                if (guestData.allergies) {
                    setAllergies(guestData.allergies.split(',').map(s => s.trim()));
                }

                setCompanions(guestData.companions || []);

            } catch (err: any) {
               // Log técnico en consola para depuración (no visible para el usuario)
                console.error('Error al enviar RSVP', err);

                // Intentamos obtener una clave de mensaje coherente con el backend
                const status = err?.response?.status ?? err?.status;
                const messageKeyFromResponse = err?.response?.data?.message_key;

                // Clave por defecto si no logramos identificar nada más específico
                let key: string = 'form.generic_error';

                if (typeof messageKeyFromResponse === 'string') {
                    // Caso ideal: el backend envía una message_key ya pensada para i18n
                    key = messageKeyFromResponse;
                } else if (status === 409) {
                    // Conflicto de datos: email o teléfono ya usados por otro invitado
                    key = 'form.email_or_phone_conflict';
                } else if (typeof err?.message === 'string' && err.message.includes('.')) {
                    // Compatibilidad: si nos llega una clave directa (ej. form.error_unauthorized)
                    key = err.message;
                }

                setError(t(key));
            } finally {
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
        const phoneClean = phone.trim().replace(/[\s-]/g, ''); 

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
                allergies: attending ? (allergies.length > 0 ? allergies.join(',') : null) : null,
                companions: attending ? companions : [] 
            };

            // Llamada API
            await guestService.submitRsvp(payload);
            
            // Redirección a página de éxito
            window.location.href = '/app/confirmed.html';

        } catch (err: any) {
            console.error('Error al enviar RSVP', err);

            let key: string | null = null;

            // 1) Si el servicio ya nos manda una clave i18n (ej: "form.contact_invalid_email")
            if (err?.message && typeof err.message === 'string' && err.message.includes('.')) {
                key = err.message;
            }
            // 2) Si tenemos status HTTP, mapeamos casos típicos
            else if (err?.response?.status || err?.status) {
                const status = err.response?.status ?? err.status;

                if (status === 401) {
                    key = 'form.error_unauthorized';
                } else if (status === 429) {
                    key = 'form.error_rate_limit';
                } else if (status >= 500) {
                    key = 'form.error_server';
                }
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
                <div className="flex justify-center p-10">
                    <Loader />
                </div>
            </PageLayout>
        );
    }

    if (!guest) {
        return (
            <PageLayout>
                <Card className="rsvp-card">
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
        <PageLayout>
            <Card className="rsvp-card"> 
                <div className="text-center mb-6">
                    <h1 className="form-title font-serif text-2xl text-[var(--color-heading)]">
                        {t('form.hi')}, {guest.full_name}!
                    </h1>
                    <p className="form-subtitle text-gray-600">{t('form.subtitle')}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="form-body space-y-8" noValidate>
                    {error && <Alert message={error} variant="danger" />}

                    {/* 1. SELECCIÓN DE ASISTENCIA */}
                    <fieldset>
                        <legend className="fieldset-legend">{t('form.attending')}</legend>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <label className={`radio-card__label ${attending === true ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="attending" 
                                    className="hidden" 
                                    checked={attending === true} 
                                    onChange={() => handle_attending_change(true)} 
                                />
                                {t('form.yes')}
                            </label>
                            <label className={`radio-card__label ${attending === false ? 'bg-gray-600 text-white border-gray-600' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="attending" 
                                    className="hidden" 
                                    checked={attending === false} 
                                    onChange={() => handle_attending_change(false)} 
                                />
                                {t('form.no')}
                            </label>
                        </div>
                    </fieldset>
                    
                    {/* Mensaje si NO asiste */}
                    {attending === false && (
                        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600 italic">
                            {t('form.no_attend_short')}
                        </div>
                    )}

                    {/* 2. DATOS DE CONTACTO (Siempre visibles) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                            {t('form.contact_title')}
                        </h3>
                        <div className="space-y-4">
                            <FormField 
                                id="email" label={t('form.field_email')} type="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder={t('form.placeholder_email')}
                            />
                            <FormField 
                                id="phone" label={t('form.field_phone')} type="tel"
                                value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder={t('form.placeholder_phone')}
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('form.contact_caption')}</p>
                        </div>
                    </div>

                    {/* 3. CAMPOS ADICIONALES (Solo si asiste) */}
                    {attending && (
                        <>
                            {/* Alergias Dinámicas (Desde Backend) */}
                            <fieldset>
                                <legend className="fieldset-legend">{t('form.titular_allergies')}</legend>
                                <p className="fieldset-description">{t('form.allergies_caption')}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                    {metaOptions.allergens.map(code => (
                                        <label key={code} className="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={allergies.includes(code)}
                                                onChange={() => toggleAllergy(code)}
                                                className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {/* Traduce el código (ej: 'gluten' -> 'Sin Gluten') */}
                                                {t(`options.allergen.${code}`)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            {/* Acompañantes (Si la invitación lo permite) */}
                            {guest.max_accomp > 0 && (
                                <div className="border-t pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="fieldset-legend mb-0">{t('form.companions_title')}</h3>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {companions.length} / {guest.max_accomp}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-4 mb-4">
                                        {companions.map((comp, idx) => {
                                            const comp_allergies = comp.allergies
                                                ? comp.allergies.split(',').map(s => s.trim()).filter(Boolean)
                                                : [];

                                            return (
                                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative animate-fade-in">
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-sm font-bold text-gray-500">#{idx + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCompanion(idx)}
                                                            className="text-red-400 hover:text-red-600 text-sm"
                                                        >
                                                            ✕ {t('form.cancel')}
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <FormField
                                                            id={`comp-name-${idx}`}
                                                            label={t('form.field_name')}
                                                            value={comp.name}
                                                            onChange={e => updateCompanion(idx, 'name', e.target.value)}
                                                            placeholder={t('form.placeholder_fullname')}
                                                        />
                                                        <div className="form-field">
                                                            <label className="form-field__label">{t('form.child_or_adult')}</label>
                                                            <select
                                                                className="input w-full"
                                                                value={comp.is_child ? 'child' : 'adult'}
                                                                onChange={e => updateCompanion(idx, 'is_child', e.target.value === 'child')}
                                                            >
                                                                <option value="adult">{t('form.adult')}</option>
                                                                <option value="child">{t('form.child')}</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Alergias del acompañante */}
                                                    {metaOptions.allergens.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-xs font-semibold text-gray-600 mb-2">
                                                                {t('form.companion_allergies_label')}
                                                            </p>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                {metaOptions.allergens.map(code => (
                                                                    <label key={code} className="flex items-center space-x-2 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={comp_allergies.includes(code)}
                                                                            onChange={() => toggle_companion_allergy(idx, code)}
                                                                            className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                                        />
                                                                        <span className="text-xs text-gray-700">
                                                                            {t(`options.allergen.${code}`)}
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {companions.length < guest.max_accomp && (
                                        <Button type="button" variant="secondary" onClick={handleAddCompanion} className="w-full border-dashed">
                                            + {t('form.companion_label')}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Notas / Mensaje */}
                            <div className="mt-6">
                                <FormField 
                                    as="textarea" 
                                    id="notes" 
                                    label={t('form.notes.expander_label')} 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    placeholder={t('form.notes.placeholder')} 
                                />
                            </div>
                        </>
                    )}
                    
                    <div className="pt-6 border-t">
                        <Button type="submit" loading={submitting} disabled={submitting || attending === null} className="w-full text-lg h-12">
                            {t('form.submit')}
                        </Button>
                    </div>
                </form>
            </Card>
        </PageLayout>
    );
};

export default RsvpFormPage;