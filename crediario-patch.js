/* Desconto em Folha · Crediário e Ex-funcionários dentro do Portal (2026-10-25).
   Põe dois cards (com capa) na visão geral e o grupo "Crediário" no menu lateral, e abre obras/desconto-folha/ por cima do
   Portal, com a mesma sessão (mesmo endereço github.io). A tela vem do repositório sistema-de-auditoria (pasta desconto-folha/).
*/
(function(){
  if(window.__credPortal)return;window.__credPortal=true;
  var V='20261025-2';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/'}})();
  var URL_MOD=BASE+'obras/desconto-folha/?v='+V;
  var CARDS=[
    {id:'cred',aba:'painel',modo:'',icone:'💳',menu:'Desconto em Folha',titulo:'Desconto em Folha · Crediário',capa:BASE+'desconto-folha-capa.jpg?v=1'},
    // módulo só de ex-funcionários e de quem não está no cadastro (a mesma tela no modo "ex")
    {id:'ex',aba:'ex',modo:'ex',icone:'🚪',menu:'Ex-funcionários e fora do cadastro',titulo:'Ex-funcionários e fora do cadastro',capa:BASE+'ex-funcionarios-capa.jpg?v=2'}
  ];

  function abrir(d,c){
    var ov=d.getElementById('cred-portal');
    if(!ov){
      ov=d.createElement('div');ov.id='cred-portal';
      ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';
      ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif">'
        +'<button type="button" data-cred-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px;font:inherit;cursor:pointer">← Voltar ao Portal</button>'
        +'<span data-cred-titulo>💳 Desconto em Folha · Crediário</span></div>'
        +'<iframe title="Desconto em Folha · Crediário" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';
      ov.querySelector('[data-cred-fechar]').onclick=function(){ov.style.display='none';try{d.documentElement.style.overflow=''}catch(e){}};
      d.body.appendChild(ov);
    }
    var ifr=ov.querySelector('iframe');
    // a tela troca de aba pelo #: já aberta, só muda o endereço depois do # (não recarrega)
    ov.querySelector('[data-cred-titulo]').textContent=c.icone+' '+c.titulo;
    // mesmo módulo já aberto: só troca a aba pelo #; outro módulo (modo): abre de novo
    if(!ifr.getAttribute('src')||ifr.getAttribute('data-modo')!==c.modo){ifr.setAttribute('data-modo',c.modo);ifr.setAttribute('src',URL_MOD+(c.modo?'&modo='+c.modo:'')+'#'+c.aba)}
    else try{ifr.contentWindow.location.hash=c.aba}catch(e){ifr.setAttribute('src',URL_MOD+(c.modo?'&modo='+c.modo:'')+'#'+c.aba)}
    ov.style.display='flex';
    try{d.documentElement.style.overflow='hidden'}catch(e){}
  }

  function docs(w,lista,prof){if(prof>4)return lista;try{if(w.document)lista.push(w.document)}catch(e){return lista}for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1)}catch(e){}}return lista}
  function fecharMenu(d){try{if(d.defaultView.closeSB)d.defaultView.closeSB()}catch(x){}}

  // Menu lateral do Portal (#sb, grupos .sg com botões .ni): grupo "Crediário" antes de "Campanhas"
  function menu(d){
    var sb=d.getElementById('sb');
    if(!sb||sb.querySelector('[data-cred-menu]'))return;
    var grupo=d.createElement('div');grupo.className='sg';
    grupo.innerHTML='<div class="sgl">Crediário</div>'+CARDS.map(function(c){return '<button class="ni" data-cred-menu="'+c.id+'" type="button"><span class="nii">'+c.icone+'</span><span class="nil">'+c.menu+'</span></button>'}).join('');
    var div=d.createElement('div');div.className='ndv';
    var alvo=null;[].forEach.call(sb.querySelectorAll('.sg'),function(g){var l=g.querySelector('.sgl');if(!alvo&&l&&/campanhas/i.test(l.textContent))alvo=g});
    if(!alvo)alvo=sb.querySelector('.sbft');
    if(alvo){sb.insertBefore(grupo,alvo);sb.insertBefore(div,alvo)}else{sb.appendChild(div);sb.appendChild(grupo)}
    [].forEach.call(grupo.querySelectorAll('[data-cred-menu]'),function(b){b.addEventListener('click',function(e){e.preventDefault();fecharMenu(d);var id=b.getAttribute('data-cred-menu');abrir(d,CARDS.filter(function(c){return c.id===id})[0])})});
  }

  // Cards da visão geral: cópia de um card vizinho com foto (fica igual aos demais), com a capa própria
  function grande(el){var r=el.getBoundingClientRect();return r.width>=80&&r.height>=60}
  function fundo(el){var b=el.ownerDocument.defaultView.getComputedStyle(el).backgroundImage;return b&&b.indexOf('url(')>=0?b:''}
  function imagemEm(card){
    var imgs=[].slice.call(card.querySelectorAll('img')).filter(grande);if(imgs.length)return imgs[0];
    var els=[card].concat([].slice.call(card.querySelectorAll('*')));for(var i=0;i<els.length;i++)if(fundo(els[i])&&grande(els[i]))return els[i];
    return null;
  }
  function molde(d){
    var cs=[].slice.call(d.querySelectorAll('.oc')).filter(function(c){return !c.hasAttribute('data-cred-card')&&c.getBoundingClientRect().width>=200});
    for(var i=0;i<cs.length;i++)if(imagemEm(cs[i]))return {card:cs[i],foto:true};
    return cs.length?{card:cs[0],foto:false}:null;
  }
  function montar(d,m,c){
    var card=m.card.cloneNode(true);
    card.setAttribute('data-cred-card',c.id);card.removeAttribute('onclick');card.removeAttribute('href');
    [card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(el){
      el.removeAttribute('id');el.removeAttribute('onclick');
      if(el.tagName==='SOURCE')el.setAttribute('srcset',c.capa);
      else if(el.tagName==='IMG'){el.removeAttribute('srcset');el.removeAttribute('sizes');el.removeAttribute('loading');el.src=c.capa;el.alt=c.titulo;el.style.objectFit='cover';el.style.objectPosition='center'}
    });
    // fundo com foto (card que usa background-image)
    var orig=[m.card].concat([].slice.call(m.card.querySelectorAll('*'))),copia=[card].concat([].slice.call(card.querySelectorAll('*')));
    orig.forEach(function(el,i){var b=fundo(el);if(b&&copia[i]){copia[i].style.backgroundImage=b.replace(/url\([^)]*\)/,'url("'+c.capa+'")');copia[i].style.backgroundSize='cover';copia[i].style.backgroundPosition='center'}});
    // textos do card copiado: a arte já traz o nome; o rodapé mostra só a situação e a seta
    var ft=card.querySelector('.ocft');
    var w=d.createTreeWalker(card,NodeFilter.SHOW_TEXT),n,t=[];while((n=w.nextNode()))if(n.nodeValue.trim())t.push(n);
    t.forEach(function(x){if(!(ft&&ft.contains(x)))x.nodeValue=''});
    if(ft){[].slice.call(ft.children).forEach(function(x){if(!/(^|\s)(ost|oarr)(\s|$)/.test(x.className))x.remove()});
      var st=ft.querySelector('.ost');if(st)st.textContent='Supabase';var ar=ft.querySelector('.oarr');if(ar&&!ar.textContent.trim())ar.textContent='→'}
    if(!m.foto){
      // card sem foto: põe a capa em cima, no formato 16:9, e mostra o título
      var bl=d.createElement('div');bl.style.cssText='position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:10px;margin-bottom:8px;background:#0b1a33';
      bl.innerHTML='<img alt="" style="display:block;width:100%;height:100%;object-fit:cover">';bl.firstChild.src=c.capa;card.insertBefore(bl,card.firstChild);
      var tt=card.querySelector('.octtl');if(tt)tt.textContent=c.titulo;
    }
    card.style.cursor='pointer';card.title=c.titulo;
    card.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();abrir(d,c)},true);
    return card;
  }
  function cards(d){
    if(d.querySelector('[data-cred-card]'))return;
    var m=molde(d);if(!m)return;
    // logo depois do card de RH/descontos de funcionários, se existir; senão no fim da grade do molde
    var grade=m.card.parentElement,ref=null;
    [].forEach.call(grade.children,function(x){var tx=(x.textContent||'').replace(/\s+/g,' ').toUpperCase();if(/AUDITORIA RH|DESCONTOS? DE FUNCION/.test(tx))ref=x});
    var depois=ref?ref.nextSibling:null;
    CARDS.forEach(function(c){grade.insertBefore(montar(d,m,c),depois)});
  }

  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d)}catch(e){}try{cards(d)}catch(e){console.warn('[Portal] cards crediário:',e)}})}
  varrer();
  var n=0,t=setInterval(function(){varrer();if(++n>200)clearInterval(t)},1500);
})();
