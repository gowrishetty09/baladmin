export function adminConfig(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('The admin address must be an HTTPS URL without credentials, query, or fragment.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  return { url: `${url.origin}${path}/`, origin: url.origin, path };
}

export function isAdminUrl(value: string, config: ReturnType<typeof adminConfig>): boolean {
  try {
    const url = new URL(value);
    return url.origin === config.origin && !url.username && !url.password &&
      (url.pathname === config.path || url.pathname.startsWith(`${config.path}/`));
  } catch { return false; }
}

export function notificationPath(data: Record<string, unknown>): string {
  const booking = data.bookingId ?? (data.entityType === 'BOOKING' ? data.entityId : undefined);
  if (typeof booking === 'string' && /^[A-Za-z0-9_-]+$/.test(booking)) return `/bookings/${booking}`;
  if (data.sosId || String(data.type ?? '').includes('SOS')) return '/monitoring';
  return '/notifications';
}

export function safeFilename(value: unknown): string {
  const result = String(value ?? 'document').split(/[\\/]/).pop()!
    .replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/^\.+/, '').slice(0, 160);
  return result || 'document';
}

export function isExternalUrl(value: string): boolean {
  try { return ['https:', 'http:', 'tel:', 'mailto:', 'geo:', 'maps:', 'comgooglemaps:'].includes(new URL(value).protocol); }
  catch { return false; }
}
