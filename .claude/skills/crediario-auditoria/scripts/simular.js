// Simula o módulo crediario/ com uma base exportada (D.json), sem gravar nada no Supabase.
// uso: python3 -m http.server 8765 (na raiz do repo) &  node simular.js D.json [BAIXA.CSV|-] [trct.json|-] saida.png
// gera saida.json (totais + resultado de cada ex-funcionário) e saida-real.json (pendências abertas) para as planilhas
const {chromium}=require('playwright');const fs=require('fs');const [,,dj,csv0,trctf,out]=process.argv;const csv=csv0&&csv0!=='-'?csv0:null;
const TRCT=trctf&&trctf!=='-'?JSON.parse(fs.readFileSync(trctf,'utf8')):{};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1600,height:1100}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/crediario/',{waitUntil:'networkidle'});
const r=await pg.evaluate(async({D0,bytes,TRCT})=>{ let BXL=[],extra={arq:[],folha:[]},nid=5000;
 sb.rpc=async(fn,a)=>{ if(fn==='cred_importar'){ if(a.p_arquivo.origem==='trct'){const id=++nid; extra.arq.push({id,tipo:'folha',origem:'trct',nome:a.p_arquivo.nome,hash:a.p_arquivo.hash,importado_em:'2026-11-03'}); a.p_linhas.forEach(l=>extra.folha.push({...l,id:++nid,arquivo_id:id}));} return {data:{novas:1},error:null};} return {data:true,error:null}; };
 sb.auth.getUser=async()=>({data:{user:{email:'t@t'}}});
 window.carregarDados=async()=>{ D=JSON.parse(JSON.stringify(D0)); D.decisoes=D.decisoes||[]; D.baixas=BXL.map(x=>({...x,arquivo_id:99})); if(BXL.length) D.arquivos.push({id:99,tipo:'baixas',nome:'BAIXA.CSV',importado_em:'2026-10-30'}); D.arquivos.push(...extra.arq); D.folha.push(...extra.folha); montarDecisoes(); };
 document.getElementById('vLogin').classList.add('hidden');document.getElementById('vApp').classList.remove('hidden'); await recarregar();
 if(bytes){ await importar('baixas',new File([new Uint8Array(bytes)],'BAIXA.CSV')); BXL=montarLinhas().linhas; fecharModal(); IMP=null; await recarregar(); }
 for(const [c,v] of Object.entries(TRCT)){ if(R.exs.find(x=>x.pe.cpf===c)){ window.prompt=()=>String(v); await informarTRCT(c);} }
 const rs=[];
 const t=totEx(R.exs); window.__all=ordEx(R.exs).map(o=>{const x=resEx(o);return {nome:o.pe.nome,cpf:o.pe.cpf,saida:o.d.saida,natureza:o.d.natureza||'',saldo:o.saldo,desc:o.folhaResc?o.descResc:null,res:x.res,valor:x.valor,obs:x.obs,sinal:x.sinal}}); const real={exs:R.exs.map(o=>({cpf:o.pe.cpf,saida:o.d.saida})),pend:R.pend.filter(p=>!encerrada(p)).map(p=>({tipo:p.tipo,grav:p.grav,cpf:p.cpf,nome:p.nome,loja:p.loja,comp:p.comp,valor:p.valor,txt:p.txt}))}; irPara('ex'); return {rs,t,all:window.__all,real};
},{D0:JSON.parse(fs.readFileSync(dj,'utf8')),bytes:csv?[...fs.readFileSync(csv)]:null,TRCT});
await pg.waitForTimeout(600); const el=await pg.$('#tEx'); await el.screenshot({path:out});
require('fs').writeFileSync(out.replace('.png','-real.json'),JSON.stringify(r.real)); delete r.real; require('fs').writeFileSync(out.replace('.png','.json'),JSON.stringify(r));  console.log(JSON.stringify(r.t)); console.log(errs.join('\n')||'SEM ERROS'); await b.close();})();
