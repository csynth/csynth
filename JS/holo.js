"use strict";
window.timestamp.holo = '2019/12/20 13:21:50'

var setSize, fitCanvasToWindow, setInput, setViewports, slowMutate, mutate, onframe, vamset, centrescale, nop, W,
Maestro, copyFrom, slots, G, camset, scene, camera, renderer, THREE, HoloPlay, zoomdef, sleep, dustbinvp, log, vpborder,
extrakeys, V, width, height;

var Holo = {tilesX: 5, tilesY: 9, renderResolution: 4096, viewCone: 40, flipX: 0, flipY: 0, rot: false}; // , camz: 4000, fov: 20
// var Holo = {tilesX: 4, tilesY: 8, renderResolution: 2048, viewCone: 40, camz: 4000, fov: 20, flipX: 0, flipY: 0};
// flip not used, don't seem to do anything ???


// set the Holo camera and rendering
async function setHolo(tilesx = Holo.tilesX, tilesy = Holo.tilesY) {
    if (!confirm('are you sure you want to enter Holo mode?')) return;
    Holo.tilesX = tilesx; Holo.tilesY = tilesy;
    if (Holo.source) {
        delete Holo.source;
        Maestro.remove('postframe', Holo._maeskey);
        setViewports([0,0]);
        return;
    }

    //G._fov = Holo.fov;            // field of view suggested for Holo
    zoomdef.camz0 = 10;     // to allow much more move out than standard
    //G._camz = Holo.camz;         // and move out to make object contained
    if (V.fog) V.fog.far = 1e20;    // disable fog, otherwise often long camz hides datr
    await sleep(100);

    // Gldebug.start(true);
    vpborder=0;
    // setSize(3840, 2160)     // this will get reset by fullscreen in any case
    fitCanvasToWindow()
    setInput(W.layoutbox, 1)
    setViewports([Holo.tilesX, Holo.tilesY]);
    dustbinvp = undefined;
    Dispobj.singleViewInteract = true;  // eslint-disable-line no-undef

    const vpn = Holo.tilesX * Holo.tilesY;
    // ensure genes populated
    setInput(W.mutrate, -10)
    slowMutate = false
    mutate()

    // setInput(W.rotallcams, true) // handled by copying genes and forcing refresh

    Holo.holoplay = new HoloPlay(scene, camera, renderer);  // set up for interleave

    Maestro.on('preframe', () => {
        camera.aspect = width/height;   // holo code assumes camera is set for full window, not for pane ???
        // G._fov = Holo.fov;
        const init = Holo.holoplay.render(scene, camera, renderer, true); // set up for computeViews
        if (!init) return;
        const cams = Holo.holoplay.computeViews(camera);        // get cameras
        const pairs = [];
        for (let y = 0; y < Holo.tilesY; y++)
        for (let x = 0; x < Holo.tilesX; x++) {
            const ii = (Holo.tilesY - y - 1) * Holo.tilesX + x + 1;
            if (!slots[ii]) return;         // odd frames may be wrong if vps and Holo.tiles do not match
            const dobj = slots[ii].dispobj;

            ///
            const ti = y * Holo.tilesX + x;
            pairs.push([ii, ti]);

            //  for (let i = 1; i <= vpn; i++) {
            const g = dobj.genes;
            copyFrom(g, G);

            if (Holo.rot) {
                const ang = (ti/vpn - 0.5) * Holo.viewCone * Math.PI / 180;
                const d = camera.position.length(); // Holo.camz;
                alert('this code for holo not checked after redfining camset')
                camset({g, x: Math.sin(ang) * d, y: 0, z: Math.cos(ang) * d});
                dobj.camera = undefined;
            } else {
                /// this version uses the holoply cameras
                let c = dobj.camera = cams[ti];  // these slots are 1 based, cams 0 based.  let not const for debug
                if (c.near !== c.position.z * 0.8 && c.position !== 0) {
                    c.near = c.position.z * 0.8;
                    c.far = c.position.z * 1.2;
                    c.updateProjectionMatrix();
                }
                c.projectionMatrixFixed = true;  // prevent killing work of computeViews
                // c.viewport.set(0,0, dobj.width, dobj.height);
            }
            dobj.needsRender = true;
        }
        // log('pairs', pairs);
    });
    onframe(() => centrescale = nop, 10)
    await sleep(100);

    Holo.source = new THREE.WebGLRenderTarget(Holo.renderResolution, Holo.renderResolution, {format: THREE.RGBFormat});
    Holo._maeskey = Maestro.on('postframe', () => {
        Holo.holoplay.interleave(Holo.source.texture);
    });
}

extrakeys['H,8'] = function() {setHolo(4,8); };
extrakeys['H,9'] = function() {setHolo(5,9); };

