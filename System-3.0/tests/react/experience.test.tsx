import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDriveInput, initialDriveState, stepDrive, keyAction } from '../../apps/web/src/features/experience/drive-model';
import { stages, stageAt, frameAt } from '../../apps/web/src/features/experience/story';
const advance = (input: ReturnType<typeof emptyDriveInput>, seconds: number, start = initialDriveState()) => { let s = start; for (let i = 0; i < seconds * 60; i++) s = stepDrive(s, input, 1 / 60); return s; };
test('five chapters include the cabin and preserve every exterior frame in order', () => {
 assert.equal(stages.length, 5); assert.equal(stages[0].title + ' ' + stages[0].accent, 'Seu veículo. Em boa forma.');
 stages.forEach((s, i) => assert.equal(stageAt(s.at), i));
 assert.equal(frameAt(0), 0); assert.equal(frameAt(1), 100); assert.equal(frameAt(.65), frameAt(.84));
 let last = -1; for(let i=0;i<=1000;i++) { const f=frameAt(i/1000); assert.ok(f>=last);last=f; }
});
test('accelerator moves the vehicle forward and coasting slows it', () => {
 const s = advance({ ...emptyDriveInput(), accelerate:true }, 2); assert.ok(s.z > 5); assert.ok(s.speed > 5); assert.ok(s.distance > 5);
 const coast = advance(emptyDriveInput(), 1, s); assert.ok(coast.speed < s.speed); assert.ok(coast.distance > s.distance);
});
test('brake stops, reverse engages after stopping, and steering changes course', () => {
 const s = advance({ ...emptyDriveInput(), accelerate:true }, 1);
 assert.equal(advance({ ...emptyDriveInput(), brake:true }, 2, s).speed, 0);
 const reverse = advance({ ...emptyDriveInput(), reverse:true }, 3, s); assert.ok(reverse.speed < 0);
 const turn = advance({ ...emptyDriveInput(), accelerate:true, left:true }, 2); assert.ok(turn.x > 0); assert.ok(turn.yaw > 0);
});
test('boundary and resumed-tab delta cannot throw the car outside the court', () => {
 const s = advance({ ...emptyDriveInput(), accelerate:true }, 40); assert.ok(s.z <= 37); assert.equal(s.speed, 0);
 const jump=stepDrive({...initialDriveState(), speed:10},emptyDriveInput(),60); assert.ok(jump.distance < 1);
 const invalid=stepDrive(initialDriveState(),emptyDriveInput(),Number.NaN); assert.ok(Number.isFinite(invalid.x));
});
test('keyboard controls cover arrows, WASD and braking without hijacking other keys', () => {
 assert.equal(keyAction('KeyW'),'accelerate'); assert.equal(keyAction('ArrowDown'),'reverse'); assert.equal(keyAction('Space'),'brake'); assert.equal(keyAction('Tab'),undefined); assert.equal(keyAction('Escape'),undefined);
 assert.deepEqual(initialDriveState(),{x:0,z:0,yaw:0,speed:0,distance:0,steer:0});
});
