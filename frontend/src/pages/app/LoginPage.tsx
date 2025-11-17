
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert, PageLayout } from '@/components/common';

const LoginPage: React.FC = () => {
  const [guestCode, setGuestCode] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [errors, setErrors] = useState<{ guestCode?: string; emailOrPhone?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!guestCode || !emailOrPhone) {
      setErrors({ form: t('login.errors_empty') });
      return;
    }

    setLoading(true);
    try {
      const isEmail = emailOrPhone.includes('@');
      const payload: { guest_code: string; email?: string; phone?: string; } = { guest_code: guestCode.toUpperCase() };
      if (isEmail) {
        payload.email = emailOrPhone;
      } else {
        payload.phone = emailOrPhone;
      }

      const response = await guestService.login(payload);
      auth.login(response.access_token);
      window.location.href = '/app/rsvp-form.html';
    } catch (err: any) {
      setErrors({ form: t('login.errors_auth') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <Card className="form-card">
        <div className="text-center">
          <h1 className="form-title">{t('login.title')}</h1>
          <p className="form-subtitle">{t('login.intro')}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-body space-y-6" noValidate>
          {errors.form && <Alert message={errors.form} />}
          <FormField
            id="guest_code"
            label={t('login.code')}
            value={guestCode}
            onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
            required
            autoCapitalize="characters"
          />
          <FormField
            id="email_or_phone"
            label={t('login.contact')}
            type="text"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} disabled={loading}>
            {t('login.submit')}
          </Button>
        </form>
        
        <div className="form-footer">
            <a href="/app/recover-code.html" className="form-footer__link">
                {t('login.forgot')}
            </a>
             <span className="form-footer__separator">|</span>
             <a href="/app/request-access.html" className="form-footer__link">
                {t('nav.request')}
            </a>
        </div>
      </Card>
    </PageLayout>
  );
};

export default LoginPage;
