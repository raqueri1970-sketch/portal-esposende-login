/* RL Transportes — dados do painel antigo (painel_v3) lidos do Supabase (2026-10-13).
   O painel_v3.html original busca tudo em http://<PC D90>:3456/api/...; aqui as mesmas rotas de leitura
   são respondidas com o espelho rl_* do Supabase, no mesmo formato do bot_v3.js (SQLite).
   Edição/exclusão/reprocessamento continuam só no PC: o SQLite do D90 é a fonte da verdade e o
   sync_supabase.js sobrescreve o espelho, então gravar aqui seria perdido.
*/
(function(){
  var SB_URL='https://rdztzurfesnobfkazgpm.supabase.co';
  var SB_KEY='sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
  var TIPOS_REAIS=['comprovante_pix','comprovante_ted','comprovante_boleto'];
  var MSG_SO_LEITURA='Este painel no Portal é só para consulta (dados do Supabase).\nEditar, excluir, reprocessar ou enviar foto continua sendo feito no PC do escritório (D90).';
  var sb=window.supabase.createClient(SB_URL,SB_KEY);
  var cache=null,cacheEm=0,carregando=null;

  function ehReal(t){return TIPOS_REAIS.indexOf(t)>=0}
  function num(v){return Number(v)||0}
  // Datas da RL são hora local gravada como UTC: devolve 'YYYY-MM-DD HH:MM:SS' como no SQLite.
  function dataLocal(iso){
    if(!iso)return iso;var d=new Date(iso);if(isNaN(d))return iso;
    return d.toISOString().slice(0,19).replace('T',' ');
  }
  function dia(r){return r.data_documento||String(r.data||'').slice(0,10)}
  function porDataDesc(a,b){return a.data<b.data?1:a.data>b.data?-1:(b.id-a.id)}

  async function sessao(){
    var s=(await sb.auth.getSession()).data.session;if(s)return s;
    try{
      var w=window.parent;
      for(var i=0;i<5&&w;i++){
        if(w.__PORTAL_SESSION&&w.__PORTAL_SESSION.access_token){
          await sb.auth.setSession({access_token:w.__PORTAL_SESSION.access_token,refresh_token:w.__PORTAL_SESSION.refresh_token||''});
          return (await sb.auth.getSession()).data.session;
        }
        if(w===w.parent)break;w=w.parent;
      }
    }catch(e){}
    return null;
  }

  async function lerTudo(tabela,campos){
    var out=[];
    for(var de=0;;de+=1000){
      var r=await sb.from(tabela).select(campos).order('id').range(de,de+999);
      if(r.error)throw new Error(tabela+': '+r.error.message);
      out=out.concat(r.data);if(r.data.length<1000)return out;
    }
  }

  async function carregar(forcar){
    if(!forcar&&cache&&Date.now()-cacheEm<20000)return cache;
    if(carregando)return carregando;
    carregando=(async function(){
      if(!await sessao())throw new Error('Sessão do Portal não encontrada. Feche e entre no Portal novamente.');
      var r=await Promise.all([
        lerTudo('rl_despesas','id,deposito_id,data,data_documento,hora_documento,valor,remetente,fornecedor,servico,placa,nf,cnpj,banco,pix,tipo_doc,descricao,arquivo,arquivo_hash,status,confianca,autenticacao,created_at'),
        lerTudo('rl_depositos','id,data,data_documento,hora_documento,valor,remetente,banco,pix,descricao,arquivo,arquivo_hash,saldo_restante,status,autenticacao,created_at'),
        lerTudo('rl_ajustes','id,data,valor,descricao,created_at'),
        sb.from('rl_saldo_inicial').select('id,valor,data,descricao,created_at').eq('id',1).maybeSingle(),
        lerTudo('rl_fornecedores','id,nome,total_gasto,total_ocorrencias,updated_at'),
        sb.from('capturador_status').select('instancia,atualizado_em,whatsapp_estado,ia,versao')
      ]);
      function conv(x){x.data=dataLocal(x.data);x.created_at=dataLocal(x.created_at);x.valor=num(x.valor);if('saldo_restante' in x)x.saldo_restante=num(x.saldo_restante);x.ocr_json=null;return x}
      var si=r[3].data||null;
      if(si){si.valor=num(si.valor);si.data=String(dataLocal(si.data)||'').slice(0,10)}
      cache={
        despesas:r[0].map(conv).sort(porDataDesc),
        depositos:r[1].map(conv).sort(porDataDesc),
        ajustes:r[2].map(conv).sort(porDataDesc),
        saldoInicial:si,
        fornecedores:r[4].map(function(f){f.total_gasto=num(f.total_gasto);f.updated_at=dataLocal(f.updated_at);return f}).sort(function(a,b){return b.total_gasto-a.total_gasto}),
        capturadores:r[5].error?[]:(r[5].data||[])
      };
      cacheEm=Date.now();return cache;
    })();
    try{return await carregando}finally{carregando=null}
  }

  function soma(l){return l.reduce(function(s,x){return s+num(x.valor)},0)}
  function agrupar(l,campo,lim){
    var m={};l.forEach(function(d){var k=d[campo];if(k==null||k==='')return;if(!m[k])m[k]={nome:k,total:0,qtd:0};m[k].total+=num(d.valor);m[k].qtd++});
    var a=Object.values(m).sort(function(x,y){return y.total-x.total});return lim?a.slice(0,lim):a;
  }
  function param(qs,n){var m=new RegExp('[?&]'+n+'=([^&]*)').exec(qs);return m?decodeURIComponent(m[1].replace(/\+/g,' ')):''}

  // Mesmas regras do bot_v3.js (/api/...), sobre o espelho.
  var rotas={
    '/api/config':function(c){
      var d90=c.capturadores.filter(function(x){return x.instancia!=='nuvem'})[0];
      var on=d90&&(Date.now()-new Date(d90.atualizado_em).getTime())<30*60000;
      return {grupo:'',tem_ia:true,banco:'Supabase (espelho)',versao:'portal',pc_online:!!on,pc_visto:d90?d90.atualizado_em:null};
    },
    '/api/dashboard':function(c){
      var dep=c.depositos,des=c.despesas.filter(function(d){return d.status!=='cancelado'&&ehReal(d.tipo_doc)});
      var aPos=c.ajustes.filter(function(a){return a.valor>0}),aNeg=c.ajustes.filter(function(a){return a.valor<0});
      var out={total_depositos:soma(dep)+soma(aPos),qtd_depositos:dep.length+aPos.length,depositos_ativos:dep.filter(function(d){return d.status==='ativo'}).length,
        total_despesas:soma(des)+Math.abs(soma(aNeg)),qtd_despesas:des.length+aNeg.length,sem_deposito:des.filter(function(d){return d.deposito_id==null}).length,
        total_ajustes:soma(c.ajustes),qtd_ajustes:c.ajustes.length,saldo_inicial:c.saldoInicial};
      var si=c.saldoInicial;
      if(si){
        var desde=function(x){return dia(x)>=si.data};
        out.saldo_disponivel=si.valor+soma(dep.filter(desde))+soma(aPos.filter(function(a){return a.data.slice(0,10)>=si.data}))
          -soma(des.filter(desde))-Math.abs(soma(aNeg.filter(function(a){return a.data.slice(0,10)>=si.data})));
      }else out.saldo_disponivel=out.total_depositos-out.total_despesas;
      return out;
    },
    '/api/saldo-inicial':function(c){return c.saldoInicial},
    '/api/despesas':function(c){return c.despesas},
    '/api/depositos':function(c){return c.depositos},
    '/api/ajustes':function(c){return c.ajustes},
    '/api/fornecedores':function(c){return c.fornecedores},
    '/api/conciliacao':function(c){
      return c.depositos.slice(0,100).map(function(dep){
        var ds=c.despesas.filter(function(d){return d.deposito_id===dep.id&&d.status!=='cancelado'});
        var tot=soma(ds.filter(function(d){return ehReal(d.tipo_doc)}));
        return Object.assign({},dep,{despesas:ds,qtd_despesas:ds.length,total_despesas:tot,pct_utilizado:dep.valor>0?Math.round(tot/dep.valor*1000)/10:0});
      });
    },
    '/api/gastos_placa':function(c){
      var m={};c.despesas.filter(function(d){return d.status!=='cancelado'&&ehReal(d.tipo_doc)}).forEach(function(d){
        var k=d.placa||'Sem placa';if(!m[k])m[k]={placa:k,total_servicos:0,total_gasto:0,ultimo_servico:d.data};
        m[k].total_servicos++;m[k].total_gasto+=d.valor;if(d.data>m[k].ultimo_servico)m[k].ultimo_servico=d.data;
      });
      return Object.values(m).sort(function(a,b){return b.total_gasto-a.total_gasto});
    },
    '/api/busca-index':function(c){
      return {fornecedores:agrupar(c.despesas,'fornecedor',30),tipos:agrupar(c.despesas,'tipo_doc'),placas:agrupar(c.despesas,'placa',20),servicos:agrupar(c.despesas,'servico',15)};
    },
    '/api/busca':function(c,qs){
      var q=param(qs,'q').toLowerCase(),di=param(qs,'di'),df=param(qs,'df');
      return c.despesas.filter(function(d){
        var hit=['fornecedor','placa','nf','descricao','pix','banco','servico','tipo_doc'].some(function(k){return d[k]!=null&&String(d[k]).toLowerCase().indexOf(q)>=0});
        if(!hit)return false;var ref=d.data_documento||d.data;
        if(di&&ref<di)return false;if(df&&ref>df+' 23:59:59')return false;return true;
      }).sort(function(a,b){var x=a.data_documento||a.data,y=b.data_documento||b.data;return x<y?1:x>y?-1:0}).slice(0,200);
    },
    '/api/periodo':function(c,qs){
      var di=param(qs,'di')||'2000-01-01',df=param(qs,'df')||'2099-12-31',dff=df+' 23:59:59';
      function dentro(x){var ref=x.data_documento||x.data;return ref>=di&&ref<=dff}
      function ord(a,b){var x=a.data_documento||a.data,y=b.data_documento||b.data;return x<y?1:x>y?-1:0}
      var deps=c.depositos.filter(dentro).sort(ord),desps=c.despesas.filter(function(d){return dentro(d)&&d.status!=='cancelado'}).sort(ord);
      var reais=desps.filter(function(d){return ehReal(d.tipo_doc)});
      var pf={};reais.forEach(function(d){var k=d.fornecedor||'Sem fornecedor';if(!pf[k])pf[k]={nome:k,total:0,qtd:0,tipo:d.tipo_doc};pf[k].total+=d.valor;pf[k].qtd++});
      var pt={};desps.forEach(function(d){var k=d.tipo_doc||'outros';if(!pt[k])pt[k]={tipo:k,total:0,qtd:0};pt[k].total+=d.valor;pt[k].qtd++});
      var td=soma(deps),tds=soma(reais);
      return {periodo:{di:di,df:df},depositos:{total:td,qtd:deps.length,itens:deps},despesas:{total:tds,qtd:desps.length,itens:desps},saldo:td-tds,
        por_fornecedor:Object.values(pf).sort(function(a,b){return b.total-a.total}),por_tipo:Object.values(pt).sort(function(a,b){return b.total-a.total})};
    },
    '/api/auditoria':function(c){
      var ativos=c.despesas.filter(function(d){return d.status!=='cancelado'});
      function grupos(lista,chave,tipo,ref,tabela){
        var m={};lista.forEach(function(d){var k=chave(d);if(k==null)return;(m[k]=m[k]||[]).push(d)});
        return Object.keys(m).filter(function(k){return m[k].length>1}).map(function(k){var g=m[k];var ds=g.map(function(x){return x.data}).sort();
          return {tipo_alerta:tipo,referencia:ref(g[0]),ocorrencias:g.length,valor_total:soma(g),primeira:ds[0],ultima:ds[ds.length-1],tabela:tabela,ids:g.map(function(x){return x.id}).join(',')}});
      }
      function um(d,tipo){return {tipo_alerta:tipo,referencia:d.descricao,ocorrencias:1,valor_total:d.valor,primeira:d.data,ultima:d.data,tabela:'despesa',ids:String(d.id)}}
      return [].concat(
        grupos(ativos,function(d){return d.autenticacao?[d.autenticacao,dia(d),d.hora_documento].join('|'):null},'Foto Duplicada Confirmada',function(d){return (d.fornecedor||'')+' — autenticação '+d.autenticacao},'despesa'),
        grupos(ativos,function(d){return d.arquivo_hash||null},'Foto Identica Reenviada (Despesa)',function(d){return 'hash '+d.arquivo_hash.slice(0,10)},'despesa'),
        grupos(c.depositos,function(d){return d.arquivo_hash||null},'Foto Identica Reenviada (Deposito)',function(d){return 'hash '+d.arquivo_hash.slice(0,10)},'deposito'),
        grupos(ativos,function(d){return d.arquivo||null},'Despesa - Arquivo Duplicado',function(d){return d.arquivo},'despesa'),
        grupos(c.depositos,function(d){return d.arquivo||null},'Deposito - Arquivo Duplicado',function(d){return d.arquivo},'deposito'),
        grupos(ativos.filter(function(d){return d.valor>0&&d.fornecedor!=null}),function(d){return [d.fornecedor,d.valor,dia(d),d.hora_documento||''].join('|')},'Possivel Lancamento Duplicado',function(d){return d.fornecedor+' — R$ '+d.valor},'despesa'),
        grupos(ativos,function(d){return d.nf||null},'NF Duplicada',function(d){return d.nf},'despesa'),
        c.despesas.filter(function(d){return d.deposito_id==null&&d.status==='confirmado'}).slice(0,50).map(function(d){return um(d,'Despesa sem Deposito')}),
        c.despesas.filter(function(d){return d.valor>20000&&d.status==='confirmado'}).map(function(d){return um(d,'Valor Alto')})
      );
    },
    '/api/logs':function(c){
      return c.capturadores.map(function(x){return {ts:dataLocal(x.atualizado_em),nivel:'info',evento:'Capturador '+x.instancia+' ('+(x.versao||'')+') — WhatsApp: '+(x.whatsapp_estado||'?')+' — IA: '+(x.ia||'?')+' — último sinal (UTC): '+x.atualizado_em}});
    }
  };

  // Miniaturas apontam para o PC D90 (http): fora do Tailscale não carregam; mostra um ícone no lugar.
  document.addEventListener('error',function(ev){
    var im=ev.target;if(!im||im.tagName!=='IMG'||!im.classList.contains('foto-thumb')||im.__rlSemFoto)return;
    im.__rlSemFoto=true;im.alt='📷';im.title='Comprovante no PC do escritório (D90)';
    im.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#1e293b"/><path d="M7 8h2l1-2h4l1 2h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="none" stroke="#64748b" stroke-width="1.4"/><circle cx="12" cy="13" r="2.6" fill="none" stroke="#64748b" stroke-width="1.4"/></svg>');
  },true);

  window.RLDados={
    MSG_SO_LEITURA:MSG_SO_LEITURA,
    recarregar:function(){cacheEm=0},
    api:async function(rota){
      var i=rota.indexOf('?'),url=i<0?rota:rota.slice(0,i),qs=i<0?'':rota.slice(i);
      var fn=rotas[url];if(!fn)return null;
      try{return fn(await carregar(false),qs)}catch(e){console.error('[RL] '+rota,e);RLDados.erro(e);return null}
    },
    somenteLeitura:function(){alert(MSG_SO_LEITURA);return false},
    erro:function(e){
      var el=document.getElementById('rlAvisoPortal');
      if(el){el.textContent='⚠️ Não foi possível ler os dados: '+(e&&e.message||e);el.style.display='block'}
    },
    status:async function(){
      try{var c=await carregar(false);return c}catch(e){return null}
    }
  };
})();
