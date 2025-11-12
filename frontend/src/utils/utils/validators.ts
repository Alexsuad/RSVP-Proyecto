

export const validateFullName = (name: string): string | null => {
  if (!name) return "val_required";
  if (name.length < 2 || name.length > 80) return "val_full_name_length";
  if (!/^[a-zA-Z\u00C0-\u017F\s']+$/.test(name)) return "val_full_name_chars";
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return "val_required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "val_email";
  return null;
};

export const validatePhoneLast4 = (last4: string): string | null => {
  if (!last4) return "val_required";
  if (!/^\d{4}$/.test(last4)) return "val_last4";
  return null;
};

export const validateGuestCode = (code: string): string | null => {
  if (!code) return "val_required";
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return "val_guest_code";
  return null;
};