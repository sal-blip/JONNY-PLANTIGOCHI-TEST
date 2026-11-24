"""Exercise the camera through iSEED, using the real garden renderer."""
import json
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import expect, sync_playwright
from scene_music import SEED_SETUP, context_for, taps

garden = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {newPlant} from './src/game.js';
import {checkIn} from './src/gardenEconomy.js';
const now=Date.now(), p=checkIn(newPlant(now,'Fern'),now);
p.gardenLife.visit.shown=true;
console.log(JSON.stringify(p));
"""]))
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
    ctx, url, blank = context_for(browser, sys.argv[1] if len(sys.argv)>1 else str(Path('dist').resolve()))
    page = ctx.new_page()
    page.goto(blank)
    page.evaluate(SEED_SETUP, garden)
    page.goto(url)
    taps(page, 'Open garden', 'Open iSEED')
    # Stall only the camera's request for the native art atlas.
    page.evaluate("""() => {
        const decode=Image.prototype.decode;
        Image.prototype.decode=function(){
            if(this.src.includes('native-art')){
                Image.prototype.decode=decode;
                return new Promise(()=>{});
            }
            return decode.call(this);
        };
    }""")
    taps(page, 'Share')
    expect(page.get_by_text('This room is taking longer to open.')).to_be_visible(timeout=16000)
    taps(page, 'Retry')
    shutter = page.get_by_role('button', name='Take photo')
    expect(shutter).to_be_enabled()
    taps(page, 'Next camera room')
    expect(page.get_by_role('heading',name='Plant studio')).to_be_visible()
    expect(shutter).to_be_enabled()
    zoom = page.get_by_role('slider',name='Zoom')
    bounds = page.locator('.camera-finder').bounding_box()
    slider = zoom.bounding_box()
    assert slider['height']>slider['width'] and slider['x']>bounds['x']+bounds['width']*.75
    screen = page.locator('.iseed-screen').bounding_box()
    assert abs(bounds['height']-screen['height'])<6 and abs(bounds['width']-screen['width'])<6
    zoom.press('End')
    expect(zoom).to_have_value('4')
    taps(page, 'Take photo', 'Open captured photos')
    expect(page.get_by_role('img',name='Selected garden photo')).to_be_visible()
    with page.expect_download() as saved:
        taps(page, 'Save photo')
    photo = saved.value.path().read_bytes()
    assert saved.value.suggested_filename=='plantigochi-plant-studio.png'
    assert photo.startswith(b'\x89PNG') and len(photo)>10000
    w,h = int.from_bytes(photo[16:20],'big'),int.from_bytes(photo[20:24],'big')
    assert max(w,h)==1200 and abs(w/h-bounds['width']/bounds['height'])<.002
    taps(page, 'Return to camera', 'Previous camera room', 'Take photo')
    expect(page.get_by_text('Photo captured. 2 this session.')).to_be_attached()
    page.reload()
    taps(page, 'Open garden', 'Open iSEED', 'Share', 'Open captured photos')
    expect(page.get_by_role('heading',name='Photo 2 of 2')).to_be_visible()
    taps(page, 'Previous photo')
    expect(page.get_by_role('heading',name='Photo 1 of 2')).to_be_visible()
    page.evaluate("""() => {
      Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
      Object.defineProperty(navigator,'share',{value:async data=>{window.shared=data.files[0].name;}});
    }""")
    taps(page, 'Share photo')
    assert page.evaluate('window.shared')=='plantigochi-plant-studio.png'
    page.evaluate("Object.defineProperty(navigator,'canShare',{value:()=>false})")
    with page.expect_download() as fallback:
        taps(page,'Share photo')
    assert fallback.value.suggested_filename==saved.value.suggested_filename
    print('Full-screen camera, right zoom, both rooms, retry, PNG framing, persistent roll and sharing passed.')
    browser.close()
