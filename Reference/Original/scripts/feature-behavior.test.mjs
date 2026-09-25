import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { createGameServer } from './serve.mjs';

// Focused checks for this feature, independent of the project's error-check system.
const context=vm.createContext({console,performance});
for(const name of ['core','cosmoplot-data','living','expedition','landscape','combat','systems','controller','multiplayer','celestial'])
  vm.runInContext(await readFile(`source/${name}.js`,'utf8'),context,{filename:name+'.js'});
const C=context.LongwayCore, G=context.LongwayController;
const plain=value=>JSON.parse(JSON.stringify(value));
function game(){const world=new C.Universe(41827),flight=new C.Flight(world),combat=new C.Combat(world,flight);return {world,flight,combat};}
function pad({axes=[0,0,0,0],held=[],index=0,id='Synthetic Xbox',mapping='standard'}={}){
  return {id,index,mapping,connected:true,axes,buttons:Array.from({length:16},(_,i)=>({pressed:held.includes(i),value:held.includes(i)?1:0}))};
}
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('interception meets a moving target with inherited shooter velocity',()=>{
  const origin=[0,0,0],target=[0,0,1],shooter=[.2,0,0],velocity=[.4,.1,0],speed=1.65;
  const relative=C.sub(velocity,shooter),t=C.interceptTime(origin,target,relative,speed);
  const direction=C.unit(C.sub(C.add(target,C.mul(relative,t)),origin));
  const bullet=C.add(origin,C.mul(C.add(C.mul(direction,speed),shooter),t));
  close(C.length(C.sub(bullet,C.add(target,C.mul(velocity,t)))),0);
  assert.equal(C.interceptTime(origin,target,[0,0,2],1),Infinity);
  assert.equal(C.interceptTime(origin,origin,[0,0,0],1),0);
  close(C.interceptTime(origin,target,[0,0,-1],1),.5);
});

test('fatal impacts fall across local ground, reward once, and expire visually',()=>{
  const {combat:B}=game();
  for(const up of [[0,1,0],[1,0,0],[0,0,1]])for(const direction of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1]]){
    const e={id:'bot',kind:'bot',name:'test',hull:1,shield:0,position:[0,0,0],velocity:[1,0,0],forward:up,up};
    B.enemies=[e];B.targetId=e.id;const kills=B.kills;
    B.applyHit({entity:e},'local',100,direction);
    assert.equal(B.kills,kills+1);close(C.dot(e.death.direction,up),0);close(C.length(e.death.direction),1);
    const projected=C.sub(direction,C.mul(up,C.dot(up,direction)));
    if(C.length(projected)>.001)close(C.dot(C.unit(projected),e.death.direction),1);
    B.applyHit({entity:e},'local',100,direction);assert.equal(B.kills,kills+1);
    assert.equal(B.contacts().length,0);assert.equal(B.visualContacts().length,1);
    B.time+=12.1;assert.equal(B.visualContacts().length,0);
  }
});

test('changing or clearing the selected target invalidates missile lock immediately',()=>{
  const {combat:B}=game();B.targetId='one';B.lock=1;B.targetId='one';assert.equal(B.lock,1);
  B.targetId='two';assert.equal(B.lock,0);B.lock=1;B.targetId=null;assert.equal(B.lock,0);
});

test('world rotation carries corpse direction and projectile motion with their positions',()=>{
  const app=game(),CClock=new C.CelestialSystem(app),F=app.flight,B=app.combat;
  const b=app.world.catalog.find(b=>b.name==='Earth');F.place(b,'surface');
  const direction=F.right.slice(),up=F.up.slice();
  const e={id:'corpse',kind:'sentry',humanoid:true,hull:0,position:F.position.slice(),forward:F.forward.slice(),up,velocity:[0,0,0],death:{time:0,duration:12,up:up.slice(),direction:direction.slice()}};
  B.enemies=[e];B.projectiles=[{position:F.position.slice(),previous:F.position.slice(),direction:direction.slice(),velocity:C.mul(direction,.5)}];
  const angle=Math.PI*2*10/b.orbit.rotation,expected=C.rotate(direction,b.spinAxis,angle);
  CClock.advance(CClock.elapsed+10);
  close(C.length(C.sub(e.death.direction,expected)),0);close(C.length(C.sub(e.death.up,e.up)),0);
  close(C.length(C.sub(B.projectiles[0].direction,expected)),0);close(C.length(C.sub(B.projectiles[0].velocity,C.mul(expected,.5))),0);
});

test('ship effects carry scale, a finite lifetime and authoritative corpse age',()=>{
  const {combat:B}=game();
  const e={id:'ship',name:'test',kind:'ship',hull:1,shield:0,radius:.065,position:[0,0,0],forward:[0,0,1],up:[0,1,0]};
  B.enemies=[e];B.applyHit({entity:e},'local',100,[1,0,0]);
  assert.equal(B.effects[0].radius,65);assert.equal(B.effects[0].life,2.4);assert.equal(B.visualContacts().length,0);
  const {combat:client}=game();client.time=100;
  client.acceptSnapshot({time:20,enemies:[{...e,kind:'bot',death:{time:18,duration:12,direction:[1,0,0],up:[0,1,0]}}],projectiles:[],effects:[],kills:1,mission:'test'});
  assert.equal(client.enemies[0].death.time,98);
});

test('crew snapshots accept inherited projectile velocity and reject invalid corpse poses',()=>{
  const valid=context.LongwayCrewLink.prototype.validCombat;
  const snapshot={time:10,enemies:[],effects:[],projectiles:[{position:[0,0,0],previous:[0,0,0],velocity:[45,0,0],ttl:1}]};
  assert.equal(valid(snapshot),true);
  const e={id:'bot',hull:0,position:[0,0,0],forward:[0,0,1],up:[0,1,0],velocity:[0,0,0],death:{time:9,duration:12,direction:[1,0,0],up:[0,1,0]}};
  snapshot.enemies=[e];assert.equal(valid(snapshot),true);
  e.death.direction=[NaN,0,0];assert.equal(valid(snapshot),false);
});

test('engine capability scales acceleration and stopping distance using real elapsed time',()=>{
  const {flight:F}=game();F.drive.power=true;F.ship.fuel=100;F.drive.cruiseSpool=0;F.drive.tacticalRemaining=0;F.assist=true;
  const input={forward:1,engineFactor:1},desired=[.05,0,0];F.velocity=[0,0,0];F.applyThrust(desired,.05,input);
  const full=F.velocity[0];close(F.drive.acceleration,full/.05*1000);
  F.velocity=[0,0,0];F.applyThrust(desired,.05,{...input,engineFactor:.5});close(F.velocity[0],full*.5);close(F.drive.acceleration,full*.5/.05*1000);
  F.velocity=[.04,0,0];F.applyThrust([0,0,0],.05,{brake:true,engineFactor:1});const distance=F.drive.brakingDistance;
  F.velocity=[.04,0,0];F.applyThrust([0,0,0],.05,{brake:true,engineFactor:.5});close(F.drive.brakingDistance,distance*2);
  F.velocity=[.04,0,0];F.applyThrust([0,0,0],.05,{brake:true,engineFactor:0});close(F.velocity[0],.04);assert.equal(F.drive.brakingDistance,Infinity);
  F.assist=false;F.velocity=[0,.02,0];F.applyThrust(desired,.05,input);close(F.velocity[1],.02);assert.ok(F.velocity[0]>0);
});

test('planetary hyperjump brakes continuously to a stop outside atmosphere for manual entry',()=>{
  const {world:W,flight:F}=game(),target=W.catalog.find(b=>b.name==='Mars');
  F.place(W.catalog.find(b=>b.name==='Earth'),'orbit');F.hyperSafe=()=>true;
  F.drive.jump={state:'charging',target,time:1,duration:1};F.update(.01,{});
  const route=F.route;assert.ok(route);const last=route.segments.at(-1),previous=route.segments.at(-2);
  close(C.length(C.sub(last.at(0),previous.at(1))),0,1e-5);
  assert.equal(route.landAtEnd,false);assert.equal(route.orbitOnly,true);
  const altitude=C.length(C.sub(last.at(1),target.center))-target.radius;
  assert.ok(altitude>target.radius*target.atmosphere&&altitude>12);
  let speed=Infinity;for(let i=0;i<100;i++){const v=C.length(C.sub(last.at((i+1)/100),last.at(i/100)))/(last.duration/100);assert.ok(v<=speed+1e-6);speed=v;}
  const incoming=C.length(C.sub(previous.at(1),previous.at(.9999)))/(previous.duration*.0001),outgoing=C.length(C.sub(last.at(.0001),last.at(0)))/(last.duration*.0001);close(incoming,outgoing,.001);
  const endStep=C.length(C.sub(last.at(1),last.at(.999)));assert.ok(endStep/(last.duration*.001)<.02,'last arrival interval should average below 20 m/s');
  F.position=last.at(.999);F.forward=last.heading(1);F.up=C.unit(C.sub(F.position,target.center));
  route.index=route.segments.length-1;route.elapsed=last.duration-.001;F.update(.01,{});
  assert.equal(F.route,null);assert.ok(F.position.every(Number.isFinite));
  close(C.dot(F.forward,last.heading(1)),1,1e-4);
  assert.equal(F.vehicle.state,'flight');close(C.length(F.velocity),0);
  assert.equal(F.vehicle.transition,null);
});

test('navigation planet transfer also leaves atmospheric entry and landing to the pilot',()=>{
  const {world:W,flight:F}=game(),target=W.catalog.find(b=>b.name==='Venus');F.place(W.catalog.find(b=>b.name==='Earth'),'orbit');
  const route=F.transfer(target,false);assert.ok(route);assert.equal(route.landAtEnd,false);
  assert.ok(C.length(C.sub(route.segments.at(-1).at(1),target.center))>target.radius*(1+target.atmosphere));
  assert.equal(target.liquid,0);assert.ok(target.temperature>450);
  const survey=F.toSurvey(target);assert.equal(survey.landAtEnd,false);assert.equal(survey.kind,'planet-arrival');
});

test('moving-world route attachment remains continuous through the orbital boundary',()=>{
 const {world:W,flight:F,combat:B}=game(),target=W.catalog.find(b=>b.name==='Earth'),A={world:W,flight:F,combat:B},celestial=new C.CelestialSystem(A),center=target.center.slice(),n=C.unit([1,.2,.3]);
 const route={segments:[{at:t=>C.add(center,C.mul(n,target.radius*(1.8-.6*t)))}]};celestial.followRoute(route);target.spin+=.5;
 for(const t of [1/3,.5,2/3]){const distance=C.length(C.sub(route.segments[0].at(t+.000001),route.segments[0].at(t-.000001)));assert.ok(distance<.02,'attachment must not jump as radius crosses the rotation blend');}
});

test('pending terrain and vegetation remain attached to the rotating planet',()=>{
 const {world:W,flight:F,combat:B}=game(),body=W.catalog.find(b=>b.name==='Earth'),A={world:W,flight:F,combat:B},celestial=new C.CelestialSystem(A),site=W.site(body);
 const frame={center:site.center.slice(),up:site.up.slice(),right:site.right.slice(),forward:site.forward.slice()},origin=C.add(frame.center,C.mul(frame.up,.4));
 A.visuals={terrainJob:{body:body.id,frame,origin:origin.slice()},plantsJob:{body:body.id,origin:origin.slice(),result:{userData:{worldFrame:frame}}}};
 const local=C.bodyLocal(body,C.sub(origin,body.center));celestial.advance(600);
 for(const job of [A.visuals.terrainJob,A.visuals.plantsJob])close(C.length(C.sub(C.bodyLocal(body,C.sub(job.origin,body.center)),local)),0,1e-6);
 close(C.dot(frame.up,C.unit(C.sub(frame.center,body.center))),1,1e-6);
});

test('gamepad suppresses drift, preserves analog magnitude and emits toggle edges once',()=>{
  const controller=new G.Controller();controller.read([pad()]);
  close(controller.read([pad({axes:[.05,-.05,0,0]})]).state.forward,0);
  const p=pad({axes:[.4,-.6,0,0],held:[3,7]});let read=controller.read([p]);
  assert.ok(read.state.forward>0&&read.state.forward<1);assert.equal(read.state.fire,true);assert.equal(read.edges.target,true);
  assert.equal(controller.read([p]).edges.target,false);
  controller.read([pad()]);assert.equal(controller.read([p]).edges.target,true);
});

test('pause, reconnection and disconnect cannot leave held thrust or fire active',()=>{
  const controller=new G.Controller(),held=pad({axes:[0,-1,0,0],held:[7]});
  assert.deepEqual(plain(controller.read([held]).state),{});controller.read([pad()]);assert.equal(controller.read([held]).state.fire,true);
  assert.deepEqual(plain(controller.read([held],true).state),{});
  assert.deepEqual(plain(controller.read([held]).state),{});controller.read([pad()]);assert.equal(controller.read([held]).state.fire,true);
  assert.deepEqual(plain(controller.read([]).state),{});assert.deepEqual(plain(controller.read([held]).state),{});
});

test('nonstandard device, axis and button mappings work and invalid saved settings are bounded',()=>{
  const controller=new G.Controller({device:'2',invertY:true,deadzone:.1,axes:{moveX:1,moveY:3,lookY:0},buttons:{fire:1,target:2}});
  controller.read([pad(),pad({index:2,id:'Custom',mapping:''})]);
  const read=controller.read([pad(),pad({index:2,id:'Custom',mapping:'',axes:[.8,0,0,-1],held:[1,2]})]);
  assert.equal(read.state.forward,1);assert.ok(read.state.lookY>0);assert.equal(read.state.fire,true);assert.equal(read.edges.target,true);
  const safe=G.settings({deadzone:99,sensitivity:-10,axes:{moveX:999},buttons:{fire:-900}});
  assert.equal(safe.deadzone,.45);assert.equal(safe.sensitivity,.2);assert.equal(safe.axes.moveX,15);assert.equal(safe.buttons.fire,-1);
});

test('Windows static server serves normal files and rejects malformed/escaping paths',async()=>{
  const server=createGameServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const request=path=>new Promise((resolve,reject)=>http.get({host:'127.0.0.1',port:server.address().port,path},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject));
  try {assert.equal(await request('/source/core.js'),200);assert.equal(await request('/missing-file.js'),404);
    assert.equal(await request('/%zz'),400);assert.equal(await request('/%00'),400);assert.equal(await request('/%2e%2e%5cprivate'),403);assert.equal(await request('/.codex/phase_board.json'),403);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
