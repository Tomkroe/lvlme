# Avatar-Design-Prompts für Bild-KI

Stand 2026-11-13. Prompts für Midjourney, Flux, Stable Diffusion, GPT Image o. ä., um den LvlMe-Avatar neu zu entwerfen: realistischere Proportionen, Shōnen-Stilmittel, Sportkleidung, Körper folgt den Stats.

Prompts sind auf Englisch (Bildmodelle verstehen das am besten). Erklärungen auf Deutsch.

## Regeln (gelten für jeden Prompt)

- **Keine geschützten Werke nennen**: keine Serien-, Figuren- oder Verwandlungsnamen, keine „im Stil von <Serie>“. Das verstößt gegen die Projektregel in `CLAUDE.md`, und die meisten Dienste blocken solche Prompts ohnehin. Stattdessen die Stilmittel beschreiben (siehe Stil-Block).
- **Lizenz prüfen**: Für die App braucht ihr kommerzielle Nutzungsrechte. Midjourney: bezahlter Plan nötig. Flux/SD: je nach Modell-Lizenz. GPT Image: laut OpenAI-Nutzungsbedingungen nutzbar.
- **Konsistenz**: Erst ein Character Sheet erzeugen, dann alle Varianten mit Bild-Referenz (Midjourney `--cref`/`--sref`, SD: IP-Adapter/ControlNet, Flux: Redux/Kontext) ableiten. Ohne Referenz sieht jede Stimmung wie eine andere Person aus.
- **Immer transparenter oder neutraler Hintergrund** anfordern, damit die Figur in die App-Szene gesetzt werden kann.

## 1 · Stil-Block (in jeden Prompt einsetzen)

```
STYLE: 90s shonen anime character art, clean bold ink outlines, flat cel shading with hard-edged shadows, saturated warm colors, dynamic martial-arts energy, slightly stylized but anatomically correct adult proportions (about 7 heads tall), athletic build, confident expression. Full body, standing, front view, feet visible, centered, plain flat background (solid #140d08 or transparent PNG), no text, no logo, no watermark.
```

Negativ-Prompt (SD/Flux; bei Midjourney als `--no …`):

```
chibi, child, toddler, big head, small body, 3d render, photorealistic, blurry, extra limbs, extra fingers, deformed hands, text, watermark, logo, signature, cropped feet, multiple characters, background scenery
```

## 2 · Character Sheet (Schritt 1, einmalig)

Ziel: die Grundfigur festlegen, von der alle Varianten abgeleitet werden.

```
Character design sheet of one original athletic young adult fighter, [STYLE]. Short black spiky hair with warm highlights, brown eyes, friendly determined face. Outfit: orange sleeveless training top, dark blue athletic shorts with white trim, white sneakers, red cloth headband. Show three views side by side: front, three-quarter, back. Same character in all views. Neutral standing pose, arms slightly away from body.
```

Midjourney-Parameter: `--ar 3:2 --style raw --stylize 150` (oder `--niji 6` für stärkeren Anime-Look). Mehrere Durchläufe machen, das beste Sheet als Referenz behalten.

## 3 · Fünf Körpertypen (Schritt 2)

Jeweils mit Referenz auf das Character Sheet. Nur den Körper ändern, Gesicht und Outfit gleich lassen.

| Typ | Prompt-Zusatz |
|---|---|
| Einsteiger:in | `soft untrained body, slight belly, narrow shoulders, relaxed slightly slouched posture, no visible muscle definition` |
| Läufer:in | `lean wiry runner's body, slim arms and legs, narrow waist, low body fat, light muscle tone, upright posture` |
| Athletisch | `athletic V-shaped torso, broad shoulders, defined chest and abs, toned arms and legs, balanced proportions` |
| Kraftsport | `heavyweight strength athlete, very broad shoulders, thick muscular arms and legs, wide chest, thick neck, powerful stance` |
| Stämmig | `stocky powerlifter build, broad and thick, strong arms and legs, soft midsection with belly, grounded wide stance` |

Beispiel komplett:

```
Same character as reference, [STYLE]. Body type: athletic V-shaped torso, broad shoulders, defined chest and abs, toned arms and legs, balanced proportions. Front view, neutral standing pose. --cref <URL Character Sheet> --cw 80
```

`--cw` (character weight) hoch halten, damit Gesicht und Outfit bleiben.

## 4 · Fünf Stimmungen (Schritt 3)

Pro Körpertyp, mindestens für den Standard-Typ Athletisch.

| Stimmung | Prompt-Zusatz |
|---|---|
| Voll aufgeladen (charged) | `energized fighting stance, fists raised, fierce confident grin, eyes sharp, hair slightly lifted by energy wind` |
| Wach (awake) | `relaxed standing pose, calm friendly smile, arms loosely at sides, attentive eyes` |
| Stolz (proud) | `exhausted but proud, hands on hips, big satisfied grin, sweat drops on forehead and arms, flushed cheeks` |
| Müde (tired) | `tired slouched posture, half-closed eyes, dark circles under eyes, small yawn, shoulders dropped` |
| Träge (lazy) | `bored and sluggish, slumped posture, head tilted, blank half-lidded stare, arms hanging, dull expression` |

## 5 · Sechs Verwandlungsstufen (Schritt 4)

Die Stufen unterscheiden sich über die **Aura**, nicht über den Körper. Aura als eigene Ebene generieren (Figur auf Transparenz, Aura dahinter) oder direkt im Bild:

| Stufe | Prompt-Zusatz |
|---|---|
| 1 Grundform | `no aura, plain` |
| 2 Erwacht | `faint white glowing aura outline around the body, subtle` |
| 3 Entfesselt | `bright golden flame-like aura surrounding the body, small lightning sparks, hair lifted upward` |
| 4 Aufgestiegen | `intense crimson red energy aura with electric arcs, ground cracks, strong upward wind on hair and clothes` |
| 5 Meisterform | `electric blue aura with white lightning bolts and floating sparks, hair standing up, glowing eyes` |
| 6 Legende | `radiant silver-white aura with violet highlights and floating light particles, white training top, serene powerful presence` |

Nur die Aura-Beschreibung pro Stufe anpassen. Keine Verwandlungsnamen aus Serien verwenden.

## 6 · Varianten (optional, Schritt 5)

Hautton, Haar, Outfitfarben für Personalisierung:

```
skin tone: [light / medium / tan / dark brown / deep brown]
hair: [short black spiky / brown messy / blond short / red undercut / shaved]
top color: [orange / blue / white / green], shorts color: [dark blue / black / red]
```

## 7 · Workflow bis zur App

1. **Stil finden**: 10–20 Bilder mit dem Stil-Block + Character Sheet erzeugen, bestes auswählen.
2. **Character Sheet** festlegen (Referenzbild speichern unter `docs/art/reference/`).
3. **Varianten** ableiten: Körpertypen × Stimmungen mit Referenz. Minimal: 1 Körpertyp × 5 Stimmungen. Voll: 5 × 5 = 25 Figuren.
4. **Auren** separat: 6 Aura-Ebenen als transparente PNGs.
5. **Nachbearbeitung**: Hintergrund entfernen, auf einheitliche Größe bringen (z. B. 1024×1200, Füße auf gleicher Höhe), ggf. Hände/Finger retuschieren.
6. **In die App**: Aktuell zeichnet `src/avatar/avatarSvg.ts` den Avatar als Code. Mit KI-Artwork werden daraus **PNG-Ebenen** (Boden, Aura, Körper), die `Avatar.tsx` statt der SVG-Strings lädt. Die drei Ebenen und die Animation (Wippen, Aura-Flackern) bleiben gleich. Stufenlose Körperveränderung geht dann über Überblenden zwischen zwei Körpertypen statt über Regler.

## 8 · Midjourney: fertige Prompts zum Einfügen

Gilt für Midjourney v7 (Web-App oder Discord `/imagine`). Hinweise:
- **Referenzbild**: In v7 heißt die Figur-Referenz `--oref <Bild-URL> --ow 100` (Omni-Reference, Gewicht 0–1000). In v6 / Niji 6 ist es `--cref <URL> --cw 80`. Bild zuerst hochladen (Web: Imagine-Leiste → Bild ablegen; Discord: Bild posten, URL kopieren).
- **Stil-Referenz** `--sref <URL> --sw 200` hält den Zeichenstil, wenn ein Bild gefunden ist, das gefällt.
- `--style raw` reduziert Midjourneys Eigenstil, `--s 150` mittlere Stilisierung. Für stärkeren Anime-Look stattdessen `--niji 7` (dann ohne `--style raw`).
- `--ar 2:3` Hochformat für Einzelfiguren, `--ar 3:2` für Sheets. `--no` für die Negativliste.
- Personalisierung aus: `--p` **nicht** setzen.

### 8.1 Stil finden (4 Varianten, bestes wählen)

```
original athletic young adult fighter, full body, standing front view, feet visible, centered, 90s shonen anime character art, clean bold ink outlines, flat cel shading with hard-edged shadows, saturated warm colors, anatomically correct adult proportions about 7 heads tall, short black spiky hair with warm highlights, brown eyes, friendly determined face, orange sleeveless training top, dark blue athletic shorts with white trim, white sneakers, red cloth headband, plain flat dark brown background --ar 2:3 --style raw --s 150 --no chibi, child, big head, 3d render, photorealistic, blurry, extra limbs, text, watermark, logo, background scenery
```

Gleicher Prompt mit `--niji 7` statt `--style raw --s 150` als zweite Variante.

### 8.2 Character Sheet

```
character design sheet, one original athletic young adult fighter shown three times side by side: front view, three-quarter view, back view, same character, neutral standing pose, arms slightly away from body, 90s shonen anime character art, clean bold ink outlines, flat cel shading, saturated warm colors, adult proportions about 7 heads tall, short black spiky hair with warm highlights, brown eyes, orange sleeveless training top, dark blue athletic shorts with white trim, white sneakers, red cloth headband, plain flat dark brown background --ar 3:2 --style raw --s 120 --no chibi, child, 3d render, text, watermark, logo, background scenery, extra limbs
```

Bestes Sheet als `REF` speichern (`docs/art/reference/`), URL für `--oref` behalten.

### 8.3 Körpertypen (mit Referenz)

Vorlage, `<REF>` durch die Bild-URL ersetzen, `<BODY>` durch eine Zeile aus Abschnitt 3:

```
same character as reference, full body, standing front view, feet visible, centered, <BODY>, 90s shonen anime character art, clean bold ink outlines, flat cel shading, saturated warm colors, orange sleeveless training top, dark blue athletic shorts, white sneakers, red headband, plain flat dark brown background --ar 2:3 --style raw --s 120 --oref <REF> --ow 150 --no chibi, child, 3d render, text, watermark, background scenery, extra limbs
```

### 8.4 Stimmungen (mit Referenz)

Wie 8.3, `<BODY>` durch den gewählten Körpertyp und zusätzlich `<MOOD>` aus Abschnitt 4 einsetzen:

```
same character as reference, full body, feet visible, centered, <BODY>, <MOOD>, 90s shonen anime character art, clean bold ink outlines, flat cel shading, saturated warm colors, orange sleeveless training top, dark blue athletic shorts, white sneakers, red headband, plain flat dark brown background --ar 2:3 --style raw --s 120 --oref <REF> --ow 150 --no chibi, child, 3d render, text, watermark, background scenery, extra limbs
```

### 8.5 Auren (ohne Figur, als Ebene)

```
<AURA> energy aura shape alone, no person, no character, vertical flame-like silhouette of a standing human body made of glowing energy, centered, transparent-looking plain black background, 90s shonen anime effect art, clean shapes, flat cel shading --ar 2:3 --style raw --s 100 --no person, face, body, text, watermark
```

`<AURA>` aus Abschnitt 5 (z. B. `bright golden flame-like`). Hintergrund danach per Freistellen entfernen.

### 8.6 Nach dem Generieren

- **Vary (Subtle)** für kleine Korrekturen, **Vary (Strong)** nur bei neuer Pose.
- **Upscale (Subtle)** vor dem Export, dann PNG herunterladen.
- Hände prüfen; bei Fehlern den Bereich mit **Editor → Erase + Regenerate** nachbessern.
- Freistellen: Midjourney-Editor (Remove Background) oder remove.bg, danach auf 1024×1200 bringen.

## 9 · Kostenlose Alternativen zu Midjourney (Stand 2026-11-13)

Lucas PC hat nur Intel-Grafik (2 GB) und 15 GB RAM. Lokale Modelle (Flux, Stable Diffusion) laufen darauf nicht sinnvoll, also nur Web-Dienste.

| Dienst | Gratis | Kommerziell | Anmerkung |
|---|---|---|---|
| **Leonardo AI** | ca. 150 Tokens/Tag | laut Nutzungsbedingungen auch im Gratis-Tarif | Hat „Character Reference“ für konsistente Figuren. Guter Start. |
| **Gemini (Google)** | Gratis-Kontingent in der Gemini-App | Nutzungsbedingungen prüfen | Sehr gut bei Referenzbildern („gleiche Figur, andere Pose“). |
| **Playground AI** | mehrere hundert Bilder/Tag | laut Quellen ja | Einfach, Anime-Stile vorhanden. |
| **Tensor.art / SeaArt** | tägliche Credits | je nach Modell-Lizenz | Große Auswahl an Anime-Modellen, mehr Einarbeitung. |
| **PixAI** | tägliche Credits | unklar im Gratis-Tarif | Reiner Anime-Fokus. |
| **Adobe Firefly** | klein | ja, mit IP-Haftungsgarantie | Rechtlich am sichersten, Anime-Look schwächer. |
| **Ideogram** | ja | Bilder im Gratis-Tarif öffentlich | Für vertrauliche Entwürfe ungeeignet. |

Prompts aus Abschnitt 1–5 funktionieren überall. Anpassung: Midjourney-Parameter (`--ar`, `--style`, `--oref`, `--no`) weglassen, Seitenverhältnis in der Oberfläche wählen, Negativliste ins Feld „Negative Prompt“ (falls vorhanden) oder als Satz anhängen („no chibi, no 3d render, …“). Referenzbild über die jeweilige Referenz-Funktion hochladen.

Ohne KI: Illustrator auf Fiverr o. ä. (Character Sheet ca. 50–200 €), dann Varianten per KI mit Referenz ableiten.

## Offen

- Entscheidung: Sportkleidung oder Kampfanzug?
- Welcher Dienst (Midjourney, Flux, GPT Image)? Lizenz klären.
- Später: 2D-Rig (Rive/Spine) für echte Animation statt PNG-Wippen.
