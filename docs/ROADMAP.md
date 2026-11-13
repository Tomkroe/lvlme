# LvlMe – Fahrplan für zwei parallele Sitzungen

Dieser Plan ist die gemeinsame Absprache zwischen zwei Claude-Sitzungen, die gleichzeitig am Repo arbeiten.
**Jede Sitzung liest diese Datei vor dem Start und hakt erledigte Schritte hier ab.**

## Wer macht was

| Sitzung | Zuständig für (nur diese Ordner ändern) |
| --- | --- |
| **A – Web & Backend** | `docs/web/`, `supabase/migrations/`, `docs/*.md` |
| **B – iPhone-App** | `app/`, `src/`, `package.json`, `app.json`, `eas.json`, `.github/` |

Gemeinsame Dateien (`src/types.ts`, `CLAUDE.md`, diese Datei): nur in kleinen Schritten ändern und im Commit erwähnen.

## Spielregeln für die Zusammenarbeit
1. Vor jedem Schritt: `git pull` (bzw. `git fetch` + rebase) auf `main`.
2. Nach jedem Schritt: committen, pushen, hier den Haken setzen (`[x]`) und Kürzel der Sitzung dazuschreiben.
3. Neue Datenbank-Migrationen legt **nur Sitzung A** an (sonst kollidieren die Nummern). Braucht B etwas in der Datenbank, schreibt B es unten unter „Wünsche an A“.
4. Was Tom selbst tun muss (SQL ausführen, Konten anlegen), steht unter „Für Tom“.
5. Regeln aus `CLAUDE.md` gelten: keine geschützten Figuren/Namen, Ruhetage und schlechte Tage nie bestrafen, keine Belohnung für wenig Essen oder Schlafentzug.

## Schritte

### Phase 1 – Aufräumen und angleichen
- [x] **A1** Web: Kampfkraft und Zufalls-„Kampf“ entfernt. Rangliste jetzt nach Level (bei Gleichstand Serie); HUD zeigt Serie und Rang. *(A)*
- [ ] **B1** iPhone-App: Spielregeln in `src/game/` an die Webversion angleichen – Ränge (Bronze bis Großmeister, je III/II/I, nur aufsteigend), Ernährungs-XP (+10 fürs Erfassen, +10 ab 2 L Wasser), nur abgeschlossene Tage buchen. **Kampfkraft aus der App entfernen** (Tom will sie nicht mehr; Rangliste nach Level, dann Serie). Mit Tests.

### Phase 1b – Charakter-Editor („sieht aus wie ich“)
- [x] **A5** Web: Editor für Hautton, Frisur (6), Haarfarbe, Augen, Bart, Brille, Stirnband; Live-Vorschau; wird als `avatar.look` geteilt, Freunde sehen es. Migration 0008. *(A)*
- [x] **A6** Web: Gesichtsform, Ohren, Augenbrauen, Nase, Mund, Sommersprossen, Größe in cm (140–210; genaue Zahl bleibt auf dem Gerät, geteilt wird nur eine 3-cm-Stufe `size` a–x), Körperfettanteil in % (4–45; genaue Zahl bleibt auf dem Gerät, geteilt wird nur die Figur-Stufe `fat` a–k) und Muskel-Regler (0–10); rein optisch, kein Einfluss auf XP/Level. Migration 0009 (erlaubt beliebige kurze Auswahl-Schlüssel). *(A)*
- [x] **A7** Web: Outfits – Kampfanzug (Farbe je Verwandlung), Muscle-Shirt, Trainings-Shirt, Hoodie, Kompression; Oberteil-Farbe (8) und Hose (4); Sneaker bei Sport-Outfits. *(A)*
- [ ] **B5** iPhone-App: dieselben Optionen in `src/avatar/` (Pfade/Farben aus `docs/web/index.html` → `LOOK_OPTIONS`, `HAIR` übernehmen) und Editor-Screen. **Wichtig:** Beim Hochladen des Avatar-Zustands `look` mitschicken bzw. erhalten, sonst wird es überschrieben.

### Phase 2 – Wochen-Duell (statt Zufallskampf)
Idee: Du forderst einen Freund heraus, 7 Tage zählen echte Aktivität (aktive Tage, Schritte, Belastung). Wer mehr gemacht hat, gewinnt. Rohdaten bleiben privat – Freunde sehen nur Punktestand und Sieger.
- [ ] **A2** Datenbank: Tabelle `duels` + Funktionen (herausfordern, annehmen, Stand abrufen); Punkte werden in der Datenbank aus `health_metrics` berechnet, nur die Punkte sind für den Gegner sichtbar. Migration 0008.
- [ ] **A3** Web: Duell-Bereich bei Freunden (Herausfordern, laufende Duelle mit Fortschrittsbalken, Ergebnis).
- [ ] **B2** iPhone-App: gleiche Duell-Funktion über `src/social/api.ts`.
- [ ] **Privacy-Review** für Duelle (Agent `privacy-review`, Sitzung B).

### Phase 3 – Kampfanimation als Duell-Finale
- [ ] **B3** iPhone-App: Kampfanimation (Angriffe, Treffer, Lebensbalken, K.o.) – Agent `avatar-art`.
- [ ] **A4** Web: dieselbe Animation übernehmen.

### Phase 4 – Echte iPhone-App testen
- [ ] **B4** EAS-Build und TestFlight, Apple Health direkt statt Kurzbefehl (braucht Apple-Developer-Konto, siehe „Für Tom“).
- [ ] **Privacy-Review** vor TestFlight.

### Später
- WHOOP-Anbindung (Agent `health-data`).
- Push-Benachrichtigungen (z. B. „Luca hat dich herausgefordert“).

## Für Tom
- [ ] `0007_nutrition.sql`, `0008_avatar_look.sql` und `0009_avatar_look_more.sql` im Supabase SQL Editor ausführen.
- [ ] Testkonten Luca und Tom anlegen (SQL aus dem Chat).
- [ ] Für Phase 4: Apple Developer Program (ca. 99 €/Jahr) abschließen.

## Wünsche an A (von B)
_(hier eintragen)_

## Wünsche an B (von A)
_(hier eintragen)_
