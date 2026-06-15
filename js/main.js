import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  BALL_COUNT, generateRadius,
  updatePhysics, mouseState,
} from './physics.js';

// ─── Scene ──────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// ─── Orthographic Camera ────────────────────────────────
const frustumSize = 20;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100
);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

// ─── Renderer ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, stencil: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── Environment Map (per-material, reduced intensity) ──
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
const envTexture = pmremGenerator.fromScene(environment).texture;
environment.dispose();
pmremGenerator.dispose();

// ─── Lighting ───────────────────────────────────────────
// Moderate ambient — balls outside the beam still visible with soft fill
scene.add(new THREE.AmbientLight(0x556688, 0.5));

// Top-down narrow spotlight beam
const topSpot = new THREE.SpotLight(0xffffff, 80, 40, Math.PI / 12, 0.4, 0.15);
topSpot.position.set(0, 20, 0);
topSpot.target.position.set(0, 0, 0);
scene.add(topSpot);
scene.add(topSpot.target);

// ─── Mouse Ball (invisible, carries PointLight) ─────────
const mouseBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 16, 12),
  new THREE.MeshBasicMaterial({ visible: false })
);
scene.add(mouseBall);

const mouseLight = new THREE.PointLight(0xffffff, 40, 15);
mouseBall.add(mouseLight);

window.addEventListener('mousemove', (event) => {
  mouseState.inScene = true;
  const curAspect = window.innerWidth / window.innerHeight;
  mouseState.x = ((event.clientX / window.innerWidth) * 2 - 1) * frustumSize * curAspect / 2;
  mouseState.y = (-(event.clientY / window.innerHeight) * 2 + 1) * frustumSize / 2;
  mouseState.z = 0;
  mouseBall.position.set(mouseState.x, mouseState.y, 0);
});

window.addEventListener('mouseleave', () => { mouseState.inScene = false; });

// ─── Ball Material ──────────────────────────────────────
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.18,
  envMap: envTexture,
  envMapIntensity: 0.9,
});

// ─── Create Balls ───────────────────────────────────────
const balls = [];

for (let i = 0; i < BALL_COUNT; i++) {
  const radius = generateRadius();
  const wSeg = radius > 0.35 ? 16 : 8;
  const hSeg = radius > 0.35 ? 12 : 6;
  const geo = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const mesh = new THREE.Mesh(geo, ballMaterial);
  scene.add(mesh);

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = Math.pow(Math.random(), 0.5) * 7.0;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = (Math.random() - 0.5) * 3.0;
  mesh.position.set(x, y, z);

  const speed = 3.0 + Math.random() * 4.0;
  const sTheta = Math.random() * Math.PI * 2;
  const sPhi = Math.acos(2 * Math.random() - 1);

  balls.push({
    mesh,
    radius,
    x, y, z,
    vx: speed * Math.sin(sPhi) * Math.cos(sTheta),
    vy: speed * Math.sin(sPhi) * Math.sin(sTheta),
    vz: speed * Math.cos(sPhi),
    mass: radius * radius * radius,
    seedX: Math.random() * 1000,
    seedY: Math.random() * 1000 + 333,
    seedZ: Math.random() * 1000 + 666,
  });
}

// ─── OrbitControls ──────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enableZoom = true;
controls.enableRotate = true;
controls.minZoom = 0.5;
controls.maxZoom = 3;

// ─── Animation Loop ─────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0;

(function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  elapsed += dt;

  updatePhysics(balls, dt, elapsed);
  controls.update();
  renderer.render(scene, camera);
})();

// ─── Responsive Resize ──────────────────────────────────
window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left = frustumSize * a / -2;
  camera.right = frustumSize * a / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
