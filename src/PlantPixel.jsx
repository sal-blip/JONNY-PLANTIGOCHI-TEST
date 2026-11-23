import React from "react";
import {BottlePreview, GnatDose, OutbreakArt, outbreakLabels, outbreakLevel} from "./GnatArt.jsx";
import {vineBladeRows} from "./vineBlade.js";
import {hoyaSeedRows, hoyaStages} from "./hoyaArt.js";
import {pothosStages} from "./pothosArt.js";
import {snakePlantRows, snakeSeedRows} from "./snakePlantArt.js";
import {cactusPose, cactusSeedRows, bloomRows} from "./monkeyTailArt.js";
import {queenStages, queenSeedRows} from "./queenAnthuriumArt.js";
import {micansStages, micansSeedRows} from "./pinkMicansArt.js";
import {flowerFrames, flowerInks, flowerSeeds} from "./floweringPlantArt.js";
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
  monkeyTail: ramp("#575f50", "#89937a", "#f5efd9", "#abb49b", "#d5d7bc"),
  cactusDry: ramp("#606456", "#91907c", "#e1dcc4", "#aeae96", "#c5c6af"),
  cactusParched: ramp("#726653", "#93876b", "#dbcfad", "#afa184", "#c7bb9a"),
  cactusSeed: ramp("#4b3e44", "#634f4a", "#cda98d", "#96765d", "#af9374"),
  snake: ramp("#244b3d", "#42755c", "#dfc46c", "#639571", "#a2bba0"),
  micans: ramp("#443e39", "#586340", "#f1b4a8", "#859257", "#c48678"),
  micansDry: ramp("#585247", "#737356", "#d4a99b", "#989771", "#b58c7c"),
  micansCritical: ramp("#62584b", "#81775d", "#c6a998", "#a79776", "#ad907e"),
  queen: ramp("#213e38", "#305e51", "#d1dfbd", "#45735d", "#92ad90"),
  hoya: ramp("#284841", "#40695b", "#daead9", "#6a987d", "#9bbba2"),
  pothos: ramp("#254d3d", "#357350", "#f0d77b", "#65a157", "#b0bd62"),
  pothosSeed: ramp("#4e4835", "#85724a", "#e7cb82", "#bb9d62", "#a28452"),
  dimLeaf: ramp("#446565", "#557d76", "#a9c5ae", "#7fa78e", "#6b9583"),
  wetLeaf: ramp("#285963", "#347971", "#a1d3b6", "#60ad96", "#439789"),
  dryLeaf: ramp("#43654b", "#577c52", "#bed198", "#82a878", "#6d9467"),
  thirstyLeaf: ramp("#526448", "#6e8556", "#c8cf92", "#94a875", "#829962"),
  rotted: ramp("#54484a", "#705c55", "#b6ab85", "#979672", "#857c62"),
  paleLeaf: ramp("#476945", "#68834d", "#c6ce88", "#91ad72", "#7e975e"),
  seed: ramp("#634339", "#986342", "#edbd83", "#c58b59", "#ae754d"),
  oldSeed: ramp("#654b44", "#896c58", "#caaa82", "#a58b69"),
  soil: ramp("#594038", "#80573f", "#be9270", "#a77754"),
  drySoil: ramp("#855d43", "#ae845c", "#d7b88c", "#c8a276"),
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

// Two integer shears curl the tip inward and then downward about the petiole.
// Moving each original cell preserves the outline, veins and fenestrations.
function bendBlade(rows, critical) {
  const w = Math.max(...rows.map(row => row.length)), h = rows.length;
  const curl = Math.max(1, Math.round(w * (critical ? .22 : .10)));
  const drop = Math.max(1, Math.round(w * (critical ? .45 : .23)));
  const cells = Array.from({ length: h + drop }, () => Array(w + curl).fill("."));
  rows.forEach((row, y) => {
    const inward = Math.round(curl * (y / (h - 1)) ** 1.6);
    [...row].forEach((tone, x) => {
      if (tone === ".") return;
      const column = x + inward;
      const sag = Math.round(drop * Math.max(0, 1 - column / (w - 2)) ** (critical ? .55 : 1.2));
      cells[y + sag][column] = tone;
    });
  });
  return draw(cells.map(row => row.join("")), critical ? "thirstyLeaf" : "dryLeaf");
}

function blade(rows) {
  const offsets = rows.map((_, row) => row < 5 ? 0 : row < 11 ? 1 : 2);
  return {
    frames: [draw(rows, "leaf"), draw(rows, "leaf", offsets), draw(rows, "leaf", offsets.map(x => -x))],
    dry: bendBlade(rows, false),
    critical: bendBlade(rows, true),
  };
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
const diseasedLeaf = draw([
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
], "rotted");
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
], "rotted");
const leftCotyledon = blade(["..###", ".#:##", "#--+#", "##+#", ".##"]);
const rightCotyledon = blade(["...###", ".##::#", "#:-:+#", "#--:+#", "#-:+#", ".:+#", "..#"]);
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
const drySeed = draw(seedRows.filter((_, y) => y !== 7), "seed");
const thirstySeed = draw(seedRows.filter((_, y) => y !== 6 && y !== 8), "seed");
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
const pothosSeedRows = [
  "......####",
  "....##:--+#",
  "..##::=--+#",
  ".#:-==--++#",
  "#:----=++#",
  "#--==++++#",
  ".#:-+++##",
  "..#####",
];
const pothosSeed = draw(pothosSeedRows, "pothosSeed");
const pothosSeedInhale = draw([...pothosSeedRows.slice(0, 5), pothosSeedRows[4], ...pothosSeedRows.slice(5)], "pothosSeed");
const dryPothosSeed = draw(pothosSeedRows.filter((_, y) => y !== 4), "pothosSeed");
const shrunkPothosSeed = draw(pothosSeedRows.filter((_, y) => y !== 3 && y !== 5), "oldSeed");

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
const vineStages = {pothos: pothosStages, hoya: hoyaStages, queen: queenStages, micans: micansStages};
const vineBlades = new Map();
for (const [material, stages] of Object.entries(vineStages)) {
  for (const {leaves} of Object.values(stages)) {
    for (const {shape} of leaves) {
      if (vineBlades.has(shape)) continue;
      const poses = [0, 1, -1, "dry", "critical"];
      vineBlades.set(shape, Object.fromEntries(poses.map(pose => [pose, draw(vineBladeRows(shape, pose), material)])));
    }
  }
}
function seedImages(rows, material) {
  return {
    rest: draw(rows,material),
    inhale: draw([...rows.slice(0,4),rows[3],...rows.slice(4)],material),
    wilt: draw(rows.filter((_,i)=>i!==4),"oldSeed"),
    y: 26-rows.length,
  };
}
const hoyaSeed = seedImages(hoyaSeedRows,"pothosSeed");
const queenSeed = seedImages(queenSeedRows,"seed");
const micansSeed = seedImages(micansSeedRows,"seed");
const toyVines = new Map([
  ["golden-pothos", {variety:"pothos"}],
  ["hoya-serpens-splash", {variety:"hoya", seed:hoyaSeed, x:30}],
  ["queen-anthurium", {variety:"queen", seed:queenSeed, x:32}],
  ["pink-micans", {variety:"micans", seed:micansSeed, x:32}],
]);
const micansHealth = {dry:"micansDry", critical:"micansCritical", rootRot:"rotted"};
const floweringSeeds = Object.fromEntries(Object.entries(flowerSeeds).map(([id,rows])=>[id,seedImages(rows,"seed")]));
const wiltInks = {dry:{e:"#56694b",g:"#708461",l:"#a3af82"},critical:{e:"#6f7152",g:"#85845e",l:"#aba780"},rootRot:{e:"#686353",g:"#827667",l:"#a29a7a"}};
const spentInks = {e:"#67594b",g:"#816d56",l:"#a48f6d",n:"#beab88"};
function FloweringPlant({species,stage,condition,severity,lowLight}) {
  if(stage==="seed") return <BreathingSeed images={floweringSeeds[species]} x={33} condition={condition} severity={severity}/>;
  const frames=flowerFrames[species][stage], colors=flowerInks[species];
  const dead=condition==="dead";
  const still=dead?5:condition==="critical"?4:condition==="dry"||condition==="rootRot"||severity===3?3:null;
  const tones=dead?spentInks:wiltInks[condition];
  function pose(n){
    return frames[n].map(([tone,d])=><path key={tone} d={d} fill={tones?.[tone] ?? (dead?"#92816a":colors[tone])}/>);
  }
  if(still!==null)return <g>{pose(still)}</g>;
  return <g className={lowLight?"plant-seeking-light":undefined}><g className="plant-pixel-sway">
    {["rest","active","return"].map((name,i)=><g key={name} className={"plant-pixel-"+name}>{pose(i)}</g>)}
  </g></g>;
}

function BreathingSeed({images,x,condition,severity}) {
  if (thirsty(condition) || condition === "rootRot" || condition === "dead" || severity === 3)
    return <Pixels image={images.wilt} x={x} y={images.y+1}/>;
  return <g className="plant-pixel-breathe">
    <g className="plant-pixel-rest"><Pixels image={images.rest} x={x} y={images.y}/></g>
    <g className="plant-pixel-active"><Pixels image={images.inhale} x={x} y={images.y-1}/></g>
  </g>;
}
function VineCanopy({variety, stage, condition, lowLight, severity}) {
  const {stems, leaves} = vineStages[variety][stage];
  const disease = condition === "rootRot" || severity === 3;
  const wilt = thirsty(condition) ? condition : disease ? "dry" : null;
  const healthyTone = variety === "queen" ? variety : severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : variety;
  const material = variety === "micans" ? micansHealth[condition] || "micans" : leafHealth[condition] || healthyTone;
  // All nodes move about the soil line together, including the petiole tips.
  // A hanging tip below the rim has little extra distance to sink.
  const sag = y => wilt ? Math.round(Math.max(0, 26 - y) * (wilt === "critical" ? .28 : .14)) : 0;
  return <g className={lowLight && !wilt ? "plant-seeking-light" : undefined}>
    {stems.map((nodes, i) => <path key={i} fill="none" stroke={ink[material]["#"]} strokeWidth="1.5"
      d={nodes.map(([x, y], n) => (n ? "L" : "M") + x + " " + (y + sag(y))).join(" ")} />)}
    <g className={wilt ? undefined : "plant-pixel-sway"}>
      {(wilt ? [wilt] : [0, 1, -1]).map((pose, i) => <g key={pose} className={["plant-pixel-rest", "plant-pixel-active", "plant-pixel-return"][i]}>
        {leaves.map(({shape, x, y, mirror}, j) => {
          const sign = mirror ? -1 : 1;
          const frame = wilt || pose * sign;
          return <g key={j}>
            <Pixels image={vineBlades.get(shape)[frame]} material={material} mirror={mirror}
              x={x - sign * (shape.ax + 2)} y={y + sag(y) - shape.ay}/>
            {condition === "rootRot" && shape.rows.length >= (variety === "hoya" ? 8 : 10) && <path fill={ink.rot["+"]}
              d={`M${x - sign * 3} ${y + sag(y) + 3}h2v2h-2z`}/>}
          </g>;
        })}
      </g>)}
    </g>
  </g>;
}

const snakeFrames = Object.fromEntries(["sprout", "young", "split", "grown"].map(stage => [
  stage, Object.fromEntries(["rest", "left", "right", "dry", "critical", "dead"].map(pose =>
    [pose, draw(snakePlantRows(stage, pose), "snake")])),
]));
const snakeSeed = draw(snakeSeedRows, "seed");
const snakeSeedInhale = draw([...snakeSeedRows.slice(0, 3), snakeSeedRows[2], ...snakeSeedRows.slice(3)], "seed");
const snakeSeedWilt = draw(snakeSeedRows.filter((_, i) => i !== 3), "oldSeed");

function SnakePlant({stage, condition, lowLight, severity}) {
  const wilt = condition === "dead" || thirsty(condition) ? condition : condition === "rootRot" || severity === 3 ? "dry" : null;
  if (stage === "seed") {
    if (wilt) return <Pixels image={snakeSeedWilt} x={32} y={21}/>;
    return <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest"><Pixels image={snakeSeed} x={32} y={20}/></g>
      <g className="plant-pixel-active"><Pixels image={snakeSeedInhale} x={32} y={19}/></g>
    </g>;
  }
  const material = condition === "dead" ? "deadLeaf" : leafHealth[condition] || (severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : "snake");
  const frames = snakeFrames[stage];
  if (wilt) return <Pixels image={frames[wilt]} material={material}/>;
  return <g className={lowLight ? "plant-seeking-light" : undefined}><g className="plant-pixel-sway">
    <g className="plant-pixel-rest"><Pixels image={frames.rest} material={material}/></g>
    <g className="plant-pixel-active"><Pixels image={frames.left} material={material}/></g>
    <g className="plant-pixel-return"><Pixels image={frames.right} material={material}/></g>
  </g></g>;
}

const cactusFrames = Object.fromEntries(["sprout","young","split","grown"].map(stage =>
  [stage,Object.fromEntries(["rest","left","right","dry","critical","dead"].map(pose => {
    const {rows,bloom}=cactusPose(stage,pose);
    return [pose,{stem:draw(rows,"monkeyTail"),bloom}];
  }))]));
const cactusBloom = draw(bloomRows,"heart");
const cactusSeed = draw(cactusSeedRows,"cactusSeed");
const breathingCactusSeed = draw([...cactusSeedRows.slice(0,2),cactusSeedRows[2],...cactusSeedRows.slice(2)],"cactusSeed");
const spentCactusSeed = draw(cactusSeedRows.filter((_,y)=>y!==2),"oldSeed");

function MonkeyTail({stage,condition,lowLight,severity}) {
  const stressed = condition === "dead" || thirsty(condition) ? condition : condition === "rootRot" || severity === 3 ? "dry" : null;
  if (stage === "seed") {
    if (stressed) return <Pixels image={spentCactusSeed} x={33} y={22}/>;
    return <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest"><Pixels image={cactusSeed} x={33} y={21}/></g>
      <g className="plant-pixel-active"><Pixels image={breathingCactusSeed} x={33} y={20}/></g>
    </g>;
  }
  const material = {dead:"deadLeaf",dry:"cactusDry",critical:"cactusParched"}[condition] || leafHealth[condition] || "monkeyTail";
  const frames=cactusFrames[stage];
  if (stressed) return <Pixels image={frames[stressed].stem} material={material}/>;
  return <g className={lowLight ? "plant-seeking-light" : undefined}><g className="plant-pixel-sway">
    {["rest","left","right"].map((pose,i)=>{
      const {stem,bloom}=frames[pose];
      return <g key={pose} className={["plant-pixel-rest","plant-pixel-active","plant-pixel-return"][i]}>
        <Pixels image={stem} material={material}/>
        {bloom && <Pixels image={cactusBloom} {...bloom}/>}
      </g>;
    })}
  </g></g>;
}

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
  dry: draw([".##......##.", ".#........#.", ".....##.....", "....#..#...."]),
  critical: draw(["..#......#..", "##........##", "....####....", "...#....#..."]),
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
const pothosStageName = { seed: "Sleeping Golden Pothos seed", sprout: "Golden Pothos sprout", young: "Young Golden Pothos", split: "Golden Pothos with its first vine", grown: "Grown Golden Pothos with trailing vines" };
const snakeStageName = { seed: "Sleeping Snake Plant seed", sprout: "Snake Plant sprout", young: "Young Snake Plant", split: "Snake Plant rosette", grown: "Grown Snake Plant with five striped blades" };
const hoyaStageName = { seed: "Sleeping Hoya Splash seed", sprout: "Hoya Splash sprout", young: "Young Hoya Splash", split: "Hoya Splash with its first runner", grown: "Grown Hoya Splash with trailing pairs of silver-flecked leaves" };
const cactusStageName = {seed:"Sleeping Monkey Tail Cactus seed", sprout:"Monkey Tail Cactus sprout", young:"Young Monkey Tail Cactus", split:"Monkey Tail Cactus with its first trailing stem", grown:"Grown Monkey Tail Cactus with silver trailing stems"};
const queenStageName = {seed:"Sleeping Queen Anthurium seed", sprout:"Queen Anthurium sprout", young:"Young Queen Anthurium", split:"Queen Anthurium with its first velvet blade", grown:"Grown Queen Anthurium with long silver-veined leaves"};
const micansStageName = {seed:"Sleeping Pink Micans seed", sprout:"Pink Micans sprout", young:"Young Pink Micans", split:"Pink Micans with a trailing vine", grown:"Grown Pink Micans with blush-patched velvet hearts"};
const birdStageName = {seed:"Sleeping Bird of Paradise seed",sprout:"Bird of Paradise sprout",young:"Young Bird of Paradise",split:"Bird of Paradise with a flower bract",grown:"Grown Bird of Paradise with an orange and blue flower"};
const orchidStageName = {seed:"Sleeping Moth Orchid seed",sprout:"Moth Orchid sprout",young:"Young Moth Orchid",split:"Moth Orchid with a budding spike",grown:"Grown Moth Orchid with an arch of pink flowers"};
const speciesStageNames = {"bird-of-paradise":birdStageName,"moth-orchid":orchidStageName,"pink-micans":micansStageName,"queen-anthurium":queenStageName,"monkey-tail-cactus":cactusStageName, "hoya-serpens-splash": hoyaStageName, "snake-plant": snakeStageName, "golden-pothos": pothosStageName};
const healthName = { dry: "dry and wilting", critical: "critically thirsty and deeply wilted", soggy: "soggy and dripping", rootRot: "root rot with mottled leaves and damaged roots", dead: "dead and still" };
const effectName = { water: "being watered", food: "receiving food", sun: "receiving sunlight", talk: "hearing kind words", drain: "draining excess water", overwater: "an extra pour", growth: "growing", death: "a fallen leaf", replant: "newly planted", gameWin: "celebrating a game win", gameLoss: "a game loss", gnatCure: "one drop of G-NAT ASSASSIN reaches the soil and the fungus gnats scatter" };

const leafHealth = { dry: "dryLeaf", critical: "thirstyLeaf", soggy: "wetLeaf", rootRot: "rotted" };
const thirsty = condition => condition === "dry" || condition === "critical";

function ThirstyCanopy({leaves, condition}) {
  const critical = condition === "critical", material = leafHealth[condition];
  const sink = critical ? 3 : 1, inset = critical ? 2 : 1;
  return <g className="plant-thirsty-canopy">
    {leaves.map(({stem, mirror}, i) => <path key={i} fill="none" stroke={ink[material]["#"]} strokeWidth="2"
      d={stem + "h" + (mirror ? -inset : inset) + "v" + sink} />)}
    {leaves.map(({kind, x, y, mirror}, i) =>
      <Pixels key={i} image={kind[condition]} x={x + (mirror ? -inset : inset)} y={y + sink} mirror={mirror} />)}
  </g>;
}

function Canopy({ leaves, condition, lowLight, severity }) {
  if (thirsty(condition)) return <ThirstyCanopy leaves={leaves} condition={condition} />;
  const drooping = condition === "rootRot" || severity === 3;
  return <g className={'plant-canopy' + (lowLight && !drooping ? ' plant-seeking-light' : '')}>
    {leaves.map(({ stem }, i) => <path key={i} d={stem} fill="none" stroke={ink[leafHealth[condition] || "leaf"]["#"]} strokeWidth="2" />)}
    <g className={drooping ? undefined : "plant-pixel-sway"}>
      {(drooping ? [0] : [0, 1, 2]).map(frame => <g key={frame} className={["plant-pixel-rest", "plant-pixel-active", "plant-pixel-return"][frame]}>
        {leaves.map(({ kind, x, y, mirror }, i) => {
          // Drooping tissue hangs from the same petiole as its healthy blade.
          const inset = kind === little ? -2 : kind === simple ? 3 : kind === firstSplit ? 6 : 8;
          const px = x + (drooping ? (mirror ? -inset : inset) : 0);
          const py = y + (drooping ? 3 : 0);
          const sideFrame = mirror && frame ? 3 - frame : frame;
          const bladeTone = kind === little ? "youngLeaf" : i % 2 ? "emerald" : "leaf";
          const material = leafHealth[condition] || (severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : bladeTone);
          return <g key={i}>
            <Pixels image={drooping ? diseasedLeaf : kind.frames[sideFrame]} material={material} x={px} y={py} mirror={mirror} />
            {condition === "rootRot" && <Pixels image={spots} x={px + (mirror ? -9 : 4)} y={py + 4} />}
          </g>;
        })}
      </g>)}
    </g>
  </g>;
}

function Stem({ stage, condition, lowLight, severity, pothos }) {
  const material = leafHealth[condition] || (severity >= 2 ? "paleLeaf" : lowLight ? "dimLeaf" : "youngLeaf");
  if (thirsty(condition)) {
    const critical = condition === "critical";
    if (stage === "seed" && pothos) return <Pixels image={critical ? shrunkPothosSeed : dryPothosSeed} x={31} y={critical ? 20 : 19} />;
    if (stage === "seed") return <Pixels image={critical ? thirstySeed : drySeed} x={29} y={critical ? 17 : 16} />;
    // Both cotyledons fold down, still attached to opposite sides of the shoot.
    const sink = critical ? 3 : 0;
    return <g className="plant-thirsty-shoot">
      <path fill="none" stroke={ink[material]["#"]} strokeWidth="2" d={`M36 26v-${8-sink}h-2v-2h-2 M37 26v-${8-sink}h1v-3h2`}/>
      <Pixels image={leftCotyledon[condition]} x={28} y={15+sink}/>
      <Pixels image={rightCotyledon[condition]} x={45} y={13+sink} mirror/>
    </g>;
  }
  const limp = condition === "rootRot" || severity === 3;
  if (stage === "seed") return <>
    {limp ? <Pixels image={pothos ? shrunkPothosSeed : thirstySeed} material={material} x={pothos ? 31 : 29} y={pothos ? 20 : 17} /> : <g className="plant-pixel-breathe">
      <g className="plant-pixel-rest"><Pixels image={pothos ? pothosSeed : seed} x={pothos ? 31 : 29} y={pothos ? 18 : 15} /></g>
      <g className="plant-pixel-active"><Pixels image={pothos ? pothosSeedInhale : seedInhale} x={pothos ? 31 : 29} y={pothos ? 17 : 14} /></g>
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

function Face({expression}) {
  return expression === "content" ? <g className="plant-pixel-blink">
    <g className="plant-pixel-rest"><Pixels image={faces.content} x={30} y={31} /></g>
    <g className="plant-pixel-active"><Pixels image={blink} x={30} y={31} /></g>
  </g> : <Pixels image={faces[expression]} x={30} y={31} />;
}

function Pot({ condition, expression, waterFrom }) {
  const parched = thirsty(condition);
  return <>
    {condition === "soggy" && <>
      <Pixels image={puddle} x={10} y={34} />
      <Pixels image={puddle} mirror x={63} y={35} />
      <g className="plant-pixel-drips"><Pixels image={drop} x={49} y={27} /></g>
    </>}
    {condition === "rootRot" && <>
      <Pixels image={roots} x={14} y={33} />
      <Pixels image={roots} mirror x={58} y={33} />
    </>}
    <Pixels image={potSoil} x={24} y={25} material={parched ? "drySoil" : "soil"} />
    <Pixels image={pot} x={24} y={27} />
    <path fill="#ffd0a3" d="M29 28h4v1h-4z" />
    {parched && <path fill={ink.soil["#"]} d="M29 25h3v1h-1v1h-2z M38 25h3v1h-2v1h-1z" />}
    {condition === "rootRot" && <path fill={ink.rot["#"]} d="M26 28h4v1h-2v1h-2z M43 28h3v1h-3z" />}
    {condition !== "dead" && <path fill={condition === "healthy" ? "#d37572" : "#ba8070"} d="M28 33h2v1h-2z M42 33h2v1h-2z" />}
    {waterFrom && <g className="plant-water-sad"><Face expression={waterFrom}/></g>}
    <g className={waterFrom ? "plant-water-relieved" : undefined}><Face expression={expression}/></g>
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
    case "water": art = <><g className="plant-water-drops"><Pixels image={drop} x={5} y={3} /><Pixels image={drop} x={11} y={9} /></g><path fill="#63bac6" d="M27 25h3v1h-3z M41 25h2v1h-2z"/><path fill="#c7eee2" d="M29 24h1v2h-1z M42 24h1v1h-1z"/></>; break;
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

function PlantBody({stage, condition, lowLight, severity, species}) {
  if (Object.hasOwn(flowerFrames,species)) return <FloweringPlant species={species} stage={stage} condition={condition} lowLight={lowLight} severity={severity}/>;
  if (species === "monkey-tail-cactus") return <MonkeyTail stage={stage} condition={condition} lowLight={lowLight} severity={severity}/>;
  if (species === "snake-plant") return <SnakePlant stage={stage} condition={condition} lowLight={lowLight} severity={severity}/>;
  const vine = toyVines.get(species);
  const pothos = species === "golden-pothos";
  if (vine?.seed && stage === "seed") return <BreathingSeed images={vine.seed} x={vine.x} condition={condition} severity={severity}/>;
  if (condition === "dead" && pothos && stage === "seed") return <Pixels image={shrunkPothosSeed} x={31} y={20}/>;
  if (condition === "dead") return <Remains stage={stage}/>;
  if (vine && stage !== "seed") return <VineCanopy variety={vine.variety} stage={stage} condition={condition} lowLight={lowLight} severity={severity}/>;
  const leaves=foliage[stage];
  return leaves ? <Canopy leaves={leaves} condition={condition} lowLight={lowLight} severity={severity}/>
    : <Stem stage={stage} condition={condition} lowLight={lowLight} severity={severity} pothos={pothos}/>;
}

export default function PlantPixel({ species, seedSteps=0, stage = "seed", reaction = null, condition = "healthy", mood = "content", hungry = false, lowLight = false, outbreak = 0, showBottle = false, waterFrom = "dry" }) {
  const growth = Object.hasOwn(stageName, stage) ? stage : "seed";
  const stageNames = Object.hasOwn(speciesStageNames, species) ? speciesStageNames[species] : stageName;
  const soil = Object.hasOwn(healthName, condition) ? condition : "healthy";
  const socialMood = ["happy", "content", "quiet", "lonely"].includes(mood) ? mood : "content";
  const feeling = thirsty(soil) ? "sad" : socialMood;
  const effect = Object.hasOwn(effectName, reaction) && (soil !== "dead" || reaction === "death") ? reaction : null;
  const severity = soil === "dead" ? 0 : outbreakLevel(outbreak);
  const curing = effect === "gnatCure";
  const active = curing ? 0 : severity;
  const treating = curing || (showBottle && active > 0);
  // Keep the soil centered vertically and leave the left side clear for First Aid.
  const patientTransform = treating ? "translate(14 5) scale(.82)" : undefined;
  const recoverFrom = effect === "water" && soil === "healthy" && growth !== "seed" && thirsty(waterFrom) ? waterFrom : null;
  const expression = soil !== "healthy" ? soil : active >= 2 ? "bothered" : growth === "seed" ? "asleep" : recoverFrom ? "happy" : hungry ? "hungry" : lowLight ? "lowLight" : feeling;
  const subject = growth === "seed" && soil !== "healthy" ? stageNames.seed.replace("Sleeping ", "") : stageNames[growth];
  const label = [subject, healthName[soil], outbreakLabels[active], showBottle && soil !== "dead" && !curing && "G-NAT ASSASSIN treatment bottle", soil !== "dead" && feeling, soil !== "dead" && hungry && "needs food", soil !== "dead" && lowLight && "needs light", effectName[effect], recoverFrom && (species === "monkey-tail-cactus" ? "stems plumping after a drink" : "leaves lifting after a drink")].filter(Boolean).join(", ");
  return <svg className="plant-pixel" viewBox="0 0 72 40" xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} shapeRendering="crispEdges" data-stage={growth} data-condition={soil} data-mood={feeling} data-outbreak={active || undefined} data-effect={effect ?? undefined} data-water-from={recoverFrom || undefined}>
    <g fill="currentColor">
      <g transform={patientTransform}>
      <g className="plant-body"><g className="plant-outbreak-posture">
        {recoverFrom && <g className="plant-water-before"><PlantBody stage={growth} condition={recoverFrom} species={species}/></g>}
        {recoverFrom === "critical" && <g className="plant-water-opening"><PlantBody stage={growth} condition="dry" species={species}/></g>}
        <g className={recoverFrom ? "plant-water-after" : undefined} transform={growth==="seed" && seedSteps===1?"rotate(-9 36 25)":growth==="seed" && seedSteps>=2?"translate(36 25) scale(1.15 1.12) translate(-36 -25)":undefined}><PlantBody stage={growth} condition={soil} lowLight={lowLight} severity={active} species={species}/></g>
        {growth==='seed' && seedSteps===3 && (species === 'monkey-tail-cactus' ? <g aria-hidden="true">
          <path fill={ink.monkeyTail["#"]} d="M34 21v-5h1v-2h3v2h1v5z"/><path fill={ink.monkeyTail[":"]} d="M35 18v-3h1v3z M37 19v-3h1v3z"/>
        </g> : <g aria-hidden="true">
          <path fill="#614e32" d="M36 16h2v2h-1v2h-2v-2h1z"/>
          <path fill="#61844b" d="M36 17v-4h2v-2h2v3h-2v3z"/>
          <path fill="#426b47" d="M38 13v-3h2V8h5v3h-2v2z"/><path fill="#abc473" d="M40 10h4v1h-4z"/>
        </g>)}
      </g></g>
      <Pot condition={soil} expression={expression} waterFrom={recoverFrom} />
      {!treating && <Feeling stage={growth} mood={feeling} hungry={hungry} lowLight={lowLight} condition={soil} reaction={effect || active} />}
      {active > 0 && <OutbreakArt severity={active}/>}
      </g>
      {showBottle && !curing && soil !== "dead" && <BottlePreview/>}
      {curing ? <GnatDose severity={severity} patientTransform={patientTransform}/> : effect && <EventArt kind={effect} />}
    </g>
  </svg>;
}
