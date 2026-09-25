/* Longway 2: finite seeded galaxy, local ecology, collision, ship and station systems.
   Distances km; velocities km/s; gravity m/s² is converted exactly once at application. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const {
    add,
    sub,
    mul,
    dot,
    cross,
    length,
    unit,
    mix,
    clamp,
    random,
    hash,
    rotate,
    slerp,
    smooth,
    SECTOR,
  } = C;
  const BaseUniverse = C.Universe,
    BaseFlight = C.Flight;
  // Biome: name, underlying terrain, liquid 0/1-water/2-lava/3-acid, flora form,
  // ambient Celsius, rainfall fraction, surface palette, vegetation palette, ecology description.
  const BIOMES = [
    [
      "Meadow seas",
      1,
      1,
      0,
      18,
      0.65,
      [0.75, 1.12, 0.82],
      [0.19, 0.49, 0.18],
      "Sunlight → ribbon grass → sailbacks → dusk hunters",
    ],
    [
      "Copper dunes",
      2,
      1,
      2,
      43,
      0.1,
      [1.27, 0.9, 0.65],
      [0.36, 0.53, 0.26],
      "Oasis algae → water-storing spires → sand skitters → burrow hunters",
    ],
    [
      "Glacial fjords",
      4,
      1,
      3,
      -28,
      0.23,
      [0.73, 1.03, 1.24],
      [0.35, 0.73, 0.96],
      "Brine microbes → ice lichen → snow grazers → frost hunters",
    ],
    [
      "Magma rifts",
      5,
      2,
      3,
      680,
      0.01,
      [1.1, 0.7, 0.51],
      [1, 0.3, 0.06],
      "Vent chemistry → mineral mats → heat mites → vent stalkers",
    ],
    [
      "Mycelial twilight",
      1,
      1,
      1,
      26,
      0.82,
      [1.06, 0.64, 1.29],
      [0.72, 0.2, 0.81],
      "Spore beds → umbrella fungi → lantern grazers → veil hunters",
    ],
    [
      "Tidal archipelago",
      1,
      1,
      4,
      23,
      0.91,
      [0.71, 1.05, 1.15],
      [0.19, 0.81, 0.63],
      "Plankton → tidal coral → reef skimmers → current hunters",
    ],
    [
      "Airless sanctuary",
      0,
      0,
      3,
      -83,
      0,
      [1, 0.96, 1.08],
      [0.34, 0.74, 0.59],
      "Sealed habitat: algae beds → dome crops → grazers → recyclers",
    ],
    [
      "Emerald canopy",
      1,
      1,
      0,
      29,
      0.9,
      [0.79, 1.15, 0.77],
      [0.13, 0.46, 0.23],
      "Canopy leaves → moss understory → ridgebacks → tree hunters",
    ],
    [
      "Sulfur marsh",
      5,
      3,
      1,
      91,
      0.47,
      [1.15, 1.05, 0.5],
      [0.76, 0.76, 0.19],
      "Sulfur bacteria → filter fans → shell walkers → acid stalkers",
    ],
    [
      "Coral shallows",
      1,
      1,
      4,
      31,
      0.75,
      [0.92, 0.86, 1.08],
      [1, 0.34, 0.41],
      "Sunlit algae → branching coral → reef grazers → fin hunters",
    ],
    [
      "Crystal tundra",
      4,
      1,
      3,
      -61,
      0.13,
      [0.77, 0.88, 1.28],
      [0.43, 0.61, 1],
      "Subsurface microbes → crystal lichen → glass crawlers → fissure hunters",
    ],
    [
      "Golden steppe",
      2,
      1,
      2,
      12,
      0.34,
      [1.16, 1.07, 0.72],
      [0.69, 0.66, 0.24],
      "Seed grass → hardy succulents → plains runners → amber hunters",
    ],
    [
      "Cloud ocean",
      3,
      0,
      1,
      -102,
      0.42,
      [1.11, 0.91, 1.2],
      [0.76, 0.4, 0.94],
      "Floating habitat: aeroplankton → filter sails → cloud grazers → drifters",
    ],
    [
      "Cinder gardens",
      5,
      2,
      1,
      340,
      0.03,
      [0.93, 0.66, 0.68],
      [0.92, 0.32, 0.19],
      "Cool refuges: vent microbes → ash fungi → ember crawlers → refuge hunters",
    ],
  ].map((x, i) => ({
    index: i,
    name: x[0],
    type: x[1],
    liquid: x[2],
    flora: x[3],
    temperature: x[4],
    humidity: x[5],
    tint: x[6],
    plantColor: x[7],
    foodweb: x[8],
  }));
  const prefixes = [
    "Alder",
    "Wren",
    "Harrow",
    "Lowell",
    "Tarn",
    "Bracken",
    "Hush",
    "Cairn",
    "Dovetail",
    "Wick",
    "Bramble",
    "Lark",
    "Ember",
    "Thistle",
    "Moss",
    "Rill",
    "Bell",
    "Hollow",
    "Flint",
    "Reed",
  ];
  const suffixes = [
    "Reach",
    "Vale",
    "Sound",
    "Drift",
    "Rest",
    "Haven",
    "Glen",
    "Bend",
    "Field",
    "Watch",
    "Cross",
    "Spur",
    "Mere",
    "Fold",
    "Run",
    "Shore",
    "Wood",
    "Ridge",
    "Well",
    "Down",
  ];
  const HOME = [
    "Sable",
    "Briar",
    "Rust",
    "Morrow",
    "Glass",
    "Cinder",
    "Kestrel",
    "Velour",
    "Cove",
    "Thorn",
  ];
  const HOME_BIOMES = [6, 7, 1, 12, 10, 3, 11, 4, 5, 8];
  const sqBox = (p, b) => {
    const q = p.map((v, i) => Math.abs(v) - b[i]);
    return length(q.map((v) => Math.max(v, 0))) + Math.min(Math.max(...q), 0);
  };
  const local = (p, f) => {
    const d = sub(p, f.center);
    return [dot(d, f.right), dot(d, f.up), dot(d, f.forward)];
  };
  const global = (q, f) =>
    add(
      f.center,
      add(add(mul(f.right, q[0]), mul(f.up, q[1])), mul(f.forward, q[2])),
    );
  const line = (a, b, duration, label) => ({
    duration,
    label,
    at: (t) => mix(a, b, smooth(t)),
  });
  const arc = (center, a, b, r, duration, label) => ({
    duration,
    label,
    at: (t) => add(center, mul(slerp(a, b, smooth(t)), r)),
  });
  class Ecosystem {
    constructor(body) {
      this.body = body;
      const r = random(body.seed ^ 0x459129);
      this.capacity = 600 + r() * 2400;
      this.rates = [0.02 + r() * 0.04, 0.015 + r() * 0.025, 0.004 + r() * 0.01];
      this.populations = [
        this.capacity * (0.55 + r() * 0.3),
        45 + r() * 100,
        5 + r() * 15,
        500 + r() * 600,
      ];
      this.age = 0;
      this.wildlife = {};
      this.events = 0;
      const stem = prefixes[body.seed % prefixes.length].toLowerCase();
      this.species = [
        stem +
          " " +
          ["ferns", "sporecaps", "spires", "lichen", "coral"][body.flora],
        stem +
          " " +
          [
            "ridgebacks",
            "lantern grazers",
            "sand skitters",
            "glass crawlers",
            "reef skimmers",
          ][body.flora],
        stem +
          " " +
          [
            "dusk hunters",
            "veil stalkers",
            "burrow hunters",
            "fissure hunters",
            "fin hunters",
          ][body.flora],
      ];
      this.agents = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        type: i < 12 ? 0 : 1,
        x: (r() - 0.5) * 0.45,
        z: (r() - 0.5) * 0.52,
        phase: r() * 6.283,
        yaw: r() * 6.283,
        energy: 0.6 + r() * 0.4,
        size: (i < 12 ? 0.0011 : 0.0008) * (1 + r() * 0.7),
        speed: (i < 12 ? 0.004 : 0.0055) * (1 + r() * 0.5),
      }));
    }
    update(dt, animate = true) {
      dt = clamp(dt, 0, 1);
      this.age += dt;
      let [p, h, c, n] = this.populations;
      const [growth, feed, hunt] = this.rates;
      const nutrient = clamp(n / 700, 0.1, 1.4),
        eaten = (feed * h * p) / (p + this.capacity * 0.15),
        caught = (hunt * c * h) / (h + 30);
      const dp = growth * p * (1 - p / this.capacity) * nutrient - eaten,
        dh = eaten * 0.07 - caught - h * 0.0018,
        dc = caught * 0.11 - c * 0.0011,
        dn = (700 - n) * 0.003 + Math.max(0, -dp) * 0.04 - growth * p * 0.006;
      this.populations = [
        clamp(p + dp * dt, 1, this.capacity * 1.3),
        clamp(h + dh * dt, 1, 2000),
        clamp(c + dc * dt, 1, 500),
        clamp(n + dn * dt, 5, 3000),
      ];
      if (!animate) return;
      for (const a of this.agents) {
        let dx, dz;
        if (a.type) {
          let prey = null,
            best = Infinity;
          for (const b of this.agents)
            if (!b.type) {
              const d = Math.hypot(b.x - a.x, b.z - a.z);
              if (d < best) {
                best = d;
                prey = b;
              }
            }
          dx = prey.x - a.x;
          dz = prey.z - a.z;
          if (best < 0.006) {
            prey.energy -= dt * 0.2;
            this.events++;
          }
        } else {
          let hunter = null,
            best = 0.065;
          for (const b of this.agents)
            if (b.type) {
              const d = Math.hypot(b.x - a.x, b.z - a.z);
              if (d < best) {
                best = d;
                hunter = b;
              }
            }
          if (hunter) {
            dx = a.x - hunter.x;
            dz = a.z - hunter.z;
            a.energy -= dt * 0.01;
          } else {
            dx = Math.sin(this.age * 0.06 + a.phase) * 0.24 - a.x;
            dz = Math.cos(this.age * 0.08 + a.phase) * 0.25 - a.z;
            a.energy = clamp(a.energy + dt * 0.015, 0, 1);
          }
        }
        const l = Math.hypot(dx, dz) || 1;
        a.x = clamp(a.x + (dx / l) * a.speed * dt, -0.32, 0.32);
        a.z = clamp(a.z + (dz / l) * a.speed * dt, -0.32, 0.32);
        a.yaw = Math.atan2(dx, dz);
        if (a.energy < 0.08) {
          a.x = -a.x;
          a.z = -a.z;
          a.energy = 0.8;
        }
      }
    }
  }
  class Universe extends BaseUniverse {
    constructor(seed = 41827) {
      super(seed);
      this.cache = new Map();
      this.catalog = [];
      this.sites = new Map();
      this.stations = new Map();
      this.ecosystems = new Map();
      this.elapsed = 0;
      this.surveySites = new Map();
      this._plantsKey = "";
      this._plants = [];
      const systems = globalThis.SpacePatriotCatalog.systems;
      const biomeByName={Mercury:6,Venus:1,Earth:7,Mars:1,Jupiter:12,Saturn:12,Uranus:12,Neptune:12,'TRAPPIST-1 b':3,'TRAPPIST-1 c':1,'TRAPPIST-1 d':1,'TRAPPIST-1 e':7,'TRAPPIST-1 f':10,'TRAPPIST-1 g':10,'TRAPPIST-1 h':6,'TOI-270 b':1,'TOI-270 c':12,'K2-141 b':3,'WASP-76 b':12};
      for (const [si,system] of systems.entries()) {
        const cell=[si,0,0],bodies=[];
        for(const [j,record] of system.planets.entries()) {
          const ix=this.catalog.length,s=record.worldSeed,r=random(s),biome=biomeByName[record.name]??6,B=BIOMES[biome];
          const rad=Math.max(160,Math.min(3600,Math.sqrt(record.radiusEarth||1)*900)),orbit=7000+j*14000,theta=j*2.399;
          const center=add(mul(cell,SECTOR),[Math.cos(theta)*orbit,(r()-.5)*orbit*.05,Math.sin(theta)*orbit]);
          const body={id:'SP-'+record.id,index:ix,systemIndex:si,seed:s,name:record.name,system:system.name==='Sun'?'Sol':system.name,cell,center,radius:rad,type:B.type,biome,kind:B.name,flora:B.flora,liquid:B.liquid,
            amp:B.type===3?0:.0025+r()*.002,frequency:.75+r()*.75,terrainBase:B.type===1?.53:.44,offset:[s%57,(s>>>8)%59,(s>>>16)%61],color:'rgb('+B.tint.map(v=>Math.min(245,Math.round(v*145))).join(',')+')',tint:B.tint.slice(),plantColor:B.plantColor.slice(),temperature:record.name==='Earth'?15:record.name==='TRAPPIST-1 e'?8:(record.equilibriumK??250)-273.15,humidity:B.humidity,
            gravity:record.massEarth&&record.radiusEarth?9.807*record.massEarth/(record.radiusEarth**2):5,atmosphere:B.type===0?0:B.type===3?.028:.014,rings:record.name==='Saturn',settlementStyle:s%4,population:1600+s%12000,sea:0,foodweb:B.foodweb,
            catalog:record,host:system,physicalRadiusKm:(record.radiusEarth??1)*6371,appearanceTier:'artistic',sourceUrl:'https://cosmoplot.io/',systemDistancePc:system.distancePc};
          // Desert biome defaults describe fictional oases, not present-day Sol.
          // Venus/Mars must not inherit open water or a negative humidity value.
          if(['Venus','Mars','Mercury'].includes(record.name)){body.liquid=0;body.humidity=0;}
          if(record.name==='Venus')body.temperature=464;
          bodies.push(body);this.catalog.push(body);
        }
        this.cache.set(cell.join(','),bodies);
      }
    }

    cell(p) { return [clamp(Math.round(p[0]/SECTOR),0,SpacePatriotCatalog.systems.length-1),0,0]; }
    system(c) { return this.cache.get(clamp(Math.round(c[0]),0,SpacePatriotCatalog.systems.length-1)+',0,0'); }
    byId(id) {return typeof id==='number'?this.catalog[id]||null:this.catalog.find(b=>b.id===id)||null;}
    active(p,pinned=null) {return this.catalog.length<=20?this.catalog:this.catalog.slice().sort((a,b)=>length(sub(p,a.center))-a.radius-length(sub(p,b.center))+b.radius).slice(0,20);}
    renderBodies(position,forward,fov,aspect,pixels,pinned=null,probe=false) {
      const nearest=this.nearest(position).body,halfAngle=Math.atan(fov*Math.hypot(aspect,1)),pixelAngle=2*Math.atan(fov)/Math.max(1,pixels),sun=unit(sub(nearest.orbit?.star||add(position,mul(C.SUN,1e8)),position));
      return this.catalog.filter(b=>{
        if(b.id===nearest.id||b.id===pinned?.id)return true;
        const delta=sub(b.center,position),distance=length(delta),radius=b.radius*(b.rings?2.34:1+Math.max(b.amp,b.atmosphere)),angle=Math.asin(clamp(radius/distance,0,1));
        if(distance<radius*2)return true;
        if(angle<pixelAngle*.45)return false;
        // Retain bodies crossing the light source, even outside the view cone.
        if(dot(unit(delta),sun)>Math.cos(angle+.012))return true;
        if(probe)return true;
        return dot(unit(delta),forward)>Math.cos(Math.min(Math.PI,halfAngle+angle+.03));
      });
    }
    neighbors(p) {return [...this.cache.values()].filter(a=>a[0].cell[0]!==this.cell(p)[0]).map(a=>a[0]);}
    rawHeight(b, n) {
      if (b.type === 3) return 0;
      const o = b.offset,
        N = this.noise,
        noise = (s) =>
          N.sample(
            n[0] * s * b.frequency + o[0],
            n[1] * s * b.frequency + o[1],
            n[2] * s * b.frequency + o[2],
          );
      const q = 2 * noise(12) - 1,
        v =
          0.58 * noise(3.5) +
          0.26 * (1 - q * q) +
          0.14 * noise(42) +
          0.02 * noise(135);
      return b.radius * b.amp * (v - b.terrainBase - 0.02);
    }
    baseHeight(b, n) {
      const h = this.rawHeight(b, n);
      return b.liquid ? Math.max(h, b.sea) : h;
    }
    site(b) {
      if (this.sites.has(b.id)) return this.sites.get(b.id);
      const r = random(b.seed ^ 23991);
      let n = unit([0.2 + r() * 0.3, 0.65 + r() * 0.18, 0.42 + r() * 0.28]);
      // Choose a low shoreline where available, not a random mountain peak.
      if (b.liquid && b.type !== 3) {
        let score = Infinity;
        for (let k = 0; k < 44; k++) {
          const t = unit([
              0.15 + r() * 0.7,
              0.35 + r() * 0.8,
              0.15 + r() * 0.7,
            ]),
            h = this.rawHeight(b, t);
          const q = Math.abs(h - 0.012);
          if (q < score) {
            score = q;
            n = t;
          }
        }
      }
      const h =
        (b.type === 3
          ? b.radius * b.atmosphere * .50
          : Math.max(this.baseHeight(b, n), b.sea)) + 0.022;
      const right = unit(cross([0, 1, 0], n)),
        forward = unit(cross(right, n));
      const site = {
        id: b.id + "-port",
        body: b,
        center: add(b.center, mul(n, b.radius + h)),
        up: n,
        right,
        forward,
        height: h,
        style: b.settlementStyle,
        name:
          b.name +
          " " +
          ["Landing", "Harbor", "Gardens", "Exchange"][b.settlementStyle],
      };
      this.sites.set(b.id, site);
      return site;
    }
    height(b, n) {
      let h = this.baseHeight(b, n);
      const site = this.site(b),
        cos = dot(n, site.up);
      if (cos > 0.98) {
        const p = mul(n, b.radius),
          d = Math.max(
            Math.abs(dot(p, site.right)),
            Math.abs(dot(p, site.forward)),
          );
        if (d < (site.extent||.28)) {
          const feather=(site.extent||.28)<.15?.016:.04;
          const f = 1 - smooth(clamp((d - (site.extent||.28)+feather) / feather, 0, 1));
          h = h * (1 - f) + ((b.radius + site.height) / cos - b.radius) * f;
        }
      }
      return h;
    }
    liquidAt(p, b) {
      const q = sub(p, b.center),
        n = unit(q);
      return (
        !!b.liquid &&
        this.rawHeight(b, n) < b.sea - 0.0001 &&
        length(q) < b.radius + b.sea + 0.002 &&
        length(sub(p, this.site(b).center)) > .29
      );
    }
    groundHeight(b, n) {
      return b.liquid
        ? Math.min(this.height(b, n), this.rawHeight(b, n))
        : this.height(b, n);
    }
    gravityAt(p, b) {
      const q = sub(b.center, p),
        d = Math.max(length(q), b.radius * 0.25);
      return mul(
        unit(q),
        ((b.gravity / 1000) * (b.radius * b.radius)) / (d * d),
      );
    }
    toLocal(p, f) {
      return local(p, f);
    }
    fromLocal(q, f) {
      return global(q, f);
    }
    station(b) {
      if (this.stations.has(b.id)) return this.stations.get(b.id);
      const site = this.site(b),
        s = {
          ...site,
          id: b.id + "-station",
          name:
            b.name +
            " " +
            ["Wayhouse", "Relay", "Anchorage", "Terminal"][b.seed % 4],
          center: add(site.center, mul(site.up, Math.max(6, b.radius * 0.15))),
          style: b.seed % 3,
        };
      this.stations.set(b.id, s);
      return s;
    }
    nearestStation(p, bodies = this.active(p)) {
      let best = null;
      for (const b of bodies) {
        const station = this.station(b),
          d = length(sub(p, station.center));
        if (!best || d < best.distance) best = { station, distance: d };
      }
      return best;
    }
    stationField(q, s) {
      const outer = sqBox(q, [0.48, 0.29, 0.7]),
        inner = sqBox(sub(q, [0, 0.025, 0.12]), [0.345, 0.215, 0.735]);
      let d = Math.max(outer, -inner);
      const ring =
        Math.hypot(Math.hypot(q[0], q[1]) - 0.92, q[2] + 0.26) - 0.055;
      d = Math.min(d, ring);
      for (const sign of [-1, 1]) {
        d = Math.min(
          d,
          sqBox(sub(q, [sign * 1.28, 0, -0.22]), [0.43, 0.024, 0.55]),
          sqBox(sub(q, [sign * 0.72, 0, -0.26]), [0.35, 0.035, 0.035]),
          sqBox(sub(q, [0, sign * 0.65, -0.26]), [0.035, 0.32, 0.035]),
        );
      }
      // Internal cargo pods leave the center taxi lane clear.
      for (const sign of [-1, 1])
        d = Math.min(
          d,
          sqBox(sub(q, [sign * 0.29, -0.145, -0.26]), [0.037, 0.048, 0.18]),
        );
      return d;
    }
    cityField(q, b) {
      let d = sqBox(sub(q, [0, -0.007, 0]), [0.9, 0.008, 0.9]);
      const ix = Math.floor((q[0] + 0.08) / 0.16),
        iz = Math.floor((q[2] + 0.08) / 0.16);
      if (
        Math.abs(ix) <= 4 &&
        Math.abs(iz) <= 4 &&
        ix !== 0 &&
        Math.hypot(ix, iz) > 1.6
      ) {
        const rng =
            hash(((ix + 29) * 73856093) ^ ((iz + 41) * 19349663) ^ b.seed) /
            4294967296,
          h = 0.034 + rng * 0.19 * (b.settlementStyle === 2 ? 0.65 : 1);
        d = Math.min(
          d,
          sqBox(sub(q, [ix * 0.16, 0.002, iz * 0.16]), [0.052, 0.003, 0.054]),
        );
        d = Math.min(
          d,
          sqBox(sub(q, [ix * 0.16, h * 0.5 + 0.009, iz * 0.16]), [
            0.047,
            h * 0.5,
            0.049,
          ]) - 0.005,
        );
      }
      d = Math.min(d, sqBox(sub(q, [0, 0.106, -0.32]), [0.34, 0.008, 0.028]));
      for (const sign of [-1, 1])
        d = Math.min(
          d,
          sqBox(sub(q, [sign * 0.31, 0.055, -0.32]), [0.006, 0.06, 0.022]),
        );
      const fp = sub(q, [0, 0.016, -0.12]);
      d = Math.min(
        d,
        Math.max(Math.hypot(fp[0], fp[2]) - 0.032, Math.abs(fp[1]) - 0.012),
      );
      return d;
    }
    structures(p, nearBody) {
      const ns = this.nearestStation(p),
        ss =
          ns.distance < 2.5
            ? this.stationField(local(p, ns.station), ns.station)
            : Infinity;
      const site = this.site(nearBody),
        q = local(p, site);
      return Math.min(
        ss,
        Math.max(Math.abs(q[0]), Math.abs(q[2])) < 1.1
          ? this.cityField(q, nearBody)
          : Infinity,
      );
    }
    move(a, z, bodies, clearance = 0.008, allowWater = false) {
      const delta = sub(z, a),
        len = length(delta);
      if (len < 1e-12) return { position: a.slice(), hit: false };
      const rd = mul(delta, 1 / len),
        near = this.nearest(a, bodies),
        site = this.site(near.body),
        ns = this.nearestStation(a, bodies);
      // Base terrain sweep prevents high-speed planet tunneling; liquids are a shallow special case.
      let result;
      if (allowWater && this.liquidAt(z, near.body) && near.altitude < 0.03) {
        const p = z.slice(),
          b = near.body,
          n = unit(sub(p, b.center)),
          minR = b.radius + this.rawHeight(b, n) + clearance;
        result = {
          position:
            length(sub(p, b.center)) < minR ? add(b.center, mul(n, minR)) : p,
          hit: false,
        };
      } else result = super.sweep(a, z, bodies, clearance);
      const end = length(sub(result.position, a));
      if (ns.distance > len + 2.5 && length(sub(a, site.center)) > len + 1.8)
        return result;
      let t = 0,
        last = 0;
      for (let i = 0; i < 192 && t <= end; i++) {
        const p = add(a, mul(rd, t)),
          q = local(p, site);
        let d = Infinity;
        if (length(sub(p, ns.station.center)) < 2.5)
          d = this.stationField(local(p, ns.station), ns.station);
        if (Math.max(Math.abs(q[0]), Math.abs(q[2])) < 1.08)
          d = Math.min(d, this.cityField(q, near.body));
        if (d < clearance - 0.00001) {
          if (t === 0) {
            const d2 = this.structures(add(p, mul(rd, 0.0005)), near.body);
            if (d2 > d + 0.00001) {
              t = 0.0005;
              continue;
            }
          }
          return { position: add(a, mul(rd, Math.max(0, last))), hit: true };
        }
        last = t;
        t += Math.max(0.0002, Math.min(0.08, (d - clearance) * 0.65));
      }
      if (t < end) return { position: add(a, mul(rd, last)), hit: true };
      return result;
    }
    // Signed contact field shared by the swept-slide response. The terrain term
    // keeps the CPU's existing water/solid distinction; local walls use the same
    // collision solids as ordinary flight. Distances and the skin are in km.
    contactDistance(p, b, allowWater = false) {
      const rel = sub(p, b.center),
        n = unit(rel);
      const h =
        allowWater && this.liquidAt(p, b)
          ? this.rawHeight(b, n)
          : this.height(b, n);
      return Math.min(length(rel) - b.radius - h, this.structures(p, b));
    }
    contactNormal(p, b, allowWater = false) {
      const e = 0.00004,
        d = [];
      for (let i = 0; i < 3; i++) {
        const a = p.slice(),
          z = p.slice();
        a[i] += e;
        z[i] -= e;
        d.push(
          this.contactDistance(a, b, allowWater) -
            this.contactDistance(z, b, allowWater),
        );
      }
      return unit(d, unit(sub(p, b.center)));
    }
    moveAndSlide(a, z, bodies, clearance = 0.008, allowWater = false) {
      let p = a.slice(),
        remaining = sub(z, a),
        hit = false;
      const normals = [],
        skin = 0.00006;
      // Four planes suffice for a floor/wall/corner contact. We do not move through
      // solids after exhausting this work budget: the unconsumed displacement stops.
      for (let pass = 0; pass < 4 && length(remaining) > 1e-10; pass++) {
        const result = this.move(
          p,
          add(p, remaining),
          bodies,
          clearance,
          allowWater,
        );
        const traveled = sub(result.position, p);
        p = result.position;
        if (!result.hit) break;
        hit = true;
        const b = this.nearest(p, bodies).body,
          n = this.contactNormal(p, b, allowWater);
        normals.push(n);
        remaining = sub(remaining, traveled);
        const into = dot(remaining, n);
        if (into < 0) remaining = sub(remaining, mul(n, into));
        // The old walker stopped a few micrometres INSIDE its contact boundary.
        // Re-establish a small positive gap before doing the tangential sweep.
        const penetration =
          clearance + skin - this.contactDistance(p, b, allowWater);
        if (penetration > 0)
          p = add(p, mul(n, Math.min(penetration, clearance + 0.002)));
        if (into >= 0 && pass > 0) break;
      }
      return { position: p, hit, normals };
    }
    ecosystem(b) {
      if (!this.ecosystems.has(b.id))
        this.ecosystems.set(b.id, new Ecosystem(b));
      return this.ecosystems.get(b.id);
    }
    vegetation(p, b, max = 40) {
      const site = this.site(b),
        nearSite = length(sub(p, site.center)) < 3;
      let frame = site;
      if (!nearSite) {
        const n = unit(sub(p, b.center)),
          snap = unit(n.map((v) => Math.round(v * 500) / 500));
        const right = unit(cross([0, 1, 0], snap)),
          forward = unit(cross(right, snap));
        frame = {
          center: add(b.center, mul(snap, b.radius + this.height(b, snap))),
          up: snap,
          right,
          forward,
        };
      }
      const q = local(p, frame),
        gx = Math.floor(q[0] / 0.055),
        gz = Math.floor(q[2] / 0.055),
        key =
          b.id +
          ":" +
          gx +
          ":" +
          gz +
          ":" +
          nearSite +
          ":" +
          frame.up.map((v) => v.toFixed(4)).join(",");
      if (key === this._plantsKey) return this._plants;
      let plants = [];
      for (let x = gx - 5; x <= gx + 5; x++)
        for (let z = gz - 5; z <= gz + 5; z++) {
          const s = hash(
              b.seed ^
                Math.imul(x + 90000, 73856093) ^
                Math.imul(z + 90000, 19349663),
            ),
            r = random(s);
          if (r() > (b.biome === 6 ? 0.2 : 0.42 + b.humidity * 0.5)) continue;
          let xx = (x + (r() - 0.5) * 0.65) * 0.055;
          const zz = (z + (r() - 0.5) * 0.65) * 0.055;
          if (nearSite && Math.abs(xx) < 0.9 && Math.abs(zz) < 0.9) {
            if (Math.abs(xx) < 0.7) {
              if (
                Math.abs(Math.abs(xx) - 0.083) > 0.025 ||
                z % 3 !== 0 ||
                Math.abs(zz) < 0.25
              )
                continue;
              xx = Math.sign(xx) * 0.083;
            }
          }
          const seedpos = global([xx, 0, zz], frame),
            n = unit(sub(seedpos, b.center)),
            raw = this.rawHeight(b, n),
            h = this.height(b, n);
          const d = length(sub(seedpos, site.center));
          if (b.liquid && raw < -0.001 && d > 1.05 && b.flora !== 4) continue;
          if ((b.biome === 6 || b.type === 3) && d > 1) continue;
          const position = add(b.center, mul(n, b.radius + h + 0.0002));
          const size =
            (b.flora === 0
              ? 0.011
              : b.flora === 1
                ? 0.007
                : b.flora === 3
                  ? 0.008
                  : 0.005) *
            (0.65 + r() * 1.3) *
            (nearSite && Math.abs(xx) < 0.7 ? 0.65 : 1);
          plants.push({
            position,
            size,
            variant: s % 11,
            d: length(sub(position, p)),
          });
        }
      plants.sort((a, b) => a.d - b.d);
      this._plantsKey = key;
      this._plants = plants.slice(0, max);
      this.plantFrame = frame;
      return this._plants;
    }
    surveySite(b) {
      if (b.biome === 6 || b.type === 3) return this.site(b);
      if (this.surveySites.has(b.id)) return this.surveySites.get(b.id);
      const port = this.site(b),
        r = random(b.seed ^ 70491);
      let n = port.up,
        score = Infinity;
      for (let k = 0; k < 160; k++) {
        const angle = r() * Math.PI * 2,
          d = 2.1 + r() * 7.5,
          t = unit(
            add(
              port.up,
              add(
                mul(port.right, (Math.cos(angle) * d) / b.radius),
                mul(port.forward, (Math.sin(angle) * d) / b.radius),
              ),
            ),
          ),
          h = this.rawHeight(b, t);
        const tangent = unit(cross(t, [0, 1, 0])),
          bitangent = unit(cross(t, tangent)),
          stepv = 0.003 / b.radius;
        const slope = Math.max(
          ...[tangent, bitangent].map(
            (axis) =>
              Math.abs(
                this.rawHeight(b, unit(add(t, mul(axis, stepv)))) -
                  this.rawHeight(b, unit(add(t, mul(axis, -stepv)))),
              ) / 0.006,
          ),
        );
        const altitudeScore = b.liquid
          ? Math.abs(h - 0.008) + (h < 0 ? 0.05 : 0)
          : Math.abs(h) * 0.04 + d * 0.001;
        const v = altitudeScore + Math.max(0, slope - 0.2) * 10;
        if (v < score) {
          score = v;
          n = t;
        }
      }
      const h = this.height(b, n),
        right = unit(cross([0, 1, 0], n)),
        forward = unit(cross(right, n));
      const site = {
        body: b,
        center: add(b.center, mul(n, b.radius + h)),
        up: n,
        right,
        forward,
        height: h,
        name: b.name + " field site",
      };
      this.surveySites.set(b.id, site);
      return site;
    }
    market(b) {
      const r = random(b.seed ^ 19177);
      return {
        ore: 12 + Math.floor(r() * 22),
        organics: 18 + Math.floor(r() * 35),
        crystal: 38 + Math.floor(r() * 55),
      };
    }
  }
  class Flight extends BaseFlight {
    constructor(w) {
      super(w);
      this.ship = {
        hull: 100,
        fuel: 100,
        credits: 1200,
        capacity: 24,
        cargo: { ore: 0, organics: 0, crystal: 0 },
        scanned: new Set(),
        data: 0,
        shield: 1,
      };
      this.docked = null;
      this.assist = true;
      this.walking = false;
      this.grounded = false;
      this.sampleTimer = 0;
      this.message = "";
    }
    reset() {
      const b = this.world.system([0, 0, 0]).find(b=>b.name==='Earth'),
        site = this.world.site(b);
      this.position = global([0, 0.014, b.activeSettlement?.kind==='outpost'?.048:.094], site);
      this.forward = unit(add(mul(site.forward, -1), mul(site.up, 0.07)));
      this.up = site.up.slice();
      this.velocity = [0, 0, 0];
      this.speed = 0;
      this.route = null;
      this.throttle = 1;
      this.assist = true;
      this.walking = false;
      this.docked = null;
      this.mode = "SURFACE PORT";
      this.orthogonalize();
    }
    planDeparture(target) {
      const start = this.position.slice(),
        ns = this.world.nearestStation(start),
        q = local(start, ns.station),
        segments = [];
      if (
        ns.distance < 1.15 &&
        Math.abs(q[0]) < 0.345 &&
        q[1] > -0.21 &&
        q[1] < 0.25 &&
        q[2] > -0.62 &&
        q[2] < 0.8
      ) {
        const align = global([0, 0.015, Math.max(-0.4, q[2])], ns.station),
          exit = global([0, 0.015, 1.3], ns.station);
        segments.push(
          line(start, align, 2, "RELEASING CLAMPS"),
          line(align, exit, 6, "LEAVING HANGAR"),
        );
        this.position = exit;
      }
      let r;
      try {
        r = super.transfer(target, true);
      } finally {
        this.position = start;
      }
      if (segments.length) {
        r.segments.unshift(...segments);
        r.departureStation = ns.station;
        r.total += 8;
      }
      return r;
    }
    transfer(target, orbitOnly = false) {
      this.docked = null;
      this.walking = false;
      this.assist = true;
      const r = this.planDeparture(target);
      if (orbitOnly) return r;
      const site = this.world.site(target),
        end = r.segments.at(-1).at(1),
        n = unit(sub(end, target.center)),
        rad = length(sub(end, target.center));
      r.segments.push(arc(target.center, n, site.up, rad, 4, "PORT ALIGNMENT"));
      const apron=target.activeSettlement?.kind==='outpost'?.048:.094;
      const above = global([0, 1.0, apron], site),
        from = add(target.center, mul(site.up, rad));
      r.segments.push(
        line(from, above, 8, "SETTLEMENT DESCENT"),
        line(above, global([0, 0.014, apron], site), 5, "SURFACE PORT APPROACH"),
      );
      r.total = r.segments.reduce((s, v) => s + v.duration, 0);
      r.orbitOnly = false;
      r.kind = "port";
      r.site = site;
      return r;
    }
    toSurvey(b) {
      if (b.biome === 6 || b.type === 3) return this.transfer(b, false);
      this.docked = null;
      this.walking = false;
      this.assist = true;
      const r = this.planDeparture(b),
        site = this.world.surveySite(b),
        end = r.segments.at(-1).at(1),
        n = unit(sub(end, b.center)),
        rad = length(sub(end, b.center));
      r.segments.push(
        arc(b.center, n, site.up, rad, 4, "WILDERNESS ALIGNMENT"),
      );
      const above = global([0, 0.65, 0], site),
        low = global([0, 0.012, 0], site);
      r.segments.push(
        line(add(b.center, mul(site.up, rad)), above, 8, "FIELD SITE DESCENT"),
        line(above, low, 5, "WILDERNESS APPROACH"),
      );
      r.total = r.segments.reduce((a, v) => a + v.duration, 0);
      r.kind = "survey";
      r.site = site;
      r.target = b;
      r.orbitOnly = false;
      return r;
    }
    toStation(b) {
      this.docked = null;
      this.walking = false;
      this.assist = true;
      const r = this.planDeparture(b),
        station = this.world.station(b),
        end = r.segments.at(-1).at(1),
        n = unit(sub(end, b.center)),
        rad = length(sub(end, b.center));
      r.segments.push(
        arc(b.center, n, station.up, rad, 4, "ORBITAL STATION ALIGNMENT"),
      );
      const front = global([0, 0.03, 3], station),
        entry = global([0, 0.03, 1.0], station),
        inside = global([0, -0.12, 0.12], station);
      r.segments.push(
        line(add(b.center, mul(station.up, rad)), front, 7, "STATION APPROACH"),
        line(front, entry, 5, "HANGAR ALIGNMENT"),
        line(entry, inside, 8, "FLYING THROUGH OPEN HANGAR"),
      );
      r.total = r.segments.reduce((s, v) => s + v.duration, 0);
      r.kind = "station";
      r.station = station;
      r.target = b;
      return r;
    }
    place(b, mode = "orbit") {
      this.docked = null;
      this.walking = false;
      this.assist = true;
      if (mode === "surface") {
        this.cancel();
        const s = this.world.site(b);
        this.position = global([0, 0.014, 0.094], s);
        this.up = s.up.slice();
        this.forward = unit(add(mul(s.forward, -1), mul(s.up, 0.07)));
        this.orthogonalize();
        this.mode = "SURFACE PORT";
      } else super.place(b, mode);
    }
    dock() {
      const ns = this.world.nearestStation(this.position),
        q = local(this.position, ns.station);
      if (
        ns.distance > 1 ||
        Math.abs(q[0]) > 0.22 ||
        q[1] < -0.2 ||
        q[1] > 0.14 ||
        q[2] < -0.44 ||
        q[2] > 0.6 ||
        length(this.velocity) > 0.06
      ) {
        this.message =
          "Enter the hangar, stay in the center lane, and slow below 60 m/s.";
        return false;
      }
      this.cancel();
      this.docked = ns.station;
      this.walking = false;
      this.assist = true;
      this.message = "Docking clamps engaged. Station services online.";
      return true;
    }
    undock() {
      if (!this.docked) return false;
      const s = this.docked;
      this.docked = null;
      this.walking = false;
      this.assist = true;
      const segments = [
        line(this.position, global([0, 0.015, 0.12], s), 2, "RELEASING CLAMPS"),
        line(
          global([0, 0.015, 0.12], s),
          global([0, 0.015, 1.3], s),
          6,
          "LEAVING HANGAR",
        ),
      ];
      this.route = {
        segments,
        index: 0,
        elapsed: 0,
        total: 8,
        time: 0,
        kind: "depart",
        target: s.body,
        station: s,
        orbitOnly: true,
      };
      return true;
    }
    service(action, resource) {
      if (!this.docked) return false;
      const s = this.ship,
        b = this.docked.body;
      if (action === "repair") {
        const cost = Math.ceil((100 - s.hull) * 2);
        if (!cost || s.credits < cost) return false;
        s.credits -= cost;
        s.hull = 100;
      } else if (action === "fuel") {
        const cost = Math.ceil((100 - s.fuel) * 1.4);
        if (!cost || s.credits < cost) return false;
        s.credits -= cost;
        s.fuel = 100;
      } else if (action === "sellData") {
        if (!s.data) return false;
        s.credits += s.data * 320;
        s.data = 0;
      } else if (action === "upgrade") {
        if (s.credits < 900 || s.capacity >= 80) return false;
        s.credits -= 900;
        s.capacity += 8;
        s.shield = Math.min(4, s.shield + 0.25);
      } else if (action === "buy") {
        if (
          !Object.hasOwn(s.cargo, resource) ||
          this.cargoCount() >= s.capacity
        )
          return false;
        const cost = Math.ceil(this.world.market(b)[resource] * 1.2);
        if (s.credits < cost) return false;
        s.credits -= cost;
        s.cargo[resource]++;
      } else if (action === "sell") {
        if (!Object.hasOwn(s.cargo, resource) || s.cargo[resource] < 1)
          return false;
        s.cargo[resource]--;
        s.credits += this.world.market(b)[resource];
      } else return false;
      return true;
    }
    cargoCount() {
      return Object.values(this.ship.cargo).reduce((a, b) => a + b, 0);
    }
    scan() {
      const near = this.nearest();
      if (near.altitude > near.body.radius * 0.6) {
        this.message =
          "Move closer than 0.6 planet radii to resolve the ecosystem.";
        return false;
      }
      if (this.ship.scanned.has(near.body.id)) {
        this.message =
          "Already surveyed. Open the ecology panel to inspect live populations.";
        return false;
      }
      this.ship.scanned.add(near.body.id);
      this.ship.data++;
      this.message =
        "Ecology survey stored. Sell the data at any station for 320 credits.";
      return true;
    }
    collect(ignoreCooldown = false) {
      const near = this.nearest();
      if (near.altitude > 0.15 || this.docked) {
        this.message = "Descend below 150 m to collect a surface sample.";
        return false;
      }
      if (!ignoreCooldown && this.sampleTimer > 0) {
        this.message = "Sampler cooling down.";
        return false;
      }
      if (this.cargoCount() >= this.ship.capacity) {
        this.message = "Cargo is full. Sell samples at a station.";
        return false;
      }
      const b = near.body,
        resource =
          b.flora === 3 ? "crystal" : b.humidity > 0.5 ? "organics" : "ore";
      this.ship.cargo[resource]++;
      this.sampleTimer = 3;
      const e = this.world.ecosystem(b);
      e.populations[0] *= 0.999;
      this.message =
        "Collected " +
        resource +
        ". Cargo " +
        this.cargoCount() +
        "/" +
        this.ship.capacity +
        ".";
      return true;
    }
    toggleWalk() {
      if (this.walking) {
        this.walking = false;
        this.assist = true;
        this.message = "Flight mode. Lift with Space.";
        return true;
      }
      const ns = this.world.nearestStation(this.position),
        q = local(this.position, ns.station);
      if (
        this.nearest().altitude > 0.15 &&
        !(ns.distance < 0.8 && Math.abs(q[0]) < 0.33)
      ) {
        this.message =
          "Land near a surface or enter a hangar before leaving the flight seat.";
        return false;
      }
      this.walking = true;
      this.docked = null;
      this.velocity = [0, 0, 0];
      this.assist = false;
      this.cancel();
      this.message =
        "On foot: WASD to walk, Space to jump, J to return to flight.";
      return true;
    }
    update(dt, input = {}) {
      dt = clamp(dt, 0, 0.1);
      if (!dt) return;
      this.sampleTimer = Math.max(0, (this.sampleTimer || 0) - dt);
      this.world.elapsed += dt;
      const near = this.nearest(),
        e = this.world.ecosystem(near.body);
      e.update(dt, near.altitude < 2);
      if (
        this.route &&
        (Math.abs(input.forward || 0) +
          Math.abs(input.strafe || 0) +
          Math.abs(input.lift || 0) >
          0 ||
          input.brake)
      )
        this.cancel();
      if (this.route) {
        const r = this.route;
        super.update(dt, input);
        if (this.route) {
          const seg = r.segments[r.index];
          const leaving = ["LEAVING HANGAR", "RELEASING CLAMPS"].includes(
              seg?.label,
            ),
            st = leaving ? r.departureStation || r.station : r.station;
          if (
            st &&
            [
              "STATION APPROACH",
              "HANGAR ALIGNMENT",
              "FLYING THROUGH OPEN HANGAR",
              "LEAVING HANGAR",
              "RELEASING CLAMPS",
            ].includes(seg?.label)
          ) {
            this.forward = slerp(
              this.forward,
              leaving ? st.forward : mul(st.forward, -1),
              1 - Math.exp(-dt * 3),
            );
            this.up = st.up.slice();
            this.orthogonalize();
          }
          if (
            (r.kind === "port" || r.kind === "survey") &&
            !seg?.heading && (seg?.label.includes("PORT") || seg?.label.includes("WILDERNESS"))
          ) {
            this.forward = slerp(
              this.forward,
              unit(add(mul(r.site.forward, -1), mul(r.site.up, 0.08))),
              1 - Math.exp(-dt * 3),
            );
            this.up = r.site.up.slice();
            this.orthogonalize();
          }
        } else if (r.kind === "station" || r.kind === "depart") {
          this.forward = mul(r.station.forward, r.kind === "depart" ? 1 : -1);
          this.up = r.station.up.slice();
          this.orthogonalize();
          this.message =
            r.kind === "station"
              ? "Inside hangar. Open Ship → Services to engage docking clamps."
              : "Clear of the station. Good travels.";
        } else if (r.kind === "port" || r.kind === "survey") {
          this.forward = unit(
            add(mul(r.site.forward, -1), mul(r.site.up, 0.07)),
          );
          this.up = r.site.up.slice();
          this.orthogonalize();
        }
        this.ship.fuel = Math.max(2, this.ship.fuel - dt * 0.032);
        return;
      }
      if (this.docked) {
        this.velocity = [0, 0, 0];
        this.speed = 0;
        this.mode = "DOCKED · " + this.docked.name.toUpperCase();
        return;
      }
      const before = this.position.slice(),
        ns = this.world.nearestStation(this.position),
        stationQ = local(this.position, ns.station),
        stationInside =
          ns.distance < 1 &&
          Math.abs(stationQ[0]) < 0.345 &&
          stationQ[1] > -0.19 &&
          stationQ[1] < 0.24 &&
          stationQ[2] > -0.615 &&
          stationQ[2] < 0.855;
      const radial = stationInside
        ? ns.station.up
        : unit(sub(this.position, near.body.center));
      let front = this.forward,
        right = this.right;
      if (this.walking) {
        front = unit(
          sub(front, mul(radial, dot(front, radial))),
          ns.station.forward,
        );
        right = unit(cross(front, radial));
        this.up = slerp(this.up, radial, 1 - Math.exp(-dt * 6));
        this.orthogonalize();
      }
      const alt = Math.max(0, near.altitude),
        speed = this.walking
          ? input.boost
            ? 0.009
            : 0.0045
          : this.flightSpeed
            ? this.flightSpeed(near, stationInside, input)
            : stationInside
              ? 0.1 * this.throttle
              : Math.min(2e7, (alt + 0.06) * 0.8) *
                clamp(this.throttle, 0.05, 128) *
                (input.boost ? 8 : 1);
      let direction = add(
        add(mul(front, input.forward || 0), mul(right, input.strafe || 0)),
        mul(
          this.walking ? radial : this.up,
          this.walking ? 0 : input.lift || 0,
        ),
      );
      if (length(direction) > 1) direction = unit(direction);
      const thrust = length(direction) > 0 && this.ship.fuel > 0,
        desired = mul(direction, speed * (this.ship.fuel > 0 ? 1 : 0.12));
      if (this.walking) {
        let vertical = dot(this.velocity, radial),
          horizontal = sub(this.velocity, mul(radial, vertical));
        horizontal = mix(horizontal, desired, 1 - Math.exp(-dt * 12));
        if (input.lift > 0 && !this.jumpHeld && this.grounded) {
          vertical = 0.0065;
          this.grounded = false;
        }
        this.jumpHeld = input.lift > 0;
        this.velocity = add(horizontal, mul(radial, vertical));
      } else if (this.assist || thrust || input.brake) {
        if (this.applyThrust)
          this.applyThrust(input.brake ? [0, 0, 0] : desired, dt, input);
        else
          this.velocity = mix(
            this.velocity,
            input.brake ? [0, 0, 0] : desired,
            1 - Math.exp(-dt * (input.brake ? 18 : 6)),
          );
      }
      if (!this.assist || this.walking) {
        const gravity = stationInside
          ? mul(radial, -0.00981)
          : this.world.gravityAt(this.position, near.body);
        this.velocity = add(this.velocity, mul(gravity, dt));
      }
      const liquid = this.world.liquidAt(this.position, near.body);
      if (liquid) {
        const depth =
          near.body.radius - length(sub(this.position, near.body.center));
        this.velocity = mul(this.velocity, Math.exp(-dt * 1.4));
        if (near.body.liquid === 1) {
          this.velocity = add(
            this.velocity,
            mul(
              radial,
              (near.body.gravity / 1000 + Math.max(0, depth) * 0.8) * dt,
            ),
          );
          this.mode = "WATER · BUOYANCY";
        } else {
          this.ship.hull = Math.max(
            0,
            this.ship.hull -
              (dt * (near.body.liquid === 2 ? 14 : 5)) / this.ship.shield,
          );
          this.mode =
            near.body.liquid === 2 ? "LAVA · HEAT DAMAGE" : "ACID · CORROSION";
        }
      }
      const result = this.world.moveAndSlide(
        this.position,
        add(this.position, mul(this.velocity, dt)),
        this.world.active(this.position),
        this.walking ? 0.0018 : this.collisionClearance?.() || 0.008,
        true,
      );
      this.position = result.position;
      this.collided = result.hit;
      const supportGap = this.world.contactDistance(
          this.position,
          near.body,
          true,
        ),
        supportNormal = this.world.contactNormal(
          this.position,
          near.body,
          true,
        );
      this.grounded =
        (result.normals.some((n) => dot(n, radial) > 0.45) ||
          (supportGap <
            (this.walking ? 0.0018 : this.collisionClearance?.() || 0.008) +
              0.00013 &&
            dot(supportNormal, radial) > 0.45)) &&
        dot(this.velocity, radial) <= 0.0001;
      for (const n of result.normals) {
        const into = dot(this.velocity, n);
        if (into < 0) this.velocity = sub(this.velocity, mul(n, into));
      }
      if (this.walking && this.grounded && supportGap > .00155 && supportGap < .00208) {
        // Maintain one support distance instead of falling through the collision
        // tolerance and being pushed back up several centimetres each cycle.
        this.position=add(this.position,mul(supportNormal,.00186-supportGap));
        const into=dot(this.velocity,supportNormal);
        if(into<0)this.velocity=sub(this.velocity,mul(supportNormal,into));
      }
      if (thrust && !this.walking)
        this.ship.fuel = Math.max(
          0,
          this.ship.fuel - dt * (input.boost ? 0.1 : 0.018),
        );
      if (this.ship.hull <= 0) {
        this.ship.hull = 30;
        this.ship.fuel = Math.max(this.ship.fuel, 15);
        this.ship.credits = Math.max(0, this.ship.credits - 120);
        this.reset();
        this.message =
          "Emergency recovery at Briar. Rescue cost: up to 120 credits.";
      }
      this.speed = length(sub(this.position, before)) / dt;
      if (!liquid)
        this.mode = this.walking
          ? "ON FOOT"
          : stationInside
            ? "HANGAR · E TO DOCK"
            : near.altitude < near.body.radius * 0.03
              ? "SURFACE FLIGHT"
              : this.assist
                ? "SPACE · ASSIST ON"
                : "SPACE · GRAVITY / INERTIA";
      this.world.visited.add(this.world.cell(this.position).join(","));
    }
    exportSave() {
      return {
        version: 2,
        seed: this.world.seed,
        position: this.position.slice(),
        forward: this.forward.slice(),
        up: this.up.slice(),
        ship: {
          ...this.ship,
          cargo: { ...this.ship.cargo },
          scanned: [...this.ship.scanned],
        },
        walking: false,
        assist: true,
        ecology: [...this.world.ecosystems.entries()].map(([id, e]) => ({
          id,
          populations: e.populations.slice(),
          age: e.age,
        })),
      };
    }
    loadSave(s) {
      if (!s || s.version !== 2 || s.seed !== this.world.seed) return false;
      for (const k of ["position", "forward", "up"])
        if (
          !Array.isArray(s[k]) ||
          s[k].length !== 3 ||
          !s[k].every((v) => Number.isFinite(v) && Math.abs(v) < 1e12)
        )
          return false;
      if (length(s.forward) < 0.1 || length(s.up) < 0.1) return false;
      const v = s.ship;
      if (
        !v ||
        !Number.isFinite(v.credits) ||
        v.credits < 0 ||
        !Number.isFinite(v.hull) ||
        !Number.isFinite(v.fuel) ||
        !Number.isInteger(v.capacity) ||
        v.capacity < 24 ||
        v.capacity > 80
      )
        return false;
      if (
        !v.cargo ||
        Object.keys(v.cargo).length !== 3 ||
        !["ore", "organics", "crystal"].every(
          (k) => Number.isInteger(v.cargo[k]) && v.cargo[k] >= 0,
        ) ||
        Object.values(v.cargo).reduce((a, b) => a + b, 0) > v.capacity
      )
        return false;
      if (
        !Array.isArray(v.scanned) ||
        v.scanned.length > 10000 ||
        new Set(v.scanned).size !== v.scanned.length ||
        v.scanned.some(
          (id) => typeof id !== "string" || this.world.byId(id)?.id !== id,
        ) ||
        !Number.isInteger(v.data) ||
        v.data < 0 ||
        v.data > v.scanned.length
      )
        return false;
      if (
        s.ecology !== undefined &&
        (!Array.isArray(s.ecology) ||
          s.ecology.length > 10000 ||
          s.ecology.some(
            (e) =>
              !e ||
              typeof e.id !== "string" ||
              this.world.byId(e.id)?.id !== e.id ||
              !Array.isArray(e.populations) ||
              e.populations.length !== 4 ||
              e.populations.some(
                (v) => !Number.isFinite(v) || v < 0 || v > 1e7,
              ) ||
              !Number.isFinite(e.age) ||
              e.age < 0,
          ))
      )
        return false;
      if (s.ecology)
        for (const state of s.ecology) {
          const e = this.world.ecosystem(this.world.byId(state.id));
          e.populations = state.populations.slice();
          e.age = state.age;
        }
      this.cancel();
      this.position = s.position.slice();
      this.forward = unit(s.forward);
      this.up = unit(s.up);
      this.orthogonalize();
      this.ship = {
        ...v,
        cargo: { ...v.cargo },
        hull: clamp(v.hull, 1, 100),
        fuel: clamp(v.fuel, 0, 100),
        shield: clamp(Number(v.shield) || 1, 1, 4),
        scanned: new Set(v.scanned),
      };
      this.walking = false;
      this.assist = true;
      this.docked = null;
      return true;
    }
  }
  Object.assign(C, {
    BIOMES,
    Ecosystem,
    BaseUniverse,
    BaseFlight,
    Universe,
    Flight,
    sqBox,
  });
  return C;
});
