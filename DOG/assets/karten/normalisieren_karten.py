#!/usr/bin/env python3
"""Create 700x980 DOG card masters from an edition's 15 original PNGs.
No original file is overwritten; generated cards are in edition/normiert/.
"""
from pathlib import Path
from PIL import Image, ImageOps
import argparse

ROOT = Path(__file__).resolve().parent
SIZE = (700, 980)
CARDS = ('1-11', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '13', 'tausch', 'joker', 'rueckseite')

def normalize(edition):
    if not edition.startswith('kartendesign-') or not edition.removeprefix('kartendesign-').isdigit():
        raise ValueError('Erwartet: kartendesign-01, kartendesign-02 usw.')
    folder = ROOT / edition
    if not folder.is_dir():
        raise FileNotFoundError(folder)
    missing = [c for c in CARDS if not (folder / (c + '.png')).is_file()]
    if missing:
        raise FileNotFoundError(f'Fehlende Karten in {edition}: {", ".join(missing)}')
    output = folder / 'normiert'
    output.mkdir(parents=True, exist_ok=True)
    for name in CARDS:
        with Image.open(folder / (name + '.png')) as img:
            img.load()
            if min(img.size) < 120:
                raise ValueError(f'Bild zu klein: {edition}/{name}.png')
            # Legacy collage crops have varying proportions; one-time resize.
            # Future editions should be created natively at 700x980.
            card = ImageOps.exif_transpose(img).convert('RGB').resize(SIZE, Image.Resampling.LANCZOS)
            card.save(output / (name + '.png'), format='PNG', optimize=True)
    for name in CARDS:
        with Image.open(output / (name + '.png')) as img:
            assert img.size == SIZE, name
    print(f'{edition}: {len(CARDS)} Karten auf {SIZE[0]}x{SIZE[1]} Pixel vereinheitlicht')

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--edition')
    ap.add_argument('--all', action='store_true')
    args = ap.parse_args()
    if args.all:
        editions = sorted(p.name for p in ROOT.iterdir() if p.is_dir() and p.name.startswith('kartendesign-') and p.name.removeprefix('kartendesign-').isdigit())
    elif args.edition:
        editions = [args.edition]
    else:
        ap.error('--edition oder --all angeben')
    if not editions:
        raise SystemExit('Keine Karteneditionen gefunden')
    for edition in editions:
        normalize(edition)
