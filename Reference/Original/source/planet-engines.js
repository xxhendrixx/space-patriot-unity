/* Planet adapters for the user's Worldworks/Grassworks/Oceanworks engines.
   Worldworks heights are shared by collision, mesh terrain and the ray marcher. */
(function (root) {
  const C = root.LongwayCore, WW = root.WWCore, L = C.Landscape;
  const profiles = new WeakMap();
  const cache = new Map(), step = (a,b,x) => C.smooth(C.clamp((x-a)/(b-a),0,1));
  function profile(b) {
    if(profiles.has(b))return profiles.get(b);
    const r = WW.rng(b.seed ^ 0x574f524c), wet = b.humidity || 0;
    const style = b.type === 2 ? 'desert' : [0,4,5].includes(b.type) ? 'alpine' : wet > .78 ? 'islands' : 'highlands';
    const climate=C.PlanetClimate?.profile(b);
    const wind = climate?climate.wind*.055:.25+r()*.65;
    const result = {
      climate, seed: b.seed >>> 0, style, solid: b.type !== 3,
      scale: 32, size: 180, resolution: 128,
      relief: [22,26,19,0,31,34][b.type] || 26,
      grass: b.type === 1 && b.atmosphere > 0,
      grassHeight: .24 + wet * .36, wind,
      water: Boolean(b.liquid && b.liquid !== 2 && b.type !== 3),
      waveHeight: b.type === 1 ? .18 : .48 + wind * .38,
      waveLength: b.type === 1 ? 14 : 24 + r()*16,
      vents: b.type === 5, name: ['Crater highlands','Living watershed','Terraced desert','Storm atmosphere','Glacial ridges','Volcanic massif'][b.type],
    };
    profiles.set(b,result);return result;
  }
  function documentFor(b) {
    const p = profile(b);
    if (!p.solid) return null;
    const key = `${b.id}:${b.seed}:${p.style}`;
    if (cache.has(key)) return cache.get(key);
    const doc = WW.create(p.seed, p.style, p.relief, p.resolution, p.size);
    const terrain = TerrainworksCore.create({seed:p.seed,mountainHeight:p.relief,temperature:b.type===4?.1:b.type===2?.9:.55,moisture:b.humidity||.2,terracing:b.type===2?.7:.12,warp:.9,ridgeSharpness:2.4,erosion:2.8,valleyDepth:6,biomeScale:2.4,rockCluster:.8});
    for(let j=0;j<=p.resolution;j++)for(let i=0;i<=p.resolution;i++){const x=(i/p.resolution-.5)*p.size,z=(j/p.resolution-.5)*p.size,k=j*(p.resolution+1)+i,wet=terrain.moisture(x,z),rock=terrain.rocks(x,z),weight=C.clamp(.5+rock*.35-wet*.15,.38,.82);doc.base[k]=doc.base[k]*(1-weight)+terrain.height(x,z)*weight;}
    const data = {key, profile:p, doc, heights:doc.base,terrain};
    cache.set(key,data);
    if (cache.size > 8) cache.delete(cache.keys().next().value);
    return data;
  }
  function coordinates(b,n) {
    return [C.dot(n,L.right)*b.radius*1000, C.dot(n,L.forward)*b.radius*1000];
  }
  // Sample the imported engine's spatial fields rather than assigning one value
  // to the entire globe. Small samples interpolate continuously across cells.
  const regions=new WeakMap();
  function region(b,worldNormal,elevation=0){const p=profile(b),n=C.bodyLocal?.(b,worldNormal)||worldNormal,[x,z]=coordinates(b,n),u=x/32,v=z/32;
    let memo=regions.get(b);if(!memo){memo=new Map();regions.set(b,memo);}const cell=64,ix=Math.floor(x/cell),iz=Math.floor(z/cell),field=(i,j)=>{const key=i+','+j;if(memo.has(key))return memo.get(key);const t=documentFor(b)?.terrain,r=t?[t.moisture(i*cell/32,j*cell/32),t.temperature(i*cell/32,j*cell/32,0),t.rocks(i*cell/32,j*cell/32)]:[.1,.5,.8];memo.set(key,r);if(memo.size>6000)memo.delete(memo.keys().next().value);return r;};
    const sx=C.smooth(x/cell-ix),sz=C.smooth(z/cell-iz),a=field(ix,iz),d=field(ix+1,iz+1),e=field(ix+1,iz),f=field(ix,iz+1),mix=(i)=>(a[i]*(1-sx)+e[i]*sx)*(1-sz)+(f[i]*(1-sx)+d[i]*sx)*sz;
    const river=C.dot(n,L.up)>.98?Math.abs(x/1000-L.riverX(b,z/1000)):100,riverWet=1-step(.12,.55,river),patch=.5+.5*Math.sin(x*.005+Math.sin(z*.007)*1.8+b.seed%17)*Math.cos(z*.006),moisture=C.clamp(mix(0)-.2+riverWet*.4+(patch-.5)*.38,0,1),temperature=C.clamp(mix(1)-Math.max(0,elevation)*.3-Math.abs(n[1])*.18,0,1),exposure=C.clamp(mix(2)*.55+Math.max(0,elevation)*.25+(1-moisture)*.3,0,1);
    const forestCover=C.clamp((moisture-.22)*1.9+patch*.6-.2-exposure*.22,0,.95),grassHeight=.10+moisture*.95*(1-exposure*.6),grassDensity=Math.round(9000+moisture*24000),windShelter=1-forestCover*.6+exposure*.25,zone=temperature<.2?'cold upland':riverWet>.6?'river margin':moisture<.3?'dry scrub':forestCover>.5?'sheltered forest':exposure>.55?'exposed ridge':'meadow';
    const base=p.climate?.grassColor||[.18,.42,.075],dry=p.climate?.stellarK<4400?[.3,.12,.34]:[.43,.36,.095],grassColor=base.map((c,i)=>c*(.7+moisture*.6)*(1-(1-moisture)*.35)+dry[i]*(1-moisture)*.35);
    return {...p,zone,moisture,temperature,exposure,forestCover,grassHeight,grassDensity,grassWidth:.022+moisture*.035,windShelter,grassColor,plantVariant:Math.floor(patch*2.999),terrainRock:mix(2),climate:{...p.climate,grassColor}};
  }
  function shape(b,n,base) {
    if (b.type === 3 || C.dot(n,L.up)<.98) return base;
    const [x,z] = coordinates(b,n), size = 5760;
    const mask = (1-step(size*.33,size*.48,Math.abs(x))) * (1-step(size*.33,size*.48,Math.abs(z)));
    if (!mask) return base;
    const {doc,profile:p} = documentFor(b), s = WW.sample(doc,x/p.scale,z/p.scale);
    if (!s) return base;
    const h = (s.height - doc.env.water) * p.scale / 1000;
    // Keep the navigable watershed and its carved river channel. Worldworks adds
    // the seeded hills outside its banks; other solids use the generated massif.
    if (b.type === 1) {
      const d = Math.abs(x/1000 - L.riverX(b,z/1000));
      return base + Math.max(0,h) * .62 * mask * step(.65,1.2,d);
    }
    const target = h * .85 + Math.max(0,base) * .15;
    return base * (1-mask) + target * mask;
  }
  const sample = C.Geology.sample;
  C.Geology.sample = (w,b,n) => {
    const s = sample(w,b,n);
    s.height = shape(b,n,s.height);
    return s;
  };
  const survey = C.Universe.prototype.surveySite;
  C.Universe.prototype.surveySite = function(b) {
    if (b.type === 1 || b.type === 3 || b.biome === 6) return survey.call(this,b);
    if (this.surveySites.has(b.id)) return this.surveySites.get(b.id);
    const {doc,profile:p} = documentFor(b);
    let best = null;
    for (let z=-30;z<=30;z+=5) for (let x=-30;x<=30;x+=5) {
      const s=WW.sample(doc,x,z), score=s.slope + Math.hypot(x,z)*.08;
      if (s.height>doc.env.water+2 && (!best || score<best.score)) best={x,z,score};
    }
    const n=L.normal(b,(best?.x||0)*p.scale/1000,(best?.z||0)*p.scale/1000);
    const h=this.rawHeight(b,n), right=C.unit(C.cross([0,1,0],n)), forward=C.unit(C.cross(n,right));
    const site={body:b,center:C.add(b.center,C.mul(n,b.radius+h)),up:n,right,forward,height:h,name:b.name+' '+p.name,style:0};
    this.surveySites.set(b.id,site); return site;
  };
  C.PlanetEngines = {profile,region,documentFor,coordinates,shape,cache,version:'regional-worldworks-terrainworks-2'};
})(globalThis);
