
import { test, expect } from '@playwright/test';

/**
 * REGRESSION TEST: Assisted RSVP Modal
 * Purpose: Ensure that editing notes does not delete companions and that "Not Attending" clears data.
 */

// Configuración de base (ajustar si tu env es distinto)
const ADMIN_URL = process.env.VITE_BASE_URL || 'http://localhost:5173/admin/guests.html';
const API_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'supersecreto123';

test.describe('Assisted RSVP Modal Regression Tests', () => {
  let guestId: number;
  let uniqueId: string;

  test.beforeAll(async ({ request }) => {
    // Generate unique phone to avoid collision if previous test didn't cleanup
    uniqueId = Date.now().toString().slice(-6);
    const uniquePhone = `+555${uniqueId}`;

    // SEEDING: Crear un invitado de prueba determinista vía API
    const response = await request.post(`${API_URL}/admin/guests`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {
        full_name: `E2E Regression Guest ${uniqueId}`, // Also unique name to be safe
        phone: uniquePhone,
        language: 'es',
        invite_type: 'full',
        max_accomp: 2
      }
    });
    
    if (!response.ok()) {
      console.error('Failed to create guest:', await response.text());
    }
    expect(response.ok()).toBeTruthy();
    const guest = await response.json();
    guestId = guest.id;

    // Añadir un acompañante inicial para la prueba vía RSVP asistido (o vía CRUD si prefieres)
    await request.post(`${API_URL}/admin/guests/${guestId}/rsvp`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      data: {
        attending: true,
        companions: [{ name: 'Compañero Original', is_child: false, allergies: null }]
      }
    });
  });
  
  test.beforeEach(async ({ page }) => {
    // 1. Inyectar token fake para que el Frontend no redirija al login
    await page.addInitScript(() => {
       window.sessionStorage.setItem('rsvp_admin_token', 'TEST_BYPASS_TOKEN');
       // También seteamos el localStorage por si acaso se usa en otro lado
       window.localStorage.setItem('rsvp_admin_token', 'TEST_BYPASS_TOKEN');
    });

    // 2. Interceptar peticiones API y añadir la Key real para que el Backend acepte
    await page.route('**/api/admin/**', async route => {
      const headers = { ...route.request().headers(), 'x-admin-key': ADMIN_KEY };
      // Eliminamos Authorization para forzar uso de x-admin-key en el backend si hay conflicto
      // (aunque security.py revisa ambos, prioriza key si coincide)
      delete headers['authorization']; 
      await route.continue({ headers });
    });
  });

  test('should not delete companions when editing notes', async ({ page }) => {
    // 1. Ir a la página de invitados
    await page.goto(ADMIN_URL);
    
    // 2. Buscar al invitado usando el input de búsqueda (para filtrar y asegurar visibilidad)
    await page.getByTestId('search-guests-input').fill(`E2E Regression Guest ${uniqueId}`);
    
    // Esperar a que el debounce y el fetch terminen. Buscamos la fila específica.
    const row = page.getByRole('row', { name: `E2E Regression Guest ${uniqueId}` });
    await expect(row).toBeVisible();

    // 3. Abrir el modal de RSVP asistido
    // Asumimos que hay un botón de "RSVP" o similar. Buscamos por texto o icon
    await row.getByRole('button', { name: /RSVP|Asistir/i }).click();

    // 4. Cambiar a modo edición si es necesario (el modal tiene un botón de Modificar)
    const editBtn = page.getByRole('button', { name: /Modificar/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }

    // 5. Verificar que el acompañante original está ahí
    await expect(page.getByTestId('admin-assisted-companion-row')).toHaveCount(1);
    await expect(page.getByDisplayValue('Compañero Original')).toBeVisible();

    // 6. Editar solo las notas
    const notesField = page.getByTestId('admin-assisted-notes-field');
    await notesField.fill('Nota de prueba E2E para regresión');

    // 7. Guardar
    await page.getByTestId('admin-assisted-save-btn').click();

    // 8. Reabrir el modal para verificar persistencia
    await row.getByRole('button', { name: /RSVP|Asistir/i }).click();
    
    // Verificamos en la vista de lectura (Read-Only) que el acompañante sigue listado
    await expect(page.getByText('Compañero Original')).toBeVisible();
    await expect(page.getByText('Nota de prueba E2E para regresión')).toBeVisible();
  });

  test('should clear data when marking as Not Attending', async ({ page }) => {
    await page.goto(ADMIN_URL);
    
    // Buscar para asegurar que aparece
    await page.getByTestId('search-guests-input').fill(`E2E Regression Guest ${uniqueId}`);
    const row = page.getByRole('row', { name: `E2E Regression Guest ${uniqueId}` });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /RSVP|Asistir/i }).click();

    const editBtn = page.getByRole('button', { name: /Modificar/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }

    // Cambiar a "NO Asiste"
    await page.getByRole('button', { name: /NO Asiste/i }).click();
    
    // Guardar
    await page.getByTestId('admin-assisted-save-btn').click();

    // Reabrir y verificar limpieza
    await row.getByRole('button', { name: /RSVP|Asistir/i }).click();
    await expect(page.getByText(/NO ASISTE/i)).toBeVisible();
    await expect(page.getByText('Compañero Original')).not.toBeVisible();
  });

  test.afterAll(async ({ request }) => {
    // Limpieza: Borrar el invitado de prueba
    if (guestId) {
      await request.delete(`${API_URL}/admin/guests/${guestId}`, {
        headers: { 'X-Admin-Api-Key': ADMIN_KEY }
      });
    }
  });
});
