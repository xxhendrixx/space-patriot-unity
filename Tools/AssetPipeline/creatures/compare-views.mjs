import fs from 'node:fs';
import path from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const [conceptDir,reviewDir,outDir]=process.argv.slice(2);
if(!conceptDir||!reviewDir||!outDir)throw new Error('Usage: node compare-views.mjs <concept-views-dir> <blender-review-dir> <output-dir>');
const views=['front','left','right','back','top','three-quarter'];fs.mkdirSync(outDir,{recursive:true});const rows=[];
for(const view of views){const aPath=path.join(conceptDir,view+'.png'),bPath=path.join(reviewDir,view+'.png');if(!fs.existsSync(aPath)||!fs.existsSync(bPath))throw new Error('Missing matched view '+view+'.png; concept and render need the same canonical camera view.');
 const [a,b]=await Promise.all([loadImage(aPath),loadImage(bPath)]),size=1024,c=createCanvas(size*3,size),ctx=c.getContext('2d'),left=createCanvas(size,size),right=createCanvas(size,size),overlayCanvas=createCanvas(size,size);
 const scale=(im,dst)=>{const x=dst.getContext('2d');x.clearRect(0,0,size,size);const s=Math.min(size/im.width,size/im.height),w=im.width*s,h=im.height*s;x.drawImage(im,(size-w)/2,(size-h)/2,w,h);return x.getImageData(0,0,size,size);};
 const A=scale(a,left),B=scale(b,right),overlay=overlayCanvas.getContext('2d');overlay.drawImage(left,0,0);overlay.globalAlpha=.5;overlay.drawImage(right,0,0);overlay.globalAlpha=1;ctx.drawImage(left,0,0);ctx.drawImage(right,size,0);ctx.drawImage(overlayCanvas,size*2,0);ctx.fillStyle='#f3c77d';ctx.font='22px sans-serif';ctx.fillText('APPROVED CONCEPT / '+view.toUpperCase(),18,34);ctx.fillText('BLENDER IMPORT / '+view.toUpperCase(),size+18,34);ctx.fillText('50% OVERLAY',size*2+18,34);fs.writeFileSync(path.join(outDir,view+'-overlay.png'),c.toBuffer('image/png'));
 let error=0;for(let i=0;i<A.data.length;i+=4)error+=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]);rows.push({view,meanAbsolutePixelError:+(error/(size*size*3)).toFixed(2),overlay:view+'-overlay.png'});
}
fs.writeFileSync(path.join(outDir,'view-comparison.json'),JSON.stringify({schema:'space-patriot-view-comparison',version:1,views:rows,interpretation:'Pixel error is a repeatable review aid; perspective, lighting and paint differences mean it is not an automatic quality pass.'},null,2));console.log('Wrote six concept/render overlays and per-view pixel metrics.');
