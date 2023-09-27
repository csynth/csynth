// various interactive methods used for symmetry

var extrakeys, msgfix, tmat4, Plane, G, CSynth, VEC3, THREE, W, log, cc,
cylinderMesh, dat, V, col3, GLmolX, keysdown, Maestro, EX, msgfixlog;
var I={};
var ima = {showing: 0}; // may be replaced by 'real' ima later

extrakeys.Q = () => {
    EX.stopToFront();
    ima.randlooptime = 1e10;
}

I.planes = []
I.points = {};
extrakeys['Q,D,X'] = () => {
    //CSynth.xxxGlmol(ima.showing).allgroup.matrixAutoUpdate = true;
    //CSynth.xxxGlmol(ima.showing).allgroup.matrix.identity();
    //I.ccc = VEC3(84.14429683333333, -5.000000015797923e-7, 105.16101333333333);
    //CSynth.xxxGlmol(1).allgroup.position.copy(I.ccc).multiplyScalar(-1);
    //CSynth.xxxGlmol(3).allgroup.position.copy(I.ccc).multiplyScalar(-1);
    //runkeys('shift,Home');
    //runkeys('ctrl,Home');
    I.points = {};
}

extrakeys['Q,D,5'] = () => { I.points[ima.showing + "/5"] = I.points.last.clone(); I.resolve() }
extrakeys['Q,D,3'] = () => { I.points[ima.showing + "/3"] = I.points.last.clone(); I.resolve() }

// /** get the current direction, from mouse or ? VR controller */
// I.getdir = function() {
//     let dir = CSynth.getray().ray.direction;
//     tmat4.elements = G._rot4_ele.slice();
//     dir.applyMatrix4(tmat4);
//     msgfix('lastdir', dir)
//     return dir;
// }

/** get the current direction, from mouse or ? VR controller */
I.getdir = function() {
    const sg = new THREE.SphereGeometry(100 * G.scaleFactor);
    const m = I.getdirmat = I.getdirmat || CSynth.defaultMaterial.clone();
    m.side = THREE.DoubleSide;
    const sm = new THREE.Mesh(sg, m);
    const ray = CSynth.getray().ray;
    const raycaster = new THREE.Raycaster(ray.origin, ray.direction);
    const intersects = raycaster.intersectObject(sm);
    msgfix('ii', intersects)
    if (intersects[0]) {
        const p = intersects[0].point;
        tmat4.elements = G._rot4_ele.slice();
        p.applyMatrix4(tmat4);
        const pn = p.normalize()
        msgfixlog('ij', p, pn, Plane.dir2ab(p));
        return pn;
    }
    return VEC3();
}


// I.col = n => col3().setHex(GLmolX.colors[n]);
// I.col = n => CSynth.symCol[n] || col3();
I.col = n => GLmolX.colorsr[n]  || col3();


/** set the position of a given plane, either by xyz or by ab */
I.setplane = function(n, pdir, usenow = I.show0, drawsub = false) {
    if (pdir && 'a' in pdir) pdir = Plane.ab2dir(pdir);
    const plane = pdir ? Plane.xxxPlane(pdir) : Plane.xxxPlane(I.getdir().multiplyScalar(100));
    msgfix('plane' + n, plane);
    const col = plane.color = /* plane.color || */ I.col(n);
    if (drawsub) {
        const group = plane.group = Plane.drawSet(plane, 'planeQ' + n);
        group.cylmat.color = col
    }
    I.planes[n] = plane;
    I.point(n, plane.point);
    if (usenow) I.useplanes();
    return plane;
}

/** use the current set of planes to define polyhedron */
I.useplanes = function(kkk = 'iplanes') {
    return Plane.drawSet(Plane.planesetSymset(I.planes), kkk, {tilerad:I.cylrad});
}

/** ?for continuous update of planes */
I.monitor = extrakeys['Q,E'] = function() {
    if (keysdown[0] !== 'Q') return;
    if (!I.monitorgroup) {
        I.point('X');
        I.monitorgroup = I.symprims.X;
    }
    const mm = CSynth.symMatrix;
    const ccs = I.monitorgroup.children;
    const dir = I.getdir().multiplyScalar(100);
    for (let i = 0; i < ccs.length; i++) {
        ccs[i].position.copy(dir.clone().applyMatrix4(mm[i]));
        ccs[i].updateMatrix();
    }
    const k2 = keysdown[1];
    const kk = '`' ? '0' : ('0' <= k2 && k2 <= '9' ) ? k2 : 'X';
    I.setplane(kk, dir);
    msgfix('I.monitor calls', I.monitor.count++);
    if (I.show0) I.useplanes();
}
I.monitor.count = 0;
I.continuous = extrakeys['Q,E,R'] = function() {
    Maestro.on('preframe', I.monitor);
}
I.nocontinuous = extrakeys['Q,E,X'] = function() {
    Maestro.remove('preframe', I.monitor);
}

extrakeys['Q,`'] = () => I.setplane(0);
extrakeys['Q,1'] = () => I.setplane(1);
extrakeys['Q,2'] = () => I.setplane(2);
extrakeys['Q,3'] = () => I.setplane(3);
extrakeys['Q,4'] = () => I.setplane(4);
extrakeys['Q,5'] = () => I.setplane(5);
extrakeys['Q,6'] = () => I.setplane(6);
extrakeys['Q,7'] = () => I.setplane(7);
extrakeys['Q,8'] = () => I.setplane(8);
extrakeys['Q,9'] = () => I.setplane(9);
extrakeys['Q,0'] = I.useplanes;
extrakeys['Q,Tab'] = I.useplanes;

// check point and symmetries for current glmol
extrakeys['Q,D'] = () => {
    const dir = I.getdir()
    const glmol = CSynth.xxxGlmol(ima.showing || 0);
    let mats = glmol.protein.biomtMatrices
    if (mats.length === 0) mats = CSynth.symMatrix;
    const res = [];

    // special for 1fv8
    // I.ccc = VEC3(84.14429683333333, -5.000000015797923e-7, 105.16101333333333);
    I.ccc = VEC3(0,0,0);
    dir.add(I.ccc);

    for (let i = 0; i < mats.length; i++) {
        const mat = mats[i];
        if (!mat) continue;
        const p = VEC3().copy(dir).applyMatrix4(mat);
        if (p.distanceTo(dir) < 0.1)
            res.push(p);
    }
    const cdir = CSynth.stats(res).centroid.sub(I.ccc).normalize();
    msgfix('q1', res.length, dir, cdir);
    I.points[ima.showing + '/' + res.length] = cdir;
    I.points.last = cdir;
}

var point3 = VEC3(1, -1, -1).normalize();
var point5 = VEC3(0, -1, -Plane.phi).normalize();
var pointx = VEC3().crossVectors(point3, point5);

/** ????? */
I.resolve = function() {
    const p3 = I.points[ima.showing + '/3'];
    const p5 = I.points[ima.showing + '/5'];

    if (p3 && p5) {
        let px = VEC3().crossVectors(p3, p5);
        const mp = new THREE.Matrix3().set(p3.x, p3.y, p3.z, p5.x, p5.y, p5.z, px.x, px.y, px.z);

        let q3 = VEC3(1, -1, -1).normalize();
        let q5 = VEC3(0, -1, -Plane.phi).normalize();
        let qx = VEC3().crossVectors(point3, point5);
        const mq = new THREE.Matrix3().set(q3.x, q3.y, q3.z, q5.x, q5.y, q5.z, qx.x, qx.y, qx.z);

        const mm = new THREE.Matrix3().multiplyMatrices(mp.invert(), mq);
        const me = mm.elements;
        W.mm = mm;
        log('mm', mm);
        const mm4 = W.mm4 = new THREE.Matrix4().set(me[0], me[1], me[2], 0, me[3], me[4], me[5], -0, me[6], me[7], me[8], 0, 0,0,0,1);
        log('mm4', mm4);
        mm4.multiplyMatrices(mm4, new THREE.Matrix4().makeTranslation(-I.ccc.x, -I.ccc.y, -I.ccc.z));
        log('mm4', mm4);
        log('determinant', mm4.determinant());
        CSynth.xxxGlmol(ima.showing).allgroup.matrix.copy(mm4);
        CSynth.xxxGlmol(ima.showing).allgroup.matrixAutoUpdate = false;
    }
}


// set scale to x on current
I.imascale = function(x) {
    let gr = CSynth.xxxGlmol(ima.showing).allgroup
    if (!gr.save) gr.save = new THREE.Matrix4().copy(gr.matrix)
    gr.matrix.copy(gr.save);
    gr.matrix.multiplyScalar(x);
    gr.matrix.elements[15] = 1
    gr.matrixAutoUpdate = false
}


// prepsv40
// CSynth.polymesh["icos14.polys"].matrix.identity().multiplyScalar(100).elements[15] = 1
// kill = VEC3( -0.1917662628547351, 0.7238293396909273, -0.6627946796960011})
//neardir = function(a, b) { return a.clone().normalize(). distanceTo(b.clone().normalize()) < 0.02}
//neardir = function(a, b) { return a.clone().normalize(). distanceTo(b.clone().normalize()) < 0.02}
/** ???? appears specific to  */
I.findpoint = function(th = 0.05) {
    let pts = CSynth.polymesh[cc.extraPDB[2].tiling].verts
    let dir = I.getdir();
    let r = []
    pts.forEach( (p,i) => { let z; if ((z = p.angleTo(dir)) < th) r.push({p,i,z}) } )
    msgfix('I.points', r);
    I.lastmatch = r
    return r
}
//pts.forEach( (p,i) => { if ((z = p.angleTo(I.points.last)) < 0.2) log(p,i, z) })
var fplast, fpplast, fpcentroid;
extrakeys['Q,A'] = I.findpoint;
extrakeys['Q,W'] = function() {
    // fplast = I.points.last.clone()
    const dir = I.getdir();
    const ang = dir.angleTo(fplast);
    msgfix('angle', ang);
    fplast = dir.clone()
}

extrakeys['Q,G'] = function() {
    CSynth.polymesh["GeodesicIcosahedron25.polys"].visible = false;
    delete CSynth.polymesh["GeodesicIcosahedron25.polys"]
}

/** ~~~~~~~~~~~ CHECK what is Q,S,planeForS, etc about ???  */
extrakeys['Q,S'] = function() {
    const dir = I.closePoint();
    if (fpplast) {
        fpcentroid = VEC3().add(dir).add(fplast).add(fpplast).multiplyScalar(1/3);
        const a = fpplast.clone().sub(fplast);
        const b = dir.clone().sub(fplast);
        a.cross(b).normalize();
        msgfix('I.planedir', a)
        I.planedir = a
        I.qsdista = -a.dot(dir)
        I.qsdistb = -a.dot(fplast)
        I.qsdistc = -a.dot(fpplast)
        I.qsdist = Math.min(I.qsdista, I.qsdistb, I.qsdistc)
        msgfix('I.planedir', a, I.qsdist)
        // broken, needs distances
        Plane.drawSet(I.planes.qs = new Plane(I.planedir, I.qsdist), 'planeQS')
    }
    fpplast = fplast;
    fplast = dir.clone()
}

I.planeForS = function(i) {
    Plane.drawSet(I.planes[i] = new Plane(I.planedir, I.qsdist), 'planeQ' + i);
    I.point(i, fpcentroid);
}

extrakeys['Q,S,1'] = () =>  I.planeForS(1);
extrakeys['Q,S,2'] = () =>  I.planeForS(2);
extrakeys['Q,S,3'] = () =>  I.planeForS(3);
extrakeys['Q,S,4'] = () =>  I.planeForS(4);
extrakeys['Q,S,5'] = () =>  I.planeForS(5);
extrakeys['Q,S,6'] = () =>  I.planeForS(6);
extrakeys['Q,S,7'] = () =>  I.planeForS(7);
extrakeys['Q,S,8'] = () =>  I.planeForS(8);
extrakeys['Q,S,9'] = () =>  I.planeForS(9);
extrakeys['Q,S,A'] = () =>  I.planeForS(10);
extrakeys['Q,S,B'] = () =>  I.planeForS(11);
extrakeys['Q,S,C'] = () =>  I.planeForS(12);
extrakeys['Q,C'] = I.clearPlanes = () =>  {I.planes=[]; I.useplanes() }

I.symprims = []; I.symmats = [];
I.sphereRad = 3;
I.cylrad = 1;
I.show0 = true;

/** draw symmetric point */
extrakeys['Q,P'] = I.point = (pid = I.symprims.length, pdir, symmetric = true) => {
    let dir = pdir;
    if (!dir)
        dir = I.getdir().multiplyScalar(100);
    else
        dir = Plane.xxxPlane(dir).point;    // coerce different syles for dir
    const geom = new THREE.SphereGeometry(I.sphereRad * (dir.rad || 1));
    const mat = I.symmats[pid] = I.symmats[pid] || CSynth.defaultMaterial.clone();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(dir);
    mesh.material.color = I.col(pid);
    mesh.updateMatrix();
    const symmesh = symmetric ? CSynth.applySym(mesh) : mesh;
    symmesh.plane = dir;
    CSynth.rawgroup.add(symmesh);
    if (I.symprims[pid]) CSynth.rawgroup.remove(I.symprims[pid]);
    I.symprims[pid] = symmesh;
}

// draw single point
extrakeys['Q,T'] = I.singlepoint = () => I.point(undefined, undefined, false)

// draw symmetric line
extrakeys['Q,Z'] = extrakeys['Q,L'] = () => {
    const dir = I.getdir().multiplyScalar(100);
    if (I.lastline) {
        const mesh = cylinderMesh(dir, I.lastline, I.cylrad, CSynth.defaultMaterial.clone());
        const symmesh = CSynth.applySym(mesh);
        CSynth.rawgroup.add(symmesh);
        I.symprims.push(symmesh);
        delete I.lastline;
    } else {
        I.lastline = dir;
    }
}

extrakeys['Q,P,X'] = function() {
    I.symprims.forEach(x => x.parent.remove(x))
    I.symprims = []
}
extrakeys['Q,F'] = () => {const tt = I.symprims.pop(); if (tt) tt.parent.remove(tt)}
I.removefix = function(k) {const tt = I.symprims[k]; if (tt) tt.parent.remove(tt); I.symprims[k] = undefined;}
I.removeallfix = function() {for (let k in I.symprims) I.removefix(k)};

// display symmetry points numbers
extrakeys['Q,#'] = extrakeys['Q,#'] = I.symnum = (pos) => {
    CSynth.rawgroup.remove(CSynth.textGroup);
    const tg = CSynth.textGroup = new THREE.Group();
    CSynth.rawgroup.add(tg);
    if (!pos) pos = I.getdir().normalize();
    pos = VEC3(pos);
    msgfix('q# start', pos);
    CSynth.symMatrix.forEach((m, i) => {
        const sc = 200;
        const text = I.xtoh ? I.xtoh[i] + '/' + i : '' + i;
        const t = dat.GUIVR.textCreator.create('' + text);
        const w = t.computeWidth(), h = 0.05;
        t.position.set(-sc*w/2, -sc*h/2, 0);
        t.scale.set(sc, sc, sc);
        t.updateMatrix();
        tg.add(t);
        const tdir = pos.clone().normalize().applyMatrix4(m);
        const ta = VEC3(0,1,0).cross(tdir).normalize();
        const tb = VEC3().crossVectors(tdir, ta).normalize();
        const tc = tdir;

        const tm = new THREE.Matrix4();
        tm.elements = [ta.x, ta.y, ta.z, 0, tb.x, tb.y, tb.z, 0, tc.x, tc.y, tc.z, 0, 0,0,0, 1];
        t.matrix.multiplyMatrices(tm, t.matrix);
        ///// tm.multiplyScalar(200).setPosition(tpos);
        const tpos = tdir.clone().multiplyScalar(105);
        tm.identity().setPosition(tpos);
        t.matrix.multiplyMatrices(tm, t.matrix, tm);
    //t.matrix = tm;
    //t.matrix.setPosition(tpos);
        t.matrixAutoUpdate = false;
    });
}
// I.symnum(I.basepoint);

// ###### q# start: {x: -0.111, y: 0.393, z: -0.913, isVector3: true}
// starting point for numbering used below
// Vector3({x: 15.863215628961738, y: -59.201791884224306, z: 79.0158606078935})

// I._hamiltonian = `
// 5/0 6/30 2/17 3/10 4/28
// 19/27 7/58 8/49 1/16 -3/31 -5/48 -6/38 -19/18 -20/57 20/5
// 23/6 18/23 9/39 0/11 -2/1 -4/59 -7/43 -18/47 -21/50 21/35
// 22/12 17/42 -1/29 -8/22 -17/40
// 16/37 11/19 -9/26 -16/45 -23/15
// -24/32 24/53 15/44 10/46 12/56 -10/4 -13/8 -15/36 -27/20 -22/9
// -25/2 25/54 26/21 14/41 13/51 -11/34 -12/13 -14/52 -28/55 -26/24
// 27/25 28/7 29/14 -29/33 -30/3
// `;

I._hamiltonian = `
5/0 6/30 2/17 3/10 4/28
19/27 7/58 8/49 1/16 -3/31 -5/48 -6/38 -19/18 -20/57 20/5
23/9 18/23 9/39 0/11 -2/1 -4/59 -7/43 -18/47 -21/50 21/35
22/12 17/42 -1/29 -8/22 -17/40
16/37 11/19 -9/26 -16/45 -23/15
-24/32 24/53 15/44 10/46 12/56 -10/4 -13/8 -15/36 -27/20 -22/6
-25/2 25/54 26/21 14/41 13/51 -11/34 -12/13 -14/52 -28/55 -26/24
27/25 28/7 29/14 -29/33 -30/3
`;
// I.hamiltonian(I.basepoint)

// I.basepoint = VEC3(-12.979892087943448, -69.18383074982248, 71.0290079063847)
/// {x: -3.4303148559521546, y: -73.1423831079429, z: 68.10598162628554}
// {x: 4.207497247563791, y: -60.13246993372392, z: 87.19655962079494}
// I.basepoint = VEC3({x: -2.00811927767349, y: -75.74295541321584, z: 76.96084824271517})
// nn = CSynth.symclose(I.basepoint, pp).normalize(); I.hamiltonian(nn)

// wanted A 45 CA
// ATOM    327  CA  THR A  45      13.338 113.972  26.569  1.00  4.51           C
// VEC3(13.338, 113.972, 26.569)
// pp = VEC3(13.338, 113.972, 26.569).applyMatrix4(CSynth.xxxGlmol('2ms2').allgroup.matrix)
// nn = CSynth.symclose(pp, I.basepoint)

extrakeys['Q,H'] = I.hamiltonian = function(basepoint) {
    if (!basepoint) basepoint = I.getdir().multiplyScalar(100);
    I.basepoint = basepoint;
    const baselen = basepoint.length();
    const a = I._hamiltonian.split(/\s/).filter(x=>x);
    const htox = {}
    const xtoh = []
    a.forEach(p => {
        const [h,x] = p.split('/');
        if (htox[h] !== undefined) log('duplicate h', h, p)
        if (xtoh[x] !== undefined) log('duplicate x', x, p)
        htox[h] = x;
        xtoh[x] = h;
    })

    const lines = [];
    for (let i = -30; i < 29; i++) {  // nb 29?-30 below not needed, not a closed path
        const p1 = basepoint.clone().applyMatrix4(CSynth.sym60[htox[i]]);
        const p2 = basepoint.clone().applyMatrix4(CSynth.sym60[htox[i === 29 ? -30 : i+1]]);
        const length = p1.distanceTo(p2);  // expect 41.927 or 53.514
        const color = length < baselen/100 * 45 ? col3(1,1,0) : col3(1, 0.2, 0);
        lines.push([p1, p2, {length, color}]);
    }
    lines.push([basepoint, basepoint, {radius: 5, color: col3(0,0,1)}]);
    const mesh = CSynth.cylinderGeomForLines(lines, {name: 'hamiltonian', radius: 2, pgroup: CSynth.rawgroup, pgui: V.gui})
    I.htox = htox; I.xtoh = xtoh; I.hamlines = lines;
    return {htox, xtoh, mesh}
}
// [htox, xtoh] = I.hamiltonian()


// find close point, to make more generic
I.closePoint = function(p = I.getdir()) {
    const xpdb = cc.extraPDB[ima.showing];
    const pm = CSynth.polymesh[xpdb.tiling];
    const pp = pm.pointPairs;
    const ps = []; pp.forEach(px => ps.push(...px));
    const ma = xpdb.meshOrient;
    const m = new THREE.Matrix4(); if (ma) m.elements = ma;
    let c = -1;
    let bp;
    let x = VEC3();
    for (let i = 0; i < ps.length; i++) {
        const pt = ps[i].clone().applyMatrix4(m).multiply(pm.scale);
        const l = p.dot(pt);
        if (l > c) {
            bp = pt;
            c = l;
        }
    }
    msgfix('closePoint', p.angleTo(bp) * 180 / Math.PI, p, bp);
    return bp;
}
