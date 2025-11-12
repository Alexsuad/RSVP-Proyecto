import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Card, Button, PageLayout, Loader } from '../../components/common';
import { guestService } from '../../services/guestService';
import { GuestData } from '../../types';

const ConfirmedPage: React.FC = () => {
    const token = sessionStorage.getItem('rsvp_token');
    if (!token) {
        window.location.href = '/app/login.html';
        return null;
    }

    const { t } = useI18n();
    const [guest, setGuest] = useState<GuestData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchGuestData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await guestService.getMe();
            setGuest(data);
        } catch (err) {
           window.location.href = '/app/login.html';
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGuestData();
    }, [fetchGuestData]);

    if (loading || !guest) {
        return <PageLayout><Loader /></PageLayout>;
    }

    const totalAttendees = (guest.companions?.adults || 0) + (guest.companions?.kids || 0);
    const isAttending = guest.confirmed && totalAttendees > 0;

    return (
        <PageLayout>
            <Card className="form-card text-center">
                <svg className="confirmed-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="mt-4 form-title h1-small">{t('conf_title')}</h1>
                <p className="mt-2 form-subtitle">{t('conf_thanks')}</p>

                <div className="confirmed-summary">
                    <h2 className="fieldset-legend text-left">{t('conf_summary_title')}</h2>
                    <div className="space-y-2 mt-4">
                        <SummaryItem label={t('conf_guest')} value={guest.full_name} />
                        {isAttending ? (
                            <>
                                <SummaryItem label={t('conf_companions')} value={`${totalAttendees}`} />
                                <SummaryItem label={t('rsvp_allergies')} value={guest.allergies.length > 0 ? guest.allergies.map(a => t(`allergies_${a}`)).join(', ') : t('rsvp_allergies_none')} />
                            </>
                        ) : (
                            <p className="no-attendance-msg">{t('rsvp_no')}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 responsive-grid mt-8">
                    <Button variant="secondary" onClick={() => window.location.href = '/app/rsvp-form.html'}>{t('conf_edit')}</Button>
                    <Button onClick={() => window.location.href = '/app/login.html'}>{t('conf_go_home')}</Button>
                </div>
            </Card>
        </PageLayout>
    );
};

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="summary-item">
        <span className="summary-item__label">{label}:</span>
        <span className="summary-item__value">{value}</span>
    </div>
);

export default ConfirmedPage;