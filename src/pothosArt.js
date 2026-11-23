// Each blade faces left. Its petiole meets the notch at (ax, ay).
// The gold pigments form patches across the midrib, with a darker folded edge.
const broad = {
  ax: 9, ay: 3,
  rows: [
    ".....###....##",
    "...##=--#..#--#",
    "..#=:==--##---+#",
    ".#-:::=---+--=+#",
    "#---==---=+-==+#",
    "#-==----=-++=+#",
    "#-=---==-++++#",
    ".#--===-++=+#",
    ".#=::-+++=+#",
    "..#:=+++=##",
    "..#--++##",
    "..#++##",
    ".#+##",
    ".##",
  ],
};
const marbled = {
  ax: 8, ay: 3,
  rows: [
    "....###....##",
    "..##---#..#=-#",
    ".#--==--##::=+#",
    "#--=::=--=::=+#",
    "#-=::=--===-+#",
    "#-===--=+--+#",
    ".#----=+--+#",
    ".#--==++-+#",
    "..#==++=+#",
    "..#-++=##",
    "..#++##",
    ".####",
    ".#",
  ],
};
const juvenile = {
  ax: 6, ay: 2,
  rows: [
    "...###..##",
    ".##==-##--#",
    "#-=:=-=--+#",
    "#--=--=-+#",
    "#---==++#",
    ".#==-++#",
    ".#--+##",
    ".#++#",
    ".###",
    ".#",
  ],
};
const tip = {
  ax: 4, ay: 1,
  rows: [".###..#", "#-=-##=#", "#-=---+#", ".#---+#", ".#-=+#", "..#+#", "..##"],
};
const spear = {
  ax: 2, ay: 7,
  rows: [".....##", "....#:#", "...#:=#", "..#:=#", ".#-=+#", ".#==#", ".#+#", "..#"],
};

const leaf = (shape, x, y, mirror = false) => ({shape, x, y, mirror});
const crown = [36, 26];

// Shared junctions keep successive growth stages recognizable. Each runner is
// traced once, then its leaves attach at the tips of short lateral petioles.
const left = [34, 17], top = [37, 12], bend = [46, 15], lower = [51, 23];
const rear = [crown, left, [32, 11], [29, 8]];
const upright = [left, top, [39, 8], [40, 5]];
const arch = [crown, [39, 20], [42, 16], bend, [49, 18], lower];
export const pothosStages = {
  sprout: {
    stems: [[crown, [35, 21], [32, 18]], [[35, 21], [37, 17]]],
    leaves: [leaf(tip, 32, 18), leaf(spear, 37, 17)],
  },
  young: {
    stems: [rear, [left, [38, 13], [42, 12]], [[38, 13], [38, 10]]],
    leaves: [leaf(juvenile, 29, 8), leaf(spear, 38, 10), leaf(juvenile, 42, 12, true)],
  },
  split: {
    stems: [rear, [left, top, [39, 8]], arch, [bend, [48, 12]], [lower, [54, 24]], [lower, [52, 29]]],
    leaves: [leaf(broad, 29, 8), leaf(spear, 39, 8), leaf(marbled, 48, 12, true),
      leaf(juvenile, 54, 24, true), leaf(tip, 52, 29)],
  },
  grown: {
    stems: [[crown, left, [30, 12], [26, 9]], upright, arch, [bend, [49, 13]],
      [lower, [54, 21]], [lower, [53, 28], [57, 31], [60, 31], [62, 30]],
      [left, [29, 17], [25, 19], [23, 22]]],
    leaves: [leaf(marbled, 40, 5, true), leaf(broad, 26, 9), leaf(juvenile, 23, 22),
      leaf(juvenile, 49, 13, true), leaf(broad, 54, 21, true), leaf(tip, 62, 30)],
  },
};
