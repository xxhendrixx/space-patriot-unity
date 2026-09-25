import { T, frame } from './primitives.js';
import {partitionInstances} from './view-culling.js';

// Nearby mineral outcrops and low vegetation use two draw calls and a fixed cap.
export class SurfaceDetail {
  constructor(stage) {
    this.stage = stage; this.geometry = new T.IcosahedronGeometry(1, 0);
    this.rock = stage.materials.rock.clone(); this.rock.roughness = .95;
    this.shrub = stage.materials.bark.clone(); this.shrub.roughness = 1; this.shrub.metalness = 0;
    this.count = 0;
  }
  disposeGroup(group) { if (!group) return; group.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); group.removeFromParent(); }
  *build(body, x, z, vegetation, capacity) {
    const C = LongwayCore, anchor = vegetation.anchor, group = new T.Group();
    group.name = 'Biome surface population'; group.userData.worldFrame = anchor;
    const meshes = [this.rock, this.shrub].map(material => new T.InstancedMesh(this.geometry, material, capacity));
    for (const mesh of meshes) { mesh.count = 0; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
    this.pending = group;
    const dummy = new T.Object3D(), spacing = 9, cx = Math.floor(x / spacing), cz = Math.floor(z / spacing), sites = [];
    for (let i = -18; i <= 18; i++) for (let j = -18; j <= 18; j++) if (i*i+j*j < 18*18) sites.push([cx+i, cz+j, i*i+j*j]);
    sites.sort((a,b) => a[2]-b[2]);
    let total = 0, work = 0;
    for (const [i, j] of sites) {
      if (total >= capacity) break;
      if (++work % 12 === 0) yield;
      const random = WWCore.rng(C.hash(body.seed ^ Math.imul(i, 7919) ^ Math.imul(j, 104729)));
      if (random() > .42) continue;
      const p = vegetation.point((i + random()) * spacing, (j + random()) * spacing, body);
      if (!p.valid) continue;
      const region = C.PlanetEngines.region(body, C.unit(C.sub(p.world, body.center)), p.h);
      const organic = C.PlanetEngines.profile(body).grass && random() < region.moisture * .6;
      const mesh = meshes[organic ? 1 : 0], scale = .25 + random() * (organic ? 1.1 : 1.8);
      dummy.position.set(p.position[0], p.position[1] + scale * .28, p.position[2]);
      dummy.rotation.set(random() * .3, random() * Math.PI * 2, random() * .3);
      dummy.scale.set(scale * (1 + random()), scale * (organic ? .9 : .55), scale);
      dummy.updateMatrix(); mesh.setMatrixAt(mesh.count, dummy.matrix);
      const color = new T.Color();
      const pigment = organic ? (region.climate?.grassColor || [.15,.3,.08]) : body.type === 4 ? [.62,.72,.8] : body.type === 5 ? [.16,.12,.1] : [.62,.58,.51];
      color.setRGB(...pigment.map(v => v * (.75 + random() * .35)));
      mesh.setColorAt(mesh.count++, color); total++;
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.removeFromParent();for(const batch of partitionInstances(mesh,64))group.add(batch);
    }
    this.disposeGroup(this.root); this.root = group; this.pending = null;
    this.stage.scene.add(group); this.count = total; this.center = [x,z];
  }
  update(body, origin, surface) {
    const C = LongwayCore, vegetation = this.stage.engines.vegetation, f = vegetation.anchor;
    if (!f) return;
    const near = this.stage.app.world.nearest(origin), active = surface && body.type !== 3 && near.altitude < .5;
    const revision = window.LongwayGraphics?.revision || 0;
    if (this.body !== body.id || this.anchor !== f || this.revision !== revision) {
      this.job?.return(); this.disposeGroup(this.pending); this.pending = null;
      this.disposeGroup(this.root); this.root = null; this.center = null; this.job = null;
      this.body = body.id; this.anchor = f; this.revision = revision; this.count = 0;
    }
    const delta = C.sub(origin, f.center), x = C.dot(delta,f.right)*1000, z = -C.dot(delta,f.forward)*1000;
    if (active && !this.job && (!this.center || Math.hypot(x-this.center[0],z-this.center[1]) > 72))
      this.job = this.build(body,x,z,vegetation,window.LongwayGraphics?.population.detail || 240);
    if (active && this.job) {
      const deadline = performance.now()+2;
      do { if (this.job.next().done) { this.job = null; break; } } while (performance.now() < deadline);
    }
    if (this.root) { this.root.visible = active; frame(this.root,f.center,f.right,f.up,f.forward,origin); }
  }
}
