/*
 * Code to define genes and their usage
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015
 */
"use strict";

var fixedgenes = {};        // override genes for all renders
var fixedgenesmain = {};    // further override for mainvp


/** HTML objects for each gene */ var guigenes = {};
/** default gene values */ var defaultObj = {};
/** current gene values */ var currentGenes:Genes = {};

/** map of gene definitions */ var genedefs:Genedefs = {};

/** find list of used genes: todo, split into Horn and other implementations more cleanly
 * Will not work where there is a collection of objects with different genes
*/
function usedgenes() {
    if (appToUse !== "Horn") return genedefs;  // all known genes assumed used
    var list = {}; // list of genes in use, use all if list empty
    // should also pick up the generic horn ones that are not recompiled
    if (material) {
        for (var op in material) {  // scan
            var mm = material[op] ? material[op][currentGenes.tranrule.pre('SynthBus')] : undefined;
            if (mm) {
                copyFrom(list, mm.genes);
            }
        }
        if (!list) return null;
    }
    copyFrom(list, permgenes);
    // make sure geom genes collected from horns
    // caching sometimes hid them
    // This may cause duplicates, but that doesn't matter.
    if (currentGenes.tranrule && appToUse as string !== 'Fano')  // absurd?? typescript type complaint on appToUse !== 'Fano'
        copyFrom(list, trancodeForTranrule(currentGenes.tranrule, currentGenes).getgenenames());
    return list;
}

// alternative way to compute used genes,  -4 can maybe be -1, doube recompile of horns sometimes TODO CHECK
let lastaddframe: number = -999;
function usedgenes2():Genes {
    var ug = {};
    for(var gn in genedefs)
        if (genedefs[gn].lastaddframe >= lastaddframe-4)
            ug[gn] = genedefs[gn]
    return ug;
}

/** clean up genes (or genedefs) given list (list defaults to usedgenes()) */
function cleangenes(genes, id, list:any = usedgenes(), clearList = false, dolog = true) {
    if (!genes) return;
    var cleaned = {};
    for (var gn in genes) {
        // if ((!!list[gn] as any ^ (!clearList as any)) && gn[0] !== "_" && gn !== "tranrule" && gn !== "name") {
        if ((  (gn in list) === clearList) && gn[0] !== "_" && gn !== "tranrule" && gn !== "name" && !permgenes[gn]) {
            cleaned[gn] = genes[gn];
            delete genes[gn];
            //if (id) log("clean ", id, gn);
        }
    }
    if (dolog && id) log("clean ", id + ":", Object.keys(cleaned).join(' '));
    return cleaned;
}

/** clean up all gene related things */
function cleangenesall(list:any = usedgenes(), clearList = false, dolog = true) {
    if (Array.isArray(list))
        list = list.reduce((c,v) => {c[v] = true; return c}, {});
    var cleaned = cleangenes(currentGenes, "currentGenes", list, clearList, dolog);
    geneids = Object.keys(currentGenes);

    for (let o in currentObjects)
        cleangenes(currentObjects[o].genes, "obj" + o, list, clearList, dolog);
    for (let o in slots)
        if (slots[o]) cleangenes(slots[o].dispobj.genes, "slot" + o, list, clearList, dolog);
    cleangenes(currentGenes, "currentGenes", list, clearList, dolog);
    cleangenes(genedefs, "genedefs", list, clearList, dolog);
    cleangenes(geneSpeed, "geneSpeed", list, clearList, dolog);
    cleangenes(geneSpeedSave, "geneSpeedSave", list, clearList, dolog);
    if (clearList)   // dangerous to delete all uniforms except ...
        cleangenes(uniforms, "uniforms", list, clearList, dolog);
    if (currentHset) {
        cleangenes(currentHset.wallgenes, "currentHset.wallgenes", list, clearList, dolog);
        cleangenes(currentHset.audiogenes, "currentHset.audiogenes", list, clearList, dolog);
    }

    const guiclear = cleangenes(guigenes, "gui", list, clearList, dolog);
    for (let gn in guiclear) {
        const gc = guiclear[gn];
        gc.remove();
    }

    return cleaned;
}

function cleangenestagall(ttag) { //... maybe tag
    ttag = ' ' + ttag + ' ';
    const list = [];
    for (let gn in genedefs) {
        const tag = ' ' + genedefs[gn].tag + ' ';
        if (tag.indexOf(ttag) !== -1)
            list.push(gn)
    }
    cleangenesall(list, true);
}

/** reset genes to empty */
function resetGenes() {
    genedefs = {};
    W.genesgui.innerHTML = "";
    currentGenes = {};
    for (let o in slots) slots[o].dispobj.genes = {};
    for (let o in currentObjects) currentObjects[o].genes = {};
}

function geneDist(genes, genes2) {
    var dist = 0;
    for (var gn in genes2) {
        if (genedefs[gn] && genedefs[gn].free !== 0) {
            var dd = (genes[gn] - genes2[gn]) / (genedefs[gn].max - genedefs[gn].min);
            if (!isNaN(dd))
                dist += dd * dd;
        }
    }
    return Math.sqrt(dist);  // real distance
}

function geneVectorLength(g) {
    var ss = 0;
    for (var gn in g) {
        if(genedefs[gn] && !isNaN(g[gn])) {
            var gd = genedefs[gn];
            if (gd.free === 0) continue;
            var range = gd.max - gd.min;
            if (range === 0 || isNaN(range)) range = 1;//throwe("Gene " + genedefs[gn] + " has invalid range");
            ss += g[gn] * g[gn] / range;
        }

    }
    return Math.sqrt(ss);
}

/** add a set of 'standard' genes */
function addgenes(list) {
    var s = list.split(" ");
    for (var i = 0; i<s.length; i++) addgene(s[i], Math.random(), -10, 10, 5, 0.01);
}

// var permgenes = { foldradius: true, foldradiuslowr: true }; // genes always to be allowed in filter
var permgenes = { }; // genes always to be allowed in filter
function addgeneperm(name, def, min, max, delta, step, help, tag, free?, internal?, genes?) {
    addgene(name, def, min, max, delta, step, help, tag, free, internal, undefined, undefined, genes);
    permgenes[name] = true;
}


/** define genedef object */
function Genedef(args) {
    var gd = this;
    for (var a in args) this[a] = args[a];

    this.activerate = function(mutateFrozen: number = 0) {
        var r = this.free;
        if (mutateFrozen !== 0 ) return mutateFrozen;
        if (inputs.usefilter && guigenes[this.name] && guigenes[this.name].style.display === 'none')
            r = 0;
        return r;
    };
}

var autoAddGenesToExtraObjs = true;

//would maybe rather this had a Genedef rather than duplicating all the parameters.
interface GeneConfig {
    name:string, def:number, min:number, max:number, delta?: number, step?:number,
    //free could probably be changed to enum, currently string | boolean(?).
    help?:string, tag?:string, free?, internal?, useUniform?:boolean, addGui?:boolean
}
/** calls addgene with a list of arguments taken from config object */
function addGene(c: GeneConfig) {
    addgene(c.name, c.def, c.min, c.max, c.delta, c.step, c.help, c.tag, c.free, c.internal, c.useUniform, c.addGui);
}

/** add a gene if not already present: todo decide what to replace in old if already present  */
function addgene(gn:string, def:number, min:number, max:number, delta?, step?:number, help?:string, tag?:string, free:number|string=1, internal=false, useuniform = true, addGui = true, genes = currentGenes) {

    // whether new or not, setup or replace the other details
    delta = (delta === undefined || delta === '?' || delta === 'u') ? (max - min)/10 : delta;
    if (step === undefined) step = delta / 10;
    if (free === "free") free = 1;
    if (free === "frozen") free = 0;
    if (free === "fixed") free = 0;
    if (free as any === false) free = 0;    // will be removed when all typing complete
    if (free === undefined) free = 1;  // history
    if (tag === undefined) tag = "undefined";  // history
    if (help === undefined) help = "gene " + gn;

    const e = evalIfPoss;
    def= e(def); min= e(min); max= e(max); delta= e(delta); step= e(step); free= e(free);
    if (min===0 && max===0) {
        max = Math.max(1, def);
        throwe("Zero range for gene " + gn);
    }
    if (isNaN(step)) {
        console.log("NaN step " + gn);
        step = delta*0.1;
        //throwe("NaN step " + name);
    }
    //!!! sjpt 1 July 2014 TODO <<< CHECK if (!genedefs[name])  // do not overwrite old ones
    // must, old ones saved in ANOTHER loaded form can win over later forms or be inherited by them
    // AND EVEN SOMEHOW GOT THROUGH WITH THIS CHANGE
    // very temp fix was to rename first and sub in startup
    // restore check, we are now cleaning genedefs on load (fileAndCatalog.js loadxobjGetGenes)
    if (genedefs[gn]) {
        var gdef = genedefs[gn];
        //if (tag !== gdef.tag && tag.length > gdef.tag.length) { // this really just matters for texture vs non-texture
            //log("overwrite tag for", gn, gdef.tag, "->", tag);
            gdef.tag = tag;
            delete uniforms[gn]; delete uniforms[gn + '_A'];
        //}
        //if (help !== gdef.help && help.length > (gdef.help || '').length) {
            // log("overwrite help for", gn, gdef.help, "->", help);
            gdef.help = help;
        //}
        gn= gdef.name; def= gdef.def; min= gdef.min; max= gdef.max; delta= gdef.delta;
                step= gdef.step; free= gdef.free;
                gdef.help = help= gdef.help || help;
                gdef.tag = tag= gdef.tag || tag;

    } else {
           gdef = new Genedef({name: gn, def: def, min: min, max: max, delta: delta,
                step: step, help: help, tag: tag, free: free, basemin: min, basemax: max, filtered: 0 });
        genedefs[gn] = gdef;
    }
    gdef.lastaddframe = framenum;
    lastaddframe = framenum;
    if (genes && genes[gn] === undefined) genes[gn] = def;
    geneSpeedSave[gn] = geneSpeed[gn] = (2 + Math.random()) * (max - min) * 0.001;
    addGeneToExtraObjects(gn);
    gdef.addGui = addGui;

    if (useuniform !== false)
        if (tag === 'texture' || tag === 'wallcol')
            {}
        else
            adduniform(gn, def, 'f', tag);
    if (addGui && !searchValues.noguigenes) addgui(gn, gdef, genes);
}

/** turn gll genedefs into guigenes, in case not done during addgene */
async function guiAllGenes(genes = currentGenes) {
    let i = 0;
    for (const gn in genedefs) {
        const gdef = genedefs[gn];
        if (gdef.addGui) addgui(gn, gdef, genes);
        if (i++ % 10 === 0) await sleep(1);
    }
}

var _testcompile = false;   // doing test compile, miss some full compile features
function addgui(gn, gd, genes) {        // geneCallaback removed as argument 28/12/2021
    if (_testcompile) return;
    if (!guigenes) return;
    let nnn;
    const {min, max, step, free, tag} = gd;
    if (guigenes[gn] === undefined) {
        // add a gui for the gene; if we don't alredy jave one
        var sample = document.getElementById("samplegene");
        nnn = document.createElement("div");
        nnn.className = "gene";
        nnn.innerHTML = sample.innerHTML;
        nnn.getElementsByClassName("name")[0].innerHTML = gn;

        geneCallback(nnn, gn);  // and prepare its callbacks
    } else {
        nnn = guigenes[gn];
    }

    var nnns = nnn.getElementsByClassName("slider")[0];
    nnns.min = min;
    nnns.max = max;
    nnns.step = step;
    nnns.value = genes ? genes[gn] : genedefs[gn].def;
    if (free === 0) nnn.classList.add("frozen"); else nnn.classList.remove("frozen");
    var tags = tag.split(" ");
    for (var i=0; i<tags.length; i++) nnn.classList.add(tags[i]);

    var geneGroup = document.getElementById("genes_" + tag);
    if (geneGroup === null) {
        // the gene heirachy is         (<<< indicates folding points, ... indicates repeats)
        // fieldset #genefieldset       (<<< all genes)
        //   legend  (genes)            (to allow folding of fieldset above)
        //   div.fieldbody
        //     filter stuff
        //     div.genes
        //       fieldset               (... <<< repeated for each gene group, eg geom)
        //         legend               (eg geom, to allow folding of fieldset above)
        //         div.genegroup        (eg #genes_geom, body of the gene group)
        //           div.gene           (... eg also .geom)
        //             span.genemain    ( ??? not used)
        //               input.name
        //               span .help
        //               input          (type=slider)
        //               input.current  (type=number)
        //               span           (<<< to hide min/max details)
        //                 span.genehide(to allow folding of span above)
        //                 input.min    (type=number)
        //                 input.max    (type=number)
        //
        var geneFieldset = document.createElement("fieldset");
        geneFieldset.id = "genesfield_" + tag;
        geneGroup = document.createElement("div");
        geneGroup.id = "genes_" + tag;
        geneGroup.className = "genegroup";
        var geneHead = document.createElement("legend");
        geneHead.innerHTML = tag;
        geneFieldset.appendChild(geneHead);
        geneFieldset.appendChild(geneGroup);
        var genesEle = document.getElementById("genesgui");
        genesEle.appendChild(geneFieldset);
        geneHead.onclick = toggleFold;
        geneFieldset.onkeydown = groupToggleFreeze;
        geneFieldset.tabIndex = 0;   // needed to make sure keystrokes can register
        geneFieldsets[tag] = geneFieldset;
    }
    geneGroup.appendChild(nnn);
}
const geneFieldsets: { [name: string]: HTMLFieldSetElement} = {};

function foldGeneGui(hide=true) {
    const className = hide ? 'hidebelow' : '';
        for (const fs of Object.values(geneFieldsets)) fs.className = className;
}

/** add this gene to extra objects, mutated */
function addGeneToExtraObjects(gn) {
    var gdef = genedefs[gn];
    if (autoAddGenesToExtraObjs) {
        for (var oo in currentObjects) {
            var genes = currentObjects[oo].genes;
            if (!genes) continue;
            if (genes[gn] === undefined) {
                var xstep = gdef.delta * gdef.free;
                var vv1 = gdef.def + getmutrate() * xstep * (Math.random() - 0.5);
                var vv2 = Math.min(gdef.max, Math.max(gdef.min, vv1));
                genes[gn] = vv2;
                //console.log("adding missing gene " + name + " with value "+ vv2 +" to " + i);
            }
        }
    }
}

/** add all missing genes to all extraObjects */
function addGenesToExtraObjects() {
    for (var gn in genedefs) addGeneToExtraObjects(gn);
}

/** set the value for a named gene in range, in all places needed */
function setvalr(gn, v) {
    var gd = genedefs[gn];
    if (gd) {
        if (v < gd.min) v = gd.min;
        if (v > gd.max) v = gd.max;
    }
    setval(gn, v);
}

/** set the value for a named gene, in all places needed,
 * but with possible deferred gui change to prevent gui updates swamping performance */
function setval(gn, v, forcegui=false) {

    if (isNaN(v))
        return;
    if (currentGenes[gn] !== undefined && typeof currentGenes[gn] !== "number")
        return;

    // main functional parts first
    newmain();
    const isuni = uniforms && uniforms[gn];
    const iscol = COL && COL.num[gn] !== undefined
    if (iscol)
        //if (genedefs[gn] && genedefs[gn].tag === 'texture')
        COL.setG(gn, 0, v);
    if (isuni)
        uniforms[gn].value = v;
    currentGenes[gn] = v;

    // then gui parts if needed
    updateggnn++;
    var refreshGuiGene = forcegui || ((!inputs.doAnim || ((updateggnn % guigenesUpdateRate) === 0)) && isControlShown);
    if (inputs.showhtmlrules || refreshGuiGene) {
        // v = format(v);  // should be accurate enough for gui. disturbs text edit, TODO make conditional
        // could also ignore based on window.getComputedStyle(...).display
        const ggn = guigenes[gn];
        if (refreshGuiGene && ggn !== undefined && ggn.style.display !== 'none') {
            if (+ggn.currentEle.value !== v)  // do not mess while editing
                ggn.currentEle.value = v;
            if (+ggn.sliderEle.value !== v) ggn.sliderEle.value = v;
        }
        if (inputs.showhtmlrules)
            trysetele("TR_" + gn, 'textContent', format(v));
    }
}
var guigenesUpdateRate = 20;

/** set the value for a named gene, in all places needed, including forced gui change */
function setvalf(gn, v) {
    setval(gn, v, true);
}

/** set gene values based on a filter match */
function setlots(genes, pattern, value) {
    var filt = resolveFilter(pattern);
    var res = {__changed: 0};
    for (var gn in filt) {
        if (gn in genes || gn in currentGenes) {
            const old = genes[gn];
            genes[gn] = randrange(value);
            res[gn] = old;
            res.__changed += Number(genes[gn] !== old);
            //    log("set", gn, value);
        }
    }
    newmain();
    return res;
}

/** find all gene collections currently in use */
function allGeneSets():Set<Genes> {
    var ggs = new Set();
    for (const dispobj of Object.values(currentObjects)) if (dispobj.genes) ggs.add(dispobj.genes);
    if (slots) for (const slot of slots) if (slot?.dispobj?.genes) ggs.add(slot.dispobj.genes);
    ggs.add(currentGenes);
    return ggs;
}

/** set genes for all objects and genedefs
 * return changed values
 */
function setAllLots(ppattern, values) {
    const pattern = resolveFilter(ppattern);

    // handle gene values for all objects
    if (typeof values === 'number') values = {value : values };
    if (values.value !== undefined) {
        var result = setlots(currentGenes, pattern, values.value);      // set for current genes
        setAllFromFilter(pattern, currentGenes);        // and copy to all others
    }

    // handle genedef values
    for (var gn in pattern) {
        var gd = genedefs[gn];
        if (gd) {
            copyFrom(gd, values);   // copy any fields specified
            if (values.value !== undefined) {
                gd.def = values.value;        // but value is used to replace def
                delete values.value;
            }
        }
    }
    if (result?.__changed) updateGuiGenes();
    return result;
    //for (var o in currentObjects) {
    //    if (currentObjects[o].genes) {
    //        constrain(currentObjects[o].genes);
    //    }
    //}
    //return result;

}


/**
 * constrain genes to min/max
 */
function constrain(genes) {
    var o = genes.name;
    for (var gn in genes) {
        var gd = genedefs[gn];
        if (gd) {
            var v = genes[gn];
            genes[gn] = Math.min(gd.max, Math.max(gd.min, v));
            if (v !== genes[gn])
                o += "    " + gn + ": " + v + "->" + genes[gn] + "\n";
        }
    }
    console.log(o);
    msgfix("constrain", o.replace(/\n/g, "<br>") + "<br>" + genes.name);
}


/** copy genes (except tranrule) from another object into current */
function genesFrom(genes) {
    if (typeof genes === "string") genes = getGal(genes).genes;
    var s = currentGenes.tranrule;
    copyFrom(currentGenes, genes);
    currentGenes.tranrule = s;
    target = {};
    newmain();
}

/** copy part of genes including genedefs from another object into current */
function extractGenesFrom(xobj, filter) {
    if (typeof xobj === "string") xobj = getGal(xobj);
    if (!xobj.genes || !xobj.genedefs) serious("Bad call to extractGenesFrom");
    var touse = resolveFilter(filter);
    for (var gn in touse) {
        currentGenes[gn] = clone(xobj.genes[gn]);
        genedefs[gn] = new Genedef(xobj.genedefs[gn]);
    }
}

/** override all objects with filtered genes from specified genes (default currentGenes) */
function setAllFromFilter(filter, genes) {
    var list = resolveFilter(filter);
    genes = genes || currentGenes;
    for (const gg of allGeneSets()) {
        for (var gn in list) {
            gg[gn] = genes[gn];
        }
    }
    refall();
}

var egobj;  // if set, used to drive eg choices
/** helper for using genes, creates a gene if needed and returns value */
function eg(gn, def, min, max, delta, step, help, tag, free, internal) {
    if (gn === undefined) gn = "undefined";
    // return current value if possible, if not default value if possible
    if (!egobj) egobj = currentGenes;
    if (egobj[gn] !== undefined) return egobj[gn];
    if (genedefs[gn] !== undefined) {
        egobj[gn] = genedefs[gn].def;
        return egobj[gn];
    }

    // must make a new gene, apply mostly our own defaults
    if (def === undefined) def = 0.5;
    if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    if (delta === undefined) delta = (max-min) / 10;  // * 0.1 gives rounding errors
    if (step === undefined) step = delta / 10;
    if (help === undefined) help = "gene " + gn;
    if (tag === undefined) tag = "default";
    addgene(gn, def, min, max, delta, step, help, tag, free, internal);
    currentGenes[gn] = def;
    egobj[gn] = def;
    return def;
}

// display and return brief statistics about genes
function classifyGenes() {
    let tags = {};
    for (var gn in genedefs) {
        var tag = genedefs[gn].tag;
        var tt = tags[tag];
        if (!tt) tags[tag] = tt = {tot:0, free:0 };
        tt.tot++;
        if (genedefs[gn].free) tt.free++;
    }
    for (var t in tags) {
        log(t, tags[t].tot, tags[t].free);
    }
    return tags;
}

/** set multiple vals (? not used 26/3/17) */
function setvals(ss, v) {
    let s = ss.split(" ");
    for(var g in s) { setval([s[g]], v); }
}

/** allow structured genes for xyz, can set as Vector3 or array, returned as array */
var SG = new Proxy(currentGenes, {
    get: function(ig, name: string) {
        const g = currentGenes;   // in case they are redefined
        if (!g) return;
        if (name in g) return g[name];
        if (name.indexOf('xyz') !== -1)
            return new THREE.Vector3(g[name.replace('xyz', 'x')], g[name.replace('xyz', 'y')], g[name.replace('xyz', 'z')]);
        if (name.indexOf('rgb') !== -1)
            return col3(g[name.replace('rgb', 'r')], g[name.replace('rgb', 'g')], g[name.replace('rgb', 'b')]);
        // will return undefined if it drops out
    },
    set: function(ig, name: string, v) {
        const g = currentGenes;   // in case they are redefined
        if (!g) return;
        if (name in g) {
            g[name] = v;
        } else if (name.indexOf('xyz') !== -1) {
            if (!(name.replace('xyz', 'x') in g)) {
                log('attempt to set invalid structured gene', name,  'No gene', name.replace('xyz', 'x'));
                return false;
            } else if (0 in v) {
                g[name.replace('xyz', 'x')] = v[0];
                g[name.replace('xyz', 'y')] = v[1];
                g[name.replace('xyz', 'z')] = v[2];
            } else if ('x' in v) {
                g[name.replace('xyz', 'x')] = v.x;
                g[name.replace('xyz', 'y')] = v.y;
                g[name.replace('xyz', 'z')] = v.z;
            } else {
                log('attempt to set structured gene with invalid value', name, v);
                return false;
            }
        } else if (name.indexOf('rgb') !== -1) {
            if (!(name.replace('rgb', 'r') in g)) {
                log('attempt to set invalid structured gene', name,  'No gene', name.replace('rgb', 'r'));
                return false;
            } else if (0 in v) {
                g[name.replace('rgb', 'r')] = v[0];
                g[name.replace('rgb', 'g')] = v[1];
                g[name.replace('rgb', 'b')] = v[2];
            } else if ('r' in v) {
                g[name.replace('rgb', 'r')] = v.r;
                g[name.replace('rgb', 'g')] = v.g;
                g[name.replace('rgb', 'b')] = v.b;
            } else {
                log('attempt to set structured gene with invalid value', name, v);
                return false;
            }
        }
        return true;
        // log('attempt to set invalid structured gene, no xyz in name', name);
        // return false;
    }
} as any);


function getNormalisedGeneValue(name: string, genome = currentGenes) {
    const gd = genedefs[name];
    if (gd === undefined) {
        log(`couldn't getNormaliseGeneValue, no genedef for ${name}`);
        return 0.5;
    }
    const originalVal = genome[name];
    if (originalVal === undefined) {
        log(`couldn't getNormaliseGeneValue, no value for ${name} in genome ${genome}`);
        return 0.5;
    }
    return gd.min + originalVal / (gd.max - gd.min);
}


/** compare two sets of genes, with tolerance
 * no specific check for orphan genes
 */
 function compareGenes(a,b, d=1e-5) {
    a = xxxgenes(a);
    b = xxxgenes(b);
    return compareStruct(a,b);
}

/** sweep the value of a gene, start and end in current position */
async function sweepgene(gn, genes = currentGenes, time = 3000) {
    const gd = genedefs[gn];
    const v = genes[gn];
    if (!gd || v === undefined) return log('no gene for sweepgene', gn);
    const {min, max} = gd;
    const sr = (v - min) / (max-min);
    setval(gn, min);
    const st = Date.now()
    while(true) {
        const dt = (Date.now() - st)/time * 2;
        if (dt > 2) break;
        const xdt = (dt + sr) % 2;
        const nv = min + (max-min) * (xdt < 1 ? xdt : 2-xdt);
        setval(gn, nv);
        // log('sweep', dt, xdt, nv);
        await S.frame();
    }
    setval(gn, v);
}

let _sweepall_sweeping = false;
/** sweep over gene values in turn, toggle */
async function sweepall(filter = undefined, genes = currentGenes, time = 1500) {
    if (_sweepall_sweeping) {_sweepall_sweeping = false; return; }
    _sweepall_sweeping = true;
    const gg = resolveFilter(filter);
    for (const gn in gg) {
        await sweepgene(gn, genes, time);
        if (!_sweepall_sweeping) return;
    }
    _sweepall_sweeping = false;
}

/** force tranrule and all genes across all items */
function forceTranrule(genes = currentGenes) {
    for (const gg of allGeneSets()) {
        if (gg === genes) continue;
        gg.tranrule = genes.tranrule;
        for (const gn in genes) {
            if (!(gn in gg))
                gg[gn] = genes[gn];
        }
    }
    refall();
}