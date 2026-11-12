// Almoxarifado · Painel (Visão Geral)
// Troca os 6 cards antigos (Almoxarifado/TI/Fortpel/Total/Lojas acima/Itens críticos) e a rosca
// "Participação por Estoque" por um painel direto:
//   1) quanto vale o estoque do almoxarifado hoje (AX, em R$);
//   2) quanto foi consumido no último mês fechado, comparado com a média e com o mês anterior;
//   3) quantos meses o estoque cobre e o que repor;
//   4) gráfico do consumo mês a mês e quem/o que mais consumiu no mês.
// Também corrige as regionais que apareciam como "NÃO MAPEADO" (CD, escritório, lojas fechadas, 064).
// Lê os dados já carregados no módulo (dbEstoqueRaw, dbConsumoRaw, dbFortpelRaw, dbEstoqueTI, dbRegionaisMap).
(function(){
  if(window.__almoxPainel)return;
  window.__almoxPainel='2026-11-10.1';

  // ---------- data de carga de cada base (payload.dbCargas, gravado pelo gatilho da nuvem) ----------
  // O "Atualizado na nuvem" do módulo muda a cada salvamento, mesmo quando só uma base foi trocada.
  // dbCargas diz, por base, quando ela mudou de verdade, quem carregou e quantas linhas tem.
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co',SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var CARGAS={dados:null,buscadoEm:0,buscando:false,erro:null};
  function acharSb(){var w=window;for(var i=0;i<6&&w;i++){try{if(w.sb&&w.sb.auth&&typeof w.sb.auth.getSession==='function')return w.sb;}catch(e){}if(w===w.parent)break;w=w.parent;}return null;}
  async function token(){
    var sb=acharSb();if(sb){try{var s=(await sb.auth.getSession()).data.session;if(s&&s.access_token)return s.access_token;}catch(e){}}
    var w=window;for(var i=0;i<6&&w;i++){try{if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token)return w.__PORTAL_SESSION.access_token;}catch(e){}if(w===w.parent)break;w=w.parent;}
    return null;
  }
  function buscarCargas(forcar){
    if(CARGAS.buscando)return;if(!forcar&&Date.now()-CARGAS.buscadoEm<60000)return;
    CARGAS.buscando=true;CARGAS.buscadoEm=Date.now();
    token().then(function(tk){if(!tk)throw new Error('sem sessão');
      return fetch(SB_URL+'/rest/v1/portal_sync?module_id=eq.alm&select=c:payload->dbCargas',{headers:{apikey:SB_KEY,Authorization:'Bearer '+tk}});})
      .then(function(r){if(!r.ok)throw new Error('Supabase '+r.status);return r.json();})
      .then(function(j){var c=(j&&j[0]&&j[0].c)||{};var antes=JSON.stringify(CARGAS.dados);CARGAS.dados=c;CARGAS.erro=null;if(antes!==JSON.stringify(c))estado.assinatura='';})
      .catch(function(e){CARGAS.erro=String(e&&e.message||e);})
      .then(function(){CARGAS.buscando=false;});
  }

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

  // ---------- categorias (pelo nome do item; o cadastro do estoque não traz categoria) ----------
  var CATS=[
    ['Calçados e produtos de venda',/^CALCADOS|^CALÇADOS|^CALCA |HANNA CARMELA/],
    ['Climatização',/AR CONDICIONADO|^COND\b|COND\+|^EVAP|UNID EVAP|SPLIT|SPRINGER|CARRIER|HITACHI|MIDEA|GAS REFRIG|TUBO COBRE|VRF|CLIMATIZADOR|CLORODIFLUOR|FLUIDO REF|COMPRESSOR|DIFUSOR|FILTRO DE AR|FILTRANTE|PAINEL CASSETE|^VENT /],
    ['Segurança e CFTV',/CAMERA (BULLET|BULETT|SPEED|HD PLUS|DOME|IP)|GRAVADOR|\bDVR\b|\bNVD|ALARME|SENSOR IVP|BALUN|MESA DE CONTROLE|EXTINTOR|DETECTOR DE FUMACA|COFRE|LACRE|SAIDA DE EMERGENCIA|VBOX/],
    ['Informática, som e automação',/IMPRESSORA|MULTIFUNCIONAL|MONITOR|\bCPU\b|DESKTOP|SWITCH|NOBREAK|ESTABILIZADOR|LEITOR|COLETOR|GAVETA|WINDOWS|MODEM|ROTEADOR|DISCO|\bHD\b|\bSSD\b|MEMORIA|TONN?ER|UNIDADE DE IMAGEM|KIT CILINDRO|TEL IP|TELEFONE|FONTE|TECLADO|MOUSE|WEBCAM|TELEVISOR|\bTV\b|NOTEBOOK|GTIN|ACCESS POINT|PATCH|RACK|REGISTRADOR ELETRONICO|RELOGIO DE PONTO|CAIXA DE SOM|AMPLIFICADOR|SLIM 3200|SENSUS/],
    ['Elétrica, iluminação e rede',/CABO|TERMINAL|DISJ|LUMINARIA|\bLUM\b|LAMPADA|REFLETOR|TOMADA|INTERRUPTOR|ELETRODUTO|\bFIO\b|QUADRO DE|QD GER|PLAFON|SPOT|TRILHO ELETRIF|ARANDELA|CONTATOR|ELETROCALHA|CALHA PERFURADA|CONECTOR|CORDAO|REATOR|\bLED\b/],
    ['Obra e construção',/VIDRO|METALON|P\.?F\.?L|PERFIL|CANT(ONEIRA)?\b|TELHA|CUMEEIRA|PISO|PORC|DRYWALL|GYP|PLACA ST|MONTANTE|GUIA 48|FORRO|BLOCO DE CONCRETO|ALUMINIO|TUBO|CIMENTO|ARGAMASSA|NIVELADOR|TINTA|MASSA|GESSO|SELANTE|SILICONE|PU 40|DIALINE|DELANIL|DIATEX|ZARCAO|COLORDUR|DEL REY|DECOR COLORS|ROLO|BARRA CHATA|CHAPA|PARAFUSO|PREGO|BUCHA|PORTA|BATENTE|DOBRADICA|PUX|MADEIRA|MADERITE|TABUA|M\.?D\.?F|REFORCO|ELETRODO|CAIXA ACOPLADA|CORT ROLO|CORTINA|GOGO|\bMAN \d|CHAVE DE FENDA/],
    ['Mobiliário, expositores e visual de loja',/EXPOSITOR|^EXP\.|MOBILIARIO|MOVEL|TOTEM|TOTEN|GRADE|LONGARINA|COLUNA|PRATELEIRA|ARARA|CABIDE|ARMARIO|BALC|PEDESTAL|TABULEIRO|PUFF|MESA|CADEIRA|BANQUETA|BONECO|MANEQUIM|AMARRACAO|ACRILICO|PROTETOR DE COLUNA|DISPLAY|TAPETE|SUPORTE|VITRINE|GANCHO|ESPELHO|BANCO|CESTA|CESTAO|SLAT|SHOP IN SHOP|TESTEIRA|BANDEJA|PAINEL KIT|CREMALHEIRA|DEMOCRATA|ENCHIMENTO/],
    ['Logística, frota e equipamentos',/EMPILHADEIRA|BATERIA|CARREGADOR|RAMPA|PALETEIRA|CARRO|MOTO|VELA|LANTERNA|FILME STRETCH|FITA PP|ESCADA|CARRINHO|DOCA/],
    ['Campanhas, brindes e marketing',/BRUNCH|LANCHE|BUFFET|TABLOIDE|IMPRESSOS|PANFLETO|LIVRINHO|BANDEIR|COPO ECO|TOALHA|ORGULHO|BRINDE|CAMPANHA|SACOCHILA|MOCHILA|KOLOSH|SQUEEZE|CHAVEIRO|CADERNETA|CREDENCIAL|BALAO|NATAL/],
    ['Fardamento e EPI',/FARDA|^CAM\.|CAMISA|CAMISETA|LUVA|BOTA|ABAFADOR|CAPACETE|OCULOS|COLETE|AVENTAL|CRACH|CARTUCHO 3M|MASCARA/],
    ['Embalagens e etiquetas',/SACOLA|EMBALAGEM|ETIQ|BOBINA|RIBBON|\bTAG\b|TRAVA ANEL|ALFINETE/],
    ['Copa, escritório e limpeza',/PAPEL|CANETA|PASTA|LIMP|DESINF|DETERG|SABAO|ALCOOL|VASSOURA|SACO DE LIXO|LIXEIRA|CAFE|ACUCAR|COPO|GUARDANAPO|GRAMPO|CLIPS|ENVELOPE|TESOURA|COLA|REFRI|FRIGOBAR|MICROONDAS|F MIC|FORNO|CAFETEIRA|PIPOQUEIRA|PURIFICADOR|COLCHAO|GAS RESIDENCIAL/]
  ];

  function categoria(nome){var n=norm(nome);for(var i=0;i<CATS.length;i++)if(CATS[i][1].test(n))return CATS[i][0];return 'Outros';}

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
  // Almoxarifado Facilities: requisição do setor FACILITIES; item de estoque é de Facilities quando a maior parte
  // do que saiu foi para Facilities ou, sem saída, quando a categoria é de obra/manutenção.
  var CAT_FAC={'Climatização':1,'Obra e construção':1,'Elétrica, iluminação e rede':1,'Segurança e CFTV':1,'Logística, frota e equipamentos':1};
  function calcular(w,filtroReg,visao){
    visao=visao||'tudo';
    var cons=ler(w,'dbConsumoRaw',[])||[],est=ler(w,'dbEstoqueRaw',[])||[],estTI=ler(w,'dbEstoqueTI',[])||[];
    var fort=ler(w,'dbFortpelRaw',[])||[],anoF=Number(ler(w,'fortpelAnoRef',0))||new Date().getFullYear();
    var reg=ler(w,'dbRegionaisMap',{})||{},nomes=ler(w,'dbLojaNomeMap',{})||{};
    var hojeISO=new Date(Date.now()-3*36e5).toISOString().slice(0,10);
    var atual=mesAtual(),D={atual:atual,meses:{},itens:{},lojas:{},regs:{},setores:{},estoque:0,nEst:0,estTI:0,fort:{},nLinhasEst:est.length,atend:{},semCustoEst:[]};
    // Estoque do almoxarifado trocado pelo de TI (mesmo arquivo carregado no lugar errado)
    var codTI={};estTI.forEach(function(e){codTI[codItem(e['Código'])]=1;});
    var iguais=est.filter(function(e){return codTI[codItem(e['Código'])];}).length;
    D.estoqueEhTI=est.length>0&&est.length<600&&iguais>=est.length*0.8;
    function nomeLoja(cod,bruto){var n=nomes[cod];return n?String(n).replace(/^\d+\s*-\s*/,String(cod).padStart(3,'0')+' - '):limpa(bruto);}
    // Estoque do almoxarifado (CD + AX), item a item
    var setItem={};cons.forEach(function(r){var q=num(r['Qtd Atendida']);if(!q)return;var c=codItem(r['Código']),o=setItem[c]=setItem[c]||{f:0,o:0};
      var v=num(r['Custo Atendido'])||q;if(limpa(r['Setor']).toUpperCase()==='FACILITIES')o.f+=v;else o.o+=v;});
    function itemFac(c,nome){var o=setItem[c];return o&&(o.f||o.o)?o.f>o.o:!!CAT_FAC[categoria(nome)];}
    function naVisao(fac){return visao==='tudo'||(visao==='fac')===fac;}
    D.visao=visao;D.estoqueTodo=0;
    est.forEach(function(e){
      var c=codItem(e['Código']),q=num(e['Estoque Atual']),u=unitReal(c);u=u!=null?u:num(e['Custo Unitário']);
      if(q>0)D.estoqueTodo+=q*u;
      if(!naVisao(itemFac(c,e['Insumo'])))return;
      var it=D.itens[c]=D.itens[c]||{cod:c,nome:limpa(e['Insumo']),saldo:0,custo:0,meses:{},v:{}};
      it.saldo+=q;it.custo=u;it.emEstoque=true;if(!it.nome)it.nome=limpa(e['Insumo']);
      if(q>0){D.estoque+=q*u;D.nEst++;if(!u)D.semCustoEst.push(it);}
      // Posição do estoque = movimento mais recente do relatório (última compra), nunca no futuro.
      var dc=String(e['Última Compra']||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if(dc){var iso=dc[3]+'-'+dc[2]+'-'+dc[1];it.ultCompra=iso;if(iso<=hojeISO&&(!D.posEstoque||iso>D.posEstoque))D.posEstoque=iso;}
    });
    estTI.forEach(function(e){var q=num(e['Estoque Atual']);if(q>0)D.estTI+=q*num(e['Custo Unitário']);});
    // Consumo (quantidade atendida) por mês, item, loja e regional
    cons.forEach(function(r){
      var m=mesDe(r['Data Solicitação']);if(!m)return;
      var tq=Date.parse(r['Data Solicitação']);if(!isNaN(tq)&&(!D.ultReq||tq>D.ultReq))D.ultReq=tq;
      var q=num(r['Qtd Atendida']);
      var c=codItem(r['Código']),u=unitReal(c),v=u!=null?Math.round(q*u*100)/100:num(r['Custo Atendido']);
      var lj=codLoja(r['Empresa Solicitante']),rg=lj?regionalDe(reg,lj):'NÃO MAPEADO';
      if(filtroReg&&rg!==filtroReg)return;
      if(!naVisao(limpa(r['Setor']).toUpperCase()==='FACILITIES'))return;
      // Nível de atendimento: quanto do que foi pedido o almoxarifado entregou (inclui pedido não atendido).
      var at=D.atend[m]=D.atend[m]||{sol:0,at:0,linhas:0,zero:0,semCusto:0,semCustoQ:[],ultDia:0};
      var qs=num(r['Qtd Solicitada']);at.sol+=Math.max(qs,q);at.at+=q;at.linhas++;if(!q)at.zero++;
      if(!isNaN(tq)){var dia=new Date(tq-3*36e5).getUTCDate();if(dia>at.ultDia)at.ultDia=dia;}
      if(!q)return;
      if(!v){at.semCusto++;if(at.semCustoQ.length<200)at.semCustoQ.push({cod:c,nome:limpa(r['Insumo']),q:q,loja:limpa(r['Empresa Solicitante']),data:r['Data Solicitação']});}
      var mm=D.meses[m]=D.meses[m]||{v:0,n:0};mm.v+=v;mm.n++;
      var it=D.itens[c]=D.itens[c]||{cod:c,nome:limpa(r['Insumo']),saldo:0,custo:q?v/q:0,meses:{},v:{}};
      it.meses[m]=(it.meses[m]||0)+q;it.v[m]=(it.v[m]||0)+v;if(!it.nome)it.nome=limpa(r['Insumo']);
      var l=D.lojas[lj]=D.lojas[lj]||{cod:lj,nome:nomeLoja(lj,r['Empresa Solicitante']),reg:rg,v:{}};l.v[m]=(l.v[m]||0)+v;
      var g=D.regs[rg]=D.regs[rg]||{v:{}};g.v[m]=(g.v[m]||0)+v;
      var st=limpa(r['Setor']).toUpperCase()||'SEM SETOR';var se=D.setores[st]=D.setores[st]||{v:{}};se.v[m]=(se.v[m]||0)+v;
    });
    // Fortpel: compra direta das lojas (não passa pelo almoxarifado)
    fort.forEach(function(f){var mes=Number(f.mes);if(!mes||visao==='fac')return;var lj=String(parseInt(f.lojaCodigo,10));
      if(filtroReg&&regionalDe(reg,lj)!==filtroReg)return;
      var m=anoF+'-'+String(mes).padStart(2,'0');D.fort[m]=(D.fort[m]||0)+num(f.valor);});
    D.listaMeses=Object.keys(D.meses).sort();
    D.fechados=D.listaMeses.filter(function(m){return m<atual;});
    D.temAtual=!!D.meses[atual];
    // Item sem custo com saldo: o valor do estoque fica subestimado (sem custo → R$ 0). Sem duplicar itens.
    var vistos={};D.semCustoEst=D.semCustoEst.filter(function(i){if(vistos[i.cod]||i.custo)return false;vistos[i.cod]=1;return true;});
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
    // Mês em andamento: compara a projeção (ritmo diário até a última requisição da base × dias do mês).
    A.parcial=ref===D.atual;var at=D.atend[ref]||{};
    if(A.parcial){var p=ref.split('-').map(Number),dm=new Date(p[0],p[1],0).getDate();A.ultDia=at.ultDia||1;A.diasMes=dm;A.proj=A.valor/A.ultDia*dm;}
    var base=A.parcial?A.proj:A.valor;
    A.vsMedia=A.media?base/A.media-1:null;
    A.vsAnt=A.ant&&D.meses[A.ant].v?base/D.meses[A.ant].v-1:null;
    // Mês com bem menos requisições que o normal = base do mês incompleta (não vale para o mês em andamento).
    A.incompleto=!A.parcial&&A.mediaN!=null&&A.n<A.mediaN*0.4;
    // Nível de atendimento = quantidade atendida ÷ pedida (mês x média dos meses anteriores).
    var fill=function(m){var a=D.atend[m];return a&&a.sol?a.at/a.sol:null;};
    A.fill=fill(ref);var fl=antes.map(fill).filter(function(x){return x!=null;});A.fillMedia=fl.length?fl.reduce(function(s,x){return s+x;},0)/fl.length:null;
    A.atRef=at;A.fillMeses=D.listaMeses.map(function(m){var a=D.atend[m]||{};return {m:m,sol:a.sol||0,at:a.at||0,linhas:a.linhas||0,zero:a.zero||0,f:fill(m)};});
    A.semCustoAno=Object.keys(D.atend).reduce(function(s,m){return s+(D.atend[m].semCusto||0);},0);
    // Consumo médio mensal (últimos 3 meses fechados com base boa) para a cobertura
    var ult=ms.filter(function(m){return !A.mediaN||D.meses[m].n>=A.mediaN*0.4;}).slice(-3);
    A.mesesCob=ult;
    A.consMedio3=ult.length?ult.reduce(function(s,m){return s+D.meses[m].v;},0)/ult.length:0;
    A.cobertura=A.consMedio3?D.estoque/A.consMedio3:null;
    // Mesma conta sem as obras (Facilities), que distorcem o consumo médio.
    var facM=function(m){return (D.setores.FACILITIES&&D.setores.FACILITIES.v[m])||0;};
    A.consOper3=ult.length?ult.reduce(function(s,m){return s+D.meses[m].v-facM(m);},0)/ult.length:0;
    A.cobOper=A.consOper3?D.estoque/A.consOper3:null;
    // Itens: consumo do mês x média do item; cobertura de cada item
    var itens=Object.keys(D.itens).map(function(c){return D.itens[c];});
    itens.forEach(function(it){
      it.qRef=it.meses[ref]||0;it.vRef=it.v[ref]||0;
      it.vMediaAntes=antes.length?antes.reduce(function(s,m){return s+(it.v[m]||0);},0)/antes.length:0;
      var qm=ult.reduce(function(s,m){return s+(it.meses[m]||0);},0)/(ult.length||1);
      it.media=qm;it.mediaAntes=antes.length?antes.reduce(function(s,m){return s+(it.meses[m]||0);},0)/antes.length:0;
      it.dura=qm>0?Math.max(0,it.saldo)/qm:null;
      it.nUlt=ult.filter(function(m){return (it.meses[m]||0)>0;}).length;
      it.semSaida6=ms.slice(-6).every(function(m){return !(it.meses[m]>0);});
    });
    // Estoque: composição (maiores valores) e o que está parado (sem saída nos últimos 6 meses fechados)
    var comSaldo=itens.filter(function(i){return i.emEstoque&&i.saldo>0;}).map(function(i){i.valorEst=i.saldo*(i.custo||0);return i;}).sort(function(a,b){return b.valorEst-a.valorEst;});
    A.topEst=comSaldo.slice(0,15);A.restoEst={n:Math.max(0,comSaldo.length-15),v:comSaldo.slice(15).reduce(function(s,i){return s+i.valorEst;},0)};
    // Parado = sem saída nos últimos 6 meses E sem compra nos últimos 6 meses. Comprado há menos de 6 meses e ainda
    // sem saída (ex.: material de obra que acabou de chegar) fica à parte como "recém-comprado".
    var corte6=new Date(Date.now()-183*864e5).toISOString().slice(0,10);
    comSaldo.forEach(function(i){i.cat=categoria(i.nome);i.recente=!!(i.ultCompra&&i.ultCompra>=corte6);});
    A.parado=comSaldo.filter(function(i){return i.semSaida6&&!i.recente;});A.paradoV=A.parado.reduce(function(s,i){return s+i.valorEst;},0);
    A.recente=comSaldo.filter(function(i){return i.semSaida6&&i.recente;});A.recenteV=A.recente.reduce(function(s,i){return s+i.valorEst;},0);
    A.comSaldo=comSaldo;
    function porCat(lst){var o={};lst.forEach(function(i){var c=o[i.cat]=o[i.cat]||{cat:i.cat,n:0,v:0,itens:[]};c.n++;c.v+=i.valorEst;c.itens.push(i);});
      return Object.keys(o).map(function(k){return o[k];}).sort(function(a,b){return b.v-a.v;});}
    A.paradoCat=porCat(A.parado);A.recenteCat=porCat(A.recente);
    // Itens que saem na requisição mas não existem no estoque (compra direta / obra): não são "repor".
    A.compraDireta=itens.filter(function(i){return !i.emEstoque&&i.media>0;}).length;
    // Compra com estoque alto: comprado nos últimos 60 dias tendo estoque para mais de 6 meses de saída.
    var corte60=new Date(Date.now()-60*864e5).toISOString().slice(0,10);
    A.alta=comSaldo.filter(function(i){return i.ultCompra&&i.ultCompra>=corte60&&i.media>0&&i.saldo/i.media>6;})
      .map(function(i){i.excesso=Math.max(0,i.saldo-6*i.media)*(i.custo||0);return i;}).sort(function(a,b){return b.excesso-a.excesso;});
    A.altaV=A.alta.reduce(function(s,i){return s+i.excesso;},0);
    A.topItens=itens.filter(function(i){return i.vRef>0;}).sort(function(a,b){return b.vRef-a.vRef;}).slice(0,10);
    // O que puxou o consumo do mês acima da média (itens com maior aumento em R$ sobre a própria média).
    A.puxou=A.parcial?[]:itens.map(function(i){i.delta=i.vRef-i.vMediaAntes;return i;}).filter(function(i){return i.delta>0;}).sort(function(a,b){return b.delta-a.delta;}).slice(0,10);
    A.puxouV=A.puxou.reduce(function(s,i){return s+i.delta;},0);
    A.compraDiretaV=itens.filter(function(i){return !i.emEstoque;}).reduce(function(s,i){return s+i.vRef;},0);
    // Repor = item de estoque, com saída recorrente (2 dos 3 últimos meses) e que acaba em menos de 1 mês.
    A.repor=itens.filter(function(i){return i.emEstoque&&i.nUlt>=2&&i.media>0&&i.dura!=null&&i.dura<1;}).sort(function(a,b){return a.dura-b.dura||b.media*b.custo-a.media*a.custo;});
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
    // Concentração do mês: a loja que mais pediu e o item que mais saiu, em % do mês.
    A.lojaTopPct=A.topLojas[0]&&A.valor?A.topLojas[0].v/A.valor:0;
    A.itemTopPct=A.topItens[0]&&A.valor?A.topItens[0].vRef/A.valor:0;
    return A;
  }

  // ---------- gráfico ----------
  function grafico(D,A){
    var ms=D.fechados.slice(D.temAtual?-11:-12).concat(D.temAtual?[D.atual]:[]);if(!ms.length)return '';
    var W=1100,H=240,pl=64,pr=10,pt=18,pb=28,vals=ms.map(function(m){return D.meses[m].v;});
    var mx=Math.max.apply(null,vals.concat([A.media||0,1]));var passo=Math.pow(10,Math.floor(Math.log10(mx)));var top=Math.ceil(mx/passo)*passo;if(top/passo<=2)top=Math.ceil(mx/(passo/2))*(passo/2);
    var cw=(W-pl-pr)/ms.length,bw=Math.min(46,cw*0.6),y=function(v){return pt+(H-pt-pb)*(1-v/top);};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">';
    for(var k=0;k<=4;k++){var v=top*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke="#1d3550"/><text x="'+(pl-6)+'" y="'+(yy+3)+'" text-anchor="end" font-size="10" fill="#8ca4bf">R$ '+abrev(v)+'</text>';}
    ms.forEach(function(m,i){var x=pl+cw*i+(cw-bw)/2,v=vals[i],sel=m===A.ref,par=m===D.atual,inc=!par&&A.mediaN&&D.meses[m].n<A.mediaN*0.4;
      g+='<rect x="'+x+'" y="'+y(v)+'" width="'+bw+'" height="'+Math.max(1,y(0)-y(v))+'" rx="3" fill="'+(sel?'#22d3ee':inc?'#64748b':par?'#334155':'#1e5a8a')+'"'+(par?' stroke="#94a3b8" stroke-dasharray="4 3"':'')+' data-m="'+m+'" style="cursor:pointer"><title>'+esc(mesLabel(m)+(par?' (em andamento)':'')+': '+brl(v)+' · '+n0(D.meses[m].n)+' requisições')+'</title></rect>'
        +'<text x="'+(x+bw/2)+'" y="'+(y(v)-5)+'" text-anchor="middle" font-size="10" font-weight="'+(sel?'800':'400')+'" fill="'+(sel?'#e8f6ff':'#9fb3c8')+'">'+abrev(v)+'</text>'
        +'<text x="'+(x+bw/2)+'" y="'+(H-9)+'" text-anchor="middle" font-size="10.5" font-weight="'+(sel?'800':'400')+'" fill="'+(sel?'#22d3ee':'#8ca4bf')+'">'+mesLabel(m)+(par?'*':'')+'</text>';});
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
    +'#apn .apn-k{cursor:pointer;position:relative}#apn .apn-k:hover{border-color:var(--c)}#apn .apn-k.apn-on{box-shadow:0 0 0 2px var(--c) inset}#apn .apn-ver{position:absolute;right:12px;bottom:8px;font-style:normal;font-size:10.5px;color:var(--c);opacity:.8}'
    +'#apn .apn-vis{display:flex;gap:6px;margin:0 0 12px;flex-wrap:wrap}#apn .apn-vis button{background:#0b1726;color:#9fb3c8;border:1px solid #1f3654;border-radius:20px;padding:7px 14px;font-weight:700;font-size:12.5px;cursor:pointer}#apn .apn-vis button.on{background:#0e7c66;color:#fff;border-color:#0e7c66}'
    +'#apn .apn-alerta{border-color:#b45309;background:#2a1a08;color:#fed7aa;cursor:pointer}#apn .apn-alerta.apn-on{box-shadow:0 0 0 2px #f59e0b inset}#apn .apn-mini{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}'
    +'#apn .apn-bt{background:#14284a;color:#e8f0fa;border:1px solid #2f5478;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:12.5px}#apn .apn-bt:hover{background:#1d3a66}'
    +'#apn tr.apn-tot td{font-weight:800;color:#e8f0fa;border-top:2px solid #2a4566}'
    +'#apn .up{color:#fb7185}#apn .dn{color:#34d399}#apn .apn-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}@media(max-width:1100px){#apn .apn-mini{grid-template-columns:1fr}}'
    +'#apn .apn-m{background:#0b1726;border:1px solid #1a2f4a;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#9fb3c8;line-height:1.5}#apn .apn-m b{color:#e8f0fa;font-size:15px}'
    +'#apn .apn-box{background:#0d1b2e;border:1px solid #1f3654;border-radius:12px;padding:14px 16px;margin-top:12px;min-width:0}#apn .apn-box h4{margin:0 0 8px;font-size:13.5px;color:#fff;font-weight:800}'
    +'#apn .apn-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}@media(max-width:1100px){#apn .apn-2{grid-template-columns:1fr}}'
    +'#apn table{width:100%;border-collapse:collapse;font-size:12.5px}#apn th{text-align:right;color:#8ca4bf;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;padding:6px 6px;border-bottom:1px solid #1f3654;font-weight:700}#apn th:first-child,#apn td:first-child{text-align:left}'
    +'#apn td{text-align:right;padding:6px;border-bottom:1px solid #132840;font-variant-numeric:tabular-nums;white-space:nowrap}#apn td:first-child{white-space:normal}#apn td small{display:block;color:#7f96b2;font-size:10.5px}'
    +'#apn .apn-aviso{background:#3a1d08;border:1px solid #b45309;color:#fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;line-height:1.5}'
    +'#apn .apn-k small.apn-dt{color:#7f96b2;font-size:11.5px;margin-top:2px;margin-bottom:12px}'
    +'#apn .apn-bases{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}#apn .apn-bt0{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#8ca4bf;margin-right:4px}'
    +'#apn .apn-base{font-size:11.5px;border-radius:20px;padding:4px 10px;border:1px solid #1f3654;background:#0b1726;color:#9fb3c8;cursor:default}#apn .apn-base b{color:#e8f0fa}'
    +'#apn .apn-base.apn-ok{border-color:#065f46}#apn .apn-base.apn-ok::before{content:"● ";color:#34d399}#apn .apn-base.apn-atn{border-color:#b45309}#apn .apn-base.apn-atn::before{content:"● ";color:#f59e0b}#apn .apn-base.apn-ruim{border-color:#be123c;background:#2a0d16}#apn .apn-base.apn-ruim::before{content:"● ";color:#fb7185}'
    +'#apn .apn-aud{padding-bottom:6px}#apn .apn-ap{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 6px;border-top:1px solid #132840}#apn .apn-ap:first-of-type{border-top:0}'
    +'#apn .apn-ap>i{font-style:normal;font-size:13px;line-height:1.4}#apn .apn-ap b{color:#e8f0fa;font-size:13px}#apn .apn-ap small{display:block;color:#9fb3c8;font-size:12px;line-height:1.45;margin-top:2px}'
    +'#apn .apn-ap>em{font-style:normal;font-weight:800;color:#e8f0fa;white-space:nowrap;font-variant-numeric:tabular-nums}#apn .apn-ap>em u{text-decoration:none;font-weight:400;font-size:11px;color:#22d3ee;margin-left:6px}'
    +'#apn .apn-ap.apn-s3>em{color:#fb7185}#apn .apn-ap.apn-s2>em{color:#f59e0b}#apn .apn-clic{cursor:pointer;border-radius:8px}#apn .apn-clic:hover{background:#0f2238}#apn .apn-ap.apn-on{background:#0f2238;box-shadow:0 0 0 1px #22d3ee inset}'
    +'@media(max-width:700px){#apn .apn-ap{grid-template-columns:22px minmax(0,1fr)}#apn .apn-ap>em{grid-column:2}}'
    +'#apn .apn-leg{display:flex;gap:14px;font-size:11px;color:#8ca4bf;margin-top:4px;flex-wrap:wrap}#apn .apn-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}';

  var estado={mes:null,reg:'',kpi:null,visao:'oper',assinatura:'',html:''};
  function assinatura(w){
    // Soma de conteúdo de cada base: uma carga nova com o mesmo número de linhas (ex.: Fortpel trocando
    // só os valores de novembro) também redesenha os cards. Antes só o tamanho era comparado.
    var c=ler(w,'dbConsumoRaw',[])||[],e=ler(w,'dbEstoqueRaw',[])||[],f=ler(w,'dbFortpelRaw',[])||[],t=ler(w,'dbEstoqueTI',[])||[];
    function soma(arr,campos){var s=0;for(var i=0;i<arr.length;i++){var r=arr[i];if(!r)continue;for(var j=0;j<campos.length;j++)s+=num(r[campos[j]])*(j+1);}return Math.round(s*100);}
    var u=c.length?(c[c.length-1]['Data Solicitação']+'|'+c[0]['Qtd Atendida']):'';
    return [c.length,e.length,f.length,t.length,u,soma(c,['Qtd Atendida','Custo Atendido','Qtd Solicitada']),soma(e,['Estoque Atual','Custo Unitário']),soma(f,['valor','mes']),soma(t,['Estoque Atual']),
      JSON.stringify(CARGAS.dados||{}),new Date().toISOString().slice(0,13),estado.mes,estado.reg,estado.visao].join('#');
  }
  function montar(w){
    var D=calcular(w,estado.reg,estado.visao),A=analisar(D,estado.mes);
    var regsTodas=Object.keys(calcularRegs(w)).sort();
    var NV={oper:'🏬 Almoxarifado Operação (lojas)',fac:'🏗 Almoxarifado Facilities',tudo:'📦 Almoxarifado — tudo'};
    var opMes=D.fechados.slice().reverse();if(D.temAtual)opMes.unshift(D.atual);
    var h='<div class="apn-vis">'+['oper','fac','tudo'].map(function(v){return '<button type="button" data-visao="'+v+'" class="'+(estado.visao===v?'on':'')+'">'+NV[v]+'</button>';}).join('')+'</div>'
      +'<div class="apn-top"><div><h2>'+NV[estado.visao]+' — situação '+(A.ref?'de '+esc(mesLongo(A.ref))+(A.parcial?' (mês em andamento)':''):'')+'</h2><small>'+(estado.reg?'Regional '+esc(estado.reg):'Rede toda')+' · consumo = quantidade atendida pelo almoxarifado</small></div>'
      +'<div class="apn-sel"><select data-apn="reg"><option value="">Rede toda</option>'+regsTodas.map(function(r){return '<option'+(r===estado.reg?' selected':'')+'>'+esc(r)+'</option>';}).join('')+'</select>'
      +'<select data-apn="mes">'+opMes.map(function(m){return '<option value="'+m+'"'+(m===A.ref?' selected':'')+'>'+mesLabel(m)+(m===D.atual?' (parcial)':'')+'</option>';}).join('')+'</select></div></div>';
    var fd=function(iso){return iso?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'—';};
    var fdh=function(iso){if(!iso)return '—';var d=new Date(Date.parse(iso)-3*36e5).toISOString();return d.slice(8,10)+'/'+d.slice(5,7)+' '+d.slice(11,16);};
    var hojeISO=new Date(Date.now()-3*36e5).toISOString().slice(0,10);
    var ultReqISO=D.ultReq?new Date(D.ultReq-3*36e5).toISOString().slice(0,10):null;
    var CG=CARGAS.dados||ler(w,'dbCargas',null)||{};
    h+=faixaBases(D,CG,ultReqISO,hojeISO,fd,fdh);
    if(!A.ref)return h+'<div class="apn-aviso">Sem consumo carregado no módulo.</div>';
    if(D.estoqueEhTI)h+='<div class="apn-aviso" style="background:#3b0d16;border-color:#e11d48;color:#fecdd3">⛔ <b>O estoque do almoxarifado carregado é o arquivo de TI</b> ('+n0(D.nLinhasEst)+' itens de informática). O valor abaixo não é o estoque real. Em <b>Carregar Planilhas</b>, coloque o <b>estoque do AX</b> no campo de estoque do almoxarifado e o <b>TI</b> no campo de TI.</div>';
    if(A.incompleto)h+='<div class="apn-aviso">⚠ <b>'+esc(mesLongo(A.ref))+' está incompleto na base</b>: só '+n0(A.n)+' requisições, quando a média é '+n0(A.mediaN)+' por mês. Carregue de novo a planilha de consumo com o mês inteiro — até lá o consumo do mês aparece menor do que foi.</div>';
    var corV=A.vsMedia==null||(A.parcial&&A.ultDia<10)?'#22d3ee':A.vsMedia>0.1?'#fb7185':A.vsMedia<-0.1?'#34d399':'#22d3ee';
    var cEst=CG.dbEstoqueRaw&&CG.dbEstoqueRaw.em;
    var dtEst=cEst?'estoque carregado em <em>'+fdh(cEst)+'</em>':'última entrada no estoque <em>'+fd(D.posEstoque)+'</em>';
    function cls(v,lim){return v==null?'':v>lim?'up':v<-lim?'dn':'';}
    // Card limpo: rótulo, número, 1 linha de comparação, 1 linha de data. O resto vai para a Auditoria.
    function card(k,cor,tit,val,linha,data){return '<div class="apn-k'+(estado.kpi===k?' apn-on':'')+'" data-k="'+k+'" style="--c:'+cor+'" title="Clique para ver a composição"><span>'+tit+'</span><b>'+val+'</b><small>'+linha+'</small><small class="apn-dt">'+data+'</small><i class="apn-ver">'+(estado.kpi===k?'fechar ▴':'ver composição ▾')+'</i></div>';}
    h+='<div class="apn-kpis">'
      +card('est','#38bdf8','Estoque hoje'+(D.visao==='oper'?' · operação':D.visao==='fac'?' · Facilities':''),brl0(D.estoque),
        n0(D.nEst)+' itens com saldo'+(D.visao!=='tudo'&&D.estoqueTodo?' · '+n0(D.estoque/D.estoqueTodo*100)+'% do almoxarifado':''),dtEst)
      +card('cons',corV,'Consumo de '+esc(mesLabel(A.ref))+(A.parcial?' (parcial)':''),brl0(A.valor),
        A.media==null?'sem meses anteriores para comparar':A.parcial&&A.ultDia<10?'início do mês: comparação com a média a partir do dia 10':(A.parcial?'projeção '+brl0(A.proj)+' · ':'')+'<em class="'+cls(A.vsMedia,0.1)+'">'+pct(A.vsMedia)+'</em> vs média de '+brl0(A.media),
        'requisições até <em>'+fd(ultReqISO)+'</em>'+(A.parcial?' ('+A.ultDia+' de '+A.diasMes+' dias)':''))
      +card('dura',A.cobertura==null?'#94a3b8':A.cobertura<1?'#fb7185':A.cobertura<2?'#f59e0b':'#34d399','O estoque dura',A.cobertura==null?'—':n1(A.cobertura)+' meses',
        'saída média de '+brl0(A.consMedio3)+'/mês','média de '+(A.mesesCob.length?esc(mesLabel(A.mesesCob[0]))+' a '+esc(mesLabel(A.mesesCob[A.mesesCob.length-1])):'—'))
      +card('repor',A.repor.length?'#f59e0b':'#34d399','Itens para repor',n0(A.repor.length)+' itens',
        A.reporV?'repor 2 meses ≈ <em>'+brl0(A.reporV)+'</em>':'nenhum item acaba em menos de 1 mês','acabam em menos de 1 mês')
      +'</div>';
    if(estado.kpi)h+=detalhe(estado.kpi,D,A,fd);
    h+=auditoria(D,A,CG,ultReqISO,hojeISO,fd,fdh);
    var cFort=CG.dbFortpelRaw&&CG.dbFortpelRaw.em;
    h+='<div class="apn-mini">'
      +'<div class="apn-m">Requisições em '+esc(mesLabel(A.ref))+': <b>'+n0(A.atRef.linhas||A.n)+'</b>'+(A.fill!=null?' · atendido <b class="'+(A.fillMedia!=null&&A.fill<A.fillMedia-0.03?'up':'')+'">'+n0(A.fill*100)+'%</b> do pedido'+(A.fillMedia!=null?' (média '+n0(A.fillMedia*100)+'%)':''):'')+'</div>'
      +'<div class="apn-m">Fortpel em '+esc(mesLabel(A.ref))+' (compra direta das lojas, fora do almoxarifado): <b>'+brl0(A.fort)+'</b>'+(cFort?'<br><span style="font-size:11px">carregada em '+fdh(cFort)+'</span>':'')+'</div>'
      +'<div class="apn-m">Consumo do ano ('+esc(mesLabel(D.fechados[0]||A.ref))+' a '+esc(mesLabel(D.fechados[D.fechados.length-1]||A.ref))+', meses fechados): <b>'+brl0(D.fechados.reduce(function(s,m){return s+D.meses[m].v;},0))+'</b></div>'
      +'</div>';
    h+='<div class="apn-box"><h4>Consumo do almoxarifado por mês (R$)</h4>'+grafico(D,A)
      +'<div class="apn-leg"><span><i style="background:#22d3ee"></i>mês em análise</span><span><i style="background:#1e5a8a"></i>outros meses</span><span><i style="background:#64748b"></i>mês incompleto na base</span>'+(D.temAtual?'<span><i style="background:#334155;border:1px dashed #94a3b8"></i>* mês em andamento</span>':'')+'<span><i style="background:#f59e0b;height:2px;vertical-align:3px"></i>média mensal'+(A.media?' ('+brl0(A.media)+')':'')+'</span><span>clique numa barra para analisar o mês</span></div></div>';
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
  // Dias úteis (seg–sex) depois de aISO até bISO.
  function diasUteis(aISO,bISO){if(!aISO||!bISO||aISO>=bISO)return 0;var d=new Date(aISO+'T12:00:00Z'),f=new Date(bISO+'T12:00:00Z'),n=0;
    while(true){d=new Date(d.getTime()+864e5);if(d>f)break;var s=d.getUTCDay();if(s&&s<6)n++;}return n;}
  function isoBR(iso){return iso?new Date(Date.parse(iso)-3*36e5).toISOString().slice(0,10):null;}
  // Faixa "Bases do painel": de quando é cada base, quando foi carregada e se está velha.
  function faixaBases(D,CG,ultReqISO,hojeISO,fd,fdh){
    var B=[
      {k:'dbConsumoRaw',rot:'Requisições (consumo)',dado:ultReqISO?'dados até '+fd(ultReqISO):'sem dados',idade:diasUteis(ultReqISO,hojeISO)},
      {k:'dbEstoqueRaw',rot:'Estoque do almoxarifado',dado:n0(D.nLinhasEst)+' itens',idade:diasUteis(isoBR(CG.dbEstoqueRaw&&CG.dbEstoqueRaw.em)||D.posEstoque,hojeISO)},
      {k:'dbFortpelRaw',rot:'Fortpel',dado:(function(){var ms=Object.keys(D.fort).sort();return ms.length?'até '+mesLabel(ms[ms.length-1]):'sem dados';})(),idade:null},
      {k:'dbEstoqueTI',rot:'Estoque de TI',dado:D.estTI?brl0(D.estTI):'sem dados',idade:null}
    ];
    var hoje=[],velhas=[];
    var h='<div class="apn-bases"><span class="apn-bt0">Bases do painel</span>'+B.map(function(b){
      var c=CG[b.k],em=c&&c.em,carg=em?'carregada '+fdh(em):'carga sem registro';
      var nv=b.idade==null?'ok':b.idade>=3?'ruim':b.idade>=2?'atn':'ok';
      if(em&&isoBR(em)===hojeISO)hoje.push(b.rot);else if(b.idade!=null&&b.idade>=2)velhas.push(b);
      return '<span class="apn-base apn-'+nv+'" title="'+esc(b.rot+': '+carg+(c&&c.linhas!=null?' · '+n0(c.linhas)+' linhas'+(c.antes!=null?' (antes '+n0(c.antes)+')':''):'')+(c&&c.por?' · por '+c.por:''))+'"><b>'+esc(b.rot)+'</b> '+esc(b.dado)+' · '+esc(carg)+'</span>';}).join('')+'</div>';
    if(hoje.length&&velhas.length)h+='<div class="apn-aviso">⚠ <b>Hoje foi carregada só: '+esc(hoje.join(', '))+'.</b> '+velhas.map(function(b){return esc(b.rot)+(b.k==='dbConsumoRaw'?' continua só até '+fd(ultReqISO):' continua de '+fd(isoBR(CG[b.k]&&CG[b.k].em)||D.posEstoque));}).join('; ')
      +' — por isso os cards de consumo e estoque não mudaram. Carregue também o relatório de requisições e o estoque do AX em <b>Carregar Planilhas</b>.</div>';
    else if(velhas.length)h+='<div class="apn-aviso">⚠ '+velhas.map(function(b){return '<b>'+esc(b.rot)+'</b> '+(b.k==='dbConsumoRaw'?'só até '+fd(ultReqISO):'de '+fd(isoBR(CG[b.k]&&CG[b.k].em)||D.posEstoque))+' ('+b.idade+' dias úteis)';}).join(' · ')
      +' — carregue a base nova em <b>Carregar Planilhas</b> para os cards refletirem hoje.</div>';
    return h;
  }
  // Auditoria: apontamentos que antes ficavam escritos dentro dos cards, com gravidade, valor e evidência.
  function auditoria(D,A,CG,ultReqISO,hojeISO,fd,fdh){
    var P=[],mr=esc(mesLabel(A.ref));
    function add(sev,k,tit,val,txt){P.push({sev:sev,k:k,tit:tit,val:val,txt:txt});}
    var idade=diasUteis(ultReqISO,hojeISO);
    if(idade>=2)add(idade>=3?3:2,null,'Base de requisições desatualizada',idade+' dias úteis','última requisição carregada é de '+fd(ultReqISO)+'; o consumo de '+esc(mesLabel(D.atual))+' e o "estoque dura" não enxergam as saídas depois disso.');
    if(!A.parcial&&A.vsMedia!=null&&A.vsMedia>0.15&&A.puxou.length)add(A.vsMedia>0.4?3:2,'puxou','Consumo de '+mr+' acima da média',pct(A.vsMedia),
      brl0(A.valor-A.media)+' a mais que a média; quem puxou: '+A.puxou.slice(0,3).map(function(i){return esc(i.nome)+' (+'+brl0(i.delta)+')';}).join(', ')+'.');
    if(A.repor.length)add(A.cobertura!=null&&A.cobertura<1?3:2,'repor','Risco de ruptura',n0(A.repor.length)+' itens',
      'itens com saída recorrente que acabam em menos de 1 mês'+(A.reporV?'; repor 2 meses ≈ '+brl0(A.reporV):'')+(A.cobertura!=null&&A.cobertura<1?'. O estoque inteiro cobre só '+n1(A.cobertura)+' mês de saída.':'.'));
    if(A.alta.length)add(2,'alta','Compra com estoque alto (últimos 60 dias)',brl0(A.altaV),n0(A.alta.length)+' itens comprados com estoque para mais de 6 meses de saída (valor acima de 6 meses).');
    if(A.paradoV)add(2,'parado','Estoque parado',brl0(A.paradoV),n0(A.parado.length)+' itens sem saída e sem compra há 6 meses ('+n0(D.estoque?A.paradoV/D.estoque*100:0)+'% do estoque). Avaliar remanejo, uso em obra ou baixa.');
    if(A.recenteV)add(1,'parado','Recém-comprado, ainda sem saída',brl0(A.recenteV),n0(A.recente.length)+' itens comprados nos últimos 6 meses que ainda não saíram.');
    if(A.fill!=null&&A.fillMedia!=null&&A.fill<A.fillMedia-0.03)add(2,'atend','Nível de atendimento caiu',n0(A.fill*100)+'%',
      'em '+mr+' o almoxarifado entregou '+n0(A.fill*100)+'% da quantidade pedida (média '+n0(A.fillMedia*100)+'%); '+n0(A.atRef.zero||0)+' pedidos sem nada atendido.');
    if(D.semCustoEst.length)add(2,'semcusto','Itens em estoque sem custo',n0(D.semCustoEst.length)+' itens','saldo com custo zero: entram como R$ 0 no "Estoque hoje", que fica subestimado. Corrigir o custo no cadastro.');
    if(A.atRef.semCusto)add(1,'reqsemcusto','Requisições atendidas sem custo em '+mr,n0(A.atRef.semCusto),'saíram do almoxarifado com custo zero e não entram no consumo em R$'+(A.semCustoAno>A.atRef.semCusto?' ('+n0(A.semCustoAno)+' no ano)':'')+'.');
    if(A.lojaTopPct>0.2&&A.topLojas[0])add(1,null,'Consumo concentrado em uma loja',n0(A.lojaTopPct*100)+'%',esc(A.topLojas[0].nome)+' pediu '+brl0(A.topLojas[0].v)+' de '+brl0(A.valor)+' em '+mr+'. Ver "Quem mais pediu".');
    if(A.compraDireta)add(1,null,'Compra direta / obra pelo almoxarifado',n0(A.compraDireta)+' itens',
      'itens que saem na requisição mas não ficam em estoque'+(A.compraDiretaV?' ('+brl0(A.compraDiretaV)+' em '+mr+')':'')+'; não entram em "Itens para repor".');
    if(D.estTI)add(0,null,'Estoque de TI (separado)',brl0(D.estTI),'não soma no "Estoque hoje" do almoxarifado.');
    P.sort(function(a,b){return b.sev-a.sev;});
    var ic={3:'🔴',2:'🟠',1:'🔵',0:'⚪'},alto=P.filter(function(p){return p.sev>=2;}).length;
    return '<div class="apn-box apn-aud"><h4>🔎 Auditoria do almoxarifado — '+n0(P.length)+' apontamentos'+(alto?' · <span class="up">'+alto+' para agir</span>':'')+'</h4>'
      +(P.length?P.map(function(p){return '<div class="apn-ap apn-s'+p.sev+(p.k?' apn-clic':'')+(p.k&&estado.kpi===p.k?' apn-on':'')+'"'+(p.k?' data-k="'+p.k+'"':'')+'><i>'+ic[p.sev]+'</i><div><b>'+esc(p.tit)+'</b><small>'+p.txt+'</small></div><em>'+p.val+(p.k?' <u>'+(estado.kpi===p.k?'fechar':'ver')+'</u>':'')+'</em></div>';}).join(''):'<div style="color:#34d399">Nenhum apontamento.</div>')+'</div>';
  }
  function tabCat(tit,cats,tot){if(!cats.length)return '';
    return '<h4 style="margin-top:14px">'+esc(tit)+'</h4><table><thead><tr><th>Categoria</th><th>Itens</th><th>Valor</th><th>%</th><th>Maior item</th></tr></thead><tbody>'
      +cats.map(function(c){var m=c.itens[0];return '<tr><td>'+esc(c.cat)+'</td><td>'+n0(c.n)+'</td><td>'+brl0(c.v)+'</td><td>'+n1(tot?c.v/tot*100:0)+'%</td><td style="white-space:normal;text-align:left">'+esc(m.nome)+' <small>'+brl0(m.valorEst)+'</small></td></tr>';}).join('')
      +'<tr class="apn-tot"><td>TOTAL</td><td>'+n0(cats.reduce(function(s,c){return s+c.n;},0))+'</td><td>'+brl0(tot)+'</td><td>100%</td><td></td></tr></tbody></table>';}
  // Relatório de estoque parado — A4 retrato, resumo por categoria + principais itens de cada uma (lista completa no Excel).
  function relatorioParado(D,A){
    var w=window.open('','_blank');if(!w){alert('Libere pop-ups para abrir o relatório.');return;}
    var fd=function(iso){return iso?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'—';};
    var logo=window.__ESPOSENDE_LOGO_B64||'',giro=D.estoque-A.paradoV-A.recenteV;
    function kc(cor,r,v,sub){return '<div class="kc" style="border-top-color:'+cor+'"><span>'+r+'</span><b style="color:'+cor+'">'+v+'</b><small>'+sub+'</small></div>';}
    function cats(lst,tot){return '<table><thead><tr><th>Categoria</th><th>Itens</th><th>Valor</th><th>% </th></tr></thead><tbody>'
      +lst.map(function(c){return '<tr><td class="nm">'+esc(c.cat)+'</td><td>'+n0(c.n)+'</td><td>'+brl0(c.v)+'</td><td>'+n1(tot?c.v/tot*100:0)+'%</td></tr>';}).join('')
      +'<tr class="tt"><td class="nm">TOTAL</td><td>'+n0(lst.reduce(function(s,c){return s+c.n;},0))+'</td><td>'+brl0(tot)+'</td><td>100%</td></tr></tbody></table>';}
    var det=A.paradoCat.map(function(c){var top=c.itens.slice(0,5),resto=c.itens.slice(5),rv=resto.reduce(function(s,i){return s+i.valorEst;},0);
      return '<tr class="gr"><td colspan="5">'+esc(c.cat)+' — '+n0(c.n)+' itens · '+brl0(c.v)+'</td></tr>'
        +top.map(function(i){return '<tr><td class="nm">'+esc(i.nome)+'</td><td>'+esc(i.cod)+'</td><td>'+n0(i.saldo)+'</td><td>'+fd(i.ultCompra)+'</td><td>'+brl0(i.valorEst)+'</td></tr>';}).join('')
        +(resto.length?'<tr class="rs"><td class="nm">demais '+n0(resto.length)+' itens da categoria</td><td></td><td></td><td></td><td>'+brl0(rv)+'</td></tr>':'');}).join('');
    var css='@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2533;margin:0;background:#eef2f7}'
      +'#doc{background:#fff;width:780px;margin:14px auto;padding:16px 18px;border-radius:10px;box-shadow:0 4px 18px rgba(20,40,74,.12)}'
      +'.cab{display:flex;align-items:center;gap:12px;padding-bottom:8px;border-bottom:3px solid #14284a}.cab img{height:40px}.cab h1{margin:0;font-size:17px;color:#14284a}.cab p{margin:2px 0 0;color:#5b6b80;font-size:10.5px}.cab .t{flex:1}'
      +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.kc{background:#f7f9fc;border:1px solid #e1e7ef;border-top:4px solid;border-radius:8px;padding:7px 9px}.kc span{display:block;font-size:8.5px;font-weight:700;color:#5b6b80;text-transform:uppercase}.kc b{display:block;font-size:15px;margin-top:2px}.kc small{display:block;color:#8091a7;font-size:8.5px}'
      +'.sec{font-size:12px;font-weight:800;color:#14284a;margin:12px 0 5px;padding-left:8px;border-left:4px solid #0e7c66}'
      +'.duas{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
      +'table{width:100%;border-collapse:collapse;font-size:8.6px}th{background:#14284a;color:#fff;padding:4px;text-align:right;font-size:7.8px;text-transform:uppercase}th:first-child{text-align:left}'
      +'td{padding:2.6px 4px;text-align:right;border-bottom:1px solid #eef2f7;white-space:nowrap}td.nm{text-align:left;white-space:normal}tbody tr:nth-child(even) td{background:#fafbfd}'
      +'tr.gr td{background:#e8eef6!important;color:#14284a;font-weight:800;text-align:left;padding:4px}tr.rs td{color:#5b6b80;font-style:italic}tr.tt td{background:#dfe8f4!important;font-weight:800;border-top:2px solid #14284a}tr{page-break-inside:avoid}thead{display:table-header-group}'
      +'.nota{color:#8091a7;font-size:8.5px;margin-top:6px}.rod{display:flex;justify-content:space-between;color:#8091a7;font-size:8.5px;margin-top:10px;padding-top:6px;border-top:1px solid #e1e7ef}'
      +'#barra{position:sticky;top:0;background:#0b1626;padding:8px 12px;display:flex;gap:8px;z-index:5}#barra button{background:#0e7c66;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer}#barra .s2{background:#15304d}'
      +'@media print{#barra{display:none}body{background:#fff}#doc{box-shadow:none;margin:0;padding:0;width:auto;border-radius:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var nome='Esposende_estoque_parado_'+new Date().toISOString().slice(0,10)+'.pdf';
    var js='function salvarPDF(){var b=document.getElementById("bpdf");b.textContent="Gerando PDF...";b.disabled=true;var d=document.getElementById("doc");'
      +'function go(){d.style.cssText="margin:0;box-shadow:none;border-radius:0";html2pdf().set({margin:[7,7,7,7],filename:"'+nome+'",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr",".kc"]}}).from(d).save().then(function(){b.textContent="📄 Salvar PDF";b.disabled=false;d.style.cssText="";});}'
      +'if(window.html2pdf)return go();var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";s.onload=go;s.onerror=function(){b.textContent="📄 Salvar PDF";b.disabled=false;window.print();};document.head.appendChild(s);}';
    w.document.write('<html><head><meta charset="utf-8"><title>Esposende · Almoxarifado · Estoque parado</title><style>'+css+'</style></head><body>'
      +'<div id="barra"><button onclick="window.print()">🖨 Imprimir</button><button id="bpdf" class="s2" onclick="salvarPDF()">📄 Salvar PDF</button><button class="s2" onclick="window.close()">✕ Fechar</button></div>'
      +'<div id="doc"><div class="cab">'+(logo?'<img src="data:image/jpeg;base64,'+logo+'" alt="Esposende">':'')+'<div class="t"><h1>Almoxarifado — Estoque parado por categoria</h1><p>Posição do estoque de '+fd(D.posEstoque)+' · 001 CD + AX · parado = sem saída e sem compra nos últimos 6 meses</p></div></div>'
      +'<div class="kpis">'+kc('#14284a','Estoque hoje',brl0(D.estoque),n0(D.nEst)+' itens')+kc('#be123c','Parado',brl0(A.paradoV),n0(A.parado.length)+' itens · '+n1(D.estoque?A.paradoV/D.estoque*100:0)+'% do estoque')
        +kc('#b45309','Recém-comprado sem saída',brl0(A.recenteV),n0(A.recente.length)+' itens · compra < 6 meses')+kc('#0e7c66','Com giro',brl0(giro),'saída nos últimos 6 meses')+'</div>'
      +'<div class="duas"><div><div class="sec">Parado por categoria</div>'+cats(A.paradoCat,A.paradoV)+'</div><div><div class="sec">Recém-comprado, ainda sem saída</div>'+cats(A.recenteCat,A.recenteV)+'</div></div>'
      +'<div class="sec">Principais itens parados de cada categoria</div><table><thead><tr><th>Item</th><th>Código</th><th>Estoque</th><th>Última compra</th><th>Valor</th></tr></thead><tbody>'+det
      +'<tr class="tt"><td class="nm">TOTAL PARADO</td><td></td><td></td><td></td><td>'+brl0(A.paradoV)+'</td></tr></tbody></table>'
      +'<div class="nota">Lista completa item a item: botão "Lista completa (Excel)" no painel. Categoria pelo nome do item. Embalagens de presente no custo real.</div>'
      +'<div class="rod"><span>Esposende · Central de Auditoria &amp; Controle</span><span>Gerado em '+new Date().toLocaleString('pt-BR')+'</span></div></div>'
      +'<scr'+'ipt>'+js+'</scr'+'ipt></body></html>');
    w.document.close();
  }
  // Lista completa em CSV (abre no Excel): todos os itens com saldo, situação e categoria.
  function csvParado(D,A){
    var fd=function(iso){return iso?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'';};
    var nb=function(v){return String(Math.round(v*100)/100).replace('.',',');};
    var linhas=[['Situação','Categoria','Código','Item','Estoque','Custo unitário','Valor','Última compra','Saída média/mês (3 meses)']];
    A.comSaldo.slice().sort(function(a,b){var o={parado:0,recente:1,giro:2};var sa=a.semSaida6?(a.recente?'recente':'parado'):'giro',sb=b.semSaida6?(b.recente?'recente':'parado'):'giro';return o[sa]-o[sb]||b.valorEst-a.valorEst;})
      .forEach(function(i){linhas.push([i.semSaida6?(i.recente?'Recém-comprado sem saída':'Parado'):'Com giro',i.cat,i.cod,i.nome,nb(i.saldo),nb(i.custo||0),nb(i.valorEst),fd(i.ultCompra),nb(i.media||0)]);});
    var txt='\ufeff'+linhas.map(function(l){return l.map(function(c){c=String(c==null?'':c);return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(';');}).join('\r\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download='Esposende_estoque_parado_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},500);
  }
  // Composição de cada card (a soma do detalhe bate com o número do card).
  function detalhe(k,D,A,fd){
    var t='',tit='';
    if(k==='est'){tit='Estoque hoje — maiores valores (posição de '+fd(D.posEstoque)+')';
      t='<table><thead><tr><th>Item</th><th>Estoque</th><th>Custo un.</th><th>Valor</th><th>% do estoque</th><th>Dura</th></tr></thead><tbody>'
        +A.topEst.map(function(i){return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+(i.semSaida6?' · sem saída há 6 meses':'')+'</small></td><td>'+n0(i.saldo)+'</td><td>'+brl(i.custo)+'</td><td>'+brl0(i.valorEst)+'</td><td>'+n1(D.estoque?i.valorEst/D.estoque*100:0)+'%</td><td'+(i.dura!=null&&i.dura<1?' class="up"':'')+'>'+(i.dura==null?'sem saída':(i.dura>=24?'24+':n1(i.dura))+' m')+'</td></tr>';}).join('')
        +(A.restoEst.n?'<tr><td>Demais '+n0(A.restoEst.n)+' itens</td><td></td><td></td><td>'+brl0(A.restoEst.v)+'</td><td>'+n1(D.estoque?A.restoEst.v/D.estoque*100:0)+'%</td><td></td></tr>':'')
        +'<tr class="apn-tot"><td>TOTAL — Estoque hoje</td><td></td><td></td><td>'+brl0(D.estoque)+'</td><td>100%</td><td></td></tr></tbody></table>'
        +'<h4 style="margin-top:14px">Como se divide o estoque</h4><table><tbody>'
        +'<tr><td>Com giro (saída nos últimos 6 meses)</td><td>'+brl0(D.estoque-A.paradoV-A.recenteV)+'</td></tr>'
        +'<tr><td>Parado (sem saída e sem compra há 6 meses)</td><td class="up">'+brl0(A.paradoV)+'</td></tr>'
        +'<tr><td>Recém-comprado, ainda sem saída</td><td>'+brl0(A.recenteV)+'</td></tr>'
        +'<tr class="apn-tot"><td>Estoque hoje'+(D.visao==='oper'?' · operação':D.visao==='fac'?' · Facilities':'')+'</td><td>'+brl0(D.estoque)+'</td></tr>'
        +(D.visao!=='tudo'?'<tr><td>Almoxarifado inteiro (operação + Facilities)</td><td>'+brl0(D.estoqueTodo)+'</td></tr>':'')
        +(D.estTI?'<tr><td>Estoque de TI (separado, não soma)</td><td>'+brl0(D.estTI)+'</td></tr>':'')
        +'</tbody></table>';}
    else if(k==='parado'){tit='Estoque parado e recém-comprado sem saída';
      t=tabCat('Parado por categoria (sem saída e sem compra há 6 meses) — '+brl0(A.paradoV),A.paradoCat,A.paradoV)
        +tabCat('Recém-comprado, ainda sem saída — '+brl0(A.recenteV),A.recenteCat,A.recenteV)
        +'<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="apn-bt" data-acao="relParado">📄 Relatório de estoque parado (PDF / impressão)</button><button type="button" class="apn-bt" data-acao="csvParado">⬇ Lista completa (Excel)</button></div>';}
    else if(k==='puxou'){tit='O que puxou o consumo de '+mesLabel(A.ref)+' acima da média';
      t='<table><thead><tr><th>Item</th><th>R$ no mês</th><th>Média mensal</th><th>A mais</th><th>% do aumento</th></tr></thead><tbody>'
        +A.puxou.map(function(i){return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+'</small></td><td>'+brl0(i.vRef)+'</td><td>'+brl0(i.vMediaAntes)+'</td><td class="up">'+brl0(i.delta)+'</td><td>'+n1(A.valor>A.media?i.delta/(A.valor-A.media)*100:0)+'%</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>Consumo do mês − média</td><td>'+brl0(A.valor)+'</td><td>'+brl0(A.media)+'</td><td>'+brl0(A.valor-A.media)+'</td><td>100%</td></tr></tbody></table>'
        +'<div style="color:#8ca4bf;font-size:12px;margin-top:6px">Os 10 itens acima somam '+brl0(A.puxouV)+' a mais que a própria média; itens que caíram compensam a diferença.</div>';}
    else if(k==='atend'){tit='Nível de atendimento — quantidade atendida ÷ pedida';
      t='<table><thead><tr><th>Mês</th><th>Pedidos</th><th>Sem nada atendido</th><th>Qtd pedida</th><th>Qtd atendida</th><th>Atendido</th></tr></thead><tbody>'
        +A.fillMeses.map(function(x){return '<tr'+(x.m===A.ref?' class="apn-tot"':'')+'><td>'+mesLabel(x.m)+(x.m===D.atual?'*':'')+'</td><td>'+n0(x.linhas)+'</td><td>'+n0(x.zero)+'</td><td>'+n0(x.sol)+'</td><td>'+n0(x.at)+'</td><td class="'+(A.fillMedia!=null&&x.f!=null&&x.f<A.fillMedia-0.03?'up':'')+'">'+(x.f==null?'—':n1(x.f*100)+'%')+'</td></tr>';}).join('')+'</tbody></table>';}
    else if(k==='semcusto'){tit='Itens em estoque com custo zero — valor subestimado';
      t='<table><thead><tr><th>Item</th><th>Estoque</th><th>Última compra</th></tr></thead><tbody>'
        +D.semCustoEst.slice().sort(function(a,b){return b.saldo-a.saldo;}).map(function(i){return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+'</small></td><td>'+n0(i.saldo)+'</td><td>'+fd(i.ultCompra)+'</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>TOTAL — '+n0(D.semCustoEst.length)+' itens</td><td></td><td></td></tr></tbody></table>';}
    else if(k==='reqsemcusto'){tit='Requisições atendidas sem custo em '+mesLabel(A.ref);
      t='<table><thead><tr><th>Item</th><th>Loja</th><th>Qtd</th><th>Data</th></tr></thead><tbody>'
        +(A.atRef.semCustoQ||[]).map(function(r){return '<tr><td>'+esc(r.nome)+'<small>'+esc(r.cod)+'</small></td><td style="white-space:normal">'+esc(r.loja)+'</td><td>'+n0(r.q)+'</td><td>'+fd(isoBR(r.data))+'</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>TOTAL — '+n0(A.atRef.semCusto)+' requisições</td><td></td><td></td><td></td></tr></tbody></table>';}
    else if(k==='cons'){tit='Consumo de '+mesLabel(A.ref)+' — por setor';
      t='<table><thead><tr><th>Setor</th><th>R$ no mês</th><th>% do mês</th><th>Média mensal</th><th>vs média</th></tr></thead><tbody>'
        +A.setores.filter(function(g){return g.v>0;}).map(function(g){return '<tr><td>'+esc(g.setor)+(g.setor==='FACILITIES'?'<small>obras, manutenção e equipamentos</small>':'')+'</td><td>'+brl0(g.v)+'</td><td>'+n1(A.valor?g.v/A.valor*100:0)+'%</td><td>'+brl0(g.media)+'</td><td class="'+(g.vs>0.1?'up':g.vs<-0.1?'dn':'')+'">'+pct(g.vs)+'</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>TOTAL — Consumo de '+mesLabel(A.ref)+'</td><td>'+brl0(A.valor)+'</td><td>100%</td><td>'+brl0(A.media)+'</td><td>'+pct(A.vsMedia)+'</td></tr></tbody></table>';}
    else if(k==='dura'){tit='Como sai o "estoque dura"';
      t='<table><thead><tr><th>Mês</th><th>Consumo (R$)</th></tr></thead><tbody>'+A.mesesCob.map(function(m){return '<tr><td>'+mesLabel(m)+'</td><td>'+brl0(D.meses[m].v)+'</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>Média mensal</td><td>'+brl0(A.consMedio3)+'</td></tr><tr><td>Média mensal só operação (sem Facilities/obras)</td><td>'+brl0(A.consOper3)+'</td></tr><tr><td>Estoque hoje</td><td>'+brl0(D.estoque)+'</td></tr><tr class="apn-tot"><td>Estoque hoje ÷ média = meses</td><td>'+(A.cobertura==null?'—':n1(A.cobertura))+'</td></tr><tr class="apn-tot"><td>Estoque hoje ÷ média só operação = meses</td><td>'+(A.cobOper==null?'—':n1(A.cobOper))+'</td></tr></tbody></table>'
        ;}
    else if(k==='repor'){tit='Itens para repor — estoque acaba em menos de 1 mês';
      t='<table><thead><tr><th>Item</th><th>Estoque</th><th>Saída média/mês</th><th>Dura</th><th>Repor 2 meses</th><th>R$</th></tr></thead><tbody>'
        +A.repor.map(function(i){var q=Math.max(0,Math.ceil(i.media*2-Math.max(0,i.saldo)));return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+'</small></td><td>'+n0(Math.max(0,i.saldo))+'</td><td>'+n0(i.media)+'</td><td class="up">'+n1(i.dura)+' m</td><td>'+n0(q)+'</td><td>'+brl0(q*(i.custo||0))+'</td></tr>';}).join('')
        +'<tr class="apn-tot"><td>TOTAL — '+n0(A.repor.length)+' itens</td><td></td><td></td><td></td><td></td><td>'+brl0(A.reporV)+'</td></tr></tbody></table>';}
    if(k==='alta'){tit='Compra com estoque alto — comprado nos últimos 60 dias com estoque para mais de 6 meses';
      t='<table><thead><tr><th>Item</th><th>Estoque</th><th>Saída média/mês</th><th>Dura</th><th>Última compra</th><th>Acima de 6 meses (R$)</th></tr></thead><tbody>'
        +A.alta.slice(0,25).map(function(i){return '<tr><td>'+esc(i.nome)+'<small>'+esc(i.cod)+' · '+esc(i.cat||categoria(i.nome))+'</small></td><td>'+n0(i.saldo)+'</td><td>'+n0(i.media)+'</td><td class="up">'+(i.saldo/i.media>=99?'99+':n1(i.saldo/i.media))+' m</td><td>'+fd(i.ultCompra)+'</td><td>'+brl0(i.excesso)+'</td></tr>';}).join('')
        +(A.alta.length>25?'<tr><td colspan="6" style="color:#8ca4bf">+ '+(A.alta.length-25)+' itens (lista completa no Excel)</td></tr>':'')
        +'<tr class="apn-tot"><td>TOTAL — '+n0(A.alta.length)+' itens</td><td></td><td></td><td></td><td></td><td>'+brl0(A.altaV)+'</td></tr></tbody></table>'
        ;}
    return '<div class="apn-box apn-det"><h4 style="display:flex;justify-content:space-between">'+esc(tit)+'<a data-k="'+k+'" style="cursor:pointer;color:#8ca4bf;font-weight:400">fechar ✕</a></h4>'+t+'</div>';
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
    // Desempenho: daqui para baixo (achar os cards, somar as bases, redesenhar) só com o módulo na tela.
    // Os ganchos acima continuam instalados; ao voltar para o Almoxarifado o painel se atualiza em até 1,5 s.
    var ifrAlm=document.getElementById('ifr-alm');
    if(document.hidden||!ifrAlm||!ifrAlm.getClientRects().length)return;
    if(!doc.getElementById('apn-css')){var st=doc.createElement('style');st.id='apn-css';st.textContent=CSS+'.apn-oculto{display:none!important}';doc.head.appendChild(st);}
    var cards=doc.querySelector('[data-apn-cards]')||menorCom(doc,['TOTAL GERAL','ITENS CRITICOS','FORTPEL']);
    if(!cards)return;
    cards.setAttribute('data-apn-cards','1');cards.classList.add('apn-oculto');
    var rosca=doc.querySelector('[data-apn-rosca]')||menorCom(doc,['PARTICIPACAO POR ESTOQUE','NO PERIODO']);
    if(rosca&&!rosca.contains(cards)&&!rosca.querySelector('#apn')){rosca.setAttribute('data-apn-rosca','1');rosca.classList.add('apn-oculto');}
    var box=doc.getElementById('apn');
    if(!box||box.nextElementSibling!==cards){if(box)box.remove();box=doc.createElement('div');box.id='apn';cards.parentNode.insertBefore(box,cards);estado.assinatura='';
      box.addEventListener('change',function(e){var a=e.target.getAttribute('data-apn');if(a==='mes')estado.mes=e.target.value;if(a==='reg')estado.reg=e.target.value;desenhar(true);});
      box.addEventListener('click',function(e){var m=e.target.getAttribute&&e.target.getAttribute('data-m');if(m){estado.mes=m;desenhar(true);return;}
        var vb=e.target.closest&&e.target.closest('[data-visao]');if(vb){estado.visao=vb.getAttribute('data-visao');estado.kpi=null;desenhar(true);return;}
        var ac=e.target.closest&&e.target.closest('[data-acao]');if(ac){var mm=moduloAlm();if(mm){var DD=calcular(mm.w,estado.reg,estado.visao),AA=analisar(DD,estado.mes);if(ac.getAttribute('data-acao')==='relParado')relatorioParado(DD,AA);else csvParado(DD,AA);}return;}
        var c=e.target.closest&&e.target.closest('[data-k]');if(c){var k=c.getAttribute('data-k');estado.kpi=estado.kpi===k?null:k;desenhar(true);}});}
    buscarCargas(false);
    desenhar(false);
    function desenhar(forcar){
      var a=assinatura(w);if(!forcar&&a===estado.assinatura)return;
      // Dado novo no módulo (carga/sincronização): busca de novo as datas de carga logo depois do salvamento.
      if(!forcar&&estado.assinatura&&a.split('#').slice(0,9).join('#')!==estado.assinatura.split('#').slice(0,9).join('#'))setTimeout(function(){buscarCargas(true);},8000);
      try{box.innerHTML=montar(w);estado.assinatura=assinatura(w);}catch(e){console.error('[Almoxarifado painel]',e);}
    }
  }
  setInterval(instalar,1500);
  window.__almoxPainelCalc={calcular:calcular,analisar:analisar,regionalDe:regionalDe,REG_FIXA:REG_FIXA};
})();
