// Main variables
let scene, camera, renderer, pyramid;
let isImageLoaded = false;
let needsRender = false; // Flag to track if rendering is needed

// Initialize when the page loads
window.addEventListener('load', init);

function init() {
  // Set up event listeners
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  document.getElementById('rotateY').addEventListener('input', handleRotation);
  document.getElementById('downloadBtn').addEventListener('click', handleDownload);
  
  // Update rotation value display
  document.getElementById('rotateY').addEventListener('input', function() {
    document.getElementById('rotationValue').textContent = this.value + '°';
  });
  
  // Initialize 3D scene
  initScene();
}

function initScene() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9f9f9);
  
  // Create camera
  const canvasContainer = document.getElementById('pyramidCanvas');
  const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(2, 2, 5);
  camera.lookAt(0, 0, 0);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  
  // Clear container and append renderer
  canvasContainer.innerHTML = '';
  canvasContainer.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Do an initial render
  renderer.render(scene, camera);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(event) {
    // Display original image
    const originalImage = document.getElementById('originalImage');
    originalImage.src = event.target.result;
    
    // Create pyramid with the image
    createPyramid(event.target.result);
  };
  
  reader.readAsDataURL(file);
}

function createPyramid(imageUrl) {
  // Remove existing pyramid if any
  if (pyramid) {
    scene.remove(pyramid);
  }
  
  // Create a pyramid geometry
  const geometry = new THREE.ConeGeometry(2, 3, 4, 1);
  
  // Apply custom UV mapping
  customizeUVMapping(geometry);
  
  // Load texture
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(imageUrl, function(texture) {
    // Create material with the texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    
    // Create mesh
    pyramid = new THREE.Mesh(geometry, material);
    
    // Set initial rotation
    pyramid.rotation.y = Math.PI / 4;
    
    // Add to scene
    scene.add(pyramid);
    
    // Enable download button
    document.getElementById('downloadBtn').disabled = false;
    
    // Mark as loaded
    isImageLoaded = true;
    
    // Render the scene once
    requestRender();
  });
}

function customizeUVMapping(geometry) {
  // Get UV attribute
  const uvAttribute = geometry.attributes.uv;
  const uvs = uvAttribute.array;
  
  // Define new UVs for better image wrapping
  const newUVs = [
    // Face 0
    0.5, 0.5,  // Apex
    0.0, 1.0,  // Base left
    1.0, 1.0,  // Base right
    
    // Face 1
    0.5, 0.5,  // Apex
    0.0, 0.0,  // Base left
    1.0, 0.0,  // Base right
    
    // Face 2
    0.5, 0.5,  // Apex
    0.0, 1.0,  // Base left
    1.0, 1.0,  // Base right
    
    // Face 3
    0.5, 0.5,  // Apex
    0.0, 0.0,  // Base left
    1.0, 0.0   // Base right
  ];
  
  // Apply new UVs
  for (let i = 0; i < Math.min(newUVs.length, uvs.length); i++) {
    uvs[i] = newUVs[i];
  }
  
  // Mark as needing update
  uvAttribute.needsUpdate = true;
}

function handleRotation() {
  if (!pyramid) return;
  const angle = document.getElementById('rotateY').value * (Math.PI / 180);
  pyramid.rotation.y = angle;
  
  // Request a render when rotation changes
  requestRender();
}

function handleDownload() {
  if (!isImageLoaded) return;
  
  // Ensure latest state is rendered before taking screenshot
  renderer.render(scene, camera);
  
  // Take screenshot
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  // Create download link
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'pyramid_image.png';
  link.click();
}

// Request a single render - replaces the continuous animation loop
function requestRender() {
  if (!needsRender) {
    needsRender = true;
    requestAnimationFrame(renderOnce);
  }
}

// Render once and reset the render flag
function renderOnce() {
  renderer.render(scene, camera);
  needsRender = false;
}

function onWindowResize() {
  const canvasContainer = document.getElementById('pyramidCanvas');
  const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
  
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  
  // Request a render after resize
  requestRender();
}
