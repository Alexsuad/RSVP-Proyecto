
import React, { useState } from 'react';
import { Card, AdminLayout, FormField } from '@/components/common';

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
            <h2 className="admin-page-title">Configuración del evento</h2>
            
            <div className="admin-grid">
                {/* Columna Izquierda: Formulario */}
                <div className="admin-grid__col">
                    <Card>
                        <h3 className="card-title mb-4">Datos del evento</h3>
                        <form className="space-y-4">
                            <FormField 
                                id="nombreEvento"
                                label="Nombre del evento"
                                value={eventData.nombreEvento}
                                onChange={handleChange}
                                placeholder="Ej: Boda de Alex y Ruxandra"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <FormField 
                                id="lugarRecepcion"
                                label="Lugar de recepción"
                                value={eventData.lugarRecepcion}
                                onChange={handleChange}
                                placeholder="Ej: Salón Terra Events"
                            />
                            <FormField 
                                id="mensajeBienvenida"
                                label="Mensaje de bienvenida"
                                as="textarea"
                                rows={3}
                                value={eventData.mensajeBienvenida}
                                onChange={handleChange}
                            />
                            <FormField 
                                id="mensajeDresscode"
                                label="Dress code / recomendaciones"
                                as="textarea"
                                rows={2}
                                value={eventData.mensajeDresscode}
                                onChange={handleChange}
                            />
                            <FormField 
                                id="mensajeNinos"
                                label="Información sobre niñas y niños"
                                as="textarea"
                                rows={2}
                                value={eventData.mensajeNinos}
                                onChange={handleChange}
                            />
                        </form>
                    </Card>
                </div>

                {/* Columna Derecha: Vista Previa */}
                <div className="admin-grid__col">
                    <Card className="preview-card sticky top-4">
                        <h3 className="card-title mb-4 text-gray-500 text-sm uppercase tracking-wider">Vista previa para los invitados</h3>
                        
                        <div className="preview-content border rounded-lg p-6 bg-gray-50">
                            <h1 className="text-2xl font-serif text-center mb-2 text-gray-800">
                                {eventData.nombreEvento || 'Nombre del Evento'}
                            </h1>
                            
                            <div className="text-center text-gray-600 mb-6 flex justify-center gap-2 text-sm uppercase tracking-wide">
                                <span>{eventData.fechaEvento || 'Fecha'}</span>
                                <span>•</span>
                                <span>{eventData.ciudad || 'Ciudad'}</span>
                            </div>

                            <div className="mb-6 text-center">
                                <p className="font-semibold text-gray-700">Recepción:</p>
                                <p className="text-gray-600">{eventData.lugarRecepcion || 'Lugar de la recepción'}</p>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-700 italic text-center leading-relaxed">
                                    "{eventData.mensajeBienvenida || 'Mensaje de bienvenida...'}"
                                </p>
                            </div>

                            {(eventData.mensajeDresscode || eventData.mensajeNinos) && (
                                <div className="border-t pt-4 mt-4 space-y-3 text-sm">
                                    {eventData.mensajeDresscode && (
                                        <div>
                                            <span className="font-semibold text-gray-700">Dress Code:</span>
                                            <p className="text-gray-600">{eventData.mensajeDresscode}</p>
                                        </div>
                                    )}
                                    {eventData.mensajeNinos && (
                                        <div>
                                            <span className="font-semibold text-gray-700">Niños:</span>
                                            <p className="text-gray-600">{eventData.mensajeNinos}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminEventPage;
