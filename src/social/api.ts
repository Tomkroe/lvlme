/**
 * Freunde & Konto. Zuständig: Agent social-backend.
 * Ohne Supabase-Konfiguration (EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY) läuft die App offline weiter: isConfigured() === false.
 * An Freunde geht ausschließlich PublicAvatar – nie Gesundheitsrohdaten.
 * Eigene Tageswerte und Fortschritt gehen nur mit Einwilligung ins eigene Konto (Sync iPhone ↔ PC),
 * lesbar nur für einen selbst (RLS, Migration 0012).
 */
import { Platform } from 'react-native';
import type { BodyId, DailyMetrics, HairId, Mood, Progress, PublicAvatar } from '../types.ts';
import { supabase, supabaseConfigured } from './client.ts';
// Ohne Dateiendung: Metro nimmt im Web apple.web.ts
import { appleIdToken } from './apple';

export interface Me { userId: string; displayName: string }
export interface Friend extends PublicAvatar { userId: string }
export interface Invite { code: string; url: string }

const NOT_CONFIGURED = 'Freunde sind in dieser Version noch nicht eingerichtet.';
const NOT_SIGNED_IN = 'Bitte melde dich zuerst an.';
const OFFLINE = 'Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.';
const MOODS: Mood[] = ['charged', 'awake', 'tired', 'proud', 'lazy'];
/** Höchste erlaubte Frisur-/Körper-ID, wie in is_public_avatar (Migration 0011) */
const MAX_HAIR = 6;
const MAX_BODY = 9;

/** Ganze Zahl 0…max, sonst 0 (Standard-Aussehen) */
function appearanceId(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0;
}

export const inviteUrl = (code: string) => `lvlme://invite/${code}`;

/** Server-Fehler in einen verständlichen deutschen Satz übersetzen. */
function message(err: unknown): string {
  const m = (err as { message?: string } | null)?.message ?? '';
  // Unsere SQL-Funktionen werfen bereits deutsche Sätze
  if (/[äöüÄÖÜß]|Bitte|Code|Einladung/.test(m)) return m;
  if (/network|fetch|Failed to fetch|timeout/i.test(m)) return OFFLINE;
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/Email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Mail).';
  if (/already registered|already exists/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich damit an.';
  if (/Password should be|password/i.test(m)) return 'Das Passwort muss mindestens 6 Zeichen haben.';
  if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche. Bitte warte kurz und versuch es dann noch einmal.';
  return 'Das hat nicht geklappt. Bitte versuch es gleich noch einmal.';
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function isConfigured(): boolean {
  return supabaseConfigured;
}

export async function getMe(): Promise<Me | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return { userId, displayName: (data?.display_name as string | undefined) ?? 'Kämpfer' };
}

/**
 * Anmelden mit Apple. Gibt null zurück, wenn abgebrochen oder Apple-Anmeldung nicht verfügbar.
 * Wirft einen Fehler mit deutscher Meldung bei echten Problemen.
 */
export async function signInWithApple(): Promise<Me | null> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  let apple: { token: string; nonce: string } | null;
  try { apple = await appleIdToken(); } catch (e) { throw new Error(message(e)); }
  if (!apple) return null;

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: apple.token,
    nonce: apple.nonce,
  });
  if (error || !data.user) throw new Error(message(error));

  // Das Profil heißt serverseitig zunächst „Kämpfer“. Die App setzt danach den
  // Kämpfernamen aus dem Onboarding über setDisplayName – nie den echten Namen von Apple.
  return getMe();
}

/**
 * Anmelden mit E-Mail und Passwort – auf iPhone und PC gleich, dasselbe Konto wie in der Webversion.
 * Wirft einen Fehler mit deutscher Meldung.
 */
export async function signInWithEmail(email: string, password: string): Promise<Me | null> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error(message(error));
  return getMe();
}

/**
 * Neues Konto mit E-Mail und Passwort. Gibt 'signed-in' zurück, wenn sofort angemeldet,
 * sonst 'confirm-email' (Supabase schickt dann einen Bestätigungslink).
 */
export async function signUpWithEmail(email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const redirect = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined;
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: redirect ? { emailRedirectTo: redirect } : undefined });
  if (error) throw new Error(message(error));
  return data.session ? 'signed-in' : 'confirm-email';
}

/** Wie ist das Konto angemeldet? Nur für die Anzeige im Profil. */
export async function signInMethod(): Promise<'apple' | 'email' | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return user.app_metadata?.provider === 'apple' ? 'apple' : 'email';
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Löscht das eigene Konto endgültig: Freundschaften, Einladungen, Profil und Anmeldung.
 * Danach wird lokal abgemeldet. Der Fortschritt auf dem Gerät bleibt unberührt.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('Konten sind in dieser Version noch nicht eingerichtet.');
  if (!(await currentUserId())) throw new Error(NOT_SIGNED_IN);
  const { error } = await supabase.rpc('delete_account');
  if (error) throw new Error(message(error));
  // Der Nutzer existiert serverseitig nicht mehr – Sitzung nur noch lokal verwerfen.
  try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* egal */ }
}

export async function setDisplayName(name: string): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const userId = await currentUserId();
  if (!userId) throw new Error(NOT_SIGNED_IN);
  const clean = name.trim().slice(0, 30);
  if (!clean) throw new Error('Bitte gib einen Namen ein.');
  const { error } = await supabase.from('profiles').update({ display_name: clean, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) throw new Error(message(error));
}

/** Veröffentlicht den Avatarzustand für Freunde. Ohne Backend oder Anmeldung: still nichts tun. */
export async function publishAvatar(a: PublicAvatar): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  // Bewusst nur diese Felder – der Server lehnt alles andere ab (is_public_avatar).
  const avatar: PublicAvatar = {
    displayName: a.displayName,
    level: a.level,
    stage: a.stage,
    mood: a.mood,
    power: a.power,
    streak: a.streak,
    updatedAt: a.updatedAt,
    // Aussehen: reine Darstellungsdaten, keine Gesundheitsdaten
    hair: appearanceId(a.hair, MAX_HAIR) as HairId,
    body: appearanceId(a.body, MAX_BODY) as BodyId,
  };
  // Das Aussehen aus dem Web-Editor ("look") erhalten, sonst würde es beim Veröffentlichen überschrieben
  const { data: current } = await supabase.from('profiles').select('avatar').eq('id', userId).maybeSingle();
  const look = (current?.avatar as { look?: unknown } | null)?.look;
  const payload = look && typeof look === 'object' ? { ...avatar, look } : avatar;
  const { error } = await supabase.from('profiles').update({ avatar: payload, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) throw new Error(message(error));
}

export async function createInvite(): Promise<Invite> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  if (!(await currentUserId())) throw new Error(NOT_SIGNED_IN);
  const { data, error } = await supabase.rpc('create_invite');
  if (error) throw new Error(message(error));
  const row = (Array.isArray(data) ? data[0] : data) as { code?: string } | null;
  if (!row?.code) throw new Error('Einladung konnte nicht erstellt werden. Bitte noch einmal versuchen.');
  return { code: row.code, url: inviteUrl(row.code) };
}

export async function acceptInvite(code: string): Promise<{ ok: boolean; friendName?: string; error?: string }> {
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };
  if (!(await currentUserId())) return { ok: false, error: NOT_SIGNED_IN };
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length !== 6) return { ok: false, error: 'Ein Code hat 6 Zeichen.' };
  const { data, error } = await supabase.rpc('accept_invite', { p_code: clean });
  if (error) return { ok: false, error: message(error) };
  return { ok: true, friendName: (data as string | null) ?? 'Kämpfer' };
}

/** Freunde mit ihrem öffentlichen Avatar, stärkste zuerst. */
export async function listFriends(): Promise<Friend[]> {
  if (!supabase) return [];
  const userId = await currentUserId();
  if (!userId) return [];
  // RLS liefert ohnehin nur eigene + Freundes-Profile; das eigene filtern wir heraus.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar, updated_at')
    .neq('id', userId);
  if (error) throw new Error(message(error));
  return (data ?? [])
    .map(row => {
      const a = (row.avatar ?? {}) as Partial<PublicAvatar>;
      // null = Freund teilt seine Tagesform nicht; das bleibt null (nicht raten).
      const mood: Mood | null = MOODS.includes(a.mood as Mood) ? (a.mood as Mood) : null;
      return {
        userId: row.id as string,
        displayName: (row.display_name as string) ?? a.displayName ?? 'Kämpfer',
        level: typeof a.level === 'number' ? a.level : 1,
        stage: typeof a.stage === 'number' ? a.stage : 0,
        mood,
        power: typeof a.power === 'number' ? a.power : 0,
        streak: typeof a.streak === 'number' ? a.streak : 0,
        updatedAt: a.updatedAt ?? (row.updated_at as string),
        // Fehlend oder ungültig (z. B. ältere App-Version) → Standard-Aussehen 0
        hair: appearanceId(a.hair, MAX_HAIR) as HairId,
        body: appearanceId(a.body, MAX_BODY) as BodyId,
      } satisfies Friend;
    })
    .sort((x, y) => y.power - x.power);
}

export async function removeFriend(userId: string): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  if (!(await currentUserId())) throw new Error(NOT_SIGNED_IN);
  const { error } = await supabase.rpc('remove_friend', { p_friend: userId });
  if (error) throw new Error(message(error));
}

// ---------------------------------------------------------------------------
// Sync iPhone ↔ PC (nur eigenes Konto, Migration 0012)
// ---------------------------------------------------------------------------

/** Ist jemand angemeldet? */
export async function isSignedIn(): Promise<boolean> {
  return (await currentUserId()) !== null;
}

/**
 * iPhone: Tageswerte aus Apple Health ins eigene Konto laden (nur mit Einwilligung, siehe AppState).
 * Ernährungswerte im Konto bleiben unberührt.
 */
export async function uploadHealthDays(days: DailyMetrics[]): Promise<void> {
  if (!supabase || !(await currentUserId())) return;
  const rows = days.filter(d => d.source === 'healthkit').slice(-31).map(d => ({
    date: d.date,
    steps: Math.max(0, Math.round(d.steps)),
    active_energy_kcal: Math.max(0, d.activeEnergyKcal),
    workout_minutes: Math.max(0, d.workoutMinutes),
    sleep_hours: d.sleepHours,
    hrv_ms: d.hrvMs,
    resting_hr: d.restingHr,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.rpc('upsert_health_days', { p_days: rows });
  if (error) throw new Error(message(error));
}

/** PC/Web: eigene Tageswerte der letzten `days` Tage aus dem Konto, älteste zuerst. */
export async function fetchHealthDays(days: number): Promise<DailyMetrics[]> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  if (!(await currentUserId())) throw new Error(NOT_SIGNED_IN);
  const { data, error } = await supabase.rpc('get_health_metrics', { p_days: days });
  if (error) throw new Error(message(error));
  const num = (v: unknown): number | null => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    date: String(r.date),
    steps: num(r.steps) ?? 0,
    activeEnergyKcal: num(r.active_energy_kcal) ?? 0,
    workoutMinutes: num(r.workout_minutes) ?? 0,
    sleepHours: num(r.sleep_hours),
    hrvMs: num(r.hrv_ms),
    restingHr: num(r.resting_hr),
    source: 'cloud' as const,
  }));
}

/** Sync ausgeschaltet (Einwilligung widerrufen): hochgeladene Tageswerte und Fortschritt im Konto löschen. */
export async function clearSyncedData(): Promise<void> {
  if (!supabase) return;
  if (!(await currentUserId())) throw new Error(NOT_SIGNED_IN);
  const { error } = await supabase.rpc('clear_synced_data');
  if (error) throw new Error(message(error));
}

/** Gespeicherten Fortschritt aus dem Konto lesen (null = noch keiner). */
export async function loadProgress(): Promise<Progress | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('user_progress').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(message(error));
  const p = data?.data as Progress | undefined;
  return p && typeof p.level === 'number' && Array.isArray(p.booked) ? p : null;
}

/** Fortschritt ins Konto schreiben, damit iPhone und PC denselben Stand zeigen. */
export async function saveProgress(p: Progress): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  // Nur die letzten 400 gebuchten Tage mitschicken (reicht für "kein Tag doppelt")
  const data: Progress = { ...p, booked: p.booked.slice(-400), restDays: p.restDays?.slice(-60) };
  const { error } = await supabase.from('user_progress').upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(message(error));
}
