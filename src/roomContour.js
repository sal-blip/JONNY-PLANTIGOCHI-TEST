// Build the contour on the room's output pixel grid. A small shelf sprite gets
// the same two distinct ink lines as a larger plant being carried in the hand.
const contours = new WeakMap();
const innerInk = '#ffe19a';
const outerInk = '#342e34';

function buildContour(runs, firstInk, originX, originY, size, offsetX, offsetY, weight) {
  const rectangles = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let ink = firstInk; ink < runs.length; ink++) {
    const row = runs[ink];
    if (!row) continue;
    for (let j = 0; j < row.length; j += 3) {
      const x = row[j] + offsetX, y = row[j + 1] + offsetY;
      const left = Math.round(originX + size * x), top = Math.round(originY + size * y);
      const right = Math.round(originX + size * (x + row[j + 2]));
      const bottom = Math.round(originY + size * (y + 1));
      if (right <= left || bottom <= top) continue;
      rectangles.push(left,top,right,bottom);
      minX = Math.min(minX,left); minY = Math.min(minY,top);
      maxX = Math.max(maxX,right); maxY = Math.max(maxY,bottom);
    }
  }
  if (!rectangles.length) return [[],[]];
  const thickness = weight * 2, padding = thickness + 2;
  minX -= padding; minY -= padding;
  const width = maxX - minX + padding, height = maxY - minY + padding;
  const count = width * height, layers = new Uint8Array(count);
  for (let i = 0; i < rectangles.length; i += 4) {
    const left=rectangles[i],top=rectangles[i+1],right=rectangles[i+2],bottom=rectangles[i+3];
    for (let y = top; y < bottom; y++) {
      const start = (y - minY) * width - minX;
      layers.fill(1,start + left,start + right);
    }
  }

  // Grow two rings from the physical ink. The first two plant inks are cast
  // shadows and never take part in this mask.
  const stride = [-width,1,width,-1];
  for (let depth = 1; depth <= thickness; depth++) {
    for (let i = width + 1; i < count - width - 1; i++) {
      if (layers[i] !== depth) continue;
      for (const delta of stride) if (!layers[i + delta]) layers[i + delta] = depth + 1;
    }
  }
  // Flood only from outside the expanded shape. Recede into the outer band
  // by its thickness, so enclosed leaf holes and deep narrow splits stay open.
  const exterior = new Uint8Array(count), queue = new Uint32Array(count);
  let read = 0, write = 0;
  for (let x = 0; x < width; x++) {
    queue[write++] = x; exterior[x] = 1;
    const bottom = count - width + x; queue[write++] = bottom; exterior[bottom] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    const a = y * width, b = a + width - 1;
    queue[write++] = a; exterior[a] = 1; queue[write++] = b; exterior[b] = 1;
  }
  function visit(index, enterBand) {
    if (index < 0 || index >= count || exterior[index]) return;
    if (layers[index] && (!enterBand || layers[index] === 1)) return;
    exterior[index] = 1; queue[write++] = index;
  }
  while (read < write) {
    const i = queue[read++];
    for (const delta of stride) visit(i + delta,false);
  }
  // Only unpainted ring pixels touching the exterior may start this pass.
  // Its queue tracks the remaining distance into an open notch.
  read = 0;
  for (let depth = 0; depth < thickness; depth++) {
    const end = write;
    while (read < end) {
      const i = queue[read++];
      for (const delta of stride) visit(i + delta,true);
    }
  }
  const result = [[],[]];
  function band(i) {
    if (!exterior[i] || layers[i] < 2) return -1;
    return layers[i] <= weight + 1 ? 1 : 0;
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1;) {
      const start = x, ink = band(y * width + x++);
      if (ink < 0) continue;
      while (x < width - 1 && band(y * width + x) === ink) x++;
      result[ink].push(start + minX,y + minY,x - start);
    }
  }
  return result;
}

export function drawSelectionContour(ctx, runs, {x,y,size,firstInk=1,offsetX=0,offsetY=0,rasterScale=1}) {
  let sizes = contours.get(runs);
  if (!sizes) {sizes = new Map();contours.set(runs,sizes);}
  const baseX = Math.floor(x), baseY = Math.floor(y);
  // A very large standalone drawing can magnify the contour cells just as
  // the game magnifies its own pixels when exporting a postcard.
  const zoom = Math.max(1,Math.floor(size/(2*rasterScale)));
  const scale = size/zoom, fx = (x-baseX)/zoom, fy = (y-baseY)/zoom;
  const weight = Math.max(Math.ceil(rasterScale/zoom),Math.round(scale));
  const key = [weight,scale,fx,fy,firstInk,offsetX,offsetY].join('/');
  let bands = sizes.get(key);
  if (!bands) {
    bands = buildContour(runs,firstInk,fx,fy,scale,offsetX,offsetY,weight);
    if (sizes.size >= 16) sizes.delete(sizes.keys().next().value);
    sizes.set(key,bands);
  }
  for (let tone = 0; tone < bands.length; tone++) {
    ctx.fillStyle = tone ? innerInk : outerInk;
    const rows = bands[tone];
    for (let i = 0; i < rows.length; i += 3)
      ctx.fillRect(baseX + rows[i]*zoom,baseY + rows[i+1]*zoom,rows[i+2]*zoom,zoom);
  }
}
