import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BALL_COUNT, MEDIUM_BALL_COUNT,
  generateMainRadius, generateMediumRadius,
  updatePhysics, mouseState,
  FLOW_HALF_W, FLOW_HALF_H,
} from './physics.js';

// ─── Scene ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080808);

// ─── Orthographic Camera ────────────────────────────────
const frustumSize = 18;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100
);
camera.position.set(0, 0, 15);
camera.lookAt(0, 0, 0);

// ─── Renderer ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);

// ─── Environment Map ────────────────────────────────────
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
const envTexture = pmremGenerator.fromScene(environment).texture;
environment.dispose();
pmremGenerator.dispose();

// ─── Lighting — bright top-down directional ─────────────
scene.add(new THREE.AmbientLight(0x8899cc, 0.9));
const topLight = new THREE.DirectionalLight(0xffffff, 5.0);
topLight.position.set(0, 12, 0);
scene.add(topLight);
const frontLight = new THREE.DirectionalLight(0xaaccff, 2.5);
frontLight.position.set(0, 0, 12);
scene.add(frontLight);

// ─── Ball Materials ─────────────────────────────────────
const whiteMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.1,
  metalness: 0.0,
  envMap: envTexture,
  envMapIntensity: 1.1,
  emissive: 0x111111,
  emissiveIntensity: 0.4,
});

const grayMat = new THREE.MeshStandardMaterial({
  color: 0xa0a0a0,
  roughness: 0.15,
  metalness: 0.0,
  envMap: envTexture,
  envMapIntensity: 0.7,
  emissive: 0x050505,
  emissiveIntensity: 0.15,
});

// ─── Create Ball ────────────────────────────────────────
const balls = [];

function makeBall(radius) {
  const seg = radius > 0.3 ? 16 : radius > 0.15 ? 12 : 8;
  const geo = new THREE.SphereGeometry(radius, seg, seg);
  const mat = radius > 0.25 ? whiteMat : grayMat;
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Start near bottom-center so they immediately begin the fountain loop
  const x = (Math.random() - 0.5) * FLOW_HALF_W * 0.8;
  const y = -FLOW_HALF_H * 0.5 - Math.random() * FLOW_HALF_H * 0.5;
  const z = (Math.random() - 0.5) * 2;

  // Each ball gets a unique initial speed (wide spread: some lazy, some fast)
  const speed = 2.0 + Math.random() * 9.0;  // 2.0 .. 11.0
  const angle = Math.random() * Math.PI * 2;
  balls.push({
    mesh, radius,
    x, y, z,
    vx: Math.cos(angle) * speed * 0.5,
    vy: Math.abs(Math.sin(angle)) * speed * 0.7 + 1.5,  // bias upward
    vz: (Math.random() - 0.5) * speed * 0.3,
    mass: radius * radius * radius,
    seedX: Math.random() * 1000,
    seedY: Math.random() * 1000,
    seedZ: Math.random() * 1000,
  });
}

for (let i = 0; i < BALL_COUNT; i++) makeBall(generateMainRadius());
for (let i = 0; i < MEDIUM_BALL_COUNT; i++) makeBall(generateMediumRadius());

console.log(`Total balls: ${balls.length}`);

// ─── Mouse tracking ─────────────────────────────────────
window.addEventListener('mousemove', (event) => {
  mouseState.inScene = true;
  const a = window.innerWidth / window.innerHeight;
  mouseState.x = ((event.clientX / window.innerWidth) * 2 - 1) * frustumSize * a / 2;
  mouseState.y = (-(event.clientY / window.innerHeight) * 2 + 1) * frustumSize / 2;
});

window.addEventListener('mouseleave', () => { mouseState.inScene = false; });

// ─── Animation Loop ─────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0;

(function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  elapsed += dt;

  updatePhysics(balls, dt, elapsed);
  renderer.render(scene, camera);
})();

// ─── Resize ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left = frustumSize * a / -2;
  camera.right = frustumSize * a / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
