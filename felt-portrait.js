// The reference's felt aesthetic is preserved in a high-resolution portrait.
// A layered 2.5D portrait provides gaze, blink, gentle head tilt and a greeting.
const stage=document.querySelector('.portrait-hero');
const layer=document.querySelector('#character-layer');
const figure=layer.querySelector('.portrait-figure');
const image=figure.querySelector('img');
const canvas=figure.querySelector('canvas');
const context=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let targetX=0,targetY=0,gazeX=0,gazeY=0,angle=0,nod=0,blinkAt=4.2,time=0,last=0,raf=0,visible=true,down=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const eyes=[{x:442,y:468,rx:58,ry:56,irisX:461,irisY:473},{x:627,y:469,rx:54,ry:56,irisX:605,irisY:473}];
function resize(){
 const corridor=stage.querySelector('.character-space');
 let h,w,x,y;
 if(getComputedStyle(corridor).display!=='none'){
  h=corridor.clientHeight;w=h*2/3;x=(stage.clientWidth-w)/2;y=corridor.offsetTop;
 }else{
  w=Math.min(stage.clientWidth*.51,stage.clientHeight*.76);h=w*1.5;x=stage.clientWidth-w;y=Math.max(10,stage.clientHeight-h);
 }
 figure.style.width=w+'px';figure.style.height=h+'px';figure.style.left=x+'px';figure.style.top=y+'px';figure.style.bottom='auto';figure.style.right='auto';
 layer.dataset.portraitHeight=h.toFixed(1);
 if(image.complete&&image.naturalWidth)draw(1);
 wake();
}
function point(e){
 const b=figure.getBoundingClientRect();
 targetX=clamp((e.clientX-(b.left+b.width*.52))/(b.width*.72),-1,1);
 targetY=clamp((e.clientY-(b.top+b.height*.325))/(b.height*.5),-1,1);
 wake();
}
function draw(open){
 context.clearRect(0,0,1024,1536);context.save();
 context.beginPath();context.rect(0,0,1024,1060);context.clip();context.drawImage(image,0,0,1024,1536);
 for(const eye of eyes){
  context.save();context.beginPath();context.ellipse(eye.x,eye.y,eye.rx,eye.ry,0,0,Math.PI*2);context.clip();
  const wash=context.createRadialGradient(eye.x-13,eye.y-15,5,eye.x,eye.y,eye.ry*1.06);
  wash.addColorStop(0,'#faf4ec');wash.addColorStop(.68,'#f1e7dc');wash.addColorStop(1,'#d2bfb1');
  context.fillStyle=wash;context.fillRect(eye.x-eye.rx,eye.y-eye.ry,eye.rx*2,eye.ry*2);
  const px=eye.x+gazeX*15,py=eye.y+gazeY*12;
  context.save();context.beginPath();context.ellipse(px,py,28,32,0,0,Math.PI*2);context.clip();
  // Sample the generated iris itself, retaining the same fiber-free glass finish.
  context.drawImage(image,eye.irisX-28,eye.irisY-32,56,64,px-28,py-32,56,64);context.restore();
  if(open<.995){
   const lid=context.createLinearGradient(0,eye.y-eye.ry,0,eye.y+eye.ry);lid.addColorStop(0,'#d89e7e');lid.addColorStop(1,'#dca389');context.fillStyle=lid;
   const close=eye.ry*(1-open);context.fillRect(eye.x-eye.rx,eye.y-eye.ry,eye.rx*2,close);context.fillRect(eye.x-eye.rx,eye.y+eye.ry-close,eye.rx*2,close);
  }
  context.restore();
 }
 context.restore();
 canvas.style.transform=`perspective(1200px) rotateY(${gazeX*7}deg) rotateX(${-gazeY*2+nod}deg) rotateZ(${angle}deg) translateY(${reduced.matches?0:Math.sin(time*1.4)*1.1}px)`;
 layer.dataset.gazeX=gazeX.toFixed(3);layer.dataset.gazeY=gazeY.toFixed(3);layer.dataset.headAngle=angle.toFixed(3);layer.dataset.eyeOpen=open.toFixed(3);
}
function frame(now){
 raf=0;if(!visible||document.hidden||!image.complete||!image.naturalWidth)return;
 const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;time+=dt;
 const smooth=reduced.matches?1:1-Math.exp(-9*dt);
 gazeX+=(targetX-gazeX)*smooth;gazeY+=(targetY-gazeY)*smooth;
 angle+=(targetX*1.2-angle)*smooth;nod*=Math.exp(-9*dt);
 let open=1;
 if(!reduced.matches&&time>blinkAt){const t=time-blinkAt;open=Math.abs(clamp(t/.18,0,1)*2-1);if(t>.18){blinkAt=time+3.8;open=1;}}
 draw(open);raf=requestAnimationFrame(frame);
}
function wake(){if(!raf&&visible&&!document.hidden&&image.complete&&image.naturalWidth){last=0;raf=requestAnimationFrame(frame);}}
function ready(){
 if(!context)return;
 draw(1);figure.classList.add('is-ready');layer.dataset.renderer='canvas2d';layer.dataset.character='felt-bust';
 stage.tabIndex=0;stage.setAttribute('aria-describedby','character-status');
 document.querySelector('#character-status').textContent='移动鼠标，人物会看向你；点击空白处，人物会点头打招呼';
 resize();wake();
}
stage.addEventListener('pointermove',point,{passive:true});
stage.addEventListener('pointerleave',()=>{targetX=targetY=0;});
stage.addEventListener('pointerdown',e=>{if(e.button===0)down={x:e.clientX,y:e.clientY};},{passive:true});
stage.addEventListener('pointerup',e=>{
 if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>9){down=null;return;}down=null;
 if(e.target.closest('a,button,input,select,textarea'))return;
 point(e);if(!reduced.matches){nod=6;blinkAt=time;}
 layer.dataset.greeting='yes';wake();
},{passive:true});
stage.addEventListener('pointercancel',()=>{down=null;});
stage.addEventListener('keydown',e=>{if(e.target!==stage)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();[targetX,targetY]=d;wake();}else if(e.key==='Home'){targetX=targetY=0;wake();}});
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(raf);raf=0;last=0;}},{rootMargin:'80px'}).observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else wake();});
image.addEventListener('load',ready,{once:true});if(image.complete&&image.naturalWidth)ready();
