
import React, { useState, useEffect, useCallback } from 'react';
import { guestService } from '@/services/guestService';
import { useI18n } from '@/contexts/I18nContext';
import { GuestData, RsvpPayload } from '@/types';
import { Card, Button, FormField, Alert, PageLayout, Loader } from '@/components/common';

const ALLERGY_OPTIONS = ['gluten', 'dairy', 'nuts', 'seafood', 'eggs', 'soy'];

const RsvpFormPage: React.FC = () => {
    const token = sessionStorage.getItem('rsvp_token');
    if (!token) {
        window.location.href = '/app/login.html';
        return null;
    }

    const [guest, setGuest] = useState<GuestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<{ form?: string, companions?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    const [attending, setAttending] = useState<boolean | null>(null);
    const [companionsCount, setCompanionsCount] = useState(0);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    
    const { t } = useI18n();

    const fetchGuestData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await guestService.getMe();
            setGuest(data);
            if (data.confirmed) {
                const totalAttendees = (data.companions.adults || 0) + (data.companions.kids || 0);
                setAttending(totalAttendees > 0);
                setCompanionsCount(totalAttendees > 0 ? totalAttendees -1 : 0);
                setAllergies(data.allergies || []);
            }
        } catch (err) {
            setErrors({ form: t('form.load_error') });
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

        if (attending === null) {
            setErrors({ form: t('form.select_option')});
            return;
        }

        if (guest && attending && companionsCount > guest.max_accomp) {
            setErrors({ companions: t('form.companion_name_required')}); // Re-using a somewhat relevant key
            return;
        }

        setSubmitting(true);
        try {
            const payload: RsvpPayload = {
                attending: !!attending,
                // Assuming companions are adults for this simplified form.
                companions: attending ? { adults: companionsCount + 1, kids: 0 } : { adults: 0, kids: 0 },
                allergies: attending ? allergies : [],
                notes: attending ? notes : ''
            };
            await guestService.submitRsvp(payload);
            window.location.href = '/app/confirmed.html';
        } catch (err: any) {
            setErrors({ form: err.message || t('form.generic_error') });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <PageLayout><Loader /></PageLayout>;
    if (errors.form && !guest) return <PageLayout><Alert message={errors.form} /></PageLayout>;
    if (!guest) return null;

    const pluralSuffix = (lang: string, count: number) => {
        if (lang === 'ro') return '(i)';
        return count !== 1 ? 's' : '';
    }

    return (
        <PageLayout>
            <Card className="rsvp-card">
                <div className="text-center">
                    <h1 className="form-title h1-small">{t('form.hi')}, {guest.full_name}!</h1>
                    <p className="form-subtitle">{t('form.subtitle')}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="form-body space-y-8" noValidate>
                    {errors.form && <Alert message={errors.form} />}

                    <fieldset>
                        <legend className="fieldset-legend">{t('form.attending')}</legend>
                        <div className="grid grid-cols-2 gap-4 responsive-grid">
                            <RadioCard id="attending-yes" label={t('form.yes')} checked={attending === true} onChange={() => setAttending(true)} />
                            <RadioCard id="attending-no" label={t('form.no')} checked={attending === false} onChange={() => setAttending(false)} />
                        </div>
                    </fieldset>
                    
                    {attending === false && (
                        <Alert variant="success" message={t('form.no_attend_short')} />
                    )}

                    {attending && (
                        <>
                            {guest.max_accomp > 0 && (
                            <fieldset>
                                <legend className="fieldset-legend">{t('form.companions_title')}</legend>
                                <p className="fieldset-description">{t('form.accomp_note', { max_accomp: guest.max_accomp, plural: pluralSuffix('es', guest.max_accomp)})}</p>
                                {errors.companions && <Alert message={errors.companions}/>}
                                
                                <FormField 
                                    type="number" 
                                    id="companions" 
                                    label={t('form.companions_count')} 
                                    min="0" 
                                    max={guest.max_accomp} 
                                    value={companionsCount} 
                                    onChange={e => setCompanionsCount(parseInt(e.target.value) || 0)} 
                                    />
                            </fieldset>
                            )}
                            
                            <fieldset>
                                <legend className="fieldset-legend">{t('form.titular_allergies')}</legend>
                                 <p className="fieldset-description">{t('form.allergies_caption')}</p>
                                <div className="grid grid-cols-3 gap-4 responsive-grid-allergies">
                                    {ALLERGY_OPTIONS.map(allergy => (
                                        <div key={allergy} className="checkbox-group">
                                            <input id={`allergy-${allergy}`} type="checkbox" checked={allergies.includes(allergy)} onChange={() => handleAllergyChange(allergy)} className="checkbox" />
                                            <label htmlFor={`allergy-${allergy}`} className="checkbox-group__label">{t(`options.allergen.${allergy}`)}</label>
                                        </div>
                                    ))}
                                </div>
                            </fieldset>

                            <div>
                                <label className="fieldset-legend" htmlFor="notes">{t('form.notes.expander_label')}</label>
                                <FormField as="textarea" id="notes" label="" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('form.notes.placeholder')} />
                            </div>
                        </>
                    )}
                    
                    <Button type="submit" loading={submitting} disabled={submitting || attending === null}>{t('form.submit')}</Button>
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
