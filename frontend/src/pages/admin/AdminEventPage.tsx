
import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Card, AdminLayout } from '@/components/common';

const AdminEventPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <AdminLayout currentPage="event">
        <h2 className="admin-page-title">{t('ad_event_title')}</h2>
        <Card className="max-w-2xl">
            <h3 className="event-title">{t('ad_event_name')}</h3>
            <div className="space-y-4 mt-6">
                <EventDetail icon="📅" text={t('ad_event_date')} />
                <EventDetail icon="📍" text={t('ad_event_location')} />
                <EventDetail icon="⏰" text={t('ad_event_time')} />
            </div>
        </Card>
    </AdminLayout>
  );
};

const EventDetail: React.FC<{icon: string, text: string}> = ({icon, text}) => (
    <div className="event-detail">
        <span className="event-detail__icon">{icon}</span>
        <p className="event-detail__text">{text}</p>
    </div>
);

export default AdminEventPage;
