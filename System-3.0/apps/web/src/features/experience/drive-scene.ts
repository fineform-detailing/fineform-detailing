import * as THREE from 'three';
import { createLightDrive } from './drive-light';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { emptyDriveInput, initialDriveState, stepDrive, type DriveAction, type DriveState } from './drive-model';
export type DriveScene = { mode?: '3d' | '2d'; control: (action: DriveAction, pressed: boolean) => void; release: () => void; pause: (value: boolean) => void; reset: () => void; camera: (wide: boolean) => void; dispose: () => void };
export async function createDriveScene(canvas: HTMLCanvasElement, signal: AbortSignal, onReadout: (state: DriveState) => void, onError: () => void): Promise<DriveScene> {
  let disposed = false, paused = false, wide = false;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); }
  catch { return createLightDrive(canvas, signal, onReadout); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d9ded4'); scene.fog = new THREE.Fog('#d9ded4', 55, 120);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 180);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture; room.dispose(); pmrem.dispose();
  const light = new THREE.DirectionalLight('#fff7e9', 3.3); light.position.set(12, 22, 7); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -12; light.shadow.camera.right = 12; light.shadow.camera.top = 12; light.shadow.camera.bottom = -12; light.shadow.normalBias = .035; light.shadow.bias = -.0002; scene.add(light, light.target);
  scene.add(new THREE.HemisphereLight('#f8fffa', '#617466', 2));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(350, 350), new THREE.MeshStandardMaterial({ color: '#aebdb0', roughness: .96 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const court = new THREE.Mesh(new THREE.BoxGeometry(80, .08, 80), new THREE.MeshStandardMaterial({ color: '#e3e3d9', roughness: .88 })); court.position.y = -.025; court.receiveShadow = true; scene.add(court);
  const mint = new THREE.MeshStandardMaterial({ color: '#53c3b1', roughness: .65 });
  const white = new THREE.MeshStandardMaterial({ color: '#f7f7ed', roughness: .9 });
  for (const axis of ['x', 'z'] as const) for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? .18 : 78, .018, axis === 'z' ? .18 : 78), mint); edge.position[axis] = side * 39; edge.position.y = .025; scene.add(edge);
    // Low architectural boundary stays outside the drivable square.
    const wall = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 1 : 84, 1.4, axis === 'z' ? 1 : 84), new THREE.MeshStandardMaterial({ color: '#b6c8b9', roughness: .8 })); wall.position[axis] = side * 43; wall.position.y = .6; wall.castShadow = true; scene.add(wall);
  }
  for (let i = -3; i <= 3; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4, .012, .12), white); stripe.position.set(i * 9, .027, -25); scene.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.z = 25; scene.add(stripe2);
  }
  for (const x of [-33, 33]) for (const z of [-26, -13, 0, 13, 26]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, .12, 24), new THREE.MeshStandardMaterial({ color: '#657e6e' })); base.position.set(x, .07, z); scene.add(base);
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, 1.1, 18), mint); marker.position.set(x, .6, z); marker.castShadow = true; scene.add(marker);
  }
  const vehicle = new THREE.Group(); scene.add(vehicle);
  let state = initialDriveState(), inputs = emptyDriveInput(), last = 0, lastReadout = 0, wheelTurn = 0;
  let wheels: THREE.Object3D[] = [];
  const cameraTarget = new THREE.Vector3(), look = new THREE.Vector3(), desired = new THREE.Vector3();
  const resize = () => {
    if (disposed) return;
    const box = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false);
    camera.aspect = Math.max(1, box.width) / Math.max(1, box.height); camera.updateProjectionMatrix();
    if (paused) renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const resources = () => {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(m); for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v); } });
    textures.forEach(t => { if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); t.dispose(); });
    materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); environment.dispose();
  };
  const release = () => { inputs = emptyDriveInput(); };
  const contextLost = (event: Event) => { event.preventDefault(); release(); renderer.setAnimationLoop(null); onError(); };
  canvas.addEventListener('webglcontextlost', contextLost);
  const dispose = () => { if (disposed) return; disposed = true; release(); observer.disconnect(); renderer.setAnimationLoop(null); canvas.removeEventListener('webglcontextlost', contextLost); resources(); renderer.dispose(); };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/experience/porsche/porsche-930.gltf');
    if (disposed || signal.aborted) {
      scene.add(gltf.scene); resources(); throw new Error('Passeio fechado');
    }
    gltf.scene.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true; mesh.receiveShadow = false;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const m = material as THREE.MeshStandardMaterial;
        if (m.name === 'paint') { m.color.set('#76b4a3'); m.metalness = .72; m.roughness = .24; }
        if (m.name === 'glass') { m.transparent = true; m.opacity = .72; m.depthWrite = false; }
      }
    });
    vehicle.add(gltf.scene);
    wheels = ['wheel-front-left', 'wheel-front-right', 'wheel-rear-left', 'wheel-rear-right'].map(n => gltf.scene.getObjectByName(n)).filter((v): v is THREE.Object3D => !!v);
    vehicle.position.y = .035;
    resize();
    camera.position.set(7, 4, 9); look.set(0, .8, 0); camera.lookAt(look);
    const render = (time: number) => {
      if (disposed || paused || document.hidden) { last = 0; return; }
      const elapsed = last ? (time - last) / 1000 : 0; last = time;
      state = stepDrive(state, inputs, elapsed);
      vehicle.position.set(state.x, .035, state.z); vehicle.rotation.y = state.yaw;
      wheelTurn += state.speed * Math.min(elapsed, .05) / .34;
      wheels.forEach((wheel, index) => { wheel.rotation.order = 'YXZ'; wheel.rotation.x = wheelTurn; wheel.rotation.y = index < 2 ? state.steer : 0; });
      cameraTarget.set(state.x, .8, state.z);
      // A wide calm view and a close following camera; both remain user-selectable.
      const offset = wide ? new THREE.Vector3(14, 18, -17) : new THREE.Vector3(6, 3.5, -9);
      if (state.distance < .05 && !wide) offset.set(7, 4, 9);
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, state.yaw);
      desired.copy(cameraTarget).add(offset); camera.position.lerp(desired, 1 - Math.exp(-Math.min(elapsed, .05) * 3.4)); look.lerp(cameraTarget, .15); camera.lookAt(look);
      light.position.set(state.x + 12, 22, state.z + 7); light.target.position.set(state.x, 0, state.z);
      renderer.render(scene, camera);
      if (time - lastReadout > 100) { onReadout(state); lastReadout = time; }
    };
    renderer.setAnimationLoop(render);
    return {
      control: (action, pressed) => { inputs[action] = pressed; }, release,
      pause: value => { paused = value; release(); last = 0; renderer.setAnimationLoop(value ? null : render); },
      reset: () => { state = initialDriveState(); wheelTurn = 0; release(); vehicle.position.set(0, .035, 0); vehicle.rotation.y = 0; wheels.forEach(w => w.rotation.set(0, 0, 0)); camera.position.set(7, 4, 9); look.set(0, .8, 0); camera.lookAt(look); onReadout(state); renderer.render(scene, camera); },
      camera: value => { wide = value; if (paused) { camera.position.set(state.x + (wide ? 14 : 7), wide ? 18 : 4, state.z + (wide ? -17 : 9)); camera.lookAt(state.x, .8, state.z); renderer.render(scene, camera); } }, dispose,
    };
  } catch (error) { dispose(); throw error; }
}
