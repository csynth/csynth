/**
 * test case for texture
 ***/

// provided from outside
var THREE, location, TextureMaterial;

// locals made global for easy debug
var camera, renderer, canvas, rca, controls,
framenum=0, scene, sphere, mat, basemat, phongmat, mesh, searchEval, light1, light2, light3, lighta, lightGroup;

// general initialization of test scope
function textureTestInit() {
    //console.clear();
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    searchEval = unescape(window.location.search.substring(1));

    /** this allows poking behaviour from the search string; eg choice of webgl version */
    try {
        eval(searchEval);
    } catch (e) {
        console.error('err in first eval', e);
    }

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer();
    canvas = renderer.domElement;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color().setRGB(0.2,0.2,0.2));

    document.body.appendChild(renderer.domElement);

    THREE.MOUSE.ROTATE = 0; // ? needed because of different THREE versions???
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.dampingFactor = 0.0;
    controls.rotateSpeed = 3;
    // controls.screenSpacePanning = false;
    window.addEventListener( 'resize', onWindowResize, false );

    scene = new THREE.Scene();
    sphere = new THREE.SphereGeometry(1, 50,50);
    phongmat = new THREE.MeshPhongMaterial({color: 0x808080, shininess: 120});
    basemat = new THREE.MeshPhysicalMaterial({roughness: 0.6, metalness: 0.4});
    mat = new TextureMaterial();
    mesh = new THREE.Mesh(sphere, mat);
    scene.add(mesh);

    lightGroup = new THREE.Group();
    camera.add(lightGroup);         // so lights are attached to camera
    scene.add(camera);
    lighta = new THREE.AmbientLight( 0xffffff, 0.1 ); lightGroup.add(lighta);
    light1 = new THREE.DirectionalLight(THREE.Color.NAMES.white, 0.7); lightGroup.add(light1); light1.position.set(3, 3, 1);
    light2 = new THREE.DirectionalLight(THREE.Color.NAMES.white, 0.3); lightGroup.add(light2); light2.position.set(-4, 0, 1);
    light3 = new THREE.DirectionalLight(THREE.Color.NAMES.white, 0.2); lightGroup.add(light3); light3.position.set(-1, -1, -3);

    try {
        eval(searchEval);
    } catch (e) {
        console.error('err in second eval', e);
    }
    animate();

}
var xax = new THREE.Vector3(1,0,0), yax = new THREE.Vector3(0,1,0), zax = new THREE.Vector3(0,0,1);
var laste = {}, rotspeed = 0.003, wheelspeed = -0.002;

/** make sure camera tracks window changes */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    framenum++;
    controls.update();
    window.requestAnimationFrame(animate);
    renderer.render(scene, camera);                      // normal path
}


window.onload = () => {
    // this is defined within the javascript to make it easier to have different html test files
    // that bring in different versions of three.js etc
    document.body.innerHTML += `
<style>
    input[type="range"] {width: 15em}
    .hhelp { display: none; }
    span:hover + .hhelp { display: block; position: fixed; left:20em;  top: 0; color: red; }
</style>

<div style="z-index:999; position:absolute; left: 1em; top:0; background-color: white; opacity: 80%; overflow: auto; max-width: 20em;">
    shader: three physical<input type="radio" name="shader" onclick="mesh.material = basemat"></button>
    phong<input type="radio" name="shader" onclick="mesh.material = phongmat"></button>
    organic<input type="radio" name="shader" onclick="mesh.material = mat" checked="1"></button>
</div>
`
textureTestInit();
};

