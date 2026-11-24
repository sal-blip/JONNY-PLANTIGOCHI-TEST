"""Render the native in-game plant/pot matrix for annotation. Pass a running Vite URL."""
import argparse
import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

PLANTS = [
    ('monstera', 'Monstera'), ('prayer-plant', 'Prayer Plant'),
    ('monkey-tail-cactus', 'Monkey Tail Cactus'), ('golden-pothos', 'Golden Pothos'),
    ('hoya-serpens-splash', 'Hoya Splash'), ('pink-micans', 'Pink Micans'),
    ('queen-anthurium', 'Queen Anthurium'), ('bird-of-paradise', 'Bird of Paradise'),
    ('moth-orchid', 'Moth Orchid'), ('snake-plant', 'Snake Plant'),
    ('monstera-albo', 'Monstera Albo'), ('variegated-billie', 'Variegated Billie'),
    ('pink-princess', 'Pink Princess'), ('thai-constellation', 'Thai Constellation'),
    ('raven-zz', 'Raven ZZ'), ('polka-dot-begonia', 'Polka Dot Begonia'),
    ('pearls-and-jade', 'Pearls and Jade'), ('pink-diamond', 'Pink Diamond'),
]
COLUMNS = [
    ('Nursery', None), ('Terracotta', 'terra'), ('Blue Wave', 'wave'),
    ('Bog Frog', 'bog-frog-pot'), ('Lava Pop', 'lava-pop-pot'),
]
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
RENDER = """async ({sku,columns})=>{
  const {drawPottedPlant}=await import('/src/roomPlant.js');
  return columns.map(([name,potSku])=>{
    const c=document.createElement('canvas');c.width=142;c.height=220;
    const plant={species:sku,id:'nursery-'+sku};
    drawPottedPlant(c.getContext('2d'),{x:71,y:149,size:2,plant,potSku,reducedMotion:true});
    return c.toDataURL();
  });
}"""

def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)


def build(url, dest):
    margin, gutter, cell, row, heading, header = 44, 257, 300, 464, 194, 78
    w = 2*margin + gutter + len(COLUMNS)*cell
    h = margin*2 + heading + len(PLANTS)*row + 3*header
    sheet = Image.new('RGB',(w,h),'#f8f4e9')
    d = ImageDraw.Draw(sheet)
    ink, muted, rule = '#263e34', '#4b6657', '#d0d3c5'
    d.text((margin,margin),'Plantigochi   /   Garden plant and pot review',font=font(54,True),fill=ink)
    d.text((margin,margin+78),'A shows the plant in its nursery pot. B–E show the four pots players can place.',font=font(28),fill=ink)
    d.text((margin,margin+126),'Mark a cell ID for revisions. All plants share the same room scale, baseline and daylight.',font=font(25),fill=muted)
    y = margin + heading
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium')
        page=browser.new_page()
        page.goto(url)
        for r,(sku,name) in enumerate(PLANTS,1):
            if (r-1)%6==0:
                d.rectangle((margin,y,w-margin,y+header),fill='#e5ebde')
                d.text((margin+14,y+26),'Plant',font=font(27,True),fill=ink)
                for c,(label,_) in enumerate(COLUMNS):
                    x=margin+gutter+c*cell
                    d.text((x+14,y+26),chr(65+c)+'   '+label,font=font(24,True),fill=ink)
                y+=header
            d.text((margin+16,y+25),f'R{r:02}',font=font(32,True),fill=muted)
            words=name.split(); lines=[]
            for word in words:
                if lines and d.textlength(lines[-1]+' '+word,font=font(27,True))<=gutter-28:
                    lines[-1]+=' '+word
                else:
                    lines.append(word)
            d.multiline_text((margin+16,y+98),'\n'.join(lines),font=font(27,True),fill=ink,spacing=8)
            tiles=page.evaluate(RENDER,{'sku':sku,'columns':COLUMNS})
            for c,data in enumerate(tiles):
                identity=f'R{r:02}-{chr(65+c)}'
                tile=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
                left,top,right,bottom=tile.getbbox()
                if left==0 or top==0 or right==tile.width or bottom==tile.height:
                    raise ValueError(identity+' touches the capture boundary')
                x=margin+gutter+c*cell
                tile=tile.resize((tile.width*2,tile.height*2),Image.Resampling.NEAREST)
                sheet.paste(tile,(x+8,y+12),tile)
                d.line((x,y,x,y+row),fill=rule,width=2)
                d.text((x+12,y+12),identity,font=font(20),fill=muted)
            y+=row
            d.line((margin,y,w-margin,y),fill=rule,width=2)
        browser.close()
    sheet.save(dest,optimize=True,dpi=(180,180))
    print(f'{dest}: {w} x {h}, {len(PLANTS)*len(COLUMNS)} cells')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--out',type=Path,default=Path(__file__).with_name('plant-and-pot-review-v3.png'))
    args=parser.parse_args()
    build(args.url,args.out)
