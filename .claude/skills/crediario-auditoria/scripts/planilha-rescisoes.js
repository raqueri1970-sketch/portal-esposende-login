// uso: node planilha-rescisoes.js saida.json auditoria-rescisoes.xlsx
const X=require('xlsx'),[,,jf,out]=process.argv,r=require(jf);const r2=v=>Math.round(v*100)/100;
const N={perda:'PERDA — descontamos menos',ganho:'GANHO — descontamos mais',conferir:'A CONFERIR — perda não confirmada pela conta corrente',aguarda:'AGUARDANDO folha da rescisão',ok:'OK'};
const f=c=>c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9);
const lin=x=>({'Resultado':N[x.res],'Ex-funcionário':x.nome,'CPF':f(x.cpf),'Saída':x.saida.split('-').reverse().join('/'),'Natureza':x.natureza,'Saldo na saída':x.saldo,'Descontado na rescisão':x.desc===null?'folha não importada':x.desc,'Diferença (− perda / + ganho)':x.res==='perda'||x.sinal==='−'?-x.valor:['ganho','conferir'].includes(x.res)?x.valor:0,'Observação':x.obs});
const g=k=>r.all.filter(x=>x.res===k);const sum=ls=>r2(ls.reduce((a,x)=>a+x.valor,0));
const wb=X.utils.book_new(),add=(n,rows,w)=>{const ws=X.utils.json_to_sheet(rows);ws['!cols']=w.map(x=>({wch:x}));ws['!autofilter']={ref:ws['!ref']};X.utils.book_append_sheet(wb,ws,n)};
const W=[44,36,15,11,26,14,18,18,120];
add('Resumo',[{'Resultado':'PERDA (descontamos menos — cobrar)','Ex-funcionários':g('perda').length,'Valor':-sum(g('perda'))},{'Resultado':'GANHO (descontamos mais — devolver ou explicar)','Ex-funcionários':g('ganho').length,'Valor':sum(g('ganho'))},{'Resultado':'RESULTADO LÍQUIDO (ganho − perda)','Valor':r2(sum(g('ganho'))-sum(g('perda')))},{},{'Resultado':'A CONFERIR (descontado a mais com base incompleta — fora do líquido)','Ex-funcionários':g('conferir').length,'Valor':sum(g('conferir'))},{'Resultado':'AGUARDANDO folha da rescisão','Ex-funcionários':g('aguarda').length},{'Resultado':'OK','Ex-funcionários':g('ok').length}],[66,16,14]);
const tot=(ls,n)=>({'Resultado':'TOTAL','Ex-funcionário':ls.length+' '+n,'Saldo na saída':r2(ls.reduce((a,x)=>a+x.saldo,0)),'Descontado na rescisão':r2(ls.reduce((a,x)=>a+(x.desc||0),0)),'Diferença (− perda / + ganho)':r2(ls.reduce((a,x)=>a+lin(x)['Diferença (− perda / + ganho)'],0))});
const sem=r.all.filter(x=>x.res!=='ok');
add('Todos com diferença',[...sem.map(lin),tot(sem,'ex-funcionários')],W);
add('Perda',[...g('perda').map(lin),tot(g('perda'),'ex-funcionários')],W);
add('Ganho',[...g('ganho').map(lin),tot(g('ganho'),'ex-funcionários')],W);
add('A conferir',[...g('conferir').map(lin),tot(g('conferir'),'ex-funcionários')],W);
add('Aguardando',g('aguarda').map(lin),W);
add('OK',g('ok').map(lin),W);
X.writeFile(wb,out);console.log('perda',g('perda').length,sum(g('perda')),'ganho',g('ganho').length,sum(g('ganho')),'conferir',g('conferir').length,sum(g('conferir')),'aguarda',g('aguarda').length,'ok',g('ok').length);
