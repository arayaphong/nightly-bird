#!/usr/bin/env python3
"""Assemble the existing web game and Defold demo into one Pages site."""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SITE = DIST / "pages"


def main():
    web = next((DIST / "defold").glob("*/index.html"), None)
    if not web or not (DIST / "index.html").is_file():
        raise SystemExit("Build the original website and Defold Web first.")
    shutil.rmtree(SITE, ignore_errors=True)
    SITE.mkdir(parents=True)
    for name in ("index.html", "styles", "src", "assets", "LICENSE", ".nojekyll"):
        source, target = DIST / name, SITE / name
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
    shutil.copytree(web.parent, SITE / "defold",
                    ignore=shutil.ignore_patterns("*.py", "*.cmd", "README-PLAY.txt"))
    print("GitHub Pages site:", SITE)
    print("Web demo: /defold/")


if __name__ == "__main__":
    main()
