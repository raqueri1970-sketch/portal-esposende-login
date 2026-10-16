/* Auditoria Financeira — Contas a Pagar do Sallamo dentro do Portal (2026-10-16).
   Põe o grupo "Financeiro → Auditoria Financeira" no menu lateral do Portal e abre financeiro/ por cima do Portal,
   com a mesma sessão (mesmo endereço github.io). A tela vem do repositório sistema-de-auditoria (pasta financeiro/).
*/
(function(){
  if(window.__finAuditoria)return;window.__finAuditoria=true;
  var V='20261016-1';
  var URL_FIN=(function(){try{return new URL('financeiro/?v='+V,document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/financeiro/?v='+V}})();

  function abrir(d){
    var ov=d.getElementById('fin-auditoria');
    if(!ov){
      ov=d.createElement('div');ov.id='fin-auditoria';
      ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">'
        +'<button type="button" data-fin-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px;font:inherit;cursor:pointer">← Voltar ao Portal</button>'
        +'<span>💰 Auditoria Financeira · Contas a Pagar</span></div>'
        +'<iframe title="Auditoria Financeira" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-fin-fechar]').onclick=function(){ov.style.display='none';try{d.documentElement.style.overflow=''}catch(e){}};
      d.body.appendChild(ov);
    }
    var ifr=ov.querySelector('iframe');
    if(!ifr.getAttribute('src'))ifr.setAttribute('src',URL_FIN);
    ov.style.display='flex';
    try{d.documentElement.style.overflow='hidden'}catch(e){}
  }

  function docs(w,lista,prof){if(prof>4)return lista;try{if(w.document)lista.push(w.document)}catch(e){return lista}for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1)}catch(e){}}return lista}

  // Menu lateral do Portal (#sb, grupos .sg com botões .ni)
  function instalar(d){
    var sb=d.getElementById('sb');
    if(!sb||sb.querySelector('[data-fin-auditoria]'))return;
    var grupo=d.createElement('div');grupo.className='sg';
    grupo.innerHTML='<div class="sgl">Financeiro</div><button class="ni" data-fin-auditoria type="button"><span class="nii">💰</span><span class="nil">Auditoria Financeira</span></button>';
    var div=d.createElement('div');div.className='ndv';
    // antes do grupo "Campanhas"; se não achar, antes do rodapé do menu; senão no fim
    var alvo=null;[].forEach.call(sb.querySelectorAll('.sg'),function(g){var l=g.querySelector('.sgl');if(!alvo&&l&&/campanhas/i.test(l.textContent))alvo=g});
    if(!alvo)alvo=sb.querySelector('.sbft');
    if(alvo){sb.insertBefore(grupo,alvo);sb.insertBefore(div,alvo)}else{sb.appendChild(div);sb.appendChild(grupo)}
    grupo.querySelector('button').addEventListener('click',function(e){e.preventDefault();try{if(d.defaultView.closeSB)d.defaultView.closeSB()}catch(x){}abrir(d)});
  }

  function varrer(){docs(window,[],0).forEach(function(d){try{instalar(d)}catch(e){}})}
  varrer();
  var n=0,t=setInterval(function(){varrer();if(++n>40)clearInterval(t)},1500);
})();
