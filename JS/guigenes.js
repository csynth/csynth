/*
 * Code to handle display of genes in control panel.  Also some parts of interactive genes for 'html' display of horns.
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";
/** for encapsulation verification */
var W, genedefs, currentGenes, getg, getkey, lastval,uid, slots, xxxgenes, NODO, saveExtraObjects, mainvp, inputs, lastTraninteracttime,
frametime, killev, keysdown, saveInteresting, setvalf, mousewhich, saveExtra, setgenes, clone, refall, target,
restoreExtra, guigenes, newmain, trysetele,  onWindowResize, msgfix, HW, Director, sweepgene, sweepall, isDisplayed
;

/** set gene to min value */
function minEleonchange(evt) {
    var uig = getg(this);
    uig.sliderEle.min = this.value*1;
    genedefs[uig.name].min = this.value*1;
}
function maxEleonchange(evt) {
    var uig = getg(this);
    uig.sliderEle.max = this.value*1;
    genedefs[uig.name].max = this.value*1;
}
/** setdelta value */
function deltaEleonchange(evt) {
    var uig = getg(this);
    // uig.sliderEle.delta = this.value*1;
    genedefs[uig.name].delta = this.value*1;
}
function stepEleonchange(evt) {
    var uig = getg(this);
    uig.sliderEle.step = this.value*1;
    genedefs[uig.name].step = this.value*1;
}
function nameEleonchange(evt) {
    geneCallbacks();
}



function geneonkeydown(evt, name) {
    lastTraninteracttime = frametime;
    var ff = getkey(evt);
    // msgfix("genekey", ff, keysdown[0]);
    if (ff === "alt" || ff === "shift") return true;
    if (!name) name = getg(this).name;
    var gd = genedefs[name];
    var step = evt.shiftKey ? gd.delta : gd.step;
    if (ff === "F2") { /*f2*/
        if (evt.ctrlKey)
            toggleFullgene(name);
        else
            toggleFree(name);
        HW.updateHTMLRules();   // slight overkill, but does not happen too often
        return killev(evt);
    } else if (keysdown[0] === '#' && ff === 'Tab') {  //test pending future use
        let i = 0;
    } else if (ff === '#') {
        return killev(evt);
    } else if (ff === 'ArrowUp') {
        incgene(name, 1, evt);
        return killev(evt);
    } else if (ff === 'ArrowDown') {
        incgene(name, -1, evt);
        return killev(evt);
    } else if (ff === 'S') {
        if (evt.shiftKey)
            sweepall();
        else
            sweepgene(name);
    } else if (ff === 'A') {
        if (evt.shiftKey) {
            const l=[];
            for (let gn in guigenes) if (isDisplayed(guigenes[gn])) l.push(gn);
            if (confirm('global set following genes?' + l.join(' '))) {
                for (const gn of l) {
                    slots.forEach(s => s.dispobj.genes[gn] = currentGenes[gn]);
                    guigenes[gn].style.backgroundColor = 'red'
                }
            }
        } else {
            slots.forEach(s => s.dispobj.genes[name] = currentGenes[name]);
            guigenes[name].style.backgroundColor = 'red'
        }
        refall();
    } else if (ff === 'P') {
        Director.plot(name);
     } else if (evt.altKey) {
        saveInteresting(name);
        switch(ff) {
            case "-": setvalf(name, -currentGenes[name]); break;
            case "0": setvalf(name, 0); break;
            case "1": setvalf(name, 1); break;
            case "X": if (lastval[name] !== undefined) setvalf(name, lastval[name]); break;
            case "D": setvalf(name, genedefs[name].def); break;
            case "R":
                // rotate all 'sensible' values
                var ov = currentGenes[name];
                var ua = [0,1];
                var lv = lastval[name];
                var d = genedefs[name].def;
                var v = undefined;
                if (ua.indexOf(d) === -1) ua.push(d);
                if (lv && ua.indexOf(lv) === -1) ua.push(lv);
                for (let i=0; i<ua.length-1; i++)
                    if (ov === ua[i]) v = ua[i+1];
                if (v  === undefined) v = ua[0];
                setvalf(name, v);
                break;
            default: return false;
         }
        return killev(evt);
    }
    return true;
}
function currentEleonchange(evt) {
    getg(this).sliderEle.value = this.value; uset(getg(this)); }
function sliderEleonchange(evt) {
    const gg = getg(this);
    const v = currentGenes[gg.name] = this.valueAsNumber
    if (evt.type !== 'input')
        gg.currentEle.value = this.value
    newmain();
    uset(gg, v);

    // this will NOT update the currentEle continuously as the slider is moved (oninput)
    // but will update it on release (onchange)
    // We would like to call uset(gg) and update currentEle immediately
    // but there is some problem so that trying to do this locks the slider
    // It seemed to work updating an input box outside the genes filedset
    // but not an an input box inside.
}

/** click or focus, show range if right mouse down */
function currentEleonclick(evt) {
    var gn = getg(this).name;
    guigenes[gn].style.backgroundColor = 'green'
    if (mousewhich !== 8) return;
    elemouseover(evt);
}
var currentEleonfocus = currentEleonclick;
//does not register
//var sliderEleonkeypress(evt) {
//  this.parentNode.currentEle.value = this.value; uset(this.parentNode);
//};
function addgeneEleonclick(evt) {
    var old = getg(this);
    var html = old.outerHTML;
    old.insertAdjacentHTML("afterEnd", html);
    var nnn = old.nextSibling;
    nnn.getElementsByClassName("name")[0].value += uid;
    uid++;
    geneCallbacks();
}


// show 8 variant values in first 8 slots
function elemouseover(evt) {
    if (mousewhich !== 8 && !evt.ctrlKey) return;  // only for right button or control key
    var l = slots.length;
    if (slots.length < 2) return;
    saveExtra();
    var name = getg(evt.target).name;
    for (var vn=1; vn<=8; vn++) {
        setgenes(vn, clone(currentGenes));
    }
    var v = currentGenes[name];
    var gd = genedefs[name];
    if (!gd) return;
    var delta = gd.delta;
    xxxgenes(1)[name] = gd.min;
    xxxgenes(2)[name] = gd.max;
    if (l >= 8) {
        xxxgenes(3)[name] = v - delta/10;
        xxxgenes(4)[name] = v + delta/10;
        xxxgenes(5)[name] = v - delta;
        xxxgenes(6)[name] = v + delta;
        xxxgenes(7)[name] = v - delta*10;
        xxxgenes(8)[name] = v + delta*10;
    }
    refall();
}

///** scale the object using best means for style should be overridden */
function viewscale(genes, sc) {}

/** show scale variants for given slot */
function showScaleVariants(pvn) {
    if (pvn === NODO) { restoreExtra(); return;}  // no slot
    if (slots.length < 2) return;

    //if (saveExtraObjects) return;  // in case of repeating keydown
    var genes = ((saveExtraObjects && saveExtraObjects["vp_" + pvn]) || xxxgenes(pvn));
    saveExtra();
    for (var vn=1; vn<=8; vn++) {
        setgenes(vn, clone(genes));
    }
    var r1 = 2, r2 = 5, r3 = 10, r4 = 25;
    viewscale(xxxgenes(1), 1/r1);
    viewscale(xxxgenes(2), r1);
    viewscale(xxxgenes(3), 1/r2);
    viewscale(xxxgenes(4), r2);
    viewscale(xxxgenes(5), 1/r3);
    viewscale(xxxgenes(6), r3);
    viewscale(xxxgenes(7), 1/r4);
    viewscale(xxxgenes(8), r4);
    target = {tranrule: xxxgenes(mainvp).tranrule };
    refall();
}


function elemouseout(evt) {
    restoreExtra();
}


// handle all gene callbacks
function geneCallbacks() {
    if (1 === +1) return;
    guigenes = {};
    var dgenes = document.getElementsByClassName("gene");
    for (var gn = 0; gn < dgenes.length; gn++) {
        geneCallback(dgenes[gn]);
    }
}

// handle individual gene callback for gene element g
function geneCallback(g, name) {
    g.nameEle = g.getElementsByClassName("name")[0];
    g.name = name;
    guigenes[g.name] = g;
    g.minEle = g.getElementsByClassName("min")[0];
    g.maxEle = g.getElementsByClassName("max")[0];
    g.deltaEle = g.getElementsByClassName("delta")[0];
    g.stepEle = g.getElementsByClassName("step")[0];
    g.currentEle = g.getElementsByClassName("current")[0];
    g.sliderEle = g.getElementsByClassName("slider")[0];
    g.addgeneEle = g.getElementsByClassName("addgene")[0];
    g.genehelpEle = g.getElementsByClassName("help")[0];
    g.minEle.onchange = minEleonchange;
    g.maxEle.onchange = maxEleonchange;
    g.deltaEle.onchange = deltaEleonchange;
    g.stepEle.onchange = stepEleonchange;
    g.minEle.oninput = minEleonchange;
    g.maxEle.oninput = maxEleonchange;
    g.deltaEle.oninput = deltaEleonchange;
    g.stepEle.oninput = stepEleonchange;
    g.nameEle.onchange = nameEleonchange;
    g.onkeydown = geneonkeydown;
    g.currentEle.onchange = currentEleonchange;
    g.currentEle.oninput = currentEleonchange;
    g.currentEle.onclick = currentEleonclick;
    g.currentEle.onfocus = currentEleonfocus;
    g.sliderEle.onchange = sliderEleonchange;
    g.sliderEle.oninput = sliderEleonchange;
    g.nameEle.onmouseover = elemouseover;
    g.nameEle.onmouseout = elemouseout;
    //g.sliderEle.onkeypress = sliderEleonkeypress;
    g.addgeneEle.onclick = addgeneEleonclick;
    var gdx = genedefs[g.name];
    g.minEle.value = gdx.min;
    g.maxEle.value = gdx.max;
    g.deltaEle.value = gdx.delta;
    g.stepEle.value = gdx.step;
    g.currentEle.value = gdx.def;
    g.currentEle.step = gdx.step;
    if (g.genehelpEle !== null) {
        if (gdx.help !== null)
            g.genehelpEle.innerHTML = "<b>" + g.name + "</b><br>" + gdx.help;
        else
            g.genehelpEle.style.display = "none";
    }
}


/** toggle the freeze setting for all filtered genes in a group */
function groupToggleFreeze(e) {
    if (e.key !== "F2") return undefined;
    var id = e.target.id.post("_");
    var setting = "?";
    for (var gn in genedefs){
        if (genedefs[gn].tag === id && guigenes[gn] && guigenes[gn].style.display !== "none") {
            if (setting === "?") setting = 1 - genedefs[gn].free;
            if (genedefs[gn].free !== setting) toggleFree(gn);
        }
    }
    return killev(e);
}



/** toggle the free value for named genes (blank separated) */
function toggleFree(gnamess) {
    var gnames = gnamess.split(" ");
    for (var g in gnames) {
        var gname = gnames[g];
        var gd = genedefs[gname];
        gd.free = 1 - gd.free;
        var nnn = guigenes[gname];
        if (gd.free === 0) nnn.classList.add("frozen"); else nnn.classList.remove("frozen");
    }
}

/** show all gene details */
function toggleFullgene(gnamess) {
    var gnames = gnamess.split(" ");
    for (var g in gnames) {
        var gname = gnames[g];
        var cll = guigenes[gname].classList;
        if (cll.contains("show"))
            cll.remove("show");
        else
            cll.add("show");
    }
}


function uset(gene, v = parseFloat(gene.currentEle.value) ) {
    if (uset.setting) return;
    uset.setting = true;
    try {
        newmain();
        setvalf(gene.name, v);
        //currentGenes[gene.name] = parseFloat(gene.currentEle.value);
        if (target) delete target[gene.name];
    } finally {
        uset.setting = false;
    }
}

/** update all genes in the gui */
function reshowAllGuiGenes() {
    updateGuiGenes();
}

/** make sure all GUIGenes up to date */
function reshowGenes() {
    updateGuiGenes();
//    for (var gn in guigenes) {
//        if (currentGenes[gn]) {
//            guigenes[gn].currentEle.value = currentGenes[gn];
//            guigenes[gn].sliderEle.value = currentGenes[gn];
//        }
//    }
}

/** update guigenes from gendefs */
function updateGuiGenes(genes = currentGenes) {
    for (var gn in genedefs) {
        var gd = genedefs[gn];
        var gg = guigenes[gn];
        if (gd && gg) {
            var se = gg.sliderEle;
            var ce = gg.currentEle;
            gg.minEle.value = se.min = ce.min = gd.min;
            gg.maxEle.value = se.max = ce.max = gd.max;
            gg.stepEle.value = se.step = ce.step = gd.step;
            gg.deltaEle.value = se.delta = ce.delta = gd.delta;
            if (genes[gn] !== undefined)
                se.value = ce.value = genes[gn];
            if (gd.free === 0) gg.classList.add("frozen"); else gg.classList.remove("frozen");
        }
    }
}

var updateggnn = 0; // used to prevent too frequent gene gui update


/** increase gene value by steps */
function incgene(gn, steps, evt) {
    if (evt) {
        steps *= evt.shiftKey ? 10 : 1;
        steps *= evt.ctrlKey ? 0.1 : 1;
    }
    const step = genedefs[gn].step;
    let v = currentGenes[gn] + step * steps;
    v = +(v.toFixed(10));  // stop silly values from rounding, eg 4.10000000001
    setvalf(gn, v);
}


/** togggle gene display */
function toggleFix() {
    trysetele("fixcontrols", 'checked', !inputs.fixcontrols);
    onWindowResize();
}

/** set min and max eles for gene, if not gen reset to base values */
function geneBounds(gn, min, max) {
    var gd = genedefs[gn];
    if (gd === undefined) return;
    min = min !== undefined ? min : gd.basemin;
    max = max !== undefined ? max : gd.basemax;
    gd.min = min;
    gd.max = max;
    var gg = guigenes[gn];
    if (gg) {
        gg.minEle.value = min;
        gg.maxEle.value = max;
        gg.deltaEle.value = gd.delta;
        gg.stepEle.value = gd.step;
        gg.sliderEle.min = min;
        gg.sliderEle.max = max;
    }
}

function resetBounds() {
    for (var gn in genedefs)
        geneBounds(gn);
}

/** update the base min & max for gene,
 *  only altering current min & max if they haven't been explicitly set differently */
function geneBaseBounds(gn, min, max) {
    var gd = genedefs[gn];
    var gg = guigenes[gn];
    if (gd === undefined) return;
    if (gd.basemin === gd.min) {
        gd.min = min;
        gg.minEle.value = min;
        gg.sliderEle.min = min;
    }
    gd.basemin = min;
    if (gd.basemax === gd.max) {
        gd.max = max;
        gg.maxEle.value = max;
        gg.sliderEle.max = max;
    }
    gd.basemax = max;

    gg.deltaEle.value = gd.delta;
    gg.stepEle.value = gd.step;
}

/** generate animation bounds from a set of objects */
function genBoundsFromObjects(objects) {
    var min={}; var max={};
    // scan objects to find min/max
    for(var n = 0; n < objects.length; n++) {
        var genes = objects[n].genes;
        for (var gn in genes) {
            min[gn] = min[gn] ? Math.min(min[gn], genes[gn]) : genes[gn];
            max[gn] = max[gn] ? Math.max(max[gn], genes[gn]) : genes[gn];
        }
    }
    msgfix("bounds generated from", objects.length + "objects.");

    // apply min/max to genes
    for (gn in min) geneBounds(gn, min[gn], max[gn]);
}

