/* Desconto em Folha · Crediário dentro do Portal */
(function(){
  if(window.__credPortal)return;window.__credPortal=true;
  var V='20261027-lote';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var URL_MOD=BASE+'obras/desconto-folha/?v='+V;
  var MOD={id:'cred',aba:'painel',icone:'💳',menu:'Desconto em Folha · Crediário',titulo:'Desconto em Folha · Crediário',capa:BASE+'desconto-folha-capa.jpg?v=2'};

  // acao = card do Conferente a abrir já com a lista de nomes (ex.: 'cf:2026-10:folha')
  function abrir(d,acao){
    var ov=d.getElementById('cred-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='cred-portal';ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px Arial"><button type="button" data-cred-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px">← Voltar ao Portal</button><span data-cred-titulo></span></div><iframe title="Desconto em Folha · Crediário" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-cred-fechar]').onclick=function(){ov.style.display='none';calcular(d,true)};d.body.appendChild(ov);
    }
    ov.querySelector('[data-cred-titulo]').textContent=MOD.icone+' '+MOD.titulo;
    var f=ov.querySelector('iframe');f.src=URL_MOD+'#'+MOD.aba;ov.style.display='flex';
    if(acao)esperarModulo(f,60,function(w){try{w.drill(acao)}catch(e){console.warn('[Portal] Crediário:',e)}});
  }
  // o módulo está pronto quando o Conferente já desenhou o painel (dados carregados depois do login)
  function esperarModulo(f,seg,ok,falhou){
    var n=0,t=setInterval(function(){var w=null;try{w=f.contentWindow}catch(e){}
      var pronto=false;try{pronto=!!(w&&typeof w.conferente==='function'&&w.document.querySelector('#conferente[data-pronto]'))}catch(e){}
      if(pronto){clearInterval(t);ok(w);return}
      var semAcesso=false;try{var l=w&&w.document.getElementById('vLogin');semAcesso=!!(l&&!l.classList.contains('hidden')&&w.document.readyState==='complete'&&n>8)}catch(e){}
      if(semAcesso||++n>seg*2){clearInterval(t);if(falhou)falhou(semAcesso)}},500);
  }

  /* ---------- Resumo na tela inicial: o mesmo cálculo do Conferente do módulo (módulo carregado escondido) ---------- */
  var RES=null,CALC=false;
  function calcular(d,forcar){
    if(CALC||(RES&&!forcar))return;CALC=true;
    var f=d.getElementById('cred-calc');
    if(!f){f=d.createElement('iframe');f.id='cred-calc';f.setAttribute('aria-hidden','true');f.tabIndex=-1;
      f.style.cssText='position:absolute;left:-10000px;top:0;width:1200px;height:800px;opacity:0;pointer-events:none;border:0';d.body.appendChild(f);}
    f.src=URL_MOD+'&calc='+Date.now()+'#painel';
    esperarModulo(f,90,function(w){
      try{
        var C=w.conferente(),a=C.comps[0];
        RES=a?{comp:a.comp,mes:mesBR(a.comp),pag:dataBR(a.pag),folha:a.folha,pessoas:a.pessoas,n:a.n,herdado:a.herdado,nHerdado:a.nHerdado,novo:a.novo,nNovo:a.nNovo,
          fora:a.fora,nFora:a.nFora,proj:a.proj,top:w.topFolha(a,5),
          prox:C.comps.slice(1,4).map(function(c){return {comp:c.comp,mes:mesBR(c.comp),folha:c.folha}})}:{vazio:true};
      }catch(e){console.warn('[Portal] Crediário resumo:',e);RES={erro:true}}
      CALC=false;f.removeAttribute('src');resumo(d,true);
    },function(semAcesso){CALC=false;RES={semAcesso:semAcesso,erro:!semAcesso};resumo(d,true)});
  }
  function mesBR(c){var m=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];return m[+String(c).slice(5,7)-1]+'/'+String(c).slice(0,4)}
  function dataBR(d){return d?String(d).slice(0,10).split('-').reverse().join('/'):''}
  function brl(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
  function qtd(n){return Number(n||0).toLocaleString('pt-BR')}
  // status do card do módulo: o selo diz quanto a folha tem que descontar; a linha de baixo, quando e de quantos
  function resumo(d,redesenhar){
    var velho=d.querySelector('[data-cred-resumo]');if(velho)velho.remove();   // banner das versões anteriores
    var card=d.querySelector('[data-cred-card="principal"]');if(!card)return;
    if(!RES){calcular(d);return}
    if(card.getAttribute('data-cred-status')===String(RES.comp||'x')&&!redesenhar)return;
    var ft=card.querySelector('.ocft')||card.lastElementChild;if(!ft)return;
    var selo=null,folhas=[].filter.call(ft.querySelectorAll('*'),function(el){return el.children.length===0&&(el.textContent||'').trim()});
    selo=folhas[0]||null;
    var linha=ft.querySelector('[data-cred-linha]');
    if(!linha){linha=d.createElement('div');linha.setAttribute('data-cred-linha','1');linha.style.cssText='font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.4';
      var alvo=selo&&selo.parentElement&&selo.parentElement!==ft?selo.parentElement:selo;if(alvo&&alvo.parentNode)alvo.parentNode.insertBefore(linha,alvo.nextSibling);else ft.appendChild(linha);}
    if(RES.semAcesso){if(selo)selo.textContent='DISPONÍVEL';linha.textContent='';}
    else if(RES.erro||RES.vazio){if(selo)selo.textContent=RES.vazio?'SEM PARCELAS A DESCONTAR':'DISPONÍVEL';linha.textContent='';}
    else{
      if(selo)selo.textContent='FOLHA '+String(RES.mes).toUpperCase()+' · '+brl(RES.folha);
      linha.textContent='● desconto em '+RES.pag+' · '+qtd(RES.pessoas)+' colaboradores'+(RES.fora>0.009?' · Diretoria '+brl(RES.fora):'');
    }
    card.setAttribute('data-cred-status',String(RES.comp||'x'));
  }
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document)}catch(e){return a}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1)}catch(e){}return a}

  function menu(d){
    var sb=d.getElementById('sb');if(!sb||sb.querySelector('[data-cred-menu="cred"]'))return;
    var g=d.createElement('div');g.className='sg';g.setAttribute('data-cred-group','1');
    g.innerHTML='<div class="sgl">Crediário</div><button class="ni" data-cred-menu="cred" type="button"><span class="nii">'+MOD.icone+'</span><span class="nil">'+MOD.menu+'</span></button>';
    sb.appendChild(g);g.querySelector('[data-cred-menu]').onclick=function(){abrir(d)};
  }

  function limparIds(el){if(el.removeAttribute)el.removeAttribute('id');[].forEach.call(el.querySelectorAll('[id]'),function(x){x.removeAttribute('id')});}
  function acharCardModelo(d){
    var folhas=[].filter.call(d.querySelectorAll('*'),function(el){return el.children.length===0&&/Descontos de Funcionários/i.test((el.textContent||'').trim())});
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
  // troca a arte do card clonado pela capa do crediário (img com srcset, <source> de <picture> ou fundo em CSS)
  function trocarCapa(card){
    var w=card.ownerDocument.defaultView;
    [card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(el){
      if(el.tagName==='SOURCE'){el.setAttribute('srcset',MOD.capa);return}
      if(el.tagName==='IMG'){el.removeAttribute('srcset');el.removeAttribute('sizes');el.removeAttribute('loading');el.src=MOD.capa;el.alt=MOD.titulo;el.style.objectFit='cover';el.style.objectPosition='center';return}
      var bg='';try{bg=w.getComputedStyle(el).backgroundImage||''}catch(e){}
      if(bg&&bg.indexOf('url(')>=0){el.style.backgroundImage=bg.replace(/url\([^)]*\)/,'url("'+MOD.capa+'")');el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
    });
  }
  function cardPrincipal(d){
    if(d.querySelector('[data-cred-card="principal"]'))return;
    var modelo=acharCardModelo(d);if(!modelo)return;
    var original=modelo.card, card=original.cloneNode(true);limparIds(card);
    card.setAttribute('data-cred-card','principal');card.removeAttribute('href');card.style.cursor='pointer';
    [].forEach.call(card.querySelectorAll('a'),function(a){a.removeAttribute('href')});
    [].forEach.call(card.querySelectorAll('*'),function(el){if(el.children.length===0&&/Descontos de Funcionários/i.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Descontos de Funcionários/ig,'Desconto em Folha · Crediário');});
    trocarCapa(card);
    card.onclick=function(ev){ev.preventDefault();ev.stopPropagation();abrir(d)};
    original.parentNode.insertBefore(card,original.nextSibling);
  }

  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d);cardPrincipal(d);resumo(d)}catch(e){console.warn('[Portal] Crediário:',e)}})}
  varrer();setInterval(varrer,1200);
})();