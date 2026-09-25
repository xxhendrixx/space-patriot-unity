/* Storyworks drives field-survey objectives from real flight/gameplay events. */
(function(root){
  const C=root.LongwayCore, S=root.StoryworksCore;
  const descriptions=[
    'Map the crater highlands and recover a mineral sample.',
    'Trace the watershed and recover a sample from the living valley.',
    'Survey the terraced dunes and recover a sediment sample.',
    'Survey the storm atmosphere from the orbital habitat.',
    'Record the glacial ridges and recover a crystalline sample.',
    'Survey the volcanic massif and recover a basalt sample.'
  ];
  function project(b) {
    const node=(id,type,title,extra={})=>({id,questId:'survey',type,title,...extra});
    return {format:'storyworks-project',version:1,id:'field-'+String(b.id).replace(/[^a-zA-Z0-9_.:-]/g,'-'),title:b.name+' Field Survey',variables:{scanned:false},
      quests:[{id:'survey',title:descriptions[b.type],entry:'arrival',autoStart:true}],
      nodes:[
        node('arrival','objective','Reach the survey site on foot',{event:'world.region.enter',match:{regionId:'survey-site'},next:'briefing'}),
        node('briefing','journal',b.name+' expedition',{text:descriptions[b.type],next:'scan'}),
        node('scan','objective','Scan the environment · B',{condition:{source:'variable',key:'scanned',op:'eq',value:true},next:'beacon'}),
        node('beacon','action','Survey uplink established',{actions:[{type:'command',command:'spell.cast',payload:{preset:b.type===4?'frost':'arcane'}}],next:b.type===3?'complete':'sample'}),
        node('sample','objective','Collect a field sample · Shift+B',{event:'inventory.changed',match:{source:'surface-sampler'},next:'complete'}),
        node('complete','end','Field survey complete',{result:'completed',actions:[{type:'journal',text:'Field report archived. Survey data and cargo can be sold at an orbital station.'}]})
      ]};
  }
  class FieldStory {
    constructor(world,flight){
      this.world=world;this.flight=flight;this.records=new Map();this.pulses=[];this.sequence=0;this.current=null;
      const collect=flight.collect.bind(flight);
      flight.collect=(...args)=>{const ok=collect(...args);if(ok&&this.nearSite())this.current.bridge.emit('inventory.changed',{source:'surface-sampler',itemId:'field-sample',count:flight.cargoCount()},'sample-'+(++this.sequence));return ok;};
    }
    activate(b){
      const key=String(b.id);
      if(!this.records.has(key)){
        const engine=new S.StoryEngine(project(b),{sessionId:'field-'+b.seed});
        const record={body:b,engine,site:this.world.surveySite(b)};
        record.bridge=new S.WorldworksStoryBridge({engine,handlers:{'spell.cast':payload=>{this.pulses.push({position:record.site.center.slice(),preset:payload.preset});if(this.pulses.length>8)this.pulses.shift();return true;}}});
        engine.start();this.records.set(key,record);
      }
      this.current=this.records.get(key);return this.current;
    }
    nearSite(){
      const r=this.current,F=this.flight;
      return !!r&&F.walking&&!F.bridgeWalk&&C.length(C.sub(F.position,r.site.center))<.3;
    }
    update(dt){
      const F=this.flight,b=F.nearest().body,r=this.activate(b);
      r.engine.update(C.clamp(dt,0,1));
      if(this.nearSite())r.bridge.enterRegion('survey-site',{eventId:'arrived'});
      if(F.ship.scanned.has(b.id)&&!r.engine.state.variables.scanned)r.engine.setVariable('scanned',true);
    }
    get status(){
      if(!this.current)return null;
      const r=this.current,node=r.engine.current('survey');
      return {body:r.body.name,profile:C.PlanetEngines.profile(r.body).name,title:node?.title,description:descriptions[r.body.type],
        phase:node?.id,complete:r.engine.state.quests.survey.status==='completed',distance:C.length(C.sub(this.flight.position,r.site.center))*1000,
        journal:r.engine.state.journal.map(j=>j.text)};
    }
  }
  C.FieldStory=FieldStory;C.FieldStoryProject=project;
})(globalThis);
