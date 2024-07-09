'use strict';

// main code for handling keys for both document and canvas
var W, inputs, lastDispobj, showScaleVariants, newmain, processFile, CSynth, toggleSCLog, VH, msgfix, msgfixerrorlog,
onfrmae, NODO, oldlayerX, oldlayerY, height, camera, renderObj, setInput, ml, Maestro, pick,
startKeystone, onframe, dragObj, canvas, V, vrresetall, vrresting, inedit, currentpick,
saveundo, findMatop, trysetele, animStep, stepeleval, keysdown, killev, // handleF 11,
Director, frameSaver, saven, restoreExtra, clearObjzoom, editgenex, editgeney,
renderObjs, renderQuad, kinectJupDyn, lastdocx, lastdocy, resetMat, currentGenes, // hornhighlight,
springs, HW, msgtrack, renderVR, renderObjsInner, snap, showrts, usemask,
refall, randobj, allunit, mousewhich, stopSC, running, isNode, xwin, nwwin, lastvps, exitfullscreen,

mutate, mutateXX, smtest, randrule, scale, setSize, toggleFix, toggleShare, log, getserveroao, inputsanimsave,
FrameSaver, fileChooser, openfiles, saveSnap, copygenestoclip, clipboard, pastecliptogenes,
save, showControls, loadOao, FractEVO, resize, getWebGalByNum, setshowstats, stats,
updateGuiGenes, remakeShaders,  regenHornShader, setGUITranrule, reloadAllSynths, fadeOut,
setMasterVolume, undo, toTargetNow, setViewports, savebig, saveimage, saveimage1, saveimage1high, saveSkeleton,
brusselsNoAuto, autostep, qget, setInputg, simclick, runcommandphp, msgfixlog, camset, setImposterGUI, target, inps, enterfullscreen, onWindowResize, windowset,

dockeydown, loadVariants, refts, loadVariant, copyFrom, vtarget, viveAnim, DispobjC, fitCanvasToWindow, customSettings,
S, rot, applyMatop, G, nomess, loadopen, Tracker, startscript, centrescalenow, pastSelectGenes, currentObjects,
flatten, format, lastTouchedDispobj, debugKey, setHolo, Holo, GX, makevr, tadpoleSystem, cMap, renderer,
OrganicSpeech, bigimprep, feedbacktests, mutateVisibleGenes, fxaa, shangbig, currentHset, xxxhset, HornSet, resolveFilter, clearSelected,
xxxgenes, hoverDispobj, resetCamera, slots, mainvp, nop, isCSynth, fullscreen, transferView, mutateColour, mutateForm, BrightonStyle, GUIInit, GUIwallkeys,
niractcmd, randmuts, genmini, setBackgroundColor, home, toggleFullscreen, enterFullscreen, exitFullscreen, showzoom, showzoomfix,
saveLots, edge, genwinsom, filesFromDialog, WEBVR, Viewedit, reloadDevtools

var extrakeys = {}; // var for sharing
var keysEmulateVR = false;     // set to true if we want to emulate some VT button experiences
runkeys.onup = [];      // handle 'undo' for certain key combinations
/** set up extra key combinations */
function setExtraKey(key, msg, fun) {
    const k = extrakeys[key] = fun;
    k.extraname = msg;
}
setExtraKey.id = 0;
/** set up extra key combinations with sound input, no key is spacer, fun===nop is new section */
function setExtraKeyS(key = 'spacer' + (setExtraKey.id++), sound = undefined, msg = '', fun = nop) {
    const k = extrakeys[key] = {fun, key};
    k.extraname = msg;
    k.sound = sound;
    if (sound && OrganicSpeech) OrganicSpeech.commands[sound] = fun;
    return k;
}

function _xpick() { pick(lastDispobj, oldlayerX, oldlayerY,0,-1); }   // used for onunique, bot not being confused with first arg maestro event

/** runkeys but catch errors */
function  runkeysQuiet(kkkp, ff, evt = {}) {
    let handled = false;
    try {
        handled = runkeys(kkkp, ff, evt);
        msgfix('runkeys');
    } catch (e) {
        msgfixerrorlog('runkeys', 'invalid keys for current context', kkkp, `<br><small><white>${e.message}</white></small><br>`);
        killev(evt);
    }
    return handled;
}

/** run keystroke combination, also allow array or blank separated list
 * kkkp is the key list
 * ff is the last key
 * ext is the key event causing this call (if any)
 * tryextra (default) allows just 'core' keys to run and ignores extrakeys
 */
function runkeys(kkkp, ff, evt = {}, tryextra = true) {
    const kkka = Array.isArray(kkkp) ? kkkp : kkkp.split(' ');
    if (kkka.length !== 1) { for (const k of kkka) runkeys(k); return true; }
    const kkk = kkka[0];

    newmain();      // so animation gets going for 'game' keys even if not animating/autorotating
    var handled = true;
    var doNewmainIfHandled = true;
    var qq;
    const lastg = xxxgenes(hoverDispobj);
    const hdispobj = hoverDispobj !== NODO ? hoverDispobj : slots ? slots[mainvp].dispobj : undefined;

    const f = extrakeys[kkk];
    if (f && tryextra) {
        if (!evt.repeat) {
            (f.fun || f)();
            const ggg = GX.getgui(f.mostname); if (ggg) ggg.highlight();
        }
    } else

    switch (kkk) {
        case 'ctrl,shift,X': saveSnap(); break;       // save .oao snapshot of current situation
        case 'ctrl,C': copygenestoclip(); break;    // copy genes to clipboard
        case 'C':   // copy genes FROM main view to last clicked slot
            copyFrom(lastTouchedDispobj.genes, currentGenes);
            lastTouchedDispobj.needsRender=10;
            break;
        case 'V':  // show scale variants for given slot
            showScaleVariants(lastDispobj); return true;
            //break;
        case ' ': case '': // spacebar, toggle mutator style animation, or Director running if in Director
        case 'Pause':  // toggle mutator styleanimation, or Director running if in Director
            if (Director.active) { Director.toggle(); return true; }
            setInput(W.doAnim, W.doAnim.checked = !W.doAnim.checked);
            if (inputs.doAnim && inputs.animSpeed === 0)
                setInput(W.animSpeed, 0.4);
            if (springs.isRunning) springs.stop(); else springs.start();
            return true;
            //break;
        case 'ScrollLock':  // toggle autorotation
        case 'A':    // toggle autorotation
            setInput(W.doAutorot, W.doAutorot.checked = !W.doAutorot.checked);
            return true;
            //break;
        case 'alt,S': CSynth.defaultSprings(); break;  // load csynth default springs
        case 'alt,shift,S': CSynth.defaultSprings(); customSettings(); updateGuiGenes(); break;  // load csynth default springs + custom settings
        case 'O': CSynth.orient(); break;   // reorient for CSynth
        case 'shift,O': CSynth.bedorient(); break;  // orient bed for CSynth
        case 'S': if (startscript) processFile(startscript); break;  // rerun the CSynth startscript file
        case 'D': springs.settleHistory(); break;  // kill velocity of spring particles, dynamics keep going
        case 'G': springs.gotoParticle(); break; // centre on selected particle
        case 'shift,~': // toggle display of super collider log
        case 'shift,#': toggleSCLog();  // shift, # is ~, toggle display of super collider log
            break;
        case 'shift,P': if (VH) VH.positionGUI(); break;  // position csynth gui
        case 'ContextMenu,0':  // zoom main vp,
        case 'ContextMenu,1':  // zoom main vp,
        case 'ContextMenu,2':  // zoom main vp
        case 'ContextMenu,3':  // zoom main vp
        case 'ContextMenu,4':  // zoom main vp
        case 'ContextMenu,5':  // zoom main vp
        case 'ContextMenu,6':  // zoom main vp
        case 'ContextMenu,7':  // zoom main vp
        case 'ContextMenu,8':  // zoom main vp
        case 'ContextMenu,9':  // zoom main vp
            doNewmainIfHandled = false;
            var dispobj = lastDispobj;
            if (dispobj === NODO) return true;
            if (evt.repeat) break;
            var s = ff === 'P' ? 80 : Math.pow(2, +ff/2);
            msgfix('zoom', s);

            runkeys.save = {doAnim: inputs.doAnim, doAutorot: inputs.doAutorot };
            setInput(W.doAnim, false);
            setInput(W.doAutorot, false);

            var x = oldlayerX-dispobj.left-dispobj.width/s/2;
            var y = dispobj.height-(height-oldlayerY-dispobj.bottom)-dispobj.height/s/2;
            camera.setViewOffset(dispobj.width, dispobj.height, x, y,
                dispobj.width/s,dispobj.height/s);

            runkeys.onup.push(() => {
                camera.clearViewOffset();  // setViewOffset(dispobj.width, dispobj.height, 0,0, dispobj.width, dispobj.height);
                if (runkeys.save) {
                    setInput(W.doAnim, runkeys.save.doAnim);
                    setInput(W.doAutorot, runkeys.save.doAutorot);
                    delete runkeys.save;
                }
            });
            return true;
            //break;
        case '0':  // show zoomed area of mainvp in top right
        case '1':  // show zoomed area of mainvp in top right
        case '2':  // show zoomed area of mainvp in top right
        case '3':  // show zoomed area of mainvp in top right
        case '4':  // show zoomed area of mainvp in top right
        case '5':  // show zoomed area of mainvp in top right
        case '6':  // show zoomed area of mainvp in top right
        case '7':  // show zoomed area of mainvp in top right5f
        case '8':  // show zoomed area of mainvp in top right
        case '9':  // show zoomed area of mainvp in top right
            showzoom(+ff);
            break;

        case 'ctrl,0':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,1':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,2':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,3':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,4':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,5':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,6':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,7':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,8':  // show zoomed area of mainvp in top right, pixel mult
        case 'ctrl,9':  // show zoomed area of mainvp in top right, pixel mult
            if (ml.capturingTime) break;  // do not allow this while capturing
            //DispobjC.zoom = +ff * 1/inps.renderRatioUi
            //msgfix('zoom', DispobjC.zoom);
            showzoomfix(+ff)
            break;

        case 'alt,Q,0':  // # renderRatio 1
        case 'alt,Q,1':  // # renderRatio 1
        case 'alt,Q,2':  // # renderRatio 0.707 (2xaa)
        case 'alt,Q,3':  // # renderRatio 1/2 (4xaa)
        case 'alt,Q,4':  // # renderRatio 1/3 (9xaa)
        case 'alt,Q,5':  // # renderRatio 1/4 (16x aa)
        case 'alt,Q,6':  // # renderRatio 1.414
        case 'alt,Q,7':  // # renderRatio 2
        case 'alt,Q,8':  // # renderRatio 3
        case 'alt,Q,9':  // # renderRatio 4
            var rrs = [1, 1, Math.sqrt(1/2), 1/2, 1/3, 1/4, 1,  Math.sqrt(2), 2, 3, 4];
            // setInput(W.renderRatioUi, Math.pow(2, ff-5));
            setInput(W.renderRatioUi, rrs[+ff]);
            setInput(W.renderRatioUiProj, 0);
            setInput(W.renderRatioUiMain, 0);
            msgfix('renderRatio', '$renderRatioUi', 'Proj and Main set to 0 to follow base value');
            break;
        case 'N':  // burst of noise
            if (currentGenes.noiseforce !== 0.1) {
                CSynth.savenoiceforce = currentGenes.noiseforce;
                currentGenes.noiseforce = 0.1;
                CSynth.pairdist = {};
            }
            break;
        case 'P':  // burst of pushapart
            if (!evt.repeat) {
                keysdown.savepushapartforce = currentGenes.pushapartforce;
                const nval = currentGenes.pushapartforce ? currentGenes.pushapartforce * 10 : 0.001;
                S.ramp(currentGenes, 'pushapartforce', nval, 1000);
            } else {
                // log('repeat p');
            }
            break;
        case 'Q,W':  //pick and display what part of object identified; relies on repeat key to update
            //onframe( function() { pick(lastDispobj, oldlayerX, oldlayerY); });
            // nb -1 not appropriate for CSynth ... should be 4, check if still used in CSynth
            // Maestro.on('postframe', function() { pick(lastDispobj, oldlayerX, oldlayerY,0,-1); }, {}, true);
            Maestro.onUnique('postframe', _xpick, {}, true);
            return true;
            //break;
        case 'Q,W,E':  // filter based on Q,W pick
            if (currentHset.hornhighlight)
                setInput(W.guifilter, currentHset.hornrun[currentHset.hornhighlight].hornname + '_ | ctrl,F3')
            return true;
            //break;
        case 'Z': S.next(); break; // move to next fixed point in script
        case 'shift,Z': S.interrupt(); break; // interrupt script
        case 'alt,K':  // pick for keystone
            var ki = startKeystone(oldlayerX, height - oldlayerY);
            if (ki !== undefined) {
                dragObj = { keystone: ki };
                canvas.style.cursor = 'crosshair';
            } else {
                dragObj = undefined;
                canvas.style.cursor = '';
            }
            break;

        case 'K,T': CSynth.twist({sc:2 * G.backboneScale * springs.numInstances**(1/3)}); break;   // set spring positions to twisted helix on torus
        case 'K,Y': CSynth.twist({sc:G.backboneScale * springs.numInstances**(1/3), r: 0.05, n: springs.numInstances/10}); break; // set springs with chirality
        case 'K,C': CSynth.circle({sc:G.backboneScale * springs.numInstances**(1/3)}); break;  // set spring positions to circle
        case 'K,R': CSynth.randpos(G.backboneScale * 3); break;     // set random positions
        case 'K,N': tadpoleSystem.remakePositions(); break;         // set tadpole random grid posistions
        case 'K,H': loadopen(); break;                               //# set spring positions to helix
        case 'K,S': CSynth.hilbert(G.backboneScale * 4); break;     // set springs positions to space filling (Hilbert) curve
        case 'K,;': springs.rotatePositions(); break;               // rotate all particles about their centroid
        case 'K,#': springs.reCentre(); break;                     // K,# centre all particles based on their centroid
        case 'K,W': cMap.toggle(); break;                           // toggle wall type

        case 'K,-': HornSet.reduceHorns(lastTouchedDispobj, 0.8); break;            // reduce number of horns
        case 'ctrl,K,-': HornSet.reduceHornsToLimit(lastTouchedDispobj); break;     // for dispobj, reduce number of horns to under the current max horns limit
        case 'shift,K,-': HornSet.reduceAllHornsToLimit(); break;                   // reduce number of horns limit for all mutations
        case 'K,A': HornSet.controlMutation(true); break;                           // start automatic control of mutation to reduce horns
        case 'K,X': HornSet.controlMutation(false); break;                          // stop automatic control of mutation to reduce horns

        currentHset.reduceHornsToLimit()

        case 'R': CSynth.randpos(); break; // set to random positions
        case 'X': CSynth.curstats(); break; // show stats for current
        case 'Y': CSynth.allstats(); break; // show all statistics
        case 'K,1': CSynth.kick(0.1); break;  // kick current particle position, 0.1
        case 'K,2': CSynth.kick(0.2); break;  // kick current particle position, 0.2
        case 'K,3': CSynth.kick(0.5); break;  // kick current particle position, 0.5
        case 'K,4': CSynth.kick(1); break;  // kick current particle position, 1
        case 'K,5': CSynth.kick(2); break;  // kick current particle position, 2
        case 'K,6': CSynth.kick(5); break;  // kick current particle position, 5
        case 'K,7': CSynth.kick(10); break;  // kick current particle position, 10
        case 'K,8': CSynth.kick(20); break;  // kick current particle position, 20
        case 'K,9': CSynth.kick(50); break;  // kick current particle position, 50

        case 'K,L,B': BrightonStyle(); break; // Brighton style layout for mutation

        case 'Q,B,1': springs.time(100); break;     // time 100 spring steps
        case 'Q,B,2': springs.time(1000); break;     // time 1000 spring steps
        case 'Q,B,3': springs.time(10000); break;     // time 10000 spring steps

        case 'J': ml.capture(); break;  // start capture of machine learning judgements

        case 'B':          // 'B' is being used for controller simulation
            V.skip = false;  // give the real 'B' work chance to happen, might not by default on some models
            break;
        //case 'ctrl,B': // controller reset simulation
        //    V.skip = false;  // give the real 'B' work chance to happen, might not by default on some models
        //    vrresetlots();  // <<< no longer exists
        //    break;
        case 'ctrl,alt,B': // controller reset simulation
            V.skip = false;  // give the real 'B' work chance to happen, might not by default on some models
            vrresetall();
            break;
        case 'shift,R':  // toggle resting
            V.resting = !V.resting;
            vrresting.damped = V.resting ? 0 : 1e25;
            // msgfix('>resting', V.resting);
            break;

        // these below are not important enough to have these easy keys to themselves, at least for now.  sjpt 19 Jan 2017
        // ca se 'B': ca se 'C': ca se 'T': ca se 'O': ca se 'Q,S': ca se 'G': ca se 'R': ca se 'A': ca se 'F': ca se 'W': ca se 'alt,S':
        case 'Q,S':     // add 'stack' to current horn
        case 'NEVER':   // commented out use of bend, twist etc keys
            // pick up an object to edit
            // if we don't see one at once, we can hunt for it with the mouse
            // but once picked up, that one will stick till next keyup
            // Do a save for undo before we start any editing
            onframe(function() {
                inedit = true;
                if (currentpick === "") {
                    pick(lastDispobj, oldlayerX, oldlayerY);
                    if (currentpick !== "") saveundo();
                }
                if (currentpick !== "")
                    HW.editobj(kkk);
                findMatop(evt);  // things have changed, so repeat this test
            });
            return true;
            //break;
        case 'ctrl,ArrowRight':  // perform single animation step (??? panning instead ???)
            animStep(false);
            trysetele("doAnim", "checked", false);
            break;
        case 'ctrl,ArrowLeft':  // perform single animation step backwards (??? panning instead ???)
            animStep(true);
            trysetele("doAnim", "checked", false);
            break;
        case 'shift,.': // increase animation speed
            stepeleval(W.animSpeed, 1);
            break;
        case 'shift,,':  // decrease animation speed
            stepeleval(W.animSpeed, -1);
            break;
        case 'alt,Home':  // set lots of things to unit transforms (not always useful)
            allunit();
            break;
        case 'shift,Home':  // go to centre
            lastg._camx = lastg._camy = lastg._camz = 0; lastg._fov = 100;
            hdispobj.render();
            break;
        case 'ctrl,Home':  // reset orientation of object
            resetMat(rot, lastg);
            if (hdispobj) hdispobj.render();
            setInput(W.grot, 0);
            return true;
            //break;
        case 'Home': {    // reset scale of object, and camera
            return home(hdispobj);
            }//break;
        case 'Home,A':    // home all
            for (const o in currentObjects) centrescalenow(currentObjects[o]);
            break;
        case 'PageUp': transferView(); break;   // copy view from main view to all others
        case 'Backspace': edge.chooseColour(evt); break;   // colour picker for selected point
        case 'End': GX.normalizeRange(); break; // normalize the range of hovered GUI item
        case 'cmd,Q': case 'alt,F4':    // quit Organic/CSymth program
                if (stopSC) stopSC(); //TODO: work out why we still sometimes get zombie.
                running = false;
                if (!isNode()) return false;
                setTimeout(function() {
                    if (xwin)
                        xwin.stop();
                    else
                        nwwin.App.quit(); //sometimes doesn't work cleanly on older node-webkit
                }, 100);
                //however, leaving it commented out makes current nwjs behave badly.
                return true;  // so does not get handled by default shutdown
                //break;
        case 'U': snap(); break;  // capture current animation object and put in lru position, lru to dustbin

        case '#': showrts(); break;  // '#':

        case 'ctrl,alt,ArrowUp': applyMatop(1,2, -Math.PI/2, rot); break; // rotate front up 90 <>
        case 'ctrl,alt,ArrowDown': applyMatop(1,2, Math.PI/2, rot); break; // rotate front down 90 <>
        case 'ctrl,alt,ArrowLeft': applyMatop(2,0, -Math.PI/2, rot); break; // rotate front left 90 <>
        case 'ctrl,alt,ArrowRight': applyMatop(2,0, Math.PI/2, rot); break; // rotate front right 90 <>
        case 'ctrl,alt,PageUp': applyMatop(0,1, -Math.PI/2, rot); break; // rotate clockwise 90 <>
        case 'ctrl,alt,PageDown': applyMatop(0,1, Math.PI/2, rot); break; // rotate anitclockwise 90 <>

        case 'ctrl,alt,shift,ArrowUp': applyMatop(1,2, -Math.PI/6, rot); break; // rotate front up 30 <>
        case 'ctrl,alt,shift,ArrowDown': applyMatop(1,2, Math.PI/6, rot); break; // rotate front down 30 <>
        case 'ctrl,alt,shift,ArrowLeft': applyMatop(2,0, -Math.PI/6, rot); break; // rotate front left 30 <>
        case 'ctrl,alt,shift,ArrowRight': applyMatop(2,0, Math.PI/6, rot); break; // rotate front right 30 <>
        case 'ctrl,alt,shift,PageUp': applyMatop(0,1, -Math.PI/6, rot); break; // rotate clockwise 30 <>
        case 'ctrl,alt,shift,PageDown': applyMatop(0,1, Math.PI/6, rot); break; // rotate anitclockwise 30 <>

        case 'ctrl,alt,C,ArrowUp': applyMatop(1,999, -1, flatten); break; // mirror up/down <>
        case 'ctrl,alt,C,ArrowDown': applyMatop(1,999, -1, flatten); break; // mirror up/down <>
        case 'ctrl,alt,C,ArrowLeft': applyMatop(0,999, -1, flatten); break; // mirror left/right <>
        case 'ctrl,alt,C,ArrowRight': applyMatop(0,999, -1, flatten); break; // mirror left/right <>
        case 'ctrl,alt,C,PageUp': applyMatop(2,999, -1, flatten); break; // mirror front/back <>
        case 'ctrl,alt,C,PageDown': applyMatop(2,999, -1, flatten); break; // mirror front/back <>

        case 'ctrl,alt,Home': // 'front' view with z up  <>
            resetMat("all", currentGenes);
            setInput(W.grot, 0);
            applyMatop(1,2, -Math.PI/2, rot);
            break;
        case 'ctrl,alt,X': applyMatop(1,999, -1, flatten); break; // mirror up/down  <>
        case 'ctrl,alt,A': {// // mirror up/down and y rotate 1/2n (antiprismatic?) <>
            applyMatop(1,999, -1, flatten);
            const F = G.A_FK, GG = G.A_GK;
            // assume F+G odd
            applyMatop(2,0, Math.PI / F, rot);
            break;
        }


        case ']': setInput(W.masterVolume, inputs.masterVolume + 1); break; // increase master volume
        case '[': setInput(W.masterVolume, inputs.masterVolume - 1); break; // decrease master volume


        // ca se 'ctrl,0': usemask=0; msgtrack('usemask'); break;  // set usemask 0 (technical)
        // case 'ctrl,1': usemask=1; msgtrack('usemask'); break;  // set usemask 1 (technical)
        // case 'ctrl,2': usemask=2; msgtrack('usemask'); break;  // set usemask 2 (technical)
        // case 'ctrl,3': usemask=3; msgtrack('usemask'); break;  // set usemask 3 (technical)
        // case 'ctrl,4': usemask=4; msgtrack('usemask'); break;  // set usemask 4 (technical)
        // ca se 'ctrl,-': usemask=-1; msgtrack('usemask'); break;  // set usemask -1 (technical)
        case 'ctrl,R': refall(); break;   // refresh all
        case 'ctrl,alt,R': randobj(); break;  // make random object (broken???)
        case 'ctrl,D':  // cycle display mode, solid, dots, lines
            if (HW.dotty) { HW.dotty = false; HW.usewireframe = true; msgfixlog('render', 'wireframe')}
            else if (HW.usewireframe) { HW.dotty = false; HW.usewireframe = false; msgfixlog('render', 'full')}
            else { HW.dotty = true; HW.usewireframe = false;  msgfixlog('render', 'HW.dotty')}
            newmain();
            break;
        case 'shift,V': camset(); break; // random camera view

        case 'ctrl,N': currentGenes.latenormals = currentGenes.latenormals ? 0 : 1; msgtrack('latenormals'); break;  // toggle latenormals (technical)
        case 'alt,V':    // fiddly with renderVR/renderObjsInner (technical)
            renderObjs = renderObjs === renderVR ? renderObjsInner : renderVR;  msgfix('renderVR', renderObjs === renderVR); break;
        case 'ctrl,alt,V': renderVR.xrfs(true); break;  // go to VR (but use F2/F6?) (technical)
        case 'ctrl,shift,alt,V': renderVR.xrfs(false); break;  // leave VR (use F4) (technical)

        case 'alt,ContextMenu,4': // toggle renderObs and renderQuad
            renderObjs = renderObjs === renderQuad ? renderObjsInner : renderQuad; msgfix('renderQuad', renderObjs === renderQuad); break;
        case 'alt,W':  {// kinect extra mouse mode (???broken???)
            var m = kinectJupDyn.extramouse.mode;
            let msgw;
            if (!m) {m = 3; msgw = 'main'; }
            else if (m === 3) { m = 2; msgw = 'sub'; }
            else { m = 0; msgw = 'none'; }
            msgfix("mouse wiggle control", msgw);
            kinectJupDyn.extramouse = {mode:m, x: lastdocx, y: lastdocy };

            resetMat("all", currentGenes);
            setInput(W.grot, 0);
            newmain();
            if (m) springs.start(); else springs.stop();
            break;
        }

        case 'T,X':  // open texture
            window.location.href = window.location.href.pre('?') + "?appToUse=Texture&"
            break;
        case 'T,F':  // open fano
            window.location.href = window.location.href.pre('?') + "?appToUse=Fano&"
            break;
        case 'T,J':  // open Julia
            window.location.href = window.location.href.pre('?') + "?appToUse=Julia&"
            break;
        case 'T,H':  // open Horn
            window.location.href = window.location.href.pre('?') + "?appToUse=Horn&"
            break;
        case 'T,S':  // open ImplicitShape
            window.location.href = window.location.href.pre('?') + "?appToUse=ImplicitShape&"
            break;


        case 'ctrl,shift,A': Director.setup(); break; // setup for Director
        case 'alt,A': Director.toggle(); break; // toggle Director preview running on/off
        case 'shift,A': Director.toggle(true); break;  // toggle Director preview on full frame
        case 'alt,shift,A': Director.record(); break; // Director record
        case 'ctrl,alt,shift,A': Director.record(true); frameSaver.quickout= true; break;  // Director record with quickstart
        case 'ctrl,A': Director.prepLinear(); break; // Director prepare linear animation from current main object

        // note do NOT use pure arrows, they are used in game mode
        case 'alt,ArrowUp': Director.step(1); break;  // director step frame forward
        case 'alt,ArrowDown': Director.step(-1); break;  // director step frame backwards
        case 'shift,ArrowUp': Director.step(10); break;  // director step frame forward 10 frames
        case 'shift,ArrowDown': Director.step(-10); break;  // director step frame backward 10 frames

        case 'alt,D': toggleInput(W.showdirectorrules); break;          //# toggle director rules. PJT: conflicts with standard browser shortcut.

        case 'M,0':  CSynth.clearMarkers(); break;            // clear all markers
        case 'M,1':  CSynth.setMarkerFromSelection(0); break; // set marker 0 or marker pair 0,1
        case 'M,2':  CSynth.setMarkerFromSelection(1); break; // set marker 1 or marker pair 1,2
        case 'M,3':  CSynth.setMarkerFromSelection(2); break; // set marker 2 or marker pair 2,3
        case 'M,4':  CSynth.setMarkerFromSelection(3); break; // set marker 3 or marker pair 3,4
        case 'M,5':  CSynth.setMarkerFromSelection(4); break; // set marker 4 or marker pair 4,5
        case 'M,6':  CSynth.setMarkerFromSelection(5); break; // set marker 5 or marker pair 5,6
        case 'M,7':  CSynth.setMarkerFromSelection(6); break; // set marker 6 or marker pair 6,7
        case 'M,8':  CSynth.setMarkerFromSelection(7); break; // set marker 7 or marker pair 7,8
        case 'M,Insert':  CSynth.setMarkerFromSelection(-9); break; // set marker(s) in free slots
        case 'alt,Z':  CSynth.setMarkerFromSelection(-9); CSynth.markers2Bed(); break; // set marker(s) in free slots and generate bed from all markers
        case 'alt,shift,Z':  CSynth.markers2Bed(undefined, true); break; // generate and save bed from all markers
        case 'M,C':  CSynth.contactClosest(); break; // move current to closest fixed contact point

        case 'M,U':  CSynth.orient('up'); break; // set UP particle for CSynth orientation
        case 'M,R':  CSynth.orient('right'); break; // set RIGHT particle for CSynth orientation
        case 'M,O':  CSynth.orient(); break; // perform CSynth orientation to defined particles

        case 'M,E':  CSynth.showEigen(true); break; // perform CSynth orientation to eignevectors
        case 'M,F':  CSynth.msgAllFiles(); break;   // display tree of directories/files for CSynth

        //ca se 'M,O,A':  // perform CSynth orientation to defined particles and angle x axis to diagonal
        //ca se 'M,E,A':   // perform CSynth orientation to eignevectors and angle x axis to diagonal
        case 'M,A':  CSynth.tilt(); break; // angle x axis to diagonal

        case 'M,V': window.location.href='http://localhost:8800/csynth.html?startscript=CSynth/data/Yorkstudents/newtest_v3.js'; break; // York virus
        case 'M,Y': window.location.href='http://localhost:8800/csynth.html?startscript=CSynth/data/crickLots/lots.js'; break; // Crick yeast
        case 'M,X': window.location.href='http://localhost:8800/csynth.html?startscript=CSynth/data/C75X1200/load_data.js'; break; // Oxford
        case 'M,L': window.location.href='http://localhost:8800/csynth.html?startscript=CSynth/data/Lorentz/lorentz.js'; break; // Lorentx


        case '/': saven(); break;   // save state with unique name
        case '\\': break;  // reserved for 4d rotation
        case '8,\\':  // toggle PIXELS for feedback (technical)
            setInput(W.PIXELS, !inputs.PIXELS); msgfix("pixels", inputs.PIXELS);
            break;

        case 'Delete':   // piste step: simulate vr controller right click
            if (keysEmulateVR) {simclick(); break;}
            runkeys('Q,W');
            break;
        case 'ctrl,Delete':   // simulate left click ... wrong
        if (keysEmulateVR) {simclick('lefttrigger'); break;}
            break;
        case 'Insert':   // piste step: simulate vr controller left click
        if (keysEmulateVR) {simclick('lefttrigger'); break;}
            // runkeys('Q,W');
            break;
        case 'ctrl,Insert':   // quick load curated
            copyFrom(vtarget, loadVariant(-1, 200));
            viveAnim.time = 200;
            break;
        case 'T,P':  // try to get focus/performance back
            makevr();  // for some reason this joggles things and helps with performance
            break;
        case 'T,V':  loadVariants(); break; // load variants
        case 'I': CSynth.showPickDist(); break; // show pick distances
        case 'shift,I':   // toggle pick distance mode
            if (runkeys.pickregid) {
                Maestro.remove('postframe', runkeys.pickregid);
                runkeys.pickregid = undefined;
            } else {
                nomess('release');
                runkeys.pickregid = Maestro.on('postframe', CSynth.showPickDist);
            }
            break;
        // case 'L': setHolo(); break;
        case ';': Holo.rot ^= true; msgfix('holoCam', Holo.rot ? 'old rotation' : 'skewed offset'); break; // toggle holo rotation
        case 'E': killev(evt); GX.html(); break;  // bring up edit box for GX style gui
        // case 'Insert,PageUp': GX.hscale(10); break;    // hover over gui slider: increase value and scale by factor of 10
        // case 'Insert,PageDown': GX.hscale(1/10); break;    // hover over gui slider: decrease value and scale by factor of 10
        // case 'alt,Insert,PageUp': GX.hscale(10, undefined, false); break;    // hover over gui slider: increase scale by factor of 10, value unchanged
        // case 'alt,Insert,PageDown': GX.hscale(1/10, undefined, false); break;    // over over gui slider: decrease scale by factor of 10, value unchanged
        // case 'Insert,Home': GX.hinitval(); break;        // restore initial value
        // case 'Insert,End': GX.autoscale(); break;        // scale slider from current value
        // case 'Insert,ArrowUp': GX.hstep(1); break;    // increase value for hover over gui slider
        // case 'Insert,ArrowDown': GX.hstep(-1); break;    // increase value for hover over gui slider
        // case 'Insert,=': GX.hide(); break;    // hide hovered element
        // ?? case 'Insert,=': GX.show(); break;    // restore last hidden element
        case 'Insert,Backspace': inps.useinterp = !inps.useinterp; break;    // toggle use of glsl form interpreter
        case 'Insert,Home': windowset(0); break;    // establish 'sensible' sized screen
        case 'Delete,0': setBackgroundColor(0); break;  // black background
        case 'Delete,1': setBackgroundColor(1); break;  // white background

        case 'Q,,': GX.restorenextfile(true); break; // goto previous .settings files
        case 'Q,.': GX.restorenextfile(); break; // goto next .settings files
        case 'H': GX.restorenextfile(true); break; // goto previous .settings files
        case 'F': GX.restorenextfile(); break; // goto next .settings files
        // case 'K': alert('test key'); break; // test for free

        default:
            // kill any non-special keys in the canvas area
            // to reduce risk of errors such as overtype on rules
            //if (kkk.length === 1) return true;
            //if (keysdown.length === 2 && keysdown[0] === 'shift' && keysdown[1].length === 1) return true;
            handled = false;
            break;
    }
    if (handled) {
        if (doNewmainIfHandled) newmain();
        return true;
    }
    return undefined;
}  // runkeys

function runkeysup(evt) {
    runkeys.onup.forEach(f => f());     // cancel anything outstanding
    runkeys.onup = [];

    var ff = getkey(evt);

    var i = keysdown.indexOf(ff);
    if (i !== -1) keysdown.splice(i,1);
    findMatop(evt); // refresh feedback about manipulation operation
    switch (ff) {
        // 16 June 2022, removed, do all F11 handling ourselvescase 'F 11': handleF 11("up"); break;  // keyup on exit full screen
        case 'V': restoreExtra(); return killev(evt);   // restore extra objects
        case 'alt': return killev(evt); // !techincal!
        case 'N':  // end burst of noise
            if (CSynth && CSynth.savenoiceforce !== undefined)
                currentGenes.noiseforce = CSynth.savenoiceforce;
            break;
        case 'P':  // end burst of pushapart
            if (keysdown.savepushapartforce !== undefined)
                S.ramp(currentGenes, 'pushapartforce', keysdown.savepushapartforce, 100);
            break;
        case '0':  // restore main object pan/zoom
        case '1':  // restore main object pan/zoom
        case '2':  // restore main object pan/zoom
        case '3':  // restore main object pan/zoom
        case '4':  // restore main object pan/zoom
        case '5':  // restore main object pan/zoom
        case '6':  // restore main object pan/zoom
        case '7':  // restore main object pan/zoom
        case '8':  // restore main object pan/zoom
        case '9':  // restore main object pan/zoom
            { const k0 = keysdown[0]
            if (k0 === 'ctrl') break;
            if ('0' <= k0 && k0 <= '9') break;// so we can do eg 4 => 4,5 => 5
            showzoom('clear');
            if (ff === '0') showzoomfix('clear');
            } break;
    }
    currentpick = "";
    editgenex = undefined;
    inedit = false;
    findMatop(evt);
    msgfix('hit'); currentHset.hornhighlight
    msgfix('op');
    return undefined;
}

function dockeydowninner(kkk, evt) {
    // first keys that work all over the document
    var handled = true;
    if (kkk.startsWith(';,')) {
        debugKey(kkk);
        return true;
    }
    switch (kkk) {
        // Below assumes all separated gui folders are in nocamscene, and nothing else is.
        // Need to review to clean all gui folder when in VR, or if nocamscene gets used for something other than guis TODO
        case 'Insert,A': GX.savegui(); break;  // save gui
        case 'alt,F1': V.nocamscene.visible = !V.nocamscene.visible; break;  //# toggle gui menu (nocamscene)
        case 'alt,F2': Viewedit.toggle(); break;  //# toggle viewedit menu
        // ca se 'alt,F12': reloadDevtools(); break;  //# reload devtools (broken?)
        case 'alt,F3': mutate(); break;  //# mutate all free (old style)
        case 'F3': mutateXX(); break;  //# mutate, free as checked in boxes
        case 'Insert,F3': randmuts({k: 0.5, tag:'*'}); break;   //# random very widely (not mutate)
        case 'ctrl,F3': mutate({filter: resolveFilter()}); break;  //# mutate only using filtered genes
        case 'Q,F3': mutate({filter: resolveFilter(), mutateFrozen: 1}); break;  //# mutate only using filtered genes
        case 'shift,F3': smtest(); break;   // # structure mutate
        case 'alt,shift,F3': randobj(G, false); updateGuiGenes(); break;  //# mutate just the main object
        case 'K,F3': mutateForm(); break; // mutate form only
        case 'L,F3': mutateColour(); break; // mutate colours only
        case 'L,W': clearSelected(); break; // wipe selection
        case 'L,M': CSynth.startLMV(); break;  // start LMV
        // case 'F4 ': randrulemutate(); break;        //# mutate, including structure mutation, currently not supported
        // case 'alt,Meta,R': setInput(W.NOMESS, !inputs.NOMESS); break;
        case 'alt,Meta,Q': setInput(W.NOMESS, !inputs.NOMESS); break;   // toggle nomess
        //  window.location.href += '' // another way to resart
        case 'F5':
            if (xwin) xwin.restart();
            else if (nwwin) nwwin.reload();
            else if (navigator.appVersion.match('Electron')) location.href += '';
            else handled = false;
            break; //# reload
        case 'ctrl,F5': if (xwin) xwin.restart(true); else if (nwwin) nwwin.reloadIgnoringCache(); else handled = false; break;  //# reload, ignoring cache
        case 'shift,F5': {  //# reload with current object
            let h = location.href;
            // remove old startobj= if any
            if (!h.includes('?')) {
                h += '?';
            } else {
                h = (h + '&').replace(/startobj=.*?&/, '')
            }
            // add new startobj=
            h += `&startobj=${loadOao.lastfn}`;
            h = h.replace(/&&/, '&');
            location.href = h;
            break;
        }

        case 'shift,F4': randrule(); break;  //# generate random rule change
        // case 'F6 ': reformRule(); break;        //# reform rule
        case 'F7': /*if (!repeat)*/ scale(currentGenes); break; // repeat wrong because of runkeys  //# scale current object (? obsolete version ?)
        // 'F8' used by devtools, break
        // 'ctrl,F8' used by devtools
        // 'alt,F8' used by Geoforce ???
        // case 'alt,F8': debugger; break;  //# break with debugger statement
        case 'shift,F8': debugger; break;  //# break with debugger statement
        // ca se 'F8': setSize(); break;  //# set size to screen
        // ca se 'shift,F8': setSize(1280, 720); break;  //# set size to 1280x720
        case 'F9': toggleFix(); break;    //# toggle whether
        case 'F10': toggleShare(); break;    //# toggle whether sharing session

        // 21 Sept 2022 moved to dockeydowninner from runkeys
        // 16 June 2022, removed, do all F11 handling ourselves,. so document.fullscreenElement etc are reliable
        // If we allow 'standard' F11 behaviour to work this does fullscreen almost independently and very difficult to detect, which really confuses things
        // 23 Jan 2023, looks as if window.outerHeight === window.innerHeight is test to detect if we are in either (or both) fullscreen styles
        case 'F11': handled = false; log('f11 detected'); break;  // standard toggle fullscreen, non-programmable old style, only in list for debug purposes
        case 'ctrl,F11': toggleFullscreen(evt); break;  // toggle fullscreen (toggleFullscreen())
        case 'shift,F11': enterFullscreen(evt); break; // enter fullscreen (enterFullscreen())
        case 'alt,F11': exitFullscreen(evt); break; // exit fullscreen (exitFullscreen())
        // ca se 'ctrl,F11': if (document.fullscreenElement) document.exit Fullscreen(); else fullscreen(); break;  // toggle request Fullscreen style fullscreen
        // ca se 'shift,F11': fullscreen(); break; // enter request Fullscreen style fullscreen (fullscreen())
        // ca se 'alt,F11': if (document.fullscreenElement) document.exit Fullscreen(); break; // exit request Fullscreen style fullscreen (exitFullscreen())
        //??? case 'alt,shift,F11': document.exit Fullscreen(); break; // this is a complete force of exitFullscreen, for debug, causes error if not in fullscreen

        case 'F11XX': if (nwwin) {  // toggle fullscreen

                try {
                     nwwin.toggleFullscreen();
                } catch (e) {
                    log('error in toggleFullscreen', e);
                }
                if (nwwin.isFullscreen) {
                    setInput(W.projvp, false);
                    setInput(W.fullvp, false);
                    msgfix('fullscreen', 'on', nwwin.width, nwwin.height);
                } else {
                    msgfix('fullscreen', 'off', nwwin.width, nwwin.height);
                }
            } else {
                handled = false; // leave fullscreen handling to browser if not in electron/nwwin/...
            }
            break;  //# toggle fullscreen
        case 'F12':    //# show development tools
            if (nwwin) {
                nwwin.showDevTools();
                keysdown=[];   // real keyup is lost to devkit
            } else if (navigator.userAgent.indexOf('Electron') !== -1) {
                niractcmd('sendkeypress ctrl+shift+i')
            } else handled = false;
            break;
        case 'ctrl,shift,W': getserveroao("files/web.oao"); break;  // load web.oao

        case 'ctrl,Q':  // set up fixed rotation and record  (???broken???)
            // special for William 14 Jan 2017, to generalize
            setInput(W.xzrot, -0.225);
            setInput(W.xyrot, 0);
            setInput(W.yzrot, 0);
            setInput(W.doyrot, true);
            setInput(W.doxrot, false);
            setInput(W.dozrot, false);
            setInput(W.USEGROT, false);
            setInput(W.grot, 1);


            frameSaver.type = isNode() ? "buffer" : "F32Array";
            //trysetele(W.animsave, 'checked', !inputs.animsave);
            inputsanimsave = !inputsanimsave;
            msgfix("saveanim", inputsanimsave ? "recording frames" : "END recording frames, ctrl-shift-Q to render them.");
            break;
        case 'ctrl,shift,Q':  // start to render frames
            frameSaver.showonly = false;
            msgfix("saveanim", "starting to render frames");
            FrameSaver.StartRender();
            break;
        case 'shift,Q':  // replay saved frames
            frameSaver.showonly = true;
            msgfix("saveanim", "replaying frames");
            FrameSaver.StartRender();
            break;
        case 'ctrl,J': getserveroao("files/jupiter.oao"); break;  // load Jupiter
        case 'ctrl,Y':      // load tempest and enter VR
            // getserveroao("gallery/York_15x_NewS2.oao");
            getserveroao("gallery/Tempest3ax8.oao");
            renderVR.xrfs(true);
            break;
        case 'ctrl,O': filesFromDialog();  break; // open files
        case 'ctrl,alt,O': filesFromDialog(undefined, true);  break; // open directory
        case 'ctrl,shift,O':  // reopen last opened files (from drop or ctrl,o)
            openfiles();
            break;
        case 'ctrl,shift,V': if (clipboard) pastecliptogenes(); else handled = false; break;    // paste local clipboard into genes
        case 'ctrl,X,F':    // paste form genes
        case 'ctrl,X,C':    // paste colour genes
        case 'ctrl,X,T':    // paste texture genes
        case 'ctrl,X,S':    // paste surface genes
        case 'ctrl,X,V':    // paste view genes
        case 'ctrl,X,A':    // paste all genes
            pastSelectGenes(kkk[7]);
            break;
        // case 'ctrl,V'  // LEAVE THIS TO ONPASTE
        case 'ctrl,S': save(); break;           // save
        case 'ctrl,shift,S': saveLots(); break; // save lots
        case 'alt,.': springs.start(); break;   // start springs running
        case 'alt,,': springs.stop(); break;    // stop springs running
        case 'alt,F': trysetele("fixcontrols", 'checked', !W.fixcontrols.checked); showControls(W.fixcontrols.checked); onWindowResize(true); break; // toggle fixed controls (not over canvas)
        case 'alt,G': trysetele("showgrid", 'checked', !W.showgrid.checked); W.showgrid.onchange(undefined); break; // toggle showgrid
        case 'ctrl,L':  // load most recent used item, no view change
        case 'alt,L':  // load most recent used item, view change
            loadOao(loadOao.lastfn);
            break;
        case 'alt,C': showControls("toggle"); break;    //  toggle fixed controls (over canvas)
        case 'alt,E': FractEVO.startEvolving(); break;  // start FractEVO evolution
        case 'alt,shift,E': FractEVO.scorePopulation(); FractEVO.watchExe(); break; // FractEVO score
        case 'ctrl,shift,L':  // load most recent item in gallery, no view change
        case 'alt,shift,L':  // load most recent item in gallery, view change
            loadOao(loadOao.lastfn);
            break;
        case 'alt,P':  // cycle stats, off,fps,ms
            if (!inputs.showstats) {
                setshowstats(true);
                stats.mode = 0;
                stats.setMode(stats.mode);
            } else if (stats.mode) {
                setshowstats(false);
            } else {
                stats.mode = 1;
                stats.setMode(stats.mode);
            }
            break;
        case 'ctrl,/':  // make random mutated object (random genes)
            randobj(currentGenes, false, 'pulse', true);
            updateGuiGenes();
            break;
        case 'ctrl,M':  // rebuild shaders
            console.log("ctrl,m hit >>>>>>>>>>>");
            remakeShaders(true);
            break;
        case 'ctrl,alt,M':  // rebuild shaders and refresh all
            refts();
            break;
        case 'ctrl,shift,M':    // remake all horn shaders
            msgfix('regen horn shaders', '<span class="errmsg">regen horn and rebuilding shader</span>');
            onframe( () => msgfix('regen horn shaders'), 2 );
            console.log("ctrl,shift,m hit >>>>>>>>>>>");
            // baseShaderChanged();  done in getShaders()
            regenHornShader();
            break;
        case 'alt,R': toggleInput(W.showrules); break;                  //# toggle tranrules
        case 'alt,N': toggleInput(W.NOMESS); break;                     //# toggle nomess (message box, etc)
        case 'alt,O': toggleInput(W.showuiover); break;                 //# toggle gui overlay
        case 'alt,shift,N': nomess('release'); msgfix.all = true; break;//# force nomess('release') and all messages
        case 'alt,H': toggleInput(W.showhtmlrules); break;              //# toggle html rules
        case 'ctrl,H': loadopen(); break;                               //# load open helix
        case 'alt,shift,R': setGUITranrule(); break;                // ensure gui tranrule applied
        case 'ctrl,ContextMenu,1': reloadAllSynths(); break;        // reload all synths
        case 'ctrl,ContextMenu,2': fadeOut(1); break;               // fade
        case 'alt,M': if (setMasterVolume) setMasterVolume(-80); break; //# setMasterVolume
        // ca se 'ct rl, Z': undo(); break;
        case 'alt,T': toTargetNow(); break;     // jump genes to target immediately
        case 'F2': case 'F6': log('f2/f6 seen for forcevr zzz'); renderVR.xrfs(true); break;  // try to enter VR
        case 'shift,F2': WEBVR.setup(); break;  // try to recover if XR started after our initialization
        case 'F4': // leave VR mode
            renderVR.xrfs(false);
            onframe(() => { setViewports([0,0]); setSize(); fitCanvasToWindow(); }, 3); break;  // special for odd sendKeys

        case 'ctrl,alt,T': Tracker.init(); break;  // start tracker
        case 'ctrl,alt,Q':  // show basic information about camera etc
            msgfix('!campos', '$_camx$ $_camy$ $_camz$');
            msgfix('!camrot', '$_camqx$ $_camqy$ $_camqz$ $_camqw$');
            msgfix('!fov', '$_fov$');
            msgfix('!pan', '$_panx$ $_pany$ $_panz$');
            msgfix('!rot', '$_qux$ $_quy$ $_quz$ $_quw$');
            // msgfix('!lowrad', '$foldradius$ $foldradiuslowr$');
            break;
        case '`': savebig(); break;  // save current frame, # 223 is backquote
        case 'ctrl,I': saveimage(); break;  // save image of layout
        case 'alt,I': setImposterGUI(); break;  // toggle imposter
        case 'ctrl,alt,I': saveimage1(); break; // save image of central object at resolution set in gui
        // nb f5 does not do devtools in Electron
        case 'ctrl,shift,I': if (navigator.userAgent.indexOf('Electron') !== -1) handled = false; else saveimage1high(); break; // save image of central object, high quality
        case 'ctrl,K': saveSkeleton(); break; // save current form (and colours) as skeleton for use in tadpoles
        case 'ctrl,E': genwinsom(); break;  // save current form as winsomefiles
        case 'alt,0': setViewports([0,0]); break; // single viewport
        case 'alt,-': setViewports(lastvps); break; // switch to last viewports
        case 'alt,1': setInput(W.layoutbox, 0); setViewports([4,3]); break; // 12 viewports
        case 'alt,2': setInput(W.layoutbox, 2); setViewports([2,2]); break; // 2x2 viewports
        case 'alt,3': setInput(W.layoutbox, 2); setViewports([3,3]); break; // 3x3 viewports
        case 'alt,4': setInput(W.layoutbox, 2); setViewports([4,4]); break; // 4x4 viewports
        case 'alt,5': setInput(W.layoutbox, 2); setViewports([5,5]); break; // 5x5 viewports
        case 'alt,6': setInput(W.layoutbox, 2); setViewports([6,6]); break; // 6x6 viewports
        case 'alt,7': setInput(W.layoutbox, 2); setViewports([7,7]); break; // 7x7 viewports
        case 'alt,8': setInput(W.layoutbox, 2); setViewports([8,8]); break; // 8x8 viewports
        case 'ctrl,alt,shift,Z': brusselsNoAuto = !brusselsNoAuto; autostep(); msgfix("auto interaction", brusselsNoAuto ? 'off' : 'on'); break;  // toggle auto on off
        // case 'alt,Q':
        //     var src = evt.target;
        //     msgfix('evt', src.id, '/', src.value);
        //     var name = src.id || src.value;
        //     if (qget(name) !== undefined) msgfix(name, "$" + name);
        //     break;
        case 'ctrl,,': setInputg(W.resbaseui, inputs.resbaseui*1-1); msgtrack('resbaseui'); break;  // reduce horn base resolution (resbaseui)
        case 'ctrl,.': setInputg(W.resbaseui, inputs.resbaseui*1+1); msgtrack('resbaseui'); break;  // increase horn base resolution (resbaseui)
        case 'alt,#': springs.step(1); break;   // single spring step
        case 'ctrl,alt,,': setInputg(W.resbaseui, inputs.resbaseui*1-0.1); msgtrack('resbaseui'); break;  // small reduce horn base resolution (resbaseui)
        case 'ctrl,alt,.': setInputg(W.resbaseui, inputs.resbaseui*1+0.1); msgtrack('resbaseui'); break;  // smallincrease horn base resolution (resbaseui)
        case 'ctrl,;': currentGenes.cubicmixuse = currentGenes.cubicmixuse ? 0 : 1; msgtrack('cubicmixuse'); break; // toggle cubemixuse (splining)
        case 'ctrl,alt,/':      // (debug) show HTML element being hjovered
            msgfix('id hit', document.elementFromPoint(lastdocx, lastdocy).id);
            break;
        // ca se ';': if (debugKey) debugKey();


        case 'Q,1': bigimprep(0); break;    // ??? prepare to save big images
        // case 'Q,2': bigimprep(2); break; // << does not work
        case 'Q,3': bigimprep(3); break;    // ??? prepare to save big images
        case 'Q,4': bigimprep(4); break;    // ??? prepare to save big images
        case 'Q,5': bigimprep(5); break;    // ??? prepare to save big images
        case 'Q,6': bigimprep(6); break;    // ??? prepare to save big images
        case 'Q,G': location.href = "http://localhost:8800/threek.html?startobj=GalaxReflB"; break;
        case 'Q,F': feedbacktests(); break; // perform feedback tests
        case 'Q,V': mutateVisibleGenes(); break;    // mutate visible genes
        case 'Q,X': fxaa.use = !fxaa.use; break;    // toggle use of fxaa
        case 'Q,-': currentHset.hornhighlight = undefined; break;   // clear highlighting
        case 'Q,Insert': fxaa.use = true; break;    // use FXAA
        case 'Q,Delete': fxaa.use = false; break;   // turn off FXAA
        case 'Q,O': shangbig(); break;              // shanghai big

        case 'shift,W':
            GX.makegxx();
            GUIInit();
            VH.positionGUI();
            GUIwallkeys();
            brusselsNoAuto = true;
            inps.projvp = false;
            enterfullscreen();
            break;

        case 'Insert,G': genmini(); break;
        case 'shift,Insert,G': genmini({all: false}); break;

        //16 June 2022, removed, do all F 11 handling ourselves
        //case 'F 11 ': handleF 11("down"); break;  // chrome gets down when entering fs, and up on both enter and leave fs
        default:
            handled = false;
            //log("unhandled key", kkk);
            break;
    }
    return handled;
}

/** get key from an event
 * Compatible with our older _keyname() function (as below)
 * We have kept a few odd features of the old function,
 * but mostly changed code to match the evt.key style.
 *
 * We may change more code later to use evt.key directly, and phase out getkey.
 */
function getkey(evt) {
    let ff = evt.key;

    if (ff === 'Control') ff = 'ctrl';
    if (ff === 'Alt') ff = 'alt';
    if (ff === 'Shift') ff = 'shift';
    if (evt.code.startsWith('Key')) return evt.code[3];
    if (ff.length === 1 && 'a' <= ff && ff <= 'z') ff = ff.toUpperCase();
    return ff;
}

/** keep these around for now, renamed with _ */
var _keymap = {
    8: "backspace", 9: "tab", 13: "enter", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause/break",
    20: "caps lock", 27: "escape", 33: "PageUp", 34: "PageDown", 35: "end", 36: "home", 37: "ArrowLeft",
    38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 45: "insert", 46: "delete", 91: "left window",
    92: "right window", 93: "select key", 96: "numpad 0", 97: "numpad 1", 98: "numpad 2", 99: "numpad 3",
    100: "numpad 4", 101: "numpad 5", 102: "numpad 6", 103: "numpad 7", 104: "numpad 8", 105: "numpad 9",
    106: "multiply", 107: "add", 109: "subtract", 110: "decimal point", 111: "divide", 112: "F1", 113: "F2",
    114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11",
    123: "F12", 144: "num lock", 145: "scroll lock", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".",
    191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 32: "space"
    // 222: "#", # uk ' us?
};

(function () {
    for (var i = 65; i <= 90; i++) _keymap[i] = String.fromCharCode(i);
    for (i = 48; i <= 57; i++) _keymap[i] = String.fromCharCode(i);
})();

function _keyname(k) {
    if (_keymap[k]) return _keymap[k];
    return '#' + k;
}


// 17 ctrl => Control (left)
// 91 left window => Meta
// 18 alt => Alt (left alt)

// 32 space =>   ??? ' '

// 18 alt => AltGraph (right alt gr)
//                    (fn no record)
//
// 93 select key => ContextMenu
// 17 ctrl => Control (right)



// 92 right window =>

// 144 num lock => NumLock
// !!! no numpad events firing !!!???
// 20 caps lock => CapsLock

// print screen no fire
// 145 scroll lock => ScrollLock
// 19 pause/break => Pause
//



/** find free keys for given modifier (eg 'alt,'), also set keys into gui */
function _dokeys(mod = '') {

    let tx = runkeys.toString();
    tx += dockeydowninner.toString();

    const set = {};
    const h = [''];  // html
    // special cases in tracketc() in anim.ts
    const lines = tx.split('\n');
    for (const line of lines) {
        const comment = line.post('//') || ('~~~ ' + line);
        const x = line.pre('//').trim().split('case ');
        if (x.shift() !== '') {
            // console.error('??? parse in _dokeys', line)
            continue;
        }
        for (const k of x) {
            const s = k.pre("':");
            if (s.length < 25) {
                if (set[s]) {
                    console.error('duplicate key', s);
                } else {
                    set[s] = comment;
                    h.push(`<div class="key")><div class="keystring">${s}'</div><div class="keycomment">${comment}</div></div>`);
                }
            }
        }
    }

    h.push('');
    W.xset = set;
    W.keysgui.innerHTML = h.join('\n');

    var fset = [];
    var xfset = new Set();
    for (let k in _keymap) {
        if (!Object.prototype.hasOwnProperty.call(set, mod + _keymap[k])) fset.push(_keymap[k]);
    }
    return fset;
}
_dokeys();  // so gui set up

function toggleInput(input) {
    if (input.id) input = input.id;
    inputs[input] = W[input].checked = !W[input].checked;
    if (W[input].onchange)
        W[input].onchange(undefined);
}

/** operate on a click on the key part of gui */
function keyclick(e) {
    let targ = e.target;
    let text = targ.innerText;
    if (text[0] !== "'") text = targ.previousSibling.innerText;
    const key = text.replace(/'/g, "");
    runkeys(key);
}