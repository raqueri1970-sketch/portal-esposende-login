/* Conferente de Crediário — cards de previsão por competência. 2026-10-27 */
(function(){
 if(window.__conferenteCrediarioUI)return; window.__conferenteCrediarioUI=true;
 function cliente(){try{return typeof sb!=='undefined'?sb:(window.sb||null);}catch(e){return window.sb||null;}}
 function brl(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
 function mes(c){var a=String(c||'').split('-'),n=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];return a.length>1?n[Number(a[1])-1]+' de '+a[0]:c;}
 function proxComp(){var d=new Date(),m=d.getMonth()+2,y=d.getFullYear();if(m>12){m=1;y++;}return y+'-'+String(m).padStart(2,'0');}
 function card(r,destaque){return '<div class="kpi clic" data-conf-comp="'+r.competencia+'" style="'+(destaque?'border-color:rgba(59,130,246,.65);background:linear-gradient(135deg,rgba(37,99,235,.16),rgba(15,23,42,.45))':'')+'"><div class="small mut">'+(destaque?'PARCELAS A DESCONTAR — PRÓXIMA FOLHA':'PREVISÃO — '+mes(r.competencia).toUpperCase())+'</div><div class="n" style="font-size:26px;font-weight:800;margin:5px 0">'+brl(r.valor_previsto)+'</div><div class="small">'+Number(r.qtd_funcionarios||0).toLocaleString('pt-BR')+' funcionários · '+Number(r.qtd_parcelas||0).toLocaleString('pt-BR')+' parcelas</div><div class="small mut" style="margin-top:5px">Herdado: '+brl(r.valor_herdado)+' · Novo: '+brl(r.valor_novo)+'</div></div>';}
 async function carregar(){
  var cli=cliente(); if(!cli||!document.getElementById('a-painel'))return;
  var q=await cli.from('cred_conferente_resumo').select('*').gte('competencia',proxComp()).order('competencia',{ascending:true}).limit(4);
  if(q.error){console.warn('[Conferente Crediário]',q.error);return;}
  var rows=q.data||[]; if(!rows.length)return;
  var box=document.getElementById('conferenteCrediario');
  if(!box){box=document.createElement('div');box.id='conferenteCrediario';box.innerHTML='<h2>Conferente de Crediário</h2><div class="regra">Previsão automática: parcelas herdadas de compras anteriores + parcelas das compras novas que pertencem à competência.</div><div class="grid kp4" data-conf-cards></div><div class="card tw hidden" data-conf-det style="margin-top:14px"></div>';var p=document.getElementById('a-painel');var hero=document.getElementById('hero');p.insertBefore(box,hero?hero.nextSibling:p.firstChild);}
  box.querySelector('[data-conf-cards]').innerHTML=rows.map(function(r,i){return card(r,i===0);}).join('');
  box.querySelectorAll('[data-conf-comp]').forEach(function(el){el.onclick=function(){detalhar(el.getAttribute('data-conf-comp'),box);};});
 }
 async function detalhar(comp,box){
  var cli=cliente(),d=box.querySelector('[data-conf-det]');d.classList.remove('hidden');d.innerHTML='<div class="small mut">Carregando '+mes(comp)+'…</div>';
  var q=await cli.from('cred_conferente_competencia').select('*').eq('competencia',comp).order('valor_previsto',{ascending:false}).limit(1000);
  if(q.error){d.innerHTML='<div class="perigo">Não foi possível abrir o detalhamento.</div>';return;}
  var rows=q.data||[];d.innerHTML='<h3>Detalhamento — '+mes(comp)+'</h3><div class="small mut">Clique no funcionário na aba Funcionários para consultar o histórico completo.</div><table><thead><tr><th>Funcionário</th><th>CPF</th><th>Parcelas</th><th>Herdado</th><th>Novo</th><th>Total previsto</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+String(r.nome||'—').replace(/[&<>]/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[x];})+'</td><td>'+String(r.cpf||'—')+'</td><td>'+Number(r.qtd_parcelas||0)+'</td><td>'+brl(r.valor_herdado)+'</td><td>'+brl(r.valor_novo)+'</td><td><b>'+brl(r.valor_previsto)+'</b></td></tr>';}).join('')+'</tbody></table>';
 }
 var tent=0,t=setInterval(function(){carregar();if(++tent>30)clearInterval(t);},1200);document.addEventListener('visibilitychange',function(){if(!document.hidden)carregar();});
})();
