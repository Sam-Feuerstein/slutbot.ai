const ADMIN_PW_KEY = 'slutbot-admin-password';

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_PW_KEY) || '';
}

export function setAdminPassword(value: string) {
  localStorage.setItem(ADMIN_PW_KEY, value);
}

export function adminHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const pw = getAdminPassword();
  if (pw) headers['x-admin-password'] = pw;
  return headers;
}
