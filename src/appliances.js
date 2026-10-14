/* Proposed Samsung product selections, placed inside the unchanged CAD slots.
 * Appearance is reconstructed from Samsung reference photographs; product sizes
 * are manufacturer specifications, while unmeasured cosmetic details are approximate.
 */
export function addSamsungAppliances(THREE, parent, overrides = {}) {
  const materials={
    enamel:new THREE.MeshPhysicalMaterial({color:0xeff0f0,roughness:.28,metalness:.03,clearcoat:.24,clearcoatRoughness:.2}),
    blackEnamel:new THREE.MeshPhysicalMaterial({color:0x2c3035,roughness:.34,metalness:.32,clearcoat:.17,clearcoatRoughness:.24,anisotropy:.28}),
    sideBlack:new THREE.MeshStandardMaterial({color:0x202326,roughness:.48,metalness:.2}),
    rubber:new THREE.MeshStandardMaterial({color:0x272b2e,roughness:.72}),
    black:new THREE.MeshPhysicalMaterial({color:0x11161b,roughness:.16,metalness:.18,clearcoat:.5}),
    metal:new THREE.MeshStandardMaterial({color:0xafb6bb,roughness:.27,metalness:.94}),
    satin:new THREE.MeshStandardMaterial({color:0xc3c8ca,roughness:.38,metalness:.9}),
    chrome:new THREE.MeshStandardMaterial({color:0xd0d5d8,roughness:.12,metalness:1}),
    inner:new THREE.MeshStandardMaterial({color:0x7c858b,roughness:.35,metalness:.82,side:THREE.DoubleSide}),
    dark:new THREE.MeshStandardMaterial({color:0x0a0d0f,roughness:.8}),
    glass:new THREE.MeshPhysicalMaterial({color:0x87959e,transparent:true,opacity:.25,roughness:.085,metalness:.1,clearcoat:1,depthWrite:false,side:THREE.DoubleSide}),
  };
  const all=new THREE.Group();all.name='Proposed Samsung appliances and refined laundry trough';parent.add(all);
  function tag(mesh,name,container){mesh.name=name;mesh.castShadow=!mesh.material.transparent;mesh.receiveShadow=true;container.add(mesh);return mesh;}
  function roundBox(w,h,d,r=.003){
    const g=new THREE.BoxGeometry(w,h,d,8,8,8),p=g.attributes.position;
    r=Math.min(r,w/2,h/2,d/2);const core=new THREE.Vector3(w/2-r,h/2-r,d/2-r),q=new THREE.Vector3(),v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.copy(v).clamp(core.clone().negate(),core);q.addScaledVector(v.sub(q).normalize(),r);p.setXYZ(i,q.x,q.y,q.z);}
    g.computeVertexNormals();return g;
  }
  function box(container,x,y,z,w,h,d,m,name,r=.003){const mesh=new THREE.Mesh(roundBox(w,h,d,r),m);mesh.position.set(x,y,z);return tag(mesh,name,container);}
  function cylinder(container,x,y,z,r,length,m,name,axis='z'){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,72),m);if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);return tag(mesh,name,container);
  }
  function torus(container,x,y,z,r,tube,m,name){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,16,96),m);mesh.position.set(x,y,z);return tag(mesh,name,container);}
  function lathe(container,profile,x,y,z,m,name){const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),96),m);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);return tag(mesh,name,container);}
  function tube(container,points,r,m,name){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return tag(new THREE.Mesh(new THREE.TubeGeometry(curve,64,r,20,false),m),name,container);}
  function label(container,x,y,z,w,h,draw,name){
    // The no-DOM branch allows geometric and collision QA without a browser.
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.max(128,Math.round(2048*h/w));
    const ctx=canvas.getContext('2d');ctx.scale(canvas.width/w,canvas.height/h);draw(ctx,w,h);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.4,metalness:.08,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    if(name.includes('digital status')){material.emissive=new THREE.Color(0x91bfd2);material.emissiveMap=texture;material.emissiveIntensity=.18;}
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);return tag(mesh,name,container);
  }
  const printedText=(ctx,text,x,y,size,color='#333a3f',align='left',weight='400')=>{ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${weight} ${size}px Arial`;ctx.fillText(text,x,y);};
  const wp=([x,y])=>[(x-6000)/1000,(21000-y)/1000];
  function productGroup(name,cadCenter,angle,meta){const g=new THREE.Group(),p=wp(cadCenter);g.name=name;g.position.set(p[0],0,p[1]);g.rotation.y=angle;g.userData={...meta,geometry:'Product dimensions verified; cosmetic details reconstructed from reference images',source:'Proposed selection, not specified by the DWG'};all.add(g);return g;}

  // Body and doors stay entirely inside the 750 × 730 mm source allocation.
  const fridge=productGroup('Samsung SRL334NMB / RB30N4020B1-SA — proposed bottom-mount refrigerator',[4292.541234098201,18750.375095940324],Math.PI,{brand:'Samsung',model:'SRL334NMB / RB30N4020B1-SA',dimensionsMm:{width:595,height:1700,depth:663},allocatedFootprintMm:{width:750,depth:730},sourceURL:'https://www.samsung.com/au/refrigerators/bottom-mount-freezer/310l-black-doi-rb30n4020b1-sa/'});
  box(fridge,0,.8625,-.021,.595,1.675,.621,materials.sideBlack,'Samsung refrigerator rounded steel cabinet',.007);
  box(fridge,0,.845,.300,.584,1.645,.014,materials.rubber,'Refrigerator continuous door gasket',.006);
  box(fridge,0,.359,.3135,.589,.674,.036,materials.blackEnamel,'Samsung lower freezer door',.007);
  box(fridge,0,1.207,.3135,.589,.982,.036,materials.blackEnamel,'Samsung upper refrigerator door',.007);
  // Recessed handle channels run along the adjacent horizontal door edges.
  box(fridge,0,.706,.298,.579,.027,.036,materials.dark,'Full-width recessed horizontal handle channel',.004);
  box(fridge,0,.695,.322,.580,.006,.016,materials.metal,'Freezer upper recessed pull lip',.002);
  box(fridge,0,.719,.320,.580,.006,.018,materials.metal,'Refrigerator lower recessed pull lip',.002);
  box(fridge,0,.031,.297,.536,.019,.025,materials.rubber,'Refrigerator recessed plinth',.002);
  for(const x of [-.222,.222])for(const z of [-.245,.242])cylinder(fridge,x,.02,z,.025,.04,materials.rubber,'Refrigerator adjustable levelling foot','y');
  label(fridge,0,1.590,.332,.34,.036,(ctx,w,h)=>printedText(ctx,'SAMSUNG',w/2,h*.68,.014,'#bfc3c5','center','700'),'Samsung refrigerator wordmark');
  label(fridge,.209,.723,.332,.095,.009,(ctx,w,h)=>printedText(ctx,'DIGITAL INVERTER',w/2,h*.74,.0055,'#626b70','center','600'),'Samsung refrigerator inset compressor badge');
  // Small visible edge gaskets give the doors physical depth without protruding.
  for(const x of [-.292,.292])box(fridge,x,.865,.291,.005,1.63,.012,materials.rubber,'Refrigerator side gasket seam',.001);

  // Slim Samsung WW80FG3M05TWSH: 480 mm cabinet, 495 mm with door; 520 mm with rear inlet hose.
  const washer=productGroup('Samsung WW80FG3M05TWSH — proposed slim front-load washer',[6827.118287442824,16069.375095940308],Math.PI/2,{brand:'Samsung',model:'WW80FG3M05TWSH',dimensionsMm:{width:600,height:850,bodyDepth:480,depthIncludingDoor:495,depthIncludingHose:520},allocatedFootprintMm:{width:600,depth:600},sourceURL:'https://www.samsung.com/hk_en/washers-and-dryers/washing-machines/ww3000fm-front-loading-grade-a-energy-efficiency-hygiene-steam-drum-clean-8kg-white-ww80fg3m05twsh/',availability:'Hong Kong model used as dimensional and visual reference; Australian installation and availability unverified'});
  // A hollow sheet-metal enclosure leaves the actual bowl and drum unobstructed.
  box(washer,-.291,.439,-.0085,.018,.802,.463,materials.enamel,'Washer left enamel side panel',.004);
  box(washer,.291,.439,-.0085,.018,.802,.463,materials.enamel,'Washer right enamel side panel',.004);
  box(washer,0,.836,0,.600,.028,.480,materials.enamel,'Washer separate overhanging top cover',.004);
  box(washer,0,.423,-.233,.568,.792,.014,materials.enamel,'Washer rear enclosure',.002);
  box(washer,0,.047,-.015,.572,.022,.45,materials.enamel,'Washer lower chassis',.003);
  for(const x of [-.244,.244])for(const z of [-.19,.18])cylinder(washer,x,.0175,z,.022,.035,materials.rubber,'Washer adjustable rubber foot','y');
  box(washer,0,.030,.202,.530,.017,.030,materials.rubber,'Washer plinth shadow',.001);
  const washerFrontAssembly=new THREE.Group();washerFrontAssembly.name='Samsung washer front, drum and controls';washerFrontAssembly.position.z=-.042;washer.add(washerFrontAssembly);
  const doorHeight=.458;
  const face=new THREE.Shape();face.moveTo(-.298,.053);face.lineTo(.298,.053);face.lineTo(.298,.822);face.lineTo(-.298,.822);face.closePath();
  const hole=new THREE.Path();hole.absarc(0,doorHeight,.231,0,Math.PI*2,true);face.holes.push(hole);
  const fg=new THREE.ExtrudeGeometry(face,{depth:.014,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0015,bevelSegments:3,curveSegments:72});
  const fmesh=new THREE.Mesh(fg,materials.enamel);fmesh.position.z=.251;tag(fmesh,'Washer formed front panel with open circular door aperture',washerFrontAssembly);
  box(washerFrontAssembly,0,.7775,.269,.594,.141,.015,materials.enamel,'Samsung separate upper control fascia',.002);
  box(washerFrontAssembly,0,.706,.266,.589,.0015,.003,materials.rubber,'Washer horizontal fascia joint',.0005);
  // Recessed rubber bellows connect the cabinet opening to the steel drum.
  lathe(washerFrontAssembly,[[.156,.027],[.160,.003],[.155,-.010],[.151,-.026],[.154,-.04],[.147,-.053],[.143,-.066],[.141,-.075]],0,doorHeight,.229,materials.rubber,'Washer folded rubber door bellows');
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(.140,.140,.284,96,1,true),materials.inner);drum.rotation.x=Math.PI/2;drum.position.set(0,doorHeight,.020);tag(drum,'Recessed stainless washing drum cylinder',washerFrontAssembly);
  cylinder(washerFrontAssembly,0,doorHeight,-.123,.140,.005,materials.satin,'Washer stainless drum rear plate');
  torus(washerFrontAssembly,0,doorHeight,.161,.138,.004,materials.chrome,'Drum polished opening lip');
  for(const r of [.047,.085,.126])torus(washerFrontAssembly,0,doorHeight,-.118,r,.003,materials.metal,'Drum rear concentric pressing');
  cylinder(washerFrontAssembly,0,doorHeight,-.116,.025,.007,materials.chrome,'Drum hub');
  // Recessed perforations are geometry instances; visible through the glass.
  const holes=new THREE.InstancedMesh(new THREE.CircleGeometry(.00145,6),materials.dark,20*64);
  const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),forward=new THREE.Vector3(0,0,1);let index=0;
  for(let row=0;row<20;row++)for(let i=0;i<64;i++){
    const a=(i+(row%2)*.5)*Math.PI/32;pos.set(Math.cos(a)*.1393,doorHeight+Math.sin(a)*.1393,-.108+row*.0135);rot.setFromUnitVectors(forward,new THREE.Vector3(-Math.cos(a),-Math.sin(a),0));matrix.compose(pos,rot,scale);holes.setMatrixAt(index++,matrix);
  }
  holes.name='1,280 modeled stainless drum perforations';washerFrontAssembly.add(holes);
  const rearPositions=[];
  for(let r=.035;r<.133;r+=.010){const n=Math.round(2*Math.PI*r/.010);for(let i=0;i<n;i++){const a=i*Math.PI*2/n;rearPositions.push([r*Math.cos(a),doorHeight+r*Math.sin(a),-.1198]);}}
  const rearHoles=new THREE.InstancedMesh(new THREE.CircleGeometry(.0013,6),materials.dark,rearPositions.length);
  rearPositions.forEach((p,i)=>{matrix.makeTranslation(...p);rearHoles.setMatrixAt(i,matrix);});rearHoles.name='Drum backplate perforations';washerFrontAssembly.add(rearHoles);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3+.24,r=.120;const b=box(washerFrontAssembly,Math.cos(a)*r,doorHeight+Math.sin(a)*r,.017,.025,.022,.24,materials.satin,'Rounded washing drum lifter',.009);b.rotation.z=a-Math.PI/2;
    for(let k=0;k<8;k++){const p=box(washerFrontAssembly,Math.cos(a)*(r-.013),doorHeight+Math.sin(a)*(r-.013),-.075+k*.026,.015,.002,.003,materials.rubber,'Drum lifter drainage slot',.001);p.rotation.z=a-Math.PI/2;}
  }
  // Wide black product door with a nested inner edge and shallow curved glazing.
  lathe(washerFrontAssembly,[[.150,-.010],[.158,-.016],[.217,-.015],[.229,-.005],[.232,.007],[.227,.018],[.214,.024],[.155,.023],[.147,.016],[.147,.002],[.150,-.010]],0,doorHeight,.273,materials.enamel,'Samsung wide white door surround with contoured profile');
  torus(washerFrontAssembly,0,doorHeight,.290,.230,.0013,materials.satin,'Washer outer door fine seam');
  lathe(washerFrontAssembly,[[0,-.023],[.040,-.020],[.08,-.011],[.12,.002],[.138,.012],[.146,.014],[.148,.009]],0,doorHeight,.274,materials.glass,'Transparent curved washer door glass');
  torus(washerFrontAssembly,0,doorHeight,.286,.150,.005,materials.black,'Samsung dark inner glazing gasket');
  box(washerFrontAssembly,.220,doorHeight+.018,.283,.016,.098,.006,materials.enamel,'Door white right-hand recessed grip',.004);
  // Service flap is a separate pressed component, with a real seam and notch.
  box(washerFrontAssembly,.182,.084,.268,.152,.104,.006,materials.rubber,'Pump filter access panel shadow seam',.006);
  box(washerFrontAssembly,.182,.084,.271,.148,.100,.006,materials.enamel,'Pump filter access panel',.005);
  box(washerFrontAssembly,.182,.133,.275,.017,.002,.0015,materials.rubber,'Pump flap opening notch',.0005);

  // Controls transcribed from Samsung's product front image, rather than a generic dial.
  cylinder(washerFrontAssembly,0,.780,.281,.031,.020,materials.satin,'Samsung centered program selector dial');
  cylinder(washerFrontAssembly,0,.780,.292,.028,.002,materials.enamel,'Samsung selector dial face');
  box(washerFrontAssembly,0,.802,.294,.002,.006,.001,materials.rubber,'Washer selector index',.0004);
  box(washerFrontAssembly,.174,.779,.279,.180,.084,.002,materials.black,'Samsung smoked control display',.002);
  box(washerFrontAssembly,-.184,.779,.275,.132,.059,.004,materials.enamel,'Washer detergent drawer front',.002);
  box(washerFrontAssembly,-.184,.776,.279,.120,.034,.002,materials.rubber,'Washer detergent drawer recessed handle opening',.001);
  box(washerFrontAssembly,-.184,.787,.282,.113,.006,.003,materials.enamel,'Washer detergent drawer recessed grip lip',.001);
  label(washerFrontAssembly,0,.780,.281,.576,.133,(ctx,w,h)=>{
    printedText(ctx,'SAMSUNG',.012,.026,.007,'#3d4246','left','700');
    printedText(ctx,'8 kg',.566,.026,.0055,'#5d656b','right');
    const left=['Cotton','E Cotton','Synthetics','Mixed Load','Wool/Delicates','Hygiene Steam'];
    const right=['Quick Wash 15′','Colors','Rinse + Spin','Drain/Spin','Drum Clean','Bedding (Steam)'];
    left.forEach((t,i)=>printedText(ctx,t,.251,.035+i*.012,.0042,'#4d5459','right'));
    right.forEach((t,i)=>printedText(ctx,t,.325,.035+i*.012,.0042,'#4d5459','left'));
  },'Samsung washer printed brand and verified cycle legends');
  label(washerFrontAssembly,.174,.779,.281,.174,.080,(ctx,w,h)=>{
    printedText(ctx,'1:15',.047,.032,.019,'#b8d2d8','center','400');
    printedText(ctx,'40°   1400',.017,.049,.0055,'#b8d2d8');
    printedText(ctx,'Temp.    Spin    Options    Delay End',w/2,.069,.0044,'#bbc0c4','center');
    printedText(ctx,'⏻',.146,.024,.012,'#b8c7ce','center');printedText(ctx,'▷Ⅱ',.146,.049,.009,'#b8c7ce','center');
  },'Washer digital status screen and touch keys');
  // Rear inlet and hose keep the manufacturer's full 520 mm service depth.
  tube(washer,[[.195,.716,-.236],[.196,.716,-.253],[.20,.704,-.258]],.007,materials.rubber,'Washer rear inlet hose within manufacturer depth');

  // Laundry trough: a continuous hollow cabinet meets the metal rim at 870 mm.
  const trough=productGroup('Laundry trough — continuous cabinet and rolled stainless rim',[6782.118287442824,15489.375095940313],Math.PI/2,{dimensionsMm:{width:500,depth:600,height:875},source:'CAD allocated footprint; proposed cabinet and stainless finish'});
  const steel=materials.satin;
  box(trough,-.240,.458,0,.016,.810,.594,materials.enamel,'Laundry trough left cabinet side',.002);
  box(trough,.240,.458,0,.016,.810,.594,materials.enamel,'Laundry trough right cabinet side',.002);
  box(trough,0,.458,-.289,.467,.810,.016,materials.enamel,'Laundry trough rear cabinet panel',.002);
  box(trough,0,.066,-.01,.468,.023,.558,materials.enamel,'Laundry trough bottom shelf',.002);
  box(trough,0,.846,.277,.468,.051,.031,materials.enamel,'Laundry trough top rail directly supporting steel rim',.002);
  box(trough,0,.4665,.288,.482,.799,.016,materials.enamel,'Laundry trough fitted front door — continuous up to rim',.002);
  box(trough,0,.036,-.014,.438,.066,.513,materials.rubber,'Laundry trough recessed toe kick',.002);
  for(const x of [-.057,.057])box(trough,x,.790,.298,.009,.016,.004,materials.black,'Trough pull bracket',.002);
  box(trough,0,.790,.297,.126,.011,.006,materials.black,'Laundry trough slim solid pull',.003);
  const ring=(w,d,r)=>{
    const pts=[];for(const [x,z,a] of [[w/2-r,-d/2+r,-Math.PI/2],[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI]])for(let i=0;i<=16;i++){const t=a+i*Math.PI/32;pts.push([x+r*Math.cos(t),z+r*Math.sin(t)]);}return pts;
  };
  function loftLocal(loops,m,name){const vertices=[],indices=[],n=loops[0].points.length;for(const loop of loops)for(const p of loop.points)vertices.push(p[0],loop.y,p[1]);for(let j=0;j<loops.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=b+n,d=a+n;indices.push(a,d,b,b,d,c);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const material=m.clone();material.side=THREE.DoubleSide;return tag(new THREE.Mesh(g,material),name,trough);}
  const outer=ring(.5,.6,.010),outerInset=ring(.493,.593,.012),inner=ring(.420,.522,.029);
  loftLocal([{points:outerInset,y:.854},{points:outer,y:.860},{points:outer,y:.870},{points:outerInset,y:.875},{points:inner,y:.875}],steel,'Continuous rolled stainless trough rim — cabinet junction closed');
  const bowlLoops=[{points:inner,y:.875}];
  for(const [depth,scale] of [[.005,.995],[.014,.978],[.03,.952],[.07,.900],[.11,.850],[.15,.788],[.171,.735],[.177,.71]])bowlLoops.push({points:inner.map(p=>[p[0]*scale,p[1]*scale]),y:.875-depth});
  loftLocal(bowlLoops,steel,'Pressed stainless bowl with rounded corners and curved base');
  const floor=new THREE.Shape();const bottom=inner.map(p=>[p[0]*.71,p[1]*.71]);bottom.forEach((p,i)=>i?floor.lineTo(p[0],p[1]):floor.moveTo(p[0],p[1]));floor.closePath();
  const basinFloor=new THREE.Mesh(new THREE.ShapeGeometry(floor),steel);basinFloor.rotation.x=-Math.PI/2;basinFloor.position.y=.698;tag(basinFloor,'Laundry trough recessed basin floor',trough);
  cylinder(trough,0,.700,0,.026,.003,materials.chrome,'Stainless trough strainer ring','y');
  cylinder(trough,0,.702,0,.020,.002,materials.satin,'Stainless trough drain strainer','y');
  for(let row=1;row<=2;row++)for(let i=0;i<row*7;i++){const a=i*Math.PI*2/(row*7);cylinder(trough,Math.cos(a)*row*.007,.7035,Math.sin(a)*row*.007,.0015,.0004,materials.dark,'Trough drain perforation','y');}
  // Preserve the source tap mounting point, translated into this local frame.
  const tx=(15290.424279005556-15489.375095940313)/1000,tz=(6533.06910437753-6782.118287442824)/1000;
  cylinder(trough,tx,.880,tz,.026,.010,materials.chrome,'Mixer mounting flange seated on steel rim','y');
  const spoutDir=new THREE.Vector2(.70,.714);const p=(reach,y)=>[tx+reach*spoutDir.x,y,tz+reach*spoutDir.y];
  cylinder(trough,tx,.946,tz,.019,.126,materials.chrome,'Laundry mixer solid cartridge body','y');
  tube(trough,[p(0,.985),p(0,1.066),p(.020,1.116),p(.065,1.142),p(.112,1.128),p(.140,1.074)],.0105,materials.chrome,'Smooth twenty-sided chrome gooseneck');
  const end=p(.140,1.070);cylinder(trough,end[0],end[1],end[2],.012,.015,materials.chrome,'Mixer threaded aerator','y');cylinder(trough,end[0],end[1]-.008,end[2],.009,.0015,materials.dark,'Mixer recessed aerator mesh','y');
  cylinder(trough,tx-.024,.947,tz,.009,.060,materials.chrome,'Mixer side lever body','y');
  tube(trough,[[tx-.024,.973,tz],[tx-.030,.975,tz+.028],[tx-.045,.983,tz+.055]],.004,materials.chrome,'Laundry mixer polished lever');
  return {group:all,fridge,washer,trough};
}
