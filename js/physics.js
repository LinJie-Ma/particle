// ─── Physics Constants ──────────────────────────────────
export const BALL_COUNT = 400;
export const MAIN_MIN_RADIUS = 0.08;
export const MAIN_MAX_RADIUS = 0.45;

export const MEDIUM_BALL_COUNT = 1000;
export const MEDIUM_MIN_RADIUS = 0.05;
export const MEDIUM_MAX_RADIUS = 0.15;

// ─── Circulation Flow Field ─────────────────────────────
// Fountain pattern: center rises ↑, top spreads out ←→,
// edges descend ↓, bottom converges →← back to center.
export const FLOW_FORCE = 14.0;       // Base flow strength
export const FLOW_HALF_W = 7.0;       // Flow zone half-width
export const FLOW_HALF_H = 8.0;       // Flow zone half-height
export const FLOW_SPEED_SPREAD = 0.5;  // Per-ball speed variation ratio

// Physics
export const DAMPING = 0.997;
export const BOUND_FORCE = 5.0;

// Mouse
export const MOUSE_FORCE = 18.0;
export const MOUSE_RADIUS = 3.5;

// ─── Radius Generation ───────────────────────────────────
export function generateMainRadius() {
  // Power-law: most are small, few are large
  return MAIN_MIN_RADIUS + Math.pow(Math.random(), 3.5) * (MAIN_MAX_RADIUS - MAIN_MIN_RADIUS);
}

export function generateMediumRadius() {
  return MEDIUM_MIN_RADIUS + Math.random() * (MEDIUM_MAX_RADIUS - MEDIUM_MIN_RADIUS);
}

// ─── Mouse State ─────────────────────────────────────────
export const mouseState = { x: 0, y: 0, z: 0, inScene: false };

// ─── Simple hash for per-ball pseudo-random ──────────────
function hash(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) / 2147483648;
}

// ─── Physics Update — Circulation Flow Field ─────────────
export function updatePhysics(balls, dt, elapsed) {
  dt = Math.min(dt, 0.033);

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];

    const xRatio = b.x / FLOW_HALF_W;
    const yRatio = b.y / FLOW_HALF_H;
    const absX = Math.abs(xRatio);

    // ── Desired flow velocity (what the flow "wants" the ball to do) ──
    // angle from 0 (center) to π (edges)
    const angle = Math.min(absX, 1.8) / 1.8 * Math.PI;
    // cos(angle): center=+1(up), edges=-1(down)
    const vyDesired = FLOW_FORCE * Math.cos(angle);

    // Horizontal: spread at top, converge at bottom
    const xStrength = Math.sin(angle);
    const vxDesired = FLOW_FORCE * 0.65 * xStrength * Math.sign(b.x) * Math.tanh(yRatio);

    // ── Per-ball speed multiplier ──
    // Each ball gets a unique speed factor based on its radius and seed.
    // Large balls move ~1.5x faster than small ones; random spread is ±50%.
    const radiusFactor = 0.7 + (b.radius / MAIN_MAX_RADIUS) * 0.8;  // 0.7..1.5
    const seedFactor = 0.5 + hash(b.seedX, b.seedY, 99) * 1.0;      // 0.5..1.5
    const speedMult = radiusFactor * seedFactor;

    // ── Blend current velocity toward desired flow velocity ──
    // This preserves some of each ball's unique velocity while steering it.
    const blend = 3.0 * dt;  // How quickly to steer toward flow (higher = snappier)
    b.vx += (vxDesired * speedMult - b.vx) * blend;
    b.vy += (vyDesired * speedMult - b.vy) * blend;

    // ── Periodic random velocity kick ──
    // Every 0.4~0.9s (unique per ball), give a random velocity nudge
    // This prevents all balls from converging to the same speed.
    const kickInterval = 0.4 + hash(b.seedX, b.seedY, 77) * 0.5;
    const kickPhase = (elapsed * 2.7 + b.seedX) % kickInterval;
    if (kickPhase < dt * 2.7 || kickPhase > kickInterval - dt * 2.7) {
      const kickStr = 1.0 + hash(b.seedX + elapsed, b.seedY, 33) * 2.5;
      const kickAngle = hash(b.seedY, b.seedZ, 44) * Math.PI * 2;
      b.vx += Math.cos(kickAngle) * kickStr;
      b.vy += Math.sin(kickAngle) * kickStr * 0.7;
    }

    // ── Gentle z drift toward 0 ──
    b.vz += (-b.z * 0.6 + (hash(b.seedZ + elapsed * 0.5, b.seedX, 2) - 0.5) * 1.2) * dt;

    // ── Boundary spring ──
    if (Math.abs(b.x) > FLOW_HALF_W * 1.6) {
      b.vx -= Math.sign(b.x) * (Math.abs(b.x) - FLOW_HALF_W * 1.6) * BOUND_FORCE * dt;
    }
    if (Math.abs(b.y) > FLOW_HALF_H * 1.3) {
      b.vy -= Math.sign(b.y) * (Math.abs(b.y) - FLOW_HALF_H * 1.3) * BOUND_FORCE * dt;
    }
    if (Math.abs(b.z) > 3.5) {
      b.vz -= Math.sign(b.z) * (Math.abs(b.z) - 3.5) * BOUND_FORCE * dt;
    }

    // ── Mouse push ──
    if (mouseState.inScene) {
      const dx = b.x - mouseState.x;
      const dy = b.y - mouseState.y;
      const dz = b.z - mouseState.z;
      const md = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (md < MOUSE_RADIUS && md > 0.01) {
        const f = MOUSE_FORCE * (1 - md / MOUSE_RADIUS);
        b.vx += (dx / md) * f * dt;
        b.vy += (dy / md) * f * dt;
        b.vz += (dz / md) * f * dt;
      }
    }

    // ── Recycling ──
    if (b.y > FLOW_HALF_H + 2) {
      // Reached top → respawn near bottom with WIDE speed range
      b.y = -FLOW_HALF_H * 0.6 - Math.random() * 3;
      b.x = (Math.random() - 0.5) * FLOW_HALF_W * 1.2;
      b.z = (Math.random() - 0.5) * 2;
      // Speed varies widely: some lazy, some fast
      const speed = 1.5 + Math.random() * 8.0;  // 1.5..9.5
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle) * speed * 0.4;
      b.vy = Math.abs(Math.sin(angle)) * speed * 0.8 + 1.0;  // mostly upward
      b.vz = (Math.random() - 0.5) * speed * 0.3;
    }
    // Any other out-of-bounds → full random reposition
    if (Math.abs(b.x) > FLOW_HALF_W * 2.5 || Math.abs(b.y) > FLOW_HALF_H * 1.8) {
      b.x = (Math.random() - 0.5) * FLOW_HALF_W * 1.4;
      b.y = (Math.random() - 0.5) * FLOW_HALF_H * 1.4;
      b.z = (Math.random() - 0.5) * 2.5;
      const sp = 2 + Math.random() * 7;
      b.vx = (Math.random() - 0.5) * sp;
      b.vy = (Math.random() - 0.5) * sp;
      b.vz = (Math.random() - 0.5) * sp * 0.3;
    }

    // ── Damping (lighter than before) ──
    b.vx *= DAMPING;
    b.vy *= DAMPING;
    b.vz *= DAMPING;

    // ── Integrate position ──
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    // ── Sync mesh ──
    b.mesh.position.set(b.x, b.y, b.z);
  }

  // ── Ball-ball collision response ──
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = a.radius + b.radius;
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const totalMass = a.mass + b.mass;
        const ra = b.mass / totalMass;
        const rb = a.mass / totalMass;
        const push = overlap * 0.5;
        a.x -= nx * push * ra;
        a.y -= ny * push * ra;
        a.z -= nz * push * ra;
        b.x += nx * push * rb;
        b.y += ny * push * rb;
        b.z += nz * push * rb;
      }
    }
  }
}
