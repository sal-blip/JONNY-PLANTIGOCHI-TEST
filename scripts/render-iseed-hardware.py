"""Draw iSEED's small hardware and currency glyphs on their final pixel grid."""
from pathlib import Path
from PIL import Image, ImageDraw
out=Path(__file__).resolve().parents[1]/'public/art'
def icon(name,rows,inks):
    width=max(map(len,rows)); im=Image.new('RGBA',(width,len(rows)))
    pen=ImageDraw.Draw(im)
    for y,row in enumerate(rows):
        for x,c in enumerate(row):
            if c!='.': pen.point((x,y),fill=inks[c])
    im.save(out/(name+'.png'))
# Mirror every painted pixel about the vertical axis, including the sprout stamp.
coin_half = [
    '.....ddd', '...ddhhh', '..dhhyyy', '.dhyyggg',
    '.dhygddd', 'dhygdhhg', 'dhygdghh', 'dhygdggh',
    'dhygdggd', 'dhygdggd', 'dhygdddd', '.dhygggg',
    '.dghyyyy', '..dggyyy', '...ddggg', '.....ddd',
]
icon('iseed-coin', [row + row[::-1] for row in coin_half],
     {'d':'#795332','g':'#bd8747','h':'#ffdfa1','y':'#eab96e'})
icon('iseed-pocket',[
'...dddddddddd...','..dlllllllllld..','..dlggggggggld..','..dlggdddgggld..',
'..dlssssssssld..','..dlshhhhhhsld..','..dlshhhhg hsld..'.replace(' ',''),'..dlshhggg hsld..'.replace(' ',''),
'..dlshggghhsld..','..dlshgghhhsld..','..dlshghhhhsld..','..dlshhhhhhsld..',
'..dlssssssssld..','..dlggggggggld..','..dlgggaagggld..','..dlgggdagggld..',
'..dlllllllllld..','...dddddddddd...'],
{'d':'#354a43','l':'#a6b3a2','g':'#667c71','s':'#506f60','h':'#d4dfbb','a':'#ead8a0'})
icon('iseed-seed-key',[
'........ddd.','......ddlhd.','....ddlhhhd.','...dlhhhgsd.','..dlhhggssd.',
'.dlhhgssssd.','.dlhgssssd..','dlhgssssd...','dlhgsssd....','dllggsd.....',
'.dlll d......'.replace(' ',''),'..dddd......'],
{'d':'#677e6b','l':'#bbcaa8','h':'#dbe6bd','g':'#9cb28c','s':'#88a17f'})
