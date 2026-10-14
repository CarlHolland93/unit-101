export function addArchitecturalDetails(THREE,scene,data,materials,helpers){
  const {world,inside,distSeg,floorPolys,wallSegments,box,segment,localPoint}=helpers;
  const group=new THREE.Group();scene.add(group);
  const trim=materials.trim;
  // Drain plates located from the source floor-waste inserts (CAD millimetres).
  for(const [x,y,level] of [[9704.749532,17467.933944,-.008],[10798.003554,16897.433944,-.008],[10785.003554,18385.433944,.028]]){
    const p=world([x,y]);box(...p,.11,.11,.002,level,materials.chrome,0,group);
    box(...p,.094,.094,.001,level+.002,materials.basin,0,group);
    for(let i=-3;i<=3;i++)box(p[0]+i*.011,p[1],.004,.08,.0005,level+.003,materials.recess,0,group);
  }

  // Thin proposed stone lining sits against actual bathroom wall faces.
  const wetWallFaces=[[[9238.4955,15993.4339],[11357.0036,15993.4339]],[[11357.0036,15993.4339],[11357.0036,18942.4339]],[[11357.0036,18942.4339],[9238.4955,18942.4339]],[[9238.4955,18942.4339],[9238.4955,17040.4339]]];
  for(const [a,b] of wetWallFaces){const p=world(a),q=world(b);segment(...p,...q,.006,2.4,0,materials.floorTile,group);}

  // Skirting follows the inside floor boundary only where the DWG has a wall face.
  // It does not bridge doorways or full-height glazing.
  for(const poly of floorPolys){
    for(let i=1;i<poly.length;i++){
      const a=poly[i-1],b=poly[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      if(len<.13)continue;
      const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      if(mid[0]>3.2&&mid[1]>2.03&&mid[1]<5.03)continue; // tiled bathroom walls finish at the floor
      if(!wallSegments.some(([c,d])=>{const wx=d[0]-c[0],wz=d[1]-c[1],wl=Math.hypot(wx,wz);return wl>.01&&Math.abs(dx*wz-dz*wx)/(len*wl)<.02&&distSeg(a,c,d)<.045&&distSeg(b,c,d)<.045;}))continue;
      let ox=-dz/len*.009,oz=dx/len*.009;
      if(!inside([mid[0]+ox*2,mid[1]+oz*2],poly)){ox=-ox;oz=-oz;}
      segment(a[0]+ox,a[1]+oz,b[0]+ox,b[1]+oz,.014,.085,.005,trim,group);
    }
  }
  // Lever handles and slim architraves are proposed details, with door leaves held in the source pose.
  for(const ins of data.inserts.filter(i=>i.name.startsWith('MX_Single Door'))){
    const width=ins.name.includes('900W')?900:1000;
    for(const side of [-1,1]){
      const p=localPoint(ins,side*(width/2-18),0);
      box(...p,.038,.18,2.13,0,trim,-ins.rotation,group);
    }
    const a=localPoint(ins,-width/2,0),b=localPoint(ins,width/2,0);
    segment(...a,...b,.18,.035,2.10,trim,group);
    const leaves=data.paths.filter(p=>p.insertHandles.includes(ins.handle)&&p.layer==='A-DOOR'&&p.type==='LINE');
    const longest=leaves.sort((a,b)=>Math.hypot(...[b.points[1][0]-b.points[0][0],b.points[1][1]-b.points[0][1]])-Math.hypot(...[a.points[1][0]-a.points[0][0],a.points[1][1]-a.points[0][1]]))[0];
    if(!longest)continue;
    let p=world(longest.points[0]),q=world(longest.points[1]);
    // The endpoint farther from the opening is the free end of an open leaf.
    const centre=world(ins.position);
    if(Math.hypot(p[0]-centre[0],p[1]-centre[1])<Math.hypot(q[0]-centre[0],q[1]-centre[1]))[p,q]=[q,p];
    const len=Math.hypot(q[0]-p[0],q[1]-p[1]),ux=(q[0]-p[0])/len,uz=(q[1]-p[1])/len;
    for(const side of [-1,1]){
      const x=p[0]+ux*.095-uz*.027*side,z=p[1]+uz*.095+ux*.027*side;
      box(x,z,.045,.045,.075,.965,materials.chrome,0,group);
      segment(x,z,x+ux*.115,z+uz*.115,.017,.017,1.002,materials.black,group);
    }
  }
  return group;
}
