"""Verify the room still has painted pixels during a held, cancelled or completed swipe."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from dew_lesson import sprout_fixture
from garden_hud import surface
from scene_music import SEED_SETUP, context_for, taps


def touch(session, kind, x=0, y=0):
    points = [] if kind in ('touchEnd', 'touchCancel') else [{'x': x, 'y': y}]
    session.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})


def artwork(page):
    return page.locator('.room-frame:not([inert]) .room-actors').first.evaluate("""canvas => {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 8;
        const ctx = probe.getContext('2d');
        ctx.drawImage(canvas, 0, 0, 8, 8);
        const pixels = ctx.getImageData(0, 0, 8, 8).data;
        return [canvas.width, pixels.some((v,i) => i % 4 === 3 && v > 0)];
    }""")


def room_frame_changes(page):
    """Compare the actual room artwork across several sprite frames."""
    return page.locator('.room-frame:not([inert]) .room-actors').first.evaluate("""async canvas => {
        const sample = document.createElement('canvas');
        sample.width = 400;
        sample.height = 320;
        const ctx = sample.getContext('2d', {willReadFrequently:true});
        ctx.globalCompositeOperation = 'copy';
        const scale = canvas.width / sample.width;
        const above = Math.round((canvas.height / scale - sample.height) * .39);
        let previous, changes = 0;
        for (let i = 0; i < 9; i++) {
            ctx.drawImage(canvas, 0, above*scale, canvas.width, 320*scale, 0, 0, 400, 320);
            const pixels = ctx.getImageData(0,0,400,320).data;
            if (previous && pixels.some((v,j) => v !== previous[j])) changes++;
            previous = pixels;
            if (i < 8) await new Promise(resolve => setTimeout(resolve, 210));
        }
        return changes;
    }""")


def swipe(page, session, x, y, dy, expected, cancel=False):
    touch(session, 'touchStart', x, y)
    touch(session, 'touchMove', x, y + dy//2)
    touch(session, 'touchMove', x, y + dy)
    expect(page.locator('main[data-transitioning]')).to_have_count(1)
    assert artwork(page) == expected, ('Room lost paint mid-swipe', artwork(page), expected)
    touch(session, 'touchCancel' if cancel else 'touchEnd')


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
    page = ctx.new_page()
    page.emulate_media(reduced_motion='no-preference')
    cdp = ctx.new_cdp_session(page)
    plant = sprout_fixture()['plant']
    for key in ('tutorial', 'sproutDebut', 'sproutBurstPending', 'dewLesson'):
        plant.pop(key, None)
    plant['scene'] = 'garden'
    page.goto(blank)
    page.evaluate(SEED_SETUP, plant)
    page.goto(url)
    taps(page, 'Open garden')
    surface(page, 'garden')
    painted = artwork(page)
    assert painted[1]
    # Open ceiling, clear of HUD and furniture.
    x, y = 100, 105
    swipe(page, cdp, x, y, 85, painted, cancel=True)
    surface(page, 'garden')
    lens = page.locator('.room-lens')
    touch(cdp, 'touchStart', x, y)
    touch(cdp, 'touchEnd')
    expect(lens).to_have_class('room-lens inspecting')
    page.wait_for_timeout(4200)
    expect(lens).to_have_class('room-lens inspecting')
    page.wait_for_function("!document.querySelector('.room-lens').classList.contains('inspecting')")
    touch(cdp, 'touchStart', x, y)
    expect(lens).to_have_class('room-lens inspecting')
    touch(cdp, 'touchEnd')
    for _ in range(2):
        swipe(page, cdp, x, y, 175, painted)
        surface(page, 'toy')
        swipe(page, cdp, 100, 610, -180, painted)
        surface(page, 'garden')
        taps(page, 'Open iSEED')
        surface(page, 'phone')
        assert artwork(page) == painted
        assert room_frame_changes(page) >= 3, 'Room froze behind iSEED'
        touch(cdp, 'touchStart', 100, 115)
        touch(cdp, 'touchMove', 100, 170)
        expect(page.locator('main[data-transitioning]')).to_have_count(1)
        assert room_frame_changes(page) >= 3, 'Room froze during a held swipe'
        touch(cdp, 'touchCancel')
        surface(page, 'phone')
        swipe(page, cdp, 100, 115, 180, painted)
        surface(page, 'garden')
    taps(page, 'Open iSEED', 'Journal')
    assert room_frame_changes(page) >= 3, 'Room froze inside Journal'
    page.emulate_media(reduced_motion='reduce')
    # A minute boundary can update the room lighting once.
    assert room_frame_changes(page) <= 1, 'Room kept animating with reduced motion'
    taps(page, 'Put down iSEED')
    surface(page, 'garden')
    page.emulate_media(reduced_motion='no-preference')
    stage = page.locator('.room-picture')
    start = stage.evaluate('el => el.scrollLeft')
    touch(cdp, 'touchStart', 285, y)
    touch(cdp, 'touchMove', 200, y + 2)
    touch(cdp, 'touchMove', 94, y + 3)
    touch(cdp, 'touchEnd')
    assert stage.evaluate('el => el.scrollLeft') > start + 120
    expect(lens).to_have_class('room-lens')
    surface(page, 'garden')
    ctx.close()
    browser.close()
    print('Painted garden retained across held, cancelled and repeated touch swipes; open-space zoom returned to rest.')
