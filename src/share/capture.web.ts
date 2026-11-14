/** Web: Bildaufnahme wird nicht unterstützt – geteilt wird dann nur der Text. */
export async function captureView(_view: unknown): Promise<string> {
  throw new Error('web');
}
