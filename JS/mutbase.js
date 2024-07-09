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
var W, /** @type Object */ currentGenes, mainvp, guigenes, genedefs,
        Water, CubeMap, rows, getShaders, Maestro, // nextmutsynthID
        inAnimate, healthMutateSettings, hoverMutateMode, startOSCBundle,
        inputs, framenum, baseroot, OrgAud, Cilly,
        getGal, usedgenes, toggleFree, lastDispobj, clearPostCache, HW, onframe, remakeShaders, newframeNotanim,
        healthMutateStep, globalSynthUpdate, testcputimes, checkglerror, animate, renderVR, updateGuiGenes,
        $, /** @type any */ _performance = performance, lastTime, perftimes,  trygeteleval, genBoundsFromPrefixGal, genBoundsFromPrefixFS, log, saveundo,
        clone, setGUITranrule, lasttargtime, throwe, alwaysNewframe, renderer, target, uniforms, slots, mutate, mutateStructHs,
        myRequestAnimationFrame, makeRegexp, DispobjC, exhibitionMode, filterDOMEv, msgfix, fileExists, reserveSlots, canvas, setAllLots, copyFrom,
        hoverDispobj, msgfixerror, lastdocx, lastdocy, RG, centrescalenow, S
        ;

var _showControlsdone, _showControlssetFromToggle
var uid = 0;
const ipad = navigator.userAgent.toLowerCase().indexOf("ipad") !== -1;
/** array of objects used to display extra_objects, may be slots or ...??? */
var autofillfun = function(){}; // function for filling extra slots
var forcerefresh = false;  // true to force a single frame refresh of all slots

var currentObjects = {};  // set of current objects

var NODO = 'nodispobj';
var NOVN = 'no vn';

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/** get vn for an xxx */
function xxxvn(xxx) {
    const dispobj = xxxdispobj(xxx);
    if (!dispobj)
        return undefined;
    return dispobj.vn;
}

/** return rendertargetfor an xxx */
function xxxrt(xxx) {
    return xxxdispobj(xxx)?.rt;
}

/** return dispobj for an xxx */
function xxxdispobj(xxx = mainvp) {
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
    if (xxx === undefined || xxx === NODO) return currentGenes ?? xxxgenes(mainvp);
    const tt = typeof xxx;

    if (tt === "object") {
        if (xxx instanceof DispobjC) return xxx.genes;  // eg a dispobj
        if ("tranrule" in xxx) return xxx;  // already genes
        if ("_rot4_ele" in xxx) return xxx;  // already genes
        if ("_camz" in xxx) return xxx;  // already genes
        if ("genes" in xxx) return xxx.genes;  // eg a dispobj
        if ("dispobj" in xxx) return xxx.dispobj.genes;  // eg a slot
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
    if (typeof filter === 'object' && !(filter instanceof RegExp)) return filter;
    // const list = usedgenes();
    // if (!list) return {};
    var list;


    // if (filter === undefined) filter = '(' + W.genefilter.value + ')' + (W.guifilter ?  ' (' + W.guifilter.value + ')' : '');
    if (filter === undefined) filter = (W.genefilter.value.trim() ?  W.genefilter : W.guifilter).value;
    const regexp = makeRegexp(filter);

    const res = {};
    const allg = Object.assign({}, currentGenes, guigenes);
    for (let gn in allg) {
        let gd = genedefs[gn];
        if (!gd)
            gd = {tag: 'unknown no genedef'};
        const gnl = "gn:" + gn.toLowerCase() + ": tag:" + gd.tag + ": state:" + (gd.free ? 'free' : 'frozen') + ': help:' + gd.help + ':';
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
            display = regexp.test(gnl);
        }
        if (display) res[gn] = true;
    }
    return res;
}

/** apply filter to a set of genes */
function applyFilter(genes, filter) {
    const ff = resolveFilter(filter);
    const r = {};
    for (const gn in ff) {
        if (gn in genes) r[gn] = genes[gn]
    }
    return r;
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
    const togglefree = evt && evt.key === "F2";
    let /** @type number | string */ setting = "?";
    const todisp = resolveFilter();
    for (let gn in guigenes) {
        const display = todisp[gn];
        let ee = guigenes[gn];
        if (display) {
            while (ee && ee !== W.controls) {
                if (ee.style.display === 'none')
                    ee.style.display = '';
                ee = ee.parentElement;
            }
        } else {
            ee.style.display === 'none';
        }

        // guigenes[gn].style.display = display ? "" : "none";
        if (togglefree && display) {
            if (setting === "?") setting = 1 - genedefs[gn].free;
            if (genedefs[gn].free !== setting) toggleFree(gn);
        }
        if (rows && rows[gn]) rows[gn].style.display = display ? "" : "none";
    }
    W.controls.onmousemove();
}

var clipboard;
/** copy filtered genes to clipboard */
function copygenestoclip(genes) {
    genes = genes || lastDispobj.genes || currentGenes; // will fail if no lastDispob, fix later
    const s = resolveFilter();
    clipboard = {};
    for (let gn in s) clipboard[gn] = genes[gn];
    navigator.clipboard.writeText(JSON.stringify({genes:clipboard},undefined, '\t'))
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


/** edit function ... default nothing */
//function editobj() {}


function regenHornShader(ops) {
    const sss = W.mystats.style.display;
    clearPostCache('regenHornShader');
    HW.setHornSet();
    forcerefresh = true;
    onframe(() => remakeShaders(ops), 2); // >>> todo check why delay needed
    onframe(() => W.mystats.style.display = sss, 3);
}


/** main object has changed, refresh, and add n extra 'active' frames if n set */
function newmain(n = 0) {
    newframe(currentGenes);
    if (alwaysNewframe < n) alwaysNewframe = n;
}
var refmain = newmain;      // var for sharing, otherwise const

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
    if (hoverMutateMode || (healthMutateSettings && healthMutateSettings.touchHealth)) healthMutateStep();
    if (startOSCBundle && Maestro) {
        globalSynthUpdate();
    }
    myRequestAnimationFrame();
}

let isControlShown = true;  // slave value for query only for is control visible

/** show or hide controls, if set wifrom toggle (alt-c) do not allow to be lost from mouse move */
function showControls(v) {
    try {
        if (exhibitionMode) v = false;
        inputs.fixcontrols = W.fixcontrols.checked; // in case not yet updated
        if (inputs.fixcontrols) v = true;
        if (v && !_showControlsdone) {   // seems overcomplicated way of getting initial display right
            onframe(()=> {
                filterDOMEv();
                W.valouter.style.display = 'none';
                _showControlsdone = true;
            });
        }

        if (inputs.fixcontrols && !isControlShown) {
            W.controls.style.display = W.guifilter.style.display = "";
            //isControlShown = true;
        }

        if (v === "fixon") {
            _showControlssetFromToggle = v = true;
        // } else if (v === false || v === true) { NO explicit true/false are overridden by _showControlssetFromToggle
        } else if (v === "toggle") {
            _showControlssetFromToggle = v = W.controls.style.display === "none";
            //isControlShown = false;
        } else  {
            if (_showControlssetFromToggle) return;
        }

        // if (v === isControlShown) return;  // minor optimization, often got wrong if new object loaded from gui

        W.controls.style.display = W.guifilter.style.display = v ?  "" : "none";
        const msgstyle = W.msgbox.style;
        if (v && !isControlShown) {
            updateGuiGenes();
            msgstyle.left = '360px';
            //isControlShown = v;
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
            if (document.activeElement === document.body || document.activeElement === canvas)
                // @ts-ignore
                window.getSelection().removeAllRanges();  // get around
            msgstyle.left = v || inputs.showstats ? '360px' : '10px';
        }
        if (W.msgbox.right) { msgstyle.left = 'unset'; msgstyle.right = '10px'; }
    } finally {
        isControlShown = W.controls.style.display === '';
        if (isControlShown) W.controlsouter.style.top = (reserveSlots && slots[1]) ? slots[1].height + 'px' : '';
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
    // tranrule now moved left so contros can be full height
    // ot = W._tranrule.style.display === 'none' ? bot: W._tranrule.getBoundingClientRect().top;
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
            mmsg += " horns=" + HW.getHornSet(currentGenes).horncount;
            mmsg += " mesh=" + HW.getHornSet(currentGenes).meshused;
        }
        if (_performance.memory)
            mmsg += "  usedHeap=" + _performance.memory.usedJSHeapSize;
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
    if (fileExists(baseroot + stem))
        genBoundsFromPrefixFS(stem);
    else
        genBoundsFromPrefixGal(stem);
}



/**
 * NOT WORKING QUITE AS INTENDED JUST YET...
 * @param {string} filter
 * @param {DispobjC} srcObj name or genome object to copy from
 * @param {DispobjC} targObj name or object *NB current implementation will mutate this, not clone it* not good for pure FP
 * @returns {DispobjC} the mutated targObj
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

var geneOverrides = {};

/** override mechanism for genes */
var GO = new Proxy({}, {
    get : (ig, name) =>
        name === 'ownKeys' ?
            () => Reflect.ownKeys(uniforms) :
            name in geneOverrides  ? geneOverrides[name] : currentGenes ? currentGenes[name] : undefined,
    set : (ig, name, v) => (name in geneOverrides ? geneOverrides : currentGenes ? currentGenes : {})[name] = v,
    ownKeys : (o) => {
        let x = Reflect.ownKeys(uniforms);
        // log('...', x);
        return x;
    }   // Object.keys(U) calls this, and x is ok, but returns []
    // !!! enumerate maynot work ...
});

/** set gene mutation from visibility */
function mutateVisibleGenes() {
    for (let gn in genedefs) {
        genedefs[gn].free = +(guigenes[gn] && guigenes[gn].style.display === '')
    }
    updateGuiGenes();
}

/** mutate Colour genes */
function mutateColour() {
    regularizeColourGeneVisibility();
    mutate({filter: 'tag:horncol: | tag:texture:'});
}

/** mutate form genes */
function mutateForm() {
    mutate({filter: 'tag:geom:'});
}

/** filters used to define classes opf genes */
var geneClasses = {
    C: 'red | green | blue',
    T: 'texscale | texrepeat | _band | gn:band',    // NOT subband for now
    F: 'tag:geom | gscale | _gcentre | tranrule',
    S: 'gloss | plastic | shininess',
    V: 'gn:_ | gscale | gcentre',
    A: '||'
}

/** mutate genes from gui */
function mutateXX() {
    regularizeColourGeneVisibility();
    const ff = []
    if (inputs.mut_form) ff.push(geneClasses.F);
    if (inputs.mut_col) ff.push(geneClasses.C);
    if (inputs.mut_tex) ff.push(geneClasses.T);  // NOT subband for now
    if (inputs.mut_surf) ff.push(geneClasses.S);
    if (inputs.mut_view) ff.push(geneClasses.V);
    if (inputs.mut_user.trim() !== '') ff.push(inputs.mut_user.trim());
    const structmutate = (inputs.mut_smut) ? mutateStructHs : undefined;
    mutate({filter: ff.join(' | '), structmutate});
}


/** paste selected genes */
async function pastSelectGenes(v) {
    const text = await navigator.clipboard.readText();
    if (text.match(/{\s*"genes"\:/)) {
        const ngenes = JSON.parse(text).genes;
        const nfgenes = applyFilter(ngenes, geneClasses[v]);
        const genes = xxxgenes(hoverDispobj);
        copyFrom(genes, nfgenes);
        hoverDispobj.render();
        console.log('paste', v);
        return true;
    }
    return false;
}


/** set up appropriate colour genes for mutation */
function regularizeColourGeneVisibility() {
    setAllLots('tag:horncol: | tag:texture:', {free:1})
    setAllLots('gn:tex | _tex', {free:0})
    setAllLots('texscale', {free:1})
    // ??? pending freeze?
    setAllLots('refl  | irid |  flu', 0); setAllLots('fluwidth', 0.01); // setAllLots('texscale', 1);
    setAllLots('refl  | irid |  flu', {free: 0});
}

var ctrlContextGenes, ctrlContextBaseGenes, ctrlContextNewGenes;
/** context menu displayed by clicking ctrl key */
async function ctrlContextMenu() {
    const text = await navigator.clipboard.readText();
    if (text.match(/{\s*"genes"\:/)) {
        W.contextPaste.style.display = '';
        W.contextNoPaste.style.display = 'none'
        ctrlContextNewGenes = JSON.parse(text).genes;
        ctrlContextGenes = xxxgenes(hoverDispobj);
        ctrlContextBaseGenes = {}; copyFrom(ctrlContextBaseGenes, ctrlContextGenes);
        doCtrlContext();
    } else {
        W.contextNoPaste.style.display = '';
        W.contextPaste.style.display = 'none'
    }
    const style = W.geneContextMenu.style;
    style.display = '';
    style.top = lastdocy + 'px';
    style.left = lastdocx + 'px';
}

/** hide context menu */
function endCtrlContextMenu() {
    W.geneContextMenu.style.display = 'none';
}

/** copy the control context genes to clipboard */
function copyCtrlContextgenestoclip() {
    copygenestoclip(ctrlContextGenes)
}

function doCtrlContext(evt) {
    copyFrom(ctrlContextGenes, ctrlContextBaseGenes);   // reestablish 'base' genes
    const ff = [];
    if (inputs.context_form) ff.push(geneClasses.F);
    if (inputs.context_col) ff.push(geneClasses.C);
    if (inputs.context_tex) ff.push(geneClasses.T);
    if (inputs.context_surf) ff.push(geneClasses.S);
    if (inputs.context_view) ff.push(geneClasses.V);
    if (inputs.context_all) ff.push(geneClasses.A);
    if (ff.length !== 0) {
        const filter = resolveFilter(ff.join(' | '));
        copyFrom(ctrlContextGenes, ctrlContextNewGenes, filter);
    }
    document.getElementById("tranrulebox").textContent = ctrlContextGenes.tranrule;
    xxxdispobj(ctrlContextGenes).render();
}

/** for setting values in all objects, and get from currentGenes */
var GGG = new Proxy(currentGenes ?? {}, {
    get: (o, n) => currentGenes[n],
    set: (o, n, v) => {
        for (const oo of Object.values(currentGenes)) {
            if (oo?.genes) oo.genes[n] = v;
        }
        refall();
        return true;
    },
    ownKeys : (o) => Reflect.ownKeys(currentGenes)
});


/** for setting values in all objects, and ramp on currentGenes */
var RGG = new Proxy(currentGenes ?? {}, {
    get: (o, n) => currentGenes[n],
    set: (o, n, v) => {
        for (const oo of Object.values(currentObjects)) {
            const genes = oo.genes;
            if (genes === currentGenes)
                RG[n] = v;      // do ramp
            else if (genes)
                genes[n] = v;
        }
        refall();
        return true;
    },
    ownKeys : (o) => Reflect.ownKeys(currentGenes)
});


/** exaggerated s-curve. k=0 gives min/max. k=0.5 skewed to edges, k=1 linear, k=2 skewed to centre/average, k=9999 always centre */
var scurvex = (k, r = Math.random()) => {
    const rr = r*2 - 1;
    const y = Math.sign(rr) * Math.abs(rr) ** k;
    return (y + 1) / 2
}

/** very random */
var randmuts = async function randmuts({k = 0.5, slot, tag = 'geom'} = {}) {
    if (!slot) {
        for(const sl of slots) {
            if (!sl || sl.dispobj.selected) continue;
            randmuts({k, slot: sl.dispobj, tag})
            await S.frame();
        }
        return;
    }
    const g = xxxgenes(slot);
    for(const gn in genedefs) {
        const gd = genedefs[gn];
        if (gd.free && (tag === '*' || gd.tag===tag))
            g[gn] = gd.min + scurvex(k) * (gd.max-gd.min);
    }
    centrescalenow(slot);
}
