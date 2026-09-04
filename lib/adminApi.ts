export function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export const adminFetchInit = {
  credentials: 'same-origin' as const,
  headers: adminHeaders(),
};
