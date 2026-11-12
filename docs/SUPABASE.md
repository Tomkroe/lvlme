# Supabase einrichten (Freunde, Konto, Einladungen)

LvlMe nutzt Supabase für Anmeldung mit Apple, Profile und Freundschaften. Auf dem Server liegt nur der öffentliche Avatarzustand (Name, Level, Stufe, Stimmung, Kampfkraft, Serie). Gesundheitsdaten verlassen dein iPhone nie, und die Datenbank lehnt sie sogar aktiv ab.

Ohne diese Einrichtung läuft die App trotzdem, nur der Freunde-Bereich bleibt deaktiviert.

Dauer: etwa 15 Minuten. Kosten: im kostenlosen Tarif von Supabase ist das enthalten.

## 1. Projekt anlegen
1. Auf **supabase.com** ein Konto anlegen und einloggen.
2. **New project** wählen.
   - Name: `lvlme`
   - Database Password: ein sicheres Passwort erzeugen und im Passwortmanager speichern.
   - Region: **Central EU (Frankfurt)**, damit die Daten in der EU liegen.
3. Warten, bis das Projekt bereit ist (1–2 Minuten).

## 2. Datenbank einrichten
1. Links auf **SQL Editor** und dann auf **New query** klicken.
2. Den kompletten Inhalt von `supabase/migrations/0001_init.sql` aus dem GitHub-Repository hineinkopieren.
3. Auf **Run** klicken. Am Ende muss „Success. No rows returned“ stehen.
4. Kontrolle: Unter **Table Editor** gibt es jetzt `profiles`, `invites` und `friendships`, jeweils mit dem Hinweis „RLS enabled“.
5. Danach genauso eine neue Query mit dem Inhalt von `supabase/migrations/0002_delete_account.sql` ausführen. Sie legt die Funktion `delete_account` an, mit der man in der App unter **Profil → Konto → Konto löschen** sein Konto selbst löschen kann (Pflicht für den App Store).
6. Kontrolle: Unter **Database → Functions** steht jetzt `delete_account`.

Die Skripte dürfen auch mehrfach laufen, sie machen dabei nichts kaputt. Neue Dateien in `supabase/migrations/` immer in der Reihenfolge ihrer Nummer ausführen.

## 3. Anmeldung mit Apple aktivieren
1. Links **Authentication** → **Sign In / Providers** (je nach Version auch **Providers**) öffnen.
2. **Apple** aufklappen und einschalten.
3. Bei **Client IDs** die Bundle-ID der App eintragen: `com.tomkroe.lvlme`
4. Die Felder für „Secret Key“ bzw. Web-Anmeldung leer lassen. Die App meldet sich direkt auf dem iPhone an, dafür reicht die Bundle-ID.
5. Speichern.

Auf der Apple-Seite musst du nichts von Hand einstellen. Wenn EAS die App zum ersten Mal baut, schaltet es „Sign in with Apple“ für die Bundle-ID automatisch frei, weil das in `app.json` eingetragen ist.

## 4. Zugangsdaten in EAS eintragen
1. In Supabase **Project Settings** → **API** (bzw. **Data API** und **API Keys**) öffnen.
2. Diese zwei Werte kopieren:
   - **Project URL**, zum Beispiel `https://abcdefgh.supabase.co`
   - **anon / public key**: Der darf in die App, weil die Datenbank durch RLS geschützt ist.
   - Den **service_role**-Key **niemals** in die App oder ins Repository eintragen.
3. Auf **expo.dev** das Projekt **lvlme** öffnen und dann **Environment variables** → **Add variable** wählen. Beide Variablen anlegen:

   | Name | Wert | Sichtbarkeit | Umgebungen |
   | --- | --- | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | Project URL | Plain text | development, preview, production |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key | Plain text | development, preview, production |

   Alternativ am PC im Projektordner:
   ```
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://…supabase.co" --environment development --environment preview --environment production --visibility plaintext
   npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "…" --environment development --environment preview --environment production --visibility plaintext
   ```
4. Danach neu bauen. Die Werte werden beim Build in die App übernommen.

## 5. Testen
1. Die App öffnen, im Freunde-Bereich **Mit Apple anmelden** antippen.
2. In Supabase unter **Authentication → Users** erscheint dein Konto, und unter **Table Editor → profiles** dein Profil.
3. **Freund einladen** antippen und den Code per WhatsApp an einen Freund schicken. Sobald er ihn in seiner App eingibt, seht ihr gegenseitig eure Avatare.

## Gut zu wissen
- Einladungscodes haben 6 Zeichen, gelten 7 Tage und können mehrfach benutzt werden, zum Beispiel in einer Gruppe.
- Freunde sehen nur deinen Avatar, nie deine Schritte, deinen Schlaf oder deinen Puls.
- Nutzer können ihr Konto in der App selbst löschen (Migration 0002). Profil, Einladungen, Freundschaften und die Anmeldung verschwinden dabei sofort.
- Löschst du ein Konto unter **Authentication → Users**, verschwinden Profil, Einladungen und Freundschaften automatisch mit.
