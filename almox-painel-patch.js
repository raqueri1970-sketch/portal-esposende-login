// Almoxarifado · Painel (Visão Geral)
// Troca os 6 cards antigos (Almoxarifado/TI/Fortpel/Total/Lojas acima/Itens críticos) e a rosca
// "Participação por Estoque" por um painel direto:
//   1) quanto vale o estoque do almoxarifado hoje (CD + AX, em R$);
//   2) quanto foi consumido no último mês fechado, comparado com a média e com o mês anterior;
//   3) quantos meses o estoque cobre e o que repor;
//   4) gráfico do consumo mês a mês e quem/o que mais consumiu no mês.
// Também corrige as regionais que apareciam como "NÃO MAPEADO" (CD, escritório, lojas fechadas, 064).
// Lê os dados já carregados no módulo (dbEstoqueRaw, dbConsumoRaw, dbFortpelRaw, dbEstoqueTI, dbRegionaisMap).
(function(){
  if(window.__almoxPainel)return;
  window.__almoxPainel='2026-11-09.2';

  var MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  var MESES_LONGO=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  // Regionais definidas pela Controladoria (09/11/2026). "NÃO MAPEADO" só existia por falta destas.
  var REG_FIXA={'1':'CD','90':'CD','64':'ALEX','17':'FECHADA','25':'FECHADA','97':'FECHADA'};
  // Custo real das embalagens de presente (Sulnove 010145 + DIFAL 13,5%).
  var DIFAL=0.135,PROPOSTA={'11314':331.00,'11315':535.75,'11316':799.50};
  function unitReal(cod){var m=PROPOSTA[String(parseInt(cod,10))];return m?m/1000*(1+DIFAL):null;}

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function n0(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});}
  function n1(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});}
  function brl(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function brl0(v){return 'R$ '+n0(v);}
  function abrev(v){v=Number(v||0);var a=Math.abs(v);if(a>=1e6)return n1(v/1e6).replace(',0','')+' mi';if(a>=1e3)return n0(v/1e3)+' mil';return n0(v);}
  function pct(v){if(v==null||!isFinite(v))return '—';var r=Math.round(v*100);return r===0?'0%':(r>0?'+':'')+n0(r)+'%';}
  function num(v){if(typeof v==='number')return v;var s=String(v==null?'':v).trim();if(!s)return 0;if(/,\d{1,4}$/.test(s))s=s.replace(/\./g,'').replace(',','.');var n=Number(s);return isFinite(n)?n:0;}
  function limpa(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
  function norm(s){return limpa(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();}
  function codLoja(t){var m=String(t==null?'':t).match(/(\d+)/);return m?String(parseInt(m[1],10)):'';}
  function codItem(c){var n=parseInt(String(c==null?'':c).trim(),10);return isNaN(n)?limpa(c):String(n);}
  function mesLabel(k){var p=k.split('-');return MESES[Number(p[1])-1]+'/'+p[0].slice(2);}
  function mesLongo(k){var p=k.split('-');return MESES_LONGO[Number(p[1])-1]+'/'+p[0];}
  function somaMes(k,n){var p=k.split('-').map(Number),d=new Date(p[0],p[1]-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function mesAtual(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  // Mês da requisição em horário de Brasília (UTC-3).
  function mesDe(v){var t=Date.parse(v);if(isNaN(t))return null;var d=new Date(t-3*36e5);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');}

  function moduloAlm(){
    var ifr=document.getElementById('ifr-alm');var w=ifr&&ifr.contentWindow,d;
    try{d=w&&w.document;}catch(e){return null;}
    if(!d||!d.body)return null;return {w:w,doc:d};
  }
  function ler(w,nome,padrao){try{var v=w.eval('typeof '+nome+"!=='undefined'?"+nome+':null');return v==null?padrao:v;}catch(e){return padrao;}}

  // ---------- regionais ----------
  function corrigirRegionais(w){
    var reg=ler(w,'dbRegionaisMap',null);if(!reg||typeof reg!=='object')return false;
    var mudou=false;
    Object.keys(REG_FIXA).forEach(function(c){
      [c,c.padStart(2,'0'),c.padStart(3,'0')].forEach(function(k,i){
        if(i>0&&reg[k]==null)return; // só mexe nas chaves com zero à esquerda que já existirem
        if(reg[k]!==REG_FIXA[c]){reg[k]=REG_FIXA[c];mudou=true;}
      });
    });
    return mudou;
  }
  function regionalDe(reg,cod){var c=String(cod);return String(REG_FIXA[c]||reg[c]||reg[c.padStart(2,'0')]||reg[c.padStart(3,'0')]||'NÃO MAPEADO').toUpperCase();}

  // ---------- cálculo ----------
  function calcular(w,filtroReg){
    var cons=ler(w,'dbConsumoRaw',[])||[],est=ler(w,'dbEstoqueRaw',[])||[],estTI=ler(w,'dbEstoqueTI',[])||[];
    var fort=ler(w,'dbFortpelRaw',[])||[],anoF=Number(ler(w,'fortpelAnoRef',0))||new Date().getFullYear();
    var reg=ler(w,'dbRegionaisMap',{})||{},nomes=ler(w,'dbLojaNomeMap',{})||{};
    var atual=mesAtual(),D={atual:atual,meses:{},itens:{},lojas:{},regs:{},setores:{},estoque:0,nEst:0,estTI:0,fort:{},nLinhasEst:est.length};
    // Estoque do almoxarifado trocado pelo de TI (mesmo arquivo carregado no lugar errado)
    var codTI={};estTI.forEach(function(e){codTI[codItem(e['Código'])]=1;});
    var iguais=est.filter(function(e){return codTI[codItem(e['Código'])];}).length;
    D.estoqueEhTI=est.length>0&&est.length<600&&iguais>=est.length*0.8;
    function nomeLoja(cod,bruto){var n=nomes[cod];return n?String(n).replace(/^\d+\s*-\s*/,String(cod).padStart(3,'0')+' - '):limpa(bruto);}
    // Estoque do almoxarifado (CD + AX), item a item
    est.forEach(function(e){
      var c=codItem(e['Código']),q=num(e['Estoque Atual']),u=unitReal(c);u=u!=null?u:num(e['Custo Unitário']);
      var it=D.itens[c]=D.itens[c]||{cod:c,nome:limpa(e['Insumo']),saldo:0,custo:0,meses:{},v:{}};
      it.saldo+=q;it.custo=u;if(!it.nome)it.nome=limpa(e['Insumo']);
      if(q>0){D.estoque+=q*u;D.nEst++;}
    });
    estTI.forEach(function(e){var q=num(e['Estoque Atual']);if(q>0)D.estTI+=q*num(e['Custo Unitário']);});
    // Consumo (quantidade atendida) por mês, item, loja e regional
    cons.forEach(function(r){
      var m=mesDe(r['Data Solicitação']);if(!m)return;
      var q=num(r['Qtd Atendida']);if(!q)return;
      var c=codItem(r['Código']),u=unitReal(c),v=u!=null?Math.round(q*u*100)/100:num(r['Custo Atendido']);
      var lj=codLoja(r['Empresa Solicitante']),rg=lj?regionalDe(reg,lj):'NÃO MAPEADO';
      if(filtroReg&&rg!==filtroReg)return;
      var mm=D.meses[m]=D.meses[m]||{v:0,n:0};mm.v+=v;mm.n++;
      var it=D.itens[c]=D.itens[c]||{cod:c,nome:limpa(r['Insumo']),saldo:0,custo:q?v/q:0,meses:{},v:{}};
      it.meses[m]=(it.meses[m]||0)+q;it.v[m]=(it.v[m]||0)+v;if(!it.nome)it.nome=limpa(r['Insumo']);
      var l=D.lojas[lj]=D.lojas[lj]||{cod:lj,nome:nomeLoja(lj,r['Empresa Solicitante']),reg:rg,v:{}};l.v[m]=(l.v[m]||0)+v;
      var g=D.regs[rg]=D.regs[rg]||{v:{}};g.v[m]=(g.v[m]||0)+v;
      var st=limpa(r['Setor']).toUpperCase()||'SEM SETOR';var se=D.setores[st]=D.setores[st]||{v:{}};se.v[m]=(se.v[m]||0)+v;
    });
    // Fortpel: compra direta das lojas (não passa pelo almoxarifado)
    fort.forEach(function(f){var mes=Number(f.mes);if(!mes)return;var lj=String(parseInt(f.lojaCodigo,10));
      if(filtroReg&&regionalDe(reg,lj)!==filtroReg)return;
      var m=anoF+'-'+String(mes).padStart(2,'0');D.fort[m]=(D.fort[m]||0)+num(f.valor);});
    D.listaMeses=Object.keys(D.meses).sort();
    D.fechados=D.listaMeses.filter(function(m){return m<atual;});
    return D;
  }

  function analisar(D,mesSel){
    var ms=D.fechados,ref=mesSel&&D.meses[mesSel]?mesSel:(ms[ms.length-1]||null);
    var A={ref:ref};if(!ref)return A;
    var antes=ms.filter(function(m){return m<ref;}).slice(-12);
    A.antes=antes;A.ant=antes[antes.length-1]||null;
    A.valor=D.meses[ref].v;A.n=D.meses[ref].n;
    A.media=antes.length?antes.reduce(function(s,m){return s+D.meses[m].v;},0)/antes.length:null;
    A.mediaN=antes.length?antes.reduce(function(s,m){return s+D.meses[m].n;},0)/antes.length:null;
    A.vsMedia=A.media?A.valor/A.media-1:null;
    A.vsAnt=A.ant&&D.meses[A.ant].v?A.valor/D.meses[A.ant].v-1:null;
    // Mês com bem menos requisições que o normal = base do mês incompleta.
    A.incompleto=A.mediaN!=null&&A.n<A.mediaN*0.4;
    // Consumo médio mensal (últimos 3 meses fechados com base boa) para a cobertura
    var ult=ms.filter(function(m){return !A.mediaN||D.meses[m].n>=A.mediaN*0.4;}).slice(-3);
    A.mesesCob=ult;
    A.consMedio3=ult.length?ult.reduce(function(s,m){return s+D.meses[m].v;},0)/ult.length:0;
    A.cobertura=A.consMedio3?D.estoque/A.consMedio3:null;
    // Itens: consumo do mês x média do item; cobertura de cada item
    var itens=Object.keys(D.itens).map(function(c){return D.itens[c];});
    itens.forEach(function(it){
      it.qRef=it.meses[ref]||0;it.vRef=it.v[ref]||0;
      var qm=ult.reduce(function(s,m){return s+(it.meses[m]||0);},0)/(ult.length||1);
      it.media=qm;it.mediaAntes=antes.length?antes.reduce(function(s,m){return s+(it.meses[m]||0);},0)/antes.length:0;
      it.dura=qm>0?Math.max(0,it.saldo)/qm:null;
    });
    A.topItens=itens.filter(function(i){return i.vRef>0;}).sort(function(a,b){return b.vRef-a.vRef;}).slice(0,10);
    A.repor=itens.filter(function(i){return i.media>0&&i.dura!=null&&i.dura<1;}).sort(function(a,b){return a.dura-b.dura||b.media*b.custo-a.media*a.custo;});
    A.reporV=A.repor.reduce(function(s,i){return s+Math.max(0,Math.ceil(i.media*2-Math.max(0,i.saldo)))*(i.custo||0);},0);
    A.topLojas=Object.keys(D.lojas).map(function(k){var l=D.lojas[k],ma=antes.length?antes.reduce(function(s,m){return s+(l.v[m]||0);},0)/antes.length:0;
      return {nome:l.nome,reg:l.reg,v:l.v[ref]||0,media:ma,vs:ma?(l.v[ref]||0)/ma-1:null};}).filter(function(l){return l.v>0;}).sort(function(a,b){return b.v-a.v;}).slice(0,10);
    A.regs=Object.keys(D.regs).map(function(k){var g=D.regs[k],ma=antes.length?antes.reduce(function(s,m){return s+(g.v[m]||0);},0)/antes.length:0;
      return {reg:k,v:g.v[ref]||0,media:ma,vs:ma?(g.v[ref]||0)/ma-1:null};}).filter(function(g){return g.v>0||g.media>0;}).sort(function(a,b){return b.v-a.v;});
    A.fort=D.fort[ref]||0;
    A.setores=Object.keys(D.setores).map(function(k){var g=D.setores[k],ma=antes.length?antes.reduce(function(s,m){return s+(g.v[m]||0);},0)/antes.length:0;
      return {setor:k,v:g.v[ref]||0,media:ma,vs:ma?(g.v[ref]||0)/ma-1:null};}).filter(function(g){return g.v>0||g.media>0;}).sort(function(a,b){return b.v-a.v;});
    // Facilities = obras, manutenção e equipamentos (ar-condicionado, estantes, mobiliário); o resto é o consumo da operação.
    var fac=A.setores.filter(function(g){return g.setor==='FACILITIES';})[0]||{v:0,media:0};
    A.fac=fac;A.oper={v:A.valor-fac.v,media:(A.media||0)-fac.media};A.oper.vs=A.oper.media?A.oper.v/A.oper.media-1:null;
    return A;
  }

  // ---------- gráfico ----------
  function grafico(D,A){
    var ms=D.fechados.slice(-12);if(!ms.length)return '';
    var W=1100,H=240,pl=64,pr=10,pt=18,pb=28,vals=ms.map(function(m){return D.meses[m].v;});
    var mx=Math.max.apply(null,vals.concat([A.media||0,1]));var passo=Math.pow(10,Math.floor(Math.log10(mx)));var top=Math.ceil(mx/passo)*passo;if(top/passo<=2)top=Math.ceil(mx/(passo/2))*(passo/2);
    var cw=(W-pl-pr)/ms.length,bw=Math.min(46,cw*0.6),y=function(v){return pt+(H-pt-pb)*(1-v/top);};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">';
    for(var k=0;k<=4;k++){var v=top*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke="#1d3550"/><text x="'+(pl-6)+'" y="'+(yy+3)+'" text-anchor="end" font-size="10" fill="#8ca4bf">R$ '+abrev(v)+'</text>';}
    ms.forEach(function(m,i){var x=pl+cw*i+(cw-bw)/2,v=vals[i],sel=m===A.ref,inc=A.mediaN&&D.meses[m].n<A.mediaN*0.4;
      g+='<rect x="'+x+'" y="'+y(v)+'" width="'+bw+'" height="'+Math.max(1,y(0)-y(v))+'" rx="3" fill="'+(inc?'#64748b':sel?'#22d3ee':'#1e5a8a')+'" data-m="'+m+'" style="cursor:pointer"><title>'+esc(mesLabel(m)+': '+brl(v)+' · '+n0(D.meses[m].n)+' requisições')+'</title></rect>'
        +'<text x="'+(x+bw/2)+'" y="'+(y(v)-5)+'" text-anchor="middle" font-size="10" font-weight="'+(sel?'800':'400')+'" fill="'+(sel?'#e8f6ff':'#9fb3c8')+'">'+abrev(v)+'</text>'
        +'<text x="'+(x+bw/2)+'" y="'+(H-9)+'" text-anchor="middle" font-size="10.5" font-weight="'+(sel?'800':'400')+'" fill="'+(sel?'#22d3ee':'#8ca4bf')+'">'+mesLabel(m)+'</text>';});
    if(A.media){var ym=y(A.media);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ym+'" y2="'+ym+'" stroke="#f59e0b" stroke-dasharray="6 4" stroke-width="1.6"/>';}
    return g+'</svg>';
  }

  // ---------- tela ----------
  var CSS='#apn{font-family:inherit;color:#dbe7f5;margin:4px 0 18px}#apn *{box-sizing:border-box}'
    +'#apn .apn-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}'
    +'#apn .apn-top h2{margin:0;font-size:17px;color:#fff;font-weight:800}#apn .apn-top small{color:#8ca4bf;font-size:12px;display:block;margin-top:2px}'
    +'#apn .apn-sel{display:flex;gap:8px;align-items:center}#apn select{background:#0f2238;color:#e8f0fa;border:1px solid #2a4566;border-radius:8px;padding:6px 10px;font-size:13px}'
    +'#apn .apn-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}@media(max-width:1100px){#apn .apn-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    +'#apn .apn-k{background:#0d1b2e;border:1px solid #1f3654;border-top:4px solid var(--c);border-radius:12px;padding:14px 16px;min-width:0}'
    +'#apn .apn-k span{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9fb3c8}'
    +'#apn .apn-k b{display:block;font-size:26px;line-height:1.15;margin-top:6px;color:var(--c);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    +'#apn .apn-k small{display:block;color:#9fb3c8;font-size:12px;margin-top:6px;line-height:1.45}#apn .apn-k small em{font-style:normal;font-weight:800}'
    +'#apn .up{color:#fb7185}#apn .dn{color:#34d399}#apn .apn-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}@media(max-width:1100px){#apn .apn-mini{grid-template-columns:1fr}}'
    +'#apn .apn-m{background:#0b1726;border:1px solid #1a2f4a;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#9fb3c8;line-height:1.5}#apn .apn-m b{color:#e8f0fa;font-size:15px}'
    +'#apn .apn-box{background:#0d1b2e;border:1px solid #1f3654;border-radius:12px;padding:14px 16px;margin-top:12px;min-width:0}#apn .apn-box h4{margin:0 0 8px;font-size:13.5px;color:#fff;font-weight:800}'
    +'#apn .apn-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}@media(max-width:1100px){#apn .apn-2{grid-template-columns:1fr}}'
    +'#apn table{width:100%;border-collapse:collapse;font-size:12.5px}#apn th{text-align:right;color:#8ca4bf;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;padding:6px 6px;border-bottom:1px solid #1f3654;font-weight:700}#apn th:first-child,#apn td:first-child{text-align:left}'
    +'#apn td{text-align:right;padding:6px;border-bottom:1px solid #132840;font-variant-numeric:tabular-nums;white-space:nowrap}#apn td:first-child{white-space:normal}#apn td small{display:block;color:#7f96b2;font-size:10.5px}'
    +'#apn .apn-aviso{background:#3a1d08;border:1px solid #b45309;color:#fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;line-height:1.5}'
    +'#apn .apn-leg{display:flex;gap:14px;font-size:11px;color:#8ca4bf;margin-top:4px;flex-wrap:wrap}#apn .apn-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}';

  var estado={mes:null,reg:'',assinatura:'',html:''};
  function assinatura(w){
    var c=ler(w,'dbConsumoRaw',[])||[],e=ler(w,'dbEstoqueRaw',[])||[],f=ler(w,'dbFortpelRaw',[])||[];
    var u=c.length?(c[c.length-1]['Data Solicitação']+'|'+c[0]['Qtd Atendida']):'';
    return [c.length,e.length,f.length,u,estado.mes,estado.reg].join('#');
  }
  function montar(w){
    var D=calcular(w,estado.reg),A=analisar(D,estado.mes);
    var regsTodas=Object.keys(calcularRegs(w)).sort();
    var h='<div class="apn-top"><div><h2>📦 Almoxarifado — situação '+(A.ref?'de '+esc(mesLongo(A.ref)):'')+'</h2><small>'+(estado.reg?'Regional '+esc(estado.reg):'Rede toda')+' · estoque = saldo atual do 001 CD + AX · consumo = quantidade atendida pelo almoxarifado</small></div>'
      +'<div class="apn-sel"><select data-apn="reg"><option value="">Rede toda</option>'+regsTodas.map(function(r){return '<option'+(r===estado.reg?' selected':'')+'>'+esc(r)+'</option>';}).join('')+'</select>'
      +'<select data-apn="mes">'+D.fechados.slice().reverse().map(function(m){return '<option value="'+m+'"'+(m===A.ref?' selected':'')+'>'+mesLabel(m)+'</option>';}).join('')+'</select></div></div>';
    if(!A.ref)return h+'<div class="apn-aviso">Sem consumo carregado no módulo.</div>';
    if(D.estoqueEhTI)h+='<div class="apn-aviso" style="background:#3b0d16;border-color:#e11d48;color:#fecdd3">⛔ <b>O estoque do almoxarifado carregado é o arquivo de TI</b> ('+n0(D.nLinhasEst)+' itens de informática). O valor abaixo não é o estoque real do CD + AX. Em <b>Carregar Planilhas</b>, coloque o <b>ESTOQUE 01 + AX</b> no campo de estoque do almoxarifado e o <b>TI</b> no campo de TI.</div>';
    if(A.incompleto)h+='<div class="apn-aviso">⚠ <b>'+esc(mesLongo(A.ref))+' está incompleto na base</b>: só '+n0(A.n)+' requisições, quando a média é '+n0(A.mediaN)+' por mês. Carregue de novo a planilha de consumo com o mês inteiro — até lá o consumo do mês aparece menor do que foi.</div>';
    var corV=A.vsMedia==null?'#22d3ee':A.vsMedia>0.1?'#fb7185':A.vsMedia<-0.1?'#34d399':'#22d3ee';
    h+='<div class="apn-kpis">'
      +'<div class="apn-k" style="--c:#38bdf8"><span>Estoque do almoxarifado hoje</span><b>'+brl0(D.estoque)+'</b><small>'+n0(D.nEst)+' itens com saldo · valor = saldo × custo unitário'+(D.estTI?'<br>Estoque de TI (separado): <em>'+brl0(D.estTI)+'</em>':'')+'</small></div>'
      +'<div class="apn-k" style="--c:'+corV+'"><span>Consumo de '+esc(mesLabel(A.ref))+'</span><b>'+brl0(A.valor)+'</b><small>'
        +(A.media!=null?'<em class="'+(A.vsMedia>0?'up':'dn')+'">'+pct(A.vsMedia)+'</em> vs média mensal ('+brl0(A.media)+')':'')
        +(A.ant?'<br><em class="'+(A.vsAnt>0?'up':'dn')+'">'+pct(A.vsAnt)+'</em> vs '+esc(mesLabel(A.ant))+' ('+brl0(D.meses[A.ant].v)+')':'')
        +(A.fac.v||A.fac.media?'<br>Operação <em>'+brl0(A.oper.v)+'</em> <em class="'+(A.oper.vs>0.1?'up':A.oper.vs<-0.1?'dn':'')+'">('+pct(A.oper.vs)+')</em> · Facilities/obras <em>'+brl0(A.fac.v)+'</em>':'')+'</small></div>'
      +'<div class="apn-k" style="--c:'+(A.cobertura==null?'#94a3b8':A.cobertura<1?'#fb7185':A.cobertura<2?'#f59e0b':'#34d399')+'"><span>O estoque dura</span><b>'+(A.cobertura==null?'—':n1(A.cobertura)+' meses')+'</b><small>estoque ÷ consumo médio de '+brl0(A.consMedio3)+'/mês<br>(média de '+A.mesesCob.map(mesLabel).join(', ')+')</small></div>'
      +'<div class="apn-k" style="--c:#f59e0b"><span>Itens para repor</span><b>'+n0(A.repor.length)+' itens</b><small>acabam em menos de 1 mês'+(A.reporV?'<br>repor 2 meses ≈ <em>'+brl0(A.reporV)+'</em>':'')+'</small></div>'
      +'</div>';
    h+='<div class="apn-mini">'
      +'<div class="apn-m">Requisições atendidas em '+esc(mesLabel(A.ref))+': <b>'+n0(A.n)+'</b>'+(A.mediaN?' · média '+n0(A.mediaN)+'/mês':'')+'</div>'
      +'<div class="apn-m">Fortpel em '+esc(mesLabel(A.ref))+' (compra direta das lojas, fora do almoxarifado): <b>'+brl0(A.fort)+'</b></div>'
      +'<div class="apn-m">Consumo do ano ('+esc(mesLabel(D.fechados[0]))+' a '+esc(mesLabel(D.fechados[D.fechados.length-1]))+'): <b>'+brl0(D.fechados.reduce(function(s,m){return s+D.meses[m].v;},0))+'</b></div>'
      +'</div>';
    h+='<div class="apn-box"><h4>Consumo do almoxarifado por mês (R$)</h4>'+grafico(D,A)
      +'<div class="apn-leg"><span><i style="background:#22d3ee"></i>mês em análise</span><span><i style="background:#1e5a8a"></i>outros meses</span><span><i style="background:#64748b"></i>mês incompleto na base</span><span><i style="background:#f59e0b;height:2px;vertical-align:3px"></i>média mensal'+(A.media?' ('+brl0(A.media)+')':'')+'</span><span>clique numa barra para analisar o mês</span></div></div>';
    h+='<div class="apn-2">'
      +'<div class="apn-box"><h4>O que mais saiu em '+esc(mesLabel(A.ref))+'</h4><table><thead><tr><th>Item</th><th>Qtd</th><th>R$</th><th>vs média</th></tr></thead><tbody>'
        +A.topItens.map(function(i){var vs=i.mediaAntes?i.qRef/i.mediaAntes-1:null;return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+'</small></td><td>'+n0(i.qRef)+'</td><td>'+brl0(i.vRef)+'</td><td class="'+(vs>0.1?'up':vs<-0.1?'dn':'')+'">'+pct(vs)+'</td></tr>';}).join('')+'</tbody></table></div>'
      +'<div class="apn-box"><h4>Quem mais pediu em '+esc(mesLabel(A.ref))+'</h4><table><thead><tr><th>Loja</th><th>Regional</th><th>R$</th><th>vs média</th></tr></thead><tbody>'
        +A.topLojas.map(function(l){return '<tr><td>'+esc(l.nome)+'</td><td>'+esc(l.reg)+'</td><td>'+brl0(l.v)+'</td><td class="'+(l.vs>0.1?'up':l.vs<-0.1?'dn':'')+'">'+pct(l.vs)+'</td></tr>';}).join('')+'</tbody></table></div>'
      +'</div>';
    h+='<div class="apn-2">'
      +'<div class="apn-box"><h4>Por setor em '+esc(mesLabel(A.ref))+'</h4><table><thead><tr><th>Setor</th><th>R$ no mês</th><th>Média mensal</th><th>vs média</th></tr></thead><tbody>'
        +A.setores.map(function(g){return '<tr><td>'+esc(g.setor)+(g.setor==='FACILITIES'?'<small>obras, manutenção e equipamentos</small>':'')+'</td><td>'+brl0(g.v)+'</td><td>'+brl0(g.media)+'</td><td class="'+(g.vs>0.1?'up':g.vs<-0.1?'dn':'')+'">'+pct(g.vs)+'</td></tr>';}).join('')+'</tbody></table></div>'
      +'<div class="apn-box"><h4>Por regional em '+esc(mesLabel(A.ref))+'</h4><table><thead><tr><th>Regional</th><th>R$ no mês</th><th>Média mensal</th><th>vs média</th></tr></thead><tbody>'
        +A.regs.map(function(g){return '<tr><td>'+esc(g.reg)+'</td><td>'+brl0(g.v)+'</td><td>'+brl0(g.media)+'</td><td class="'+(g.vs>0.1?'up':g.vs<-0.1?'dn':'')+'">'+pct(g.vs)+'</td></tr>';}).join('')+'</tbody></table></div>'
      +'</div><div>'
      +'<div class="apn-box"><h4>Repor primeiro (acabam em menos de 1 mês)</h4><table><thead><tr><th>Item</th><th>Estoque</th><th>Consumo/mês</th><th>Dura</th></tr></thead><tbody>'
        +(A.repor.length?A.repor.slice(0,10).map(function(i){return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+'</small></td><td>'+n0(Math.max(0,i.saldo))+'</td><td>'+n0(i.media)+'</td><td class="up">'+n1(i.dura)+' m</td></tr>';}).join('')
          +(A.repor.length>10?'<tr><td colspan="4" style="color:#8ca4bf">+ '+(A.repor.length-10)+' itens</td></tr>':''):'<tr><td colspan="4" style="color:#34d399">Nenhum item acaba em menos de 1 mês.</td></tr>')+'</tbody></table></div>'
      +'</div>';
    return h;
  }
  function calcularRegs(w){var reg=ler(w,'dbRegionaisMap',{})||{},o={};Object.keys(reg).forEach(function(k){o[String(reg[k]).toUpperCase()]=1;});Object.keys(REG_FIXA).forEach(function(k){o[REG_FIXA[k]]=1;});return o;}

  // Acha o bloco dos cards antigos e a rosca "Participação por Estoque" pelo texto (o módulo não tem ids estáveis).
  function menorCom(doc,testes){
    var achado=null;
    doc.body.querySelectorAll('div,section').forEach(function(el){
      if(el.closest&&el.closest('#apn'))return;
      var t=norm(el.textContent);if(t.length>4000)return;
      if(testes.every(function(x){return t.indexOf(x)>=0;})){if(!achado||achado.contains(el))achado=el;}
    });
    return achado;
  }
  function instalar(){
    var m=moduloAlm();if(!m)return;var w=m.w,doc=m.doc;
    if(typeof w.calcularEAtualizarPainel!=='function'&&typeof w.aplicarFiltros!=='function')return;
    // Regionais: corrige no módulo e redesenha uma vez
    if(corrigirRegionais(w)&&!w.__apnRegRedesenho){w.__apnRegRedesenho=true;setTimeout(function(){try{w.aplicarFiltros();}catch(e){try{w.calcularEAtualizarPainel();}catch(e2){}}w.__apnRegRedesenho=false;},50);}
    if(!w.__apnGancho){
      w.__apnGancho=true;
      ['aplicarFiltros','calcularEAtualizarPainel','atualizarVisaoGeral'].forEach(function(nome){var f=w[nome];if(typeof f!=='function')return;
        w[nome]=function(){corrigirRegionais(w);var r=f.apply(this,arguments);setTimeout(instalar,30);return r;};});
    }
    if(!doc.getElementById('apn-css')){var st=doc.createElement('style');st.id='apn-css';st.textContent=CSS+'.apn-oculto{display:none!important}';doc.head.appendChild(st);}
    var cards=doc.querySelector('[data-apn-cards]')||menorCom(doc,['TOTAL GERAL','ITENS CRITICOS','FORTPEL']);
    if(!cards)return;
    cards.setAttribute('data-apn-cards','1');cards.classList.add('apn-oculto');
    var rosca=doc.querySelector('[data-apn-rosca]')||menorCom(doc,['PARTICIPACAO POR ESTOQUE','NO PERIODO']);
    if(rosca&&!rosca.contains(cards)&&!rosca.querySelector('#apn')){rosca.setAttribute('data-apn-rosca','1');rosca.classList.add('apn-oculto');}
    var box=doc.getElementById('apn');
    if(!box||box.nextElementSibling!==cards){if(box)box.remove();box=doc.createElement('div');box.id='apn';cards.parentNode.insertBefore(box,cards);estado.assinatura='';
      box.addEventListener('change',function(e){var a=e.target.getAttribute('data-apn');if(a==='mes')estado.mes=e.target.value;if(a==='reg')estado.reg=e.target.value;desenhar(true);});
      box.addEventListener('click',function(e){var m=e.target.getAttribute&&e.target.getAttribute('data-m');if(m){estado.mes=m;desenhar(true);}});}
    desenhar(false);
    function desenhar(forcar){
      var a=assinatura(w);if(!forcar&&a===estado.assinatura)return;
      try{box.innerHTML=montar(w);estado.assinatura=assinatura(w);}catch(e){console.error('[Almoxarifado painel]',e);}
    }
  }
  setInterval(instalar,1500);
  window.__almoxPainelCalc={calcular:calcular,analisar:analisar,regionalDe:regionalDe,REG_FIXA:REG_FIXA};
})();
