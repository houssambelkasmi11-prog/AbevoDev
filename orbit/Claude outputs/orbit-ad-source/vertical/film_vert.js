/* ORBIT vertical 60s, deterministic timeline. window.render(t) */
const $=id=>document.getElementById(id);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,x)=>a+(b-a)*x;
const eo=x=>1-Math.pow(1-clamp(x),4);
const eo5=x=>1-Math.pow(1-clamp(x),5);
const eio=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const sm=x=>{x=clamp(x);return x*x*(3-2*x)};
const W=1080,H=1920;

/* ---------- icons / glyphs ---------- */
const I=(d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON={
 grid:I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
 file:I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'),
 spark:I('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4"/>'),
 layers:I('<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>'),
 upload:I('<path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
 check:I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
};
const SYMBOL=(s=24,sw=1.6)=>`<svg width="${s}" height="${s}" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="${sw}"><ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(32 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(-32 16 16)"/></g><circle cx="16" cy="16" r="2.5" fill="currentColor"/></svg>`;
function GLYPH(v){
 const g=[
  '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="11" opacity="0.5"/><circle cx="24" cy="6" r="2" fill="currentColor"/>',
  '<ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-20 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(40 24 24)" opacity="0.5"/><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(100 24 24)" opacity="0.3"/>',
  '<rect x="9" y="9" width="30" height="30" transform="rotate(45 24 24)"/><rect x="15" y="15" width="18" height="18" opacity="0.5"/><line x1="4" y1="24" x2="44" y2="24" opacity="0.35"/>',
  '<circle cx="24" cy="24" r="18" stroke-dasharray="2 3"/><path d="M24 6 L24 42 M6 24 L42 24" opacity="0.4"/><circle cx="24" cy="24" r="7"/>',
  '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="3"/>',
  '<path d="M6 30 L16 30 L20 14 L26 38 L31 22 L34 30 L42 30"/><circle cx="24" cy="24" r="20" opacity="0.25"/>'][v];
 return `<svg viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="1.4">${g}</g><circle cx="24" cy="24" r="2" fill="currentColor"/></svg>`;
}
const PERSONAS=[["ATLAS","The Mentor"],["NOVA","The Creative Thinker"],["AXIOM","The Analyst"],["SOCRATES","The Challenger"],["ECHO","The Memory Coach"],["PULSE","The Productivity Coach"]];

/* ---------- desk ---------- */
const woodSvg=`<svg xmlns='http://www.w3.org/2000/svg' width='720' height='1200'><filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.005 0.085' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .36  0 0 0 0 .23  0 0 0 0 .11  0 0 0 .95 -.30'/></filter><rect width='720' height='1200' filter='url(#g)'/><rect x='0' width='360' height='1200' fill='rgba(255,236,200,.10)'/><rect x='360' width='360' height='1200' fill='rgba(90,55,25,.05)'/><path d='M0 0V1200M360 0V1200' stroke='rgba(70,44,20,.38)' stroke-width='3'/></svg>`;
$('wood').style.backgroundImage=`url("data:image/svg+xml;utf8,${encodeURIComponent(woodSvg)}")`;
$('wood').style.backgroundSize='720px 1200px';

const D=$('deskObjs');
function mk(id,w,h,cls,html){const e=document.createElement('div');e.id=id;e.className='obj '+cls;e.style.cssText+=`position:absolute;left:0;top:0;width:${w}px;height:${h}px;`;e.innerHTML=html||'';D.appendChild(e);return e}
const bars=(arr)=>arr.map(([x,y,w,d])=>`<div class="ln ${d?'d':''}" style="left:${x}px;top:${y}px;width:${w}px"></div>`).join('');
const pvFig=`<svg viewBox="0 0 340 170" style="position:absolute;left:40px;top:252px;width:340px;height:160px"><g fill="none" stroke="#6f7378" stroke-width="2"><path d="M20 10V150H330"/><path d="M60 40Q130 30 190 70T300 130" stroke="#111214" stroke-width="2.5"/><path d="M60 40L60 100Q140 112 190 70" opacity=".5"/></g><text x="26" y="24" font-family="DejaVu Sans Mono" font-size="12" fill="#6f7378">p</text><text x="316" y="146" font-family="DejaVu Sans Mono" font-size="12" fill="#6f7378">V</text></svg>`;
const OB={
 glass:{w:190,h:190,m:[-660,-620,0],t:[-660,-620,0]},
 scrap1:{w:260,h:340,m:[-170,-690,-14],t:[610,-110,3]},
 scrap2:{w:260,h:340,m:[-90,730,9],t:[-612,60,1]},
 note:{w:440,h:580,m:[-585,70,-9],t:[-610,40,-1.2]},
 lec:{w:420,h:560,m:[590,-70,6],t:[612,-110,0]},
 ass:{w:380,h:500,m:[575,570,-5],t:[612,560,0]},
 sticky:{w:176,h:176,m:[-250,500,12],t:[-452,-300,0]},
 pen:{w:20,h:370,m:[-300,410,28],t:[-470,400,90]},
 phone:{w:210,h:430,m:[330,770,14],t:[250,790,0]},
};
const eGlass=mk('oGlass',190,190,'',`<div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 42% 38%,rgba(255,255,255,.75),rgba(235,243,248,.45) 55%,rgba(180,205,222,.5) 100%);box-shadow:0 26px 40px -10px rgba(50,40,30,.4),inset 0 0 0 5px rgba(255,255,255,.55),inset 0 0 0 16px rgba(190,215,232,.3)"></div><div style="position:absolute;left:36px;top:30px;width:50px;height:26px;border-radius:50%;background:rgba(255,255,255,.7);transform:rotate(-30deg);filter:blur(3px)"></div>`);
const eScrap1=mk('oScrap1',260,340,'paper',bars([[28,36,150,1],[28,66,200],[28,90,190],[28,114,210],[28,138,120],[28,190,200],[28,214,170]]));
const eScrap2=mk('oScrap2',260,340,'paper',bars([[28,36,110,1],[28,66,200],[28,90,170],[28,114,210],[28,160,190],[28,184,150]]));
const noteLines=Array.from({length:12},(_,i)=>`<div style="position:absolute;left:56px;right:22px;top:${96+i*40}px;height:1.5px;background:#cdd7e4"></div>`).join('');
const spiral=Array.from({length:12},(_,i)=>`<div style="position:absolute;left:12px;top:${34+i*46}px;width:30px;height:12px;border-radius:7px;background:#a8abb0;box-shadow:inset 0 2px 2px rgba(0,0,0,.25)"></div>`).join('');
const eNote=mk('oNote',440,580,'paper',`${noteLines}${spiral}<div style="position:absolute;left:62px;top:44px;font-family:var(--serif);font-style:italic;font-size:38px;color:#2a3a5c">Entropy &amp; time</div>
<svg viewBox="0 0 440 580" style="position:absolute;inset:0;width:440px;height:580px"><g fill="none" stroke="#2a3a5c" stroke-width="2.4" stroke-linecap="round" opacity=".8"><path d="M64 142q30-10 62 0t60 0t66 4t50-4"/><path d="M64 182q40-8 70 2t70-2t90 0"/><path d="M64 262q26-8 54 0t58 0t62 2"/><path d="M64 302q34-8 66 0t70 0t84 2"/><path d="M64 382q30-9 60 0t64 0"/><path d="M64 462q22-6 50 0t52 0t60 0"/><path d="M300 400q40-40 70-10M358 372l12 18l-20 6"/></g></svg>
<div style="position:absolute;left:58px;top:208px;width:290px;height:30px;background:rgba(207,226,242,.85);border-radius:4px;mix-blend-mode:multiply"></div>
<div style="position:absolute;left:300px;top:496px;width:100px;height:56px;border:3px solid #2a3a5c;border-radius:50%;opacity:.7"></div><div style="position:absolute;left:326px;top:500px;font-family:var(--serif);font-style:italic;font-size:34px;color:#2a3a5c">why?</div>`);
const eLec=mk('oLec',420,560,'paper',`<div class="mono" style="position:absolute;left:40px;top:34px;font-size:13px;color:#6f7378">Lecture 07 · Thermodynamics</div>
<div class="display" style="position:absolute;left:40px;top:62px;font-size:44px;line-height:1.02;color:#111214">Heat<br>Engines</div>
${bars([[40,178,300,1],[40,206,340],[40,230,320],[40,254,336]])}${pvFig}
<div style="position:absolute;left:36px;top:424px;width:300px;height:30px;background:rgba(207,226,242,.9);border-radius:4px;mix-blend-mode:multiply"></div>${bars([[40,430,260,1],[40,462,340],[40,486,300]])}<div class="mono" style="position:absolute;right:30px;bottom:20px;font-size:13px;color:#a3a6aa">7</div>`);
const eAss=mk('oAss',380,500,'paper',`<div class="mono" style="position:absolute;left:34px;top:32px;font-size:13px;color:#6f7378">Assignment 3 · due Friday</div>
<div class="display" style="position:absolute;left:34px;top:60px;font-size:36px;line-height:1.05">Heat engines<br>and efficiency</div>
${[0,1,2].map(i=>{const y=176+i*86;return `<div style="position:absolute;left:34px;top:${y}px;width:24px;height:24px;border:2.5px solid #a9a8a2;border-radius:6px"></div><svg class="ack" data-i="${i}" viewBox="0 0 24 24" style="position:absolute;left:34px;top:${y}px;width:24px;height:24px;opacity:0"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#2f6b4a" stroke-width="3" stroke-linecap="round"/></svg>`+bars([[76,y+2,230,i==1?1:0],[76,y+28,170]])}).join('')}
<div style="position:absolute;right:26px;top:22px;width:60px;height:14px;border-radius:3px;background:#b9b7b0;box-shadow:0 2px 3px rgba(0,0,0,.2)"></div>`);
const eSticky=mk('oSticky',176,176,'',`<div style="position:absolute;inset:0;background:#efe4b9;box-shadow:0 14px 24px -10px rgba(60,40,20,.4),0 2px 4px rgba(60,40,20,.15);border-radius:3px"></div><div style="position:absolute;left:18px;top:22px;right:14px;font-family:var(--serif);font-style:italic;font-size:30px;line-height:1.12;color:#2a3a5c">why does S increase?</div><svg id="stk" viewBox="0 0 24 24" style="position:absolute;right:14px;bottom:12px;width:42px;height:42px;opacity:0"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#2f6b4a" stroke-width="2.6" stroke-linecap="round"/></svg>`);
const ePen=mk('oPen',20,370,'',`<div style="position:absolute;left:0;top:44px;width:20px;height:326px;background:#d9b46a;border-radius:3px;box-shadow:inset -5px 0 0 rgba(90,60,20,.25),6px 8px 14px -4px rgba(60,40,20,.4)"></div><div style="position:absolute;left:0;top:0;width:20px;height:50px;clip-path:polygon(0 100%,50% 0,100% 100%);background:#e9d7b0"></div><div style="position:absolute;left:7px;top:0;width:6px;height:14px;clip-path:polygon(0 100%,50% 0,100% 100%);background:#2c2f33"></div>`);
const ePhone=mk('oPhone',210,430,'',`<div style="position:absolute;inset:0;border-radius:44px;background:#24272b;box-shadow:0 22px 34px -12px rgba(40,30,20,.5),inset 0 0 0 3px #3b3e43"></div>
<div id="phScr" style="position:absolute;left:12px;top:12px;right:12px;bottom:12px;border-radius:34px;background:#1d2a38;overflow:hidden"><div style="position:absolute;left:0;right:0;top:46px;text-align:center;font-family:var(--display);font-weight:700;font-size:56px;color:#e8eef4">9:41</div>
${[0,1,2].map(i=>`<div class="ph" data-i="${i}" style="position:absolute;left:14px;right:14px;top:${150+i*70}px;height:58px;border-radius:16px;background:rgba(255,255,255,.18)"><div class="ln" style="left:14px;top:16px;width:90px;background:rgba(255,255,255,.7)"></div><div class="ln" style="left:14px;top:34px;width:140px;background:rgba(255,255,255,.4)"></div></div>`).join('')}</div>
<div id="phBack" style="position:absolute;left:0;top:0;right:0;bottom:0;border-radius:44px;background:#2c2f33;opacity:0"><div style="position:absolute;left:20px;top:20px;width:64px;height:64px;border-radius:18px;background:#202327"></div></div>`);
/* laptop */
const tabNames=['Lecture 07','Forum','Assignment 3','Notes copy','Untitled'];
const eLap=mk('lap',10,10,'',`
<div id="lapBase" style="position:absolute;left:-380px;top:-50px;width:760px;height:430px;border-radius:26px;background:#d4d6d9;box-shadow:0 40px 60px -20px rgba(50,35,20,.55),0 4px 8px rgba(50,35,20,.2),inset 0 2px 0 rgba(255,255,255,.7)">
 <div style="position:absolute;left:34px;top:34px;width:692px;height:236px;border-radius:12px;background:#c3c6ca;background-image:repeating-linear-gradient(90deg,transparent 0 40px,rgba(64,66,70,.30) 40px 45px),repeating-linear-gradient(0deg,transparent 0 41px,rgba(64,66,70,.30) 41px 46px);box-shadow:inset 0 2px 4px rgba(0,0,0,.18)"></div>
 <div style="position:absolute;left:250px;top:296px;width:260px;height:104px;border-radius:14px;border:2px solid rgba(80,82,86,.25);background:rgba(255,255,255,.18)"></div>
</div>
<div id="lapScreen" style="position:absolute;left:-380px;top:-520px;width:760px;height:470px;border-radius:24px;background:#1c1e21;box-shadow:0 30px 50px -22px rgba(50,35,20,.6),inset 0 0 0 2px #35383c">
 <div id="scIn" style="position:absolute;left:14px;top:18px;width:732px;height:438px;border-radius:8px;overflow:hidden;background:#f6f5f2">
  <div id="scTabs" style="position:absolute;inset:0"></div>
  <div id="scOrb" style="position:absolute;inset:0;opacity:0"></div>
 </div>
</div>`);
/* mini tabs screen */
(function(){
 const tabs=tabNames.map((n,i)=>`<div class="tb" data-i="${i}" style="position:absolute;left:${14+i*142}px;top:44px;width:136px;height:36px;border-radius:9px 9px 0 0;font-size:14px;line-height:36px;padding:0 12px;white-space:nowrap;overflow:hidden;color:#6f7378;background:#e4e2dc">${n}</div>`).join('');
 const pages=[
  `<div class="pg" data-i="0"><div class="display" style="position:absolute;left:50px;top:122px;font-size:34px">Heat Engines</div>${bars([[50,176,430,1],[50,204,600],[50,228,560],[50,252,610],[50,276,480],[50,320,600],[50,344,560]])}<div style="position:absolute;left:520px;top:130px;width:160px;height:120px;border:2px solid #cfcdc6;border-radius:6px"></div></div>`,
  `<div class="pg" data-i="1">${[0,1,2,3].map(i=>`<div style="position:absolute;left:50px;right:50px;top:${116+i*72}px;height:58px;border:1.5px solid #dddcd7;border-radius:10px;background:#fff"><div class="ln d" style="left:16px;top:14px;width:${120+i*30}px"></div><div class="ln" style="left:16px;top:34px;width:${300-i*30}px"></div></div>`).join('')}</div>`,
  `<div class="pg" data-i="2"><div class="display" style="position:absolute;left:50px;top:122px;font-size:32px">Assignment 3</div>${[0,1,2].map(i=>`<div style="position:absolute;left:50px;top:${186+i*58}px;width:20px;height:20px;border:2px solid #a9a8a2;border-radius:5px"></div>${bars([[88,186+i*58+2,420,i==1?1:0],[88,186+i*58+24,300]])}`).join('')}</div>`,
  `<div class="pg" data-i="3">${bars([[50,126,300,1],[50,160,620],[50,184,590],[50,208,560],[50,250,610],[50,274,480]])}</div>`,
  `<div class="pg" data-i="4">${bars([[50,126,200,1],[50,160,560],[50,184,420]])}</div>`];
 $('scTabs').innerHTML=`<div style="position:absolute;left:0;right:0;top:0;height:44px;background:#d9d7d0"><div style="position:absolute;left:14px;top:15px;display:flex;gap:7px"><i style="width:12px;height:12px;border-radius:50%;background:#bdbbb4"></i><i style="width:12px;height:12px;border-radius:50%;background:#bdbbb4"></i><i style="width:12px;height:12px;border-radius:50%;background:#bdbbb4"></i></div></div><div style="position:absolute;left:0;right:0;top:80px;bottom:0;background:#fbfaf7"></div>${tabs}${pages.join('')}`;
 $('scOrb').innerHTML=`<div style="position:absolute;left:0;top:0;bottom:0;width:150px;border-right:1px solid #dddcd7;background:#f1efea"><div style="position:absolute;left:20px;top:20px;color:#111214;display:flex;gap:8px;align-items:center">${SYMBOL(24)}<span class="display" style="font-size:12px;letter-spacing:.3em">ORBIT</span></div>${[0,1,2,3,4].map(i=>`<div class="ln ${i==2?'d':''}" style="left:20px;top:${84+i*38}px;width:${90-(i%2)*18}px;height:10px"></div>`).join('')}</div>
 <div style="position:absolute;left:174px;top:26px;right:26px"><div class="mono" style="font-size:12px;color:#6f7378">Homework Studio</div><div class="display" style="font-size:30px;margin-top:6px">Heat engines</div>
 <div style="margin-top:22px;position:relative;height:6px;background:#dddcd7;border-radius:3px"><div id="scBar" style="position:absolute;left:0;top:0;height:6px;width:50%;border-radius:3px;background:#111214"></div></div>
 ${[0,1,2,3].map(i=>`<div style="margin-top:14px;height:56px;border:1.5px solid #dddcd7;border-radius:12px;background:#fff;position:relative"><div class="mbx" data-i="${i}" style="position:absolute;left:16px;top:16px;width:22px;height:22px;border:2px solid #c9c8c2;border-radius:6px"></div><div class="mck" data-i="${i}" style="position:absolute;left:16px;top:16px;width:22px;height:22px;border-radius:6px;background:#111214;opacity:0"></div><div class="ln ${i==3?'':'d'}" style="left:56px;top:23px;width:${290-i*34}px;height:10px"></div></div>`).join('')}</div>`;
})();

function place(el,o,k,extraX=0,extraY=0){
 const x=lerp(o.m[0],o.t[0],k)+extraX,y=lerp(o.m[1],o.t[1],k)+extraY,r=lerp(o.m[2],o.t[2],k);
 el.style.transform=`translate(${x-o.w/2}px,${y-o.h/2}px) rotate(${r}deg)`;
 return {x,y,r};
}
function anchor(p,o,lx,ly){
 const dx=lx-o.w/2,dy=ly-o.h/2,a=p.r*Math.PI/180;
 return [p.x+dx*Math.cos(a)-dy*Math.sin(a),p.y+dx*Math.sin(a)+dy*Math.cos(a)];
}
const thr=$('threads');
thr.innerHTML=[0,1,2,3].map(i=>`<path class="th" id="th${i}" fill="none" stroke="#7fa9cc" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><circle class="td" id="td${i}" r="7" fill="#7fa9cc" opacity="0"/><circle class="ts" id="ts${i}" r="7" fill="#7fa9cc" opacity="0"/>`).join('');

/* ---------- camera ---------- */
const CAMK=[ // t, z, cx, cy
 [0,.72,0,-60],[8,1.30,0,-210],
 [9.0,1.5,560,-80],[9.8,1.5,560,-80],
 [10.8,1.5,-540,40],[11.4,1.5,-540,40],
 [12.2,1.55,540,500],[12.6,1.55,540,500],
 [14.3,.95,0,-60],[15.8,1.42,0,-285],
 [24,1.22,0,-200],[34,1.06,40,-120],[42.0,1.12,0,-170],[43.7,1.42,0,-285],
 [46.0,.95,0,-70],[49.2,1.0,-130,-50],[51.6,1.38,0,-285],[60,1.42,0,-285]];
function cam(t){
 let a=CAMK[0],b=CAMK[CAMK.length-1];
 for(let i=1;i<CAMK.length;i++){if(t<=CAMK[i][0]){a=CAMK[i-1];b=CAMK[i];break}}
 const e=eio(seg(t,a[0],b[0]));
 const z=Math.exp(lerp(Math.log(a[1]),Math.log(b[1]),e));
 let cx=lerp(a[2],b[2],e),cy=lerp(a[3],b[3],e);
 cx+=7*Math.sin(t*.5);cy+=6*Math.sin(t*.43+1);
 return {z:z*(1+.004*Math.sin(t*.37)),cx,cy};
}
const toFrame=(c,x,y)=>[540+(x-c.cx)*c.z,960+(y-c.cy)*c.z];

/* ---------- headlines ---------- */
const HL=[
 {id:'h1',lines:[['YOU HAVE THE','b'],['INFORMATION.','a']],top:1228,size:92,t0:2.4,t1:7.7,scrim:1},
 {id:'h2',lines:[['WHAT IF IT ALL','b'],['CONNECTED?','a']],top:1228,size:92,t0:12.5,t1:15.0,scrim:1},
 {id:'h3',lines:[['MEET YOUR NEW','b'],['LEARNING WORKSPACE.','a']],top:1262,size:68,t0:16.1,t1:18.7},
 {id:'h4',lines:[['LESSONS. NOTES.','b'],['IDEAS.','a']],top:420,size:92,t0:24.7,t1:28.5},
 {id:'h5',lines:[['ONE CONNECTED','b'],['WORKSPACE.','a']],top:420,size:92,t0:31.5,t1:33.9},
 {id:'h6',lines:[['MORE THAN','b'],['ANSWERS.','a']],top:1262,size:92,t0:34.7,t1:37.9},
 {id:'h7',lines:[['A BETTER WAY','b'],['TO UNDERSTAND.','a']],top:1262,size:84,t0:40.0,t1:42.7},
 {id:'h8',lines:[['YOUR KNOWLEDGE.','a']],top:1228,size:84,t0:44.4,t1:47.7,scrim:1},
 {id:'h9',lines:[['WORKING','b'],['TOGETHER.','a']],top:1228,size:100,t0:47.4,t1:51.5,scrim:1}];
HL.forEach(d=>{
 const el=document.createElement('div');el.className='hl';el.id=d.id;el.style.top=d.top+'px';
 let n=0;
 el.innerHTML=(d.scrim?'<div class="scrim"></div>':'')+'<div class="tx">'+d.lines.map(l=>`<span class="ln1 ${l[1]}" style="font-size:${d.size}px">`+l[0].split(' ').map(w=>`<span class="w"><i data-n="${n++}">${w}</i></span>`).join(' ')+'</span>').join('')+'</div>';
 $('hls').appendChild(el);d.el=el;d.words=[...el.querySelectorAll('i')];
});
function renderHL(d,t){
 const q=eio(seg(t,d.t1-.5,d.t1));
 const vis=t>d.t0-.05&&t<d.t1+.02;
 d.el.style.opacity=vis?1-q:0;
 if(!vis)return;
 d.el.style.transform=`translateY(${-q*20}px)`;
 d.words.forEach((w,i)=>{const p=eo5(seg(t,d.t0+i*.08,d.t0+i*.08+.85));w.style.transform=`translateY(${(1-p)*115}%)`});
 const sc=d.el.querySelector('.scrim');if(sc){const p0=eo(seg(t,d.t0-.1,d.t0+.6));sc.style.opacity=p0}
}

/* ---------- card screens ---------- */
const SENT=["Boltzmann","connected","entropy","to","the","number","of","microstates,","S","=","k","ln","W."];
const REST="Heat flows from hot to cold until both reach equilibrium.";
$('heroWm').innerHTML=SYMBOL(36,1.5)+'<span>ORBIT</span>';
$('appWm').innerHTML=SYMBOL(32,1.6)+'<span>ORBIT</span>';
$('sNotes').innerHTML=`<div id="nIn" class="pad" style="padding-top:44px"><div class="tiny">Physics · Edited just now</div><div class="h2" style="margin-top:14px">Entropy &amp; the arrow of time</div>
<div class="p" style="margin-top:26px">The second law states that the total entropy of an isolated system never decreases:</div><div class="fxm">ΔS ≥ 0</div>
<div class="p" id="selP" style="margin-top:6px">${SENT.map((w,i)=>`<span class="sw" data-i="${i}">${w}</span>`).join(' ')} ${REST}</div><div style="margin-top:34px">${[0,1,2,3,4,5].map(i=>`<div style="height:12px;border-radius:6px;background:#e4e2dc;margin-bottom:22px;width:${[92,78,96,60,88,70][i]}%"></div>`).join('')}</div></div>
<div id="sheet"><div class="who" id="shWho"></div><div class="ans" id="shAns"></div></div>`;
const ATLAS_ANS="Think of entropy as counting. W is the number of microscopic arrangements that match what you observe. More possible arrangements means higher entropy, so isolated systems drift toward the most likely state.";
$('shWho').innerHTML=GLYPH(0)+'<span><b>ATLAS</b><small>The Mentor</small></span>';
$('abar').innerHTML=ICON.spark+['Explain','Simplify','Summarize','Improve','Ask…'].map((l,i)=>`<span ${i==0?'id="abEx"':''}>${l}</span>`).join('');
const LIB=[["PDF","Lecture 07: Heat Engines","PDF · 42 pages"],["DOCX","Organic Chemistry Ch. 4","DOCX · 18 sections"],["LINK","The French Revolution","Link · transcript"],["IMG","Problem set 3","Scan · text read"]];
$('sLib').innerHTML=`<div class="pad" style="padding-top:36px"><div class="tiny">Lessons &amp; Sources</div>
<div class="drop">${ICON.upload}<span>Drop files or paste a link</span></div><div id="rows" style="margin-top:14px">${LIB.map((r,i)=>`<div class="row" data-i="${i}"><div class="ic">${r[0]}</div><div class="t"><b>${r[1]}</b><small>${r[2]}</small></div><div class="idx" style="opacity:0"><span style="width:22px;height:22px;display:flex">${ICON.check}</span>Indexed</div></div>`).join('')}</div></div>`;
const ANS_T="Some heat must flow to the cold reservoir, so efficiency is capped at 1 − Tc/Th";
const ANS_T2="The Carnot cycle in the lecture shows why";
$('sAns').innerHTML=`<div class="pad" style="padding-top:44px"><div class="tiny">Sources</div><div id="chips" style="display:flex;gap:14px;margin-top:16px"><span class="chip" id="chip1"><i>1</i>Lecture 07</span><span class="chip" id="chip2"><i>2</i>Chem Ch. 4</span></div>
<div id="qb" style="display:flex;margin-top:40px"><div class="bub">Why can't a heat engine be 100% efficient?</div></div>
<div class="who" style="margin-top:36px" id="ansWho"></div><div class="tiny" style="margin-top:22px;color:var(--ok)">Grounded in your sources</div><div class="ans" id="ansTx" style="margin-top:12px"></div></div>
<svg id="ansSvg" style="position:absolute;left:0;top:0;width:920px;height:704px;pointer-events:none"><path id="ansLine" d="" fill="none" stroke="#7fa9cc" stroke-width="3.5" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`;
$('ansWho').innerHTML=GLYPH(0)+'<span><b>ATLAS</b><small>The Mentor</small></span>';
const PLAN=["Read the lecture notes","Work through problems 1 to 3","Draft the Carnot explanation","Review with flashcards"];
const STAGES=["Input","Analysis","Sources","Generation","Review","Export"];
$('sHw').innerHTML=`<div class="pad" style="padding-top:36px"><div class="tiny">Homework Studio</div><div class="h2" style="margin-top:10px;font-size:44px">Assignment 3: Heat engines</div>
<div class="stp" id="stp" style="margin-top:26px">${STAGES.map((s,i)=>`<div class="c" data-i="${i}">${i+1}</div>${i<5?'<div class="l"><i></i></div>':''}`).join('')}</div>
<div class="stl">${STAGES.map(s=>`<span>${s}</span>`).join('')}</div>
<div class="tiny" style="margin-top:26px">Your plan</div><div id="plan" style="margin-top:12px">${PLAN.map((p,i)=>`<div class="pl" data-i="${i}"><div class="bx"><div style="width:22px;height:22px;opacity:0">${ICON.check}</div></div><span>${p}</span><span class="n">${[15,20,25,10][i]} MIN</span></div>`).join('')}</div></div>`;
$('sAI').innerHTML=`<div class="pad" style="padding-top:44px" id="aiTop"><div class="tiny">AI Studio</div><div class="pers" id="pers">${PERSONAS.map((p,i)=>`<span data-i="${i}" class="${i==0?'on':''}">${p[0]}</span>`).join('')}<div id="persInd" style="position:absolute;left:0;top:112px;height:3px;background:#111214;border-radius:2px"></div></div>
<div id="chat" style="margin-top:34px"><div style="display:flex"><div class="bub" style="margin-left:auto">Why does entropy always increase?</div></div>
<div class="who" style="margin-top:34px" id="aiWho"></div><div class="ans" id="aiTx"></div></div>
<div class="pcards" id="pcards" style="position:absolute;left:44px;right:44px;top:44px;opacity:0">${PERSONAS.map((p,i)=>`<div class="pc ${i==3?'sel':''}">${GLYPH(i)}<div class="nm">${p[0]}</div><div class="rl">${p[1]}</div></div>`).join('')}</div></div>`;
const ATLAS2="Think of entropy as counting. More possible arrangements means higher entropy, so isolated systems drift toward the most likely state.";
const SOC_ANS="Before I answer, a question for you: is there more than one way to arrange a gas spread across the room, or packed in one corner?";
$('sUni').innerHTML=`<svg id="uniSvg" width="920" height="704" viewBox="0 0 920 704"></svg><div class="pad" style="padding-top:44px;position:relative"><div class="tiny">Knowledge Orbit</div></div>`;
const TABS=[["grid","Overview"],["file","Notes"],["spark","AI Studio"],["layers","Practice"]];
$('appTab').insertAdjacentHTML('beforeend',TABS.map(t=>`<div>${ICON[t[0]]}<span>${t[1]}</span></div>`).join(''));

/* hero network */
const nodes=[];(function(){let s=11;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
 for(let i=0;i<54;i++){nodes.push({ring:i%3,a:r()*6.283,sp:.05+r()*.07,rx:130+(i%3)*105+r()*40,ry:70+(i%3)*68+r()*24,tilt:[.5,-.4,.12][i%3],size:2+r()*2})}})();
const hc=$('heroNet').getContext('2d');
function drawHero(t){
 hc.clearRect(0,0,920,1100);hc.fillStyle='#0b0c0d';hc.fillRect(0,0,920,1100);
 hc.strokeStyle='rgba(255,255,255,.035)';hc.lineWidth=1;
 for(let x=0;x<920;x+=46){hc.beginPath();hc.moveTo(x,0);hc.lineTo(x,1100);hc.stroke()}
 for(let y=0;y<1100;y+=46){hc.beginPath();hc.moveTo(0,y);hc.lineTo(920,y);hc.stroke()}
 const cx=460,cy=500;
 const P=nodes.map(n=>{const a=n.a+t*n.sp,x0=Math.cos(a)*n.rx,y0=Math.sin(a)*n.ry,c=Math.cos(n.tilt),s=Math.sin(n.tilt);return[cx+x0*c-y0*s,cy+x0*s+y0*c,n.size]});
 for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);if(d<170){hc.strokeStyle=`rgba(201,205,209,${(1-d/170)*.4})`;hc.lineWidth=1.2;hc.beginPath();hc.moveTo(P[i][0],P[i][1]);hc.lineTo(P[j][0],P[j][1]);hc.stroke()}}
 P.forEach(p=>{hc.fillStyle='rgba(219,232,242,.9)';hc.beginPath();hc.arc(p[0],p[1],p[2],0,6.283);hc.fill()});
 hc.strokeStyle='rgba(201,205,209,.12)';hc.lineWidth=1.2;[1,2,3].forEach(k=>{hc.beginPath();hc.ellipse(cx,cy,100+k*105,60+k*68,[.5,-.4,.12][k-1],0,6.283);hc.stroke()});
 hc.fillStyle='#f5f3ef';hc.beginPath();hc.arc(cx,cy,7,0,6.283);hc.fill();
 hc.strokeStyle='rgba(245,243,239,.5)';hc.lineWidth=1.5;hc.beginPath();hc.arc(cx,cy,18+3*Math.sin(t*1.6),0,6.283);hc.stroke();
}

/* universe graph */
const CL=[{n:'Physics',c:[250,250],ns:[['Entropy',0,-84],['Heat engines',-92,40],['Carnot cycle',82,52]]},
 {n:'Chemistry',c:[660,230],ns:[['Gibbs energy',-30,-78],['Equilibrium',70,36]]},
 {n:'History',c:[430,540],ns:[['French Revolution',-80,-10],['Sources',96,30]]}];
const LINKS=[['Entropy','Heat engines'],['Entropy','Carnot cycle'],['Gibbs energy','Equilibrium'],['French Revolution','Sources'],['Entropy','Gibbs energy'],['Equilibrium','Carnot cycle']];
function drawUni(svg,t,tt,sizeMul=1){
 // tt: local time since scene start
 const pos={};let g='';
 CL.forEach((c,ci)=>{c.ns.forEach((nn,i)=>{const ph=ci*2+i;pos[nn[0]]=[c.c[0]+nn[1]+6*Math.sin(t*.7+ph),c.c[1]+nn[2]+5*Math.cos(t*.6+ph)]})});
 CL.forEach((c,ci)=>{
  const p=eo(seg(tt,.1+ci*.45,.9+ci*.45));
  g+=`<ellipse cx="${c.c[0]}" cy="${c.c[1]}" rx="${150*p}" ry="${110*p}" fill="none" stroke="#c9c8c2" stroke-width="2" stroke-dasharray="3 7" opacity="${.9*p}" transform="rotate(${-8+ci*12} ${c.c[0]} ${c.c[1]})"/>`;
  g+=`<text x="${c.c[0]}" y="${c.c[1]-136}" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="19" letter-spacing="3" fill="#6f7378" opacity="${p}">${c.n.toUpperCase()}</text>`;
 });
 LINKS.forEach((l,i)=>{
  const hi=i==4;const st=hi?1.9:.9+i*.14;const p=eo(seg(tt,st,st+.7));if(p<=0)return;
  const a=pos[l[0]],b=pos[l[1]];
  g+=`<line x1="${a[0]}" y1="${a[1]}" x2="${a[0]+(b[0]-a[0])*p}" y2="${a[1]+(b[1]-a[1])*p}" stroke="${hi?'#7fa9cc':'#a3a6aa'}" stroke-width="${hi?5:2.5}" stroke-linecap="round"/>`;
 });
 CL.forEach((c,ci)=>c.ns.forEach((nn,i)=>{
  const p=eo(seg(tt,.3+ci*.45+i*.12,.8+ci*.45+i*.12));const q=pos[nn[0]];
  const big=nn[0]==='Entropy'||nn[0]==='Gibbs energy';
  g+=`<circle cx="${q[0]}" cy="${q[1]}" r="${(big?15:11)*p}" fill="#111214"/>`;
  g+=`<text x="${q[0]}" y="${q[1]+(nn[2]<0?-26:40)}" text-anchor="middle" font-family="Inter" font-size="26" font-weight="500" fill="#111214" opacity="${p}">${nn[0]}</text>`;
 }));
 svg.innerHTML=g;
}

/* ---------- measure selection geometry ---------- */
const R3A=[80,360,920,860],R3B=[80,340,920,1130],R4=[80,670,920,830],R5=[80,360,920,860];
const card=$('card');
function setRect(r,rad){card.style.left=r[0]+'px';card.style.top=r[1]+'px';card.style.width=r[2]+'px';card.style.height=r[3]+'px';card.style.borderRadius=rad+'px'}
let GEO={};
function measure(){
 setRect(R3B,34);card.style.opacity=0;
 ['hero','app','sNotes'].forEach(i=>$(i).style.opacity=1);$('flood').style.display='none';
 $('sheet').style.transform='translateY(110%)';
 const cr=card.getBoundingClientRect();
 GEO.words=[...document.querySelectorAll('.sw')].map(w=>{const r=w.getBoundingClientRect();return{x:r.left-cr.left,y:r.top-cr.top,w:r.width,h:r.height}});
 // toolbar sits above first word; compute width
 const first=GEO.words[0];
 const ab=$('abar');ab.style.opacity=1;ab.style.left=(first.x-6)+'px';ab.style.top=(first.y-100)+'px';
 const er=$('abEx').getBoundingClientRect();GEO.explain={x:er.left-cr.left+er.width/2,y:er.top-cr.top+er.height/2};
 ab.style.opacity=0;
 $('flood').style.display='';
 const hr=$('openBtn').getBoundingClientRect();
 setRect(R3A,34);const cr2=card.getBoundingClientRect();
 const hr2=$('openBtn').getBoundingClientRect();
 GEO.pill={x:hr2.left-cr2.left+hr2.width/2,y:hr2.top-cr2.top+hr2.height/2};
 ['hero','app','sNotes'].forEach(i=>$(i).style.opacity=0);
 GEO.ab={x:first.x-6,y:first.y-100};
}

/* ---------- cursor path ---------- */
function bez(p0,p1,p2,p3,u){const v=1-u;return[v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*p3[0],v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*p3[1]]}
function leg(a,b,u,bow=.18){const dx=b[0]-a[0],dy=b[1]-a[1];const c1=[a[0]+dx*.3-dy*bow,a[1]+dy*.3+dx*bow],c2=[a[0]+dx*.75-dy*bow*.4,a[1]+dy*.75+dx*bow*.4];return bez(a,c1,c2,b,u)}
const eioS=x=>{x=clamp(x);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2};
const easeSettle=x=>{x=clamp(x);return 1-Math.pow(1-x,3)}; // slows gently at the end

/* ---------- thread targets ---------- */
function lapPt(x,y,r){const a=r*Math.PI/180;return[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]}

/* ---------- product / end ---------- */
$('endLogo').innerHTML=SYMBOL(70,1.4)+'<span>ORBIT</span>';
$('prod').innerHTML=`<svg id="prodSvg" width="920" height="760" viewBox="0 0 920 760" style="position:absolute;left:0;top:0"></svg><div class="abs" style="left:0;right:0;top:0;height:92px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 36px;background:rgba(246,245,242,.96)"><span class="wm">${SYMBOL(32,1.6)}<span style="font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:.32em">ORBIT</span></span><span class="crumb">My <b>Universe</b></span></div>`;
$('endRings').innerHTML=[0,1,2,3].map(i=>`<ellipse id="er${i}" cx="540" cy="960" rx="${300+i*150}" ry="${130+i*66}" fill="none" stroke="#111214" stroke-width="2" opacity=".07"/>`).join('');
const eW=[...document.querySelectorAll('#endH span')];
function wrapWords(el){const txt=el.textContent;el.innerHTML=txt.split(' ').map(w=>`<span style="display:inline-block;overflow:hidden;vertical-align:top;padding:0 .1em .12em;margin:0 -.1em -.12em"><i style="display:inline-block;font-style:inherit">${w}</i></span>`).join(' ')}
wrapWords($('eA'));wrapWords($('eB'));
const eAw=[...$('eA').querySelectorAll('i')],eBw=[...$('eB').querySelectorAll('i')];

/* ---------- render ---------- */
const tabAt=t=>t<3.0?0:t<4.6?2:t<6.0?1:t<7.4?3:t<9.2?0:t<10.8?3:t<12.2?2:0;
function renderFrame(t){
 /* camera + desk */
 const c=cam(t);
 $('cam').style.transform=`translate(540px,960px) scale(${c.z}) translate(${-c.cx}px,${-c.cy}px)`;
 const k=sm(seg(t,16.5,42));
 const pPen=Math.sin(t*5.3)*(t<7.5?4:1.5);
 const P={};
 for(const key of Object.keys(OB)){
  const el=({glass:eGlass,scrap1:eScrap1,scrap2:eScrap2,note:eNote,lec:eLec,ass:eAss,sticky:eSticky,pen:ePen,phone:ePhone})[key];
  P[key]=place(el,OB[key],k,key==='pen'?pPen:0,key==='pen'?pPen*.4:0);
 }
 // laptop rotation straightens during the discovery
 const lapRot=-2*(1-sm(seg(t,12.4,14.2)));
 eLap.style.transform=`rotate(${lapRot}deg)`;
 // screen content
 const showOrb=t>15.0;
 $('scTabs').style.opacity=showOrb?0:1;$('scOrb').style.opacity=showOrb?1:0;
 const ti=tabAt(t);
 document.querySelectorAll('.tb').forEach(e=>{const on=+e.dataset.i===ti;e.style.background=on?'#fbfaf7':'#e4e2dc';e.style.color=on?'#111214':'#6f7378'});
 document.querySelectorAll('.pg').forEach(e=>{e.style.opacity=+e.dataset.i===ti?1:0});
 // orbit mini screen: checks tick on during S6
 const ck=[1,seg(t,44.0,44.6),seg(t,48.0,48.6),0];
 document.querySelectorAll('.mck').forEach(e=>{const i=+e.dataset.i;e.style.opacity=i<3?(i==0?1:i==1?seg(t,45.2,45.8):seg(t,48.3,48.9)):0});
 $('scBar').style.width=(50+36*seg(t,48.3,49.0)+10*seg(t,45.2,45.8))+'%';
 // assignment checks, sticky check, phone face-down
 document.querySelectorAll('.ack').forEach(e=>{e.style.opacity=clamp((k-.35-(+e.dataset.i)*.12)*8)});
 $('stk').style.opacity=clamp((k-.8)*10);
 $('phScr').style.opacity=1-sm(seg(k,.2,.6));$('phBack').style.opacity=sm(seg(k,.2,.6));
 document.querySelectorAll('.ph').forEach(e=>{const i=+e.dataset.i;const b=(t>2.0&&t<2.5)||(t>5.0&&t<5.5)?1:0;e.style.opacity=i==0?1:(b?1:.55)});
 // blur, veil
 const bl=sm(seg(t,14.4,15.8))*(1-sm(seg(t,42.4,43.9)))+sm(seg(t,51.2,52.8));
 $('world').style.filter=bl>0.01?`blur(${(bl*(t>50?10:18)).toFixed(2)}px)`:'none';
 $('veil').style.opacity=.42*sm(seg(t,14.4,15.8))*(1-sm(seg(t,42.4,43.9)));
 $('lightBands').style.transform=`translate(${(t*7)%200-60}px,${t*3}px)`;
 /* threads */
 const sc=[ [380,-340],[-380,-340],[380,-210],[-380,-210] ];
 const srcs=[()=>anchor(P.lec,OB.lec,190,445),()=>anchor(P.note,OB.note,150,222),()=>anchor(P.ass,OB.ass,190,260),()=>anchor(P.sticky,OB.sticky,88,88)];
 const tOp=t<12.8?1:(t<14.6?1:lerp(1,.5,sm(seg(t,14.6,16)))*(1-sm(seg(t,51,52.5))))*(t>43.9?lerp(1,.6,seg(t,43.9,46)):1);
 for(let i=0;i<4;i++){
  const A=srcs[i](),Bl=lapPt(sc[i][0],sc[i][1],lapRot);
  const B=[Bl[0],Bl[1]];
  const mx=(A[0]+B[0])/2;
  $('th'+i).setAttribute('d',`M${A[0]} ${A[1]} C${mx} ${A[1]} ${mx} ${B[1]} ${B[0]} ${B[1]}`);
  const p=eio(seg(t,12.9+i*.22,14.2+i*.22));
  $('th'+i).setAttribute('stroke-dashoffset',1-p);
  $('th'+i).style.opacity=p>0?tOp:0;
  $('td'+i).setAttribute('cx',B[0]);$('td'+i).setAttribute('cy',B[1]);$('td'+i).style.opacity=p>.98?tOp:0;
  $('ts'+i).setAttribute('cx',A[0]);$('ts'+i).setAttribute('cy',A[1]);$('ts'+i).style.opacity=p>0?tOp:0;
 }
 /* headlines */
 HL.forEach(d=>renderHL(d,t));

 /* card */
 const sRect=(()=>{const a=toFrame(c,-380,-520),b=toFrame(c,380,-50);return[a[0],a[1],b[0]-a[0],b[1]-a[1]]})();
 let R=null,rad=34,op=0;
 const rl=(a,b,e)=>a.map((v,i)=>lerp(v,b[i],e));
 if(t>=14.5&&t<24.0){
  if(t<15.9){const e=eio(seg(t,14.5,15.9));R=rl(sRect,R3A,e);rad=lerp(16,34,e);op=sm(seg(t,14.6,15.2))}
  else if(t<18.2){R=R3A;op=1}
  else{const e=eio(seg(t,18.2,19.0));R=rl(R3A,R3B,e);op=1}
 }
 if(t>=24.0&&t<33.8){const e=eio(seg(t,24.0,24.9));R=rl(R3B,R4,e);op=1}
 if(t>=33.8&&t<42.3){const e=eio(seg(t,33.8,34.8));R=rl(R4,R5,e);op=1}
 if(t>=42.3&&t<44.2){const e=eio(seg(t,42.3,43.6));R=rl(R5,sRect,e);rad=lerp(34,16,e);op=1-sm(seg(t,43.2,44.0))}
 if(R){setRect(R,rad);card.style.opacity=op;card.style.display=''}else{card.style.opacity=0}
 /* screens inside card */
 const scr=(id,a)=>{$(id).style.opacity=clamp(a)};
 const heroOn=t<18.9, appOn=t>=17.6;
 scr('hero',heroOn?1:0);scr('app',appOn?1:0);
 drawHero(t);
 // hero text slight float
 // flood from pill
 const fe=eio(seg(t,17.65,18.45));
 if(t>=17.6&&t<18.9){const gp=GEO.pill;const rmax=Math.hypot(1000,1300);$('flood').style.display='';$('flood').style.clipPath=`circle(${fe*rmax}px at ${gp.x}px ${gp.y}px)`;$('flood').style.background='#f6f5f2'}
 else if(t>=18.9){$('flood').style.display='none'}
 else $('flood').style.display='none';
 $('flood').style.opacity=1;
 // hero is covered by flood; app content shows beneath flood? flood is above app: make app visible only after flood completes
 // (flood is a canvas-coloured disc; app fades in as flood completes)
 const appA=t<17.6?0:(t<18.2?0:eo(seg(t,18.2,18.7)));
 $('app').style.opacity=appA;
 $('flood').style.display=(t>=17.6&&t<18.95)?'':'none';
 $('openBtn').style.transform=`scale(${1-.06*(seg(t,17.55,17.65)*(1-seg(t,17.7,17.85)))})`;
 // which app screen
 let sc2='sNotes',crumb='Notes / <b>Thermodynamics</b>',tab=1;
 if(t>=24.4){sc2='sLib';crumb='Lessons <b>&amp; Sources</b>';tab=-1}
 if(t>=28.4){sc2='sAns';crumb='Lessons <b>&amp; Sources</b>';tab=-1}
 if(t>=31.3){sc2='sHw';crumb='<b>Homework Studio</b>';tab=-1}
 if(t>=34.3){sc2='sAI';crumb='AI Studio / <b>ATLAS</b>';tab=2}
 if(t>=40.0){sc2='sUni';crumb='My <b>Universe</b>';tab=-1}
 const sw=(id,a,b)=>{ // fade window
  const on=sc2===id;
  scr(id,on?1:0)};
 ['sNotes','sLib','sAns','sHw','sAI','sUni'].forEach(id=>sw(id));
 // cross-fade handled by per-screen opacity ramps
 const xf={sLib:seg(t,24.4,24.9),sAns:seg(t,28.4,28.9),sHw:seg(t,31.3,31.8),sAI:seg(t,34.3,34.9),sUni:seg(t,40.0,40.6)};
 for(const id in xf){if(sc2===id)$(id).style.opacity=eo(xf[id])}
 // outgoing screens stay briefly
 const prev={sLib:['sNotes',24.4,24.9],sAns:['sLib',28.4,28.9],sHw:['sAns',31.3,31.8],sAI:['sHw',34.3,34.9],sUni:['sAI',40.0,40.6]};
 if(prev[sc2]){const [pid,a,b]=prev[sc2];$(pid).style.opacity=1-eo(seg(t,a,b))}
 $('crumb').innerHTML=crumb;
 document.querySelectorAll('#appTab div[class]').forEach(()=>{});
 const tabEls=[...document.querySelectorAll('#appTab > div:not(#tabInd)')];
 tabEls.forEach((e,i)=>e.className=i===tab?'on':'');
 const ind=$('tabInd');ind.style.opacity=tab>=0?1:0;ind.style.left=(i2=>(i2*230+85))(Math.max(tab,0))+'px';
 /* notes interactions */
 const sel=eioS(seg(t,19.5,20.6));
 const nsel=sel*SENT.length;
 document.querySelectorAll('.sw').forEach(e=>e.classList.toggle('on',(+e.dataset.i)<nsel-.01));
 const abp=eo(seg(t,20.65,20.95));
 const ab=$('abar');ab.style.opacity=(t>=20.65&&t<22.1)?abp:(t>=22.1?clamp(1-seg(t,22.1,22.5)):0);
 const scrollY=-170*eio(seg(t,21.55,22.35));
 $('nIn').style.transform=`translateY(${scrollY}px)`;
 ab.style.transform=`translateY(${scrollY+ (1-abp)*10}px)`;
 ab.style.left=GEO.ab.x+'px';ab.style.top=GEO.ab.y+'px';
 $('abEx').className=(t>21.35)?'on':'';
 const sh=1-eo(seg(t,21.55,22.2));
 $('sheet').style.transform=`translateY(${sh*110}%)`;
 const aw=ATLAS_ANS.split(' ');const na=Math.floor(aw.length*clamp(seg(t,22.2,23.75)));
 $('shAns').innerHTML=aw.slice(0,na).join(' ')+(na<aw.length&&t>22.2?'<span class="caret"></span>':'');
 /* library */
 document.querySelectorAll('#rows .row').forEach(e=>{const i=+e.dataset.i;
  const rp=eo(seg(t,24.9+i*.12,25.5+i*.12));const idx=eo(seg(t,25.7+i*.55,26.1+i*.55));
  e.style.opacity=rp;e.style.transform=`translateY(${(1-rp)*20}px)`;e.querySelector('.idx').style.opacity=idx});
 /* answer */
 const aiw=ANS_T.split(' '),a2=ANS_T2.split(' ');
 const nw=Math.floor(aiw.length*seg(t,29.2,30.3)),nw2=Math.floor(a2.length*seg(t,30.5,31.1));
 $('qb').style.opacity=eo(seg(t,28.7,29.1));
 $('ansWho').style.opacity=$('chips').style.opacity=eo(seg(t,28.8,29.2));
 $('ansTx').innerHTML=(nw?aiw.slice(0,nw).join(' ')+(nw>=aiw.length?'<span class="cite">1</span>. ':''):'')+(nw2?a2.slice(0,nw2).join(' ')+(nw2>=a2.length?'<span class="cite">2</span>.':''):'')+(nw>0&&nw2<a2.length&&t<31.1?'<span class="caret"></span>':'');
 // citation-to-source thread: measured from DOM once visible
 if(t>=30.4){const cs=[...document.querySelectorAll('#ansTx .cite')];const cr=$('sAns').getBoundingClientRect();
  if(cs[0]){const r1=cs[0].getBoundingClientRect(),r2=$('chip1').getBoundingClientRect();
   const x1=r1.left-cr.left+r1.width/2,y1=r1.top-cr.top,x2=r2.left-cr.left+r2.width/2,y2=r2.top-cr.top+r2.height;
   $('ansLine').setAttribute('d',`M${x1} ${y1} C${x1} ${(y1+y2)/2} ${x2} ${(y1+y2)/2} ${x2} ${y2}`);
   $('ansLine').setAttribute('stroke-dashoffset',1-eio(seg(t,30.5,31.2)));
   $('chip1').style.borderColor=t>31?'#111214':''}}
 else $('ansLine').setAttribute('stroke-dashoffset',1);
 /* homework */
 const stp=[...document.querySelectorAll('#stp .c')],lns=[...document.querySelectorAll('#stp .l i')];
 stp.forEach((e,i)=>{const dn=seg(t,32.0+i*.2,32.25+i*.2);e.style.background=dn>0.5?'#111214':'';e.style.borderColor=dn>0.5?'#111214':(i===Math.floor((t-32)/.2)?'#111214':'');e.style.color=dn>.5?'#fff':''});
 lns.forEach((e,i)=>{e.style.transform=`scaleX(${eo(seg(t,32.1+i*.2,32.3+i*.2))})`});
 document.querySelectorAll('#plan .pl').forEach(e=>{const i=+e.dataset.i;
  const rp=eo(seg(t,32.3+i*.15,32.8+i*.15));e.style.opacity=rp;e.style.transform=`translateY(${(1-rp)*18}px)`;
  const ck=i<3?eo(seg(t,33.0+i*.28,33.3+i*.28)):0;const bx=e.querySelector('.bx');bx.style.background=ck>0.3?'#111214':'';bx.style.borderColor=ck>0.3?'#111214':'';bx.firstChild.style.opacity=ck>.3?1:0});
 /* AI studio */
 $('aiWho').innerHTML=GLYPH(t<36.9?0:3)+`<span><b>${t<36.9?'ATLAS':'SOCRATES'}</b><small>${t<36.9?'The Mentor':'The Challenger'}</small></span>`;
 const sw1=eio(seg(t,36.7,37.3));
 const persEls=[...document.querySelectorAll('#pers span')];
 persEls.forEach((e,i)=>e.className=((t<36.9&&i===0)||(t>=36.9&&i===3))?'on':'');
 const target=t<36.9?0:3;
 const left=persEls[0].offsetLeft,r0=persEls[0].getBoundingClientRect();
 // underline glide (positions measured in unscaled card coords)
 const pxs=persEls.map(e=>[e.offsetLeft,e.offsetWidth]);
 const a0=pxs[0],a3=pxs[3];
 $('persInd').style.left=(44+lerp(a0[0],a3[0],sw1))+'px';$('persInd').style.width=lerp(a0[1],a3[1],sw1)+'px';
 const txt1=ATLAS2.split(' '),txt2=SOC_ANS.split(' ');
 const nA=Math.floor(txt1.length*seg(t,35.2,36.5)),nS=Math.floor(txt2.length*seg(t,37.3,38.6));
 $('aiTx').innerHTML=t<36.9?txt1.slice(0,nA).join(' ')+(nA<txt1.length&&nA>0?'<span class="caret"></span>':''):txt2.slice(0,nS).join(' ')+(nS<txt2.length?'<span class="caret"></span>':'');
 $('chat').style.opacity=(1-eio(seg(t,38.7,39.2)))*eo(seg(t,34.8,35.2));
 $('pers').style.opacity=1-eio(seg(t,38.7,39.2))*.0;
 const pc=$('pcards');pc.style.opacity=eio(seg(t,38.9,39.3));
 [...pc.children].forEach((e,i)=>{const p=eo(seg(t,38.95+i*.09,39.45+i*.09));e.style.opacity=p;e.style.transform=`translateY(${(1-p)*24}px)`});
 $('pers').style.opacity=1-eio(seg(t,38.8,39.2));
 /* universe */
 drawUni($('uniSvg'),t,t-40.0);
 /* cursor */
 const cur=$('cursor');let cp=null,co=0;
 const cardOrig=(r)=>[r[0],r[1]];
 const pillF=[R3A[0]+GEO.pill.x,R3A[1]+GEO.pill.y];
 const word0=[R3B[0]+GEO.words[0].x+14,R3B[1]+GEO.words[0].y+GEO.words[0].h*.6];
 const lastW=GEO.words[SENT.length-1];
 const exF=[R3B[0]+GEO.explain.x,R3B[1]+GEO.explain.y];
 if(t>=16.6&&t<22.9){
  co=eo(seg(t,16.6,17.0))*(1-eo(seg(t,22.3,22.9)));
  const start=[930,1090];
  if(t<17.6){cp=leg(start,pillF,easeSettle(seg(t,16.7,17.6)),.14)}
  else if(t<18.7){cp=pillF}
  else if(t<19.5){cp=leg(pillF,word0,eio(seg(t,18.7,19.5)),.12)}
  else if(t<20.6){
   // drag follows the selection front word by word
   const wi=Math.min(SENT.length-1,Math.max(0,Math.floor(sel*SENT.length)));const w=GEO.words[wi];
   cp=[R3B[0]+w.x+w.w*(sel*SENT.length-wi>1?1:Math.min(1,sel*SENT.length-wi)),R3B[1]+w.y+w.h*.6];
   if(sel>=0.999)cp=[R3B[0]+lastW.x+lastW.w,R3B[1]+lastW.y+lastW.h*.6];
  }
  else if(t<20.9){cp=[R3B[0]+lastW.x+lastW.w,R3B[1]+lastW.y+lastW.h*.6]}
  else if(t<21.35){cp=leg([R3B[0]+lastW.x+lastW.w,R3B[1]+lastW.y+lastW.h*.6],exF,easeSettle(seg(t,20.9,21.35)),.12)}
  else cp=exF;
 }
 if(cp){cur.style.opacity=co;cur.style.transform=`translate(${cp[0]-6}px,${cp[1]-4}px)`}else cur.style.opacity=0;

 /* ---------- end ---------- */
 const eOp=sm(seg(t,51.9,52.5));
 $('end').style.opacity=eOp>0?1:0;
 $('endBg').style.opacity=eOp;
 $('wash').style.opacity=(t<1.0?1-eio(seg(t,0.0,1.0)):0)+(t>59.4?sm(seg(t,59.4,59.98))*.9:0);
 // product card
 const pr=$('prod'),pIn=eo5(seg(t,52.3,53.6)),pOut=eio(seg(t,53.8,54.5));
 pr.style.opacity=pIn*(1-pOut);
 const py=lerp(120,0,pIn)-60*pOut;
 pr.style.transform=`translate(80px,${460+py}px) perspective(1600px) rotateX(${lerp(14,5,pIn)}deg) rotateZ(${lerp(-4,-2,pIn)}deg) scale(${lerp(.94,1,pIn)-.04*pOut})`;
 drawUni($('prodSvg'),t,Math.max(0,t-52.3)+1.2);
 // rings rotate
 [0,1,2,3].forEach(i=>{$('er'+i).setAttribute('transform',`rotate(${(-14+i*10)+t*(1.2-i*.2)} 540 960)`);$('er'+i).setAttribute('opacity',.05+.06*eo(seg(t,53,55)))});
 $('endLogo').style.opacity=eo(seg(t,53.9,54.5));$('endLogo').style.transform=`translateY(${(1-eo(seg(t,53.9,54.5)))*16}px)`;
 eAw.forEach((w,i)=>w.style.transform=`translateY(${(1-eo5(seg(t,54.3+i*.1,55.1+i*.1)))*115}%)`);
 eBw.forEach((w,i)=>w.style.transform=`translateY(${(1-eo5(seg(t,54.7+i*.1,55.5+i*.1)))*115}%)`);
 $('endSub').style.opacity=eo(seg(t,55.4,56.1));$('endSub').style.transform=`translateY(${(1-eo(seg(t,55.4,56.1)))*14}px)`;
 $('endCta').style.opacity=eo(seg(t,56.0,56.7));$('endCta').style.transform=`translateY(${(1-eo(seg(t,56.0,56.7)))*14}px)`;
 $('endUrl').style.opacity=eo(seg(t,56.5,57.2));
 // hold drift
 $('endIn').style.transform=`translateY(${Math.sin(t*.6)*3}px)`;
}
window.render=t=>renderFrame(t);
document.fonts.ready.then(()=>{measure();render(0);window.ready=true});
