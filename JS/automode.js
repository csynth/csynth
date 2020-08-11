"use strict";
var screens, slots, inputs, mainvp, height, W, mutater, randi, log, canvmousedown, canvmouseup, canvmousemove, tryseteleval,
$, Element, trygetele;

/** rand drag in left avoinding mainvp */
function randdragleft() {
    randdrag({maxx: slots[mainvp].x - 50});
}
function randdragbot() {
    randdrag({miny: height - slots[mainvp].y + 50});
}

/** random mouse drag, maybe constrained by spec */
function randdrag(spec) {
    var mar = 100;
    if (spec === undefined) spec = {};
    var sc = screens[inputs.revscreen ? 1 : 0]; // check if this is correct with rev
    if (spec.minx === undefined) spec.minx = sc.offset + mar;
    if (spec.maxx === undefined) spec.maxx = sc.offset + sc.width-mar;
    if (spec.miny === undefined) spec.miny = mar;
    if (spec.maxy === undefined) spec.maxy = sc.height-mar;
    var sx = randi(spec.minx, spec.maxx), sy = randi(spec.miny, spec.maxy),
        ex = randi(spec.minx, spec.maxx), ey = randi(spec.miny, spec.maxy);

    var m1 = { myx: sx, myy: sy, which: 1, type: "simdown", issim:true };
    var t = 0;
    var time = 250 / autox.speedup, int=10;
    if (autox.state === "dragging") {
        // should not happen, and important to avoid
        // as it could get the autox.timer confused
        log("unexpected call to drag while already dragging");
        stoptest();
        autox.state = "user";
        tester();
        return;
    }
    autox.state = "dragging";
    canvmousedown(m1);
    autox.setInterval(function randdrag_interval() {
        t += int;
        autox.x = sx + (ex-sx)*t/time;
        autox.y = sy + (ey-sy)*t/time;
        //log("pos", x, y);
        if (t >= time) {
            canvmouseup( { myx: ex, myy: ey, which: 1, type: "simup", issim:true} );
            fingeroff();
            autox.setTimeout(autostep, autox.dragGap);
        } else {
            canvmousemove( { myx: autox.x, myy: autox.y, which: 1, type: "simmove", issim:true} );
            finger(autox.x,autox.y);
        }
    }, int / autox.speedup);
}


// states:
// "user"       user is interacting
// "dragging"   simulated drag in progress
// "auto"    in auto mode before next auto event
/** autox keeps information for auto mode */
var autox = {
    state: "user",
    timer: undefined,
    interval: undefined,
    dragGap: 2500,
    waitBeforeAuto: 13000,  // time to wait before auto takes over from user interaction. low for testing, probably want higher
    speedup: 1          // speed up factor
};

/** autotable defines operations and probabilities
keys are for convenience of test update and are also used as action keys if act: not defined
wait is time to wait after action before next action.
if wait is not defined (eg randdrag) it is the responsibility of the called action to call next action

To consider: we may want to give frequency rather than probability for some???
*/

var autotable = {
    randdragleft: { p:1 },                  // perform drag in left side (won't change mainvp), note autox.dragGap after it
    randdragbot: { p:1 },                   // perform drag in bottom part (won't change mainvp)
    randdrag: { p:0.01 },                   // perform random drag, may cross or terminate in mainvp
    mutater: { p:0.1, wait: 1000 },         // perform mutation, using the standard three mutrate cycle.
    clearSelected: { p:0.1, wait: 500 },    // clear the selection
    autozoom: { p:0.1, wait: 1500 },        // change zoom to a different value  (nb it takes 1000)
    autorotrate: { p:0.1, wait: 1500 },     // change rotrate to a different value (nb it takes 1000)
    autoanimrate: { p:0.1, wait: 1500 },    // change anim rate to a different valye (nb it takes 1000)
    animspeedstd: { p:0.2, wait: 600},      // press animspeedstd button
    zoomnorm: { p:0.2, wait: 600},          // press zoomnorm button
    rotstd: { p:0.2, wait: 600}             // press rotstd button
};

/** a user has interacted, take appropriate action */
function interacted(evt) {
	if (brusselsNoAuto) return;
    if (autox.state !== "user" && evt.issim) return;  // just running automode, let it go ahead
    else if (autox.state === "user" && !evt.issim) {  // user event while in user mode, update timer
        autox.setTimeout(autostep, autox.waitBeforeAuto);
        return;
    }
    else if (autox.state === "user" && evt.issim) {  // auto action while not in auto mode
        log("Unexpected sim event while not in sim mode");
        debugger;
        return;
    }
    // fall through here if user interaction has interrupted auto mode
    // end the dragging at once and let user interaction (mousedonw?) start at once
    if (autox.state === "dragging") {
        canvmouseup( { myx: autox.x, myy: autox.y, which: 1, type: "simup", issim:true} );
    }
    autox.state = "user";
    autox.setTimeout(autostep, autox.waitBeforeAuto);
}

/** slide a guid value from value to value over time, uses own timer and may be parallel to main thread */
function slidegui(ele, from, to, time) {
    if (from === undefined) from = ele.value;
    if (to === undefined) to = ele.min*1 + (ele.max-ele.min) * Math.random();
    if (time === undefined) time = 1000;
    log("slidegui", ele.id, from, to);
    var tt = setInterval(slide, 20);
    var st = Date.now();
    var elerect = ele.getBoundingClientRect();
    function slide() {
        var t = Date.now();
        var val;
        if (t > st + time) {
            clearInterval(tt);
            val = to;
            fingeroff();
        } else {
            val = from*1 + (to-from)*(t-st)/time;
            // slightly off below because it does not allow for the width of the slider thumb
            // the -14 is meant to do that and it (almost) does
            finger(elerect.left + (elerect.width-14) * (val-ele.min)/(ele.max-ele.min), elerect.top);
        }
        tryseteleval(ele, val);
        // tryfun(ele, ele.onchange);
        $(ele).trigger('change');

    }
}

/** autoslide zoom */  function autozoom() { slidegui(W.zoomgui); }
/** autoslide grot */  function autorotrate() { slidegui(W.grot); }
/** autoslide anim */  function autoanimrate() { slidegui(W.animSpeed); }

var brusselsNoAuto = true;
/** perform next auto mode step (or start if not in auto mode at all) */
function autostep() {
	if (brusselsNoAuto) return;
    autox.state = "auto";
    // scan table to find cumulative 'probability'
    var sp = 0; for (var  o in autotable) sp += autotable[o].p;
    var rand = sp * Math.random();
    // scan again to find appropriate action
    sp = 0; for (o in autotable) {
        sp += autotable[o].p;
        if (sp > rand) break;
    }
    var op = autotable[o];
    if (op.p < 1) log("autoop", o);
    var act = op.act ? op.act : self[o];  // pick up action if defined explicitly, else use o as action name
    if (act instanceof Element)
        act.onclick(act);
    else
        act();
    if (op.wait !== undefined)
        autox.setTimeout(autostep, op.wait);
}

/** prepare for auto mode */
function prepautomode() {
    autox.setTimeout(autostep, 5000);
}

/** show finger */
function finger(x,y) {
    W.fingerimage.style.left = (x-30) + "px";
    W.fingerimage.style.top = (y-30) + "px";
    W.fingerimage.style.display = "";
}

function fingeroff() {
   W.fingerimage.style.display = "none";
}

function showpress(ele) {
    ele.className = "pressed";
    var elerect = ele.getBoundingClientRect();
    finger(elerect.left+20, elerect.top+20);
    setTimeout(function() {
        ele.className = "";
        fingeroff();
        },
     500);
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
/** clear oustanding and set interval */
autox.setInterval = function(f, i) {
    autox.stoptime();
    autox.interval = setInterval(f, i);
};
// ******************************* below are deprecated, or for test only
var mutInterval;
function muttester() {
    if (mutInterval !== undefined) return;
    mutInterval = setInterval(mutater, 6300);
}

// test toggle
function tester() {
    if (!trygetele("testerbox", "checked")) { stoptest(); return; }
// this has now no longer a number
    randdrag();
    muttester();
}

// test off
function stoptest() {
    clearInterval(mutInterval);
    mutInterval = undefined;
}
