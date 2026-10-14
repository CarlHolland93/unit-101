// Collision-aware guided walk. World positions are metres; no geometry is moved.
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const angleDifference=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function createPathfinder(isClear,bounds,step=.08,sweptClear=null){
  const minX=bounds.minX-step,minZ=bounds.minZ-step,nx=Math.ceil((bounds.maxX-minX+step)/step),nz=Math.ceil((bounds.maxZ-minZ+step)/step);
  const cache=new Map(),point=i=>[minX+(i%nx)*step,minZ+Math.floor(i/nx)*step];
  const clear=i=>{if(!cache.has(i))cache.set(i,isClear(point(i)));return cache.get(i)};
  function lineClear(a,b){if(sweptClear)return sweptClear(a,b);const n=Math.max(1,Math.ceil(distance(a,b)/.02));for(let i=0;i<=n;i++)if(!isClear([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]))return false;return true}
  function nearest(p){const cx=Math.round((p[0]-minX)/step),cz=Math.round((p[1]-minZ)/step);let candidates=[];for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=nx||z>=nz)continue;let i=z*nx+x;if(clear(i))candidates.push([i,distance(p,point(i))])}candidates.sort((a,b)=>a[1]-b[1]);return candidates.find(([i])=>lineClear(p,point(i)))?.[0]}
  function route(a,b){
    if(!isClear(a)||!isClear(b))throw Error('Tour position is obstructed');
    if(lineClear(a,b))return [a.slice(),b.slice()];
    const start=nearest(a),goal=nearest(b);if(start===undefined||goal===undefined)throw Error('No clear route to this space');
    const costs=new Float64Array(nx*nz).fill(Infinity),parents=new Int32Array(nx*nz).fill(-1),closed=new Uint8Array(nx*nz),heap=[];
    const push=v=>{heap.push(v);let i=heap.length-1;while(i>0){let p=(i-1)>>1;if(heap[p][1]<=v[1])break;heap[i]=heap[p];i=p;}heap[i]=v};
    const pop=()=>{const out=heap[0],end=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=end[1])break;heap[i]=heap[c];i=c;}heap[i]=end;}return out};
    costs[start]=0;push([start,distance(point(start),point(goal))]);
    while(heap.length){const [i]=pop();if(closed[i])continue;if(i===goal)break;closed[i]=1;const x=i%nx,z=Math.floor(i/nx);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz,j=zz*nx+xx;if(xx<0||zz<0||xx>=nx||zz>=nz||closed[j]||!clear(j))continue;const cost=costs[i]+step*Math.hypot(dx,dz);if(cost>=costs[j]||!lineClear(point(i),point(j)))continue;costs[j]=cost;parents[j]=i;push([j,cost+distance(point(j),point(goal))]);}
    }
    if(goal!==start&&parents[goal]<0)throw Error('No clear route to this space');
    const raw=[b.slice()];for(let i=goal;i>=0;i=parents[i]){raw.push(point(i));if(i===start)break;}raw.push(a.slice());raw.reverse();
    const simplified=[raw[0]];let i=0;while(i<raw.length-1){let next=raw.length-1;while(next>i+1&&!lineClear(raw[i],raw[next]))next--;simplified.push(raw[next]);i=next;}
    return simplified;
  }
  return {route,lineClear,reset:()=>cache.clear()};
}

export function createGuidedTour({stops,pathfinder,isClear,getPose,setPose,begin,onRoom,onChange,speed=.42,playbackRate=1.5}){
  let state='idle',actions=[],cursor=0,elapsed=0,wallElapsed=0,duration=0,currentStop=0,dirty=false,plan=[],lastFailure=null;
  const turnRate=.42,holdSeconds=3.5;
  const snapshot=()=>({state,elapsed:wallElapsed,duration:wallElapsed+(duration-elapsed)/playbackRate,playbackRate,phase:actions[cursor]?.kind||'idle',currentStop,room:stops[Math.min(currentStop,stops.length-1)].name,progress:duration?Math.min(1,elapsed/duration):0});
  const notify=()=>onChange(snapshot());
  function compile(from,startIndex){
    pathfinder.reset();let p=from.position.slice(),yaw=from.yaw,viewPitch=from.pitch;const result=[],routes=[];
    for(let index=startIndex;index<stops.length;index++){
      const stop=stops[index],route=pathfinder.route(p,stop.position);routes.push({room:stop.name,points:route});
      for(let i=1;i<route.length;i++){
        const q=route[i],len=distance(p,q);if(len<.001)continue;
        const heading=Math.atan2(-(q[0]-p[0]),-(q[1]-p[1])),delta=angleDifference(yaw,heading);
        if(Math.abs(delta)>.005)result.push({kind:'turn',index,position:p.slice(),yaw,delta,pitch:viewPitch,targetPitch:-.12,duration:Math.max(.25,Math.abs(delta)/turnRate)});
        yaw+=delta;viewPitch=-.12;result.push({kind:'move',index,a:p.slice(),b:q.slice(),yaw,pitch:-.12,duration:Math.max(.1,len/speed)});p=q.slice();
      }
      const delta=angleDifference(yaw,stop.yaw);
      result.push({kind:'look',index,position:p.slice(),yaw,delta,pitch:-.12,targetPitch:stop.pitch??-.2,duration:Math.max(.8,Math.abs(delta)/turnRate)});yaw+=delta;
      result.push({kind:'hold',index,position:p.slice(),yaw,pitch:stop.pitch??-.2,duration:holdSeconds});
      viewPitch=stop.pitch??-.2;
    }
    return {actions:result,routes};
  }
  function prepare(restart){
    try{
      if(restart){begin();currentStop=0;elapsed=0;wallElapsed=0;}
      const compiled=compile(getPose(),currentStop);actions=compiled.actions;plan=compiled.routes;cursor=0;
      duration=elapsed+actions.reduce((s,a)=>s+a.duration,0);dirty=false;state='playing';notify();return true;
    }catch(error){lastFailure={message:error.message};state='blocked';notify();return false;}
  }
  const ease=t=>t*t*(3-2*t);
  function tick(dt){
    if(state!=='playing')return;
    let left=Math.max(0,Math.min(dt,.08))*playbackRate;
    while(left>0&&cursor<actions.length){
      const a=actions[cursor];if(!a.started){a.started=true;currentStop=a.index;onRoom(stops[currentStop]);notify();}
      const used=Math.min(left,a.duration-(a.elapsed||0));a.elapsed=(a.elapsed||0)+used;left-=used;const t=Math.min(1,a.elapsed/a.duration);
      let position,yaw,pitch;
      if(a.kind==='move'){position=[a.a[0]+(a.b[0]-a.a[0])*t,a.a[1]+(a.b[1]-a.a[1])*t];yaw=a.yaw;pitch=a.pitch;}
      else{position=a.position;yaw=a.yaw+(a.delta||0)*ease(t);pitch=a.pitch+(a.targetPitch===undefined?0:(a.targetPitch-a.pitch)*ease(t));}
      // Recheck the actual swept step too, including after manual takeover/resume.
      if(!pathfinder.lineClear(getPose().position,position)||!isClear(position)){lastFailure={from:getPose().position,to:position,clear:isClear(position),kind:a.kind,cursor,elapsed};state='blocked';notify();return;}
      setPose({position,yaw,pitch});elapsed+=used;wallElapsed+=used/playbackRate;
      if(t>=1){cursor++;if(a.kind==='hold')currentStop=Math.min(stops.length-1,a.index+1);}
    }
    if(cursor>=actions.length){state='complete';elapsed=duration;notify();}
  }
  return {
    play(){if(state==='playing')return;if(state==='paused'&&!dirty){state='playing';notify();return;}prepare(state!=='paused');},
    pause(manual=false){if(state==='playing'){state='paused';dirty=manual;notify();}else if(state==='paused'&&manual)dirty=true;},
    stop(){state='idle';actions=[];cursor=0;elapsed=0;wallElapsed=0;duration=0;currentStop=0;dirty=false;notify();},
    restart(){prepare(true);},setPlaybackRate(value){if(Number.isFinite(value)&&value>=.5&&value<=2){playbackRate=value;notify();}},tick,snapshot,
    get diagnostic(){return lastFailure},get route(){return plan},get state(){return state},get actions(){return actions.map(({elapsed,...a})=>({...a}))},
  };
}
