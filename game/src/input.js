// Keyboard, mouse look/aim, scroll wheel weapon select & action bindings.
export function createInputController(cv,cb){
const keys={};let mL=false,mR=false,drg=false,lx=0,ly=0,dx=0,dy=0,jmp=false;
const act={
Space:()=>{jmp=true;},KeyF:()=>cb.onInteract?.(),KeyR:()=>cb.onCycleRadio?.(),
KeyM:()=>cb.onToggleAtlas?.(),Escape:()=>cb.onToggleAtlas?.(),F5:()=>cb.onQuickSave?.(),F9:()=>cb.onQuickLoad?.(),
KeyQ:()=>cb.onCrewFavour?.('plate_swap'),KeyZ:()=>cb.onCrewFavour?.('plate_swap'),
KeyE:()=>cb.onCrewFavour?.('road_repair'),KeyX:()=>cb.onCrewFavour?.('road_repair'),KeyC:()=>cb.onCrewFavour?.('dispatch_jam'),
};
addEventListener('keydown',e=>{
if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F5','F9'].includes(e.code))e.preventDefault();
const first=!keys[e.code];keys[e.code]=true;if(!first)return;
if(act[e.code])act[e.code]();
else if(e.code.startsWith('Digit')){const n=Number(e.code.slice(5));if(n>=1&&n<=8)cb.onSelectWeapon?.(n-1);}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('mousedown',e=>{if(e.target!==cv)return;cb.onUserGesture?.();if(e.button===0)mL=true;if(e.button===2)mR=drg=true;lx=e.clientX;ly=e.clientY;});
addEventListener('mouseup',e=>{if(e.button===0)mL=false;if(e.button===2)mR=drg=false;});
addEventListener('mousemove',e=>{if(document.pointerLockElement===cv){dx+=e.movementX;dy+=e.movementY;}else if(drg||mL){dx+=e.clientX-lx;dy+=e.clientY-ly;}lx=e.clientX;ly=e.clientY;});
addEventListener('wheel',e=>{if(e.target===cv)cb.onWheelWeapon?.(e.deltaY>0?1:-1);},{passive:true});
addEventListener('contextmenu',e=>{if(e.target===cv)e.preventDefault();});
return{
keys,get mouseDown(){return mL;},get rightMouseDown(){return mR;},
consumeMouseDelta(){const o={dx,dy};dx=dy=0;return o;},consumeJump(){const q=jmp;jmp=false;return q;},
clearAll(){mL=mR=drg=false;for(const k of Object.keys(keys))keys[k]=false;},
};
}
