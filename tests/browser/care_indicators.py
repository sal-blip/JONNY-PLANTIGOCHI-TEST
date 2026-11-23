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
    def cue(kind, delivered=False):
        selector=f'[data-care-cue="{kind}"]' + ('[data-delivered]' if delivered else ':not([data-delivered])')
        expect(lcd.locator(selector)).to_be_visible()
    # Record the order and actual opacity while care animations run.
    page.evaluate('''window.events=[];window.midFade=[];
      for(const type of ['animationstart','animationend'])document.addEventListener(type,e=>{
        const cue=e.target.closest('[data-care-cue]');
        if(!cue)return;
        const kind=cue.dataset.careCue;
        events.push([type,e.animationName,kind]);
        if(type==='animationstart' && e.animationName==='care-arrive'){
          const sample=()=>{if(!cue.isConnected)return;
            const opacity=Number(getComputedStyle(cue).opacity);
            if(opacity>0 && opacity<1)midFade.push(kind);
            else if(opacity===0)requestAnimationFrame(sample);};
          requestAnimationFrame(sample);
        }
      },true);''')
    cue('water')
    shade=lcd.locator('.lcd-care-light')
    expect(shade).to_have_css('opacity','0.58' if normal else '1')
    taps(page,'Open toy menu','Choose Care','Choose Water')
    cue('water',True)
    cue('food')
    taps(page,'Next toy item')
    dark=edge_lightness(lcd)
    taps(page,'Choose Sunlight')
    expect(lcd.locator('.lcd-care-light')).to_have_css('opacity','0')
    bright=edge_lightness(lcd)
    assert bright-dark > (20 if normal else 35),(dark,bright)
    taps(page,'Next toy item','Next toy item','Choose Plant food')
    cue('food',True)
    cue('talk')
    if normal:
        page.wait_for_function("midFade.includes('talk') && midFade.includes('food')")
        events=page.evaluate('events')
        for end,kind,next_kind in [('care-pour','water','food'),('care-feed','food','talk')]:
            last_end=max(i for i,e in enumerate(events) if e==['animationend',end,kind])
            assert any(e==['animationstart','care-arrive',next_kind] for e in events[last_end+1:]),events
    else:
        assert not page.evaluate("events.some(e=>e[1]==='care-arrive')")
    taps(page,'Previous toy item','Choose Kind words')
    cue('talk',True)
    expect(lcd.locator('[data-care-cue]')).to_have_count(0)
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(lcd.locator('[data-care-cue]')).to_have_count(0)
    settings(page)
    assert levels(page)==[40,40,100], levels(page)
    browser.close()
    print(f'Care handoffs and mixer verified. LCD edge brightness {dark:.0f} before sunlight, {bright:.0f} after.')
