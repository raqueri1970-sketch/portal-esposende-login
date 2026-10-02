/* Central de Upload Universal → "porta única" do Portal (2026-10-01).
   Injetado pelo index.html dentro do shell do Portal (depois dos scripts originais).
   - Arquivos da Base Mãe (funcionários, lojas, regionais, setores) passam a ter destino:
     vão para a tela Base Mãe já validados; aplicar continua manual.
   - Um arquivo pode alimentar vários módulos (pairs): ativos → Base Mãe + Descontos;
     loja→regional → Base Mãe + Comercial + Remanejo.
   - Auditoria de Compras (desc) não escutava 'injectFiles': entrega direta via processFile.
   - Usuário do log = e-mail do login (antes: "(usuário local)"). */
(function(){
  if(window.__uploadUniversalBaseMae)return;window.__uploadUniversalBaseMae=true;
  if(typeof UNIVERSAL_TARGETS==='undefined'||typeof processUniversalQueue!=='function'||typeof sniffFile!=='function'){
    console.warn('[upload-universal-patch] Central de Upload não encontrada; patch não aplicado');return;
  }
  var sessao=window.__PORTAL_SESSION||(window.parent&&window.parent.__PORTAL_SESSION)||null;
  var emailLogado=(sessao&&sessao.email)||null;

  if(typeof MLBLS!=='undefined')MLBLS.bm='Base Mãe do Portal';
  [
    {pid:'bm',sid:'funcionarios',label:'Base Mãe · Funcionários (CPF, nome, cargo, loja, situação)',tokens:['cpf','nome','cargo','situacao','loja'],fnameTokens:['ativos','funcionario','colaborador'],pairs:[{pid:'cmpaud',sid:'func'}]},
    {pid:'bm',sid:'regionais',label:'Base Mãe · Regionais por loja',tokens:['filial','regional'],fnameTokens:['regional','filiais'],pairs:[{pid:'cml',sid:'lojas'},{pid:'rem',sid:'r'}]},
    {pid:'bm',sid:'lojas',label:'Base Mãe · Lojas (código, nome, cidade, UF)',tokens:['codigo','nome','cidade','uf'],fnameTokens:['cadastrolojas','lojas']},
    {pid:'bm',sid:'setores',label:'Base Mãe · Setores',tokens:['codigo','setor','gestor'],fnameTokens:['setor','departamento']}
  ].forEach(function(t){UNIVERSAL_TARGETS.push(t);});

  // Cadastro de ativos do RH também abastece a Base Mãe; loja→regional abastece os 3 que usam esse vínculo.
  function alvo(pid,sid){return UNIVERSAL_TARGETS.find(function(c){return c.pid===pid&&c.sid===sid;});}
  var func=alvo('cmpaud','func');if(func)func.pairs=[{pid:'bm',sid:'funcionarios'}];
  var cmlLojas=alvo('cml','lojas');if(cmlLojas)cmlLojas.pairs=[{pid:'bm',sid:'regionais'},{pid:'rem',sid:'r'}];
  var remR=alvo('rem','r');if(remR)remR.pairs=[{pid:'bm',sid:'regionais'},{pid:'cml',sid:'lojas'}];

  function tem(h,t){return h.some(function(x){return x.indexOf(t)>=0;});}
  var VALORES=['valor','receber','comissao','premio','pares','qtd','quantidade','venda','total','custo'];
  // Regras fortes por conteúdo, antes da pontuação genérica (que empatava "LOJA POR REGIONAL" com Meias).
  function regraForte(h){
    var temValor=VALORES.some(function(t){return tem(h,t);});
    if(tem(h,'regional')&&(tem(h,'filial')||tem(h,'loja'))&&!temValor)return alvo('bm','regionais');
    if(tem(h,'cpf')&&tem(h,'nome')&&(tem(h,'cargo')||tem(h,'funcao'))&&!tem(h,'vdescitem'))return alvo('bm','funcionarios');
    return null;
  }

  handleUniversalFiles=async function(fileList){
    var files=Array.from(fileList||[]);
    if(!files.length)return;
    toast('🔎 Analisando '+files.length+' arquivo(s)...');
    for(var i=0;i<files.length;i++){
      var f=files[i];
      var sniff=await sniffFile(f);
      var filenameNorm=normTok(f.name);
      var best=regraForte(sniff.headers),bestScore=best?1:0;
      if(!best)UNIVERSAL_TARGETS.forEach(function(cand){
        var s=scoreCandidate(sniff.headers,filenameNorm,cand);
        if(s>bestScore){bestScore=s;best=cand;}
      });
      UNIVERSAL_QUEUE.push({file:f,rowCount:sniff.rowCount,headers:sniff.headers,pid:best?best.pid:'',sid:best?best.sid:'',confidence:bestScore,error:sniff.error});
    }
    renderUniversalQueue();
  };

  function enviarParaBaseMae(lista){
    if(!lista.length)return;
    var pai=window.parent;
    if(pai&&pai!==window&&typeof pai.enviarParaBaseMae==='function'){pai.enviarParaBaseMae(lista);return;}
    toast('⚠ Base Mãe indisponível nesta tela — abra o menu ☰ → Administração → Base Mãe');
  }

  processUniversalQueue=function(){
    if(!UNIVERSAL_QUEUE.length)return;
    var campo=document.getElementById('up-universal-user');
    var usuario=emailLogado||(campo&&campo.value)||localStorage.getItem('portal_usuario')||'(usuário local)';
    localStorage.setItem('portal_usuario',usuario);
    var pidsToRun={},paraBaseMae=[],processed=0;
    function rotear(pid,sid,item,feitos){
      var chave=pid+'|'+sid;if(feitos[chave])return;feitos[chave]=true;
      // Funcionários só entram na Base Mãe com coluna de CPF (a Base Mãe exige CPF).
      if(pid==='bm'&&sid==='funcionarios'&&!tem(item.headers||[],'cpf'))return;
      if(pid==='bm')paraBaseMae.push({tipo:sid,file:item.file});
      else{hSF(pid,sid,item.file);pidsToRun[pid]=true;}
      logUniversalUpload(item.file,pid,sid,usuario,item.rowCount);
      var cand=alvo(pid,sid);if(!cand)return;
      (cand.pair?[cand.pair]:[]).concat(cand.pairs||[]).forEach(function(p){rotear(p.pid,p.sid,item,feitos);});
    }
    UNIVERSAL_QUEUE.forEach(function(item,i){
      var sel=document.getElementById('sel-universal-'+i);
      var val=sel?sel.value:'';
      if(!val)return;
      var parts=val.split('|');
      rotear(parts[0],parts[1],item,{});
      processed++;
    });
    Object.keys(pidsToRun).forEach(function(pid){
      var slots=MSLOTS[pid]||[];
      var fs=getF(pid);
      var ready=slots.every(function(s){return !s.req||fs[s.id];});
      if(ready)execMod(pid,true);
    });
    enviarParaBaseMae(paraBaseMae);
    toast(processed?'✅ '+processed+' arquivo(s) roteado(s) — processando módulo(s)':'⚠ Nenhum arquivo com destino selecionado');
    UNIVERSAL_QUEUE=[];
    renderUniversalQueue();
    setTimeout(function(){loadUniversalLog();loadDashboardFreshness();},2000);
  };

  // Auditoria de Compras não escuta 'injectFiles' — entrega o arquivo direto na função de leitura dele.
  if(typeof doInject==='function'){
    var doInjectOriginal=doInject;
    doInject=async function(pid,ifr,files){
      var w=ifr&&ifr.contentWindow;
      if(pid==='desc'&&w&&typeof w.processFile==='function'){
        Object.keys(files).forEach(function(sid){if(files[sid])w.processFile(files[sid]);});
        toast('⚙️ Processando arquivo de Compras...');
        return;
      }
      return doInjectOriginal.apply(this,arguments);
    };
  }

  // Tela: usuário vem do login; texto inclui a Base Mãe.
  var campo=document.getElementById('up-universal-user');
  if(campo&&emailLogado){campo.value=emailLogado;campo.readOnly=true;campo.title='Usuário do login do Portal';}
  var dz=document.querySelector('#pg-upload .da-t');
  if(dz)dz.textContent='⬇ Arraste arquivos de Base Mãe (funcionários, lojas, regionais), Comercial, NF, Remanejo, Almoxarifado, Compras, Descontos, Meias, Grendene, Saci e SGDF — de uma vez só';
})();
