#!/usr/bin/env python3
"""Check active Defold resource/module references and prevent sprite regressions."""
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parent.parent
IGNORED = {'.git', '.internal', '.cache', '.settings', '.externalToolBuilders',
           'build', 'dist', 'legacy', 'node_modules', '__pycache__'}
RESOURCES = {'.go', '.collection', '.gui', '.font', '.render', '.rivescene',
             '.rivemodel', '.sound', '.settings', '.appmanifest'}
RASTER = {'.sprite', '.tilesource', '.atlas', '.tilemap'}
MODULE_ROOTS = {'app', 'studio', 'scenarios', 'game', 'shared'}


def check():
    errors = [];count = 0
    for folder, directories, files in os.walk(ROOT):
        directories[:] = [d for d in directories if d not in IGNORED]
        for name in files:
            p = Path(folder) / name;relative = p.relative_to(ROOT)
            if p.suffix in RASTER:
                errors.append(f'{relative}: sprite resource is not allowed')
            if relative.parts[0] == 'assets' and p.suffix == '.png':
                errors.append(f'{relative}: active raster artwork is not allowed')
            if p.suffix not in RESOURCES | {'.lua', '.script', '.gui_script'}:
                continue
            source = p.read_text();count += 1
            if p.suffix in RESOURCES:
                for resource in re.findall(r'"(/[^"\\\s]+)', source):
                    if resource.startswith(('/builtins/', '/defold-rive/')):
                        continue
                    target = ROOT / resource.lstrip('/')
                    if not target.is_file() and not (resource.endswith('c') and Path(str(target)[:-1]).is_file()):
                        errors.append(f'{relative}: missing resource {resource}')
            if p.suffix in {'.lua', '.script', '.gui_script', '.go'}:
                if re.search(r'\bsprite\.|type:\s*\\?"sprite', source):
                    errors.append(f'{relative}: sprite implementation is not allowed')
                for module in re.findall(r'require\s*\(?[\'"]([^\'"]+)', source):
                    if module.split('.')[0] in MODULE_ROOTS:
                        target = ROOT / (module.replace('.', '/') + '.lua')
                        if not target.is_file():
                            errors.append(f'{relative}: missing Lua module {module}')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'PASS project layout: {count} source/resources, valid references, no sprite implementation')


if __name__ == '__main__':
    check()
