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
import { Card, Button, FormField, Alert, ActionRow } from '@/components/common';

import PageLayout from '@/components/PageLayout';

// ----------------------------------------------------------------------------------
// Función de sanitización del dato de contacto
// ----------------------------------------------------------------------------------
// Normaliza el valor introducido por el usuario para que el backend reciba:
//   - email en minúsculas si la cadena contiene "@", o
//   - phone solo con dígitos y el signo "+" en el resto de casos.
// ----------------------------------------------------------------------------------
export const sanitizeContact = (
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

// Imagen de fondo: Sitio de ceremonia con arco floral
const BG_IMAGE = '/assets/images/email/imgSitio.jpg';

const LoginPage: React.FC = () => {
  // -------------------------------------------------------------------------------
  // Estado local del formulario
  // -------------------------------------------------------------------------------
  const [guestCode, setGuestCode] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [error, setError] = useState<string | null>(null); // Ahora guarda claves i18n, no textos traducidos
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
      setError('login.errors_empty'); // Guardamos la clave, no el texto traducido
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
      // 5. Éxito: guardar el token y redirigir al formulario principal
      auth.login(response.access_token);
      
      // Preservar el idioma en la redirección
      const params = new URLSearchParams(window.location.search);
      const currentLang = params.get('lang') || localStorage.getItem('rsvp_lang') || 'es';
      window.location.href = `/app/rsvp-form.html?lang=${currentLang}`;
    } catch (err: any) {
      // 6. Manejo de errores HTTP más frecuentes (401, 429)
      const status = err?.status || err?.response?.status || 500;

      if (status === 401) {
        // Credenciales incorrectas
        setError('login.errors_auth'); // Guardamos la clave
      } else if (status === 429) {
        // Demasiados intentos en poco tiempo
        setError('login.errors_rate_limit'); // Guardamos la clave
      } else {
        // Errores de red o servidor no previstos
        setError('login.server_err'); // Guardamos la clave
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------------
  // Renderizado de la vista
  // -------------------------------------------------------------------------------
  return (
    <PageLayout backgroundImage={BG_IMAGE}>
      <Card className="form-card relative w-full max-w-md mx-auto">
        {/* LanguageSwitcher eliminado (manejado por PageLayout) */}

        <div className="text-center mb-8 pt-6">
          <h1 className="form-title font-serif text-3xl mb-3 text-[var(--color-gold-primary)]">
            {t('login.title')}
          </h1>
          <p className="form-subtitle text-[var(--color-text-muted)]">
            {t('login.intro')}
          </p>
        </div>

        {/* Cuerpo del formulario de login */}
        <form
          onSubmit={handleSubmit}
          className="form-body space-y-6"
          noValidate
        >


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


          {/* Nuevo lugar para el error con margen superior */}
          {error && (
            <div className="form-error-container">
              <Alert message={t(error)} variant="danger" />
            </div>
          )}

          {/* Nota de seguridad (Micro-copy) */}
          <p className="text-xs text-center text-gray-400 mt-4 leading-snug">
            {t('login.security_note')}
          </p>
        </form>

        {/* Enlaces de ayuda relacionados con el login */}
        {/* Pie de página con enlaces de ayuda mejorados (Filas de Acción) */}
        <div className="auth-card__footer">
          
          {/* Opción 1: Recuperar código */}
          <ActionRow
            href="/app/recover-code.html"
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            }
            text={t('login.forgot')}
          />
          
          {/* Opción 2: Solicitar acceso */}
          <ActionRow
            href="/app/request-access.html"
            icon={
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
            subtext={t('login.no_code_prompt')}
            text={t('login.request_access_link')}
          />

        </div>
      </Card>
    </PageLayout>
  );
};

export default LoginPage;
