const WEAK_JWT_SECRETS = new Set(['', 'default_jwt_secret', 'your-secret', 'admin-session']);

export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() || '';
  if (WEAK_JWT_SECRETS.has(secret) || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong random value of at least 32 characters.');
  }
  return secret;
}
