// Almoxarifado · Consumo por Item
// Busca simples: digita parte do nome do item (ex.: "embal"), escolhe a loja (ou todas)
// e vê o consumo mês a mês, total e média mensal. Lê os dados já carregados no módulo
// (dbConsumoRaw: Qtd Atendida / Custo Atendido). Não altera nada no módulo.
(function(){
  if(window.__almoxConsumoItemPatch)return;
  window.__almoxConsumoItemPatch='2026-11-06.2';

  var MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  var state={itensMarcados:null,ultimoTermo:null};
  // Proposta Sulnove nº 010145 (29/10/2026) · BOPP Metalizado espessura 0,004 · preço por milheiro.
  // P=30x40, M=40x50, G=50x60. DIFAL de 13,5% somado ao custo unitário.
  // Logo oficial da Esposende (regra: todo relatório sai com a logo).
  var LOGO_B64='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';
  var DIFAL=0.135;
  var PROPOSTA={
    '11314':{tam:'P · 30x40',milheiro:331.00},
    '11315':{tam:'M · 40x50',milheiro:535.75},
    '11316':{tam:'G · 50x60',milheiro:799.50}
  };
  function unitProposta(cod){var p=PROPOSTA[String(cod||'').trim()];return p?p.milheiro/1000*(1+DIFAL):null;}

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();}
  function limpa(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function n0(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});}
  function n1(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:1});}
  function brl(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function codLoja(t){var m=String(t||'').trim().match(/^(\d+)/);return m?String(parseInt(m[1],10)):norm(t);}
  function mesKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function mesLabel(k){var p=k.split('-');return MESES[Number(p[1])-1]+'/'+p[0].slice(2);}

  function moduloAlm(){
    var ifr=document.getElementById('ifr-alm');
    var w=ifr&&ifr.contentWindow;
    if(!w||!w.document||!w.document.body)return null;
    return {ifr:ifr,w:w,doc:w.document};
  }
  function dados(){
    var m=moduloAlm();if(!m)return {rows:[],reg:{}};
    var rows=[],reg={};
    try{rows=m.w.eval("typeof dbConsumoRaw!=='undefined'?dbConsumoRaw:[]")||[];}catch(e){}
    try{reg=m.w.eval("typeof dbRegionaisMap!=='undefined'?dbRegionaisMap:{}")||{};}catch(e){}
    return {rows:rows,reg:reg};
  }
  function regionalDe(reg,loja){
    var c=codLoja(loja);
    return String(reg[c]||reg[String(c).padStart(3,'0')]||reg[loja]||'NÃO MAPEADO').toUpperCase();
  }
  function linhas(){
    var d=dados(),out=[];
    d.rows.forEach(function(r){
      var dt=r['Data Solicitação']?new Date(r['Data Solicitação']):null;
      if(!dt||isNaN(dt.getTime()))return;
      var loja=limpa(r['Empresa Solicitante']);
      out.push({
        mes:mesKey(dt),
        loja:loja,
        cod:codLoja(loja),
        reg:regionalDe(d.reg,loja),
        item:limpa(r['Insumo']),
        codigo:limpa(r['Código']),
        qtd:Number(r['Qtd Atendida'])||0,
        custo:Number(r.__custoSeta!=null?r.__custoSeta:r['Custo Atendido'])||0,
        custoNovo:(function(){var u=unitProposta(r['Código']);return u==null?(Number(r['Custo Atendido'])||0):Math.round((Number(r['Qtd Atendida'])||0)*u*100)/100;})(),
        temProposta:unitProposta(r['Código'])!=null
      });
    });
    return out;
  }
  function mesesEntre(a,b){
    var out=[];if(!a||!b||a>b)return out;
    var p=a.split('-').map(Number),y=p[0],m=p[1];
    while(true){var k=y+'-'+String(m).padStart(2,'0');out.push(k);if(k>=b||out.length>36)break;m++;if(m>12){m=1;y++;}}
    return out;
  }

  // ---------- Interface ----------
  var CSS=''
  +'#aci-ov{position:fixed;inset:0;z-index:2147483600;background:rgba(3,8,16,.82);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;font-family:Inter,Arial,sans-serif}'
  +'#aci-box{background:#0b1626;color:#e8f0fa;border:1px solid #24405f;border-radius:14px;width:min(1400px,100%);box-shadow:0 20px 60px rgba(0,0,0,.6)}'
  +'#aci-box .aci-hd{display:flex!important;flex-direction:row!important;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #1d3550;position:static!important}'+'#aci-box .aci-tit{flex:1 1 auto;min-width:0}#aci-box .aci-tit b{display:block;font-size:18px;color:#fff}#aci-box .aci-tit small{display:block;color:#8ca4bf;font-size:12px;margin-top:2px}'+'#aci-box .aci-acoes{display:flex!important;flex-direction:row!important;gap:8px;flex:0 0 auto;align-items:center}'+'#aci-box .aci-acoes button{position:static!important;display:inline-block!important;width:auto!important;margin:0!important;white-space:nowrap}'
  +'#aci-box button{background:#15304d;color:#fff;border:1px solid #2f5478;border-radius:8px;padding:8px 13px;font-weight:700;cursor:pointer;font-size:13px}'
  +'#aci-box button.aci-pri{background:#0e7c66;border-color:#14a386}#aci-box button:hover{filter:brightness(1.15)}'
  +'#aci-box .aci-flt{display:grid;grid-template-columns:2fr 1.3fr 1fr .8fr .8fr;gap:12px;padding:14px 18px;align-items:end}'
  +'#aci-box label{display:block;font-size:11px;color:#8ca4bf;font-weight:700;letter-spacing:.04em;margin-bottom:5px;text-transform:uppercase}'
  +'#aci-box input,#aci-box select{width:100%;box-sizing:border-box;background:#06101c;color:#fff;border:1px solid #2a4867;border-radius:8px;padding:9px 10px;font-size:14px}'
  +'#aci-box input#aci-q{font-size:16px;border-color:#14a386}'
  +'#aci-itens{margin:0 18px;padding:8px 10px;background:#081322;border:1px solid #1d3550;border-radius:8px;max-height:150px;overflow:auto;font-size:13px}'
  +'#aci-itens .aci-it{display:flex;gap:8px;align-items:center;padding:3px 0}#aci-itens input{width:auto}'
  +'#aci-itens .aci-top{display:flex;gap:14px;font-size:12px;color:#5fd3b8;margin-bottom:4px}#aci-itens .aci-top a{cursor:pointer}'
  +'#aci-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px 18px}'
  +'#aci-kpi div{background:#081322;border:1px solid #1d3550;border-radius:10px;padding:12px}#aci-kpi span{display:block;font-size:11px;color:#8ca4bf;font-weight:700}#aci-kpi b{font-size:22px}'
  +'#aci-res{padding:0 18px 18px}#aci-res h3{font-size:14px;margin:16px 0 8px;color:#bcd0e6}'
  +'#aci-res table{width:100%;border-collapse:collapse;font-size:12.5px}'
  +'#aci-res th{background:#13253c;color:#cfe0f2;padding:8px;text-align:right;position:sticky;top:0;white-space:nowrap}#aci-res th:first-child{text-align:left}'
  +'#aci-res table,#aci-res td{color:#e8f0fa}#aci-res td{padding:6px 8px;border-bottom:1px solid #16293f;text-align:right;white-space:nowrap}#aci-res td:first-child{text-align:left;white-space:normal}'
  +'#aci-res td small{display:block;color:#7f97b2;font-size:11px}#aci-res tr.aci-tot td{font-weight:800;background:#0f2136}'
  +'#aci-res td.aci-med{color:#5fd3b8;font-weight:800}#aci-res .aci-vazio{color:#8ca4bf;padding:20px;text-align:center}'
  +'#aci-res .aci-wrap{max-height:420px;overflow:auto;border:1px solid #1d3550;border-radius:8px}'
  +'@media(max-width:900px){#aci-box .aci-flt{grid-template-columns:1fr 1fr}#aci-kpi{grid-template-columns:1fr 1fr}}';

  function abrir(){
    var ov=document.getElementById('aci-ov');
    if(ov){ov.style.display='flex';montarFiltros(false);calcular();return;}
    if(!document.getElementById('aci-css')){var st=document.createElement('style');st.id='aci-css';st.textContent=CSS;document.head.appendChild(st);}
    ov=document.createElement('div');ov.id='aci-ov';
    ov.innerHTML='<div id="aci-box">'
      +'<div class="aci-hd"><img src="data:image/jpeg;base64,'+LOGO_B64+'" alt="Esposende" style="height:40px;width:auto;border-radius:6px;flex:0 0 auto"><div class="aci-tit"><b>🔎 Consumo por Item</b><small>Digite o item, escolha a loja (ou todas) e veja o consumo de cada mês e a média mensal</small></div>'
      +'<div class="aci-acoes"><button type="button" id="aci-xls">⬇ Excel</button><button type="button" id="aci-print">🖨 Imprimir</button><button type="button" id="aci-pdf">📄 PDF</button><button type="button" id="aci-fechar">✕ Fechar</button></div></div>'
      +'<div class="aci-flt">'
      +'<div><label>1. Item (parte do nome ou código)</label><input id="aci-q" placeholder="ex.: embalagem de presente" autocomplete="off"></div>'
      +'<div><label>2. Loja</label><select id="aci-loja"></select></div>'
      +'<div><label>Regional</label><select id="aci-reg"></select></div>'
      +'<div><label>De (mês)</label><input type="month" id="aci-de"></div>'
      +'<div><label>Até (mês)</label><input type="month" id="aci-ate"></div>'
      +'</div>'
      +'<div id="aci-itens"><span style="color:#8ca4bf">Digite acima para encontrar os itens.</span></div>'
      +'<div id="aci-kpi"></div><div id="aci-res"></div></div>';
    document.body.appendChild(ov);
    var $=function(id){return document.getElementById(id);};
    $('aci-fechar').onclick=function(){ov.style.display='none';};
    ov.addEventListener('click',function(e){if(e.target===ov)ov.style.display='none';});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.style.display!=='none')ov.style.display='none';});
    var t;$('aci-q').addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){state.itensMarcados=null;listarItens();calcular();},200);});
    ['aci-loja','aci-reg','aci-de','aci-ate'].forEach(function(id){$(id).addEventListener('change',function(){if(id==='aci-reg')montarLojas();calcular();});});
    $('aci-xls').onclick=exportar;
    $('aci-print').onclick=function(){imprimir(false);};$('aci-pdf').onclick=function(){imprimir(true);};
    montarFiltros(true);
    setTimeout(function(){$('aci-q').focus();},50);
  }

  function montarFiltros(inicial){
    var L=linhas(),$=function(id){return document.getElementById(id);};
    var regs={};L.forEach(function(l){regs[l.reg]=1;});
    var selR=$('aci-reg'),vR=selR.value;
    selR.innerHTML='<option value="">Todas</option>'+Object.keys(regs).sort().map(function(r){return '<option>'+esc(r)+'</option>';}).join('');
    selR.value=vR||'';
    montarLojas();
    if(inicial&&L.length){
      var ms=L.map(function(l){return l.mes;}).sort();
      var max=ms[ms.length-1],min=ms[0];
      var p=max.split('-').map(Number),d=new Date(p[0],p[1]-1-5,1),de=mesKey(d),ate=max;
      // Usa o mesmo período do filtro de datas do painel, quando houver.
      try{
        var md=moduloAlm(),dts=md?Array.from(md.doc.querySelectorAll('input[type=date]')):[];
        if(dts.length>=2&&dts[0].value)de=dts[0].value.slice(0,7);
        if(dts.length>=2&&dts[1].value)ate=dts[1].value.slice(0,7);
      }catch(e){}
      $('aci-de').value=de<min?min:de;$('aci-ate').value=ate;
    }
  }
  function montarLojas(){
    var L=linhas(),$=function(id){return document.getElementById(id);};
    var reg=$('aci-reg').value,lojas={};
    L.forEach(function(l){if(!reg||l.reg===reg)lojas[l.loja]=l.cod;});
    var sel=$('aci-loja'),v=sel.value;
    var lista=Object.keys(lojas).sort(function(a,b){return Number(lojas[a])-Number(lojas[b])||a.localeCompare(b);});
    sel.innerHTML='<option value="">★ Todas as lojas</option>'+lista.map(function(l){return '<option>'+esc(l)+'</option>';}).join('');
    sel.value=lista.indexOf(v)>=0?v:'';
  }
  function itensQueBatem(){
    var q=norm(document.getElementById('aci-q').value);
    if(!q)return [];
    var partes=q.split(' ').filter(Boolean),mapa={};
    linhas().forEach(function(l){
      var alvo=norm(l.item+' '+l.codigo);
      if(partes.every(function(p){return alvo.indexOf(p)>=0;}))mapa[l.item]=l.codigo;
    });
    return Object.keys(mapa).sort().map(function(i){return {item:i,codigo:mapa[i]};});
  }
  function listarItens(){
    var box=document.getElementById('aci-itens'),its=itensQueBatem();
    if(!document.getElementById('aci-q').value.trim()){box.innerHTML='<span style="color:#8ca4bf">Digite acima para encontrar os itens.</span>';return;}
    if(!its.length){box.innerHTML='<span style="color:#ff8a8a">Nenhum item encontrado com esse texto.</span>';return;}
    if(!state.itensMarcados)state.itensMarcados=new Set(its.map(function(i){return i.item;}));
    box.innerHTML='<div class="aci-top">'+its.length+' item(ns) encontrado(s) · <a id="aci-todos">marcar todos</a><a id="aci-nenhum">desmarcar</a></div>'
      +its.map(function(i,ix){return '<label class="aci-it" style="text-transform:none;font-size:13px;color:#e8f0fa;font-weight:400;margin:0"><input type="checkbox" data-i="'+ix+'"'+(state.itensMarcados.has(i.item)?' checked':'')+'> '+esc(i.codigo?i.codigo+' — ':'')+esc(i.item)+'</label>';}).join('');
    box.querySelectorAll('input').forEach(function(cb){cb.onchange=function(){var it=its[Number(cb.dataset.i)].item;if(cb.checked)state.itensMarcados.add(it);else state.itensMarcados.delete(it);calcular();};});
    document.getElementById('aci-todos').onclick=function(){state.itensMarcados=new Set(its.map(function(i){return i.item;}));listarItens();calcular();};
    document.getElementById('aci-nenhum').onclick=function(){state.itensMarcados=new Set();listarItens();calcular();};
  }

  var ultimo=null;
  function calcular(){
    var $=function(id){return document.getElementById(id);};
    if(!$('aci-res'))return;
    var termo=$('aci-q').value.trim();
    if(state.itensMarcados===null||termo!==state.ultimoTermo){state.ultimoTermo=termo;listarItens();}
    var kpi=$('aci-kpi'),res=$('aci-res');
    var L=linhas();
    if(!L.length){kpi.innerHTML='';res.innerHTML='<div class="aci-vazio">Os dados do Almoxarifado ainda não carregaram. Abra o módulo e aguarde a sincronização.</div>';ultimo=null;return;}
    if(!termo||!state.itensMarcados||!state.itensMarcados.size){kpi.innerHTML='';res.innerHTML='<div class="aci-vazio">Digite o nome do item (ex.: <b>embalagem</b>) para ver o consumo.</div>';ultimo=null;return;}
    var loja=$('aci-loja').value,reg=$('aci-reg').value,de=$('aci-de').value,ate=$('aci-ate').value;
    var meses=mesesEntre(de,ate);
    var base='prop';var V=function(l){return base==='prop'?l.custoNovo:l.custo;};
    var sel=L.filter(function(l){
      return state.itensMarcados.has(l.item)&&(!loja||l.loja===loja)&&(!reg||l.reg===reg)&&(!de||l.mes>=de)&&(!ate||l.mes<=ate);
    });
    // Média: meses fechados do período (o mês corrente, ainda em andamento, não entra).
    var atual=mesKey(new Date());
    var fechados=meses.filter(function(m){return m<atual;});
    var div=fechados.length||meses.length||1;
    function agrupa(chave){
      var g={};
      sel.forEach(function(l){
        var k=l[chave];g[k]=g[k]||{nome:k,meses:{},qtd:0,custo:0,qMed:0};
        var c=g[k].meses[l.mes]=g[k].meses[l.mes]||{q:0,v:0};
        c.q+=l.qtd;c.v+=V(l);g[k].qtd+=l.qtd;g[k].custo+=V(l);
        if(!fechados.length||l.mes<atual)g[k].qMed+=l.qtd;
      });
      return Object.keys(g).map(function(k){return g[k];});
    }
    var porItem=agrupa('item').sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var porLoja=agrupa('loja').sort(function(a,b){return b.qtd-a.qtd;});
    var totQ=0,totV=0,totMed=0,totM={},totAtual=0,nProp=0;
    sel.forEach(function(l){totQ+=l.qtd;totV+=V(l);totAtual+=l.custo;if(l.temProposta)nProp++;if(!fechados.length||l.mes<atual)totMed+=l.qtd;var c=totM[l.mes]=totM[l.mes]||{q:0,v:0};c.q+=l.qtd;c.v+=V(l);});
    kpi.innerHTML='<div><span>CONSUMO TOTAL NO PERÍODO</span><b>'+n0(totQ)+' un.</b></div>'
      +'<div><span>MÉDIA MENSAL ('+div+' '+(div>1?'meses fechados':'mês')+')</span><b style="color:#5fd3b8">'+n0(totMed/div)+' un./mês</b></div>'
      +'<div><span>CUSTO TOTAL</span><b>'+brl(totV)+'</b></div>'
      +'<div><span>LOJAS QUE PEDIRAM</span><b>'+porLoja.length+'</b></div>';
    if(!sel.length){res.innerHTML='<div class="aci-vazio">Nenhum consumo desse(s) item(ns) no período/loja escolhidos.</div>';ultimo=null;return;}
    function tabela(titulo,grupos,comValor){
      var h='<h3>'+titulo+'</h3><div class="aci-wrap"><table><thead><tr><th>'+(grupos===porItem?'ITEM':'LOJA')+'</th>'
        +meses.map(function(m){return '<th>'+mesLabel(m)+(m>=atual?' *':'')+'</th>';}).join('')+'<th>TOTAL</th><th>MÉDIA/MÊS</th></tr></thead><tbody>';
      grupos.forEach(function(g){
        h+='<tr><td>'+esc(g.nome)+'</td>'+meses.map(function(m){var c=g.meses[m];return '<td>'+(c?n0(c.q)+(comValor?'<small>'+brl(c.v)+'</small>':''):'—')+'</td>';}).join('')
          +'<td><b>'+n0(g.qtd)+'</b>'+(comValor?'<small>'+brl(g.custo)+'</small>':'')+'</td><td class="aci-med">'+n1(g.qMed/div)+'</td></tr>';
      });
      h+='<tr class="aci-tot"><td>TOTAL</td>'+meses.map(function(m){var c=totM[m];return '<td>'+(c?n0(c.q)+(comValor?'<small>'+brl(c.v)+'</small>':''):'—')+'</td>';}).join('')
        +'<td>'+n0(totQ)+(comValor?'<small>'+brl(totV)+'</small>':'')+'</td><td class="aci-med">'+n1(totMed/div)+'</td></tr></tbody></table></div>';
      return h;
    }
    var onde=loja?loja:(reg?'Regional '+reg:'todas as lojas');
    var html=tabela('Consumo mensal por item — '+esc(onde),porItem,true);
    if(!loja)html+=tabela('Consumo por loja (soma dos itens marcados) — '+esc(onde),porLoja,false);
    if(meses.some(function(m){return m>=atual;}))html+='<div style="color:#8ca4bf;font-size:11px;margin-top:8px">* mês em andamento — aparece na tabela, mas não entra na média mensal.</div>';
    res.innerHTML=html;
    ultimo={meses:meses,porItem:porItem,porLoja:porLoja,div:div,onde:onde,loja:loja,totQ:totQ,totV:totV,totMed:totMed,totM:totM};
  }

  // Excel (.xlsx) com a logo da Esposende no topo de cada aba. Regra: todo relatório leva a logo.
  function exportar(){
    if(!ultimo){alert('Faça uma busca primeiro.');return;}
    var btn=document.getElementById('aci-xls');if(btn){btn.disabled=true;btn.textContent='Gerando...';}
    function fim(){if(btn){btn.disabled=false;btn.textContent='⬇ Excel';}}
    carregarExcelJS(function(ok){
      if(!ok){fim();exportarCSV();return;}
      try{montarXlsx().then(fim,function(e){console.error(e);fim();exportarCSV();});}catch(e){console.error(e);fim();exportarCSV();}
    });
  }
  function carregarExcelJS(cb){
    if(window.ExcelJS)return cb(true);
    var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload=function(){cb(!!window.ExcelJS);};s.onerror=function(){cb(false);};document.head.appendChild(s);
  }
  function montarXlsx(){
    var u=ultimo,wb=new window.ExcelJS.Workbook();
    var logoId=wb.addImage({base64:'data:image/jpeg;base64,'+LOGO_B64,extension:'jpeg'});
    var termo=document.getElementById('aci-q').value,gerado=new Date().toLocaleString('pt-BR');
    var NAVY='FF14284A';
    function aba(nome,titulo,grupos,col,comValor){
      var ws=wb.addWorksheet(nome,{views:[{state:'frozen',ySplit:7,showGridLines:false}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
      var ncol=1+u.meses.length+(comValor?3:2);
      ws.getColumn(1).width=42;for(var c=2;c<=ncol;c++)ws.getColumn(c).width=13;
      ws.getRow(1).height=24;ws.getRow(2).height=18;ws.getRow(3).height=18;
      ws.addImage(logoId,{tl:{col:0.1,row:0.2},ext:{width:220,height:60}});
      ws.getCell('B1').value='Almoxarifado — Consumo por Item';ws.getCell('B1').font={bold:true,size:15,color:{argb:NAVY}};
      ws.getCell('B2').value=titulo+' · busca: '+termo;ws.getCell('B2').font={size:10,color:{argb:'FF555555'}};
      ws.getCell('B3').value='Gerado em '+gerado;ws.getCell('B3').font={size:9,color:{argb:'FF777777'}};
      // Cards de valores (linhas 4 e 5)
      var atualX=mesKey(new Date()),custoF=0;u.meses.forEach(function(m){if(m<atualX&&u.totM[m])custoF+=u.totM[m].v;});
      if(!u.meses.some(function(m){return m<atualX;}))custoF=u.totV;
      var kp=[['CONSUMO TOTAL',Math.round(u.totQ),'#,##0" un."','FF14284A'],['MÉDIA MENSAL',Math.round(u.totMed/u.div),'#,##0" un./mês"','FF0E7C66'],['CUSTO TOTAL',u.totV,'"R$" #,##0.00','FFB45309'],['CUSTO MÉDIO/MÊS',custoF/u.div,'"R$" #,##0.00','FF7C3AED'],['LOJAS',u.porLoja.length,'0','FFBE123C']];
      ws.getRow(4).height=16;ws.getRow(5).height=26;
      kp.forEach(function(k,ix){
        var c1=2+ix*2,c2=c1+1;
        ws.mergeCells(4,c1,4,c2);ws.mergeCells(5,c1,5,c2);
        var a=ws.getCell(4,c1),b=ws.getCell(5,c1);
        a.value=k[0];a.font={bold:true,size:8,color:{argb:'FF5B6B80'}};
        b.value=k[1];b.numFmt=k[2];b.font={bold:true,size:14,color:{argb:k[3]}};
        [a,b].forEach(function(c){c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F6FA'}};c.alignment={horizontal:'left',vertical:'middle',indent:1};});
        a.border={top:{style:'thick',color:{argb:k[3]}},left:{style:'thin',color:{argb:'FFD9E1EC'}},right:{style:'thin',color:{argb:'FFD9E1EC'}}};
        b.border={bottom:{style:'thin',color:{argb:'FFD9E1EC'}},left:{style:'thin',color:{argb:'FFD9E1EC'}},right:{style:'thin',color:{argb:'FFD9E1EC'}}};
      });
      var cab=[col].concat(u.meses.map(mesLabel)).concat(comValor?['TOTAL QTD','TOTAL R$','MÉDIA/MÊS']:['TOTAL','MÉDIA/MÊS']);
      var hr=ws.getRow(7);hr.values=cab;hr.height=20;
      hr.eachCell(function(cell){cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:NAVY}};cell.alignment={horizontal:'center',vertical:'middle'};});
      function linha(nome,meses,qtd,custo,med,tot){
        var vals=[nome].concat(u.meses.map(function(m){return meses[m]?meses[m].q:null;})).concat(comValor?[qtd,custo,med]:[qtd,med]);
        var r=ws.addRow(vals);
        for(var c=2;c<=ncol;c++)r.getCell(c).numFmt='#,##0';
        if(comValor)r.getCell(ncol-1).numFmt='"R$" #,##0.00';
        r.getCell(ncol).numFmt='#,##0.0';
        if(!tot&&r.number%2===0)r.eachCell({includeEmpty:true},function(cell){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}};});
        r.eachCell({includeEmpty:true},function(cell){cell.border={bottom:{style:'hair',color:{argb:'FFD9E1EC'}}};});
        if(tot)r.eachCell(function(cell){cell.font={bold:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2F7'}};});
      }
      grupos.forEach(function(g){linha(g.nome,g.meses,g.qtd,g.custo,g.qMed/u.div,false);});
      linha('TOTAL',u.totM,u.totQ,u.totV,u.totMed/u.div,true);
      if(comValor){
        var r2=ws.addRow([]);r2=ws.addRow(['Custo por mês (R$)'].concat(u.meses.map(function(m){return u.totM[m]?u.totM[m].v:null;})));
        r2.font={italic:true};for(var c2=2;c2<=1+u.meses.length;c2++)r2.getCell(c2).numFmt='"R$" #,##0.00';
      }
    }
    aba('Por item','Consumo por item — '+u.onde,u.porItem,'ITEM',true);
    if(!u.loja)aba('Por loja','Consumo por loja — '+u.onde,u.porLoja,'LOJA',false);
    return wb.xlsx.writeBuffer().then(function(buf){
      var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Esposende_consumo_por_item_'+new Date().toISOString().slice(0,10)+'.xlsx';
      document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},800);
    });
  }
  function exportarCSV(){
    if(!ultimo){alert('Faça uma busca primeiro.');return;}
    var u=ultimo,sep=';',linhasCsv=[];
    function num(v,d){return Number(v||0).toFixed(d||0).replace('.',',');}
    function bloco(titulo,grupos,col){
      if(!linhasCsv.length)linhasCsv.push('ESPOSENDE');linhasCsv.push(titulo);
      linhasCsv.push([col].concat(u.meses.map(mesLabel)).concat(['TOTAL QTD','TOTAL R$','MÉDIA/MÊS']).join(sep));
      grupos.forEach(function(g){
        linhasCsv.push(['"'+g.nome.replace(/"/g,'""')+'"'].concat(u.meses.map(function(m){return num(g.meses[m]?g.meses[m].q:0);})).concat([num(g.qtd),num(g.custo,2),num(g.qMed/u.div,1)]).join(sep));
      });
      linhasCsv.push(['TOTAL'].concat(u.meses.map(function(m){return num(u.totM[m]?u.totM[m].q:0);})).concat([num(u.totQ),num(u.totV,2),num(u.totMed/u.div,1)]).join(sep));
      linhasCsv.push('');
    }
    bloco('Consumo por item - '+u.onde,u.porItem,'ITEM');
    if(!u.loja)bloco('Consumo por loja - '+u.onde,u.porLoja,'LOJA');
    var blob=new Blob(['﻿'+linhasCsv.join('\r\n')],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Esposende_consumo_por_item_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},500);
  }
  function imprimir(pdf){
    if(!ultimo){alert('Faça uma busca primeiro.');return;}
    var w=window.open('','_blank');
    if(!w){alert('Libere pop-ups para imprimir.');return;}
    var u=ultimo,atual=mesKey(new Date());
    var custoFech=0;u.meses.forEach(function(m){if(m<atual&&u.totM[m])custoFech+=u.totM[m].v;});
    if(!u.meses.some(function(m){return m<atual;}))custoFech=u.totV;
    var de=u.meses.length?mesLabel(u.meses[0]):'',ate=u.meses.length?mesLabel(u.meses[u.meses.length-1]):'';
    function card(cor,rot,val,sub){return '<div class="kc" style="border-top-color:'+cor+'"><span>'+rot+'</span><b style="color:'+cor+'">'+val+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>';}
    var cards=card('#14284a','Consumo total no período',n0(u.totQ)+' un.',de+' a '+ate)
      +card('#0e7c66','Média mensal',n0(u.totMed/u.div)+' un./mês',u.div+(u.div>1?' meses fechados':' mês'))
      +card('#b45309','Custo total',brl(u.totV),'no período')
      +card('#7c3aed','Custo médio mensal',brl(custoFech/u.div),'meses fechados')
      +card('#be123c','Lojas que pediram',String(u.porLoja.length),u.loja?esc(u.loja):'');
    var itensCards='';
    if(u.porItem.length>1&&u.porItem.length<=6){
      itensCards='<div class="sec">Resumo por item</div><div class="ic">'+u.porItem.map(function(g){
        var pct=u.totQ?Math.round(g.qtd/u.totQ*100):0;
        return '<div class="icard"><div class="in">'+esc(g.nome)+'</div><div class="iv"><div><span>Quantidade</span><b>'+n0(g.qtd)+'</b></div><div><span>Custo</span><b>'+brl(g.custo)+'</b></div><div><span>Média/mês</span><b>'+n1(g.qMed/u.div)+'</b></div></div><div class="bar"><i style="width:'+pct+'%"></i></div><small>'+pct+'% do consumo</small></div>';
      }).join('')+'</div>';
    }
    function tabela(titulo,grupos,comValor,col){
      var maxQ=0;grupos.forEach(function(g){u.meses.forEach(function(m){if(g.meses[m]&&g.meses[m].q>maxQ)maxQ=g.meses[m].q;});});
      var h='<div class="sec">'+titulo+'</div><table><thead><tr><th>'+col+'</th>'+u.meses.map(function(m){return '<th>'+mesLabel(m)+(m>=atual?'*':'')+'</th>';}).join('')+'<th class="t">Total</th><th class="t">Média/mês</th></tr></thead><tbody>';
      grupos.forEach(function(g){
        h+='<tr><td class="nm">'+esc(g.nome)+'</td>'+u.meses.map(function(m){var c=g.meses[m];if(!c)return '<td class="z">—</td>';return '<td>'+n0(c.q)+(comValor?'<small>'+brl(c.v)+'</small>':'')+'</td>';}).join('')
          +'<td class="t"><b>'+n0(g.qtd)+'</b>'+(comValor?'<small>'+brl(g.custo)+'</small>':'')+'</td><td class="t md">'+n1(g.qMed/u.div)+'</td></tr>';
      });
      h+='<tr class="tt"><td class="nm">TOTAL</td>'+u.meses.map(function(m){var c=u.totM[m];return '<td>'+(c?n0(c.q)+(comValor?'<small>'+brl(c.v)+'</small>':''):'—')+'</td>';}).join('')
        +'<td class="t">'+n0(u.totQ)+(comValor?'<small>'+brl(u.totV)+'</small>':'')+'</td><td class="t md">'+n1(u.totMed/u.div)+'</td></tr></tbody></table>';
      return h;
    }
    var corpo=tabela('Consumo mensal por item',u.porItem,true,'Item');
    if(!u.loja)corpo+=tabela('Consumo por loja (soma dos itens marcados)',u.porLoja,false,'Loja');
    var css='@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2533;margin:0;background:#eef2f7}'
      +'#doc{background:#fff;max-width:1400px;margin:18px auto;padding:22px 26px;border-radius:12px;box-shadow:0 4px 18px rgba(20,40,74,.12)}'
      +'.cab{display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:3px solid #14284a}.cab img{height:58px;border-radius:6px}.cab .tt1{flex:1}.cab h1{margin:0;font-size:22px;color:#14284a}.cab p{margin:3px 0 0;color:#5b6b80;font-size:12px}'
      +'.tag{background:#14284a;color:#fff;font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;letter-spacing:.05em}'
      +'.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0 6px}.kc{background:#f7f9fc;border:1px solid #e1e7ef;border-top:4px solid;border-radius:10px;padding:12px 14px}.kc span{display:block;font-size:10px;font-weight:700;color:#5b6b80;text-transform:uppercase;letter-spacing:.04em}.kc b{display:block;font-size:21px;margin-top:4px}.kc small{display:block;color:#8091a7;font-size:10.5px;margin-top:2px}'
      +'.sec{font-size:14px;font-weight:800;color:#14284a;margin:20px 0 8px;padding-left:10px;border-left:4px solid #0e7c66}'
      +'.ic{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.icard{border:1px solid #e1e7ef;border-radius:10px;padding:12px 14px;background:#fff}.in{font-weight:800;font-size:12.5px;color:#14284a;margin-bottom:8px}.iv{display:flex;justify-content:space-between;gap:8px}.iv span{display:block;font-size:9.5px;color:#8091a7;text-transform:uppercase;font-weight:700}.iv b{font-size:14px}.bar{height:6px;background:#e8edf4;border-radius:4px;margin-top:10px;overflow:hidden}.bar i{display:block;height:100%;background:#0e7c66}.icard small{color:#8091a7;font-size:10px}'
      +'table{width:100%;border-collapse:separate;border-spacing:0;font-size:10.5px;border:1px solid #d9e1ec;border-radius:10px;overflow:hidden}'
      +'th{background:#14284a;color:#fff;padding:8px 6px;text-align:right;font-size:10px;letter-spacing:.03em;text-transform:uppercase}th:first-child{text-align:left;padding-left:10px}'
      +'td{padding:6px;text-align:right;border-bottom:1px solid #eef2f7}td.nm{text-align:left;padding-left:10px;font-weight:600;color:#1b2533}td small{display:block;color:#7a8aa0;font-size:9px}td.z{color:#c3ccd8}'
      +'tbody tr:nth-child(even) td{background:#f8fafc}th.t,td.t{background:#eef3fa}th.t{background:#0f2342}td.md{color:#0e7c66;font-weight:800}'
      +'tr.tt td{background:#dfe8f4!important;font-weight:800;color:#14284a;border-top:2px solid #14284a}tr{page-break-inside:avoid}thead{display:table-header-group}'
      +'.nota{color:#8091a7;font-size:10px;margin-top:8px}.rod{display:flex;justify-content:space-between;color:#8091a7;font-size:10px;margin-top:18px;padding-top:8px;border-top:1px solid #e1e7ef}'
      +'#barra{position:sticky;top:0;background:#0b1626;padding:10px 14px;display:flex;gap:10px;align-items:center;z-index:5}#barra button{background:#0e7c66;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer}#barra button.sec2{background:#15304d}#barra span{color:#8ca4bf;font-size:12px}'
      +'@media print{#barra{display:none}body{background:#fff}#doc{box-shadow:none;margin:0;padding:0;max-width:none;border-radius:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var nome='Esposende_consumo_por_item_'+new Date().toISOString().slice(0,10)+'.pdf';
    var js='function salvarPDF(){var b=document.getElementById("bpdf");b.textContent="Gerando PDF...";b.disabled=true;var d=document.getElementById("doc");'
      +'function go(){var st=d.getAttribute("style")||"";d.style.cssText="margin:0;box-shadow:none;border-radius:0;max-width:none";html2pdf().set({margin:7,filename:"'+nome+'",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},pagebreak:{mode:["css","legacy"],avoid:["tr",".kc",".icard"]}}).from(d).save().then(function(){d.setAttribute("style",st);b.textContent="📄 Salvar PDF";b.disabled=false;});}'
      +'if(window.html2pdf)return go();var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";s.onload=go;'
      +'s.onerror=function(){b.textContent="📄 Salvar PDF";b.disabled=false;alert("Não consegui gerar o PDF direto. Use Imprimir e escolha Salvar como PDF.");window.print();};document.head.appendChild(s);}';
    w.document.write('<html><head><meta charset="utf-8"><title>Esposende · Consumo por Item</title><style>'+css+'</style></head><body>'
      +'<div id="barra"><button onclick="window.print()">🖨 Imprimir</button><button id="bpdf" class="sec2" onclick="salvarPDF()">📄 Salvar PDF</button><button class="sec2" onclick="window.close()">✕ Fechar</button><span>A folha sai na horizontal (A4).</span></div>'
      +'<div id="doc"><div class="cab"><img src="data:image/jpeg;base64,'+LOGO_B64+'" alt="Esposende"><div class="tt1"><h1>Almoxarifado — Consumo por Item</h1><p>Busca: <b>'+esc(document.getElementById('aci-q').value)+'</b> · '+esc(u.onde)+' · Período: '+de+' a '+ate+'</p></div><span class="tag">AUDITORIA &amp; CONTROLE</span></div>'
      +'<div class="kpis">'+cards+'</div>'+itensCards+corpo
      +(u.meses.some(function(m){return m>=atual;})?'<div class="nota">* mês em andamento — aparece na tabela, mas não entra na média mensal.</div>':'')
      +'<div class="rod"><span>Esposende · Central de Auditoria &amp; Controle</span><span>Gerado em '+new Date().toLocaleString('pt-BR')+'</span></div></div>'
      +'<scr'+'ipt>'+js+(pdf?'setTimeout(salvarPDF,300);':'setTimeout(function(){window.print()},500);')+'</scr'+'ipt></body></html>');
    w.document.close();
  }

  // ---------- Botão dentro do módulo Almoxarifado ----------
  function instalarBotao(){
    var m=moduloAlm();if(!m)return;
    var doc=m.doc;
    if(doc.getElementById('aci-btn'))return;
    var btn=doc.createElement('button');
    btn.id='aci-btn';btn.type='button';
    btn.textContent='🔎 Consumo por Item';
    btn.title='Buscar um item e ver o consumo mensal por loja';
    btn.style.cssText='background:#0e7c66;color:#fff;border:1px solid #14a386;border-radius:8px;padding:9px 14px;font-weight:800;cursor:pointer;font-size:13px;margin-left:8px';
    btn.onclick=function(e){e.preventDefault();abrir();};
    // Coloca ao lado de "Regras"/"Carregar Planilhas"; se não achar, fica flutuando.
    var ref=Array.from(doc.querySelectorAll('button')).find(function(b){return /^\W*Regras\s*$/i.test((b.textContent||'').trim());})
      ||Array.from(doc.querySelectorAll('button')).find(function(b){return /Carregar Planilhas/i.test(b.textContent||'');});
    if(ref&&ref.parentElement){ref.parentElement.insertBefore(btn,ref);btn.style.marginLeft='0';btn.style.marginRight='8px';}
    else{btn.style.cssText+=';position:fixed;right:18px;bottom:60px;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.5)';doc.body.appendChild(btn);}
  }
  // ---------- Custo real no módulo Almoxarifado ----------
  // Troca, na tela do módulo, o custo das embalagens de presente pelo custo real
  // (Sulnove 0,004 + DIFAL). O valor original do Seta fica em __custoSeta/__custoUnitSeta
  // e é o que continua sendo gravado na nuvem (montarPayloadAtual devolve os originais).
  // ---------- Código do item padronizado (estoque x consumo) ----------
  // O relatório de estoque grava o código com zeros à esquerda (007894) e as requisições sem (7894).
  // O módulo cruza estoque e consumo pelo texto exato do código: nenhum item casava, e cada insumo
  // aparecia duas vezes (consumo com estoque 0 = CRÍTICO; estoque cheio = SEM CONSUMO).
  // Padroniza tudo sem zeros à esquerda antes de o painel calcular.
  function codigoPadrao(c){var t=String(c==null?'':c).trim();return /^\d+$/.test(t)?String(parseInt(t,10)):t;}
  function padronizarCodigos(w){
    var mudou=false;
    ['dbEstoqueRaw','dbEstoqueTI','dbConsumoRaw','dbConsumoTI'].forEach(function(nome){
      var arr;try{arr=w.eval("typeof "+nome+"!=='undefined'?"+nome+":[]")||[];}catch(e){return;}
      for(var i=0;i<arr.length;i++){var r=arr[i];if(!r||r['Código']==null)continue;
        var n=codigoPadrao(r['Código']);if(n!==r['Código']){r['Código']=n;mudou=true;}}
    });
    try{var ov=w.eval("typeof estoqueMinOverrides!=='undefined'?estoqueMinOverrides:null");
      if(ov&&typeof ov==='object')Object.keys(ov).forEach(function(k){var n=codigoPadrao(k);if(n!==k){if(ov[n]==null)ov[n]=ov[k];delete ov[k];mudou=true;}});}catch(e){}
    return mudou;
  }
  function ajustarCustos(w){
    var mudou=padronizarCodigos(w);
    try{
      var cons=w.eval("typeof dbConsumoRaw!=='undefined'?dbConsumoRaw:[]")||[];
      for(var i=0;i<cons.length;i++){
        var r=cons[i],u=unitProposta(r['Código']);if(u==null)continue;
        if(r.__custoSeta==null){r.__custoSeta=r['Custo Atendido'];mudou=true;}
        r['Custo Atendido']=Math.round((Number(r['Qtd Atendida'])||0)*u*100)/100;
      }
      var est=w.eval("typeof dbEstoqueRaw!=='undefined'?dbEstoqueRaw:[]")||[];
      for(var j=0;j<est.length;j++){
        var e=est[j],ue=unitProposta(e['Código']);if(ue==null)continue;
        if(e.__custoUnitSeta==null){e.__custoUnitSeta=e['Custo Unitário'];mudou=true;}
        e['Custo Unitário']=Math.round(ue*10000)/10000;
      }
    }catch(err){console.error('[Almoxarifado] custo real:',err);}
    return mudou;
  }
  function limparPayload(p){
    if(!p||typeof p!=='object')return p;
    if(Array.isArray(p.dbConsumoRaw))p.dbConsumoRaw=p.dbConsumoRaw.map(function(r){
      if(r&&r.__custoSeta!=null){var c=Object.assign({},r);c['Custo Atendido']=c.__custoSeta;delete c.__custoSeta;return c;}return r;});
    if(Array.isArray(p.dbEstoqueRaw))p.dbEstoqueRaw=p.dbEstoqueRaw.map(function(r){
      if(r&&r.__custoUnitSeta!=null){var c=Object.assign({},r);c['Custo Unitário']=c.__custoUnitSeta;delete c.__custoUnitSeta;return c;}return r;});
    return p;
  }
  function instalarCustoReal(){
    var m=moduloAlm();if(!m)return;var w=m.w;
    if(typeof w.calcularEAtualizarPainel!=='function'||typeof w.montarPayloadAtual!=='function')return;
    if(!w.__custoRealVersao){
      w.__custoRealVersao='2026-11-04.1';
      var origPayload=w.montarPayloadAtual;
      w.montarPayloadAtual=function(){return limparPayload(origPayload.apply(this,arguments));};
      ['calcularEAtualizarPainel','atualizarVisaoGeral','atualizarPainelEstoque','aplicarFiltros','atualizarRelatorioConsolidado'].forEach(function(nome){
        var f=w[nome];if(typeof f!=='function')return;
        w[nome]=function(){ajustarCustos(w);return f.apply(this,arguments);};
      });
    }
    // Dados novos (upload ou nuvem) chegam com o custo do Seta: ajusta e redesenha.
    if(ajustarCustos(w)){try{w.aplicarFiltros();}catch(e){try{w.calcularEAtualizarPainel();}catch(e2){}}}
  }
  setInterval(instalarCustoReal,1500);

  // ---------- Leitura de CSV no módulo Almoxarifado ----------
  // O relatório de estoque do sistema escreve a polegada como &QUOT; dentro da descrição
  // (ex.: "ARRUELA LISA GALVAN 1/4&QUOT;"). O ";" final da entidade é o separador do CSV e o
  // leitor do módulo separa as colunas sem respeitar aspas: a linha anda uma coluna e a
  // QUANTIDADE vira 0. Antes de o módulo ler um .csv/.txt, troca as entidades HTML pelo
  // caractere (sem ";"). Trabalha nos bytes, então a codificação do arquivo (Windows-1252/UTF-8) fica igual.
  var ENT={quot:"''",amp:'&',lt:'<',gt:'>',apos:"'",nbsp:' '};
  function limparBytesCSV(u8){
    var out=[],i=0,n=u8.length,mudou=false;
    while(i<n){
      var c=u8[i];
      if(c===38){ // '&'
        var j=i+1,nome='';
        while(j<n&&j-i<=8&&((u8[j]>=65&&u8[j]<=90)||(u8[j]>=97&&u8[j]<=122)||(u8[j]===35)||(u8[j]>=48&&u8[j]<=57))){nome+=String.fromCharCode(u8[j]);j++;}
        var low=nome.toLowerCase(),rep=null;
        if(j<n&&u8[j]===59&&nome){
          if(ENT[low]!=null)rep=ENT[low];
          else if(/^#\d{2,4}$/.test(nome)){var cc=parseInt(nome.slice(1),10);rep=cc<128?String.fromCharCode(cc):'';}
        }
        if(rep!=null){for(var k=0;k<rep.length;k++)out.push(rep.charCodeAt(k));i=j+1;mudou=true;continue;}
      }
      out.push(c);i++;
    }
    return mudou?new Uint8Array(out):null;
  }
  function instalarLeitorCSV(){
    var m=moduloAlm();if(!m)return;var w=m.w;
    if(w.__csvEntidadesFix||!w.FileReader)return;
    w.__csvEntidadesFix='2026-11-06.1';
    var FRp=w.FileReader.prototype,lerBytes=FRp.readAsArrayBuffer;
    ['readAsText','readAsArrayBuffer','readAsBinaryString','readAsDataURL'].forEach(function(met){
      var orig=FRp[met];if(typeof orig!=='function')return;
      FRp[met]=function(blob){
        var fr=this,args=Array.prototype.slice.call(arguments);
        var nome=String((blob&&blob.name)||'');
        if(!blob||!/\.(csv|txt)$/i.test(nome)||blob.__csvLimpo)return orig.apply(fr,args);
        var leitor=new w.FileReader();
        leitor.onload=function(){
          var limpo=limparBytesCSV(new Uint8Array(leitor.result));
          if(limpo){
            var nb=new w.File([limpo],nome,{type:blob.type||'text/csv',lastModified:blob.lastModified});
            nb.__csvLimpo=true;args[0]=nb;
            console.info('[Almoxarifado] '+nome+': entidades HTML (&QUOT; etc.) corrigidas antes da leitura.');
          }
          orig.apply(fr,args);
        };
        leitor.onerror=function(){orig.apply(fr,args);};
        lerBytes.call(leitor,blob);
      };
    });
    // Arquivo lido com blob.text()/arrayBuffer() (sem FileReader)
    var Bp=w.Blob&&w.Blob.prototype,origAB=Bp&&Bp.arrayBuffer,origTX=Bp&&Bp.text;
    function ehCSV(b){return !b.__csvLimpo&&/\.(csv|txt)$/i.test(String(b.name||''));}
    function bufLimpo(b){return origAB.call(b).then(function(ab){var l=limparBytesCSV(new Uint8Array(ab));return l?l.buffer:ab;});}
    if(typeof origAB==='function')Bp.arrayBuffer=function(){return ehCSV(this)?bufLimpo(this):origAB.apply(this,arguments);};
    if(typeof origTX==='function'&&typeof origAB==='function')Bp.text=function(){
      if(!ehCSV(this))return origTX.apply(this,arguments);
      return bufLimpo(this).then(function(ab){var nb=new w.Blob([ab]);nb.__csvLimpo=true;return origTX.call(nb);});
    };
  }
  setInterval(instalarLeitorCSV,1500);
  window.__limparBytesCSV=limparBytesCSV;

  setInterval(instalarBotao,1500);
  new MutationObserver(function(){instalarBotao();}).observe(document.documentElement,{childList:true,subtree:true});
  window.abrirConsumoPorItem=abrir;
  window.__ESPOSENDE_LOGO_B64=LOGO_B64; // usado pelo Consumo Loja (almox-consumo-loja-patch.js)
})();
