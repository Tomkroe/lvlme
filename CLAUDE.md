# LvlMe

Eine App für iPhone und PC (Windows, als installierbare Web-App aus demselben Code; später auch Android), in der ein Anime-Avatar im Stil klassischer Shōnen-Serien *du selbst* bist. Er reagiert wie ein Tamagotchi auf deine echten Gesundheitsdaten aus Apple Health (später WHOOP): gut geschlafen → leuchtende Aura, viel trainiert → verschwitzt und stolz, tagelang gesessen → träge. Level, Stats und Verwandlungsstufen wachsen langfristig. Freunde sehen deinen Avatar, nie deine Rohdaten.

Konzept: siehe Konzeptdokument „LvlMe – Konzept“ (claude.ai). Klickbare Demo: „Fitness-Avatar Demo“.

## Technik
- Expo (React Native), Expo SDK 58, Development Build (kein Expo Go), Builds über EAS
- HealthKit über `@kingstinct/react-native-healthkit` (+ `react-native-nitro-modules`), nur Lesezugriff
- Avatar als SVG über `react-native-svg`, später ggf. Rive
- **Ein Code für iPhone und PC:** Expo Web baut dieselbe App für den Browser. CI veröffentlicht sie unter https://tomkroe.github.io/lvlme/app/ (Ordner `docs/app/`, nie von Hand ändern). Am PC über Edge/Chrome „Als App installieren“.
- Plattform-Weichen über Dateiendungen: `*.web.ts(x)` ersetzt im Web die native Datei (z. B. `healthkit.web.ts`, `AppleButton.web.tsx`); solche Dateien **ohne** Endung importieren. Bildschirmgröße über `useScreenSize()` (`src/ui/layout.ts`), Rückfragen über `confirm()` (`src/ui/confirm.ts`), nicht `Alert.alert`.
- Rohdaten bleiben auf dem iPhone. Nur mit Einwilligung (Schalter „Mit dem PC synchronisieren“ mit Rückfrage, nur bei E-Mail-Konto; Ausschalten löscht die Daten im Konto über `clear_synced_data`) gehen Tageswerte und Fortschritt ins **eigene** Konto (Migration 0012); die PC-Version liest sie von dort. Freunde sehen nur den Avatarzustand.
- Anmeldung: auf allen Geräten E-Mail und Passwort (gleiches Konto auf iPhone und PC), auf dem iPhone zusätzlich Apple
- Backend: Supabase (Auth mit Apple, Postgres mit RLS), Teilen über iOS-Teilen-Menü

## Ordner
- `src/types.ts` gemeinsame Typen · `src/game/` Spielregeln (reine Funktionen + Tests)
- `src/health/` Apple Health · `src/avatar/` Avatar (Bild-Ebenen aus `assets/avatar/`, Aura als SVG) · `src/social/` Konto & Freunde · `src/share/` Teilen
- `assets/avatar/` Körper- (`body*.png`, `outfit-*.png`) und Kopf-PNGs (`head-*.png`), freigestellt, Hals und Füße auf gleicher Höhe, daher frei kombinierbar; Quellen in `raw/`, Prompts in `docs/Avatar-Design-Prompts.md`
- `app/` Screens (Expo Router) · `supabase/migrations/` Datenbankschema
- `public/` Vorlage und Manifest der PC-Version · `docs/web/` alter Web-Prototyp (wird abgelöst, sobald alles in der App ist)
- Prüfen: `npm run typecheck`, `npm test`; CI auf GitHub macht beides plus Prebuild-Probe und baut die PC-Version

## Agenten-Team (`.claude/agents/`)
| Agent | Zuständig für |
| --- | --- |
| `health-data` | HealthKit/WHOOP lesen, Datenmapping, Tageswerte |
| `game-balance` | Formeln für Energie, XP, Level, Verwandlungen; Simulationen |
| `avatar-art` | Avatar-Zeichnung, Stimmungen, Animationen |
| `app-ui` | Screens, Navigation, Zustand in der App |
| `social-backend` | Konto, Freunde, Einladungen, Teilen, Supabase |
| `privacy-review` | Prüft Datenschutz und App-Review-Regeln, ändert nichts |

## Zusammenarbeit
1. `health-data` liefert typisierte Tageswerte (`DailyMetrics`) – das ist die einzige Schnittstelle zu Gesundheitsdaten.
2. `game-balance` rechnet aus `DailyMetrics` den `AvatarState` (Stimmung, Energie, XP, Stats). Reine Funktionen mit Tests.
3. `avatar-art` zeichnet aus `AvatarState` den Avatar. Kein Zugriff auf Gesundheitsdaten.
4. `social-backend` liefert Konto, Freunde und Teilen über `src/social/api.ts` und `src/share/index.ts`.
5. `app-ui` verbindet alles zu Screens und kümmert sich um Navigation und Speicher.
6. `privacy-review` prüft vor jedem TestFlight- oder Store-Build und bei jeder Änderung an Datenzugriff oder Backend.

Gemeinsame Typen liegen in `src/types.ts`. Wer sie ändert, sagt es in der Übergabe.

## Regeln für alle
- Sprache in der App: Deutsch. Code und Bezeichner: Englisch.
- Keine Figuren, Namen, Symbole, Frisuren oder Verwandlungsnamen aus Dragon Ball oder anderen geschützten Werken.
- Ruhetage und schlechte Tage werden nie bestraft; keine Belohnung für wenig Essen oder Schlafentzug.
- Kleine, überprüfbare Schritte; jeder Agent beendet seine Arbeit mit einer kurzen Übergabe (was geändert, was offen, wer als Nächstes).
