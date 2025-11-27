
import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert } from '@/components/common';
import PageLayout from '@/components/PageLayout';

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

    if (!email && !phone) {
      setErrors({ form: t('form.contact_required_one') });
      return;
    }
    
    setLoading(true);
    try {
      await guestService.recoverCode({ email: email || undefined, phone: phone || undefined });
      setMessage(t('recover.success'));
    } catch (err: any) {
      setErrors({ form: t('recover.generic') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Card className="form-card">
        <div className="text-center">
          <h1 className="form-title h1-small">{t('recover.title')}</h1>
          <p className="form-subtitle">{t('recover.subtitle')}</p>
        </div>

        {message ? (
          <div className="form-body text-center">
            <Alert message={message} variant="success" />
            <a href="/app/login.html" className="form-footer__link inline-block mt-4">{t('recover.back')}</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-body space-y-4" noValidate>
            {errors.form && <Alert message={errors.form} />}
            <FormField id="email" label={t('recover.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.form ? ' ' : undefined} />
            <FormField id="phone" label={t('recover.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.form ? ' ' : undefined} />
            <Button type="submit" loading={loading} disabled={loading}>
              {t('recover.submit')}
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

export default RecoverCodePage;
