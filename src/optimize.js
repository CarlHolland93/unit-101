import {mergeGeometries} from './assets/addons/utils/BufferGeometryUtils.js';

// All architecture and furniture is static. Batch surfaces sharing a material
// while keeping independently toggleable groups and all CAD collision data.
export function batchStaticMeshes(THREE,parent,recursive=true){
  parent.updateMatrixWorld(true);
  const meshes=[];
  if(recursive)parent.traverse(o=>{if(o.isMesh)meshes.push(o)});
  else for(const o of parent.children)if(o.isMesh)meshes.push(o);
  const groups=new Map(),inverse=parent.matrixWorld.clone().invert();
  for(const mesh of meshes){
    if(!mesh.visible||Array.isArray(mesh.material)||mesh.material.transparent||mesh.onBeforeRender.toString().length>100)continue;
    const key=[mesh.material.uuid,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder].join('/');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
  }
  for(const list of groups.values()){
    if(list.length<2)continue;
    const geometries=list.map(o=>{
      const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      g.clearGroups();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
      // Common attributes only: morph/tangent data is not used by these static surfaces.
      for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
      return g;
    });
    const geometry=mergeGeometries(geometries,false);
    if(!geometry){geometries.forEach(g=>g.dispose());continue;}
    const merged=new THREE.Mesh(geometry,list[0].material);
    merged.name=`Batched ${list[0].material.name||'architectural surface'}`;
    merged.castShadow=list[0].castShadow;merged.receiveShadow=list[0].receiveShadow;
    parent.add(merged);
    for(const original of list){original.removeFromParent();original.geometry.dispose();}
    geometries.forEach(g=>g.dispose());
  }
}
