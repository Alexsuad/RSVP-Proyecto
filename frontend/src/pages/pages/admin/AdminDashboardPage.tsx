import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Card, AdminLayout } from '../../components/common';

const AdminDashboardPage: React.FC = () => {
    const { t } = useI18n();
    
    // In a real application, this data would be fetched from an API
    const kpiData = {
        confirmed: 85,
        pending: 42,
        notAttending: 15,
    };
    
    return (
        <AdminLayout currentPage="dashboard">
            <h2 className="admin-page-title">{t('ad_nav_dashboard')}</h2>
            <div className="kpi-grid">
                <KpiCard title={t('ad_kpi_confirmed')} value={kpiData.confirmed} colorClass="kpi-value--confirmed" />
                <KpiCard title={t('ad_kpi_pending')} value={kpiData.pending} colorClass="kpi-value--pending" />
                <KpiCard title={t('ad_kpi_no')} value={kpiData.notAttending} colorClass="kpi-value--no" />
            </div>
        </AdminLayout>
    );
};

interface KpiCardProps {
    title: string;
    value: number;
    colorClass: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, colorClass }) => (
    <Card>
        <h3 className="kpi-title">{title}</h3>
        <p className={`kpi-value ${colorClass}`}>{value}</p>
    </Card>
);

export default AdminDashboardPage;