# Gera curso/apostila/<modulo>/NN.jpg e curso/apostila/conteudo.js a partir de roteiro.py
import json, os, subprocess, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from roteiro import AREA, MODULOS

REPO = '/home/user/portal-esposende-login'
MID = REPO + '/apostila-midia'
OUT = REPO + '/curso/apostila'

def extrair(mod, t, crop, dest):
    tmp = dest + '.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', f'{MID}/{mod}.2fps.mp4', '-frames:v', '1', tmp], check=True)
    im = Image.open(tmp).convert('RGB'); W, H = im.size
    if crop:
        x, y, w, h = crop
        im = im.crop((round(W*x/100), round(H*y/100), round(W*(x+w)/100), round(H*(y+h)/100)))
    im.save(dest, quality=86, optimize=True, progressive=True)
    os.remove(tmp)
    return im.size

def rel(hl, crop):
    # destaque em % do quadro inteiro -> % da imagem recortada
    if not crop: return hl
    cx, cy, cw, ch = crop
    return {**hl, 'x': round((hl['x']-cx)/cw*100, 2), 'y': round((hl['y']-cy)/ch*100, 2),
            'w': round(hl['w']/cw*100, 2), 'h': round(hl['h']/ch*100, 2)}

saida = {'area_id': AREA['id'], 'area_nome': AREA['nome'], 'modulos': []}
for m in MODULOS:
    os.makedirs(f"{OUT}/{m['id']}", exist_ok=True)
    for f in os.listdir(f"{OUT}/{m['id']}"): os.remove(f"{OUT}/{m['id']}/{f}")
    passos = []; n = 0
    for p in m['passos']:
        imgs = []
        for q in p.get('prints', []):
            n += 1; nome = f'{n:02d}.jpg'
            w, h = extrair(q.get('mod', m['id']), q['t'], q.get('crop'), f"{OUT}/{m['id']}/{nome}")
            im = {'arq': nome, 'destaques': [rel(x, q.get('crop')) for x in q.get('hl', [])]}
            if h > w: im['retrato'] = True
            imgs.append(im)
        passos.append({k: v for k, v in {'t': p['t'], 'titulo': p['titulo'], 'texto': p['texto'], 'dica': p.get('dica'), 'imgs': imgs}.items() if v})
    saida['modulos'].append({k: m[k] for k in ('id', 'ordem', 'nome', 'duracao', 'accent', 'objetivo', 'quando', 'antes', 'atencao', 'checklist') if k in m} | {'passos': passos})
    print(m['id'], len(passos), 'passos,', n, 'prints')

js = '// Gerado a partir das videoaulas do Treinamento de Operações de Estoque (prints + narração).\n'
js += 'window.APOSTILA = ' + json.dumps(saida, ensure_ascii=False, indent=1) + ';\n'
open(f'{OUT}/conteudo.js', 'w').write(js)
tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
print('total apostila/', round(tot/1024), 'KB')
