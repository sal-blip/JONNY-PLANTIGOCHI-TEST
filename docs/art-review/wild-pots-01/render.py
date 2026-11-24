"""Render the fitting board and real-room image against a running candidate Vite server."""
import base64
from io import BytesIO
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

out = Path(__file__).resolve().parent
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    page.goto(sys.argv[1])
    assets = page.evaluate("""async () => {
      const {drawPottedPlant} = await import('/src/roomPlant.js');
      const {drawShopPreview} = await import('/src/roomShopArt.js');
      const {previewLayout} = await import('/src/shopPreviewLayout.js');
      const {drawRoom,placesFor} = await import('/src/roomArt.js');
      const {slotFor} = await import('/src/gardenLayout.js');
      const pots=['stump-cottage-pot','rain-boot-pot','ringed-planet-pot'];
      const plants=['venus-flytrap','golden-pothos','moth-orchid'];
      function canvas(w,h){ const c=document.createElement('canvas'); c.width=w;c.height=h;return c; }
      function specimen(species){return {species,id:'nursery-'+species};}
      const rows=pots.map((sku)=>[null,...plants].map((species)=>{
        const c=canvas(124,195),ctx=c.getContext('2d');
        if(species) drawPottedPlant(ctx,{x:62,y:127,size:2,plant:specimen(species),potSku:sku,reducedMotion:true});
        else { const [x,y,size]=previewLayout[sku];ctx.translate(62-x,127-y);drawShopPreview(ctx,{sku,x,y,size}); }
        return c.toDataURL();
      }));
      const rooms=[12,22].map(hour=>{
        const c=canvas(1200,960), shopItems=[], placed=[];
        [6,7,3].forEach((slot,i)=>{
          const address=slotFor(0,placesFor(0)[slot]);
          placed[slot]={...specimen(plants[i]),slot:address}; shopItems.push({id:'pot'+i,sku:pots[i],slot:address});
        });
        drawRoom(c,{hour,plants:placed,shopItems,reducedMotion:true});return c.toDataURL();
      });
      return {rows,rooms};
    }""")
    browser.close()

def decode(url):
    return Image.open(BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
def font(size, bold=False):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf',size)
def title(draw,xy,string,sz,bold=False,color='#233d33'):
    draw.text(xy,string,font=font(sz,bold),fill=color)
board=Image.new('RGB',(1120,1254),'#f6f2e6')
d=ImageDraw.Draw(board)
title(d,(32,17),'Garden pot fittings',35,True)
for i,name in enumerate(['Empty shop pot','Venus flytrap','Golden pothos','Moth orchid']):
    title(d,(33+270*i,84),name,19,True)
for i,(name,row) in enumerate(zip(['Stump Cottage','Rain Boot','Ringed Planet'],assets['rows'])):
    top=121+i*373
    d.rounded_rectangle((15,top,1105,top+362),radius=12,fill=['#e5e8d7','#eae3d5','#e5e3e9'][i])
    title(d,(32,top+12),name,20,True)
    for j,url in enumerate(row):
        tile=decode(url)
        # Use the same baseline and magnification in every column.
        tile=tile.crop((2,4,122,184)).resize((240,360),Image.Resampling.NEAREST)
        board.paste(tile,(30+270*j,top+2),tile)
board.save(out/'fittings.png')
rooms=[decode(url).convert('RGB') for url in assets['rooms']]
sheet=Image.new('RGB',(1000,704),'#f6f2e6');d=ImageDraw.Draw(sheet)
title(d,(24,15),'On the living room windowsill',31,True)
for i,room in enumerate(rooms):
    x=20+i*490
    title(d,(x,71),'Midday' if i==0 else 'Night',21,True)
    overview=room.resize((480,384),Image.Resampling.LANCZOS);sheet.paste(overview,(x,113))
    detail=room.crop((326,249,872,451)).resize((480,178),Image.Resampling.LANCZOS)
    sheet.paste(detail,(x,510))
sheet.save(out/'windowsill.png')
