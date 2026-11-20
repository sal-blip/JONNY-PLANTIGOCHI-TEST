import React from "react";
import "./PlantPixel.css";

const levels = { "#": 1, "+": .7, ":": .39, "-": .16, "=": .52 };

// Sprites share one LCD ink. Empty cells are transparent, including leaf fenestrations.
function draw(rows, offsets = []) {
  const ink = { "#": "", "+": "", ":": "", "-": "", "=": "" };
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/([#+:=\-])\1*/g)) {
      const w = run[0].length;
      ink[run[1]] += `M${run.index + (offsets[y] ?? 0)} ${y}h${w}v1h-${w}z`;
    }
  });
  return Object.entries(ink).filter(([, path]) => path.length);
}

function Pixels({ image, x = 0, y = 0, mirror = false }) {
  return <g transform={`translate(${x} ${y})${mirror ? " scale(-1 1)" : ""}`}>
    {image.map(([tone, path]) => <path key={tone} d={path} opacity={levels[tone]} />)}
  </g>;
}

// The upper petiole stays attached. Motion is a different drawing on the same pixel grid.
function blade(rows) {
  const offsets = rows.map((_, row) => row < 5 ? 0 : row < 11 ? 1 : 2);
  return [draw(rows), draw(rows, offsets), draw(rows, offsets.map(x => -x))];
}

const simple = blade([
  "....####....###",
  "..##:---##.#:-#",
  ".#:-----::#--:#",
  "#:-----::---:+#",
  "#-----:---::+#",
  "#----:---::+#",
  "#---:---::+#",
  "#--:---:++#",
  ".#:--::+##",
  ".#:--++#",
  "..#++##",
  "..###",
]);
const firstSplit = blade([
  "......####.....###",
  "....##:---##..#::#",
  "..##:------:##--:#",
  ".#:------:----:-+#",
  "#:==..+=:---:::+#",
  "#-==..+=---::++#",
  ".###++:---::###",
  "....#=:--:+##",
  ".##-:---:+#",
  "#:---::++#",
  ".#--:++##",
  ".#:++##",
  "..###",
]);
const fenestrated = blade([
  ".......####......###",
  "....###:---##...#::#",
  "..##:-------##.#--:#",
  ".#:--:=..+--:-#---+#",
  "#:--:==..+::----::#",
  ".##===+==-:==..:+#",
  "...###=-:=::=..+#",
  "..##--=:--:=:++#",
  ".#:=..+---=:###",
  "#:==..+--=++#",
  ".##=++=-++###",
  "....#-:++#",
  "..#:--++#",
  ".#:--++#",
  ".#:++##",
  "..###",
]);
const wilted = blade([
  ".......####",
  ".....##++:+#",
  "....#+::#::#",
  "...#:--:#:+#",
  "..#:---:##:#",
  ".#:--::+#..#",
  "#:--::+#",
  "#---:++#",
  "#--:++#",
  ".#:++#",
  ".#++#",
  "..##",
]);
const little = blade([
  "...###..##",
  ".##---##:#",
  "#---::--:#",
  "#---:--:#",
  "#--:--+#",
  ".#:--+#",
  "..####",
]);
const shoot = draw([
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
const openShoot = draw([
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
const droopedShoot = draw([
  "....######",
  "..##::---:##",
  ".#:----:#:-:#",
  "#----:#####:#",
  "#--###.##..+#",
  "###....+#..+#",
  ".......+#...#",
  ".......##",
]);
const seedRows = [
  "...........###",
  ".........##-:#",
  "......###---:#",
  "....##::---:+#",
  "..##::-..--:+#",
  ".#:---..---:+#",
  "#:---------:+#",
  "#::--------:+#",
  ".#+:-----::+#",
  "..##+:::++##",
  "....######",
];
const seed = draw(seedRows);
const seedInhale = draw([...seedRows.slice(0, 6), seedRows[5], ...seedRows.slice(6)]);
const shrunkSeed = draw([
  "..........###",
  ".......###::#",
  "....###:---#",
  "..##:---:+:#",
  ".#-----+--:+#",
  "#:-::------+#",
  ".#+--:--:++#",
  "..#########",
]);

// Each entry specifies the leaf's own petiole, so independent stems stay readable.
const foliage = {
  young: [
    { kind: simple, x: 15, y: 8, stem: "M34 26v-7h-2v-4h-2v-4h-2" },
    { kind: little, x: 54, y: 12, mirror: true, stem: "M37 25v-6h3v-3h4" },
  ],
  split: [
    { kind: firstSplit, x: 11, y: 7, stem: "M34 26v-6h-2v-4h-2v-5h-2" },
    { kind: simple, x: 59, y: 9, mirror: true, stem: "M37 26v-7h3v-4h2v-3h3" },
    { kind: little, x: 34, y: 2, stem: "M35 24v-8h2v-5h3V6h3" },
  ],
  grown: [
    { kind: fenestrated, x: 3, y: 11, stem: "M33 25v-4h-3v-3h-4v-3h-4" },
    { kind: firstSplit, x: 17, y: 1, stem: "M34 25v-8h1V5h-1" },
    { kind: firstSplit, x: 55, y: 1, mirror: true, stem: "M37 25v-8h-1V7h2V5" },
    { kind: fenestrated, x: 69, y: 10, mirror: true, stem: "M38 25v-4h3v-3h4v-3h5" },
  ],
};

const pot = draw([
  ".....++###++##+++##++....",
  "...##:++:::+++:::++:##..",
  "..#####################.",
  ".#+::::----------:::::+#",
  ".######################.",
  "..#::----------------+#.",
  "..#::----------------+#.",
  "...#:---------------:+#.",
  "...#:---------------+#..",
  "....#::------------:+#..",
  "....#+:::---------:++#..",
  ".....##++++++++++++##...",
  "......##############....",
]);
const earthBits = draw(["..:++:...::", "++:..++:+#:", "...:...:+.."]);
const cracked = draw([
  "....####...:##++:..",
  ".:##----#..#:---:+#",
  "##--::--#..#--::++#",
  "..+##:::#.#::++##..",
  ".....++##..###.....",
]);
const puddle = draw([
  ".....:::::....::.....",
  "..:++--..::+++--++:..",
  ".++:---..---:----..:+",
  "...::::++:::::+++::..",
]);
const roots = draw([
  "..##...#+...##...#",
  ".#+...###...+##..+#",
  ".##..#.+#...#+#..#",
  "#++.....##...#..:+",
  "..#....#+.......#",
]);
const spots = draw([".++...#", "+##+..+", ".+#..+#", "....+#."]);
const deadLeaf = draw([
  "..........###",
  "......####--:##",
  "....##::---::+#",
  "...#+..:-:-:+#",
  "..#:--:--:++#",
  ".#++:--:++##",
  "#...####",
]);

const faces = {
  asleep: draw(["#..#....#..#", ".##......##", ".....##"]),
  happy: draw([".#........#.", "#.#......#.#", "....#..#", ".....##"]),
  content: draw(["##........##", "##........##", ".....#.#", "......#"]),
  quiet: draw(["............", "###......###", ".....##"]),
  lonely: draw([".##......##", ".#.......#.", ".....##", "....#..#"]),
  dry: draw([".##......##", "#..........#", ".....##", "....#..#"]),
  critical: draw(["##........##", "..#......#..", ".....##", "....#..#"]),
  soggy: draw([".#........#.", "##........##", ".....###", "....#...#"]),
  rootRot: draw(["..#......#..", "##........##", ".....##", "....#..#"]),
  hungry: draw(["##........##", "##........##", ".....##", ".....##"]),
  lowLight: draw(["###......###", ".#........#.", ".....##"]),
  dead: draw(["#.#......#.#", ".#........#.", "#.#......#.#", ".....##"]),
};
const blink = draw(["............","###......###",".....#.#","......#"]);
const zSmall = draw(["###", "..#", ".#.", "###"]);
const zLarge = draw(["#####", "...#.", "..#..", ".#...", "#####"]);
const drop = draw(["..#..", ".#:#.", ".#:#.", "#:-:#", "#:-:#", ".###."]);
const heart = draw([".##.##.", "#::#::#", "#:::::#", ".#:::#.", "..#:#..", "...#..."]);
const star = draw(["...#...", "...#...", "..#+#..", "##:-:##", "..#+#..", "...#...", "...#..."]);
const sparkle = draw(["..#..", "..#..", "##:##", "..#..", "..#.."]);
const sun = draw(["....#....",".#.....#.","...###...","..#:::#..","#.#:::#.#","..#:::#..","...###...",".#.....#.","....#...."]);
const food = draw([".....##", "...##+#", ".##:::#", "#:--:+#", ".#::##", "..##"]);
const littleSun = draw(["..#..", ".+#+.", "##.##", ".+#+.", "..#.."]);
const scoop = draw(["....##", "...#+#", ".##-+#", "#:-+#", "#++#", ".##"]);
const down = draw(["...##", "...##", "...##", ".#.##.#", "..####", "...##"]);
const sprig = draw([".....###", ".##.#:-#", "#:-##:#", ".##:##", "...##", "...##"]);
const splitHeart = draw([".##...##", "#::#.#:+#", "#:#..#::#", ".#:#..:#", "..#..:#", ".....#"]);

const stageName = { seed: "Sleeping Monstera seed", sprout: "Monstera sprout", young: "Young Monstera", split: "Monstera with its first split leaf", grown: "Grown Monstera with a broad canopy" };
const healthName = { dry: "dry with cracked soil", critical: "critically thirsty and slumping", soggy: "soggy and dripping", rootRot: "root rot with mottled leaves and damaged roots", dead: "dead and still" };
const effectName = { water: "being watered", food: "receiving food", sun: "receiving sunlight", talk: "hearing kind words", drain: "draining excess water", overwater: "an extra pour", growth: "growing", death: "a fallen leaf", replant: "newly planted", gameWin: "celebrating a game win", gameLoss: "a game loss" };

function Canopy({ stage, condition, lowLight }) {
  const drooping = condition === "critical" || condition === "rootRot";
  return <g className={'plant-canopy' + (lowLight && !drooping ? ' plant-seeking-light' : '')}>
    {foliage[stage].map(({ stem }, i) => <path key={i} d={stem} fill="none" stroke="currentColor" strokeWidth="2" />)}
    <g className={drooping ? undefined : "plant-pixel-sway"}>
      {(drooping ? [0] : [0, 1, 2]).map(frame => <g key={frame} className={["plant-pixel-rest", "plant-pixel-active", "plant-pixel-return"][frame]}>
        {foliage[stage].map(({ kind, x, y, mirror }, i) => {
          // Drooping tissue hangs from the same petiole as its healthy blade.
          const inset = kind === little ? -2 : kind === simple ? 3 : kind === firstSplit ? 6 : 8;
          const px = x + (drooping ? (mirror ? -inset : inset) : 0);
          const py = y + (drooping ? 3 : 0);
          const sideFrame = mirror && frame ? 3 - frame : frame;
          return <g key={i}>
            <Pixels image={drooping ? wilted[0] : kind[sideFrame]} x={px} y={py} mirror={mirror} />
            {condition === "rootRot" && <Pixels image={spots} x={px + (mirror ? -9 : 4)} y={py + 4} />}
          </g>;
        })}
      </g>)}
    </g>
  </g>;
}

function Stem({ stage, condition }) {
  const limp = condition === "critical" || condition === "rootRot";
  if (stage === "seed") return <>
    {limp ? <Pixels image={shrunkSeed} x={30} y={18} /> : <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest"><Pixels image={seed} x={29} y={15} /></g>
      <g className="plant-pixel-active"><Pixels image={seedInhale} x={29} y={14} /></g>
    </g>}
    {condition === "rootRot" && <Pixels image={spots} x={36} y={18} />}
  </>;
  if (limp) return <>
    <Pixels image={droopedShoot} x={29} y={17} />
    {condition === "rootRot" && <Pixels image={spots} x={33} y={17} />}
  </>;
  return <>
    <path d="M36 20h2v6h-2z" />
    <g className="plant-pixel-unfurl">
      <g className="plant-pixel-rest"><Pixels image={shoot} x={30} y={12} /></g>
      <g className="plant-pixel-active"><Pixels image={openShoot} x={30} y={11} /></g>
    </g>
  </>;
}

function Remains({ stage }) {
  if (stage === "seed") return <Pixels image={shrunkSeed} x={29} y={18} />;
  return <>
    <path d="M35 27v-9h1v-4h2v-3h6v1h2v4h-2v-3h-5v3h-2v4h-1v7z" />
    {stage !== "sprout" && <path d="M36 21h-4v-2h-3v-3h2v2h3v1h2z" />}
    {(stage === "split" || stage === "grown") && <path d="M38 13V8h2V6h4v2h-3v2h-1v3z" />}
    {stage === "grown" && <path d="M36 24h4v-3h4v-2h3v2h-2v2h-4v2h-5z" />}
    <Pixels image={deadLeaf} x={47} y={30} />
  </>;
}

function Pot({ condition, expression }) {
  const parched = condition === "dry" || condition === "critical";
  return <>
    {parched && <>
      <Pixels image={cracked} x={6} y={32} />
      <Pixels image={cracked} mirror x={66} y={33} />
    </>}
    {condition === "soggy" && <>
      <Pixels image={puddle} x={10} y={34} />
      <Pixels image={puddle} mirror x={63} y={35} />
      <g className="plant-pixel-drips"><Pixels image={drop} x={49} y={27} /></g>
    </>}
    {condition === "rootRot" && <>
      <Pixels image={roots} x={14} y={33} />
      <Pixels image={roots} mirror x={58} y={33} />
    </>}
    <Pixels image={pot} x={24} y={25} />
    {parched && <path d="M29 26h3v1h-2v1h-1z M36 25h3v1h-1v1h-2z M28 28h3v1h-2v2h-1z" />}
    {condition === "rootRot" && <path d="M26 28h4v1h-2v1h-2z M43 28h3v1h-3z" />}
    {expression === "content" ? <g className="plant-pixel-blink">
      <g className="plant-pixel-rest"><Pixels image={faces.content} x={30} y={31} /></g>
      <g className="plant-pixel-active"><Pixels image={blink} x={30} y={31} /></g>
    </g> : <Pixels image={faces[expression]} x={30} y={31} />}
  </>;
}

function Feeling({ stage, mood, hungry, lowLight, condition, reaction }) {
  if (condition === "dead") return null;
  return <>
    {hungry && <Pixels image={food} x={10} y={26} />}
    {lowLight && <Pixels image={littleSun} x={60} y={26} />}
    {condition === "healthy" && !reaction && <>
      {stage === "seed" ? <g className="plant-pixel-snooze">
        <Pixels image={zSmall} x={45} y={12} /><Pixels image={zLarge} x={50} y={5} />
      </g> : mood === "happy" ? <Pixels image={sparkle} x={9} y={4} /> : mood === "lonely" ?
        <path className="plant-pixel-sigh" d="M3 4h3v1H3z M7 4h2v1H7z M11 3h2v1h-2z" /> : null}
    </>}
  </>;
}

function EventArt({ kind }) {
  let art;
  switch (kind) {
    case "water": art = <><Pixels image={drop} x={5} y={3} /><Pixels image={drop} x={11} y={9} /></>; break;
    case "food": art = <><Pixels image={food} x={4} y={4} /><path d="M12 12h3v2h-3z M16 17h2v2h-2z" /></>; break;
    case "sun": art = <><Pixels image={sun} x={3} y={1} /><Pixels image={sparkle} x={13} y={7} /></>; break;
    case "talk": art = <><Pixels image={heart} x={5} y={3} /><path d="M14 4h2v1h-2z M15 1h1v2h-1z" /></>; break;
    case "drain": art = <><Pixels image={down} x={5} y={13} /><Pixels image={drop} x={11} y={23} /></>; break;
    case "overwater": art = <><Pixels image={drop} x={4} y={1} /><Pixels image={drop} x={11} y={6} /><Pixels image={drop} x={2} y={12} /><Pixels image={puddle} x={2} y={34} /></>; break;
    case "growth": art = <><Pixels image={star} x={4} y={2} /><Pixels image={sparkle} x={62} y={4} /><Pixels image={sprig} x={48} y={28} /></>; break;
    case "death": art = <><Pixels image={deadLeaf} x={5} y={9} /><path opacity=".55" d="M7 4h1v2H7z M11 7h1v1h-1z" /></>; break;
    case "replant": art = <><Pixels image={scoop} x={14} y={9} /><Pixels image={earthBits} x={13} y={23} /><Pixels image={sparkle} x={48} y={16} /></>; break;
    case "gameWin": art = <><Pixels image={star} x={4} y={2} /><Pixels image={star} x={61} y={3} /><path d="M5 11h1v2H5z M65 13h2v1h-2z" /></>; break;
    case "gameLoss": art = <><Pixels image={splitHeart} x={4} y={3} /><path d="M12 10h2v1h-2z M14 12h2v1h-2z" /></>; break;
    default: return null;
  }
  return <g className={`plant-event plant-event-${kind}`} data-effect={kind}>{art}</g>;
}

export default function PlantPixel({ stage = "seed", reaction = null, condition = "healthy", mood = "content", hungry = false, lowLight = false }) {
  const growth = Object.hasOwn(stageName, stage) ? stage : "seed";
  const soil = Object.hasOwn(healthName, condition) ? condition : "healthy";
  const feeling = ["happy", "content", "quiet", "lonely"].includes(mood) ? mood : "content";
  const effect = Object.hasOwn(effectName, reaction) && (soil !== "dead" || reaction === "death") ? reaction : null;
  const expression = soil !== "healthy" ? soil : growth === "seed" ? "asleep" : hungry ? "hungry" : lowLight ? "lowLight" : feeling;
  const subject = growth === "seed" && soil !== "healthy" ? "Monstera seed" : stageName[growth];
  const label = [subject, healthName[soil], soil !== "dead" && feeling, soil !== "dead" && hungry && "needs food", soil !== "dead" && lowLight && "needs light", effectName[effect]].filter(Boolean).join(", ");
  return <svg className="plant-pixel" viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} shapeRendering="crispEdges" data-stage={growth} data-condition={soil} data-mood={feeling} data-effect={effect ?? undefined}>
    <g fill="currentColor">
      <g className="plant-body">{soil === "dead" ? <Remains stage={growth} /> : foliage[growth] ?
        <Canopy stage={growth} condition={soil} lowLight={lowLight} /> : <Stem stage={growth} condition={soil} />}</g>
      <Pot condition={soil} expression={expression} />
      <Feeling stage={growth} mood={feeling} hungry={hungry} lowLight={lowLight} condition={soil} reaction={effect} />
      {effect && <EventArt kind={effect} />}
    </g>
  </svg>;
}
