/* Desconto em Folha · Crediário dentro do Portal */
(function(){
  if(window.__credPortal)return;window.__credPortal=true;
  var V='20261027-conferente-folha';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var URL_MOD=BASE+'obras/desconto-folha/?v='+V;
  var MOD={id:'cred',aba:'painel',icone:'💳',menu:'Desconto em Folha · Crediário',titulo:'Desconto em Folha · Crediário',capa:BASE+'desconto-folha-capa.jpg?v=2'};

  function abrir(d){
    var ov=d.getElementById('cred-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='cred-portal';ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px Arial"><button type="button" data-cred-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px">← Voltar ao Portal</button><span data-cred-titulo></span></div><iframe title="Desconto em Folha · Crediário" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-cred-fechar]').onclick=function(){ov.style.display='none'};d.body.appendChild(ov);
    }
    ov.querySelector('[data-cred-titulo]').textContent=MOD.icone+' '+MOD.titulo;
    var f=ov.querySelector('iframe');f.src=URL_MOD+'#'+MOD.aba;ov.style.display='flex';
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

  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d);cardPrincipal(d)}catch(e){console.warn('[Portal] Crediário:',e)}})}
  varrer();setInterval(varrer,1200);
})();