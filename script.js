document.addEventListener('DOMContentLoaded', function() {
  // Check if Three.js is loaded properly
  if (typeof THREE === 'undefined') {
    alert('Three.js failed to load. Please check your internet connection and try again.');
    return;
  }
  
  // Global variables
  let scene, camera, renderer, pyramid;
  let isImageLoaded = false;
  
  // DOM elements
  const originalImage = document.getElementById('originalImage');
  const rotateYSlider = document.getElementById('rotateY');
  const rotationValue = document.getElementById('rotationValue');
  const downloadBtn = document.getElementById('downloadBtn');
  const pyramidCanvas = document.getElementById('pyramidCanvas');
  
  // Initialize Three.js scene
  function initThreeJS() {
    try {
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf9f9f9);
      
      // Create camera
      const aspect = pyramidCanvas.clientWidth / pyramidCanvas.clientHeight;
      camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      camera.position.set(2, 2, 5);
      camera.lookAt(0, 0, 0);
      
      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(pyramidCanvas.clientWidth, pyramidCanvas.clientHeight);
      
      // Append renderer to container
      pyramidCanvas.innerHTML = '';
      pyramidCanvas.appendChild(renderer.domElement);
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Initial render
      renderer.render(scene, camera);
      
      console.log('Three.js initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Three.js:', error);
      pyramidCanvas.innerHTML = '<div style="padding: 20px; color: red;">Error initializing 3D renderer. Please try a different browser.</div>';
      return false;
    }
  }
  
  // Handle image upload
  document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Image selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(event) {
      // Display original image
      originalImage.src = event.target.result;
      
      // Create pyramid
      createPyramid(event.target.result);
    };
    
    reader.onerror = function() {
      console.error('Error reading file');
      alert('Error reading the image file. Please try another image.');
    };
    
    reader.readAsDataURL(file);
  });
  
  // Create pyramid with texture
  function createPyramid(imageUrl) {
    console.log('Creating pyramid...');
    
    // Initialize Three.js if not already done
    if (!scene || !camera || !renderer) {
      if (!initThreeJS()) return;
    }
    
    // Remove existing pyramid if any
    if (pyramid) {
      scene.remove(pyramid);
    }
    
    try {
      // Create pyramid geometry
      const geometry = new THREE.ConeGeometry(2, 3, 4, 1);
      
      // Custom UV mapping
      remapUVsForContinuousImage(geometry);
      
      // Load texture
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        imageUrl,
        function(texture) {
          console.log('Texture loaded successfully');
          
          // Create material with texture
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide
          });
          
          // Create mesh
          pyramid = new THREE.Mesh(geometry, material);
          
          // Set initial rotation
          pyramid.rotation.y = Math.PI / 4;
          rotateYSlider.value = 45;
          rotationValue.textContent = '45°';
          
          // Add to scene
          scene.add(pyramid);
          
          // Enable download button
          downloadBtn.disabled = false;
          isImageLoaded = true;
          
          // Render the scene
          renderer.render(scene, camera);
        },
        undefined,
        function(error) {
          console.error('Error loading texture:', error);
          alert('Error creating pyramid. Please try another image.');
        }
      );
    } catch (error) {
      console.error('Error creating pyramid:', error);
      alert('Error creating pyramid. Please try again.');
    }
  }
  
  // Handle rotation change
  rotateYSlider.addEventListener('input', function() {
    rotationValue.textContent = this.value + '°';
    
    if (pyramid) {
      pyramid.rotation.y = (this.value * Math.PI) / 180;
      renderer.render(scene, camera);
    }
  });
  
  // Handle download
  downloadBtn.addEventListener('click', function() {
    if (!isImageLoaded) return;
    
    try {
      // Render the scene
      renderer.render(scene, camera);
      
      // Get the data URL
      const dataURL = renderer.domElement.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'pyramid_image.png';
      link.click();
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Error downloading image. Please try again.');
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (!camera || !renderer) return;
    
    const aspect = pyramidCanvas.clientWidth / pyramidCanvas.clientHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    
    renderer.setSize(pyramidCanvas.clientWidth, pyramidCanvas.clientHeight);
    
    if (scene) {
      renderer.render(scene, camera);
    }
  });
  
  // Custom UV mapping function
  function remapUVsForContinuousImage(geometry) {
    const uvAttribute = geometry.attributes.uv;
    const uvs = uvAttribute.array;
    
    // Define the UV center point
    const uvCenter = { x: 0.5, y: 0.5 };
    
    // Define triangular sections in UV space
    const triangleBases = [
      [0.0, 0.5, 0.5, 0.0],  // Bottom left triangle
      [0.5, 0.0, 1.0, 0.5],  // Bottom right triangle
      [1.0, 0.5, 0.5, 1.0],  // Top right triangle
      [0.5, 1.0, 0.0, 0.5]   // Top left triangle
    ];
    
    // Remap UVs for each face
    for (let face = 0; face < 4; face++) {
      const baseIndex = face * 6;
      
      // Apex UV (center point)
      uvs[baseIndex] = uvCenter.x;
      uvs[baseIndex + 1] = uvCenter.y;
      
      // Base vertices UVs
      const [leftU, leftV, rightU, rightV] = triangleBases[face];
      uvs[baseIndex + 2] = leftU;
      uvs[baseIndex + 3] = leftV;
      uvs[baseIndex + 4] = rightU;
      uvs[baseIndex + 5] = rightV;
    }
    
    // Mark UV attribute as needing update
    uvAttribute.needsUpdate = true;
  }
  
  // Initialize Three.js on page load
  console.log('Initializing application...');
  initThreeJS();
});
