/* Perfis "colaborador" e "carregador" (19/11/2026): esconde do Portal tudo que é folha de pagamento, RH e comissão.
   Só é injetado pelo index.html quando o perfil do usuário é "colaborador" ou "carregador".
   O bloqueio de verdade está no banco (RLS: portal_is_colaborador + portal_modulo_restrito) — isto aqui só limpa a tela.
   Escondidos: Auditoria RH / Folha, Fechamento Rescisão, Comissões Meias e Grendene, Descontos Funcionários,
   Desconto em Folha · Crediário (+ Ex-funcionários), Faltas e Atrasos, Upload Universal. */
(function () {
  var PIDS = ['rh', 'resc', 'mei', 'gren', 'cmpaud', 'upload'];
  var d = document;

  var css = PIDS.map(function (p) {
    return '[data-pg="' + p + '"],#pg-' + p + ',.oc[onclick*="go(\'' + p + '\'"]';
  }).join(',') +
    ',[data-cred-group],[data-cred-card],[data-cred-menu],[data-cred-linha]' +
    ',[data-fa-menu],.sg:has([data-fa-menu]),#faltas-atrasos-portal' +
    ',[data-mn-menu="faltas"],[data-mn-card="faltas"]' +
    '{display:none!important}';
  var st = d.createElement('style');
  st.id = 'colab-restricoes-css';
  st.textContent = css;
  (d.head || d.documentElement).appendChild(st);

  // Remove grupos de menu que ficaram vazios (ex.: "RH / Folha", "Crediário").
  function limparGrupos() {
    d.querySelectorAll('#sb .sg').forEach(function (g) {
      var itens = g.querySelectorAll('.ni');
      if (!itens.length) return;
      var visivel = Array.prototype.some.call(itens, function (b) { return getComputedStyle(b).display !== 'none'; });
      if (!visivel) g.style.display = 'none';
    });
  }

  // Bloqueia a navegação direta para os módulos escondidos (link antigo, atalho, outro patch).
  function travarGo() {
    var w = window;
    if (typeof w.go !== 'function' || w.go.__colab) return;
    var original = w.go;
    var novo = function (pid) {
      if (PIDS.indexOf(String(pid)) >= 0) {
        return original.call(this, 'ov', d.querySelector('[data-pg="ov"]'));
      }
      return original.apply(this, arguments);
    };
    novo.__colab = true;
    w.go = novo;
  }

  function aplicar() { travarGo(); limparGrupos(); }
  aplicar();
  d.addEventListener('DOMContentLoaded', aplicar);
  window.addEventListener('load', aplicar);
  setInterval(aplicar, 1500);
})();
