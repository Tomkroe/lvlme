/**
 * Apple-Anmeldung auf dem iPhone: holt das Identitäts-Token von Apple. Zuständig: social-backend.
 * Im Web gilt apple.web.ts (dort gibt es keine Apple-Anmeldung).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

/** null = abgebrochen oder auf diesem Gerät nicht verfügbar. Wirft bei echten Fehlern. */
export async function appleIdToken(): Promise<{ token: string; nonce: string } | null> {
  if (!(await AppleAuthentication.isAvailableAsync())) return null;
  // Apple bekommt den gehashten Nonce, Supabase den ungehashten – so prüft Supabase das Token.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      // Keine Scopes: Wir brauchen weder E-Mail noch Namen von Apple.
      requestedScopes: [],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple hat keine Anmeldung zurückgegeben. Bitte noch einmal versuchen.');
  return { token: credential.identityToken, nonce: rawNonce };
}
