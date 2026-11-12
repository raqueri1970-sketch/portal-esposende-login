/* Faltas e Atrasos · módulo do Portal Executivo Esposende */
(function(){
  if(window.__faltasAtrasosPortal)return;window.__faltasAtrasosPortal=true;
  var V='20261112-1';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var URL_MOD=BASE+'faltas-atrasos/index.html?v='+V;
  function abrir(d){
    var ov=d.getElementById('faltas-atrasos-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='faltas-atrasos-portal';ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px Arial"><button type="button" data-fa-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px;cursor:pointer">← Voltar ao Portal</button><span>◷ Faltas e Atrasos</span></div><iframe title="Faltas e Atrasos" allow="downloads" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-fa-fechar]').onclick=function(){ov.style.display='none'};d.body.appendChild(ov);
    }
    var f=ov.querySelector('iframe');f.src=URL_MOD;ov.style.display='flex';
  }
  function menu(d){
    var sb=d.getElementById('sb');if(!sb||sb.querySelector('[data-fa-menu]'))return;
    var g=d.createElement('div');g.className='sg';
    g.innerHTML='<div class="sgl">RH / Folha</div><button class="ni" data-fa-menu type="button"><span class="nii">◷</span><span class="nil">Faltas e Atrasos</span></button>';
    sb.appendChild(g);g.querySelector('[data-fa-menu]').onclick=function(){abrir(d)};
  }
  function docs(w,a,p){if(p>5)return a;try{if(w.document)a.push(w.document)}catch(e){return a}var fs=[];try{fs=w.document.querySelectorAll('iframe')}catch(e){}for(var i=0;i<fs.length;i++){try{if(fs[i].contentWindow&&fs[i].contentDocument)docs(fs[i].contentWindow,a,p+1)}catch(e){}}return a}
  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d)}catch(e){console.warn('[Portal] Faltas e Atrasos:',e)}})}
  varrer();var obs=new MutationObserver(function(){varrer()});try{obs.observe(document.documentElement,{childList:true,subtree:true})}catch(e){}setInterval(varrer,1800);
})();
