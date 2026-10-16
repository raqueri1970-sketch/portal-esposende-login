// Sistema de Inventário — Ajustes de Estoque manuais (Ajuste Expresso).
//
// Regra: quando se INCLUI um par numa numeração (AC/ESTOQUE, AC/VENDA), teoricamente era
// preciso TIRAR um par de outra numeração do mesmo código. Essa saída não feita aparece no
// inventário como FALTA em outra numeração do mesmo código — é ela que o ajuste abate.
// Vale o código, não a numeração. Não abate: sobra no código (inclusão não explica sobra),
// falta só na mesma numeração do ajuste (incluiu e o par não existe — verificar), ajuste
// posterior ao inventário (alerta) e ajuste anterior ao inventário anterior da loja.
//
// No arquivo de ajustes o campo "produto" vem com 8 dígitos = código (6) + numeração (2):
// 02054440 = código 020544, nº 40. O tamanho do código é medido pelo próprio inventário.
//
// Onde entra:
//  - Central de Importação: o arquivo é reconhecido sozinho (coluna "Ajustes Estoque") e
//    também pode ser incluído por auditoria; arquivo solto pode ir para uma auditoria já importada.
//  - Importação Manual: campo "Arquivo de Ajustes de Estoque (.xlsx) — opcional".
//  - Tela da loja: botão "Importar/Atualizar Ajustes de Estoque" + quadro com o resultado
//    linha a linha; o abatimento aparece em "Ajustes Aplicados" e em todos os totais.
// Nuvem: tabela inv_ajustes_manuais (uma linha por auditoria); cache local sia_ajman_<id>.
(function(){
  var VERSAO='20261016-2';
  var CHAVE='sia_ajman_';
  var TIPO='Ajuste Manual de Estoque';
  var MESES={jan:1,feb:2,fev:2,mar:3,apr:4,abr:4,may:5,mai:5,jun:6,jul:7,aug:8,ago:8,sep:9,set:9,oct:10,out:10,nov:11,dec:12,dez:12};

  function txt(v){return String(v==null?'':v).trim();}
  function semAcento(s){return txt(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
  function soDigitos(v){return txt(v).replace(/\D/g,'');}
  function normCod(v){var d=soDigitos(v);return d?(d.replace(/^0+/,'')||'0'):txt(v).toUpperCase();}
  function normLoja(v){var n=parseInt(soDigitos(v),10);return isNaN(n)?'':String(n);}
  function num(v){if(typeof v==='number')return v;var n=parseFloat(txt(v).replace(/\./g,'').replace(',','.'));return isNaN(n)?0:n;}
  function pad(n){return String(n).padStart(2,'0');}
  function esc(s){return txt(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function quase0(n){return Math.abs(n)<1e-9;}

  // Datas do arquivo: "18-Sep-26", "18/09/2026", "2026-09-18", serial do Excel ou Date.
  function dataIso(v){
    if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate());
    if(typeof v==='number'&&v>20000&&v<80000){var d=new Date(Math.round((v-25569)*864e5));return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());}
    var s=txt(v),m;
    if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[1]+'-'+m[2]+'-'+m[3];
    if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))){var a=m[3].length===2?'20'+m[3]:m[3];return a+'-'+pad(m[2])+'-'+pad(m[1]);}
    if((m=s.match(/^(\d{1,2})[\s\/.-]([A-Za-zÀ-ú]{3})[A-Za-zÀ-ú]*[\s\/.-](\d{2,4})/))){
      var mes=MESES[semAcento(m[2]).slice(0,3)];
      if(mes){var ano=m[3].length===2?'20'+m[3]:m[3];return ano+'-'+pad(mes)+'-'+pad(m[1]);}
    }
    return '';
  }
  function dataBR(iso){var m=txt(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1].slice(2):'-';}
  function lojaDoNome(nome){
    var m=txt(nome).match(/loja[^0-9]{0,6}(\d{1,4})/i)||txt(nome).match(/(?:^|[^0-9])(\d{1,3})(?:[^0-9]|$)/);
    return m?normLoja(m[1]):'';
  }

  // Reconhece o arquivo de ajustes pelo cabeçalho: precisa de "produto" e de quantidade, e
  // de pelo menos um sinal de ajuste (dtacerto, mv, auxiliar AC/...). Devolve null se não for.
  function lerAjustes(rows, nomeArquivo){
    rows=rows||[];
    var hIdx=-1,col={};
    for(var i=0;i<Math.min(rows.length,15)&&hIdx===-1;i++){
      var h=(rows[i]||[]).map(semAcento);
      var c={
        produto:h.findIndex(function(x){return x==='produto'||x==='cdprod'||x==='cod produto'||x==='codproduto'||x==='referencia';}),
        qtd:h.findIndex(function(x){return x==='qtde'||x==='qtd'||x==='quantidade';}),
        mv:h.findIndex(function(x){return x==='mv'||x==='mov'||x==='movimento'||x==='e/s';}),
        data:h.findIndex(function(x){return x==='dtacerto'||x==='data acerto'||x==='dt acerto';}),
        dataAlt:h.findIndex(function(x){return x==='data'||x==='reportgroup';}),
        doc:h.findIndex(function(x){return x==='codigo'||x==='documento'||x==='doc';}),
        desc:h.findIndex(function(x){return x==='descricao'||x==='desc';}),
        aux:h.findIndex(function(x){return x==='auxiliar'||x==='tipo ajuste';}),
        depto:h.findIndex(function(x){return x==='dpto'||x==='depto'||x==='departamento';}),
        obs:h.findIndex(function(x){return x==='obs'||x==='observacao';}),
        tam:h.findIndex(function(x){return x==='tam'||x==='tamanho'||x==='numeracao';}),
        loja:h.findIndex(function(x){return x==='loja'||x==='emp'||x==='filial';})
      };
      if(c.produto>=0&&c.qtd>=0&&(c.data>=0||c.mv>=0||c.aux>=0)){hIdx=i;col=c;}
    }
    if(hIdx===-1)return null;
    var g=function(r,k){return col[k]>=0?r[col[k]]:'';};
    var itens=[],lojaCol='';
    for(var j=hIdx+1;j<rows.length;j++){
      var r=rows[j]||[];
      var produto=soDigitos(g(r,'produto'))||txt(g(r,'produto'));
      if(!produto)continue;
      var mv=txt(g(r,'mv')).toUpperCase();
      var q=Math.abs(num(g(r,'qtd')));
      if(!q)continue;
      if(!lojaCol&&col.loja>=0)lojaCol=normLoja(g(r,'loja'));
      itens.push({
        produto:produto, tamCol:txt(g(r,'tam')),
        qtd: mv==='S'?-q:q, mv:mv||'E',
        data:dataIso(g(r,'data'))||dataIso(g(r,'dataAlt')),
        doc:txt(g(r,'doc')), desc:txt(g(r,'desc')), tipo:txt(g(r,'aux')), depto:txt(g(r,'depto')),
        obs:txt(g(r,'obs')).replace(/_x000D_/gi,'').replace(/\s+/g,' ')
      });
    }
    if(!itens.length)return null;
    return {arquivo:nomeArquivo||'', loja:lojaCol||lojaDoNome(nomeArquivo), importadoEm:new Date().toISOString(), itens:itens};
  }

  // Tamanho do código no inventário (normalmente 6): o produto do ajuste com mais dígitos
  // do que isso traz a numeração no final.
  function tamanhoCodigo(rows){
    var cont={};
    (rows||[]).forEach(function(r){var l=txt(r.cdProd).length;if(l)cont[l]=(cont[l]||0)+1;});
    var melhor=6,max=0;
    Object.keys(cont).forEach(function(k){if(cont[k]>max){max=cont[k];melhor=+k;}});
    return melhor;
  }
  function separarProduto(produto, lenCod, tamCol){
    var p=txt(produto);
    if(/^\d+$/.test(p)&&p.length>lenCod)return {cod:p.slice(0,lenCod), tam:tamCol||p.slice(lenCod)};
    return {cod:p, tam:tamCol||''};
  }

  function calcAggLocal(rows){
    var a={n:rows.length,sobraQtd:0,sobraCusto:0,sobraVenda:0,faltaQtd:0,faltaCusto:0,faltaVenda:0};
    rows.forEach(function(r){
      if(r.qtdDif>0){a.sobraQtd+=r.qtdDif;a.sobraCusto+=r.custoDif;a.sobraVenda+=r.vndaDif;}
      else if(r.qtdDif<0){a.faltaQtd+=r.qtdDif;a.faltaCusto+=r.custoDif;a.faltaVenda+=r.vndaDif;}
    });
    a.netQtd=a.sobraQtd+a.faltaQtd;a.netCusto=a.sobraCusto+a.faltaCusto;a.netVenda=a.sobraVenda+a.faltaVenda;
    a.absQtd=a.sobraQtd-a.faltaQtd;a.absCusto=a.sobraCusto-a.faltaCusto;a.absVenda=a.sobraVenda-a.faltaVenda;
    return a;
  }

  // Núcleo: abate os ajustes da divergência por código (m.ajustada, já sem duplicado e com a
  // troca de grade neutralizada) e refaz os totais finais. Não altera nada que esteja salvo.
  // janela = {ini: data do inventário anterior da loja (exclusiva), fim: data deste inventário}.
  function aplicarAjustes(inv, m, aj, janela, fx){
    fx=fx||{};
    var calcAgg=fx.calcAgg||calcAggLocal;
    var lenCod=tamanhoCodigo(m.ajustada&&m.ajustada.length?m.ajustada:m.liquidaRows);
    var porCod=new Map();
    (m.ajustada||[]).forEach(function(r,idx){porCod.set(normCod(r.cdProd),idx);});
    var itens=aj.itens.map(function(it){
      var s=separarProduto(it.produto,lenCod,it.tamCol);
      return Object.assign({},it,{cod:s.cod,tam:s.tam,abatido:0,status:''});
    });
    var grupos=new Map();
    itens.forEach(function(it){
      if(janela.fim&&it.data&&it.data>janela.fim){it.status='posterior';return;}
      if(janela.ini&&it.data&&it.data<=janela.ini){it.status='anterior';return;}
      var k=normCod(it.cod);
      if(!grupos.has(k))grupos.set(k,[]);
      grupos.get(k).push(it);
    });
    var nova=(m.ajustada||[]).map(function(r){return Object.assign({},r);});
    var lancamentos=[];
    var tot={faltaQtd:0,faltaCusto:0,faltaVenda:0,sobraQtd:0,sobraCusto:0,sobraVenda:0,codigos:0};
    // Falta por numeração (antes da troca de grade), por código.
    var porTam=new Map();
    (m.liquidaRows||[]).forEach(function(r){
      if(!(r.qtdDif<0))return;
      var k=normCod(r.cdProd);
      if(!porTam.has(k))porTam.set(k,[]);
      porTam.get(k).push({tam:txt(r.tam),resta:-r.qtdDif});
    });
    var mesmoTam=function(a,b){return normCod(a)===normCod(b);};
    grupos.forEach(function(lista,k){
      var idx=porCod.get(k);
      if(idx===undefined){lista.forEach(function(it){it.status='sem_divergencia';});return;}
      var row=nova[idx];
      var r=row.qtdDif;
      // Incluiu num nº → deveria ter tirado de OUTRO nº do mesmo código. Essa saída que não
      // foi feita aparece como falta naquele outro nº. Sobra no código não é explicada.
      if(!(r<0)){lista.forEach(function(it){it.status='sobra_codigo';});return;}
      var tams=porTam.get(k)||[];
      var cap=-r, A=0, origem={};
      lista.forEach(function(it){
        var precisa=Math.abs(it.qtd), tirou=[];
        tams.forEach(function(t){
          if(!precisa||!cap||!t.resta||(it.tam&&mesmoTam(t.tam,it.tam)))return;
          var u=Math.min(precisa,t.resta,cap);
          t.resta-=u;precisa-=u;cap-=u;A+=u;
          tirou.push('nº '+t.tam+' ('+u+')');
          origem[t.tam]=(origem[t.tam]||0)+u;
        });
        it.abatido=Math.abs(it.qtd)-precisa;
        it.tirouDe=tirou.join(', ');
        if(it.abatido>0)it.status='abateu_falta';
        else if(tams.some(function(t){return it.tam&&mesmoTam(t.tam,it.tam);}))it.status='falta_mesma_numeracao';
        else it.status='excedente';
      });
      if(!(A>0))return;
      var frac=A/Math.abs(r);
      var abCusto=row.custoDif*frac, abVenda=row.vndaDif*frac;
      var tamsAj=Array.from(new Set(lista.filter(function(it){return it.abatido>0;}).map(function(it){return it.tam;}).filter(Boolean)));
      var tamsTirou=Object.keys(origem).map(function(t){return t+' ('+origem[t]+')';});
      lancamentos.push({
        tipo:TIPO, cdProd:row.cdProd, marca:row.marca, depto:row.depto,
        tam:'Incluído nº '+(tamsAj.join(', ')||'-')+' → tirado do nº '+tamsTirou.join(', '),
        qtd:-A, custo:abCusto, venda:abVenda,
        residualQtd:r+A, residualCusto:row.custoDif-abCusto,
        motivo:'Inclusão manual já feita numa numeração sem a saída correspondente na outra numeração do mesmo código — falta abatida (vale o código). Doc(s): '+
          lista.filter(function(it){return it.abatido>0;}).map(function(it){return (it.doc||'s/nº')+' '+dataBR(it.data)+(it.tipo?' '+it.tipo:'');}).join('; ')
      });
      tot.faltaQtd+=A;tot.faltaCusto+=-abCusto;tot.faltaVenda+=-abVenda;
      tot.codigos++;
      row.qtdDif=r+A; row.custoDif-=abCusto; row.vndaDif-=abVenda;
      row.ajusteManualQtd=-A;
    });
    var resumo={arquivo:aj.arquivo, importadoEm:aj.importadoEm, itens:itens, totais:tot, janela:janela,
      nPosterior:itens.filter(function(i){return i.status==='posterior';}).length,
      nAnterior:itens.filter(function(i){return i.status==='anterior';}).length,
      nSemDivergencia:itens.filter(function(i){return i.status==='sem_divergencia';}).length,
      nExcedente:itens.filter(function(i){return i.status==='excedente';}).length,
      nSobraCodigo:itens.filter(function(i){return i.status==='sobra_codigo';}).length,
      nMesmaNumeracao:itens.filter(function(i){return i.status==='falta_mesma_numeracao';}).length};
    m.ajusteManual=resumo;
    if(!lancamentos.length)return m;

    var ajustada=nova.filter(function(r){return !quase0(r.qtdDif);});
    var antes=m.liquida;
    var fin=calcAgg(ajustada);
    ['nPares','parQtd','parCusto','parVenda'].forEach(function(k){if(antes&&antes[k]!==undefined)fin[k]=antes[k];});
    fin.ajManualQtd=tot.faltaQtd+tot.sobraQtd; fin.ajManualCusto=tot.faltaCusto+tot.sobraCusto;
    m.ajustada=ajustada;
    m.liquida=fin;
    if(m.funil){
      m.funil.reducaoAjusteManualCusto=antes.absCusto-fin.absCusto;
      m.funil.reducaoAjusteManualQtd=antes.absQtd-fin.absQtd;
      m.funil.finalAbsCusto=fin.absCusto;
      m.funil.finalAbsQtd=fin.absQtd;
    }
    if(fx.calcAcuracidades&&m.bruta){
      m.ac=fx.calcAcuracidades(inv,m.bruta.absQtd,fin.absQtd,m.bruta.absCusto,fin.absCusto,ajustada.length);
      m.acuraciaSkuLiquida=m.ac.acSku;
    }
    if(inv.custoAntes){
      m.taxaQuebraLiquida=Math.abs(Math.min(0,fin.faltaCusto))/inv.custoAntes*100;
      m.taxaSobraLiquida=Math.max(0,fin.sobraCusto)/inv.custoAntes*100;
      m.taxaDivergenciaAbsoluta=fin.absCusto/inv.custoAntes*100;
    }
    m.ajustes=(m.ajustes||[]).concat(lancamentos);
    return m;
  }

  // ---------- instalação dentro do módulo (iframe ifr-inv) ----------
  function instalar(w){
    if(!w||w.__invAjManualVersao===VERSAO)return;
    if(typeof w.invMetrics!=='function'||typeof w.loadInvs!=='function')return;
    w.__invAjManualVersao=VERSAO;
    var doc=w.document;
    var $=function(s){return doc.querySelector(s);};
    var ev=function(expr){try{return w.eval(expr);}catch(e){return undefined;}};
    var sb=function(){return ev('typeof sb!=="undefined"?sb:null');};
    var toast=function(msg){try{(w.toast||w.alert)(msg);}catch(e){}};
    var fmtInt=function(n){return w.fmtInt?w.fmtInt(n):String(Math.round(n));};
    var fmtMoney=function(n){return w.fmtMoney?w.fmtMoney(n):'R$ '+(n||0).toFixed(2);};

    function carregar(id){try{return JSON.parse(w.localStorage.getItem(CHAVE+id)||'null');}catch(e){return null;}}
    function salvar(id,aj){
      try{w.localStorage.setItem(CHAVE+id,JSON.stringify(aj));}catch(e){toast('Não foi possível salvar os ajustes no navegador (armazenamento cheio).');}
      var c=sb();
      if(c)c.from('inv_ajustes_manuais').upsert({inventario_id:id,arquivo_nome:aj.arquivo||'',itens:aj.itens,importado_em:aj.importadoEm||new Date().toISOString()})
        .then(function(r){if(r&&r.error)console.warn('[Inventário] ajustes não subiram para a nuvem:',r.error.message);},function(){});
    }
    function remover(id){
      try{w.localStorage.removeItem(CHAVE+id);}catch(e){}
      var c=sb();if(c)c.from('inv_ajustes_manuais').delete().eq('inventario_id',id).then(function(){},function(){});
    }
    function janelaDe(inv){
      var ant='';
      (w.loadInvs()||[]).forEach(function(i){
        if(i.id!==inv.id&&normLoja(i.loja)===normLoja(inv.loja)&&i.data&&i.data<inv.data&&i.data>ant)ant=i.data;
      });
      return {ini:ant,fim:inv.data||''};
    }
    async function lerArquivo(file){
      var buf=await file.arrayBuffer();
      var wb=w.XLSX.read(new Uint8Array(buf),{type:'array'});
      for(var i=0;i<wb.SheetNames.length;i++){
        var rows=w.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[i]],{header:1,raw:true,defval:''});
        var aj=lerAjustes(rows,file.name);
        if(aj)return aj;
      }
      return null;
    }

    // 1) Cálculo: toda métrica da auditoria passa pelos ajustes salvos.
    var origMetrics=w.invMetrics;
    w.invMetrics=function(inv){
      var m=origMetrics.apply(this,arguments);
      try{
        var aj=inv&&inv.id?carregar(inv.id):null;
        if(aj&&aj.itens&&aj.itens.length)aplicarAjustes(inv,m,aj,janelaDe(inv),{calcAgg:w.calcAgg,calcAcuracidades:w.calcAcuracidades});
      }catch(e){console.error('[Inventário] falha ao aplicar ajustes manuais:',e);}
      return m;
    };

    // 2) Central de Importação: reconhece o arquivo e associa à auditoria da mesma loja.
    if(typeof w.classificarArquivo==='function'){
      var origClass=w.classificarArquivo;
      w.classificarArquivo=async function(file){
        var it=await origClass.apply(this,arguments);
        try{
          if(it&&it.tipo!=='mestre'&&it.tipo!=='divergencias'&&it.tipo!=='foto'&&it.tipo!=='coleta'&&/\.(xlsx|xls|csv)$/i.test(it.nome||'')){
            var aj=null;
            if(it.workbook){
              for(var i=0;i<it.workbook.SheetNames.length&&!aj;i++)
                aj=lerAjustes(w.XLSX.utils.sheet_to_json(it.workbook.Sheets[it.workbook.SheetNames[i]],{header:1,raw:true,defval:''}),it.nome);
            } else aj=await lerArquivo(file);
            if(aj){it.tipo='ajustes';it.ajustes=aj;it.loja=aj.loja;it.nLinhas=aj.itens.length;}
          }
        }catch(e){console.warn('[Inventário] arquivo não lido como ajustes:',e);}
        return it;
      };
      var inp=$('#in-multi');
      if(inp&&!/\.xls,/.test(inp.accept))inp.accept=inp.accept.replace('.xlsx','.xlsx,.xls');
    }
    if(typeof w.agruparPorAuditoria==='function'){
      var origAgrupar=w.agruparPorAuditoria;
      w.agruparPorAuditoria=function(itens){
        var ajs=(itens||[]).filter(function(i){return i.tipo==='ajustes';});
        var grupos=origAgrupar.call(this,(itens||[]).filter(function(i){return i.tipo!=='ajustes';}));
        var soltos=[];
        ajs.forEach(function(a){
          var alvo=grupos.filter(function(g){return g.mestre&&normLoja(g.loja)===normLoja(a.ajustes.loja);});
          var g=alvo.length===1?alvo[0]:(!a.ajustes.loja&&grupos.length===1?grupos[0]:null);
          if(g){
            if(g.ajustes)g.ajustes={arquivo:g.ajustes.arquivo+' + '+a.ajustes.arquivo,loja:g.ajustes.loja,importadoEm:a.ajustes.importadoEm,itens:g.ajustes.itens.concat(a.ajustes.itens)};
            else g.ajustes=a.ajustes;
          } else soltos.push(a.ajustes);
        });
        w.__invAjSoltos=soltos;
        return grupos;
      };
    }
    function lote(){var l=ev('loteAtual');return Array.isArray(l)?l:[];}
    function abrirSeletor(cb){
      var f=doc.createElement('input');f.type='file';f.accept='.xlsx,.xls';f.style.display='none';
      f.addEventListener('change',async function(){
        var file=f.files[0];f.remove();if(!file)return;
        try{
          var aj=await lerArquivo(file);
          if(!aj){toast('Arquivo sem as colunas de ajuste (produto, qtde, dtacerto/mv). Verifique o arquivo.');return;}
          cb(aj);
        }catch(e){toast('Erro ao ler o arquivo de ajustes: '+e.message);}
      });
      doc.body.appendChild(f);f.click();
    }
    function caixaSoltos(){
      var log=$('#import-log');if(!log)return;
      var old=$('#ajm-soltos');if(old)old.remove();
      var soltos=w.__invAjSoltos||[];
      if(!soltos.length)return;
      var invs=w.loadInvs()||[];
      var box=doc.createElement('div');box.id='ajm-soltos';box.className='card';box.style.marginTop='10px';
      box.innerHTML=soltos.map(function(a,i){
        var daLoja=invs.filter(function(v){return normLoja(v.loja)===normLoja(a.loja);}).sort(function(x,y){return (y.data||'').localeCompare(x.data||'');});
        var opts=daLoja.map(function(v){return '<option value="'+esc(v.id)+'">Loja '+esc(v.loja)+' — inventário de '+dataBR(v.data)+'</option>';}).join('');
        return '<div class="row" style="align-items:center;gap:10px;margin-bottom:6px"><span class="pill warning">Ajustes de Estoque</span> <b>'+esc(a.arquivo)+'</b> · '+fmtInt(a.itens.length)+' linha(s)'+(a.loja?' · Loja '+esc(a.loja):'')+
          (opts?' <select class="ajm-solto-alvo" data-i="'+i+'" style="width:auto">'+opts+'</select> <button class="btn ajm-solto-ok" data-i="'+i+'">Aplicar a esta auditoria</button>'
               :' <span class="sub" style="margin:0">— nenhuma auditoria desta loja importada; arraste junto com o arquivo mestre.</span>')+'</div>';
      }).join('');
      log.insertAdjacentElement('afterend',box);
      box.querySelectorAll('.ajm-solto-ok').forEach(function(b){
        b.addEventListener('click',function(){
          var i=+b.dataset.i, sel=box.querySelector('.ajm-solto-alvo[data-i="'+i+'"]');
          if(!sel||!sel.value)return;
          salvar(sel.value,soltos[i]);
          soltos.splice(i,1);
          toast('Ajustes de estoque aplicados à auditoria.');
          caixaSoltos();
          if(typeof w.openLojaDetalhe==='function')w.openLojaDetalhe(sel.value);
        });
      });
    }
    if(typeof w.renderPreImport==='function'){
      var origRender=w.renderPreImport;
      w.renderPreImport=function(){
        var r=origRender.apply(this,arguments);
        try{
          var tb=$('#tb-preimport'),grupos=lote();
          if(tb&&grupos.length){
            var trs=tb.querySelectorAll('tr');
            var th=doc.createElement('th');th.className='num';th.textContent='Ajustes Estoque';
            trs[0].insertBefore(th,trs[0].lastElementChild);
            grupos.forEach(function(g,i){
              var tr=trs[i+1];if(!tr)return;
              var td=doc.createElement('td');td.className='num';
              td.innerHTML=g.ajustes
                ?'<span class="pill good" title="'+esc(g.ajustes.arquivo)+'">✓ '+fmtInt(g.ajustes.itens.length)+'</span> <a href="#" class="ajm-pre" data-i="'+i+'" style="font-size:11px;color:var(--neon-blue,#4fa8ff)">trocar</a>'
                :'<a href="#" class="ajm-pre" data-i="'+i+'" style="font-size:11px;color:var(--neon-blue,#4fa8ff)">+ incluir</a>';
              tr.insertBefore(td,tr.lastElementChild);
            });
            tb.querySelectorAll('.ajm-pre').forEach(function(a){
              a.addEventListener('click',function(e){
                e.preventDefault();
                abrirSeletor(function(aj){var g=lote()[+a.dataset.i];if(g){g.ajustes=aj;w.renderPreImport();}});
              });
            });
          }
          caixaSoltos();
        }catch(e){console.warn('[Inventário] coluna de ajustes:',e);}
        return r;
      };
    }

    // 3) Importação manual: campo opcional para o arquivo de ajustes.
    var pendenteManual=null;
    var inDup=$('#in-dup');
    if(inDup&&!$('#in-ajustes')){
      var cel=doc.createElement('div');
      cel.innerHTML='<label>Arquivo de Ajustes de Estoque (.xlsx) — opcional</label><input type="file" id="in-ajustes" accept=".xlsx,.xls">';
      (inDup.parentElement.parentElement||inDup.parentElement).appendChild(cel);
      var inAj=cel.querySelector('#in-ajustes');
      inAj.addEventListener('change',async function(){
        pendenteManual=null;
        var f=inAj.files[0];if(!f)return;
        try{pendenteManual=await lerArquivo(f);}catch(e){}
        if(!pendenteManual){toast('Arquivo sem as colunas de ajuste (produto, qtde, dtacerto/mv).');inAj.value='';}
      });
    }

    // 4) Ao gravar a auditoria: guarda os ajustes junto com o id novo (lote ou manual). Se a
    // auditoria está sendo substituída e não veio arquivo novo, mantém os ajustes da anterior.
    if(typeof w.buildInventario==='function'){
      var origBuild=w.buildInventario;
      w.buildInventario=function(fullRows,meta){
        var res=origBuild.apply(this,arguments);
        try{
          meta=meta||{};
          var aj=null;
          var g=lote().find(function(g){return g.ajustes&&g.mestre&&g.loja===meta.loja&&g.data===meta.data;});
          if(g)aj=g.ajustes;
          var inLoja=$('#in-loja'),inData=$('#in-data'),inAj=$('#in-ajustes');
          if(!aj&&pendenteManual&&inLoja&&inLoja.value.trim()===meta.loja&&(!inData||inData.value===meta.data)){
            aj=pendenteManual;pendenteManual=null;if(inAj)inAj.value='';
          }
          if(!aj){
            var ex=(w.loadInvs()||[]).find(function(i){return i.loja===meta.loja&&i.data===meta.data;});
            if(ex)aj=carregar(ex.id);
          }
          if(aj&&res&&res.inv)salvar(res.inv.id,aj);
        }catch(e){console.warn('[Inventário] ajustes não associados:',e);}
        return res;
      };
    }

    // 5) Tela da loja: botão de importar/atualizar + quadro com o resultado linha a linha.
    var ROTULO={abateu_falta:['good','Abateu falta'],excedente:['warning','Excedente — falta do código já zerada'],
      sobra_codigo:['','Código com sobra — não abatido'],falta_mesma_numeracao:['critical','Falta só na mesma nº — verificar'],
      sem_divergencia:['','Sem divergência no código'],posterior:['critical','Posterior ao inventário — não abatido'],anterior:['','Antes do inventário anterior — não abatido']};
    function quadro(invId){
      var anchor=$('#ld-resultado-final');if(!anchor)return;
      var card=$('#ajm-card');
      if(!card){card=doc.createElement('div');card.id='ajm-card';anchor.parentElement.insertBefore(card,anchor);}
      var inv=(w.loadInvs()||[]).find(function(i){return i.id===invId;});
      var aj=carregar(invId);
      if(!inv||!aj||!aj.itens||!aj.itens.length){
        card.innerHTML='<div class="card" style="padding:12px 16px"><span class="pill">Ajustes de Estoque</span> <span class="sub" style="margin:0">Nenhum arquivo de ajustes manuais nesta auditoria. Use "Importar/Atualizar Ajustes de Estoque" para abater os ajustes já incluídos (incluiu numa numeração = falta em outra do mesmo código).</span></div>';
        return;
      }
      var m=w.invMetrics(inv,w.loadDet(invId));
      var r=m.ajusteManual||{itens:[],totais:{}};
      var t=r.totais||{};
      var linhas=r.itens.slice().sort(function(a,b){return (a.status>b.status?1:-1);}).map(function(it){
        var lb=ROTULO[it.status]||['',it.status];
        return '<tr><td>'+esc(it.doc)+'</td><td>'+dataBR(it.data)+'</td><td>'+esc(it.tipo)+'</td><td>'+esc(it.cod)+'</td><td>'+esc(it.tam)+'</td><td>'+esc(it.tirouDe||'—')+'</td><td>'+esc(it.desc)+'</td>'+
          '<td class="num">'+(it.qtd>0?'+':'')+fmtInt(it.qtd)+'</td><td class="num">'+(it.abatido?fmtInt(it.abatido):'—')+'</td><td><span class="pill '+lb[0]+'">'+lb[1]+'</span></td><td style="font-size:11px">'+esc(it.obs)+'</td></tr>';
      }).join('');
      card.innerHTML='<h2>Ajustes de Estoque Manuais (já incluídos)</h2>'+
        '<div class="sub">Arquivo: '+esc(r.arquivo||aj.arquivo)+' · '+fmtInt(r.itens.length)+' linha(s) · período considerado: '+(r.janela&&r.janela.ini?'de '+dataBR(r.janela.ini)+' (inventário anterior, exclusive) ':'')+(r.janela&&r.janela.fim?'até '+dataBR(r.janela.fim):'sem data')+'. Incluiu numa numeração → abate a falta de OUTRA numeração do mesmo código (a saída que não foi feita).</div>'+
        '<div class="kpis">'+
          '<div class="kpi critical"><div class="lbl">Falta abatida</div><div class="val">'+fmtInt(t.faltaQtd||0)+' un.</div><div class="sub2">'+fmtMoney(t.faltaCusto||0)+'</div></div>'+
          '<div class="kpi '+(r.nMesmaNumeracao?'critical':'')+'"><div class="lbl">Falta só na mesma nº (verificar)</div><div class="val">'+fmtInt(r.nMesmaNumeracao||0)+'</div></div>'+
          '<div class="kpi"><div class="lbl">Códigos acertados</div><div class="val">'+fmtInt(t.codigos||0)+'</div></div>'+
          '<div class="kpi"><div class="lbl">Sem falta no código / sobra / excedente</div><div class="val">'+fmtInt((r.nSemDivergencia||0)+(r.nExcedente||0)+(r.nSobraCodigo||0))+'</div></div>'+
          '<div class="kpi '+(r.nPosterior?'critical':'')+'"><div class="lbl">Após o inventário</div><div class="val">'+fmtInt(r.nPosterior||0)+'</div></div>'+
        '</div>'+
        '<div class="card"><div class="row" style="justify-content:space-between"><span class="backlink" id="ajm-toggle">Ver as '+fmtInt(r.itens.length)+' linhas do arquivo ▾</span><button class="btn secondary" id="ajm-remover">Remover ajustes desta auditoria</button></div>'+
        '<div class="tablewrap" id="ajm-tabela" style="display:none;margin-top:10px"><table><tr><th>Doc</th><th>Data</th><th>Tipo</th><th>Cód</th><th>Nº incluído</th><th>Tirado do nº</th><th>Descrição</th><th class="num">Qtd</th><th class="num">Abatido</th><th>Resultado</th><th>Obs</th></tr>'+linhas+'</table></div></div>';
      card.querySelector('#ajm-toggle').addEventListener('click',function(){
        var tab=card.querySelector('#ajm-tabela'),ab=tab.style.display==='none';
        tab.style.display=ab?'block':'none';
        this.textContent='Ver as '+fmtInt(r.itens.length)+' linhas do arquivo '+(ab?'▴':'▾');
      });
      card.querySelector('#ajm-remover').addEventListener('click',function(){
        if(!w.confirm('Remover o arquivo de ajustes de estoque desta auditoria? A divergência volta a ser calculada sem eles.'))return;
        remover(invId);w.renderLojaDetalhe(invId);toast('Ajustes removidos.');
      });
    }
    function botaoDetalhe(){
      var ref=$('#btn-upload-dup');
      if(!ref||$('#btn-ajm-upload'))return;
      var b=doc.createElement('button');b.className='btn secondary';b.id='btn-ajm-upload';b.textContent='📦 Importar/Atualizar Ajustes de Estoque';
      ref.insertAdjacentElement('afterend',b);
      b.addEventListener('click',function(){
        var id=ev('currentInvId');if(!id)return;
        abrirSeletor(function(aj){
          var inv=(w.loadInvs()||[]).find(function(i){return i.id===id;});
          if(inv&&aj.loja&&normLoja(aj.loja)!==normLoja(inv.loja)&&!w.confirm('O arquivo parece ser da Loja '+aj.loja+' e esta auditoria é da Loja '+inv.loja+'. Aplicar mesmo assim?'))return;
          salvar(id,aj);w.renderLojaDetalhe(id);
          toast('Ajustes de estoque importados: '+fmtInt(aj.itens.length)+' linha(s).');
        });
      });
    }
    if(typeof w.renderLojaDetalhe==='function'){
      var origDet=w.renderLojaDetalhe;
      w.renderLojaDetalhe=function(invId){
        var r=origDet.apply(this,arguments);
        try{botaoDetalhe();quadro(invId);}catch(e){console.warn('[Inventário] quadro de ajustes:',e);}
        return r;
      };
    }
    if(typeof w.renderFunil==='function'){
      var origFunil=w.renderFunil;
      w.renderFunil=function(m){
        var h=origFunil.apply(this,arguments);
        if(m&&m.ajusteManual&&m.liquida&&m.liquida.ajManualQtd)
          h+='<div class="sub" style="margin-top:4px">Ajustes de Estoque manuais também deduzidos: '+fmtInt(m.liquida.ajManualQtd)+' un. · '+fmtMoney(Math.abs(m.liquida.ajManualCusto||0))+' (por código, qualquer numeração).</div>';
        return h;
      };
    }
    if(typeof w.deleteInv==='function'){
      var origDel=w.deleteInv;
      w.deleteInv=function(id){var r=origDel.apply(this,arguments);try{remover(id);}catch(e){}return r;};
    }

    // 6) Nuvem: traz os ajustes salvos por outro computador e atualiza a tela aberta.
    (async function(){
      var c=sb();if(!c)return;
      try{
        var res=await c.from('inv_ajustes_manuais').select('inventario_id,arquivo_nome,itens,importado_em');
        if(res.error||!res.data)return;
        var mudou=false;
        res.data.forEach(function(row){
          var loc=carregar(row.inventario_id);
          if(!loc||(row.importado_em&&(!loc.importadoEm||new Date(row.importado_em)>new Date(loc.importadoEm)))){
            try{w.localStorage.setItem(CHAVE+row.inventario_id,JSON.stringify({arquivo:row.arquivo_nome||'',importadoEm:row.importado_em,itens:row.itens||[]}));mudou=true;}catch(e){}
          }
        });
        var cur=ev('currentInvId'),pg=$('#pg-loja-detalhe');
        if(mudou&&cur&&pg&&pg.classList.contains('active'))w.renderLojaDetalhe(cur);
      }catch(e){}
    })();
    console.info('[Inventário] Ajustes de Estoque manuais ativos ('+VERSAO+').');
  }

  // Exposto para teste (node) e para a própria página.
  var api={lerAjustes:lerAjustes,aplicarAjustes:aplicarAjustes,dataIso:dataIso,separarProduto:separarProduto,instalar:instalar};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  window.__invAjustesManuais=api;

  function acompanhar(){
    var ifr=document.getElementById('ifr-inv');
    if(!ifr)return;
    try{instalar(ifr.contentWindow);}catch(e){}
    if(!ifr.__invAjLoad){
      ifr.__invAjLoad=true;
      ifr.addEventListener('load',function(){setTimeout(function(){try{instalar(ifr.contentWindow);}catch(e){}},150);});
    }
  }
  // O próprio módulo aberto direto (Nova aba) também recebe a correção.
  if(typeof window.invMetrics==='function'){try{instalar(window);}catch(e){}}
  new MutationObserver(acompanhar).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(acompanhar,1000);
  acompanhar();
})();
