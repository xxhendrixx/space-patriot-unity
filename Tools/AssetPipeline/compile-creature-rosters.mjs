// Compile ten world-specific creature concepts, encounter roles and model
// assignments for every body in the shipped planetary catalog.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
fs.mkdirSync(root+'/ArtDirection/Creatures',{recursive:true});
const worlds=JSON.parse(fs.readFileSync(root+'/Assets/SpacePatriot/Resources/Worlds.json','utf8')).worlds;
const names=[
 ['Kelpback','Screehoop','Glassburrow','Lanternmoth','Cairnstag','Needlewake','Saltcrawler','Mirehorn','Thunderjaw','Pale Regent'],
 ['Ash grazer','Cinderkite','Basalt digger','Sulfur drifter','Cragback','Glasswing','Scoria crawler','Fumarole lurker','Caldera ram','The Red Maw'],
 ['Mossback','Canopy sailer','Rootmole','Bellwing','Ridge grazer','Bramble stalker','Mire crab','Reed ambusher','Old-growth colossus','The Hollow Crown'],
 ['Dunebacker','Dust skimmer','Grit burrower','Sunspore glider','Ridge runner','Glassfang','Saltplate beetle','Night siphon','Dune breaker','The Thirsting King'],
 ['Cloud leviathan','Cyclone ray','Aerosac drifter','Static lantern','Crown grazer','Needle stormer','Pressure mantis','Gale lurker','Thunderhead elder','The Blue Tempest'],
 ['Ice shelf grazer','Aurora skater','Frost burrower','Prismwing','Rimeback','Hailstalker','Brine shell','Night glider','Glacier titan','The White Choir'],
];
const archetypes=['grazer','glider','burrower','drifter','sentinel','stalker','scavenger','ambusher','champion','apex'];
const silhouettes=['low armored shoulders, a segmented dorsal sail and broad shovel muzzle','long kite membranes, a narrow rudder tail and split sensory crest','wedge head, compact plated body, digging forelimbs and counterweight tail','floating gas bladders, translucent veils and a dangling lure cluster','towering ridged shoulders, paired crown horns and heavy planted feet','lean reverse-jointed limbs, swept-back quills and a low hunting profile','asymmetric shell plates, one oversized feeler and hooked feeding limbs','flattened body, camouflaged frill and a spring-loaded neck fan','tall layered carapace, branching mineral horns and glowing throat sacs','massive interlocking plates, scarred face shield and luminous organ channels'];
const palettes={rock:['#968976','#524d43','#c48b59'],desert:['#c9a66b','#6f4c39','#e5d19b'],temperate:['#667552','#3f5143','#a2a16a'],ice:['#a5bec0','#526a76','#d7d9c5'],volcanic:['#7a5148','#302d30','#d18b4f'],gas:['#687c8c','#35495a','#d3bb79']};
const habitats={rock:'fracture escarpments and mineral talus',desert:'wind-cut basins, salt pans and shadowed slot canyons',temperate:'old-growth margins, river terraces and wet canopy',ice:'blue-ice crevasses, brine vents and pressure ridges',volcanic:'lava tubes, ash dunes and warm fumaroles',gas:'high-altitude ammonia cloud bands and lightning shear'};
const traits={grazer:'feeds on mineral films and retreats when challenged',glider:'rides thermal columns and scatters if approached',burrower:'uses a den network and erupts from loose ground',drifter:'filters airborne spores and moves with local weather',sentinel:'guards a nesting or feeding territory',stalker:'hunts by reading vibration and breaking line of sight',scavenger:'follows ships and feeds on discarded cargo organics',ambusher:'mimics the local substrate before a short burst attack',champion:'elite territorial defender; combines two attack patterns',apex:'planetary apex encounter with a distinct arena, telegraphed abilities and recovery windows'};
const abilities=['Ridge charge','Dust veil','Burrow ambush','Resonant screech','Hooked pounce','Spore fan','Shell ward','Ground rupture','Cyclone leap','Crown pulse'];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function worldFamily(w){return w.biome==='gas'?'gas':w.biome==='temperate'?'temperate':w.biome==='ice'?'ice':w.biome==='volcanic'?'volcanic':w.biome==='desert'?'desert':'rock';}
const compiled=worlds.map(w=>{
 const family=worldFamily(w),random=rng(hash(w.id+w.seed)),palette=palettes[family];
 const fauna=Array.from({length:10},(_,i)=>{
  const id=`${w.id}-wild-${String(i+1).padStart(2,'0')}`,role=archetypes[i],hostile=['stalker','ambusher','champion','apex'].includes(role),boss=['champion','apex'].includes(role);
  const hue=Math.floor(random()*13)-6,base=[0,1,2].map((c)=>{let n=parseInt(palette[c].slice(1),16),r=(n>>16)+hue*2,g=(n>>8&255)+hue,b=(n&255)-hue;return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')).join('');});
  const speciesName=names[{rock:0,desert:1,temperate:2,ice:5,volcanic:1,gas:4}[family]][i];
  return {id,name:`${speciesName} / ${w.name}`,world:w.id,biome:family,role,model:`fauna-${i}`,family:i%5,variant:Math.floor(i/5),seed:hash(id),palette:base,height:boss?(i===9?8.5:4.8):.8+random()*1.5,health:boss?(i===9?1400:520):hostile?145:70,damage:boss?(i===9?28:16):hostile?9:0,aggression:boss?1:hostile?.72:.06,detection:boss?115:hostile?42:18,abilities:boss?[abilities[(i+hash(w.id))%abilities.length],abilities[(i+3+hash(w.id))%abilities.length]]:hostile?[abilities[(i+hash(w.id))%abilities.length]]:[],
   concept:{silhouette:silhouettes[i],habitat:habitats[family],behavior:traits[role],views:['front','left','right','back','top','three-quarter'],measure:{units:'metres',origin:'ground-centre',up:'+Y',forward:'+Z'},prompt:`Original Space Patriot alien wildlife design. ${silhouettes[i]}. Habitat: ${habitats[family]}. ${traits[role]}. Palette ${base.join(', ')}. Distinct asymmetrical anatomy, readable at distance, no humanoid armor or Earth animal copy.`}};
 });
 return {world:w.id,name:w.name,biome:family,seed:w.seed,fauna};
});
fs.writeFileSync(root+'/Assets/SpacePatriot/Resources/CreatureRosters.json',JSON.stringify({schema:'space-patriot-creatures',version:1,units:'metres',worlds:compiled},null,2));
for(const body of compiled)fs.writeFileSync(root+'/ArtDirection/Creatures/'+body.world+'-concepts.json',JSON.stringify({schema:'space-patriot-creature-concepts',version:1,world:body.world,worldName:body.name,biome:body.biome,contract:{units:'metres',origin:'ground-centre',up:'+Y',forward:'+Z',views:['front','left','right','back','top','three-quarter']},species:body.fauna},null,2));
fs.writeFileSync(root+'/ArtDirection/Creatures/CREATURE_ROSTER.md','# World creature rosters\n\nCompiled from `Assets/SpacePatriot/Resources/Worlds.json` by `node Tools/AssetPipeline/compile-creature-rosters.mjs`. Every world receives ten distinct concept briefs with stable IDs, silhouette, habitat, palette, model assignment, threat role, abilities and standard view coordinates. The current game can render the ten imported anatomy bases with per-world seed and scale variants; Tripo replacements keep the same IDs and anatomy slot.\n\nEach roster contains foragers, a glider, a burrower, a weather-adapted drifter, a sentinel, a stalking predator, a scavenger, an ambusher, an elite champion and an apex encounter. Gas giants use high-altitude fauna entries. Weapon attacks, environmental telegraphs and boss abilities are fields on the same species records.\n');
console.log(`Compiled ${compiled.length} worlds / ${compiled.length*10} creature concepts.`);
