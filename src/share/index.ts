/**
 * Teilen über das iOS-Teilen-Menü. Zuständig: Agent social-backend.
 */
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { Invite } from '../social/api.ts';

/** Teilt den Einladungslink (WhatsApp, iMessage, …). */
export async function shareInvite(invite: Invite, myName: string): Promise<void> {
  const name = myName.trim() || 'Ich';
  const text =
    `${name} lädt dich zu LvlMe ein! Lass unsere Avatare gegeneinander antreten.\n\n` +
    `Dein Code: ${invite.code}\n` +
    `Direkt öffnen (wenn LvlMe installiert ist): ${invite.url}\n\n` +
    `Der Code gilt 7 Tage.`;
  // Link nur im Text: lvlme:// als separates url-Feld wird von manchen Apps verschluckt.
  await Share.share({ message: text });
}

/** Macht ein Bild von `ref` (z. B. Avatar-Karte) und teilt es. */
export async function shareCard(ref: RefObject<View | null>, message: string): Promise<void> {
  if (!ref.current) throw new Error('Die Karte ist noch nicht bereit. Bitte gleich noch einmal versuchen.');
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  if (Platform.OS === 'ios') {
    // iOS: Bild und Text zusammen im Teilen-Menü
    await Share.share({ url: uri, message });
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message, UTI: 'public.png' });
  } else {
    await Share.share({ message });
  }
}
