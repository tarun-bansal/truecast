#!/usr/bin/env python3
"""Print the RGB value of one pixel: pixel.py <png> <x> <y> -> "r,g,b"."""
import sys

from PIL import Image

path, x, y = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
with Image.open(path) as image:
    r, g, b, *_ = image.convert("RGB").getpixel((x, y))
print(f"{r},{g},{b}")
