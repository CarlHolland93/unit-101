from PIL import Image
from pathlib import Path
import json,math,argparse
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="Assemble the captured Unit 101 transformation into plain GIFs.")
parser.add_argument("--frames",type=Path,default=ROOT/"build/preview-frames")
parser.add_argument("--output",type=Path,default=ROOT/"media/unit-101.gif")
args=parser.parse_args()
root=args.frames;meta=json.loads((root/'verification.json').read_text());size=(640,426)
def load(path):return Image.open(path).convert('RGB').resize(size,Image.Resampling.LANCZOS)
frames=[];durations=[]
for record in meta['frames']:
 name=f"{record['index']:04d}"
 im=load(root/(name+'.png'));weight=record['roofMix']
 if 0<weight<1:im=Image.blend(im,load(root/(name+'-roof.png')),weight)
 frames.append(im);durations.append(40)
durations[0]=1200;durations[-1]=360
a,b=frames[-1],frames[0]
for i in range(1,31):
 t=i/30;t=t*t*t*(t*(t*6-15)+10)
 frames.append(Image.blend(a,b,t));durations.append(40)
indices=list(range(0,len(frames),max(1,len(frames)//28)))
sheet=Image.new('RGB',(size[0],size[1]*len(indices)))
for n,i in enumerate(indices):sheet.paste(frames[i],(0,n*size[1]))
palette=sheet.quantize(colors=128,method=Image.Quantize.MEDIANCUT)
q=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
out=args.output;out.parent.mkdir(parents=True,exist_ok=True)
q[0].save(out,save_all=True,append_images=q[1:],duration=durations,loop=0,optimize=True,disposal=1)
with Image.open(out) as gif:
 total=0;encoded=gif.n_frames
 for n in range(encoded):gif.seek(n);total+=gif.info['duration']
 assert gif.size==size and gif.info['loop']==0
# Spatial continuity checks at the overview / entry / eye-level joins.
def angular(a,b):return math.degrees(2*math.acos(min(1,abs(sum(x*y for x,y in zip(a,b))))))
joins=[]
for i in (100,160,320):
 a,b=meta['frames'][i-1:i+1]
 joins.append({'join':a['stage']+' → '+b['stage'],'position_delta_m':math.dist(a['position'],b['position']),'angle_delta_deg':angular(a['quaternion'],b['quaternion']),'fov_delta_deg':abs(a['fov']-b['fov'])})
entry=[r for r in meta['frames'] if r['stage']=='enter']
metrics={'file':str(out),'dimensions':size,'source_frames':len(frames),'encoded_frames':encoded,'fps':25,'duration_ms':total,'bytes':out.stat().st_size,'loop':0,'scene_errors':meta['errors'],'walk_clear':all(r['clear'] for r in meta['frames'] if r['stage']=='walk'),'joins':joins,'entry_max_step_m':max(math.dist(a['position'],b['position']) for a,b in zip(entry,entry[1:])),'entry_max_rotation_deg':max(angular(a['quaternion'],b['quaternion']) for a,b in zip(entry,entry[1:]))}
assert not metrics['scene_errors'] and metrics['walk_clear']
assert all(j['position_delta_m']<.0001 and j['angle_delta_deg']<.001 and j['fov_delta_deg']<.0001 for j in joins)
(root/'gif-verification.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))
# Review the exported palette at representative frames, particularly around the ceiling blend.
contact=Image.new('RGB',(640*3,426*4))
picks=[0,50,99,159,190,225,255,280,299,319,365,420]
for n,i in enumerate(picks):contact.paste(q[i].convert('RGB'),((n%3)*640,(n//3)*426))
contact.save(root/'contact-sheet.png')

# A smaller preview keeps the repository README lighter while retaining 25 fps.
small_size=(448,298)
small=[im.resize(small_size,Image.Resampling.LANCZOS) for im in frames]
small_sheet=Image.new('RGB',(small_size[0],small_size[1]*len(indices)))
for n,i in enumerate(indices):small_sheet.paste(small[i],(0,n*small_size[1]))
small_palette=small_sheet.quantize(colors=64,method=Image.Quantize.MEDIANCUT)
small_q=[im.quantize(palette=small_palette,dither=Image.Dither.NONE) for im in small]
preview=out.with_name('unit-101-preview.gif')
small_q[0].save(preview,save_all=True,append_images=small_q[1:],duration=durations,loop=0,optimize=True,disposal=1)
print(json.dumps({'preview':str(preview),'bytes':preview.stat().st_size}))
