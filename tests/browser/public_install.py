"""Check the public tour handoff before standalone seed setup."""
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from scene_music import context_for, taps

source = str(Path('dist').resolve())
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    for platform, ua in {
        'android': 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36',
        'ios': 'Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1',
        'facebook': 'Mozilla/5.0 (iPhone) Mobile [FBAN/FBIOS;FBAV/1]',
    }.items():
        ctx, url, _ = context_for(browser, source, installed=False)
        ctx.add_init_script(f"Object.defineProperty(navigator,'userAgent',{{value:{ua!r}}})")
        page = ctx.new_page()
        page.goto(url)
        taps(page, 'Take a peek', 'Next', 'Continue')
        if platform == 'android':
            page.evaluate("""() => {
                window.installCalls=[];
                const e=new Event('beforeinstallprompt',{cancelable:true});
                e.prompt=async()=>installCalls.push(navigator.userActivation.isActive);
                e.userChoice=Promise.resolve({outcome:'accepted'});
                dispatchEvent(e);
            }""")
        taps(page, 'Play Plantigochi')
        expect(page.get_by_role('heading', name='Install Plantigochi')).to_be_visible()
        assert page.url.endswith('#install')
        if platform == 'android':
            assert page.evaluate('installCalls') == [True]
            expect(page.get_by_text('Installation accepted.', exact=False)).to_be_visible()
        elif platform == 'ios':
            expect(page.get_by_text('Add to Home Screen', exact=True)).to_be_visible()
        else:
            expect(page.get_by_text('Open in browser', exact=True)).to_be_visible()
            expect(page.get_by_text('Add to Home Screen', exact=True)).to_have_count(0)
        page.reload()
        expect(page.get_by_role('heading', name='Install Plantigochi')).to_be_visible()
        taps(page, 'Back')
        expect(page.get_by_role('button', name='Play Plantigochi')).to_be_visible()
        assert '#install' not in page.url
        ctx.close()
        print(platform, 'tour and install handoff passed')
    ctx, url, _ = context_for(browser, source, installed=True)
    page = ctx.new_page()
    page.goto(url+'#install')
    expect(page.get_by_role('button', name='Name your seed')).to_be_visible()
    print('Fresh standalone launch opens seed setup')
    ctx.unroute_all(behavior='wait')
    ctx.close()
    browser.close()
