import {createCameraMotionBlur} from './motion-blur.js';
import {RoomEnvironment} from './assets/addons/environments/RoomEnvironment.js';
import {EffectComposer} from './assets/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './assets/addons/postprocessing/RenderPass.js';
import {GTAOPass} from './assets/addons/postprocessing/GTAOPass.js';
import {OutputPass} from './assets/addons/postprocessing/OutputPass.js';
import {ShaderPass} from './assets/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from './assets/addons/shaders/FXAAShader.js';
import {RectAreaLightUniformsLib} from './assets/addons/lights/RectAreaLightUniformsLib.js';

export function configureLighting(THREE,scene,camera,renderer){
  RectAreaLightUniformsLib.init();
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(studio,.04).texture;
  scene.environmentIntensity=.30;studio.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#e5edff','#6b727b',.40));
  const sun=new THREE.DirectionalLight('#fff4df',3.4);
  sun.position.set(-12,10,-9);sun.target.position.set(-1,0,0);
  sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:40});
  sun.shadow.bias=-.00006;sun.shadow.normalBias=.012;sun.shadow.radius=3;
  scene.add(sun,sun.target);
  const windowLight=(x,y,z,w,h,intensity,target)=>{const l=new THREE.RectAreaLight('#e4edff',intensity,w,h);l.position.set(x,y,z);l.lookAt(...target);scene.add(l);return l};
  windowLight(-5.02,1.55,4.27,1.32,2.65,2.2,[0,1.2,4.27]);
  windowLight(-5.13,1.55,-.95,2.30,2.65,2.2,[0,1.2,-.95]);
  windowLight(-2.51,1.55,-2.32,4.30,2.65,2.2,[-2.51,1.2,3]);
  const glow=new THREE.MeshBasicMaterial({color:'#fff2dc',toneMapped:false});
  const rim=new THREE.MeshStandardMaterial({color:'#373d44',metalness:.55,roughness:.35});
  const lights=new THREE.Group();scene.add(lights);
  // Proposed recessed fittings: clear of the CAD door swings and joinery.
  for(const [x,z] of [[-2.35,-.25],[-1.3,1.75],[-2.7,4.55],[2.5,4.5],[2.5,3.25],[4.3,3.5]]){
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.048,.048,.008,24),rim);
    ring.position.set(x,2.99,z);lights.add(ring);
    const disk=new THREE.Mesh(new THREE.CircleGeometry(.036,24),glow);disk.rotation.x=Math.PI/2;disk.position.set(x,2.984,z);lights.add(disk);
    const l=new THREE.SpotLight('#fff0d9',7,5.3,1.12,.72,2);l.position.set(x,2.96,z);l.target.position.set(x,0,z);
    lights.add(l,l.target);
  }
  // Broad, low-output ceiling bounce approximates indirect illumination in enclosed rooms.
  for(const [x,z,w,d,intensity] of [[-2.5,4.5,2,1.5,1.1],[2.5,4.45,1,1.3,1],[4.1,3.7,1.3,1.3,1.2],[-1.4,.5,2,2,.45]]){
    const l=new THREE.RectAreaLight('#f5f3f0',intensity,w,d);l.position.set(x,2.96,z);l.rotation.x=-Math.PI/2;scene.add(l);
  }
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const ao=new GTAOPass(scene,camera,1,1);ao.blendIntensity=.75;
  ao.updateGtaoMaterial({radius:.24,thickness:.5,distanceExponent:1.7,distanceFallOff:1.3,scale:1,samples:16,screenSpaceRadius:false});
  ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:8,radius:5,rings:3,samples:16});
  // Transparent glazing must not become opaque geometry in the AO depth pass.
  const originalOverride=ao._overrideVisibility.bind(ao);
  ao._overrideVisibility=()=>{originalOverride();scene.traverse(o=>{if(o.isMesh&&o.visible&&(o.isReflector||o.material?.transparent||o.material?.transmission>0)){o.visible=false;ao._visibilityCache.push(o)}})};
  const motion=createCameraMotionBlur(THREE,camera,ao.depthTexture);
  composer.addPass(ao);composer.addPass(motion.pass);composer.addPass(new OutputPass());
  const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
  return {
    render({motionBlur=false,dt=1/60}={}){
      motion.prepare(motionBlur&&ao.enabled,dt);
      composer.render(dt);
      motion.commit();
    },
    resetMotion(){motion.reset()},
    get motionBlurActive(){return motion.active},
    setSize(w,h){
      const ratio=renderer.getPixelRatio();
      composer.setPixelRatio(ratio);composer.setSize(w,h);
      ao.setSize(Math.max(1,Math.round(w*ratio*.65)),Math.max(1,Math.round(h*ratio*.65)));
      motion.setSize(w*ratio,h*ratio);
      aa.material.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio));
    },
    setMode(mode){
      motion.reset();
      ao.enabled=mode==='walk';lights.visible=mode==='walk';
      scene.environmentIntensity=mode==='walk'?.3:.48;sun.intensity=mode==='walk'?3.4:2.5;
    }
  };
}
