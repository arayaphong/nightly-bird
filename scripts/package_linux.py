#!/usr/bin/env python3
"""Package an existing Linux release bundle with a working-directory launcher."""
from pathlib import Path
import configparser
import hashlib
import json
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ('NightlyBird.x86_64', 'game.arci', 'game.arcd', 'game.projectc', 'game.dmanifest')


def package():
    config = configparser.ConfigParser(interpolation=None)
    config.read(ROOT / 'game.project')
    version = config['project']['version']
    source = ROOT / 'dist/linux/Nightly Bird'
    for name in RUNTIME:
        if not (source / name).is_file():
            raise RuntimeError('Build Linux first: python3 scripts/defold.py build --target linux')
    name = f'nightly-bird-{version}-linux-x86_64'
    output = ROOT / 'dist/linux-package'
    folder = output / name
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    for file in RUNTIME:
        shutil.copy2(source / file, folder / file)
    (folder / 'NightlyBird.x86_64').chmod(0o755)
    (folder / 'run.sh').write_text('#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")"\nexec ./NightlyBird.x86_64 "$@"\n')
    (folder / 'run.sh').chmod(0o755)
    (folder / 'README.txt').write_text(f'''Nightly Bird {version} — Linux x86_64 Release

Extract the entire archive, open this directory and run:
    ./run.sh

The rotation icon at the top center switches portrait/landscape.
The FPS counter is at the top right. Open Studio to test characters/scenery.

Requires 64-bit Linux with glibc 2.35+, a Vulkan loader and a Vulkan 1.3 capable
driver/GPU. OpenAL and the linked X11 libraries must also be installed.
This is a native Defold + Rive application; no browser or editor is required.
The engine selects Wayland in a Wayland session, or X11 in an X11 session.
If needed on a desktop with XWayland, try: XDG_SESSION_TYPE=x11 ./run.sh

Tested on native Wayland with Weston 14.0.2 and Mesa llvmpipe in the cloud.
Cloud software rendering FPS does not measure performance on your GPU.
''', encoding='utf-8')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    hashes = {file: hashlib.sha256((folder / file).read_bytes()).hexdigest() for file in RUNTIME}
    info = {'version': version, 'defold': '1.14.0', 'platform': 'x86_64-linux',
            'variant': 'release', 'graphics': 'Vulkan', 'source_commit': commit,
            'source_dirty': dirty, 'sha256': hashes}
    (folder / 'build-info.json').write_text(json.dumps(info, indent=2) + '\n')
    archive = output / (name + '.tar.gz')
    with tarfile.open(archive, 'w:gz') as tar:
        tar.add(folder, arcname=name)
    print(json.dumps({'archive': str(archive), 'size': archive.stat().st_size,
                      'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
                      'source_commit': commit, 'source_dirty': dirty}))
    return archive


if __name__ == '__main__':
    package()
