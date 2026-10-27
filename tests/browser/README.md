# Browser checks

Current orientation toggle suite (0.8.24+):

```sh
python3 tests/browser/check_orientation_browser.py http://127.0.0.1:8150/ /tmp/orientation-test
```

It exercises the in-game button, both GUI profiles, touch input after switching,
every character route, retained particle/water settings, persisted selection and
phone resize. Fullscreen locking is unavailable in headless Chromium; the suite
checks that the selected layout still works when fullscreen is rejected.

Portrait regression suite (0.8.23+):

```sh
python3 tests/browser/check_portrait_browser.py http://127.0.0.1:8150/ /tmp/portrait-test
```

Requires Playwright, Chromium and Pillow. It checks home/Studio/Scenarios/System
Info navigation, all character cards, visible vectors and actions, sky particle
count sliders, water sliders, fish visibility controls, and live rotation.
Detailed motion, audio boundaries and world bounds use `tests/unit/`.

`check_landscape_browser.py` and `check_system_info_browser.py` preserve the
coordinates for 0.8.22 landscape builds. `portrait/` retains the historical
0.8.16 pixel suites, which predate particle sliders and the current world camera.
Use the current suite for new portrait releases.

The cloud Chromium GPU is SwiftShader software rendering. Its FPS measurements
are comparative cloud results, not measurements from the user's device.
