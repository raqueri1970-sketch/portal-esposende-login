/* Obras & Reformas — Pagamentos dentro do módulo do Portal (2026-10-11, rev. 3: quadro com altura automática;
   2026-10-14: sem a aba Financeiro — o fluxo é direto despesa → pagamento).
   Mantém apenas o Contas a pagar do bloco PAGAMENTOS.
   Remove definitivamente a antiga aba Contas a Pagar, logo abaixo de Prestações de contas.
*/
(function(){
  if(window.__obrasPagamentos)return;window.__obrasPagamentos=true;
  var BASE=(function(){try{return new URL('obras/',document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/obras/'}})();
  var V='20261014-5';
  var ABAS=[
    {id:'cap',icone:'📊',rotulo:'Visão geral',titulo:'Despesas e pagamentos · visão geral',url:'obras-contas-pagar/'},
    {id:'pag',icone:'💳',rotulo:'Pagamentos (Presidente)',titulo:'Pagamentos · Presidente',url:'obras-presidente/'},
    {id:'rel',icone:'📑',rotulo:'Relatórios e PDF',titulo:'Relatórios e PDF',url:'obras-relatorios/'}
  ];
  function docs(w,lista,prof){if(prof>4)return lista;try{var d=w.document;if(d)lista.push(d)}catch(e){return lista}for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1)}catch(e){}}return lista}
  function ehModuloObras(d){var nav=d.getElementById('nav'),side=d.getElementById('side');return !!(nav&&side&&d.getElementById('t-geral')&&/Obras\s*&\s*Reformas/.test((side.querySelector('.brand')||side).textContent||''))}
  function normaliza(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase()}
  function removerContaAntiga(nav){
    [].forEach.call(nav.querySelectorAll('.tab:not([data-obras-pag])'),function(t){
      var tx=normaliza(t.textContent);
      if(tx==='contas a pagar'||tx.indexOf('contas a pagar')===0){try{t.remove()}catch(e){t.style.display='none'}}
    });
  }
  function instalar(d){
    if(d.__obrasPagamentos)return;d.__obrasPagamentos=true;
    var nav=d.getElementById('nav'),main=d.getElementById('main'),ttl=d.getElementById('ttl');
    removerContaAntiga(nav);
    var tools=main&&main.querySelector('.tools'),sub=main&&main.querySelector('.top .sub');
    var css=d.createElement('style');css.textContent='#nav [data-obras-pag]{text-decoration:none;cursor:pointer}#nav .tab-sep{margin:10px 6px 6px;padding-top:10px;border-top:1px solid rgba(148,163,184,.18);font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.65}#t-obras-pag{margin-top:6px}#t-obras-pag iframe{width:100%;height:640px;min-height:420px;border:0;border-radius:14px;background:#070b16;display:block;overflow:hidden}html,body{overflow-x:hidden}';d.head.appendChild(css);
    var sep=d.createElement('div');sep.className='tab-sep';sep.textContent='Pagamentos';nav.appendChild(sep);
    var sec=d.createElement('section');sec.id='t-obras-pag';sec.hidden=true;sec.innerHTML='<iframe title="Obras & Reformas - pagamentos" allow="clipboard-write"></iframe>';main.appendChild(sec);
    var ifr=sec.querySelector('iframe'),atual=null,tituloOriginal=null,ro=null;
    ifr.setAttribute('scrolling','no');
    function ajustar(){try{var dd=ifr.contentDocument;if(!dd||!dd.body)return;var h=Math.ceil(dd.body.scrollHeight)+4;if(h>0&&Math.abs(h-ifr.offsetHeight)>2)ifr.style.height=h+'px'}catch(e){}}
    ifr.addEventListener('load',function(){try{if(ro)ro.disconnect();var dd=ifr.contentDocument;ro=new (ifr.contentWindow.ResizeObserver||ResizeObserver)(ajustar);ro.observe(dd.body);ro.observe(dd.documentElement);ajustar();setTimeout(ajustar,400);setTimeout(ajustar,1500)}catch(e){}});
    function abrir(aba,link){if(tituloOriginal===null&&ttl)tituloOriginal=ttl.textContent;[].forEach.call(main.querySelectorAll(':scope > section'),function(s){if(s!==sec)s.hidden=true});[].forEach.call(nav.querySelectorAll('.tab'),function(t){t.classList.remove('on')});link.classList.add('on');sec.hidden=false;if(tools)tools.style.display='none';if(sub)sub.style.display='none';if(ttl)ttl.textContent=aba.titulo;if(atual!==aba.id){ifr.src=BASE+aba.url+'?v='+V;atual=aba.id}}
    function fechar(){if(sec.hidden)return;sec.hidden=true;[].forEach.call(nav.querySelectorAll('[data-obras-pag]'),function(t){t.classList.remove('on')});if(tools)tools.style.display='';if(sub)sub.style.display=''}
    ABAS.forEach(function(aba){var a=d.createElement('a');a.className='tab';a.href='#';a.setAttribute('data-obras-pag',aba.id);a.textContent=aba.icone+' '+aba.rotulo;a.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();abrir(aba,a)},true);nav.appendChild(a)});
    nav.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('.tab');if(t&&!t.hasAttribute('data-obras-pag'))fechar()},true);
    new MutationObserver(function(){removerContaAntiga(nav)}).observe(nav,{childList:true,subtree:true});
  }
  /* Comprovante em PDF (14/10/2026): o módulo Obras abre o PDF num <iframe> com o link do Supabase, e o Chrome bloqueia
     o leitor de PDF dentro do Portal (quadro isolado / CSP sandbox do Storage) — aparecia "Esta página foi bloqueada".
     Aqui o PDF é baixado e desenhado página a página (pdf.js), sem quadro. Vale para qualquer tela do Portal. */
  var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var _pdf=null;
  function pdfjs(){if(!_pdf)_pdf=new Promise(function(ok,erro){if(window.pdfjsLib)return ok(window.pdfjsLib);var sc=document.createElement('script');sc.src=PDFJS+'pdf.min.js';
    sc.onload=function(){window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';ok(window.pdfjsLib)};sc.onerror=function(){_pdf=null;erro(new Error('pdf.js nao carregou'))};document.head.appendChild(sc)});return _pdf}
  function ehPdfStorage(src){return /\/storage\/v1\/object\//.test(src||'')&&/\.pdf(\?|$)/i.test(String(src).split('?')[0]+'?')}
  async function trocarIframePdf(ifr){
    if(ifr.__pdfTrocado)return;ifr.__pdfTrocado=true;
    var d=ifr.ownerDocument,src=ifr.getAttribute('src'),box=d.createElement('div');
    box.setAttribute('style','width:100%;max-height:80vh;overflow:auto;background:#e5e7eb;border-radius:10px;padding:8px;box-sizing:border-box;text-align:center;color:#111;font:14px sans-serif');
    box.textContent='Abrindo o PDF…';ifr.replaceWith(box);
    try{
      var r=await fetch(src);if(!r.ok)throw new Error('HTTP '+r.status);
      var buf=await r.arrayBuffer(),lib=await pdfjs(),doc=await lib.getDocument({data:new Uint8Array(buf)}).promise;
      box.textContent='';var larg=Math.max(320,Math.min(900,(box.clientWidth||800)-16));
      for(var n=1;n<=Math.min(doc.numPages,30);n++){var pg=await doc.getPage(n),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:larg/v0.width*(window.devicePixelRatio||1)});
        var c=d.createElement('canvas');c.width=vp.width;c.height=vp.height;c.setAttribute('style','display:block;width:100%;margin:0 auto 8px;background:#fff;border-radius:6px');
        box.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
      var url=URL.createObjectURL(new Blob([buf],{type:'application/pdf'})),a=d.createElement('a');
      a.href=url;a.download=(src.split('?')[0].split('/').pop()||'comprovante.pdf');a.textContent='Baixar o PDF';
      a.setAttribute('style','display:inline-block;margin:6px auto;padding:9px 16px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600');box.appendChild(a);
    }catch(e){box.innerHTML='';var a2=d.createElement('a');a2.href=src;a2.target='_blank';a2.rel='noopener';a2.textContent='Não foi possível mostrar aqui ('+(e.message||e)+') — abrir o PDF em outra aba';box.appendChild(a2)}
  }
  function vigiarPdf(d){
    if(d.__vigiaPdf||!d.body)return;d.__vigiaPdf=true;
    var ver=function(){[].forEach.call(d.querySelectorAll('iframe[src]'),function(f){if(ehPdfStorage(f.getAttribute('src')))trocarIframePdf(f)})};
    new MutationObserver(ver).observe(d.body,{childList:true,subtree:true});ver();
  }
  /* Totais em todo relatório (14/10/2026, pedido do Ricardo): os relatórios abertos em janela nova para imprimir/PDF
     (ex.: "Relatório de Despesas" do módulo Obras) ganham uma linha TOTAL com a quantidade e a soma de cada coluna de valor. */
  function numBR(t){t=String(t||'').replace(/\s+/g,' ').trim();var m=/^(-|−)?\s*(R\$)?\s*(\d{1,3}(\.\d{3})*|\d+),(\d{2})$/.exec(t);
    if(!m)return null;var v=Number(m[3].replace(/\./g,'')+'.'+m[5]);return m[1]?-v:v}
  function brlTxt(v){return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
  function totalizarTabelas(doc){
    [].forEach.call(doc.querySelectorAll('table'),function(tb){
      if(tb.__totalizada)return;tb.__totalizada=true;
      var linhas=[].filter.call(tb.querySelectorAll('tbody tr, tr'),function(r){return r.closest('table')===tb&&!r.closest('thead')&&!r.closest('tfoot')&&r.querySelector('td')});
      if(linhas.length<1)return;
      if(tb.querySelector('tfoot')||/^\s*total/i.test((linhas[linhas.length-1].cells[0]||{}).textContent||''))return;
      var nCol=0;linhas.forEach(function(r){nCol=Math.max(nCol,r.cells.length)});
      var cab=tb.querySelector('thead tr')||tb.querySelector('tr');
      var somas=[],eh=[];
      for(var c=0;c<nCol;c++){var tot=0,ok=0,cheio=0;
        linhas.forEach(function(r){var cel=r.cells[c];if(!cel)return;var t=(cel.textContent||'').trim();if(!t)return;cheio++;var v=numBR(t);if(v!==null){ok++;tot+=v}});
        var h=cab&&cab.cells[c]?(cab.cells[c].textContent||''):'';
        eh[c]=ok>0&&ok>=cheio*0.6&&!/data|%|n[º°o]\b|qtd/i.test(h);somas[c]=tot}
      if(!eh.some(Boolean))return;
      var doc2=tb.ownerDocument,tf=doc2.createElement('tfoot'),tr=doc2.createElement('tr');
      var rot=eh.indexOf(false);
      for(var k=0;k<nCol;k++){var td=doc2.createElement('td');td.setAttribute('style','font-weight:800;border-top:2px solid #333;background:#eef1f6;color:#111;padding:6px;white-space:nowrap'+(eh[k]?';text-align:right':''));
        td.textContent=eh[k]?brlTxt(somas[k]):(k===rot?'TOTAL ('+linhas.length+')':'');tr.appendChild(td)}
      if(rot<0)tr.cells[0].textContent='TOTAL ('+linhas.length+'): '+brlTxt(somas[0]);
      tf.appendChild(tr);tb.appendChild(tf);
    });
  }
  function vigiarRelatorios(d){
    var w=d.defaultView;if(!w||w.__totaisRel)return;w.__totaisRel=true;
    var orig=w.open;
    w.open=function(){var nw=orig.apply(w,arguments);
      try{if(nw&&nw.document){var dd=nw.document,fecha=dd.close.bind(dd);
        dd.close=function(){var r=fecha();try{totalizarTabelas(dd)}catch(e){console.warn('[Portal] totais:',e)}return r}}}catch(e){}
      return nw};
  }
  function varrer(){docs(window,[],0).forEach(function(d){try{vigiarPdf(d);vigiarRelatorios(d);if(!d.__obrasPagamentos&&ehModuloObras(d))instalar(d)}catch(e){console.warn('[Portal] Obras pagamentos:',e)}})}
  setInterval(varrer,1500);if(document.readyState!=='loading')varrer();else document.addEventListener('DOMContentLoaded',varrer);
})();
