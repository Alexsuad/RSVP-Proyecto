// File: frontend/src/pages/app/RecoverCodePage.tsx 
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Página de recuperación de código (Diseño final con ActionRow).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert, ActionRow } from '@/components/common';
import PageLayout from '@/components/PageLayout';

const BG_IMAGE = 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop';


const RecoverCodePage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ form?: string }>({});
    const [loading, setLoading] = useState(false);
    
    const { t } = useI18n();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setMessage(null);

        const emailClean = email.trim().toLowerCase();
        const phoneClean = phone.trim();

        if (!emailClean && !phoneClean) {
            setErrors({ form: t('recover.invalid') });
            return;
        }
        
        setLoading(true);

        try {
            await guestService.recoverCode({ 
                email: emailClean || undefined, 
                phone: phoneClean || undefined 
            });
            setMessage(t('recover.success'));

        } catch (err: any) {
            console.error('Recover error:', err);
            const status = err?.response?.status ?? err?.status;
            let errorKey = 'recover.generic';

            if (status === 429) {
                errorKey = 'recover.rate_limited'; 
            } else if (status === 400) {
                errorKey = 'recover.invalid';
            }
            setErrors({ form: t(errorKey) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageLayout backgroundImage={BG_IMAGE}>
            <Card className="form-card">
                
                <div className="text-center pt-6 mb-6">
                    <h1 className="form-title font-serif text-3xl mb-3 text-[var(--color-gold-primary)]">
                        {t('recover.title')}
                    </h1>
                    <p className="form-subtitle text-[var(--color-text-muted)]">
                        {t('recover.subtitle')}
                    </p>
                </div>

                {message ? (
                    <div className="form-body text-center animate-fade-in">
                        <Alert message={message} variant="success" />
                        
                        <div className="auth-card__footer mt-6">
                            <ActionRow 
                                href="/app/login.html"
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5m7 7l-7-7 7-7"/>
                                    </svg>
                                }
                                text={t('recover.back')} 
                            />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="form-body space-y-5" noValidate>
                        
                        <FormField 
                            id="email" 
                            label={t('recover.email')} 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                        <FormField 
                            id="phone" 
                            label={t('recover.phone')} 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                        />
                        
                        <Button 
                            type="submit" 
                            loading={loading} 
                            disabled={loading} 
                            className="w-full mt-4 btn-primary"
                        >
                            {t('recover.submit')}
                        </Button>

                        {/* Error Global */}
                        {errors.form && (
                            <div style={{ marginTop: '1.5rem', color: '#dc3545', textAlign: 'center' }}>
                                <Alert message={errors.form} variant="danger" />
                            </div>
                        )}
                    </form>
                )}

                {!message && (
                    <div className="auth-card__footer mt-8">
                        <ActionRow 
                            href="/app/login.html"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5m7 7l-7-7 7-7"/>
                                </svg>
                            }
                            text={t('recover.back')} 
                        />
                    </div>
                )}
            </Card>
        </PageLayout>
    );
};

export default RecoverCodePage;