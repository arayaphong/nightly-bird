#!/usr/bin/env python3
"""Run Defold rule tests with the LuaJIT bundled in the pinned Bob JAR."""
from pathlib import Path
import platform
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def run(bob):
    system = {'Linux': 'linux', 'Darwin': 'macos', 'Windows': 'win32'}.get(platform.system())
    machine = platform.machine().lower()
    arch = 'arm64' if machine in ('aarch64', 'arm64') else 'x86_64'
    suffix = '.exe' if system == 'win32' else ''
    entry = f'libexec/{arch}-{system}/luajit-64{suffix}'
    with tempfile.TemporaryDirectory(prefix='nightly-lua-') as directory:
        executable = Path(directory) / ('luajit' + suffix)
        with zipfile.ZipFile(bob) as jar:
            executable.write_bytes(jar.read(entry))
        executable.chmod(0o755)
        for name in ('flight_rules.lua', 'red_bird.lua', 'equipment.lua', 'fish.lua', 'gestures.lua', 'hawk.lua', 'routes.lua', 'objects.lua', 'night_sky.lua', 'water.lua'):
            subprocess.run([str(executable), str(ROOT / 'tests/unit' / name)], cwd=ROOT, check=True)
