"""Check every comparison tile and buy a pot directly from the scale view."""
from pathlib import Path
from playwright.sync_api import expect,sync_playwright
from scene_music import SEED_SETUP,context_for,taps
from dew_lesson import sprout_fixture
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium')
    ctx,url,blank=context_for(b,str(Path('dist').resolve()))
    page=ctx.new_page()
    page.goto(blank)
    plant=sprout_fixture()['plant']
    for key in ('tutorial','sproutDebut','sproutBurstPending','dewLesson'):
        plant.pop(key,None)
    plant['gardenLife']['balance']=30
    page.evaluate(SEED_SETUP,plant)
    page.goto(url)
    taps(page,'Open garden','Open iSEED','Shop')
    page.get_by_label('Compare garden sizes').check()
    canvases=page.locator('.shop-scale-art')
    expect(canvases).to_have_count(17)
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
    expect(detail.locator('canvas')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('button',name='Bog Frog Pot · 30 coins')).to_be_focused()
    taps(page,'Bog Frog Pot · 30 coins','Buy','Place at Center of the coffee table','Buy for 30 coins')
    expect(page.get_by_label('Bog Frog Pot · Center of the coffee table')).to_be_visible()
    page.reload()
    taps(page,'Open garden')
    expect(page.get_by_label('Bog Frog Pot · Center of the coffee table')).to_be_visible()
    print('All 17 shop SKUs render alongside an unclipped reference; comparison purchase, table placement and reload passed.')
    b.close()
