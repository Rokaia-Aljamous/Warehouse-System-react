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

export function isAtLeastAge(birthday: string, minimumAge: number): boolean {
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= minimumAge;
}

export function isAtLeast18(birthday: string): boolean {
  return isAtLeastAge(birthday, 18);
}
