# Detecta trocas de tela (1 quadro/s) e monta painéis de miniaturas com o minuto do vídeo.
import sys, os, glob, numpy as np
from PIL import Image, ImageDraw, ImageFont
S=sys.argv[1]; m=sys.argv[2]; thr=float(sys.argv[3]) if len(sys.argv)>3 else 6.0
fs=sorted(glob.glob(f'{S}/fr/{m}/*.jpg'))
arr=[np.asarray(Image.open(f).convert('L').resize((160,90) if Image.open(f).width>Image.open(f).height else (90,160)),dtype=np.float32) for f in fs]
keep=[0]; last=arr[0]
for i in range(1,len(arr)):
    if np.abs(arr[i]-last).mean()>thr: keep.append(i); last=arr[i]
os.makedirs(f'{S}/sheets',exist_ok=True)
font=ImageFont.load_default(size=16)
tw,th=Image.open(fs[0]).size
cols=5 if tw>th else 8
per=cols*5
for p in range(0,len(keep),per):
    ks=keep[p:p+per]; rows=(len(ks)+cols-1)//cols
    sh=Image.new('RGB',(cols*tw,rows*(th+20)),'white'); d=ImageDraw.Draw(sh)
    for j,k in enumerate(ks):
        x,y=(j%cols)*tw,(j//cols)*(th+20)
        sh.paste(Image.open(fs[k]),(x,y+20)); d.text((x+4,y+1),f'{k//60:02d}:{k%60:02d} (t={k})',fill='black',font=font)
    sh.save(f'{S}/sheets/{m}-{p//per+1}.jpg',quality=80)
print(m,len(keep),'trocas ->',(len(keep)+per-1)//per,'paineis')
