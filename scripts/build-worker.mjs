import { promises as fs } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
const assets = {};
async function collect(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) await collect(file);
    else assets['/'+path.relative('dist',file).split(path.sep).join('/')] = (await fs.readFile(file)).toString('base64');
  }
}
// Generate after Workbox so the release lookup always goes to the server.
const html=await fs.readFile('dist/index.html','utf8');
const entry=html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
if(!entry)throw Error('Missing game entry');
const worker=createHash('sha256').update(await fs.readFile('dist/sw.js')).digest('hex');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.writeFile('dist/game-release.json',JSON.stringify({version,entry,worker}));
await collect('dist');
await build({
  entryPoints:['server/index.js'], bundle:true, format:'esm', platform:'browser', target:'es2022', outfile:'dist/server/index.js',
  plugins:[{name:'game-assets',setup(b){
    b.onResolve({filter:/generated-assets\.js$/},()=>({path:'assets',namespace:'game'}));
    b.onLoad({filter:/.*/,namespace:'game'},()=>({contents:'export const assets='+JSON.stringify(assets),loader:'js'}));
  }}],
});
await fs.mkdir('dist/.openai', {recursive:true});
await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
