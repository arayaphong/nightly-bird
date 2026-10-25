#!/usr/bin/env python3
"""Build Nightly Bird in Defold for Web or Android, or serve its HTML5 bundle."""

import argparse
import functools
import hashlib
import http.server
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import zipfile

from defold_test import run as test_rules
from check_project import check as check_project
from defold_rive_plugin import prepare as prepare_rive_plugin

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT
OUTPUT = ROOT / "dist" / "defold"
ANDROID_OUTPUT = ROOT / "dist" / "android"
VERSION = "1.14.0"
BOB_SHA256 = "d8cbe667757ca1c5f4dfd251bc98660c35e7a65ac84bf0207ccef7607de6d1a1"
BOB_URL = f"https://github.com/defold/defold/releases/download/{VERSION}/bob.jar"


def checksum(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def build(target):
    java = os.environ.get("DEFOLD_JAVA") or shutil.which("java")
    if not java:
        raise RuntimeError("Install Java 25+, or set DEFOLD_JAVA to its java executable.")
    result = subprocess.run([java, "-version"], capture_output=True, text=True, check=True)
    version = re.search(r'version "(\d+)', result.stderr + result.stdout)
    if not version or int(version[1]) < 25:
        raise RuntimeError("Bob 1.14.0 requires Java 25+. Set DEFOLD_JAVA to Java 25.")

    bob = Path(os.environ.get("DEFOLD_BOB_JAR", ROOT / ".cache" / "defold" / VERSION / "bob.jar"))
    if not bob.exists():
        bob.parent.mkdir(parents=True, exist_ok=True)
        temporary = bob.with_suffix(".download")
        print(f"Downloading Defold Bob {VERSION} (about 219 MiB)...", flush=True)
        try:
            with urllib.request.urlopen(BOB_URL, timeout=120) as response, temporary.open("wb") as destination:
                shutil.copyfileobj(response, destination)
            if checksum(temporary) != BOB_SHA256:
                raise RuntimeError("Bob download checksum mismatch.")
            temporary.replace(bob)
        finally:
            temporary.unlink(missing_ok=True)
    if checksum(bob) != BOB_SHA256:
        raise RuntimeError(f"Expected the official Bob {VERSION} checksum; check {bob}.")

    check_project()
    test_rules(bob)

    options = shlex.split(os.environ.get("DEFOLD_JAVA_OPTS", ""))
    # Java does not automatically honor the HTTP(S)_PROXY used by cloud runners.
    for protocol in ("http", "https"):
        proxy = os.environ.get(f"{protocol.upper()}_PROXY")
        if proxy:
            parsed = urllib.parse.urlparse(proxy)
            if parsed.hostname:
                options += [f"-D{protocol}.proxyHost={parsed.hostname}",
                            f"-D{protocol}.proxyPort={parsed.port or 80}"]
    platform = "wasm-web" if target == "web" else "arm64-android"
    architectures = "wasm-web" if target == "web" else "arm64-android"
    output = OUTPUT if target == "web" else ANDROID_OUTPUT
    extra = [] if target == "web" else ["--bundle-format", "apk", "--strip-executable"]
    if build_server := os.environ.get("DEFOLD_BUILD_SERVER"):
        extra += ["--build-server", build_server]
    # Avoid selecting an old bundle after the project title changes.
    shutil.rmtree(output, ignore_errors=True)
    subprocess.run([java, *options, "-jar", str(bob.resolve()),
                    "--root", str(PROJECT), "resolve"], check=True, cwd=ROOT)
    prepare_rive_plugin(PROJECT, bob, java)
    subprocess.run([
        java, *options, "-jar", str(bob.resolve()),
        "--root", str(PROJECT), "--archive", "--platform", platform,
        "--architectures", architectures, "--variant", "release", *extra,
        "--bundle-output", str(output), "build", "bundle",
    ], check=True, cwd=ROOT)
    if target == "android":
        apk = next(output.glob("*/*.apk"), None)
        if not apk:
            raise RuntimeError("Build finished without an APK.")
        # The pinned Rive Android renderer supports GLES. A dual-backend APK
        # adds VkQuality, which can select an unsupported Vulkan adapter.
        with zipfile.ZipFile(apk) as package:
            if any(name.endswith('/libvkquality.so') for name in package.namelist()):
                raise RuntimeError("Rive Android APK must be GLES-only; VkQuality was bundled.")
        print(f"Android test APK: {apk.relative_to(ROOT)}", flush=True)
        print("Uses a generated debug signing key; not a Play Store release.", flush=True)
        return
    index = next(OUTPUT.glob("*/index.html"), None)
    if not index:
        raise RuntimeError("Build finished without an HTML5 index.html.")
    shutil.copytree(PROJECT / "preview", index.parent, dirs_exist_ok=True)
    print(f"HTML5 bundle: {index.parent.relative_to(ROOT)}", flush=True)
    print("Preview: python3 scripts/defold.py serve", flush=True)


def serve(port):
    index = next(OUTPUT.glob("*/index.html"), None)
    if not index:
        raise RuntimeError("Build first: python3 scripts/defold.py build")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(index.parent))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Preview: http://127.0.0.1:{port}", flush=True)
        server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build", "serve"))
    parser.add_argument("--target", choices=("web", "android"), default="web")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    try:
        if args.command == "build":
            build(args.target)
        else:
            serve(args.port)
    except KeyboardInterrupt:
        pass
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f"Defold: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
