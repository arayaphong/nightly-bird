# Browser checks

Current landscape Studio suite:

```sh
python3 tests/browser/check_landscape_browser.py http://127.0.0.1:8140/Nightly%20Bird/ /tmp/landscape-test
```

Requires Playwright, Chromium and Pillow. It checks all current menu/character/
scenery destinations, vector visibility and animation, action controls, water
defaults, independent fixture state, touch/mouse slider mapping, live rotation
and an ultrawide viewport. Detailed motion, timing, audio events and world bounds
also have fast Lua unit coverage in `tests/unit/`.

In-game System Info checks (also requires Tesseract for visible-text assertions):

```sh
python3 tests/browser/check_system_info_browser.py http://127.0.0.1:8150/ /tmp/system-info-test
```

Checks the actual game WebGL context, software/masked renderer text inside the
Defold GUI, home-menu keyboard/touch navigation, retained-scene screenshot,
render resolution at DPR 2, and live viewport rotation. The SwiftShader renderer
used by this cloud test is not evidence of the renderer on a user's device.

`portrait/` retains the pixel/input suites for the last portrait build (0.8.16).
Their coordinates intentionally describe that historical release. Run the suite
above for current builds; do not use portrait coordinates to assess landscape UI.
