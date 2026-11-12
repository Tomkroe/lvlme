/**
 * Teilen über das iOS-Teilen-Menü. Zuständig: Agent social-backend.
 */
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { Invite } from '../social/api.ts';

/** Teilt den Einladungslink (WhatsApp, iMessage, …). */
export declare function shareInvite(invite: Invite, myName: string): Promise<void>;
/** Macht ein Bild von `ref` (z. B. Avatar-Karte) und teilt es. */
export declare function shareCard(ref: RefObject<View | null>, message: string): Promise<void>;
