/* Deterministic fictional evolutionary variants, not a radiation dose model.
   The same proportions and body volumes feed rendering and authoritative hits. */
(function(root){const C=root.LongwayCore,cache=new Map();
 function environment(b){const p=C.PlanetClimate.profile(b),m=p.evidence.magnetosphere||{},flux=p.evidence.radiation?.fluxEarthMultiple??b.catalog?.insolationEarth??1,stress=m.stellarWindStress??1;
  const shielding=m.protection||'unknown',weak=shielding==='weak'?1:shielding==='moderate'?.5:.15;
  const exposure=C.clamp((Math.log2(1+Math.max(0,flux))*.1+Math.log10(1+Math.max(0,stress))*.12)*(.45+weak*.55),0,1);
  return {exposure,shielding,fieldMicroTesla:m.surfaceFieldMicroTesla??null,magnetopauseRadii:m.magnetopauseRadii??null,flux,thermalContrast:Math.abs(p.dayK-p.nightK),cold:(p.dayK+p.nightK)*.5<240,wind:p.wind,gravity:b.gravity||9.81,basis:'fictional adaptation from modeled irradiation and shielding; not surface dose'};
 }
 function phenotype(b,id,family=0){const key=b.id+':'+family+':'+id;if(cache.has(key))return cache.get(key);const seed=C.hash(String(id).split('').reduce((h,c)=>Math.imul(h,31)+c.charCodeAt(0),b.seed)),e=environment(b),alien=b.systemIndex>0,variant=seed%3,compact=C.clamp((e.gravity/9.81-1)*.1+e.wind*.005,0,.22);
  const scale=alien?[1+compact+(variant-1)*.07,1-compact+(variant-1)*.08,1+(variant-1)*.14]:[1,1,1],p={alien,variant,environment:e,scale,legPairs:family===3&&alien&&variant===2?4:3,crest:alien?2+variant:0,tailSegments:alien?3+variant:0,plates:alien&&e.exposure>.28?3+variant:0,fin:alien&&e.thermalContrast>80,atlas:alien?[[0,5,8],[5,14,0],[2,9,14],[3,4,11],[1,7,e.cold?15:10]][family][variant]:null,plantForm:!alien?'conifer':e.wind>18?'low-fan':variant===0?'forked-canopy':variant===1?'segmented-fronds':'ribbed-crown',leafTile:e.cold?8: e.exposure>.55?5:variant===1?6:0,barkTile:e.exposure>.55?4:variant===1?11:2};
  p.name=!alien?['cervid','canid','ground bird','field beetle','monitor'][family]:[e.cold?'Frost':e.exposure>.55?'Armored':'Dusk',['grazer','stalker','strider','crawler','monitor'][family],['reed','crest','fan'][variant]].join(' ');
  cache.set(key,p);if(cache.size>512)cache.delete(cache.keys().next().value);return p;
 }
 const volumes=[[[1,0,.34],[1.65,.75,.19]],[[.58,0,.25],[.85,.65,.19]],[[.6,0,.24],[1.1,.45,.11]],[[.25,0,.28]],[[.25,0,.28],[.3,.65,.18]]];
 function hitVolumes(family,p){const scale=p?.scale||[1,1,1];return volumes[family].map(([y,z,r])=>[y*scale[1],z*scale[2],r*Math.max(...scale)]);}
 C.Biology={environment,phenotype,hitVolumes};
})(globalThis);
