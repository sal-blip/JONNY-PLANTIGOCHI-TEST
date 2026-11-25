"""Exercise Settings and a real service worker from a previous dist to a new dist."""
import argparse
import json
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
from scene_music import SEED_SETUP, taps

parser = argparse.ArgumentParser()
parser.add_argument("previous", type=Path, help="Previous release's dist directory")
parser.add_argument("current", type=Path, help="Target release's dist directory")
args = parser.parse_args()
release = args.previous
stale_entry = False


class ReleaseHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        directory = args.previous if stale_entry and urlsplit(path).path == "/index.html" else release
        return str(directory.resolve() / Path(super().translate_path(path)).relative_to(Path(self.directory)))

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


fixture = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", """
import {newPlant} from './src/game.js';
import {checkIn} from './src/gardenEconomy.js';
const now=Date.now(), plant=checkIn(newPlant(now,'Fern'),now);
plant.gardenLife.visit.shown=true;
console.log(JSON.stringify(plant));
"""]))
with ThreadingHTTPServer(("127.0.0.1", 0), partial(ReleaseHandler, directory=str(args.previous.resolve()))) as server, sync_playwright() as pw:
    Thread(target=server.serve_forever, daemon=True).start()
    browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
    page = browser.new_page(viewport={"width":393, "height":757}, has_touch=True, is_mobile=True)
    page.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
    page.goto(f"http://127.0.0.1:{server.server_port}/")
    page.evaluate(SEED_SETUP, fixture)
    page.reload()
    page.wait_for_function("!!navigator.serviceWorker.controller", timeout=60000)
    entry = page.locator('script[type="module"]').first
    old = entry.get_attribute("src")
    taps(page, "Open Plantigochi menu", "Settings")
    release = args.current
    stale_entry = True
    taps(page, "Check for updates")
    expect(page.get_by_text("Could not check for updates.", exact=False)).to_be_visible(timeout=60000)
    assert entry.get_attribute("src") == old
    stale_entry = False
    taps(page, "Check for updates")
    restart = page.get_by_role("button", name="Restart to update")
    expect(restart).to_be_visible(timeout=60000)
    with page.expect_navigation():
        restart.click()
    new = entry.get_attribute("src")
    assert new != old and (args.current / new.lstrip("/")).exists()
    taps(page, "Open garden", "Open iSEED", "Share")
    expect(page.get_by_role("button", name="Take photo")).to_be_enabled()
    finder = page.locator(".camera-finder")
    assert abs(finder.bounding_box()["height"] - finder.locator("canvas").bounding_box()["height"]) < 1
    browser.close()
    server.shutdown()
print("Rejected stale entry, retried successfully, restarted into the new bundle and opened the full-height camera.")
