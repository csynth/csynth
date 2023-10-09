// set defaults for CSynth
var copyFrom, G, target, onframe, checkvr, vrresting, renderVR, V, usevr, genedefs, setInput, W, customSettings,
    HW, CSynth, startvr, processFile, updateGuiGenes, newmain, log, framenum, DNASprings,
    nomess, GX, resetMat, camera, omvrpresshold, viveAnim, msgfixlog, numInstances, VEC3, CLeap;


CSynth.setDefaults = function(docustom = true) {
    // nomess('force');

    // add some external definitions to remove lint noise, but gives issues because of scoping

    //
    copyFrom(G, target);    // any pending genes handled at once, then may be overridden below
    W.target = {};            // so any override works

    // from csynth1.oao
    onframe(checkvr, 5);
    onframe(checkvr, 25);

    vrresting.bypassResting = true;
    // MUST be 1 for now while we are using standard three.js (eg oxcsynth)
    // as that does not cater for other values.
    renderVR.ratio = 1;
    V.raylength = 10000;
    V.BypassLeftLaser = true;  // this will mean the red laser does preselect and then select
    V.skipactions = true;
    V.forceheight = false;
    V.keepinroom = false;
    W.alwaysNewframe = 1e10;
    V.testmat = true;
    V.angleOptions = 0;
    // V.skip = false;
    V.useorientation=false; V.alwaysRot=false;
    V.headlight = V.torchlight = true; // but may reverse
    CSynth.modesToHand = true;  // attach modes to hand when possible
    usevr('cs');  // csynth controls, not organic ones

    CSynth.defaultSprings();

    // play below and drag drop
    // G.springspreaddist = 50; G.springspreadpow = 0.01; G.springspreadforce = 0.1; G.springspreadforce = 1; G.springspreadforce = 5;


    // from CSynth.init()
    setInput(W.doAutorot, false);
    setInput(W.doFixrot, true);
    setInput(W.USEGROT, false);
    setInput(W.yzrot, 0); // -0.25 is suitable if we want the rotation
    setInput(W.NOCENTRE, true);
    setInput(W.NOSCALE, true);

    G.wigmult = 1;
    G.R_radius = 0.5;
    // G.radTaper = 100; // G.radTaper = 10e10, for (almost) no taper ... obsolete ???
    G.bias = 0; G.tension = -0.75;  // control Hermite interpolation, defaults same as older code.  Use bias > 99 for older code
    G.NORMTYPE = 5;   // control setting up of tuv orientation, 1 was older method, se hornmaker.vs for more details
    G.sphereRadius = 0.7;
    G.selectedSphereRadius = 0.9;


    GX.setValue('matrix/colour/input a', 'current distances');
    GX.setValue('matrix/colour/input b', 'current dynamics model')
    if (CSynth.parseBioMart.setDefaultVisibility) CSynth.parseBioMart.setDefaultVisibility();

    CSynth.positionMatrix = function() {
        // position matrix
        G.matsize = 1;
        G.matheight = 0;
        G.matX = G.matY = G.matZ = 0;
        if (CSynth.matrixScene ) {
            const s = CSynth.matrixScene;
            s.matrix.identity();
            s.rotation.y = -Math.PI / 4;
            s.rotation.x = Math.PI / 8; // 0.3;
            s.rotation.z = 0;
            s.rotation._order = 'XYZ';
            // s.rotation.onChangeCallback();   // died some time after revision 86
            s.quaternion.setFromEuler(s.rotation, false);
            s.position.y = -630; // -850; adjusted 6 May 2020, when default _camy y set to 0
            s.scale.set(1200,1200,1200);
            s.updateMatrix(); s.updateMatrixWorld();
            G.matMinD = G.matMaxD = 0;
            G.matskipdiag = 0;  // number of items to omit from the diagonal
        }
    }
    CSynth.positionMatrix();


    G._camx = 0;
    G._camz = 1801.25;
    G._camy = 0; // -220; // -220 was mainly for VR, adjusted 6 May 2020
    G.scaleFactor = 25;
    G.fluwidth = -1;  // -ve fluwidth ignores bands and does straight fluorescent

    G._uScale = 1;
    G._camqx = G._camqy = G._camqz = 0; G._camqw = 1;
    G._fov = 40;
    G._uScale = 1;
    G._panx = G._pany = G._panz = 0;
    G._rot4_ele = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

    V.BypassPinch = true;
    G.bumpscale = 20;
    G.bumpstrength = 0.3;

    DNASprings.stretch = DNASprings.laststretch = false;  // we may sort out a sensible strech length later
    DNASprings.fixends = false;

    if (docustom && CSynth.current?.ready)
        customSettings();  // will possibly override almost all the defaults above

    updateGuiGenes();  // ensure new genes display right

    // if these are not set in config file they will be set when load done
    // the unset values must be numeric otherwise some gui creation gets upset
    G.powBaseDist = -999;
    G.scaleFactor = -999;
    G.matDistFar = -999;
    const cc = CSynth.current;
    if (cc?.ready)
        CSynth.autoDefaults();

    newmain();
    document.getElementById('springgui').style.display = 'none';
    log('csynth defaults loaded at frame', framenum);
}  // setDefaults

/** set defaults that depend on data found during load  */
CSynth.autoDefaults = function(force = false) {
    const cc = CSynth.current;
    msgfixlog('auto1', `powBaseDist=${G.powBaseDist} scaleFactor=${G.scaleFactor} matDistFar=${G.matDistFar}`);
    if (cc.xyzs.length) {
        const xyz = cc.xyzs[0];
        const stats = xyz.stats;
        const sc = Math.max(stats.rx, stats.ry, stats.rz);
        if (force || G.powBaseDist === -999) G.powBaseDist = sc / 2;
        if (force || G.scaleFactor === -999) G.scaleFactor = 1000 / sc;
        if (force || G.matDistFar === -999) G.matDistFar = G.powBaseDist / 2;
    } else {
        if (force || G.powBaseDist === -999) G.powBaseDist = numInstances**(1/3) * 3;
        if (force || G.scaleFactor === -999) G.scaleFactor = numInstances**(-1/3) * 100;
        if (force || G.matDistFar === -999) G.matDistFar = G.powBaseDist;
    }
    if (GX.getgui('modes/scalefactor')) {
        GX.getgui('modes/scalefactor').max(G.scaleFactor * 4);
        GX.getgui('matrix/colour/matdistfar').max(G.matDistFar * 4);
    }

    G.capres = 0;  // no need for ribbon caps as we have taper/endblobs, and they complicate the distance along calculation
    G.endbloblen = 4/cc.numInstances;  // todo, make this easier to set sensibly, must align with mesh for clean boundary
                // also not sure why 4/cc.numInstances seems to narrow over 1 particle at each end.
    G.endblobs = 0; // number of blobs at each end, 0 gives taper

    msgfixlog('auto2', `powBaseDist=${G.powBaseDist} scaleFactor=${G.scaleFactor} matDistFar=${G.matDistFar}`);
}


// Vive actions for csynth below, set up by usevr('cs') above
var VH, camset, ima, addtarget;
function csvrclick(button, key, dir, val, src) {
    if (key.indexOf('abovepad') !== -1 || key.indexOf('leftsidebutton') !== -1) {  // abovepad not available in XR
        VH.setguivisible('toggle');
        VH.positionGUI(src ? src.raymatrix : undefined);
    }
    if (key.indexOf('rightsidebutton') !== -1) {
        camset(CSynth.defaultCamera);
        resetMat();
    }

    if (key.contains('rightpadbt')) {   //|||ima
        const d = Math.sqrt(G._camz**2 + G._camx ** 2);
        const s = G.scaleFactor/4;   // 4 is tailored for York virus, >>> TODO needs fix for others
        let nd;
        if (d < 200*s) nd = 1200*s;
        else if (d < 800*s) nd =  0*s;
        else if (d < 999800*s) nd = 600*s;

        if (ima && ima.demo) {
            CSynth.cameraToDist(nd);
        } else {
            const mm = camera.matrix.elements;
            const xz = 1 / Math.sqrt(mm[8]**2 + mm[0] ** 2);
            target._camx = nd * mm[8] * xz;
            target._camz = nd * mm[0] * xz;
            if (camera.far < nd*2) camera.far = nd*2;
        }
    }
    //I could put the picking stuff in here, when key is trigger. Would also need to work out slotOff stuff...
    //let's use an event established elsewhere instead.
    //else if (key.indexOf('trigger') !== -1)
}
/** set camera to a certain distance, based on view direction but ignoring looking up/down */
CSynth.cameraToDist = function(nd, size = 250 * G.scaleFactor * G._uScale, t = CSynth.cameraToDist.time) {
    const mm = camera.matrix.elements;
    //// n.b. with y set to 0 dist will not be exact, but near enough
    //const _camz = nd * mm[10];
    //addtarget({_camx: nd * mm[8], _camy: 0, _camz, t});

    // below allows for position but not direction
    //const dist = camera.position.length(), _camz = dist;  // remove _camz when tested
    //const to = dist ? camera.position.clone().normalize().multiplyScalar(nd) : VEC3(0,0,nd);
    //addtarget({_camx: to.x, _camy: to.y, _camz: to.z, t});

    const to = (mm[8] === 0 && mm[10] === 0) ? VEC3(0,0,nd) : VEC3(mm[8], 0, mm[10]).normalize().multiplyScalar(nd);

    // move the menu with the camera
    // this should be done with better scene heirachy and often moving object rather than camera
    // also jitter on menu during fast shifts, something must be one frame out?
    if (CLeap.menuPanel && CLeap.menuPanel.visible) {
        const e = CLeap.menuPanel.matrix.elements;
        e[12] += to.x - G._camx;
        e[13] += to.y - G._camy;
        e[14] += to.z - G._camz;
    }
    const _camz = nd;  // remove _camz when tested
    addtarget({_camx: to.x, _camy: to.y, _camz: to.z, t});

    viveAnim.time = CSynth.cameraToDist.time;
    if (!renderVR.invr()) {
        let _fov = 2 * Math.atan2(size/2, _camz) * 180 / Math.PI;
        if (_fov > 100) _fov = 100;
        addtarget({_fov, t});
        CSynth.fogfix();        // ?? TODO pass on size
    }
    CSynth.fogfix({t});
    // setTimeout(CSynth.fogfix, CSynth.cameraToDist.time + 100);  // << todo make fogfix use addtarget
}
CSynth.cameraToDist.time = 500;

function csvrnewpress(button, key, dir, val) {
}
function csvrpresshold(button, key, dir, val) {
    //log(`csvrpresshold button:${button}, ${key}, ${dir}, ${val}`);
    if (key === 'rightpadbt')
        omvrpresshold(button, key, dir, val);
}

