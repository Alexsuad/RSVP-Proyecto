// frontend/src/pages/app/LoginPage.tsx
// =================================================================================
// PÁGINA DE INICIO DE SESIÓN DE INVITADOS
// ---------------------------------------------------------------------------------
// Esta pantalla permite autenticar a los invitados mediante:
//   - Código de invitación (guest_code).
//   - Un dato de contacto: correo electrónico o teléfono.
// Aplica la misma lógica de sanitización que el backend, maneja errores HTTP
// específicos (401, 429) y utiliza textos dinámicos (i18n) proporcionados por la API.
// =================================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert } from '@/components/common';
import PageLayout from '@/components/PageLayout';

// ----------------------------------------------------------------------------------
// Función de sanitización del dato de contacto
// ----------------------------------------------------------------------------------
// Normaliza el valor introducido por el usuario para que el backend reciba:
//   - email en minúsculas si la cadena contiene "@", o
//   - phone solo con dígitos y el signo "+" en el resto de casos.
// ----------------------------------------------------------------------------------
const sanitizeContact = (
  value: string
): { email?: string; phone?: string } => {
  const v = (value || '').trim();

  if (v.includes('@')) {
    // Caso email: se envía siempre en minúsculas
    return { email: v.toLowerCase() };
  }

  // Caso teléfono: se eliminan todos los caracteres que no sean dígitos o '+'
  const phone = v.replace(/[^\d+]/g, '');
  return { phone: phone || undefined };
};

const LoginPage: React.FC = () => {
  // -------------------------------------------------------------------------------
  // Estado local del formulario
  // -------------------------------------------------------------------------------
  const [guestCode, setGuestCode] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const { t } = useI18n();

  // Limpiar el mensaje de error cuando el usuario modifica los campos
  useEffect(() => {
    setError(null);
  }, [guestCode, contactInput]);

  // -------------------------------------------------------------------------------
  // Manejo del envío del formulario
  // -------------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validación mínima: ambos campos deben tener contenido
    if (!guestCode.trim() || !contactInput.trim()) {
      setError(t('login.errors_empty'));
      return;
    }

    setLoading(true);

    try {
      // 2. Sanitización de los datos de contacto
      const { email, phone } = sanitizeContact(contactInput);

      // 3. Construcción del payload alineado con el backend
      const payload = {
        guest_code: guestCode.trim().toUpperCase(),
        email,
        phone,
      };

      // 4. Llamada a la API (guestService encapsula apiClient)
      const response = await guestService.login(payload);

      // 5. Éxito: guardar el token y redirigir al formulario principal
      auth.login(response.access_token);
      window.location.href = '/app/rsvp-form.html';
    } catch (err: any) {
      // 6. Manejo de errores HTTP más frecuentes (401, 429)
      const status = err?.status || err?.response?.status || 500;

      if (status === 401) {
        // Credenciales incorrectas
        setError(t('login.errors_auth'));
      } else if (status === 429) {
        // Demasiados intentos en poco tiempo
        setError(t('login.errors_rate_limit'));
      } else {
        // Errores de red o servidor no previstos
        setError(t('login.server_err'));
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------------
  // Renderizado de la vista
  // -------------------------------------------------------------------------------
  return (
    <PageLayout>
      <div
        className="flex items-center justify-center p-4"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <Card className="form-card w-full max-w-md mx-auto">
          {/* Cabecera de la tarjeta de login */}
          <div className="text-center mb-8">
            <h1 className="form-title font-serif text-3xl mb-3 text-[var(--color-heading)]">
              {t('login.title')}
            </h1>
            <p className="form-subtitle text-[var(--color-text)] opacity-80">
              {t('login.intro')}
            </p>
          </div>

          {/* Cuerpo del formulario de login */}
          <form
            onSubmit={handleSubmit}
            className="form-body space-y-6"
            noValidate
          >
            {error && <Alert message={error} variant="danger" />}

            <FormField
              id="guest_code"
              label={t('login.code')}
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value)}
              required
              placeholder={t('login.code_placeholder')}
              autoCapitalize="characters"
            />

            <FormField
              id="contact"
              label={t('login.contact')}
              type="text"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              required
              placeholder={t('login.contact_placeholder')}
            />

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full mt-4 btn-primary"
            >
              {loading ? t('login.validating') : t('login.submit')}
            </Button>
          </form>

          {/* Enlaces de ayuda relacionados con el login */}
          <div className="form-footer mt-8 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <a
              href="/app/recover-code.html"
              className="hover:text-[var(--color-primary)] hover:underline transition-colors"
            >
              {t('login.forgot')}
            </a>
            <span className="text-gray-300">|</span>
            <a
              href="/app/request-access.html"
              className="hover:text-[var(--color-primary)] hover:underline transition-colors"
            >
              {t('nav.request')}
            </a>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default LoginPage;
