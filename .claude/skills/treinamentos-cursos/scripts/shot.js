// Renderiza a apostila com progresso simulado e gera prints/PDF para revisão.
const { chromium } = require('playwright');
const path=require('path');
const [,, url, out, modo='todos', larg='1100'] = process.argv;
(async()=>{
  const b = await chromium.launch();
  const pg = await b.newPage({ignoreHTTPSErrors:true,viewport:{width:+larg,height:1400}});
  pg.on('console',m=>{ if(m.type()==='error') console.log('console:',m.text()); });
  pg.on('pageerror',e=>console.log('pageerror:',e.message));
  await pg.route('**/rdztzurfesnobfkazgpm.supabase.co/**', r=>r.fulfill({status:200,contentType:'application/json',body:'false'}));
  await pg.route('**/rest/v1/rpc/curso_progresso', r=>{
    const ids=['recebimento','notas-fiscais','fazer-etiquetas','fechamento-de-volumes','defeito','remanejo'];
    const ok=modo==='todos'?ids:ids.slice(0,+modo);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ids.map((id,i)=>({modulo_id:id,aprovado:ok.includes(id),total:6,concluidos:ok.length,certificado:null})))});
  });
  await pg.addInitScript(()=>localStorage.setItem('curso_identidade_v2',JSON.stringify({loja:'920 - Recife',nome:'Maria Teste',cpf:'00000000000',cargo:'Estoquista'})));
  await pg.goto(url,{waitUntil:'networkidle'});
  await pg.evaluate(()=>document.querySelectorAll('img').forEach(i=>i.loading='eager'));
  await pg.waitForTimeout(1500);
  if(out.endsWith('.pdf')) await pg.pdf({path:out,format:'A4',printBackground:true,margin:{top:0,bottom:0,left:0,right:0}});
  else await pg.screenshot({path:out,fullPage:true});
  console.log('ok', await pg.evaluate(()=>document.getElementById('estado').textContent.slice(0,120)));
  await b.close();
})();
