// frontend/src/pages/app/__tests__/RsvpFormPage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import RsvpFormPage from '../RsvpFormPage';
import { guestService } from '@/services/guestService';
import apiClient from '@/services/apiClient';
import { I18nProvider } from '@/contexts/I18nContext';

// ----------------------------------------------------------------------
// 1. MOCKS DE MÓDULOS Y SERVICIOS
// ----------------------------------------------------------------------

// A) Mock del servicio de invitado (getMe + submitRsvp)
vi.mock('@/services/guestService', () => ({
  guestService: {
    getMe: vi.fn(),
    submitRsvp: vi.fn(),
  },
}));

// B) Mock del cliente API genérico
vi.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// C) Mock de i18n
vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'es',
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// D) Mock de PageLayout
vi.mock('@/components/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// E) Mock de Componentes Comunes
vi.mock('@/components/common', () => ({
  __esModule: true,
  Card: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
  FormField: ({ id, label, type = 'text', value, onChange, placeholder }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  ),
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  Loader: () => <div>loader...</div>,
}));

// ----------------------------------------------------------------------
// 2. SETUP DE ENTORNO
// ----------------------------------------------------------------------

const apiClientMock = apiClient as unknown as vi.Mock;

const mocked_guest = {
  id: 1,
  full_name: 'Alex Test',
  confirmed: null,
  email: '',
  phone: '',
  notes: '',
  allergies: null,
  companions: [],
  max_accomp: 2,
} as any;

const mocked_meta_options = {
  allergens: ['gluten', 'soy'],
};

describe('RsvpFormPage', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiClientMock.mockReset();
    window.location.href = '';
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  // --- HELPER DE CARGA ---
  const setup_loaded_page = async (guest_override?: any) => {
    (guestService.getMe as any).mockResolvedValue(guest_override ?? mocked_guest);
    apiClientMock.mockResolvedValue(mocked_meta_options);

    render(
      <I18nProvider>
        <RsvpFormPage />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('loader...')).not.toBeInTheDocument();
    });
  };

  // ----------------------------------------------------------------------
  // 3. TESTS LÓGICOS
  // ----------------------------------------------------------------------

  test('debe mostrar loader y luego el formulario', async () => {
    (guestService.getMe as any).mockResolvedValue(mocked_guest);
    apiClientMock.mockResolvedValue(mocked_meta_options);

    render(
      <I18nProvider>
        <RsvpFormPage />
      </I18nProvider>
    );

    expect(screen.getByText('loader...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('form.contact_title')).toBeInTheDocument();
    });
  });

  // 🔹 TEST AJUSTADO: ya no espera form.select_option, comprueba el estado disabled/enabled
  test('debe mantener deshabilitado el envío si no se selecciona asistencia', async () => {
    await setup_loaded_page();

    // Rellenamos el email para aislar la regla de asistencia
    fireEvent.change(screen.getByLabelText('form.field_email'), {
      target: { value: 'test@example.com' },
    });

    const submitBtn = screen.getByRole('button', { name: 'form.submit' });

    // Mientras no se haya elegido "sí" o "no", el botón debe estar deshabilitado
    expect(submitBtn).toBeDisabled();

    // Cuando elegimos "sí", el botón debería habilitarse (ya hay asistencia + contacto)
    fireEvent.click(screen.getByLabelText('form.yes'));

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    // Aún no se ha enviado nada
    expect(guestService.submitRsvp).not.toHaveBeenCalled();
  });

  test('debe exigir al menos un medio de contacto', async () => {
    await setup_loaded_page();

    fireEvent.click(screen.getByLabelText('form.yes'));

    fireEvent.change(screen.getByLabelText('form.field_email'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('form.field_phone'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      expect(screen.getByText('form.contact_required_one')).toBeInTheDocument();
    });
  });

  test('debe validar formato de email y teléfono', async () => {
    await setup_loaded_page();
    fireEvent.click(screen.getByLabelText('form.yes'));

    fireEvent.change(screen.getByLabelText('form.field_email'), {
      target: { value: 'bad-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      expect(screen.getByText('form.contact_invalid_email')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('form.field_email'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('form.field_phone'), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      expect(screen.getByText('form.contact_invalid_phone')).toBeInTheDocument();
    });
  });

  test('debe enviar el payload correcto con acompañantes y alergias', async () => {
    await setup_loaded_page();

    (guestService.submitRsvp as any).mockResolvedValue({ ok: true });

    fireEvent.click(screen.getByLabelText('form.yes'));

    fireEvent.change(screen.getByLabelText('form.field_email'), {
      target: { value: 'juan@test.com' },
    });
    fireEvent.change(screen.getByLabelText('form.field_phone'), {
      target: { value: '+57 300 123 4567' },
    });

    fireEvent.click(screen.getByText('options.allergen.gluten'));

    fireEvent.click(screen.getByRole('button', { name: '+ form.companion_label' }));
    fireEvent.change(screen.getByLabelText('form.field_name'), {
      target: { value: 'Esposa Test' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      expect(guestService.submitRsvp).toHaveBeenCalledTimes(1);
    });

    const payload = (guestService.submitRsvp as any).mock.calls[0][0];

    expect(payload.attending).toBe(true);
    expect(payload.email).toBe('juan@test.com');
    expect(payload.phone).toBe('+573001234567');
    expect(payload.allergies).toBe('gluten');
    expect(payload.companions).toHaveLength(1);
    expect(payload.companions[0].name).toBe('Esposa Test');

    expect(window.location.href).toBe('/app/confirmed.html');
  });

  test('debe limpiar alergias y acompañantes si NO asiste', async () => {
    await setup_loaded_page();
    (guestService.submitRsvp as any).mockResolvedValue({ ok: true });

    fireEvent.click(screen.getByLabelText('form.no'));
    fireEvent.change(screen.getByLabelText('form.field_email'), {
      target: { value: 'juan@test.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      const payload = (guestService.submitRsvp as any).mock.calls[0][0];
      expect(payload.attending).toBe(false);
      expect(payload.allergies).toBeNull();
      expect(payload.companions).toEqual([]);
    });
  });

  test('debe manejar errores del servidor (ej. 500)', async () => {
    await setup_loaded_page();

    (guestService.submitRsvp as any).mockRejectedValue({ response: { status: 500 } });

    fireEvent.click(screen.getByLabelText('form.yes'));
    fireEvent.change(screen.getByLabelText('form.field_email'), {
      target: { value: 'juan@test.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'form.submit' }));

    await waitFor(() => {
      expect(screen.getByText('form.error_server')).toBeInTheDocument();
    });

    expect(window.location.href).not.toBe('/app/confirmed.html');
  });

  test('no debe permitir agregar más acompañantes que el máximo', async () => {
    const guestLimitado = { ...mocked_guest, max_accomp: 1 };
    await setup_loaded_page(guestLimitado);

    fireEvent.click(screen.getByLabelText('form.yes'));

    const addBtn = screen.getByRole('button', { name: '+ form.companion_label' });

    fireEvent.click(addBtn);
    expect(screen.getAllByLabelText('form.field_name')).toHaveLength(1);

    fireEvent.click(addBtn);
    expect(screen.getAllByLabelText('form.field_name')).toHaveLength(1);
  });
});
