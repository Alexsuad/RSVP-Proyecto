
// =============================================================================
// Archivo: AdminDashboardPage.tsx
// -----------------------------------------------------------------------------
// Propósito: Vista principal del dashboard con métricas clave (KPIs).
// Rol:
//   - Muestra resumenes de asistencia, pendientes, etc.
//   - Provee accesos directos a secciones clave.
// Estado:
//   - Obtiene KPIs reales desde /api/admin/stats usando adminService.getStats().
//   - Muestra alerta de error si falla la carga.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Card, AdminLayout, Button, Loader, Alert } from '@/components/common';
import { adminService, AdminStatsResponse } from '@/services/adminService';

// -----------------------------------------------------------------------------
// Componente Principal
// -----------------------------------------------------------------------------

const AdminDashboardPage: React.FC = () => {
    // Estado local de métricas
    const [kpiData, setKpiData] = useState<AdminStatsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Efecto de carga
    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await adminService.getStats();
                setKpiData(data);
            } catch (err) {
                console.error("Error cargando estadísticas:", err);
                setError("Error al cargar métricas. Intente recargar.");
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);
    
    const handleExport = () => {
        console.log("Acción de exportar pendiente de implementación.");
    };

    if (loading) {
        return (
            <AdminLayout currentPage="dashboard">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <Loader />
                </div>
            </AdminLayout>
        );
    }
    
    if (error) {
         return (
            <AdminLayout currentPage="dashboard">
                <div className="p-4">
                    <Alert message={error} variant="danger" />
                    <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
                        Reintentar
                    </Button>
                </div>
            </AdminLayout>
         );
    }

    // Si no hay datos (y no cargando/error), mostramos estado vacío seguro
    // Mapeamos a la vista
    const data = kpiData || {
        total_guests: 0,
        responses_received: 0,
        confirmed_attendees: 0,
        pending_rsvp: 0,
        not_attending: 0,
        total_companions: 0,
        total_children: 0,
        guests_with_allergies: 0
    };

    return (
        <AdminLayout currentPage="dashboard">
            <h2 className="admin-page-title">Resumen general de invitados</h2>
            
            <div className="admin-grid-kpi">
                <KpiCard 
                    title="Invitados totales" 
                    value={data.total_guests} 
                    subtext="Lista completa"
                />
                <KpiCard 
                    title="Respuestas recibidas"
                    value={data.responses_received}
                    subtext="Han contestado Sí o No"
                />
                <KpiCard 
                    title="Asistentes confirmados" 
                    value={data.confirmed_attendees} 
                    subtext="Han dicho SÍ"
                    status="confirmed"
                />
                <KpiCard 
                    title="Pendientes de respuesta" 
                    value={data.pending_rsvp} 
                    subtext="Sin contestar"
                    status="pending"
                />
                <KpiCard 
                    title="No asisten" 
                    value={data.not_attending} 
                    subtext="Han dicho NO"
                    status="declined"
                />
                <KpiCard 
                    title="Personas Totales" 
                    value={data.total_companions} 
                    subtext="Confirmados (Adultos + Niños)"
                />
                <KpiCard 
                    title="Niños" 
                    value={data.total_children} 
                    subtext="Menores confirmados"
                />
                <KpiCard 
                    title="Alergias / Dietas" 
                    value={data.guests_with_allergies} 
                    subtext="Registros con alergias"
                    status="warning"
                />
            </div>

            <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="admin-section-title" style={{ marginBottom: '0.5rem' }}>Acciones rápidas</h3>
                        <p className="admin-text-muted">Accesos directos a las funciones más usadas</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button 
                            className="admin-btn-primary"
                            onClick={() => window.location.href = '/admin/guests.html'}
                        >
                            Ver listado detallado
                        </Button>
                        <Button 
                            className="admin-btn-secondary"
                            onClick={handleExport}
                        >
                            Exportar datos
                        </Button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

// -----------------------------------------------------------------------------
// Subcomponentes
// -----------------------------------------------------------------------------

interface KpiCardProps {
    title: string;
    value: number;
    subtext: string;
    status?: 'confirmed' | 'pending' | 'declined' | 'warning' | 'neutral';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtext, status = 'neutral' }) => {
    let colorClass = '';
    
    // Mapeo simple de status a colores de texto según CSS nuevo o existente
    // En admin.css definimos .admin-kpi-value pero no modificadores de color específicos en texto allí,
    // salvo que los añadamos. Usaremos estilos inline o clases auxiliares si es necesario.
    // Revisando admin.css, no pusimos modificadores de color en .admin-kpi-value.
    // Usaremos las clases de utilidad de texto si existen, o definimos color dinámico.
    
    const getColor = () => {
        switch(status) {
            case 'confirmed': return '#03543f';
            case 'pending': return '#723b13';
            case 'declined': return '#9b1c1c';
            case 'warning': return '#c53030';
            default: return 'var(--color-admin-primary)';
        }
    }

    return (
        <div className="admin-card admin-kpi-card" style={{ marginBottom: 0 }}>
            <h3 className="admin-kpi-label">{title}</h3>
            <p className="admin-kpi-value" style={{ color: getColor() }}>{value}</p>
            <p className="admin-text-muted" style={{ fontSize: '0.75rem' }}>{subtext}</p>
        </div>
    );
};

export default AdminDashboardPage;
