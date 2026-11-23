// Mulberry32 PRNG and 2D spatial hash.
export function createRng(seed=1){let s=seed>>>0||1;return()=>{s=s+0x6d2b79f5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const randRange=(r,a,b)=>a+(b-a)*r(),randInt=(r,a,b)=>Math.floor(randRange(r,a,b+1)),pick=(r,l)=>l[Math.floor(r()*l.length)];
export function hash2D(x,z,s=17){const h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(s|0,1442695041);return((Math.imul(h^h>>>13,1274126177)^h>>>16)>>>0)/4294967296;}
