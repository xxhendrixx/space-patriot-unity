import {finishAnimal} from './alien-biology.js';
import {createCreatureEngine} from '../engines/creatureworks.js';
import { T, mesh, loft, ellipsoid, rod, box, beam, bake } from "./primitives.js";
export function buildAnimalLOD(m, family) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const skin = m.coat[family] || m.coat[0];
  ellipsoid(body,skin,[0,.65,0],[.32,.35,.58],0);
  ellipsoid(body,skin,[0,.92,.5],[.22,.24,.25],0);
  for(const x of [-.22,.22])for(const z of [-.35,.35])box(body,skin,[x,.25,z],[.12,.5,.13],0);
  bake(body);root.userData.body=body;root.userData.legs=[];root.userData.family=family;root.userData.lowDetail=true;
  return root;
}
// Keep CreatureWorks' articulated six-leg body and IK solver. The head is a
// beetle head with compound eyes, mandibles and antennae, rather than a dragon.
const BaseCreature=createCreatureEngine(T);
class FieldBeetle extends BaseCreature {
 buildHead(parent){
  parent.scale.setScalar(this.settings.head);
  this.ell(parent,'Head capsule',[0,.04,.1],[.34,.24,.3]);
  for(const side of [-1,1]){
   this.ell(parent,'Compound eye',[side*.28,.1,.23],[.12,.115,.12],this.dark);
   this.taper(parent,'Mandible',[[side*.12,-.1,.28],[side*.21,-.1,.46],[side*.07,-.08,.52]],[.055,.04,.004],this.horn,8);

  }
 }
}
export function buildAnimal(m, family = 0, phenotype) {
  const root = new T.Group(),
    g = new T.Group();
  root.add(g);
  root.userData.legs = [];
  root.userData.body = g;
  root.userData.family = family;
  if(family===3){
    const engine=new FieldBeetle({scene:g,settings:{preset:'storm',name:'Field beetle',family:'arthropod',scale:.4,bulk:1.1,length:1,legs:.8,legPairs:phenotype?.legPairs||3,head:.8,horns:0,spines:0,wing:0,tail:0,glow:0,eye:'#171d18',skin:'#465042',secondary:'#665e43',horn:'#282c23',pattern:'chitin',metalness:.1,roughness:.5,animation:'walk'}});
    engine.root.rotation.y=Math.PI;root.userData.creature=engine;return finishAnimal(root,m,phenotype);
  }
  const skin = m.coat[family],
    legs = root.userData.legs;
  function leg(x, z, y, length, hind = false, side = 1) {
    const limb = new T.Group();
    g.add(limb);
    limb.position.set(x, y, z);
    const knee = [side * 0.014, -length * 0.51, hind ? -0.1 : 0.025],
      ankle = [side * 0.024, -length * 0.92, hind ? 0.065 : 0.045];
    rod(limb, skin, [0, 0, 0], knee, 0.075, 0.046, 10);
    ellipsoid(limb, skin, knee, [0.049, 0.055, 0.049]);
    rod(limb, skin, knee, ankle, 0.032, 0.022, 8);
    const hoof = ellipsoid(
      limb,
      m.hoof,
      [ankle[0], -length + 0.035, ankle[2] - 0.035],
      [0.053, 0.043, 0.081],
    );
    if (family === 0) {
      box(
        limb,
        m.black,
        [ankle[0], -length + 0.013, ankle[2] - 0.1],
        [0.004, 0.023, 0.019],
        0.001,
      );
    }
    legs.push({
      limb,
      phase: (side > 0 ? Math.PI : 0) + (hind ? Math.PI : 0),
      stride: family === 1 ? 0.15 : 0.095,
    });
    return limb;
  }
  if (family === 0) {
    loft(
      g,
      skin,
      [
        [0.57, 0.91, 0.14, 0.22],
        [0.39, 0.95, 0.24, 0.34],
        [-0.13, 0.96, 0.255, 0.345],
        [-0.39, 1.02, 0.19, 0.31],
        [-0.49, 1.15, 0.135, 0.27],
        [-0.59, 1.43, 0.105, 0.24],
        [-0.7, 1.63, 0.095, 0.13],
      ],
      16,
    );
    loft(
      g,
      skin,
      [
        [-0.59, 1.63, 0.075, 0.12],
        [-0.76, 1.68, 0.115, 0.135],
        [-0.93, 1.64, 0.088, 0.09],
        [-1.09, 1.6, 0.05, 0.055],
      ],
      12,
    );
    ellipsoid(g, m.hoof, [0, 1.6, -1.09], [0.047, 0.041, 0.037]);
    for (const s of [-1, 1]) {
      leg(s * 0.165, -0.3, 0.87, 0.87, false, s);
      leg(s * 0.164, 0.4, 0.87, 0.87, true, s);
      ellipsoid(g, m.eyes, [s * 0.088, 1.705, -0.81], [0.017, 0.02, 0.021]);
      const ear = ellipsoid(
        g,
        skin,
        [s * 0.148, 1.8, -0.655],
        [0.067, 0.165, 0.026],
      );
      ear.rotation.z = s * -0.53;
      ellipsoid(g, m.horn, [s * 0.151, 1.812, -0.677], [0.031, 0.098, 0.01]);
      const start = [s * 0.066, 1.78, -0.69],
        tip = [s * 0.19, 2.1, -0.47];
      rod(g, m.horn, start, [s * 0.12, 1.96, -0.57], 0.022, 0.017, 7);
      rod(g, m.horn, [s * 0.12, 1.96, -0.57], tip, 0.017, 0.006, 7);
      rod(
        g,
        m.horn,
        [s * 0.11, 1.93, -0.61],
        [s * 0.18, 2.07, -0.8],
        0.013,
        0.003,
        6,
      );
      rod(
        g,
        m.horn,
        [s * 0.17, 2.045, -0.51],
        [s * 0.29, 2.17, -0.52],
        0.01,
        0.002,
        6,
      );
    }
    const tail = ellipsoid(g, skin, [0, 0.96, 0.64], [0.043, 0.049, 0.19]);
    tail.rotation.x = -0.75;
  } else if (family === 1) {
    loft(
      g,
      skin,
      [
        [0.67, 0.65, 0.11, 0.17],
        [0.41, 0.66, 0.2, 0.25],
        [0.1, 0.65, 0.185, 0.23],
        [-0.27, 0.69, 0.225, 0.32],
        [-0.48, 0.77, 0.175, 0.25],
        [-0.63, 0.87, 0.135, 0.2],
      ],
      16,
    );
    loft(
      g,
      skin,
      [
        [-0.56, 0.87, 0.13, 0.17],
        [-0.73, 0.91, 0.15, 0.145],
        [-0.87, 0.855, 0.096, 0.088],
        [-1.035, 0.82, 0.059, 0.059],
      ],
      12,
    );
    ellipsoid(g, m.eyes, [0, 0.831, -1.055], [0.06, 0.039, 0.038]);
    for (const s of [-1, 1]) {
      leg(s * 0.16, -0.34, 0.7, 0.7, false, s);
      leg(s * 0.15, 0.44, 0.63, 0.63, true, s);
      ellipsoid(g, m.eyes, [s * 0.127, 0.94, -0.78], [0.018, 0.018, 0.017]);
      const ear = mesh(g, new T.ConeGeometry(0.075, 0.21, 4), skin, [
        s * 0.12,
        1.11,
        -0.65,
      ]);
      ear.rotation.x = -0.22;
      ear.rotation.z = s * -0.18;
      const inner = mesh(g, new T.ConeGeometry(0.049, 0.125, 3), m.horn, [
        s * 0.12,
        1.115,
        -0.68,
      ]);
      inner.rotation.x = -0.26;
    }
    const tail = new T.Group();
    g.add(tail);
    tail.position.set(0, 0.69, 0.59);
    rod(tail, skin, [0, 0, 0], [0, -0.14, 0.3], 0.1, 0.085, 10);
    rod(tail, skin, [0, -0.14, 0.3], [0, -0.39, 0.51], 0.08, 0.045, 10);
    root.userData.tail = tail;
  } else if (family === 2) {
    loft(
      g,
      skin,
      [
        [0.39, 0.41, 0.025, 0.035],
        [0.2, 0.54, 0.18, 0.16],
        [-0.12, 0.58, 0.22, 0.24],
        [-0.31, 0.66, 0.145, 0.21],
        [-0.37, 0.88, 0.06, 0.19],
        [-0.41, 1.09, 0.055, 0.09],
      ],
      14,
    );
    ellipsoid(g, skin, [0, 1.1, -0.45], [0.086, 0.095, 0.105]);
    rod(g, m.horn, [0, 1.083, -0.53], [0, 1.06, -0.7], 0.035, 0.001, 8);
    for (const s of [-1, 1]) {
      ellipsoid(g, m.eyes, [s * 0.068, 1.13, -0.489], [0.012, 0.014, 0.013]);
      const wing = ellipsoid(
        g,
        skin,
        [s * 0.17, 0.54, 0.03],
        [0.063, 0.155, 0.36],
      );
      wing.rotation.x = 0.23;
      for (let i = 0; i < 7; i++)
        rod(
          g,
          m.horn,
          [s * 0.18, 0.6 - i * 0.021, -0.05 + i * 0.018],
          [s * 0.195, 0.45 - i * 0.007, 0.36 - i * 0.035],
          0.012,
          0.004,
          5,
        );
      const leg = new T.Group();
      g.add(leg);
      leg.position.set(s * 0.075, 0.46, 0.035);
      rod(leg, m.horn, [0, 0, 0], [s * 0.012, -0.2, 0.075], 0.015, 0.012, 6);
      rod(
        leg,
        m.horn,
        [s * 0.012, -0.2, 0.075],
        [s * 0.015, -0.43, -0.015],
        0.011,
        0.008,
        6,
      );
      for (let j = -1; j <= 1; j++)
        rod(
          leg,
          m.hoof,
          [s * 0.015, -0.43, -0.015],
          [s * 0.015 + j * 0.037, -0.455, -0.14 + Math.abs(j) * 0.027],
          0.008,
          0.003,
          5,
        );
      legs.push({ limb: leg, phase: s > 0 ? 0 : Math.PI, stride: 0.13 });
    }
  } else if (family === 3) {
    // Six legs arise from the thorax; paired elytra enclose the abdomen.
    ellipsoid(g, skin, [0, 0.28, 0.19], [0.29, 0.2, 0.4]);
    ellipsoid(g, skin, [0, 0.285, -0.18], [0.22, 0.165, 0.18]);
    ellipsoid(g, skin, [0, 0.25, -0.405], [0.145, 0.105, 0.13]);
    beam(g, m.black, [0, 0.47, -0.05], [0, 0.405, 0.48], 0.01, 0.011);
    for (const s of [-1, 1]) {
      ellipsoid(g, m.eyes, [s * 0.122, 0.27, -0.445], [0.031, 0.035, 0.036]);
      rod(
        g,
        m.horn,
        [s * 0.05, 0.23, -0.5],
        [s * 0.16, 0.18, -0.61],
        0.018,
        0.005,
        6,
      );
      rod(
        g,
        m.horn,
        [s * 0.09, 0.3, -0.475],
        [s * 0.22, 0.38, -0.6],
        0.009,
        0.006,
        6,
      );
      rod(
        g,
        m.horn,
        [s * 0.22, 0.38, -0.6],
        [s * 0.24, 0.42, -0.78],
        0.006,
        0.002,
        5,
      );
      for (let k = 0; k < 3; k++) {
        const leg = new T.Group();
        g.add(leg);
        leg.position.set(s * 0.19, 0.28, -0.2 + k * 0.14);
        const a = [s * 0.26, -0.01, (k - 1) * 0.16],
          b = [s * 0.42, -0.22, (k - 1) * 0.28];
        rod(leg, skin, [0, 0, 0], a, 0.045, 0.025, 7);
        rod(leg, skin, a, b, 0.025, 0.009, 7);
        rod(leg, m.hoof, b, [s * 0.44, -0.28, (k - 1) * 0.31], 0.009, 0.002, 5);
        legs.push({
          limb: leg,
          phase: k * Math.PI + (s > 0 ? 0 : Math.PI),
          stride: 0.1,
        });
      }
    }
  } else {
    loft(
      g,
      skin,
      [
        [0.61, 0.22, 0.105, 0.095],
        [0.33, 0.245, 0.175, 0.14],
        [-0.05, 0.26, 0.2, 0.155],
        [-0.34, 0.29, 0.135, 0.12],
        [-0.57, 0.32, 0.14, 0.1],
        [-0.79, 0.3, 0.065, 0.055],
      ],
      14,
    );
    for (const s of [-1, 1]) {
      ellipsoid(g, m.eyes, [s * 0.12, 0.37, -0.585], [0.027, 0.025, 0.025]);
      for (const z of [-0.3, 0.37]) {
        const leg = new T.Group();
        g.add(leg);
        leg.position.set(s * 0.11, 0.28, z);
        const a = [s * 0.21, -0.04, z > 0 ? -0.1 : 0.07],
          b = [s * 0.34, -0.23, z > 0 ? 0.07 : -0.08];
        rod(leg, skin, [0, 0, 0], a, 0.068, 0.045, 9);
        rod(leg, skin, a, b, 0.043, 0.027, 8);
        for (let j = 0; j < 5; j++)
          rod(
            leg,
            skin,
            b,
            [s * (0.38 + j * 0.019), -0.27, b[2] - 0.1 + j * 0.055],
            0.012,
            0.003,
            6,
          );
        legs.push({
          limb: leg,
          phase: (z > 0 ? Math.PI : 0) + (s > 0 ? 0 : Math.PI),
          stride: 0.09,
        });
      }
    }
    const tail = new T.Group();
    g.add(tail);
    tail.position.set(0, 0.24, 0.51);
    rod(tail, skin, [0, 0, 0], [0.12, -0.035, 0.39], 0.1, 0.052, 12);
    rod(tail, skin, [0.12, -0.035, 0.39], [0.25, -0.1, 0.82], 0.052, 0.005, 10);
    root.userData.tail = tail;
  }
  return finishAnimal(root,m,phenotype);
}
export function animateAnimal(g, agent, time) {
  for(const a of g.userData.appendages||[])a.joint.rotation[a.axis]=Math.sin(time*1.7+(agent.phase||0)+a.phase)*a.amplitude;
  if(g.userData.creature){const e=g.userData.creature;e.settings.animation=agent.speed>0?'walk':'idle';e.update(Math.min(.1,Math.max(0,time-(g.userData.lastTime??time))));g.userData.lastTime=time;return;}
  const phase = (agent.phase||0)+time*.3,
    walk = Math.sin(phase * 2.3);
  for (const leg of g.userData.legs)
    leg.limb.rotation.x = Math.sin(phase * 2.3 + leg.phase) * leg.stride * ((agent.speed||0)>.01?1:.12);
  g.userData.body.position.y = Math.sin(phase * 4.6) * 0.007;g.userData.body.scale.y=(g.userData.restScale?.[1]||1)*(1+Math.sin(time*1.6+(agent.phase||0))*.003);
  if (g.userData.tail) g.userData.tail.rotation.y = walk * 0.13;
}
export function buildSentry(m) {
  const g = new T.Group();
  box(g, m.dark, [0, 0.85, 0], [0.39, 0.49, 0.24], 0.08);
  box(g, m.hull, [0, 0.95, -0.12], [0.35, 0.24, 0.055], 0.035);
  box(g, m.dark, [0, 1.23, 0], [0.24, 0.27, 0.24], 0.07);
  box(g, m.glass, [0, 1.27, -0.12], [0.21, 0.075, 0.03], 0.015);
  box(g, m.red, [0, 1.27, -0.14], [0.13, 0.013, 0.008], 0.003);
  for (const s of [-1, 1]) {
    rod(
      g,
      m.dark,
      [s * 0.13, 0.63, 0],
      [s * 0.15, 0.35, 0.025],
      0.085,
      0.06,
      8,
    );
    rod(
      g,
      m.hull,
      [s * 0.15, 0.35, 0.025],
      [s * 0.16, 0.06, 0],
      0.067,
      0.04,
      8,
    );
    box(g, m.black, [s * 0.16, 0.035, -0.06], [0.14, 0.08, 0.25], 0.02);
    rod(
      g,
      m.dark,
      [s * 0.25, 1.02, 0],
      [s * 0.32, 0.8, -0.15],
      0.065,
      0.052,
      8,
    );
    rod(
      g,
      m.dark,
      [s * 0.32, 0.8, -0.15],
      [s * 0.19, 0.87, -0.37],
      0.05,
      0.035,
      8,
    );
  }
  box(g, m.dark, [0.1, 0.87, -0.39], [0.09, 0.1, 0.48], 0.012);
  return g;
}

export function buildCitizen(m,entity){
 const g=buildSentry(m),color=LongwayCore.FACTIONS.find(f=>f.id===entity.faction)?.color||'#8cafab';
 g.userData.walkLegs=[];g.scale.setScalar(1.25);
 for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.14,.63,0);const parts=g.children.filter(o=>o.isMesh&&o.position.y<.65&&Math.sign(o.position.x)===side);g.add(leg);for(const part of parts){g.remove(part);leg.add(part);part.position.sub(leg.position);}g.userData.walkLegs.push({leg,side});}
 g.userData.ownedMaterials=[];
 const uniform=m.hull.clone();uniform.color.set(color);g.userData.ownedMaterials.push(uniform);
 for(const part of g.children)if(part.isMesh&&part.material===m.hull)part.material=uniform;
 g.userData.arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.25,1.02,0);const parts=g.children.filter(o=>o.isMesh&&Math.sign(o.position.x)===side&&Math.abs(o.position.x)>.2&&o.position.y>.7&&o.position.y<1.05);g.add(arm);for(const p of parts){p.removeFromParent();arm.add(p);p.position.sub(arm.position);}g.userData.arms.push({arm,side});}
 if(entity.civilian){const gun=g.children.find(o=>o.isMesh&&o.position.z<-.3);if(gun)gun.visible=false;}
 return g;
}
export function animateCitizen(g,e,time){const speed=Math.hypot(...(e.velocity||[0,0,0]))*1000,phase=time*(5+Math.min(speed,5))+((e.phase||0)%6),stride=Math.min(1,speed/2.5);for(const {leg,side}of g.userData.walkLegs||[])leg.rotation.x=Math.sin(phase+(side>0?Math.PI:0))*.4*stride;for(const {arm,side}of g.userData.arms||[]){arm.rotation.x=e.civilian?Math.sin(phase+(side<0?Math.PI:0))*.25*stride:Math.sin(time*1.5)*.012;arm.rotation.z=e.civilian&&!stride?Math.sin(time*.9+side)*.045:0;}g.scale.y=1.25*(1+Math.sin(time*1.7+(e.phase||0))*.002);g.userData.animation=speed>.1?'walk':e.civilian?'idle-gesture':'aim';}
