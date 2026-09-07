/* Portal Esposende — memória conversacional e datas naturais v26 */
(function(){
  const KEY='portal_esposende_cerebro_contexto_v26';
  const TTL=30*60*1000;
  const get=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x.ts&&Date.now()-x.ts<TTL?x:{}}catch{return {}}};
  const put=(p)=>{try{localStorage.setItem(KEY,JSON.stringify({...get(),...p,ts:Date.now()}))}catch{}};
  const loja=(s)=>{const m=String(s||'').match(/(?:loja|filial|empresa)\s*(?:n[ºo°]?\s*)?(\d{1,4})\b/i);return m?String(Number(m[1].slice(-2))):null};
  const periodo=(s)=>{s=String(s||'');let m=s.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);if(m)return {data:`${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`};m=s.match(/\b(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i);return m?{mes:m[1]}:null};
  const natural=(t)=>String(t??'').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,a,m,d)=>`${d}/${m}/${a}`);
  window.PortalCerebroContexto={
    enriquecer(payload={}){const q=payload.pergunta_original||payload.pergunta||'';const c=get();const l=loja(q)||payload.loja||c.loja;const per=periodo(q)||{};const out={...payload};if(l){out.loja=l;out.lojas=[l]}if(!out.mes&&per.mes)out.mes=per.mes;if(!out.mes&&c.mes)out.mes=c.mes;if(!out.ano&&c.ano)out.ano=c.ano;put({loja:l||c.loja,mes:out.mes||c.mes,ano:out.ano||c.ano,assunto:q||c.assunto});return out},
    registrarResposta(r){return natural(r)},
    limpar(){try{localStorage.removeItem(KEY)}catch{}}
  };
})();
