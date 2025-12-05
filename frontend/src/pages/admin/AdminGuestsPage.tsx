// File: frontend/src/pages/admin/AdminGuestsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Gestión del listado de invitados (CRUD) (Versión Mock Tarea 4).
// Rol: Muestra tabla de invitados, permite "crear" y "eliminar" visualmente
//      usando estado local para simular la persistencia durante la sesión.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Card, Button, AdminLayout, FormField } from '@/components/common';

// ─────────────────────────────────────────────────────────────────────────────
// Definiciones de Tipos
// ─────────────────────────────────────────────────────────────────────────────

interface Guest {
    id: number;
    name: string;
    rsvpStatus: string;
    companions: number;
    children: number;
    allergies: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: AdminGuestsPage
// ─────────────────────────────────────────────────────────────────────────────
const AdminGuestsPage: React.FC = () => {
    // -------------------------------------------------------------------------
    // Estado Mock e Inicialización
    // -------------------------------------------------------------------------
    
    // Lista local de invitados para simular persistencia durante la sesión
    const [guests, setGuests] = useState<Guest[]>([
        { id: 1, name: 'Juan Pérez', rsvpStatus: 'Confirmado', companions: 1, children: 0, allergies: 'Ninguna' },
        { id: 2, name: 'María García', rsvpStatus: 'Pendiente', companions: 0, children: 0, allergies: '-' },
        { id: 3, name: 'Carlos López', rsvpStatus: 'No asiste', companions: 0, children: 0, allergies: '-' },
        { id: 4, name: 'Ana Martínez', rsvpStatus: 'Confirmado', companions: 2, children: 1, allergies: 'Gluten' },
        { id: 5, name: 'Luis Rodríguez', rsvpStatus: 'Confirmado', companions: 1, children: 2, allergies: 'Nueces' },
        { id: 6, name: 'Sofía Hernández', rsvpStatus: 'Pendiente', companions: 0, children: 0, allergies: '-' },
        { id: 7, name: 'Miguel Ángel', rsvpStatus: 'Confirmado', companions: 0, children: 0, allergies: 'Mariscos' },
        { id: 8, name: 'Lucía Díaz', rsvpStatus: 'No asiste', companions: 0, children: 0, allergies: '-' },
    ]);

    const [searchTerm, setSearchTerm] = useState('');

    // Control de visibilidad de Modales
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Estado transitorio para operaciones
    const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
    const [newGuest, setNewGuest] = useState({
        name: '',
        email: '',
        phone: '',
        language: 'ES',
        side: 'Novia',
        max_companions: 0
    });

    // Lógica de filtrado en cliente
    const filteredGuests = guests.filter(guest =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // -------------------------------------------------------------------------
    // Manejadores de Eventos (Actions)
    // -------------------------------------------------------------------------

    const handleImport = () => {
        console.log("Simulando importación de invitados...");
    };

    const handleExport = () => {
        console.log("Simulando exportación de invitados...");
    };

    // --- Funcionalidad de Creación (Create) ---
    
    // Abre el modal y resetea el formulario
    const handleOpenCreateModal = () => {
        setNewGuest({
            name: '',
            email: '',
            phone: '',
            language: 'ES',
            side: 'Novia',
            max_companions: 0
        });
        setIsCreateModalOpen(true);
    };

    // Procesa la creación mock del invitado
    const handleCreateGuest = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Log para depuración/demostración del payload mock
        console.log("POST /api/admin/guests (Simulado) con payload", newGuest);

        // Generación de ID y objeto mock
        const newId = Math.max(...guests.map(g => g.id), 0) + 1;
        const mockGuestEntry: Guest = {
            id: newId,
            name: newGuest.name,
            rsvpStatus: 'Pendiente', // Estado inicial por defecto
            companions: 0,
            children: 0,
            allergies: '-'
        };

        // Actualización optimista del estado local
        setGuests([...guests, mockGuestEntry]);
        setIsCreateModalOpen(false);
    };

    // --- Funcionalidad de Eliminación (Delete) ---

    // Prepara el invitado para borrar y abre confirmación
    const handleOpenDeleteModal = (guest: Guest) => {
        setGuestToDelete(guest);
        setIsDeleteModalOpen(true);
    };

    // Confirma y ejecuta el borrado mock
    const handleDeleteGuest = () => {
        if (!guestToDelete) return;

        console.log("DELETE /api/admin/guests/{id} (Simulado) - ID:", guestToDelete.id);

        // Filtrado de la lista local para remover el item
        setGuests(guests.filter(g => g.id !== guestToDelete.id));
        setIsDeleteModalOpen(false);
        setGuestToDelete(null);
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
                        placeholder="Nombre del invitado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr className="data-table__header-row">
                                <th className="data-table__header-cell">Invitado</th>
                                <th className="data-table__header-cell">Estado RSVP</th>
                                <th className="data-table__header-cell">Acompañantes</th>
                                <th className="data-table__header-cell">Niños</th>
                                <th className="data-table__header-cell">Alergias / Dietas</th>
                                <th className="data-table__header-cell text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGuests.length > 0 ? (
                                filteredGuests.map((guest) => (
                                    <tr key={guest.id} className="data-table__body-row">
                                        <td className="data-table__body-cell data-table__body-cell--name">{guest.name}</td>
                                        <td className="data-table__body-cell">
                                            {/* Badge visual simple basado en estado */}
                                            <span style={{ 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '4px', 
                                                fontSize: '0.85rem',
                                                backgroundColor: guest.rsvpStatus === 'Confirmado' ? '#dcfce7' : guest.rsvpStatus === 'No asiste' ? '#fee2e2' : '#fef9c3',
                                                color: guest.rsvpStatus === 'Confirmado' ? '#166534' : guest.rsvpStatus === 'No asiste' ? '#991b1b' : '#854d0e'
                                            }}>
                                                {guest.rsvpStatus}
                                            </span>
                                        </td>
                                        <td className="data-table__body-cell">{guest.companions}</td>
                                        <td className="data-table__body-cell">{guest.children}</td>
                                        <td className="data-table__body-cell">{guest.allergies}</td>
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
                                ))
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
                                    value={newGuest.name}
                                    onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
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
                                
                                {/* Selects estilizados iguales a FormField */}
                                <div className="form-field">
                                    <label htmlFor="new-lang" className="form-field__label">Idioma Preferido</label>
                                    <select 
                                        id="new-lang"
                                        className="input"
                                        value={newGuest.language}
                                        onChange={(e) => setNewGuest({...newGuest, language: e.target.value})}
                                    >
                                        <option value="ES">Español (ES)</option>
                                        <option value="EN">Inglés (EN)</option>
                                        <option value="RO">Rumano (RO)</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="new-side" className="form-field__label">Lado de la boda</label>
                                    <select 
                                        id="new-side"
                                        className="input"
                                        value={newGuest.side}
                                        onChange={(e) => setNewGuest({...newGuest, side: e.target.value as any})}
                                    >
                                        <option value="Novia">Novia</option>
                                        <option value="Novio">Novio</option>
                                    </select>
                                </div>

                                <FormField
                                    label="Máx. Acompañantes"
                                    id="new-max-accomp"
                                    type="number"
                                    min={0}
                                    value={newGuest.max_companions}
                                    onChange={(e) => setNewGuest({...newGuest, max_companions: parseInt(e.target.value) || 0})}
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
                            ¿Seguro que quieres eliminar a <strong>{guestToDelete.name}</strong>? 
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
