/* NF-e Canceladas: a tela abre sempre com a versão da nuvem.
   Caso (16/11/2026): o navegador de quem já carregou arquivos guarda esses arquivos e, ao abrir o
   módulo, reprocessa e tenta gravar de novo (ex.: CANCELADA JUN - SET, 721 notas). A trava da nuvem
   recusa e mantém a base certa (1.818 notas de 05/11), mas a tela dessa pessoa continuava com a
   versão velha — ou ficava em branco, sem o módulo avisar o Portal de que havia dado.
   O que este patch faz, só no NF-e:
     1) Lê a versão da nuvem (portal_sync, module_id 'nf') com a sessão do Portal.
     2) Confere o que o módulo está mostrando (quantidade de notas + soma).
     3) Se a tela está vazia, ou mostra uma versão que já saiu da nuvem / foi recusada
        (public.portal_nf_versoes_antigas(), migração 20261116_status_envio_recusado.sql),
        troca pela versão da nuvem e mostra o módulo.
     Carga nova legítima (versão que a nuvem ainda não conhece) não é tocada: ela vai para a nuvem normalmente.
   Para desligar: remova a linha do nf-nuvem-patch.js no index.html. */
(function(){
  if(window.__nfNuvemPatch)return;window.__nfNuvemPatch=true;
  var PID='nf',CACHE_KEY='nfe_canceladas_cache_v1';
  var nuvem={em:null,payload:null,assin:null,antigas:[],lidoEm:0};
  var ultimoUpload=0,ocupado=false;

  function sb(){
    try{if(typeof portalSb!=='undefined'&&portalSb)return portalSb;}catch(e){}
    try{if(typeof sb_!=='undefined'&&sb_)return sb_;}catch(e){}
    try{if(window.supabaseClient)return window.supabaseClient;}catch(e){}
    return null;
  }
  function assin(regs){
    if(!Array.isArray(regs))return null;
    var s=0;
    for(var i=0;i<regs.length;i++){var v=parseFloat(regs[i]&&regs[i].total);if(isFinite(v))s+=v;}
    return {n:regs.length,soma:Math.round(s*100)/100};
  }
  function igual(a,b){return !!(a&&b&&a.n===b.n&&Math.abs(a.soma-b.soma)<0.015);}
  function aviso(m){try{if(typeof toast==='function')toast(m);}catch(e){}}

  // Marca carga manual pelo painel do Portal: durante o processamento a lista fica vazia por instantes.
  try{
    if(typeof doInject==='function'&&!doInject.__nfNuvem){
      var orig=doInject;
      doInject=function(pid){if(pid===PID)ultimoUpload=Date.now();return orig.apply(this,arguments);};
      doInject.__nfNuvem=true;
    }
  }catch(e){}

  async function lerNuvem(){
    var c=sb();if(!c)return false;
    if(Date.now()-nuvem.lidoEm<20000&&nuvem.payload)return true;
    try{
      var r=await c.from('portal_sync').select('updated_at').eq('module_id',PID).maybeSingle();
      if(r.error||!r.data)return false;
      if(r.data.updated_at!==nuvem.em||!nuvem.payload){
        var r2=await c.from('portal_sync').select('payload,updated_at').eq('module_id',PID).maybeSingle();
        if(r2.error||!r2.data||!r2.data.payload||!Array.isArray(r2.data.payload.registros))return false;
        nuvem.payload=r2.data.payload;nuvem.em=r2.data.updated_at;nuvem.assin=assin(r2.data.payload.registros);
      }
      try{var r3=await c.rpc('portal_nf_versoes_antigas');if(!r3.error&&Array.isArray(r3.data))nuvem.antigas=r3.data;}catch(e){}
      nuvem.lidoEm=Date.now();
      return true;
    }catch(e){return false;}
  }

  function janela(){
    var ifr=document.getElementById('ifr-'+PID);
    if(!ifr||!ifr.src||ifr.src==='about:blank')return null;
    if(typeof LOADED!=='undefined'&&!LOADED[PID])return null;
    try{var w=ifr.contentWindow;if(w&&w.document&&w.document.readyState!=='loading')return w;}catch(e){}
    return null;
  }
  function ler(w,nome){try{return w.eval(nome);}catch(e){return undefined;}}
  function mostrarModulo(){
    var sp=document.getElementById('sp-'+PID),up=document.getElementById('up-'+PID),ifr=document.getElementById('ifr-'+PID);
    if(sp)sp.classList.remove('on');
    if(ifr)ifr.classList.add('on');
    if(up)up.style.display='none';
  }
  function trocarArray(alvo,origem){
    if(!Array.isArray(alvo))return false;
    alvo.length=0;(origem||[]).forEach(function(x){alvo.push(x);});return true;
  }

  function aplicarNuvem(w){
    var p=nuvem.payload;
    // 1) Caminho do próprio módulo: grava o cache local com a versão da nuvem e pede para restaurar.
    try{w.localStorage.setItem(CACHE_KEY,JSON.stringify(Object.assign({},p,{savedAt:nuvem.em})));}catch(e){}
    try{if(typeof w.restaurarCacheNF==='function')w.restaurarCacheNF();}catch(e){}
    // 2) Se o módulo não ficou com a versão da nuvem, troca direto as listas e redesenha.
    if(!igual(assin(ler(w,'REGISTROS')),nuvem.assin)){
      var ok=trocarArray(ler(w,'REGISTROS'),p.registros);
      trocarArray(ler(w,'LOJAS'),p.lojas);
      trocarArray(ler(w,'USUARIOS'),p.usuarios);
      if(!ok)return false;
      try{if(typeof w.atualizarDashboardCompleto==='function')w.atualizarDashboardCompleto();
          else if(typeof w.aplicarFiltros==='function')w.aplicarFiltros();}catch(e){console.warn('[nf-nuvem] redesenho',e);}
      try{if(typeof w.fecharTelaUpload==='function')w.fecharTelaUpload(true);}catch(e){}
    }
    mostrarModulo();
    try{if(typeof rdKPIs==='function')setTimeout(function(){rdKPIs(PID);},800);}catch(e){}
    return igual(assin(ler(w,'REGISTROS')),nuvem.assin);
  }

  async function conferir(){
    if(ocupado)return;ocupado=true;
    try{
      var w=janela();if(!w)return;
      var R=ler(w,'REGISTROS');if(!Array.isArray(R))return; // módulo ainda montando
      if(!(await lerNuvem()))return;
      var a=assin(R);
      if(igual(a,nuvem.assin)){
        // Tem a versão da nuvem, mas o Portal pode não ter sido avisado (tela em branco).
        var ifr=document.getElementById('ifr-'+PID);
        if(ifr&&!ifr.classList.contains('on')&&a.n>0)mostrarModulo();
        return;
      }
      var vazio=a.n===0;
      if(vazio&&Date.now()-ultimoUpload<180000)return; // carga manual em andamento
      var antiga=(nuvem.antigas||[]).some(function(x){return igual(a,{n:Number(x.n),soma:Number(x.soma)});});
      if(!vazio&&!antiga)return; // versão que a nuvem ainda não conhece: carga nova, não mexe
      if(aplicarNuvem(w)){
        console.log('[nf-nuvem] tela trocada para a versão da nuvem:',nuvem.assin.n,'notas de',nuvem.em,
          vazio?'(tela vazia)':'(tela tinha versão antiga: '+a.n+' notas)');
        if(!vazio)aviso('☁ NF-e: este navegador tinha uma versão antiga ('+a.n+' notas). Mostrando a da nuvem ('+nuvem.assin.n+' notas).');
      }
    }catch(e){console.warn('[nf-nuvem] conferência falhou',e);}
    finally{ocupado=false;}
  }

  function noModulo(){var pg=document.getElementById('pg-'+PID);return !!(pg&&pg.classList.contains('on'));}
  // Rodadas logo após abrir o módulo (o reprocessamento do cache acontece nos primeiros segundos)
  // e depois a cada 15 s enquanto o NF-e estiver na tela.
  var rodadas=[];
  function agendar(){
    rodadas.forEach(clearTimeout);
    rodadas=[2500,6000,12000,20000,35000].map(function(ms){return setTimeout(conferir,ms);});
  }
  try{
    if(typeof go==='function'&&!go.__nfNuvem){
      var goOrig=go;
      go=function(pid){var r=goOrig.apply(this,arguments);if(pid===PID)agendar();return r;};
      go.__nfNuvem=true;
    }
  }catch(e){}
  document.addEventListener('load',function(ev){var t=ev.target;if(t&&t.id==='ifr-'+PID)agendar();},true);
  setInterval(function(){if(noModulo()&&!document.hidden)conferir();},15000);
  if(noModulo())agendar();
  window.portalNfConferirNuvem=conferir;
})();
