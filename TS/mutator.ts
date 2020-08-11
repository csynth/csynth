/*
 * Code to hold the central mutation algorithms.
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 *
 * gfx.vr.openvr-runtime
 * C:\Program Files (x86)\Steam\steamapps\common\SteamVR\bin\win64\openvr_api.dll
 */
"use strict";

type Uniforms = {[k:string]: {type:string, value: any, tag?: any, framenum: number }};
type Input = HTMLInputElement & {value: any; hasParent(p): boolean };

type Genedef = {name: string, def: number, min: number, max:
        number, step: number, delta: number, tag: string, activerate: ()=>number, free: number, lastaddframe: number,
        help: string, fromSynthCode?: boolean};
type Genedefs = {[gn:string]: Genedef};
type MarryFun = (o1: Geneset, o2: Geneset, filter? : [string])=> Geneset;
type Xstring = string & {replaceall: (old: string, nnew: string) => Xstring,
    post:(Xstring) => Xstring, endsWith:(string) => boolean, startsWith:(string) => boolean};

var WA = (W as any);

/** for encapsulation verification */


/** mutate given object, filter will only mutate matching genes */
function mutateReplace(vn: number, marryFun: MarryFun = marry, filter?: [string]) {
    saveundo();
    //vn = vn || 1;
    if (!vn) return undefined;
    // marryFun = marryFun || marry;

    //sort objects by health, then select parents from somewhat near the 'best'
    //could also consider sort by distance to current
    //for now, just choose the healthiest specimen and marry it with the currentGenes
    let selObj: Geneset, mHealth: number = Number.MIN_VALUE;
    for (let o in currentObjects) {
        var dispobj = currentObjects[o];
        if (dispobj.hoverHealth > mHealth) {
            selObj = xxxgenes(dispobj);
        }
    }

    var sobj = marryFun(currentGenes, selObj, filter);
    // at least for now, do not mutate as well as smutate
    /// easier for debug!
    if ((!HornWrap) || marryFun !== HornWrap.randrulemarry)
        sobj = mutateObj(sobj, getmutrate(), filter);
    setgenes(vn, sobj);

    /* I don't know about this... skipping
    // structure mutation can be slow, so render results as found
    if (marryFun === randrulemarry) {
        newmain();
        console.log("mutated " + vn + ">" + xxxgenes(vn).tranrule);
        setTimeout(function() { mutate(start+1, marryFun); }, 1000);
        return;
        //render(xxxgenes(vn), vn);
    }*/
    //autofillfun = function() {};
    //forcerefresh = true;
    //newmain();
    //renderObj(sobj, vn);

    return sobj;
}

function  myMutate(genes, res, mutrate) { }
function  myMarry(genes, res) { }
function reformRule() {}

/** random swap of two elements of array */
function randswap(a) {
    var swapi = randi(a.length-1);
    var o = a[swapi]; a[swapi] = a[swapi+1]; a[swapi+1] = o;
}

var mutvary = 2; /* range of 10^2 = 100, 10 each way */
/** mutate and object, return new one */
const mutateObj: ((genes, mutrate, filter?)=>Genedefs) & {ignoreRange?} = function(genes, mutrate, filter = undefined) {
    for (var tryy = 0; tryy < 5; tryy++) {
        filter = filter || "";
        var res = clone(genes);  // to pick up _camz etc etc
        // todo: XXX consider something less liberal
        var xrate = Math.pow(10, mutvary*(Math.random() - 0.5));
        for (var gn in genedefs) {
            if (gn.indexOf(filter) === -1) continue;
            var gdef = genedefs[gn];
            var ar = gdef.activerate();
            if (ar === 0) continue;
            var v = genes[gn];
            if (v === undefined) v = gdef.def;
            var min = gdef.min;
            var max = gdef.max;
            var step = gdef.delta * ar;
            var vv1 = v + xrate * mutrate * step * (Math.random() - 0.5);
            var vv2 = mutateObj.ignoreRange ? vv1 : Math.min(max, Math.max(min, vv1));
            res[gn] = vv2;
            //setval(i, vv2);
        }
        //res.tranrule = genes.tranrule;
        myMutate(genes, res, mutrate);

        //resetMat(undefined, res);  // !!! if there force front orientation, else use orientation from parent
        // centre and scale the objects, and check the result reasonable
        // return if ok, otherwise look to try again
        var rr;
        if (!inputs.GPUSCALE && W.centrescale)
            rr = centrescale(res, "now", 1);  // for GPUSCALE done on display
        if (zoomdef) res._camz = currentGenes._camz;  // did use zoomdef.camz0 * basescale, changed 8 Feb 2019
        if (!rr) break; // no cnetrescale in fano
        if (rr.hx - rr.lx > 1 && rr.hy - rr.ly > 1 && rr.hz - rr.lz > 1 && rr.gscale > 0.01 && !isNaN(rr.gscale))
            break;
        //console.log("mutation rejected, retry " + tryy);
    }
    newframe(res);
    return res;
}

type Geneset = { [x:string]: any };  // todo, best way to special case tranrule, _rot4_ele, ...???, or just any
/* crossover probability */var xprob = 0.2;
/** marry two objects, and return result. */
function marry(o1, o2) {
    if (o1 === undefined) o1 = o2;
    if (o2 === undefined) return undefined;
    var ch = o1;
    var res : Geneset = {};
    for (var gn in o1) {
        res[gn] = ch[gn];
        if (Math.random() < xprob) ch = ch === o1 ? o2 : o1;
    }
    // for now, don't try to be clever with structure marriage
    res.tranrule = o1.tranrule;
    myMarry(o1, res);
    return res;
}



/** random rules mutate, mutation objects */
//function randrulemutate() {
//    throwe("OBSOLETE CODE");
//    mutate(1, HornWrap.randrulemarry);
//}

/** marry two objects with structure mutation:
* by default, just return the first
 * */
function randrulemarry(obj1, obj2) { return obj1; }

/** random rules, just the current object*/
function randrule() {
    saveundo();
    var res = WA.randrules();  // where is randrules defined
    setGUITranrule();
    //setMaterial(res);  // done on demand
    currentGenes.tranrule = res;
    target.tranrule = res;
    setGUITranrule();

    return res;
}

/** mutate currentGenes to new target */
function mutate1() {
    //saveundo(); //this will happen in settarget
    settarget( mutateObj(currentGenes, getmutrate()));
}

var reserveSlots = 0;    // number of slots to reserve from mutation
/** mutate selected objects to fill non-selected, filter will only mutate matching genes
 * initnosel is list to replace: if not specified replace all non-selected.
 * pjt: Not much fun having such a long list of arguments, especially when it's the last
 * one's we're interested in, so added mutateAsync below.
 * */
function mutate(initnosel?, marryFun: (o1:Geneset, o2:Geneset)=>Geneset = marry, filter?, animate?, onIndividualDone?, onPopulationDone?) {
//        animate = true; // temp TODO |||
if (!currentGenes)
debugger;
    saveundo();
    //marryFun = marryFun || marry;
    var sel = [], nosel=[];

    // separate selected and not selected
    for (var o in currentObjects) {
        var dispobj = currentObjects[o];
        if ((dispobj.selected || (WA.parentvps && parentvps.indexOf(dispobj.vn) !== -1)) &&
            //vp.col === vps[0]-1 &&
            dispobj.genes &&
            dispobj.genes.tranrule === currentGenes.tranrule
            )
            sel.push(dispobj);
        else if (dispobj.vn <= reserveSlots)
            {}    // do not replace reserved slots
        else
            nosel.push(dispobj);
    }
    if (initnosel) nosel = initnosel;
    if (sel.length === 0) {
        sel = [slots[mainvp].dispobj];
        removeElement(nosel, slots[mainvp].dispobj);
    }

    // make the objects with slots play out in slot order
    nosel.sort(function(a,b) {return a.vn - b.vn;} );

    _mut(sel, nosel, marryFun, filter, getmutrate(), animate, onIndividualDone, onPopulationDone);
    autofillfun = mutate;
    // clampAllGeneRanges();    // much to extreme, eg for frozen genes sjpt 11 Aug 17
    //forcerefresh = true;  // not needed if done one at a time
    newframe();
}

/**
 * Mutate with asyncronous callbacks for when each individual is done,
 * and when the entire population is.
 * @returns {undefined}
 */
function mutateAsync(onIndividualDone, onPopulationDone) {
    mutate(null, null, null, null, onIndividualDone, onPopulationDone);
};

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

var slowMutate:any = true;  // number = interval between batches, true is 100ms, false does all as one batch
var mutateBatch = 1;    // batch size of mutate group, ignored for slowMutate = false
/** mutate new values for slots nosel using sel as parents */
function _mut(sel, nosel, marryFun, filter, mutrate, animate: boolean, onIndividualDone, onPopulationDone) {
    if (!marryFun) marryFun = marry;
    // animate=true; // TEMP
    const mb = slowMutate === false ? 9999999 : mutateBatch;
    for (let bn = 0; bn < mb; bn++) {    // for slowMutate only once each call, else nosel.length times
        if (nosel.length === 0) {
            if (onPopulationDone) onPopulationDone();
            Maestro.trigger("populationDone");
            if (Director) Director.framesFromSlots();
            return;
        }
        var targDispobj = nosel.splice(0,1)[0];  // target

        // find close parent
        sel.sort(function(a,b) { return targDispobj.dist(a) - targDispobj.dist(b); });

        var svn1 = 0; // Math.floor(Math.random()*sel.length);
        var sdo1 = sel[svn1];
        var sgenes1 = sdo1.genes;
        var svn2 = sel.length > 1 ? 1 + Math.floor(Math.random()*(sel.length-1)) : 0;
        // debug svn2 = svn1;
        var sdo2 = sel[svn2];
        var sgenes2 = sdo2.genes;
        //if (sdo1 !== sdo2)
        //    log("marry " + xxxdispobj(sel[svn1]).vn + "." +  xxxdispobj(sel[svn2]).vn + "->" + targDispobj.vn);
        var sgenes = marryFun(sgenes1, sgenes2, filter);
        // at least for now, do not mutate as well as smutate
        /// easier for debug!
        if ((!WA.HornWrap) || marryFun !== HornWrap.randrulemarry)
            sgenes = mutateObj(sgenes, mutrate, filter);
        targDispobj.genes = sgenes;
        targDispobj.lastTouchedDate = targDispobj.createDate = Date.now();

        // pjt hacking in some sound effects... TODO use Maestro or something for this instead
        if (WA.interfaceSounds) {
            var pan = (targDispobj.cx/1920)-0.5;
            if (interfaceSounds.bip2)
                interfaceSounds.bip2.play(6, pan, 0.2+Math.random()*4);
        }
        if (onIndividualDone) onIndividualDone(targDispobj, sdo1, sdo2);
        Maestro.trigger("individualDone");

        // !!! code below animates move of object from first parent position to correct slot
        if (animate) {
            targDispobj.cx = sdo1.cx; targDispobj.cy = sdo1.y;
        }
        newframe(targDispobj);
    }  //end  batch

    // structure mutation can be slow, so render results as found
    //console.log("mutated " + vn + ">" + xxxgenes(vn).tranrule);
    function nextmut() {
        _mut(sel, nosel, marryFun, filter, mutrate, animate, onIndividualDone, onPopulationDone);
    }
    //if (slowMutate !== false || marryFun === randrulemarry) {
        setTimeout(nextmut, slowMutate === true ? 100 : slowMutate);
    //    return;
    //} else {
    //    // iterate the loopnextmut();
    //}
}

type Randobj = ((genes?, reset?, filter?, all?)=>any) & {pending?: number} ;
//type Randobj = {pending?: number} & ((genes, reset?, filter?, all?) => any) ;
var testrandobj: Randobj ; //??? testrandobj.pending;
/** make random object by setting new values in genes
reset also forces material reset
filter filters just some genes
all=true means even frozen genes will be randomized
*/
var randobj:Randobj = function(genes = currentGenes, reset:boolean = true, filter?:[string], all?) {
    if (restoringInputState) return;
    var gg = resolveFilter(filter);
    for (var gn in gg) {
        var gd = genedefs[gn];
        if (gd.free|| all) {
            genes[gn] = gd.min + random() * (gd.max - gd.min);
            if (gn.indexOf('red') + gn.indexOf('green') + gn.indexOf('blue') !== -3) genes[gn] *= genes[gn];  // colour compensate
        }

    }

    if (reset) resetMat();
    newmain();
    if (randobj.pending) { clearTimeout(randobj.pending); randobj.pending = 0; }
    //use window.setTimeout to disambiguate as node setTimeout returns NodeJS.Timer
    if (W.sliderate.value - 0) randobj.pending = window.setTimeout(randobj, W.sliderate.value * 100);
    // updateGuiGenes(); // not usually, too expensive
    return genes;
}

function randlots(n, genes, keys: [string], data) {
    var dir = "q:/dropbox/zegamiImages/";
    // var dir = "c:/temp/zegamiImages/";
    genes = genes || currentGenes;
    if (!keys) {
        var xkeys = Object.keys(currentGenes);
        keys = ['fid'];
        for (let i=0; i<xkeys.length; i++) {
               var gn = xkeys[i];
               if (typeof currentGenes[gn] === 'number')
                   keys.push(gn);
        }
        data = [];
        data.push(keys.join("\t"));
        data.push((currentGenes.tranrule as any).replaceall("\r", "\\r").replaceall("\n", "\\n"));
    } else {
        var fid = currentGenes.name + n + ".jpg";
        saveframe(dir + fid);
        var ndata : [string | number] = [fid];
        for (let i=1; i<keys.length; i++) ndata.push(currentGenes[keys[i]]);
        data.push(ndata.join("\t"));
    }
    if (n <= 0) {
        // log(data.join("\n"));
        nwfs.writeFileSync(dir + currentGenes.name + "_features.txt", data.join("\n"));
        return;
    }
    setTimeout( function() {randlots(n-1, genes, keys, data)}, 5);
    randobj(genes);
}



/** get the current mutation rate appropriately scaled */
function getmutrate() {
    return +W.mutrate.min === inputs.mutrate ? 0 : Math.pow(10, inputs.mutrate * 0.1);
}

// shorthand, especially useful in debug, moved up for use in combined code
//delete window.G;
//Object.defineProperty(window, 'G', { get : function() { return currentGenes; } });
