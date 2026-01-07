
// =============================================================================
// Archivo: AdminDashboardPage.tsx
// -----------------------------------------------------------------------------
// Propósito: Vista principal del dashboard con métricas clave (KPIs).
// Rol:
//   - Muestra Progress Bar de respuestas, Countdown, y KPIs visuales.
//   - Provee accesos directos accionables a secciones clave.
// Estado:
//   - Obtiene KPIs reales desde /api/admin/stats usando adminService.getStats().
//   - Estilos inline para renderizado consistente.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { AdminLayout, Loader, Alert } from '@/components/common';
import { adminService, AdminStatsResponse, RecentActivityItem } from '@/services/adminService';

// -----------------------------------------------------------------------------
// Configuración del Evento (TODO: Mover a backend/config)
// -----------------------------------------------------------------------------
const EVENT_DATE = new Date('2026-06-15'); // Fecha de la boda (Corregido)

// Helper: Calcular tiempo relativo (hace X horas/minutos)
const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays === 1) return 'ayer';
    return `hace ${diffDays} días`;
};

// Helper: Traducción de alergias comunes (Inglés DB -> Español UI)
const translateAllergy = (key: string): string => {
    const map: Record<string, string> = {
        'dairy': 'Lácteos',
        'seafood': 'Mariscos',
        'shellfish': 'Mariscos',
        'eggs': 'Huevos',
        'nuts': 'Frutos Secos',
        'peanuts': 'Cacahuetes',
        'gluten': 'Gluten',
        'soy': 'Soja',
        'wheat': 'Trigo',
        'vegan': 'Vegano',
        'vegetarian': 'Vegetariano',
        'none': 'Ninguna'
    };
    const lowerKey = key.toLowerCase().trim();
    return map[lowerKey] || (key.charAt(0).toUpperCase() + key.slice(1));
};

// -----------------------------------------------------------------------------
// Componente Principal
// -----------------------------------------------------------------------------

const AdminDashboardPage: React.FC = () => {
    const [kpiData, setKpiData] = useState<AdminStatsResponse | null>(null);
    const [activity, setActivity] = useState<RecentActivityItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const [statsData, activityData] = await Promise.all([
                    adminService.getStats(),
                    adminService.getActivity(5)
                ]);
                setKpiData(statsData);
                setActivity(activityData.items || []);
            } catch (err) {
                console.error("Error cargando estadísticas:", err);
                setError("Error al cargar métricas. Intente recargar.");
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    // Calcular días restantes para la boda
    const getDaysRemaining = (): number => {
        const today = new Date();
        const diffTime = EVENT_DATE.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleExport = async () => {
        try {
            const blob = await adminService.exportGuestsCsv();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invitados_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exportando:", err);
            alert("Error al exportar datos.");
        }
    };

    const navigateToGuests = (filter?: string) => {
        const url = filter 
            ? `/admin/guests.html?filter=${filter}` 
            : '/admin/guests.html';
        window.location.href = url;
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
                <div style={{ padding: '1.5rem' }}>
                    <Alert message={error} variant="danger" />
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ marginTop: '1rem', padding: '10px 20px', backgroundColor: '#b8860b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Reintentar
                    </button>
                </div>
            </AdminLayout>
         );
    }

    const data = kpiData || {
        total_guests: 0,
        responses_received: 0,
        confirmed_attendees: 0,
        pending_rsvp: 0,
        not_attending: 0,
        total_companions: 0,
        total_children: 0,
        guests_with_allergies: 0,
        allergy_breakdown: {}
    };

    const responsePercentage = data.total_guests > 0 
        ? Math.round((data.responses_received / data.total_guests) * 100) 
        : 0;

    const daysRemaining = getDaysRemaining();

    return (
        <AdminLayout currentPage="dashboard">
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <h2 style={{ margin: '0 0 24px', fontSize: '1.5rem', fontWeight: 600, color: '#5d4e37' }}>
                    Panel de Control
                </h2>

                {/* Progress Bar + Countdown Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    
                    {/* Progress Bar Card */}
                    <div style={{ backgroundColor: '#faf6f0', border: '1px solid #e8dcc8', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5d4e37', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Progreso de Respuestas
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b8860b' }}>
                                {responsePercentage}%
                            </span>
                        </div>
                        <div style={{ height: '12px', backgroundColor: '#e8dcc8', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${responsePercentage}%`, 
                                backgroundColor: responsePercentage > 50 ? '#2e7d32' : '#b8860b',
                                borderRadius: '6px',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem', color: '#8b7355' }}>
                            <span>{data.responses_received} respondidas</span>
                            <span>{data.pending_rsvp} pendientes</span>
                        </div>
                    </div>

                    {/* Countdown Card */}
                    <div style={{ backgroundColor: '#fdf8e8', border: '1px solid #e8d9a0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7a6520', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⏰ Cuenta Regresiva
                        </span>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#b8860b', lineHeight: 1.2, margin: '8px 0' }}>
                            {daysRemaining > 0 ? daysRemaining : 0}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#8b7355' }}>
                            {daysRemaining > 0 ? 'días para la boda' : '¡Es hoy!'}
                        </span>
                    </div>
                </div>

                {/* KPI Cards Grid - Clickable */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <KpiCard 
                        title="Invitados Totales" 
                        value={data.total_guests} 
                        subtext="Lista completa"
                        color="#5d4e37"
                        onClick={() => navigateToGuests()}
                    />
                    <KpiCard 
                        title="Respuestas"
                        value={data.responses_received}
                        subtext="Han contestado"
                        color="#b8860b"
                        onClick={() => navigateToGuests('responded')}
                    />
                    <KpiCard 
                        title="Confirmados" 
                        value={data.confirmed_attendees} 
                        subtext="Han dicho SÍ"
                        color="#2e7d32"
                        bgColor="#f0faf0"
                        onClick={() => navigateToGuests('confirmed')}
                    />
                    <KpiCard 
                        title="Pendientes" 
                        value={data.pending_rsvp} 
                        subtext="Sin responder"
                        color="#a15c38"
                        bgColor="#faf0ea"
                        onClick={() => navigateToGuests('pending')}
                    />
                </div>

                {/* Attendee Breakdown - Visual Summary */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8dcc8', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 600, color: '#5d4e37', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Desglose de Asistentes Confirmados
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                        <div>
                            <span style={{ fontSize: '2rem' }}>👨</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5d4e37' }}>
                                {(data.total_companions - data.total_children) || 0}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#8b7355' }}>Adultos</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #e8dcc8', paddingLeft: '2rem' }}>
                            <span style={{ fontSize: '2rem' }}>👶</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5d4e37' }}>
                                {data.total_children}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#8b7355' }}>Niños</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #e8dcc8', paddingLeft: '2rem' }}>
                            <span style={{ fontSize: '2rem' }}>🍽️</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a15c38' }}>
                                {data.guests_with_allergies}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#8b7355' }}>Con alergias</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #e8dcc8', paddingLeft: '2rem' }}>
                            <span style={{ fontSize: '2rem' }}>❌</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9b1c1c' }}>
                                {data.not_attending}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#8b7355' }}>No asisten</div>
                        </div>
                    </div>

                    {/* Alergias Expandidas */}
                    {data.guests_with_allergies > 0 && data.allergy_breakdown && (
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e8dcc8', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b7355', textTransform: 'uppercase', marginBottom: '12px' }}>
                                Detalle de Restricciones Alimentarias
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                                {Object.entries(data.allergy_breakdown).map(([key, count]) => (
                                    <span key={key} style={{ 
                                        backgroundColor: '#fff', color: '#c62828', 
                                        padding: '4px 10px', borderRadius: '12px', 
                                        fontSize: '0.8rem', border: '1px solid #e8dcc8', fontWeight: 500,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                        {translateAllergy(key)}: <strong>{count}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions Card - Enhanced */}
                <div style={{ backgroundColor: '#faf6f0', border: '1px solid #e8dcc8', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#5d4e37' }}>Acciones Rápidas</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#8b7355' }}>Accesos directos a las funciones más usadas</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => navigateToGuests()}
                                style={{ 
                                    padding: '12px 24px', fontSize: '0.875rem', fontWeight: 600, 
                                    color: '#ffffff', backgroundColor: '#b8860b', 
                                    border: 'none', borderRadius: '8px', cursor: 'pointer'
                                }}
                            >
                                📋 Ver Listado
                            </button>
                            <button 
                                onClick={handleExport}
                                style={{ 
                                    padding: '12px 24px', fontSize: '0.875rem', fontWeight: 500, 
                                    color: '#5d4e37', backgroundColor: '#ffffff', 
                                    border: '1px solid #c9a86c', borderRadius: '8px', cursor: 'pointer'
                                }}
                            >
                                📥 Exportar CSV
                            </button>
                            <button 
                                onClick={() => navigateToGuests('pending')}
                                style={{ 
                                    padding: '12px 24px', fontSize: '0.875rem', fontWeight: 500, 
                                    color: '#a15c38', backgroundColor: '#faf0ea', 
                                    border: '1px solid #d4a088', borderRadius: '8px', cursor: 'pointer'
                                }}
                            >
                                📩 Ver Pendientes ({data.pending_rsvp})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                {activity.length > 0 && (
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8dcc8', borderRadius: '12px', padding: '20px', marginTop: '24px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 600, color: '#5d4e37', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🕒 Actividad Reciente
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activity.map((item, idx) => {
                                const actionIcon = item.action === 'confirmed' ? '✅' : item.action === 'declined' ? '❌' : item.action === 'created' ? '➕' : '📝';
                                const actionText = item.action === 'confirmed' ? 'confirmó asistencia' : item.action === 'declined' ? 'no asistirá' : item.action === 'created' ? 'fue añadido' : 'actualizó RSVP';
                                const timeAgo = getTimeAgo(new Date(item.timestamp));
                                
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#faf8f5', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '1.25rem' }}>{actionIcon}</span>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 600, color: '#5d4e37' }}>{item.guest_name}</span>
                                            <span style={{ color: '#8b7355' }}> {actionText}</span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: '#a0926d', whiteSpace: 'nowrap' }}>{timeAgo}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
    color?: string;
    bgColor?: string;
    onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtext, color = '#5d4e37', bgColor = '#ffffff', onClick }) => {
    return (
        <div 
            onClick={onClick}
            style={{ 
                backgroundColor: bgColor, 
                border: '1px solid #e8dcc8', 
                borderRadius: '12px', 
                padding: '20px', 
                textAlign: 'center',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8b7355', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                {title}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: color, lineHeight: 1.1 }}>
                {value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8b7355', marginTop: '4px' }}>
                {subtext}
            </div>
        </div>
    );
};

export default AdminDashboardPage;

