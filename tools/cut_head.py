#!/usr/bin/env python3
"""Aus Ganzkörperbildern (Gemini, Magenta-Hintergrund) freigestellte Köpfe schneiden, passend zu assets/avatar/head-*.png.

Benutzung:  python tools/cut_head.py bild1.png bild2.png ...   -> head_<name>.png im Ordner out_heads/
Format wie Lucas Köpfe: 624 x 936, Schnitt an der Halslinie (Zeile 226), Hintergrund transparent.
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

CUT = 226
out = Path("out_heads"); out.mkdir(exist_ok=True)
for f in sys.argv[1:]:
    im = Image.open(f).convert("RGB").resize((624, 936), Image.LANCZOS)
    a = np.array(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alpha = np.where((r - g > 50) & (b - g > 50), 0, 255).astype("uint8")
    alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))
    alpha[CUT:, :] = 0
    Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA").save(out / f"head_{Path(f).stem}.png")
    print("ok", f)
