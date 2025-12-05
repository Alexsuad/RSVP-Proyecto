// File: frontend/src/pages/admin/AdminGuestsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Gestión del listado de invitados (CRUD Real).
// Rol: Muestra tabla de invitados consumiendo /api/admin/guests.
//      Permite buscar, crear y eliminar invitados persistentes.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Card, Button, AdminLayout, FormField, Alert, Loader } from '@/components/common';
import { adminService, Guest as ServiceGuest } from '@/services/adminService';

// ─────────────────────────────────────────────────────────────────────────────
// Definiciones de Tipos (Adaptador Local)
// ─────────────────────────────────────────────────────────────────────────────

// Extendemos o usamos directamente la del servicio
interface Guest extends ServiceGuest {}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminGuestsPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminGuestsPage: React.FC = () => {
    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------
    
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    // Control de visibilidad de Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Estado transitorio para operaciones
    const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
    const [newGuest, setNewGuest] = useState({
        full_name: '',
        email: '',
        phone: '',
        language: 'es',
        side: 'bride', // 'bride' | 'groom' (según enum backend/schema)
        max_accomp: 0
    });

    // -------------------------------------------------------------------------
    // Efectos (Carga de Datos)
    // -------------------------------------------------------------------------

    const fetchGuests = async () => {
        setLoading(true);
        setError(null);
        try {
            // Pasamos searchTerm al backend si queremos búsqueda en servidor
            // De momento cargamos todo y filtramos en cliente si la lista es pequeña,
            // o usamos la búsqueda del backend. Usaremos la del backend si hay search.
            const data = await adminService.getGuests(searchTerm ? { search: searchTerm } : undefined);
            setGuests(data);
        } catch (err) {
            console.error("Error cargando invitados:", err);
            setError("No se pudieron cargar los invitados. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    // Debounce para búsqueda en servidor (opcional) o carga inicial
    useEffect(() => {
        // Hacemos debounce manual o simple timeout
        const timer = setTimeout(() => {
             fetchGuests();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // -------------------------------------------------------------------------
    // Manejadores de Eventos (Actions)
    // -------------------------------------------------------------------------

    const handleImport = () => {
        console.log("Funcionalidad de importación pendiente (Tarea futura)");
    };

    const handleExport = () => {
        console.log("Funcionalidad de exportación pendiente");
    };

    // --- Funcionalidad de Creación (Create) ---
    
    // Abre el modal y resetea el formulario
    const handleOpenCreateModal = () => {
        setNewGuest({
            full_name: '',
            email: '',
            phone: '',
            language: 'es',
            side: 'bride',
            max_accomp: 0
        });
        setIsCreateModalOpen(true);
    };

    // Procesa la creación real del invitado
    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            // Mapeo simple de estado local a payload del servicio
            await adminService.createGuest({
                full_name: newGuest.full_name,
                email: newGuest.email || undefined,
                phone: newGuest.phone || undefined,
                language: newGuest.language,
                side: newGuest.side,
                max_accomp: newGuest.max_accomp,
                invite_type: 'full' // Default según regla de negocio
            });

            // Recargamos la lista para mostrar el nuevo intregante (y su ID real)
            await fetchGuests();
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error("Error creando invitado:", err);
            alert("Error al crear invitado. Revisa si el email/teléfono ya existe.");
        }
    };

    // --- Funcionalidad de Eliminación (Delete) ---

    // Prepara el invitado para borrar y abre confirmación
    const handleOpenDeleteModal = (guest: Guest) => {
        setGuestToDelete(guest);
        setIsDeleteModalOpen(true);
    };

    // Confirma y ejecuta el borrado real
    const handleDeleteGuest = async () => {
        if (!guestToDelete) return;

        try {
            await adminService.deleteGuest(guestToDelete.id);
            // Actualización optimista o recarga
            setGuests(guests.filter(g => g.id !== guestToDelete.id));
            setIsDeleteModalOpen(false);
            setGuestToDelete(null);
        } catch (err) {
            console.error("Error eliminando invitado:", err);
            alert("No se pudo eliminar el invitado.");
        }
    };

    // Helper para mostrar estado
    const getStatusParams = (g: Guest) => {
        if (g.confirmed === true) return { label: 'Confirmado', bg: '#dcfce7', color: '#166534' };
        if (g.confirmed === false) return { label: 'No asiste', bg: '#fee2e2', color: '#991b1b' };
        return { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e' };
    };

    return (
        <AdminLayout currentPage="guests">
            <div className="admin-page-header">
                <h2 className="admin-page-title">Listado de invitados</h2>
                <div className="admin-page-header__actions">
                    <Button variant="secondary" onClick={handleExport}>
                        Exportar CSV
                    </Button>
                    <Button variant="secondary" onClick={handleImport}>
                        Importar
                    </Button>
                    <Button onClick={handleOpenCreateModal}>
                        Añadir nuevo invitado
                    </Button>
                </div>
            </div>

            <Card>
                <div className="mb-4">
                     <FormField
                        label="Buscar invitado"
                        id="search-guests"
                        placeholder="Nombre, email o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                </div>

                {error && <Alert message={error} variant="danger" />}
                
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader />
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr className="data-table__header-row">
                                    <th className="data-table__header-cell">Invitado</th>
                                    <th className="data-table__header-cell">Estado RSVP</th>
                                    <th className="data-table__header-cell">Max. Acomp</th>
                                    <th className="data-table__header-cell">Confirmados</th>
                                    <th className="data-table__header-cell">Alergias</th>
                                    <th className="data-table__header-cell text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guests.length > 0 ? (
                                    guests.map((guest) => {
                                        const status = getStatusParams(guest);
                                        // Cálculo simple de confirmados totales
                                        const confirmedCount = (guest.num_adults || 0) + (guest.num_children || 0);
                                        
                                        return (
                                            <tr key={guest.id} className="data-table__body-row">
                                                <td className="data-table__body-cell data-table__body-cell--name">
                                                    {guest.full_name}
                                                    <div className="text-xs text-gray-500">{guest.email || guest.phone}</div>
                                                </td>
                                                <td className="data-table__body-cell">
                                                    <span style={{ 
                                                        padding: '0.25rem 0.5rem', 
                                                        borderRadius: '4px', 
                                                        fontSize: '0.85rem',
                                                        backgroundColor: status.bg,
                                                        color: status.color
                                                    }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="data-table__body-cell">{guest.max_accomp}</td>
                                                <td className="data-table__body-cell">{confirmedCount > 0 ? confirmedCount : '-'}</td>
                                                <td className="data-table__body-cell">{guest.allergies || '-'}</td>
                                                <td className="data-table__body-cell text-right">
                                                    <button 
                                                        onClick={() => handleOpenDeleteModal(guest)}
                                                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="data-table__body-cell text-center">
                                            No se encontraron invitados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal de Creación */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">Nuevo Invitado</h3>
                        </div>
                        <div className="p-6">
                            <form id="create-guest-form" onSubmit={handleCreateGuest} className="space-y-4">
                                <FormField
                                    label="Nombre Completo"
                                    id="new-name"
                                    value={newGuest.full_name}
                                    onChange={(e) => setNewGuest({...newGuest, full_name: e.target.value})}
                                    required
                                />
                                <FormField
                                    label="Email"
                                    id="new-email"
                                    type="email"
                                    value={newGuest.email}
                                    onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                                />
                                <FormField
                                    label="Teléfono"
                                    id="new-phone"
                                    type="tel"
                                    value={newGuest.phone}
                                    onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                                />
                                
                                <div className="form-field">
                                    <label htmlFor="new-lang" className="form-field__label">Idioma Preferido</label>
                                    <select 
                                        id="new-lang"
                                        className="input"
                                        value={newGuest.language}
                                        onChange={(e) => setNewGuest({...newGuest, language: e.target.value})}
                                    >
                                        <option value="es">Español (ES)</option>
                                        <option value="en">Inglés (EN)</option>
                                        <option value="ro">Rumano (RO)</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="new-side" className="form-field__label">Lado de la boda</label>
                                    <select 
                                        id="new-side"
                                        className="input"
                                        value={newGuest.side}
                                        onChange={(e) => setNewGuest({...newGuest, side: e.target.value})}
                                    >
                                        <option value="bride">Novia</option>
                                        <option value="groom">Novio</option>
                                    </select>
                                </div>

                                <FormField
                                    label="Máx. Acompañantes"
                                    id="new-max-accomp"
                                    type="number"
                                    min={0}
                                    value={newGuest.max_accomp}
                                    onChange={(e) => setNewGuest({...newGuest, max_accomp: parseInt(e.target.value) || 0})}
                                />
                            </form>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
                            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" form="create-guest-form">
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Eliminación */}
            {isDeleteModalOpen && guestToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
                         <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar invitado?</h3>
                         <p className="text-gray-600 mb-6">
                            ¿Seguro que quieres eliminar a <strong>{guestToDelete.full_name}</strong>? 
                            Esta acción no se puede deshacer.
                         </p>
                         <div className="flex justify-center gap-3">
                            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleDeleteGuest} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
                                Eliminar
                            </Button>
                         </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminGuestsPage;
