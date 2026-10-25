#!/usr/bin/env python3
"""Regenerate committed Defold textures from the original SVG art (Inkscape + Pillow)."""
from copy import deepcopy
import math
from pathlib import Path
import random
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets'
SVG = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', SVG[1:-1])


def bird_frame(wing=0, dead=False, blink=False, chew=False):
    root = ET.parse(ROOT / 'assets/svg/characters/bird.svg').getroot()
    root.set('viewBox', '-20 -40 560 560')
    for group in list(root):
        key = group.get('id', '')
        if not key:
            continue
        eye = key.startswith('eye-')
        if eye:
            visible = key.endswith('-dead') if dead else key.endswith('-lid') if blink else key in ('eye-left', 'eye-right')
            if not visible:
                root.remove(group)
                continue
            group.attrib.pop('display', None)
        if key.startswith('wing-front'):
            index = list(root).index(group)
            root.remove(group)
            wrapper = ET.Element(SVG + 'g', {'transform': f'translate(300 268) rotate({-wing*58}) translate(-300 -268)'})
            wrapper.append(group)
            root.insert(index, wrapper)
        if key == 'wing-back':
            group.set('transform', f'translate(272 258) rotate({-wing*58*.9})')
        if chew and key == 'beak-upper':
            group.set('transform', 'translate(424 326) rotate(-16)')
        if chew and key == 'beak-lower':
            group.set('transform', 'translate(424 326) rotate(23)')
    return ET.tostring(root)


def render(source, output, size):
    output_svg = output.with_suffix('.svg')
    output_svg.write_bytes(source)
    subprocess.run(['inkscape', str(output_svg), '--export-type=png', f'--export-filename={output}',
                    f'--export-width={size}', f'--export-height={size}'], check=True, capture_output=True)


def main():
    from PIL import Image
    OUT.mkdir(parents=True, exist_ok=True)
    # One sheet keeps native sprite animation and asset upload straightforward.
    frames = [bird_frame(math.sin(i * math.tau / 8)) for i in range(8)]
    frames += [bird_frame(), bird_frame(dead=True), bird_frame(blink=True), bird_frame(chew=True)]
    fly = ET.parse(ROOT / 'assets/svg/items/firefly.svg').getroot()
    fly.set('viewBox', '-10 -12 20 20')
    frames += [ET.tostring(fly), ET.tostring(fly)]
    frames += [b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="120" fill="white"/></svg>',
               b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M0 0H256V256H0Z" fill="white"/></svg>']
    sheet = Image.new('RGBA', (1024, 1024))
    with tempfile.TemporaryDirectory() as folder:
        for i, source in enumerate(frames):
            dest = Path(folder) / f'{i}.png'
            render(source, dest, 256)
            sheet.paste(Image.open(dest).convert('RGBA'), (i % 4 * 256, i // 4 * 256))
    sheet.save(OUT / 'game.png', optimize=True)
    # Reproduce the original painter's palette/moon as a static native sprite.
    rng = random.Random(427)
    stars = ''.join(f'<circle cx="{rng.randrange(480)}" cy="{rng.randrange(620)}" r="{rng.uniform(.5,1.6):.2f}" fill="#dceaff" opacity="{rng.uniform(.25,.85):.2f}"/>' for _ in range(95))
    scene = f'''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="800" viewBox="0 0 480 800">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#05071a"/><stop offset=".7" stop-color="#0d1440"/><stop offset="1" stop-color="#1d2a5c"/></linearGradient>
    <linearGradient id="water" x2="0" y2="1"><stop stop-color="#123a5c"/><stop offset="1" stop-color="#030914"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#fff0cd" stop-opacity=".18"/><stop offset="1" stop-color="#fff0cd" stop-opacity="0"/></radialGradient></defs>
    <path d="M0 0H480V640H0Z" fill="url(#sky)"/>{stars}
    <circle cx="384" cy="112" r="140" fill="url(#glow)"/>
    <circle cx="384" cy="112" r="28" fill="#fff3d6"/><circle cx="396.6" cy="106.4" r="25.2" fill="#0b1236"/>
    <path d="M0 640H480V800H0Z" fill="url(#water)"/>
    </svg>'''
    with tempfile.TemporaryDirectory() as folder:
        source = Path(folder) / 'scene.svg'
        source.write_text(scene)
        subprocess.run(['inkscape', str(source), '--export-type=png', f'--export-filename={OUT / "scene.png"}'], check=True, capture_output=True)
    print('Generated game.png and scene.png from original artwork.')

if __name__ == '__main__':
    main()
