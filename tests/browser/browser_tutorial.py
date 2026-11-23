"""Play a real browser tutorial and carry its completed garden into the installed game."""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps

source = str(Path('dist').resolve())
with sync_playwright() as pw, TemporaryDirectory() as directory:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, source, installed=False)
    page = ctx.new_page()
    page.goto(url)
    taps(page,'Take a peek','Next','Continue','Just start playing','Name your seed','Keep Monstera')
    taps(page,'Open toy menu','Next toy item','Back on toy','Open toy menu','Choose Care','Choose Water')
    watered=page.evaluate(READ_PLANT)
    page.reload()
    taps(page,'Visit my garden','Open iSEED','Shop','Terracotta pot · 12 coins',
         'Place at Center of the living room windowsill','Buy for 12 coins','Return to my seed',
         'Open toy menu','Next toy item','Next toy item','Choose Growth','Choose Growth Spurt')
    for _ in range(4):
        taps(page,'Choose Spend 50 coins')
    taps(page,'Maybe later')
    expect(page.get_by_role('button',name='Install Plantigochi',exact=True)).to_have_count(0)
    taps(page,'Claim 20 coins')
    reminder = page.get_by_role('button',name='Install Plantigochi',exact=True)
    expect(reminder).to_be_visible()
    page.reload()
    expect(reminder).to_be_visible()
    reminder.tap()
    expect(page.get_by_role('dialog',name='Install app')).to_be_visible()
    with page.expect_download() as download:
        taps(page,'Back up garden')
    file=Path(directory)/download.value.suggested_filename
    download.value.save_as(file)
    saved=page.evaluate(READ_PLANT)
    assert saved['id']==watered['id'] and saved['gardenLife']['balance']==20 and saved['stage']=='sprout'
    assert saved['gardenLife']['items'] and not saved.get('browserInstallReminder')
    page.reload()
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(reminder).to_have_count(0)
    # The installation can share this origin's storage or start in a new container.
    ctx.add_init_script("Object.defineProperty(navigator,'standalone',{value:true})")
    page.goto(url)
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    assert page.evaluate(READ_PLANT)['id']==saved['id']
    isolated,url,_=context_for(browser,source)
    installed=isolated.new_page()
    installed.goto(url)
    expect(installed.get_by_role('button',name='Restore a garden')).to_be_visible()
    installed.get_by_label('Garden backup',exact=True).set_input_files(file)
    taps(installed,'Restore this garden')
    expect(installed.get_by_role('button',name='Open toy menu')).to_be_visible()
    restored=installed.evaluate(READ_PLANT)
    for key in ('id','name','wateredAt','stage','gardenLife'):
        assert restored[key]==saved[key],key
    expect(installed.get_by_role('button',name='Install Plantigochi',exact=True)).to_have_count(0)
    print('Browser tour, first drink and reload, pot placement, four boosts, skipped round, final gift, install chat, backup, shared and separate installation storage passed.')
    round_ctx,url,blank=context_for(browser,source,installed=False)
    player=round_ctx.new_page()
    player.goto(blank)
    player.evaluate(SEED_SETUP,sprout_fixture()['plant'])
    player.goto(url+'#play')
    taps(player,'Play one round','Play heart','Claim 20 coins')
    expect(player.get_by_role('button',name='Install Plantigochi',exact=True)).to_be_visible()
    taps(player,'Maybe later')
    player.reload()
    expect(player.get_by_role('button',name='Open toy menu')).to_be_visible()
    expect(player.get_by_role('button',name='Install Plantigochi',exact=True)).to_have_count(0)
    print('Played Dew Catch, claimed reward, deferred install and resumed without repeat reminder.')
    for context in (round_ctx,isolated,ctx):
        context.unroute_all(behavior='wait')
        context.close()
    browser.close()
