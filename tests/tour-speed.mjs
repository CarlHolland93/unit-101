import assert from 'node:assert/strict';
import {createGuidedTour} from '../src/tour.js';
function setup(rate){let p={position:[0,0],yaw:-Math.PI/2,pitch:-.12};return createGuidedTour({stops:[{position:[1,0],yaw:-Math.PI/2,pitch:-.12,name:'Target'}],pathfinder:{reset(){},route:(a,b)=>[a,b],lineClear:()=>true},isClear:()=>true,getPose:()=>p,setPose:q=>p=q,begin(){p={position:[0,0],yaw:-Math.PI/2,pitch:-.12}},onRoom(){},onChange(){},playbackRate:rate})}
const durations=[];
for(const rate of [1,1.5,2]){const t=setup(rate);t.play();const predicted=t.snapshot().duration;let n=0;while(t.state==='playing'&&n++<10000)t.tick(.02);assert.equal(t.state,'complete');assert.ok(Math.abs(t.snapshot().elapsed-predicted)<1e-8);durations.push(predicted);}
assert.ok(Math.abs(durations[0]/durations[1]-1.5)<1e-8);assert.ok(Math.abs(durations[0]/durations[2]-2)<1e-8);
const t=setup(1.5);t.play();t.tick(.04);let time=t.snapshot().elapsed;const duration=t.snapshot().duration;t.setPlaybackRate(2);assert.equal(t.snapshot().elapsed,time);assert.ok(t.snapshot().duration<duration);t.pause();t.tick(.04);assert.equal(t.snapshot().elapsed,time);t.setPlaybackRate(NaN);assert.equal(t.snapshot().playbackRate,2);t.restart();assert.equal(t.snapshot().elapsed,0);console.log('Playback speed ratios, elapsed time continuity, pause and restart checks pass.');
