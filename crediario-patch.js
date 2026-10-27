/* Desconto em Folha · Crediário dentro do Portal */
(function(){
  if(window.__credPortal)return;window.__credPortal=true;
  var V='20261027-conferente-1';
  var BASE=(function(){try{return new URL('./',document.currentScript.src).href}catch(e){return location.origin+'/portal-esposende-login/'}})();
  var URL_MOD=BASE+'obras/desconto-folha/?v='+V;
  var CARDS=[
    {id:'cred',aba:'painel',modo:'',icone:'💳',menu:'Desconto em Folha',titulo:'Desconto em Folha · Crediário',capa:BASE+'desconto-folha-capa.jpg?v=1'},
    {id:'ex',aba:'ex',modo:'ex',icone:'🚪',menu:'Ex-funcionários e fora do cadastro',titulo:'Ex-funcionários e fora do cadastro',capa:BASE+'ex-funcionarios-capa.jpg?v=2'}
  ];
  function abrir(d,c){
    var ov=d.getElementById('cred-portal');
    if(!ov){ov=d.createElement('div');ov.id='cred-portal';ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#070b16;display:flex;flex-direction:column';ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e2a44;background:#0b1222;color:#e5edf8;font:600 14px Arial"><button type="button" data-cred-fechar style="background:#101a2e;border:1px solid #1e2a44;color:#e5edf8;border-radius:9px;padding:8px 13px">← Voltar ao Portal</button><span data-cred-titulo></span></div><iframe title="Desconto em Folha · Crediário" allow="clipboard-write" style="flex:1;width:100%;border:0;background:#070b16"></iframe>';ov.querySelector('[data-cred-fechar]').onclick=function(){ov.style.display='none'};d.body.appendChild(ov)}
    ov.querySelector('[data-cred-titulo]').textContent=c.icone+' '+c.titulo;var f=ov.querySelector('iframe');f.src=URL_MOD+(c.modo?'&modo='+c.modo:'')+'#'+c.aba;ov.style.display='flex';
  }
  function docs(w,a,p){if(p>4)return a;try{if(w.document)a.push(w.document)}catch(e){return a}for(var i=0;i<w.frames.length;i++)try{docs(w.frames[i],a,p+1)}catch(e){}return a}
  function menu(d){var sb=d.getElementById('sb');if(!sb||sb.querySelector('[data-cred-menu]'))return;var g=d.createElement('div');g.className='sg';g.innerHTML='<div class="sgl">Crediário</div>'+CARDS.map(function(c){return '<button class="ni" data-cred-menu="'+c.id+'" type="button"><span class="nii">'+c.icone+'</span><span class="nil">'+c.menu+'</span></button>'}).join('');sb.appendChild(g);[].forEach.call(g.querySelectorAll('[data-cred-menu]'),function(b){b.onclick=function(){var id=b.getAttribute('data-cred-menu');abrir(d,CARDS.filter(function(c){return c.id===id})[0])}})}
  function varrer(){docs(window,[],0).forEach(function(d){try{menu(d)}catch(e){}})}varrer();setInterval(varrer,1500);
})();