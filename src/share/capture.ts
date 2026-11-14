/** Bild einer View aufnehmen (iPhone/Android). Im Web gilt capture.web.ts. */
import { captureRef } from 'react-native-view-shot';

export async function captureView(view: unknown): Promise<string> {
  return captureRef(view as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
}
