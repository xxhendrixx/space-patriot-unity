import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';

// Keep the GPU workload serial. A failure stops at the suite that needs attention.
const all=['polish','ship-fire','atmosphere','frontier11','artwork','frontier','engines','city','society','frontier10','browser','terrain','packaging'];
const requested=process.argv.slice(2);if(requested.some(s=>!all.includes(s)))throw Error('Unknown browser suite');
for(const suite of requested.length?requested:all){
  const file='tests/'+(suite==='browser'?'browser':suite+'-browser')+'.mjs';
  const log=createWriteStream('artifacts/'+suite+'-run.log');
  console.log('Running '+suite);
  const child=spawn(process.execPath,[file],{stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  await new Promise(resolve=>log.end(resolve));
  if(code!==0)throw Error(suite+' failed; inspect artifacts/'+suite+'-run.log');
  console.log('Passed '+suite);
}
