"""Creates a dark test frame: a 0-255 gray ramp on top and a dark "game scene" below.

Turn it into the test video with:
  python3 test/make_test_video.py frame.png
  ffmpeg -loop 1 -i frame.png -t 4 -r 30 -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 1M test/testvideo.webm
"""
import sys
from PIL import Image, ImageDraw

W, H = 640, 360
img = Image.new("RGB", (W, H), (25, 25, 25))
d = ImageDraw.Draw(img)
for x in range(W):
    v = round(x / (W - 1) * 255)
    d.line([(x, 0), (x, 179)], fill=(v, v, v))
d.rectangle([240, 220, 400, 340], fill=(12, 12, 14))
d.ellipse([440, 220, 560, 340], fill=(60, 45, 40))
d.rectangle([60, 230, 140, 330], fill=(20, 30, 45))
img.save(sys.argv[1])
