// frontend/src/pages/app/__tests__/LoginPage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LoginPage from '../LoginPage';
import { guestService } from '@/services/guestService';
import * as AuthContextModule from '@/contexts/AuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';

// ----------------------------------------------------------------------
// 1. MOCKS ESTRATÉGICOS
// ----------------------------------------------------------------------

// A) Mock de I18nContext
// Incluye hook y Provider para que LoginPage se monte sin problemas.
const mockT = (key: string, replacements?: Record<string, any>): string => {
  if (key === 'form.error_rate_limited_with_retry' && replacements?.seconds) {
    return `RATE_LIMIT_RETRY_${replacements.seconds}`;
  }
  return key;
};

vi.mock('@/contexts/I18nContext', () => ({
  // Simulamos el hook useI18n
  useI18n: () => ({
    t: mockT,
    lang: 'es',
    setLang: vi.fn(),
  }),
  // Simulamos el Provider como un passthrough sencillo
  I18nProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// B) Mock de AuthContext
const mockLoginUser = vi.fn();
const mockUseAuth = vi.spyOn(AuthContextModule, 'useAuth');

// C) Mock de guestService
vi.mock('@/services/guestService', () => ({
  guestService: {
    login: vi.fn(),
  },
}));

// D) Mock de window.location
// Usamos href para comprobar la redirección final, sin acoplarnos a assign().
const mockWindowLocation: any = { href: '' };

// E) Mock de PageLayout
vi.mock('@/components/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ----------------------------------------------------------------------
// 2. CONFIGURACIÓN DEL ENTORNO
// ----------------------------------------------------------------------

describe('LoginPage', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: mockWindowLocation,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: mockLoginUser,
      logout: vi.fn(),
      isAdmin: false,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  const fillForm = (code: string, contact: string) => {
    fireEvent.change(screen.getByLabelText('login.code'), { target: { value: code } });
    fireEvent.change(screen.getByLabelText('login.contact'), { target: { value: contact } });
  };

  const renderComponent = () =>
    render(
      <I18nProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </I18nProvider>,
    );

  // ----------------------------------------------------------------------
  // CASO 1: Renderizado Inicial
  // ----------------------------------------------------------------------
  test('debe renderizar la estructura correcta y los enlaces de ayuda', () => {
    renderComponent();

    expect(screen.getByText('login.title')).toBeInTheDocument();
    expect(screen.getByLabelText('login.code')).toBeInTheDocument();

    const forgotLink = screen.getByText('login.forgot').closest('a');
    expect(forgotLink).toHaveAttribute('href', '/app/recover-code.html');
  });

  // ----------------------------------------------------------------------
  // CASO 2: Validación de Campos Vacíos
  // ----------------------------------------------------------------------
  test('debe mostrar error login.errors_empty si se intenta enviar vacío', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      expect(screen.getByText('login.errors_empty')).toBeInTheDocument();
    });

    expect(guestService.login).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------------
  // CASO 3: Sanitización de Datos
  // ----------------------------------------------------------------------
  test('debe sanitizar contacto y código (toUpperCase)', async () => {
    (guestService.login as any).mockResolvedValue({ access_token: 'fake_token' });

    renderComponent();

    // Escenario 1: Email "sucio"
    fillForm('code-low', '  Email@Test.Com  ');
    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      expect(guestService.login).toHaveBeenCalledWith({
        guest_code: 'CODE-LOW',
        email: 'email@test.com',
        phone: undefined,
      });
    });

    (guestService.login as jest.Mock).mockClear?.();
    (guestService.login as any).mockClear?.();

    // Escenario 2: Teléfono "sucio"
    fillForm('CODE', ' (+34) 600 123 4567 ');
    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      expect(guestService.login).toHaveBeenCalledWith({
        guest_code: 'CODE',
        email: undefined,
        // El sanitizeContact deja solo + y dígitos
        phone: '+346001234567',
      });
    });
  });

  // ----------------------------------------------------------------------
  // CASO 4: Flujo Exitoso
  // ----------------------------------------------------------------------
  test('debe iniciar sesión y redirigir a RSVP si el login es correcto', async () => {
    const FAKE_TOKEN = 'jwt_token_123';
    (guestService.login as any).mockResolvedValue({ access_token: FAKE_TOKEN });

    renderComponent();
    fillForm('CODE123', 'juan@test.com');

    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    // 1. Se llama a login del contexto con el token del backend
    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith(FAKE_TOKEN);
    });

    // 2. Se actualiza la ubicación hacia el formulario RSVP
    await waitFor(() => {
      expect(mockWindowLocation.href).toBe('/app/rsvp-form.html');
    });
  });

  // ----------------------------------------------------------------------
  // CASO 5: Manejo de Errores HTTP
  // ----------------------------------------------------------------------
  test.each([
    { status: 401, errorKey: 'login.errors_auth', desc: 'Credenciales inválidas' },
    // Para 429, el componente muestra login.errors_rate_limit
    { status: 429, errorKey: 'login.errors_rate_limit', desc: 'Rate limit', retryAfter: 60 },
    { status: 500, errorKey: 'login.server_err', desc: 'Error servidor' },
    { status: 400, errorKey: 'login.server_err', desc: 'Error genérico' },
  ])('debe manejar error $status ($desc)', async ({ status, errorKey, retryAfter }) => {
    (guestService.login as any).mockRejectedValue({ status, retryAfter });

    const { unmount } = renderComponent();
    fillForm('CODE', 'test@fail.com');

    fireEvent.click(screen.getByRole('button', { name: 'login.submit' }));

    await waitFor(() => {
      expect(screen.getByText(errorKey)).toBeInTheDocument();
    });

    expect(mockLoginUser).not.toHaveBeenCalled();
    unmount();
  });

  // ----------------------------------------------------------------------
  // CASO 6: Estado de Carga
  // ----------------------------------------------------------------------
  test('debe deshabilitar el botón y mostrar loader mientras envía', async () => {
    let resolveApi: any;
    const pendingPromise = new Promise(resolve => {
      resolveApi = resolve;
    });

    (guestService.login as any).mockReturnValue(pendingPromise);

    renderComponent();
    fillForm('CODE', 'slow@test.com');

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    // Mientras la promesa no se resuelve, el botón debe estar deshabilitado
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // El texto desaparece porque el botón muestra el Loader
    expect(screen.queryByText('login.submit')).not.toBeInTheDocument();

    // Resolvemos la promesa (simulando fin de la petición)
    resolveApi({});

    await waitFor(() => {
      // Tras terminar, el botón vuelve a estado normal
      expect(submitBtn).not.toBeDisabled();
      expect(screen.getByText('login.submit')).toBeInTheDocument();
    });
  });
});
