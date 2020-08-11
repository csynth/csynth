//////////////////
// template taken from HistoryTrace
'use strict';

var CSynth, V, THREE, dat, planeg, W, currentGenes, CSynthFast, disposeArray, VH, copyFrom, badshader, gl, msgfixerror,
newTHREE_DataTextureNamed;

// aside: good article on 3d image options
// http://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002519

// Do we want to make these be functions that you call with 'new CSynth.HistoryTrace()'
// or rather objects made accessible...  In the case of Matrix, we may well want several instances, differently configured.

// This version uses grids that allign with the data points, as with imagevis
// However, it uses just 4 vertices per plane,
// and then uses texture lookup in the fragment shader for colour.
// This gives better performance then imagevis (around 1.25 times better?)
// BUT the texture lookup is not interpolated in this version.
CSynth.ImageVis2 = function() {
    let me = this;

    // see also addfragment
    let mat, matx, maty, matz;      // my materials, differ by norm (and maybe other uniforms in future)
    let geox, geoy, geoz;           // my geometry
    let group, meshgroup, meshx, meshy, meshz;
    let xnum, ynum, znum;
    let texture;
    let split;      // current value of split for material

    const uniforms = CSynth.imagevis2Uniforms = {};
    copyFrom(uniforms, CSynth.imagevisUniforms);
    const uniformsx = { norm: { value: new THREE.Vector3(1,0,0)} };
    copyFrom(uniformsx, uniforms);  // shallow copy by reference
    const uniformsy = { norm: { value: new THREE.Vector3(0,1,0)} };
    copyFrom(uniformsy, uniforms);  // shallow copy by reference
    const uniformsz = { norm: { value: new THREE.Vector3(0,0,1)} };
    copyFrom(uniformsz, uniforms);  // shallow copy by reference


    this.newmat = function() {
        let oldsplit = split;
        if (ynum * znum < gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
            split = 1;
        } else {
            split = 20;
            if (ynum % split !== 0)
                msgfixerror('split value not appropriate, there will be distortions');
        }

        if (split === oldsplit) return;

        const vert = `
            // imagevis2 vert
            ${CSynth.CommonShaderCode()}
            uniform vec3 norm;
            // attribute vec3 position; // defined by THREE
            uniform float xnum, ynum, znum, xsc, ysc, zsc;
            uniform vec3 cameraPositionModel;
            varying vec3 opos;

            void main() {
                opos = position + vec3(xnum, ynum, znum)*0.5;  // pass to fragment for texture lookup
                vec4 pos = vec4(position.x * xsc, position.y * ysc, position.z * zsc, 1.); // use for vertex position

                // for autopan, taken from hornmaker ... assumes GPUSCALE and NOSCALE for simplicity
                //vec4 xx = texture2D(scaleDampTarget, vec2(0.5 ,0.5));
                //pos.xyz -= xx.xyz;

                // modulate strength so we do not look along planes
                vec3 camDirModel = normalize(pos.xyz - cameraPositionModel);
// todo                vec3 normModel = normalize(norm * mat3(rot4));
//                float str = -dot(camDirModel, normModel);
float str = 1.;

                gl_Position = logdepth(projectionMatrix * modelViewMatrix * pos);
                //col = color * pow(10., brightness);
                // if (str < 0.3) gl_Position.x = sqrt(-str*str);  // experiment to see if we can speed things up
                // if (str < 0.1) gl_Position.w = 0.;  // experiment to see if we can speed things up
                // col *= (norm.x/xnum + norm.y/ynum + norm.z/znum);  // << can optimize out of shader
                //col *= str * str;
            }
        `;

        const frag = `
            // imagevis2 frag
            precision highp float;
            const float split = float(${split});

            varying vec3 opos;
            uniform sampler2D tiftex;
            uniform float xnum, ynum, znum, xsc, ysc, zsc;
            uniform float brightness, offset;

            // do 3d texture lookup, with expected integer values of x,y,z
            vec4 tex3d(sampler2D tex, vec3 pos) {
                // pos = pos + vec3(xnum, ynum, znum)*0.5; // do in sending opos
                pos = floor(pos + 0.5);  // needed for z and for consistency in x and y pos 0..xnum-1, etc
                // xnum * split, ynum * znum / split
                float yk = floor(pos.y / split);  // eg range [0..16) for split = 20, ynum = 320
                float yr = pos.y - split * yk;    // range [0..split)
                vec2 kpos = vec2( (pos.x + 0.5 + yr*xnum) / (xnum*split), (yk + pos.z * ynum/split + 0.5) / (ynum * znum / split) );

                // vec2 kpos = vec2( (pos.x + 0.5) / xnum, (pos.y + pos.z * ynum + 0.5) / (ynum * znum));
                return texture2D(tex, kpos);
            }

            uniform float opacity;
            void main() {
                vec4 col = (tex3d(tiftex, opos) - offset) * pow(10., brightness);
                gl_FragColor = vec4(col.xyz, col.r < 0. ? 0. : opacity);
            }
        `;
        // one only CSynth.imagevis2Uniforms so we can have one only gui pointing into it

        mat = new THREE.RawShaderMaterial({
            uniforms: CSynth.imagevis2Uniforms,
            vertexShader: vert,
            fragmentShader: frag
        });
        mat.transparent = !CSynthFast;
        //mat.opacity = 0.8;
        mat.side = THREE.DoubleSide;
        mat.depthWrite = false;
        mat.blending = THREE.AdditiveBlending;

        matx = mat.clone(); matx.uniforms = uniformsx;
        maty = mat.clone(); maty.uniforms = uniformsy;
        matz = mat.clone(); matz.uniforms = uniformsz;

        setgraph();
        badshader = false;
    };  // newmat

    function grids() {
        {
        geox = planeg(ynum, znum, 1,1, xnum);
        const pos = geox.attributes.position.array;
        let o = 0;  // output pos
        for (let x = 0; x < xnum; x++) {
            for (let z = 0; z < znum; z+=znum-1) {
                for (let y = 0; y < ynum; y+=ynum-1) {
                    pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        }

        {
        geoy = planeg(znum, xnum, 1,1, ynum);
        const pos = geoy.attributes.position.array;
        let o = 0;  // output pos
        for (let y = 0; y < ynum; y++) {
            for (let x = 0; x < xnum; x+=xnum-1) {
                for (let z = 0; z < znum; z+=znum-1) {
                    pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        }

        {
        geoz = planeg(xnum, ynum, 1,1, znum);
        const pos = geoz.attributes.position.array;
        let o = 0;  // output pos
        for (let z = 0; z < znum; z++) {
            for (let y = 0; y < ynum; y+=ynum-1) {
                for (let x = 0; x < xnum; x+=xnum-1) {
                    pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        }

        uniforms.xnum.value = xnum;
        uniforms.ynum.value = ynum;
        uniforms.znum.value = znum;

        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        CSynth.tiftex = texture;
        uniforms.tiftex.value = CSynth.tiftex;

        me.newmat();
        me.createGUIVR(); // will be no-op after first time in
        setgraph();
    }

    this.newdata = function(data, fid) {
        // data should be decoded tiff data
        // assumption about tiff data is that it contains znum*3 images
        // arraged in r,g,b order, and each of same size xnum * ynum
        const d0 = data[0];
        const cpp = this.cpp = data.length === 21 ? 3 : 1;  //<<<< seriously wrong, special case for old mouse data
        xnum = this.xnum = d0.width; ynum = this.ynum = d0.height; znum = this.znum = data.length/cpp;

        data.forEach(d => d.min = d.data.reduce((c, v) => Math.min(c, v)));
        data.forEach(d => d.max = d.data.reduce((c, v) => Math.max(c, v)));
        const min = this.min = data.reduce((c, s) => Math.min(c, s.min), Number.MAX_VALUE);
        const max = this.max = data.reduce((c, s) => Math.max(c, s.max), Number.MIN_VALUE);
        const range = this.range = max - min;
        this.tiffdata = data;       // help poke at useful information

        // for now, do not align data, and do not try to use interpolation
        // also limited to 2d textures
        const cols = new Float32Array( xnum * ynum * znum * cpp);  // var as may be cleared after upload
        // unwrap colour information from matrices
        let o = 0;  // output pos
        for (let z = 0; z < znum; z++) {
            let r, g, b;
            if (cpp === 3) {
                r = data[z * 3].data; g = data[z * 3 + 1].data; b = data[z * 3 + 2].data;
            } else {
                r = g = b = data[z].data;  // wasteful here, to decide
            }
            for (let y = 0; y < ynum; y++) {
                for (let x = 0; x < xnum; x++) {
                    const i = xnum * y + x;
                    cols[o++] = r[i]-min;
                    if (cpp ===3) {
                        cols[o++] = g[i]-min;
                        cols[o++] = b[i]-min;
                    }
                }
            }
        };

        texture = newTHREE_DataTextureNamed('imagecols', cols, xnum * split, ynum * znum / split,
        cpp === 3 ? THREE.RGBFormat : THREE.LuminanceFormat,
           THREE.FloatType, undefined,
           THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);

        grids(xnum, ynum, znum);

    };

    this.newmapdata = function(data, fid) {
        data = data.slice(1024);
        const f32data = me.f32data = new Float32Array(data);
        const s = Math.round(f32data.length ** (1/3));
        xnum = s; ynum = s; znum = s;

        texture = newTHREE_DataTextureNamed('imagetext_' + fid, f32data, xnum * split, ynum * znum / split, THREE.LuminanceFormat,
            THREE.FloatType, undefined,
            THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);

        grids(xnum, ynum, znum);
    }

    /** set up the geometry and material for all the graphics */
    function setgraph() {
        meshx.geometry = geox;
        meshy.geometry = geoy;
        meshz.geometry = geoz;
        meshx.material = matx;
        meshy.material = maty;
        meshz.material = matz;
    }

    function makegroup() {
        // Use a single group that can be transformed and made visible as required
        // ??? TODO redundant, only mesh used, never use points here
        // Usually just one of those two will be visible.
        group = new THREE.Group();
        group.name = 'imagevis2group';
        CSynth.imageallGroup.remove(CSynth.imagevis2group);
        CSynth.imageallGroup.add(group);
        group.visible = false;
        me.group = CSynth.imagevis2group = group;

        meshgroup = new THREE.Group();
        meshgroup.name = 'imagevis2meshgroup';
        group.add(meshgroup);
        me.meshGroup = CSynth.imagevis2meshgroup = meshgroup;

        // make the three meshes, they won't be populated till data is available
        meshx = new THREE.Mesh();
        meshx.name = 'imagevis2meshx';
        meshgroup.add(meshx);
        meshy = new THREE.Mesh();
        meshy.name = 'imagevis2meshy';
        meshgroup.add(meshy);
        meshz = new THREE.Mesh();
        meshz.name = 'imagevis2meshz';
        meshgroup.add(meshz);
    }
    makegroup();  // make it once, even though we may not have geometry and materials yet


    this.createGUIVR = function() {
        if (VH.ImageVis2) return;  // do not remake gui
        var gui = dat.GUIVR.createX("ImageVis2 probably best");
        gui.add(group, 'visible').listen().showInFolderHeader();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        gui.add(mat.uniforms.opacity, 'value', 0, 1).step(0.001).listen().name('Opacity');
        gui.add(mat.uniforms.brightness, 'value', -3, 0).step(0.01).listen().name('Brightness');
        gui.add(mat.uniforms.offset, 'value', 0, 100).step(0.1).listen().name('Offset');
        gui.add(mat.uniforms.xsc, 'value', 0, 100).listen().name('xsc').step(0.01);
        gui.add(mat.uniforms.ysc, 'value', 0, 100).listen().name('ysc').step(0.01);
        gui.add(mat.uniforms.zsc, 'value', 0, 100).listen().name('zsc').step(0.01);
        gui.add(meshx, 'visible').listen().name('X planes visible');
        gui.add(meshy, 'visible').listen().name('Y planes visible');
        gui.add(meshz, 'visible').listen().name('Z planes visible');

        V.gui.addFolder(gui);
        VH.ImageVis2 = gui;
        return gui;
    }
}

/** snippets to help debug */
//var ms, k, renderMainObject; // debug
CSynth.zzz2debug = function() {
// VH.ImageVis2 = new CSynth.ImageVis2(); V.gui.addFolder(VH.ImageVis2.createGUIVR());
// select and ctrl-shift-e to evaluate in console

CSynth.imagevis2.newdata(CSynth.tiffdata)
//ms = CSynth.imagevis2meshgroup.children;
//k = 7; ms[0].visible = !!(k&1); ms[1].visible = !!(k&2); ms[2].visible = !!(k&4)
VH.setguivisible(true)
CSynth.imagevis2group.visible = true;
//renderMainObject = false;
CSynth.annotationGroup.visible=false;
W.springgui.style.display = 'none';
VH.matrix.visible = false;

CSynth.imagevis2Uniforms.brightness.value=-1.5;
CSynth.imagevis2Uniforms.offset.value=0;
// CSynth.imagevis2.newmat(); // refresh the shader
}
