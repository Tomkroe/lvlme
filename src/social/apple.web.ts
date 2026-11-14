/** Web: keine Apple-Anmeldung (dafür E-Mail und Passwort). */
export async function appleIdToken(): Promise<{ token: string; nonce: string } | null> {
  return null;
}
