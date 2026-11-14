#!/usr/bin/env python3
"""LvlMe: alle Design-Teile mit Gemini-Bildmodellen erzeugen (im Stil von Lucas Avatar in assets/avatar/).

Benötigt:  pip install google-genai pillow
Schlüssel: export GEMINI_API_KEY=...   (aus Google AI Studio, mit aktivierter Abrechnung)

Beispiele:
  python tools/gen_assets.py --dry-run                      # nur Prompts ausgeben (zum Einfügen in die Gemini-App)
  python tools/gen_assets.py --style-ref tools/style_ref.png --only hair
  python tools/gen_assets.py --style-ref tools/style_ref.png --only mood,aura --count 2

Modus = Hintergrund des Teils:
  magenta  Figur auf Magenta (#FF00FF), wird automatisch transparent
  aura     nur der Leuchteffekt auf Schwarz, in der App mit Mischmodus "Aufhellen" (screen) über die Figur legen
  scene    Hintergrundbild ohne Figur, bleibt unverändert
  icon     Symbol auf Magenta, wird transparent
"""
import argparse, io, os, sys, time
from pathlib import Path

STYLE = (
    "90s shonen anime art, clean bold dark ink outlines, flat cel shading with hard-edged shadows, "
    "saturated warm colors, athletic adult proportions about 7 heads tall. Original design, "
    "no existing characters, no logos, no text, no watermark."
)
STYLE_ENV = (
    "90s shonen anime art, clean bold dark ink outlines, flat cel shading with hard-edged shadows, "
    "saturated warm colors. Original design, no existing characters, no logos, no text, no watermark."
)
KEEP = (
    "Use the reference image as the exact template: same canvas size, same full-body front view, same standing "
    "pose, same proportions, same line weight, same shading, same position of neck and feet. "
)
BG_MAGENTA = "Aspect ratio 2:3 portrait (624 x 936 px). Perfectly flat solid magenta background (#FF00FF), no gradient, no floor, no cast shadow, whole figure fully visible."

# Kategorie -> (Modus, was sich gegenueber der Vorlage aendert, {Schluessel: Beschreibung})
ASSETS = {
    # ---------- Figur (Vorlage wird abgewandelt) ----------
    "hair": ("magenta", "Change ONLY the hairstyle, keep face, body and clothes identical", {
        "sidepart": "neat side part, short", "quiff": "short quiff swept up at the front", "crew": "classic short crew cut",
        "curly": "short curly hair", "dreads": "shoulder length dreadlocks", "bun": "long hair tied in a top bun",
        "ponytail": "long hair in a high ponytail", "bob": "chin length bob with fringe", "mohawk": "short mohawk",
        "braids": "two long braids", "bald": "completely bald head", "waves": "medium length wavy hair swept back"}),
    "haircolor": ("magenta", "Change ONLY the hair color, keep everything else identical", {
        "black": "black hair", "darkbrown": "dark brown hair", "brown": "chestnut brown hair", "blonde": "golden blonde hair",
        "red": "copper red hair", "grey": "silver grey hair"}),
    "skin": ("magenta", "Change ONLY the skin color of face, arms and legs, keep everything else identical", {
        "light": "very light skin", "fair": "light-medium skin", "medium": "medium skin", "tan": "tanned golden-brown skin",
        "brown": "brown skin", "dark": "dark brown skin"}),
    "eyes": ("magenta", "Change ONLY the eye color, keep everything else identical", {
        "brown": "brown eyes", "dark": "very dark brown eyes", "blue": "blue eyes", "green": "green eyes", "grey": "grey eyes"}),
    "face": ("magenta", "Change ONLY the face details, keep hair, body and clothes identical", {
        "freckles": "add freckles across nose and cheeks", "stubble": "add light stubble", "beard": "add a short full beard",
        "glasses": "add simple sporty glasses", "scar": "add a small scar through the left eyebrow",
        "friendly": "softer friendly eyes and a gentle smile"}),
    "outfit": ("magenta", "Change ONLY the clothing, keep head, hair, face and body shape identical", {
        "running": "lightweight running singlet and short split-leg running shorts, running shoes",
        "compression": "tight long-sleeve compression shirt and compression shorts",
        "football": "football jersey with stripes (no numbers, no logos), shorts and long socks",
        "boxing": "boxing gloves, boxing shorts with wide waistband, no shirt",
        "yoga": "fitted tank top and yoga leggings, barefoot",
        "swim": "swim trunks only, barefoot",
        "cycling": "cycling jersey and padded cycling shorts, cycling shoes",
        "tracksuit": "zip tracksuit jacket and matching track pants"}),
    "accessory": ("magenta", "Change ONLY by adding this accessory, keep everything else identical", {
        "headband": "red cloth headband", "sweatband": "white sweatband on the forehead", "cap": "sports cap",
        "towel": "towel around the neck", "watch": "sports watch on the left wrist", "backpack": "small gym backpack",
        "bottle": "water bottle in the right hand", "bandages": "wrapped hand bandages on both hands"}),
    "body": ("magenta", "Change ONLY the body build, keep head, hair, face and clothes identical", {
        "slim": "slim lean build with narrow shoulders", "soft": "soft untrained build with slight belly",
        "strong": "very muscular heavyweight build", "stocky": "stocky powerlifter build",
        "female_athletic": "athletic female build with the same face and hair"}),
    # ---------- Stimmungen (Pose und Gesicht) ----------
    "mood": ("magenta", "Change ONLY the pose and facial expression, keep hair, body type and clothes identical", {
        "charged": "energized fighting stance, fists raised, fierce confident grin, sharp eyes, hair lifted slightly by wind",
        "awake": "relaxed standing pose, calm friendly smile, arms loosely at the sides, attentive eyes",
        "proud": "exhausted but proud, hands on hips, big satisfied grin, sweat drops on forehead and arms, flushed cheeks",
        "tired": "tired slouched posture, half-closed eyes, dark circles under the eyes, small yawn, shoulders dropped",
        "lazy": "bored and sluggish, slumped posture, head tilted, blank half-lidded stare, arms hanging"}),
    # ---------- Auren fuer die Verwandlungsstufen (eigene Ebene) ----------
    "aura": ("aura", "ONLY the glowing aura effect that surrounds the silhouette of the reference figure, without the figure itself, "
             "the inside of the silhouette left empty black, on a pure black background (#000000)", {
        "1_awakened": "faint white glowing outline, subtle",
        "2_unleashed": "bright golden flame-like aura with small lightning sparks, upward wind",
        "3_ascended": "intense crimson red energy aura with electric arcs and strong upward wind",
        "4_master": "electric blue aura with white lightning bolts and floating sparks",
        "5_legend": "radiant silver-white aura with violet highlights and floating light particles"}),
    # ---------- Hintergruende (ohne Figur) ----------
    "scene": ("scene", "Background scene for a fitness game, portrait format 4:5, no people, no characters, empty open ground in the lower "
              "middle where a standing figure will be placed later, horizon at about one third from the bottom", {
        "mountains": "mountain training spot at sunrise with a dirt path", "gym": "modern gym interior with weights and mirrors",
        "football": "football pitch at evening with floodlights", "track": "running track in a stadium",
        "court": "outdoor basketball court at golden hour", "dojo": "traditional wooden dojo with tatami mats",
        "rooftop": "city rooftop at sunset with skyline", "park": "city park with trees and a morning mist",
        "beach": "sandy beach with calm waves in the morning", "home": "cozy living room with a yoga mat on the floor"}),
    # ---------- Symbole fuer die Oberflaeche ----------
    "rank": ("icon", "Emblem icon for a rank badge, centered, symmetrical shield shape with a star, no text, no numbers", {
        "bronze": "bronze metal colors", "silver": "silver metal colors", "gold": "gold metal colors",
        "platinum": "platinum white-blue colors with a gem", "diamond": "cyan diamond crystal colors with sparkles"}),
    "icon": ("icon", "Simple game UI icon, centered, thick outline, flat colors, no text", {
        "streak": "flame for a daily streak", "xp": "lightning bolt for experience points", "energy": "battery with a bolt for energy",
        "sleep": "crescent moon with stars", "steps": "sneaker footprint", "water": "water drop", "level_up": "burst with upward arrow",
        "trophy": "trophy cup", "heart": "heart for heart rate", "friends": "two small head silhouettes"}),
}

def build_prompt(cat, key):
    mode, change, variants = ASSETS[cat]
    desc = variants[key]
    if mode == "magenta":
        return f"{STYLE} {KEEP}{change}: {desc}. {BG_MAGENTA}"
    if mode == "aura":
        return f"{STYLE} {KEEP}{change}: {desc}. Aspect ratio 2:3 portrait (624 x 936 px), the aura centered on the figure."
    if mode == "scene":
        return f"{STYLE_ENV} {change}: {desc}. No text, no watermark."
    return f"{STYLE_ENV} {change}: {desc}. Square 1:1 image. Flat solid magenta background (#FF00FF), no gradient, no shadow."

def key_out_magenta(png_bytes, tol=90):
    from PIL import Image
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            if abs(r - 255) + g + abs(b - 255) < tol * 1.5 and g < 110:
                px[x, y] = (r, g, b, 0)
    out = io.BytesIO(); im.save(out, "PNG"); return out.getvalue()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--style-ref", help="PNG mit dem aktuellen LvlMe-Stil als Vorlage (tools/style_ref.png)")
    ap.add_argument("--only", help="Kategorien, kommagetrennt (z. B. hair,mood,aura)")
    ap.add_argument("--count", type=int, default=1, help="Varianten pro Teil")
    ap.add_argument("--out", default="assets_out")
    ap.add_argument("--model", default=os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"))
    ap.add_argument("--no-key", action="store_true", help="Magenta nicht transparent machen")
    ap.add_argument("--dry-run", action="store_true", help="Nur Prompts ausgeben, nichts erzeugen")
    a = ap.parse_args()

    cats = a.only.split(",") if a.only else list(ASSETS)
    jobs = []
    for c in cats:
        if c not in ASSETS:
            sys.exit(f"Unbekannte Kategorie: {c}. Möglich: {', '.join(ASSETS)}")
        jobs += [(c, k) for k in ASSETS[c][2]]

    if a.dry_run:
        print("Vorlage in jedem Chat zuerst hochladen: tools/style_ref.png (nicht bei scene)\n")
        for c, k in jobs:
            print(f"[{c}/{k}]  (Modus: {ASSETS[c][0]})\n{build_prompt(c, k)}\n")
        print(f"{len(jobs)} Teile × {a.count} = {len(jobs) * a.count} Bilder")
        return

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY fehlt (Schlüssel aus Google AI Studio, Abrechnung aktiviert).")
    from google import genai
    from google.genai import types
    from PIL import Image
    client = genai.Client(api_key=key)
    ref = Image.open(a.style_ref) if a.style_ref else None
    out = Path(a.out)

    print(f"{len(jobs) * a.count} Bilder mit {a.model}. Mit Strg+C abbrechen.")
    for c, k in jobs:
        mode = ASSETS[c][0]
        (out / c).mkdir(parents=True, exist_ok=True)
        for i in range(a.count):
            path = out / c / f"{k}_{i + 1}.png"
            if path.exists():
                continue
            prompt = build_prompt(c, k)
            use_ref = ref is not None and mode != "scene"
            contents = [prompt] if not use_ref else ["Match the art style of this reference image exactly. " + prompt, ref]
            try:
                r = client.models.generate_content(
                    model=a.model, contents=contents,
                    config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))
                data = next((p.inline_data.data for p in r.candidates[0].content.parts if getattr(p, "inline_data", None)), None)
                if data is None:
                    print(f"  kein Bild: {c}/{k}"); continue
                if not a.no_key and mode in ("magenta", "icon"):
                    data = key_out_magenta(data)
                path.write_bytes(data); print(f"  ok  {path}")
            except Exception as e:
                print(f"  Fehler {c}/{k}: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
