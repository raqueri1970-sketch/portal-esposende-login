// Comum da tela do Crediário (Desconto em Folha): login do Portal, formatação, PDF e gráficos.
// Separado de Obras em 29/10/2026: só o que a tela do Crediário usa, sem tabelas nem telas de Obras.
const SB_URL = 'https://rdztzurfesnobfkazgpm.supabase.co';
const SB_KEY = 'sb_publishable_4LHSO4TrP7F4m4tpJyH44g_BGmfC92h';
const NO_PORTAL = /github\.io$/.test(location.hostname);
const EMBUTIDO = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
if (EMBUTIDO) document.documentElement.classList.add('embutido');
const sb = supabase.createClient(SB_URL, SB_KEY, {auth: {persistSession: true, autoRefreshToken: true, ...(NO_PORTAL ? {} : {storageKey: 'crediario-auth'})}});
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const brl = v => Number(v || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const dBR = d => d ? String(d).substring(0, 10).split('-').reverse().slice(0, 2).join('/') : '';
const dBRano = d => d ? String(d).substring(0, 10).split('-').reverse().join('/') : '';
const dtBR = iso => iso ? new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '—';
const hojeISO = () => new Date().toLocaleDateString('en-CA', {timeZone: 'America/Sao_Paulo'});
const msgErro = e => String(e && e.message || e).replace(/^.*?ERROR:\s*/, '');
function areaVisivel() {
  try { const f = window.frameElement; if (!EMBUTIDO || !f) return null;
    const r = f.getBoundingClientRect(), h = f.ownerDocument.defaultView.innerHeight;
    const top = Math.max(0, -r.top), alt = Math.max(200, Math.min(h, r.bottom) - Math.max(0, r.top));
    return {top, alt};
  } catch (e) { return null; }
}
function topo() { const f = (() => { try { return EMBUTIDO && window.frameElement; } catch (e) { return null; } })();
  if (f && f.getBoundingClientRect().top < 0) f.scrollIntoView({block: 'start'}); else window.scrollTo(0, 0); }
function toast(m, ms = 4000) { const t = $('toast'); t.textContent = m; t.style.display = 'block';
  const a = areaVisivel(); if (a) t.style.top = (a.top + a.alt - t.offsetHeight - 16) + 'px';
  clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', ms); }
async function todos(montar) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const {data, error} = await montar().range(de, de + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
function abrirModal(html, classe = '') {
  let m = $('modal');
  if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) fecharModal(); }); }
  m.innerHTML = `<div class="mbox ${classe}">${html}</div>`; m.style.display = 'flex';
  const a = areaVisivel();
  if (a) { m.style.top = a.top + 'px'; m.style.height = a.alt + 'px'; m.style.bottom = 'auto'; m.style.left = '0'; m.style.right = '0';
    m.style.paddingTop = '12px'; document.body.style.minHeight = (a.top + a.alt) + 'px'; }
  const f = m.querySelector('input:not([type=file]):not([data-sem-foco]),select:not([data-sem-foco]),textarea'); if (f && !a) setTimeout(() => f.focus(), 50);
}
function fecharModal() { const m = $('modal'); if (m) { m.style.display = 'none'; m.innerHTML = ''; } document.body.style.minHeight = ''; }
function iniciarLogin(onEntrar) {
  const mostrarLogin = m => { $('vApp').classList.add('hidden'); $('vLogin').classList.remove('hidden'); $('lErr').textContent = m || ''; };
  window.sair = async () => { await sb.auth.signOut(); mostrarLogin(); };
  window.entrar = async () => {
    $('lErr').textContent = '';
    const r = await sb.auth.signInWithPassword({email: $('lEmail').value.trim(), password: $('lSenha').value});
    if (r.error) { $('lErr').textContent = 'Email ou senha incorretos.'; return; }
    $('vLogin').classList.add('hidden'); $('vApp').classList.remove('hidden'); onEntrar(r.data.user);
  };
  window.semPermissao = m => { mostrarLogin(m || 'Este usuário não tem acesso a esta tela.'); };
  const senha = $('lSenha'); if (senha) senha.addEventListener('keydown', e => { if (e.key === 'Enter') window.entrar(); });
  (async () => {
    const s = await sb.auth.getSession();
    if (s.data && s.data.session) { $('vLogin').classList.add('hidden'); $('vApp').classList.remove('hidden'); onEntrar(s.data.session.user); }
    else mostrarLogin();
  })();
}
const r2 = v => Math.round(Number(v || 0) * 100) / 100;
const somaDias = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const segundaDe = iso => { const x = new Date((iso || hojeISO()) + 'T12:00:00'); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x.toISOString().slice(0, 10); };
function intervalo(f) {
  const hoje = hojeISO();
  if (f.p === 'sem') { const de = f.sem || segundaDe(hoje); return {de, ate: somaDias(de, 6), rotulo: `semana ${dBR(de)} a ${dBR(somaDias(de, 6))}`}; }
  if (f.p === 'tudo') return {de: null, ate: null, rotulo: 'todo o período'};
  const n = Number(f.p) || 30; return {de: somaDias(hoje, -(n - 1)), ate: hoje, rotulo: `últimos ${n} dias`};
}
let _pdfLib = null;
function carregarScript(src) { return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não carregou ' + src)); document.head.appendChild(s); }); }
async function pdfLib() {
  if (!_pdfLib) _pdfLib = (async () => {
    if (!window.jspdf) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    return window.jspdf.jsPDF;
  })().catch(e => { _pdfLib = null; throw e; });
  return _pdfLib;
}
const pdfTxt = s => String(s ?? '').replace(/[–—−]/g, '-').replace(/[^\x00-\xFF€]/g, '');
let _logo;
function logoPDF() {
  if (_logo === undefined) _logo = fetch(new URL('logo-esposende.jpg', location.href)).then(r => r.ok ? r.blob() : null)
    .then(b => b && new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => ok(null); f.readAsDataURL(b); })).catch(() => null);
  return _logo;
}
const quemCurto = q => String(q || '').split('@')[0];
const celTxt = c => c && typeof c === 'object' ? c.t : c;
const V = v => ({t: brl(v), n: Number(v || 0)});
const TONS = {azul: {tela: '#93c5fd', bar: [57, 135, 229], fundo: [235, 243, 254], txt: [29, 78, 216]}, verde: {tela: '#86efac', bar: [22, 163, 74], fundo: [234, 249, 239], txt: [21, 128, 61]},
  laranja: {tela: '#fdba74', bar: [234, 88, 12], fundo: [255, 243, 232], txt: [194, 65, 12]}, vermelho: {tela: '#fca5a5', bar: [220, 38, 38], fundo: [254, 236, 236], txt: [185, 28, 28]},
  roxo: {tela: '#7dd3fc', bar: [2, 132, 199], fundo: [235, 248, 255], txt: [3, 105, 161]}, cinza: {tela: '#e2e8f0', bar: [148, 163, 184], fundo: [246, 247, 250], txt: [30, 41, 59]}};
function tomResumo(rotulo, valor) {
  const l = String(rotulo || '').toLowerCase(), v = String(valor ?? ''), zero = /^(r\$\s*)?0([,.]00)?$|^0 de /i.test(v.trim()), neg = /^[-−]|empresa deve/i.test(v.trim());
  if (/pix|conta$|recibos|despesas$|semanas em|fornecedores$/.test(l) && !/semanas quitadas/.test(l)) return /recibos|despesas$|fornecedores$/.test(l) ? 'roxo' : 'cinza';
  if (/pago direto/.test(l)) return 'cinza';  // fora da conta do prestador
  if (l === 'entrada') return 'verde';
  if (l === 'saída') return 'laranja';
  if (l === 'saldo') return neg ? 'vermelho' : 'verde';
  if (l === 'saldo anterior' || l === 'saldo inicial') return 'cinza';
  if (l === 'recarga') return 'azul';
  if (l === 'faltou no pix') return 'vermelho';
  if (l === 'divergência') return 'roxo';
  if (/caixa/.test(l)) return neg ? 'vermelho' : 'verde';
  if (/duplic|pago a mais|crític|pendênc|recusad/.test(l)) return zero ? 'verde' : 'vermelho';
  if (/a pagar|em aberto|aberto|aguardando|atenção|com ponto/.test(l)) return zero ? 'verde' : 'laranja';
  if (/crédito|adiantament/.test(l)) return 'azul';
  if (/pago|quitad|reembols|pagamentos/.test(l)) return 'verde';
  if (/despesa|gasto|total|valor/.test(l)) return 'roxo';
  return 'cinza';
}
async function gerarPDF(doc) {
  const JsPDF = await pdfLib();
  const pdf = new JsPDF({orientation: doc.paisagem ? 'landscape' : 'portrait', unit: 'pt', format: 'a4'});
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 36;
  // Cabeçalho branco com a logo da Esposende (regra dos relatórios: logo + fundo branco para imprimir)
  const logo = await logoPDF();
  if (logo) pdf.addImage(logo, 'JPEG', M, 16, 44, 44);
  const tx = logo ? M + 54 : M;
  pdf.setTextColor(15, 30, 60); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text(pdfTxt(doc.titulo), tx, 34);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(70);
  // subtítulo longo quebra em até 2 linhas antes da data de emissão (antes passava por cima dela)
  const sub = pdf.splitTextToSize(pdfTxt(doc.subtitulo || 'Esposende'), W - M - tx - 150).slice(0, 2);
  pdf.text(sub, tx, sub.length > 1 ? 46 : 50);
  pdf.text('Emitido em ' + new Date().toLocaleString('pt-BR'), W - M, 50, {align: 'right'});
  pdf.setDrawColor(14, 74, 107); pdf.setLineWidth(1.5); pdf.line(M, 68, W - M, 68); pdf.setLineWidth(.5);
  pdf.setTextColor(20); let y = 92;
  if (doc.resumo && doc.resumo.length) {
    // Caixas do mesmo tamanho, texto centralizado; o valor diminui ou quebra em 2 linhas para nunca sair da caixa
    const col = Math.min(4, doc.resumo.length), gapR = 8, bw = (W - 2 * M - gapR * (col - 1)) / col, cw = bw + gapR, BH = 50, pad = 8;
    // encaixa o texto na largura: diminui a fonte até o mínimo e, se ainda não couber, quebra em 2 linhas
    const encaixa = (t, max, min, larg) => { let fs = max; pdf.setFontSize(fs); while (fs > min && pdf.getTextWidth(t) > larg) pdf.setFontSize(fs -= .25);
      return pdf.getTextWidth(t) <= larg ? {fs, ls: [t]} : {fs, ls: pdf.splitTextToSize(t, larg).slice(0, 2)}; };
    doc.resumo.forEach(([l, v], i) => {
      const x = M + (i % col) * cw, top = y - 12 + Math.floor(i / col) * (BH + 8), cx = x + bw / 2;
      const tom = TONS[tomResumo(l, v)];
      pdf.setFillColor(...tom.fundo); pdf.setDrawColor(...tom.bar); pdf.setLineWidth(.6); pdf.roundedRect(x, top, bw, BH, 4, 4, 'FD');
      pdf.setFillColor(...tom.bar); pdf.rect(x + .3, top + 6, 3, BH - 12, 'F');  // faixa colorida à esquerda
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(70, 80, 100);
      const r = encaixa(pdfTxt(l), 8, 6.5, bw - 2 * pad);
      pdf.setFontSize(r.fs); r.ls.forEach((t, k) => pdf.text(t, cx, top + (r.ls.length > 1 ? 10 : 14) + k * (r.fs + 1.5), {align: 'center'}));
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...tom.txt);
      const vv = encaixa(pdfTxt(v), 12, 8, bw - 2 * pad), base = top + (r.ls.length > 1 ? 31 : 32);
      pdf.setFontSize(vv.fs);
      if (vv.ls.length > 1) vv.ls.forEach((t, k) => pdf.text(t, cx, base - 3 + k * (vv.fs + 1), {align: 'center'}));
      else pdf.text(vv.ls[0], cx, base + 4, {align: 'center'});
    });
    pdf.setLineWidth(.5); pdf.setTextColor(20); pdf.setDrawColor(200);
    pdf.setFont('helvetica', 'normal');
    y += Math.ceil(doc.resumo.length / col) * (BH + 8) + 6;
  }
  if (doc.graficos && doc.graficos.length) {
    // 2 por linha na folha deitada; 1 por linha (mais estreito) na folha em pé
    const porLinha = doc.paisagem ? 2 : 1, gap = 12, gw = porLinha === 2 ? (W - 2 * M - gap) / 2 : W - 2 * M;
    for (let k = 0; k < doc.graficos.length; k += porLinha) {
      const linha = doc.graficos.slice(k, k + porLinha), alt = linha.map(g => gw * alturaGrafico(g) / 560), gh = Math.max(...alt);
      if (y + gh > H - 40) { pdf.addPage(); y = 50; }
      for (let c = 0; c < linha.length; c++) {
        try { pdf.addImage(await svgPNG(svgGrafico(linha[c]), 560, alturaGrafico(linha[c])), 'PNG', M + c * (gw + gap), y, gw, alt[c]); } catch (e) { console.warn('[PDF] gráfico:', e); }
      }
      y += gh + 14;
    }
    y += 6;
  }
  for (const s of doc.secoes || []) {
    if (y > H - 130) { pdf.addPage(); y = 50; }  // título não fica sozinho no pé da página
    if (s.titulo) { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text(pdfTxt(s.titulo), M, y); pdf.setFont('helvetica', 'normal'); y += 6; }
    // 17/10/2026: relatório sem observações/explicações (pedido do Ricardo) — s.nota não é impresso
    const colStyles = {}; (s.direita || []).forEach(i => colStyles[i] = {halign: 'right'});
    // colunas de valor: alinhadas à direita e sem quebra (as casas decimais ficam uma embaixo da outra)
    (s.direita || []).forEach(i => colStyles[i] = {halign: 'right', overflow: 'visible', cellWidth: 72});
    pdf.autoTable({startY: y + 4, head: [s.cab.map(pdfTxt)], body: s.linhas.map(l => l.map(c => pdfTxt(celTxt(c)))), foot: s.rodape ? [s.rodape.map(c => pdfTxt(celTxt(c)))] : undefined,
      margin: {left: M, right: M}, styles: {fontSize: 8, cellPadding: 3.5, overflow: 'linebreak', valign: 'middle'}, columnStyles: colStyles,
      headStyles: {fillColor: [37, 99, 235], textColor: 255}, footStyles: {fillColor: [235, 238, 245], textColor: 20, fontStyle: 'bold'},
      alternateRowStyles: {fillColor: [247, 248, 252]}, showFoot: 'lastPage',
      didParseCell: c => { if (c.section !== 'body' && (s.direita || []).includes(c.column.index)) c.cell.styles.halign = 'right'; }});
    y = pdf.lastAutoTable.finalY + 22;
  }
  if (doc.assinaturas && doc.assinaturas.length) {
    if (y > H - 100) { pdf.addPage(); y = 80; }
    y += 30; const cw = (W - 2 * M) / doc.assinaturas.length;
    doc.assinaturas.forEach((a, i) => { const x = M + i * cw; pdf.setDrawColor(120); pdf.line(x + 10, y, x + cw - 10, y);
      pdf.setFontSize(8.5); pdf.text(pdfTxt(a), x + cw / 2, y + 12, {align: 'center'}); });
  }
  if (doc.depois) await doc.depois(pdf, {W, H, M});  // páginas extras (ex.: as fotos de cada duplicidade)
  const n = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(120);
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    pdf.text(`Pagina ${i} de ${n}`, W - M, H - 18, {align: 'right'}); pdf.text(pdfTxt(doc.marca || 'Esposende - Crediario'), M, H - 18); }
  pdf.save((doc.arquivo || doc.titulo).normalize('NFD').replace(/[^A-Za-z0-9._-]+/g, '_') + '.pdf');
}
function htmlModelo(m) {
  const cel = (c, i, s) => `<td class="${(s.direita || []).includes(i) ? 'r' : ''}">${esc(celTxt(c))}</td>`;
  return `${m.resumo ? `<div class="grid" style="margin:10px 0">${m.resumo.map(([l, v]) => `<div class="card kpi t-${tomResumo(l, v)}"><div class="l">${esc(l)}</div><div class="v" style="font-size:19px">${esc(v)}</div></div>`).join('')}</div>` : ''}
    ${m.graficos && m.graficos.length ? `<div class="g2 graf-rel">${m.graficos.map(g => `<div>${svgGrafico(g)}</div>`).join('')}</div>` : ''}
    ${m.secoes.map(s => `<div class="card" style="margin-top:12px"><b>${esc(s.titulo || '')}</b>
      ${s.linhas.length ? `<div class="tw"><table><thead><tr>${s.cab.map((h, i) => `<th class="${(s.direita || []).includes(i) ? 'r' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${s.linhas.slice(0, 400).map(l => `<tr>${l.map((c, i) => cel(c, i, s)).join('')}</tr>`).join('')}</tbody>
      ${s.rodape ? `<tfoot><tr>${s.rodape.map((c, i) => cel(c, i, s)).join('')}</tr></tfoot>` : ''}</table></div>
      ${s.linhas.length > 400 ? `<div class="small mut">Mostrando 400 de ${s.linhas.length} linhas na tela — o PDF e a planilha trazem todas.</div>` : ''}` : '<div class="small mut">Nada no filtro.</div>'}</div>`).join('')}`;
}
const alturaGrafico = g => g.tipo === 'barras' ? Math.max(110, 44 + Math.min(10, (g.itens || []).filter(i => Number(i.a) || Number(i.b)).length) * ((g.series || []).length > 1 ? 30 : 24) + 4) : 270;
function svgGrafico(g, W = 560, H = alturaGrafico(g)) {
  const X = t => String(t == null ? '' : t).replace(/[&<>"]/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[m]));
  const corta = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const C = ['#3987e5', '#d95926'], F = 'font-family="Helvetica,Arial,sans-serif"', txt = '#1f2937', mut = '#6b7280', grade = '#e5e7eb';
  const it = (g.itens || []).filter(i => Number(i.a) || Number(i.b)), duas = it.some(i => i.b != null) && (g.series || []).length > 1;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="10" fill="#fff" stroke="#e2e8f0"/>`;
  o += `<text x="14" y="22" ${F} font-size="13" font-weight="700" fill="${txt}">${X(g.titulo)}</text>`;
  if (duas) g.series.forEach((n, k) => { const lx = W - 14 - (g.series.length - k) * 110; o += `<rect x="${lx}" y="12" width="10" height="10" rx="2" fill="${C[k]}"/><text x="${lx + 14}" y="21" ${F} font-size="10.5" fill="${mut}">${X(corta(n, 16))}</text>`; });
  if (!it.length) return o + `<text x="${W / 2}" y="${H / 2}" ${F} font-size="12" fill="${mut}" text-anchor="middle">Sem dados no filtro</text></svg>`;
  const top = 36, base = H - 8;
  if (g.tipo === 'barras') {
    const l = it.slice(0, 10), max = Math.max(1, ...l.map(i => Math.max(Number(i.a) || 0, Number(i.b) || 0)));
    const lab = 172, x0 = 14 + lab, larg = W - x0 - 70, h = Math.min(duas ? 30 : 24, (base - top) / l.length);
    l.forEach((i, k) => { const y = top + k * h, bh = duas ? (h - 6) / 2 : h - 7;
      o += `<text x="${x0 - 8}" y="${y + h / 2 + 4}" ${F} font-size="10.5" fill="${txt}" text-anchor="end">${X(corta(i.rotulo, 30))}</text>`;
      [i.a, duas ? i.b : null].forEach((v, s2) => { if (v == null) return; const w = Math.max(1.5, (Number(v) || 0) / max * larg), yy = y + 2 + s2 * (bh + 1);
        o += `<rect x="${x0}" y="${yy}" width="${w}" height="${bh}" rx="3" fill="${C[s2]}"/><text x="${x0 + w + 5}" y="${yy + bh / 2 + 3.5}" ${F} font-size="9.5" fill="${mut}">${X(brlCurto(v))}</text>`; }); });
  } else if (g.tipo === 'colunas') {
    const l = it.slice(-14), max = Math.max(1, ...l.map(i => Math.max(Number(i.a) || 0, Number(i.b) || 0)));
    const x0 = 62, x1 = W - 12, y1 = base - 22, alt = y1 - top - 6, gw = (x1 - x0) / l.length, bw = Math.min(28, (gw - 8) / (duas ? 2 : 1));
    for (let k = 0; k <= 4; k++) { const y = y1 - alt * k / 4; o += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${grade}"/><text x="${x0 - 6}" y="${y + 3.5}" ${F} font-size="9" fill="${mut}" text-anchor="end">${X(brlCurto(max * k / 4))}</text>`; }
    l.forEach((i, k) => { const cx = x0 + gw * k + gw / 2, vs = duas ? [i.a, i.b] : [i.a];
      vs.forEach((v, s2) => { const h = Math.max(0, (Number(v) || 0) / max * alt), x = cx - (vs.length * bw) / 2 + s2 * bw; o += `<rect x="${x + 1}" y="${y1 - h}" width="${bw - 2}" height="${h}" rx="2" fill="${C[s2]}"/>`; });
      if (l.length <= 8) o += `<text x="${cx}" y="${y1 - Math.max(0, (Number(i.a) || 0) / max * alt) - 4}" ${F} font-size="8.5" fill="${mut}" text-anchor="middle">${X(brlCurto(i.a))}</text>`;
      o += `<text x="${cx}" y="${y1 + 14}" ${F} font-size="9.5" fill="${txt}" text-anchor="middle">${X(corta(i.rotulo, l.length > 10 ? 6 : 11))}</text>`; });
  } else {  // linha: saldo ao longo do tempo (pode ficar negativo)
    const l = it.length > 60 ? it.filter((_, k) => k % Math.ceil(it.length / 60) === 0 || k === it.length - 1) : it, vs = l.map(i => Number(i.a) || 0);
    const mn = Math.min(0, ...vs), mx = Math.max(0, ...vs), amp = (mx - mn) || 1, x0 = 62, x1 = W - 70, y1 = base - 22, alt = y1 - top - 6;
    const px = k => l.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * k / (l.length - 1), py = v => y1 - (v - mn) / amp * alt;
    for (let k = 0; k <= 4; k++) { const v = mn + amp * k / 4, y = py(v); o += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${grade}"/><text x="${x0 - 6}" y="${y + 3.5}" ${F} font-size="9" fill="${mut}" text-anchor="end">${X(brlCurto(v))}</text>`; }
    o += `<line x1="${x0}" x2="${x1}" y1="${py(0)}" y2="${py(0)}" stroke="#94a3b8" stroke-dasharray="4 3"/>`;
    const pts = l.map((i, k) => `${px(k).toFixed(1)},${py(vs[k]).toFixed(1)}`).join(' ');
    o += `<polygon points="${px(0)},${py(0)} ${pts} ${px(l.length - 1)},${py(0)}" fill="${C[0]}" fill-opacity=".12"/><polyline points="${pts}" fill="none" stroke="${C[0]}" stroke-width="2.2" stroke-linejoin="round"/>`;
    l.forEach((i, k) => { if (vs[k] < 0) o += `<circle cx="${px(k)}" cy="${py(vs[k])}" r="2.6" fill="#dc2626"/>`; });
    const ult = vs[vs.length - 1]; o += `<text x="${px(l.length - 1) + 6}" y="${py(ult) + 4}" ${F} font-size="10.5" font-weight="700" fill="${ult < 0 ? '#dc2626' : '#15803d'}">${X(brlCurto(ult))}</text>`;
    [0, Math.floor((l.length - 1) / 2), l.length - 1].filter((k, j, a) => a.indexOf(k) === j).forEach(k => o += `<text x="${px(k)}" y="${y1 + 14}" ${F} font-size="9.5" fill="${txt}" text-anchor="middle">${X(l[k].rotulo)}</text>`);
  }
  return o + '</svg>';
}
function svgPNG(svg, W, H) {
  return new Promise((ok, erro) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/png')); };
    img.onerror = () => erro(new Error('gráfico não desenhou')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
const COR = {s1: '#3987e5', s2: '#d95926'};
const brlCurto = v => { v = Number(v || 0); const a = Math.abs(v);
  return a >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' mi'
    : a >= 1e3 ? 'R$ ' + (v / 1e3).toLocaleString('pt-BR', {maximumFractionDigits: a >= 1e4 ? 0 : 1}) + ' mil' : brl(v); };
function dica() { let t = $('tt'); if (!t) { t = document.createElement('div'); t.id = 'tt'; t.className = 'tt'; document.body.appendChild(t); } return t; }
function ligarDicas(el, conteudo) {
  const t = dica();
  el.querySelectorAll('[data-i]').forEach(h => {
    const mostrar = e => { const p = e.touches ? e.touches[0] : e; t.innerHTML = conteudo(Number(h.dataset.i)); t.style.display = 'block';
      const w = t.offsetWidth; t.style.left = Math.min(window.innerWidth - w - 8, p.clientX + 14) + 'px'; t.style.top = (p.clientY + 14) + 'px';
      el.querySelectorAll('[data-g="' + h.dataset.i + '"]').forEach(m => m.style.opacity = 1);
      el.querySelectorAll('[data-g]:not([data-g="' + h.dataset.i + '"])').forEach(m => m.style.opacity = .45); };
    const esconder = () => { t.style.display = 'none'; el.querySelectorAll('[data-g]').forEach(m => m.style.opacity = 1); };
    h.addEventListener('mousemove', mostrar); h.addEventListener('mouseleave', esconder);
    h.addEventListener('touchstart', mostrar, {passive: true}); h.addEventListener('touchend', () => setTimeout(esconder, 1500));
  });
}
function escala(max) { const p = Math.pow(10, Math.floor(Math.log10(max || 1))), m = (max || 1) / p, passo = (m <= 2 ? .5 : m <= 5 ? 1 : 2) * p;
  return {topo: Math.ceil((max || 1) / passo) * passo, passo}; }
function graficoBarrasH(el, itens, {vazio = 'Nada em aberto.'} = {}) {
  if (!itens.length) { el.innerHTML = `<div class="vazio">${esc(vazio)}</div>`; return; }
  const W = 600, LBL = 150, VAL = 86, H = 34, max = Math.max(...itens.map(i => i.valor)) || 1, larg = W - LBL - VAL;
  const linhas = itens.map((it, i) => { const y = i * H, w = Math.max(2, it.valor / max * larg);
    return `<g data-g="${i}"><text x="0" y="${y + 21}" style="fill:var(--txt2);font-size:12.5px;font-weight:600">${esc(it.rotulo.length > 20 ? it.rotulo.slice(0, 19) + '…' : it.rotulo)}</text>
      <rect x="${LBL}" y="${y + 8}" width="${w}" height="18" rx="4" fill="${COR.s1}"/>
      <text class="vl" x="${LBL + w + 8}" y="${y + 21}">${esc(brlCurto(it.valor))}</text></g>
      <rect class="hit" data-i="${i}" x="0" y="${y}" width="${W}" height="${H}"/>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${itens.length * H}" role="img" aria-label="Total a pagar por prestador">${linhas}</svg>`;
  ligarDicas(el, i => `<b>${esc(itens[i].rotulo)}</b><div><span><i style="background:${COR.s1}"></i>A pagar</span><span>${brl(itens[i].valor)}</span></div>${itens[i].det || ''}`);
}
const PALETA = ['#3987e5', '#f5b301', '#22c55e', '#d95926', '#38bdf8', '#2dd4bf', '#a3e635', '#94a3b8'];
function graficoRosca(el, itens, {vazio = 'Nada em aberto.', aoClicar = null, centro = 'Total'} = {}) {
  itens = itens.filter(i => i.valor > 0);
  if (!itens.length) { el.innerHTML = `<div class="vazio">${esc(vazio)}</div>`; return; }
  const tot = itens.reduce((a, i) => a + i.valor, 0), R = 70, r = 46, C = 80;
  let ang = -Math.PI / 2;
  const pt = (a, rr) => `${(C + rr * Math.cos(a)).toFixed(2)},${(C + rr * Math.sin(a)).toFixed(2)}`;
  const fatias = itens.map((it, i) => {
    const cor = PALETA[i % PALETA.length], frac = it.valor / tot;
    if (frac >= .9999) return `<g data-g="${i}"><circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="${cor}" stroke-width="${R - r}" data-i="${i}" class="hit2" style="cursor:pointer"/></g>`;
    const a0 = ang, a1 = ang + frac * 2 * Math.PI, g = frac > .5 ? 1 : 0; ang = a1;
    return `<g data-g="${i}"><path data-i="${i}" fill="${cor}" d="M${pt(a0, R)} A${R},${R} 0 ${g} 1 ${pt(a1, R)} L${pt(a1, r)} A${r},${r} 0 ${g} 0 ${pt(a0, r)} Z"/></g>`;
  }).join('');
  el.innerHTML = `<div class="rosca"><svg viewBox="0 0 160 160" role="img" aria-label="${esc(centro)}">${fatias}
      <text x="80" y="76" text-anchor="middle" style="font-size:10px;fill:var(--txt2)">${esc(centro)}</text>
      <text x="80" y="93" text-anchor="middle" style="font-size:13px;font-weight:800;fill:var(--txt)">${esc(brlCurto(tot))}</text></svg>
    <div class="lg">${itens.map((it, i) => `<div data-i="${i}"><span><i style="background:${PALETA[i % PALETA.length]}"></i>${esc(it.rotulo)}</span>
      <b>${brl(it.valor)} <span class="mut" style="font-weight:500">${(it.valor / tot * 100).toLocaleString('pt-BR', {maximumFractionDigits: 1})}%</span></b></div>`).join('')}</div></div>`;
  ligarDicas(el, i => `<b>${esc(itens[i].rotulo)}</b><div><span><i style="background:${PALETA[i % PALETA.length]}"></i>Valor</span><span>${brl(itens[i].valor)}</span></div>
    <div><span>Participação</span><span>${(itens[i].valor / tot * 100).toLocaleString('pt-BR', {maximumFractionDigits: 1})}%</span></div>${itens[i].det || ''}`);
  if (aoClicar) el.querySelectorAll('[data-i]').forEach(h => h.addEventListener('click', () => aoClicar(Number(h.dataset.i))));
}
function graficoColunas(el, pontos, nomes) {
  if (!pontos.length) { el.innerHTML = '<div class="vazio">Sem movimento no período.</div>'; return; }
  const W = 600, H = 230, ESQ = 58, BASE = H - 26, TOPO = 12, {topo, passo} = escala(Math.max(...pontos.flatMap(p => [p.a, p.b])));
  const y = v => BASE - v / topo * (BASE - TOPO), g = (W - ESQ) / pontos.length, bw = Math.max(8, Math.min(22, (g - 10) / 2));
  let grade = ''; for (let v = 0; v <= topo + 1e-9; v += passo) grade += `<line class="${v ? 'grade' : 'base'}" x1="${ESQ}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${ESQ - 8}" y="${y(v) + 4}" text-anchor="end">${esc(brlCurto(v).replace('R$ ', ''))}</text>`;
  const cada = Math.ceil(pontos.length / 8);
  const cols = pontos.map((p, i) => { const cx = ESQ + g * i + g / 2, x1 = cx - bw - 1, x2 = cx + 1;
    const barra = (x, v, c) => v > 0 ? `<path d="M${x},${BASE} V${y(v) + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${BASE} Z" fill="${c}"/>` : '';
    return `<g data-g="${i}">${barra(x1, p.a, COR.s1)}${barra(x2, p.b, COR.s2)}</g>
      ${i % cada === 0 ? `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(p.rotulo)}</text>` : ''}
      <rect class="hit" data-i="${i}" x="${ESQ + g * i}" y="0" width="${g}" height="${BASE}"/>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(nomes.join(' e '))} por semana">${grade}${cols}</svg>`;
  ligarDicas(el, i => `<b>${esc(pontos[i].titulo || pontos[i].rotulo)}</b>
    <div><span><i style="background:${COR.s1}"></i>${esc(nomes[0])}</span><span>${brl(pontos[i].a)}</span></div>
    <div><span><i style="background:${COR.s2}"></i>${esc(nomes[1])}</span><span>${brl(pontos[i].b)}</span></div>${pontos[i].det || ''}`);
}
const legenda = nomes => `<span class="leg">${nomes.map((n, i) => `<span><i style="background:${i ? COR.s2 : COR.s1}"></i>${esc(n)}</span>`).join('')}</span>`;
