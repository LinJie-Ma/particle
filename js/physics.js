import { smoothNoise3D } from './noise.js';

// ─── Physics Constants ──────────────────────────────────
export const BALL_COUNT = 400;
export const MIN_BALL_RADIUS = 0.05;
export const MAX_BALL_RADIUS = 0.6;

export const LINEAR_DAMPING = 0.985;
export const RESTITUTION = 0.6;
export const COLLISION_RESPONSE = 0.8;
export const BOUND_RADIUS = 7.0;
export const BOUND_FORCE = 10.0;
export const MOUSE_FORCE = 20.0;
export const MOUSE_RADIUS = 2.5;
export const NOISE_FORCE = 8.0;

// ─── Radius Generation ───────────────────────────────────

/**
 * Power-law radius distribution.
 * Exponent 3.0 makes most balls small, with a few large ones.
 */
export function generateRadius() {
  return MIN_BALL_RADIUS + Math.pow(Math.random(), 3.0) * (MAX_BALL_RADIUS - MIN_BALL_RADIUS);
}

// ─── Ball Data ───────────────────────────────────────────
// Each ball: { mesh, radius, vx, vy, vz, mass, x, y, z, seedX, seedY, seedZ }

// ─── Physics Update ──────────────────────────────────────
// Mouse state (set externally by main.js)
export const mouseState = {
  x: 0, y: 0, z: 0,
  inScene: false,
};

/**
 * Main physics step — Euler integration with noise-driven self-motion,
 * mouse interaction, boundary, damping, and ball-ball collisions.
 */
export function updatePhysics(balls, dt, elapsed) {
  dt = Math.min(dt, 0.033); // Cap dt to prevent explosion after tab switch

  // ── Per-ball update (velocity integration) ──
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];

    const distToCenter = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
    const invDist = distToCenter > 0.01 ? 1.0 / distToCenter : 0;

    // 1. Noise-driven self-motion (unique seeds per ball)
    const noiseT = elapsed * 0.3;
    const noiseScale = 0.15;
    const nfx = smoothNoise3D(b.x * noiseScale + b.seedX + noiseT, b.y * noiseScale, b.z * noiseScale);
    const nfy = smoothNoise3D(b.x * noiseScale, b.y * noiseScale + b.seedY + noiseT * 0.7, b.z * noiseScale);
    const nfz = smoothNoise3D(b.x * noiseScale, b.y * noiseScale, b.z * noiseScale + b.seedZ + noiseT * 1.3);
    b.vx += nfx * NOISE_FORCE * dt;
    b.vy += nfy * NOISE_FORCE * dt;
    b.vz += nfz * NOISE_FORCE * dt;

    // 2. Mouse push force
    if (mouseState.inScene) {
      const dx = b.x - mouseState.x;
      const dy = b.y - mouseState.y;
      const dz = b.z - mouseState.z;
      const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distToMouse < MOUSE_RADIUS * 3 && distToMouse > 0.01) {
        const pushStrength = MOUSE_FORCE * (1.0 - distToMouse / (MOUSE_RADIUS * 3));
        b.vx += (dx / distToMouse) * pushStrength * dt;
        b.vy += (dy / distToMouse) * pushStrength * dt;
        b.vz += (dz / distToMouse) * pushStrength * dt;
      }
    }

    // 3. Soft boundary push-back
    if (distToCenter > BOUND_RADIUS) {
      const overshoot = distToCenter - BOUND_RADIUS;
      b.vx -= b.x * invDist * overshoot * BOUND_FORCE * dt;
      b.vy -= b.y * invDist * overshoot * BOUND_FORCE * dt;
      b.vz -= b.z * invDist * overshoot * BOUND_FORCE * dt;
    }

    // 4. Damping
    b.vx *= LINEAR_DAMPING;
    b.vy *= LINEAR_DAMPING;
    b.vz *= LINEAR_DAMPING;

    // 5. Update position
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    // 6. Sync to mesh
    b.mesh.position.set(b.x, b.y, b.z);
  }

  // ── Ball-ball collisions ──
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.radius + b.radius;

      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;

        const totalMass = a.mass + b.mass;
        const ratioA = b.mass / totalMass;
        const ratioB = a.mass / totalMass;

        a.x -= nx * overlap * ratioA * COLLISION_RESPONSE;
        a.y -= ny * overlap * ratioA * COLLISION_RESPONSE;
        a.z -= nz * overlap * ratioA * COLLISION_RESPONSE;
        b.x += nx * overlap * ratioB * COLLISION_RESPONSE;
        b.y += ny * overlap * ratioB * COLLISION_RESPONSE;
        b.z += nz * overlap * ratioB * COLLISION_RESPONSE;

        const relVx = a.vx - b.vx;
        const relVy = a.vy - b.vy;
        const relVz = a.vz - b.vz;
        const relVelAlongNormal = relVx * nx + relVy * ny + relVz * nz;

        if (relVelAlongNormal > 0) {
          const impulse = relVelAlongNormal * (1 + RESTITUTION) / totalMass;
          a.vx -= impulse * b.mass * nx;
          a.vy -= impulse * b.mass * ny;
          a.vz -= impulse * b.mass * nz;
          b.vx += impulse * a.mass * nx;
          b.vy += impulse * a.mass * ny;
          b.vz += impulse * a.mass * nz;
        }

        a.mesh.position.set(a.x, a.y, a.z);
        b.mesh.position.set(b.x, b.y, b.z);
      }
    }
  }
}
