// Almoxarifado · Consumo Loja (auditoria de consumo, previsão e sugestão de compra)
// Menu próprio no Portal ("Almoxarifado → Consumo Loja") e botão dentro do módulo Almoxarifado.
// Cruza o consumo dos itens controlados com o que gera esse consumo:
//   Sacolas e embalagens de presente ........ pares vendidos (PA)   · regra: 1 sacola a cada 1,5 PA
//   Agrado (café, pirulito, balão) ............ vendas (NFS)         · padrão = mediana das lojas
//   Etiqueta 70x24 ............................ pares remanejados     · padrão = mediana das lojas
//   Bobina PDV ................................ vendas (NFS)         · padrão = mediana das lojas
//   Fita PP, papel A4, filme stretch, trava anel,
//   alfinete e suporte de etiqueta ............ média mensal de consumo (filme stretch: 3 meses de estoque no total)
// NFS = PA ÷ 1,5 (regra: cada NF leva em média 1,5 par). Balão nº7 (10546 + 17314) somado num item só.
// Fontes: portal_sync alm (dbConsumoRaw, dbEstoqueRaw, dbRegionaisMap, dbLojaNomeMap) e
// portal_sync almcl (base de vendas/remanejo por loja e mês carregada aqui + parâmetros).
// Não altera o módulo Almoxarifado nem os dados dele.
(function(){
  if(window.__almoxConsumoLoja)return;
  window.__almoxConsumoLoja='2026-11-09.5';

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
    {id:'sac',grupo:'Venda',nome:'Sacolas',icone:'🛍️',cods:['7894','8209','9516','21604'],drivers:['pares'],porUn:true,fixa:true,
      regra:'1 sacola a cada 1,5 PA (pares atendidos)'},
    {id:'emb',grupo:'Venda',nome:'Embalagem de presente',icone:'🎁',cods:['11314','11315','11316'],drivers:['pares'],porUn:false,pct:true,
      regra:'% das vendas (PA) que saem com embalagem de presente · padrão = mediana das lojas'},
    {id:'caf',grupo:'Agrado',nome:'Café (agrado)',icone:'☕',cods:['19388'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'pir',grupo:'Agrado',nome:'Pirulito (agrado)',icone:'🍭',cods:['15538'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'bal',grupo:'Agrado',nome:'Balão (agrado)',icone:'🎈',cods:['10546','17314'],drivers:['nfs','pares'],porUn:false,
      regra:'Pacotes a cada 1.000 vendas (NFS) · padrão = mediana das lojas'},
    {id:'etq',grupo:'Venda',nome:'Etiqueta 70x24',icone:'🏷️',cods:['7982','15483'],drivers:['pares'],porUn:false,fator:630,unFator:'etiquetas',
      regra:'Rolos a cada 1.000 pares remanejados (enviados pela loja) · padrão = mediana das lojas'},
    {id:'bob',grupo:'NFS',nome:'Bobina PDV 79mm',icone:'🧾',cods:['8002','22203','26104','26153'],drivers:['nfs','pares'],porUn:true,
      regra:'Vendas (NFS) por bobina · padrão = mediana das lojas'},
    // Média mensal: previsão e compra pela média mensal de consumo (meses fechados), sem motor de venda/remanejo.
    {id:'fit',grupo:'Média mensal',nome:'Fita adesiva PP 45mm',icone:'📦',cods:['7816'],drivers:[],porUn:false,regra:'Previsão pela média mensal de consumo'},
    {id:'a4',grupo:'Média mensal',nome:'Papel A4 (resma)',icone:'📄',cods:['7981'],drivers:[],porUn:false,regra:'Previsão pela média mensal de consumo'},
    {id:'str',grupo:'Média mensal',nome:'Filme stretch',icone:'🎞️',cods:['14580'],drivers:[],porUn:false,seg:'segStretch',
      regra:'Previsão pela média mensal de consumo · estoque de segurança de 3 meses no total'},
    {id:'trv',grupo:'Média mensal',nome:'Trava anel 125',icone:'🔗',cods:['8014'],drivers:[],porUn:false,regra:'Previsão pela média mensal de consumo'},
    {id:'alf',grupo:'Média mensal',nome:'Alfinete de aço nº32',icone:'📌',cods:['9474'],drivers:[],porUn:false,regra:'Previsão pela média mensal de consumo'},
    {id:'sup',grupo:'Média mensal',nome:'Suporte p/ etiquetas (aro)',icone:'🏷️',cods:['9727','9728'],drivers:[],porUn:false,regra:'Previsão pela média mensal de consumo'}
  ];
  // Códigos do mesmo item com cadastro duplicado: estoque e consumo somados no código principal.
  var COD_ALIAS={'17314':'10546'}; // Balão nº7
  function codItem(c){c=String(parseInt(c,10));return COD_ALIAS[c]||c;}
  var DRV_NOME={pares:'PA (pares vendidos)',nfs:'Vendas (NFS = PA ÷ 1,5)',rem:'Pares remanejados'};
  var DRV_CURTO={pares:'PA',nfs:'NFS',rem:'pares rem.'};
  var GRUPO_COR={Venda:'#0e7c66',Agrado:'#b45309',Remanejo:'#7c3aed',NFS:'#0369a1','Média mensal':'#64748b'};
  var COD_LINHA={};LINHAS.forEach(function(L){L.cods.forEach(function(c){COD_LINHA[c]=L.id;});});
  var PARAMS_PADRAO={paPorSacola:1.5,paPorNF:1.5,segStretch:3,crescimento:10,fatorDez:2.75,tolerancia:25,cobertura:3,horizonte:3,basePrev:'padrao',mixP:35,mixM:50,mixG:15,conversao:33};
  // Baliza de consumo de sacola por tamanho (Controladoria): P 35% · M 50% · G 15%.
  var SAC_TAM={'9516':'P','7894':'M','8209':'G'};
  function mixSac(P){var t={P:Number(P.mixP),M:Number(P.mixM),G:Number(P.mixG)};if(!(t.P>=0))t.P=35;if(!(t.M>=0))t.M=50;if(!(t.G>=0))t.G=15;var s=t.P+t.M+t.G||100;return {P:t.P/s,M:t.M/s,G:t.G/s};}
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

  // Carga com nova tentativa automática: se a sessão do Portal ainda não estiver pronta, se der erro de rede
  // ou se o consumo/vendas vierem vazios, tenta de novo (2s, 4s, 8s) e avisa na tela o que está acontecendo.
  var TENTATIVAS=4;
  function esperar(ms){return new Promise(function(r){setTimeout(r,ms);});}
  async function buscarTudo(){
    var r=await Promise.all([
      rest('portal_sync?module_id=eq.alm&select=u:updated_at,c:payload->dbConsumoRaw,e:payload->dbEstoqueRaw,r:payload->dbRegionaisMap,n:payload->dbLojaNomeMap'),
      rest('portal_sync?module_id=eq.'+MOD_ID+'&select=payload')
    ]);
    var a=(r[0]&&r[0][0])||{},b=(r[1]&&r[1][0]&&r[1][0].payload)||{};
    return {alm:{consumo:a.c||[],estoque:a.e||[],reg:a.r||{},nomes:a.n||{},atualizado:a.u||null},
      base:{vendas:b.vendas||[],remanejo:b.remanejo||[],estoque:b.estoque||null,params:Object.assign({},PARAMS_PADRAO,b.params||{}),arquivos:b.arquivos||[],atualizadoEm:b.atualizadoEm||null,atualizadoPor:b.atualizadoPor||null}};
  }
  function faltando(d){var f=[];if(!d.alm.consumo.length)f.push('consumo do almoxarifado');if(!d.base.vendas.length)f.push('base de vendas');return f;}
  async function carregar(forcar){
    if(S.carregando)return;if(S.carregado&&!forcar)return;
    S.carregando=true;S.erro=null;S.aviso=null;S.tentativa=0;render();
    var d=null,ultimoErro=null;
    for(var t=1;t<=TENTATIVAS;t++){
      S.tentativa=t;
      try{d=await buscarTudo();ultimoErro=null;}catch(e){console.error('[Consumo Loja] tentativa '+t,e);ultimoErro=e.message||String(e);d=null;}
      var f=d?faltando(d):['dados'];
      if(d&&!f.length)break;
      if(t<TENTATIVAS){S.motivo=ultimoErro||('não veio: '+f.join(' e '));render();await esperar(2000*Math.pow(2,t-1));}
    }
    S.carregando=false;S.tentativa=0;S.motivo=null;
    if(!d){S.erro=ultimoErro||'Não foi possível carregar os dados.';render();return;}
    S.alm=d.alm;S.base=d.base;S.carregado=true;
    var fl=faltando(d);
    if(fl.length)S.aviso='⚠ Depois de '+TENTATIVAS+' tentativas não veio: '+fl.join(' e ')+'. Os números abaixo ficam incompletos (lojas aparecem SEM MOTOR). Confira a conexão e clique em Recarregar.';
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
  var REG_FIXA={'1':'CD','90':'CD','64':'ALEX','17':'FECHADA','25':'FECHADA','97':'FECHADA'};
  function regDe(cod){return String(REG_FIXA[cod]||S.alm.reg[cod]||S.alm.reg[String(cod).padStart(3,'0')]||'NÃO MAPEADO').toUpperCase();}
  function ehCD(cod){return cod==='1'||cod==='90';} // 001 CD e 090 Escritório

  function modelo(){
    var P=S.base.params,atual=mesAtual(),paNF=Number(P.paPorNF)||1.5;
    var lojas={},cons={},itens={},drv={pares:{},nfs:{},rem:{},valor:{}};
    function loja(cod,nome){if(!lojas[cod])lojas[cod]={cod:cod,nome:nomeLoja(cod,nome),reg:regDe(cod)};return lojas[cod];}
    S.alm.consumo.forEach(function(r){
      var c0=String(parseInt(r['Código'],10)),c=codItem(c0);var lid=COD_LINHA[c0];if(!lid)return;
      var mes=mesBrasilia(r['Data Solicitação']);if(!mes)return;
      var lj=codLoja(r['Empresa Solicitante']);if(!lj)return;
      loja(lj,String(r['Empresa Solicitante']||'').replace(/\s+/g,' ').trim());
      var q=Number(r['Qtd Atendida'])||0;if(!q)return;
      var u=unitReal(c),v=u!=null?Math.round(q*u*100)/100:(Number(r['Custo Atendido'])||0);
      var it=itens[c]=itens[c]||{cod:c,nome:String(c0===c&&r['Insumo']||NOME_CURTO[c]||r['Insumo']||'').replace(/\s+/g,' ').trim(),linha:lid,meses:{},q:0,v:0,lojas:{}};
      var im=it.meses[mes]=it.meses[mes]||{q:0,v:0};im.q+=q;im.v+=v;
      var il=it.lojas[lj]=it.lojas[lj]||{};var ilm=il[mes]=il[mes]||{q:0,v:0};ilm.q+=q;ilm.v+=v;
      var cl=cons[lid]=cons[lid]||{};var cll=cl[lj]=cl[lj]||{};var c2=cll[mes]=cll[mes]||{q:0,v:0};c2.q+=q;c2.v+=v;
    });
    S.base.vendas.forEach(function(x){var lj=String(x.loja);loja(lj);
      // Regra (Controladoria, 09/11/2026): NFS = PA ÷ 1,5 (cada NF leva em média 1,5 par; vendeu 1.000 pares ≈ 666 NFs).
      ['pares','nfs','valor'].forEach(function(k){var val=x[k];if(k==='nfs')val=x.pares!=null?Number(x.pares)/paNF:x.nfs;if(val==null)return;var d=drv[k][lj]=drv[k][lj]||{};d[x.mes]=(d[x.mes]||0)+Number(val||0);});});
    S.base.remanejo.forEach(function(x){var lj=String(x.loja);loja(lj);var d=drv.rem[lj]=drv.rem[lj]||{};d[x.mes]=(d[x.mes]||0)+Number(x.pares||0);});
    // estoque e custo unitário por item
    var est={};
    function porEstoque(c0,saldo,custo,ultCompra,deps){var c=codItem(c0),u=unitReal(c),ant=est[c];
      if(ant&&ant.src.indexOf(c0)<0){ant.saldo+=saldo;ant.src.push(c0);if(!ant.custo)ant.custo=custo;if(!ant.ultCompra)ant.ultCompra=ultCompra;
        if(deps){ant.deps=ant.deps||{};Object.keys(deps).forEach(function(d){ant.deps[d]=(ant.deps[d]||0)+deps[d];});}return;}
      est[c]={saldo:saldo,custo:u!=null?u:custo,ultCompra:ultCompra,deps:deps||null,src:[c0]};}
    S.alm.estoque.forEach(function(e){var c0=String(parseInt(e['Código'],10));if(!COD_LINHA[c0])return;
      porEstoque(c0,Number(e['Estoque Atual'])||0,Number(e['Custo Unitário'])||0,e['Última Compra']||'');});
    // Estoque: vem do sistema do almoxarifado (dbEstoqueRaw, já soma 001 CD + AX). A planilha carregada no
    // menu só vale se for mais nova que a última atualização do módulo.
    var eb=S.base.estoque&&S.base.estoque.itens&&(!S.alm.atualizado||String(S.base.estoque.em)>new Date(S.alm.atualizado).toISOString())?S.base.estoque.itens:null;
    if(eb){var antE=est;est={};Object.keys(eb).forEach(function(c0){var x=eb[c0],ant=antE[codItem(c0)]||{};if(!COD_LINHA[String(parseInt(c0,10))])return;
      porEstoque(String(parseInt(c0,10)),Number(x.total)||0,x.custo||ant.custo||0,x.ultCompra||ant.ultCompra||'',x.deps?Object.assign({},x.deps):null);});
      Object.keys(antE).forEach(function(c){if(!est[c])est[c]=antE[c];});}
    Object.keys(itens).forEach(function(c){var it=itens[c];if(!est[c])est[c]={saldo:0,custo:0,ultCompra:'',src:[c]};
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
      linhas.push({cod:lj,nome:info.nome,reg:info.reg,cd:ehCD(lj),consTot:consTot,consBase:consBase,valBase:valBase,drv:drvTot,nMeses:mesesBase.length,primeiro:mesesBase[0]||null,
        mediaDrv:mesesBase.length?drvTot/mesesBase.length:0,mediaCons:M.fechados.length?consTot/M.fechados.length:0,
        taxa:drvTot?consBase/drvTot:null});
    });
    var maxMeses=linhas.reduce(function(m,x){return Math.max(m,x.nMeses);},0);
    // Loja inaugurada no período: o pedido de abertura (estoque inicial da loja) não é consumo do mês.
    // Ela fica fora do padrão e de acima/abaixo até completar o período inteiro com venda.
    var primRede=linhas.reduce(function(m,x){return x.primeiro&&!x.cd&&(!m||x.primeiro<m)?x.primeiro:m;},null);
    linhas.forEach(function(x){x.nova=!x.cd&&!!x.primeiro&&!!primRede&&x.primeiro>primRede;});
    // padrão: regra fixa (sacolas) ou mediana das lojas com volume (fora o CD, lojas sem consumo e lojas novas)
    var padrao=null,fonte='';
    if(dk){
      if(L.fixa){padrao=1/(Number(P.paPorSacola)||1.5);fonte='Regra: 1 a cada '+n1(P.paPorSacola)+' PA';}
      else{
        var vols=linhas.filter(function(x){return !x.cd&&x.drv>0;}).map(function(x){return x.drv;});
        var corte=mediana(vols)*0.2;
        var taxas=linhas.filter(function(x){return !x.cd&&x.drv>0&&x.drv>=corte&&x.consBase>0&&x.nMeses*2>=maxMeses&&!x.nova;}).map(function(x){return x.taxa;});
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
      else if(x.nova||x.nMeses*2<maxMeses)x.status='LOJA NOVA';
      else if(x.drv<volMed*0.2)x.status='POUCO DADO';
      else if(x.consBase===0)x.status='SEM PEDIDO';
      else if(x.desvio>tol)x.status='ACIMA';
      else if(x.desvio<-tol)x.status='ABAIXO';
      else x.status='OK';
    });
    var modelo=L.id==='caf'?modeloCafe(M,linhas,tol,custoMedio,dk):null;
    if(modelo){padrao=null;fonte='Equipe + clientes';}
    var ordem={ACIMA:0,'SEM PEDIDO':1,ABAIXO:2,OK:3,'LOJA NOVA':4,'POUCO DADO':4,'SEM PADRÃO':5,'SEM BASE':6,'SEM MOTOR':7,CD:8};
    linhas.sort(function(a,b){return (ordem[a.status]-ordem[b.status])||((b.desvio||0)-(a.desvio||0))||(b.consTot-a.consTot);});
    return {L:L,dk:dk,padrao:padrao,fonte:fonte,custoMedio:custoMedio,linhas:linhas,tol:tol,modelo:modelo,
      acima:linhas.filter(function(x){return x.status==='ACIMA';}).length,
      abaixo:linhas.filter(function(x){return x.status==='ABAIXO'||x.status==='SEM PEDIDO';}).length,
      excesso:linhas.reduce(function(s,x){return s+(x.status==='ACIMA'&&x.difV>0?x.difV:0);},0)};
  }
  // Café: o esperado sai das lojas que estão dentro do padrão hoje.
  //  esperado = A × meses (parte fixa da loja) + B × faturamento em R$ mil (quanto mais fatura, mais gente entra)
  //  A e B por mínimos quadrados; as lojas fora da tolerância saem da conta e A/B são recalculados até estabilizar.
  function modeloCafe(M,linhas,tol,custoMedio,dk){
    var vl=M.drv.valor||{};if(!Object.keys(vl).length)return null;
    linhas.forEach(function(x){var dm=(M.drv[dk]||{})[x.cod]||{},v=vl[x.cod]||{},t=0,n=0;
      M.fechados.forEach(function(m){if(dm[m]!=null&&v[m]!=null){t+=v[m];n++;}});x.fat=t/1000;x.mediaFat=n?t/n/1000:0;});
    var el=linhas.filter(function(x){return !x.cd&&x.fat>0&&x.nMeses&&x.status!=='LOJA NOVA'&&x.status!=='POUCO DADO'&&!/ES\s*SPORTS/i.test(x.nome);});
    if(el.length<8)return null;
    function ajuste(lst){var a11=0,a12=0,a22=0,b1=0,b2=0;lst.forEach(function(x){a11+=x.nMeses*x.nMeses;a12+=x.nMeses*x.fat;a22+=x.fat*x.fat;b1+=x.nMeses*x.consBase;b2+=x.fat*x.consBase;});
      var d=a11*a22-a12*a12;if(!d)return null;var A=(b1*a22-b2*a12)/d,B=(a11*b2-a12*b1)/d;
      if(A<0){A=0;B=b2/a22;}if(B<0){B=0;A=b1/a11;}return {A:A,B:B};}
    var base=el.filter(function(x){return x.consBase>0;}),r=ajuste(base);if(!r)return null;
    for(var it=0;it<8;it++){var dentro=el.filter(function(x){var e=r.A*x.nMeses+r.B*x.fat;return e>0&&Math.abs(x.consBase/e-1)<=tol;});
      if(dentro.length<8||dentro.length===base.length&&dentro.every(function(x,i){return x===base[i];}))break;base=dentro;r=ajuste(base)||r;}
    linhas.forEach(function(x){if(x.cd||!x.fat||!x.nMeses||x.status==='LOJA NOVA'||x.status==='POUCO DADO')return;
      x.espFixo=r.A*x.nMeses;x.espFluxo=r.B*x.fat;x.esperado=x.espFixo+x.espFluxo;
      x.dif=x.consBase-x.esperado;x.difV=x.dif*custoMedio;x.desvio=x.esperado?x.consBase/x.esperado-1:null;
      x.status=x.consBase===0?'SEM PEDIDO':x.desvio>tol?'ACIMA':x.desvio<-tol?'ABAIXO':'OK';});
    return {A:r.A,B:r.B,base:base.length,total:el.length};
  }

  // Previsão por loja e por mês: "mês comum" = média do motor + crescimento; dezembro = média × fator de dezembro.
  // Item = previsão da linha × participação do item. Compra = soma da previsão dos meses de cobertura − estoque.
  function prever(M,L,C){
    var P=M.P,ehVenda=L.grupo!=='Remanejo'&&(C.dk?(C.dk==='pares'||C.dk==='nfs'):(L.grupo==='Venda'||L.grupo==='Agrado'||L.grupo==='NFS'));
    var hz=Math.min(12,Math.max(1,Math.round(Number(P.horizonte)||3))),cob=Math.max(1,Math.round(Number(P.cobertura)||3));
    var futuros=[];for(var i=0;i<Math.max(hz,cob);i++)futuros.push(somaMes(M.atual,i));
    var comum=ehVenda?1+(Number(P.crescimento)||0)/100:1;
    var porLoja=C.linhas.map(function(x){
      var base,mensal;
      if(C.modelo&&x.fat&&x.nMeses&&!x.cd){
        var eqM=C.modelo.A,cliM=C.modelo.B*x.mediaFat;
        mensal=eqM+cliM;base='fixo + fluxo';
        var pmC={};futuros.forEach(function(m){pmC[m]=eqM+cliM*fatorMes(P,m,ehVenda);});
        return {cod:x.cod,nome:x.nome,reg:x.reg,cd:x.cd,mediaDrv:x.mediaDrv,prevDrv:x.mediaDrv*comum,mediaCons:x.mediaCons,prev:eqM+cliM*comum,pm:pmC,base:base};
      }
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
    var itensPrev=its.filter(function(it){return it._qp>0||(L.id==='sac'&&SAC_TAM[it.cod]);}).map(function(it){
      var share=qt?it._qp/qt:0,e=M.est[it.cod]||{saldo:0,custo:0},pm={};
      if(L.id==='sac'&&SAC_TAM[it.cod]){var outros=its.reduce(function(a,o){return a+(SAC_TAM[o.cod]?0:o._qp);},0);share=(1-(qt?outros/qt:0))*mixSac(P)[SAC_TAM[it.cod]];}
      futuros.forEach(function(m){pm[m]=totalMes[m]*share;});
      var soma=function(ms){return ms.reduce(function(s,m){return s+pm[m];},0);};
      // Estoque de segurança (ex.: filme stretch = 3 meses da média mensal) é o TOTAL mínimo a ter, não soma ao período
      // de cobertura: alvo = maior entre o que precisa na cobertura e os meses de segurança. segQ = só o que a segurança acrescenta.
      var segMeses=L.seg?Math.max(0,Number(P[L.seg])||0):0;
      var prevM=total*share,base=soma(mCob),alvo=Math.max(base,segMeses*prevM),segQ=alvo-base,sug=Math.max(0,Math.ceil(alvo-e.saldo));
      // cobertura atual: quantos meses o estoque aguenta, mês a mês (com dezembro mais forte)
      var resto=e.saldo,cobAtual=0;for(var k=0;k<futuros.length;k++){var q=pm[futuros[k]];if(!q){cobAtual=null;break;}if(resto>=q){resto-=q;cobAtual++;}else{cobAtual+=resto/q;resto=0;break;}}
      if(cobAtual!=null&&resto>0&&prevM)cobAtual+=resto/prevM;
      return {cod:it.cod,nome:it.nome,linha:L,share:share,media:M.fechados.length?it._qp/M.fechados.length:0,prevM:prevM,pm:pm,prevHz:soma(mHz),
        saldo:e.saldo,deps:e.deps||null,custo:e.custo,cobAtual:prevM?cobAtual:null,segMeses:segMeses,segQ:segQ,alvo:alvo,sug:sug,sugV:sug*e.custo,ultCompra:e.ultCompra};
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
          +' · NFS = PA ÷ '+n1(Number(S.base.params.paPorNF)||1.5));
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
  +'#acl-ov .acl-hd{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #1d3550;background:#0b1626;flex:0 0 auto;flex-wrap:wrap}'
  +'#acl-ov .acl-hd img{height:38px;border-radius:6px}#acl-ov .acl-hd .acl-tt{flex:1 1 220px;min-width:0}#acl-ov .acl-hd b{display:block;font-size:17px;color:#fff}#acl-ov .acl-hd small{display:block;color:#8ca4bf;font-size:12px}'
  +'#acl-ov button{background:#15304d;color:#fff;border:1px solid #2f5478;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:13px}#acl-ov button:hover{filter:brightness(1.15)}#acl-ov button.acl-pri{background:#0e7c66;border-color:#14a386}#acl-ov button:disabled{opacity:.6;cursor:wait}'
  +'#acl-ov .acl-tabs{display:flex;gap:4px;padding:8px 16px 0;background:#0b1626;border-bottom:1px solid #1d3550;flex:0 0 auto;overflow-x:auto}'
  +'#acl-ov .acl-tabs button{background:transparent;border:0;border-bottom:3px solid transparent;border-radius:0;color:#8ca4bf;padding:9px 12px;white-space:nowrap}#acl-ov .acl-tabs button.acl-on{color:#fff;border-bottom-color:#14a386}'
  +'#acl-ov .acl-flt{display:flex;gap:10px;flex-wrap:wrap;align-items:end;padding:12px 16px 0}'
  +'#acl-ov label{display:block;font-size:10.5px;color:#8ca4bf;font-weight:700;letter-spacing:.04em;margin-bottom:4px;text-transform:uppercase}'
  +'#acl-ov input,#acl-ov select{background:#06101c;color:#fff;border:1px solid #2a4867;border-radius:8px;padding:8px 9px;font-size:13.5px}'
  +'#acl-ov .acl-bd{flex:1 1 auto;overflow:auto;padding:12px 16px 30px}'
  +'#acl-ov .acl-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:4px 0 14px}'
  +'#acl-ov .acl-kpi div{background:#0b1626;border:1px solid #1d3550;border-top:3px solid #14a386;border-radius:10px;padding:10px 12px}#acl-ov .acl-kpi span{display:block;font-size:10.5px;color:#8ca4bf;font-weight:700;text-transform:uppercase}#acl-ov .acl-kpi b{display:block;font-size:20px;margin-top:3px}#acl-ov .acl-kpi small{color:#8ca4bf;font-size:11px}'
  +'#acl-ov .acl-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}'
  +'#acl-ov .acl-cd{background:#0b1626;border:1px solid #1d3550;border-left:4px solid #14a386;border-radius:10px;padding:12px 14px;cursor:pointer}#acl-ov .acl-cd:hover{border-color:#2f5478}'
  +'#acl-ov .acl-cd h4{margin:0 0 2px;font-size:15px;color:#fff}#acl-ov .acl-cd .acl-rg{font-size:11px;color:#8ca4bf;margin-bottom:8px}'
  +'#acl-ov .acl-cd .acl-g{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:12px}#acl-ov .acl-cd .acl-g span{color:#8ca4bf;display:block;font-size:10px;text-transform:uppercase;font-weight:700;white-space:nowrap}#acl-ov .acl-cd .acl-g small{white-space:nowrap}#acl-ov .acl-cd .acl-g b{font-size:14px}'
  +'#acl-ov h3{font-size:14px;margin:18px 0 8px;color:#bcd0e6}'
  +'#acl-ov .acl-tw{overflow:auto;border:1px solid #1d3550;border-radius:8px;max-height:62vh}'
  +'#acl-ov table{width:100%;border-collapse:collapse;font-size:12.5px}#acl-ov th{background:#13253c;color:#cfe0f2;padding:7px 8px;text-align:right;position:sticky;top:0;white-space:nowrap;z-index:1}#acl-ov th:first-child,#acl-ov td:first-child{text-align:left}'
  +'#acl-ov td{padding:6px 8px;border-bottom:1px solid #16293f;text-align:right;white-space:nowrap;color:#e8f0fa}#acl-ov td.acl-l{text-align:left;white-space:normal}#acl-ov td small{display:block;color:#7f97b2;font-size:10.5px}'
  +'#acl-ov tr.acl-tot td{font-weight:800;background:#0f2136}#acl-ov tr.acl-sub td{font-weight:700;background:#0c1b2e;color:#bcd0e6}'
  +'#acl-ov .acl-st{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:800}'
  +'#acl-ov .acl-st.acl-ACIMA{background:#5b1520;color:#ffb3bd}#acl-ov .acl-st.acl-ABAIXO,#acl-ov .acl-st.acl-SEM-PEDIDO{background:#4a3410;color:#ffd58a}#acl-ov .acl-st.acl-OK{background:#0d3b30;color:#7ff0cf}#acl-ov .acl-st.acl-x{background:#1d2b3d;color:#9fb3c8}'
  +'#acl-ov .acl-up{color:#ff8a9a}#acl-ov .acl-dn{color:#ffc66b}#acl-ov .acl-ok{color:#5fd3b8}'
  +'#acl-ov .acl-nota{color:#8ca4bf;font-size:11.5px;margin-top:8px;line-height:1.5}'
  +'#acl-ov .acl-aviso{background:#2a1f08;border:1px solid #6b4d12;color:#ffd58a;border-radius:8px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.5}'
  +'#acl-ov .acl-vazio{color:#8ca4bf;padding:30px;text-align:center}'
  +'#acl-ov .acl-drop{border:2px dashed #2f5478;border-radius:10px;padding:22px;text-align:center;color:#8ca4bf;margin:8px 0}#acl-ov .acl-drop.acl-on{border-color:#14a386;color:#fff}'
  +'#acl-ov .acl-pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}'
  +'@media(max-width:700px){#acl-ov .acl-hd img{display:none}#acl-ov .acl-bd{padding:10px}}';

  // Painel para diretoria: cards com composição, gráficos, tabela única
  CSS+='#acl-ov .acl-faixa{background:#1b1608;border:1px solid #5b4510;color:#f5d38a;border-radius:8px;padding:7px 12px;font-size:12px;margin-bottom:12px}#acl-ov .acl-faixa a{color:#5fd3b8;cursor:pointer;font-weight:700;margin-left:6px;text-decoration:underline}'
  +'#acl-ov .acl-kpis2{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:2px 0 12px}'
  +'#acl-ov .acl-k{position:relative;background:linear-gradient(180deg,#0e1b2e,#0b1626);border:1px solid #1d3550;border-top:3px solid var(--c);border-radius:12px;padding:12px 14px 22px;cursor:pointer;transition:transform .12s,border-color .12s}'
  +'#acl-ov .acl-k:hover{transform:translateY(-2px);border-color:#2f5478}#acl-ov .acl-k.acl-k-on{border-color:var(--c);box-shadow:0 0 0 1px var(--c) inset}'
  +'#acl-ov .acl-k span{display:block;font-size:10.5px;color:#8ca4bf;font-weight:700;text-transform:uppercase;letter-spacing:.04em}'
  +'#acl-ov .acl-k b{display:block;font-size:22px;margin:4px 0 3px;color:#fff;white-space:nowrap}#acl-ov .acl-k b .acl-kv{display:inline;font-size:12px;color:#8ca4bf;font-weight:600}'
  +'#acl-ov .acl-k small{display:block;color:#9fb3c8;font-size:11.5px;line-height:1.35}#acl-ov .acl-k i{position:absolute;right:10px;bottom:5px;font-style:normal;font-size:10px;color:#5fd3b8;opacity:.75}'
  +'#acl-ov .acl-kpis-s .acl-k{cursor:default;padding-bottom:12px}#acl-ov .acl-kpis-s .acl-k:hover{transform:none}'
  +'#acl-ov .acl-det{background:#0b1626;border:1px solid #2f5478;border-radius:12px;padding:10px 12px;margin:-2px 0 14px}#acl-ov .acl-det-h{display:flex;justify-content:space-between;align-items:center;font-weight:800;color:#e8f0fa;margin-bottom:8px;font-size:13px}#acl-ov .acl-det-h a{color:#8ca4bf;cursor:pointer;font-weight:600;font-size:12px}'
  +'#acl-ov .acl-graf{display:grid!important;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}#acl-ov .acl-graf1{grid-template-columns:1.2fr 1fr}'
  +'#acl-ov .acl-box{background:#0b1626;border:1px solid #1d3550;border-radius:12px;padding:12px 14px;min-width:0}#acl-ov .acl-box h5{margin:0 0 8px;font-size:13px;color:#e8f0fa;font-weight:800}#acl-ov .acl-box h5 small{color:#8ca4bf;font-weight:500}'
  +'#acl-ov .acl-mini{margin-bottom:12px}'
  +'#acl-ov .acl-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#9fb3c8;margin-top:6px}#acl-ov .acl-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}'
  +'#acl-ov .acl-lista{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto}#acl-ov .acl-lista div{display:flex;flex-direction:column;border-bottom:1px solid #16293f;padding-bottom:5px}#acl-ov .acl-lista b{font-size:12.5px;color:#e8f0fa}#acl-ov .acl-lista span{font-size:11.5px;color:#ff9aa8}'
  +'#acl-ov tr.acl-loja1 td{border-top:2px solid #2f5478}#acl-ov .acl-chip{display:inline-block;padding:2px 9px;border-radius:12px;font-weight:800;font-size:12px}'
  +'#acl-ov .acl-mix{display:inline-flex!important;width:120px;height:8px;border-radius:4px;overflow:hidden;vertical-align:middle;background:#16293f}#acl-ov .acl-mix i{display:block;height:100%}#acl-ov td .acl-mix+small{display:block}'
  +'#acl-ov tbody tr[data-a]:hover td{background:#10223a}'
  +'@media(max-width:900px){#acl-ov .acl-graf,#acl-ov .acl-graf1{grid-template-columns:1fr}}';
  // Blindagem contra o CSS do Portal (botão com largura 100%, cabeçalho em coluna etc.): layout travado com !important.
  CSS+='#acl-ov{display:flex!important;flex-direction:column!important}'
  +'#acl-ov .acl-hd{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:center!important;position:static!important;width:auto!important;height:auto!important;min-height:0!important}'
  +'#acl-ov .acl-hd .acl-tt{display:block!important;position:static!important;width:auto!important;flex:1 1 260px!important;min-width:0!important}'
  +'#acl-ov .acl-hd .acl-tt b,#acl-ov .acl-hd .acl-tt small{white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}'
  +'#acl-ov .acl-acoes{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:8px!important;align-items:center!important;position:static!important;width:auto!important}'
  +'#acl-ov button{width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;position:static!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;margin:0!important;line-height:1.2!important;white-space:nowrap!important;float:none!important;transform:none!important}'
  +'#acl-ov .acl-tabs{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;position:static!important;width:auto!important}'
  +'#acl-ov .acl-flt{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;position:static!important}'
  +'#acl-ov .acl-flt>div{position:static!important;width:auto!important;flex:0 1 auto}'
  +'#acl-ov label{display:block!important;position:static!important;width:auto!important;float:none!important}'
  +'#acl-ov input,#acl-ov select{position:static!important;display:block!important;float:none!important;max-width:100%!important;height:auto!important;margin:0!important}'
  +'#acl-ov img{position:static!important;max-width:none!important;float:none!important}'
  +'#acl-ov table{display:table!important;width:100%!important;table-layout:auto!important}#acl-ov thead{display:table-header-group!important}#acl-ov tbody{display:table-row-group!important}#acl-ov tr{display:table-row!important}#acl-ov td{display:table-cell!important;position:static!important}#acl-ov th{display:table-cell!important}'
  +'#acl-ov .acl-kpi,#acl-ov .acl-cards,#acl-ov .acl-pgrid{display:grid!important}#acl-ov .acl-cd .acl-g{display:grid!important}'
  +'#acl-ov h3,#acl-ov h4{position:static!important;float:none!important;width:auto!important}'
  +'@media(max-width:700px){#acl-ov .acl-acoes{width:100%!important}#acl-ov .acl-acoes button{flex:1 1 auto}}';
  function logo(){return window.__ESPOSENDE_LOGO_B64||'';}
  // Voltar = tela inicial do Almoxarifado no Portal (não a página que estava aberta antes do menu).
  function voltarAlmox(){
    try{var bt=document.querySelector('[data-pg="alm"]');
      if(bt&&typeof window.go==='function')window.go('alm',bt);else if(bt)bt.click();
      var ifr=document.getElementById('ifr-alm'),w=ifr&&ifr.contentWindow;
      if(w&&w.document){var tab=[].slice.call(w.document.querySelectorAll('button,a,div[role=tab],li')).filter(function(x){return /^\W*Vis[aã]o Geral\s*$/i.test((x.textContent||'').trim());})[0];if(tab)tab.click();w.scrollTo(0,0);}
      window.scrollTo(0,0);}catch(e){}
  }
  function abrir(){
    var ov=document.getElementById('acl-ov');
    if(!document.getElementById('acl-css')){var st=document.createElement('style');st.id='acl-css';st.textContent=CSS;document.head.appendChild(st);}
    if(!ov){
      ov=document.createElement('div');ov.id='acl-ov';
      ov.innerHTML='<div class="acl-hd">'+(logo()?'<img src="data:image/jpeg;base64,'+logo()+'" alt="Esposende">':'')
        +'<div class="acl-tt"><b>🏬 Consumo Loja · Almoxarifado</b><small>Consumo x venda por loja · lojas fora do padrão · previsão e sugestão de compra</small></div>'
        +'<div class="acl-acoes"><button type="button" data-a="xls">⬇ Excel</button><button type="button" data-a="ger" class="acl-pri">🖨 Relatório Diretoria</button><button type="button" data-a="rec">↻ Atualizar</button><button type="button" data-a="fechar">← Voltar</button></div></div>'
        +'<div class="acl-tabs">'+[['painel','📊 Painel'],['comp','⚖️ Comparativo entre lojas'],['mensal','📅 Relatório mensal'],['prev','🔮 Previsão & compra'],['base','📥 Base de vendas']]
          .map(function(t){return '<button type="button" data-t="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'
        +'<div class="acl-flt" id="acl-flt"></div><div class="acl-bd" id="acl-bd"></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click',function(e){
        var b=e.target.closest('[data-a],[data-t]');if(!b||!ov.contains(b)||b.tagName==='LABEL')return;
        if(b.dataset.t){S.aba=b.dataset.t;render();return;}
        var a=b.dataset.a;
        if(a==='fechar'){ov.style.display='none';voltarAlmox();}
        else if(a==='rec'){S.carregado=false;carregar(true);}
        else if(a==='ger')relatorioGerencial();
        else if(a==='xls')exportarExcel(b);
        else if(a==='linha'){S.linha=b.dataset.l;S.aba='comp';render();}
        else if(a==='kpi'){S.kpi=S.kpi===b.dataset.k?null:b.dataset.k;render(true);}
        else if(a==='mod')baixarModelo(b.dataset.m);
        else if(a==='salvarP')salvarParametros(b);
        else if(a==='limpar')limparBase(b.dataset.m);
      });
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.style.display!=='none')ov.style.display='none';});
    }
    ov.style.display='flex';
    if(!S.carregado||S.aviso)carregar(true);else render();
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
    document.querySelectorAll('#acl-ov .acl-tabs button').forEach(function(b){b.classList.toggle('acl-on',b.dataset.t===S.aba);});
    if(S.carregando){bd.innerHTML='<div class="acl-vazio">Carregando consumo, estoque e base de vendas...'+(S.tentativa>1||S.motivo?'<br><small style="color:#f5d38a">Ainda não veio tudo ('+esc(S.motivo||'')+'). Tentando de novo sozinho — tentativa '+Math.min(S.tentativa+1,TENTATIVAS)+' de '+TENTATIVAS+'...</small>':'')+'</div>';return;}
    if(S.erro){bd.innerHTML='<div class="acl-vazio" style="color:#ff8a8a">Erro: '+esc(S.erro)+'<br><br><button type="button" data-a="rec">Tentar de novo</button></div>';return;}
    if(!S.carregado){bd.innerHTML='';return;}
    S._M=modelo();S.ultimo=tudo();
    if(!soCorpo)filtros();
    var f={painel:vPainel,comp:vComp,mensal:vMensal,prev:vPrev,base:vBase}[S.aba];
    bd.innerHTML=(S.aviso?'<div class="acl-faixa" style="border-color:#7f1d1d;background:#1f0a0a;color:#fca5a5">'+esc(S.aviso)+' <a data-a="rec">Recarregar</a></div>':'')+f(S.ultimo);
    if(S.aba==='base')ligarBase();
  }
  function avisoBase(R){
    var temV=S.base.vendas.length,temR=S.base.remanejo.length,a=[];
    if(!temV)a.push('<b>Falta a base de vendas</b> (pares PA e quantidade de NFS por loja e mês). Sem ela, sacolas, embalagens, agrado e bobina ficam só com média de consumo e não dá para apontar loja fora do padrão.');
    return a.length?'<div class="acl-aviso">⚠ '+a.join('<br>⚠ ')+'<br>Carregue na aba <b>📥 Base de vendas</b>.</div>':'';
  }
  function stTag(s){var cls=/ACIMA|ABAIXO|OK/.test(s)?s:(s==='SEM PEDIDO'?'SEM PEDIDO':'x');var t={ACIMA:'▲ ACIMA DO PADRÃO',ABAIXO:'▼ ABAIXO DO PADRÃO','SEM PEDIDO':'▼ VENDE E NÃO PEDE',OK:'● NO PADRÃO'}[s]||s;return '<span class="acl-st acl-'+cls.replace(/ /g,'-')+'">'+t+'</span>';}
  function fmtTaxa(L,t){if(t==null)return '—';if(L.fator)return n2(t*L.fator)+' etiq./par';if(L.pct)return n1(t*100)+'% das vendas';if(L.porUn)return t>0?n1(1/t)+' '+(L.id==='sac'?'PA/sac.':'por un.'):'—';return n1(t*1000)+' /mil';}

  // ================== Gráficos (SVG puro, funcionam na tela e na impressão) ==================
  var TEMA_ESCURO={txt:'#cfe0f2',sub:'#8ca4bf',grid:'#1d3550',fundo:'transparent'};
  var TEMA_CLARO={txt:'#1b2533',sub:'#5b6b80',grid:'#e1e7ef',fundo:'transparent'};
  function abrev(v){v=Number(v||0);var a=Math.abs(v);if(a>=1e6)return n1(v/1e6).replace(',0','')+' mi';if(a>=1e3)return n0(v/1e3)+' mil';return n0(v);}
  // Colunas empilhadas: meses x séries
  function svgColunas(rot,series,o){
    o=o||{};var T=o.tema||TEMA_ESCURO,W=o.w||900,H=o.h||250,pl=58,pb=26,pt=14,pr=8,n=rot.length;if(!n)return '';
    var tot=rot.map(function(_,i){return series.reduce(function(s,se){return s+(se.vals[i]||0);},0);});
    var mx=Math.max.apply(null,tot.concat([1]));var passo=Math.pow(10,Math.floor(Math.log10(mx)));var top=Math.ceil(mx/passo)*passo;if(top/passo<=2)top=Math.ceil(mx/(passo/2))*(passo/2);
    var cw=(W-pl-pr)/n,bw=Math.min(38,cw*0.62),y=function(v){return pt+(H-pt-pb)*(1-v/top);};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%">';
    for(var k=0;k<=4;k++){var v=top*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+T.grid+'" stroke-width="1"/><text x="'+(pl-6)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9.5" fill="'+T.sub+'">'+(o.fmt?o.fmt(v):abrev(v))+'</text>';}
    rot.forEach(function(r,i){var x=pl+cw*i+(cw-bw)/2,acc=0;
      series.forEach(function(se){var v=se.vals[i]||0;if(v<=0)return;var y1=y(acc+v),y0=y(acc);g+='<rect x="'+x+'" y="'+y1+'" width="'+bw+'" height="'+Math.max(0,y0-y1)+'" fill="'+se.cor+'" rx="2"><title>'+esc(r+' · '+se.nome+': '+(o.fmt?o.fmt(v):n0(v)))+'</title></rect>';acc+=v;});
      if(o.rotTot)g+='<text x="'+(x+bw/2)+'" y="'+(y(acc)-4)+'" text-anchor="middle" font-size="9" fill="'+T.txt+'">'+abrev(acc)+'</text>';
      g+='<text x="'+(x+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="'+T.sub+'">'+esc(r)+'</text>';});
    if(o.linha!=null){var yl=y(o.linha);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yl+'" y2="'+yl+'" stroke="#f59e0b" stroke-dasharray="5 4" stroke-width="1.5"/>';}
    return g+'</svg>';
  }
  // Barras horizontais
  function svgBarras(rows,o){
    o=o||{};var T=o.tema||TEMA_ESCURO,W=o.w||900,lh=o.lh||26,pr=90,pl=Math.min(o.pl||300,14+rows.reduce(function(m,r){return Math.max(m,String(r.label).length);},0)*6.6),H=rows.length*lh+(o.marcas?22:8);if(!rows.length)return '';
    var mx=o.max||Math.max.apply(null,rows.map(function(r){return r.val;}).concat([1])),x=function(v){return pl+(W-pl-pr)*Math.min(v,mx)/mx;};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%">';
    (o.marcas||[]).forEach(function(m){var xx=x(m);g+='<line x1="'+xx+'" x2="'+xx+'" y1="2" y2="'+(H-18)+'" stroke="'+T.grid+'" stroke-dasharray="3 3"/><text x="'+xx+'" y="'+(H-5)+'" text-anchor="middle" font-size="9.5" fill="'+T.sub+'">'+m+(o.sufMarca||'')+'</text>';});
    rows.forEach(function(r,i){var yy=i*lh+4,bh=lh-9;
      g+='<text x="'+(pl-8)+'" y="'+(yy+bh/2+4)+'" text-anchor="end" font-size="10.5" fill="'+T.txt+'">'+esc(String(r.label).slice(0,42))+'</text>'
        +'<rect x="'+pl+'" y="'+yy+'" width="'+Math.max(2,x(r.val)-pl)+'" height="'+bh+'" rx="3" fill="'+r.cor+'"><title>'+esc(r.label+': '+(r.txt||n0(r.val)))+'</title></rect>'
        +'<text x="'+(Math.max(pl+4,x(r.val))+6)+'" y="'+(yy+bh/2+4)+'" font-size="10.5" font-weight="700" fill="'+T.txt+'">'+esc(r.txt||n0(r.val))+'</text>';});
    return g+'</svg>';
  }
  function spark(vals,cor,w,h){
    w=w||110;h=h||26;if(!vals.length)return '';var mx=Math.max.apply(null,vals.concat([1])),st=vals.length>1?w/(vals.length-1):w;
    var pts=vals.map(function(v,i){return (i*st).toFixed(1)+','+(h-2-(h-4)*v/mx).toFixed(1);}).join(' ');
    return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="display:inline-block;vertical-align:middle"><polyline points="'+pts+'" fill="none" stroke="'+cor+'" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  function corCob(c){return c==null?'#64748b':c<1?'#e11d48':c<2?'#f59e0b':'#10b981';}
  // Consumo (barras) x esperado (linha) por mês.
  function svgConsEsp(rot,cons,esp,o){
    o=o||{};var T=o.tema||TEMA_ESCURO,W=o.w||900,H=o.h||250,pl=58,pb=26,pt=16,pr=8,n=rot.length;if(!n)return '';
    var fmt=o.fmt||abrev,mx=Math.max.apply(null,cons.concat(esp).concat([1]));var passo=Math.pow(10,Math.floor(Math.log10(mx)));var top=Math.ceil(mx/passo)*passo;if(top/passo<=2)top=Math.ceil(mx/(passo/2))*(passo/2);
    var cw=(W-pl-pr)/n,bw=Math.min(38,cw*0.55),y=function(v){return pt+(H-pt-pb)*(1-v/top);};
    var g='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%">';
    for(var k=0;k<=4;k++){var v=top*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+T.grid+'" stroke-width="1"/><text x="'+(pl-6)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9.5" fill="'+T.sub+'">'+fmt(v)+'</text>';}
    var pts=[];
    rot.forEach(function(r,i){var x=pl+cw*i+(cw-bw)/2,c=cons[i]||0,e=esp[i]||0,acima=e>0&&c>e*1.0001;
      g+='<rect x="'+x+'" y="'+y(c)+'" width="'+bw+'" height="'+Math.max(0,y(0)-y(c))+'" fill="'+(acima?(o.corAcima||'#e11d48'):(o.corCons||'#14284a'))+'" rx="2"><title>'+esc(r+' · consumo '+fmt(c)+' · esperado '+fmt(e))+'</title></rect>'
        +'<text x="'+(x+bw/2)+'" y="'+(y(Math.max(c,e))-5)+'" text-anchor="middle" font-size="9" fill="'+T.txt+'">'+fmt(c)+'</text>'
        +'<text x="'+(x+bw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="'+T.sub+'">'+esc(r)+'</text>';
      pts.push((x+bw/2).toFixed(1)+','+y(e).toFixed(1));});
    g+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linejoin="round"/>';
    pts.forEach(function(p,i){var xy=p.split(',');g+='<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3.2" fill="#f59e0b"><title>'+esc(rot[i]+' · esperado '+fmt(esp[i]||0))+'</title></circle>';});
    return g+'</svg>';
  }
  // Esperado por item e mês (meses fechados):
  //  item com motor = venda/NFS/remanejo do mês × padrão da rede (café: parte fixa + faturamento);
  //  loja sem motor, CD e loja nova entram com o próprio consumo; itens de média mensal = média do período.
  //  Item = esperado da linha × participação do item (sacola pela baliza P/M/G).
  function esperadoPorItem(R){
    var M=R.M,out={};
    R.linhas.forEach(function(x){var L=x.L,C=x.C,cl=M.cons[L.id]||{},lin={},porLoja={};
      M.fechados.forEach(function(m){lin[m]=0;});
      C.linhas.forEach(function(r){porLoja[r.cod]=r;});
      if(!C.dk){var t=0;Object.keys(cl).forEach(function(lj){M.fechados.forEach(function(m){if(cl[lj][m])t+=cl[lj][m].q;});});
        var med=M.fechados.length?t/M.fechados.length:0;M.fechados.forEach(function(m){lin[m]=med;});}
      else Object.keys(M.lojas).forEach(function(lj){var r=porLoja[lj],c=cl[lj]||{},dm=M.drv[C.dk][lj]||{},vl=(M.drv.valor||{})[lj]||{};
        M.fechados.forEach(function(m){var real=c[m]?c[m].q:0,e=real;
          if(C.modelo&&r&&r.espFixo!=null){if(dm[m]!=null)e=C.modelo.A+C.modelo.B*((vl[m]||0)/1000);}
          else if(C.padrao!=null&&r&&!r.cd&&r.status!=='LOJA NOVA'&&dm[m]!=null)e=dm[m]*C.padrao;
          lin[m]+=e;});});
      x.F.itens.forEach(function(i){var o={};M.fechados.forEach(function(m){o[m]=lin[m]*i.share;});out[i.cod]=o;});
    });
    return out;
  }
  // Bloco do gráfico com seletor de item (Todos os itens em R$; um item em quantidade).
  function blocoConsEsp(R,I,tema,uid,w,h){
    var M=R.M,E=esperadoPorItem(R),ms=M.fechados,rot=ms.map(mesLabel),ops=[],svgs=[];
    var tc=ms.map(function(m){return I.itens.reduce(function(s,r){return s+(r.mq[m]||0)*r.custo;},0);}),
        te=ms.map(function(m){return I.itens.reduce(function(s,r){return s+((E[r.cod]||{})[m]||0)*r.custo;},0);});
    function resumo(c,e,f){var sc=c.reduce(function(a,b){return a+b;},0),se=e.reduce(function(a,b){return a+b;},0),d=se?sc/se-1:0;
      return '<div style="font-size:11px;margin-top:4px;color:'+tema.sub+'">Consumo <b style="color:'+tema.txt+'">'+f(sc)+'</b> · esperado <b style="color:'+tema.txt+'">'+f(se)+'</b> · <b style="color:'+(d>0.0001?'#e11d48':'#0e7c66')+'">'+(d>0?'+':'')+n0(d*100)+'%</b></div>';}
    var fR=function(v){return 'R$ '+abrev(v);};
    ops.push('Todos os itens (R$)');svgs.push(svgConsEsp(rot,tc,te,{tema:tema,w:w,h:h,fmt:fR})+resumo(tc,te,brl));
    I.itens.slice().sort(function(a,b){return b.tv-a.tv;}).forEach(function(r){var c=ms.map(function(m){return r.mq[m]||0;}),e=ms.map(function(m){return (E[r.cod]||{})[m]||0;});
      ops.push(nomeItem(r.nome,r.cod));svgs.push(svgConsEsp(rot,c,e,{tema:tema,w:w,h:h})+resumo(c,e,n0));});
    var sel='<select data-acl-ce="'+uid+'" onchange="var b=this.parentNode.parentNode.querySelectorAll(\'[data-ce-'+uid+']\');for(var i=0;i<b.length;i++)b[i].style.display=(String(i)===this.value)?\'\':\'none\';" style="font-size:12px;padding:3px 6px;border-radius:6px;border:1px solid '+tema.grid+';background:transparent;color:inherit;max-width:100%">'
      +ops.map(function(o,i){return '<option value="'+i+'" style="color:#1b2533">'+esc(o)+'</option>';}).join('')+'</select>';
    return {sel:sel,corpo:svgs.map(function(g,i){return '<div data-ce-'+uid+(i?' style="display:none"':'')+'>'+g+'</div>';}).join(''),
      leg:'<span><i style="background:#14284a"></i>Consumo</span><span><i style="background:#e11d48"></i>Consumo acima do esperado</span><span><i style="background:#f59e0b;height:3px;vertical-align:3px"></i>Esperado</span>'};
  }
  // Nome do item só com o essencial (sem embalagem/unidade entre parênteses).
  function nomeItem(n,cod){return nomeCurto(n,cod).replace(/\s*\([^)]*\)\s*/g,' ').trim();}

  // ================== Indicadores (com a composição de cada número) ==================
  function indicadores(R){
    var M=R.M,I={itens:[],grupos:{},mesV:{},mesG:{},consV:0,prev:{},prevTot:0,compra:0,estV:0,urg:[],lojas:{},lojasAval:{},exc:0};
    M.meses.forEach(function(m){I.mesV[m]=0;I.mesG[m]={};});
    R.linhas.forEach(function(x){var L=x.L;
      x.F.itens.forEach(function(i){var it=M.itens[i.cod]||{meses:{}},mq={},mv={},tq=0,tv=0,qf=0;
        M.meses.forEach(function(m){var o=it.meses[m];mq[m]=o?o.q:0;mv[m]=o?o.v:0;tq+=mq[m];tv+=mv[m];if(m<M.atual)qf+=mq[m];
          I.mesV[m]+=mv[m];I.mesG[m][L.grupo]=(I.mesG[m][L.grupo]||0)+mv[m];});
        I.consV+=tv;I.grupos[L.grupo]=(I.grupos[L.grupo]||0)+tv;
        var p3=0;x.F.mCob.forEach(function(m){p3+=(i.pm[m]||0)*i.custo;I.prev[m]=(I.prev[m]||0)+(i.pm[m]||0)*i.custo;});I.prevTot+=p3;
        I.compra+=i.sugV;I.estV+=i.saldo*i.custo;
        var row={cod:i.cod,nome:i.nome,L:L,fator:L.fator||0,estoque:i.saldo,custo:i.custo,media:M.fechados.length?qf/M.fechados.length:0,mq:mq,tq:tq,tv:tv,prev3:x.F.mCob.reduce(function(s,m){return s+(i.pm[m]||0);},0),segQ:i.segQ||0,segMeses:i.segMeses||0,cob:i.cobAtual,sug:i.sug,sugV:i.sugV,acima:x.C.acima,abaixo:x.C.abaixo};
        I.itens.push(row);if(row.cob!=null&&row.cob<1)I.urg.push(row);});
      x.C.linhas.forEach(function(r){
        if(['ACIMA','ABAIXO','SEM PEDIDO','OK'].indexOf(r.status)>=0)I.lojasAval[r.cod]=1;
        if(r.status!=='ACIMA'&&r.status!=='ABAIXO'&&r.status!=='SEM PEDIDO')return;
        var o=I.lojas[r.cod]=I.lojas[r.cod]||(function(){var pa=0,dp=M.drv.pares[r.cod]||{};M.fechados.forEach(function(m){pa+=dp[m]||0;});
          return {cod:r.cod,nome:r.nome,reg:r.reg,pa:pa,acima:[],abaixo:[],exc:0,falta:0,det:[]};})();
        o.det.push({item:L.nome.replace(/ \(agrado\)/,''),un:({sac:'un',emb:'un',bob:'un',fit:'rolos',etq:'rolos',caf:'pct',pir:'pct',bal:'pct',a4:'resmas',str:'un',trv:'pct',alf:'kg',sup:'cx'})[L.id]||'un',pediu:r.consBase,vend:r.drv||0,vu:x.C.dk?DRV_CURTO[x.C.dk]:'',esperado:r.esperado||0,dif:r.dif||0,difV:r.difV||0,desvio:r.desvio,status:r.status});
        if(r.difV<0)o.falta+=-r.difV;
        if(r.status==='ACIMA'){o.acima.push(L.nome.replace(/ \(agrado\)/,''));o.exc+=Math.max(0,r.difV||0);I.exc+=Math.max(0,r.difV||0);}else o.abaixo.push(L.nome.replace(/ \(agrado\)/,''));});});
    I.itens.sort(function(a,b){return (a.cob==null?99:a.cob)-(b.cob==null?99:b.cob);});
    I.lojasL=Object.keys(I.lojas).map(function(k){return I.lojas[k];});
    I.pa=0;Object.keys(M.drv.pares).forEach(function(lj){if(ehCD(lj))return;M.fechados.forEach(function(m){I.pa+=M.drv.pares[lj][m]||0;});});
    I.nAcima=I.lojasL.filter(function(o){return o.acima.length;}).length;I.nAbaixo=I.lojasL.filter(function(o){return !o.acima.length&&o.abaixo.length;}).length;
    I.nAval=Object.keys(I.lojasAval).length;
    I.porItemAcima=R.linhas.map(function(x){return {n:x.L.nome.replace(/ \(agrado\)/,''),v:x.C.acima};}).filter(function(o){return o.v;}).sort(function(a,b){return b.v-a.v;});
    return I;
  }
  function top3(obj,tot){return Object.keys(obj).map(function(k){return {k:k,v:obj[k]};}).sort(function(a,b){return b.v-a.v;}).slice(0,3).map(function(o){return esc(o.k)+' '+n0(tot?o.v/tot*100:0)+'%';}).join(' · ');}

  function vPainel(R){
    var M=R.M,I=indicadores(R),P=M.P,fut=R.linhas[0].F.mCob;
    var aviso=!S.base.vendas.length?'<div class="acl-faixa">⚠ Sem base de vendas: a comparação entre lojas fica desligada. <a data-t="base">Carregar base</a></div>':'';
    var kp=[
      {k:'cons',cor:'#14a386',t:'Consumo no período',v:brl(I.consV),s:(I.pa?'<b>'+n0(I.pa)+' pares vendidos</b> no período · ':'')+top3(I.grupos,I.consV)},
      {k:'est',cor:'#38bdf8',t:'Estoque atual (CD + AX)',v:brl(I.estV),s:I.itens.length+' itens · '+I.urg.length+' acabam em menos de 1 mês'},
      {k:'prev',cor:'#7c3aed',t:'Consumo previsto · '+fut.map(mesLabel).join(' + '),v:brl(I.prevTot),s:fut.map(function(m){return mesLabel(m).slice(0,3)+' '+abrev(I.prev[m]);}).join(' · ')},
      {k:'compra',cor:'#f59e0b',t:'Comprar agora',v:brl(I.compra),s:I.urg.length?'Urgente: '+I.urg.slice(0,3).map(function(r){return esc(nomeCurto(r.nome,r.cod));}).join(', ')+(I.urg.length>3?' +'+(I.urg.length-3):''):'Nenhum item crítico'},
      {k:'lojas',cor:'#e11d48',t:'Lojas fora do padrão',v:I.nAcima+' <small class="acl-kv">acima</small> · '+I.nAbaixo+' <small class="acl-kv">abaixo</small>',s:'de '+I.nAval+' lojas avaliadas · '+I.porItemAcima.slice(0,2).map(function(o){return esc(o.n)+' ('+o.v+')';}).join(', ')},
      {k:'exc',cor:'#be123c',t:'Consumo acima do esperado',v:brl(I.exc),s:I.lojasL.slice().sort(function(a,b){return b.exc-a.exc;}).slice(0,2).map(function(o){return esc(o.nome.replace(/^\d+ - /,''))+' R$ '+abrev(o.exc);}).join(' · ')}
    ];
    var h=aviso+'<div class="acl-kpis2">'+kp.map(function(c){return '<div class="acl-k'+(S.kpi===c.k?' acl-k-on':'')+'" data-a="kpi" data-k="'+c.k+'" style="--c:'+c.cor+'" title="Clique para ver de onde vem este número"><span>'+c.t+'</span><b>'+c.v+'</b><small>'+c.s+'</small><i>detalhar ▾</i></div>';}).join('')+'</div>';
    if(S.kpi)h+=detalheKpi(S.kpi,I,R);
    // Gráficos
    var GR=['Venda','Agrado','NFS','Remanejo','Média mensal'];
    var serie=GR.map(function(g){return {nome:g,cor:GRUPO_COR_G[g],vals:M.meses.map(function(m){return I.mesG[m][g]||0;})};});
    var cobRows=I.itens.filter(function(r){return r.cob!=null;}).slice(0,14).map(function(r){return {label:nomeCurto(r.nome,r.cod),val:Math.min(r.cob,6),cor:corCob(r.cob),txt:(r.cob>=6?'6+':n1(r.cob))+' m'};});
    var top=I.lojasL.filter(function(o){return o.exc>0;}).sort(function(a,b){return b.exc-a.exc;}).slice(0,10).map(function(o){return {label:o.nome,val:o.exc,cor:'#e11d48',txt:brl(o.exc).replace('R$ ','R$ ')};});
    h+='<div class="acl-graf">'
      +(function(){var b=blocoConsEsp(R,I,TEMA_ESCURO,'p',900,250);return '<div class="acl-box"><h5 style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">Consumo x esperado por mês '+b.sel+'</h5>'+b.corpo
        +'<div class="acl-leg">'+b.leg.replace('#14284a','#38bdf8')+'</div></div>';})()
      +'<div class="acl-box"><h5>Cobertura do estoque (meses) — itens mais críticos</h5>'+svgBarras(cobRows,{max:6,marcas:[1,2,3,6],sufMarca:' m',pl:170})+'</div>'
      +'</div>';
    if(top.length)h+='<div class="acl-graf acl-graf1"><div class="acl-box"><h5>Lojas com maior consumo acima do esperado (R$)</h5>'+svgBarras(top,{pl:230})+'</div>'
      +'<div class="acl-box"><h5>O que cada loja exagera</h5><div class="acl-lista">'+I.lojasL.filter(function(o){return o.exc>0;}).sort(function(a,b){return b.exc-a.exc;}).slice(0,10).map(function(o){return '<div><b>'+esc(o.nome)+(o.pa?' <small style="color:#9fb3c8;font-weight:400">· '+n0(o.pa)+' pares vendidos</small>':'')+' <em class="acl-up" style="font-style:normal;float:right">'+brl(o.exc)+'</em></b><span>'+o.det.filter(function(d){return d.status==='ACIMA';}).sort(function(a,b){return b.difV-a.difV;}).map(function(d){return esc(d.item)+' ▲ +'+n0(d.dif)+' ('+pct(d.desvio)+')';}).join(' · ')+'</span></div>';}).join('')+'</div></div></div>';
    // Tabela única de itens
    h+='<h3>Estoque e consumo por item</h3><div class="acl-tw" style="max-height:none"><table><thead><tr><th>Item</th><th>Estoque</th><th>Consumo médio/mês</th><th>Tendência '+(M.meses.length?mesLabel(M.meses[0]).slice(0,3)+'–'+mesLabel(M.fechados[M.fechados.length-1]||M.meses[0]).slice(0,3):'')+'</th><th>Cobertura</th><th>Previsão 3 meses</th><th>Comprar</th><th>Valor</th><th>Lojas ▲ / ▼</th></tr></thead><tbody>'
      +I.itens.map(function(r){return '<tr data-a="linha" data-l="'+r.L.id+'" style="cursor:pointer"><td class="acl-l"><b>'+esc(nomeCurto(r.nome,r.cod))+'</b><small>'+r.cod+' · '+esc(r.L.grupo)+'</small></td><td>'+n0(r.estoque)+(r.fator?'<small>'+abrev(r.estoque*r.fator)+' etiq.</small>':'')+'</td><td>'+n0(r.media)+(r.fator?'<small>'+abrev(r.media*r.fator)+' etiq.</small>':'')+'</td><td>'+spark(M.fechados.map(function(m){return r.mq[m]||0;}),GRUPO_COR_G[r.L.grupo])+'</td>'
        +'<td><span class="acl-chip" style="background:'+corCob(r.cob)+'22;color:'+corCob(r.cob)+'">'+(r.cob==null?'—':(r.cob>=12?'12+':n1(r.cob))+' m')+'</span></td><td>'+n0(r.prev3)+'</td><td><b>'+(r.sug?n0(r.sug):'—')+'</b></td><td>'+(r.sug?brl(r.sugV):'—')+'</td>'
        +'<td>'+(r.acima||r.abaixo?'<span class="acl-up">▲ '+r.acima+'</span> · <span class="acl-dn">▼ '+r.abaixo+'</span>':'—')+'</td></tr>';}).join('')
      +'<tr class="acl-tot"><td>TOTAL</td><td>'+brl(I.estV)+'</td><td></td><td></td><td></td><td>'+brl(I.prevTot)+'</td><td></td><td>'+brl(I.compra)+'</td><td></td></tr></tbody></table></div>'
      +'<div class="acl-nota">Clique num item para ver as lojas. * mês em andamento.</div>';
    return h;
  }
  var NOME_CURTO={'7894':'Sacola M 50x60','8209':'Sacola G 60x70','9516':'Sacola P 35x55','11094':'Sacola antiga 25x35','21604':'Sacola ES Sports (papel)',
    '11314':'Embalagem presente P','11315':'Embalagem presente M','11316':'Embalagem presente G','8002':'Bobina PDV Esposende','22203':'Bobina PDV ES Sports',
    '26104':'Bobina PDV 79mm','26153':'Bobina PDV 79mm','19388':'Café Petinho','15538':'Pirulito','10546':'Balão nº7','17314':'Balão nº7',
    '7816':'Fita PP 45mm','7982':'Etiqueta 70x24 (rolo)','15483':'Etiqueta 70x24 (adesiva)','7981':'Papel A4 (resma)','14580':'Filme stretch',
    '8014':'Trava anel 125 (pct c/1000)','9474':'Alfinete aço nº32 (kg)','9727':'Suporte etiqueta aro duplo (cx 100)','9728':'Suporte etiqueta aro simples (cx 100)'};
  function nomeCurto(n,cod){if(cod!=null&&NOME_CURTO[String(cod)])return NOME_CURTO[String(cod)];return String(n||'').replace(/ESPOSENDE /,'').replace(/ - ESPOSENDE CALÇADOS/,'').replace(/SAO ROQUE /,'').replace(/ ROLO C\/630 ETIQUETAS/,'').replace(/ C\/50 AZ COBALTO/,'').replace(/ALLTAPE TR /,'').replace(/ SK270/,'').replace(/\s+/g,' ').trim();}
  var GRUPO_COR_G={Venda:'#10b981',Agrado:'#f59e0b',NFS:'#38bdf8',Remanejo:'#a78bfa','Média mensal':'#64748b'};
  function detalheKpi(k,I,R){
    var M=R.M,h='<div class="acl-det"><div class="acl-det-h">',corpo='';
    if(k==='cons'){h+='Consumo no período por grupo e item';corpo='<table><thead><tr><th>Item</th><th>Grupo</th><th>Quantidade</th><th>R$</th><th>% do total</th></tr></thead><tbody>'+I.itens.slice().sort(function(a,b){return b.tv-a.tv;}).map(function(r){return '<tr><td class="acl-l">'+esc(nomeCurto(r.nome,r.cod))+'</td><td>'+esc(r.L.grupo)+'</td><td>'+n0(r.tq)+'</td><td>'+brl(r.tv)+'</td><td>'+n1(I.consV?r.tv/I.consV*100:0)+'%</td></tr>';}).join('')+'</tbody></table>';}
    else if(k==='est'){h+='Estoque atual por item (001 CD + AX) e quanto tempo dura';corpo='<table><thead><tr><th>Item</th><th>Estoque</th><th>Valor</th><th>Consumo médio/mês</th><th>Dura</th></tr></thead><tbody>'+I.itens.map(function(r){return '<tr><td class="acl-l">'+esc(nomeCurto(r.nome,r.cod))+'</td><td>'+n0(r.estoque)+'</td><td>'+brl(r.estoque*r.custo)+'</td><td>'+n0(r.media)+'</td><td style="color:'+corCob(r.cob)+'">'+(r.cob==null?'—':n1(r.cob)+' m')+'</td></tr>';}).join('')+'</tbody></table>';}
    else if(k==='prev'){var fut=R.linhas[0].F.mCob;h+='Consumo previsto por mês (média do ano + '+n0(M.P.crescimento)+'% · dezembro ×'+n2(M.P.fatorDez)+')';corpo='<table><thead><tr><th>Item</th>'+fut.map(function(m){return '<th>'+mesLabel(m)+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>'+R.linhas.map(function(x){return x.F.itens.map(function(i){var t=0;return '<tr><td class="acl-l">'+esc(nomeCurto(i.nome,i.cod))+'</td>'+fut.map(function(m){t+=i.pm[m]||0;return '<td>'+n0(i.pm[m])+'</td>';}).join('')+'<td><b>'+n0(t)+'</b></td></tr>';}).join('');}).join('')+'</tbody></table>';}
    else if(k==='compra'){h+='O que comprar e por quê';corpo='<table><thead><tr><th>Item</th><th>Estoque</th><th>Dura</th><th>Precisa (3 meses)</th><th>Segurança</th><th>Comprar</th><th>Valor</th></tr></thead><tbody>'+I.itens.filter(function(r){return r.sug;}).map(function(r){return '<tr><td class="acl-l">'+esc(nomeCurto(r.nome,r.cod))+'</td><td>'+n0(r.estoque)+'</td><td style="color:'+corCob(r.cob)+'">'+(r.cob==null?'—':n1(r.cob)+' m')+'</td><td>'+n0(r.prev3)+'</td><td>'+(r.segQ?n0(r.segQ)+' ('+n0(r.segMeses)+' m)':'—')+'</td><td><b>'+n0(r.sug)+'</b></td><td>'+brl(r.sugV)+'</td></tr>';}).join('')+'</tbody></table>';}
    else if(k==='lojas'||k==='exc'){h+=(k==='lojas'?'Lojas fora do padrão: cada loja e em quais itens':'Consumo acima do esperado por loja');
      // uma linha por loja x item: quanto pediu, quanto era esperado e a diferença (▲ a mais / ▼ a menos)
      corpo='<table><thead><tr><th>Loja</th><th>Regional</th><th>Item</th><th>Vendeu</th><th>Pediu</th><th>Esperado</th><th>Diferença</th><th>Desvio</th><th>Diferença R$</th></tr></thead><tbody>'
        +I.lojasL.slice().sort(function(a,b){return b.exc-a.exc||b.acima.length-a.acima.length;}).map(function(o){
          var ds=o.det.slice().sort(function(a,b){return b.difV-a.difV;});
          return ds.map(function(d,ix){var up=d.dif>0;return '<tr'+(ix===0?' class="acl-loja1"':'')+'><td class="acl-l">'+(ix===0?'<b>'+esc(o.nome)+'</b>'+(o.pa?'<small>'+n0(o.pa)+' pares vendidos no período</small>':''):'')+'</td><td>'+(ix===0?esc(o.reg):'')+'</td><td class="acl-l">'+esc(d.item)+'</td>'
            +'<td>'+(d.vend?n0(d.vend)+' <small style="display:inline">'+esc(d.vu)+'</small>':'—')+'</td>'
            +'<td><b>'+n0(d.pediu)+'</b></td><td>'+n0(d.esperado)+'</td>'
            +'<td class="'+(up?'acl-up':'acl-dn')+'"><b>'+(up?'▲ +':'▼ ')+n0(d.dif)+'</b> '+d.un+'</td><td class="'+(up?'acl-up':'acl-dn')+'">'+(d.desvio!=null?pct(d.desvio):'—')+'</td>'
            +'<td class="'+(up?'acl-up':'acl-dn')+'">'+brl(d.difV)+'</td></tr>';}).join('')
            +(ds.length>1?'<tr class="acl-sub"><td></td><td></td><td class="acl-l">Total da loja</td><td></td><td></td><td></td><td></td><td></td><td>'+(o.exc?'<span class="acl-up">▲ '+brl(o.exc)+'</span>':'')+(o.falta?' <span class="acl-dn">▼ '+brl(o.falta)+'</span>':'')+'</td></tr>':'');
        }).join('')+'</tbody></table><div class="acl-nota" style="margin:6px 0 0">Vendeu = pares (PA) ou vendas (NFS = PA ÷ 1,5) da loja no período, que é a base do esperado. Pediu = quantidade atendida pelo almoxarifado nos meses com venda. Esperado = venda da loja × padrão da rede. ▲ pediu a mais · ▼ pediu a menos.</div>';}
    return h+'<a data-a="kpi" data-k="'+k+'">fechar ✕</a></div><div class="acl-tw" style="max-height:'+(k==='lojas'||k==='exc'?'520':'340')+'px">'+corpo+'</div></div>';
  }

  // ================== Comparativo entre lojas (enxuto) ==================
  function vComp(R){
    var x=R.linhas.find(function(l){return l.L.id===S.linha;}),L=x.L,C=x.C,M=R.M;
    var rows=C.linhas.filter(bateLoja),dc=C.dk?DRV_CURTO[C.dk]:'';
    var mix=L.id==='sac'?mixPorLoja(M):null;
    var h=(!C.dk?'<div class="acl-faixa">'+(!S.base.vendas.length?'A base de vendas não está carregada, por isso não dá para comparar as lojas. <a data-a="rec">Recarregar</a>':'Este item ainda não tem base para comparar lojas (vendas ou remanejo). Abaixo, só o consumo.')+'</div>':'');
    h+='<div class="acl-kpis2 acl-kpis-s">'
      +(C.modelo?'<div class="acl-k" style="--c:#38bdf8"><span>Esperado por loja</span><b style="font-size:17px">'+n1(C.modelo.A)+' pac./mês + 1 a cada R$ '+n1(1/C.modelo.B)+' mil faturados</b><small>calculado nas '+C.modelo.base+' lojas dentro do padrão</small></div>'
        :'<div class="acl-k" style="--c:#38bdf8"><span>Padrão da rede</span><b>'+(C.padrao!=null?fmtTaxa(L,C.padrao):'—')+'</b><small>'+(C.dk?'base: '+DRV_NOME[C.dk]:'sem base')+'</small></div>')
      +'<div class="acl-k" style="--c:#e11d48"><span>Lojas acima do padrão</span><b>'+C.acima+'</b><small>excesso '+brl(C.excesso)+'</small></div>'
      +'<div class="acl-k" style="--c:#f59e0b"><span>Lojas abaixo / sem pedido</span><b>'+C.abaixo+'</b><small>usam menos que o padrão</small></div>'
      +(mix?'<div class="acl-k" style="--c:#a78bfa"><span>Sacola P · M · G (rede)</span><b>'+n0(mix.rede.P*100)+' · '+n0(mix.rede.M*100)+' · '+n0(mix.rede.G*100)+'%</b><small>baliza '+n0(mix.b.P*100)+' · '+n0(mix.b.M*100)+' · '+n0(mix.b.G*100)+'%</small></div>':'')
      +'</div>';
    // gráfico compacto: índice da rede mês a mês
    if(C.dk){var cl=M.cons[L.id]||{},dm=M.drv[C.dk],ms=M.meses.filter(function(m){return m<M.atual;}),vals=[],rot=[];
      ms.forEach(function(m){var d=0,q=0;Object.keys(dm).forEach(function(lj){if(ehCD(lj)||dm[lj][m]==null)return;d+=dm[lj][m];if(cl[lj]&&cl[lj][m])q+=cl[lj][m].q;});if(!d)return;rot.push(mesLabel(m));vals.push(L.porUn?(q?d/q:0):(L.pct?q/d*100:q/d*1000));});
      var pad=C.padrao==null?null:(L.porUn?1/C.padrao:(L.pct?C.padrao*100:C.padrao*1000));
      if(vals.length)h+='<div class="acl-box acl-mini"><h5>Rede mês a mês — '+esc(fmtUn(L))+' <small>(linha tracejada = padrão)</small></h5>'
        +svgColunas(rot,[{nome:fmtUn(L),cor:'#38bdf8',vals:vals}],{w:1600,h:170,fmt:function(v){return n1(v);},linha:pad,rotTot:false})+'</div>';}
    if(!rows.length)return h+'<div class="acl-vazio">Nenhuma loja com esse filtro.</div>';
    h+='<div class="acl-tw"><table><thead><tr><th>Loja</th><th>Regional</th>'+(C.dk?'<th>'+esc(DRV_NOME[C.dk])+'</th>':'')+'<th>Consumo</th><th>'+(C.modelo?'Faturamento':'Índice')+'</th><th>Esperado</th><th>Diferença</th><th>Desvio</th>'+(mix?'<th>Sacola P · M · G</th>':'')+'<th>Situação</th></tr></thead><tbody>';
    var t={drv:0,cons:0,esp:0,dif:0,difV:0};
    rows.forEach(function(r){
      if(!r.cd&&r.status!=='LOJA NOVA'){t.drv+=r.drv;t.cons+=r.consBase;if(r.esperado!=null){t.esp+=r.esperado;t.dif+=r.dif;t.difV+=r.difV;}}
      var mx=mix&&mix.lojas[r.cod];
      h+='<tr><td class="acl-l">'+esc(r.nome)+(r.status==='LOJA NOVA'?'<small>'+(r.nova?'loja nova · abriu em '+(r.primeiro?mesLabel(r.primeiro):'—'):'só '+r.nMeses+' meses com venda (fechada/reaberta)')+' · fora do padrão</small>':'')+'</td><td>'+esc(r.reg)+'</td>'
        +(C.dk?'<td>'+(r.drv?n0(r.drv):'—')+'</td>':'')+'<td><b>'+n0(r.consBase)+'</b>'+(r.consTot>r.consBase?'<small>+'+n0(r.consTot-r.consBase)+' antes da 1ª venda</small>':'')+'</td><td>'+(C.modelo&&r.fat?'R$ '+abrev(r.fat*1000):fmtTaxa(L,r.taxa))+'</td><td>'+(r.esperado!=null?n0(r.esperado):'—')+(C.modelo&&r.espFixo!=null?'<small>fixo '+n0(r.espFixo)+' + fluxo '+n0(r.espFluxo)+'</small>':'')+'</td>'
        +'<td class="'+(r.dif>0?'acl-up':r.dif<0?'acl-dn':'')+'">'+(r.dif!=null?(r.dif>0?'+':'')+n0(r.dif):'—')+(r.difV?'<small>'+brl(r.difV)+'</small>':'')+'</td>'
        +'<td class="'+(r.desvio>C.tol?'acl-up':r.desvio<-C.tol?'acl-dn':'acl-ok')+'">'+(r.desvio!=null?pct(r.desvio):'—')+'</td>'
        +(mix?'<td>'+(mx?barraMix(mx,mix.b):'—')+'</td>':'')+'<td>'+stTag(r.status)+'</td></tr>';
    });
    h+='<tr class="acl-tot"><td>TOTAL (sem CD e lojas novas)</td><td></td>'+(C.dk?'<td>'+n0(t.drv)+'</td>':'')+'<td>'+n0(t.cons)+'</td><td></td><td>'+n0(t.esp)+'</td><td>'+(t.dif>0?'+':'')+n0(t.dif)+'<small>'+brl(t.difV)+'</small></td><td></td>'+(mix?'<td></td>':'')+'<td></td></tr></tbody></table></div>'
      +'<div class="acl-nota">Consumo = o que a loja pediu nos meses em que vendeu (acumulado, porque a loja pede a cada 2–3 meses). Esperado = venda da loja × padrão da rede. Loja inaugurada no período e CD ficam fora do padrão. Atenção: a base começa em JAN/26; loja que estocou em dez/25 pode aparecer abaixo.</div>';
    return h;
  }
  function fmtUn(L){return L.pct?'% das vendas com presente':L.porUn?(L.id==='sac'?'PA por sacola':'vendas por unidade'):'unidades a cada 1.000';}
  function mixPorLoja(M){
    var b=mixSac(M.P),lojas={},rede={P:0,M:0,G:0};
    Object.keys(M.itens).forEach(function(c){var t=SAC_TAM[c];if(!t)return;var it=M.itens[c];
      Object.keys(it.lojas).forEach(function(lj){if(ehCD(lj))return;var o=lojas[lj]=lojas[lj]||{P:0,M:0,G:0};
        M.fechados.forEach(function(m){var x=it.lojas[lj][m];if(x){o[t]+=x.q;rede[t]+=x.q;}});});});
    function pc(o){var t=o.P+o.M+o.G;return t?{P:o.P/t,M:o.M/t,G:o.G/t}:null;}
    Object.keys(lojas).forEach(function(k){lojas[k]=pc(lojas[k]);});
    return {b:b,lojas:lojas,rede:pc(rede)||{P:0,M:0,G:0}};
  }
  function barraMix(x,b){
    var alto=x.G-b.G>0.10;
    return '<span class="acl-mix" title="P '+n0(x.P*100)+'% · M '+n0(x.M*100)+'% · G '+n0(x.G*100)+'%"><i style="width:'+(x.P*100)+'%;background:#38bdf8"></i><i style="width:'+(x.M*100)+'%;background:#10b981"></i><i style="width:'+(x.G*100)+'%;background:'+(alto?'#e11d48':'#f59e0b')+'"></i></span>'
      +'<small'+(alto?' class="acl-up"':'')+'>'+n0(x.P*100)+' · '+n0(x.M*100)+' · <b>'+n0(x.G*100)+'%</b></small>';
  }

  // ================== Relatório Diretoria (impressão / PDF) ==================
  function relatorioGerencial(){
    if(!S.ultimo){alert('Aguarde os dados carregarem.');return;}
    var w=window.open('','_blank');if(!w){alert('Libere pop-ups para abrir o relatório.');return;}
    var R=S.ultimo,M=R.M,I=indicadores(R),fut=R.linhas[0].F.mCob,TC=TEMA_CLARO;
    var de=M.meses.length?mesLabel(M.meses[0]):'',ate=M.fechados.length?mesLabel(M.fechados[M.fechados.length-1]):de;
    var onde=S.filtroLoja?S.filtroLoja:(S.filtroReg?'Regional '+S.filtroReg:'Rede (todas as lojas)');
    function card(cor,rot,val,sub){return '<div class="kc" style="border-top-color:'+cor+'"><span>'+rot+'</span><b style="color:'+cor+'">'+val+'</b><small>'+sub+'</small></div>';}
    var cards=card('#14284a','Consumo '+de+' a '+ate,brl(I.consV),'média '+brl(M.fechados.length?I.consV/M.meses.length:0)+'/mês'+(I.pa?' · '+n0(I.pa)+' pares vendidos':''))
      +card('#0369a1','Estoque atual (CD + AX)',brl(I.estV),I.itens.length+' itens controlados')
      +card('#b45309','Comprar agora',brl(I.compra),I.urg.length+' itens acabam em menos de 1 mês')
      +card('#be123c','Lojas fora do padrão',I.nAcima+' acima · '+I.nAbaixo+' abaixo','de '+I.nAval+' lojas · excesso '+brl(I.exc));
    var GR=['Venda','Agrado','NFS','Remanejo','Média mensal'],GC={Venda:'#0e7c66',Agrado:'#d97706',NFS:'#0369a1',Remanejo:'#7c3aed','Média mensal':'#94a3b8'};
    var serie=GR.map(function(g){return {nome:g,cor:GC[g],vals:M.meses.map(function(m){return I.mesG[m][g]||0;})};});
    var b1=blocoConsEsp(R,I,TC,'r',620,190);
    var g2=svgBarras(I.itens.filter(function(r){return r.cob!=null;}).slice(0,12).map(function(r){return {label:nomeItem(r.nome,r.cod),val:Math.min(r.cob,6),cor:r.cob<1?'#be123c':r.cob<2?'#d97706':'#0e7c66',txt:(r.cob>=6?'6+':n1(r.cob))+' m'};}),{tema:TC,w:620,max:6,marcas:[1,2,3,6],sufMarca:' m',pl:170,lh:20});
    var leg='<div class="leg">'+b1.leg+'</div>';
    // Tabela: estoque e consumo por item mês a mês
    var ms=M.meses;
    var t1='<table class="t1"><thead><tr><th>Item</th>'+ms.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?'*':'')+'</th>';}).join('')+'<th class="t">Total</th><th class="t">Média/mês</th><th class="t">Estoque</th><th class="t">Dura</th><th class="t">Comprar</th></tr></thead><tbody>';
    var totM={};ms.forEach(function(m){totM[m]=0;});
    var grupoAnt='';
    I.itens.slice().sort(function(a,b){return GR.indexOf(a.L.grupo)-GR.indexOf(b.L.grupo)||b.tq-a.tq;}).forEach(function(r){
      ms.forEach(function(m){totM[m]+=(r.mq[m]||0)*r.custo;});
      t1+='<tr><td class="nm">'+esc(nomeItem(r.nome,r.cod))+'</td>'+ms.map(function(m){var q=r.mq[m]||0;return '<td'+(q?'':' class="z"')+'>'+(q?n0(q):'—')+'</td>';}).join('')
        +'<td class="t"><b>'+n0(r.tq)+'</b></td><td class="t">'+n0(r.media)+'</td><td class="t">'+n0(r.estoque)+'</td><td class="t" style="color:'+(r.cob==null?'#94a3b8':r.cob<1?'#be123c':r.cob<2?'#d97706':'#0e7c66')+';font-weight:800">'+(r.cob==null?'—':(r.cob>=12?'12+':n1(r.cob))+' m')+'</td><td class="t"><b>'+(r.sug?n0(r.sug):'—')+'</b></td></tr>';});
    var totG=ms.reduce(function(s,m){return s+totM[m];},0);
    t1+='<tr class="tt"><td class="nm">TOTAL (R$)</td>'+ms.map(function(m){return '<td>'+abrev(totM[m])+'</td>';}).join('')+'<td class="t">'+brl(totG)+'</td><td class="t">'+brl(totG/(ms.length||1))+'</td><td class="t">'+brl(I.estV)+'</td><td class="t"></td><td class="t">'+brl(I.compra)+'</td></tr></tbody></table>';
    // Compra
    var t2='<table><thead><tr><th>Item</th><th>Estoque</th><th>Dura</th><th>Precisa '+fut.map(mesLabel).join(' + ')+'</th><th>Comprar</th><th>Valor</th></tr></thead><tbody>'
      +I.itens.filter(function(r){return r.sug;}).map(function(r){return '<tr><td class="nm">'+esc(nomeItem(r.nome,r.cod))+'</td><td>'+n0(r.estoque)+'</td><td style="color:'+(r.cob<1?'#be123c':r.cob<2?'#d97706':'#0e7c66')+';font-weight:800">'+n1(r.cob)+' m</td><td>'+n0(r.prev3)+'</td><td><b>'+n0(r.sug)+'</b></td><td><b>'+brl(r.sugV)+'</b></td></tr>';}).join('')
      +'<tr class="tt"><td class="nm">TOTAL</td><td></td><td></td><td></td><td></td><td>'+brl(I.compra)+'</td></tr></tbody></table>';
    // Lojas
    // Retrato: as 10 lojas com maior excesso, até 3 itens cada; o resto vira uma linha "demais".
    var ljTodas=I.lojasL.filter(function(o){return o.acima.length;}).sort(function(a,b){return b.exc-a.exc;}),lj=ljTodas.slice(0,10),ljResto=ljTodas.slice(10);
    // Uma linha por loja × item (tabela, sem texto corrido): pediu, esperado, excesso em quantidade, desvio e R$.
    var t3=lj.length?'<table class="lj"><thead><tr><th>Loja</th><th>Regional</th><th style="text-align:left">Item</th><th>Vendeu</th><th>Pediu</th><th>Esperado</th><th>Excesso</th><th>Desvio</th><th>Excesso R$</th></tr></thead><tbody>'
      +lj.map(function(o){var dsT=o.det.filter(function(d){return d.status==='ACIMA';}).sort(function(a,b){return b.difV-a.difV;}),ds=dsT.slice(0,3),n=ds.length+(dsT.length>1?1:0);
        return ds.map(function(d,ix){return '<tr'+(ix===0?' class="l1"':'')+'>'+(ix===0?'<td class="nm" rowspan="'+n+'">'+esc(o.nome)+(o.pa?'<br><span class="un">'+n0(o.pa)+' pares vendidos</span>':'')+'</td><td rowspan="'+n+'">'+esc(o.reg)+'</td>':'')
          +'<td class="nm" style="font-weight:400">'+esc(d.item)+'</td><td>'+(d.vend?n0(d.vend)+' <span class="un">'+esc(d.vu)+'</span>':'—')+'</td><td>'+n0(d.pediu)+'</td><td>'+n0(d.esperado)+'</td><td class="up">▲ +'+n0(d.dif)+' <span class="un">'+d.un+'</span></td><td class="up">'+(d.desvio!=null?pct(d.desvio):'—')+'</td><td><b>'+brl(Math.max(0,d.difV))+'</b></td></tr>';}).join('')
          +(dsT.length>1?'<tr class="st"><td class="nm">Total da loja'+(dsT.length>3?' ('+dsT.length+' itens)':'')+'</td><td></td><td></td><td></td><td></td><td></td><td><b>'+brl(o.exc)+'</b></td></tr>':'');}).join('')
      +(ljResto.length?'<tr class="rs"><td class="nm" colspan="8">Demais '+ljResto.length+' lojas acima do padrão (lista completa no Excel)</td><td>'+brl(ljResto.reduce(function(s,o){return s+o.exc;},0))+'</td></tr>':'')
      +'<tr class="tt"><td class="nm" colspan="8">TOTAL ('+ljTodas.length+' lojas)</td><td>'+brl(ljTodas.reduce(function(s,o){return s+o.exc;},0))+'</td></tr></tbody></table>':'';
    // A4 retrato, compacto (antes: paisagem, 5–6 páginas).
    var css='@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2533;margin:0;background:#eef2f7}'
      +'#doc{background:#fff;width:780px;margin:14px auto;padding:16px 18px;border-radius:10px;box-shadow:0 4px 18px rgba(20,40,74,.12)}'
      +'.cab{display:flex;align-items:center;gap:12px;padding-bottom:8px;border-bottom:3px solid #14284a}.cab img{height:40px;border-radius:5px}.cab .tt1{flex:1}.cab h1{margin:0;font-size:16px;color:#14284a}.cab p{margin:2px 0 0;color:#5b6b80;font-size:10px}'
      +'.tag{background:#14284a;color:#fff;font-size:8.5px;font-weight:700;padding:4px 9px;border-radius:20px;letter-spacing:.05em}'
      +'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:9px 0}.kc{background:#f7f9fc;border:1px solid #e1e7ef;border-top:4px solid;border-radius:8px;padding:6px 9px}.kc span{display:block;font-size:8px;font-weight:700;color:#5b6b80;text-transform:uppercase;letter-spacing:.03em}.kc b{display:block;font-size:14.5px;margin-top:2px}.kc small{display:block;color:#8091a7;font-size:8px;margin-top:1px}'
      +'.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 2px}.gb{border:1px solid #e1e7ef;border-radius:8px;padding:6px 8px;page-break-inside:avoid}.gb h4{margin:0 0 4px;font-size:10px;color:#14284a}.gb select{font-size:9px;padding:1px 4px}'
      +'.leg{display:flex;gap:8px;flex-wrap:wrap;font-size:8px;color:#5b6b80;margin-top:2px}.leg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px;vertical-align:-1px}.gb div[style*="font-size:11px"]{font-size:8.5px!important}'
      +'.sec{font-size:11.5px;font-weight:800;color:#14284a;margin:10px 0 5px;padding-left:8px;border-left:4px solid #0e7c66;page-break-after:avoid}'
      +'table{width:100%;border-collapse:separate;border-spacing:0;font-size:8px;border:1px solid #d9e1ec;border-radius:7px;overflow:hidden}'
      +'th{background:#14284a;color:#fff;padding:4px 3px;text-align:right;font-size:7px;letter-spacing:.02em;text-transform:uppercase}th:first-child{text-align:left;padding-left:6px}th.t{background:#0f2342}'
      +'td{padding:2.6px 3px;text-align:right;border-bottom:1px solid #eef2f7;white-space:nowrap}td.nm{text-align:left;padding-left:6px;font-weight:600;white-space:normal}td.z{color:#c3ccd8}td.t{background:#f1f5fb}tbody tr:nth-child(even) td{background:#fafbfd}'
      +'tr.gr td{background:#e8eef6!important;color:#14284a;font-weight:800;font-size:8px;text-align:left;padding-left:6px}tr.rs td{color:#5b6b80;font-style:italic}'
      +'tr.tt td{background:#dfe8f4!important;font-weight:800;color:#14284a;border-top:2px solid #14284a}tr{page-break-inside:avoid}thead{display:table-header-group}'
      +'table.lj td{vertical-align:middle}table.lj tr.l1 td{border-top:1px solid #c9d4e3}table.lj td[rowspan]{background:#fff!important;border-right:1px solid #eef2f7}table.lj td.up{color:#be123c;font-weight:700}table.lj .un{font-weight:400;color:#8091a7;font-size:7px}table.lj tr.st td{background:#fdf2f4!important;color:#be123c;font-weight:700}'
      +'.h4s{display:flex;gap:8px;align-items:center;justify-content:space-between}@media print{.h4s select{border:0;-webkit-appearance:none;appearance:none;font-weight:700;color:#14284a}}'
      +'table.t1 td.nm{white-space:nowrap}table.t1 td,table.t1 th{padding-left:2px;padding-right:2px}'
      +'.duas{display:block}.quebra{page-break-before:always}.nota{color:#8091a7;font-size:8px;margin-top:6px}.rod{display:flex;justify-content:space-between;color:#8091a7;font-size:8px;margin-top:10px;padding-top:6px;border-top:1px solid #e1e7ef}'
      +'#barra{position:sticky;top:0;background:#0b1626;padding:8px 12px;display:flex;gap:8px;align-items:center;z-index:5}#barra button{background:#0e7c66;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer}#barra button.s2{background:#15304d}'
      +'@media print{#barra{display:none}body{background:#fff}#doc{box-shadow:none;margin:0;padding:0;width:auto;border-radius:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var nome='Esposende_almoxarifado_diretoria_'+new Date().toISOString().slice(0,10)+'.pdf';
    var js='function salvarPDF(){var b=document.getElementById("bpdf");b.textContent="Gerando PDF...";b.disabled=true;var d=document.getElementById("doc");'
      +'function go(){d.style.cssText="margin:0;box-shadow:none;border-radius:0";html2pdf().set({margin:[6,6,6,6],filename:"'+nome+'",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr",".kc",".gb"]}}).from(d).save().then(function(){b.textContent="📄 Salvar PDF";b.disabled=false;d.style.cssText="";});}'
      +'if(window.html2pdf)return go();var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";s.onload=go;s.onerror=function(){b.textContent="📄 Salvar PDF";b.disabled=false;window.print();};document.head.appendChild(s);}';
    w.document.write('<html><head><meta charset="utf-8"><title>Esposende · Almoxarifado · Relatório Diretoria</title><style>'+css+'</style></head><body>'
      +'<div id="barra"><button onclick="window.print()">🖨 Imprimir</button><button id="bpdf" class="s2" onclick="salvarPDF()">📄 Salvar PDF</button><button class="s2" onclick="window.close()">✕ Fechar</button></div>'
      +'<div id="doc"><div class="cab">'+(logo()?'<img src="data:image/jpeg;base64,'+logo()+'" alt="Esposende">':'')+'<div class="tt1"><h1>Almoxarifado — Consumo, Estoque e Compras</h1><p>'+de+' a '+ate+' · '+esc(onde)+' · estoque 001 CD + AX</p></div><span class="tag">RELATÓRIO DIRETORIA</span></div>'
      +'<div class="kpis">'+cards+'</div>'
      +'<div class="g2"><div class="gb"><h4 class="h4s">Consumo x esperado por mês '+b1.sel+'</h4>'+b1.corpo+leg+'</div><div class="gb"><h4>Cobertura do estoque (meses)</h4>'+g2+'</div></div>'
      +'<div class="sec">Estoque e consumo por item — quantidade por mês</div>'+t1
      +'<div class="duas"><div><div class="sec">Compra necessária ('+fut.map(mesLabel).join(' + ')+')</div>'+t2+'</div>'
      +(t3?'<div><div class="sec">Lojas acima do padrão</div>'+t3+'</div>':'')+'</div>'
      
      +'<div class="rod"><span>Esposende · Central de Auditoria &amp; Controle</span><span>Gerado em '+new Date().toLocaleString('pt-BR')+'</span></div></div>'
      +'<scr'+'ipt>'+js+'</scr'+'ipt></body></html>');
    w.document.close();
  }

  function vMensal(R){
    var M=R.M,meses=M.meses;
    var lojasOk={};Object.keys(M.lojas).forEach(function(c){if(bateLoja(M.lojas[c]))lojasOk[c]=1;});
    var filtrando=!!(S.filtroLoja||S.filtroReg);
    function cel(o){return o&&o.q?n0(o.q)+'<small>'+brl(o.v)+'</small>':'—';}
    var h='<h3>Itens controlados — totalizado por mês'+(filtrando?' · '+esc(S.filtroLoja||('Regional '+S.filtroReg)):' · todas as lojas')+'</h3>'
      +'<div class="acl-tw"><table><thead><tr><th>Item</th>'+meses.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?' *':'')+'</th>';}).join('')+'<th>Total</th><th>Média/mês</th></tr></thead><tbody>';
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
          linhasG+='<tr><td class="acl-l">'+esc(it.nome)+'<small>'+it.cod+' · '+esc(L.nome)+'</small></td>'+meses.map(function(m){return '<td>'+cel(tm[m])+'</td>';}).join('')
            +'<td><b>'+n0(tq)+'</b><small>'+brl(tv)+'</small></td><td class="acl-ok"><b>'+n1(M.fechados.length?qf/M.fechados.length:0)+'</b></td></tr>';
        });
      });
      if(!linhasG)return;
      h+='<tr class="acl-sub"><td class="acl-l" style="color:'+GRUPO_COR[g]+'">'+esc(g.toUpperCase())+'</td>'+meses.map(function(m){return '<td>'+(subM[m]?brl(subM[m].v):'—')+'</td>';}).join('')+'<td>'+brl(sub.v)+'</td><td></td></tr>'+linhasG;
    });
    h+='<tr class="acl-tot"><td>TOTAL R$</td>'+meses.map(function(m){return '<td>'+(totM[m]?brl(totM[m].v):'—')+'</td>';}).join('')+'<td>'+brl(totG.v)+'</td><td>'
      +brl(M.fechados.reduce(function(s,m){return s+(totM[m]?totM[m].v:0);},0)/(M.fechados.length||1))+'</td></tr></tbody></table></div>';
    // por loja (R$ de todos os itens controlados)
    var ls=Object.keys(lojaM).map(function(lj){var t=0;meses.forEach(function(m){if(lojaM[lj][m])t+=lojaM[lj][m].v;});return {lj:lj,t:t};}).sort(function(a,b){return b.t-a.t;});
    h+='<h3>Por loja — R$ dos itens controlados por mês</h3><div class="acl-tw"><table><thead><tr><th>Loja</th><th>Regional</th>'+meses.map(function(m){return '<th>'+mesLabel(m)+(m>=M.atual?' *':'')+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>'
      +ls.map(function(o){var l=M.lojas[o.lj];return '<tr><td class="acl-l">'+esc(l.nome)+'</td><td>'+esc(l.reg)+'</td>'+meses.map(function(m){var c=lojaM[o.lj][m];return '<td>'+(c?brl(c.v):'—')+'</td>';}).join('')+'<td><b>'+brl(o.t)+'</b></td></tr>';}).join('')
      +'</tbody></table></div><div class="acl-nota">* mês em andamento — aparece na tabela, mas não entra na média.</div>';
    return h;
  }

  function vPrev(R){
    var M=R.M,x=R.linhas.find(function(l){return l.L.id===S.linha;}),L=x.L,C=x.C,F=x.F,P=M.P,fut=F.futuros;
    var h=avisoBase(R)+previsaoVenda(R)+'<h3>Sugestão de compra — todos os itens controlados</h3>'+tabelaCompra(R)
      +'<h3>'+L.icone+' '+esc(L.nome)+' — previsão de consumo por loja ('+fut.map(mesLabel).join(', ')+')</h3>'
      +'<div class="acl-nota" style="margin:0 0 8px">'+(C.dk?'Motor previsto = média mensal de '+DRV_NOME[C.dk]+' no ano':'Sem motor: média mensal de consumo')
      +(F.ehVenda?' · mês comum +'+n0(P.crescimento)+'% · dezembro ×'+n2(P.fatorDez):'')
      +(C.dk?'. Consumo previsto = motor previsto × '+(P.basePrev==='real'?'índice real de cada loja':'padrão da rede ('+fmtTaxa(L,C.padrao)+')')+'. Loja sem base usa a própria média de consumo.':'.')+'</div>';
    var rows=F.porLoja.filter(bateLoja);
    h+='<div class="acl-tw"><table><thead><tr><th>Loja</th><th>Regional</th>'+(C.dk?'<th>Média '+DRV_CURTO[C.dk]+'/mês</th>':'')+'<th>Consumo médio/mês</th><th>Previsão mês comum</th>'
      +fut.map(function(m){return '<th>'+mesLabel(m)+'</th>';}).join('')+'<th>Total '+fut.length+' meses</th><th>Base</th></tr></thead><tbody>';
    var t={md:0,mc:0,p:0,pm:{},hz:0};
    rows.forEach(function(r){var hzr=0;fut.forEach(function(m){hzr+=r.pm[m];t.pm[m]=(t.pm[m]||0)+r.pm[m];});t.md+=r.mediaDrv||0;t.mc+=r.mediaCons;t.p+=r.prev;t.hz+=hzr;
      h+='<tr><td class="acl-l">'+esc(r.nome)+'</td><td>'+esc(r.reg)+'</td>'+(C.dk?'<td>'+(r.mediaDrv?n0(r.mediaDrv):'—')+'</td>':'')
        +'<td>'+n1(r.mediaCons)+'</td><td class="acl-ok"><b>'+n1(r.prev)+'</b></td>'+fut.map(function(m){return '<td'+(m.slice(5)==='12'?' class="acl-dn"':'')+'>'+n0(r.pm[m])+'</td>';}).join('')
        +'<td><b>'+n0(hzr)+'</b></td><td><small>'+esc(r.base)+'</small></td></tr>';});
    h+='<tr class="acl-tot"><td>TOTAL</td><td></td>'+(C.dk?'<td>'+n0(t.md)+'</td>':'')+'<td>'+n0(t.mc)+'</td><td>'+n0(t.p)+'</td>'+fut.map(function(m){return '<td>'+n0(t.pm[m])+'</td>';}).join('')+'<td>'+n0(t.hz)+'</td><td></td></tr></tbody></table></div>';
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
    var h='<h3>📈 Previsão de venda (PA) por loja — média do ano'+' · mês comum +'+n0(P.crescimento)+'% · dezembro ×'+n2(P.fatorDez)+'</h3><div class="acl-tw" style="max-height:340px"><table><thead><tr><th>Loja</th><th>Regional</th><th>Meses com venda</th><th>PA no ano</th><th>Média PA/mês</th>'
      +fut.map(function(m){return '<th>'+mesLabel(m)+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>';
    rows.forEach(function(r){T.tot+=r.tot;T.med+=r.med;r.pm.forEach(function(v,i){T.pm[i]+=v;});
      h+='<tr><td class="acl-l">'+esc(r.nome)+'</td><td>'+esc(r.reg)+'</td><td>'+r.n+'</td><td>'+n0(r.tot)+'</td><td class="acl-ok"><b>'+n0(r.med)+'</b></td>'
        +r.pm.map(function(v,i){return '<td'+(fut[i].slice(5)==='12'?' class="acl-dn"':'')+'>'+n0(v)+'</td>';}).join('')+'<td><b>'+n0(r.pm.reduce(function(s,v){return s+v;},0))+'</b></td></tr>';});
    h+='<tr class="acl-tot"><td>TOTAL</td><td></td><td></td><td>'+n0(T.tot)+'</td><td>'+n0(T.med)+'</td>'+T.pm.map(function(v){return '<td>'+n0(v)+'</td>';}).join('')+'<td>'+n0(T.pm.reduce(function(s,v){return s+v;},0))+'</td></tr></tbody></table></div>';
    return h;
  }
  function linhasCompra(R){var o=[];R.linhas.forEach(function(x){x.F.itens.forEach(function(i){o.push(i);});});return o;}
  function tabelaCompra(R){
    var its=linhasCompra(R),P=R.M.P,t={pm:0,sug:0},F0=R.linhas[0].F,mc=F0.mCob,dez=F0.todos.filter(function(m){return m.slice(5)==='12';})[0];
    var h='<div class="acl-tw" style="max-height:none"><table><thead><tr><th>Item</th><th>Grupo</th><th>Média real/mês</th><th>Previsão mês comum</th>'+(dez?'<th>Previsão '+mesLabel(dez)+'</th>':'')
      +'<th>Estoque atual</th><th>Cobertura atual</th><th>Precisa ('+mc.map(mesLabel).join(' + ')+')</th><th>Sugestão de compra</th><th>Custo un.</th><th>Valor da compra</th></tr></thead><tbody>';
    its.forEach(function(i){t.pm+=i.prevM*i.custo;t.sug+=i.sugV;
      var cobCls=i.cobAtual==null?'':i.cobAtual<1?'acl-up':i.cobAtual<mc.length?'acl-dn':'acl-ok';
      h+='<tr><td class="acl-l">'+esc(i.nome)+'<small>'+i.cod+(i.ultCompra?' · última compra '+esc(i.ultCompra):'')+'</small></td><td>'+esc(i.linha.grupo)+'</td><td>'+n0(i.media)+'</td><td class="acl-ok"><b>'+n0(i.prevM)+'</b></td>'
        +(dez?'<td class="acl-dn"><b>'+n0(i.pm[dez])+'</b></td>':'')
        +'<td>'+n0(i.saldo)+(i.deps?'<small>'+Object.keys(i.deps).map(function(d){return esc(d.replace(/\s*-\s*ALMOXARIFADO\s*/i,' ')).slice(0,14)+' '+n0(i.deps[d]);}).join(' + ')+'</small>':'')+'</td><td class="'+cobCls+'">'+(i.cobAtual!=null?n1(i.cobAtual)+' m':'—')+'</td><td>'+n0(i.alvo)+(i.segQ?'<small>inclui '+n0(i.segQ)+' de segurança ('+n0(i.segMeses)+' m)</small>':'')+'</td>'
        +'<td><b class="'+(i.sug?'acl-dn':'acl-ok')+'">'+(i.sug?n0(i.sug):'—')+'</b></td><td>'+(i.custo?'R$ '+Number(i.custo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4}):'—')+'</td><td><b>'+(i.sug?brl(i.sugV):'—')+'</b></td></tr>';});
    h+='<tr class="acl-tot"><td>TOTAL</td><td></td><td></td><td>'+brl(t.pm)+'/mês</td>'+(dez?'<td></td>':'')+'<td></td><td></td><td></td><td></td><td></td><td>'+brl(t.sug)+'</td></tr></tbody></table></div>'
      +'<div class="acl-nota">Sugestão = previsão de '+mc.map(mesLabel).join(' + ')+' (dezembro ×'+n2(P.fatorDez)+' nos itens de venda, agrado e bobina) (filme stretch: no mínimo '+n0(Number(P.segStretch)||0)+' meses de estoque de segurança no total) − estoque atual do almoxarifado. Cobertura em vermelho = menos de 1 mês. '
      +'O pedido de dezembro sai das lojas em novembro: compre antes. Arredonde para a embalagem de compra (milheiro, caixa, fardo).</div>';
    return h;
  }

  function vBase(){
    var B=S.base,P=B.params;
    function resumo(lista,campos){
      var ms={};lista.forEach(function(x){var m=ms[x.mes]=ms[x.mes]||{lojas:{},v:{}};m.lojas[x.loja]=1;campos.forEach(function(c){if(x[c]!=null)m.v[c]=(m.v[c]||0)+Number(x[c]);});});
      var ks=Object.keys(ms).sort();if(!ks.length)return '<div class="acl-vazio" style="padding:14px">Nada carregado ainda.</div>';
      return '<div class="acl-tw" style="max-height:300px"><table><thead><tr><th>Mês</th><th>Lojas</th>'+campos.map(function(c){return '<th>'+({pares:'Pares',nfs:'NFS',valor:'Valor',pedidos:'Pedidos'}[c])+'</th>';}).join('')+'</tr></thead><tbody>'
        +ks.map(function(k){var m=ms[k];return '<tr><td>'+mesLabel(k)+'</td><td>'+Object.keys(m.lojas).length+'</td>'+campos.map(function(c){return '<td>'+(m.v[c]!=null?(c==='valor'?brl(m.v[c]):n0(m.v[c])):'—')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
    }
    var h='<div class="acl-kpi"><div><span>Base de vendas</span><b>'+n0(B.vendas.length)+'</b><small>linhas loja × mês</small></div>'
      +'<div><span>Atualizado</span><b style="font-size:14px">'+(B.atualizadoEm?new Date(B.atualizadoEm).toLocaleString('pt-BR'):'—')+'</b><small>'+esc(B.atualizadoPor||'')+'</small></div></div>'
      +(S.msgBase?'<div class="acl-aviso" style="background:#0d2233;border-color:#2f5478;color:#cfe0f2">'+S.msgBase.map(esc).join('<br>')+'</div>':'')
      +'<div class="acl-drop" id="acl-drop">⬇ Arraste aqui as planilhas de <b>vendas por loja/mês</b> (xlsx ou csv) — ou <label style="display:inline;color:#5fd3b8;cursor:pointer;text-transform:none;font-size:13px">clique para escolher<input type="file" id="acl-file" multiple accept=".xlsx,.xls,.csv" style="display:none"></label>'
      +'<div style="margin-top:10px;font-size:12px">O tipo é reconhecido pelas colunas: <b>Loja + Mês/Data + Pares (PA) + NFS + Valor</b> = vendas · <b>Código + Descrição + Quantidade</b> = estoque dos depósitos. Carga nova troca só os meses e lojas que vieram no arquivo.</div>'
      +'<div style="margin-top:10px"><button type="button" data-a="mod" data-m="ven">Modelo de vendas (.csv)</button></div></div>'
      +'<h3>⚙ Parâmetros (valem para todos)</h3><div class="acl-pgrid">'
      +'<div><label>PA por sacola (regra)</label><input type="number" step="0.1" min="0.5" id="p-pa" value="'+P.paPorSacola+'"></div>'
      +'<div><label>PA por NF (NFS = PA ÷ este número)</label><input type="number" step="0.05" min="1" id="p-panf" value="'+(P.paPorNF||1.5)+'"></div>'
      +'<div><label>Filme stretch: estoque de segurança (meses no total)</label><input type="number" step="0.5" min="0" id="p-seg" value="'+(P.segStretch!=null?P.segStretch:3)+'"></div>'
      +'<div><label>Previsão de venda (+% sobre a média)</label><input type="number" step="1" id="p-cr" value="'+P.crescimento+'"></div>'
      +'<div><label>Dezembro (× venda de um mês comum)</label><input type="number" step="0.05" min="1" max="5" id="p-dez" value="'+P.fatorDez+'"></div>'
      +'<div><label>Sacola P / M / G (% baliza)</label><div style="display:flex;gap:4px"><input type="number" min="0" max="100" id="p-mp" value="'+P.mixP+'" style="width:33%"><input type="number" min="0" max="100" id="p-mm" value="'+P.mixM+'" style="width:33%"><input type="number" min="0" max="100" id="p-mg" value="'+P.mixG+'" style="width:33%"></div></div>'
      +'<div><label>Tolerância do padrão (±%)</label><input type="number" step="1" min="5" id="p-tol" value="'+P.tolerancia+'"></div>'
      +'<div><label>Cobertura de estoque (meses)</label><input type="number" step="0.5" min="0.5" id="p-cob" value="'+P.cobertura+'"></div>'
      +'<div><label>Horizonte da previsão (meses)</label><input type="number" step="1" min="1" max="12" id="p-hz" value="'+P.horizonte+'"></div>'
      +'<div><label>Base da previsão</label><select id="p-bp"><option value="padrao"'+(P.basePrev!=='real'?' selected':'')+'>Padrão da rede (auditoria)</option><option value="real"'+(P.basePrev==='real'?' selected':'')+'>Índice real de cada loja</option></select></div>'
      +'</div><div style="margin-top:10px"><button type="button" class="acl-pri" data-a="salvarP">💾 Salvar parâmetros</button></div>'
      +'<h3>Estoque dos depósitos (CD + AX)</h3>'+(B.estoque&&B.estoque.itens?'<div class="acl-tw" style="max-height:300px"><table><thead><tr><th>Item</th><th>Depósitos</th><th>Total</th><th>Última compra</th></tr></thead><tbody>'
        +Object.keys(B.estoque.itens).map(function(c){var x=B.estoque.itens[c];return '<tr><td class="acl-l">'+esc(x.nome)+'<small>'+c+'</small></td><td class="acl-l">'+Object.keys(x.deps).map(function(d){return esc(d)+': <b>'+n0(x.deps[d])+'</b>';}).join('<br>')+'</td><td><b>'+n0(x.total)+'</b></td><td>'+esc(x.ultCompra||'')+'</td></tr>';}).join('')
        +'</tbody></table></div><div class="acl-nota">Carregado em '+new Date(B.estoque.em).toLocaleString('pt-BR')+' ('+esc(B.estoque.arquivo||'')+'). Vale enquanto for mais novo que o estoque do módulo Almoxarifado (atualizado em '+(S.alm&&S.alm.atualizado?new Date(S.alm.atualizado).toLocaleString('pt-BR'):'—')+'). Estoque das lojas é desconsiderado.</div><div style="margin-top:6px"><button type="button" data-a="limpar" data-m="est">Apagar estoque carregado</button></div>'
        :'<div class="acl-vazio" style="padding:14px">Usando o estoque do módulo Almoxarifado (001 CD + AX), atualizado em '+(S.alm&&S.alm.atualizado?new Date(S.alm.atualizado).toLocaleString('pt-BR'):'—')+'. Arraste aqui o relatório de estoque com todos os depósitos (ex.: 001 CD + AX - ALMOXARIFADO CONDE).</div>')
      +'<h3>Vendas carregadas</h3>'+resumo(B.vendas,['pares','nfs','valor'])+(B.vendas.length?'<div style="margin-top:6px"><button type="button" data-a="limpar" data-m="ven">Apagar base de vendas</button></div>':'')
      +(B.arquivos.length?'<h3>Últimas cargas</h3><div class="acl-nota">'+B.arquivos.slice(-10).reverse().map(function(a){return esc(new Date(a.em).toLocaleString('pt-BR')+' · '+a.nome+' · '+a.tipo+' · '+a.meses+' · '+a.lojas+' lojas');}).join('<br>')+'</div>':'');
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
    P.paPorSacola=Number(g('p-pa').value)||1.5;P.crescimento=Number(g('p-cr').value)||0;P.fatorDez=Number(g('p-dez').value)||2.75;P.mixP=Number(g('p-mp').value);P.mixM=Number(g('p-mm').value);P.mixG=Number(g('p-mg').value);P.tolerancia=Number(g('p-tol').value)||25;
    P.paPorNF=Number(g('p-panf').value)||1.5;var sg=Number(g('p-seg').value);P.segStretch=sg>=0?sg:3;
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
        return [x.L.nome,x.L.grupo,x.C.dk?DRV_NOME[x.C.dk]:'média mensal',x.L.regra,q,v,M.fechados.length?q/M.fechados.length:0,x.C.padrao!=null?fmtTaxa(x.L,x.C.padrao):'—',x.C.acima,x.C.abaixo,x.C.excesso,x.F.total];}),
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
    aba('Sugestão de compra','Sugestão de compra · previsão de '+mc.map(mesLabel).join(' + ')+' (dezembro ×'+P.fatorDez+') − estoque atual',['Item','Código','Grupo','Média real/mês','Previsão mês comum'].concat(mc.map(mesLabel)).concat(['Estoque atual','Cobertura (meses)','Segurança','Precisa','Comprar','Custo un.','Valor']),
      its.map(function(i){return [i.nome,i.cod,i.linha.grupo,i.media,i.prevM].concat(mc.map(function(m){return i.pm[m];})).concat([i.saldo,i.cobAtual,i.segQ||null,i.alvo,i.sug,i.custo,i.sugV]);})
        .concat([{__tot:true,v:(function(){var v=[];for(var k=0;k<12+mc.length;k++)v.push('');v[0]='TOTAL';v[v.length-1]=tot;return v;})()}]),
      [null,null,null,Q,Q].concat(mc.map(function(){return Q;})).concat([Q,Q1,Q,Q,Q,'"R$" #,##0.0000',RS]),[36,9,11]);
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
