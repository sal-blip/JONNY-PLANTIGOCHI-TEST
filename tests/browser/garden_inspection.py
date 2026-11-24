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
        plant['graduates'] = [dict(id='resident',name='Moth Orchid',species='moth-orchid',potStyle=0,
            generation=1,plantedAt=1,movedAt=2,slot='0/window-middle')]
        plant['gardenLife']['items'] = [dict(id='frog',sku='bog-frog-pot',slot='0/window-middle'),dict(id='terra',sku='terra',slot=3)]
        page.goto(blank)
        page.evaluate(SEED_SETUP,plant)
        page.goto(url)
        taps(page,'Open garden')
        page.locator('[data-slot="0/window-middle"][data-occupied]').tap()
        view = page.get_by_role('dialog')
        expect(view).to_have_accessible_name('Moth Orchid in Bog Frog Pot')
        expect(view.locator('[aria-pressed=true]')).to_have_count(0)
        expect(view.get_by_role('button',name='Move pot only')).to_have_count(0)
        expect(view).to_be_visible()
        page.wait_for_function("getComputedStyle(document.querySelector('.room-lens')).transform.startsWith('matrix(2.')")
        def check_framing():
            bbox = page.locator('[data-slot="0/window-middle"][data-occupied]').bounding_box()
            title = view.locator('header').bounding_box()
            actions = view.locator('.inspection-options').bounding_box()
            center = bbox['y']+bbox['height']/2
            assert title['y']+title['height'] < center < actions['y'], (title, bbox, actions)
        check_framing()
        assert view.evaluate("el => getComputedStyle(el).backgroundImage.startsWith('radial-gradient(')")
        page.screenshot(path=f'/tmp/plantigochi-inspection-{hour}.png')
        taps(page,'Pot only')
        expect(view).to_have_accessible_name('Bog Frog Pot')
        # Stress wrapped titles and action labels, including landscape with a short action area.
        large=page.add_style_tag(content=".garden-inspection :is(h2,p,button){font-size:24px!important}")
        for width,height in ((320,568),(640,320),(393,710)):
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(100)
            layout=view.evaluate("""el=>{
                const box=s=>el.querySelector(s).getBoundingClientRect();
                const options=box('.inspection-options'),done=box('footer'),header=box('header');
                const parts=[...el.querySelectorAll('.inspection-options button,.inspection-options p')];
                const lines=parts.map(e=>e.getBoundingClientRect());
                const overlap=lines.some((a,i)=>lines.slice(i+1).some(b=>
                    Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 &&
                    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
                return !overlap && header.bottom<=options.top+1 && options.bottom<=done.top+1 &&
                    done.bottom<=innerHeight+1 && options.height>=44;
            }""")
            assert layout,(width,height)
        large.evaluate('el => el.remove()')
        taps(page,'Plant + pot')
        expect(view.get_by_role('button',name='Move plant and pot together')).to_be_visible()
        taps(page,'Plant only','Repot plant','Repot in Terracotta pot at Living room windowsill')
        expect(page.get_by_role('status').filter(has_text='Repotted at')).to_be_visible()
        saved = page.evaluate(READ_PLANT)
        assert saved['graduates'][0]['slot'] == 3 and saved['gardenLife']['items'] == plant['gardenLife']['items']
        page.locator('[data-item-id="frog"]').tap()
        taps(page,'Move to another spot','Swap with Terracotta pot at Living room windowsill','Swap here')
        expect(page.get_by_role('status').filter(has_text='Bog Frog Pot placed')).to_be_visible()
        page.reload()
        taps(page,'Open garden')
        expect(page.locator('[data-item-id="frog"]')).to_have_attribute('data-pot-slot','3')
        expect(page.locator('[data-item-id="terra"]')).to_have_attribute('data-pot-slot','0/window-middle')
        assert page.evaluate(READ_PLANT)['graduates'][0]['slot'] == 3
        page.locator('[data-item-id="frog"]').tap()
        expect(view.locator('[aria-pressed=true]')).to_have_count(0)
        taps(page,'Plant + pot','Move plant and pot together')
        page.locator('[data-destination]').first.tap()
        expect(page.get_by_role('status').filter(has_text='Moved to')).to_be_visible()
        saved=page.evaluate(READ_PLANT)
        spot=saved['graduates'][0]['slot']
        assert spot != 3 and next(i['slot'] for i in saved['gardenLife']['items'] if i['id']=='frog')==spot
        page.locator('[data-item-id="frog"]').tap()
        taps(page,'Pot only','Store pot only')
        expect(page.get_by_role('status').filter(has_text='put in inventory')).to_be_visible()
        saved=page.evaluate(READ_PLANT)
        assert saved['graduates'][0]['slot']==spot and next(i['slot'] for i in saved['gardenLife']['items'] if i['id']=='frog') is None
        page.locator('[data-audio="cat"]').tap()
        taps(page,'Pet again','Close menu')
        ctx.close()
    browser.close()
    print('Passed layout, explicit selection, repotting, moving the pair, storing the pot, reload and petting at noon and night.')
