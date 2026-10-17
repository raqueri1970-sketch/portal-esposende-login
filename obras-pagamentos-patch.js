/* Obras & Reformas — Pagamentos dentro do módulo do Portal (2026-10-11, rev. 3: quadro com altura automática;
   2026-10-14: sem a aba Financeiro — o fluxo é direto despesa → pagamento).
   Mantém apenas o Contas a pagar do bloco PAGAMENTOS.
   Remove definitivamente a antiga aba Contas a Pagar, logo abaixo de Prestações de contas.
*/
(function(){
  if(window.__obrasPagamentos)return;window.__obrasPagamentos=true;
  var BASE=(function(){try{return new URL('obras/',document.currentScript.src).href}catch(e){return 'https://raqueri1970-sketch.github.io/portal-esposende-login/obras/'}})();
  var V='20261017-4';
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
  // 17/10/2026: jsDelivr (pdfjs-dist) traz as fontes padrão e os cmaps — sem eles, PDF de banco/PicPay sem fonte embutida aparecia com □□□
  var PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  var _pdf=null;
  function pdfjs(){if(!_pdf)_pdf=new Promise(function(ok,erro){if(window.pdfjsLib)return ok(window.pdfjsLib);var sc=document.createElement('script');sc.src=PDFJS+'build/pdf.min.js';
    sc.onload=function(){window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'build/pdf.worker.min.js';ok(window.pdfjsLib)};sc.onerror=function(){_pdf=null;erro(new Error('pdf.js nao carregou'))};document.head.appendChild(sc)});return _pdf}
  function ehPdfStorage(src){return /\/storage\/v1\/object\//.test(src||'')&&/\.pdf(\?|$)/i.test(String(src).split('?')[0]+'?')}
  async function trocarIframePdf(ifr){
    if(ifr.__pdfTrocado)return;ifr.__pdfTrocado=true;
    var d=ifr.ownerDocument,src=ifr.getAttribute('src'),box=d.createElement('div');
    box.setAttribute('style','width:100%;max-height:80vh;overflow:auto;background:#e5e7eb;border-radius:10px;padding:8px;box-sizing:border-box;text-align:center;color:#111;font:14px sans-serif');
    box.textContent='Abrindo o PDF…';ifr.replaceWith(box);
    try{
      var r=await fetch(src);if(!r.ok)throw new Error('HTTP '+r.status);
      // 17/10/2026: o PDF é aberto dentro do quadro do módulo, mas o pdf.js roda na página de fora — as fontes que ele registra
      // não valem no quadro e o texto saía □□□. Agora: letras desenhadas como traço (disableFontFace), página desenhada num
      // canvas da página de fora e entregue ao quadro como imagem.
      var buf=await r.arrayBuffer(),lib=await pdfjs(),doc=await lib.getDocument({data:new Uint8Array(buf),cMapUrl:PDFJS+'cmaps/',cMapPacked:true,
        standardFontDataUrl:PDFJS+'standard_fonts/',disableFontFace:true}).promise;
      box.textContent='';var larg=Math.max(320,Math.min(900,(box.clientWidth||800)-16));
      for(var n=1;n<=Math.min(doc.numPages,30);n++){var pg=await doc.getPage(n),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:larg/v0.width*Math.max(2,window.devicePixelRatio||1)});
        var c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
        var cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);
        await pg.render({canvasContext:cx,viewport:vp}).promise;
        var im=d.createElement('img');im.src=c.toDataURL('image/png');im.alt='Página '+n;
        im.setAttribute('style','display:block;width:100%;margin:0 auto 8px;background:#fff;border-radius:6px');box.appendChild(im)}
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
  /* Dashboard e Auditoria do módulo Obras (17/10/2026, pedido do Ricardo): mesmos dados, apresentação mais clara.
     - Dashboard: "A pagar hoje" e "Caixa com os prestadores" (da conta corrente) no lugar do reembolso da capa antiga,
       % conferido, valor em R$ em cada indicador e despesas por semana (segunda a domingo).
     - Auditoria: resumo por gravidade, pontos do Agente Auditor do servidor (com a lista e a foto) e regras agrupadas. */
  function melhorarAbas(d){
    if(d.__melhorAbas||!d.body||!d.getElementById('t-geral'))return;
    try{if(typeof d.defaultView.renderGeral!=='function'||typeof d.defaultView.cardAuditoria!=='function')return}catch(e){return}
    d.__melhorAbas=true;
    var sc=d.createElement('script');
    sc.textContent='('+function(){
      if(window.__melhorAbas)return;window.__melhorAbas=true;
      var $=function(id){return document.getElementById(id)};
      var css=document.createElement('style');
      css.textContent='#kpis .kpis{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.kpi small{display:block;font-size:13px;color:#cfd6ee;font-weight:600;margin-top:2px}.hero .hbar{height:7px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;margin:8px auto 2px;max-width:220px}.hero .hbar i{display:block;height:100%;background:#8cc8ff}'+
        '.aud2-res{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0 4px}.aud2-res div{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;cursor:pointer}.aud2-res div:hover{border-color:var(--neon)}'+
        '.aud2-res span{display:block;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;color:#e6eaf8}.aud2-res b{display:block;font-size:26px;font-weight:800;line-height:1.2}.aud2-res small{display:block;font-size:13px;color:#cfd6ee}'+
        '.aud2-res .r b{color:#ff7b8d}.aud2-res .a b{color:#ffd166}.aud2-res .l b{color:#8cc8ff}.aud2-res .v b{color:#c4b5fd}.aud2-res .g b{color:#4dfc9a}'+
        '.aud2-t{display:flex;align-items:center;gap:10px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 4px;font-weight:800}.aud2-t::after{content:"";flex:1;height:1px;background:var(--border)}.aud2-t small{text-transform:none;letter-spacing:0;font-weight:600;color:#cfd6ee;font-size:13.5px}'+
        '.aud-r .ib{background:none;border:1px solid var(--border);color:#cfd6ee;border-radius:999px;width:24px;height:24px;font-size:13px;cursor:pointer;margin-left:6px;font-family:inherit}.aud-r .ib:hover{border-color:var(--neon);color:#fff}'+
        '.aud-r small.ex{display:none}.aud-r.ver small.ex{display:block}'+
        '.aud2-lista{margin:0 0 6px 54px;border-left:2px solid var(--border);padding:4px 0 4px 12px}.aud2-it{display:grid;grid-template-columns:82px 1fr auto auto;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.07);font-size:14px}'+
        '.aud2-it .m{color:#cfd6ee;font-size:13px;display:block}.aud2-it .vl{font-weight:800;white-space:nowrap}.aud2-it button{background:#262a44;border:1px solid var(--border);color:#fff;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px}'+
        '@media(max-width:600px){.aud2-lista{margin-left:6px}.aud2-it{grid-template-columns:1fr auto}.aud2-it .dt{display:none}}';
      document.head.appendChild(css);
      // conta corrente (saldos) e pontos do Agente Auditor do servidor: carregados à parte e guardados por 1 min
      var X={saldos:[],achados:[],em:0,carregando:false};
      function carregarExtra(){
        if(X.carregando||Date.now()-X.em<60000||typeof sb==='undefined')return;X.carregando=true;
        Promise.all([sb.from('obras_saldo_prestador').select('prestador,em_aberto,adiantamento_disponivel,saldo_devedor,total_pago'),
          sb.from('obras_auditoria_achados').select('id,comprovante_id,regra,nivel,mensagem').eq('resolvido',false).not('comprovante_id','is',null).limit(5000)])
        .then(function(r){X.saldos=(r[0]&&r[0].data)||[];X.achados=(r[1]&&r[1].data)||[];X.em=Date.now();X.carregando=false;try{renderGeral()}catch(e){}})
        .catch(function(){X.carregando=false;X.em=Date.now()});
      }
      var SRV={duplicidade_autenticacao:['⛔','Pagamento repetido (mesma autenticação)'],duplicidade_valor_data_fornecedor:['⛔','Possível duplicidade (valor, data e fornecedor)'],
        arquivo_repetido:['🖼','Mesmo arquivo enviado de novo'],sem_comprovante:['📭','Sem documento'],leitura_baixa_confianca:['🔎','Leitura duvidosa da foto'],
        valor_atipico:['💰','Valor fora do padrão'],sem_obra:['🏗','Sem obra informada'],data_incoerente:['📅','Data incoerente'],
        pix_pessoa_fisica_material:['👤','Material pago por PIX a pessoa física'],fornecedor_varias_vezes_dia:['🔁','Mesmo fornecedor várias vezes no dia'],
        ia_suspeita:['🤖','IA viu sinal na foto'],desvio_finalidade_grave:['🚫','Desvio de finalidade'],desvio_finalidade:['🚫','Item de uso pessoal'],
        pix_para_o_proprio:['🪪','Pagou a si mesmo'],material_sem_nota:['📝','Material sem nota fiscal'],outra_cidade:['🗺','Despesa em outra cidade'],
        compra_domingo:['📆','Compra no domingo'],compra_madrugada:['🌙','Despesa de madrugada']};
      var iso=function(x){return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
      var segunda=function(s){var x=new Date(s+'T12:00:00');x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)};
      var mais=function(s,n){var x=new Date(s+'T12:00:00');x.setDate(x.getDate()+n);return iso(x)};
      var ddm=function(s){return s.slice(8,10)+'/'+s.slice(5,7)};
      var somaS=function(a,f){return a.reduce(function(t,x){return t+Number(x[f]||0)},0)};
      var irPag=function(){var a=document.querySelector('[data-obras-pag="pag"]');if(a)a.click()};
      var ABERTO={};

      cardAuditoria=function(){
        var ids={};C.forEach(function(r){ids[r.id]=r});
        var com=Object.keys(AUD).filter(function(id){return ids[id]});
        var gv=function(id){return Math.max.apply(null,(AUD[id]||[]).map(function(k){return (REGRAS[k]||{}).g||1}))};
        var gr=com.filter(function(id){return gv(id)>=3}),md=com.filter(function(id){return gv(id)===2}),lv=com.filter(function(id){return gv(id)<=1});
        var vl=function(l){return l.reduce(function(t,id){return t+(Number(ids[id].valor)||0)},0)};
        var ach=X.achados.filter(function(a){return ids[a.comprovante_id]});
        var crit=ach.filter(function(a){return a.nivel==='critico'});
        var vivos=C.filter(function(r){return r.status!=='cancelado'}),conf=vivos.filter(function(r){return r.revisado}).length,pct=vivos.length?Math.round(conf/vivos.length*100):100;
        var porRegra={};ach.forEach(function(a){(porRegra[a.regra]=porRegra[a.regra]||[]).push(a)});
        var srv=Object.keys(porRegra).map(function(k){var l=porRegra[k];return {k:k,l:l,crit:l.some(function(a){return a.nivel==='critico'}),v:l.reduce(function(t,a){return t+(Number(ids[a.comprovante_id].valor)||0)},0)}})
          .sort(function(a,b){return (b.crit-a.crit)||(b.l.length-a.l.length)});
        var lin=Object.keys(REGRAS).map(function(k){var its=C.filter(function(r){return (AUD[r.id]||[]).indexOf(k)>=0});return {k:k,R:REGRAS[k],n:its.length,v:soma(its)}}).filter(function(x){return x.n});
        var dp=difPrest().filter(function(x){return x.dif!=null&&Math.abs(x.dif)>=0.01});
        var linha=function(x){return '<div class="aud-r '+(x.R.g>=3?'alta':x.R.g==2?'media':'baixa')+'" data-aud="'+x.k+'"><span class="ic">'+x.R.i+'</span><div class="tx"><b>'+x.R.t+' <em>'+x.n+'</em><button class="ib" data-ex title="O que fazer">?</button></b><small class="ex">'+x.R.e+'</small></div><span class="vv">'+brl(x.v)+'</span></div>'};
        var grupo=function(t,l){return l.length?'<div class="aud2-t">'+t+' <small>'+l.length+' tipo(s)</small></div>'+l.map(linha).join(''):''};
        var itens=function(x){return '<div class="aud2-lista" id="srv_'+x.k+'"'+(ABERTO[x.k]?'':' hidden')+'>'+x.l.slice(0,80).map(function(a){var r=ids[a.comprovante_id];
          return '<div class="aud2-it"><span class="dt">'+dbr(r.data_despesa)+'</span><span><b>'+esc(r.fornecedor||'—')+'</b> · '+esc(r.remetente||'')+'<span class="m">'+esc(String(a.mensagem||'').slice(0,220))+'</span></span><span class="vl">'+brl(r.valor)+'</span>'+(r.arquivo_path?'<button data-foto="'+r.id+'">ver foto</button>':'<span></span>')+'</div>'}).join('')+
          (x.l.length>80?'<div class="aud2-it"><span></span><span class="m">mostrando 80 de '+x.l.length+'</span></div>':'')+'</div>'};
        return '<div class="aud"><div class="aud-h"><div><h2>🛡 Auditoria de obra</h2><p>Comece pelos vermelhos. Toque numa linha para ver os comprovantes.</p></div></div>'+
          '<div class="aud2-res">'+
            '<div class="r" data-aud="*"><span>Graves</span><b>'+gr.length+'</b><small>'+brl(vl(gr))+'</small></div>'+
            '<div class="a" data-aud="*"><span>Atenção</span><b>'+md.length+'</b><small>'+brl(vl(md))+'</small></div>'+
            '<div class="l" data-aud="*"><span>Leves</span><b>'+lv.length+'</b><small>'+brl(vl(lv))+'</small></div>'+
            '<div class="v" data-irsrv="1"><span>Agente Auditor</span><b>'+ach.length+'</b><small>'+crit.length+' crítico(s)</small></div>'+
            '<div class="g" data-revisar="1"><span>Conferidos</span><b>'+pct+'%</b><small>'+(vivos.length-conf)+' a revisar</small></div></div>'+
          (dp.length?'<div class="aud2-t">Prestações de contas</div><div class="aud-r alta" data-tab="prest"><span class="ic">⚖</span><div class="tx"><b>Diferença entre declarado e comprovado <em>'+dp.length+'</em></b><small>'+dp.map(function(x){return esc(x.p.numero)+': '+(x.dif<0?'faltam ':'sobram ')+brl(Math.abs(x.dif))}).join(' · ')+'</small></div><span class="vv">'+brl(dp.reduce(function(s,x){return s+Math.abs(x.dif)},0))+'</span></div>':'')+
          '<div class="aud2-t" id="audSrv">🤖 Agente Auditor <small>'+(X.em?ach.length+' ponto(s) em aberto':'carregando…')+'</small></div>'+
          (srv.length?srv.map(function(x){var s=SRV[x.k]||['•',x.k];return '<div class="aud-r '+(x.crit?'alta':'media')+'" data-srv="'+x.k+'"><span class="ic">'+s[0]+'</span><div class="tx"><b>'+s[1]+' <em>'+x.l.length+'</em></b><small>'+(x.crit?'crítico':'atenção')+' · toque para '+(ABERTO[x.k]?'fechar':'ver a lista')+'</small></div><span class="vv">'+brl(x.v)+'</span></div>'+itens(x)}).join(''):(X.em?'<div class="empty">Nenhum ponto em aberto do Agente Auditor.</div>':''))+
          grupo('⛔ Graves',lin.filter(function(x){return x.R.g>=3}))+grupo('⚠ Atenção',lin.filter(function(x){return x.R.g==2}))+grupo('ℹ Leves',lin.filter(function(x){return x.R.g<=1}))+
          (!lin.length&&!dp.length&&!srv.length&&X.em?'<div class="empty">Nenhum alerta nos comprovantes.</div>':'')+
          '<div class="aud-rev"><b>A revisar</b> = comprovante que ainda não foi conferido por uma pessoa. Abra o lançamento, compare com a foto e use <b>“Salvar e marcar revisado”</b>.</div></div>';
      };

      renderGeral=function(){
        auditar();carregarExtra();
        var lan=C.filter(conta),vivos=C.filter(function(r){return r.status!=='cancelado'}),rev=vivos.filter(function(r){return !r.revisado});
        var pct=vivos.length?Math.round((vivos.length-rev.length)/vivos.length*100):100;
        var dup=C.filter(function(r){return r.status==='duplicada'}),alertas=C.filter(function(r){return (AUD[r.id]||[]).length});
        var graves=C.filter(function(r){return (AUD[r.id]||[]).some(function(k){return REGRAS[k].g>=3})});
        var S=X.saldos,aPagar=somaS(S,'saldo_devedor'),caixa=S.reduce(function(t,s){return t+Number(s.adiantamento_disponivel||0)-Number(s.em_aberto||0)},0);
        var reg=function(k){return C.filter(function(r){return (AUD[r.id]||[]).indexOf(k)>=0})};
        var kp=function(cls,l,its,f,tab){return '<div class="kpi '+cls+'" '+(tab?'data-tab="'+tab+'"':'data-f="'+dd(f)+'"')+'><span>'+l+'</span><b>'+its.length+'</b><small>'+brl(soma(its))+'</small></div>'};
        $('kpis').innerHTML='<div class="heroes">'+
          hero('g','Despesas comprovadas',kbrl(soma(lan)),lan.length+' comprovantes lançados',{st:'lancado'})+
          '<div class="hero '+(aPagar>0.005?'w':'g')+'" data-pag="1"><div class="hl">A pagar hoje</div><div class="hv">'+(X.em?brl(aPagar):'…')+'</div><div class="hn">caixa com os prestadores '+(X.em?brl(caixa):'…')+'</div></div>'+
          hero(graves.length?'b':'w','Alertas de auditoria',alertas.length,graves.length+' graves · '+brl(soma(graves))+' em risco',{tab:'aud'})+
          '<div class="hero n" data-f="'+dd({st:'revisar'})+'"><div class="hl">Conferidos por uma pessoa</div><div class="hv">'+pct+'%</div><div class="hbar"><i style="width:'+pct+'%"></i></div><div class="hn">'+rev.length+' a revisar de '+vivos.length+'</div></div>'+
          '</div><div class="kpis">'+
          '<div class="kpi" data-f="'+dd({})+'"><span>Comprovantes</span><b>'+C.length+'</b><small>'+kbrl(soma(C))+'</small></div>'+
          kp(dup.length?'b':'g','Duplicidades',dup,{aud:'duplicidade'})+kp('b','Itens pessoais',reg('pessoal'),{aud:'pessoal'})+
          kp('b','Verba trabalhista',reg('trabalhista'),{aud:'trabalhista'})+kp('w','Sem nota fiscal',reg('sem_fiscal'),{aud:'sem_fiscal'})+
          '<div class="kpi g" data-tab="prest"><span>Prestações</span><b>'+P.length+'</b><small>'+kbrl(P.reduce(function(s,p){return s+(Number(p.valor_declarado)||0)},0))+' declarado</small></div>'+
          '</div>';
        $('kpis').querySelectorAll('[data-f]').forEach(function(k){k.onclick=function(){aplicar(JSON.parse(k.dataset.f))}});
        $('kpis').querySelectorAll('[data-tab]').forEach(function(k){k.onclick=function(){aba(k.dataset.tab)}});
        $('kpis').querySelectorAll('[data-pag]').forEach(function(k){k.onclick=irPag});
        // Auditoria
        $('audit').innerHTML=cardAuditoria();
        var au=$('audit');
        au.querySelectorAll('[data-aud]').forEach(function(el){el.onclick=function(){aplicar({aud:el.dataset.aud})}});
        au.querySelectorAll('[data-tab]').forEach(function(el){el.onclick=function(){aba(el.dataset.tab)}});
        au.querySelectorAll('[data-ex]').forEach(function(el){el.onclick=function(ev){ev.stopPropagation();el.closest('.aud-r').classList.toggle('ver')}});
        au.querySelectorAll('[data-srv]').forEach(function(el){el.onclick=function(){var k=el.dataset.srv;ABERTO[k]=!ABERTO[k];var l=$('srv_'+k);if(l)l.hidden=!ABERTO[k]}});
        au.querySelectorAll('[data-foto]').forEach(function(el){el.onclick=function(ev){ev.stopPropagation();var r=C.find(function(x){return x.id===el.dataset.foto});if(r)verArquivo(r)}});
        au.querySelectorAll('[data-irsrv]').forEach(function(el){el.onclick=function(){var t=$('audSrv');if(t)t.scrollIntoView({behavior:'smooth',block:'start'})}});
        au.querySelectorAll('[data-revisar]').forEach(function(el){el.onclick=function(){aplicar({st:'revisar'})}});
        var nA=$('navAud');if(nA)nA.innerHTML=alertas.length?'<em>'+alertas.length+'</em>':'';
        // Gráficos
        var ch=[];
        if(lan.length){
          var sem={};lan.forEach(function(r){if(!r.data_despesa)return;var s=segunda(r.data_despesa);sem[s]=(sem[s]||0)+(Number(r.valor)||0)});
          var ks=Object.keys(sem).sort().slice(-12);
          ch.push(cc('Despesas por semana · segunda a domingo',colsR(ks.map(function(s){return {l:ddm(s),v:sem[s],f:{st:'lancado',de:s,ate:mais(s,6)}}})),1));
          ch.push(cc('Por categoria',donutR(agrupa(lan,function(r){return r.categoria}).map(function(e){return {l:CATS[e[0]]||e[0],v:e[1],f:{st:'lancado',cat:e[0]}}}),'comprovado')));
          ch.push(cc('Por responsável',donutR(agrupa(lan,function(r){return r.remetente||'—'}).map(function(e){return {l:e[0],v:e[1],f:{st:'lancado',rem:e[0]}}}),'por pessoa')));
          ch.push(cc('Forma de pagamento',donutR(agrupa(lan,function(r){return r.forma_pagamento||'nao_informada'}).map(function(e){return {l:FP[e[0]]||'Não informada',v:e[1],f:{st:'lancado',fp:e[0]},c:{pix:COR.aqua,dinheiro:COR.warn,cartao_debito:COR.blue,cartao_credito:COR.violet,transferencia:COR.orange}[e[0]]||COR.gray}}),'pagamentos')));
          ch.push(cc('Tipo de comprovante',donutR(agrupa(lan,TDf).map(function(e){return {l:e[0],v:e[1],f:{st:'lancado',td:e[0]},c:{'Nota/cupom fiscal':COR.ok,'Só comprovante PIX':COR.aqua,'App de corrida / cartão':COR.blue,'Recibo (sem nota)':COR.warn,'Outros':COR.gray}[e[0]]}}),'documentos')));
          ch.push(cc('Por loja / obra',hbars(agrupa(lan,function(r){return r.loja||'Sem loja'}).slice(0,10).map(function(e){return {l:e[0],v:e[1],f:{st:'lancado',loja:e[0]}}}))));
          ch.push(cc('Maiores fornecedores',hbars(agrupa(lan,function(r){return r.fornecedor||'—'}).slice(0,10).map(function(e){return {l:e[0],v:e[1],f:{st:'lancado',forn:e[0]}}}),COR.violet)));
          ch.push(cc('Despesas por mês',colsR(agrupa(lan,function(r){return (r.data_despesa||'').substring(0,7)}).filter(function(e){return e[0]}).sort(function(a,b){return a[0]<b[0]?-1:1}).map(function(e){return {l:e[0].split('-').reverse().join('/'),v:e[1],f:{st:'lancado',mes:e[0]}}}))));
        }
        var dp=difPrest(),mx=Math.max.apply(null,[1].concat(dp.map(function(y){return Math.max(Number(y.p.valor_declarado)||0,y.cp)})));
        if(dp.length)ch.push(cc('Prestações — declarado × comprovado',dp.map(function(x){return '<div class="pb" data-prest="'+x.p.id+'"><span class="l">'+esc(x.p.numero)+'</span><div class="pbb"><i class="d" style="width:'+((Number(x.p.valor_declarado)||0)/mx*100)+'%"></i><i class="c" style="width:'+(x.cp/mx*100)+'%"></i></div><span class="v">'+(x.p.valor_declarado!=null?brl(x.p.valor_declarado):'sem capa')+'<small>'+(x.n?brl(x.cp)+(x.dif!=null&&Math.abs(x.dif)>=0.01?' <em class="'+(x.dif<0?'neg':'pos')+'">('+(x.dif<0?'−':'+')+brl(Math.abs(x.dif))+')</em>':' ✓'):'não lançada')+'</small></span></div>'}).join('')+'<p class="legp"><i class="d"></i> declarado na capa <i class="c"></i> comprovado pelas fotos</p>',1));
        $('charts').innerHTML=ch.join('');
        $('charts').querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){aplicar(JSON.parse(b.dataset.f))}});
        $('charts').querySelectorAll('[data-prest]').forEach(function(b){b.onclick=function(){aplicar({prest:b.dataset.prest})}});
      };
      if(C&&C.length)renderGeral();
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
  function varrer(){docs(window,[],0).forEach(function(d){try{vigiarPdf(d);vigiarRelatorios(d);if(ehModuloObras(d)){paginarComprovantes(d);melhorarAbas(d);if(d.__melhorAbas)buscadorDashboard(d)}if(!d.__obrasPagamentos&&ehModuloObras(d))instalar(d)}catch(e){console.warn('[Portal] Obras pagamentos:',e)}})}
  setInterval(varrer,1500);if(document.readyState!=='loading')varrer();else document.addEventListener('DOMContentLoaded',varrer);
})();
