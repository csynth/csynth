var V, CSynth, posturi, xyzReader, THREE, random, seed, log, col3, dat, GLmolX, VEC3, vec3, msgfix, msgfixerror, msgfixlog,
    toKey, newmeshN, canvas, I, XX, onframe, Maestro;
// var consoleTime, consoleTimeEnd;

function Poly(..._points) {
    let me = this;
    me.points = _points;

    /** cut points by a plane */
    me.cut = function polycut(plane) {
        const points = me.points;
        const v = points.map(p => plane.pointDist(p));
        const r = [];   // new set of points
        const pl = points.length;
        for (let i = 0; i < pl; i++) {
            const i1 = (i+1)%pl;
            const vi = v[i], vi1 = v[i1];
            const pi = points[i], pi1 = points[i1];

            if (vi > 0) {
                r.push(pi);
                if (vi1 < 0) {
                    r.push(pi.clone().lerp(pi1, -vi/(vi1-vi)))
                }
            } else {
                if (vi1 > 0) {
                    r.push(pi.clone().lerp(pi1, -vi/(vi1-vi)))
                }

            }
        }
        me.points = r;
    };
}

/** plane with direction dir through point p, or at dist p */
function Plane(_dir, _p = _dir, icolor = col3().setHSV( Math.random(), 1, 0.5)) {
    let me = this;
    me.isPlane = true;
    me.color = icolor;
    me.enabled = true;
    let dir = me.dir = _dir.clone().normalize();
    let dist, point, poly;
    if (typeof _p === 'number') {
        dist = _p;
        point = dir.clone().multiplyScalar(dist);
    } else {
        dist = dir.dot(_p);
        point = _p;
    }
    me.dist = dist; me.point = point;

    /** restore the full poly after processing */
    me.fullPoly = function plane_fullPoly() {
        const d1 = VEC3(77777, 55555, 33333).cross(dir);
        const d2 = d1.clone().cross(dir);
        poly = me.poly = new Poly(point.clone().add(d1).sub(d2), point.clone().sub(d1).sub(d2), point.clone().add(d2))
    }
    me.fullPoly();

    me.pointDist = function plane_pointDist(p) {
        return dist - p.dot(dir);
    }

    // for each plane in a set, cut its polygon
    me.cutPlanes = function plane_cutPlanes(planes) { // no, rely on reduceSet, thresh = 0.001) {
        planes.forEach(p => {
            if (p === me || (p.source && p.source.plane === me && p.source.symnum === 0)) { //  && me.dir.dot(p.dir) < 1 - thresh)
            } else {
                poly.cut(p);
            }
        });
    }

    // draw me into a bundle
    me.draw = function plane_draw(b) {
        const p = poly.points;
        const pl = p.length;
        for (let i=0; i < pl-2; i++) {
            for (let j=i; j < i+3; j++) {
                const jj = j === i ? 0 : j;
                const ppoint = p[jj];
                b.normals.push(dir.x, dir.y, dir.z);
                b.colors.push(me.color.r, me.color.g, me.color.b);
                b.positions.push(ppoint.x, ppoint.y, ppoint.z);
                if (Plane.setuvs) {
                    b.uvs.push( Math.sin(2*Math.PI * jj/pl)*0.5+0.5, Math.cos(2*Math.PI * jj/pl)*0.5+0.5);
                }
            }
        }
    }
    // return transformed clone, m assumed rotation for now, keep track of original
    me.transform = function plane_transform(m, col = me.color, symnum=undefined) {
        const tdir = dir.clone().applyMatrix4(m);
        const p = new Plane(tdir, dist, col);
        p.source = {plane: me, matrix: m, symnum};
        return p;
    }
}

// reduce the planes by removing duplicates
Plane.reduceSet = function plane_reduceSet(pset, thresh = Plane.reduceSet.thresh) {
    const rs = [];
    pset.forEach(plane => {
        if (rs.every( r => r.dir.dot(plane.dir) < 1 - thresh))
            rs.push(plane);
    });
    msgfixlog('reduceSet', pset.length, rs.length); // log('.reduced to', rs.length);
    return rs;
}
Plane.reduceSet.thresh = 1 - Math.cos(2*Math.PI/180); // 2 degrees

// coerce p to Plane
Plane.xxxPlane = function plane_xxxPlane(p) {
    if (!p) return p;
    let pp = p;
    if (p.isPlane) pp = p;
    else if (p.a !== undefined) pp = Plane.ab2Plane(p);
    else if (p.x !== undefined) pp = new Plane(VEC3(p.x, p.y, p.z), p.size);
    else msgfixerror('cannot convert to plane', p);

    if (p.r !== undefined) pp.color = col3(p.r, p.g, p.b);
    else if (p.col !== undefined) pp.color = p.col;

    if (!pp.provenance) pp.provenance = p;

    return pp;
}

Plane.drawSetGroups = {};
Plane.drawSetLog = msgfix;
Plane.drawSet = function plane_drawSet(ppset, id = toKey(ppset), defs=undefined) {
    // consoleTime('drawSet');
    let pset = ppset;
    if (pset.a !== undefined) pset = Plane.ab2Plane(pset);
    if (pset.x !== undefined) pset = new Plane(pset);
    // if we have just one plane, use symmetry to replicate it   ... ? we do this at lower level anyway ???
    if (!Array.isArray(pset)) {
        const qpset = pset;
        pset = Plane.xxxPlane(pset);
        pset = CSynth.symMatrix.map((m,i) => pset.transform(m, CSynth.symCol[i], i));
        pset = Plane.reduceSet(pset);
        pset.keyPlanes = [qpset];
    } else {
        pset = pset.map(p => Plane.xxxPlane(p));
    }
    Plane.processSet(pset);
    // consoleTimeEnd('drawSet', 'processed', Plane.drawSetLog);


    // create top level plane group/gui j.i.t.
    if (!Plane.planegroup) {
        Plane.planegroup = new THREE.Group(); Plane.planegroup.name = 'planegroup';
        CSynth.rawgroup.add(Plane.planegroup);
        const pgui = CSynth.planegui = dat.GUIVR.createX('planes');
        V.gui.add(pgui);
        pgui.add(Plane.planegroup, 'visible').listen().showInFolderHeader();
    }
    if (!Plane.drawSetGroups[id]) {
        const group = Plane.drawSetGroups[id] = new THREE.Group(); group.name = 'planegroup_' + id;
        // group.visible = false;
        Plane.planegroup.add(group);
        const vgui = group.vgui = dat.GUIVR.createX(id);
        CSynth.planegui.add(vgui);
        vgui.add(group, 'visible').listen().showInFolderHeader();
        const options = {
            get scale() { return group.scale.x},
            set scale(v) {group.scale.set(v,v,v)}
        }
        vgui.add(options, 'scale', 0, 2).step(0.01).listen();
    }

    const group = Plane.drawSetGroups[id];
    group.pset = pset;
    // consoleTimeEnd('drawSet', 'ready to draw', Plane.drawSetLog);
    Plane.drawProcessedSet(pset, id, group, group.vgui);
    // consoleTimeEnd('drawSet', 'planes drawn', Plane.drawSetLog);
    Plane.drawProcessedSetCyl(pset, id, group, group.vgui, defs);
    // consoleTimeEnd('drawSet', 'cylinders drawn', Plane.drawSetLog);
    return group;
}

/** for all elements cut with all others, each plane in pset gets its poly reduced accordingly */
Plane.processSet = function plane_processSet(pset, refine = true) {
    // consoleTime('processSet');
    if (pset.keyPlanes) {  // compute cuts just on reference planes
        pset.keyPlanes.forEach(kp => kp.fullPoly());
        // consoleTimeEnd('processSet','restore poly', Plane.drawSetLog);
        pset.keyPlanes.forEach(kp => kp.cutPlanes(pset));
        msgfix('polygon sides ' + pset.keyPlanes.length, pset.keyPlanes.map(kp => kp.poly.points.length).join(', '))
        // consoleTimeEnd('processSet','cut keyPlanes', Plane.drawSetLog);
        pset.forEach(p => { // and copy the transformed polys from reference planes
            const s = p.source.plane.poly.points;
            let m = p.source.matrix;
            // m = mat4();
            p.poly.points = [];
            for (let i = 0; i < s.length; i++)
                p.poly.points[i] = s[i].clone().applyMatrix4(m);
        })
        // consoleTimeEnd('processSet','apply symmetry', Plane.drawSetLog);
    } else {
        pset.forEach(p => p.cutPlanes(pset));
    }
    // consoleTimeEnd('processSet','main', Plane.drawSetLog);
    if (refine) Plane.mergePoints(pset);
    // consoleTimeEnd('processSet','refine', Plane.drawSetLog);
    return pset;
}

Plane.drawnCylMeshes = {};
Plane.drawProcessedSetCyl = function Plane_drawProcessedSetCyl(pset, id, pgroup, pgui, defs = {}) {
    let mesh = Plane.drawnCylMeshes[id];
    let _rad = defs.tilerad || 1, _sprad = defs.tilesprad || 0; // _rad;

    if (!mesh) {
        const mat = pgroup.cylmat = CSynth.defaultMaterial.clone();
        mat.side = THREE.DoubleSide;
        mat.vertexColors = 2;
        mat.metalness = 1;
        mat.roughness = 0.3;
        mesh = Plane.drawnCylMeshes[id] = new THREE.Mesh(undefined, mat); mesh.name = 'planecylmesh';
        pgroup.add(mesh);
        const vgui = dat.GUIVR.createX('edges');
        pgui.add(vgui);
        const o = {
            get visible() { return mesh.visible},
            set visible(v) { mesh.visible = v; redraw(); },
            get rad() { return _rad },
            set rad(v) { _rad = v; redraw(); },
            get sprad() { return _sprad },
            set sprad(v) { _sprad = v; redraw(); }
        }
        vgui.add(o, 'visible').listen().showInFolderHeader();
        vgui.add(o, 'rad',0, 5).step(0.1).listen();
        vgui.add(o, 'sprad',0, 5).step(0.1).listen();
        CSynth.materialGui(mat, vgui);
    }
    if (!mesh.visible) return;

    function redraw() {
        pset = Plane.drawSetGroups[id].pset;
        const targ = CSynth.startGeom();
        //+ replace window.cylinderMesh with CSynth.drawCyl; more efficient merge
        //+ Still a ??? bug in CSynth.drawCyl, sometimes misses some altogether ???
        //+ const geom = new THREE. Geometry();
        pset.forEach(plane => {
            plane.poly.points.forEach( (p, i, ppp) => {
                const o = ppp[(i+1)%ppp.length];
                //+ const c = window.cylinderMesh(p, o, _rad);
                //+ c.updateMatrix();
                //+ geom.merge(c.geometry, c.matrix);
                //+ c.geometry.dispose();
                CSynth.drawCyl(targ, p, o, -999,-999, _rad);
                if (_sprad !== 0) {
                    //+ const s = new THREE.Mesh(new THREE.SphereGeometry(_sprad, 12, 6));
                    //+ s.position.copy(p);
                    //+ s.updateMatrix();
                    //+ geom.merge(s.geometry, s.matrix);
                    CSynth.drawCyl(targ, p, p, -999,-999, _sprad);
                }
            });
        });
        mesh.geometry.dispose();
        const geom2 = CSynth.finishGeom(targ);
        mesh.geometry = geom2;
    }
    redraw();
}


Plane.drawnMeshes = {};
Plane.setuvs = false;
Plane.drawProcessedSet = function Plane_drawProcessedSet(pset, id, pgroup, pgui) {
    const b = {positions: [], normals: [], colors: [], uvs: []};
    pset.forEach(p => {
        p.draw(b);
    });
    // log('size', b.positions.length);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.positions), 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(b.normals), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.colors), 3));
    if (Plane.setuvs) {
        geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b.uvs), 2));
        // temp setup of texture to use with uvs
        if (!Plane.canvastexture) {
            Plane.canvastexture = new THREE.Texture(canvas, undefined, undefined, undefined, undefined, THREE.LinearFilter)
            Plane.canvastexture.generateMipmaps = false;
            Maestro.on('preframe', () => {Plane.canvastexture.needsUpdate = true; return 0});
        }
    }

    if (!Plane.drawnMeshes[id]) {
        const mat = CSynth.defaultMaterial.clone();
        mat.map = Plane.canvastexture;
        mat.side = THREE.DoubleSide;
        mat.vertexColors = 2;
        const mesh = Plane.drawnMeshes[id] = new THREE.Mesh(geom, mat); mesh.name = 'planemesh';
        mesh.visible = true;
        pgroup.add(mesh);
        const vgui = dat.GUIVR.createX('faces');
        pgui.add(vgui);
        vgui.add(mesh, 'visible').listen().showInFolderHeader();
        CSynth.materialGui(mat, vgui);
    } else {
        // geom.dispose();
        Plane.drawnMeshes[id].geometry.dispose();
        Plane.drawnMeshes[id].geometry = geom;
    }
    return b;
}

/** find a point in a set (array) of points;
 * NOT optimized
 * does not apply for 'gradual' merge of closish points just outside thresh
 * first in is definitive point, no averaging */
Plane.findPoint = function Plane_findPoint(point, pointset, thresh = Plane.findPoint.thresh) {
    for (let i=0; i<pointset.length; i++) {
        if (point.distanceTo(pointset[i]) < thresh) {
            const l = pointset[i].users.length;
            pointset[i].lerp(point, 1/(l+1));
            return i;
        }
    }
    pointset.push(point);
    point.users = [];
    return pointset.length - 1;
}
Plane.findPoint.thresh = 1;

Plane.mergePoints = function Plane_mergePoints(planeset, thresh) {
    const pointset = [];
    planeset.forEach(plane => {
        const newppp = [];
        plane.poly.points.forEach( (point, i, ppp) => {
            const ind = Plane.findPoint(point, pointset, thresh);
            const newp = pointset[ind];
            let u = newp.users;
            if (u[u.length-1] !== plane) {
                newppp.push(newp);
                u.push(plane);
            }
        });
        plane.poly.points = newppp;
    });
    return pointset;
};

CSynth.planesForFixed = function CSynth_planesForFixed(points = CSynth.current.fixedPointsData.coords, pgroup = CSynth.rawgroup) {
    const planes = points.map(p => new Plane(p));
    return Plane.drawSet(planes, 'planesFixed');
};
Plane.phi = (1 + Math.sqrt(5)) / 2;


CSynth.makeSymMatrix = function CSynth_makeSymMatrix ( {m5 = 1, m3 = 1, m2 = 1, m2x = 1} = {}) {

    // ax is array for vector, r is 0..1
    function mr(ax,r) {
        const ang = r * 2 * Math.PI;
        return new THREE.Matrix4().makeRotationAxis(ax, ang);
    }


    // todo: clean up code below, and maybe work out proper rules for exactly which axes/orders to use
    // vertices at (+-1, 0, +-phi) with 3 axis rotations, 12 vertices
    // edge centres at (+-1, 0,0) with 3 axis rotations, 6 edges of 30
    // face centres at
    var phi = Plane.phi;
    var vx = [1, phi, 0];          // vertices at (+-1, 0, +-phi) with 3 axis rotations, 12 vertices
    var ce1 = [0,1,0]               // edge centres at (+-1, 0,0) with 3 axis rotations, 6 edges of 30
    var ce2 = [0,0,1]               //
    var cf = [2*phi + 1, phi, 0]   // centre of face, 5 fold

    if (!Plane.axis5) {
        Plane.axis5 = VEC3(vx).normalize();
        Plane.axis2 = VEC3(ce1).normalize();
        Plane.axis2x = VEC3(ce2).normalize();
        Plane.axis3 = VEC3(cf).normalize();
    }

    const sym60 = [], sym20 = [], sym12 = [], symCol = [];
    // const symMatrix = CSynth.symMatrix = CSynth.sym60 = [];
    //CSynth.sym20 = [];
    //CSynth.sym12 = [];
    // const symCol = CSynth.symCol = [];
    const min = Math.min; let ci, cj, ck, cl;
    for (let i=0; i<5; i++) {
        const mi = mr(Plane.axis5, ci = min(m5, i/5));
        for (let j=0; j<2; j++) {
            const mj = mr(Plane.axis2, cj = min(m2, j/2)).multiply(mi);
            for (let k=0; k<3; k++) {
                const mk = mr(Plane.axis3, ck = min(m3, k/3)).multiply(mj);
                for (let l=0; l<2; l++) {
                    const ml = mr(Plane.axis2x, cl = min(m2x, l/2)).multiply(mk);
                    sym60.push(ml);
                    if (i === 0) sym12.push(ml);
                    if (k === 0) sym20.push(ml);
                    symCol.push(col3().setHSV( 2*ci/12, (3-ck)/3, cj ? 1 : 0.5));   // rgb  (i/5, (j+2*l)/4, k/3));
                }
            }
        }
    }
    symCol[0] = col3(1,1,1);
    return {sym60, sym12, sym20, symCol};
};
onframe( () => {    // defer to make sure code ready
    Object.assign(CSynth, CSynth.makeSymMatrix());
    CSynth.symMatrix = CSynth.sym60;
})

Plane.dodeca = function(rad = 120) {
    return Plane.drawSet(new Plane(VEC3(1, Plane.phi, 0), rad), 'dodeca');
}
Plane.icosa = function(rad = 120) {
    return Plane.drawSet(new Plane(VEC3(2*Plane.phi + 1, Plane.phi, 0), rad), 'icosa');
    // also (1,1,1)
}
Plane.varying = function(rad = 120, _a = 1, _b = 0) {
    // GX.setValue('planes/varying/b', 0.47404), a=-1 => b = 0.47403
    // b=0 => reflective symmetry ?
    // b=0, a=0 =? 30 rhombic faces
    // b=0, a=1 => 12 dodeca
    // b=0, a=(0..2.3) => 60 flattish trianges
    // b=0, a=2.3 => icosa
    // b=0, a=(2.3..74) => 60 trianges, 5/6 points, http://dmccooey.com/polyhedra/GeodesicIcosahedron1.html
    // b=0, a=74 => 30 rhombus
    //
    // b=1 => 20 icosa  (for all a)
    //
    // b=0.5, a=-0.54 => 60 triangles, 5/6
    // b=0.28, a=0.61 => 60 kites
/**
Plane.drawSet(ps, 'test')
ps = Plane.ab2Symset( {a:0, b:1, size:100}, {a:1, b:0, size:100} );  // pentagons and skew hexagons
ps = Plane.ab2Symset( {a:0, b:1, size:100}, {a:1, b:0, size:91} );  // pentagons and triangles
ps = Plane.ab2Symset( {a:0, b:1, size:100}, {a:1, b:0, size:103} );  //  pentagons and hexagons

for m2
[0,0,1] {x: 0.04055267362709794, y: -0.03675086047455754, z: -0.9985013044138068}
[0.9, 0, 1] {x: -0.6609684650457107, y: 0.0009524041283079861, z: -0.7504130736744221}

for sv40,
'VEC3(0.2513371433701104,0.12525245406957677,0.9597611489907796),'
- 'VEC3(0.1891108257097499,0.03809767599393234,0.9812164199009502),'
- 'VEC3(0.04801557548209985,0.09522326972486046,0.994297256062808),'
- 'VEC3(0.20291581336432643,0.25646152529514865,0.9450146341353556),'
- 'VEC3(0.07198333728860995,0.24674592617627578,0.9664030458707206),'
- 'VEC3(-0.0411914729612081,0.4117906286073912,0.9103470441246106),'

later sv40
[empty × 3,
"{x: -0.191, y: 0.628, z: -0.755, isVector3: true}",
"{x: -0.322, y: 0.806, z: -0.497, isVector3: true}",
"{x: -0.475, y: 0.640, z: -0.604, isVector3: true}"]
by Q,S
planes = []
planes[3] = new Plane(VEC3({x: 0.12830686738693314, y: -0.6644331162403165, z: 0.7362513034450491}), 100)
planes[3] = new Plane(VEC3({x: 0.125, y: -0.666, z: 0.736, isVector3: true}), 100)
planes[3] = new Plane(VEC3({x: -0.191, y: 0.628, z: -0.755, isVector3: true}), 100)
planes[4] = new Plane(VEC3({x: 0.34083530631228376, y: -0.802403572106228, z: 0.48987733305612}), 100)
planes[5] = new Plane(VEC3({x: 0.46298948714511445, y: -0.6971920725841446, z: 0.5473243542168835}), 100)
useplanes()
...
"{x: -0.180, y: 0.630, z: -0.755, isVector3: true}",
"{x: -0.312, y: 0.808, z: -0.500, isVector3: true}",
"{x: -0.478, y: 0.654, z: -0.586, isVector3: true}"]
...
"{x: -0.201, y: 0.637, z: -0.744, isVector3: true}",
"{x: -0.308, y: 0.810, z: -0.499, isVector3: true}",
"{x: -0.471, y: 0.651, z: -0.595, isVector3: true}"]

{}

 */


    const dir = VEC3(1,0,0);
    const group = Plane.drawSet(new Plane(dir, rad), 'varying'); // just to get established
    const options = {
        get a() {return _a; },
        set a(v) {_a = v; redraw(); },
        get b() {return _b; },
        set b(v) {_b = v; redraw(); },

        get x() {return dir.x; },
        set x(v) {dir.x = v; redrawxyz(); },
        get y() {return dir.y; },
        set y(v) {dir.y = v; redrawxyz(); },
        get z() {return dir.z; },
        set z(v) {dir.z = v; redrawxyz(); }
    }
    group.vgui.add(options, 'a', -1,1).listen().step(0.01);
    group.vgui.add(options, 'b', 0,1).listen().step(0.01);
    group.vgui.add(options, 'x', -1,1).listen().step(0.01);
    group.vgui.add(options, 'y', -1,1).listen().step(0.01);
    group.vgui.add(options, 'z', -1,1).listen().step(0.01);
    function redraw() {
        dir.copy(Plane.ab2Dir({a:_a, b:_b}));
        redrawxyz();
    }

    function redrawxyz() {
        const plane = new Plane(dir, rad);
        Plane.drawSet(plane, 'varying');
        I.point('PV', plane);
    }
    return group;
}

/** convert a,b coordinates to direction coordinates */
Plane.ab2Dir = function({a=0, b=0, size=1}) {
    const phi = Plane.phi;

    // var v2 = VEC3(0, 1, 0);
    // var v5 = VEC3(1, phi, 0); v5.multiplyScalar(1/v5.y);
    // var v3 = VEC3(0, 2*phi + 1, phi); v3.multiplyScalar(1/v3.y);
    // var ax5 = VEC3().subVectors(v5, v2);    // 5/x/a
    // var ax3 = VEC3().subVectors(v3, v2);    // 3/z/b
    var k5 = 1 / phi;
    var k3 = phi / (2*phi + 1)
    // msgfix('ax', ax5, ax3);
    // msgfix('k', k5, k3);
    // const dirCompA = v2.clone().add(ax5.clone().multiplyScalar(a)).add(ax3.clone().multiplyScalar(b)).normalize();
    const dir = VEC3(a*k5, 1, b*k3).normalize();
    // msgfix('dir', dir, dir1);

    // dirOLD.set(1, phi*a, 0).normalize();
    // dirOLD.set(0, 1+phi*a, 0).normalize();
    // dirOLD.multiplyScalar(1-b).add(v3.multiplyScalar(b));
    dir.multiplyScalar(size);
    return dir;
}

/** find a,b version of plane within bounds */
Plane.dir2Ab = function({x=0, y=0, z=1}, d = 1e-20) {
    const ivec = VEC3(x, y, z);
    const size = ivec.length();
    const p = ivec.clone().normalize();
    const phi = Plane.phi;
    var k5 = 1 / phi;
    var k3 = phi / (2*phi + 1)
    for (let i = 0; i < CSynth.sym60.length; i++) {
        const m = CSynth.sym60[i];
        const pp = p.clone().applyMatrix4(m);
        if (pp.y <= 0.5) continue;
        pp.multiplyScalar(1 / pp.y);
        const a = pp.x / k5;
        const b = pp.z / k3;
        if (a < 0 || a > 1) continue;
        if (b < -1 || b > 1) continue;
        if (a + Math.abs(b) > 1+d) continue;
        return {a,b, size};
    }
    if (d>0) return Plane.dir2Ab(ivec, d*10);
}

/** find multiple a,b versions of plane within bounds, ??? may remove */
Plane.dir2AbX = function({x=0, y=0, z=1}, d = 1e-13) {
    const p = VEC3(x, y, z).normalize();
    const phi = Plane.phi;
    var k5 = 1 / phi;
    var k3 = phi / (2*phi + 1)
    const r = [];
    for (let i = 0; i < CSynth.sym60.length; i++) {
        const m = CSynth.sym60[i];
        const pp = p.clone().applyMatrix4(m);
        if (pp.y <= 0.5) continue;
        pp.multiplyScalar(1 / pp.y);
        const a = pp.x / k5;
        const b = pp.z / k3;
        if (a < -d || a > 1+d) continue;
        if (b < -1-d || b > 1+d) continue;
        if (a + Math.abs(b) > 1+d) continue;
        r.push({a,b, ss: a+Math.abs(b)});
    }
    return r;
}


Plane.ab2Plane = function(ab) {
    return new Plane(Plane.ab2Dir(ab));
}
Plane.ab2Symset = function(...ab) {
    let rr = [];
    for (let i=0; i<ab.length; i++) {
        const p = Plane.ab2Plane(ab[i]);
        let pset = CSynth.symMatrix.map((m,j) => p.transform(m, CSynth.symCol[j], j));
        rr = rr.concat(Plane.reduceSet(pset));
    }
    return rr;
}

// make a large set of planes by applying symmetry to each of a small set
// remember the initial small set
Plane.planesetSymset = function Plane_planesetSymset(planes, symmat = CSynth.symMatrix) {
    if (!Array.isArray(planes)) planes = [planes];
    let rr = [];            // result planeset
    let keyPlanes = [];     // key planes actually used, in plane format
    for (let i=0; i < planes.length; i++) {
        const p = Plane.xxxPlane(planes[i]);
        if (!p?.enabled) continue;
        p.tileid = i;
        keyPlanes.push(p);
        // let pset = symmat.map((m,j) => p.transform(m, CSynth.symCol[j], j));
        let pset = symmat.map((m,j) => p.transform(m, undefined, j));  // leave colouring to parent sphere
        rr = rr.concat(Plane.reduceSet(pset));
    }
    rr.keyPlanes = keyPlanes;   // save the source set of planes
    return rr;
}


/** make 60 copies using 'fixed' symmetry matrices CSynth.symMatrix */
CSynth.applySym = function CSynth_applySym(pobj, symMatrix = CSynth.symMatrix, pgroup = CSynth.rawgroup, oldgroup=undefined, usenewmat=false) {
    // check to remove indirection level in easy case
    let obj = pobj;
    let gmatrix;
    if (obj.isObject3D && obj.children.length === 1 && obj.children[0].isMesh) { //} && obj.matrix.isIdentity())
        obj = obj.children[0];
        gmatrix = pobj.matrix;
        if (gmatrix.isIdentity()) gmatrix = undefined;
    }

    const group = oldgroup || new THREE.Group();
    group.children = [];    // clean any old group
    group.name = 'symgroup_' + obj.name;
    for (let i=0; i < symMatrix.length; i++) {
        if (!symMatrix[i]) continue;
        const x = obj.clone();
        x.visible = true;
        if (obj.material && usenewmat) {
            x.material = obj.material.clone();
            x.material.color = CSynth.symCol[i];
        }
        if (gmatrix) x.matrix.multiplyMatrices(gmatrix, x.matrix);
        x.matrix.multiplyMatrices(symMatrix[i], x.matrix);
        x.matrixAutoUpdate = false;
        x.name = 'sym_' + i + x.name;
        group.add(x);
        CSynth.optimizeVisible(x, true);
        //const y = new THREE.Group().add(x);
        //y.matrix = symMatrix[i];
        //y.matrixAutoUpdate = false;
        //group.add(y);
    }
    pgroup.add(group);
    return group;
}

/** apply the biomt records from a pdb or our symmetry
 * if toRelicate is given that is replicated, otherwise the fist visible displayed object is replicated
 */
CSynth.applyBiomt = function CSynth_applyBiomt(glmolp, toReplicate, symset) {
    const glmol = CSynth.xxxGlmol(glmolp);
    const pgroup = glmol.allgroup;
    if (!toReplicate) {
        toReplicate = pgroup.children.filter(c => c.visible)[0];
        if (!toReplicate || toReplicate === glmol.symgroup) // return msgfixerror('nothing to make symmetric');
            toReplicate = glmol.cartoonGroup;
    }
    glmol.replicated = toReplicate;

    let mats;
    if (symset) {
        mats = symset;
    } else {
        mats = glmol.protein.biomtMatrices;
        const ees = CSynth.biomtMatrices[glmol.sstruct.filename];  // override in extended config file ima.js or similar
        if (ees) {
            mats = glmol.protein.biomtMatrices = ees.map(e => {
                const m = new THREE.Matrix4();
                m.elements = e.slice();
                return m;
            });
        }

        if (mats.length === 0 && CSynth.xxxGlmol('1sva')) mats = CSynth.xxxGlmol('1sva').protein.biomtMatrices; // CSynth.symMatrix;
        if (mats.every(m => m === undefined || m.isIdentity())) mats = CSynth.symMatrix; // for spike protein
    }
    //const rr = XX.compareMatrixSets(CSynth.sym60, mats);
    //if (rr[0].length !== 0)
    //    console.log('differing symmetry sets');
    const oldgroup = glmol.symgroup === 999 ? undefined : glmol.symgroup;
    glmol.symgroup = CSynth.applySym(toReplicate, mats, pgroup, oldgroup);
    if (!oldgroup) {
        glmol.gui.add(glmol.symgroup, 'visible').name('symvisible').listen();
        glmol.gui.addImageButtonPanel(1, {
            text: 'new symmetry', func: () => CSynth.applyBiomt(glmolp),
            tip: 'reapply symmetry\nfrom first visible representation'
        }).setRowHeight(0.07);
    }


    // note to self: to check data as of Reidun's test
    // http://localhost:8800/csynthstatic/rev6933/csynth.html?startscript=../data/YorkStudents/ima6933.js&nohorn=true
    if (glmol.protein.x0Mat && !glmol.sstruct.orient) { // ??? apply to allgroup or just symgroup
        glmol.allgroup.matrix.copy(glmol.protein.x0Mat);
        glmol.allgroup.matrixAutoUpdate = false;
    }
}
CSynth.biomtMatrices = {};

// experimental interactive generator of 60 symmetric planes
var lastdocx, width, lastdocy, height;
CSynth.tryDynPlanes = function() {
    var mmmm, mof;
    CSynth.rawgroup.remove(mmmm);
    const sg = new THREE.PlaneGeometry(1900,1900);
    //sg = new THREE.SphereGeometry(400,50,50);
    const mat = new THREE.MeshPhongMaterial();
    mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(sg, mat);
    mesh.position.set(0,  0, 117);
    mesh.quaternion.set(0.3, 0.1, -0.2, 0.9)
    // mesh.updateMatrix();
    mmmm = CSynth.applySym(mesh);
    if (mof) Maestro.remove('preframe', mof);

    mof = Maestro.on('preframe', () => {
        for(let i=0; i<mmmm.children.length; i++) {
            // mmmm.children[i].children[0].position.set(lastdocx/10, lastdocy/10, 0)
            if (V.gpR && V.gpR.pose && V.gpR.pose.orientation)
                mmmm.children[i].children[0].quaternion.fromArray(V.gpR.pose.orientation)
            else
                mmmm.children[i].children[0].quaternion.set(lastdocx/width-0.5, lastdocy/height-0.5, 0, 0.9)
        }
    });
    // mmmm.visible = false;
    CSynth.testplanes = mmmm;
}

// replicate mesh or higher group 60 times
// note that with appropriate 1aq3 orientation, CSynth.symrepl(CSynth.cartoonGroup["1aq3.pdb"]) has desired effect
CSynth.symrepl = function CSynth_symrepl(omesh, pgroup) {
    if (!pgroup) {
        if (omesh.sym60group) {
            pgroup = omesh.sym60group;
            CSynth.cleanGeometry(pgroup);
            pgroup.children = [];
        } else {
            pgroup = omesh.sym60group = new THREE.Group();
            pgroup.name = omesh.name + '_sym60group';
        }
        omesh.add(pgroup);
    }

    if (omesh.children.length === 0 || omesh.material) {  // assume this is a primitive, find better check
        const symm = CSynth.symMatrix;
        // clone without children
        const schildren = omesh.children;
        omesh.children = [];
        for (let i = 0; i < symm.length; i++) {
            const mesh = omesh.clone();
            mesh.matrixAutoUpdate = false;
            mesh.matrix = symm[i].clone();
            pgroup.add(mesh);
        }
        omesh.children = schildren;
    } else {
        const obj = new omesh.constructor(); //  we don't want to copy all the children yet
        pgroup.add(obj);
        for (let i = 0; i < omesh.children.length; i++) {
            if (omesh.children[i] === omesh.sym60group) continue;
            CSynth.symrepl(omesh.children[i], obj);
        }
    }
}

CSynth.polymesh = {};

CSynth.tiles = function(fidkey, fid = 'sv40lines.wrl', pgroup = CSynth.rawgroup, pgui = V.gui, defs=undefined) {
    // use using our meshes handle immediately
    // let fidkey;
    // if (typeof fid === 'object') {
    //     fidkey = fid.fidkey = fid.fidkey || toKey(fid);
    // }  else {
    //     fidkey = fid;
    // }
    var ppmesh = CSynth.polymesh[fidkey];
    if (typeof fid !== 'string') {  // do the tiling using our plane intersects
        if (!ppmesh) {
            let ps = fid;
            if (!Array.isArray(ps)) ps = [ps];
            ps.forEach((psi, i) => psi.col = psi.col || GLmolX.colorsr[i]);
            let psa = Plane.planesetSymset(ps);

            CSynth.polymesh[fidkey] = ppmesh = Plane.drawSet(psa, fidkey, defs);

            // do some basic stats while here
            const kps = psa.keyPlanes;
            kps.forEach(kp => kp.count = kp.pointCount = 0);
            psa.forEach(p => {
                p.source.plane.count++;
                p.source.plane.pointCount += p.poly.points.length;
            });
            log('poly> .......');
            kps.forEach((kp, i) => {
                log('poly>', ps[i], kp.count, kp.pointCount, kp.pointCount/kp.count);
                //Object.assign(ps[i], kp);
            });

        }
        return ppmesh;
    }

    if (!ppmesh) {
        const mat = CSynth.defaultMaterial.clone();
        mat.side = THREE.DoubleSide;
        mat.vertexColors = 2;
        ppmesh = CSynth.polymesh[fidkey] = new THREE.Mesh(undefined, mat); ppmesh.name = fid + '_polymesh';
        pgroup.add(ppmesh);
    }

    let rr;
    if (fid.endsWith('.wrl')) {  // this is to use CSynth style cylinders sv40lines.wrl
        // pp geom = new THREE.BufferGeometry();
        rr = CSynth._wrl(fid);
        ppmesh.material.vertexColors = 0;
    }
    else if (fid.endsWith('.polys')) rr = CSynth._poly(fid);  //  GeodesicIcosahedron25.polys, GeodesicRT1.polys
    else if (fid === 'sv40') rr = CSynth._pts(0.4); // , pp geom);             // unused?
    else return msgfixerror(fid, 'wrong filetype for CSynth.tiles', fid);

    const {centre = VEC3(), scale = 1, pairs, ppgeom} = rr;
    ppmesh.pointPairs = pairs;

    if (ppmesh.geometry) ppmesh.geometry.dispose();
    ppmesh.geometry = ppgeom;

    ppmesh.scale.set(scale,scale,scale);
    ppmesh.position.copy(centre.multiplyScalar(-scale));
    ppmesh.updateMatrix();
    ppmesh.matrixAutoUpdate = false;

    const gui =  dat.GUIVR.createX(fid);
    gui.add(ppmesh, 'visible').listen().showInFolderHeader();
    CSynth.materialGui(ppmesh.material, gui);
    pgui.add(gui);
    return ppmesh;
}

CSynth._poly = function(fid = "icos14.polys") {
    var dd = posturi(CSynth.current.fullDir + fid);

    dd = dd.replace(/V(\d*)/g, 'v[$1]')
    dd = 'let v=[]; let sqrt = Math.sqrt; //' + dd;

    dd = dd.replace(/\(/g, 'VEC3(');
    dd = dd.replace(/sqrtVEC3\(/g, 'sqrt(');
    dd = dd.replace(/{/g, '[')
    dd = dd.replace(/}/g, '],')
    dd = dd.replace(/Faces:/g, 'let faces=[')
    dd += ']; return {v, faces}'
    const rr = new Function(dd)();
    const {faces, v} = rr;
    CSynth.polymesh[fid].verts = v;
    CSynth.polymesh[fid].faces = faces;

    const usecount = new Int16Array(v.length);
    if (fid === "icos14.polys" || fid === 'GeodesicIcosahedron25.polys') {
        let kill = CSynth._poly.killist || (fid === "icos14.polys" ? [310, 354] : [538, 362, 610])
        v.forEach(vv => vv.set(vv.x, vv.z, -vv.y));  // help with orientation

        // code to remove vertices not needed as we didn't have the correct data
        // count so we can eliminate some
        for (let i=0; i<faces.length; i++) {
            const f = faces[i];
            for (let k = 0; k < f.length; k++) {
                usecount[f[k]]++;
            }
        }
        let mats = CSynth.symMatrix; // CSynth.xxxGlmol(2).protein.biomtMatrices; // CSynth.symMatrix;
        let th = 0.05;
        for (let ki = 0; ki < kill.length; ki++) {
            const k = kill[ki];
            v[k].kill = true;
            mats.forEach(m => {
                const bv = v[k].clone().applyMatrix4(m);
                let n = 0;
                v.forEach( (p,i) => {
                    if ((p.angleTo(bv)) < th) {
                        v[i].kill = true;
                        n++;
                    }
                } );
                if (n !== 1)
                    log('wrong kill', n);
            });
        }
    }

    // and make geometry ignoring 5folds and other kill items
    // const aa = new Float32Array(0);
    // pp geom.setAttribute('position', new THREE.BufferAttribute(aa, 3))
    // pp geom.setAttribute('uv', new THREE.BufferAttribute(aa, 2))
    // pp geom.setAttribute('normal', new THREE.BufferAttribute(aa, 3))
    // pp geom.setIndex([])
    const pairs = [];
    const geoms = [];
    for (let i=0; i<faces.length; i++) {
        const rad = 0.005;
        const f = faces[i];
        for (let k = 0; k < f.length; k++) {
            const i1 = f[k], i2 = f[(k+1)%f.length];
            if (usecount[i1] === 5 || usecount[i2] === 5 || v[i1].kill || v[i2].kill) continue;
            const c = window.cylinderMesh(v[i1], v[i2], rad);
            pairs.push([v[i1], v[i2]]);
            c.updateMatrix();
            // pp geom.merge(c.geometry, c.matrix);
            c.geometry.applyMatrix4(c.matrix);
            geoms.push(c.geometry);
        }
    }
    const ppgeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms);
    return {scale: 100, pairs, ppgeom};
}


CSynth._wrl = function(fid = 'sv40lines.wrl') {
    var dd = posturi(CSynth.current.fullDir + fid);
    var lines = dd.split('\n')
    const rad = 1;
    // const rotation = new THREE.Quaternion(), translation = new THREE.Vector3();
    const mat = new THREE.Matrix4(), matt = new THREE.Matrix4(), matr = new THREE.Matrix4();
    let n=0, sumv = VEC3();
    const targ = CSynth.startGeom(2000);    // get a targ, reuse if appropriate
    const pairs = CSynth.wrlpairs = []
    for (let i=0; i<lines.length; i++) {
        const line = lines[i];
        const toks = line.split(' ').filter(x=>x);
        const key = toks[0];
        const vals = toks.slice(1).map(v => +v);
        const sw = -1;  // -1 for righthanded; switch xyz not just z as that interacted best with other transforms
        if (key === 'translation') matt.makeTranslation(sw*vals[0], sw*vals[1], sw*vals[2]);
        if (key === 'rotation') matr.makeRotationAxis(VEC3(sw*vals[0], sw*vals[1], sw*vals[2]), sw*vals[3]);
        if (key === 'height') {
            const cheight = vals[0];
            mat.multiplyMatrices(matt, matr);

            const e1 = VEC3(0, -cheight/2, 0).applyMatrix4(mat);
            const e2 = VEC3(0, cheight/2, 0).applyMatrix4(mat);
            sumv.add(e1).add(e2);
            n++;
            pairs.push([e1,e2]);
        }
    }
    const centre = sumv.multiplyScalar(0.5 / n);


    const kcyl = 8, kend = 4; let xr = 225/209;  let xr3 = 225/220; // 225 is commonest
    for (let i in pairs) {
        let [e1,e2] = pairs[i];
        e1.sub(centre); e2.sub(centre);
        //if (Math.abs(e1.length() - 209) < 0.2) e1.multiplyScalar(xr)
        //if (Math.abs(e2.length() - 209) < 0.2) e2.multiplyScalar(xr)
        //if (Math.abs(e1.length() - 220) < 0.5) e1.multiplyScalar(xr3)
        //if (Math.abs(e2.length() - 220) < 0.5) e2.multiplyScalar(xr3)
        // below not right but good compromise for sv40
        e1.normalize().multiplyScalar(225);
        e2.normalize().multiplyScalar(225);
        CSynth.drawCyl(targ, e1, e2, -999,-999, rad, kcyl, kend);
    }

    const ppgeom = CSynth.finishGeom(targ); // , pp geom);

    return {centre: sumv.multiplyScalar(0.5 / n), scale: 0.5, pairs, ppgeom};
}

CSynth._pts = function(thresh = 0.3) { // }, pp geom=undefined) {
    const pts = CSynth._sv40pts;
    const p=[], geoms = [];
    const rad = 0.1;
    let n=0;
    for(let i=0; i<pts.length; i++) {
        for(let j=0; j<i-1; j++) {
            if (pts[i].distanceTo(pts[j]) < thresh) {
                const c = window.cylinderMesh(pts[i], pts[j], rad);
                c.updateMatrix();
                geoms.push(c);
                n++;            }
        }
    }
    const ppgeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms);

    log('lines drawn', n);
    return {scale: 50, ppgeom};
}

CSynth._sv40pts = [
    VEC3(0.427,-0.309,-2.736), VEC3(-0.427, 0.309,-2.736), VEC3(-0.809,-0.927,-2.500), VEC3(0.809, 0.927,-2.500),
    VEC3(0.382,-1.618,-2.236), VEC3(-0.382, 1.618,-2.236), VEC3(1.309,-1.118,-2.191), VEC3(-1.309, 1.118,-2.191),
    VEC3(-0.882,-1.809,-1.927), VEC3(0.882, 1.809,-1.927), VEC3(-1.927,-0.882,-1.809), VEC3(1.927, 0.882,-1.809),
    VEC3(2.236,-0.382,-1.618), VEC3(-2.236, 0.382,-1.618), VEC3(1.118,-2.191,-1.309), VEC3(-1.118, 2.191,-1.309),
    VEC3(2.191,-1.309,-1.118), VEC3(-2.191, 1.309,-1.118), VEC3(-2.500,-0.809,-0.927), VEC3(2.500, 0.809,-0.927),
    VEC3(-1.809,-1.927,-0.882), VEC3(1.809, 1.927,-0.882), VEC3(-0.927,-2.500,-0.809), VEC3(0.927, 2.500,-0.809),
    VEC3(0.309,-2.736,-0.427), VEC3(-0.309, 2.736,-0.427), VEC3(1.618,-2.236,-0.382), VEC3(-1.618, 2.236,-0.382),
    VEC3(2.736,-0.427,-0.309), VEC3(-2.736, 0.427,-0.309), VEC3(-2.736,-0.427, 0.309), VEC3(2.736, 0.427, 0.309),
    VEC3(-1.618,-2.236, 0.382), VEC3(1.618, 2.236, 0.382), VEC3(-0.309,-2.736, 0.427), VEC3(0.309, 2.736, 0.427),
    VEC3(0.927,-2.500, 0.809), VEC3(-0.927, 2.500, 0.809), VEC3(1.809,-1.927, 0.882), VEC3(-1.809, 1.927, 0.882),
    VEC3(2.500,-0.809, 0.927), VEC3(-2.500, 0.809, 0.927), VEC3(-2.191,-1.309, 1.118), VEC3(2.191, 1.309, 1.118),
    VEC3(-1.118,-2.191, 1.309), VEC3(1.118, 2.191, 1.309), VEC3(-2.236,-0.382, 1.618), VEC3(2.236, 0.382, 1.618),
    VEC3(1.927,-0.882, 1.809), VEC3(-1.927, 0.882, 1.809), VEC3(0.882,-1.809, 1.927), VEC3(-0.882, 1.809, 1.927),
    VEC3(-1.309,-1.118, 2.191), VEC3(1.309, 1.118, 2.191), VEC3(-0.382,-1.618, 2.236), VEC3(0.382, 1.618, 2.236),
    VEC3(0.809,-0.927, 2.500), VEC3(-0.809, 0.927, 2.500), VEC3(-0.427,-0.309, 2.736), VEC3(0.427, 0.309, 2.736),
    VEC3(0.000,-1.000,-2.618), VEC3(0.000, 1.000,-2.618), VEC3(-1.618,-1.618,-1.618), VEC3(1.618,-1.618,-1.618),
    VEC3(-1.618, 1.618,-1.618), VEC3(1.618, 1.618,-1.618), VEC3(-2.618, 0.000,-1.000), VEC3(2.618, 0.000,-1.000),
    VEC3(-1.000,-2.618, 0.000), VEC3(1.000,-2.618, 0.000), VEC3(-1.000, 2.618, 0.000), VEC3(1.000, 2.618, 0.000),
    VEC3(-2.618, 0.000, 1.000), VEC3(2.618, 0.000, 1.000), VEC3(-1.618,-1.618, 1.618), VEC3(1.618,-1.618, 1.618),
    VEC3(-1.618, 1.618, 1.618), VEC3(1.618, 1.618, 1.618), VEC3(0.000,-1.000, 2.618), VEC3(0.000, 1.000, 2.618),
    VEC3(-0.500,-0.427,-2.927), VEC3(0.500, 0.427,-2.927), VEC3(0.809,-0.927,-2.736), VEC3(-0.809, 0.927,-2.736),
    VEC3(-0.309,-1.736,-2.427), VEC3(0.309, 1.736,-2.427), VEC3(-1.500,-1.191,-2.309), VEC3(1.500, 1.191,-2.309),
    VEC3(1.000,-2.000,-2.000), VEC3(2.000,-1.000,-2.000), VEC3(-2.000, 1.000,-2.000), VEC3(-1.000, 2.000,-2.000),
    VEC3(-2.427,-0.309,-1.736), VEC3(2.427, 0.309,-1.736), VEC3(-1.191,-2.309,-1.500), VEC3(1.191, 2.309,-1.500),
    VEC3(-2.309,-1.500,-1.191), VEC3(2.309, 1.500,-1.191), VEC3(2.000,-2.000,-1.000), VEC3(-2.000, 2.000,-1.000),
    VEC3(2.736,-0.809,-0.927), VEC3(-2.736, 0.809,-0.927), VEC3(0.927,-2.736,-0.809), VEC3(-0.927, 2.736,-0.809),
    VEC3(-0.427,-2.927,-0.500), VEC3(0.427, 2.927,-0.500), VEC3(-2.927,-0.500,-0.427), VEC3(2.927, 0.500,-0.427),
    VEC3(-1.736,-2.427,-0.309), VEC3(1.736, 2.427,-0.309), VEC3(1.736,-2.427, 0.309), VEC3(-1.736, 2.427, 0.309),
    VEC3(2.927,-0.500, 0.427), VEC3(-2.927, 0.500, 0.427), VEC3(0.427,-2.927, 0.500), VEC3(-0.427, 2.927, 0.500),
    VEC3(-0.927,-2.736, 0.809), VEC3(0.927, 2.736, 0.809), VEC3(-2.736,-0.809, 0.927), VEC3(2.736, 0.809, 0.927),
    VEC3(-2.000,-2.000, 1.000), VEC3(2.000, 2.000, 1.000), VEC3(2.309,-1.500, 1.191), VEC3(-2.309, 1.500, 1.191),
    VEC3(1.191,-2.309, 1.500), VEC3(-1.191, 2.309, 1.500), VEC3(2.427,-0.309, 1.736), VEC3(-2.427, 0.309, 1.736),
    VEC3(-1.000,-2.000, 2.000), VEC3(-2.000 - 1.000, 2.000), VEC3(2.000, 1.000, 2.000), VEC3(1.000, 2.000, 2.000),
    VEC3(1.500,-1.191, 2.309), VEC3(-1.500, 1.191, 2.309), VEC3(0.309,-1.736, 2.427), VEC3(-0.309, 1.736, 2.427),
    VEC3(-0.809,-0.927, 2.736), VEC3(0.809, 0.927, 2.736), VEC3(0.500,-0.427, 2.927), VEC3(-0.500, 0.427, 2.927),
    VEC3(-1.618, 0.000,-2.618), VEC3(1.618, 0.000,-2.618), VEC3(0.000,-2.618,-1.618), VEC3(0.000, 2.618,-1.618),
    VEC3(-2.618,-1.618, 0.000), VEC3(2.618,-1.618, 0.000), VEC3(-2.618, 1.618, 0.000), VEC3(2.618, 1.618, 0.000),
    VEC3(0.000,-2.618, 1.618), VEC3(0.000, 2.618, 1.618), VEC3(-1.618, 0.000, 2.618), VEC3(1.618, 0.000, 2.618)
]

// clear the polymesh so we can retest without restart, mainly for debug
CSynth.clearpolymesh = function() {
    for (let k in CSynth.polymesh) {
        const m = CSynth.polymesh[k];
        m.parent.remove(m);
        delete CSynth.polymesh[k];
    }
}

// draw a set of cylinders, array of inputs, each has []
CSynth.cylinderGeomForLines = function(lines, {radius = 1, pgroup, pgui, name}) {
    const gradius = radius;
    const targ = CSynth.startGeom(2000);    // get a targ, reuse if appropriate
    for (let i=0; i<lines.length; i++) {
        const line = lines[i];
        let {color = 0, radius = gradius} = line[2] || {}; // eslint-disable-line no-shadow
        CSynth.drawCyl(targ, line[0], line[1] || line[0], color, color, radius);
    }
    const geom = CSynth.finishGeom(targ);
    geom.name = (name || '') + 'cylinderGeomForLines';

    if (pgroup) {
        if (!pgroup.namelist) pgroup.namelist = {};
        if (pgroup.namelist[geom.name]) {
            Plane.killObject(pgroup.namelist[geom.name])
        }
        const mesh = newmeshN(geom, CSynth.defaultMaterial.clone(), (name || '') + 'cylinderMeshForLines');
        pgroup.add(mesh);
        pgroup.namelist[geom.name] = mesh;
        mesh.material.vertexColors = THREE.VertexColors;
        return mesh;
    }

    // if (pgui) {
    //     const gui = pgui.guiChildren.filter(g => g.guiName === name);
    //     if (!gui) gui =
    //     pgui

    //     pgui.
    // }
}

Plane.killObject = function(o) {
    if (!o) return;
    if (o.parent) o.parent.remove(o);
    if (o.dispose) o.dispose();
}

Plane.symtoy = function() {
    Plane.varying();
    const mm = Plane.drawnMeshes.varying;
    // mm.geometry.attributes.color.array.fill(1);
    // mm.geometry.attributes.color.needsUpdate = true;
}

/** find edges and corresponding plane and index */
Plane.edges = function(plane) {
    const poly = plane.poly;
    const points = poly.points;
    const n = points.length;
    const edges = [];
    for (let edgeid = 0; edgeid < points.length; edgeid++) {    // loop on edges
        const p0 = points[edgeid];
        const p1 = points[(edgeid+1) % n];
        let pn = 0;     // found pairs
        for (let opi = 0; opi < p0.users.length; opi++) {       // find other plane that shares p1 and p2
            const oplane = p0.users[opi];
            // const oind = p1.users.indexOf(oplane);
            if (oplane !== plane && p1.users.includes(oplane)) {
                const oind = oplane.poly.points.indexOf(p1);
                edges.push({oplane, oid: oplane.id, oind, p0, p1, pc: p0.clone().add(p1).multiplyScalar(0.5)});
                pn++;
                // break;
            }
        }
        if (pn !== 1)
            console.error(`unexpected topology, no matching edge for plane id ${plane.id}`);
    }
    return edges;
}

Plane.kite = function(sym = false) {
    const phi = Plane.phi;
    var v2 = VEC3(0, 1, 0);
    var v5 = VEC3(1, phi, 0);
    var v3 = VEC3(0, 2*phi + 1, phi);   // centre of face
    I.sphereRad *= 2;
    I.point(1, v2.setLength(100), sym);
    I.point(2, v3.setLength(100), sym);
    I.point(3, v5.setLength(100), sym);
    I.sphereRad /= 2;

    // n.b not same as Plane.axisX, Plane.axisX chosed to create simnple generators, vX to be close to each other
    //I.point(1, Plane.axis2.clone().multiplyScalar(100), false);
    //I.point(2, Plane.axis3.clone().multiplyScalar(100), false);
    //I.point(3, Plane.axis5.clone().multiplyScalar(100), false);
}
// Plane.kite();

/** draw canonical triangle, sym true for full symmetry, o != 0 for offset (to see symmetry) */
Plane.tri = function(sym = false, o = 0) {
    const phi = Plane.phi;
    var v5 = VEC3(1 + o, phi, 0).normalize();
    var v3 = VEC3(0, 2*phi + 1 + o, phi).normalize();   // centre of face
    var v3a = VEC3(0, 2*phi + 1, -phi + o).normalize();   // centre of face
    I.sphereRad *= 2;
    I.point(1, v5.setLength(100), sym);
    I.point(2, v3.setLength(100), sym);
    I.point(3, v3a.setLength(100), sym);
    I.sphereRad /= 2;

    const cen = [v5, v3, v3a].reduce((c,v) => c.add(v), vec3()).setLength(100);
    I.setplane(0, cen);
    
    // n.b not same as Plane.axisX, Plane.axisX chosed to create simnple generators, vX to be close to each other
    //I.point(1, Plane.axis2.clone().multiplyScalar(100), false);
    //I.point(2, Plane.axis3.clone().multiplyScalar(100), false);
    //I.point(3, Plane.axis5.clone().multiplyScalar(100), false);
}
// Plane.kite();

/** check polys for regularity e.g. for PAV */
Plane.checkpoly = function(f = 'PAV') {
    const pset = Plane.drawSetGroups[f].pset[0];
    const points = pset.poly.points;
    log ('dists')
    log(points.map( (p,i,a) => p.distanceTo(a[(i+1) % a.length])));
    const cen = points.reduce((c,v) => c.add(v), vec3()).normalize()
    log ('centres')
    log(cen)
    log(pset.dir)
    log(Plane.dir2Ab(pset.dir))
}
