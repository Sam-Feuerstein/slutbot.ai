/** Read an env var, stripping quotes and accidental `KEY = value` pastes from Vercel. */
export function envValue(name: string): string {
  let value = process.env[name]?.trim() || '';
  value = value.replace(/^['"]|['"]$/g, '').trim();
  const prefix = new RegExp(`^${name}\\s*=\\s*`, 'i');
  value = value.replace(prefix, '').trim();
  return value.replace(/^['"]|['"]$/g, '').trim();
}
