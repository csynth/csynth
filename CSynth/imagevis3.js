//////////////////
// template taken from HistoryTrace
'use strict';

var CSynth, V, THREE, dat, planeg, W, currentGenes, CSynthFast, disposeArray, VH, copyFrom, Maestro,
camera, badshader;

// aside: good article on 3d image options
// http://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002519

// This version uses textures and simple grid aligned in front of the camera
CSynth.ImageVis3 = function() {
    let me = this;

    // see also addfragment
    let mat;      // my material
    let geo;       // my geometry
    let group, meshgroup, mesh;
    let tiffTexInvMat = new THREE.Matrix4();
    CSynth.tiffTexInvMat = tiffTexInvMat;

    const uniforms = CSynth.imagevis3Uniforms = {};
    copyFrom(uniforms, CSynth.imagevisUniforms);
    copyFrom(uniforms, {
            zfront: { value: 1000 },
            zrange: { value: 1000 },
            planes: {value: 50},
            tiffTexInvMat: {value: tiffTexInvMat}
        });


    this.newmat = function() {
        const vert = `
            ${CSynth.CommonShaderCode()}
            uniform float xnum, ynum, znum, xsc, ysc, zsc;
            uniform float planes;
            uniform float zfront, zrange;
            uniform vec3 cameraPositionModel;
            varying vec3 opos;

            void main() {
                opos = position;
                opos.xy *= 100000.;
                opos.z = - (zfront + opos.z * zrange / planes);
                gl_Position = logdepth(projectionMatrix * vec4(opos, 1)); // use untransformed position
            }
        `;

        const frag = `
            ${CSynth.CommonFragmentShaderCode()}

            varying vec3 opos;
            uniform mat4 tiffTexInvMat;
            uniform sampler2D tiftex;
            uniform float xnum, ynum, znum, xsc, ysc, zsc;
            uniform float brightness;
            uniform float opacity;

            // do 3d texture lookup, with expected values of x,y,z in range -xnum/2..xnum/2, etc
            vec4 tex3d(sampler2D tex, vec3 pos) {
                pos = pos + vec3(xnum, ynum, znum)*0.5;
                pos = floor(pos + 0.5);  // needed for z and for consistency in x and y
                if (pos.x <= 0. || pos.y <= 0. || pos.z <= 0.) discard;
                if (pos.x >= xnum || pos.y >= ynum || pos.z >= znum) discard;
                vec2 kpos = vec2( (pos.x + 0.5) / xnum, (pos.y + pos.z * ynum + 0.5) / (ynum * znum));
                return texture2D(tex, kpos);
            }

            void main() {
                vec4 pos = tiffTexInvMat * vec4(opos, 1);
                // pos = vec4(opos, 1);
                vec4 col = tex3d(tiftex, pos.xyz) * pow(10., brightness);
                gl_FragColor = vec4(col.xyz, opacity);
                // gl_FragColor = vec4(1,1,1, 0.1);
            }
        `;
        // one only CSynth.imagevis3Uniforms so we can have one only gui pointing into it

        mat = new THREE.RawShaderMaterial({
            uniforms: CSynth.imagevis3Uniforms,
            vertexShader: vert,
            fragmentShader: frag
        });
        mat.transparent = !CSynthFast;
        //mat.opacity = 0.8;
        mat.side = THREE.DoubleSide;
        mat.depthWrite = false;
        mat.blending = THREE.AdditiveBlending;

        setgraph();
    };  // newmat

    this.newdata = function(data, fid) {
        CSynth.imagevis2.newdata(data, fid);    // this makes the texture, TODO prevent duplicate setup work
        uniforms.tiftex.value = CSynth.tiftex;  // use in uniforms

        // data should be decoded tiff data
        // assumption about tiff data is that it contains znum*3 images
        // arraged in r,g,b order, and each of same size xnum * ynum
        const d0 = data[0];
        const xnum = d0.width, ynum = d0.height, znum = data.length/3;
        uniforms.xnum.value = xnum;
        uniforms.ynum.value = ynum;
        uniforms.znum.value = znum;

        geo = planeg(100, 100, 1,1, Math.floor(uniforms.planes.value));
        //const pos = geo.attributes.position.array;
        //for (let i=2; i<pos.length; i += 3) pos[i] *= -1; // reverse the z values

        if (!mat) me.newmat();
        me.createGUIVR(); // will be no-op after first time in
        setgraph();
    };

    const a = new THREE.Matrix4();
    const b = new THREE.Matrix4();
    const c = new THREE.Matrix4();
    const d = new THREE.Matrix4();
    function setmats() {
        if (!group.visible) return;
        const x = uniforms.xnum.value * uniforms.xsc.value;
        const y = uniforms.ynum.value * uniforms.ysc.value;
        const z = uniforms.znum.value * uniforms.zsc.value;
        const range = Math.sqrt(x*x + y*y + z*z)
        uniforms.zfront.value = camera.position.length() - range/2;
        uniforms.zrange.value = range/2;

// forward transforms
// pos = vec4(position.x * xsc, position.y * ysc, position.z * zsc, 1.);
// pos *= rot4;
// gl_Position = projectionMatrix * modelViewMatrix * pos;
// camera.matrixWorldInverse * object.matrixWorld => modelViewMatrix


        tiffTexInvMat.identity();
        a.scale( {x: uniforms.xsc.value, y: uniforms.ysc.value, z: uniforms.zsc.value });
        b.copy(window.uniforms.rot4.value); b.transpose();


        tiffTexInvMat.premultiply(a);
        tiffTexInvMat.premultiply(b);
        tiffTexInvMat.premultiply(mesh.matrixWorld);
        tiffTexInvMat.premultiply(camera.matrixWorldInverse);
        tiffTexInvMat.getInverse(tiffTexInvMat);
        return;

        // tiffTexInvMat.copy(camera.matrixWorld);
        tiffTexInvMat.getInverse(uniforms.rot4.value);

        tiffTexInvMat.scale( {x: 100.01, y: 100.01, z: -1 });
        tiffTexInvMat.setPosition( {x: 0, y: 0, z: 0 });
        // tiffTexInvMat.scale( {x: 10.01, y: 10.01, z: 0.1 });
    }
    Maestro.on('trackdone', setmats);

    /** set up the geometry and material for all the graphics */
    function setgraph() {
        mesh.geometry = geo;
        mesh.material = mat;
        badshader = false;
    }

    function makegroup() {
        // Use a single group that can be transformed and made visible as required
        // Under it have one groups, one for mesh (points no longer used)
        // Usually just one of those two will be visible.
        group = new THREE.Group();
        group.name = 'imagevis3group';
        CSynth.rawgroup.remove(CSynth.imagevis3group);
        CSynth.rawgroup.add(group);
        group.visible = false;
        me.group = CSynth.imagevis3group = group;

        meshgroup = new THREE.Group();
        meshgroup.name = 'imagevis3meshgroup';
        group.add(meshgroup);
        me.meshGroup = CSynth.imagevis3meshgroup = meshgroup;

        // make the meshes
        mesh = new THREE.Mesh();
        mesh.name = 'imagevis3mesh';
        CSynth.imagevis3mesh = mesh;
        meshgroup.add(mesh);
    }
    makegroup();  // make it once, even though we may not have geometry and materials yet


    this.createGUIVR = function() {
        if (VH.ImageVis3) return;  // do not remake gui
        var gui = dat.GUIVR.createX("ImageVis3 work in progress");
        gui.add(group, 'visible').listen();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        gui.add(mat.uniforms.opacity, 'value', 0, 1).step(0.01).listen().name('Opacity');
        gui.add(mat.uniforms.brightness, 'value', -3, 0).step(0.01).listen().name('Brightness');
        gui.add(mat.uniforms.xsc, 'value', 0, 100).listen().name('xsc').step(0.01);
        gui.add(mat.uniforms.ysc, 'value', 0, 100).listen().name('ysc').step(0.01);
        gui.add(mat.uniforms.zsc, 'value', 0, 100).listen().name('zsc').step(0.01);


        V.gui.addFolder(gui);
        VH.ImageVis3 = gui;
        return gui;
    }
}

/** snippets to help debug */
//var ms, k, renderMainObject; // debug
CSynth.zzz3debug = function() {
// VH.ImageVis3 = new CSynth.ImageVis3(); V.gui.addFolder(VH.ImageVis3.createGUIVR());
// select and ctrl-shift-e to evaluate in console

CSynth.imagevis3.newdata(CSynth.tiffdata)
//ms = CSynth.imagevis3meshgroup.children;
//k = 7; ms[0].visible = !!(k&1); ms[1].visible = !!(k&2); ms[2].visible = !!(k&4)
VH.setguivisible(true)
CSynth.imagevis3group.visible = true;
//renderMainObject = false;
CSynth.annotationGroup.visible=false;
W.springgui.style.display = 'none';
VH.matrix.visible = false;

CSynth.imagevis3Uniforms.brightness.value=-1.5;
// CSynth.imagevis3.newmat(); // refresh the shader
}
