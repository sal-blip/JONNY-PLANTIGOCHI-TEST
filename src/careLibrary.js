// Original summaries. The linked extension publications provide the horticultural references.
const toolbox = name => ({name:'NC State Extension Plant Toolbox', url:'https://plants.ces.ncsu.edu/plants/'+name+'/'});
const propagation = {name:'University of Missouri Extension · Home Propagation of Houseplants',url:'https://extension.missouri.edu/publications/g6560'};
const houseplants = {name:'University of Missouri Extension · Caring for Houseplants',url:'https://extension.missouri.edu/publications/g6510'};
const lighting = {name:'University of Minnesota Extension · Lighting for indoor plants',url:'https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/lighting-for-indoor-plants'};
const pests = {name:'University of Minnesota Extension · Managing insects on indoor plants',url:'https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/insects-on-indoor-plants'};
function section(title,paragraph) {return {title,paragraphs:[paragraph]};}

export const plantGuides = [
  {id:'monstera',title:'Swiss cheese plant',scientific:'Monstera deliciosa',aliases:'split leaf philodendron monstera',sources:[toolbox('monstera-deliciosa'),propagation],sections:[
    section('Light and support','Give this climbing aroid bright, filtered light and a sturdy support. Tie the stem loosely so the leaf stalks can move. Young plants naturally have whole, heart-shaped leaves.'),
    section('Water and soil','Feel the top few centimetres of potting mix. When they are dry, water thoroughly and empty the saucer. A chunky, well-draining mix keeps air around the roots.'),
    section('Propagation','Follow a leaf stalk down to the thicker main stem. Cut a stem piece with a node and a leaf, and put the node in moist rooting mix. A leaf cut off above the node cannot grow a new vine.'),
  ]},
  {id:'pothos',title:'Golden pothos',scientific:'Epipremnum aureum',aliases:"devil's ivy devils ivy golden vine money plant",sources:[toolbox('epipremnum-aureum'),propagation],sections:[
    section('Light and habit','Bright, indirect light helps the golden markings stay distinct. The vines can trail from a shelf or climb a support. Trim a long vine just above a node to encourage branching.'),
    section('Water and soil','Let the top layer of mix dry before watering. Wet the whole root ball, let the excess run out, and check again before the next drink. A pot in dim light usually dries more slowly.'),
    section('Propagation','Cut a healthy vine into pieces with at least one node apiece. Remove the leaf that would sit below water or in the rooting mix. Keep the node covered and the remaining leaf in the light.'),
  ]},
  {id:'snake',title:'Snake plant',scientific:'Dracaena trifasciata',aliases:"Sansevieria trifasciata mother-in-law’s tongue mother in law's tongue",sources:[toolbox('dracaena-trifasciata'),propagation],sections:[
    section('Light and position','The stiff, upright leaves tolerate lower light, though growth is faster in brighter, indirect light. Acclimate the plant gradually if you move it to a sunnier window.'),
    section('Water and soil','Let the mix dry well between waterings. Use a draining pot and a loose succulent mix. Check farther down in the pot before watering, especially during cooler, darker months.'),
    section('Propagation','When repotting, separate a rooted offset from the parent rhizome and pot it on its own. Division keeps the parent plant’s pattern. Leaf cuttings of a variegated plant can produce plain green shoots.'),
  ]},
];
export const careTopics = [
  {id:'water',title:'Watering and drainage',sources:[houseplants],sections:[
    section('Read the pot','Feel below the surface and lift the pot to judge its weight. Compare it again after watering. Use the plant’s drying preference, pot size, light and season to decide when to check next.'),
    section('Water the root ball','Water evenly until excess runs out through the drainage holes. Let the pot finish dripping and empty its saucer or outer cover. Persistent wetness can damage roots even when leaves look wilted.'),
  ]},
  {id:'light',title:'Choosing a window',sources:[lighting],sections:[
    section('Notice the sun','Watch where direct sun actually falls over a day. Window direction, overhangs, trees and curtains all change the light a leaf receives. Many tropical foliage plants do well near a bright window behind a sheer curtain.'),
    section('Make changes gradually','Increase exposure a little at a time. Pale, bleached patches on the window side can signal too much direct sun. Thin, stretched new growth can be a reason to try a brighter spot.'),
  ]},
  {id:'cuttings',title:'Starting cuttings',sources:[propagation],sections:[
    section('Choose the right cutting','Use a clean blade and a healthy parent. Check whether the species can grow from a stem, leaf, or division. For a vining aroid, include a node, the joint where a leaf or root emerges.'),
    section('While roots form','Use a clean container and moist, airy rooting mix. Keep foliage above the surface in indirect light. Pot on gently once a small root system has formed.'),
  ]},
  {id:'pests',title:'Checking for pests',sources:[pests],sections:[
    section('Inspect close up','Check leaf undersides, leaf joints and new shoots. Fine webbing, sticky residue, cottony clumps or visible insects give more information than yellowing alone. Inspect new arrivals before setting them beside other plants.'),
    section('Start with identification','Separate an affected plant and identify the pest. Rinsing or wiping sturdy leaves can remove some insects. If treatment is needed, use a product labeled for that plant, pest and indoor use.'),
  ]},
];

export const CARE_LIBRARY_CACHE_KEY = 'plantigochi.care-library.v1';
export const WIKIPEDIA_LICENSE = 'https://creativecommons.org/licenses/by-sa/4.0/';
const api = 'https://en.wikipedia.org/w/api.php';
const normal = value => value.normalize('NFKD').replace(/\p{Mark}/gu,'').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();
export function localMatches(guide,query) {
  const text = normal([guide.title, guide.scientific, guide.aliases].filter(Boolean).join(' '));
  return normal(query).split(/\s+/).every(word=>text.includes(word));
}
export function revisionURL(revision) {return 'https://en.wikipedia.org/w/index.php?oldid='+revision;}
export function readRecent(storage) {
  try {
    const guides=JSON.parse(storage.getItem(CARE_LIBRARY_CACHE_KEY) || '[]');
    if (!Array.isArray(guides))return [];
    return guides.filter(g=>g && Number.isSafeInteger(g.pageId) && g.pageId>0 && Number.isSafeInteger(g.revision) && g.revision>0 &&
      typeof g.title==='string' && typeof g.scientific==='string' && Array.isArray(g.sections) && g.sections.every(s=>
        s && typeof s.title==='string' && Array.isArray(s.paragraphs) && s.paragraphs.every(p=>typeof p==='string'))).slice(0,6);
  } catch {return [];}
}
export function rememberGuide(guide, recent, storage) {
  const next=[guide,...recent.filter(item=>item.pageId!==guide.pageId)].slice(0,6);
  try {storage.setItem(CARE_LIBRARY_CACHE_KEY,JSON.stringify(next));} catch {/* The in-memory list still works. */}
  return next;
}
async function wiki(params,signal) {
  const url=new URL(api);
  url.search=new URLSearchParams({action:'parse',format:'json',formatversion:'2',origin:'*',...params});
  const response = await fetch(url, {signal,credentials:'omit',headers:{'Api-User-Agent':'Plantigochi/1.0 (https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST)'}});
  if (!response.ok) throw new Error('Wikipedia could not be reached.');
  const data=await response.json();
  if (data.error) throw new Error('Wikipedia could not load this page.');
  return data;
}
// Template contents remain inert. Only plain text is ever returned to the interface.
function fragment(html) {
  const template=document.createElement('template');
  template.innerHTML=html;
  return template.content;
}
const textOf=element=>element.textContent.replace(/\s+/g,' ').trim();
export function plantIdentity(html) {
  const boxes=fragment(html).querySelectorAll('table.infobox.biota');
  if(boxes.length!==1)return null;
  const box=boxes[0];
  const kingdom=[...box.rows].some(row=>row.cells.length===2 && /^(kingdom|regnum):?$/i.test(textOf(row.cells[0])) && /^plantae$/i.test(textOf(row.cells[1])));
  const binomial=box.querySelector('.binomial');
  return kingdom && binomial ? textOf(binomial) : null;
}
export async function searchSpecies(term,signal) {
  const query=term.trim();
  if(query.length<2)return [];
  const {query:result}=await wiki({action:'query',list:'search',srsearch:query,srnamespace:'0',srlimit:'8',srprop:''},signal);
  const pages=result.search;
  const verified=[];
  let failed=0;
  for(let i=0;i<pages.length;i+=3) {
    const group=await Promise.all(pages.slice(i,i+3).map(async page=>{
      try {
        const {parse}=await wiki({pageid:page.pageid,section:'0',prop:'text|revid',disableeditsection:'1'},signal);
        const scientific=plantIdentity(parse.text);
        return scientific ? {pageId:page.pageid,title:parse.title,scientific,revision:parse.revid} : null;
      } catch(error){
        if(signal?.aborted)throw error;
        failed++;return null;
      }
    }));
    verified.push(...group.filter(Boolean));
  }
  if(failed && !verified.length)throw new Error('Some species could not be verified. Try the search again.');
  return verified;
}

const careHeading=title=>/\b(cultivation|horticulture|propagation|houseplants?|growing conditions|indoor care)\b/i.test(title);
export function cultivationSections(html) {
  const root=fragment(html);
  root.querySelectorAll('sup,table,figure,figcaption,script,style,aside,nav,.thumb,.gallery,.gallerybox,.noviewer,.mw-editsection,.metadata,.noprint,.hatnote,.navbox,.reference,.mw-references-wrap').forEach(node=>node.remove());
  const sections=[], stack=[];
  let block;
  for(const node of root.querySelectorAll('h2,h3,h4,h5,h6,p,li')){
    if(/^H[2-6]$/.test(node.tagName)){
      const level=Number(node.tagName[1]), title=textOf(node);
      while(stack.length && stack.at(-1).level>=level)stack.pop();
      const parent=stack.at(-1);
      const relevant=careHeading(title) || Boolean(parent?.relevant && !/^(uses|toxicity|gallery|references|history|distribution|ecology|conservation)$/i.test(title));
      stack.push({level,relevant});block=relevant?{title,paragraphs:[]}:null;
      if(block)sections.push(block);
    } else if(block && !node.parentElement?.closest('p,li')){
      const paragraph=textOf(node);
      if(paragraph && block.paragraphs.length<5)block.paragraphs.push(paragraph.length>1400?paragraph.slice(0,1399).replace(/\s+\S*$/,'')+'…':paragraph);
    }
  }
  return sections.filter(s=>s.paragraphs.length).slice(0,8);
}
export async function loadSpecies(entry,signal) {
  const {parse}=await wiki({oldid:entry.revision,prop:'text|revid',disableeditsection:'1'},signal);
  if(parse.revid!==entry.revision || !plantIdentity(parse.text))throw new Error('This plant article could not be verified.');
  return {...entry,sections:cultivationSections(parse.text)};
}
