/**
 * Freunde & Konto. Zuständig: Agent social-backend.
 * Ohne Supabase-Konfiguration (EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY) läuft die App offline weiter: isConfigured() === false.
 * An das Backend geht ausschließlich PublicAvatar – nie Gesundheitsrohdaten.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { Mood, PublicAvatar } from '../types.ts';
import { supabase, supabaseConfigured } from './client.ts';

export interface Me { userId: string; displayName: string }
export interface Friend extends PublicAvatar { userId: string }
export interface Invite { code: string; url: string }

const NOT_CONFIGURED = 'Freunde sind in dieser Version noch nicht eingerichtet.';
const NOT_SIGNED_IN = 'Bitte melde dich zuerst mit Apple an.';
const OFFLINE = 'Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.';
const MOODS: Mood[] = ['charged', 'awake', 'tired', 'proud', 'lazy'];

export const inviteUrl = (code: string) => `lvlme://invite/${code}`;

/** Server-Fehler in einen verständlichen deutschen Satz übersetzen. */
function message(err: unknown): string {
  const m = (err as { message?: string } | null)?.message ?? '';
  // Unsere SQL-Funktionen werfen bereits deutsche Sätze
  if (/[äöüÄÖÜß]|Bitte|Code|Einladung/.test(m)) return m;
  if (/network|fetch|Failed to fetch|timeout/i.test(m)) return OFFLINE;
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
  if (!(await AppleAuthentication.isAvailableAsync())) return null;

  // Apple bekommt den gehashten Nonce, Supabase den ungehashten – so prüft Supabase das Token.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      // Keine Scopes: Wir brauchen weder E-Mail noch Namen von Apple.
      // Den öffentlichen Namen wählt der Nutzer selbst (Kämpfername aus dem Onboarding → setDisplayName).
      requestedScopes: [],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw new Error(message(e));
  }
  if (!credential.identityToken) throw new Error('Apple hat keine Anmeldung zurückgegeben. Bitte noch einmal versuchen.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error || !data.user) throw new Error(message(error));

  // Das Profil heißt serverseitig zunächst „Kämpfer“. Die App setzt danach den
  // Kämpfernamen aus dem Onboarding über setDisplayName – nie den echten Namen von Apple.
  return getMe();
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
  };
  const { error } = await supabase.from('profiles').update({ avatar, updated_at: new Date().toISOString() }).eq('id', userId);
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
