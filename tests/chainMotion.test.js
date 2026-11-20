import test from 'node:test';
import assert from 'node:assert/strict';
import { chainJoints, projectedGravity, restingChain, stepChain } from '../src/chainMotion.js';

function settle(chain, x, y, step = 1 / 60) {
  const gravity = projectedGravity(x, y);
  let frames = 0;
  while (frames++ < 1500 && stepChain(chain, gravity, step)) { /* advance to rest */ }
  assert.ok(frames < 1500, 'the tail reaches rest and stops requesting frames');
  return chain;
}

test('face-up noise preserves the neutral side drape', () => {
  assert.deepEqual(projectedGravity(.019, -.024), {x:0, y:0});
  assert.deepEqual(projectedGravity(NaN, 1), {x:0, y:0});
  const chain = restingChain();
  assert.equal(stepChain(chain, {x:0, y:0}, 1 / 60), false);
  assert.deepEqual(chain, restingChain());
});

test('a held tilt moves the ring with inertia and returns it to its neutral pose', () => {
  const chain = restingChain();
  stepChain(chain, {x:1, y:0}, 1 / 120);
  const firstChange = chain.at(-1).angle - chainJoints.at(-1).rest;
  assert.ok(firstChange > 0 && firstChange < Math.PI / 180);
  settle(chain, 1, 0);
  assert.ok(chain.at(-1).angle > .2);
  settle(chain, 0, 0);
  chain.forEach((state, i) => assert.ok(Math.abs(state.angle - chainJoints[i].rest) < .005));
});

// Transform the centre of the actual split ring through all four links.
// Its furthest edge is within 37 drawing units at every rotation.
function ringCenter(chain) {
  let x = 121, y = 185;
  chainJoints.forEach(({length}, i) => {
    x += length * Math.sin(chain[i].angle);
    y += length * Math.cos(chain[i].angle);
  });
  const ring = chain.at(-1).angle;
  return {
    x: x - 3.8 * Math.cos(ring) + 28.5 * Math.sin(ring),
    y: y + 3.8 * Math.sin(ring) + 28.5 * Math.cos(ring),
  };
}

test('the free weighted tail follows absolute gravity even when the phone is inverted', () => {
  const chain = restingChain();
  const upright = ringCenter(settle(chain, 0, 1));
  assert.ok(Math.abs(chain.at(-1).angle) < .1 && upright.y > 235);
  const left = ringCenter(settle(chain, -1, 0));
  assert.ok(chain.at(-1).angle < -1.39);
  const up = ringCenter(settle(chain, 0, -1));
  assert.ok(Math.abs(chain.at(-1).angle) > 2.9 && up.y < 146);
  const right = ringCenter(settle(chain, 1, 0));
  assert.ok(chain.at(-1).angle > 1.39 && right.x - left.x > 90);
  settle(chain, 0, 0);
  chain.forEach((joint, i) => assert.ok(Math.abs(joint.angle - chainJoints[i].rest) < .005));
});

test('all-direction sweeps and abrupt reversals keep the ring clear of the LCD', () => {
  const chain = restingChain();
  const directions = Array.from({length:64}, (_, i) => 2 * Math.PI * i / 64);
  directions.push(0, Math.PI, -.25, Math.PI - .3, Math.PI / 2, -Math.PI / 2);
  for (const angle of directions) {
    const gravity = projectedGravity(Math.sin(angle), Math.cos(angle));
    for (let frame = 0; frame < 1400; frame++) {
      const moving = stepChain(chain, gravity, 1 / 60);
      const {x,y} = ringCenter(chain);
      const dx = Math.max(184 - x, 0, x - 418);
      const dy = Math.max(228 - y, 0, y - 381);
      assert.ok(Math.hypot(dx,dy) > 37, 'outer ring stays clear of the LCD in both axes');
      assert.ok(x > 37 && x < 600-37 && y > 37 && y < 565-37, 'ring stays visible');
      if (!moving) break;
      assert.ok(frame < 1399, 'the moving ring settles');
    }
  }
});

test('a delayed animation frame is integrated with bounded steps', () => {
  const chain = restingChain();
  stepChain(chain, {x:.8, y:-.2}, 8);
  const limited = restingChain();
  stepChain(limited, {x:.8, y:-.2}, .05);
  assert.deepEqual(chain, limited);
});
