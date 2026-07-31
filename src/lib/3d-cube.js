import * as THREE from 'three';

export function create3DFloatingLock(container, isLoggedIn) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 4);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  const group = new THREE.Group();
  scene.add(group);
  
  const lockGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
  const lockMaterial = new THREE.MeshPhongMaterial({ 
    color: isLoggedIn ? 0x10b981 : 0x8b5cf6,
    emissive: new THREE.Color(isLoggedIn ? 0x10b981 : 0x8b5cf6).multiplyScalar(0.3),
    shininess: 100
  });
  const lock = new THREE.Mesh(lockGeometry, lockMaterial);
  lock.position.y = 0.3;
  group.add(lock);
  
  const shackleGeometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
  const shackleMaterial = new THREE.MeshPhongMaterial({ 
    color: isLoggedIn ? 0x10b981 : 0x8b5cf6,
    emissive: new THREE.Color(isLoggedIn ? 0x10b981 : 0x8b5cf6).multiplyScalar(0.3),
    shininess: 100
  });
  const shackle = new THREE.Mesh(shackleGeometry, shackleMaterial);
  shackle.rotation.x = Math.PI / 2;
  group.add(shackle);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(3, 4, 5);
  scene.add(directionalLight);
  
  const pointLight = new THREE.PointLight(isLoggedIn ? 0x10b981 : 0x8b5cf6, 0.5);
  scene.add(pointLight);
  
  let frameId = null;
  let rotationY = 0;
  
  function animate() {
    frameId = requestAnimationFrame(animate);
    
    rotationY += 0.008;
    group.rotation.y = rotationY;
    
    const float = Math.sin(Date.now() * 0.002) * 0.03;
    group.position.y = float;
    group.position.x = Math.sin(Date.now() * 0.0015) * 0.02;
    
    pointLight.position.x = Math.sin(Date.now() * 0.003) * 2;
    pointLight.position.y = Math.cos(Date.now() * 0.002) * 2;
    
    const pulseScale = 1 + 0.03 * Math.sin(Date.now() * 0.004);
    lock.scale.set(pulseScale, pulseScale, pulseScale);
    shackle.scale.set(pulseScale, pulseScale, pulseScale);
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  function updateLoggedIn(status) {
    const color = status ? 0x10b981 : 0x8b5cf6;
    lockMaterial.color.set(color);
    lockMaterial.emissive.set(new THREE.Color(color).multiplyScalar(0.3));
    shackleMaterial.color.set(color);
    shackleMaterial.emissive.set(new THREE.Color(color).multiplyScalar(0.3));
    pointLight.color.set(color);
  }
  
  function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  
  function dispose() {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    renderer.dispose();
    lockGeometry.dispose();
    lockMaterial.dispose();
    shackleGeometry.dispose();
    shackleMaterial.dispose();
    container.innerHTML = '';
  }
  
  return { updateLoggedIn, resize, dispose };
}