"""Draws the sun icon of the extension at 16, 48 and 128 px."""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out_dir = Path(sys.argv[1])
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=230, fill=(31, 35, 40, 255))
c = S / 2
amber = (245, 158, 11, 255)
for i in range(8):
    a = math.radians(i * 45)
    r1, r2 = 300, 420
    d.line(
        [(c + r1 * math.cos(a), c + r1 * math.sin(a)), (c + r2 * math.cos(a), c + r2 * math.sin(a))],
        fill=amber,
        width=88,
    )
    for r in (r1, r2):
        x, y = c + r * math.cos(a), c + r * math.sin(a)
        d.ellipse([x - 44, y - 44, x + 44, y + 44], fill=amber)
d.ellipse([c - 210, c - 210, c + 210, c + 210], fill=amber)
for size in (16, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(out_dir / f"icon{size}.png")
