"""Check every comparison tile and buy a pot directly from the scale view."""
from pathlib import Path
from playwright.sync_api import expect,sync_playwright
from scene_music import SEED_SETUP,context_for,taps
from dew_lesson import sprout_fixture
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium')
    ctx,url,blank=context_for(b,str(Path('dist').resolve()))
    ctx.add_init_script("""{
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        if (image instanceof HTMLImageElement && image.currentSrc.split('?')[0].endsWith('.webp')) {
          this.canvas.dataset.lastBitmap = image.naturalWidth + 'x' + image.naturalHeight;
        }
        return draw.call(this, image, ...args);
      };
    }""")
    page=ctx.new_page()
    page.goto(blank)
    plant=sprout_fixture()['plant']
    for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
        plant.pop(key,None)
    life=plant['gardenLife']
    life.update(balance=30,visit={'date':life['day'],'streak':1,'claimed':True,'shown':True})
    page.evaluate(SEED_SETUP,plant)
    page.goto(url)
    taps(page,'Open garden','Open iSEED','Shop')
    thumbnails=page.locator('.shop-list .shop-art')
    count=thumbnails.count()
    assert count>0
    assert all(w==216 and h==192 for w,h in thumbnails.evaluate_all("tiles=>tiles.map(c=>[c.width,c.height])"))
    for name,price,source_size in [
        ('Oak photo frame',20,'282x274'),('Lacquer photo frame',28,'233x238'),
        ('Maneki-neko',30,'207x284'),('Record player',65,'278x208'),
    ]:
        taps(page,f'{name} · {price} coins')
        detail=page.get_by_role('dialog',name=name)
        expect(detail.locator('canvas')).to_have_attribute('data-last-bitmap',source_size)
        detail.get_by_role('button',name='Back').tap()
    page.get_by_label('Compare garden sizes').check()
    canvases=page.locator('.shop-scale-art')
    expect(canvases).to_have_count(count)
    result=canvases.evaluate_all("""tiles=>tiles.map(c=>{
      const ctx=c.getContext('2d'),{data}=ctx.getImageData(0,0,c.width,c.height);
      let touches=false, item=false, reference=false;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        if(data[4*(y*c.width+x)+3]<128)continue;
        if(x===0||y===0||x===c.width-1||y===c.height-1)touches=true;
        if(x<140)item=true; else reference=true;
      }
      return {name:c.closest('button').ariaLabel,item,reference,touches};
    })""")
    assert all(v['item'] and v['reference'] and not v['touches'] for v in result),result
    taps(page,'Monstera Albo · 450 coins')
    detail=page.get_by_role('dialog',name='Monstera Albo')
    expect(detail.get_by_role('button',name='Buy')).to_be_disabled()
    detail.get_by_role('button',name='Back').tap()
    expect(page.get_by_label('Compare garden sizes')).to_be_checked()
    taps(page,'Bog Frog Pot · 30 coins')
    detail=page.get_by_role('dialog',name='Bog Frog Pot')
    expect(detail.locator('canvas')).to_have_attribute('width','648')
    page.keyboard.press('Escape')
    expect(page.get_by_role('button',name='Bog Frog Pot · 30 coins')).to_be_focused()
    taps(page,'Bog Frog Pot · 30 coins','Buy','Place at Center of the coffee table','Buy for 30 coins')
    expect(page.get_by_label('Bog Frog Pot · Center of the coffee table')).to_be_visible()
    page.reload()
    taps(page,'Open garden')
    expect(page.get_by_label('Bog Frog Pot · Center of the coffee table')).to_be_visible()
    print('All shop SKUs render alongside an unclipped reference; comparison purchase, table placement and reload passed.')
    b.close()
