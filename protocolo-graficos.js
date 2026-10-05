/* Protocolo de Curso — painel de gráficos (2026-10-05).
   Carregado no shell do Portal. Procura, em qualquer módulo aberto (iframes da mesma origem),
   a área com os gráficos "Visualizações por dia", "Top lojas por visualizações" e
   "Cobertura por regional" e troca por um painel novo, legível e interativo:
   - Período (7 dias / 30 dias / tudo) aplicado a todos os gráficos.
   - Visualizações por dia: colunas empilhadas (concluídas × em andamento), dias sem acesso aparecem.
   - Funil: iniciaram → assistiram 90%+ → concluíram o vídeo → aprovados na avaliação.
   - Top lojas e Por módulo: barras horizontais com nome inteiro e valor ao lado.
   - Cobertura por regional: lojas com 1+ visualização sobre as lojas ativas (portal_lojas).
   - Tooltip em todas as barras e tabela de dados para quem prefere números.
   Os dados vêm direto do Supabase (somente leitura, com a sessão do Portal). Se algo falhar,
   os gráficos originais voltam a aparecer — nada do módulo original é apagado. */
(function(){
  if(window.__protocoloGraficos)return;window.__protocoloGraficos=true;
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co';
  var SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var DIA=86400000;
  var C={azul:'#3987e5',verde:'#199e70',f1:'#5598e7',f2:'#3987e5',f3:'#256abf',f4:'#1c5cab'};
  var periodo=30,cache=null,cacheEm=0;

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
  async function carregar(forcar){
    if(cache&&!forcar&&Date.now()-cacheEm<60000)return cache;
    var tk=await token();if(!tk)throw new Error('sem sessão do Portal');
    var res=await Promise.all([
      get(tk,'curso_visualizacoes?select=loja,modulo_id,modulo_nome,criado_em,concluido,percentual_assistido,avaliacao_aprovada&order=criado_em.asc&limit=20000'),
      get(tk,'portal_lojas?select=codigo,nome,ativo,regional_id'),
      get(tk,'portal_regionais?select=id,nome,ativo'),
      get(tk,'curso_catalogo?select=id,nome,ordem,area_id').catch(function(){return[];})
    ]);
    cache={vis:res[0],lojas:res[1],regs:res[2],cat:res[3]};cacheEm=Date.now();
    return cache;
  }

  /* ============================ CÁLCULO ============================ */
  function chaveDia(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function inicioDia(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  function titulo(s){return String(s||'').toLowerCase().replace(/(^|\s)\S/g,function(c){return c.toUpperCase();});}
  function calcular(dados){
    var lojaPorCod={},regPorId={};
    dados.regs.forEach(function(r){regPorId[r.id]=r;});
    dados.lojas.forEach(function(l){if(l.ativo!==false)lojaPorCod[l.codigo]=l;});
    var hoje=inicioDia(new Date());
    var corte=periodo?new Date(hoje.getTime()-(periodo-1)*DIA):null;
    var vis=dados.vis.filter(function(v){return !corte||new Date(v.criado_em)>=corte;});

    // Dias (inclui dias sem visualização)
    var ini=corte;
    if(!ini){ini=vis.length?inicioDia(new Date(Math.min.apply(null,vis.map(function(v){return new Date(v.criado_em).getTime();})))):hoje;}
    var dias=[],porDia={};
    for(var t=ini.getTime();t<=hoje.getTime()+1000;t+=DIA){
      var d=new Date(t);d=inicioDia(new Date(d.getTime()+3*3600000)); // robusto a horário de verão
      var k=chaveDia(d);if(porDia[k])continue;
      porDia[k]={d:d,conc:0,and:0};dias.push(porDia[k]);
    }
    var lojasMap={},modMap={},semCadastro={};
    var funil=[0,0,0,0];
    vis.forEach(function(v){
      var dt=new Date(v.criado_em),k=chaveDia(dt);
      var ok=!!v.concluido;
      if(porDia[k]){if(ok)porDia[k].conc++;else porDia[k].and++;}
      funil[0]++;
      if(ok||Number(v.percentual_assistido)>=90)funil[1]++;
      if(ok)funil[2]++;
      if(v.avaliacao_aprovada)funil[3]++;
      var m=String(v.loja||'').match(/^\s*0*(\d+)/),cod=m?Number(m[1]):null;
      var cad=cod!=null&&lojaPorCod[cod];
      var nomeLoja=cad?(cod+' · '+titulo(cad.nome)):String(v.loja||'Sem loja').trim();
      var chave=cad?'c'+cod:'x'+nomeLoja;
      if(!cad)semCadastro[nomeLoja]=1;
      var L=lojasMap[chave]||(lojasMap[chave]={nome:nomeLoja,conc:0,and:0,reg:cad&&regPorId[cad.regional_id]?titulo(regPorId[cad.regional_id].nome):(cad?'Sem regional':'Loja não cadastrada'),cod:cad?cod:null});
      if(ok)L.conc++;else L.and++;
      var mk=v.modulo_id||v.modulo_nome||'?';
      var M=modMap[mk]||(modMap[mk]={nome:v.modulo_nome||mk,conc:0,and:0,ordem:999});
      if(ok)M.conc++;else M.and++;
    });
    dados.cat.forEach(function(c){if(modMap[c.id]){modMap[c.id].ordem=c.ordem||999;modMap[c.id].nome=c.nome||modMap[c.id].nome;}});
    var lojas=Object.keys(lojasMap).map(function(k){var x=lojasMap[k];x.tot=x.conc+x.and;return x;})
      .sort(function(a,b){return b.tot-a.tot||b.conc-a.conc||a.nome.localeCompare(b.nome);});
    var mods=Object.keys(modMap).map(function(k){var x=modMap[k];x.tot=x.conc+x.and;return x;})
      .sort(function(a,b){return a.ordem-b.ordem||b.tot-a.tot;});

    // Cobertura por regional
    var cob={};
    Object.keys(lojaPorCod).forEach(function(cod){
      var l=lojaPorCod[cod],r=regPorId[l.regional_id],nome=r?titulo(r.nome):'Sem regional';
      var c=cob[nome]||(cob[nome]={nome:nome,total:0,comVis:0,lojas:[]});
      c.total++;
      if(lojasMap['c'+cod]){c.comVis++;c.lojas.push(cod+' · '+titulo(l.nome));}
    });
    var regs=Object.keys(cob).map(function(k){var x=cob[k];x.pct=x.total?x.comVis/x.total:0;return x;})
      .sort(function(a,b){return b.pct-a.pct||b.comVis-a.comVis||a.nome.localeCompare(b.nome);});
    var totLojas=Object.keys(lojaPorCod).length,lojasCom=lojas.filter(function(l){return l.cod!=null;}).length;
    return {vis:vis,dias:dias,lojas:lojas,mods:mods,regs:regs,funil:funil,totLojas:totLojas,lojasCom:lojasCom,
      semCadastro:Object.keys(semCadastro)};
  }

  /* ============================ VISUAL ============================ */
  var CSS=''
  +'.pg{--s1:#0f1a2e;--s2:#0b1424;--bd:#1f2d47;--tx:#eef3fb;--t2:#a9b7cc;--t3:#6f819c;--grid:#1c2943;'
  +'font-family:inherit;color:var(--tx);display:flex;flex-direction:column;gap:14px;margin:0 0 14px}'
  +'.pg *{box-sizing:border-box}'
  +'.pg-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
  +'.pg-res{font-size:13px;color:var(--t2)}.pg-res b{color:var(--tx);font-size:15px}'
  +'.pg-seg{display:inline-flex;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:3px;gap:2px}'
  +'.pg-seg button{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:var(--t2);padding:6px 12px;border-radius:7px}'
  +'.pg-seg button:hover{color:var(--tx)}.pg-seg button[aria-pressed=true]{background:#1d3a63;color:#fff}'
  +'.pg-seg button:focus-visible{outline:2px solid '+C.azul+';outline-offset:1px}'
  +'.pg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'
  +'.pg-card{background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;min-width:0}'
  +'.pg-card.full{grid-column:1/-1}'
  +'.pg-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 4px}'
  +'.pg-h h4{margin:0;font-size:14px;font-weight:800;letter-spacing:.2px;color:var(--tx)}'
  +'.pg-sub{font-size:12px;color:var(--t3);margin:0 0 14px}'
  +'.pg-leg{display:flex;gap:14px;font-size:12px;color:var(--t2);flex-wrap:wrap}'
  +'.pg-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}'
  +'.pg svg{display:block;width:100%;overflow:visible}'
  +'.pg svg text{font-family:inherit}'
  +'.pg-row{display:grid;grid-template-columns:minmax(110px,38%) 1fr 64px;align-items:center;gap:10px;padding:5px 0;border-radius:6px}'
  +'.pg-row:hover{background:rgba(255,255,255,.03)}'
  +'.pg-nm{font-size:13px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  +'.pg-nm small{display:block;font-size:11px;color:var(--t3)}'
  +'.pg-trk{height:12px;background:var(--s2);border-radius:4px;display:flex;gap:2px;overflow:hidden}'
  +'.pg-trk span{display:block;height:100%;min-width:0}.pg-trk span:last-child{border-radius:0 4px 4px 0}'
  +'.pg-v{font-size:13px;font-weight:800;text-align:right;color:var(--tx);font-variant-numeric:tabular-nums}'
  +'.pg-v small{display:block;font-weight:500;font-size:11px;color:var(--t3)}'
  +'.pg-fun{display:flex;flex-direction:column;gap:10px}'
  +'.pg-fun .pg-row{grid-template-columns:minmax(120px,40%) 1fr 74px}'
  +'.pg-vazio{font-size:13px;color:var(--t3);padding:18px 0;text-align:center}'
  +'.pg-nota{font-size:11.5px;color:var(--t3);margin-top:10px}'
  +'.pg-mais{all:unset;cursor:pointer;font-size:12px;font-weight:700;color:#86b6ef;margin-top:8px;display:inline-block}'
  +'.pg-tab{margin-top:2px}.pg-tab summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--t2)}'
  +'.pg-tab table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}'
  +'.pg-tab th,.pg-tab td{padding:6px 8px;border-bottom:1px solid var(--bd);text-align:left}'
  +'.pg-tab td.n,.pg-tab th.n{text-align:right;font-variant-numeric:tabular-nums}'
  +'.pg-tip{position:fixed;z-index:2147483000;pointer-events:none;background:#081120;border:1px solid #2b3e5f;border-radius:10px;'
  +'padding:9px 11px;font-size:12px;color:#eef3fb;box-shadow:0 10px 30px rgba(0,0,0,.45);min-width:150px;display:none;line-height:1.5}'
  +'.pg-tip b{display:block;font-size:12.5px;margin-bottom:3px}.pg-tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}'
  +'.pg-tip .r{display:flex;justify-content:space-between;gap:14px}.pg-tip .r span:last-child{font-weight:800}'
  +'.pg-erro{background:#2a1418;border:1px solid #5b2630;color:#fecaca;border-radius:10px;padding:10px 12px;font-size:12.5px}'
  +'@media (max-width:820px){.pg-grid{grid-template-columns:1fr}.pg-row{grid-template-columns:minmax(90px,42%) 1fr 56px}}';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pct(a,b){return b?Math.round(a/b*100)+'%':'—';}
  function plural(n,s,p){return n+' '+(n===1?s:p);}

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
      return '<div class="r"><span>'+(l[2]?'<i style="background:'+l[2]+'"></i>':'')+esc(l[0])+'</span><span>'+esc(l[1])+'</span></div>';
    }).join(''));
  }

  // Colunas empilhadas por dia
  function grafDias(r,largura){
    var dias=r.dias,n=dias.length;
    if(!r.vis.length)return '<div class="pg-vazio">Nenhuma visualização no período.</div>';
    var W=1000,H=230,pl=34,pr=8,pt=22,pb=28,iw=W-pl-pr,ih=H-pt-pb;
    var max=Math.max.apply(null,dias.map(function(d){return d.conc+d.and;}).concat([1]));
    var passo=max<=5?1:max<=10?2:max<=25?5:Math.ceil(max/5/5)*5;
    var topo=Math.ceil(max/passo)*passo;
    var y=function(v){return pt+ih-v/topo*ih;};
    var bw=iw/n,larg=Math.max(2,Math.min(38,bw*0.62));
    var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:'+H+'px" role="img" aria-label="Visualizações por dia">';
    for(var g=0;g<=topo;g+=passo){
      s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"'+(g?' stroke-dasharray="3 4"':'')+'/>';
    }
    s+='</svg>';
    // Rótulos e barras em HTML sobreposto (texto não distorce com preserveAspectRatio=none)
    var html='<div style="position:relative;height:'+H+'px">'+s;
    for(g=0;g<=topo;g+=passo){
      html+='<div style="position:absolute;left:0;width:'+(pl-6)/W*100+'%;top:'+(y(g)-7)+'px;font-size:11px;color:var(--t3);text-align:right">'+g+'</div>';
    }
    var cadaRot=Math.max(1,Math.ceil(n/Math.max(3,Math.min(12,Math.floor((largura||1000)/64)))));
    var comValor=dias.filter(function(d){return d.conc+d.and;}).length,maxIdx=-1,maxV=-1;dias.forEach(function(d,i){if(d.conc+d.and>maxV){maxV=d.conc+d.and;maxIdx=i;}});
    dias.forEach(function(d,i){
      var tot=d.conc+d.and,cx=(pl+bw*i+bw/2)/W*100;
      var dd=('0'+d.d.getDate()).slice(-2)+'/'+('0'+(d.d.getMonth()+1)).slice(-2);
      var semana=d.d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','');
      var hc=d.conc/topo*ih,ha=d.and/topo*ih,gap=(d.conc&&d.and)?2:0;
      html+='<div data-tip="'+tipHtml(semana+', '+dd,[['Concluídas',d.conc,C.verde],['Em andamento',d.and,C.azul],['Total',tot]])+'" '
        +'style="position:absolute;left:'+(pl+bw*i)/W*100+'%;width:'+bw/W*100+'%;top:'+pt+'px;height:'+ih+'px;cursor:default">'
        +(tot?'<div style="position:absolute;left:50%;transform:translateX(-50%);width:'+Math.max(4,larg/bw*100)+'%;bottom:0;height:'+(hc+ha+gap)+'px;display:flex;flex-direction:column;gap:'+gap+'px">'
          +(d.and?'<div style="flex:0 0 '+ha+'px;background:'+C.azul+';border-radius:4px 4px '+(d.conc?'0 0':'4px 4px')+'"></div>':'')
          +(d.conc?'<div style="flex:0 0 '+hc+'px;background:'+C.verde+';border-radius:'+(d.and?'0 0 0 0':'4px 4px 0 0')+'"></div>':'')
          +'</div>':'')
        +'</div>';
      if(tot&&(comValor<=20||i===maxIdx))
        html+='<div style="position:absolute;left:'+cx+'%;transform:translateX(-50%);top:'+(y(tot)-18)+'px;font-size:11.5px;font-weight:800;color:var(--tx);pointer-events:none">'+tot+'</div>';
      if(i%cadaRot===0||i===n-1)
        html+='<div style="position:absolute;left:'+cx+'%;transform:translateX(-50%);top:'+(H-pb+8)+'px;font-size:11px;color:'+(tot?'var(--t2)':'var(--t3)')+';white-space:nowrap;pointer-events:none">'+dd+'</div>';
    });
    return html+'</div>';
  }

  function linhaBarra(nome,sub,partes,max,valor,valSub,tipTxt){
    var tot=partes.reduce(function(a,p){return a+p[0];},0);
    var w=max?tot/max*100:0;
    var segs=partes.filter(function(p){return p[0]>0;}).map(function(p){
      return '<span style="flex:'+p[0]+' 0 0;background:'+p[1]+'"></span>';}).join('');
    return '<div class="pg-row" data-tip="'+tipTxt+'">'
      +'<div class="pg-nm" title="'+esc(nome)+'">'+esc(nome)+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>'
      +'<div class="pg-trk"><div style="display:flex;gap:2px;width:'+w+'%;min-width:'+(tot?4:0)+'px">'+segs+'</div></div>'
      +'<div class="pg-v">'+esc(valor)+(valSub?'<small>'+esc(valSub)+'</small>':'')+'</div></div>';
  }

  function grafLojas(r,todos){
    if(!r.lojas.length)return '<div class="pg-vazio">Nenhuma loja no período.</div>';
    var lista=todos?r.lojas:r.lojas.slice(0,8),max=r.lojas[0].tot;
    var h=lista.map(function(l){
      return linhaBarra(l.nome,l.reg,[[l.conc,C.verde],[l.and,C.azul]],max,l.tot,pct(l.conc,l.tot)+' concl.',
        tipHtml(l.nome,[['Regional',l.reg],['Concluídas',l.conc,C.verde],['Em andamento',l.and,C.azul],['Total',l.tot]]));
    }).join('');
    if(r.lojas.length>8)h+='<button type="button" class="pg-mais" data-acao="lojas">'+(todos?'Mostrar só as 8 primeiras':'Ver todas as '+r.lojas.length+' lojas')+'</button>';
    return h;
  }

  function grafMods(r){
    if(!r.mods.length)return '<div class="pg-vazio">Nenhum módulo assistido no período.</div>';
    var max=Math.max.apply(null,r.mods.map(function(m){return m.tot;}));
    return r.mods.map(function(m){
      return linhaBarra(m.nome,'',[[m.conc,C.verde],[m.and,C.azul]],max,m.tot,pct(m.conc,m.tot)+' concl.',
        tipHtml(m.nome,[['Concluídas',m.conc,C.verde],['Em andamento',m.and,C.azul],['Total',m.tot]]));
    }).join('');
  }

  function grafFunil(r){
    var f=r.funil,base=f[0];
    if(!base)return '<div class="pg-vazio">Sem dados no período.</div>';
    var et=[['Iniciaram o vídeo',f[0],C.f1],['Assistiram 90% ou mais',f[1],C.f2],['Concluíram o vídeo',f[2],C.f3],['Aprovados na avaliação',f[3],C.f4]];
    return '<div class="pg-fun">'+et.map(function(e,i){
      var ant=i?et[i-1][1]:null;
      return linhaBarra(e[0],'',[[e[1],e[2]]],base,e[1],pct(e[1],base),
        tipHtml(e[0],[['Visualizações',e[1],e[2]],['Do total',pct(e[1],base)]].concat(i?[['Da etapa anterior',pct(e[1],ant)]]:[])));
    }).join('')+'</div>';
  }

  function grafCob(r){
    if(!r.regs.length)return '<div class="pg-vazio">Sem lojas cadastradas.</div>';
    var h=r.regs.map(function(g){
      var w=g.pct*100;
      var tipL=[['Lojas ativas',g.total],['Com visualização',g.comVis,C.azul],['Sem visualização',g.total-g.comVis]];
      return '<div class="pg-row" data-tip="'+tipHtml('Regional '+g.nome,tipL)+(g.lojas.length?esc('<div style="margin-top:5px;color:#a9b7cc">'+g.lojas.map(esc).join('<br>')+'</div>'):'')+'">'
        +'<div class="pg-nm">'+esc(g.nome)+'<small>'+g.comVis+' de '+plural(g.total,'loja','lojas')+'</small></div>'
        +'<div class="pg-trk"><div style="width:'+w+'%;min-width:'+(g.comVis?4:0)+'px;background:'+C.azul+';border-radius:4px"></div></div>'
        +'<div class="pg-v">'+Math.round(w)+'%</div></div>';
    }).join('');
    h+='<div class="pg-nota">Rede: <b style="color:var(--tx)">'+r.lojasCom+' de '+r.totLojas+'</b> lojas ativas com pelo menos 1 visualização ('+pct(r.lojasCom,r.totLojas)+').'
      +(r.semCadastro.length?' Visualizações de loja não cadastrada: '+esc(r.semCadastro.join(', '))+'.':'')+'</div>';
    return h;
  }

  function tabela(r){
    var linhas=r.dias.filter(function(d){return d.conc+d.and;}).map(function(d){
      return '<tr><td>'+d.d.toLocaleDateString('pt-BR')+'</td><td class="n">'+d.conc+'</td><td class="n">'+d.and+'</td><td class="n">'+(d.conc+d.and)+'</td></tr>';
    }).join('');
    return '<details class="pg-tab"><summary>Ver tabela por dia</summary><table><thead><tr><th>Dia</th><th class="n">Concluídas</th><th class="n">Em andamento</th><th class="n">Total</th></tr></thead><tbody>'
      +(linhas||'<tr><td colspan="4">Sem dados</td></tr>')+'</tbody></table></details>';
  }

  var LEG='<div class="pg-leg"><span><i style="background:'+C.verde+'"></i>Concluídas</span><span><i style="background:'+C.azul+'"></i>Em andamento</span></div>';

  function montar(box,r){
    var tot=r.vis.length,conc=r.funil[2];
    var nomePer=periodo?'últimos '+periodo+' dias':'todo o período';
    var todasLojas=box.__todasLojas;
    box.innerHTML=''
      +'<div class="pg-bar"><div class="pg-res"><b>'+plural(tot,'visualização','visualizações')+'</b> '+(periodo?'nos últimos '+periodo+' dias':'em todo o período')
      +' · <b>'+conc+'</b> concluídas ('+pct(conc,tot)+') · <b>'+r.lojasCom+'</b> de '+r.totLojas+' lojas</div>'
      +'<div class="pg-seg" role="group" aria-label="Período">'
      +[[7,'7 dias'],[30,'30 dias'],[0,'Tudo']].map(function(p){return '<button type="button" data-per="'+p[0]+'" aria-pressed="'+(periodo===p[0])+'">'+p[1]+'</button>';}).join('')
      +'</div></div>'
      +'<div class="pg-grid">'
      +'<div class="pg-card full"><div class="pg-h"><h4>Visualizações por dia</h4>'+LEG+'</div><p class="pg-sub">Cada coluna é um dia ('+nomePer+'); passe o mouse para ver os números.</p>'+grafDias(r,box.clientWidth-40)+tabela(r)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Funil de conclusão</h4></div><p class="pg-sub">Quanto das visualizações chega até a aprovação.</p>'+grafFunil(r)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Cobertura por regional</h4></div><p class="pg-sub">Lojas ativas com pelo menos 1 visualização.</p>'+grafCob(r)+'</div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Top lojas</h4>'+LEG+'</div><p class="pg-sub">Visualizações por loja, da que mais assistiu para a que menos.</p><div data-lojas>'+grafLojas(r,todasLojas)+'</div></div>'
      +'<div class="pg-card"><div class="pg-h"><h4>Por módulo</h4>'+LEG+'</div><p class="pg-sub">Visualizações de cada módulo, na ordem do curso.</p>'+grafMods(r)+'</div>'
      +'</div>';
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

  function instalar(doc){
    if(!doc||!doc.body)return;
    var box=doc.querySelector('.pg[data-protocolo-graficos]');
    if(box&&box.isConnected&&box.__alvo&&box.__alvo.isConnected){
      if(box.__alvo.style.display!=='none')box.__alvo.style.display='none';
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
    if(!doc.getElementById('pg-css')){var st=doc.createElement('style');st.id='pg-css';st.textContent=CSS;doc.head.appendChild(st);}
    box=doc.createElement('section');box.className='pg';box.setAttribute('data-protocolo-graficos','1');
    box.innerHTML='<div class="pg-vazio">Carregando gráficos…</div>';
    var ref=alvo||cards[0];
    ref.parentNode.insertBefore(box,ref);
    var esconder=alvo?[alvo]:cards;
    box.__alvo=esconder[0];box.__esconder=esconder;
    esconder.forEach(function(e){e.style.display='none';});
    ligarTip(box,doc);
    box.addEventListener('click',function(e){
      var p=e.target.closest('[data-per]');
      if(p){periodo=Number(p.getAttribute('data-per'));desenhar(box,false);return;}
      if(e.target.closest('[data-acao=lojas]')){box.__todasLojas=!box.__todasLojas;desenhar(box,false);}
    });
    // Botão "Atualizar" do módulo também recarrega os gráficos.
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
      box.innerHTML='<div class="pg-erro">Não foi possível carregar o painel novo de gráficos ('+esc(e.message||e)+'). Mostrando os gráficos originais.</div>';
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
