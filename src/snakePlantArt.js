// Laurentii leaves share the soil line on the 72 × 40 LCD. The broken silver
// chevrons wrap over a shaded fold, inside a continuous yellow margin.
const sword = [
  "...#....", "..#:#...", "..#:+#..", ".#:--#..", ".#:=-+#.",
  ".#:=++#.", "#:--++#.", "#:==-=:#", "#:-===:#", "#:--++:#",
  "#:-=++:#", ".#:==+:#", ".#:-==:#", ".#:--+:#", ".#:==+:#",
  ".#:-==:#", ".#:--+:#", ".#:-++:#", "#:==++:#", "#:--==:#",
  "#:--++:#", ".#:-++:#", ".#:-++#.", "..#-+#..", "..####..",
];
const pup = [
  "..#...", "..:#..", ".#:+#.", ".#:-#.", ".#:=+#", "#:-=+#",
  "#:=++#", "#:-=+#", ".#:-+#", ".#:-+#", ".#:+#.", "..##..",
];
const stages = {
  // Furthest blades first, so the fresh central pup sits in front at the crown.
  sprout: [[pup, 36, 9, 0]],
  young: [[sword, 35, 16, -4], [pup, 38, 11, 4]],
  split: [[sword, 33, 18, -7], [sword, 36, 22, 0], [sword, 40, 15, 6], [pup, 35, 8, -1]],
  grown: [[sword, 32, 19, -9], [sword, 35, 25, -3], [sword, 39, 23, 5],
    [sword, 41, 16, 11], [pup, 36, 13, 0]],
};

export const snakeSeedRows = [
  "...####..", ".##::--#.", "#:--=-++#", "#:-=--++#", ".#---++#.", "..#####..",
];

// Resample each blade from base to tip. The crown stays fixed in both idle
// poses and the two thirst poses, so the blades never detach from the pot.
export function snakePlantRows(stage, pose) {
  const pixels = Array.from({length: 26}, () => Array(72).fill("."));
  const wilt = {dry: .22, critical: .44, dead: .72}[pose] ?? 0;
  for (const [shape, x, length, lean] of stages[stage]) {
    const height = Math.round(length * (1 - wilt));
    let previousLeft, previousRight;
    for (let y = 0; y < height; y++) {
      const t = 1 - y / (height - 1);
      const row = shape[Math.round((1 - t) * (shape.length - 1))];
      const sway = pose === "left" ? -1 : pose === "right" ? 1 : 0;
      const outward = lean < 0 ? -1 : 1;
      const bend = t * t * (lean + outward * wilt * length * .8 + sway);
      const start = x + Math.round(bend) - Math.floor(row.length / 2);
      const line = pixels[26 - height + y];
      const left = start + row.search(/[^.]/);
      const right = start + row.replace(/\.+$/, "").length - 1;
      // A folded tip can cross multiple columns in one scanline. Join both
      // rows before inking the surface so even the flattened blade is whole.
      const above = pixels[25 - height + y];
      if (y > 0 && left > previousRight) above.fill("#", previousRight + 1, left + 1);
      if (y > 0 && right < previousLeft) above.fill("#", right, previousLeft);
      for (let col = left; col <= right; col++) line[col] = row[col - start];
      previousLeft = left;
      previousRight = right;
    }
  }
  return pixels.map(row => row.join(""));
}
