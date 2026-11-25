"""Recover a garden from the former browser-play release into a fresh installation."""
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
    page.goto(blank)
    legacy = sprout_fixture()['plant']
    page.evaluate(SEED_SETUP, legacy)
    page.evaluate("localStorage.setItem('plantigochi.browser-play','yes')")
    page.goto(url+'#play')
    expect(page.get_by_role('heading', name='Welcome back, gardener')).to_be_visible()
    expect(page.get_by_role('button', name='Take a peek')).to_have_count(0)
    expect(page.get_by_role('button', name='Back up my garden')).to_be_hidden()
    page.get_by_text('Need to install or move your garden?', exact=True).click()
    with page.expect_download() as download:
        taps(page,'Back up my garden')
    file = Path(directory)/download.value.suggested_filename
    download.value.save_as(file)
    assert page.evaluate(READ_PLANT)['id'] == legacy['id']
    installed, url, _ = context_for(browser, source)
    app = installed.new_page()
    app.goto(url)
    expect(app.get_by_role('button',name='Restore a garden')).to_be_visible()
    app.get_by_label('Garden backup',exact=True).set_input_files(file)
    taps(app,'Restore this garden')
    expect(app.get_by_role('button',name='Play Vine Trail')).to_be_visible()
    assert app.evaluate(READ_PLANT)['id'] == legacy['id']
    app.reload()
    expect(app.get_by_role('button', name='Play Vine Trail')).to_be_visible()
    expect(app.get_by_role('heading', name='Welcome back, gardener')).to_have_count(0)
    assert app.evaluate(READ_PLANT)['id'] == legacy['id']
    old, url, blank = context_for(browser, source, installed=False)
    tab = old.new_page()
    tab.goto(blank)
    tab.evaluate("([key, plant]) => localStorage.setItem(key, JSON.stringify(plant))",
                 [sprout_fixture()['key'], legacy])
    tab.goto(url+'#install')
    expect(tab.get_by_role('heading', name='Welcome back, gardener')).to_be_visible()
    expect(tab.get_by_role('button', name='Back up my garden')).to_be_visible()
    old.close()
    print('Saved browser gardens bypass the tour, export a backup, and resume the same lesson after restore and relaunch.')
    for context in (installed,ctx):
        context.unroute_all(behavior='wait')
        context.close()
    browser.close()
