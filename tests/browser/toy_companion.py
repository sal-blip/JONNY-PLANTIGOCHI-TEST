"""Check live stage, species provenance and the iSEED companion guide on a phone."""
import json
import re
import subprocess
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from scene_music import SEED_SETUP, context_for, taps
from dew_lesson import sprout_fixture

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    plant = sprout_fixture()['plant']
    for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
        plant.pop(key,None)
    def open_companion():
        page.goto(blank)
        page.evaluate(SEED_SETUP, plant)
        page.goto(url)
        taps(page,'Open garden','Open iSEED','Plantigotchi')
    open_companion()
    expect(page.get_by_role('heading',name=plant['name'],exact=True)).to_be_visible()
    full = page.get_by_role('progressbar', name='Growth to full maturity')
    expect(full).to_be_visible()
    expect(page.get_by_role('progressbar', name='Stage progress · Young plant')).to_be_visible()
    sprout_scale = page.get_by_role('progressbar', name='Stage progress · Young plant')
    expect(sprout_scale.locator('.toy-time-cell')).to_have_count(18)
    assert sprout_scale.locator('.toy-time-cell').last.evaluate('el => el.style.flexGrow') == '0.75'
    assert 0 < float(full.get_attribute('aria-valuenow')) < 1
    expect(full.locator('.toy-time-cell')).to_have_count(7)
    taps(page,'Collection')
    expect(page.get_by_text('0 of 32 raised')).to_be_visible()
    expect(page.locator('.toy-tile.mystery')).to_have_count(32)
    roster = json.loads(subprocess.check_output(['node','--input-type=module','-e',
        "import {growthOrder,toyVarietyName} from './src/game.js'; console.log(JSON.stringify(growthOrder.map(toyVarietyName)))"], text=True))
    assert page.locator('.toy-collection li > span:first-of-type').all_text_contents() == roster
    expect(page.locator('.toy-collection canvas')).to_have_count(0)
    masks = page.locator('.seed-mask').evaluate_all("""async imgs => Promise.all(imgs.map(async img => {
      await img.decode();
      const c = document.createElement('canvas'); c.width=img.naturalWidth;c.height=img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
      const a=ctx.getImageData(0,0,c.width,c.height).data, colors=new Set();let pixels=0;
      for(let i=0;i<a.length;i+=4)if(a[i+3]){colors.add(a.slice(i,i+4).join(','));pixels++;}
      return colors.size===1 && pixels>20 ? c.toDataURL() : null;
    }))""")
    assert all(masks) and len(set(masks))==32
    tile=page.locator('.toy-tile').first
    tile.scroll_into_view_if_needed()
    expect(tile).to_have_class(re.compile('in-view'))
    animation="el=>getComputedStyle(el,'::before').animationName"
    assert tile.evaluate(animation)=='none'
    page.emulate_media(reduced_motion='no-preference')
    assert tile.evaluate(animation)=='seed-wallpaper-drift'
    page.emulate_media(reduced_motion='reduce')
    taps(page,'Toy guide')
    page.get_by_text('Water, light, food and company',exact=True).click()
    expect(page.get_by_text('Water your seed once.',exact=False)).to_be_visible()
    taps(page,'Back')
    expect(page.get_by_role('button',name='Plantigotchi',exact=True)).to_be_visible()
    resident=dict(id='raised',name='Maranta',species='prayer-plant',generation=1,slot=0,plantedAt=1,movedAt=2)
    plant['graduates']=[resident,{**resident,'id':'bought','species':'queen-anthurium','source':'shop','slot':1}]
    plant['waitingPlants']=[dict(id='ready',name='Pothos',species='golden-pothos',generation=2,plantedAt=1)]
    open_companion()
    taps(page,'Collection')
    expect(page.get_by_text('2 of 32 raised')).to_be_visible()
    for name in ['Prayer Plant','Golden Pothos']:
        expect(page.locator('.toy-collection').get_by_text(name,exact=True)).to_be_visible()
    expect(page.locator('.toy-tile.revealed canvas')).to_have_count(2)
    expect(page.locator('.toy-tile.revealed canvas').first).to_have_attribute('width','216')
    queen=page.locator('.toy-collection li').filter(has_text='Queen Anthurium')
    expect(queen.locator('.seed-mask')).to_have_count(1)
    day = 24 * 60 * 60 * 1000
    plant.update(stage='young', earned=4 * day)
    open_companion()
    assert 57 <= float(full.get_attribute('aria-valuenow')) < 58
    expect(page.get_by_role('progressbar', name='Stage progress · First split')).to_have_attribute('aria-valuetext', '24 h of 48 h of earned growth')
    plant.update(stage='grown', earned=7 * day)
    open_companion()
    expect(full).to_have_attribute('aria-valuenow', '100')
    expect(page.get_by_role('progressbar')).to_have_count(1)
    plant = json.loads(subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import {newPlant} from './src/game.js'; console.log(JSON.stringify(newPlant(Date.now() - 1800000)))"
    ], text=True))
    open_companion()
    seed_scale = page.get_by_role('progressbar', name='Stage progress · Sprout')
    expect(seed_scale).to_have_attribute('aria-valuetext', '30 min of 60 min of earned growth')
    expect(seed_scale.locator('.toy-time-cell')).to_have_count(4)
    expect(page.get_by_text('15 minutes per segment')).to_be_visible()
    assert not errors,errors
    browser.close()
    print('Fresh and returning gardens, 32 distinct named silhouettes, care guide, launcher navigation and collection provenance passed.')
