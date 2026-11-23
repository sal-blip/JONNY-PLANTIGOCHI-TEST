"""Play the four care actions through the toy menu on the production bundle."""
from io import BytesIO
from pathlib import Path
import sys
from PIL import Image, ImageStat
from playwright.sync_api import expect, sync_playwright
from audio_mixer import levels, settings
from dew_lesson import sprout_fixture
from scene_music import context_for, SEED_SETUP, taps

def edge_lightness(lcd):
    image=Image.open(BytesIO(lcd.screenshot())).convert('L')
    w,h=image.size
    band=image.crop((int(w*.025),int(h*.37),int(w*.055),int(h*.65)))
    return ImageStat.Stat(band).mean[0]

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
    page = ctx.new_page()
    normal='--normal-motion' in sys.argv
    if normal: page.emulate_media(reduced_motion='no-preference')
    if not normal:page.set_viewport_size({"width":320,"height":568})
    page.goto(blank)
    p = sprout_fixture()['plant']
    for key in ('dewLesson','tutorial','sproutDebut','sproutBurstPending'):
        p.pop(key, None)
    hour = 3600000
    now = page.evaluate('Date.now()')
    p.update(plantedAt=now-60*hour,wateredAt=now-59*hour,stage='sprout',growthFlares=[],
             anchor=now,lastDrink=now-5*hour,fedAt=now-50*hour,litAt=now-(18 if normal else 25)*hour,
             companyAt=now-25*hour,outbreakDue=now+35*hour)
    page.evaluate(SEED_SETUP,p)
    page.goto(url)
    lcd = page.locator('.lcd')
    def check_row(expected):
        badges=lcd.locator('.lcd-care-slot[data-care-cue]')
        expect(badges).to_have_count(len(expected))
        assert badges.evaluate_all("(els)=>els.map(el=>el.dataset.careCue)")==expected
        if not expected:return
        page.wait_for_function("""()=>[...document.querySelectorAll('.lcd-care-slot[data-care-cue] img')].every(im=>im.complete && im.naturalWidth===32)""")
        expect(badges.last).to_have_css('opacity','1')
        rects=badges.locator('img').evaluate_all("(els)=>els.map(el=>el.getBoundingClientRect().toJSON())")
        bounds=lcd.bounding_box()
        assert all(r['width']<bounds['width']*.09 and r['width']>0 for r in rects)
        assert abs(rects[-1]['right']-(bounds['x']+bounds['width']*.958))<2
        assert all(abs(r['top']-rects[0]['top'])<1 for r in rects)
        assert all(r['right']<=n['left']+.2 for r,n in zip(rects,rects[1:]))
    check_row(['water','sun','food','talk'])
    meter=lcd.locator('.lcd-readout').bounding_box()
    last=lcd.locator('[data-care-cue="talk"] img').bounding_box()
    assert last['y']+last['height']<=meter['y']
    if normal:lcd.screenshot(path='/tmp/plantigochi-four-care-badges.png')
    shade=lcd.locator('.lcd-care-light')
    expect(shade).to_have_css('opacity','0.58' if normal else '1')
    taps(page,'Open toy menu','Choose Care','Choose Water')
    check_row(['sun','food','talk'])
    taps(page,'Next toy item')
    dark=edge_lightness(lcd)
    taps(page,'Choose Sunlight')
    expect(shade).to_have_css('opacity','0')
    bright=edge_lightness(lcd)
    assert bright-dark > (20 if normal else 35),(dark,bright)
    check_row(['food','talk'])
    taps(page,'Next toy item','Next toy item','Choose Plant food')
    check_row(['talk'])
    taps(page,'Previous toy item','Choose Kind words')
    check_row([])
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(lcd.locator('[data-care-cue]')).to_have_count(0)
    settings(page)
    assert levels(page)==[40,40,100], levels(page)
    browser.close()
    print(f'Care handoffs and mixer verified. LCD edge brightness {dark:.0f} before sunlight, {bright:.0f} after.')
