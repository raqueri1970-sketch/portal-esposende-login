/* Portal Esposende — contexto conversacional + microfone global v29 */
(function(){
  if(window.__PORTAL_CEREBRO_V29__)return;
  window.__PORTAL_CEREBRO_V29__=true;

  const KEY='portal_esposende_cerebro_contexto_v29';
  const STORE_KEY='portal_esposende_loja_ativa_v29';
  const TTL=30*60*1000;
  const SESSION='portal-esposende';

  const readBase=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x.ts&&Date.now()-x.ts<TTL?x:{}}catch{return {}}};
  const readStore=()=>{try{return localStorage.getItem(STORE_KEY)||''}catch{return ''}};
  const get=()=>{const c=readBase(),l=readStore();return l?{...c,loja:l}:c};
  const put=p=>{try{
    const atual=readBase(),next={...atual,...p,ts:Date.now()};
    if(Object.prototype.hasOwnProperty.call(p,'loja')){
      if(p.loja)localStorage.setItem(STORE_KEY,String(p.loja));
      else localStorage.removeItem(STORE_KEY);
      delete next.loja;
    }
    localStorage.setItem(KEY,JSON.stringify(next));
  }catch{}};

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const loja=s=>{
    s=String(s||'');
    let m=s.match(/(?:loja|filial|empresa)\s*(?:n[ºo°]?\s*)?(\d{1,4})\b/i);
    if(!m)m=s.match(/(?:troca|trocar|muda|mudar|agora)\s+(?:para\s+)?(?:a\s+)?(?:loja\s+)?(\d{1,4})\b/i);
    if(!m)return null;
    const raw=m[1].replace(/^0+/,'')||'0';
    return String(Number(raw.length>2?raw.slice(-2):raw));
  };
  const pedeGeral=s=>/\b(todas? as lojas|todas? lojas|empresa toda|rede toda|geral|esposende inteira|toda a esposende|sem loja especifica)\b/i.test(norm(s));

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      let url=typeof input==='string'?input:(input&&input.url)||'';
      if(/portal-cerebro(?:-integrado)?/i.test(url)&&init&&typeof init.body==='string'){
        const p=JSON.parse(init.body),q=String(p.pergunta_original||p.pergunta||''),c=get();
        const explicita=loja(q),geral=!explicita&&pedeGeral(q);
        const ativa=geral?null:(explicita||p.loja||c.loja||null);
        if(geral){p.loja=null;p.lojas=[]}
        else if(ativa){p.loja=ativa;p.lojas=[ativa];if(explicita)put({loja:ativa})}
        if(!p.mes&&c.mes)p.mes=c.mes;
        if(!p.ano&&c.ano)p.ano=c.ano;
        p.session_id=SESSION;
        p.destino='integrado';
        put({mes:p.mes||c.mes,ano:p.ano||c.ano,assunto:q||c.assunto});
        init={...init,body:JSON.stringify(p)};
        const nova=url.replace(/portal-cerebro(?:-integrado)?(?=\?|$)/i,'portal-conversa');
        if(typeof input==='string')input=nova;
        else if(input instanceof Request)input=new Request(nova,input);
      }
    }catch(e){console.warn('[Cérebro] contexto conversacional:',e)}
    return originalFetch(input,init);
  };

  function topDocument(){try{return window.top&&window.top.document?window.top.document:document}catch{return document}}
  function findBrain(doc){
    if(!doc)return null;
    const orcInput=doc.getElementById('orc-brain-input'),orcAsk=doc.getElementById('orc-brain-ask');
    if(orcInput&&orcAsk)return {doc,input:orcInput,ask:orcAsk,kind:'orc'};
    const input=doc.getElementById('brain-quick-input'),ask=doc.getElementById('brain-quick-ask');
    if(input&&ask)return {doc,input,ask,kind:'portal'};
    for(const fr of Array.from(doc.querySelectorAll('iframe'))){
      try{const hit=findBrain(fr.contentDocument);if(hit)return hit}catch{}
    }
    return null;
  }
  function findActiveBrain(){
    const d=topDocument();
    for(const id of ['orc-central-externa-frame','orc-central-frame']){
      const fr=d.getElementById(id);
      if(fr){
        try{
          const box=fr.closest('#orc-central-externa,#orc-central-unica');
          if(!box||box.style.display!=='none'){
            const hit=findBrain(fr.contentDocument);
            if(hit)return hit;
          }
        }catch{}
      }
    }
    return findBrain(d)||findBrain(document);
  }
  function status(text,kind){
    const d=topDocument(),el=d.getElementById('portal-voice-status');
    if(!el)return;
    el.textContent=text||'';
    el.style.display=text?'block':'none';
    el.style.background=kind==='error'?'#7f1d1d':'#081421';
  }
  function setListening(on){
    const d=topDocument(),b=d.getElementById('portal-voice-mic');
    if(!b)return;
    b.dataset.listening=on?'1':'0';
    b.textContent=on?'■':'🎤';
    b.setAttribute('aria-label',on?'Parar escuta':'Perguntar por voz');
    b.title=on?'Parar':'Perguntar por voz';
    b.style.background=on?'#dc2626':'#2563eb';
    b.style.boxShadow=on?'0 0 0 7px rgba(220,38,38,.22),0 8px 24px rgba(0,0,0,.45)':'0 8px 24px rgba(0,0,0,.45)';
  }
  function sendToBrain(text){
    const hit=findActiveBrain();
    if(!hit){status('Cérebro ainda não carregou. Aguarde um instante e tente novamente.','error');return false}
    const {doc,input,ask,kind}=hit;
    const voice=doc.getElementById(kind==='orc'?'orc-brain-voice':'bq-voz-toggle');
    if(voice&&!voice.checked){
      voice.checked=true;
      try{voice.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
    }
    input.value=text;
    try{input.dispatchEvent(new Event('input',{bubbles:true}))}catch{}
    if(kind==='orc'&&doc.defaultView&&doc.defaultView.OrcCerebro){
      doc.defaultView.OrcCerebro.ask(text,{speak:true});
    }else ask.click();
    const l=loja(text)||readStore();
    status(l?'Pergunta enviada · loja '+l+' mantida':'Pergunta enviada');
    setTimeout(()=>status(''),2200);
    return true;
  }

  let recognition=null,gotResult=false;
  function startVoice(){
    let SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){try{SR=window.top&&(window.top.SpeechRecognition||window.top.webkitSpeechRecognition)}catch{}}
    if(!SR){status('Entrada por voz não está disponível neste navegador.','error');return}
    if(recognition){try{recognition.stop()}catch{};recognition=null;setListening(false);return}
    try{
      recognition=new SR();
      recognition.lang='pt-BR';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
      gotResult=false;
      recognition.onstart=()=>{setListening(true);status('Ouvindo…')};
      recognition.onresult=e=>{
        gotResult=true;
        const text=String(e.results?.[0]?.[0]?.transcript||'').trim();
        if(text)sendToBrain(text);else status('Não entendi. Toque no microfone e tente novamente.','error');
      };
      recognition.onerror=e=>{
        const msg=e&&e.error==='not-allowed'?'Permita o acesso ao microfone para usar perguntas por voz.':'Não consegui ouvir. Toque no microfone e tente novamente.';
        status(msg,'error');
      };
      recognition.onend=()=>{recognition=null;setListening(false);if(!gotResult)setTimeout(()=>status(''),1800)};
      recognition.start();
    }catch(e){recognition=null;setListening(false);status('Não consegui abrir o microfone. Tente novamente.','error')}
  }

  function installMic(){
    const d=topDocument();
    if(d.getElementById('portal-voice-mic'))return;
    const wrap=d.createElement('div');
    wrap.id='portal-voice-tools';
    wrap.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Inter,Arial,sans-serif;pointer-events:none';
    const st=d.createElement('div');
    st.id='portal-voice-status';
    st.style.cssText='display:none;max-width:min(78vw,360px);background:#081421;color:#fff;border:1px solid #315170;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:auto';
    const b=d.createElement('button');
    b.id='portal-voice-mic';b.type='button';b.textContent='🎤';b.title='Perguntar por voz';b.setAttribute('aria-label','Perguntar por voz');
    b.style.cssText='pointer-events:auto;width:58px;height:58px;min-width:58px;border:0;border-radius:50%;margin:0;padding:0;background:#2563eb;color:#fff;font-size:26px;line-height:58px;text-align:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45);-webkit-tap-highlight-color:transparent';
    b.addEventListener('click',startVoice);
    wrap.append(st,b);d.body.appendChild(wrap);
  }

  function installWhenReady(){
    if(topDocument().body)installMic();else setTimeout(installWhenReady,100);
  }
  installWhenReady();

  window.PortalCerebroContexto={
    contexto:get,
    lojaAtual:readStore,
    trocarLoja(n){const l=loja('loja '+n);if(l)put({loja:l});return l},
    limparLoja(){put({loja:null})},
    limpar(){try{localStorage.removeItem(KEY);localStorage.removeItem(STORE_KEY)}catch{}},
    voz:startVoice,
    perguntarPorVoz:sendToBrain
  };
})();
