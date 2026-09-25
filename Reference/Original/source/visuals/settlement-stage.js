import {T,box,bake,frame,dispose} from './primitives.js';
import {cloudPlatform} from './cloud-platform.js';
export class SettlementStage{
 constructor(stage){this.stage=stage;this.views=new Map();this.markers=new Map();this.hud=document.createElement('div');this.hud.id='settlementMarkers';this.hud.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9';document.body.append(this.hud);}
 update(b,origin,surface){const A=this.stage.app,C=LongwayCore,D=A.outposts;if(!D)return;const list=D.list(b),current=b.activeSettlement?.id,visible=[],wanted=new Set();
  for(const r of list){const dist=C.length(C.sub(r.position,origin));if(dist<30&&r.id!==current){wanted.add(r.id);let g=this.views.get(r.id);if(!g){const m=this.stage.materials;g=new T.Group();const size=r.kind==='outpost'?120:480;box(g,m.concrete,[0,-7,0],[size,16,size],0);const rows=r.kind==='outpost'?[0]:[-54,-22,10,42],cols=r.kind==='outpost'?[-28,28]:[-72,-40,40,72];for(const z of rows)for(const x of cols){const h=r.kind==='outpost'?7.6:11.4+(C.hash(r.seed^(x+z))%4)*3.8;box(g,m.building,[x,1.06+h/2,z],[26,h,24],.1);for(let y=3;y<h;y+=3.8)for(const side of [-1,1])box(g,m.glass,[x,y,z+side*12.07],[22,1.3,.06],0);}if(b.type===3)cloudPlatform(g,m,size);bake(g,true);this.stage.scene.add(g);this.views.set(r.id,g);}const f=D.frame(r);frame(g,f.center,f.right,f.up,f.forward,origin);g.visible=surface;}
   if(dist<.03)continue;const rel=C.sub(r.position,origin),hit=C.raySphere(C.sub(origin,b.center),C.unit(rel),b.radius);if(hit?.[0]>0&&hit[0]<dist-.15)continue;
   const p=new T.Vector3(...rel.map(v=>v*1000)).project(this.stage.camera);if(p.z>1||p.z< -1||Math.abs(p.x)>.92||Math.abs(p.y)>.85)continue;visible.push({r,dist,p});
  }
  for(const [id,g]of this.views)if(!wanted.has(id)){dispose(g);this.views.delete(id);}
  visible.sort((a,b)=>(b.r.id===D.selected?.id)-(a.r.id===D.selected?.id)||a.dist-b.dist);const keep=new Set(),placed=[];
  for(const {r,dist,p}of visible){if(keep.size>=10)break;const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;if(placed.some(v=>Math.abs(x-v.x)<150&&Math.abs(y-v.y)<34))continue;placed.push({x,y});keep.add(r.id);let m=this.markers.get(r.id);if(!m){m=document.createElement('button');m.style.cssText='position:absolute;transform:translate(-50%,-50%);font:10px monospace;letter-spacing:.5px;background:#04131699;border:0;padding:4px 7px;color:#b4d5c9;pointer-events:auto';m.onclick=()=>{D.select(r.id);A.flight.message=r.name+' · destination selected';};this.hud.append(m);this.markers.set(r.id,m);}m.style.left=x+'px';m.style.top=y+'px';m.style.color=r.id===D.selected?.id?'#e8bd7a':'#b4d5c9';m.textContent=(r.kind==='city'?'▣ ':'◇ ')+r.name+' · '+(dist<1?Math.round(dist*1000)+' m':dist.toFixed(1)+' km');}
  for(const [id,m]of this.markers)if(!keep.has(id)){m.remove();this.markers.delete(id);}this.hud.hidden=!A.started||A.isPaused()||A.flight.bridgeWalk;this.stats={catalog:recordsCount(D),worldCities:list.filter(r=>r.kind==='city').length,worldOutposts:list.filter(r=>r.kind==='outpost').length,markers:keep.size,distantSites:this.views.size,active:b.activeSettlement?.name};
 }
}
function recordsCount(d){return d.records.size;}
