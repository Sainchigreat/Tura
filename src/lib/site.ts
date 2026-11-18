/**
 * The public address of this deployment.
 *
 * Links we hand to other people — invitation links, email redirects — must not
 * be built from `window.location.origin`. If a creator opens the app on a
 * preview URL, or on a host that a student's network cannot reach, every link
 * they share inherits that problem. Pin the canonical origin instead and fall
 * back to whatever origin is actually serving the page.
 */
const CANONICAL_ORIGIN = 'https://tura-zeta.vercel.app';

export function shareOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_ORIGIN;
  if (configured) return configured.replace(/\/+$/, '');
  return CANONICAL_ORIGIN;
}

/** Absolute URL for an invitation token. */
export function inviteUrl(token: string): string {
  return `${shareOrigin()}/?invite=${token}`;
}

/**
 * True when the browser is on a host other than the canonical one, so the UI can
 * tell the creator their link points somewhere else.
 */
export function onCanonicalHost(): boolean {
  try {
    return window.location.origin === shareOrigin();
  } catch {
    return true;
  }
}
