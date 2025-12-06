
// =============================================================================
// Archivo: AdminDashboardPage.tsx
// -----------------------------------------------------------------------------
// Propósito: Vista principal del dashboard con métricas clave (KPIs).
// Rol:
//   - Muestra resumenes de asistencia, pendientes, etc.
//   - Provee accesos directos a secciones clave.
// Estado:
//   - Actualmente usa DATOS MOCK (MOCK_KPI_DATA).
//   - Preparado para futura integración con endpoint /api/admin/stats.
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
            
            <div className="kpi-grid">
                <KpiCard 
                    title="Invitados totales" 
                    value={data.total_guests} 
                    subtext="Lista completa"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Respuestas recibidas"
                    value={data.responses_received}
                    subtext="Han contestado Sí o No"
                    colorClass="kpi-value--neutral"
                />
                <KpiCard 
                    title="Asistentes confirmados" 
                    value={data.confirmed_attendees} 
                    subtext="Han dicho SÍ"
                    colorClass="kpi-value--confirmed" 
                />
                <KpiCard 
                    title="Pendientes de respuesta" 
                    value={data.pending_rsvp} 
                    subtext="Sin contestar"
                    colorClass="kpi-value--pending" 
                />
                <KpiCard 
                    title="No asisten" 
                    value={data.not_attending} 
                    subtext="Han dicho NO"
                    colorClass="kpi-value--no" 
                />
                <KpiCard 
                    title="Personas Totales" 
                    value={data.total_companions} 
                    subtext="Confirmados (Adultos + Niños)"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Niños" 
                    value={data.total_children} 
                    subtext="Menores confirmados"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Alergias / Dietas" 
                    value={data.guests_with_allergies} 
                    subtext="Registros con alergias"
                    colorClass="kpi-value--warning" 
                />
            </div>

            <div className="dashboard-actions">
                <h3 className="dashboard-actions__title">Acciones rápidas</h3>
                <div className="dashboard-actions__grid">
                    <Button 
                        variant="primary" 
                        onClick={() => window.location.href = '/admin/guests.html'}
                    >
                        Ver listado detallado de invitados
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={handleExport}
                    >
                        Exportar datos (CSV/Excel)
                    </Button>
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
    colorClass: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtext, colorClass }) => (
    <Card className="kpi-card">
        <h3 className="kpi-title">{title}</h3>
        <p className={`kpi-value ${colorClass}`}>{value}</p>
        <p className="kpi-subtext">{subtext}</p>
    </Card>
);

export default AdminDashboardPage;
