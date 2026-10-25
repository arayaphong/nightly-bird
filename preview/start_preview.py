#!/usr/bin/env python3
"""Serve this extracted HTML5 bundle and open it in the default browser."""

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".wasm": "application/wasm"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent
    if not (folder / "index.html").is_file():
        parser.error("Extract the entire ZIP first; keep this script beside index.html.")
    handler = functools.partial(Handler, directory=str(folder))
    # A free local port avoids conflicts with an existing development server.
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        url = "http://127.0.0.1:{}/".format(server.server_port)
        print("Defold Hello World: " + url, flush=True)
        print("Keep this window open while playing. Press Ctrl+C to stop.", flush=True)
        if not args.no_browser:
            opener = threading.Timer(0.3, webbrowser.open, args=(url,))
            opener.daemon = True
            opener.start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
