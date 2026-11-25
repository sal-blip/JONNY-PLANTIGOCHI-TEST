"""Buy a shared decoration, move it from a shelf to the front floor, then reload."""
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    context, url, blank = context_for(browser, str(Path('dist').resolve()))
    page = context.new_page()
    page.set_default_timeout(8000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    plant = sprout_fixture()['plant']
    for key in ('tutorial', 'sproutDebut', 'sproutBurstPending', 'dewLesson'):
        plant.pop(key, None)
    life = plant['gardenLife']
    life.update(balance=100, visit={'date':life['day'], 'streak':1, 'claimed':True, 'shown':True})
    for i,slot in enumerate(['0/window-middle','0/table-end','0/floor-row-6','0/front-2']):
        plant['graduates'].append(dict(id=f'example-{i}', name='Snake plant', species='snake-plant',
            source='shop', generation=1, plantedAt=1, movedAt=2, slot=slot))
    page.goto(blank)
    page.evaluate(SEED_SETUP,plant)
    page.goto(url)
    taps(page,'Open garden','Open iSEED','Shop','Maneki-neko · 30 coins','Buy')
    room=page.locator('.room-frame:not([inert])').first
    expect(room.locator('[data-destination]')).to_have_count(38)  # 41 shared minus four residents, plus stand
    if folder:=os.getenv('GARDEN_SCREENSHOTS'):
        Path(folder).mkdir(exist_ok=True, parents=True)
        page.screenshot(path=Path(folder)/'living-room-spots.png')
    taps(page,'Place at Lower bookcase shelf, right','Buy for 30 coins')
    target=page.get_by_role('button',name='Maneki-neko · Lower bookcase shelf, right',exact=True)
    target.tap()
    taps(page,'Move to another spot','Place at Front floor, fourth spot','Place here')
    expect(page.get_by_role('button',name='Maneki-neko · Front floor, fourth spot',exact=True)).to_be_visible()
    page.reload()
    taps(page,'Open garden')
    item=page.get_by_role('button',name='Maneki-neko · Front floor, fourth spot',exact=True)
    expect(item).to_be_visible()
    if folder:
        page.screenshot(path=Path(folder)/'living-room-depth.png')
    saved=page.evaluate(READ_PLANT)
    assert saved['gardenLife']['balance']==70
    assert next(i['slot'] for i in saved['gardenLife']['items'] if i['sku']=='neko')=='0/front-4'
    assert not errors,errors
    browser.close()
    print('Passed shelf purchase, occupied spot exclusion, foreground placement and reload.')
