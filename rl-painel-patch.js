/* RL Transportes — "Painel Completo" dentro do Portal (2026-10-13).
   O botão abria http://100.125.195.119:3456 (PC D90 pelo Tailscale, sem https): no celular ficava tela preta
   e com o PC desligado não abria em lugar nenhum. Agora abre rl-painel.html por cima do Portal,
   lendo o espelho rl_* do Supabase com a sessão do Portal. Fotos e /api do bot continuam no D90.
*/
(function(){
  if(window.__rlPainelCompleto)return;window.__rlPainelCompleto=true;
  var V='20261013-1';
  var URL_PAINEL=(function(){try{return new URL('rl-painel.html?v='+V,document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/rl-painel.html?v='+V}})();
  // Só a página inicial do bot (painel). /fotos/ e /api/ seguem para o D90 normalmente.
  var RE_PAINEL=/^https?:\/\/100\.125\.195\.119:3456\/?(?:[?#].*)?$/;

  function abrirPainel(d){
    var ov=d.getElementById('rl-painel-completo');
    if(!ov){
      ov=d.createElement('div');ov.id='rl-painel-completo';
      ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">'
        +'<button type="button" data-rl-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px;font:inherit;cursor:pointer">\u2190 Voltar ao Portal</button></div>'
        +'<iframe title="RL Transportes - Painel Completo" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-rl-fechar]').onclick=function(){ov.style.display='none';try{d.documentElement.style.overflow=''}catch(e){}};
      d.body.appendChild(ov);
    }
    var ifr=ov.querySelector('iframe');
    if(ifr.getAttribute('src')!==URL_PAINEL)ifr.setAttribute('src',URL_PAINEL);
    else try{ifr.contentWindow.document.getElementById('btnAtualizar').click()}catch(e){}
    ov.style.display='flex';
    try{d.documentElement.style.overflow='hidden'}catch(e){}
  }

  function docs(w,lista,prof){if(prof>4)return lista;try{if(w.document)lista.push(w)}catch(e){return lista}for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1)}catch(e){}}return lista}

  // Links <a href> e botões que naveguem direto (location.href) para o painel do D90.
  function aoClicar(ev){
    try{
      var el=ev.target&&ev.target.closest&&ev.target.closest('a[href],[onclick]');if(!el)return;
      var alvo=el.getAttribute('href')||'',oc=el.getAttribute('onclick')||'';
      var m=/https?:\/\/100\.125\.195\.119:3456[^'"\s)]*/.exec(oc);
      if(RE_PAINEL.test(alvo)||(m&&RE_PAINEL.test(m[0]))){ev.preventDefault();ev.stopImmediatePropagation();abrirPainel(document)}
    }catch(e){}
  }

  function instalar(w){
    // Re-adicionar a mesma função não duplica; refaz se o documento foi reaberto (document.open apaga os listeners).
    w.document.addEventListener('click',aoClicar,true);
    if(w.__rlPainelOpen)return;
    var original=w.open;
    w.open=function(url){
      try{if(RE_PAINEL.test(String(url||'').trim())){abrirPainel(document);return null}}catch(e){console.warn('[Portal] RL painel:',e)}
      return original.apply(w,arguments);
    };
    w.__rlPainelOpen=true;
  }

  function varrer(){docs(window,[],0).forEach(function(w){try{instalar(w)}catch(e){}})}
  setInterval(varrer,1500);varrer();
})();
