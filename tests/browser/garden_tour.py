"""Use real touch gestures to finish the first room tour and collect the free spin."""
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from dew_lesson import READ_PLANT, sprout_fixture
from scene_music import SEED_SETUP, button, context_for, taps


def checkpoint(page, step):
    surface = page.locator('main[data-surface]')
    if step:
        expect(surface).to_have_attribute('data-garden-tour', step)
    else:
        expect(surface).not_to_have_attribute('data-garden-tour', re.compile('.+'))
    assert page.evaluate(READ_PLANT).get('gardenTour') == step


def swipe(page, start, end):
    cdp = page.context.new_cdp_session(page)
    try:
        for fraction in (0, .4, .8, 1):
            x, y = (a + fraction * (b - a) for a, b in zip(start, end))
            cdp.send('Input.dispatchTouchEvent', {
                'type': 'touchStart' if fraction == 0 else 'touchMove',
                'touchPoints': [{'x': x, 'y': y}],
            })
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    finally:
        cdp.detach()


def expect_room_centered(page, index):
    page.wait_for_function("""index => {
      const viewport = document.querySelector('.room-picture').getBoundingClientRect();
      const room = document.querySelectorAll('.room-frame')[index].getBoundingClientRect();
      return Math.abs((room.left + room.right - viewport.left - viewport.right) / 2) <= 2;
    }""", arg=index, timeout=5000)


def finish_garden_tour(page, reload_after_studio=False):
    checkpoint(page, 'garden')
    rewards = button(page, 'Open daily rewards')
    dialog = page.get_by_role('dialog', name='Daily rewards', exact=True)
    expect(dialog).not_to_be_visible()
    expect(page.get_by_text('Swipe up from the chevrons', exact=False)).to_be_visible()
    w, h = (page.viewport_size[k] for k in ('width', 'height'))
    handle = button(page, 'Open garden').bounding_box()
    x = handle['x'] + handle['width'] / 2
    y = handle['y'] + handle['height'] / 2
    swipe(page, (x, y), (x, y - h*.32))
    checkpoint(page, 'studio')
    expect(page.locator('main[data-surface="garden"]:not([data-transitioning])')).to_be_visible()
    expect(rewards).not_to_be_visible()
    swipe(page, (.77*w, .35*h), (.22*w, .35*h))
    checkpoint(page, 'living')
    expect_room_centered(page, 1)
    expect(rewards).not_to_be_visible()
    if reload_after_studio:
        page.reload()
        checkpoint(page, 'living')
        expect(page.locator('main[data-surface="garden"]:not([data-transitioning])')).to_be_visible()
        expect_room_centered(page, 1)
    swipe(page, (.22*w, .35*h), (.77*w, .35*h))
    checkpoint(page, 'rewards')
    expect_room_centered(page, 0)
    expect(rewards).to_be_visible()
    expect(dialog).not_to_be_visible()
    rewards.tap()
    expect(dialog).to_be_visible()
    claim = dialog.get_by_role('button', name=re.compile(r'^Claim \d+ coins$'))
    if claim.count():
        claim.tap()
    if reload_after_studio:
        taps(page, 'Close daily rewards')
        checkpoint(page, 'rewards')
        page.reload()
        rewards.tap()
        expect(claim).to_have_count(0)
    taps(page, 'Spin for free')
    expect(page.get_by_role('heading', name=re.compile(r'^You won'))).to_be_visible(timeout=15000)
    prize = page.evaluate(READ_PLANT)['gardenLife']['visit']['spin']
    taps(page, 'Return to garden')
    checkpoint(page, None)
    expect(page.locator('main[data-surface="garden"]:not([data-transitioning])')).to_be_visible()
    expect(dialog).not_to_be_visible()
    assert page.evaluate(READ_PLANT)['gardenLife']['visit']['spin'] == prize


def exercise(browser, source):
    ctx, url, blank = context_for(browser, source)
    try:
        # A fixed coin prize makes duplicate payments measurable across reload.
        ctx.add_init_script("""const randomValues = crypto.getRandomValues.bind(crypto);
          crypto.getRandomValues = a => a instanceof Uint32Array && a.length === 2
            ? a.fill(0) : randomValues(a);""")
        page = ctx.new_page()
        page.emulate_media(reduced_motion='no-preference')
        errors = []
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.goto(blank)
        plant = sprout_fixture()['plant']
        plant['gardenLife']['visit']['claimed'] = True  # Setup paid for the tutorial pot.
        page.evaluate(SEED_SETUP, plant)
        page.goto(url)
        taps(page, 'Maybe later', 'Claim 20 coins')
        finish_garden_tour(page, reload_after_studio=True)
        saved = page.evaluate(READ_PLANT)
        assert saved['id'] == plant['id'] and saved['gardenLife']['visit']['spin']['id'] == 'coins10'
        balance = saved['gardenLife']['balance']
        assert balance == 30, ('Starter coins must only be paid once', balance)
        page.reload()
        expect(button(page, 'Open toy menu')).to_be_visible()
        assert page.evaluate(READ_PLANT)['gardenLife']['balance'] == balance
        expect(page.get_by_role('dialog', name='Daily rewards')).not_to_be_visible()
        page.emulate_media(reduced_motion='reduce')
        # Player resumes the rewards checkpoint on another day, before that day's claim.
        # Closing and reloading with both rewards paid must keep the receipt and allow exit.
        garden = sprout_fixture()['plant']
        del garden['sproutDebut']
        garden['gardenTour'] = 'rewards'
        garden['gardenLife']['visit'] = dict(date=garden['gardenLife']['day'], streak=2, claimed=False)
        page.goto(blank)
        page.evaluate(SEED_SETUP, garden)
        page.goto(url + '?care=water')
        checkpoint(page, 'rewards')
        # A cold-launch reminder and a newer click delivered to the open game
        # must both wait for the walkthrough. The latest click survives reload.
        page.wait_for_function("history.state?.gardenTourCare?.action === 'water'")
        page.evaluate("""navigator.serviceWorker.dispatchEvent(new MessageEvent('message',
          {data:{type:'plant-care',action:'test'}}))""")
        page.wait_for_function("history.state?.gardenTourCare?.action === 'test'")
        taps(page,'Open daily rewards','Claim 10 coins','Close daily rewards')
        page.reload()
        taps(page,'Open daily rewards')
        expect(button(page,'Claim 10 coins')).to_have_count(0)
        taps(page,'Spin for free')
        expect(page.get_by_role('heading',name='You won 10 coins')).to_be_visible()
        page.reload()
        taps(page,'Open daily rewards')
        expect(button(page,'Spin for free')).to_have_count(0)
        taps(page,'Return to garden')
        checkpoint(page,None)
        expect(page.get_by_role('dialog',name='Test notifications')).to_be_visible()
        assert not page.evaluate('history.state?.gardenTourCare')
        assert page.evaluate(READ_PLANT)['gardenLife']['balance'] == 20

        # A pre-tour garden keeps the ordinary next-day reward reveal.
        garden.pop('gardenTour')
        page.goto(blank)
        page.evaluate(SEED_SETUP, garden)
        page.goto(url)
        expect(page.get_by_role('dialog',name='Daily rewards')).to_be_visible()
        expect(button(page,'Open daily rewards')).not_to_be_visible()
        taps(page,'Close daily rewards')
        expect(button(page,'Open toy menu')).to_be_visible()
        assert not errors, errors
    finally:
        ctx.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
        exercise(browser, str(Path('dist').resolve()))
        browser.close()
    print('Passed toy and room swipes, mid-tour reload, rewards dismissal, free spin and return to garden.')
