// Set up the Three.js scene
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas") });
renderer.setSize(2000, 2000);


//////////////////////////////////////////////////////
// Load the image using TextureLoader
const loader = new THREE.TextureLoader();
const texture = loader.load("https://threejs.org/examples/textures/crate.gif",function ( tex ) {

// Get the dimensions of the image

const imageWidth = tex.image.width;
const imageHeight = tex.image.height;

// Create a plane with the same dimensions as the image
const geometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
const material = new THREE.MeshBasicMaterial({ map: texture });
const plane = new THREE.Mesh(geometry, material);
// Set the position of the plane in the scene
plane.position.set(-900,900,0);
scene.add(plane);

} );


// Set up the 2D camera
const camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
render();