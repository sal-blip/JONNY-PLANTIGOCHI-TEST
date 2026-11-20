import React from "react";
import "./ActivityArt.css";

const laneCenters = [20, 48, 76];

function safeProgress(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function laneX(value) {
  return laneCenters[value] ?? laneCenters[1];
}

function Canvas({ children, square = false, viewBox = square ? "0 0 36 36" : "0 0 96 44" }) {
  return (
    <svg className={square ? "activity-pixel activity-pixel-square" : "activity-pixel"}
      viewBox={viewBox}
      aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {children}
    </svg>
  );
}

// Games and the specimen book share this blade and its transparent splits.
function Blade({ split = false }) {
  const outline = split
    ? "M3 1h4v1h2v2h1V3h1V1h5v1h2v2h1v3h-3v1h-2v1h4v2h-2v2h-3v2h-2v2H9v-1H7v-2H5v-1H4v-2H2V9h3V8H3V7H1V4h1V2h1z"
    : "M3 1h4v1h2v2h1V3h1V1h5v1h2v2h1v5h-1v2h-2v2h-2v2h-2v2H9v-1H7v-2H5v-2H3v-2H2V8H1V4h1V2h1z";
  return (
    <g>
      <path d={outline} fill="#75b66a" />
      <path fill="none" stroke="#245d43" d={outline} />
      <path fill="#316e4a" d="M9 4h1v4h1v5h1v2h-1v-1h-1V9H9z M5 4h1v1h1v1h1v1H7V6H6V5H5z M13 5h2v1h-1v1h-1v1h-1V6h1z" />
      <path fill="#bcd780" d="M3 4h1v3H3z M15 3h2v1h-2z M6 10h1v2H6z" />
    </g>
  );
}

function Heart() {
  return <path fill="#b03e65" d="M1 0h2v1h1V0h2v1h1v3H6v1H5v1H4v1H3V6H2V5H1V4H0V1h1z" />;
}

function Glint({ x, y }) {
  return <path fill="#b5701b" transform={`translate(${x} ${y})`} d="M2 0h1v2h2v1H3v2H2V3H0V2h2z" />;
}

function Droplet({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0h2v2h1v2h1v3H3v1H2v1h-3V8h-1V7h-1V4h1V3h1V1h1z" fill="#63c4e6" />
      <path d="M0 0h2v2h1v2h1v3H3v1H2v1h-3V8h-1V7h-1V4h1V3h1V1h1z" fill="none" stroke="#215b85" />
      <path d="M-1 4h1v3h-1z M2 6h1v1H2z" fill="#e6ffff" />
    </g>
  );
}

function Catcher({ x, happy }) {
  return (
    <g transform={`translate(${x - 10} 29)`}>
      <path fill="#dc9669" d="M0 4h21v2h-1v3h-2v2H4V9H2V6H0z" />
      <path fill="none" stroke="#683e35" d="M0 4h21v2h-1v3h-2v2H4V9H2V6H0z" />
      <path fill="#327850" d="M1 5h19v1H1z M1 3V1h3v1h3v1h2v1H5V3z M12 4V3h2V2h2V1h4v2h-4v1z" />
      <path fill="#45312e" d={happy ? "M5 8h1V7h2v1H7v1H5z M13 8h1V7h2v1h-1v1h-2z M9 9h3v1H9z" : "M5 7h2v2H5z M14 7h2v2h-2z M9 9h3v1H9z"} />
    </g>
  );
}

export function DewArt({ lane = 1, drops, dropLane = 1, progress = 0, result = null }) {
  const catcherX = laneX(lane);
  const dropletX = laneX(dropLane);
  // An explicit empty frame can occur between waves; render just the catcher.
  const falling = Array.isArray(drops) ? drops : result ? [] : [{ id: "solo", lane: dropLane, progress }];
  const landed = result === "catch" || result === "win";
  return (
    <Canvas>
      <g opacity=".22">
        <path d="M5 4h18v1H5z M39 4h18v1H39z M73 4h18v1H73z M6 41h84v1H6z" />
        <path d="M34 8h1v2h-1z M34 14h1v2h-1z M34 20h1v2h-1z M34 26h1v2h-1z M62 8h1v2h-1z M62 14h1v2h-1z M62 20h1v2h-1z M62 26h1v2h-1z" />
      </g>
      <g opacity=".65">
        {laneCenters.map(x => <path key={x} transform={`translate(${x} 2)`} d="M-4 0h3v1h2V0h3v1H2v1H1v1h-2V2h-1V1h-2z" />)}
      </g>
      {falling.map(drop => <Droplet key={drop.id} x={laneX(drop.lane)} y={6 + Math.round(safeProgress(drop.progress) * 19)} />)}
      {landed && <g fill="#217dab" className="activity-dew-splash" transform={`translate(${catcherX} 30)`}>
        <path d="M-11-3h2v1h2v2h-2v-1h-2z M9-4h2v2H9v1H7v-2h2z M-14-5h2v2h-2z M13-6h2v2h-2z" />
      </g>}
      {landed && <g className="activity-pixel-flash"><Glint x={catcherX - 12} y={22} /><Glint x={catcherX + 8} y={19} /><path opacity=".66" d={`M${catcherX-2} 25h1v2h-1z M${catcherX+2} 22h1v2h-1z`} /></g>}
      {result === "miss" && <g transform={`translate(${dropletX} 38)`}><path d="M-9-4h1v1h1v1h-2z M-4-2h2v1h-2z M3-1h2v1H3z M7-3h1v-1h1v2H7z M-5 1H5v1H-5z" /></g>}
      <g className={result === 'win' ? 'activity-shake' : undefined}><Catcher x={catcherX} happy={landed} /></g>
      {result === 'win' && <g className="activity-shower" opacity=".8"><Droplet x={catcherX-7} y={21}/><Droplet x={catcherX+2} y={17}/><Droplet x={catcherX+8} y={23}/></g>}
      {result === "win" && <g transform="translate(45 10)"><Heart /></g>}
    </Canvas>
  );
}

function EchoNote({ x, y, opposite = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${opposite ? -1 : 1} 1)`}>
      <path fill="#7a4297" d="M5 0h2v1h2v2H7V2H6v6H5v1H2V8H1V6h1V5h3z" />
    </g>
  );
}

export function EchoArt({ beat = null }) {
  const left = beat === "left";
  const right = beat === "right";
  const loved = beat === "heart";
  const tilt = left ? -3 : right ? 3 : 0;
  return (
    <Canvas>
      <path opacity=".18" d="M16 38h9v1h-9z M30 37h6v1h-6z M38 38h20v1H38z M63 36h8v1h-8z M75 38h6v1h-6z" />
      <g transform={`translate(${tilt} 0)`}>
        <path fill="#316c4d" d="M46 18h2v8h2v2h-3v-3h-1z M47 24h-3v-2h-3v-2h-2v-2h2v1h2v2h3v2h1z M49 22h2v-2h2v-2h2v-1h2v2h-2v2h-2v2h-4z" />
        <g transform="translate(38 5)"><Blade split /></g>
        <path fill="#223e38" d={loved ? "M43 13h1v-1h2v1h-1v1h-2z M50 13h1v-1h2v1h-1v1h-2z M46 15h4v1h-1v1h-2v-1h-1z" : "M44 12h2v2h-2z M50 12h2v2h-2z M46 15h1v1h2v-1h1v2h-4z"} />
        <path fill="#469465" d="M39 19h-5v-1h-2v-2h-2v-3h3v1h3v1h2v2h1z M55 18v-2h1v-2h3v-1h4v2h-1v2h-3v1z" />
      </g>
      <path fill="#df9c73" d="M37 26h22v3h-2v5h-2v2H41v-2h-2v-5h-2z" />
      <path fill="none" stroke="#683e35" d="M37 26h22v3h-2v5h-2v2H41v-2h-2v-5h-2z" />
      <path fill="#8e503f" d="M38 29h20v1H38z M42 32h1v2h-1z M53 32h2v1h-2z" opacity=".62" />
      {(left || right) && <g className="activity-pixel-flash"><EchoNote x={left ? 17 : 79} y={11} opposite={right} /><path opacity=".57" d={left ? "M28 9h1v3h-1z M25 7h1v2h-1z M26 23h2v1h-2z" : "M67 9h1v3h-1z M70 7h1v2h-1z M68 23h2v1h-2z"} /></g>}
      {loved && <g className="activity-pixel-flash"><g transform="translate(66 6)"><Heart /></g><g transform="translate(28 12) scale(.7)"><Heart /></g></g>}
    </Canvas>
  );
}

export function JarArt({ progress = 0 }) {
  const amount = safeProgress(progress);
  // Roots lengthen from the submerged cut ends. Path dashes reveal integer-pixel steps.
  const rootDraw = Math.round(4 + amount * 36);
  return (
    <Canvas>
      <path opacity=".2" d="M30 41h36v1H30z M25 40h3v1h-3z M68 40h4v1h-4z" />
      <path fill="#80cfde" d="M32 25h4v1h5v-1h6v1h6v-1h7v1h3v10h-2v2H35v-2h-3z" />
      <g fill="#34774e">
        <path d="M43 7h2v4h1v4h2v7h1v6h-2v-6h-1v-6h-2v-4h-1z M46 16h3v-2h2v-2h1v-2h2v3h-1v2h-2v2h-3v2h-2z" />
        <g transform="translate(31 2) scale(.78)"><Blade /></g>
        <path d="M52 10V8h2V6h2V5h6v1h-1v3h-2v2h-3v1h-3v-1h3V9h2V8h-2v1h-2v1z" />
      </g>
      <path fill="#306981" d="M34 18h27v2H34z M35 21h1v2h-1v1h-2v12h1v2h2v1h24v-1h2v-2h1V24h-2v-1h-1v-2h1v1h2v2h1v13h-1v2h-3v1H35v-1h-2v-2h-1V24h1v-2h2z" />
      <path fill="#3d94b0" d="M33 26h4v1h5v-1h5v1h6v-1h6v1h4v1h-5v-1h-5v1h-7v-1h-4v1h-6v-1h-3z" />
      <g fill="none" stroke="#855333" strokeWidth="1.1" strokeDasharray={`${rootDraw} 80`}>
        <path d="M48 26v3h-2v2h-2v1h-2v3h-2v1h-2" />
        <path d="M48 27v3h2v2h2v2h2v2h3" strokeDasharray={`${Math.max(0, rootDraw-6)} 80`} />
        <path d="M45 31v2h1v3h-1v1 M52 32h3v-1h2" opacity=".61" strokeDasharray={`${Math.max(0, rootDraw-15)} 80`} />
      </g>
      <path fill="#ecffff" d="M36 29h1v5h-1z M36 35h1v1h-1z M59 34h1v2h-1z M58 36h1v1h-1z" />
      {amount >= 1 && <g className="activity-pixel-flash"><Glint x={66} y={10} /><Glint x={26} y={21} /></g>}
    </Canvas>
  );
}

export function PressedLeaf({ stage = "seed" }) {
  const grown = stage === "grown";
  const young = stage === "young" || stage === "split";
  return (
    <Canvas square>
      <path opacity=".18" d="M3 4h5v1H4v4H3z M28 31h4v-4h1v5h-5z" />
      {stage === "seed" && <g color="#794a31" fill="currentColor" transform="translate(8 9)">
        <path opacity=".24" d="M15 0h4v6h-1v5h-2v4h-2v2h-3v2H5v-1H3v-2H1v-3H0V9h2V6h3V4h4V3h3V2h3z" />
        <path fill="none" stroke="currentColor" d="M15 0h4v6h-1v5h-2v4h-2v2h-3v2H5v-1H3v-2H1v-3H0V9h2V6h3V4h4V3h3V2h3z" />
        <path opacity=".68" d="M4 14h2v-2h2v-2h2V8h2V6h2V4h1v3h-2v2h-2v2H9v2H7v2H4z" />
      </g>}
      {stage === "sprout" && <g color="#326846" fill="currentColor">
        <path d="M18 16h2v5h-1v4h-1v4h-2v-5h1v-4h1z" />
        <path fill="#80b563" d="M5 11h6v1h3v2h2v2h2v3h-5v-1h-3v-2H7v-2H5z M19 16v-3h2v-3h3V8h4V7h3v4h-1v2h-2v2h-3v2h-6z" />
        <path fill="none" stroke="currentColor" d="M5 11h6v1h3v2h2v2h2v3h-5v-1h-3v-2H7v-2H5z M19 16v-3h2v-3h3V8h4V7h3v4h-1v2h-2v2h-3v2h-6z" />
      </g>}
      {(young || grown) && <g>
        <g transform={grown ? "translate(6 5) scale(1.2)" : "translate(7 7) scale(1.1)"}><Blade split={grown || stage === "split"} /></g>
        <path d={grown ? "M18 24h2v3h-2v2h-2v2h-3v-1h2v-2h2v-2h1z" : "M18 24h2v3h-1v2h-2v1h-2v-1h1v-2h2z"} />
      </g>}
    </Canvas>
  );
}

const menuSprites = {
  care: [
    ".............####",
    "............#:::+#",
    ".........####...#+#",
    "........##++###..+#",
    ".......#+:::::#####",
    ".###...#:----:+##",
    "#::##..#:-----:+#",
    ".#:-:###:--++-:+#",
    "..##:--#:-++++:+#",
    "....##---:++++:+#",
    "......##--:++::+#",
    ".......#:::::++#",
    ".#..#...#######",
    "#..#",
  ],
  play: [
    "......###....###",
    "....################",
    "...#::------------:+#",
    "..#::--------------:+#",
    ".#:---##-------##---:#",
    ".#---####----------:+#",
    "#-----##----##-----:+#",
    "#---------------::-:+#",
    "#:::---########+::::+#",
    ".#+:::#........#::++#",
    "..####..........####",
  ],
  growth: [
    ".............####",
    "...........##---#",
    "..........#:--:+#",
    "..#####..#:--:+#",
    "..#::--##:-:+##",
    "...#:---#:###..#",
    "....##+::##...###",
    "......##:#.....#",
    "........##",
    ".........#",
    "....###########",
    "....#:::--:-:+#",
    ".....#########",
    "......#:---+#",
    "......######",
  ],
  jar: [
    "......###...####",
    "......#:##.#::+#",
    ".......#:+#--+#",
    "........##:+##",
    "..........##",
    ".....##########",
    ".....#-::##-::#",
    ".....###::--###",
    "....#----#----:#",
    "....#-::#--::--#",
    "....#++:-:++-:+#",
    "....#--#::-----#",
    "....#-#--#--:-:#",
    "....#:---+#..:+#",
    ".....#++++++++#",
    "......########",
  ],
  book: [
    "..#####.....#####",
    ".#::---##.##---::#",
    "#:-------#-------:#",
    "#--++++--#--+++--:#",
    "#------:-#-------:#",
    "#-+++----#-++-++-:#",
    "#------:-#-------:#",
    "#-++++---#--+++--:#",
    "#--------#-------:#",
    "#--####--#--####-:#",
    "###++++##+##++++###",
    "...+++++##+++++",
  ],
  guide: [
    "...############",
    "..#::--------:+#",
    ".#::---####---:+#",
    ".#:---#---:#---+#",
    ".#----#---:#---+#",
    ".#-------:#----+#",
    ".#------##-----+#",
    ".#------#------+#",
    ".#-------------+#",
    ".#------#------+#",
    "..#::-------::+#",
    "...###--######",
    "....#-##",
    "....##",
  ],
  return: [
    "......##",
    ".....#+#",
    "....#--#.....###",
    "...#---#.....#:#",
    "..#----#######:#",
    ".#-------------#",
    "..#----::::::::#",
    "...#---########",
    "....#--#",
    ".....#+#",
    "......##",
  ],
  home: [
    "........##",
    ".......#::#",
    "......#:--:#",
    ".....#:----:#",
    "....#:------:#",
    "...#:--------:#",
    "..#:----------:#",
    ".###:----+---:###",
    "...#:---++---:#",
    "...#:---:+---:#",
    "...#:---+:-:-:#",
    "...#:--------:#",
    "...############",
  ],
};

// Each row encodes square LCD dots. Grouping equal densities keeps an entire
// icon to four paths regardless of the number of inked pixels.
function drawMenuSprite(rows) {
  const paths = { "#": "", "+": "", ":": "", "-": "" };
  const firstPixel = Math.min(...rows.map(row => row.search(/[#+:\-]/)));
  const lastPixel = Math.max(...rows.map(row => row.replace(/\.+$/, "").length - 1));
  const spriteWidth = lastPixel - firstPixel + 1;
  const left = Math.floor((24 - spriteWidth) / 2) - firstPixel;
  const top = Math.floor((22 - rows.length) / 2);
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/([#+:\-])\1*/g)) {
      const width = run[0].length;
      paths[run[1]] += `M${left + run.index} ${top + y}h${width}v1h-${width}z`;
    }
  });
  return paths;
}

const menuInk = { "#": 1, "+": .68, ":": .4, "-": .16 };
const menuDrawings = Object.fromEntries(
  Object.entries(menuSprites).map(([kind, rows]) => [kind, drawMenuSprite(rows)])
);

export function MenuGlyph({ kind }) {
  const drawing = menuDrawings[kind];
  if (!drawing) return null;
  return (
    <Canvas square viewBox="0 0 24 22">
      {Object.entries(drawing).map(([shade, path]) => <path key={shade} d={path} opacity={menuInk[shade]} />)}
    </Canvas>
  );
}
