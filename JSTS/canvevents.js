/*
 * Code to handle mouse events on canvas (or underlying objects)
 */
"use strict";
var oldlayerX, oldlayerY, lastDispobj = NODO; // last offset for delta moves, last Dispobj for keys on dispobj
var lastDownLayerX, lastDownLayerY; // last down position
var lastTouchedDispobj = NODO;
var playingAudioEl;
var downTime, interactDownTime, taptime = 300;
var nomousetime = 1000; // time after touch to ignore mouse
var canvTransEnabled = true;
var debugsavedragObjDispobj; // debug
/** function to get rid of bad simulated mouse events, and monitor all interactions, real and simulated */
function badmouse(evt) {
    if (V.ignoreBadMouse)
        return false; //PJT: it's possible to reach this when V is undefined.
    if (evt.type.indexOf("mouse") !== -1 && Date.now() < lasttouchtime + nomousetime) {
        touchlog("threw away mouse event " + evt.type);
        return true;
    }
    // searchValues.onebutton makes it behave like a mouse with single button
    // relies on using code using evt.xwhich instead of evt.which
    evt.xwhich = evt.which;
    if (searchValues.onebutton) {
        evt.xwhich = evt.which ? 1 : 0;
        switch (evt.type) {
            case 'mousemove': return false;
            case 'mousedown':
                if ([1, 2, 4, 8, 16, 32, 64].indexOf(evt.buttons) === -1)
                    return log('ignoredown', evt.buttons);
                break;
            case 'mouseup':
                if (evt.buttons !== 0)
                    return log('ignoreup', evt.buttons);
                break;
        }
    }
    return false;
}
var _overmain;
/** mouse down on render area, find vp and make its object the target */
var canvmousedown = function (evt) {
    if (!canvTransEnabled)
        return;
    _canvdownGX = GX.interactions && GX.interactions.length !== 0; // && V.nocamscene.visible; // handled in datguix
    if (_canvdownGX)
        return;
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
    if (W.UICom.m_isProjVersion && evt.xwhich === 3)
        return killev(evt); // no pan in proj version?? or interaction with gestures
    if (evt.xwhich !== 0) // needed where t2() touch events are abused as mouse events.
        mousewhich |= 1 << evt.xwhich; // silly javascript, I must remember accumulated mouse buttons
    var dispobj = getDispobj(evt);
    touchlog("mousedown " + evt.type + " dispobj=" + dispobj + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
    if (dragObj && !dragObj.keystone) { // incorrect mousedown
        console.log("mousedown with drag dispobj already set");
        endDrag();
    }
    lastDispobj = lastTouchedDispobj = dispobj;
    if (dispobj === NODO)
        return undefined;
    if (WA.showrules.checked && dispobj.genes)
        setInput(WA.tranrulebox, dispobj.genes.tranrule);
    vpmousedown(evt, dispobj);
    var op = findMatop(evt); // update mouse status message
    if (inputs.dragmode && lastDispobj.vn !== mainvp && (mousewhich === 2 || mousewhich === 32 || mousewhich === 34)) {
        dragObj = { dispobj: dispobj };
        _overmain = false;
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
    if (mousewhich === 8 && dispobj !== NODO && dispobj.vn !== mainvp && !dualmode) {
        W.hoverdisplay.style.display = "none";
        canvmousemove(evt);
    }
    //~~~~ return killev(evt);
}; // canvmousedown
var maxSelected = 6;
/** select slot and maybe deselect another */
function selectDispobj(dispobj) {
    if (dualmode && dispobj.vn === mainvp)
        return; // can't select mainvp when in dual mode
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
var canvtap = () => { }; // unless set otherwise, eg by mutateTad
/** click on render area, find vp and make its object the target */
function canvmouseup(evt) {
    if (!canvTransEnabled)
        return;
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
        canvtap();
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
    currentDownTarget = undefined;
    mousewhich &= ~(1 << evt.xwhich);
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
    if (searchValues.simpledrag) {
        dragObj = undefined;
        return;
    }
    if (dragObj && dragObj.dispobj) {
        if (_overmain) {
            if (dualmode) {
                //??? dualdrag(A);
                serious('missing');
            }
            else {
                const xxxvp = extraDispobj.vn;
                const lrudo = lru();
                const lruvn = lrudo.vn;
                const dbdo = slots[dustbinvp].dispobj;
                extraDispobj.selected = false;
                slots[lruvn].dispobj = extraDispobj;
                extraDispobj.vn = lruvn;
                slots[dustbinvp].dispobj = lrudo;
                extraDispobj = slots[xxxvp].dispobj = dbdo;
                extraDispobj.vn = xxxvp;
                extraDispobj.visible = false;
                extraDispobj.cx = 99999;
                lrudo.lastTouchedDate = dbdo.lastTouchedDate = extraDispobj.lastTouchedDate = Date.now();
            }
            _overmain = undefined;
        }
        dragObj = undefined;
    }
}
/** handle mouse movement */
var dragObj = undefined; // dispobj being dragged
var _canvdownGX;
function canvmousemove(evt) {
    if (!canvTransEnabled)
        return;
    if ((GX.interactions && GX.interactions.length !== 0) || _canvdownGX)
        return;
    interacted(evt); // signal to automode
    if (badmouse(evt))
        return killev(evt);
    //###if (currentDownTarget !== undefined) return;  // moving on document
    var ddispobj = getDispobj(evt);
    if (ddispobj)
        W.hovermessage.innerHTML = ddispobj.hoverMessage; // make sure up to date
    touchlog("move button:" + evt.button + " " + evt.xwhich + "  type=" + evt.type + " dispobj=" + ddispobj + " $mousewhich$lastDispobj$lastTouchedDispobj$dragObj");
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
        let change = true;
        if (newSlot === NOVN)
            change = false;
        if (newSlot === dragObj.dispobj.vn)
            change = false;
        if (newSlot === mainvp && _overmain)
            change = false;
        if (change) { // it has found new place
            if (newSlot === dustbinvp) {
                killDispobj(dragObj.dispobj);
            }
            else if (_overmain) { // move out of mainvp
                // nb very similar to enter mainvp
                const xxxvp = extraDispobj.vn;
                const overdo = slots[newSlot].dispobj; // dispobj I'm pushing out
                const lrudo = lru();
                const lruvn = lrudo.vn;
                const dbdo = slots[dustbinvp].dispobj;
                slots[lruvn].dispobj = overdo;
                overdo.vn = lruvn; // send one I've just hit to lru
                slots[newSlot].dispobj = extraDispobj;
                extraDispobj.vn = newSlot; // send drag to lru position (still dragging so won't move there yet)
                slots[dustbinvp].dispobj = lrudo;
                lrudo.vn = dustbinvp; // send lru to distbin
                extraDispobj = slots[xxxvp].dispobj = dbdo;
                dbdo.vn = xxxvp; // recycle dustbin's dispobj as new extraDispobj
                dbdo.visible = false;
                dbdo.cx = 99999;
                lrudo.lastTouchedDate = dbdo.lastTouchedDate = extraDispobj.lastTouchedDate = Date.now();
                _overmain = false;
                //kinect.remap();  // leave to kinect code auto remap
                //log("post2 vns  A B AX", A.vn, B.vn, AX.vn);
            }
            else if (newSlot === mainvp) { // enter mainvp
                if (searchValues.simpledrag) {
                    const temp = copyFrom({}, currentGenes);
                    copyFrom(currentGenes, dragObj.dispobj.genes);
                    copyFrom(dragObj.dispobj.genes, temp);
                    dragObj = undefined;
                    mousewhich = 0;
                    centrescalenow(); // ?? we may not always want this, may want to make conditional, or fire event trigger
                }
                else {
                    let A = dragObj.dispobj, AX = extraDispobj;
                    AX.visible = true;
                    _overmain = true;
                    copyFrom(AX.genes, currentGenes);
                    copyFrom(currentGenes, A.genes);
                    newframe(AX);
                    var oldxx = extraDispobj.vn;
                    var oldvn = A.vn;
                    A.vn = oldxx;
                    extraDispobj = slots[oldxx].dispobj = A;
                    AX.vn = oldvn;
                    slots[oldvn].dispobj = AX;
                    AX.cx = A.cx;
                    AX.cy = A.cy;
                    centrescalenow(); // ?? we may not always want this, may want to make conditional, or fire event trigger
                }
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
                    let o = a;
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
    // right mouse drag for Director or pseudo-Rover
    if (mousewhich === 8 && ddispobj !== NODO && ddispobj.vn !== mainvp && !dualmode) {
        const cx = oldlayerX;
        const cy = height - oldlayerY;
        // separate code for Director
        if (ddispobj.vn <= reserveSlots) {
            const vn = ddispobj.vn;
            let dxx = (oldlayerX - ddispobj.cx) / ddispobj.width;
            if (vps[0] === 1)
                dxx = (oldlayerY - height + ddispobj.cy) / ddispobj.height;
            //log("anim", vn, dx);
            Director.stop(); // stop automatic animating (if any)
            Director.gotoSlot(vn, dxx); // and go to correct place
            //msgfix("draganim", vn, dx);
            canvas.style.cursor = "move"; // temp, better than nothing
            // return undefined;
        }
        // separate code for pseudo-Rover
        if (ddispobj.vn >= reserveSlots && lastTouchedDispobj.vn !== mainvp) {
            // forceCPUScale();  // to revisit ??? TODO commented out 14 Feb 19
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
        }
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
    // separate code for interactive edit
    if (editgenex) {
        var gn = editgenex.name;
        var val = currentGenes[gn];
        val += evt.movementX * editgenex.delta / 100;
        setval(gn, val);
        if (editgeney) {
            let gnn = editgeney.name;
            let vall = currentGenes[gnn];
            vall += evt.movementY * editgeney.delta / 100;
            setval(gnn, vall);
        }
    }
    if (evt.xwhich === 0 && evt.type !== "touchmove")
        return true; // on unexpected event, no which and not simulated
    if (mousewhich === 0)
        return true; // extra for firefoxx
    newframe();
    //msgfix("button =", evt.button + " "  + evt.xwhich);
    var sss = -0.01;
    var op = findMatop(evt); // find the op, and display it
    var u = undefined;
    var ltg = lastTouchedDispobj.genes;
    // so only rotate on z for web
    if (op === rot && !inputs.doxrot && !inputs.doyrot && inputs.dozrot)
        op = rotz;
    lastTraninteracttime = frametime;
    switch (op) {
        case rot:
            if (inputs.doAutorot && lastTouchedDispobj.vn === mainvp) {
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
            applyMatop(0, u, dx * sss, op, ltg);
            applyMatop(1, u, -dy * sss, op, ltg);
            break;
        case skew:
            applyMatop(0, 2, dx * sss, op, ltg);
            applyMatop(1, 2, -dy * sss, op, ltg);
            break;
        case persp:
            applyMatop(0, u, dx * sss, op, ltg);
            applyMatop(1, u, -dy * sss, op, ltg);
            break;
        case zoom:
            applyMatop(u, u, -dx * sss, op, ltg);
            applyMatop(u, u, dy * sss, op, ltg);
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
            break;
        default: throwe("unimplemented matop " + op);
    }
    interacttime = Date.now();
    return undefined;
    //return  killev(evt);
} // canvmousemove
/** set up handlers once canvas etc ready */
function canvready() {
    /** repeat down/up on document for wider reliability, but leave in canvas to ensure they are registered before findMatop */
    document.addEventListener("mousedown", function (evt) {
        if (badmouse(evt))
            return killev(evt);
        mousewhich |= 1 << evt.xwhich;
        findMatop(evt);
        touchlog("docdown$mousewhich");
        return undefined;
    });
    document.addEventListener("mouseup", function (evt) {
        if (badmouse(evt))
            return killev(evt);
        mousewhich &= ~(1 << evt.xwhich);
        findMatop(evt);
        touchlog("docup$mousewhich");
        return undefined;
    });
}
function canvmouseover(evt) {
    if (!canvTransEnabled)
        return;
    interacted(evt); // signal to automode
    clearkeys(evt); // reduce risk of polluted keys
    findMatop(evt);
    lastDispobj = getDispobj(evt); // make sure lastDispobj registered for key events
}
function canvmouseout(evt) {
    // if (!canvTransEnabled) return;  // we'll let this one happen
    clearkeys(evt); // reduce risk of polluted keys
    // dispmouseout(evt, lastDispobj); // NO .. gets confused when it goes eg onto hovercontrols
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
    if (!canvTransEnabled)
        return;
    // applyScale does not use pow
    var wheelk = 1.1;
    var sc = Math.pow(wheelk, -evt.wheelDelta / 100);
    applyScale(sc, lastTouchedDispobj.genes);
    newframe(lastTouchedDispobj);
    return killev(evt);
}
/** function for mouse wheel, apply scale to current (hover) dispobj by moving camera in/out */
function canvwheel(evt) {
    // applyScale does not use pow
    if (hoverDispobj === 'nodispobj')
        return;
    var wheelk = 1.1;
    // wheelDelta for Chrome etc, deltaY for Firefoxx
    var d = evt.wheelDelta ? -evt.wheelDelta / 120 : evt.deltaY;
    var sc = Math.pow(wheelk, d);
    applyScale(sc, hoverDispobj.genes);
    hoverDispobj.render();
    // newframe(lastTouchedDispobj);
    return killev(evt);
}
/** double click on render area, make current */
var canvdblclick = function (evt) {
    if (W.UICom.m_isProjVersion)
        return undefined; // canvdblclick is disabled for the projection version
    var dispobj = getDispobj(evt); // nb used layerX to help Firefoxx, but gives different answer than what I need
    if (dispobj === NODO)
        return undefined;
    if (dualmode) {
        dualdrag(dispobj);
        killev(evt);
        return false;
    }
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
            centrescalenow();
            newmain();
            canvdblclick.lastdispobj = dispobj;
            updateGuiGenes();
            if (dispobj.vn <= reserveSlots)
                Director.gotoSlot(dispobj.vn);
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
/** handle in canvmousedown/up, and do not propogate click */
function canvclick(evt) {
    // return killev(evt);
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
    // if (dualmode && rdo.vn === mainvp) rdo = NODO  // do in selected
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
    lastDownLayerX = oldlayerX = offx(evt);
    lastDownLayerY = oldlayerY = offy(evt);
    var genes = dispobj.genes;
    if (!genes)
        return;
    if (WA.staticAudio)
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
    setGUITranrule(genes);
}
setInput('dragmode', false); // whether working in drag mode or conventional
setInput('hovermode', true); // whether to allow hover menu over mutations panes
// /** mouse has just left lDispobj; can be confused when mouse goes on to hover controls so we get unwanted 'leave' which removes controls */
// function dispmouseout(evt, lDispobj) {
//     W.hoverdisplay.style.display = 'none';
//     lastDispobj = NODO;  // TODO ??? this should be onblur
// }
var hoverDispobj = NODO; // was let ... var for sharing with .js files
/** mouse has just moved over nDispobj */
function dispmouseover(evt, nDispobj, lDispobj) {
    hoverDispobj = nDispobj; // do this anyway
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
    if (inputs.hovermode) { // do not use highlights in dragmode
        // TODO layout below wrong when canvas not mapped 1..1 (eg width !== style.width)
        const ismain = nDispobj.vn === mainvp;
        var border = ismain ? 0 : 1;
        const canvr = +canvas.style.width.replace('px', '') / canvas.width;
        let rr = canvr; //  / devicePixelRatio;
        W.hoverborder.style.width = (nDispobj.width - border * 2.5) * rr + 'px';
        W.hoverborder.style.height = (nDispobj.height - border) * rr + 'px';
        W.hoverdisplay.style.left = (de.offsetLeft + nDispobj.left - 1) * rr + "px";
        W.hoverdisplay.style.top = (de.offsetTop + height - nDispobj.top) * rr + "px";
        W.hovercontrols.style.left = (border * 2) * rr + "px";
        W.hovercontrols.style.fontSize = 75 * rr + '%';
        W.hoverdisplay.style.width = '';
        if (nDispobj.width + nDispobj.left > width - 50) {
            W.hoverdisplay.style.width = '9999px';
            W.hovercontrols.style.left = "-4em";
        }
        W.hoverdisplay.style.display = mousewhich === 8 ? 'none' : '';
        W.hovercontrols.style.display = ismain ? 'none' : '';
        W.hoverborder.style.display = vps[0] < 2 && vps[1] < 2 ? 'none' : '';
        W.hovermessage.innerHTML = nDispobj.hoverMessage;
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
/** drop or paste onto canvas */
function canvdroppaste(text, evt) {
    if (text.match(/{\s*"genes"\:/)) {
        const ngenes = JSON.parse(text).genes;
        const genes = xxxgenes(hoverDispobj);
        copyFrom(genes, ngenes);
        hoverDispobj.render();
        return true;
    }
    return false;
}
//# sourceMappingURL=canvevents.js.map