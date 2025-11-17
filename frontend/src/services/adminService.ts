
import apiClient from './apiClient';
import { CsvGuest } from '@/types';

interface ImportResponse {
    ok: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export const adminService = {
  importGuests: (guests: CsvGuest[]) => {
    return apiClient<ImportResponse>('/api/admin/import-guests', {
      body: guests,
      method: 'POST',
    });
  },
};
