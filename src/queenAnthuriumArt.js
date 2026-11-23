// Long pendent blades of Anthurium warocqueanum. Tone ":" is the pale
// midrib and "=" picks out the lateral veins across the dark velvet surface.
const velvet = {ax:6,ay:2,rows:[
  "...##...##", "..#--#.#++#", ".#-=--#++++#", ".#--=-:++=+#",
  "#----=:=+++#", "#-=---:++++#", "#--=--:++=+#", "#---=-:+=++#",
  ".#---=:=+++#", ".#----:++++#", ".#-=--:++=+#", ".#--=-:+=+#",
  "..#--=:=++#", "..#---:+++#", "..#-=-:+=+#", "..#--=:=+#",
  "...#--:++#", "...#-=:++#", "...#--:+#", "....#-:+#",
  "....#-:#", ".....#:#", ".....#+#", "......#",
]};
// The older outer blade bows outward from the petiole as it lengthens.
const swept = {ax:11, ay:2, rows:velvet.rows.map((row,y) =>
  ".".repeat(5-Math.round(5*y/(velvet.rows.length-1)))+row)};
const narrow = {ax:4,ay:1,rows:[
  "..##..##", ".#--##++#", "#-=--:++#", "#--=-:=+#", "#---=:++#",
  ".#---:++#", ".#-=-:=+#", ".#--=:++#", "..#--:+#", "..#-=:++#",
  "..#--:+#", "...#-:+#", "...#-:#", "....#+#", "....##", ".....#",
]};
const heart = {ax:4,ay:1,rows:[
  "..##..##", ".#--##++#", "#-==-:++#", "#---=:=+#", ".#---:++#",
  ".#-=-:=#", "..#-=:++#", "..#--:+#", "...#-:#", "....##",
]};
const sprig = {ax:2,ay:1,rows:[".##.#","#--#+#","#-=:++#",".#-:+#","..#:+#","...##"]};
const furled = {ax:1,ay:5,rows:["....##","...#=#","..#-+#",".#-+#",".#+#",".##"]};
const leaf = (shape,x,y,mirror=false)=>({shape,x,y,mirror});
const crown=[36,26];
export const queenStages={
  sprout:{stems:[[crown,[35,21],[32,18]],[crown,[38,18]]],
    leaves:[leaf(sprig,32,18,true),leaf(furled,38,18)]},
  young:{stems:[[crown,[33,17],[29,12],[25,12]],[crown,[38,16],[44,10]]],
    leaves:[leaf(heart,25,12),leaf(heart,44,10,true)]},
  split:{stems:[[crown,[33,16],[28,10],[23,10]],[crown,[36,15],[40,6]],
    [crown,[41,18],[46,12],[50,12]]],
    leaves:[leaf(heart,40,6),leaf(narrow,23,10),leaf(narrow,50,12,true)]},
  grown:{stems:[[crown,[33,17],[26,9],[21,5]],[crown,[35,16],[32,7],[30,4]],
    [crown,[40,15],[46,8],[53,5]],[crown,[40,20],[44,16]]],
    leaves:[leaf(narrow,30,4),leaf(swept,21,5),leaf(velvet,53,5),
      leaf(heart,44,16,true)]},
};
export const queenSeedRows=["...####", ".##:---#", "#:-=--++#", "#--=--++#", ".#---++#", "..#####"];
