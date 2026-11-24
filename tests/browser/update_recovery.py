"""Exercise Settings with a browser update request deliberately left pending."""
import json
from pathlib import Path
import subprocess
from playwright.sync_api import expect, sync_playwright
from scene_music import context_for, SEED_SETUP
from dew_lesson import READ_PLANT

garden = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {newPlant} from './src/game.js';
import {checkIn} from './src/gardenEconomy.js';
const now=Date.now(), plant=checkIn(newPlant(now,'Fern'),now);
plant.gardenLife.visit.shown=true;
console.log(JSON.stringify(plant));
"""]))
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, str(Path('dist').resolve()))
    ctx.add_init_script("""(() => {
        const worker=Object.assign(new EventTarget(), {state:'activated',postMessage(){}});
        const reg=Object.assign(new EventTarget(), {active:worker,update(){
            return window.stallCheck ? new Promise(resolve=>{window.releaseCheck=resolve}) : Promise.resolve();
        }});
        const sw=Object.assign(new EventTarget(), {controller:worker,ready:Promise.resolve(reg),
            register:async()=>reg,getRegistration:async()=>reg});
        Object.defineProperty(navigator,'serviceWorker',{value:sw});
    })()""")
    page = ctx.new_page()
    page.goto(blank)
    page.evaluate(SEED_SETUP, garden)
    page.goto(url)
    page.get_by_role('button', name='Open Plantigochi menu').click()
    page.get_by_role('button', name='Settings', exact=True).click()
    page.evaluate('window.stallCheck=true')
    check = page.get_by_role('button', name='Check for updates', exact=True)
    check.click()
    expect(check).to_be_disabled()
    expect(page.get_by_text('Checking for an update…')).to_be_visible()
    retry = page.get_by_role('button', name='Retry update check')
    expect(retry).to_be_enabled(timeout=17000)
    page.evaluate('window.stallCheck=false')
    retry.click()
    expect(page.get_by_text('You have the latest version.')).to_be_visible()
    page.evaluate('window.releaseCheck()')
    expect(check).to_be_enabled()
    assert page.evaluate(READ_PLANT)['id'] == garden['id']
    print('Stalled Settings check, timeout, successful retry and save preservation passed.')
    browser.close()
