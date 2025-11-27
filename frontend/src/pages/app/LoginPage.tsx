// frontend/src/pages/app/LoginPage.tsx
// =================================================================================
// 🔐 PÁGINA DE INICIO DE SESIÓN
// ---------------------------------------------------------------------------------
// - Gestiona la autenticación del invitado mediante Código + (Email o Teléfono).
// - Implementa lógica de "Sanitización" (limpieza de datos) idéntica al Backend.
// - Maneja errores específicos (401 vs 429) para dar feedback útil al usuario.
// - Usa Textos Dinámicos (i18n) cargados del backend.
// =================================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { guestService } from '@/services/guestService';
import { Card, Button, FormField, Alert} from '@/components/common';
import PageLayout from '@/components/PageLayout';


// --- LÓGICA DE NEGOCIO (Sanitización) ---
// Esta función replica lo que hace Python para asegurar que los datos
// lleguen limpios al servidor (ej: email en minúsculas, teléfono sin espacios).
const sanitizeContact = (value: string): { email?: string; phone?: string } => {
  const v = (value || "").trim();
  if (v.includes("@")) {
    return { email: v.toLowerCase() }; // Es un email -> minúsculas
  }
  // Es un teléfono -> quitar todo lo que no sea número o +
  const phone = v.replace(/[^\d+]/g, "");
  return { phone: phone || undefined };
};

const LoginPage: React.FC = () => {
  // --- ESTADO DEL COMPONENTE ---
  const [guestCode, setGuestCode] = useState('');
  const [contactInput, setContactInput] = useState(''); // Lo que escribe el usuario
  const [error, setError] = useState<string | null>(null); // Mensaje de error para la UI
  const [loading, setLoading] = useState(false); // Spinner de carga
  
  const auth = useAuth(); // Contexto de autenticación global
  const { t } = useI18n(); // Contexto de traducciones

  // Limpiar errores visuales cuando el usuario empieza a corregir
  useEffect(() => { setError(null); }, [guestCode, contactInput]);

  // --- MANEJO DEL ENVÍO (Submit) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validación local simple (campos vacíos)
    if (!guestCode.trim() || !contactInput.trim()) {
      setError(t('login.errors_empty')); 
      return;
    }

    setLoading(true);
    try {
      // 2. Sanitización de datos antes de enviar
      const { email, phone } = sanitizeContact(contactInput);
      
      const payload = { 
        guest_code: guestCode.trim().toUpperCase(), // Código siempre en mayúsculas
        email, 
        phone 
      };

      // 3. Llamada a la API (guestService usa apiClient por debajo)
      const response = await guestService.login(payload);
      
      // 4. Éxito: Guardar token en sesión global
      auth.login(response.access_token);
      
      // 5. Redirección al formulario principal
      window.location.href = '/app/rsvp-form.html';
      
    } catch (err: any) {
      // 6. Manejo de Errores Inteligente (Gracias a apiClient.ts)
      const status = err.status || 500; 
      
      if (status === 401) {
        // Credenciales incorrectas
        setError(t('login.errors_auth')); 
      } else if (status === 429) {
        // Rate Limit (demasiados intentos)
        setError(t('login.errors_rate_limit')); 
      } else {
        // Error de servidor o red
        setError(t('login.server_err')); 
      }
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO (Vista) ---
  return (
    <PageLayout>
      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Card className="form-card w-full max-w-md mx-auto">
          
          {/* Encabezado de la tarjeta */}
          <div className="text-center mb-8">
            <h1 className="form-title font-serif text-3xl mb-3 text-[var(--color-heading)]">
              {t('login.title')} 
            </h1>
            <p className="form-subtitle text-[var(--color-text)] opacity-80">
              {t('login.intro')}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="form-body space-y-6" noValidate>
            {error && <Alert message={error} variant="danger" />}
            
            <FormField
              id="guest_code"
              label={t('login.code')}
              value={guestCode}
              onChange={(e) => setGuestCode(e.target.value)}
              required
              placeholder="EJ: ALEX-1234"
              autoCapitalize="characters"
            />
            
            <FormField
              id="contact"
              label={t('login.contact')}
              type="text"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              required
              placeholder="+34... / nombre@mail.com"
            />

            <Button type="submit" loading={loading} disabled={loading} className="w-full mt-4 btn-primary">
              {t('login.submit')}
            </Button>
          </form>
          
          {/* Enlaces de ayuda */}
          <div className="form-footer mt-8 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <a href="/app/recover-code.html" className="hover:text-[var(--color-primary)] hover:underline transition-colors">
                  {t('login.forgot')}
              </a>
               <span className="text-gray-300">|</span>
               <a href="/app/request-access.html" className="hover:text-[var(--color-primary)] hover:underline transition-colors">
                  {t('nav.request')}
              </a>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default LoginPage;