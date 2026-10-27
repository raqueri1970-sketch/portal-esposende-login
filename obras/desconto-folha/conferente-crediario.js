/* Conferente de Crediário */
(function(){
  if(window.__conferenteCrediario)return; window.__conferenteCrediario=true;
  function brl(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function nomeMes(c){var m=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],p=String(c).split('-');return m[Number(p[1])-1]+' de '+p[0];}
  function proxima(){var d=new Date();d=new Date(d.getFullYear(),d.getMonth()+1,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  async function carregar(){
    var sec=document.getElementById('a-painel'); if(!sec||!window.sb)return;
    var box=document.getElementById('conferenteCrediario');
    if(!box){box=document.createElement('div');box.id='conferenteCrediario';box.className='card';box.style.marginTop='14px';sec.insertBefore(box,sec.firstChild);}
    box.innerHTML='<b>Conferente de Crediário</b><div class="small mut">Carregando próxima folha...</div>';
    var comp=proxima();
    var r=await window.sb.from('cred_conferente_resumo').select('*').gte('competencia',comp).order('competencia',{ascending:true}).limit(6);
    if(r.error){box.innerHTML='<b>Conferente de Crediário</b><div class="perigo">'+r.error.message+'</div>';return;}
    var a=r.data||[],x=a.find(function(z){return z.competencia===comp;})||a[0];
    if(!x){box.innerHTML='<b>Conferente de Crediário</b><div class="aviso">Sem parcelas previstas para a próxima folha.</div>';return;}
    box.style.borderColor='rgba(34,197,94,.45)';
    box.innerHTML='<div class="small" style="color:#86efac;font-weight:800">CONFERENTE DE CREDIÁRIO · PRÓXIMA FOLHA</div><h2 style="margin:5px 0">Parcelas a descontar em '+nomeMes(x.competencia)+'</h2><div style="font-size:32px;font-weight:900">'+brl(x.valor_previsto)+'</div><div class="grid kp4" style="margin-top:12px"><div class="kpi"><span>Funcionários</span><b>'+x.qtd_funcionarios+'</b></div><div class="kpi"><span>Parcelas</span><b>'+x.qtd_parcelas+'</b></div><div class="kpi"><span>Herdado</span><b>'+brl(x.valor_herdado)+'</b></div><div class="kpi"><span>Compras novas</span><b>'+brl(x.valor_novo)+'</b></div></div><div style="margin-top:10px" id="confFuturos"></div><button class="btn b-pri" id="confDetalhar" style="margin-top:10px">Ver funcionários</button><div id="confLista" style="margin-top:10px"></div>';
    document.getElementById('confFuturos').innerHTML=a.slice(1).map(function(z){return '<span class="st st-prev" style="margin-right:6px">'+nomeMes(z.competencia)+': '+brl(z.valor_previsto)+'</span>';}).join('');
    document.getElementById('confDetalhar').onclick=async function(){var d=await window.sb.from('cred_conferente_competencia').select('cpf,nome,qtd_parcelas,valor_previsto,valor_herdado,valor_novo').eq('competencia',x.competencia).order('valor_previsto',{ascending:false}).limit(1000);if(d.error)return;document.getElementById('confLista').innerHTML='<div class="tw"><table><thead><tr><th>Funcionário</th><th>CPF</th><th>Parcelas</th><th>Herdado</th><th>Novo</th><th>Total</th></tr></thead><tbody>'+d.data.map(function(y){return '<tr><td>'+String(y.nome||'')+'</td><td>'+String(y.cpf||'')+'</td><td>'+y.qtd_parcelas+'</td><td>'+brl(y.valor_herdado)+'</td><td>'+brl(y.valor_novo)+'</td><td><b>'+brl(y.valor_previsto)+'</b></td></tr>';}).join('')+'</tbody></table></div>';};
  }
  var t=setInterval(function(){if(document.getElementById('a-painel')&&window.sb){clearInterval(t);carregar();}},300);
  window.recarregarConferenteCrediario=carregar;
})();