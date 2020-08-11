var CSynth, THREE, camera, V, planeg;

//loosely based on https://github.com/fernandojsg/aframe-teleport-controls/blob/master/index.js
//we just want a simple circular region for now, which makes things a little simpler.
//may as well make a curved arc, although main practical reason for that is to allow 'jumping'
function Teleport() {
    const me = this;

    this.radius = 300;
    let _active = false;
    Object.defineProperty(this, 'active', {
        get: ()=> {return _active},
        set: (val) => {
            if (val !== _active) {
                _active = val;
                this.threeObj.visible = val;
            }
        }
    });

    const group = this.threeObj = new THREE.Group();
    group.name = 'teleport group';
    V.rawscene.add(group);
    const plane = planeg(100000, 100000, 2, 2);
    const mat = new THREE.MeshBasicMaterial({opacity: 0.1, transparent: true});
    mat.side = THREE.DoubleSide;
    mat.depthWrite = false;
    group.add(new THREE.Mesh(plane, mat));
    group.position.y = -3500;
    group.rotateX(Math.PI/2);

    this.active = false;
    const raycaster = new THREE.Raycaster();
    const hitPoint = new THREE.Vector3();

    let currentGP = null;

    this.thumbPress = (gp) => {
        this.active = true;
        currentGP = gp;
    }

    this.thumbRelease = (gp) => {
        if (gp !== currentGP) return;
        this.active = false;
        //teleport if currentHitValid
        if (currentHitValid()) {
            camera.position.x = hitPoint.x;
            camera.position.y = hitPoint.y;
            //hands need to move as well.
        }

    }

    function tick() {
        if (!_active) return;
        //set hitPoint to the result of raycaster -> plane
        //raycaster.set(gp.rayMatrix)
        const intersects = raycaster.intersectObjects([plane], true);
        //if (!intersects[0]) ; // we won't intersect if pointing up
        if (intersects.length > 0) {
            const p = intersects[0].point;
            hitPoint.set(p.x, p.y, p.z);
        }

        //change color depending on currentHitValid()
    }

    function currentHitValid() {
        return isValidPoint(hitPoint.x, hitPoint.y);
    }
    function isValidPoint(x, y) {
        return x*x + y*y < me.radius*me.radius;
    }
}
