// File: frontend/src/pages/app/RequestAccessPage.tsx
// ──────────────────────────────────────────────────────────────────────
// Descripción: Página de solicitud de acceso (Diseño final con ActionRow).
// ──────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { validateFullName, validatePhoneLast4, validateEmail } from '@/utils/validators';
import { Card, Button, FormField, Alert, ActionRow } from '@/components/common';
import PageLayout from '@/components/PageLayout';

const BG_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop';


const RequestAccessPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneLast4?: string;
    email?: string;
    consent?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const { t, lang } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);

    const nameError = validateFullName(fullName);
    const last4Error = validatePhoneLast4(phoneLast4);
    const emailError = validateEmail(email);
    const consentError = !consent ? t('request.consent_required') : null;

    if (nameError || last4Error || emailError || consentError) {
      setErrors({
        fullName: nameError ? t(nameError) : undefined,
        phoneLast4: last4Error ? t(last4Error) : undefined,
        email: emailError ? t(emailError) : undefined,
        consent: consentError || undefined,
      });
      return;
    }

    setLoading(true);
    try {
      const result = await guestService.requestAccess({
        full_name: fullName,
        phone_last4: phoneLast4,
        email,
        lang,
        consent,
      });

      if (result && result.email_conflict) {
        setErrors({ form: t('request.email_or_phone_conflict') });
        return;
      }

      const messageKey = result?.message_key;
      setMessage(messageKey ? t(messageKey) : t('request.success_message_ok'));

    } catch (error: any) {
      const status = (error as any)?.status;
      if (status === 404) {
        setErrors({ form: t('request.not_found_message') });
      } else if (status === 429) {
        const retryAfter = (error as any)?.retryAfter as number | undefined;
        setErrors({
          form: retryAfter && Number.isFinite(retryAfter)
            ? t('form.error_rate_limited_with_retry', { seconds: retryAfter })
            : t('form.error_rate_limited'),
        });
      } else {
        setErrors({ form: t('request.error') });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout backgroundImage={BG_IMAGE}>
      <Card className="form-card relative">
        
        <div className="text-center pt-6 mb-8">
          <h1 className="form-title font-serif text-3xl mb-3 text-[var(--color-gold-primary)]">
            {t('request.title')}
          </h1>
          <p className="form-subtitle text-[var(--color-text-muted)]">
            {t('request.intro')}
          </p>
        </div>

        {message ? (
          <div className="form-body text-center animate-fade-in">
            <Alert message={message} variant="success" />
            
            {/* Footer con ActionRow en estado de éxito */}
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-body space-y-6" noValidate>
            
            {/* Nombre Completo */}
            <div>
              <FormField
                id="full_name"
                label={t('request.full_name')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {errors.fullName && (
                <span className="form-error-text">
                  {errors.fullName}
                </span>
              )}
            </div>
            
            {/* Últimos 4 dígitos */}
            <div>
              <FormField
                id="phone_last4"
                label={t('request.phone_last4')}
                placeholder={t('request.phone_last4_placeholder')}
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value)}
                maxLength={4}
                required
              />
              {errors.phoneLast4 && (
                <span className="form-error-text">
                  {errors.phoneLast4}
                </span>
              )}
            </div>
            
            {/* Email */}
            <div>
              <FormField
                id="email"
                label={t('request.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && (
                <span className="form-error-text">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-100 mt-2">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded text-[var(--color-gold-primary)] focus:ring-[var(--color-gold-primary)] border-gray-300"
              />
              <label htmlFor="consent" className="text-sm text-gray-600 cursor-pointer select-none">
                {t('request.consent')}
              </label>
            </div>
            
            {/* Error Consentimiento */}
            {errors.consent && (
                <div className="form-error-text">
                    <Alert message={errors.consent} variant="danger" />
                </div>
            )}

            {/* Botón */}
            <Button 
                type="submit" 
                loading={loading} 
                disabled={loading} 
                className="w-full mt-6 btn-primary"
            >
              {t('request.submit')}
            </Button>

            {/* Error Global */}
            {errors.form && (
                <div className="form-error-container--large">
                    <Alert message={errors.form} variant="danger" />
                </div>
            )}

          </form>
        )}

        {/* Footer con ActionRow (si no hay éxito aún) */}
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

export default RequestAccessPage;