/* Ship gunnery symbology follows the same projectile solution as combat. */
(function () {
  const api = window.LongwayTargeting = { mode: 'lead', last: null, draw };
  try { if(localStorage.getItem('space-patriot-pip')==='lag')api.mode='lag'; } catch {}
  const label=document.createElement('label');label.className='field';label.textContent='Ship targeting PIP';
  const select=document.createElement('select');select.id='targetingPip';
  select.add(new Option('Lead — aim at the moving marker','lead'));select.add(new Option('Lag — place the marker on the target','lag'));select.value=api.mode;
  select.onchange=()=>{api.mode=select.value;try{localStorage.setItem('space-patriot-pip',api.mode);}catch{}};
  label.append(select);document.getElementById('settings').append(label);
  function draw(g,A,w,h) {
    const C=LongwayCore,F=A.flight,B=A.combat,pose=F.renderPose();
    if((F.walking||F.bridgeWalk)&&!A.systems.seated?.startsWith('turret'))return false;
    const project=p=>{const d=C.sub(p,pose.position),z=C.dot(d,pose.forward),scale=h/(2*A.renderer.fov*Math.max(.00001,Math.abs(z)));return {x:w/2+C.dot(d,pose.right)*scale,y:h/2-C.dot(d,pose.up)*scale,behind:z<=0,z};};
    const aim=project(C.add(B.origin(),C.mul(B.aim(),Math.max(.1,B.target?C.length(C.sub(B.target.position,B.origin())):1)))),cyan='#b7e8e7',muted='#81b4b9',red='#ed8d7f',green='#b5edbc';
    const floor=window.BloxArtwork?.active?h*.61:h-60;
    g.save();g.lineWidth=1.2;g.lineCap='round';g.shadowColor='#02090d';g.shadowBlur=3;
    g.strokeStyle=B.armed?cyan:muted;g.beginPath();
    for(const sign of [-1,1]){g.moveTo(aim.x+sign*7,aim.y);g.lineTo(aim.x+sign*19,aim.y);g.moveTo(aim.x,aim.y+sign*7);g.lineTo(aim.x,aim.y+sign*13);}g.stroke();
    g.fillStyle=cyan;g.fillRect(aim.x-.8,aim.y-.8,1.6,1.6);
    if(F.speed>.005){const drift=project(C.add(pose.position,C.unit(F.velocity)));if(!drift.behind&&drift.x>25&&drift.x<w-25&&drift.y>50&&drift.y<floor){g.strokeStyle='#8fc8c183';g.beginPath();g.arc(drift.x,drift.y,5,0,Math.PI*2);g.moveTo(drift.x-13,drift.y);g.lineTo(drift.x-6,drift.y);g.moveTo(drift.x+6,drift.y);g.lineTo(drift.x+13,drift.y);g.moveTo(drift.x,drift.y-11);g.lineTo(drift.x,drift.y-6);g.stroke();}}
    api.last=null;
    for(const e of B.contacts()) {
      const p=project(e.position),selected=e.id===B.targetId,hostile=B.isHostile(e),color=hostile?red:cyan;
      if(p.behind||p.x<35||p.x>w-35||p.y<70||p.y>floor){
        if(!selected)continue;
        let dx=p.x-w/2,dy=p.y-h/2;if(Math.hypot(dx,dy)<1){dx=0;dy=p.behind?1:-1;}
        const tx=(w/2-40)/Math.max(1,Math.abs(dx)),ty=(dy>0?floor-h/2-12:h/2-75)/Math.max(1,Math.abs(dy)),k=Math.min(tx,ty);
        const x=w/2+dx*k,y=h/2+dy*k,angle=Math.atan2(dy,dx);
        g.save();g.translate(x,y);g.rotate(angle);g.strokeStyle=color;g.beginPath();g.moveTo(-8,-6);g.lineTo(2,0);g.lineTo(-8,6);g.stroke();g.restore();
        g.font='10px monospace';g.fillStyle=color;g.textAlign='center';g.fillText(p.behind?'TARGET BEHIND':'TARGET',x,y-13);continue;
      }
      const projectedRadius=(e.radius||.012)*h/(2*A.renderer.fov*Math.max(.001,p.z)),r=selected?C.clamp(projectedRadius+12,23,80):9;
      g.strokeStyle=selected?color:(hostile?'#ed8d7f70':'#99ccc470');g.lineWidth=selected?1.3:1;
      for(const sx of [-1,1])for(const sy of [-1,1]){g.beginPath();g.moveTo(p.x+sx*(r-8),p.y+sy*r);g.lineTo(p.x+sx*r,p.y+sy*r);g.lineTo(p.x+sx*r,p.y+sy*(r-8));g.stroke();}
      if(!selected)continue;
      const solution=B.firingSolution(e),range=solution.distance*1000;
      g.font='11px monospace';g.textAlign='center';g.fillStyle=color;g.fillText((e.name||'CONTACT').toUpperCase(),p.x,p.y-r-12);
      g.fillStyle=cyan;g.font='10px monospace';g.fillText((range>=1000?(range/1000).toFixed(2)+' KM':Math.round(range)+' M')+'  '+(solution.closing>=0?'+':'')+Math.round(solution.closing)+' M/S',p.x,p.y+r+18);
      g.fillStyle='#b7e8e72b';g.fillRect(p.x-r,p.y+r+25,r*2,2);g.fillStyle=color;g.fillRect(p.x-r,p.y+r+25,r*2*C.clamp(e.hull/100,0,1),2);
      if(B.key==='missile'){
        const radius=r+16-B.lock*7;g.strokeStyle=B.lock>=1?green:color;g.setLineDash(B.lock>=1?[]:[5,5]);
        g.beginPath();g.arc(p.x,p.y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.02,B.lock));g.stroke();g.setLineDash([]);
        g.fillStyle=B.lock>=1?green:cyan;g.fillText(!solution.reachable?'OUT OF RANGE':B.lock>=1?'IR LOCK':'IR ACQUIRING '+Math.round(B.lock*100)+'%',p.x,p.y+r+41);
      }else{
        let point=solution.point;
        if(api.mode==='lag'&&B.spec.speed&&Number.isFinite(solution.time))point=C.add(B.origin(),C.mul(C.sub(C.add(C.mul(B.aim(),B.spec.speed),B.projectileVelocity()),e.velocity||[0,0,0]),solution.time));
        const pip=project(point),aligned=solution.reachable&&!pip.behind&&Math.hypot(pip.x-(api.mode==='lag'?p.x:aim.x),pip.y-(api.mode==='lag'?p.y:aim.y))<Math.max(6,projectedRadius);
        api.last={targetId:e.id,mode:api.mode,reachable:solution.reachable,aligned,pip,solution};
        if(!pip.behind&&pip.x>15&&pip.x<w-15&&pip.y>25&&pip.y<floor){
          g.strokeStyle=solution.reachable?(aligned?green:cyan):red;g.lineWidth=1.3;
          g.save();g.globalAlpha=.4;g.setLineDash([2,5]);g.beginPath();g.moveTo(p.x,p.y);g.lineTo(pip.x,pip.y);g.stroke();g.restore();
          g.beginPath();g.arc(pip.x,pip.y,6,0,Math.PI*2);
          for(const sign of [-1,1]){g.moveTo(pip.x+sign*9,pip.y);g.lineTo(pip.x+sign*12,pip.y);}g.stroke();
          if(!solution.reachable){g.beginPath();g.moveTo(pip.x-8,pip.y+8);g.lineTo(pip.x+8,pip.y-8);g.stroke();g.fillStyle=red;g.fillText('NO FIRING SOLUTION',p.x,p.y+r+41);}
        }
      }
    }
    g.restore();return true;
  }
})();
