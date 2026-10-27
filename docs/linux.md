# Linux release

Build and package without the GUI editor:

```sh
python3 scripts/defold.py build --target linux
python3 scripts/package_linux.py
```

The target is `x86_64-linux`, with `--variant release` and stripped engine symbols.
The pinned Rive extension selects Vulkan on Linux. This uses the same committed
Lua/Rive resources as Web/Android, including Thai text shaping and the FPS overlay.
No APK build or CI job is added.

The raw bundle is `dist/linux/Nightly Bird/`. Packaging produces
`dist/linux-package/nightly-bird-<version>-linux-x86_64.tar.gz`, including the five
runtime files, an executable `run.sh`, README and source/checksum metadata. Extract
the complete archive and run `./run.sh`; the launcher selects the correct working
directory. No editor or web server is needed.

The executable requires glibc 2.35+, Vulkan loader/driver support for Vulkan 1.3,
OpenAL and the linked X11 libraries. GLFW 3.4 selects the desktop session's native
Wayland or X11 backend. Do not force X11 by default. `XDG_SESSION_TYPE=x11 ./run.sh`
is an optional fallback when the desktop provides XWayland.

Version 0.8.25 was checked in Weston 14.0.2 with `DISPLAY` empty, Wayland protocol
traces and Mesa llvmpipe Vulkan. This is a software rendering QA environment,
not a performance benchmark for the user's GPU. The virtual compositor must expose
an input seat: the stock GLFW build crashes in `_glfwInitWayland` in a headless
compositor without one. Runtime data/cache parent directories must also exist.
These are test-harness requirements; the distributed bundle does not include
Weston, Mesa, synthetic input, or any cloud-specific environment overrides.

Version 0.8.26 removes unnecessary numeric Rive property polling in the shared
sky/water/fish fixture. See [performance.md](performance.md) for the CPU profile,
controlled comparison and limits of cloud performance measurements.
