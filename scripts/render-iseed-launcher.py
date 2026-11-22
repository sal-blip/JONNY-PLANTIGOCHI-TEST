"""Draw the five iSEED launcher illustrations on their original 48-pixel grid.

Run with Python and Pillow when changing the artwork. The app bundles the
finished atlas and has no image generation or drawing dependencies at runtime.
"""
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw

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
    """A seed shop with a small brass-rimmed sign and a sunlit display."""
    timber='#724b42'
    edge='#483b40'
    ivory='#ffedbb'
    red='#cb655c'
    wine='#9f4c50'

    # Warm plaster, sill and threshold. Straight uprights frame the shop window.
    d.rectangle((8,18,39,39),fill=edge)
    d.rectangle((9,20,38,37),fill='#deb88b')
    d.rectangle((9,24,10,36),fill='#f7d8a5')
    d.rectangle((37,23,38,37),fill='#ba8b71')
    d.rectangle((9,38,38,39),fill=timber)
    d.rectangle((8,40,39,40),fill='#99765f')
    d.line((10,38,25,38),fill='#ecc397')

    # Keep the room behind the glass pale so the single stem reads in silhouette.
    d.rectangle((11,23,25,34),fill=timber)
    d.rectangle((12,24,24,33),fill='#d6dfc4')
    d.line((12,24,24,24),fill='#b8c9ae')
    d.line((12,33,24,33),fill='#bccbb0')
    d.line((12,27,14,25),fill='#f2f0cf')
    d.point((12,28),fill='#e5ead1')

    # The two small leaf blades branch at different heights. One pixel of
    # uninterrupted glass separates the left tip from the upper right leaf.
    d.line((18,28,18,31),fill='#3c634e')
    d.line((15,28,18,30),fill='#3c634e')
    d.polygon([(14,27),(16,27),(17,28),(17,29),(15,29),(14,28)],fill='#407257')
    d.line((14,27,15,27),fill='#6b9766')
    d.line((18,29,21,27),fill='#456d52')
    d.polygon([(20,27),(21,26),(23,26),(22,27),(21,28),(20,28)],fill='#49795a')
    d.line((21,26,22,26),fill='#80a96c')
    d.rectangle((15,31,21,31),fill='#a75e4c')
    d.rectangle((16,32,20,33),fill='#be7657')
    d.line((16,31,20,31),fill='#eaab79')
    d.line((16,32,16,33),fill='#d59264')
    d.rectangle((10,35,25,36),fill=timber)
    d.line((10,35,24,35),fill='#f0cc8a')

    # Bottle-green entrance, blue glass and a single brass latch.
    d.rectangle((26,22,36,39),fill='#6b5249')
    d.rectangle((27,23,35,38),fill='#3d6257')
    d.rectangle((28,25,34,31),fill='#80aba1')
    d.line((28,28,31,25),fill='#c4d1ae',width=2)
    d.line((31,29,33,27),fill='#a9c3ae')
    d.line((27,32,35,32),fill='#b1b18b')
    d.rectangle((29,34,33,37),fill='#547866')
    d.point((34,33),fill='#ffdc90')
    d.rectangle((25,39,37,40),fill='#f5d39a')
    d.rectangle((24,41,38,41),fill='#855f50')

    # Canvas fills the roofline. The striping widens towards the viewer and
    # each finished edge drops two pixels under the awning's shaded lip.
    d.polygon([(6,18),(10,12),(12,11),(36,11),(38,12),(42,18),(42,21),(40,24),
               (38,24),(36,22),(35,23),(32,24),(30,24),(28,22),(26,24),
               (23,24),(21,23),(20,22),(18,24),(15,24),(13,23),(12,22),
               (10,24),(8,24),(6,22)],fill=edge)
    stripes=[(11,15,7,12,red,'#df8175',wine),
             (16,20,13,19,'#f1d29c',ivory,'#d4ad7d'),
             (21,25,20,26,red,'#e68779',wine),
             (26,30,27,33,'#f1d29c',ivory,'#caa77e'),
             (31,36,34,41,red,'#dc7c70',wine)]
    d.polygon([(11,13),(36,13),(41,19),(41,21),(7,21),(7,19)],fill=red)
    for top_l,top_r,lip_l,lip_r,body,light,hem in stripes:
        d.polygon([(top_l,13),(top_r,13),(lip_r,19),(lip_l,19)],fill=body)
        d.line((top_l,13,top_r,13),fill=light)
        d.rectangle((lip_l,19,lip_r,20),fill=light)
        d.rectangle((lip_l,21,lip_r,21),fill=hem)
        d.rectangle((lip_l+1,22,lip_r-1,22),fill=hem)
    d.line((10,12,37,12),fill='#945a4c')

    # The independent green shop emblem sits directly above the awning.
    sign_green='#355747'
    brass='#edbd75'
    d.polygon([(14,4),(32,4),(34,6),(34,12),(32,14),(14,14),(12,12),(12,6)],fill=edge)
    d.polygon([(15,5),(31,5),(33,7),(33,11),(31,13),(15,13),(13,11),(13,7)],fill=brass)
    d.polygon([(15,6),(31,6),(32,7),(32,11),(31,12),(15,12),(14,11),(14,7)],fill=sign_green)
    d.point((15,9),fill='#a4aa7a')
    d.point((31,9),fill='#a4aa7a')
    # Two separate blades with a dark gap above their single vertical stalk.
    d.polygon([(17,7),(20,7),(21,8),(21,9),(20,9),(18,9),(17,8)],fill='#b0cf9c')
    d.line((18,7,19,7),fill='#e6e8b5')
    d.polygon([(25,8),(26,7),(29,7),(29,8),(27,9),(25,9)],fill='#f0d18e')
    d.line((27,7,28,7),fill=ivory)
    d.line((21,9,23,11),fill='#a7c797')
    d.line((25,9,23,11),fill='#ebd899')
    d.line((23,10,23,11),fill='#c4d4a0')

def inventory(d):
    """An open cedar storage crate, a folded indigo cloth, and a radish seed packet."""
    ink = '#443a41'
    dark_wood = '#67483e'
    endgrain = '#a46b49'
    cedar = '#cc9061'
    honey = '#e7b57d'
    rim_light = '#f4c995'
    # Three-quarter view. The rear lip rises above the deep, dark open mouth.
    d.polygon([(3,18),(15,12),(19,12),(43,16),(44,18),(42,35),
               (32,41),(29,42),(6,38),(4,36)], fill=ink)
    d.polygon([(5,18),(16,13),(19,13),(42,17),(41,19),(30,24)], fill=dark_wood)
    d.polygon([(7,18),(17,14),(19,14),(39,17),(30,22)], fill='#6f5147')
    d.polygon([(14,15),(18,13),(41,17),(40,18),(18,15)], fill=honey)
    d.line([(5,18),(16,13)], fill='#e8b57c')

    # A folded seed envelope. The picture shows a single red radish and leaves.
    d.polygon([(24,8),(35,4),(37,4),(40,16),(39,18),(28,23),(27,23)], fill=ink)
    d.polygon([(25,9),(35,5),(36,5),(39,16),(38,17),(28,21)], fill='#ffe4ad')
    d.polygon([(25,9),(35,5),(36,5),(36,7),(26,11)], fill='#d0a077')
    d.line([(26,9),(34,6)], fill='#f8db9c')
    d.line([(37,10),(38,15),(37,17)], fill='#dcb384')
    d.line([(29,18),(30,19),(31,19)], fill='#e3be8e')
    d.polygon([(29,12),(28,10),(30,10),(32,12),(32,13)], fill='#567c53')
    d.polygon([(32,13),(32,10),(34,8),(34,10),(33,12)], fill='#426b4f')
    d.polygon([(30,13),(31,12),(33,12),(35,13),(34,15),(32,16),(30,15)], fill='#ad5355')
    d.line([(30,13),(32,13)], fill='#e58a76')
    d.line([(32,16),(32,17),(31,18)], fill='#987452')

    # Light face and shaded end of the box, with an uninterrupted top rim.
    d.polygon([(4,19),(30,23),(31,24),(31,40),(29,40),(6,36)], fill=cedar)
    d.polygon([(5,21),(29,25),(30,26),(30,32),(6,28)], fill='#dba071')
    d.polygon([(5,29),(30,33),(30,39),(7,36)], fill='#c6895c')
    d.line([(6,29),(27,33),(30,33)], fill='#966447')
    d.line([(7,30),(21,32)], fill='#edb880')
    d.line([(7,35),(20,37),(27,38)], fill='#de9e6c')
    d.line([(11,32),(14,32),(16,33),(19,33)], fill='#b87e56')
    d.line([(13,33),(15,34),(18,34)], fill='#df9e70')
    d.polygon([(31,24),(43,18),(42,33),(40,35),(32,39)], fill=endgrain)
    d.polygon([(32,25),(41,21),(41,27),(32,31)], fill='#b47b53')
    d.line([(32,33),(41,28)], fill='#765240')
    d.line([(33,34),(40,30)], fill='#c88c60')
    d.line([(39,22),(39,33)], fill='#a16a49')
    # The through-slot holds an inside shadow and a beveled lower edge.
    d.polygon([(18,25),(22,25),(26,26),(27,27),(27,28),(26,29),
               (22,28),(18,28),(17,27),(17,26)], fill=dark_wood)
    d.line([(18,26),(22,26),(26,27)], fill='#41383b')
    d.line([(19,27),(22,27),(25,28)], fill='#574842')
    d.line([(18,29),(22,29),(26,30)], fill=rim_light)
    d.line([(4,19),(29,23),(31,23),(43,17)], fill=rim_light)
    d.line([(5,20),(29,24)], fill='#e3ac75')
    d.line([(32,24),(41,20)], fill='#c98e5e')
    # End-grain finger joints are visible at the corner on alternating boards.
    d.line([(29,26),(32,26)], fill='#bd8156')
    d.line([(29,27),(31,27)], fill=honey)
    d.line([(30,36),(32,35)], fill='#8f5d45')
    d.line([(30,37),(32,36)], fill='#e0a46d')

    # Folded tenugui draped over the left lip, with its stitched hem and ridges.
    d.polygon([(6,18),(12,14),(15,12),(21,13),(25,16),(24,18),
               (18,21),(16,24),(14,28),(12,28),(6,26)], fill=ink)
    d.polygon([(7,18),(14,14),(16,13),(20,14),(23,16),(21,18),
               (15,20),(12,21)], fill='#596981')
    d.polygon([(8,18),(14,15),(17,14),(20,15),(15,16),(11,19)], fill='#8192a2')
    d.polygon([(8,19),(12,20),(16,20),(15,25),(13,27),(7,25)], fill='#455672')
    d.line([(8,20),(8,23)], fill='#586c82')
    d.line([(10,20),(10,24)], fill='#62758a')
    d.line([(13,21),(13,25)], fill='#364a63')
    d.line([(7,24),(12,26),(14,26)], fill='#c1c5b0')
    d.line([(16,19),(19,17),(22,16)], fill='#93a1a8')
    d.line([(14,15),(15,14)], fill='#c6c6b1')
    d.line([(11,17),(12,16)], fill='#b5bdb0')
    d.point((11,25),fill='#e0d1b4')


def journal(d):
    """An indigo field notebook with a four-hole sewn spine and a fern on its cover."""
    contour = '#343542'
    indigo = '#415770'
    cloth_light = '#546d82'
    cloth_shadow = '#35495e'
    paper = '#f1dda7'
    # The back cover, page block, and front cover share the same four corners,
    # stepped down in depth. The thicker cut edge distinguishes a closed book.
    d.polygon([(6,12),(32,6),(35,7),(40,34),(39,36),
               (15,42),(12,42),(11,40)], fill=contour)
    d.polygon([(12,37),(37,31),(39,34),(38,35),(15,41),(13,40)], fill=cloth_shadow)
    d.line([(15,40),(32,36),(37,35)], fill='#748392')
    d.polygon([(11,34),(35,28),(36,11),(38,22),(39,32),
               (37,34),(15,39),(13,39)], fill='#b89576')
    d.polygon([(12,34),(37,28),(38,31),(37,33),(15,38),(13,38)], fill=paper)
    d.line([(14,37),(26,34),(37,31)], fill='#cfb48e')
    d.line([(15,36),(23,34),(25,34)], fill='#fff1cc')
    d.line([(34,12),(36,23),(38,30)], fill='#f3e4bd')

    # Cut cloth ribbon emerging between the signatures.
    d.polygon([(26,35),(30,34),(31,42),(28,40),(25,43)], fill='#694249')
    d.polygon([(27,35),(29,35),(30,40),(28,39),(26,41)], fill='#cc7165')
    d.line([(27,36),(27,39)], fill='#f4ab89')

    d.polygon([(6,10),(7,8),(31,3),(34,4),(39,29),(38,31),
               (13,37),(11,37),(10,35)], fill=contour)
    d.polygon([(7,10),(8,9),(31,4),(33,5),(38,29),
               (37,30),(13,36),(11,35)], fill=indigo)
    d.line([(8,9),(29,5),(32,5)], fill='#83969e')
    d.line([(33,6),(36,21),(37,26)], fill=cloth_light)
    d.line([(13,35),(27,32),(36,30)], fill=cloth_shadow)
    # Faint crossgrain catches the light along the folded upper cloth edge.
    d.line([(14,10),(23,8)], fill=cloth_light)
    d.line([(25,7),(29,6)], fill=cloth_light)
    d.line([(31,28),(34,27)], fill='#4c6176')

    # Four anchoring holes. Pale flax wraps the spine and runs down the seam.
    d.polygon([(7,10),(11,9),(16,34),(12,35),(11,33)], fill='#38475e')
    seam=[(12,11),(13,18),(15,25),(16,32)]
    d.line(seam, fill='#ad967e')
    for x,y in seam:
        d.line([(x-3,y+1),(x,y)], fill='#e9cba0')
        d.point((x+1,y),fill='#273746')
    d.line([(10,9),(12,11)], fill='#e9cba0')
    d.line([(16,32),(16,34)], fill='#d6b991')

    # The rachis bends gradually to the right. Slender paired pinnae sweep up
    # on one side and out on the other, shortening toward the unfurling tip.
    brass = '#d9aa71'
    gold = '#e8c386'
    glint = '#f4d99d'
    d.line([(20,30),(20,27),(21,24),(22,21),(24,17),
            (26,14),(29,11),(32,9)], fill=brass)
    d.polygon([(20,26),(18,26),(16,23),(16,21),(17,22),(19,25)], fill=gold)
    d.polygon([(21,25),(25,24),(29,22),(28,24),(25,25),(22,26)], fill=gold)
    d.line([(25,24),(28,23)], fill=glint)
    d.polygon([(22,23),(20,22),(17,19),(16,17),(18,18),(19,20)], fill=gold)
    d.polygon([(22,22),(24,21),(27,21),(30,19),(29,21),(27,22)], fill=brass)
    d.polygon([(23,20),(21,19),(19,16),(19,14),(20,15)], fill=gold)
    d.polygon([(24,19),(26,18),(29,18),(32,16),(31,18),(28,19)], fill=gold)
    d.polygon([(25,16),(23,15),(22,12),(22,11),(24,13)], fill=gold)
    d.polygon([(25,16),(28,15),(30,15),(32,13),(32,15),(29,16)], fill=brass)
    d.line([(27,14),(26,12),(26,10)], fill=gold)
    d.line([(28,13),(30,12),(32,12),(33,11)], fill=gold)
    d.line([(29,12),(29,10),(30,8)], fill=glint)


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
    makers=(shop,inventory,journal,library,postcard)
    sheet=Image.new('RGBA',(48*len(makers),48))
    for i,maker in enumerate(makers):
        sheet.paste(pixel_tile(maker,TILES[maker.__name__]),(48*i,0))
    return sheet

if __name__ == '__main__':
    output=Path(__file__).resolve().parents[1] / 'public' / 'art' / 'iseed-launcher.png'
    render().save(output,optimize=True)
