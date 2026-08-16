export const PASSWORD_MIN_LENGTH = 8;

export function validatePasswordStrength(pw: string): boolean {
  return (
    pw.length >= PASSWORD_MIN_LENGTH &&
    /[A-Za-z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export function isValidInternationalPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const cleaned = phone.trim();
  if (!cleaned) return false;
  if (!/^\+?[0-9][0-9\s()\-.]*$/.test(cleaned)) return false;
  return digits.length >= 7 && digits.length <= 15;
}
