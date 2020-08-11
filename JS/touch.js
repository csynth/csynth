"use strict";

var canvas, Utils, applyScale, inputs, canvdampz, applyMatop, rot, lastTouchedDispobj, interacttime, getDispobj,
V, lastDispobj, NODO, mousewhich, canvmousemove, canvmousedown, canvmouseup, msgfix, log;
/*
 * Touch gesture control.
 * This uses a hybrid approach.
 * Most of the functions (single touch) use the low level canvas.ontouchstart etc.
 * The zoom and rotation (two touch) use hammer.js.
 *
 * We have kept these separate.  Touch for hammer parts, Touch2 for native parts.
 *
 * There was a reliability issue with both hammer and native, which we debugged in native.
 * This turned out to be due to spruious mouse events that were generated somewhere outside our code (?where?)
 * to 'help' write common mouse/touch actions.
 * These mouse events were often so late that everything got out of order and confused.
 * The issue has been sidetracked by code (mainly in canvenvents.js) to ignore mouse actions soon after touch actions.
 * That seems to resolve the issues with both native and hammer implementations,
 * but we have kept our simple native single finger code anyway.
 *
 * The earlier implementation using hammer is available in svn 2605 and before.
 * I thought at one time that maybe even loading hammer.js was causing these odd effects,
 * but using t2() (and not Touch.Init()) with hammer.js loaded seems to behave the same as without.
 */

var Touch = new function() {
    var UI = this;
    UI.m_dataArray = []; // new Array();       // data to send to child win

    UI.m_minPinchDist        = 60;        // minimum delta before we consider the gesture a pinch
    UI.m_minRotateDist        = 100;        // minimum distance between fingers before we consider this a two finger rotate
    UI.m_maxPanDist            = 60;         // initial distance between fingers for two finger panning
    UI.m_maxRotationAngles = 14.5;        // maximum rotation to apply
    UI.lastscale            = 1.0;
    UI.lastrotation = 0;

    UI.Init = function() {
        // pinch is fire for pinch and (almost all) rotations, so we just catch it as pinch.
        var Hammer = window.Hammer; //PJT: quick dirty hack.
        function pinchrot(event){
            //touchlog( "pinch ");
            // ignore two fingers too close together
            var toucha = {x:event.gesture.touches[0].clientX, y:event.gesture.touches[0].clientY };
            var touchb = {x:event.gesture.touches[1].clientX, y:event.gesture.touches[1].clientY };
            if( Utils.GetDistance( toucha, touchb) <  UI.m_minPinchDist )
                return undefined;

            // convert values to deltas and apply them
            // lastscale and lastrotation are reset on touchstart.
            applyScale(UI.lastscale / event.gesture.scale);  // not sure why not inverse of this
            var dr = UI.lastrotation - event.gesture.rotation;
            dr = (dr + 900) % 360 - 180;
            if (inputs.doAutorot) {
                canvdampz(-dr);
            } else {
                var sss = 0.01;
                //log("r ot", UI.lastrotation, event.gesture.rotation, dr);
                applyMatop(0,1, dr*sss, rot, lastTouchedDispobj);
            }
            interacttime = Date.now();
            UI.lastscale = event.gesture.scale;
            UI.lastrotation = event.gesture.rotation;
            return eventend(event);
        }
        Hammer(canvas).on("pinch", pinchrot);
        Hammer(canvas).on("rotate", pinchrot);


        console.log("Touch Controller started");
    };  // Touch.Init()
}();   // Touch

/** hide event, this is called at end of each function: not currently needed except for debug */
function eventend(evt) {
    evt.preventDefault();
}


/**
Basic single finger below to operate without hammer.
These use the 'raw' low level events provided by the browser/nw.
*/
var tmoves;  // debugging
var ltt;    // used to simulate mousemoves before we jump on touchstart
var lasttouchtime;  // stop bad mouse events
function touchlog() {
    //log.apply(undefined, arguments);
}

function Touch2Init() {
    if (V.BypassHammer) {
        log(`V.BypassHammer flag set to true: skipping Touch2Init()`);
        return;
    }
    // on Hammer events we are able to set which as we like to simulate mouse
    // evt.which = TWHICH does not work on 'real' events we see in this code
    // (no error, but does not change the value)
    // so we treat touch exactly the same as left mouse
    var TWHICH = 1;
    canvas.ontouchstart = function(evt) {
        lasttouchtime = Date.now();
        var vn = getDispobj(evt);
        touchlog("touchstart " + evt.targetTouches.length + " vn=" + vn + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
        if (ltt !== vn) { lastDispobj = NODO; mousewhich = 0; canvmousemove(evt); }   // simulate jump
        touchlog("touchstart " + evt.targetTouches.length + " vn=" + vn + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
        Touch.lastscale = 1;
        Touch.lastrotation = 0;
        if (evt.targetTouches.length !== 1) return;
        mousewhich |= 1<<TWHICH;
        canvmousedown(evt);
        return eventend(evt);
    };

    canvas.ontouchmove = function(evt) {
        lasttouchtime = Date.now();
        var vn = getDispobj(evt); ltt = vn;
        touchlog("ontouchmove " + evt.targetTouches.length + " vn=" + vn);
        if (evt.targetTouches.length !== 1) return;
        canvmousemove(evt);
        tmoves++; msgfix("touches", tmoves);
        return eventend(evt);
    };

    canvas.ontouchend = function(evt) {
        lasttouchtime = Date.now();
        //var vn = getDispobj(evt); ltt = vn;
        if (evt.targetTouches.length !== 0) return;
        mousewhich &= ~(1<<TWHICH);
        canvmouseup(evt);
        touchlog("end ontouchend " + evt.targetTouches.length + "$mousewhich");
        return eventend(evt);
    };

    canvas.ontouchcancel = function(evt) {
        lasttouchtime = Date.now();
        log(">>>>>>>>> ontouchcancel " + evt.targetTouches.length);
        return eventend(evt);
    };
    log ("Touch2 initialized");
    Touch.Init();
}
