// code to help with feedback
var planeg, THREE, G, V, width, height, U, GUINewsub, S, springs, fixfeed, unfixfeed, _fixinfo, fixfeedcoreprep, fixfeedcoreend,
imageOpts, inps, setExtraKey, usemask, cMap, camera, copyXflip, everyframe, xxxdispobj, renderer, ops, ctrl, alt, right,left, middle,
tad, GX, animateNum, xxxgenes, currentGenes, msgfix

var feed = { dofeed: false, viewfactor: 0, edgezoom: false, coreuse: 0.99, showfeed: false, _running: true, animfun: animateNum};
Object.defineProperties(feed, {
    alternate: {
        set: v => {if (v) U.feedbackTintMatrix.set(-1,0,0,0, 0,-1,0,0, 0,0,-1,0, 1,1,1,1); else U.feedbackTintMatrix.identity()},
        get: () => U.feedbackTintMatrix.elements[0] < 0},
    freeze: {
        set: v => {if (v) {springs.stop(); G._fixtime = 1;}
            else {springs.start(); delete G._fixtime;}},
        get: () => !!G._fixtime},
    fixfeed: {
        set: v => {(v ? fixfeed : unfixfeed)()},
        get: () => !!_fixinfo.feedrt},
    corefixfeed: {
        set: v => {(v ? fixfeedcoreprep : fixfeedcoreend)(50)},
        get: () => !!_fixinfo.core},
    running: {
        set: v => {renderer.setAnimationLoop(v ? feed.animfun : () => msgfix.force()); feed._running = v; feed.showone = false;},
        get: () => feed._running},
    showone: {
        set: v => {
            if (v) {
                feed.running = false;
                feed._iii = setInterval(() => {feed.clear(); for(let i=0; i<1; i++) feed.animfun();}, 100)
            } else {
                clearInterval(feed._iii)
                feed._iii = undefined;
            }
        },
        get: () => feed._iii !== undefined},

    shadow: {
        set: v => {
            if (!v) {
                var fp, ftm
                if (feed.shadsave) [fp, feed.dofeed, G.centrerefl, G.centrereflx, G.centrerefly, G.maxfeeddepth, ftm] = feed.shadsave;
                Object.assign(feed.fp, fp);
                if (ftm) U.feedbackTintMatrix.copy(ftm);
                feed.shadsave = undefined
            } else {
                feed.shadsave = [Object.assign({}, feed.fp), feed.dofeed, G.centrerefl, G.centrereflx, G.centrerefly, G.maxfeeddepth, U.feedbackTintMatrix.clone()]
                feed.fp.scale = feed.fp.scalex = feed.fp.scaley = 1;
                feed.fp.rot = 0;
                feed.fp.perspx = feed.fp.perspy = 0;
                feed.fp.panx = 0.2; feed.fp.pany = 0.1;
                feed.dofeed = true;
                G.centrerefl = G.centrereflx = G.centrerefly = 1;
                G.maxfeeddepth = 1;
                U.feedbackTintMatrix.elements.fill(0); U.feedbackTintMatrix.elements[15] = 1
            }
        },
        get: () => !!feed.shadsave}
    });


feed._showfeed = function() {
    if (!feed.coreshow) {
        const geom = planeg(2,2,1,1)
        const mat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0.25, color: 'green'})
        feed.coreshow = new THREE.Mesh(geom, mat);
        V.nocamscene.add(feed.coreshow);
    }
    if (!feed.feedshow) {
        const geom = planeg(22,22,11,11)
        const mat = new THREE.MeshBasicMaterial({wireframe:true, color: 'red'})
        feed.feedshow = new THREE.Mesh(geom, mat);
        V.nocamscene.add(feed.feedshow);
    }
    feed.coreshow.visible = feed.feedshow.visible = feed.showfeed && !_fixinfo.core
}

/* eslint object-curly-newline: 0 */
async function guinewbw() {
    const bwg = GUINewsub('bwrender', 'black/white render settings');   // get place in top level list now
    await S.waitVal(_=>'edgewidth' in G);

    bwg.add(feed, 'dofeed', 'do feedback', 'do feedback').listen();
    bwg.add(feed, 'alternate', 'alternate bw/wb', 'alternate bw/wb').listen();
    bwg.add(feed, 'edgezoom', 'edge/feedback zoom', 'edge/feedback zoom').listen();
    bwg.add(feed, 'freeze', 'freeze springs and time', 'freeze springs and time').listen();
    bwg.add(feed, 'clear');
    cycle(U, 'edgewidth', 0.5, 1,2); // toggle edgewidth, 1,2
    cycle(window, 'usemask', 2, 2,4); // render style
    cycle(U, 'altstyle', 1, 0, 7); // cycle front
    cycle(U, 'occludedelta', 0.001, 0, 0.04);
    cycle(U, 'edgeDensitySearch', 1, -2, 10);
    cycle(U, 'colby', 1, 0, 5); // cycle colour by
    // ow, 'canvasScale', d, 0, 3);
    // (canvasScale-1)
    // idth = k*canvas.width+'px'; canvas.style.height = k*canvas.height+'px';
    cycle(U, 'baseksize', 0.1, 0.1, 6); // cycle base kernel size
    cycle(U, 'occludewidth', 0.1, 0, 6);
    cycle(U, 'profileksize', 0.1, 0, 36); // cycle profile kernel size
    bwg.add(imageOpts, 'usethick', 'use thickness for baseksize', 'use thickness for baseksize').listen();
    bwg.add(feed, 'fixfeed', 'fix feedback buffer', 'fix feedback buffer').listen();
    //  OBSOLETE? 4 Apr 2024 bwg.add(window, 'edgecolour', 'colour scheme for edges', 'colour scheme for edges').listen();
    bwg.add(U, 'fillcol', 'fill colour', 'fill colour').listen();
    bwg.add(U, 'edgecol', 'edge colour', 'edge colour').listen();
    bwg.add(U, 'occcol', 'occlusion colour', 'occlusion colour').listen();
    bwg.add(U, 'profcol', 'profile colour', 'profile colour').listen();
    bwg.add(U, 'unkcol', 'colour for uunknown', 'colour for uunknown').listen();
    bwg.add(U, 'wallcol', 'wall colour in b/w', 'wall colour in b/w').listen();
    cycle(U, 'centrerefl', 0.01, 0.2, 2); // cycle centre refl
    cycle(inps, 'resbaseui', 0.2, 7, 14); // resolutiuon

    for (const n in feed.fp) {
        const rr = feed.rr[n];
        bwg.add(feed.fp, n, rr[0], rr[1], rr[2] ?? 0.001).listen();
    }

    function cycle(obj,name, step, min, max) {
        if (obj === U && name in G) obj = G;
        if (name in obj) {
            return bwg.add(obj, name, min, max, step, name,name).listen();
        } else {
            console.error('guinewbw: cannot find property', name);
        }
    }

    setExtraKey('F8', 'freeze', () => feed.freeze = !feed.freeze)
}

feed.fp = {rot: 0, perspx: 0, perspy: 0, panx: 0, pany: 0, scale: 1, scalex: 1, scaley: 1}; //, feed: true, animate: true;}
feed.rr = {rot: [-2,2], perspx: [-0.1,0.1], perspy: [-0.1,0.1], panx: [-2,2], pany: [-2,2], scale: [0,4], scalex: [-2,2], scaley: [-2,2] }; //, feed: true, animate: true;}


feed.onChange = function() {
    const fp = feed.fp;
    const c = Math.cos(fp.rot), s = Math.sin(fp.rot);
    const useback = usemask == 4 || cMap.renderState === 'color';
    // being called in context with currentGenes temprarily hidden ... even more temporarily reexpose it
    const save_currentGenes = currentGenes;
    const g = currentGenes = xxxgenes();
    try {

        if (_fixinfo.core) {
            [U.centrerefl, U.centrereflx, U.centrerefly] = _fixinfo.centrerefl;
        }

        const crx = U.centrerefl * U.centrereflx, cry = U.centrerefl * U.centrerefly, ar = width/height;

        // feed.basematrix is the 'base' matrix; not allowing for possible wall texture coordinates
        feed.basematrix = feed.basematrix ?? new THREE.Matrix3();
        let xscalex = fp.scalex, xscaley = fp.scaley;
        if (_fixinfo.core) {
            xscalex /= _fixinfo.crx;
            xscaley /= _fixinfo.cry;
        }

        // eslint-disable-next-line no-inner-declarations
        function mset(m) {        // this has xscalex/xscaley as implicit inputs, sets matrix for m as side-effect
            m.set(
                xscalex*c/crx,       xscalex*s/cry * ar, fp.perspx * ar,
                -xscaley*s/crx / ar, xscaley*c/cry,      fp.perspy,
                fp.panx / ar,        fp.pany,            fp.scale);
        }
        mset(feed.basematrix);

        if (_fixinfo.corez) {  // <<<<< NONONO, we may need the wall coord info anyway
            // don't fiddle with scalex/scaley in core mode
    //       xscalex /= _fixinfo.crx;
    //       xscaley /= _fixinfo.cry;
        } else if (useback) {
            //fp.scalex = 1;
            //fp.scaley = 1; // width/height;
        } else {
            const cdist = camera.position.z > 0 ? (camera.position.z - U.walllow.z) : (U.wallhigh.z - camera.position.z)
            const h = cdist * Math.tan(camera.fov * Math.PI/180/2) * 2;
            xscalex *= copyXflip * 2/(h * width/height);
            xscaley *= 2/h;
        }

        // U.feedbackMatrix is feed.basematrix compensated for wall texture coordinates if appropriate
        mset(U.feedbackMatrix);

        if (usemask === 1 || usemask === 5) {  /// TODO TEMP useful to get wallpaper working
            const rs = feed.dofeed ? 'feedback' : 'color';
            if (cMap.renderState !== rs)
                cMap.SetRenderState(rs);
        }

        feed._showfeed()

        if (feed.showfeed) {
            feed.coreshow.scale.set(crx * ar, cry,1);
            feed.coreshow.updateMatrix(); feed.coreshow.updateMatrixWorld();

            feed.feedshow.matrixAutoUpdate = feed.feedshow.matrixWorldAutoUpdate = false;
            const f = feed.basematrix.elements; // U.feedbackMatrix.elements;
            // nb, matrix.setFromMatrix3 looks promising but isn't what we need
            const r = copyXflip
            feed.feedshow.matrix.set(    // n.b. if we use matrix.set his will also transpose  because of matrix.set
                r*f[0]/ar, f[1], 0, f[2],
                r*f[3]/ar, f[4], 0, f[5],
                0,     0,   1,  0,
                r*f[6]/ar, f[7], 0, f[8]);
            feed.feedshow.matrix.invert(feed.feedshow.matrix);
            feed.feedshow.updateMatrixWorld();
        }

        if (!feed.dofeed) U.feedbackMatrix.elements[0] = 0;
        else g.renderBackground = 1; // always do it, the code should sort out background vs feedback
    } finally {
        currentGenes = save_currentGenes;
    }

    //cMap.SetRenderState(G.renderBackground ? 'color' : feed.dofeed ? 'feedback' : 'color')
}
// feed.alwayschange = everyframe(() => feed.onChange()); // not expensive and many things can cause it to be needed
window.addEventListener('setObjUniforms', feed.onChange);

feed.clear = function(col = U.backcol) {
    // const s = U.feedbackMatrix.elements[8]
    // U.feedbackMatrix.elements[8] = 0;
    // await S.frame(2);
    // U.feedbackMatrix.elements[8] = s;
    const dobj = xxxdispobj();

    renderer.setClearColor(col, 0);
    renderer.setRenderTarget(dobj.rt);
    renderer.clear(true, true, true);
    if (dobj._rts) {
        renderer.setRenderTarget(dobj._rts[0]);
        renderer.clear(true, true, true);
        renderer.setRenderTarget(dobj._rts[1]);
        renderer.clear(true, true, true);
    }
    if (V.precamRT) {
        renderer.setRenderTarget(V.precamRT);
        renderer.clear(true, true, true);
    }
    if (!feed.running) feed.animfun();
}

ops[ctrl+alt+right] = (x,y,sss) => { feed.fp.panx += x*sss; feed.fp.pany -= y*sss; }
ops[ctrl+alt+left] = (x,y,sss) => { feed.fp.rot += (x-y)*sss; }
ops[ctrl+alt+middle] = (x,y,sss) => { feed.fp.scale *= (1+sss*0.1)**(-x+y); }
ops[ctrl+alt+left+right] = (x,y,sss) => { feed.fp.perspx += x*sss*0.1; feed.fp.perspy -= y*sss*0.1; }


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

feed.test = async function() {
    await S.waitVal(() => tad.roles.tadskel_bowl4);
    await S.frame(20)
    GX.getgui(/bonestack1/).press();
    GX.getgui(/jumptoform/).press()
    GX.getgui(/drawingmode/).press()
    GX.getgui(/bigwallref/).press()
    GX.getgui(/dofeed/).setValue(true)
    GX.getgui(/freeze/).setValue(true)
    GX.getgui(/edgezoom/).setValue(true)
    G.centrerefl = 0.5;
}
