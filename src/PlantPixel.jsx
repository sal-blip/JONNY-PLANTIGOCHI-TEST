import React from "react";
import "./PlantPixel.css";

// A dot lets the LCD show through. The other pixels are four densities of one ink.
const densities = { "#": 1, "+": 0.67, ":": 0.34, "-": 0.13 };

function bitmap(rows) {
  const paths = { "#": "", "+": "", ":": "", "-": "" };
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/([#+:\-])\1*/g)) {
      const length = match[0].length;
      paths[match[1]] += `M${match.index} ${y}h${length}v1h-${length}z`;
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

const seed = bitmap([
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
]);

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

const uncutLeaf = bitmap([
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

const splitLeaf = bitmap([
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

const sideLeaf = bitmap([
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

export default function PlantPixel({ stage = "seed", reaction = null }) {
  const face = reaction === "talk" || reaction === "food" ? delightedFace : impishFace;
  return (
    <svg className="plant-pixel" viewBox="0 0 72 32" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label={stageLabels[stage] ?? stageLabels.seed} shapeRendering="crispEdges">
      <g fill="var(--pixel-ink, #35452d)">
        <Pixels image={earth} x={15} y={24} />
        {stage === "seed" &&
          <g>
            <Pixels image={seed} x={25} y={9} />
            <Pixels image={closedFace} x={28} y={19} />
          </g>}
        {stage === "sprout" &&
          <g>
            <Pixels image={shoot} x={31} y={4} />
            <Pixels image={sproutBall} x={28} y={13} />
            <Pixels image={face} x={31} y={19} />
          </g>}
        {(stage === "young" || stage === "grown") &&
          <g>
            <path d="M35 14h2v8h1v5h-3z M36 22h-2v-2h-3v-2h-2v-2h-2v-2h2v1h2v2h2v2h3z" />
            <Pixels image={sideLeaf} x={20} y={8} />
            {stage === "grown" && <>
              <path d="M36 20h2v-2h3v-2h3v-2h3v-2h2v3h-4v3h-3v2h-4v3h-2z" />
              <Pixels image={sideLeaf} mirror x={54} y={5} />
            </>}
            <Pixels image={stage === "grown" ? splitLeaf : uncutLeaf} x={stage === "grown" ? 24 : 26} y={stage === "grown" ? 2 : 5} />
            <Pixels image={face} x={32} y={stage === "grown" ? 12 : 13} />
          </g>}
        <Reaction kind={reaction} asleep={stage === "seed"} />
      </g>
    </svg>
  );
}
