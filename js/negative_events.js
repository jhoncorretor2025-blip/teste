// Eventos negativos progressivos da Mioquinha — desafios curtos que aumentam com a partida.
import { state } from './state.js';
import { isOnline, mySlot } from './net.js';
import { vibrate, announce } from './utils.js';

const EFFECTS = [
  { id:'invert', label:'🔄 CONTROLES INVERTIDOS', duration:5000 },
  { id:'freeze', label:'🧊 SEM VIRAR!', duration:4000 },
  { id:'confusion', label:'🌪️ CONTROLES CONFUSOS', duration:5200 },
  { id:'fog', label:'🌫️ NEBLINA', duration:5500 },
  { id:'blackhole', label:'🕳️ BURACO NEGRO — GRAVIDADE!', duration:6500 },
];

let timer = null;
let confusionTimer = null;
let monitorTimer = null;
let effectEndTimer = null;
let startedAt = 0;
let firstChallengeTriggered = false;
let lastEffect = '';

function activeForHost(){ return !isOnline(); }
function clearTimers(){
  if(timer) clearTimeout(timer);
  if(confusionTimer) clearInterval(confusionTimer);
  if(monitorTimer) clearInterval(monitorTimer);
  if(effectEndTimer) clearTimeout(effectEndTimer);
  timer=null; confusionTimer=null; monitorTimer=null; effectEndTimer=null;
}
function hideOverlay(){
  document.getElementById('negativeEventOverlay')?.remove();
  document.getElementById('negativeFogOverlay')?.remove();
  document.getElementById('negativeBlackHoleOverlay')?.remove();
}
function showOverlay(effect){
  hideOverlay();
  const el=document.createElement('div'); el.id='negativeEventOverlay'; el.setAttribute('role','status');
  el.style.cssText='position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:9999;pointer-events:none;padding:11px 17px;border-radius:14px;background:linear-gradient(135deg,rgba(95,10,35,.97),rgba(24,10,38,.96));border:1px solid rgba(255,120,160,.7);box-shadow:0 10px 35px #0009,0 0 22px rgba(255,65,110,.18);color:#fff;font:900 14px system-ui;text-align:center;max-width:90vw;letter-spacing:.2px;';
  el.textContent=effect.label; document.body.appendChild(el);
  if(effect.id==='fog'){
    const fog=document.createElement('div'); fog.id='negativeFogOverlay';
    fog.style.cssText='position:fixed;inset:0;z-index:9990;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 0 18%,rgba(10,15,25,.38) 45%,rgba(3,7,14,.78) 100%);';
    document.body.appendChild(fog);
  }
  if(effect.id==='blackhole'){
    const hole=document.createElement('div'); hole.id='negativeBlackHoleOverlay';
    hole.innerHTML='<div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#000 0 22%,#160b2b 34%,#5b2b9a 43%,#141022 51%,transparent 68%);box-shadow:0 0 24px #8b5cf6,0 0 55px #5424a5;animation:snakeBlackHolePulse 1.2s ease-in-out infinite alternate"></div><div style="position:absolute;inset:-10px;border:3px solid rgba(170,120,255,.7);border-left-color:transparent;border-radius:50%;animation:snakeBlackHoleSpin 1.7s linear infinite"></div>';
    hole.style.cssText='position:fixed;left:50%;top:52%;width:94px;height:94px;transform:translate(-50%,-50%);z-index:9991;pointer-events:none;filter:drop-shadow(0 0 14px #6d28d9);';
    document.body.appendChild(hole);
    if(!document.getElementById('snakeBlackHoleAnimations')){
      const style=document.createElement('style'); style.id='snakeBlackHoleAnimations';
      style.textContent='@keyframes snakeBlackHoleSpin{to{transform:rotate(360deg)}}@keyframes snakeBlackHolePulse{from{transform:scale(.88)}to{transform:scale(1.08)}}';
      document.head.appendChild(style);
    }
  }
}
function removeEffect(){
  if(confusionTimer) clearInterval(confusionTimer);
  confusionTimer=null; state.negativeEvent=null; hideOverlay();
}
function chooseEffect(){
  const pool=EFFECTS.filter(e=>e.id!==lastEffect);
  const elapsed=Date.now()-startedAt;
  const earlyPool=pool.filter(e=>e.id!=='blackhole');
  if(elapsed<90000) return earlyPool[Math.floor(Math.random()*earlyPool.length)];
  return pool[Math.floor(Math.random()*pool.length)];
}
function scheduleNext(delay){
  clearTimeout(timer);
  if(!state.running) return;
  timer=setTimeout(runEffect,delay ?? (24000+Math.floor(Math.random()*11000)));
}
function pullTowardBlackHole(){
  const i=mySlot;
  if(!state.running || state.negativeEvent?.id!=='blackhole' || !state.alive[i]) return;
  const head=state.snakes[i]?.[0];
  if(!head) return;
  const dx=state.mapW/2-head.x, dy=state.mapH/2-head.y;
  const current=state.dirs[i] || {x:1,y:0};
  let desired;
  if(Math.abs(dx)>Math.abs(dy)) desired={x:Math.sign(dx)||current.x,y:0};
  else desired={x:0,y:Math.sign(dy)||current.y};
  if(desired.x===-current.x && desired.y===-current.y) desired={x:0,y:Math.sign(dy)||current.y};
  state.nextDirs[i]=desired;
}
function runEffect(){
  if(!state.running || !activeForHost()) return scheduleNext();
  const effect=chooseEffect(); lastEffect=effect.id;
  state.negativeEvent={id:effect.id,until:Date.now()+effect.duration};
  showOverlay(effect);
  announce('⚠️ Desafio: '+effect.label);
  vibrate([30,40,30]);
  if(effect.id==='confusion' || effect.id==='blackhole'){
    confusionTimer=setInterval(()=>{
      if(!state.running || state.negativeEvent?.id!==effect.id) return;
      if(effect.id==='blackhole') { pullTowardBlackHole(); return; }
      const i=mySlot; if(!state.alive[i]) return;
      const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}], cur=state.dirs[i];
      const options=dirs.filter(d=>!(d.x===-cur.x&&d.y===-cur.y));
      state.nextDirs[i]=options[Math.floor(Math.random()*options.length)];
    },effect.id==='blackhole'?650:850);
  }
  effectEndTimer=setTimeout(()=>{ if(state.negativeEvent?.id===effect.id) removeEffect(); },effect.duration);
  scheduleNext(effect.duration+24000+Math.floor(Math.random()*11000));
}
export function startNegativeEvents(){
  clearTimers(); removeEffect(); lastEffect=''; startedAt=Date.now(); firstChallengeTriggered=false;
  if(!activeForHost()) return;
  // O primeiro desafio só começa após 1 minuto, ou antes se a minhoca já tiver
  // chegado a 75 segmentos/pontos. Depois os eventos voltam em intervalos imprevisíveis.
  monitorTimer=setInterval(()=>{
    if(!state.running || state.paused || firstChallengeTriggered) return;
    const i=mySlot;
    const elapsed=Date.now()-startedAt;
    const length=state.snakes[i]?.length || 0;
    const score=state.scores[i] || 0;
    if(elapsed>=60000 || length>=75 || score>=75){
      firstChallengeTriggered=true;
      clearInterval(monitorTimer); monitorTimer=null;
      runEffect();
    }
  },1000);
}
export function stopNegativeEvents(){ clearTimers(); removeEffect(); }
export function transformDirection(d){ const e=state.negativeEvent; return e?.id==='invert' ? {x:-d.x,y:-d.y} : d; }
export function canTurn(){ return state.negativeEvent?.id!=='freeze'; }
export function shouldSkipMovement(){ return false; }
