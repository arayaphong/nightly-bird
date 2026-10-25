"""Optional rendered touch regression; requires Playwright, Chromium and Pillow.

Usage: python3 tests/defold/check_equipment_browser.py http://127.0.0.1:8080/
Checks visible card states and flight status, without reading Lua internals.
"""
import io
import json
from pathlib import Path
import sys
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080/'
OUTPUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('/tmp/nightly-equipment-test')
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
    )
    context = browser.new_context(viewport={'width': 390, 'height': 844},
                                  device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    logs = []
    page.on('console', lambda message: logs.append(message.text))
    page.on('pageerror', lambda error: logs.append('PAGEERROR ' + str(error)))
    page.goto(URL)
    page.wait_for_function('window.Module && Module.calledRun', timeout=60000)

    def frames(count):
        page.evaluate('''n => new Promise(resolve => {
            const tick = () => {if (--n <= 0) resolve(); else requestAnimationFrame(tick)};
            requestAnimationFrame(tick);
        })''', count)

    frames(12)
    canvas = page.locator('canvas').bounding_box()

    def point(x, y):
        return (canvas['x'] + x / 480 * canvas['width'],
                canvas['y'] + (800 - y) / 800 * canvas['height'])

    def finger(x, y, identity):
        x, y = point(x, y)
        return {'x': x, 'y': y, 'id': identity}

    def snapshot(name):
        raw = page.screenshot()
        (OUTPUT / name).write_bytes(raw)
        return Image.open(io.BytesIO(raw)).convert('RGB')

    def status(image):
        x1, y1 = point(155, 110)
        x2, y2 = point(325, 80)
        return image.crop((round(x1), round(y1), round(x2), round(y2)))

    def toggles(image):
        def green(pixel):
            r, g, b = pixel
            return r > 100 and g > 220 and b < 150

        states = []
        for i in range(4):
            x, y = point(28 + 110 * i, 340)
            strip = image.crop((round(x)-2, round(y)-10, round(x)+3, round(y)+10))
            states.append(any(
                green(strip.getpixel((x, y)))
                for x in range(strip.width) for y in range(strip.height)
            ))
        return states

    session = context.new_cdp_session(page)

    def touch(kind, fingers):
        session.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': fingers})

    touch('touchStart', [finger(90, 500, 7)]); frames(4)
    touch('touchEnd', []); frames(6)
    initial = snapshot('equipment-mobile-none.png')
    assert toggles(initial) == [False]*4
    flight = finger(240, 155, 1)
    touch('touchStart', [flight]); frames(10)
    held = status(snapshot('equipment-mobile-held.png'))
    assert ImageChops.difference(held, status(initial)).getbbox(), 'Flight did not start'
    for i in range(4):
        button = finger(75 + 110*i, 340, 2)
        touch('touchStart', [flight, button]); frames(6)
        touch('touchEnd', [button]); frames(6)
        image = snapshot(f'equipment-mobile-toggle-{i+1}.png')
        assert toggles(image) == [j <= i for j in range(4)], f'Incorrect toggle state after item {i+1}'
        assert ImageChops.difference(held, status(image)).getbbox() is None, 'Toggle interrupted flight'
    touch('touchEnd', []); frames(110)
    all_items = snapshot('equipment-mobile-all.png')
    assert toggles(all_items) == [True]*4
    assert ImageChops.difference(status(initial), status(all_items)).getbbox() is None, 'Release did not settle'
    for i in range(4):
        button = finger(75 + 110*i, 340, 2)
        touch('touchStart', [button]); frames(6)
        touch('touchEnd', []); frames(6)
        image = snapshot(f'equipment-mobile-remove-{i+1}.png')
        assert toggles(image) == [j > i for j in range(4)], f'Incorrect removal state after item {i+1}'
        assert ImageChops.difference(status(initial), status(image)).getbbox() is None, 'Item tap started flight'
    removed = snapshot('equipment-mobile-removed.png')
    assert ImageChops.difference(initial, removed).getbbox() is None, 'Removing equipment changed the base bird'
    errors = [line for line in logs if any(s in line for s in ('ERROR:', 'PAGEERROR', 'GL_INVALID'))]
    assert not errors, errors
    result = {'two_finger_toggles': 'passed', 'removal_restores_bird': 'passed', 'errors': errors}
    (OUTPUT / 'equipment-mobile-test.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result))
    browser.close()
