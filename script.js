// Configuración de la escena 3D
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05000a, 0.02);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- 1. Galaxia en Espiral ---
const galaxyParams = {
  count: 12000,
  size: 0.12,
  radius: 25,
  branches: 4,
  spin: 1,
  randomness: 0.5,
  power: 3,
  insideColor: '#ff1493',
  outsideColor: '#9370db'
};

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(galaxyParams.count * 3);
const colors = new Float32Array(galaxyParams.count * 3);

const colorInside = new THREE.Color(galaxyParams.insideColor);
const colorOutside = new THREE.Color(galaxyParams.outsideColor);

for (let i = 0; i < galaxyParams.count; i++) {
  const i3 = i * 3;
  const radius = Math.random() * galaxyParams.radius;
  const spinAngle = radius * galaxyParams.spin;
  const branchAngle = ((i % galaxyParams.branches) / galaxyParams.branches) * Math.PI * 2;

  const randomX = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;
  const randomY = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;
  const randomZ = Math.pow(Math.random(), galaxyParams.power) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;

  positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
  positions[i3 + 1] = randomY;
  positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

  const mixedColor = colorInside.clone();
  mixedColor.lerp(colorOutside, radius / galaxyParams.radius);
  colors[i3] = mixedColor.r;
  colors[i3 + 1] = mixedColor.g;
  colors[i3 + 2] = mixedColor.b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: galaxyParams.size,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true
});

const galaxyPoints = new THREE.Points(geometry, material);
scene.add(galaxyPoints);

// --- 2. Corazón 3D Palpitante ---
const heartGroup = new THREE.Group();
const heartCount = 1500;
const heartGeo = new THREE.BufferGeometry();
const heartPos = new Float32Array(heartCount * 3);

for (let i = 0; i < heartCount; i++) {
  const t = Math.PI * (Math.random() * 2 - 1);
  const u = Math.PI * (Math.random() - 0.5);
  
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  const z = u * 4;

  const scale = 0.35;
  heartPos[i * 3] = x * scale + (Math.random() - 0.5) * 0.3;
  heartPos[i * 3 + 1] = y * scale + (Math.random() - 0.5) * 0.3 + 8;
  heartPos[i * 3 + 2] = z * scale + (Math.random() - 0.5) * 0.3;
}

heartGeo.setAttribute('position', new THREE.BufferAttribute(heartPos, 3));
const heartMat = new THREE.PointsMaterial({
  size: 0.18,
  color: 0xff007f,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.9
});

const heartParticles = new THREE.Points(heartGeo, heartMat);
heartGroup.add(heartParticles);
scene.add(heartGroup);

// --- 3. Textos Flotantes ---
const phrases = [
  "¡FELIZ CUMPLE, KENI!",
  "HOY BRILLAS TÚ",
  "PIDE UN DESEO",
  "CELEBRO TU VIDA",
  "TU DÍA, TU MAGIA",
  "SONRÍE, KENI",
  "UN AÑO MÁS DE LUZ",
  "QUE SOBREN RISAS",
  "SUEÑA EN GRANDE",
  "TE QUIERO, KENI",
  "DIOS TE BENDIGA",
  "ABRAZOS PARA TI",
  "POR MÁS AVENTURAS",
  "¡HOY TODO ES PARA TI!"
];

function createTextCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'Bold 42px Arial';
  // Ajustar cada frase para que no se corte en los bordes de la textura.
  const maxTextWidth = canvas.width - 40;
  const textWidth = ctx.measureText(text).width;
  if (textWidth > maxTextWidth) {
    ctx.font = `Bold ${Math.floor(42 * maxTextWidth / textWidth)}px Arial`;
  }
  ctx.fillStyle = '#ffb6c1';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff1493';
  ctx.shadowBlur = 12;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 15);
  return canvas;
}

const textGroup = new THREE.Group();
phrases.forEach((phrase, index) => {
  const canvas = createTextCanvas(phrase);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(spriteMat);

  const angle = (index / phrases.length) * Math.PI * 2;
  const radius = 12 + Math.random() * 4;
  sprite.position.x = Math.cos(angle) * radius;
  sprite.position.z = Math.sin(angle) * radius;
  sprite.position.y = (Math.random() - 0.5) * 4 + 2;
  sprite.scale.set(8, 2, 1);

  textGroup.add(sprite);
});
scene.add(textGroup);

// Confeti con volumen: piezas que ascienden y giran en los tres ejes.
const confettiCount = window.innerWidth < 600 ? 100 : 180;
const confettiGeometry = new THREE.BoxGeometry(0.16, 0.3, 0.035);
const confettiMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const confetti = new THREE.InstancedMesh(confettiGeometry, confettiMaterial, confettiCount);
confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
confetti.frustumCulled = false;
const confettiDummy = new THREE.Object3D();
const confettiPalette = [0xff82bc, 0xffd879, 0xbda0ff, 0x80e5dc, 0xfff0ce];
const confettiMotion = Array.from({ length: confettiCount }, (_, i) => {
  confetti.setColorAt(i, new THREE.Color(confettiPalette[i % confettiPalette.length]));
  return {
    angle: Math.random() * Math.PI * 2,
    radius: 7 + Math.random() * 19,
    duration: 10 + Math.random() * 12,
    phase: Math.random(),
    spin: 0.5 + Math.random() * 1.4,
    size: 0.6 + Math.random() * 0.9
  };
});
scene.add(confetti);

// Pequeñas chispas luminosas entre las piezas de confeti.
const sparkCanvas = document.createElement('canvas');
sparkCanvas.width = sparkCanvas.height = 32;
const sparkContext = sparkCanvas.getContext('2d');
const sparkGradient = sparkContext.createRadialGradient(16, 16, 0, 16, 16, 16);
sparkGradient.addColorStop(0, '#ffffff');
sparkGradient.addColorStop(0.2, '#ffe5a4');
sparkGradient.addColorStop(1, 'rgba(255, 180, 70, 0)');
sparkContext.fillStyle = sparkGradient;
sparkContext.fillRect(0, 0, 32, 32);
const sparkPositions = new Float32Array(confettiCount * 3);
const sparkGeometry = new THREE.BufferGeometry();
sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
sparkGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({
  map: new THREE.CanvasTexture(sparkCanvas), size: 0.24,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  color: 0xffdbab, opacity: 0.85
}));
sparks.frustumCulled = false;
scene.add(sparks);
const confettiReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function animateConfetti(time) {
  const t = confettiReducedMotion.matches ? 0 : time;
  confettiMotion.forEach((particle, i) => {
    const life = (t / particle.duration + particle.phase) % 1;
    const angle = particle.angle + Math.sin(t * 0.25 + i) * 0.12;
    const x = Math.cos(angle) * particle.radius;
    const z = Math.sin(angle) * particle.radius;
    const y = -5 + life * 29;
    const size = particle.size * Math.min(1, life * 10, (1 - life) * 10);
    confettiDummy.position.set(x, y, z);
    confettiDummy.rotation.set(t * particle.spin + i, t * 0.6 + i, t * 0.8 + i);
    confettiDummy.scale.setScalar(size);
    confettiDummy.updateMatrix();
    confetti.setMatrixAt(i, confettiDummy.matrix);
    sparkPositions[i * 3] = x + Math.sin(t + i) * 0.6;
    sparkPositions[i * 3 + 1] = -6 + ((life + 0.3) % 1) * 31;
    sparkPositions[i * 3 + 2] = z + Math.cos(t + i) * 0.6;
  });
  confetti.instanceMatrix.needsUpdate = true;
  sparkGeometry.attributes.position.needsUpdate = true;
}

// Redimensionar pantalla
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bucle de animación
const clock = new THREE.Clock();
const embeddedFromCake = window.parent !== window && new URLSearchParams(window.location.search).get('from') === 'cake';
let galaxyVisible = !embeddedFromCake;
if (embeddedFromCake) {
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && event.data?.type === 'kenny-galaxy-check') {
      window.parent.postMessage({ type: 'kenny-galaxy-ready' }, '*');
    }
    if (event.source === window.parent && event.data?.type === 'kenny-galaxy-visibility') {
      galaxyVisible = event.data.active === true;
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.parent.postMessage({ type: 'kenny-galaxy-back' }, '*');
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!galaxyVisible || document.hidden) return;
  const elapsedTime = clock.getElapsedTime();
  animateConfetti(elapsedTime);

  galaxyPoints.rotation.y = elapsedTime * 0.05;

  heartGroup.rotation.y = elapsedTime * 0.2;
  const beat = 1 + Math.sin(elapsedTime * 3) * 0.08;
  heartGroup.scale.set(beat, beat, beat);

  textGroup.rotation.y = elapsedTime * 0.03;

  controls.update();
  renderer.render(scene, camera);
}

animate();
if (embeddedFromCake) window.parent.postMessage({ type: 'kenny-galaxy-ready' }, '*');
