/* Obras & Reformas — Pagamentos dentro do módulo do Portal (2026-10-09).
   Carregado no shell do Portal. Procura o módulo "Obras & Reformas" (iframe da mesma origem) e acrescenta
   ao menu lateral dele as telas de pagamento:
   - Pagamentos (Presidente): total por prestador, escolher o que pagar, pagamento parcial, "Já paguei".
   - Contas a pagar: visão geral, Agente Auditor, fluxo de caixa por prestador, saúde do capturador.
   - Financeiro: pagamentos aprovados, PIX, comprovantes, adiantamentos.
   - Relatórios e PDF.
   As telas ficam em /portal-esposende-login/obras/ (mesma origem do Portal) e usam a MESMA sessão do Portal.
   Nada do módulo original é apagado: as abas antigas continuam funcionando como antes. */
(function(){
  if(window.__obrasPagamentos)return;window.__obrasPagamentos=true;
  var BASE=(function(){try{return new URL('obras/',document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/obras/'}})();
  var V='20261009-1';
  var ABAS=[
    {id:'pag',icone:'💳',rotulo:'Pagamentos (Presidente)',titulo:'Pagamentos · Presidente',url:'obras-presidente/'},
    {id:'cap',icone:'📋',rotulo:'Contas a pagar',titulo:'Contas a pagar · visão geral',url:'obras-contas-pagar/'},
    {id:'fin',icone:'🏦',rotulo:'Financeiro',titulo:'Financeiro',url:'obras-financeiro/'},
    {id:'rel',icone:'📑',rotulo:'Relatórios e PDF',titulo:'Relatórios e PDF',url:'obras-relatorios/'}
  ];

  function docs(w,lista,prof){
    if(prof>4)return lista;
    try{var d=w.document;if(d)lista.push(d);}catch(e){return lista;}
    for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1);}catch(e){}}
    return lista;
  }
  function ehModuloObras(d){
    var nav=d.getElementById('nav'),side=d.getElementById('side');
    return !!(nav&&side&&d.getElementById('t-geral')&&/Obras\s*&\s*Reformas/.test((side.querySelector('.brand')||side).textContent||''));
  }

  function instalar(d){
    if(d.__obrasPagamentos)return;d.__obrasPagamentos=true;
    var nav=d.getElementById('nav'),main=d.getElementById('main'),ttl=d.getElementById('ttl');
    var tools=main&&main.querySelector('.tools'),sub=main&&main.querySelector('.top .sub');
    var css=d.createElement('style');
    css.textContent='#nav [data-obras-pag]{text-decoration:none;cursor:pointer}#nav .tab-sep{margin:10px 6px 6px;padding-top:10px;border-top:1px solid rgba(148,163,184,.18);font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.65}'+
      '#t-obras-pag{margin-top:6px}#t-obras-pag iframe{width:100%;height:calc(100vh - 150px);min-height:620px;border:0;border-radius:14px;background:#070b16;display:block}';
    d.head.appendChild(css);
    var sep=d.createElement('div');sep.className='tab-sep';sep.textContent='Pagamentos';nav.appendChild(sep);
    var sec=d.createElement('section');sec.id='t-obras-pag';sec.hidden=true;
    sec.innerHTML='<iframe title="Obras & Reformas - pagamentos" allow="clipboard-write"></iframe>';
    main.appendChild(sec);
    var ifr=sec.querySelector('iframe'),atual=null,tituloOriginal=null;

    function abrir(aba,link){
      if(tituloOriginal===null&&ttl)tituloOriginal=ttl.textContent;
      [].forEach.call(main.querySelectorAll(':scope > section'),function(s){if(s!==sec)s.hidden=true});
      [].forEach.call(nav.querySelectorAll('.tab'),function(t){t.classList.remove('on')});
      link.classList.add('on');sec.hidden=false;
      if(tools)tools.style.display='none';if(sub)sub.style.display='none';
      if(ttl)ttl.textContent=aba.titulo;
      if(atual!==aba.id){ifr.src=BASE+aba.url+'?v='+V;atual=aba.id}
    }
    function fechar(){
      if(sec.hidden)return;
      sec.hidden=true;
      [].forEach.call(nav.querySelectorAll('[data-obras-pag]'),function(t){t.classList.remove('on')});
      if(tools)tools.style.display='';if(sub)sub.style.display='';
    }
    ABAS.forEach(function(aba){
      var a=d.createElement('a');a.className='tab';a.href='#';a.setAttribute('data-obras-pag',aba.id);
      a.textContent=aba.icone+' '+aba.rotulo;
      a.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();abrir(aba,a)},true);
      nav.appendChild(a);
    });
    // Abas originais do módulo: escondem as telas de pagamento e devolvem o título/botões do módulo.
    nav.addEventListener('click',function(ev){
      var t=ev.target.closest&&ev.target.closest('.tab');
      if(t&&!t.hasAttribute('data-obras-pag'))fechar();
    },true);
  }

  function varrer(){
    docs(window,[],0).forEach(function(d){try{if(!d.__obrasPagamentos&&ehModuloObras(d))instalar(d)}catch(e){console.warn('[Portal] Obras pagamentos:',e)}});
  }
  setInterval(varrer,1500);
  if(document.readyState!=='loading')varrer();else document.addEventListener('DOMContentLoaded',varrer);
})();
