// Keep the original bitmap and the game's mounted dimensions independent.
// Each cached stamp contains one pose and one lighting step.
const pixelBudget = 3 * 1024 * 1024;
const stamps = new Map();
let cachedPixels = 0;

function paintCrown(ctx,image,crown){
  const {x,y,width,height,shifts,holes}=crown;
  ctx.save();
  const density=ctx.getTransform().a;
  ctx.imageSmoothingEnabled=width*density<image.width || height*density<image.height;
  const visible=new Path2D();
  visible.rect(x-3,y-1,width+6,height+2);
  for(const [col,row] of holes)visible.rect(col,row,1,1);
  ctx.clip(visible,'evenodd');
  // Each band uses the same full source, so sampling at a sway boundary keeps
  // its neighbours. The integer band clips meet exactly on the stamp grid.
  for(let first=0;first<height;){
    let end=first+1;
    while(end<height && shifts[end]===shifts[first])end++;
    ctx.save();
    ctx.beginPath();ctx.rect(x-3,y+first,width+6,end-first);ctx.clip();
    ctx.drawImage(image,x+shifts[first],y,width,height);
    ctx.restore();
    first=end;
  }
  ctx.restore();
}

function makeStamp(runs,ink,pot,master,foliage){
  const crown=runs.crown;
  let left=crown?crown.x-2:Infinity,right=crown?crown.x+crown.width+2:-Infinity;
  let top=crown?crown.y:Infinity,bottom=crown?crown.y+crown.height:-Infinity;
  for(const row of runs){
    if(!row)continue;
    for(let j=0;j<row.length;j+=3){
      left=Math.min(left,row[j]);right=Math.max(right,row[j]+row[j+2]);
      top=Math.min(top,row[j+1]);bottom=Math.max(bottom,row[j+1]+1);
    }
  }
  if(right<=left)return;
  const density=Math.max(3,crown?Math.ceil(Math.max(foliage.width/crown.width,foliage.height/crown.height)):1);
  const canvas=document.createElement('canvas');
  canvas.width=(right-left)*density;canvas.height=(bottom-top)*density;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.setTransform(density,0,0,density,-left*density,-top*density);
  paintSpecimen(ctx,runs,ink,pot,master,foliage,density);
  return {canvas,left,top,density};
}

function paintSpecimen(ctx,runs,ink,pot,master,foliage,density){
  const crown=runs.crown;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  function paintRuns(i){
    const row=runs[i];
    if(!row)return;
    ctx.fillStyle=ink[i];
    for(let j=0;j<row.length;j+=3)ctx.fillRect(row[j],row[j+1],row[j+2],1);
  }
  // Contact shadows belong behind the native contour, including a curved foot.
  paintRuns(1);paintRuns(2);
  if(master){
    const art=pot.art;
    const width=Math.max(...art.spriteRows.map(row=>row.length)),height=art.spriteRows.length;
    ctx.imageSmoothingEnabled=width*density<master.width || height*density<master.height;
    ctx.drawImage(master,art.spriteOffset.x,art.spriteOffset.y,width,height);
  }
  // The grid has already removed the portions of stalk behind the rim.
  for(let i=3;i<runs.length;i++){
    if(!master || i<pot.first || i>=pot.end)paintRuns(i);
  }
  if(crown)paintCrown(ctx,foliage,crown);
}

export function drawGardenStamp(ctx, key, runs, ink, x,y,size, pot, master, foliage, preview) {
  if (typeof document === 'undefined' || typeof ctx.drawImage !== 'function') return false;
  // A magnified iSEED portrait can address more pixels than the room stamp.
  // Sample the mounted originals straight into its final backing canvas.
  if(preview && size>3 && (master || foliage)){
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(size,size);
    paintSpecimen(ctx,runs,ink,pot,master,foliage,ctx.getTransform().a);
    ctx.restore();
    return true;
  }
  let stamp = stamps.get(key);
  if (!stamp) {
    stamp = makeStamp(runs, ink, pot, master, foliage);
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
  const {canvas,left,top,density} = stamp;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x+left*size,y+top*size,canvas.width*size/density,canvas.height*size/density);
  ctx.restore();
  return true;
}
