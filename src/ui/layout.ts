/**
 * Bildschirmgröße für alle Plattformen. Zuständig: app-ui.
 * Auf dem PC (Web) läuft LvlMe in einer schmalen Spalte wie auf dem Handy,
 * damit Szene und Avatar nicht auf Monitorbreite gestreckt werden.
 */
import { Platform, useWindowDimensions } from 'react-native';

/** Breite der App-Spalte im Browser bzw. im installierten PC-Fenster */
export const WEB_MAX_WIDTH = 520;

export const isWeb = Platform.OS === 'web';

/** Wie useWindowDimensions, aber im Web auf die App-Spalte begrenzt. */
export function useScreenSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  return { width: isWeb ? Math.min(width, WEB_MAX_WIDTH) : width, height };
}
