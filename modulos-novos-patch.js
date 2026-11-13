/* Módulos novos do Portal (13/11/2026): cards com capa na Visão Geral + grupo "Novos Módulos" no menu lateral.
   Faltas e Atrasos · Auditoria Financeira · Segurança e CFTV · Patrimônio de Segurança · Consumo Loja.
   Substitui financeiro-patch.js; de faltas-atrasos-patch.js só usa a versão (?v=) e esconde o item solto do menu.
   "← Voltar ao Portal" único e confiável: botão, tecla Esc (também dentro do módulo) e o voltar do celular/navegador.
   Ao voltar, o módulo é descarregado (about:blank), para não deixar o Portal pesado/travado com a tela escondida rodando. */
(function(){
  if(window.__modulosNovos)return;window.__modulosNovos='20261113-5';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var MODS=[
    {id:'cftv',icone:'📹',titulo:'Segurança e CFTV',sub:'Câmeras, gravadores e alarmes',dsc:'Patrimônio (investido em 2026 + parque anterior), investimentos, manutenção, cobertura por área e plano pelo orçamento.',capa:'seguranca-cftv-capa.jpg',url:'seguranca-cftv/?v=20261113-5',acesso:'presidência, diretoria e segurança'},
    {id:'faltas',icone:'⏰',titulo:'Faltas e Atrasos',sub:'Ponto × folha × banco de horas',dsc:'Quem deve à empresa e o que a empresa deve: faltas sem desconto, atrasos recorrentes e ranking por regional.',capa:'faltas-atrasos-capa.jpg',url:'faltas-atrasos/index.html',versaoDe:'faltas-atrasos-patch.js',acesso:'RH, controladoria e diretoria'},
    {id:'fin',icone:'💰',titulo:'Auditoria Financeira',sub:'Contas a pagar do Sallamo',dsc:'Cruzamentos de possíveis irregularidades nos títulos: duplicidade, juros, fornecedor novo e vencimentos fora do padrão.',capa:'auditoria-financeira-capa.jpg',url:'financeiro/?v=20261021-1',acesso:'administrador, controladoria e diretoria'},
    {id:'consumo',icone:'🏬',titulo:'Consumo Loja',sub:'Almoxarifado × venda por loja',dsc:'Lojas fora do padrão de consumo, previsão e sugestão de compra do almoxarifado.',capa:'consumo-loja-capa.jpg',abrir:function(w){if(w.abrirConsumoLoja){w.abrirConsumoLoja();return true}return false},acesso:'usuários do Almoxarifado'}
  ];
  function norm(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toUpperCase()}
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document)}catch(e){return a}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1)}catch(e){}return a}

  // ---------- tela por cima do Portal, com Voltar que sempre funciona ----------
  // troca a página do iframe SEM criar entrada no histórico (senão o voltar do celular navega o iframe em vez de fechar)
  function irPara(f,u){try{f.contentWindow.location.replace(u)}catch(x){f.src=u}}
  // descarrega o módulo depois que o histórico assentar (senão a volta do histórico restaura o módulo escondido)
  function descarregar(d){var ov=d.getElementById('mn-portal');if(!ov)return;setTimeout(function(){if(ov.style.display==='none')irPara(ov.querySelector('iframe'),'about:blank')},120)}
  function fechar(d,deHistorico){
    var ov=d.getElementById('mn-portal');if(!ov||ov.style.display==='none')return;
    ov.style.display='none';
    try{d.documentElement.style.overflow='';d.body.style.overflow=''}catch(e){}
    var w=d.defaultView,voltou=false;
    if(!deHistorico){try{if(w.history.state&&w.history.state.mnPortal){w.history.back();voltou=true}}catch(e){}}
    if(!voltou)descarregar(d);
  }
  function abrir(d,m){
    var w=d.defaultView;
    try{if(w.closeSB)w.closeSB()}catch(e){}
    if(m.abrir){if(m.abrir(w))return;alert(m.titulo+' ainda está carregando. Tente de novo em alguns segundos.');return}
    var ov=d.getElementById('mn-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='mn-portal';
      ov.style.cssText='position:fixed;inset:0;z-index:2147483300;background:#070b16;display:none;flex-direction:column';
      ov.innerHTML='<div style="flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;position:relative;z-index:2">'
        +'<button type="button" data-mn-voltar style="background:#173a75;border:1px solid #2f5aa0;color:#fff;border-radius:10px;padding:10px 16px;min-height:42px;white-space:nowrap;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent">← Voltar ao Portal</button>'
        +'<span data-mn-titulo style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span><span style="margin-left:auto;color:#7d93ac;font-size:11px;font-weight:500" data-mn-dica>Esc também volta</span></div>'
        +'<iframe title="Módulo" allow="clipboard-write; downloads" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      if(w.innerWidth<640)ov.querySelector('[data-mn-dica]').style.display='none';
      var b=ov.querySelector('[data-mn-voltar]');
      var ir=function(e){e.preventDefault();e.stopPropagation();fechar(d)};
      b.addEventListener('click',ir);b.addEventListener('touchend',ir,{passive:false});
      d.addEventListener('keydown',function(e){if(e.key==='Escape')fechar(d)});
      ov.querySelector('iframe').addEventListener('load',function(){
        try{this.contentWindow.document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!(e.target&&e.target.closest&&e.target.closest('.modal:not(.hidden)')))fechar(d)})}catch(e){}
      });
      w.addEventListener('popstate',function(){var o=d.getElementById('mn-portal');if(!o)return;if(o.style.display!=='none')fechar(d,true);else descarregar(d)});
      d.body.appendChild(ov);
    }
    ov.querySelector('[data-mn-titulo]').textContent=m.icone+' '+m.titulo;
    var u=BASE+m.url;
    if(m.versaoDe){var sc=[].filter.call(d.querySelectorAll('script[src]'),function(x){return x.src.indexOf(m.versaoDe)>=0})[0];var v=sc&&(sc.src.match(/[?&]v=([^&]+)/)||[])[1];u+='?v='+(v||Date.now())}
    irPara(ov.querySelector('iframe'),u);
    ov.style.display='flex';
    try{d.documentElement.style.overflow='hidden'}catch(e){}
    try{if(!(w.history.state&&w.history.state.mnPortal))w.history.pushState({mnPortal:m.id},'')}catch(e){}
  }
  window.__abrirModuloNovo=function(id){var m=MODS.filter(function(x){return x.id===id})[0];if(m)abrir(document,m)};

  // ---------- menu lateral: grupo "Novos Módulos" logo depois da Visão Geral ----------
  function menu(d){
    var sb=d.getElementById('sb');if(!sb)return;
    // grupos antigos que duplicariam os itens (Consumo Loja criava "Almoxarifado" no fim do menu)
    [].forEach.call(sb.querySelectorAll('[data-acl-group],[data-fa-menu],[data-fin-auditoria]'),function(el){var g=el.closest('.sg')||el;if(!g.hasAttribute('data-mn-grupo'))g.style.display='none'});
    if(sb.querySelector('[data-mn-grupo]'))return;
    var g=d.createElement('div');g.className='sg';g.setAttribute('data-mn-grupo','1');
    g.innerHTML='<div class="sgl">Novos Módulos</div>'+MODS.map(function(m){return '<button class="ni" type="button" data-mn-menu="'+m.id+'" title="'+m.sub+'"><span class="nii">'+m.icone+'</span><span class="nil">'+m.titulo+'</span></button>'}).join('');
    [].forEach.call(g.querySelectorAll('[data-mn-menu]'),function(b){b.addEventListener('click',function(e){e.preventDefault();abrir(d,MODS.filter(function(m){return m.id===b.getAttribute('data-mn-menu')})[0])})});
    var div=d.createElement('div');div.className='ndv';
    var vg=null;[].forEach.call(sb.querySelectorAll('.sg'),function(x){var l=x.querySelector('.sgl');if(!vg&&l&&norm(l.textContent)==='VISAO GERAL')vg=x});
    var depois=vg?vg.nextSibling:sb.firstChild;
    sb.insertBefore(div,depois);sb.insertBefore(g,div);
  }

  // ---------- cards com capa na Visão Geral (mesmo modelo dos cards existentes) ----------
  function acharModelo(d){
    var folhas=[].filter.call(d.querySelectorAll('.octtl,div,span'),function(el){return el.children.length===0&&/^Descontos de Funcionários$/i.test((el.textContent||'').trim())&&!el.closest('[data-mn-card],[data-cred-card],[data-adesp-card]')});
    for(var i=0;i<folhas.length;i++){var c=folhas[i].closest('.oc');if(c)return c;
      var p=folhas[i];for(var n=0;n<9&&p&&p!==d.body;n++,p=p.parentElement){var r=p.getBoundingClientRect();if((r.width>180&&r.height>120)||/card|mod|tile/i.test(String(p.className||''))||p.onclick)return p}}
    return null;
  }
  function capaCSS(d){
    if(d.getElementById('mn-capa-css'))return;var st=d.createElement('style');st.id='mn-capa-css';
    st.textContent=MODS.map(function(m){var u=BASE+m.capa+'?v=20261113';return '[data-mn-card="'+m.id+'"] [data-mn-pseudo="before"]::before,[data-mn-card="'+m.id+'"] [data-mn-pseudo="after"]::after{background-image:url("'+u+'")!important;background-size:cover!important;background-position:center!important}'}).join('\n');
    d.head.appendChild(st);
  }
  function trocarCapa(card,m){
    var d=card.ownerDocument,w=d.defaultView,u=BASE+m.capa+'?v=20261113',ok=function(v){return String(v||'').indexOf(m.capa)>=0};
    [card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(el){
      if(el.tagName==='SOURCE'){if(!ok(el.getAttribute('srcset')))el.setAttribute('srcset',u);return}
      if(el.tagName==='IMG'){if(!ok(el.getAttribute('src'))){['srcset','sizes','loading','data-src','data-srcset'].forEach(function(a){el.removeAttribute(a)});el.src=u}el.alt=m.titulo;el.style.objectFit='cover';return}
      var bg='';try{bg=w.getComputedStyle(el).backgroundImage||''}catch(e){}
      if(bg.indexOf('url(')>=0&&!ok(bg)){el.style.setProperty('background-image',bg.replace(/url\([^)]*\)/,'url("'+u+'")'),'important');el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
      ['before','after'].forEach(function(ps){var b='';try{b=w.getComputedStyle(el,'::'+ps).backgroundImage||''}catch(e){}if(b.indexOf('url(')>=0&&!ok(b))el.setAttribute('data-mn-pseudo',ps)});
    });
    // card do Portal sem foto (só ícone): põe a capa no topo
    if(!card.querySelector('[data-mn-thumb]')&&!card.querySelector('img')&&!/url\(/.test(w.getComputedStyle(card).backgroundImage||'')&&!card.querySelector('[data-mn-pseudo]')){
      var t=d.createElement('div');t.setAttribute('data-mn-thumb','1');
      t.style.cssText='margin:-1px -1px 10px;aspect-ratio:16/9;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0;background:url("'+u+'") center/cover no-repeat';
      card.insertBefore(t,card.firstChild);
    }
  }
  function textos(card,m){
    var d=card.ownerDocument;
    var tt=card.querySelector('.octtl');if(tt)tt.textContent=m.titulo;
    [].forEach.call(card.querySelectorAll('*'),function(el){if(el.children.length===0&&/Descontos de Funcionários/i.test(el.textContent||''))el.textContent=m.titulo});
    var ic=card.querySelector('.ocic');if(ic)ic.textContent=m.icone;
    var sub=card.querySelector('.ocsml');if(sub)sub.textContent=m.sub;
    var dsc=card.querySelector('.ocdsc');if(dsc)dsc.textContent=m.dsc;
    var ft=card.querySelector('.ocft')||card.lastElementChild;if(!ft)return;
    var st=ft.querySelector('.ost')||[].filter.call(ft.querySelectorAll('*'),function(el){return el.children.length===0&&(el.textContent||'').trim()})[0];
    if(st){st.textContent='DISPONÍVEL';st.className=(st.className||'').replace(/\bo(i|ok|er|wa)\b/g,'')+' ook'}
    var l=ft.querySelector('[data-mn-linha]');
    if(!l){l=d.createElement('div');l.setAttribute('data-mn-linha','1');l.style.cssText='font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.4;flex-basis:100%';ft.appendChild(l);ft.style.flexWrap='wrap'}
    l.textContent='● acesso: '+m.acesso;
  }
  function limpar(card){[card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(x){
    if(x!==card)x.removeAttribute('id');[].slice.call(x.attributes).forEach(function(a){if(a.name==='onclick'||a.name==='href'||(/^data-/.test(a.name)&&!/^data-mn/.test(a.name)))x.removeAttribute(a.name)})});card.removeAttribute('id')}
  function cards(d){
    if(!d.getElementById('sb'))return;
    var modelo=acharModelo(d);if(!modelo)return;
    capaCSS(d);
    var ancora=d.querySelector('[data-adesp-card]')||modelo;
    MODS.forEach(function(m){
      var c=d.querySelector('[data-mn-card="'+m.id+'"]');
      if(c){trocarCapa(c,m);ancora=c;return}
      c=modelo.cloneNode(true);limpar(c);c.setAttribute('data-mn-card',m.id);c.style.cursor='pointer';
      c.setAttribute('title',m.titulo);c.setAttribute('aria-label',m.titulo);c.setAttribute('role','button');c.tabIndex=0;
      textos(c,m);
      c.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();abrir(d,m)});
      c.addEventListener('keydown',function(ev){if(ev.key==='Enter')abrir(d,m)});
      if(ancora.parentNode!==modelo.parentNode)ancora=modelo;
      ancora.parentNode.insertBefore(c,ancora.nextSibling);ancora=c;
      trocarCapa(c,m);
    });
  }

  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d);cards(d)}catch(e){console.warn('[Portal] Módulos novos:',e)}})}
  varrer();setInterval(varrer,1500);
})();
