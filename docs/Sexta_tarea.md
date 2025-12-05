# Sexta tarea – Integración Frontend-Backend (Admin CRUD)

## 1. Contexto
El backend ya tiene los endpoints reales (`/api/admin/guests`) funcionando con base de datos.
El frontend tiene la interfaz lista (`AdminGuestsPage`) pero usa datos falsos (mocks).
**Objetivo:** Conectar ambas partes para que el panel de administración gestione datos reales.

## 2. Alcance Técnico
Esta tarea es **100% Frontend**.
Archivos permitidos para modificar:
1. `frontend/src/services/adminService.ts` (Implementar llamadas reales).
2. `frontend/src/pages/admin/AdminGuestsPage.tsx` (Consumir el servicio real).
3. `frontend/src/pages/admin/AdminLoginPage.tsx` (Ajustar validación).

**PROHIBIDO:**
- ❌ NO TOCAR `backend/`.
- ❌ NO TOCAR `frontend/src/services/apiClient.ts` (La configuración de headers y URL base ya es correcta).
- ❌ NO TOCAR flujo de invitados (`/app/`).

---

## 3. Requisitos de Implementación

### 3.1. Servicio Admin (`adminService.ts`)
Debes reemplazar los métodos vacíos o mocks por llamadas reales usando `apiClient`.

* **Endpoint Base:** `/api/admin`
* **Métodos requeridos:**
    * `getGuests(filters?)`: GET `/guests` (pasar query params si existen).
    * `createGuest(data)`: POST `/guests`.
    * `deleteGuest(id)`: DELETE `/guests/{id}`.
    * *(Opcional)* `updateGuest(id, data)`: PUT `/guests/{id}` (si se requiere editar).

### 3.2. Página de Invitados (`AdminGuestsPage.tsx`)
Reemplazar el estado local `useState<Guest[]>([...mocks])` por datos traídos del servidor.

* **Carga de Datos (Read):**
    * Usar `useEffect` para llamar a `adminService.getGuests()` al cargar la página.
    * Manejar estado de **carga** (`loading` spinner) y **error** (`Alert`).
* **Creación (Create):**
    * En `handleCreateGuest`, llamar a `adminService.createGuest`.
    * Si es exitoso: recargar la lista de invitados (o añadir al estado) y cerrar modal.
    * Si falla: mostrar alerta de error.
* **Eliminación (Delete):**
    * En `handleDeleteGuest`, llamar a `adminService.deleteGuest`.
    * Si es exitoso: quitar de la lista y cerrar modal.

### 3.3. Página de Login (`AdminLoginPage.tsx`)
* **Lógica:** Como el backend protege las rutas con `x-admin-key`, y el `apiClient` ya está configurado para leer esa clave del entorno (`VITE_ADMIN_KEY`), la página de login debe funcionar como una **puerta de validación visual**.
* **Acción:**
    * Comparar la clave introducida por el usuario con `import.meta.env.VITE_ADMIN_KEY`.
    * Si coincide → Redirigir a `/admin/dashboard.html`.
    * Si no coincide → Mostrar error.
    * *Nota:* No hay endpoint `/api/admin/login` en el backend (Tarea 5), por lo que la validación es client-side contra la variable de entorno, lo cual es aceptable para este alcance.

---

## 4. Estándares y Limpieza
* **Tipos:** Usa las interfaces definidas en `types.ts` o crea interfaces locales si faltan, pero mantén la consistencia.
* **Comentarios:** Mantén y actualiza los encabezados de archivo según `INSTRUCTIVO_COMENTARIOS.md`.
* **Limpieza:** Elimina todo el código de "datos mock" (la lista estática de Juan Pérez, etc.).