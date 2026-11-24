"""Inspect the real sprite and exercise moving the plant and pot independently."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    for hour in (12, 22):
        ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
        page = ctx.new_page()
        page.clock.set_fixed_time(f'2026-11-24T{hour}:00:00')
        plant = sprout_fixture()['plant']
        for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
            plant.pop(key,None)
        plant['graduates'] = [dict(id='resident',name='Fern',species='monstera',potStyle=0,
            generation=1,plantedAt=1,movedAt=2,slot=4)]
        plant['gardenLife']['items'] = [dict(id='frog',sku='bog-frog-pot',slot=4),dict(id='terra',sku='terra',slot=3)]
        page.goto(blank)
        page.evaluate(SEED_SETUP,plant)
        page.goto(url)
        taps(page,'Open garden')
        page.locator('[data-slot="4"][data-occupied]').tap()
        view = page.get_by_role('dialog', name='Fern',exact=True)
        expect(view).to_be_visible()
        page.wait_for_function("getComputedStyle(document.querySelector('.room-lens')).transform.startsWith('matrix(2.')")
        def check_framing():
            bbox = page.locator('[data-slot="4"][data-occupied]').bounding_box()
            title = view.locator('header').bounding_box()
            actions = view.locator('.inspection-options').bounding_box()
            center = bbox['y']+bbox['height']/2
            assert title['y']+title['height'] < center < actions['y'], (title, bbox, actions)
        check_framing()
        page.screenshot(path=f'/tmp/plantigochi-inspection-{hour}.png')
        taps(page,'Repot into another pot','Repot in Terracotta pot at Living room windowsill')
        expect(page.get_by_role('status').filter(has_text='Repotted at')).to_be_visible()
        saved = page.evaluate(READ_PLANT)
        assert saved['graduates'][0]['slot'] == 3 and saved['gardenLife']['items'] == plant['gardenLife']['items']
        page.locator('[data-item-id="frog"]').tap()
        taps(page,'Move to another spot','Swap with Terracotta pot at Living room windowsill','Swap here')
        page.reload()
        taps(page,'Open garden')
        expect(page.locator('[data-item-id="frog"]')).to_have_attribute('data-pot-slot','3')
        expect(page.locator('[data-item-id="terra"]')).to_have_attribute('data-pot-slot','4')
        assert page.evaluate(READ_PLANT)['graduates'][0]['slot'] == 3
        page.locator('[data-audio="cat"]').tap()
        taps(page,'Pet again','Close menu')
        ctx.close()
    browser.close()
    print('Passed day and night inspection, repotting, occupied-pot swap, reload and petting.')
