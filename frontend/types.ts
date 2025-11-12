
export interface GuestData {
  guest_code: string;
  full_name: string;
  language: string;
  max_accomp: number;
  confirmed: boolean;
  invited_to_ceremony: boolean;
  allergies: string[];
  companions: { adults?: number, kids?: number };
}

export interface RsvpPayload {
  attending: boolean;
  companions: { adults: number; kids: number };
  allergies: string[];
  notes: string;
}

export interface CsvGuest {
  guest_code: string;
  full_name: string;
  email: string;
  phone: string;
  language: string;
  invited_to_ceremony: boolean;
  max_accomp: number;
  relationship: string;
  side: 'bride' | 'groom';
}
