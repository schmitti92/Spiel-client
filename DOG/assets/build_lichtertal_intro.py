#!/usr/bin/env python3
"""Render an ORIGINAL Lichtertal Christmas reveal film; no external media."""
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import math,random,subprocess,wave,struct
from pathlib import Path

ROOT=Path(__file__).resolve().parent; W=960;H=540;FPS=20;DURATION=13
FONTS=['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf']
def font(size):
 for name in FONTS:
  try:return ImageFont.truetype(name,size)
  except OSError:pass
 return ImageFont.load_default()
def smooth(v):
 v=max(0,min(1,v));return v*v*(3-2*v)
def opacity(t,start,end):
 return smooth((t-start)/.7)*(1-smooth((t-end+.7)/.7))
rng=random.Random(20261121)
snow=[(rng.randrange(W),rng.randrange(H),rng.uniform(.9,2.5),rng.randrange(12,38),rng.random()*6) for _ in range(160)]
stars=[(rng.randrange(W),rng.randrange(270),rng.randrange(1,3)) for _ in range(150)]
houses=[(80,355,125,96),(225,382,95,67),(335,367,112,84),(611,368,115,85),(760,347,135,105),(873,392,78,65)]
back=Image.new('RGB',(W,H));bd=ImageDraw.Draw(back)
for y in range(H):
 f=y/H;bd.line((0,y,W,y),fill=(int(7+13*f),int(23+30*f),int(44+30*f)))
for i in range(18):
 x=i*65-30;y=80+int(22*math.sin(i*.45))
 bd.polygon([(x,y),(x+95,y+30),(x+150,y+150),(x+50,y+97)],fill=(12+i//3,45+i,61+i))
for radius in range(85,27,-4):
 power=85-radius
 bd.ellipse((766-radius,110-radius,766+radius,110+radius),fill=(10+power//4,27+power//3,47+power//4))
bd.ellipse((733,77,799,143),fill=(244,237,207))
for x,y,r in stars:bd.ellipse((x-r,y-r,x+r,y+r),fill=(151,192,205))
bd.polygon([(0,370),(90,270),(171,332),(250,240),(340,340),(462,260),(574,362),(681,260),(791,328),(900,255),(960,330),(960,H),(0,H)],fill=(25,55,75))
bd.polygon([(0,412),(150,329),(255,391),(401,320),(574,409),(710,343),(876,379),(960,313),(960,H),(0,H)],fill=(45,79,94))
bd.ellipse((-100,386,1050,720),fill=(204,224,227))
bd.ellipse((-130,440,1170,750),fill=(225,236,233))
def center(draw,text,y,size,alpha,color=(252,229,175)):
 f=font(size);b=draw.textbbox((0,0),text,font=f)
 draw.text(((W-(b[2]-b[0]))/2,y),text,font=f,fill=(*color,int(alpha)),stroke_width=1,stroke_fill=(20,33,43,int(alpha)))
def render(t):
 im=back.copy().convert('RGBA');d=ImageDraw.Draw(im,'RGBA');reveal=smooth((t-2.6)/2.1)
 for i,(x,y,w,h) in enumerate(houses):
  light=.15+reveal*.85
  wall=[(78,77,73),(87,79,73),(95,84,70),(88,80,79),(92,74,67),(89,81,75)][i]
  d.rounded_rectangle((x,y,x+w,y+h),radius=7,fill=(*wall,255),outline=(168,171,160,255),width=2)
  d.polygon([(x-12,y+8),(x+w/2,y-35),(x+w+12,y+8)],fill=(81,50,56,255))
  d.line([(x-12,y+8),(x+w/2,y-35),(x+w+12,y+8)],fill=(242,246,234,255),width=7)
  d.rectangle((x+w*.74,y-42,x+w*.85,y-11),fill=(99,91,85,255))
  for f in [.17,.61]:
   d.rectangle((x+w*f,y+h*.34,x+w*(f+.2),y+h*.63),fill=(int(36+217*light),int(49+144*light),int(61+45*light),255))
  d.rounded_rectangle((x+w*.45,y+h*.59,x+w*.57,y+h),radius=3,fill=(48,46,56,255))
  for k in range(5):
   bx=x+10+(k*21)%max(22,w-8);by=y+5+(k%2)*4
   if reveal>.15:d.ellipse((bx-3,by-3,bx+3,by+3),fill=(250,211,122,int(120+130*reveal)))
 cx=480;d.rectangle((cx-12,383,cx+12,460),fill=(85,62,51,255))
 for width,top,bottom in [(92,335,427),(75,291,382),(58,250,337)]:
  d.polygon([(cx,top),(cx-width,bottom),(cx+width,bottom)],fill=(20,87+int(reveal*16),66,255))
  d.line((cx-width+4,bottom-5,cx,bottom-15,cx+width-4,bottom-5),fill=(196,218,216,255),width=4)
 tree=smooth((t-4.2)/2.5)
 if tree:
  glow=Image.new('RGBA',(W,H));g=ImageDraw.Draw(glow,'RGBA')
  for j in range(36):
   yy=274+(j//9)*37+(j%3)*4
   xx=cx+int((j%9-4)*((yy-233)/180)*20)
   power=int(tree*(105+105*(.5+.5*math.sin(t*3+j*1.7))))
   g.ellipse((xx-8,yy-8,xx+8,yy+8),fill=(255,209,86,power))
  im=Image.alpha_composite(im,glow.filter(ImageFilter.GaussianBlur(13)))
  d=ImageDraw.Draw(im,'RGBA')
  for j in range(36):
   yy=274+(j//9)*37+(j%3)*4;xx=cx+int((j%9-4)*((yy-233)/180)*20)
   d.ellipse((xx-3,yy-3,xx+3,yy+3),fill=(255,232,150,int(245*tree)))
  rad=8+tree*(9+4*math.sin(t*4))
  d.ellipse((cx-rad,241-rad,cx+rad,241+rad),fill=(255,228,120,int(220*tree)))
  d.line((cx-23,241,cx+23,241),fill=(255,242,167,int(220*tree)),width=3)
  d.line((cx,218,cx,264),fill=(255,242,167,int(220*tree)),width=3)
 for x,y,r,s,phase in snow:
  px=(x+7*math.sin(t*.6+phase))%W;py=(y+t*s)%H
  d.ellipse((px-r,py-r,px+r,py+r),fill=(244,251,250,int(110+65*math.sin(phase+t)**2)))
 titles=[(0,3.3,'EINE PARTIE. EIN FUNKE.','Und plötzlich verändert sich alles ...'),
 (3,6.4,'LICHTER ERWACHEN','Ein Dorf wartet auf seine Freunde.'),
 (6,9.5,'DER ZAUBER BEGINNT','Gemeinsam sammeln. Bauen. Staunen.'),
 (9,13.3,'DAS WEIHNACHTSWUNDER','VON LICHTERTAL')]
 for a,b,main,sub in titles:
  alpha=opacity(t,a,b)
  if alpha<.01:continue
  overlay=Image.new('RGBA',(W,H));od=ImageDraw.Draw(overlay,'RGBA')
  if a>=9:
   od.rounded_rectangle((120,58,840,190),radius=26,fill=(4,19,31,int(160*alpha)))
   center(od,main,74,43,255*alpha)
   center(od,sub,132,38,255*alpha,(243,246,227))
  else:
   od.rounded_rectangle((154,40,806,151),radius=25,fill=(5,22,32,int(150*alpha)))
   center(od,main,62,38,255*alpha)
   center(od,sub,113,23,255*alpha,(237,244,225))
  im=Image.alpha_composite(im,overlay)
 return im.convert('RGB')
def audio(path):
 rate=22050
 notes=[(.4,523.25),(2,659.25),(3.9,783.99),(6.3,987.77),(8.2,783.99),(9.6,1046.5),(11.2,1318.5)]
 with wave.open(str(path),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate)
  buffer=bytearray()
  for i in range(rate*DURATION):
   t=i/rate;value=0
   for start,f in notes:
    v=t-start
    if 0<=v<=2.7:value+=(1-math.exp(-v*20))*math.exp(-v*1.9)*(math.sin(2*math.pi*f*v)+.24*math.sin(4*math.pi*f*v))
   buffer.extend(struct.pack('<h',int(max(-1,min(1,value*.14))*32767)))
   if len(buffer)>65536:w.writeframesraw(buffer);buffer.clear()
  if buffer:w.writeframesraw(buffer)
def main():
 ROOT.mkdir(exist_ok=True,parents=True)
 poster=ROOT/'lichtertal-intro-poster.jpg'
 render(10).save(poster,quality=89,optimize=True)
 tmp=ROOT/'_intro_silent.mp4';wav=ROOT/'_intro_sound.wav'
 cmd=['ffmpeg','-nostdin','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(tmp)]
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(FPS*DURATION):p.stdin.write(render(i/FPS).tobytes())
 p.stdin.close()
 if p.wait():raise RuntimeError('Intro encoding failed')
 audio(wav)
 subprocess.run(['ffmpeg','-nostdin','-y','-hide_banner','-loglevel','error','-i',str(tmp),'-i',str(wav),'-c:v','copy','-c:a','aac','-b:a','88k','-shortest','-movflags','+faststart',str(ROOT/'lichtertal-intro.mp4')],check=True)
 tmp.unlink();wav.unlink()
if __name__=='__main__':main()
