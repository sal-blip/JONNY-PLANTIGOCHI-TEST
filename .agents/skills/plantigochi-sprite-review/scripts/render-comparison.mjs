import {access, mkdir, realpath, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const help = `Render two Plantigochi source trees using their own shop and room renderers.

  node render-comparison.mjs --before DIR --after DIR --out NEW_DIR [options]

DIR can be a checkout or its src directory. NEW_DIR must be outside the two
source trees, with an existing parent. Each side produces shop.png (72×64),
room.png (native room), and shelf.png (a native crop at the selected mount).
comparison.png is a two-column board sized for a 390px-wide phone.

  --sku SKU            Catalog SKU (default golden-pothos)
  --room INDEX         Room index (default 0)
  --slot INDEX         Index in placesFor or decorPlaces (default 0)
  --kind KIND          plant, pot or decor; overrides catalog detection
  --shop X,Y,SCALE     Override both shop anchors, in 72×64 tile coordinates
  --verify-before DIR  Compare before's native shop.png and room.png with DIR
  --verify-after DIR   Compare after's native shop.png and room.png with DIR
  --canvas MODULE      Canvas package name or path (default @napi-rs/canvas)
  --help               Show this help`;

// Historical checkouts kept the optical centers inside GardenShop.jsx.
// These eight placements are the released v48 values. New checkouts export
// their own previewLayout. Lightweight art-only snapshots may lack a catalog.
const releasedShop = {
  terra: ['pot',33,50,1.85], wave: ['pot',33,49,1.85],
  oak: ['decor',36,55,1.75], lacquer: ['decor',35,51,1.75],
  neko: ['decor',32,57,1.65], record: ['decor',36,54,1.55],
  'golden-pothos': ['plant',32,54,1.15], 'snake-plant': ['plant',36,57,1],
};

async function exists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function sourceTree(input) {
  const root = await realpath(input);
  const src = await exists(path.join(root,'src/roomArt.js')) ? path.join(root,'src') : root;
  if (!await exists(path.join(src,'roomArt.js'))) throw Error('Missing roomArt.js in '+input);
  return {root,src:await realpath(src)};
}

const importFrom = (src,name) => import(pathToFileURL(path.join(src,name)).href);

function integer(value,label) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw Error(label+' must be a nonnegative integer');
  return Number(value);
}

function shopAnchor(values) {
  if (!Array.isArray(values) || values.length !== 3 || !values.every(Number.isFinite) || values[2] <= 0)
    throw Error('Provide a shop anchor with --shop X,Y,SCALE (positive scale)');
  return values;
}

async function render(src, options, graphics) {
  const {sku,slot,roomIndex} = options;
  const [art,shop,layout] = await Promise.all([
    importFrom(src,'roomArt.js'), importFrom(src,'roomShopArt.js'), importFrom(src,'gardenLayout.js'),
  ]);
  const catalog = await exists(path.join(src,'gardenEconomy.js')) ? (await importFrom(src,'gardenEconomy.js')).catalog : {};
  const product = Object.hasOwn(catalog,sku) ? catalog[sku] : null;
  const released = Object.hasOwn(releasedShop,sku) ? releasedShop[sku] : null;
  const kind = options.kind ?? (product?.kind === 'frame' ? 'decor' : product?.kind) ?? released?.[0];
  if (!['plant','pot','decor'].includes(kind)) throw Error('Unknown mount kind for '+sku+' in '+src+'; use --kind');

  let anchor = options.shop;
  if (!anchor && await exists(path.join(src,'shopPreviewLayout.js'))) {
    const {previewLayout} = await importFrom(src,'shopPreviewLayout.js');
    if (Object.hasOwn(previewLayout,sku)) anchor = previewLayout[sku];
    else throw Error('SKU '+sku+' is missing from '+src+'/shopPreviewLayout.js; use --shop');
  }
  const [x,y,size] = shopAnchor(anchor ?? released?.slice(1));
  const tile = graphics.createCanvas(72,64);
  const ctx = tile.getContext('2d');
  shop.drawShopPreview(ctx,{sku,x,y,size});
  if (!ctx.getImageData(0,0,72,64).data.some((byte,i)=>i%4===3 && byte!==0))
    throw Error('Shop renderer returned an empty tile for '+sku+' in '+src);

  const room = graphics.createCanvas(art.ROOM_WIDTH,art.ROOM_HEIGHT);
  const isDecor = kind === 'decor';
  const spots = isDecor ? shop.decorPlaces(roomIndex) : art.placesFor(roomIndex);
  const spot = spots[slot];
  if (!spot) throw Error('Room '+roomIndex+' has no '+kind+' mount at index '+slot+' in '+src);
  const address = isDecor ? spot.slot : layout.slotFor(roomIndex,spot);
  const scene = {roomIndex,hour:12,time:0,reducedMotion:true,plants:[],shopItems:[]};
  if (kind === 'plant') {
    scene.plants[slot] = {id:'nursery-'+sku,species:sku,source:'shop',potStyle:0,slot:address};
  } else {
    scene.shopItems.push({id:'shop-'+sku,sku,slot:address});
  }
  art.drawRoom(room,scene);
  return {shop:tile,room,name:product?.name,sku,spot:spot.name,anchor:[x,y,size],
    baseX:isDecor?spot.baseX:spot.x*room.width, baseY:isDecor?spot.baseY:spot.y*room.height};
}

function cropAt(graphics,room,baseX,baseY,width,height,up) {
  const left = Math.max(0,Math.min(room.width-width,Math.round(baseX-width/2)));
  const top = Math.max(0,Math.min(room.height-height,Math.round(baseY-up)));
  const canvas = graphics.createCanvas(width,height);
  canvas.getContext('2d').drawImage(room,left,top,width,height,0,0,width,height);
  return canvas;
}

function comparisonBoard(graphics,sides) {
  const board = graphics.createCanvas(780,804), ctx = board.getContext('2d');
  ctx.scale(2,2); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#f5f2e9'; ctx.fillRect(0,0,390,402);
  function label(text,x,y,font,color='#263e31',maxWidth=358) {
    ctx.font = font; ctx.fillStyle = color; ctx.fillText(text,x,y,maxWidth);
  }
  const sku=sides[1].sku;
  const title=sides[1].name ?? sides[0].name ?? (sku.charAt(0).toUpperCase()+sku.slice(1).replaceAll('-',' '));
  label(title,16,39,'bold 28px sans-serif');
  label('Shop tile · 2×',16,68,'15px sans-serif');
  // Both crops share the baseline window even when the candidate moves its art.
  const {baseX,baseY} = sides[0];
  sides.forEach((side,i)=>{
    const x=16+i*183;
    label(i?'After':'Before',x,100,'bold 16px sans-serif');
    ctx.fillStyle='#e7e5d7';ctx.fillRect(x,109,175,148);
    ctx.drawImage(side.shop,x+15,119,144,128);
    const crop=cropAt(graphics,side.room,baseX,baseY,175,86,69);
    ctx.drawImage(crop,x,307);
  });
  label(sides[0].spot+' · phone scale',16,289,'bold 16px sans-serif');
  return board;
}

function pixelDiff(actual,expected,createCanvas) {
  if (actual.width!==expected.width || actual.height!==expected.height)
    return 'sizes '+actual.width+'×'+actual.height+' vs '+expected.width+'×'+expected.height;
  const {width,height}=actual;
  const canvas=createCanvas(width,height), ctx=canvas.getContext('2d');
  ctx.drawImage(expected,0,0);
  const a=actual.getContext('2d').getImageData(0,0,width,height).data,b=ctx.getImageData(0,0,width,height).data;
  let count=0,first;
  for (let i=0;i<a.length;i+=4) {
    if (a[i]===b[i] && a[i+1]===b[i+1] && a[i+2]===b[i+2] && a[i+3]===b[i+3]) continue;
    if (!count) first=[(i/4)%width,Math.floor(i/4/width)];
    count++;
  }
  return count ? count+' different pixels, first at ('+first.join(', ')+')' : null;
}

async function main() {
  const {values}=parseArgs({options:Object.fromEntries([
    ...['before','after','out','sku','room','slot','kind','shop','verify-before','verify-after','canvas'].map(name=>[name,{type:'string'}]),
    ['help',{type:'boolean',short:'h'}],
  ])});
  if (values.help) { console.log(help); return; }
  if (!values.before || !values.after || !values.out) throw Error(help);
  const options={sku:values.sku ?? 'golden-pothos',roomIndex:integer(values.room ?? '0','--room'),
    slot:integer(values.slot ?? '0','--slot'),kind:values.kind};
  if (values.shop) {
    const fields=values.shop.split(',');
    if (fields.some(field=>!field.trim())) throw Error('Empty coordinate in --shop');
    options.shop=shopAnchor(fields.map(Number));
  }
  const inputs=await Promise.all([sourceTree(values.before),sourceTree(values.after)]);
  const out=path.join(await realpath(path.dirname(path.resolve(values.out))),path.basename(path.resolve(values.out)));
  for (const tree of inputs) {
    for (const dir of [tree.root,tree.src]) {
      if (out===dir || out.startsWith(dir+path.sep)) throw Error('Choose --out outside the source trees');
    }
  }
  for (const ref of [values['verify-before'],values['verify-after']].filter(Boolean)) {
    const dir=await realpath(ref);
    if (out===dir || out.startsWith(dir+path.sep)) throw Error('Choose --out outside frozen reference directories');
  }
  if (await exists(out)) throw Error('Choose a new --out directory; already exists: '+out);

  const require=createRequire(import.meta.url);
  let moduleName=values.canvas ?? '@napi-rs/canvas';
  if (moduleName.startsWith('.') || path.isAbsolute(moduleName)) moduleName=path.resolve(moduleName);
  let graphics;
  try { graphics=require(moduleName); }
  catch(error) { throw Error('Could not load '+moduleName+'; install the comparison tool dependencies or pass --canvas. '+error.message); }
  if (typeof graphics.createCanvas!=='function' || typeof graphics.loadImage!=='function')
    throw Error('The canvas module must export createCanvas and loadImage');
  globalThis.OffscreenCanvas=class { constructor(width,height){return graphics.createCanvas(width,height);} };
  const sides=await Promise.all(inputs.map(tree=>render(tree.src,options,graphics)));
  if (sides[0].room.width!==sides[1].room.width || sides[0].room.height!==sides[1].room.height)
    throw Error('Room dimensions changed between revisions; a shared crop would be misleading');

  // Do not change either checkout or overwrite an earlier approval image.
  await mkdir(out);
  const {baseX,baseY}=sides[0];
  const failures=[];
  for (const [i,side] of sides.entries()) {
    const tag=i?'after':'before', dir=path.join(out,tag);
    await mkdir(dir);
    const native={shop:side.shop,room:side.room,shelf:cropAt(graphics,side.room,baseX,baseY,101,82,64)};
    for (const [name,canvas] of Object.entries(native)) {
      await writeFile(path.join(dir,name+'.png'),canvas.toBuffer('image/png'),{flag:'wx'});
    }
    const position=[side.baseX,side.baseY].map(value=>Number(value.toFixed(3)));
    console.log(tag+': '+side.spot+' ('+position.join(', ')+'), shop '+side.anchor.join(', '));
    const references=values['verify-'+tag];
    if (references) {
      for (const name of ['shop','room']) {
        const reference=path.resolve(references,name+'.png');
        try {
          const error=pixelDiff(native[name],await graphics.loadImage(reference),graphics.createCanvas);
          if (error) failures.push(tag+'/'+name+': '+error);
          else console.log(tag+'/'+name+' matches '+reference);
        } catch(error) { failures.push('Could not compare '+reference+': '+error.message); }
      }
    }
  }
  await writeFile(path.join(out,'comparison.png'),comparisonBoard(graphics,sides).toBuffer('image/png'),{flag:'wx'});
  console.log(path.join(out,'comparison.png'));
  if (failures.length) throw Error(failures.join('\n'));
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});
