# grab.py MOD SEG [SEG...] -> quadros em resolução cheia com grade de 10% (para posicionar destaques)
import sys, subprocess, os
from PIL import Image, ImageDraw, ImageFont
S=os.environ.get('APOSTILA_TMP','/tmp/apostila'); m=sys.argv[1]
REPO=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../..'))
src=os.environ.get('APOSTILA_MIDIA',REPO+'/apostila-midia')+f'/{m}.2fps.mp4'
os.makedirs(f'{S}/grid',exist_ok=True)
font=ImageFont.load_default(size=13)
outs=[]
for t in sys.argv[2:]:
    raw=f'{S}/grid/{m}-{t}.png'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',t,'-i',src,'-frames:v','1',raw],check=True)
    im=Image.open(raw).convert('RGB'); W,H=im.size; d=ImageDraw.Draw(im)
    for i in range(1,10):
        x=W*i//10; y=H*i//10
        d.line([(x,0),(x,H)],fill=(0,200,255),width=1); d.line([(0,y),(W,y)],fill=(0,200,255),width=1)
        d.text((x+2,2),str(i*10),fill=(255,0,200),font=font); d.text((2,y+1),str(i*10),fill=(255,0,200),font=font)
    g=f'{S}/grid/{m}-{t}-g.jpg'; im.save(g,quality=85); outs.append(g)
print('\n'.join(outs))
