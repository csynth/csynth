/** set upautomode for mutation session, originally Brighton? or Brussels, special Lima code added 27/10/2022  */
"use strict";
var screens, slots, inputs, mainvp, height, width, W, mutater, randi, log, canvmousedown, canvmouseup, canvmousemove, tryseteleval,
$, trygetele, canvas, getDispobj, restoringInputState, loadOao, Touch2Init, searchValues, inps, onframe, nomess,setViewports, centreall, centrescalenow,
Director, windowset, sleep, vps, S, currentObjects, copyFrom, realNumslots, refall, mutCurated, setAllLots, target,
slowMutate, postmutFixgenes, randrange, setExtraKey, catrom, setNovrlights, deferRender, framenum, noaudio, nircmd, EX, centreuiover, allowDustbin,
lastdocx, lastdocy
// Element
;

// /** rand drag in left avoinding mainvp */
// function rand dragleft() {
//     rand drag({maxx: slots[mainvp].x - 50});
// }
// function randd ragbot() {
//     rand drag({miny: height - slots[mainvp].y + 50});
// }

// states:
// "user"       user is interacting
// "dragging"   simulated drag in progress
// "auto"    in auto mode before next auto event
/** autox keeps information for auto mode */
var autox = {
    state: "user",
    /** @type any */timer: undefined,
    interval: undefined,
    dragGap: 2500,
    waitBeforeAuto: 13000,  // time to wait before auto takes over from user interaction. low for testing, probably want higher
    speedup: 1,          // speed up factor
    dragtime: 2000,       // time for drag
    cubick: 4            // factor for cubic movefinger
};

var autotable = {
    randdragToMain: { p: 0.5, wait: 2000},                      // perform random drag to mainvp
    selmut: { p: 1, wait: 2000 },          // perform mutation, using the standard three mutrate cycle. takes 3 sec
    // ui_wipe: { p: 0.1, wait: 1000 },          // clear the selection
    autozoom: { p: 0.25, wait: 1500 },        // change zoom to a different value  (nb it takes 1000)
    // zoomnorm: { p: 0.2, wait: 600},          // press zoomnorm button
    restoreFromCurated: { p: 0.1, wait: 3000},      // back to start
    // randselect: { p: 0.2, wait: 1500}          // nb 500 used for down time, so 1 sec after up
};

// /** random mouse drag, maybe constrained by spec. FROM any but mainvp, TO mainvp */
// function chooseSlot(spec) {
//     var mar = 100;
//     if (spec === undefined) spec = {};
//     var sc = screens[inputs.revscreen ? 1 : 0]; // check if this is correct with rev
//     if (spec.minx === undefined) spec.minx = sc.offset + mar;
//     if (spec.maxx === undefined) spec.maxx = sc.offset + sc.width-mar;
//     if (spec.miny === undefined) spec.miny = mar;
//     if (spec.maxy === undefined) spec.maxy = sc.height-mar;
//     var vn;
//     while (true) {
//         var sx = randi(spec.minx, spec.maxx), sy = randi(spec.miny, spec.maxy)
//         // var m1 = { myx: sx, myy: sy, which: 1, type: "simdown", target: canvas, issim:true };
//         vn = getDispobj(m1).vn;
//         if (vn !== mainvp) break;
//     }
//     return {m1, sx, sy, vn};
// }

/** selmut, wipe, select n, mutate */
async function selmut({wipe, nsel} = {}) {
    if (wipe === undefined) wipe = Math.random() > 0.5;
    if (nsel === undefined) nsel = wipe ? randi(3) : randi(2);
    if (wipe) {
    // TODO use ...(e;e) instead
        await eleclick(W.ui_wipe); if (autox.state === 'user') return;
        await msleep(500);  if (autox.state === 'user') return;
    }
    for (let i = 0; i < nsel; i++) {
        await randselect(); if (autox.state === 'user') return;
        await msleep(1000); if (autox.state === 'user') return;
    }
    slowMutate = 200 / autox.speedup;
    await eleclick(W.ui_mutate); if (autox.state === 'user') return;
    await S.maestro("populationDone"); if (autox.state === 'user') return;
}

/** select/deselect random slot */
async function randselect(spec) {
    let vn = 999; while(!slots[vn]) vn = randi(vps[0]*vps[1] + 1)
    if (spec) vn = spec;
    let sx = slots[vn].cx, sy = height - slots[vn].cy

    await movefinger(sx, sy); if (autox.state === 'user') return;   // initial move to select point
    await msleep(100); if (autox.state === 'user') return;           // short sleep before pressing
    fingerdown(sx, sy);
    await msleep(250); if (autox.state === 'user') return;            // quick before up to ensure select, not drag
    fingerup(sx, sy);
    // await msleep(250);           // but keep mouse logo there for clarity
}

let lastfinger = {x:0, y:0}

/**
 *
 * @param {number} myx
 * @param {number} myy
 */
function fingerdown(myx = lastfinger.x, myy= lastfinger.y) {
    lastfinger.x = myx, lastfinger.y = myy;
    if (autox.state === 'user') return;
    const m1 = { myx, myy, which: 1, type: "simdown", target: canvas, issim:true };
    W.fingerimage.style.opacity = 1
    canvmousedown(m1);
}

/**
 *
 * @param {number} myx
 * @param {number} myy
 */
 function fingerup(myx = lastfinger.x, myy= lastfinger.y) {
    lastfinger.x = myx, lastfinger.y = myy;
    const m1 = { myx, myy, which: 1, type: "simup", target: canvas, issim:true };
    W.fingerimage.style.opacity = 0.25
    canvmouseup(m1);
}

/** drag from a random slot (not mainvp) to mainvp */
async function randdragToMain(spec) {
    let vn = 999; while(!slots[vn] && vn !== mainvp) vn = randi(vps[0]*vps[1] + 1)
    if (spec) vn = spec;
    let sx = slots[vn].cx, sy = height - slots[vn].cy

    var mm = slots[mainvp];
    const k = 0.4, k1 = 1-k;
    var ex = sx * k1 + (mm.x + mm.width/2) * k;
    var ey = sy * k1 + (mm.y + mm.height/2) * k;
    // while (true) {
    //     var ex = randi(spec.minx, spec.maxx), ey = randi(spec.miny, spec.maxy);
    //     if (inmainvp(ex, ey)) break;
    // }
    await movefinger(sx, sy); if (autox.state === 'user') return;   // so the user sees where start is
    autox.state = "dragging";
    fingerdown(sx, sy);
    await movefingerd(ex, ey); if (autox.state === 'user') return;
    fingerup(ex, ey);
    autox.state = "auto";
}

async function movefinger(ex, ey, time = autox.dragtime / autox.speedup) {
    const sx = lastfinger.x, sy = lastfinger.y;
    // m is a 'mid' control point
    const mx = sy === ey ? (sx + ex) / 2 : (sx + ex + 3*slots[mainvp].cx)/5;
    const my = (sx === ex && sy !== ey) ? (sy + ey) / 2 : (sy + ey + 3*slots[mainvp].cy)/5;

    // use m to create pre start and post end points/tangents
    const k = (sx === ex || sy === ey) ? 9 : autox.cubick;
    const psx = (k+1)*sx - k*mx
    const psy = (k+1)*sy - k*my
    const pex = (k+1)*ex - k*mx
    const pey = (k+1)*ey - k*my

    const st = Date.now();
    while (true) {
        let t = Date.now() - st;
        if (t > time) t = time;
        autox.x = catrom(t/time, psx, sx, ex, pex);
        autox.y = catrom(t/time, psy, sy, ey, pey);
        //log("pos", x, y);
        if (t >= time) {
            // fingerup(ex, ey);
            break;
        }
        canvmousemove( { myx: autox.x, myy: autox.y, which: 1, type: "simmove", issim:true} );
        finger(autox.x,autox.y);
        await S.frame(); if (autox.state === 'user') return;
    }
}

/** move the finger to the given point, starting at last finger point. direct
 * Note, this does NOT interact with canvas events
 */
async function movefingerd(ex, ey, time, callback) {
    const sx = lastfinger.x, sy = lastfinger.y;
    // log('movefinger', sx, sy, ex, ey);
    var t = 0;
    time = time || autox.dragtime / autox.speedup
    const int=10;
    const st = Date.now();

    while (true) {
        t = Date.now() - st;
        if (t > time) t = time;
        if (callback) callback(t/time);
        autox.x = sx + (ex-sx)*t/time;
        autox.y = sy + (ey-sy)*t/time;
        //log("pos", x, y);
        if (t >= time) {
            // fingerup(ex, ey);
            break;
        }
        canvmousemove( { myx: autox.x, myy: autox.y, which: 1, type: "simmove", issim:true} );
        finger(autox.x,autox.y);
        await S.frame(); if (autox.state === 'user') return;
    }
    // await msleep(400);
}



/** autotable defines operations and probabilities
keys are for convenience of test update and are also used as action keys if act: not defined
wait is time to wait after action before next action.

To consider: we may want to give frequency rather than probability for some???
*/

// var autotable = {
//     randdragleft: { p:1 },                  // perform drag in left side (won't change mainvp), note autox.dragGap after it
//     randdragbot: { p:1 },                   // perform drag in bottom part (won't change mainvp)
//     randdrag: { p:0.01 },                   // perform random drag, may cross or terminate in mainvp
//     mutater: { p:0.1, wait: 1000 },         // perform mutation, using the standard three mutrate cycle.
//     clearSelected: { p:0.1, wait: 500 },    // clear the selection
//     autozoom: { p:0.1, wait: 1500 },        // change zoom to a different value  (nb it takes 1000)
//     autorotrate: { p:0.1, wait: 1500 },     // change rotrate to a different value (nb it takes 1000)
//     autoanimrate: { p:0.1, wait: 1500 },    // change anim rate to a different valye (nb it takes 1000)
//     animspeedstd: { p:0.2, wait: 600},      // press animspeedstd button
//     zoomnorm: { p:0.2, wait: 600},          // press zoomnorm button
//     rotstd: { p:0.2, wait: 600}             // press rotstd button
// };


var brusselsNoAuto = true;

/** a user has interacted, take appropriate action */
function interacted(evt) {
    if (autox.state !== "user" && evt.issim) return;  // just running automode, let it go ahead
    document.body.style.cursor = ''
	if (brusselsNoAuto) return;
    else if (autox.state === "user" && !evt.issim) {  // user event while in user mode, update timer
        autox.setTimeout(autoloop, autox.waitBeforeAuto);
        return;
    }
    else if (autox.state === "user" && evt.issim) {  // auto action while not in auto mode
        log("Unexpected sim event while not in sim mode");
        // debugger;
        return;
    }
    // fall through here if user interaction has interrupted auto mode
    // end the dragging at once and let user interaction (mousedown?) start at once
    if (autox.state === "dragging") {
        fingerup(autox.x, autox.y);
    }
    autox.state = "user";
    W.fingerimage.style.opacity = 0;
    autox.setTimeout(autoloop, autox.waitBeforeAuto);
    slowMutate = 200;
}

/** slide a guid value from value to value over time, uses own timer and may be parallel to main thread
 * go via min or max
 */
async function slidegui(ele, from, to, time) {
    const emax = +ele.max, emin = +ele.min;
    const mid = (emax + emin)/2;
    if (from === undefined) from = +ele.value;
    if (to === undefined) to = from > mid ? randrange(emin, mid) : randrange(mid, emax);
    const between = to > mid ? emax - 0.01 : emin + 0.01
    if (time === undefined) time = 1000;
    log("slidegui", ele.id, from, to);
    var elerect = ele.getBoundingClientRect();
    function pos(val) {
        return [elerect.left + (elerect.width-14) * (val-emin)/(emax-emin), elerect.top];
    }
    await movefinger(...pos(from)); if (autox.state === 'user') return;
    await sleep(250);
    // fingerdown(); // causes drag of canvas object
    W.fingerimage.style.opacity = 1
    await movefingerd(...pos(between), undefined, p => inps[ele.id] = from + (between-from) * p); if (autox.state === 'user') return;
    W.fingerimage.style.opacity = 1
    await msleep(500); if (autox.state === 'user') return;
    await movefingerd(...pos(to), undefined,  p => inps[ele.id] = between + (to-between) * p); if (autox.state === 'user') return;
    fingerup();

    ele.min = emin; ele.max - emax;  // belt and braces in case inps/setInput extended the range.
}


/**
 *click on an element, move to it, finger down and finger up
 * @param {Element} ele
 */
async function eleclick(ele) {
    var elerect = ele.getBoundingClientRect();
    const myx = elerect.left+20, myy = elerect.top+20;
    await movefinger(myx, myy); if (autox.state === 'user') return;
    await msleep(300); if (autox.state === 'user') return;
    // fingerdown(myx, myy);   // this causes false canvas selection
    W.fingerimage.style.opacity = 1
    ele.onclick();   // n.b this will highlight via onlick=>showpress as well
    await msleep(500); if (autox.state === 'user') return;
    fingerup(myx, myy);
}

/** autoslide zoom */  async function autozoom(k) { await slidegui(W.zoomgui, undefined, k); }
/** autoslide grot */  async function autorotrate() { await slidegui(W.grot); }
/** autoslide anim */  async function autoanimrate() { await slidegui(W.animSpeed); }

let inautoloop = false;
/** perform next auto mode step (or start if not in auto mode at all) */
async function autoloop() {
    if (inautoloop) return console.error('attempt to enter autoloop while already active');
    try {
        inautoloop = true;
        document.body.style.cursor = 'none'
        finger(lastdocx, lastdocy);
        await msleep(500)
        fingerup(lastdocx, lastdocy);

        autox.state = "auto";
        while (!brusselsNoAuto && autox.state === 'auto') {
            await _autostep();
        }
    } finally {
        log('exited autoloop, state', autox.state);
        inautoloop = false;
    }
}

/** sleep with possible speedup */
async function msleep(t) { await sleep(t/autox.speedup)}

async function _autostep() {
    var o = ''
    var sp = 0; for (o in autotable) sp += autotable[o].p;
    var rand = sp * Math.random();
    // scan again to find appropriate action
    sp = 0; for (o in autotable) {
        sp += autotable[o].p;
        if (sp > rand) break;
    }
    var op = autotable[o];
    if (op.p < 10) log("autoop", o);
    var act = op.act ? op.act : self[o];  // pick up action if defined explicitly, else use o as action name
    if (act instanceof Element)
        await eleclick(act);
    else
        await act();
    if (autox.state === 'user') return;
    if (op.wait !== undefined) await msleep(op.wait)
}

function loadOaoNovp(...x) {
    try {
        restoringInputState = true;
        loadOao(...x);
    } finally {
        restoringInputState = false;
    }
    automodeSettings(); // reestablish specific settings rather than .oao settings
}

// /** prepare for auto mode */
// function prepautomode() {
//     autox.setTimeout(autoloop, 1000);
// }

/** show finger */
function finger(x,y) {
    W.fingerimage.style.left = (x-30) + "px";
    W.fingerimage.style.top = (y-30) + "px";
    W.fingerimage.style.display = "";
    lastfinger = {x, y};
}

function showpress(ele, time  = 1000) {
    ele.className = "pressed";
    var elerect = ele.getBoundingClientRect();
    finger(elerect.left+20, elerect.top+20);
    setTimeout(function() {
        ele.className = "";
        // fingeroff();
        },
     time);
}

/** stop timer and/or interval */
autox.stoptime = function() {
    if (autox.timer) clearTimeout(autox.timer);
    if (autox.interval) clearInterval(autox.interval);
    autox.timer = autox.interval = undefined;
};
/** clear outstanding and set timeout */
autox.setTimeout = function(f, i) {
    autox.stoptime();
    autox.timer = setTimeout(f, i);
};

/** random drag for debug */
async function randdrag() {
    const r = Math.random;
    const sx = 1920*r(), sy = height*r(), ex = 1920*r(), ey = height*r();
    fingerdown(sx, sy);
    await movefinger(ex, ey, 200);
    fingerup(ex, ey);
}

async function silly(n = 100) {
    for (let i = 0; i <n; i++) {
        await randdrag();
        await msleep(30);
    }
}
// /** clear oustanding and set interval */
// autox.set Interval = function(f, i) {
//     autox.stoptime();
//     autox.interval = set Interval(f, i);
// };
// ******************************* below are deprecated, or for test only
// var mutInterval;
// function muttester() {
//     if (mutInterval !== undefined) return;
//     mutInterval = set Interval(mutater, 6300);
// }

// // test toggle
// function tester() {
//     if (!trygetele("testerbox", "checked")) { stoptest(); return; }
// // this has now no longer a number
//     randdrag();
//     muttester();
// }

// // test off
// function stoptest() {
//     clearInterval(mutInterval);
//     mutInterval = undefined;
// }

/** cache the genes of the current objects in curated  */
function cacheCurrent() {
    mutCurated = Object.values(currentObjects).filter(o => o.genes && o.genes._rot4_ele).map(o => copyFrom({}, o.genes));
}

/** set genes for all slots from curated list */
async function restoreFromCurated(fromlist = mutCurated) {
    if (mutCurated.length === 0) return console.error('cannot restoreFromCurated with no curated')
    const off = randi(realNumslots);
    let i = 0;
    for (const s of slots) {
        if (s) {
            const id = (off + i++) % fromlist.length;
            // log('start restoreFromCurated', s.dispobj.vn, id);
            copyFrom(s.dispobj.genes, fromlist[id]);
            // if (s.dispobj.vn === mainvp)  // only scaling this gave issues soon after woth had _rot4_ele
                centrescalenow(s.dispobj.genes);
            s.dispobj.render();
            // log('end restoreFromCurated', s.dispobj.vn);
            await msleep(200);
            await S.frame(2);
        }
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ mutate/lima setup code here, not strictly to do with automode
function limainitend() {
    nomess();
    setTimeout(autoloop, 1000);
    fingerup(width/2, height/2)
    onframe( () => {
        centreall();
        centrescalenow();
    }, 10);
}

var mutlimasetupdone;
function mutlimasetup() {
    noaudio = true;
    Touch2Init();
    automodeSettings();
    if (!mutlimasetupdone) {
        cacheCurrent();
        W._oldnomess = nomess;
        nomess = (...x) => {
            W._oldnomess(...x);
            if (framenum > 10) {
                inps.showuiover = true;
                onframe(centreuiover, 1)
            } else {
                onframe(()=>nomess(), 10)
            }
        };
        setViewports();
        setTimeout(() => nomess, 5000);
        mutlimasetupdone = true;
        // this centring needed for initial scales after using GPUSCALE true
        // probably need something more generic, eg after loadoao?
        centreall();
        centrescalenow();

        // // this seems absurd; simpler code worked on F5 repeats but not on the initial run
        // log('@~@~@~@~ first centreall done');
        // (async function centreWhenReady() {
        //     log('@~@~@~@~ await not deferRender', framenum);
        //     await S.waitVal(() => !deferRender);
        //     for (let i = 0; i < 25; i+=10) {
        //         log('@~@~@~@~ centre', framenum, Object.values(currentObjects).reduce((c,v) => c + !!(v && v.genes), 0));
        //         centreall();
        //         centrescalenow();
        //         refall();
        //         await S.frame(10);
        //     }
        // })();
    }
    nomess();
    setTimeout(() => nomess, 1000);
}

var mutvary, mutvarybyslot
/** called initially and after initial oao reloaded  */
function automodeSettings() {
    inps.mutrate = 10;  // was 15, but being set to 10 by mutater() in ui_mutate.onclick
    mutvary = 0;
    mutvarybyslot = 30;
    inps.GPUSCALE = true;
    target = {};  // it was probably the same as genes anyway
    setAllLots('subband', {free:0, value:-1});  // to review, but for now disable subbands
    setAllLots('_camz', 1000);          // zoom camera in
    setAllLots('ribdepth', {max: 2});   // stop extreme ribdepth
    postmutFixgenes = {_camz: 1000, _uScale: 1}     // applies to all new mutations, but can then be overridden
    W.zoomgui.max='0.9'
    setNovrlights();
    // centreall();

    for (let i = 1; i < 10; i++) setExtraKey('Insert,' + i, 'speed ' + i, () => {
        autox.speedup = 20 ** ((i-1)/8);
        if (autox.state === 'user') autox.setTimeout(autoloop, 1);
        brusselsNoAuto = false;
    })
    setExtraKey('Insert,0', 'no auto', () => {
        autox.state = 'user';
        brusselsNoAuto = true;
    })


    if (searchValues.limaprojector) {     // for lima with touch screen and projector, not used
        Director.slotsToUse = 0;  // saves a slightly expensive Director.framesFromSlots
        inps.hovermode = false;
        onframe(() => inps.hovermode = false, 20);
        inps.dragmode = true;
        inps.projvp = true;
        inps.fullvp = true;
        searchValues.doublescreen = true;
        screens = [ {width: 1920, height: 1080, offset: 0}, {width: 1920, height: 1080, offset: 1920} ]; // can't get reliable info, force

        inps.doFixrot = true;
        inps.doAutorot = false;
        inps.USEGROT = false;
        inps.xyrot = 0;
        inps.xzrot = 0.1;
        inps.yzrot = -0.04;

        inps.animSpeed = 0.4
        W.animspeeds.style.display = 'none';
        W.animspeeds2.style.display = 'none';
        W.animspeeds3.style.display = 'none';
        // W.zoomguipair.style.display = 'none';
        W.rotstd.style.display = 'none'
        W.zoomnorm.style.display = 'none';
        W.zoomgui.fixedrange = true;        // do not let input changes extend the range

        brusselsNoAuto = false;
    } else if (searchValues.lima) {     // for Lima single screen as used
        Director.slotsToUse = 0;  // saves a slightly expensive Director.framesFromSlots
        inps.hovermode = false;
        onframe(() => inps.hovermode = false, 20);
        inps.dragmode = true;
        inps.projvp = false;
        inps.fullvp = false;
        searchValues.doublescreen = false;
        // screens = [ {width: 1920, height: 1080, offset: 0}, {width: 1920, height: 1080, offset: 1920} ]; // can't get reliable info, force

        inps.doFixrot = true;
        inps.doAutorot = false;
        inps.USEGROT = false;
        inps.xyrot = 0;
        inps.xzrot = 0.1;
        inps.yzrot = -0.04;

        inps.animSpeed = 0.4
        W.animspeeds.style.display = 'none';
        W.animspeeds2.style.display = 'none';
        W.animspeeds3.style.display = 'none';
        // W.zoomguipair.style.display = 'none';
        W.rotstd.style.display = 'none'
        W.zoomnorm.style.display = 'none';
        W.zoomgui.fixedrange = true;        // do not let input changes extend the range

        brusselsNoAuto = false;

        nomess();
        allowDustbin = false;
        nircmd(`win settopmost stitle "${document.title}" 1`);
        EX.toFront();
        centreuiover();

    } else {
        inps.hovermode=true;
        onframe(() => inps.hovermode=true, 20);
        inps.dragmode=true;
        inps.projvp=false;
        inps.fullvp=false;
        inps.animSpeed = 0;
        inps.xyrot = 0;
        inps.xzrot = 0;
        inps.yzrot = 0;
        windowset(0);
    }

}
