import {
  loadSurfaceArt,
  applySurfaceArt,
  surfaceFiles,
} from "./art-materials.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { T, frame, dispose, bake } from "./primitives.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMaterials } from "./materials.js";
import { buildCraft, buildCockpit, buildGun } from "./craft.js";
import {
  buildPort,
  buildStation,
  buildTerrainJob,
  buildPlants,
} from "./environment.js";
import { buildAnimal, buildAnimalLOD, animateAnimal, buildSentry, buildCitizen, animateCitizen } from "./fauna.js";
import { drawInstruments } from "./instruments.js";
import {SettlementStage} from './settlement-stage.js';
import {HangarStage} from "./hangar-stage.js";
import {ThrusterStage} from "./thruster-stage.js";
import {WeatherStage} from "./weather-stage.js";
import {CityStage} from "./city-stage.js";
import {WeaponStage} from './weapon-stage.js';
import {EngineStage} from "./engine-stage.js";
import {StellarStage} from './stellar-stage.js';
import {WeaponLighting} from './weapon-lighting.js';
import {SurfaceDetail} from './surface-detail.js';
import {Explosions} from './explosions.js';
import {CockpitOcclusion} from './view-culling.js';
const visualState = window.longwayVisualState = { ready: false, degraded: false };
class VisualStage {
  constructor(A, art) {
    this.app = A;
    this.enabled = false;
    this.frame = 0;
    this.captures = 0;
    this.animalModels = new Map();
    this.contactModels = new Map();
    this.materials = null;
    const canvas = document.createElement("canvas");
    canvas.id = "detailScene";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;";
    document.querySelector("#scene").after(canvas);
    this.canvas = canvas;
    const r = (this.renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    }));
    r.setPixelRatio(Math.min(devicePixelRatio, A.renderer.software ? .5 : A.renderer.quality===0 ? 1 : 1.5));
    r.setSize(innerWidth, innerHeight);
    r.setClearColor(0, 0);
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.24;
    r.outputColorSpace = T.SRGBColorSpace;
    this.gpuTimer=r.getContext().getExtension('EXT_disjoint_timer_query_webgl2');
    this.gpuQueries=[];this.gpuMs=null;this.lastResolutionChange=0;
    this.scene = new T.Scene();
    this.cockpitOcclusion=new CockpitOcclusion(this.scene);
    this.surfaceFog = new T.FogExp2(0x94b7c2, 0.00022);
    this.camera = new T.PerspectiveCamera(
      69,
      innerWidth / innerHeight,
      0.10,
      90000,
    );
    this.camera.position.set(0, 0, 0);
    this.scene.add(this.camera);
    const pm = new T.PMREMGenerator(r),
      room = new RoomEnvironment();
    this.environmentTarget = pm.fromScene(room, 0.035);
    this.environment = this.environmentTarget.texture;
    room.dispose();
    pm.dispose();
    this.scene.environment = this.environment;
    canvas.addEventListener('webglcontextlost',()=>{
      this.contextLost=true;this.gpuQueries=[];this.gpuMs=null;
      this.environmentTarget?.dispose();this.environmentTarget=null;
      // Render-target textures belong to the lost context. Dispose them while
      // it is lost, before Three creates new native texture handles.
      this.sun?.shadow.map?.dispose();if(this.sun)this.sun.shadow.map=null;
      this.ssao?.dispose();this.ssao=null;
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      this.contextLost=false;this.gpuTimer=r.getContext().getExtension('EXT_disjoint_timer_query_webgl2');this.gpuQueries=[];this.gpuMs=null;this.lastProbe=null;this.lastShadowBody=null;
      const pm=new T.PMREMGenerator(r),room=new RoomEnvironment();this.environmentTarget=pm.fromScene(room,.035);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;room.dispose();pm.dispose();A.renderer.needsRender=true;
      this.ssao=new SSAOPass(this.scene,this.camera,Math.round(innerWidth*.6),Math.round(innerHeight*.6),12);this.ssao.renderToScreen=true;
    });
    this.scene.environmentIntensity = 0.4;
    const hemi = (this.hemi = new T.HemisphereLight(0xa4bdc6, 0x565346, 2.4));
    this.scene.add(hemi);
    const sun = (this.sun = new T.DirectionalLight(0xffe6be, 3.7));
    sun.castShadow = true;
    const shadowSize=Math.min(A.renderer.quality===0?1024:2048,r.capabilities.maxTextureSize);sun.shadow.mapSize.set(shadowSize,shadowSize);
    sun.shadow.bias = -0.00003;
    sun.shadow.normalBias = 0.04;
    sun.shadow.camera.left = -170;
    sun.shadow.camera.right = 170;
    sun.shadow.camera.top = 170;
    sun.shadow.camera.bottom = -170;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 2600;
    this.scene.add(sun, sun.target);
    this.cabinLight = new T.PointLight(0xb4bcb1, 22, 9, 2);
    this.scene.add(this.cabinLight);
    this.materials = applySurfaceArt(createMaterials(r), art);
    this.surfaceArt = surfaceFiles;
    this.assetFallbacks = art.failures;
    this.station = buildStation(this.materials);
    this.scene.add(this.station);
    this.cockpit = buildCockpit(this.materials);
    this.scene.add(this.cockpit);
    this.rifle = buildGun(this.materials);
    this.sidearm = buildGun(this.materials, true);
    this.camera.add(this.rifle, this.sidearm);
    this.rifle.position.set(0.2, -0.21, -0.41);
    this.sidearm.position.set(0.15, -0.17, -0.32);
    this.shotGeometry = new T.BufferGeometry();
    this.shotGeometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(64 * 6), 3),
    );
    this.shotGeometry.setAttribute(
      "color",
      new T.BufferAttribute(new Float32Array(64 * 6), 3),
    );
    this.shots = new T.LineSegments(
      this.shotGeometry,
      new T.LineBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        transparent: true,
        opacity: 0.95,
      }),
    );
    this.shots.frustumCulled = false;
    this.scene.add(this.shots);
    this.ssao = new SSAOPass(
      this.scene,
      this.camera,
      Math.round(innerWidth * 0.6),
      Math.round(innerHeight * 0.6),
      12,
    );
    this.ssao.renderToScreen = true;
    this.engines = new EngineStage(this);this.weaponEffects=new WeaponStage(this);this.stellar=new StellarStage(this);this.weaponLighting=new WeaponLighting(this);
    this.surfaceDetail = new SurfaceDetail(this);
    this.explosions = new Explosions(this);
    this.city = new CityStage(this);this.settlements=new SettlementStage(this);
    this.weather = new WeatherStage(this);
    this.thrusters = new ThrusterStage();
    this.hangar = new HangarStage(this);
    const ray = new T.Raycaster();
    A.combat.sceneTrace=(a,b)=>{
      if(!this.lastOrigin)return null;
      const delta=new T.Vector3(...b.map((x,i)=>(x-a[i])*1000)),length=delta.length();if(length<.0001)return null;
      ray.set(new T.Vector3(...a.map((x,i)=>(x-this.lastOrigin[i])*1000)),delta.normalize());ray.near=.002;ray.far=length;
      this.scene.updateMatrixWorld(true);const meshes=[];
      this.scene.traverseVisible(o=>{if(!o.isMesh||o.userData.skipAO)return;let p=o,ignore=false;while(p){if(p===this.rifle||p===this.sidearm||p===this.shots||p.userData.combatEntity||p===this.ship&&!A.flight.walking){ignore=true;break;}p=p.parent;}if(!ignore)meshes.push(o);});
      const hit=ray.intersectObjects(meshes,false)[0];return hit?{t:hit.distance/length,position:hit.point.toArray().map((x,i)=>x/1000+this.lastOrigin[i]),material:hit.object.name||'surface'}:null;
    };
    addEventListener('pointerdown',event=>{if(!A.flight.bridgeWalk||A.isPaused()||event.button!==0||event.target.closest('button,input,select'))return;const ndc=document.pointerLockElement?new T.Vector2():new T.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);ray.setFromCamera(ndc,this.camera);ray.near=.01;ray.far=4;const screens=[];this.cockpit.traverseVisible(o=>{if(o.userData.mfdIndex!==undefined)screens.push(o);});const hit=ray.intersectObjects(screens,false)[0];if(hit){event.preventDefault();event.stopImmediatePropagation();BloxMFD.click(hit.object.userData.mfdIndex,{offsetX:hit.uv.x*640,offsetY:(1-hit.uv.y)*380});A.combat.trigger=false;this.instrumentTime=-1;A.renderer.needsRender=true;}},true);
    this.enabled = true;
    window.BloxVisuals = this;
    A.visuals = this;
    A.renderer.needsRender = true;
    window.BloxCockpitVisualLayout = (craft) =>
      LongwayCore.CockpitLayout.definitions.map((d, i) => ({
        index: i,
        action: d[0],
        name: d[1],
        label: d[2],
        description: d[3],
        center: [
          ((i % 6) - 2.5) * 0.27,
          craft.dimensions[2] * 0.5 - 0.84 - Math.floor(i / 6) * 0.125,
          craft.dimensions[0] * 0.18 + 1.56,
        ],
        half: [0.119, 0.05, 0.055],
      }));
    const picker = new T.Raycaster();
    document.querySelector("#scene").addEventListener(
      "pointerdown",
      (e) => {
        if (
          !A.flight.drive.instruments ||
          A.flight.walking ||
          A.flight.bridgeWalk
        )
          return;
        picker.setFromCamera(
          new T.Vector2(
            (e.clientX / innerWidth) * 2 - 1,
            1 - (e.clientY / innerHeight) * 2,
          ),
          this.camera,
        );
        const targets = this.cockpit.userData.screens.map((s) => s.mesh),
          hit = picker.intersectObjects(targets, false)[0];
        if (hit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const i = targets.indexOf(hit.object);
          BloxMFD.click(i,{offsetX:hit.uv.x*640,offsetY:(1-hit.uv.y)*380});
          A.combat.trigger=false;
          this.instrumentTime=-1;
          A.renderer.needsRender=true;
        }
      },
      true,
    );
    addEventListener("resize", () => {
      r.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.ssao?.setSize(
        Math.round(innerWidth * 0.6),
        Math.round(innerHeight * 0.6),
      );
    });
  }
  tuneResolution(){
    const gl=this.renderer.getContext(),timer=this.gpuTimer;
    if(timer){const disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT);while(this.gpuQueries.length&&gl.getQueryParameter(this.gpuQueries[0],gl.QUERY_RESULT_AVAILABLE)){const q=this.gpuQueries.shift(),ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);if(!disjoint&&ms>0)this.gpuMs=this.gpuMs===null?ms:this.gpuMs*.65+ms*.35;}}
    const now=performance.now(),interval=now-(this.lastFrameTime||now);this.lastFrameTime=now;
    if(interval>0&&interval<250)this.frameInterval=this.frameInterval?this.frameInterval*.92+interval*.08:interval;
    if(!this.app.renderer.autoResolution||this.frame<45||now-this.lastResolutionChange<1500)return;
    const old=this.renderer.getPixelRatio(),software=this.app.renderer.software,max=Math.min(devicePixelRatio||1,software?.65:this.app.renderer.quality===0?1:1.5),min=software?.35:.65;
    let ratio=Math.min(old,max);if(this.gpuMs){if(this.gpuMs>9)ratio=Math.max(min,ratio*Math.sqrt(7/this.gpuMs));else if(this.gpuMs<4.2)ratio=Math.min(max,ratio*1.08);}
    else if(this.frameInterval>22)ratio=Math.max(min,ratio*.9);
    else if(this.frameInterval>0&&this.frameInterval<15)ratio=Math.min(max,ratio*1.05);
    if(Math.abs(ratio-old)<.03)return;this.lastResolutionChange=now;this.renderer.setPixelRatio(ratio);this.renderer.setSize(innerWidth,innerHeight);
    this.ssao?.setSize(Math.round(innerWidth*.6*Math.min(1,ratio)),Math.round(innerHeight*.6*Math.min(1,ratio)));
  }
  render(F, time) {
    if (!this.enabled||this.contextLost) return;
    const shadowSize=Math.min(this.app.renderer.quality===0?1024:2048,this.renderer.capabilities.maxTextureSize);
    if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapSize.set(shadowSize,shadowSize);this.lastShadowBody=null;}
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.tuneResolution();
    const A = this.app,
      W = A.world,
      C = LongwayCore,
      pose = F.renderPose(),
      origin = pose.position,
      b = W.nearest(origin).body,
      site = W.site(b),
      portDistance = C.length(C.sub(origin,site.center)),
      facility = portDistance < 3.5,
      ns = W.nearestStation(origin),
      surface =
        b.type !== 3 && C.length(C.sub(origin, b.center)) - b.radius < 12 && ns.distance > 2.1,
      m = this.materials;
    this.surfaceBlend=C.smooth(C.clamp((12-(C.length(C.sub(origin,b.center))-b.radius))/8,0,1));
    const localClimate=C.PlanetClimate?.weather(b,time,C.unit(C.sub(origin,b.center))),airTint=localClimate?.atmosphereColor||[.22,.49,.76],starTint=localClimate?.starColor||[1,1,1];
    const sunElevation=C.dot(C.unit(C.sub(origin,b.center)),A.celestial?.sun(origin)||C.SUN),airLight=.02+.98*C.smooth(C.clamp((sunElevation+.14)/.4,0,1));
    this.surfaceFog.color.setRGB(...airTint.map((v,i)=>(.07+v*.65)*starTint[i]*airLight));
    const airDepth=b.atmosphere*b.radius,altitude=Math.max(0,C.length(C.sub(origin,b.center))-b.radius);
    this.surfaceFog.density=(.000045+(localClimate?.storm||0)*.00009+(localClimate?.dust||0)*.00013)*Math.exp(-altitude/Math.max(.1,airDepth*.21));
    this.scene.fog = surface && b.atmosphere > 0 ? this.surfaceFog : null;
    this.camera.fov = (2 * Math.atan(A.renderer.fov) * 180) / Math.PI;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.near=(F.walking||F.bridgeWalk)?.08:Math.max(.5,Math.min(25,Math.max(0,C.length(C.sub(origin,b.center))-b.radius)*6));
    this.camera.updateProjectionMatrix();
    frame(this.camera, origin, pose.right, pose.up, pose.forward, origin);
    if (portDistance < 35 && (this.bodyId !== b.id || this.siteId!==b.activeSettlement?.id)) {this.siteId=b.activeSettlement?.id;
      if (this.port) dispose(this.port);
      this.port = buildPort(m, b, C);
      this.scene.add(this.port);
      this.bodyId = b.id;
      this.lastProbe = 0;
    }
    if(this.port){this.port.visible = portDistance < 35 && this.bodyId===b.id;
    frame(this.port, site.center, site.right, site.up, site.forward, origin);}
    this.station.visible = ns.distance < 70;
    frame(
      this.station,
      ns.station.center,
      ns.station.right,
      ns.station.up,
      ns.station.forward,
      origin,
    );
    if(this.terrainJob&&(this.terrainJob.body!==b.id||!surface||this.terrainJob.walking!==F.walking)){
      this.terrainJob.iterator.return();if(this.terrainJob.result)dispose(this.terrainJob.result);this.terrainJob=null;
    }
    if (!this.terrainJob &&
      surface &&
      (!this.terrain ||
        this.terrainBody !== b.id ||
        (F.walking && this.terrain.userData.rayHeightCache?.side<193) ||
        C.length(C.cross(C.sub(origin, this.terrain.userData.origin),this.terrain.userData.worldFrame.up)) > (F.walking?.12:1.2))
    ) {
      const job={body:b.id,walking:F.walking,workMs:0};
      job.iterator=buildTerrainJob(m,W,b,origin,C,F.walking?192:96,job);
      this.terrainJob=job;
    }
    this.terrainSliceMs=0;
    if(this.terrainJob?.ready){
      const job=this.terrainJob;if(this.terrain)dispose(this.terrain);
      this.terrain=job.result;this.terrain.userData.origin=job.origin;this.terrainBody=b.id;this.terrainJob=null;
      this.terrainBuildMs=job.workMs;this.terrainBuilds=(this.terrainBuilds||0)+1;this.scene.add(this.terrain);
    }
    if(this.terrainJob&&!this.terrainJob.result){
      const job=this.terrainJob,start=performance.now(),deadline=start+(A.renderer.quality===0?1.5:2.5);
      do{
        const result=job.iterator.next();
        if(result.done){
          job.result=result.value;
          // Keep the previous patch while optional parallel shader compilation
          // completes. Older drivers still use Three's supported fallback.
          this.renderer.compileAsync(job.result,this.camera,this.scene).then(()=>{job.ready=true;}).catch(error=>{job.ready=true;this.terrainCompileError=String(error);});
          break;
        }
      }while(performance.now()<deadline);
      this.terrainSliceMs=performance.now()-start;job.workMs+=this.terrainSliceMs;
    }
    if (this.terrain) {
      this.terrain.visible = surface && this.terrainBody===b.id;
      this.terrain.traverse(o=>{if(!o.material)return;const ms=Array.isArray(o.material)?o.material:[o.material];for(const mat of ms){if(mat.userData.surfaceFade)mat.userData.surfaceFade.value=this.surfaceBlend;}});
      const f = this.terrain.userData.worldFrame;
      frame(this.terrain, f.center, f.right, f.up, f.forward, origin);
    }
    if(this.plantsJob&&(this.plantsJob.body!==b.id||!surface)){
      dispose(this.plantsJob.result);this.plantsJob=null;
    }
    if(this.plantsJob?.ready){
      const job=this.plantsJob;if(this.plants)dispose(this.plants);
      this.plants=job.result;this.plantBody=job.body;this.plantOrigin=job.origin;this.plantsJob=null;this.scene.add(this.plants);
    }
    if (!this.plantsJob &&
      surface && altitude<.5 && !C.PlanetEngines.profile(b).grass &&
      (!this.plants || !this.plantOrigin ||
        this.plantBody !== b.id ||
        C.length(C.sub(origin, this.plantOrigin)) > 0.2)
    ) {
      const job={body:b.id,origin:origin.slice(),result:buildPlants(m,W.streamVegetation(origin,b,70),W,b,C,this.terrain)};this.plantsJob=job;
      this.renderer.compileAsync(job.result,this.camera,this.scene).then(()=>job.ready=true).catch(error=>{job.ready=true;this.plantCompileError=String(error);});
    }
    if (this.plants) {
      this.plants.visible = surface && altitude<.5 && this.plantBody===b.id && !C.PlanetEngines.profile(b).grass;
      const f = this.plants.userData.worldFrame;
      if (f) frame(this.plants, f.center, f.right, f.up, f.forward, origin);
    }
    const v = F.vehicle,
      c = F.craft,
      vright = C.unit(C.cross(v.forward, v.up));
    if (this.craftId !== c.id) {
      if (this.ship) dispose(this.ship);
      this.ship = buildCraft(m, c);
      this.scene.add(this.ship);
      dispose(this.cockpit);
      this.cockpit = buildCockpit(m, c);
      this.scene.add(this.cockpit);
      this.instrumentTime = null;
      this.craftId = c.id;
    }
    const inside = pose.shipView === 1 && !F.walking;
    document.body.classList.toggle("mesh-cockpit", inside);
    document.body.classList.toggle("weapons-armed", A.combat.armed);
    this.ship.visible = !inside;
    frame(this.ship, v.position, vright, v.up, v.forward, origin);
    this.thrusters.update(this.ship,Math.max(Math.abs(v.thrust||0), F.speed>.001?.12:0),time,F.drive.power&&F.ship.fuel>0&&A.systems.factor("engines")>.01&&v.state==="flight");
    this.ship.traverse((o) => {
      if (o.userData.gear) o.scale.y = Math.max(0.02, v.gear);
    });
    window.BloxArtwork?.update();
    this.cockpit.visible = inside && !window.BloxArtwork?.active;
    const eye = C.add(
      v.position,
      C.add(
        C.mul(v.up, c.dimensions[2] * 0.0005),
        C.mul(v.forward, c.dimensions[0] * 0.00018),
      ),
    );
    frame(this.cockpit, eye, vright, v.up, v.forward, origin);
    this.cabinLight.position
      .copy(F.bridgeWalk ? this.camera.position : this.cockpit.position)
      .add(new T.Vector3(...v.up).multiplyScalar(0.1));
    this.cabinLight.visible = inside && !window.BloxArtwork?.active;
    for (const [id, door] of this.cockpit.userData.doors || [])
      door.position.y = (A.systems.doors?.[id]?.progress ?? 1) * 3.3;
    this.cockpit.userData.stick.rotation.z = -F.bank * 0.3;
    this.cockpit.userData.throttle.rotation.x = -v.thrust * 0.35;
    if (
      inside && this.cockpit.visible &&
      (time - this.instrumentTime > 0.14 ||
        (time !== this.instrumentTime && A.isPaused()) ||
        !this.instrumentTime)
    ) {
      drawInstruments(this.cockpit, A, time);
      this.instrumentTime = time;
    }
    const visible = new Set(),
      agents = surface && altitude<.65 ? W.streamFauna(origin, b).filter(a=>C.length(C.sub(a.position,origin))<.55) : [];
    const ff = W.faunaFrame || site;
    for (const a of agents) {
      const identity =
          typeof a.id === "number"
            ? a.id
            : String(a.id)
                .split("")
                .reduce(
                  (h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0,
                  17,
                ),
        family = a.type ? 1 : (C.hash(identity ^ b.seed) % 4096) % 5;
      const key = b.id + ":" + a.id;
      visible.add(key);
      let g = this.animalModels.get(key);
      const distance=C.length(C.sub(a.position,origin));
      const lowDetail=g?.userData.lowDetail ? distance>.09 : distance>.12;
      if(g&&!!g.userData.lowDetail!==lowDetail){dispose(g);this.animalModels.delete(key);g=null;}
      if (!g) {
        g = lowDetail ? buildAnimalLOD(m,family) : buildAnimal(m, family, a.phenotype);g.userData.combatEntity=true;
        this.animalModels.set(key, g);
        this.scene.add(g);
      }
      g.visible = true;
      const forward = C.add(
          C.mul(ff.right, Math.sin(a.yaw)),
          C.mul(ff.forward, Math.cos(a.yaw)),
        ),
        right = C.unit(C.cross(forward, ff.up));
      frame(g, a.position, right, ff.up, forward, origin);
      g.scale.setScalar(a.size * 1000);
      if(a.dead){g.userData.body.rotation.z=Math.PI*.48;g.userData.body.position.y=-.4;}else{g.userData.body.rotation.z=0;g.userData.body.position.y=0;if(!g.userData.lowDetail)animateAnimal(g, a, time);}
    }
    for (const [key, g] of this.animalModels)
      if (!visible.has(key)) {
        dispose(g);
        this.animalModels.delete(key);
      }
    const ids = new Set();
    for (const e of A.combat.visualContacts()) {
      ids.add(e.id);
      const modelKey = e.kind + ":" + (e.craftId || "default");
      let g = this.contactModels.get(e.id);
      if (g && g.userData.modelKey !== modelKey) {
        dispose(g);
        g = null;
      }
      if (!g) {
        g = e.humanoid ? buildCitizen(m,e) : ["sentry", "pilot"].includes(e.kind)
          ? buildSentry(m)
          : buildCraft(
              m,
              C.CRAFTS.find((c) => c.id === e.craftId) ||
                C.CRAFTS[e.kind === "ally" ? 0 : 12],
            );
        g.userData.modelKey = modelKey;
        this.scene.add(g);
        g.userData.combatEntity=e.id;
        this.contactModels.set(e.id, g);
      }
      frame(
        g,
        e.humanoid?C.sub(e.position,C.mul(e.up,.0009)):e.position,
        C.unit(C.cross(e.forward, e.up)),
        e.up,
        e.forward,
        origin,
      );
      if(e.hull<=0&&e.death){
        const fall=C.smooth(C.clamp((A.combat.time-e.death.time)/.85,0,1));
        const axis=C.unit(C.cross(e.death.up,e.death.direction),[1,0,0]);
        g.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis),fall*Math.PI*.49));
        g.position.add(new T.Vector3(...e.death.direction).multiplyScalar(.35*fall));
        g.userData.animation='death';
      }else if(e.humanoid)animateCitizen(g,e,time);
      else this.thrusters.update(g,Math.min(1,C.length(e.velocity||[0,0,0])*2),time,e.hull>0);
      g.visible = (e.hull > 0 || e.death&&A.combat.time-e.death.time<e.death.duration || e.kind === "ally" || e.kind === "pilot") && e.id!==A.shipboard?.aboard && e.id!==A.shipboard?.aboard+":vessel";
    }
    for (const [id, g] of this.contactModels)
      if (!ids.has(id)) {
        dispose(g);
        this.contactModels.delete(id);
      }
    const B = A.combat;
    this.rifle.visible =
      F.walking &&
      B.armed &&
      B.key === "rifle" &&
      !window.BloxArtwork?.weaponActive;
    this.sidearm.visible =
      F.walking &&
      B.armed &&
      B.key === "sidearm" &&
      !window.BloxArtwork?.weaponActive;
    for (const gun of [this.rifle, this.sidearm]) {
      gun.rotation.x = -B.recoil * 0.09 + (B.reloadTime > 0 ? 0.35 : 0);
      gun.position.z = (gun === this.rifle ? -0.41 : -0.32) + B.recoil * 0.035;
    }
    this.shotGeometry.setDrawRange(0,0);
    this.weaponEffects.update(time,origin);
    this.explosions.update(origin);
    this.weaponLighting.update(origin);
    this.lastOrigin=origin.slice();
    this.engines.update(F,time,b,origin,surface);
    this.surfaceDetail.update(b,origin,surface);
    this.stellar.update(F,time,b,origin);
    this.city.update(F,time,b,origin,surface||facility);
    this.hangar.update(origin);this.settlements.update(b,origin,surface||b.type===3);
    this.weather.update(F,time,b,origin,surface);
    this.hemi.position.set(...C.mul(site.up, 100));
    this.sun.color.setRGB(...(C.PlanetClimate?.profile(b).starColor||[1,1,1]));
    this.sun.position.set(...C.mul(A.celestial?.sun(origin)||C.SUN, 1500));
    this.sun.target.position.set(0, 0, 0);
    const daylight=C.smooth(C.clamp((C.dot(C.unit(C.sub(origin,b.center)),A.celestial?.sun(origin)||C.SUN)+.06)/.22,0,1));
    this.sun.intensity=3.7*daylight;
    this.hemi.intensity=A.combat.visionActive?2.8:.12+2.28*daylight;
    const maps = A.renderer.materials;
    if (this.normalStrength !== maps?.normalStrength) {
      this.normalStrength = maps?.normalStrength;
      this.scene.traverse((o) => {
        const mm = o.material;
        if (mm?.normalScale)
          mm.normalScale.setScalar(this.normalStrength * 0.12);
      });
    }
    this.scene.environmentIntensity = maps?.reflections === false ? 0 : A.combat.visionActive?.65:.06+.74*daylight;
    const nearbyGeometry=surface||facility||F.bridgeWalk||ns.distance<3;
    this.sun.shadow.autoUpdate=false;
    this.sun.shadow.needsUpdate=nearbyGeometry&&(this.frame%3===0||this.lastShadowBody!==b.id);
    this.lastShadowBody=b.id;
    // A filtered static environment avoids six hidden-direction cube captures.
    this.renderer.setRenderTarget(null);
    this.cockpitOcclusion.update();
    const gl=this.renderer.getContext(),gpuQuery=this.gpuTimer&&this.gpuQueries.length<3&&this.frame%8===0?gl.createQuery():null;
    if(gpuQuery)gl.beginQuery(this.gpuTimer.TIME_ELAPSED_EXT,gpuQuery);
    this.renderer.render(this.scene, this.camera);
    const aoActive=maps?.ao !== false&&nearbyGeometry&&A.renderer.quality>0;
    if (aoActive) {
      this.ssao.kernelRadius = inside ? 0.28 : 3.5;
      this.ssao.minDistance = 0.007 / this.camera.far;
      this.ssao.maxDistance = (inside ? 0.9 : 8) / this.camera.far;
      this.ssao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(
        this.camera.projectionMatrix,
      );
      this.ssao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
        this.camera.projectionMatrixInverse,
      );
      const omitted=[];this.scene.traverse(o=>{if(o.visible&&o.userData.skipAO){omitted.push(o);o.visible=false;}});
      this.ssao.render(this.renderer, null, null);
      omitted.forEach(o=>o.visible=true);
    }
    if(gpuQuery){gl.endQuery(this.gpuTimer.TIME_ELAPSED_EXT);this.gpuQueries.push(gpuQuery);}
    const drawStats = { ...this.renderer.info.render };
    this.frame++;
    this.thrusters.finish();
    this.stats = {
      drawCalls: drawStats.calls,
      triangles: drawStats.triangles,
      ssao: aoActive,
      visiblePlanets: A.renderer.active.length,
      probes: this.captures,
      resolution: [this.canvas.width, this.canvas.height],
      gpuMs:this.gpuMs,
      terrainBuilds:this.terrainBuilds||0,terrainBuildMs:this.terrainBuildMs||0,terrainSliceMs:this.terrainSliceMs||0,terrainPending:!!this.terrainJob,
      animals: agents.length,
      surfacePopulation: this.surfaceDetail.count,
      assetFallbacks: this.assetFallbacks,
      craft: c.name,
      engines: this.engines.stats,
      stellar: this.stellar.stats,
      weaponLighting: this.weaponLighting.stats,
      weather: this.weather.stats,
      thrusters: this.thrusters.stats,
    };
  }
}
async function init() {
  if (!window.longway) {
    addEventListener("longway-ready", init, { once: true });
    return;
  }
  try {
    const art = await loadSurfaceArt();
    new VisualStage(window.longway, art);
    visualState.degraded = art.failures.length > 0;
  } catch (e) {
    console.error("Detailed renderer initialization failed", e);
    window.BloxVisuals = { enabled: false, error: String(e) };
    window.longway?.renderer.enableLegacy();
    document.querySelector("#detailScene")?.remove();
    visualState.degraded = true;
  } finally {
    visualState.ready = true;
    if (window.longway) window.longway.renderer.needsRender = true;
  }
}
init();
