// Almoxarifado · Consumo Loja (auditoria de consumo, previsão e sugestão de compra)
// Menu próprio no Portal ("Almoxarifado → Consumo Loja") e botão dentro do módulo Almoxarifado.
// Cruza o consumo dos itens controlados com o que gera esse consumo:
//   Sacolas e embalagens de presente ........ pares vendidos (PA)   · regra: 1 sacola a cada 1,5 PA
//   Agrado (café, pirulito, balão) ............ vendas (NFS)         · padrão = mediana das lojas
//   Fita PP e etiqueta 70x24 .................. pares remanejados     · padrão = mediana das lojas
//   Bobina PDV ................................ vendas (NFS)         · padrão = mediana das lojas
//   Papel A4 e filme stretch .................. só histórico
// Fontes: portal_sync alm (dbConsumoRaw, dbEstoqueRaw, dbRegionaisMap, dbLojaNomeMap) e
// portal_sync almcl (base de vendas/remanejo por loja e mês carregada aqui + parâmetros).
// Não altera o módulo Almoxarifado nem os dados dele.
(function(){
  if(window.__almoxConsumoLoja)return;
  window.__almoxConsumoLoja='2026-11-06.5';

  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co';
  var SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var MOD_ID='almcl';
  var MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

  // Custo real das embalagens de presente (Sulnove 010145, BOPP 0,004 + DIFAL 13,5%) — mesma regra do módulo.
  var DIFAL=0.135,PROPOSTA={'11314':331.00,'11315':535.75,'11316':799.50};
  function unitReal(cod){var m=PROPOSTA[String(parseInt(cod,10))];return m?m/1000*(1+DIFAL):null;}

  // Linhas de análise: cada uma tem itens (códigos do Seta), o "motor" do consumo e como mostrar o índice.
  // drivers = ordem de preferência (pares = PA vendidos, nfs = quantidade de vendas/cupons, rem = pares remanejados).
  var LINHAS=[
    {id:'sac',grupo:'Venda',nome:'Sacolas',icone:'🛍️',cods:['7894','8209','9516','11094','21604'],drivers:['pares'],porUn:true,fixa:true,
      regra:'1 sacola a cada 1,5 PA (pares atendidos)'},
    {id:'emb',grupo:'Venda',nome:'Embalagem de presente',icone:'🎁',cods:['11314','11315','11316'],drivers:['pares'],porUn:false,pct:true,
      regra:'% das vendas (PA) que saem com embalagem de presente · padrão = mediana das lojas'},
    {id:'caf',grupo:'Agrado',nome:'Café (agrado)',icone:'☕',cods:['19388'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'pir',grupo:'Agrado',nome:'Pirulito (agrado)',icone:'🍭',cods:['15538'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'bal',grupo:'Agrado',nome:'Balão (agrado)',icone:'🎈',cods:['10546','17314'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'fit',grupo:'Remanejo',nome:'Fita adesiva PP 45mm',icone:'📦',cods:['7816'],drivers:['rem'],porUn:false,
      regra:'Rolos a cada 1.000 pares remanejados (enviados pela loja) · padrão = mediana das lojas'},
    {id:'etq',grupo:'Remanejo',nome:'Etiqueta 70x24',icone:'🏷️',cods:['7982','15483'],drivers:['rem'],porUn:false,
      regra:'Rolos a cada 1.000 pares remanejados (enviados pela loja) · padrão = mediana das lojas'},
    {id:'bob',grupo:'NFS',nome:'Bobina PDV 79mm',icone:'🧾',cods:['8002','22203','26104','26153'],drivers:['nfs','pares'],porUn:true,
      regra:'Vendas (NFS) por bobina · padrão = mediana das lojas'},
    {id:'a4',grupo:'Histórico',nome:'Papel A4 (resma)',icone:'📄',cods:['7981'],drivers:[],porUn:false,regra:'Previsão pela média de consumo'},
    {id:'str',grupo:'Histórico',nome:'Filme stretch',icone:'🎞️',cods:['14580'],drivers:[],porUn:false,regra:'Previsão pela média de consumo'}
  ];
  var DRV_NOME={pares:'PA (pares vendidos)',nfs:'Vendas (NFS)',rem:'Pares remanejados'};
  var DRV_CURTO={pares:'PA',nfs:'NFS',rem:'pares rem.'};
  var GRUPO_COR={Venda:'#0e7c66',Agrado:'#b45309',Remanejo:'#7c3aed',NFS:'#0369a1','Histórico':'#64748b'};
  var COD_LINHA={};LINHAS.forEach(function(L){L.cods.forEach(function(c){COD_LINHA[c]=L.id;});});
  var PARAMS_PADRAO={paPorSacola:1.5,crescimento:10,fatorDez:2.75,tolerancia:25,cobertura:3,horizonte:3,basePrev:'padrao'};
  // Fator do mês: dezembro vende 2,5x a 3x um mês comum (padrão 2,75x, ajustável). Os outros meses: média + crescimento.
  function fatorMes(P,m,ehVenda){if(!ehVenda)return 1;return m.slice(5)==='12'?(Number(P.fatorDez)||2.75):1+(Number(P.crescimento)||0)/100;}

  // ---------- utilidades ----------
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toUpperCase();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function n0(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});}
  function n1(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});}
  function n2(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function brl(v){return 'R$ '+n2(v);}
  function pct(v){return (v>0?'+':'')+Number(v*100).toLocaleString('pt-BR',{maximumFractionDigits:0})+'%';}
  function codLoja(t){var m=String(t==null?'':t).trim().match(/(\d+)/);if(!m)return '';var n=parseInt(m[1],10);if(n>=900&&n<1000)n-=900;return String(n);}
  function mesLabel(k){var p=k.split('-');return MESES[Number(p[1])-1]+'/'+p[0].slice(2);}
  function mesAtual(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function somaMes(k,n){var p=k.split('-').map(Number),d=new Date(p[0],p[1]-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function mesesEntre(a,b){var o=[];if(!a||!b||a>b)return o;var k=a;while(k<=b&&o.length<60){o.push(k);k=somaMes(k,1);}return o;}
  function mediana(a){if(!a.length)return 0;var s=a.slice().sort(function(x,y){return x-y;}),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
  function num(v){
    if(typeof v==='number')return isFinite(v)?v:0;
    var s=String(v==null?'':v).replace(/[R$\s]/g,'');if(!s)return 0;
    if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');
    else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    var n=parseFloat(s);return isFinite(n)?n:0;
  }
  // Mês de uma data qualquer (Date, serial do Excel, dd/mm/aaaa, mm/aaaa, aaaa-mm, JAN/26).
  function mesDe(v){
    if(v==null||v==='')return null;
    if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0');
    if(typeof v==='number'&&v>20000&&v<80000){var d=new Date(Math.round((v-25569)*864e5));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');}
    var s=norm(v),m;
    if((m=s.match(/^(\d{4})-(\d{1,2})/)))return m[1]+'-'+m[2].padStart(2,'0');
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))){var y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+m[2].padStart(2,'0');}
    if((m=s.match(/^(\d{1,2})[\/\-](\d{4})$/)))return m[2]+'-'+m[1].padStart(2,'0');
    if((m=s.match(/^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*[\/\-\s]*(\d{2,4})$/))){var y2=m[2].length===2?'20'+m[2]:m[2];return y2+'-'+String(MESES.indexOf(m[1])+1).padStart(2,'0');}
    return null;
  }
  // Data do consumo em horário de Brasília (UTC-3).
  function mesBrasilia(iso){var t=Date.parse(iso);if(isNaN(t))return null;var d=new Date(t-3*36e5);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');}

  // ---------- Supabase ----------
  function acharSb(){var w=window;for(var i=0;i<6&&w;i++){try{if(w.sb&&w.sb.auth&&typeof w.sb.auth.getSession==='function')return w.sb;}catch(e){}if(w===w.parent)break;w=w.parent;}return null;}
  async function token(){
    var sb=acharSb();
    if(sb){try{var s=(await sb.auth.getSession()).data.session;if(s&&s.access_token)return s.access_token;}catch(e){}}
    var w=window;for(var i=0;i<6&&w;i++){try{if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token)return w.__PORTAL_SESSION.access_token;}catch(e){}if(w===w.parent)break;w=w.parent;}
    return null;
  }
  async function rest(path,opt){
    var tk=await token();if(!tk)throw new Error('Sessão do Portal não encontrada. Entre de novo no Portal.');
    opt=opt||{};
    var h={apikey:SB_KEY,Authorization:'Bearer '+tk};
    if(opt.body)h['Content-Type']='application/json';
    if(opt.prefer)h.Prefer=opt.prefer;
    var r=await fetch(SB_URL+'/rest/v1/'+path,{method:opt.method||'GET',headers:h,body:opt.body?JSON.stringify(opt.body):undefined});
    var txt=await r.text(),j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
    if(!r.ok)throw new Error((j&&(j.message||j.hint))||('Supabase '+r.status));
    return j;
  }

  // ---------- estado ----------
  var S={carregado:false,carregando:false,erro:null,alm:null,base:null,aba:'painel',linha:'sac',filtroLoja:'',filtroReg:'',de:null,ate:null,ultimo:null};

  async function carregar(forcar){
    if(S.carregando)return;if(S.carregado&&!forcar)return;
    S.carregando=true;S.erro=null;render();
    try{
      var r=await Promise.all([
        rest('portal_sync?module_id=eq.alm&select=c:payload->dbConsumoRaw,e:payload->dbEstoqueRaw,r:payload->dbRegionaisMap,n:payload->dbLojaNomeMap'),
        rest('portal_sync?module_id=eq.'+MOD_ID+'&select=payload')
      ]);
      var a=(r[0]&&r[0][0])||{};
      S.alm={consumo:a.c||[],estoque:a.e||[],reg:a.r||{},nomes:a.n||{}};
      var b=(r[1]&&r[1][0]&&r[1][0].payload)||{};
      S.base={vendas:b.vendas||[],remanejo:b.remanejo||[],estoque:b.estoque||null,params:Object.assign({},PARAMS_PADRAO,b.params||{}),arquivos:b.arquivos||[],atualizadoEm:b.atualizadoEm||null,atualizadoPor:b.atualizadoPor||null};
      S.carregado=true;
    }catch(e){console.error('[Consumo Loja]',e);S.erro=e.message||String(e);}
    S.carregando=false;
    if(!S.de){var at=mesAtual();S.de=at.slice(0,4)+'-01';S.ate=at;}
    render();
  }
  async function salvarBase(){
    var tk=null;try{var sb=acharSb();if(sb){var s=(await sb.auth.getSession()).data.session;tk=s&&s.user&&s.user.email;}}catch(e){}
    S.base.atualizadoEm=new Date().toISOString();S.base.atualizadoPor=tk||(window.__PORTAL_SESSION&&window.__PORTAL_SESSION.email)||null;
    var payload={vendas:S.base.vendas,remanejo:S.base.remanejo,estoque:S.base.estoque,params:S.base.params,arquivos:S.base.arquivos.slice(-30),atualizadoEm:S.base.atualizadoEm,atualizadoPor:S.base.atualizadoPor};
    await rest('portal_sync?on_conflict=tenant_id,module_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{module_id:MOD_ID,payload:payload,updated_at:S.base.atualizadoEm}});
  }

  // ---------- modelo de cálculo ----------
  function nomeLoja(cod,fallback){var n=S.alm.nomes[cod]||S.alm.nomes[String(cod).padStart(2,'0')];return n?String(n).replace(/^\d+\s*-\s*/,String(cod).padStart(3,'0')+' - '):(fallback||String(cod).padStart(3,'0'));}
  function regDe(cod){return String(S.alm.reg[cod]||S.alm.reg[String(cod).padStart(3,'0')]||'NÃO MAPEADO').toUpperCase();}
  function ehCD(cod){return cod==='1';}

  function modelo(){
    var P=S.base.params,atual=mesAtual();
    var lojas={},cons={},itens={},drv={pares:{},nfs:{},rem:{},valor:{}};
    function loja(cod,nome){if(!lojas[cod])lojas[cod]={cod:cod,nome:nomeLoja(cod,nome),reg:regDe(cod)};return lojas[cod];}
    S.alm.consumo.forEach(function(r){
      var c=String(parseInt(r['Código'],10));var lid=COD_LINHA[c];if(!lid)return;
      var mes=mesBrasilia(r['Data Solicitação']);if(!mes)return;
      var lj=codLoja(r['Empresa Solicitante']);if(!lj)return;
      loja(lj,String(r['Empresa Solicitante']||'').replace(/\s+/g,' ').trim());
      var q=Number(r['Qtd Atendida'])||0;if(!q)return;
      var u=unitReal(c),v=u!=null?Math.round(q*u*100)/100:(Number(r['Custo Atendido'])||0);
      var it=itens[c]=itens[c]||{cod:c,nome:String(r['Insumo']||'').replace(/\s+/g,' ').trim(),linha:lid,meses:{},q:0,v:0,lojas:{}};
      var im=it.meses[mes]=it.meses[mes]||{q:0,v:0};im.q+=q;im.v+=v;
      var il=it.lojas[lj]=it.lojas[lj]||{};var ilm=il[mes]=il[mes]||{q:0,v:0};ilm.q+=q;ilm.v+=v;
      var cl=cons[lid]=cons[lid]||{};var cll=cl[lj]=cl[lj]||{};var c2=cll[mes]=cll[mes]||{q:0,v:0};c2.q+=q;c2.v+=v;
    });
    S.base.vendas.forEach(function(x){var lj=String(x.loja);loja(lj);
      // Regra: cada venda é uma NF — sem quantidade de NFS na base, NFS = quantidade vendida.
      ['pares','nfs','valor'].forEach(function(k){var val=x[k];if(k==='nfs'&&val==null)val=x.pares;if(val==null)return;var d=drv[k][lj]=drv[k][lj]||{};d[x.mes]=(d[x.mes]||0)+Number(val||0);});});
    S.base.remanejo.forEach(function(x){var lj=String(x.loja);loja(lj);var d=drv.rem[lj]=drv.rem[lj]||{};d[x.mes]=(d[x.mes]||0)+Number(x.pares||0);});
    // estoque e custo unitário por item
    var est={};
    S.alm.estoque.forEach(function(e){var c=String(parseInt(e['Código'],10));if(!COD_LINHA[c])return;
      var u=unitReal(c);est[c]={saldo:Number(e['Estoque Atual'])||0,custo:u!=null?u:(Number(e['Custo Unitário'])||0),ultCompra:e['Última Compra']||''};});
    // Estoque carregado no menu (todos os depósitos: CD + AX...) substitui o do módulo para os itens que trouxer.
    var eb=S.base.estoque&&S.base.estoque.itens;
    if(eb)Object.keys(eb).forEach(function(c){var x=eb[c],u=unitReal(c),ant=est[c]||{};
      est[c]={saldo:x.total,custo:u!=null?u:(x.custo||ant.custo||0),ultCompra:x.ultCompra||ant.ultCompra||'',deps:x.deps};});
    Object.keys(itens).forEach(function(c){var it=itens[c];if(!est[c])est[c]={saldo:0,custo:0,ultCompra:''};
      if(!est[c].custo){var q=0,v=0;Object.keys(it.meses).forEach(function(m){q+=it.meses[m].q;v+=it.meses[m].v;});est[c].custo=q?v/q:0;}});
    var meses=mesesEntre(S.de,S.ate);
    var fechados=meses.filter(function(m){return m<atual;});
    return {P:P,atual:atual,lojas:lojas,cons:cons,itens:itens,drv:drv,est:est,meses:meses,fechados:fechados};
  }
  function driverDaLinha(M,L){
    for(var i=0;i<L.drivers.length;i++){var k=L.drivers[i];if(Object.keys(M.drv[k]).length)return k;}
    return null;
  }
  // Comparativo de uma linha: índice de cada loja x padrão da rede (meses fechados com base do motor).
  function comparar(M,L){
    var P=M.P,dk=driverDaLinha(M,L),cl=M.cons[L.id]||{};
    var custoMedio=(function(){var q=0,v=0;Object.keys(cl).forEach(function(lj){Object.keys(cl[lj]).forEach(function(m){q+=cl[lj][m].q;v+=cl[lj][m].v;});});return q?v/q:0;})();
    var linhas=[];
    Object.keys(M.lojas).forEach(function(lj){
      var info=M.lojas[lj],dm=dk?(M.drv[dk][lj]||{}):{},c=cl[lj]||{};
      var mesesBase=M.fechados.filter(function(m){return dm[m]!=null;});
      var consTot=0,consBase=0,valBase=0,drvTot=0;
      M.fechados.forEach(function(m){if(c[m])consTot+=c[m].q;});
      mesesBase.forEach(function(m){drvTot+=dm[m];if(c[m]){consBase+=c[m].q;valBase+=c[m].v;}});
      if(!consTot&&!drvTot)return;
      linhas.push({cod:lj,nome:info.nome,reg:info.reg,cd:ehCD(lj),consTot:consTot,consBase:consBase,valBase:valBase,drv:drvTot,nMeses:mesesBase.length,
        mediaDrv:mesesBase.length?drvTot/mesesBase.length:0,mediaCons:M.fechados.length?consTot/M.fechados.length:0,
        taxa:drvTot?consBase/drvTot:null});
    });
    var maxMeses=linhas.reduce(function(m,x){return Math.max(m,x.nMeses);},0);
    // padrão: regra fixa (sacolas) ou mediana das lojas com volume (fora o CD, lojas sem consumo e lojas novas)
    var padrao=null,fonte='';
    if(dk){
      if(L.fixa){padrao=1/(Number(P.paPorSacola)||1.5);fonte='Regra: 1 a cada '+n1(P.paPorSacola)+' PA';}
      else{
        var vols=linhas.filter(function(x){return !x.cd&&x.drv>0;}).map(function(x){return x.drv;});
        var corte=mediana(vols)*0.2;
        var taxas=linhas.filter(function(x){return !x.cd&&x.drv>0&&x.drv>=corte&&x.consBase>0&&x.nMeses*2>=maxMeses;}).map(function(x){return x.taxa;});
        padrao=taxas.length>=3?mediana(taxas):null;fonte=taxas.length>=3?'Mediana de '+taxas.length+' lojas':'Poucas lojas com base';
      }
    }
    var tol=(Number(P.tolerancia)||25)/100;
    var volMed=mediana(linhas.filter(function(x){return !x.cd&&x.drv>0;}).map(function(x){return x.drv;}));
    linhas.forEach(function(x){
      x.esperado=padrao!=null&&x.drv?x.drv*padrao:null;
      x.dif=x.esperado!=null?x.consBase-x.esperado:null;
      x.difV=x.dif!=null?x.dif*custoMedio:null;
      x.desvio=padrao&&x.taxa!=null?x.taxa/padrao-1:null;
      if(x.cd)x.status='CD';
      else if(!dk)x.status='SEM MOTOR';
      else if(!x.drv)x.status='SEM BASE';
      else if(padrao==null)x.status='SEM PADRÃO';
      else if(x.nMeses*2<maxMeses)x.status='LOJA NOVA';
      else if(x.drv<volMed*0.2)x.status='POUCO DADO';
      else if(x.consBase===0)x.status='SEM PEDIDO';
      else if(x.desvio>tol)x.status='ACIMA';
      else if(x.desvio<-tol)x.status='ABAIXO';
      else x.status='OK';
    });
    var ordem={ACIMA:0,'SEM PEDIDO':1,ABAIXO:2,OK:3,'LOJA NOVA':4,'POUCO DADO':4,'SEM PADRÃO':5,'SEM BASE':6,'SEM MOTOR':7,CD:8};
    linhas.sort(function(a,b){return (ordem[a.status]-ordem[b.status])||((b.desvio||0)-(a.desvio||0))||(b.consTot-a.consTot);});
    return {L:L,dk:dk,padrao:padrao,fonte:fonte,custoMedio:custoMedio,linhas:linhas,tol:tol,
      acima:linhas.filter(function(x){return x.status==='ACIMA';}).length,
      abaixo:linhas.filter(function(x){return x.status==='ABAIXO'||x.status==='SEM PEDIDO';}).length,
      excesso:linhas.reduce(function(s,x){return s+(x.status==='ACIMA'&&x.difV>0?x.difV:0);},0)};
  }
  // Previsão por loja e por mês: "mês comum" = média do motor + crescimento; dezembro = média × fator de dezembro.
  // Item = previsão da linha × participação do item. Compra = soma da previsão dos meses de cobertura − estoque.
  function prever(M,L,C){
    var P=M.P,ehVenda=C.dk?(C.dk==='pares'||C.dk==='nfs'):(L.grupo==='Venda'||L.grupo==='Agrado'||L.grupo==='NFS');
    var hz=Math.min(12,Math.max(1,Math.round(Number(P.horizonte)||3))),cob=Math.max(1,Math.round(Number(P.cobertura)||3));
    var futuros=[];for(var i=0;i<Math.max(hz,cob);i++)futuros.push(somaMes(M.atual,i));
    var comum=ehVenda?1+(Number(P.crescimento)||0)/100:1;
    var porLoja=C.linhas.map(function(x){
      var base,mensal;
      if(C.dk&&x.nMeses&&!x.cd){
        var taxa=(P.basePrev==='real'&&x.taxa!=null&&x.consBase>0)?x.taxa:(C.padrao!=null?C.padrao:x.taxa);
        mensal=x.mediaDrv*(taxa||0);base=P.basePrev==='real'?'real da loja':'padrão';
      }else{mensal=x.mediaCons;base='média de consumo';}
      var pm={};futuros.forEach(function(m){pm[m]=mensal*fatorMes(P,m,ehVenda);});
      return {cod:x.cod,nome:x.nome,reg:x.reg,cd:x.cd,mediaDrv:x.mediaDrv,prevDrv:C.dk&&x.nMeses&&!x.cd?x.mediaDrv*comum:null,
        mediaCons:x.mediaCons,prev:mensal*comum,pm:pm,base:base};
    });
    var total=porLoja.reduce(function(s,x){return s+x.prev;},0),totalMes={};
    futuros.forEach(function(m){totalMes[m]=porLoja.reduce(function(s,x){return s+x.pm[m];},0);});
    var its=Object.keys(M.itens).map(function(c){return M.itens[c];}).filter(function(it){return it.linha===L.id;});
    var qt=0;its.forEach(function(it){it._qp=0;M.fechados.forEach(function(m){if(it.meses[m])it._qp+=it.meses[m].q;});qt+=it._qp;});
    var mHz=futuros.slice(0,hz),mCob=futuros.slice(0,cob);
    var itensPrev=its.filter(function(it){return it._qp>0;}).map(function(it){
      var share=qt?it._qp/qt:0,e=M.est[it.cod]||{saldo:0,custo:0},pm={};
      futuros.forEach(function(m){pm[m]=totalMes[m]*share;});
      var soma=function(ms){return ms.reduce(function(s,m){return s+pm[m];},0);};
      var prevM=total*share,alvo=soma(mCob),sug=Math.max(0,Math.ceil(alvo-e.saldo));
      // cobertura atual: quantos meses o estoque aguenta, mês a mês (com dezembro mais forte)
      var resto=e.saldo,cobAtual=0;for(var k=0;k<futuros.length;k++){var q=pm[futuros[k]];if(!q){cobAtual=null;break;}if(resto>=q){resto-=q;cobAtual++;}else{cobAtual+=resto/q;resto=0;break;}}
      if(cobAtual!=null&&resto>0&&prevM)cobAtual+=resto/prevM;
      return {cod:it.cod,nome:it.nome,linha:L,share:share,media:M.fechados.length?it._qp/M.fechados.length:0,prevM:prevM,pm:pm,prevHz:soma(mHz),
        saldo:e.saldo,deps:e.deps||null,custo:e.custo,cobAtual:prevM?cobAtual:null,alvo:alvo,sug:sug,sugV:sug*e.custo,ultCompra:e.ultCompra};
    }).sort(function(a,b){return b.prevM-a.prevM;});
    return {porLoja:porLoja.sort(function(a,b){return b.prev-a.prev;}),total:total,totalMes:totalMes,itens:itensPrev,hz:hz,cob:cob,futuros:mHz,mCob:mCob,todos:futuros,ehVenda:ehVenda};
  }
  function tudo(){
    var M=modelo(),R={M:M,linhas:[]};
    LINHAS.forEach(function(L){var C=comparar(M,L),F=prever(M,L,C);R.linhas.push({L:L,C:C,F:F});});
    return R;
  }

  // ---------- leitura de planilhas (vendas / remanejo) ----------
  function carregarScript(src,teste,cb){if(teste())return cb(true);var s=document.createElement('script');s.src=src;s.onload=function(){cb(!!teste());};s.onerror=function(){cb(false);};document.head.appendChild(s);}
  function lerArquivo(f){
    return new Promise(function(ok,falha){
      carregarScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',function(){return !!window.XLSX;},function(tem){
        if(!tem)return falha(new Error('Não consegui carregar o leitor de planilhas.'));
        var fr=new FileReader();
        fr.onload=function(){try{
          if(/\.(csv|txt)$/i.test(f.name))return ok(lerCSV(fr.result));
          var wb=window.XLSX.read(fr.result,{type:'array',cellDates:true});
          var ws=wb.Sheets[wb.SheetNames[0]];ok(window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}));
        }catch(e){falha(e);}};
        fr.onerror=function(){falha(fr.error);};fr.readAsArrayBuffer(f);
      });
    });
  }
  function lerCSV(buf){
    var u=new Uint8Array(buf),txt;
    try{txt=new TextDecoder('utf-8',{fatal:true}).decode(u);}catch(e){txt=new TextDecoder('windows-1252').decode(u);}
    txt=txt.replace(/^\ufeff/,'');
    var l1=txt.split(/\r?\n/)[0]||'',sep=(l1.split(';').length>=l1.split(',').length)?';':(l1.indexOf('\t')>=0?'\t':',');
    var out=[],row=[],cel='',q=false;
    for(var i=0;i<txt.length;i++){var c=txt[i];
      if(q){if(c==='"'){if(txt[i+1]==='"'){cel+='"';i++;}else q=false;}else cel+=c;continue;}
      if(c==='"')q=true;else if(c===sep){row.push(cel);cel='';}
      else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cel);out.push(row);row=[];cel='';}
      else cel+=c;}
    if(cel||row.length){row.push(cel);out.push(row);}
    return out.filter(function(r){return r.some(function(x){return String(x).trim();});});
  }
  var COLS={
    loja:/^(COD\.?\s*)?(LOJA|FILIAL|EMPRESA|UNIDADE)|^REPORTGROUP$|^ORIGEM$|^COD(IGO)?\s*(DA\s*)?(LOJA|FILIAL)/,
    data:/^(DATA|MES|PERIODO|COMPETENCIA|DT\b|EMISSAO|DATA\s*EMISSAO)/,
    pares:/PARES|^PA$|^P\.?A\.?$|PARES\s*ATEND/,
    nfs:/^(QTD|QTDE|QUANT\w*|N|NO|NUM\w*|TOTAL)?\s*\.?\s*(DE\s*)?(NFS|NFCE|NF-?E|NOTAS|CUPONS?|VENDAS|ATENDIMENTOS|TICKETS?)$|^NFS|^CUPONS|^ATENDIMENTOS/,
    valor:/VALOR|FATURAMENTO|RECEITA|VENDA\s*R\$|^TOTAL(\s*R\$)?$/,
    qtde:/^(QTDE|QTD|QUANTIDADE|PARES|QTDE\s*ENVIADA|QTD\s*ENVIADA)$/,
    doc:/^(NF|NFS|NUMERO|NUM\.?\s*NF|DOCUMENTO|CUPOM|N\.?\s*NF|NOTA)$/,
    pedido:/PEDIDO/
  };
  function acharCabecalho(rows){
    var melhor=-1,linha=0;
    for(var i=0;i<Math.min(rows.length,20);i++){
      var h=(rows[i]||[]).map(norm),pts=0;
      Object.keys(COLS).forEach(function(k){if(h.some(function(x){return x&&COLS[k].test(x);}))pts++;});
      if(pts>melhor){melhor=pts;linha=i;}
    }
    return linha;
  }
  // Mês pelo nome do arquivo (ex.: FEVEREIRO.CSV, VENDAS_MARCO_2026.xlsx). Sem ano no nome: ano corrente
  // (mês ainda não chegado = ano anterior).
  var MESES_EXT=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  function mesDoNome(nome){
    var n=norm(String(nome||'').replace(/\.[a-z0-9]+$/i,'')).replace(/[^A-Z0-9]+/g,' ');
    // MARÇO pode chegar como MARCO, MAR_O ou MAR O (o Ç some no nome do arquivo)
    for(var i=0;i<12;i++){if(new RegExp('(^|\\s)'+(i===2?'MAR(C|\\s)?O':MESES_EXT[i])+'(\\s|$)').test(n)){
      var y=(n.match(/(^|\s)(20\d{2})(\s|$)/)||[])[2],at=mesAtual();
      if(!y){y=at.slice(0,4);if(String(i+1).padStart(2,'0')>at.slice(5))y=String(Number(y)-1);}
      return y+'-'+String(i+1).padStart(2,'0');}}
    var m=n.match(/(^|\s)(20\d{2})\s?(0[1-9]|1[0-2])(\s|$)/);return m?m[2]+'-'+m[3]:null;
  }
  function interpretar(rows,nomeArq){
    var hi=acharCabecalho(rows),h=(rows[hi]||[]).map(norm);
    function col(re,exceto){for(var i=0;i<h.length;i++){if(h[i]&&re.test(h[i])&&(exceto==null||exceto.indexOf(i)<0))return i;}return -1;}
    var cOrig=h.indexOf('ORIGEM'),cDest=h.findIndex(function(x){return /^DESTINO/.test(x||'');});
    var ehRem=(cOrig>=0&&cDest>=0)||/remanej/i.test(nomeArq);
    var cLoja=ehRem&&cOrig>=0?cOrig:col(COLS.loja),cData=col(COLS.data);
    if(cLoja<0)throw new Error('Não achei a coluna da loja (Loja / Filial / Empresa'+(ehRem?' / Origem':'')+').');
    var mesArq=cData<0?mesDoNome(nomeArq):null;
    // Relatório de ESTOQUE (REPORTGROUP;CODIGO;DESCRICAO;...;QUANTIDADE): soma os depósitos (001 CD, AX - ALMOXARIFADO CONDE...).
    // Estoque das lojas é desconsiderado (regra: a loja não dá baixa no uso dos insumos).
    if(!ehRem&&h.indexOf('CODIGO')>=0&&h.indexOf('DESCRICAO')>=0&&h.indexOf('QUANTIDADE')>=0&&cData<0){
      var cC=h.indexOf('CODIGO'),cDs=h.indexOf('DESCRICAO'),cQ2=h.indexOf('QUANTIDADE'),cCu=h.indexOf('CUSTOAQUISICAO'),cUc=h.indexOf('ULTIMACOMPRA'),its={},nl=0,nLoja=0;
      for(var k=hi+1;k<rows.length;k++){var w=rows[k];if(!w||w[cC]==null||w[cC]==='')continue;
        var grp=String(w[cLoja]||'').replace(/\s+/g,' ').trim(),ljk=codLoja(grp);
        if(/^\d/.test(grp)&&ljk!=='1'){nLoja++;continue;}
        var cod=String(parseInt(w[cC],10));if(!COD_LINHA[cod])continue;
        var it=its[cod]=its[cod]||{cod:cod,nome:String(w[cDs]||'').replace(/\s+/g,' ').trim(),total:0,deps:{},custo:0,ultCompra:''};
        var q=num(w[cQ2]);it.total+=q;it.deps[grp]=(it.deps[grp]||0)+q;nl++;
        if(cCu>=0&&num(w[cCu]))it.custo=num(w[cCu]);
        var uc=cUc>=0?w[cUc]:null;if(uc instanceof Date)uc=uc.toLocaleDateString('pt-BR');uc=String(uc||'').trim();if(/\d/.test(uc)&&(!it.ultCompra||uc>it.ultCompra))it.ultCompra=uc;}
      return {tipo:'estoque',itens:its,linhas:[],lidas:nl,ignoradas:nLoja};
    }
    if(cData<0&&!mesArq)throw new Error('Não achei a coluna de data/mês e o nome do arquivo não tem o mês (ex.: FEVEREIRO.CSV).');
    function mesLinha(r){return cData>=0?mesDe(r[cData]):mesArq;}
    var agg={},linhasLidas=0,ign=0;
    if(ehRem){
      var cQ=col(COLS.qtde);if(cQ<0)throw new Error('Remanejo: não achei a coluna Qtde.');
      var cPed=col(COLS.pedido);
      for(var i=hi+1;i<rows.length;i++){var r=rows[i];if(!r)continue;
        var lj=codLoja(r[cLoja]),m=mesLinha(r);if(!lj||!m){ign++;continue;}
        var k=lj+'|'+m,a=agg[k]=agg[k]||{loja:lj,mes:m,pares:0,pedidos:{}};
        a.pares+=num(r[cQ]);if(cPed>=0&&r[cPed]!=null)a.pedidos[String(r[cPed])]=1;linhasLidas++;}
      return {tipo:'remanejo',linhas:Object.keys(agg).map(function(k){var a=agg[k];return {loja:a.loja,mes:a.mes,pares:a.pares,pedidos:Object.keys(a.pedidos).length||null};}),lidas:linhasLidas,ignoradas:ign};
    }
    var cP=col(COLS.pares);if(cP<0)cP=col(/^(QUANTIDADE|QTDE|QTD|QTD\.?\s*PARES)$/);var cN=col(COLS.nfs,[cP]),cV=col(COLS.valor,[cP,cN]),cD=col(COLS.doc,[cLoja,cData,cP,cN,cV]);
    if(cP<0&&cN<0)throw new Error('Não achei as colunas de pares (PA) nem de quantidade de vendas (NFS).');
    for(var j=hi+1;j<rows.length;j++){var x=rows[j];if(!x)continue;
      var lj2=codLoja(x[cLoja]),m2=mesLinha(x);if(!lj2||!m2){ign++;continue;}
      var k2=lj2+'|'+m2,b=agg[k2]=agg[k2]||{loja:lj2,mes:m2,pares:cP>=0?0:null,nfs:cN>=0?0:null,valor:cV>=0?0:null,docs:{}};
      if(cP>=0)b.pares+=num(x[cP]);if(cN>=0)b.nfs+=num(x[cN]);if(cV>=0)b.valor+=num(x[cV]);
      if(cN<0&&cD>=0&&x[cD]!=null)b.docs[String(x[cD])]=1;linhasLidas++;}
    return {tipo:'vendas',linhas:Object.keys(agg).map(function(k){var a=agg[k];var nd=Object.keys(a.docs).length;
      return {loja:a.loja,mes:a.mes,pares:a.pares,nfs:a.nfs!=null?a.nfs:(nd?nd:a.pares),valor:a.valor};}),lidas:linhasLidas,ignoradas:ign,
      colunas:{pares:cP>=0,nfs:cN>=0||cD>=0,valor:cV>=0}};
  }
  // Carga nova substitui só os meses (por loja) que vieram no arquivo; o resto da base fica.
  function mesclar(lista,novas){
    var chaves={};novas.forEach(function(n){chaves[n.loja+'|'+n.mes]=1;});
    return lista.filter(function(x){return !chaves[x.loja+'|'+x.mes];}).concat(novas);
  }
  async function importar(files){
    var msgs=[];
    for(var i=0;i<files.length;i++){
      var f=files[i];
      try{
        var rows=await lerArquivo(f),r=interpretar(rows,f.name);
        if(r.tipo==='estoque'){
          var nIt=Object.keys(r.itens).length;if(!nIt)throw new Error('nenhum item controlado (sacola, embalagem, café...) no estoque.');
          var ant=(S.base.estoque&&S.base.estoque.itens)||{};Object.keys(r.itens).forEach(function(c){ant[c]=r.itens[c];});
          S.base.estoque={itens:ant,em:new Date().toISOString(),arquivo:f.name};
          S.base.arquivos.push({nome:f.name,tipo:'estoque',em:new Date().toISOString(),meses:'-',lojas:0});
          var deps={};Object.keys(r.itens).forEach(function(c){Object.keys(r.itens[c].deps).forEach(function(d){deps[d]=1;});});
          msgs.push('✔ '+f.name+': ESTOQUE · '+nIt+' itens controlados · depósitos: '+Object.keys(deps).join(', ')+(r.ignoradas?' · '+n0(r.ignoradas)+' linhas de lojas desconsideradas':''));
          continue;
        }
        if(!r.linhas.length)throw new Error('nenhuma linha válida (loja + mês).');
        var ms={};r.linhas.forEach(function(x){ms[x.mes]=1;});var mk=Object.keys(ms).sort();
        if(r.tipo==='remanejo')S.base.remanejo=mesclar(S.base.remanejo,r.linhas);else S.base.vendas=mesclar(S.base.vendas,r.linhas);
        S.base.arquivos.push({nome:f.name,tipo:r.tipo,em:new Date().toISOString(),meses:mk[0]+' a '+mk[mk.length-1],lojas:Object.keys(r.linhas.reduce(function(o,x){o[x.loja]=1;return o;},{})).length});
        msgs.push('✔ '+f.name+': '+(r.tipo==='remanejo'?'REMANEJO':'VENDAS')+' · '+n0(r.lidas)+' linhas · '+mesLabel(mk[0])+' a '+mesLabel(mk[mk.length-1])+(r.ignoradas?' · '+n0(r.ignoradas)+' ignoradas (sem loja/data)':'')
          +(r.colunas&&!r.colunas.nfs?' · NFS = quantidade vendida (cada venda = 1 NF)':''));
      }catch(e){console.warn('[Consumo Loja]',f.name,e.message);msgs.push('✖ '+f.name+': '+(e.message||e));}
    }
    try{await salvarBase();msgs.push('☁ Base salva na nuvem.');}catch(e){msgs.push('✖ Não salvou na nuvem: '+(e.message||e));}
    S.msgBase=msgs;render();
  }
  function baixarModelo(tipo){
    var t=tipo==='rem'
      ?'Origem;Destino;Data;Qtde;Código Pedido\r\n039 - LOJA X;050 - LOJA Y;14/09/2026;20;216051\r\n'
      :'Loja;Mês;Pares (PA);NFS (qtd vendas);Valor vendido\r\n005 - CAMARAGIBE;01/2026;5230;2410;650000,00\r\n005 - CAMARAGIBE;02/2026;4980;2310;612000,00\r\n';
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+t],{type:'text/csv;charset=utf-8'}));
    a.download=tipo==='rem'?'modelo_remanejo.csv':'modelo_vendas_por_loja_mes.csv';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},500);
  }

  // ---------- interface ----------
  var CSS=''
  +'#acl-ov{position:fixed;inset:0;z-index:2147483600;background:#060c17;display:flex;flex-direction:column;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e8f0fa}'
  +'#acl-ov *{box-sizing:border-box}'
  +'#acl-ov .hd{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #1d3550;background:#0b1626;flex:0 0 auto;flex-wrap:wrap}'
  +'#acl-ov .hd img{height:38px;border-radius:6px}#acl-ov .hd .tt{flex:1 1 220px;min-width:0}#acl-ov .hd b{display:block;font-size:17px;color:#fff}#acl-ov .hd small{display:block;color:#8ca4bf;font-size:12px}'
  +'#acl-ov button{background:#15304d;color:#fff;border:1px solid #2f5478;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:13px}#acl-ov button:hover{filter:brightness(1.15)}#acl-ov button.pri{background:#0e7c66;border-color:#14a386}#acl-ov button:disabled{opacity:.6;cursor:wait}'
  +'#acl-ov .tabs{display:flex;gap:4px;padding:8px 16px 0;background:#0b1626;border-bottom:1px solid #1d3550;flex:0 0 auto;overflow-x:auto}'
  +'#acl-ov .tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:#8ca4bf;padding:9px 12px;white-space:nowrap}#acl-ov .tabs button.on{color:#fff;border-bottom-color:#14a386}'
  +'#acl-ov .flt{display:flex;gap:10px;flex-wrap:wrap;align-items:end;padding:12px 16px 0}'
  +'#acl-ov label{display:block;font-size:10.5px;color:#8ca4bf;font-weight:700;letter-spacing:.04em;margin-bottom:4px;text-transform:uppercase}'
  +'#acl-ov input,#acl-ov select{background:#06101c;color:#fff;border:1px solid #2a4867;border-radius:8px;padding:8px 9px;font-size:13.5px}'
  +'#acl-ov .bd{flex:1 1 auto;overflow:auto;padding:12px 16px 30px}'
  +'#acl-ov .kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:4px 0 14px}'
  +'#acl-ov .kpi div{background:#0b1626;border:1px solid #1d3550;border-top:3px solid #14a386;border-radius:10px;padding:10px 12px}#acl-ov .kpi span{display:block;font-size:10.5px;color:#8ca4bf;font-weight:700;text-transform:uppercase}#acl-ov .kpi b{display:block;font-size:20px;margin-top:3px}#acl-ov .kpi small{color:#8ca4bf;font-size:11px}'
  +'#acl-ov .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}'
  +'#acl-ov .cd{background:#0b1626;border:1px solid #1d3550;border-left:4px solid #14a386;border-radius:10px;padding:12px 14px;cursor:pointer}#acl-ov .cd:hover{border-color:#2f5478}'
  +'#acl-ov .cd h4{margin:0 0 2px;font-size:15px;color:#fff}#acl-ov .cd .rg{font-size:11px;color:#8ca4bf;margin-bottom:8px}'
  +'#acl-ov .cd .g{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12px}#acl-ov .cd .g span{color:#8ca4bf;display:block;font-size:10px;text-transform:uppercase;font-weight:700}#acl-ov .cd .g b{font-size:14px}'
  +'#acl-ov h3{font-size:14px;margin:18px 0 8px;color:#bcd0e6}'
  +'#acl-ov .tw{overflow:auto;border:1px solid #1d3550;border-radius:8px;max-height:62vh}'
  +'#acl-ov table{width:100%;border-collapse:collapse;font-size:12.5px}#acl-ov th{background:#13253c;color:#cfe0f2;padding:7px 8px;text-align:right;position:sticky;top:0;white-space:nowrap;z-index:1}#acl-ov th:first-child,#acl-ov td:first-child{text-align:left}'
  +'#acl-ov td{padding:6px 8px;border-bottom:1px solid #16293f;text-align:right;white-space:nowrap;color:#e8f0fa}#acl-ov td.l{text-align:left;white-space:normal}#acl-ov td small{display:block;color:#7f97b2;font-size:10.5px}'
  +'#acl-ov tr.tot td{font-weight:800;background:#0f2136}#acl-ov tr.sub td{font-weight:700;background:#0c1b2e;color:#bcd0e6}'
  +'#acl-ov .st{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:800}'
  +'#acl-ov .st.ACIMA{background:#5b1520;color:#ffb3bd}#acl-ov .st.ABAIXO,#acl-ov .st.SEM.PEDIDO{background:#4a3410;color:#ffd58a}#acl-ov .st.OK{background:#0d3b30;color:#7ff0cf}#acl-ov .st.x{background:#1d2b3d;color:#9fb3c8}'
  +'#acl-ov .up{color:#ff8a9a}#acl-ov .dn{color:#ffc66b}#acl-ov .ok{color:#5fd3b8}'
  +'#acl-ov .nota{color:#8ca4bf;font-size:11.5px;margin-top:8px;line-height:1.5}'
  +'#acl-ov .aviso{background:#2a1f08;border:1px solid #6b4d12;color:#ffd58a;border-radius:8px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}'
  +'#acl-ov .vazio{color:#8ca4bf;padding:30px;text-align:center}'
  +'#acl-ov .drop{border:2px dashed #2f5478;border-radius:10px;padding:22px;text-align:center;color:#8ca4bf;margin:8px 0}#acl-ov .drop.on{border-color:#14a386;color:#fff}'
  +'#acl-ov .pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}'
  +'@media(max-width:700px){#acl-ov .hd img{display:none}#acl-ov .bd{padding:10px}}';

  function logo(){return window.__ESPOSENDE_LOGO_B64||'';}
  function abrir(){
    var ov=document.getElementById('acl-ov');
    if(!document.getElementById('acl-css')){var st=document.createElement('style');st.id='acl-css';st.textContent=CSS;document.head.appendChild(st);}
    if(!ov){
      ov=document.createElement('div');ov.id='acl-ov';
      ov.innerHTML='<div class="hd">'+(logo()?'<img src="data:image/jpeg;base64,'+logo()+'" alt="Esposende">':'')
        +'<div class="tt"><b>🏬 Consumo Loja · Almoxarifado</b><small>Consumo x venda x remanejo por loja · lojas fora do padrão · previsão e sugestão de compra</small></div>'
        +'<button type="button" data-a="xls">⬇ Excel</button><button type="button" data-a="ger" class="pri">🖨 Relatório Gerencial</button><button type="button" data-a="rec">↻ Atualizar</button><button type="button" data-a="fechar">← Voltar</button></div>'
        +'<div class="tabs">'+[['painel','📊 Painel'],['comp','⚖️ Comparativo entre lojas'],['mensal','📅 Relatório mensal'],['prev','🔮 Previsão & compra'],['base','📥 Base de vendas e remanejo']]
          .map(function(t){return '<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'
        +'<div class="flt" id="acl-flt"></div><div class="bd" id="acl-bd"></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click',function(e){
        var b=e.target.closest('[data-a],[data-t]');if(!b||!ov.contains(b)||b.tagName==='LABEL')return;
        if(b.dataset.t){S.aba=b.dataset.t;render();return;}
        var a=b.dataset.a;
        if(a==='fechar')ov.style.display='none';
        else if(a==='rec'){S.carregado=false;carregar(true);}
        else if(a==='ger')relatorioGerencial();
        else if(a==='xls')exportarExcel(b);
        else if(a==='linha'){S.linha=b.dataset.l;S.aba='comp';render();}
        else if(a==='mod')baixarModelo(b.dataset.m);
        else if(a==='salvarP')salvarParametros(b);
        else if(a==='limpar')limparBase(b.dataset.m);
      });
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.style.display!=='none')ov.style.display='none';});
    }
    ov.style.display='flex';
    if(!S.carregado)carregar();else render();
  }

  function filtros(){
    var el=document.getElementById('acl-flt');if(!el)return;
    if(!S.carregado||S.aba==='base'){el.innerHTML='';return;}
    var M=S._M,regs={},lojas=[];
    Object.keys(M.lojas).forEach(function(c){regs[M.lojas[c].reg]=1;lojas.push(M.lojas[c]);});
    lojas.sort(function(a,b){return Number(a.cod)-Number(b.cod);});
    var h='<div><label>De</label><input type="month" id="acl-de" value="'+S.de+'"></div><div><label>Até</label><input type="month" id="acl-ate" value="'+S.ate+'"></div>'
      +'<div><label>Regional</label><select id="acl-reg"><option value="">Todas</option>'+Object.keys(regs).sort().map(function(r){return '<option'+(r===S.filtroReg?' selected':'')+'>'+esc(r)+'</option>';}).join('')+'</select></div>';
    if(S.aba==='comp'||S.aba==='prev')h+='<div><label>Item / grupo</label><select id="acl-lin">'+LINHAS.map(function(L){return '<option value="'+L.id+'"'+(L.id===S.linha?' selected':'')+'>'+L.icone+' '+esc(L.nome)+'</option>';}).join('')+'</select></div>';
    if(S.aba!=='painel')h+='<div style="flex:1 1 220px"><label>Buscar loja</label><input id="acl-loja" list="acl-ll" placeholder="nº ou nome da loja" value="'+esc(S.filtroLoja)+'" style="width:100%"><datalist id="acl-ll">'+lojas.map(function(l){return '<option value="'+esc(l.nome)+'">';}).join('')+'</datalist></div>';
    el.innerHTML=h;
    function on(id,fn,ev){var x=document.getElementById(id);if(x)x.addEventListener(ev||'change',fn);}
    on('acl-de',function(e){S.de=e.target.value||S.de;render();});
    on('acl-ate',function(e){S.ate=e.target.value||S.ate;render();});
    on('acl-reg',function(e){S.filtroReg=e.target.value;render(true);});
    on('acl-lin',function(e){S.linha=e.target.value;render(true);});
    var t;on('acl-loja',function(e){clearTimeout(t);t=setTimeout(function(){S.filtroLoja=e.target.value;render(true);},250);},'input');
  }
  function bateLoja(x){
    if(S.filtroReg&&x.reg!==S.filtroReg)return false;
    var q=norm(S.filtroLoja);if(!q)return true;
    var cq=codLoja(q);if(/^\d+$/.test(q))return x.cod===cq;
    return norm(x.nome).indexOf(q)>=0;
  }

  function render(soCorpo){
    var bd=document.getElementById('acl-bd');if(!bd)return;
    document.querySelectorAll('#acl-ov .tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===S.aba);});
    if(S.carregando){bd.innerHTML='<div class="vazio">Carregando consumo, estoque e base de vendas...</div>';return;}
    if(S.erro){bd.innerHTML='<div class="vazio" style="color:#ff8a8a">Erro: '+esc(S.erro)+'<br><br><button type="button" data-a="rec">Tentar de novo</button></div>';return;}
    if(!S.carregado){bd.innerHTML='';return;}
    S._M=modelo();S.ultimo=tudo();
    if(!soCorpo)filtros();
    var f={painel:vPainel,comp:vComp,mensal:vMensal,prev:vPrev,base:vBase}[S.aba];
    bd.innerHTML=f(S.ultimo);
    if(S.aba==='base')ligarBase();
  }
  function avisoBase(R){
    var temV=S.base.vendas.length,temR=S.base.remanejo.length,a=[];
    if(!temV)a.push('<b>Falta a base de vendas</b> (pares PA e quantidade de NFS por loja e mês). Sem ela, sacolas, embalagens, agrado e bobina ficam só com média de consumo e não dá para apontar loja fora do padrão.');
    if(!temR)a.push('<b>Falta a base de remanejo do ano</b> (pedidos de remanejo com origem, data e qtde). O módulo Remanejo só guarda o detalhe de 14/09 a 29/09.');
    return a.length?'<div class="aviso">⚠ '+a.join('<br>⚠ ')+'<br>Carregue na aba <b>📥 Base de vendas e remanejo</b>.</div>':'';
  }
  function stTag(s){var cls=/ACIMA|ABAIXO|OK/.test(s)?s:(s==='SEM PEDIDO'?'SEM PEDIDO':'x');var t={ACIMA:'▲ ACIMA DO PADRÃO',ABAIXO:'▼ ABAIXO DO PADRÃO','SEM PEDIDO':'▼ VENDE E NÃO PEDE',OK:'● NO PADRÃO'}[s]||s;return '<span class="st '+cls+'">'+t+'</span>';}
  function fmtTaxa(L,t){if(t==null)return '—';if(L.pct)return n1(t*100)+'% das vendas';if(L.porUn)return t>0?n1(1/t)+' '+(L.id==='sac'?'PA/sac.':'por un.'):'—';return n1(t*1000)+' /mil';}

  function vPainel(R){
    var M=R.M,totV=0,totPrevV=0,totSug=0,acima=0,exc=0;
    R.linhas.forEach(function(x){
      Object.keys(M.cons[x.L.id]||{}).forEach(function(lj){M.meses.forEach(function(m){var c=M.cons[x.L.id][lj][m];if(c)totV+=c.v;});});
      x.F.itens.forEach(function(i){totPrevV+=i.prevM*i.custo;totSug+=i.sugV;});acima+=x.C.acima;exc+=x.C.excesso;});
    var h=avisoBase(R)
      +'<div class="kpi"><div><span>Consumo no período (R$)</span><b>'+brl(totV)+'</b><small>'+(M.meses.length?mesLabel(M.meses[0])+' a '+mesLabel(M.meses[M.meses.length-1]):'')+'</small></div>'
      +'<div style="border-top-color:#7c3aed"><span>Previsão de consumo / mês</span><b>'+brl(totPrevV)+'</b><small>venda +'+n0(M.P.crescimento)+'% · '+(M.P.basePrev==='real'?'índice real da loja':'índice padrão')+'</small></div>'
      +'<div style="border-top-color:#b45309"><span>Sugestão de compra</span><b>'+brl(totSug)+'</b><small>cobertura de '+n0(M.P.cobertura)+' meses − estoque</small></div>'
      +'<div style="border-top-color:#be123c"><span>Lojas acima do padrão</span><b>'+n0(acima)+'</b><small>ocorrências (loja × item)</small></div>'
      +'<div style="border-top-color:#be123c"><span>Excesso estimado (R$)</span><b>'+brl(exc)+'</b><small>consumo acima do esperado</small></div></div>'
      +'<div class="cards">';
    R.linhas.forEach(function(x){
      var L=x.L,C=x.C,F=x.F,cor=GRUPO_COR[L.grupo];
      var q=0,v=0;Object.keys(M.cons[L.id]||{}).forEach(function(lj){M.fechados.forEach(function(m){var c=M.cons[L.id][lj][m];if(c){q+=c.q;v+=c.v;}});});
      var saldo=F.itens.reduce(function(s,i){return s+i.saldo;},0),sug=F.itens.reduce(function(s,i){return s+i.sugV;},0);
      h+='<div class="cd" style="border-left-color:'+cor+'" data-a="linha" data-l="'+L.id+'" role="button" tabindex="0"><h4>'+L.icone+' '+esc(L.nome)+'</h4>'
        +'<div class="rg">'+esc(L.grupo)+' · '+(C.dk?'motor: '+DRV_NOME[C.dk]:'sem motor — média de consumo')+'</div><div class="g">'
        +'<div><span>Consumo (meses fechados)</span><b>'+n0(q)+'</b> <small>'+brl(v)+'</small></div>'
        +'<div><span>Média / mês</span><b>'+n0(M.fechados.length?q/M.fechados.length:0)+'</b></div>'
        +'<div><span>Padrão da rede</span><b>'+(C.padrao!=null?fmtTaxa(L,C.padrao):'—')+'</b></div>'
        +'<div><span>Fora do padrão</span><b class="'+(C.acima?'up':'ok')+'">▲ '+C.acima+'</b> <b class="'+(C.abaixo?'dn':'ok')+'">▼ '+C.abaixo+'</b></div>'
        +'<div><span>Previsão / mês</span><b>'+n0(F.total)+'</b></div>'
        +'<div><span>Estoque · compra</span><b>'+n0(saldo)+'</b> <small>'+(sug?'comprar '+brl(sug):'sem compra')+'</small></div>'
        +'</div></div>';
    });
    h+='</div><div class="nota">Clique num card para ver o comparativo entre lojas. O consumo é a <b>Qtd Atendida</b> do almoxarifado; o mês corrente ('+mesLabel(M.atual)+') não entra nas médias. Embalagens de presente usam o custo real (Sulnove 0,004 + DIFAL).</div>';
    return h;
  }

  function vComp(R){
    var x=R.linhas.find(function(l){return l.L.id===S.linha;}),L=x.L,C=x.C,M=R.M;
    var rows=C.linhas.filter(bateLoja);
    var h=avisoBase(R)+'<div class="kpi"><div><span>Regra</span><b style="font-size:14px">'+esc(L.regra)+'</b></div>'
      +'<div><span>Motor</span><b style="font-size:15px">'+(C.dk?DRV_NOME[C.dk]:'—')+'</b><small>'+(C.dk&&L.drivers[0]!==C.dk?'sem '+DRV_NOME[L.drivers[0]]+' na base — usando '+DRV_CURTO[C.dk]:'')+'</small></div>'
      +'<div><span>Padrão da rede</span><b>'+(C.padrao!=null?fmtTaxa(L,C.padrao):'—')+'</b><small>'+esc(C.fonte)+'</small></div>'
      +'<div style="border-top-color:#be123c"><span>Acima do padrão (+'+n0(C.tol*100)+'%)</span><b class="up">'+C.acima+' lojas</b><small>excesso '+brl(C.excesso)+'</small></div>'
      +'<div style="border-top-color:#b45309"><span>Abaixo / não pede</span><b class="dn">'+C.abaixo+' lojas</b><small>loja usa menos que o padrão — verificar</small></div></div>';
    h+=mesAMes(M,L,C);
    if(!rows.length)return h+'<div class="vazio">Nenhuma loja com esse filtro.</div>';
    var dc=C.dk?DRV_CURTO[C.dk]:'';
    h+='<h3>Lojas — acumulado dos meses fechados com base</h3>';
    h+='<div class="tw"><table><thead><tr><th>Loja</th><th>Regional</th><th>'+(C.dk?DRV_NOME[C.dk]:'Motor')+'</th><th>Média '+dc+'/mês</th><th>Consumo</th><th>Média cons./mês</th><th>Índice da loja</th><th>Esperado</th><th>Diferença</th><th>Diferença R$</th><th>Desvio</th><th>Situação</th></tr></thead><tbody>';
    var t={drv:0,cons:0,esp:0,dif:0,difV:0};
    rows.forEach(function(r){
      if(!r.cd){t.drv+=r.drv;t.cons+=r.consTot;if(r.esperado!=null){t.esp+=r.esperado;t.dif+=r.dif;t.difV+=r.difV;}}
      h+='<tr><td class="l">'+esc(r.nome)+(r.nMeses&&r.nMeses<M.fechados.length?'<small>'+r.nMeses+' de '+M.fechados.length+' meses com base</small>':'')+'</td><td>'+esc(r.reg)+'</td>'
        +'<td>'+(r.drv?n0(r.drv):'—')+'</td><td>'+(r.mediaDrv?n0(r.mediaDrv):'—')+'</td>'
        +'<td><b>'+n0(r.consTot)+'</b>'+(r.consBase!==r.consTot&&r.drv?'<small>'+n0(r.consBase)+' nos meses c/ base</small>':'')+'</td><td>'+n1(r.mediaCons)+'</td>'
        +'<td>'+fmtTaxa(L,r.taxa)+'</td><td>'+(r.esperado!=null?n0(r.esperado):'—')+'</td>'
        +'<td class="'+(r.dif>0?'up':r.dif<0?'dn':'')+'">'+(r.dif!=null?(r.dif>0?'+':'')+n0(r.dif):'—')+'</td>'
        +'<td class="'+(r.difV>0?'up':r.difV<0?'dn':'')+'">'+(r.difV!=null?brl(r.difV):'—')+'</td>'
        +'<td class="'+(r.desvio>C.tol?'up':r.desvio<-C.tol?'dn':'ok')+'">'+(r.desvio!=null?pct(r.desvio):'—')+'</td><td>'+stTag(r.status)+'</td></tr>';
    });
    h+='<tr class="tot"><td>TOTAL (sem CD)</td><td></td><td>'+n0(t.drv)+'</td><td></td><td>'+n0(t.cons)+'</td><td></td><td></td><td>'+n0(t.esp)+'</td><td>'+(t.dif>0?'+':'')+n0(t.dif)+'</td><td>'+brl(t.difV)+'</td><td></td><td></td></tr></tbody></table></div>';
    h+='<div class="nota"><b>Como ler:</b> o índice compara o consumo da loja com o motor dela (ex.: PA por sacola). <b>Esperado</b> = motor × padrão da rede. '
      +'<b>▲ Acima</b>: a loja consome mais que o padrão (desperdício, uso indevido ou desvio — verificar). <b>▼ Abaixo / vende e não pede</b>: a loja pode estar deixando de usar o item no atendimento ou recebendo de outra loja. O saldo de insumos no estoque da loja não é considerado (a loja não dá baixa no uso). '
      +'A comparação usa o acumulado dos meses fechados porque a loja pede a cada 2–3 meses. O CD entra no total da rede, mas não no padrão.</div>';
    return h;
  }

  // Rede mês a mês: motor x consumo das lojas que têm base naquele mês (sem o CD). Ex.: % das vendas com presente por mês.
  function mesAMes(M,L,C){
    if(!C.dk)return '';
    var cl=M.cons[L.id]||{},dm=M.drv[C.dk],ms=[];
    M.meses.forEach(function(m){var d=0,q=0,n=0;
      Object.keys(dm).forEach(function(lj){if(ehCD(lj)||dm[lj][m]==null)return;if(M.lojas[lj]&&!bateLoja(M.lojas[lj]))return;d+=dm[lj][m];n++;if(cl[lj]&&cl[lj][m])q+=cl[lj][m].q;});
      if(n)ms.push({m:m,d:d,q:q,n:n});});
    if(!ms.length)return '';
    var td=0,tq=0;ms.forEach(function(x){td+=x.d;tq+=x.q;});
    return '<h3>Rede mês a mês — '+esc(L.nome)+' x '+DRV_NOME[C.dk]+(S.filtroLoja||S.filtroReg?' · '+esc(S.filtroLoja||('Regional '+S.filtroReg)):'')+'</h3><div class="tw" style="max-height:none"><table><thead><tr><th>Mês</th><th>Lojas com base</th><th>'+DRV_NOME[C.dk]+'</th><th>Consumo pedido</th><th>Índice</th><th>Padrão</th></tr></thead><tbody>'
      +ms.map(function(x){var t=x.d?x.q/x.d:null,dv=C.padrao&&t!=null?t/C.padrao-1:null;
        return '<tr><td>'+mesLabel(x.m)+(x.m>=M.atual?' *':'')+'</td><td>'+x.n+'</td><td>'+n0(x.d)+'</td><td>'+n0(x.q)+'</td><td class="'+(dv>C.tol?'up':dv<-C.tol?'dn':'ok')+'"><b>'+fmtTaxa(L,t)+'</b></td><td>'+(C.padrao!=null?fmtTaxa(L,C.padrao):'—')+'</td></tr>';}).join('')
      +'<tr class="tot"><td>ACUMULADO</td><td></td><td>'+n0(td)+'</td><td>'+n0(tq)+'</td><td>'+fmtTaxa(L,td?tq/td:null)+'</td><td></td></tr></tbody></table></div>'
      +'<div class="nota">Consumo = o que as lojas <b>pediram</b> ao almoxarifado no mês. Mês de abastecimento (ex.: abril, antes do Dia das Mães; novembro, antes do Natal) sai alto e o mês seguinte baixo. Por isso a situação de cada loja é medida no acumulado.</div>';
  }
  function vMensal(R){
    var M=R.M,meses=M.meses;
    var lojasOk={};Object.keys(M.lojas).forEach(function(c){if(bateLoja(M.lojas[c]))lojasOk[c]=1;});
    var filtrando=!!(S.filtroLoja||S.filtroReg);
    function cel(o){return o&&o.q?n0(o.q)+'<small>'+brl(o.v)+'</small>':'—';}
    var h='<h3>Itens controlados — totalizado por mês'+(filtrando?' · '+esc(S.filtroLoja||('Regional '+S.filtroReg)):' · todas as lojas')+'</h3>'
      +'<div class="tw"><table><thead><tr><th>Item</th>'+meses.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?' *':'')+'</th>';}).join('')+'<th>Total</th><th>Média/mês</th></tr></thead><tbody>';
    var totM={},totG={q:0,v:0},grupos={};
    LINHAS.forEach(function(L){(grupos[L.grupo]=grupos[L.grupo]||[]).push(L);});
    var lojaM={};
    Object.keys(grupos).forEach(function(g){
      var subM={},sub={v:0},linhasG='';
      grupos[g].forEach(function(L){
        Object.keys(M.itens).map(function(c){return M.itens[c];}).filter(function(it){return it.linha===L.id;}).sort(function(a,b){return a.cod-b.cod;}).forEach(function(it){
          var tm={},tq=0,tv=0,qf=0;
          Object.keys(it.lojas).forEach(function(lj){if(!lojasOk[lj])return;meses.forEach(function(m){var o=it.lojas[lj][m];if(!o)return;
            var a=tm[m]=tm[m]||{q:0,v:0};a.q+=o.q;a.v+=o.v;tq+=o.q;tv+=o.v;if(m<M.atual)qf+=o.q;
            var lm=lojaM[lj]=lojaM[lj]||{};var b=lm[m]=lm[m]||{q:0,v:0};b.v+=o.v;});});
          if(!tq)return;
          meses.forEach(function(m){if(tm[m]){var s=subM[m]=subM[m]||{v:0};s.v+=tm[m].v;var t=totM[m]=totM[m]||{v:0};t.v+=tm[m].v;}});
          sub.v+=tv;totG.v+=tv;
          linhasG+='<tr><td class="l">'+esc(it.nome)+'<small>'+it.cod+' · '+esc(L.nome)+'</small></td>'+meses.map(function(m){return '<td>'+cel(tm[m])+'</td>';}).join('')
            +'<td><b>'+n0(tq)+'</b><small>'+brl(tv)+'</small></td><td class="ok"><b>'+n1(M.fechados.length?qf/M.fechados.length:0)+'</b></td></tr>';
        });
      });
      if(!linhasG)return;
      h+='<tr class="sub"><td class="l" style="color:'+GRUPO_COR[g]+'">'+esc(g.toUpperCase())+'</td>'+meses.map(function(m){return '<td>'+(subM[m]?brl(subM[m].v):'—')+'</td>';}).join('')+'<td>'+brl(sub.v)+'</td><td></td></tr>'+linhasG;
    });
    h+='<tr class="tot"><td>TOTAL R$</td>'+meses.map(function(m){return '<td>'+(totM[m]?brl(totM[m].v):'—')+'</td>';}).join('')+'<td>'+brl(totG.v)+'</td><td>'
      +brl(M.fechados.reduce(function(s,m){return s+(totM[m]?totM[m].v:0);},0)/(M.fechados.length||1))+'</td></tr></tbody></table></div>';
    // por loja (R$ de todos os itens controlados)
    var ls=Object.keys(lojaM).map(function(lj){var t=0;meses.forEach(function(m){if(lojaM[lj][m])t+=lojaM[lj][m].v;});return {lj:lj,t:t};}).sort(function(a,b){return b.t-a.t;});
    h+='<h3>Por loja — R$ dos itens controlados por mês</h3><div class="tw"><table><thead><tr><th>Loja</th><th>Regional</th>'+meses.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?' *':'')+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>'
      +ls.map(function(o){var l=M.lojas[o.lj];return '<tr><td class="l">'+esc(l.nome)+'</td><td>'+esc(l.reg)+'</td>'+meses.map(function(m){var c=lojaM[o.lj][m];return '<td>'+(c?brl(c.v):'—')+'</td>';}).join('')+'<td><b>'+brl(o.t)+'</b></td></tr>';}).join('')
      +'</tbody></table></div><div class="nota">* mês em andamento — aparece na tabela, mas não entra na média.</div>';
    return h;
  }

  function vPrev(R){
    var M=R.M,x=R.linhas.find(function(l){return l.L.id===S.linha;}),L=x.L,C=x.C,F=x.F,P=M.P,fut=F.futuros;
    var h=avisoBase(R)+previsaoVenda(R)+'<h3>Sugestão de compra — todos os itens controlados</h3>'+tabelaCompra(R)
      +'<h3>'+L.icone+' '+esc(L.nome)+' — previsão de consumo por loja ('+fut.map(mesLabel).join(', ')+')</h3>'
      +'<div class="nota" style="margin:0 0 8px">'+(C.dk?'Motor previsto = média mensal de '+DRV_NOME[C.dk]+' no ano':'Sem motor: média mensal de consumo')
      +(F.ehVenda?' · mês comum +'+n0(P.crescimento)+'% · dezembro ×'+n2(P.fatorDez):'')
      +(C.dk?'. Consumo previsto = motor previsto × '+(P.basePrev==='real'?'índice real de cada loja':'padrão da rede ('+fmtTaxa(L,C.padrao)+')')+'. Loja sem base usa a própria média de consumo.':'.')+'</div>';
    var rows=F.porLoja.filter(bateLoja);
    h+='<div class="tw"><table><thead><tr><th>Loja</th><th>Regional</th>'+(C.dk?'<th>Média '+DRV_CURTO[C.dk]+'/mês</th>':'')+'<th>Consumo médio/mês</th><th>Previsão mês comum</th>'
      +fut.map(function(m){return '<th>'+mesLabel(m)+'</th>';}).join('')+'<th>Total '+fut.length+' meses</th><th>Base</th></tr></thead><tbody>';
    var t={md:0,mc:0,p:0,pm:{},hz:0};
    rows.forEach(function(r){var hzr=0;fut.forEach(function(m){hzr+=r.pm[m];t.pm[m]=(t.pm[m]||0)+r.pm[m];});t.md+=r.mediaDrv||0;t.mc+=r.mediaCons;t.p+=r.prev;t.hz+=hzr;
      h+='<tr><td class="l">'+esc(r.nome)+'</td><td>'+esc(r.reg)+'</td>'+(C.dk?'<td>'+(r.mediaDrv?n0(r.mediaDrv):'—')+'</td>':'')
        +'<td>'+n1(r.mediaCons)+'</td><td class="ok"><b>'+n1(r.prev)+'</b></td>'+fut.map(function(m){return '<td'+(m.slice(5)==='12'?' class="dn"':'')+'>'+n0(r.pm[m])+'</td>';}).join('')
        +'<td><b>'+n0(hzr)+'</b></td><td><small>'+esc(r.base)+'</small></td></tr>';});
    h+='<tr class="tot"><td>TOTAL</td><td></td>'+(C.dk?'<td>'+n0(t.md)+'</td>':'')+'<td>'+n0(t.mc)+'</td><td>'+n0(t.p)+'</td>'+fut.map(function(m){return '<td>'+n0(t.pm[m])+'</td>';}).join('')+'<td>'+n0(t.hz)+'</td><td></td></tr></tbody></table></div>';
    return h;
  }
  // Previsão de venda (PA) por loja: média do ano, meses comuns +crescimento, dezembro × fator.
  function previsaoVenda(R){
    var M=R.M,P=M.P,dp=M.drv.pares;if(!Object.keys(dp).length)return '';
    var fut=[];for(var i=0;i<(Number(P.horizonte)||3);i++)fut.push(somaMes(M.atual,i));
    var rows=[];
    Object.keys(dp).forEach(function(lj){var info=M.lojas[lj];if(!info||!bateLoja(info))return;
      var ms=M.fechados.filter(function(m){return dp[lj][m]!=null;});if(!ms.length)return;
      var tot=ms.reduce(function(s,m){return s+dp[lj][m];},0),med=tot/ms.length;
      rows.push({nome:info.nome,reg:info.reg,n:ms.length,tot:tot,med:med,pm:fut.map(function(m){return med*fatorMes(P,m,true);})});});
    rows.sort(function(a,b){return b.med-a.med;});
    var T={tot:0,med:0,pm:fut.map(function(){return 0;})};
    var h='<h3>📈 Previsão de venda (PA) por loja — média do ano'+' · mês comum +'+n0(P.crescimento)+'% · dezembro ×'+n2(P.fatorDez)+'</h3><div class="tw" style="max-height:340px"><table><thead><tr><th>Loja</th><th>Regional</th><th>Meses com venda</th><th>PA no ano</th><th>Média PA/mês</th>'
      +fut.map(function(m){return '<th>'+mesLabel(m)+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>';
    rows.forEach(function(r){T.tot+=r.tot;T.med+=r.med;r.pm.forEach(function(v,i){T.pm[i]+=v;});
      h+='<tr><td class="l">'+esc(r.nome)+'</td><td>'+esc(r.reg)+'</td><td>'+r.n+'</td><td>'+n0(r.tot)+'</td><td class="ok"><b>'+n0(r.med)+'</b></td>'
        +r.pm.map(function(v,i){return '<td'+(fut[i].slice(5)==='12'?' class="dn"':'')+'>'+n0(v)+'</td>';}).join('')+'<td><b>'+n0(r.pm.reduce(function(s,v){return s+v;},0))+'</b></td></tr>';});
    h+='<tr class="tot"><td>TOTAL</td><td></td><td></td><td>'+n0(T.tot)+'</td><td>'+n0(T.med)+'</td>'+T.pm.map(function(v){return '<td>'+n0(v)+'</td>';}).join('')+'<td>'+n0(T.pm.reduce(function(s,v){return s+v;},0))+'</td></tr></tbody></table></div>';
    return h;
  }
  function linhasCompra(R){var o=[];R.linhas.forEach(function(x){x.F.itens.forEach(function(i){o.push(i);});});return o;}
  function tabelaCompra(R){
    var its=linhasCompra(R),P=R.M.P,t={pm:0,sug:0},F0=R.linhas[0].F,mc=F0.mCob,dez=F0.todos.filter(function(m){return m.slice(5)==='12';})[0];
    var h='<div class="tw" style="max-height:none"><table><thead><tr><th>Item</th><th>Grupo</th><th>Média real/mês</th><th>Previsão mês comum</th>'+(dez?'<th>Previsão '+mesLabel(dez)+'</th>':'')
      +'<th>Estoque atual</th><th>Cobertura atual</th><th>Precisa ('+mc.map(mesLabel).join(' + ')+')</th><th>Sugestão de compra</th><th>Custo un.</th><th>Valor da compra</th></tr></thead><tbody>';
    its.forEach(function(i){t.pm+=i.prevM*i.custo;t.sug+=i.sugV;
      var cobCls=i.cobAtual==null?'':i.cobAtual<1?'up':i.cobAtual<mc.length?'dn':'ok';
      h+='<tr><td class="l">'+esc(i.nome)+'<small>'+i.cod+(i.ultCompra?' · última compra '+esc(i.ultCompra):'')+'</small></td><td>'+esc(i.linha.grupo)+'</td><td>'+n0(i.media)+'</td><td class="ok"><b>'+n0(i.prevM)+'</b></td>'
        +(dez?'<td class="dn"><b>'+n0(i.pm[dez])+'</b></td>':'')
        +'<td>'+n0(i.saldo)+(i.deps?'<small>'+Object.keys(i.deps).map(function(d){return esc(d.replace(/\s*-\s*ALMOXARIFADO\s*/i,' ')).slice(0,14)+' '+n0(i.deps[d]);}).join(' + ')+'</small>':'')+'</td><td class="'+cobCls+'">'+(i.cobAtual!=null?n1(i.cobAtual)+' m':'—')+'</td><td>'+n0(i.alvo)+'</td>'
        +'<td><b class="'+(i.sug?'dn':'ok')+'">'+(i.sug?n0(i.sug):'—')+'</b></td><td>'+(i.custo?'R$ '+Number(i.custo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4}):'—')+'</td><td><b>'+(i.sug?brl(i.sugV):'—')+'</b></td></tr>';});
    h+='<tr class="tot"><td>TOTAL</td><td></td><td></td><td>'+brl(t.pm)+'/mês</td>'+(dez?'<td></td>':'')+'<td></td><td></td><td></td><td></td><td></td><td>'+brl(t.sug)+'</td></tr></tbody></table></div>'
      +'<div class="nota">Sugestão = previsão de '+mc.map(mesLabel).join(' + ')+' (dezembro ×'+n2(P.fatorDez)+' nos itens de venda, agrado e bobina) − estoque atual do almoxarifado. Cobertura em vermelho = menos de 1 mês. '
      +'O pedido de dezembro sai das lojas em novembro: compre antes. Arredonde para a embalagem de compra (milheiro, caixa, fardo).</div>';
    return h;
  }

  function vBase(){
    var B=S.base,P=B.params;
    function resumo(lista,campos){
      var ms={};lista.forEach(function(x){var m=ms[x.mes]=ms[x.mes]||{lojas:{},v:{}};m.lojas[x.loja]=1;campos.forEach(function(c){if(x[c]!=null)m.v[c]=(m.v[c]||0)+Number(x[c]);});});
      var ks=Object.keys(ms).sort();if(!ks.length)return '<div class="vazio" style="padding:14px">Nada carregado ainda.</div>';
      return '<div class="tw" style="max-height:300px"><table><thead><tr><th>Mês</th><th>Lojas</th>'+campos.map(function(c){return '<th>'+({pares:'Pares',nfs:'NFS',valor:'Valor',pedidos:'Pedidos'}[c])+'</th>';}).join('')+'</tr></thead><tbody>'
        +ks.map(function(k){var m=ms[k];return '<tr><td>'+mesLabel(k)+'</td><td>'+Object.keys(m.lojas).length+'</td>'+campos.map(function(c){return '<td>'+(m.v[c]!=null?(c==='valor'?brl(m.v[c]):n0(m.v[c])):'—')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
    }
    var h='<div class="kpi"><div><span>Base de vendas</span><b>'+n0(B.vendas.length)+'</b><small>linhas loja × mês</small></div><div><span>Base de remanejo</span><b>'+n0(B.remanejo.length)+'</b><small>linhas loja × mês</small></div>'
      +'<div><span>Atualizado</span><b style="font-size:14px">'+(B.atualizadoEm?new Date(B.atualizadoEm).toLocaleString('pt-BR'):'—')+'</b><small>'+esc(B.atualizadoPor||'')+'</small></div></div>'
      +(S.msgBase?'<div class="aviso" style="background:#0d2233;border-color:#2f5478;color:#cfe0f2">'+S.msgBase.map(esc).join('<br>')+'</div>':'')
      +'<div class="drop" id="acl-drop">⬇ Arraste aqui as planilhas de <b>vendas por loja/mês</b> e/ou <b>pedidos de remanejo</b> (xlsx ou csv) — ou <label style="display:inline;color:#5fd3b8;cursor:pointer;text-transform:none;font-size:13px">clique para escolher<input type="file" id="acl-file" multiple accept=".xlsx,.xls,.csv" style="display:none"></label>'
      +'<div style="margin-top:10px;font-size:12px">O tipo é reconhecido pelas colunas: <b>Loja + Mês/Data + Pares (PA) + NFS + Valor</b> = vendas · <b>Origem + Destino + Data + Qtde</b> = remanejo · <b>Código + Descrição + Quantidade</b> = estoque dos depósitos. Carga nova troca só os meses e lojas que vieram no arquivo.</div>'
      +'<div style="margin-top:10px"><button type="button" data-a="mod" data-m="ven">Modelo de vendas (.csv)</button> <button type="button" data-a="mod" data-m="rem">Modelo de remanejo (.csv)</button></div></div>'
      +'<h3>⚙ Parâmetros (valem para todos)</h3><div class="pgrid">'
      +'<div><label>PA por sacola (regra)</label><input type="number" step="0.1" min="0.5" id="p-pa" value="'+P.paPorSacola+'"></div>'
      +'<div><label>Previsão de venda (+% sobre a média)</label><input type="number" step="1" id="p-cr" value="'+P.crescimento+'"></div>'
      +'<div><label>Dezembro (× venda de um mês comum)</label><input type="number" step="0.05" min="1" max="5" id="p-dez" value="'+P.fatorDez+'"></div>'
      +'<div><label>Tolerância do padrão (±%)</label><input type="number" step="1" min="5" id="p-tol" value="'+P.tolerancia+'"></div>'
      +'<div><label>Cobertura de estoque (meses)</label><input type="number" step="0.5" min="0.5" id="p-cob" value="'+P.cobertura+'"></div>'
      +'<div><label>Horizonte da previsão (meses)</label><input type="number" step="1" min="1" max="12" id="p-hz" value="'+P.horizonte+'"></div>'
      +'<div><label>Base da previsão</label><select id="p-bp"><option value="padrao"'+(P.basePrev!=='real'?' selected':'')+'>Padrão da rede (auditoria)</option><option value="real"'+(P.basePrev==='real'?' selected':'')+'>Índice real de cada loja</option></select></div>'
      +'</div><div style="margin-top:10px"><button type="button" class="pri" data-a="salvarP">💾 Salvar parâmetros</button></div>'
      +'<h3>Estoque dos depósitos (CD + AX)</h3>'+(B.estoque&&B.estoque.itens?'<div class="tw" style="max-height:300px"><table><thead><tr><th>Item</th><th>Depósitos</th><th>Total</th><th>Última compra</th></tr></thead><tbody>'
        +Object.keys(B.estoque.itens).map(function(c){var x=B.estoque.itens[c];return '<tr><td class="l">'+esc(x.nome)+'<small>'+c+'</small></td><td class="l">'+Object.keys(x.deps).map(function(d){return esc(d)+': <b>'+n0(x.deps[d])+'</b>';}).join('<br>')+'</td><td><b>'+n0(x.total)+'</b></td><td>'+esc(x.ultCompra||'')+'</td></tr>';}).join('')
        +'</tbody></table></div><div class="nota">Carregado em '+new Date(B.estoque.em).toLocaleString('pt-BR')+' ('+esc(B.estoque.arquivo||'')+'). Itens que não vieram no arquivo usam o estoque do módulo Almoxarifado (só 001 CD). Estoque das lojas é desconsiderado.</div><div style="margin-top:6px"><button type="button" data-a="limpar" data-m="est">Apagar estoque carregado</button></div>'
        :'<div class="vazio" style="padding:14px">Nada carregado: usando o estoque do módulo Almoxarifado (só 001 CD). Arraste aqui o relatório de estoque com todos os depósitos (ex.: 001 CD + AX - ALMOXARIFADO CONDE).</div>')
      +'<h3>Vendas carregadas</h3>'+resumo(B.vendas,['pares','nfs','valor'])+(B.vendas.length?'<div style="margin-top:6px"><button type="button" data-a="limpar" data-m="ven">Apagar base de vendas</button></div>':'')
      +'<h3>Remanejo carregado (pares enviados pela loja de origem)</h3>'+resumo(B.remanejo,['pares','pedidos'])+(B.remanejo.length?'<div style="margin-top:6px"><button type="button" data-a="limpar" data-m="rem">Apagar base de remanejo</button></div>':'')
      +(B.arquivos.length?'<h3>Últimas cargas</h3><div class="nota">'+B.arquivos.slice(-10).reverse().map(function(a){return esc(new Date(a.em).toLocaleString('pt-BR')+' · '+a.nome+' · '+a.tipo+' · '+a.meses+' · '+a.lojas+' lojas');}).join('<br>')+'</div>':'');
    return h;
  }
  function ligarBase(){
    var d=document.getElementById('acl-drop'),f=document.getElementById('acl-file');
    if(f)f.onchange=function(){if(f.files.length){d.innerHTML='Lendo '+f.files.length+' arquivo(s)...';importar(Array.from(f.files));}};
    if(d){d.ondragover=function(e){e.preventDefault();d.classList.add('on');};d.ondragleave=function(){d.classList.remove('on');};
      d.ondrop=function(e){e.preventDefault();d.classList.remove('on');var fs=Array.from(e.dataTransfer.files||[]);if(fs.length){d.innerHTML='Lendo '+fs.length+' arquivo(s)...';importar(fs);}};}
  }
  async function salvarParametros(b){
    var P=S.base.params,g=function(id){return document.getElementById(id);};
    P.paPorSacola=Number(g('p-pa').value)||1.5;P.crescimento=Number(g('p-cr').value)||0;P.fatorDez=Number(g('p-dez').value)||2.75;P.tolerancia=Number(g('p-tol').value)||25;
    P.cobertura=Number(g('p-cob').value)||3;P.horizonte=Math.min(12,Math.max(1,Math.round(Number(g('p-hz').value)||3)));P.basePrev=g('p-bp').value;
    b.disabled=true;b.textContent='Salvando...';
    try{await salvarBase();S.msgBase=['✔ Parâmetros salvos.'];}catch(e){S.msgBase=['✖ '+(e.message||e)];}
    render();
  }
  async function limparBase(m){
    var nm=m==='rem'?'remanejo':m==='est'?'estoque':'vendas';
    if(!confirm('Apagar toda a base de '+nm+' carregada neste módulo? (o consumo do almoxarifado não é afetado)'))return;
    if(m==='rem')S.base.remanejo=[];else if(m==='est')S.base.estoque=null;else S.base.vendas=[];
    try{await salvarBase();S.msgBase=['✔ Base de '+nm+' apagada.'];}catch(e){S.msgBase=['✖ '+(e.message||e)];}
    render();
  }

  // ---------- Relatório Gerencial (impressão/PDF) ----------
  function relatorioGerencial(){
    if(!S.ultimo){alert('Aguarde os dados carregarem.');return;}
    var w=window.open('','_blank');if(!w){alert('Libere pop-ups para abrir o relatório.');return;}
    var R=S.ultimo,M=R.M,P=M.P,de=M.meses.length?mesLabel(M.meses[0]):'',ate=M.meses.length?mesLabel(M.meses[M.meses.length-1]):'';
    var totV=0,prevV=0,sugV=0,acima=0,exc=0;
    R.linhas.forEach(function(x){Object.keys(M.cons[x.L.id]||{}).forEach(function(lj){M.fechados.forEach(function(m){var c=M.cons[x.L.id][lj][m];if(c)totV+=c.v;});});
      x.F.itens.forEach(function(i){prevV+=i.prevM*i.custo;sugV+=i.sugV;});acima+=x.C.acima;exc+=x.C.excesso;});
    function card(cor,rot,val,sub){return '<div class="kc" style="border-top-color:'+cor+'"><span>'+rot+'</span><b style="color:'+cor+'">'+val+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>';}
    var cards=card('#14284a','Consumo (meses fechados)',brl(totV),de+' a '+ate)+card('#0e7c66','Média mensal',brl(M.fechados.length?totV/M.fechados.length:0),M.fechados.length+' meses fechados')
      +card('#7c3aed','Previsão de consumo/mês',brl(prevV),'venda +'+n0(P.crescimento)+'%')+card('#b45309','Sugestão de compra',brl(sugV),n0(P.cobertura)+' meses de cobertura')
      +card('#be123c','Fora do padrão',acima+' ▲','excesso '+brl(exc));
    var resumo='<div class="sec">Resumo por item controlado</div><table><thead><tr><th>Item</th><th>Grupo</th><th>Motor</th><th>Consumo</th><th>R$</th><th>Média/mês</th><th>Padrão da rede</th><th>▲ Acima</th><th>▼ Abaixo</th><th>Excesso R$</th><th>Previsão/mês</th></tr></thead><tbody>'
      +R.linhas.map(function(x){var q=0,v=0;Object.keys(M.cons[x.L.id]||{}).forEach(function(lj){M.fechados.forEach(function(m){var c=M.cons[x.L.id][lj][m];if(c){q+=c.q;v+=c.v;}});});
        return '<tr><td class="nm">'+x.L.icone+' '+esc(x.L.nome)+'</td><td>'+esc(x.L.grupo)+'</td><td>'+(x.C.dk?DRV_CURTO[x.C.dk]:'histórico')+'</td><td>'+n0(q)+'</td><td>'+brl(v)+'</td><td>'+n0(M.fechados.length?q/M.fechados.length:0)+'</td><td>'+(x.C.padrao!=null?fmtTaxa(x.L,x.C.padrao):'—')+'</td><td class="up">'+x.C.acima+'</td><td class="dn">'+x.C.abaixo+'</td><td>'+brl(x.C.excesso)+'</td><td class="md">'+n0(x.F.total)+'</td></tr>';}).join('')+'</tbody></table>';
    var fora='';
    R.linhas.forEach(function(x){
      var ls=x.C.linhas.filter(function(r){return (r.status==='ACIMA'||r.status==='ABAIXO'||r.status==='SEM PEDIDO')&&(!S.filtroReg||r.reg===S.filtroReg);}).slice(0,12);if(!ls.length)return;
      fora+='<div class="sec">'+x.L.icone+' '+esc(x.L.nome)+' — lojas fora do padrão <span style="font-weight:400;color:#5b6b80;font-size:11px">('+esc(x.L.regra)+' · padrão '+fmtTaxa(x.L,x.C.padrao)+')</span></div><table><thead><tr><th>Loja</th><th>Regional</th><th>'+DRV_NOME[x.C.dk]+'</th><th>Consumo</th><th>Índice</th><th>Esperado</th><th>Diferença</th><th>Diferença R$</th><th>Desvio</th><th>Situação</th></tr></thead><tbody>'
        +ls.map(function(r){return '<tr><td class="nm">'+esc(r.nome)+'</td><td>'+esc(r.reg)+'</td><td>'+n0(r.drv)+'</td><td>'+n0(r.consBase)+'</td><td>'+fmtTaxa(x.L,r.taxa)+'</td><td>'+n0(r.esperado)+'</td><td class="'+(r.dif>0?'up':'dn')+'">'+(r.dif>0?'+':'')+n0(r.dif)+'</td><td>'+brl(r.difV)+'</td><td class="'+(r.desvio>0?'up':'dn')+'">'+pct(r.desvio)+'</td><td>'+({ACIMA:'▲ Acima',ABAIXO:'▼ Abaixo','SEM PEDIDO':'▼ Vende e não pede'}[r.status])+'</td></tr>';}).join('')+'</tbody></table>';
    });
    var comp='<div class="sec">Sugestão de compra</div><table><thead><tr><th>Item</th><th>Média real/mês</th><th>Previsão/mês</th><th>Estoque</th><th>Cobertura</th><th>Comprar</th><th>Valor</th></tr></thead><tbody>'
      +linhasCompra(R).map(function(i){return '<tr><td class="nm">'+esc(i.nome)+'</td><td>'+n0(i.media)+'</td><td class="md">'+n0(i.prevM)+'</td><td>'+n0(i.saldo)+'</td><td class="'+(i.cobAtual!=null&&i.cobAtual<1?'up':'')+'">'+(i.cobAtual!=null?n1(i.cobAtual)+' m':'—')+'</td><td><b>'+(i.sug?n0(i.sug):'—')+'</b></td><td>'+(i.sug?brl(i.sugV):'—')+'</td></tr>';}).join('')
      +'<tr class="tt"><td class="nm">TOTAL</td><td></td><td>'+brl(prevV)+'/mês</td><td></td><td></td><td></td><td>'+brl(sugV)+'</td></tr></tbody></table>';
    // mensal por grupo (R$)
    var gm={},grupos=[];LINHAS.forEach(function(L){if(grupos.indexOf(L.grupo)<0)grupos.push(L.grupo);});
    Object.keys(M.itens).forEach(function(c){var it=M.itens[c],g=LINHAS.find(function(L){return L.id===it.linha;}).grupo;Object.keys(it.lojas).forEach(function(lj){if(!bateLoja(M.lojas[lj]))return;M.meses.forEach(function(m){var o=it.lojas[lj][m];if(!o)return;var a=(gm[g]=gm[g]||{})[m]=(gm[g][m]||0)+o.v;});});});
    var mens='<div class="sec">Consumo mensal por grupo (R$)'+(S.filtroLoja||S.filtroReg?' · '+esc(S.filtroLoja||('Regional '+S.filtroReg)):'')+'</div><table><thead><tr><th>Grupo</th>'+M.meses.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?'*':'')+'</th>';}).join('')+'<th class="t">Total</th></tr></thead><tbody>'
      +grupos.filter(function(g){return gm[g];}).map(function(g){var t=0;return '<tr><td class="nm">'+esc(g)+'</td>'+M.meses.map(function(m){var v=gm[g][m]||0;t+=v;return '<td>'+(v?n0(v):'—')+'</td>';}).join('')+'<td class="t"><b>'+brl(t)+'</b></td></tr>';}).join('')+'</tbody></table>';
    var css='@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2533;margin:0;background:#eef2f7}'
      +'#doc{background:#fff;max-width:1400px;margin:18px auto;padding:22px 26px;border-radius:12px;box-shadow:0 4px 18px rgba(20,40,74,.12)}'
      +'.cab{display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:3px solid #14284a}.cab img{height:58px;border-radius:6px}.cab .tt1{flex:1}.cab h1{margin:0;font-size:22px;color:#14284a}.cab p{margin:3px 0 0;color:#5b6b80;font-size:12px}'
      +'.tag{background:#14284a;color:#fff;font-size:11px;font-weight:700;padding:6px 12px;border-radius:20px;letter-spacing:.05em}'
      +'.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0 6px}.kc{background:#f7f9fc;border:1px solid #e1e7ef;border-top:4px solid;border-radius:10px;padding:12px 14px}.kc span{display:block;font-size:10px;font-weight:700;color:#5b6b80;text-transform:uppercase;letter-spacing:.04em}.kc b{display:block;font-size:19px;margin-top:4px}.kc small{display:block;color:#8091a7;font-size:10px;margin-top:2px}'
      +'.sec{font-size:14px;font-weight:800;color:#14284a;margin:20px 0 8px;padding-left:10px;border-left:4px solid #0e7c66;page-break-after:avoid}'
      +'table{width:100%;border-collapse:separate;border-spacing:0;font-size:10.5px;border:1px solid #d9e1ec;border-radius:10px;overflow:hidden}'
      +'th{background:#14284a;color:#fff;padding:7px 6px;text-align:right;font-size:9.5px;letter-spacing:.03em;text-transform:uppercase}th:first-child{text-align:left;padding-left:10px}'
      +'td{padding:5px 6px;text-align:right;border-bottom:1px solid #eef2f7}td.nm{text-align:left;padding-left:10px;font-weight:600}tbody tr:nth-child(even) td{background:#f8fafc}th.t,td.t{background:#eef3fa}th.t{background:#0f2342}td.md{color:#0e7c66;font-weight:800}td.up{color:#be123c;font-weight:700}td.dn{color:#b45309;font-weight:700}'
      +'tr.tt td{background:#dfe8f4!important;font-weight:800;color:#14284a;border-top:2px solid #14284a}tr{page-break-inside:avoid}thead{display:table-header-group}'
      +'.nota{color:#5b6b80;font-size:10px;margin-top:10px;line-height:1.5}.rod{display:flex;justify-content:space-between;color:#8091a7;font-size:10px;margin-top:18px;padding-top:8px;border-top:1px solid #e1e7ef}'
      +'#barra{position:sticky;top:0;background:#0b1626;padding:10px 14px;display:flex;gap:10px;align-items:center;z-index:5}#barra button{background:#0e7c66;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer}#barra button.s2{background:#15304d}'
      +'@media print{#barra{display:none}body{background:#fff}#doc{box-shadow:none;margin:0;padding:0;max-width:none;border-radius:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var nome='Esposende_consumo_loja_gerencial_'+new Date().toISOString().slice(0,10)+'.pdf';
    var js='function salvarPDF(){var b=document.getElementById("bpdf");b.textContent="Gerando PDF...";b.disabled=true;var d=document.getElementById("doc");'
      +'function go(){d.style.cssText="margin:0;box-shadow:none;border-radius:0;max-width:none";html2pdf().set({margin:7,filename:"'+nome+'",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},pagebreak:{mode:["css","legacy"],avoid:["tr",".kc"]}}).from(d).save().then(function(){b.textContent="📄 Salvar PDF";b.disabled=false;d.style.cssText="";});}'
      +'if(window.html2pdf)return go();var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";s.onload=go;s.onerror=function(){b.textContent="📄 Salvar PDF";b.disabled=false;window.print();};document.head.appendChild(s);}';
    var onde=S.filtroLoja?S.filtroLoja:(S.filtroReg?'Regional '+S.filtroReg:'todas as lojas');
    w.document.write('<html><head><meta charset="utf-8"><title>Esposende · Consumo Loja · Relatório Gerencial</title><style>'+css+'</style></head><body>'
      +'<div id="barra"><button onclick="window.print()">🖨 Imprimir</button><button id="bpdf" class="s2" onclick="salvarPDF()">📄 Salvar PDF</button><button class="s2" onclick="window.close()">✕ Fechar</button></div>'
      +'<div id="doc"><div class="cab">'+(logo()?'<img src="data:image/jpeg;base64,'+logo()+'" alt="Esposende">':'')+'<div class="tt1"><h1>Almoxarifado — Consumo Loja · Relatório Gerencial</h1><p>Período: '+de+' a '+ate+' · '+esc(onde)+' · previsão de venda +'+n0(P.crescimento)+'% (dezembro ×'+n2(P.fatorDez)+') · tolerância ±'+n0(P.tolerancia)+'% · 1 sacola a cada '+n1(P.paPorSacola)+' PA</p></div><span class="tag">AUDITORIA &amp; CONTROLE</span></div>'
      +'<div class="kpis">'+cards+'</div>'+resumo+mens+comp+fora
      +'<div class="nota">Consumo = Qtd Atendida das requisições do almoxarifado (meses fechados; o mês em andamento não entra nas médias). Padrão da rede = mediana do índice das lojas (sacolas: regra fixa). Esperado = motor da loja (PA, NFS ou pares remanejados) × padrão. Embalagens de presente no custo real (Sulnove 0,004 + DIFAL 13,5%).'
      +(!S.base.vendas.length?' <b>Base de vendas não carregada: itens de venda, agrado e bobina sem comparação por motor.</b>':'')+(!S.base.remanejo.length?' <b>Base de remanejo não carregada: fita e etiqueta sem comparação por motor.</b>':'')+'</div>'
      +'<div class="rod"><span>Esposende · Central de Auditoria &amp; Controle</span><span>Gerado em '+new Date().toLocaleString('pt-BR')+'</span></div></div>'
      +'<scr'+'ipt>'+js+'</scr'+'ipt></body></html>');
    w.document.close();
  }

  // ---------- Excel ----------
  function exportarExcel(btn){
    if(!S.ultimo){alert('Aguarde os dados carregarem.');return;}
    btn.disabled=true;var tx=btn.textContent;btn.textContent='Gerando...';
    function fim(){btn.disabled=false;btn.textContent=tx;}
    carregarScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',function(){return !!window.ExcelJS;},function(ok){
      if(!ok){fim();alert('Não consegui carregar o gerador de Excel.');return;}
      try{montarXlsx().then(fim,function(e){console.error(e);fim();alert('Erro ao gerar o Excel.');});}catch(e){console.error(e);fim();}
    });
  }
  function montarXlsx(){
    var R=S.ultimo,M=R.M,P=M.P,wb=new window.ExcelJS.Workbook(),NAVY='FF14284A';
    var logoId=logo()?wb.addImage({base64:'data:image/jpeg;base64,'+logo(),extension:'jpeg'}):null;
    var gerado=new Date().toLocaleString('pt-BR');
    function aba(nome,titulo,cab,linhas,fmts,larg){
      var ws=wb.addWorksheet(nome,{views:[{state:'frozen',ySplit:5,showGridLines:false}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
      ws.getRow(1).height=24;ws.getRow(2).height=18;ws.getRow(3).height=18;
      if(logoId!=null)ws.addImage(logoId,{tl:{col:0.1,row:0.2},ext:{width:200,height:55}});
      ws.getCell('C1').value='Almoxarifado — Consumo Loja';ws.getCell('C1').font={bold:true,size:15,color:{argb:NAVY}};
      ws.getCell('C2').value=titulo;ws.getCell('C2').font={size:10,color:{argb:'FF555555'}};
      ws.getCell('C3').value='Gerado em '+gerado+' · Esposende · Central de Auditoria & Controle';ws.getCell('C3').font={size:9,color:{argb:'FF777777'}};
      cab.forEach(function(c,i){ws.getColumn(i+1).width=(larg&&larg[i])||(i===0?40:14);});
      var hr=ws.getRow(5);hr.values=cab;hr.height=20;
      hr.eachCell(function(cell){cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:NAVY}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};});
      linhas.forEach(function(l,ix){
        var tot=l&&l.__tot,vals=tot?l.v:l,r=ws.addRow(vals);
        (fmts||[]).forEach(function(f,i){if(f)r.getCell(i+1).numFmt=f;});
        if(!tot&&ix%2===1)r.eachCell({includeEmpty:true},function(c){c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}};});
        r.eachCell({includeEmpty:true},function(c){c.border={bottom:{style:'hair',color:{argb:'FFD9E1EC'}}};});
        if(tot)r.eachCell(function(c){c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2F7'}};});
      });
      return ws;
    }
    var Q='#,##0',Q1='#,##0.0',RS='"R$" #,##0.00',PC='0%';
    // Gerencial
    aba('Gerencial','Resumo por item controlado · '+(M.meses.length?mesLabel(M.meses[0])+' a '+mesLabel(M.meses[M.meses.length-1]):''),
      ['Item','Grupo','Motor','Regra','Consumo (meses fechados)','R$','Média/mês','Padrão da rede','Lojas acima','Lojas abaixo','Excesso R$','Previsão/mês'],
      R.linhas.map(function(x){var q=0,v=0;Object.keys(M.cons[x.L.id]||{}).forEach(function(lj){M.fechados.forEach(function(m){var c=M.cons[x.L.id][lj][m];if(c){q+=c.q;v+=c.v;}});});
        return [x.L.nome,x.L.grupo,x.C.dk?DRV_NOME[x.C.dk]:'histórico',x.L.regra,q,v,M.fechados.length?q/M.fechados.length:0,x.C.padrao!=null?fmtTaxa(x.L,x.C.padrao):'—',x.C.acima,x.C.abaixo,x.C.excesso,x.F.total];}),
      [null,null,null,null,Q,RS,Q,null,Q,Q,RS,Q],[30,12,20,40,14,14,12,16,10,10,14,12]);
    // Mensal (itens)
    var cabM=['Item','Código','Grupo'].concat(M.meses.map(mesLabel)).concat(['Total qtd','Total R$','Média/mês']);
    var linM=[];Object.keys(M.itens).map(function(c){return M.itens[c];}).sort(function(a,b){return a.linha.localeCompare(b.linha)||a.cod-b.cod;}).forEach(function(it){
      var tq=0,tv=0,qf=0,ms=M.meses.map(function(m){var q=0;Object.keys(it.lojas).forEach(function(lj){if(!bateLoja(M.lojas[lj]))return;var o=it.lojas[lj][m];if(o){q+=o.q;tv+=o.v;if(m<M.atual)qf+=o.q;}});tq+=q;return q||null;});
      if(tq)linM.push([it.nome,it.cod,LINHAS.find(function(L){return L.id===it.linha;}).grupo].concat(ms).concat([tq,tv,M.fechados.length?qf/M.fechados.length:0]));});
    aba('Mensal','Itens controlados por mês (qtd) · '+(S.filtroLoja||S.filtroReg?(S.filtroLoja||'Regional '+S.filtroReg):'todas as lojas'),cabM,linM,
      [null,null,null].concat(M.meses.map(function(){return Q;})).concat([Q,RS,Q1]),[36,9,11]);
    // Comparativo (todas as linhas)
    var linC=[];R.linhas.forEach(function(x){x.C.linhas.filter(bateLoja).forEach(function(r){
      linC.push([x.L.nome,r.nome,r.reg,x.C.dk?DRV_CURTO[x.C.dk]:'—',r.drv||null,r.consTot,r.consBase,r.taxa!=null?fmtTaxa(x.L,r.taxa):'—',x.C.padrao!=null?fmtTaxa(x.L,x.C.padrao):'—',r.esperado,r.dif,r.difV,r.desvio,r.status]);});});
    aba('Comparativo','Comparativo entre lojas — consumo x motor (venda / NFS / remanejo)',['Item','Loja','Regional','Motor','Qtd motor','Consumo','Consumo meses c/ base','Índice loja','Padrão','Esperado','Diferença','Diferença R$','Desvio','Situação'],
      linC,[null,null,null,null,Q,Q,Q,null,null,Q,Q,RS,PC,null],[24,32,12,10,12,11,12,14,14,11,11,13,9,14]);
    // Previsão por loja
    var fut=R.linhas[0].F.futuros;
    var linP=[];R.linhas.forEach(function(x){x.F.porLoja.filter(bateLoja).forEach(function(r){var t=0;linP.push([x.L.nome,r.nome,r.reg,r.mediaDrv||null,r.prevDrv,r.mediaCons,r.prev].concat(fut.map(function(m){t+=r.pm[m];return r.pm[m];})).concat([t,r.base]));});});
    aba('Previsão por loja','Previsão de consumo por loja · mês comum +'+P.crescimento+'% · dezembro ×'+P.fatorDez,['Item','Loja','Regional','Média motor/mês','Previsão motor (mês comum)','Consumo médio/mês','Previsão consumo (mês comum)'].concat(fut.map(mesLabel)).concat(['Total horizonte','Base']),
      linP,[null,null,null,Q,Q,Q1,Q1].concat(fut.map(function(){return Q;})).concat([Q,null]),[24,32,12]);
    // Compra
    var its=linhasCompra(R),tot=its.reduce(function(s,i){return s+i.sugV;},0);
    var mc=R.linhas[0].F.mCob;
    aba('Sugestão de compra','Sugestão de compra · previsão de '+mc.map(mesLabel).join(' + ')+' (dezembro ×'+P.fatorDez+') − estoque atual',['Item','Código','Grupo','Média real/mês','Previsão mês comum'].concat(mc.map(mesLabel)).concat(['Estoque atual','Cobertura (meses)','Precisa','Comprar','Custo un.','Valor']),
      its.map(function(i){return [i.nome,i.cod,i.linha.grupo,i.media,i.prevM].concat(mc.map(function(m){return i.pm[m];})).concat([i.saldo,i.cobAtual,i.alvo,i.sug,i.custo,i.sugV]);})
        .concat([{__tot:true,v:(function(){var v=[];for(var k=0;k<11+mc.length;k++)v.push('');v[0]='TOTAL';v[v.length-1]=tot;return v;})()}]),
      [null,null,null,Q,Q].concat(mc.map(function(){return Q;})).concat([Q,Q1,Q,Q,'"R$" #,##0.0000',RS]),[36,9,11]);
    // Base de vendas / remanejo
    if(S.base.vendas.length)aba('Base vendas','Vendas por loja e mês (carregadas no módulo)',['Loja','Regional','Mês','Pares (PA)','NFS','Valor'],
      S.base.vendas.slice().sort(function(a,b){return a.mes.localeCompare(b.mes)||a.loja-b.loja;}).map(function(v){return [nomeLoja(v.loja),regDe(v.loja),mesLabel(v.mes),v.pares,v.nfs,v.valor];}),[null,null,null,Q,Q,RS],[32,12,10]);
    if(S.base.remanejo.length)aba('Base remanejo','Pares remanejados por loja de origem e mês',['Loja','Regional','Mês','Pares','Pedidos'],
      S.base.remanejo.slice().sort(function(a,b){return a.mes.localeCompare(b.mes)||a.loja-b.loja;}).map(function(v){return [nomeLoja(v.loja),regDe(v.loja),mesLabel(v.mes),v.pares,v.pedidos];}),[null,null,null,Q,Q],[32,12,10]);
    return wb.xlsx.writeBuffer().then(function(buf){
      var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      a.download='Esposende_consumo_loja_'+new Date().toISOString().slice(0,10)+'.xlsx';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},800);
    });
  }

  // ---------- menu do Portal e botão no módulo ----------
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document);}catch(e){return a;}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1);}catch(e){}return a;}
  function menu(d){
    var sb=d.getElementById('sb');if(!sb||sb.querySelector('[data-acl-menu]'))return;
    var g=d.createElement('div');g.className='sg';g.setAttribute('data-acl-group','1');
    g.innerHTML='<div class="sgl">Almoxarifado</div><button class="ni" data-acl-menu="1" type="button" title="Consumo por loja, lojas fora do padrão, previsão e sugestão de compra"><span class="nii">🏬</span><span class="nil">Consumo Loja</span></button>';
    sb.appendChild(g);g.querySelector('[data-acl-menu]').onclick=function(e){e.preventDefault();abrir();};
  }
  function botaoModulo(){
    var ifr=document.getElementById('ifr-alm'),w=ifr&&ifr.contentWindow,doc;try{doc=w&&w.document;}catch(e){return;}
    if(!doc||!doc.body||doc.getElementById('acl-btn'))return;
    var ref=doc.getElementById('aci-btn');if(!ref)return;
    var b=doc.createElement('button');b.id='acl-btn';b.type='button';b.textContent='🏬 Consumo Loja';
    b.title='Consumo x venda/remanejo por loja, lojas fora do padrão, previsão e sugestão de compra';
    b.style.cssText=ref.style.cssText+';background:#14284a;border-color:#2f5478';
    b.onclick=function(e){e.preventDefault();abrir();};
    ref.parentElement.insertBefore(b,ref.nextSibling);
  }
  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d);}catch(e){}});try{botaoModulo();}catch(e){}}
  varrer();setInterval(varrer,1500);
  window.abrirConsumoLoja=abrir;
  window.__consumoLoja={modelo:function(){return S.carregado?tudo():null;},interpretar:interpretar,mesDe:mesDe,codLoja:codLoja,num:num};
})();
