"""Recompile the pinned Rive Java pipeline adapters against our pinned Bob.

The extension's shipped builders target an older protobuf method descriptor.
Only their three public Java builder classes are rebuilt. Native Rive libraries,
JNI code and runtime artwork are unchanged. This patch stays in Bob's ignored
local dependency cache and is reapplied if a fresh archive is downloaded.
"""
from io import BytesIO
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import zipfile

MARKER = 'nightly-bird-bob-1.14.0-builder-compat'
PIN = 'extension-rive-0283d4ecb604953057385ca5a4fae7130c776ae9/'


def prepare(project, bob, java):
    for archive in (project / '.internal/lib').glob('*.zip'):
        with zipfile.ZipFile(archive) as original:
            jar_name = PIN + 'defold-rive/plugins/share/pluginRiveExt.jar'
            if jar_name not in original.namelist():
                continue
            data = original.read(jar_name)
            with zipfile.ZipFile(BytesIO(data)) as jar:
                if MARKER in jar.namelist():
                    return
            javac = Path(java).resolve().with_name('javac.exe' if os.name == 'nt' else 'javac')
            if not javac.exists():
                raise RuntimeError('The Rive pipeline compatibility build needs a Java 25 JDK (javac).')
            with tempfile.TemporaryDirectory(prefix='nightly-rive-plugin-') as directory:
                temporary = Path(directory)
                old_jar = temporary / 'rive.jar'
                old_jar.write_bytes(data)
                classes = temporary / 'classes'
                classes.mkdir()
                sources = []
                for name in ('RiveBuilder.java', 'RiveSceneBuilder.java', 'RiveModelBuilder.java'):
                    source = temporary / name
                    source.write_bytes(original.read(PIN + 'defold-rive/pluginsrc/com/defold/bob/pipeline/' + name))
                    sources.append(str(source))
                subprocess.run([str(javac), '-cp', os.pathsep.join((str(bob.resolve()), str(old_jar))),
                                '-d', str(classes), *sources], check=True)
                replacements = {p.relative_to(classes).as_posix(): p.read_bytes()
                                for p in classes.rglob('*.class')}
                result = BytesIO()
                with zipfile.ZipFile(BytesIO(data)) as jar, zipfile.ZipFile(result, 'w', zipfile.ZIP_DEFLATED) as patched:
                    for entry in jar.infolist():
                        patched.writestr(entry, replacements.pop(entry.filename, jar.read(entry)))
                    for name, content in replacements.items():
                        patched.writestr(name, content)
                    patched.writestr(MARKER, 'Rebuilt public Java pipeline builders against Bob 1.14.0.\n')
                output = archive.with_suffix('.compat.zip')
                try:
                    with zipfile.ZipFile(output, 'w') as patched_archive:
                        for entry in original.infolist():
                            patched_archive.writestr(entry, result.getvalue() if entry.filename == jar_name else original.read(entry))
                except BaseException:
                    output.unlink(missing_ok=True)
                    raise
        output.replace(archive)
        print('Prepared Rive Java pipeline for Bob 1.14.0.', flush=True)
        return
    raise RuntimeError('Pinned Rive library not found after Bob resolve.')
