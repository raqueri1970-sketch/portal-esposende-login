# mos.py MOD t1 t2 t3 t4 -> mosaico 2x2 com grade
import sys,subprocess,os
from PIL import Image
S=os.environ.get('APOSTILA_TMP','/tmp/apostila'); m=sys.argv[1]
D=os.path.dirname(os.path.abspath(__file__)); ts=sys.argv[2:6]
subprocess.run(['python3',f'{D}/grab.py',m,*ts],check=True,capture_output=True)
ims=[Image.open(f'{S}/grid/{m}-{t}-g.jpg') for t in ts]
W,H=ims[0].size; cols=2 if W>H else 4; rows=(len(ims)+cols-1)//cols
M=Image.new('RGB',(W*cols,H*rows),'white')
for i,im in enumerate(ims): M.paste(im,((i%cols)*W,(i//cols)*H))
M.save(f'{S}/grid/mos.jpg',quality=85); print('ok')
