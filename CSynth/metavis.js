'use strict';

var THREE, numInstancesP2, numInstances, renderer, CSynth, uniforms, currentGenes, log, W, V, dat, guiFromGene,
addgeneperm, copyFrom, CSynthFast, G, glsl, Marching, skelbuffer, springs, everyframe;

/** simplified rendering for non-organic use */
CSynth.Metavis = function() {
//TODO: experiment with making these shaders more integrated with standard three stuff.
//see https://medium.com/@pailhead011/extending-three-js-materials-with-glsl-78ea7bbb9270

    const me = this;
    const marching = new Marching();
    const X = marching.X;
    V.rawscene.add(marching.three);
    V.rawscene.metavis = marching.three;
    V.rawscene.metavis.visible = false;
    X.sphereScale = 0.001;
    X.rad = 0.01;
    everyframe(() => {
        if (!V.rawscene.metavis.visible) return;
        X.npart = springs.numInstances;
        if (X.sphereYin) {
            X.ntexsize = springs.numInstancesP2;
            marching.updateData(springs.posNewvals.texture, X.sphereScale);
            const k = G.scaleFactor/X.sphereScale; marching.three.scale.set(k,k,k);
        } else {
            if (skelbuffer.width) X.ntexsize = skelbuffer.width; // skelbuffer may disappear for a frame during change ... numInstancesP2;
            marching.updateData(skelbuffer.texture, X.sphereScale);
            const k = 1/X.sphereScale; marching.three.scale.set(k,k,k);
        }
    });

    this.createGUIVR = function() {
        var gui = dat.GUIVR.createX("Metavis");
        gui.add(marching.three, 'visible').listen().showInFolderHeader();
        // CSynth.addColourGUI(gui, uniformsC);

        const xx = W.xxx = {
            get diameter() { return G.sphereRadius * G.nmPerUnit * 2; },
            set diameter(v) { G.sphereRadius = v / G.nmPerUnit * 0.5; },
            get selectedDiameter() { return G.selectedSphereRadius * G.nmPerUnit * 2; },
            set selectedDiameter(v) { G.selectedSphereRadius = v / G.nmPerUnit * 0.5; },
            get res() { return X.xnum; },
            set res(v) { X.xnum = X.ynum = X.znum = v; },
            get useSprings() { return X.sphereYin; },
            set useSprings(v) { X.sphereYin = v; }
        }

        // guiFromGene(gui, 'sphereRadius');
        gui.add(X, 'rad', 0.001, 0.1).step(0.001).listen();
        gui.add(X, 'radInfluence', 1.01, 2.5).step(0.01).listen();
        gui.add(xx, 'res', 10, 300).step(10).listen();
        gui.add(xx, 'useSprings').listen();
        return gui;
    }

}   // SphereParticles
