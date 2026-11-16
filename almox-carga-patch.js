// Almoxarifado · Carga do estoque AX (planilha WMS) e da Fortpel pelo "Carregar Planilhas" (16/11/2026).
//
// Problema: o módulo não reconhece a planilha WMS do AX (Estoque_AX.xlsx: Empresa, Cod. Produto,
// Descrição, Cod. Endereço, Endereço, Qtde, ...) nem gravou a Fortpel nova. Em 16/11 o usuário carregou
// os 4 arquivos e só o estoque de TI mudou na nuvem; o painel continuou dizendo "estoque de 11/11".
// Até aqui o estoque AX só entrava por carga manual na nuvem (09/11 e 11/11).
//
// O que este patch faz, dentro do módulo Almoxarifado (iframe #ifr-alm), antes do leitor do módulo:
//  - Estoque AX (WMS): soma a quantidade dos endereços por item (código WMS ÷ 100 = código do item),
//    custo e "Última Compra" do cadastro já carregado (dbEstoqueRaw); item novo sem cadastro usa o custo
//    da última requisição atendida (dbConsumoRaw). Substitui dbEstoqueRaw.
//  - Fortpel (Grupo, Unidade, Produto + Janeiro..Dezembro com Quantidade/Valor): substitui dbFortpelRaw
//    no formato do módulo ({mes,qtd,valor,lojaRaw,produto,lojaCodigo}).
//  - Grava a base na nuvem (portal_sync alm) na hora; o gatilho registra a data da carga (dbCargas).
//  - Os demais arquivos (requisições, estoque de TI) seguem para o leitor do próprio módulo.
//  - Mostra na tela o que foi carregado (itens, total, valor) ou o erro.
(function(){
  if(window.__almoxCargaPatch)return;
  window.__almoxCargaPatch='2026-11-16.1';
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co',SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var MESES=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  function acharSb(){var w=window;for(var i=0;i<6&&w;i++){try{if(w.sb&&w.sb.auth&&typeof w.sb.auth.getSession==='function')return w.sb;}catch(e){}if(w===w.parent)break;w=w.parent;}return null;}
  async function sessao(){
    var sb=acharSb();
    if(sb){try{var s=(await sb.auth.getSession()).data.session;if(s&&s.access_token)return {tk:s.access_token,email:s.user&&s.user.email};}catch(e){}}
    var w=window;for(var i=0;i<6&&w;i++){try{if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token)return {tk:w.__PORTAL_SESSION.access_token,email:w.__PORTAL_SESSION.email};}catch(e){}if(w===w.parent)break;w=w.parent;}
    return null;
  }
  async function rest(path,opt){
    var s=await sessao();if(!s)throw new Error('Sessão do Portal não encontrada. Entre de novo no Portal.');
    opt=opt||{};
    var h={apikey:SB_KEY,Authorization:'Bearer '+s.tk};
    if(opt.body)h['Content-Type']='application/json';
    if(opt.prefer)h.Prefer=opt.prefer;
    var r=await fetch(SB_URL+'/rest/v1/'+path,{method:opt.method||'GET',headers:h,body:opt.body?JSON.stringify(opt.body):undefined});
    var txt=await r.text(),j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
    if(!r.ok)throw new Error((j&&(j.message||j.hint))||('Supabase '+r.status));
    return j;
  }

  function limpa(s){return String(s==null?'':s).replace(/_x[0-9A-Fa-f]{4}_/g,'').replace(/&quot;/gi,"''").replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
  function norm(s){return limpa(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function num(v){if(typeof v==='number')return isFinite(v)?v:0;var s=String(v==null?'':v).trim();if(!s)return 0;
    if(/,\d{1,4}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    var n=Number(s);return isFinite(n)?n:0;}
  function codigo(c){var t=String(c==null?'':c).trim();return /^\d+$/.test(t)?String(parseInt(t,10)):t;}
  function ehData(d){return !!d&&typeof d.getTime==='function'&&!isNaN(d.getTime());}
  function dataBR(d){if(!ehData(d))return '';return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
  function brl0(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});}
  function n0(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});}

  // ---------- reconhecer o arquivo ----------
  function cab(m,i){return (m[i]||[]).map(norm);}
  function ehEstoqueAX(m){
    for(var i=0;i<Math.min(m.length,10);i++){var h=cab(m,i);
      if(h.indexOf('cod. produto')>=0&&h.some(function(x){return x==='qtde';})&&h.some(function(x){return /endereco/.test(x);}))return i;}
    return -1;
  }
  function ehFortpel(m){
    for(var i=1;i<Math.min(m.length,10);i++){var h=cab(m,i),a=cab(m,i-1);
      if(h.indexOf('grupo')>=0&&h.indexOf('unidade')>=0&&h.indexOf('produto')>=0&&a.indexOf('janeiro')>=0)return i;}
    return -1;
  }

  // ---------- montar as bases ----------
  function lerVar(w,nome,padrao){try{var v=w.eval("typeof "+nome+"!=='undefined'?"+nome+":null");return v==null?padrao:v;}catch(e){return padrao;}}
  function montarEstoqueAX(m,iCab,w){
    var h=cab(m,iCab),cE=h.indexOf('empresa'),cC=h.indexOf('cod. produto'),cD=h.findIndex(function(x){return /^descri/.test(x);}),
      cQ=h.indexOf('qtde'),cM=h.findIndex(function(x){return /movimenta/.test(x);});
    // Cadastro atual: custo (o do Seta, antes do custo real das embalagens) e última compra.
    var cad={};(lerVar(w,'dbEstoqueRaw',[])||[]).forEach(function(r){if(!r)return;var k=codigo(r['Código']);
      var u=Number(r.__custoUnitSeta!=null?r.__custoUnitSeta:r['Custo Unitário'])||0,a=cad[k];
      if(!a||u>a.u)cad[k]={u:u,uc:r['Última Compra']||(a&&a.uc)||''};});
    // Custo da última requisição atendida, para item novo sem cadastro.
    var req={};(lerVar(w,'dbConsumoRaw',[])||[]).forEach(function(r){if(!r)return;var q=Number(r['Qtd Atendida'])||0,
      c=Number(r.__custoSeta!=null?r.__custoSeta:r['Custo Atendido'])||0;if(q<=0||c<=0)return;
      var k=codigo(r['Código']),d=String(r['Data Solicitação']||'');if(!req[k]||d>req[k].d)req[k]={d:d,u:Math.round(c/q*10000)/10000};});
    var it={},ordem=[];
    for(var i=iCab+1;i<m.length;i++){var r=m[i];if(!r)continue;
      var emp=limpa(r[cE]),cod=r[cC];if(cE>=0&&/^total/i.test(emp))continue;
      if(cod==null||String(cod).trim()==='')continue;var n=parseInt(String(cod).replace(/\D/g,''),10);if(isNaN(n))continue;
      var k=String(n%100===0?n/100:n);
      var a=it[k];if(!a){a=it[k]={k:k,d:limpa(r[cD]),q:0,m:null};ordem.push(k);}
      a.q+=num(r[cQ]);var dm=r[cM];if(ehData(dm)&&(!a.m||dm.getTime()>a.m.getTime()))a.m=dm;}
    var semCusto=0,valor=0,qt=0;
    var linhas=ordem.map(function(k){var a=it[k],c=cad[k],u=(c&&c.u)||(req[k]&&req[k].u)||0;if(!u)semCusto++;valor+=a.q*u;qt+=a.q;
      return {'Insumo':a.d,'Código':k,'Unidade':'','Estoque Atual':a.q,'Última Compra':(c&&c.uc)||'','Últ. Movimentação':dataBR(a.m),'Custo Unitário':u};});
    var mov=ordem.reduce(function(x,k){var d=it[k].m;return d&&(!x||d.getTime()>x.getTime())?d:x;},null);
    return {linhas:linhas,resumo:'Estoque AX: '+n0(linhas.length)+' itens · '+n0(qt)+' un. · '+brl0(valor)+(mov?' · movimento até '+dataBR(mov):'')+(semCusto?' · '+semCusto+' itens sem custo':'')};
  }
  function montarFortpel(m,iCab){
    var h=cab(m,iCab),meses=cab(m,iCab-1),cG=h.indexOf('grupo'),cU=h.indexOf('unidade'),cP=h.indexOf('produto'),col=[];
    meses.forEach(function(x,j){var k=MESES.indexOf(x.replace('ç','c'));if(k>=0)col.push({mes:k+1,q:j,v:j+1});});
    var linhas=[],porMes={};
    for(var i=iCab+1;i<m.length;i++){var r=m[i];if(!r)continue;
      var g=limpa(r[cG]),u=limpa(r[cU]),p=limpa(r[cP]);if(!u||!p||/^tota/i.test(g))continue;
      var lc=(u.match(/^\s*(\d+)/)||[])[1]||'';
      col.forEach(function(c){var q=num(r[c.q]),v=Math.round(num(r[c.v])*100)/100;if(!q&&!v)return;
        linhas.push({mes:c.mes,qtd:q,valor:v,lojaRaw:u,produto:p,lojaCodigo:lc});porMes[c.mes]=(porMes[c.mes]||0)+v;});}
    var ult=Object.keys(porMes).map(Number).sort(function(a,b){return a-b;}).pop();
    return {linhas:linhas,resumo:'Fortpel: '+n0(linhas.length)+' linhas'+(ult?' · '+MESES[ult-1].replace('marco','março')+' '+brl0(porMes[ult]):'')};
  }

  // ---------- gravar ----------
  async function gravarNuvem(chave,linhas){
    var j=await rest('portal_sync?module_id=eq.alm&select=payload');
    var p=(j&&j[0]&&j[0].payload)||null;if(!p||typeof p!=='object')throw new Error('não achei o módulo Almoxarifado na nuvem');
    p[chave]=linhas;
    await rest('portal_sync?module_id=eq.alm',{method:'PATCH',prefer:'return=minimal',body:{payload:p,updated_at:new Date().toISOString()}});
  }
  function aplicarNoModulo(w,chave,linhas){
    w.__almoxCargaTmp=linhas;
    try{w.eval(chave+'=window.__almoxCargaTmp;');}catch(e){console.error('[Almox carga] '+chave,e);}
    try{delete w.__almoxCargaTmp;}catch(e){w.__almoxCargaTmp=null;}
  }
  function redesenhar(w){try{w.aplicarFiltros();}catch(e){try{w.calcularEAtualizarPainel();}catch(e2){}}}

  function aviso(doc,txt,cor){
    var id='almox-carga-aviso',el=doc.getElementById(id);
    if(!el){el=doc.createElement('div');el.id=id;doc.body.appendChild(el);}
    el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;max-width:520px;padding:12px 16px;border-radius:10px;font:600 13px/1.45 system-ui,Arial;box-shadow:0 8px 24px rgba(0,0,0,.45);color:#fff;background:'+(cor||'#0e7c66');
    el.innerHTML=txt;clearTimeout(el.__t);el.__t=setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},cor==='#9f1239'?20000:12000);
  }

  // ---------- interceptar os arquivos ----------
  function lerMatriz(w,f){
    return f.arrayBuffer().then(function(buf){
      var X=w.XLSX||window.XLSX;if(!X)return null;
      var wb=X.read(new Uint8Array(buf),{type:'array',cellDates:true});
      return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null});
    }).catch(function(){return null;});
  }
  async function separar(w,arquivos){
    var meus=[],resto=[];
    for(var i=0;i<arquivos.length;i++){var f=arquivos[i];
      if(!/\.(xlsx|xls)$/i.test(f.name)){resto.push(f);continue;}
      var m=await lerMatriz(w,f);if(!m){resto.push(f);continue;}
      var iAX=ehEstoqueAX(m),iF=iAX<0?ehFortpel(m):-1;
      if(iAX>=0)meus.push({tipo:'ax',m:m,i:iAX,nome:f.name});
      else if(iF>=0)meus.push({tipo:'fortpel',m:m,i:iF,nome:f.name});
      else resto.push(f);}
    return {meus:meus,resto:resto};
  }
  async function processar(w,meus){
    var feitos=[],erros=[];
    for(var i=0;i<meus.length;i++){var x=meus[i];
      try{
        var r=x.tipo==='ax'?montarEstoqueAX(x.m,x.i,w):montarFortpel(x.m,x.i),chave=x.tipo==='ax'?'dbEstoqueRaw':'dbFortpelRaw';
        if(!r.linhas.length)throw new Error('nenhuma linha válida');
        aplicarNoModulo(w,chave,r.linhas);
        await gravarNuvem(chave,r.linhas);
        feitos.push('✅ '+r.resumo);
      }catch(e){console.error('[Almox carga] '+x.nome,e);erros.push('⛔ '+x.nome+': '+(e&&e.message||e));}
    }
    if(feitos.length)redesenhar(w);
    return {feitos:feitos,erros:erros};
  }
  var REPASSADOS=new WeakSet();
  function instalar(w){
    if(!w||w.__almoxCargaInstalado)return;w.__almoxCargaInstalado=true;
    function tratar(arquivos,repassar){
      return separar(w,arquivos).then(function(s){
        if(!s.meus.length){repassar(arquivos);return;}
        aviso(w.document,'⏳ Lendo '+s.meus.map(function(x){return x.nome;}).join(', ')+'…','#1e3a5f');
        return processar(w,s.meus).then(function(res){
          aviso(w.document,res.feitos.concat(res.erros).join('<br>')+(res.feitos.length?'<br><span style="font-weight:400">Gravado na nuvem.</span>':''),res.erros.length?'#9f1239':'#0e7c66');
          if(s.resto.length)repassar(s.resto);
        });
      }).catch(function(e){console.error('[Almox carga]',e);repassar(arquivos);});
    }
    w.addEventListener('change',function(e){
      var inp=e.target;if(!inp||inp.tagName!=='INPUT'||inp.type!=='file'||REPASSADOS.has(e))return;
      var fs=Array.prototype.slice.call(inp.files||[]);if(!fs.some(function(f){return /\.(xlsx|xls)$/i.test(f.name);}))return;
      e.stopImmediatePropagation();
      tratar(fs,function(lista){
        var dt=new w.DataTransfer();lista.forEach(function(f){dt.items.add(f);});
        try{inp.files=dt.files;}catch(x){}
        var ev=new w.Event('change',{bubbles:true});REPASSADOS.add(ev);inp.dispatchEvent(ev);
      });
    },true);
    w.addEventListener('drop',function(e){
      if(REPASSADOS.has(e))return;
      var fs=Array.prototype.slice.call((e.dataTransfer&&e.dataTransfer.files)||[]);if(!fs.some(function(f){return /\.(xlsx|xls)$/i.test(f.name);}))return;
      e.preventDefault();e.stopImmediatePropagation();var alvo=e.target;
      tratar(fs,function(lista){
        var dt=new w.DataTransfer();lista.forEach(function(f){dt.items.add(f);});
        var ev=new w.DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true,clientX:e.clientX,clientY:e.clientY});
        REPASSADOS.add(ev);(alvo&&alvo.isConnected?alvo:w.document.body).dispatchEvent(ev);
      });
    },true);
  }
  setInterval(function(){var ifr=document.getElementById('ifr-alm');var w=ifr&&ifr.contentWindow;if(w&&w.document&&w.document.body)instalar(w);},1500);
})();
