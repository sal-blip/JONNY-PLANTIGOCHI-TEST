import React from "react";
import {BottlePreview, GnatDose, OutbreakArt, outbreakLabels, outbreakLevel} from "./GnatArt.jsx";
import "./PlantPixel.css";
export {GnatBottle} from "./GnatArt.jsx";

// Glyphs identify a material's outline, shade, smaller details, lit surface and midtone.
// A leaf's detail color picks out its vein; clay and soil use the same cells for modeling.
function ramp(edge, shade, detail, surface, middle = detail) {
  return { "#": edge, "+": shade, ":": detail, "-": surface, "=": middle };
}
const ink = {
  face: ramp("#493238", "#664247", "#816463", "#e9ac91"),
  leaf: ramp("#245e4b", "#31825e", "#a3d396", "#62b382", "#459b70"),
  emerald: ramp("#24584e", "#29755c", "#88c99c", "#479d79", "#378766"),
  youngLeaf: ramp("#42754d", "#659852", "#d4e6a9", "#99c874", "#79aa63"),
  dimLeaf: ramp("#446565", "#557d76", "#a9c5ae", "#7fa78e", "#6b9583"),
  wetLeaf: ramp("#285963", "#347971", "#a1d3b6", "#60ad96", "#439789"),
  dryLeaf: ramp("#6d6547", "#97894d", "#d6d098", "#a7ae69", "#9b9e5b"),
  wilted: ramp("#755543", "#94714c", "#d6b87c", "#be9f69", "#a38756"),
  rotted: ramp("#54484a", "#705c55", "#b6ab85", "#979672", "#857c62"),
  paleLeaf: ramp("#476945", "#68834d", "#c6ce88", "#91ad72", "#7e975e"),
  seed: ramp("#634339", "#986342", "#edbd83", "#c58b59", "#ae754d"),
  oldSeed: ramp("#654b44", "#896c58", "#caaa82", "#a58b69"),
  soil: ramp("#594038", "#80573f", "#be9270", "#a77754"),
  clod: ramp("#7a5843", "#ac7e53", "#c49d73", "#d9b58a"),
  rot: ramp("#53404b", "#744e57", "#aa7475", "#b68d7d"),
  deadLeaf: ramp("#755942", "#a17b4e", "#e4c788", "#bf9b62"),
  clay: ramp("#78483d", "#ad6750", "#d98a62", "#efad85"),
  water: ramp("#286d8d", "#4494b2", "#70c2d3", "#cdf4ea"),
  heart: ramp("#9e475b", "#c96675", "#e68890", "#f6b1aa"),
  starlight: ramp("#ae732f", "#d59a43", "#ffe19a", "#ffd46c"),
  food: ramp("#8b623a", "#b78642", "#e5b969", "#ffe0a0"),
  twilight: ramp("#62658a", "#817ba5", "#a4a0c7", "#c9c1de"),
};

// Empty cells stay transparent, including all the way through a split blade.
function draw(rows, material = "face", offsets = []) {
  const paths = { "#": "", "+": "", ":": "", "-": "", "=": "" };
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/([#+:=\-])\1*/g)) {
      const w = run[0].length;
      paths[run[1]] += `M${run.index + (offsets[y] ?? 0)} ${y}h${w}v1h-${w}z`;
    }
  });
  return { paths: Object.entries(paths).filter(([, path]) => path.length), material };
}

function Pixels({ image, x = 0, y = 0, mirror = false, material = image.material }) {
  return <g transform={`translate(${x} ${y})${mirror ? " scale(-1 1)" : ""}`}>
    {image.paths.map(([tone, path]) => <path key={tone} d={path} fill={ink[material][tone]} />)}
  </g>;
}

// The upper petiole stays attached. Motion is a different drawing on the same pixel grid.
function blade(rows) {
  const offsets = rows.map((_, row) => row < 5 ? 0 : row < 11 ? 1 : 2);
  return [draw(rows, "leaf"), draw(rows, "leaf", offsets), draw(rows, "leaf", offsets.map(x => -x))];
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
], "youngLeaf");
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
], "youngLeaf");
const droopedShoot = draw([
  "....######",
  "..##::---:##",
  ".#:----:#:-:#",
  "#----:#####:#",
  "#--###.##..+#",
  "###....+#..+#",
  ".......+#...#",
  ".......##",
], "wilted");
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
const seed = draw(seedRows, "seed");
const seedInhale = draw([...seedRows.slice(0, 6), seedRows[5], ...seedRows.slice(6)], "seed");
const shrunkSeed = draw([
  "..........###",
  ".......###::#",
  "....###:---#",
  "..##:---:+:#",
  ".#-----+--:+#",
  "#:-::------+#",
  ".#+--:--:++#",
  "..#########",
], "oldSeed");

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

const potSoil = draw([
  ".....++###++##+++##++....",
  "...##:++:::+++:::++:##..",
], "soil");
const pot = draw([
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
], "clay");
const earthBits = draw(["..:++:...::", "++:..++:+#:", "...:...:+.."], "soil");
const cracked = draw([
  "....####...:##++:..",
  ".:##----#..#:---:+#",
  "##--::--#..#--::++#",
  "..+##:::#.#::++##..",
  ".....++##..###.....",
], "clod");
const puddle = draw([
  ".....:::::....::.....",
  "..:++--..::+++--++:..",
  ".++:---..---:----..:+",
  "...::::++:::::+++::..",
], "water");
const roots = draw([
  "..##...#+...##...#",
  ".#+...###...+##..+#",
  ".##..#.+#...#+#..#",
  "#++.....##...#..:+",
  "..#....#+.......#",
], "rot");
const spots = draw([".++...#", "+##+..+", ".+#..+#", "....+#."], "rot");
const deadLeaf = draw([
  "..........###",
  "......####--:##",
  "....##::---::+#",
  "...#+..:-:-:+#",
  "..#:--:--:++#",
  ".#++:--:++##",
  "#...####",
], "deadLeaf");

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
  bothered: draw([".#........#.", "##........##", ".....##", "....#..#"]),
};
const blink = draw(["............","###......###",".....#.#","......#"]);
const zSmall = draw(["###", "..#", ".#.", "###"], "twilight");
const zLarge = draw(["#####", "...#.", "..#..", ".#...", "#####"], "twilight");
const drop = draw(["..#..", ".#:#.", ".#:#.", "#:-:#", "#:-:#", ".###."], "water");
const heart = draw([".##.##.", "#::#::#", "#:::::#", ".#:::#.", "..#:#..", "...#..."], "heart");
const star = draw(["...#...", "...#...", "..#+#..", "##:-:##", "..#+#..", "...#...", "...#..."], "starlight");
const sparkle = draw(["..#..", "..#..", "##:##", "..#..", "..#.."], "starlight");
const sun = draw(["....#....",".#.....#.","...###...","..#:::#..","#.#:::#.#","..#:::#..","...###...",".#.....#.","....#...."], "starlight");
const food = draw([".....##", "...##+#", ".##:::#", "#:--:+#", ".#::##", "..##"], "food");
const littleSun = draw(["..#..", ".+#+.", "##.##", ".+#+.", "..#.."], "starlight");
const scoop = draw(["....##", "...#+#", ".##-+#", "#:-+#", "#++#", ".##"], "soil");
const down = draw(["...##", "...##", "...##", ".#.##.#", "..####", "...##"], "water");
const sprig = draw([".....###", ".##.#:-#", "#:-##:#", ".##:##", "...##", "...##"], "youngLeaf");
const splitHeart = draw([".##...##", "#::#.#:+#", "#:#..#::#", ".#:#..:#", "..#..:#", ".....#"], "heart");

const stageName = { seed: "Sleeping Monstera seed", sprout: "Monstera sprout", young: "Young Monstera", split: "Monstera with its first split leaf", grown: "Grown Monstera with a broad canopy" };
const healthName = { dry: "dry with cracked soil", critical: "critically thirsty and slumping", soggy: "soggy and dripping", rootRot: "root rot with mottled leaves and damaged roots", dead: "dead and still" };
const effectName = { water: "being watered", food: "receiving food", sun: "receiving sunlight", talk: "hearing kind words", drain: "draining excess water", overwater: "an extra pour", growth: "growing", death: "a fallen leaf", replant: "newly planted", gameWin: "celebrating a game win", gameLoss: "a game loss", gnatCure: "one drop of G-NAT ASSASSIN reaches the soil and the fungus gnats scatter" };

const leafHealth = { dry: "dryLeaf", critical: "wilted", soggy: "wetLeaf", rootRot: "rotted" };

function Canopy({ stage, condition, lowLight, severity }) {
  const drooping = condition === "critical" || condition === "rootRot" || severity === 3;
  return <g className={'plant-canopy' + (lowLight && !drooping ? ' plant-seeking-light' : '')}>
    {foliage[stage].map(({ stem }, i) => <path key={i} d={stem} fill="none" stroke={ink[leafHealth[condition] || "leaf"]["#"]} strokeWidth="2" />)}
    <g className={drooping ? undefined : "plant-pixel-sway"}>
      {(drooping ? [0] : [0, 1, 2]).map(frame => <g key={frame} className={["plant-pixel-rest", "plant-pixel-active", "plant-pixel-return"][frame]}>
        {foliage[stage].map(({ kind, x, y, mirror }, i) => {
          // Drooping tissue hangs from the same petiole as its healthy blade.
          const inset = kind === little ? -2 : kind === simple ? 3 : kind === firstSplit ? 6 : 8;
          const px = x + (drooping ? (mirror ? -inset : inset) : 0);
          const py = y + (drooping ? 3 : 0);
          const sideFrame = mirror && frame ? 3 - frame : frame;
          const bladeTone = kind === little ? "youngLeaf" : i % 2 ? "emerald" : "leaf";
          const material = leafHealth[condition] || (severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : bladeTone);
          return <g key={i}>
            <Pixels image={drooping ? wilted[0] : kind[sideFrame]} material={material} x={px} y={py} mirror={mirror} />
            {condition === "rootRot" && <Pixels image={spots} x={px + (mirror ? -9 : 4)} y={py + 4} />}
          </g>;
        })}
      </g>)}
    </g>
  </g>;
}

function Stem({ stage, condition, lowLight, severity }) {
  const material = leafHealth[condition] || (severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : "youngLeaf");
  const limp = condition === "critical" || condition === "rootRot" || severity === 3;
  if (stage === "seed") return <>
    {limp ? <Pixels image={shrunkSeed} x={30} y={18} /> : <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest"><Pixels image={seed} x={29} y={15} /></g>
      <g className="plant-pixel-active"><Pixels image={seedInhale} x={29} y={14} /></g>
    </g>}
    {condition === "rootRot" && <Pixels image={spots} x={36} y={18} />}
  </>;
  if (limp) return <>
    <Pixels image={droopedShoot} material={material} x={29} y={17} />
    {condition === "rootRot" && <Pixels image={spots} x={33} y={17} />}
  </>;
  return <>
    <path fill={ink[material]["#"]} d="M36 20h2v6h-2z" />
    <g className="plant-pixel-unfurl">
      <g className="plant-pixel-rest"><Pixels image={shoot} material={material} x={30} y={12} /></g>
      <g className="plant-pixel-active"><Pixels image={openShoot} material={material} x={30} y={11} /></g>
    </g>
  </>;
}

function Remains({ stage }) {
  if (stage === "seed") return <Pixels image={shrunkSeed} x={29} y={18} />;
  return <>
    <path fill={ink.deadLeaf["#"]} d="M35 27v-9h1v-4h2v-3h6v1h2v4h-2v-3h-5v3h-2v4h-1v7z" />
    {stage !== "sprout" && <path fill={ink.deadLeaf["+"]} d="M36 21h-4v-2h-3v-3h2v2h3v1h2z" />}
    {(stage === "split" || stage === "grown") && <path fill={ink.deadLeaf["+"]} d="M38 13V8h2V6h4v2h-3v2h-1v3z" />}
    {stage === "grown" && <path fill={ink.deadLeaf["+"]} d="M36 24h4v-3h4v-2h3v2h-2v2h-4v2h-5z" />}
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
    <Pixels image={potSoil} x={24} y={25} />
    <Pixels image={pot} x={24} y={27} />
    <path fill="#ffd0a3" d="M29 28h4v1h-4z" />
    {parched && <path fill={ink.soil["#"]} d="M29 26h3v1h-2v1h-1z M36 25h3v1h-1v1h-2z M28 28h3v1h-2v2h-1z" />}
    {condition === "rootRot" && <path fill={ink.rot["#"]} d="M26 28h4v1h-2v1h-2z M43 28h3v1h-3z" />}
    {condition !== "dead" && <path fill={condition === "healthy" ? "#d37572" : "#ba8070"} d="M28 33h2v1h-2z M42 33h2v1h-2z" />}
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
        <path className="plant-pixel-sigh" fill={ink.twilight["#"]} d="M3 4h3v1H3z M7 4h2v1H7z M11 3h2v1h-2z" /> : null}
    </>}
  </>;
}

function EventArt({ kind }) {
  let art;
  switch (kind) {
    case "water": art = <><Pixels image={drop} x={5} y={3} /><Pixels image={drop} x={11} y={9} /></>; break;
    case "food": art = <><Pixels image={food} x={4} y={4} /><path fill={ink.food["+"]} d="M12 12h3v2h-3z M16 17h2v2h-2z" /></>; break;
    case "sun": art = <><Pixels image={sun} x={3} y={1} /><Pixels image={sparkle} x={13} y={7} /></>; break;
    case "talk": art = <><Pixels image={heart} x={5} y={3} /><path fill={ink.heart["+"]} d="M14 4h2v1h-2z M15 1h1v2h-1z" /></>; break;
    case "drain": art = <><Pixels image={down} x={5} y={13} /><Pixels image={drop} x={11} y={23} /></>; break;
    case "overwater": art = <><Pixels image={drop} x={4} y={1} /><Pixels image={drop} x={11} y={6} /><Pixels image={drop} x={2} y={12} /><Pixels image={puddle} x={2} y={34} /></>; break;
    case "growth": art = <><Pixels image={star} x={4} y={2} /><Pixels image={sparkle} x={62} y={4} /><Pixels image={sprig} x={48} y={28} /></>; break;
    case "death": art = <><Pixels image={deadLeaf} x={5} y={9} /><path fill={ink.deadLeaf["+"]} opacity=".7" d="M7 4h1v2H7z M11 7h1v1h-1z" /></>; break;
    case "replant": art = <><Pixels image={scoop} x={14} y={9} /><Pixels image={earthBits} x={13} y={23} /><Pixels image={sparkle} x={48} y={16} /></>; break;
    case "gameWin": art = <><Pixels image={star} x={4} y={2} /><Pixels image={star} x={61} y={3} /><path fill={ink.starlight["+"]} d="M5 11h1v2H5z M65 13h2v1h-2z" /></>; break;
    case "gameLoss": art = <><Pixels image={splitHeart} x={4} y={3} /><path fill={ink.heart["+"]} d="M12 10h2v1h-2z M14 12h2v1h-2z" /></>; break;
    default: return null;
  }
  return <g className={`plant-event plant-event-${kind}`} data-effect={kind}>{art}</g>;
}

export default function PlantPixel({ stage = "seed", reaction = null, condition = "healthy", mood = "content", hungry = false, lowLight = false, outbreak = 0, showBottle = false }) {
  const growth = Object.hasOwn(stageName, stage) ? stage : "seed";
  const soil = Object.hasOwn(healthName, condition) ? condition : "healthy";
  const feeling = ["happy", "content", "quiet", "lonely"].includes(mood) ? mood : "content";
  const effect = Object.hasOwn(effectName, reaction) && (soil !== "dead" || reaction === "death") ? reaction : null;
  const severity = soil === "dead" ? 0 : outbreakLevel(outbreak);
  const curing = effect === "gnatCure";
  const active = curing ? 0 : severity;
  const expression = soil !== "healthy" ? soil : active >= 2 ? "bothered" : growth === "seed" ? "asleep" : hungry ? "hungry" : lowLight ? "lowLight" : feeling;
  const subject = growth === "seed" && soil !== "healthy" ? "Monstera seed" : stageName[growth];
  const label = [subject, healthName[soil], outbreakLabels[active], showBottle && soil !== "dead" && !curing && "G-NAT ASSASSIN treatment bottle", soil !== "dead" && feeling, soil !== "dead" && hungry && "needs food", soil !== "dead" && lowLight && "needs light", effectName[effect]].filter(Boolean).join(", ");
  return <svg className="plant-pixel" viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} shapeRendering="crispEdges" data-stage={growth} data-condition={soil} data-mood={feeling} data-outbreak={active || undefined} data-effect={effect ?? undefined}>
    <g fill="currentColor">
      <g className="plant-body"><g className="plant-outbreak-posture">{soil === "dead" ? <Remains stage={growth} /> : foliage[growth] ?
        <Canopy stage={growth} condition={soil} lowLight={lowLight} severity={active} /> : <Stem stage={growth} condition={soil} lowLight={lowLight} severity={active} />}</g></g>
      <Pot condition={soil} expression={expression} />
      <Feeling stage={growth} mood={feeling} hungry={hungry} lowLight={lowLight} condition={soil} reaction={effect || active} />
      {active > 0 && <OutbreakArt severity={active}/>}
      {showBottle && !curing && soil !== "dead" && <BottlePreview/>}
      {curing ? <GnatDose severity={severity}/> : effect && <EventArt kind={effect} />}
    </g>
  </svg>;
}
