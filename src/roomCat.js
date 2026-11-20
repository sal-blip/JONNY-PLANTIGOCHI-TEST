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

// Perspective is slightly side-on: copper left cheek, charcoal right temple,
// a cream blaze through the nose, and separate pale whisker pads.
const head = [
  '..kk............kk',
  '..kgk..........ktdk',
  '..kgak........ktndk',
  '..kgpak..kkk.kdpntk',
  '..kapnakkgggkddpntk',
  '..kapnagggaggddpptk',
  '...kragaggragcdddtk',
  '...kraggrgagchcddtk',
  '..kaagggagachhhdddtk',
  '.kaggggggcchhhhdddtk',
  '.kggaagggcchhhhdddtk',
  '.kgggggacchhhhhhdddk',
  'kggccgacchhhhhhhccddk',
  '.kgccchhhhhchhhhccdk',
  '.kccchhchhcchhhhsck',
  '..kscchhccchhccsck',
  '....kssccssccsskk',
  '......kbssssskk',
  '.........kkk',
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
const openEyes = [
  '.kk.....kk.', 'kekk...kekk', '.bk.....bk.',
];
const drowsyEyes = ['.kk.....kk.', 'kbeb...kbeb', '..k......k.'];
const shutEyes = ['k..k...k..k', '.kk.....kk'];
const muzzle = ['..np..', '...b..', '.b.b.b', '..b.b.'];

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
  const hx = 2, hy = awake ? 1 : 3;
  stamp(hx, hy, head);
  stamp(hx + 4, hy + 9, blink ? shutEyes : awake ? openEyes : drowsyEyes);
  stamp(hx + 7, hy + 12, muzzle);
  // Offset whiskers taper into one-pixel tips against the room colors.
  for (const [dx,dy,len] of [[-1,12,3],[2,13,3],[0,15,4],[16,13,3],[19,12,2],[17,15,4]]) {
    for (let n = 0; n < len; n++) dot(hx + dx + n, hy + dy, 's');
  }
  dot(hx-2, hy+11, 'j'); dot(hx-1, hy+16, 'j');
  dot(hx+21, hy+11, 'j'); dot(hx+21, hy+16, 'j');
  const runs = Array.from({ length: letters.length + 1 }, () => []);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH;) {
      const first = x, value = pixels[y * WIDTH + x++];
      while (x < WIDTH && pixels[y * WIDTH + x] === value) x++;
      if (value) runs[value].push([first, y, x-first]);
    }
  }
  poses.set(key, runs);
  return runs;
}

export function drawRoomCat(ctx, { x, y, size = 1, night = 0, time = 0, reducedMotion = false, awake = false }) {
  const phase = reducedMotion ? 0 : Math.max(0, time);
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
  for (let color = 1; color < runs.length; color++) {
    ctx.fillStyle = shades[color];
    for (const [xx, yy, length] of runs[color]) {
      ctx.fillRect(px(xx), py(yy), px(xx+length)-px(xx), py(yy+1)-py(yy));
    }
  }
}
