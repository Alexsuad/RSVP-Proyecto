
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
import { Card, AdminLayout, Button, Loader } from '@/components/common';

// -----------------------------------------------------------------------------
// Definiciones: Interfaces y Mocks
// -----------------------------------------------------------------------------

interface KpiData {
    total: number;
    responses: number;
    confirmed: number;
    pending: number;
    notAttending: number;
    companions: number;
    children: number;
    allergies: number;
}

// Datos Mock estáticos (Separados para fácil reemplazo futuro)
const MOCK_KPI_DATA: KpiData = {
    total: 150,
    responses: 127,
    confirmed: 85,
    pending: 42,
    notAttending: 15,
    companions: 20,
    children: 5,
    allergies: 3,
};

// -----------------------------------------------------------------------------
// Componente Principal
// -----------------------------------------------------------------------------

const AdminDashboardPage: React.FC = () => {
    // Estado local para permitir carga asíncrona futura
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Efecto de carga (Simulado por ahora)
    useEffect(() => {
        // TODO: Reemplazar con llamada real a API cuando exista (ej. adminService.getStats())
        const loadStats = async () => {
            setLoading(true);
            // Simulamos delay de red
            await new Promise(resolve => setTimeout(resolve, 500));
            setKpiData(MOCK_KPI_DATA);
            setLoading(false);
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

    // Fallback seguro si data es null
    const data = kpiData || MOCK_KPI_DATA;

    return (
        <AdminLayout currentPage="dashboard">
            <h2 className="admin-page-title">Resumen general de invitados</h2>
            
            <div className="kpi-grid">
                <KpiCard 
                    title="Invitados totales" 
                    value={data.total} 
                    subtext="Lista completa"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Respuestas recibidas"
                    value={data.responses}
                    subtext="Han contestado Sí o No"
                    colorClass="kpi-value--neutral"
                />
                <KpiCard 
                    title="Asistentes confirmados" 
                    value={data.confirmed} 
                    subtext="Han dicho SÍ"
                    colorClass="kpi-value--confirmed" 
                />
                <KpiCard 
                    title="Pendientes de respuesta" 
                    value={data.pending} 
                    subtext="Sin contestar"
                    colorClass="kpi-value--pending" 
                />
                <KpiCard 
                    title="No asisten" 
                    value={data.notAttending} 
                    subtext="Han dicho NO"
                    colorClass="kpi-value--no" 
                />
                <KpiCard 
                    title="Acompañantes" 
                    value={data.companions} 
                    subtext="Extras (+1)"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Niños" 
                    value={data.children} 
                    subtext="Menores de edad"
                    colorClass="kpi-value--neutral" 
                />
                <KpiCard 
                    title="Alergias / Dietas" 
                    value={data.allergies} 
                    subtext="Requieren atención"
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
