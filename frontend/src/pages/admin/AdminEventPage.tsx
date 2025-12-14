
import React, { useState } from 'react';
import { AdminLayout, FormField } from '@/components/common';
import '@/styles/admin.css';

const AdminEventPage: React.FC = () => {
    // Estado local para los campos del formulario
    const [eventData, setEventData] = useState({
        nombreEvento: 'Boda de Daniela y Cristian',
        fechaEvento: '2025-08-23',
        ciudad: 'Bucarest, Rumanía',
        lugarRecepcion: 'Palacio Snagov',
        mensajeBienvenida: '¡Nos casamos! Queremos compartir este día tan especial con vosotros.',
        mensajeDresscode: 'Etiqueta formal / Black Tie Optional',
        mensajeNinos: 'Adoramos a vuestros peques, pero este evento será solo para adultos.',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setEventData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    return (
        <AdminLayout currentPage="event">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title" style={{ marginBottom: 0 }}>Configuración del evento</h2>
                    <p className="admin-text-muted">Personaliza la información que verán tus invitados</p>
                </div>
                <div className="admin-page-header__actions">
                    {/* Botón de guardar simulado */}
                    <button className="admin-btn-primary">Guardar Cambios</button>
                </div>
            </div>
            
            <div className="admin-grid">
                {/* Columna Izquierda: Formulario */}
                <div>
                    <div className="admin-card">
                        <h3 className="admin-section-title">Datos del evento</h3>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <FormField 
                                    id="nombreEvento"
                                    label="Nombre del evento"
                                    value={eventData.nombreEvento}
                                    onChange={handleChange}
                                    placeholder="Ej: Boda de Alex y Ruxandra"
                                />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <FormField 
                                    id="fechaEvento"
                                    label="Fecha del evento"
                                    type="date"
                                    value={eventData.fechaEvento}
                                    onChange={handleChange}
                                />
                                <FormField 
                                    id="ciudad"
                                    label="Ciudad / Lugar"
                                    value={eventData.ciudad}
                                    onChange={handleChange}
                                    placeholder="Ej: Bucarest, Rumanía"
                                />
                            </div>

                            <div>
                                <FormField 
                                    id="lugarRecepcion"
                                    label="Lugar de recepción"
                                    value={eventData.lugarRecepcion}
                                    onChange={handleChange}
                                    placeholder="Ej: Salón Terra Events"
                                />
                            </div>

                            <div>
                                <FormField 
                                    id="mensajeBienvenida"
                                    label="Mensaje de bienvenida"
                                    as="textarea"
                                    rows={3}
                                    value={eventData.mensajeBienvenida}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <FormField 
                                    id="mensajeDresscode"
                                    label="Dress code / recomendaciones"
                                    as="textarea"
                                    rows={2}
                                    value={eventData.mensajeDresscode}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div>
                                <FormField 
                                    id="mensajeNinos"
                                    label="Información sobre niñas y niños"
                                    as="textarea"
                                    rows={2}
                                    value={eventData.mensajeNinos}
                                    onChange={handleChange}
                                />
                            </div>
                        </form>
                    </div>
                </div>

                {/* Columna Derecha: Vista Previa */}
                <div>
                    <div className="admin-card" style={{ position: 'sticky', top: '1rem' }}>
                        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                            <h3 className="admin-text-muted" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', fontWeight: 600 }}>Vista previa para invitados</h3>
                        </div>
                        
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2rem', backgroundColor: '#fafafa' }}>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--color-admin-primary)', textAlign: 'center', marginBottom: '0.5rem' }}>
                                {eventData.nombreEvento || 'Nombre del Evento'}
                            </h1>
                            
                            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                <span>{eventData.fechaEvento || 'Fecha'}</span>
                                <span>•</span>
                                <span>{eventData.ciudad || 'Ciudad'}</span>
                            </div>

                            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <p style={{ fontWeight: 600, color: '#444', marginBottom: '0.25rem' }}>Recepción:</p>
                                <p style={{ color: '#666' }}>{eventData.lugarRecepcion || 'Lugar de la recepción'}</p>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <p style={{ fontStyle: 'italic', textAlign: 'center', color: '#555', lineHeight: '1.6' }}>
                                    "{eventData.mensajeBienvenida || 'Mensaje de bienvenida...'}"
                                </p>
                            </div>

                            {(eventData.mensajeDresscode || eventData.mensajeNinos) && (
                                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                                    {eventData.mensajeDresscode && (
                                        <div>
                                            <span style={{ fontWeight: 600, color: '#444' }}>Dress Code:</span>
                                            <p style={{ color: '#666', marginTop: '0.25rem' }}>{eventData.mensajeDresscode}</p>
                                        </div>
                                    )}
                                    {eventData.mensajeNinos && (
                                        <div>
                                            <span style={{ fontWeight: 600, color: '#444' }}>Niños:</span>
                                            <p style={{ color: '#666', marginTop: '0.25rem' }}>{eventData.mensajeNinos}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminEventPage;
