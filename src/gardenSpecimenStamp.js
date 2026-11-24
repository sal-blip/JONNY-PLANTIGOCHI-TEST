import {drawPotMaster} from './shopSprites/potPortraits.js';

// Sample a small, already-composited specimen at 3× its native sprite grid.
// Only tangible ink is allocated. Keep a bounded cache across poses and lighting.
const density = 3;
const pixelBudget = 3 * 1024 * 1024;
const stamps = new Map();
let cachedPixels = 0;

function makeStamp(runs, ink, pot, master, night) {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const row of runs) {
    if (!row) continue;
    for (let j=0; j<row.length; j+=3) {
      left = Math.min(left, row[j]);
      right = Math.max(right, row[j]+row[j+2]);
      top = Math.min(top, row[j+1]);
      bottom = Math.max(bottom, row[j+1]+1);
    }
  }
  if (right <= left) return;
  const canvas = document.createElement('canvas');
  canvas.width = (right-left)*density;
  canvas.height = (bottom-top)*density;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(density,0,0,density,-left*density,-top*density);
  const visibleGlaze = master && new Path2D();
  for (let i=1; i<runs.length; i++) {
    const row = runs[i];
    if (!row) continue;
    ctx.fillStyle = ink[i];
    const glaze = visibleGlaze && i >= pot.first && i < pot.end;
    for (let j=0; j<row.length; j+=3) {
      ctx.fillRect(row[j],row[j+1],row[j+2],1);
      if (glaze) visibleGlaze.rect(row[j],row[j+1],row[j+2],1);
    }
  }
  if (master) {
    // Only the visible ceramic receives the larger original. Stalks, overhanging
    // leaves, soil contact, and the shadow keep their existing layer order.
    ctx.clip(visibleGlaze);
    ctx.imageSmoothingEnabled = false;
    drawPotMaster(ctx, master, 0,0,1);
    if (night) {
      ctx.fillStyle = 'rgba(16,26,55,' + night*.39 + ')';
      ctx.fillRect(left,top,right-left,bottom-top);
    }
  }
  return {canvas,left,top};
}

export function drawGardenStamp(ctx, key, runs, ink, x,y,size, pot, master, night) {
  if (typeof document === 'undefined' || typeof ctx.drawImage !== 'function') return false;
  let stamp = stamps.get(key);
  if (!stamp) {
    stamp = makeStamp(runs, ink, pot, master, night);
    if (!stamp) return false;
    const pixels = stamp.canvas.width * stamp.canvas.height;
    while (stamps.size && cachedPixels + pixels > pixelBudget) {
      const oldest = stamps.keys().next().value;
      const {canvas} = stamps.get(oldest);
      stamps.delete(oldest);
      cachedPixels -= canvas.width * canvas.height;
    }
    cachedPixels += pixels;
  } else {
    stamps.delete(key);
  }
  stamps.set(key, stamp);
  const {canvas,left,top} = stamp;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x+left*size,y+top*size,canvas.width*size/density,canvas.height*size/density);
  ctx.restore();
  return true;
}
