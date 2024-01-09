/** various javascript utilities */
'use strict';
// vars for
var screens, W = window, opmode, HTMLElement, HTMLDocument, HTMLTextAreaElement,
    UICom, require, process, lastdocx, lastdocy, framedelta, Maestro, loadStartTime, oplist, frametime, currentGenes,
    THREE, slots, mainvp, rendertargets, oldlayerX, oldlayerY, height, width, yaml, jsyaml, detectWebGL, confirm, uniforms, evalIfPoss,
    framenum, XMLHttpRequest, setval, location, isNode, savedef, localStorage, FileReader, onWindowResize,
    refreshGal, domtoimage, Image, readWebGlFloat, refall, vps, setViewports, Audio, newframe,
    setSize, CSynth, screen, exportmyshaders, Math,
    genedefs, framelog, dockeydowninner, setAllLots, usesavedglsl, remakeShaders, Shadows,
    throwq, oxcsynth, performance, setshowstats, showControls, VUMeter2, DispobjC, orginit, requestAnimationFrame,
    getMaterial, OPPOSITION, OPOPOS, OPMAKESKELBUFF, OPSHADOWS, OPSHAPEPOS, OPTEXTURE, OPTSHAPEPOS2COL,
    rca, canvas, testmaterial, startvr, interpretSearchString, appToUse, writetextremote,
    searchValues, $, inworker, serious, loadTime, loadTimes, _insinit, isFirefox, keysdown, copyXflip,
    ErrorEvent, animateNum, dustbinvp, testopmode, S, sclogE, sclog, islocalhost, dataURItoBlob, saveAs, GX, lastToggleGuiAction,
    foldStates, restoreFoldStates, ises300, deferRender, startSC, isCSynth, WA, G, mutate, addGene, runkeys, regularizeColourGeneVisibility, maxInnerHeight,
    resoverride, U, usemask, numInstances, tad, mutateTad, xxxdispobj, centrescalenow, resetCamera, target, Files, sleep, interactDownTime,
    readWebGlFloatDirect, rrender, startscript, animatee, springs
    ;

var MAX_HORNS_FOR_TYPE = 16384.0; // this allows 16384 = 2**14 horns of a single type; SHARE WITH common.vfs
// convenience function to find dom element, W. sometimes failed at very start
// really const, but var makes it easier to share
var DE = new Proxy(window, { get: (w, name) => document.getElementById(name) } );

var inputs = {};  // cache value of inputs
var initialinputs = {};  // register initial value of inputs
var inputdoms;      // cache input dom elements to use
var _inputdoms;    // cache of secondary _ doms
var holdtimeout;
var valelement;     // element
var nomess; // function that may be overwritten
var name2class = {};  // extra classes, map from class name to prototype
var class2name = new Map();   // inverse of name2class
var xconstructors = {};  // extra constructors,  map from class name to constructor

// prepare for node webkit or electron if around
// see https://github.com/rogerwang/node-webkit/wiki/Window
var nwwin, nwfs, nwhttp, nwos, hostname = "defaulthost";

var loadedfiles = {};
var restoringInputState = false;
var remote, xwin, ipcRenderer, electron;
var EX = {};


/** find globals in use, this will usually be defined earlier (in threek.html) to get initGlobals before globals are polluted) */
var snapGlobals;
snapGlobals = snapGlobals || function () {
    var r = {};
    var dead = ['webkitStorageInfo', 'webkitIndexedDB'];
    for (var v in window) if (dead.indexOf(v) === -1) r[v] = window[v];
    return r;
}
var initGlobals;
initGlobals = initGlobals || snapGlobals();  // globals in use at very start
/** extra globals since start, pollution of global namespace */
function xGlobals(base = initGlobals) {
    var r = snapGlobals();
    for (var v in r) if (v in base) delete r[v];
    return r;
}
/** number of extra globals */
function countXglobals() {
    return Object.keys(xGlobals()).length;
}

/** convenience replaceall, to be replaced by replaceAll soon */
String.prototype.replaceall = ''.replaceAll ?? function (a, b) { return this.split(a).join(b); };  // convenience function

function nop() { }
/** promise wait for ms millesecs; do NOT consider S.kill */
function usleep(ms) {
    return new Promise(function awaitsleep(resolve) {setTimeout(resolve, ms);});
}


/** towards better catching of errors */
console.oldError = console.error;
var badshader = false;
var _ininit = true;

/** capture errors */
console.error = function () {
    var emsg = arguments[0] + '';  // allow for case msg is something else, eg exception

    if (emsg.startsWith('Error creating WebGL context'))
        throwe(emsg);
    if (emsg === 'THREE.WebGLProgram: shader error: ') {
        showErrors(arguments);
        return;
    }
    if (emsg.startsWith('THREE.')) {
        serious('THREE error', arguments);
        badshader = 'three error';
    }

    if (emsg === null || emsg === "") {
        var es = stack();
        if (es[2].indexOf("at getShader ") !== -1) {
            if (!detectWebGL())
                throwe("Exception in WebGL, overflowing or ...???");
            else
                throwe("Exception creating shader but can create more resource");
        }
    }
    // Chrome30 and others sometimes allowed vertexShader and fragmentShader to compile
    // but not to link.  three.js then gave this message
    // but carried on as if nothing had happened.
    if (emsg.startsWith("Could not initialise shader")) {
        badshader = "Could not initialise compiled shader";
    }
    if (_ininit) {
        console.oldError(">> during init: " + emsg);
        //throwe("console error message during init: " + emsg);
    }
    console.oldError.apply(console, arguments);
};

var contime = 0;
// allow breakpoints  and wait for certain three.js errors
console.oldWarn = console.warn;
console.warn = function (wmsg) {
    if (wmsg === "THREE.WebGLShader: gl.getShaderInfoLog()") { // Shader couldn't compile now error } || wmsg.contains("THREE.WebGLShader: Shader cou")) {
        const tothrow = arguments[2].toLowerCase().contains('error');
        return showErrors(arguments, tothrow);
    }

    console.log('');   // so we see time etc before warning
    console.oldWarn.apply(console, arguments);
};
console.oldDebug = console.debug;
console.debug = function (dmsg) {
    console.oldDebug.apply(console, arguments);
};
console.oldLog = console.log;
var firstConsole = console;
console.log = function () {
    const args = Array.from(arguments);
    if (args[0] === "THREE.WebGLRenderer") return;
    let col, pre= ' ';
    if ((args[0]+'').startsWith('%%')) {
        col = 'color:' + args.shift().substring(2);
        pre = '%c ';
    }

    //pjt was getting console.oldLog undefined in debugging, so put in this check...
    if (!console.oldLog && console !== firstConsole) throwe("node / webkit context confusion?");
    var lmsg = showvals.apply(undefined, args);
    var ncontime = Date.now();
    let deltat = ncontime - contime;
    if (deltat > 100 && contime !== 0) deltat += '!!!!!!' + '!='.repeat(Math.min(10, deltat/100));
    const rrr = pre + framenum + '/' + ((ncontime - loadStartTime)/1000).toFixed(3) + "+" + deltat + ": " + lmsg;
    if (col) console.oldLog(rrr, col); else console.oldLog(rrr);
    contime = ncontime;
    return lmsg;
};

// https://stackoverflow.com/questions/52595559/how-to-log-js-stack-trace-with-console-trace-but-keep-it-collapsed
console.oldTrace = console.trace;
console.trace = function(...args) {
    const str = showvals.apply(undefined, args);
    console.groupCollapsed(str);
    // console.log('additional data hidden inside collapsed group');
    console.oldTrace(str); // hidden in collapsed group
    console.groupEnd();
}

var log = console.log;
framenum = framenum || 0;  // for utils.js compatibility
loadStartTime = loadStartTime || Date.now();   // for utils.js compatibility

function assert(test, amsg) {
    if (!test) {
        console.error("ASSERT ERROR:", amsg);
        debugger;
    }
}

/** test for dom elements overridden by other javascript
 * Convention is to use e.g. W.msgbox in code as shorter than document.getElementById('msgbox')
 * If you just code msgbox it works, but (sensibly) leaves undefined reference in lint.
 * If you 'correct' this by defining 'var msgbox;' it defines a different window.msgbox,
 * which means all references to msgbox or W.msgbox become wrong.
 *
 * The code below detetcs this situation and gives warning, called from orginit.
 *
 */
function testDomOverride() {
    let docs = document.getElementsByTagName("*");
    var n = 0;
    for (let dk = 0; dk < docs.length; dk++) {
        let d = docs[dk];
        if (d.id && d !== W[d.id]) {
            log('patch W. for', d.id);
            W[d.id] = d;
        }
    }
    console.log('testDomOverride: overridden elements=', n);
}

/** value substitute */
function showvals(...sss) {
    //if (!typeof s === "string") return s;
    //var ss = s.split("$");
    // var sss = arguments;

    var r = "";
    for (var j = 0; j < sss.length; j++) {
        var ss = sss[j];
        if (typeof ss === "string") {
            var s = ss.split('$');
            for (var i = 1; i < s.length; i += 2) {
                // like qget, but with tags
                if (s[i] in inputs)             s[i] = "I." + s[i] + "=" + format(inputs[s[i]]);
                else if (currentGenes && s[i] in currentGenes)  s[i] = "G." + s[i] + "=" + format(currentGenes[s[i]]);
                else if (s[i] in W) s[i] =      s[i] = "W." + s[i] + "=" + format(W[s[i]]);
                else if (s[i] in (uniforms??{}))s[i] = "U>" + s[i] + "=" + format(uniforms[s[i]].value);
                else                            s[i] =        s[i] + '=' + format(evalIfPoss(s[i]));
            }
            sss[j] = s.join(" ");
        } else if (ss && ss.toString && ss.toString()[0] === '/') {  // regex
            sss[j] = ss.toString();
        } else { // if (typeof ss === "object") {
            //sss[j] =  this && this !== W ? this(ss) : objstring(cloneNoCircle(ss));
            sss[j] = "" + format(ss);
        }
        r += sss[j] + "\t";
    }
    return r;
}

/** quick get of value from name in inputs/genes/W */
function qget(name) {
    var r;
    var list = [inputs, currentGenes, W];
    for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (name in o) {
            r = o[name];
            break;
        }
    }
    return r;
}

/** quick set of value from name in inputs/genes/W, return whether ok */
function qset(name, v) {
    if (name in inputs) setInput(name, v);
    else if (name in currentGenes) setval(name, v);
    else if (name in W) W[name] = v;
    else { log("unexpected name in qset", name, v); return false; }
    return true;
}


/** handle the errors once the line list message is captured
 * updated for three showing in different way: 31/1/20
 * also now separates errors and shows context for each even if this repeats context lines in ouput
 */
function showErrors(linemsg, dothrow=true) {
    var [kthree, geterror, k35715, progparam, kinfolog, programlog, vertexErrors, fragmentErrors] = linemsg;
    var err = linemsg[5] || '??? corrupt message';
    var details = linemsg[7];

    var s = [];  // output message
    if (opmode) s.push("opmode=" + oplist[opmode] + ', shader=' + kthree + "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    s.push(`${kthree} err#:${geterror}`);
    s.push(programlog);
    show(vertexErrors);
    show(fragmentErrors);
    function show(e) {
        if (!e) return;
        const x = e.indexOf('\n\u00001:');  // break between errors and code list
        const errs = e.substring(0, x).split('\n');
        const code = e.substring(x).split('\n');
        s.push(errs[0]);
        for (let en = 1; en < 15 && en < errs.length; en++) {  // search for
            var errl = errs[en].split(":")[2] - 0;   // ERROR, char, line, point, msg
            if (isNaN(errl)) errl = +(errs[en].substring(1).pre(','));  // edge browser
            if (isNaN(errl)) continue;
            s.push('');
            s.push(errs[en]);
            var st = Math.max(0, errl-8);
            var et = Math.max(0, errl+3);
            for (var l = st; l < et; l++) s.push(code[l]);
        }
        s.push('---');
    }
    console.oldError(s.join("\n"));
    if (dothrow && !badshader) {
        serious(s.join("\n"));
        badshader = "Error probably in shader, see console";
    }
    //throwe("Error probably in shader");
}


/** track up chain to find parent of given type, if any */
HTMLElement.prototype.hasParent = function (p) {
    var pn = this.parentNode;
    if (pn === p) return true;
    if (!pn) return false;
    if (pn.hasParent === undefined) return false;
    return pn.hasParent(p);
};


/** kill an event */
function killev(evt, retval) {
    if (evt.type.startsWith("sim")) return;
    evt.stopPropagation();
    evt.preventDefault();
    newframe();  // forcing this here may make extra newframes, but will catch lots in a single line
    return retval;
}


/** remove value from array, do not add as prototype or else 'remove' appears in enumeration of the arry */
function removeElement(arr, val) {
    var pos = arr.indexOf(val);
    if (pos === -1) return;
    arr.splice(pos, 1);
}

/** add an element if not already there */
function addElement(arr, val) {
    if (arr.indexOf(val) === -1) arr.push(val);
}

/** get X offset of event, compensate for canvase style sixing if needed */
function offx(pevt) {
    let evt = pevt;
    // handle mouse events, raw touch events and both kinds of hammer events
    // var mmm = msgfix('mouse', 'clientX', evt.clientX, 'screenX', evt.screenX, 'offsetX', evt.offsetX, 'pageX', evt.pageX, 'offl', evt.target.offsetLeft, 'offa', offa);
    if (evt.myx !== undefined) return evt.myx;  // for simulated event
    if (evt.changedTouches) evt = evt.changedTouches[0];
    else if (evt.targetTouches) evt = evt.targetTouches[0];
    else if (evt.gesture) evt = evt.gesture.touches[0];
    else if (evt.touches) evt = evt.touches[0];
    var off = FIRST(evt.offsetX, evt.clientX);
    // var offa = evt.pageX - evt.target.offsetLeft;    // ?? offa causing performance hit forcing reflow ??
    // if (off && Math.abs(off - offa) > 1)
    //     msgfix("offX difference", off, offa, 'offx='+evt.offsetX, 'cliX='+evt.clientX, 'pageX='+evt.pageX);
    //console.log("xoff " + offa);
    var se = evt.target;
    if (/* se === canvas && */ se.width && se.style.width.endsWith('px')) {
        const r = se.width / se.style.width.replace('px', '');
        // offa *= r;
        off *= r;
    }
    return off;
}

/** get Y offset of event, compensate for canvase style sixing if needed */
function offy(pevt) {
    // handle raw touch events and both kinds of hammer events
    let evt = pevt;
    if (evt.myy !== undefined) return evt.myy;  // for simulated event
    if (evt.changedTouches) evt = evt.changedTouches[0];
    else if (evt.targetTouches) evt = evt.targetTouches[0];
    else if (evt.gesture) evt = evt.gesture.touches[0];
    else if (evt.touches) evt = evt.touches[0];
    var off = FIRST(evt.offsetY, evt.clientY);

    // var offa = evt.pageY - evt.target.offsetTop;  // ?? performance ??
    //if (off  && off !== offa)
    //    console.log("offY difference");
    var se = evt.target;
    if (/* se === canvas && */ se.height && se.style.height.endsWith('px')) {
        const r = se.height / se.style.height.replace('px', '');
        off *= r;
        // offa *= r;
    }

    return off;
}


var msgset = {};  // current messages, including args: for definition and val: for current value
/** display a persistent message with key
 * if message undefined, clear message for that key
 * if key undefined clear all messages
 * if id starts with !" the message body is dynamically recomputed
 * if id or first part of message starts with >" the message is displayed as an error
 */
var msgfix = function(id, a1) {
    const isfun = typeof(a1) === 'function';
    const nmsg = isfun ? a1 : showvals.apply(htmlformat, arguments);
    if (id === undefined) {
        for (let idx in msgset)
            if (idx !== msgfix.key && !msgset[idx].args) // do not kill 'active' ones
                msgset[idx].dead = true;
        msgfix.showhid();
    } else {
        let dyn = false, xclassi = '';
        while (true) {
            if (id[0] === '!') { dyn = true; id = id.substring(1); }
            else if (id[0] === '>') { xclassi = ' errmsg'; id = id.substring(1); }
            else if (id[0] === '+') { xclassi = ' plus'; id = id.substring(1); }
            else break;
        }
        let mset = msgset[id] = msgset[id] || {};
        if (arguments.length === 1) {
            if (mset)
                mset.dead = true;
            if (msgfix.not[id]) {
                delete msgfix.not[id];
                msgfix.showhid();
            }
        } else {
            mset.dead = false;
            let oclass = mset ? mset.xclass : 'new';
            if (arguments[1] && arguments[1][0] === '>') xclassi = ' errmsg';
            mset.val = isfun ? a1 : nmsg.substring(id.length + 1);
            const xxclass = xclassi + (dyn ? ' dynmsg ' : ' staticmsg ');
            mset.newxclass = xxclass;
            mset.args = dyn ? arguments : undefined;

            if (msgfix.updatebits) {  // update bits as soon as possible, just overhead and not worth it ???
                if (W['msgfix_' + id]) {
                    W['msgfix_' + id].innerHTML = mset.val;
                }
            }
        }
    }
    return nmsg;
}
msgfix.all = true;
msgfix.not = {};
msgfix.key = 'messages';

msgfix(msgfix.key, 'none yet');  // do this now to get it to the top

/** track an input/gene/... as a message */
function msgtrack(name) {
    const names = name.split(' ');
    var s = [];
    names.forEach( n => s.push('$' + n + '$') );
    msgfix('!' + names[0], s.join(', '));
    // msgfix('!' + name, '$' + name + '$');
}

/** do an error message and make sure it shows */
function msgfixerror() {
    msgfixerror.count++; // count msgfixerror calls (pending making log, we don't want it to be too big)
    nomess(false);
    msgboxVisible(true);
    const k = arguments[0];
    arguments[0] = '>' + k; //msgfix.all = true;
    const r = msgfix.apply(undefined, arguments);
    msgfix.force();                      // make sure messages 'registered'
    if (arguments[1]) msgfix.promote(k);  // promote error message, unless it's just been cleared
    return r;
    // log.apply(undefined, arguments);
}
msgfixerror.count = 0;

/** flash the message box, does NOT change the messages. if hidden unhide and do NOT rehide  */
async function msgflash({col, time=500} = {}) {
    const style = W.msgbox.style
    const washid = style.overflow === 'hidden';
    const wascol = style.backgroundColor;

    if (washid) msgboxVisible(true);
    if (style.display === 'none') nomess('release');
    if (col) style.backgroundColor = col;
    await usleep(time);
    style.backgroundColor = wascol;
    if (washid) msgboxVisible(false);
}

/** do a messagefix and log it too */
function msgfixlog() {
    msgfix.apply(undefined, arguments);
    return log.apply(undefined, arguments);
}
function msgfixerrorlog(...args) {
    const r = msgfixerror(...args);
    console.error(r);
    return r;
}

function msgboxVisible(flag = 'toggle') {
    const msgbox = W.msgbox;
    function hide() {
        if (msgbox.style.overflow === 'auto') msgboxVisible.save = [msgbox.style.width, msgbox.style.height];
        msgbox.style.width = '5em'; msgbox.style.height = '1em';
        msgbox.style.overflow = 'hidden';
    }
    function show() {
        if (msgbox.style.overflow === 'auto') return;
        [msgbox.style.width, msgbox.style.height] = msgboxVisible.save ?? ['auto', 'auto'];
        msgbox.style.overflow = 'auto';
        if (window.reserveSlots && slots[1]) msgbox.style.top = slots[1].height + 'px';
    }
    if (flag === 'toggle')
        if (msgbox.style.overflow === 'hidden')
            show();
        else
            hide();
    else if (flag)
        show();
    else
        hide();
}

// handle click in msgbox
// if on an element, hide it
// if on an item within hidden, display it again
if (W.msgbox)
W.msgbox.onclick = (e) => {
    const msgbox = W.msgbox;
    if (document.getSelection().toString()) return;  // do not handle if there is a selection, prevents easy copy/paste

    let s = e.target;

    if (s.tagName === 'A') return;  // let a link take care of itself
    // any click will restore if hidden
    if (msgbox.style.overflow === 'hidden') { msgboxVisible(true); return; }

    if (s.id === 'msg_hideall') {
        for(let i in msgset)
            if (!msgfix.not[i] && i !== msgfix.key) {
                msgfix.hideall();  // if any are displayed, hide them all
                return;
            }
        msgfix.showall(); // none is displayed, restore all
        return;
    }

    // click on msgfix.key itselft to hide
    if (s.parentNode.id === 'msgfixo_' + msgfix.key) {
        msgboxVisible(false);
        return;
    }

    // scan up parents to find where we are
    while (s.id !== 'msgbox') {
        if (s.id.startsWith('msgfixo_')) {
            const id = s.id.post('_');
            if (id === msgfix.key) {
                delete msgfix.not[e.target.textContent.trim()]; // click on a subelement of msgfix.key, restore it
            } else {
                if (e.ctrlKey)
                    msgfix.kill(id);
                else if (e.altKey)
                    msgfix.promote(id);
                else
                    msgfix.hide(id);  // click on another element, hide it
            }
            msgfix.showhid();
            return;
        }
        s = s.parentNode;
    }
    // fall out the bottom if clicked on msgbox but not interesting part
}

msgfix.showhid = function() {
    const hid = [].slice.call(W.msgbox.children).map(n => {
        const nn = n.children[0];
        const i = nn.id.replace('msgfixo_', '')
        if (!msgfix.not[i]) return '';
        let mset = msgset[i];
        if (!mset) return '';
        return `<span class="${mset.xclass}"
            onmouseenter="msgfix.not['${i}'] = '?'"
            onmouseleave="msgfix.not['${i}'] = true"
            >${i.indexOf(' ') !== -1 ? "'"+i+"'" : i}</span>`
    }).join(' ');
    // msgfix('>' + msgfix.key, hid);
    if (W.msgfix_messages) W.msgfix_messages.innerHTML = hid;
}

msgfix.kill = function(id) {
    delete  msgfix.not[id];
    delete msgset[id];
    const n = W['msgfixo_' + id];
    if (n) n.parentNode.remove(n);
}

msgfix.killMost = function(keep = []) {
    keep.push(msgfix.key);
    for (let id in msgset)
        if (!keep.includes(id) && !(msgset[id].xclass && msgset[id].xclass.contains(' errmsg ')))
            msgfix.kill(id)
}

msgfix.show = function(id) {
    delete msgfix.not[id];
    msgboxVisible(true);
    msgfix.showhid();
}
msgfix.showall = function() {
    msgfix.not = {};
    msgfix.showhid();
}
msgfix.hide = function(id) {
    msgfix.not[id] = true;
    msgfix.showhid();
}
msgfix.hideall = function() {
    for (let id in msgset) if (id !== msgfix.key) msgfix.not[id] = true;
    msgfix.showhid();
}

msgfix.promote = function(list) {
    if (typeof list === 'string') list = list.split(',').map(x => x.trim());
    const before = W.msgbox.childNodes[1];
    list.forEach(x => {
        const i = W['msgfixo_' + x];
        if (i)
            W.msgbox.insertBefore(i.parentNode, before);
        else
            console.error('no node to promote', x);
    });
    msgfix.showhid();   // promote in hidden if appropriate
}


var lastmsg = "";
function message(s) { msgfix('message', s); }
/** send a (transient) message, and refresh message display
transient message obsolete, most will never be seen
msg with no arguments called from animatee to force out messages for frame
**/
msgfix.force = function(ss) {
    if (!nomess.msgvisible) return;
    //??? if (W.msgbox.style.overflow === 'hidden') return;
    // if (msgfix.updatebits) return;
    if (ss) serious('msg should not be called with argments, use msgfix');

    const deadlist = [];
    for (let i in msgset) {
        const mset = msgset[i];
        if (mset.dead) { deadlist.push(i); continue; }
        if (msgfix.not[i] === true) { if (mset.htmlo) mset.htmlo.style.display = 'none'; continue; }
        const rval = typeof mset.val === 'function' ?
            format(mset.val()) :
            mset.args ? showvals.apply(htmlformat, mset.args).substring(i.length + 1) : mset.val;
        const val = rval.replaceall('\n', '<br>');


        if (mset.htmlo && mset.xclass !== mset.newxclass) {
            window['msgfixo_' + i].className = mset.newxclass;
        }
        if (!mset.htmlo) {
            let htmlo;
            if (i === msgfix.key)
                htmlo =
// html for top message
`<span>
    <span id="msgfixo_${i}" class="${mset.newxclass}">
        <span class="msgfix_key">${i}: </span>
        <span class="help" style="position: fixed">
            <p>Click here (${i}:) to toggle hide/display of all messages<br>
            or use 'esc' key to cycle message display and clear old messages</p>
            <p>Click on 'hidden:' to hide all messages, or display all if all hidden.</p>
            <p>Click on message key in hidden row to display that message</p>
            <p>Click on an individual message to hide that message.</p>
        </span>
        <span id="msg_hideall" class="msgfix_key">hidden:</span>
        <span class="help">Click to hide all messages, or display all if all hidden.</span>
        <span id="msgfix_${i}" class="msgfix_value">
            ${val}
        </span>
        <span class="help">Click to restore message.</span>
        </span>
</span>`
                        else
                htmlo =
// html for all other messages
`<span class="msg_item">
    <span id="msgfixo_${i}" class="${mset.newxclass}">
        <b class="msgfix_key">${i}: </b>
        <span id="msgfix_${i}" class="msgfix_value">
            ${val}
        </span>
    </span>
        <span class="help">
            Click to hide <b class="msgfix_key">${i}</b> message.
            <br>ctrl-click to remove
            <br>alt-click to promote to top of list
        </span>
</span>
`;
            const div = document.createElement('div');
            div.innerHTML = htmlo;
            //W.msgbox.innerHTML += htmlo;
            //mset.htmlo = W['msgfixo_' + i];
            mset.htmlo = div.firstChild;
            W.msgbox.appendChild(mset.htmlo);
            mset.htmlval = W['msgfix_' + i];
            mset.oldval = val;
        }
        mset.xclass = mset.newxclass;
        if (msgfix.not[i] !== true &&
            (mset.xclass || msgfix.all === true || (typeof msgfix.all === 'string' && msgfix.all.indexOf(i) !== -1))) {
            if (val !== mset.oldval) {
                mset.oldval = val;
                mset.htmlval.innerHTML = val;
            }
            if (mset.htmlo.style) mset.htmlo.style.display = '';
        } else {
            mset.htmlo.style.display = 'none';
        }
    }

    for (let i in deadlist) {
        const id = deadlist[i];
        if (msgset[id].htmlo) W.msgbox.removeChild(msgset[id].htmlo);
        delete msgset[id];
    }
}


/** set an named property on a id'd element, if element exists. */
function trysetele(eleid, propname, value) {
    var ele;  // real element
    if (typeof eleid === "string")
        ele = document.getElementById(eleid);
    else {
        ele = eleid;  // already passed the ele itself
        eleid = ele.id;
    }
    if (eleid in inputs)         // add sjpt 6 Oct 2022
        inputs[eleid] = value;
    if (ele) {
        if (propname === 'value')
            setInput(eleid, value); // inputs[eleid] = value;
        else
            ele[propname] = value;
        //noticed that change events don't fire automatically on textarea (effected CodeMirror implementation)
        //this seemed like a potential low-level point to maximise likelihood that in general we would call any interested listeners
        //however, didn't seem to help, and has potential to hinder performance.
        //$(eleid).trigger("change");
        return true;
    }
    else return false;
}
/** set value on a id'd element, if element exists. */
function tryseteleval(eleid, value) {
    var r = trysetele(eleid, 'value', value);
    return r;
}

/** step a value by n steps (up or down */
function stepeleval(ele, steps) {
    if (typeof ele === "string") ele = document.getElementById(ele);
    ele.value = 1 * ele.value + steps * ele.step;
    rangeeleval(ele);
}

function rangeeleval(ele) {
    var v = 1 * ele.value;
    if (v < ele.min) v = ele.min;
    if (v > ele.max) v = ele.max;
    ele.value = inputs[ele.id] = v;
}

/** get named property for an id'd element element, or return default.  Return in number format if possible. */
function trygetele(eleid, propname, def) {
    // don't use inputs cache, may not be set yet
    //    if (inputs[eleid] !== undefined)
    //        return inputs[eleid];
    var ele = document.getElementById(eleid);
    var val;
    if (ele) {
        val = ele[propname];
        if (val === "") return val;  // alas, isNan("") === false
        return isNaN(val) ? val : Number(val);
    } else {
        return def;
    }
}

/** get value property for an id'd element element, or return default.  Return in number format if possible. */
function trygeteleval(eleid, def) { return trygetele(eleid, 'value', def); }

/** move up chain to find a gene element (eg with currentEle */
function getg(x) { var r = x; while (r.currentEle === undefined) r = r.parentNode; return r; }

/** copy fields of object into another, ??? shoud this use clone for deeper copy ???
* tailored for genes
 * optional filter to copy only selected elements
*/
function copyFrom(obj1, obj2, filter) {
    if (obj1 === obj2) return;  // not just optimization, it was damaging for _rot4_ele
    if (!obj2) return;
    for (var gn of Object.keys(obj2)) {         // gn in gets absurd amounts for eg new THREE.Vector4()
        if (filter !== undefined && !(gn in filter) ) continue;
        const v2 = obj2[gn];
        if (gn === "_rot4_ele") {    // very poor hack .... ??? use typeof
            obj1[gn] = v2.slice();
        } else if ( gn === "_gcentre") {
            if (!obj1[gn]) obj1[gn] = new THREE.Vector4();
            obj1[gn].copy(obj2[gn]);
        } else if (v2 === null || v2 === undefined) {
            // log('unexpected gene value in copyFrom', gn, v2);
        } else {
            obj1[gn] = obj2[gn];
        }
    }
    return obj1;
}

/** deep copy object
 * https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
 */
function deepCopy(obj, exclude = {}) {
    const  ilg = [], olg = [];
    const ret = dc(obj, ilg, olg, exclude);
    log('obj count', ilg.length)
    return ret;

    function dc(_obj, il, ol, _exclude) {
        if(_obj == null || typeof(_obj) !== 'object'){
            return _obj;
        }
        const k = il.indexOf(_obj);
        if (k !== -1) return ol[k];

        // make sure the returned object has the same prototype as the original
        const reti = Array.isArray(_obj) ? [] : Object.create(_obj.constructor.prototype);
        il.push(_obj); ol.push(reti);
        for(var key of Object.keys(_obj)) {
            if (!_exclude[key])
                reti[key] = dc(_obj[key], il, ol, _exclude);
        }
        return reti;
    }
}

/** copy selected fields of object into another */
function copyFromSel(obj1, obj2, lists) {
    const list = lists.split(' ');
    list.forEach(gn => obj1[gn] = obj2[gn]);
    return obj1;
}

/** deeper copy from */
function copyFromN(to, from) {
    for (var gn in from) {
        var ggn = gn.split('.')
        if (!ggn[1])
            to[gn] = from[gn];
        else if (!ggn[2])
            to[ggn[0]][ggn[1]] = from[gn];
        else if (!ggn[3])
            to[ggn[0]][ggn[1]][ggn[2]] = from[gn];
        else
            throwe('copyFromN only implemented to depth 2:', gn);
    }
}

/** clone object, keep class information */
function clone(obj) {
    if (typeof obj !== 'object') return obj;
    if (obj.clone)
        return obj.clone();
    return deepClone(obj);

    // if (typeof obj !== 'object') return obj;
    // if (obj === null) return null;
    // const r = dstring(xstring(obj));
    // // if ('#k' in r) debugger
    // return r;

    // below lost class information
    // var s;
    // try {
    //     s = JSON.stringify(obj);
    //     return JSON.parse(s);
    // } catch (e) {
    //     console.error("Clone error for " + obj + ": " + e);
    //     return cloneNoCircle(obj);
    // }
}

/** map the classes that might be needed by xstring.
In fact, as at 23 April 2015 Dispobj is the only class needed,
and as long as a load has been performed, Dispobj will be already set up
 */
function mapOnce() {
    if (!name2class.Dispobj) {  // Horn etc escape as they are classes .... TODO
        loadTime('mapOnce start');
        mapclasses({ ignoreprefixes: ["global", "process", "webkit", "navigator", "WebGL", "WebKit"] }); // don't waste time, or blow up on nw
        loadTime('mapOnce end');
    }
}

/**
 * check for cirular references in object
 * return descriptiove string
 */
function cloneNoCircle(o) {
    mapOnce();
    if (o === undefined) return o;
    if (typeof o === 'function') return o;
    var jj = objstring(o);
    return JSON.parse(jj);

}
/**
 * check for cirular references in object
 * return sort of ok clone
 */
function objstring(o) {
    if (o === undefined) return '"UNDEFINED"';
    if (o === null) return '"NULL"';
    var cache = [];
    var cln = o.__proto__['#clname'];
    if (cln && cln.startsWith("THREE.")) return '{ "OBJTYPE": "' + cln + '"}';
    var jj = JSON.stringify(o,
        function (key, value) {
            //ss.push(key);
            if (typeof value === 'object' && value !== undefined) {
                var xref = cache.indexOf(value);
                if (xref !== -1) // Circular reference found, make an xref object
                    return { "#xref": xref };
                if (value && typeof value === 'object') {
                    try {
                        Object.defineProperty(value, '#k', { enumerable: false, writable: true, configurable: true });
                        value['#k'] = cache.length;
                    } catch (e) {
                        //log("object cannot be marked in objstring", o);  // for IE?
                    }
                }
                cache.push(value);  // Store value in our collection
            }
            return value;
        }, "\t");
    return jj;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ serialization

// name2class keeps a map from class name to prototype.
// The reverse map is help by a class2name (#clname) property held in the prototype
// This may be set up by explicit calls, or using mapclasses() to map them automatically.
// The class2name property is used by xstring to save the class information as a string.
// The name2class map and saved class2name are used by dstring to restore appropriate prototype information.

/** defined a class name/proto combination for serialization */
function xclass(name, proto) {
    if (proto === undefined) {
        proto = www(name).prototype;
    }
    // proto[class2name] = name;
    class2name.set(proto, name);
    name2class[name] = proto;
    xconstructors[name] = proto.constructor;
}

/** save an object as yaml string, complete with type information  */
function yamlSave(obj) {
    mapOnce();

    const ignoreclasses = [THREE.Object3D, THREE.WebGLRenderTarget, THREE.Texture, THREE.Scene, HTMLElement, HTMLDocument];
    var polluted = [];
    // var markedmap = new Map();    // map of marked objects to their marked version
    // replacer for yaml ... maybe move to xstring.
    // replacer pollutes and unpollutes objects; this could give javascript optimizer performance issues
    // attempts to mark a clone instead
    function replacer(key, object) {
        if (typeof object !== 'object' || object === null) return object;
        for (let i=0; i<ignoreclasses.length; i++) if (object instanceof ignoreclasses[i]) return undefined;
        const classn = class2name.get(object.__proto__);
        if (classn) {
            //Object.defineProperty(value, '##c', { enumerable: true, writable: true}); // no needed

            //  // direct clone NO, this prevents yaml seeing duplicate references
            // object = Object.assign({}, object);

            // // marked clone, so same clone used for each reference, still broke yaml's recognition of duplicates
            // let marked = markedmap.get(object);
            // if (!marked) {
            //     marked = Object.assign({}, object);
            //     markedmap.set(object, marked);
            //     marked['##c'] = classn;
            // }
            // return marked;

            // polluted version works
            object['##c'] = classn;
            polluted.push(object);
        } else if (Object.keys(object.__proto__).length !== 0) {
            console.error("Unexpected object found with no class info in yamlSave, mapOnce() called too early?", object);
        }

        return object;
    }
    try {
        var s = yaml.safeDump(obj, {replacer, skipInvalid: true, lineWidth: 9999, flowLevel: 999});
        return s;
    } finally {
        for (let object of polluted) delete object['##c'];
    }
}


var saveconwarn;
function myconwarn(msgp) { if (!msgp.startsWith("DEPRECATED:")) saveconwarn(msgp); }

/** Map all the classes to create name2class and help correct serialization
 * Usually only called once per session, but visit number held in case (eg during debug)
 *
 * Recursively visit all objects, marking them with property #visisted.
 * Place a hidden property #clname in each 'interesting' prototype, and save name in name2class.
 * Clean all #visited tags at end.
 * @param {type} options map
    root: root object to map
    name: name of root
    noreset: set to prevent clearing of name2class at start
    ignoreclasses: array of classes to ignore on mapping
 * @returns {undefined}
 */
function mapclasses(options) {
    const visited = new Set();
    //const visit = new Map();
    //const visitp = new Map();
    if (!options) options = {};
    var o = options.root ? options.root : W;
    var name = options.rootname ? options.rootname : "";
    if (!options.noreset) name2class = {};
    var ignoreclasses = options.ignoreclasses ? options.ignoreclasses : [HTMLElement, HTMLDocument];
    var ignoreprefixes = options.ignoreprefixes ? options.ignoreprefixes : [];
    var ignorenames = options.ignorenames ? options.ignorenames : {".inps": true};

    saveconwarn = console.warn;
    console.warn = myconwarn;
    try {
        mapclassesi(o, name);
    } finally {
        // until we find out how to manage Class
        xclass('Dispobj', DispobjC.prototype)
        // name2class.Dispobj = DispobjC.prototype;
        // xconstructors.Dispobj = DispobjC.prototype.constructor;
        // DispobjC.prototype[class2name] = 'Dispobj';

        console.log("mapclasses found " + Object.keys(name2class).length + " classes.");
        console.warn = saveconwarn;
    }

    // internal function called recursively */
    function mapclassesi(oi, namei) {
        try {
            if (ignorenames[namei]) return;
            if (namei.split('.').length > 4) return;
            if (namei[0] === '.') namei = namei.substring(1);
            if (oi === undefined) return;
            if (oi === null) return;
            if (oi === name2class) return;
            var t = typeof oi;
            if (t === "number" || t === "string" || t === "boolean") return;
            if (!oi.hasOwnProperty) return;  // IE seems to require this for some very simple objects ?
            for (var ig = 0; ig < ignoreclasses.length; ig++) if (oi instanceof ignoreclasses[ig]) return;
            for (ig = 0; ig < ignoreprefixes.length; ig++) if (namei.startsWith(ignoreprefixes[ig])) return;
            if (Array.isArray(oi) && oi.length > 100) return;  // against very long arrays, eg data buffers, hope none contain useful classes to map

            var proto = oi.prototype;
            var isclass = proto && Object.keys(proto).length !== 0;

            if (visited.has(oi)) {
                if (isclass)
                    console.oldLog("no remap " + class2name.get(proto) + " = = = " + namei); // oldLog to prevent formatting exception with $
                return;
            }
            visited.add(oi);

            if (t === "object") {
                for (var ii in oi) {
                    try {
                        var pd = Object.getOwnPropertyDescriptor(oi, ii);
                        //if (!(i === "constructor" && !o.hasOwnProperty("constructor")))
                        if (pd && 'value' in pd) {
                            mapclassesi(oi[ii], namei + "." + ii);
                        }
                    } catch (e) {  // Edge sometimes throws this
                        log("exception in mapclasses", oi[ii], namei + "." + ii, e);
                    }
                }
            } else if (t === "function") {
                // could include even trivial ones, in case they become non-trivial later
                // eg a class with no methods now may still be interesting
                // maybe se should base it also on whether we see any instances ???
                if (isclass /* proto && Object.keys(proto).length !== 0 */) {
                    if (visited.has(proto)) {
                        console.log("duplicate name for class " + class2name.get(proto) + " ~~ " + namei);
                    } else {
                        visited.add(proto)

                        // Object.defineProperty(proto, class2name, { enumerable: false, writable: true });
                        // proto[class2name] = namei;
                        class2name.set(proto, namei);
                        name2class[namei] = proto;
                    }
                }
            } else {
                console.log("unexpected typeof " + t);
            }
        } catch (e) {
            //log("could not use mapclasses on", o, e);
        }
    }
}


/** find object or name from it's string */
function www(n) { let nn = n.split('.'); let w = W; for (var i in nn) w = w[nn[i]]; return w; }

/** create JSON with classes and circular/duplicate references
Visited objects are marked with a hidden ##c value to allow the class/proto to be reconstructed, taken from the prototype
and a  hidden #k value to allow for circular/duplicate references.
#k and ##c should ot need to be hidden as they are cleaned up, but are hidden in case of exception
Maybe shoud use try finally to maike sure of cleanup?
Revisted objects are detected by the

*/
function xstring(o, options) {
    mapOnce();
    if (!options) options = {};
    var ignoreclasses = options.ignoreclasses ? options.ignoreclasses : [HTMLElement, HTMLDocument];
    var maxlen = FIRST(options.maxlen, 10000);
    var cache = [];
    var polluted = [];
    var jj = JSON.stringify(o,
        function (key, value) {
            for (var ig = 0; ig < ignoreclasses.length; ig++) if (value instanceof ignoreclasses[ig]) return undefined;

            if (typeof value === 'object' && value !== undefined && value !== null) {
                if (value.length > maxlen) return undefined;
                var xref = value['#k'];   // was cache.indexOf(value)
                if (xref !== undefined) { // Circular reference found
                    if (typeof xref === 'number')
                        return { "#xref": xref };
                    else
                        log('unexpected #xref value', xref, cache.indexOf(value))
                }
                if (value && typeof value === 'object') {  // first visit to object
                    if (!value.__proto__) return undefined;   // happened for EventHandlers
                    polluted.push(value);
                    //Object.defineProperty(value, '#k', { enumerable: true, writable: true});
                    value['#k'] = cache.length;
                    const classn = class2name.get(value.__proto__)
                    if (classn) {
                        // Object.defineProperty(value, '##c', { enumerable: true, writable: true});
                        value['##c'] = classn;
                    } else if (Object.keys(value.__proto__).length !== 0) {
                        console.log("Warning: unexpected object found with no class info", key, value);
                    }
                }
                cache.push(value);  // Store value in our collection
            }
            return value;
        }, "\t");

    for (o in polluted) { delete polluted[o]['##c']; delete polluted[o]['#k']; }
    return jj;
}

/** from https://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
 * deep clone an object and keep type, does not need name2class or class2name
 *
 * */
function deepClone(obj, hash = new WeakMap()) {
    if (Object(obj) !== obj) return obj; // primitives
    if (hash.has(obj)) return hash.get(obj); // cyclic reference
    const result = obj instanceof Set ? new Set(obj) // See note about this!
                 : obj instanceof Map ? new Map(Array.from(obj, ([key, val]) =>
                                        [key, deepClone(val, hash)]))
                 : obj instanceof Date ? new Date(obj)
                 : obj instanceof RegExp ? new RegExp(obj.source, obj.flags)
                 // ... add here any specific treatment for other classes ...
                 // and finally a catch-all:
                 : obj.constructor ? new obj.constructor()
                 : Object.create(null);
    if (typeof result.Init === 'function') result.Init();
    hash.set(obj, result);
    return Object.assign(result, ...Object.keys(obj).map(
        key => ({ [key]: deepClone(obj[key], hash) }) ));
}

/** get the contructor for a string classname  */
function getConstructor(classname) {
    if (classname === 'Dispobj') return DispobjC.prototype.constructor; // until we find out how to manage Class
    const path = classname.split('.');
    let cl = window;
    path.forEach(p => cl = cl[p]);
    return cl;
}

/** parse JSON/yaml with classes and circular/duplicate references
Remove pollution as we go.
There are two distinct cases:
    yaml: the circular/duplicate references are dealt with by yaml
    json: we must handle the circular/duplicate references (#k and #xref fields)
In either case we must handle the class object details (##c field)
*/
function dstring(ostr) {
    // mapOnce();  // no longer needed, we compute contructors using getConstructor()
    var str = ostr;

    // to consider, should refmap be integrated into reviver ???
    var reviver = (key, value) => key === 'frameSaver' && !nwfs ? undefined : value; // TODO generalize or ...??? stephen 21/01/2017
    //    var o = JSON.parse(str, reviver);
    let obj;
    //?? todo, separate yaml case by start with { or [}
    let isjson = ostr[0] === '{' || ostr[0] === '[';
    if (isjson)
        obj = JSON.parse(str, reviver);
    else
        obj = jsyaml.safeLoad(str);

    const map = isjson ? {} : 'NO MAP FOR YAML';                // map from #k to (possibly transformed) object
    var maxd = 0;                                               // depth control
    var visited = isjson ? 'NO VISITED FOR JSON' : new Set();   // visited objects, to stop visit recursion
    var gxref = 0;                                              // count to keep track of xref, used to patch missing array #k
    obj = refmap(obj, 0);                                       // pass to recreate classes and compute #xref map if isjson
    if (isjson) {
        gxref = 0;                                              // count to keep track of xref, used for debug
        repmap(obj, 0, '');                                     // map in the duplicate references #k/#xref
    }
    // log ('dstring maxd', maxd);
    return obj;

    // add class information from name2class, and call their Init() function if present
    // and make a map of all object references (isjson only)
    function refmap(o, d) {
        if (o === null) return;
        if (typeof o !== 'object') return o;    // why did I not have that before???

        if (isjson) {
            const myxref = gxref;
            if (o['#k'] !== myxref) {
                if (o['#xref'] !== undefined)                     // its an xref object, does not count
                    return o;
                else if (o instanceof Array)
                    o['#k'] = myxref;               // it's an Array and its #k field was lost by serialization
                else
                    log('refmap', o['#k'], myxref, o);  // something really is wrong
            }
            if ('#xref' in o) return o;             // ref in JSON case
            gxref++;
        } else {
            // for yaml, which has already expanded multiple/circular references
            // note only the unclassed object will be polluted by #replaced, so no need to clean it up
            if (o['#replaced'])                     // revisit to yaml class object
                return o['#replaced'];              //
            if (visited.has(o)) return o;           // revisit to yaml non-call object
            visited.add(o);
        }

        // common to yaml or no yaml
        if (d > maxd) maxd = d;
        if (d > 25)
            log("stack?", d);
        if (d > 30)
            throwe('stack overload in refmap');
        if (typeof o === "object") {
            // mark and recurse first, before we add extra prototype detail
            for (var i in o)
                if (i === 'frameSaver')     // gets confused with frameSaver, we should have avoided saving it
                    o[i] = undefined;
                else {
                    let soi = o[i];         // remember old for debug
                    // o[i] will change when a ##c Class object is replaced by a new Class object
                    o[i] = refmap(o[i], map, d + 1);
                    // o = o;  // debug
                }

            // make an object of the correct class if such a class is defined
            const classname = o['##c'];
            if (classname) {
                //PJT when loading CSynth from website in Safari, I was seeing this fail to as lots of things had 'initGlobals.' prepended to name...
                //(as of this writing, the server isn't running on my dev machine for some reason, so not tested this change...)
                // const cl2 = name2class[classname] ? name2class[classname] : name2class['initGlobals.' + classname];
                let con2 = xconstructors[classname];
                if (!con2) con2 = xconstructors[classname] = getConstructor(classname);
                if (!con2) serious('no constructor found for class', classname);
                const newo = new con2();        // we have found the class, make a new objects
                if (typeof o.Init === "function") o.Init(); // call Init if there
                for (let k in o)                // and copy over all the non-pollution fields
                    if (k !== '##c') newo[k] = o[k];
                if (!isjson) o['#replaced'] = newo;      // o is un-classed, newo is classed equivalent, save for yaml revisits
                o = newo;
            } else {
                if (typeof o.Init === "function") o.Init();
            } // classname

        }
        if ('#k' in o) {
            if (isjson)
                map[o['#k']] = o;       // remember the object for its key, it will be the class object if appropriate
            else
                console.error('unexpected #k field for yaml in object', o)
        }
        return o;
    }


    // substitute all xref references with the appropriate object
    // does not apply in yaml case, yaml has done this work
    // will not be called in yaml case as map will be empty
    function repmap(o, d, path) {    // ccc counts up xref
        if (d > 25)
            log("stack?", d);
        if (o === null) return;
        if (typeof o === "object") {
            if (o['#k'] !== gxref && o['#k'] !== undefined)
                log('remap', o['#k'], gxref);
            // history note ... Array was special case becuase serialization lost #k field. Now handled in refmap above
            // #k serves two purposes.
            //    One it to allow the cross references to be mapped (in refmap above)
            //    The other is to ensure that the logic below applies to saved objects exactly once
            //    and  that no attempt is made to apply it to unsaved objects (eg recreated during class csontruction/Init)
            // Other undefined can be because of fields not saved in original serialization
            // but created by class reconstruction: eg Dispobj will automatically create a THREE.Scene
            if (o['#k'] === undefined) //  && !(o instanceof Array))
                return;
            delete o['#k'];
            gxref++;
            for (var i in o) {
                var pd = Object.getOwnPropertyDescriptor(o, i);
                //if (!(i === "constructor" && !o.hasOwnProperty("constructor")))
                if (!(pd && 'value' in pd)) continue;
                var oi = o[i];
                if (!oi) continue;
                var xref = oi['#xref'];
                delete oi['#xref']; // no need, xref object has done its task and is now orphaned
                if (xref !== undefined) {
                    o[i] = map[xref];
                    if (o[i] === undefined)
                        console.log("unexpected #xref found: " + xref);
                } else {
                    repmap(oi, map, path + '.' + i);
                }
            }
        }
    }
}


// to use soon xstring(currentObjects, {ignoreclasses: [THREE.Object3D]})

/** convert to float */
function f(str) {
    return parseFloat(str);
}

/** return random integer range l..h-1, or 0..l-1 if h undefined */
function randi(l, h) {
    if (h === undefined) { h = l; l = 0; }
    return Math.floor(l + (h - l) * Math.random());
}

/** select random element from array or object */
function randfrom(arr) {
    if (!Array.isArray(arr)) arr = Object.values(arr);
    return arr[randi(arr.length)];
}

/** random in range if v array or v2 given, otherwise v */
function randrange(v, v2) {
    if (v.length === 2) [v, v2] = v;
    if (v2 === undefined ) return v;
    return +v + Math.random() * (v2-v);
}


/** return random integer range l..h-1, or 0..l-1 if h undefined; different from last */
function randiNew(l, h) {
    for (let i=0; i < 10; i++) {
        const r = randi(l, h);
        if (r !== randiNew.last) {
            randiNew.last = r;
            return r;
        }
    }
    return randi(l, h);
}

/** random vector3 */
function randvec3(k=1) {
    const r = () => (Math.random()-0.5) * 2 * k;
    return new THREE.Vector3(r(), r(), r());
}

/** mix two values */
function mix(l, h, p) { return h * p + l * (1 - p); }

HTMLTextAreaElement.prototype.autosize = function () {
    try {
        var x = this.value.split("\n");
        var w = 0;
        for (var i = 0; i < x.length; i++) w = Math.max(w, x[i].length);
        //this.cols = Math.max(w, this.cols);
        //this.rows = Math.max(x.length, this.rows);
        this.cols = Math.max(w, 10);
        this.rows = x.length;
    } catch (e) {
        log("Error in autosize", e.stack);
    }
};

var floor = Math.floor;


var postCache = { real: 0, cache: 0 };
var firstfail = true;

function clearPostCache(r) {
    if (framenum < 5) {
        // log('ignored during startup');
    } else {
        log('postCache pre clear', r, 'real', postCache.real, 'cache', postCache.cache, 'framenum', framenum);
        postCache.real = 0; postCache.cache = 0;
        for (let k in postCache) {
            if (postCache[k] && postCache[k].source !== 'websocket')
                postCache[k] = undefined;
        }
    }
}

/** this will return data from cache
We currently use the same cache for http read data and websocket sent data.
We always allow an attempt at http if not in cache; may want to force (sent) cache only
These may change.
*/
function sentData(uri) {
    return postCache[uri] && postCache[uri].v;  // may be undefined if none
}

/*
posturiasync                        callb
posturimsg -> posturimsgasync       async: uses await and return value
posturimsgasync                     return promise
posturierror -> posturi             return value
posturi                             return value
posturibin                          callb
*/


/** post a uri and process callback, callback given data only  */
function posturiasync(puri, callb) {
    var curi = uriclean(puri);
    const d = sentData(curi);
    // if d, do callback deferred in case caller assumes async.  {} may get given unused onprogress by caller
    if (d !== undefined) { setTimeout(()=> callb(d), 0); return {}; }
    var req = new XMLHttpRequest();
    req.open("GET", curi, true);
    req.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
    req.send();
    req.onload = function (oEvent) {
        if (req.status === 200)
            callb(req.responseText);
        else
            console.error('cannot load', curi, 'status', req.status);
    }
    req.onerror = function (oEvent) { console.error('cannot load', curi, oEvent); }
    req.ontimeout = function (oEvent) { console.error('timeout error, cannot load', curi, oEvent); }
    return req;  // so caller can overwrite onerror etc
    // req.onprogress = function (e) { console.log('progress', puri, e.loaded, e.total); }
}


// like posturi but tracks progress
async function posturimsg(uri) {
    const st = Date.now();
    uri = uriclean(uri);
    let r;
    try {
        r = await posturimsgasync(uri);
    } catch (e) {
        log ('async error reading', uri, e);
        r = undefined;
    }
    log('got r, it is', r ? r.substr(0,20) : 'NOR');
    const urik = 'reading file: ' + uriclean(uri);
    const et = Date.now() - st;
    msgfix(urik, 'read complete, time', et, r === undefined ? 'ERROR' : '' );
    return r;
}

//generate html for % bar. input is i in range 0..1
function genbar(i) {
    // todo: style bar, and make part of msg so html WWW edited rather than regenerated
    const bar = `
        <div class="barback"><span class="barbar" style="width:${i*100}%"></span></div>`
    return bar; // .split('WWW').join(Math.round(i*100));
}

function uriclean(puri) {
    if (!puri) puri = '';
    let uri0 = puri.replace(/\\/g, '/');  // replace \ with /
    let uri1 = uri0.replace(/\/\//g, '/');  // reduce all intermediate // to /
    let uri2 = uri1.replace(':/', '://');   // but do not kill http:// etc
    if (islocalhost) uri2 = uri2.replace(/\.\./g, ',,');    // node server does nasty things to .., send ,, and replace back at server
    return uri2;
}

// like postruiasync but returns promise and tracks progress
function posturimsgasync(puri) {
    const uri = uriclean(puri);
    const d = sentData(uri);
    if (d !== undefined)  // return d as promise, but delayed in case caller assuming it will be async
        return new Promise( (resolve, reject) => setTimeout(()=>resolve(d), 0) );

    const urik = 'reading file: ' + uriclean(uri);
    if (nwfs) {
        const data = nwfs.readFileSync(uri, 'ascii');
        msgfix(urik, '<br>complete (nwfs sync)<br>' + genbar(1));
        return Promise.resolve(data);
    }
    var req = new XMLHttpRequest();
    req.open("GET", uri, true);
    req.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
    req.send('');
    let t = Date.now();
    req.onprogress = function (e) {
        const tt = Date.now();
        const m = `progress ${e.loaded} of ${e.total}`;
        const n = 100;
        const p = Math.round(n * e.loaded/e.total);
        msgfix(urik, '<br>' + m + '<br>' + genbar(e.loaded/e.total));
        if (tt > t+1000) {
            console.log(uri, m);
            t = tt;
        }
    }

    return new Promise( (resolve, reject) => {
        req.onload = function (oEvent) {
            msgfix(urik, '<br>complete<br>' + genbar(1));
            if (req.status !== 200) {
                reject(new Error(console.log('cannot load', uri, req.status)));
                return;
            }
            // setTimeout( () => msgfix(urik), 2000);
            log(urik, 'loaded', req.responseText.length);
            resolve(req.responseText);
        }
        req.onerror = function (oEvent) {
            reject(new Error(console.log('onerror, cannot load', uri, oEvent)));
        }
        req.ontimeout = function (oEvent) {
            reject(new Error(console.log('timeout, cannot load', uri, oEvent)));
        }
    });
}



/** post a uri, and if issues then show an error */
function posturierror(puri, data) {
    const rdata = posturi(puri, data);
    if (rdata === undefined) msgfixerror(puri, 'cannot load data');
    return rdata;
}

var preloaded = {};

function preload(list) {
    for (const fn of list)
        fetch(fn).then(r => r.text()).then(d => preloaded[fn] = d)
}

var _topreload =
[
    "CSynth/messages.txt",
    "shaders/copy.vs",
    "shaders/copy.fs",
    "shaders/threek.vs",
    "shaders/common.vfs",
    "shaders/hornmaker.vs",
    "shaders/four.fs",
    "shaders/common.vfs",
    "shaders/lights.fs",
    "shaders/fourShadowMapping.fs",
    "shaders/cubeReflection.fs",
    "shaders/hornmaker.vs",
    "shaders/threek.vs",
    "shaders/fxaa.glsl"
];

if (!isCSynth) {
    _topreload = _topreload.concat([
        "dir.php?./gallery",
        "/fileexists/./scconfigOverride.json",
        "./scconfig.json",
        "/eval/process.cwd()",
        "gallery/tad-fubu.oao?0/1641119606611",
        "./synthdefs/map/ctrlNames.yaml",
        "synthdefs/map/genedefs.json",
        "/fileexists/audio/fubuSynthScenes.json",
        "audio/fubuSynthScenes.json",
    ]);
}

// add below if using optimized shaders
if (searchValues.usesavedglsl) {
    _topreload = _topreload.concat([
        "exportShader/_XX/makeskelbuff.opt.vs",
        "exportShader/_XX/makeskelbuff.opt.fs",
        "exportShader/_XX/shadows.opt.vs",
        "exportShader/_XX/shadows.opt.fs",
        "exportShader/_XX/opos.opt.vs",
        "exportShader/_XX/opos.opt.fs",
        "exportShader/_XX/shapepos.opt.vs",
        "exportShader/_XX/shapepos.opt.fs",
        "exportShader/_XX/texture.opt.vs",
        "exportShader/_XX/texture.opt.fs",
        "exportShader/_XX/tshapepos2col.opt.vs",
        "exportShader/_XX/tshapepos2col.opt.fs",
    ]);
}

if (!isNode()) preload(_topreload);

// preload
var posted = [];
/** post a uri and return result string, or undefined if error
 * n.b. used to have option to catch error but not implemented correctly and never used
  */
 function posturi(puri, data, allowmissing = false) {
    var uri = uriclean(puri);

    posted.push(uri);
    const p = (preloaded[uri]); if (p) {  /* console.log("post: preloaded: " + uri); */ return p; }
    // console.log("post:" + uri);
    var useMyCache = false;
    if (data === undefined && uri.indexOf(".txt") === -1 && uri.indexOf('?') === -1) {
        const c = sentData(uri);
        //if (c && c.t > Date.now() - posturi.cacheTime) {
        if (c && c.framenum > framenum - posturi.cacheFrame) {
            //log('cache read', uri);
            postCache.cache++;
            return c.v;  // cache queries but not write requests or database access
        }
        data = "";
        useMyCache = true;
    } else {
        //uri += "?date=" + Date.now();   // force no lower level cache, write or db access
    }
    //log('real read', uri);
    postCache.real++;
    try {
        const st = Date.now();
        var req = new XMLHttpRequest();

        // nb, POST ensures browser cache not used, but does not work with NetBeans web server
        // and sometimes fails under other conditions.
        // GET with extra ? seems to work ok
        if (!data && uri.indexOf('.php') === -1) {
            if(uri.indexOf('?') === -1)
                uri += "?date=" + st;
            else
                uri += "&date=" + st;
        }
            //console.log("posting ..." + uri);
        req.open(data ? "POST" : "GET", uri, false);
        req.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
        // n.b. for a missing file we get a 404 in regular browser use and earlier Electron
        // but an exception is thrown by the next line in recent versions of Electron (certainly <=6 and >3)
        // In regular Chrome we can't prevent chrome giving an error message,
        // so even with allowmissing we still get a message.  There doesn't seem to be a sensible workaround.
        req.send(data);
        const et = Date.now() - st;
        if (et > 100) log('load', puri, 'time', et);
        if (req.status === 200) {
            if (useMyCache) postCache[puri] = {t: Date.now(), framenum, v: req.responseText, source: 'posturi', fid: uri};  // set cache if useful

            firstfail = false;  // it has suceeded once, so missing web server is NOT the reason
            var rlength = +req.getResponseHeader('content-length');
            if (rlength && Math.abs(rlength - req.responseText.length) > 2) // why is it so often wrong
                console.log('unexpected response length', rlength, req.responseText.length, uri);
            return req.responseText;
        } else {
            const m = req.status === 404 ? '404' : req.responseText;  // over-noisy 404 from Oxford server
            if (!allowmissing) msgfixerrorlog(puri, 'cannot read', m);
            return undefined;
        }
    } catch (e) {
        if (allowmissing) return undefined; //eg Electron scconfigOverride.json
        msgfixerror(puri, "post failed", e);
        console.error("post failed " + e);
        if (firstfail) {
            firstfail = false;
            var msgi = ["Failed to load data, maybe because no web server used.",
                "Try loading files by hand, click on 'Choose files' near top of main gui",
                "navigate to '" + location.pathname + "/../shaders' and select all files."
            ];
            serious(msgi.join("\n"));
        }
        return undefined;
    }
}
posturi.cacheTime = 1000;
posturi.cacheFrame = 60;

function clearServerLog() {
    return posturi('/clear/');
}

function makeLogError() {
    var mmsg = showvals.apply(undefined, arguments);
    console.error(mmsg);
    return new Error(mmsg);
}

/** get binary data async
 * from https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
 *
 * For some reason, reading as arraybuffer was VERY slow.
 * It was much quicker to read as blob, and then convert the blob to arraybuffer
 * However, as of 19 Oct 2020 it seems that arraybuffer is now sensible, so default changed, but still leaving legacy blob code for now
 *
 * https://stackoverflow.com/questions/15341912/how-to-go-from-blob-to-arraybuffer
 */
function posturibin(puri, callback, responseType = 'arraybuffer') { // was 'blob'
    const uri = uriclean(puri);
    let st = Date.now();
    var oReq = new XMLHttpRequest();
    oReq.open("GET", uri, true);
    oReq.responseType = responseType;
    oReq.send(null);
    const urik = ' reading file: ' + uriclean(uri);
    const urip = 'deblobbing file: ' + uri;

    return new Promise( (resolve, reject) => {

        oReq.onload = async function (oEvent) {
            if (oReq.status !== 200) {
                reject(new Error(console.log('cannot load', uri, oReq.status)));
            }
            const blob = oReq.response; // Note: not oReq.responseText
            const loadt = Date.now();
            msgfix(urik, '<br>complete<br>' + genbar(1));
            // hard work already done if not reading as blob, just resolve
            if (responseType !== 'blob') {
                posturibin.result = blob; // debug
                // log('data already ok: returning', 'load', uri, 'loadtime', loadt - st)
                if (callback) callback(blob, uri);    // now call user callback

                resolve(blob);
                return;
            }

            // blob conversion needed
            log(uri, 'data loaded, reading');
            const fileReader = new FileReader();
            posturibin.blob = blob; // debug
            fileReader.readAsArrayBuffer(blob);

            // we've got the data as blob, convert to arrayBuffer
            fileReader.onload = function(event) {
                log('onload done')
                const convt = Date.now();
                const arrayBuffer = event.target.result;
                if (callback) callback(arrayBuffer, uri);    // now call user callback
                const cbackt = Date.now();
                log('load', uri, 'loadtime', loadt - st, 'convtime', convt - loadt, 'callbacktime', cbackt - convt,
                    'total time', cbackt - st);
                msgfix(urip, '<br>complete blob conversion<br>' + genbar(1));

                resolve(arrayBuffer);
            }
            fileReader.onprogress = function(e) {
                log('reading loaded blob', e.loaded, e.total);
                msgfix(urip, '<br>blob conversion<br>' + genbar(e.loaded/e.total));
            }

            // Stephen, 17/10/18
            // The conversion below seems much simpler than the FileReader approach
            // but for some reason it is taking MUCH longer on large data sets,
            // so is commented out for now.
            // If it is to be used for test, comment out fileReader.readAsArrayBuffer(blob); line above
            // If it gets to be seisible we can remove all the FileReader stuff.
            //const arrayBuffer = await new Response(blob).arrayBuffer();
            //log('awaited arrayBuffer complete, len ', arrayBuffer.byteLength);
            //posturibin.arrayBuffer = arrayBuffer;
            //resolve(arrayBuffer);


        //if (arrayBuffer) {
        //  var byteArray = new Uint8Array(arrayBuffer);
        //  W.result = byteArray;  // <<<<<<<<<<<< todo refine
        //}
        };
        oReq.onerror = function (oEvent) {
            reject(makeLogError('cannot load', uri, oEvent));
        }
        oReq.ontimeout = function (oEvent) {
            reject(makeLogError('timeout error, cannot load', uri, oEvent));
        }
        oReq.onprogress = function (e) {
            msgfix(urik, '<br>reading<br>' + genbar(e.loaded/e.total));
        }
    });
}


/**
    var oReq = new XMLHttpRequest();
    oReq.open("GET", puri, false);
    oReq.setRequestHeader("Accept", "image/tif");
    oReq.send();
    var arrayBuffer = oReq.response; // Note: not oReq.responseText
    return arrayBuffer;
**/


/** get data, either form special getdata format, or from file */
function getdata(fid) {
    var fidx = fid.pre('?');
    var sh = getdata[fidx];
    return sh || getfiledata(fid);
}

/** get file data, either from preloaded cache, or from posturi,
 * return undefined if none. Second argument suppresses 'serious' error messages. */
function getfiledata(fn, allowMissing = false) {
    var base = fn.substr(fn.lastIndexOf("/") + 1);
    var pre = loadedfiles[base];
    return pre || posturi(fn, undefined, allowMissing);
}


// turns a string (even scoped ones) into a function "pointer"
function GetFunctionFromString(string) {
    var scope = window;
    var scopeSplit = string.split('.');
    for (var i = 0; i < scopeSplit.length - 1; i++) {
        scope = scope[scopeSplit[i]];

        if (scope === undefined) return;
    }

    return scope[scopeSplit[scopeSplit.length - 1]];
}



// mim function. Useful for faking rpcs for postmessage
// a silly kind of function call interpreter ?
// basically eval would be very tricky to work with a long list of arguments
// using strings for UI function calls is actually easier
function FCall() {
    var func_name = arguments[0];
    var arg = []; // new Array();

    var end = arguments.length;
    for (var i = 1; i < end; ++i) {
        if (typeof arguments[i] === 'function') {
            //func = arguments[i];
            continue;
        }
        arg.push(arguments[i]);
    }

    var data = []; // new Array();
    data.func = func_name;
    data.arg = arg;

    // call our projection window, then handle ourselves
    if (UICom) UICom.SendMessage(data);
    RPCCall(func_name, arg);
}

function RPCCall(name, arg) {
    // if (oxcsynth) return;
    var func = GetFunctionFromString(name);
    if (!func) {
        if (!oxcsynth || name !== 'setMasterVolume')
            console.error('cannot make RPCCall for ' + name);
        return;
    }
    func.apply(0, arg);
}


/** dispose of object if it exists and is disposable */
function cdispose(o) {
    if (!o) return;
    var ov = o.toString();
    if (o.dispose) {
        console.log(mycaller() + " disposing of " + ov);
        o.dispose();
    } else {
        console.log(mycaller() + " Object cannot be disposed " + ov);
    }
}

/** find my caller (even where arguments.caller etc fail) */
function mycaller(n = 1) {
    var es = stack();
    return es[2+n];
}

function mycallername(n = 1) {
    let k = mycaller(n+1);
    return k ? k.trim().split(' ')[1] : 'NONE';
}

/** get the stack, with carriage returns */
function stackcr() {
    return (new Error()).stack;
}
/** get the stack */
function stack() {
    return (new Error()).stack.split("\n");
}

function showbaderror(msgi, e) {
    W.baderror.innerHTML = "<h1>Bad error (maybe in WebGL)</h1><div>" + msgi + "</div>";
    serious("Bad error: ", e);
    W.baderror.style.display = "block";
}

function showbaderrornogl(msgi, e) {
    W.baderror.innerHTML = "<h1>Bad error</h1><div>" + msgi + "</div>";
    W.baderror.style.display = "block";
}

/** return the first argument that is not null or undefined */
function FIRSTG(s) {
    for (var i in arguments) {
        if (arguments[i] !== undefined && arguments[i] !== null)
            return arguments[i];
    }
}

function FIRST(a, b, c, d, e, ff, g, h) {
    if (a !== undefined) return a;
    if (b !== undefined) return b;
    if (c !== undefined) return c;
    if (d !== undefined) return d;
    if (e !== undefined) return e;
    if (ff !== undefined) return ff;
    if (g !== undefined) return g;
}
function FIRST3(a, b, c) {
    if (a !== undefined) return a;
    if (b !== undefined) return b;
    if (c !== undefined) return c;
}


    /** find exact value in object, return (list of) keys */
    function findval(obj, val) {
        var s = [];
        for (var n in obj) if (obj[n] === val) s.push(n);
        return s;
    }

/** convenience method for .contains() */
//String.prototype.contains = function(x) { return this.indexOf(x) !== -1; };
//Array.prototype.contains = function(x) { return this.indexOf(x) !== -1; };

// n.b. these were included with older three.js
// but not with later one
// Shims for "startsWith", "endsWith", and "trim" for browsers where this is not yet implemented
// not sure we should have this, or at least not have it here

// http://stackoverflow.com/questions/646628/javascript-startswith
// http://stackoverflow.com/questions/498970/how-do-i-trim-a-string-in-javascript
// http://wiki.ecmascript.org/doku.php?id=harmony%3astring_extras

/** check if string starts with given string */
String.prototype.startsWith = String.prototype.startsWith || function (str) {
    return this.slice(0, str.length) === str;
};

/** check if string ends with given string */
String.prototype.endsWith = String.prototype.endsWith || function (str) {
    var t = String(str);
    var index = this.lastIndexOf(t);
    return (-1 < index && index) === (this.length - t.length);
};

/** trim string head and tail */
String.prototype.trim = String.prototype.trim || function () {
    return this.replace(/^\s+|\s+$/g, '');
};

/** return part of string before k, or all string if k not found */
String.prototype.pre = String.prototype.pre || function (k) {
    var i = this.indexOf(k);
    // mad js has this as an array
    return i === -1 ? this.toString() : this.substring(0, i);
};

/** return part of string after k, or undefined if k not found */
String.prototype.post = String.prototype.post || function (k) {
    var i = this.indexOf(k);
    return i === -1 ? undefined : this.substring(i + k.length);
};

/** return part of string after k, or undefined if k not found */
String.prototype.contains = String.prototype.contains || function (k) {
    var i = this.indexOf(k);
    return i !== -1;
};

/** get the body from a function */
function getBody(fun) {
    return fun.toString().post('/*').pre('*/');
}


/** format number with max n decimal places, remove trailing 0 . */
function format(k, n, opts = {}) {
    let trim = opts.trim ?? false;
    let totlen = opts.totlen ?? 100000;
    let maxdepth = opts.maxdepth ?? 2;
    if (opts && typeof opts !== 'object') trim = opts;  // support old use of trim as third parm

    // if (typeof k === 'number' && k > 1000) return k.toLocaleString(); // , breaks write object and read back in
    if (totlen <= 0) return '!!!';
    if (k === undefined) return 'U';
    if (k === null) return '#null#';
    if (k === window) return '#window#';
    if (!k) return k + '';
    if (k === '') return '!empty!';
    if (k === ' ') return '!space!';
    if (typeof k === 'string' && k.trim() === '') return '!spaces' + k.length + '!';
    if (typeof k === 'boolean') return k;
    if (k instanceof Error || k instanceof ErrorEvent) {
        return `${k.message}
${k.filename} l: ${k.lineno} col: ${k.colno}
${k.stack}`;
    }
    if (typeof k === 'object') {
        if (k instanceof Date) return k.toUTCString();
        if (format.depth > maxdepth) return '!too deep!';
        format.depth++;
        let r;
        try {
            const typename = k.constructor?.name;
            if (typename?.endsWith('Array')) {
                if (k.length === 0) {
                    r = '[]';
                } else {    // for short items show in row, else in column
                    const f0 = format(k[0], n, opts);
                    const join = f0.length > 15 ? ',\n' : ', ';
                    // don't use map, won't work for typedArrays
                    const s = [];
                    for (let i = 0; i < k.length; i++) {
                        s[i] = format(k[i], n, {trim, totlen}, opts);
                        totlen -= s[i].length;
                        if (totlen <= 0) { s.push('!!!'); break; }
                    }
                    r = typename.replace('Array', '') + '[' + s.join(join) + ']';
                }
            } else {
                r = [];
                for (var ff in k) {
                    if (typeof k[ff] !== 'function') {
                        const rr = ff + ': ' + format(k[ff], n, {trim, totlen, maxdepth});
                        r.push(rr);
                        totlen -= rr.length
                        if (totlen <= 0) {r.push('!!!'); break; }
                    }
                }
                r = '{' + r.join(', ') + '}';
            }
        } finally {
            format.depth--;
        }
        return r;
    }

    if (isNaN(k)) return (k.toString() + ' '.repeat(n)).substring(0,n); // do not killl non-numbers
    k = +k;
    if (k < 0 && n)
        n--;
    const rk = Math.round(k);
    if (rk !== 0 && Math.abs(k-rk) < 0.0001) k = rk;

    var ak = Math.abs(k);
    if (ak < 1e-7) k = ak = 0;
    if (k % 1 === 0) return k + ""; // (k + '        ') .substring(0,n);
    // below won't give exactly n, but fairly close
    if (ak < 0.0001) return (k * 1).toExponential(n == undefined ? 3 : n - 3 < 0 ? 0 : n - 3);  /* == intended */ //  eslint-disable-line eqeqeq
    if (ak > 1e8) return (k * 1).toExponential(n == undefined ? 3 : n - 3 < 0 ? 0 : n - 3);  /* == intended */ //  eslint-disable-line eqeqeq
    if (n === undefined) {
        if (ak > 10000) n = 0;
        else if (ak > 1000) n = 1;
        else if (ak > 100) n = 1;
        else if (ak > 10) n = 1;
        else if (ak > 1) n = 2;
        else if (ak > 0.1) n = 3;
        else n = 3;
    }
    var r = k.toFixed(n);
    if (trim) r = r*1+'';
    return r;
    //    if (n === 0) r = (k*1).toLocaleString();
    //    if (r.indexOf('.') !== -1) {
    //        while (r.charAt(r.length-1) === '0') r = r.substring(0, r.length-1);
    //        if (r.charAt(r.length-1) === '.') r = r.substring(0, r.length-1);
    //    }
    //    return r;
}
format.depth = 0;

function floatstring(ff) { return ff === Math.floor(ff) ? ff + '.' : ff; }

/** return a 'sensible' number (1,2 5o 5 times power of 10) near input number */
function sensible(k) {
    if (k === 0) return k;
    if (k < 0) return -sensible(-k);
    const l = Math.log10(k);
    const b = 10 ** Math.floor(l);
    const r = k / b;
    const rr = (r < 1.5) ? 1 : r < 3.5 ? 2 : 5;
    return rr * b;
}

/** format for html */
function htmlformat(v) {
    if (v instanceof THREE.Vector4) {
        v = format(v);
        return "<b>[" + v.x + ", " + v.y + ", " + v.z + ", " + v.w + "]</b>";
    }
    if (v instanceof THREE.Matrix4) {
        var e = format(v.elements);
        var r = '<table class="matrix"><tbody>';
        r += tr(te(e[0]) + te(e[4]) + te(e[8]) + te(e[12]));
        r += tr(te(e[1]) + te(e[5]) + te(e[9]) + te(e[13]));
        r += tr(te(e[2]) + te(e[6]) + te(e[10]) + te(e[14]));
        r += tr(te(e[3]) + te(e[7]) + te(e[11]) + te(e[15]));
        r += '</tbody></table>';
        return r;
    }
    if (typeof v === 'number') return format(v);

    return format(cloneNoCircle((v)));
    function te(vv) { return '<td>' + vv + '</td>'; }
    function tr(vv) { return '<tr>' + vv + '</tr>'; }
}

/** format array as html, opts is options
 * x: width
 * y: height
 * flen: format length for each element
 * tophead: array for top head
 * lefthead: array for left head

 */
function htmlformatArray(v,opts) {
    const def = {flen: 3, classs: "htmlForArray", style: ""}   // defaults, will be overridden
    Object.assign(def, opts);
    let {x, y, tophead, lefthead, flen, classs, style} = def;
    if (!x) x = Math.floor(Math.sqrt(v.length));
    if (!y) y = Math.floor(v.length / x);
    const t = [];
    if (tophead) {
        let th = tophead;
        if (lefthead) th = [''].concat(th);
        t.push(`<tr><th>${th.join('</td><th>')}</td></tr>`);
    }
    for (let j = 0; j < y; j++) {
        const r = [];
        if (lefthead) r.push(lefthead[j]);
        for (let i = 0; i < x; i++) {
            r.push(format(v[i + x*j], flen));
        }
        t.push(`<tr><td>${r.join('</td><td>')}</td></tr>`);
    }
    return `<table class="${classs}" style="${style}">${t.join('')}</table>`;
}






if (isNode && isNode() && document.body) { //W.require) { // W.nwDispatcher) {
    tryelectron();
    // https://gist.github.com/branneman/8048520
    // I tried fixing the path in ways suggested above, but no joy.
    // This fix, together with setting NODE_PATH in the involking cmd file, seems to be ok.
    ///PJT---> 01/20 review: when this was undefined it was causing more problems elsewhere
    //would only help in cases where
    // eslint-disable-next-line no-undef
    if (process.env.NODE_PATH) module.paths.push(process.env.NODE_PATH);
    if (!nwwin) nwwin = require('nw.gui').Window.get();  // may be set otherwise in 13.0
    nwfs = require('fs');
    nwhttp = require('http');
    nwos = require("os");
    // if (nwwin) localStorage.clear();       // nw versions no risk of localstorage effects
    if (nwos) hostname = nwos.hostname();  // get hostname

    process.on('uncaughtException', function (err) {
        try {
            console.log('Caught exception: ' + err);
            console.log(err.stack);
            var user = process.env.USERPROFILE ? process.env.USERPROFILE.split("\\").reverse()[0] : "unkownUser";
            // save separate log for each user in case sharing on Dropbox, or ...
            var fid = "uncaught_" + user + ".log";
            nwfs.appendFileSync(fid, "\r\n------------------------------------------------\r\n");
            nwfs.appendFileSync(fid, "" + new Date() + "\r\n");
            nwfs.appendFileSync(fid, err.stack);
            nwfs.appendFileSync(fid, "\r\n");
        } catch (e) {
            console.log("Error in uncaughtException handler" + e);
        }
    });
}

function trylocalstarter() {
    var localstarter = "LOCAL/" + hostname + ".js";
    console.log("don't worry if you see error log 404 for '" + localstarter + "'");
    addscript(localstarter);  // ensure host based local behaviour
}


/** try to run a function, but fairly quiet if it fails */
function tryfun(input, ff) {
    if (!ff) return;
    try {
        if ((typeof ff) === "function") return ff.apply(input);
        console.log("did not run function " + ff);
    } catch (e) {
        console.error("Err handling " + ff + "\n" + e);
    }

}

/** find fields in object with name matching string */
function findfields(obj, s, filt = _=>true) {
    const r = {};
    if (s instanceof RegExp) {
        for (let n in obj)
            if (n.match(s) && filt(obj[n])) r[n] = obj[n];
    } else {
        s = s.toLowerCase();
        for (let n in obj)
            if (n.toLowerCase().indexOf(s) !== -1 && filt(obj[n])) r[n] = obj[n];
    }
    return r;
}
var FF = findfields;
function FFG(s) { return FF(currentGenes, s); }
function FFW(s) { return FF(window, s); }

/** add a script dynamically */
function addscript(src, callback) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    head.appendChild(script);
    var loaded = false;
    // https://gist.github.com/hagenburger/500716
    if (callback) {
        script.onreadystatechange = script.onload = function (e) {
            if (!loaded) callback();
            loaded = true;
        };
    }
}

/** add a script dynamically */
function addmodule(srcurl, item, callback) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'module';
    // const src = `import {${item}} from "${srcurl}"; window.${item} = ${item};`;
    const src = `alert(999); debugger; import * as ${item} from "${srcurl}"; window.${item} = ${item};`;
    log('module source', src);
    script.textContent = src;
    head.appendChild(script);
    var loaded = false;
    // https://gist.github.com/hagenburger/500716
    if (callback) {
        script.onreadystatechange = script.onload = function (e) {
            if (!loaded) callback();
            loaded = true;
        };
    }
}



/** set values in an object from another */
function setValuesFrom(targ, source) {
    for (var g in source) targ[g] = source[g];
}


/** tan for degrees */
function tand(x) { return Math.tan(x * 3.14159 / 180); }

/** perform a remote post to xinaesthetic.
 * TODO
 * currently only wired in for saving, not loading.
 * We should load from xineasthetic at start,
 * and maybe merge any of our items with later data than xinaesthetic ones,
 * and vica versa, in case we have been offline in the interim.
 * */
// was only used to (fail) to save data to xinaesthetic 14 March 2015
//function xpost(uri) {
//
//    // http://docs.nodejitsu.com/articles/HTTP/clients/how-to-create-a-HTTP-request`
//    var options = {
//      host: 'xinaesthetic.net',
//      path: "/organicart/organicart/"+uri,
//      port: '80',
//      method: 'POST'
//    };
//
//    var callback = function(response) {
//      var str = '';
//      response.on('data', function (chunk) {
//        str += chunk;
//      });
//
//      response.on('end', function () {
//        console.log("from xinaesthetic ..." + str);
//      });
//    };
//
//    var req = nwhttp.request(options, callback);
//    //This is the data we are posting, it needs to be a string or a buffer
//    req.write("");
//    req.end();
//}

/** recover from local Storage, using prefix and JSON */
function localStorageGet(id) {
    var ls = localStorage[savedef + "_" + id];
    if (!ls) return undefined;
    try {
        var obj = JSON.parse(ls);
    } catch (e) {
        console.err("invalid JSON in localStorage for " + savedef + "_" + id);
        return undefined;
    }
    return obj;
}

/** set into local Storage, using prefix and JSON */
function localStorageSet(id, obj) {
    localStorage[savedef + "_" + id] = JSON.stringify(obj);
}

/*
* functions to save and restore input state
 */


/** restore input state from localStorage */
function restoreInputFromLocal() {

    if (W.UICom.m_isProjVersion === true) return;    // skip local storage on proj version
    var save = _ininit;
    var ls = localStorageGet("inputState");
    //if (!ls) ls = local Storage["inputState."+savedef+"."];  // historic
    //if (!ls) ls = local Storage.inputState;
    //if (ls === undefined) {
    //    console.log ("undefined input state for " + savedef + "_inputState");
    //    setTimeout(restoreInputFromLocal, 100);
    //    ls = undefined;
    //}
    if (ls) {
        restoreInputState(ls);
        console.log("restored input state for " + savedef + "_inputState");
    }
    _ininit = save;
}

/** ensure input state kept up to date when any input value changed */
function registerInputs() {
    consoleTime('registerInputs');
    var _inputs = document.getElementsByTagName('input');
    for (var i = 0; i < _inputs.length; i++) {
        var input = _inputs[i];
        if (input.id) {
            initialinputs[input.id] = getInput(input);
            input.addEventListener("change", inputChanged);
            input.addEventListener("input", inputChanged);
            if (input.type === "range") {
                input.addEventListener("mouseover", inputMouseover);
                input.addEventListener("mouseout", inputMouseout);
            }
        }
    }
    consoleTimeEnd('registerInputs');
    saveInputState();
}

// restore all the initial inputs, as defined in html file
// not called from standard code as at 13/3/2017
function restoreInitialInputs() {
    for (var i in initialinputs)
        setInput(i, initialinputs[i]);
}

function inputMouseover(e) {
    var src = e.target;
    //var pos = getScreenCordinates(src);
    if (valelement !== src && src.parentNode.className !== inputMouseover.exclude
        && src.parentNode.parentNode.className !== inputMouseover.exclude) {
        src.parentNode.appendChild(W.valouter);
        // below should work? but Chrome gives wrong value for offsets ??
        // If they are used, they need position relative (not fixed which lastdocx uses)
        //valouter.style.left = (src.offsetLeft-20) + "px";
        //valouter.style.top = (src.offsetTop-8) + "px";
        W.valouter.style.left = (lastdocx - 20) + "px";
        W.valouter.style.top = (lastdocy - 8) + "px";
        W.valouter.style.display = "";
        valelement = src;
        valelement.style.zIndex = 5000;
    }
    W.valbox.value = src.value;
    W.valbox.min = src.min;
    W.valbox.max = src.max;
    W.valbox.step = src.step;
}
inputMouseover.exclude = "speed_control";
function inputMouseout(e) {
    if (e.relatedTarget !== W.valbox && e.relatedTarget !== W.valouter && e.relatedTarget !== valelement) {
        W.valouter.style.display = "none";
        if (valelement) valelement.style.zIndex = "";
        valelement = undefined;
    }
}

/** hanging valbox change */
function valchanged() {
    if (valelement === undefined) return; // unexpected
    valelement.value = W.valbox.value;
    inputChanged(valelement);
}


/** a single input has changed, may be given event or element */
function inputChanged(src) {
    if (src.target) src = src.target;
    W.valbox.value = src.value;
    var id = src.id;
    if (!id) return;
    if (id[0] === "_") {
        var base = id.substring(1);
        inputdoms[base].value = src.value;
    } else {
        var v2 = _inputdoms[id];
        if (v2) v2.value = src.value;
    }
    saveInputToLocal();  // for now, handle it the heavy way
}

/** capture input state and return as structure, and cache value in 'inputs' */
function saveInputState() {
    if (restoringInputState) return;
    // consoleTime('saveInputState');
    var s = {};
    // prepare cache of input doms if necessary
    if (!inputdoms) {
        inputdoms = {};
        _inputdoms = {};
        var inputl = [].slice.call(document.getElementsByTagName('input'));
        inputl = inputl.concat([].slice.call(document.getElementsByTagName('select')));
        inputl = inputl.concat([].slice.call(document.getElementsByTagName('textarea')));
        for (let i = 0; i < inputl.length; i++) {
            let inputi = inputl[i];
            if (inputi.id) {
                if (inputi.id[0] === "_")
                    _inputdoms[inputi.id.substring(1)] = inputi;
                else
                    inputdoms[inputi.id] = inputi;
            } else if (inputi.hasParent(W.samplegene) || inputi.hasParent(W.genesgui)) { /**/
            } else {
                console.log("input with no id " + inputi + " name " + inputi.name);
            }
        }
    }

    // refresh s: should already be the same as inputs,
    // but now we have inputdoms cache it is cheap to check anyway
    for (let i in inputdoms) {
        let inputi = inputdoms[i];
        if (s[inputi.id]) console.log("duplicate id " + inputi.id);
        s[inputi.id] = getInput(inputi);
    }
    for (var i in _inputdoms) {
        _inputdoms[i].value = s[i];
    }

    copyFrom(inputs, s);
    newframe();
    // consoleTimeEnd('saveInputState');
    return s;
}

function getInput(input) {
    var r;
    switch (input.type) {
        case 'checkbox':
            r = input.checked;
            break;
        case 'radio':
            r = input.checked;
            break;
        case 'range':
        case 'number':
        case 'select-one':
            r = isNaN(input.value) ? input.value : Number(input.value);
            break;
        case 'text':
        case 'file':
        case 'textarea':
        case 'color':
            r = input.value;
            break;
        case 'image':
            r = input.src;
            break;
        default:
            console.log("unhandled input type " + input.type + " for " + input.id);
            break;
    }
    return r;
}


/** set value of an input in both the gui and the cache,
 * and make sure any onchecked etc side-effects called.
 *
 * Usually we assume that if the inputs[] value is correct all is ok.
 * forcechange makes sure the relavent dom element is changed
 * if it has somehow got out of step with the inputs[] value
 *
 * Optional s is a input definition which may be added to.  ??? irrelevant
 */
function setInput(input, value, forcechange, s) {
    if (!input) {
        console.error('setInput called with no input');
        return;
    }
    if (typeof input === "string") {
        const wi = document.getElementById(input);
            if (!wi) {    // no gui, but set inputs anyway
            if (!(input in inputs)) log('input to setInput has no object: ', input);
            inputs[input] = value;
            return;
        }
        input = wi;
    }
    if (inputs[input.id] == value && inputs[input.id] !== value) { //  eslint-disable-line eqeqeq
        if (inputs[input.id] === '' && value === 0 && W[input.id].value === '') {
            // this happens when wrong value of 0 was saved due to error in getInput for empty string fields
            value = '';
        } else if (+inputs[input.id] === +value) {
            // no harm done where both are equal numbers
        } else if (typeof inputs[input.id] === 'string' && (typeof value === 'number' || typeof value === 'boolean')) {
            // no harm done where text fields were used to store number values
        } else {
            log('unexpected differences in setInput', input.id, '>'+inputs[input.id]+'<' + typeof inputs[input.id], ' ->  >'+value+'<' + typeof value);
        }
    }

    // ischange checks for change for the inputs[] value
    const ischange = inputs[input.id] != value;   /* !- intended */ //  eslint-disable-line eqeqeq
    if (!ischange && !forcechange) return;

    // NOTE intentional use of != and not !== in several places below
    // dead  if (forcechange === undefined) forcechange = inputs[input.id] != value;   /* !- intended */ //  eslint-disable-line eqeqeq
    inputs[input.id] = value;
    switch (input.type) {
        case 'checkbox':
            if (input.checked != value) {   /* !- intended */ //  eslint-disable-line eqeqeq
                // A checkbox only has two values
                // if the value is already as wanted we won't enter this code section
                // If it is NOT what we wanted,
                // simulating click will change it,
                // and the change must be to the value we want.
                // It will also call all the appopriate click and change listeners.
                $(input).trigger('click');

                /*** DEAD to remove when confirmed ????
                //input.checked = value;
                //tryfun(input, input.onchange);
                //$(input).trigger('change');
                // triggering click on a checkbox changes its value
                // so we just call the onclick (if any)
                // this means we miss added event listeners
                //tryfun(input, input.onclick);
                ***/
            }
            break;
        case 'radio':
            if (input.checked != value) {  /* !- intended */ //  eslint-disable-line eqeqeq
                if (value) {
                    // it is not checked now, so clicking will check it
                    // and call all appropriate click and change events
                    $(input).trigger('click');
                } else {
                    // It is already checked and we want to uncheck it.
                    // Unlike checkbox, simuilating check will not uncheck it
                    // but just reinforce the checked status.
                    // So we uncheck it directly, and trigger change for the change events.
                    // Click would never leave it in an unchecked status
                    // so we are not missing any click events we should be firing.
                    input.checked = value;
                    $(input).trigger('change');
                }

                /*** DEAD ending check
                input.checked = value;
                //tryfun(input, input.onchange);
                //if (value) tryfun(input, input.onclick);
                $(input).trigger('change');
                // don't click after setting to 0/off, else we will(may ???) turn it back on
                // again, we might miss some added event listeners
                if (value)
                    $(input).trigger('click');
                else
                    tryfun(input, input.onclick);
                ***/
            }
            break;
        case 'range':
        case 'text':
        case 'number':
        case 'color':
        case 'textarea':
        case 'select-one':
            if (input.value != value) {    /* !- intended */ //  eslint-disable-line eqeqeq
                if (input.type === 'range') {
                    if (input.fixedrange) {
                        if (+value > +input.max) value = input.max;
                        if (+value < +input.min) value = input.min;
                    } else {
                        if (+value > +input.max) input.max = value;
                        if (+value < +input.min) input.min = value;
                    }
                }
                input.value = value;
                if (input.type === 'text' || input.type === 'textarea')
                    input.textContent = value;
                if (s)
                    s[input.id] = value;
                //tryfun(input, input.onchange);
                //tryfun(input, input.onclick);
                $(input).trigger('change');
                $(input).trigger('click');
            }
            break;
        case 'file':
        case 'image':
            // quietly not implemented *!*!*
            break;
        default:
            console.log("unhandled input type " + input.type + " for id=" + input);
            break;
    }
    return value;
}

/** set value of an input in both the gui and the cache,
 * and make sure any onchecked etc side-effects called.
 * Make the number look nice for the gui
  * Optional s is a input definition which may be added to.  ??? irrelevant
 */
function setInputg(input, value, forcechange, s) {
    setInput(input, format(value, 6), forcechange, s);
}

/** restore input state from structure, for objects matching class if classs given */
function restoreInputState(s, classs, forcechange) {
    // compatibility when names changed, as it turns out the FILE type inputs are not handled right anyway, see *!*!* above
    var compat = { left: 'cubeleft', right: 'cuberight', up: 'cubeup', down: 'cubedown', front: 'cubefront', back: 'cubeback' };
    restoringInputState = true;
    const addedInput = [];
    try {
        for (var ii = 0; ii < 2; ii++) // restore twice in case order of saves matters
            for (let i in s) {
                var id = compat[i] || i;  // id usually i, but may be different for compatibility
                var input = document.getElementById(id);
                if (classs && (" " + input.className + " ").indexOf(classs) === -1) continue;
                if (!input) {
                    input = W[id] = document.createElement('input');
                    input.id = id;
                    input.type = 'string';
                    W.dummies.appendChild(input);
                    addedInput.push(id);
                }
                if (input) {
                    setInput(input, s[i], forcechange, s);
                } else {
                    console.log("saved value with no input element: ", i, id);
                }
            }
        // restore inputs not defined in file
        // ??? are there cases where input s is intentionally incomplete ??
        for (let i in initialinputs) {
            if (!(i in s))
                setInput(i, initialinputs[i]);
        }
        log('added dom input objects for:', addedInput.join(' '));
        return s;
    } finally {
        restoringInputState = false;
        saveInputState();  // make sure cache restored
        onWindowResize();    // ? don't keep doing this during the restore process

    }
}

/** save input state to local storage */
function saveInputToLocal() {
    if (UICom && UICom.m_isProjVersion === true) return;    // skip local storage on proj version
    if (restoringInputState) return;
    if (_ininit) return;
    //var e;  // to papmer to NetBeans
    try {
        var s = saveInputState();
    } catch (e) {
        console.log("error saving input state " + e);
        console.log(e.stack);
        return;
    }
    if (s === undefined) {
        console.log("attempt to save undefined input state, called from ");
        console.log(stack());
    } else if (JSON.stringify(s) !== "{}") {   // on winding down ??
        localStorageSet("inputState", s);
        //console.log("saved state for 'inputState."+savedef + "'      " + s.substring(0, 25));
    } else {
        console.log("do not save empty inputState: ? terminating");
    }
}

if (!interpretSearchString)
    addscript('JS/searchString.js');


/** load files selected by user, to avoid need for webserver */
function loadfiles(evt) {
    const sourcefiles = evt.target.files;
    if (!sourcefiles) return;
    for (let i = 0, ff; (ff = sourcefiles[i]); i++) {
        const reader = new FileReader();
        reader.fff = ff;
        // Closure to capture the file information.
        reader.onload = function (e) {
            var data = e.target.result;
            loadedfiles[e.target.fff.name] = data;
            badshader = false;  // may be ok now
            newframe();
            savedef = 'organicProjection';
            refreshGal();
        };
        reader.readAsText(ff);        // start read in the data file
    }
}

/** get a filename's extension */
function getFileExtension(fid) {
    if (fid.indexOf(".") !== -1)
        return "." + fid.split('.').pop().toLowerCase();
    else
        return ".";
}

/** get a filepath's name */
function getFileName(fid) {
    return fid.split('/').pop();
}

/** throw an exception generated from a string or ... */
function throwe(...mm) {
    // console.log(">> throwe error: " + m);
    //debugger;
    const m = showvals(...mm);
    sclogE(m);
    throw new Error(m);
}

/** get screen position,
from http://www.aspsnippets.com/forums/Articles/Get-Absolute-Position-Screen-Cordinates-of-HTML-Elements-using-JavaScript.aspx
incorrect on Opera19/Chrome33. ??offsetLeft is sometimes computer wrt higher level parent??
even worse on Firefoxx: always 0,0 ?
*/
function getScreenCordinates(obj) {
    var p = { x: 0, y: 0 };
    console.log("...........");
    var i = 0;
    while (obj && obj !== document.body) {
        console.log(obj.tagName + "#" + obj.id + "." + obj.className + " " + obj.offsetLeft + " x " + obj.offsetTop + "  " + obj.style.position);
        p.x = p.x + obj.offsetLeft;
        p.y = p.y + obj.offsetTop;
        obj = obj.offsetParent;
        //if (i==0) obj = obj.offsetParent;
        i++;
    }
    return p;
}

/** get damping factor based on time and halflife */
function getdamp(half) {
    var damp = Math.pow(0.5, Math.min(framedelta, 200) / half);
    return damp;
}

var dodamprate = {};  // last recorded delta for key
/** apply damping using halflife.
If key is given we record the rate and apply damping to that.
This means that a sudden change in targ does not mean a sudden change in rate.
It can mean that the result overshoots targ, but it turns back in a smooth way.
 */
function dodamp(now, targ, half, key) {
    if (isNaN(now)) now = targ;
    var damp = getdamp(half);
    if (key === undefined) return (damp * now + (1 - damp) * targ);
    var rate = dodamprate[key];
    if (rate === undefined || isNaN(rate)) rate = 0;
    var trate = (targ - now) / (2 * half);
    rate = (damp * rate + (1 - damp) * trate);
    dodamprate[key] = rate;
    return now + rate * framedelta;
}

/** get screen size: windows only for now */
function getScreenSize(afterfun) {
    if (!screens) screens = [{ width: 1920, height: 1080 }]; // guess if
    if (!islocalhost) return;   // might file all together, or give wrong answer depending on server

    // //serious("in getScreenSize");
    // var isWin = require && /^win/.test(require('os').platform());
    // if (isWin) {
        // wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution

        // var spawn = require('child_process').spawn;
        // var args = ["path", "Win32_VideoController", "get", "CurrentHorizontalResolution,CurrentVerticalResolution"];
        // var tt = spawn("wmic.exe", args);
        // var data = "";
        // tt.stdout.on('data', function (bdata) {
        //     data += bdata;
        // });
        // tt.on('close', function (code, sig) {
        //     if (data.length === 0) { getScreenSize(afterfun); log('getScreenSize no return data, retry'); return; }
        //     log("close", code, sig, data);
        var data = runcommandphp('wmic path Win32_VideoController get  CurrentHorizontalResolution,CurrentVerticalResolution');
            var tscreens = [];
            var dArr = data.split("\n");
            for (var i = 1; i < dArr.length; i++) {
                var d = dArr[i].trim();
                if (d === "") continue;
                var sdl = d.split(/\s+/); //splits on any number of whitespace characters
                if (sdl.length !== 2) serious("error parsing wmic screen data line " + d + ": expected exactly two elements, got " + sdl.length);
                else {
                    var tscreen = { width: sdl[0] * 1, height: sdl[1] * 1 };
                    tscreens.push(tscreen);
                    log("adding screen " + tscreen.width + " " + tscreen.height);
                }
            }
            if (tscreens.length === 0)
                serious("screens not set properly in getScreenSize, default used");
            else
                screens = tscreens;

    // // for nvidia double screen setting as Chrome can't do big enough double screen
    //     if (screens.length === 1 && screens[0].width === 1920 * 2 && screens[0].height === 1080) {
    //         screens = [ {width: 1920, height: 1080, offset: 0}, {width: 1920, height: 1080, offset: 1920} ]
    //     }
            if (searchValues.doublescreen)
                screens = [ {width: 1920, height: 1080, offset: 0}, {width: 1920, height: 1080, offset: 1920} ];
    /***
     * note, issues
     * Chrome/Edge/etc can't do big double screen
     * Nvidia surround inconvenient and gets touch wrong
     * bottom right of test touch screen broken
     * Firefox slow?
     *
     * BUT Electron can do beg screen
     */

            // // get round wmic.exe bug on Stephen's laptop with Oculus plugged in
            // if (screens.length === 2 && screens[1].height === 1920 && screens[1].width === 1080) {
            //     screens[1] = { width: 1680, height: 1050 };
            // }
            if (afterfun) afterfun();
    //     });
    //     tt.on('error', function (err) {
    //         serious("wmic error", err);
    //     });
    // } else {
    //     //temporarily hardcoding for laptop etc non windows
    //     if (afterfun) afterfun();
    // }
}

/** check for pixel ratio */
function checkPixelRatio() {
    // Check for pixel issues.
    // Must be done in full screen, so we can compare real screen size with document.
    // This must therefore be called after the real screen size is established and document loaded.
    // To have this operate at start we use fullscreen: true,
    // with 'deferred' "deferfullscreen": false if we don't really want to start fullscreen.
    // This does cause some glitch at start, we may just want to make calling this optional,
    // or preferably find a better way to test.
    if (nwwin) {
        if (electron.restarts > 1) return;
        var ppp = require('./package');
        // test for correct resolution if we start fullscreen
        if (nwwin.isFullscreen) {
            var exp = screens[0].width;
            var got = document.body.clientWidth;
            if (exp !== got) {
                serious("unexpected initial widths, ?pixel scaling issue: " + exp + " != " + got + "\r\n" +
                    "For Windows, make sure the Compatibility/Disable display scaling setting is ticked for the executable property.");
            }
        }
        // force to required initial if appropriate. also after F5 as well as on fresh start
        var ww = ppp.window || { deferfullscreen: false };
        if (ww.deferfullscreen === false) {
            nwwin.leaveFullscreen();
            let w = FIRST(ww.width, screen.availWidth, screens[0].width, 800);
            let h = FIRST(ww.height, screen.availHeight, screens[0].height, 600);
            let l = FIRST(ww.left, screen.availLeft, 0);
            let t = FIRST(ww.top, screen.availTop, 0);
            nwwin.resizeTo(w, h);
            nwwin.moveTo(l, t);
        }
    }
}

// <editor-fold desc="unused experiments">
/**
 * simlate mouse click
 * http://stackoverflow.com/questions/6157929/how-to-simulate-mouse-click-using-javascript
 * both worked for clicking face, but neither to click the file input box
 */
/*************************
function simulatedClick(target, options) {

    var event = target.ownerDocument.createEvent('MouseEvents'),
        options = options || {};

    //Set your default options to the right of ||
    var opts = {
        type: options.type                  || 'click',
        canBubble:options.canBubble             || true,
        cancelable:options.cancelable           || true,
        view:options.view                       || target.ownerDocument.defaultView,
        detail:options.detail                   || 1,
        screenX:options.screenX                 || 0, //The coordinates within the entire page
        screenY:options.screenY                 || 0,
        clientX:options.clientX                 || 0, //The coordinates within the viewport
        clientY:options.clientY                 || 0,
        ctrlKey:options.ctrlKey                 || false,
        altKey:options.altKey                   || false,
        shiftKey:options.shiftKey               || false,
        metaKey:options.metaKey                 || false, //I *think* 'meta' is 'Cmd/Apple' on Mac, and 'Windows key' on Win. Not sure, though!
        button:options.button                   || 0, //0 = left, 1 = middle, 2 = right
        relatedTarget:options.relatedTarget     || null
    };

    //Pass in the options
    event.initMouseEvent(
        opts.type,
        opts.canBubble,
        opts.cancelable,
        opts.view,
        opts.detail,
        opts.screenX,
        opts.screenY,
        opts.clientX,
        opts.clientY,
        opts.ctrlKey,
        opts.altKey,
        opts.shiftKey,
        opts.metaKey,
        opts.button,
        opts.relatedTarget
    );

    //Fire the event
    target.dispatchEvent(event);
}


function simulate(element, eventName)
{
    var options = extend(defaultOptions, arguments[2] || {});
    var oEvent, eventType = null;

    for (var name in eventMatchers)
    {
        if (eventMatchers[name].test(eventName)) { eventType = name; break; }
    }

    if (!eventType)
        throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

    if (document.createEvent)
    {
        oEvent = document.createEvent(eventType);
        if (eventType == 'HTMLEvents')
        {
            oEvent.initEvent(eventName, options.bubbles, options.cancelable);
        }
        else
        {
            oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
            options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
            options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
        }
        element.dispatchEvent(oEvent);
    }
    else
    {
        options.clientX = options.pointerX;
        options.clientY = options.pointerY;
        var evt = document.createEventObject();
        oEvent = extend(evt, options);
        element.fireEvent('on' + eventName, oEvent);
    }
    return element;
}

function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
}

var eventMatchers = {
    'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
    'MouseEvents': /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
}
var defaultOptions = {
    pointerX: 0,
    pointerY: 0,
    button: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true
}


var dynload = {};
/** recover text without web server
 * Unfortunately, this is blocked in Chrome for file://
 * just as much as a standard uri request
 * * /
function gettextfromuri(src, callbackOrKey) {
    var body = document.getElementsByTagName('body')[0];
    var iframe = document.createElement('iframe');
    // oddity, loaded and iframe are visible in inner function
    // but body, src and callbackOrKey and other var variables are not
    iframe.ssrc = callbackOrKey || src;  // passing in as variable is not seen
    iframe.src = src;
    iframe.style.display = "none";
    body.appendChild(iframe);
    var loaded = false;
    iframe.onreadystatechange = iframe.onload = function(e) {
        if (!loaded) {
            var ttt = iframe.contentDocument.body.textContent;
            if (typeof callbackOrKey === "function")
                callback(ttt);
            else
                dynload[iframe.ssrc] = ttt;
        }
        loaded = true;
    };
}



**********************************/
// </editor-fold>

function sq(x) { return x * x; }

function olength(o) { return Object.keys(o).length; }
function ofirst(o) { return o[Object.keys(o)[0]]; }

/** perform before next frame, of after n frames */
function onframe(fn, n) {
    if (n === undefined) n = 0;
    newframe();
    if (n <= 1)
        Maestro.on('preframe', fn, {}, true);
    else
        Maestro.on('preframe', function () { onframe(fn, n - 1); }, {}, true);
}
var onpreframe = onframe;

/** perform after next frame, of after n frames */
function onpostframe(fn, n) {
    if (n === undefined) n = 0;
    newframe();
    if (n <= 1)
        Maestro.on('postframe', fn, {}, true);
    else
        Maestro.on('postframe', function () { onframe(fn, n - 1); }, {}, true);
}


/** choose a file interactively */
function chooseFile(ext='.oao', name = 'new') {
    var chooser = document.querySelector('#fileDialog');
    chooser.accept = ext;
    chooser.nwsaveas = name + ext;
    chooser.onchange = function (evt) {
        log("File chosen", this.value);
    };
    chooser.click();
}


// /** sample observer function -- DEPRECATED
// for use with Object.observe, eg low level
// Object.observe(currentGenes, observer)
// Object.unobserve(currentGenes, observer)
// higher level
// observe(currentGenes, 'wall_red1')
// */
// function observer(args) {
//     for (var i = 0; i < args.length; i++) {
//         var aarg = args[i];
//         var op = aarg.object.__break[aarg.name];
//         if (!op) {
//             // no operation
//         } else if (op === 'log') {
//             log("observe", i, aarg.name, aarg.type, aarg.oldValue, "->", aarg.object[aarg.name]);
//         } else if (op === 'stack') {
//             log("observe", i, aarg.name, aarg.type, aarg.oldValue, "->", aarg.object[aarg.name]);
//             log(new Error().stack);
//         } else if (op === 'break') {
//             debugger;
//         } else {
//             op(aarg);
//         }
//         // samples from my debugging ...
//         //if (aarg.name === "bwthresh")
//         //    debugger;
//     }
// }

// /** observe changes to the object, and if fieldname is given break on changes to object[fieldname] */
// function observe(object, fieldname, op) {
//     Object.observe(object, observer);
//     if (fieldname) {
//         if (!op) op = 'break';
//         Object.defineProperty(object, '__break', { enumerable: false, writable: true, configurable: true });
//         if (!object.__break) object.__break = {};
//         object.__break[fieldname] = op;
//     }
// }

// /** unobserve changes to the object.  If fieldname is given, just ubobserve changes to that fieldname */
// function unobserve(object, fieldname) {
//     if (!object.__break) return;
//     var unobs = false;
//     if (fieldname) {
//         delete object.__break[fieldname];
//         if (Object.keys(object.__break).length === 0) unobs = true;
//     } else {
//         unobs = true;
//     }
//     if (unobs) {
//         Object.unobserve(object, observer);
//         delete object.__break;
//     }
// }

// functions for Electron globals
function getGlobal(n) {
    let r = ipcRenderer.sendSync('getglobal', n);
    if (r === '##undefined##') r = undefined;
    return r;
}
function setGlobal(n, v) {
    ipcRenderer.sendSync('setglobal', n, v);
}

/** interface to use nwwin interface for electron */
function tryelectron() {
    // for Electron/atom
    try {
        electron = require('electron');
    } catch (e) {
        return;  // no Electron/atom
    }
    remote = electron.remote;
    xwin = remote.getCurrentWindow();
    xwin.border = xwin.getSize()[0] - document.body.clientWidth;
    ipcRenderer = electron.ipcRenderer;
    electron.restarts = (getGlobal('restarts') || 0);
    electron.restarts++;
    setGlobal('restarts', electron.restarts);

    xwin.date = Date.now();
    xwin.mysize = function () {
        if (xwin.stopping)
            return;
        xwin.savesize = xwin.getSize();
        log('xwin resize', xwin.date, xwin.savesize);
    };
    xwin.addListener('resize', xwin.mysize);

    xwin.stop = function () {
        xwin.close();
        xwin.removeListener('resize', xwin.mysize);
        xwin = undefined;
    };

    // this has not resolved the error dialogs on restart, but has limited them to 7 per frefresh!
    xwin.restart = function (force) {
        // stops the new instance working correctly, or even more error dialogs
        xwin.removeListener('resize', xwin.mysize);
        if (force)
            xwin.webContents.reloadIgnoringCache();
        else
            xwin.reload();
        xwin.stopping = true;
    };


    xwin.savesize = xwin.getSize();
    // wrapper to make Electron look like node webkit
    // Some setSize/fullscreen options appear work correctly but sometimes to give exceptions.
    nwwin = {
        showDevTools: xwin.openDevTools,
        resizeTo: function (w, h) { try { xwin.setSize(w, h); } catch (e) { /**/ } xwin.savesize = xwin.getSize(); },
        get width() { return xwin.savesize[0]; },
        get height() { return xwin.savesize[1]; },
        leaveFullscreen: function () { try { xwin.setFullScreen(false); } catch (e) { /**/ } xwin.savesize = xwin.getSize(); },
        enterFullscreen: function () { try { xwin.setFullScreen(true); } catch (e) { /**/ } xwin.savesize = xwin.getSize(); },
        toggleFullscreen: function () {  // same as others (leavfullscreen etc) but expanded to help debug errors
            try {
                xwin.setFullScreen(!xwin.isFullScreen());
            } catch (e) {
                log('xwin toggle error'); // , e.message)
            }
            xwin.savesize = xwin.getSize();
        },
        reloadIgnoringCache: xwin.reloadIgnoringCache,
        reload: xwin.reload,
        get isFullscreen() { return xwin.isFullScreen(); },
        moveTo: xwin.setPosition

        // showDevTools, resizeTo, width, height, leaveFullscreen, moveTo, reload, reloadIgnoringCache, toggleFullscreen, isFullscreen
    };

}

/** perform fun once waiter() true */
//var www=true; var ww = function() { return www; }; var wdd = 0;
function waitfor(fun, waiter) {
    if (waiter())
        fun();
    else
        setTimeout(function () {
            log("wait");
            waitfor(fun, waiter);
        }, 100);
}

/** alternative setTimeout for monitoring
TODO add clearTimeout for stats, ok as far as function concerned  */  // <<< * / to comment out
var osetTimeout = window.setTimeout; var timestats = { requested: 0, done: 0, requested0: 0, pending: {}, pending0: [] };

function deferuow(ff) {
    if (douows.atonce) { ff(); return; }
    timestats.pending0.push(ff);
    timestats.requested0++;
    return -1;
}

douows.atonce = true;
function douows() { // return;
    //log("timeout 0 done", timestats.pending0.length);
    for (var i = 0; i < timestats.pending0.length; i++) timestats.pending0[i](); //hit an error downstream of this, trying to parse OSC on something with "" as header... this array was big at the time...
    timestats.pending0 = [];
    if (!douows.atonce) osetTimeout(douows, 0);
    //if (window.setTimeout !== xsetTimeout) {
    //    log("setTimeout unfixed");
    //    window.setTimeout = xsetTimeout;
    //}
}
douows();  // start the uow system working

function xsetTimeout(fun, t) {
    if (t === 0) return deferuow(fun);

    var k = timestats.requested++;
    var tid = osetTimeout(function () {
        fun();
        timestats.done++;
        delete timestats.pending[k];
    }, t);
    timestats.pending[k] = { f: fun, t: t, time: frametime, tid: tid };
    return tid;
}

var oclearTimeout = clearTimeout;
function xclearTimeout(tid) {
    oclearTimeout(tid);
    let k = undefined;
    for (k in timestats.pending) {
        if (timestats.pending[k].tid === tid)
            break;
    }
    if (k !== undefined) {
        delete timestats.pending[k];
        timestats.done++;
    }
}

//https://github.com/github/fetch/issues/175#issuecomment-216791333
//careful now...
function timeoutPromise(ms, promise, errorMsg='promise timeout') {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(errorMsg))
        }, ms);
        promise.then(
            (res) => {
                clearTimeout(timeoutId);
                resolve(res);
            },
            (err) => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    })
}


//window.setTimeout = xsetTimeout;
//window.clearTimeout = xclearTimeout;
/***************************/


/** test for ANGLE, stolen from www.browserleaks.com/webgl */
function isANGLE(xxgl) {
    return gpuinfo.graphicsCardUsed.indexOf('ANGLE') !== -1;
    /** wrong answers, June 2016
    if (!gl) gl = W.gl;
    function k(c){return null===c?"null":"["+c[0]+", "+c[1]+"]";}
    function fff(c){
        function a(c){return 0!==c&&0===(c&c-1);}
        var b=k(c.getParameter(c.ALIASED_LINE_WIDTH_RANGE));
        return"Win32"===navigator.platform&&"Internet Explorer"!==c.getParameter(c.RENDERER)&&b===k([1,1])?a(c.getParameter(c.MAX_VERTEX_UNIFORM_VECTORS))&&a(c.getParameter(c.MAX_FRAGMENT_UNIFORM_VECTORS))?"True, Direct3D 11":"True, Direct3D 9":"False";
    }
    return fff(gl);
    ***/
}

/** Organic compatiility version */
function gpuinfo(pgl = W.gl) {
    const parms = gpuinf(pgl);
    gpuinfo.graphicsCardUsed = parms.graphicsCardUsed;
    gpuinfo.parms = parms;
    if (gpuinfo.graphicsCardUsed.toLowerCase().indexOf('nvidia') !== -1) return;    // we are using nvidia so don't bother to check for alternatives

    log(parms);
    if (islocalhost) {
        grcheck(runcommandphp('wmic path win32_VideoController get name'));
    } else if (isNode() && /^win/.test(require('os').platform())) {
        const spawn = require('child_process').spawn;
        const args = ["path", "Win32_VideoController", "get", "name"];
        const tt = spawn("wmic.exe", args);
        let data = "";
        tt.stdout.on('data', function (bdata) {
            data += bdata;
        });
        tt.on('close', function (code, sig) {
            if (data.length === 0) { log('cannot get graphics card name'); return; }
            grcheck(data);
        });
        tt.on('error', function (err) {
            serious("wmic error", err);
        });
    } else {
        gpuinfo.graphicsCardsAvailable = 'cannot determine available graphics cards';
    }
    return '<br>Unmasked Renderer: ' + parms['Unmasked Renderer'] + '<br>Unmasked Vendor: ' + parms['Unmasked Vendor'] + '<br>';

    function grcheck(cards) {
        gpuinfo.graphicsCardsAvailable = cards;
        log('graphics cards found', cards);
        if (gpuinfo.graphicsCardUsed.toLowerCase().indexOf('nvidia') === -1 && cards.toLowerCase().indexOf('nvidia') !== -1) {
            W.msgbox.style.display = "";
            msgfix('!gpuerror', '<span class="errmsg">Nvidia card installed, one of<br>', cards, '<br>but using', gpuinfo.graphicsCardUsed, '<br>Configure in Nvidia control panel</span>');
        }
    }

}

/** get main information about gpu etc
 * http://alteredqualia.com/tmp/webgl-maxparams-test/
 * also about available gpus: wmic path win32_VideoController get name
  */
 function gpuinf(pgl = W.gl) {
    const glExtensionDebugRendererInfo = pgl.getExtension('WEBGL_debug_renderer_info');
    const parms = {
        'WebGL Renderer': pgl.getParameter(pgl.RENDERER),
        'WebGL Vendor': pgl.getParameter(pgl.VENDOR),
        'WebGL Version': pgl.getParameter(pgl.VERSION),
        'Shading Language Version': pgl.getParameter(pgl.SHADING_LANGUAGE_VERSION),
        'Unmasked Renderer': glExtensionDebugRendererInfo && pgl.getParameter(glExtensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL),
        'Unmasked Vendor': glExtensionDebugRendererInfo && pgl.getParameter(glExtensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL)
    };

    if (!glExtensionDebugRendererInfo) { // e.g. firefoxx Feb 2016
        parms.graphicsCardUsed = 'Firefoxx? unknown gpu';
    } else {
        parms.graphicsCardUsed = pgl.getParameter(glExtensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL);
        parms.vendor2 =  pgl.getParameter(glExtensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL);
    }
    return parms;
} // gpuinf

// get gpu parms that give capability information
function gpuparms(pgl = W.gl) {
    const r = {};
    for (let x in pgl) {
        if (!x.startsWith('MAX') && !x.startsWith('ALIASED')) continue;
        const v = pgl[x];
        if (typeof v === 'number') {
            const vv = pgl.getParameter(v);
            if (vv === null) {
                // log(x, v, vv)
            } else {
                // if (typeof vv === 'string')
                r[x] = vv;
            }
        } else if (typeof v === 'function') { /**/
        } else {
            // log(x, v) // ? only canvas
        }
    }
    return r;
}  // gpuparms

// convenient access to  inputs, mainly for debugging use
var inps = new Proxy(inputs,{
    get: (o, n) => inputs[n],
    set: (o, n, v) => {if (!(n in inputs)) return false; setInput(n, v); return true},
    ownKeys : (o) => Reflect.ownKeys(o)
});

var _onbeforeunloaddone
/** set up window as reqested, and try to position top left
 * n.b. 16 June 2022 issues as Chrome will get set a large enough window to allow miding details at top
 * so doesn't work well for multi-screen
 * One solution is https://www.amyuni.com/forum/viewtopic.php?t=3030, make a dummy window a little higher than the main ones.
 * Another where all the screens are attached to the same graphics card is to use the GPU manufacturer mosaic or whatever,
 * then use 'real' fullscreen across all monitors.
 *
 * if w == 0 or 'normal' it sets up a single screen centred with 100 pixels around
 * if w <= 4 it sets up w screens across of the size of the current screen
 *
*/
async function windowset(w = 0, h, swapoff=0, forcebig=true) {
    if (!_onbeforeunloaddone) {addEventListener('beforeunload', () => windowset(0)); _onbeforeunloaddone=true;}

    // make sure Organic in normal mode (not min/max), so the setsize etc work
    await exitFullscreen();
    await S.frame(1);
    nircmd(`win normal stitle "${document.title}"`);
    await S.frame(1);

    if (w <= 0 || w === 'normal') {
        if (outerWidth > screen.width || outerHeight > screen.height) // resize, I'd like to keep it on same screen as well if possible ?
            nircmd(`win setsize stitle "${document.title}" 100 100 ${screen.width-200}, ${screen.height-200}`);
        nircmd(`win settopmost stitle "${document.title}" 0`);
        EX.stopToFront();
        if (!windowset.done) { EX.toFront(); windowset.done = true; }    // just once
        inps.fullvp = false;
        return;
    }
    if (w <= 4 && h == undefined) {h = screen.height* w, w = screen.width * w}

    // // get rid of lots of styling, otherwise Chrome won't let the window be big enough to handle the borders
    // // as of June 2022 it still won't let the window be big enough, so don't bother
    // // WS_SIZEBOX, WS_CAPTION https://docs.microsoft.com/en-us/windows/win32/winmsg/window-styles
    // nircmd(`win -style stitle "${document.title}" 0x00C40000`);
    // await S.frame(10);

    // establish border size so we can compensate
    let b = (outerWidth - innerWidth) / 2;    // border left,right, bot (assume all the same)
    let bt = outerHeight - innerHeight - b;   // border top
    if (!forcebig) b = bt = 0;
    log('windowset borders', b, bt), 'forcebig', forcebig;

    // now make widow required size and properly positioned
    // ..\nircmd\nircmd.exe win setsize stitle "fred"  -8 -80 3840 1080
    const cmd = `win setsize stitle "${document.title}" ${-b-swapoff} ${-bt} ${w + b*2} ${h + b + bt}`
    log('>>>', "nircmd('" + cmd + "')");
    nircmd(cmd);
    await S.frame(1);
    log('window size requested', width, height);

    nircmd(`win settopmost stitle "${document.title}" ${+forcebig}`);
    if (!windowset.done) { EX.toFront(); windowset.done = true; }    // just once

    await S.frame();
    if (innerHeight < h) {
        maxInnerHeight = innerHeight;
        console.log(`cannot set window size, requested ${w}x${h}, got ${innerWidth}x${innerHeight}`)
    }
}



// temporary slot for tests
function test1(a = W.msgbox, b=undefined, c=undefined, d=undefined, e=undefined) {

    domtoimage.toPng(a)
        .then(function (dataUrl) {
            if (!W.TIM) {
                W.TIM = new Image();
                W.TIM.id = 'TIM';
                W.TIM.style.zIndex = '99999';
                W.TIM.style.left = '40%';
                W.TIM.style.width = 'initial';
                document.body.appendChild(W.TIM);
            }
            W.TIM.src = dataUrl;
        })
        .catch(function (error) {
            console.error('oops, something went wrong!', error);
        });
}

var MAXMPXRIBS = 512; // var for sharing

function showrts(a, b, c, d, e) {
    nomess(false); msgfix.all = true;
    msgboxVisible(true);
    // pixel sampling, to move to sensible place later
    var s = slots[mainvp];
    var ww = s.width / inputs.renderRatioUi, hh = s.height / inputs.renderRatioUi;
    var t = '';
    if (usemask >= 1) t += readone('rtopos');
    if (usemask >= 1.5 && usemask !== 4) t += readone('rtshapepos');
    t += '<b>slots[' + mainvp + ']<b>' + readrt(s.dispobj.rt, false);
    msgfix('pixel', '<b>click the pixel: key to remove</b><br>', t);

    function readone(rtname) {
        var rtn = rtname + Math.ceil(ww) + 'x' + Math.ceil(hh);
        var rt = rendertargets[rtn];
        if (!rt) return 'rendertarget not found: ' + rtn + '<br>';
        return '~~~<br>' + rtn + '<br>' + readrt(rt);
    }

    function sqf(v) {
        return format(Math.sqrt(v) * 255, 0);
    }
    function readrt(rt, showhhh = true) {
        var k = 3; var k2 = k * 2 + 1;
        var ll = Math.floor((copyXflip>0 ? oldlayerX : width - oldlayerX)/ inputs.renderRatioUi);
        var tt = Math.floor((height - oldlayerY) / inputs.renderRatioUi);
        msgfix('lltt', ll, tt);
        // var rr = readWebGlFloat(rt, { left: ll - k, top: tt - k, width: k2, height: k2 });
        const rrr = readWebGlFloatDirect(rt, { left: ll - k, top: tt - k, width: k2, height: k2 });
        const rx = (p, q) => rrr[p + q*4];

        var h = [];  // html
        var ap = 0;
        const grid = rt.name.startsWith('rtopos') && resoverride.showgrid;
        let lennum = U.lennum, radnum = U.radnum, xx = 'g';
        const edge = rt.name.startsWith('dispobj') && resoverride.showgrid && usemask ===4;
        if (usemask === 4 && U.revealribs > 1) {lennum = U.revealribs; xx = 'r'; }
        for (var x = 0; x < k2; x++) {
            var row = [];
            for (var y = 0; y < k2; y++) {
                var pix = [];
                let hhh = '';
                if (showhhh) {
                    const hh3 = rx(3, ap);
                    const hornid = Math.floor(hh3/MAX_HORNS_FOR_TYPE);
                    const hornnum = Math.floor(hh3 - hornid*MAX_HORNS_FOR_TYPE);
                    const ribnum2 = hh3 % 1 ? '~~~' : '.';
                    hhh = ' id' + hornid + '#' + hornnum + '~' + ribnum2;
                }
                if (grid) {
                    const back = rx(2, ap) === -1;
                    pix.push(back ? 'x' : format(Math.floor(rx(0, ap) * lennum)) + xx);
                    pix.push(back ? 'x' : format(Math.floor(rx(1, ap) * radnum)));
                    pix.push(format(rx(2, ap)));
                    pix.push(format(rx(3, ap)) + hhh);
                } else if (edge) {
                    const xr = rx(0, ap) * MAXMPXRIBS * numInstances / tad.RIBS;
                    if (xr >= 0) {
                        const v = Math.ceil(xr);
                        pix.push(`${Math.floor(v/MAXMPXRIBS)}/${v%MAXMPXRIBS}`);
                    } else {
                        pix.push('.');
                    }
                } else {
                    for (var i = 0; i < 4; i++) {
                        pix.push(format(rx(i, ap) /*??- 0 * rx(k, k) */, 3) + (i === 3 ? hhh : ''));
                    }
                }
                pix[2] = '<br>' + pix[2] + '<br>'
                var col = (rx(3, ap) === 1) ? 'border-width: 3px; border-color: rgb(' + sqf(rx(0, ap)) + ',' + + sqf(rx(1, ap)) + ',' + sqf(rx(2, ap)) + ');' : '';
                if (x === k && y === k) col += 'background-color: #600;';
                row.push('<td style="' + col + '">' + pix.join(' ') + '</td>');
                ap++;
            }
            if (copyXflip < 0) row.reverse();
            h.push('<tr>' + row.join('') + '</tr>');
        }
        const tab = '<table class="pixeltable">' + h.reverse().join('') + '</table>';
        return tab;
    }

}
var preg;

/** make a regexp from a string or gui element */
function makeRegexp(input) {
    if (input instanceof RegExp) return input;
    let filter = input;
    if (input.value !== undefined) filter = input.value;
    // if (filter.trim() === '') return /^/;  // optimization skipped clearing style background, etc

    let regexp;
    try {
        if (filter[0] === '/') {
            filter = filter.substring(1);
        } else {
            //const filter1 = filter.toLowerCase().split('\n').filter(x=>x.trim()).join('|');
            filter = makeRegexpStr(filter);
        }

        regexp = new RegExp(filter, 'i');
        if (input.classList) input.classList.remove('error')
        //msgfix('regxexp', regexp)
    } catch (e) {
        regexp = /^/;
        if (input.classList) input.classList.add('error');
        //msgfix('>regxexp', filter)
    }
    return regexp;
}

/** make a regexp string from a string; recursive helpwer function, window level to help debug */
function makeRegexpStr(filter) {
    let filter1 = filter.split('\n').filter(x=>x.trim()).join(' | ');
    filter1 = filter1.replace(/OR/g, '|').replace(/AND/g, '&').replace(/NOT/g, '!');
    return makeRegexpStrI(filter1);

}
function makeRegexpStrI(filter) {
    // handle balanced brackets
    const i = filter.indexOf('(');
    if (i !== -1) {
        let a = filter.substring(0, i);
        const e = balbracket(filter, i);
        if (e === undefined) throwq('unbalanced regexp');
        const b = filter.substring(i+1, e);
        const c = filter.substring(e+1);

        const neg = a.substr(-1) === '!';  // negative bracketed expression
        if (neg) {
            a = a.substring(0, a.length-1);
        }

        const aa = a ? makeRegexpStrI(a) : '';
        let bb = b ? makeRegexpStrI(b) : '';
        if (neg) bb = '^(?!' + bb + ')';

        const cc = c ? makeRegexpStrI(c) : '';

        return aa + '(' + bb + ')' + cc;
    }

    let filt = filter.split("|");   // decompose | expressions
    for(let fi in filt)
        filt[fi] = filt[fi]
            .replace(/&/g, ' ')   // allow blank or & for and at this level
            .split(" ")             // split using blank
            .filter(x=>x)           // filter out empty strings  from repeated blanks
            .map(x=> x[0] === '!' ? '^(?!.*' + x.substring(1) + ')' : '(?=.*' + x + ')' )    // make regexp allowing for negated simple string
            .join('');      // and make back this
    return filt.join('|');
}




/** find matching end bracket in str for bracket at pos */
function balbracket(str, pos) {
    const pairs={ '{':'}', '(':')', '[':']'};
    const st = str[pos];
    const et = pairs[st];
    if (!et) return undefined;
    let n = 1;
    for (let i=pos+1; i < str.length; i++) {
        const ch = str[i];
        if (ch === st) n++;
        else if (ch === et) n--;
        if (n === 0) return i;
    }
    return undefined;
}


function test3(a, b, c, d, e) {
    //???? var e = arguments[0];
    var p = e.eventParms;
    var k = Object.keys(p)[0];
    var vv = p[k];
    var hl = vv.handleft;
    msgfix("handleft", hl.x, hl.y, hl.z);
    if (+1) return;

    preg = {}; copyFrom(preg, currentGenes);
    setTimeout(function () { copyFrom(currentGenes, preg); }, 200);
    setTimeout(function () { copyFrom(currentGenes, preg); }, 500);
    setTimeout(function () { copyFrom(currentGenes, preg); }, 1000);
    setTimeout(function () { copyFrom(currentGenes, preg); }, 2000);
    setTimeout(function () { copyFrom(currentGenes, preg); }, 5000);
    //refall();
    setTimeout(refall, 500);

    if (vps[0] < 8) {  // restore
        xwin.setSize(screens[0].width, screens[0].height);
        setInput(W.layoutbox, 2);
        setViewports([8, 8]);
        refall();
        return;
    }

    var n = 1;
    var xx = 4;
    xwin.setFullScreen(false);
    setInput(W.projvp, false);
    setInput(W.fullvp, false);
    setInput(W.layoutbox, 1);
    // setViewports([4,n]);
    vps = [4, n];
    xwin.setSize(1920 * xx, 1200 * xx * n / 4);
    //xwin.setSize(8192, 2048);

    setTimeout(function () {
        setSize(1920 * xx, 1200 * xx * n / 4);
        dustbinvp = 99;
        refall();
    }, 1500);


    setTimeout(function () {
        //saveframetga('d:\\temptemp\\test.tga')
    }, 2000);
}

// from http://stackoverflow.com/questions/521295/javascript-random-seeds
var m_w = 123456789;
var m_z = 987654321;
var mask = 0xffffffff;

// Takes any integer
function seed(i) {
    m_w = i;
    m_z = 987654321;
}

// Returns number between 0 (inclusive) and 1.0 (exclusive),
// or random from array or object
// like Math.random() but seeded
function random(obj) {
    if (!obj) {
        m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
        var result = ((m_z << 16) + m_w) & mask;
        result /= 4294967296;
        return result + 0.5;
    }
    if (typeof obj === 'number')
        return obj * random();
    if (Array.isArray(obj))
        return obj[Math.floor(random(obj.length))]
    if (typeof obj === 'object')
        return obj[random(Object.keys(obj))];
    log('random wrong input', obj);
    return random();
}

// http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function () {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};



// check string space usage of object
function stringspace(o, lev, par) {
    if (lev === undefined) lev = 3;
    if (par === undefined) par = [];
    if (lev < 0) return;
    for (const ff in o) {
        var v = o[ff];
        if (typeof v === 'string' && v.length > 50)
            log('string', par.join('.') + '.' + ff, v.length, v.substring(0, 20));
        if (typeof v === 'object') {
            var par2 = par.slice(); par2.push(ff.substr(0, 10));
            stringspace(v, lev - 1, par2);
        }
    }

}


/** compute next higher power of 2 */
function nextpow2(rr) {
    rr = Math.log2(rr);
    rr = Math.ceil(rr);
    rr = Math.pow(2, rr);
    return rr;
}


// http://stackoverflow.com/questions/879152/how-do-i-make-javascript-beep
function beep() {
    if (!beep.snd) beep.snd = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    beep.snd.play();
}


/** copy array elements without creatinng new array ... surely there is a better way,
 * needed after upgrade to three86, where matrix elements are array and not float array
 */
Object.defineProperty(Array.prototype, 'set', {
    value: function(...from) {
        if (from.length === 1 && (Array.isArray(from[0]) || from[0].buffer instanceof ArrayBuffer)) from = from[0];
        for(let i = 0; i < from.length; i++) this[i] = from[i];
    },
    enumerable: false,
    writable: false,
    configurable: false
});

// general traveral of object with children
function otraverse(o, callback, n=0) {
    callback(o, n);
    if (o.children && o.children.length)  // nb domObject satisfies this even though children are not an array
        for (let i=0; i<o.children.length; i++)
            otraverse(o.children[i], callback, n+1);
}

// count recursive children three object
function countChildren(o) {
    let i=0; o.traverse(ff=>i++);
    return i;
}
// count recursivevisible  children three object
function countVisibleChildren(o) {
    let i=0; o.traverseVisible(ff=>i++);
    return i;
}

var renderer;
/** quick way to render trivial scene, turn on with quickscene.use = true
currently w.i.p. 14/11/2017 and NOT generally used */
function quickscene(scenep, camerap, targetp, flag) {

    const ch0 = scenep.children[0];
    renderer.setRenderTarget(targetp);
    let geom = ch0.geometry;
    framelog('quickscene', scenep.name, 'buffergeom', !!geom._bufferGeometry);
    if (geom._bufferGeometry) geom = geom._bufferGeometry;

    if (ch0.matrixWorldNeedsUpdate) {
        ch0.updateMatrixWorld();
    }

    // from three 10868 camera.updateMatrixWorld
    // Object3D.prototype.updateMatrixWorld.call( this, force );
	camerap.matrixWorldInverse.copy( camerap.matrixWorld ).invert();

	// from renderObject 21743
	const object = ch0;
    object.modelViewMatrix.multiplyMatrices( camerap.matrixWorldInverse, object.matrixWorld );
    object.normalMatrix.getNormalMatrix(object.modelViewMatrix );

    renderer.renderBufferDirect(camerap, null, geom, ch0.material, ch0, null);
    // renderer.renderBufferDirect at line 20996
}

/** force some values in current oao file */
function forceoao(key, val) {
    dockeydowninner('alt,L');
    setAllLots(key, val);
    dockeydowninner('ctrl,S')
}

/** monitor a field by turning it into a property (not monitor, clashes with developer tools) */
function monitorX(object, field, option = 'debugchange') {
    if (typeof object === 'string') {
        const s = object.split('.');
        let o = window;
        for (let i = 0; i < s.length-1; i++) o = o[s[i]];
        object = o; field = s.pop();
    }
    const desc = Object.getOwnPropertyDescriptor(object, field);
    if (!desc) { log('no property to monitor'); return; }
    if (desc.get || desc.set) { log('cannot monitor property', field); return; }
    const v = object[field];
    log(`monitorX initial ${field} = ${v}`);
    Object.defineProperty(object, '..'+field, { // use property so we can prevent enumeration
        value: v,
        writable: true,
        enumerable: false,
        configurable: true    // configurable so we can remove it in unmonitorX
    });

    delete object[field];
    Object.defineProperty(object, field, {
        get : function() {
            if (option.indexOf('logget') !== -1) log(`monitorX get ${field} = ${object['..'+field]}`);
            return object['..'+field];
        },
        set : function(vs) { _monitor_fun(object, field, vs, option) },
        enumerable: true,
        configurable: true
    });
}

/** turn off monitoring, replace the property with a field */
function unmonitorX(object, field) {
    const v = object['..' + field];
    log(`unmonitorX initial ${field} = ${v}`);
    const ok = delete object[field]
    if (!ok) console.error('failed to unmonitor', object, field);
    object[field] = v;
    const ok2 = delete object['..'+field]
    if (!ok2) console.log('failed to remove temp from object', object, '..' + field);
}

function _monitor_fun(object, field, value, option) {
    const un = () => unmonitorX(object, field);    // quick unmonitor when stopped in this function, eg in debugger below
    if (option.indexOf('logset') !== -1) log(`monitorX set ${field} = ${value}`);
    if (object['..' + field] !== value) {
        if (option.indexOf('change') !== -1) log(`monitorX change ${field} = ${object['..' + field]} => ${value}`);
        if (option.indexOf('debugchange') !== -1)
            debugger;  // note: if this is overkill, go up one level in stack to 'set', and set option='change' (or whatever)
        object['..' + field] = value;
    }
}


/** view different targts conveniently */
function viewtargets() {
    setInput(W.layoutbox, 0);
    setViewports([2,4]);
    onframe( viewtargets.inner, 2);
}

/** external for safer debug live code change */
viewtargets.inner = function viewtargetsinner() {
    const k = slots[0].dispobj.width + 'x' + slots[0].dispobj.height;
    //slots[1].dispobj.overwritedisplay = Shadows[0].m_depthRenderTarget;
    //slots[2].dispobj.overwritedisplay = Shadows[1].m_depthRenderTarget;
    //slots[3].dispobj.overwritedisplay = Shadows[2].m_depthRenderTarget;
    slots[1].dispobj.overwritedisplay = Shadows[0].m_depthTexture;
    slots[2].dispobj.overwritedisplay = Shadows[1].m_depthTexture;
    slots[3].dispobj.overwritedisplay = Shadows[2].m_depthTexture;
    slots[4].dispobj.overwritedisplay = rendertargets['depth' + k];
    slots[5].dispobj.overwritedisplay = rendertargets['rtopos' + k];
    slots[6].dispobj.overwritedisplay = rendertargets['rtshapepos' + k];
    slots[7].dispobj.overwritedisplay = rendertargets['rttexture' + k];
    onframe(()=>refall(), 1);
}

/** refresh OPTSHAPEPOS2COL without remakeShaders() */
function refts() {
    if (_ininit) return;
    remakeShaders(true);    // depending on usemask this may have to do more, so just do it
    // material.tshapepos2col={};
    // material.basefragcode=undefined;
    // material.basevertcode=undefined;
    // material.defines = undefined;
    // material.shadergenes=undefined;
    // material.matcodes = undefined;
    // clearPostCache('test');
    refall();
}

/** optimize shaders */
function optimizeShaders() {
    usesavedglsl = '';
    remakeShaders();
    const oo = ises300 ? 'OPTIMIZE' : 'OPTIMIZENOT300'
    onframe(() => exportmyshaders(undefined, oo), 5);
    setTimeout(() => {usesavedglsl=oo+'.opt'; remakeShaders()}, 4000);
    setTimeout(() => {usesavedglsl = '';}, 5000);
}

/** get statistics for array */
function getstats(a, opts = {}) {
    if (a.length === 0) return 'empty';
    const s1 = a.reduce((s,v)=> s + v, 0);
    const s2 = a.reduce((s,v)=> s + v*v, 0);
    const n = a.length;
    const min = a.reduce((s,v)=>Math.min(s,v));
    const max = a.reduce((s,v)=>Math.max(s,v));
    const mean = s1 / n;
    const sd = Math.sqrt((s2 - 1/n * s1*s1) / n);
    if (opts.short) return {mean, sd, min, max, n};
    let quartiles, dectiles;
    if (opts.sort) {
        const ss = a.slice().sort( (a1,b) => a1-b);
        const r = (v) => ss[Math.round(n * v)];
        quartiles = [r(0), r(1/4), r(2/4), r(3/4)]; quartiles.push(max);
        dectiles = [];
        for (let i = 0; i < 10; i++) { dectiles.push(r(i/10)); } dectiles.push(max);
    } else {
        // compute with buckets, first collect buckets
        const nb = opts.buckets || n*2;
        const b = new Int32Array(nb+1);
        const k = nb / max;
        let good = 0;
        for (let i = 0; i < n; i++) {
            const p = Math.floor(a[i]*k); // position
            if (p >= 0) {
                b[p]++;
                good++;
            }
        }

        // now buckets collected, collect cumulative info and save quartiles/dectiles
        let pcum = 0, cum = 0;  // cumulative count at start and end of bucket bn
        const res = {};
        [4, 10].forEach(kk => res[kk] = new Array(kk+1));
        for (let bn = 0; bn <= nb; bn++) {
            cum += b[bn];
            const r = cum/good;

            [4, 10].forEach( kk => {
                const tiles = res[kk];           // the array of tiles (eg dectiles, ...)
                const t = r * kk;                // t is the tile slot + remainder for this bucket
                const ti = Math.floor(t);       // ti is the tile slot corresponding to top of bucket range
                // If the slot is not yet occupied, then we are ready to do so
                // If there are only very few buckets, the same bucket may be needed to populate several slots
                //    so we check backwards through the buckets
                // As we don't know any better we assume the items in the bucket are evenly distributed,
                // and compute qr to see how far throught the bucket we must go to
                for (let tti = ti; tti >= 0 && tiles[tti] === undefined; tti--) {
                    const qwcum =  tti * good / kk;         // wanted cumulative number for this tile
                    const qr = (qwcum-pcum) / (cum-pcum);   // relative position within bucket
                    tiles[tti] = (bn + qr) * max / nb;      // correpsonding value
                }
            });

            pcum = cum;
        }
        [4, 10].forEach(kk => {res[kk][0] = min; res[kk][kk] = max; });
        quartiles = res[4];
        dectiles = res[10];
    }

    return {mean, sd, min, max, n, s1, s2, quartiles, dectiles, median: quartiles[2]};
}

/** compare two javascript objects, a little deep, return false if equal  */
function objectDiff(a, b) {
    if ((typeof a !== 'object') || (typeof b !== 'object')) return a === b ? false : {a, b};
    const diff = {};
    for (let gn in a) if (!(gn in b)) diff[gn] = {a: a[gn]};
    for (let gn in b) if (!(gn in a)) diff[gn] = {b: b[gn]};
    for (let gn in a) if ((gn in b)) {
        const d = objectDiff(a[gn], b[gn])
        if (d) diff[gn] = d;
    }
    if (Object.keys(diff).length === 0) return false
    return diff;
}

/** compare two javascript objects, give just the new changed (b) values  */
function objectChanged(a, b) {
    if ((typeof a !== 'object') || (typeof b !== 'object')) return a === b ? false : b;
    const diff = {};
    for (let gn in a) if (!(gn in b)) diff[gn] = undefined;
    for (let gn in b) if (!(gn in a)) diff[gn] = b[gn];
    for (let gn in a) if ((gn in b)) {
        const d = objectChanged(a[gn], b[gn])
        if (d) diff[gn] = d;
    }
    if (Object.keys(diff).length === 0) return false
    return diff;
}

/** apply changes */
function applyChanges(t = window, ch) {
    // if (typeof ch === 'object')
    for (const k in ch) {
        if (typeof t[k] !== 'object') t[k] = {};
        if (typeof ch[k] === 'object')
            applyChanges(t[k], ch[k]);
        else
            t[k] = ch[k];
    }
}


/** trim two strings */
function trimstrings(a,b) {
    a = a.split(''); b = b.split('');
    while (a[0] === b[0]) { if (a.length === 0 || b.length === 0) break; a.splice(0,1); b.splice(0,1); }
    a.reverse(); b.reverse();
    while (a[0] === b[0]) { if (a.length === 0 || b.length === 0) break; a.splice(0,1); b.splice(0,1); }
    a.reverse(); b.reverse();
    return [a.join(''),b.join('')];

}

/** full matrix update */
function updateMat(x) {
    x.updateMatrix();
    x.updateMatrixWorld(true);
}

/** define a scaled property */
function defineScaledProperty(o, newprop, baseprop, scale) {
    Object.defineProperty(o, newprop, {
        get : function() { return o[baseprop] * scale; },
        set : function(v) { o[baseprop] = v / scale; }
    });
}

var allowmess = false;
// interface Nomess { (boolean?): void, msg?, msgfix?};
/** clean up all bits that might cost and are not central to exhibition */
nomess = function (killmess = true) {
    if (killmess === 'release') { allowmess = false; killmess = false; }
    if (allowmess) return;
    if (killmess === 'force') { allowmess = 'never'; killmess = true; }
    if (killmess !== false) {
        setshowstats(false);
        W.msgbox.style.display = 'none';
        nomess.msgvisible = false;
        setInput(DE.showuiover, false);
        setInput(DE.showrules, false);
        setInput(DE.showhtmlrules, false);
        setInput(DE.showdirectorrules, false);
        setInput(DE.showstats, false);
        setInput(DE.showgrid, false);
        setInput(DE.doShowSCLog, false);
        setInput(DE.showcilly, false);
        setInput(DE.menuAutoOpen, false);
        W.entervr.style.display = 'none';
        // W.controlsouter.style.display = 'none';  // allow stats
        showControls(false);
        if (!oxcsynth && VUMeter2) VUMeter2.nometer = true;
    } else {
        //W._tranrule.style.display = 'none';
        W.msgbox.style.display = '';
        nomess.msgvisible = true;

        if (!oxcsynth && VUMeter2) VUMeter2.nometer = false;
        if (CSynth && CSynth.guidetail === 0) CSynth.guidetail = 1;
    }
}


/** get uniforms for a given tag */
function uniformsForTag(tag) {
    const types = {f: 'float', t: 'sampler2D', v3: 'vec3', v2: 'vec2', m4: 'mat4', i: 'int'};
    const r = [];
    for (const u in uniforms) {
        if (uniforms[u].tag === tag) {
            r.push(`uniform ${types[uniforms[u].type]} ${u};`)
        }
    }
    return r.join('\n');
}

// const _loaddatamsg = (isCSynth && startscript === undefined) ? `
// <div style="font-size: 200%; color: white">
// to load data
// <ul>
// <li>ctrl-O to open file dialog</li>
// <li>copy (eg ctrl-C from Explorer) and paste (crtl-V) files</li>
// <li>drag-drop files (eg from Explorer)</li>
// </ul>
// </div>
// ` : '';

/** test script for starting with a frame for each material
 * this helps us post loading progress information
*/
async function slowinit() {
    if (isCSynth && startscript === undefined) {
        // push message box out of the way during load to leave room for other startscreen messages
        const ss = W.msgbox.style;
        ss.width = '70%'
        ss.top = 'revert'
        ss.bottom = '10%'
        ss.position = 'fixed';
        // monitorX(ss, 'bottom')
        ss.left = '10%'
    }
    // loadTime('shaders 1 start');
    // msgfixlog('loadCSynth1', _loaddatamsg);
    // nomess.msgvisible = true;
    // msgfix.force();

    // await S.sleep(0);
    // if (startvr) {
    //     nomess('force');
    // }

    function showmsg(mm, prop = framenum/25) {
        msgfixlog('loadCSynth', `<div style="font-size: 200%; color: white">${mm}</div>
            ${genbar(prop)}`);
    }


    if (!startvr) W.startscreeni.innerHTML = '';
    if (isCSynth && startscript === undefined) W.startscreeni.innerHTML = `
    `
    log("'#'#'#", "code starting", '#'); msgfix.force();
    const mats = {};
    const st = performance.now();
    let fst = st;
    let lastop = 'no op yet';
    function frame() {
        framenum++;
        const now = performance.now();
        if (!startvr) nomess('release');
        log("'#'#'#", "comp frame dt" + framenum, now-st, now-fst, lastop);
        msgfix.all = true;
        msgfix.force();
        fst = now;
        Maestro.trigger('xxxframe');
    }
    function comp1(mat, popmode) {
        const x = log('comp1', mat.substring(0,8), oplist[popmode]);
        const mm = `preparing shaders ...` + oplist[popmode] + ' ' + framenum;
        showmsg(mm);
        lastop = x;
        consoleTime(x);
        testopmode = opmode = popmode;
        mats[popmode] = getMaterial(mat, currentGenes);
        XrequestAnimationFrame(frame);
        consoleTimeEnd(x);
    }
    function comp2(mat, popmode, no=false) {
        const x = log('comp2', mat.substring(0,8), oplist[popmode]);
        const mm = 'compiling shaders ...' + oplist[popmode] + ' ' + framenum;
        showmsg(mm);
        lastop = x;
        consoleTime(x);
        testopmode = opmode = popmode;
        if (no) {
            log('skip comp2', oplist[popmode]);
        } else {
            testmaterial.test(mats[popmode], popmode);
        }
        XrequestAnimationFrame(frame);
        consoleTimeEnd(x);
    }
    XrequestAnimationFrame(frame);
    await S.maestro('xxxframe');
    await usleep(1);  // to let fullscreen in?
    _insinit = true;
    orginit();

    _ininit = true;

    const mv = currentGenes.tranrule || 'XXXTRXXX';
    framenum = 10;
    if (appToUse === 'Horn') { // do not precompile for Julia etc, some aren't needed. n.b. CSynth uses 'Horn'
        let comp = comp1;
        for (let i=0; i<2; i++) {
            comp(mv, OPPOSITION); await S.maestro('xxxframe');
            comp(mv, OPOPOS); await S.maestro('xxxframe')
            if (inputs.USESKELBUFFER) { comp(mv, OPMAKESKELBUFF); await S.maestro('xxxframe') }
            // comp(mv, OPSHADOWS); await S.maestro('xxxframe')
            comp(mv, OPSHAPEPOS); await S.maestro('xxxframe')
            comp(mv, OPTEXTURE); await S.maestro('xxxframe')     // wrong colour if this enabled
            if (comp === comp1) {
                comp(mv, OPTSHAPEPOS2COL); await S.maestro('xxxframe');    // details such as shadows not ready, so comp2 invalid this early
            }
            /**** for now work because matrix trancodeForTranrule and other overrides
            if (currentGenes.name === 'csynth1' && i === 0) {
                const matrix = new CSynth.Matrix();
                comp('matrix', OPOPOS); await S.maestro('xxxframe')
                comp('matrix', OPSHAPEPOS); S.maestro('xxxframe')
                comp('matrix', OPTSHAPEPOS2COL); S.maestro('xxxframe')
            }
            /***/
            loadTime('shaders 2 comp ' + i);
            comp = comp2;
        }
    }

    showmsg('finalizing matrix shaders: ' + framenum);
    loadTime('shaders 3 finalizing matrix shaders');



    _ininit = false;
    _insinit = false;

    let now = performance.now();
    log("'#'#'#", "comp frame dt prework done" + framenum, now-st, now-fst, lastop); msgfix.force();
    fst = now;
    function firstAnimatex() {  // so it shows up in dev tools performance
        consoleTime('>>> firstanimatex');
        animateNum(now);
        consoleTimeEnd('>>> firstanimatex');
    }
    firstAnimatex();
    now = performance.now();
    log("'#'#'#", "comp frame first real frame done" + framenum, now-st, now-fst, lastop); msgfix.force();
    loadTime('shaders 4 matrix shader done');

    showmsg('shader generation complete', 1);
    loadTime('shaders 5 shader generation complete');

    let ff = 0;
    function endup() {
        // todo: consider best pattern for slowinit.pendend; this is easy and effective
        if (Object.keys(slowinit.pendend).length) {
            if (ff%100 === 0)
                log('pend', ff);
            ff++;
            return onframe(endup);
        }
        loadTime(`shaders 6 pending others done after ${ff} frames`);
        showmsg('last shaders being prepared');

        if (isCSynth) {
            //console.profile('endshad');
            if (!springs.material) {
                if (springs.getPARTICLES() < 0) springs.setPARTICLES(8)
                springs.step(1);
            }
            if (startscript === undefined) {
                const s = CSynth.active; CSynth.active = true; animatee(); CSynth.active = s;
            }
            //console.profileEnd('endshad');
            loadTime(`after force more shaders`);
        }

        if (isCSynth && startscript === undefined) {
            showmsg(`shaders ready`, 1);
            setTimeout(() => msgboxVisible(false), 2000);
        } else {
            showmsg('data and shaders ready, awaiting very final processing', 1);
        }
        onframe( () => {
            loadTime('shaders 7 waited 3 more frames');
            showmsg('running ...', 1);
            if (!deferRender) W.startscreen.style.display = 'none';   // kill splash now
            // setTimeout( () => {
                showmsg('', 1);
                msgboxVisible(false);               // kill initial messages soon
                msgfixlog('loadCSynth');
                msgfix('loadTimes', '<ul><li>' + yaml.safeDump(loadTimes).trim().replace(/\n/g, '</li><li>') + '</li></ul>')                // msgfix.hide('loadTimes');   // but hidden till wanted
            // }, 2000);
        }, 3);
    }
    endup();
    window.dispatchEvent(new Event('initdone'));
}
slowinit.pendend = {};


var startcommit;
// check we are running latest version of Organic/CSynth
function checkres() {
    if (!startcommit) return;  // eg used from some small test function
    if (location.href.indexOf('csynthstatic/stephensvn') !== -1) return;    // testing will probably be wrong versions
    if (location.href.contains('csynth.github.io')) return;
    const current = startcommit.trim();
    let uuu = '../startcommit.txt';
    if (location.pathname.indexOf('matrixexplorer') !== -1) uuu =  '../../' + uuu;
    let latest;
    try {
        latest = posturi(uuu).trim();
    } catch(e) {
        log('no checkres made, file not available', uuu, e);
        return;
    }
    if (current !== latest) {
        /*** not quite ready yet ....
        W.startscreeni.innerHTML = `
        CSynth has been updated from version ${current} to ${latest}
        <br>
        `;
        W.startscreen.style.display = '';
        /***/
        msgfixerror('update', `<span style="font-size:150%">CSynth has been updated</span><br>
        from version<br>
        <span style="color:white">${current}</span><br>
        to version<br>
        <span style="color:white">${latest}</span>.
        <p>Force cache refresh to load latest version.  Typically:
        <ul>
        <li><b>Windows or Linux:</b>Ctrl-F5
        <li><b>Safari:</b>Shift + reload button on toolbar
        <li><b>Chrome or Firefox on Mac:</b>Cmd-Shift-R
        </ul>
        </p>
        <hr>
        `)
        console.error('version mismatch', current, latest);
    } else {
        console.log('latest version in use', current);
    }
}
if (!inworker) checkres();


/** init called on window load */
function inittimed() {
    //if (isNode())
    //    yaml = require('./JSModules/node_modules/js-yaml');
    //else
    //    yaml = require('JSModules/node_modules/js-yaml/lib/js-yaml');
    yaml = jsyaml;
    mapOnce();      // may not be needed, but much quicker before things are too populated

    if (appToUse !== 'Horn' || searchValues.nohorn || searchValues.fastinit) {
        orginit();
        if (!deferRender) W.startscreen.style.display = 'none';  // defer till shaders ready
        msgfix('code', 'code loaded, now initializing ...')
        msgfix.force();  // so it shows immediately
        window.dispatchEvent(new Event('initdone'));
    } else {
        // run TimedScript(slowinit());
        slowinit();
    }
}

/** replace all <span class='group'> tags with a wrapping fieldset/legend.
 * <span>...</span> =>  <fieldset><legend>xxx</legend><span>...</span></fieldset> */
function replaceGroups() {
    // if (location.pathname.endsWith("/csynth.html")) {
    //     W._tranrule = W.tranrulebox;
    //     return;  // << TODO sort CSynth gui for new folding
    // }
    const groups = document.body.getElementsByClassName('group');
    const arr = Array.from(groups);
    for (let i = arr.length-1; i >= 0; i--) {
        const ggg = arr[i];
        const caption = ggg.title;
        if (ggg.tagName !== 'SPAN' || !caption) continue;
        const col = ggg.style.borderColor || 'gray';
        const temp = document.createElement('fieldset');
        temp.className = "hidebelow";
        temp.id = '_' + caption;
        temp.style.borderColor = col;
        temp.innerHTML = `<legend onclick=toggleFold(this)>${caption}</legend>`;
        temp.style.display = ggg.style.display;
        ggg.replaceWith(temp);
        temp.appendChild(ggg);
        if (caption === 'tranrule') temp.style.display = W.showrules.checked ? '' : 'none';
    }
}

/** initial start on windows load, if nwwin availble check size, and in any case call inittimed */
function init() {
    if (searchValues.fullscreen) fullscreen();
    log('tad+ init()');
    if (startSC) {
        msgfixlog('tad+', 'no startSC in init')
        // startSC();  // used to defer incase of VR devices with audio, try start asap
    }

    // for some odd reason, W.guifilter does not work at this point without help
    W.guifilter = DE.guifilter;

    replaceGroups();
    for (const ff of document.getElementsByTagName('fieldset')) foldStates[ff.id] = undefined;
    restoreFoldStates();
    onframe(restoreFoldStates, 2);      // why needed?

    if (searchValues.nothing) {W.controls.style.display=''; W.controls.style.height='700px'; return;}

    isFirefox = navigator.userAgent.contains('Firefox');
    // TODO FIX THIS HORRIBLE PATCH, when we revist page on Chrome for tabs, imagres.value get corrupted to 'startup' and we can't find where.
    if (W.imageres.value === 'startup') {console.error('patched imageres startup'), W.imageres.value = 1024; }
    EX.toFront();
    consoleTime('comp init');
    if (nwwin)
        getScreenSize(inittimed);
    else
        inittimed();
    consoleTimeEnd('comp init');

}

function consoleTime(x) {
    x += '';
    if (!consoleTime.s) consoleTime.s = {};
    const start = performance.now();
    consoleTime.s[x] = {start, last: start};
}
//consoleTime.s = {};
function consoleTimeEnd(x, _msg='', show=log) {
    x += '';
    const t = performance.now();
    const ttot = performance.now() - consoleTime.s[x].start;
    const tinc = performance.now() - consoleTime.s[x].last;
    if (x.startsWith('material created') && tinc > 100)
        console.log('X+++!!!+++!!!' + x + oplist[opmode], '<br>' + ttot.toFixed(3) + 'sec');

    show('+++'+x + ' ' + _msg, tinc.toFixed(3) + 'msec', ttot.toFixed(3) + 'msec');
    consoleTime.s[x].last = t;
    return t;
}

/** test various tbings for nan */
function testnan(x) {
    if (!testnan.do) return;
    if (x == undefined) return; // eslint-disable-line eqeqeq
    if (x === '') return;
    if (x.elements) {testnan(x.elements)}
    if (x.map) {x.map(y=>testnan(y)); return; }
    if (x.isCamera) {
        testnan(x.matrix.elements);
        testnan(x.matrixWorld.elements);
        testnan(x.matrixWorldInverse.elements);
        testnan(x.position);
        testnan(x.quaternion);
        return;
    }
    if ((typeof x === 'number' || typeof x === 'string') && !isNaN(x*0)) return;
    if (x.x !== undefined) {testnan(x.x);testnan(x.y);testnan(x.z);testnan(x.w); return; }
    if (x._x !== undefined) {testnan(x._x);testnan(x._y);testnan(x._z);testnan(x._w); return; }
    if (testnan.do === 'break') debugger;
    throw new Error('testnan error for', x);
}
testnan.do = 'break';

/** set multiple values, used for (semi) structured genes */
function setKeyMany(o, key, from, list) {
    list.forEach(t => o[key + t] = from[t]);
}
function setKeyRgb(o, key, from) {setKeyMany(o, key, from, ['r','g','b'])}
function setKeyXyz(o, key, from) {setKeyMany(o, key, from, ['x','y','z'])}

/* return gcd of two number or array */
function gcd(a,b) {
    if (a.reduce) return a.reduce((v,n) => gcd(v,n));
    if (a === b) return a;
    if (a > b) [a,b] = [b,a];
    const d = b-a;
    return gcd(a > 0 ? a : b, d);
}

/** return 'deltagcd' pair, g is highest number such that all items of a have same modulus del w.r.t. g */
function delgcd(a) {
    const b = a.map(i => i-a[0]);
    const g = gcd(b);
    let del = a[0]%g;
    if (del < 0) del += g;
    return [g, del];
}


// make html table out of 2d array, cr can be \n for legibility, but upsets msgfix
function array2Table(a, classs='simpletable', cr='') {
    const r = [];
    for (let i=0; i<a.length; i++) {
        r.push( '<tr><td>' + a[i].join('</td><td>') + '</td></tr>')
    }
    return `<table class = "${classs}">${cr}` + r.join(cr) + `${cr}</table>`;
}

function toggleDraggable(ptodrag) {
    const todrag = findDraggable(ptodrag);
    if (!todrag) return;
    (todrag.save ? stopDraggable : makeDraggable)(todrag);
}

function stopDraggable(ptodrag) {
    const todrag = findDraggable(ptodrag);
    if (!todrag) return;

    if (!todrag.save) return;
    const s = todrag.style;
    let dragmousedown, dragmousemove, dragmouseup, parent;
    [s.position, s.left, s.top, s.bottom, s.width, s.height, dragmousedown, dragmousemove, dragmouseup, parent] = todrag.save;
    parent.appendChild(todrag);     // this will not be in right place, it will be at end
    todrag.removeEventListener('mousedown', dragmousedown);
    todrag.removeEventListener('mousemove', dragmousemove);
    todrag.removeEventListener('mouseup', dragmouseup);
    delete todrag.save;
}

function findDraggable(todrag) {
    while (true) {
        if (!todrag) return;
        if (todrag.tagName === 'FIELDSET' |
            ' msgbox mystats controlsouter UI_overlay '.indexOf(' ' + todrag.id + ' ') !== -1 |
            todrag.id === 'msgbox' |
            false) return todrag;
        todrag = todrag.parentNode;
    }
}

// make an object draggable
function makeDraggable(ptodrag, usesize=true, button = 2, callback) {
    let todrag = findDraggable(ptodrag) ?? ptodrag;
    if (!todrag) return;

    if (todrag.save) return;  // already draggable
    const s = todrag.style;
    const rr = todrag.getBoundingClientRect();
    todrag.save = [s.position, s.left, s.top, s.bottom, s.width, s.height, dragmousedown, dragmousemove, dragmouseup, todrag.parentNode];
    s.position = 'fixed';
    s.left = Math.min(screen.width-300, Math.max(0, rr.x + 100)) + 'px';
    let top;
    if (s.top && s.top.endsWith('px')) {
        top = s.top.pre('px');
    } else {
        top = Math.min(screen.height-300, Math.max(0, rr.y));
    }
    s.top = top + 'px';
    s.bottom = 'auto';
    if (usesize && rr.width && rr.height) {
        s.width = rr.width + 'px';
        if (usesize === 'both') s.height = rr.height + 'px';
    }
    const e = ptodrag.getElementsByClassName('fieldbody')[0]
    if (e) e.style.maxHeight = (innerHeight - top - 70) + 'px';

    document.body.appendChild(todrag);

    todrag.addEventListener('mousedown', dragmousedown);

    function dragmousedown(evt) {
        if (evt.buttons !== button) return;
        todrag.ox = evt.clientX - s.left.replace('px','');
        todrag.oy = evt.clientY - s.top.replace('px','');
        document.addEventListener('mousemove', dragmousemove);
        document.addEventListener('mouseup', dragmouseup);
        canvas.style.pointerEvents = 'none';
        // enable context on the individual parts, but not on dragging the fieldbody
        ptodrag.oncontextmenu = (evt.target.className.contains('fieldbody')) ? _=>false : null
    }
    function dragmousemove(evt) {
        if (evt.buttons !== button) return;
        msgfix('ddrag', 'x', offx(evt) , todrag.clientWidth, 'y', offy(evt) , todrag.clientHeight);
        // if (offx(evt) > todrag.clientWidth - 50
        //     && offy(evt) > todrag.clientHeight - 50)
        //     return killev(evt);
        s.left = (evt.clientX - todrag.ox) + 'px';
        const dtop = evt.clientY - todrag.oy;
        s.top = dtop + 'px';
        const de = ptodrag.getElementsByClassName('fieldbody')[0]
        if (de) de.style.maxHeight = (innerHeight - dtop - 70) + 'px';
        if (callback) callback(evt, s)
        return killev(evt);
    }
    function dragmouseup(evt) {
        document.removeEventListener('mousemove', dragmousemove);
        document.removeEventListener('mouseup', dragmouseup);
        canvas.style.pointerEvents = '';
        // if (evt.target.className.contains('fieldbody')) return killev(evt);
    }
}   // makeDraggable

// varied from https://stackoverflow.com/questions/15316127/three-js-line-vector-to-cylinder
function cylinderMesh(pointX, pointY, rad, mat) {
    var direction = new THREE.Vector3().subVectors(pointY, pointX);
    var orientation = new THREE.Matrix4();
    orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
    orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
                                           0, 0, 1, 0,
                                           0, -1, 0, 0,
                                           0, 0, 0, 1));
    var edgeGeometry = new THREE.CylinderGeometry(rad, rad, direction.length(), 8, 1);
    var edge = new THREE.Mesh(edgeGeometry, mat);
    edge.applyMatrix4(orientation);
    // position based on midpoints - there may be a better solution than this
    edge.position.x = (pointY.x + pointX.x) / 2;
    edge.position.y = (pointY.y + pointX.y) / 2;
    edge.position.z = (pointY.z + pointX.z) / 2;
    edge.updateMatrix();
    return edge;
}

function toKey(x) {
    const str = JSON.stringify(x).replace(/"/g, '')
    return str.length > 30 ? str.substr(0,20) + '###' + str.hashCode().toString(36) : str;
}

// helpful details to see matrices more easily
window.devtoolsFormatters = [
    { header: (obj) => (obj && ('isMatrix3' in obj || 'isMatrix4' in obj)) ? ['div', {}, obj.toString()] : null,
    hasBody: ()=>false }
]

if (THREE) THREE.Matrix4.prototype.toString = function(m) {
     return 'mat4: [' +
        [this.elements.slice(0,4),
        this.elements.slice(4,8),
        this.elements.slice(8,12),
        this.elements.slice(12,16)].map(mm=>format(mm)).join('   ')
        + ']'
 }

 if (THREE) THREE.Matrix3.prototype.toString = function(m) {
    return 'mat3: [' +
       [this.elements.slice(0,3),
       this.elements.slice(3,6),
       this.elements.slice(6,9)].map(mm=>format(mm)).join('   ')
       + ']'
}

// from https://stackoverflow.com/questions/14519267/algorithm-for-generating-a-3d-hilbert-space-filling-curve-in-python
function hilbertC(s = 8, x=0, y=0, z=0, dx=1, dy=0, dz=0, dx2=0, dy2=1, dz2=0, dx3=0, dy3=0, dz3=1, r = []) {
    if(s <= 1) {            // <= not ===, so it terminates with s not power 2. Same result for s=5 or s=8;
        r.push( {x, y, z})
    } else {
        s/=2;
        if(dx<0) x-=s*dx;
        if(dy<0) y-=s*dy;
        if(dz<0) z-=s*dz;
        if(dx2<0) x-=s*dx2;
        if(dy2<0) y-=s*dy2;
        if(dz2<0) z-=s*dz2;
        if(dx3<0) x-=s*dx3;
        if(dy3<0) y-=s*dy3;
        if(dz3<0) z-=s*dz3;
        hilbertC(s, x, y, z, dx2, dy2, dz2, dx3, dy3, dz3, dx, dy, dz, r);
        hilbertC(s, x+s*dx, y+s*dy, z+s*dz, dx3, dy3, dz3, dx, dy, dz, dx2, dy2, dz2, r);
        hilbertC(s, x+s*dx+s*dx2, y+s*dy+s*dy2, z+s*dz+s*dz2, dx3, dy3, dz3, dx, dy, dz, dx2, dy2, dz2, r);
        hilbertC(s, x+s*dx2, y+s*dy2, z+s*dz2, -dx, -dy, -dz, -dx2, -dy2, -dz2, dx3, dy3, dz3, r);
        hilbertC(s, x+s*dx2+s*dx3, y+s*dy2+s*dy3, z+s*dz2+s*dz3, -dx, -dy, -dz, -dx2, -dy2, -dz2, dx3, dy3, dz3, r);
        hilbertC(s, x+s*dx+s*dx2+s*dx3, y+s*dy+s*dy2+s*dy3, z+s*dz+s*dz2+s*dz3, -dx3, -dy3, -dz3, dx, dy, dz, -dx2, -dy2, -dz2, r);
        hilbertC(s, x+s*dx+s*dx3, y+s*dy+s*dy3, z+s*dz+s*dz3, -dx3, -dy3, -dz3, dx, dy, dz, -dx2, -dy2, -dz2, r);
        hilbertC(s, x+s*dx3, y+s*dy3, z+s*dz3, dx2, dy2, dz2, -dx3, -dy3, -dz3, -dx, -dy, -dz, r);
    }
    return r;
}
// hilbertC(8,0,0,0,1,0,0,0,1,0,0,0,1);

/** function to start WebSocket listener */
var WebSocket, evalq, currentLoadingDir, currentLoadingFile;
function startWsListener(addr = 57777) {
    const starttried = startWsListener.calls++;
    var socket = startWsListener.socket = new WebSocket(`ws://${location.hostname}:` + addr);
    socket.onopen = () => msgfixlog('startWsListener', "Connection successful.", starttried);
    socket.onclose = () => { msgfixlog('startWsListener', "Connection closed.", starttried); startWsListener.socket = undefined; }
    socket.onerror = function (e) {
        msgfixlog('startWsListener', 'Connection error', starttried);
        // if (starttried === 1) { // no server running and not yet tried to start one
        //     execasync(me.servercode);
        // }
        // if (starttried < 10) {
        //     setTimeout(me.start, 200);
        // }
    }
    let pendingFid;
    socket.onmessage = (m) => {
        const mm = m.data;
        if (pendingFid) {
            postCache[pendingFid] = {t: Date.now(), framenum, v: mm, source: 'websocket', fid: pendingFid};
            log('data received for', pendingFid);
            socket.send(`result!!!!data received ${pendingFid}`);
            pendingFid = undefined;
        } else if (mm.startsWith('file:')) {
            pendingFid = mm.substring(5);
        } else if (mm.startsWith('clipboard:')) {
            newclipboard(mm.post(':'));
        } else if (mm.startsWith('watch:')) {
            log('watch noticed somthing:', mm);
        } else {
            const s = [currentLoadingDir, currentLoadingFile];
            try {
                currentLoadingDir = FIRST(currentLoadingDir, '');
                currentLoadingFile = FIRST(currentLoadingFile, '!websocket!');
                const r = evalq(mm);
                socket.send(`result!!!!${mm}!!!!${r}`);
            } catch(e) {
                socket.send(`error!!!!${mm}!!!!${e}`);
            } finally {
                [currentLoadingDir, currentLoadingFile] = s;
            }
        }
    }
    return socket;
}
startWsListener.calls = 0;

function mirrorProperty(toobj, topropname, fromobj, frompropname = topropname) {
    Object.defineProperty(toobj, topropname, {
        get: function() { return fromobj[frompropname]},
        set: function(v) { fromobj[frompropname] = v},
        enumerable: true
    });
}

/** perform function every frame (preframe), making sure not to fall over odd Maestro rules.  */
function everyframe(fn) {return Maestro.on('preframe', ()=> {fn(); return 0;} )}

/** exec a command async, whether in node or not */
function execasync(str, opts) {
    if (isNode())
        return require('child_process').exec(str);
    else {
        const id = str.replace(/"/g,'').substring(0, 80) + ' Organic';
        return runcommandphp('start "' + id + '" ' + opts + ' ' + str, true);
    }
}
var distxyz = (i,j) => Math.sqrt((i.x-j.x)**2 + (i.y-j.y)**2 + (i.z-j.z)**2); // really const
var distarr3 = (i,j) => Math.sqrt((i[0]-j[0])**2 + (i[1]-j[1])**2 + (i[2]-j[2])**2); // really const

/** traverse materials */
function mtraverse(node, action) {
    node.traverse(n => {let m = n.material; if (m) action(m)});
}

/** bring to front just once
 *
 */
EX.toFront = async function() {
    if (!islocalhost) return;       // does  not work unless local
    if (searchValues.test) return;  // let tests go on in background without disrupting other apps on the machine
    if (searchValues.nofront) return;
    // // wasmax gets over win activate issue with maximized (not fullscreen) window, but gives jumps
    // const wasmax = W.outerWidth === W.innerWidth*W.devicePixelRatio && W.outerHeight !== W.innerHeight*W.devicePixelRatio;
    // nircmd(`win activate stitle "${document.title}"`);
    // if (wasmax) nircmd(`win max stitle "${document.title}"`);

    // this sequence seems to work to bring to front, but not always to activate
    // nircmd(`win settopmost stitle "${document.title}" 1`);
    // nircmd(`win settopmost stitle "${document.title}" 0`);

    // so we have to fall back on ...
    runcommandphp(`start /min "toFront" cscript toFront.vbs "${document.title}"`, true);
}

/** start a bring to front every interval (5 seconds) */
EX.startToFront = function(t = 5000) {
    // ??? would it be better just to set it as topmost ???
    // ??? not convenient for debug etc though!
    EX.stopToFront();
    EX.frontInterval = setInterval(EX.toFront, t)
}
/** stop any bring to front every interval */
EX.stopToFront = function() {
    if (EX.frontInterval) clearInterval(EX.frontInterval);
    EX.frontInterval = undefined;
    nircmd(`win settopmost stitle "${document.title}" 0`);
}

//>>> TODO also need to do something to sleep's use of timeout
/** keep going even if document not active  */
EX.keepGoing = function EXkeepGoing () {
    EX.keepGoing.ops = [];
    // eslint-disable-next-line no-undef
    const w = EX.keepGoing.w = new Worker(window.URL.createObjectURL(new Blob(['onmessage = e => postMessage(e.data)'])));
    w.onmessage = e => {
        const ops = EX.keepGoing.ops;
        EX.keepGoing.ops = [];
        if (document.visibilityState === 'hidden')
            ops.forEach(op =>
                op()
            );
    }
}
// E.keepGoing();

// generate random rotation [slightly biased, but ...]
EX.randrot = function() {
    const r = Math.random;
    const ax = new THREE.Vector3(r(), r(), r()).normalize();
    const ang = r() * Math.PI * 2;
    return new THREE.Matrix4().makeRotationAxis(ax, ang);
}


function XrequestAnimationFrame(fr) {
    if (document.visibilityState === 'hidden' && EX.keepGoing.ops) {
        EX.keepGoing.ops.push(fr);
        EX.keepGoing.w.postMessage('keep going');
    } else {
        requestAnimationFrame(fr);
    }
}

/** substitute expression with ${} syntax in */
function substituteExpressions(str) {
    if (str.indexOf('${') === -1) return str;
    const s1 = str.replace(/`/g, '\\`');
    const s2 = eval('`' + s1 + '`');
    const s3 = s2.replace(/\\`/g, '`');
    return s3;
}

function clamp(v, l, h) { return Math.min(h, Math.max(l, v)); }

/// check a matrix for being orthonormal.  If so, a,b,c should be 0 (or very very close)
function orthoTest(e) {
    if (e.isMatrix4) e = e.elements;
    const c = e[0]*e[4] + e[1]*e[5] + e[2]*e[6];
    const a = e[8]*e[4] + e[9]*e[5] + e[10]*e[6];
    const b = e[0]*e[8] + e[1]*e[9] + e[2]*e[10];
    log('ortho', a, b, c);
    return [a,b,c];
}

/** issue a nir command */
function nircmd(str) {
    console.trace('nircmd', str);
    if (islocalhost)
        return runcommandphp(`..\\nircmd\\nircmd.exe ${str}`, false);  // sync with no message
    console.error('cannot use nircmd when not in localhost', location.hostname, str);
}

/** issue a nir command, making sure app activated */
async function niractcmd(str) {
    console.trace('niractcmd', str);
    canvas.focus();
    await usleep(1);
    nircmd(`win activate stitle "${document.title}"`);
    await usleep(1);
    canvas.focus();
    await usleep(1);
    nircmd(str);
    await usleep(1);
}

// get value for string, return undefined if anything wrong along chain
// can simplify lots of tests for undefined
function getVal(s) {
    if (typeof s === 'string') s = s.split('.');
    let r = window;
    for (const k of s) {
        if (typeof r !== 'object') return undefined;
        r = r[k];
    }
    return r;
}

// replace part of string
function replaceAt(string, index, replace) {
    return string.substring(0, index) + replace + string.substring(index + replace.length);
}

/** set to full screen */
async function fullscreen(evt) {
    await _setfullscreen(true, evt)
}

async function exitFullscreen(evt) {
    await _setfullscreen(false, evt)
}

async function toggleFullscreen(evt) {
    await _setfullscreen('toggle', evt)
}

async function _setfullscreen(tostate, evt) {
    if (evt?.repeat) return;
    if (evt?.which) evt = 'fromevt'
    // const ll = m => console.trace(`${m}, lokcid=${fullscreen.lock.id} doing=${fullscreen.doing} evt=${evt}` )

    navigator.locks.request('fullscreen', async () => {
        const isfull = () => screen.height === window.innerHeight * devicePixelRatio;
        const oldstate = isfull();
        if (tostate === 'toggle') tostate = !oldstate;
        if (tostate !== oldstate) {
            await nircmd(`win activate stitle "${document.title}"`);  // await not relevant???
            await S.frame();
            await usleep(1);
            await S.waitVal(() => keysdown.length === 0); // this makes sure the next f11 actually takes
            log('keysdown empty', keysdown.length);
            await nircmd(`sendkey f11 press`);
            await S.frame(10);
        }
    });
}

var enterfullscreen = fullscreen;
var enterFullscreen = fullscreen;
var exitfullscreen = exitFullscreen;

if (searchValues.fullscreen) enterFullscreen(); // somehow this preps things for direct fullscreen() at start of init()

/*** old fullscreen experiments at svn rev 10682 */


function userlog(msg) {
    const date = new Date();
    const dd = userlog.lastdate ? date - userlog.lastdate : 0;
    sclog(`${date.toISOString()} / ${dd}: ${msg}
`, -2);
    userlog.lastdate = date;
}

var threef = []; for (let x in THREE) if (typeof THREE[x] === 'function') threef.push(THREE[x]);
/** recursively measure three.js resources W.I.P. */
function measureResources(node, s = 0, nodes = []) {
    if (!node) return;
    if (Array.isArray(node)) {
        for (let i=0; i < node.length; i++) {
            s += measureResources(node[i], s, nodes)[0];
        }
    } else if (typeof node === 'object') {
        const constr = node.__proto__.constructor;
        if (!threef.includes(constr)) return 0;
        nodes.push(node);
        if (node.lastMeasureFramenum === framenum) return 0;
        node.lastMeasureFramenum = framenum;
        for (let fn in node) {
            const ff = node[fn];
            s += measureResources(ff, s, nodes)[0];
        }
    }
    return [s, nodes];
}

/** save a files locally, using Files.dirhandle if available, downloads if not */
async function saveLocal(data, fid) {
    if (Files.dirhandle) {
        Files.write(fid, data);
    } else {
        saveAs(data, fid);
    }
}

if (!serious) serious = console.error;

/** download current image, complete with gui */
async function downloadImageGui(fn = 'test', imtype = 'png') {
    await S.frame();
    const fid = fn + '.' + imtype;
    const imformat = 'image/' + (imtype === 'jpg' ? 'jpeg' : imtype);
    log(imtype);
    const datauri = canvas.toDataURL(imformat);
    const blob = dataURItoBlob(datauri, 1);
    saveLocal(blob, fid);
    await S.frame();
}

// fro https://stackoverflow.com/questions/15558418/how-do-you-save-an-image-from-a-three-js-canvas
function UnusedForNowcreateImage(saveAsFileName) {
    //var canvas = document.getElementById("canvas");
    var url = canvas.toDataURL( 'image/tif', 1.0 );
    var link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.setAttribute('download', saveAsFileName);
    link.click();
}

/** download current image, default option to hide gui */
async function downloadImage(fn = 'test', imtype = 'png', gui = false) {
    const ss = GX.guilist.map(g => g.visible);  // save visibility
    const sg = window.V.gui.visible;
    GX.guilist.forEach(g => g.visible = false)  // hide all menu items
    window.V.gui.visible = gui;
    await downloadImageGui(fn, imtype);
    GX.guilist.forEach((g,i) => g.visible = ss[i]); // restore menu visibility
    window.V.gui.visible = sg;
}

/** download current image at higher resolution */
async function downloadImageHigh(big = 3840, fn=undefined, imtype=undefined, gui = false) {
    const [w, h, gv] = [width, height, window.V.gui.visible];
    const r = big / Math.max(w, h);
    setSize(Math.round(w*r), Math.round(h*r));
    await S.frame()
    await downloadImage(fn, imtype);
    setSize(w, h);
}


// shallow compare two objets in given elements, return structure showing both old and new, {}} if no change
function objdiff(o1, o2, ele, tol = 0) {
    const r = {};
	if (ele === undefined) ele = Object.keys(o1);
	else if (typeof ele === 'string') ele = ele.split(',');
	for (let e in ele) {
		var ee = ele[e];
		if (o1[ee] !== o2[ee]) {
            if (!(tol && (o1[ee] - o2[ee]) < tol)) {
                r[ee] = {ee, o1:o1[ee], o2:o2[ee]};
            }
        }
	}
	return r;
}

// compare two objects, return structure of new (o2) or comparison,  undefined if no change
function objnew(o1, o2, {ele, tol = 0, depth = 1, both = false} = {}) {
    let change = false;
    const r = {};
	if (ele === undefined) ele = Object.keys(o2);
	else if (typeof ele === 'string') ele = ele.split(',');
	for (const e in ele) {
		const ee = ele[e];
        const nn = o2[ee], oo = o1[ee];
        if (typeof nn === 'object' && depth > 0) {
            const or = objnew(oo, nn, {tol, depth: depth-1});
            if (or) {
                r[ee] = both ? {ee, o1:o1[ee], o2:or} : or;
                change = true;
            }
        } else if (nn !== oo) {
            if (!(tol && (o1[ee] - o2[ee]) < tol)) {
                r[ee] = both ? {ee, o1:o1[ee], o2:o2[ee]} : o2[ee];
                change = true;
            }
        }
	}
	return change ? r : undefined;
}


// shallow compare two objets in given elements
function objeq(o1, o2, ele, tol = 0) {
    const r = {};
    if (o1 === undefined || o2 === undefined) return o1 === o2;
	if (ele === undefined) ele = Object.keys(o1);
	if (typeof ele === 'string') ele = ele.split(',');
	for (let e in ele) {
		var ee = ele[e];
		if (o1[ee] !== o2[ee]) {
            if (!(tol && (o1[ee] - o2[ee]) < tol))
                return false;
        }
	}
	return true;
}


/** diff two lists **/
function arraydiff(a, b) {
    const r = [];
    for (const x of a) if (!b.includes(x)) r.push(x);
    return r;
}

function delaySnippetLoad() {
    var snippetframe = document.getElementById('snippetframe');
    if (!snippetframe) return; // eg CSynth
    let observer = new IntersectionObserver((entries, _observer) => {
        const ss = localStorage.snippetsrc;
        const src = FIRST(ss, "https://docs.google.com/document/d/1bWVdSU_2D-bpePJrVKTadjHg9rspuW_5IY3A7awPze4/edit?usp=sharing");
        if (snippetframe.src !== src) {
            snippetframe.src = src;
            // why did we have this complication?
            // entries.forEach(entry => {
            //     if (entry.isIntersecting && snippetframe.src !== src)
            //     snippetframe.src = src;
            // });
        }
    }, {root: document.documentElement});
    observer.observe(snippetframe);
}
if (!inworker) setTimeout(delaySnippetLoad, 5000);

/** get the 'interesting' fairly basic values from an object */
function getInterestingValues(object, {maxArrayLength = 50}= {}) {
    let _interestingClasses = [THREE.Matrix3, THREE.Matrix4, THREE.Vector2, THREE.Vector3, THREE.Vector4];
    function _isInterestingBase(v) {
        let use = true;
        if (typeof v === 'object') use = _interestingClasses.some(c => v instanceof c)
        else if (typeof v === 'function') use = false;
        else use = true;
        return use;
    }


    const x = {};
    for (const n in object) {
        const v = object[n];
        let use;
        if (Array.isArray(v) || ArrayBuffer.isView(v) )
            use = (v.length < maxArrayLength && _isInterestingBase(v[0])) // nb, length 0 passes
        else use = _isInterestingBase(v);

        if (use) x[n] = v;
    }
    return x;
}

//
/** get the 'interesting' fairly basic values for each item in an */
function getInterestingValues1(object, {maxArrayLength = 50}= {}) {
    const x = {};
    for (let gn in object) x[gn] = getInterestingValues(object[gn])
    return x;
}

/** restore values, probably 'interesting' values, insert into existing objects  */
function restoreInterestingValues(toobj, fromobj) {
    for (let gn in fromobj) {
        const from = fromobj[gn], to = toobj[gn];
        if (typeof from === 'object' && typeof to === 'object') {
            restoreInterestingValues(to, from)
        } else {
            toobj[gn] = from;
        }
    }
}

/** handle new clipboard item seen, add to snippedlocal where if can easily be used
 * note: must 'startWsListener()' so we are listening on server detecting and reporting changes
 */
function newclipboard(newclip) {
    W.snippetlocal.innerHTML = newclip.replaceall('\n', '<br>') + '<br>~~#~~#~~~~~~~~<br>' + W.snippetlocal.innerHTML;
}

/** time a function */
async function timef(fn, n=1, id) {
    console.time(id);
    let v;
    for (let i = 0; i <n; i++) {
        v = fn();
        if (v instanceof Promise) v = await v;
    }
    console.timeEnd(id);
    return v;
}

/** setImmediate shim, needed to allow jszip to work at reasonable speed
 * This must be set up before jszip is loaded,
 * jszip setImmediate shim will see and use this rather than its setTimeout shim
 */
if (!globalThis.setImmediate) {     // may be defined by someone else, or repeat of this shim itself
    const _simchannel = new MessageChannel();
    globalThis.setImmediate = function setImmediate(fun, ...args) {
        // https://stackoverflow.com/questions/61574088/how-to-queue-a-macrotask-in-the-javascript-task-queue
        _simchannel.port1.onmessage = () => fun(...args);
        _simchannel.port2.postMessage('');
    }
    globalThis.clearImmediate = function clearImmediate() {
        serious('Our simple setImmediate shim does not support clearImmediate');
    }
}


var _findvarlist = 'tadkin tad currentGenes U'.split(' ');
/** get variable without knowing source */
function findvar(n, list = _findvarlist) {
    let r;
    // eslint-disable-next-line no-shadow
    for (const hostname of list) {
        const host = globalThis[hostname];
        if (!host) continue;
        if (n in host) {
            if (!r) {
                r = {hostname, host, value: host[n], otherhosts: []}
            } else {
                r.otherhosts.push(hostname);
                if (host[n] !== r.value) {
                    console.log(`warning ${hostname}.${n} = ${host[n]}, ${r.hostname}.${n} = ${r.value}`)
                }
            }
        }
    }
    return r;
}

/** convenient look at property when not sure of host object */
var VV
function _makevv(list = _findvarlist) {
    const x = {};
    // eslint-disable-next-line no-shadow
    for (const hostname of list) Object.assign(x, globalThis[hostname]);

    VV = new Proxy(x, {
        // ???get : (ig, name) => name === 'ownKeys' ? () => Reflect.ownKeys(uniforms) : uniforms[name].value,
        get: (ig, name) => {
            const r = findvar(name, list);
            return r ? r.value : undefined; // could return x[name] rather than undefined, see below
        },
        set: (ig, name, v) => {
            const r = findvar(name, list);
            // We could use 'x' as holder, eg 'VV.fred = 44' would set x.fred=44, and VV.fred would return x.fred=44
            // This is more like a 'pure' javascript object where we can add fields that don't exist,
            // but maybe handy to have it trapped as it is likely to be a debug user error.
            if (!r) throw new Error(`No known findvar host for ${name}`);
            r.host[name] = v;
            return true;
        },    // ?? could set otherhosts values as well?
        // ownKeys : (o) => Array.from(new Set(_findvarlist.map(h => Reflect.ownKeys(globalThis[h])).reduce((c,v) => c.concat(v), [])))
        ownKeys: o => Reflect.ownKeys(x)
     });
}
setTimeout(_makevv, 100);   // defer till tad etc populated

/** make a new property for log value control
obj and prop are the original object and property name
tobj is the object to which to add the new property (default a new object)
and trop the name to give the new property (default same as old name)
return the target object. */
function makeLogval(obj, prop, tobj = {}, tprop = prop) {
    Object.defineProperty(tobj, tprop, {
        get: () => Math.log10(obj[prop]),
        set: v => { obj[prop] = 10**v }
    })
    return tobj;
}

var camera, vec3, camToGenes;
async function multiview(camk, lookat, fit = false) {
    setSize(1920*3, 1080);
    if (fit)
        WA.fitCanvasToWindow();
    else
        await windowset(1920*3, 1080);
    //
    setInput(WA.layoutbox, 1)
    WA.vpborder=0;
    setViewports([3,1]);
    dustbinvp = 99;

    slots[1].dispobj.genes = Object.assign({}, G);
    slots[2].dispobj.genes = Object.assign({}, G);
    // slots[3].dispobj.genes = Object.assign({}, G); // already G, 3 is mainvp so uses currentGenes

    camera.fov = 120/camk;
    camera.near = Math.max(0.1, camk-3);
    camera.far =camk + 5;
    const y = lookat.y;
    camera.position.set(camk, y, 0); camera.updateMatrix(); camera.lookAt(lookat); camToGenes(slots[1].dispobj.genes)
    camera.position.set(0, y, camk); camera.updateMatrix(); camera.lookAt(lookat); camToGenes(slots[2].dispobj.genes)
    camera.position.set(-camk, y, 0); camera.updateMatrix(); camera.lookAt(lookat); camToGenes(slots[3].dispobj.genes)

    slots[1].dispobj.needsRender = slots[2].dispobj.needsRender = slots[3].dispobj.needsRender = 1e30

    // WA.renderObjs = _mutliviewRender;
}

// function _render1(n) {
//     const dobj = slots[n].dispobj;
//     WA.genesToCam(dobj.genes);

//     dobj.needsRender = 1;
//     WA.renderObjsInner(dobj.rt);
//     dobj.needsRender = 0;
//     dobj.needsPaint = true;

// }

// function _mutliviewRender() {
//     G._fov = 6;
//     let g;
//     g = slots[1].dispobj.genes; g._fov = 6; g._camx = _camk; g._camy = 0.9; g._camz = 0;
//     g = slots[2].dispobj.genes; g._fov = 6; g._camx = 0; g._camy = 0.9; g._camz = _camk;
//     g = slots[3].dispobj.genes; g._fov = 6; g._camx = -_camk; g._camy = 0.9; g._camz = 0;
//     _render1(1)
//     _render1(2)
//     _render1(3)
// }

/** set up an object with default value (d default 0) for its fields. Can be based on a 'real' object, o */
function objectWithDefault(d = 0, o = {}) {
    const xx = new Proxy(o, {
        get: (q,n) => n in o ? o[n] : (o[n] = clone(d)),
        set: (q,n,v) => {o[n] = v; return true;},
        ownKeys: () => Object.keys(o)
    })
    return xx;
}

/** make a proxy so assigning a value works by ranp
eg RG =  _R(currentGenes), RG.pullspringforce = 1 will ramp pullspringforce to 1
*/
var _R = function(ooo) {
    return new Proxy(ooo, {
        get: (o,n) => {
            const oo = o[n];
            switch (typeof oo) {
                case 'object': return _R(oo); break;
                case 'number': return oo; break;
                default: if (n !== 'hasOwnProperty') throw new Error('wrong proxy')
            }
        },

        set: (o, n, v) => {
            const oo = o[n];
            switch (typeof oo) {
                // case 'object': return _R(oo); break;
                case 'number': S.ramp(o, n, v, keysdown[0] === 'shift' ? 0.001 : S.rampTime); return true;
                default: throw new Error('wrong proxy')
            }
        }
        });
    }
var R
setTimeout( () => {
    R = _R(globalThis);
    // RG =  _R(G);     // set when currentGenes reset
    // RU = _R(U);      // set when U set
}, 100);


async function BrightonStyle() {
    if (currentGenes.name.includes('tad')) return mutateTad();
    fullscreen();
    setInput(W.dragmode, true);
    setInput(W.hovermode, false);
    setInput(W.showuiover, true);
    setInput(W.animSpeed, 0.3)
    setInput(W.zoomgui, 0) // otherwise scale of all initial mutations is too high

    setInput(W.doAnim, true);
    setInput(W.layoutbox, 2);
    setInput(W.vp86, true);
    await S.frame(10);
    mutate();
}

// // convenient access to overridden inputs
// var Ginputs = new Proxy(inputs,{
//     get: (o, n) => if ('_'+n in o[n].getValue(),
//     set: (o, n, v) => {if (!o[n]) return false; o[n].setValue(v); return true},
//     ownKeys : (o) => Reflect.ownKeys(o)
// });

var shadows, alwaysNewframe, fxaa, renderObjsInner;
/** some tests for possible ways to get faster performance
may also be a useful record of things to try
See also simpleset() in graphbase.ts */
function simpleTest() {
    runkeys('Home')
    shadows(0)
    alwaysNewframe = 1e40
    inps.xzrot = 0.5
    inps.doFixrot = true
    inps.USEGROT = false
    resoverride.lennum=125
    resoverride.radnum=11
    resoverride.skelnum=8

    inps.renderRatioUi = 1
    inps.SIMPLESHADE=true
    fxaa.use = false
    usemask = 1
    // renderObjsInner.direct = true // ??? makes it work on my phone
    renderObjsInner.direct = false // ??? neded for VR
    makevrbutton();

    // n.b. copied from CSynth.js, shortcut for missing experiences.js
    // no, added experiences.js to Oxford; that was a local/Oxford server issue, not a gpu issue
    // WA.V.putinroom = WA.aftercontrol = WA.setDefaultExperiences = WA.rot4toGenes = nop;

    // ?? inps.NOSCALE = inps.NOCENTRE = true
}

var xxvrbutton;
function makevrbutton() {
    const bb = xxvrbutton =  document.createElement('BUTTON');
    document.body.appendChild(bb);
    bb.innerHTML = 'VRBUTTON-2'
    bb.style.cssText = 'left: 0px; position: absolute; top: 80%; width: auto; font-size: 300%; bottom: 0px; z-index: 9999999999'
    bb.onclick = WA.WEBVR.enter
}

/** freeze so basic picture does not move, eg for comparing snapshots with different pipelines */
function freezeLots() {
    alwaysNewframe = Infinity;
    inps.grot = 0;
    inps.doAutorot = false;
    G._fixtime = G.time = 99;
    setAllLots('_pulsescale', 0);

    const old = Object.assign({}, G);
    setTimeout(() => log('G change', objdiff(old, G)), 500);

}

/** run a command from php, if quiet is specified (non false) it is run async and so return,
and if 'quiet' is a function, it will be called on completion with the response text.
If there is an async error reject will be called if present, or flagged quiet if no reject
quiet=false => sync, no message, return value
quiet=undefined => sync, message, return value
  */
function runcommandphp(cmd, quiet, reject) {
    if (oxcsynth && !islocalhost && cmd.indexOf('--query-gpu') === -1 && cmd.indexOf('mkdir') === -1
         && cmd.indexOf('exportShader') === -1)
        serious('runcommandphp should not be called in oxcsynth mode');
    if (!islocalhost)
        console.error('runcommandphp called in nonlocal', cmd)
    if (isNode()) {
        try {
            if (quiet) {
                if (typeof quiet === 'function')
                    return require('child_process').exec(cmd, quiet).toString();
                else
                    return require('child_process').exec(cmd).toString();
            } else {
                const r = require('child_process').execSync(cmd).toString();  // << correct for async
                return r;
            }
        } catch(e) {
            log('runcommandphp error', e.message, cmd);
            return undefined;
        }
    }
    //TODO: probably use fetch() instead.
    const oReq = new XMLHttpRequest();
    oReq.open("POST", "runcmd.php", !!quiet);
    oReq.setRequestHeader("cmd", cmd);
    oReq.send("");
    if (typeof quiet === 'function') {
        oReq.onload =  function(e) {
            if (oReq.status === 200)
                quiet(oReq.responseText);
            else if (reject)
                reject(oReq.status + ' ' +  oReq.statusText);
            else
                quiet('!!!!!!! ERROR RETURN ' + oReq.status);
        };
        return oReq;  // in case caller wants to check details on callback
    }
    if (!quiet) {   // note, quiet === 0 will return but NOT log
        if (quiet === undefined) {
            log("runcommandphp", cmd, "response text", oReq.responseText.substring(0,50));
        }
        return oReq.responseText;
    }
}

let _copyTextureToRenderTargetMesh, _copyTextureToRenderTargetScene;
/** copy texture/renderTargets, I still find it odd the direct renderer.copyTextureToTexture doesn't work */
function copyTextureToRenderTarget(from, to) {
    if (from.texture) from = from.texture;
    if (!_copyTextureToRenderTargetScene) {
        const planeGeom = new THREE.PlaneGeometry(2, 2);
        // const planeMat = new THREE.MeshBasicMaterial();
        const planeMat = new THREE.RawShaderMaterial({
            uniforms: { intex: { value: undefined, type: 't' } },
            vertexShader: `#version 300 es
                precision highp float;
                in vec3 position;
                void main() {
                    gl_Position = vec4( position, 1.0 );
                }`,
            fragmentShader: `#version 300 es
                precision highp float;
                uniform sampler2D intex;
                out vec4 glFragColor;
                void main() {
                    glFragColor = texelFetch(intex, ivec2(gl_FragCoord.xy), 0);
                }`
        });
        planeMat.depthTest = false;
        planeMat.depthWrite = false;
        _copyTextureToRenderTargetMesh = new THREE.Mesh(planeGeom, planeMat);
        _copyTextureToRenderTargetScene = new THREE.Scene();
        _copyTextureToRenderTargetScene.add(_copyTextureToRenderTargetMesh);

    }
    _copyTextureToRenderTargetMesh.material.uniforms.intex.value = from;
    const simpleCam = new THREE.Camera();       // Create simplest camera, not used, three.js placebo
    rrender('copytex', _copyTextureToRenderTargetScene, simpleCam, to);
}


function catrom(t, y0, y1, y2, y3) {
    const r = 0.5 *(  	(2 * y1) +
            (-y0 + y2) * t +
            (2*y0 - 5*y1 + 4*y2 - y3) * t*t +
            (-y0 + 3*y1- 3*y2 + y3) * t*t*t);
    return r;
}


var compareStrings = function compareStrings(a, b) {
    if (typeof a === 'object') a = JSON.stringify(a, undefined, '\t');
    if (typeof b === 'object') a = JSON.stringify(b, undefined, '\t');
    const fida = 'temp\\a.txt', fidb = 'temp\\b.txt';
    writetextremote(fida, a);
    writetextremote(fidb, b);
    runcommandphp(`"C:\\Program Files (x86)\\Beyond Compare 3\\BCompare.exe" ${fida} ${fidb}`);
}

/** show uniforms of unexpected type, prep for NFT mincode */
function showOddUniforms() {
    for (let n in uniforms) { let u = uniforms[n], v = u.value; if (v && typeof v !== 'number' && !v.isVector2 && !v.isVector3 && !v.isVector4 && !v.isTexture && !v.isMatrix4 && n !== 'dynUniforms') log(n, v) }
}

function home(pdispobj) {
    const dispobj = xxxdispobj(pdispobj);
    const genes = dispobj?.genes;
    if (!genes) return;
    centrescalenow(dispobj);
    genes._uScale = 1;
    resetCamera(genes);
    delete target.gscale;
    dispobj.render();
    if (isCSynth) CSynth.autoscale();
    return true;
}

/* group array or object by result of function, eg
groupby(genedefs, g => g.tag)
*/
function groupby(sp, ff) {
    const p = Array.isArray(sp) ? sp : Object.values(sp)
    const r = p.reduce((c,v) => {
        c[v.tag] = c[v.tag] ?? []
        c[v.tag].push(v)
        return c;
    }, {})
    return r;
}

/** compare two structures, with tolerance
 * no specific check for orphan fields
*/
function compareStruct(a,b, opts = {}) {
    const {d=1e-5, exclude = {}, ignoreundefined = false, ignoreundefinedleft =  false, ignoreundefinedright = false } = opts;
    const r = {};
    if (a === undefined && (ignoreundefined || ignoreundefinedleft)) return r;
    if (b === undefined && (ignoreundefined || ignoreundefinedright)) return r;
    for (const gn in a) {
        if (exclude[gn]) continue;
        if (a[gn] === undefined && (ignoreundefined || ignoreundefinedleft)) continue;
        if (b[gn] === undefined && (ignoreundefined || ignoreundefinedright)) continue;
        if (typeof a[gn] !== typeof b[gn]) {
            r[gn] = {a: a[gn], b: b[gn]}
        } else if (typeof a[gn] === 'object') {
            const rr = compareStruct(a[gn], b[gn], opts);
            for (const k in rr) {r[gn] = rr; break; }  // only register if there is at least on element k in rr
        } else if (typeof a[gn] === 'number') {
            if (Math.abs(a[gn] - b[gn]) > d)
                r[gn] = {a: a[gn], b: b[gn]}
        } else if (a[gn] != b[gn]) {
            r[gn] = {a: a[gn], b: b[gn]}
        }
    }
    return r;
}

function signpow(v, p) { return Math.sign(v) * Math.abs(v) ** p; }

async function reviewmask() {
    for (usemask of [0, 1, 1.5, 2]) {
        log('usemask = ', usemask);
        await S.frame(20)
        log('usemask = ', usemask);
        await sleep(2000)
    }
}

function fieldsFrom(o, list) {
    if (typeof list === 'string') list = list.split(' ')
    return list.reduce((c, v) => {c[v] = o[v]; return c;}, {});
}

function mat3(...e) {
    const x = new THREE.Matrix3();
    if (e.length === 0) {
        //
    } else if (Array.isArray(e[0])) {
        x.elements.set(...e[0])
    } else {
        x.elements.set(...e)
    }
    return x;
}

function mat4(...e) {
    const x = new THREE.Matrix4();
    if (e.length === 0) {
        //
    } else if (Array.isArray(e[0])) {
        x.elements.set(...e[0])
    } else {
        x.elements.set(...e)
    }
    return x;
}

var debugframedelta, resetDebugstats;
/** callibrate the GPU using recent from history */
function callibrateGPU({targtime = 35, repeat = 4} = {}) {
    // if (framenum < 110) debugframedelta = debugframedelta.slice(10); // not needed?
    const slow = debugframedelta.reduce((c,v) => c + (v>targtime), 0 ) / debugframedelta.length;
    if (slow > 0.25) {
        inps.renderRatioUi = 1;
        inps.renderRatioUiProj =  inps.renderRatioUiMain = 0;
        resoverride.lennum = Math.max(U.lennum * 0.5, 25);
        resoverride.radnum = Math.max(U.radnum * 0.5, 4);
        resetDebugstats();
        msgfixlog('callibrateGPU', resoverride, 'rr', inps.renderRatioUi);
        if (repeat > 0) onframe(() => callibrateGPU({targtime, repeat: repeat-1}), 25);
        return;
    }
    log('callibrateGPU', 'OK');
}


/** Generalized Hilbert ('gilbert') space-filling curve for arbitrary-sized
   2D rectangular grids.
   hfrom ttps://stackoverflow.com/questions/38463130/hilbert-peano-curve-to-scan-image-of-arbitrary-size

   n.b. filter from power 2 'standard' curve gives jumps, eg
       gilbert2d(8,8).filter( ([x,y]) => x < 5 && y < 3).map((v,i,a) => i === 0 ? 0 : (v[0]-a[i-1][0])**2 + (v[1]-a[i-1][1])**2)
    This is OK
        gilbert2d(5,3).map((v,i,a) => i === 0 ? 0 : (v[0]-a[i-1][0])**2 + (v[1]-a[i-1][1])**2)
    ...
    3d available in Python at https://github.com/jakubcerveny/gilbert/blob/master/gilbert3d.py
**/
function gilbert2d(x, y, ax, ay, bx, by, p) {
    if (ax === undefined) return x >= y ? gilbert2d(0, 0, x, 0, 0, y, []) : gilbert2d(0, 0, 0, y, x, 0, [])


    const w = Math.abs(ax + ay);
    const h = Math.abs(bx + by);
    const sgn = Math.sign;

    const dax = sgn(ax), day = sgn(ay); // unit major direction
    const dbx = sgn(bx), dby = sgn(by); // unit orthogonal direction

    if (h === 1) {  // trivial row fill
        for (let i = 0; i < w; i++) {
            p.push([x,y])
            x += dax; y += day;
        }
        return;
    }

    if (w == 1) { // trivial column fill
        for (let i = 0; i < h; i++) { // i in range(0, h):
            p.push([x,y])
            x += dbx; y += dby; // (x), y) = (x + dbx, y + dby)
        }
        return;
    }
    const fl = Math.floor;
    let ax2 = fl(ax/2), ay2 = fl(ay/2); // (ax2, ay2) = (ax/2, ay/2)
    let bx2 = fl(bx/2), by2 = fl(by/2); // (bx2, by2) = (bx/2, by/2)
    const w2 = Math.abs(ax2 + ay2)
    const h2 = Math.abs(bx2 + by2)

    if (2*w > 3*h) {
        if (w2 % 2 && w > 2) { // prefer even steps
            ax2 += dax; ay2 += day; // (ax2, ay2) = (ax2 + dax, ay2 + day)
        }

        // long case: split in two parts only
        gilbert2d(x, y, ax2, ay2, bx, by, p)
        gilbert2d(x+ax2, y+ay2, ax-ax2, ay-ay2, bx, by, p)

    } else {
        if (h2 % 2 && h > 2) { // prefer even steps
            bx2 += dbx; by2 += dby; //  (bx2, by2) = (bx2 + dbx, by2 + dby)
        }

        // standard case: one step up, one long horizontal, one step down
        gilbert2d(x, y, bx2, by2, ax2, ay2, p)
        gilbert2d(x+bx2, y+by2, ax, ay, bx-bx2, by-by2, p)
        gilbert2d(x+(ax-dax)+(bx2-dbx), y+(ay-day)+(by2-dby), -bx2, -by2, -(ax-ax2), -(ay-ay2), p)
    }
    return p;
}

// def main():
//     width = int(sys.argv[1])
//     height = int(sys.argv[2])

//     if width >= height:
//         gilbert2d(0, 0, width, 0, 0, height)
//     else:
//         gilbert2d(0, 0, 0, height, width, 0)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*** converted from https://github.com/jakubcerveny/gilbert/blob/master/gilbert3d.py
 * by https://www.codeconvert.ai/app
 *
BSD 2-Clause License

Copyright (c) 2018, Jakub Červený
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
// eslint-disable-next-line no-shadow
function* gilbert3d(width, height, depth) {

    if (width >= height && width >= depth) {
        yield* generate3d(0, 0, 0,
                          width, 0, 0,
                          0, height, 0,
                          0, 0, depth);
    } else if (height >= width && height >= depth) {
        yield* generate3d(0, 0, 0,
                          0, height, 0,
                          width, 0, 0,
                          0, 0, depth);
    } else {
        yield* generate3d(0, 0, 0,
                          0, 0, depth,
                          width, 0, 0,
                          0, height, 0);
    }

function sgn(x) {
    return x < 0 ? -1 : (x > 0 ? 1 : 0);
}

function* generate3d(x, y, z,
                    ax, ay, az,
                    bx, by, bz,
                    cx, cy, cz) {
    const w = Math.abs(ax + ay + az);
    const h = Math.abs(bx + by + bz);
    const d = Math.abs(cx + cy + cz);
    const dax = sgn(ax);
    const day = sgn(ay);
    const daz = sgn(az);
    const dbx = sgn(bx);
    const dby = sgn(by);
    const dbz = sgn(bz);
    const dcx = sgn(cx);
    const dcy = sgn(cy);
    const dcz = sgn(cz);

    if (h === 1 && d === 1) {
        for (let i = 0; i < w; i++) {
            yield {x, y, z};
            x += dax;
            y += day;
            z += daz;
        }
        return;
    }
    if (w === 1 && d === 1) {
        for (let i = 0; i < h; i++) {
            yield {x, y, z};
            x += dbx;
            y += dby;
            z += dbz;
        }
        return;
    }
    if (w === 1 && h === 1) {
        for (let i = 0; i < d; i++) {
            yield {x, y, z};
            x += dcx;
            y += dcy;
            z += dcz;
        }
        return;
    }
    let ax2 = Math.floor(ax / 2);
    let ay2 = Math.floor(ay / 2);
    let az2 = Math.floor(az / 2);
    let bx2 = Math.floor(bx / 2);
    let by2 = Math.floor(by / 2);
    let bz2 = Math.floor(bz / 2);
    let cx2 = Math.floor(cx / 2);
    let cy2 = Math.floor(cy / 2);
    let cz2 = Math.floor(cz / 2);
    const w2 = Math.abs(ax2 + ay2 + az2);
    const h2 = Math.abs(bx2 + by2 + bz2);
    const d2 = Math.abs(cx2 + cy2 + cz2);

    if (w2 % 2 && w > 2) {
        ax2 += dax;
        ay2 += day;
        az2 += daz;
    }
    if (h2 % 2 && h > 2) {
        bx2 += dbx;
        by2 += dby;
        bz2 += dbz;
    }
    if (d2 % 2 && d > 2) {
        cx2 += dcx;
        cy2 += dcy;
        cz2 += dcz;
    }

    if (2 * w > 3 * h && 2 * w > 3 * d) {
        yield* generate3d(x, y, z,
                          ax2, ay2, az2,
                          bx, by, bz,
                          cx, cy, cz);
        yield* generate3d(x + ax2, y + ay2, z + az2,
                          ax - ax2, ay - ay2, az - az2,
                          bx, by, bz,
                          cx, cy, cz);
    } else if (3 * h > 4 * d) {
        yield* generate3d(x, y, z,
                          bx2, by2, bz2,
                          cx, cy, cz,
                          ax2, ay2, az2);
        yield* generate3d(x + bx2, y + by2, z + bz2,
                          ax, ay, az,
                          bx - bx2, by - by2, bz - bz2,
                          cx, cy, cz);
        yield* generate3d(x + (ax - dax) + (bx2 - dbx),
                          y + (ay - day) + (by2 - dby),
                          z + (az - daz) + (bz2 - dbz),
                          -bx2, -by2, -bz2,
                          cx, cy, cz,
                          -(ax - ax2), -(ay - ay2), -(az - az2));
    } else if (3 * d > 4 * h) {
        yield* generate3d(x, y, z,
                          cx2, cy2, cz2,
                          ax2, ay2, az2,
                          bx, by, bz);
        yield* generate3d(x + cx2, y + cy2, z + cz2,
                          ax, ay, az,
                          bx, by, bz,
                          cx - cx2, cy - cy2, cz - cz2);
        yield* generate3d(x + (ax - dax) + (cx2 - dcx),
                          y + (ay - day) + (cy2 - dcy),
                          z + (az - daz) + (cz2 - dcz),
                          -cx2, -cy2, -cz2,
                          -(ax - ax2), -(ay - ay2), -(az - az2),
                          bx, by, bz);
    } else {
        yield* generate3d(x, y, z,
                          bx2, by2, bz2,
                          cx2, cy2, cz2,
                          ax2, ay2, az2);
        yield* generate3d(x + bx2, y + by2, z + bz2,
                          cx, cy, cz,
                          ax2, ay2, az2,
                          bx - bx2, by - by2, bz - bz2);
        yield* generate3d(x + (bx2 - dbx) + (cx - dcx),
                          y + (by2 - dby) + (cy - dcy),
                          z + (bz2 - dbz) + (cz - dcz),
                          ax, ay, az,
                          -bx2, -by2, -bz2,
                          -(cx - cx2), -(cy - cy2), -(cz - cz2));
        yield* generate3d(x + (ax - dax) + bx2 + (cx - dcx),
                          y + (ay - day) + by2 + (cy - dcy),
                          z + (az - daz) + bz2 + (cz - dcz),
                          -cx, -cy, -cz,
                          -(ax - ax2), -(ay - ay2), -(az - az2),
                          bx - bx2, by - by2, bz - bz2);
        yield* generate3d(x + (ax - dax) + (bx2 - dbx),
                          y + (ay - day) + (by2 - dby),
                          z + (az - daz) + (bz2 - dbz),
                          -bx2, -by2, -bz2,
                          cx2, cy2, cz2,
                          -(ax - ax2), -(ay - ay2), -(az - az2));
    }
}
}

// function testgilbert3d(width, height, depth)
// const args = process.argv.slice(2);
// const width = parseInt(args[0]);
// const height = parseInt(args[1]);
// const depth = parseInt(args[2]);

// for (const [x, y, z] of gilbert3d(width, height, depth)) {
//     console.log(x, y, z);
// }


