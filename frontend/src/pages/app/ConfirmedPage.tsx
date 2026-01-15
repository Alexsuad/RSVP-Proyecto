// File: frontend/src/pages/app/ConfirmedPage.tsx
// ──────────────────────────────────────────────────────────────────────
// Propósito: Página de confirmación del RSVP versión React.
// Muestra el resumen de asistencia y permite editar o cerrar sesión.
// ──────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext'; // Contexto de internacionalización
import { Card, Button, Loader, Alert } from '@/components/common'; // Componentes reutilizables de UI
import PageLayout from '@/components/PageLayout'; // Layout principal con imagen de fondo
import { guestService } from '@/services/guestService'; // Servicio para gestionar datos del invitado
import { GuestData, Companion } from '@/types'; // Definiciones de tipos TypeScript

// --- Función auxiliar: Construir texto de alergias ---
// Construye un texto legible a partir de códigos de alergias separados por comas.
const build_allergies_text = (
  raw_allergies: string | null,
  t: (key: string) => string
): string => {
  if (!raw_allergies || !raw_allergies.trim()) {
    return '';
  }

  const codes = raw_allergies
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);

  if (codes.length === 0) {
    return '';
  }

  return codes
    .map((code) => t(`options.allergen.${code}`))
    .join(', ');
};

// --- Constantes ---
const BG_IMAGE = 'https://images.unsplash.com/photo-1530023367847-a683933f4172?q=80&w=2070&auto=format&fit=crop';

// --- Componente Principal: ConfirmedPage ---
const ConfirmedPage: React.FC = () => {
  const { t } = useI18n();

  // --- Estado Local ---
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // Clave i18n, no texto traducido

  // --- Función: Recuperar datos del invitado ---
  const fetch_guest_data = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await guestService.getMe();
      setGuest(data);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status ?? 0;

      if (status === 401 || status === 403) {
        sessionStorage.removeItem('rsvp_token');
        window.location.href = '/app/login.html';
        return;
      }

      if (status === 429) {
        setError('login.errors_rate_limit'); // Guardamos la clave
      } else {
        setError('ok.load_error'); // Guardamos la clave
      }
    } finally {
      setLoading(false);
    }
  }, []); // t no es necesario en las dependencias si solo se usa en setError para una clave

  // --- Efecto: Verificación de token y carga inicial ---
  useEffect(() => {
    const token = sessionStorage.getItem('rsvp_token');
    if (!token) {
      window.location.href = '/app/login.html';
      return;
    }
    fetch_guest_data();
  }, [fetch_guest_data]);

  // --- Renderizado Condicional (Carga / Error / Sin Datos) ---
  if (loading) return <PageLayout><Loader /></PageLayout>;

  if (error) {
    return (
      <PageLayout>
        <Card className="max-w-md mx-auto mt-20 p-8">
          <h1 className="form-title h1-small text-center mb-4">{t('ok.title')}</h1>
          <Alert message={t(error)} variant="danger" />
        </Card>
      </PageLayout>
    );
  }

  if (!guest) {
    return (
      <PageLayout>
        <Card className="form-card text-center">
          <h1 className="mt-4 form-title h1-small">{t('ok.title')}</h1>
          <p className="mt-2 form-subtitle">{t('ok.no_data')}</p>
        </Card>
      </PageLayout>
    );
  }

  // --- Lógica de Presentación ---
  const companions = Array.isArray(guest.companions) ? guest.companions : [];
  const companions_count = companions.length;

  // Cálculo de adultos y niños
  let num_adults = 0;
  let num_children = 0;

  if ((guest as any).num_adults !== undefined && (guest as any).num_children !== undefined) {
    // Si el backend envía los contadores ya calculados, los usamos
    num_adults = Number((guest as any).num_adults);
    num_children = Number((guest as any).num_children);
  } else {
    // Fallback: Calcular basándonos en companions + titular
    // Titular siempre cuenta como 1 adulto
    const adult_companions = companions.filter((c: Companion) => !c.is_child).length;
    const child_companions = companions.filter((c: Companion) => c.is_child).length;

    num_adults = 1 + adult_companions;
    num_children = child_companions;
  }

  const is_attending = Boolean(
    (guest as any).attending !== undefined
      ? (guest as any).attending
      : guest.confirmed
  );

  const message = is_attending ? t('ok.msg_yes') : t('ok.msg_no');
  const allergies_text = build_allergies_text(guest.allergies, t);

  // --- Renderizado Principal (UI) ---
  return (
    <PageLayout backgroundImage={BG_IMAGE}>
      <div className="rsvp-container">
        <Card className="rsvp-card relative border-none shadow-xl bg-white">
          <header className="text-center mb-8 pt-6">
            {/* Icono de confirmación */}
            <div className="confirmation-icon mx-auto text-[var(--color-gold-primary)]">
              <svg
                className="w-12 h-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Título y mensaje principal */}
            <h1 className="form-title font-serif text-3xl text-[var(--color-gold-primary)] mb-2">{t('ok.title')}</h1>
            <p className="form-subtitle text-[var(--color-text-muted)] italic">{message}</p>

            {/* Resumen de eventos a los que se asiste - SOLO SI ASISTE */}
            {guest && is_attending && (
              <div className="mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-[var(--color-border)] inline-block">
                <p className="page-subtitle mt-0 text-lg text-[var(--color-text-main)] mb-1">
                  {(guest.invite_type === 'full' || guest.invite_type === 'ceremony') 
                    ? t('summary.events_both_confirmed') 
                    : t('summary.events_reception_only_confirmed')}
                 </p>
              </div>
            )}
          </header>

          {/* Sección: Resumen de datos - SOLO SI ASISTE Y NO DECLINADO */}
          {is_attending ? (
            <div className="rsvp-section mb-8">
              <h3 className="rsvp-section__title text-left">{t('summary.title')}</h3>

              <div className="mb-4 mt-2 text-left text-[var(--color-text-main)]">
                   <p className="text-md">
                      {(guest.invite_type === 'full' || guest.invite_type === 'ceremony')
                          ? t('invite.scope.full').split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
                          : t('invite.scope.reception').split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
                      }
                   </p>
                   <hr className="mt-3 border-gray-200" />
              </div>

              <div className="space-y-2 mt-4 text-left">
                <p>
                  <strong>{t('summary.main_guest_label')}:</strong>{' '}
                  {guest.full_name}
                </p>

                {/* Email y Teléfono */}
                {guest.email && guest.email.trim() && (
                  <p>
                    <strong>{t('summary.email_label')}:</strong>{' '}
                    {guest.email}
                  </p>
                )}
                {guest.phone && guest.phone.trim() && (
                  <p>
                    <strong>{t('summary.phone_label')}:</strong>{' '}
                    {guest.phone}
                  </p>
                )}

                <p>
                  <strong>{t('summary.adults_label')}:</strong>{' '}
                  {num_adults}
                </p>
                <p>
                  <strong>{t('summary.children_label')}:</strong>{' '}
                  {num_children}
                </p>

                <p>
                  <strong>{t('summary.companions_label')}:</strong>{' '}
                  {companions_count}
                </p>
                
                {/* Alergias */}
                {allergies_text && (
                  <p>
                    <strong>{t('summary.allergies_main_label')}:</strong>{' '}
                    {allergies_text}
                  </p>
                )}
                
                {/* Notas del invitado (Lectura) */}
                {guest.notes && guest.notes.trim() && (
                   <div className="summary-item !block text-left pt-2 border-t border-dashed border-gray-200 mt-2">
                      <span className="summary-item__label block mb-1">{t('form.notes.expander_label')}:</span>
                      <span className="summary-item__value text-sm block whitespace-pre-wrap">{guest.notes}</span>
                   </div>
                )}
              </div>
            </div>
          ) : (
            // SI NO ASISTE: Solo mostrar notas si existen (lectura)
            guest.notes && guest.notes.trim() ? (
               <div className="rsvp-section mb-8 text-left">
                   <div className="summary-item !block pt-2 border-dashed border-gray-200 mt-2">
                      <span className="summary-item__label block mb-1">{t('form.notes.expander_label')}:</span>
                      <span className="summary-item__value text-sm block whitespace-pre-wrap">{guest.notes}</span>
                   </div>
               </div>
            ) : null
          )}

          {/* Sección: Detalle de Acompañantes */}
          {is_attending && companions_count > 0 && (
            <div className="rsvp-section mt-6 text-left">
              <h3 className="rsvp-section__title">{t('summary.companions_section_title')}</h3>

              <ul className="rsvp-companion-list mt-3 space-y-4">
                {companions.map((comp: any, index: number) => {
                  const comp_name = comp.name || t('form.companion_label');
                  const comp_is_child = Boolean(comp.is_child);
                  const profileLabel = comp_is_child
                    ? t('form.child')
                    : t('form.adult');

                  const companion_allergies_text = build_allergies_text(comp.allergies, t);

                  return (
                    <li key={comp.id ?? index} className="rsvp-companion-card list-none">
                      <strong>{comp_name}</strong>, que es {profileLabel.toLowerCase()},
                      {companion_allergies_text ? (
                        <>
                          {' '}{t('summary.companion_has_allergies')}:
                          <br />
                          {companion_allergies_text}
                        </>
                      ) : (
                        <> {t('summary.companion_no_allergies')}.</>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="rsvp-footer-actions flex flex-col">
            <Button
              onClick={() => {
                window.location.href = '/app/rsvp-form.html';
              }}
              className="w-full text-lg h-14 btn-primary shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all mb-4"
            >
              {t('ok.btn_edit')}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                sessionStorage.removeItem('rsvp_token');
                window.location.href = '/app/login.html';
              }}
              className="btn-dashed w-full"
            >
              {t('ok.btn_logout')}
            </Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

// --- Componente auxiliar: SummaryItem (actualmente no utilizado pero conservado) ---
/*
const SummaryItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="summary-item">
    <span className="summary-item__label">{label}:</span>
    <span className="summary-item__value">{value}</span>
  </div>
);
*/

export default ConfirmedPage;
