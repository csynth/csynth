//////////////////
// handles .map data.
// creates grad texture for texture based hill climbing, and for gradient lines
//    those should also apply to regular .tif
//
// reminder on image tests
// http://localhost:8800/csynth.html?startscript=CSynth/data/Yorkstudents/map.js tests imagevisp
// http://localhost:8800/csynth.html?startscript=CSynth/data/CrickLots/load_tif.js single channel tiff
// http://localhost:8800/csynth.html?startscript=CSynth/data/C75X1200/loadtiff.js  three channel tiff
// tif have attraction to calculated points, but NO gradient texture

// imagevis (origial) very like points mode of this (but 3 channel to 1)
// imagevis (origial) does not work well on single channel ??? to check
// surface (newmapgrid) here like imagevis4 surface; both share marching cubes
//
// note CSynth.gradLines is correctly at CSynth level ... should be easy to share, also CSynth.gradLineGui
//
// ??? the grad related stuff should be moved to a sharable object that holds an image field, xnum, ynum, etc etc

'use strict';

var CSynth, V, THREE, dat, planeg, W, currentGenes, CSynthFast, disposeArray, VH,
copyFrom, badshader, log, renderMainObject, VEC3, VEC2, msgfixerror, G, serious, gl,
addgene, testmaterial, guiFromGene, Maestro, newTHREE_DataTextureNamed;

// aside: good article on 3d image options
// http://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002519

// Do we want to make these be functions that you call with 'new CSynth.HistoryTrace()'
// or rather objects made accessible...  In the case of Matrix, we may well want several instances, differently configured.

// shader customizer.  Separate function for easier debug test.
CSynth.radOnBeforeCompile = function(shader) {
    // ensure we have uniforms shared as needed
    shader.uniforms.meshInnerRad = window.uniforms.meshInnerRad;
    shader.uniforms.meshOuterRad = window.uniforms.meshOuterRad;
    shader.uniforms.scaleFactor = window.uniforms.scaleFactor;

    // make sure the uniforms are declared
    shader.vertexShader = `
    //--- radOnBeforeCompile preamble
    uniform float meshInnerRad, meshOuterRad, scaleFactor;
    ` + shader.vertexShader;

    // Add code after project chunk to invalidate vertices out of range.
    // Invalidating with NaN kills all associated triangles, interpolation will always have NaN.
    // Leaving this to discard in fragment shader would give cleaner cut edges, but at grater cost.
    const toreplace = '#include <project_vertex>';
    shader.vertexShader = shader.vertexShader.replace(toreplace, `
    ${toreplace}
    //--- radOnBeforeCompile ${toreplace}
    float len = length((modelMatrix * vec4(position,1)).xyz) / scaleFactor;
    if (len < meshInnerRad || len > meshOuterRad)
        gl_Position = vec4(sqrt(-meshOuterRad));
    `);
}

// test code for changing the patch.
CSynth.testImageMat = function() {
    badshader = false;
    const mmat = CSynth.defaultMaterial.clone();
    mmat.onBeforeCompile = CSynth.radOnBeforeCompile;
    CSynth.mc4mesh.material = mmat;
    testmaterial.test(mmat);
}

/** utilities for working with gradients, wrapped in CSynth.Grad object */
CSynth.Grad = function(f32data, xnum, ynum, znum, xsc=1, ysc=1, zsc=1) {
    const me = CSynth.gradInst = this;
    let gxnum, gynum, gznum, gynumx, gynumz, gf;  // grid size for grad

    me.grad = function computeGrad(step = 1) {
        // if (me.gradData) return me.gradData;
        gxnum = Math.floor(xnum/step);
        gynum = Math.floor(ynum/step);
        gznum = Math.floor(znum/step);
        const gradrad = G.gradOuterRad;  // << todo

        me.step = step;
        const st2 = Math.floor(step/2);
        const f = f32data;
        gf = me.gradData = new Float32Array(gxnum * gynum * gznum * 3);
        let k = 0;
        for (let z = st2; z < znum; z+=step) {
            const zn = (z < step ? z : z-step) * xnum * ynum;
            const zp = (z + step >= znum ? z : z+step) * xnum * ynum;
            const z0 = z * xnum * ynum;
            for (let y = st2; y < ynum; y+=step) {
                const yn = (y < step ? y : y-step) * xnum;
                const yp = (y + step >= ynum-1 ? y : y+step) * xnum;
                const y0 = y * xnum;
                for (let x = st2; x < xnum; x+=step) {
                    if ((x-xnum/2)**2 + (y-ynum/2)**2 + (z-znum/2)**2 > gradrad*gradrad) {  // temp radius/roi code
                        k += 3;
                        continue;
                    }

                    const xn = (x < step ? x : x-step);
                    const xp = (x + step >= xnum-1 ? x : x+step);
                    gf[k++] = f[xp + y0 + z0] - f[xn + y0 + z0];
                    gf[k++] = f[x  + yp + z0] - f[x  + yn + z0];
                    gf[k++] = f[x  + y0 + zp] - f[x  + y0 + zn];
                }
            }
        }
        return {gf, gxnum, gynum, gznum};
    }

    me.gradTexture = function gradTexture(ynumx = 1, step = 4) {
        // if (me.gradTextureData) return me.gradTextureData;
        me.grad(step);
        const maxtex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (gynum * gznum < maxtex) ynumx = 1;  // use ynumx 1 if possible
        gynumx = ynumx;
        gynumz = gynum / gynumx;

        if (gxnum*gynumx > maxtex || gynum*gynumz > maxtex || gynumz % 1 !== 0) {
            serious('gradTexture', 'cannot use texture details given', {gxnum, gynum, gznum, gynumx, gynumz, maxtex} )
            return;
        }

        const tt = me.gradTextureData = newTHREE_DataTextureNamed('gradtexture', gf, gxnum*gynumx, gznum*gynumz, THREE.RGBFormat, THREE.FloatType);
            // , undefined, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);
        tt.needsUpdate = true;
        return tt;
    }

    /** set up the gradient for use, will only be effective if gradforce != 0 */
    me.gradUse = function gradUse(ynumx = 16, step = 1) {
        // if (!G.gradOuterRad || W.mcrad >= 999) G.gradOuterRad = 100;
        const u = window.uniforms;
        u.gradField.value = me.gradTexture(ynumx, step);
        u.gradnum.value = VEC3(gxnum, gynum, gznum);
        u.gradlow.value = VEC3(-xnum*xsc/2, -ynum*ysc/2, -znum*zsc/2);
        u.gradhigh.value = VEC3(xnum*xsc/2, ynum*ysc/2, znum*zsc/2);
        u.gradysplit.value = VEC2(gynumx, gynumz);
        // if (G.gradforce === 0) G.gradforce = 0.1;  // no, leave that to be more explicit
        // let k=6; CSynth.rawgroup.children[3].position.set(k,k,k) // ? align better ???
        u.roleforces.value[1] = 0;       // remove the attraction to fixed points (during debug)
        u.roleforces.value[2] = 0.001;   // slightly strengthen the near-backbone springs
        if (CSynth.current.imagetiff.orient) {
            // u.gradtran.value.elements = CSynth.current.imagetiff.orient;
            // u.gradtran.value.transpose();
            u.gradtran.value = CSynth.imagevispGroup.X.matrix.clone(); // in case of symmetric variation on orient
        } else {
            u.gradtran.value.identity();
        }
        Maestro.trigger('gradready');
    }
}  // end CSynth.ImageVisp constructor


CSynth.ImageVisp = function(_data, _fid) {
    let me = this;
    const fid = _fid;

    let mat, geo, points, group, xnum, ynum, znum, f32data, lastGridThresh,
        atfid, glmol, header;   // these are used for external pdb that colours the EM/image mesh

    const mmat = CSynth.defaultMaterial.clone();
    const mesh = CSynth.mc4mesh = new THREE.Mesh(undefined, mmat);
    // add genes that are needed for the shader customization
    // name, def, min, max, delta, step, help, tag, free, internal
    addgene('meshInnerRad', 0, 0, 200, 1,1, 'inner radius for rendering mesh', 'csynth', 0);
    addgene('meshOuterRad', 9999, 0, 200, 1,1, 'outer radius for rendering mesh', 'csynth', 0);
    addgene('gradOuterRad', 100, 0, 200, 1,1, 'outer radius for using grad in dynamics', 'csynth', 0);
    mmat.onBeforeCompile = CSynth.radOnBeforeCompile;
    testmaterial.test(mmat);
    mesh.visible = false;
    let _threshold = 3;

    Object.defineProperty(me, 'threshold', {
        get: ()=> {return _threshold},
        set: (val) => {
            if (val !== _threshold) {
                _threshold = val;
                newmapgrid();
            }
        }
    });
    Object.defineProperty(me, 'pointsVisible', {
        get: ()=> {return points.visible},
        set: (val) => {
            if (val) makepoints();
            points.visible = val;
        }
    });
    Object.defineProperty(me, 'meshVisible', {
        get: ()=> {return mesh.visible},
        set: (val) => {
            mesh.visible = val;
            if (val) newmapgrid();
        }
    });



    const ivuniforms = CSynth.imagevispUniforms = {
        opacity: { value: 0.01 },
        brightness: { value: 1 },
        xsc: {value: 1},
        ysc: {value: 1},
        zsc: {value: 1},
        d2pow: {value: 0},
        //xnum: {value: 1},
        //ynum: {value: 1},
        //znum: {value: 1},
        cameraPositionModel: W.uniforms.cameraPositionModel,
        scaleFactor: W.uniforms.scaleFactor,
        pointSize: {value: 1}
    };


    let _colorBy = 'chain';
    const options = {
        colDistNear: 110, colDistFar: 130, colorByTime: 0,
        get colorBy() { return _colorBy; },
        set colorBy(v) {
            if (v === _colorBy) return;
            _colorBy = v;
            CSynth.colourSurfaceFromID(glmol, options, mesh)
        }
    };

    // generate custom shader for points mode
    me.newmat = function() {
        const vert = `
            // imagevisp vertex
            ${CSynth.CommonShaderCode()}
            attribute float val;
            // attribute float id;
            uniform float pointSize;
            uniform float brightness;
            // attribute vec3 position; // defined by THREE
            // uniform float xnum, ynum, znum;
            uniform float xsc, ysc, zsc;
            uniform vec3 cameraPositionModel;
            uniform float d2pow;
            uniform float opacity;

            varying vec4 col;

            void main() {
                // float x = mod(id, xnum);
                // float y = mod(floor(id/xnum), ynum);
                // float z = floor(id /(xnum*ynum));
                // vec4 pos = vec4(x/xnum * xsc, y/ynum * ysc, z/znum * zsc, 1.);

                vec4 pos = vec4(position.x * xsc, position.y * ysc, position.z * zsc, 1.);
                vec4 posa = modelViewMatrix * pos;
                vec3 ddd = pos.xyz - cameraPositionModel / scaleFactor;
                float dist2 = dot(ddd,ddd);
                //dist2 = 100.;

                // /***
                // float s = brightness * val * pow(dist2, d2pow);
                // float abss = abs(s);
                // float ss;
                // if (abss > 1.) {
                //     gl_PointSize = sqrt(abss);
                //     ss = 1.;
                // } else {
                //     gl_PointSize = 1.;
                //     ss = abss;
                // }
                // col = s > 0. ? vec4(0,ss,0,1) : vec4(-ss,0,0, 1);
                // ***/

                gl_PointSize = pointSize; //  * pow(dist2, d2pow);
                float op = opacity * pow(dist2, d2pow);
                col = val > 0. ? vec4(0,val,0,op) : vec4(-val,0,0, op);

                gl_Position = logdepth(projectionMatrix * posa);
            }
        `;

        const frag = `
            // imagevisp fragment
            precision highp float;
            varying vec4 col;
            void main() {
                gl_FragColor = col;
// gl_FragColor = vec4(1,1,1,1);
            }
        `;
        // one only CSynth.imagevispUniforms so we can have one only gui pointing into it

        mat = new THREE.RawShaderMaterial({
            uniforms: ivuniforms,
            vertexShader: vert,
            fragmentShader: frag
        });
        mat.side = THREE.DoubleSide;
        mat.depthWrite = false;
        mat.blending = THREE.AdditiveBlending;
        mat.transparent = true;

        points.material = mat;
        badshader = false;
        ivuniforms.scaleFactor = W.uniforms.scaleFactor;    // in case initial one too soon
    };  // newmat


    /** map file input */
    function init() {
        group = CSynth.imagevispGroup[fid] = CSynth.imagevispGroup.X = new THREE.Group();
        group.name = "imagevispGroup" + fid;
        CSynth.rawgroup.add(group);

        if (CSynth.current.imagetiff.orient)
            group.matrix.elements = CSynth.current.imagetiff.orient;
        group.matrixAutoUpdate = false;

        points = new THREE.Points(geo, mat);
        points.visible = false;
        points.name = 'imagevispoints';

        group.add(points);
        me.points = CSynth.imagevispoints = points;

        const data = _data.slice(1024);
        f32data = me.f32data = new Float32Array(data);
        // const s = Math.round(f32data.length ** (1/3));
        // xnum = s; ynum = s; znum = s;

        const _header = _data.slice(0, 1024);
        const i32header = me.i32header = new Int32Array(_header);
        const f32header = me.f32header = new Float32Array(_header);
        const map = CSynth.imageMapDef;
        header = me.header = {};
        map.forEach( ([i, nn, info, type]) => {
            const n = nn.toLowerCase();
            const v = type === 'float' ? f32header : i32header;
            if (typeof i === 'number')
                header[n] = v[i-1];
            else
                for (let j = i[0]; j <= i[1]; j++)
                    header[n + (j-i[0])] = v[j-1];
        });
        xnum = header.nx; ynum = header.ny; znum = header.nz;
        if (xnum * ynum * znum !== f32data.length)
            msgfixerror('Image map', fid, 'wrong sizes', xnum, ynum, znum, xnum * ynum * znum, '!=', f32data.length);

        createGUIVR();

        newmapgrid();  // this is visible at once
        const grad = new CSynth.Grad(f32data, xnum, ynum, znum);
        if (G.gradforce) grad.gradUse();
    }

    function makepoints() {
        if (geo) return;
        // xnum = 6400; ynum = 100; znum = 100;
        const sss = xnum*ynum*znum;

        //uniforms.xnum.value = xnum;
        //uniforms.ynum.value = ynum;
        //uniforms.znum.value = znum;

        // geo = planeg(ynum, znum, ynum-1, znum-1, xnum);
        geo =  new THREE.BufferGeometry();
        const pos = new Int16Array(sss*3);
        let o = 0;
        for (let z = 0; z < znum; z++) {
            for (let y = 0; y < ynum; y++) {
                for (let x = 0; x < xnum; x++) {
                    pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        geo.addAttribute( 'position', new THREE.BufferAttribute( pos, 3 ));//.onUpload( () => f32data = null ) );


        //const f = new Float32Array(xnum*ynum*znum).map((v,i)=>i);
        //geo.addAttribute( 'id', new THREE.BufferAttribute( f, 1 ));//.onUpload( () => f = null ) );
        geo.addAttribute( 'val', new THREE.BufferAttribute( f32data, 1 ));//.onUpload( () => f32data = null ) );

        if (!mat) me.newmat();

        points.geometry = geo;
         // points.material = mat; // should already be true
    }

    // capture ids (atom serial) from glmol to use for colour of EM data
    function useglmol(res) {
        // const k = 1.06;  // <<<<<<<<<<<<<<<<<< TODO header.cella0/.header.nx or similar
        const k = header.cella0/header.nx;
        const low = VEC3(-xnum/2 * k, -ynum/2 * k, -znum/2 * k);
        const high = VEC3(xnum/2 * k, ynum/2 * k, znum/2 * k);
        const radInfluence = 2, usecols = false, useids = true, cubic = true;
        const griddata = CSynth.fillGrid(atfid, {low, high, res, radInfluence, usecols, useids, cubic});  // << TODO use less expensive custom function? we only need ids
        return griddata.ids;
    }

    function newmapgrid(th = _threshold, force = false) {
        if (!mesh.visible) return;
        if (lastGridThresh === th && !force) return;
        lastGridThresh = th;
        const mc = new CSynth.MarchingCubes(xnum, ynum, znum);
        if (CSynth.current.extraPDB) atfid = CSynth.current.extraPDB[1];  // <<<< TODO ability to choose pdb
        glmol = CSynth.glmol[atfid];
        const ids = atfid ? useglmol(xnum) : undefined;
        const mgeo = mc.makeGeometry(f32data, th, undefined, ids);

        // CSynth.rawgroup.remove(CSynth.mc4mesh);
        mesh.geometry = mgeo;
        // todo get centre and scale out of metadata
        // const k = 1.06;
        const k = header.cella0/header.nx;

        mesh.position.set(-xnum/2 * k, -ynum/2 * k, -znum/2 * k);
        mesh.scale.set(k, k, k);
        group.add(mesh);
    }

    function createGUIVRM(pgui) {
        var gui = dat.GUIVR.createX("imagevisp surface");
        gui.add(me, 'meshVisible').name('visible').listen().showInFolderHeader();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.

        gui.add(me, 'threshold', -8, 8).step(0.1).listen().name('threshold');
        guiFromGene(gui, 'meshInnerRad');
        guiFromGene(gui, 'meshOuterRad');
        CSynth.materialGui(mmat, gui);
        gui.add(options, 'colorBy', CSynth.colorBy.files);
        gui.add(options, 'colDistNear', 0, 200).step(1).listen();
        gui.add(options, 'colDistFar', 0, 200).step(1).listen();
            const bb = [1,
            { func: ()=>newmapgrid(_threshold, true), tip: "apply all the set parameters", text: 'Apply' }
        ];
        gui.addImageButtonPanel.apply(gui, bb).setRowHeight(0.075); // .highlightLastPressed();


        pgui.addFolder(gui);
        pgui.add(CSynth.gradLineGui());
        VH.imagevispM = gui;
        return gui;
    }


    function createGUIVR(pgui = V.gui) {
        // if (VH.imagevisp) return;  // do not remake gui
        var vgui = dat.GUIVR.createX(fid.split('/').pop());
        pgui.addFolder(vgui);
        // var vgui = V.gui;

        vgui.add(group, 'visible').listen().showInFolderHeader();

        createGUIVRM(vgui);

        var gui = dat.GUIVR.createX("imagevisp points");
        vgui.addFolder(gui);
        gui.add(me, 'pointsVisible').listen().name('visible').showInFolderHeader();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        gui.add(ivuniforms.opacity, 'value', 0, 1).step(0.01).listen().name('Opacity');
        gui.add(ivuniforms.brightness, 'value', -3, 0).step(0.01).listen().name('Brightness');
        gui.add(ivuniforms.xsc, 'value', 0, 100).listen().name('xsc').step(0.01);
        gui.add(ivuniforms.ysc, 'value', 0, 100).listen().name('ysc').step(0.01);
        gui.add(ivuniforms.zsc, 'value', 0, 100).listen().name('zsc').step(0.01);
        gui.add(ivuniforms.pointSize, 'value', 0, 10).listen().name('Point Size');
        gui.add(ivuniforms.d2pow, 'value', -4, 0).step(0.1).listen().name('Point power');
        VH.imagevisp = gui;

        return gui;
    }

    me.val = function(x,y,z) {
        const f = Math.floor;
        const o = (x + f(xnum/2)) + (y + f(ynum/2)) * xnum +  (z + f(znum/2)) * xnum * ynum;
        return me.f32data[o];
    }

    init();  // call this AFTER everything else defined

}  // end CSynth.ImageVisp constructor

// CSynth.imagevisp = new CSynth.ImageVisp();
CSynth.imagevispGroup = {};

CSynth.gradLines = function(nlines = 1, rad = 100, thresh=0.1, maxlen = 20) {
    const round = Math.round, sqrt = Math.sqrt;
    const inst = CSynth.imageVispInst;
    const header = inst.header;
    const rawd = inst.f32data;
    const gradd = inst.grad();

    const {nx, ny, nz, nxstart, nystart, nzstart, dmin, dmax} = header;
    // let mesh, geom, mat;

    if (!CSynth.gradLineMesh) {
        const mat = CSynth.gradLineMat = new THREE.LineBasicMaterial( {
            color: 0xffffff, opacity: 1,
            linewidth: 1, vertexColors: THREE.VertexColors
        } );
        const geom = new THREE.BufferGeometry();

        const mesh = CSynth.gradLineMesh = new THREE.LineSegments(geom, mat);
        const k = header.cella0/header.nx;
        // mesh.position.set(-nx/2 * k, -ny/2 * k, -nz/2 * k);  // no, we are doing centre
        mesh.scale.set(k, k, k);
        CSynth.imagevispGroup.X.add(mesh);
    }

    const vertices = [];
    const colors = [];
    const nn = Math.ceil(nlines**0.333), step = 2*rad/nn - 0.0001;
    log({nn, step})
    for (let xs=-rad; xs<rad; xs+=step)
    for (let ys=-rad; ys<rad; ys+=step)
    for (let zs=-rad; zs<rad; zs+=step) {
        let [x,y,z] = [xs, ys, zs];

//    for (let i = 0; i < nlines; i++) {
//        let [x,y,z] = [randi(-rad, rad), randi(-rad, rad), randi(-rad, rad)];
        if (sqrt(x*x + y*y + z*z) > rad) continue;
        let seglen = 0;
        while (true) {
            const [dx, dy, dz] = grad(x,y,z);
            const len = sqrt(dx*dx + dy*dy + dz*dz);
            if (len < thresh || seglen > maxlen) break;
            const v = (f(x,y,z) - dmin)/(dmax-dmin);
            vertices.push(x,y,z);
            colors.push(1,v**2,0);
            x += dx/len;
            y += dy/len;
            z += dz/len;
            const vv = (f(x,y,z) - dmin)/(dmax-dmin);
            vertices.push(x,y,z);
            colors.push(1,vv**2,0);
            seglen++;
        }
    }
    const geom = CSynth.gradLineMesh.geometry;
    geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geom.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.attributes.position.needsUpdate = true

    function grad(x,y,z) {
        const k = 3 * ((round(x) - nxstart) + (round(y) - nystart) * nx  + (round(z) - nzstart) * nx * ny);
        return [gradd[k], gradd[k+1], gradd[k+2]];
    }
    function f(x,y,z) {
        const k = ((round(x) - nxstart) + (round(y) - nystart) * nx  + (round(z) - nzstart) * nx * ny);
        return rawd[k];
    }
}

CSynth.gradLineGui = function() {
    let s = {nlines: 1200, rad: 100, thresh: -6, maxlen: 20};
    Object.defineProperty(s, 'visible', {
        get: () => {return !!(CSynth.gradLineMesh && CSynth.gradLineMesh.visible);},
        set: (v) => { if (v) run(); CSynth.gradLineMesh.visible = v; }
    });

    function run() {CSynth.gradLines(s.nlines, s.rad, 10**s.thresh, s.maxlen);}

    var gui = dat.GUIVR.createX("gradient lines");
    gui.add(s, 'visible').listen().showInFolderHeader();

    gui.add(s, 'nlines', 10, 64000).step(10).listen().name('numLines').onChange(run).setToolTip(`Number of lines to draw.
This number approximate,
lines will be generated on a grid
within the given radius.`);
    gui.add(s, 'rad', 10, 200).step(1).listen().name('radius of field used').onChange(run).setToolTip(`Radius of field to use.
The is used to define starting points of lines.
Lines may wander outside this radius.`);
    gui.add(s, 'thresh', -8, 0).step(0.5).listen().name('threshold').onChange(run).setToolTip(`Grad threshold
Lines are terminated
if the strenght of the gradient falls below this level.`);
    gui.add(s, 'maxlen', 1, 100).step(1).listen().name('maxlen').onChange(run).setToolTip(`Maximum line length.
This is the maximum length of a line in steps
if not previously terminated by the threshold value.`);
    return gui;
}

// help develop/test
if (CSynth.imagevispGroup.X) {
    CSynth.imagevispGroup.X.remove(CSynth.gradLineMesh);
    CSynth.gradLineMesh = undefined;
}


CSynth.imageMapDef = [
[1, 'NX', 'number of columns (fastest changing in map)'],
[2, 'NY', 'number of rows'],
[3, 'NZ', 'number of sections (slowest changing in map)'],
[4, 'MODE', '0: 8bit, 1: 16bit, 2: 32float, 3: 16bit transform, 4: 32float transform'],
// [data type :, '0', 'image : signed 8-bit bytes range -128 to 127'],
// 1	image : 16-bit halfwords
// 2	image : 32-bit reals
// 3	transform : complex 16-bit integers
// 4	transform : complex 32-bit reals
[5, 'NXSTART', 'number of first column in map (Default = 0)'],
[6, 'NYSTART', 'number of first row in map'],
[7, 'NZSTART', 'number of first section in map'],
[8, 'MX', 'number of intervals along X'],
[9, 'MY', 'number of intervals along Y'],
[10, 'MZ', 'number of intervals along Z'],
[[11,13], 'CELLA', 'cell dimensions in angstroms', 'float'],
[[14,16], 'CELLB', 'cell angles in degrees', 'float'],
[17, 'MAPC', 'axis corresp to cols (1,2,3 for X,Y,Z)'],
[18, 'MAPR', 'axis corresp to rows (1,2,3 for X,Y,Z)'],
[19, 'MAPS', 'axis corresp to sections (1,2,3 for X,Y,Z)'],
[20, 'DMIN', 'minimum density value', 'float'],
[21, 'DMAX', 'maximum density value', 'float'],
[22, 'DMEAN', 'mean density value', 'float'],
[23, 'ISPG', 'space group number 0 or 1 (default=0)'],
[24, 'NSYMBT', 'number of bytes used for symmetry data (0 or 80)'],
//[[25,49], 'EXTRA', 'extra space used for anything – 0 by default'],
[[50,52], 'ORIGIN', 'origin in X,Y,Z used for transforms'],
[53, 'MAP', 'character string ‘MAP ‘ to identify file type'],
[54, 'MACHST', 'machine stamp'],
[55, 'RMS', 'rms deviation of map from mean density', 'float'],
[56, 'NLABL', 'number of labels being used']
//[57-256, 'LABEL(20,10)', '10 80-character text labels']
];
