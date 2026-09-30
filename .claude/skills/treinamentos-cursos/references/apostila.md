# Pipeline da apostila (vídeo → apostila)

Usado para criar a apostila de Operações de Estoque (6 módulos, 77 prints, 46 páginas A4). Repita para uma área nova ou para refazer um módulo.

## 1. Obter mídia dos vídeos

Os vídeos estão no bucket público `curso-videos` do Supabase. Se a sessão não alcança `rdztzurfesnobfkazgpm.supabase.co` (rede "Confiável"), **não pare**: use o GitHub Actions do próprio repositório, que tem internet aberta.

1. Crie a branch `apostila-midia` e copie `scripts/workflow-apostila-midia.yml` para `.github/workflows/apostila-midia.yml`, com a `matrix.mod` = ids dos vídeos.
2. Push na branch → o workflow roda sozinho e faz commit em `apostila-midia/` de:
   - `<id>.2fps.mp4`: cópia sem áudio, 2 quadros/s, resolução original (base dos prints);
   - `<id>.transcricao.json|txt`: narração com minuto (`faster-whisper` medium, pt);
   - `<id>.probe.json`: resolução e duração.
3. Espere com `until [ "$(git ls-remote origin refs/heads/apostila-midia | cut -c1-7)" != "<sha>" ]; do sleep 60; done` em background e dê `git pull`.

Armadilhas conhecidas:
- `faster-whisper` com PyAV novo falha em `av.open(metadata_errors=…)`: decodifique com ffmpeg para `f32le` 16 kHz e passe o `numpy` array (já está no template).
- A fala dos vídeos é muito baixa (≈ −35 dBFS): o template aplica `volume=30dB,alimiter,loudnorm` e `vad_filter=False`. Se mesmo assim a transcrição vier vazia, o vídeo **não tem narração** (caso de Emitir Etiquetas): monte o capítulo só pelas telas e avise o usuário.
- Commits do bot com `GITHUB_TOKEN` não disparam o workflow de novo (sem loop).

## 2. Escolher os quadros

```bash
export APOSTILA_TMP=/tmp/apostila   # scratchpad
# miniaturas 1/s e painéis com o minuto de cada troca de tela
mkdir -p $APOSTILA_TMP/fr/<id> && ffmpeg -v error -i apostila-midia/<id>.2fps.mp4 -vf "fps=1,scale=320:-2" -q:v 4 $APOSTILA_TMP/fr/<id>/%04d.jpg
python3 scripts/sheets.py $APOSTILA_TMP <id> 2      # telas de sistema: limiar 2; vídeo de câmera: amostrar a cada 12 s
python3 scripts/mos.py <id> 20 26 37 86             # 4 quadros em resolução cheia com grade de 10%
```

Leia a transcrição inteira do módulo, liste os passos na ordem em que o instrutor fala e escolha 1 quadro por passo (2 a 4 para fotos de câmera). Evite quadros com miniaturas do Windows, banners ou dados pessoais sobrepostos.

No mosaico 2×2 a grade é **por imagem**: em uma célula à direita, subtraia a largura da primeira imagem antes de converter px → %. Esse foi o erro mais comum ao posicionar destaques.

## 3. Roteiro (`scripts/roteiro.py`)

Por módulo: `objetivo`, `quando`, `antes`, `passos`, `atencao`, `checklist`. Cada passo tem:
- `t`: minuto (s) em que o vídeo explica o passo (vira o selo ▶ mm:ss);
- `titulo` e `texto`: fiéis à narração, no imperativo, com `**negrito**` para botões e campos;
- `prints`: `{'t': seg, 'crop': [x,y,w,h] em % do quadro, 'hl': [H(x,y,w,h,'rótulo')], 'mod': outro_video?}`. Destaques em **% do quadro inteiro**; o build converte para o recorte.
- `dica` opcional.

Recortes prontos: `BTA_MENU`, `BTA_JANELA` (janela do BTA não maximizada, começa em x≈5,5%), `TOPO` (tela maximizada, só a parte útil), `SETA`, `TELA_CHEIA`. Fotos na vertical ficam sem `crop` e saem em grade de 2 a 4.

## 4. Gerar e revisar

```bash
python3 scripts/build.py                      # recria curso/apostila/<id>/NN.jpg e conteudo.js
python3 -m http.server 8765 &                 # na raiz do repo
NODE_PATH=$(npm root -g) node scripts/shot.js http://localhost:8765/curso/apostila.html /tmp/apostila/a.pdf todos
NODE_PATH=$(npm root -g) node scripts/shot.js "http://localhost:8765/curso/apostila.html?modulo=defeito" /tmp/apostila/m.png todos 390
NODE_PATH=$(npm root -g) node scripts/shot.js http://localhost:8765/curso/apostila.html /tmp/apostila/p.png 2   # só 2 módulos liberados
pdftoppm -r 50 -jpeg /tmp/apostila/a.pdf /tmp/apostila/pg/p                  # revisar página a página
```

Confira em cada página: destaque em cima do botão certo, rótulos legíveis, nenhum título órfão no pé da página, checklist inteiro na mesma página. Suba `AP_VERSAO` em `apostila.html` (e o `?v=` do `conteudo.js`) quando trocar imagens já publicadas.

## 5. Publicar

Commit só de `curso/` (a mídia pesada fica na branch `apostila-midia`); mostre o PDF de prévia ao usuário e, com o ok dele, faça o merge na `main`.
