/**
 * Freunde & Konto. Zuständig: Agent social-backend.
 * Ohne Supabase-Konfiguration (EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY) läuft die App offline weiter: isConfigured() === false.
 * An das Backend geht ausschließlich PublicAvatar – nie Gesundheitsrohdaten.
 */
import type { PublicAvatar } from '../types.ts';

export interface Me { userId: string; displayName: string }
export interface Friend extends PublicAvatar { userId: string }
export interface Invite { code: string; url: string }

export declare function isConfigured(): boolean;
export declare function getMe(): Promise<Me | null>;
export declare function signInWithApple(): Promise<Me | null>;
export declare function signOut(): Promise<void>;
export declare function setDisplayName(name: string): Promise<void>;
export declare function publishAvatar(a: PublicAvatar): Promise<void>;
export declare function createInvite(): Promise<Invite>;
export declare function acceptInvite(code: string): Promise<{ ok: boolean; friendName?: string; error?: string }>;
export declare function listFriends(): Promise<Friend[]>;
export declare function removeFriend(userId: string): Promise<void>;
