"""Puts the real YouTube before/after shots next to the popup in one image for the README."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, dest = Path(sys.argv[1]), Path(sys.argv[2])
before = Image.open(src / "youtube-before.png").convert("RGB")
after = Image.open(src / "youtube-after.png").convert("RGB")
popup = Image.open(src / "popup.png").convert("RGB")
w = 560
h = round(before.height * w / before.width)
before, after = before.resize((w, h), Image.LANCZOS), after.resize((w, h), Image.LANCZOS)
pad, label = 16, 40
H = max(pad + 2 * (label + h) + pad, label + popup.height) + pad
out = Image.new("RGB", (pad + w + pad + popup.width + pad, H), (246, 247, 249))
draw = ImageDraw.Draw(out)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
except OSError:
    font = ImageFont.load_default()
ink = (31, 35, 40)
draw.text((pad, 12), "Before", fill=ink, font=font)
out.paste(before, (pad, label))
y = label + h + pad
draw.text((pad, y + 12), "After: 'Dark game' preset", fill=ink, font=font)
out.paste(after, (pad, y + label))
draw.text((pad * 2 + w, 12), "Popup", fill=ink, font=font)
out.paste(popup, (pad * 2 + w, label))
out.save(dest / "before-after.png", optimize=True)
popup.save(dest / "popup.png", optimize=True)
print(out.size)
