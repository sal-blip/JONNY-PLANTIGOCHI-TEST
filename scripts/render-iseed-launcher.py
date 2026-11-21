"""Draw the six iSEED launcher illustrations on their original 48-pixel grid.

Run with Python and Pillow when changing the artwork. The app bundles the
finished atlas and has no image generation or drawing dependencies at runtime.
"""
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw

def plantigochi(d):
    """Jade moulded leaf, polished chain, and an awake pocket sprout."""
    # A split Monstera blade with its stalk behind the lanyard.
    blade = [(9,16),(10,14),(13,11),(17,10),(20,10),(23,11),
             (25,13),(26,11),(28,9),(32,8),(35,9),(38,11),(40,13),
             (40,14),(35,14),(33,15),(38,15),(41,17),(43,19),
             (43,21),(39,20),(37,20),(40,22),(43,23),(44,25),
             (44,27),(43,28),(40,26),(37,25),(36,25),(40,28),
             (42,31),(41,34),(40,35),(39,32),(37,30),(38,35),
             (37,38),(34,40),(30,42),(28,41),(24,40),(20,40),
             (15,38),(13,36),(13,35),(18,36),(19,36),(15,34),
             (11,32),(9,29),(9,28),(13,30),(16,30),(12,27),
             (9,25),(7,22),(7,20),(10,22),(13,23),(11,20),
             (9,18)]
    edge = '#446c58'
    d.polygon([(x,y+1) for x,y in blade], fill=edge)
    d.polygon(blade, fill='#9fbf86',outline='#597d60')
    # Broad moulded facets with a cream-lit edge and a shaded lower lip.
    d.polygon([(9,17),(12,13),(15,12),(19,11),(23,12),(25,15),
               (27,13),(29,11),(32,10),(35,10),(38,12),(39,13),
               (34,13),(31,15),(28,17),(20,19),(13,20)], fill='#b6d19a')
    d.polygon([(19,33),(26,34),(34,32),(36,30),(37,35),(36,37),
               (32,39),(30,41),(25,39),(20,39),(16,37),
               (22,38),(25,38),(22,36)], fill='#84ab7e')
    d.line([(10,16),(12,14),(16,12),(19,11)],fill='#d6e4af')
    d.line([(28,12),(30,10),(33,9)],fill='#d6e4af')
    d.line([(8,22),(10,24),(13,26)],fill='#c7dca1')
    d.line([(10,29),(12,31),(14,32)],fill='#c5dba1')
    d.line([(35,15),(38,15),(41,17)],fill='#c8dba6')
    d.line([(39,22),(42,24)],fill='#cbdfa7')
    d.line([(38,27),(40,29),(41,31)],fill='#bace9c')
    d.line([(36,36),(33,39),(31,40)],fill='#719775')
    # Two moulded holes above the sharply recessed LCD.
    d.line([(20,13),(21,15)],fill='#7c9e71')
    d.line([(32,12),(31,13)],fill='#7d9d70')
    d.point((21,13),fill='#c7dba1')
    # Silver chain has an open ring and two little turned links at the mounting eye.
    d.ellipse((3,4,14,13),outline='#465c58',width=2)
    d.arc((3,4,14,13),175,314,fill='#a5b9ab')
    d.arc((4,5,13,12),178,303,fill='#f5f4d8')
    d.line([(4,9),(4,10),(5,11)],fill='#dbe2cb')
    d.line([(9,12),(11,12),(13,10)],fill='#cfdbcc')
    d.ellipse((12,10,15,14),outline='#5a736a')
    d.line([(12,10),(14,11)],fill='#dce4cb')
    d.ellipse((14,12,18,16),fill='#6f9270',outline='#a4bd8d')
    d.ellipse((15,12,17,15),outline='#526d63')
    d.line([(14,12),(15,12),(16,13)],fill='#eef1d3')
    # Lit gasket, dark inset, warm pixel face. Keep the glass corners notched.
    d.rounded_rectangle((15,16,35,32),radius=3,fill='#ccddac')
    d.rounded_rectangle((15,16,35,31),radius=3,fill='#789b74')
    d.rounded_rectangle((16,17,34,31),radius=2,fill='#496c61')
    d.rounded_rectangle((17,18,33,30),radius=1,fill='#bedbd0')
    d.line([(18,18),(32,18)],fill='#93b7a9')
    d.rectangle((17,26,33,29),fill='#d5dbb1')
    d.line([(18,30),(32,30)],fill='#c4c99c')
    d.line([(25,25),(25,22)],fill='#3f7057')
    d.polygon([(25,23),(23,23),(22,22),(22,21),(23,21),(25,22)],fill='#739b5c')
    d.line([(25,22),(27,20),(29,20)], fill='#48835a')
    d.line([(26,22),(28,21)],fill='#87ac68')
    d.line([(21,25),(29,25)],fill='#835f4f')
    d.rectangle((22,26,28,28),fill='#ce996e')
    d.line([(23,29),(27,29)],fill='#8e7158')
    d.point((23,27),fill='#455b4a')
    d.point((27,27),fill='#455b4a')
    d.point((25,28),fill='#8f6652')
    # The high/low button spacing mirrors the four keys on the real device.
    for x,y in [(18,33),(22,35),(27,35),(32,33)]:
        d.ellipse((x-1,y-1,x+1,y+1),fill='#688768')
        d.point((x,y-1),fill='#d3e1ad')
        d.point((x,y),fill='#bed5a0')


"""Two original 48-pixel iSEED launcher illustrations, rendered on clear RGBA."""

goods_palette = {
    'ink':'#413642','deep':'#524440','wood':'#835c48','cedar':'#a47552',
    'warm':'#c99565','gold':'#e9ba78','wheat':'#f3d594','milk':'#ffedc0',
    'pine':'#345a52','fern':'#527764','sage':'#83a183','mint':'#b2c5a0',
    'glass':'#83b3ae','ice':'#c4d9c0','sky':'#659095','steel':'#627e84',
    'wine':'#854354','brick':'#ad5f61','rose':'#da8081','petal':'#eea29a',
    'clay':'#ae694f','rust':'#8c5847','night':'#3d5058',
}

def goods_p(d,name,*xy):
    d.polygon(xy,fill=goods_palette[name])

def goods_r(d,name,x,y,w,h):
    if w>0 and h>0:d.rectangle((x,y,x+w-1,y+h-1), fill=goods_palette[name])

def goods_l(d,name,*xy):
    d.line(xy,fill=goods_palette[name],width=1)

def shop(d):
    p=lambda c,*a:goods_p(d,c,*a)
    r=lambda c,*a:goods_r(d,c,*a)
    l=lambda c,*a:goods_l(d,c,*a)
    # An angular glass gable peeks out behind the folded shop canopy.
    p('ink',(7,14),(19,5),(22,4),(33,7),(42,14),(42,34),(36,40),(8,39))
    p('pine',(10,13),(20,6),(22,5),(33,8),(40,14),(36,17))
    p('glass',(12,13),(21,6),(29,12),(24,14))
    p('ice',(14,12),(20,7),(21,7),(18,12))
    p('sky',(22,7),(30,12),(24,12))
    l('milk',(12,12),(20,6),(22,6))
    l('fern',(18,13),(21,7),(25,13))
    p('sage',(24,6),(32,8),(39,13),(33,13))
    l('mint',(26,7),(32,9),(36,12))
    l('fern',(29,8),(34,13))
    r('wood',9,13,26,2)
    # Greenhouse side wall, glazed in shadow with a stepped structural return.
    p('pine',(34,16),(42,15),(42,34),(35,39))
    p('fern',(36,18),(41,16),(41,33),(36,36))
    p('sky',(37,21),(40,19),(40,29),(37,32))
    l('mint',(37,23),(39,20))
    l('pine',(36,28),(40,25))
    l('sage',(37,34),(40,32))
    # Painted lintels frame a warm window and a bottle-green half-glazed door.
    r('wood',8,18,27,21); r('warm',9,22,25,15)
    r('pine',9,23,13,11);r('wheat',10,24,11,8)
    r('milk',10,24,9,2);r('gold',20,26,1,6)
    r('cedar',10,32,11,1);r('warm',14,24,1,8)
    r('pine',23,22,11,17);r('fern',24,23,9,15)
    r('deep',25,24,7,9);r('glass',26,25,5,7)
    l('ice',(26,28),(29,25));r('sky',30,28,1,4)
    r('sage',25,33,7,1);r('pine',25,35,7,3);r('gold',30,34,2,1)
    r('cedar',22,23,1,15);r('wheat',22,23,1,9)
    # Two little plants fill the display window; neither encroaches on the door.
    p('pine',(12,31),(9,28),(10,27),(13,28),(13,26),(15,27),(15,28),(17,26),(18,26),(17,29),(14,31))
    r('sage',10,27,2,1);r('mint',16,27,2,1)
    r('deep',10,31,7,2);r('clay',11,31,5,2);r('gold',11,31,4,1)
    r('fern',18,29,2,3);r('rose',17,27,2,2);r('brick',19,28,2,2);r('wheat',18,27,1,1)
    r('cedar',9,34,13,2);r('milk',9,34,12,1)
    r('pine',9,36,13,2);r('sage',10,36,11,1)
    # Striped canvas projects over the doorway. Each stripe narrows towards its
    # fold and has a darker hanging scallop with a one-pixel hem highlight.
    p('ink',(10,12),(34,12),(40,18),(39,21),(36,23),(33,22),(30,24),(26,22),
      (23,24),(20,22),(16,24),(13,22),(9,24),(5,23),(4,21),(5,18))
    p('rose',(10,13),(33,13),(38,18),(37,20),(6,20),(6,18))
    p('petal',(11,14),(32,14),(34,15),(10,15))
    p('milk',(13,13),(17,13),(14,18),(10,18))
    p('milk',(21,13),(24,13),(24,18),(19,18))
    p('milk',(28,13),(31,13),(34,18),(29,18))
    p('brick',(6,19),(10,19),(10,21),(8,22),(6,21))
    p('wheat',(11,19),(15,19),(15,21),(13,22),(11,21))
    p('brick',(16,19),(20,19),(20,21),(18,22),(16,21))
    p('wheat',(21,19),(25,19),(25,21),(23,22),(21,21))
    p('brick',(26,19),(30,19),(30,21),(28,22),(26,21))
    p('wheat',(31,19),(34,19),(35,21),(33,22),(31,21))
    p('wine',(35,18),(38,19),(38,20),(36,21))
    l('petal',(6,19),(10,19));l('petal',(16,19),(20,19));l('petal',(26,19),(30,19))
    # Painted plinth and the tiny stone doorstep.
    r('ink',7,38,29,3);r('cedar',8,38,26,1);r('warm',9,39,12,1)
    p('ink',(23,38),(33,38),(35,40),(35,41),(21,41),(21,40))
    r('wheat',23,39,10,1);r('cedar',22,40,12,1)

def inventory(d):
    p=lambda c,*a:goods_p(d,c,*a)
    r=lambda c,*a:goods_r(d,c,*a)
    l=lambda c,*a:goods_l(d,c,*a)
    # A bent-leather carry handle, with daylight inside the opening.
    l('ink',(12,23),(12,15),(15,9),(19,6),(23,5),(29,6),(34,10),(36,16),(36,23))
    p('ink',(11,23),(11,15),(14,9),(19,5),(23,4),(29,5),(34,9),(37,15),(37,24),
      (32,24),(32,16),(30,12),(26,9),(21,9),(18,11),(15,16),(15,23))
    p('rust',(12,22),(12,15),(15,10),(19,6),(24,5),(29,6),(33,9),(36,15),(36,21),
      (34,21),(34,16),(31,11),(27,8),(20,8),(17,10),(14,15),(14,22))
    l('warm',(14,13),(16,10),(20,7),(24,6),(28,7))
    l('gold',(19,7),(23,6));l('cedar',(32,11),(34,15),(34,19))
    # Wide steel scoop with a curled shoulder, a bright crease and ash handle.
    p('ink',(3,11),(5,9),(10,9),(14,12),(16,16),(16,19),(21,25),(18,28),(12,21),(9,21),(6,19),(4,16))
    p('steel',(4,11),(6,10),(10,10),(13,12),(15,16),(14,19),(11,20),(8,19),(5,15))
    p('glass',(5,11),(8,10),(12,12),(14,15),(14,17),(11,17),(7,14))
    l('ice',(5,11),(8,11),(11,13));l('sky',(7,13),(13,19));l('night',(9,18),(13,20))
    p('cedar',(13,20),(15,19),(20,25),(18,26))
    l('wheat',(14,20),(18,24))
    # A seed packet sits inside the open bag, with its folded paper neck and leaf seal.
    p('deep',(19,15),(27,12),(31,21),(31,25),(23,28))
    p('wheat',(20,15),(27,13),(30,21),(30,24),(23,26))
    l('milk',(21,15),(27,14));l('warm',(21,17),(27,15))
    p('fern',(23,21),(22,18),(24,18),(25,20),(26,17),(28,17),(27,20),(25,22))
    r('sage',26,18,2,1)
    # Garden snips, closing into the bag. Their two open rings remain cut out.
    p('night',(33,17),(36,17),(36,22),(30,29),(28,28))
    p('steel',(34,19),(36,19),(34,23),(29,28));l('ice',(34,20),(31,25))
    p('ink',(31,17),(29,13),(30,10),(33,9),(36,10),(36,14),(34,18))
    p('brick',(32,16),(30,13),(31,11),(33,10),(35,11),(35,14),(33,17))
    p('ink',(36,17),(38,12),(41,11),(43,13),(43,15),(40,18),(37,19))
    p('rose',(37,17),(39,13),(41,12),(42,13),(42,15),(39,17))
    r('ink',32,12,2,2);r('ink',39,14,2,2)
    d.point([(33,12),(33,13),(40,14),(40,15)],fill=(0,0,0,0))
    r('wheat',35,18,2,2);r('milk',35,18,1,1)
    # The mouth has a dark cavity and a stitched leather binding. Its rolled
    # upper edge, overlapping pockets and squared gusset explain the bag's volume.
    p('ink',(6,22),(10,20),(15,21),(18,23),(23,24),(32,22),(36,20),(41,22),(42,26),
      (40,38),(36,41),(12,42),(7,39),(5,26))
    p('deep',(7,23),(11,21),(18,24),(24,25),(34,22),(37,21),(40,23),(35,26),(13,27))
    p('rust',(32,25),(40,23),(41,26),(39,37),(35,40),(31,39))
    p('clay',(35,27),(40,25),(38,36),(35,38))
    l('gold',(38,27),(37,32))
    p('cedar',(6,25),(11,24),(19,26),(31,25),(35,24),(34,37),(31,40),(12,41),(8,38))
    p('warm',(7,25),(12,25),(19,27),(31,26),(34,25),(33,36),(30,39),(12,40),(9,37))
    p('wheat',(8,25),(13,26),(19,28),(30,27),(33,26),(32,29),(20,31),(9,28))
    l('milk',(9,25),(15,27),(20,28));l('rust',(8,29),(12,30),(13,38))
    p('rust',(12,28),(17,29),(17,38),(14,40),(13,39))
    p('cedar',(13,29),(16,30),(16,37),(14,38))
    p('pine',(18,30),(29,28),(32,29),(31,36),(28,39),(19,39),(17,36))
    p('fern',(19,30),(29,29),(30,30),(29,36),(27,37),(20,38),(18,36))
    l('sage',(19,30),(26,29),(29,29))
    # Embroidered seed and leaf on the outside pocket.
    p('mint',(22,34),(21,32),(23,32),(24,34),(25,32),(27,31),(27,33),(25,35),(23,36))
    r('wheat',25,32,2,1)
    r('gold',11,27,2,2);r('milk',11,27,1,1)
    r('gold',31,26,2,2);r('milk',31,26,1,1)
    l('cedar',(9,37),(12,39),(17,39));l('warm',(34,38),(37,37))


def journal(d):
    """A linen-bound gardening journal with a brass plant plate and a pencil."""
    outline='#443b48'
    leather='#965453'
    shade='#663e48'
    terrace='#c87c63'
    brass='#bd8649'
    cream='#f6d888'
    # A turned-up lower corner exposes the bound block, sewn edge and ribbon.
    d.polygon([(8,10),(10,7),(29,4),(33,6),(36,34),(35,37),(14,42),(10,40)],fill=outline)
    d.polygon([(10,10),(29,6),(32,7),(34,34),(14,39),(12,39)],fill='#7d494d')
    d.polygon([(12,35),(33,31),(35,35),(14,40),(12,39)],fill='#c39468')
    d.polygon([(13,35),(33,31),(34,34),(14,39),(12,38)],fill='#edd7a7')
    d.line([(14,37),(23,35),(30,33)],fill='#bca080')
    d.line([(16,38),(25,36)],fill='#fff0c1')
    d.polygon([(23,35),(27,34),(27,42),(25,40),(22,43)],fill=outline)
    d.polygon([(24,35),(26,35),(25,40),(24,39),(23,41)],fill='#518f87')
    # The stepped diagonal of the cover is softest on its upper left.
    d.polygon([(7,10),(9,7),(28,4),(32,5),(34,30),(32,33),(12,38),(9,37)],fill=outline)
    d.polygon([(8,10),(10,8),(28,5),(31,6),(33,29),(31,32),(12,36),(10,35)],fill=leather)
    d.polygon([(10,9),(28,6),(30,7),(30,10),(12,14)],fill=terrace)
    d.line([(12,9),(23,7),(28,7)],fill='#edab7c')
    d.polygon([(30,10),(31,9),(33,29),(31,32),(13,36),(11,35),(28,31),(31,29)],fill=shade)
    # Dark oxblood bookcloth spine with a burnished raised rib at either end.
    d.polygon([(8,10),(11,8),(14,35),(11,36),(10,35)],fill='#77444e')
    d.line([(11,11),(12,20),(13,30)],fill='#b0695a')
    d.line([(9,12),(11,11)],fill=brass);d.line([(11,31),(13,30)],fill=brass)
    # Die-stamped gold frame around a single ginkgo fan.
    d.polygon([(14,13),(27,10),(29,25),(16,28)],fill=shade)
    d.polygon([(15,14),(26,12),(28,24),(17,26)],fill=brass)
    d.polygon([(16,15),(25,13),(27,23),(18,25)],fill='#895954')
    d.line([(22,22),(23,24)],fill=cream)
    d.polygon([(21,21),(17,18),(17,16),(19,15),(21,17),(22,14),(24,14),(26,16),(25,19),(23,21)],fill='#e7bd6d')
    d.line([(17,17),(19,16),(20,17)],fill='#ffdfa0')
    d.line([(23,15),(24,15)],fill='#fff0b3')
    d.line([(19,18),(21,20)],fill='#cf9654')
    d.point((23,18),fill=brass)
    d.line([(17,31),(22,30)],fill=brass);d.line([(25,29),(27,28)],fill='#be7960')
    # Separate honey-yellow pencil. Its eraser, ferrule and graphite are distinct
    # color groups so even the small landscape icon reads as a writing tool.
    d.polygon([(38,11),(40,9),(43,10),(44,12),(36,31),(32,35),(32,30)],fill=outline)
    d.polygon([(39,11),(40,10),(42,11),(43,12),(41,15),(37,14)],fill='#cd7f75')
    d.line([(40,10),(42,11)],fill='#f3afa0')
    d.line([(38,13),(41,14)],fill='#d4d7c4');d.line([(38,14),(40,15)],fill='#859b98')
    d.polygon([(37,15),(40,16),(35,29),(33,30)],fill='#d5a04c')
    d.line([(38,15),(33,28)],fill='#fde496')
    d.line([(40,16),(35,29)],fill='#b07a4e')
    d.polygon([(33,28),(35,30),(33,32),(32,33)],fill='#e6c19c')
    d.point((32,33),fill='#37444e')


def library(d):
    """An open field guide with an illustrated leaf plate and cultivation notes."""
    edge='#303f48'
    teal='#487d74'
    green='#466c50'
    # Broad, open volume with a recessed central binding and heavy cloth boards.
    d.polygon([(3,12),(6,10),(16,9),(22,12),(24,14),(30,11),(40,10),(43,11),(45,36),(42,38),(32,38),(26,41),(23,42),(18,39),(6,39),(3,37)],fill=edge)
    d.polygon([(4,13),(16,11),(23,15),(25,16),(31,13),(42,12),(44,35),(40,37),(30,37),(24,40),(19,37),(6,37)],fill=teal)
    d.line([(5,36),(17,36),(22,38)],fill='#86b6a0');d.line([(27,38),(32,36),(41,35)],fill='#8ebaa2')
    # Two independent page blocks with clear top and lower edges.
    d.polygon([(5,10),(8,8),(16,8),(21,10),(24,13),(27,11),(33,8),(41,8),(43,33),(40,35),(32,35),(26,38),(23,39),(19,36),(15,35),(6,35)],fill='#705f51')
    d.polygon([(6,11),(16,9),(21,11),(24,14),(24,37),(19,34),(15,33),(7,33)],fill='#e3cda0')
    d.polygon([(6,10),(9,9),(16,9),(21,11),(23,13),(23,34),(19,32),(15,31),(7,31)],fill='#f1dfac')
    d.polygon([(7,10),(15,9),(20,11),(22,13),(22,20),(19,18),(7,18)],fill='#faedbd')
    d.line([(7,32),(15,32),(20,34)],fill='#fff0bd')
    d.polygon([(25,14),(28,12),(33,10),(40,9),(42,32),(39,34),(32,34),(26,37)],fill='#c3a985')
    d.polygon([(25,13),(31,10),(35,9),(40,9),(42,31),(37,32),(31,32),(26,35)],fill='#ead6a8')
    d.polygon([(27,13),(33,10),(40,10),(41,22),(32,23),(27,26)],fill='#fae7b4')
    d.line([(25,15),(25,32)],fill='#c4a37a');d.line([(27,35),(32,33),(40,33)],fill='#fff0bf')
    # Pressed botanical cutting: serrate lance leaves attach to a visible stem.
    d.line([(12,29),(14,25),(16,21),(17,15)],fill='#6d8057',width=1)
    d.polygon([(15,24),(12,23),(9,20),(9,17),(13,18),(15,20)],fill=green)
    d.polygon([(10,18),(13,19),(14,21),(12,20)],fill='#77a36b')
    d.polygon([(16,19),(14,16),(14,13),(16,13),(18,15),(18,17)],fill=green)
    d.line([(15,14),(17,17)],fill='#87aa73')
    d.polygon([(15,24),(16,21),(19,19),(21,19),(20,22),(18,24)],fill=green)
    d.line([(16,23),(19,21)],fill='#87aa73')
    d.polygon([(14,27),(17,25),(20,25),(19,27),(16,28)],fill='#698451')
    d.line([(10,29),(13,29)],fill='#c7b184')
    # The right-hand plate has a heading, three annotation lines, and a drop
    # diagram beside them. A berry-colored bookmark hangs off the far edge.
    d.line([(28,15),(33,13),(37,13)],fill='#75604e');d.line([(29,17),(33,16)],fill='#af8b6a')
    d.line([(29,20),(32,19)],fill='#aa9070');d.line([(29,22),(31,21)],fill='#c3a47c')
    d.polygon([(36,17),(39,21),(39,23),(37,25),(34,24),(33,22)],fill='#497a78')
    d.line([(36,19),(35,22)],fill='#9ec3aa');d.point((38,23),fill='#386777')
    d.line([(28,28),(33,26),(37,26)],fill='#9f8262');d.line([(29,30),(34,28)],fill='#b89a79')
    d.polygon([(37,32),(40,32),(41,40),(39,39),(37,41)],fill='#885049')
    d.line([(38,33),(38,38)],fill='#ca7657')


def postcard(d):
    """A sent postcard, its airmail envelope, and a mountain lake print."""
    ink='#484552'
    # The envelope flap peeks behind the card, tilted in the opposite direction.
    d.polygon([(5,15),(31,6),(36,7),(44,31),(14,41),(9,40)],fill=ink)
    d.polygon([(6,16),(32,8),(35,8),(42,30),(14,39),(10,39)],fill='#d1ab7d')
    d.polygon([(7,16),(32,8),(34,9),(22,25)],fill='#efd6a2')
    d.line([(9,17),(21,26),(33,12)],fill='#ae8865')
    # A cream card with bottom edge thickness and a few diagonally striped corners.
    d.polygon([(4,10),(6,8),(41,13),(44,14),(41,37),(39,39),(3,33)],fill=ink)
    d.polygon([(5,11),(7,10),(42,15),(39,37),(4,32)],fill='#bc9979')
    d.polygon([(5,10),(41,15),(38,35),(4,31)],fill='#f0dfba')
    d.line([(6,10),(25,13)],fill='#fff2d1');d.line([(5,30),(26,33)],fill='#fff0d1')
    d.line([(7,10),(9,11)],fill='#b56458');d.line([(16,12),(19,12)],fill='#76959a')
    d.line([(6,29),(8,31)],fill='#77929a');d.line([(14,31),(17,32)],fill='#b96758')
    d.line([(33,34),(36,35)],fill='#789397')
    # A square polychrome print has a pale vermilion sky, dark mountain and lake.
    d.polygon([(8,13),(29,16),(27,32),(6,29)],fill='#977666')
    d.polygon([(9,14),(28,16),(26,30),(7,28)],fill='#e4ab87')
    d.polygon([(9,14),(28,16),(27,20),(8,18)],fill='#eac19a')
    d.rectangle((12,15,13,16),fill='#ffe4a8')
    d.polygon([(8,22),(12,19),(15,21),(20,16),(22,17),(26,23),(27,22),(26,26),(8,25)],fill='#758d94')
    d.polygon([(16,21),(20,16),(22,17),(24,20),(22,19),(21,20),(20,18)],fill='#edf0d3')
    d.polygon([(8,22),(10,21),(13,23),(16,22),(20,24),(25,21),(27,22),(26,26),(8,25)],fill='#547c75')
    d.polygon([(8,25),(15,25),(24,24),(26,25),(26,29),(7,27)],fill='#82b2a5')
    d.line([(10,26),(15,26)],fill='#c3d7b4');d.line([(18,26),(21,25)],fill='#c8d8b6')
    d.line([(17,27),(20,27)],fill='#629398')
    d.polygon([(7,26),(10,27),(14,27),(16,29),(7,28)],fill='#486e64')
    # Offset postal vignette and copper cancellation arcs are visible at native scale.
    d.polygon([(33,15),(40,16),(39,22),(32,21)],fill='#a9645b')
    d.polygon([(34,16),(39,17),(38,20),(33,20)],fill='#da9276')
    d.polygon([(35,18),(36,16),(37,18),(37,20),(35,20)],fill='#f4d9a3')
    d.line([(30,19),(32,18),(34,18)],fill='#6e7d78');d.line([(30,20),(31,22),(34,23),(36,22)],fill='#6e7d78')
    d.line([(29,25),(37,26)],fill='#aa9376');d.line([(29,27),(36,28)],fill='#aa9376')
    d.line([(29,29),(33,29)],fill='#b7a287')


# One palette for each enamel backing: rim, upper reflecting edge, sky, ground,
# and the cast shadow beneath the illustration. The backing is light enough for
# the dark, local-color contours of the illustrated object to remain distinct.
TILES = {
    'plantigochi': ('#445e65','#d8e6d6','#9dc9cb','#6aa09d','#547b77'),
    'shop':       ('#935e50','#ffe0af','#f5c89f','#db9b82','#b97d6a'),
    'inventory':  ('#566981','#d6e4e6','#b7cdda','#829cb6','#657f92'),
    'journal':    ('#746878','#f6dfd1','#e4c8c4','#b99eab','#967f8e'),
    'library':    ('#537462','#e5f1cf','#c1d9ad','#8fb499','#739380'),
    'postcard':   ('#8f704f','#fff1c1','#efdaae','#d3ad7a','#aa8969'),
}


def pixel_tile(paint, colors):
    rim, shine, sky, ground, shadow = colors
    tile = Image.new('RGBA',(48,48))
    draw = ImageDraw.Draw(tile)
    # Each step is on the native pixel grid. Interior shoulders are offset one
    # pixel from the rim to suggest a short, beveled ceramic edge.
    draw.rounded_rectangle((0,0,47,47),radius=9,fill=rim)
    draw.rounded_rectangle((1,1,46,45),radius=8,fill=shine)
    face = Image.new('RGB',(48,48))
    brush = ImageDraw.Draw(face)
    top=ImageColor.getrgb(sky); bottom=ImageColor.getrgb(ground)
    for y in range(2,46):
        t = round(7 * (y-2)/43)/7
        brush.line((0,y,47,y),fill=tuple(round(a+(b-a)*t) for a,b in zip(top,bottom)))
    mask=Image.new('1',tile.size)
    ImageDraw.Draw(mask).rounded_rectangle((2,2,45,44),radius=7,fill=1)
    tile.paste(face,(0,0),mask)
    draw.line((9,1,28,1),fill=shine)
    draw.line((2,9,2,16),fill=shine)
    draw.ellipse((8,39,40,43),fill=shadow)
    art=Image.new('RGBA',tile.size)
    paint(ImageDraw.Draw(art))
    return Image.alpha_composite(tile,art)


def render():
    makers=(plantigochi,shop,inventory,journal,library,postcard)
    sheet=Image.new('RGBA',(48*len(makers),48))
    for i,maker in enumerate(makers):
        sheet.paste(pixel_tile(maker,TILES[maker.__name__]),(48*i,0))
    return sheet

if __name__ == '__main__':
    output=Path(__file__).resolve().parents[1] / 'public' / 'art' / 'iseed-launcher.png'
    render().save(output,optimize=True)
