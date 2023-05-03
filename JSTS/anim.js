/*
 * Control animation and graphics details such as scaling
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";
var newframeAnim = 0, newframeNotanim = 0; // stats counters
//  ... typescript not sure how to force geneSpped to be object of unknown properties
var geneSpeed = {}, geneSpeedSave = {}; // for animation
var rotTarget = { dx: 0, dy: 0, dz: 0 };
var rotframenum = 1;
var rollframenum = 1;
var rotDuration = 2;
var rotMaxFrames = 60;
//var global; //thanks to rollup for depending on @types/node this isn't needed, used once for gsetTimeout...
// var cr4; // not really global, but NetBeans diagnosis is wrong/confusing if not declared here.
var tracketclate; // allow tracketc to be moved to end of loop (?better parallelism, ?worse latency)
/** define whether or not we are currently selecting an object for steering towards.
 * This needs a touch-based return true option as well.  <<< TODO
 * */
function isSteeringInteraction() {
    //    return (keysdown.length === 1 && keysdown[0] === '#' && lastDispobj > 0);
    return (mousewhich > 0 && lastDispobj !== "nodispob" && lastDispobj.vn > 0);
}
var wasRecordingWithAnim = false;
function applyDampedRoll() {
    if (rollframenum > rotMaxFrames) {
        rotTarget.dz = EPSILON;
        return;
    }
    var dz = (rotTarget.dz / rollframenum) * rotDuration;
    applyMatop(0, 1, dz, rot);
    rollframenum++;
}
function applyDampedRotation() {
    if (rotframenum > rotMaxFrames) {
        rotTarget.dx = rotTarget.dy = EPSILON;
        return;
    }
    // todo, find out when this happens, wrong touch combination ???
    if (1 * rotTarget.dx === rotTarget.dx)
        rotTarget.dx = 0;
    if (1 * rotTarget.dy === rotTarget.dy)
        rotTarget.dy = 0;
    var dx = (rotTarget.dx / rotframenum) * rotDuration;
    var dy = (rotTarget.dy / rotframenum) * rotDuration;
    applyMatop(0, 2, dx, rot);
    applyMatop(1, 2, dy, rot);
    rotframenum++;
}
/** single animation step, usually according to all free genes and inputs.animSpeed, but genes and speedmay be specified */
var animStep = function animStepF(rev = inputs.doAnimRev, tomutate = genedefs, animSpeed = inputs.animSpeed) {
    if (animSpeed === 0)
        return;
    if (sineAnimFrom) {
        sineAnimStep();
    }
    else {
        animSpeed = 0.1 * Math.pow(animSpeed, 3);
        animSpeed *= framedelta / 33;
        if (rev)
            inputs.animSpeed *= -1;
        steerall();
        for (let gn in tomutate) {
            if (gn === 'gscale')
                continue;
            var gdef = genedefs[gn];
            if (!gdef)
                continue;
            var step = gdef.activerate(); // was also * gdef.delta so 0 delta stopped gene animation
            if (step !== 0 && target[gn] === undefined && gdef.free) {
                // check target to stop anim/target fighting
                // this means the jump to target does not keep anim direction
                // but inital jump usually big anyway so doesn't notice
                var v = +currentGenes[gn] + geneSpeed[gn] * animSpeed * gdef.free; // <<< delta doesn't get a look in
                var cspeed = hoverSteerMode ? 0 : -1;
                if (!hoverSteerMode) {
                    if (v > gdef.max) {
                        v = gdef.max;
                        if (geneSpeed[gn] * animSpeed > 0)
                            geneSpeed[gn] *= cspeed;
                    }
                    else if (v < gdef.min) {
                        v = gdef.min;
                        if (geneSpeed[gn] * animSpeed < 0)
                            geneSpeed[gn] *= cspeed;
                    }
                }
                else {
                    // in case forced out of range some other way
                    // eg by Kinect code
                    if (v > gdef.max)
                        v = gdef.max;
                    if (v < gdef.min)
                        v = gdef.min;
                }
                setval(gn, v);
            }
            //currentGenes[gn] = v;
        }
        if (slots)
            slots[mainvp].dispobj.render();
    }
    // framescale(); // moved out of critical time
};
/** play at normal speed */
function animspeedNormal() {
    tryseteleval('animSpeed', 0.5);
    trysetele('doAnim', 'checked', 1);
    newframe();
}
/** rotate at normal speed */
function rotNormal() {
    tryseteleval('grot', 0.2);
    trysetele('doAutorot', 'checked', 1);
    inputs.yzrot = -0.124;
    inputs.xzrot = 0.517;
    tryseteleval("yzrot", inputs.yzrot);
    tryseteleval("xzrot", -inputs.xzrot);
    newframe();
}
//var targetGscale = 1;
//var cammovedd = {dx:0, dy:0 };
//var targetCammovedd  = {dx:0, dy:0 };
var targetAutocam;
var scalehalflife = 5000;
var scalefrequency = 25;
var scalehop = 1;
var nextscale = 0, lastscale = 0;
var preventScale = false;
/** scale/centre the frame, with damping */
function framescale(damp = undefined) {
    if (preventScale)
        return;
    if (searchValues.nohorn)
        return;
    if (inputs.NOCENTRE && inputs.NOSCALE)
        return; // we aren't using the scaling anyway
    if (currentGenes.tranrule && !currentHset.hornhighlight) { // this is horn specific: later to move but use currentGenes.tranrule test for now
        // don't scale if highlight, silly if it is solo on a small part
        /****
        ****/
        //log(framenum, "framedelta p/g", framedelta);
        // split prep/get over two frames marginally improves performance consistency
        // but needs a little more work in case the frames are interrupted by a breed
        // or other operation that uses centrescale.  Todo, arrange at least two buffers.
        // Random value for nextscale makes any performance hit of scaling less regular and so less noticable
        // Added around GVGallery time, possibly no longer relevant
        if (framenum >= nextscale) {
            rangeiprep(currentGenes, "main"); // whether GPUSCALE or not
            lastscale = framenum;
            if (scalefrequency <= 2)
                nextscale = framenum + scalefrequency;
            else
                nextscale = framenum + Math.floor(scalefrequency * (0.5 + Math.random()));
            //log("prep", framenum);
        }
        if (inputs.GPUSCALE) {
            //targetAutocam = true;
            let cr4 = currentGenes._rot4_ele;
            if (tranInteract()) {
                cr4[3] = dodamp(cr4[3], 0, scalehalflife, 'targetAutocam.px');
                cr4[7] = dodamp(cr4[7], 0, scalehalflife, 'targetAutocam.py');
                cr4[11] = dodamp(cr4[11], 0, scalehalflife, 'targetAutocam.pz');
            }
            cr4[15] = 1;
            currentGenes.gscale = 1;
            scaleSmoothGPU("main", damp);
            rot4toGenes();
            newmain();
            return;
        }
        ///// CPU scale below here .....
        if (renderObjHorn.centreOnDisplay) {
            let shop = scalehop > scalefrequency ? scalehop : scalefrequency - 1;
            ;
            if (framenum === lastscale + shop || framenum === 0) {
                //log("get", framenum);
                var t = getcentrescale(currentGenes, "get");
                if (t && !isNaN(t.gscale))
                    targetAutocam = t;
            }
            if (targetAutocam) {
                let rr = targetAutocam;
                msgfix('scale-=>', rr.gscale, [rr.x, rr.y, rr.z]);
                currentGenes.gscale = dodamp(currentGenes.gscale, targetAutocam.gscale, scalehalflife, 'gscale'); //PJT TODO: add control of damp coefficients
                var cc = currentGenes._gcentre;
                if (!cc)
                    cc = currentGenes._gcentre = new THREE.Vector4();
                cc.x = dodamp(cc.x, rr.x, scalehalflife, 'targetAutocam.px');
                cc.y = dodamp(cc.y, rr.y, scalehalflife, 'targetAutocam.py');
                cc.z = dodamp(cc.z, rr.z, scalehalflife, 'targetAutocam.pz');
                msgfix('scale.=>', currentGenes.gscale, cc);
            }
        }
    }
    newmain();
}
/** fix the scale/centre of the frame */
function fixscale() {
    //targetGscale = currentGenes.gscale;
    //targetCammovedd = {dx: 0, dy:0 };
    //cammovedd = {dx: 0, dy:0 };
    var o = currentGenes;
    let cr4 = currentGenes._rot4_ele;
    targetAutocam = { gscale: o.gscale, px: cr4[3], py: cr4[7], pz: cr4[11] };
}
var steerDefer = 20; // so we only apply steer every steerDefer frames
var useaverage = false; // true to use a weighted average rather than 'raw' flying spot coords
/** steer from lastDispobj and from all healthy objects */
function steerall() {
    // accumulate steering amounts
    var usesteer = false;
    var steering = {};
    var pppt; // consider where/how to set this for isSteeringInteraction() and hoverSteerMode
    // steer because of current user steering interaction on lastDispobj (===? hoverTarget)
    if (hoverSteerMode && isSteeringInteraction()) { // sjpt we do NOT want this in main code till more debugging ....
        pppt = 999;
        usesteer = true;
        steer(steering, xxxgenes(lastDispobj), 30000 / healthMutateSettings.currentvpForce, lastDispobj);
        var eo = xxxgenes(lastDispobj);
        // temp patch up <<< removed jumped main objects
        // even when steerall not used
        //!!currentGenes._rot4_ele = clone(xxxgenes(lastDispobj)._rot4_ele);
        //!!currentGenes._camz = xxxgenes(lastDispobj)._camz;
        //!!currentGenes._fov = xxxgenes(lastDispobj)._fov;
        for (let gn in genedefs) {
            if (genedefs[gn].free === 0) { } //currentGenes[gn] = eo[gn];
        }
    }
    // steer because of health.
    // Will want a threshold so only steer towards healthy objects
    // and maybe steer away from unhealthy ones.
    // e.g. have a simple function of hoverHealth
    // if (hoverMutateMode && hoverSteerMode) {
    if (hoverSteerMode) {
        pppt = 0;
        usesteer = true;
        for (let o in currentObjects) {
            var dispobj = currentObjects[o];
            if (dispobj.selected && dispobj.vn !== mainvp) {
                var hh = dispobj.hoverHealth !== undefined ? dispobj.hoverHealth : 1;
                if (hh !== 0) {
                    if ((dispobj.vn + framenum) % steerDefer === 0)
                        dispobj.ppp = steer(steering, dispobj.genes, steerDefer * hh / healthMutateSettings.currentvpForce, dispobj.vn);
                    pppt += dispobj.ppp;
                }
            }
            else {
                dispobj.ppp = 0; // not being used
            }
        }
        // rescale ppp to pppr and display (for debug)
        var mmm = "";
        for (let o in currentObjects) {
            let dispobji = currentObjects[o];
            dispobji.pppr = dispobji.ppp / pppt;
            if (dispobji.pppr)
                mmm += " " + format(dispobji.pppr, 3);
        }
        msgfix("hoverSteer", mmm);
    }
    if (usesteer && pppt !== 0) {
        // and apply the accumulated steering: very quick if there wasn't any
        for (let gn in steering) {
            if (!isNaN(steering[gn]))
                geneSpeed[gn] = steerdamp * geneSpeed[gn] + steering[gn] / pppt;
            //serious("todo, check what to do with geneSpeedSave");
        }
        normalizeGeneSpeed(); // but NOT quick and so only do if needed
        if (hoverSteerMode && useaverage)
            makeaverage();
    }
}
/** make currentgenes from weighted averages */
function makeaverage() {
    var pppt = 0;
    for (let o in currentObjects)
        if (currentObjects[o].genes)
            pppt += currentObjects[o].ppp;
    var genes = {};
    for (let gn in currentGenes)
        genes[gn] = 0;
    //var mmm = "";
    for (let o in currentObjects) {
        var dispobj = currentObjects[o];
        if (!dispobj.genes)
            continue;
        dispobj.pppr = dispobj.ppp / pppt;
        //mmm += " " + format(dispobj.pppr,3);
        for (let gn in genes) {
            var v = dispobj.genes[gn] * dispobj.pppr;
            if (isNaN(v))
                delete genes[gn];
            else
                genes[gn] += v;
        }
        // dispobj.needsPaint = true;  // ????
    }
    genestoRot4(genes);
    copyFrom(currentGenes, genes);
    newmain();
    //msgfix("avg", mmm);
}
function normalizeGeneSpeed() {
    // normalize geneSpeed
    var ss = geneVectorLength(geneSpeed);
    ss = 1 / ss;
    ss = genespeeddamp + (1 - genespeeddamp) * ss;
    for (let gn in geneSpeed) {
        if (!isNaN(geneSpeed[gn]))
            geneSpeed[gn] *= ss;
    }
}
var genespeeddamp = 0.97; // damps the genespeed normalization
var steerdamp = 0.9; // damps the move from current direction to steered direction
var distpow = -1; // power function falloff in distance
var steerstrength = 5; // strength of steering (steerdamp must be almost the same in different units?)
var steerclose = 1; // if we get this close (in normalized space) do not steer at all
var hoverSteerMode = false; // if hovermutate, do we also use the objects for steering
/** steer direction towards object, accumulate values into 'steering', level is strength of steering
return the strength used here
*/
function steer(steering, genes, level, vn) {
    //console.log("steer fn=" + framenum + " vn=" + vn);
    // work out dist in min/max normalized space
    // note: geneSpeed is initialized in min/max normalized space
    // CURRENTLY INCORRECT, NaN result
    var dist = geneDist(genes, currentGenes);
    // the differences already have a distance built in
    // so we use distpow-1 to compensate for that.
    // eg disppow=0 will give a dist**-1, which will cancel out the implicit dist.
    var ppp = level * Math.pow(dist, distpow - 1) * steerstrength;
    if (dist < steerclose)
        return ppp;
    if (isNaN(ppp))
        serious("bad ppp computed");
    if (ppp === 0 || isNaN(ppp))
        return ppp;
    for (let gn in currentGenes) {
        // note to consider: when this was wrong way round, very interesting animations
        var d = genes[gn] - currentGenes[gn];
        if (isNaN(d)) {
            //console.log("nan for " + gn);
        }
        else if (genedefs[gn] && genedefs[gn].free !== 0) {
            if (steering[gn] === undefined)
                steering[gn] = 0;
            steering[gn] += d * ppp;
            // test for keeping up speed
            // todo modify d by length
            //d = (d > 0 ? 1 : -1) * genedefs[gn].delta;
        }
    }
    return ppp;
}
var framenum = 0, debugframenum = 0, frametime = 0, framedelta = 0, framedeltasmooth = 0, framedeltahalflife = 500;
var debugframedelta = [], debugframedeltasize = 100; // for perf tests, time between start of js for each frame
var debugframecpu = []; // time in js for frame
var debugframedeltabig = []; // log of oversize debugframedelta
var inAnimate = false; // flag to defer processNewframe() to end of animate cycle
var nogl; // usually undefined, used to 'hide' gl and make sure it is only used during callbacks, not used if gl = renderer.context = nogl; commented out below
var alwaysNewframe = 100; // set to number to keep goingfor number frames even with no anim or rotation
//  nogl = renderer.xcontext    may be set to help debug, not needed if gl = renderer.context = nogl; commented out below
// 'older' animate use as control strucutre
var animate = { readwidth: 8, readbuffer: new Uint8Array(32), frametime: [] };
/**
 * callback whether or not in XR
 * @param time: number
 * @param frame: XRFrame XR frame (not used directly yet, rely on three.js XR support)
 */
async function animateNum(time, frame) {
    const now = time;
    const perfnow = performance.now();
    myRequestAnimationFrame.wanted = 0; // only allow once per frame
    if (_ininit)
        return; //
    inAnimate = true;
    if (inputs.doAnim || alwaysNewframe)
        myRequestAnimationFrame(); // do asap: set as nop() for XR
    if (alwaysNewframe) {
        if (alwaysNewframe === true)
            alwaysNewframe = 1e15;
        alwaysNewframe--;
        newmain();
    }
    // Sometimes having the canvas focussed gives performance issues.
    // Not able to track down exactly when.
    // One example is clicking on the dat gui gui with mouse (nonVR),
    // which increases the gp utilzation eg from 40% to 50%
    if (window.canvasBlur)
        canvas.blur();
    for (let i = 0; i < 50; i++) { // loop to help measure separated cpu time, only with testcputimes.running
        if (testcputimes && testcputimes.running === "time")
            consoleTime("animate_" + i);
        if (renderer) {
            gl = renderer.xcontext;
            // if (+THREE.REVISION < 109) renderer.context = gl;
        }
        try {
            inAnimate = true;
            animatee(now);
        }
        catch (e) {
            checkglerror('animtest');
            console.error("Animation error: " + e + e.stackTrace);
            msgfix('Animation error', e.toString(), 'frame', framenum);
            // badshader = "Animation error: " + e; // too fierce to set badshader, transient errors stop processing
        }
        finally {
            inAnimate = false;
        }
        if (!testcputimes || !testcputimes.running)
            break;
        else if (testcputimes && testcputimes.running === "time")
            consoleTimeEnd("animate_" + i);
    }
    inAnimate = true;
    if (newframePending) {
        processNewframe();
        newframeAnim++;
    }
    Maestro.trigger('endframe');
    inAnimate = false;
    // if (renderer) gl = renderer.context = nogl;
    if (WA.testslow)
        await sleep(WA.testslow);
    myDeferredRequestAnimationFrame(); // only do the real request when everything else done
    debugframecpu[debugframenum % debugframedeltasize] = performance.now() - perfnow;
    renderer.xr.enabled = cheatxr && renderer.xr.isPresenting; // force before three.js does initial processing on next frame
} // end animateNum
//XXX: PJT: killing gsetTimeout in the face in Jan2020
//const gsetTimeout = global &&  global.setTimeout;
/** note sjpt: 25/11/2019 requestAnimation Frame has several extra requirements
 * VR
 * ? XR different to VR ... almost all RequestAnimation Frame skipped and three XR callback tp animateNum used
 * detect (?and correct?) attempts to create parallel animation sequences by overzealous calls
 *
 * AFAP option to go as fast as possible, not frame synchronized ... mainly for performance tests
 * ability to keep going even when document not visible (see utils.js, E.keepGoing, XrequestAnimationFrame, etc)
 * ability to stop animation loop when nothing happening
 *
 * nw_sc starving in old nwjs (probably irrelevant now)
 * oddities of Firefoxx debugging (probably irrelevant now)
 *
 * ***/
/** myRequestAnimationFrame defers calls because of oddities of Firefoxx debugging
 * which allowed new requested frames to fire while waiting at a breakpoint.
 * NOT USED FOR XR
 */
var myRequestAnimationFrame = function () {
    myRequestAnimationFrame.wanted++;
    if (!inAnimate && myRequestAnimationFrame.wanted === 1)
        myDeferredRequestAnimationFrame();
};
myRequestAnimationFrame.wanted = 0;
/** myDeferredRequestAnimationFrame wrappers various requestAnimation Frame options: NOT USED FOR XR */
function myDeferredRequestAnimationFrame() {
    const oldFramenum = framenum;
    const animatex = () => animateNum(oldFramenum);
    if (myRequestAnimationFrame.wanted === 0)
        return;
    // NO VR 2/10/2020 let dev = renderer && renderer. vr.get Device();
    //nb PJT got rid of gsetTimeout case.
    // if inputs.AFAP not defined at all then we are not in requestAnimation Frame territory
    if (inputs.AFAP !== false) { // lots of fps not rendered correctly, for timing tests
        setTimeout(animatex, 1);
        // } else if (dev && dev.isPresenting) { // VR case ... NO VR 2/10/2020
        //     // three.js gets away with dev.requestAnimation Frame() even before dev is presenting
        //     // but for us it often failed to trigger as the device was first established before we even tried to enter VR
        //     // so we use standard requestAnimatio nFrame until we really are presenting
        //     //setTimeout(function() {  // more stable timing ?????
        //         dev.requestAnimation Frame(animatex);
        //     //}, 1);
    }
    else { // normal non-webkit case
        WA.XrequestAnimationFrame(animatex);
    }
}
/** deferred requestAnimation Frame, allow other things to happen  */
function requestAnimationFrameD(f, t = 1) {
    //nb PJT got rid of gsetTimeout case.
    const timeoutFn = window.setTimeout;
    timeoutFn(function requestAnimationFrame_defer() { WA.XrequestAnimationFrame(f); }, t);
}
var olddoanim; // to check for change
var perftimes = 0;
var gamespeed = { move: 1, rot: 1 };
function clearerror(evt) {
    badshader = false;
    msgfix('error');
    log('try clearerror recover');
}
var lasthearbeat = 0;
var framespoil = { num: 10, time: 0 }; // spoil every num'th frame, for debug
var longstatlen = 100;
var cheatxrRenderTarget; // passed through layers to renderObj callback; set anyway, used for cheatxr and >= three150
/** standard animation function */
function animatee(now) {
    // three.js sets up renderTarget for XR before this animation callback
    // We need to do other things before 'final' render to XR framebuffer.
    // so we capture this now so we can restore it when needed.
    cheatxrRenderTarget = renderer.getRenderTarget();
    if (framespoil.time && framenum % framespoil.num === 0) { // wate time in a spin loop
        var sss = Date.now();
        while (Date.now() < sss + framespoil.time) { }
    }
    // msgfix("docfocus", document.hasFocus(), document.activeElement.id, document.activeElement.toString());
    newframePending = false;
    if (!running)
        return;
    if (!renderer)
        return;
    if (badshader) {
        // todo no point in repeating this each 'bad' frame, but not much harm either
        msgfix('error', '><br><span class="errmsg" id="errmsg" onmousedown="clearerror(event);">Error, not continuing:<br>'
            + '<span id=errreason>' + badshader + '</span>'
            + '<br>Click here for quick recover, or try ctrl-M for shader errors.</span>');
        // msgfix.force();  // make sure this gets out.  It will at end of frame
        return;
    }
    else {
        msgfix('error');
    }
    // measure frame time at start
    framenum++;
    // if (framenum%2) return; //  made frames regular but very smeary/jerky
    if (framenum < 10)
        log('nextframe+++++++++++++++++++++++++++++++++++', framenum);
    if (framenum < 100)
        animate.frametime[framenum] = Date.now() - loadStartTime;
    framelog('>>>>>>>>>>>>>>>>>>>>>>>>> starting animateee at frame', framenum);
    Maestro.trigger('animateStart');
    if (animate.readbefore)
        readpixtest();
    if (searchValues.heartbeatrate) {
        if (now > lasthearbeat + searchValues.heartbeatrate * 1000 && renderVR.invr()) { // do NOT give a heartbeat if no VR device
            lasthearbeat = now;
            // writetextremote("temp/heartbeat.txt", "at: " + now)
            sclog(new Date().toISOString() + '\n', -1);
        }
    }
    if (framenum % longstatlen === 0) { // measure time over 100 frames
        animate.t100 = (now - animate.last100) / longstatlen; // avg time per frame
        animate.last100 = now;
        animate.fps100 = 1000 / animate.t100;
        animate.cpu100 = getstats(debugframecpu, { short: true }).mean;
        animate.frame100 = msgfix('100frame', framenum / longstatlen, longstatlen, 't=', animate.t100, 'cpu=', animate.cpu100, ', fps=', animate.fps100);
    }
    framedelta = now - frametime;
    // if (debugframedelta.length !== debugframedeltasize) debugframedelta = [];
    debugframedelta[debugframenum % debugframedeltasize] = framedelta; // NOT rounded
    if (framedelta > 17) {
        if (debugframedeltabig.length > 1000)
            debugframedeltabig.splice(0, 500);
        debugframedeltabig.push({ framenum, frametime, framedelta });
    }
    //if (framedelta > 40)
    //    log(framenum, "framedelta", framedelta);
    frametime = now;
    if (framedelta < framedeltasmooth / 5)
        framedeltasmooth = framedelta; // assume some interruption
    else
        framedeltasmooth = dodamp(framedeltasmooth, framedelta, framedeltahalflife * framedelta / 1000); // smoothing is time based, not frame
    if (framedelta > 100)
        framedelta = 100;
    //    if (framedeltasmooth > 100)
    //        log(framenum, "framedeltasmooth", "framedelta");
    //if (framenum % 30 == 0)
    if (currentHset && HW.multiScenedummy) {
        if (currentHset.horncount !== currentHset.fullHornCount) {
            msgfix("!framedeltasmooth", format(framedeltasmooth, 1), 'fps<b>', format(1000 / framedeltasmooth, 1), '</b><span style="margin-left:5em"></span>horn#', '<span style="color:red">', currentHset.horncount, currentHset.fullHornCount, '</span>mesh (M)', HW.multiScenedummy.meshused / 1000000);
        }
        else {
            msgfix("framedeltasmooth", format(framedeltasmooth, 1), 'fps<b>', format(1000 / framedeltasmooth, 1), '</b><span style="margin-left:5em"></span>horn#', currentHset.horncount, 'mesh (M)', HW.multiScenedummy.meshused / 1000000);
        }
    }
    else { // in case not horn
        msgfix("framedeltasmooth", format(framedeltasmooth, 1), 'fps<b>', format(1000 / framedeltasmooth, 1), '</b><span style="margin-left:5em"></span>horn#');
    }
    //??? not needed, hovermessage logic changed 30/06/2021 if (hoverDispobj.vn === mainvp) dispmouseover(0, hoverDispobj); // update the hover value too
    // render outstanding models in renderDirectory, if any
    // // moved to frameSaver()
    //if (renderDirectory) {
    //    FrameSaver.Video();
    //}
    FrameSaver.PreStep(); // setup  frame details, save frame information if requested
    // set values I don't want to look up in gui during the step, but want to be up to date
    if ((!olddoanim) && inputs.doAnim)
        framenum = 0; // force a rescale after switch to anim
    olddoanim = inputs.doAnim;
    if (!tracketclate)
        tracketc();
    if (!renderMainObject || searchValues.nohorn)
        prerender(currentGenes, uniforms); // make sure mouse tracking etc work right without rendering any horns etc
    // make the frame happen
    if (!perftimes) {
        renderFrame();
    }
    else {
        for (let i = 0; i < perftimes; i++) {
            newmain();
            renderFrame();
        }
    }
    FrameSaver.PostStep(); // save frame information etc if requested
    // defer this to after all rendering requested, can be quite costly
    if (inputs.doAnim)
        animStep();
    // NONO do the 'special' work at the front
    // NONO so that any extra time is accounted for in framedelta
    // Do extra work at end where its cost may (???) get lost
    if (inputs.doAnim || springs.running)
        framescale();
    // adding framenum makes sure they all get updated every 10 frames
    // even if there is a multiple of 10 calls in a frame
    updateggnn = framenum;
    if ((olddoanim) && !inputs.doAnim)
        reshowAllGuiGenes(); // reshow genes correctly after animation
    performanceDisplay();
    if (inputs.showstats)
        W.stats.update();
    debugframenum++; // at end so 0 value set after reset
    if (tracketclate)
        tracketc();
    framelog('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< ending animateee at frame', framenum);
    if (animate.readafter)
        readpixtest();
    msgfix.force(); // get the message out at end of frame
    Maestro.trigger('animateEnd');
} // animatee
function resetDebugstats() {
    debugframenum = 0;
    debugframecpu = [];
    debugframedelta = [];
    // debugframedeltabig = [];
}
function tracketc() {
    // do work that decides what the frame will look like; should all be reasonably quick
    toTarget(); // smooth towards target
    showzoomrot();
    canvFrame();
    camrot();
    applyDampedRotation();
    applyDampedRoll();
    // add game mode interaction on currentGenes
    if (V.resting && renderVR.ratio > 100) { // TODO to fit with meteres  properelu// disable roomsize if resting ... quick patch 11 Mar 19
        copyFrom(G, { _lroomsize: 1, _posy: -250, _camy: -250 });
    }
    genesToCam(currentGenes); // move genes to camera so they can use three.js methods for manipulation
    // check for possible movement by arrow
    if (keysdown.join().indexOf('Arrow') !== -1 && document.activeElement === canvas) {
        let bad = false;
        for (const k of keysdown) {
            if (!(k.includes('Arrow') || k === 'ctrl')) // 'shift' not allowed either
                bad = true;
        }
        if (!bad && canvTransEnabled) { // arrow key can be used
            newmain();
            // var kkk = keysdown.indexOf('shift') === -1 ? 1 : 10;
            var kkk = 1;
            var m = gamespeed.move * kkk * renderVR.scale / 400;
            var r = gamespeed.rot * Math.PI / 180 * kkk;
            var mm = camera.matrix.elements;
            if (keysdown.indexOf('ArrowUp') !== -1) {
                if (keysdown.indexOf('ctrl') !== -1) {
                    camera.rotateX(r);
                }
                else {
                    camera.position.x -= m * mm[8];
                    camera.position.y -= m * mm[9];
                    camera.position.z -= m * mm[10];
                }
                //camera.position.z += m;
            }
            if (keysdown.indexOf('ArrowDown') !== -1) {
                if (keysdown.indexOf('ctrl') !== -1) {
                    camera.rotateX(-r);
                }
                else {
                    camera.position.x += m * mm[8];
                    camera.position.y += m * mm[9];
                    camera.position.z += m * mm[10];
                }
            }
            if (keysdown.indexOf('ArrowLeft') !== -1)
                camera.rotateY(r);
            if (keysdown.indexOf('ArrowRight') !== -1)
                camera.rotateY(-r);
        }
    }
    VRTrack(); // handle the VR tracking; operates directly on camera, not on genes
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camToGenes(currentGenes); // and register the manipulated camera values back in the genes
    vivecontrol(); // handle the vive controllers
    Maestro.trigger('trackdone');
} // tracketc
/// test readPixels time in different situations
function readpixtest() {
    if (animate.readbuffer.length < 4 * animate.readwidth)
        animate.readbuffer = new Uint8Array(4 * animate.readwidth);
    renderer.setRenderTarget(null); // the canvas should always be of a convenient type and big, so read that as test
    gl.readPixels(0, 0, animate.readwidth, 1, gl.RGBA, gl.UNSIGNED_BYTE, animate.readbuffer);
}
/// debug frame histogram, see also perfsummary() in perftest.js for similar
function debugframehist(n) {
    var t = (n || 60) / 1000;
    var st = [0, 0, 0];
    for (let i = 0; i < debugframedelta.length; i++) {
        var frs = Math.round(debugframedelta[i] * t);
        if (!st[frs])
            st[frs] = 0;
        st[frs]++;
    }
    //log('frame histogram', st);
    return st;
}
var logframenum = 0;
/** log a single frame */
function framelog(...a) {
    if (logframenum < framenum)
        return;
    log.apply(undefined, arguments);
}
/** set up to log next frame */
function logframe(n = 1) {
    newmain(n);
    logframenum = framenum + n;
}
/** randomize gene speed */
function randGenespeed() {
    for (var gn in genedefs) {
        var gd = genedefs[gn];
        geneSpeedSave[gn] = geneSpeed[gn] = (2 + Math.random()) * (gd.max - gd.min) * 0.001;
        geneSpeedSave[gn] *= Math.random() > 0.5 ? 1 : -1;
        geneSpeed[gn] = geneSpeedSave[gn];
    }
    normalizeGeneSpeed();
    return geneSpeed; // return mainly to simplify debug
}
/** modify geneSpeed value dynamically for selected genes, filter is a function called with a genedef */
function modGeneSpeed(filter, modrate) {
    for (let gn in genedefs) {
        if (filter(genedefs[gn])) {
            var old = geneSpeed[gn]; // to preserve current direction
            geneSpeed[gn] = geneSpeedSave[gn] * modrate;
            if (old * geneSpeed[gn] < 0)
                geneSpeed[gn] *= -1;
        }
    }
}
/** modify geneSpeed value permamently for selected genes, filter is a function called with a genedef */
function modGeneSpeedOnce(filter, modrate) {
    for (let gn in genedefs) {
        if (filter(genedefs[gn])) {
            var old = geneSpeed[gn]; // to preserve current direction
            geneSpeedSave[gn] = geneSpeedSave[gn] * modrate;
            geneSpeed[gn] = geneSpeedSave[gn] * modrate;
        }
    }
}
/** scales etc, may be overridden */
//var scale = function (genes) {}
function toDefault(genes) {
    if (genes === undefined)
        genes = target;
    for (let gn in genedefs)
        target[gn] = genedefs[gn].def;
    newmain();
}
var smooth = 0.01;
/* map of name->value for target */ var target;
var lasttargtime;
/** move towards target, exponential */
function toTarget() {
    // keep track of frame times even if nothing to do
    var tt = Date.now();
    var dt = (tt - lasttargtime) / 1000.;
    lasttargtime = tt;
    if (target === undefined || olength(target) === 0)
        return;
    var bsmooth = inputs.doAnim ? 0 : smooth; // jump direct if animating
    bsmooth = smooth; // no, just normal whether animating or not
    var ssmooth = Math.pow(bsmooth, dt);
    //msgfix("dt", dt);
    if (dt > 0.4)
        ssmooth = 0; // too slow to be smooth
    if (inputs.doAnim)
        delete target.gscale; // can cause throbbing issues
    var done = 0;
    for (let gn in target) {
        if (target[gn] === undefined) {
            log('target undefined error', gn);
            delete target[gn];
        }
        else {
            done++;
            var t = target[gn];
            if (typeof (t) !== "number") {
                currentGenes[gn] = target[gn]; // must jump directly
                delete target[gn];
            }
            else {
                var v = currentGenes[gn];
                if (typeof (v) !== "number")
                    v = t;
                var vv = t * (1 - ssmooth) + v * ssmooth;
                if (Math.abs((vv - t) / Math.max(Math.abs(t), 0.001)) < 0.002) {
                    vv = t;
                    delete target[gn];
                    //console.log("targlen=" + Object.keys(target).length);
                }
                else {
                    //console.log("target not met ");
                }
                setval(gn, vv);
            }
        }
    }
    if (done && !inputs.doAnim)
        framescale();
    myToTarget();
}
function myToTarget() { } //
/** move currentGenes immediately to target */
function toTargetNow() {
    for (let gn in target)
        currentGenes[gn] = target[gn];
    target = {};
}
var sineAnimFrom, sineAnimTo, sineAnimStart, sineAnimLength, sineAnimFilter;
///// y=sin(x) - 0.7 * sin(0.7 + 3.7 * x) + 0.5 * sin(1.7 + 5.3 * x)
/** set up sine animate from and to */
function sineAnimate(filter) {
    if (filter === undefined) {
        console.error('sineAnimate default filter needs looking at');
        filter = resolveFilter();
        // var horns = Object.keys(HW.getHornSet(currentGenes).horns);
        // var i = horns.indexOf(sineAnimFilter) + 1;
        // if (i === horns.length) i= 0;
        // filter = horns[i];
        // // ??? if (!filter) filter = first; // <<< check
        // console.log("anim >>>" + filter);
    }
    sineAnimFilter = filter;
    sineAnimFrom = clone(currentGenes);
    // note: sineAnimate does not use slotw for _mutateObj
    sineAnimTo = _mutateObj(currentGenes, 10, filter, 0);
    delete sineAnimTo.gscale;
    delete sineAnimTo.tranrule;
    for (let gn in sineAnimTo) {
        if (typeof currentGenes[gn] !== 'number') {
            delete sineAnimTo[gn];
            delete sineAnimFrom[gn];
        }
    }
    sineAnimLength = 5; // 10 secs
    sineAnimStart = Date.now();
    W.doAnim.checked = true;
    saveInputState();
}
/** single step of sine animation */
function sineAnimStep() {
    var t = (Date.now() - sineAnimStart) / 1000;
    if (t > sineAnimLength) {
        setValuesFrom(currentGenes, sineAnimTo);
        sineAnimFrom = sineAnimTo = sineAnimStart = sineAnimLength = undefined;
        sineAnimate();
        //document.getElementById("doAnim").checked = false;
        return;
    }
    t = Math.PI * (t / sineAnimLength);
    var r = Math.cos(t) * -0.5 + 0.5; // range 0..1
    for (let gn in sineAnimTo)
        currentGenes[gn] = (1 - r) * sineAnimFrom[gn] + r * sineAnimTo[gn];
    newframe();
}
/** make sure the genefreeze and min/max values will allow animation to include current object set */
function regularizeForAnim() {
    for (var gn in mininrow) {
        if (mininrow[gn] !== maxinrow[gn]) {
            genedefs[gn].free = 1;
            genedefs[gn].min = Math.min(genedefs[gn].min, mininrow[gn]);
            genedefs[gn].max = Math.max(genedefs[gn].max, maxinrow[gn]);
        }
    }
}
/** animate in selected space
function animspace() {
    var totw = 0;
    for  (var o in currentObjects) {
        var dispobj = currentObjects[o];
        if (dispobj.selected && dispobj.vn !== mainvp) {
            totw += dispobj.weight;
        } else {
            dispobj.weight = 0;
        }
    }
    if (totw === 0)
    for ()
}
**/
/** make sure the camera populated from the corresponding genes */
function genesToCam(genes = currentGenes) {
    fillCamGenes(genes);
    //if (isNaN(genes._camqx*0))
    //    debugger;
    camera.position.set(genes._camx, genes._camy, genes._camz);
    var k = genes._camqw < 0 ? -1 : 1; // debug convenience
    camera.quaternion.set(k * genes._camqx, k * genes._camqy, k * genes._camqz, k * genes._camqw);
    let sk = 1;
    // sk = 1/400;
    camera.scale.set(sk, sk, sk); // in case upset by something else
    // camera.quaternion.normalize();
    camera.updateMatrix();
    if (genes._camnear)
        camera.near = genes._camnear;
    if (genes._camfar)
        camera.far = genes._camfar;
    if (genes._camaspect)
        camera.aspect = genes._camaspect;
    // if (camera.fov !== genes._fov) {
    camera.fov = genes._fov;
    // do NOT upset carefully tailored VR cameras' projectionMatrix
    if (!camera.name.startsWith('eye_'))
        camera.updateProjectionMatrix();
    // }
}
/** make sure all the camera genes are defined, if not derive them from the camera */
function fillCamGenes(genes) {
    genes = genes || currentGenes;
    if (genes._camx === undefined)
        genes._camx = camera.position.x;
    if (genes._camy === undefined)
        genes._camy = camera.position.y;
    if (genes._camz === undefined)
        genes._camz = camera.position.z;
    if (genes._camqx === undefined)
        genes._camqx = camera.quaternion.x;
    if (genes._camqy === undefined)
        genes._camqy = camera.quaternion.y;
    if (genes._camqz === undefined)
        genes._camqz = camera.quaternion.z;
    if (genes._camqw === undefined)
        genes._camqw = camera.quaternion.w;
    if (genes._fov === undefined)
        genes._fov = camera.fov;
}
/** make sure the genes populated from camera */
function camToGenes(genes = currentGenes) {
    camera.updateMatrix();
    //if (isNaN(camera.quaternion.x*0))
    //    debugger;
    genes._camx = camera.position.x;
    genes._camy = camera.position.y;
    genes._camz = camera.position.z;
    genes._camqx = camera.quaternion.x;
    genes._camqy = camera.quaternion.y;
    genes._camqz = camera.quaternion.z;
    genes._camqw = camera.quaternion.w;
    genes._fov = camera.fov;
}
//# sourceMappingURL=anim.js.map