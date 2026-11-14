# Supabase einrichten (Freunde, Konto, Einladungen)

LvlMe nutzt Supabase für Anmeldung mit Apple, Profile und Freundschaften. Auf dem Server liegt nur der öffentliche Avatarzustand (Name, Level, Stufe, Stimmung, Serie, Frisur und Körper des Avatars). Gesundheitsdaten verlassen dein iPhone nie, und die Datenbank lehnt sie sogar aktiv ab.

Ohne diese Einrichtung läuft die App trotzdem, nur der Freunde-Bereich bleibt deaktiviert.

Dauer: etwa 15 Minuten. Kosten: im kostenlosen Tarif von Supabase ist das enthalten.

## 1. Projekt anlegen
1. Auf **supabase.com** ein Konto anlegen und einloggen.
2. **New project** wählen.
   - Name: `lvlme`
   - Database Password: ein sicheres Passwort erzeugen und im Passwortmanager speichern.
   - Region: **Central EU (Frankfurt)** (`eu-central-1`), damit die Daten in der EU liegen. Die Region lässt sich später nicht mehr ändern, also gleich richtig wählen.
3. Warten, bis das Projekt bereit ist (1–2 Minuten).
4. **Auftragsverarbeitungsvertrag (AVV/DPA) abschließen.** Supabase verarbeitet für dich personenbezogene Daten deiner Nutzer, deshalb brauchst du nach DSGVO Art. 28 einen AVV. Supabase stellt ihn als „Data Processing Addendum“ (DPA) bereit: im Dashboard unter **Organization Settings → Legal Documents** (bzw. auf supabase.com unter **Legal → DPA**) anfordern bzw. unterschreiben und das unterschriebene PDF aufbewahren. Ohne AVV die App nicht veröffentlichen.

## 2. Datenbank einrichten
1. Links auf **SQL Editor** und dann auf **New query** klicken.
2. Den kompletten Inhalt von `supabase/migrations/0001_init.sql` aus dem GitHub-Repository hineinkopieren.
3. Auf **Run** klicken. Am Ende muss „Success. No rows returned“ stehen.
4. Kontrolle: Unter **Table Editor** gibt es jetzt `profiles`, `invites` und `friendships`, jeweils mit dem Hinweis „RLS enabled“.
5. Danach genauso eine neue Query mit dem Inhalt von `supabase/migrations/0002_delete_account.sql` ausführen. Sie legt die Funktion `delete_account` an, mit der man in der App unter **Profil → Konto → Konto löschen** sein Konto selbst löschen kann (Pflicht für den App Store).
6. Kontrolle: Unter **Database → Functions** steht jetzt `delete_account`.
7. Danach `supabase/migrations/0003_privacy.sql` ausführen (Datenschutz-Nachbesserungen):
   - Die Tagesform (`mood`) darf im Avatar leer sein, wenn ein Nutzer sie nicht teilen will.
   - Die Hilfsfunktion `are_friends` ist nicht mehr von außen aufrufbar.
   - Einladungscodes gelten nur noch **einmal**: Beim Annehmen wird der Code gelöscht.
   - Neue Profile heißen immer „Kämpfer“. Der echte Name von Apple wird nicht mehr übernommen; die App setzt den selbst gewählten Kämpfernamen.
8. Kontrolle: Unter **Authentication → Policies** steht bei `profiles` weiterhin „profiles: eigenes oder Freunde lesen“.
9. Danach `supabase/migrations/0011_appearance_hair_body.sql` ausführen (setzt 0008–0010 vom Branch `main` voraus, weil es deren Prüfung für `look` übernimmt): Der Avatar darf jetzt auch Frisur (`hair`, 0–6) und Körper bzw. Outfit (`body`, 0–9) enthalten, damit Freunde dein gewähltes Aussehen sehen. **Wichtig:** Ohne diese Migration lehnt der Server das Speichern des Avatars von App-Versionen mit Frisur/Körper-Auswahl ab.
10. Kontrolle: Neue Query mit `select public.is_public_avatar('{"hair": 3, "body": 9}'::jsonb);` ausführen. Das Ergebnis muss `true` sein (mit `"hair": 7` dagegen `false`).
11. Danach `supabase/migrations/0012_sync_iphone_pc.sql` ausführen: Sync zwischen iPhone-App und PC-Version. Die iPhone-App darf – nur mit Einwilligung („Mit dem PC synchronisieren“) – Tageswerte (Quelle `healthkit`) und den Fortschritt (Tabelle `user_progress`) ins eigene Konto laden; die PC-Version liest sie. `delete_account()` löscht jetzt auch den Fortschritt. **Wichtig:** Ohne diese Migration zeigt die PC-Version keine Werte vom iPhone.

8. Für die **Webversion** (Prototyp ohne App Store) zusätzlich `supabase/migrations/0004_web_health.sql` ausführen. Das legt die Tabellen für Tageswerte an, die die Webversion braucht, weil ein Browser nicht direkt auf Apple Health zugreifen darf. Werte kommen dort über einen Apple-Kurzbefehl (per Geheim-Token, siehe unten) oder per Hand in die App.

9. Danach `0005_delete_account_health.sql` und `0006_shortcut_robust.sql` ausführen. 0006 sorgt dafür, dass der Kurzbefehl auch mit leeren Werten (z. B. keine Trainingsminuten ohne Apple Watch) und deutschen Kommazahlen funktioniert.

10. `0007_nutrition.sql` ausführen: Ernährung (kcal, Protein, Wasser) für Webversion und Kurzbefehl.

11. `0008_avatar_look.sql` ausführen: Aussehen des Kämpfers (Charakter-Editor) für Freunde sichtbar.

12. `0009_avatar_look_more.sql` ausführen: weitere Aussehen-Optionen (Gesicht, Größe, Statur …). Ersetzt die Prüfung aus 0008.
13. `0010_avatar_images.sql` ausführen: privater Bildspeicher `avatars` für eigene Avatar-Bilder. Hochladen nur in den eigenen Ordner, sehen nur du und deine Freunde.

13. Anmeldung in der Webversion: per **E-Mail + Passwort** (geht auch in der App vom Home-Bildschirm) oder per Anmeldelink (nur im Browser). Eigene Mail-Vorlagen mit Code bräuchten einen eigenen SMTP-Server, deshalb Passwort.

Die Skripte dürfen auch mehrfach laufen, sie machen dabei nichts kaputt. Neue Dateien in `supabase/migrations/` immer in der Reihenfolge ihrer Nummer ausführen.

## 3a. Anmeldung per E-Mail (für die Webversion)

Die Webversion und die PC-Version der App können sich nicht mit Apple anmelden (das geht nur aus der iPhone-App). Stattdessen: E-Mail und Passwort. Die iPhone-App bietet E-Mail zusätzlich an, damit man auf beiden Geräten dasselbe Konto nutzt.

1. **Authentication → Providers → Email** ist in neuen Supabase-Projekten standardmäßig an. „Confirm email“ kann an bleiben.
2. **Authentication → URL Configuration**: Bei **Redirect URLs** zusätzlich `https://tomkroe.github.io/lvlme/web/**` eintragen (PC-Version, für den Bestätigungslink nach der Registrierung). Bei **Site URL** die Adresse der veröffentlichten Webversion eintragen (die Artifact-URL, die du von Claude bekommst). Das ist die Adresse, zu der der Link in der Anmelde-Mail führt.
3. Fertig – mehr ist für die Webversion nicht nötig. Beim ersten Öffnen gibt man seine E-Mail-Adresse ein, bekommt einen Link per Mail, klickt ihn an und ist angemeldet.

## 3. Anmeldung mit Apple aktivieren (für die spätere echte App)
1. Links **Authentication** → **Sign In / Providers** (je nach Version auch **Providers**) öffnen.
2. **Apple** aufklappen und einschalten.
3. Bei **Client IDs** die Bundle-ID der App eintragen: `com.tomkroe.lvlme`
4. Die Felder für „Secret Key“ bzw. Web-Anmeldung leer lassen. Die App meldet sich direkt auf dem iPhone an, dafür reicht die Bundle-ID.
5. Speichern.

Die App fragt bei Apple weder E-Mail-Adresse noch Namen ab. In Supabase steht deshalb nur eine pseudonyme Apple-Kennung (keine E-Mail, kein Name).

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
- Einladungscodes haben 6 Zeichen, gelten 7 Tage und nur für eine Person (ab Migration 0003). Für mehrere Freunde einfach mehrere Codes erzeugen (bis zu 20 offene gleichzeitig).
- Freunde sehen nur deinen Avatar (inklusive Frisur und Körper, ab Migration 0011), nie deine Schritte, deinen Schlaf oder deinen Puls.
- Nutzer können ihr Konto in der App selbst löschen (Migration 0002). Profil, Einladungen, Freundschaften und die Anmeldung verschwinden dabei sofort.
- Löschst du ein Konto unter **Authentication → Users**, verschwinden Profil, Einladungen und Freundschaften automatisch mit.
