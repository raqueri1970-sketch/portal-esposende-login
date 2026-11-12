/* Auditoria de Despesas e OS dentro do Portal: card na Visão Geral (ao lado de Obras & Reformas) e item no menu "Auditoria".
   A tela fica em auditoria-despesas/ (mesma sessão do Portal; dados no Supabase com acesso de administrador, controladoria e diretoria). */
(function(){
  if(window.__adespPortal)return;window.__adespPortal=true;
  var V='20261109-1';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var URL_MOD=BASE+'auditoria-despesas/?v='+V;
  var MOD={icone:'🔎',menu:'Auditoria de Despesas e OS',titulo:'Auditoria de Despesas e OS',capa:BASE+'auditoria-despesas-capa.jpg?v='+V};
  var CAPA_ARQ='auditoria-despesas-capa.jpg';

  // aba: 'os' abre direto na carteira de Ordens de Serviço
  function abrir(d,aba){
    var ov=d.getElementById('adesp-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='adesp-portal';ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px Arial"><button type="button" data-adesp-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px">← Voltar ao Portal</button><span data-adesp-titulo></span></div><iframe title="Auditoria de Despesas e OS" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-adesp-fechar]').onclick=function(){ov.style.display='none'};d.body.appendChild(ov);
    }
    ov.querySelector('[data-adesp-titulo]').textContent=MOD.icone+' '+MOD.titulo;
    ov.querySelector('iframe').src=URL_MOD+(aba==='os'?'#os':'');ov.style.display='flex';
  }
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document)}catch(e){return a}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1)}catch(e){}return a}
  function norm(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/&/g,' E ').replace(/\s+/g,' ').trim().toUpperCase()}

  // menu: entra no grupo "Auditoria" do menu lateral (ou cria o grupo, se o Portal mudar)
  function menu(d){
    var sb=d.getElementById('sb');if(!sb||sb.querySelector('[data-adesp-menu]'))return;
    var btn=d.createElement('button');btn.className='ni';btn.type='button';btn.setAttribute('data-adesp-menu','1');
    btn.innerHTML='<span class="nii">'+MOD.icone+'</span><span class="nil">'+MOD.menu+'</span>';
    btn.onclick=function(){abrir(d)};
    var grupo=null;[].forEach.call(sb.querySelectorAll('.sgl'),function(l){if(!grupo&&norm(l.textContent)==='AUDITORIA')grupo=l.parentElement});
    if(grupo){var itens=grupo.querySelectorAll('.ni');var ult=itens[itens.length-1];if(ult&&ult.parentNode)ult.parentNode.insertBefore(btn,ult.nextSibling);else grupo.appendChild(btn);}
    else{var g=d.createElement('div');g.className='sg';g.innerHTML='<div class="sgl">Auditoria de Despesas</div>';g.appendChild(btn);sb.appendChild(g);}
  }

  // card: clona o card "Descontos de Funcionários" (mesmo modelo do card do Crediário) e troca título, capa e clique
  function limparIds(el){if(el.removeAttribute)el.removeAttribute('id');[].forEach.call(el.querySelectorAll('[id]'),function(x){x.removeAttribute('id')});}
  function acharCardModelo(d){
    var folhas=[].filter.call(d.querySelectorAll('*'),function(el){return el.children.length===0&&/Descontos de Funcionários/i.test((el.textContent||'').trim())&&!el.closest('[data-cred-card],[data-adesp-card]')});
    for(var i=0;i<folhas.length;i++){
      var p=folhas[i];
      for(var n=0;n<9&&p&&p!==d.body;n++,p=p.parentElement){
        if(!p.querySelector)continue;
        var r=p.getBoundingClientRect?p.getBoundingClientRect():{width:0,height:0};
        var cls=String(p.className||'');
        if((r.width>180&&r.height>120)||/card|mod|tile/i.test(cls)||p.onclick||p.tagName==='A')return {card:p,label:folhas[i]};
      }
    }
    return null;
  }
  // o card de Obras & Reformas, para o novo card ficar logo depois dele
  function cardObras(d){
    var cs=[].filter.call(d.querySelectorAll('.oc,[data-capa-obras]'),function(c){var t=norm(c.textContent);return t.indexOf('OBRAS E REFORMAS')>=0&&!c.closest('[data-adesp-card]')});
    return cs[0]||null;
  }
  function trocarCapa(card){
    var d=card.ownerDocument,w=d.defaultView,ok=function(v){return String(v||'').indexOf(CAPA_ARQ)>=0};
    if(!d.getElementById('adesp-capa-css')){var st=d.createElement('style');st.id='adesp-capa-css';
      st.textContent='[data-adesp-card] [data-adesp-pseudo="before"]::before,[data-adesp-card] [data-adesp-pseudo="after"]::after{background-image:url("'+MOD.capa+'")!important;background-size:cover!important;background-position:center!important}';
      d.head.appendChild(st);}
    [card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(el){
      if(el.tagName==='SOURCE'){if(!ok(el.getAttribute('srcset')))el.setAttribute('srcset',MOD.capa);return}
      if(el.tagName==='IMG'){if(!ok(el.getAttribute('src'))||el.hasAttribute('srcset')){el.removeAttribute('srcset');el.removeAttribute('sizes');el.removeAttribute('loading');el.removeAttribute('data-src');el.removeAttribute('data-srcset');el.src=MOD.capa}
        el.alt=MOD.titulo;el.style.objectFit='cover';el.style.objectPosition='center';return}
      var bg='';try{bg=w.getComputedStyle(el).backgroundImage||''}catch(e){}
      if(bg&&bg.indexOf('url(')>=0&&!ok(bg)){el.style.setProperty('background-image',bg.replace(/url\([^)]*\)/,'url("'+MOD.capa+'")'),'important');el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
      ['before','after'].forEach(function(ps){var b='';try{b=w.getComputedStyle(el,'::'+ps).backgroundImage||''}catch(e){}
        if(b&&b.indexOf('url(')>=0&&!ok(b))el.setAttribute('data-adesp-pseudo',ps)});
    });
  }
  function limparMarcas(el){[el].concat([].slice.call(el.querySelectorAll('*'))).forEach(function(x){
    [].slice.call(x.attributes).forEach(function(a){if(a.name==='onclick'||(/^data-/.test(a.name)&&!/^data-adesp/.test(a.name)))x.removeAttribute(a.name)})})}
  function textos(card){
    var d=card.ownerDocument;
    [].forEach.call(card.querySelectorAll('*'),function(el){if(el.children.length===0&&/Descontos de Funcionários|Desconto em Folha · Crediário|Desconto\/Crediário/i.test(el.textContent||''))el.textContent=MOD.titulo;});
    var sub=null;[].forEach.call(card.querySelectorAll('.ocsml'),function(s){sub=s});if(sub)sub.textContent='Reembolsos × ordens de serviço';
    var dsc=card.querySelector('.ocdsc');if(dsc)dsc.textContent='Cada comprovante lido e cruzado com as OS do Globalthings: retenções, duplicidades, combustível × agenda, custo previsto de cada OS aberta, prestadores e equipe.';
    var ft=card.querySelector('.ocft')||card.lastElementChild;
    if(ft){
      var folhas=[].filter.call(ft.querySelectorAll('*'),function(el){return el.children.length===0&&(el.textContent||'').trim()});
      if(folhas[0])folhas[0].textContent='DISPONÍVEL';
      var linha=ft.querySelector('[data-adesp-linha]');
      if(!linha){linha=d.createElement('div');linha.setAttribute('data-adesp-linha','1');linha.style.cssText='font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.4';
        var alvo=folhas[0]&&folhas[0].parentElement&&folhas[0].parentElement!==ft?folhas[0].parentElement:folhas[0];if(alvo&&alvo.parentNode)alvo.parentNode.insertBefore(linha,alvo.nextSibling);else ft.appendChild(linha);}
      linha.textContent='● acesso: administrador, controladoria e diretoria';
      [].forEach.call(ft.querySelectorAll('*'),function(el){if(el!==linha&&el.children.length===0&&el!==folhas[0]&&/\d{2}\/\d{2}\/\d{4}|Atualizado|há \d+ dias/i.test(el.textContent||''))el.textContent='';});
    }
    card.setAttribute('title',MOD.titulo);card.setAttribute('aria-label',MOD.titulo);
  }
  function cardPrincipal(d){
    var feito=d.querySelector('[data-adesp-card]');if(feito){trocarCapa(feito);return}
    var modelo=acharCardModelo(d);if(!modelo)return;
    var original=modelo.card,card=original.cloneNode(true);limparIds(card);limparMarcas(card);
    card.setAttribute('data-adesp-card','1');card.removeAttribute('href');card.style.cursor='pointer';
    [].forEach.call(card.querySelectorAll('a'),function(a){a.removeAttribute('href')});
    textos(card);trocarCapa(card);
    card.onclick=function(ev){ev.preventDefault();ev.stopPropagation();abrir(d)};
    var depois=cardObras(d)||original;
    if(depois.parentNode!==original.parentNode)depois=original;
    depois.parentNode.insertBefore(card,depois.nextSibling);
  }

  // Desempenho (12/11/2026): o card fica na Visão Geral do Portal (este documento). Antes era procurado
  // também dentro de cada módulo aberto, onde nunca existe — varria o texto de todos os elementos de
  // todos os módulos a cada 1,2 s.
  function varrer(){if(document.hidden)return;docs(window,[],0).forEach(function(d){try{menu(d);if(d===document)cardPrincipal(d)}catch(e){console.warn('[Portal] Auditoria de Despesas:',e)}})}
  varrer();setInterval(varrer,1200);
})();
