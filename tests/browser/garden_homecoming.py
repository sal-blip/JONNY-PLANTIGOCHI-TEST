"""Check a returning player's award, interrupted placement and successor naming."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright, expect
from scene_music import SEED_SETUP, context_for, taps
from dew_lesson import READ_PLANT, sprout_fixture

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx,url,blank=context_for(browser,sys.argv[1] if len(sys.argv)>1 else str(Path('dist').resolve()))
    # Record each visible animation as it mounts, including short reduced-motion cues.
    ctx.add_init_script('''window.seenFlares=[];
      new MutationObserver(()=>{
        const burst=document.querySelector('[data-growth-flare]');
        if(burst && burst.getClientRects().length && !document.hidden &&
           !seenFlares.includes(burst.dataset.growthFlare))seenFlares.push(burst.dataset.growthFlare);
      }).observe(document,{subtree:true,childList:true});''')
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    fixture=sprout_fixture()['plant']
    for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
        fixture.pop(key,None)
    now=page.evaluate('Date.now()')
    h=3600000
    for before,after,hours in [('sprout','young',72),('young','split',120),('split','grown',168)]:
        fixture.update(stage=before,round=int(before=='split'),earned=(hours-1)*h,plantedAt=now-hours*h,
                       wateredAt=now-hours*h,anchor=now-h,lastDrink=now-h,fedAt=now-h,litAt=now-h,
                       companyAt=now-h,outbreakDue=now+36*h,growthFlares=[])
        page.goto(blank)
        page.evaluate(SEED_SETUP,fixture)
        page.goto(url)
        page.wait_for_function('(stage)=>seenFlares.includes(stage)',arg=after)
        if after=='grown':
            earned=page.evaluate(READ_PLANT)
            assert [p['id'] for p in earned['waitingPlants']]==[fixture['id']] and earned['graduates']==[]
        expect(page.locator('[data-growth-flare]')).to_have_count(0,timeout=8000)
        page.reload()
        expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
        assert not page.evaluate(READ_PLANT)['growthFlares']
    taps(page,'Choose a garden spot','Cancel move','Open garden','Open iSEED','Inventory')
    entry=page.get_by_role('button',name='Dew Fern Monstera · Choose a garden spot')
    expect(entry).to_be_visible()
    entry.tap()
    taps(page,'Place at Coffee table','Move in')
    expect(page.get_by_text('Two seeds are waiting. Return to your Plantigochi to choose one.',exact=True)).to_be_visible()
    expect(page.get_by_role('heading',name='Name your seed')).to_have_count(0)
    page.reload()
    chooser=page.get_by_role('dialog',name='What should we grow next?')
    expect(chooser).to_be_visible()
    expect(chooser.get_by_role('button',name='Plant Prayer Plant')).to_be_visible()
    taps(page,'Return to garden','Return to Plantigochi')
    expect(chooser).to_be_visible()
    taps(page,'Next seed','Plant Monkey Tail Cactus')
    page.reload()
    expect(page.get_by_role('dialog',name='Name your seed')).to_be_visible()
    taps(page,'Next toy item','A','Previous toy item','Done')
    expect(page.get_by_role('dialog',name='Name your seed')).to_have_count(0)
    saved=page.evaluate(READ_PLANT)
    assert saved['name']=='A' and saved['species']=='monkey-tail-cactus' and saved['id']!=fixture['id']
    assert saved['waitingPlants']==[] and [p['id'] for p in saved['graduates']]==[fixture['id']]
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(page.get_by_role('heading',name='Name your seed')).to_have_count(0)
    assert not errors,errors
    print('Stage flares, earned inventory, cancelled move, placement, successor naming and reload passed.')
