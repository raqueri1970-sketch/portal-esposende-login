/* Central de Auditoria RH — importar várias folhas de uma vez + histórico multi-competência (20261117-2).
   O módulo RH (iframe ifr-rh, arquivo do Portal no Supabase Storage) ganha: Dados → Importar Folhas,
   Folhas por Competência, Histórico/Comparativo/Anomalias/Previsões com a série de folhas e o histórico
   mês a mês no dossiê do funcionário. Folhas gravadas no Supabase (rh_folhas_competencias, RLS portal_pode('rh'),
   CPF mascarado) e compartilhadas entre todos os usuários de RH.
   Fonte: repositório sistema-de-auditoria, pasta rh-auditoria/ (gerado por ferramentas/gerar_patch_portal.py).
   Uso no index.html do Portal: inserirAntesDoFimDoBody(html,'<scr'+'ipt src="'+new URL('rh-folhas-patch.js?v=20261117-2',location.href).href+'"></scr'+'ipt>'); */
(function(){
  if(window.__rhfPatch)return;window.__rhfPatch='20261117-2';
  var VER=window.__rhfPatch;
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var CSS="\n.folhas-banner{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;margin:0 0 16px;border:1px solid var(--neon-blue);border-radius:12px;background:rgba(79,168,255,.08)}\n.folhas-banner .sub{font-size:12.5px;color:var(--ink2);margin-top:3px}\n.dash-btn.primary-imp{background:var(--blue);border-color:var(--blue);color:#fff}\n.imp-drop{border:2px dashed var(--neon-blue);border-radius:14px;padding:34px 18px;text-align:center;cursor:pointer;background:rgba(79,168,255,.06);transition:.15s;margin-bottom:14px}\n.imp-drop:hover,.imp-drop.over,.imp-drop:focus{background:rgba(79,168,255,.16);outline:none}\n.imp-drop .big{font-size:18px;font-weight:800;color:var(--ink)}.imp-drop .sm{font-size:12.5px;color:var(--ink2);margin-top:6px}\n#imp-log{display:flex;flex-direction:column;gap:6px;margin:10px 0 0}\n.imp-log-l{font-size:12.5px;padding:8px 10px;border-radius:8px;background:var(--surface2);color:var(--ink2);border-left:3px solid var(--muted)}\n.imp-log-l span{color:var(--muted);font-family:ui-monospace,monospace;margin-right:6px}\n.imp-log-l.ok{border-left-color:var(--good)}.imp-log-l.err{border-left-color:var(--critical);color:var(--ink)}.imp-log-l.warn{border-left-color:var(--warning)}\n.imp-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}\n.imp-chip{font-size:12px;padding:4px 9px;border-radius:999px;background:var(--surface2);border:1px solid var(--border);cursor:pointer}\n.imp-chip:hover{border-color:var(--neon-blue)}\n#pg-folhas details,#pg-folhas summary{font-size:13px}#pg-folhas summary{cursor:pointer;color:var(--neon-blue);margin:8px 0}\n.nav-n{float:right;font-size:10.5px;background:var(--blue);color:#fff;border-radius:999px;padding:1px 7px;margin-left:6px}\n#main{min-width:0}\n.page .tablewrap{max-width:100%}\n#pg-folhas .muted-box,#pg-historico .muted-box,#pg-comparativo .muted-box,#pg-anomalias .muted-box,#pg-previsoes .muted-box,#pg-importar .muted-box{font-size:13px;line-height:1.6}\n@media print{.folhas-banner,.imp-drop,#imp-log{display:none!important}}\n", NAV="<button data-page=\"pg-importar\" style=\"font-weight:700;color:var(--neon-blue)\">📥 Importar Folhas</button>\n  <button data-page=\"pg-folhas\">🗓️ Folhas por Competência <span class=\"nav-n\" id=\"nav-folhas-n\"></span></button>", PAGES="<section class=\"page\" id=\"pg-importar\">\n    <h1>Importar Folhas</h1>\n    <p class=\"sub\">Carregue um ou vários arquivos de folha de uma vez (FOLHA MM-AAAA.xlsx, exportação com uma linha por rubrica). Cada arquivo vira uma competência; se a competência já existir, a versão nova substitui a anterior.</p>\n    <div id=\"imp-drop\" class=\"imp-drop\" tabindex=\"0\" role=\"button\" aria-label=\"Selecionar arquivos de folha\">\n      <div class=\"big\">📂 Arraste os arquivos de folha aqui ou clique para selecionar</div>\n      <div class=\"sm\">Pode selecionar vários .xlsx juntos (Ctrl/Shift + clique). A planilha é lida no seu navegador; só o resumo por funcionário (CPF mascarado) vai para a nuvem do Portal.</div>\n      <input id=\"imp-file\" type=\"file\" accept=\".xlsx,.xlsm,.xls\" multiple hidden>\n    </div>\n    <div style=\"display:flex;gap:8px;flex-wrap:wrap\"><button id=\"imp-btn\" class=\"dash-btn primary-imp\" onclick=\"document.getElementById('imp-file').click()\">📥 Selecionar arquivos de folha</button>\n      <button class=\"dash-btn\" onclick=\"gotoPage('pg-historico')\">📈 Ver histórico</button><button class=\"dash-btn\" onclick=\"gotoPage('pg-comparativo')\">📅 Comparativo</button></div>\n    <div id=\"imp-nuvem\" style=\"margin-top:12px\"></div>\n    <div id=\"imp-log\"></div>\n    <div class=\"card\" style=\"margin-top:16px\"><h2>Competências carregadas</h2><div id=\"imp-lista\"></div>\n      <p class=\"footnote\">Formato esperado (aba Sheet1): Mês_Ano Folha, Estab, Código, Nome, Situação_Usual, Verba_Código, Verba_Título, Verba_Tipo, Verba_Valor, CCusto, CCusto_Titulo, Cargo_Título, Data de Admissão, Data Desligament, CPF. Totais: 2001 = bruto, 2002 = descontos, 2004 = salário; líquido = 2001 − 2002. As folhas ficam na nuvem do Portal (Supabase, acesso só para usuários de RH) e valem para todos; o CPF é gravado mascarado. Sem conexão, a folha fica pendente neste navegador e é enviada na próxima abertura.</p></div>\n  </section>\n  <section class=\"page\" id=\"pg-folhas\">\n    <h1>Folhas por Competência</h1>\n    <p class=\"sub\">Folha de cada mês carregado: totais, lojas, rubricas, funcionários e movimentação em relação ao mês anterior.</p>\n    <div id=\"folhas-content\"></div>\n  </section>\n  ";
  var pedido=null;
  function texto(url){return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(url.split('?')[0].split('/').pop()+': HTTP '+r.status);return r.text()})}
  function codigo(){
    if(!pedido)pedido=texto(BASE+'rh-folhas/folhas.js?v='+VER).catch(function(e){pedido=null;throw e});
    return pedido;
  }
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document)}catch(e){return a}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1)}catch(e){}return a}
  function ehModuloRH(d){
    var w=d.defaultView;
    return d.readyState!=='loading'&&w&&typeof w.renderBases==='function'&&typeof w.openDossie==='function'&&
      d.getElementById('pg-bases')&&d.getElementById('qualidade-bases-card')&&d.getElementById('parecer-card');
  }
  function instalar(d){
    // subtítulo do módulo no Portal
    var sub=d.querySelector('#pg-rh .phsub');
    if(sub&&/Competência 06\/2026$/.test(sub.textContent||''))sub.textContent=sub.textContent.replace(/Competência 06\/2026$/,'Auditoria completa 06/2026 · Folhas 01 a 10/2026');
    if(d.__rhf||!ehModuloRH(d))return;
    d.__rhf=1;
    if(d.getElementById('pg-importar'))return; // arquivo do Portal já traz as telas
    var st=d.createElement('style');st.setAttribute('data-rhf','1');st.textContent=CSS;d.head.appendChild(st);
    var dados=[].filter.call(d.querySelectorAll('#nav .group-label'),function(e){return /^\s*Dados\s*$/i.test(e.textContent||'')})[0];
    if(dados)dados.insertAdjacentHTML('afterend',NAV);
    d.getElementById('pg-bases').insertAdjacentHTML('beforebegin',PAGES);
    d.getElementById('qualidade-bases-card').insertAdjacentHTML('beforebegin','<div class="card" id="bases-folhas-card"></div>');
    d.getElementById('parecer-card').insertAdjacentHTML('beforebegin','<div id="folhas-banner"><div class="folhas-banner"><div><b>🗓️ Carregando folhas mensais…</b></div></div></div>');
    var cs=d.querySelector('#pg-comparativo .sub');
    if(cs)cs.innerHTML='Compara a competência atual com competências anteriores. Escolha quaisquer duas competências de folha carregadas — nenhuma competência sobrescreve outra.';
    codigo().then(function(js){
      var s=d.createElement('script');s.setAttribute('data-rhf','1');s.textContent=js;d.body.appendChild(s);
    }).catch(function(e){
      console.warn('[Portal] RH folhas:',e);
      var b=d.getElementById('folhas-banner');
      if(b)b.innerHTML='<div class="folhas-banner"><div><b>⚠️ Não foi possível carregar as folhas mensais</b><div class="sub">'+String(e&&e.message||e).replace(/[<>&]/g,'')+' — recarregue o Portal; se continuar, avise a Controladoria.</div></div></div>';
      d.__rhf=0;
      [].forEach.call(d.querySelectorAll('#nav button[data-page="pg-importar"],#nav button[data-page="pg-folhas"],#pg-importar,#pg-folhas,#bases-folhas-card,style[data-rhf]'),function(x){x.remove()});
    });
  }
  function varrer(){docs(window,[],0).forEach(function(d){try{instalar(d)}catch(e){console.warn('[Portal] RH folhas:',e)}})}
  varrer();setInterval(varrer,1500);
})();
