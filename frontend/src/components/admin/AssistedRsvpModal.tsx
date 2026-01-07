import React, { useState, useEffect } from 'react';
import { Guest, adminService } from '@/services/adminService';
import { Companion } from '@/types';

export const ALLERGEN_LABELS: Record<string, string> = {
    gluten: 'Sin Gluten',
    dairy: 'Sin Lácteos',
    nuts: 'Sin Frutos Secos',
    seafood: 'Sin Mariscos',
    soy: 'Sin Soja',
    eggs: 'Sin Huevo',
    vegan: 'Vegano',
    vegetarian: 'Vegetariano',
    pork: 'Sin Cerdo',
    other: 'Otro'
};

interface AssistedRsvpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (guestId: number, data: any, channel: string) => Promise<void>;
    guest: Guest | null;
}

const AssistedRsvpModal: React.FC<AssistedRsvpModalProps> = ({ isOpen, onClose, onSubmit, guest }) => {
    const [attending, setAttending] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [allergies, setAllergies] = useState('');
    const [notes, setNotes] = useState('');
    const [companions, setCompanions] = useState<Companion[]>([]);
    const [channel, setChannel] = useState('phone'); // Default channel
    
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [metaOptions, setMetaOptions] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false); // Default to Read-Only

    // Inicializar estado al abrir con datos COMPLETOS del servidor
    useEffect(() => {
        const loadDetail = async () => {
            if (guest && isOpen) {
                setIsLoadingDetail(true);
                try {
                    // Cargar detalle completo del backend (incluye companions reales)
                    const [fullGuest, metaResp] = await Promise.all([
                        adminService.getGuestDetail(guest.id),
                        adminService.getMetaOptions().catch(_ => ({ allergens: [] }))
                    ]);
                    
                    if (metaResp.allergens) setMetaOptions(metaResp.allergens);

                    setAttending(fullGuest.confirmed ?? null);
                    setEmail(fullGuest.email || '');
                    setPhone(fullGuest.phone || '');
                    setAllergies(fullGuest.allergies || '');
                    setNotes(fullGuest.notes || '');
                    setChannel('phone'); // Default
                    
                    // Ahora sí tenemos los acompañantes reales
                    setCompanions(fullGuest.companions || []); 
                } catch (error) {
                    console.error("Error cargando detalle:", error);
                    alert("Error cargando detalles del invitado. Verifica tu conexión.");
                    // Fallback seguro: inicializar con lo básico pero companions vacíos es peligroso
                    setAttending(guest.confirmed ?? null);
                    setEmail(guest.email || '');
                    setPhone(guest.phone || '');
                    setCompanions([]); 
                } finally {
                    setIsLoadingDetail(false);
                }
            }
        };
        loadDetail();
    }, [guest, isOpen]);

    // Reset editing mode when modal opens/closes
    useEffect(() => {
        if (isOpen) setIsEditing(false);
    }, [isOpen]);

    if (!isOpen || !guest) return null;

    const handleAddCompanion = () => {
        if (companions.length >= (guest?.max_accomp || 0)) return;
        setCompanions([...companions, { name: '', is_child: false, allergies: '' }]);
    };

    const handleRemoveCompanion = (index: number) => {
        const newCompanions = [...companions];
        newCompanions.splice(index, 1);
        setCompanions(newCompanions);
    };

    const handleCompanionChange = (index: number, field: keyof Companion, value: any) => {
        const newCompanions = [...companions];
        newCompanions[index] = { ...newCompanions[index], [field]: value };
        setCompanions(newCompanions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (attending === null) {
            alert("Selecciona si asiste o no.");
            return;
        }

        setIsLoading(true);
        try {
            // Construir payload compatible con RSVPUpdateRequest
            const payload = {
                attending: attending,
                email: email || undefined,
                phone: phone || undefined,
                allergies: allergies || undefined,
                notes: notes || undefined,
                companions: companions, 
                // needs_accommodation/transport no en form todavía
                needs_accommodation: false, 
                needs_transport: false
            };
            
            await onSubmit(guest.id, payload, channel);
            onClose();
        } catch (err) {
            console.error("Error submitting RSVP:", err);
            // El padre maneja la alerta o aquí?
        } finally {
            setIsLoading(false);
        }
    };

    // Helper para manejo de CSV de alergias
    const toggleAllergen = (currentCsv: string, code: string): string => {
        const current = currentCsv ? currentCsv.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (current.includes(code)) {
            return current.filter(c => c !== code).join(',');
        } else {
            return [...current, code].join(',');
        }
    };

    // Renderizador de Chips
    const renderAllergySelector = (selectedCsv: string, onChange: (newCsv: string) => void) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {metaOptions.map(code => {
                const isSelected = selectedCsv.split(',').map(s => s.trim()).includes(code);
                return (
                    <button
                        key={code}
                        type="button"
                        onClick={() => onChange(toggleAllergen(selectedCsv, code))}
                        style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '16px',
                            border: isSelected ? '1px solid #b8860b' : '1px solid #dcdcdc',
                            backgroundColor: isSelected ? '#fdf8e8' : '#ffffff',
                            color: isSelected ? '#8b7355' : '#666',
                            cursor: 'pointer',
                            fontWeight: isSelected ? 600 : 400
                        }}
                    >
                        {ALLERGEN_LABELS[code] || code}
                    </button>
                );
            })}
        </div>
    );

    // Renderizador Vista de Lectura (Read-Only)
    const renderReadOnlyView = () => (
        <div style={{ padding: '24px', backgroundColor: '#faf8f5', display: isLoadingDetail ? 'none' : 'block' }}>
             {/* Estado General */}
             <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8dcc8', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Asistencia</label>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: attending === true ? '#2e7d32' : (attending === false ? '#c62828' : '#f57c00') }}>
                            {attending === true ? 'CONFIRMADO' : (attending === false ? 'NO ASISTE' : 'PENDIENTE')}
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Tipo Invitación</label>
                        <div>{ guest?.invite_type === 'ceremony' ? 'Solo Ceremonia' : 'Boda Completa' }</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Email</label>
                        <div>{email || '-'}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Teléfono</label>
                        <div>{phone || '-'}</div>
                    </div>
                </div>
                {attending === true && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed #e8dcc8', paddingTop: '12px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Alergias (Titular)</label>
                        {allergies ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {allergies.split(',').map(s => s.trim()).filter(Boolean).map(code => (
                                    <span key={code} style={{ 
                                        backgroundColor: '#fdf8e8', color: '#b8860b', 
                                        padding: '2px 8px', borderRadius: '12px', 
                                        fontSize: '0.75rem', border: '1px solid #e8d9a0' 
                                    }}>
                                        {ALLERGEN_LABELS[code] || code}
                                    </span>
                                ))}
                            </div>
                        ) : <span style={{ color: '#999', fontStyle: 'italic' }}>Ninguna</span>}
                    </div>
                )}
            </div>

            {/* Notas */}
            {notes && (
                <div style={{ padding: '16px', backgroundColor: '#fffbe6', borderRadius: '8px', border: '1px solid #faeec5', marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#b8860b', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Notas / Comentarios</label>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: '#5d4e37' }}>"{notes}"</p>
                </div>
            )}

            {/* Acompañantes */}
            <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#5d4e37', borderBottom: '2px solid #e8dcc8', paddingBottom: '4px', display: 'inline-block' }}>
                    Acompañantes ({companions.length})
                </h4>
                {companions.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: '#999', fontStyle: 'italic' }}>Sin acompañantes registrados.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {companions.map((comp, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '6px' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#333' }}>{comp.name}</div>
                                    {comp.allergies && (
                                         <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {comp.allergies.split(',').map(s => s.trim()).filter(Boolean).map(code => (
                                                <span key={code} style={{ backgroundColor: '#fdf8e8', color: '#b8860b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', border: '1px solid #e8d9a0' }}>
                                                    {ALLERGEN_LABELS[code] || code}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {comp.is_child && (
                                    <span style={{ fontSize: '0.7rem', backgroundColor: '#e0f7fa', color: '#006064', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Niño</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal-content" style={{ maxWidth: '600px', width: '95%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8dcc8', backgroundColor: '#faf6f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#b8860b' }}>
                            {isEditing ? 'Modificar RSVP (Modo Asistido)' : 'Detalle de RSVP'}
                        </h3>
                        <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#8b7355' }}>
                            {isEditing ? 'Editando respuesta para:' : 'Vista resumen para:'} <strong style={{ color: '#5d4e37' }}>{guest.full_name}</strong>
                        </p>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            type="button"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', fontSize: '0.9rem', fontWeight: 600,
                                backgroundColor: '#fff', color: '#b8860b', border: '1px solid #e8d9a0',
                                borderRadius: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                        >
                            ✏️ Modificar
                        </button>
                    )}
                </div>
                
                {/* Body */}
                <form onSubmit={handleSubmit} style={{ maxHeight: '60vh', overflowY: 'auto', opacity: isLoadingDetail ? 0.5 : 1, pointerEvents: isLoadingDetail ? 'none' : 'auto' }}>
                    {isLoadingDetail && <div style={{ textAlign: 'center', padding: '20px', color: '#b8860b' }}>Cargando datos completos...</div>}
                    
                    {!isEditing && !isLoadingDetail && renderReadOnlyView()}

                    {isEditing && (
                        <div style={{ padding: '24px', backgroundColor: '#faf8f5', display: isLoadingDetail ? 'none' : 'block' }}>
                            
                            {/* Canal & Estado - Grid 2 columnas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#5d4e37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Canal de Confirmación</label>
                                    <select 
                                        value={channel} 
                                        onChange={(e) => setChannel(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem', color: '#5d4e37', backgroundColor: '#ffffff' }}
                                    >
                                        <option value="phone">Llamada Telefónica</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="email">Email / Correo</option>
                                        <option value="in_person">En Persona</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#5d4e37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>¿Asiste?</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setAttending(true)}
                                            style={{ 
                                                flex: 1, padding: '10px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s ease',
                                                backgroundColor: attending === true ? '#2e7d32' : '#ffffff',
                                                color: attending === true ? '#ffffff' : '#5d4e37',
                                                border: attending === true ? '2px solid #2e7d32' : '2px solid #e8dcc8'
                                            }}
                                        >
                                            SÍ Asiste
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAttending(false)}
                                            style={{ 
                                                flex: 1, padding: '10px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s ease',
                                                backgroundColor: attending === false ? '#a15c38' : '#ffffff',
                                                color: attending === false ? '#ffffff' : '#5d4e37',
                                                border: attending === false ? '2px solid #a15c38' : '2px solid #e8dcc8'
                                            }}
                                        >
                                            NO Asiste
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {attending && (
                                <>
                                    {/* Contacto */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Email</label>
                                            <input 
                                                type="email" 
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Teléfono</label>
                                            <input 
                                                value={phone} 
                                                onChange={(e) => setPhone(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Detalles */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Alergias / Restricciones</label>
                                        {renderAllergySelector(allergies, setAllergies)}
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5d4e37', marginBottom: '6px' }}>Notas / Comentarios</label>
                                        <textarea 
                                            value={notes} 
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
                                        />
                                    </div>

                                    {/* Acompañantes */}
                                    <div style={{ borderTop: '1px solid #e8dcc8', paddingTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontWeight: 700, color: '#5d4e37', fontSize: '0.9rem' }}>
                                                Acompañantes ({companions.length}/{guest.max_accomp || 0})
                                            </h4>
                                            {companions.length < (guest.max_accomp || 0) && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleAddCompanion}
                                                    style={{ 
                                                        padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
                                                        backgroundColor: '#fdf8e8', color: '#b8860b', border: '1px solid #e8d9a0'
                                                    }}
                                                >
                                                    + Añadir
                                                </button>
                                            )}
                                        </div>
                                        
                                        {companions.length === 0 && <p style={{ fontSize: '0.85rem', color: '#8b7355', fontStyle: 'italic' }}>Sin acompañantes añadidos.</p>}

                                        {companions.map((comp, idx) => (
                                            <div key={idx} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e8dcc8' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b7355', textTransform: 'uppercase' }}>Acompañante #{idx + 1}</span>
                                                    <button type="button" onClick={() => handleRemoveCompanion(idx)} style={{ fontSize: '0.75rem', color: '#a15c38', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                                                    <input 
                                                        placeholder="Nombre completo" 
                                                        value={comp.name} 
                                                        onChange={(e) => handleCompanionChange(idx, 'name', e.target.value)}
                                                        required
                                                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e8dcc8', borderRadius: '6px', fontSize: '0.85rem' }}
                                                    />
                                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#5d4e37', whiteSpace: 'nowrap' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={comp.is_child} 
                                                            onChange={(e) => handleCompanionChange(idx, 'is_child', e.target.checked)}
                                                            style={{ marginRight: '6px' }}
                                                        />
                                                        Es niño/a
                                                    </label>
                                                </div>
                                                <div style={{ marginTop: '10px' }}>
                                                    <input 
                                                        placeholder="Alergias (opcional)" 
                                                        value={comp.allergies || ''} 
                                                        onChange={(e) => handleCompanionChange(idx, 'allergies', e.target.value)}
                                                        style={{ display: 'none' }} 
                                                    />
                                                    <div style={{ fontSize: '0.75rem', color: '#8b7355', marginBottom: '4px' }}>Alergias:</div>
                                                    {renderAllergySelector(comp.allergies || '', (newVal) => handleCompanionChange(idx, 'allergies', newVal))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {!attending && attending !== null && (
                                <div style={{ backgroundColor: '#fdf8e8', border: '1px solid #e8d9a0', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: '#7a6520' }}>
                                    Al marcar como NO Asiste, se limpiarán los acompañantes y preferencias.
                                    Se enviará un correo de notificación al invitado.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #e8dcc8', backgroundColor: '#faf6f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 500, color: '#5d4e37', backgroundColor: '#ffffff', border: '1px solid #c9a86c', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            {isEditing ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {isEditing && (
                            <button 
                                type="submit"
                                disabled={isLoading}
                                style={{ 
                                    padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', 
                                    backgroundColor: isLoading ? '#8b7355' : '#b8860b', 
                                    border: 'none', borderRadius: '6px', cursor: isLoading ? 'wait' : 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}
                            >
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssistedRsvpModal;
