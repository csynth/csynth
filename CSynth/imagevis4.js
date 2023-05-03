//////////////////
// template taken from HistoryTrace
'use strict';

var CSynth, V, THREE, dat, W, CSynthFast, disposeArray, VH, copyFrom,
Maestro, badshader, log, onframe;

// aside: good article on 3d image options
// http://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002519

// This version uses marching cubes
CSynth.ImageVis4 = function() {
    let me = this;
    let mats= [], geos = [], group, meshes = [], meshgroup, fields = [], marchingCubes;
    let threshs = [65, 65, 65];
    let xnum, ynum, znum, cpp, guik = {};

    const myuniforms = CSynth.imagevis4Uniforms = {};
    copyFrom(myuniforms, CSynth.imagevisUniforms);

    me.newmat = function() {
        // one only CSynth.imagevis4Uniforms so we can have one only gui pointing into it

        const cols = [ new THREE.Color(1,0,0), new THREE.Color(0,1,0), new THREE.Color(0,0,1) ];
        for (let k = 0; k < 3; k++) {
            const mat = mats[k] = new THREE.MeshStandardMaterial( { color: cols[k]});
            mat.uniforms = myuniforms;
            mat.side = THREE.DoubleSide;
        }

        setgraph();
    };  // newmat

    me.newdata = function(data, fid) {
        const iv2 = CSynth.imagevis2;
        iv2.newdata(data, fid);    // this makes the texture, TODO prevent duplicate setup work
        const {min, max, range, tiffdata} = iv2;
        const d0 = data[0];
        xnum = iv2.xnum; ynum = iv2.ynum; znum = iv2.znum; cpp = iv2.cpp;  // can't deconstruct into values in upper scope
        Object.assign(this, {min, max, range, tiffdata, cpp, xnum, ynum, znum} );  // help poking
        myuniforms.tiftex.value = CSynth.tiftex;  // use in uniforms

        myuniforms.xnum.value = xnum;
        myuniforms.ynum.value = ynum;
        myuniforms.znum.value = znum;

        const rgbfield = CSynth.tiftex.image.data;
        // we could modify marchingCube to use stepped data form single data array,
        // but this overhead in copy saves extra index computation on every newthresh/makePolygons
        const rfield = fields[0] = new Float32Array(rgbfield.length/cpp);
        if (cpp === 1) {
            for (let i = 0; i < rfield.length; i++) {
                rfield[i] = rgbfield[i];
            }

        } else if (cpp === 3) {
            fields[1] = new Float32Array(rgbfield.length/cpp);
            fields[2] = new Float32Array(rgbfield.length/cpp);
            for (let i = 0; i < rfield.length; i++) {
                fields[0][i] = rgbfield[i*3];
                fields[1][i] = rgbfield[i*3 + 1];
                fields[2][i] = rgbfield[i*3 + 2];
            }
        }

        //GX.getgui(/imagevis4.*green/).max(range).setValue(0)
        //GX.getgui(/imagevis4.*blue/).max(range).setValue(0)

        marchingCubes = new CSynth.MarchingCubes(xnum, ynum, znum);
        for (let k = 0; k < 3; k++) me.newthresh(k);  // allow 3 for different thresholds even for 1 lot of data

        onframe(me.makegrad);  // defer till xsc ready ... we could defer makegrad and gradUse until really needed (gradforce !== 0)
    }

    me.makegrad = function imagevis4_grad() {
        const xsc = myuniforms.xsc.value, ysc = myuniforms.ysc.value, zsc = myuniforms.zsc.value;  // silly way to get them?
        me.grad = new CSynth.Grad(fields[0], xnum, ynum, znum, xsc, ysc, zsc);  // this will make it and get everything going
        me.grad.gradUse();
    }

    /** find centre for a given field, b is border to ignore */
    me.stats = function(f, thresh = threshs[f], b = 0) {
        const field = fields[f];
        const p = [];       // points above thresh
        //let i = 0;
        const xsc = myuniforms.xsc.value, ysc = myuniforms.ysc.value, zsc = myuniforms.zsc.value;
        for (let z = b; z < znum-b; z++)
        for (let y = b; y < ynum-b; y++)
        for (let x = b; x < xnum-b; x++) {
            const i = x + y*xnum + z*xnum*ynum;
            if (field[i] >= thresh)
                p.push(new THREE.Vector3((x-(xnum-1)/2)*xsc,(y-(ynum-1)/2)*ysc,(z-(znum-1)/2)*zsc));
        //i++;
        }
        return CSynth.stats(p);
    }

    /** work out polygons for new threshold on field k (0=red etc)  */
    me.newthresh = function(k, threshk = threshs[k]) {
        threshs[k] = threshk;
        geos[k] = marchingCubes.makeGeometry(fields[cpp === 1 ? 0 : k], threshk);  // { positionArray, normalArray }

        if (!mats[0]) me.newmat();
        me.createGUIVR(); // will be no-op after first time in
        setgraph();
        guik.threshr.max(me.range);    // thresholds
        guik.threshg.max(me.range);    // thresholds
        guik.threshb.max(me.range);    // thresholds
    };

    const a = new THREE.Matrix4();
    const b = new THREE.Matrix4();
    function setmats() {
        if (!group.visible) return;
        if (me.aligned) return;

        meshgroup.matrixAutoUpdate = false;
        const m = meshgroup.matrix;

        // centre and scale according to xsc/xnum etc
        // no need to repeat this every frame, but easy
        a.identity();
        a.scale( {x: myuniforms.xsc.value, y: myuniforms.ysc.value, z: myuniforms.zsc.value });
        m.identity();
        // m.setPosition( {x: -(uniforms.xnum.value-1)/2, y: -(uniforms.ynum.value-1)/2, z: -(uniforms.znum.value-1)/2} );
        m.setPosition( -(myuniforms.xnum.value-1)/2, -(myuniforms.ynum.value-1)/2, -(myuniforms.znum.value-1)/2 );
        m.premultiply(a);
        meshgroup.matrixWorldNeedsUpdate = true;
        return;
    }
    Maestro.on('trackdone', setmats);

    /** set up the geometry and material for all the graphics */
    function setgraph() {
        for (let k = 0; k < 3; k++) {
            meshes[k].geometry = geos[k];
            meshes[k].material = mats[k];
        }
        badshader = false;
    }

    function makegroup() {
        // Use a single group that can be transformed and made visible as required
        // Under it have one groups, one for mesh (points dead)
        // Usually just one of those two will be visible.
        group = new THREE.Group();
        group.name = 'imagevis4group';
        CSynth.imageallGroup.remove(CSynth.imagevis4group);
        CSynth.imageallGroup.add(group);
        group.visible = true;
        me.group = CSynth.imagevis4group = group;

        meshgroup = new THREE.Group();
        meshgroup.name = 'imagevis4meshgroup';
        group.add(meshgroup);
        me.meshGroup =  CSynth.imagevis4meshgroup = meshgroup;

        // make the meshes
        CSynth.imagevis4mesh =[];
        for (let k = 0; k < 3; k++) {
            const mesh = meshes[k] = new THREE.Mesh();
            mesh.name = 'imagevis4mesh' + k;
            CSynth.imagevis4mesh[k] = mesh;
            meshgroup.add(mesh);
        }

    }
    makegroup();  // make it once, even though we may not have geometry and materials yet

    me.createGUIVR = function() {
        if (VH.ImageVis4) return;  // do not remake gui
        var gui = dat.GUIVR.createX("ImageVis4 implicit surface work in progress");
        gui.add(group, 'visible').listen().showInFolderHeader();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        guik.threshr = gui.add(threshs, '0', 0, 150).step(1).listen().name('Red threshold').onChange( () => me.newthresh(0) );
        guik.threshg = gui.add(threshs, '1', 0, 150).step(1).listen().name('Green threshold').onChange( () => me.newthresh(1) );
        guik.threshb = gui.add(threshs, '2', 0, 150).step(1).listen().name('Blue threshold').onChange( () => me.newthresh(2) );

        //gui.add(uniforms.opacity, 'value', 0, 1).step(0.01).listen().name('Opacity');
        //gui.add(uniforms.brightness, 'value', -3, 0).step(0.01).listen().name('Brightness');
        guik.xsc = gui.add(myuniforms.xsc, 'value', 0, 100).listen().name('xsc').step(0.01);
        guik.ysc = gui.add(myuniforms.ysc, 'value', 0, 100).listen().name('ysc').step(0.01);
        guik.zsc = gui.add(myuniforms.zsc, 'value', 0, 100).listen().name('zsc').step(0.01);
        var rgui = dat.GUIVR.createX("red material"); gui.addFolder(rgui);
        var ggui = dat.GUIVR.createX("green material"); gui.addFolder(ggui);
        var bgui = dat.GUIVR.createX("blue material"); gui.addFolder(bgui);
        CSynth.materialGui(mats[0], rgui);
        CSynth.materialGui(mats[1], ggui);
        CSynth.materialGui(mats[2], bgui);


        V.gui.addFolder(gui);
        VH.ImageVis4 = gui;
        return gui;
    }

    // stats for given field num
    me.statsX = function(fid = 0) {
        const f = fields[fid];
        let sx, sy, sz, sxx, syy, szz, sxy, syz, szx, sw, i;
        sx = sy = sz = sxx = syy = szz = sxy = syz = szx = sw = i = 0;

        for (let z = 0; z < znum; z++)
        for (let y = 0; y < ynum; y++)
        for (let x = 0; x < xnum; x++) {
            const v = f[i++];
            sw += v;
            sx += x * v;
            sy += y * v;
            sz += z * v;
            sxx += x*x * v;
            syy += y*y * v;
            szz += z*z * v;
            sxy += x*y * v;
            syz += y*z * v;
            szx += z*x * v;
        }
        return CSynth._stats2({sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n: sw})
    }

    /** align this image mesh with given object, default current object */
    me.align = function(hs = CSynth.stats()) {
        const mes = me.statsX();
        CSynth.imageallGroup.matrix = CSynth.align(mes, hs);
        CSynth.imageallGroup.matrixAutoUpdate = false;
        me.matrix.identity();
        me.aligned = true;
    }
}
// CSynth.imagevis4 = new CSynth.ImageVis4();

/** align two objects based on their statistics, using eigenvectors and centroids
 * return matrix to be applied to first to align it with second
 */
CSynth.align = function(stats1, stats2) {
    // make matrix from eigenvectors
    function tomat(s) {
        const e = s.eigenvectors;
        const aa = e[0].clone().normalize();
        const ba = e[1].clone().normalize();
        const ca = e[2].clone().normalize();
        const c = s.centroid;
        const m = new THREE.Matrix4();
        m.set(aa.x, aa.y, aa.z, 0,  ba.x, ba.y, ba.z, 0, ca.x, ca.y, ca.z, 0,  0,0,0,1);
        m.transpose();
        const cc = c.clone().applyMatrix4(m);
        m.setPosition(c.x, c.y, c.z)
        return m;
    }
    const mat1t = tomat(stats1); mat1t.invert();
    const mat2 = tomat(stats2);
    const r = mat2.multiply(mat1t);
    return r;
}


/** snippets to help debug */
//var ms, k, renderMainObject; // debug
CSynth.zzz4debug = function() {
    // VH.ImageVis4 = new CSynth.ImageVis4(); V.gui.addFolder(VH.ImageVis4.createGUIVR());
    // select and ctrl-shift-e to evaluate in console

    CSynth.imagevis4.newdata(CSynth.tiffdata)
    //ms = CSynth.imagevis4meshgroup.children;
    //k = 7; ms[0].visible = !!(k&1); ms[1].visible = !!(k&2); ms[2].visible = !!(k&4)
    VH.setguivisible(true)
    CSynth.imagevis4group.visible = true;
    CSynth.imagevis2group.visible = true;
//    renderMainObject = false;
    CSynth.annotationGroup.visible=false;
    W.springgui.style.display = 'none';
    VH.matrix.visible = false;

    CSynth.imagevis4Uniforms.brightness.value=-1.5;
    // CSynth.imagevis4.newmat(); // refresh the shader
}

