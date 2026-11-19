import React from "react";
import "./PlantPixel.css";

// A dot lets the LCD show through. The other pixels are four densities of one ink.
const densities = { "#": 1, "+": 0.67, ":": 0.34, "-": 0.13 };

function bitmap(rows, rowOffsets = []) {
  const paths = { "#": "", "+": "", ":": "", "-": "" };
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/([#+:\-])\1*/g)) {
      const length = match[0].length;
      paths[match[1]] += `M${match.index + (rowOffsets[y] ?? 0)} ${y}h${length}v1h-${length}z`;
    }
  });
  return Object.entries(paths).filter(([, path]) => path);
}

function Pixels({ image, x, y, mirror = false }) {
  return (
    <g transform={`translate(${x} ${y})${mirror ? " scale(-1 1)" : ""}`}>
      {image.map(([shade, d]) => <path key={shade} d={d} opacity={densities[shade]} />)}
    </g>
  );
}

const seedRows = [
  "..................###",
  ".................#::#",
  ".............####::+#",
  ".........####::---:+#",
  "......###:::------:#",
  "....##::---..----:+#",
  "...#::---..-------:#",
  "..#::-------------:+#",
  ".#:----------------:#",
  ".#:----------------:#",
  "#:-----------------:+#",
  "#:-----------------:+#",
  "#::----------------:+#",
  ".#+::-------------:+#",
  "..#++::-------:-:++#",
  "...##++::::::-:++##",
  ".....###+++++++##",
  "........#######",
];
const seed = bitmap(seedRows);
// Duplicate a row at the belly. Drawing a taller silhouette one pixel higher
// lifts the shoulders and face while leaving the grounded bottom row in place.
const breathingSeed = bitmap([...seedRows.slice(0, 11), seedRows[10], ...seedRows.slice(11)]);

const sproutBall = bitmap([
  "......####",
  "....##-:--##",
  "..##--:-----##",
  ".#:--:--------#",
  ".#:-----------:#",
  "#:-------------#",
  "#--------------:#",
  "#--------------:#",
  "#--------------:#",
  ".#-------------+#",
  ".#::----------:+#",
  "..#+::::----:++#",
  "...##++++:+++##",
  ".....########",
]);

const shoot = bitmap([
  ".........####",
  "........#::+#",
  ".####..#:-+#",
  "#:--:##:-+#",
  ".#:--:#+##",
  "..##::+#",
  "....##+#",
  "......+#",
  "......##",
]);

const openShoot = bitmap([
  "...........###",
  "..........#::#",
  ".........#:-#",
  "###.....#:-#",
  "#::##..#:-#",
  ".#--:##:##",
  "..##::+#",
  "....##+#",
  "......+#",
  "......##",
]);

// The upper rows of a blade travel farthest as it bends at its stalk.
function leafFrames(rows) {
  const offsets = rows.map((_, y) => y < rows.length / 3 ? 2 : y < rows.length * .72 ? 1 : 0);
  return [bitmap(rows), bitmap(rows, offsets), bitmap(rows, offsets.map(x => -x))];
}

const uncutLeaf = leafFrames([
  "....####.....####",
  "..##::--##.##:::-##",
  ".#::------#-----::-#",
  "#:---------:-------:#",
  "#:---------:-------:#",
  "#------:-:-:---:---:+#",
  "#:------:-::--:----:+#",
  ".#--------::-------:+#",
  ".#:---------------:+#",
  "..#---------------:+#",
  "...#-------------:+#",
  "....#-----------:+#",
  ".....#+-:------:+#",
  "......##+:----:+#",
  "........##:--:+#",
  "..........##:+#",
  "............##",
]);

const splitLeaf = leafFrames([
  ".....####.......####",
  "...##::--##...##--::##",
  "..#::------#.#------::#",
  ".#:---..----#------..-:#",
  "#:---..-----:----:..--:+#",
  ".##---:---:-:---:-----:+#",
  "...##-----:-:---:---:++#",
  "..#::-:----::------++##",
  ".#:---..---::-----+##",
  ".#:---..---::------:###",
  "..##-----------------:+#",
  "....##---------------:+#",
  "...#:---------------:+#",
  "....#+------------:++#",
  ".....##:-------:-++##",
  ".......##:----:++##",
  ".........##:-:+##",
  "...........#:++#",
  "............##",
]);

const sideLeaf = leafFrames([
  "..####",
  ".#:---##",
  "#:--:---#",
  "#:-:----:#",
  ".##-:-:--#",
  "....#::-:+#",
  "..##:--:+#",
  "....#::+#",
  ".....###",
]);

const closedFace = bitmap([
  "#...#....#...#",
  ".###......###",
  ".......#",
  "......#.#",
]);
const breathingFace = bitmap([
  "#...#....#...#",
  ".###......###",
  "......##",
  "......##",
]);
const blinkFace = bitmap([
  "..........",
  "##......##",
  "....#..#",
  ".....##",
]);
const impishFace = bitmap([
  "##......##",
  "##......##",
  "....#..#",
  ".....##",
]);
const delightedFace = bitmap([
  ".#......#",
  "#.#....#.#",
  "....##",
  "....##",
]);

const earth = bitmap([
  ".............:...................:.........",
  "........::..#::.......::........:+..:......",
  ".....:++::++:#++:.++::::.::++++:+#++:......",
  "..:++###:#####+++##++++##+#####++:###++:...",
  "....:++::++++::++#####++#+++:::++:++:......",
  ".......:....:++::..++::::::..:.....:.......",
  ".................:......:..................",
]);

const planter = bitmap([
  "...:++##++++##++:...",
  ".##++:::+#++++:++##.",
  "#+::::----:-::::+++#",
  ".##################.",
  "..#+:---------::+#..",
  "...#+:-----:-::+#...",
  "...#+::---:--:++#...",
  "....############....",
]);

const zSmall = bitmap(["###", "..#", ".#.", "###"]);
const zLarge = bitmap(["#####", "...#.", "..#..", ".#...", "#####"]);
const heart = bitmap([".##.##.", "#::#::#", "#:::::#", ".#:::#.", "..#:#..", "...#..."]);
const drop = bitmap(["..#..", ".#:#.", ".#:#.", "#:-:#", "#:-:#", ".###."]);
const gleam = bitmap(["..#..", "..#..", "##:##", "..#..", "..#.."]);
const sun = bitmap([
  "....#....",
  ".#.....#.",
  "...###...",
  "..#:::#..",
  "#.#:::#.#",
  "..#:::#..",
  "...###...",
  ".#.....#.",
  "....#....",
]);

const stageLabels = {
  seed: "A sleepy Monstera seed tucked into the soil",
  sprout: "A smiling Monstera sprout with two little leaves",
  young: "A cheeky young Monstera with a heart-shaped leaf",
  grown: "A happy grown Monstera with split leaves",
};

function Reaction({ kind, asleep }) {
  if (!kind && asleep) {
    return <g className="plant-pixel-snooze"><Pixels image={zSmall} x={48} y={7} /><Pixels image={zLarge} x={53} y={1} /></g>;
  }
  const image = { sun, water: drop, talk: heart, food: gleam }[kind];
  return image && <g className="plant-pixel-reaction"><Pixels image={image} x={53} y={3} /></g>;
}

function AwakeFace({ x, y, happy }) {
  if (happy) return <Pixels image={delightedFace} x={x} y={y} />;
  return (
    <g className="plant-pixel-blink">
      <g className="plant-pixel-rest"><Pixels image={impishFace} x={x} y={y} /></g>
      <g className="plant-pixel-active"><Pixels image={blinkFace} x={x} y={y} /></g>
    </g>
  );
}

function SleepingSeed() {
  return (
    <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest">
        <Pixels image={seed} x={25} y={9} />
        <Pixels image={closedFace} x={28} y={19} />
      </g>
      <g className="plant-pixel-active">
        <Pixels image={breathingSeed} x={25} y={8} />
        <Pixels image={breathingFace} x={28} y={18} />
      </g>
    </g>
  );
}

function Sprout({ happy }) {
  return (
    <>
      <g className="plant-pixel-unfurl">
        <g className="plant-pixel-rest"><Pixels image={shoot} x={31} y={4} /></g>
        <g className="plant-pixel-active"><Pixels image={openShoot} x={31} y={3} /></g>
      </g>
      <Pixels image={sproutBall} x={28} y={13} />
      <AwakeFace x={31} y={19} happy={happy} />
    </>
  );
}

function LeafyPlant({ grown, happy }) {
  const blade = grown ? splitLeaf : uncutLeaf;
  const faceX = [32, 33, 31];
  return (
    <g className={grown ? "plant-pixel-grown" : "plant-pixel-young"}>
      <path d="M35 14h2v8h1v5h-3z M36 22h-2v-2h-3v-2h-2v-2h-2v-2h2v1h2v2h2v2h3z" />
      {grown && <path d="M36 20h2v-2h3v-2h3v-2h3v-2h2v3h-4v3h-3v2h-4v3h-2z" />}
      <g className="plant-pixel-sway">
        {blade.map((frame, i) => (
          <g key={i} className={["plant-pixel-rest", "plant-pixel-active", "plant-pixel-return"][i]}>
            <Pixels image={sideLeaf[i]} x={20} y={8} />
            {grown && <Pixels image={sideLeaf[i === 0 ? 0 : 3 - i]} mirror x={54} y={5} />}
            <Pixels image={frame} x={grown ? 24 : 26} y={grown ? 2 : 5} />
            <AwakeFace x={faceX[i]} y={grown ? 12 : 13} happy={happy} />
          </g>
        ))}
      </g>
      <Pixels image={planter} x={26} y={24} />
    </g>
  );
}

export default function PlantPixel({ stage = "seed", reaction = null }) {
  const happy = reaction === "talk" || reaction === "food";
  const leafy = stage === "young" || stage === "grown";
  return (
    <svg className="plant-pixel" viewBox="0 0 72 32" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label={stageLabels[stage] ?? stageLabels.seed} shapeRendering="crispEdges">
      <g fill="var(--pixel-ink, #35452d)">
        {!leafy && <Pixels image={earth} x={15} y={24} />}
        {stage === "seed" && <SleepingSeed />}
        {stage === "sprout" && <Sprout happy={happy} />}
        {leafy && <LeafyPlant grown={stage === "grown"} happy={happy} />}
        <Reaction kind={reaction} asleep={stage === "seed"} />
      </g>
    </svg>
  );
}
