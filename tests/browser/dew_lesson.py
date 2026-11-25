"""Exercise tutorial Dew Catch and its return to the regular game in an isolated profile."""
import argparse
import json
import re
import subprocess
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
CLAIM = "Claim 20 coins"
# Read actual persistence independently of the visible purse and LCD. Close the
# connection on every read so this probe cannot hold a game transaction open.
READ_PLANT = """async () => {
    const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('plantigochi.pocket.garden');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    try {
        return await new Promise((resolve, reject) => {
            const req = db.transaction('garden').objectStore('garden').get('current');
            req.onsuccess = () => resolve(JSON.parse(req.result));
            req.onerror = () => reject(req.error);
        });
    } finally { db.close(); }
}"""


def sprout_fixture():
    # Use the same fourth paid boost that normally creates the invitation.
    result = subprocess.run(
        ["node", "--input-type=module", "-e", """
        import {buyGrowth, care, newPlant, KEY} from './src/game.js';
        import {lifeOf, localDay} from './src/gardenEconomy.js';
        import {grantSproutCoins, newTutorial} from './src/firstVisit.js';
        const time = Date.now();
        let plant = care(newPlant(time, 'Dew Fern'), 'water', time);
        plant = grantSproutCoins({...plant, tutorial: {...newTutorial(), step: 'return'},
            gardenLife: {...lifeOf(plant), day: localDay(time), balance: 0}});
        for (let count = 0; count < 4; count++) {
            plant = buyGrowth(plant, {stage: 'seed', count}, time);
        }
        if (plant.stage !== 'sprout' || plant.gardenLife.balance !== 0) throw Error('Invalid sprout fixture');
        console.log(JSON.stringify({key:KEY, plant}));
        """], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return json.loads(result.stdout)


def exercise(browser, url, win):
    fixture = sprout_fixture()
    if not win:
        # A practice loss must preserve a regular run saved previously.
        fixture["plant"].update(dewCleared=19, dewRunCleared=19)
    context = browser.new_context(
        viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
        reduced_motion="reduce", service_workers="block",
    )
    try:
        # Route all random drops down the center for repeatable catches/misses.
        # Never rewrite the fixture on navigation; all reopens use IndexedDB.
        context.add_init_script(f"""
            Object.defineProperty(navigator, 'standalone', {{value:true}});
            delete window.PushManager;
            Math.random = () => 0.5;
            const fixture = {json.dumps(fixture)};
            if (!sessionStorage.getItem('dew-test-initialized')) {{
                localStorage.setItem(fixture.key, JSON.stringify(fixture.plant));
                sessionStorage.setItem('dew-test-initialized', 'yes');
            }}
        """)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        button = lambda name: page.get_by_role("button", name=name, exact=True)
        lcd = page.locator(".lcd")
        purse = page.locator(".garden-purse span").first
        expected = 3 if win else 0
        progress = lambda: page.evaluate(READ_PLANT)["dewLesson"]

        button("Play one round").tap()
        button("Play heart").tap()
        if not win:
            button("Play left").tap()
        field, target = ("caught", 1) if win else ("chances", 1)
        deadline = time.monotonic() + 15
        while True:
            saved = progress()
            if saved.get(field) == target:
                break
            assert time.monotonic() < deadline, f"Never persisted {field}={target}: {saved}"
            page.wait_for_timeout(40)
        page.reload()
        button("Play heart").wait_for()
        restored = progress()
        assert (restored["caught"], restored["chances"]) == (saved["caught"], saved["chances"])
        button("Play heart").tap()
        if not win:
            button("Play left").tap()
        expect(lcd).to_contain_text("Round clear!" if win else "Three strikes", timeout=15000)
        claim = button(CLAIM)
        expect(claim).to_be_visible(timeout=5000)
        expect(page.get_by_text("Thanks for growing with me!", exact=True)).to_be_visible()
        expect(purse).to_have_text(str(expected))
        completed = page.evaluate(READ_PLANT)
        if not win:
            assert completed["dewRunCleared"] == 19 and completed["dewCleared"] == 19
        page.reload()
        expect(claim).to_be_visible()
        expect(purse).to_have_text(str(expected))
        # Dispatch two presses on the same button before its re-render to cover
        # a rapid duplicate activation as well as a later reload.
        claim.evaluate("el => { el.click(); el.click(); }")
        expect(purse).to_have_text(str(expected + 20))
        page.reload()
        expect(button("Open toy menu")).to_be_visible()
        expect(claim).to_have_count(0)
        expect(purse).to_have_text(str(expected + 20))

        # The ordinary toy's Play menu must still offer the full 20-level run.
        button("Open toy menu").tap()
        button("Next toy item").tap()
        button("Choose Play").tap()
        button("Next toy item").tap()
        button("Choose Dew Catch").tap()
        regular_level = 2 if win else 20
        expect(lcd).to_have_attribute("aria-label", re.compile(f"Dew Catch {regular_level}/20"))
        button("Play heart").tap()
        if win:
            expect(lcd).to_contain_text("Clear! ♥ Next", timeout=15000)
            button("Play heart").tap()
            expect(lcd).to_have_attribute("aria-label", re.compile("Dew Catch 3/20"))
        else:
            expect(lcd).to_contain_text("20 cleared! ♥ Replay", timeout=15000)
            button("Play heart").tap()
            button("Play heart").tap()
            button("Play left").tap()
            expect(lcd).to_contain_text("Restarting at Lv 1", timeout=10000)
            expect(lcd).to_have_attribute("aria-label", re.compile("Dew Catch 1/20"), timeout=5000)
        expect(claim).to_have_count(0)
        assert not errors, errors
    finally:
        context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--chromium", help="Path to an installed Chromium executable")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium)
        try:
            for win in (True, False):
                exercise(browser, args.url, win)
                print("Passed tutorial", "win" if win else "loss", "and regular replay", flush=True)
        finally:
            browser.close()
