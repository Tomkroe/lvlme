# LvlMe

Dein Anime-Kämpfer lebt von deinen echten Gesundheitsdaten aus Apple Health. Freunde sehen deinen Avatar, nie deine Rohdaten.

## So kommt LvlMe auf dein iPhone

Du brauchst dafür deinen PC (Windows reicht), dein iPhone und etwa eine Stunde. Einen Mac brauchst du nicht: Die App wird bei Expo in der Cloud gebaut.

### 1. Konten anlegen (einmalig)
1. **Apple Developer Program**: auf developer.apple.com/programs mit deiner Apple-ID anmelden und beitreten. Kostet jährlich (vorher den aktuellen Preis prüfen). Die Freischaltung dauert oft ein bis zwei Tage.
2. **Expo**: kostenloses Konto auf expo.dev anlegen.
3. **Supabase** (für Freunde): Folge `docs/SUPABASE.md`. Ohne Supabase läuft die App auch, nur ohne Freunde.

### 2. PC vorbereiten (einmalig)
1. Node.js (LTS-Version) von nodejs.org installieren.
2. Git von git-scm.com installieren.
3. Eingabeaufforderung öffnen und eingeben:
   ```
   git clone https://github.com/Tomkroe/lvlme.git
   cd lvlme
   npm install
   npx eas-cli login
   npx eas-cli init
   ```
   `eas init` verknüpft das Projekt mit deinem Expo-Konto und ändert dabei `app.json`. Danach:
   ```
   git commit -am "EAS verknüpft"
   git push
   ```

### 3. iPhone anmelden (einmalig)
1. Am PC: `npx eas-cli device:create` und „Website“ wählen. Den angezeigten Link bzw. QR-Code mit dem iPhone öffnen und das Profil installieren (Einstellungen → Profil geladen → Installieren).
2. Am iPhone den Entwicklermodus einschalten: Einstellungen → Datenschutz & Sicherheit → Entwicklermodus → an, iPhone startet neu.

### 4. App bauen und installieren
1. Am PC: `npx eas-cli build --platform ios --profile preview`
2. Beim ersten Mal fragt EAS nach deiner Apple-ID und legt Zertifikate selbst an. Einfach den Vorschlägen folgen.
3. Nach etwa 15–30 Minuten zeigt EAS einen Link und QR-Code. Mit dem iPhone öffnen → „Installieren“.
4. LvlMe starten, Apple-Health-Zugriff erlauben, fertig.

### 5. Freunde dazuholen
- Freunde mit iPhone installieren die App am einfachsten über **TestFlight**: `npx eas-cli build --platform ios --profile production` und danach `npx eas-cli submit --platform ios`. In App Store Connect unter TestFlight die Freunde per E-Mail einladen.
- In der App unter „Freunde“ → „Freund einladen“ den Einladungscode per WhatsApp oder iMessage schicken.

## Für Entwicklung
- `npm run typecheck` und `npm test`
- Jeder Push nach GitHub prüft Typen, Tests und die iOS-Konfiguration automatisch (Reiter „Actions“).
- Projektregeln und Agenten-Team: `CLAUDE.md` und `.claude/agents/`
