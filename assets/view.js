const KEY='skc-view-mode';
const VALID=new Set(['desktop','mobile']);
let mode='desktop';

function preferred(){
  const saved=localStorage.getItem(KEY);
  if(VALID.has(saved))return saved;
  return matchMedia('(max-width: 720px)').matches?'mobile':'desktop';
}

export function getViewMode(){return mode}
export const isMobileView=()=>mode==='mobile';
export const isDesktopView=()=>mode==='desktop';

export function applyViewMode(next,{persist=true}={}){
  mode=VALID.has(next)?next:preferred();
  document.documentElement.dataset.viewMode=mode;
  document.body?.classList.toggle('mobile-app-mode',mode==='mobile');
  document.body?.classList.toggle('desktop-app-mode',mode==='desktop');
  if(persist)localStorage.setItem(KEY,mode);
  window.dispatchEvent(new CustomEvent('skc:viewchange',{detail:{mode}}));
  return mode;
}

export function initializeViewMode(){return applyViewMode(preferred(),{persist:false})}
export function toggleViewMode(){return applyViewMode(mode==='mobile'?'desktop':'mobile')}
