// Velvet blades with irregular blush sectors. The petiole meets the notch
// between the lobes. A narrow copper-backed leaf caps the growing runner.
const velvet = {ax:8, ay:3, rows:[
  "....####...###", "..##----#.#--+#", ".#--:==--#---+#", "#--:::=--=--++#",
  "#-::::=-=-==++#", "#--::=--=--++#", ".#-:=--=--++#", ".#-=--=--++#",
  "..#--=-=++#", "..#---+++##", "..#-==++#", "..#-++##", ".#++##", ".###",
]};
const blush = {ax:7, ay:3, rows:[
  "...####...###", ".##:::=#.#--+#", "#::::===#---++#", "#-:::==--=-++#",
  "#--::=-=--+++#", ".#--:==-=-++#", ".#--=-=--++#", "..#-:=-+++#",
  "..#==--++#", "...#--++#", "...#-+##", "...#+#", "...##",
]};
const juvenile = {ax:5, ay:2, rows:[
  "..###..##", ".#::=##-+#", "#-:==-=-+#", "#---=--+#", ".#-=-++#",
  ".#--++#", "..#++#", "..###", "..#",
]};
const folded = {ax:3, ay:1, rows:[".##.##", "#:=#=#", "#:==+#", ".#=+#", "..#+#", "..##"]};
const leaf = (shape,x,y,mirror=false)=>({shape,x,y,mirror});
const root = [36,26], node=[35,17], elbow=[27,11], turn=[20,18];
export const micansStages = {
  sprout:{stems:[[root,[36,21],[33,17]],[[36,21],[39,16]]],
    leaves:[leaf(juvenile,33,17),leaf(folded,39,16,true)]},
  young:{stems:[[root,node,[30,12]], [node,[39,13],[44,10]]],
    leaves:[leaf(blush,30,12),leaf(juvenile,44,10,true)]},
  split:{stems:[[root,node,elbow,[23,12],turn,[18,23],[19,25]], [elbow,[29,7]],
    [node,[40,12],[46,10]]],
    leaves:[leaf(blush,29,7),leaf(juvenile,20,18),leaf(folded,19,25,true),leaf(velvet,46,10,true)]},
  grown:{stems:[[root,node,elbow,[23,12],turn,[18,24],[16,27],[14,30]], [elbow,[27,6]],
    [turn,[22,20]], [node,[39,13],[42,9],[47,8],[53,11],[55,15]], [[42,9],[39,4]],
    [node,[37,19],[41,18]]],
    leaves:[leaf(juvenile,39,4,true),leaf(blush,27,6),leaf(velvet,47,8,true),
      leaf(velvet,20,18),leaf(folded,22,20,true),leaf(folded,14,30),leaf(juvenile,55,15,true),
      leaf(juvenile,41,18,true)]},
};
export const micansSeedRows=[".....###", "...##:-#", ".##:=-+#", "#:--=++#", "#---++#", ".#++##", "..###"];
