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
    taps(page,'Take a peek','Next','Continue')
    expect(page.locator('.tour-actions button')).to_have_count(1)
    taps(page,'Install app')
    with page.expect_download() as download:
        taps(page,'Export existing garden')
    file = Path(directory)/download.value.suggested_filename
    download.value.save_as(file)
    assert page.evaluate(READ_PLANT)['id'] == legacy['id']
    installed, url, _ = context_for(browser, source)
    app = installed.new_page()
    app.goto(url)
    expect(app.get_by_role('button',name='Restore a garden')).to_be_visible()
    app.get_by_label('Garden backup',exact=True).set_input_files(file)
    taps(app,'Restore this garden')
    expect(app.get_by_role('button',name='Play one round')).to_be_visible()
    assert app.evaluate(READ_PLANT)['id'] == legacy['id']
    print('Former browser player sees install only, exports the seed, and resumes its lesson after restore.')
    for context in (installed,ctx):
        context.unroute_all(behavior='wait')
        context.close()
    browser.close()
