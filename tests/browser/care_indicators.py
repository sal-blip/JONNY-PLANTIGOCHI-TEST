"""Play the four care actions through the toy menu on the production bundle."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from audio_mixer import levels, settings
from dew_lesson import sprout_fixture
from scene_music import context_for, SEED_SETUP, taps

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
    page = ctx.new_page()
    page.goto(blank)
    p = sprout_fixture()['plant']
    for key in ('dewLesson','tutorial','sproutDebut','sproutBurstPending'):
        p.pop(key, None)
    hour = 3600000
    now = page.evaluate('Date.now()')
    p.update(plantedAt=now-60*hour,wateredAt=now-59*hour,stage='sprout',growthFlares=[],
             anchor=now,lastDrink=now-5*hour,fedAt=now-50*hour,litAt=now-25*hour,
             companyAt=now-25*hour,outbreakDue=now+35*hour)
    page.evaluate(SEED_SETUP,p)
    page.goto(url)
    lcd = page.locator('.lcd')
    def cue(kind, delivered=False):
        selector=f'[data-care-cue="{kind}"]' + ('[data-delivered]' if delivered else ':not([data-delivered])')
        expect(lcd.locator(selector)).to_be_visible()
    cue('water')
    expect(lcd.locator('.lcd-care-light')).to_have_css('opacity','1')
    taps(page,'Open toy menu','Choose Care','Choose Water')
    cue('water',True)
    cue('food')
    taps(page,'Next toy item','Choose Sunlight')
    expect(lcd.locator('.lcd-care-light')).to_have_css('opacity','0')
    taps(page,'Next toy item','Next toy item','Choose Plant food')
    cue('food',True)
    cue('talk')
    taps(page,'Previous toy item','Choose Kind words')
    cue('talk',True)
    expect(lcd.locator('[data-care-cue]')).to_have_count(0)
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(lcd.locator('[data-care-cue]')).to_have_count(0)
    settings(page)
    assert levels(page)==[40,40,100], levels(page)
    browser.close()
    print('All four cues, successful care, reload and initial mixer levels verified.')
