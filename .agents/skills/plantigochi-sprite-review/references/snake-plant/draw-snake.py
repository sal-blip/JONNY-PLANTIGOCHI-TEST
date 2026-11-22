"""Draw the five Laurentii foliage blades into a transparent 65x67 pot-anchored master."""
import argparse
from pathlib import Path
from PIL import Image

P = {
    'edge':'#2c463f', 'deep':'#315347', 'shadow':'#396752', 'back':'#547960',
    'green':'#4b826a', 'face':'#64927c', 'sage':'#83ae97', 'mint':'#adc5a4',
    'glint':'#c3d2a6','stripe':'#47755e','olive':'#8c8e57','amber':'#b0a269',
    'straw':'#d0be80','cream':'#dfcd93',
}
im = Image.new('RGBA',(65,67))
def blade(guide,bands,style,edge_marks=()):
    # Every guide row sets the two edges and the ridge of the folded blade.
    # Bands follow the fold and stop before either variegated margin.
    colors, left_gold, right_gold = style
    shape={}
    for a,b in zip(guide,guide[1:]):
        for y in range(a[0],b[0]+1):
            t=(y-a[0])/(b[0]-a[0])
            shape[y]=[round(av+(bv-av)*t) for av,bv in zip(a[1:],b[1:])]
    top,base=guide[0][0],guide[-1][0]
    def put(x,y,c):im.putpixel((x,y),(*bytes.fromhex(P[c][1:]),255))
    for y,(left,right,fold) in shape.items():
        for x in range(left,right+1):
            if right-left<=1:
                c=colors[0] if y-top<4 else colors[3]
                if left_gold and x==left and y>top:c=left_gold
            elif x==left:c=left_gold or colors[0]
            elif x==right:c=right_gold or colors[0]
            elif x<fold:c=colors[1]
            elif x==fold:c=colors[2]
            else:c=colors[3]
            # A little reflected light along the margin broadens only at the turn.
            if left_gold and right-left>=8 and x==left+1 and top+7<=y<=top+18:c='straw'
            if x==left and left_gold=='straw' and (y>base-7 or y-top<3):c='amber'
            if x==right and right_gold=='amber' and y>base-8:c='olive'
            put(x,y,c)
    for y0,profile,light,detail in bands:
        # Four hand-placed points set the irregular light/dark ladder across each leaf face.
        l,r,fold=shape[y0]
        if r-l<3:continue
        for x in range(l+1,r):
            t=(x-l-1)/max(1,r-l-2)
            u=t*3;i=min(2,int(u));sy=y0+round(profile[i]+(profile[i+1]-profile[i])*(u-i))
            if sy not in shape:continue
            left,right,seam=shape[sy]
            if not left<x<right:continue
            put(x,sy,light if x<=seam else detail)
            # Interrupted thick patches keep neighboring bands from becoming identical pinstripes.
            if abs(profile[0]-profile[2])>=2 and x<seam and (x-l)%7 in (2,3):
                ny=sy+1
                if ny in shape and shape[ny][0]<x<shape[ny][1]:put(x,ny,light)

    # Small groups of bright margin cells catch the window without drawing a uniform halo.
    for side,first,last,ink,width in edge_marks:
        for y in range(first,last+1):
            left,right,_=shape[y]
            for n in range(min(width,right-left)):
                put(left+n if side=='left' else right-n,y,ink)

# Rear off-center sword; a quiet olive margin lets the central plant read first.
blade([(11,41,41,41),(14,38,41,40),(18,37,42,39),(22,36,42,38),(25,35,41,37),
       (31,33,38,35),(38,30,35,32),(44,30,33,32)],
      [(18,[0,-1,0,1],'face','back'),(23,[1,0,-1,0],'sage','green'),
       (28,[0,1,0,-1],'face','back'),(33,[0,0,-1,-1],'sage','back')],
      (('deep','green','back','shadow'),None,'olive'))

# Curved right blade. Its shoulder bows outward then returns to a narrow tip.
blade([(17,54,54,54),(20,51,53,52),(24,47,53,50),(28,43,52,47),
       (32,41,50,45),(36,39,47,42),(40,36,42,39),(44,33,36,35)],
      [(23,[0,0,1,0],'sage','back'),(27,[1,0,-1,0],'mint','face'),
       (31,[0,1,1,-1],'sage','face'),(35,[1,0,-1,0],'mint','green'),
       (39,[0,-1,0,0],'sage','back')],
      (('edge','face','green','shadow'),'amber','olive'),
      [('left',20,24,'straw',1),('left',25,28,'cream',1),('left',29,32,'straw',1),
       ('right',24,28,'deep',1),('right',30,34,'edge',1)])

# Tall centerpiece, kinked slightly at the tip, with a fold that broadens down the middle.
blade([(4,25,25,25),(7,24,26,25),(10,23,28,26),(14,22,31,28),
       (18,22,32,28),(23,23,34,30),(27,24,35,31),(31,25,35,31),
       (35,27,36,31),(40,29,35,32),(44,31,34,32)],
      [(11,[0,1,0,0],'sage','green'),(15,[1,0,-1,0],'mint','face'),
       (19,[0,1,2,0],'sage','green'),(23,[1,0,-1,0],'mint','face'),
       (27,[0,1,2,0],'mint','green'),(31,[0,-1,0,0],'sage','face'),
       (35,[1,0,-1,0],'mint','back'),(39,[0,1,0,0],'sage','green')],
      (('edge','face','green','shadow'),'straw','amber'))

# The left leaf fans out, its folded back creating a broader, colder shadow.
blade([(18,9,9,9),(21,10,13,12),(24,11,17,15),(27,12,20,17),
       (31,14,23,19),(34,17,25,21),(37,20,27,23),(41,25,30,27),(44,29,32,30)],
      [(24,[0,1,2,1],'sage','back'),(28,[0,-1,0,-1],'mint','face'),
       (31,[0,1,2,1],'sage','face'),(35,[0,-1,-1,0],'mint','back'),
       (39,[0,1,0,1],'sage','back')],
      (('edge','green','face','shadow'),'amber','olive'),
      [('left',20,23,'straw',1),('left',24,27,'cream',1),('left',28,33,'straw',1),
       ('left',26,28,'straw',2),('right',23,27,'deep',1),('right',30,34,'edge',1)])

# Short front spear: folded, less variegated new growth from the crown.
blade([(30,37,37,37),(32,35,38,36),(35,33,39,35),(38,31,38,34),
       (41,30,36,33),(44,31,34,32),(45,32,33,32)],
      [(35,[0,0,-1,0],'sage','face'),(39,[1,1,0,0],'mint','green')],
      (('deep','sage','face','green'),'straw',None))
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Destination PNG file')
    im.save(parser.parse_args().output)
