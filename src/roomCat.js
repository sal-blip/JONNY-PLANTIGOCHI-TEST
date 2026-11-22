import {drawSelectionContour} from './roomContour.js';

// Calico sprite, drawn on its own native pixel grid. A period is transparent.
// Inks, warm/cool fur shadows and two ivory values keep the face legible at 1×.
const colors = {
  k: ['#493b40', '#333545'], b: ['#62474a', '#464050'],
  t: ['#655758', '#444757'], d: ['#857375', '#626173'],
  j: ['#aa9190', '#827c8a'], r: ['#995335', '#77515a'],
  a: ['#ce7842', '#9d6a68'], g: ['#ecab63', '#bb8c7d'],
  s: ['#bf9d85', '#978494'], c: ['#ead1ad', '#bdadb2'],
  h: ['#fff0ce', '#e6d9d1'], p: ['#d98d80', '#ac848d'],
  n: ['#9e645f', '#886977'], e: ['#94ac88', '#a4ae9c'],
};
const letters = Object.keys(colors);
const index = Object.fromEntries(letters.map((letter, i) => [letter, i + 1]));
const WIDTH = 48, HEIGHT = 32;

// The shoulder overlaps the chest. The back arches higher over the haunch.
const torso = [
  '..................kkkkkkk',
  '.............kkkkkccgggggkk',
  '.........kkkkddtttcggaaaaggkk',
  '......kkktddttttttccggaaraaggk',
  '....kkcdttjddttttcccggaraaaaggk',
  '..kkhhcddjjddtttcccgggaraaaaggak',
  '.khhchhctdddtttcccggggaaaaaragak',
  'khhcchhccttttccccgggggarrraraagk',
  'khchhhhhhccccchccgggaarraaarraakk',
  'kcchchhhhhhhhchhcccgaaaraaarrrak',
  'kscccchhhhhhhhhhhcccggaaaarrrrsk',
  '.ksccchhchhhhhhhhcccccgaaarrsssk',
  '..kssccchhchhhhhhcccsscccsssssk',
  '...kbsssccccchhhhcsssscccsssbk',
  '.....kbssssccccccccssssssbbkk',
  '........kbbbssssssssbbbbkk',
  '............kkkkkkkk',
];

// A front-facing kitten with a continuous cream mask between the calico ear patches.
const head = [
  '.........................',
  '.kkk.................kkk.',
  '.kgh.................kdk.',
  '.kggk...............kddk.',
  '.kgphkk..kkkkkkk..kkkpdk.',
  '.kgpgghkkkhhghhkkkkddpdk.',
  '.kgppgghhhgghhhhkkddppdk.',
  '.kgppppgggghhhhhhdppppdk.',
  '.kgpgggggghhhhhhhddddpdk.',
  '.kggghhhhhhhhhhhhhhhdddk.',
  '.kggghhhhhhhhhhhhhhhhhhk.',
  'kkgghhhhhhhhhhhhhhhhhhhkk',
  'khghhhhhhhhhhhhhhhhhhhhhk',
  'khhhhhhhhhhhhhhhhhhhhhhhk',
  'khhpphhhhhhhhhhhhhhhpphhk',
  'kkhhhhhhhhhhhhhhhhhhhhhhk',
  '.kkhhhhhhhhhhhhhhhhhhhkk.',
  '....khhccccccccccchhk....',
  '....kkkkkhhhhhhhkkkkk....',
  '........kkkkkkkkk........',
];

const chest = [
  '.....ccchhccsk',
  '...kccchhhhhhck',
  '..kchhhhhchhhck',
  '.kchhhchhhhhhck',
  '.kchhchhhchhck',
  '.kschhhhchccsk',
  'ksschccchhccsk',
  'kccssscssccck',
  'kcccsksscssk',
  '.kkk..kssck',
];

const nearPaw = [
  '....kssck', '...kcchhck', '.kkchhhccck', 'kchhhhhccsk',
  'kchschscsk', '.kkbbbbbkk',
];
const farPaw = ['...kccsk', '.kkchccck', 'kchhhccsk', 'kcsccscsk', '.kbbbbbkk'];
const openEyes = ['.kk.......kk.', 'khkk.....khkk', 'kkkk.....kkkk', '.bb.......bb.'];
const drowsyEyes = ['.............', '.kk.......kk.', 'k..k.....k..k'];
const shutEyes = ['.............', 'k..k.....k..k', '.kk.......kk.'];
const muzzle = ['..pnp..','...b...','.b.b.b.','..b.b..'];

function palette(light) {
  const amount = Math.round(Math.max(0, Math.min(1, light)) * 24) / 24;
  if (palettes.has(amount)) return palettes.get(amount);
  const shades = [null];
  for (const [day, night] of Object.values(colors)) {
    const channels = [1, 3, 5].map(i => {
      const a = parseInt(day.slice(i, i + 2), 16), b = parseInt(night.slice(i, i + 2), 16);
      return Math.round(a + (b - a) * amount);
    });
    shades.push('rgb(' + channels.join(',') + ')');
  }
  palettes.set(amount, shades);
  return shades;
}
const palettes = new Map(), poses = new Map();

function catPose(awake, blink, breath, tailLift) {
  const key = [awake, blink, breath, tailLift].join('/');
  if (poses.has(key)) return poses.get(key);
  const pixels = new Uint8Array(WIDTH * HEIGHT);
  function dot(x, y, color) { pixels[y * WIDTH + x] = index[color]; }
  function stamp(x, y, rows) {
    for (const [dy, row] of rows.entries()) {
      for (let dx = 0; dx < row.length; dx++) {
        const color = row[dx];
        if (color !== '.') dot(x + dx, y + dy, color);
      }
    }
  }
  stamp(11, 9 - breath, torso);
  stamp(5, 17, chest);
  stamp(20, 24, farPaw);
  // Trace the tail all the way from the rump through its curled, dark tip.
  const path = [[37,16],[39,16],[41,17],[42,19],[43,21],[42,23],[40,25],[37,26],[33,26],[30,25],[28,24],[27,22-tailLift],[26,21-tailLift]];
  function tailPass(radius, colorAt) {
    let previous = path[0];
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i], [px, py] = previous;
      const count = Math.max(1, Math.abs(px - x), Math.abs(py - y));
      for (let j = 1; j <= count; j++) {
        const xx = px + Math.round((x-px)*j/count), yy = py + Math.round((y-py)*j/count);
        for (let ry = -radius; ry <= radius; ry++) {
          const span = Math.abs(ry) === radius && radius > 1 ? radius-1 : radius;
          for (let rx = -span; rx <= span; rx++) dot(xx + rx, yy + ry, colorAt(i,ry));
        }
      }
      previous = path[i];
    }
  }
  tailPass(2, () => 'k');
  tailPass(1, (i, row) => {
    if (i >= 10) return row < 0 ? 'd' : 't';
    if (i === 3 || i === 7) return 'r';
    return row < 0 ? 'g' : row === 0 ? 'a' : 'r';
  });
  stamp(3, 23, farPaw);
  stamp(12, 24, nearPaw);
  const hx=2, hy=awake?2:4;
  stamp(hx,hy,head);
  stamp(hx+6,hy+9,blink?shutEyes:awake?openEyes:drowsyEyes);
  stamp(hx+9,hy+13,muzzle);
  for(const y of [13,16]){
    stamp(hx-1,hy+y,['sss']);stamp(hx+23,hy+y,['sss']);
  }
  const runs = Array.from({ length: letters.length + 1 }, () => []);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH;) {
      const first = x, value = pixels[y * WIDTH + x++];
      while (x < WIDTH && pixels[y * WIDTH + x] === value) x++;
      if (value) runs[value].push(first,y,x-first);
    }
  }
  poses.set(key, runs);
  return runs;
}

const glossyFur = new Set([index.a,index.g,index.c,index.h,index.d]);

export function drawRoomCat(ctx, { x, y, size = 1, night = 0, time = 0, reducedMotion = false, awake = false, selected = false }) {
  const phase = reducedMotion || !Number.isFinite(time) ? 0 : Math.max(0,time);
  const blink = !reducedMotion && phase % 5100 >= 4830 && phase % 5100 < 5020;
  const breath = !reducedMotion && phase % 3400 > 1150 && phase % 3400 < 2360 ? 1 : 0;
  const tailTime = phase % (awake ? 3200 : 6800);
  const tailLift = tailTime > 500 && tailTime < 1300 ? (tailTime > 690 && tailTime < 1080 ? 2 : 1) : 0;
  const runs = catPose(Boolean(awake), blink, breath, tailLift);
  const shades = palette(night);
  const px = dx => Math.round(x + (dx - 23) * size);
  const py = dy => Math.round(y + (dy - 30) * size);
  // The narrow contact shadow stays attached to the cushion even as the body rises.
  ctx.fillStyle = 'rgba(44,35,47,0.25)';
  ctx.fillRect(px(5), py(27), px(40)-px(5), py(28)-py(27));
  ctx.fillRect(px(3), py(28), px(42)-px(3), py(29)-py(28));
  ctx.fillRect(px(7), py(29), px(37)-px(7), Math.max(1,py(30)-py(29)));
  if (selected) drawSelectionContour(ctx,runs,{x,y,size,offsetX:-23,offsetY:-30});
  const glint = reducedMotion ? 24 : phase%4800*.031-13;
  for (let color = 1; color < runs.length; color++) {
    ctx.fillStyle = shades[color];
    const row = runs[color];
    const sheen = selected && glossyFur.has(color);
    for (let i=0; i<row.length; i+=3) {
      const xx=row[i], yy=row[i+1], end=xx+row[i+2];
      const top=py(yy), h=py(yy+1)-top;
      ctx.fillRect(px(xx),top,px(end)-px(xx),h);
      if (sheen) {
        const start=Math.floor(glint-yy*.39);
        const from=px(Math.max(xx,start)), through=px(Math.min(end,start+3));
        if (through>from) {
          ctx.fillStyle='rgba(255,238,181,.30)';
          ctx.fillRect(from,top,through-from,h);
          ctx.fillStyle=shades[color];
        }
      }
    }
  }
}
