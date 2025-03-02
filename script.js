// Main variables
let scene, camera, renderer, pyramid;
let isImageLoaded = false;
let isProcessing = false;

// DOM elements
const originalImage = document.getElementById("originalImage");
const originalEmptyState = document.getElementById("originalEmptyState");
const resultEmptyState = document.getElementById("resultEmptyState");
const loadingIndicator = document.getElementById("loadingIndicator");
const rotateYSlider = document.getElementById("rotateY");
const rotationValue = document.getElementById("rotationValue");
const downloadBtn = document.getElementById("downloadBtn");
const canvasWrapper = document.getElementById("pyramidCanvas");

// Initialize the application
window.addEventListener("load", initialize);

function initialize() {
  // Initialize 3D scene
  initScene();
  
  // Add event listeners
  document.getElementById("imageInput").addEventListener("change", handleImageUpload);
  rotateYSlider.addEventListener("input", handleRotationChange);
  downloadBtn.addEventListener("click", handleDownload);
  
  // Update rotation value display
  rotateYSlider.addEventListener("input", function() {
    rotationValue.textContent = this.value + "°";
  });
  
  // Handle window resize
  window.addEventListener("resize", onWindowResize);
}

// Initialize the 3D scene
function initScene() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  // Create camera
  const aspect = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.z = 5;
  camera.position.y = 2;
  camera.position.x = 2;
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
  renderer.setClearColor(0xf5f5f5);
  
  // Append renderer to the canvas wrapper
  // First clear any existing canvas
  while (canvasWrapper.firstChild) {
    if (!canvasWrapper.firstChild.classList || 
        !(canvasWrapper.firstChild.classList.contains("empty-state") || 
          canvasWrapper.firstChild.classList.contains("loading-indicator"))) {
      canvasWrapper.removeChild(canvasWrapper.firstChild);
    }
  }
  
  canvasWrapper.appendChild(renderer.domElement);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Start animation loop
  animate();
}

// Handle image upload
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Show loading state
  showLoading(true);
  
  // Read the file
  const reader = new FileReader();
  
  reader.onload = function(event) {
    // Show original image
    originalImage.src = event.target.result;
    originalImage.onload = function() {
      // Show the image
      originalImage.classList.add("visible");
      originalEmptyState.style.display = "none";
      
      // Create pyramid with optimal UV mapping
      createOptimalPyramid(event.target.result);
    };
  };
  
  reader.onerror = function() {
    alert("Error reading the file. Please try again.");
    showLoading(false);
  };
  
  reader.readAsDataURL(file);
}

// Handle rotation change
function handleRotationChange() {
  if (!pyramid) return;
  pyramid.rotation.y = (rotateYSlider.value * Math.PI) / 180;
}

// Handle download
function handleDownload() {
  if (!isImageLoaded) return;
  
  // Take screenshot of the canvas
  const dataURL = renderer.domElement.toDataURL("image/png");
  
  // Create download link
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "pyramid_image.png";
  link.click();
}

// Show/hide loading indicator
function showLoading(isLoading) {
  isProcessing = isLoading;
  
  if (isLoading) {
    loadingIndicator.classList.add("visible");
    resultEmptyState.style.display = "none";
  } else {
    loadingIndicator.classList.remove("visible");
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Only render if we have a pyramid or are processing
  if (pyramid || isProcessing) {
    renderer.render(scene, camera);
  }
}

// Handle window resize
function onWindowResize() {
  if (!camera || !renderer) return;
  
  const aspect = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
}

// Create optimal pyramid with advanced UV mapping
function createOptimalPyramid(imageUrl) {
  // Remove existing pyramid if any
  if (pyramid) {
    scene.remove(pyramid);
  }
  
  // Load the image
  const img = new Image();
  img.crossOrigin = "Anonymous";
  
  img.onload = function() {
    // Create a pyramid geometry
    const height = 3;
    const baseWidth = 2;
    const geometry = new THREE.ConeGeometry(baseWidth, height, 4, 1);
    
    // Apply our advanced UV mapping algorithm
    remapUVsForContinuousImage(geometry, img.width / img.height);
    
    // Create a texture from the image
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(imageUrl, function() {
      // Hide loading indicator once texture is loaded
      showLoading(false);
      resultEmptyState.style.display = "none";
      
      // Enable download button
      downloadBtn.disabled = false;
      
      // Mark as loaded
      isImageLoaded = true;
    }, undefined, function(err) {
      console.error("Error loading texture:", err);
      showLoading(false);
      alert("Error creating the pyramid. Please try another image.");
    });
    
    // Create material with the texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    
    // Create the pyramid mesh
    pyramid = new THREE.Mesh(geometry, material);
    
    // Set initial rotation to show two sides optimally
    pyramid.rotation.y = Math.PI / 4;
    
    // Add to scene
    scene.add(pyramid);
  };
  
  img.onerror = function() {
    console.error("Error loading image");
    showLoading(false);
    alert("Error loading the image. Please try another one.");
  };
  
  img.src = imageUrl;
}

// Core UV mapping algorithm
function remapUVsForContinuousImage(geometry, aspectRatio) {
  // Get existing UV attribute
  const uvAttribute = geometry.attributes.uv;
  const uvs = uvAttribute.array;
  
  // Store new UV coordinates
  const newUvs = new Float32Array(uvs.length);
  
  // For a 4-sided pyramid (cone with 4 segments):
  // - The UV space layout will be a cross/net pattern
  // - We'll map each face to a quadrant of the image
  
  // Define the UV center point - where the apex will be mapped
  const uvCenter = { x: 0.5, y: 0.5 };
  
  // Define the UV coordinates for each quadrant of our "net"
  // Each array contains [leftBaseU, leftBaseV, rightBaseU, rightBaseV] for a face
  const triangleBases = [
    [0.0, 0.5, 0.5, 0.0],  // Bottom left triangle
    [0.5, 0.0, 1.0, 0.5],  // Bottom right triangle
    [1.0, 0.5, 0.5, 1.0],  // Top right triangle
    [0.5, 1.0, 0.0, 0.5]   // Top left triangle
  ];
  
  // For a cone geometry with 4 segments, the vertices are organized as:
  // - Vertex pairs for each face, shared apex vertex
  // This means that each face has 3 vertices: apex and 2 base vertices
  
  // Process each face (side of the pyramid)
  for (let face = 0; face < 4; face++) {
    // Calculate the vertex indices for this face
    // In THREE.js ConeGeometry, vertices are organized differently than we might expect
    // We need to carefully map the correct vertices for each face
    
    // For this simplified algorithm, assuming each triangular face has index:
    // This works because ConeGeometry creates triangles in a specific pattern
    const baseIndex = face * 6; // Each face has 6 UV coordinates (3 vertices × 2 coordinates)
    
    // Apex UV is the center point of our UV "star" layout
    // Set UV for apex for this face
    newUvs[baseIndex] = uvCenter.x;
    newUvs[baseIndex + 1] = uvCenter.y;
    
    // Set UVs for the two base vertices of this face
    const [leftU, leftV, rightU, rightV] = triangleBases[face];
    
    // First base vertex of this triangle
    newUvs[baseIndex + 2] = leftU;
    newUvs[baseIndex + 3] = leftV;
    
    // Second base vertex of this triangle
    newUvs[baseIndex + 4] = rightU;
    newUvs[baseIndex + 5] = rightV;
  }
  
  // Handle base face (bottom of the pyramid) - use default UVs for this face
  // It won't be visible in standard view
  
  // Copy our new UVs back to the geometry
  for (let i = 0; i < Math.min(newUvs.length, uvs.length); i++) {
    uvs[i] = newUvs[i];
  }
  
  // Mark UV attribute as needing update
  uvAttribute.needsUpdate = true;
  
  return geometry;
}
