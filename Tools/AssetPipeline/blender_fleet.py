"""Editable Blender production fleet; Unity imports the evaluated mesh and split normals.
Run after export-original.mjs. No external assets or proprietary ship geometry are used.
"""
import bpy, bmesh, json, math, struct, hashlib
from pathlib import Path
from mathutils import Vector
PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/'Assets/SpacePatriot/Original/Converted'
manifest=json.loads((OUT/'import.json').read_text(encoding='utf-8'))
fleet=json.loads((PROJECT/'Assets/SpacePatriot/Resources/Fleet.json').read_text())['crafts']
names=['ivory','olive','steel','ochre','dark','glass','rubber','lamp']
ids=['a93f2303be76b820cd4359d5','fa49ccf8c1068cb1addd1fdf','0ed487a4f602a5da5b25240d','5f6798c001a33feaa5a63277','b375305622d79c18b52fecc2','2469ce1712e4d29ee383ba89','f3c94c8065ad4e8b3f6a845c','71a426e2e4221aa6c76b60c2']
ids[0]=next(r['id'] for r in manifest['materials'] if r.get('paint') and r.get('map')=='tex-18b8c6414fabfe677b98176b.png')
records={r['id']:r for r in manifest['materials']}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
for name,id in zip(names,ids):
 r=records[id];m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*r['color'],1);bs.inputs['Metallic'].default_value=r['metal'];bs.inputs['Roughness'].default_value=r['rough']
 if r['map']:
  tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(str(OUT/r['map']),check_existing=True);m.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color'])
 mats[name]=m
active=None
def xyz(p):return (p[0],p[2],p[1])
def mesh(name,vertices,faces,mat='ivory',bevel=0,gear=False):
 data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in vertices],[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 ob=bpy.data.objects.new(name,data);active.objects.link(ob);ob.data.materials.append(mats[mat]);ob['material_id']=ids[names.index(mat)];ob['gear']=gear
 uv=data.uv_layers.new(name='Fabrication UV')
 for poly in data.polygons:
  n=poly.normal
  for li in poly.loop_indices:
   p=data.vertices[data.loops[li].vertex_index].co
   uv.data[li].uv=(p.x*.22,p.y*.22) if abs(n.z)>.65 else (p.y*.22,p.z*.22) if abs(n.x)>.65 else (p.x*.22,p.z*.22)
 if bevel>0:
  mod=ob.modifiers.new('Rolled plate edges','BEVEL');mod.width=bevel;mod.segments=2
  norm=ob.modifiers.new('Area weighted fabrication normals','WEIGHTED_NORMAL');norm.keep_sharp=True;norm.weight=50
 return ob
def box(name,p,size,mat='ivory',bevel=.025,gear=False):
 x,y,z=p;a,b,c=[v/2 for v in size];v=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 return mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,min(bevel,min(size)*.25),gear)
def tube(name,a,b,r,mat='steel',r2=None,segments=16,gear=False):
 a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
 if u.length<.01:u=d.cross(Vector((1,0,0)))
 u.normalize();v=d.cross(u).normalized();verts=[]
 for p,rad in [(a,r),(b,r if r2 is None else r2)]:
  for i in range(segments):q=p+rad*(u*math.cos(i*math.tau/segments)+v*math.sin(i*math.tau/segments));verts.append(q)
 faces=[tuple(range(segments-1,-1,-1)),tuple(range(segments,segments*2))]+[(i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments)]
 return mesh(name,verts,faces,mat,0,gear)
def beam(name,a,b,width,mat='steel',gear=False):
 # A rectangular beam with a stable orthogonal frame, useful for structural trusses.
 a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
 if u.length<.01:u=d.cross(Vector((1,0,0)))
 u.normalize();v=d.cross(u);verts=[p+(u*i+v*j)*width/2 for p in [a,b] for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 return mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,width*.1,gear)
def ring(name,p,r,t,mat='steel',segments=24):
 x,y,z=p;verts=[]
 for i in range(segments):
  a=i*math.tau/segments
  for j in range(6):b=j*math.tau/6;verts.append((x+math.cos(a)*(r+t*math.cos(b)),y+math.sin(a)*(r+t*math.cos(b)),z+t*math.sin(b)))
 faces=[]
 for i in range(segments):
  for j in range(6):faces.append((i*6+j,((i+1)%segments)*6+j,((i+1)%segments)*6+(j+1)%6,i*6+(j+1)%6))
 return mesh(name,verts,faces,mat)
def plate(name,points,normal,depth,mat='ivory',margin=.025):
 center=sum((Vector(p) for p in points),Vector())/len(points);normal=Vector(normal).normalized();vs=[center+(Vector(p)-center)*(1-margin) for p in points];n=len(vs)
 return mesh(name,[v+normal*depth for v in vs]+[v for v in vs],[tuple(range(n)),tuple(range(n*2-1,n-1,-1))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,min(depth*.25,.06))
cross=[(-.70,1),(.70,1),(1,.57),(1,-.57),(.70,-1),(-.70,-1),(-1,-.57),(-1,.57)]
def armored_hull(L,bw,H,front=.45,back=-.35,offset=(0,0,0),prefix='Pressure hull',paint='ivory',cockpit=True):
 sections=[(back,.77,.66,-.05),(-.26,1,1,0),(-.10,1.03,1.03,0),(.07,1,1,.02),(.23,.94,.95,0),(.35,.78,.72,-.09),(front,.59,.43,-.19)]
 rings=[[(x*w*bw+offset[0],v*h*H+cy*H+offset[1],z*L+offset[2]) for x,v in cross] for z,w,h,cy in sections]
 verts=sum(rings,[]);faces=[tuple(range(7,-1,-1)),tuple(range(48,56))]
 for k in range(6):
  for j in range(8):faces.append((k*8+j,k*8+(j+1)%8,(k+1)*8+(j+1)%8,(k+1)*8+j))
 mesh(prefix+' / gasket shell',verts,faces,'dark',.035)
 for k in range(6):
  for j in range(8):
   ps=[rings[k][j],rings[k][(j+1)%8],rings[k+1][(j+1)%8],rings[k+1][j]];normal=(Vector(ps[1])-Vector(ps[0])).cross(Vector(ps[3])-Vector(ps[0])).normalized();center=sum(map(Vector,ps),Vector())/4
   outward=Vector((center.x-offset[0],center.y-offset[1],0))
   if normal.dot(outward)<0:normal=-normal
   glazing=cockpit and k==4 and j in (0,1,7)
   mat='glass' if glazing else 'ochre' if k==2 and j in (0,2,6) else paint if j in (0,1,2,6,7) else 'dark'
   if L>60 and not glazing:
    # Capital plating uses human-sized service bays rather than scaling a fighter skin.
    divisions=max(2,int((Vector(ps[3])-Vector(ps[0])).length/7))
    for cell in range(divisions):
     a=cell/divisions;b=(cell+1)/divisions
     quad=[Vector(ps[0]).lerp(Vector(ps[3]),a),Vector(ps[1]).lerp(Vector(ps[2]),a),Vector(ps[1]).lerp(Vector(ps[2]),b),Vector(ps[0]).lerp(Vector(ps[3]),b)]
     plate(prefix+' / replaceable hull bay',quad,normal,.13,mat,.035)
   else:plate(prefix+(' / inset bridge glazing' if glazing else ' / formed removable armor'),ps,normal,.035,mat,.045 if glazing else .015)
   if j in (0,1,2,6,7):
    for point in ps:
     p=center+(Vector(point)-center)*.87+normal*.075;tube('Recessed captive fastener',p,p+normal*.025,.026,'steel',segments=6)
   if glazing:
    for i in range(4):beam('Glazing seal rail',Vector(ps[i])+normal*.08,Vector(ps[(i+1)%4])+normal*.08,.055,'steel')
    beam('Bridge mullion',(Vector(ps[0])+Vector(ps[1]))*.5+normal*.08,(Vector(ps[2])+Vector(ps[3]))*.5+normal*.08,.06,'ivory')
 plate(prefix+' / armored nose cap',rings[-1],(0,0,1),.06,paint,.012)
 return rings
def engine(x,y,z,r,length):
 # Open concentric nozzle with real cavity, external segmented cladding and exposed lines.
 tube('Drive structural casing',(x,y,z-length*.35),(x,y,z+length*.35),r,'dark',segments=24)
 for k in range(8):
  a=k*math.tau/8;da=.36;points=[]
  for dz,aa in [(-.31,a-da),(-.31,a+da),(.30,a+da),(.30,a-da)]:points.append((x+math.cos(aa)*r,y+math.sin(aa)*r,z+length*dz))
  plate('Drive armor petal',points,(math.cos(a),math.sin(a),0),r*.07,'ivory' if k%3 else 'olive',.05)
  for dz in [-.30,.29]:tube('Engine armor pin',(x+math.cos(a)*r*1.08,y+math.sin(a)*r*1.08,z+length*dz),(x+math.cos(a)*r*1.11,y+math.sin(a)*r*1.11,z+length*dz),r*.024,'steel',segments=6)
 for dz in [-.34,.33]:ring('Bolted engine flange',(x,y,z+length*dz),r,r*.045)
 ring('Exhaust lip',(x,y,z-length*.39),r*.89,r*.085,'dark');ring('Turbine inner ring',(x,y,z-length*.36),r*.66,r*.035,'ochre')
 for k in range(16):
  a=k*math.tau/16;b=a+.13;beam('Nozzle petal',(x+math.cos(a)*r*.78,y+math.sin(a)*r*.78,z-length*.40),(x+math.cos(b)*r*.52,y+math.sin(b)*r*.52,z-length*.31),r*.045,'steel')
 tube('Exhaust darkness',(x,y,z-length*.345),(x,y,z-length*.35),r*.53,'rubber',segments=24)
 tube('Emitter',(x,y,z-length*.36),(x,y,z-length*.362),r*.14,'lamp',segments=16)
 for s in [-1,1]:tube('Fuel delivery',(x+s*r*.7,y+r*.75,z-length*.31),(x+s*r*.7,y+r*.75,z+length*.30),r*.042,'steel')
 ring('Forward intake rim',(x,y,z+length*.36),r*.9,r*.06,'steel')
 ring('Forward intake inner flange',(x,y,z+length*.365),r*.67,r*.035,'ochre')
 tube('Intake hub',(x,y,z+length*.36),(x,y,z+length*.38),r*.20,'dark',segments=16)
 for k in range(12):
  a=k*math.tau/12;beam('Intake stator',(x+math.cos(a)*r*.23,y+math.sin(a)*r*.23,z+length*.37),(x+math.cos(a+.2)*r*.85,y+math.sin(a+.2)*r*.85,z+length*.36),r*.065,'steel')
def landing(x,z,H,u):
 hip=(x,-H*.25,z);knee=(x*1.08,-H*.33-.5,z-.45*u);foot=(x*1.15,-H*.30-1.7,z+.15*u)
 tube('Landing trunnion', (x-.22*u,-H*.25,z),(x+.22*u,-H*.25,z),.28*u,'dark',segments=16,gear=True)
 beam('Torque link',hip,knee,.25*u,'ivory',True);tube('Hydraulic piston',knee,foot,.09*u,'steel',gear=True)
 tube('Hydraulic jacket',hip,knee,.16*u,'dark',gear=True);tube('Drag brace',(x*.9,-H*.27,z+.7*u),foot,.07*u,'steel',gear=True)
 box('Articulated landing pad',foot,(1.1*u,.15*u,1.6*u),'dark',.08,True)
 for k in range(4):box('Foot tread',(foot[0],foot[1]-.08,foot[2]+(k-1.5)*.32*u),(.9*u,.06,.09*u),'rubber',.01,True)
def build(craft):
 global active
 f=craft['family'];L,W,H=craft['dimensions'];u=min(2.0,L/22);active=bpy.data.collections.new('refit-'+str(f));bpy.context.scene.collection.children.link(active)
 cargo=f==2;salvage=f==5;large=f in [7,9];bw=W*(.17 if cargo else .21 if salvage else .24 if large else .20)
 armored_hull(L,bw,H*(.29 if large else .46),paint='dark' if salvage else 'ivory',cockpit=not large)
 if large:
  armored_hull(15,4.8,2.7,offset=(0,H*.29+1.9,L*.23),prefix='Raised command bridge')
  for side in [-1,1]:
   # Exposed transfer decks, service bays and separated radiators read at capital scale.
   for k in range(8):
    z=-L*.25+k*L*.065;x=side*bw*.72
    box('Raised armored deck bay',(x,H*.295,z),(bw*.46,.28,L*.052),'olive',.11)
    box('Bay access recess',(x,H*.303,z),(bw*.26,.10,L*.029),'dark',.06)
    for j in range(5):box('Deck radiator',(x-bw*.13+j*bw*.065,H*.37,z),(bw*.027,H*.12,L*.028),'steel',.05)
    box('Outer maintenance balcony',(side*bw*1.05,-H*.05,z),(2.2,.25,L*.045),'dark',.06)
    for n in [-1,1]:beam('Balcony safety rail',(side*(bw+1.8),0,z+n*L*.021),(side*(bw+1.8),1.0,z+n*L*.021),.06)
    beam('Balcony upper rail',(side*(bw+1.8),1,z-L*.021),(side*(bw+1.8),1,z+L*.021),.06)
  for k in range(7):
   z=-L*.24+k*L*.07
   for side in [-1,1]:box('Structural frame collar',(side*bw*.99,-H*.02,z),(.28,H*.45,.38),'steel',.06)
 # Maintenance bay: recessed grille, bolted access door, conduits, RCS clusters and climbing steps.
 for side in [-1,1]:
  x=side*bw
  box('Service hatch gasket',(x*1.037,0,-L*.06),(.08,H*.63,L*.10),'dark',.05)
  box('Removable service hatch',(x*1.052,0,-L*.06),(.06,H*.56,L*.091),'olive',.04)
  for k in range(3):tube('Boarding handhold',(x*1.07,-H*.18+k*.18,L*.05),(x*1.07,-H*.18+k*.18,L*.12),.025*u)
  for z in [-L*.20,L*.19]:
   box('RCS service unit',(x*.92,-H*.25,z),(.6*u,.46*u,.9*u),'dark',.08)
   for k in [-1,0,1]:tube('Canted manoeuvring nozzle',(x*1.03,-H*.25,z+k*.22*u),(x*1.09,-H*.25,z+k*.22*u),.083*u,'rubber',segments=12)
  for k in range(9):box('Flush heat exchanger',(side*bw*.62,H*(.30 if large else .467),-L*.17+k*.028*L),(.7*u,.05,.035*L),'dark',.01)
  for k in range(2):tube('Armored coolant trunk',(side*bw*.82,H*.24,-L*.28),(side*bw*.82,H*.24,L*.05),(.055+k*.01)*u)
 # Fuselage top utility assemblies and vented panels are deliberately grouped around the engineering space.
 for k in range(3):box('Dorsal equipment bay',(0,H*(.30 if large else .485),-L*.23+k*L*.08),(bw*.8,.13*u,L*.063),'dark',.045)
 if cargo:
  for side in [-1,1]:
   x=side*W*.32
   for h in [-H*.34,H*.34]:beam('Freight keel',(x,h,-L*.38),(x,h,L*.16),.16*u)
   for k in range(3):
    z=(-.28+k*.17)*L;box('Sealed freight cassette',(x,0,z),(W*.24,H*.56,L*.15),'olive',.075)
    for n in range(12):box('Container corrugation',(x+side*W*.121,0,z-L*.068+n*L*.0125),(.07,H*.50,.055*u),'steel',.01)
    for a in [-1,1]:
     beam('Container corner rail',(x+a*W*.117,-H*.28,z-L*.075),(x+a*W*.117,H*.28,z-L*.075),.10*u,'ochre')
     tube('Container tie down',(x+a*W*.09,-H*.33,z-L*.07),(x+a*W*.09,H*.32,z+L*.07),.055*u)
   for k in range(6):beam('Freight truss',(x,-H*.34,-L*.36+k*L*.085),(x,H*.34,-L*.275+k*L*.085),.08*u)
 elif salvage:
  x=-W*.31;tube('Recovery pressure vessel',(x,0,-L*.27),(x,0,L*.16),H*.26,'olive',segments=24)
  for k in range(6):ring('Salvage tank clamp',(x,0,-L*.24+k*L*.075),H*.27,.06*u)
  pts=[(W*.27,0,-L*.25),(W*.30,H*.86,-L*.10),(W*.33,H*.78,L*.26),(W*.33,H*.20,L*.35)]
  for a,b in zip(pts,pts[1:]):beam('Salvage crane boom',a,b,.46*u,'ochre');tube('Crane actuator',Vector(a)+Vector((-.22*u,0,0)),Vector(b)+Vector((-.22*u,0,0)),.07*u);tube('Crane joint',Vector(a)-Vector((.28*u,0,0)),Vector(a)+Vector((.28*u,0,0)),.28*u,'dark')
  for s in [-1,1]:beam('Grapple finger',pts[-1],Vector(pts[-1])+Vector((s*.6*u,-.7*u,0)),.17*u);beam('Grapple claw',Vector(pts[-1])+Vector((s*.6*u,-.7*u,0)),Vector(pts[-1])+Vector((s*.28*u,-1.2*u,0)),.12*u)
 elif large:
  # Long secondary hulls, transfer spines and negative-space hangar mouths distinguish capital vessels.
  for side in [-1,1]:
   x=side*W*.33;armored_hull(L*.68,W*.11,H*.17,offset=(x,-H*.13,-L*.11),prefix='Mission sponson',cockpit=False)
   for k in range(5):beam('Sponson cross frame',(side*bw*.8,-H*.08,-L*.25+k*L*.1),(x,-H*.1,-L*.25+k*L*.1),.65*u)
   box('Recessed hangar throat',(x,-H*.13,L*.2),(W*.12,H*.32,.13),'rubber',.04)
   for deck in range(4 if f==9 else 3):
    for k in range(14):box('Habitation viewport',(side*bw*1.045,H*.18-deck*1.0,-L*.22+k*L*.033),(.04,.34,.7),'glass',.045)
   for k in range(3):tube('Turret ring',(x,H*.16,-L*.20+k*L*.15),(x,H*.16+.23*u,-L*.20+k*L*.15),.6*u,'steel');box('Defensive turret',(x,H*.16+.4*u,-L*.20+k*L*.15),(.9*u,.5*u,1.1*u),'olive',.13)
  if f==9:
   # The carrier has a broad, readable flight deck with a raised center spine,
   # offset launch lanes and perimeter guidance lights instead of a scaled-up fighter shell.
   deckY=H*.30
   box('Flight deck island',(0,deckY+.44,-L*.03),(bw*.76,.74,L*.54),'olive',.28)
   box('Flight deck armored crown',(0,deckY+.83,-L*.01),(bw*.62,.12,L*.47),'steel',.12)
   for side in [-1,1]:
    beam('Landing lane centerline',(side*bw*.28,deckY+.91,L*.22),(side*bw*.28,deckY+.91,-L*.29),.12,'ochre')
    for k in range(13):
     z=-L*.29+k*L*.041
     box('Deck approach marker',(side*bw*.28,deckY+.92,z),(.48,.035,.20),'lamp',.025)
     box('Deck edge arrestor',(side*bw*.47,deckY+.08,z),(.22,.12,.72),'ochre',.035)
   # Hangar entrances are deep framed apertures with a visible door and track.
   for side in [-1,1]:
    x=side*W*.33;y=-H*.13;z=L*.20
    box('Hangar throat shadow',(x,y,z),(W*.125,H*.35,.16),'rubber',.025)
    for sx in [-1,1]:beam('Hangar pressure frame',(x+sx*W*.061,y-H*.18,z+.02),(x+sx*W*.061,y+H*.18,z+.02),.28*u,'steel')
    box('Retracting blast door',(x,y-H*.16,z+.10),(W*.105,.22,.12),'olive',.05)
 else:
  outlines={
   0:[(.12,.15),(.20,.19),(.42,-.03),(.43,-.25),(.28,-.20),(.12,-.14)],
   1:[(.12,.28),(.24,.24),(.50,-.02),(.45,-.24),(.30,-.18),(.12,-.25)],
   3:[(.10,.26),(.17,.22),(.31,-.03),(.28,-.24),(.18,-.19),(.10,-.23)],
   4:[(.12,.25),(.21,.29),(.47,-.10),(.48,-.31),(.29,-.22),(.12,-.30)],
   6:[(.12,.18),(.25,.20),(.43,.02),(.46,-.18),(.28,-.16),(.12,-.14)],
   8:[(.15,.35),(.23,.31),(.44,.09),(.48,-.10),(.32,-.04),(.16,-.17)]
  }
  for side in [-1,1]:
   outline=outlines.get(f,[(.13,.07),(.20,.09),(.45,-.10),(.47,-.23),(.24,-.23),(.13,-.18)])
   points=[(side*x*W,-H*.01,z*L) for x,z in outline];plate('Swept structural wing',points,(0,1,0),H*.11,'ivory',0)
   # Divided armor sections track the swept load-bearing spar.
   for k in range(4):
    a=.23+k*.052;x=side*a*W;z=(-.02-k*.04)*L
    box('Wing inspection inset',(x,H*.108,z),(W*.038,.025,L*.04),'olive',.04)
   beam('Wing reinforcement',(side*bw,0,-L*.17),(side*W*.45,0,-L*.19),.1*u)
   fin=[(side*W*.44,H*.09,-L*.16),(side*W*.47,H*.58,-L*.27),(side*W*.49,H*.14,-L*.34)]
   plate('Canted stabilizer',fin,(side,0,0),.06*u,'olive',0)
 ex=W*(.34 if cargo else .30 if large else .29);ez=-L*.32;er=min(W*.087,H*.31)*math.sqrt(2/max(2,craft['engines']))
 engineCount=max(2,int(craft['engines']))
 driveX=[0] if engineCount==1 else [((i/(engineCount-1))*2-1)*ex for i in range(engineCount)]
 for index,x in enumerate(driveX):
  side=-1 if x<0 else 1
  z=ez+(L*.065 if engineCount>=4 and index%2 else -L*.065 if engineCount>=4 else 0)
  y=H*.14 if index%2==0 else -H*.18
  beam('Articulated drive pylon',(side*min(abs(x),bw),0,z+L*.09),(x,y,z),.45*u)
  engine(x,y,z,er,L*.26)
 for side in [-1,1]:landing(side*bw*.82,L*.23,H,u);landing(side*W*.26,-L*.22,H,u)
 if f==1:
  # Interceptor: paired forward canards and close-set armor give it a compact attack profile.
  for side in [-1,1]:
   plate('Interceptor nose canard',[(side*bw*.70,H*.02,L*.27),(side*W*.39,H*.02,L*.40),(side*W*.34,H*.02,L*.20),(side*bw*.62,H*.02,L*.09)],(0,1,0),H*.10,'ochre',.015)
   tube('Twin sensor lance',(side*bw*.42,H*.04,L*.39),(side*bw*.42,H*.04,L*.53),.045*u,'steel',segments=10)
 if f==3:
  # Courier: paired cargo outriggers leave the centerline open for fast service access.
  for side in [-1,1]:
   beam('Courier cargo outrigger',(side*bw*.7,-H*.10,-L*.22),(side*W*.34,-H*.16,L*.12),.34*u,'steel')
   box('Courier sealed packet',(side*W*.31,-H*.12,-L*.015),(W*.13,H*.25,L*.22),'olive',.10)
 if f==6:
  # Shuttle: explicit passenger pressure cabin, window belt and aft boarding sill.
  box('Shuttle passenger cabin',(0,H*.16,-L*.02),(bw*1.45,H*.38,L*.39),'olive',.18)
  for side in [-1,1]:
   for k in range(5):box('Shuttle cabin window',(side*bw*.73,H*.19,L*.12-k*L*.052),(.055,.32,.62),'glass',.07)
   box('Shuttle boarding threshold',(side*bw*.78,-H*.05,-L*.27),(1.25,.12,L*.12),'ochre',.06)
 if f==8:
  # Racer: a low dorsal keel and twin tail fins produce a separate silhouette in profile.
  box('Racer dorsal spine',(0,H*.49,-L*.12),(bw*.27,.24*u,L*.55),'dark',.08)
  for side in [-1,1]:
   fin=[(side*bw*.55,H*.18,-L*.27),(side*bw*.92,H*.58,-L*.36),(side*bw*.78,H*.16,-L*.43)]
   plate('Racer split-tail fin',fin,(side,0,0),.11*u,'ochre',.01)
 tube('Nose sensor gimbal',(0,-H*.29,L*.36),(0,-H*.29,L*.44),.29*u,'dark',segments=24)
 ring('Optical sensor collar',(0,-H*.29,L*.445),.21*u,.025*u);tube('Optical sensor face',(0,-H*.29,L*.447),(0,-H*.29,L*.45),.18*u,'glass',segments=24)
 for side in [-1,1]:tube('Nose lamp',(side*bw*.52,-H*.22,L*.44),(side*bw*.52,-H*.22,L*.446),.085*u,'lamp',segments=12)
 for k in range(3):tube('Communications mast',(-.25*u+k*.25*u,H*.48,-L*.06),(-.25*u+k*.25*u,H*.48+(.55-k*.13)*u,-L*.06),.018*u)
 return active
def export(collection):
 deps=bpy.context.evaluated_depsgraph_get();groups={}
 for ob in collection.objects:
  if ob.type!='MESH':continue
  evaluated=ob.evaluated_get(deps);data=evaluated.to_mesh();data.calc_loop_triangles();key=(ob['material_id'],ob['gear']);verts,indices=groups.setdefault(key,([],[]));uv=data.uv_layers.active
  normals=data.corner_normals
  for tri in data.loop_triangles:
   for li in tri.loops:
    co=ob.matrix_world@data.vertices[data.loops[li].vertex_index].co;normal=ob.matrix_world.to_3x3()@normals[li].vector;t=uv.data[li].uv
    indices.append(len(verts)//8);verts.extend((co.x,co.z,co.y,normal.x,normal.z,normal.y,t.x,t.y))
  evaluated.to_mesh_clear()
 nodes=[]
 for (mat,gear),(vertices,indices) in groups.items():
  binary=struct.pack('<ii',len(vertices)//8,len(indices))+struct.pack('<'+'f'*len(vertices),*vertices)+struct.pack('<'+'i'*len(indices),*indices);file='mesh-'+hashlib.sha256(binary).hexdigest()[:24]+'.bytes';(OUT/file).write_bytes(binary)
  nodes.append(dict(file=file,material=mat,bone='',pivot=[0,0,0],gear=gear,door='',lift=False,liftFloor=-1,liftSide=0,mfd=-1,button=-1,name='Landing gear' if gear else 'Blender fabricated hull'))
 model=next(m for m in manifest['models'] if m['id']==collection.name);model['nodes']=nodes;print('BLENDER_FLEET',collection.name,len(nodes),sum(len(v[1])//3 for v in groups.values()),flush=True)
for family in range(10):
 col=build(fleet[family*10]);export(col)
 # Each collection stays editable but only one is visible when the blend opens.
 col.hide_viewport=family!=0;col.hide_render=family!=0
(OUT/'import.json').write_text(json.dumps(manifest),encoding='utf-8')
blend=PROJECT/'ArtDirection/Production';blend.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend/'SpacePatriot-Fleet.blend'))
print('BLENDER_FLEET_COMPLETE',flush=True)

