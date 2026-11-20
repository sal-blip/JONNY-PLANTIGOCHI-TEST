// Absolute screen-space angles in radians, positive to the right of down.
// The two links supported by the shoulder can slide on its lip. Beyond that
// lip the chain and weighted ring can rotate all the way around their pins.
const radians = Math.PI / 180;
const hinges = [
  // rest, shoulder stops (or free), link length, flat spring, tilted bias, gravity, drag
  [-55, [-111, -51], 16, 31, 19, 26, 6.9],
  [-57, [-106, -49], 15, 26, 13, 26, 6.0],
  [-22, null,        11, 22,  3, 31, 5.4],
  [-10, null,        11, 19,  2, 31, 5.0],
  [ -5, null,         0, 16,  1, 30, 4.7],
];

export const chainJoints = hinges.map(([rest, stops, length, stiffness, bias, gravity, drag]) => ({
  rest: rest * radians, stops: stops?.map(angle => angle * radians),
  length, stiffness, bias, gravity, drag,
}));

export function restingChain() {
  return chainJoints.map(({rest}) => ({ angle: rest, velocity: 0 }));
}

export function jointRotation(angle, parentAngle = 0) {
  return -(angle - parentAngle) / radians;
}

export function projectedGravity(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const magnitude = Math.hypot(x, y);
  // Lying flat has no in-plane down direction. Avoid magnifying the residual
  // signal and let the links return to their supported side drape.
  if (magnitude < .055) return { x: 0, y: 0 };
  const unit = Math.max(1, magnitude);
  return { x: x / unit, y: y / unit };
}

function signedAngle(value) {
  if (value >= -Math.PI && value <= Math.PI) return value;
  return Math.atan2(Math.sin(value), Math.cos(value));
}

export function stepChain(chain, force, elapsed) {
  if (elapsed <= 0 || !Number.isFinite(elapsed)) return true;
  const dt = Math.min(.05, elapsed);
  const steps = Math.ceil(dt * 120);
  const h = dt / steps;
  // Resting against a horizontal surface provides a stronger restoring
  // force. In the vertical plane, gravity can lift the ring above the eyelet.
  const flat = (1 - Math.min(1, Math.hypot(force.x, force.y))) ** 2;
  let moving = false;

  for (let step = 0; step < steps; step++) {
    moving = false;
    let parentOffset = 0;
    let parentVelocity = 0;
    for (let i = 0; i < chainJoints.length; i++) {
      const joint = chainJoints[i];
      const state = chain[i];
      const offset = signedAngle(state.angle - joint.rest);
      const torque = force.x * Math.cos(state.angle) - force.y * Math.sin(state.angle);
      const restoring = flat * joint.stiffness * offset + (1 - flat) * joint.bias * Math.sin(offset);
      // The first freely hanging link bends over the lip. It couples more
      // loosely to the supported shoulder than its hanging neighbours do.
      const coupling = i === 2 ? 1.1 : 3.2;
      const neighbour = i ? coupling * Math.sin(parentOffset - offset) + .55 * (parentVelocity - state.velocity) : 0;
      const acceleration = joint.gravity * torque - restoring - joint.drag * state.velocity + neighbour;
      state.velocity += acceleration * h;
      state.angle += state.velocity * h;
      const onStop = joint.stops && (state.angle <= joint.stops[0] || state.angle >= joint.stops[1]);
      if (onStop) {
        state.angle = Math.max(joint.stops[0], Math.min(joint.stops[1], state.angle));
        state.velocity = 0;
      } else {
        state.angle = signedAngle(state.angle);
        if (Math.abs(state.velocity) > .008 || Math.abs(acceleration) > .035) moving = true;
      }
      parentOffset = signedAngle(state.angle - joint.rest);
      parentVelocity = state.velocity;
    }
  }
  return moving;
}
