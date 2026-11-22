"""A camellia specimen in brushed pigments on a 49 × 49 native pixel sheet."""
from pathlib import Path
from argparse import ArgumentParser
from PIL import Image,ImageDraw
parser = ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='destination PNG of the camellia')
parser.add_argument('--rows', type=Path, help='optional JavaScript data for the scenery painter')
args = parser.parse_args()
colors={
    'k':'#645b4a','b':'#8b7558','i':'#aa926d',
    's':'#4c6757','g':'#65816b','m':'#839673','h':'#a4ac83',
    'u':'#923f3e','r':'#b64d43','v':'#cd604c','p':'#df8062',
    'f':'#eab48b','t':'#b88849','y':'#e8bd69'
}
symbols='.'+''.join(colors);im=Image.new('P',(49,49))
im.putpalette([v for val in ['#000000',*colors.values()] for v in bytes.fromhex(val[1:])]+[0]*(768-3*len(symbols)))
d=ImageDraw.Draw(im)
def poly(c,xy): d.polygon(xy,fill=symbols.index(c))
def line(c,xy): d.line(xy,fill=symbols.index(c))
def dot(c,x,y):d.point((x,y),fill=symbols.index(c))
# The diagonal rises from the lower-left, kinks at the older wood, and stops
# at the calyx. All secondary stalks emerge at an actual node along this twig.
line('b',[(9,42),(14,39),(17,35),(20,32),(22,28),(23,24),(26,21),(28,17)])
line('k',[(10,42),(15,39),(18,35),(21,32),(23,28),(24,24),(27,21),(29,18)])
line('i',[(12,40),(14,38),(15,38)]);line('i',[(20,32),(22,29)])
line('b',[(18,35),(22,35),(25,33)]);line('b',[(22,28),(18,26),(14,23)])
line('b',[(24,24),(29,25),(34,22)]);line('b',[(23,24),(20,19),(18,16)])
# Four pointed, leathery leaves with simple, irregular edges. Veins taper
# before the tips. Their uneven sizes preserve cream paper between the forms.
poly('s',[(14,23),(11,24),(8,22),(6,19),(4,16),(3,13),(6,14),(9,14),(11,16),(13,16),(14,19),(16,21),(16,24)])
poly('g',[(4,14),(7,15),(9,15),(12,17),(13,19),(14,20),(15,23),(12,22),(10,20),(9,20),(7,17)])
line('h',[(6,16),(9,18),(11,20),(13,21)]);dot('m',10,16)
poly('s',[(29,24),(31,20),(34,18),(37,18),(39,17),(43,17),(41,19),(39,22),(36,24),(33,25),(29,25)])
poly('g',[(30,23),(32,20),(36,19),(39,18),(41,18),(38,20),(34,21)])
line('m',[(30,24),(34,22),(38,20)])
poly('s',[(24,33),(28,32),(30,33),(33,33),(35,35),(39,37),(38,38),(35,38),(32,39),(28,38),(25,36)])
poly('g',[(25,33),(29,33),(33,35),(36,36),(38,37),(33,37),(30,35),(26,35)])
line('m',[(26,34),(29,35),(32,36)])
poly('g',[(14,38),(12,37),(11,35),(12,32),(12,30),(13,28),(15,29),(16,33),(15,35)])
line('m',[(12,35),(13,32),(13,30)])
# A small pointed bud stays further back, muted against the mature flower.
poly('g',[(17,17),(15,16),(14,14),(15,12),(17,12),(19,13),(19,16)])
poly('u',[(15,14),(14,12),(15,10),(17,9),(18,10),(18,12),(17,14)])
line('v',[(15,12),(16,10),(17,10)])
# The woody calyx cups a full winter camellia. Overlapping rounded petals
# carry distinct shaded folds and a tuft of yellow stamens near the center.
poly('s',[(27,18),(25,17),(26,15),(30,14),(33,15),(32,18),(29,20)])
poly('u',[(23,14),(22,12),(23,9),(24,8),(25,8),(25,6),(27,4),(30,4),(32,6),(34,5),(37,7),(38,9),(37,11),(39,12),(39,15),(37,17),(34,18),(32,20),(29,20),(27,18),(25,18),(23,16)])
poly('r',[(23,13),(23,10),(25,8),(27,8),(27,6),(29,5),(31,6),(32,8),(35,6),(37,8),(36,11),(38,12),(38,15),(36,16),(33,16),(32,19),(30,19),(27,17),(25,17)])
poly('v',[(24,12),(24,10),(26,9),(28,9),(29,11),(28,13),(25,14)])
poly('v',[(27,7),(27,6),(29,5),(31,6),(32,9),(31,11),(29,10)])
poly('p',[(33,8),(35,7),(36,8),(36,10),(34,12),(32,12)])
poly('v',[(35,12),(37,12),(38,13),(37,15),(34,16),(32,15),(32,13)])
poly('v',[(26,14),(28,13),(31,14),(32,16),(32,18),(30,19),(28,17)])
line('p',[(24,10),(26,9),(27,9)]);line('p',[(28,16),(30,17),(31,17)])
line('u',[(29,12),(31,10),(33,10)])
poly('t',[(28,13),(28,12),(30,11),(32,11),(33,12),(32,14),(30,15)])
line('y',[(29,13),(30,12)]);line('y',[(31,13),(32,12)])
dot('f',29,11);dot('f',33,11)
# Small red seal below the branch, away from the painted leaves.
poly('r',[(39,40),(41,40),(41,43),(39,43)]);dot('.',40,41);dot('p',39,42)
im.info['transparency']=0;im.save(args.output)
rows=[''.join(symbols[im.getpixel((x,y))] for x in range(im.width)) for y in range(im.height)]
cutx,cuty,rx,by=im.getbbox()
rows=[r[cutx:rx] for r in rows[cuty:by]]
snippet='const camelliaStudy={\n  x:'+str(cutx)+',y:'+str(cuty)+',\n  inks:{\n'
for start in range(0,len(colors),5):snippet+='    '+','.join(k+':'+repr(v) for k,v in list(colors.items())[start:start+5])+',\n'
snippet+='  },\n  rows:[\n'+''.join("    '"+row+"',\n" for row in rows)+'  ],\n};\n'
if args.rows:
    args.rows.write_text(snippet)
