// -----------------------------------------------------------------------------
// Archivo: src/pages/app/ConfirmedPage.tsx
// Propósito:
//   Página de confirmación del RSVP. Replica la lógica de 2_Confirmado.py en
//   versión React:
//     - Verifica que exista un token válido en sessionStorage.
//     - Llama a GET /api/guest/me para recuperar la respuesta guardada.
//     - Muestra un resumen visual reutilizando claves i18n existentes.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Card, Button, Loader } from '@/components/common';
import PageLayout from '@/components/PageLayout';
import { guestService } from '@/services/guestService';
import { GuestData } from '@/types';

// -----------------------------------------------------------------------------
// Helper: construye un texto de alergias a partir de un string con códigos
// separados por comas. Usa claves existentes 'options.allergen.<codigo>'.
// -----------------------------------------------------------------------------
const build_allergies_text = (
  raw_allergies: string | null,
  t: (key: string) => string
): string => {
  if (!raw_allergies) {
    return 'N/A';
  }

  const codes = raw_allergies
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);

  if (codes.length === 0) {
    return 'N/A';
  }

  return codes
    .map((code) => t(`options.allergen.${code}`))
    .join(', ');
};

// -----------------------------------------------------------------------------
// Componente principal: ConfirmedPage
// -----------------------------------------------------------------------------
const ConfirmedPage: React.FC = () => {
  const { t } = useI18n();

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Función: fetch_guest_data
  // ---------------------------------------------------------------------------
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
        setError(t('login.errors_rate_limit'));
      } else {
        setError(t('ok.load_error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ---------------------------------------------------------------------------
  // Efecto de montaje
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const token = sessionStorage.getItem('rsvp_token');
    if (!token) {
      window.location.href = '/app/login.html';
      return;
    }
    fetch_guest_data();
  }, [fetch_guest_data]);

  // ---------------------------------------------------------------------------
  // Renderizado condicional (Carga / Error / No Data)
  // ---------------------------------------------------------------------------
  if (loading) return <PageLayout><Loader /></PageLayout>;

  if (error) {
    return (
      <PageLayout>
        <Card className="form-card text-center">
          <h1 className="mt-4 form-title h1-small">{t('ok.title')}</h1>
          <p className="mt-2 form-subtitle">{error}</p>
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

  // ---------------------------------------------------------------------------
  // Cálculo de variables para el render
  // ---------------------------------------------------------------------------
  const companions = Array.isArray(guest.companions) ? guest.companions : [];
  const companions_count = companions.length;

  const num_adults =
    (guest as any).num_adults !== undefined
      ? Number((guest as any).num_adults)
      : Math.max(companions_count, 0);

  const num_children =
    (guest as any).num_children !== undefined
      ? Number((guest as any).num_children)
      : 0;

  const is_attending = Boolean(
    (guest as any).attending !== undefined
      ? (guest as any).attending
      : guest.confirmed
  );

  const message = is_attending ? t('ok.msg_yes') : t('ok.msg_no');
  const allergies_text = build_allergies_text(guest.allergies, t);

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------
  return (
    <PageLayout>
      <Card className="form-card text-center">
        {/* Icono de confirmación */}
        <svg
          className="confirmed-icon"
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

        {/* Título y mensaje principal */}
        <h1 className="mt-4 form-title h1-small">{t('ok.title')}</h1>
        <p className="mt-2 form-subtitle">{message}</p>

        {/* Resumen */}
        <div className="confirmed-summary">
          <h2 className="fieldset-legend text-left">{t('ok.summary')}</h2>

          <div className="space-y-2 mt-4">
            <SummaryItem label={t('ok.main_guest')} value={guest.full_name} />

            {is_attending && (
              <>
                {/* ANTES:
                    <SummaryItem
                      label={t('ok.adults_children')}
                      value={`${num_adults} / ${num_children}`}
                    />
                   AHORA: dos líneas separadas, reutilizando claves existentes
                   'form.adult' y 'form.child'.
                */}
                <SummaryItem
                  label={t('form.adult')}
                  value={String(num_adults)}
                />
                <SummaryItem
                  label={t('form.child')}
                  value={String(num_children)}
                />

                <SummaryItem
                  label={t('ok.companions')}
                  value={String(companions_count)}
                />
                <SummaryItem
                  label={t('ok.allergies')}
                  value={allergies_text}
                />
              </>
            )}
          </div>
        </div>

        {/* Detalle de Acompañantes */}
        {is_attending && companions_count > 0 && (
          <div className="companions-detail mt-6 text-left">
            {/* USO DE CLAVE EXISTENTE: 'ok.companions' -> "Acompañantes" */}
            <h3 className="fieldset-legend">{t('ok.companions')}</h3>

            <ul className="companions-list mt-3">
              {companions.map((comp: any, index: number) => {
                // Nombre del acompañante (o etiqueta genérica)
                const comp_name = comp.name || t('form.companion_label');
                const comp_is_child = Boolean(comp.is_child);

                // USO DE CLAVES EXISTENTES: 'form.child' / 'form.adult'
                const comp_type_label = comp_is_child
                  ? t('form.child')
                  : t('form.adult');

                const comp_allergies_text = build_allergies_text(
                  comp.allergies ?? null,
                  t
                );

                return (
                  <li key={comp.id ?? index} className="companions-list__item">
                    <span className="companions-list__name">{comp_name}</span>
                    <span className="companions-list__type">
                      {' '}
                      – {comp_type_label}
                    </span>
                    {comp_allergies_text !== 'N/A' && (
                      <span className="companions-list__allergies">
                        {' '}
                        – {t('ok.allergies')}: {comp_allergies_text}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-4 responsive-grid mt-8">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = '/app/rsvp-form.html';
            }}
          >
            {t('ok.btn_edit')}
          </Button>

          <Button
            onClick={() => {
              sessionStorage.removeItem('rsvp_token');
              window.location.href = '/app/login.html';
            }}
          >
            {t('ok.btn_logout')}
          </Button>
        </div>
      </Card>
    </PageLayout>
  );
};

// -----------------------------------------------------------------------------
// Componente auxiliar: fila de resumen (etiqueta + valor)
// -----------------------------------------------------------------------------
const SummaryItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="summary-item">
    <span className="summary-item__label">{label}:</span>
    <span className="summary-item__value">{value}</span>
  </div>
);

export default ConfirmedPage;
