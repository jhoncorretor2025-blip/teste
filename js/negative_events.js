// Eventos negativos aleatorios da Mioquinha — desafios curtos e imprevisíveis.
import { state } from './state.js';
import { isOnline, isHost, mySlot } from './net.js';
import { vibrate, announce } from './utils.js';

const EFFECTS = [
  { id:'invert', label:'🔄 CONTROLES INVERTIDOS', duration:5000 },
  { id:'freeze', label:'🧊 SEM VIRAR!', duration:4000 },
  { id:'confusion', label:'🌪️ CONTROLES CONFUSOS', duration:5200 },
  { id:'slow', label:'🐌 ARENA LENTA', duration:6000 },
  { id:'fog', label:'🌫️ NEBLINA', duration:5500 },
];

let timer = null;
let confusionTimer = null;
let lastEffect = '';

function activeForHost(){ return !isOnline() || isHost(); }
function clearTimers(){ if(timer) clearTimeout(timer); timer=null; if(confusionTimer) clearInterval(confusionTimer); confusionTimer=null; }
function hideOverlay(){ document.getElementById('negativeEventOverlay')?.remove(); }
function showOverlay(effect){
  hideOverlay();
  const el=document.createElement('div'); el.id='negativeEventOverlay'; el.setAttribute('role','status');
  el.style.cssText='position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:9999;pointer-events:none;padding:10px 16px;border-radius:14px;background:rgba(75,8,20,.94);border:1px solid rgba(255,120,140,.65);box-shadow:0 10px 35px #0009;color:#fff;font:900 14px system-ui;text-align:center;max-width:88vw;letter-spacing:.2px;';
  el.textContent=effect.label; document.body.appendChild(el);
  if(effect.id==='fog'){
    const fog=document.createElement('div'); fog.id='negativeFogOverlay';
    fog.style.cssText='position:fixed;inset:0;z-index:9990;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 0 18%,rgba(10,15,25,.38) 45%,rgba(3,7,14,.78) 100%);';
    document.body.appendChild(fog);
  }
}
function removeEffect(){ if(confusionTimer) clearInterval(confusionTimer); confusionTimer=null; state.negativeEvent=null; hideOverlay(); document.getElementById('negativeFogOverlay')?.remove(); }
function chooseEffect(){ const pool=EFFECTS.filter(e=>e.id!==lastEffect); return pool[Math.floor(Math.random()*pool.length)]; }
function scheduleNext(delay){ clearTimeout(timer); if(!state.running) return; timer=setTimeout(runEffect,delay ?? (18000+Math.floor(Math.random()*12000))); }
function runEffect(){
  if(!state.running || !activeForHost()) return scheduleNext();
  const effect=chooseEffect(); lastEffect=effect.id;
  state.negativeEvent={id:effect.id,until:Date.now()+effect.duration};
  showOverlay(effect); announce('⚠️ Desafio: '+effect.label.replace(/[^A-ZÁÉÍÓÚÃÕÇ0-9⚠️🔄🧊🌪️🐌🌫️ ]/gi,'').trim()); vibrate([30,40,30]);
  if(effect.id==='confusion'){
    confusionTimer=setInterval(()=>{
      if(!state.running || state.negativeEvent?.id!=='confusion') return;
      const i=mySlot; if(!state.alive[i]) return;
      const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}], cur=state.dirs[i];
      const options=dirs.filter(d=>!(d.x===-cur.x&&d.y===-cur.y));
      state.nextDirs[i]=options[Math.floor(Math.random()*options.length)];
    },850);
  }
  setTimeout(()=>{ if(state.negativeEvent?.id===effect.id) removeEffect(); },effect.duration);
  scheduleNext(effect.duration+18000+Math.floor(Math.random()*10000));
}
export function startNegativeEvents(){ clearTimers(); removeEffect(); lastEffect=''; if(activeForHost()) scheduleNext(16000+Math.floor(Math.random()*9000)); }
export function stopNegativeEvents(){ clearTimers(); removeEffect(); }
export function transformDirection(d){ const e=state.negativeEvent; return e?.id==='invert' ? {x:-d.x,y:-d.y} : d; }
export function canTurn(){ return state.negativeEvent?.id!=='freeze'; }
export function shouldSkipMovement(tickCount){ return state.negativeEvent?.id==='slow' && tickCount%2===0; }
