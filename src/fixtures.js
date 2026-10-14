import { addSamsungAppliances } from './appliances.js';
/*
 * Unit 101 fixture model, traced from the supplied DWG, not a generic layout.
 * All horizontal positions below are source CAD millimetres. Heights/materials
 * are neutral visual assumptions, except storage explicitly named S3_2400H.
 * Symbolic cabinet/door swing arcs do not form furniture collision volumes.
 * The dining family name says 1200 Diameter, but its actual arcs are R450.
 */
export function addFixtures(THREE, scene, data, helpers = {}) {
  const group = new THREE.Group();
  group.name = 'Furniture and fixtures — CAD footprints; illustrative heights';
  scene.add(group);
  const colliders = [];
  const flat=data?.flat||data;
  let count = 0;
  const mat = (color, roughness = 0.78, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const M = {
    joinery: mat(0xc7cacf), trim: mat(0xe4e6e7), recess: mat(0x33383c),
    fabric: mat(0xa7aeb3), cushion: mat(0xc4cbd0), bed: mat(0xeceff0),
    blanket: mat(0x7e8d97), rug: mat(0xb0b4b7), wood: mat(0xcfbea2),
    stone: mat(0x969fa7, 0.4), ceramic: mat(0xf2f4f4, 0.18),
    basin: mat(0xb7bfc0, 0.3, 0.45), chrome: mat(0x90999b, 0.2, 0.8),
    screen: mat(0x242b2e, 0.3), black: mat(0x3a4040, 0.5),
    mirror: mat(0xaabac0, 0.08, 0.8), water: mat(0x75878b, 0.22, 0.25),
    glass: new THREE.MeshPhysicalMaterial({color:0xb9d1d5, transparent:true, opacity:0.23, roughness:0.1, metalness:0, depthWrite:false, side:THREE.DoubleSide})
  };
  Object.assign(M,helpers.materials||{});
  const seamMaterial=M.fabric.clone();seamMaterial.color.multiplyScalar(.74);
  const bedSeamMaterial=M.bed.clone();bedSeamMaterial.color.multiplyScalar(.86);
  // UVs are measured in metres, so every material keeps a consistent real scale.
  function metricUV(geometry){
    if(!geometry.attributes.normal)geometry.computeVertexNormals();
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
    geometry.computeBoundingBox();const lo=geometry.boundingBox.min;
    for(let i=0;i<p.count;i++){
      const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
      const x=p.getX(i)-lo.x,y=p.getY(i)-lo.y,z=p.getZ(i)-lo.z;
      if(ay>=ax&&ay>=az){uv[i*2]=x;uv[i*2+1]=z;}
      else if(ax>=az){uv[i*2]=z;uv[i*2+1]=y;}
      else{uv[i*2]=x;uv[i*2+1]=y;}
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
  }
  const wp = ([x,y]) => [(x-6000)/1000,(21000-y)/1000];
  const rect = (x0,y0,x1,y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  function roundedRect(x0,y0,x1,y1,r){
    const out=[];
    for(const [cx,cy,start] of [[x1-r,y0+r,-Math.PI/2],[x1-r,y1-r,0],[x0+r,y1-r,Math.PI/2],[x0+r,y0+r,Math.PI]])
      for(let i=0;i<=8;i++){const a=start+i*Math.PI/16;out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
    return out;
  }
  const transform = (p, pose) => {
    const c=Math.cos(pose[2]||0), s=Math.sin(pose[2]||0);
    return [pose[0]+c*p[0]-s*p[1],pose[1]+s*p[0]+c*p[1]];
  };
  const transformPoints = (points,pose) => points.map(p=>transform(p,pose));
  function tag(mesh,name) {
    const material=mesh.material;
    const translucent=Array.isArray(material)?material.some(m=>m.transparent||m.transmission>0):material?.transparent||material?.transmission>0;
    mesh.name=name; mesh.castShadow=!translucent; mesh.receiveShadow=true;
    mesh.userData.source='the supplied floor plan';
    mesh.userData.verticalGeometry='Illustrative unless stated in source block name';
    group.add(mesh); return mesh;
  }
  // Rounded-box construction uses a subdivided unit cube and displaces each
  // corner INWARD from the measured envelope; no bevel grows a CAD footprint.
  function roundGeometry(w,h,d,r,segments=4,crown=0){
    r=Math.max(.0001,Math.min(r,w/2,h/2,d/2));
    const divisions=segments*2+1,g=new THREE.BoxGeometry(1,1,1,divisions,divisions,divisions).toNonIndexed();
    const p=g.attributes.position,n=g.attributes.normal,half=.5/divisions,v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      const sx=Math.sign(p.getX(i)),sy=Math.sign(p.getY(i)),sz=Math.sign(p.getZ(i));
      v.set(p.getX(i)-sx*half,p.getY(i)-sy*half,p.getZ(i)-sz*half).normalize();
      let x=sx*(w/2-r)+v.x*r,y=sy*(h/2-r)+v.y*r,z=sz*(d/2-r)+v.z*r;
      if(crown&&sy>0){
        const fall=Math.pow(Math.max(0,1-Math.pow(x/(w/2),2)),.65)*Math.pow(Math.max(0,1-Math.pow(z/(d/2),2)),.65);
        const wrinkle=.0018*Math.sin(x*43+z*13)*Math.cos(z*37)*Math.pow(1-fall,2);
        y+=crown*fall+wrinkle*fall;
      }
      p.setXYZ(i,x,y,z);n.setXYZ(i,v.x,v.y,v.z);
    }
    if(crown)g.computeVertexNormals();
    return metricUV(g);
  }
  function roundLocal(pose,x0,y0,x1,y1,h,b,m,n,r=.006,crown=0){
    const w=Math.abs(x1-x0)/1000,d=Math.abs(y1-y0)/1000;
    const mesh=new THREE.Mesh(roundGeometry(w,h,d,r,4,crown),m);
    const c=wp(transform([(x0+x1)/2,(y0+y1)/2],pose));
    mesh.position.set(c[0],b+h/2,c[1]);mesh.rotation.y=pose[2]||0;
    return tag(mesh,n);
  }
  function prism(points,height,base,material,name='Fixture',holes=[]) {
    const shape=new THREE.Shape();
    points.forEach((p,i)=>{const [x,z]=wp(p);i?shape.lineTo(x,-z):shape.moveTo(x,-z);});
    shape.closePath();
    for(const ring of holes){
      const hole=new THREE.Path();
      ring.forEach((p,i)=>{const [x,z]=wp(p);i?hole.lineTo(x,-z):hole.moveTo(x,-z);});
      hole.closePath();shape.holes.push(hole);
    }
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:24});
    geometry.rotateX(-Math.PI/2);metricUV(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.y=base;
    return tag(mesh,name);
  }
  const radiusFor=m=>[M.fabric,M.cushion,M.bed,M.blanket].includes(m)?.047:m===M.ceramic?.012:.003;
  const block=(x0,y0,x1,y1,h,b,m,n)=>roundLocal([0,0,0],x0,y0,x1,y1,h,b,m,n,radiusFor(m));
  const localBlock=(pose,x0,y0,x1,y1,h,b,m,n)=>roundLocal(pose,x0,y0,x1,y1,h,b,m,n,radiusFor(m));
  function collider(points,name){colliders.push({points:points.map(wp),name});count++;}
  const localCollider=(pose,x0,y0,x1,y1,name)=>collider(transformPoints(rect(x0,y0,x1,y1),pose),name);
  function disc(x,y,r,h,b,m,name,segments=64){
    const rr=r/1000,edge=Math.min(.004,h/3,rr/4);
    const profile=[new THREE.Vector2(0,0),new THREE.Vector2(rr-edge,0),new THREE.Vector2(rr-edge*.3,edge*.3),new THREE.Vector2(rr,edge),new THREE.Vector2(rr,h-edge),new THREE.Vector2(rr-edge*.3,h-edge*.3),new THREE.Vector2(rr-edge,h),new THREE.Vector2(0,h)];
    const geometry=new THREE.LatheGeometry(profile,segments);geometry.translate(0,-h/2,0);metricUV(geometry);
    const mesh=new THREE.Mesh(geometry,m);
    const [wx,wz]=wp([x,y]);mesh.position.set(wx,b+h/2,wz);return tag(mesh,name);
  }
  function circleCollider(x,y,r,name){collider(Array.from({length:48},(_,i)=>[x+r*Math.cos(i*Math.PI/24),y+r*Math.sin(i*Math.PI/24)]),name);}
  function rod(a,b,r,material,name){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(metricUV(new THREE.CylinderGeometry(r,r,delta.length(),12)),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return tag(mesh,name);
  }
  function cadRod(x1,y1,h1,x2,y2,h2,r,material,name){
    const a=wp([x1,y1]),b=wp([x2,y2]);return rod([a[0],h1,a[1]],[b[0],h2,b[1]],r,material,name);
  }
  function pipeCAD(points,r,material,name,closed=false){
    const pts=points.map(([x,y,h])=>{const p=wp([x,y]);return new THREE.Vector3(p[0],h,p[1]);});
    const curve=new THREE.CatmullRomCurve3(pts,closed,'centripetal');
    return tag(new THREE.Mesh(metricUV(new THREE.TubeGeometry(curve,Math.max(24,pts.length*3),r,8,closed)),material),name);
  }
  function piping(pose,x0,y0,x1,y1,height,r,material,name){
    const points=roundedRect(x0+3,y0+3,x1-3,y1-3,r).map(p=>[...transform(p,pose),height]);
    return pipeCAD(points,.0017,material,name,true);
  }
  function cushion(pose,x0,y0,x1,y1,h,b,m,name,crown=.025){
    const w=(x1-x0)/1000,d=(y1-y0)/1000,r=Math.min(h*.43,.065,w*.22,d*.22);
    const geometry=new THREE.BoxGeometry(w,h,d,26,10,26),p=geometry.attributes.position;
    const core=new THREE.Vector3(w/2-r,h/2-r,d/2-r),q=new THREE.Vector3(),v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);q.copy(v).clamp(core.clone().negate(),core);const dir=v.clone().sub(q).normalize();q.addScaledVector(dir,r);
      const fall=Math.pow(Math.max(0,1-Math.pow(q.x/(w/2),2)),.72)*Math.pow(Math.max(0,1-Math.pow(q.z/(d/2),2)),.72);
      if(q.y>0)q.y+=crown*fall+.002*Math.sin(q.x*39+q.z*11)*Math.cos(q.z*31)*fall*(1-fall);
      p.setXYZ(i,q.x,q.y,q.z);
    }
    geometry.computeVertexNormals();metricUV(geometry);
    const mesh=new THREE.Mesh(geometry,m),center=wp(transform([(x0+x1)/2,(y0+y1)/2],pose));
    mesh.position.set(center[0],b+h/2,center[1]);mesh.rotation.y=pose[2]||0;tag(mesh,name);
    piping(pose,x0,y0,x1,y1,b+h*.49,Math.min(42,(x1-x0)*.12,(y1-y0)*.12),m===M.bed?bedSeamMaterial:seamMaterial,name+' welt seam');
    return mesh;
  }
  function loft(loops,material,name){
    const vertices=[],indices=[],N=loops[0].points.length;
    for(const loop of loops)for(const p of loop.points){const q=wp(p);vertices.push(q[0],loop.height,q[1]);}
    for(let k=0;k<loops.length-1;k++)for(let i=0;i<N;i++){let a=k*N+i,b=k*N+(i+1)%N,c=b+N,d=a+N;indices.push(a,d,b,b,d,c);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();metricUV(g);
    const m=material.clone();m.side=THREE.DoubleSide;return tag(new THREE.Mesh(g,m),name);
  }
  function recessedBowl(outer,innerBounds,top,depth,material,name,innerRing=null){
    const [x0,y0,x1,y1]=innerBounds,inner=innerRing||roundedRect(x0,y0,x1,y1,Math.min(24,(x1-x0)*.15)),cx=(x0+x1)/2,cy=(y0+y1)/2;
    prism(outer,.014,top-.014,material,name+' rim',[inner]);
    const scale=(points,s)=>points.map(([x,y])=>[cx+(x-cx)*s,cy+(y-cy)*s]);
    loft([{points:inner,height:top},{points:scale(inner,.98),height:top-.022},{points:scale(inner,.77),height:top-depth+.022},{points:scale(inner,.70),height:top-depth}],material,name+' recessed bowl');
    prism(scale(inner,.70),.008,top-depth-.008,material,name+' basin floor');
    disc(cx,cy,17,.003,top-depth+.003,M.chrome,name+' drain');
    disc(cx,cy,6,.001,top-depth+.006,M.recess,name+' drain opening');
  }
  function mixer(x,y,base,turn=0,name='Mixer'){
    const pose=[x,y,turn],to=(a,b,h)=>[...transform([a,b],pose),h];
    disc(x,y,26,.008,base,M.chrome,name+' mounting ring');
    pipeCAD([to(0,0,base+.004),to(0,0,base+.18),to(0,17,base+.23),to(0,55,base+.25),to(0,104,base+.232),to(0,126,base+.18)],.0105,M.chrome,name+' curved spout');
    const a=transform([21,0],pose),b=transform([21,40],pose);
    cadRod(a[0],a[1],base+.06,a[0],a[1],base+.13,.011,M.chrome,name+' lever body');
    cadRod(a[0],a[1],base+.13,b[0],b[1],base+.13,.005,M.chrome,name+' control lever');
  }
  function glassPanel(a,b,height,base=0){
    const [ax,az]=wp(a),[bx,bz]=wp(b),dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(l,height,.01),M.glass);
    mesh.position.set((ax+bx)/2,base+height/2,(az+bz)/2);mesh.rotation.y=-Math.atan2(dz,dx);
    tag(mesh,'Shower screen — source plan line, assumed height');
    rod([ax,base+height,az],[bx,base+height,bz],.007,M.chrome,'Shower screen top edge');
    // Fixed screen panels are thin barriers; the hinged panel is shown open.
    const nx=-dz/l*.006,nz=dx/l*.006;
    colliders.push({name:'Shower screen',points:[[ax+nx,az+nz],[bx+nx,bz+nz],[bx-nx,bz-nz],[ax-nx,az-nz]]});
  }

  // Custom-authored upholstered sofa. The dense face grids retain interior
  // topology for compression and seam tension; this is not a corner-only box.
  // One 1600 × 730 mm model is shared by both source orientations below.
  function tailoredSofaTemplate(){
    const sofa=new THREE.Group();sofa.name='Custom sculpted two-seat sofa';
    sofa.userData={sourceFootprintMeters:[1.6,.73],geometry:'Custom authored parametric upholstery; not a scan',front:'+Z'};
    function textile(source,sheen){
      const material=new THREE.MeshPhysicalMaterial({color:source.color.clone(),roughness:source.roughness,metalness:0,sheen,sheenRoughness:.77,sheenColor:source.color.clone().multiplyScalar(.64)});
      for(const key of ['map','normalMap','roughnessMap','aoMap','bumpMap','envMap'])if(source[key])material[key]=source[key];
      if(source.normalScale)material.normalScale.copy(source.normalScale);
      material.aoMapIntensity=source.aoMapIntensity??1;material.bumpScale=source.bumpScale??.001;material.envMapIntensity=source.envMapIntensity??1;
      return material;
    }
    const shellMaterial=textile(M.fabric,.22),seatMaterial=textile(M.cushion,.32),accentMaterial=textile(M.blanket,.28);
    const weltMaterial=seatMaterial.clone();weltMaterial.color.multiplyScalar(.82);weltMaterial.sheen=.12;
    const shellWelt=shellMaterial.clone();shellWelt.color.multiplyScalar(.9);
    const gauss=(v,width)=>Math.exp(-Math.pow(v/width,2));
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    function softenNormals(geo){
      geo.computeVertexNormals();const p=geo.attributes.position,n=geo.attributes.normal,shared=new Map();
      const key=i=>`${Math.round(p.getX(i)*1e6)},${Math.round(p.getY(i)*1e6)},${Math.round(p.getZ(i)*1e6)}`;
      for(let i=0;i<p.count;i++){const k=key(i),s=shared.get(k)||[0,0,0];s[0]+=n.getX(i);s[1]+=n.getY(i);s[2]+=n.getZ(i);shared.set(k,s);}
      for(let i=0;i<p.count;i++){const v=shared.get(key(i)),l=Math.hypot(...v)||1;n.setXYZ(i,v[0]/l,v[1]/l,v[2]/l);}
    }
    function upholstered(w,h,d,r,profile,bias=0){
      const grids={seat:[40,12,32],back:[38,32,12],arm:[12,16,30],deck:[28,8,20]};
      const [sx,sy,sz]=grids[profile];
      const geo=new THREE.BoxGeometry(w,h,d,sx,sy,sz),p=geo.attributes.position,n=geo.attributes.normal;
      const uv=new Float32Array(p.count*2),core=new THREE.Vector3(w/2-r,h/2-r,d/2-r),v=new THREE.Vector3(),q=new THREE.Vector3(),direction=new THREE.Vector3();
      const evaluate=(x,y,z)=>{
        v.set(x,y,z);q.copy(v).clamp(new THREE.Vector3(-core.x,-core.y,-core.z),core);direction.copy(v).sub(q).normalize();q.addScaledVector(direction,r);
        const xx=q.x/(w/2),yy=q.y/(h/2),zz=q.z/(d/2);
        const fx=Math.pow(Math.max(0,1-xx*xx),.8),fy=Math.pow(Math.max(0,1-yy*yy),.75),fz=Math.pow(Math.max(0,1-zz*zz),.8);
        // Four sewn corners pull the side panels inward instead of adding noise.
        const sidePull=.0032*Math.pow(Math.abs(xx*zz),3)*fy;
        q.x-=Math.sign(q.x)*sidePull;q.z-=Math.sign(q.z)*sidePull;
        if(profile==='seat'){
          const top=smooth((direction.y-.08)/.9),left=x+w/2,right=w/2-x,front=d/2-z,rear=z+d/2;
          let sculpt=.022*fx*fz;
          sculpt-=.011*gauss(x-bias*.06,.18)*gauss(z+.035,.145);
          // Broad compression is offset per cushion; folds end near corner seams.
          const fold1=front-(.058+.65*left),fold2=front-(.090+.48*right),fold3=rear-(.038+.37*left);
          sculpt+=(.0038*gauss(fold1,.012)-.0031*gauss(fold1+.017,.009))*Math.exp(-left/.095)*Math.exp(-front/.22);
          sculpt+=(.0032*gauss(fold2,.014)-.0027*gauss(fold2-.019,.009))*Math.exp(-right/.09)*Math.exp(-front/.23);
          sculpt-=.0035*gauss(fold3,.009)*Math.exp(-left/.08)*Math.exp(-rear/.16);
          const edge=Math.min(left,right,front,rear);
          sculpt-=.0024*gauss(edge-.020,.004);
          q.y+=sculpt*top;
          // Lower front edge bows subtly under the filled cushion; footprint is held.
          q.z-=.003*gauss(front,.035)*fy*(1-.6*fx);
        }else if(profile==='back'){
          const front=smooth((direction.z-.04)/.92),left=x+w/2,right=w/2-x,bottom=y+h/2,top=h/2-y;
          let sculpt=.030*fx*fy-.012*gauss(x-bias*.055,.16)*gauss(y+.040,.135);
          const f1=bottom-(.047+.46*left),f2=bottom-(.07+.56*right);
          sculpt+=(.0048*gauss(f1,.013)-.0038*gauss(f1+.020,.010))*Math.exp(-left/.11)*Math.exp(-bottom/.24);
          sculpt+=(.0037*gauss(f2,.014)-.0032*gauss(f2-.019,.010))*Math.exp(-right/.09)*Math.exp(-bottom/.22);
          sculpt-=.0034*gauss(Math.min(left,right,bottom,top)-.024,.005);
          q.z+=sculpt*front;
          // Relaxed upper edge and corner compression create a non-box silhouette.
          q.y+=.008*fx*gauss(top,.045)-.0045*gauss(x-bias*.09,.10)*gauss(top,.023);
          q.x-=Math.sign(x)*.004*gauss(bottom,.055)*Math.pow(Math.abs(xx),2);
        }else if(profile==='arm'){
          const up=smooth((direction.y+.1)/1.05);
          q.y+=.055*(.5-z/d)*up-.009*gauss(z-.17,.10)*up;
          q.x-=Math.sign(x)*.0018*gauss(z-.25,.08)*fy;
        }else if(profile==='deck'){
          q.y+=.004*fx*fz*smooth(direction.y);
          q.z-=Math.sign(q.z)*.002*gauss(y+.03,.025)*fx;
        }
        return new THREE.Vector3(q.x,q.y,q.z);
      };
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));
        if(ay>.5){uv[i*2]=x+w/2;uv[i*2+1]=z+d/2;}
        else if(ax>.5){uv[i*2]=z+d/2;uv[i*2+1]=y+h/2;}
        else{uv[i*2]=x+w/2;uv[i*2+1]=y+h/2;}
        const point=evaluate(x,y,z);p.setXYZ(i,point.x,point.y,point.z);
      }
      softenNormals(geo);geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.computeBoundingBox();
      return{geometry:geo,evaluate,w,h,d};
    }
    function object(geometry,material,name,parent=sofa){
      const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.userData={source:'the supplied floor plan envelope',geometry:'Custom authored upholstery',verticalGeometry:'Illustrative'};parent.add(mesh);return mesh;
    }
    function seam(cushionModel,parent,plane,at,material,name){
      const {w,h,d,evaluate}=cushionModel,points=[],steps=34;
      // Sample the actual deformed surface, so the welt never floats over folds.
      if(plane==='horizontal'){
        for(let i=0;i<steps;i++)points.push(evaluate(-w/2+w*i/steps,at,-d/2));
        for(let i=0;i<steps;i++)points.push(evaluate(w/2,at,-d/2+d*i/steps));
        for(let i=0;i<steps;i++)points.push(evaluate(w/2-w*i/steps,at,d/2));
        for(let i=0;i<steps;i++)points.push(evaluate(-w/2,at,d/2-d*i/steps));
      }else{
        for(let i=0;i<steps;i++)points.push(evaluate(-w/2+w*i/steps,-h/2,at));
        for(let i=0;i<steps;i++)points.push(evaluate(w/2,-h/2+h*i/steps,at));
        for(let i=0;i<steps;i++)points.push(evaluate(w/2-w*i/steps,h/2,at));
        for(let i=0;i<steps;i++)points.push(evaluate(-w/2,h/2-h*i/steps,at));
      }
      const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');
      object(new THREE.TubeGeometry(curve,184,.00115,6,true),material,name,parent);
    }
    function part(spec){
      const m=upholstered(spec.w,spec.h,spec.d,spec.r,spec.profile,spec.bias||0),container=new THREE.Group();container.name=spec.name+' assembly';
      container.position.set(...spec.position);if(spec.rotation)container.rotation.set(...spec.rotation);sofa.add(container);
      object(m.geometry,spec.material,spec.name,container);
      if(spec.seams==='seat'){
        seam(m,container,'horizontal',spec.h*.27,weltMaterial,'Recessed upper seat welt');
        seam(m,container,'horizontal',-spec.h*.26,weltMaterial,'Lower tailored seat welt');
      }else if(spec.seams==='back')seam(m,container,'vertical',spec.d*.25,weltMaterial,'Loose cushion perimeter welt');
      return container;
    }
    part({w:1.6,h:.25,d:.73,r:.038,profile:'deck',position:[0,.255,0],material:shellMaterial,name:'Dense sculpted upholstered deck'});
    part({w:1.52,h:.44,d:.084,r:.03,profile:'deck',position:[0,.56,-.323],material:shellMaterial,name:'Upholstered rear support'});
    for(const sign of [-1,1]){
      part({w:.08,h:.38,d:.73,r:.032,profile:'arm',position:[sign*.76,.46,0],material:shellMaterial,name:'Soft wrap arm with rising rear profile'});
      part({w:.700,h:.125,d:.54,r:.047,profile:'seat',bias:sign*.65,position:[sign*.36,.430,.075],material:seatMaterial,seams:'seat',name:'Sculpted loose seat cushion'});
      part({w:.706,h:.39,d:.145,r:.052,profile:'back',bias:sign*.8,position:[sign*.36,.645,-.228],rotation:[-.20,0,sign*.006],material:seatMaterial,seams:'back',name:'Tilted sculpted loose back cushion'});
      for(const z of [-.294,.294]){
        const foot=object(new THREE.CylinderGeometry(.019,.022,.13,24),M.black,'Recessed sofa foot');foot.position.set(sign*.705,.065,z);
      }
    }
    part({w:.285,h:.295,d:.092,r:.036,profile:'back',bias:.9,position:[-.43,.64,.018],rotation:[-.32,-.035,.095],material:accentMaterial,seams:'back',name:'Relaxed accent pillow with corner tension folds'});
    // A fine inset deck seam finishes the front panel below the separate cushions.
    const deckSeam=new THREE.CatmullRomCurve3([new THREE.Vector3(-.755,.335,.346),new THREE.Vector3(-.4,.332,.358),new THREE.Vector3(0,.331,.359),new THREE.Vector3(.4,.332,.358),new THREE.Vector3(.755,.335,.346)]);
    object(new THREE.TubeGeometry(deckSeam,96,.0011,6,false),shellWelt,'Inset front upholstery seam');
    return sofa;
  }

  // Bed 8AD: preserve the drawing's asymmetric duvet edge and both bedside tables.
  const bed=[2953.8492791306685,15216.875095940319,Math.PI/2];
  const bedOutline=[[0,-775],[765.7194412767253,-775],[767.2908937043876,-755],[2030,-755],[2030,775],[887.5070044205463,775],[889.078456848208,795],[600,795],[600,775],[0,775]];
  const bedPoints=transformPoints(bedOutline,bed);
  roundLocal(bed,30,-752,2015,770,.245,.095,M.fabric,'Upholstered queen bed base — inside source envelope',.042);
  roundLocal(bed,108,-752,2028,773,.22,.34,M.bed,'Rounded queen mattress — inside source envelope',.065);
  piping(bed,110,-750,2026,771,.535,45,bedSeamMaterial,'Mattress stitched edge');
  roundLocal(bed,0,-775,100,775,.98,0,M.fabric,'Upholstered headboard — source 100 mm footprint',.035);
  for(const y of [-380,380])localBlock(bed,95,y-1,99,y+1,.74,.15,seamMaterial,'Headboard tailored seam');
  for(const x of [150,1910])for(const y of [-660,660]){const p=transform([x,y],bed);disc(...p,30,.095,0,M.black,'Bed recessed foot');}
  function duvetSurface(fold=false){
    const nx=fold?18:58,ny=54,positions=[],uv=[],indices=[];
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const u=i/nx,v=j/ny,yy=(fold?-775:-755)+(fold?1570:1530)*v;
      const diagonal=765.7194412767253+123.359015571483*v;
      const xx=fold?600+(diagonal-600)*u:diagonal+(2030-diagonal)*u;
      const edge=Math.min(v,1-v),drop=.078*Math.exp(-edge*36)+(fold?0:.062*Math.pow(u,18));
      const wrinkles=.008*Math.sin(xx*.029+yy*.018)*Math.exp(-edge*11)+.004*Math.cos(yy*.04+xx*.009);
      let height=.595-drop+wrinkles+.023*Math.sin(v*Math.PI);
      if(fold)height+=.016+.018*Math.sin(u*Math.PI);
      const p=wp(transform([xx,yy],bed));positions.push(p[0],height,p[1]);uv.push(xx/1000,yy/1000);
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const material=(fold?M.blanket:M.bed).clone();material.side=THREE.DoubleSide;
    tag(new THREE.Mesh(geo,material),fold?'Soft folded duvet — source diagonal retained':'Draped duvet with edge folds — entirely inside source bed outline');
  }
  duvetSurface();duvetSurface(true);
  cushion(bed,170.36123824157,-680.48862667264,530.36123824161,-20.48862667259,.115,.555,M.bed,'Pillow — source rectangle',.045);
  cushion(bed,170.36123824159,40.48862667265,530.36123824154,700.48862667264,.115,.555,M.bed,'Pillow — source rectangle',.045);
  collider(bedPoints,'Queen bed');
  for(const ys of [[825,1275.001],[-1275.001,-825]]){
    roundLocal(bed,100,ys[0],550,ys[1],.445,.025,M.wood,'Pale oak bedside table — source block 8AD',.009);
    localBlock(bed,542,ys[0]+7,547,ys[1]-7,.003,.22,M.recess,'Bedside drawer shadow gap');
    localBlock(bed,537,(ys[0]+ys[1])/2-60,548,(ys[0]+ys[1])/2+60,.014,.32,M.black,'Bedside inset drawer pull');
    localCollider(bed,100,ys[0],550,ys[1],'Bedside table');
  }

  // Lounge C9D is a single DWG family containing TWO sofas, rug and round table.
  const lounge=[4677.920234945001,21622.367039648656,0];
  roundLocal(lounge,-1231.375260226873,-1376.28986865229,968.624739773084,1023.710131347649,.012,.002,M.rug,'Woven living rug — source C9D perimeter',.003);
  piping(lounge,-1220.375260226873,-1365.28986865229,957.624739773084,1012.710131347649,.014,5,seamMaterial,'Rug stitched binding');
  const sofa1={x0:-931.375260226917,y0:643.416878282446,x1:668.624739773086,y1:1373.416878282444};
  const sofaTemplate=tailoredSofaTemplate();
  const sofaBalcony=sofaTemplate.clone(true);sofaBalcony.name='Balcony sofa — sculpted source-fitted upholstery';
  const sofaBalconyCenter=wp(transform([(sofa1.x0+sofa1.x1)/2,(sofa1.y0+sofa1.y1)/2],lounge));
  sofaBalcony.position.set(sofaBalconyCenter[0],0,sofaBalconyCenter[1]);group.add(sofaBalcony);
  localCollider(lounge,sofa1.x0,sofa1.y0,sofa1.x1,sofa1.y1,'Balcony sofa');
  const sofa2={x0:-1830.988662797107,y0:-976.289868652347,x1:-1100.988662797107,y1:623.710131347705};
  const sofaDining=sofaTemplate.clone(true);sofaDining.name='Dining-side sofa — sculpted source-fitted upholstery';
  const sofaDiningCenter=wp(transform([(sofa2.x0+sofa2.x1)/2,(sofa2.y0+sofa2.y1)/2],lounge));
  sofaDining.position.set(sofaDiningCenter[0],0,sofaDiningCenter[1]);sofaDining.rotation.y=Math.PI/2;group.add(sofaDining);
  localCollider(lounge,sofa2.x0,sofa2.y0,sofa2.x1,sofa2.y1,'Dining-side sofa');
  const coffee=transform([-312.972007163196,-62.567124919666],lounge);
  disc(...coffee,360,.038,.395,M.stone,'Coffee table — exact R360 CAD circle');
  disc(...coffee,170,.39,.008,M.wood,'Coffee table pedestal — illustrative');
  const bookPose=[coffee[0]+20,coffee[1]+60,.19];
  roundLocal(bookPose,-100,-80,100,80,.026,.435,M.trim,'Coffee table book — styling inside existing table',.002);
  roundLocal(bookPose,-101,-81,101,81,.002,.434,M.black,'Book lower cover',.0008);
  roundLocal(bookPose,-101,-81,101,81,.002,.46,M.black,'Book upper cover',.0008);
  const bowlProfile=[new THREE.Vector2(.022,0),new THREE.Vector2(.040,.008),new THREE.Vector2(.069,.041),new THREE.Vector2(.073,.047),new THREE.Vector2(.068,.049),new THREE.Vector2(.063,.041),new THREE.Vector2(.030,.011),new THREE.Vector2(0,.009)];
  const bowl=new THREE.Mesh(metricUV(new THREE.LatheGeometry(bowlProfile,48)),M.ceramic),bp=wp([coffee[0]-115,coffee[1]-105]);bowl.position.set(bp[0],.434,bp[1]);tag(bowl,'Ceramic bowl — styling inside coffee table');
  circleCollider(...coffee,360,'Coffee table');

  const tv=[6018.095510135508,21422.367039648652,3*Math.PI/2];
  roundLocal(tv,-625.361967408453,-300,574.638032591548,0,.36,.08,M.wood,'Pale oak TV console — exact source rectangle',.004);
  for(const x of [-225.361967408453,174.638032591548])localBlock(tv,x-1,-299,x+1,-296,.30,.11,M.recess,'Console door shadow gap');
  localBlock(tv,-550,-290,500,-250,.055,.025,M.black,'Recessed TV console plinth');
  roundLocal(tv,-525.361967408453,-200,474.638032591548,-100,.57,.52,M.black,'TV surround — source plan footprint',.007);
  localBlock(tv,-512.361967408453,-200,461.638032591548,-198,.541,.534,M.screen,'TV glass with slim dark bezel');
  localBlock(tv,-80,-165,30,-135,.08,.44,M.black,'TV pedestal');
  localBlock(tv,-200,-210,149,-100,.012,.441,M.black,'TV stand — within console footprint');
  localCollider(tv,-625.361967408453,-300,574.638032591548,0,'TV console');

  // Dining table 871: actual CAD R450 takes precedence over stale family name.
  const table=[1732.568558627142,21422.419416612007];
  disc(...table,450,.036,.724,M.wood,'Dining table — drawn diameter 900 mm');
  disc(...table,110,.7,.024,M.recess,'Dining pedestal — illustrative');
  circleCollider(...table,450,'Dining table');
  const chairs=[
    [1284.549994183213,21422.471793575358,4.712388980384616,53.415727841645],
    [1732.516181663786,20974.40085216807,0,54.96413781331],
    [1732.620935590498,21870.43798105593,Math.PI,54.96413781331],
    [2180.587123071068,21422.367039648645,1.5707963267948195,53.415727841645]
  ];
  for(const chair of chairs){
    roundLocal(chair,-215.9,-152.4,215.9,chair[3],.024,.427,M.wood,'Contoured dining seat shell — source seat envelope',.011);
    cushion(chair,-209,-147,209,chair[3]-5,.027,.451,M.fabric,'Dining chair upholstered seat',.009);
    const back=[];
    for(let i=0;i<=32;i++){let x=-215.9+431.8*i/32;back.push([x,-202+20*(1-(x/215.9)**2)]);}
    for(let i=32;i>=0;i--){let x=-215.9+431.8*i/32;back.push([x,-191+20*(1-(x/215.9)**2)]);}
    prism(transformPoints(back,chair),.295,.535,M.wood,'Bent oak dining chair back — within source envelope');
    for(const x of [-203.478615412,203.733265655]){
      const a=transform([x,-230.581429315],chair),b=transform([x,chair[3]-12.7],chair);
      cadRod(a[0],a[1],.025,a[0],a[1],.815,.0127,M.black,'Chair frame');
      cadRod(b[0],b[1],.025,b[0],b[1],.435,.0127,M.black,'Chair front support');
      cadRod(a[0],a[1],.025,b[0],b[1],.025,.0127,M.black,'Chair frame foot');
    }
    localCollider(chair,-218.806308,-245.654472,218.806308,chair[3],'Dining chair');
  }

  // Built-in joinery; source storage-family height is explicitly 2400H.
  function cabinet(pose,x0,y0,x1,y1,height,name,face='lowY',doors=2){
    const high=face==='highY',front=high?y1:y0,dir=high?-1:1;
    localBlock(pose,x0+28,y0+38,x1-28,y1-38,.075,0,M.recess,name+' recessed toe kick');
    localBlock(pose,x0,y0,x0+18,y1,height-.075,.075,M.joinery,name+' side');
    localBlock(pose,x1-18,y0,x1,y1,height-.075,.075,M.joinery,name+' side');
    localBlock(pose,x0+18,y0,x1-18,y1,.018,height-.018,M.joinery,name+' top');
    localBlock(pose,x0+18,Math.min(front+dir*24,high?y0:y1),x1-18,Math.max(front+dir*24,high?y0:y1),height-.10,.075,M.recess,name+' shadowed carcass');
    for(let i=0;i<doors;i++){
      const xa=x0+(x1-x0)*i/doors+3,xb=x0+(x1-x0)*(i+1)/doors-3;
      localBlock(pose,xa,Math.min(front+dir*5,front+dir*23),xb,Math.max(front+dir*5,front+dir*23),height-.088,.076,M.joinery,name+' individual door');
      const hx=i%2===0?xb-30:xa+30;
      localBlock(pose,hx-4,Math.min(front+dir*.8,front+dir*5),hx+4,Math.max(front+dir*.8,front+dir*5),.27,.93,M.black,name+' recessed dark pull');
    }
    localCollider(pose,x0,y0,x1,y1,name);
  }
  cabinet([0,0,0],4469.618287442777,15216.87509594031,6369.618287442839,15816.875095940311,2.4,'Bedroom wardrobe — exact 1900 × 600 mm footprint','highY');
  cabinet([7044.118287442847,17009.37509594031,Math.PI/2],-502.5,-320.5,502.5,320.5,2.4,'Hall storage — source S3_2400H');
  for(const x of [6709.995510135494,7664.995510135498,8619.995510135497])
    cabinet([x,18813.41958082537,0],-477.5,-135,477.5,135,2.4,'Shallow hall storage — source S3_2400H');

  // The kitchen's drawn dimensions differ from family naming; use wall/end-panel edges.
  const bench=rect(1498.301200402344,18351.875095940326,3899.541234098186,19081.87509594037);
  const sinkCutout=roundedRect(2671.245804395984,18566.875095940366,3251.245804395984,19006.875095940366,10);
  block(1545.301200402344,18400.875095940326,3852.541234098186,19028.87509594037,.08,.005,M.recess,'Kitchen recessed toe kick');
  block(1498.301200402344,18351.875095940326,3899.541234098186,19053.87509594037,.60,.08,M.joinery,'Kitchen carcass — inside exact source footprint');
  block(1498.301200402344,18351.875095940326,1516.301200402344,19081.87509594037,.76,.1,M.wood,'Kitchen pale oak end panel');
  block(3881.541234098186,18351.875095940326,3899.541234098186,19081.87509594037,.76,.1,M.wood,'Kitchen pale oak end panel');
  prism(bench,.04,.86,M.stone,'Kitchen benchtop — source sink opening',[sinkCutout]);
  block(1498.301200402344,18353.875095940326,3899.541234098186,18363.875095940326,.45,.9,M.stone,'Proposed 450 mm stone splashback — within bench footprint');
  block(1503.301200402344,18361.875095940326,3894.541234098186,18369.875095940326,.008,1.339,M.black,'Proposed slim splashback task-light housing');
  const taskLightMaterial=new THREE.MeshStandardMaterial({color:0xfff2dc,emissive:0xffe9cb,emissiveIntensity:2.2,roughness:.35});
  block(1510.301200402344,18366.875095940326,3887.541234098186,18369.575095940326,.002,1.339,taskLightMaterial,'Proposed integrated linear task light');
  collider(bench,'Kitchen bench');
  const kitchenDoors=[[1519.3012,2165.3012],[2172.3012,2601.3012],[2608.3012,3237.2458],[3244.2458,3878.5412]];
  for(const [xa,xb] of kitchenDoors){
    block(xa,19055.87509594037,xb,19078.87509594037,.754,.094,M.wood,'Separate pale oak kitchen door');
    block(xa+13,19078.87509594037,xb-13,19080.87509594037,.010,.827,M.recess,'Kitchen recessed finger pull');
  }
  // The base is hollow above 680 mm so actual bowls read as recesses, not decals.
  recessedBowl(sinkCutout,[2687.745804395981,18586.875095940366,3234.745804395981,18986.875095940366],.902,.17,M.basin,'Stainless steel kitchen sink');
  block(2948.745784395981,18586.875095940366,2973.745824395981,18986.875095940366,.163,.737,M.basin,'Kitchen sink divider — source lines');
  mixer(2961.245804395987,18506.875095940355,.901,0,'Kitchen mixer at source position');
  block(1560.801200402192,18476.87509594036,2160.801200402193,18984.875095940366,.015,.9,M.black,'Cooktop — exact source 600 × 508 mm outline');
  for(const [dx,dy,r] of [[-138,288,66],[145,346,47],[145,138,23]]){
    const x=1860.8012004022032+dx,y=18476.875095940355+dy;
    disc(x,y,r,.008,.916,M.chrome,'Cooktop burner ring — exact source arc');
    disc(x,y,r-4,.008,.924,M.black,'Cooktop burner cap — exact source centre');
  }
  for(const dx of [-198,-138,-78]){
    const x=1860.8012004022032+dx,y=18476.875095940355+54;
    disc(x,y,19,.018,.916,M.black,'Cooktop control — exact source circle');
    block(x-1.2,y-13,x+1.2,y-4,.001,.934,M.chrome,'Cooktop knob indicator');
  }
  block(1560.800826878338,19075.87525170467,2155.800826878338,19081.87525170467,.596,.16,M.black,'Oven surround — source family 595w × 596h');
  block(1580.800826878338,19081.07525170467,2135.800826878338,19081.87525170467,.400,.185,M.screen,'Oven reflective door glazing');
  block(1574.800826878338,19078.87525170467,2141.800826878338,19081.87525170467,.066,.679,M.chrome,'Oven brushed control fascia');
  cadRod(1677.741548641781,19110.07572266591,.7,2038.8608895197513,19110.07572266591,.7,.009,M.chrome,'Oven handle — source plan extent');
  for(const x of [1677.741548641781,2038.8608895197513])cadRod(x,19081.87525170467,.7,x,19110.07572266591,.7,.006,M.chrome,'Oven handle bracket');
  for(const x of [1620.800826878338,2095.800826878338]){
    const knob=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.008,24),M.black),q=wp([x,19082.37525170467]);
    knob.rotation.x=Math.PI/2;knob.position.set(q[0],.711,q[1]);tag(knob,'Oven control dial');
  }
  block(1793,19080.6,1923,19082,.027,.699,M.screen,'Oven display');
  // Proposed product selections occupy the exact existing CAD allocations.
  addSamsungAppliances(THREE,group,M);
  collider(rect(3917.541234098195,18351.875095940322,4667.541234098208,19081.875095940326),'Fridge');
  collider(rect(6482.118287442824,15769.375095940308,7082.118287442824,16369.375095940308),'Laundry machine');
  collider(rect(6482.118287442824,15239.375095940313,7082.118287442824,15739.375095940313),'Laundry trough');

  // Bathroom: basin footprint, mirror cabinet, WC and chamfered shower all from CAD.
  const basin=[[11365.003554165984,16410.069211246293],[10979.210321165983,16410.069211246293]];
  for(let i=1;i<=8;i++){const a=3*Math.PI/2-i*Math.PI/16;basin.push([10979.210321165983+14*Math.cos(a),16424.069211246293+14*Math.sin(a)]);}
  basin.push([10965.210321165963,16945.91770724629]);
  for(let i=1;i<=8;i++){const a=Math.PI-i*Math.PI/16;basin.push([10979.210321165983+14*Math.cos(a),16945.91770724629+14*Math.sin(a)]);}
  basin.push([11365.003554165984,16959.917707246295]);
  const basinCenter=[11165.106937665974,16684.993459246294];
  loft([{points:basin.map(([x,y])=>[basinCenter[0]+(x-basinCenter[0])*.83,basinCenter[1]+(y-basinCenter[1])*.9]),height:.698},{points:basin,height:.825}],M.ceramic,'Sculpted wall basin outer shell — source rim outline');
  recessedBowl(basin,[10979.210321165983,16425.769211246294,11236.403554165983,16944.217707246295],.842,.115,M.ceramic,'Ceramic wall basin');
  mixer(11280.00355416598,16684.993459246294,.844,Math.PI/2,'Bathroom basin mixer');
  collider(basin,'Wall basin');
  block(11215.00355416598,16449.993459246303,11365.003554165978,16919.99345924633,.72,1.1,M.joinery,'Shaving cabinet — source footprint');
  block(11212.50355416598,16453.993459246303,11215.50355416598,16915.99345924633,.7,1.11,M.mirror,'Shaving cabinet mirror — illustrative elevation');
  const wcPoints=[[9542.790514114216,18950.433944373875],[9540.045223853851,18746.119766160202],[9540.045223853856,18511.878249449896]];
  for(let i=1;i<=40;i++){const a=Math.PI+i*Math.PI/40;wcPoints.push([9717.749532150743+177.70430829688445*Math.cos(a),18511.8782494499+177.70430829688445*Math.sin(a)]);}
  wcPoints.push([9895.453840447633,18746.119766160202],[9892.708550187264,18950.433944373875]);
  if(Array.isArray(flat?.paths)){
    const handles=['E24','E25','E26','E27','E28','E29','E2A'];
    const outline=handles.flatMap(h=>flat.paths.find(p=>p.handle===h&&p.insertHandles?.includes('E36'))?.points||[]);
    if(outline.length>15)wcPoints.splice(0,wcPoints.length,...outline);
  }
  const wcCenter=[9717.749532150743,18643.433942763444],scaledWC=s=>wcPoints.map(([x,y])=>[wcCenter[0]+(x-wcCenter[0])*s,wcCenter[1]+(y-wcCenter[1])*s]);
  loft([{points:scaledWC(.65),height:0},{points:scaledWC(.69),height:.065},{points:scaledWC(.76),height:.19},{points:scaledWC(.98),height:.34},{points:wcPoints,height:.4}],M.ceramic,'Sculpted ceramic WC body — source outer rim');
  const seatOuter=[[9540.045223853856,18755],[9540.045223853856,18511.878249449896]];
  for(let i=1;i<=40;i++){let a=Math.PI+i*Math.PI/40;seatOuter.push([wcCenter[0]+177.70430829688445*Math.cos(a),18511.8782494499+177.70430829688445*Math.sin(a)]);}
  seatOuter.push([9895.453840447633,18755]);
  const wcHole=Array.from({length:64},(_,i)=>{let a=i*Math.PI/32;return[9717.749532150743+110*Math.cos(a),18553+151*Math.sin(a)];});
  recessedBowl(seatOuter,[9607.749532150743,18402,9827.749532150743,18704],.4,.19,M.ceramic,'WC bowl',wcHole);
  prism(seatOuter,.027,.410,M.ceramic,'WC open seat ring',[wcHole]);
  roundLocal([0,0,0],9542.790514114216,18766.05631000165,9892.708550187264,18950.433944373875,.36,.43,M.ceramic,'WC cistern — source rear footprint',.024);
  disc(9717.749532150743,18850,25,.004,.792,M.chrome,'WC dual flush button');
  block(9716.5,18829,9718.5,18871,.001,.797,M.recess,'WC flush button division');
  collider(wcPoints,'WC');
  const shower=[[10205.003554165982,18950.43394437387],[11365.003554165984,18950.43394437387],[11365.003554165984,17850.433944373868],[10629.267622877912,17850.43394437386],[10205.003554165975,18274.69801308578]];
  prism(shower,.018,.008,M.stone,'Shower floor — exact chamfered source footprint');
  glassPanel([10210.00355416598,18950.43394437387],[10210.00355416598,18278.84014870951],2.05,.028);
  glassPanel([10633.409758501634,17855.433944373868],[11365.003554165988,17855.433944373868],2.05,.028);
  // Hinged door as drawn open in block FB9; keep the chamfered entry clear.
  glassPanel([10212.07462197778,18281.76908089771],[10599.372956598536,18669.067415518435],2.05,.028);
  block(11265.003554165984,18247.93394437387,11365.003554165984,18547.93394437387,.016,1.1,M.chrome,'Shower shelf — exact source footprint');
  cadRod(10840.00355416598,18913.43394437387,.9,10840.00355416598,18913.43394437387,2.12,.01,M.chrome,'Shower rail — source horizontal position');
  cadRod(10840.00355416598,18913.43394437387,2.12,10840.00355416598,18495.43394437387,2.12,.01,M.chrome,'Shower overhead arm — source axis');
  disc(10840.00355416598,18495.43394437387,150,.018,2.1,M.chrome,'Shower head — source 300 mm family');
  cadRod(11298.50355416598,17113.9934592463,1.1,11298.50355416598,17655.9934592463,1.1,.009,M.chrome,'Towel rail — source location');

  // Lift paired six-millimetre source grate outlines into actual metal bars.
  // Decorative CAD line overlays are omitted from the photoreal material view.
  if(Array.isArray(flat?.paths)){
    const paired=new Map(),bars=new Set();
    for(const path of flat.paths){
      if(path.type!=='LINE'||!path.blockNames?.some(n=>n.startsWith('09594370_AUS_KM2312'))||path.points.length!==2)continue;
      const [a,b]=path.points,dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
      let axis,lo,hi,offset;
      if(dy<.01&&dx>10&&dx<180){axis='h';lo=Math.min(a[0],b[0]);hi=Math.max(a[0],b[0]);offset=(a[1]+b[1])/2;}
      else if(dx<.01&&dy>10&&dy<180){axis='v';lo=Math.min(a[1],b[1]);hi=Math.max(a[1],b[1]);offset=(a[0]+b[0])/2;}
      else continue;
      const key=axis+','+lo.toFixed(2)+','+hi.toFixed(2);
      if(!paired.has(key))paired.set(key,{axis,lo,hi,offsets:[]});paired.get(key).offsets.push(offset);
    }
    for(const {axis,lo,hi,offsets} of paired.values()){
      offsets.sort((a,b)=>a-b);
      for(let i=0;i<offsets.length;i++)for(let j=i+1;j<offsets.length;j++){
        if(Math.abs(offsets[j]-offsets[i]-6)>.02)continue;
        const bounds=axis==='h'?[lo,offsets[i],hi,offsets[j]]:[offsets[i],lo,offsets[j],hi],key=bounds.map(x=>x.toFixed(2)).join(',');
        if(bars.has(key))continue;bars.add(key);
        block(...bounds,.012,.93,M.black,'Raised cast-iron hob grate — exact paired source lines');
      }
    }
  }
  return {colliders,count,group,notes:'DWG fixture footprints and navigation collisions are preserved. Cool contemporary finishes, shaped furniture, selected Samsung appliances, sanitary elevations and the 450 mm splashback/task light are proposed visualization details; S3 storage height is source-named 2400H.'};
}
