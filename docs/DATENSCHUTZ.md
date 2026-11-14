# Datenschutzerklärung LvlMe

> **ENTWURF – nicht rechtsverbindlich.**
> Dieser Text ist ein Arbeitsentwurf und wurde noch nicht rechtlich geprüft. Vor einer Veröffentlichung im App Store muss er von einer fachkundigen Person (z. B. Anwältin/Anwalt für Datenschutzrecht) geprüft und ergänzt werden. Stellen in [eckigen Klammern] sind Platzhalter.

Stand: [Datum]

## 1. Verantwortlicher

[Name]
[Anschrift]
E-Mail: [Kontakt-E-Mail]

## 2. Kurz gesagt

- Deine Gesundheitsdaten aus Apple Health werden auf deinem iPhone ausgewertet. Sie verlassen dein iPhone nur, wenn du „Mit dem PC synchronisieren“ einschaltest – dann werden deine Tageswerte und dein Fortschritt in deinem Konto gespeichert, damit die PC-Version dasselbe zeigt. Nur du siehst sie, Freunde nie.
- Wenn du ein Konto anlegst, speichern wir auf einem Server in der EU (Frankfurt) deine Anmeldedaten (Apple-Kennung bzw. E-Mail), deinen Kämpfernamen und deinen öffentlichen Avatar (Level, Stufe, Serie, Frisur und Körper deines Avatars und – nur wenn du es erlaubst – deine Tagesform).
- Ohne Konto bleibt alles auf deinem iPhone.

## 3. Welche Daten LvlMe verarbeitet

### 3.1 Gesundheitsdaten (nur auf dem Gerät)

Mit deiner Einwilligung liest LvlMe aus Apple Health: Schritte, Training (Workouts, aktive Kalorien), Schlaf, Herzfrequenzvariabilität (HRV) und Ruhepuls. Daraus berechnet die App auf deinem iPhone deine Tagesform (Energie, Belastung, Schlaf) und den Fortschritt deines Avatars.

- Rechtsgrundlage: ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a i. V. m. Art. 6 Abs. 1 lit. a DSGVO). [prüfen]
- LvlMe schreibt keine Daten in Apple Health.
- Ohne Sync verlassen die Rohwerte dein iPhone nicht.
- Du kannst den Zugriff jederzeit in der Health-App unter Profil › Apps › LvlMe widerrufen.

### 3.2 Lokal gespeicherte Spieldaten

Auf deinem iPhone speichert LvlMe deinen Kämpfernamen, Level, XP, Münzen, gekaufte Outfits, Stats, Serie, die bereits verbuchten Tage, das gewählte Aussehen deines Avatars (Frisur und Körper), deine optional eingegebenen Körperwerte (Größe, Gewicht, Körperfettanteil; die Zahlen verlassen das Gerät nie) und Langzeitziele wie Gewichtsverlust und deine Einstellungen (z. B. „Tagesform mit Freunden teilen“). Diese Daten löschst du im Profil mit „Fortschritt zurücksetzen“ oder indem du die App löschst.

### 3.3 Konto und Freunde (optional, Server in Frankfurt)

Nur wenn du dich anmeldest (mit Apple oder mit E-Mail und Passwort), verarbeiten wir bei unserem Dienstleister Supabase (Rechenzentrum Frankfurt, EU):

- **Konto:** eine von Apple bereitgestellte Kennung und ggf. die von Apple übermittelte E-Mail-Adresse (ggf. eine anonyme Weiterleitungsadresse). [mit social-backend prüfen, was genau in Supabase Auth gespeichert wird]
- **Kämpfername:** der Name, den du in LvlMe eingibst (nicht dein Apple-Name).
- **Öffentlicher Avatar:** Level, Stufe, Serie, Zeitpunkt der letzten Aktualisierung, das gewählte Aussehen (Frisur und Körper bzw. Outfit; keine Zahlen. Schaltest du „Körpertyp automatisch“ ein, ist der Körper aus deinen Körperwerten abgeleitet, daraus lässt sich grob auf deinen Körperfettanteil schließen – nur mit deiner Einwilligung, jederzeit abschaltbar) und – nur wenn du „Tagesform mit Freunden teilen“ einschaltest – deine Tagesform (z. B. „aufgeladen“ oder „müde“). Hinweis: Aus der Tagesform lassen sich Rückschlüsse auf Schlaf und Erholung ziehen. Die Einstellung ist standardmäßig aus und jederzeit abschaltbar.
- **Freundschaften und Einladungen:** wer mit wem befreundet ist und offene Einladungscodes.

Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für Konto und Freunde; Einwilligung (Art. 6 Abs. 1 lit. a / Art. 9 Abs. 2 lit. a DSGVO) für das Teilen der Tagesform. [prüfen]

Auftragsverarbeiter: Supabase Inc. [AV-Vertrag, Unterauftragsverarbeiter und ggf. Drittlandübermittlung prüfen und ergänzen]

### 3.3a Sync mit der PC-Version (optional, Server in Frankfurt)

Nur wenn du in der iPhone-App mit E-Mail angemeldet bist, unter Profil „Mit dem PC synchronisieren“ einschaltest und der Rückfrage zustimmst, speichern wir in deinem Konto:

- **Tageswerte:** Datum, Schritte, aktive Kalorien, Trainingsminuten, Schlafdauer, HRV und Ruhepuls (angenommen werden nur Tage der letzten 60 Tage; gespeichert bleiben sie, bis du den Sync ausschaltest oder dein Konto löschst). [automatisches Löschen älterer Tage prüfen]
- **Fortschritt:** Level, XP, Stats, Serie und die bereits verbuchten Tage.

Diese Daten kann nur dein eigenes Konto lesen (Row Level Security), Freunde sehen sie nie. **Ausschalten löscht** die hochgeladenen Tageswerte und den Fortschritt aus deinem Konto; „Konto löschen“ entfernt alles endgültig.

In der PC-Version wird dein Fortschritt (Level, XP, Stats, Serie, verbuchte Tage) in deinem Konto gespeichert, sobald du dort angemeldet bist, damit iPhone und PC denselben Stand zeigen. Das sind Spieldaten, keine Messwerte.

Rechtsgrundlage: ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a DSGVO) durch Einschalten des Schalters, jederzeit widerrufbar. [prüfen, ob ein eigener Einwilligungstext vor dem ersten Einschalten nötig ist]

### 3.3b PC-Version und E-Mail-Konto

- **E-Mail-Konto:** Wenn du dich mit E-Mail und Passwort anmeldest, speichert Supabase deine E-Mail-Adresse und einen Hash deines Passworts (nicht das Passwort selbst).
- **Hosting der PC-Version:** Die PC-Version wird über GitHub Pages (GitHub Inc., USA) ausgeliefert. Dabei verarbeitet GitHub technisch notwendige Zugriffsdaten (z. B. IP-Adresse). [Drittlandübermittlung, Impressum für die Web-Version rechtlich prüfen]

### 3.4 Teilen

Wenn du dein Avatar-Bild oder einen Einladungslink teilst, entscheidest du selbst, an wen. Das geteilte Bild enthält Szene, Avatar, Name, Level und Stufe, aber keine Sprechblase mit deiner Tagesform.

### 3.5 Keine Werbung, kein Tracking

LvlMe verwendet keine Werbe- oder Analyse-Dienste und gibt keine Daten zu Werbezwecken weiter. [vor jedem Release prüfen]

## 4. Speicherdauer

- Gesundheitsdaten: ohne Sync nicht gespeichert, nur bei Bedarf aus Apple Health gelesen. Mit Sync bis zum Ausschalten (dann gelöscht) bzw. bis zum Löschen des Kontos.
- Lokale Spieldaten: bis du sie zurücksetzt oder die App löschst.
- Konto, Name, öffentlicher Avatar, Freundschaften: bis du dein Konto in der App unter Profil › Konto › „Konto löschen“ löschst. Danach werden sie endgültig entfernt. [Fristen für Backups beim Dienstleister ergänzen]

## 5. Deine Rechte

Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3), z. B. indem du den Health-Zugriff entziehst oder „Tagesform mit Freunden teilen“ ausschaltest.

Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der für deinen Wohnort zuständigen Behörde. [zuständige Behörde des Verantwortlichen ergänzen]

## 6. Kontakt

Fragen zum Datenschutz: [Kontakt-E-Mail]

## 7. Änderungen

Wir passen diese Erklärung an, wenn sich die App ändert. Die aktuelle Fassung findest du in der App unter Profil › Daten › Datenschutzerklärung.
