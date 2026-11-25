"""Redeem the first free spin's Growth Day, immediately or after reopening iSEED."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import context_for, SEED_SETUP, taps

source = str(Path("dist").resolve())
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
    for path in ("now", "later", "needs care"):
        ctx, url, blank = context_for(browser, source)
        ctx.add_init_script("""const randomValues = crypto.getRandomValues.bind(crypto);
            crypto.getRandomValues = a => a instanceof Uint32Array && a.length === 2
              ? a.fill(Math.floor(.85 * 2**32)) : randomValues(a);""")
        page = ctx.new_page()
        page.goto(blank)
        plant = sprout_fixture()["plant"]
        del plant["sproutDebut"]
        if path == "needs care":
            plant.update(fungusAt=plant["anchor"], outbreakDue=None)
        page.evaluate(SEED_SETUP, plant)
        page.goto(url)
        taps(page, "Spin for free")
        expect(page.get_by_role("heading", name="You won 1 growth day")).to_be_visible()
        before = page.evaluate(READ_PLANT)
        assert before["gardenLife"]["growthDays"] == 1
        if path == "needs care":
            expect(page.get_by_text("Your plant needs care first.", exact=False)).to_be_visible()
            taps(page, "Back to rewards")
            expect(page.get_by_role("button", name="Use on Dew Fern")).to_be_disabled()
        else:
            if path == "later":
                taps(page, "Save for later", "Close daily rewards")
                page.reload()
                taps(page, "Open garden", "Open iSEED")
                page.get_by_role("button", name="Daily rewards,", exact=False).tap()
            use = page.get_by_role("button", name="Use on Dew Fern")
            expect(use).to_be_enabled()
            if path == "now":
                use.tap()
            else:
                use.evaluate("b => { b.click(); b.click() }")
            expect(page.get_by_role("heading", name="Growth day applied")).to_be_visible()
            taps(page, "See my plant")
            expect(page.get_by_role("button", name="Open toy menu")).to_be_visible()
            page.reload()
            expect(page.get_by_role("button", name="Open toy menu")).to_be_visible()
            after = page.evaluate(READ_PLANT)
            assert after["gardenLife"]["growthDays"] == 0
            assert 86400000 <= after["earned"] - before["earned"] < 86500000
            assert after["lastDrink"] == before["lastDrink"]
        print("Passed growth prize:", path, flush=True)
        ctx.close()
    browser.close()
