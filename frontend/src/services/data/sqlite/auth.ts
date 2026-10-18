import { nowIso, one, run, uuid } from './db';

/**
 * Local admin authentication for the standalone Android build.
 *
 * There is no server and no network, so the "admin" is simply whoever knows the
 * device password. We store a PBKDF2-SHA256 hash in `app_settings` and issue an
 * opaque token that the UI keeps in localStorage. The default password is
 * `admin` until it is changed — matching the desktop app's bootstrap behaviour.
 */

const HASH_KEY = 'admin_password_hash';
const TOKEN_KEY = 'local_admin_token';
const DEFAULT_PASSWORD = 'admin';
const PBKDF2_ITERATIONS = 150_000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) {
    // No password set yet — the bootstrap password applies.
    return password === DEFAULT_PASSWORD;
  }

  const [scheme, iterationsRaw, saltRaw, expected] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;

  const iterations = Number(iterationsRaw) || PBKDF2_ITERATIONS;
  const actual = await deriveHash(password, fromBase64(saltRaw), iterations);
  return timingSafeEqual(actual, expected);
}

/** Constant-time-ish comparison to avoid trivially leaking length/prefix. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readSetting(key: string): Promise<string | null> {
  const row = await one<{ value: string }>(`SELECT value FROM app_settings WHERE key = ?`, [key]);
  return row?.value ?? null;
}

async function writeSetting(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
}

export async function hasPassword(): Promise<boolean> {
  const stored = await readSetting(HASH_KEY);
  return !!stored;
}

export async function login(password: string): Promise<{ token: string; role: string; error?: string }> {
  const stored = (await readSetting(HASH_KEY)) ?? '';
  const ok = await verifyPassword(password, stored);
  if (!ok) return { token: '', role: '', error: 'Invalid password' };

  const token = uuid();
  await writeSetting(TOKEN_KEY, token);
  return { token, role: 'admin' };
}

export async function logout(): Promise<{ success: boolean }> {
  await run(`DELETE FROM app_settings WHERE key = ?`, [TOKEN_KEY]);
  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const stored = (await readSetting(HASH_KEY)) ?? '';
  const ok = await verifyPassword(currentPassword, stored);
  if (!ok) return { success: false, error: 'Current password is incorrect' };

  await writeSetting(HASH_KEY, await hashPassword(newPassword));
  // Invalidate the existing session so the new password must be used.
  await run(`DELETE FROM app_settings WHERE key = ?`, [TOKEN_KEY]);
  return { success: true };
}

/** Resolve the caller's role from the bearer token it presented. */
export async function resolveRole(token: string | null | undefined): Promise<'admin' | 'anonymous'> {
  if (!token) return 'anonymous';
  const stored = await readSetting(TOKEN_KEY);
  return stored && stored === token ? 'admin' : 'anonymous';
}

export async function getMe(token: string | null | undefined) {
  const role = await resolveRole(token);
  return { role, isLocalNetwork: false as const };
}
