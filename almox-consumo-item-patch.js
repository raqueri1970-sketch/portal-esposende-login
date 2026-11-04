// Almoxarifado · Consumo por Item
// Busca simples: digita parte do nome do item (ex.: "embal"), escolhe a loja (ou todas)
// e vê o consumo mês a mês, total e média mensal. Lê os dados já carregados no módulo
// (dbConsumoRaw: Qtd Atendida / Custo Atendido). Não altera nada no módulo.
(function(){
  if(window.__almoxConsumoItemPatch)return;
  window.__almoxConsumoItemPatch='2026-11-04.1';

  var MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  var state={itensMarcados:null,ultimoTermo:null};
  // Proposta Sulnove nº 010145 (29/10/2026) · BOPP Metalizado espessura 0,004 · preço por milheiro.
  // P=30x40, M=40x50, G=50x60. DIFAL de 13,5% somado ao custo unitário.
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
        custo:Number(r['Custo Atendido'])||0,
        custoNovo:(function(){var u=unitProposta(r['Código']);return u==null?(Number(r['Custo Atendido'])||0):(Number(r['Qtd Atendida'])||0)*u;})(),
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
  +'#aci-box .aci-flt{display:grid;grid-template-columns:1.8fr 1.2fr .9fr .8fr .8fr 1.4fr;gap:12px;padding:14px 18px;align-items:end}'
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
      +'<div class="aci-hd"><div class="aci-tit"><b>🔎 Consumo por Item</b><small>Digite o item, escolha a loja (ou todas) e veja o consumo de cada mês e a média mensal</small></div>'
      +'<div class="aci-acoes"><button type="button" id="aci-xls">⬇ Excel</button><button type="button" id="aci-print">🖨 Imprimir</button><button type="button" id="aci-pdf">📄 PDF</button><button type="button" id="aci-fechar">✕ Fechar</button></div></div>'
      +'<div class="aci-flt">'
      +'<div><label>1. Item (parte do nome ou código)</label><input id="aci-q" placeholder="ex.: embalagem de presente" autocomplete="off"></div>'
      +'<div><label>2. Loja</label><select id="aci-loja"></select></div>'
      +'<div><label>Regional</label><select id="aci-reg"></select></div>'
      +'<div><label>De (mês)</label><input type="month" id="aci-de"></div>'
      +'<div><label>Até (mês)</label><input type="month" id="aci-ate"></div>'
      +'<div><label>Custo usado</label><select id="aci-base"><option value="prop">Proposta Sulnove 0,004 + DIFAL 13,5%</option><option value="atual">Custo atual do almoxarifado</option></select></div>'
      +'</div>'
      +'<div id="aci-itens"><span style="color:#8ca4bf">Digite acima para encontrar os itens.</span></div>'
      +'<div id="aci-kpi"></div><div id="aci-res"></div></div>';
    document.body.appendChild(ov);
    var $=function(id){return document.getElementById(id);};
    $('aci-fechar').onclick=function(){ov.style.display='none';};
    ov.addEventListener('click',function(e){if(e.target===ov)ov.style.display='none';});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.style.display!=='none')ov.style.display='none';});
    var t;$('aci-q').addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){state.itensMarcados=null;listarItens();calcular();},200);});
    ['aci-loja','aci-reg','aci-de','aci-ate','aci-base'].forEach(function(id){$(id).addEventListener('change',function(){if(id==='aci-reg')montarLojas();calcular();});});
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
    var base=$('aci-base').value;var V=function(l){return base==='prop'?l.custoNovo:l.custo;};
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
      +'<div><span>CUSTO TOTAL '+(base==='prop'?'(PROPOSTA + DIFAL)':'(ATUAL)')+'</span><b>'+brl(totV)+'</b>'
        +(base==='prop'&&nProp?'<small style="display:block;color:#8ca4bf;font-size:11px;margin-top:3px">Custo atual: '+brl(totAtual)+' · diferença '+(totV-totAtual>=0?'+':'−')+brl(Math.abs(totV-totAtual))+(totAtual?' ('+((totV/totAtual-1)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%)':'')+'</small>':'')+'</div>'
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
    var html=tabela('Consumo mensal por item — '+esc(onde)+(base==='prop'?' · custo da proposta + DIFAL':' · custo atual'),porItem,true);
    if(!loja)html+=tabela('Consumo por loja (soma dos itens marcados) — '+esc(onde),porLoja,false);
    if(base==='prop'){
      var usados=Object.keys(PROPOSTA).filter(function(c){return sel.some(function(l){return l.codigo===c;});});
      if(usados.length)html+='<div style="color:#8ca4bf;font-size:11px;margin-top:8px">Custo unitário usado (Sulnove nº 010145 · BOPP metalizado 0,004 · + DIFAL 13,5%): '+usados.map(function(c){var p=PROPOSTA[c];return c+' '+p.tam+' = R$ '+(p.milheiro/1000).toLocaleString('pt-BR',{minimumFractionDigits:4})+' → <b>R$ '+unitProposta(c).toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})+'</b>/un.';}).join(' · ')+(sel.some(function(l){return !l.temProposta;})?' · Itens sem proposta continuam com o custo atual.':'')+'</div>';
    }
    if(meses.some(function(m){return m>=atual;}))html+='<div style="color:#8ca4bf;font-size:11px;margin-top:8px">* mês em andamento — aparece na tabela, mas não entra na média mensal.</div>';
    res.innerHTML=html;
    ultimo={meses:meses,porItem:porItem,porLoja:porLoja,div:div,onde:onde,loja:loja,totQ:totQ,totV:totV,totMed:totMed,totM:totM};
  }

  function exportar(){
    if(!ultimo){alert('Faça uma busca primeiro.');return;}
    var u=ultimo,sep=';',linhasCsv=[];
    function num(v,d){return Number(v||0).toFixed(d||0).replace('.',',');}
    function bloco(titulo,grupos,col){
      linhasCsv.push(titulo);
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
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='consumo_por_item_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},500);
  }
  function imprimir(pdf){
    if(!ultimo){alert('Faça uma busca primeiro.');return;}
    var w=window.open('','_blank');
    if(!w){alert('Libere pop-ups para imprimir.');return;}
    var css='@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#111;margin:20px}h2{margin:0 0 4px}p{color:#555;margin:0 0 12px;font-size:12px}h3{font-size:14px;margin:18px 0 6px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#14284a;color:#fff;padding:6px;text-align:right}th:first-child,td:first-child{text-align:left}td{padding:5px 6px;border-bottom:1px solid #ddd;text-align:right}td small{display:block;color:#666}tr.aci-tot td{font-weight:bold;background:#eef2f7}tr{page-break-inside:avoid}#k{font-size:13px;margin:8px 0}'
      +'#barra{position:sticky;top:0;background:#0b1626;padding:10px 14px;margin:-20px -20px 16px;display:flex;gap:10px;align-items:center;z-index:5}#barra button{background:#0e7c66;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer}#barra button.sec{background:#15304d}#barra span{color:#8ca4bf;font-size:12px}'
      +'@media print{#barra{display:none}body{margin:0}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var k=document.getElementById('aci-kpi').innerText.replace(/\n+/g,' · ');
    var nome='consumo_por_item_'+new Date().toISOString().slice(0,10)+'.pdf';
    var js='function salvarPDF(){var b=document.getElementById("bpdf");b.textContent="Gerando PDF...";b.disabled=true;'
      +'function go(){var el=document.getElementById("doc");html2pdf().set({margin:8,filename:"'+nome+'",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},pagebreak:{mode:["css","legacy"],avoid:"tr"}}).from(el).save().then(function(){b.textContent="📄 Salvar PDF";b.disabled=false;});}'
      +'if(window.html2pdf)return go();var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";s.onload=go;'
      +'s.onerror=function(){b.textContent="📄 Salvar PDF";b.disabled=false;alert("Não consegui gerar o PDF direto. Use Imprimir e escolha Salvar como PDF.");window.print();};document.head.appendChild(s);}';
    w.document.write('<html><head><meta charset="utf-8"><title>Consumo por Item</title><style>'+css+'</style></head><body>'
      +'<div id="barra"><button onclick="window.print()">🖨 Imprimir</button><button id="bpdf" class="sec" onclick="salvarPDF()">📄 Salvar PDF</button><button class="sec" onclick="window.close()">✕ Fechar</button><span>A folha sai na horizontal (A4).</span></div>'
      +'<div id="doc"><h2>ESPOSENDE · Almoxarifado — Consumo por Item</h2><p>'+esc(document.getElementById('aci-q').value)+' · '+esc(ultimo.onde)+' · Gerado em '+new Date().toLocaleString('pt-BR')+'</p><div id="k">'+esc(k)+'</div>'+document.getElementById('aci-res').innerHTML.replace(/class="aci-wrap"/g,'')+'</div>'
      +'<scr'+'ipt>'+js+(pdf?'setTimeout(salvarPDF,300);':'setTimeout(function(){window.print()},400);')+'</scr'+'ipt></body></html>');
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
  setInterval(instalarBotao,1500);
  new MutationObserver(function(){instalarBotao();}).observe(document.documentElement,{childList:true,subtree:true});
  window.abrirConsumoPorItem=abrir;
})();
