/* Estado de tela dos módulos — correção da restauração de filtros (NF-e Canceladas e demais).
   Problema (05/11/2026): o portal guarda no navegador de cada pessoa o estado da tela de cada
   módulo (campos, caixas marcadas, aba) e o restaura ao abrir. As caixinhas dos filtros de
   vendedor/usuário/loja não têm id nem name, então eram reencontradas pela POSIÇÃO na página.
   Quando outra pessoa sobe arquivos novos, entram vendedores/lojas novos, as posições mudam e a
   marcação antiga cai em outro nome: o filtro liga sozinho e os cartões do NF-e mostram só
   algumas notas (ex.: 4 notas / R$ 1.694,94 em vez de 1.818 / R$ 311.760,40), enquanto gráficos
   e ranking (que não usam filtro) já mostram os dados novos.
   Correção:
   1) Caixas de marcar/opções sem id e sem name não são mais salvas nem restauradas (em todos
      os módulos). No NF-e, nenhum campo sem id é restaurado (as listas mudam a cada carga).
      Estados antigos já gravados no navegador são limpos na hora de restaurar.
   2) NF-e: quando os dados do módulo mudam (carga da nuvem ou upload) e não há filtro ligado,
      os cartões são recalculados sobre a base inteira.
   Para voltar ao comportamento anterior: remova a linha do estado-modulos-patch.js no index.html. */
(function(){
  if(window.__estadoModulosPatch)return;window.__estadoModulosPatch=true;

  // Regra única (pai e módulo usam a mesma): o campo pode ser restaurado com segurança?
  function campoSeguro(pid,r){
    if(!r)return false;
    var temId=!!(r.id&&String(r.id).trim()),temNome=!!(r.name&&String(r.name).trim());
    var t=String(r.type||'').toLowerCase();
    if((t==='checkbox'||t==='radio')&&!temId&&!temNome)return false;
    if(pid==='nf'&&!temId)return false;
    return true;
  }
  function limparEstado(pid,st){
    try{
      if(st&&Array.isArray(st.fields))st.fields=st.fields.filter(function(r){return campoSeguro(pid,r);});
    }catch(e){}
    return st;
  }
  window.__portalCampoSeguro=campoSeguro;

  // ── Lado do portal: não grava no navegador caixas sem identificação ──
  window.addEventListener('message',function(ev){
    var d=ev.data;if(!d||d.type!=='portalModuleStateSave'||!d.pid||!d.state)return;
    limparEstado(d.pid,d.state);
  },true);

  // ── Lado do módulo: script que roda dentro de cada módulo, ANTES do restaurador do portal ──
  var FILHO=function(){
    if(window.__estadoModulosFilho)return;window.__estadoModulosFilho=true;
    var P='';try{var f=window.frameElement;P=f&&f.id?String(f.id).replace(/^ifr-/,''):'';}catch(e){}
    function campoSeguro(r){
      if(!r)return false;
      var temId=!!(r.id&&String(r.id).trim()),temNome=!!(r.name&&String(r.name).trim());
      var t=String(r.type||'').toLowerCase();
      if((t==='checkbox'||t==='radio')&&!temId&&!temNome)return false;
      if(P==='nf'&&!temId)return false;
      return true;
    }
    // Limpa o estado salvo antes de o restaurador original aplicar (inclui estados antigos).
    window.addEventListener('message',function(ev){
      var d=ev.data;if(!d||d.type!=='portalModuleStateRestore'||!d.state||!Array.isArray(d.state.fields))return;
      try{d.state.fields=d.state.fields.filter(campoSeguro);}catch(e){}
    },true);
    if(P!=='nf')return;

    // NF-e: recalcula os cartões quando a base muda e nenhum filtro está ligado.
    function g(n){try{return (0,eval)(n);}catch(e){return undefined;}}
    function semFiltro(){
      try{
        var ms=g('msState');
        if(ms)for(var k in ms){if(ms[k]&&ms[k].size>0)return false;}
        var per=g('periodoSelecionado');if(per&&(per.de||per.ate))return false;
        var aba=g('tabAtiva');if(aba&&aba!=='all')return false;
        var v=document.getElementById('f-valor'),c=document.getElementById('f-codigo');
        if(v&&String(v.value||'').trim())return false;
        if(c&&String(c.value||'').trim())return false;
        return true;
      }catch(e){return false;}
    }
    var ultimaAssinatura='';
    function verificar(){
      try{
        var R=g('REGISTROS');if(!R||!R.length)return;
        var ass=R.length+'|'+(R[0]&&R[0].codigo)+'|'+(R[R.length-1]&&R[R.length-1].codigo);
        var el=document.getElementById('kpi-total');
        var mostrado=el?parseInt(String(el.textContent||'').replace(/\D/g,''),10):NaN;
        var mudou=ass!==ultimaAssinatura;ultimaAssinatura=ass;
        if(!semFiltro())return;
        if((mudou||mostrado!==R.length)&&typeof window.aplicarFiltros==='function'){
          window.aplicarFiltros();
        }else if(mostrado!==R.length&&typeof window.atualizarKPIs==='function'){
          window.atualizarKPIs(R.slice());
        }
      }catch(e){}
    }
    var n=0,t=setInterval(function(){verificar();if(++n>=30){clearInterval(t);setInterval(verificar,10000);}},1000);
    window.addEventListener('message',function(){setTimeout(verificar,2500);});
  };
  var TAG='<script id="portal-estado-modulos-fix">('+FILHO.toString()+')();<\/script>';

  // Coloca o script do módulo antes do restaurador do portal (PERSIST_PATCH é global "var").
  try{
    if(typeof PERSIST_PATCH==='string'&&PERSIST_PATCH.indexOf('portal-estado-modulos-fix')<0){
      PERSIST_PATCH=TAG+PERSIST_PATCH;
      // Módulos já preparados antes deste patch carregar: refaz na próxima abertura.
      if(typeof BLOBS!=='undefined'&&typeof LOADED!=='undefined'){
        Object.keys(BLOBS).forEach(function(pid){
          if(LOADED[pid])return;
          try{URL.revokeObjectURL(BLOBS[pid]);}catch(e){}
          delete BLOBS[pid];
        });
      }
    }
  }catch(e){console.warn('[estado-modulos] não foi possível ajustar o restaurador',e);}

  // Garantia: módulo NF-e/outros já abertos recebem o script pelo iframe.
  function aplicarNoIframe(ifr){
    try{
      var w=ifr.contentWindow,d=ifr.contentDocument;
      if(!w||!d||!d.body||w.__estadoModulosFilho)return;
      var s=d.createElement('script');s.id='portal-estado-modulos-fix';
      s.textContent='('+FILHO.toString()+')();';
      d.body.appendChild(s);
    }catch(e){}
  }
  function varrer(){document.querySelectorAll('iframe[id^="ifr-"]').forEach(aplicarNoIframe);}
  setInterval(varrer,5000);
})();
