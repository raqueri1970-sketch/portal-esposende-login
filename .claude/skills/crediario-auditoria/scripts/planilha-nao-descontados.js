// uso: node planilha-nao-descontados.js saida-real.json saida.json nao-descontados.xlsx
const X=require('xlsx'),[,,realf,audf,out]=process.argv,R=require(realf),A=require(audf);const r2=v=>Math.round(v*100)/100;
const f=c=>c&&c.length===11?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9):c;const cb=c=>c?c.slice(5)+'/'+c.slice(0,4):'';
const exCpf=new Set(R.exs.map(o=>o.cpf));
const TA=new Set(['Não descontou','Descontou a menos','Saldo não descontado (acumulado)','Fora da lista do RH','Fora do desconto do RH','Lista do RH a menos','Valor lançado errado no RH (centavos)','Possível erro de centavos no RH']);
const linhas=[];
// ex-funcionários: resultado da rescisão (com os TRCTs de out/2026 anotados)
A.all.filter(x=>x.res!=='ok').forEach(x=>{const centC=/Erro de centavos no RH|RH lançou sem os zeros/.test(x.obs),centP=/Possível erro de centavos/.test(x.obs);
 linhas.push({res:x.res,nome:x.nome,cpf:x.cpf,sit:'Ex-funcionário',saida:x.saida.split('-').reverse().join('/'),loja:'',saldo:x.saldo,desc:x.desc,valor:x.valor,sinal:x.sinal,cent:centC?'certo':centP?'possível':'',folhas:'rescisão '+cb(x.saida.slice(0,7)),obs:x.obs});});
// ativos e sem folha: o que a folha deixou de descontar
const por=new Map();R.pend.filter(p=>TA.has(p.tipo)&&!exCpf.has(p.cpf)).forEach(p=>{const o=por.get(p.cpf)||{nome:p.nome,loja:p.loja,v:0,t:new Set(),c:new Set(),cent:''};o.v+=p.valor;o.t.add(p.tipo);if(p.comp)o.c.add(cb(p.comp));if(p.tipo.includes('centavos'))o.cent=p.tipo.startsWith('Possível')?'possível':'certo';por.set(p.cpf,o)});
for(const [c,o] of por) linhas.push({res:'perda',nome:o.nome,cpf:c,sit:o.loja==='FORA DO CADASTRO'?'Sem folha (fora do cadastro)':'Ativo',saida:'',loja:o.loja,saldo:null,desc:null,valor:r2(o.v),cent:o.cent,folhas:[...o.c].sort().join(', '),
 obs:[...o.t].join('; ')+(o.loja==='FORA DO CADASTRO'?' — não está na folha: cobrar por boleto ou confirmar com o RH':' — lançar na próxima folha')});
const N={perda:'PERDA — não descontamos (cobrar)',ganho:'GANHO — descontamos a mais (devolver/explicar)',conferir:'A CONFERIR — perda não confirmada pela conta corrente',aguarda:'AGUARDANDO folha da rescisão'};
const row=x=>({'Resultado':N[x.res],'Nome':x.nome,'CPF':f(x.cpf),'Situação':x.sit,'Saída':x.saida,'Loja':x.loja,'Saldo na saída':x.saldo??'','Descontado na rescisão':x.desc===null?(x.sit==='Ex-funcionário'?'folha não importada':''):x.desc,'Diferença (− perda / + ganho)':x.res==='perda'||x.sinal==='−'?-x.valor:['ganho','conferir'].includes(x.res)?x.valor:0,'Erro de centavos':x.cent,'Folhas':x.folhas,'Observação':x.obs});
const ord={perda:0,ganho:1,conferir:2,aguarda:3};linhas.sort((a,b)=>ord[a.res]-ord[b.res]||b.valor-a.valor);
const g=(k,fn=()=>true)=>linhas.filter(x=>x.res===k&&fn(x));const s=ls=>r2(ls.reduce((a,x)=>a+x.valor,0));
const tot=(ls,lbl)=>({'Resultado':'TOTAL','Nome':ls.length+' '+lbl,'Diferença (− perda / + ganho)':r2(ls.reduce((a,x)=>a+row(x)['Diferença (− perda / + ganho)'],0))});
const wb=X.utils.book_new(),add=(n,rows,w)=>{const ws=X.utils.json_to_sheet(rows);ws['!cols']=w.map(v=>({wch:v}));ws['!autofilter']={ref:ws['!ref']};X.utils.book_append_sheet(wb,ws,n)};
const W=[44,36,15,26,11,24,14,18,18,14,24,120];
const P=g('perda'),Pex=g('perda',x=>x.sit==='Ex-funcionário'),Pat=g('perda',x=>x.sit!=='Ex-funcionário'),G=g('ganho'),C=g('conferir'),AG=g('aguarda');
add('Resumo',[{'Resultado':'PERDA — não descontamos (cobrar)','Pessoas':P.length,'Valor':-s(P)},{'Resultado':'   ex-funcionários (rescisão)','Pessoas':Pex.length,'Valor':-s(Pex)},{'Resultado':'   ativos / sem folha','Pessoas':Pat.length,'Valor':-s(Pat)},
 {'Resultado':'   dos quais erro de centavos (certo)','Pessoas':P.filter(x=>x.cent==='certo').length,'Valor':-s(P.filter(x=>x.cent==='certo'))},{'Resultado':'   dos quais possível erro de centavos','Pessoas':P.filter(x=>x.cent==='possível').length,'Valor':-s(P.filter(x=>x.cent==='possível'))},
 {'Resultado':'GANHO — descontamos a mais (devolver/explicar)','Pessoas':G.length,'Valor':s(G)},{'Resultado':'RESULTADO LÍQUIDO (ganho − perda)','Valor':r2(s(G)-s(P))},{},
 {'Resultado':'A CONFERIR — possível perda não confirmada (fora do líquido)','Pessoas':C.length,'Valor':-s(C)},{'Resultado':'AGUARDANDO folha da rescisão','Pessoas':AG.length}],[66,10,14]);
add('Perda (não descontamos)',[...P.map(row),tot(P,'pessoas')],W);
add('Perda - ex-funcionários',[...Pex.map(row),tot(Pex,'pessoas')],W);
add('Perda - ativos e sem folha',[...Pat.map(row),tot(Pat,'pessoas')],W);
add('Erro de centavos',[...P.filter(x=>x.cent).map(row),tot(P.filter(x=>x.cent),'pessoas')],W);
add('Ganho (descontamos a mais)',[...G.map(row),tot(G,'pessoas')],W);
add('A conferir',[...C.map(row),tot(C,'pessoas')],W);
add('Aguardando',AG.map(row),W);
X.writeFile(wb,out);console.log('perda',P.length,s(P),'(ex',Pex.length,s(Pex),'ativos',Pat.length,s(Pat),') centavos certo',P.filter(x=>x.cent==='certo').length,s(P.filter(x=>x.cent==='certo')),'possivel',P.filter(x=>x.cent==='possível').length,'| ganho',G.length,s(G),'| conferir',C.length,s(C),'| aguarda',AG.length,'| liquido',r2(s(G)-s(P)));
