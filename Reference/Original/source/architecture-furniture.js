// Host furniture recipes replace the demo's domestic furnishings. The original
// ArchitectureWorks batched geometry, room topology and opening kernel are used.
function furniture(g,f,base){
 const type=f.type;
 g.at(f.x,base,f.z,f.rot*Math.PI/180,()=>{
  const b=(mat,x,y,z,w,h,d)=>g.box(x,y,z,w,h,d,mat);
  const r=(mat,x,y,z,w,h,d,rad=.04)=>g.roundbox(x,y,z,w,h,d,rad,mat);
  const screen=(x,y,z,w=.65,h=.4)=>{r('black',x,y,z,w+.12,h+.1,.08);b('screen',x,y,z+.045,w,h,.018);};
  const seat=(x=0,z=0)=>{b('steel',x,.18,z,.18,.36,.18);r('linen',x,.49,z,.67,.18,.62);r('linen',x,.87,z-.27,.67,.64,.15);for(const side of [-1,1])b('steel',x+side*.35,.72,z,.055,.06,.48);};
  if(['sofa','armchair'].includes(type)){
   if(type==='armchair')seat();else{b('steel',0,.18,0,2.45,.25,.82);r('linen',0,.5,0,2.55,.25,.91);r('linen',0,.78,-.42,2.65,.68,.17);for(const x of [-.9,0,.9])r('cushion',x,.62,0,.79,.1,.78);}
  }else if(['desk','counter','island','dining','coffee','nightstand'].includes(type)){
   const c=A.catalog[type],h=type==='coffee'?.45:type==='nightstand'?.55:.92;
   r('white',0,h,0,c.w,.09,c.d*.75);for(const x of [-1,1])b('steel',x*c.w*.38,h*.48,0,.1,h*.96,c.d*.61);
   if(type==='desk'){screen(-.36,1.25,-.28);screen(.37,1.21,-.32,.53,.35);r('black',0,.99,.17,.92,.03,.28);seat(0,.7);}
   if(type==='counter'||type==='island'){r('trim',0,.45,0,c.w*.93,.82,c.d*.66);for(const x of [-.65,.0,.65])r('sage',x,.47,c.d*.34,.55,.65,.03);}
  }else if(type==='bed'||type==='tub'){
   const c=A.catalog[type];b('steel',0,.25,0,c.w*.8,.4,c.d*.8);r('white',0,.53,0,c.w,.22,c.d);r('linen',0,.72,-c.d*.32,c.w*.9,.18,.46);for(const x of [-1,1])b('trim',x*c.w*.49,.67,0,.065,.25,c.d);
   if(type==='tub'){screen(.65,1.05,-.3,.45,.3);b('steel',.65,.55,-.3,.06,.9,.06);}
  }else if(['wardrobe','shelf','fridge','chest','stove','vanity'].includes(type)){
   const c=A.catalog[type];r('trim',0,c.h*.5,0,c.w,c.h,c.d);for(let y=.25;y<c.h;y+=.48){r('sage',0,y,c.d*.51,c.w*.88,.38,.035);b('steel',c.w*.26,y,c.d*.55,.15,.025,.027);}
   if(type==='shelf'){for(let y=.38;y<c.h;y+=.5){b('black',0,y,c.d*.54,c.w*.8,.32,.018);for(let x=-c.w*.28;x<c.w*.31;x+=.16)b('screen',x,y-.1,c.d*.558,.035,.05,.012);}}
   if(type==='fridge'||type==='stove')screen(0,c.h*.71,c.d*.55,c.w*.66,.34);
  }else if(type==='plant'){g.cylinder(0,.35,0,.27,.24,.7,'steel');for(let i=0;i<7;i++){const a=i*2.4;g.sphere(Math.cos(a)*.2,1+i*.055,Math.sin(a)*.2,.09,.28,.06,'leaf',8,6);}}
  else if(type==='lamp'){b('steel',0,.8,0,.055,1.6,.055);b('light',0,1.57,0,.4,.07,.2);}
  else if(type==='toilet'){r('ceramic',0,.35,0,.44,.6,.6);r('white',0,.65,-.2,.46,.3,.18);}
  // Rugs become flush service grates, not raised domestic carpets.
  else if(type==='rug'){b('black',0,.008,0,3.4,.015,2.5);}
 });
}
