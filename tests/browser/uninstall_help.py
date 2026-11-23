"""Check device-specific removal help and restore the backup in a fresh installation."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import expect, sync_playwright
from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, context_for, taps

source = str(Path('dist').resolve())
cases = [
    ('Linux; Android 14; Chrome', 'Linux', 5, 'App info'),
    ('iPhone; Mobile Safari', 'iPhone', 5, 'Delete Bookmark'),
    ('Macintosh; Safari', 'MacIntel', 5, 'Delete Bookmark'),
    ('Macintosh; Safari', 'MacIntel', 0, 'Go → Home'),
]
with sync_playwright() as pw, TemporaryDirectory() as folder:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    for ua, platform, touches, instruction in cases:
        ctx, url, blank = context_for(browser, source)
        ctx.add_init_script(f"""Object.defineProperties(navigator,{{
          userAgent:{{value:{ua!r}}},platform:{{value:{platform!r}}},maxTouchPoints:{{value:{touches}}}
        }})""")
        page = ctx.new_page()
        page.goto(blank)
        garden = sprout_fixture()['plant']
        for key in ('dewLesson','tutorial','sproutDebut','sproutBurstPending'):
            garden.pop(key,None)
        page.evaluate(SEED_SETUP,garden)
        page.goto(url)
        taps(page,'Open Plantigochi menu','Settings','How to uninstall')
        expect(page.get_by_role('dialog', name='How to uninstall')).to_be_visible()
        expect(page.get_by_text(instruction,exact=True)).to_be_visible()
        with page.expect_download() as download:
            taps(page,'Back up garden')
        file = Path(folder)/download.value.suggested_filename
        download.value.save_as(file)
        assert json.loads(file.read_text())['id'] == garden['id']
        expect(page.get_by_text('Garden backup downloaded.',exact=True)).to_be_visible()
        taps(page,'Back')
        expect(page.get_by_role('dialog',name='Settings')).to_be_visible()
        assert page.evaluate(READ_PLANT)['id'] == garden['id']
        ctx.close()
        print(platform,touches,'help, backup and Back passed')
    ctx,url,_ = context_for(browser,source)
    page=ctx.new_page()
    page.goto(url)
    expect(page.get_by_role('button',name='Restore a garden')).to_be_visible()
    page.get_by_label('Garden backup',exact=True).set_input_files(file)
    taps(page,'Restore this garden')
    expect(page.get_by_role('button',name='Open toy menu')).to_be_visible()
    assert page.evaluate(READ_PLANT)['id'] == garden['id']
    print('Downloaded backup restored in fresh standalone storage')
    ctx.unroute_all(behavior='wait')
    ctx.close()
    browser.close()
