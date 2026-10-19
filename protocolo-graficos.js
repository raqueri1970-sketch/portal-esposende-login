/* Protocolo de Curso — painel por loja (2026-10-19).
   Carregado no shell do Portal. Procura, em qualquer módulo aberto (iframes da mesma origem),
   a área com os gráficos "Visualizações por dia", "Top lojas" e "Cobertura por regional"
   e troca por um painel focado em cobrança, sempre por PESSOA e por LOJA:
   - Resumo: quantos completaram o curso, em andamento, não começaram; lojas 100% e lojas zeradas.
   - Cards por cargo: Gerente, Subgerente e Estoquista que completaram o curso.
   - Cobrança por regional e Situação por loja: colaboradores no cadastro × quantos viram × completaram,
     com filtro (pendentes / ninguém começou / 100%) e lista das pessoas de cada loja.
   - Gráficos de uma série só (concluído e andamento nunca no mesmo gráfico).
   - "Liberar CPF": cadastra CPF + nome + cargo + loja para o curso sem depender da planilha mãe do RH.
   - "Copiar cobrança": texto pronto para WhatsApp; "Planilha": CSV por pessoa.
   Os dados vêm do Supabase com a sessão do Portal (RPC curso_painel_lojas, só staff). Se algo falhar,
   os gráficos originais voltam a aparecer — nada do módulo original é apagado. */
(function(){
  if(window.__protocoloGraficos)return;window.__protocoloGraficos=true;
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co';
  var SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var AREA='estoque';
  var DIA=86400000;
  var C={azul:'#3987e5',verde:'#199e70',ambar:'#d69e2e',verm:'#e5484d',cinza:'#475569'};
  var GRUPOS=[['ger','Gerente','Gerentes'],['sub','Subgerente','Subgerentes'],['est','Estoquista','Estoquistas']];
  var NOME_G={ger:'Gerente',sub:'Subgerente',est:'Estoquista'};
  var periodo=30,serie='aprov',cache=null,cacheEm=0;
  var filtro={st:'pend',reg:'',q:''};

  /* ============================ DADOS ============================ */
  function acharSb(){
    var w=window;
    for(var i=0;i<6&&w;i++){
      try{if(w.sb&&w.sb.auth&&typeof w.sb.auth.getSession==='function')return w.sb;}catch(e){}
      if(w===w.parent)break;w=w.parent;
    }
    return null;
  }
  async function token(){
    var sb=acharSb();
    if(sb){try{var s=(await sb.auth.getSession()).data.session;if(s&&s.access_token)return s.access_token;}catch(e){}}
    var w=window;
    for(var i=0;i<6&&w;i++){
      try{if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token)return w.__PORTAL_SESSION.access_token;}catch(e){}
      if(w===w.parent)break;w=w.parent;
    }
    return null;
  }
  async function get(tk,path){
    var r=await fetch(SB_URL+'/rest/v1/'+path,{headers:{apikey:SB_KEY,Authorization:'Bearer '+tk}});
    if(!r.ok)throw new Error(path.split('?')[0]+' '+r.status);
    return r.json();
  }
  async function rpc(nome,corpo){
    var tk=await token();if(!tk)throw new Error('sem sessão do Portal');
    var r=await fetch(SB_URL+'/rest/v1/rpc/'+nome,{method:'POST',
      headers:{apikey:SB_KEY,Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify(corpo||{})});
    var txt=await r.text(),j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
    if(!r.ok)throw new Error((j&&(j.message||j.hint))||(nome+' '+r.status));
    return j;
  }
  async function carregar(forcar){
    if(cache&&!forcar&&Date.now()-cacheEm<60000)return cache;
    var tk=await token();if(!tk)throw new Error('sem sessão do Portal');
    var res=await Promise.all([
      rpc('curso_painel_lojas',{p_area_id:AREA}),
      get(tk,'portal_lojas?select=codigo,nome,ativo,regional_id'),
      get(tk,'portal_regionais?select=id,nome,ativo'),
      get(tk,'curso_catalogo?select=id,nome,ordem,area_id,ativo&area_id=eq.'+AREA),
      get(tk,'curso_visualizacoes?select=modulo_id,criado_em,avaliado_em,avaliacao_aprovada&order=criado_em.asc&limit=50000')
    ]);
    cache={pes:res[0]||[],lojas:res[1],regs:res[2],cat:res[3].filter(function(c){return c.ativo!==false;}),vis:res[4]};cacheEm=Date.now();
    return cache;
  }

  /* ============================ CÁLCULO ============================ */
  function chaveDia(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function inicioDia(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  function titulo(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(c){return c.toUpperCase();});}
  function nomeCurto(s){var p=titulo(s).split(' ').filter(Boolean);return p.length>2?p[0]+' '+p[p.length-1]:p.join(' ');}
  function ordemSt(s){return {nao:0,and:1,ok:2}[s];}
  function ordemG(g){var o={ger:0,sub:1,est:2}[g];return o==null?3:o;}
  function ordemLoja(s){return {zerada:0,parcial:1,ok:2,vazia:3}[s];}

  function calcular(d){
    var regPorId={},lojaPorCod={},modIds={};
    d.regs.forEach(function(r){regPorId[r.id]=r;});
    d.lojas.forEach(function(l){lojaPorCod[l.codigo]=l;});
    d.cat.forEach(function(c){modIds[c.id]=1;});
    var totMods=d.cat.length;
    var lojas={},regs={};
    function novaLoja(cod){
      var l=lojaPorCod[cod],r=l&&regPorId[l.regional_id];
      return {cod:cod,nome:cod==null?'Sem loja na base do RH':cod+' · '+titulo(l?l.nome:'Loja não cadastrada'),
        reg:cod==null?'—':(r?titulo(r.nome):'Sem regional'),pes:[],n:0,ok:0,and:0,nao:0,
        g:{ger:[0,0],sub:[0,0],est:[0,0],out:[0,0]}};
    }
    // Toda loja ativa aparece, mesmo sem ninguém no cadastro.
    d.lojas.forEach(function(l){if(l.ativo!==false)lojas[l.codigo]=novaLoja(l.codigo);});
    var tot={n:0,ok:0,and:0,nao:0,g:{}};
    ['ger','sub','est','out'].forEach(function(g){tot.g[g]={n:0,ok:0,and:0,nao:0};});
    d.pes.forEach(function(p){
      var aprov=(p.aprovados||[]).filter(function(m){return modIds[m];}).length;
      p.nAprov=aprov;
      p.st=totMods&&aprov>=totMods?'ok':(p.iniciados>0?'and':'nao');
      var k=p.loja_codigo==null?'x':p.loja_codigo;
      var L=lojas[k]||(lojas[k]=novaLoja(p.loja_codigo));
      L.pes.push(p);L.n++;L[p.st]++;
      var gl=L.g[p.grupo]||L.g.out;gl[0]++;if(p.st==='ok')gl[1]++;
      tot.n++;tot[p.st]++;
      var tg=tot.g[p.grupo]||tot.g.out;tg.n++;tg[p.st]++;
    });
    var lista=Object.keys(lojas).map(function(k){
      var L=lojas[k];
      L.pct=L.n?L.ok/L.n:0;
      L.status=!L.n?'vazia':L.ok===L.n?'ok':(L.ok+L.and===0?'zerada':'parcial');
      L.pes.sort(function(a,b){return ordemSt(a.st)-ordemSt(b.st)||ordemG(a.grupo)-ordemG(b.grupo)||String(a.nome).localeCompare(b.nome);});
      return L;
    }).sort(function(a,b){
      if((a.cod==null)!==(b.cod==null))return a.cod==null?1:-1;
      return ordemLoja(a.status)-ordemLoja(b.status)||a.pct-b.pct||b.n-a.n||(a.cod||0)-(b.cod||0);
    });
    lista.forEach(function(L){
      if(L.cod==null||!L.n)return;
      var R=regs[L.reg]||(regs[L.reg]={nome:L.reg,lojas:0,n:0,ok:0,and:0,nao:0,zeradas:0,cem:0});
      R.lojas++;R.n+=L.n;R.ok+=L.ok;R.and+=L.and;R.nao+=L.nao;
      if(L.status==='zerada')R.zeradas++;if(L.status==='ok')R.cem++;
    });
    var rl=Object.keys(regs).map(function(k){var R=regs[k];R.pct=R.n?R.ok/R.n:0;return R;})
      .sort(function(a,b){return a.pct-b.pct||b.zeradas-a.zeradas||a.nome.localeCompare(b.nome);});

    // Por módulo: pessoas aprovadas em cada módulo (uma série só).
    var mods=d.cat.slice().sort(function(a,b){return (a.ordem||99)-(b.ordem||99);}).map(function(c){
      var n=0;d.pes.forEach(function(p){if((p.aprovados||[]).indexOf(c.id)>=0)n++;});
      return {nome:c.nome,n:n};
    });

    // Série diária: módulos aprovados (avaliado_em) ou acessos iniciados (criado_em).
    var hoje=inicioDia(new Date()),corte=periodo?new Date(hoje.getTime()-(periodo-1)*DIA):null;
    var pontos=d.vis.filter(function(v){return modIds[v.modulo_id];}).map(function(v){
      if(serie==='aprov')return v.avaliacao_aprovada?new Date(v.avaliado_em||v.criado_em):null;
      return new Date(v.criado_em);
    }).filter(function(x){return x&&(!corte||x>=corte);});
    var ini=corte||(pontos.length?inicioDia(new Date(Math.min.apply(null,pontos.map(Number)))):hoje);
    var dias=[],porDia={};
    for(var t=ini.getTime();t<=hoje.getTime()+1000;t+=DIA){
      var dd=inicioDia(new Date(t+3*3600000)),kk=chaveDia(dd); // robusto a horário de verão
      if(porDia[kk])continue;porDia[kk]={d:dd,v:0};dias.push(porDia[kk]);
    }
    pontos.forEach(function(x){var p=porDia[chaveDia(x)];if(p)p.v++;});

    var reais=lista.filter(function(L){return L.cod!=null&&L.n;});
    return {tot:tot,lojas:lista,regs:rl,mods:mods,dias:dias,totMods:totMods,lojasAtivas:reais.length,
      lojasOk:reais.filter(function(L){return L.status==='ok';}).length,
      lojasZeradas:reais.filter(function(L){return L.status==='zerada';}).length};
  }

  /* ============================ VISUAL ============================ */
  var CSS=''
  +'.pg{--s1:#0f1a2e;--s2:#0b1424;--bd:#1f2d47;--tx:#eef3fb;--t2:#a9b7cc;--t3:#6f819c;--grid:#1c2943;'
  +'font-family:inherit;color:var(--tx);display:flex;flex-direction:column;gap:14px;margin:0 0 14px}'
  +'.pg *{box-sizing:border-box}'
  +'.pg-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
  +'.pg-tt{font-size:15px;font-weight:800}.pg-tt small{display:block;font-size:12px;font-weight:500;color:var(--t3);margin-top:2px}'
  +'.pg-acts{display:flex;gap:8px;flex-wrap:wrap}'
  +'.pg-btn{all:unset;cursor:pointer;font-size:12.5px;font-weight:700;color:var(--tx);background:var(--s2);border:1px solid var(--bd);padding:8px 13px;border-radius:9px;white-space:nowrap}'
  +'.pg-btn:hover{border-color:#36507a}.pg-btn.pri{background:#1f6f4f;border-color:#279467}.pg-btn.pri:hover{background:#238259}'
  +'.pg-btn[disabled]{opacity:.6;cursor:default}'
  +'.pg-btn:focus-visible,.pg-seg button:focus-visible,.pg-chip:focus-visible,.pg-x:focus-visible{outline:2px solid '+C.azul+';outline-offset:2px}'
  +'.pg-seg{display:inline-flex;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:3px;gap:2px}'
  +'.pg-seg button{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:var(--t2);padding:6px 12px;border-radius:7px}'
  +'.pg-seg button:hover{color:var(--tx)}.pg-seg button[aria-pressed=true]{background:#1d3a63;color:#fff}'
  +'.pg-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}'
  +'.pg-kpi{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;border-top:3px solid var(--c)}'
  +'.pg-kpi b{display:block;font-size:28px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}'
  +'.pg-kpi>span{display:block;font-size:12.5px;font-weight:700;color:var(--tx);margin-top:4px}'
  +'.pg-kpi>small{display:block;font-size:11.5px;color:var(--t3);margin-top:2px}'
  +'.pg-cargos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'
  +'.pg-cg{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px 16px}'
  +'.pg-cg h5{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--t2)}'
  +'.pg-cg .big{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}.pg-cg .big small{font-size:14px;color:var(--t2);font-weight:600}'
  +'.pg-cg .pc{float:right;font-size:20px;font-weight:800;color:'+C.verde+'}'
  +'.pg-cg .lin{font-size:12px;color:var(--t3);margin-top:8px}.pg-cg .lin b{color:var(--t2)}'
  +'.pg-meter{height:8px;background:var(--s2);border-radius:5px;overflow:hidden;margin-top:8px}.pg-meter i{display:block;height:100%;border-radius:5px}'
  +'.pg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'
  +'.pg-card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;min-width:0}'
  +'.pg-card.full{grid-column:1/-1}'
  +'.pg-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:0 0 4px}'
  +'.pg-h h4{margin:0;font-size:14px;font-weight:800;letter-spacing:.2px;color:var(--tx)}'
  +'.pg-sub{font-size:12px;color:var(--t3);margin:0 0 12px}'
  +'.pg svg{display:block;width:100%;overflow:visible}'
  +'.pg-row{display:grid;grid-template-columns:minmax(110px,40%) 1fr 56px;align-items:center;gap:10px;padding:5px 0;border-radius:6px}'
  +'.pg-nm{font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  +'.pg-trk{height:12px;background:var(--s2);border-radius:4px;overflow:hidden}.pg-trk i{display:block;height:100%;border-radius:4px}'
  +'.pg-v{font-size:13px;font-weight:800;text-align:right;color:var(--tx);font-variant-numeric:tabular-nums}'
  +'.pg-v small{display:block;font-weight:500;font-size:11px;color:var(--t3)}'
  +'.pg-vazio{font-size:13px;color:var(--t3);padding:18px 0;text-align:center}'
  +'.pg-nota{font-size:11.5px;color:var(--t3);margin-top:10px;line-height:1.7}'
  +'.pg-tbl{width:100%;border-collapse:collapse;font-size:12.5px}'
  +'.pg-tbl th{font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;text-align:left;padding:7px 8px;border-bottom:1px solid var(--bd);white-space:nowrap}'
  +'.pg-tbl td{padding:8px;border-bottom:1px solid #18243b;vertical-align:middle}'
  +'.pg-tbl .n{text-align:right;font-variant-numeric:tabular-nums}.pg-tbl .c{text-align:center}'
  +'.pg-tbl tbody tr.lj{cursor:pointer}.pg-tbl tbody tr.lj:hover td{background:rgba(255,255,255,.03)}'
  +'.pg-tbl tr.det td{background:var(--s2);padding:10px 12px}'
  +'.pg-pct{display:flex;align-items:center;gap:8px;min-width:110px}.pg-pct .pg-trk{flex:1;height:8px}.pg-pct b{width:38px;text-align:right;font-variant-numeric:tabular-nums}'
  +'.pg-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;flex:0 0 auto}'
  +'.pg-cgx{display:inline-block;min-width:34px;padding:2px 6px;border-radius:6px;font-size:11.5px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums}'
  +'.pg-cgx.ok{background:rgba(25,158,112,.18);color:#5fd3a6}.pg-cgx.pa{background:rgba(214,158,46,.16);color:#f0c66b}.pg-cgx.no{background:rgba(229,72,77,.16);color:#ff8f93}.pg-cgx.na{color:var(--t3)}'
  +'.pg-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}'
  +'.pg-chip{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:var(--t2);padding:6px 11px;border-radius:999px;border:1px solid var(--bd);background:var(--s2)}'
  +'.pg-chip[aria-pressed=true]{color:#fff;border-color:#36507a;background:#1d3a63}'
  +'.pg-in{font:inherit;font-size:12.5px;color:var(--tx);background:var(--s2);border:1px solid var(--bd);border-radius:9px;padding:7px 10px;min-width:0}'
  +'.pg-in:focus{outline:2px solid '+C.azul+';outline-offset:1px}'
  +'.pg-fil{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}'
  +'.pg-pes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 18px}'
  +'.pg-pe{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0;min-width:0}'
  +'.pg-pe .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pg-pe .nm small{color:var(--t3);margin-left:6px}'
  +'.pg-pe .md{font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--t2)}'
  +'.pg-tag{font-size:10px;font-weight:800;color:#c4b5fd;border:1px solid #5b4b9a;border-radius:5px;padding:0 4px;margin-left:6px}'
  +'.pg-tip{position:fixed;z-index:2147483000;pointer-events:none;background:#081120;border:1px solid #2b3e5f;border-radius:10px;'
  +'padding:9px 11px;font-size:12px;color:#eef3fb;box-shadow:0 10px 30px rgba(0,0,0,.45);min-width:150px;display:none;line-height:1.5}'
  +'.pg-tip b{display:block;font-size:12.5px;margin-bottom:3px}'
  +'.pg-tip .r{display:flex;justify-content:space-between;gap:14px}.pg-tip .r span:last-child{font-weight:800}'
  +'.pg-erro{background:#2a1418;border:1px solid #5b2630;color:#fecaca;border-radius:10px;padding:10px 12px;font-size:12.5px}'
  +'.pg-ok{background:#0f2a20;border:1px solid #1f6f4f;color:#b7f0d6;border-radius:10px;padding:10px 12px;font-size:12.5px}'
  +'.pg-modal{position:fixed;inset:0;z-index:2147482000;background:rgba(3,8,18,.72);display:flex;flex-direction:row;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;margin:0}'
  +'.pg-modal .box{width:100%;max-width:620px;background:#0f1a2e;border:1px solid #2b3e5f;border-radius:16px;padding:20px 22px;color:#eef3fb;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
  +'.pg-modal h3{margin:0 0 4px;font-size:17px}.pg-modal p.s{margin:0 0 16px;font-size:12.5px;color:#a9b7cc;line-height:1.5}'
  +'.pg-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pg-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:#a9b7cc}'
  +'.pg-form .w{grid-column:1/-1}.pg-form .pg-in{padding:9px 11px;font-size:13.5px}.pg-form .pg-in[disabled]{opacity:.45}'
  +'.pg-modal .rod{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}'
  +'.pg-modal .lib{margin-top:18px;border-top:1px solid #1f2d47;padding-top:14px}.pg-modal .lib h4{margin:0 0 8px;font-size:13px}'
  +'.pg-modal .lib .it{display:flex;align-items:center;gap:10px;font-size:12.5px;padding:6px 0;border-bottom:1px solid #18243b}'
  +'.pg-modal .lib .it span{flex:1;min-width:0}.pg-modal .lib .it small{color:#6f819c}'
  +'.pg-x{all:unset;cursor:pointer;font-size:11.5px;font-weight:700;color:#ff8f93}'
  +'@media (max-width:980px){.pg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pg-cargos{grid-template-columns:1fr}}'
  +'@media (max-width:820px){.pg-grid{grid-template-columns:1fr}.pg-form{grid-template-columns:1fr}.pg-tbl .hm{display:none}}';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pct(a,b){return b?Math.round(a/b*100)+'%':'—';}
  function plural(n,s,p){return n+' '+(n===1?s:p);}
  function dataBR(s){if(!s)return '—';var d=new Date(s);return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);}

  // Tooltip único por documento
  function tip(doc){
    var t=doc.querySelector('.pg-tip');
    if(!t){t=doc.createElement('div');t.className='pg-tip';doc.body.appendChild(t);}
    return t;
  }
  function ligarTip(root,doc){
    var t=tip(doc);
    root.addEventListener('mousemove',function(e){
      var el=e.target.closest&&e.target.closest('[data-tip]');
      if(!el||!root.contains(el)){t.style.display='none';return;}
      t.innerHTML=el.getAttribute('data-tip');t.style.display='block';
      var w=doc.defaultView,x=e.clientX+14,y=e.clientY+14,r=t.getBoundingClientRect();
      if(x+r.width>w.innerWidth-8)x=e.clientX-r.width-14;
      if(y+r.height>w.innerHeight-8)y=e.clientY-r.height-14;
      t.style.left=Math.max(8,x)+'px';t.style.top=Math.max(8,y)+'px';
    });
    root.addEventListener('mouseleave',function(){t.style.display='none';});
  }
  function tipHtml(titulo,linhas){
    return esc('<b>'+esc(titulo)+'</b>'+linhas.map(function(l){
      return '<div class="r"><span>'+esc(l[0])+'</span><span>'+esc(l[1])+'</span></div>';
    }).join(''));
  }

  // Resumo do topo
  function kpis(r){
    var t=r.tot;
    function k(cor,num,rot,sub){return '<div class="pg-kpi" style="--c:'+cor+'"><b>'+num+'</b><span>'+rot+'</span><small>'+sub+'</small></div>';}
    return '<div class="pg-kpis">'
      +k(C.verde,t.ok,'Completaram o curso',pct(t.ok,t.n)+' de '+plural(t.n,'colaborador','colaboradores')+' do público')
      +k(C.ambar,t.and,'Em andamento','começaram e ainda faltam módulos')
      +k(C.verm,t.nao,'Não começaram','nenhum módulo assistido')
      +k(C.azul,r.lojasOk+'<small style="font-size:15px;color:var(--t3);font-weight:600"> / '+r.lojasAtivas+'</small>','Lojas com 100% completo',
        '<b style="display:inline;font-size:inherit;color:#ff8f93">'+plural(r.lojasZeradas,'loja zerada','lojas zeradas')+'</b> (ninguém começou)')
      +'</div>';
  }

  // Cards por cargo: só quem completou (uma métrica por barra)
  function cargos(r){
    return '<div class="pg-cargos">'+GRUPOS.map(function(g){
      var x=r.tot.g[g[0]],p=x.n?x.ok/x.n:0;
      return '<div class="pg-cg"><h5>'+g[2]+' com curso completo</h5>'
        +'<span class="pc">'+pct(x.ok,x.n)+'</span><div class="big">'+x.ok+' <small>de '+x.n+'</small></div>'
        +'<div class="pg-meter"><i style="width:'+(p*100)+'%;background:'+C.verde+'"></i></div>'
        +'<div class="lin"><b>'+x.and+'</b> em andamento · <b style="color:#ff8f93">'+x.nao+'</b> não começaram</div></div>';
    }).join('')+'</div>';
  }

  function barraPct(p,cor){
    return '<div class="pg-pct"><div class="pg-trk"><i style="width:'+(p*100)+'%;background:'+cor+'"></i></div><b>'+Math.round(p*100)+'%</b></div>';
  }
  function corPct(p){return p>=1?C.verde:p>=.5?C.azul:p>0?C.ambar:C.verm;}

  // Cobrança por regional
  function tabRegionais(r){
    if(!r.regs.length)return '<div class="pg-vazio">Sem lojas cadastradas.</div>';
    return '<div style="overflow-x:auto"><table class="pg-tbl"><thead><tr><th>Regional</th><th class="n hm">Lojas</th><th class="n">Colab.</th><th class="n">Completos</th><th>% completo</th><th class="n">Zeradas</th></tr></thead><tbody>'
      +r.regs.map(function(g){
        return '<tr class="lj" data-reg="'+esc(g.nome)+'" title="Ver as lojas desta regional"><td><b>'+esc(g.nome)+'</b></td>'
          +'<td class="n hm">'+g.lojas+'</td><td class="n">'+g.n+'</td><td class="n"><b>'+g.ok+'</b></td>'
          +'<td>'+barraPct(g.pct,corPct(g.pct))+'</td>'
          +'<td class="n"><span class="pg-cgx '+(g.zeradas?'no':'ok')+'">'+g.zeradas+'</span></td></tr>';
      }).join('')+'</tbody></table></div>';
  }

  function celCargo(x){
    if(!x[0])return '<span class="pg-cgx na" title="Ninguém com este cargo no cadastro">—</span>';
    var cl=x[1]===x[0]?'ok':x[1]?'pa':'no';
    return '<span class="pg-cgx '+cl+'">'+x[1]+'/'+x[0]+'</span>';
  }
  function stLoja(s){
    return {zerada:['Ninguém começou',C.verm],parcial:['Parcial',C.ambar],ok:['100% completo',C.verde],vazia:['Sem público no cadastro',C.cinza]}[s];
  }
  function lojasFiltradas(r){
    var q=filtro.q.toLowerCase();
    return r.lojas.filter(function(L){
      if(filtro.reg&&L.reg!==filtro.reg)return false;
      if(filtro.st==='pend'&&!(L.status==='zerada'||L.status==='parcial'))return false;
      if(filtro.st==='zerada'&&L.status!=='zerada')return false;
      if(filtro.st==='ok'&&L.status!=='ok')return false;
      if(q&&(L.nome+' '+L.reg+' '+L.pes.map(function(p){return p.nome;}).join(' ')).toLowerCase().indexOf(q)<0)return false;
      return true;
    });
  }
  function detalhePessoas(L,totMods){
    if(!L.pes.length)return '<div class="pg-nota" style="margin:0">Nenhum gerente, subgerente ou estoquista desta loja na base do RH. Use “Liberar CPF” para incluir.</div>';
    return '<div class="pg-pes">'+L.pes.map(function(p){
      var cor=p.st==='ok'?C.verde:p.st==='and'?C.ambar:C.verm;
      var t=p.st==='ok'?'Completo':p.st==='and'?'Em andamento':'Não começou';
      return '<div class="pg-pe" data-tip="'+tipHtml(titulo(p.nome),[['Cargo',p.cargo],['Situação',t],['Módulos aprovados',p.nAprov+' de '+totMods],['Último acesso',dataBR(p.ultimo_acesso)],['CPF',p.cpf_mask]])+'">'
        +'<span class="pg-dot" style="background:'+cor+'" title="'+t+'"></span>'
        +'<span class="nm">'+esc(nomeCurto(p.nome))+'<small>'+esc(NOME_G[p.grupo]||p.cargo)+'</small>'
        +(p.origem==='manual'?'<span class="pg-tag">MANUAL</span>':'')+'</span>'
        +'<span class="md">'+p.nAprov+'/'+totMods+'</span></div>';
    }).join('')+'</div>';
  }
  function tabLojas(r,box){
    var regs=r.regs.map(function(g){return g.nome;});
    var cont={todas:r.lojas.length,pend:0,zerada:0,ok:0};
    r.lojas.forEach(function(L){if(L.status==='zerada'||L.status==='parcial')cont.pend++;if(L.status==='zerada')cont.zerada++;if(L.status==='ok')cont.ok++;});
    var fil='<div class="pg-fil"><div class="pg-chips" role="group" aria-label="Situação da loja">'
      +[['pend','Pendentes'],['zerada','Ninguém começou'],['ok','100% completo'],['todas','Todas']].map(function(c){
        return '<button type="button" class="pg-chip" data-st="'+c[0]+'" aria-pressed="'+(filtro.st===c[0])+'">'+c[1]+' · '+cont[c[0]]+'</button>';}).join('')
      +'</div><select class="pg-in" data-f="reg" aria-label="Regional"><option value="">Todas as regionais</option>'
      +regs.map(function(n){return '<option'+(filtro.reg===n?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select>'
      +'<input class="pg-in" data-f="q" type="search" aria-label="Buscar loja ou pessoa" placeholder="Buscar loja ou pessoa…" value="'+esc(filtro.q)+'" style="flex:1;min-width:160px"></div>';
    var lista=lojasFiltradas(r),abertas=box.__abertas||{};
    if(!lista.length)return fil+'<div class="pg-vazio">Nenhuma loja neste filtro.</div>';
    return fil+'<div style="overflow-x:auto"><table class="pg-tbl"><thead><tr><th>Loja</th><th class="hm">Regional</th>'
      +'<th class="n" title="Gerente, subgerente e estoquista no cadastro">Cadastro</th><th class="n" title="Assistiram pelo menos 1 módulo">Viram</th>'
      +'<th class="n">Completos</th><th>% completo</th><th class="c">Ger</th><th class="c">Sub</th><th class="c">Est</th></tr></thead><tbody>'
      +lista.map(function(L){
        var s=stLoja(L.status),k=String(L.cod==null?'x':L.cod),ab=!!abertas[k];
        return '<tr class="lj" data-loja="'+k+'" aria-expanded="'+ab+'" tabindex="0"><td><span style="display:flex;align-items:center"><span class="pg-dot" style="background:'+s[1]+'" title="'+s[0]+'"></span><b>'+esc(L.nome)+'</b></span></td>'
          +'<td class="hm" style="color:var(--t2)">'+esc(L.reg)+'</td><td class="n">'+L.n+'</td><td class="n">'+(L.ok+L.and)+'</td>'
          +'<td class="n"><b>'+L.ok+'</b></td><td>'+barraPct(L.pct,corPct(L.pct))+'</td>'
          +'<td class="c">'+celCargo(L.g.ger)+'</td><td class="c">'+celCargo(L.g.sub)+'</td><td class="c">'+celCargo(L.g.est)+'</td></tr>'
          +(ab?'<tr class="det"><td colspan="9">'+detalhePessoas(L,r.totMods)+'</td></tr>':'');
      }).join('')+'</tbody></table></div>'
      +'<div class="pg-nota">Clique na loja para ver as pessoas. Ger/Sub/Est = completos sobre cadastrados: <span class="pg-cgx ok">1/1</span> todos · <span class="pg-cgx pa">1/2</span> parte · <span class="pg-cgx no">0/1</span> nenhum. '
      +'Loja = a da base do RH; quem está sem loja na base entra pela loja que digitou ao assistir.</div>';
  }

  // Série diária (uma série por vez)
  function grafDias(r,largura){
    var dias=r.dias,n=dias.length,cor=serie==='aprov'?C.verde:C.azul;
    if(!dias.some(function(d){return d.v;}))return '<div class="pg-vazio">Nada no período.</div>';
    var W=1000,H=200,pl=34,pr=8,pt=22,pb=28,iw=W-pl-pr,ih=H-pt-pb;
    var max=Math.max.apply(null,dias.map(function(d){return d.v;}).concat([1]));
    var passo=max<=5?1:max<=10?2:max<=25?5:Math.ceil(max/5/5)*5;
    var topo=Math.ceil(max/passo)*passo;
    var y=function(v){return pt+ih-v/topo*ih;};
    var bw=iw/n,larg=Math.max(2,Math.min(30,bw*0.62));
    var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:'+H+'px" aria-hidden="true">';
    for(var g=0;g<=topo;g+=passo)
      s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"'+(g?' stroke-dasharray="3 4"':'')+'/>';
    s+='</svg>';
    // Rótulos e barras em HTML sobreposto (texto não distorce com preserveAspectRatio=none)
    var html='<div style="position:relative;height:'+H+'px" role="img" aria-label="'+(serie==='aprov'?'Módulos aprovados':'Acessos iniciados')+' por dia">'+s;
    for(g=0;g<=topo;g+=passo)
      html+='<div style="position:absolute;left:0;width:'+(pl-6)/W*100+'%;top:'+(y(g)-7)+'px;font-size:11px;color:var(--t3);text-align:right">'+g+'</div>';
    var cadaRot=Math.max(1,Math.ceil(n/Math.max(3,Math.min(12,Math.floor((largura||1000)/64)))));
    var comValor=dias.filter(function(d){return d.v;}).length;
    dias.forEach(function(d,i){
      var cx=(pl+bw*i+bw/2)/W*100,h=d.v/topo*ih;
      var dd=('0'+d.d.getDate()).slice(-2)+'/'+('0'+(d.d.getMonth()+1)).slice(-2);
      var semana=d.d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');
      html+='<div data-tip="'+tipHtml(semana+', '+dd,[[serie==='aprov'?'Módulos aprovados':'Acessos iniciados',d.v]])+'" '
        +'style="position:absolute;left:'+(pl+bw*i)/W*100+'%;width:'+bw/W*100+'%;top:'+pt+'px;height:'+ih+'px">'
        +(d.v?'<div style="position:absolute;left:50%;transform:translateX(-50%);width:'+Math.max(4,larg/bw*100)+'%;bottom:0;height:'+h+'px;background:'+cor+';border-radius:4px 4px 0 0"></div>':'')
        +'</div>';
      if(d.v&&comValor<=20)
        html+='<div style="position:absolute;left:'+cx+'%;transform:translateX(-50%);top:'+(y(d.v)-18)+'px;font-size:11.5px;font-weight:800;pointer-events:none">'+d.v+'</div>';
      if(i%cadaRot===0||i===n-1)
        html+='<div style="position:absolute;left:'+cx+'%;transform:translateX(-50%);top:'+(H-pb+8)+'px;font-size:11px;color:'+(d.v?'var(--t2)':'var(--t3)')+';white-space:nowrap;pointer-events:none">'+dd+'</div>';
    });
    return html+'</div>';
  }

  // Por módulo: pessoas aprovadas (uma série)
  function grafMods(r){
    if(!r.mods.length)return '<div class="pg-vazio">Nenhum módulo ativo.</div>';
    var base=r.tot.n||1;
    return r.mods.map(function(m,i){
      return '<div class="pg-row" data-tip="'+tipHtml(m.nome,[['Aprovados',m.n],['Do público',pct(m.n,r.tot.n)]])+'">'
        +'<div class="pg-nm">'+(i+1)+'. '+esc(m.nome)+'</div>'
        +'<div class="pg-trk"><i style="width:'+(m.n/base*100)+'%;background:'+C.verde+'"></i></div>'
        +'<div class="pg-v">'+m.n+'<small>'+pct(m.n,r.tot.n)+'</small></div></div>';
    }).join('')+'<div class="pg-nota">Pessoas aprovadas em cada módulo, na ordem do curso. A queda de um módulo para o outro mostra onde o pessoal para.</div>';
  }

  function montar(box,r){
    box.__r=r;
    var nomePer=periodo?'últimos '+periodo+' dias':'todo o período';
    var semLoja=r.lojas.filter(function(L){return L.cod==null;})[0];
    box.innerHTML=''
      +'<div class="pg-bar"><div class="pg-tt">Treinamento Operações de Estoque<small>Público: gerentes, subgerentes e estoquistas da base do RH + CPFs liberados manualmente · curso completo = '+plural(r.totMods,'módulo aprovado','módulos aprovados')+'</small></div>'
      +'<div class="pg-acts"><button type="button" class="pg-btn pri" data-acao="liberar">＋ Liberar CPF</button>'
      +'<button type="button" class="pg-btn" data-acao="cobranca" title="Copia as lojas pendentes do filtro atual, por regional, para colar no WhatsApp">📋 Copiar cobrança</button>'
      +'<button type="button" class="pg-btn" data-acao="csv" title="Uma linha por pessoa, abre no Excel">⬇ Planilha</button></div></div>'
      +'<div data-msg></div>'
      +kpis(r)+cargos(r)
      +'<div class="pg-card"><div class="pg-h"><h4>Situação por loja</h4></div><p class="pg-sub">Da loja mais atrasada para a mais adiantada. Cadastro = gerente, sub e estoquista; Viram = assistiram 1+ módulo; Completos = curso inteiro aprovado.</p><div data-lojas>'+tabLojas(r,box)+'</div>'
      +(semLoja&&semLoja.n?'<div class="pg-nota">⚠ '+plural(semLoja.n,'pessoa do público está','pessoas do público estão')+' sem loja na base do RH e nunca assistiu — aparecem em “Sem loja na base do RH” (filtro Todas). Corrija a loja na planilha mãe ou libere o CPF com a loja certa.</div>':'')+'</div>'
      +'<div class="pg-grid">'
      +'<div class="pg-card"><div class="pg-h"><h4>Cobrança por regional</h4></div><p class="pg-sub">Da regional mais atrasada para a mais adiantada. Clique para ver as lojas.</p>'+tabRegionais(r)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Aprovados por módulo</h4></div><p class="pg-sub">De '+plural(r.tot.n,'pessoa','pessoas')+' do público.</p>'+grafMods(r)+'</div>'
      +'<div class="pg-card full"><div class="pg-h"><h4>'+(serie==='aprov'?'Módulos aprovados por dia':'Acessos iniciados por dia')+'</h4>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="pg-seg" role="group" aria-label="O que mostrar">'
      +[['aprov','Aprovados'],['ini','Acessos']].map(function(p){return '<button type="button" data-serie="'+p[0]+'" aria-pressed="'+(serie===p[0])+'">'+p[1]+'</button>';}).join('')
      +'</div><div class="pg-seg" role="group" aria-label="Período">'
      +[[7,'7 dias'],[30,'30 dias'],[0,'Tudo']].map(function(p){return '<button type="button" data-per="'+p[0]+'" aria-pressed="'+(periodo===p[0])+'">'+p[1]+'</button>';}).join('')
      +'</div></div></div><p class="pg-sub">'+(serie==='aprov'?'Módulos com avaliação aprovada em cada dia':'Vídeos abertos em cada dia, concluídos ou não')+' — '+nomePer+'.</p>'+grafDias(r,box.clientWidth-40)+'</div>'
      +'</div>';
  }
  function redesenharLojas(box){
    var alvo=box.querySelector('[data-lojas]');if(!alvo||!box.__r)return;
    var foco=box.ownerDocument.activeElement,f=foco&&foco.getAttribute&&foco.getAttribute('data-f'),pos=f==='q'?foco.selectionStart:null;
    alvo.innerHTML=tabLojas(box.__r,box);
    if(f){var el=alvo.querySelector('[data-f="'+f+'"]');if(el){el.focus();if(pos!=null)try{el.setSelectionRange(pos,pos);}catch(e){}}}
  }
  function msg(box,html,tipo){
    var m=box.querySelector('[data-msg]');if(!m)return;
    m.innerHTML=html?'<div class="'+(tipo==='erro'?'pg-erro':'pg-ok')+'">'+html+'</div>':'';
    clearTimeout(box.__tm);box.__tm=setTimeout(function(){m.innerHTML='';},7000);
  }

  /* ============================ COBRANÇA E PLANILHA ============================ */
  function textoCobranca(r){
    var lojas=lojasFiltradas(r).filter(function(L){return L.cod!=null&&(L.status==='zerada'||L.status==='parcial');});
    var t='*Treinamento Operações de Estoque — pendências '+new Date().toLocaleDateString('pt-BR')+'*\n';
    t+='Rede: '+r.tot.ok+' de '+r.tot.n+' completaram ('+pct(r.tot.ok,r.tot.n)+') · '+plural(r.lojasZeradas,'loja zerada','lojas zeradas')+'\n';
    if(!lojas.length)return t+'\nNenhuma loja pendente neste filtro. ✅';
    var porReg={};lojas.forEach(function(L){(porReg[L.reg]=porReg[L.reg]||[]).push(L);});
    Object.keys(porReg).sort().forEach(function(rg){
      var R=r.regs.filter(function(x){return x.nome===rg;})[0];
      t+='\n*Regional '+rg+'*'+(R?' — '+pct(R.ok,R.n)+' completo':'')+'\n';
      porReg[rg].forEach(function(L){
        var falta=L.pes.filter(function(p){return p.st!=='ok';}).map(function(p){
          return nomeCurto(p.nome)+' ('+({ger:'Ger',sub:'Sub',est:'Est'}[p.grupo]||'Outro')+' '+p.nAprov+'/'+r.totMods+')';});
        t+=(L.status==='zerada'?'🔴 ':'🟡 ')+L.nome+' — '+L.ok+'/'+L.n+' completos\n   Falta: '+falta.join(', ')+'\n';
      });
    });
    return t;
  }
  function csv(r){
    var sit={ok:'Completo',and:'Em andamento',nao:'Não começou'};
    var linhas=[['Regional','Loja','Nome','Cargo','Grupo','Módulos aprovados','Total de módulos','Situação','Último acesso','CPF','Origem']];
    r.lojas.forEach(function(L){L.pes.forEach(function(p){
      linhas.push([L.reg,L.nome,p.nome,p.cargo,NOME_G[p.grupo]||'Outro',p.nAprov,r.totMods,sit[p.st],
        p.ultimo_acesso?new Date(p.ultimo_acesso).toLocaleDateString('pt-BR'):'',p.cpf_mask,p.origem==='manual'?'Liberação manual':p.origem==='fora'?'Fora da base':'Base RH']);
    });});
    return '﻿'+linhas.map(function(l){return l.map(function(c){c=String(c==null?'':c);return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(';');}).join('\r\n');
  }
  function baixar(doc,nome,conteudo){
    var a=doc.createElement('a'),url=URL.createObjectURL(new Blob([conteudo],{type:'text/csv;charset=utf-8'}));
    a.href=url;a.download=nome;doc.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);a.remove();},1000);
  }
  async function copiar(doc,txt){
    try{await doc.defaultView.navigator.clipboard.writeText(txt);return true;}catch(e){}
    var ta=doc.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';doc.body.appendChild(ta);ta.select();
    var ok=false;try{ok=doc.execCommand('copy');}catch(e){}ta.remove();return ok;
  }

  /* ============================ LIBERAR CPF ============================ */
  function cpfValido(c){
    c=String(c||'').replace(/\D/g,'');if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
    for(var t=9;t<11;t++){var s=0;for(var i=0;i<t;i++)s+=c[i]*(t+1-i);if(((10*s)%11)%10!==Number(c[t]))return false;}
    return true;
  }
  function mascaraCpf(v){v=v.replace(/\D/g,'').slice(0,11);return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
  function abrirLiberar(box){
    var doc=box.ownerDocument,d=cache||{lojas:[]};
    var lojas=d.lojas.filter(function(l){return l.ativo!==false;}).sort(function(a,b){return a.codigo-b.codigo;});
    var m=doc.createElement('div');m.className='pg-modal pg';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Liberar CPF para o curso');
    m.innerHTML='<div class="box"><h3>Liberar CPF para o curso</h3><p class="s">Para quem ainda não está na planilha mãe do RH (admissão recente, transferência, cobertura). '
      +'O colaborador entra na Central de Treinamento com este CPF e já conta no painel da loja. Se depois aparecer na base do RH, a base passa a valer.</p>'
      +'<form class="pg-form" novalidate>'
      +'<label>CPF<input class="pg-in" name="cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"></label>'
      +'<label>Loja<select class="pg-in" name="loja"><option value="">Selecione…</option>'
      +lojas.map(function(l){return '<option value="'+l.codigo+'">'+l.codigo+' · '+esc(titulo(l.nome))+'</option>';}).join('')+'</select></label>'
      +'<label class="w">Nome completo<input class="pg-in" name="nome" autocomplete="off"></label>'
      +'<label>Cargo<select class="pg-in" name="cargo"><option>Estoquista</option><option>Subgerente de Loja</option><option>Gerente de Loja</option><option value="">Outro…</option></select></label>'
      +'<label>Outro cargo<input class="pg-in" name="outro" placeholder="ex.: Vendedor" disabled></label>'
      +'<div class="w" data-erro aria-live="polite"></div>'
      +'</form><div class="rod"><button type="button" class="pg-btn" data-fechar>Fechar</button><button type="button" class="pg-btn pri" data-salvar>Liberar acesso</button></div>'
      +'<div class="lib"><h4>Liberados manualmente</h4><div data-lista><div class="pg-vazio">Carregando…</div></div></div></div>';
    doc.body.appendChild(m);
    var f=m.querySelector('form'),err=m.querySelector('[data-erro]');
    f.cpf.addEventListener('input',function(){f.cpf.value=mascaraCpf(f.cpf.value);});
    f.cargo.addEventListener('change',function(){f.outro.disabled=!!f.cargo.value;if(!f.cargo.value)f.outro.focus();});
    function fechar(){m.remove();doc.removeEventListener('keydown',teclas);}
    function teclas(e){if(e.key==='Escape')fechar();}
    doc.addEventListener('keydown',teclas);
    async function listar(){
      var alvo=m.querySelector('[data-lista]');
      try{
        var l=await rpc('curso_admin_liberacoes',{});
        alvo.innerHTML=l&&l.length?l.map(function(x){
          return '<div class="it"><span><b>'+esc(titulo(x.nome))+'</b> <small>· '+esc(x.cargo)+' · loja '+(x.loja_codigo||'—')+' · '+dataBR(x.criado_em)
            +(x.na_base_rh?' · já está na base do RH':'')+'</small></span><button type="button" class="pg-x" data-rem="'+esc(x.cpf)+'">Remover</button></div>';
        }).join(''):'<div class="pg-nota" style="margin:0">Nenhum CPF liberado manualmente.</div>';
      }catch(e){alvo.innerHTML='<div class="pg-erro">'+esc(e.message)+'</div>';}
    }
    m.addEventListener('click',async function(e){
      if(e.target===m||e.target.closest('[data-fechar]')){fechar();return;}
      var b=e.target.closest('[data-rem]');if(!b)return;
      if(!doc.defaultView.confirm('Remover a liberação manual deste CPF? Ele deixa de entrar na Central (o histórico de aulas fica guardado).'))return;
      b.disabled=true;
      try{await rpc('curso_admin_remover_liberacao',{p_cpf:b.getAttribute('data-rem')});await listar();desenhar(box,true);}
      catch(x){err.innerHTML='<div class="pg-erro">'+esc(x.message)+'</div>';b.disabled=false;}
    });
    m.querySelector('[data-salvar]').addEventListener('click',async function(){
      var bt=this,cpf=f.cpf.value.replace(/\D/g,''),cargo=f.cargo.value||f.outro.value.trim();
      var prob=!cpfValido(cpf)?'CPF inválido — confira os números.':!f.loja.value?'Escolha a loja.':f.nome.value.trim().split(/\s+/).length<2?'Informe nome e sobrenome.':cargo.length<3?'Informe o cargo.':'';
      if(prob){err.innerHTML='<div class="pg-erro">'+prob+'</div>';return;}
      err.innerHTML='';bt.disabled=true;bt.textContent='Salvando…';
      try{
        var res=await rpc('curso_admin_liberar_cpf',{p_cpf:cpf,p_nome:f.nome.value.trim(),p_cargo:cargo,p_loja:Number(f.loja.value),p_areas:[AREA]});
        err.innerHTML='<div class="pg-ok">✓ CPF liberado. O colaborador já pode entrar na Central de Treinamento com este CPF.'+(res&&res.aviso?'<br>'+esc(res.aviso):'')+'</div>';
        f.reset();f.outro.disabled=true;await listar();desenhar(box,true);
      }catch(x){err.innerHTML='<div class="pg-erro">'+esc(x.message)+'</div>';}
      bt.disabled=false;bt.textContent='Liberar acesso';
    });
    listar();f.cpf.focus();
  }

  /* ============================ INSTALAÇÃO ============================ */
  function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function acharTitulo(doc,trecho,comeco){
    var xp=doc.evaluate('//body//*[not(self::script) and not(self::style) and contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"'+trecho+'")]',doc,null,7,null);
    for(var i=0;i<xp.snapshotLength;i++){
      var el=xp.snapshotItem(i);
      if(el.closest('.pg'))continue;
      if(norm(el.textContent).indexOf(comeco)===0)return el;
    }
    return null;
  }
  function ancestralComum(a,b,c){
    var x=a;
    while(x&&!(x.contains(b)&&x.contains(c)))x=x.parentElement;
    return x;
  }
  function filhoDireto(pai,el){while(el&&el.parentElement!==pai)el=el.parentElement;return el;}
  // Resumo antigo do módulo (cards Visualizações/Lojas/Pessoas/Nota e "N lojas sem nenhuma visualização"):
  // só esconde quando são irmãos logo antes do bloco substituído, para não mexer no resto do módulo.
  function resumoAntigo(ref){
    var out=[],el=ref.previousElementSibling;
    for(var i=0;el&&i<4;i++,el=el.previousElementSibling){
      if(el.classList&&el.classList.contains('pg'))continue;
      var t=norm(el.textContent);
      if(t.length<400&&(/lojas? sem nenhuma visualizacao/.test(t)||(t.indexOf('nota media')>=0&&t.indexOf('visualizacoes')>=0)))out.push(el);
    }
    return out;
  }

  function instalar(doc){
    if(!doc||!doc.body)return;
    var box=doc.querySelector('.pg[data-protocolo-graficos]');
    if(box&&box.isConnected&&box.__alvo&&box.__alvo.isConnected){
      (box.__esconder||[]).forEach(function(e){if(e.style.display!=='none')e.style.display='none';});
      return;
    }
    var a=acharTitulo(doc,'por dia','visualizacoes por dia');if(!a)return;
    var b=acharTitulo(doc,'top lojas','top lojas');
    var c=acharTitulo(doc,'cobertura por regional','cobertura por regional');
    if(!b||!c)return;
    var grade=ancestralComum(a,b,c);
    if(!grade||grade===doc.body)return;
    // Se a grade comum tem mais coisas além dos 3 cartões, esconde só os cartões.
    var cards=[filhoDireto(grade,a),filhoDireto(grade,b),filhoDireto(grade,c)];
    var alvo=(grade.children.length<=4)?grade:null;
    if(box&&box.parentNode)box.parentNode.removeChild(box);
    var st=doc.getElementById('pg-css');
    if(!st){st=doc.createElement('style');st.id='pg-css';doc.head.appendChild(st);}
    st.textContent=CSS;
    box=doc.createElement('section');box.className='pg';box.setAttribute('data-protocolo-graficos','1');
    box.innerHTML='<div class="pg-vazio">Carregando painel do treinamento…</div>';
    var ref=alvo||cards[0];
    var esconder=(alvo?[alvo]:cards).concat(resumoAntigo(ref));
    ref.parentNode.insertBefore(box,ref);
    box.__alvo=ref;box.__esconder=esconder;
    esconder.forEach(function(e){e.style.display='none';});
    ligarTip(box,doc);
    box.addEventListener('click',async function(e){
      var t=e.target;
      var p=t.closest('[data-per]');if(p){periodo=Number(p.getAttribute('data-per'));desenhar(box,false);return;}
      var s=t.closest('[data-serie]');if(s){serie=s.getAttribute('data-serie');desenhar(box,false);return;}
      var ch=t.closest('[data-st]');if(ch){filtro.st=ch.getAttribute('data-st');redesenharLojas(box);return;}
      var rg=t.closest('tr[data-reg]');
      if(rg){filtro.reg=rg.getAttribute('data-reg');filtro.st='todas';redesenharLojas(box);
        var cd=box.querySelector('[data-lojas]');if(cd)cd.scrollIntoView({behavior:'smooth',block:'start'});return;}
      var lj=t.closest('tr[data-loja]');
      if(lj){var k=lj.getAttribute('data-loja');box.__abertas=box.__abertas||{};box.__abertas[k]=!box.__abertas[k];redesenharLojas(box);
        var nv=box.querySelector('tr[data-loja="'+k+'"]');if(nv)nv.focus({preventScroll:true});return;}
      var ac=t.closest('[data-acao]');if(!ac||!box.__r)return;
      var acao=ac.getAttribute('data-acao');
      if(acao==='liberar')abrirLiberar(box);
      if(acao==='csv')baixar(doc,'treinamento-estoque-por-loja-'+chaveDia(new Date())+'.csv',csv(box.__r));
      if(acao==='cobranca'){
        var ok=await copiar(doc,textoCobranca(box.__r));
        msg(box,ok?'✓ Cobrança copiada'+(filtro.reg?' (regional '+esc(filtro.reg)+')':' (todas as regionais)')+'. É só colar no WhatsApp.':'Não foi possível copiar automaticamente.',ok?'ok':'erro');
      }
    });
    box.addEventListener('keydown',function(e){
      if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('tr[data-loja]')){e.preventDefault();e.target.click();}
    });
    box.addEventListener('input',function(e){
      if(e.target.getAttribute&&e.target.getAttribute('data-f')==='q'){
        filtro.q=e.target.value;clearTimeout(box.__tq);box.__tq=setTimeout(function(){redesenharLojas(box);},200);
      }
    });
    box.addEventListener('change',function(e){
      if(e.target.getAttribute&&e.target.getAttribute('data-f')==='reg'){filtro.reg=e.target.value;redesenharLojas(box);}
    });
    // Botão "Atualizar" do módulo também recarrega o painel.
    if(!doc.__pgAtualizar){doc.__pgAtualizar=true;
      doc.addEventListener('click',function(e){
        var bt=e.target.closest&&e.target.closest('button,a'),bx=doc.querySelector('.pg[data-protocolo-graficos]');
        if(bt&&bx&&bx.__alvo&&!bx.contains(bt)&&/^atualizar$/i.test((bt.textContent||'').trim()))setTimeout(function(){desenhar(bx,true);},300);
      },true);
    }
    desenhar(box,false);
  }
  async function desenhar(box,forcar){
    try{
      var d=await carregar(forcar);
      montar(box,calcular(d));
    }catch(e){
      console.warn('[protocolo-graficos]',e);
      (box.__esconder||[]).forEach(function(x){x.style.display='';});
      box.innerHTML='<div class="pg-erro">Não foi possível carregar o painel do treinamento ('+esc(e.message||e)+'). Mostrando os gráficos originais.</div>';
      box.__alvo=null;
    }
  }

  function docs(w,lista,prof){
    if(prof>4)return lista;
    try{var d=w.document;if(d)lista.push(d);}catch(e){return lista;}
    for(var i=0;i<w.frames.length;i++){try{docs(w.frames[i],lista,prof+1);}catch(e){}}
    return lista;
  }
  function varrer(){
    docs(window,[],0).forEach(function(d){
      try{
        var b=d.querySelector('.pg[data-protocolo-graficos]');
        if(b&&!b.__alvo)return; // falhou: mantém originais
        instalar(d);
      }catch(e){}
    });
  }
  setInterval(varrer,1500);
  if(document.readyState!=='loading')varrer();else document.addEventListener('DOMContentLoaded',varrer);
})();
