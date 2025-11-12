import React, { useState, useEffect, useCallback } from 'react';
import { guestService } from '../../services/guestService';
import { useI18n } from '../../contexts/I18nContext';
import { GuestData, RsvpPayload } from '../../types';
import { Card, Button, FormField, Alert, PageLayout, Loader } from '../../components/common';

const ALLERGY_OPTIONS = ['gluten', 'dairy', 'nuts', 'seafood', 'eggs', 'soy'];

const RsvpFormPage: React.FC = () => {
    const token = sessionStorage.getItem('rsvp_token');
    if (!token) {
        window.location.href = '/app/login.html';
        return null;
    }

    const [guest, setGuest] = useState<GuestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<{ companions?: string; form?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    const [attending, setAttending] = useState(true);
    const [companions, setCompanions] = useState({ adults: 0, kids: 0 });
    const [allergies, setAllergies] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    
    const { t } = useI18n();

    const fetchGuestData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await guestService.getMe();
            setGuest(data);
            const isConfirmedAndAttending = data.confirmed && (data.companions.adults || 0) > 0;
            setAttending(!data.confirmed ? true : isConfirmedAndAttending);
            const accompanyingAdults = isConfirmedAndAttending ? (data.companions.adults || 1) - 1 : 0;
            setCompanions({ adults: accompanyingAdults, kids: data.companions.kids || 0 });
            setAllergies(data.allergies || []);
        } catch (err) {
            setErrors({ form: t('msg_error_generic') });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchGuestData();
    }, [fetchGuestData]);

    const handleAllergyChange = (allergy: string) => {
        setAllergies(prev => 
            prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (guest && (companions.adults + companions.kids > guest.max_accomp)) {
            setErrors({ companions: t('val_companions') });
            return;
        }

        setSubmitting(true);
        try {
            const payload: RsvpPayload = {
                attending,
                companions: attending ? { adults: companions.adults + 1, kids: companions.kids } : { adults: 0, kids: 0 },
                allergies,
                notes
            };
            await guestService.submitRsvp(payload);
            window.location.href = '/app/confirmed.html';
        } catch (err: any) {
            setErrors({ form: err.message || t('msg_error_generic') });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <PageLayout><Loader /></PageLayout>;
    if (errors.form && !guest) return <PageLayout><Alert message={errors.form} /></PageLayout>;
    if (!guest) return null;

    return (
        <PageLayout>
            <Card className="rsvp-card">
                <div className="text-center">
                    <h1 className="form-title h1-small">{t('rsvp_title')}</h1>
                    <p className="form-subtitle">
                        {t('hello', guest.full_name)} {guest.invited_to_ceremony && t('rsvp_invited_to')}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="form-body space-y-8" noValidate>
                    {errors.form && <Alert message={errors.form} />}

                    {/* Attending Status */}
                    <fieldset>
                        <legend className="fieldset-legend">{t('rsvp_attending')}</legend>
                        <div className="grid grid-cols-2 gap-4 responsive-grid">
                            <RadioCard id="attending-yes" label={t('rsvp_yes')} checked={attending} onChange={() => setAttending(true)} />
                            <RadioCard id="attending-no" label={t('rsvp_no')} checked={!attending} onChange={() => setAttending(false)} />
                        </div>
                    </fieldset>
                    
                    {attending && (
                        <>
                            {/* Companions */}
                            {guest.max_accomp > 0 && (
                            <fieldset>
                                <legend className="fieldset-legend">{t('rsvp_accomp_title')}</legend>
                                <p className="fieldset-description">{t('rsvp_how_many', guest.max_accomp)}</p>
                                {errors.companions && <p id="companions-error" className="form-error" aria-live="polite">{errors.companions}</p>}
                                <div className="grid grid-cols-2 gap-4 responsive-grid">
                                    <FormField type="number" id="adults" label={t('rsvp_adults')} min="0" max={guest.max_accomp} value={companions.adults} onChange={e => setCompanions({...companions, adults: parseInt(e.target.value) || 0})} error={errors.companions ? ' ' : undefined} aria-describedby={errors.companions ? 'companions-error' : undefined} />
                                    <FormField type="number" id="kids" label={t('rsvp_kids')} min="0" max={guest.max_accomp} value={companions.kids} onChange={e => setCompanions({...companions, kids: parseInt(e.target.value) || 0})} error={errors.companions ? ' ' : undefined} aria-describedby={errors.companions ? 'companions-error' : undefined}/>
                                </div>
                            </fieldset>
                            )}
                            
                            {/* Allergies */}
                            <fieldset>
                                <legend className="fieldset-legend">{t('rsvp_allergies')}</legend>
                                <div className="grid grid-cols-3 gap-4 responsive-grid-allergies">
                                    {ALLERGY_OPTIONS.map(allergy => (
                                        <div key={allergy} className="checkbox-group">
                                            <input id={`allergy-${allergy}`} type="checkbox" checked={allergies.includes(allergy)} onChange={() => handleAllergyChange(allergy)} className="checkbox" />
                                            <label htmlFor={`allergy-${allergy}`} className="checkbox-group__label">{t(`allergies_${allergy}`)}</label>
                                        </div>
                                    ))}
                                </div>
                            </fieldset>

                            {/* Notes */}
                            <div>
                                <FormField as="textarea" id="notes" label={t('rsvp_notes')} value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </>
                    )}
                    
                    <Button type="submit" loading={submitting} disabled={submitting}>{t('rsvp_submit')}</Button>
                </form>
            </Card>
        </PageLayout>
    );
};

const RadioCard: React.FC<{id: string, label: string, checked: boolean, onChange: () => void}> = ({id, label, checked, onChange}) => (
    <div>
        <input type="radio" id={id} name="attending" checked={checked} onChange={onChange} className="radio-card__input" />
        <label htmlFor={id} className="radio-card__label">
            {label}
        </label>
    </div>
);


export default RsvpFormPage;