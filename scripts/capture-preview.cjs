const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const out=path.resolve(root,process.env.UNIT101_CAPTURE_DIR||'build/preview-frames');fs.mkdirSync(out,{recursive:true});
 const options={headless:true};
 if(process.env.UNIT101_BROWSER)options.channel=process.env.UNIT101_BROWSER;
 if(process.platform==='darwin')options.args=['--use-angle=metal','--enable-gpu'];
 const browser=await chromium.launch(options);
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
 page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message)});page.on('requestfailed',r=>console.log('Request failed:',r.url(),r.failure()?.errorText));page.on('console',m=>{if(m.type()==='error')console.log('Console:',m.text())});
 await page.route('**/app.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+'\nwindow.captureTools={THREE,renderer,orbit,lighting,cutCaps,ceilings,cutPlane,plaster,doorMat,frameMat,glass,materials,ground,bathroomMirror};'});});
 await page.route('**/lighting.js',async route=>{
   const r=await route.fetch();let body=await r.text();
   body=body.replace('    setMode(mode){', `    setCaptureRoof(visible){lights.traverse(o=>{if(o.isMesh)o.visible=visible;});},
    setCaptureBlend(amount){
      ao.enabled=amount>0;ao.blendIntensity=.75*amount;lights.visible=amount>0;
      lights.traverse(o=>{if(o.isLight){o.userData.baseCaptureIntensity??=o.intensity;o.intensity=o.userData.baseCaptureIntensity*amount;}});
      scene.environmentIntensity=THREE.MathUtils.lerp(.48,.3,amount);
      sun.intensity=THREE.MathUtils.lerp(2.5,3.4,amount);
    },
    setMode(mode){`);
   await route.fulfill({response:r,body});
 });
 await page.addInitScript(()=>{window.__frames=[];window.requestAnimationFrame=cb=>(window.__frames.push(cb),window.__frames.length);window.__time=performance.now();window.__advance=ms=>{window.__time+=ms;const f=window.__frames.splice(0);for(const cb of f)cb(window.__time);};});
 console.log('Browser launched');await page.goto(process.env.UNIT101_CAPTURE_URL||'http://127.0.0.1:8080/?view=overview');
 const diagnostic=setInterval(async()=>{try{console.log('State',await page.evaluate(()=>({ready:!!window.walkthrough,capture:!!window.captureTools,loading:document.getElementById('loading')?.textContent,resourceCount:performance.getEntriesByType('resource').length})));}catch(e){console.log(e.message)}},10000);
 await page.waitForFunction(()=>!!window.captureTools,null,{timeout:180000,polling:100});
 clearInterval(diagnostic);console.log('Model ready');
 await page.addStyleTag({content:'body{height:100vh!important}header{display:none!important}main{height:100vh!important;min-height:0!important}main>*:not(#viewport){display:none!important}#viewport{visibility:visible!important}'});
 await page.waitForTimeout(250);await page.evaluate(()=>{for(let i=0;i<3;i++)__advance(16)});
 await page.evaluate(async()=>{
   const c=window.captureTools,{THREE:T,ground,renderer}=c,w=walkthrough,{scene,camera}=w;
   const root=new T.Group();root.name='Capture-only rise group';
   for(const child of scene.children.slice()){
     if(child===ground)continue;let mesh=false,light=false;child.traverse(o=>{mesh||=!!o.isMesh;light||=!!o.isLight});
     if(mesh&&!light)root.add(child);
   }
   scene.add(root);c.root=root;c.originalGround=ground.material;
   c.whiteGround=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,depthWrite:false});
   c.whiteBackdrop=new T.Mesh(ground.geometry,c.whiteGround);c.whiteBackdrop.rotation.copy(ground.rotation);c.whiteBackdrop.position.copy(ground.position);c.whiteBackdrop.position.y+=.002;scene.add(c.whiteBackdrop);
   c.texture=await new T.TextureLoader().loadAsync('./assets/source-plan.svg');c.texture.colorSpace=T.SRGBColorSpace;
   const material=new T.MeshBasicMaterial({map:c.texture,transparent:true,opacity:1,toneMapped:false,depthWrite:false,depthTest:false});
   const plane=new T.Mesh(new T.PlaneGeometry(11.591326844858322,11.759680064455839),material);
   // Draw the fading blueprint last; coplanar model surfaces must not flicker through it.
   plane.renderOrder=10000;plane.rotation.x=-Math.PI/2;plane.position.set(.030341, .02, .548658);scene.add(plane);c.plane=plane;
   c.center=new T.Vector3(.030341,0,.548658);c.top=new T.Vector3(.030341,16.7,.549658);c.overview=new T.Vector3(9,13,12);
   c.oldBackground=scene.background.clone();c.white=new T.Color(0xffffff);
   c.clipMaterials=[c.plaster,c.doorMat,c.frameMat,c.glass,c.materials.trim,c.materials.floorTile];
   c.bathroomMirror.visible=false;
   c.orbit.enabled=false;c.orbit.enableDamping=false;
   c.capMaterials=[];c.cutCaps.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=false;o.castShadow=false;c.capMaterials.push(o.material);}});
   c.flight=new T.CubicBezierCurve3(new T.Vector3(-5,12,14),new T.Vector3(-2,10,5),new T.Vector3(-.7,4.1,1.7),new T.Vector3(-1.15,1.65,.9));
   c.flight.arcLengthDivisions=1000;c.flight.updateArcLengths();
   c.flightEnd=new T.Vector3(-1.15,1.65,.9);
   c.finalLook=c.flightEnd.clone().add(new T.Vector3(0,0,-5).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(-.23,.47,0,'YXZ'))));
   c.renderRoof=visible=>{c.ceilings.visible=visible;c.lighting.setCaptureRoof(visible);scene.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;c.lighting.render({dt:1/25});};
   window.drawCapture=(stage,raw)=>{
     const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)},t=ease(raw),lerp=T.MathUtils.lerp;let roofMix=0;
     camera.up.set(0,1,0);camera.zoom=1;
     if(stage==='rise'){
       c.lighting.setMode('overview');root.visible=raw>0;root.scale.y=lerp(.12,1,t);
       c.cutPlane.constant=1.15*root.scale.y;c.cutCaps.visible=true;c.ceilings.visible=false;
       c.clipMaterials.forEach(m=>m.clippingPlanes=[c.cutPlane]);
       plane.visible=true;plane.material.opacity=1-ease(Math.min(1,raw/0.7));
       const delta=c.overview.clone().sub(c.center),theta=Math.atan2(delta.x,delta.z)*t,phi=Math.atan2(Math.hypot(delta.x,delta.z),delta.y)*t;
       const radius=lerp(c.top.distanceTo(c.center),delta.length(),t)+Math.sin(Math.PI*t)*5;
       camera.position.set(Math.sin(phi)*Math.sin(theta)*radius,Math.cos(phi)*radius,Math.sin(phi)*Math.cos(theta)*radius).add(c.center);camera.lookAt(c.center);camera.fov=43;
       c.whiteBackdrop.visible=raw<.65;c.whiteGround.opacity=1-ease(raw/.65);
       scene.background.copy(c.oldBackground).lerp(c.white,1-t);
     }else if(stage==='orbit'){
       plane.visible=false;root.scale.y=1;c.cutPlane.constant=1.15;
       const a=lerp(Math.atan2(9,12),Math.atan2(-5,14),t),r=lerp(15,Math.hypot(-5,14),t);
       camera.position.set(Math.sin(a)*r,lerp(13,12,t),Math.cos(a)*r);camera.lookAt(c.center);camera.fov=43;
     }else if(stage==='enter'){
       plane.visible=false;root.scale.y=1;
       camera.position.copy(c.flight.getPointAt(t));
       camera.lookAt(c.center.clone().lerp(c.finalLook,t));
       const viewScale=lerp(Math.tan(T.MathUtils.degToRad(43)/2),Math.tan(T.MathUtils.degToRad(65)/2),t);
       camera.fov=T.MathUtils.radToDeg(2*Math.atan(viewScale));
       c.cutPlane.constant=lerp(1.15,3.12,ease(raw/.82));
       c.cutCaps.visible=raw<.45;c.capMaterials.forEach(m=>m.opacity=1-ease((raw-.08)/.37));
       c.clipMaterials.forEach(m=>m.clippingPlanes=[c.cutPlane]);
       c.lighting.setCaptureBlend(ease((raw-.25)/.67));
       // Blend two physically rendered roof states only after the camera is inside.
       roofMix=ease((2.82-camera.position.y)/.68);c.ceilings.visible=roofMix>=1;

     }
     camera.updateProjectionMatrix();c.lighting.setCaptureRoof(c.ceilings.visible);scene.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;c.lighting.render({dt:1/25});return {roofMix,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};
   };
 });
 console.log('Capture ready');
 const cdp=await page.context().newCDPSession(page);
 const snap=async(path)=>{const r=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path,Buffer.from(r.data,'base64'));};
 const samples=process.argv.includes('--samples');const metadata=[];let index=0;
 const capture=async(stage,t,label=null)=>{
   const state=await page.evaluate(([s,t])=>drawCapture(s,t),[stage,t]);
   const name=label??String(index).padStart(4,'0');await snap(`${out}/${name}.png`);
   if(state.roofMix>0&&state.roofMix<1){await page.evaluate(()=>captureTools.renderRoof(true));await snap(`${out}/${name}-roof.png`);}
   metadata.push({index,stage,t,...state});index++;
 };
 if(samples){
   for(const [stage,t]of [['rise',0],['rise',.01],['rise',.03],['rise',.06],['rise',.1],['rise',.16],['rise',.25],['rise',.4],['rise',.6],['rise',1],['orbit',1],['enter',0],['enter',.35],['enter',.55],['enter',.7],['enter',.8],['enter',.86],['enter',.9],['enter',1]]){
     await capture(stage,t,`sample-${stage}-${t}`);console.log(stage,t);
   }
 }else{
   for(const [stage,count]of [['rise',100],['orbit',60],['enter',160]]){
     for(let i=0;i<count;i++){await capture(stage,i/(count-1));if(i%25===0)console.log('Frame',index,stage);}
   }
   // Continue the same application's genuine tour at the same capture frame rate.
   await page.evaluate(()=>{
     const w=walkthrough,c=captureTools;w.tour.restart();let ticks=0;
     while(!(w.tour.snapshot().room==='Living'&&w.tour.snapshot().phase==='hold')&&w.tour.state==='playing'&&ticks++<10000)w.tour.tick(.04);
     if(w.tour.state!=='playing')throw Error('Living tour point unavailable');
     for(let i=0;i<40;i++)w.tour.tick(.04);
     __advance(0);c.lighting.resetMotion();
   });
   for(let i=0;i<110;i++){
     const state=await page.evaluate(i=>{
       const w=walkthrough,c=captureTools;let speed=1;
       if(i>89){const u=(i-89)/20;speed=1-u*u*(3-2*u);}
       w.tour.tick(.04*speed);__advance(0);
       c.lighting.render({dt:.04});
       return {roofMix:1,position:w.camera.position.toArray(),quaternion:w.camera.quaternion.toArray(),fov:w.camera.fov,clear:w.navigable(w.getPose().position),tour:w.tour.snapshot()};
     },i);
     await snap(`${out}/${String(index).padStart(4,'0')}.png`);metadata.push({index,stage:'walk',t:i/109,...state});index++;
     if(i%25===0)console.log('Frame',index,'walk');
   }
 }
 fs.writeFileSync(out+(samples?'/samples.json':'/verification.json'),JSON.stringify({errors,fps:25,frames:metadata},null,2));await browser.close();console.log('Done',JSON.stringify({errors,frames:metadata.length}));
})().catch(e=>{console.error(e);process.exit(1)});
