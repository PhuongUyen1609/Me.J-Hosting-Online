// New Three.js setup for scrolling 3D asset
const scrollScene = new THREE.Scene();
const scrollCamera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
const scrollRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
scrollRenderer.setPixelRatio(window.devicePixelRatio);
scrollRenderer.setSize(window.innerWidth, window.innerHeight);
const scrollContainer = document.getElementById('scroll-three-container');
scrollContainer.appendChild(scrollRenderer.domElement);

const scrollAmbientLight = new THREE.AmbientLight(0xffffff, 1);
scrollScene.add(scrollAmbientLight);
const scrollDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scrollDirectionalLight.position.set(5, 5, 5);
scrollScene.add(scrollDirectionalLight);

// Add an environment map for metallic reflections
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
    'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
    'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
]);
scrollScene.environment = envMap;

// Create a clock for animation timing
const clock = new THREE.Clock();

const scrollLoader = new THREE.GLTFLoader();
let scrollModel;
let mixer; // AnimationMixer for playing the GLB animations

scrollLoader.load(
    '/static/3D_Material/turntable_animated4.glb',
    (gltf) => {
        scrollModel = gltf.scene;
        scrollModel.scale.set(1, 1, 1);
        scrollModel.position.set(-2.5, 0, 0);
        scrollModel.rotation.set(Math.PI / 2, 0, 0);

        // Set up animation
        mixer = new THREE.AnimationMixer(scrollModel);
        const animations = gltf.animations;
        if (animations && animations.length > 0) {
            // Play all animations
            animations.forEach((animation, index) => {
                console.log(`Animation ${index}:`, animation.name); // Debug: Log animation names
                const action = mixer.clipAction(animation);
                action.setLoop(THREE.LoopRepeat); // Set to loop indefinitely
                action.play(); // Start the animation
            });
        } else {
            console.warn('No animations found in the GLB file');
        }

        // Optimize textures and materials
        scrollModel.traverse((child) => {
            if (child.isMesh) {
                const material = child.material;
                if (material.isMeshStandardMaterial) {
                    // Adjust non-metallic materials (black parts)
                    if (material.metalness < 0.5) {
                        const baseColor = material.color;
                        const brightness = (baseColor.r + baseColor.g + baseColor.b) / 3;
                        if (brightness < 0.2) {
                            material.color.setRGB(
                                Math.min(baseColor.r + 0.2, 1.0),
                                Math.min(baseColor.g + 0.2, 1.0),
                                Math.min(baseColor.b + 0.2, 1.0)
                            );
                        }
                        material.roughness = Math.max(material.roughness, 0.4);
                        material.emissive.set(0x111111);
                    }
                }
            }
        });

        scrollScene.add(scrollModel);
    },
    undefined,
    (error) => console.error('Error loading scroll model:', error)
);

scrollCamera.position.z = 15;

const scrollMaxScroll = 900;
let scrollTargetX = -2.5;
let scrollTargetRotationX = Math.PI / 2;
let scrollTargetRotationY = 0;
let scrollTargetRotationZ = 0;

function scrollAnimate() {
    requestAnimationFrame(scrollAnimate);
    const delta = clock.getDelta(); // Get time delta for smooth animation

    // Update the animation mixer
    if (mixer) {
        mixer.update(delta);
    }

    // Update scrolling animation (position and rotation of the entire model)
    if (scrollModel) {
        scrollModel.position.x += (scrollTargetX - scrollModel.position.x) * 0.05;
        scrollModel.rotation.x += (scrollTargetRotationX - scrollModel.rotation.x) * 0.05;
        scrollModel.rotation.y += (scrollTargetRotationY - scrollModel.rotation.y) * 0.05;
        scrollModel.rotation.z += (scrollTargetRotationZ - scrollModel.rotation.z) * 0.05;
    }

    scrollRenderer.render(scrollScene, scrollCamera);
}
scrollAnimate();

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (!scrollModel) return;

    if (scrollY <= scrollMaxScroll) {
        const progress = scrollY / scrollMaxScroll;
        scrollTargetX = -2.5 + (5 * progress);
        scrollTargetRotationX = (Math.PI / 2) - ((Math.PI / 2 - Math.PI / 4) * progress);
        scrollTargetRotationY = 0 - ((Math.PI / 6) * progress);
        scrollTargetRotationZ = (Math.PI / 6) * progress;
        scrollContainer.style.top = `${scrollY}px`;
    } else {
        scrollTargetX = 2.5;
        scrollTargetRotationX = Math.PI / 4;
        scrollTargetRotationY = -Math.PI / 6;
        scrollTargetRotationZ = Math.PI / 6;
        scrollContainer.style.top = `${scrollMaxScroll}px`;
    }
});

// Resize event listener
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    scrollCamera.aspect = window.innerWidth / window.innerHeight;
    scrollCamera.updateProjectionMatrix();
    scrollRenderer.setSize(window.innerWidth, window.innerHeight);
});