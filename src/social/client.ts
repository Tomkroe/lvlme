/**
 * Supabase-Client für LvlMe. Zuständig: Agent social-backend.
 * Konfiguration über EAS-Umgebungsvariablen (siehe docs/SUPABASE.md).
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = url.length > 0 && anonKey.length > 0;

/** null, solange kein Backend eingerichtet ist – die App läuft dann offline weiter. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Token nur auffrischen, solange die App im Vordergrund ist (Empfehlung von Supabase für React Native)
if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
