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
    wide = page.locator('.camera-finder canvas')
    expect(zoom).to_have_value('1')
    dimensions = wide.evaluate('el => [el.width,el.height]')
    assert max(dimensions)==1200 and abs(dimensions[0]/dimensions[1]-bounds['width']/bounds['height'])<.002
    rect = wide.bounding_box()
    assert abs(rect['width']-bounds['width'])<2 and abs(rect['height']-bounds['height'])<2
    def check_scenery():
        # Sample the actual top and bottom strips for opaque, textured scenery.
        assert wide.evaluate('''el => [0, .95].every(y => {
          const strip=el.getContext('2d').getImageData(0,Math.floor(el.height*y),el.width,Math.floor(el.height*.05));
          const colors=new Set();
          for(let i=0;i<strip.data.length;i+=4){
            if(strip.data[i+3]!==255)return false;
            colors.add((strip.data[i]<<16)+(strip.data[i+1]<<8)+strip.data[i+2]);
          }
          return colors.size>3;
        })''')
    check_scenery()
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
    taps(page, 'Return to camera', 'Previous camera room')
    expect(shutter).to_be_enabled()
    expect(zoom).to_have_value('1')
    check_scenery()
    preview = wide.evaluate('el => el.toDataURL()')
    taps(page, 'Take photo')
    expect(page.get_by_text('Photo captured. 2 this session.')).to_be_attached()
    taps(page, 'Open captured photos')
    latest = page.get_by_role('img',name='Selected garden photo')
    expect(latest).to_be_visible()
    # At wide both renders fill the finder. Only the lower-left signature differs.
    changes = latest.evaluate("""async (img, before) => {
      await img.decode();
      const plain=new Image(); plain.src=before; await plain.decode();
      const w=img.naturalWidth,h=img.naturalHeight;
      const c=document.createElement('canvas'); c.width=w;c.height=h;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      const pixels=image=>{ctx.drawImage(image,0,0);return ctx.getImageData(0,0,w,h).data;};
      const a=pixels(plain),b=pixels(img);
      let icon=0,label=0,outside=0;
      for(let i=0;i<a.length;i+=4){
        if(a[i]===b[i] && a[i+1]===b[i+1] && a[i+2]===b[i+2])continue;
        const x=(i/4)%w,y=Math.floor(i/4/w);
        if(x>w*.32 || y<h*.88)outside++;
        else if(x<Math.min(w,h)*.077)icon++;
        else label++;
      }
      return [w,h,icon,label,outside];
    }""",preview)
    assert changes[:2]==dimensions and min(changes[2:4])>300 and changes[4]==0, changes
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
