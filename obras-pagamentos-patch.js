/* Obras & Reformas — Pagamentos dentro do módulo do Portal (2026-10-11, rev. 3: quadro com altura automática;
   2026-10-14: sem a aba Financeiro — o fluxo é direto despesa → pagamento).
   Mantém apenas o Contas a pagar do bloco PAGAMENTOS.
   Remove definitivamente a antiga aba Contas a Pagar, logo abaixo de Prestações de contas.
*/
(function(){
  if(window.__obrasPagamentos)return;window.__obrasPagamentos=true;
  var BASE=(function(){try{return new URL('obras/',document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/obras/'}})();
  var V='20261015-1';
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
  // Quanto foi duplicado: soma o valor das linhas marcadas como duplicada (não entram no "Lançado", mas o valor aparece).
  function resumoDuplicidade(doc){
    if(!doc.body||doc.getElementById('resumo-dup'))return;var n=0,tot=0;
    [].forEach.call(doc.querySelectorAll('table'),function(tb){
      var cab=tb.querySelector('thead tr')||tb.querySelector('tr');if(!cab)return;
      var iv=-1;[].forEach.call(cab.cells,function(c,i){if(/^\s*valor\s*$/i.test(c.textContent||''))iv=i});if(iv<0)return;
      [].forEach.call(tb.querySelectorAll('tr'),function(r){if(r.closest('thead')||r.closest('tfoot')||!r.querySelector('td'))return;
        if(!/duplicad/i.test(r.textContent||''))return;var v=numBR((r.cells[iv]||{}).textContent);if(v!==null){n++;tot+=v}})});
    if(!n)return;
    var box=doc.createElement('div');box.id='resumo-dup';
    box.setAttribute('style','margin:10px 0;padding:10px 14px;border:2px solid #b91c1c;border-radius:10px;background:#fef2f2;color:#7f1d1d;font:600 14px Arial,sans-serif');
    box.textContent='Valor em duplicidade: '+brlTxt(tot)+' em '+n+' comprovante(s) — não somado no lançado.';
    var t=doc.querySelector('table');if(t&&t.parentNode)t.parentNode.insertBefore(box,t);else doc.body.insertBefore(box,doc.body.firstChild);
  }
  function vigiarRelatorios(d){
    var w=d.defaultView;if(!w||w.__totaisRel)return;w.__totaisRel=true;
    var orig=w.open;
    w.open=function(){var nw=orig.apply(w,arguments);
      try{if(nw&&nw.document){var dd=nw.document,fecha=dd.close.bind(dd);
        dd.close=function(){var r=fecha();try{totalizarTabelas(dd);resumoDuplicidade(dd)}catch(e){console.warn('[Portal] totais:',e)}return r}}}catch(e){}
      return nw};
  }
  /* Dashboard com TODOS os comprovantes (15/10/2026): o Supabase devolve no máximo 1000 linhas por consulta e o módulo
     pedia limit(10000) — o Dashboard mostrava "1000 comprovantes" e deixava de fora os mais antigos (total errado).
     Aqui a consulta de obras_comprovantes passa a buscar em páginas de 1000 (ordem estável por id) e o Dashboard recarrega. */
  function paginarComprovantes(d){
    if(d.__paginaObras||!d.body)return;d.__paginaObras=true;
    var sc=d.createElement('script');
    sc.textContent='('+function(){
      if(typeof sb==='undefined'||!sb||sb.__paginado)return;sb.__paginado=true;
      var orig=sb.from.bind(sb);
      sb.from=function(t){var qb=orig(t);if(t!=='obras_comprovantes')return qb;var sel=qb.select.bind(qb);
        qb.select=function(){var b=sel.apply(null,arguments);if(arguments[1]&&(arguments[1].head||arguments[1].count))return b;
          var lim=b.limit.bind(b);
          b.limit=function(n){if(!(n>1000))return lim.apply(null,arguments);
            b.order('id',{ascending:true});var thenOrig=b.then;
            b.then=function(ok,erro){return (async function(){var todos=[];
              for(var de=0;de<n;de+=1000){b.range(de,Math.min(de+999,n-1));var r=await thenOrig.call(b,function(x){return x});
                if(r.error)return r;todos=todos.concat(r.data||[]);if(!r.data||r.data.length<1000)break}
              return {data:todos,error:null,count:todos.length,status:200,statusText:'OK'}})().then(ok,erro)};
            return b};
          return b};
        return qb};
      if(typeof carregar==='function')try{carregar()}catch(e){}
    }.toString()+')();';
    d.body.appendChild(sc);
  }
  /* Buscador do Dashboard (16/10/2026, pedido do Ricardo): barra no topo do Dashboard do módulo Obras com busca por texto
     e por período (semana de segunda a domingo, mês, ou de/até). Os cards e gráficos passam a somar só o que está no filtro,
     e clicar num número abre os comprovantes já com o mesmo período/busca. */
  function buscadorDashboard(d){
    if(d.__buscaDash||!d.body||!d.getElementById('t-geral')||!d.getElementById('kpis'))return;
    try{if(typeof d.defaultView.renderGeral!=='function'||typeof d.defaultView.aplicar!=='function')return}catch(e){return}  // espera o script do módulo rodar
    d.__buscaDash=true;
    var sc=d.createElement('script');
    sc.textContent='('+function(){
      if(typeof renderGeral!=='function'||window.__buscaDash)return;window.__buscaDash=true;
      var $=function(id){return document.getElementById(id)};
      var PER={p:'tudo',sem:'',de:'',ate:'',q:''};
      var iso=function(x){return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
      var hoje=function(){return iso(new Date())};
      var mais=function(s,n){var x=new Date(s+'T12:00:00');x.setDate(x.getDate()+n);return iso(x)};
      var segunda=function(s){var x=new Date((s||hoje())+'T12:00:00');x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
      var br=function(s){return s?s.split('-').reverse().join('/'):''};
      function faixa(){
        var h=hoje(),sg=segunda(h);
        if(PER.p==='semana')return [sg,mais(sg,6)];
        if(PER.p==='passada')return [mais(sg,-7),mais(sg,-1)];
        if(PER.p==='sem'&&PER.sem)return [PER.sem,mais(PER.sem,6)];
        if(PER.p==='mes')return [h.slice(0,8)+'01',h];
        if(PER.p==='mesant'){var x=new Date(h.slice(0,8)+'01T12:00:00');x.setDate(0);var f=iso(x);return [f.slice(0,8)+'01',f]}
        if(PER.p==='per')return [PER.de||'',PER.ate||''];
        return ['',''];
      }
      function passa(r){
        var fx=faixa(),dt=r.data_despesa||'';
        if(fx[0]&&dt<fx[0])return false;if(fx[1]&&(!dt||dt>fx[1]))return false;
        var q=(PER.q||'').toLowerCase();
        if(q&&![r.fornecedor,r.loja,r.descricao,r.remetente,r.cnpj,r.legenda,r.autenticacao,(typeof CATS!=='undefined'?CATS[r.categoria]:'')].join(' ').toLowerCase().includes(q))return false;
        return true;
      }
      var ativo=function(){var fx=faixa();return !!(fx[0]||fx[1]||PER.q)};
      var origRender=renderGeral,origAplicar=aplicar;
      renderGeral=function(){
        if(!ativo()){var r0=origRender.apply(this,arguments);resumo(C.length);return r0}
        var fx=faixa(),C0=C,P0=P,n=0,r1;
        try{
          C=C0.filter(passa);n=C.length;
          P=P0.filter(function(p){var a=p.periodo_inicio||'',b=p.periodo_fim||a;return !(fx[1]&&a&&a>fx[1])&&!(fx[0]&&b&&b<fx[0])});
          r1=origRender.apply(this,arguments);
        }finally{C=C0;P=P0}
        resumo(n);return r1;
      };
      aplicar=function(f){
        f=Object.assign({},f||{});var fx=faixa();
        if(fx[0]&&!f.de)f.de=fx[0];if(fx[1]&&!f.ate)f.ate=fx[1];if(PER.q&&!f.q)f.q=PER.q;
        return origAplicar(f);
      };
      function semanas(){
        var vis={},lista=[];(C||[]).forEach(function(r){if(r.data_despesa)vis[segunda(r.data_despesa)]=1});
        vis[segunda(hoje())]=1;Object.keys(vis).sort().reverse().slice(0,60).forEach(function(s){lista.push(s)});return lista;
      }
      function resumo(n){
        var el=$('buscaDashInfo');if(!el)return;var fx=faixa();
        el.textContent=ativo()?('Mostrando '+n+' de '+C.length+' comprovantes'+(fx[0]||fx[1]?' · '+(fx[0]?br(fx[0]):'início')+' a '+(fx[1]?br(fx[1]):'hoje'):'')+(PER.q?' · busca “'+PER.q+'”':'')):'Mostrando todos os '+C.length+' comprovantes';
        var sel=$('bdSem');if(sel){var atual=sel.value,ops=semanas();
          sel.innerHTML='<option value="">Escolha a semana…</option>'+ops.map(function(s){return '<option value="'+s+'">'+br(s)+' a '+br(mais(s,6))+'</option>'}).join('');
          sel.value=PER.sem||atual||''}
      }
      var css=document.createElement('style');
      css.textContent='#buscaDash{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;padding:12px 14px;border:1px solid rgba(148,163,184,.22);border-radius:14px;background:rgba(15,23,42,.55)}#buscaDash input,#buscaDash select{background:#0b1222;color:#e2e8f0;border:1px solid rgba(148,163,184,.3);border-radius:10px;padding:8px 10px;font:inherit;font-size:14px}#buscaDash input[type=search]{flex:1 1 260px;min-width:180px}#buscaDash .bd-l{font-size:12px;opacity:.7}#buscaDash button{background:#1e293b;color:#e2e8f0;border:1px solid rgba(148,163,184,.3);border-radius:10px;padding:8px 12px;cursor:pointer;font:inherit;font-size:14px}#buscaDashInfo{flex-basis:100%;font-size:13px;color:#93c5fd}#buscaDash [hidden]{display:none!important}';
      document.head.appendChild(css);
      var box=document.createElement('div');box.id='buscaDash';
      box.innerHTML='<input type="search" id="bdQ" placeholder="🔎 Buscar no Dashboard: fornecedor, loja, descrição, responsável, CNPJ…">'+
        '<select id="bdP" title="Período"><option value="tudo">Todo o período</option><option value="semana">Esta semana (seg–dom)</option><option value="passada">Semana passada</option><option value="sem">Escolher semana…</option><option value="mes">Este mês</option><option value="mesant">Mês passado</option><option value="per">De / até…</option></select>'+
        '<select id="bdSem" hidden></select>'+
        '<span id="bdPer" hidden><span class="bd-l">de</span> <input type="date" id="bdDe"> <span class="bd-l">até</span> <input type="date" id="bdAte"></span>'+
        '<button type="button" id="bdLimpa">Limpar</button><div id="buscaDashInfo"></div>';
      var alvo=$('t-geral'),hint=alvo.querySelector('.hint');alvo.insertBefore(box,hint?hint.nextSibling:alvo.firstChild);
      var t=null;
      function aplicarBusca(){
        PER.p=$('bdP').value;PER.sem=$('bdSem').value;PER.de=$('bdDe').value;PER.ate=$('bdAte').value;PER.q=$('bdQ').value.trim();
        if(PER.p==='sem'&&!PER.sem){PER.sem=segunda(hoje())}
        $('bdSem').hidden=PER.p!=='sem';$('bdPer').hidden=PER.p!=='per';
        // CSV e Relatório/PDF seguem o mesmo período e busca
        try{var fx=faixa();F.de=fx[0];F.ate=fx[1];F.q=PER.q;$('fDe').value=fx[0];$('fAte').value=fx[1];$('q').value=PER.q;if(typeof renderLista==='function')renderLista()}catch(e){}
        renderGeral();
        try{if($('bdSem').value!==PER.sem)$('bdSem').value=PER.sem}catch(e){}
      }
      $('bdQ').addEventListener('input',function(){clearTimeout(t);t=setTimeout(aplicarBusca,250)});
      ['bdP','bdSem','bdDe','bdAte'].forEach(function(id){$(id).addEventListener('change',aplicarBusca)});
      $('bdLimpa').onclick=function(){$('bdQ').value='';$('bdP').value='tudo';$('bdSem').value='';$('bdDe').value='';$('bdAte').value='';aplicarBusca()};
      if(C&&C.length)renderGeral();else resumo(0);
    }.toString()+')();';
    d.body.appendChild(sc);
  }
  function varrer(){docs(window,[],0).forEach(function(d){try{vigiarPdf(d);vigiarRelatorios(d);if(ehModuloObras(d)){paginarComprovantes(d);buscadorDashboard(d)}if(!d.__obrasPagamentos&&ehModuloObras(d))instalar(d)}catch(e){console.warn('[Portal] Obras pagamentos:',e)}})}
  setInterval(varrer,1500);if(document.readyState!=='loading')varrer();else document.addEventListener('DOMContentLoaded',varrer);
})();
