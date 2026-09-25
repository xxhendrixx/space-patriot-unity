/* Inferred weather for a fictional frontier, anchored to the imported catalog.
   Coverage/metadata spectral tags are never promoted to detected molecules. */
(function(root){const C=root.LongwayCore,cache=new WeakMap();
 function profile(b){if(cache.has(b))return cache.get(b);const evidence=root.SpacePatriotClimate?.planets[b.catalog?.id]||{},t=evidence.temperatures||{},star=b.host?.stellar?.effectiveTemperatureK||5772;
  const detected=(evidence.atmosphere?.moleculeTags||[]).filter(x=>['detected','feature'].includes(x.status)).map(x=>x.molecule),earth=b.name==='Earth',gas=b.type===3,air=b.atmosphere>0,eq=t.equilibriumK??b.catalog?.equilibriumK??273;
  const venus=b.name==='Venus',day=venus?737:t.daysideK??eq,night=venus?737:t.nightsideK??eq*.8,contrast=Math.abs(day-night),wet=Math.max(0,b.humidity||0);
  const color=gas?[.32,.46,.58]:b.type===2?[.62,.34,.16]:b.type===5?[.65,.22,.095]:b.type===4?[.36,.59,.75]:[.22,.49,.76];
  if(!earth&&b.systemIndex>0){const tint=star<4400?[[.44,.25,.37],[.39,.31,.48],[.34,.42,.39]][b.seed%3]:[.58,.37,.23];if(b.type===1||b.type===4)color.splice(0,3,...tint);}
  if(detected.includes('CH4')){color[0]*=.65;color[2]*=1.2;}
  if(detected.includes('SO2')){color[0]=Math.max(color[0],.58);color[1]=Math.max(color[1],.37);color[2]*=.65;}
  const warmth=C.clamp((5772-star)/4000,0,1),starColor=[1,1-warmth*.26,1-warmth*.45];if(star>6500)starColor[0]=Math.max(.75,1-(star-6500)/20000);
  const wind=air?(earth?7:gas?32:3+Math.min(22,contrast*.055)+Math.log2(1+(b.catalog?.insolationEarth||1))*.45):0;
  const temperate=b.type===1,temperature=earth?15:venus?464:temperate?C.clamp((day+night)*.5-273.15,-8,30):b.temperature;
  const silicate=eq>850&&eq<2800?.48:0,metal=b.name==='WASP-76 b'?.65:eq>1500?.2:0;
  // Approximate photon distribution from the host's effective temperature.
  // Atmospheric transmission is a broad artistic envelope, not line-by-line spectroscopy.
  const bands=[450,550,680,850,1050],photons=bands.map(nm=>1/(nm**4*Math.expm1(14387769/(nm*star)))),peak=Math.max(...photons),photonBands=photons.map((v,i)=>({nm:bands[i],relative:v/peak*(i>2&&detected.includes('H2O')?.82:1)}));
  const alien=star<4400,foliageColor=alien?[.42,.15,.49]:[.55,.65,.39],grassColor=alien?[.065,.24,.45]:[.18,.42,.075],pigment=alien?'violet canopy / blue understory':'chlorophyll green';
  const result={foliageColor,grassColor,pigment,photonBands,pigmentBasis:'artistic reflectance informed by stellar photon distribution',silicate,metal,cloudSpecies:metal>.4?'iron / silicate condensates':silicate?'silicate aerosols':b.type===4?'ice crystals':gas?'volatile cloud bands':temperate?'water droplets':'mineral dust',source:evidence.source||b.sourceUrl,evidence,temperature,dayK:day,nightK:night,detectedMolecules:detected,wind,windDirection:b.seed%360,gust:air?C.clamp(.16+contrast/600,.16,.85):0,rain:temperate?.2+wet*.42:0,snow:b.type===4?.7:0,dust:[2,5].includes(b.type)?.45:0,lightning:temperate?.12:gas?.35:0,coverage:evidence.atmosphere?.cloudCoverFraction??(temperate?.64:gas?.96:.25),atmosphereColor:color,starColor,plantColor:[.19+warmth*.075,.38-warmth*.10,.12+warmth*.035],interpretation:'inferred game climate',stellarK:star};cache.set(b,result);return result;
 }
 function frontState(b,time,normal){const local=C.bodyLocal?.(b,normal)||normal,phase=time/170+(b.seed%137),front=.5+.5*Math.sin(phase+local[0]*2.3+local[2]*1.7+Math.abs(local[1])*1.1);return {phase,front,storm:C.smooth(C.clamp((front-.62)/.38,0,1))};}
 function weather(b,time,normal){const p=profile(b),{phase,front,storm}=frontState(b,time,normal),latitude=Math.abs((C.bodyLocal?.(b,normal)||normal)[1]),sun=root.longway?.celestial?.sun(b.center)||C.SUN,daylight=C.clamp((C.dot(normal,sun)+.15)/1.15,0,1),thermalK=p.nightK+(p.dayK-p.nightK)*daylight,locked=!!p.evidence.orbital?.tidallyLocked;
  return {...p,front,phase,storm,thermalK,thermalZone:daylight<.12?'nightside':daylight<.4?'terminator':'dayside',coverage:C.clamp(p.coverage+(storm-.3)*.22+(locked?(1-daylight)*.1:0),.02,1),wind:p.wind*(.72+storm*1.2),gust:C.clamp(p.gust+storm*.35,0,1),rain:p.rain*(.35+storm*1.3),snow:p.snow*(.6+storm*.5),dust:p.dust*(.35+storm*.9),lightning:p.lightning*storm,temperature:p.temperature-(latitude-.45)*12+(locked?(daylight-.5)*12:0),windDirection:(p.windDirection+Math.sin(time/230)*22)%360};
 }
 C.PlanetClimate={profile,weather,frontState};
})(globalThis);
