"""Exercise the debug gesture, two purses and disposable clock on the production bundle."""
from pathlib import Path
import sys
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps

def open_debug(page):
    taps(page, 'Open Plantigochi menu', 'Settings')
    client = page.context.new_cdp_session(page)
    points = []
    for n, side in enumerate(('left', 'right')):
        box = page.locator('.debug-corner.' + side).bounding_box()
        points.append(dict(id=n+1,x=box['x']+box['width']/2,y=box['y']+box['height']/2))
        client.send('Input.dispatchTouchEvent',dict(type='touchStart',touchPoints=points))
    expect(page.get_by_role('heading',name='Debug menu')).to_be_visible(timeout=15000)
    client.send('Input.dispatchTouchEvent',dict(type='touchEnd',touchPoints=[]))
    client.detach()

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx,url,blank=context_for(b,sys.argv[1] if len(sys.argv)>1 else str(Path('dist').resolve()))
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    p=sprout_fixture()['plant']
    for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
        p.pop(key,None)
    p['gardenLife']['balance']=37
    page.goto(blank)
    page.evaluate(SEED_SETUP,p)
    page.goto(url)
    open_debug(page)
    taps(page,'Growth Lab','Start test copy')
    taps(page,'Jump to next event')
    expect(page.get_by_role('status').filter(has_text='Water is due')).to_be_visible()
    taps(page,'Return to test garden','Open toy menu','Choose Care','Choose Water')
    taps(page,'Open Growth Lab','Run · 1 min = 3 hours')
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    expect(page.get_by_role('button',name='Open Growth Lab')).to_contain_text('Paused')
    taps(page,'Open Plantigochi menu','1,000 coins in purse','Set purse to 1,000 coins')
    expect(page.get_by_text('Test purse · 1,000 coins')).to_be_visible()
    assert page.evaluate(READ_PLANT)['gardenLife']['balance']==37
    taps(page,'Close menu','Open Growth Lab','Exit and discard test copy')
    expect(page.get_by_role('button',name='Open Growth Lab')).to_have_count(0)
    actual=page.evaluate(READ_PLANT)
    assert actual['id']==p['id'] and actual['lastDrink']==p['lastDrink'] and actual['gardenLife']['balance']==37
    open_debug(page)
    taps(page,'1,000 coins in purse','Set purse to 1,000 coins','Set purse to 1,000 coins')
    expect(page.get_by_text('Saved garden purse · 1,000 coins')).to_be_visible()
    page.reload()
    expect(page.get_by_label('Purse',exact=True)).to_contain_text('1,000')
    assert page.evaluate(READ_PLANT)['gardenLife']['balance']==1000 and not errors,errors
    # Reach full growth in the lab, then use the ordinary toy and room controls.
    # The live plant stays at its original day-five stage through this entire trip.
    now=page.evaluate('Date.now()')
    hour=3600000
    p.update(stage='split',earned=167*hour,plantedAt=now-167*hour,anchor=now,
             wateredAt=now-167*hour,lastDrink=now,fedAt=now,litAt=now,companyAt=now,
             outbreakDue=now+36*hour,round=1)
    page.goto(blank)
    page.evaluate(SEED_SETUP,p)
    page.goto(url)
    open_debug(page)
    taps(page,'Growth Lab','Start test copy','Jump to next event')
    expect(page.get_by_text('Fully grown.',exact=False)).to_be_visible()
    taps(page,'Return to test garden')
    expect(page.locator('[data-growth-flare="grown"]')).to_be_visible()
    taps(page,'Choose a garden spot','Place at Coffee table','Move in')
    expect(page.get_by_text('Two seeds are waiting. Return to your Plantigochi to choose one.',exact=True)).to_be_visible()
    taps(page,'Return to Plantigochi','Plant Prayer Plant')
    expect(page.get_by_role('heading',name='Name your seed')).to_be_visible()
    taps(page,'Keep Prayer Plant')
    expect(page.get_by_role('img',name='Sleeping Prayer Plant seed',exact=False)).to_be_visible()
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu',exact=True)).to_be_visible()
    actual=page.evaluate(READ_PLANT)
    assert actual['id']==p['id'] and actual['stage']=='split' and actual['graduates']==p['graduates']
    assert not errors,errors
    print('Lab graduation, room placement, next seed and reload isolation passed.')
    print('Debug gesture, care, clock pause, test-purse isolation, saved purse and reload passed.')
