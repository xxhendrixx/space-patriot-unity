(function(){
  function init(){
    if(!window.longway){addEventListener('longway-ready',init,{once:true});return;}
    const A=longway;A.fieldStory=new LongwayCore.FieldStory(A.world,A.flight);
    const explore=document.createElement('button');explore.id='introWilderness';explore.className='large';explore.textContent='Explore the river valley ↗';
    document.querySelector('.intro-actions').append(explore);
    explore.onclick=()=>{
      const F=A.flight,C=LongwayCore,b=A.world.system([0,0,0]).find(b=>b.type===1)||A.world.catalog.find(b=>b.type===1);
      F.place(b,'surface');F.selectCraft(C.CRAFTS[0].id);F.toSurvey(b);
      // The quick-start uses the same arrival, landing and egress simulation as
      // normal travel, completing it before handing controls to the player.
      for(let i=0;i<1600&&(F.route||F.vehicle.transition);i++)F.update(.1,{});
      F.toggleWalk();for(let i=0;i<45&&F.vehicle.transition;i++)F.update(.1,{});
      F.forward=C.bodyWorld(b,C.Landscape.forward);F.up=A.world.surveySite(b).up.slice();F.viewYaw=F.viewPitch=0;F.orthogonalize();
      A.fieldStory.update(.1);A.select(b);A.start();A.focusScene();A.render();
    };
    const card=document.createElement('aside');card.id='fieldContract';card.setAttribute('aria-label','Planet field survey');
    card.innerHTML='<small>FIELD EXPEDITION</small><strong></strong><span></span><p></p>';
    document.body.append(card);
    const style=document.createElement('style');style.textContent=`
      #fieldContract{position:fixed;right:28px;top:112px;z-index:8;width:234px;padding:17px 20px;background:linear-gradient(90deg,#071317ec,#0c1c20bc);border:9px solid transparent;border-image:var(--hud-frame) 85 fill stretch;color:#d9e4dc;font-family:inherit;pointer-events:none;box-shadow:0 8px 30px #0003}
      #fieldContract small{font-size:9px;letter-spacing:2px;color:#97b7ad}#fieldContract strong{display:block;font-size:14px;letter-spacing:.3px;margin:8px 0}#fieldContract span{font-size:11px;color:#b9cfc5}#fieldContract p{font-size:10px;line-height:1.6;margin:9px 0 0;color:#9eafa7}#fieldContract[hidden]{display:none}
      body.mesh-cockpit #fieldContract{display:none}@media(max-width:900px){#fieldContract{right:14px;top:100px;width:175px;padding:10px;font-size:10px}}`;
    document.head.append(style);
    window.PlanetEngineUI={update(){const s=A.fieldStory.status;if(!s)return;const F=A.flight;
      if(!card.closest('#pauseDeck'))card.hidden=!A.started||!F.walking||F.bridgeWalk||!document.querySelector('#intro')?.hidden;
      card.querySelector('small').textContent=s.complete?'FIELD REPORT ARCHIVED':'FIELD EXPEDITION';
      card.querySelector('strong').textContent=s.body+' / '+s.profile;
      card.querySelector('span').textContent=s.title;
      card.querySelector('p').textContent=s.phase==='arrival'?`Survey site · ${s.distance>1000?(s.distance/1000).toFixed(1)+' km':Math.round(s.distance)+' m'}. Choose Wilds in the atlas to approach.`:s.complete?'Sell your survey data and samples at an orbital station.':s.description;
    }};
  }init();
})();
