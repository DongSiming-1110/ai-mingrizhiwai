import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const stage=document.querySelector('.character-hero');
const layer=document.querySelector('#character-layer');
const status=document.querySelector('#character-status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=THREE.MathUtils.clamp;

// Shared movement controller; pixel travel and articulated running are updated together.
function controller(paint,ratio=.32) {
  let width=1,height=1,bodyHeight=300,bodyWidth=100,ready=false;
  const position=new THREE.Vector2(),target=new THREE.Vector2(),pointer=new THREE.Vector2();
  let speed=0,elapsed=0,last=0,raf=0,visible=true,down=null,activePointer=false;
  const marker=document.querySelector('.destination');
  const limit=(x,y)=>new THREE.Vector2(clamp(x,bodyWidth*.7+14,width-bodyWidth*.7-14),clamp(y,bodyHeight+22,height-28));
  function initial(){
    const corridor=stage.querySelector('.character-space');
    if(getComputedStyle(corridor).display!=='none'){
      const a=stage.getBoundingClientRect(),b=corridor.getBoundingClientRect();
      return limit(width*.52,b.top-a.top+b.height*.96);
    }
    return limit(width*.61,height-36);
  }
  function resize(){
    const w=width,h=height;
    width=stage.clientWidth;height=stage.clientHeight;
    bodyHeight=Math.min(Math.sqrt(width*height/(16*ratio)),height*.68,460);
    const corridor=stage.querySelector('.character-space');
    if(getComputedStyle(corridor).display!=='none')bodyHeight=Math.min(bodyHeight,corridor.clientHeight*.88);
    bodyWidth=bodyHeight*ratio;
    if(!ready){position.copy(initial());target.copy(position);pointer.set(width*.6,height*.35);ready=true;}
    else{position.copy(limit(position.x/w*width,position.y/h*height));target.copy(limit(target.x/w*width,target.y/h*height));}
    layer.dataset.characterHeight=bodyHeight.toFixed(1);
    layer.dataset.areaFraction=(bodyWidth*bodyHeight/(width*height)).toFixed(4);
    render(0);wake();
  }
  function moveTo(x,y){
    target.copy(limit(x,y));
    marker.style.left=target.x+'px';marker.style.top=target.y+'px';
    marker.classList.remove('is-active');void marker.offsetWidth;marker.classList.add('is-active');
    if(reduced.matches){position.copy(target);speed=0;}
    status.textContent='小人物正在跑向你点击的位置';
    layer.dataset.targetX=target.x.toFixed(1);layer.dataset.targetY=target.y.toFixed(1);
    wake();
  }
  stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();pointer.set(e.clientX-b.left,e.clientY-b.top);activePointer=true;wake();},{passive:true});
  stage.addEventListener('pointerleave',()=>{activePointer=false;});
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY,id:e.pointerId};},{passive:true});
  stage.addEventListener('pointerup',e=>{
    if(!down||e.pointerId!==down.id)return;
    const distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
    if(distance>9||e.target.closest('a,button,input,select,textarea'))return;
    const b=stage.getBoundingClientRect();moveTo(e.clientX-b.left,e.clientY-b.top);
  },{passive:true});
  stage.addEventListener('pointercancel',()=>{down=null;},{passive:true});
  stage.tabIndex=0;stage.setAttribute('aria-describedby','character-status');
  status.textContent='点击封面空白处，小人物会摆臂抬腿跑过去；也可聚焦封面后使用方向键';
  stage.addEventListener('keydown',e=>{
    if(e.target!==stage)return;
    const d={ArrowLeft:[-90,0],ArrowRight:[90,0],ArrowUp:[0,-90],ArrowDown:[0,90]}[e.key];
    if(d){e.preventDefault();moveTo(target.x+d[0],target.y+d[1]);}
    else if(e.key==='Home'){e.preventDefault();const p=initial();moveTo(p.x,p.y);}
  });
  let lastRunning=false;
  function render(dt){
    elapsed+=dt;
    const distance=position.distanceTo(target),running=distance>1.8&&!reduced.matches;
    const direction=target.clone().sub(position).normalize();
    if(running){
      const desired=Math.min(clamp(width*.30,190,520),Math.sqrt(2*1000*distance));
      speed=THREE.MathUtils.damp(speed,desired,10,dt);
      position.addScaledVector(direction,Math.min(distance,speed*dt));
    }else{position.copy(target);speed=THREE.MathUtils.damp(speed,0,15,dt);}
    if(position.distanceTo(target)<1.8&&lastRunning)status.textContent='小人物已跑到目标位置';
    lastRunning=running;
    layer.dataset.state=running?'running':'idle';
    layer.dataset.x=position.x.toFixed(1);layer.dataset.y=position.y.toFixed(1);
    paint({dt,elapsed,width,height,bodyHeight,bodyWidth,position,target,pointer,activePointer,speed,running,direction});
  }
  function frame(now){raf=0;if(!visible||document.hidden)return;const dt=last?Math.min((now-last)/1000,.045):1/60;last=now;render(dt);raf=requestAnimationFrame(frame);}
  function wake(){if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}}
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(raf);raf=0;last=0;}},{rootMargin:'80px'}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else wake();});
  reduced.addEventListener('change',()=>{if(reduced.matches){position.copy(target);speed=0;}wake();});
  resize();
}

function mountFallback(){
  layer.dataset.renderer='poster';
  const poster=layer.querySelector('.character-fallback');
  const sprite=document.createElement('div');sprite.className='character-sprite';
  const frames=document.createElement('span');frames.className='character-run-frames';frames.setAttribute('aria-hidden','true');
  sprite.append(poster,frames);layer.append(sprite);
  let facing=1;
  controller(s=>{
    if(s.running&&Math.abs(s.direction.x)>.1)facing=s.direction.x<0?1:-1;
    sprite.style.height=s.bodyHeight+'px';sprite.style.width=s.bodyHeight*2/3+'px';
    sprite.style.left=s.position.x+'px';sprite.style.top=s.position.y+'px';
    sprite.style.transform=`translate(-50%,-100%) scaleX(${s.running?facing:1})`;
    sprite.classList.toggle('is-running',s.running);
    const frame=Math.floor(s.elapsed*14)%8;
    frames.style.backgroundPosition=`${frame/7*100}% 0`;
    layer.dataset.animationFrame=String(frame);layer.dataset.runCycle=s.running?'rendered-8-frames':'idle';
  });
}

async function mountModel(){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{mountFallback();return;}
  let gltf;
  try{gltf=await new GLTFLoader().loadAsync(new URL('./assets/creator.glb',import.meta.url).href);}catch{renderer.dispose();mountFallback();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.setClearColor(0,0);
  const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');layer.append(canvas);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,4000);camera.position.set(0,0,1000);
  scene.add(new THREE.HemisphereLight(0xfff8ed,0x77786c,2.1));
  for(const [color,intensity,x,y,z] of [[0xfff2db,2.8,-300,500,700],[0xe8f2f2,1.3,450,200,500],[0xffffff,2.3,100,400,-300]]){
    const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);
  }
  const rig=new THREE.Group(),turn=new THREE.Group();rig.add(turn);scene.add(rig);
  const model=gltf.scene;turn.add(model);
  // glTF omits constant idle channels; explicitly establish the resting pose
  // before the mixer caches defaults, so a zero run weight yields straight limbs.
  for(const name of ['Torso','Head','Thigh_L','Thigh_R','Shin_L','Shin_R','Foot_L','Foot_R'])model.getObjectByName(name)?.rotation.set(0,0,0);
  for(const [name,z] of [['UpperArm_L',.055],['UpperArm_R',-.055]])model.getObjectByName(name)?.rotation.set(0,0,z);
  for(const name of ['Forearm_L','Forearm_R'])model.getObjectByName(name)?.rotation.set(-.07,0,0);
  const body=model.getObjectByName('Body');if(body)body.position.y=0;
  const mixer=new THREE.AnimationMixer(model);
  const idleClip=gltf.animations.find(a=>a.name==='Idle'),runClip=gltf.animations.find(a=>a.name==='Run');
  if(!idleClip||!runClip){renderer.dispose();canvas.remove();mountFallback();return;}
  const idle=mixer.clipAction(idleClip).play(),run=mixer.clipAction(runClip).play();
  idle.setEffectiveWeight(1);run.setEffectiveWeight(0);mixer.update(0);
  const bounds=new THREE.Box3().setFromObject(model),modelHeight=bounds.max.y-bounds.min.y;
  model.position.y=-bounds.min.y;
  const head=model.getObjectByName('Head');
  const eyes=[model.getObjectByName('Eye_L'),model.getObjectByName('Eye_R')].filter(Boolean);
  const thighs=[model.getObjectByName('Thigh_L'),model.getObjectByName('Thigh_R')];
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const c=shadowCanvas.getContext('2d'),g=c.createRadialGradient(64,64,2,64,64,62);
  g.addColorStop(0,'rgba(54,48,37,.24)');g.addColorStop(.5,'rgba(54,48,37,.09)');g.addColorStop(1,'rgba(54,48,37,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.position.z=-40;scene.add(shadow);
  let w=0,h=0,blend=0,heading=.15,lookYaw=0,lookPitch=0;
  layer.dataset.renderer='webgl';layer.dataset.model='blender-creator';
  layer.dataset.clips=gltf.animations.map(a=>a.name).join(',');
  controller(s=>{
    if(w!==s.width||h!==s.height){
      w=s.width;h=s.height;renderer.setSize(w,h,false);
      camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
    }
    const scale=s.bodyHeight/modelHeight;rig.scale.setScalar(scale);
    blend=THREE.MathUtils.damp(blend,s.running?1:0,14,s.dt);
    idle.setEffectiveWeight(1-blend);run.setEffectiveWeight(blend);
    run.setEffectiveTimeScale(clamp(s.speed/Math.max(scale*3.5,1),.85,1.7));
    mixer.update(reduced.matches?0:s.dt);
    const desired=s.running?Math.atan2(s.direction.x,s.direction.y):.15;
    const delta=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
    heading+=delta*(1-Math.exp(-12*s.dt));turn.rotation.y=heading;
    const headY=s.position.y-s.bodyHeight*.85;
    const x=s.activePointer?clamp((s.pointer.x-s.position.x)/Math.max(w*.3,150),-.5,.5):0;
    const y=s.activePointer?clamp((s.pointer.y-headY)/Math.max(h*.35,150),-.2,.2):0;
    lookYaw=THREE.MathUtils.damp(lookYaw,x*(1-blend*.8),8,s.dt);
    lookPitch=THREE.MathUtils.damp(lookPitch,y,8,s.dt);
    if(head){head.rotation.y+=lookYaw;head.rotation.x+=lookPitch;}
    const blink=!reduced.matches&&s.elapsed%4.6>4.42?Math.max(.12,Math.abs((s.elapsed%4.6-4.42)/.18*2-1)):1;
    eyes.forEach(eye=>eye.scale.y=blink);
    rig.position.set(s.position.x-w/2,h/2-s.position.y,0);
    shadow.position.set(s.position.x-w/2,h/2-s.position.y+1,-40);
    shadow.scale.set(s.bodyWidth*1.35,s.bodyWidth*.32,1);shadow.material.opacity=1-blend*.2;
    layer.dataset.headYaw=lookYaw.toFixed(3);
    layer.dataset.runWeight=blend.toFixed(3);layer.dataset.runTime=run.time.toFixed(3);
    layer.dataset.legSwing=thighs[0]?.rotation.x.toFixed(3)||'0';
    layer.dataset.heading=heading.toFixed(3);
    renderer.render(scene,camera);
  });
}
mountModel();
