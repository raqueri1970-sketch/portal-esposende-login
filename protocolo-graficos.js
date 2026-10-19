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
   - "Copiar cobrança": texto pronto para WhatsApp; "Planilha": CSV por pessoa; "Relatório PDF": uma página por regional.
   - Andamento por pessoa: uma linha por colaborador e uma coluna por módulo (✓ aprovado ou % assistido), no lugar do
     registro antigo de uma linha por vídeo (que continua disponível em "Ver registro detalhado").
   Os dados vêm do Supabase com a sessão do Portal (RPC curso_painel_pessoas, só staff). Se algo falhar,
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
  var CURTO={'recebimento':'Receb.','notas-fiscais':'NF','fazer-etiquetas':'Etiq.','fechamento-de-volumes':'Volume','defeito':'Defeito','remanejo':'Remanejo'};
  var periodo=30,serie='aprov',cache=null,cacheEm=0;
  var filtro={st:'pend',reg:'',q:''};
  var fp={st:'and',g:'',q:'',lim:40};
  var escopo={reg:'',loja:''}; // visão global: todos os cards seguem a regional/loja escolhida
  var fc={t:'mel',lim:5};      // comentários: mel | elo | todos

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
      rpc('curso_painel_pessoas',{p_area_id:AREA}),
      get(tk,'portal_lojas?select=codigo,nome,ativo,regional_id'),
      get(tk,'portal_regionais?select=id,nome,ativo'),
      get(tk,'curso_catalogo?select=id,nome,ordem,area_id,ativo&area_id=eq.'+AREA),
      get(tk,'curso_visualizacoes?select=modulo_id,criado_em,avaliado_em,avaliacao_aprovada,loja,nome,nota_curso,achou_util,sugestao&order=criado_em.asc&limit=50000')
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

  function codLoja(s){var m=String(s||'').match(/^\s*0*(\d+)/);return m?Number(m[1]):null;}
  // Recorta pessoas, lojas e visualizações para a regional/loja escolhida na barra de visão.
  function recorte(d){
    if(!escopo.reg&&!escopo.loja)return d;
    var regNome={},lojaReg={};
    d.regs.forEach(function(r){regNome[r.id]=titulo(r.nome);});
    d.lojas.forEach(function(l){lojaReg[l.codigo]=regNome[l.regional_id]||'Sem regional';});
    function dentro(cod){
      if(cod==null)return false;
      if(escopo.loja)return String(cod)===String(escopo.loja);
      return lojaReg[cod]===escopo.reg;
    }
    return {regs:d.regs,cat:d.cat,
      pes:d.pes.filter(function(p){return dentro(p.loja_codigo);}),
      lojas:d.lojas.filter(function(l){return dentro(l.codigo);}),
      vis:d.vis.filter(function(v){return dentro(codLoja(v.loja));})};
  }
  // Comentário que aponta melhoria: nota baixa, "não achou útil" ou palavras de crítica/sugestão.
  var RE_MELHORIA=/(n[aã]o |melhor|simples|dif[ií]cil|problema|atrapalh|deveria|poderia|falt|confus|lent|demor|trav|erro|ruim|excess|ocult|complicad|cansativ|longo|r[aá]pido demais|sugiro|sugest)/i;
  function ehMelhoria(t,v){return (v.nota_curso!=null&&Number(v.nota_curso)<=7)||(v.achou_util&&v.achou_util!=='sim')||RE_MELHORIA.test(t);}

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
      L.pes.push(p);L.n++;L[p.st]++;p.L=L;
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
      return {id:c.id,nome:c.nome,curto:CURTO[c.id]||String(c.nome).split(' ')[0],n:n};
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

    // Satisfação (nota de 0 a 10 dada ao fim do módulo) e comentários — todo o histórico da visão.
    var nomeMod={};d.cat.forEach(function(c){nomeMod[c.id]=c.nome;});
    var av={n:0,soma:0,prom:0,neut:0,detr:0,util:{sim:0,mais_ou_menos:0,nao:0},nUtil:0,porMod:{}},coms=[];
    d.vis.forEach(function(v){
      if(!modIds[v.modulo_id])return;
      if(v.nota_curso!=null){
        var nt=Number(v.nota_curso);av.n++;av.soma+=nt;
        if(nt>=9)av.prom++;else if(nt>=7)av.neut++;else av.detr++;
        var pm=av.porMod[v.modulo_id]||(av.porMod[v.modulo_id]={s:0,n:0});pm.s+=nt;pm.n++;
      }
      if(v.achou_util){av.util[v.achou_util]=(av.util[v.achou_util]||0)+1;av.nUtil++;}
      var tx=String(v.sugestao||'').trim();
      if(tx)coms.push({t:tx,nota:v.nota_curso,util:v.achou_util,mod:nomeMod[v.modulo_id]||v.modulo_id,loja:String(v.loja||'').trim(),
        nome:v.nome,data:v.avaliado_em||v.criado_em,mel:ehMelhoria(tx,v)});
    });
    av.media=av.n?av.soma/av.n:null;
    av.mods=d.cat.slice().sort(function(a,b){return (a.ordem||99)-(b.ordem||99);}).map(function(c){
      var x=av.porMod[c.id];return {nome:c.nome,media:x?x.s/x.n:null,n:x?x.n:0};});
    coms.sort(function(a,b){return (b.mel-a.mel)||Date.parse(b.data)-Date.parse(a.data);});

    var reais=lista.filter(function(L){return L.cod!=null&&L.n;});
    return {aval:av,coms:coms,tot:tot,lojas:lista,regs:rl,mods:mods,dias:dias,totMods:totMods,lojasAtivas:reais.length,
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
  +'.pg-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}'
  +':where(button.pg-kpi,button.pg-cg){all:unset;box-sizing:border-box;cursor:pointer;display:block;text-align:left;font-family:inherit;color:var(--tx);transition:border-color .15s,transform .15s}'
  +'button.pg-kpi:hover,button.pg-cg:hover{border-color:#36507a;transform:translateY(-1px)}'
  +'button.pg-kpi:focus-visible,button.pg-cg:focus-visible{outline:2px solid '+C.azul+';outline-offset:2px}'
  +'.pg-cg[aria-pressed=true]{border-color:'+C.verde+';box-shadow:0 0 0 1px '+C.verde+' inset}'
  +'.pg-esc{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px}'
  +'.pg-esc .lb{font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--t3)}'
  +'.pg-esc .pg-chip small{font-weight:600;color:var(--t3);margin-left:3px}.pg-esc .pg-chip[aria-pressed=true] small{color:#bcd3f2}'
  +'.pg-esc .res{margin-left:auto;font-size:12px;color:var(--t2)}.pg-esc .res b{color:var(--tx)}'
  +'.pg-tbl tr.on td{background:rgba(57,135,229,.12)}'
  +'.pg-nt{display:flex;gap:16px;align-items:center}.pg-nt .big{font-size:40px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.pg-nt .big small{font-size:14px;color:var(--t3);margin-left:2px}'
  +'.pg-stk{display:flex;gap:2px;height:12px;border-radius:4px;overflow:hidden;background:var(--s2)}.pg-stk i{display:block;height:100%}'
  +'.pg-lg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--t2);margin-top:6px}.pg-lg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}'
  +'.pg-nm2{margin-top:12px;border-top:1px solid var(--bd);padding-top:8px}.pg-nm2 .it{display:grid;grid-template-columns:1fr 40px 28px;gap:8px;align-items:center;font-size:12.5px;padding:4px 0}'
  +'.pg-nm2 .it b{text-align:right;font-variant-numeric:tabular-nums}.pg-nm2 .it small{color:var(--t3);text-align:right;font-size:11px}'
  +'.pg-nm2 .it em{font-style:normal;font-size:10px;font-weight:800;color:#ff8f93;border:1px solid #5b2630;border-radius:5px;padding:0 4px;margin-left:4px}'
  +'.pg-coms{display:flex;flex-direction:column;gap:8px}.pg-cm{border-left:3px solid var(--c);background:var(--s2);border-radius:8px;padding:8px 10px}'
  +'.pg-cm.mel{--c:'+C.ambar+'}.pg-cm.elo{--c:'+C.verde+'}.pg-cm p{margin:0 0 6px;font-size:13px;line-height:1.45;color:var(--tx)}'
  +'.pg-cm .mt{display:flex;gap:4px 10px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--t3)}'
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
  +'.pg-mx td{padding:6px 6px}.pg-mx th.c{font-size:10.5px;letter-spacing:.2px}'
  +'.pg-pn{display:flex;align-items:center;gap:2px;min-width:150px}.pg-pn small{display:block;font-size:11px;color:var(--t3)}.pg-pn .sm{display:none}'
  +'.pg-mc{display:inline-block;min-width:38px;padding:3px 4px;border-radius:6px;font-size:11.5px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums}'
  +'.pg-mc.ok{background:rgba(25,158,112,.2);color:#5fd3a6}.pg-mc.pa{background:rgba(214,158,46,.16);color:#f0c66b}'
  +'.pg-mc.av{background:rgba(57,135,229,.18);color:#8dbcf3;font-size:10.5px}.pg-mc.no{color:#3c4d68}'
  +'@media (max-width:820px){.pg-pn .sm{display:inline}}'
  +'@media (max-width:1100px){.pg-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}'
  +'@media (max-width:980px){.pg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pg-esc .res{margin-left:0;width:100%}.pg-cargos{grid-template-columns:1fr}}'
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
    function k(kpi,cor,num,rot,sub,dica){return '<button type="button" class="pg-kpi" data-kpi="'+kpi+'" title="'+dica+'" style="--c:'+cor+'"><b>'+num+'</b><span>'+rot+'</span><small>'+sub+'</small></button>';}
    var a=r.aval,corN=a.media==null?C.cinza:a.media>=9?C.verde:a.media>=7?C.ambar:C.verm;
    return '<div class="pg-kpis">'
      +k('ok',C.verde,t.ok,'Completaram o curso',pct(t.ok,t.n)+' de '+plural(t.n,'colaborador','colaboradores')+' do público','Ver quem completou')
      +k('and',C.ambar,t.and,'Em andamento','começaram e ainda faltam módulos','Ver quem está no meio do curso')
      +k('nao',C.verm,t.nao,'Não começaram','nenhum módulo assistido','Ver quem não começou')
      +k('lojas',C.azul,r.lojasOk+'<small style="font-size:15px;color:var(--t3);font-weight:600"> / '+r.lojasAtivas+'</small>','Lojas com 100% completo',
        '<b style="display:inline;font-size:inherit;color:#ff8f93">'+plural(r.lojasZeradas,'loja zerada','lojas zeradas')+'</b> (ninguém começou)','Ver as lojas zeradas')
      +k('nota',corN,a.media==null?'—':a.media.toFixed(1).replace('.',',')+'<small style="font-size:15px;color:var(--t3);font-weight:600"> /10</small>','Nota média do curso',
        plural(a.n,'avaliação','avaliações')+' · '+plural(r.coms.filter(function(c){return c.mel;}).length,'sugestão de melhoria','sugestões de melhoria'),'Ver notas e comentários')
      +'</div>';
  }

  // Cards por cargo: só quem completou (uma métrica por barra)
  function cargos(r){
    return '<div class="pg-cargos">'+GRUPOS.map(function(g){
      var x=r.tot.g[g[0]],p=x.n?x.ok/x.n:0;
      return '<button type="button" class="pg-cg" data-cargo="'+g[0]+'" aria-pressed="'+(fp.g===g[0])+'" title="Ver os '+g[2].toLowerCase()+' que ainda faltam"><h5>'+g[2]+' com curso completo</h5>'
        +'<span class="pc">'+pct(x.ok,x.n)+'</span><div class="big">'+x.ok+' <small>de '+x.n+'</small></div>'
        +'<div class="pg-meter"><i style="width:'+(p*100)+'%;background:'+C.verde+'"></i></div>'
        +'<div class="lin"><b>'+x.and+'</b> em andamento · <b style="color:#ff8f93">'+x.nao+'</b> não começaram</div></button>';
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
        var on=escopo.reg===g.nome;
        return '<tr class="lj'+(on?' on':'')+'" data-reg="'+esc(g.nome)+'" title="'+(on?'Voltar para a rede toda':'Filtrar todo o painel por esta regional')+'"><td><b>'+(on?'▸ ':'')+esc(g.nome)+'</b></td>'
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
      +'</div>'
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

  // Andamento por pessoa: uma linha por colaborador, uma coluna por módulo.
  function celMod(m,mod){
    var x=mod&&mod[m.id];
    if(!x)return '<td class="c"><span class="pg-mc no" title="'+esc(m.nome)+': não abriu">–</span></td>';
    if(x.ok)return '<td class="c"><span class="pg-mc ok" title="'+esc(m.nome)+': aprovado'+(x.nota!=null?' · nota '+Math.round(x.nota):'')+'">✓</span></td>';
    var p=Math.round(x.p||0);
    if(p>=90)return '<td class="c"><span class="pg-mc av" title="'+esc(m.nome)+': assistiu, falta passar na avaliação">prova</span></td>';
    return '<td class="c"><span class="pg-mc pa" title="'+esc(m.nome)+': assistiu '+p+'%">'+p+'%</span></td>';
  }
  function pessoasFiltradas(r){
    var q=fp.q.toLowerCase(),lista=[];
    r.lojas.forEach(function(L){L.pes.forEach(function(p){
      if(fp.g&&p.grupo!==fp.g)return;
      if(fp.st==='pend'?p.st==='ok':(fp.st!=='todos'&&p.st!==fp.st))return;
      if(q&&(p.nome+' '+L.nome+' '+p.cargo).toLowerCase().indexOf(q)<0)return;
      lista.push(p);
    });});
    return lista.sort(function(a,b){
      return (b.ultimo_acesso?Date.parse(b.ultimo_acesso):0)-(a.ultimo_acesso?Date.parse(a.ultimo_acesso):0)
        ||(a.L.cod||0)-(b.L.cod||0)||ordemG(a.grupo)-ordemG(b.grupo)||String(a.nome).localeCompare(b.nome);
    });
  }
  function tabPessoas(r){
    var base={and:0,ok:0,nao:0,todos:0,pend:0};
    r.lojas.forEach(function(L){L.pes.forEach(function(p){if(fp.g&&p.grupo!==fp.g)return;base[p.st]++;base.todos++;if(p.st!=='ok')base.pend++;});});
    var cont=base;
    var fil='<div class="pg-fil"><div class="pg-chips" role="group" aria-label="Situação da pessoa">'
      +[['pend','Pendentes'],['and','Em andamento'],['ok','Completos'],['nao','Não começaram'],['todos','Todos']].map(function(c){
        return '<button type="button" class="pg-chip" data-fpst="'+c[0]+'" aria-pressed="'+(fp.st===c[0])+'">'+c[1]+' · '+cont[c[0]]+'</button>';}).join('')
      +'</div><select class="pg-in" data-fp="g" aria-label="Cargo"><option value="">Todos os cargos</option>'
      +GRUPOS.map(function(g){return '<option value="'+g[0]+'"'+(fp.g===g[0]?' selected':'')+'>'+g[2]+'</option>';}).join('')+'</select>'
      +'<input class="pg-in" data-fp="q" type="search" aria-label="Buscar pessoa ou loja" placeholder="Buscar pessoa ou loja…" value="'+esc(fp.q)+'" style="flex:1;min-width:160px"></div>';
    var lista=pessoasFiltradas(r);
    if(!lista.length)return fil+'<div class="pg-vazio">Ninguém neste filtro.</div>';
    var vis=lista.slice(0,fp.lim);
    return fil+'<div style="overflow-x:auto"><table class="pg-tbl pg-mx"><thead><tr><th>Colaborador</th><th class="hm">Loja</th>'
      +r.mods.map(function(m,i){return '<th class="c" title="'+esc(m.nome)+'">'+(i+1)+'. '+esc(m.curto)+'</th>';}).join('')
      +'<th>Progresso</th><th class="n hm">Último acesso</th></tr></thead><tbody>'
      +vis.map(function(p){
        var cor=p.st==='ok'?C.verde:p.st==='and'?C.ambar:C.verm,mod=p.modulos||{};
        return '<tr><td><div class="pg-pn"><span class="pg-dot" style="background:'+cor+'"></span><span><b>'+esc(nomeCurto(p.nome))+'</b>'
          +(p.origem==='manual'?'<span class="pg-tag">MANUAL</span>':'')+'<small>'+esc(NOME_G[p.grupo]||p.cargo)+'<span class="sm"> · '+esc(p.L.nome)+'</span></small></span></div></td>'
          +'<td class="hm" style="color:var(--t2);white-space:nowrap">'+esc(p.L.nome)+'<small style="display:block;color:var(--t3)">'+esc(p.L.reg)+'</small></td>'
          +r.mods.map(function(m){return celMod(m,mod);}).join('')
          +'<td><div class="pg-pct" style="min-width:90px"><div class="pg-trk"><i style="width:'+(r.totMods?p.nAprov/r.totMods*100:0)+'%;background:'+C.verde+'"></i></div><b style="width:30px">'+p.nAprov+'/'+r.totMods+'</b></div></td>'
          +'<td class="n hm" style="color:var(--t2)">'+dataBR(p.ultimo_acesso)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      +(lista.length>vis.length?'<button type="button" class="pg-btn" data-acao="maispes" style="margin-top:10px">Mostrar mais '+Math.min(40,lista.length-vis.length)+' de '+(lista.length-vis.length)+' restantes</button>':'')
      +'<div class="pg-nota"><span class="pg-mc ok">✓</span> aprovado · <span class="pg-mc pa">74%</span> parou no meio do vídeo · <span class="pg-mc av">prova</span> assistiu, falta passar na avaliação · <span class="pg-mc no">–</span> não abriu</div>';
  }

  // Barra de visão: regional e loja valem para todos os cards, tabelas, gráficos e relatórios.
  function barraEscopo(r){
    var T=r.todas,regs=T.regs.slice().sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var lojas=T.lojas.filter(function(L){return L.cod!=null&&L.n&&(!escopo.reg||L.reg===escopo.reg);}).sort(function(a,b){return a.cod-b.cod;});
    var txt=escopo.loja?'Loja '+esc((T.lojas.filter(function(L){return String(L.cod)===String(escopo.loja);})[0]||{}).nome||escopo.loja)
      :escopo.reg?'Regional '+esc(escopo.reg)+' · '+plural(r.lojasAtivas,'loja','lojas'):'Rede toda · '+plural(r.lojasAtivas,'loja','lojas');
    return '<div class="pg-esc"><span class="lb">Visão</span><div class="pg-chips" role="group" aria-label="Regional">'
      +'<button type="button" class="pg-chip" data-esc-reg="" aria-pressed="'+(!escopo.reg&&!escopo.loja)+'">Rede</button>'
      +regs.map(function(g){return '<button type="button" class="pg-chip" data-esc-reg="'+esc(g.nome)+'" aria-pressed="'+(escopo.reg===g.nome)+'">'+esc(g.nome)+' <small>'+pct(g.ok,g.n)+'</small></button>';}).join('')
      +'</div><select class="pg-in" data-esc="loja" aria-label="Loja"><option value="">'+(escopo.reg?'Todas as lojas da regional':'Todas as lojas')+'</option>'
      +lojas.map(function(L){return '<option value="'+L.cod+'"'+(String(escopo.loja)===String(L.cod)?' selected':'')+'>'+esc(L.nome)+'</option>';}).join('')+'</select>'
      +'<span class="res">Mostrando: <b>'+txt+'</b> · '+plural(r.tot.n,'colaborador','colaboradores')+'</span></div>';
  }

  // Satisfação: nota média, distribuição (uma métrica só), utilidade e nota por módulo.
  function cardNotas(r){
    var a=r.aval;
    if(!a.n&&!a.nUtil)return '<div class="pg-vazio">Ninguém avaliou o curso nesta visão ainda.</div>';
    var corN=a.media==null?C.cinza:a.media>=9?C.verde:a.media>=7?C.ambar:C.verm;
    var dist=[[a.prom,'9–10',C.verde],[a.neut,'7–8',C.ambar],[a.detr,'0–6',C.verm]];
    var piorMod=a.mods.filter(function(m){return m.media!=null;}).sort(function(x,y){return x.media-y.media;})[0];
    return '<div class="pg-nt"><div class="big" style="color:'+corN+'">'+(a.media==null?'—':a.media.toFixed(1).replace('.',','))+'<small>/10</small></div>'
      +'<div style="flex:1;min-width:0"><div class="pg-stk">'+dist.map(function(x){return x[0]?'<i style="flex:'+x[0]+';background:'+x[2]+'" data-tip="'+tipHtml('Notas '+x[1],[['Avaliações',x[0]],['Do total',pct(x[0],a.n)]])+'"></i>':'';}).join('')+'</div>'
      +'<div class="pg-lg">'+dist.map(function(x){return '<span><i style="background:'+x[2]+'"></i>'+x[1]+': <b>'+x[0]+'</b></span>';}).join('')+'</div>'
      +'<div class="pg-nota" style="margin-top:6px">'+plural(a.n,'avaliação','avaliações')
      +(a.nUtil?' · achou útil: <b style="color:#5fd3a6">'+pct(a.util.sim||0,a.nUtil)+' sim</b>'+(a.util.mais_ou_menos?' · '+pct(a.util.mais_ou_menos,a.nUtil)+' mais ou menos':'')+(a.util.nao?' · <b style="color:#ff8f93">'+pct(a.util.nao,a.nUtil)+' não</b>':''):'')+'</div></div></div>'
      +'<div class="pg-nm2">'+a.mods.map(function(m,i){
        var c=m.media==null?C.cinza:m.media>=9?C.verde:m.media>=7?C.ambar:C.verm,pior=piorMod&&m===piorMod&&a.mods.length>1;
        return '<div class="it'+(pior?' pior':'')+'"><span>'+(i+1)+'. '+esc(m.nome)+(pior?' <em>menor nota</em>':'')+'</span><b style="color:'+c+'">'+(m.media==null?'—':m.media.toFixed(1).replace('.',','))+'</b><small>'+m.n+'</small></div>';
      }).join('')+'</div>';
  }

  // Comentários: melhorias primeiro, com módulo, loja, pessoa e nota.
  function cardComentarios(r){
    var mel=r.coms.filter(function(c){return c.mel;}),elo=r.coms.filter(function(c){return !c.mel;});
    var lista=fc.t==='mel'?mel:fc.t==='elo'?elo:r.coms;
    var h='<div class="pg-chips" style="margin-bottom:10px" role="group" aria-label="Tipo de comentário">'
      +[['mel','💡 Melhorias',mel.length],['elo','👍 Elogios',elo.length],['todos','Todos',r.coms.length]].map(function(c){
        return '<button type="button" class="pg-chip" data-fc="'+c[0]+'" aria-pressed="'+(fc.t===c[0])+'">'+c[1]+' · '+c[2]+'</button>';}).join('')+'</div>';
    if(!lista.length)return h+'<div class="pg-vazio">'+(fc.t==='mel'?'Nenhuma sugestão de melhoria nesta visão. 👏':'Nenhum comentário nesta visão.')+'</div>';
    return h+'<div class="pg-coms">'+lista.slice(0,fc.lim).map(function(c){
      var nc=c.nota==null?'':'<span class="pg-cgx '+(c.nota>=9?'ok':c.nota>=7?'pa':'no')+'">nota '+c.nota+'</span>';
      return '<div class="pg-cm '+(c.mel?'mel':'elo')+'"><p>“'+esc(c.t)+'”</p><div class="mt">'+nc+'<span>'+esc(c.mod)+'</span><span>'+esc(c.loja||'—')+'</span><span>'+esc(nomeCurto(c.nome||''))+'</span><span>'+dataBR(c.data)+'</span></div></div>';
    }).join('')+'</div>'
      +(lista.length>fc.lim?'<button type="button" class="pg-btn" data-acao="maiscom" style="margin-top:10px">Ver mais '+Math.min(10,lista.length-fc.lim)+'</button>':'')
      +'<div class="pg-nota">“Melhoria” = nota até 7, não achou útil, ou texto com crítica/sugestão. Use para ajustar vídeos e processos.</div>';
  }

  function montar(box,r){
    box.__r=r;
    var nomePer=periodo?'últimos '+periodo+' dias':'todo o período';
    var semLoja=r.lojas.filter(function(L){return L.cod==null;})[0];
    box.innerHTML=''
      +'<div class="pg-bar"><div class="pg-tt">Treinamento Operações de Estoque<small>Público: gerentes, subgerentes e estoquistas da base do RH + CPFs liberados manualmente · curso completo = '+plural(r.totMods,'módulo aprovado','módulos aprovados')+'</small></div>'
      +'<div class="pg-acts"><button type="button" class="pg-btn pri" data-acao="liberar">＋ Liberar CPF</button>'
      +'<button type="button" class="pg-btn" data-acao="cobranca" title="Copia as lojas pendentes do filtro atual, por regional, para colar no WhatsApp">📋 Copiar cobrança</button>'
      +'<button type="button" class="pg-btn" data-acao="pdf" title="Situação das lojas, uma página por regional (usa a regional escolhida no filtro de lojas, ou todas)">📄 Relatório PDF</button>'
      +'<button type="button" class="pg-btn" data-acao="csv" title="Uma linha por pessoa, abre no Excel">⬇ Planilha</button>'
      +'<button type="button" class="pg-btn" data-acao="atualizar" title="Recarregar os dados">↻</button></div></div>'
      +'<div data-msg></div>'
      +barraEscopo(r)+kpis(r)+cargos(r)
      +'<div class="pg-card" data-sec="lojas"><div class="pg-h"><h4>Situação por loja</h4></div><p class="pg-sub">Da loja mais atrasada para a mais adiantada. Cadastro = gerente, sub e estoquista; Viram = assistiram 1+ módulo; Completos = curso inteiro aprovado.</p><div data-lojas>'+tabLojas(r,box)+'</div>'
      +(semLoja&&semLoja.n?'<div class="pg-nota">⚠ '+plural(semLoja.n,'pessoa do público está','pessoas do público estão')+' sem loja na base do RH e nunca assistiu — aparecem em “Sem loja na base do RH” (filtro Todas). Corrija a loja na planilha mãe ou libere o CPF com a loja certa.</div>':'')+'</div>'
      +'<div class="pg-grid">'
      +'<div class="pg-card"><div class="pg-h"><h4>Cobrança por regional</h4></div><p class="pg-sub">Rede toda, da regional mais atrasada para a mais adiantada. Clique para filtrar o painel inteiro.</p>'+tabRegionais(r.todas)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Aprovados por módulo</h4></div><p class="pg-sub">De '+plural(r.tot.n,'pessoa','pessoas')+' do público.</p>'+grafMods(r)+'</div>'
      +'<div class="pg-card" data-sec="notas"><div class="pg-h"><h4>Nota do curso</h4></div><p class="pg-sub">Nota de 0 a 10 que o colaborador dá ao terminar cada módulo.</p>'+cardNotas(r)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Comentários</h4></div><p class="pg-sub">O que o pessoal escreveu — melhorias primeiro.</p><div data-coms>'+cardComentarios(r)+'</div></div>'
      +'<div class="pg-card full"><div class="pg-h"><h4>'+(serie==='aprov'?'Módulos aprovados por dia':'Acessos iniciados por dia')+'</h4>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><div class="pg-seg" role="group" aria-label="O que mostrar">'
      +[['aprov','Aprovados'],['ini','Acessos']].map(function(p){return '<button type="button" data-serie="'+p[0]+'" aria-pressed="'+(serie===p[0])+'">'+p[1]+'</button>';}).join('')
      +'</div><div class="pg-seg" role="group" aria-label="Período">'
      +[[7,'7 dias'],[30,'30 dias'],[0,'Tudo']].map(function(p){return '<button type="button" data-per="'+p[0]+'" aria-pressed="'+(periodo===p[0])+'">'+p[1]+'</button>';}).join('')
      +'</div></div></div><p class="pg-sub">'+(serie==='aprov'?'Módulos com avaliação aprovada em cada dia':'Vídeos abertos em cada dia, concluídos ou não')+' — '+nomePer+'.</p>'+grafDias(r,box.clientWidth-40)+'</div>'
      +'</div>'
      +'<div class="pg-card" data-sec="pessoas"><div class="pg-h"><h4>Andamento por pessoa'+(fp.g?' · '+NOME_G[fp.g]+'s':'')+'</h4>'
      +(box.__lista&&box.__lista.length?'<button type="button" class="pg-chip" data-acao="registro" aria-pressed="'+!!box.__listaVisivel+'">'+(box.__listaVisivel?'Ocultar':'Ver')+' registro detalhado</button>':'')
      +'</div><p class="pg-sub">Uma linha por colaborador, uma coluna por módulo — mais recente primeiro.</p><div data-pessoas>'+tabPessoas(r)+'</div></div>';
  }
  function redesenharLojas(box){
    var alvo=box.querySelector('[data-lojas]');if(!alvo||!box.__r)return;
    var foco=box.ownerDocument.activeElement,f=foco&&foco.getAttribute&&foco.getAttribute('data-f'),pos=f==='q'?foco.selectionStart:null;
    alvo.innerHTML=tabLojas(box.__r,box);
    if(f){var el=alvo.querySelector('[data-f="'+f+'"]');if(el){el.focus();if(pos!=null)try{el.setSelectionRange(pos,pos);}catch(e){}}}
  }
  function redesenharPessoas(box){
    var alvo=box.querySelector('[data-pessoas]');if(!alvo||!box.__r)return;
    var foco=box.ownerDocument.activeElement,f=foco&&foco.getAttribute&&foco.getAttribute('data-fp'),pos=f==='q'?foco.selectionStart:null;
    alvo.innerHTML=tabPessoas(box.__r);
    if(f){var el=alvo.querySelector('[data-fp="'+f+'"]');if(el){el.focus();if(pos!=null)try{el.setSelectionRange(pos,pos);}catch(e){}}}
  }
  function irPara(box,sec){var el=box.querySelector('[data-sec="'+sec+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
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

  /* ============================ RELATÓRIO PDF ============================ */
  // Documento A4 claro, uma página por regional (mais o resumo da rede quando são todas). Abre a impressão
  // do navegador já com o nome do arquivo no título — "Salvar como PDF".
  function relatorioHtml(r){
    var hoje=new Date().toLocaleDateString('pt-BR');
    var regs=escopo.reg?r.regs.filter(function(g){return g.nome===escopo.reg;}):r.regs.slice().sort(function(a,b){return a.nome.localeCompare(b.nome);});
    function cel(x){if(!x[0])return '<span class="ch na">—</span>';return '<span class="ch '+(x[1]===x[0]?'ok':x[1]?'pa':'no')+'">'+x[1]+'/'+x[0]+'</span>';}
    function barra(p){return '<div class="bar"><i style="width:'+(p*100)+'%;background:'+corPct(p)+'"></i></div>';}
    function kp(cor,v,rot){return '<div style="--c:'+cor+'"><b>'+v+'</b>'+rot+'</div>';}
    function somaG(lojas){var g={ger:[0,0],sub:[0,0],est:[0,0]};lojas.forEach(function(L){['ger','sub','est'].forEach(function(k){g[k][0]+=L.g[k][0];g[k][1]+=L.g[k][1];});});return g;}
    function faixaCargos(g){return '<div class="cg">'+GRUPOS.map(function(x){var v=g[x[0]];return '<div><span>'+x[2]+'</span><b>'+v[1]+' de '+v[0]+'</b> completos <em>'+pct(v[1],v[0])+'</em></div>';}).join('')+'</div>';}
    var notaTxt=r.aval.media==null?'':' · nota média do curso '+r.aval.media.toFixed(1).replace('.',',')+' ('+plural(r.aval.n,'avaliação','avaliações')+')';
    var html='';
    if(!escopo.reg){
      var gR=somaG(r.lojas.filter(function(L){return L.cod!=null;}));
      html+='<section class="pag"><header><h1>Treinamento Operações de Estoque — Situação da rede</h1><p>Posição em '+hoje+' · curso completo = '+r.totMods+' módulos aprovados · público: gerentes, subgerentes e estoquistas'+notaTxt+'</p></header>'
        +'<div class="k">'+kp(C.verde,r.tot.ok+' <small>('+pct(r.tot.ok,r.tot.n)+')</small>','Completaram')+kp(C.ambar,r.tot.and,'Em andamento')+kp(C.verm,r.tot.nao,'Não começaram')
        +kp(C.azul,r.lojasOk+' / '+r.lojasAtivas,'Lojas 100%')+kp(C.verm,r.lojasZeradas,'Lojas zeradas')+'</div>'+faixaCargos(gR)
        +'<h2>Ranking das regionais (da mais atrasada para a mais adiantada)</h2><table><thead><tr><th>Regional</th><th class="n">Lojas</th><th class="n">Colab.</th><th class="n">Completos</th><th style="width:28%">% completo</th><th class="n">Lojas 100%</th><th class="n">Zeradas</th></tr></thead><tbody>'
        +r.regs.map(function(g){return '<tr><td><b>'+esc(g.nome)+'</b></td><td class="n">'+g.lojas+'</td><td class="n">'+g.n+'</td><td class="n"><b>'+g.ok+'</b></td><td><div class="pc">'+barra(g.pct)+'<b>'+pct(g.ok,g.n)+'</b></div></td><td class="n">'+g.cem+'</td><td class="n">'+(g.zeradas?'<span class="ch no">'+g.zeradas+'</span>':'0')+'</td></tr>';}).join('')
        +'</tbody></table></section>';
    }
    regs.forEach(function(g){
      var lojas=r.lojas.filter(function(L){return L.cod!=null&&L.reg===g.nome&&L.n;});
      var pend=lojas.filter(function(L){return L.status!=='ok';});
      html+='<section class="pag"><header><h1>Regional '+esc(g.nome)+'</h1><p>Treinamento Operações de Estoque · posição em '+hoje+' · '+plural(g.lojas,'loja','lojas')+' · '+plural(g.n,'colaborador','colaboradores')+' no público'+(escopo.reg?notaTxt:'')+'</p></header>'
        +'<div class="k">'+kp(C.verde,g.ok+' <small>('+pct(g.ok,g.n)+')</small>','Completaram')+kp(C.ambar,g.and,'Em andamento')+kp(C.verm,g.nao,'Não começaram')
        +kp(C.azul,g.cem+' / '+g.lojas,'Lojas 100%')+kp(C.verm,g.zeradas,'Lojas zeradas')+'</div>'+faixaCargos(somaG(lojas))
        +'<h2>Situação das lojas</h2><table><thead><tr><th>Loja</th><th class="n">Cadastro</th><th class="n">Viram</th><th class="n">Completos</th><th style="width:22%">% completo</th><th class="c">Ger</th><th class="c">Sub</th><th class="c">Est</th><th>Situação</th></tr></thead><tbody>'
        +lojas.map(function(L){var st=stLoja(L.status);
          return '<tr><td><b>'+esc(L.nome)+'</b></td><td class="n">'+L.n+'</td><td class="n">'+(L.ok+L.and)+'</td><td class="n"><b>'+L.ok+'</b></td><td><div class="pc">'+barra(L.pct)+'<b>'+pct(L.ok,L.n)+'</b></div></td>'
            +'<td class="c">'+cel(L.g.ger)+'</td><td class="c">'+cel(L.g.sub)+'</td><td class="c">'+cel(L.g.est)+'</td><td><span class="dot" style="background:'+st[1]+'"></span>'+st[0]+'</td></tr>';}).join('')
        +'</tbody></table>'
        +(pend.length?'<h2>Quem falta, por loja</h2><div class="pend">'+pend.map(function(L){
            return '<div class="pl"><b>'+esc(L.nome)+'</b> <span class="mut">'+L.ok+'/'+L.n+' completos</span><br>'+L.pes.filter(function(p){return p.st!=='ok';}).map(function(p){
              return esc(nomeCurto(p.nome))+' <span class="mut">('+({ger:'Ger',sub:'Sub',est:'Est'}[p.grupo]||'Outro')+' '+p.nAprov+'/'+r.totMods+(p.st==='nao'?', não começou':'')+')</span>';}).join(' · ')+'</div>';
          }).join('')+'</div>':'<p class="okmsg">✓ Todas as lojas desta regional estão com 100% do público com o curso completo.</p>')
        +'<footer>Ger/Sub/Est = completos sobre cadastrados · Fonte: Central de Treinamento — Portal Esposende</footer></section>';
    });
    var titulo='Treinamento Estoque - '+(escopo.reg?'Regional '+escopo.reg:'Rede e regionais')+' - '+hoje.replace(/\//g,'-');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(titulo)+'</title><style>'
      +'@page{size:A4 portrait;margin:11mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
      +'body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;font-size:10.5px;margin:0;background:#fff}'
      +'.pag{page-break-after:always;padding:2px}.pag:last-child{page-break-after:auto}'
      +'header{border-bottom:3px solid #1d3a63;padding-bottom:6px;margin-bottom:8px}h1{font-size:17px;margin:0;color:#0f2747}header p{margin:3px 0 0;color:#64748b;font-size:10px}'
      +'h2{font-size:12px;margin:14px 0 6px;color:#0f2747}'
      +'.k{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.k div{border:1px solid #e2e8f0;border-top:3px solid var(--c);border-radius:6px;padding:6px 8px;font-size:9.5px;color:#475569}'
      +'.k b{display:block;font-size:17px;color:#0f172a}.k small{font-size:10px;color:#64748b;font-weight:400}'
      +'.cg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px}.cg div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;font-size:10px}'
      +'.cg span{display:block;font-size:8.5px;text-transform:uppercase;letter-spacing:.4px;color:#64748b;font-weight:700}.cg em{float:right;font-style:normal;font-weight:700;color:#15803d}'
      +'table{width:100%;border-collapse:collapse}th{background:#f1f5f9;font-size:8.5px;text-transform:uppercase;letter-spacing:.3px;text-align:left;padding:5px;color:#475569}'
      +'td{padding:4px 5px;border-bottom:1px solid #e2e8f0;vertical-align:middle}tr{page-break-inside:avoid}.n{text-align:right}.c{text-align:center}'
      +'.pc{display:flex;align-items:center;gap:6px}.pc b{width:32px;text-align:right}.bar{flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}.bar i{display:block;height:100%}'
      +'.ch{display:inline-block;min-width:28px;padding:1px 4px;border-radius:4px;font-weight:700;font-size:9.5px;text-align:center}'
      +'.ch.ok{background:#dcfce7;color:#166534}.ch.pa{background:#fef3c7;color:#92400e}.ch.no{background:#fee2e2;color:#991b1b}.ch.na{color:#94a3b8}'
      +'.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}'
      +'.pend{columns:2;column-gap:14px}.pl{break-inside:avoid;padding:4px 0;border-bottom:1px dashed #e2e8f0;line-height:1.45}.mut{color:#64748b}'
      +'.okmsg{color:#166534;font-weight:700}footer{margin-top:10px;font-size:8.5px;color:#94a3b8}'
      +'</style></head><body>'+html+'</body></html>';
  }
  function imprimirRelatorio(doc,html){
    var w=null;try{w=doc.defaultView.open('','_blank');}catch(e){}
    if(w&&w.document){
      w.document.open();w.document.write(html);w.document.close();
      setTimeout(function(){try{w.focus();w.print();}catch(e){}},400);return true;
    }
    // Pop-up bloqueado: imprime por um iframe escondido.
    var f=doc.createElement('iframe');f.style.cssText='position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    doc.body.appendChild(f);f.contentDocument.open();f.contentDocument.write(html);f.contentDocument.close();
    setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){}setTimeout(function(){f.remove();},60000);},400);
    return true;
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

  // Registro antigo (busca "Buscar por loja…" + uma linha por vídeo): fica escondido e pode ser reaberto pelo painel.
  // Só mexe em irmãos do painel, a partir do bloco que tem a busca, enquanto tiverem datas dd/mm/aaaa.
  function listaAntiga(doc,box){
    var ins=[].slice.call(doc.querySelectorAll('input')).filter(function(i){return !i.closest('.pg')&&/buscar por loja/i.test(i.placeholder||'');})[0];
    if(!ins||!box.parentNode)return [];
    var topo=filhoDireto(box.parentNode,ins);
    if(!topo||topo===box)return [];
    var out=[topo],el=topo.nextElementSibling;
    var data=/\d{2}\/\d{2}\/\d{4}/;
    while(el&&!(el.classList&&el.classList.contains('pg'))){
      var t=el.textContent||'';
      // um controle pequeno (ex.: botão Atualizar) entre a busca e a lista também sai, se a lista vier logo depois
      if(data.test(t)||(t.trim().length<40&&el.nextElementSibling&&data.test(el.nextElementSibling.textContent||''))){out.push(el);el=el.nextElementSibling;}
      else break;
    }
    return out;
  }

  function instalar(doc){
    if(!doc||!doc.body)return;
    var box=doc.querySelector('.pg[data-protocolo-graficos]');
    if(box&&box.isConnected&&box.__alvo&&box.__alvo.isConnected){
      (box.__esconder||[]).forEach(function(e){if(e.style.display!=='none')e.style.display='none';});
      if(!box.__lista||!box.__lista.length||!box.__lista[0].isConnected){
        box.__lista=listaAntiga(doc,box);
        if(box.__lista.length&&box.__r&&!box.querySelector('[data-acao=registro]'))montar(box,box.__r);
      }
      (box.__lista||[]).forEach(function(e){var d=box.__listaVisivel?'':'none';if(e.style.display!==d)e.style.display=d;});
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
    box.__lista=listaAntiga(doc,box);box.__lista.forEach(function(e){e.style.display='none';});
    ligarTip(box,doc);
    box.addEventListener('click',async function(e){
      var t=e.target;
      var p=t.closest('[data-per]');if(p){periodo=Number(p.getAttribute('data-per'));desenhar(box,false);return;}
      var s=t.closest('[data-serie]');if(s){serie=s.getAttribute('data-serie');desenhar(box,false);return;}
      var ch=t.closest('[data-st]');if(ch){filtro.st=ch.getAttribute('data-st');redesenharLojas(box);return;}
      var cp=t.closest('[data-fpst]');if(cp){fp.st=cp.getAttribute('data-fpst');fp.lim=40;redesenharPessoas(box);return;}
      var er=t.closest('[data-esc-reg]');if(er){escopo.reg=er.getAttribute('data-esc-reg');escopo.loja='';desenhar(box,false);return;}
      var kc=t.closest('[data-kpi]');
      if(kc){var kk=kc.getAttribute('data-kpi');
        if(kk==='nota'){irPara(box,'notas');return;}
        if(kk==='lojas'){filtro.st='zerada';redesenharLojas(box);irPara(box,'lojas');return;}
        fp.st=kk;fp.g='';fp.lim=40;montar(box,box.__r);irPara(box,'pessoas');return;}
      var cg=t.closest('[data-cargo]');
      if(cg){var g=cg.getAttribute('data-cargo');fp.g=fp.g===g?'':g;fp.st=fp.g?'pend':'and';fp.lim=40;montar(box,box.__r);if(fp.g)irPara(box,'pessoas');return;}
      var fcb=t.closest('[data-fc]');if(fcb){fc.t=fcb.getAttribute('data-fc');fc.lim=5;var cc=box.querySelector('[data-coms]');if(cc)cc.innerHTML=cardComentarios(box.__r);return;}
      var rg=t.closest('tr[data-reg]');
      if(rg){var nr=rg.getAttribute('data-reg');escopo.reg=escopo.reg===nr?'':nr;escopo.loja='';filtro.st='todas';
        desenhar(box,false).then(function(){box.scrollIntoView({behavior:'smooth',block:'start'});});return;}
      var lj=t.closest('tr[data-loja]');
      if(lj){var k=lj.getAttribute('data-loja');box.__abertas=box.__abertas||{};box.__abertas[k]=!box.__abertas[k];redesenharLojas(box);
        var nv=box.querySelector('tr[data-loja="'+k+'"]');if(nv)nv.focus({preventScroll:true});return;}
      var ac=t.closest('[data-acao]');if(!ac||!box.__r)return;
      var acao=ac.getAttribute('data-acao');
      if(acao==='liberar')abrirLiberar(box);
      if(acao==='maispes'){fp.lim+=40;redesenharPessoas(box);}
      if(acao==='maiscom'){fc.lim+=10;var cm=box.querySelector('[data-coms]');if(cm)cm.innerHTML=cardComentarios(box.__r);}
      if(acao==='atualizar')desenhar(box,true);
      if(acao==='pdf'){imprimirRelatorio(doc,relatorioHtml(box.__r));
        msg(box,'Relatório '+(escopo.reg?'da regional '+esc(escopo.reg):'da rede + todas as regionais')+' aberto. Na janela de impressão, escolha “Salvar como PDF”.','ok');}
      if(acao==='registro'){box.__listaVisivel=!box.__listaVisivel;
        (box.__lista||[]).forEach(function(x){x.style.display=box.__listaVisivel?'':'none';});
        ac.setAttribute('aria-pressed',String(box.__listaVisivel));ac.textContent=(box.__listaVisivel?'Ocultar':'Ver')+' registro detalhado';
        if(box.__listaVisivel&&box.__lista[0])box.__lista[0].scrollIntoView({behavior:'smooth',block:'start'});}
      if(acao==='csv')baixar(doc,'treinamento-estoque-por-loja-'+chaveDia(new Date())+'.csv',csv(box.__r));
      if(acao==='cobranca'){
        var ok=await copiar(doc,textoCobranca(box.__r));
        msg(box,ok?'✓ Cobrança copiada'+(escopo.reg?' (regional '+esc(escopo.reg)+')':' (todas as regionais)')+'. É só colar no WhatsApp.':'Não foi possível copiar automaticamente.',ok?'ok':'erro');
      }
    });
    box.addEventListener('keydown',function(e){
      if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('tr[data-loja]')){e.preventDefault();e.target.click();}
    });
    box.addEventListener('input',function(e){
      if(e.target.getAttribute&&e.target.getAttribute('data-fp')==='q'){
        fp.q=e.target.value;fp.lim=40;clearTimeout(box.__tp);box.__tp=setTimeout(function(){redesenharPessoas(box);},200);return;
      }
      if(e.target.getAttribute&&e.target.getAttribute('data-f')==='q'){
        filtro.q=e.target.value;clearTimeout(box.__tq);box.__tq=setTimeout(function(){redesenharLojas(box);},200);
      }
    });
    box.addEventListener('change',function(e){
      if(e.target.getAttribute&&e.target.getAttribute('data-f')==='reg'){escopo.reg=e.target.value;redesenharLojas(box);}
      if(e.target.getAttribute&&e.target.getAttribute('data-fp')==='g'){fp.g=e.target.value;fp.lim=40;montar(box,box.__r);}
      if(e.target.getAttribute&&e.target.getAttribute('data-esc')==='loja'){escopo.loja=e.target.value;desenhar(box,false);}
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
      var todas=calcular(d),r=(escopo.reg||escopo.loja)?calcular(recorte(d)):todas;
      r.todas=todas;
      montar(box,r);
    }catch(e){
      console.warn('[protocolo-graficos]',e);
      (box.__esconder||[]).concat(box.__lista||[]).forEach(function(x){x.style.display='';});
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
