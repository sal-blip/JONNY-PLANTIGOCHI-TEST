// Hoya serpens has small, nearly round leaves in opposing pairs. The pale
// cells form irregular splash markings, while the lower edge rolls into shade.
const coin = {ax: 7, ay: 1, rows: [
  "..#####", ".#-=--##", "#-::--=+#", "#-:=--=+#", "#----=-+#",
  "#-=-=:++#", ".#--=++#", "..#+++##", "...###",
]};
const silver = {ax: 6, ay: 1, rows: [
  "..####", ".#:=--##", "#--:--:+#", "#-=-=::+#", "#-=--=++#",
  ".#::-++#", ".#-=++#", "..####",
]};
const juvenile = {ax: 5, ay: 1, rows: [
  ".####", "#-=--##", "#-:=-+#", "#---++#", ".#-++#", "..###",
]};
const bud = {ax: 3, ay: 1, rows: [".###", "#-==#", "#--+#", ".###"]};
const leaf = (shape, x, y, mirror=false) => ({shape, x, y, mirror});

// Each pair meets at a single node. Short petioles let the blades spread
// past one another and leave space to read the fine stem on the LCD.
function pair(x, y, left, right, rise = 1) {
  return {
    stems: [[[x-2,y+1],[x,y],[x+2,y-rise]]],
    leaves: [leaf(left,x-2,y+1),leaf(right,x+2,y-rise,true)],
  };
}
function runner(stems, pairs) {
  return {stems: [...stems, ...pairs.flatMap(p=>p.stems)], leaves:pairs.flatMap(p=>p.leaves)};
}
const root = [36,26];
export const hoyaStages = {
  sprout: runner([[root,[36,21],[37,18]]], [pair(37,18,juvenile,bud)]),
  young: runner([[root,[36,20],[33,15],[33,10],[35,7]]],
    [pair(36,20,coin,juvenile,2),pair(33,10,juvenile,silver,2)]),
  split: runner([[root,[36,19],[32,12],[27,9],[22,10],[19,15],[17,21],[18,24]],
    [[36,19],[41,14],[45,12],[48,13]]],
    [pair(22,10,silver,juvenile,2),pair(17,21,juvenile,bud),pair(45,12,juvenile,coin,2)]),
  grown: runner([[root,[35,19],[32,13],[27,9],[22,8],[18,10],[15,16],[13,22],[14,28],[16,33],[18,34]],
    [[35,19],[39,14],[44,9],[49,7],[54,9],[57,15],[57,20],[55,23]],
    [[39,14],[39,8],[38,4]]],
    [pair(22,8,coin,juvenile,2),pair(15,16,silver,bud),pair(14,28,juvenile,bud),
      pair(49,7,juvenile,coin,2),pair(57,20,juvenile,silver,2),pair(38,4,bud,bud),pair(35,19,silver,juvenile,3)]),
};
export const hoyaSeedRows = [
  "..........:.:", ".........=::", "......###:=:", "....##-:+#",
  "..##:--+#", ".#---++#", "..####",
];
