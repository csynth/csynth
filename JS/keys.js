'use strict';

// main code for handling keys for both document and canvas
var W, inputs, lastDispobj, showScaleVariants, newmain, processFile, CSynth, toggleSCLog, VH, msgfix,
onfrmae, NODO, oldlayerX, oldlayerY, height, camera, renderObj, setInput, ml, Maestro, pick,
startKeystone, onframe, dragObj, canvas, V, vrresetall, vrresting, inedit, currentpick,
saveundo, editobj, findMatop, trysetele, animStep, stepeleval, keysdown, handleF11, killev,
Director, frameSaver, saven, keyname, restoreExtra, clearObjzoom, editgenex, editgeney,
hornhighlight, renderObjs, renderQuad, kinectJupDyn, lastdocx, lastdocy, resetMat, currentGenes,
springs, dotty, usewireframe, msgtrack, renderVR, renderObjsInner, snap, test2, usemask,
refall, randobj, allunit, mousewhich, stopSC, running, isNode, xwin, nwwin, lastvps,

mutate, randrule, scale, setSize, toggleFix, toggleShare, log, getserveroao, inputsanimsave,
FrameSaver, fileChooser, openfiles, saveSnap, copygenestoclip, clipboard, pastecliptogenes,
save, showControls, loadOao, FractEVO, resize, getWebGalByNum, setshowstats, stats,
updateGuiGenes, remakeShaders,  regenHornShader, setGUITranrule, reloadAllSynths, fadeOut,
setMasterVolume, undo, toTargetNow, setViewports, savebig, saveimage, saveimage1, saveimage1high,
brusselsNoAuto, autostep, qget, setInputg, simclick, runcommandphp, msgfixlog, camset, setImposterGUI,

dockeydown, keymap, loadVariants, refts, loadVariant, copyFrom, vtarget, viveAnim, DispobjC, fitCanvasToWindow, customSettings,
S, rot, applyMatop, G, nomess, loadopen, Tracker, startscript, centrescalenow,
flatten, format, runTimedScript, lastTouchedDispobj, location, debugKey, setHolo, Holo, GX, makevr, tadpoleSystem, cMap, renderer;

var extrakeys = {}; // var for sharing
canvkeydown.onup = [];      // handle 'undo' for certain key combinations
function setExtraKey(key, msg, fun) {
    const k = extrakeys[key] = fun;
    k.extraname = msg;
}

function canvkeydown(kkk, ff, evt) {

    newmain();      // so animation gets going for 'game' keys even if not animating/autorotating
    var handled = true;
    var doNewmainIfHandled = true;
    var qq;

    if (extrakeys[kkk] && !evt.repeat) {
        extrakeys[kkk]();
    } else

    switch(kkk) {
        case 'ctrl,X': saveSnap(); break;       // save .oao snapshot of current situation
        case 'ctrl,C': copygenestoclip(); break;    // copy genes to clipboard
        case 'C':   // copy genes FROM main view to last clicked slot
            copyFrom(lastTouchedDispobj.genes, currentGenes);
            lastTouchedDispobj.needsRender=10;
            break;
        case 'V':  // show scale variants for given slot
            showScaleVariants(lastDispobj); return true;
            //break;
        case 'space': // toggle mutator style animation
        case 'pause/break':  // toggle mutator styleanimation
            setInput(W.doAnim, W.doAnim.checked = !W.doAnim.checked);
            if (inputs.doAnim && inputs.animSpeed === 0)
                setInput(W.animSpeed, 0.4);
            return true;
            //break;
        case 'scroll lock':  // toggle autorotation
        case 'A':    // toggle autorotation
            setInput(W.doAutorot, W.doAutorot.checked = !W.doAutorot.checked);
            return true;
            //break;
        case 'alt,S': CSynth.defaultSprings(); break;  // load csynth default springs
        case 'alt,shift,S': CSynth.defaultSprings(); customSettings(); updateGuiGenes(); break;  // load csynth default springs
        case 'O': CSynth.orient(); break;   // reorient for CSynth
        case 'shift,O': CSynth.bedorient(); break;  // orient bed for CSynth
        case 'S': processFile(startscript); break;  // load csynth default springs
        case 'D': springs.settleHistory(); break;  // kill velocity of spring particles, dynamics keep going
        case 'G': springs.gotoParticle(); break; // centre on selected particle
        case "shift,#222": toggleSCLog();  // shift, # is ~, toggle display of super collider log
            break;
        case 'shift,P': if (VH) VH.positionGUI(); break;  // position csynth gui
        case 'shift,0':  // zoom main vp,
        case 'shift,1':  // zoom main vp,
        case 'shift,2':  // zoom main vp
        case 'shift,3':  // zoom main vp
        case 'shift,4':  // zoom main vp
        case 'shift,5':  // zoom main vp
        case 'shift,6':  // zoom main vp
        case 'shift,7':  // zoom main vp
        case 'shift,8':  // zoom main vp
        case 'shift,9':  // zoom main vp
            doNewmainIfHandled = false;
            var dispobj = lastDispobj;
            if (dispobj === NODO) return true;
            if (evt.repeat) break;
            var s = ff === 'P' ? 80 : Math.pow(2, +ff/2);
            msgfix('zoom', s);

            canvkeydown.save = {doAnim: inputs.doAnim, doAutorot: inputs.doAutorot };
            setInput(W.doAnim, false);
            setInput(W.doAutorot, false);

            var x = oldlayerX-dispobj.left-dispobj.width/s/2;
            var y = dispobj.height-(height-oldlayerY-dispobj.bottom)-dispobj.height/s/2;
            camera.setViewOffset(dispobj.width, dispobj.height, x, y,
                dispobj.width/s,dispobj.height/s);

            canvkeydown.onup.push(() => {
                camera.clearViewOffset();  // setViewOffset(dispobj.width, dispobj.height, 0,0, dispobj.width, dispobj.height);
                setInput(W.doAnim, canvkeydown.save.doAnim);
                setInput(W.doAutorot, canvkeydown.save.doAutorot);
                delete canvkeydown.save;
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
            if (ml.capturingTime) break;  // do not allow this while capturing
            DispobjC.zoom = Math.pow(2, +ff/2);
            msgfix('zoom', DispobjC.zoom);
            break;
        case 'ctrl,alt,0':  // # renderRatio 1
        case 'ctrl,alt,1':  // # renderRatio 1/4 (16x aa)
        case 'ctrl,alt,2':  // # renderRatio 1/3 (9xaa)
        case 'ctrl,alt,3':  // # renderRatio 1/2 (4xaa)
        case 'ctrl,alt,4':  // # renderRatio 0.707 (2xaa)
        case 'ctrl,alt,5':  // # renderRatio 1
        case 'ctrl,alt,6':  // # renderRatio 1.414
        case 'ctrl,alt,7':  // # renderRatio 2
        case 'ctrl,alt,8':  // # renderRatio 3
        case 'ctrl,alt,9':  // # renderRatio 4
            var rrs = [1, 1/4, 1/3, 1/2, Math.sqrt(1/2), 1, Math.sqrt(2), 2, 3, 4];
            // setInput(W.renderRatioUi, Math.pow(2, ff-5));
            setInput(W.renderRatioUi, rrs[+ff]);
            msgfix('renderRatio', '$renderRatioUi');
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
        case 'Q':  //pick and display what part of object identified; relies on repeat key to update
            //onframe( function() { pick(lastDispobj, oldlayerX, oldlayerY); });
            // nb -1 not appropriate for CSynth ... should be 4, check if still used in CSynth
            Maestro.on('postframe', function() { pick(lastDispobj, oldlayerX, oldlayerY,0,-1); }, {}, true);
            return true;
            //break;
        case 'Z': runTimedScript.next(); break; // move to next fixed point in script
        case 'shift,Z': runTimedScript.interrupt(); break; // interrupt script
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

        case 'K,T': CSynth.twist({sc:G.backboneScale * springs.numInstances**(1/3)}); break;   // set spring positions to twisted helix on torus
        case 'K,Q': CSynth.twist({sc:G.backboneScale * springs.numInstances**(1/3), r: 0.05, n: springs.numInstances/10}); break; // set springs with chirality
        case 'K,C': CSynth.circle({sc:G.backboneScale * springs.numInstances**(1/3)}); break;  // set spring positions to circle
        case 'K,R': CSynth.randpos(G.backboneScale * 3); break;     // set random positions
        case 'K,N': tadpoleSystem.remakePositions(); break;         // set tadpole random grid posistions
        case 'K,H': loadopen(); break;                               //# set spring positions to helix
        case 'K,S': CSynth.hilbert(G.backboneScale * 4); break;     // set springs positions to speace filling (Hilbert) curve
        case 'K,;': springs.rotatePositions(); break;               // rotate all particles about their centroid
        case 'K,#222': springs.reCentre(); break;                     // K,# centre all particles based on their centroid
        case 'K,W': cMap.toggle(); break;                           // toggle wall type

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
        // case 'B ': case 'C ': case 'T ': case 'O ': case 'S ': case 'G ': case 'R ': case 'A ': case 'F ': case 'W ': case 'alt,S ':
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
                    editobj(kkk);
                findMatop(evt);  // things have changed, so repeat this test
            });
            return true;
            //break;
        case 'ctrl,right arrow':  // perform single animation step (??? panning instead ???)
            animStep(false);
            trysetele("doAnim", "checked", false);
            break;
        case 'ctrl,left arrow':  // perform single animation step backwards (??? panning instead ???)
            animStep(true);
            trysetele("doAnim", "checked", false);
            break;
        case 'shift,.': // increase animation speed
            stepeleval(W.animSpeed, 1);
            break;
        case 'shift,,':  // decrease animation speed
            stepeleval(W.animSpeed, -1);
            break;
        case 'alt,home':  // set lots of things to unit transforms (not always useful)
            allunit();
            break;
        case 'shift,home':  // go to centre
            G._camx = G._camy = G._camz = 0; G._fov = 100;
            break;
        case 'ctrl,home':  // reset orientation of object
            resetMat("all", currentGenes);
            setInput(W.grot, 0);
            return true;
            //break;
        case 'home':    // reset scale of object
            var op = findMatop(evt);
            if (mousewhich === 0 && keysdown.length === 0) op = undefined;
            centrescalenow();
            resetMat(op);
            if (CSynth.autoscale) CSynth.autoscale();
            return true;
            //break;
        case 'end': GX.normalizeRange(); break; // normalize the range of hovered GUI item
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

        // note do NOT use pure arrows, they are used in game mode
        case 'alt,right arrow': Director.step(1); break;  // director step frame forward
        case 'alt,left arrow': Director.step(-1); break;  // director step frame backwards
        case 'shift,right arrow': Director.step(10); break;  // director step frame forward 10 frames
        case 'shift,left arrow': Director.step(-10); break;  // director step frame backward 10 frames
        case '#222': test2(); break;  // '#':

        case 'ctrl,alt,up arrow': applyMatop(1,2, -Math.PI/2, rot); break; // rotate front up 90 <>
        case 'ctrl,alt,down arrow': applyMatop(1,2, Math.PI/2, rot); break; // rotate front down 90 <>
        case 'ctrl,alt,left arrow': applyMatop(2,0, -Math.PI/2, rot); break; // rotate front left 90 <>
        case 'ctrl,alt,right arrow': applyMatop(2,0, Math.PI/2, rot); break; // rotate front right 90 <>
        case 'ctrl,alt,page up': applyMatop(0,1, -Math.PI/2, rot); break; // rotate clockwise 90 <>
        case 'ctrl,alt,page down': applyMatop(0,1, Math.PI/2, rot); break; // rotate anitclockwise 90 <>

        case 'ctrl,alt,shift,up arrow': applyMatop(1,2, -Math.PI/6, rot); break; // rotate front up 30 <>
        case 'ctrl,alt,shift,down arrow': applyMatop(1,2, Math.PI/6, rot); break; // rotate front down 30 <>
        case 'ctrl,alt,shift,left arrow': applyMatop(2,0, -Math.PI/6, rot); break; // rotate front left 30 <>
        case 'ctrl,alt,shift,right arrow': applyMatop(2,0, Math.PI/6, rot); break; // rotate front right 30 <>
        case 'ctrl,alt,shift,page up': applyMatop(0,1, -Math.PI/6, rot); break; // rotate clockwise 30 <>
        case 'ctrl,alt,shift,page down': applyMatop(0,1, Math.PI/6, rot); break; // rotate anitclockwise 30 <>

        case 'ctrl,alt,C,up arrow': applyMatop(1,999, -1, flatten); break; // mirror up/down <>
        case 'ctrl,alt,C,down arrow': applyMatop(1,999, -1, flatten); break; // mirror up/down <>
        case 'ctrl,alt,C,left arrow': applyMatop(0,999, -1, flatten); break; // mirror left/right <>
        case 'ctrl,alt,C,right arrow': applyMatop(0,999, -1, flatten); break; // mirror left/right <>
        case 'ctrl,alt,C,page up': applyMatop(2,999, -1, flatten); break; // mirror front/back <>
        case 'ctrl,alt,C,page down': applyMatop(2,999, -1, flatten); break; // mirror front/back <>

        case 'ctrl,alt,home': // 'front' view with z up  <>
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
        case 'ctrl,1': usemask=1; msgtrack('usemask'); break;  // set usemask 1 (technical)
        case 'ctrl,2': usemask=2; msgtrack('usemask'); break;  // set usemask 2 (technical)
        case 'ctrl,3': usemask=3; msgtrack('usemask'); break;  // set usemask 3 (technical)
        case 'ctrl,4': usemask=4; msgtrack('usemask'); break;  // set usemask 4 (technical)
        // ca se 'ctrl,-': usemask=-1; msgtrack('usemask'); break;  // set usemask -1 (technical)
        case 'ctrl,R': refall(); break;   // refresh all
        case 'ctrl,alt,R': randobj(); break;  // make random object (broken???)
        case 'ctrl,D':  // cycle display mode, solid, dots, lines
            if (dotty) { dotty = false; usewireframe = true; msgfixlog('render', 'wireframe')}
            else if (usewireframe) { dotty = false; usewireframe = false; msgfixlog('render', 'full')}
            else { dotty = true; usewireframe = false;  msgfixlog('render', 'dotty')}
            newmain();
            break;
        case 'shift,V': camset(); break; // random camera view

        case 'ctrl,N': currentGenes.latenormals = currentGenes.latenormals ? 0 : 1; msgtrack('latenormals'); break;  // toggle latenormals (technical)
        case 'alt,V': case 'alt,3':   // fiddly with renderVR/renderObjsInner (technical)
            renderObjs = renderObjs === renderVR ? renderObjsInner : renderVR;  msgfix('renderVR', renderObjs === renderVR); break;
        case 'ctrl,alt,V': renderVR.fs(true); break;  // go to VR (but use F2/F6?) (technical)
        case 'ctrl,shift,alt,V': renderVR.fs(false); break;  // leave VR (use F4) (technical)
        case 'alt,shift,4': renderObjs = renderObjs === renderQuad ? renderObjsInner : renderQuad; msgfix('renderQuad', renderObjs === renderQuad); break;
        case 'ctrl,W': case 'alt,W':  {// kinect extra mouse mode (???broken???)
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
            qq = window.location.href.indexOf('?') === -1 ? '?' : '';
            window.location.href += qq + ";appToUse='Texture';"
            break;
        case 'T,F':  // open fano
            qq = window.location.href.indexOf('?') === -1 ? '?' : '';
            window.location.href += qq + ";appToUse='Fano';"
            break;
        case 'T,J':  // open Julia
            qq = window.location.href.indexOf('?') === -1 ? '?' : '';
            window.location.href += qq + ";appToUse='Julia';"
            break;
        case 'T,H':  // open Horn
            qq = window.location.href.indexOf('?') === -1 ? '?' : '';
            window.location.href += qq + ";appToUse='Horn';"
            break;
        case 'T,S':  // open ImplicitShape
            qq = window.location.href.indexOf('?') === -1 ? '?' : '';
            window.location.href += qq + ";appToUse='ImplicitShape';"
            break;
        case 'M,1':  CSynth.setMarkerFromSelection(0); break; // set marker 0 or marker pair 0,1
        case 'M,2':  CSynth.setMarkerFromSelection(1); break; // set marker 1 or marker pair 1,2
        case 'M,3':  CSynth.setMarkerFromSelection(2); break; // set marker 2 or marker pair 2,3
        case 'M,4':  CSynth.setMarkerFromSelection(3); break; // set marker 3 or marker pair 3,4
        case 'M,5':  CSynth.setMarkerFromSelection(4); break; // set marker 4 or marker pair 4,5
        case 'M,6':  CSynth.setMarkerFromSelection(5); break; // set marker 5 or marker pair 5,6
        case 'M,7':  CSynth.setMarkerFromSelection(6); break; // set marker 6 or marker pair 6,7
        case 'M,8':  CSynth.setMarkerFromSelection(7); break; // set marker 7 or marker pair 7,8
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


        case 'alt,A': Director.toggle(); break; // toggle Director on/off
        case 'shift,A': Director.toggle(true); break;  // Director on
        case 'alt,shift,A': Director.record(); break; // Director record
        case 'ctrl,alt,shift,A': Director.record(true); frameSaver.quickout= true; break;  // Director record with quickstart
        case 'ctrl,A': Director.prepLinear(); break; // Director prepare linear animation form current main object

        case '/': saven(); break;   // save state with unique name
        case '\\': break;  // reserved for 4d rotation
        case '8,\\':  // toggle PIXELS for feedback (technical)
            setInput(W.PIXELS, !inputs.PIXELS); msgfix("pixels", inputs.PIXELS);
            break;

        case 'delete':   // piste step: simulate vr controller right click
            simclick();
            break;
        case 'ctrl,delete':   // delete current object
            simclick('lefttrigger');
            break;
        case 'insert':   // piste step: simulate vr controller left click
            simclick('lefttrigger');
            break;
        case 'ctrl,insert':   // quick load curated
            copyFrom(vtarget, loadVariant(-1, 200));
            viveAnim.time = 200;
            break;
        case 'T,P':  // try to get focus/performance back
            makevr();  // for some reason this joggles things and helps with performance
            break;
        case 'T,V':  loadVariants(); break; // load variants
        case 'I': CSynth.showPickDist(); break; // show pick distances
        case 'shift,I':   // toggle pick distance mode
            if (canvkeydown.pickregid) {
                Maestro.remove('postframe', canvkeydown.pickregid);
                canvkeydown.pickregid = undefined;
            } else {
                nomess('release');
                canvkeydown.pickregid = Maestro.on('postframe', CSynth.showPickDist);
            }
            break;
        case 'L': setHolo(); break;
        case ';': Holo.rot ^= true; msgfix('holoCam', Holo.rot ? 'old rotation' : 'skewed offset'); break;
        case 'E': GX.html(); break;  // bring up edit box for GX style gui
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
}

function canvkeyup(evt) {
    canvkeydown.onup.forEach(f => f());     // cancel anything outstanding
    canvkeydown.onup = [];

    var ff = keyname(evt.keyCode);

    var i = keysdown.indexOf(ff);
    if (i !== -1) keysdown.splice(i,1);
    findMatop(evt); // refresh feedback about manipulation operation
    switch (ff) {
        case  'F11': handleF11("up"); break;  // keyup on exit full screen
        case 'V': restoreExtra(); return killev(evt);
        case 'alt': return killev(evt);
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
            if (keysdown[0] === 'ctrl') {
                DispobjC.olx = oldlayerX
                DispobjC.oly = oldlayerY;
                return;
            }
            if (keysdown.length !== 0) break;  // do not get confused, eg after alt-p
            clearObjzoom();  // probably not needed as done immediately after zoom render33
            if (lastDispobj !== NODO) lastDispobj.render(); newmain(); onframe(newmain);
            DispobjC.zoom = 0;
            DispobjC.olx = DispobjC.oly = undefined;
            msgfix('zoom');
            break;
    }
    currentpick = "";
    editgenex = undefined;
    inedit = false;
    findMatop(evt);
    msgfix('hit'); hornhighlight = '';
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
        case 'alt,F3': case 'F3': mutate(); break;  //# mutate
        // case 'F4 ': randrulemutate(); break;        //# mutate, including structure mutation, currently not supported
        // case 'alt,left window,R': setInput(W.NOMESS, !inputs.NOMESS); break;
        case 'alt,left window,Q': setInput(W.NOMESS, !inputs.NOMESS); break;
        //  window.location.href += '' // another way to resart
        case 'F5': if (xwin) xwin.restart(); else if (nwwin) nwwin.reload(); else handled = false; break; //# reload
        case 'ctrl,F5': if (xwin) xwin.restart(true); else if (nwwin) nwwin.reloadIgnoringCache(); else handled = false; break;  //# reload, ignoring cache
        case 'shift,F5': {  //# reload with current object
            let h = location.href;
            if (!h.includes('?')) h += '?';
            h += `;startobj="${currentGenes.name}"`;
            location.href = h;
            break;
        }

        case 'shift,F4': randrule(); break;  //# generate random rule change
        // case 'F6 ': reformRule(); break;        //# reform rule
        case 'F7': /*if (!repeat)*/ scale(currentGenes); break; // repeat wrong because of canvkeydown  //# scale current object (? obsolete version ?)
        case 'F8': setSize(); break;  //# set size to screen
        case 'shift,F8': setSize(1280, 720); break;  //# set size to 1280x720
        case 'F9': toggleFix(); break;    //# toggle whether
        case 'F10': toggleShare(); break;    //# toggle whether sharing session
        case 'F11': if (nwwin) {  // toggle fullscreen

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
            } else handled = false;
            break;
        case 'ctrl,shift,W': getserveroao("files/web.oao"); break;

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


            frameSaver.type = "buffer";
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
            renderVR.fs(true);
            break;
        case 'ctrl,O': // open files
            W.fileDialog.onclick = function (evtp) { this.value = null; }
            W.fileDialog.onchange = function (evtp) {
                openfiles(evtp.target.files);
            }
            W.fileDialog.click();
            break;
        case 'ctrl,shift,O':  // reopen last opened files (from drop or ctrl,o)
            openfiles();
            break;
        case 'ctrl,shift,V': if (clipboard) pastecliptogenes(); else handled = false; break;
        // case 'ctrl,V'  // LEAVE THIS TO ONPASTE
        case 'ctrl,S': save(); break;
        case 'alt,.': springs.start(); break;
        case 'alt,,': springs.stop(); break;
        case 'alt,F': trysetele("fixcontrols", 'checked', !W.fixcontrols.checked); resize(); showControls(W.fixcontrols.checked); break;
        case 'alt,G': trysetele("showgrid", 'checked', !W.showgrid.checked); W.showgrid.onchange(undefined); break;
        case 'ctrl,L':  // load most recent used item, no view change
        case 'alt,L':  // load most recent used item, view change
            loadOao(W.savename.value);
            break;
        case 'alt,C': showControls("toggle"); break;
        case 'alt,E': FractEVO.startEvolving(); break;
        case 'alt,shift,E': FractEVO.scorePopulation(); FractEVO.watchExe(); break;
        case 'ctrl,shift,L':  // load most recent item in gallery, no view change
        case 'alt,shift,L':  // load most recent item in gallery, view change
            loadOao(getWebGalByNum(0).name);
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
        case 'ctrl,/':
            randobj(currentGenes, false, 'pulse', true);
            updateGuiGenes();
            break;
        case 'ctrl,M':
            console.log("ctrl,m hit >>>>>>>>>>>");
            remakeShaders(true);
            break;
        case 'ctrl,alt,M':
            refts();
            break;
        case 'ctrl,shift,M':
            msgfix('regen horn shaders', '<span class="errmsg">regen horn and rebuilding shader</span>');
            onframe( () => msgfix('regen horn shaders'), 2 );
            console.log("ctrl,shift,m hit >>>>>>>>>>>");
            // baseShaderChanged();  done in getShaders()
            regenHornShader();
            break;
        case 'alt,D': toggleInput(W.showdirectorrules); break;          //# toggle director rules. PJT: conflicts with standard browser shortcut.
        case 'alt,R': toggleInput(W.showrules); break;                  //# toggle tranrules
        case 'alt,N': toggleInput(W.NOMESS); break;                     //# toggle nomess (message box, etc)
        case 'alt,O': toggleInput(W.showuiover); break;                 //# toggle gui overlay
        case 'alt,shift,N': nomess('release'); msgfix.all = true; break;//# force nomess('release') and all messages
        case 'alt,H': toggleInput(W.showhtmlrules); break;              //# toggle html rules
        case 'ctrl,H': loadopen(); break;                               //# load open helix
        case 'alt,shift,R': setGUITranrule(); break;
        case 'ctrl,shift,1': reloadAllSynths(); break;
        case 'ctrl,shift,2': fadeOut(1); break;
        case 'alt,M': if (setMasterVolume) setMasterVolume(-80); break; //# setMasterVolume
        // ca se 'ct rl, Z': undo(); break;
        case 'alt,T': toTargetNow(); break;
        case 'F2': case 'F6': log('f2/f6 seen for forcevr zzz'); renderVR.fs(true); break;  // special for odd sendKeys
        case 'F4': case 'shift,F2':
            renderVR.fs(false);
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
        case '#223': case '`': savebig(); break;  // save current frame, #223 is backquote
        case 'ctrl,I': saveimage(); break;  // save image of layout
        case 'alt,I': setImposterGUI(); break;  // toggle imposter
        case 'ctrl,alt,I': saveimage1(); break; // save image of central object
        case 'ctrl,shift,I': saveimage1high(); break; // save image of central object, high quality
        case 'alt,0': setViewports([0,0]); break; // single viewport
        case 'alt,-': setViewports(lastvps); break; // switch to last viewports
        case 'alt,1': setInput(W.layoutbox, 0); setViewports([4,3]); break; // 12 viewports
        case 'alt,8': setInput(W.layoutbox, 2); setViewports([8,8]); break; // 64 viewports
        case 'ctrl,alt,shift,Z': brusselsNoAuto = !brusselsNoAuto; autostep(); msgfix("auto interaction", brusselsNoAuto ? 'off' : 'on'); break;  // toggle auto on off
        case 'alt,Q':
            var src = evt.target;
            msgfix('evt', src.id, '/', src.value);
            var name = src.id || src.value;
            if (qget(name) !== undefined) msgfix(name, "$" + name);
            break;
        case 'ctrl,,': setInputg(W.resbaseui, inputs.resbaseui*1-1); msgtrack('resbaseui'); break;
        case 'ctrl,.': setInputg(W.resbaseui, inputs.resbaseui*1+1); msgtrack('resbaseui'); break;
        case 'ctrl,#222': springs.step(); break;
        case 'ctrl,alt,,': setInputg(W.resbaseui, inputs.resbaseui*1-0.1); msgtrack('resbaseui'); break;
        case 'ctrl,alt,.': setInputg(W.resbaseui, inputs.resbaseui*1+0.1); msgtrack('resbaseui'); break;
        case 'ctrl,;': currentGenes.cubicmixuse = currentGenes.cubicmixuse ? 0 : 1; msgtrack('cubicmixuse'); break;
        case 'ctrl,alt,/':
            msgfix('id hit', document.elementFromPoint(lastdocx, lastdocy).id);
            break;
        // ca se ';': if (debugKey) debugKey();

        //case 'F11 ': handleF11("down"); break;  // chrome gets down when entering fs, and up on both enter and leave fs
        default:
            handled = false;
            //log("unhandled key", kkk);
            break;
    }
    return handled;
}

/** find free keys for given modifier (eg 'alt,'), also set keys into gui */
function dokeys(mod = '') {
    let x = canvkeydown.toString();
    x += dockeydowninner.toString();
    // special cases in tracketc() in anim.ts

    x = x.split("case '");
    const set = {};
    let h = [''];  // html
    x.forEach( function(k) {
        const line = k.pre('\n');
        const comment = line.post('//') || 'no comment';
        const s = line.pre("':");
        if (s.length < 25) {
            if (set[s]) {
                console.error('duplicate key', s);
            } else {
                set[s] = comment;
                h.push(`<div class="key")><div class="keystring">'${s}'</div><div class="keycomment">${comment}</div></div>`);
            }
        }
    } );
    h.push('');
    W.xset = set;
    W.keysgui.innerHTML = h.join('\n');

    var fset = [];
    var xfset = new Set();
    for (let k in keymap) {
        if (!Object.prototype.hasOwnProperty.call(set, mod + keymap[k])) fset.push(keymap[k]);
    }
    return fset;
}
dokeys();  // so gui set up

function toggleInput(input) {
    if (input.id) input = input.id;
    inputs[input] = W[input].checked = !W[input].checked;
    if (W[input].onchange)
        W[input].onchange(undefined);
}
