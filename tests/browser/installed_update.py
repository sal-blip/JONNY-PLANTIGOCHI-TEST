"""Exercise the update menu and a real service worker from a previous dist to a new dist."""
import argparse
import json
import re
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
from scene_music import SEED_SETUP, taps
from dew_lesson import READ_PLANT

parser = argparse.ArgumentParser()
parser.add_argument("--repair", action="store_true", help="Recover from the failed update using the direct public repair page")
parser.add_argument("previous", type=Path, help="Previous release's dist directory")
parser.add_argument("current", type=Path, help="Target release's dist directory")
args = parser.parse_args()
release = args.previous
stale_entry = False
stale_unversioned = False


class ReleaseHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == "/update":
            page = subprocess.check_output(["node", "--input-type=module", "-e", """
                const worker=await import(process.argv[1]);
                const response=await worker.default.fetch(new Request('https://test.local/update'));
                if(!response.ok)throw Error(response.status);
                process.stdout.write(await response.text());
            """, (args.current / "server/index.js").resolve().as_uri()])
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(page)
            return
        super().do_GET()

    def translate_path(self, path):
        url = urlsplit(path)
        is_shell = PurePosixPath(url.path).match("/assets/game-shell-*.bin")
        if is_shell and stale_entry:
            # Simulate a stale response even on the fingerprinted update URL.
            return str((args.previous / "index.html").resolve())
        stale = (stale_entry and url.path == "/index.html") or (
            stale_unversioned and (url.path == "/index.html" or (url.path == "/sw.js" and not url.query)))
        directory = args.previous if stale else release
        return str(directory.resolve() / Path(super().translate_path(path)).relative_to(Path(self.directory)))

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


def open_update_menu(page):
    taps(page, "Open Plantigochi menu", "App & data")
    if page.get_by_role("button", name="Save, Updates & More", exact=True).count():
        taps(page, "Save, Updates & More")
    else:
        taps(page, "Back", "Settings")  # Earlier installed builds.


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
    open_update_menu(page)
    release = args.current
    stale_entry = True
    verified_checker = (args.previous / "game-release.json").exists()
    if verified_checker:
        expect(page.get_by_text("You have the latest version.")).to_be_visible(timeout=60000)
    taps(page, "Check for updates")
    failure = re.compile(r"The download did not finish|The downloaded files could not be verified|Could not verify the latest game")
    expect(page.get_by_text(failure if verified_checker else "Could not check for updates.", exact=False)).to_be_visible(timeout=60000)
    assert entry.get_attribute("src") == old
    stale_entry = False
    if args.repair:
        page.goto(f"http://127.0.0.1:{server.server_port}/update")
        page.get_by_role("button", name="Repair update").click()
        expect(page.get_by_role("status")).to_contain_text("verified.", timeout=60000)
        with page.expect_navigation():
            page.get_by_role("button", name="Restart to update").click()
    else:
        stale_unversioned = verified_checker
        taps(page, "Retry update check" if verified_checker else "Check for updates")
        restart = page.get_by_role("button", name="Restart to update")
        expect(restart).to_be_visible(timeout=60000)
        with page.expect_navigation():
            restart.click()
    new = entry.get_attribute("src")
    assert new != old and (args.current / new.lstrip("/")).exists()
    assert page.evaluate(READ_PLANT)["id"] == fixture["id"]
    if verified_checker:
        open_update_menu(page)
        expect(page.get_by_text("You have the latest version.")).to_be_visible(timeout=60000)
        page.context.set_offline(True)
        expect(page.get_by_text("Connect to the internet to check for updates.")).to_be_visible()
        page.context.set_offline(False)
        expect(page.get_by_text("You have the latest version.")).to_be_visible(timeout=20000)
        taps(page, "Close menu")
    taps(page, "Open garden", "Open iSEED", "Share")
    expect(page.get_by_role("button", name="Take photo")).to_be_enabled()
    finder = page.locator(".camera-finder")
    assert abs(finder.bounding_box()["height"] - finder.locator("canvas").bounding_box()["height"]) < 1
    browser.close()
    server.shutdown()
print("Rejected stale entry, retried successfully, restarted into the new bundle and opened the full-height camera.")
