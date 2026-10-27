/* Desconto em Folha · Crediário dentro do Portal */
(function(){
  if(window.__credPortal)return;window.__credPortal=true;
  var V='20261027-painel-simples';
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
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function qtd(n){return Number(n||0).toLocaleString('pt-BR')}
  function resumo(d,redesenhar){
    var modelo=d.querySelector('[data-cred-card="principal"]');if(!modelo||!modelo.parentNode)return;
    var box=d.querySelector('[data-cred-resumo]');
    if(box&&!redesenhar)return;
    if(!box){box=d.createElement('div');box.setAttribute('data-cred-resumo','1');box.style.cssText='grid-column:1/-1;width:100%;box-sizing:border-box;margin:0 0 16px;padding:18px 20px;border-radius:16px;border:1px solid rgba(124,58,237,.55);background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(11,18,34,.92));color:#e5edf8;font-family:inherit';
      var grade=modelo.parentNode;grade.insertBefore(box,grade.firstChild);}
    if(!RES){box.innerHTML='<div style="font-weight:800;color:#c4b5fd;font-size:12px;letter-spacing:.06em">💳 DESCONTO EM FOLHA · CREDIÁRIO</div><div style="margin-top:6px;color:#94a3b8">Calculando o que a próxima folha tem que descontar…</div>';calcular(d);return;}
    if(RES.semAcesso){box.remove();return;}
    if(RES.erro||RES.vazio){box.innerHTML='<div style="font-weight:800;color:#c4b5fd;font-size:12px;letter-spacing:.06em">💳 DESCONTO EM FOLHA · CREDIÁRIO</div><div style="margin-top:6px;color:#94a3b8">'+(RES.vazio?'Nenhuma prestação a descontar nas próximas folhas.':'Não foi possível calcular agora.')+' <a href="javascript:void(0)" data-cred-ir="" style="color:#93c5fd">Abrir o módulo</a> · <a href="javascript:void(0)" data-cred-recalc style="color:#93c5fd">tentar de novo</a></div>';ligar(d,box);return;}
    var r=RES,ir=function(f){return 'cf:'+r.comp+':'+f},pct=function(v){return r.folha>0?Math.max(0,Math.min(100,v/r.folha*100)):0};
    var peca=function(f,rot,v,n,cor){return '<div data-cred-ir="'+ir(f)+'" style="cursor:pointer;flex:1;min-width:170px;padding:10px 12px;border:1px solid rgba(148,163,184,.25);border-left:4px solid '+cor+';border-radius:12px;background:rgba(15,23,42,.55)"><div style="font-size:12px;color:#94a3b8">'+rot+'</div><div style="font-size:19px;font-weight:800">'+brl(v)+'</div><div style="font-size:12px;color:#94a3b8">'+qtd(n)+' pessoa(s) · ver nomes ›</div></div>'};
    var sinal=function(t){return '<div style="align-self:center;font-size:22px;font-weight:800">'+t+'</div>'};
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start">'
      +'<div data-cred-ir="'+ir('folha')+'" style="cursor:pointer;min-width:260px"><div style="font-weight:800;color:#c4b5fd;font-size:12px;letter-spacing:.06em">💳 A FOLHA TEM QUE DESCONTAR · FOLHA DE '+esc(r.mes).toUpperCase()+'</div>'
      +'<div style="font-size:40px;font-weight:900;line-height:1.15">'+brl(r.folha)+'</div>'
      +'<div style="font-size:13px;color:#94a3b8">paga no 5º dia útil, '+esc(r.pag)+' · '+qtd(r.pessoas)+' colaboradores · '+qtd(r.n)+' prestações'+(r.proj>0.009?' · inclui '+brl(r.proj)+' projetados':'')+' · clique para ver os nomes</div></div>'
      +'<div data-cred-ir="'+ir('folha')+'" style="cursor:pointer;min-width:260px;font-size:13px">'+r.top.map(function(t){return '<div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0"><span>'+esc(t.nome)+'</span><b>'+brl(t.v)+'</b></div>'}).join('')+(r.pessoas>r.top.length?'<div style="color:#94a3b8">+ '+qtd(r.pessoas-r.top.length)+' colaboradores ›</div>':'')+'</div></div>'
      +'<div style="display:flex;height:9px;border-radius:6px;overflow:hidden;margin:12px 0;background:rgba(148,163,184,.15)"><i style="width:'+pct(r.herdado)+'%;background:#94a3b8"></i><i style="width:'+pct(r.novo)+'%;background:#22c55e"></i></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap">'+peca('herdado','Herdado · 2ª prestação em diante',r.herdado,r.nHerdado,'#94a3b8')+sinal('+')+peca('novo','Compras novas · 1ª prestação',r.novo,r.nNovo,'#22c55e')+sinal('=')+peca('folha','Folha',r.folha,r.pessoas,'#7c3aed')
      +peca('fora','Diretoria · PJ / fora do cadastro (por fora)',r.fora,r.nFora,'#f97316')+'</div>'
      +(r.prox.length?'<div style="margin-top:10px;font-size:13px;color:#94a3b8">Próximas folhas: '+r.prox.map(function(c){return '<a href="javascript:void(0)" data-cred-ir="cf:'+c.comp+':folha" style="color:#cbd5e1;margin-right:12px">'+esc(c.mes)+' <b>'+brl(c.folha)+'</b></a>'}).join('')+'<a href="javascript:void(0)" data-cred-recalc style="color:#93c5fd;float:right">↻ atualizar</a></div>':'');
    ligar(d,box);
  }
  function ligar(d,box){
    [].forEach.call(box.querySelectorAll('[data-cred-ir]'),function(el){el.onclick=function(ev){ev.preventDefault();ev.stopPropagation();abrir(d,el.getAttribute('data-cred-ir'))}});
    [].forEach.call(box.querySelectorAll('[data-cred-recalc]'),function(el){el.onclick=function(ev){ev.preventDefault();ev.stopPropagation();RES=null;resumo(d,true)}});
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
  function trocarCapa(card){
    var img=card.querySelector('img');if(img){img.src=MOD.capa;img.alt=MOD.titulo;return;}
    var els=[card].concat([].slice.call(card.querySelectorAll('*')));
    for(var i=0;i<els.length;i++){
      var bg='';try{bg=getComputedStyle(els[i]).backgroundImage||''}catch(e){}
      if(bg&&bg!=='none'&&/url\(/i.test(bg)){els[i].style.backgroundImage='url("'+MOD.capa+'")';return;}
    }
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