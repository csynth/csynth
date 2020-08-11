/*
 * Code to handle mouse events on canvas (or underlying objects)
 */
"use strict";
var oldlayerX, oldlayerY, lastDispobj = NODO; // last offset for delta moves, last Dispobj for keys on dispobj
var lastTouchedDispobj = NODO;
var staticAudio = false, playingAudioEl;
var downTime, interactDownTime, taptime = 300;
var nomousetime = 1000; // time after touch to ignore mouse
var debugsavedragObjDispobj; // debug
/** function to get rid of bad simulated mouse events, and monitor all interactions, real and simulated */
function badmouse(evt) {
    if (V.ignoreBadMouse)
        return false; //PJT: it's possible to reach this when V is undefined.
    if (evt.type.indexOf("mouse") !== -1 && Date.now() < lasttouchtime + nomousetime) {
        touchlog("threw away mouse event " + evt.type);
        return true;
    }
    return false;
}
/** mouse down on render area, find vp and make its object the target */
var canvmousedown = function (evt) {
    interacted(evt); // signal to automode
    interactDownTime = Date.now();
    if (badmouse(evt))
        return killev(evt);
    canvmousedown.lastActive = document.activeElement; // remember because events later down the chain (MLCaspture) may want to know
    //    canvas.focus();  // ensure mousemove, keystrokes seen right as well
    // giving canvas focus has bad performance impact for some reason,
    // so delegating the keystrokes from document events instead (guidoc.js)
    // document.body.focus();  // does not work
    document.activeElement.blur();
    if (W.UICom.m_isProjVersion && evt.which === 3)
        return killev(evt); // no pan in proj version?? or interaction with gestures
    if (evt.which !== 0) // needed where t2() touch events are abused as mouse events.
        mousewhich |= 1 << evt.which; // silly javascript, I must remember accumulated mouse buttons
    var dispobj = getDispobj(evt);
    touchlog("mousedown " + evt.type + " dispobj=" + dispobj + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
    if (dragObj && !dragObj.keystone) { // incorrect mousedown
        console.log("mousedown with drag dispobj already set");
        endDrag();
    }
    lastDispobj = lastTouchedDispobj = dispobj;
    if (dispobj === NODO)
        return undefined;
    vpmousedown(evt, dispobj);
    var op = findMatop(evt); // update mouse status message
    if (dragmode && lastDispobj.vn !== mainvp && (mousewhich === 2 || mousewhich === 32 || mousewhich === 34)) {
        dragObj = { dispobj: dispobj };
        dragObj.dispobj.overmain = false;
    }
    //
    //!!! unconditional select
    //if (vp && !vp.dispobj.selected) {
    //    vp.dispobj.selected = true;
    // updatevp(vn);
    //}
    if (mousewhich === 2) {
        if (dispobj.selected) {
            downTime = { time: Date.now(), dispobj: dispobj };
        }
        else {
            selectDispobj(dispobj);
            //if (WA.interfaceSounds) interfaceSounds.bip1.play();
            downTime = { time: Date.now() };
        }
        // dispobj.needsPaint = true;
    }
    // for director or pseudo-rover
    if (mousewhich === 8 && dispobj !== NODO && dispobj.vn !== mainvp) {
        canvmousemove(evt);
    }
    return killev(evt);
}; // canvmousedown
var maxSelected = 6;
/** select slot and maybe deselect another */
function selectDispobj(dispobj) {
    dispobj.selected = Date.now();
    // find count, and oldest (we may want to deselect oldest rather than this???)
    var oldestdate = dispobj.selected;
    var oldest = dispobj;
    var n = 0;
    for (var s in currentObjects) {
        var dispo = currentObjects[s];
        if (dispo.selected) {
            n++;
            if (dispo.selected < oldestdate) {
                oldestdate = dispo.selected;
                oldest = dispo;
            }
        }
    }
    if (n > maxSelected) {
        oldest.selected = false; // deselect oldest, questionable for 'real' use, better for exhibition
        //dispobj.selected = false;  // refuse to select this
    }
    showSelectedSlots();
}
/** click on render area, find vp and make its object the target */
function canvmouseup(evt) {
    if (badmouse(evt))
        return killev(evt);
    oldlayerX = offx(evt); // I would have expected to see a move first, but we don't
    oldlayerY = offy(evt);
    if (downTime && Date.now() < downTime.time + taptime) {
        if (downTime.dispobj) {
            downTime.dispobj.selected = false; /*updatevp(downTime.vn);*/
            newframe();
            //if (WA.interfaceSounds) interfaceSounds.bip2.play();
        }
        // TODO >>> we should probably send the event rather than wrapping it
        // and we need offx etc
        if (evt.changedTouches) {
            const t = evt.changedTouches[0];
            Maestro.trigger('tap', { clientX: t.clientX, clientY: t.clientY });
        }
        else {
            Maestro.trigger('tap', { clientX: oldlayerX, clientY: oldlayerY });
        }
    }
    lastsrc = undefined;
    mousewhich &= ~(1 << evt.which);
    touchlog("mouseup " + evt.type + "  $mousewhich");
    var op = findMatop(evt);
    if (!W.UICom.m_isProjVersion) { // canvmouseup so autorot gets going again after a bit
        interacttime = Date.now();
        setTimeout(newframe, autopause);
    }
    endDrag();
    canv2d.style.display = "none";
    return undefined;
    //return killev(evt);
} // canvmouseup
function isDragobj(dispobj) {
    return dragObj && dragObj.dispobj === dispobj;
}
function endDrag() {
    if (dragObj && dragObj.dispobj) {
        //var newSlot = getSlotForXY(dragObj.dispobj.cx, dragObj.dispobj.cy);
        //if (newSlot === mainvp)
        //    swapvp(slots[newSlot].dispobj, dragObj.dispobj);
        if (dragObj.dispobj.overmain) {
            // B    A   C     AX is the new main, clone of A
            //      AX
            // ->
            // B    A   A
            var o = dragObj.dispobj.overmain;
            var A = o.A, AX = o.AX;
            swapvp(A, AX);
            slots[mainvp].dispobj = A; // just in case
            A.placeatslot(mainvp); // stop anim of main slot
            newframe(A);
            AX.visible = false;
            dragObj.dispobj.overmain = undefined;
            snap(); // so we don't lose A
            correctSlots();
        }
        dragObj = undefined;
    }
}
/** handle mouse movement */
var dragObj = undefined; // dispobj being dragged
function canvmousemove(evt) {
    if (badmouse(evt))
        return killev(evt);
    //###if (lastsrc !== undefined) return;  // moving on document
    var ddispobj = getDispobj(evt);
    touchlog("move button:" + evt.button + " " + evt.which + "  type=" + evt.type + " dispobj=" + ddispobj + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
    if (ddispobj.name)
        msgfix('dispobj name', ddispobj.name);
    else
        msgfix('dispobj name');
    var dx = offx(evt) - oldlayerX;
    var dy = offy(evt) - oldlayerY;
    if (dx || dy)
        delayTurnoffCursor(); // we get mousemove events even when the mouse doesn't move, so ignore them
    oldlayerX = offx(evt);
    oldlayerY = offy(evt);
    // K key for keystone movement
    if (dragObj && dragObj.keystone !== undefined && mousewhich === 2) {
        Dispobjmodcorners(dragObj.keystone, dx, dy);
        return undefined;
    }
    // separate code for dragmode
    if (dragObj && dragObj.dispobj) {
        if (mousewhich === 0) {
            log(">>> error in canvmousemove, dragObj.dispobj and mousewhich === 0");
            endDrag();
            return;
            //mousewhich = 0;
            //dragObj.dispobj = NODO;
        }
        var x = dragObj.dispobj.cx += dx; // drag
        var y = dragObj.dispobj.cy -= dy;
        var newSlot = getSlotForXY(x, y); // potential I have dragged over
        if (newSlot !== NOVN && newSlot !== dragObj.dispobj.vn) { // it has found new place
            if (newSlot === dustbinvp) {
                killDispobj(dragObj.dispobj);
            }
            else if (dragObj.dispobj.overmain) { // move out of mainvp
                // AX == mainvp has animated version of dragger which will be lost
                // will be replaced by original
                // B    A   C     AX is the new main, clone of A
                //      AX
                // ->
                // C    B   A
                var o = dragObj.dispobj.overmain;
                var A = o.A, B = o.B, AX = o.AX;
                //log("pre2 vns A B AX", A.vn, B.vn, AX.vn);
                var C = slots[newSlot].dispobj;
                swapvp(A, AX); // to get the bit renderTarget onto A
                swapvp(B, C); // temp move of B to rhs
                swapvp(A, B); // get A, B all ok
                AX.visible = false;
                A.overmain = undefined;
                //kinect.remap();  // leave to kinect code auto remap
                //log("post2 vns  A B AX", A.vn, B.vn, AX.vn);
            }
            else if (newSlot === mainvp) { // move onto mainvp
                // A    B   C     A is dragObj.dispobj, B is main
                // ->
                // B    A   C     AX is the new main, clone of A
                //      AX
                // get there by putting AX into old A position, then swapping AX and B
                // (swapping with mainvp handles the renderTarget swap)
                A = dragObj.dispobj;
                B = slots[mainvp].dispobj;
                AX = extraDispobj;
                debugsavedragObjDispobj = A;
                A.overmain = { A: A, B: B, AX: AX };
                //log("pre1 vns  A B AX", A.vn, B.vn, AX.vn);
                AX.visible = true; // extraDispobj takes snap of dragObj.dispobj
                AX.genes = clone(A.genes);
                var oldvn = A.vn;
                AX.vn = oldvn;
                slots[oldvn].dispobj = AX;
                AX.placeatslot(oldvn);
                A.vn = mainvp; // but not the 'main' mainvp
                newframe(AX);
                newframe(B);
                swapvp(B, AX);
                correctSlots();
                //kinect.remap();  // leave to kinect code auto remap
                //log("post1 vns  A B AX", A.vn, B.vn, AX.vn);
                //renderFrame();
            }
            else {
                if (inputs.layoutbox === "0") { // swap keeping order. e.g. working mode
                    var a = dragObj.dispobj.vn;
                    var b = newSlot;
                    var dir = a > b ? -1 : 1;
                    //log(">>>>swap", a, b);
                    o = a;
                    for (var i = a + dir; o !== b; i += dir) {
                        if (!slots[i] || i === mainvp)
                            continue;
                        //log("swap", o, i);
                        swapvp(o, i);
                        o = i;
                    }
                }
                else {
                    swapvp(slots[newSlot].dispobj, dragObj.dispobj); // swap adjacent but lose order, e.g. exhibition mode
                }
            }
            //dragObj.dispobj = lastTouchedDispobj = lastDispobj = newVn;
        }
        else if (x < 0 || width < x || y < 0 || height < y) {
            killDispobj(dragObj.dispobj);
        }
        newframe();
        return undefined;
    } // dragObj || dragObj.dispobj
    // separate code for Director
    if (mousewhich === 8 && ddispobj !== NODO && ddispobj.vn !== mainvp && ddispobj.vn <= reserveSlots) {
        var vn = ddispobj.vn;
        let dxx = (oldlayerX - ddispobj.cx) / ddispobj.width;
        if (vps[0] === 1)
            dxx = (oldlayerY - height + ddispobj.cy) / ddispobj.height;
        //log("anim", vn, dx);
        Director.stop(); // stop automatic animating (if any)
        Director.gotoSlot(vn, dxx); // and go to correct place
        //msgfix("draganim", vn, dx);
        canvas.style.cursor = "move"; // temp, better than nothing
        return undefined;
    }
    // separate code for pseudo-Rover
    if (mousewhich === 8 && ddispobj !== NODO && ddispobj.vn !== mainvp && ddispobj.vn >= reserveSlots && lastTouchedDispobj.vn !== mainvp) {
        // forceCPUScale();  // to revisit ??? TODO commented out 14 Feb 19
        var cx = oldlayerX;
        var cy = height - oldlayerY;
        for (let oo in currentObjects) {
            var dispobj = currentObjects[oo];
            dispobj.ppp = Math.min(999, Math.pow((dispobj.cx - cx) * (dispobj.cx - cx) + (dispobj.cy - cy) * (dispobj.cy - cy), -1));
        }
        makeaverage();
        //var kk = (ddispobj.cx-cx > 0 ? 0 : 1) + (ddispobj.cy-cy > 0 ? 0 : 2);
        //var cc = ['n', 'e', 'ne', 'se'][kk];
        //cc = "nwse";
        //msgfix("kk", kk, cc);
        //canvas.style.cursor = cc + "-resize";  // temp, better than nothing
        canv2d.style.display = "";
        var ctx = canv2d.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, height - cy);
        ctx.lineTo(ddispobj.cx, height - ddispobj.cy);
        ctx.stroke();
        canvas.style.cursor = "pointer";
        return undefined;
    }
    var newDispobj = getDispobj(evt); // to help with key events
    var isnewDispobj = lastDispobj !== newDispobj;
    lastDispobj = newDispobj;
    if (isnewDispobj)
        findMatop(evt); // to update msg
    hoverMutate(lastDispobj);
    if (evt.which === 0 && evt.type !== "touchmove")
        return true; // on unexpected event, no which and not simulated
    if (mousewhich === 0)
        return true; // extra for firefoxx
    newframe();
    //msgfix("button =", evt.button + " "  + evt.which);
    var sss = -0.01;
    var op = findMatop(evt); // find the op, and display it
    var U = undefined;
    var ltg = lastTouchedDispobj.genes;
    // so only rotate on z for web
    if (op === rot && !inputs.doxrot && !inputs.doyrot && inputs.dozrot)
        op = rotz;
    lastTraninteracttime = frametime;
    switch (op) {
        case rot:
            if (inputs.doAutorot) {
                canvdamp(dx, dy);
            }
            else {
                applyMatop(0, 2, dx * sss, op, ltg);
                applyMatop(1, 2, -dy * sss, op, ltg);
            }
            break;
        case rotw:
            if (inputs.doAutorot) {
                canvdampw(dx, dy);
            }
            else {
                applyMatop(0, 3, dx * sss, rot, ltg);
                applyMatop(1, 3, -dy * sss, rot, ltg);
            }
            break;
        case pan:
            applyMatop(0, U, dx * sss, op, ltg);
            applyMatop(1, U, -dy * sss, op, ltg);
            break;
        case skew:
            applyMatop(0, 2, dx * sss, op, ltg);
            applyMatop(1, 2, -dy * sss, op, ltg);
            break;
        case persp:
            applyMatop(0, U, dx * sss, op, ltg);
            applyMatop(1, U, -dy * sss, op, ltg);
            break;
        case zoom:
            applyMatop(U, U, -dx * sss, op, ltg);
            applyMatop(U, U, dy * sss, op, ltg);
            break;
        case rotz:
            if (inputs.doAutorot) {
                canvdampz(dx - dy);
            }
            else {
                applyMatop(0, 1, (dx - dy) * sss, rot, ltg);
            }
            break;
        case rotzw:
            applyMatop(2, 3, dx * sss, rot, ltg);
            applyMatop(2, 3, -dy * sss, rot, ltg);
            break;
        case matnop:
            if (editgenex) {
                var gn = editgenex.name;
                var val = currentGenes[gn];
                val += evt.webkitMovementX * editgenex.delta / 100;
                setval(gn, val);
                if (editgeney) {
                    let gnn = editgeney.name;
                    let vall = currentGenes[gnn];
                    vall += evt.webkitMovementY * editgeney.delta / 100;
                    setval(gnn, vall);
                }
            }
            break;
        default: throwe("unimplemented matop " + op);
    }
    interacttime = Date.now();
    return undefined;
    //return  killev(evt);
} // canvmousemove
/** repeat down/up on document for wider reliability, but leave in canvas to ensure they are registered before findMatop */
document.addEventListener("mousedown", function (evt) {
    if (badmouse(evt))
        return killev(evt);
    mousewhich |= 1 << evt.which;
    findMatop(evt);
    touchlog("docdown$mousewhich");
    return undefined;
});
document.addEventListener("mouseup", function (evt) {
    if (badmouse(evt))
        return killev(evt);
    mousewhich &= ~(1 << evt.which);
    findMatop(evt);
    touchlog("docup$mousewhich");
    return undefined;
});
function canvmouseover(evt) {
    clearkeys(evt); // reduce risk of polluted keys
    findMatop(evt);
    lastDispobj = getDispobj(evt); // make sure lastDispobj registered for key events
}
function canvmouseout(evt) {
    clearkeys(evt); // reduce risk of polluted keys
    // lastDispobj = NODO;  // TODO XXX this should be onblur
}
/** called once per frame, this 0 damp will fight new movement
* so we just let new movement have greater effect. */
function canvFrame() {
    if (inputs.doFixrot)
        return;
    if (mousewhich !== 0) { // operate on mainvp wherever the touch } && lastTouchedDispobj.vn === mainvp) {
        canvdamp(0, 0);
        canvdampw(0, 0);
        canvdampz(0);
    }
}
var rotHalflife = 300;
/** apply damped rotation from delta movement */
function canvdamp(dx, dy) {
    if (!mousewhich || (document.activeElement !== canvas && document.activeElement !== document.body))
        return;
    if (inputs.grot === 0 && (dx !== 0 || dy !== 0)) {
        inputs.grot = 1;
        inputs.xzrot = inputs.yzrot = inputs.xyrot = 0;
    }
    var gr = Math.pow(inputs.grot, 3);
    inputs.xzrot = dodamp(inputs.xzrot, dx === 0 ? 0 : -dx / gr, rotHalflife);
    inputs.yzrot = dodamp(inputs.yzrot, dy === 0 ? 0 : dy / gr, rotHalflife);
    if (Math.abs(inputs.xzrot) < 0.05)
        inputs.xzrot = 0;
    if (Math.abs(inputs.yzrot) < 0.05)
        inputs.yzrot = 0;
    setInput(W.xzrot, inputs.xzrot, true);
    setInput(W.yzrot, inputs.yzrot, true);
    if (inputs.xzrot !== 0 || inputs.yzrot !== 0)
        newframe();
}
/** apply damped w rotation from delta movement */
function canvdampw(dx, dy) {
    if (!mousewhich || (document.activeElement !== canvas && document.activeElement !== document.body))
        return;
    if (inputs.grot === 0 && (dx !== 0 || dy !== 0)) {
        inputs.grot = 1;
        inputs.xzrot = inputs.yzrot = inputs.xyrot = 0;
    }
    var gr = Math.pow(inputs.grot, 3);
    inputs.xwrot = dodamp(inputs.xwrot, dx === 0 ? 0 : -dx / gr, rotHalflife);
    inputs.ywrot = dodamp(inputs.ywrot, dy === 0 ? 0 : dy / gr, rotHalflife);
    if (Math.abs(inputs.xwrot) < 0.05)
        inputs.xwrot = 0;
    if (Math.abs(inputs.ywrot) < 0.05)
        inputs.ywrot = 0;
    setInput(W.xwrot, inputs.xwrot, true);
    setInput(W.ywrot, inputs.ywrot, true);
    if (inputs.xwrot !== 0 || inputs.ywrot !== 0)
        newframe();
}
/** apply damped z rotation from delta movement */
function canvdampz(dz) {
    if (!mousewhich)
        return;
    var gr = Math.pow(inputs.grot, 3);
    if (dz !== undefined)
        inputs.xyrot = dodamp(inputs.xyrot, -dz / gr, rotHalflife);
    if (Math.abs(inputs.xyrot) < 0.05)
        inputs.xyrot = 0;
    //tryseteleval("xyrot", inputs.xyrot);
    if (inputs.xyrot !== 0)
        newframe();
    //log("$inputs.xzrot$inputs.xyrot");
}
/** function for mouse wheel, probably dead??? NOT DEAD Oct 2014 */
function canvmousewheel(evt) {
    // applyScale does not use pow
    var wheelk = 1.1;
    var sc = Math.pow(wheelk, -evt.wheelDelta / 100);
    applyScale(sc, lastTouchedDispobj.genes);
    newframe(lastTouchedDispobj);
    return killev(evt);
}
/** function for mouse wheel */
function canvwheel(evt) {
    // applyScale does not use pow
    var wheelk = 1.1;
    // wheelDelta for Chrome etc, deltaY for Firefoxx
    var d = evt.wheelDelta ? -evt.wheelDelta / 120 : evt.deltaY;
    var sc = Math.pow(wheelk, d);
    applyScale(sc, lastTouchedDispobj.genes);
    newframe(lastTouchedDispobj);
    return killev(evt);
}
/** double click on render area, make current */
var canvdblclick = function (evt) {
    if (W.UICom.m_isProjVersion)
        return undefined; // canvdblclick is disabled for the projection version
    var dispobj = getDispobj(evt); // nb used layerX to help Firefoxx, but gives different answer than what I need
    if (dispobj === NODO)
        return undefined;
    if (dispobj.genes) {
        if (dispobj.vn === mainvp) {
            if (canvdblclick.lastdispobj) {
                copyFrom(canvdblclick.lastdispobj.genes, currentGenes);
                newframe(canvdblclick.lastdispobj);
                Director.framesFromSlots();
            }
        }
        else {
            copyFrom(currentGenes, dispobj.genes);
            // resetMat();
            newmain();
            canvdblclick.lastdispobj = dispobj;
            updateGuiGenes();
        }
        Director.stop();
        //document.body.focus();
        //canvas.focus();
        //setTimeout(function() { canvas.focus(); }, 1);
        //setTimeout(function() { document.body.focus(); }, 10);
        //setTimeout(function() { canvas.focus(); }, 100);
    }
    //forcerefresh = true;
    //showSelectedSlots();
    return killev(evt) && false;
};
/** prevent context menu on rght click on graphics, http://stackoverflow.com/questions/6789843/disable-right-click-menu-in-chrome */
function canvoncontextmenu(evt) {
    return killev(evt);
}
/** handle in down/up, and do not propogate click */
function canvclick(evt) {
    return killev(evt);
}
/** find Dispobj for event */
function getDispobj(evt) {
    //var x = offx(evt), y = height - offy(evt);
    //var x = evt.offsetX, y = height - evt.offsetY;
    //var x = evt.clientX, y = height - evt.clientY;
    if (evt.target !== canvas)
        return NODO;
    var x = offx(evt), y = height - offy(evt);
    var rdo = getDispobjp(x, y);
    if (rdo !== lastDispobj)
        dispmouseover(evt, rdo, lastDispobj); // is this the best place to check ???
    newframe(); // forcing this here may make extra newframes, but will catch lots in a single line
    return rdo;
}
/** find Dispobj for x,y */
function getDispobjp(x, y) {
    if (Dispobj.singleViewInteract)
        return slots[mainvp].dispobj;
    var rdo = NODO;
    for (var o in currentObjects) {
        var dj = currentObjects[o];
        if ((isDragobj(dj)) || dj.vn === -1)
            continue;
        if (!dj.visible)
            continue;
        if (dj.left <= x && x <= dj.right && dj.bottom < y && y < dj.top) {
            rdo = dj;
            break;
        }
    }
    return rdo;
}
/** find vn for x,y ~ I really want a slot, not a dispobj*/
function getSlotForXY(x, y) {
    var rvn = NOVN;
    for (var vn = 0; vn < slots.length; vn++) { // scan slots for x,y
        var vp = slots[vn];
        if (vp && vp.x <= x && x <= vp.x + vp.width && vp.y < y && y < vp.y + vp.height) {
            rvn = vn;
            break;
        }
    }
    return rvn;
}
/** gene to edit on mousemouve */ var editgenex, editgeney;
function vpmousedown(evt, dispobj) {
    dispobj.lastTouchedDate = Date.now();
    oldlayerX = offx(evt);
    oldlayerY = offy(evt);
    var genes = dispobj.genes;
    if (!genes)
        return;
    if (dispobj.genes) {
        if (staticAudio)
            playStaticAudio(dispobj.vn);
        if (evt.ctrlKey) {
            dispobj.selected = !dispobj.selected;
            //forcerefresh = true;
            showSelectedSlots();
        }
        else {
            // mouse down only brings object to middle if not animating
            // removed UICom condition for steering in the proj version
            if (!inputs.doAnim || !hoverSteerMode || W.UICom.m_isProjVersion) { // ordinary vp click
                //updatevp(vn);
                //if (view ports[lastTouchedDispobj] ) {
                //    updatevp(lastTouchedDispobj);
                //}
                // target related stuff moved to vpchoose
                if (healthMutateSettings.touchHealth)
                    healthTarget = dispobj;
                // >>> NO STEMS loadStemForView port(vn);
            }
        }
    }
}
var dragmode = true; // whether working in drag mode or conventional
/** mouse has just moved over nDispobj */
function dispmouseover(evt, nDispobj, lDispobj) {
    if (!W.hoverdisplay)
        return;
    var de = canvas;
    if (nDispobj === NODO) {
        W.hoverdisplay.style.display = "none";
        msgfix("obj", "none");
        return;
    }
    if (nDispobj.genes)
        msgfix("obj", nDispobj.genes.name);
    if (!dragmode) { // do not use highlights in dragmode
        var border = 1;
        W.hoverborder.style.width = (nDispobj.width - border * 2.5) + 'px';
        W.hoverborder.style.height = (nDispobj.height - border) + 'px';
        W.hoverdisplay.style.left = (de.offsetLeft + nDispobj.left) + "px";
        W.hoverdisplay.style.top = (de.offsetTop + de.offsetHeight - nDispobj.top) + "px";
        W.hoverdisplay.style.display = "";
    }
}
/** operations on hovered dispobj */
function vpvoteup() {
    selectDispobj(lastDispobj);
}
function vpvotedown() {
    lastDispobj.selected = false;
    showSelectedSlots();
}
function vpchoose() {
    settarget(clone(xxxgenes(lastDispobj)), undefined);
    //if (evt.shiftKey) constrain(target);
    setGUITranrule(target);
    if (target.ribsref === 0)
        target.ribsref = target.ribs0;
    newframe();
}
function vpreplace() {
    setgenes(lastDispobj, clone(currentGenes));
    lastDispobj.render();
}
function vpswap() {
    var t = clone(currentGenes);
    vpchoose();
    setgenes(lastDispobj, t);
    updatevp(lastDispobj);
}
function vpkill() {
    setgenes(lastDispobj, undefined);
    updatevp(lastDispobj);
}
function setCanvasEvents() {
    canvas.ondblclick = canvdblclick;
    canvas.onclick = canvclick;
    canvas.onmousedown = canvmousedown;
    canvas.onmouseup = canvmouseup;
    canvas.onmousemove = canvmousemove;
    canvas.onmouseover = canvmouseover;
    canvas.onmouseout = canvmouseout;
    canvas.onmousewheel = canvmousewheel; //  dead?
    canvas.onwheel = canvwheel;
    canvas.oncontextmenu = canvoncontextmenu;
}
function clearCanvasEvents() {
    canvas.ondblclick = undefined;
    canvas.onclick = undefined;
    canvas.onmousedown = undefined;
    canvas.onmouseup = undefined;
    canvas.onmousemove = undefined;
    canvas.onmouseover = undefined;
    canvas.onmouseout = undefined;
    canvas.onmousewheel = undefined; //  dead?
    canvas.onwheel = undefined;
    canvas.oncontextmenu = undefined;
    canvas.onkeydown = undefined;
    canvas.onkeyup = undefined;
    canvas.onfocus = undefined;
    canvas.onblur = undefined;
}
//# sourceMappingURL=canvevents.js.map