/*
 * Code to handle document level gui interaction.
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";
var exhibitionMode = false;
var lastdocx, lastdocy, lastsrc, yaml, runTimedScript, E; //should be in vars.ts?
/** document mouse down  */
function docmousedown(evt) {
    interactDownTime = Date.now();
    //console.log("docmousedown: " + evt.target.className + " " + evt.target.value);
    lastsrc = evt.target;
    lastdocx = evt.clientX;
    lastdocy = evt.clientY;
    //trancontextmenu.style.display = "none";
    //horncontextmenu.style.display = "none";
    if (evt.altKey && evt.ctrlKey && evt.shiftKey && evt.buttons == 2) {
        makeDraggable(evt.srcElement);
    }
}
/** document mouse move  */
const docmousemove = function (evt) {
    if (canvas.width === 1920 && screens[0].width === 1680)
        setSize(); // oddity on Stephen's machine during MLcapture, maybe other times too?
    docmousemove.lastmove = evt.target; // remember for delegating key events
    //    msgfix("docmove", evt.target.id, evt.target.toString());
    lastTraninteracttime = frametime;
    var dx = evt.clientX - lastdocx;
    var dy = evt.clientY - lastdocy;
    lastdocx = evt.clientX;
    lastdocy = evt.clientY;
    if (lastsrc === undefined)
        return;
    var rname = lastsrc.value || lastsrc.innerHTML;
    if (lastsrc.className === "name" && rname.indexOf("red") !== -1) {
        var gname = rname.replace("red", "green");
        var bname = rname.replace("red", "blue");
        var r = currentGenes[rname];
        var g = currentGenes[gname];
        var b = currentGenes[bname];
        // console.log(" >>" + lastsrc.value + " dx=" + dx + " " + r + " " + g + " " + b);
        // in case of silly error
        if (r === undefined)
            r = 0.5;
        if (g === undefined)
            g = 0.5;
        if (b === undefined)
            b = 0.5;
        var hsv = rgb2hsv(r, g, b);
        hsv.h += dx;
        hsv.s -= dy;
        var rgb = hsv2rgb(hsv);
        if (isNaN(rgb.r * rgb.b * rgb.g)) {
            rgb.setRGB(r, g, b);
        }
        setval(rname, rgb.r);
        setval(gname, rgb.g);
        setval(bname, rgb.b);
    }
};
/** document mouse up  */
function docmouseup(evt) {
    lastsrc = undefined;
}
/** document mouse up  */
function docmouseout(evt) {
    //console.log("docmouseout");
    //lastsrc = undefined;
}
function docmouseleave(evt) {
    //console.log("docmouseleave", evt.offsetX);
    // We sometimes get false docmouseleave on gui changes, this seems to help
    if (evt.offsetX < 0) // only for genuine leave to the lhs
        showControls(false);
}
function docmouseenter(evt) {
    //console.log("docmouseenter");
    if (offx(evt) < 200 && !oxcsynth && !reserveSlots)
        showControls(true); // move in from left (especially on dual screen)
}
function docfocus(evt) {
    clearkeys(evt);
    canvas.blur();
}
function docblur(evt) {
    clearkeys(evt);
    mousewhich = 0;
    dragObj = undefined;
}
/** set ctrl-alt-shift right: they will appear in this order whatever order pressed */
function setkeyscad(evt) {
    removeElement(keysdown, 'ctrl');
    removeElement(keysdown, 'alt');
    removeElement(keysdown, 'shift');
    if (evt.shiftKey)
        keysdown.splice(0, 0, 'shift');
    if (evt.altKey)
        keysdown.splice(0, 0, 'alt');
    if (evt.ctrlKey)
        keysdown.splice(0, 0, 'ctrl');
}
/** clear keys in case we have got out of sync */
function clearkeys(evt) {
    keysdown = [];
    setkeyscad(evt);
    cancelcontext();
    //lastDispobj = lastTouchedDispobj = NODO;
    //mousewhich = 0;
}
var keysdown = [];
var currentpick = "";
var inedit = false;
/** key down, check for a few special cases */
function dockeydown(evt) {
    interactDownTime = Date.now();
    newmain();
    //W.msgbox.style.display = "";
    var ff = keyname(evt.keyCode);
    if (ff === 'V' && keysdown.length === 0 && WA.killdown)
        WA.killdown();
    if (ff !== 'F2' && ff !== 'F4' && ff !== 'F6' && ff !== 'F12')
        exhibitionMode = false; // if keyboard not exhibition
    W.startscreen.style.display = 'none'; // in case things get stuck, or for early debug
    //console.log("doc keyname " + ff + "  identifier " + evt.keyIdentifier + " char '" + evt.charCode);
    // clean up keys we can that may have got confused by change of focus
    // alt often a problem, eg after alt-tab
    if (ff === 'escape') {
        nomess('release');
        if (!WA.msgfix_messages) { // in case esc called with msgbox hidden.
            // msgfix.force();
            WA.msgbox.click();
            return;
        }
        window.getSelection().removeAllRanges(); // in case of selection of non-dislayed item
        clearkeys(evt);
        msgfix();
        // if (evt.shiftKey) nomess(); // force removal of all messages
        msgboxVisible(); // toggle hidden msgbox
        return undefined;
    } // escape to clear keys in case we get out of sync
    var repeat = (keysdown.indexOf(ff) !== -1);
    if (!repeat)
        addElement(keysdown, ff);
    if (ff === 'ctrl' || ff === 'alt' || ff === 'shift') {
        setkeyscad(evt);
        return undefined;
    } // do not handle these as immediate keys
    var kkk = keysdown.toString();
    if (renderVR.keys(kkk))
        return killev(evt);
    if (docmousemove.lastmove === canvas && document.activeElement === document.body) {
        if (canvkeydown(kkk, ff, evt))
            return killev(evt);
    }
    setkeyscad(evt);
    const handled = dockeydowninner(kkk, evt);
    if (handled) {
        return killev(evt);
    }
    return undefined;
}
function dockeyup(evt) {
    if (docmousemove.lastmove === canvas && document.activeElement === document.body) {
        var rr = canvkeyup(evt);
        if (rr)
            return rr;
    }
    var ff = keyname(evt.keyCode);
    var i = keysdown.indexOf(ff);
    if (i !== -1)
        keysdown.splice(i, 1);
    newmain();
}
function getGUITranrule() {
    //var g = trygetele("tranrulebox", "innerHTML", "BAD TRANRULE");
    //return g.replaceall("<br>", "\n");
    return trygeteleval("tranrulebox", "BAD TRANRULE");
}
/** function to return code with current values: just code by default */
function valuecode(genes) {
    /** currently disabled, loses SynthBus and other disturbances ... also see NOTvaluecode
    var tk = trancodeForTranrule(currentGenes.tranrule).trankey;
    for (var gn in genes) {
        tk = tk.replaceall( '#' + gn + '#', format(genes[gn]));
    }
    return tk;
    **/
    return genes.tranrule;
}
/** set the gui tranrule to match the given object (default currentGenes) */
function setGUITranrule(genes = currentGenes) {
    if (!genes.tranrule)
        return;
    //trysetele("tranrulebox", "innerHTML", res.replaceall("\n", "<br>"));
    var vcode = valuecode(genes);
    if (tryseteleval("tranrulebox", vcode)) {
        W.tranrulebox.autosize();
        $("#tranrulebox").trigger("change");
    }
    updateHTMLRules(genes);
}
/** handle F11.
chrome gets down when entering fs, and up on both enter and leave fs; so we process just the up
*/
function handleF11(updown) {
    var full = screen.height === window.outerHeight; // http://stackoverflow.com/questions/1047319/detecting-if-a-browser-is-in-full-screen-mode#comment9717606_7855916
    // if (full === fixcontrols) toggleGenes();  // remove genes if full, else show
}
/** collapse all the folds in the input controls */
function collapseFolds() {
    var fss = W.controls.getElementsByTagName("fieldset");
    for (var fs = 0; fs < fss.length; fs++) {
        if (fss[fs].className.indexOf("hidebelow") === -1)
            fss[fs].className += " hidebelow";
    }
}
function orginit() {
    _ininit = true;
    testDomOverride();
    if (!navigator.getGamepads)
        navigator.getGamepads = () => [null, null, null, null];
    if (navigator.userAgent.indexOf('Firefox') !== -1) //stylesheet
        document.head.innerHTML += '<link rel="stylesheet" type="text/css" href="mutfire.css">';
    checkPixelRatio();
    msgfix("code time", startcommit);
    interpretSearchString();
    localstartEarly();
    // Maestro.on('postframe', msgupdate); remove Dec 2018
    try {
        // no VR exhibitions are not nwwin if (!nwwin) { exhibitionMode = false; W.msgbox.style.display=""; }
        getShaders("threek.vs", "four.fs");
        window.onbeforeunload = cleanup3;
        init1();
        document.onkeydown = dockeydown; // chrome does not 'see' onkeydown for some elements, including our canvas
        document.onkeyup = dockeyup;
        document.onmousedown = docmousedown;
        document.onmouseup = docmouseup;
        document.onmousemove = docmousemove;
        document.onmouseout = docmouseout;
        document.onmouseleave = docmouseleave;
        document.onmouseenter = docmouseenter;
        document.ondragstart = killev;
        document.ondrop = docdrop;
        document.ondragover = docdragover;
        //PJT:::: Since when does pasting into tranrule box mean we want to immediately eval
        //(without eg giving mutsynth a chance to do it's housekeeping)?
        //TODO: canvas onpaste instead
        document.onpaste = docpaste;
        document.body.onfocus = docfocus; // in case keys have got confused, but doesn't seem to get called
        document.body.onblur = docblur; // in case keys have got confused, but doesn't seem to get called
        makeDraggable(W.msgbox, false);
        const dragcode = W.dragcode;
        dragcode.onmousedown = function (evt) {
            W.codemsg.innerHTML = 'dragging';
            dragcode.ox = evt.clientX - dragcode.style.left.replace('px', '');
            dragcode.oy = evt.clientY - dragcode.style.top.replace('px', '');
        };
        dragcode.onmousemove = function (evt) {
            if (!evt.buttons)
                return;
            msgfix('ddrag', offx(evt), dragcode.clientWidth);
            if (offx(evt) > dragcode.clientWidth - 50
                && offy(evt) > dragcode.clientHeight - 50)
                return;
            dragcode.style.left = (evt.clientX - dragcode.ox) + 'px';
            dragcode.style.top = (evt.clientY - dragcode.oy) + 'px';
            //evtx = evt;
            W.codemsg.innerHTML = 'dragging';
            return killev(event);
        };
        dragcode.onmouseup = function (evt) {
            W.codemsg.innerHTML = '...';
        };
        trysetele("codebox", 'onkeyup', function () {
            let r = exeIfPoss(W.codebox.value);
            let m;
            if (r === undefined)
                m = 'OK';
            else if (r instanceof Error)
                m = 'eval error: ' + r;
            else
                m = 'result: ' + r;
            W.codemsg.innerHTML = m;
        });
        // defer call to mutate():  if we call mutate immediately,
        // the scale() function somehow gets corrupt
        _ininit = false;
        // if (!simplemode) restoreInputFromLocal();  // can be confusing, let the default be the same for everyone at least for now
        overrideRestoredInputs();
        _ininit = true;
        newframe();
        _ininit = false;
        // removed sjpt 17 Oct 2014, >>> TODO add extra conditdionals
        //if( !UICom || !UICom.m_isProjVersion )
        //    setTimeout( function() { mutate(); forcerefresh = true;}, 0);
        window.onload = onWindowResize;
        W.resize = onWindowResize;
        //newframe();  // give more chance for everything to be initialized
        // for safety at least till established, otherwise we get very odd effects
        tryseteleval("ywrot", 0);
        tryseteleval("zwrot", 0);
        registerInputs(); // leave this late
        restoreFoldStates();
        prepautomode();
        localstartLate();
    }
    catch (e) {
        showbad(e);
    }
}
/** Prettifying code input... */
var CodeMirror, _CodeMirrorInstance;
function initCodeMirror() {
    if (!CodeMirror)
        return;
    if (_CodeMirrorInstance)
        console.log("initCodeMirror called more than once... might cause problems in current form");
    CodeMirror.defineMode("jsgl", function (config) {
        return CodeMirror.multiplexingMode(CodeMirror.getMode(config, "javascript"), 
        //TODO: autocomplete from available overrides in shader code (complete with filling in default implementation)?
        { open: "//gl", close: "///gl", mode: CodeMirror.getMode(config, "x-shader/x-fragment"), delimStyle: "delimit" });
    });
    var textArea = document.getElementById("tranrulebox");
    //keeping this in a global not because it's right, but so I can play with it.
    //In future, I would like to have multiple textareas etc...
    _CodeMirrorInstance = CodeMirror.fromTextArea(textArea, {
        mode: { name: "jsgl", globalVars: true }, matchBrackets: true, autoCloseBrackets: true, theme: "organic-dark",
        foldGutter: true, gutters: ["CodeMirror-foldgutter"]
    });
    $('.CodeMirror').css({ 'z-index': 10000, 'max-width': '1200px', 'position': 'fixed', 'bottom': 0,
        height: 'auto', width: 'auto', left: '360px' });
    $('.CodeMirror-scroll').css({ 'max-height': '500px' }); // cannot use % for max-height as no reliable parent?
    _CodeMirrorInstance.getWrapperElement().addEventListener("keydown", function (e) {
        //PJT ::: this was extremely slow (and also not achieving desired result?).
        //Just shift with CSS left above instead.
        //W.controls.onmousemove(undefined); //update controls size
        e.stopPropagation();
    });
    //make sure our CodeMirror editor stays in sync with any changes to the original textArea and vice-versa
    //preferably without causing infinite loops etc.
    $('#tranrulebox').on('input propertychange change keyup paste', function () {
        var newVal = $(this).val();
        if (_CodeMirrorInstance.getWrapperElement().textContent !== newVal) {
            const cursor = _CodeMirrorInstance.getCursor();
            _CodeMirrorInstance.setValue(newVal);
            _CodeMirrorInstance.setCursor(cursor);
        }
    });
    _CodeMirrorInstance.setOption("extraKeys", {
        "Ctrl-Space": "autocomplete",
        "Ctrl-Enter": function (cm) {
            var code = cm.getValue();
            //for now, the tranrulebox will still ultimately be the source of code to evaluate
            // $('#tranrulebox').val(code);
            setInput(W.tranrulebox, code); // make sure update consequencies happen
            changeMat(undefined, false); // no force
            //remakeShaders();
        },
        "Alt-Enter": function (cm) {
            var code = cm.getValue();
            //for now, the tranrulebox will still ultimately be the source of code to evaluate
            //$('#tranrulebox').val(code);
            setGenesFromTranrule(code, trancodeForTranrule(currentGenes.tranrule, currentGenes).trankey);
        },
        "Shift-Ctrl-Enter": function (cm) {
            var code = cm.getValue();
            //for now, the tranrulebox will still ultimately be the source of code to evaluate
            $('#tranrulebox').val(code);
            changeMat(undefined, true); // force
            remakeShaders();
        },
        // sjpt 6/12/19 CODE BELOW broken by changes in tranrule monitoring,
        // and also made redundant (I hope) as ctrl-enter does not do unnecessary work on graphics part of tranrule
        // after change to only audio part
        // "Ctrl-'": function(cm) { //update synth code only
        //     //nb, this is actually Ctrl-# on my keyboard. Tried to make it Ctrl-~ but didn't quite work
        //     //nb, Windows uses Alt-shift to (silently) change keyboard layout by default...
        //     //nb, Windows uses Ctrl-Alt-S to invoke 'snipper'
        //     sclog("Updating SynthBus code (only) from tranrule box");
        //     //show sclog...
        //     setInput(W.doShowSCLog, true);
        //     const code = cm.getValue();
        //     setInput(W.tranrulebox, code); // we don't want to recompile shaders, but we do want to update code...
        //     var pos = code.indexOf('SynthBus');
        //     if (pos !== -1) {
        //         pos = code.lastIndexOf('\n', pos);
        //         if (pos === -1) pos = 0;
        //     }
        //     currentHset.synthCode = code.substring(pos+1);
        //     // Maestro.trigger('newHornSynth'); //not today...
        // },
        "Alt-R": function () {
            W.showrules.checked = false;
        },
        "Ctrl-.": function (cm) {
            sclog(`Clearing synths ("Ctrl-." in code editor)`);
            //this seemed to help when it was very slow, but that seems to be mostly fixed by changing slow IntPool.unclaim()
            //setInput(W.tranrulebox, cm.getValue());
            currentHset.synthCode = '';
        },
        "F1": function (cm) {
            const range = cm.findWordAt(cm.getCursor());
            const word = cm.getRange(range.anchor, range.head);
            if (word && NW_SC.ctrlNames[word]) {
                setInput(W.doShowSCLog, true);
                sclog(`ctrlNames for ${word}:\n[${NW_SC.ctrlNames[word].join(', ')}]`);
            }
        },
        "F2": function (cm) {
            //sclog('random experience... TODO remove this shortcut...');
            E.usecurated = 0;
            V.skip = false;
            Maestro.onUnique('preframe', viveAnim);
            randexperience();
            //},
            //"F3": function(cm) {
            //    sclog('dump audio parms... TODO remove this shortcut...');
        },
        "Ctrl-/": function (cm) {
            //get all selected lines. If any don't start with "//", prepend
            //otherwise, remove.
            cm.toggleComment();
        }
    });
    W.showrules.onchange = function () {
        $('.CodeMirror').css('display', W.showrules.checked ? 'block' : 'none');
        if (W.showrules.checked)
            _CodeMirrorInstance.setValue($('#tranrulebox').val());
        else
            $('#tranrulebox').val(_CodeMirrorInstance.getValue());
        W.controls.onmousemove(undefined); //update controls size
    };
    W.showrules.onchange(undefined);
    /*
    //this was a slight red herring... now using modified version of javascript-hint.js to get behaviour I want.
    //http://stackoverflow.com/questions/19244449/codemirror-autocomplete-custom-list
    var orig = CodeMirror.hint.javascript;
    CodeMirror.hint.javascript = function(cm) {
        var inner = orig(cm, undefined, NW_SC.SynthNames) || {from: cm.getCursor(), to: cm.getCursor(), list: []};
        //uncoditionally adding synthNames as suggested in SO answer is pretty poinless...
        //I should at least go on the basis of whether they adequately match...
        //if (NW_SC) inner.list = inner.list.concat(NW_SC.SynthNames);
        return inner;
    };*/
}
//# sourceMappingURL=guidoc.js.map