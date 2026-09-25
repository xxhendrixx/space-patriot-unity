/* Generated terminal plate beneath real, existing controls. No duplicated state. */
(function initPauseDeck() {
  if (!window.longway) return addEventListener('longway-ready', initPauseDeck, {once:true});
  const A=longway, groups=[
    ['Navigation',['navigation','galaxy','sectorNavigation','settlementDirectory']],
    ['Ship',['engineeringDialog','fleet','stationServices','shipboardPanel']],
    ['Operations',['combatPanel','radarPanel','weaponsPanel','factionMap','ecology','scenarioPanel','economyPanel','fieldContract','campaignPanel']],
    ['Crew',['crewPanel']], ['Equipment',['fieldInventory','cityTerminal']],
    ['Settings',['settings','help']], ['Archive',['artPanel']]
  ], titles={campaignPanel:'The Long Debt',settlementDirectory:'Cities & outposts',navigation:'Destinations',galaxy:'Star chart',sectorNavigation:'Research systems',engineeringDialog:'Engineering',fleet:'Fleet',stationServices:'Services',shipboardPanel:'Stations & home',combatPanel:'Combat',radarPanel:'Radar',weaponsPanel:'Weapons',factionMap:'Factions',ecology:'Biosphere',scenarioPanel:'Encounters',economyPanel:'Markets & contracts',fieldContract:'Field survey',cityTerminal:'City computer',crewPanel:'Crew link',fieldInventory:'Field kit',settings:'Display & controls',help:'Flight manual',artPanel:'Concept archive'};
  const root=document.createElement('section'); root.id='pauseDeck';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Space Patriot pause terminal');
  root.innerHTML='<div class="pause-terminal"><header><div><small>SPACE PATRIOT / FLIGHT TERMINAL</small><h1>Command deck</h1></div><span id="pauseClock"></span><button id="deckResume">RESUME <kbd>ESC</kbd></button></header><nav class="pause-tabs" aria-label="Terminal tabs"></nav><div class="pause-subtabs"></div><div class="pause-content"></div><aside class="pause-caption">YOUR SHIP. YOUR FRONTIER.<small>Essential controls remain on the flight deck.</small></aside></div>';
  document.body.append(root);
  for(const id of ['radarPanel','weaponsPanel','fieldContract'])BloxUI.registerDialog(id);
  const status=document.createElement('button');status.id='fieldStatus';status.onclick=()=>present('combatPanel',true);document.body.append(status);
  setInterval(()=>{const B=A.combat,F=A.flight;status.hidden=!A.started||(!F.walking&&!A.systems.seated?.startsWith('turret'))||!root.hidden;status.textContent=B.spec.short+' / '+(B.key==='laser'?Math.floor(B.capacitor)+'%':B.ammo[B.key].mag+' | '+B.ammo[B.key].reserve)+' · '+(B.armed?'ARMED':'SAFE');},100);

  let active='navigation', group=0, priorFocus=null;
  const api=window.BloxPause={routing:false, isOpen:()=>!root.hidden, handles:id=>groups.some(g=>g[1].includes(id)), present,dismiss,toggle:()=>root.hidden?present(active,true):dismiss(), register(id,index=1){if(!groups[index][1].includes(id))groups[index][1].push(id);mount();}};
  function mount(){for(const [,ids] of groups)for(const id of ids){const node=document.getElementById(id);if(node&&node.parentElement!==root.querySelector('.pause-content')){node.hidden=true;root.querySelector('.pause-content').append(node);}}}
  function tabs(){root.querySelector('.pause-tabs').replaceChildren(...groups.map(([label],i)=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-selected',i===group);b.onclick=()=>present(groups[i][1].find(id=>document.getElementById(id)),true);return b;}));root.querySelector('.pause-subtabs').replaceChildren(...groups[group][1].filter(id=>document.getElementById(id)).map(id=>{const b=document.createElement('button');b.textContent=titles[id]||id;b.classList.toggle('selected',id===active);b.onclick=()=>present(id,true);return b;}));}
  function present(id='navigation',visible=true){if(!id)return;if(visible===false){dismiss();return;}if(root.hidden)priorFocus=document.activeElement;mount();api.routing=true;A.closePanels();window.BloxUI?.close();active=id;group=groups.findIndex(g=>g[1].includes(id));if(group<0)group=0;root.hidden=false;document.body.classList.add('pause-deck-open');A.setPaused(true);const native=['navigation','galaxy','sectorNavigation','fleet','stationServices','ecology','settings','help'];if(native.includes(id))A.showPanel(id,true,true);else if(['shipboardPanel','scenarioPanel','economyPanel','fieldContract','campaignPanel','cityTerminal'].includes(id))document.getElementById(id).hidden=false;else window.BloxUI?.open(id,true);for(const node of root.querySelector('.pause-content').children)node.hidden=node.id!==id;api.routing=false;tabs();clock();root.querySelector('.pause-tabs button[aria-selected="true"]').focus();A.renderer.needsRender=true;}
  function dismiss(){if(root.hidden||api.routing)return;api.routing=true;root.hidden=true;document.body.classList.remove('pause-deck-open');A.closePanels();window.BloxUI?.close();for(const n of root.querySelector('.pause-content').children)n.hidden=true;A.setPaused(false);api.routing=false;A.combat.trigger=false;document.getElementById('scene').focus({preventScroll:true});A.renderer.needsRender=true;}
  function clock(){const c=A.celestial;document.getElementById('pauseClock').textContent=(A.network?.links.size?'CREW SESSION LIVE':'SIMULATION PAUSED')+(c?' · ORBIT CLOCK '+c.timeScale+'×':'');}
  document.getElementById('deckResume').onclick=dismiss;
  document.getElementById('pauseToggle').onclick=api.toggle;
  const hotkey=document.createElement('button');hotkey.id='terminalToggle';hotkey.innerHTML='TERMINAL <kbd>TAB</kbd>';hotkey.onclick=()=>{A.start();api.toggle();};document.body.append(hotkey);
  addEventListener('keydown',e=>{if(e.code!=='Escape'&&e.code!=='Tab')return;if(e.code==='Tab'&&!root.hidden)return;if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&e.code!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(root.hidden){if(A.started)present(active,true);}else dismiss();},true);
  root.addEventListener('click',e=>{if(e.target.closest('[data-close-citizen],[data-close],.close'))dismiss();});
  setInterval(()=>{if(!root.hidden)clock();},500);mount();
})();
