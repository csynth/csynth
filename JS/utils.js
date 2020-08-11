/** various javascript utilities */
'use strict';
// vars for
var screens, W = window, opmode, HTMLElement, HTMLDocument, HTMLTextAreaElement,
    UICom, require, process, lastdocx, lastdocy, framedelta, Maestro, loadStartTime, oplist, frametime, currentGenes,
    THREE, slots, mainvp, rendertargets, oldlayerX, oldlayerY, height, width, yaml, jsyaml, detectWebGL, confirm, uniforms, evalIfPoss,
    framenum, XMLHttpRequest, setval, location, isNode, savedef, localStorage, FileReader, onWindowResize,
    refreshGal, domtoimage, Image, readWebGlFloat, refall, vps, setViewports, Audio, newframe,
    setSize, CSynth, screen, exportmyshaders, Math,
    genedefs, framelog, dockeydowninner, setAllLots, material, usesavedglsl, remakeShaders, Shadows,
    throwq, oxcsynth, performance, setshowstats, showControls, VUMeter2, DispobjC, orginit, requestAnimationFrame,
    getMaterial, OPPOSITION, OPOPOS, OPMAKESKELBUFF, OPSHADOWS, OPSHAPEPOS, OPTEXTURE, OPTSHAPEPOS2COL,
    rca, canvas, testmaterial, startvr, interpretSearchString, appToUse,
    searchValues, filterGuiGenes, $, runTimedScript, inworker, serious, loadTime, loadTimes, _insinit, isFirefox,
    ErrorEvent, animateNum, dustbinvp, testopmode, runcommandphp, S, sclogE, sclog, islocalhost, dataURItoBlob, saveAs, GX
    ;

// convenience function to find dom element, W. sometimes failed at very start
// really const, but var makes it easier to share
var DE = new Proxy(window, { get: (w, name) => document.getElementById(name) } );

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
/** extra globals since start */
function xGlobals(base = initGlobals) {
    var r = snapGlobals();
    for (var v in r) if (v in base) delete r[v];
    return r;
}
/** number of extra globals */
function countXglobals() {
    return Object.keys(xGlobals()).length;
}

var keymap = {
    8: "backspace", 9: "tab", 13: "enter", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause/break",
    20: "caps lock", 27: "escape", 33: "page up", 34: "page down", 35: "end", 36: "home", 37: "left arrow",
    38: "up arrow", 39: "right arrow", 40: "down arrow", 45: "insert", 46: "delete", 91: "left window",
    92: "right window", 93: "select key", 96: "numpad 0", 97: "numpad 1", 98: "numpad 2", 99: "numpad 3",
    100: "numpad 4", 101: "numpad 5", 102: "numpad 6", 103: "numpad 7", 104: "numpad 8", 105: "numpad 9",
    106: "multiply", 107: "add", 109: "subtract", 110: "decimal point", 111: "divide", 112: "F1", 113: "F2",
    114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11",
    123: "F12", 144: "num lock", 145: "scroll lock", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".",
    191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 32: "space"
    // 222: "#", # uk ' us?
};

(function () {
    for (var i = 65; i <= 90; i++) keymap[i] = String.fromCharCode(i);
    for (i = 48; i <= 57; i++) keymap[i] = String.fromCharCode(i);
})();

function keyname(k) {
    if (keymap[k]) return keymap[k];
    return '#' + k;
}
String.prototype.replaceall = function (a, b) { return this.split(a).join(b); };  // convenience function

function nop() { }

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
    if (arguments[0] === "THREE.WebGLRenderer") return;
    //pjt was getting console.oldLog undefined in debugging, so put in this check...
    if (!console.oldLog && console !== firstConsole) throwe("node / webkit context confusion?");
    var lmsg = showvals.apply(undefined, arguments);
    var ncontime = Date.now();
    let deltat = ncontime - contime;
    if (deltat > 100) deltat += '!!!!!!';
    console.oldLog(' ' + framenum + '/' + ((ncontime - loadStartTime)/1000).toFixed(3) + "+" + deltat + ": " + lmsg);
    contime = ncontime;
    return lmsg;
};
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
function showvals() {
    //if (!typeof s === "string") return s;
    //var ss = s.split("$");
    var sss = arguments;
    var r = "";
    for (var j = 0; j < sss.length; j++) {
        var ss = sss[j];
        if (typeof ss === "string") {
            var s = ss.split('$');
            for (var i = 1; i < s.length; i += 2) {
                // like qget, but with tags
                if (s[i] in inputs)             s[i] = "I." + s[i] + "=" + format(inputs[s[i]]);
                else if (s[i] in currentGenes)  s[i] = "G." + s[i] + "=" + format(currentGenes[s[i]]);
                else if (s[i] in W) s[i] =      s[i] = "W." + s[i] + "=" + format(W[s[i]]);
                else if (s[i] in uniforms)      s[i] = "U>" + s[i] + "=" + format(uniforms[s[i]].value);
                else                            s[i] =        s[i] + '=' + format(evalIfPoss(s[i]));
            }
            sss[j] = s.join(" ");
        } else if (ss && ss.toString()[0] === '/') {  // regex
            sss[j] = ss.toString();
        } else { // if (typeof ss === "object") {
            //sss[j] =  this && this !== W ? this(ss) : objstring(cloneNoCircle(ss));
            sss[j] = "" + format(ss);
        }
        r += sss[j] + " ";
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
    if (pn === undefined) return false;
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
function offx(evt) {
    // handle mouse events, raw touch events and both kinds of hammer events
    // var mmm = msgfix('mouse', 'clientX', evt.clientX, 'screenX', evt.screenX, 'offsetX', evt.offsetX, 'pageX', evt.pageX, 'offl', evt.target.offsetLeft, 'offa', offa);
    if (evt.myx !== undefined) return evt.myx;  // for simulated event
    if (evt.targetTouches) evt = evt.targetTouches[0];
    else if (evt.gesture) evt = evt.gesture.touches[0];
    else if (evt.touches) evt = evt.touches[0];
    var off = evt.offsetX;
    var offa = evt.pageX - evt.target.offsetLeft;
    if (off && Math.abs(off - offa) > 1)
        msgfix("offX difference", off, offa, 'offx='+evt.offsetX, 'cliX='+evt.clientX, 'pageX='+evt.pageX);
    //console.log("xoff " + offa);
    var se = evt.target;
    if (/* se === canvas && */ se.width && se.style.width.endsWith('px')) {
        const r = se.width / se.style.width.replace('px', '');
        offa *= r;
        off *= r;
    }
    return off;
}

/** get Y offset of event, compensate for canvase style sixing if needed */
function offy(evt) {
    // handle raw touch events and both kinds of hammer events
    if (evt.myy !== undefined) return evt.myy;  // for simulated event
    if (evt.targetTouches) evt = evt.targetTouches[0];
    else if (evt.gesture) evt = evt.gesture.touches[0];
    else if (evt.touches) evt = evt.touches[0];
    var off = evt.offsetY;
    var offa = evt.pageY - evt.target.offsetTop;
    //if (off  && off !== offa)
    //    console.log("offY difference");
    var se = evt.target;
    if (/* se === canvas && */ se.height && se.style.height.endsWith('px')) {
        const r = se.height / se.style.height.replace('px', '');
        off *= r;
        offa *= r;
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
            mset.xclass = xclassi + (dyn ? ' dynmsg ' : ' staticmsg ');
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
    arguments[0] = '>' + arguments[0]; //msgfix.all = true;
    return msgfix.apply(undefined, arguments);
    // log.apply(undefined, arguments);
}
msgfixerror.count = 0;

/** do a messagefix and log it too */
function msgfixlog() {
    msgfix.apply(undefined, arguments);
    return log.apply(undefined, arguments);
}

function msgboxVisible(flag = 'toggle') {
    const msgbox = W.msgbox;
    function hide() {
        msgboxVisible.save = [msgbox.style.width, msgbox.style.height];
        msgbox.style.width = '5em'; msgbox.style.height = '1em';
        msgbox.style.overflow = 'hidden';
    }
    function show() {
        if (msgbox.style.overflow === 'auto') return;;
        [msgbox.style.width, msgbox.style.height] = msgboxVisible.save;
        msgbox.style.overflow = 'auto';
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

    let s = e.srcElement;

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
                delete msgfix.not[e.srcElement.textContent.trim()]; // click on a subelement of msgfix.key, restore it
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
    W.msgfix_messages.innerHTML = hid;
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
    if (W.msgbox.style.overflow === 'hidden') return;
    // if (msgfix.updatebits) return;
    if (ss) serious('msg should not be called with argments, use msgfix');

    const deadlist = [];
    for (let i in msgset) {
        const mset = msgset[i];
        if (mset.dead) { deadlist.push(i); continue; }
        if (msgfix.not[i] === true) { if (mset.htmlo) mset.htmlo.style.display = 'none'; continue; }
        const val = typeof mset.val === 'function' ? format(mset.val()) :
            mset.args ? showvals.apply(htmlformat, mset.args).substring(i.length + 1) : mset.val;

        if (!mset.htmlo) {
            let htmlo;
            if (i === msgfix.key)
                htmlo =
// html for top message
`<span>
    <span id="msgfixo_${i}" class="${mset.xclass}">
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
    <span id="msgfixo_${i}" class="${mset.xclass}">
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

/** copy fields of object into another, ??? shoud this use clone for deeper copy ??? */
function copyFrom(obj1, obj2) {
    if (obj1 === obj2) return;  // not just optimization, it was damaging for _rot4_ele
    for (var gn in obj2) {
        if (gn === "_rot4_ele") {             // very poor hack ....
            obj1[gn] = [];
            copyFrom(obj1[gn], obj2[gn]);
        } else {
            obj1[gn] = obj2[gn];
        }
    }
    return obj1;
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

/** clone object */
function clone(obj) {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    var s;
    try {
        s = JSON.stringify(obj);
        return JSON.parse(s);
    } catch (e) {
        console.error("Clone error for " + obj + ": " + e);
        return cloneNoCircle(obj);
    }
}

/** map the classes that might be needed by xstring.
In fact, as at 23 April 2015 Dispobj is the only class needed,
and as long as a load has been performed, Dispobj will be already set up
 */
function mapOnce() {
    if (!xclasses.Dispobj || !xclasses['HornWrap.Horn']) {  // Dispobj sometimes creeps in during load so check Hornwrap.Horn as well
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

// xclasses keeps a map from class name to prototype.
// The reverse map is help by a CLASSNAME (#clname) property held in the prototype
// This may be set up by explicit calls, or using mapclasses() to map them automatically.
// The CLASSNAME property is used by xstring to save the class information as a string.
// The xclasses map and saved CLASSNAME are used by dstring to restore appropriate prototype information.

var xclasses = {};  // extra classes, map from class name to prototype
var xconstructors = {};  // extra constructors,  map from class name to constructor
/** defined a class name/proto combination for serialization */
function xclass(name, proto) {
    if (proto === undefined) {
        proto = www(name).prototype;
    }
    proto[CLASSNAME] = name;
    xclasses[name] = proto;
    xconstructors[name] = proto.constructor;
}

var saveconwarn;
function myconwarn(msgp) { if (!msgp.startsWith("DEPRECATED:")) saveconwarn(msgp); }
var CLASSNAME = '#clname';
var VISITED = '#visited';      // visited as object
var VISITEDP = '#visitedp';    // visited as prototype
var visitnum = 0;               // mark which visit (debug helper)

/** Map all the classes to create xclasses and help correct serialization
 * Usually only called once per session, but visit number held in case (eg during debug)
 *
 * Recursively visit all objects, marking them with property #visisted.
 * Place a hidden property #clname in each 'interesting' prototype, and save name in xclasses.
 * Clean all #visited tags at end.
 * @param {type} options map
    root: root object to map
    name: name of root
    noreset: set to prevent clearing of xclasses at start
    ignoreclasses: array of classes to ignore on mapping
 * @returns {undefined}
 */
function mapclasses(options) {
    if (!options) options = {};
    var o = options.root ? options.root : W;
    var name = options.rootname ? options.rootname : "";
    if (!options.noreset) xclasses = {};
    var ignoreclasses = options.ignoreclasses ? options.ignoreclasses : [HTMLElement, HTMLDocument];
    var ignoreprefixes = options.ignoreprefixes ? options.ignoreprefixes : [];

    visitnum++;
    saveconwarn = console.warn;
    console.warn = myconwarn;
    var polluted = [];
    try {
        mapclassesi(o, name);
    } finally {
        // until we find out how to manage Class
        xclasses.Dispobj = DispobjC.prototype;
        xconstructors.Dispobj = DispobjC.prototype.constructor;
        DispobjC.prototype[CLASSNAME] = 'Dispobj';

        console.log("mapclasses found " + Object.keys(xclasses).length + " classes.");
        console.warn = saveconwarn;
        for (var i in polluted) {
            let oo = polluted[i];
            try {  // sometimes fails on IE
                delete oo[VISITED];
                delete oo[VISITEDP];
            } catch (e) {

            }
        }
    }

    // internal function called recursively */
    function mapclassesi(oi, namei) {
        try {
            if (namei.split('.').length > 4) return;
            if (namei[0] === '.') namei = namei.substring(1);
            if (oi === undefined) return;
            if (oi === null) return;
            if (oi === xclasses) return;
            var t = typeof oi;
            if (t === "number" || t === "string" || t === "boolean") return;
            if (!oi.hasOwnProperty) return;  // IE seems to require this for some very simple objects ?
            for (var ig = 0; ig < ignoreclasses.length; ig++) if (oi instanceof ignoreclasses[ig]) return;
            for (ig = 0; ig < ignoreprefixes.length; ig++) if (namei.startsWith(ignoreprefixes[ig])) return;
            if (Array.isArray(oi) && oi.length > 100) return;  // against very long arrays, eg data buffers, hope none contain useful classes to map

            var proto = oi.prototype;
            var isclass = proto && Object.keys(proto).length !== 0;

            if (Object.prototype.hasOwnProperty.call(oi, VISITED) && oi[VISITED] === visitnum) {
                if (isclass)
                    console.oldLog("no remap " + proto[CLASSNAME] + " = = = " + namei); // oldLog to prevent formatting exception with $
                return;
            }
            oi[VISITED] = visitnum; polluted.push(oi);

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
                    if (Object.prototype.hasOwnProperty.call(proto, VISITEDP) && proto[VISITEDP] === visitnum) {
                        console.log("duplicate name for class " + proto[CLASSNAME] + " ~~ " + namei);
                    } else {
                        proto[VISITEDP] = visitnum;
                        polluted.push(proto);
                        Object.defineProperty(proto, CLASSNAME, { enumerable: false, writable: true });
                        proto[CLASSNAME] = namei;
                        xclasses[namei] = proto;
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
    var cache = [];
    var polluted = [];
    var jj = JSON.stringify(o,
        function (key, value) {
            for (var ig = 0; ig < ignoreclasses.length; ig++) if (value instanceof ignoreclasses[ig]) return undefined;

            if (typeof value === 'object' && value !== undefined && value !== null) {
                var xref = value['#k'];   // was cache.indexOf(value)
                if (xref !== undefined) { // Circular reference found
                    return { "#xref": xref };
                }
                if (value && typeof value === 'object') {  // first visit to object
                    if (!value.__proto__) return undefined;   // happened for EventHandlers
                    polluted.push(value);
                    //Object.defineProperty(value, '#k', { enumerable: true, writable: true});
                    value['#k'] = cache.length;
                    if (value.__proto__[CLASSNAME]) {
                        //Object.defineProperty(value, '##c', { enumerable: true, writable: true});
                        value['##c'] = value.__proto__[CLASSNAME];
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

/** get the contructor for a string classname  */
function getConstructor(classname) {
    if (classname === 'Dispobj') return DispobjC.prototype.constructor; // until we find out how to manage Class
    const path = classname.split('.');
    let cl = window;
    path.forEach(p => cl = cl[p]);
    return cl;
}

/** parse JSON with classes and circular/duplicate references
Remove pollution as we go.
There are two distinct cases:
    yaml: the circular/duplicate references are dealt with by yaml
    json: we must handle the circular/duplicate references (#k and #xref fields)
In either case we must handle the class object details (#cc field)
*/
function dstring(ostr) {
    // mapOnce();  // no longer needed, we compute contructors using getConstructor()
    var str = ostr;

    // to consider, should refmap be integrated into reviver ???
    var reviver = (key, value) => key === 'frameSaver' && !nwfs ? undefined : value; // TODO generalize or ...??? stephen 21/01/2017
    //    var o = JSON.parse(str, reviver);
    let obj;
    if (yaml)
        obj = yaml.safeLoad(str);
    else
        obj = JSON.parse(str, reviver);

    const map = {};               // map from #k to (possibly transformed) object
    var polluted = [];          // list of polluted objects
    var maxd = 0;               // depth control
    var visited = new Set();    // visited objects, to stop visit recursion
    refmap(obj, 0);          // pass to recreate ref map
    if (olength(map))
        repmap(obj, 0);      // map in the duplicate references, does not apply to yaml
    // log ('dstring maxd', maxd);

    /***
    // some debug tests to remove soon after Aug 2017 >>>> TODO
    if (obj.genes.name === 'startup' && (obj.slots[0].dispobj !== obj.currentObjects.do_8
        || !obj.currentObjects.do_8.renew))
        console.error('bad load of startup data, classed objects');
    if (obj.genes.name === 'startup' && obj.slots[0].dispobj.genes !== obj.genes)
        console.error('bad load of startup data, nonclassed objects');
    ***/


    return obj;

    // make a map of all object references,
    // and add class information from xclasses, and call their Init() function if present
    function refmap(o, d) {
        if (o === null) return;
        if (typeof o !== 'object') return o;    // why did I not have that before???

        // for yaml, which has already expeanded circular references
        if (o['#replaced'])                     // revisit to yaml class object
            return o['#replaced'];              //
        if (visited.has(o)) return o;           // revisit to yaml non-call object
        visited.add(o);

        // first pass attempt to fix up #k/#xref,
        // only applies to json where we have managed duplicate references
        // will not be robust if iteration order switches and #xref seen before #k
        // so leave to second pass
        // const key = o['#k'] || o['#xref'];
        // if (key && map[key]) {
        //    log ('revisit for', o['#k'], o['#xref'], map[key] )
        //    return (map[key]);
        // }

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
                    // o[i] will change when a #cc Class object is replaced by a new Class object
                    o[i] = refmap(o[i], map, d + 1);
                    // o = o;  // debug
                }

            // make an object of the correct class if such a class is defined
            const classname = o['##c'];
            if (classname) {
                //PJT when loading CSynth from website in Safari, I was seeing this fail to as lots of things had 'initGlobals.' prepended to name...
                //(as of this writing, the server isn't running on my dev machine for some reason, so not tested this change...)
                // const cl2 = xclasses[classname] ? xclasses[classname] : xclasses['initGlobals.' + classname];
                let con2 = xconstructors[classname];
                if (!con2) con2 = xconstructors[classname] = getConstructor(classname);
                if (!con2) serious('no constructor found for class', classname);
                const newo = new con2();       // we have found the class, make a new objects
                /*****~~~~~~~~~~~~~~ use constructor instead, no longer needed **** /
                // dead __proto__ code to remove Sept 2017 >>> TODO
                // iterate ##c value to find the class, eg Dispobj or THREE.Vector2
                let cl=window;
                const kk = classname.split('.');
                for (let ki=0; ki<kk.length; ki++) cl = cl[kk[ki]];
                if (!cl) {
                    cl=eval(classname);  // catch class such as class Dispobj, does not exist as window.Dispobj
                }
                if (!cl) serious('Cannot resolve class for', classname)
                if (cl !== cl2)
                    log('differing opinion on object constructor', cl.name, cl2.name);
                /** ~~~~~~~~~~~~~ **************/
                for (let k in o)            // and copy over all the non-pollution fields
                    if (k !== '#cc' && k !== 'k#') newo[k] = o[k];
                o['#replaced'] = newo;      // remember o is un-classed, for yaml revisits
                o = newo;
                /*********************** dead __proto__ code to remove Sept 2017 >>> TODO
                var proto = xclasses[o['##c']];
                if (!proto && (nwfs || !(o['##c'].startsWith('nwfs.')))) {  // repair proto if possible
                    // below allows for compound names such as THREE.Matrix2
                    try {
                        proto = (Function("return window." + o['##c']))().prototype;
                        xclasses[o['##c']] = proto;
                        proto[CLASSNAME] = o['##c'];
                    } catch (e) {
                        console.error('cannot use class for ', o['##c'], ' during dstring, may cause downstream errors');
                        // can fail if class unknown, eg accidentally saved an nwfs class
                        // which cannot be reconstructed in a non-node environment
                        // Just hope that the class does not matter!
                    }
                }
                if (proto) {
                    o.__proto__ = proto;
                    delete o['##c'];
                } else {
                    console.log("Unexpected class #c " + o['##c']);
                }
                ***************/
            }
            // call Init if there
            if (typeof o.Init === "function")
                o.Init();
        }
        if (o['#k'])
            map[o['#k']] = o;       // remember the object for its key, it will be the class object if appropriate

        return o;
    }

    // substitute all xref references with the appropriate object
    // does not apply in yaml case, yaml has done this work
    // will not be called in yaml case as map will be empty
    function repmap(o, d) {
        if (d > 25)
            log("stack?", d);
        if (o === null) return;
        if (typeof o === "object") {
            if (o['#k'] === undefined && !(o instanceof Array)) return;
            delete o['#k'];
            for (var i in o) {
                var pd = Object.getOwnPropertyDescriptor(o, i);
                //if (!(i === "constructor" && !o.hasOwnProperty("constructor")))
                if (!(pd && 'value' in pd)) continue;
                var oi = o[i];
                if (!oi) continue;
                var xref = oi['#xref'];
                // delete oi['#xref']; // no need, xref object has done its task and is now orphaned
                if (xref !== undefined) {
                    o[i] = map[xref];
                    if (o[i] === undefined)
                        console.log("unexpected #xref found: " + xref);
                } else {
                    repmap(oi, map, d + 1);
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
    if (d !== undefined) { setTimeout(()=> callb(d), 0); return {}; };
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
    const urik = 'reading file ' + uri;
    const et = Date.now() - st;
    msgfix(urik, 'read complete, time', et, r === undefined ? 'ERROR' : '' );
    return r;
}

//generate html for % bar. input is i in range 0..1
function genbar(i) {
    // todo: style bar, and make part of msg so html WWW edited rather than regenerated
    const bar = `
        <div style="background:lightblue; width:40em">
        <div style="height:24px;width:WWW%; background:blue;"></div>
        </div>`
    return bar.split('WWW').join(Math.round(i*100));
}

function uriclean(puri) {
    let uri0 = puri.replaceall('\\', '/');  // replace \ with /
    let uri1 = uri0.replaceall('//', '/');  // reduce all intermediate // to /
    let uri2 = uri1.replace(':/', '://');   // but do not kill http:// etc
    if (islocalhost) uri2 = uri2.replaceall('..', ',,');    // node server does nasty things to .., send ,, and replace back at server
    return uri2;
}

// like postruiasync but returns promise and tracks progress
function posturimsgasync(puri) {
    const uri = uriclean(puri);
    const d = sentData(uri);
    if (d !== undefined)  // return d as promise, but delayed in case caller assuming it will be async
        return new Promise( (resolve, reject) => setTimeout(()=>resolve(d), 0) );

    const urik = 'reading file ' + uri;
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

/** post a uri and return result string, or undefined if error
 * n.b. used to have option to catch error but not implemented correctly and never used
  */
function posturi(puri, data, allowmissing = false) {
    //console.log("post:" + uri);
    var uri = uriclean(puri);
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
                console.error('wrong response length', rlength, req.responseText.length, uri);
            return req.responseText;
        } else {
            const m = req.status === 404 ? '404' : req.responseText;  // over-noisy 404 from Oxford server
            if (!allowmissing) msgfixerror(puri, 'cannot read', m);
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

function makeLogError() {
    var mmsg = showvals.apply(undefined, arguments);
    console.error(mmsg);
    return new Error(mmsg);
}

/** get binary data async
 * from https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
 * For some reason, reading as arraybuffer was VERY slow.
 * It was much quicker to read as blob, and then convert the blob to arraybuffer
 * https://stackoverflow.com/questions/15341912/how-to-go-from-blob-to-arraybuffer
 */
function posturibin(puri, callback, responseType = 'blob') {
    const uri = uriclean(puri);
    let st = Date.now();
    var oReq = new XMLHttpRequest();
    oReq.open("GET", uri, true);
    oReq.responseType = responseType;
    // oReq.responseType = "arraybuffer";  // read takes for ever this way
    oReq.send(null);
    const urik = 'reading file ' + uri;
    const urip = 'processing file ' + uri;

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
                log('data already ok: returning')
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

/** return the first argument that is not null or undefined */
function FIRSTG(s) {
    for (var i in arguments) {
        if (arguments[i] !== undefined && arguments[i] !== null)
            return arguments[i];
    }
};

function FIRST(a, b, c, d, e, ff, g, h) {
    if (a !== undefined) return a;
    if (b !== undefined) return b;
    if (c !== undefined) return c;
    if (d !== undefined) return d;
    if (e !== undefined) return e;
    if (ff !== undefined) return ff;
    if (g !== undefined) return g;
};
function FIRST3(a, b, c) {
    if (a !== undefined) return a;
    if (b !== undefined) return b;
    if (c !== undefined) return c;
};


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


/** format number with max 6 decimal places, remove trailing 0 . */
function format(k, n) {
    if (!k) return k + '';
    // if (k === '') return '';
    if (typeof k === 'boolean') return k;
    if (k instanceof Error || k instanceof ErrorEvent) {
        return `${k.message}
${k.filename} l: ${k.lineno} col: ${k.colno}
${k.stack}`;
    }
    if (typeof k === 'object') {
        if (k instanceof Date) return k.toUTCString();
        if (format.depth > 2) return '!too deep!';
        format.depth++;
        let r;
        try {
            const typename = k.constructor.name;
            if (typename.endsWith('Array')) {
                if (k.length === 0) {
                    r = '[]';
                } else {    // for short items show in row, else in column
                    const f0 = format(k[0], n);
                    const join = f0.length > 15 ? ',\n' : ', ';
                    // don't use map, won't work for typedArrays
                    const s = [];
                    for (let i = 0; i < k.length; i++) s[i] = format(k[i], n);
                    r = typename.replace('Array', '') + '[' + s.join(join) + ']';
                }
            } else {
                r = [];
                for (var ff in k)
                    if (typeof k[ff] !== 'function')
                        r.push(ff + ': ' + format(k[ff], n));
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

// prepare for node webkit or electron if around
// see https://github.com/rogerwang/node-webkit/wiki/Window
var nwwin, nwfs, nwhttp, nwos, hostname = "defaulthost";





if (isNode && isNode() && document.body) { //W.require) { // W.nwDispatcher) {
    tryelectron();
    // https://gist.github.com/branneman/8048520
    // I tried fixing the path in ways suggested above, but no joy.
    // This fix, together with setting NODE_PATH in the involking cmd file, seems to be ok.
    ///PJT---> 01/20 review: when this was undefined it was causing more problems elsewhere
    //would only help in cases where
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
function findfields(obj, s) {
    const r = {};
    if (s instanceof RegExp) {
        for (let n in obj)
            if (n.match(s)) r[n] = obj[n];
    } else {
        s = s.toLowerCase();
        for (let n in obj)
            if (n.toLowerCase().indexOf(s) !== -1) r[n] = obj[n];
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
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
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

var inputs = {};  // cache value of inputs
var initialinputs = {};  // register initial value of inputs
var inputdoms;      // cache input dom elements to use
var _inputdoms;    // cache of secondary _ doms
var holdtimeout;
var valelement;     // element
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
    consoleTime('saveInputState');
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
            } else if (inputi.hasParent(W.samplegene) || inputi.hasParent(W.genesgui)) {
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
    consoleTimeEnd('saveInputState');
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
        serious('setInput called with no input');
        return;
    }
    if (typeof input === "string") {
        const wi = document.getElementById(input);
        if (!wi) {log('input to setInput has no object: ', input); return; }
        input = wi;
    }
    if (inputs[input.id] == value && inputs[input.id] !== value) { //  eslint-disable-line eqeqeq
        if (inputs[input.id] === '' && value === 0 && W[input.id].value === '') {
            // this happens when wrong value of 0 was saved due to error in getInput for empty string fields
            value = '';
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

var restoringInputState = false;
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


var loadedfiles = {};
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
};

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
function throwe(m) {
    console.log(">> throwe error: " + m);
    //debugger;
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
    if (!screens) screens = [{ width: 1680, height: 1050 }];

    //serious("in getScreenSize");
    var isWin = require && /^win/.test(require('os').platform());
    if (isWin) {
        // wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution

        var spawn = require('child_process').spawn;
        var args = ["path", "Win32_VideoController", "get", "CurrentHorizontalResolution,CurrentVerticalResolution"];
        var tt = spawn("wmic.exe", args);
        var data = "";
        tt.stdout.on('data', function (bdata) {
            data += bdata;
        });
        tt.on('close', function (code, sig) {
            if (data.length === 0) { getScreenSize(afterfun); log('getScreenSize no return data, retry'); return; }
            log("close", code, sig, data);
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

            // get round wmic.exe bug on Stephen's laptop with Oculus plugged in
            if (screens.length === 2 && screens[1].height === 1920 && screens[1].width === 1080) {
                screens[1] = { width: 1680, height: 1050 };
            }
            if (afterfun) afterfun();
        });
        tt.on('error', function (err) {
            serious("wmic error", err);
        });
    } else {
        //temporarily hardcoding for laptop etc non windows
        if (afterfun) afterfun();
    }
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
function chooseFile() {
    var chooser = document.querySelector('#fileDialog');
    chooser.accept = ".oao";
    chooser.nwsaveas = "new.oao";
    chooser.onchange = function (evt) {
        log("File chosen", this.value);
    };

    chooser.click();
}


/** sample observer function
for use with Object.observe, eg low level
Object.observe(currentGenes, observer)
Object.unobserve(currentGenes, observer)
higher level
observe(currentGenes, 'wall_red1')
*/
function observer(args) {
    for (var i = 0; i < args.length; i++) {
        var aarg = args[i];
        var op = aarg.object.__break[aarg.name];
        if (!op) {
            // no operation
        } else if (op === 'log') {
            log("observe", i, aarg.name, aarg.type, aarg.oldValue, "->", aarg.object[aarg.name]);
        } else if (op === 'stack') {
            log("observe", i, aarg.name, aarg.type, aarg.oldValue, "->", aarg.object[aarg.name]);
            log(new Error().stack);
        } else if (op === 'break') {
            debugger;
        } else {
            op(aarg);
        }
        // samples from my debugging ...
        //if (aarg.name === "bwthresh")
        //    debugger;
    }
}

/** observe changes to the object, and if fieldname is given break on changes to object[fieldname] */
function observe(object, fieldname, op) {
    Object.observe(object, observer);
    if (fieldname) {
        if (!op) op = 'break';
        Object.defineProperty(object, '__break', { enumerable: false, writable: true, configurable: true });
        if (!object.__break) object.__break = {};
        object.__break[fieldname] = op;
    }
}

/** unobserve changes to the object.  If fieldname is given, just ubobserve changes to that fieldname */
function unobserve(object, fieldname) {
    if (!object.__break) return;
    var unobs = false;
    if (fieldname) {
        delete object.__break[fieldname];
        if (Object.keys(object.__break).length === 0) unobs = true;
    } else {
        unobs = true;
    }
    if (unobs) {
        Object.unobserve(object, observer);
        delete object.__break;
    }
}

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
var remote, xwin, ipcRenderer, electron;
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
        resizeTo: function (w, h) { try { xwin.setSize(w, h); } catch (e) { } xwin.savesize = xwin.getSize(); },
        get width() { return xwin.savesize[0]; },
        get height() { return xwin.savesize[1]; },
        leaveFullscreen: function () { try { xwin.setFullScreen(false); } catch (e) { } xwin.savesize = xwin.getSize(); },
        enterFullscreen: function () { try { xwin.setFullScreen(true); } catch (e) { } xwin.savesize = xwin.getSize(); },
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

    log(parms);
    if (isNode() && /^win/.test(require('os').platform())) {
        var spawn = require('child_process').spawn;
        var args = ["path", "Win32_VideoController", "get", "name"];
        var tt = spawn("wmic.exe", args);
        var data = "";
        tt.stdout.on('data', function (bdata) {
            data += bdata;
        });
        tt.on('close', function (code, sig) {
            if (data.length === 0) { log('cannot get graphics card name'); return; }
            gpuinfo.graphicsCards = data;
            log('graphics cards found', data);
            if (gpuinfo.graphicsCardUsed.toLowerCase().indexOf('nvidia') === -1 && gpuinfo.graphicsCards.toLowerCase().indexOf('nvidia') !== -1) {
                W.msgbox.style.display = "";
                msgfix('!gpuerror', '<span class="errmsg">Nvidia card installed, one of<br>', gpuinfo.graphicsCards, '<br>but using', gpuinfo.graphicsCardUsed, '<br>Configure in Nvidia control panel</span>');
            }
        });
        tt.on('error', function (err) {
            serious("wmic error", err);
        });
    }
    return '<br>Unmasked Renderer: ' + parms['Unmasked Renderer'] + '<br>Unmasked Vendor: ' + parms['Unmasked Vendor'] + '<br>';
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
        } else if (typeof v === 'function') {

        } else {
            // log(x, v) // ? only canvas
        }
    }
    return r;
}  // gpuparms


// temporary slot for tests
function test1(a = W.msgbox, b, c, d, e) {

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


function test2(a, b, c, d, e) {
    nomess(false); msgfix.all = true;
    // pixel sampling, to move to sensible place later
    var s = slots[mainvp];
    var ww = s.width / inputs.renderRatioUi, hh = s.height / inputs.renderRatioUi;
    var t = readone('rtopos') + readone('rtshapepos') + '<b>slots[' + mainvp + ']<b>' + readrt(s.dispobj.rt);
    msgfix('pixel', '<b>click the pixel: key to remove</b>', t);

    function readone(rtname) {
        var rtn = rtname + Math.ceil(ww) + 'x' + Math.ceil(hh);
        var rt = rendertargets[rtn];
        if (!rt) return 'rendertarget not found' + rtn;
        return rtn + '<br>' + readrt(rt);
    }

    function sqf(v) {
        return format(Math.sqrt(v) * 255, 0);
    }

    function readrt(rt) {
        var k = 3; var k2 = k * 2 + 1;
        var ll = Math.floor(oldlayerX / inputs.renderRatioUi);
        var tt = Math.floor((height - oldlayerY) / inputs.renderRatioUi);
        msgfix('lltt', ll, tt);
        var rr = readWebGlFloat(rt, { left: ll - k, top: tt - k, width: k2, height: k2 });
        var h = [];  // html
        var ap = 0;
        for (var x = 0; x < k2; x++) {
            var row = [];
            for (var y = 0; y < k2; y++) {
                var pix = [];
                for (var i = 0; i < 4; i++) {
                    pix.push(format(rr[i][ap] - 0 * rr[k][k], 3));
                }
                var col = (rr[3][ap] === 1) ? 'border-width: 3px; border-color: rgb(' + sqf(rr[0][ap]) + ',' + + sqf(rr[1][ap]) + ',' + sqf(rr[2][ap]) + ');' : '';
                if (x === k && y === k) col += 'background-color: #600;';
                row.push('<td style="' + col + '">' + pix.join(' ') + '</td>');
                ap++;
            }
            h.push('<tr>' + row.join('') + '</tr>');
        }
        const tab = '<table class="pixeltable">' + h.reverse().join('') + '</table>';
        return tab;
    }


}
var preg;

/** make a regexp from a string or gui element */
function makeRegexp(input) {
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
    filter1 = filter1.replaceall('OR', '|').replaceall('AND', '&').replaceall('NOT', '!');
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
            .replaceall('&', ' ')   // allow blank or & for and at this level
            .split(" ")             // split using blank
            .filter(x=>x)           // filter out empty strings  from repeated blanks
            .map(x=> x[0] === '!' ? '^(?!.*' + x.substring(1) + ')' : '(?=.*' + x + ')' )    // make regexp allowing for negated simple string
            .join('');      // and make back this
    return filt.join('|');
}


/** use an event to filter gui */
function filterDOMEv(event = {target: W.guifilter}) {
    const src = event.target;
    if (event.type === 'change' && filterDOMEv.last === src.value) return;  // change already dealt with by keyup; redo for keyup with no change to allow simpler testing
    // log('filterDOMEv', event.type, src.value );
    if (event.key === "Escape")
        src.value = '';
    if (event.key === "F2" && src.value[0] !== '/')
        src.value = '/' + makeRegexpStr(src.value);
    filterDOM(makeRegexp(src), W.controlscore, 0, src);
    filterDOMEv.last = src.value;

    filterGuiGenes();
}

/** clear filtering from filterDOM */
function clearDOMFilter(ele) {
    if (ele.oldd !== undefined) {
        ele.style.display = ele.oldd;
        delete ele.oldd;
    } else if (ele.style) {
        ele.style.display = '';
    }
    for (let i=0; i<ele.childNodes.length; i++) {
        clearDOMFilter(ele.childNodes[i]);
    }
}

/** filter a dom element for hits, testregexp is test regexp, ele is top element for filter/search
if testregexp is empty or undefined, the hidden statis is resotored recursively
 */
function filterDOM(testregexp, ele = W.maincontrols, lev = 0, b, c, d, e) {
    if (ele.id === 'samplegene') return;  // otherwise more recently added genes get a corrupt start in life

    if (lev === 0) clearDOMFilter(ele);   // clean old search before starting new one
    if (!testregexp || testregexp+'' === '/^/') return;  // done


    // Now start the real search =========================
    // Work down to the loweest level and then back up again; otherwise NOT cases do not work well.
    // However, we then consolidate lower level groups to try to make sure everything is displayed with enough context.
    // We may sometimes get too much context, but not usually enough to worry.
    // That can be resolved by refining the original GUI dom structure.


    const cl = ele.classList;
    let cn = ele.childNodes, hitstring = undefined;

    if (cl && cl.contains('gene')) {  // special case for genes
        let gd = genedefs[ele.name];
        if (!gd)
            gd = {tag: 'unknown no genedef'};
        hitstring = [ele.name, ele.genehelpEle.textContent, (gd.free ? 'free' : 'frozen'), gd.tag, 'gene'].join(' '); //check tag matching...
        cn = [];
    } else if (cl && cl.contains('key')) {  // special case for keys
        hitstring = [ele.textContent, 'key'].join(' ');
        cn = [];
    } else if (cn.length === 0) {   // general case for hit at the loweest level
        hitstring = ele.textContent + (ele.value || '') + (ele.id || '');
    }

    let hit = ( hitstring !== undefined &&  testregexp.test(hitstring) )    // main test for lowest (or very low) level hits
        || ele.id === 'genefilter';     // special case for genefilter, very confusing if it is nonempy/active but invisible

    for (let i=0; i < cn.length; i++) hit |= filterDOM(testregexp, cn[i], lev+1, b);    // iterate all the childNodes  (except special case cn)

    if (cl) {  // do not process #text elements (or others without classList if any?)
        if (hit) {
            if ( // so lowest level groups display coherently;  this could be optimized if it becomes and issue
               (ele.getElementsByClassName('group').length
                + ele.getElementsByTagName('fieldset').length
                + ele.getElementsByClassName('key').length
                + ele.getElementsByClassName('savename').length
                + ele.getElementsByClassName('gene').length === 0)
            )
                clearDOMFilter(ele); // unhide all the bits below we may have just hidden
        } else {  // !hit, so hide the element
            if (ele.tagName !== 'LEGEND') {  // don't hide legends as they are useful context, but still return appropriate value of hit
                ele.oldd = FIRST(ele.oldd, ele.style.display);
                ele.style.display = 'none';
            }
        }
    }
    if (lev === 0 && W.controls && W.controls.onmousemove) W.controls.onmousemove();
    return hit;
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
    var hl = vv.hand_left;
    msgfix("hand_left", hl.x, hl.y, hl.z);
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
    value: function(from) {
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
function quickscene(scenep, camerap, target, flag) {

    const ch0 = scenep.children[0];
    renderer.setRenderTarget(target);
    let geom = ch0.geometry;
    framelog('quickscene', scenep.name, 'buffergeom', !!geom._bufferGeometry);
    if (geom._bufferGeometry) geom = geom._bufferGeometry;

    if (ch0.matrixWorldNeedsUpdate) {
        ch0.updateMatrixWorld();
    }

    // from three 10868 camera.updateMatrixWorld
    // Object3D.prototype.updateMatrixWorld.call( this, force );
	camerap.matrixWorldInverse.getInverse( camerap.matrixWorld );

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

/** monitor a field by turning it into a property (not monitor, clashes with developer tools */
function monitorX(object, field, option = 'debugchange') {
    const desc = Object.getOwnPropertyDescriptor(object, field);
    if (!desc) { log('no property to monitor'); return; }
    if (desc.get || desc.set) { log('cannot monitor property', field); return; }
    const v = object[field];
    log(`monitorX initial ${field} = ${v}`);
    Object.defineProperty(object, '..'+field, {
        value: v,
        writable: true,
        enumerable: false
    });

    delete object[field];
    Object.defineProperty(object, field, {
        get : function() {
            if (option.indexOf('logget') !== -1) log(`monitorX get ${field} = ${object['..'+field]}`);
            return object['..'+field];
        },
        set : function(vs) { _monitor_fun(object, field, vs, option) },
        enumerable: true
    });

}
function _monitor_fun(object, field, value, option) {
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
    onframe(refall, 1);
}

/** refresh OPTSHAPEPOS2COL without remakeShaders() */
function refts() {
    remakeShaders();    // depending on usemask this may have to do more, so just do it
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
    onframe(() => exportmyshaders(undefined, 'OPTIMIZE'), 5);
    setTimeout(() => {usesavedglsl='OPTIMIZE.opt'; remakeShaders()}, 4000);
    setTimeout(() => {usesavedglsl = '';}, 5000);
}

/** get statistics for array */
function getstats(a, opts = {}) {
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

/** comp[are two javascript objects */
function compareObjects(a, b) {
    const missa = [], missb = [], diff = [];
    for (let gn in a) if (!(gn in b)) missb.push(gn);
    for (let gn in b) if (!(gn in a)) missa.push(gn);
    for (let gn in a) if ((gn in b) && a[gn] !== b[gn]) diff.push( [gn, a[gn], b[gn]]);
    log ('missa:', missa.join(' '));
    log ('missb:', missb.join(' '));
    log ('diff:', diff.join('  '));
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
var nomess = function (killmess = true) {
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
        W.entervr.style.display = 'none';
        // W.controlsouter.style.display = 'none';  // allow stats
        showControls(false);
        if (!oxcsynth && VUMeter2) VUMeter2.nometer = true;
    } else {
        //W.tranrulebox.style.display = 'none';
        W.msgbox.style.display = '';
        nomess.msgvisible = true;

        if (!oxcsynth && VUMeter2) VUMeter2.nometer = false;
        if (CSynth && CSynth.guidetail === 0) CSynth.guidetail = 1;
    }
}


/** get uniforms for a given tag */
function uniformsForTag(tag) {
    const types = {f: 'float', t: 'sampler2D', v3: 'vec3', v2: 'vec2', m4: 'mat4'};
    const r = [];
    for (const u in uniforms) {
        if (uniforms[u].tag === tag) {
            r.push(`uniform ${types[uniforms[u].type]} ${u};`)
        }
    }
    return r.join('\n');
}


/** test script for starting with a frame for each material
 * this helps us post loading progress information
*/
function *slowinit() {
    loadTime('shaders 1 start');
    // for some odd reason, W.guifilter does not work at this point without help
    W.guifilter = DE.guifilter;
    if (startvr) {
        nomess('force');
    }

    function showmsg(mm, prop = framenum/25) {
        msgfixlog('loadCSynth', `<div style="font-size: 300%; color: white">${mm}</div>
            ${genbar(prop)}`);
    }
    if (!startvr) W.startscreen.innerHTML = '';
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
        const mm = 'preparing shaders ...' + oplist[popmode] + ' ' + framenum;
        showmsg(mm);
        lastop = x;
        consoleTime(x);
        testopmode = opmode = popmode;
        mats[popmode] = getMaterial(mat);
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
    yield 'xxxframe';
    _insinit = true;
    orginit();

    _ininit = true;

    const mv = currentGenes.tranrule || 'XXXTRXXX';
    framenum = 10;
    let comp = comp1;
    for (let i=0; i<2; i++) {
        comp(mv, OPPOSITION); yield 'xxxframe'
        comp(mv, OPOPOS); yield 'xxxframe'
        if (inputs.USESKELBUFFER) { comp(mv, OPMAKESKELBUFF); yield 'xxxframe' }
        // comp(mv, OPSHADOWS); yield 'xxxframe'
        comp(mv, OPSHAPEPOS); yield 'xxxframe'
        comp(mv, OPTEXTURE); yield 'xxxframe'     // wrong colour if this enabled
        if (comp === comp1) {
            comp(mv, OPTSHAPEPOS2COL); yield 'xxxframe';    // details such as shadows not ready, so comp2 invalid this early
        }
        /**** for now work because matrix trancodeForTranrule and other overrides
        if (currentGenes.name === 'csynth1' && i === 0) {
            const matrix = new CSynth.Matrix();
            comp('matrix', OPOPOS); yield 'xxxframe'
            comp('matrix', OPSHAPEPOS); yield 'xxxframe'
            comp('matrix', OPTSHAPEPOS2COL); yield 'xxxframe'
        }
        /***/
        loadTime('shaders 2 comp ' + i);
        comp = comp2;
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
        animateNum(framenum);
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
            log('pend', ff);
            ff++;
            return onframe(endup);
        }
        loadTime(`shaders 6 pending others done after ${ff} frames`);
        showmsg('data and shaders ready, awaiting very final processing', 1);
        onframe( () => {
            loadTime('shaders 7 waited 3 more frames');
            showmsg('running ...', 1);
            W.startscreen.style.display = 'none';   // kill splash now
            // setTimeout( () => {
                showmsg('', 1);
                msgboxVisible(false);               // kill initial messages soon
                msgfixlog('loadCSynth');
                msgfix('loadTimes', '<ul><li>' + yaml.safeDump(loadTimes).trim().replaceall('\n', '</li><li>') + '</li></ul>')                // msgfix.hide('loadTimes');   // but hidden till wanted
            // }, 2000);
        }, 3);
    }
    endup();

}
slowinit.pendend = {};


var startcommit;
// check we are running latest version of Organic/CSynth
function checkres() {
    if (!startcommit) return;  // eg used from some small test function
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
        W.startscreen.innerHTML = `
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

    if (appToUse !== 'Horn' || searchValues.nohorn) {
        orginit();
        W.startscreen.style.display = 'none';  // defer till shaders ready
        msgfix('code', 'code loaded, now initializing ...')
        msgfix.force();  // so it shows immediately
    } else {
        runTimedScript(slowinit());
    }
}

/** initial start on windows load, if nwwin availble check size, and in any case call inittimed */
function init() {
    isFirefox = navigator.userAgent.contains('Firefox');
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
    if (x.elements) {testnan(x.elements)};
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


// make html table out of 2d array
function array2Table(a, classs='simpletable') {
    const r = [];
    for (let i=0; i<a.length; i++) {
        r.push( '<tr><td>' + a[i].join('</td><td>') + '</td></tr>')
    }
    return `<table class = "${classs}"">\n` + r.join('\n') + '\n</table>';
}

function stopDraggable(todrag) {
    if (!todrag.save) return;
    const s = todrag.style;
    let dragmousedown, dragmousemove, dragmouseup, parent;
    [s.position, s.left, s.top, s.width, s.height, dragmousedown, dragmousemove, dragmouseup, parent] = todrag.save;
    parent.appendChild(todrag);     // this will not be in right place, it will be at end
    todrag.removeEventListener('mousedown', dragmousedown);
    todrag.removeEventListener('mousemove', dragmousemove);
    todrag.removeEventListener('mouseup', dragmouseup);
    delete todrag.save;
}

// make an object draggable
function makeDraggable(todrag, usesize=true) {
    if (todrag.save) return;  // already draggable
    const s = todrag.style;
    const rr = todrag.getBoundingClientRect();
    todrag.save = [s.position, s.left, s.top, s.width, s.height, dragmousedown, dragmousemove, dragmouseup, todrag.parentNode];
    s.position = 'fixed';
    s.left = Math.min(screen.width-300, Math.max(0, rr.x + 100)) + 'px';
    s.top = Math.min(screen.height-300, Math.max(0, rr.y)) + 'px';
    if (usesize && rr.width && rr.height) {
        s.width = rr.width + 'px';
        s.height = rr.height + 'px';
    }
    document.body.appendChild(todrag);

    todrag.addEventListener('mousedown', dragmousedown);
    todrag.addEventListener('mousemove', dragmousemove);
    todrag.addEventListener('mouseup', dragmouseup);

    function dragmousedown(evt) {
        if (evt.buttons !== 2) return;
        todrag.ox = evt.clientX - s.left.replace('px','');
        todrag.oy = evt.clientY - s.top.replace('px','');
    }
    function dragmousemove(evt) {
        if (evt.buttons !== 2) return;
        msgfix('ddrag', offx(evt) , todrag.clientWidth);
        if (offx(evt) > todrag.clientWidth - 50
            && offy(evt) > todrag.clientHeight - 50)
            return;
        s.left = (evt.clientX - todrag.ox) + 'px';
        s.top = (evt.clientY - todrag.oy) + 'px';
        return killev(evt);
    }
    function dragmouseup(evt) {}
}

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
    edge.applyMatrix(orientation);
    // position based on midpoints - there may be a better solution than this
    edge.position.x = (pointY.x + pointX.x) / 2;
    edge.position.y = (pointY.y + pointX.y) / 2;
    edge.position.z = (pointY.z + pointX.z) / 2;
    edge.updateMatrix();
    return edge;
}

function toKey(x) {
    const str = JSON.stringify(x).replaceall('"', '')
    return str.length > 30 ? str.substr(0,20) + '###' + str.hashCode().toString(36) : str;
};

// helpful details to see matrices more easily
window.devtoolsFormatters = [{
    header: function(obj) {
        return obj.isMatrix4 ? ['div', {}, obj.toString()] : null  },
    hasBody: ()=>false
    }]

if (THREE) THREE.Matrix4.prototype.toString = function(m) {
     return 'mat4: [' +
        [this.elements.slice(0,4),
        this.elements.slice(4,8),
        this.elements.slice(8,12),
        this.elements.slice(12,16)].map(mm=>format(mm)).join('   ')
        + ']'
 }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms/S.speedup)); }

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
    var socket = startWsListener.socket = new WebSocket("ws://localhost:" + addr);
    socket.onopen = () => msgfixlog('startWsListener', "Connection successful.", starttried);
    socket.onclose = () => msgfixlog('startWsListener', "Connection closed.", starttried);
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
function execasync(str) {
    if (isNode())
        return require('child_process').exec(str);
    else {
        const id = str.replaceall('"','').substring(0, 10) + '_Organic';
        return runcommandphp('start "' + id + '" ' + str, true);
    }
}
var distxyz = (i,j) => Math.sqrt((i.x-j.x)**2 + (i.y-j.y)**2 + (i.z-j.z)**2); // really const
var distarr3 = (i,j) => Math.sqrt((i[0]-j[0])**2 + (i[1]-j[1])**2 + (i[2]-j[2])**2); // really const

/** traverse materials */
function mtraverse(node, action) {
    node.traverse(n => {let m = n.material; if (m) action(m)});
}

var EX = {};
/** bring to front just once */
EX.toFront = function() {
    runcommandphp(`start /min "toFront" cscript toFront.vbs "${document.title}"`);
}

/** start a bring to front every interval (5 seconds) */
EX.startToFront = function(t = 5000) {
    EX.stopToFront();
    EX.frontInterval = setInterval(EX.toFront, t)
}
/** stop any bring to front every interval */
EX.stopToFront = function() {
    if (EX.frontInterval) clearInterval(EX.frontInterval);
    EX.frontInterval = undefined;
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
    const s1 = str.replaceall('`', '\\`');
    const s2 = eval('`' + s1 + '`');
    const s3 = s2.replaceall('\\`', '`');
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

function nircmd(str) {
    if (islocalhost)
        return runcommandphp(`..\\nircmd\\nircmd.exe ${str}`, false);  // sync with no message
    console.error('cannot use nircmd when not in localhost', location.hostname, str);
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

// // set to full screen.  NOT RELIABLE
// async function fullscreen() {
//     // document.body.requestFullscreen();  // only works when called from keystroke
//     nircmd(`win activate stitle "${document.title}"`);  // ?? hideshow
//     nircmd(`win max stitle "${document.title}"`);
//     await sleep(100);
//     if (screen.height !== screen.availHeight)
//         nircmd(`sendkey f11 press`);
// }


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

if (!serious) serious = console.error;

async function downloadImage(fn = 'test', imtype = 'png', gui = false) {
    const ss = GX.guilist.map(g => g.visible);  // save visibility
    GX.guilist.forEach(g => g.visible = false)  // hide all menu items
    window.V.gui.visible = gui;
    await S.frame();
    const fid = fn + '.' + imtype;
    const imformat = 'image/' + imtype;
    const datauri = canvas.toDataURL(imformat);
    const blob = dataURItoBlob(datauri, 1);
    saveAs(blob, fid);
    await S.frame();
    GX.guilist.forEach((g,i) => g.visible = ss[i]); // restore menu visibility
}

async function downloadImageHigh(big = 3840, fn, imtype, gui = false) {
    const [w, h, gv] = [width, height, window.V.gui.visible];
    const r = big / Math.max(w, h);
    setSize(Math.round(w*r), Math.round(h*r));
    await downloadImage(fn, imtype);
    setSize(w, h);
}
