"""Regression checks for SVG contour conversion (requires fontTools)."""
from pathlib import Path
import math
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from defold_rive_bird import contours, transform


class ContourTests(unittest.TestCase):
    def test_open_ellipse_keeps_its_final_cubic_segment(self):
        points, closed = contours(
            'M82 0 A82 74 0 0 1 -82 0 A82 74 0 0 1 82 0',
            transform(None),
        )[0]
        self.assertFalse(closed)
        self.assertEqual(len(points), 5)
        self.assertLess(math.dist(points[0]['p'], points[-1]['p']), 1e-5)
        # The last quarter must curve from the top of the head to its right edge.
        self.assertAlmostEqual(points[-2]['p'][1], -74)
        self.assertIsNotNone(points[-2]['o'])
        self.assertIsNotNone(points[-1]['i'])

    def test_explicitly_closed_ellipse_reconnects_last_to_first(self):
        points, closed = contours(
            'M82 0 A82 74 0 0 1 -82 0 A82 74 0 0 1 82 0 Z',
            transform(None),
        )[0]
        self.assertTrue(closed)
        self.assertEqual(len(points), 4)
        self.assertIsNotNone(points[-1]['o'])
        self.assertIsNotNone(points[0]['i'])

    def test_original_head_eye_and_brow_loops_keep_all_four_quarters(self):
        svg = ET.parse(ROOT / 'assets/svg/characters/bird.svg').getroot()
        checked = 0
        for group in svg:
            if group.get('id') not in ('cheek', 'eye-left', 'eye-right', 'eyebrows'):
                continue
            for path in group:
                if not path.tag.endswith('path'):
                    continue
                with self.subTest(group=group.get('id'), path=path.get('d')):
                    points, closed = contours(path.get('d'), transform(path.get('transform')))[0]
                    self.assertFalse(closed)
                    self.assertEqual(len(points), 5)
                    self.assertLess(math.dist(points[0]['p'], points[-1]['p']), 1e-5)
                    for start, end in zip(points, points[1:]):
                        self.assertIsNotNone(start['o'])
                        self.assertIsNotNone(end['i'])
                    checked += 1
        self.assertEqual(checked, 9)


if __name__ == '__main__':
    unittest.main()
