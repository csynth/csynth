//////////////////
// template taken from HistoryTrace
'use strict';

var CSynth, V, THREE, dat, planeg, W, currentGenes, CSynthFast, disposeArray, VH,
copyFrom, badshader, log, renderMainObject, serious, glsl;

// aside: good article on 3d image options
// http://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002519

// Do we want to make these be functions that you call with 'new CSynth.HistoryTrace()'
// or rather objects made accessible...  In the case of Matrix, we may well want several instances, differently configured.

// This version uses grids that allign with the data points,
// one grid in each of the axial directions.
// This uses a large number of vertices but avoids texture lookup.
CSynth.ImageVis = function() {
    let me = this;

    // see also addfragment
    let mat, matx, maty, matz;      // my materials, differ by norm (and maybe other uniforms in future)
    let geox, geoy, geoz;           // my geometry
    let allvisgroup, mygroup, meshx, meshy, meshz, points;

    const myuniforms = CSynth.imagevisUniforms = {
            //sjpt 2/8/17 to remove soon >> rot4: window.uniforms.rot4,
            scaleDampTarget: window.uniforms.scaleDampTarget,
            opacity: { value: 0.01 },
            brightness: { value: -1.5 },
            offset: { value: 0 },
            scaleFactor: window.uniforms.scaleFactor,
            xsc: {value: 1},
            ysc: {value: 1},
            zsc: {value: 8},
            xnum: {value: 1},
            ynum: {value: 1},
            znum: {value: 1},
            pointSize: {value: 3},
            cameraPositionModel: W.uniforms.cameraPositionModel,
            tiftex: {value: undefined}  // not used by imagevis, but by others
        };
    const uniformsx = { norm: { value: new THREE.Vector3(1,0,0)} };
    copyFrom(uniformsx, myuniforms);  // shallow copy by reference
    const uniformsy = { norm: { value: new THREE.Vector3(0,1,0)} };
    copyFrom(uniformsy, myuniforms);  // shallow copy by reference
    const uniformsz = { norm: { value: new THREE.Vector3(0,0,1)} };
    copyFrom(uniformsz, myuniforms);  // shallow copy by reference


    this.newmat = function() {
        const vert = /*glsl*/`
            // imagevis vertex
            ${CSynth.CommonShaderCode()}
            attribute vec3 color;
            uniform vec3 norm;
            uniform float pointSize;
            uniform float brightness, offset;
            // attribute vec3 position; // defined by THREE
            uniform float xnum, ynum, znum, xsc, ysc, zsc;
            uniform vec3 cameraPositionModel;

            varying vec3 col;

            void main() {
                vec4 pos = vec4(position.x * xsc, position.y * ysc, position.z * zsc, 1.);

                // for autopan, taken from hornmaker ... assumes GPUSCALE and NOSCALE for simplicity
                //vec4 xx = texture2D(scaleDampTarget, vec2(0.5 ,0.5));
                //pos.xyz -= xx.xyz;

                //sjpt 2/8/17 to remove soon >> pos *= rot4;

                // modulate strength so we do not look along planes
                vec3 camDirModel = normalize(pos.xyz - cameraPositionModel);
//                vec3 normModel = normalize(norm * mat3(rot4));
//                float str = -dot(camDirModel, normModel);
float str = 1.;
                gl_Position = logdepth(projectionMatrix * modelViewMatrix * pos);
                gl_PointSize = pointSize;
                col = (color-offset) * pow(10., brightness);
                // if (str < 0.3) gl_Position.x = sqrt(-str*str);  // experiment to see if we can speed things up
                // if (str < 0.1) gl_Position.w = 0.;  // experiment to see if we can speed things up
                // col *= (norm.x/xnum + norm.y/ynum + norm.z/znum);  // << can optimize out of shader
                col *= str * str;
            }
        `;

        const frag = `
            // imagevis fragment
            precision highp float;

            //$//{CSynth.CommonFragmentShaderCode()}
            varying vec3 col;
            uniform float opacity;
            void main() {
                gl_FragColor = vec4(col, opacity);
            }
        `;
        // one only CSynth.imagevisUniforms so we can have one only gui pointing into it

        mat = new THREE.RawShaderMaterial({
            uniforms: myuniforms,
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

    this.newdata = function(data, fid) {
        // data should be decoded tiff data
        // assumption about tiff data is that it contains znum*3 images
        // arraged in r,g,b order, and each of same size xnum * ynum
        const d0 = data[0];
        const spp = d0.samplesPerPixel; // samples per pixel
        if (spp !== 1)
            throw(serious('TIFF unexpected samplesPerPixel', spp))

        const cpp = data.length === 21 ? 3 : 1;  //<<<< seriously wrong
        const xnum = d0.width, ynum = d0.height, znum = data.length/cpp;

        myuniforms.xnum.value = xnum;
        myuniforms.ynum.value = ynum;
        myuniforms.znum.value = znum;
        log('tiff data', xnum, ynum, znum, cpp, 'cols');

        //  NOTE: inefficiecy for cpp=3, we still make colour (colsx, colsy, colsz) rgb using extra space

        {
        geox = planeg(ynum, znum, ynum-1, znum-1, xnum);
        var colsx = new Float32Array( xnum * ynum * znum * 3);  // var as may be cleared after upload
        const pos = geox.attributes.position.array;
        // unwrap colour information from matrices
        let o = 0;  // output pos
        for (let x = 0; x < xnum; x++) {
            for (let z = 0; z < znum; z++) {
                let r, g, b;
                if (cpp === 3) {
                    r = data[z * 3].data; g = data[z * 3 + 1].data; b = data[z * 3 + 2].data;
                } else {
                    r = g = b = data[z].data;
                }

                for (let y = 0; y < ynum; y++) {
                    const i = xnum * y + x;
                    colsx[o++] = r[i]; colsx[o++] = g[i]; colsx[o++] = b[i];
                    o -= 3; pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        geox.addAttribute( 'color', new THREE.BufferAttribute( colsx, 3 ).onUpload( () => colsx = null ) );
        }

        {
        geoy = planeg(znum, xnum, znum-1, xnum-1, ynum);
        var colsy = new Float32Array( xnum * ynum * znum * 3);  // var as may be cleared after upload
        const pos = geoy.attributes.position.array;
        // unwrap colour information from matrices
        let o = 0;  // output pos
        for (let y = 0; y < ynum; y++) {
            for (let x = 0; x < xnum; x++) {
                for (let z = 0; z < znum; z++) {
                    let r, g, b;
                    if (cpp === 3) {
                        r = data[z * 3].data; g = data[z * 3 + 1].data; b = data[z * 3 + 2].data;
                    } else {
                        r = g = b = data[z].data;  // wasteful here, to decide
                    }
                    const i = xnum * y + x;
                    colsy[o++] = r[i]; colsy[o++] = g[i]; colsy[o++] = b[i];
                    o -= 3; pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        geoy.addAttribute( 'color', new THREE.BufferAttribute( colsy, 3 ).onUpload( () => colsy = null ) );
        }


        {
        geoz = planeg(xnum, ynum, xnum-1, ynum-1, znum);
        var colsz = new Float32Array( xnum * ynum * znum * 3);  // var as may be cleared after upload
        const pos = geoz.attributes.position.array;
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
                    colsz[o++] = r[i]; colsz[o++] = g[i]; colsz[o++] = b[i];
                    o -= 3; pos[o++] = x - xnum/2; pos[o++] = y - ynum/2; pos[o++] = z - znum/2;
                }
            }
        };
        geoz.addAttribute( 'color', new THREE.BufferAttribute( colsz, 3 ).onUpload( () => colsz = null ) );
        }

        if (!mat) me.newmat();
        me.createGUIVR(); // will be no-op after first time in
        setgraph();
    };

    /** set up the geometry and material for all the graphics */
    function setgraph() {
        meshx.geometry = geox;
        meshy.geometry = geoy;
        meshz.geometry = geoz;
        meshx.material = matx;
        meshy.material = maty;
        meshz.material = matz;

        points.geometry = geoz;
        points.material = mat;

    }

    function makegroup() {
        // Use a single group that can be transformed and made visible as required
        // Under it have two groups, one for mesh and one for points
        // Usually just one of those two will be visible.
        allvisgroup = new THREE.Group();
        allvisgroup.name = 'imagevisgroup';
        CSynth.rawgroup.remove(CSynth.imageallGroup);
        CSynth.rawgroup.add(allvisgroup);
        allvisgroup.visible = true;
        CSynth.imageallGroup = allvisgroup;

        mygroup = new THREE.Group();
        mygroup.name = 'imagevismeshgroup';
        mygroup.visible = false;
        allvisgroup.add(mygroup);
        me.meshGroup = CSynth.image0group = mygroup;

        // make the three meshes, they won't be populated till data is available
        meshx = new THREE.Mesh();
        meshx.name = 'imagevismeshx';
        mygroup.add(meshx);
        meshy = new THREE.Mesh();
        meshy.name = 'imagevismeshy';
        mygroup.add(meshy);
        meshz = new THREE.Mesh();
        meshz.name = 'imagevismeshz';
        mygroup.add(meshz);

        points = new THREE.Points(geoz, mat);
        points.visible = false;
        points.name = 'imagevispoints';
        mygroup.add(points);
        me.points = CSynth.imagevis0points = points;
    }
    makegroup();  // make it once, even though we may not have geometry and materials yet


    this.createGUIVR = function() {
        if (VH.ImageVis) return;  // do not remake gui
        var gui = dat.GUIVR.createX("ImageVis original");
        gui.add(mygroup, 'visible').listen().showInFolderHeader();
        //TODO: use genes for these.
        //Although I'm a little uncumfortable about putting them in some global uniforms
        //where they don't belong.  Not at all convinced addgene === adduniform makes sense.
        gui.add(myuniforms.opacity, 'value', 0, 1).step(0.01).listen().name('Opacity');
        gui.add(myuniforms.brightness, 'value', -3, 0).step(0.01).listen().name('Brightness');
        gui.add(myuniforms.offset, 'value', 0, 2000).step(0.01).listen().name('Offset');
        gui.add(myuniforms.xsc, 'value', 0, 100).listen().name('xsc').step(0.01);
        gui.add(myuniforms.ysc, 'value', 0, 100).listen().name('ysc').step(0.01);
        gui.add(myuniforms.zsc, 'value', 0, 100).listen().name('zsc').step(0.01);
        gui.add(myuniforms.pointSize, 'value', 0, 30).listen().name('Point Size');
        gui.add(meshx, 'visible').listen().name('X planes visible');
        gui.add(meshy, 'visible').listen().name('Y planes visible');
        gui.add(meshz, 'visible').listen().name('Z planes visible');
        gui.add(points, 'visible').listen().onChange(
            ()=> meshx.visible = meshy.visible = meshz.visible = !points.visible).name('Points, off is Mesh');


        V.gui.addFolder(gui);
        VH.ImageVis = gui;
        return gui;
    }
}

/** snippets to help debug */
//var ms, k; // debug
CSynth.zzzdebug = function() {
// VH.ImageVis = new CSynth.ImageVis(); V.gui.addFolder(VH.ImageVis.createGUIVR());
// select and ctrl-shift-e to evaluate in console

CSynth.imagevis.newdata(CSynth.tiffdata)
VH.setguivisible(true)
CSynth.imageallGroup.visible = true;
renderMainObject = false;
CSynth.annotationGroup.visible=false;
W.springgui.style.display = 'none';
VH.matrix.visible = false;

CSynth.imagevisUniforms.brightness.value=-1.5;
// CSynth.imagevis.newmat(); // refresh the shader
}
