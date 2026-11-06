/* Última atualização de cada módulo (todos os módulos) + recarga automática quando chega dado novo.
   - No topo de cada módulo e nos cartões da Visão Geral: "Atualizado na nuvem: dd/mm hh:mm".
     Se o último envio chegou com os mesmos dados, mostra "último envio dd/mm hh:mm (sem mudança)" e quem enviou.
   - A cada 60 s confere a nuvem. Se outro usuário (ex.: Roberto) atualizou um módulo:
       · módulo fechado/fora da tela → recarrega sozinho na próxima abertura;
       · módulo aberto na tela → aparece a faixa "Nova atualização… Atualizar agora".
   Lê public.portal_status_atualizacoes() (migração 20261105_nf_trava_sync.sql); sem ela, usa só portal_sync.
   Para desligar: remova a linha do atualizacoes-patch.js no index.html. */
(function(){
  if(window.__atualizacoesPatch)return;window.__atualizacoesPatch=true;

  var NOMES={nf:'NF-e Canceladas',rem:'Remanejo',alm:'Almoxarifado',cmpaud:'Descontos de Funcionários',
    desc:'Auditoria de Compras',mei:'Campanha Meias',gren:'Campanha Grendene',saci:'Casamento de Saci',
    sgdf:'Sistema de Defeitos',resc:'Rescisões',cml:'Comercial',rl:'RL Transportes'};
  var IGNORAR={vigilante:1,sentinela:1,sentinela_auditoria_manual:1,saci_regional:1,saci_loja:1,saci_d1:1};
  var estado={};      // pid -> {dados_em, ultimo_envio, usuario}
  var carregadoEm={}; // pid -> dados_em visto quando o módulo foi aberto
  var pendente={};    // pid -> true se há versão nova não carregada

  function sb(){
    try{if(typeof portalSb!=='undefined'&&portalSb)return portalSb;}catch(e){}
    try{if(typeof sb_!=='undefined'&&sb_)return sb_;}catch(e){}
    try{if(window.supabaseClient)return window.supabaseClient;}catch(e){}
    return null;
  }
  function fmt(iso){
    if(!iso)return '—';var d=new Date(iso);if(isNaN(d))return '—';
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+
      d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }
  function idade(iso){
    var h=(Date.now()-new Date(iso).getTime())/36e5;
    if(!isFinite(h))return '';
    if(h<1)return 'há '+Math.max(1,Math.round(h*60))+' min';
    if(h<48)return 'há '+Math.round(h)+' h';
    return 'há '+Math.round(h/24)+' dias';
  }
  function quem(u){return u?String(u).split('@')[0].replace(/\./g,' '):'';}

  var css=document.createElement('style');
  css.textContent=
    '.atz-badge{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:3px 9px;border-radius:999px;'+
    'font:600 11px/1.3 Inter,system-ui,sans-serif;border:1px solid rgba(16,185,129,.35);background:rgba(16,185,129,.08);color:#6ee7b7;max-width:100%;flex-wrap:wrap}'+
    '.atz-badge.velho{border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.08);color:#fcd34d}'+
    '.atz-badge .atz-sub{font-weight:500;color:#a8bdd8}'+
    '.atz-card{margin-top:6px;font:500 10.5px/1.3 Inter,system-ui,sans-serif;color:#6b88a8}'+
    '.atz-card b{color:#a8bdd8;font-weight:600}'+
    '.atz-faixa{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0;padding:9px 12px;border-radius:8px;'+
    'border:1px solid rgba(59,130,246,.45);background:rgba(30,64,175,.18);color:#bfdbfe;font:600 12px/1.35 Inter,system-ui,sans-serif}'+
    '.atz-faixa button{border:0;border-radius:6px;padding:6px 12px;background:#3b82f6;color:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer}';
  document.head.appendChild(css);

  function textoBadge(st){
    var t='☁ Atualizado na nuvem: '+fmt(st.dados_em)+' ('+idade(st.dados_em)+')';
    var sub='';
    if(st.ultimo_envio){
      var igual=st.dados_em&&new Date(st.ultimo_envio)-new Date(st.dados_em)>120000;
      sub=igual?'último envio '+fmt(st.ultimo_envio)+(st.usuario?' por '+quem(st.usuario):'')+' — sem mudança nos dados'
               :(st.usuario?'por '+quem(st.usuario):'');
    }
    return {t:t,sub:sub};
  }

  function pintarModulo(pid){
    var pg=document.getElementById('pg-'+pid),st=estado[pid];if(!pg||!st)return;
    var alvo=pg.querySelector('.phl')||pg.querySelector('.ph')||pg;
    var b=document.getElementById('atz-'+pid);
    if(!b){b=document.createElement('div');b.id='atz-'+pid;b.className='atz-badge';alvo.appendChild(b);}
    var x=textoBadge(st);
    b.innerHTML='<span>'+x.t+'</span>'+(x.sub?'<span class="atz-sub">· '+x.sub+'</span>':'');
    b.classList.toggle('velho',(Date.now()-new Date(st.dados_em).getTime())>7*864e5);
    b.title='Data em que os dados deste módulo foram gravados na nuvem (Supabase). Todos os usuários veem a mesma.';
    // Faixa de atualização nova
    var f=document.getElementById('atzf-'+pid);
    if(pendente[pid]){
      if(!f){
        f=document.createElement('div');f.id='atzf-'+pid;f.className='atz-faixa';
        var ph=pg.querySelector('.ph');(ph&&ph.parentNode?ph.parentNode.insertBefore(f,ph.nextSibling):pg.insertBefore(f,pg.firstChild));
      }
      f.innerHTML='<span>🔄 Nova atualização de '+((NOMES[pid]||pid))+' na nuvem ('+fmt(st.dados_em)+(st.usuario?', '+quem(st.usuario):'')+').</span>';
      var bt=document.createElement('button');bt.textContent='Atualizar agora';bt.onclick=function(){recarregar(pid);};
      f.appendChild(bt);
    }else if(f){f.remove();}
  }

  function pintarCard(pid){
    var st=estado[pid];if(!st)return;
    var os=document.getElementById('os-'+pid);if(!os)return;
    var card=os.closest('.oc')||os.parentNode;if(!card)return;
    var c=card.querySelector('.atz-card');
    if(!c){c=document.createElement('div');c.className='atz-card';card.appendChild(c);}
    c.innerHTML='☁ Atualizado: <b>'+fmt(st.dados_em)+'</b> · '+idade(st.dados_em);
  }

  function moduloVisivel(pid){
    var pg=document.getElementById('pg-'+pid);
    return !!(pg&&pg.classList.contains('on')&&!document.hidden);
  }
  function recarregar(pid){
    pendente[pid]=false;
    try{
      var ifr=document.getElementById('ifr-'+pid);
      if(typeof LOADED!=='undefined')LOADED[pid]=false;
      if(ifr&&ifr.src&&ifr.src.indexOf('blob:')===0){
        var u=ifr.src;ifr.src='about:blank';setTimeout(function(){ifr.src=u;},150);
      }else if(typeof execMod==='function'){execMod(pid,false,true);}
    }catch(e){console.warn('[atualizacoes] recarga falhou',pid,e);}
    carregadoEm[pid]=estado[pid]&&estado[pid].dados_em;
    pintarModulo(pid);
  }

  async function buscar(){
    var c=sb();if(!c)return;
    var linhas=null;
    try{var r=await c.rpc('portal_status_atualizacoes');if(!r.error)linhas=r.data;}catch(e){}
    if(!linhas){
      try{var r2=await c.from('portal_sync').select('module_id,updated_at');if(!r2.error)linhas=(r2.data||[]).map(function(x){return {module_id:x.module_id,dados_em:x.updated_at};});}catch(e){}
    }
    if(!linhas)return;
    linhas.forEach(function(l){
      var pid=l.module_id;if(!pid||IGNORAR[pid])return;
      var antes=estado[pid]&&estado[pid].dados_em;
      estado[pid]={dados_em:l.dados_em,ultimo_envio:l.ultimo_envio,usuario:l.usuario};
      var ifr=document.getElementById('ifr-'+pid);
      var aberto=!!(ifr&&ifr.src&&ifr.src!=='about:blank'&&(typeof LOADED==='undefined'||LOADED[pid]));
      if(aberto&&!carregadoEm[pid])carregadoEm[pid]=antes||l.dados_em;
      if(aberto&&carregadoEm[pid]&&new Date(l.dados_em)>new Date(carregadoEm[pid])){
        if(moduloVisivel(pid))pendente[pid]=true;
        else recarregar(pid);
      }
      pintarModulo(pid);pintarCard(pid);
    });
  }

  // Mantém os selos ao trocar de tela (algumas telas são redesenhadas).
  setInterval(function(){Object.keys(estado).forEach(function(pid){
    if(!document.getElementById('atz-'+pid))pintarModulo(pid);
    var os=document.getElementById('os-'+pid);if(os&&!(os.closest('.oc')||os.parentNode).querySelector('.atz-card'))pintarCard(pid);
  });},4000);
  setTimeout(buscar,2500);
  setInterval(buscar,60000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)buscar();});
  window.portalAtualizacoesBuscar=buscar;
})();
