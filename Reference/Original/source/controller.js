(function(root){
  'use strict';
  const defaults={enabled:true,device:'auto',deadzone:.16,sensitivity:1.2,invertY:false,axes:{moveX:0,moveY:1,lookX:2,lookY:3},buttons:{boost:0,interact:1,reload:2,target:3,descend:4,ascend:5,brake:6,fire:7,camera:8,menu:9,assist:10,arm:11,weapon:12,gear:13,rollLeft:14,rollRight:15,menuUp:12,menuDown:13,menuLeft:14,menuRight:15,menuConfirm:0,menuBack:1}};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function settings(value={}){
    const result=JSON.parse(JSON.stringify(defaults));
    for(const key of ['enabled','invertY'])if(typeof value[key]==='boolean')result[key]=value[key];
    if(value.device==='auto'||/^\d+$/.test(value.device))result.device=String(value.device);
    for(const [key,min,max]of [['deadzone',.02,.45],['sensitivity',.2,3]])if(Number.isFinite(value[key]))result[key]=clamp(value[key],min,max);
    for(const key of Object.keys(result.axes))if(Number.isInteger(value.axes?.[key]))result.axes[key]=clamp(value.axes[key],-1,15);
    for(const key of Object.keys(result.buttons))if(Number.isInteger(value.buttons?.[key]))result.buttons[key]=clamp(value.buttons[key],-1,31);
    return result;
  }
  function stick(x,y,deadzone){const length=Math.hypot(x,y);if(!Number.isFinite(length)||length<=deadzone)return [0,0];const scale=clamp((length-deadzone)/(1-deadzone),0,1)/length;return [x*scale,y*scale];}
  class Controller {
    constructor(config){this.settings=settings(config);this.previous=[];this.deviceKey=null;this.waitNeutral=true;this.state={};}
    clear(){this.waitNeutral=true;this.state={};}
    read(pads,blocked=false){
      const s=this.settings,pad=s.enabled?Array.from(pads||[]).find(p=>p?.connected&&(s.device==='auto'||String(p.index)===s.device)):null;
      if(!pad){this.deviceKey=null;this.previous=[];this.clear();return {state:{},edges:{},pad:null};}
      const key=pad.index+':'+pad.id,pressed=pad.buttons.map(b=>!!b.pressed||b.value>.55);
      if(key!==this.deviceKey){this.deviceKey=key;this.previous=pressed.slice();this.clear();}
      const edges={},held={};for(const [name,index]of Object.entries(s.buttons)){held[name]=index>=0&&!!pressed[index];edges[name]=held[name]&&!this.previous[index];}
      const axis=name=>{const value=pad.axes[s.axes[name]];return Number.isFinite(value)?clamp(value,-1,1):0;};
      const [mx,my]=stick(axis('moveX'),axis('moveY'),s.deadzone),[lx,ly]=stick(axis('lookX'),axis('lookY'),s.deadzone);
      this.previous=pressed;
      if(blocked)this.waitNeutral=true;
      else if(!pressed.some(Boolean)&&!mx&&!my&&!lx&&!ly)this.waitNeutral=false;
      this.state=blocked||this.waitNeutral?{}:{forward:-my,strafe:mx,lift:Number(held.ascend)-Number(held.descend),lookX:lx*s.sensitivity,lookY:ly*s.sensitivity*(s.invertY?1:-1),roll:Number(held.rollRight)-Number(held.rollLeft),boost:held.boost,brake:held.brake,fire:held.fire};
      return {state:this.state,edges,pad,held};
    }
  }
  root.LongwayController={Controller,settings,stick,defaults};
  if(typeof document==='undefined')return;
  let saved;try{saved=JSON.parse(localStorage.getItem('space-patriot-controller')||'null');}catch{}
  const controller=new Controller(saved||{});
  function init(){
    if(!root.longway)return addEventListener('longway-ready',init,{once:true});
    const A=longway,F=A.flight,B=A.combat;
    const section=document.createElement('section');section.id='controllerSettings';section.className='controller-settings';
    section.innerHTML='<h3>Controller setup</h3><p class="panel-note">Connect a controller, then press a button. Xbox and standard gamepads use the layout below. Center the sticks and release buttons after opening a menu or reconnecting.</p><p id="controllerStatus" role="status"></p><div id="controllerFields"></div><p class="panel-note">Left stick: move / strafe. Right stick: look. LB/RB: down/up. LT: brake / aim. RT: fire. A: boost / sprint. B: interact / land. X: reload. Y: next target. View: camera. Menu: terminal. In menus, use the D-pad to focus or adjust controls, A to activate and B to resume.</p><button id="resetController" type="button">Restore Xbox layout</button>';
    document.getElementById('settings').append(section);
    const fields=section.querySelector('#controllerFields'),status=section.querySelector('#controllerStatus'),inputs={};let fieldRoot=fields;
    const persist=()=>{controller.clear();B.controllerTrigger=false;try{localStorage.setItem('space-patriot-controller',JSON.stringify(controller.settings));}catch{}};
    function field(text,key,type,options){const row=document.createElement('label');row.className='field';row.textContent=text;const input=document.createElement(type==='select'?'select':'input');input.id='controller-'+key;if(type!=='select')input.type=type;if(options)for(const [value,label]of options)input.add(new Option(label,value));row.append(input);fieldRoot.append(row);inputs[key]=input;return input;}
    const enabled=field('Enable controller','enabled','checkbox');enabled.checked=controller.settings.enabled;enabled.onchange=()=>{controller.settings.enabled=enabled.checked;persist();};
    const device=field('Controller device','device','select',[['auto','Auto — first connected controller']]);device.onchange=()=>{controller.settings.device=device.value;persist();};
    for(const [key,label,min,max,step]of [['deadzone','Stick dead zone',.02,.45,.01],['sensitivity','Look sensitivity',.2,3,.1]]){
      const input=field(label,key,'range');Object.assign(input,{min,max,step,value:controller.settings[key]});const value=document.createElement('output');input.after(value);value.textContent=input.value;input.oninput=()=>{controller.settings[key]=+input.value;value.textContent=input.value;persist();};
    }
    const invert=field('Invert vertical look','invertY','checkbox');invert.checked=controller.settings.invertY;invert.onchange=()=>{controller.settings.invertY=invert.checked;persist();};
    const mappings=document.createElement('details');mappings.id='controllerMappings';mappings.innerHTML='<summary>Customize axes and buttons</summary>';fields.append(mappings);fieldRoot=mappings;
    for(const [key,label]of Object.entries({moveX:'Strafe axis',moveY:'Forward axis',lookX:'Horizontal look axis',lookY:'Vertical look axis'})){
      const input=field(label,key,'select',[[-1,'Unassigned'],...Array.from({length:16},(_,i)=>[i,'Axis '+i])]);input.value=controller.settings.axes[key];input.onchange=()=>{controller.settings.axes[key]=+input.value;persist();};
    }
    const names=['A / Cross','B / Circle','X / Square','Y / Triangle','LB / L1','RB / R1','LT / L2','RT / R2','View / Share','Menu / Options','Left stick','Right stick','D-pad up','D-pad down','D-pad left','D-pad right'];
    for(const key of Object.keys(defaults.buttons)){
      const input=field(key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())+' button',key,'select',[[-1,'Unassigned'],...Array.from({length:32},(_,i)=>[i,`${i}: ${names[i]||'Button '+i}`])]);input.value=controller.settings.buttons[key];input.onchange=()=>{controller.settings.buttons[key]=+input.value;persist();};
    }
    section.querySelector('#resetController').onclick=()=>{controller.settings=settings();for(const [key,input]of Object.entries(inputs)){const value=controller.settings.axes[key]??controller.settings.buttons[key]??controller.settings[key];if(input.type==='checkbox')input.checked=value;else input.value=value;input.nextElementSibling?.tagName==='OUTPUT'&&(input.nextElementSibling.textContent=input.value);}persist();};
    let lastStatus=0,lastDevices='',lastIdentity='';
    function menuInput(pad,edges){
      const controls=[...document.querySelectorAll('#pauseDeck button,#pauseDeck input,#pauseDeck select,#pauseDeck summary')].filter(e=>!e.disabled&&e.getClientRects().length);
      if(edges.menuUp||edges.menuDown){const index=controls.indexOf(document.activeElement),delta=edges.menuDown?1:-1;controls[(index+delta+controls.length)%controls.length]?.focus();}
      const focused=document.activeElement;
      if(edges.menuLeft||edges.menuRight){const delta=edges.menuRight?1:-1;if(focused?.tagName==='SELECT'){focused.selectedIndex=clamp(focused.selectedIndex+delta,0,focused.options.length-1);focused.dispatchEvent(new Event('change'));}else if(focused?.type==='range'){delta>0?focused.stepUp():focused.stepDown();focused.dispatchEvent(new Event('input'));}}
      if(edges.menuConfirm)focused?.click();if(edges.menuBack)window.BloxPause?.dismiss();
    }
    root.LongwayInput={controller,get state(){return controller.state;},clear(){controller.clear();B.controllerTrigger=false;},poll(now){
      let pads=[];try{pads=navigator.getGamepads?.()||[];}catch{}
      const blocked=!A.started||A.isPaused()||document.hidden||!document.hasFocus();
      const {state,edges,pad}=controller.read(pads,blocked);
      B.controllerTrigger=!!state.fire;
      if(pad&&document.hasFocus()&&!document.hidden){
        if(edges.menu){if(!A.started)A.start();else window.BloxPause?.toggle();controller.clear();B.controllerTrigger=false;}
        else if(A.isPaused())menuInput(pad,edges);
        else if(!controller.waitNeutral){
          if(edges.target)B.cycleTarget();if(edges.arm)B.setArmed(!B.armed);if(edges.reload)B.reload();if(edges.camera)F.toggleCamera();if(edges.assist)F.toggleAssist();if(edges.gear)F.toggleGear();
          if(edges.weapon){const weapons=F.walking||F.bridgeWalk?['rifle','sidearm']:['kinetic','laser','missile'];B.selectWeapon(weapons[(weapons.indexOf(B.key)+1)%weapons.length]);}
          if(edges.interact){if(F.bridgeWalk)A.systems.interactInterior();else if(F.walking)F.toggleWalk();else if(['landed','docked'].includes(F.vehicle.state))F.takeoff();else F.toggleLanding();}
          if(F.walking||F.bridgeWalk){if(state.brake){B.setAim(true);this.ownedAim=true;}else if(this.ownedAim){B.setAim(false);this.ownedAim=false;}}
        }
      }
      if((blocked||!pad||!(F.walking||F.bridgeWalk))&&this.ownedAim){B.setAim(false);this.ownedAim=false;}
      if(now-lastStatus>160){lastStatus=now;const connected=Array.from(pads).filter(p=>p?.connected),identity=connected.map(p=>p.index+':'+p.id).join('|');
        if(identity!==lastDevices){device.replaceChildren(new Option('Auto — first connected controller','auto'),...connected.map(p=>new Option(p.id,String(p.index))));device.value=controller.settings.device;lastDevices=identity;}
        const active=pad?.buttons.map((b,i)=>b.pressed?i:null).filter(i=>i!==null)||[];
        status.textContent=pad?`${pad.id} · ${pad.mapping==='standard'?'Standard layout':'Custom layout — configure axes and buttons'} · Axes ${pad.axes.map(n=>n.toFixed(2)).join(' / ')} · Buttons ${active.join(', ')||'released'}`:navigator.getGamepads?'No controller detected. Press a button on your connected controller.':'Controller access is unavailable in this browser. Open the game on localhost or HTTPS.';
        if(pad&&lastIdentity!==pad.id){A.toast('Controller connected · setup is in Settings');lastIdentity=pad.id;}if(!pad)lastIdentity='';
      }
    }};
    addEventListener('longway-input-clear',()=>LongwayInput.clear());
    addEventListener('gamepaddisconnected',()=>LongwayInput.clear());
  }
  init();
})(globalThis);
