// frontend/src/pages/app/__tests__/RequestAccessPage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import RequestAccessPage from '../RequestAccessPage';
import { guestService } from '@/services/guestService';

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DEL MOCK DE i18n (ES / RO CONFIGURABLE)
// ----------------------------------------------------------------------

let mockLang: 'es' | 'ro' = 'es';
let mockTranslations: Record<string, string> = {};

// Función de traducción usada por el mock:
// - Si hay traducción en mockTranslations → la usa.
// - Si no, devuelve la clave (comportamiento actual).
const mockT = (key: string): string => {
  return mockTranslations[key] ?? key;
};

// ----------------------------------------------------------------------
// 2. MOCKS DE MÓDULOS
// ----------------------------------------------------------------------

vi.mock('@/services/guestService', () => ({
  guestService: {
    requestAccess: vi.fn(),
  },
}));

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: mockT,
    lang: mockLang,
  }),
}));

vi.mock('@/components/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ----------------------------------------------------------------------
// 3. HELPER
// ----------------------------------------------------------------------

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText('request.full_name'), { target: { value: 'Juan Test' } });
  fireEvent.change(screen.getByLabelText('request.phone_last4'), { target: { value: '1234' } });
  fireEvent.change(screen.getByLabelText('request.email'), { target: { value: 'juan@test.com' } });
};

// ----------------------------------------------------------------------
// 4. TESTS
// ----------------------------------------------------------------------

describe('RequestAccessPage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, todos los tests trabajan en "es" y sin traducciones especiales.
    mockLang = 'es';
    mockTranslations = {};
  });

  // ----------------------------------------------------------------------
  // CASO 1: Renderizado inicial
  // ----------------------------------------------------------------------
  test('debe renderizar el formulario con todos sus campos', () => {
    render(<RequestAccessPage />);

    expect(screen.getByText('request.title')).toBeInTheDocument();
    expect(screen.getByLabelText('request.full_name')).toBeInTheDocument();
    expect(screen.getByLabelText('request.phone_last4')).toBeInTheDocument();
    expect(screen.getByLabelText('request.email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'request.submit' })).toBeInTheDocument();
  });

  // ----------------------------------------------------------------------
  // CASO 2: Validar formulario vacío
  // ----------------------------------------------------------------------
  test('debe mostrar errores si se envía vacío', async () => {
    render(<RequestAccessPage />);

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getAllByText('val_required').length).toBeGreaterThan(0);
    });

    expect(guestService.requestAccess).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------------
  // CASO 3: Consentimiento NO marcado
  // ----------------------------------------------------------------------
  test('debe mostrar error si no se acepta el consentimiento', async () => {
    render(<RequestAccessPage />);
    fillValidForm();

    const checkbox = screen.getByLabelText('request.consent');
    fireEvent.click(checkbox); // Desmarcar
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getByText('request.consent_required')).toBeInTheDocument();
    });

    expect(guestService.requestAccess).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------------
  // CASO 4: Flujo exitoso
  // ----------------------------------------------------------------------
  test('debe llamar al servicio y mostrar éxito', async () => {
    (guestService.requestAccess as any).mockResolvedValue({
      ok: true,
      message_key: 'request.success_message_ok',
    });

    render(<RequestAccessPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(guestService.requestAccess).toHaveBeenCalledWith({
        full_name: 'Juan Test',
        phone_last4: '1234',
        email: 'juan@test.com',
        lang: 'es',
        consent: true,
      });

      expect(screen.getByText('request.success_message_ok')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------------
  // CASO 5: Email o teléfono ya existen
  // ----------------------------------------------------------------------
  test('debe mostrar error si backend reporta email_conflict', async () => {
    (guestService.requestAccess as any).mockResolvedValue({
      ok: false,
      email_conflict: true,
    });

    render(<RequestAccessPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getByText('request.email_or_phone_conflict')).toBeInTheDocument();
      expect(screen.queryByText('request.success_message_ok')).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------------
  // CASO 6: Error 429 (rate limit)
  // ----------------------------------------------------------------------
  test('debe mostrar error rate limit con retry', async () => {
    (guestService.requestAccess as any).mockRejectedValue({
      status: 429,
      retryAfter: 60,
    });

    render(<RequestAccessPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getByText('form.error_rate_limited_with_retry')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------------
  // CASO 7: Error 404 y error genérico
  // ----------------------------------------------------------------------
  test('debe manejar error 404 y error genérico', async () => {
    // 404
    (guestService.requestAccess as any).mockRejectedValueOnce({ status: 404 });

    const { unmount } = render(<RequestAccessPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getByText('request.not_found_message')).toBeInTheDocument();
    });

    unmount();

    // Error 500
    (guestService.requestAccess as any).mockRejectedValue({ status: 500 });

    render(<RequestAccessPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

    await waitFor(() => {
      expect(screen.getByText('request.error')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------------
  // CASO 8: Estado loading / botón deshabilitado
  // ----------------------------------------------------------------------
  test('el botón debe deshabilitarse mientras se envía', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => (resolvePromise = resolve));

    (guestService.requestAccess as any).mockReturnValue(promise);

    render(<RequestAccessPage />);
    fillValidForm();

    const button = screen.getByRole('button', { name: 'request.submit' });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(button).toBeDisabled();

    resolvePromise({});
    await waitFor(() => expect(guestService.requestAccess).toHaveBeenCalled());
  });

  // ----------------------------------------------------------------------
  // CASO 9: Renderizado en rumano (RO)
  // ----------------------------------------------------------------------
  test('debe mostrar los textos en rumano cuando lang = ro', () => {
    // Configuramos el idioma y algunas traducciones específicas para el test
    mockLang = 'ro';
    mockTranslations = {
      'request.title': 'Cerere de acces',
      'request.submit': 'Trimite cererea',
    };

    render(<RequestAccessPage />);

    // Ahora NO vemos la clave, sino el texto en rumano
    expect(screen.getByText('Cerere de acces')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trimite cererea' })).toBeInTheDocument();
  });

});
