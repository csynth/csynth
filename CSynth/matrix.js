// Let's try making this an ES6 module, soon(tm)...
// update: I tried briefly, seems that browser support is not there, so would need some extra layer.
// Failing that, let's at least aim for CommonJS at some point (tm)...


"use strict";

var V, VH, THREE, CSynth, sharedgeo, addgeneperm, extraRender, rrender, dat,
    currentGenes, onframe, remakeShaders, newscene, camera, baseTrancodeForTranrule, usemask,
    material, genedefs, setval, readWebGlFloat, log, copyFrom, guiFromGene, W, numInstances, HW, processFile, updateMat,
    customSettings, msgfix, addtaggeduniform, uniforms, uniformsForTag, copyFromSel, G, setKeyRgb, hsv2rgb,
    getstats, GX, PICKNUM, searchValues, setExtraKey, xxxdispobj;

CSynth.maxMatrixSize = 1024;
CSynth.Matrix = function() {
    const crcols = {
        matC00r: 0, matC00g: 0, matC00b: 0,
        matCB1r: 1, matCB1g: 0, matCB1b: 0,
        matCA1r: 0, matCA1g: 0, matCA1b: 1,
        matC11r: 1, matC11g: 1, matC11b: 1,
        matCx0r: 0, matCx0g: 0, matCx0b: 0,
        matCx1r: 0, matCx1g: 0, matCx1b: 0
        // matCx0r: 0, matCx0g: 0.05, matCx0b: 0,
        // matCx1r: 0.05, matCx1g: 0, matCx1b: 0
    };

    const colours = {
        //##cold: new THREE.Color(),
        //##hot: new THREE.Color(),
        c00: new THREE.Color(),
        cA1: new THREE.Color(),
        cB1: new THREE.Color(),
        c11: new THREE.Color(),
        cx0: new THREE.Color(),
        cx1: new THREE.Color(),
    };
    CSynth.Matrix.colours = colours;  // for debug

    const vert2d = /*glsl*/`
        //2d matrix vertex
        #define texture2D texture
        #define attribute in


        ${CSynth.CommonShaderCode()}
        out vec2 vUv;
        //vary ing float d;

        //https://machinesdontcare.wordpress.com/2008/03/10/glsl-cosh-sinh-tanh/
        // not wanted for glsl 3
        // float tanh(float val)
        // {
        //     float tmp = exp(val);
        //     float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);
        //     return tanH;
        // }

        void main() {
            vUv = uv;

            //vec3 p1 = partpos(uv.x / 2.).xyz;
            //vec3 p2 = partpos(uv.y / 2.).xyz;
            vec3 pos = position;
            //d = length(p2 - p1);
            //float hd = pow(d, heightFactor);  //min(0.3, 1./d) * heightFactor; //TODO: soft-clip, or exponent option.
            //float hd = atan(d * heightFactor2) * heightFactor;
            //float hd = heightFactor * tanh(d * heightFactor2) / tanh(heightFactor2);
            //pos.z += hd;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `;
    //{ // 2d view, broken commented out for now
    // see also addfragment
    //nb, as of this writing, this vert is used only for 2d matrix,
    //and is simpler than the code would suggest. Left stuff around just in case...


    const frag2d = /*glsl*/`
    #define texture2D texture
        // 2d matrix fragment for flat 2d matrix
        ${CSynth.CommonFragmentShaderCode()}
        //color uniforms equivalent to 3d matrix
        uniform float matC00r, matC00g, matC00b, matC11r, matC11g, matC11b, matCx0r, matCx0g, matCx0b, matCx1r, matCx1g, matCx1b;
        //uniforms for controlling range for colour map
        uniform float matDistNear, matDistFar; // matMinD, matMaxD


        float map(const float v, const float min1, const float max1, const float min2, const float max2) {
            return min2 + (v - min1) * (max2 - min2) / (max1 - min1);
        }

        in vec2 vUv;   // in colour style coords, 1 for last particle

        uniform float distFactor;
        out vec4 glFragColor;
        void main() { // matrix fragment for flat matrix
            //TODO: quantise. Fix range to particles representing DNA
            vec2 uv = vUv * numSegs/numInstancesP2; // for spring lookup coords
            vec3 p1 = partpos(uv.x).xyz;
            vec3 p2 = partpos(uv.y).xyz;

            float d = length(p2 - p1);
            float c = clamp(map(d, matDistNear, matDistFar, 0., 1.), 0., 1.); //TODO control contrast curve

            //##vec3 col00 = vec3(matcoldr, matcoldg, matcoldb);
            //##vec3 col11 = vec3(mathotr, mathotg, mathotb);
            vec3 col00 = vec3(matC00r, matC00g, matC00b);
            vec3 col11 = vec3(matC11r, matC11g, matC11b);
            vec3 col = mix(col11, col00, c);  // << reverse for consistent host/cold with new version of 3d matrix
//;#if OPMODE != OPPICK  // minor optimization
            vec3 pickCol = vec3(0.);

            for (int i=0; i<${PICKNUM}; i++) {

                float p = getPick(i);
                if (p > 99.9) continue;
                float dx = abs(vUv.x - p);
                float dy = abs(vUv.y - p);

                const float solidW = 0.001;
                const float softW = 0.002;
                const float softR = 1./softW;
                float fx = 1. - (clamp(dx - solidW, 0., softW) * softR);
                float fy = 1. - (clamp(dy - solidW, 0., softW) * softR);
                pickCol += getPickColor(i) * (fx+fy);

                // borrowing / adapted from https://www.interactiveshaderformat.com/sketches/341#
                //const float linewidth = 0.2;
                //float width_exp = pow(16.0*(1.0-linewidth), 2.0);
                //pickCol += pow(clamp(1.0-10.*min(dx,dy), 0.0, 1.0), width_exp) * getPickColor(i);
            }

            glFragColor = vec4(col, 1.);
            glFragColor.rgb += pickCol;
//;#endif
        }
    `;

    initGenes();

    const uniformsm = {};  // uniforms for 2d
    copyFromSel(uniformsm, window.uniforms, Object.keys(crcols).join(' ') + `
        matMinD matMaxD matDistFar nonBackboneLen matgamma
        `);
    //## also used above    matcoldr matcoldg matcoldb mathotr mathotg mathotb
    copyFrom(uniformsm, CSynth.getCommonUniforms());

    const flatMaterial = new THREE.RawShaderMaterial({
        vertexShader: vert2d,
        fragmentShader: frag2d,
        uniforms: uniformsm,
        glslVersion: "300 es"
    });

// } // 2d view, broken commented out for now

    function handleHover2d(p) {
        //write to pickrt with data from p.point (at a position relevant to source of p)
        //pickrt.
        //console.log(`hover at ${p.point.x}, ${p.point.y}`);

        //get slotOffset for p
        //setPick(slotOffset, p.localPoint);
    }

    const colkeyfrag = /*glsl*/`
        // matrix fragment for flat matrix
        #define texture2D texture
        ${CSynth.CommonFragmentShaderCode()}
        uniform float matC00r, matC00g, matC00b, matC11r, matC11g, matC11b,  matCA1r, matCA1g, matCA1b, matCB1r, matCB1g, matCB1b;
        uniform float matgamma;
        in vec2 vUv;
        out vec4 glFragColor;

        void main() { // matrix fragment for flat matrix
            vec2 uv = vUv;
            float qvA = uv.x, qvB = uv.y;
            vec3 cent = mix(vec3(matC00r, matC00g, matC00b), vec3(matC11r, matC11g, matC11b), max(qvA, qvB));
            vec3 tint = qvA > qvB ? vec3(matCA1r, matCA1g, matCA1b) : vec3(matCB1r, matCB1g, matCB1b);
            vec3 col = mix(cent, tint, abs(qvA-qvB));
            col = pow(col, vec3(matgamma));  // better perceptual range

            glFragColor = vec4(col, 1.);
        }
    `;


    const colkeyMaterial = new THREE.RawShaderMaterial({
        vertexShader: vert2d,
        fragmentShader: colkeyfrag,
        uniforms: uniforms,
        glslVersion: "300 es"
    });


    function handlePress2d(p) {
        //console.log(`press at ${p.point.x}, ${p.point.y}`);
    }

    var colourList, clLen;
    /** */
    function setColourList() {
        colourList = ['current distances', 'current dynamics model', 'average', 'smootha', 'smoothb', 'observed contacts'];
        CSynth.current.contacts.forEach(b => colourList.push('C_' + b.shortname));
        CSynth.current.xyzs.forEach(b => colourList.push('X_' + b.shortname));
        colourList.push('0', '1', 'x', 'y');
        clLen = colourList.length;
        return colourList;
    }

    this.createGUIVR = function() {
        const gui = VH.matrixGui = dat.GUIVR.createX("Matrix");

        const f2d = dat.GUIVR.createX("2D view");

        const mat2d = f2d.addImageButton(handlePress2d, flatMaterial, true);
        mat2d.onHover(handleHover2d).onPressing(handlePress2d);
        //Note that design of interface on the dat side needs some work.
        //Also need to think about how the information is stored / relayed in our system.
        gui.addFolder(f2d);
        // guiFromGene(gui, 'matsize').name('Matrix size');
        // guiFromGene(gui, 'matheight').name('Matrix height');
        // guiFromGene(gui, 'heightFactor').name('Height factor');
        // guiFromGene(gui, 'heightFactor2').name('Flatten factor');
        gui.add(this, 'visible').listen().showInFolderHeader();
        guiFromGene(gui, 'matskipdiag').name('Skip diagonal');

        CSynth.matrot =  { // allows for CSynth.matrixMesh to be redefined after the gui connection has been made
            get rotation() { return CSynth.matrixScene ? CSynth.matrixScene.rotation.x : 0; },
            set rotation(v) { CSynth.matrixScene.rotation.x = v; updateMat(CSynth.matrixScene)}
        }

        gui.add(CSynth.matrot, 'rotation', 0, 1.5).step(0.1).listen();
        //guiFromGene(gui, 'matX').name('Translation X');
        //guiFromGene(gui, 'matY').name('Translation Y');
        guiFromGene(gui, 'matZ').name('Translation Z');
        guiFromGene(gui, 'matMinD').name('Minimum distance value').step(0.1);
        guiFromGene(gui, 'matMaxD').name('Maximum distance value').step(0.1);
        guiFromGene(gui, 'matpow').step(0.1);
    //??? }

        const clX = 4;  // number of items shifted to end
        CSynth.cols = {
            get colA() { return colourList[(G.matcoltypeA + clLen - clX) % clLen]},
            set colA(v) { G.matcoltypeA = (colourList.indexOf(v) + clX) % clLen; CSynth._colsnames(); },
            get colB() { return colourList[(G.matcoltypeB + clLen - clX) % clLen]},
            set colB(v) { G.matcoltypeB = (colourList.indexOf(v) + clX) % clLen; CSynth._colsnames(); }
        }

        const ccol = CSynth.cols, cm = 'current dynamics model', cd = 'current distances', cb = 'colour by:\n'
        CSynth.matrixOpts = [4,
            { func: () => {ccol.colA = cm, ccol.colB= cm},  tip: cb+cm, text: 'model'},
            { func: () => {ccol.colA = cd, ccol.colB= cd},  tip: cb+cm, text: 'distances'},
            { func: () => {ccol.colA = cm, ccol.colB= cd},  tip: cb+cm + '\n' + cd, text: 'mix'},
            { func: () => {ccol.colA = cd, ccol.colB= cm},  tip: cb+cd + '\n' + cm, text: 'mix~'}
        ];
        gui.addImageButtonPanel.apply(gui, CSynth.matrixOpts).setRowHeight(0.075); // .highlightLastPressed();


        const f = dat.GUIVR.createX("Colour");

        setColourList();
        CSynth._colsnames = function() {
            const va = CSynth.cols.colA, vb = CSynth.cols.colB;
            if (va === vb) {
                colours.c00.gui.name('0');
                colours.c11.gui.name(va);
                colours.cA1.gui.name('unused');
                colours.cB1.gui.name('unused');
            } else {
                colours.c00.gui.name('neither');
                colours.c11.gui.name('both');
                colours.cA1.gui.name(va);
                colours.cB1.gui.name(vb);
            }
        }

        f.add(CSynth.cols, 'colA', colourList).name('input A').listen();

        guiFromGene(f, 'matDistBalance').name('A <- balance -> B').step(0.01);
        f.add(CSynth.cols, 'colB', colourList).name('input B').listen();

        // guiFromGene(f, 'matDistNear').step(0.1);
        guiFromGene(f, 'matDistNear').step(0.1);
        guiFromGene(f, 'matDistFar').step(0.1);
        guiFromGene(f, 'matrixTintStrength').step(0.1);
        guiFromGene(f, 'matrixMixType').step(1);

        guiFromGene(f, 'matrixbedtint');
        guiFromGene(f, 'matrixbedtriangle');
        guiFromGene(f, 'matrixbededge');
        guiFromGene(f, 'matrixBedSelTint');
        guiFromGene(f, 'matgamma');
        guiFromGene(f, 'matrixgridres');

        //##colours.cold.gui = f.add(colours, 'cold').onChange(updateColourGenes);
        //##colours.hot.gui = f.add(colours, 'hot').onChange(updateColourGenes);
        colours.c00.gui = f.add(colours, 'c00').name('neither').listen().onChange(updateColourGenes);
        colours.c11.gui = f.add(colours, 'c11').name('both').listen().onChange(updateColourGenes);
        colours.cA1.gui = f.add(colours, 'cA1').name('A').listen().onChange(updateColourGenes);
        colours.cB1.gui = f.add(colours, 'cB1').name('B').listen().onChange(updateColourGenes);
        colours.cx0.gui = f.add(colours, 'cx0').name('missing A').listen().onChange(updateColourGenes);
        colours.cx1.gui = f.add(colours, 'cx1').name('missing B').listen().onChange(updateColourGenes);
        CSynth._colsnames();

        const fkey = dat.GUIVR.createX("colour key");
        const colkey = fkey.addImageButton(handlePress2d, colkeyMaterial, true);
        f.addFolder(fkey);


        gui.addFolder(f);

        return gui;
    }

    this.oldvisible = function(o) { this.ThreeObject.visible = o; }  //
    // set(o) { this.ThreeObject.visible = o; }
    this.visible = true;

    /** render matrix, called from pickGPU and from vrender */
    this.newRender = function(rt) {
        if (searchValues.nohorn) return;
        if (!CSynth.current.ready) return;
        if (!this.visible) return;  // sjpt 27 Jan 2024, check safe

        if (CSynth.Matrix.forcenewsave && CSynth.matrixScene) {  // restore state lost by forcenew
            GX.restoreGuiFromObject(CSynth.Matrix.forcenewsave);
            CSynth.Matrix.forcenewsave = undefined;
        }

        if (CSynth.Matrix.forcenew) {  // force new and arrange to reset parameters
            CSynth.testHybridTranrule = CSynth.matrixScene = CSynth.Matrix.forcenew = undefined;
            CSynth.Matrix.forcenewsave = GX.saveguiString();
        }

        setmatrix();
        if (this.visible) testHybrid(rt);
        //matboxmesh.visible = this.visible; matboxpos();

        if (!CSynth.testHybridTranrule && !currentGenes._extratranrule) heightMatrixMaterial();
    }

    function initGenes() {
        //  addgeneperm(name, def, min, max, delta, step, help, tag, free, internal, useuniform)
        if (!W.uniforms.matsize) {
            //addgeneperm('heightFactor', 0.2, 0.1, 0.5, 0.1, 0.01, 'height for matrix', 'matrix', 0);
            //addgeneperm('heightFactor2', 20, 1, 80,  1, 0.1, 'flatten for matrix', 'matrix', 0);  // above 85 stops working completely
            addgeneperm('matsize', 10000, 100, 15000,  100, 10, 'matrix size', 'matrix', 0);
            addgeneperm('matheight', -4000, -7000, 0,  100, 10, 'matrix height', 'matrix', 0);
            addgeneperm('matcentre', 0.5, 0, -1, 0.001,  0.001, 'matrix height', 'matrix', 0);
            addgeneperm('matskipdiag', 0, 0, 10, 1,1, 'matrix skip render diagonal', 'matrix', 0);
            addgeneperm('matX', 0, -1, 1, 0.1, 0.01, 'matrix x position', 'matrix', 0);
            addgeneperm('matY', 0, -1, 1, 0.01, 0.001, 'matrix y position', 'matrix', 0);
            addgeneperm('matZ', 0, -1, 1, 0.01, 0.001, 'matrix z position', 'matrix', 0);
            addgeneperm('matpow', 1, 0.5, 3, 0.01, 0.01, 'matrix shape power', 'matrix', 0);
            //##addgeneperm('matcoldr', 0.0, 0, 1, 0.01, 0.001, 'matrix "cold" R', 'matrix', 0);
            //##addgeneperm('matcoldg', 0.0, 0, 1, 0.01, 0.001, 'matrix "cold" G', 'matrix', 0);
            //##addgeneperm('matcoldb', 0.4, 0, 1, 0.01, 0.001, 'matrix "cold" B', 'matrix', 0);
            //##addgeneperm('mathotr', 1.0, 0, 1, 0.01, 0.001, 'matrix "hot" R', 'matrix', 0);
            //##addgeneperm('mathotg', 1.0, 0, 1, 0.01, 0.001, 'matrix "hot" G', 'matrix', 0);
            //##addgeneperm('mathotb', 1.0, 0, 1, 0.01, 0.001, 'matrix "hot" B', 'matrix', 0);
            for (let gn in crcols){
                addgeneperm(gn, crcols[gn], 0, 1, 0.01, 0.001, 'compare matrix' + gn, 'matrix', 0)
            }

            addgeneperm('matMinD', 0, 0, 50, 0.01, 0.001, 'matrix "hot" threshold for height', 'matrix', 0);
            addgeneperm('matMaxD', 0, 0, 50, 0.01, 0.001, 'matrix "cold" threshold for height', 'matrix', 0);
            addgeneperm('matDistFar', 3.0, 1, 20, 0.01, 0.001, 'matrix far threshold for colour', 'matrix', 0);
            addgeneperm('matDistNear', 1.0, 0, 2, 0.01, 0.001, 'matrix near threshold for colour', 'matrix', 0);
            addgeneperm('matrixMixType', 1, 0, 1, 1, 1, 'mix type, simple:0, cent/off: 1', 'matrix', 0);
            addgeneperm('matDistBalance', 1, 0, 2, 0.01, 0.001, 'matrix balance between a and b, 0.5 equal', 'matrix', 0);

            // TODO; formalize and generalize gene/sampler patterns below
            // extra uniforms added in 'common.vfs'; not sure I'm happy about that.
            addgeneperm('matrixbedtint', 0, 0, 1,  0.001, 0.001, 'matrix bed tint', 'matrix', 0);
            addgeneperm('matrixbedtriangle', 0, 0, 1,  1, 1, 'if 1, bed tint only triangles', 'matrix', 0);
            addgeneperm('matrixbededge', 0, 0, 0.05,  0.0001, 0.0001, 'if non-0 only tint the edges ', 'matrix', 0);
            addgeneperm('matrixBedSelTint', 0.0, 0, 0.5,  0.001, 0.001, 'highlight selected bed region on matrix', 'matrix', 0);

            addgeneperm('matrixgridres', 0, 0, 100,  1, 1, 'matrix grid resolution', 'matrix', 0);
            addgeneperm('matrixgridwidth', 0.005, 0, 0.001,  0.0001, 0.0001, 'matrix grid width', 'matrix', 0);
            addgeneperm('matrixgridsoftw', 0.1, 0, 0.2,  0.01, 0.01, 'matrix grid soft width', 'matrix', 0);

            addgeneperm('matgamma', 1, 0, 4,  0.01, 0.01, 'matrix interpolation gamma', 'matrix', 0);

            addtaggeduniform('matrix', 'matrixbed', undefined, 't');
            const cc = CSynth.current;
            if (cc.beds[0] && !uniforms.matrixbed.value)
                uniforms.matrixbed.value=cc.beds[0].texture;

            addtaggeduniform('matrix', 'matrix2dtexA', undefined, 't');
            addtaggeduniform('matrix', 'matrix2dtexB', undefined, 't');

            addtaggeduniform('matrix', 'matintypeA', undefined, 'f');
            addtaggeduniform('matrix', 'matintypeB', undefined, 'f');
            addtaggeduniform('matrix', 'representativeContactA', undefined, 'f');
            addtaggeduniform('matrix', 'representativeContactB', undefined, 'f');

            addgeneperm('matcoltypeA', 4, 0, 4,  1, 1, 'matrix colour input 1', 'matrix', 0);  // 0,1,x,y 4=currentDist, 5=currentSprings, 6... use contact/xyz
            addgeneperm('matcoltypeB', 5, 0, 4,  1, 1, 'matrix colour input 2', 'matrix', 0);  // 0,1,x,y 4=currentDist, 5=currentSprings, 6... use contact/xyz

            addgeneperm('matrixTintStrength', 1, 0, 4,  1, 1, 'multipler for matrix tint', 'matrix', 0);

            addgeneperm('mtest1', 1, 0, 100,  1, 1, 'test gene 1', 'matrix', 0); // for debug develop
            addgeneperm('mtest2', 1, 0, 100,  1, 1, 'test gene 2', 'matrix', 0);


            //addgeneperm('matColCurve', 6.0, 1, 10, 0.01, 0.001, 'matrix colour transition curve', 'matrix', 0);

        }
        const g = currentGenes;
        //##colours.cold.setRGB(g.matcoldr, g.matcoldg, g.matcoldb);
        //##colours.hot.setRGB(g.mathotr, g.mathotg, g.mathotb);
        colours.c00.setRGB(g.matC00r, g.matC00g, g.matC00b);
        colours.cB1.setRGB(g.matCB1r, g.matCB1g, g.matCB1b);
        colours.cA1.setRGB(g.matCA1r, g.matCA1g, g.matCA1b);
        colours.c11.setRGB(g.matC11r, g.matC11g, g.matC11b);
        colours.cx0.setRGB(g.matCx0r, g.matCx0g, g.matCx0b);
        colours.cx1.setRGB(g.matCx1r, g.matCx1g, g.matCx1b);
    }

    /** set the matrix colours, textures, etc
    currently (16Jube2018 called every frame; could be optimized based on changes */
    function setmatrix() {
        // dropdownlist --indexOf()--> matcoltype --setone()--> matintype --nval()--> 0..1
        //
        // matcoltype, 0=>0, 1=>1, 2=>x, 3=>y, 4=>currentDist, 5=>currentSprings, 6,7,8,9=>smooth, 10... use contact/xyz
        // matintype   0=>0, 1=>1, 2=>x, 3=>y, 4=>currentDist, 5=>dist from texture, 6=>contact from texture, 7,8,9,10=>smooth
        function setone(n) {
            const type = G['matcoltype' + n];  // input type
            let r = type; // unless proved otherwise
            // auto start just once, eg not if user explicitly sets running off
            if (6 <= r && r <= 9 && !setmatrix.runningdone) setmatrix.runningdone = CSynth.springSmooth.running = true;
            let rest = 10;
            if (type <= 4) {            // handles 0,1,x,y,currentDist; and 7..10 for smoothed
                // r = type;
            } else if (6 <= type && type <= 9) {            // handles 0,1,x,y,currentDist; and 7..10 for smoothed
                r = type + 1;
            } else {                    // some sort of texture needed
                let i;                  // index into source
                if (type === 5) {       // use texture for current spring source
                    i = CSynth.current.selectedSpringSource || 0;
                } else if (type === 6) {       // use texture for current spring source
                    i = 0;
                } else {
                    i = type - rest;
                }
                const {contacts, xyzs} = CSynth.current;
                if (i < contacts.length) {
                    r = 6;
                    uniforms['matrix2dtex' + n].value = CSynth.contactsToTexture(i);
                    uniforms['representativeContact' + n].value = CSynth.current.representativeContact;
                } else {
                    r = 5;
                    uniforms['matrix2dtex' + n].value = CSynth.xyzToTexture(i - contacts.length);
                }
            }
            uniforms['matintype'+n].value = r;
        }  // end setone
        setone('A');
        setone('B');
// todo tidy
//        if (G.matcoltypeA !== G.matcoltypeB) {
            updateColourGenes();
//        } else {
//            G.matcoldr = G.matcoldg = G.matcoldb = G.mathotr = G.mathotg = G.mathotb = 0;
//        }
    }

    function updateColourGenes() {
        const g = currentGenes;
        //##setKeyRgb(g, 'matcold', colours.cold);
        //##setKeyRgb(g, 'mathot', colours.hot);

        setKeyRgb(g, 'matC00', colours.c00);
        setKeyRgb(g, 'matCB1', colours.cB1);
        setKeyRgb(g, 'matCA1', colours.cA1);
        setKeyRgb(g, 'matC11', colours.c11);
        setKeyRgb(g, 'matCx0', colours.cx0);
        setKeyRgb(g, 'matCx1', colours.cx1);
    }

    if (!CSynth.matrixScene)
        CSynth.matrixScene = newscene('matrixScene');

    function testHybrid(rt) {
        if (!CSynth.testHybridTranrule) return;
        if (!CSynth.matrixScene) {
            CSynth.matrixScene = newscene('matrixScene');
            CSynth.Matrix.curres = -1;
        }

        var r = CSynth.Matrix.res || numInstances - 1;
        if (isNaN(+r)) return;
        //        if (r > 4096) {msgfix('matrix too big', 'not rendered'); return; }
        r = Math.min(r, CSynth.maxMatrixSize);
        if (CSynth.Matrix.curres !== r) {
            if (!CSynth.matrixMesh) {
                var mesh = CSynth.matrixMesh = new THREE.Mesh();
                mesh.name = 'matrixmesh_' + r;
                mesh.frustumCulled = false;
                CSynth.matrixScene.addX(mesh);
                CSynth.positionMatrix();
            }
            // the extrs .005 gives a slight rim to show matrix edge
            let geometry = HW.planeg(1.005, -1.005, r,r, 1, true);  // last true is triangle
            CSynth.matrixMesh.geometry = geometry;
            CSynth.Matrix.curres = r;
        }


        var mats = currentGenes.matsize;
        var cen = currentGenes.matcentre;
        var hd = mats * cen; // half size of matrix
        var math = currentGenes.matheight; // height of matrix

        var rot4 = [mats,0,0,-hd,  0,0,mats,math,  0,-mats,0,hd,  0,0,0,1];
        const dispobj = xxxdispobj(currentGenes);
        var options = {
            tranrule: 'matrix', rendertarget: rt, genes: currentGenes, scene: CSynth.matrixScene,
            renderPass, rot4, trancodeForTranrule: CSynth.Matrix.trancodeForTranrule,
            extradefines: CSynth.Matrix.extradefines, useskelbuffer: false, NORMTYPE: 1, dispobj
        };
        if (usemask !== 'pick') options.usemask = 1.5;
        if (material.opos && material.opos.matrix) material.opos.matrix.side = THREE.DoubleSide;  // in case overridden
        extraRender(options);

        // shortcut horn code by going direct to rrender
        function renderPass(genes, puniforms, rendertarget, scene) {
//            opmode = 'matrix';
              rrender('extramat', scene, camera, rendertarget);
        }

    }

    // shortcut horn, only used during setup (eg remakeShaders)
    CSynth.Matrix.trancodeForTranrule = function( tranrule) {
        var tc = baseTrancodeForTranrule(tranrule);
        tc.overrides = CSynth.testHybridOverrides;
        return tc;
    }


}  // end CSynth.Matrix

CSynth.colchoice = () => /*glsl*/`
    // matintype   0=>0, 1=>1, 2=>x, 3=>y, 4=>currentDist, 5=>dist from texture, 6=>contact from texture
    // low .. high is typically matDistNear = 0 .. matDistFar
    float nval(in float matintype, in sampler2D tex, in vec2 pos, in float currentDist, in float low, in float high, float repcon) {
        float rd = 0.;      // value as a relative dist (or wish dist)
        if (matintype < 1.5) {   // 1: use matintype as value
            return matintype;
        } else if (matintype < 2.5) {  // 2: use x
            return pos.x;
        } else if (matintype < 3.5) {  // 3: use y
            return pos.y;
        } else if (matintype < 4.5) {  // 4: use currentDist
            rd = currentDist / nonBackboneLen;  // relative dist
        } else if (matintype < 5.5) {    // 5: distance, from xyz dist texture
            float dist = texture(tex, pos).x;
            rd = dist / nonBackboneLen;  // relative dist
        } else if (matintype < 6.5 || matintype == 10.) {    // 6: contact from texture, via wish dist
            float contact;
            if (matintype == 10.) {
                contact = texture(lastSpringSmooth, pos).w;
            } else {
                contact = texture(tex, pos).x;  // 'standard' contact
                if (contact < 0.) return -999.;
            }
            // see CSynth.alignModels in csynth.js for some workings to deduce formula below
            if (contactforce != 0.) {
                // OLD dist = pow(contact * contactforcesc / pushapartforce * pow(powBaseDist, pushapartpow), 1. / (pushapartpow - 1.));  // regular distance
                float cfsc = contactforce * 1e-6 / repcon;
                rd = pow(cfsc*contact*powBaseDist / pushapartforce, 1. / (pushapartpow - 1.)) * powBaseDist;  // from springfs wrongfade, === OLD
            } else {
                rd = m_k * pow(contact / repcon, -m_alpha);  // LorDG distance
            }
        } else if (matintype < 7.5) { rd = texture(lastSpringSmooth, pos).x / nonBackboneLen;
        } else if (matintype < 8.5) { rd = texture(lastSpringSmooth, pos).y / nonBackboneLen;
        } else if (matintype < 9.5) { rd = texture(lastSpringSmooth, pos).z / nonBackboneLen;
        // } else if (matintype < 10.5) { rd = texture(lastSpringSmooth, pos).w;
        } else {                    // 7: contact from texture, old forumula
            return -9.;
        }

        // fall through for rd = dist(like) value, shape them before return. All use the same shaping code for consistency
        // low = sqrt(-1.);
        float rr = 1. - (log(rd) - log(low)) / (log(high) - log(low));
        return clamp(rr, 0., 1.);

        // nb with this simple log version, low and hence matDistNear are not used
        // return 1. - log(rd) / log(high);  // simple log version

        // return 1. - smoothstep(low, high, rd);  // so rd is in range low .. high, result in range 1 .. 0
    }
`


// material for height matrix
// This uses a distorted version of the Organic pipeline to harness normal calculation etc.
// As tr is overridden it uses almost no horn code.
// Called initially or if CSynth.Matrix.forcenew is set
CSynth.heightMatrixMaterial = heightMatrixMaterial;
function heightMatrixMaterial() {
    const cc = CSynth.current;

    CSynth.Matrix.extradefines = /*glsl*/`
        #define NOHORNMAKER
        highp float radius=1., gscale=1., nstar=4., stardepth=0., ribs=1., ribdepth=0.;  // temp, to move to better place
        ${uniformsForTag('matrix')}
        uniform float minActive, maxActive, maxBackboneDist, nonBackboneLen,
            // representativeContactA, representativeContactB,
            m_k, m_alpha, m_force, pushapartforce, pushapartpow, contactforce, powBaseDist;
        uniform sampler2D lastSpringSmooth;

        ${CSynth.colchoice()}
        // to shape the matrix to exaggerate diagonal
        void shapepow(inout vec2 p, in float power) {
            float d = p.y - p.x, c = (p.x + p.y) * 0.5, s = sign(d);
            d = s*pow(s*d, power);
            d = d * 0.5;
            p.x = c - d;
            p.y = c + d;
        }
        // for a particle p, is it in the range of the region occupied by particle 'pr'?
        // for example, while rendering 'p', should it be considered in range of 'pr' which is a picked particle?
        // returns 0 or 1 (areas within 'smooth' range will fade)
        float isInPickRange(float p, float pr, float psmooth) { // nb 'smooth' does not compile under webgl2
            vec4 r = texture(matrixbed, vec2(pr, 0.75));
            // !!! NOTE this is almost duplicate of cod ein springsynth.js
            // Next lines prevent the end spheres failing to reduce near the ends.
            // As beds are just Unit8Array (22 May 2020) ranges beyond the ends are truncated.
            // We extend them very significantly so we get full pick effect at ends.
            if (r.y == 0.) r.y = -1.;
            if (r.z == 1.) r.z = 2.;
            //smooth feathers inward rather than out...
            float v = smoothstep(r.y, r.y + psmooth, p);
            v = min(v, 1. - smoothstep(r.z - psmooth, r.z, p));
            return v;
        }

    `;


    CSynth.testHybridOverrides = /*glsl*/`
    override vec4 tr(const vec4 loposuvw, out vec3 xmnormal, out vec3 texpos, out float ribnum){
        pickopos(loposuvw);
        vec4 p = loposuvw;
        float numInstances = numSegs + 1.;
        vec3 p1 = histpos((p.x * numInstances + 0.5)/numInstancesP2).xyz;
        vec3 p2 = histpos((p.y * numInstances + 0.5)/numInstancesP2).xyz;
        float dist = length(p2 - p1);
        float d10300 = clamp(map(dist, matMinD, matMaxD, 10., 300.), 10., 300.);// + 0.5;
        //float id = 1./max(d, 10.);
        float id = 1./d10300;
        if (p.x - p.y > (-matskipdiag - 2.)/numSegs) id = 0.;

        #define in(x,l,h) (l <= x && x <= h)
        if (!(in(p.x, minActive, maxActive) && in(p.y, minActive, maxActive)))
            id = 0.;

        shapepow(p.xy, 1./matpow);

        float hd = id; //heightFactor * tanh(id * heightFactor2) / tanh(heightFactor2);
        p.z = matMaxD == 0. ? 0. : hd;
        p.x += matX;
        p.y += matY;
        p.z += matZ;
        p.w = 1.;
        //p.z = min(0.1, 1./d);
        //p.xyz *= 8000.;
        // texpos = loposuvw.xyz; ??? unused
        return p;
    }

    override Colsurf iridescentTexcol(in vec3 texpos, in vec3 viewDir, in vec3 normal) {
// #define bimix(a00, a01, a10, a11, x,y) mix( mix(a00,a01, x), mix(a10, a11, x), y)
        shapepow(texpos.xy, matpow);

        if (texpos.x - texpos.y > -matskipdiag / numSegs) discard;
        Colsurf c = colsurfd();
        // float a = clamp(texpos.z/heightFactor, 0., 1.);
        // a = 0.5 + atan(((2.*a)-1.)*matColCurve) / (2.*atan(matColCurve));

        // recompute distance, info passed in texpos.z not reliable
        // we should only need to do this where dist is actually used.
        float numInstances = numSegs + 1.;
        vec3 pp = round(texpos * numSegs);  // we force lookup of precise position even if posVewVals is using LinearFilter
        vec3 p1 = histpos((pp.x + 0.5)/numInstancesP2).xyz;
        vec3 p2 = histpos((pp.y + 0.5)/numInstancesP2).xyz;
        float dist = length(p2 - p1);

        //''if (texpos.x - texpos.y > (-matskipdiag - 2.)/numSegs) distForCol = 0.;

        //TODO: more structured colour genes
        //##vec3 col00 = vec3(matcoldr, matcoldg, matcoldb);
        //##vec3 col11 = vec3(mathotr, mathotg, mathotb);
        vec3 col00 = vec3(matC00r, matC00g, matC00b);
        vec3 colB1 = vec3(matCB1r, matCB1g, matCB1b);
        vec3 colA1 = vec3(matCA1r, matCA1g, matCA1b);
        vec3 col11 = vec3(matC11r, matC11g, matC11b);

    //''c.col.rgb = mix(col00, col11, distForCol);
        //''c.fluoresc.rgb = rgb2hsv(c.col.rgb);


        vec2 tp = (texpos.xy * numSegs + 0.5) / numInstances;
        float baseA = nval(matintypeA, matrix2dtexA, tp, dist, matDistNear, matDistFar, representativeContactA), baseB = baseA;;
        float vvA = baseA * (2. - matDistBalance);
        float qvA = clamp( vvA, 0., 1.);
        if (matintypeA + matintypeB == 0.) {    // old code
        } else if (matcoltypeA == matcoltypeB) {
            c.col.rgb = mix(col00, col11, clamp( baseA, 0., 1.));
        } else {
            baseB = nval(matintypeB, matrix2dtexB, tp, dist, matDistNear, matDistFar, representativeContactB);
            float vvB = baseB * matDistBalance;
            float qvB = clamp(vvB, 0., 1.);
            /**
            c.col.rgb = bimix(
                vec3(matC00r, matC00g, matC00b),
                vec3(matCB1r, matCB1g, matCB1b),
                vec3(matCA1r, matCA1g, matCA1b),
                vec3(matC11r, matC11g, matC11b),
                clamp(qvA, 0., 1.), clamp(qvB, 0., 1.));
            **/
           // cent is the color down the diagonal
           // tint is the colour at the off-diagonal corner
           // overall colour uses amount off-diagonal
           if (matrixMixType == 1.) {
               float maxab = max(qvA, qvB);
                vec3 cent = mix(col00, vec3(col11), maxab);

                vec3 tint = qvA > qvB ? colA1 : colB1;
                // c.col.rgb = mix(cent, tint, clamp(matrixTintStrength*abs(qvA-qvB)/maxab, 0.,1.));
                c.col.rgb = mix(cent, tint, clamp(matrixTintStrength*abs(qvA-qvB), 0.,1.));  // experiment with divide / maxab
           } else {
                vec3 cA = mix(col00, colA1, qvA);
                vec3 cB = mix(col00, colB1, qvB);
                c.col.rgb = cA + cB;
           }
        }
        if (baseA == -999.) c.col.rgb += vec3(matCx0r, matCx0g, matCx0b);
        if (baseB == -999.) c.col.rgb += vec3(matCx1r, matCx1g, matCx1b);
        c.col.rgb = pow(c.col.rgb, vec3(matgamma));  // better perceptual range
//        c.fluoresc.rgb = rgb2hsv(c.col.rgb);
        c.fluoresc.rgb  = vec3(0);


        //TODO uniforms for gridline presentation parameters.
        //Also need to do something about aliasing. Could consider non-binary logic here....
        if (matrixgridres != 0.) {
            float dx = abs(fract(texpos.x*(numInstances-1.)/matrixgridres+0.5));
            float dy = abs(fract(texpos.y*(numInstances-1.)/matrixgridres+0.5));
            //dx=dy=1.;  // remove comment to remove the grid bands

            float solidW = matrixgridwidth;
            float softW = matrixgridsoftw;
            float softR = 1./softW;
            float fx = 1. - (clamp(dx - solidW, 0., softW) * softR);
            float fy = 1. - (clamp(dy - solidW, 0., softW) * softR);
            float f = min(fx+fy, 1.);
            c.col.rgb += vec3(0,0.7,0.7) * f;
            //TODO: think better about how to combine with existing hsv...
            if (f > 0.) {
                c.fluoresc.rgb = vec3(0.5, 1., 0.1 * f);
            }
        }

        vec2 mtp = texpos.xy;  // texture position for looking up bed.  ? texpos ?
        vec3 bedrgb = vec3(0.);
        vec3 bedrgby = vec3(0.);
        //if (matrixbedtint != 0.) {
            // TODO account for pick selected-nes here, controlled via extra uniform.
            // probably move some bed var to outer scope so it can be used in pick related code below.
            vec4 bed = texture(matrixbed, vec2(mtp.x, 0.25));
            float t = bed.w;  // t_ribboncol is bed texture, small 'integer' values for now, but mapped to range 0..1
            float ti = t * 255. - 0.0;
            // when BED doesn't have explicit colour, then all elements will be same... that doesn't make this logic right
            // but close enough for now (famous last words), closer with test against green as well
            bedrgb = bed.r != t || bed.g != t ? bed.rgb : t == 0. ? vec3(0) : stdcolY(ti);

            // TODO factor bed colour option and use for x and y (and ribbon)
            vec4 bedy = texture(matrixbed, vec2(mtp.y, 0.25));
            float ty = bedy.w;  // t_ribboncol is bed texture, small 'integer' values for now, but mapped to range 0..1
            float tiy = ty * 255. - 0.0;
            bedrgby = bedy.r != ty || bedy.g != ty ? bedy.rgb : ty == 0. ? vec3(0) : stdcolY(tiy);
            bool tintx = true, tinty = true;
            if (matrixbededge != 0.) {
                tintx = texture(matrixbed, vec2(mtp.x - matrixbededge, 0.25)).w != t;
                tinty = texture(matrixbed, vec2(mtp.y + matrixbededge, 0.25)).w != ty;
            }
            if (t == ty || matrixbedtriangle == 0.) {
                if (tintx) c.col.rgb += bedrgby * matrixbedtint;
                if (tinty) c.col.rgb += bedrgb * matrixbedtint;
            }
        //}


        // darker for region outside active particles/springs
#define in(x,l,h) (l <= x && x <= h)
        if (!(in(texpos.x, minActive, maxActive) && in(texpos.y, minActive, maxActive)
            && (texpos.y - texpos.x < maxBackboneDist))) {
            c.col.rgb *= 0.5;
            c.fluoresc.b *= 0.5;
        }

//;#if OPMODE != OPPICK  // minor optimization
        // get Pick for all elements of interest.
        for (int i=0; i<${PICKNUM}; i++) {
            float p = getPickC(i);
            if (p > 99.) continue;  // not picked, of maybe just one of those pck values that aren't used
            //isInPickRange here to highlight if current opos is in range of given PICKNUM...
            //?? opos vs mtp, texpos
            float s = 1./255.; // smooth
            vec3 bedSelCol = bedrgb * isInPickRange(mtp.x, p, s) + bedrgby * isInPickRange(mtp.y, p, s);
            c.col.rgb += matrixBedSelTint * bedSelCol;

            //TODO smoothstep not if
            if (abs(opos.x-p) < 0.001 || abs(opos.y-p) < 0.001) {
                vec3 pcol = getPickColor(i);
                c.col.rgb += pcol;
                vec3 pcolHSV = rgb2hsv(pcol);
                c.fluoresc.rgb = pcolHSV.rgb;
            }
        }

        // bring out edges.the actual value could be made gene
        // relies on matrix being marginally oversized
        if (texpos.x < 0. || texpos.x > 1. || texpos.y < 0. || texpos.y > 1. || texpos.x > texpos.y) {
            c.col.rgb = vec3(0);
            c.fluoresc.rgb = vec3(0,0,0.25);  //hsv, could make gene???
        }

//;#endif
        c.surftype.y = 0.;  // prevent default gloss causing confusion. shininess1gloss1subband1plastic1
        return c;
    }
    `;

    var vv = `
    horn("sheet").ribs(100).radius(0.1).color();
    var mainhorn="sheet";

    overrides=\``
    + CSynth.testHybridOverrides +
    `\`;
    `

    // experiment helper: first time in use testHybrid, then swap between that and extratranrule
    //if (CSynth.testHybridTranrule) { currentGenes._extratranrule = vv; CSynth.testHybridTranrule = ''; }
    //else { currentGenes._extratranrule = ''; CSynth.testHybridTranrule = vv; }
    CSynth.testHybridTranrule = vv;
    for (let x in material) {   // clean up material cache for matrix related entries
        const mm = material[x];
        for (let k in mm)
        if (k.startsWith('matrix'))
            delete mm[k];
    }

    // onframe(remakeShaders, 2);   // should not be necessary, it should just do this one
    // onframe(()=>oneside(THREE.DoubleSide), 5);
}

CSynth.matScale = 8;
CSynth.zoomMatrix = () => {
    let cen;
    if (CSynth.picks['g-matrix1']) cen = (CSynth.picks['g-matrix1'].partid + CSynth.picks['g-matrix2'].partid) * 0.5
    else if (CSynth.picks['g-ribbon']) cen = CSynth.picks['g-ribbon'].partid
    else if (CSynth.picks.matrix1) cen = (CSynth.picks.matrix1.partid + CSynth.picks.matrix2.partid) * 0.5
    else if (CSynth.picks.ribbon) cen = CSynth.picks.ribbon.partid

    if (cen === undefined || CSynth.matScale === 1) {
        G.matsize = 1;
        G.matcentre = 0.5;
    } else {
        G.matsize = CSynth.matScale;
        G.matcentre = cen / numInstances;
    }
};
setExtraKey('M,Z', 'zoom matrix', CSynth.zoomMatrix);

for (let i=1; i<9; i++) {
    setExtraKey('M,Z,' + i, 'zoom matrix scale', () => {
        CSynth.matScale = (20**((i-1)/8));
        CSynth.zoomMatrix();
    })
}


/** set 01 and 10 quad colours with two opposing hues, 00,11 black/white */
CSynth.Matrix.colsetpair = function(h=0, s=1, v=1) {
    const c = CSynth.Matrix.colours;
    copyFrom(c.c00, hsv2rgb(h,s,0));
    copyFrom(c.cB1, hsv2rgb(h,s,v));
    copyFrom(c.cA1, hsv2rgb(h+0.5,s,v));
    copyFrom(c.c11, hsv2rgb(h,0,v));
    CSynth.Matrix.colUpdateGui();
}

/** set 01, 10 and 11 quad colours with three 'circular' hues, 00 black */
CSynth.Matrix.colsettriple = function(h=0, s=1, v=1) {
    const c = CSynth.Matrix.colours;
    copyFrom(c.c00, hsv2rgb(h,s,0));
    copyFrom(c.cB1, hsv2rgb(h,s,v));
    copyFrom(c.cA1, hsv2rgb(h+2/3,s,v));
    copyFrom(c.c11, hsv2rgb(h+1/3,s,v));
    CSynth.Matrix.colUpdateGui();
}

/** update gui colours */
CSynth.Matrix.colUpdateGui = function() {
    const c = CSynth.Matrix.colours;
    for(let cc in c)
        c[cc].gui.update();
}

// notes for what happens, towards implementing pick on matrix (and eventually cleaning up hybrid pipeline):
// 'normal' call stack for matrix
//   animate/animatee/renderFrame/renderObjsInner/V.render/M*newRender/M*testHybrid/extraRender/renderObjPipe/ipipeop/pipeop/M*renderPass*RP/rrender
// 'standard horn'
//   animate/animatee/renderFrame/renderObjsInner/renderObj/trigger/renderObjHorn/renderskelbuff/renderHornobj*RP/rendersinglemulti/rrender
//   animate/animatee/renderFrame/renderObjsInner/renderObj/trigger/renderObjHorn/renderPipe/renderObjPipe/ipipeop/pipeop/renderHornobj*RP/rendersinglemulti/rrender
// pick horn (modified)
//   animate/animatee/renderFrame/renderObjsInner/trigger/?Q?/pick/pickGPU/renderObjPipe/ipipeop/pipeop/renderHornobj*RP/rendersinglemulti/rrender
// pick horn (older)
//   animate/animatee/renderFrame/renderObjsInner/trigger/?Q?/pick/pickGPU/renderHornobj*RP/rendersinglemulti/rrender
// 'vpx layout' stack
//   animate/animatee/renderFrame/renderObjsInner/rrender
// springs
//   animate/animatee/renderFrame/trigger/Springs.me.set/(./saveworkhist.savehist)/rrender
// ??? to implement for matrix pick
//    animate/animatee/renderFrame/renderObjsInner/trigger/?Q?/pick/pickGPU/
// M*newRender very straightforward
// M*testHybrid prepares all the 'special' details for different render
// extraRender applies the options, makes the call, and removes the options


// /** distort the matrix.  w.i.p. 10/08/2019, still needs compensation in the texture lookup
//  * all done in shader, will probably never be used, TODO delete September 2019
//  */
// CSynth.distortMatrix = function(p) {
//     const r = CSynth.Matrix.curres;
//     const geometry = HW.planeg(1, -1, r,r, 1, true);
//     CSynth.matrixMesh.geometry = geometry;
//     const a = geometry.attributes.position.array;
//     for (let k=0; k < a.length; k += 3) {
//         let x = a[k];
//         let y = a[k+1];
//         const d = x-y;
//         const s = Math.sign(d);
//         const dd = s * ((s*d) ** p / 2);
//         const c = (x+y) / 2;
//         a[k] = c + dd;
//         a[k+1] = c - dd;
//     }
// }


