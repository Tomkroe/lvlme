/**
 * Teilen über das Teilen-Menü (iPhone) bzw. das Teilen des Browsers oder die Zwischenablage (PC).
 * Zuständig: Agent social-backend.
 */
import type { ComponentRef, RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { Invite } from '../social/api.ts';

/** Teilt den Einladungslink (WhatsApp, iMessage, …). */
export async function shareInvite(invite: Invite, myName: string): Promise<void> {
  const name = myName.trim() || 'Ich';
  const text =
    `${name} lädt dich zu LvlMe ein! Lass unsere Avatare gegeneinander antreten.\n\n` +
    `Dein Code: ${invite.code}\n` +
    `Direkt öffnen (wenn LvlMe installiert ist): ${invite.url}\n\n` +
    `Der Code gilt einmal und 7 Tage lang.`;
  // Link nur im Text: lvlme:// als separates url-Feld wird von manchen Apps verschluckt.
  if (Platform.OS === 'web') { await shareTextWeb(text); return; }
  await Share.share({ message: text });
}

/** PC/Web: Teilen-Dialog des Browsers, sonst in die Zwischenablage kopieren. */
async function shareTextWeb(text: string): Promise<void> {
  const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
    | (Navigator & { share?: (d: { text: string }) => Promise<void> })
    | undefined;
  if (nav?.share) {
    try { await nav.share({ text }); return; } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
    }
  }
  if (nav?.clipboard) {
    await nav.clipboard.writeText(text);
    if (typeof window !== 'undefined') window.alert('Text kopiert – füge ihn in WhatsApp oder eine Nachricht ein.');
    return;
  }
  throw new Error('Teilen wird von diesem Browser nicht unterstützt.');
}

/** Macht ein Bild von `ref` (z. B. Avatar-Karte) und teilt es. */
export type ViewRef = RefObject<ComponentRef<typeof View> | null>;

export async function shareCard(ref: ViewRef, message: string): Promise<void> {
  if (Platform.OS === 'web') { await shareTextWeb(message); return; }
  if (!ref.current) throw new Error('Die Karte ist noch nicht bereit. Bitte gleich noch einmal versuchen.');
  // Ohne Dateiendung, damit Metro im Web capture.web.ts nimmt (react-native-view-shot ist nur nativ)
  // @ts-ignore – require ist in React Native vorhanden
  const { captureView } = require('./capture') as typeof import('./capture.ts');
  const uri = await captureView(ref.current);
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
