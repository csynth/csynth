'use strict';

var THREE, numInstancesP2, numInstances, renderer, CSynth, uniforms, currentGenes, log, W, V, dat, guiFromGene,
addgeneperm, copyFrom, CSynthFast, G, glsl, Marching, skelbuffer, springs, everyframe, onframe, isWebGL2, COL;

/** simplified rendering for non-organic use */
CSynth.Metavis = function() {
//TODO: experiment with making these shaders more integrated with standard three stuff.
//see https://medium.com/@pailhead011/extending-three-js-materials-with-glsl-78ea7bbb9270

    const me = this;
    const marching = V.metavis = new Marching(isWebGL2);
    const X = marching.X;
    X.sphereYin = true; // using springs, changes texture axis and scale
    V.rawscene.add(marching.three);
    V.rawscene.metavis = marching.three;
    V.rawscene.metavis.visible = false;
    X.spherePosScale.w = 0.005;
    X.trackStyle = 'trackNone';
    me.rad = 2;
    let guiMat;
    const tv4 = new THREE.Vector4();
    everyframe(() => {
        if (!V.rawscene.metavis.visible) return;
        X.npart = springs.numInstances;
        X.rad = me.rad * X.spherePosScale.w;
        if (X.sphereYin) { // use Springs as input (posNewvals)
            X.ntexsize = springs.numInstancesP2;
            marching.updateData(springs.posNewvals.texture, X.spherePosScale);  // spherePosScale is used to map to -1..1 and back
            const k = G.scaleFactor;        // scale back up to our coordinates, allowing for G.scaleFactor
            marching.three.scale.set(k,k,k);
        } else {
            if (skelbuffer.width) X.ntexsize = skelbuffer.width; // skelbuffer may disappear for a frame during change OR when no ribbon rendered ... numInstancesP2;
            tv4.copy(X.spherePosScale);
            tv4.w = X.spherePosScale.w / G.scaleFactor;
            marching.updateData(skelbuffer.texture, tv4);
            marching.three.scale.set(1,1,1);
        }
        const m = marching.three.material;
        if (m) {
            const c = m.color;
            Object.assign(m, guiMat);
            m.color = c;
            m.color.copy(guiMat.color);
            X.dowire = guiMat.wireframe;
        }
    });

    this.createGUIVR = function() {
        var gui = dat.GUIVR.createX("Metavis");
        gui.add(marching.three, 'visible').listen().showInFolderHeader();
        // CSynth.addColourGUI(gui, uniformsC);

        const xx = W.xxx = {
            // get diameter() { return G.sphereRadius * G.nmPerUnit * 2; },
            // set diameter(v) { G.sphereRadius = v / G.nmPerUnit * 0.5; },
            // get selectedDiameter() { return G.selectedSphereRadius * G.nmPerUnit * 2; },
            // set selectedDiameter(v) { G.selectedSphereRadius = v / G.nmPerUnit * 0.5; },
            get res() { return X.xnum; },
            set res(v) { X.xnum = X.ynum = X.znum = v; },
            get useSprings() { return X.sphereYin; },
            set useSprings(v) { X.sphereYin = v; },
            get medial() { return X.isol === 0},
            set medial(v) {
                if (v) {
                    X.isol = 0;
                    X.medialNeg = 3339;
                    X.medialThresh = 1e-20;
                    X.radInfluence = 5;
                    me.rad = 4;
                    X.doubleSide = true;
                    X.funtype = 0;              // cubic has precise 0 value
                    X.trackStyle = 'trackMedial'
                } else {
                    X.isol = 1;
                    X.medialNeg = 1e20;
                    X.medialThresh = -1e-20;
                    X.radInfluence = 2;
                    me.rad = 2;
                    X.doubleSide = false;
                    X.trackStyle = 'trackNone';
                }
            },
            get organicMaterial() { return !!X.marchtexture},
            set organicMaterial(v) {
                if (v) {
                    if (window.TextureMaterial) {
                        X.marchtexture = true;
                    } else {
                        import('../jsopen/TextureMaterial/TextureMaterial.js').then(() => {
                            X.marchtexture = true;
                            window.TextureMaterial.docol = false;   // should be default ???
                            COL.setx({'': 0, bumpstrength: 3, bumpscale: 10, red:1, green:1, blue: 1, band1: 1});
                            COL.send();
                        });
                    }
                } else {
                    X.marchtexture = 0;
                }
            }
        }

        // guiFromGene(gui, 'sphereRadius');
        gui.add(me, 'rad', 0, 5).step(0.01).listen();
        gui.add(X, 'radInfluence', 1.01, 4).step(0.01).listen();
        gui.add(xx, 'res', 10, 300).step(10).listen();
        // gui.add(xx, 'useSprings').listen();
        gui.add(xx, 'medial').listen().setToolTip('generate medial surface\ncurrently hard coded for Covid example');
        gui.add(X, 'medialColMax', 0,2).step(0.01).listen().setToolTip('max val for medial colour scaling\n0 for plain colour');

        // gui.add(X, 'dowire').listen().setToolTip('show in wireframe');
        gui.add(X, 'showTriangles', 0, 0.02).step(0.001).listen().setToolTip('overlay surface with triangles');
        gui.add(xx, 'organicMaterial').listen().setToolTip('use organic 3d textured material');
        guiMat = CSynth.materialProperties();
        CSynth.materialGui(guiMat, gui); // does not work, material redefined, need proxy or similar
        gui.add(X, 'rotateInside').listen().setToolTip('rotate rgb on back side of double-sided material');

        return gui;
    }

}   // SphereParticles
