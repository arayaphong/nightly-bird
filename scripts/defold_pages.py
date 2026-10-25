#!/usr/bin/env python3
"""Serve the root Defold Web app and retain the original game at /legacy/."""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SITE = DIST / "pages"


def main():
    web = next((DIST / "defold").glob("*/index.html"), None)
    legacy = ROOT / 'legacy/dist'
    if not web or not (legacy / "index.html").is_file():
        raise SystemExit("Build Defold Web and run npm --prefix legacy run build first.")
    shutil.rmtree(SITE, ignore_errors=True)
    SITE.mkdir(parents=True)
    shutil.copytree(web.parent, SITE, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("*.py", "*.cmd", "README-PLAY.txt"))
    shutil.copytree(legacy, SITE / 'legacy')
    shutil.copy2(ROOT / 'LICENSE', SITE / 'LICENSE')
    (SITE / '.nojekyll').write_text('')
    print("GitHub Pages site:", SITE)
    print("Defold: / ; original HTML/JS reference: /legacy/")


if __name__ == "__main__":
    main()
