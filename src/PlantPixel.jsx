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

const dryGround = bitmap([
  "......:..:::::.....:+::......:........:::::",
  "...::++##++#+++.++####:..:++###++:..+++##+::",
  ".:++###:--:--++.:#++--:#++:#---:+#..#::--:+",
  "++:--::##-::--+..#+--:++:.##--::++..#+:-:##",
  "..:++:..+#++:::..#::+:.:++:#+++##..:++#++.:",
  "....:....::..:.++###::....:...::...::.....",
]);
const puddle = bitmap([
  ".....:::+::...:..............::.....",
  "...:++--..::+++::....:++:..:+--++:..",
  ".++:--...--:----:++++:::----......:+",
  "...::::++::::::-----:::::++++++:::..",
  "..............:++++++++::...........",
]);
const exposedRoots = bitmap([
  "..##....###..#......##",
  ".#+.....###...##.....+#",
  ".##...##+#...###...++#",
  "#++.....##....#+#..#+",
  "..#......+#....#..:+",
  "........##........#",
]);
const rotSpots = bitmap([".++...#", "+##+..+", ".+#..+#", "....+#.", "....+.."]);
const stressedFace = bitmap([".##...##.", "##.....##", "....##...", "...#..#.."]);
const wiltFace = bitmap(["##....##", "..#..#..", "........", "...##..."]);
const drenchedFace = bitmap(["##....##", ".#....#.", "........", "..#..#..", "...##..."]);
const deadFace = bitmap(["#.#...#.#", ".#.....#.", "#.#...#.#", ".........", "....#...."]);
const bentShoot = bitmap([
  "....######...",
  "..##::---:##.",
  ".#:----:#:-:#",
  "#----:#####:#",
  "#--###.##..#+",
  "###....+#..+#",
  ".......+#...#",
  ".......##....",
]);
const shrunkSeed = bitmap([
  "............####",
  "........####--:#",
  ".....###+---::-#",
  "...##:--:-----:#",
  "..#:----------:+#",
  ".#:------------+#",
  "#:------------:+#",
  "#:-----------::+#",
  ".#:----------++#",
  "..##++:---:++##",
  "....#########",
]);
const hangingLeaf = bitmap([
  "..######......",
  ".#::-::-###...",
  "#:---:::---##.",
  "#:----:::---:#",
  ".#:-:--++---:+#",
  "..#----:+:---+#",
  "...#----#---:+#",
  "...#:------:++#",
  "....#:-----:+#",
  ".....#:-:-:+#",
  "......##:-:+#",
  "........#::#",
  ".........#+#",
  "..........##",
]);
const fallenLeaf = bitmap([
  "........###...",
  "....####--:##.",
  "..##::::--:+##",
  ".#+..:-:--+#..",
  "#:--:.:-:++#..",
  ".##:-:++##....",
  "...#####......",
]);
const conditionLabels = {
  dry: "is dry, with cracked soil",
  critical: "is critically wilted and slumping",
  soggy: "is soggy and dripping with water",
  rootRot: "has root rot, dark patches, and exposed damaged roots",
  dead: "has died and is still",
};
const plantNames = { seed: "Monstera seed", sprout: "Monstera sprout", young: "Young Monstera", grown: "Grown Monstera" };

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

function StressedPlant({ stage, condition }) {
  const potted = stage === "young" || stage === "grown";
  const droops = condition === "critical" || condition === "rootRot";
  const face = droops ? wiltFace : condition === "soggy" ? drenchedFace : stressedFace;
  if (stage === "seed") {
    return <>
      <Pixels image={droops ? shrunkSeed : seed} x={droops ? 27 : 25} y={droops ? 16 : 9} />
      <Pixels image={face} x={30} y={droops ? 21 : 19} />
      {condition === "rootRot" && <Pixels image={rotSpots} x={37} y={17} />}
    </>;
  }
  if (!potted) {
    return <>
      <Pixels image={droops ? bentShoot : shoot} x={droops ? 30 : 31} y={droops ? 8 : 4} />
      <Pixels image={sproutBall} x={28} y={14} />
      <Pixels image={face} x={31} y={20} />
      {condition === "rootRot" && <Pixels image={rotSpots} x={38} y={14} />}
    </>;
  }
  const grown = stage === "grown";
  if (droops) {
    return <>
      <path d="M34 25V16h2v-4h2V9h3V8h5v2h-5v1h-2v3h-2v3h-1v8z M35 19h-3v-2h-4v-1h-3v-2h5v1h3v2h2z" />
      {grown && <Pixels image={hangingLeaf} mirror x={30} y={13} />}
      <Pixels image={hangingLeaf} x={40} y={9} />
      <Pixels image={face} x={43} y={13} />
      {condition === "rootRot" && <Pixels image={rotSpots} x={46} y={16} />}
    </>;
  }
  return <>
    <path d="M35 14h2v12h-2z M36 22h-2v-2h-3v-2h-2v-2h-2v-2h2v1h2v2h2v2h3z" />
    <Pixels image={sideLeaf[0]} x={20} y={8} />
    {grown && <Pixels image={sideLeaf[0]} mirror x={54} y={5} />}
    <Pixels image={(grown ? splitLeaf : uncutLeaf)[0]} x={grown ? 24 : 26} y={grown ? 2 : 5} />
    <Pixels image={face} x={32} y={grown ? 12 : 13} />
  </>;
}

function StressedGround({ potted, condition }) {
  if (condition === "soggy") {
    return <>
      <Pixels image={puddle} x={17} y={27} />
      {potted && <Pixels image={planter} x={26} y={21} />}
      <g className="plant-pixel-drips">
        <Pixels image={drop} x={46} y={19} />
        <path d="M23 24h1v2h-1z M22 26h3v2h-3z" />
      </g>
    </>;
  }
  if (condition === "rootRot") {
    return <>
      {potted && <Pixels image={planter} x={26} y={21} />}
      <Pixels image={exposedRoots} x={25} y={26} />
    </>;
  }
  return <>
    <Pixels image={dryGround} x={14} y={26} />
    {potted && <>
      <Pixels image={planter} x={26} y={24} />
      <path d="M40 25h2v1h-2z M38 26h2v1h-2z M37 27h2v2h2v1h-3v-2h-1z" />
    </>}
  </>;
}

function DeadPlant({ stage }) {
  const potted = stage === "young" || stage === "grown";
  if (stage === "seed") {
    return <>
      <Pixels image={dryGround} x={14} y={26} />
      <Pixels image={shrunkSeed} x={27} y={17} />
      <Pixels image={deadFace} x={30} y={20} />
      <path d="M40 17h1v2h-2v2h-1v-3h2z" />
    </>;
  }
  return <>
    <path d="M35 26V15h1v-3h3v-2h6v2h2v4h-2v-3h-2v-1h-3v2h-2v3h-1v9z M35 21h-3v-2h-2v-2h2v1h2v1h2z" />
    {stage === "grown" && <path d="M38 14v-6h1V6h2V4h3v2h-2v2h-1v6z" />}
    <Pixels image={fallenLeaf} x={potted ? 47 : 44} y={24} />
    {potted ? <Pixels image={planter} x={26} y={24} /> : <Pixels image={dryGround} x={14} y={26} />}
  </>;
}

function ConditionArt({ stage, condition, reaction }) {
  if (condition === "dead") return <DeadPlant stage={stage} />;
  return <>
    <StressedPlant stage={stage} condition={condition} />
    <StressedGround condition={condition} potted={stage === "young" || stage === "grown"} />
    <Reaction kind={reaction} asleep={false} />
  </>;
}

export default function PlantPixel({ stage = "seed", reaction = null, condition = "healthy" }) {
  const description = conditionLabels[condition];
  const label = description ? `${plantNames[stage] ?? plantNames.seed} ${description}` : (stageLabels[stage] ?? stageLabels.seed);
  const happy = reaction === "talk" || reaction === "food";
  const leafy = stage === "young" || stage === "grown";
  return (
    <svg className="plant-pixel" viewBox="0 0 72 32" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label={label} shapeRendering="crispEdges">
      <g fill="var(--pixel-ink, #35452d)">
        {description ? <ConditionArt stage={stage} condition={condition} reaction={reaction} /> : <>
        {!leafy && <Pixels image={earth} x={15} y={24} />}
        {stage === "seed" && <SleepingSeed />}
        {stage === "sprout" && <Sprout happy={happy} />}
        {leafy && <LeafyPlant grown={stage === "grown"} happy={happy} />}
        <Reaction kind={reaction} asleep={stage === "seed"} />
        </>}
      </g>
    </svg>
  );
}
