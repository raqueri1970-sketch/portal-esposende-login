/* Cards da Visão Geral do Portal (12/11/2026): "Faltas e Atrasos" e "Auditoria Financeira".
   Os dois módulos só tinham item no menu lateral. Os cards seguem o mesmo modelo dos outros (clone do card
   "Descontos de Funcionários", como o de Auditoria de Despesas e OS) e ficam logo depois de "Auditoria de
   Despesas e OS". O clique aciona o próprio item do menu (faltas-atrasos-patch.js / financeiro-patch.js),
   então a tela aberta é exatamente a mesma do menu. */
(function(){
  if(window.__cardsVisaoGeral)return;window.__cardsVisaoGeral=true;
  var CARDS=[
    {id:'faltas',icone:'⏱️',titulo:'Faltas e Atrasos',sub:'RH / Folha · ponto × folha',
     dsc:'Faltas, atrasos e DSR cruzados com o ponto, a folha e o cadastro: conta corrente do desconto, absenteísmo por loja e regional e relatório da Diretoria.',
     linha:'● RH / Folha · auditoria do ponto',menu:'[data-fa-menu]'},
    {id:'fin',icone:'💰',titulo:'Auditoria Financeira',sub:'Contas a Pagar · Sallamo',
     dsc:'Contas a pagar do Sallamo cruzadas com comprovantes: duplicidades, pagamentos em atraso com juros, pago a maior e fracionamento.',
     linha:'● Financeiro · Contas a Pagar',menu:'[data-fin-auditoria]'}
  ];
  var d=document,INICIO=Date.now();

  function modelo(){
    var t=[].filter.call(d.querySelectorAll('.octtl'),function(el){return /Descontos de Funcionários/i.test(el.textContent||'')})[0];
    return t&&t.closest('.oc');
  }
  function montar(m,c){
    var card=m.cloneNode(true);
    [card].concat([].slice.call(card.querySelectorAll('*'))).forEach(function(x){
      x.removeAttribute('id');
      [].slice.call(x.attributes).forEach(function(a){if(a.name==='onclick'||/^data-/.test(a.name))x.removeAttribute(a.name)});
    });
    card.setAttribute('data-cvg-card',c.id);card.style.cursor='pointer';
    card.setAttribute('title',c.titulo);card.setAttribute('aria-label',c.titulo);
    function txt(sel,v){var el=card.querySelector(sel);if(el)el.textContent=v;}
    txt('.ocic',c.icone);txt('.octtl',c.titulo);txt('.ocsml',c.sub);txt('.ocdsc',c.dsc);
    var ft=card.querySelector('.ocft');
    if(ft){
      var st=ft.querySelector('.ost');if(st){st.className='ost ook';st.textContent='Disponível';}
      var l=d.createElement('div');l.style.cssText='font-size:11px;color:#94a3b8;margin:0 auto 0 8px;line-height:1.4';l.textContent=c.linha;
      if(st&&st.parentNode===ft)ft.insertBefore(l,st.nextSibling);else ft.appendChild(l);
    }
    card.onclick=function(ev){
      ev.preventDefault();ev.stopPropagation();
      var b=d.querySelector('#sb '+c.menu)||d.querySelector(c.menu);
      if(b)b.click();
      else if(typeof window.toast==='function')window.toast('⏳ '+c.titulo+' ainda está carregando — tente de novo em instantes');
    };
    return card;
  }
  function instalar(){
    if(document.hidden)return;
    if(CARDS.every(function(c){return d.querySelector('[data-cvg-card="'+c.id+'"]')}))return;
    var m=modelo();if(!m||!m.parentNode)return;
    // depois de "Auditoria de Despesas e OS"; sem ele, depois do card modelo
    var adesp=d.querySelector('[data-adesp-card]');
    if(!adesp&&Date.now()-INICIO<6000)return; // o card de Despesas é criado por outro patch: espera um pouco por ele
    var ref=adesp||m;
    if(ref.parentNode!==m.parentNode)ref=m;
    CARDS.forEach(function(c){
      var ja=d.querySelector('[data-cvg-card="'+c.id+'"]');
      if(!ja){ja=montar(m,c);ref.parentNode.insertBefore(ja,ref.nextSibling);}
      ref=ja;
    });
  }
  instalar();setInterval(instalar,1500);
})();
