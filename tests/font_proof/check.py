#!/usr/bin/env python3
"""Check native proof screenshots at the canonical 2x capture size.

Optional verification tool: requires Pillow. Capture font-proof.collection using
legacy and runtime/full-layout settings at viewport 480x840, device_scale_factor=2,
then pass the two canvas PNGs. It checks the actual rendered ink, not Lua offsets.
"""
import argparse
import json
from PIL import Image


def ink_runs(image, rectangle):
    left, top, right, bottom = rectangle
    rows = [y for y in range(top, bottom)
            if any(min(image.getpixel((x, y))[:3]) > 175 for x in range(left, right))]
    runs = []
    for y in rows:
        if not runs or y > runs[-1][1] + 1:
            runs.append([y, y])
        else:
            runs[-1][1] = y
    return runs


def check(before_path, after_path):
    before, after = (Image.open(p).convert('RGB') for p in (before_path, after_path))
    assert before.size == after.size and before.width == 960, 'Use canonical proof captures.'
    report = {}
    for label, rectangle in {
        'single_vowel': (165, 145, 210, 245),
        'single_tone': (558, 145, 600, 245),
    }.items():
        old, new = ink_runs(before, rectangle), ink_runs(after, rectangle)
        assert len(old) == len(new) == 2, (label, old, new)
        assert old == new, f'{label} moved: {old} -> {new}; check for floating marks'
        report[label] = {'before': old, 'after': new, 'positions_unchanged': True}
    old = ink_runs(before, (204, 270, 247, 365))
    new = ink_runs(after, (204, 270, 247, 365))
    assert len(old) == 2, f'Legacy overlap no longer reproduced: {old}'
    assert len(new) == 3, f'Tone, vowel and consonant should be separate: {new}'
    assert new[-1] == old[-1], 'Consonant baseline moved'
    assert abs(new[-2][0] - old[-2][0]) <= 1, 'Vowel floated upward'
    assert 1 <= new[1][0] - new[0][1] <= 8, 'Tone spacing is colliding or excessive'
    report['stacked_marks'] = {'before': old, 'after': new, 'tone_separated': True,
                               'vowel_and_consonant_positions_preserved': True}
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before')
    parser.add_argument('after')
    args = parser.parse_args()
    check(args.before, args.after)
