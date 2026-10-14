// Screen controls anchored to measured positions in the model. No CAD geometry changes.
export function crossesWall(a,b,segments){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  for(const [c,d] of segments){
    const ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex;
    if(Math.abs(den)<1e-9)continue;
    const cx=c[0]-a[0],cz=c[1]-a[1],t=(cx*ez-cz*ex)/den,u=(cx*dz-cz*dx)/den;
    if(t>.008&&t<.985&&u>=0&&u<=1)return true;
  }
  return false;
}
export function createSceneInteractions({THREE,camera,host,layer,toggle,rooms,world,closestClear,wallSegments,getState,onRoom,onInspect}){
  document.body.classList.add('points-enabled');
  let enabled=true,lastVisibility=-Infinity,activeButton=null,visibleIds=[];
  const projected=new THREE.Vector3(),viewPoint=new THREE.Vector3();
  const dialog=document.createElement('dialog');dialog.id='feature-dialog';dialog.setAttribute('aria-labelledby','feature-title');
  dialog.innerHTML='<div class="dialog-header"><span class="eyebrow">IN THIS SPACE</span><button aria-label="Close feature details">×</button></div><h2 id="feature-title"></h2><p class="feature-summary"></p><dl class="feature-facts"></dl><p class="feature-note"></p><div class="feature-actions"><a target="_blank" rel="noopener">View Samsung reference ↗</a><button class="feature-close">Continue exploring</button></div>';
  document.body.appendChild(dialog);
  const close=()=>dialog.close();dialog.querySelector('.dialog-header button').onclick=close;dialog.querySelector('.feature-close').onclick=close;
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{if(activeButton&&!activeButton.hidden)activeButton.focus({preventScroll:true});});
  const features=[
    {id:'seating',label:'Seating',title:'Living-room upholstery',anchor:[-1.45,.73,-1.62],room:'living',summary:'Soft grey upholstery with shaped cushions, tailored seams and dark legs.',facts:[['Footprint','Two sofas, each 1600 × 730 mm, placed as drawn.'],['Finish','Cool grey woven fabric with a subtle sheen.']],note:'Furniture design and heights are proposed. The floor plan defines the position and footprint.'},
    {id:'kitchen',label:'Kitchen finishes',title:'Kitchen finishes',anchor:[-2.55,.94,2.32],room:'kitchen',summary:'Pale timber joinery, grey stone surfaces and dark accents.',facts:[['Joinery','Pale timber fronts with recessed dark pulls.'],['Worktop','Grey stone with a matching splashback.']],note:'Proposed finish scheme. Joinery elevations and a finish schedule are needed for specification.'},
    {id:'fridge',label:'Samsung fridge',title:'Samsung bottom-mount fridge',anchor:[-1.995,1.35,1.907],room:'kitchen',summary:'SRL334NMB / RB30N4020B1-SA in matte black.',facts:[['Dimensions','595 W × 1700 H × 663 D mm.'],['Model detail','Separate freezer, recessed handles and a brushed dark finish.']],note:'Custom visual reconstruction from Samsung dimensions and photographs. Installation clearances remain to be verified.',href:'https://www.samsung.com/au/refrigerators/bottom-mount-freezer/310l-black-doi-rb30n4020b1-sa/'},
    {id:'washer',label:'Samsung washer',title:'Samsung slim front-load washer',anchor:[1.092,.64,4.93],room:'laundry',summary:'WW80FG3M05TWSH with a recessed glass door and visible drum.',facts:[['Dimensions','600 W × 850 H mm; body 480 mm deep.'],['Overall depth','495 mm including the door; 520 mm including the inlet hose.']],note:'Custom visual reconstruction. This is a Hong Kong product reference; Australian availability and installation requirements are unverified.',href:'https://www.samsung.com/hk_en/washers-and-dryers/washing-machines/ww3000fm-front-loading-grade-a-energy-efficiency-hygiene-steam-drum-clean-8kg-white-ww80fg3m05twsh/'},
    {id:'laundry-sink',label:'Laundry sink',title:'Laundry trough and cabinet',anchor:[.95,.88,5.49],room:'laundry',summary:'A rolled stainless-steel rim over continuous cabinetry.',facts:[['Layout','Sink and washer footprints follow the original drawing.'],['Detail','Recessed bowl, drain, curved tap and a continuous cabinet-to-rim junction.']],note:'Tap, cabinet and sink elevations are illustrative.'},
    {id:'bathroom',label:'Bathroom finishes',title:'Bathroom finishes',anchor:[4.48,1.15,2.38],room:'bathroom',summary:'Grey stone tiles, clear shower glazing and polished fittings.',facts:[['Glazing','Clear glass that transmits light.'],['Mirror','Reflects the actual apartment from your viewpoint.']],note:'Material choices, fittings and their vertical dimensions are proposed.'},
    {id:'bedroom',label:'Bedroom finishes',title:'Bedroom finishes',anchor:[-2.48,.65,4.40],room:'bedroom',summary:'Pale timber, soft grey textiles and matching bedside joinery.',facts:[['Furniture','Bed and bedside positions follow the DWG.'],['Palette','Pale timber and layered neutral fabric.']],note:'Furniture elevations and styling are illustrative; ceiling height remains the approved provisional 3.0 m.'}
  ];
  const items=[...rooms.map(r=>{const p=closestClear(world(r.p))||world(r.p);return {id:'room-'+r.id,type:'room',label:r.name,room:r,anchor:[p[0],.75,p[1]]}}),...features.map(f=>({...f,type:'feature'}))];
  function showFeature(item,button){
    onInspect();activeButton=button;
    dialog.querySelector('h2').textContent=item.title;dialog.querySelector('.feature-summary').textContent=item.summary;
    const facts=dialog.querySelector('dl');facts.replaceChildren();for(const [label,value]of item.facts){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;facts.append(dt,dd);}
    dialog.querySelector('.feature-note').textContent=item.note;const a=dialog.querySelector('a');a.hidden=!item.href;if(item.href)a.href=item.href;else a.removeAttribute('href');dialog.showModal();
  }
  for(const item of items){
    const b=document.createElement('button');b.className='scene-point '+item.type;b.dataset.point=item.id;b.hidden=true;
    b.setAttribute('aria-label',item.type==='room'?'Go to '+item.label:'Inspect '+item.label);
    const icon=document.createElement('span'),label=document.createElement('span');icon.className='point-icon';icon.setAttribute('aria-hidden','true');icon.textContent=item.type==='room'?'↗':'+';label.textContent=item.label;b.append(icon,label);
    b.addEventListener('click',()=>item.type==='room'?onRoom(item.room):showFeature(item,b));layer.append(b);item.button=b;
  }
  toggle.onclick=()=>{enabled=!enabled;document.body.classList.toggle('points-enabled',enabled);toggle.textContent=enabled?'Points on':'Points off';toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Hide interactive points':'Show interactive points');lastVisibility=-Infinity;update(performance.now());};
  function update(now=performance.now()){
    const state=getState(),show=enabled&&state.mode!=='plan'&&state.tourState!=='playing';layer.hidden=!show;
    if(!show){visibleIds=[];for(const item of items)item.button.hidden=true;return;}
    camera.updateMatrixWorld();const rect=host.getBoundingClientRect(),visibilityDue=now-lastVisibility>150,placed=[];
    let exclusions=[];if(visibilityDue){lastVisibility=now;for(const selector of ['.room-panel','.map-wrap','.tour-bar','.journey-bar','.bottomline','.topline','#touch-controls .pad','#touch-controls .turn-pad']){const e=document.querySelector(selector);if(e&&e.getClientRects().length){const r=e.getBoundingClientRect();exclusions.push({left:r.left-rect.left,top:r.top-rect.top,right:r.right-rect.left,bottom:r.bottom-rect.top});}}}
    visibleIds=[];
    // Room markers get first choice of space. Detail points never cover them.
    for(const item of items){
      const b=item.button;projected.set(...item.anchor);viewPoint.copy(projected).applyMatrix4(camera.matrixWorldInverse);projected.project(camera);
      const dist=Math.hypot(item.anchor[0]-camera.position.x,item.anchor[2]-camera.position.z),x=(projected.x*.5+.5)*rect.width,y=(-projected.y*.5+.5)*rect.height;
      let visible=viewPoint.z<-.1&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.98&&Math.abs(projected.y)<.96;
      if(state.mode==='walk')visible&&=dist>(item.type==='room'?.8:.30)&&dist<(item.type==='room'?6.5:4.2);
      if(item.type==='feature')visible&&=state.mode==='walk'&&state.furnitureVisible;
      if(visibilityDue){item.occluded=state.mode==='walk'&&crossesWall([camera.position.x,camera.position.z],[item.anchor[0],item.anchor[2]],wallSegments);}
      visible&&=!item.occluded||state.mode==='overview';
      const width=Math.min(180,52+item.label.length*6.2),bounds={left:x-width/2,right:x+width/2,top:y-22,bottom:y+22};
      const overlap=r=>bounds.left<r.right+7&&bounds.right>r.left-7&&bounds.top<r.bottom+7&&bounds.bottom>r.top-7;
      if(visibilityDue)item.uiBlocked=exclusions.some(overlap);
      visible&&=!item.uiBlocked&&!placed.some(overlap)&&bounds.left>8&&bounds.right<rect.width-8;
      b.hidden=!visible;if(visible){b.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;placed.push(bounds);visibleIds.push(item.id);}
    }
  }
  return {update,dialog,items,get visibleIds(){return visibleIds.slice()},get enabled(){return enabled}};
}
