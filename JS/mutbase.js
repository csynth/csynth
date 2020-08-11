/** TODO different set of uniforms for each material: NO global uniforms variable */
/**
Note: representation of genes.
Genes appear in several guises:
1: javascript simple object, as in target.  name->value map
2: definition: genedefs.  name->name/def/min/max/delta map
2: uniforms in format required by three.js -- see https://github.com/mrdoob/three.js/wiki/Uniforms-types
3: guigenes. map of html display: part of gui
**/

////$ = (function() {
"use strict";
// for working towards encapsulation
var W, currentGenes, mainvp, guigenes, genedefs,
        Water, CubeMap, rows, getShaders, Maestro, // nextmutsynthID
        inAnimate, healthMutateSettings, hoverMutateMode, startOSCBundle,
        inputs, framenum, nwfs, baseroot, OrgAud, Cilly,
        getGal, usedgenes, toggleFree, lastDispobj, clearPostCache, setHornSet, getHornSet, onframe, remakeShaders, newframeNotanim,
        healthMutateStep, globalSynthUpdate, testcputimes, checkglerror, animate, renderVR, requestAnimationFrame, updateGuiGenes,
        $, performance, lastTime, perftimes,  trygeteleval, genBoundsFromPrefixGal, genBoundsFromPrefixFS, log, saveundo,
        clone, setGUITranrule, lasttargtime, throwe, alwaysNewframe, renderer, target, uniforms, slots,
        myRequestAnimationFrame, makeRegexp, DispobjC, exhibitionMode, filterDOMEv, msgfix

        ;

var uid = 0;
const ipad = navigator.userAgent.toLowerCase().indexOf("ipad") !== -1;
/** array of objects used to display extra_objects, may be slots or ...??? */
var autofillfun = function(){}; // function for filling extra slots
var forcerefresh = false;  // true to force a single frame refresh of all slots

var currentObjects = {};  // set of current objects


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/** get vn for an xxx */
function xxxvn(xxx) {
    const dispobj = xxxdispobj(xxx);
    if (!dispobj)
        return undefined;
    return dispobj.vn;
}

/** return dispobj for an xxx */
function xxxdispobj(xxx) {
    const tt = typeof xxx;

    if (tt === "object") {
        if ("dispobj" in xxx) return xxx.dispobj;   // contains a dispobj field, use it
        if (xxx instanceof DispobjC) return xxx;     // is already a DispobjC
        if (xxx === currentGenes && slots && slots[mainvp]) return slots[mainvp].dispobj;
    } else if (tt === "string") {
        return currentObjects[xxx];
    } else if (tt === "number") {        // number is slot number
        if (!slots) return undefined;
        if (!slots[xxx]) return undefined;
        return slots[xxx].dispobj;
    }
    if (xxx.tranrule) {  // try to find genes
        for (let o in currentObjects)
            if (currentObjects[o].genes === xxx)
                return currentObjects[o];
    }
    //console.log("unexpected xxxdispobj " + xxx);
    return undefined;
}


/** >>>>>> bridge function ~ return genes for a variety of inputs */
function xxxgenes(xxx) {
    const tt = typeof xxx;

    if (tt === "object") {
        if ("tranrule" in xxx) return xxx;  // already genes
        if ("_rot4_ele" in xxx) return xxx;  // already genes
        if ("_camz" in xxx) return xxx;  // already genes
        if ("genes" in xxx) return xxx.genes;  // eg a dispobj
    } else if (tt === "string") {
        return currentObjects[xxx] || getGal(xxx);
    } else if (tt === "number") {        // number is slot number
        const dispobj = xxxdispobj(xxx);
        if (dispobj) return dispobj.genes;
    }
    console.log("unexpected xxxgenes() " + xxx);
    return undefined;
}

/** set the genes for an object xxx from some gene set  */
function setgenes(xxx, o) {
    const dispobj = xxxdispobj(xxx);
    if (!dispobj) {
        console.log("Attempt to set objects for bad object " + xxx);
        return o;
    }
    dispobj.genes = o;
    return o;
}

// <<< variables that may be overridden by specifics
const EPSILON = 0.000001;
var savedef = "unset";

/** return set of filtered genes, object with true.
If passed in object, just return that object.
If array, convert to object.
If filter is undefined, the TWO filters from the gui are used
*/
function resolveFilter(filter) {  // inputs.genefilter unreliable
    const ofilter = filter;
    if (Array.isArray(filter)) {
        let ff = {};
        for (let i = 0; i < filter.length; i++) ff[filter[i]] = true;
        return ff;
    }
    if (typeof filter === 'object') return filter;
    // const list = usedgenes();
    // if (!list) return {};
    var list;


    if (filter === undefined) filter = '(' + W.genefilter.value + ')' + (W.guifilter ?  ' (' + W.guifilter.value + ')' : '');
    const regexp = makeRegexp(filter);

    const res = {};
    for (let gn in guigenes) {
        let gd = genedefs[gn];
        if (!gd)
            gd = {tag: 'unknown no genedef'};
        const gnl = ":" + gn.toLowerCase() + ":" + gd.tag + ":!" + (gd.free ? 'free' : 'frozen') ;
        let display = (!list || list[gn]);
        // make sure water genes displayed if appropriate
        // ?? todo: more generic mechanism here
    // also note that I'm not doing toLowerCase() everywhere here,
    // strictly speaking not fully case insensitive,  but given specifity of code I'm keeping it brief
        if (Water && Water.m_renderWater && genedefs[gn].tag === "water") display = true;
        if (CubeMap && CubeMap.m_isRendering && genedefs[gn].tag === "wallcol") display = true;
        // never was a nextmutsynthID and nextMutsynthID is a function
        //if (nextmutsynthID && nextmutsynthID !== 0 && genedefs[gn].tag.indexOf("audio") !== -1)
        //    display = true;

        if (display) {
            display = regexp.test(gn);
        }
        if (display) res[gn] = true;
    }
    return res;
}

/** filter unwanted guigenes
 * uses list of names of genes in use (from target)
 * and filter from genefilter gui object (now case insensitive)
 * Filter is of form
 *   t1 t2 | q3 q4
 *   The blank terms are anded, and the | terms are ored
 *   No bracketing etc
 *  */
function filterGuiGenes(evt) {
    W.genefilter.autosize();
    //doesn't match tag names with spaces??
    const togglefree = evt && evt.keyIdentifier === "F2";
    let setting = "?";
    const todisp = resolveFilter();
    for (let gn in guigenes) {
        const display = todisp[gn];

        guigenes[gn].style.display = display ? "" : "none";
        if (togglefree && display) {
            if (setting === "?") setting = 1 - genedefs[gn].free;
            if (genedefs[gn].free !== setting) toggleFree(gn);
        }
        if (rows && rows[gn]) rows[gn].style.display = display ? "" : "none";
    }
}

var clipboard;
/** copy filtered genes to clipboard */
function copygenestoclip(genes) {
    genes = genes || lastDispobj.genes; // will fail if no lastDispob, fix later
    const s = resolveFilter();
    clipboard = {};
    for (let gn in s) clipboard[gn] = genes[gn];
}

/** paste filtered genes from clipboard */
function pastecliptogenes(genes) {
    genes = genes || lastDispobj.genes; // will fail if no lastDispob, fix later
    const s = resolveFilter();
    for (let gn in clipboard) if (s[gn]) genes[gn] = clipboard[gn];
    lastDispobj.render();
}

/** clamp the genes to be in range for ALL current objects */
function clampAllGeneRanges() {
    for (let o in currentObjects) {
        const ob = currentObjects[o];
        const genes = ob.genes;
        for (let g in genes) {
            const gd = genedefs[g];
            if(gd) genes[g] = Math.min(gd.max, Math.max(gd.min, genes[g]));
        }
    }
}

var NODO = 'nodispobj';
var NOVN = 'no vn';




/** edit function ... default nothing */
//function editobj() {}


function regenHornShader() {
    clearPostCache('regenHornShader');
    setHornSet();
    forcerefresh = true;
    onframe(remakeShaders, 2); // >>> todo check why delay needed
}


/** main object has changed, refresh, and add n extra 'active' frames if n set */
function newmain(n = 0) {
    newframe(currentGenes);
    if (alwaysNewframe < n) alwaysNewframe = n;
}
const refmain = newmain;

/** perform operation before next frame */
function onnextframe(f) {
    Maestro.on("preframe", f, undefined, true);
    newframe();  // make sure there is a frame ...
}

var newframePending = false;
/** request a new frame
 * Actual newframe processing deferred to end of frame if called from aanimate()  inAnimate
 * This gives the globale.setTimeout a chance to let other things get a look in.

 */
function newframe(genes) {
    if (genes) {
        const dispobj = xxxdispobj(genes);
        if (dispobj)
            dispobj.render();
    }
    if (newframePending) return;
    newframePending = true;
    if (!inAnimate) { processNewframe(); newframeNotanim++; }
}

/** do the newframe processing to force new frame
 *     note: three.js includes requestAnimationFrame shim, but not used
 */
function processNewframe() {
    if (hoverMutateMode || healthMutateSettings.touchHealth) healthMutateStep();
    if (startOSCBundle && Maestro) {
        globalSynthUpdate();
    }
    myRequestAnimationFrame();
}

let isControlShown = true;  // slave value for query only for is control visible

/** show or hide controls, if set wifrom toggle (alt-c) do not allow to be lost from mouse move */
function showControls(v) {
    if (exhibitionMode) v = false;
    if (inputs.fixcontrols) v = true;
    if (v && !showControls.done) {   // seems overcomplicated way of getting initial display right
        onframe(()=> {
            filterDOMEv();
            W.valouter.style.display = 'none';
            showControls.done = true;
        });
    }

    if (inputs.fixcontrols) {
        W.controls.style.display = W.guifilter.style.display = "";
        isControlShown = true;
    }

    if (v === "fixon") {
        showControls.setFromToggle = v = true;
    } else if (v === "toggle") {
        showControls.setFromToggle = v = W.controls.style.display === "none";
    } else  {
        if (showControls.setFromToggle) return;
    }

    // if (v === isControlShown) return;  // minor optimization, often got wrong if new object loaded from gui

    W.controls.style.display = W.guifilter.style.display = v ?  "" : "none";
    isControlShown = v;
    if (v) {
        updateGuiGenes();
        W.msgbox.style.left = '360px';
    } else {
        // get around webkit bug with selected object hidden using lots of cpu
        // http://stackoverflow.com/questions/16411661/why-does-chrome-use-more-cpu-when-a-large-knockout-element-is-hidden
        //## removed, Stephen and Peter.  Was giving big confusion to tranrule edit, esp with CodeMirror because we thought the underlying bug was fixed,
        //## but it turned out that it was NOT fixed, so instead we added a test to allow deselection of canvas related elements but not others (such as tranrule)
        //##
        //## for future reference, to stir the bug
        //##    remove the code below
        //##    click on a non active part of the controls (an empry area or a non-updatable element)
        //##    move the mouse away so the controls are no longer shown
        //##    watch the framerate drop even on a trivial horn

        //## the test below was not reliable
        //##    if (window.getSelection().anchorNode && window.getSelection().anchorNode.parentElement && window.getSelection().anchorNode.parentElement.hasParent(W.controls))
        //## but this version seems much more robust
            if (document.activeElement === document.body)
              window.getSelection().removeAllRanges();  // get around
        W.msgbox.style.left = inputs.showstats ? '360px' : '10px';
    }

}

/** in case upset by inserting stats or whatever above controls */
if (W.controls)
W.controls.onmousemove = function() {
    const controls = W.controls;
    const s = controls.style.display;
    controls.style.display='';  // in case it gets called for setting sizes when hidden
    //W.controls.style.maxHeight = (document.body.clientHeight - W.controls.offsetTop - 2) + "px";
    let bot = window.innerHeight;
    bot = W.tranrulebox.style.display === 'none' ? bot: W.tranrulebox.getBoundingClientRect().top;
    //XXX: PJT:: This was *severely* impacting performance when typing in cm box.
    //whatever the problem was/is, this is much worse.
    //const cm = $('.CodeMirror')[0];
    //if (cm) bot = cm.style.display === 'none' ? bot: cm.getBoundingClientRect().top;
    W.controls.style.top = '0px';

    let h = (bot - W.controls.offsetTop - 2);
    h = Math.min(h, W.controlscore.clientHeight);
    W.controls.style.maxHeight = h + "px";
    W.controls.style.minHeight = W.controls.style.maxHeight;

    let w = W.controlscore.clientWidth;
    W.controls.style.maxWidth = w + "px";
    W.controls.style.minWidth = W.controls.style.maxWidth;
    controls.style.display = s;  // restore in case it gets called for setting sizes when hidden
}


function performanceDisplay() {
    if (1) return;
    const trate = 100;
    if (framenum%trate === 0) {
        const tt = Math.round(performance.now());  // Chrome: only accurate to ms anyway
        const dt = tt - lastTime;
        lastTime = tt;
        let mmsg = framenum + ": ms/fr=" + dt/trate / (perftimes || 1);
        mmsg += " res=" + inputs.resbaseui + " rr=" + inputs.renderRatioUi;
        if (currentGenes.tranrule) {
            mmsg += " horns=" + getHornSet(currentGenes.tranrule).horncount;
            mmsg += " mesh=" + getHornSet(currentGenes.tranrule).meshused;
        }
        if (performance.memory)
            mmsg += "  usedHeap=" + performance.memory.usedJSHeapSize;
        console.log(mmsg);
        msgfix('performanceDisplay', mmsg);
    }

}

/** refresh all slots n times. if n not given it will default for 1 (colour) or 10 (other background) */
function refall(n) {
    for(const i in slots) if (slots[i]) slots[i].dispobj.render(n);  // ?? why needed ??
    forcerefresh = true;
    newframe();
}
function refallold() {
    forcerefresh = true;
    newframe();
}


/** dummy add a uniform, or change its value if it already exists
 * may be overwritten by application (eg graphbase) */
//function adduniform(name, def, type) {
//}








const lrulist = [];
function lruuse(vn) {
    const i = lrulist.indexOf(vn);
    if (i !== -1) lrulist.splice(i, 1);
    lrulist.push(vn);
}

/** generate animation bounds from objects by name prefix */
function genBoundsFromPrefix(stem) {
    if (!stem) stem = trygeteleval("boundsprefix", "xxx");
    if (nwfs && nwfs.existsSync(baseroot + stem))
        genBoundsFromPrefixFS(stem);
    else
        genBoundsFromPrefixGal(stem);
}



/**
 * NOT WORKING QUITE AS INTENDED JUST YET...
 * @param {type} filter
 * @param {type} srcObj name or genome object to copy from
 * @param {type} targObj name or object *NB current implementation will mutate this, not clone it* not good for pure FP
 * @returns the mutated targObj
 */
function applyFilteredGenesFrom(filter, srcObj, targObj) {
    if (srcObj) {
        if (typeof srcObj === 'string') srcObj = getGal(srcObj).genes;
    } else throwe('no srcObj given');
    if (targObj) {
        if (typeof targObj === 'string') targObj = getGal(targObj).genes;
    } else targObj = currentGenes;

    for (let gn in genedefs) {
        log("applying " + gn + ", " + srcObj[gn]);
        if (gn.indexOf(filter) === -1) continue;
        targObj[gn] = srcObj[gn];
    }

    return targObj;
}

/** set the target, make the genes appropriate,
 * and save undo unless explicitly told not to
 * */
function settarget(targ, dosaveundo) {
    if (dosaveundo !== false) saveundo();
    target = clone(targ);
    setGUITranrule(target);
    currentGenes.name = target.name;
    filterGuiGenes();
    newmain();
    lasttargtime = Date.now();
    return targ;
}

/** get an xobj.
 * PJT: obviously 'x', 'xxx' etc are self-documenting
 */
function xxxxobj(xxx) {
    if (typeof xxx === "string") {
        return getGal(xxx);
    } else if (typeof xxx === "object") {
        if (xxx.name && (xxx.genes || xxx.evaluate) ) return xxx; // assume already an xobj
        if (xxx.tranrule) return { name: xxx.name, genes: xxx };  // was genes
    }
    log ("cannot find xobj for ", xxx);
    return undefined;
}

function clearSelected() {
    for (let o in currentObjects)
        currentObjects[o].selected = false;
    newframe();
}
// pending setInterval(function() {killDispobj(lru());}, 1000);

/** this function may be overridden, eg in LOCAL/localstart.js,
 * run at start of init() process */
function localstartEarly() {
}

/** this function may be overridden, eg in LOCAL/localstart.js,
 * run at end of init() process */
function localstartLate() {
    OrgAud.init();
    if (Cilly) Cilly.maestro_init();
}

/** override mechanism for genes */
var GO = new Proxy({}, {
    get : (ig, name) =>
        name === 'ownKeys' ? () => Reflect.ownKeys(uniforms) :
            name in geneOverrides  ? geneOverrides[name] : currentGenes[name],
    set : (ig, name, v) => (name in geneOverrides ? geneOverrides : currentGenes)[name] = v,
    ownKeys : (o) => {
        let x = Reflect.ownKeys(uniforms);
        log('...', x);
        return x;
    }   // Object.keys(U) calls this, and x is ok, but returns []
    // !!! enumerate maynot work ...
 });

 var geneOverrides = {};
