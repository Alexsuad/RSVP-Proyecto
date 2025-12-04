// File: frontend/src/pages/app/RequestAccessPage.tsx
// ──────────────────────────────────────────────────────────────────────
// Descripción: Página de solicitud de acceso (request access) donde el
// invitado envía sus datos para recibir enlace o código de acceso.
// ──────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';                    // Importa React y el hook de estado local para controlar el formulario.
import { useI18n } from '@/contexts/I18nContext';           // Hook de contexto para obtener textos traducidos y el idioma actual.
import { guestService } from '@/services/guestService';     // Servicio centralizado para las llamadas HTTP del flujo de invitados.
import { validateFullName, validatePhoneLast4, validateEmail } from '@/utils/validators'; // Validadores reutilizables para nombre, teléfono y email.
import { Card, Button, FormField, Alert } from '@/components/common'; // Componentes comunes de interfaz (tarjeta, botón, campos y alertas).
import PageLayout from '@/components/PageLayout';           // Layout general de página que aplica estructura y estilos globales.

// --- Componente principal: RequestAccessPage ---
// Gestiona el formulario de solicitud de acceso, valida los datos en el frontend
// y coordina la llamada a guestService.requestAccess con manejo de errores.
const RequestAccessPage: React.FC = () => {
  // --- Estado del formulario ---
  // fullName, phoneLast4 y email almacenan los datos introducidos por el invitado.
  // consent indica si el invitado acepta las condiciones de uso y privacidad.
  const [fullName, setFullName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);

  // message muestra el mensaje de éxito cuando la operación termina correctamente.
  const [message, setMessage] = useState<string | null>(null);

  // errors almacena los mensajes de error por campo y un posible error general de formulario.
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneLast4?: string;
    email?: string;
    consent?: string;
    form?: string;
  }>({});

  // loading controla el estado de envío para deshabilitar el botón y evitar envíos duplicados.
  const [loading, setLoading] = useState(false);

  // t permite obtener textos traducidos y lang expone el idioma actual seleccionado.
  const { t, lang } = useI18n();

  // --- Manejo de envío del formulario ---
  // Valida los campos en el frontend y, si todo es correcto, llama al backend
  // para registrar la solicitud de acceso. Gestiona casos de conflicto, no
  // encontrado, rate limit y otros errores.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);

    // Validación de campos usando validadores comunes.
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
      // Enviamos también el consentimiento para que el backend pueda registrarlo.
      const result = await guestService.requestAccess({
        full_name: fullName,
        phone_last4: phoneLast4,
        email,
        lang,
        consent,
      });

      // Si el backend indica conflicto de email/teléfono, mostramos un aviso
      // específico y no marcamos la operación como exitosa.
      if (result && result.email_conflict) {
        setErrors({
          form: t('request.email_or_phone_conflict'),
        });
        return;
      }

      // Si el backend devuelve una clave de mensaje específica, la usamos.
      const messageKey = result?.message_key;
      if (messageKey) {
        setMessage(t(messageKey));
      } else {
        // Si no hay clave específica, usamos un mensaje estándar de éxito.
        setMessage(t('request.success_message_ok'));
      }
    } catch (error: any) {
      const status = (error as any)?.status;

      if (status === 404) {
        // Caso: los datos no coinciden con ninguna invitación registrada.
        setErrors({
          form: t('request.not_found_message'),
        });
      } else if (status === 429) {
        // Caso: demasiados intentos (rate limit). Si el cliente HTTP expone
        // retryAfter, mostramos el tiempo recomendado de espera.
        const retryAfter = (error as any)?.retryAfter as number | undefined;

        if (retryAfter && Number.isFinite(retryAfter)) {
          setErrors({
            form: t('form.error_rate_limited_with_retry', { seconds: retryAfter }),
          });
        } else {
          setErrors({
            form: t('form.error_rate_limited'),
          });
        }
      } else {
        // Cualquier otro error (400, 500, red, etc.) se muestra con un mensaje genérico.
        setErrors({
          form: t('request.error'),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Render de la página ---
  // Muestra un mensaje de éxito cuando message está definido; en caso contrario,
  // pinta el formulario con sus campos, errores y enlaces de navegación.
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
            <a href="/app/login.html" className="form-footer__link inline-block mt-4">
              {t('recover.back')}
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-body space-y-4" noValidate>
            {errors.form && <Alert message={errors.form} />}
            <FormField
              id="full_name"
              label={t('request.full_name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              error={errors.fullName}
            />
            <FormField
              id="phone_last4"
              label={t('request.phone_last4')}  
              placeholder={t('request.phone_last4_placeholder')} // Usamos el mismo placeholder que en la página de recuperación.
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value)}
              maxLength={4}
              required
              error={errors.phoneLast4}
            />
            <FormField
              id="email"
              label={t('request.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={errors.email}
            />
            <div className="checkbox-group">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="consent" className="checkbox-group__label">
                {t('request.consent')}
              </label>
            </div>
            {errors.consent && <Alert message={errors.consent} />}
            <Button type="submit" loading={loading} disabled={loading}>
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
