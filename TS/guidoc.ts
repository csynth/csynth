/*
 * Code to handle document level gui interaction.
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";

var exhibitionMode = false;

var lastdocx,       // last recorded x position
lastdocy,           // last recorded y position
currentDownTarget,  // target mouse last went down, valid till it goes up (to allow manipulation to work across targets)
lastDownTarget,     // target mouse last went down, valid till next mouse down, give a good idea of selected element (even canvas)
_doc_lastmousemove, // last target for mouse move
yaml, E, HornSet; //should be in vars.ts?
/** document mouse down  */
function docmousedown(evt: MouseEvent) {
    interactDownTime = Date.now();
    //console.log("docmousedown: " + evt.target.className + " " + evt.target.value);
    lastDownTarget = currentDownTarget = evt.target;
    lastdocx = evt.clientX; lastdocy = evt.clientY;
    //trancontextmenu.style.display = "none";
    //horncontextmenu.style.display = "none";
    if (evt.altKey && evt.ctrlKey && evt.shiftKey && evt.buttons == 2) {
        toggleDraggable(evt.target);
    }
}

/** document mouse move  */
const docmousemove = function(evt: MouseEvent) {
    if (canvas.width === 1920 && screens[0].width === 1680)
       setSize();  // oddity on Stephen's machine during MLcapture, maybe other times too?

    _doc_lastmousemove = evt.target;  // remember for delegating key events
//    msgfix("docmove", evt.target.id, evt.target.toString());
    lastTraninteracttime = frametime;
    var dx = evt.clientX - lastdocx;
    var dy = evt.clientY - lastdocy;
    lastdocx = evt.clientX; lastdocy = evt.clientY;
    if (currentDownTarget === undefined) return;
    var rname = currentDownTarget.value || currentDownTarget.innerHTML;
    if (currentDownTarget.className === "name" && rname.indexOf("red") !== -1) {
        var gname = rname.replace("red", "green");
        var bname = rname.replace("red", "blue");
        var r = currentGenes[rname];
        var g = currentGenes[gname];
        var b = currentGenes[bname];
        // console.log(" >>" + currentDownTarget.value + " dx=" + dx + " " + r + " " + g + " " + b);
        // in case of silly error
        if (r === undefined) r = 0.5;
        if (g === undefined) g = 0.5;
        if (b === undefined) b = 0.5;
        var hsv = rgb2hsv(r,g,b);
        hsv.h += dx;
        hsv.s -= dy;
        var rgb = hsv2rgb(hsv);
        if (isNaN(rgb.r*rgb.b*rgb.g)) {
            rgb.setRGB(r, g, b);
        }
        setval(rname, rgb.r);
        setval(gname, rgb.g);
        setval(bname, rgb.b);
    }

}

/** document mouse up  */
function docmouseup(evt: MouseEvent) {
    currentDownTarget = undefined;
}
/** document mouse up  */
function docmouseout(evt: MouseEvent) {
    //console.log("docmouseout");
    //currentDownTarget = undefined;
}

function docmouseleave(evt: MouseEvent) {
    //console.log("docmouseleave", evt.offsetX);
    // We sometimes get false docmouseleave on gui changes, this seems to help
    if (evt.offsetX < 0)  // only for genuine leave to the lhs
        showControls(false);
}

function docmouseenter(evt: MouseEvent) {
    //console.log("docmouseenter");
    if (offx(evt) < 200 && !oxcsynth && !reserveSlots && inputs.menuAutoOpen) showControls(true);  // move in from left (especially on dual screen)
}

function docfocus(evt: FocusEvent) {
    clearkeys(evt);
    if ((window as any).canvasBlur) canvas.blur();
}

function docblur(evt: FocusEvent) {
    clearkeys(evt);
    mousewhich = 0;
    dragObj = undefined;
}


/** set ctrl-alt-shift right: they will appear in this order whatever order pressed */
function setkeyscad(evt) {
    removeElement(keysdown, 'ctrl');
    removeElement(keysdown, 'alt');
    removeElement(keysdown, 'shift');
    if (evt.shiftKey) keysdown.splice(0,0,'shift');
    if (evt.altKey) keysdown.splice(0,0,'alt');
    if (evt.ctrlKey) keysdown.splice(0,0,'ctrl');
}

/** clear keys in case we have got out of sync */
function clearkeys(evt) {
    // console.info('clearkeys', keysdown.join(','))
    keysdown = [];
    setkeyscad(evt);
    HW.cancelcontext();
    //lastDispobj = lastTouchedDispobj = NODO;
    //mousewhich = 0;
}

var keysdown = [];
var currentpick = "";
var inedit = false;
var lastkeydown = '';
/** key down, check for a few special cases */
function dockeydown(evt) {
    interactDownTime = Date.now();
    newmain();
    msgfix('keys');


    //W.msgbox.style.display = "";
    endCtrlContextMenu();

    var ff = getkey(evt);
    if (ff === 'V' && keysdown.length === 0 && WA.killdown) WA.killdown();  // special case for holding V to shut down (Pompidou)
    lastkeydown = ff;

    if (ff !== 'F2' && ff !== 'F4' && ff !== 'F6' && ff !== 'F12')
        exhibitionMode = false; // if keyboard not exhibition
    //console.log("doc key name " + ff + "  identifier " + evt.key + " char '" + evt.charCode);
    // clean up keys we can that may have got confused by change of focus
    // alt often a problem, eg after alt-tab
    if (ff === 'Escape') {
        nomess('release');
        if (!WA.msgfix_messages) {  // in case esc called with msgbox hidden.
            // msgfix.force();
            WA.msgbox.click();
            return;
        }
        window.getSelection().removeAllRanges();    // in case of selection of non-dislayed item
        clearkeys(evt);
        msgfix();
        // if (evt.shiftKey) nomess(); // force removal of all messages
        msgboxVisible(); // toggle hidden msgbox
        nircmd(`win settopmost stitle "${document.title}" 0`);
        EX.stopToFront();
        return undefined;
    }  // escape to clear keys in case we get out of sync


    var repeat = (keysdown.indexOf(ff) !== -1);
    if (!repeat) addElement(keysdown, ff);
    if (ff === 'ctrl' || ff === 'alt' || ff === 'shift') { setkeyscad(evt); return undefined; }  // do not handle these as immediate keys

    var kkk = keysdown.toString();

    if (renderVR.keys(kkk)) return killev(evt);
    // SPECIAL CASE SHIFT,F11 removed here, 29/4/2023

    W.startscreen.style.display = 'none';  // in case things get stuck, or for early debug
    if (_doc_lastmousemove === canvas && (document.activeElement === document.body || document.activeElement === canvas)) {
        if (runkeysQuiet(kkk, ff, evt)) return killev(evt);
    }

    setkeyscad(evt);

    const handled = dockeydowninner(kkk, evt);
    if (handled) { return killev(evt); }
    return undefined;
}


function dockeyup(evt) {
    if (_doc_lastmousemove === canvas && (document.activeElement === document.body || document.activeElement === canvas)) {
        var rr = runkeysup(evt);
        if (rr) return rr;
    }

    var ff = getkey(evt);
    var i = keysdown.indexOf(ff);
    if (i !== -1) keysdown.splice(i,1);

    if (keysdown.length === 0 && lastkeydown === 'shift' && ff === 'ctrl') ctrlContextMenu();

    newmain();
}



function getGUITranrule() {
    //var g = trygetele("tranrulebox", "innerHTML", "BAD TRANRULE");
    //return g.replace(/<br>/g, "\n");
    return trygeteleval("tranrulebox", "BAD TRANRULE");
}

/** function to return code with current values: just code by default */
function valuecode(genes = G) {
    /** NOT currently disabled, 22 June 2024
     * SynthBus section now not transferred
     * 'other disturbances' did include mishandling of structures such as {k:1} (fixed??)
     * 'other disturbances', loss of unused horns and of comments
     ... also see NOTvaluecode */
    var t1 = trancodeForTranrule(genes.tranrule, genes).trankey;
    if (!t1) return genes.tranrule;  // in case called before compile
    for (var gn in genes) {
        t1 = t1.replaceall( '#' + gn + '#', format(genes[gn]));
    }

    // var split = genes.tranrule.match(/\n(.*)SynthBus([\s\S]*)/)
    var match = genes.tranrule.match(/\n.*SynthBus[\s\S]*/)
    return match ? t1 + '\n' + match : t1
}

/** set the gui tranrule to match the given object (default currentGenes) */
function setGUITranrule(genes = currentGenes) {
    if (_testcompile) return;
    if (!genes.tranrule) return;
    if (dualmode) return;
    //trysetele("tranrulebox", "innerHTML", res.replace(/\n/g, "<br>"));
    var vcode = genes.tranrule;
    if (vcode.startsWith('//ZCODE'))
        return log('setGUITranrule ZCODE'); // valuecode(genes); // 23 June 2024,  valuecode not safe
    if (tryseteleval("tranrulebox", vcode)) {
        W.tranrulebox.autosize();
        $("#tranrulebox").trigger("change");
        currentHset.tranrule = vcode;
        genes.tranrule = vcode;
    }
    HW.updateHTMLRules(genes);
}


/** handle F11.
chrome gets down when entering fs, and up on both enter and leave fs; so we process just the up
16 June 2022, removed, do all F11 handling ourselves
*/
// function handleF 11(updown) {
//     var full = screen.height === window.outerHeight;  // http://stackoverflow.com/questions/1047319/detecting-if-a-browser-is-in-full-screen-mode#comment9717606_7855916
//     // if (full === fixcontrols) toggleGenes();  // remove genes if full, else show
// }


/** collapse all the folds in the input controls */
function collapseFolds() {
    var fss = W.controls.getElementsByTagName("fieldset");
    for (var fs =0; fs < fss.length; fs++) {
        if (fss[fs].className.indexOf("hidebelow") === -1)
            fss[fs].className += " hidebelow";
    }
}

/** show some basic details about code version etc */
function codeDetails(gl = WA.gl) {
    let list = [startcommit, navigator.appVersion,
        'serving from: ' + (islocalhost ? getcurrentdir() : location.href)
    ];
    if (gl) {
        gpuinfo(gl);
        const p = gpuinfo.parms;
        const gg = [p['Shading Language Version'], p['Unmasked Renderer']];
         list = list.concat(gg);
    }

    msgfix('code details', list.join('<br>'));
}

function orginit() {
    _ininit = true;
    testDomOverride();

    if (!navigator.getGamepads) navigator.getGamepads = () => [null,null,null,null];

    if (navigator.userAgent.indexOf('Firefox') !== -1) //stylesheet
       document.head.innerHTML += '<link rel="stylesheet" type="text/css" href="mutfire.css">';
    checkPixelRatio();
    codeDetails();
    interpretSearchString();
    localstartEarly();
    // Maestro.on('postframe', msgupdate); remove Dec 2018


    try {
        // no VR exhibitions are not nwwin if (!nwwin) { exhibitionMode = false; W.msgbox.style.display=""; }
        getShaders("threek.vs", "four.fs");

        window.onbeforeunload = cleanup3;
        init1();

        document.onkeydown = dockeydown;  // chrome does not 'see' onkeydown for some elements, including our canvas
        document.onkeyup = dockeyup;
        document.onmousedown = docmousedown;
        document.onmouseup = docmouseup;
        document.onmousemove = docmousemove;
        document.onmouseout = docmouseout;
        (document as any).onmouseleave = docmouseleave;
        (document as any).onmouseenter = docmouseenter;
        document.ondragstart = killev;
        document.ondrop = docdrop;
        document.ondragover = docdragover;
        //PJT:::: Since when does pasting into tranrule box mean we want to immediately eval
	//(without eg giving mutsynth a chance to do it's housekeeping)?
	//TODO: canvas onpaste instead
        (document as any).onpaste = docpaste;
        document.body.onfocus = docfocus;  // in case keys have got confused, but doesn't seem to get called
        document.body.onblur = docblur;  // in case keys have got confused, but doesn't seem to get called

        if (!WA.isCSynth) makeDraggable(W.msgbox, {usesize: false});

        const dragcode = W.dragcode as any;
        dragcode.onmousedown = function(evt) {
            W.codemsg.innerHTML = 'dragging';
            dragcode.ox = evt.clientX - dragcode.style.left.replace('px','');
            dragcode.oy = evt.clientY - dragcode.style.top.replace('px','');
        }
        dragcode.onmousemove = function(evt) {
            if (!evt.buttons) return;
            msgfix('ddrag', offx(evt) , dragcode.clientWidth);
            if (offx(evt) > dragcode.clientWidth - 50
                && offy(evt) > dragcode.clientHeight - 50)
                return;
            dragcode.style.left = (evt.clientX - dragcode.ox) + 'px';
            dragcode.style.top = (evt.clientY - dragcode.oy) + 'px';
            //evtx = evt;
            W.codemsg.innerHTML = 'dragging';
            return killev(event);
        }
        dragcode.onmouseup = function(evt) {
            W.codemsg.innerHTML = '...';
        }
        trysetele("codebox", 'onkeyup', function() {
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
        registerInputs();  // leave this late
        localstartLate();
    } catch (e) {
        showbad(e);
    }
}

var guiboxgenes: any = {notyetset: true};  // use to keep track of last seen genes in the gui
// this should force  codeMirror => tranrulebox in step, must check changes other way round
// also colour codeMirror by bad (red), good but changed from definitive G.tranrule (green), not changed (clear, ?black)
function _CodeMirrorInstanceOnChange() {
    if (HornSet._incompilehs) return;
    let code = _CodeMirrorInstance.getValue();
    let r = '#004000';
    // const res = dummyHset.parsehorn(code, undefined, true);
    const genes = {};
    const res = checkTranruleAll(code, genes);
    if (olength(genes)) guiboxgenes = genes;  // indirect in case optimization prevents sensible return of genes
    if (typeof res === 'string') {
        r = '#400000';
        msgfixerror('compile', res);
    } else {
        msgfix('compile', 'OK');
        if (inps.useinterp) G.tranrule = code; // immediate update as we can
    }
    setInput(W.tranrulebox, code);
    if (code === G.tranrule) r = '';
    _CodeMirrorInstance.display.lineDiv.style.backgroundColor = r;
    return res;
}

/** call to start showing good/bad on tranrule */
function _SetCodeMirrorInstanceOnChange() {
    _CodeMirrorInstance.on('change', _CodeMirrorInstanceOnChange);
}

/** Prettifying code input... */
var CodeMirror, _CodeMirrorInstance;
function initCodeMirror() {
    if (!CodeMirror) return;
    if (dualmode) return;
    if (_CodeMirrorInstance) console.log("initCodeMirror called more than once... might cause problems in current form");
    CodeMirror.defineMode("jsgl", function(config) {
        return CodeMirror.multiplexingMode(
            CodeMirror.getMode(config, "javascript"),
            //TODO: autocomplete from available overrides in shader code (complete with filling in default implementation)?
            {open: "//gl", close: "///gl", mode: CodeMirror.getMode(config, "x-shader/x-fragment"), delimStyle: "delimit"}
        );
    });
    var textArea = document.getElementById("tranrulebox");
    //keeping this in a global not because it's right, but so I can play with it.
    //In future, I would like to have multiple textareas etc...
    _CodeMirrorInstance = CodeMirror.fromTextArea(textArea, {
        mode: {name: "jsgl", globalVars: true}, matchBrackets: true, autoCloseBrackets: true, theme: "organic-dark",
        foldGutter: true, gutters: ["CodeMirror-foldgutter"]
    });
    _SetCodeMirrorInstanceOnChange();
    // $('.CodeMirror').css({'z-index': 10000, 'max-width': '1200px', 'position': 'fixed', 'bottom': 0,
    //     height: 'auto', width: 'auto', left: '360px' });
    // changed now tranrulebox is wrapped in foldable group
    $('.CodeMirror').css({'z-index': 10000, 'position': 'relative', 'bottom': 0, 'max-width': '1200px',
        height: 'auto', width: 'auto', left: '0px' });
    $('.CodeMirror')[0].id = 'cm_tranrule';
    $('.CodeMirror-scroll').css( {'max-height': '500px'} );  // cannot use % for max-height as no reliable parent?

    _CodeMirrorInstance.getWrapperElement().addEventListener("keydown", function(e) {
        //PJT ::: this was extremely slow (and also not achieving desired result?).
	//Just shift with CSS left above instead.
        //W.controls.onmousemove(undefined); //update controls size
        e.stopPropagation();
    });

    //make sure our CodeMirror editor stays in sync with any changes to the original textArea and vice-versa
    //preferably without causing infinite loops etc.
    $('#tranrulebox').on('input propertychange change keyup paste', function() {
        var newVal = $(this).val();
        if (_CodeMirrorInstance.getWrapperElement().textContent !== newVal) {
            const cursor = _CodeMirrorInstance.getCursor();
            _CodeMirrorInstance.setValue(newVal);
            _CodeMirrorInstance.setCursor(cursor);
        }
    });

    /** click on name of horn to highlight, using mousedown
     * nb click, mouseenter and some other events did not behave as expected
     * probably bad interaction with other mouse handling by code mirror */
    W._tranrule.addEventListener('mousedown',function(e) {
        const h:any = e.target;
        const text = h.textContent.replace(/"/g, '').replace(/'/g, '');
        // log('mousedown', text)
        HornSet.current().setHighlight(text);
    });
    // W._tranrule.addEventListener('mouseup',function(e) {
    //     const h:any = e.target;
    //     log('mouseup', h.textContent)
    //     // HornSet.current().setHighlight(h.textContent);
    // });

    _CodeMirrorInstance.setOption("extraKeys", {"Ctrl-Space": "autocomplete",
        // test "Ctrl": () => console.error("ctrl key ctrl key"),
        "Ctrl-Enter": function(cm) {
            var code = cm.getValue();
            currentGenes.tranrule = code;
            // as of 17 Dec 2023
            // currentGenes.tranrule is the 'definitive' tranrule
            // codeMirror and tranrulebox should be in lock step
            // changeMat is needed to check 'side-effects' of tranrule change, such as html rule display


            //for now, the tranrulebox will still ultimately be the source of code to evaluate
            // $('#tranrulebox').val(code);
            if (code !== W.tranrulebox.value) {
                console.error('tranrulebox and codeMirror out of step');
                setInput(W.tranrulebox, code);  // make sure update consequencies happen
            }
            changeMat(undefined, false);  // no force
            _CodeMirrorInstanceOnChange();
            //remakeShaders();
        },
        "Alt-Enter": function(cm) { //set genes from visible tranrule
            var code = cm.getValue();
            //for now, the tranrulebox will still ultimately be the source of code to evaluate
            //$('#tranrulebox').val(code);
            HW.setGenesFromTranrule(code); //>>>, trancodeForTranrule(currentGenes.tranrule, currentGenes).trankey );
            if (code !== W.tranrulebox.value) console.error('tranrulebox and codeMirror out of step');
            setInput(W.tranrulebox, code);   // probably not needed?, done more generically on change
            currentHset.tranrule = code;
            G.tranrule = code;
        },
        "Shift-Ctrl-Enter": function(cm) {
            var code = cm.getValue();
            //NONONO for now, the tranrulebox will still ultimately be the source of code to evaluate
            // change 17 Dec 2023. tranrulebox and codeMirror should be kept in lock step.
            // G.tranrulebox is the tranrule code that will be used for main window
            // and should be the same until user edit of tranruleBox/codeMirror (see _CodeMirrorInstanceOnChange)

            $('#tranrulebox').val(code);
            changeMat(undefined, true);  // force
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
        "Alt-R": function() {
            setInput(WA.showrules, false);
        }, //TODO shortcut to insert synth args object?
        "Shift-Alt-R": function() {
            const s = W._tranrule.style;
            if (s.width === '99%')  { s.width = s.left = ''; WA.cm_tranrule.style.maxWidth = '1200px'; }
            else {s.width = '99%'; s.left = '0';  WA.cm_tranrule.style.maxWidth = ''; }
        }, //TODO shortcut to insert synth args object?
        "Ctrl-.": function(cm) {
            sclog(`Clearing synths ("Ctrl-." in code editor)`);
            //this seemed to help when it was very slow, but that seems to be mostly fixed by changing slow IntPool.unclaim()
            //setInput(W.tranrulebox, cm.getValue());
            currentHset.synthCode = '';
        },
        "F1": function(cm) {
            const range = cm.findWordAt(cm.getCursor());
            const word = cm.getRange(range.anchor, range.head);
            if (word && NW_SC.ctrlNames[word]) {
                setInput(W.doShowSCLog, true);
                sclog(`ctrlNames for ${word}:\n[${NW_SC.ctrlNames[word].join(', ')}]`);
            }
        },
        "F2": function(cm) {
            //sclog('random experience... TODO remove this shortcut...');
            E.usecurated = 0;
            V.skip = false;
            Maestro.onUnique('preframe', viveAnim);
            randexperience();
        //},
        //"F3": function(cm) {
        //    sclog('dump audio parms... TODO remove this shortcut...');
        },
        "Ctrl-/": function(cm) {
            //get all selected lines. If any don't start with "//", prepend
            //otherwise, remove.
            cm.toggleComment();
        }
    });

    W.showrules.onchange = function() {
        if (WA._tranrule) WA._tranrule.style.display = W.showrules.checked ? '' : 'none';
        $('.CodeMirror').css('display', W.showrules.checked ? 'block' : 'none');
        if (W.showrules.checked) _CodeMirrorInstance.setValue($('#tranrulebox').val());
        else $('#tranrulebox').val(_CodeMirrorInstance.getValue());
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

    // otherwise rules displayed directory from loading oao do not show populated. ? should be a better way to force population ?
    onframe(() => _CodeMirrorInstance.setValue(_CodeMirrorInstance.getValue()), 10);
}

/** fill in the gene values in a tranrule string with values from genes, return modified tranrule string */
function tranruleFromGenes(genes = currentGenes, tranrule = currentGenes.tranrule) {
    //### don't bother to filter out ' and " numbers, they'll fail the marked gene not found test
    //### var ss = tranrule.split(/([^"'a-zA-Z])([+-\d][.\d]*)/g);
    const s = _testcompile;
    try {
        _testcompile=true
        const ss = tranrule.split(/([+-\d][.\d]*)/g);       // separate out numbers (does not know about scientific) and inbetween strings
        var ovals = ss.slice();                             // save the originals
        var kk = 7/64                                       // flag to reduce accidental conflict
        for (let i = 1; i < ss.length; i+=2) if (!isNaN(ss[i])) ss[i] = i + kk // replace potential gene values with markers in ss
        const marked = ss.join('')                          // and reconstitute a marked tranrule
        const saveg = genes
        const newg = clone(genes)                           // new set of genes will be overridden
        newg.tranrule = marked                              // it has new tranrule
        HW.setGenesFromTranrule(marked, newg );             // set newg with the marked genes

        const ig = []                                       // keep track of gene name for each slot number (not used yet)
        for (const gn in newg) {                            // scan genes and find the marked ones that appear in tranrule
            const v = newg[gn]                              // v = gene value
            if (v%1 === kk) {                               // test to see if it is a marked value
                const k = Math.floor(v)                     // if so, find corresponding slot
                ig[k] = gn                                  // remember gene name for slot
                ss[k] = saveg[gn];                          // put the gene value into ss
            } else {
                // log('v not found in tranrule', v, gn)    // unmarked genes are expected, ignore
            }
        }

        // check for marked changes that didn't seem to have effect, eg numbers in comments, or in '' "", or in ???
        // probably harmless, restore their original value
        for (let i = 1; i < ss.length; i+=2)
            if (ss[i]%1 === kk) {
                // log('marked gene not found for value', {i, newg: newg[i], ss: ss[i], ovals: ovals[i], saveg: saveg[i], genes: genes[i]} )
                ss[i] = ovals[i];
            }
        var ncode = ss.join('')
        return ncode;
    } finally {
        _testcompile = s;
    }
}

/** insert genes from current genes into a tranrule (probably active version), and save  */
function setTranruleFromGenes(genes = currentGenes, tranrule = _CodeMirrorInstance.getValue() ) {
    const sg = currentGenes; currentGenes = undefined;  // just make sure we are not playing with currentGenes by mistake
    try {
        const ncode = tranruleFromGenes(genes, tranrule);
        genes.tranrule = ncode
        if (genes === currentGenes)
            inps.tranrulebox = ncode
        else
            log('unexpected setTranruleFromGenes genes')
    } catch (e) {
        msgfixerrorlog('error in setTranruleFromGenes', e)
    } finally {
        currentGenes = sg;
    }
}
