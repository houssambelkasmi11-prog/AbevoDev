import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const FPS=24,start=+process.env.START,end=+process.env.END,out=process.env.OUT;
const b=await chromium.launch({args:['--font-render-hinting=none','--disable-lcd-text']});
const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
p.on('pageerror',e=>console.log('PAGEERROR',e.message));
await p.goto('file:///home/claude/orbit-vert/film_vert.html');await p.evaluate(()=>window.ready);
const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-','-c:v','ffv1','-level','3','-pix_fmt','yuv444p',out],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let i=start;i<end;i++){await p.evaluate(t=>window.render(t),i/FPS);const buf=await p.screenshot({type:'png'});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%60==0)console.log(i,((Date.now()-t0)/1000)|0)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',((Date.now()-t0)/1000)|0);
