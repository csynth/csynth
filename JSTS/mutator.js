/*
 * Code to hold the central mutation algorithms.
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 *
 * gfx.vr.openvr-runtime
 * C:\Program Files (x86)\Steam\steamapps\common\SteamVR\bin\win64\openvr_api.dll
 */
"use strict";
var WA = W;
/** for encapsulation verification */
// /** mutate given object, filter will only mutate matching genes */
// function mutateReplace(vn: number, marryFun: MarryFun = marry, filter?: [string], mutateFrozen: number = 0) {
//     saveundo();
//     //vn = vn || 1;
//     if (!vn) return undefined;
//     // marryFun = marryFun || marry;
//     //sort objects by health, then select parents from somewhat near the 'best'
//     //could also consider sort by distance to current
//     //for now, just choose the healthiest specimen and marry it with the currentGenes
//     let selObj: Genes, mHealth: number = Number.MIN_VALUE;
//     for (let o in currentObjects) {
//         var dispobj = currentObjects[o];
//         if (dispobj.hoverHealth > mHealth) {
//             selObj = xxxgenes(dispobj);
//         }
//     }
//     var sobj = marryFun(currentGenes, selObj, filter);
//     // at least for now, do not mutate as well as smutate
//     /// easier for debug!
//     if ((!HW) || marryFun !== HW.randrulemarry)
//         sobj = _mutateObj(sobj, getmutrate(), filter, mutateFrozen);
//     setgenes(vn, sobj);
//     /* I don't know about this... skipping
//     // structure mutation can be slow, so render results as found
//     if (marryFun === randrulemarry) {
//         newmain();
//         console.log("mutated " + vn + ">" + xxxgenes(vn).tranrule);
//         setTimeout(function() { mutate(start+1, marryFun); }, 1000);
//         return;
//         //render(xxxgenes(vn), vn);
//     }*/
//     //autofillfun = function() {};
//     //forcerefresh = true;
//     //newmain();
//     //renderObj(sobj, vn);
//     return sobj;
// }
function myMutate(genes, res, mutrate) { }
function myMarry(genes, res) { }
function reformRule() { }
/** random swap of two elements of array */
function randswap(a) {
    var swapi = randi(a.length - 1);
    var o = a[swapi];
    a[swapi] = a[swapi + 1];
    a[swapi + 1] = o;
}
var mutvary = 0; /* range of 10^2 = 100, 10 each way, random */
var mutvarybyslot = 10; /* vary mutation rate from top of screen to bottom, regular */
var mutUseCurated = 0.1; /** proportion of curated to mix */
var mutCurated = []; /** candidate curated */
var postmutFixgenes = {}; /** forced values for genes after mutation */
var mutateOrientation = 'none'; /** true to mutate orentation values such as _qux, _panx */
/** mutate an object, return new one */
const _mutateObj = function (genes, mutrate, filter, mutateFrozen, slotw = 0) {
    let res = {};
    if (mutUseCurated > 0 && mutCurated.length > 0 && Math.random() < mutUseCurated) {
        copyFrom(res, randfrom(mutCurated));
        newframe(res);
        return res;
    }
    for (var tryy = 0; tryy < 5; tryy++) {
        // filter = filter || "";
        // var res = clone(genes);  // to pick up _camz etc etc
        copyFrom(res, genes);
        // todo: XXX consider something less liberal
        const mutvaryslot = mutvarybyslot * (slotw / realNumslots - 0.5);
        var xrate = Math.pow(10, (mutvary * (Math.random() - 0.5) + mutvaryslot) * 0.1); // decibels=>linear
        // log(`mutate object slot=${slot} ${realvn}, mutvaryslot=${mutvaryslot}, xrate=${xrate}, final=${xrate*mutrate}`);
        for (var gn in genedefs) {
            if (!(gn in filter))
                continue;
            var gdef = genedefs[gn];
            var ar = gdef.activerate(mutateFrozen);
            if (ar === 0)
                continue;
            var v = genes[gn];
            if (v === undefined)
                v = gdef.def;
            var min = gdef.min;
            var max = gdef.max;
            var step = gdef.delta * ar;
            var vv1 = v + xrate * mutrate * step * (Math.random() - 0.5);
            var vv2 = _mutateObj.ignoreRange ? vv1 : Math.min(max, Math.max(min, vv1));
            res[gn] = vv2;
            //setval(i, vv2);
        }
        //res.tranrule = genes.tranrule;
        myMutate(genes, res, mutrate);
        //resetMat(undefined, res);  // !!! if there force front orientation, else use orientation from parent
        // centre and scale the objects, and check the result reasonable
        // return if ok, otherwise look to try again
        var rr;
        if (!inputs.NOSCALE && !(mutateOrientation === 'all') && W.centrescale) {
            centrescale.lastgenes = undefined; // force repeat of centrescale, same genes object, but content changed
            rr = centrescale(res, "now", 1, false); // for GPUSCALE done on display
        }
        // did use zoomdef.camz0 * basescale, changed 8 Feb 2019
        // removed completely 28 June 2022, currentGenes may not be a sensible parent,
        // and _camz probably not muated anyway as not in genedefs
        // if (zoomdef) res._camz = currentGenes._camz;
        if (!rr)
            break; // no cnetrescale in fano
        if (rr.hx - rr.lx > 1 && rr.hy - rr.ly > 1 && rr.hz - rr.lz > 1 && rr.gscale > 0.01 && !isNaN(rr.gscale))
            break;
        //console.log("mutation rejected, retry " + tryy);
    } // loop of tries
    newframe(res);
    return res;
};
var m_mutateObj = window.m_mutateObj = _mutateObj;
/* crossover probability */ var xprob = 0.2;
/** marry two objects, and return result. */
function marry(o1, o2, filter) {
    if (o1 === undefined)
        o1 = o2;
    if (o2 === undefined)
        return undefined;
    var ch = o1;
    var res = {};
    for (var gn in o1) {
        res[gn] = ch[gn]; // ??? filter has no sensible role here ???
        if (Math.random() < xprob)
            ch = ch === o1 ? o2 : o1;
    }
    // for now, don't try to be clever with structure marriage
    res.tranrule = o1.tranrule;
    myMarry(o1, res);
    return res;
}
/** random rules mutate, mutation objects */
//function randrulemutate() {
//    throwe("OBSOLETE CODE");
//    mutate(1, HW.randrulemarry);
//}
/** marry two objects with structure mutation:
* by default, just return the first
 * */
let randrulemarry = function (obj1, obj2) { return obj1; };
/** random rules, just the current object*/
function randrule(genes = currentGenes) {
    saveundo();
    var res = WA.randrules(); // where is randrules defined
    setGUITranrule(genes);
    //setMaterial(res);  // done on demand
    currentGenes.tranrule = res;
    target.tranrule = res;
    setGUITranrule(genes);
    return res;
}
// /** mutate currentGenes to new target */
// function mutate1(filter: Genes = resolveFilter(), mutateFrozen: number) {
//     //saveundo(); //this will happen in settarget
//     settarget( _mutateObj(currentGenes, getmutrate(), filter, mutateFrozen));
// }
var reserveSlots = 0; // number of slots to reserve from mutation
var mutreserved = {}; // speciic reserved slots
/** mutate selected objects to fill non-selected, filter will only mutate matching genes
 * initnosel is list to replace: if not specified replace all non-selected.
 * */
function mutate({ nosel, marryFun = marry, filter, structmutate, animate, onIndividualDone, onPopulationDone, mutateFrozen = 0 } = {}) {
    filter = resolveFilter(filter || ''); // if filter not given we want to choose all, regardless of
    if (!mutateFrozen) {
        for (const gn in filter)
            if (!genedefs[gn] || genedefs[gn].free === 0)
                delete filter[gn];
        // log(Object.keys(filter));
    }
    // help keep correct scale between mutations (no easy recover and restore csale genes in GPUSCALE? TODO)
    // BUT this has now been resolved (I hope) Stephen, 27 Oct 2022
    // setInput(W.GPUSCALE, false);
    if (!currentGenes)
        debugger;
    saveundo();
    if (nosel)
        nosel = nosel.map(d => xxxdispobj(d));
    //marryFun = marryFun || marry;
    var sel = [], _nosel = [];
    // separate selected and not selected
    for (var o in currentObjects) {
        var dispobj = currentObjects[o];
        if ((dispobj.selected || (WA.parentvps && parentvps.indexOf(dispobj.vn) !== -1))
            && dispobj.genes
            && !(dualmode && dispobj.vn === mainvp)
        //vp.col === vps[0]-1 && dispobj.genes.tranrule === currentGenes.tranrule
        ) {
            sel.push(dispobj);
        }
        else if (dispobj.vn <= reserveSlots && dispobj.genes) {
            // do not replace reserved slots (unless they are empty)
        }
        else if (mutreserved[dispobj.vn]) {
            // do not use mutreserved slots
        }
        else {
            _nosel.push(dispobj);
        }
    }
    if (nosel)
        _nosel = nosel;
    if (sel.length === 0) {
        sel = [slots[dualmode ? 1 : mainvp].dispobj];
        removeElement(_nosel, sel[0]); // don't mutate force selected element
    }
    removeElement(_nosel, slots[mainvp].dispobj); // never mutate main element
    removeElement(_nosel, sel); // or selected object if different
    // make the objects with slots play out in slot order
    _nosel.sort(function (a, b) { return a.vn - b.vn; });
    _mut(sel, _nosel, marryFun, structmutate, filter, mutateFrozen, getmutrate(), animate, onIndividualDone, onPopulationDone);
    autofillfun = mutate;
    // clampAllGeneRanges();    // much to extreme, eg for frozen genes sjpt 11 Aug 17
    //forcerefresh = true;  // not needed if done one at a time
    newframe();
}
/** mutate, maybe overwrite mutrate */
function clickmutate(evt) {
    if (evt.shiftKey)
        inps.mutrate = 20;
    if (evt.ctrlKey)
        inps.mutrate = -20;
    mutate();
}
/**
 * Mutate with asyncronous callbacks for when each individual is done,
 * and when the entire population is.
 * Added when mutate took long list of arguments, now almost equivalent (except onIndividualDone, onPopulationDone required arguments)
 * @returns {undefined}
 */
function mutateAsync(onIndividualDone, onPopulationDone) {
    mutate({ onIndividualDone, onPopulationDone });
}
;
// var mutaterlist = [-5, 5, 15], mutaterpos = 0;
/** mutate with random rate from list */
function mutater() {
    var s = inputs.mutrate;
    //    tryseteleval('mutrate', mutaterlist[mutaterpos++ % mutaterlist.length]);
    tryseteleval('mutrate', 10);
    log("mutate at standard rate", inputs.mutrate);
    mutate();
    tryseteleval('mutrate', s);
}
var slowMutate = true; // number = interval between batches, true is 100ms, false does all as one batch
var mutateBatch = 1; // batch size of mutate group, ignored for slowMutate = false
/** mutate new values for slots nosel using sel as parents */
function _mut(sel, nosel, marryFun, structmutate, filter, mutateFrozen, mutrate, animate, onIndividualDone, onPopulationDone) {
    if (!marryFun)
        marryFun = marry;
    // animate=true; // TEMP
    const mb = slowMutate === false ? 9999999 : mutateBatch;
    for (let bn = 0; bn < mb; bn++) { // for slowMutate only once each call, else nosel.length times
        if (nosel.length === 0) {
            if (onPopulationDone)
                onPopulationDone();
            Maestro.trigger("populationDone");
            // onframe(() => centreall());    // should have been done for frames that needed it, but ...??? 7 Oct 2022
            if (Director)
                Director.framesFromSlots();
            return;
        }
        var targDispobj = nosel.splice(0, 1)[0]; // target
        // find close parent
        sel.sort(function (a, b) { return targDispobj.dist(a) - targDispobj.dist(b); });
        var svn1 = 0; // Math.floor(Math.random()*sel.length);
        var sdo1 = sel[svn1];
        var sgenes1 = sdo1.genes;
        var svn2 = sel.length > 1 ? 1 + Math.floor(Math.random() * (sel.length - 1)) : 0;
        // debug svn2 = svn1;
        var sdo2 = sel[svn2];
        var sgenes2 = sdo2.genes;
        //if (sdo1 !== sdo2)
        //    log("marry " + xxxdispobj(sel[svn1]).vn + "." +  xxxdispobj(sel[svn2]).vn + "->" + targDispobj.vn);
        if (structmutate) {
            sgenes1 = structmutate(sgenes1, sdo1, targDispobj); // <<< ??? should this use filter in some way ???
        }
        var sgenes = marryFun(sgenes1, sgenes2, filter);
        // at least for now, do not mutate as well as smutate
        /// easier for debug!
        if ((!WA.HW) || marryFun !== HW.randrulemarry)
            sgenes = _mutateObj(sgenes, mutrate, filter, mutateFrozen, slots[targDispobj.vn].realvn);
        copyFrom(sgenes, postmutFixgenes);
        targDispobj.genes = sgenes;
        targDispobj.lastTouchedDate = targDispobj.createDate = Date.now();
        // pjt hacking in some sound effects... TODO use Maestro or something for this instead
        if (WA.interfaceSounds) {
            var pan = (targDispobj.cx / 1920) - 0.5;
            if (interfaceSounds.bip2)
                interfaceSounds.bip2.play(6, pan, 0.2 + Math.random() * 4);
        }
        if (onIndividualDone)
            onIndividualDone(targDispobj, sdo1, sdo2);
        Maestro.trigger("individualDone", { targDispobj, sdo1, sdo2 });
        // !!! code below animates move of object from first parent position to correct slot
        if (animate) {
            targDispobj.cx = sdo1.cx;
            targDispobj.cy = sdo1.y;
        }
        newframe(targDispobj);
        centrescale.lastgenes = undefined; // force centrescale to do its job, (stop bad optimization)
        if (mutateOrientation !== 'none') {
            genestoRot4(sgenes); // ensure the orientation genes are captured in _rot4_ele
        }
        else {
            centrescale(targDispobj, undefined, 1);
        }
    } //end  batch
    // structure mutation can be slow, so render results as found
    //console.log("mutated " + vn + ">" + xxxgenes(vn).tranrule);
    function nextmut() {
        _mut(sel, nosel, marryFun, structmutate, filter, mutateFrozen, mutrate, animate, onIndividualDone, onPopulationDone);
    }
    //if (slowMutate !== false || marryFun === randrulemarry) {
    if (slowMutate === 1)
        onframe(nextmut);
    else
        setTimeout(() => onframe(nextmut), slowMutate === true ? 100 : slowMutate);
    //    return;
    //} else {
    //    // iterate the loopnextmut();
    //}
}
//type Randobj = {pending?: number} & ((genes, reset?, filter?, all?) => any) ;
var testrandobj; //??? testrandobj.pending;
/** make random object by setting new values in genes
reset also forces material reset
filter filters just some genes
all=true means even frozen genes will be randomized
*/
var randobj = function (genes = currentGenes, reset = true, filter, all) {
    if (restoringInputState)
        return;
    var gg = resolveFilter(filter);
    for (var gn in gg) {
        var gd = genedefs[gn];
        if (!gd)
            continue;
        if (gd.free || all) {
            genes[gn] = gd.min + random() * (gd.max - gd.min);
            if (gn.indexOf('red') + gn.indexOf('green') + gn.indexOf('blue') !== -3)
                genes[gn] *= genes[gn]; // colour compensate
        }
    }
    if (reset)
        resetMat();
    newmain();
    if (randobj.pending) {
        clearTimeout(randobj.pending);
        randobj.pending = 0;
    }
    //use window.setTimeout to disambiguate as node setTimeout returns NodeJS.Timer
    if (W.sliderate.value - 0)
        randobj.pending = window.setTimeout(randobj, W.sliderate.value * 100);
    // updateGuiGenes(); // not usually, too expensive
    return genes;
};
function randlots(n, genes, keys, data) {
    var dir = "q:/dropbox/zegamiImages/";
    // var dir = "c:/temp/zegamiImages/";
    genes = genes || currentGenes;
    if (!keys) {
        var xkeys = Object.keys(currentGenes);
        keys = ['fid'];
        for (let i = 0; i < xkeys.length; i++) {
            var gn = xkeys[i];
            if (typeof currentGenes[gn] === 'number')
                keys.push(gn);
        }
        data = [];
        data.push(keys.join("\t"));
        data.push(currentGenes.tranrule.replace(/\r/g, "\\r").replace(/\n/g, "\\n"));
    }
    else {
        var fid = currentGenes.name + n + ".jpg";
        saveframe(dir + fid);
        var ndata = [fid];
        for (let i = 1; i < keys.length; i++)
            ndata.push(currentGenes[keys[i]]);
        data.push(ndata.join("\t"));
    }
    if (n <= 0) {
        // log(data.join("\n"));
        writetextremote(dir + currentGenes.name + "_features.txt", data.join("\n"));
        return;
    }
    setTimeout(function () { randlots(n - 1, genes, keys, data); }, 5);
    randobj(genes);
}
/** get the current mutation rate appropriately scaled */
function getmutrate() {
    return +W.mutrate.min === inputs.mutrate ? 0 : Math.pow(10, inputs.mutrate * 0.1);
}
// shorthand, especially useful in debug, moved up for use in combined code
//delete window.G;
//Object.defineProperty(window, 'G', { get : function() { return currentGenes; } });
function setupViewMutation(rotonly = false) {
    mutateOrientation = rotonly ? 'rotonly' : 'all';
    addgene('_qux', 0, -1, 1, 0.1, 0.1, 'orient', 'orient', 1);
    addgene('_quy', 0, -1, 1, 0.1, 0.1, 'orient', 'orient', 1);
    addgene('_quz', 0, -1, 1, 0.1, 0.1, 'orient', 'orient', 1);
    addgene('_quw', 0, -1, 1, 0.1, 0.1, 'orient', 'orient', 1);
    if (rotonly)
        return;
    addgene('_panx', 0, -2000, 2000, 10, 10, 'orient', 'orient', 1);
    addgene('_pany', 0, -2000, 2000, 10, 10, 'orient', 'orient', 1);
    addgene('_panx', 0, -2000, 2000, 10, 10, 'orient', 'orient', 1);
    addgene('_uScale', 1, 0, 20, 0.01, 0.01, 'orient', 'orient', 1);
    delete postmutFixgenes._uScale;
    // setAllLots('', {free:0}); setAllLots('orient', {free:1}); updateGuiGenes()
}
//# sourceMappingURL=mutator.js.map