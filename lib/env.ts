/**
 * Read an env var at runtime.
 * Access via process['env'] so Next cannot inline the value at build time
 * (that is what emptied Sensitive Vercel secrets inside Server Actions).
 */
export function envValue(name: string): string {
  const env = (typeof process === 'undefined' ? undefined : process['env']) || {};
  let value = String(env[name] ?? '').trim();
  value = value.replace(/^['"]|['"]$/g, '').trim();
  const prefix = new RegExp(`^${name}\\s*=\\s*`, 'i');
  value = value.replace(prefix, '').trim();
  return value.replace(/^['"]|['"]$/g, '').trim();
}
