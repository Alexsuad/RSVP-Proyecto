import React, { useEffect, useState } from 'react';
import { Guest, adminService } from '@/services/adminService';
import { ALLERGEN_LABELS } from './AssistedRsvpModal';
import { Companion } from '@/types';

interface GuestDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    guest: Guest | null;
}

const GuestDetailModal: React.FC<GuestDetailModalProps> = ({ isOpen, onClose, guest }) => {
    const [fullGuest, setFullGuest] = useState<(Guest & { companions: Companion[] }) | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            if (guest && isOpen) {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await adminService.getGuestDetail(guest.id);
                    setFullGuest(data);
                } catch (err) {
                    console.error("Error loading guest detail:", err);
                    setError("No se pudo cargar el detalle del invitado.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setFullGuest(null);
            }
        };

        fetchDetail();
    }, [guest, isOpen]);

    if (!isOpen || !guest) return null;

    // Helper para formatear alergias
    const formatAllergies = (csv: string | undefined | null) => {
        if (!csv) return <span style={{ color: '#999', fontStyle: 'italic' }}>Ninguna</span>;
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {csv.split(',').map(s => s.trim()).filter(Boolean).map(code => (
                    <span key={code} style={{ 
                        backgroundColor: '#fdf8e8', color: '#b8860b', 
                        padding: '2px 8px', borderRadius: '12px', 
                        fontSize: '0.75rem', border: '1px solid #e8d9a0' 
                    }}>
                        {ALLERGEN_LABELS[code] || code}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal-content" style={{ maxWidth: '600px', width: '95%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8dcc8', backgroundColor: '#faf6f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#b8860b' }}>Detalle de RSVP</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#8b7355' }}>
                            Vista resumen para: <strong>{guest.full_name}</strong>
                        </p>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#8b7355' }}>×</button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {isLoading && <div style={{ textAlign: 'center', padding: '20px', color: '#b8860b' }}>Cargando información completa...</div>}
                    
                    {error && <div style={{ color: '#d32f2f', textAlign: 'center', padding: '10px' }}>{error}</div>}

                    {!isLoading && !error && fullGuest && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Estado General */}
                            <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8dcc8' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Asistencia</label>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: fullGuest.confirmed === true ? '#2e7d32' : (fullGuest.confirmed === false ? '#c62828' : '#f57c00') }}>
                                            {fullGuest.confirmed === true ? 'CONFIRMADO' : (fullGuest.confirmed === false ? 'NO ASISTE' : 'PENDIENTE')}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Tipo Invitación</label>
                                        <div>{ fullGuest.invite_type === 'ceremony' ? 'Solo Ceremonia' : 'Boda Completa' }</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Email</label>
                                        <div>{fullGuest.email || '-'}</div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700 }}>Teléfono</label>
                                        <div>{fullGuest.phone || '-'}</div>
                                    </div>
                                </div>
                                {fullGuest.confirmed === true && (
                                    <div style={{ marginTop: '12px', borderTop: '1px dashed #e8dcc8', paddingTop: '12px' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#8b7355', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Alergias (Titular)</label>
                                        {formatAllergies(fullGuest.allergies)}
                                    </div>
                                )}
                            </div>

                            {/* Notas */}
                            {fullGuest.notes && (
                                <div style={{ padding: '16px', backgroundColor: '#fffbe6', borderRadius: '8px', border: '1px solid #faeec5' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#b8860b', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Notas / Comentarios</label>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: '#5d4e37' }}>"{fullGuest.notes}"</p>
                                </div>
                            )}

                            {/* Acompañantes */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#5d4e37', borderBottom: '2px solid #e8dcc8', paddingBottom: '4px', display: 'inline-block' }}>
                                    Acompañantes ({fullGuest.companions.length})
                                </h4>
                                {fullGuest.companions.length === 0 ? (
                                    <p style={{ fontSize: '0.9rem', color: '#999', fontStyle: 'italic' }}>Sin acompañantes registrados.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {fullGuest.companions.map((comp, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '6px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#333' }}>{comp.name}</div>
                                                    {comp.allergies && (
                                                        <div style={{ marginTop: '4px' }}>{formatAllergies(comp.allergies)}</div>
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
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', backgroundColor: '#faf6f0', borderTop: '1px solid #e8dcc8', textAlign: 'right' }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '8px 16px', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: '#b8860b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestDetailModal;
