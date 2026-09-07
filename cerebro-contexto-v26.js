/* Portal Esposende — memória conversacional e datas naturais v26 */
(function(){
  const KEY='portal_esposende_cerebro_contexto_v26', TTL=30*60*1000;
  const get=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x.ts&&Date.now()-x.ts<TTL?x:{}}catch{return {}}};
  const put=p=>{try{localStorage.setItem(KEY,JSON.stringify({...get(),...p,ts:Date.now()}))}catch{}};
  const loja=s=>{const m=String(s||'').match(/(?:loja|filial|empresa)\s*(?:n[ºo°]?\s*)?(\d{1,4})\b/i);return m?String(Number(m[1].slice(-2))):null};
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(/portal-cerebro(?:-integrado)?/i.test(url)&&init&&typeof init.body==='string'){
        const p=JSON.parse(init.body),q=String(p.pergunta_original||p.pergunta||''),c=get(),l=loja(q)||p.loja||c.loja;
        if(l){p.loja=l;p.lojas=[l]}
        if(!p.mes&&c.mes)p.mes=c.mes;if(!p.ano&&c.ano)p.ano=c.ano;
        put({loja:l||c.loja,mes:p.mes||c.mes,ano:p.ano||c.ano,assunto:q||c.assunto});
        init={...init,body:JSON.stringify(p)};
      }
    }catch{}
    return originalFetch(input,init);
  };
  window.PortalCerebroContexto={limpar(){try{localStorage.removeItem(KEY)}catch{}}};
})();
