/* Illustrated production assets are the cockpit/HUD skin, not reference images.
   Screen apertures use calibrated image-space quadrilaterals; values remain live. */
(function initArtwork() {
  if (!window.longway) {
    addEventListener("longway-ready", initArtwork, { once: true });
    return;
  }
  const A = longway,
    F = A.flight,
    B = A.combat,
    S = A.systems,
    C = LongwayCore;
  const assets = {
    strider: "assets/ui/strider-cockpit.png",
    wayfarer: "assets/ui/wayfarer-cockpit.png",
    meridian: "assets/ui/meridian-cockpit.png",
    frame: "assets/ui/instrument-frame.png",
    rifle: "assets/ui/rifle-view-v10.png",
    rifleAds: "assets/ui/rifle-ads-v11.png",
    sidearm: "assets/ui/sidearm-view.png",
  };
  const apertures = {
    strider: [
      [
        [340, 680],
        [565, 680],
        [564, 818],
        [336, 818],
      ],
      [
        [651, 667],
        [882, 667],
        [882, 814],
        [651, 814],
      ],
      [
        [970, 682],
        [1193, 682],
        [1200, 820],
        [973, 820],
      ],
    ],
    wayfarer: [
      [
        [365, 636],
        [592, 635],
        [590, 728],
        [350, 728],
      ],
      [
        [643, 619],
        [893, 619],
        [899, 724],
        [640, 724],
      ],
      [
        [944, 638],
        [1171, 640],
        [1193, 730],
        [950, 730],
      ],
    ],
    meridian: [
      [
        [366, 682],
        [569, 681],
        [569, 784],
        [360, 784],
      ],
      [
        [628, 663],
        [907, 663],
        [913, 780],
        [626, 780],
      ],
      [
        [970, 682],
        [1173, 682],
        [1183, 785],
        [970, 785],
      ],
    ],
  };
  const node = document.createElement("div");
  node.id = "illustratedCockpit";
  node.setAttribute("aria-label", "Illustrated cockpit with live instruments");
  node.innerHTML =
    '<canvas id="cockpitArtwork" width="1536" height="1024" aria-label="Illustrated cockpit hardware surrounding the live game view"></canvas>';
  document.body.append(node);
  const picture = node.querySelector("canvas"),
    screens = [];
  const deckLight=document.createElement('canvas');deckLight.width=768;deckLight.height=512;deckLight.className='cockpit-relief-light';deckLight.setAttribute('aria-hidden','true');node.append(deckLight);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const deckPose={x:0,y:0,scale:1.018,light:0},motion={x:0,y:0,last:0};
  const artworkY=y=>y<=620?y*744/620:744+(y-620)*280/404;
  const gunImage = document.createElement("img");
  gunImage.id = "illustratedWeapon";
  gunImage.alt = "Illustrated first-person weapon";
  gunImage.hidden = true;
  const weaponView=document.createElement('div');weaponView.id='weaponView';weaponView.hidden=true;
  const adsImage=document.createElement('canvas');adsImage.id='adsWeapon';adsImage.width=1536;adsImage.height=1024;
  const flash=document.createElement('canvas');flash.id='muzzleFlash';flash.width=256;flash.height=256;
  const dot=document.createElement('div');dot.id='adsDot';dot.hidden=true;dot.setAttribute('aria-label','Red dot aiming point');
  const vision=document.createElement('div');vision.id='visionStatus';vision.hidden=true;
  weaponView.append(gunImage,adsImage,flash);document.body.append(weaponView,dot,vision);
  let adsReady=false;
  function weaponLayout(){
    const a=adsReady&&B.key==='rifle'?C.smooth(B.aimBlend||0):0;
    const hipW=Math.min(innerWidth*.85,innerHeight*.90,960),adsW=Math.min(innerWidth*.94,innerHeight*1.35,1300),w=hipW+(adsW-hipW)*a,h=w*2/3;
    const mx=(B.key==='sidearm'?863:677)*(1-a)+768*a,my=(B.key==='sidearm'?488:479)*(1-a)+448*a;
    const hipX=innerWidth*.5-(B.key==='sidearm'?863:677)*w/1536,adsX=innerWidth*.5-768*w/1536;
    const x=hipX+(adsX-hipX)*a,y=(innerHeight-h)*(1-a)+(innerHeight*.5-420*h/1024)*a;
    const angle=-B.recoil*2.4*(1-a*.85)*Math.PI/180,dy=B.reloadTime>0?Math.sin(Math.min(1,B.reloadTime/B.spec.reload)*Math.PI)*180:-B.recoil*(24-20*a);
    const rx=mx*w/1536-w*.5,ry=my*h/1024-h*.5;
    return {w,h,x,y,a,mx,my,angle,dy,muzzle:[x+w*.5+rx*Math.cos(angle)-ry*Math.sin(angle),y+h*.5+dy+rx*Math.sin(angle)+ry*Math.cos(angle)]};
  }
  B.muzzlePose=(traceAim=true)=>{
    if(!(F.walking||F.bridgeWalk)||!B.armed||!['rifle','sidearm'].includes(B.key))return null;
    const p=F.renderPose(),layout=weaponLayout(),[px,py]=layout.muzzle,depth=.00055;
    const position=C.add(p.position,C.add(C.mul(p.forward,depth),C.add(C.mul(p.right,(px/innerWidth*2-1)*depth*A.renderer.fov*innerWidth/innerHeight),C.mul(p.up,(1-py/innerHeight*2)*depth*A.renderer.fov))));
    const end=C.add(p.position,C.mul(p.forward,B.spec.range)),hit=traceAim?B.firstHit(p.position,end,'local'):null;
    const target=hit?C.add(p.position,C.mul(C.sub(end,p.position),Math.max(.001,hit.t))):end;
    return {position,direction:C.unit(C.sub(target,position)),target,screen:layout.muzzle};
  };

  const imageCache = {};
  for (const [k, url] of Object.entries(assets)) {
    const im = new Image();
    if(k==='rifleAds')im.onload=()=>{
      // The authored asset has a chroma backdrop. Apply the sprite material's
      // color key once at decode, including the open optic aperture.
      const q=adsImage.getContext('2d');q.drawImage(im,0,0,1536,1024);const pixels=q.getImageData(0,0,1536,1024),d=pixels.data;
      for(let i=0;i<d.length;i+=4){const excess=d[i+1]-Math.max(d[i],d[i+2]);if(excess>35){d[i+3]=Math.round(d[i+3]*(1-C.clamp((excess-35)/65,0,1)));d[i+1]=Math.min(d[i+1],Math.max(d[i],d[i+2])+20);}}
      q.putImageData(pixels,0,0);adsReady=true;
    };
    im.src = url;
    imageCache[k] = im;
  }
  document.documentElement.style.setProperty(
    "--hud-frame",
    `url("${assets.frame}")`,
  );
  for (let i = 0; i < 3; i++) {
    const screen = document.createElement("button");
    screen.className = "art-screen";
    screen.setAttribute(
      "aria-label",
      [
        "Navigation display: open destinations",
        "Radar display: open tactical operations",
        "Ship display: open vessel systems",
      ][i],
    );
    screen.title = [
      "Navigation / destinations",
      "Live radar / tactical operations",
      "Weapons / engineering",
    ][i];
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = 380;
    screen.append(cv);
    node.append(screen);
    screen.onclick=e=>{
      e.stopPropagation();
      // Invert the full projective bezel transform; bounding-box scaling loses
      // perspective and offsetX can refer to either the canvas or its button.
      const parent=node.getBoundingClientRect();
      const inverse=new DOMMatrix(getComputedStyle(screen).transform).inverse();
      const p=inverse.transformPoint(new DOMPoint(e.clientX-parent.left,e.clientY-parent.top));
      if(Math.abs(p.w)>1e-8)window.BloxMFD?.click(i,{offsetX:p.x/p.w,offsetY:p.y/p.w});
    };
    screens.push({ element: screen, canvas: cv });
  }
  const controls = [
    ["POWER", () => F.togglePower(),()=>F.drive.power],
    ["IFCS", () => F.toggleAssist(),()=>F.assist],
    ["GEAR", () => F.toggleGear(),()=>F.vehicle.gearTarget>.5],
    ["LAMPS", () => F.toggleLights(),()=>F.vehicle.lights],
    ["NAV", () => S.setMode(S.mode === "NAV" ? "SCM" : "NAV"),()=>S.mode==='NAV'],
    ["CRUISE",()=>F.toggleCruise(),()=>F.drive.cruiseLatched],
    ["LAND", () => F.toggleLanding(),()=>['landed','docked'].includes(F.vehicle.state)],
    ["SEAT", () => F.craft.dimensions[0]>60?S.tourBridge():F.toggleWalk(),()=>F.bridgeWalk],
    ["VIEW", () => F.toggleCamera(),()=>F.cameraMode!=='cockpit'],
    ["ARM",()=>B.setArmed(!B.armed),()=>B.armed],
  ];
  for (const [label, action, state] of controls) {
    const b = document.createElement("button"); b.setAttribute("aria-label",label);b.className="art-control-hotspot";b.dataset.control=label;
    b.title={SEAT:'Leave the pilot seat / walk the ship',LAND:'Launch / request landing',NAV:'SCM combat / NAV travel',VIEW:'Cockpit / exterior view'}[label]||label;
    b.onclick=()=>{A.start();action();A.toast(F.message||S.warning);A.focusScene();A.renderer.needsRender=true;update();};
    b.readState=state;node.append(b);
  }
  // Click areas are calibrated in source-image pixels, using the same transform
  // as the artwork. Hardware remains painted; labels appear only on hover/focus.
  const hardware={
    strider:[[400,877,30,48],[445,877,30,48],[489,877,30,48],[1045,877,30,48],[1091,877,30,48],[1135,877,30,48],[685,858,25,24],[851,858,25,24],[550,876,26,36],[1358,826,32,32]],
    wayfarer:[[347,850,24,28],[368,850,24,28],[1169,850,24,28],[1192,850,24,28],[538,779,26,26],[518,794,24,24],[578,777,26,34],[958,777,26,34],[998,779,26,26],[1018,794,24,24]],
    meridian:[[330,847,30,34],[386,851,30,40],[432,851,30,40],[1108,851,30,40],[1153,851,30,40],[1200,847,30,34],[650,824,36,38],[880,824,36,38],[510,859,70,25],[1029,859,70,25]]
  };
  const bezelControls=[];
  const destinations=[['NAV','navigation'],['RADAR','radarPanel'],['WEAPONS','weaponsPanel'],['SYSTEMS','engineeringDialog'],['CREW','crewPanel'],['STATIONS','shipboardPanel']];
  for(let display=0;display<3;display++)destinations.forEach(([label,id],k)=>{const b=document.createElement('button');b.className='mfd-bezel-button';b.setAttribute('aria-label',label+' menu on display '+(display+1));b.title=label;b.dataset.screen=id;b.onclick=e=>{e.stopPropagation();window.BloxMFD?.select(display,id);};node.append(b);bezelControls.push({element:b,display,k});});
  // Solve the 8-coefficient homography so each live screen follows its painted bezel.
  function transform(quad, scale, ox, oy) {
    const pts = quad.map(([x, y]) => [x * scale + ox, y * scale + oy]),
      src = [
        [0, 0],
        [640, 0],
        [640, 380],
        [0, 380],
      ],
      mat = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i],
        [X, Y] = pts[i];
      mat.push(
        [x, y, 1, 0, 0, 0, -x * X, -y * X, X],
        [0, 0, 0, x, y, 1, -x * Y, -y * Y, Y],
      );
    }
    for (let i = 0; i < 8; i++) {
      let p = i;
      for (let k = i + 1; k < 8; k++)
        if (Math.abs(mat[k][i]) > Math.abs(mat[p][i])) p = k;
      [mat[i], mat[p]] = [mat[p], mat[i]];
      const d = mat[i][i];
      for (let j = i; j < 9; j++) mat[i][j] /= d;
      for (let k = 0; k < 8; k++)
        if (k !== i) {
          const v = mat[k][i];
          for (let j = i; j < 9; j++) mat[k][j] -= v * mat[i][j];
        }
    }
    const h = mat.map((r) => r[8]);
    return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
  }
  let current = "",
    lastLayout = "";
  const api = (window.BloxArtwork = {
    active: false,
    weaponActive: false,
    assets,
    screens,
    deckPose,
    weaponLayout,
    get adsReady(){return adsReady;},
    update,
    paintTo,
    ready: () =>
      ["strider", "wayfarer", "meridian", "frame"].every(
        (k) => imageCache[k].complete && imageCache[k].naturalWidth > 0,
      ),
  });
  function layout(kind,repaint=true) {
    const w=innerWidth,h=innerHeight,q=picture.getContext('2d'),im=imageCache[kind];
    if(repaint){
    q.clearRect(0,0,1536,1024);
    // Keep canopy edges attached to the viewport while compressing only the
    // lower dashboard. Screens and physical hit areas use this same mapping.
    if(im.complete&&im.naturalWidth){q.drawImage(im,0,0,1536,620,0,0,1536,744);q.drawImage(im,0,620,1536,404,0,744,1536,280);}
    // Recess the glass within the original painted bezels. The unequal lit
    // upper lip and deep lower wall reinforce each panel's perspective.
    for(const aperture of apertures[kind]){
      const points=aperture.map(([x,y])=>[x,artworkY(y)]),path=()=>{q.beginPath();q.moveTo(...points[0]);for(const p of points.slice(1))q.lineTo(...p);q.closePath();};
      q.lineJoin='round';path();q.strokeStyle='#020607dd';q.lineWidth=12;q.stroke();path();q.strokeStyle='#263032';q.lineWidth=6;q.stroke();
      q.beginPath();q.moveTo(...points[3]);q.lineTo(...points[0]);q.lineTo(...points[1]);q.strokeStyle='#a7ada078';q.lineWidth=1.4;q.stroke();
      q.beginPath();q.moveTo(...points[1]);q.lineTo(...points[2]);q.lineTo(...points[3]);q.strokeStyle='#010406ee';q.lineWidth=3;q.stroke();
    }
    const light=deckLight.getContext('2d');light.clearRect(0,0,768,512);const gradient=light.createLinearGradient(0,0,660,512);gradient.addColorStop(0,'#ffdba480');gradient.addColorStop(.42,'#c6e3ee04');gradient.addColorStop(.78,'#07152220');gradient.addColorStop(1,'#00000090');light.fillStyle=gradient;light.fillRect(0,0,768,512);light.globalCompositeOperation='destination-in';light.drawImage(picture,0,0,768,512);light.globalCompositeOperation='source-over';
    api.maskRevision=(api.maskRevision||0)+1;
    }
    const {x,y,scale}=deckPose;
    api.mask={image:picture,kind,revision:api.maskRevision,ready:!!im.naturalWidth,x,y,width:w*scale,height:h*scale};
    node.querySelectorAll('.art-control-hotspot').forEach((button,i)=>{const [cx,cy,bw,bh]=hardware[kind][i],[left,top]=mapArtwork(cx-bw/2,cy-bh/2),[right,bottom]=mapArtwork(cx+bw/2,cy+bh/2);Object.assign(button.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});});
    for(const {element,display,k} of bezelControls){const q=apertures[kind][display],side=k<3?0:1,row=k%3,v=.15+row*.33;const [px,py]=mapArtwork(side?q[1][0]*(1-v)+q[2][0]*v+18:q[0][0]*(1-v)+q[3][0]*v-18,(q[0][1]+q[1][1])/2*(1-v)+(q[2][1]+q[3][1])/2*v);element.style.left=px+'px';element.style.top=py+'px';element.style.width=Math.max(10,13*w/1536)+'px';element.style.height=Math.max(10,14*h/1024*280/404*deckPose.scale)+'px';}

    picture.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w*scale}px;height:${h*scale}px;max-width:none;`;
    deckLight.style.cssText=picture.style.cssText+`pointer-events:none;opacity:${deckPose.light};`;
    screens.forEach(
      (s, i) =>
        (s.element.style.transform = transform(
          apertures[kind][i].map(([x,y])=>mapArtwork(x,y)),
          1,
          0,
          0,
        )),
    );
  }
  function mapArtwork(x,y){return [deckPose.x+x/1536*innerWidth*deckPose.scale,deckPose.y+artworkY(y)/1024*innerHeight*deckPose.scale];}
  function update() {
    const kind =
        F.craft.dimensions[0] > 180
          ? "meridian"
          : F.craft.dimensions[0] > 60
            ? "wayfarer"
            : "strider",
      ready = imageCache[kind].complete && imageCache[kind].naturalWidth > 0;
    api.active =
      ready &&
      !F.walking &&
      !F.bridgeWalk &&
      F.cameraMode === "cockpit" &&
      !F.vehicle.transition &&
      A.renderer.view === 0;
    node.hidden = !api.active;
    document.body.classList.toggle("illustrated-flight-deck", api.active);
    document.body.classList.toggle("interior-walk", !!F.bridgeWalk);
    api.weaponActive =
      (F.walking||F.bridgeWalk) &&
      B.armed &&
      ["rifle", "sidearm"].includes(B.key) &&
      imageCache[B.key].complete &&
      imageCache[B.key].naturalWidth > 0 &&
      A.renderer.view === 0;
    api.weaponActive = api.weaponActive && !window.BloxPause?.isOpen();
    gunImage.hidden = weaponView.hidden = !api.weaponActive;
    node.querySelectorAll(".art-control-hotspot").forEach(b=>b.setAttribute("aria-pressed",!!b.readState()));
    if (api.weaponActive) {
      if (gunImage.dataset.weapon !== B.key) {
        gunImage.dataset.weapon = B.key;
        gunImage.src = assets[B.key];
      }
      const v=weaponLayout(),{w,h,x,y,a,angle,dy,mx,my}=v;Object.assign(weaponView.style,{width:w+'px',height:h+'px',left:x+'px',top:y+'px',right:'auto',bottom:'auto',transformOrigin:'50% 50%',transform:`translateY(${dy}px) rotate(${angle}rad)`});
      gunImage.style.opacity=1-a;adsImage.style.opacity=a;api.weaponMuzzle=v.muzzle;
      const size=112*w/1536;Object.assign(flash.style,{left:(mx*w/1536-size/2)+'px',top:(my*h/1024-size/2)+'px',width:size+'px',height:size+'px'});
    }
    dot.hidden=!api.weaponActive||B.aimBlend<.52||B.key!=='rifle';dot.style.opacity=String(C.clamp((B.aimBlend-.52)/.48,0,1));
    document.body.classList.toggle('night-vision',!!B.visionActive);
    vision.hidden=!(F.walking||F.bridgeWalk)||window.BloxPause?.isOpen();
    vision.textContent=B.visionActive?'NV ACTIVE · N OFF':B.flashlight?'AUTO LIGHT · N NIGHT VISION':'N NIGHT VISION · RMB AIM';
    api.flashActive=api.weaponActive&&B.lastShot&&B.time-B.lastShot.time<.075;
    flash.hidden=!api.flashActive;
    if (current !== kind) {
      current = kind;
      node.dataset.deck = kind;
      lastLayout = "";
    }
    const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-motion.last)/1000));motion.last=now;
    const moving=api.active&&!reducedMotion.matches&&A.renderer.quality>0&&!A.isPaused(),stick=F.drive?.stick||[0,0,0],follow=1-Math.exp(-dt*8);
    motion.x+=(moving?C.clamp(-stick[0]*4-F.viewYaw*7,-7,7)-motion.x:-motion.x)*follow;
    motion.y+=(moving?C.clamp(stick[1]*3+(F.vehicle.thrust||0)*1.3,-4,4)-motion.y:-motion.y)*follow;
    if(reducedMotion.matches){motion.x=motion.y=0;}
    const previousX=deckPose.x,previousY=deckPose.y;deckPose.x=-innerWidth*.009+motion.x;deckPose.y=-innerHeight*.009+motion.y;
    const sun=A.celestial?.sun(F.position)||C.SUN;deckPose.light=.3+.55*Math.max(0,C.dot(sun,F.up));deckLight.style.opacity=deckPose.light;
    const key = kind + innerWidth + "x" + innerHeight + ready;
    if (key !== lastLayout) {
      layout(kind);
      lastLayout = key;
    }else if(Math.abs(previousX-deckPose.x)+Math.abs(previousY-deckPose.y)>.025)layout(kind,false);
    const near = F.nearest(),
      v = F.vehicle,
      telemetry = {
        craft: F.craft.id,
        speed: F.speed * 1000,
        altitude: near.altitude * 1000,
        mode: S.mode,
        power: { ...S.allocations },
        capacitor: B.capacitor,
        shield: B.shield,
        hull: F.ship.hull,
        ammo: B.key === "laser" ? B.capacitor : B.ammo[B.key].mag,
        weapon: B.key,
        contacts: B.contacts().length,
        time: B.time,
      };
    api.telemetry = telemetry;
    const speedLabel = document.getElementById("hudSpeed"),
      altLabel = document.getElementById("hudAltitude");
    if (speedLabel) speedLabel.textContent = Math.round(telemetry.speed);
    if (altLabel)
      altLabel.textContent =
        telemetry.altitude > 99999
          ? (telemetry.altitude / 1000).toFixed(0) + "k"
          : Math.max(0, Math.round(telemetry.altitude));
    const paintNow=performance.now(),revision=window.BloxMFD?.revision||0;
    if(api.paintRevision===revision&&paintNow-(api.lastPaint||0)<100)return;
    api.paintRevision=revision;api.lastPaint=paintNow;
    screens.forEach(({ canvas }, index) => {
      if(window.BloxMFD?.draw(index,canvas))return;
      const q = canvas.getContext("2d"),
        w = 640,
        h = 380;
      q.clearRect(0, 0, w, h);
      q.fillStyle = "#071115";
      q.fillRect(0, 0, w, h);
      const text = (
          value,
          x,
          y,
          size = 23,
          color = "#b4cfbf",
          align = "left",
        ) => {
          q.font = `${size}px 'Avenir Next',Arial,sans-serif`;
          q.fillStyle = color;
          q.textAlign = align;
          q.fillText(value, x, y);
        },
        line = (a, b, c, d, color = "#365555") => {
          q.strokeStyle = color;
          q.lineWidth = 1.5;
          q.beginPath();
          q.moveTo(a, b);
          q.lineTo(c, d);
          q.stroke();
        };
      text(
        [
          "FLIGHT / NAVIGATION",
          "TACTICAL / LOCAL SPACE",
          "WEAPONS / VESSEL SYSTEMS",
        ][index],
        23,
        34,
        23,
        "#d0d5c3",
      );
      text(["NAV", "TAC", "SYS"][index], 617, 34, 19, "#8fa99f", "right");
      line(20, 47, 620, 47);
      text(F.craft.name.toUpperCase(), 22, 363, 18, "#5d827e");
      text("↗", 616, 363, 22, "#a2baac", "right");
      if (index === 0) {
        text(
          Math.round(telemetry.speed).toString().padStart(3, "0"),
          25,
          146,
          81,
          "#e1e9dc",
        );
        text("M/S", 185, 142, 22);
        text("ALTITUDE", 370, 92, 20);
        text(
          telemetry.altitude > 99999
            ? (telemetry.altitude / 1000).toFixed(0) + " km"
            : Math.max(0, telemetry.altitude).toFixed(0) + " m",
          370,
          140,
          36,
          "#d2ddce",
        );
        text(
          S.mode + "  /  " + (F.assist ? "IFCS" : "INERTIAL"),
          27,
          189,
          23,
          "#d8bd89",
        );
        text(near.body.name.toUpperCase(), 27, 226, 24);
        text("FUEL", 27, 269, 20);
        text(Math.round(F.ship.fuel) + "%", 287, 269, 23, "#bbcbbc", "right");
        text(v.gear > 0.5 ? "GEAR DOWN" : "GEAR UP", 370, 224, 23, "#b7bd9b");
        text(
          F.drive.jump
            ? "DRIVE " + Math.round(v.charge * 100) + "%"
            : "DRIVE STANDBY",
          370,
          263,
          21,
        );
        q.fillStyle = "#29413f";
        q.fillRect(26, 284, 580, 8);
        q.fillStyle = "#97bbaa";
        q.fillRect(26, 284, (580 * F.ship.fuel) / 100, 8);
        text(
          F.route ? "ROUTE ACTIVE" : F.vehicle.state.toUpperCase(),
          27,
          326,
          22,
          "#c7b385",
        );
      } else if (index === 1) {
        const cx = 205,
          cy = 194,
          r = 124;
        q.strokeStyle = "#426761";
        for (const k of [0.33, 0.66, 1]) {
          q.beginPath();
          q.arc(cx, cy, r * k, 0, Math.PI * 2);
          q.stroke();
        }
        line(cx - r, cy, cx + r, cy);
        line(cx, cy - r, cx, cy + r);
        q.fillStyle = "#bfddd0";
        q.beginPath();
        q.moveTo(cx, cy - 11);
        q.lineTo(cx - 7, cy + 7);
        q.lineTo(cx + 7, cy + 7);
        q.closePath();
        q.fill();
        const a = B.time * 0.43;
        line(cx, cy, cx + Math.sin(a) * r, cy - Math.cos(a) * r, "#8ebca58a");
        let count = 0;
        for (const e of B.contacts()) {
          const d = C.sub(e.position, B.origin()),
            dist = C.length(d);
          if (dist > B.radarRange) continue;
          const x = cx + (C.dot(d, F.right) / B.radarRange) * r,
            y = cy - (C.dot(d, B.aim()) / B.radarRange) * r,
            hostile = e.kind === "ship" || e.kind === "sentry";
          q.fillStyle = hostile ? "#e18869" : "#a6d9c5";
          q.beginPath();
          q.arc(x, y, e.id === B.targetId ? 6 : 4, 0, 7);
          q.fill();
          if (count < 4) {
            text(
              (e.name || e.callsign || e.id).slice(0, 12),
              374,
              134 + count * 43,
              19,
              hostile ? "#d9987b" : "#acd3c1",
            );
            text(
              (dist * 1000).toFixed(0) + " m",
              614,
              134 + count * 43,
              19,
              "#a8c1b2",
              "right",
            );
            count++;
          }
        }
        text(
          String(B.contacts().length).padStart(2, "0") + " TRACKS",
          375,
          92,
          25,
        );
        if (!count) {
          text("SECTOR CLEAR", 375, 147, 22, "#709c91");
          text("SENSORS ONLINE", 375, 184, 18, "#709c91");
        }
        text(
          "RANGE " +
            (B.radarRange < 1
              ? B.radarRange * 1000 + " m"
              : B.radarRange + " km"),
          375,
          305,
          21,
          "#d3be91",
        );
      } else {
        const ammo = B.ammo[B.key];
        text(B.spec.short, 24, 89, 23, "#cebd9a");
        text(
          B.key === "laser"
            ? Math.round(B.capacitor) + "%"
            : String(ammo.mag).padStart(2, "0"),
          24,
          162,
          69,
          "#e1e8d7",
        );
        text(
          B.key === "laser" ? "CAPACITOR" : "/ " + ammo.reserve,
          177,
          160,
          25,
        );
        text(
          B.armed ? "ARMED" : "SAFE",
          500,
          94,
          25,
          B.armed ? "#d78d6b" : "#9bbcaf",
        );
        text("SHIELD", 365, 142, 20);
        text(Math.round(B.shield) + "%", 611, 142, 26, "#bfd5c6", "right");
        text("HULL", 365, 182, 20);
        text(B.fireStatus,25,323,18,"#cbb995");
        text(Math.round(F.ship.hull) + "%", 611, 182, 26, "#bfd5c6", "right");
        for (const [j, k] of ["engines", "weapons", "shields"].entries()) {
          const y = 225 + j * 35;
          text(k.toUpperCase(), 25, y, 19);
          for (let n = 0; n < 12; n++) {
            q.fillStyle = n < S.allocations[k] ? "#9ebba3" : "#253a39";
            q.fillRect(186 + n * 31, y - 15, 25, 12);
          }
          text(S.allocations[k], 615, y, 19, "#c4d2bf", "right");
        }
      }
      q.fillStyle = "#456d6133";
      q.fillRect(20, 341, 600, 1);
    });
  }
  function paintTo(ctx, width, height) {
    const sx = width / innerWidth,
      sy = height / innerHeight;
    ctx.save();
    ctx.scale(sx, sy);
    if (api.active && api.mask) {
      ctx.drawImage(picture,api.mask.x,api.mask.y,api.mask.width,api.mask.height);
      ctx.globalAlpha=deckPose.light;ctx.drawImage(deckLight,api.mask.x,api.mask.y,api.mask.width,api.mask.height);ctx.globalAlpha=1;
      for (let i = 0; i < 3; i++) {
        const cv = screens[i].canvas,
          quad = apertures[current][i].map(([a, b]) => mapArtwork(a,b));
        const point = (u, v) => [
          quad[0][0] * (1 - u) * (1 - v) +
            quad[1][0] * u * (1 - v) +
            quad[2][0] * u * v +
            quad[3][0] * (1 - u) * v,
          quad[0][1] * (1 - u) * (1 - v) +
            quad[1][1] * u * (1 - v) +
            quad[2][1] * u * v +
            quad[3][1] * (1 - u) * v,
        ];
        for (let row = 0; row < 8; row++)
          for (let col = 0; col < 12; col++) {
            const u = col / 12,
              v = row / 8,
              du = 1 / 12,
              dv = 1 / 8,
              a = point(u, v),
              b = point(u + du, v),
              c = point(u, v + dv);
            ctx.save();
            ctx.beginPath();
            const d = point(u + du, v + dv);
            ctx.moveTo(...a);
            ctx.lineTo(...b);
            ctx.lineTo(...d);
            ctx.lineTo(...c);
            ctx.closePath();
            ctx.clip();
            ctx.transform(
              (b[0] - a[0]) / (640 * du),
              (b[1] - a[1]) / (640 * du),
              (c[0] - a[0]) / (380 * dv),
              (c[1] - a[1]) / (380 * dv),
              a[0],
              a[1],
            );
            ctx.drawImage(cv, -u * 640, -v * 380);
            ctx.restore();
          }
      }
    }
    if (api.weaponActive) {
      ctx.save();
      const {w,h,x,y,a,angle,dy,mx,my}=weaponLayout();
      ctx.translate(x+w*.5,y+h*.5+dy);ctx.rotate(angle);ctx.translate(-(x+w*.5),-(y+h*.5));
      ctx.globalAlpha=1-a;ctx.drawImage(gunImage,x,y,w,h);ctx.globalAlpha=a;ctx.drawImage(adsImage,x,y,w,h);ctx.globalAlpha=1;
      if(api.flashActive){const size=112*w/1536;ctx.drawImage(flash,x+mx*w/1536-size/2,y+my*h/1024-size/2,size,size);}
      ctx.restore();
      if(!dot.hidden){ctx.fillStyle='#ff322b';ctx.shadowColor='#ff241b';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(innerWidth/2,innerHeight/2,1.7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    }

    ctx.restore();
  }
  setInterval(update, 100);
  addEventListener("resize", update);
  update();
})();
