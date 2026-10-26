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

`portrait/` retains the pixel/input suites for the last portrait build (0.8.16).
Their coordinates intentionally describe that historical release. Run the suite
above for current builds; do not use portrait coordinates to assess landscape UI.
