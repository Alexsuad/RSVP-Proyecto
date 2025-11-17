
import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { validateFullName, validatePhoneLast4, validateEmail } from '@/utils/validators';
import { Card, Button, FormField, Alert, PageLayout } from '@/components/common';

const RequestAccessPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phoneLast4?: string; email?: string; consent?: string; form?: string }>({});
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
        consent: consentError || undefined
      });
      return;
    }
    
    setLoading(true);
    try {
      await guestService.requestAccess({ full_name: fullName, phone_last4: phoneLast4, email, lang });
      setMessage(t('request.success_message_neutral'));
    } catch (err: any) {
      setErrors({ form: t('request.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Card className="form-card">
        <div className="text-center">
          <h1 className="form-title h1-small">{t('request.title')}</h1>
          <p className="form-subtitle">{t('request.intro')}</p>
        </div>

        {message ? (
          <div className="form-body text-center">
            <Alert message={message} variant="success" />
            <a href="/app/login.html" className="form-footer__link inline-block mt-4">{t('recover.back')}</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-body space-y-4" noValidate>
            {errors.form && <Alert message={errors.form} />}
            <FormField id="full_name" label={t('request.full_name')} value={fullName} onChange={(e) => setFullName(e.target.value)} required error={errors.fullName} />
            <FormField id="phone_last4" label={t('request.phone_last4')} placeholder={t('request.phone_last4_placeholder')} value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value)} maxLength={4} required error={errors.phoneLast4} />
            <FormField id="email" label={t('request.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={errors.email} />
            <div className="checkbox-group">
                <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="checkbox" />
                <label htmlFor="consent" className="checkbox-group__label">{t('request.consent')}</label>
            </div>
             {errors.consent && <Alert message={errors.consent} />}
            <Button type="submit" loading={loading} disabled={loading || !consent}>
              {t('request.submit')}
            </Button>
          </form>
        )}
         <div className="form-footer">
            <a href="/app/login.html" className="form-footer__link">
                {t('recover.back')}
            </a>
        </div>
      </Card>
    </PageLayout>
  );
};

export default RequestAccessPage;
