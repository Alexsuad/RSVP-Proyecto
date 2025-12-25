// File: frontend/src/pages/admin/AdminGuestsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Propósito: Gestión del listado de invitados (CRUD Real + Import/Export CSV).
// Rol: Muestra tabla de invitados consumiendo /api/admin/guests.
//      Permite buscar, crear, eliminar, importar y exportar invitados.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { Button, AdminLayout, FormField, Loader } from '@/components/common';
import { adminService, Guest as ServiceGuest, CsvImportResult } from '@/services/adminService';

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
    
    // --- Estado para Import CSV ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
            const data = await adminService.getGuests(searchTerm ? { search: searchTerm } : undefined);
            setGuests(data);
        } catch (err) {
            console.error("Error cargando invitados:", err);
            setError("No se pudieron cargar los invitados. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
             fetchGuests();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // -------------------------------------------------------------------------
    // Manejadores de Eventos (Actions)
    // -------------------------------------------------------------------------

    // --- Export CSV: descarga el archivo ---
    const handleExport = async () => {
        try {
            const blob = await adminService.exportGuestsCsv();
            // Crea un enlace temporal para descargar el archivo.
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'guests_export.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exportando CSV:", err);
            alert("Error al exportar el CSV. Verifica tu sesión.");
        }
    };

    // --- Import CSV: abre selector y procesa archivo ---
    const handleImport = () => {
        // Abre el input de archivo oculto.
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        setImportResult(null);

        try {
            const result = await adminService.importGuestsCsv(file);
            setImportResult(result);
            setIsImportModalOpen(true);
            // Refresca la lista de invitados.
            await fetchGuests();
        } catch (err) {
            console.error("Error importando CSV:", err);
            alert("Error al importar el CSV. Verifica el formato del archivo.");
        } finally {
            setImportLoading(false);
            // Limpia el input para permitir reimportar el mismo archivo.
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


    // --- Funcionalidad de Creación (Create) ---
    
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

    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await adminService.createGuest({
                full_name: newGuest.full_name,
                email: newGuest.email || undefined,
                phone: newGuest.phone || undefined,
                language: newGuest.language,
                side: newGuest.side,
                max_accomp: newGuest.max_accomp,
                invite_type: 'full' 
            });

            await fetchGuests();
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error("Error creando invitado:", err);
            alert("Error al crear invitado. Revisa si el email/teléfono ya existe.");
        }
    };

    // --- Funcionalidad de Eliminación (Delete) ---

    const handleOpenDeleteModal = (guest: Guest) => {
        setGuestToDelete(guest);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteGuest = async () => {
        if (!guestToDelete) return;

        try {
            await adminService.deleteGuest(guestToDelete.id);
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
        if (g.confirmed === true) return { label: 'Confirmado', className: 'badge-status badge-status--confirmed' };
        if (g.confirmed === false) return { label: 'No asiste', className: 'badge-status badge-status--declined' };
        return { label: 'Pendiente', className: 'badge-status badge-status--pending' };
    };

    return (
        <AdminLayout currentPage="guests">
            <div className="admin-page-header">
                <div>
                  <h2 className="admin-page-title" style={{ marginBottom: 0 }}>Listado de invitados</h2>
                  <p className="admin-text-muted">Gestiona la lista de asistentes a la boda</p>
                </div>
                <div className="admin-toolbar">
                    <Button className="admin-btn-secondary" onClick={handleExport}>
                        Exportar CSV
                    </Button>
                    <Button className="admin-btn-secondary" onClick={handleImport} disabled={importLoading}>
                        {importLoading ? 'Importando...' : 'Importar'}
                    </Button>
                    <Button className="admin-btn-primary" onClick={handleOpenCreateModal}>
                        Añadir nuevo invitado
                    </Button>
                </div>
                {/* Input oculto para selección de archivo CSV */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileSelected}
                />
            </div>

            <div className="admin-card">
                <div className="admin-toolbar">
                     <FormField
                        label="Buscar invitado"
                        id="search-guests"
                        placeholder="Nombre, email o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '400px', margin: 0 }}
                     />
                </div>

                {error && <div className="admin-alert-error mb-4">{error}</div>}
                
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader />
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Invitado</th>
                                    <th>Estado RSVP</th>
                                    <th>Max. Acomp</th>
                                    <th>Confirmados</th>
                                    <th>Alergias</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guests.length > 0 ? (
                                    guests.map((guest) => {
                                        const status = getStatusParams(guest);
                                        const confirmedCount = (guest.num_adults || 0) + (guest.num_children || 0);
                                        
                                        return (
                                            <tr key={guest.id} className="admin-table-row--striped">
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{guest.full_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{guest.email || guest.phone}</div>
                                                </td>
                                                <td>
                                                    <span className={status.className}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td>{guest.max_accomp}</td>
                                                <td>{confirmedCount > 0 ? confirmedCount : '-'}</td>
                                                <td>{guest.allergies || '-'}</td>
                                                <td className="text-right">
                                                    <button 
                                                        onClick={() => handleOpenDeleteModal(guest)}
                                                        className="admin-link-danger"
                                                        style={{ background: 'none', border: 'none', padding: 0 }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                            No se encontraron invitados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Creación */}
            {isCreateModalOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <h3 className="admin-modal-title">Nuevo Invitado</h3>
                        
                        <form id="create-guest-form" onSubmit={handleCreateGuest} className="space-y-4">
                            <div style={{ marginBottom: '1rem' }}>
                              <FormField
                                  label="Nombre Completo"
                                  id="new-name"
                                  value={newGuest.full_name}
                                  onChange={(e) => setNewGuest({...newGuest, full_name: e.target.value})}
                                  required
                              />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                              <FormField
                                  label="Email"
                                  id="new-email"
                                  type="email"
                                  value={newGuest.email}
                                  onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                              />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                              <FormField
                                  label="Teléfono"
                                  id="new-phone"
                                  type="tel"
                                  value={newGuest.phone}
                                  onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="new-lang" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Idioma Preferido</label>
                                <select 
                                    id="new-lang"
                                    value={newGuest.language}
                                    onChange={(e) => setNewGuest({...newGuest, language: e.target.value})}
                                >
                                    <option value="es">Español (ES)</option>
                                    <option value="en">Inglés (EN)</option>
                                    <option value="ro">Rumano (RO)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="new-side" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Lado de la boda</label>
                                <select 
                                    id="new-side"
                                    value={newGuest.side}
                                    onChange={(e) => setNewGuest({...newGuest, side: e.target.value})}
                                >
                                    <option value="bride">Novia</option>
                                    <option value="groom">Novio</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <FormField
                                    label="Máx. Acompañantes"
                                    id="new-max-accomp"
                                    type="number"
                                    min={0}
                                    value={newGuest.max_accomp}
                                    onChange={(e) => setNewGuest({...newGuest, max_accomp: parseInt(e.target.value) || 0})}
                                />
                            </div>
                        </form>
                        
                        <div className="admin-modal-actions">
                            <Button className="admin-btn-secondary" onClick={() => setIsCreateModalOpen(false)} type="button">
                                Cancelar
                            </Button>
                            <Button className="admin-btn-primary" type="submit" form="create-guest-form">
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Eliminación */}
            {isDeleteModalOpen && guestToDelete && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                         <h3 className="admin-modal-title">¿Eliminar invitado?</h3>
                         <p className="admin-text-muted" style={{ marginBottom: '1.5rem' }}>
                            ¿Seguro que quieres eliminar a <strong>{guestToDelete.full_name}</strong>? 
                            Esta acción no se puede deshacer.
                         </p>
                         <div className="admin-modal-actions">
                            <Button className="admin-btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button className="admin-btn-primary" onClick={handleDeleteGuest} style={{ backgroundColor: '#e53e3e', borderColor: '#e53e3e' }}>
                                Eliminar
                            </Button>
                         </div>
                    </div>
                </div>
            )}

            {/* Modal de Resultados de Importación CSV */}
            {isImportModalOpen && importResult && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <h3 className="admin-modal-title">Resultado de la importación</h3>
                        
                        <div style={{ marginBottom: '1rem' }}>
                            <p><strong>Creados:</strong> {importResult.created_count}</p>
                            <p><strong>Actualizados:</strong> {importResult.updated_count}</p>
                            <p><strong>Rechazados:</strong> {importResult.rejected_count}</p>
                        </div>

                        {importResult.errors.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Errores ({importResult.errors.length}):
                                </h4>
                                <div style={{ 
                                    maxHeight: '150px', 
                                    overflowY: 'auto', 
                                    fontSize: '0.85rem',
                                    backgroundColor: '#fef2f2',
                                    padding: '0.75rem',
                                    borderRadius: '4px'
                                }}>
                                    {importResult.errors.map((err, idx) => (
                                        <div key={idx} style={{ marginBottom: '0.25rem' }}>
                                            <strong>Fila {err.row_number}:</strong> {err.reason}
                                            {err.phone_raw && <span style={{ color: '#666' }}> (tel: {err.phone_raw})</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="admin-modal-actions">
                            <Button className="admin-btn-primary" onClick={() => setIsImportModalOpen(false)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminGuestsPage;
