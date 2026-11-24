"""Exercise adaptive garden detail and move an approved shelf item between rooms."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    for density in (1, 3):
        ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
        ctx.add_init_script("""window.launchPaints=[];
            const clear=CanvasRenderingContext2D.prototype.clearRect;
            let watching=true;
            CanvasRenderingContext2D.prototype.clearRect=function(...args){
                if(watching && this.canvas.matches('.room-actors,.room-depth')){
                    if(!launchPaints.length)requestAnimationFrame(()=>{watching=false});
                    launchPaints.push([this.canvas.className,this.canvas.width]);
                }
                return clear.apply(this,args);
            };
        """)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        ctx.new_cdp_session(page).send('Emulation.setDeviceMetricsOverride', {
            'width': 260 if density == 1 else 393, 'height': 710, 'mobile': True, 'deviceScaleFactor': density,
        })
        fixture = sprout_fixture()['plant']
        for key in ('tutorial', 'sproutDebut', 'sproutBurstPending', 'dewLesson'):
            fixture.pop(key, None)
        fixture['gardenLife']['items'] = [
            {'id': 'lucky-cat', 'sku': 'neko', 'slot': '0/decor-bookcase'},
        ]
        page.goto(blank)
        page.evaluate(SEED_SETUP, fixture)
        page.goto(url)
        expected_width = 800 if density == 1 else 1200
        page.wait_for_function('window.launchPaints.length >= 2')
        first_paints = sorted(page.evaluate('window.launchPaints'))
        assert first_paints == [['room-actors', expected_width], ['room-depth', 400]], first_paints
        taps(page, 'Open garden')
        active = page.locator('.room-frame:not([inert])')
        expect(active.locator('.room-actors')).to_have_attribute('width', str(expected_width))
        expect(active.locator('.room-depth')).to_have_attribute('width', '400')
        expect(page.locator('.room-frame[inert] .room-actors').first).to_have_attribute('width', '400')
        active.locator('[data-item-id="lucky-cat"]').tap()
        taps(page, 'Move to another spot', 'Next placement room', 'Place at Right studio windowsill')
        expect(active.locator('.room-actors')).to_have_attribute('width', str(expected_width))
        taps(page, 'Place here')
        expect(active.locator('[data-item-id="lucky-cat"]')).to_be_visible()
        page.reload()
        taps(page, 'Open garden')
        saved = page.evaluate(READ_PLANT)
        assert saved['gardenLife']['items'][0]['slot'] == '1/decor-sill'
        taps(page, 'Return to Plantigochi')
        expect(active.locator('.room-actors')).to_have_attribute('width', str(expected_width))
        assert not errors, errors
        ctx.close()
        print(f'{density}× phone density: room detail, depth, preview, placement and reload passed.')
