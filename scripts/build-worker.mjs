import { promises as fs } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const assets = {};
async function collect(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) await collect(file);
    else assets['/'+path.relative('dist',file).split(path.sep).join('/')] = (await fs.readFile(file)).toString('base64');
  }
}
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
