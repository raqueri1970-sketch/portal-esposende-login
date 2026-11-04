// uso: node planilha-centavos.js saida-real.json erro-centavos.xlsx  (saida-real.json vem do simular.js)
const X=require('xlsx'),[,,jf,out]=process.argv,r=require(jf);
const ex=new Map(r.exs.map(o=>[o.cpf,o]));const f=c=>c&&c.length===11?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9):c;const cb=c=>c?c.slice(5)+'/'+c.slice(0,4):'';
const num=s=>Number(String(s).replace(/[^\d,]/g,'').replace(',','.'));
const P=r.pend.filter(p=>p.tipo.includes('centavos')).sort((a,b)=>(a.tipo.startsWith('Possível')-b.tipo.startsWith('Possível'))||b.valor-a.valor);
const res=[],par=[];
P.forEach(p=>{const t=p.txt,m=t.match(/devido R\$.([\d\.,]+) × descontado R\$.([\d\.,]+)/),e=ex.get(p.cpf);
 const perda=(t.match(/(?:diferença de|Faltou R\$.[\d\.,]+: )R\$.([\d\.,]+)/)||[])[1];
 const resto=(t.match(/os outros R\$.([\d\.,]+) foram descontados (a mais|a menos)/)||[]);
 const compras=(t.match(/compras? (CE[\d, CE]+?) lançadas/)||[])[1]||'';
 res.push({'Certeza':p.tipo.startsWith('Possível')?'Possível — conferir na lista Diversos do RH':'Certo (fecha ao centavo)','Nome':p.nome,'CPF':f(p.cpf),'Situação':e?'Ex-funcionário (saída '+e.saida.split('-').reverse().join('/')+')':'Ativo','Loja':p.loja,'Folha':cb(p.comp),'Devido (crediário)':m?num(m[1]):'','Descontado (verba 1260)':m?num(m[2]):'','Faltou':p.valor,'Explicado pelo erro de centavos':perda?num(perda):p.valor,'Outra diferença':resto[1]?(resto[2]==='a mais'?-num(resto[1]):num(resto[1])):0,'Compras com erro':compras.trim(),'Ação':'Corrigir o lançamento no RH e cobrar a diferença'+(resto[1]?' (conferir a outra diferença no TRCT)':'')});
 for(const q of t.matchAll(/(CE\d+-\d+\/\d+) R\$.([\d\.,]+) → R\$.([\d\.,]+)/g)) par.push({'Nome':p.nome,'CPF':f(p.cpf),'Folha':cb(p.comp),'Parcela':q[1],'Valor certo (crediário)':num(q[2]),'Lançado no RH':num(q[3]),'Diferença':Math.round((num(q[2])-num(q[3]))*100)/100});
});
const tot={'Certeza':'TOTAL','Nome':P.length+' casos','Faltou':Math.round(res.reduce((a,b)=>a+b['Faltou'],0)*100)/100,'Explicado pelo erro de centavos':Math.round(res.reduce((a,b)=>a+b['Explicado pelo erro de centavos'],0)*100)/100};
const wb=X.utils.book_new(),add=(n,rows,w)=>{const ws=X.utils.json_to_sheet(rows);ws['!cols']=w.map(x=>({wch:x}));ws['!autofilter']={ref:ws['!ref']};X.utils.book_append_sheet(wb,ws,n)};
add('Resumo',[...res,tot],[38,36,15,30,24,9,14,14,12,16,12,40,50]);
add('Parcelas com erro',par,[36,15,9,16,14,12,11]);
add('Texto completo',P.map(p=>({'Nome':p.nome,'Folha':cb(p.comp),'Faltou':p.valor,'Detalhe':p.txt})),[36,9,11,180]);
X.writeFile(wb,out);console.log(P.length,tot.Faltou,par.length);
