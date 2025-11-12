import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Card, Button, AdminLayout, Alert, Loader, FormField } from '../../components/common';
import { parseCsvToJson } from '../../utils/uploader';
import { adminService } from '../../services/adminService';

const AdminGuestsPage: React.FC = () => {
    const { t } = useI18n();
    const [guests, setGuests] = useState<{ name: string; rsvp: string; companions: number }[]>([]);
    const [loadingGuests, setLoadingGuests] = useState(true);
    const [guestError, setGuestError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ message: string; success: boolean } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // In a real app, this would be an API call.
        const fetchGuests = () => {
            setLoadingGuests(true);
            setGuestError(null);
            setTimeout(() => {
                try {
                    // MOCK DATA
                    setGuests([
                        { name: 'John Doe', rsvp: t('ad_kpi_confirmed'), companions: 2 },
                        { name: 'Jane Smith', rsvp: t('ad_kpi_pending'), companions: 1 },
                        { name: 'Peter Jones', rsvp: t('ad_kpi_no'), companions: 0 },
                        { name: 'Alice Johnson', rsvp: t('ad_kpi_confirmed'), companions: 1 },
                    ]);
                } catch (e) {
                    setGuestError(t('msg_error_generic'));
                } finally {
                    setLoadingGuests(false);
                }
            }, 1000); // Simulate network delay
        };

        fetchGuests();
    }, [t]);


    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);
        try {
            const fileText = await file.text();
            const guestsJson = await parseCsvToJson(fileText);
            const result = await adminService.importGuests(guestsJson);
            setImportResult({ message: t('ad_import_success', result.inserted, result.updated), success: true });
            // In a real app, you would re-fetch the guest list here to show the new data
        } catch (error: any) {
            setImportResult({ message: error.message || t('msg_error_generic'), success: false });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const filteredGuests = guests.filter(guest =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderTableContent = () => {
        if (loadingGuests) {
            return (
                <tr>
                    <td colSpan={3} className="data-table__body-cell" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Loader />
                        </div>
                    </td>
                </tr>
            );
        }

        if (guestError) {
             return (
                <tr>
                    <td colSpan={3} className="data-table__body-cell">
                         <Alert message={guestError} variant="danger" />
                    </td>
                </tr>
            );
        }

        if (filteredGuests.length === 0) {
            return (
                <tr>
                    <td colSpan={3} className="data-table__body-cell text-center">
                        {t('ad_empty')}
                    </td>
                </tr>
            );
        }

        return filteredGuests.map((guest, index) => (
            <tr key={index} className="data-table__body-row">
                <td className="data-table__body-cell data-table__body-cell--name">{guest.name}</td>
                <td className="data-table__body-cell">{guest.rsvp}</td>
                <td className="data-table__body-cell">{guest.companions}</td>
            </tr>
        ));
    };


    return (
        <AdminLayout currentPage="guests">
            <div className="admin-page-header">
                <h2 className="admin-page-title">{t('ad_guests_title')}</h2>
                <div className="admin-page-header__actions">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden-input"
                        accept=".csv"
                    />
                    <Button onClick={handleImportClick} loading={importing} disabled={importing}>
                        {importing ? t('ad_importing') : t('ad_import')}
                    </Button>
                </div>
            </div>

            {importResult && <div className="mb-4"><Alert message={importResult.message} variant={importResult.success ? 'success' : 'danger'} /></div>}

            <Card>
                <div className="mb-4">
                     <FormField
                        id="search-guests"
                        label={t('ad_search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr className="data-table__header-row">
                                <th className="data-table__header-cell">{t('ad_table_name')}</th>
                                <th className="data-table__header-cell">{t('ad_table_rsvp')}</th>
                                <th className="data-table__header-cell">{t('ad_table_people')}</th>
                            </tr>
                        </thead>
                        <tbody>
                           {renderTableContent()}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
};

export default AdminGuestsPage;