// Almoxarifado — Estoque do AX (planilha WMS) + Fortpel × Verba (18/11/2026)
//
// 1) ESTOQUE DO AX: o módulo não sabia ler o Estoque_AX.xlsx (Empresa | Cod. Produto | Descrição |
//    Cod. Endereço | Endereço | Qtde | Qtde Reservada | Qtde Disponivel | Ult. Movimentação).
//    Em "Carregar Planilhas" ele virava REQUISIÇÕES (18/11 11:49: 447 linhas "AX" no consumo) ou não
//    gerava nada no campo do estoque — e a nuvem mantinha o estoque antigo ("carrego e não atualiza").
//    Agora, em QUALQUER campo de arquivo do módulo, a planilha do AX é reconhecida pelas colunas e
//    gravada como estoque pela função public.alm_carregar_estoque_ax (código = Cod. Produto ÷ 100,
//    soma dos endereços, custo do estoque anterior ou da última requisição). Os demais arquivos seguem
//    para o módulo normalmente. Na nuvem, o gatilho a1_portal_sync_alm_ax_no_consumo cobre o caso de
//    uma aba antiga gravar o AX como requisição.
//
// 2) FORTPEL × VERBA: botão "💰 Fortpel × Verba" no módulo. Mês a mês: gasto Fortpel (compra direta
//    da loja) contra a verba mensal da loja (dbVerbaMap, planilha Loja/Verba/Regional) e da regional
//    (soma das verbas das lojas dela, dbRegionaisMap). Clicar na regional abre as lojas.
(function(){
  'use strict';
  if(window.__almAxVerba)return;window.__almAxVerba='2026-11-18.2';

  var MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  function moduloAlm(){var ifr=document.getElementById('ifr-alm');var w=ifr&&ifr.contentWindow;if(!w||!w.document||!w.document.body)return null;return {ifr:ifr,w:w,doc:w.document};}
  function ler(w,nome,pad){try{var v=w.eval("typeof "+nome+"!=='undefined'?"+nome+":undefined");return v===undefined?pad:v;}catch(e){return pad;}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function brl(v){return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});}
  function brl2(v){return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function cod(c){var t=String(c==null?'':c).trim();var m=t.match(/^0*(\d+)/);return m?String(parseInt(m[1],10)):t;}

  // ---------- Supabase ----------
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co',SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  function acharSb(){var w=window;for(var i=0;i<6&&w;i++){try{if(w.sb&&w.sb.auth&&typeof w.sb.auth.getSession==='function')return w.sb;}catch(e){}if(w===w.parent)break;w=w.parent;}return null;}
  async function token(){
    var sb=acharSb();if(sb){try{var s=(await sb.auth.getSession()).data.session;if(s&&s.access_token)return s.access_token;}catch(e){}}
    var w=window;for(var i=0;i<6&&w;i++){try{if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token)return w.__PORTAL_SESSION.access_token;}catch(e){}if(w===w.parent)break;w=w.parent;}
    return null;
  }
  async function rpc(fn,body){
    var tk=await token();if(!tk)throw new Error('Sessão do Portal não encontrada. Entre de novo no Portal.');
    var r=await fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify(body)});
    var t=await r.text(),j=null;try{j=t?JSON.parse(t):null;}catch(e){}
    if(!r.ok)throw new Error((j&&(j.message||j.hint))||('Supabase '+r.status));
    return j;
  }

  // ---------- Leitura da planilha ----------
  function carregarXLSX(){
    return new Promise(function(ok,falha){
      if(window.XLSX)return ok(window.XLSX);
      var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload=function(){window.XLSX?ok(window.XLSX):falha(new Error('Leitor de planilhas indisponível.'));};
      s.onerror=function(){falha(new Error('Não consegui carregar o leitor de planilhas.'));};
      document.head.appendChild(s);
    });
  }
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  // Lê a 1ª tabela do arquivo como matriz (linhas × colunas). Planilha: SheetJS. CSV/TXT: leitor próprio
  // (separador ; ou , respeitando aspas; Windows-1252 ou UTF-8; &QUOT; e afins trocados antes).
  function decodificar(u8){
    try{return new TextDecoder('utf-8',{fatal:true}).decode(u8);}catch(e){return new TextDecoder('windows-1252').decode(u8);}
  }
  function lerCSV(txt){
    txt=txt.replace(/^﻿/,'').replace(/&(quot|amp|lt|gt|apos|nbsp);/gi,function(_,n){return {quot:"''",amp:'&',lt:'<',gt:'>',apos:"'",nbsp:' '}[n.toLowerCase()];});
    var l1=txt.split(/\r?\n/,1)[0]||'',sep=(l1.split(';').length>=l1.split(',').length)?';':',';
    var linhas=[],campo='',linha=[],aspas=false;
    for(var i=0;i<txt.length;i++){
      var c=txt[i];
      if(aspas){if(c==='"'){if(txt[i+1]==='"'){campo+='"';i++;}else aspas=false;}else campo+=c;continue;}
      if(c==='"'){aspas=true;continue;}
      if(c===sep){linha.push(campo);campo='';continue;}
      if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;linha.push(campo);campo='';if(linha.some(function(x){return String(x).trim();}))linhas.push(linha);linha=[];continue;}
      campo+=c;
    }
    linha.push(campo);if(linha.some(function(x){return String(x).trim();}))linhas.push(linha);
    return linhas;
  }
  async function lerTabelas(file){
    var nome=String(file.name||'');
    // O File pode vir do iframe (outro "realm"): copia os bytes para um Uint8Array desta janela,
    // senão o SheetJS não reconhece o ArrayBuffer e devolve uma planilha vazia.
    var u8=new Uint8Array(await file.arrayBuffer());
    if(/\.(csv|txt)$/i.test(nome))return [lerCSV(decodificar(u8))];
    if(!/\.(xlsx|xlsm|xls)$/i.test(nome))return [];
    var X=await carregarXLSX();
    var wb=X.read(u8,{type:'array',cellDates:true});
    return wb.SheetNames.map(function(n){return X.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null});});
  }
  // Número do relatório: 1.525,000 (pt-BR) ou 1525.5 ou número já convertido.
  function numBR(v){
    if(typeof v==='number')return v;
    var t=String(v==null?'':v).trim();if(!t)return 0;
    if(t.indexOf(',')>=0)t=t.replace(/\./g,'').replace(',','.');
    var n=Number(t);return isFinite(n)?n:0;
  }
  function dataISO(mv){
    if(mv&&typeof mv.getTime==='function')return new Date(mv.getTime()-mv.getTimezoneOffset()*60000).toISOString().slice(0,19);
    if(typeof mv==='string'){var d=mv.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if(d)return d[3]+'-'+d[2]+'-'+d[1]+(d[4]?'T'+d[4]+':'+d[5]+':'+(d[6]||'00'):'');
      if(/^\d{4}-\d{2}-\d{2}/.test(mv))return mv.slice(0,19);}
    return null;
  }
  // Reconhece arquivo de ESTOQUE DO ALMOXARIFADO pelas colunas:
  //   'wms'     = planilha WMS do AX (Cod. Produto | Cod. Endereço/Endereço | Qtde | Ult. Movimentação), xlsx ou csv;
  //   'sistema' = relatório de estoque do sistema (REPORTGROUP;CODIGO;DESCRICAO;...;QUANTIDADE;...;CUSTOAQUISICAO;...;ULTIMACOMPRA)
  //               — só quando não é o estoque de TI (REPORTGROUP "TI - ..."), que segue para o módulo.
  // Devolve {tipo, linhas} ou null (arquivo de outra base: segue para o módulo).
  async function classificarEstoque(file){
    if(!/\.(xlsx|xlsm|xls|csv|txt)$/i.test(file.name||''))return null;
    if(/fortpel|requisi/i.test(file.name||''))return null; // bases conhecidas que não são estoque (Fortpel tem 17 MB)
    var tabs=await lerTabelas(file);
    for(var s=0;s<tabs.length;s++){
      var m=tabs[s]||[];
      for(var h=0;h<Math.min(m.length,10);h++){
        var cab=(m[h]||[]).map(norm),ix=function(k){return cab.indexOf(k);};
        var out=[],i,r;
        if(ix('codproduto')>=0&&ix('qtde')>=0&&(ix('codendereco')>=0||ix('endereco')>=0)){
          var iCod=ix('codproduto'),iQt=ix('qtde'),iDes=ix('descricao'),iMov=ix('ultmovimentacao');
          for(i=h+1;i<m.length;i++){
            r=m[i]||[];var c=String(r[iCod]==null?'':r[iCod]).replace(/\.0+$/,'').replace(/\D/g,'');if(!c)continue;
            out.push({cod:c,desc:String(r[iDes]||'').replace(/\s+/g,' ').trim(),qtde:numBR(r[iQt]),mov:dataISO(r[iMov])});
          }
          return out.length?{tipo:'wms',linhas:out}:null;
        }
        if(ix('codigo')>=0&&ix('quantidade')>=0&&ix('descricao')>=0){
          var jC=ix('codigo'),jQ=ix('quantidade'),jD=ix('descricao'),jCu=ix('custoaquisicao'),jU=ix('ultimacompra'),jR=ix('reportgroup');
          var grupos={};
          for(i=h+1;i<m.length;i++){
            r=m[i]||[];var cc=String(r[jC]==null?'':r[jC]).trim();if(!/\d/.test(cc))continue;
            if(jR>=0)grupos[String(r[jR]||'').trim().toUpperCase()]=1;
            out.push({cod:cc,desc:String(r[jD]||'').replace(/\s+/g,' ').trim(),qtde:numBR(r[jQ]),custo:jCu>=0?numBR(r[jCu]):null,ultcompra:jU>=0?String(r[jU]||'').trim():''});
          }
          var gs=Object.keys(grupos);
          if(gs.length&&gs.every(function(g){return /(^|[^A-Z])TI([^A-Z]|$)/.test(g);}))return null; // estoque de TI
          return out.length?{tipo:'sistema',linhas:out}:null;
        }
      }
    }
    return null;
  }
  // Grava o estoque na nuvem e troca no módulo aberto (senão um salvamento seguinte do módulo
  // mandaria o estoque antigo). Devolve o resumo da função.
  async function gravarEstoque(est){
    var r=await rpc(est.tipo==='wms'?'alm_carregar_estoque_ax':'alm_carregar_estoque_sistema',{linhas:est.linhas});
    var m=moduloAlm();
    if(m){var w=m.w;
      w.__axNovoEstoque=r.estoque||[];
      try{w.eval('if(typeof dbEstoqueRaw!=="undefined")dbEstoqueRaw=window.__axNovoEstoque');}catch(e){}
      ['aplicarFiltros','calcularEAtualizarPainel'].some(function(f){try{if(typeof w[f]==='function'){w[f]();return true;}}catch(e){}return false;});
    }
    return r;
  }
  function textoOK(nome,r){
    return '✅ Estoque do almoxarifado atualizado com <b>'+esc(nome)+'</b>: <b>'+r.itens+'</b> itens · '+brl(r.valor)
      +(r.sem_custo?'<br><span style="font-weight:500">'+r.sem_custo+' itens sem custo cadastrado (entram com R$ 0 até haver compra/requisição).</span>':'')
      +'<br><span style="font-weight:500">As requisições não foram alteradas. A faixa "Bases do painel" mostra a carga de hoje.</span>';
  }

  // ---------- Aviso na tela ----------
  function aviso(doc,html,cor){
    var el=doc.getElementById('axv-toast');
    if(!el){el=doc.createElement('div');el.id='axv-toast';doc.body.appendChild(el);}
    el.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483000;max-width:min(680px,92vw);padding:14px 18px;border-radius:10px;font:600 14px/1.45 system-ui,Arial;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5);background:'+(cor||'#0e7c66');
    el.innerHTML=html+'<div style="text-align:right;margin-top:6px"><button type="button" style="background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:6px;padding:5px 12px;cursor:pointer">fechar</button></div>';
    el.querySelector('button').onclick=function(){el.remove();};
  }

  // Intercepta a escolha de arquivo em qualquer campo do módulo.
  function instalarUpload(){
    var m=moduloAlm();if(!m)return;var doc=m.doc,w=m.w;
    if(doc.__axvUpload)return;doc.__axvUpload=true;
    doc.addEventListener('change',function(ev){
      var inp=ev.target;
      if(!inp||inp.type!=='file'||inp.__axvRepasse||!inp.files||!inp.files.length)return;
      var arqs=Array.prototype.slice.call(inp.files);
      if(!arqs.some(function(f){return /\.(xlsx|xlsm|xls|csv|txt)$/i.test(f.name);}))return;
      ev.stopImmediatePropagation();
      (async function(){
        var resto=[];
        for(var i=0;i<arqs.length;i++){
          var f=arqs[i],est=null;
          try{est=await classificarEstoque(f);}catch(e){console.warn('[AX] leitura',e);}
          if(est){
            aviso(doc,'⏳ Gravando <b>'+esc(f.name)+'</b> como <b>estoque do almoxarifado</b>… '+est.linhas.length+' linhas.','#15304d');
            try{aviso(doc,textoOK(f.name,await gravarEstoque(est)));}catch(e){aviso(doc,'❌ '+esc(f.name)+': '+esc(e.message||e),'#9b1c1c');}
          }else resto.push(f);
        }
        if(resto.length){ // os outros arquivos seguem para o leitor do módulo
          try{var dt=new w.DataTransfer();resto.forEach(function(f){dt.items.add(f);});inp.files=dt.files;}catch(e){}
          inp.__axvRepasse=true;
          try{inp.dispatchEvent(new w.Event('change',{bubbles:true}));}finally{inp.__axvRepasse=false;}
        }else{try{inp.value='';}catch(e){}}
      })();
    },true);
  }

  // ---------- Fortpel × Verba ----------
  function dadosVerba(w){
    var fort=ler(w,'dbFortpelRaw',[])||[],verba=ler(w,'dbVerbaMap',{})||{},reg=ler(w,'dbRegionaisMap',{})||{},nomes=ler(w,'dbLojaNomeMap',{})||{};
    var ano=Number(ler(w,'fortpelAnoRef',0))||new Date().getFullYear();
    var porMes={},nomeLoja={};
    fort.forEach(function(r){
      var l=cod(r.lojaCodigo!=null?r.lojaCodigo:r.lojaRaw),mes=Number(r.mes);if(!l||!(mes>=1&&mes<=12))return;
      (porMes[mes]=porMes[mes]||{})[l]=(porMes[mes][l]||0)+(Number(r.valor)||0);
      if(!nomeLoja[l]&&r.lojaRaw)nomeLoja[l]=String(r.lojaRaw).replace(/\s+-\s+[A-Z]\s+-\s+.*$/,'');
    });
    var V={};Object.keys(verba).forEach(function(k){var v=Number(verba[k]);if(v>0)V[cod(k)]=v;});
    var R={};Object.keys(reg).forEach(function(k){R[cod(k)]=String(reg[k]||'').trim().toUpperCase();});
    function nome(l){return nomes[l]||nomes[('00'+l).slice(-3)]||nomeLoja[l]||('Loja '+l);}
    return {ano:ano,porMes:porMes,V:V,R:R,nome:nome};
  }
  function montarMes(D,mes){
    var gasto=D.porMes[mes]||{},lojas={};
    Object.keys(D.V).forEach(function(l){lojas[l]=1;});Object.keys(gasto).forEach(function(l){lojas[l]=1;});
    var regs={};
    Object.keys(lojas).forEach(function(l){
      var r=D.R[l]||'SEM REGIONAL',g=gasto[l]||0,v=D.V[l]||0;
      if(r==='FECHADA'&&!g)return;
      var x=regs[r]=regs[r]||{reg:r,verba:0,gasto:0,lojas:[],acima:0,semVerba:0};
      x.verba+=v;x.gasto+=g;
      if(!v&&g)x.semVerba++;else if(v&&g>v)x.acima++;
      x.lojas.push({l:l,nome:D.nome(l),verba:v,gasto:g});
    });
    var lista=Object.keys(regs).map(function(k){var x=regs[k];x.lojas.sort(function(a,b){return (b.gasto-b.verba)-(a.gasto-a.verba);});return x;});
    // CD/escritório não tem verba: vai para o fim
    lista.sort(function(a,b){var ca=a.reg==='CD'||!a.verba,cb=b.reg==='CD'||!b.verba;if(ca!==cb)return ca?1:-1;return a.reg.localeCompare(b.reg);});
    return lista;
  }
  function pct(g,v){return v?Math.round(g/v*100):null;}
  function corPct(p){return p==null?'#8ca4bf':p>100?'#ff6b6b':p>=90?'#f5b041':'#3ddc97';}

  var CSS='#axv-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(3,10,20,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font:14px/1.4 system-ui,Arial}'
    +'#axv-ov .axv-box{background:#0b1626;color:#eaf2ff;border:1px solid #23405f;border-radius:14px;width:min(1100px,100%);padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6)}'
    +'#axv-ov .axv-top{display:flex!important;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px}'
    +'#axv-ov h2{margin:0;font-size:19px}#axv-ov .axv-sub{color:#8ca4bf;font-size:12px}'
    +'#axv-ov select,#axv-ov .axv-b{width:auto!important;background:#15304d;color:#fff;border:1px solid #2d5379;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}'
    +'#axv-ov .axv-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:10px 0 14px}'
    +'#axv-ov .axv-card{background:#10243b;border:1px solid #29425e;border-radius:10px;padding:12px}'
    +'#axv-ov .axv-card b{display:block;font-size:22px;margin:4px 0}#axv-ov .axv-card span{color:#8ca4bf;font-size:12px}'
    +'#axv-ov table{width:100%;border-collapse:collapse;font-size:13px}#axv-ov th{background:#14284a;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#bcd0e6}'
    +'#axv-ov table,#axv-ov td{color:#eaf2ff;font-size:13px}#axv-ov td{padding:7px 8px;border-bottom:1px solid #1c3350}#axv-ov td.n,#axv-ov th.n{text-align:right;white-space:nowrap}'
    +'#axv-ov tr.axv-reg{cursor:pointer;background:#10243b;font-weight:700}#axv-ov tr.axv-reg:hover{background:#163252}'
    +'#axv-ov tr.axv-loja td:first-child{padding-left:26px;color:#cfe0f3}#axv-ov .axv-bar{height:6px;border-radius:4px;background:#1c3350;margin-top:3px;min-width:80px}#axv-ov .axv-bar i{display:block;height:100%;border-radius:4px}'
    +'#axv-ov .axv-nota{color:#8ca4bf;font-size:12px;margin-top:10px}';

  function abrirVerba(){
    var m=moduloAlm();if(!m)return;var w=m.w;
    var D=dadosVerba(w);
    var meses=Object.keys(D.porMes).map(Number).sort(function(a,b){return a-b;});
    if(!meses.length){alert('A base da Fortpel ainda não foi carregada no módulo.');return;}
    var hoje=new Date(),mesSel=meses.indexOf(hoje.getMonth()+1)>=0&&D.ano===hoje.getFullYear()?hoje.getMonth()+1:meses[meses.length-1];
    if(!document.getElementById('axv-css')){var st=document.createElement('style');st.id='axv-css';st.textContent=CSS;document.head.appendChild(st);}
    var ov=document.createElement('div');ov.id='axv-ov';document.body.appendChild(ov);
    var abertas={};
    function fechar(){ov.remove();document.removeEventListener('keydown',tecla);}
    function tecla(e){if(e.key==='Escape')fechar();}
    document.addEventListener('keydown',tecla);
    ov.addEventListener('click',function(e){if(e.target===ov)fechar();});
    function desenhar(){
      var lista=montarMes(D,mesSel);
      var tv=0,tg=0,acima=0,semV=0,nLojas=0;
      lista.forEach(function(x){tv+=x.verba;if(x.verba)tg+=x.gasto;acima+=x.acima;semV+=x.semVerba;nLojas+=x.lojas.filter(function(l){return l.verba;}).length;});
      var foraVerba=lista.reduce(function(s,x){return s+x.lojas.filter(function(l){return !l.verba;}).reduce(function(a,l){return a+l.gasto;},0);},0);
      var andamento=D.ano===hoje.getFullYear()&&mesSel===hoje.getMonth()+1;
      var p=pct(tg,tv);
      var h='<div class="axv-box"><div class="axv-top"><div><h2>💰 Fortpel × Verba — '+MESES[mesSel-1]+'/'+String(D.ano).slice(2)+(andamento?' <span class="axv-sub">(mês em andamento)</span>':'')+'</h2>'
        +'<div class="axv-sub">Compra direta das lojas na Fortpel contra a verba mensal de cada loja · verba da regional = soma das verbas das lojas dela</div></div>'
        +'<div style="display:flex;gap:8px;align-items:center"><select id="axv-mes">'+meses.map(function(mm){return '<option value="'+mm+'"'+(mm===mesSel?' selected':'')+'>'+MESES[mm-1]+'/'+String(D.ano).slice(2)+'</option>';}).join('')+'</select>'
        +'<button type="button" class="axv-b" id="axv-pr">🖨 Imprimir</button><button type="button" class="axv-b" id="axv-x">✕ Fechar</button></div></div>'
        +'<div class="axv-cards">'
        +'<div class="axv-card"><span>Verba do mês (lojas com verba)</span><b>'+brl(tv)+'</b><span>'+nLojas+' lojas</span></div>'
        +'<div class="axv-card"><span>Gasto Fortpel dessas lojas</span><b style="color:'+corPct(p)+'">'+brl(tg)+'</b><span>'+(p==null?'—':p+'% da verba')+'</span></div>'
        +'<div class="axv-card"><span>Lojas acima da verba</span><b style="color:'+(acima?'#ff6b6b':'#3ddc97')+'">'+acima+'</b><span>de '+nLojas+' com verba</span></div>'
        +'<div class="axv-card"><span>Gasto sem verba definida</span><b style="color:'+(foraVerba?'#f5b041':'#3ddc97')+'">'+brl(foraVerba)+'</b><span>CD / lojas sem verba na planilha</span></div>'
        +'</div><table><thead><tr><th>Regional / loja</th><th class="n">Verba</th><th class="n">Gasto Fortpel</th><th class="n">Saldo</th><th class="n">% usado</th><th class="n">Acima</th></tr></thead><tbody>';
      lista.forEach(function(x){
        var px=pct(x.gasto,x.verba),saldo=x.verba-x.gasto,ab=abertas[x.reg];
        h+='<tr class="axv-reg" data-reg="'+esc(x.reg)+'"><td>'+(ab?'▾ ':'▸ ')+esc(x.reg)+' <span class="axv-sub">('+x.lojas.length+' lojas)</span></td><td class="n">'+(x.verba?brl(x.verba):'—')+'</td><td class="n">'+brl(x.gasto)+'</td>'
          +'<td class="n" style="color:'+(x.verba?(saldo<0?'#ff6b6b':'#3ddc97'):'#8ca4bf')+'">'+(x.verba?brl(saldo):'—')+'</td>'
          +'<td class="n" style="color:'+corPct(px)+'">'+(px==null?'sem verba':px+'%')+'<div class="axv-bar"><i style="width:'+Math.min(px||0,100)+'%;background:'+corPct(px)+'"></i></div></td>'
          +'<td class="n">'+(x.acima?'<b style="color:#ff6b6b">'+x.acima+'</b>':'0')+(x.semVerba?' <span class="axv-sub">+'+x.semVerba+' s/ verba</span>':'')+'</td></tr>';
        if(ab)x.lojas.forEach(function(l){
          var pl=pct(l.gasto,l.verba),sl=l.verba-l.gasto;
          h+='<tr class="axv-loja"><td>'+esc(new RegExp('^0*'+l.l+'\\b').test(l.nome)?l.nome:l.l+' - '+l.nome)+'</td><td class="n">'+(l.verba?brl2(l.verba):'<span class="axv-sub">sem verba</span>')+'</td><td class="n">'+brl2(l.gasto)+'</td>'
            +'<td class="n" style="color:'+(l.verba?(sl<0?'#ff6b6b':'#3ddc97'):'#8ca4bf')+'">'+(l.verba?brl2(sl):'—')+'</td>'
            +'<td class="n" style="color:'+corPct(pl)+'">'+(pl==null?(l.gasto?'sem verba':'—'):pl+'%')+'</td><td class="n">'+(l.verba&&l.gasto>l.verba?'<b style="color:#ff6b6b">acima</b>':'')+'</td></tr>';
        });
      });
      h+='<tr style="font-weight:800;background:#14284a"><td>Total (lojas com verba)</td><td class="n">'+brl(tv)+'</td><td class="n">'+brl(tg)+'</td><td class="n" style="color:'+(tv-tg<0?'#ff6b6b':'#3ddc97')+'">'+brl(tv-tg)+'</td><td class="n" style="color:'+corPct(p)+'">'+(p==null?'—':p+'%')+'</td><td class="n">'+acima+'</td></tr>';
      h+='</tbody></table><div class="axv-nota">Fonte: Fortpel carregada no módulo (dbFortpelRaw, ano '+D.ano+') · verba e regional da planilha Loja/Verba/Regional (dbVerbaMap / dbRegionaisMap). Lojas sem verba na planilha: '
        +esc(Object.keys(D.R).filter(function(l){return !D.V[l]&&D.R[l]!=='CD'&&D.R[l]!=='FECHADA';}).sort(function(a,b){return a-b;}).join(', ')||'nenhuma')+'. Clique na regional para ver as lojas.</div></div>';
      ov.innerHTML=h;
      ov.querySelector('#axv-x').onclick=fechar;
      ov.querySelector('#axv-mes').onchange=function(){mesSel=Number(this.value);desenhar();};
      ov.querySelector('#axv-pr').onclick=function(){lista.forEach(function(x){abertas[x.reg]=true;});desenhar();var b=ov.querySelector('.axv-box').outerHTML;var pw=window.open('','_blank');if(!pw)return;pw.document.write('<html><head><meta charset="utf-8"><title>Fortpel x Verba</title><style>'+CSS.replace(/#axv-ov /g,'')+'body{background:#0b1626;margin:0}.axv-box{box-shadow:none}#axv-mes,.axv-b{display:none!important}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>'+b+'<scr'+'ipt>setTimeout(function(){print()},400)</scr'+'ipt></body></html>');pw.document.close();};
      Array.prototype.forEach.call(ov.querySelectorAll('tr.axv-reg'),function(tr){tr.onclick=function(){var r=tr.getAttribute('data-reg');abertas[r]=!abertas[r];desenhar();};});
    }
    desenhar();
  }
  function instalarBotao(){
    var m=moduloAlm();if(!m)return;var doc=m.doc;
    if(doc.getElementById('axv-btn'))return;
    var ref=Array.prototype.slice.call(doc.querySelectorAll('button')).find(function(b){return /Carregar Planilhas/i.test(b.textContent||'');});
    if(!ref||!ref.parentElement)return;
    var b=doc.createElement('button');b.id='axv-btn';b.type='button';b.textContent='💰 Fortpel × Verba';
    b.title='Gasto Fortpel do mês contra a verba de cada loja e regional';
    b.style.cssText='background:#7a4b00;color:#fff;border:1px solid #b9770e;border-radius:8px;padding:9px 14px;font-weight:800;cursor:pointer;font-size:13px;margin-right:8px;width:auto';
    b.onclick=function(e){e.preventDefault();abrirVerba();};
    ref.parentElement.insertBefore(b,ref);
  }
  // ---------- Central de Upload Universal ----------
  // O Almoxarifado tem um campo só na Central ("alm|juntos") e a Central guarda UM arquivo por campo:
  // com Requisição + Estoque AX + Fortpel + Estoque TI escolhidos juntos, cada um apagava o anterior e
  // só o último chegava ao módulo (18/11/2026: Roberto carregou os 4 às 08:30 e só as requisições
  // mudaram). E o módulo não lê o estoque do AX. Agora, para o que for marcado como Almoxarifado:
  //   - estoque do almoxarifado (planilha WMS do AX ou relatório de estoque do sistema, não TI) →
  //     gravado direto na nuvem (alm_carregar_estoque_ax / alm_carregar_estoque_sistema);
  //   - os demais (requisições, Fortpel, Estoque TI) → entregues JUNTOS ao módulo, numa carga só.
  function avisoPortal(msg){try{if(typeof toast==='function')toast(msg);}catch(e){}}
  function usuarioPortal(){
    var s=window.__PORTAL_SESSION||null;if(s&&s.email)return s.email;
    var c=document.getElementById('up-universal-user');return (c&&c.value)||'(usuário local)';
  }
  function registrar(file,sid,linhas){try{if(typeof logUniversalUpload==='function')logUniversalUpload(file,'alm',sid,usuarioPortal(),linhas);}catch(e){}}
  function instalarCentral(){
    if(typeof processUniversalQueue!=='function'||typeof UNIVERSAL_QUEUE==='undefined')return;
    if(processUniversalQueue.__axv)return; // (re)embrulha se outro patch trocou a função
    var original=processUniversalQueue;
    var nova=async function(){
      var alm=[];
      (UNIVERSAL_QUEUE||[]).forEach(function(item,i){
        var sel=document.getElementById('sel-universal-'+i);
        if(sel&&String(sel.value||'').split('|')[0]==='alm')alm.push({item:item,sel:sel});
      });
      if(!alm.length)return original.apply(this,arguments);
      avisoPortal('🔎 Almoxarifado: separando estoque das demais bases...');
      var estoques=[],outros=[];
      for(var k=0;k<alm.length;k++){
        var it=alm[k].item,est=null;
        try{est=await classificarEstoque(it.file);}catch(e){console.warn('[Central/AX]',e);}
        if(est)estoques.push({item:it,est:est});else outros.push(it);
        alm[k].sel.value=''; // a Central original não mexe nestes
      }
      var outrosNaFila=(UNIVERSAL_QUEUE||[]).length>alm.length;
      if(outrosNaFila)original.apply(this,arguments);
      else{UNIVERSAL_QUEUE=[];try{renderUniversalQueue();}catch(e){}}
      for(var j=0;j<estoques.length;j++){
        var e1=estoques[j];
        try{
          var r=await gravarEstoque(e1.est);
          registrar(e1.item.file,'estoque',r.itens);
          avisoPortal('✅ Estoque do almoxarifado: '+e1.item.file.name+' → '+r.itens+' itens · '+brl(r.valor)+(r.sem_custo?' ('+r.sem_custo+' sem custo)':''));
        }catch(err){avisoPortal('❌ '+e1.item.file.name+': '+(err.message||err));console.error('[Central/AX]',err);}
      }
      if(outros.length){
        var fs=getF('alm');Object.keys(fs).forEach(function(x){delete fs[x];});
        outros.forEach(function(it,n){fs[n?'juntos'+n:'juntos']=it.file;registrar(it.file,'juntos',it.rowCount);});
        try{hSF('alm','juntos',outros[0].file);}catch(e){}
        var nm=document.getElementById('fn-alm-juntos');if(nm&&outros.length>1)nm.textContent=outros.map(function(it){return it.file.name;}).join(' + ');
        execMod('alm',true);
        avisoPortal('⚙️ Almoxarifado: '+outros.length+' arquivo(s) enviados juntos ao módulo — '+outros.map(function(it){return it.file.name;}).join(', '));
      }else if(estoques.length){
        // Só estoque: recarrega o módulo para ler a nuvem nova.
        try{if(typeof LOADED!=='undefined'&&LOADED.alm)execMod('alm',false,true);}catch(e){}
      }
      setTimeout(function(){try{loadUniversalLog();loadDashboardFreshness();}catch(e){}},2000);
    };
    nova.__axv=true;
    processUniversalQueue=nova;
  }

  window.__almEstoque={classificar:classificarEstoque,gravar:gravarEstoque};
  window.abrirFortpelVerba=abrirVerba;
  setInterval(function(){try{instalarCentral();}catch(e){}try{instalarUpload();instalarBotao();}catch(e){}},1500);
})();
