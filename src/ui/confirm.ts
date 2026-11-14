/**
 * Rückfragen und Hinweise für alle Plattformen. Zuständig: app-ui.
 * Alert.alert mit Knöpfen tut im Browser nichts – dort nutzen wir window.confirm/alert.
 */
import { Alert, Platform } from 'react-native';

/** Fragt nach und liefert true, wenn bestätigt wurde. */
export function confirm(title: string, message: string, confirmText: string, destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Einfacher Hinweis mit OK. */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
