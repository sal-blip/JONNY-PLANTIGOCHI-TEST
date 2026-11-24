// Crop rectangles from the approved SpriteCook sheets, followed by the
// footprint on the room sprite's native grid, anchored at bottom center.
const regular = new URL('../../docs/art-review/regular-pots-01/masters.png', import.meta.url).href;
const wild = new URL('../../docs/art-review/wild-pots-01/masters.png', import.meta.url).href;
const portraits = {
  'honey-glazed-terracotta': [regular, 0,80,64,64, 42,42],
  'blue-willow-porcelain': [regular, 74,82,69,62, 46,42],
  'low-sandstone-bowl': [regular, 151,95,73,48, 54,27],
  'stump-cottage-pot': [wild, 4,36,82,77, 50,47],
  'rain-boot-pot': [wild, 91,29,64,84, 36,47],
  'ringed-planet-pot': [wild, 158,47,78,63, 52,42],
};
const sheets = new Map();

export function potMaster(sku) {
  const portrait = portraits[sku];
  if (!portrait || typeof Image === 'undefined') return;
  const [url] = portrait;
  let image = sheets.get(url);
  if (!image) {
    image = new Image();
    image.addEventListener('load', () => window.dispatchEvent(new Event('pot-art-ready')), {once:true});
    image.src = url;
    sheets.set(url, image);
  }
  return {image, portrait};
}

export function drawPotMaster(ctx, master, x, y, size) {
  const [,sx,sy,sw,sh,width,height] = master.portrait;
  ctx.drawImage(master.image, sx,sy,sw,sh, x-size*width/2,y-size*height, size*width,size*height);
}

export function paintPotPortrait(ctx, sku, x, y, size) {
  const master = potMaster(sku);
  if (!master) return;
  function paint() {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.imageSmoothingEnabled = false;
    drawPotMaster(ctx, master, x,y,size/2);
  }
  if (master.image.complete && master.image.naturalWidth) {
    paint();
    return;
  }
  master.image.addEventListener('load', paint, {once:true});
  return () => master.image.removeEventListener('load', paint);
}
