"use strict";
var adduniformX, addgene, currentGenes, genedefs, THREE, badshader,
newmain, setval, scene, render_camera, inputs, opmode, OPREGULAR, framenum, geneSpeed, hoverSteerMode, target, resdelta,
uniforms, radnum, lennum, currentpick, frametime, canvas, currentObjects, xxxgenes, OPPOSITION, mousewhich,
kinectJupDyn, getWebGalByNum, floatstring, scalehalflife, nop,
OPOPOS, OPMAKESKELBUFF, Maestro,
gValueForTexscale, kinect, Director, WALLID, hornSynth, random, seed, log,
format, throwe, serious, FIRST, newframe, rrender, logframenum, showvals, setGUITranrule, mainhorn,
msgfix, copyFrom, parseUniforms, onframe, material, hornTrancodeForTranrule, setInput, oplist, OPPICK,
prerender, postrender, OPSHAPEPOS, CubeMap, cloneNoCircle,trancodeForTranrule, randrules, clone, newscene, getMaterial, isWebGL2,
dstring, xstring,  editgenex, editgeney, forcerefresh, savedef, trysetele, refreshGal, setViewports, webgallery, loadcurrent, horn2html,
killev, geneonkeydown, keyname, saveundo, incgene, assert, renderVR, renderPass, nextpow2, skelbuffer, onpostframe, changeMat, G,
setAllLots, checkvr, minimizeSkelbuffer, centrescalenow, readWebGlFloat, W = window, evalIfPoss, animatee, cleangenesall,
msgfixerror, tad, mutSynthPendingCode, substituteExpressions, appToUse, COL
;
var currentHset;  // mainly for debug convenience

// TODO May 2019 or so, bake these values in
var subsfortails = true;
var subsfortailsouter = false;


/** set all values in COL from genes, for range of colourids */
COL.setall = function(genes, low=0, high) {
    var hset = getHornSet(genes.tranrule);
    if (!hset) return;
    var gns = hset.colgenenames;
    if (!gns) return;  // temp[orary till we work out how to colour extra horn sets
    if (high === undefined) high = hset.hornrun.length - 1;
    const ulow = low * COL.PARMS, uhigh = (high+1) * COL.PARMS;
    for (let i = ulow; i < uhigh; i++) {
        if (gns[i]) COL.array[i] = genes[gns[i]];
    }
    COL.send(true);
}

/** from COL array into genes */
COL.alltogenes = function(genes) {
    genes = genes || currentGenes;
    var hset = getHornSet(genes.tranrule);
    var gns = hset.colgenenames;
    if (!gns) return;
    var l = hset.hornrun.length * COL.PARMS;
    for (let i=0; i < l; i++) {
        //PJT: hit an exception here with undefined gns (in Electron, while running tad-sa.oao I think);
        //accidentally committed r7490 with message 'colgenenames' while searching for related code...
        // also hit in new edge.  fixed (?) with !gtns test above
        if (gns[i]) genes[gns[i]] = COL.array[i];
    }
    COL.send(true);
}

/** set all base colours from the genes */
COL.set0 = function(genes) {
    genes = genes || currentGenes;
    for (let gn in COL.num)
        COL.setG(gn, -1, genes[gn]);
    COL.send();
};

/** (unused) code to copy gene values into COL mechanism */
COL.copygenes = function copygenes(genes) {
    genes = genes || currentGenes;
    for (let i in COL.num) {
        let vv={}; let v = genes[i];
        if (v !== undefined) {
            vv[i] = v;
            COL.setx(vv);
        }
    }
}

/** set a value for a single slot for one colid or for all nonwall colids, allow for genes, WALLID, etc */
COL.setG = function colset(name, num, val, gn) {
    if (!COL.uniforms) COL.uniforms = uniforms;
    if (appToUse === 'Horn')
        var hset = getHornSet(currentGenes.tranrule) || currentHset;
    else
        hset = {colgenenames: {}};
    COL.needsUpdate = true;
    var id = COL.addname(name);
    if (id < 0) return;  // message already issued
    if (num === -1) {
       for (let n=0; n<COL.NUM; n++)
           if (n !== WALLID) {
               var k = (id + n*COL.PARMS);
               COL.array[k] = val;
               if (gn) hset.colgenenames[k] = gn;
           }

    } else {
        k = (id + num*COL.PARMS);
        COL.array[k] = val;
        if (gn) hset.colgenenames[k] = gn;
    }
};

/** set consecutive slots (typically rgb) from array or colour */
COL.setarr = function colset(name, num, val) {
    if (val.r !== undefined) val = [val.r, val.g, val.b];

    // set sequential values from array
    function setarr(k) {
        for (let i=0; i<val.length; i++) {
            COL.array[k+i] = val[i];
        }
    }

    COL.needsUpdate = true;
    var id = COL.addname(name);
    if (id < 0) return;  // message already issued
    if (num === -1) {
       for (let n=0; n<COL.NUM; n++)
           if (n !== WALLID) {
               var k = (id + n*COL.PARMS);
               setarr(k, val);
           }
    } else {
        k = (id + num*COL.PARMS);
        setarr(k, val);
    }
};





/** set colours in COL array from horn definitions/genes */
function setHornColours(genes) {
    if (COL.ignoreHornColours === 'usewall') {COL.setall(genes, 2, 2)}; // set just wall colours
    if (COL.ignoreHornColours && currentHset.colgenenames) return;
    // this will move elsewhere ....
    if (currentHset.colgenenames) {
        if (!renderVR.eye2) {
            COL.setall(genes);
            for (let hornid = 2; hornid < currentHset.hornrun.length; hornid++)
                colourTailor(hornid);  // just for special effects such as fluorescent bands and subband controls
        }
    } else {  // establish mapping for the current horn
        currentHset.colgenenames = [];
        for (let gn in COL.num) {
            if (!(gn in currentGenes)) currentGenes[gn] = genedefs[gn].def;
            COL.setG(gn, -1, currentGenes[gn], gn);
            var wgn = 'wall_' + gn;
            if (!(wgn in currentGenes) && wgn in genedefs) currentGenes[wgn] = genedefs[wgn].def;
            COL.setG(gn, WALLID, currentGenes[wgn], wgn);
        }
        opmode = 'OPCOLSET';
        renderPass(genes, uniforms, 'NOT A RENDERTARGET', 0);
        COL.send();
    }
}


/*global trancontextmenu */

/** definitions for complex horns
TODO:
crosshorn and constant gene/rp usage << more use of shader macros again?
head
star control by horn
colour by horn
hornlists (for convenience)
tori as well


~~~~~

This has multiple tasks:
    1 - use Javascript horn definition to generate javascript horn structure
    2 - generate associated transform code for shader
    3 - implement the render function for 'mainhorn' that (recursively) makes calls to low level render

Example: m is mainhorn, t its tail, tt the tail of t, and s the sub of t.
    tt |
    t  |
    m  |--| s

The transform code has sections for all horn structures,
starting with the outermost, and ending with the find mainhorn horn.
    code s
    code tt
    code t
    code m

When rendering a horn section X, the variable rp moves from 0 to 1 along the horn X
We keep track of the associated position X_rp for ALL horns, with X_rp = X_rpbase + rp * X_active
There are three sections while rendering horn X

    'active section X itself
        X_active = 1,
        X_rpbase = 0
        X_rp varies along section

    'current' sections on which X it is attached
        X_active = 1,
        X_rpbase = parm for where attached, 0 head, 1 tail, V in between)
        X_rp = X_rpbase

    'disabled' sections above and to the side of X
        X_active == ?,   ? is INACTIVE = 9999.
        X_rpbase = ?
        X_rp = ?

Alternative possibility is to generate different shaders for different sections, with disabled sections left out.
Marginally (?) more efficient, but more overhead and more code.

eg in example below
    When rendering tt   tt_active=1    t_active=0   m_active=0   s_active=?
                        tt_rpbase=0    t_rpbase=1   m_rpbase=1   s_rpbase=?
                        tt_rp=0..1     t_rp=1       m_rp=1       s_rp=?

    When rendering t    tt_active=?    t_active=1   m_active=0   s_active=?
                        tt_rpbase=?    t_rpbase=0   m_rpbase=1   s_rpbase=?
                        tt_rp=?        t_rp=0..1    m_rp=1       s_rp=?

    When rendering m    tt_active=?    t_active=?   m_active=1   s_active=?
                        tt_rpbase=?    t_rpbase=?   m_rpbase=0   s_rpbase=?
                        tt_rp=?        t_rp=?       m_rp=0..1    s_rp=?

    When rendering s    tt_active=?    t_active=?   m_active=0   s_active=1
                        tt_rpbase=?    t_rpbase=?   m_rpbase=V   s_rpbase=0
                        tt_rp=?        t_rp=?       m_rp=V       s_rp=0..q


Each horn that appears comes from a single call the the renderer.render, using recurive descent.
    m renders itself (unless radius is not defined)
        m makes ribsM calls to render multiple copies of s, with m_rpbase varying for each call
            s renders itsef
        m makes single call to render t, with m_rpbase=1 to place t at tail of m
            t renders itsef
            t makes single call to render tt, with t_rpbase=1 to place tt at tail of t
                tt renders itself

With later code (several years before 2016) all instances of each horn are rendered together,
and rp values are computed dynamically.

Note that while tt is rendering itself, m_rpbase=1 and t_rpbase=1, so full transforms for m and t apply,
and tt is placed at end of t.

~~~
Each horn may be held in various formats.
The initial user format (see https://docs.google.com/document/d/1bhJXMe9qBeQxXk5r0cIAlbfJr4KJItqmen8fxGiWkAU/edit#heading=h.1xigio8j5yha)
is designed to be fairly convenient to input, but expressive.

The horn is then help in internal form as a horn structure.

The horn structure may also be represented as a string similar to the original:
getHornSet(currentGenes.tranrule).toString() -> returns it redisplayed, but almost exactly the same numbers etc
genecode(genes) -> returns it showing the genes
valuecode(genes) -> returns it showing the current values

Some horn code is automatically generated to simplify adding horn functions.
so user HP.stack() is generated automatically from existence of internal HP.$stack()
Autogenerated user .stack() calls _addtrlow which assembles the horn structure.
This allows quick horn structure assembly to check basic syntax.
Horn compilation will call HP.$stack(), which calls HP.processTran() to do the bulk of compilation.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Interaction of horn with springs.
~~~~
...

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
horn rendering pipeline (all flows down and right)


original 24 fps
               lights/colours
                    |
horn --> STANDARD with GL_LEQUAL-->dispobjrt--COPY-->screen


as of Nov 15 with usemask = false  34 fps
                        lights/colours
horn --DEPTH--> buffer         |
         '-----------'-----STANDARD with GL_EQUAL-->dispobjrt--COPY-->screen

as of 15 Nov 2014  60 fps
                        lights/colours
horn --OPOPOS--> rtopos       |
  |                '--------. |
  '-----------------------OPOPOS2COL->dispobjrt--COPY-->screen


as of 26 March 2015  60 fps
                                                lights/colours
horn --OPOPOS--> rtopos                               |
  |                '--------.                         |
  '-----------------------OPSHAPEPOS->rtshapepos->OPTSHAPEPOS2COL->dispobjrt --COPY-->screen


proposed 15 Nov 2014
horn --OPSPPOINTS-> points
                       |
                       '.-----+-----OPOPOS--> rtopos
                       |      |                 |
                       '.-----+-------------- OPOPOS2COL--> dispobjrt--COPY-->screen

horn --OPSPPOINTS-> points --OPSPNORMAL-> mu/mv/normal
                       |                   |   |
                       '.-----------+-----OPOPOS---> rtopos
                       |            |          |       |
                       '.-----------+----------+--- OPOPOS2COL--> dispobjrt--COPY-->screen


other changes.  FRAGNORM, whether normals were recomputed in fragment shader
   Turned out to be faster as well as giving better rendering.

 *
 * different OPMODE
 * OPREGULAR        0: triangles ->           [screenpos] gridpos -> rgb result
 * OPSHADOWS        1: triangles (low res) -> [camerascreen] camviewpos -> z (gl_FragCoord)
 * OPPICK           3: triangles (1 point) -> ??? -> minx,maxx,miny.maxy,minz,maxz
 * OPMAKEGBUFF      4: triangles ->           [gridpos] objpos -> objpos
 * OPMAKEGBUFFX     5: triangles ->           [gridpos] objpos -> objpos  (in readback format)
 * OPPOSITION       6: triangles (low res) -> [minx,maxx,miny.maxy,minz,maxz] objpos -> objpos
 * OPOPOS           7: triangles ->           [screenpos] gridpos -> opos+hornid
 * OPOPOS2COL       8: square ->              [screenpos] screenpos -> rgb result  (using Q1 result as texture)
 * OPSHAPEPOS       9: square ->              [screenpos] opos+hornid -> trpos+normals+hornid
 * OPTSHAPEPOS2COL 10: square ->              [screenpos] trpos+normals+hornid -> rgb result
 *
 *
 ***/

var usewireframe = false;
function HornWrapFUN() {
"use strict";

/* for standalone debug */
if (!adduniformX) adduniformX = function() { console.log("adduniformx"); };
if (!addgene) addgene= function() { console.log("addgene"); };
if (!currentGenes) currentGenes = {};

var u; // = undefined;      // convenient shorthand
var INACTIVE = 9999.0;
var HW = this;
var forcerref = false;  // force any object with rref 0 to rref=ribs

this.subrepeat = 1;  // for html display

this.Tran = function(name, opts) {
    this.name = name;
    this.opts = opts;
    //this[0] = name;
    //this[1] = opts;
};
var TR = this.Tran.prototype;
/** mmm used on attibute makes it changeable */
var mmm = '" tabindex="0" ';
mmm += 'onmousedown="trmousedown(event)"; ';
mmm += 'onkeydown="trkeydown(event)"; ';
mmm += 'onkeyup="trkeyup(event)"; ';
mmm += 'onwheel="trwheel(event)"; ';
mmm += 'onfocus="trfocus(event)"; ';
mmm += 'onblur="trblur(event)"; ';
// these are handled at document level to make sure of catching
//mmm += 'onmouseup="trmouseup(event)"; ';
//mmm += 'onmousemove="trmousemove(event)"; ';
//mmm += 'oncontextmenu="trcontextmenu(event)"; ';
mmm += '>';
//mmm += 'ondrag="trmousemove(event)"; ';
TR.html = function(genes, hset, name, i) {

    var dd = this.name[0] === "x" ? " disabled" : "";
    var g = this._genecode;
    if (!g) g = [];
    var h = '<span class="tran' + dd + '">';
    var id = name + "_" + i + "_tranname";
    h += '<button class="tranname" id="' + id + '"oncontextmenu="trancontext(event);" onkeydown="trannamekeydown(event);">' + this.name+'</button>';
    h += '<span class="tranparms">';
    for (let ii=0; ii<g.length; ii++) {
        var gg = g[ii].toString();
        var gn = gg.split("#")[1];
        var v = format(genesub(gg, genes));
        // var sv = (v + "").substring(0,20);
        var sv = format(v);
        // str is formatted value, basic if can't find gene properly
        h += '<span class="tranparm">';
        var str = sv;
        if (gn) {
            var help = '<span class="help">' + genedefs[gn].help + "<br>" + gn + '</span>';
            var classs = genedefs[gn].free ? 'class="gval"' : 'class="gval frozen"';
            if (gg[0] === '#') {
                str = '<span ' + classs + ' contenteditable="true" id="TR_' + gn + mmm + v + '</span>';
            } else {
                var struc = Function('return ' + v)();
                if (typeof struc.k === "number") {
                    str = '<span class="tranbracket">{k:';
                    str += '<span ' + classs + ' contenteditable="true" id="TR_' + gn + mmm + format(struc.k) + '</span>';
                    str += help; help = "";
                    str += '}</span>';
                }
            }
            str += help;
        }
        h += str;
        h += '</span>';
    }
    h += '</span>';  // tranparms
    h += '</span>';  // tran
    return h;
};

/** define a new Horn object */
this.Horn = function(name, hset) {
    'use strict';

    this.name = name;
    this.rp = this.gn('rp');
    this.trans = [];
    this._sub = [];
    this._tail = [];
    this._head = [];
    hset.horns[name] = this;
    this._ribs = 10;
    this._rref = undefined;
    this._cols = [];
    this.hset = hset;
    this._usescale = true;
};
var HP = this.Horn.prototype;

/** ask for this horn not to be used in autoscaling */
HP.noautoscale = function() { this._usescale = false; return this; };

/** return gene name in standard format, allowing for possible recursion */
HP.gn = function(gn, lev) { return this.name + "_" + (lev ? lev + "_" : "") + gn; };

/** define number of ribs on a horn */
HP.ribs = function(r) {
    this._ribs = r;
    return this;
};

/** define reference number of ribs on a horn */
HP.rref = function(r) {
    //if (r === 0 || r === "0") r = undefined;
    this._rref = r;
    return this;
};

// reminder .. addgene(name, def, min, max, delta, step, help, tag, free, internal)
/** internal, add a new transform for a horn, and add corresponding gene */
HP._addgene = function(fun, def, min, max, delta, step, help, tag, free, useuniform) {
    // generate unique name for this horn
    var gn = this.gn(fun);
    while (this._genenames[gn])
        gn += "X";
    this._genenames[gn] = true;

    // and add as hset gene
    this.hset._addgene(gn, def, min, max, delta, step, help, tag, free, useuniform);
    return gn;
};

/** return true if gn matches smap */
HP._matchSpringmap = function(gn) {
    if (gn.indexOf("ribs") !== -1) return false;
    if (gn.indexOf("radius") !== -1) return false;
    var smap = this.hset._springMap;
    if (!smap) return false;
    if (smap === true) return true;
    for (let i=0; i<smap.length; i++) {
        if (gn.indexOf(smap[i]) !== -1) return true;
    }
    return false;
};

/** return true unless springmap starts with a "onespring" option (more efficient and to test for performance) */
HP._springmap2 = function(gn) {
    return this.hset._springMap[0] !== "onespring";
};

/** process and internal expression
If a number, this will create a gene and return the expression for that gene
If a string, this will return an expression for the string
*/
HP._expr = function(fun, s, min, max, delta, step, help, tag, free) {
    if (typeof s === "number") {
        var gn = this._addgene(fun, s, min, max, delta, step, help, tag, free === undefined ? "free" : free);
        // _addgene will have set currentGenes[gn] if necessary
        // currentGenes[gn] = target[gn] = s;  // ??? should we respect old gene values if available ???
        if (this._matchSpringmap(gn)) {
            if (kinect.process)
                genedefs[gn].free = 0;
            else {
                genedefs[gn].free = 1;
                //log("free ", gn);
            }
            //var gmap = this.gn(fun+"_map");
            //this._addgene(fun+"_map", 0, 0, 20, 1, 1, "particle to tie to this gene", "springmap", 0 );
            ////var xcode = "mvalt( (floor(" + gmap + ") + SUBP_rp*springl)*goff, SUBP_rp*histl, fract(" + gmap + ") ," + (min+0.0001) + "," + (max+0.0001) + ")";
            //var xcode = "kinxagg * mval( (floor(" + gmap + ") + SUBP_rp*springl)*goff, fract(" + gmap + ") ," + (min+0.0001) + "," + (max+0.0001) + ")";
            var gmap = this.gn(fun+"_map");
            this._addgene(fun+"_map", 0, 0, 2, 1, 1, "particle to tie to this gene", "springmap", 0 );
            var range = (max-min)/2;
            if (this._springmap2())
                var xcode = "kinxagg * mvalX2(" + gmap + "," + (range+0.00001) + ", SMAP1, SMAP2)"; // gmap is 0.25, 0.5, 0.75, 1.25, 1.5, 1.75
            else
                xcode = "kinxagg * mvalX1(" + gmap + "," + (range+0.00001) + ", SMAP1)"; // gmap is 0.25, 0.5, 0.75
            var xgn = "/*" + gn + "*/";  // flag so _genecode gets simple value, not full xcode
            if (fun === "scale")
                 return xgn + "(" + gn + "*" + "exp2(" + xcode + "))";
            else
                return xgn + "(" + gn + "+" + xcode + ")";
        } else {
            return gn;
        }
    } else if (typeof s === "string") {
        if (!isNaN(s) && s.indexOf('.') === -1) s = s.trim() + ".";  // turn "4" to "4."
        if (fun === "rref" && s*1 === 0)
            this.hset.setupcode += 'float ' + this.gn(fun) + "=" + this.gn("ribs") + ";\n";
        else if (fun === "rref" || fun === "ribs" || fun === "radius")
            this.hset.setupcode += 'float ' + this.gn(fun) + "=" + s + ";\n";
        return "(" + s + ")";
    } else {
       throwe("Unexpected expression '" + s + "' not type number/string but " + typeof s);
    }
};

/** convert _expr form to show form */
HP._show = function(xp) {
    if (xp.substring(0,1) === "(") return '"' + xp.substring(1,xp.length-1) + '"';  // string
    if (xp.substring(0,2) === "/*") xp = xp.substring(2).pre("*/");
    return "#" + xp + "#";  // gene
};

/** find for subhorn 0, to depth d */
HP.shorn = function (d) {
    if (d === undefined) d = 1;
    if (this._sub[0] === undefined) return undefined;
    var subh = this.hset.horns[this._sub[0].subname];
    if (!subh) return undefined;
    if (d === 1) return subh;
    return subh.shorn(d-1);
};
/** find name for subhorn 0, to depth d */
HP.sname = function (d) {
    var h = this.shorn(d);
    return h ? h.name : "NOSUBFOR_" + this.name;
};


/** internal, add a new transform for a horn, and add corresponding gene for a number value
 * code: vertex shader code to be generated ... substitutions will be made for genes etc
 * userparms: array of parns as specified by the user (in 's' format as below)
 * defs: array of definitions for parameters as specified by the caller
 *  each definition is an array of
 *      fun: parm name
 *      defval: default value (in 's' format as below)
 *      min: min value for range
 *      max: max value for range
 *      delta: delta for mutation
 *      step: step for gui
 *      help: help string
 *      free: "free"/1 or "frozen"/0, default free
 *      ptype: variable to use in structure if unadorned value given, default leave unadorned
 *         n.b TODO no way to force normal value where ptype specified
 * opts: gives further options
 *      .lowval: gives the start range for the value (default 0, 1 for scale)
 *      .funname: gives name for the function (otherwise same as basename for first gene)
 *
 * several cases for s ~~ these are exposed externally and passed through by stack() etc
 *
 * number: used as 'normal' gene, modulated by GGRP
 * string: use as literal code, no mutation.
 * {k: number}: used as 'constant', gene generated, modulated by GG
 * {v: number, horn: string} : use to modulate by position on another horn (assumed parent)
 *  ... more to follow
*/
HP.processTran = function(code, tran, defs, opts) {
    var userparms = tran.opts;
    if (opts === undefined) opts={};
    var genecodel = [];
    for (let i = 0; i < defs.length; i++) {      // merge specified arguments with default arguments
        var def = defs[i];
        var k=0, fun=def[k++], defval=def[k++], min=def[k++], max=def[k++], delta=def[k++], step=def[k++], help=def[k++], tag=def[k++], free=def[k++], ptype=def[k++];
        var s=userparms[i];
        var explicit = s !== undefined;
        if (!explicit) s = defval;
        // toshow is used to decide if parameter should be included in  genecode
        // toshow = explicit shows almost exact input,
        // but fails when default genes are changed later
        // as the changed genes are not then displayed
        // decision must be made later.
        //toshow = JSON.stringify(s) === JSON.stringify(defval)
        var toshow = true;

        let mmmm = "MM" + i;  // replacement value with rp factored in
        let lll = "LL" + i;  // literal replacement value
        var xp;
        if ((typeof s === "number" || typeof s === "string") && ptype !== undefined) {
            var t = s;
            s = {};
            s[ptype] = t;
        }

        if (typeof s === "number" || typeof s === "string") {
            xp = this._expr(fun, s, min, max, delta, step, help, tag, free);
            if (opts.lowval === undefined)
                code = code.replaceall(mmmm, "(" + xp + "*RP)").replaceall(lll, s);
            else
                code = code.replaceall(mmmm, "cubicmix(" + opts.lowval + "," + xp + ",RP)");
            if (toshow) genecodel.push(this._show(xp));
        } else if (s.start !== undefined) {
            var xps = this._expr(fun + "S", s.start, min, max, delta, step, help, tag, free);
            var xpe = this._expr(fun + "E", s.end, min, max, delta, step, help, tag, free);
            code = code.replaceall(mmmm, "cubicmix(" + xps + "," + xpe + ",RP)");
            if (toshow) genecodel.push("{start:" + this._show(xps) + ", end:" + this._show(xpe) + "}");
        } else if (s.k !== undefined) {
            xp = this._expr(fun + "K", s.k, min, max, delta, step, help, tag, free);
            code = code.replaceall(mmmm, xp);
            if (toshow) genecodel.push("{k:" + this._show(xp) + "}");
        } else if (s.v !== undefined) {
            xp = this._expr(fun + 'H' + s.horn, s.v, min, max, delta, step, help, tag, free);
            code = code.replaceall(mmmm, "(GG * " + s.horn + "_rp)");
            if (toshow) genecodel.push("{v:" + this._show(xp) + ", horn:'" + s.horn + "'}");
        } else {
           throwe("Unexpected value '" + s + "' not type number/string or element .v or .k: ");
        }
    }
    if (opts.global) { var bb1 = '{', bb2 = '}'; } else { bb1 = bb2 = ""; }  // allow for global code insert
    this.trancode += bb1 +
        code.replaceall("GG", xp)
        .replaceall("RP", "userp")
        .replaceall("HNAME", this.name)
        .replaceall("ACT", this.gn("active"))
        .replaceall("RIBS", this.gn("ribs"))
        .replaceall("RREF", this.gn("rref"))
        .replaceall("SUB1", this.sname(1))
        .replaceall("SUB2", this.sname(2))
        + bb2 + "\n";
    if (defs.length === 0) {
        this._genecode += "." + code;
    } else {
        var funname = opts.funname || defs[0][0];
        tran._genecode = genecodel;
        this._genecode += "." + funname + "(" + genecodel.join(",") + ")";
    }
    return this;
};

/** wig modifies the first parameter of the previous transform entry.
It finds the previous tranform, pixks up the first parameter, and replaces it with equivalent wig call */
HP.wig = function HPwig (low, high, timefreq, lenfreq) {
    var tr = this.trans[this.trans.length - 1];
    // var oldv = tr.opts[0];
    var oname = tr.name + '_';

    if (!this.genenames) this._genenames = {}; // [] if needed but wrong place

    if (low === undefined) low = -100;  // ?? ? use
    if (high === undefined) high = 1;
    if (timefreq === undefined) timefreq = 1;
    if (lenfreq === undefined) lenfreq = 1;

    var ln = this._addgene(oname + 'wiglow', low, -100, 100, 1, 0.1, 'low value for wiggle', 'geom', 1);
    var hn = this._addgene(oname + 'wighigh', high, -100, 100, 1, 0.1, 'low value for wiggle', 'geom', 1);
    var tf = this._addgene(oname + 'wigtimefreq', timefreq, 0.1, 10, 0.1, 0.01, 'time frequency (seconds) for wiggle', 'geom', 1);
    var lf = this._addgene(oname + 'wiglenfreq', lenfreq, 0.1, 10, 0.1, 0.01, 'length frequency along horn for wiggle', 'geom', 1);
    tr.opts[0] = 'wig(' + ln + ', ' + hn + ', ' + tf + ', ' + lf + ', 0.)';
    //tr.opts[0] = '( (' + ln + '+' + hn + ')/2. + (' + hn + '-' + ln + ') * sin(3.14159 * (time * ' + tf + ' + rp * ' + lf + ')) )';
    return this;
}

/** It finds the previous tranform, pixks up the first parameter, and replaces it with equivalent wig call */
HP.pulse = function HPwig (low, high, timefreq, lenfreq, pulsewidth) {
    var tr = this.trans[this.trans.length - 1];
    // var oldv = tr.opts[0];
    var oname = tr.name + '_';

    if (!this.genenames) this._genenames = {}; // [] if needed but wrong place

    if (low === undefined) low = -100;  // ?? ? use
    if (high === undefined) high = 1;
    if (timefreq === undefined) timefreq = 1;
    if (lenfreq === undefined) lenfreq = 1;
    if (pulsewidth === undefined) pulsewidth = 0.1;

    var ln = this._addgene(oname + 'pulselow', low, -100, 100, 1, 0.1, 'low value for pulse', 'geom', 1);
    var hn = this._addgene(oname + 'pulsehigh', high, -100, 100, 1, 0.1, 'low value for pulse', 'geom', 1);
    var tf = this._addgene(oname + 'pulsetimefreq', timefreq, 0.1, 10, 0.1, 0.01, 'time frequency (seconds) for pulse', 'geom', 1);
    var lf = this._addgene(oname + 'pulselenfreq', lenfreq, 0.1, 10, 0.1, 0.01, 'length frequency along horn for pulse', 'geom', 1);
    var pw = this._addgene(oname + 'pulsewidth', pulsewidth, 0.01, 1, 0.1, 0.01, 'width of pulse (proportion of 1)', 'geom', 1);
    tr.opts[0] = 'pulse(' + ln + ', ' + hn + ', ' + tf + ', ' + lf + ', 0., ' + pw + ')';
    //tr.opts[0] = '( (' + ln + '+' + hn + ')/2. + (' + hn + '-' + ln + ') * sin(3.14159 * (time * ' + tf + ' + rp * ' + lf + ')) )';
    return this;
}



// code to process definition
HP.$stack = function(o,s) { return o.processTran("stack(MM0)", s, [["stack", 1000, 0, 2000, u, 0.1, "stack for horn"]]); };
HP.$stackx = function(o,s) { return o.processTran("stackx(MM0)", s, [["stackx", 1000, 0, 2000, u, 0.1, "stack for horn"]]); };
HP.$stacky = function(o,s) { return o.processTran("stacky(MM0)", s, [["stacky", 1000, 0, 2000, u, 0.1, "stack for horn"]]); };
HP.$stackz = function(o,s) { return o.processTran("stackz(MM0)", s, [["stackz", 1000, 0, 2000, u, 0.1, "stack for horn"]]); };
HP.$stackxyz = function(o,s) { return o.processTran("stackxyz(MM0, MM1, MM2)", s, [
        ["x", 1000, 0, 2000, u, 0.1, "x horn"],
        ["y", 1000, 0, 2000, u, 0.1, "y horn"],
        ["z", 1000, 0, 2000, u, 0.1, "z horn"]
    ]);
};
HP.$code = function(o,s) {
    const aa = [[]];
    const l = s.opts.length;
    if (l >= 2) aa.push(["code", 0, -1, 1, u, 0.01, "code 0"]);
    if (l >= 3) aa.push(["code1", 0, -1, 1, u, 0.01, "code 1"]);
    if (l >= 4) aa.push(["code2", 0, -1, 1, u, 0.01, "code 2"]);
    if (l >= 5) aa.push(["code3", 0, -1, 1, u, 0.01, "code 3"]);
    return o.processTran("LL0;", s, aa, {funname: "code"});
};
HP.$gcode = function(o,s) {
    return o.processTran("LL0;", s, [
    [],
    ["code", 0, -1, 1, u, 0.01, "code 0"],
    ["code1", 0, -1, 1, u, 0.01, "code 1"],
    ["code2", 0, -1, 1, u, 0.01, "code 2"],
    ["code3", 0, -1, 1, u, 0.01, "code 3"]
    ], {funname: "gcode", global: true});
};
HP.$bend = function(o,s) {
    if (s.opts.length <2) {
        return o.processTran("twr(x,y, MM0);", s, [
            ["bend", 90, -360, 360, u, 0.1, "bend for horn"]
        ], {funname: "bend"});
    } else {
        return o.processTran("twr(x,y, MM0, MM1);", s, [
            ["bend", 90, -360, 360, u, 0.1, "bend for horn"],
            ["bendoff", {k: "0"}, -200, 200, u, 0.1, "bend offset along horn", "geom", "free", "k"]
        ], {funname: "bend"});
    }
};
HP.$wiggle = function(o,s) {
    if (s.opts.length <3) {
        return o.processTran("wiggle(x, MM0, MM1);", s, [
            ["wigfreq", 90, -360, 360, u, 0.1, "wiggle freq for horn"],
            ["wigamp", 90, -360, 360, u, 0.1, "wiggle amp for horn"]
        ], {funname: "wiggle"});
    } else {
        return o.processTran("wiggle(x, MM0, MM1, MM2);", s, [
            ["wiggle", 90, -360, 360, u, 0.1, "wiggle freq for horn"],
            ["wigamp", 90, -360, 360, u, 0.1, "wiggle amp for horn"],
            ["wigphase", {k: "0"}, -200, 200, u, 0.1, "phase of wiggle", "geom", "free"]
        ], {funname: "wiggle"});
    }
};

HP.$curl = function(o,s) {
    if (s.opts.length <2) {
        return o.processTran("twr(y,z, MM0);", s, [
            ["curl", 90, -360, 360, u, 0.1, "curl for horn"]
        ], {funname: "curl"});
    } else {
        return o.processTran("twr(y,z, MM0, MM1);", s, [
            ["curl", 90, -360, 360, u, 0.1, "curl for horn"],
            ["curloff", {k: "0"}, -200, 200, u, 0.1, "curl offset along horn", "geom", "free", "k"]
        ], {funname: "curl"});
    }
};

HP.$pintexture = function(o,s) { return o.processTran("pintexture(MM0)", s, [["pintexture", 1000, 0, 2000, u, 0.1, "nominal stack for texture"]]); };
HP.$clelia = function(o,s) {
    return o.processTran("cleliac(rp, x,y,z,MM0,MM1,MM2,MM3,MM4);", s, [  // k,j,gamma,beta
        ["A", {k: 1}, -10,10, 0.1,0.01, "scale"],
        ["G", {k: 5}, -20,20, 0.1,1, "G value"],
        ["F", {k: 3}, -20,20, 0.1,1, "F value"],
        ["gamma", {k: 0.3}, -1,1, 0.01,0.001, "gamma value"],
        ["beta", {k: 0.7}, -1,1, 0.01,0.001, "beta value"]
    ]);
};
HP.$clelia2 = function(o,s) {
    return o.processTran("clelia2(x,y,z,MM0,MM1,MM2,MM3,MM4,MM5,MM6,MM7);", s, [  // k,j,gamma,beta
        ["k", {k: 5}, -20,20, 0.1,1, "k value"],
        ["j", {k: 3}, -20,20, 0.1,1, "j value"],
        ["gamma", {k: 0.3}, -1,1, 0.01,0.001, "gamma value"],
        ["beta", {k: 0.7}, -1,1, 0.01,0.001, "beta value"],
        ["k2", {k: 7}, -20,20, 0.1,1, "k2 value"],
        ["j2", {k: 11}, -20,20, 0.1,1, "j2 value"],
        ["gamma2", {k: 0.3}, -1,1, 0.01,0.001, "gamma2 value"],
        ["beta2", {k: 0.7}, -1,1, 0.01,0.001, "beta2 value"]
    ]);
};
HP.$twist = function(o,s) {
    if (s.opts.length <3) {
        return o.processTran("twr(x,z, MM0, MM1);", s, [
            ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
            ["twistoff", {k: 50}, -200, 200, u, 0.1, "twist offset along horn", "geom", "free", "k"]
        ]);
    } else {
        return o.processTran("twr(x,z, MM0, MM1, MM2);", s, [
            ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
            ["twistoff", {k: 50}, -200, 200, u, 0.1, "twist offset along horn", "geom", "free", "k"],
            ["twistphase", {k: "0"}, -200, 200, u, 0.1, "phase of twist", "geom", "free"]
        ]);
    }
};
HP.$twax =  function(o,s) {
    return o.processTran("twax(x,y,z, vec3(MM1, MM2, MM3), MM0);", s, [
        ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
        ["twx", {k: 1}, -1, 1, u, 0.01, "twist x axis", "geom", "free", "k"],
        ["twy", {k: 1}, -1, 1, u, 0.01, "twist y axis", "geom", "free", "k"],
        ["twz", {k: 1}, -1, 1, u, 0.01, "twist z axis", "geom", "free", "k"]
    ]);
}
HP.twaxv = function(v, ax) { return this.twax(v, ax.x, ax.y, ax.z); }

// >>> TODO verify MM0 below
HP.$scale = function(o,s) {
    return o.processTran("scale(MM0)", s, [["scale", 1, 0.5, 2, u, 0.01, "scaling along horn: 1 regular, 0 to point"]], {lowval: "1."});
};
HP.$branch = function(o,s) {
   return o.processTran("branchanimX(MM0, MM1, RP, RIBS, RREF)", s, [
        ["branchs", {k: 1}, 0, 1, u, 0.1, "branch proportion", "geom", "free", "k"],
        ["branchp", {k: 1}, 0, 5, u, 0.00005, "branch rotational pattern", "geom", "frozen", "k"]
    ], {funname: "branch"});
};
HP.$spoke = function(o,s) {
   return o.processTran("branchanimX(MM0, 360./( (MM1)*137.5) , RP, RIBS, RREF)", s, [
        ["spokes", {k: 1}, 0, 1, u, 0.1, "spoke spread proportion", "geom", "free", "k"],
        ["spoker", {k: 5}, 0, 5, u, 0.0025, "spoke repeat pattern", "geom", "frozen", "k"]
    ], {funname: "spoke"});
};
HP.$spiral = function(o,s) {
   return o.processTran("branchspiralX(MM0, MM1, RP, RIBS, RREF)", s,
        [["spirals", {k: 1}, 0, 1, u, 0.1, "spiral proportion", "geom", "free", "k"],
        ["spiralp", {k: 1}, 0, 5, u, 0.1, "spiral spiral pattern", "geom", "frozen", "k"]
    ], {funname: "spiral"});
};
HP.$sweep = function(o,s) { return o.processTran("twr(x,y, MM0, 0.);", s, [["sweep", {k: 90}, 0, 180, u, 0.1, "sweep for horn", "geom", "free", "k"]]); };
HP.$flap = function(o,s) { return o.processTran("twr(x,z, MM0, 0.);", s, [["flap", {k: 0}, -90, 90, u, 0.1, "flap for horn", "geom", "free", "k"]]); };
HP.$tilt = function(o,s) { return o.processTran("twr(y,z, MM0, 0.);", s, [["tilt", {k: 90}, -180, 180, u, 0.1, "tilt for horn", "geom", "free", "k"]]); };
HP.$swap = function(o,s) { return o.processTran("swap(LL0,LL1)", s, [[],[]], {funname: "swap"}); };
HP.$swapn = function(o,s) { return o.processTran("swapn(LL0,LL1)", s, [[],[]], {funname: "swapn"}); };
HP.$radiate = function(o, s) {
    return o.processTran("radiate(MM0)", s, [["radiate", {k: 100}, 0, 100000, u, 10, "radiate, parm gives y distance for full 360 degrees", "geom", "free", "k"]]); };
HP.$warp = function(o, s) {
    return o.processTran("warp(MM0,MM1,MM2)", s, [
        ["warp", {k: 1}, 0, 4, u, 0.05, "number of warps ", "geom", "free", "k"],
        ["amp", {k: 0.02}, 0, 0.1, u, 0.005, "amp", "geom", "free", "k"],
        ["offset", {k: 100}, -1000, 1000, u, 10, "offset", "geom", "free", "k"]
    ]); };

HP.$tw4 = function(o,s)  { return o.processTran("twr(LL0,LL1, MM2, MM3);", s, [
        [],
        [],
        ["tw4", 360, -1440, 1440, u, 0.1, "twist along horn, 4d"],
        ["tw4off", {k: 0}, -200, 200, u, 0.1, "twist offset along horn, 4d", "geom", "free", "k"]
    ]); };

HP.$st4 = function(o,s) { return o.processTran("st(LL0, MM1)", s, [[], ["st4", 1000, 0, 2000, u, 0.1, "stack for horn, 4d"]]); };
HP.$growpart = function(o, s) { return o.processTran("growpart(MM0,RP,PARENT_rp,PARENT_rref,PARENT_ribs)", s, [
        ["growpart", {k: 0.1}, 0, 1, u, 0.01, "proportion at end with reduced growth", "geom", "fixed", "k"]
    ]); };
HP.$growpartr = function(o, s) { return o.processTran("growpartr(MM0,RP,PARENT_rp,PARENT_rref,PARENT_ribs)", s, [
        ["growpartr", {k:0.1}, 0, 1, u, 0.01, "proportion at end with reduced radius", "geom", "fixed", "k"]
    ]); };
HP.$web = function(o, s) {
    return o.processTran( "web(HNAME_rp, HNAME_ribs, HNAME_rref, SUB2_ribs, SUB2_rref, SUB2_stack, MM0,MM1,MM2,MM3)", s, [
        ["warp", {k: 1}, 0, 5, u, 0.05, "number of warps for each radial segment", "geom", "free", "k"],
        ["amp", {k: 0.02}, 0, 0.1, u, 0.005, "amplitude of the warps", "geom", "free", "k"],
        ["offset", {k: 100}, 0, 1000, u, 10, "offset of web from centre", "geom", "free", "k"],
        ["prop", {k: 1}, 0, 1, u, 0.05, "proportion of circle to sweep", "geom", "frozen", "k"]
    ], {funname: "web"}); };

HP.$savepos = function(o, s) {
    if (s.opts.length > 0) {
        var id = s.opts[0];
        this._genecode += ".savepos('" + id + "')";
    } else {
        id = this.name;
        this._genecode += ".savepos()";
    }
    var saveposset = this.hset._saveposset;
    if (saveposset[id] !== false) saveposset[id] = true;  // must record it exists, but don't set for auto addpos if addpos already seen
    this.trancode += "savepos(save_" + id + ");\n";
    return this;
};

HP.$addpos = function(o, s) {
    var id = s.opts[0];
    this.hset._saveposset[id] = false;
    this._genecode += ".addpos('" + id + "')";
    this.trancode += "addpos(save_" + id + ");\n";
    return this;
};


// HP.$xytest = function() {} // test for illegal $x function

// top level shim to collect definition
HP._addtrlow = function(fun, args) {
    args = Array.prototype.slice.call(args, 0);  // convert from Arguments type to array
    this.trans.push(new HornWrap.Tran(fun, args));
    return this;
};

// establish the user version of all the horn functions
// eg HP.stack = function() { return this._addtrlow('stack', arguments); };
// also add 'dummy' versions xstack etc
// and prepare a context menu of transforms
var menu = "";
menu += '<p onclick="newop(event)">cancel</p>';
menu += '<p onclick="newop(event)">delete</p>';
menu += '<p onclick="newop(event)">toggle</p>';
menu += '<p onclick="newop(event)">move up</p>';
menu += '<p onclick="newop(event)">move down</p>';
menu += '<p onclick="newop(event)">sub</p>';
menu += '<hr>';
for (let op in HP) {
    if (op[0] === "$") {
        var opp = op.substring(1);
        if (opp[0] === "x") {
            // avoid functions $x.
            // if we really need one, we must change the prefix or use other mechansim
            serious("HORN FUNCTION STARTS $x WILL NOT WORK: " + op);
        } else {
            HP[opp] = Function("return this._addtrlow('" + opp + "', arguments);");
            HP["x" + opp] = Function("return this;  ");
            menu += '<p onclick="newop(event)">' + opp + '</p>';
        }
    }
}
W.trancontextmenu.innerHTML = menu;

HP.radius = function(r) {
    this._radius = r;
    return this;
};

/** add horn specific colors */
HP.color = function(cols) {
    this._cols.push(cols);
    return this;
};

/** define a subhorn for a horn, optional with several parameters or structure */
HP.sub = function(h, num, start, end, depth) {
    if (typeof num === "object") {
        var hs = num;
        hs.subname = h;
    } else {
        hs = { subname: h, num: num, start: start, end: end, depth: depth };
    }
    this._sub.push(hs);
    return this;
};

/** define a ribcage for a horn, optional with several parameters or structure */
HP.ribcage = function(h, num, start, end, depth) {
    if (typeof num === "object") {
        var hs = num;
        hs.subname = h;
        hs.cage = true;
    } else {

        hs = { subname: h, num: num, start: start, end: end, depth: depth, cage: true };
    }
    this._sub.push(hs);
    return this;
};
/** define a tail for a horn */
HP.tail = function(h) {
    if (subsfortailsouter) this.sub(h, 0, 1, 1);
    else this._tail.push(h);
    return this;
};

/** define a head for a horn */
HP.head = function(h) {
    if (subsfortailsouter) this.sub(h, 0, 0, 0);
    else this._head.push(h);
    return this;
};

/** macro for web
 * spoken is name of spoke horn,
 * which must have a suitable sub defined; the sub will beome ringn
 * -
 * if spoken is not defined, suitable spoke and ring horns are defined automaticallyreplac
 * */
HP.webm = function(spoken) {
    var webh = this.name;
    var ringn, spokeh;
    if (spoken === undefined) {
        spoken = webh + "_s";
        spokeh = horn(spoken, this.hset).ribs(10).rref(10).radius(50).stack(1000).bend(0).curl(0).swapn("x","y").color();
    } else {
        spokeh = this.hset.horns[spoken];
        if (spokeh === undefined) { console.log("web uses undefined sub " + spoken); return; }
    }
    var ringh = spokeh._sub[0];
    if (ringh === undefined) {
        ringn = webh + "_r";
        horn(ringn, this.hset).ribs(8).rref(8).radius(25).stack(500).swapn("x","y").color();
        spokeh.sub(ringn);
    } else {
        ringn = ringh.subname;
    }
    //this.rref("0");
    this.web();
    this.sub(spoken);
    return this;
};

/** find genes used by horn and dependents (not actually used) */
//HP.allGenes = function(fun) { TODO if used allow for {} set not array
//    var allgenes = this._genenames.slice(0);
//    for (let i in this._tail) allgenes = allgenes.concat(horns[this._tail[i]].allGenes());
//    for (let i in this._head) allgenes = allgenes.concat(horns[this._head[i]].allGenes());
//    for (let i in this._sub) allgenes = allgenes.concat(horns[this._sub[i].subname].allGenes());
//    return allgenes;
//};

/** check the tail, head and sub are ok,
 * generate code and return reduced list for those that are ok */
HP.uselist = function(list, parents, subparents, type, hset) {
    var ok = [];
    for (let i in list) {
        var item = list[i];

        let name = type === "sub" ? item.subname : item;
        if (false) {
//        } else if (parents.indexOf(name) !== -1) {
//            console.log("ignoring recursive " + type + " " + name + " in " + this.name);
        } else if (!hset.horns[name]) {
            console.log("ignoring unfound " + type + " " + name + " in " + this.name);
        } else {
            if (type === "sub") {
                if (parents.slice(0, -1).indexOf(this.name) === -1) {
                    // var xx=['"'+name+'"'];
                    var xx = [];
                    if (item.num !== u) xx.push("num: " + this._show(this._expr("S_" + name + "_num", item.num, 0, 50, 1, 0.1, "number of instances of " + name + " under " + this.name)));
                    if (item.start !== u) xx.push("start: " + this._show(this._expr("S_" + name + "_start", item.start, 0, 1, 0.1, 0.1, "start pos of " + name + " under " + this.name)));
                    if (item.end !== u) xx.push("end: " + this._show(this._expr("S_" + name + "_end", item.end, 0, 1, 0.1, 0.1, "end pos of " + name + " under " + this.name)));
                    if (item.depth !== u) xx.push("depth: " + this._show(this._expr("S_" + name + "_depth", item.depth, 0, 7, 1, 1, "recursion depth of " + name + " under " + this.name)));
                    var nn = (item.cage) ? "ribcage" : "sub";
                    var parms = xx.length === 0 ? "" : ", {" + xx.join(",") + "}";
                    this._genecode += "." + nn + "(" + '"'+name+'"' + parms + ")";
                    this.hascage = this.hascage || item.cage;
                }
            } else if (type === "tail") {
                this._genecode += '.tail("' + name + '")';
            } else if (type === "head") {
                this._genecode += '.head("' + name + '")';
            } else throwe("unexpected type to HP.uselist " + type);

            ok.push(list[i]);  // push in the full form
            hset.horns[name]._compileh(parents, subparents, hset);
       }
    }
    return ok;
};

/** compile any special colour requests */
HP._compilecols = function(hset, lev) {
    // work out our colour overrides (if any)
    // >>>> todo resolve where old values left in genedefs cause wrong colour for non color() spec

    // prepare to apply them at render time
    this._coluse = {};  // mapping to say if texture value has special local values, eg false use gloabal 'red1', true use 'Q_red1', or 'Q_3_red1'

    for (let name in genedefs) {
        let gd = genedefs[name];
        if (gd.tag === "texture") this._coluse[name] = name;
    }

    for (let i in this._cols) {
        var cols = this._cols[i];


        if (cols === undefined) {  // color() alone makes specific values for all
            for (let name in genedefs) {
                let gd = genedefs[name];
                if (gd.tag !== "texture") continue;
                let myname = this.gn(name, lev);
                var xname = myname.post(this.name + "_");
                this._addgene(xname, FIRST(currentGenes[name], gd.def), gd.min, gd.max, gd.delta, gd.step, gd.help, "horncol", gd.free, false);
                this._coluse[name] = myname;
            }
            if (lev === 0) this._genecode += ".color()";
        } else {  // a specified list of attributes to override, eg color({red1:0.2})
            var xx = [];
            for (let c in cols) {
                var gd = genedefs[c];
                if (!gd) continue;
                let myname = this.gn(c, lev);  // c was name, but probably wrong sjpt 15/8/2017
                var xp = this._expr(c, cols[c], gd.min, gd.max, gd.delta, gd.step, gd.help, "horncol", gd.free, false);
                xx.push(c + ":" + this._show(xp));
                this._coluse[c] = myname;
            }
            if (lev === 0) this._genecode += ".color({" + xx.join(",") +"})";
        }
    }

    // if colours have been specified, copy them into the global
    // otherwise use global colors
    //if (false)
/**
    var ug = usedgenes();
    for (let name in genedefs) {
        var gd = genedefs[name ];
        if (gd.tag !== "texture") continue;
        var myname = this.gn(name, lev);
        // if my object has horn specific attribute, use it
        // if not, use generic attribute
        // in some cases (bad initialization) it may not even have the generic attribute
        // in which case just leave it alone
        this._coluse[name] = ug !== undefined;  // true if 'special', false if standard
    }
**/
};

/** roll out all code for a horn, using horns defined in the HornSet hset
generates items .trancode, ._genenames, _genecode
    parents is complete list of elements this hangs off (sub, tail, ...)
    subparents is list of elements to which this has a sub relationship
     **/
HP._compileh = function(parents, subparents, hset) {
    // don't compile too deep, we can't execute it.
    // total depth limit applies whether explict or recursive
    if (parents.length > 7) {
        log('maximum recursion depth reached, truncated', parents);
        return;
    }
    var me = this;
    var medepth = parents.reduce(function(p,n) { return p + (n === me.name ? 1 : 0); }, 0);
    // var hornid = hset.hornid++;

// todo: remove soon, 1 March 2016
// hornrun is now established on first render run
// too much effort to try to get it right on compile
// eg it was corrupting ribcages by getting the two sides mixed
//    hset.hornrun[hornid] = {hornid: hornid, medepth: medepth, horn: me};
//log("compile", this.name, hornid);

    // if (this.hset && this.hset !== hset && this.hset !== cloneCircle) throwe("attempt to reuse horn in different hset");
    this.hset = hset;
    if (hset.segnames.indexOf(this.name) !== -1) return;  // code already generated

    // initialize the output that will be collected
    var pretrancode  = (parents.length === 0) ? '{ // ' + this.gn('always active') + '\n' : " if (" + this.gn("active", medepth) + " != 9999.){\n";
    pretrancode += "float level = " + medepth + ".0;\n";
    pretrancode += "float myrp = " + this.gn("rp", medepth) + ";\n";
    if (this.trans.length > 0 && this.trans[0].name !== 'branch') // ??? check for ANY is branch
        pretrancode += "crp += myrp;\n";
    if (subparents.length > 0)
        pretrancode += "float SUBP_rp = " + subparents[subparents.length-1] + "_rp;\n";
    else
        pretrancode += "float SUBP_rp = 0.;\n";  // something other than 0 could give interesting delay effect

    if (medepth === 0) {  // only compile the basic trancode once even if recursive
        this.trancode = "";
        this._genenames = {};
        this._genecode = 'horn("' + this.name + '")';


        var xp = this._expr("ribs", this._ribs, 1, 200, u, 0.1, "number of ribs in horn", "geom");
        this._genecode += ".ribs(" + this._show(xp) + ")";

        if (forcerref && this._rref === undefined)
            this._rref = this._ribs;
        xp = this._expr("rref", this._rref === undefined ? "0" : this._rref, 0, 200, u, 0.1, "reference number of ribs in horn", "geom", "frozen");
        if (this._rref !== undefined) this._genecode += ".rref(" + this._show(xp) + ")";

        if (this._radius !== undefined) {
            var minRadius = W.UICom.m_isProjVersion ? 13.0 : 0.0;    // stop very small radii in proj version
            xp = this._expr("radius", this._radius, minRadius, 50, u, 0.1, "radius for horn");
            this._genecode += ".radius(" + this._show(xp) + ")";
        }

        // unroll the transforms
        for (let t in this.trans) {
            var tran = this.trans[t];
            if (tran.name[0] !== "x")
                this["$"+tran.name](this, tran);
        }
    }

    if (this._matchSpringmap(this.name)) {  // mval
        var gmap1 = this.gn("map1");
        this._addgene("map1", 0, 0, 20, 1, 1, "particle1 to tie to this horn", "springmap", 0 );
        pretrancode += "vec4 SMAP1 = ppos((floor(" + gmap1 + ") + SUBP_rp*springl)*goff);\n";
        if (this._springmap2()) {
            var gmap2 = this.gn("map2");
            this._addgene("map2", 0, 0, 20, 1, 1, "particle2 to tie to this horn", "springmap", 0 );
            pretrancode += "vec4 SMAP2 = ppos((floor(" + gmap2 + ") + SUBP_rp*springl)*goff);\n";
        }
    }


    parents = parents.slice(0);
    parents.push(this.name);
    var nsubparents = subparents.slice(0);
    nsubparents.push(this.name + (medepth ? "_" + medepth : ""));
    // var i;
    //extrauniforms += "uniform float ") + this.gn("active") + "; uniform float " + this.gn("rpbase");
    hset._adduniformX(this.gn("active", medepth), INACTIVE);
    hset._adduniformX(this.gn("rpbase", medepth), INACTIVE);
    hset._adduniformX(this.gn("para", medepth), new THREE.Vector4( 0, 0, 0, 0 ), "v4");
    hset._adduniformX(this.gn("parb", medepth), new THREE.Vector4( 0, 0, 0, 0 ), "v4");
    // hset._adduniformX('cumcount' + hornid, 0, "f", true);  // this really is a uniform even for singlemulti, does not allow for ribcage here

    var xname = this.name;
    if (medepth) xname += "_" + medepth;  // extra names for recursive elements
    hset.setupcode += "float X_rp01 = X_active * rp + X_rpbase + dotParpos(X_para, X_parb, parpos);\n".replaceall("X", xname);
    hset.setupcode += "float X_rp = X_rp01".replaceall("X", xname) + " * X_ribs / X_rref;\n".replaceall("X", this.name);

    this._sub = this.uselist(this._sub, parents, nsubparents, 'sub', hset);
    this._tail = this.uselist(this._tail, parents, nsubparents, 'tail', hset);
    this._head = this.uselist(this._head, parents, subparents, 'head', hset);
    this._compilecols(hset, medepth);

    hset.pickoutput += "slot(" + hset.segnames.length + ", X_rp01);".replaceall("X", this.name);
    hset.segnames.push(this.name);
    // hset.slot++;
    if (this.hascage) {
        hset._adduniformX(this.gn("reflx", medepth), INACTIVE);
        pretrancode += "reflx(" + this.gn("reflx", medepth) + ");\n";
    }
    // ltrancode is specific to this depth of recursion
    // TODO check interaction of recursion with PARENT/SUBPARENT
    var ltrancode = pretrancode + this.trancode + "}\n\n";
    ltrancode = ltrancode.replaceall("SUBPARENT", subparents[subparents.length-1]);
    ltrancode = ltrancode.replaceall("PARENT", parents[parents.length-2]);
    hset.trancode += ltrancode.replaceall(this.gn("rp"), this.gn("rp", medepth));

    if (medepth === 0) {
        this._genecode += ";";
        hset._genecode += this._genecode + "\n";
    }

};

var lastRevFrame = 0;  // last frame a reverse happened


/** prepare uniform colours for a horn
 * Separated to help performance profile
 */
HP._colset = function(genes, uniformsp, lev) {
    var coluse;
/**
    if (usemask && opmode === OPOPOS) {
        coluse = { screenDoor: this.gn('screenDoor') };  // special case
    } else if (!usemask || opmode === OPOPOS2COL || opmode === OPTSHAPEPOS2COL || opmode === OPTEXTURE) {
        coluse = this._coluse;          // get all colours in _coluse
    } else {
        return;  // they are not used here anyway
    }
**/
if (opmode !== 'OPCOLSET') return;  // colours compiled in a separate opmode === 'OPCOLSET' colour pass
coluse = this._coluse;          // get all colours in _coluse

    // -1 as it has already been incremented
    // later will control in a differnt way anyway. ...... sjpt 10 Oct 2015
    // NO, broken by restriction that indexing must be by constant expression! DAMN
    var p = this.hset.hornid - 1; // position, will be set to hornid
    // if colours have been specified, copy them into the global
    // otherwise use global colors
    //if (false)
    for (let name in coluse) {
        var myname = (coluse[name] === name) ? name : this.gn(name, lev); // correct for generic (no colour()) and for recursive

        // if my object has horn specific attribute, use it
        // if not, use generic attribute
        // in some cases (bad initialization) it may not even have the generic attribute
        // in which case just leave it alone
        var vv = genes[myname];
        if (vv !== undefined) {
            COL.setG(name, p, vv, myname);
        } else {
            if (COL.get(name, p) !== COL.get(name, 0))
                debugger;  // should not get here, if not explicity should be copied from default
        }
//if (vv !== undefined && uniforms[namea] !== undefined) uniforms[namea].value = [vv];
    }
    colourTailor(p);

    COL.send();

};

/** resolve a given value.
spec is what was specificed in definition (eg, 15, "15", "Q_radius")
role is the role we are looking up (eg "radius")
*/
HP._resolve = function(spec, role) {
    if (spec === undefined) return undefined;
    if (typeof spec === "string" && spec*0 === 0) return spec*1;  // constant number "15"
    if (typeof spec === "string") return uniforms[spec].value;   // "Q_radius", does not allow for expressions
    return uniforms[this.gn(role)].value;
};

/** symbolic version of above for single pass multihorsn */
HP._resolvesym = function(spec, role) {
    if (spec === undefined) return undefined;
    if (typeof spec === "string" && spec*0 === 0) return spec*1;  // constant number "15"
    if (typeof spec === "string") return spec;   // "Q_radius", does not allow for expressions
    return this.gn(role);
}


/** render this horn */
HP._renderme = function(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid) {
    if (badshader) return;

    if (!this._usescale && opmode === OPPOSITION) return;  // do not count this horn for autoscale/position
    // do in renderh var hornid = hset.hornid++;  // keep track of each horn render situation
    uniformsp.hornid.value = hornid;
    //framelog("renderme", this.name, hornid, oplist[opmode]);
    var medepth = key.split(this.name).length - 1;  // depth of self-recursion
    if (opmode === 'OPCOLSET') {
        this._colset(genes, uniformsp, medepth);
        if (this.name === hornhighlight) {
            // log("set highlight for hornid", hornid);
            COL.setG("red1", hornid, 2);
            COL.setG("red2", hornid, 2);
            COL.setG("red3", hornid, 2);
            COL.setG("refl1", hornid, 0);
            COL.setG("refl2", hornid, 0);
            COL.setG("refl3", hornid, 0);
        }
        return;
    }

    //framelog("render", this.name, hornid);
    var hornrun = hset.hornrun[hornid];
    if (!hornrun)
        hornrun = hset.hornrun[hornid] = {hornid: hornid, medepth: medepth, horn: this};

    if (hornrun.horn !== this || hornrun.medepth !== medepth || hornrun.hornid !== hornid)
        log('inconsistent hornrun order', this.name, hornrun.horn.name, hornid);
    //else
    //    log('RIGHT compile?', this.name, hornrun ? hornrun.horn.name : "NOHORNRUN", hornid);

    // compute radius, may be in one of various forms
    var rad = this._resolve(this._radius, "radius");

    if (rad || (rad === 0 && inputs.SINGLEMULTI)) {  // zero or undefined will not show this object, but needs to be compiled for SINGLEMULTI
        uniformsp[this.gn("active", medepth)].value = 1;
        uniformsp[this.gn("rpbase", medepth)].value = 0;
        uniformsp.radius.value = rad;


        if (uniformsp.light0s) uniformsp.light0s.value = genes.light0s * ((this.name === hornhighlight) ? 5 : 1);
        if (this.hset.horns[hornsolo] && this.name !== hornsolo) {
            var d = Math.exp((frametime - solostarttime) * 0.005);
            d = Math.min(d, 20);
            uniformsp.radius.value /= d;
            newframe();
        }

        // Some very twisted objects need DoubleSide, but transparent ones we don't want to see the back
        // This gives an imperfect but adequate (?) compromise.
        //if (opmode === OPOPOS && uniforms.screenDoor)
        //    scene.children[0].material.side = uniforms.screenDoor.value ? THREE.FrontSide : THREE.DoubleSide;
        // NO, we always want front only.  Back also give some funny badnormals along edges

        scene.children[0].material.side = THREE.FrontSide;  // NO scene was the wrong object to hit in most cases

        // note, experiment to keep multiScene down to 1 chunk and iterate at this level instead
        // was a performance disaster
        // must call multiScene even if sc not used, as it computes/sets bufferoffset etc uniforms
        var userenderscene = this.hset._renderscene && this.hset._renderscene !== scene;
        var sc = multiScene(genes, num, key, userenderscene, hset, hornid);
        if (sc) sc.overrideMaterial = scene.overrideMaterial;

        if (HW.renderspecial) {
            HW.renderspecial(sc, render_camera, rendertarget);
        } else if (userenderscene) {
            rrender("hornxscene", this.hset._renderscene, render_camera, rendertarget);
        } else {
              sc.children[0].material.wireframe = usewireframe;

            rrender("hornmutliscene", sc, render_camera, rendertarget);
        }

        // debug information in preparation for more complete 'compilation' of horn runs
        if (logframenum === framenum) {
            var myvals = [];
            //myvals.push(showvals('$parnumsa$parnumsb$'));
            //myvals.push(showvals('$gbuffoffset'));
            myvals.push(showvals('$lennum$radnum$skelnum'));  // << will change with resolution change only, BUT that may change with ribs
            for (let hn in hset.horns) {
                myvals.push(showvals('$' + hn + "_active" + '$' + hn + "_rpbase" + '$' + hn + "_para" + '$' + hn + "_parb"));
            }
            var myset=myvals.join('\n');
            if (!hset.hornrun[hornid].myset) hset.hornrun[hornid].myset = myset;
            if (hset.hornrun[hornid].myset !== myset) {
              log('differing myset');
              hset.hornrun[hornid].myset = myset;
            }
        }


        // clean up no longer needed in CPU memory grids
        // but leave array.length accessible
        // do not clean up if using instancing, not nearly so much dirt anyway
        if (sc && THREE.REVISION < "73") {
            var att = sc.children[0].geometry.attributes;
            if (!att.cleaned) {
                att.cleaned = true;
                att.index.array = { length: att.index.array.length };
                att.position.array = { length: att.position.array.length };
            }
        }

        //log("hrender$framenum$opmode", rendertarget.width + "x" + rendertarget.height);
        hset.horncount += num;
        hset.cumcount[hornid] = hset.horncount;
        if (uniformsp['cumcount' + hornid])  //  >>> todo, why necessary, no cumcount15 for York .... reason: ribcage is not fully compiled
            uniformsp['cumcount' + hornid].value = hset.horncount;
        if (this.hascage) uniformsp[this.gn("reflx", medepth)].value = 1;
        //console.log(this.name + ">" + uniforms.first_reflx.value);
        //
        checkgbuffer(hset.gbuffoffset);
/**/
/**/
    }  // if rad


};

/** use more sensible skelbuffer for OPMAKESKELBUFF */
function checkskelbuffer(num, width) {
    num = nextpow2(num);
    width = nextpow2(width);
    if (isNaN(uniforms.skelbufferRes.value.x + uniforms.skelbufferRes.value.y)) minimizeSkelbufferW();
    // checkskelbuffer(num*width); // temp during update
    uniforms.skelbufferRes.value.x = Math.max(uniforms.skelbufferRes.value.x, width);
    uniforms.skelbufferRes.value.y = Math.max(uniforms.skelbufferRes.value.y, num);
}

/** minimize size of skelbuffer/skelbuffer */
function minimizeSkelbufferW(low = 1) {
    if (uniforms.skelbufferRes.value.x === low) return;
    uniforms.skelbufferRes.value.set(low,1);
    skelbuffer = 0;
    onpostframe(() => log('minimized skel buffer', skelbuffer.width, skelbuffer.height, 'frame', framenum));
}
W.minimizeSkelbuffer = minimizeSkelbufferW;

/** make sure skelbuffer big enough for required use */
function checkgbuffer(size) {
    if ((opmode === OPMAKESKELBUFF) && size > uniforms.skelbufferRes.value.x * uniforms.skelbufferRes.value.y) {
        var rr = size;
        rr = Math.ceil(rr/uniforms.skelbufferRes.value.x);
        rr = nextpow2(rr);
        if (rr > 4096) {
            console.log("required skelbuffer res to large " + rr);
            rr = 4096;
        }
        console.log(">>>> skelbufferRes overrun, set to " + rr);
        uniforms.skelbufferRes.value.y = rr;
    }
}


/** render subs, including heads and tails if subsfortails is set */
HP._rendersubs = function(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid) {
    assert(hornid === hset.hornid - 1, 'rendersubs hornid issue');

    var horns = hset.horns;
    var medepth = key.split(this.name).length - 1;  // self-recursive depth
    for (let subtype in {_sub: 0, _head: 0, _tail: 0}) {
        if (!subsfortails && subtype !== '_sub') continue;
        for (let i in this[subtype]) {
            var h = this[subtype][i];
            if (subtype === '_head') h = { subname: h, start: 0, end: 0, num: 0 }
            if (subtype === '_tail') h = { subname: h, start: 1, end: 1, num: 0 }
            var usedepth = genes[this.gn("S_" + h.subname + "_depth")];
            if (usedepth <= medepth) continue;  // do not render this sub, too deep

            // use gene if possible, explicit non-gene value if not, parent/default if not
            var sribsgn = this.gn("S_" + h.subname + "_num");
            if (this._genenames[sribsgn]) var sribs = genes[sribsgn];  // sometimes left over genes sribsgn not relevant to this object
            if (sribs === undefined) sribs = h.num;
            if (sribs === undefined) sribs = ribs;
            if (h.num < 0) sribs = -h.num*ribs;
            // limit the number of ribs from nested subs
            // could be slightly more smooth, but this will stop distaster slowdown
            var lev = key.split("+").length-1;

            hset.ribshow += "\n" + (new Array(lev).join("    ")) + Math.ceil(sribs);
            if (num*Math.ceil(sribs+1) > MAXRIBS) {
                sribs = Math.max(0, MAXRIBS/num - 1);
                hset.ribshow += "!!" + format(sribs);
                // if (sribs <= 0) continue;
                //genes[this.name + "_ribs"] = sribs;

                // animation special, not core horn function
                // if a reverse was caused by ribs going too high then make sure the parent ribs are going down
                // TODO check this, OPREGULAR check is certainly dated, and key may change details too
                if (opmode === OPREGULAR && (framenum > lastRevFrame+9 || framenum < lastRevFrame)) {
                    var path = key.split("+").concat(this.name);
                    var maxr = -999, mrk;
                    var rrr = [];
                    for (let p=0; p<path.length; p++) {
                        var rk = path[p].substr(1) + "_ribs";  // path includes 01 for rev
                        rrr.push(genes[rk]);
                        if (geneSpeed[rk]*inputs.animSpeed > 0 && genes[rk] > maxr) {
                            maxr = genes[rk];
                            mrk = rk;
                        }
                    }
                    geneSpeed[mrk] *= -1;
                    //console.log(framenum + ": reverse " + mrk + " " + genes[rk] + " " + rrr.join(","));
                    lastRevFrame = framenum;
                }
            }

            hset.ribshow += "->";

            var startgn = this.gn("S_" + h.subname + "_start");
            var endgn = this.gn("S_" + h.subname + "_end");

            var start = FIRST(genes[startgn], h.start, 0);
            var end = FIRST(genes[endgn], h.end, 1);
            // !!! leaving out brackets round (h.cage ? 2 : 1)
            // !!! led to terrible looping/hanging problems
            for (let refl = 0; refl < (h.cage ? 2 : 1); refl++) {
                var subkey = key + "+" + refl + this.name+ '~' + hornid;
                this._postcompilesub(genes, uniformsp, rendertarget, hset, subkey, num, h, refl, hornid);

                if (this.hascage)
                    uniformsp[this.gn("reflx", medepth)].value = refl === 0 ? 1 : -1;
                if (oldrender) {
                    for (let k = sribs; k > -1; k--) {
                        if (k < 0) k = 0;  // for final fractional rib
                        uniformsp[this.gn("active", medepth)].value = 0;
                        uniformsp[this.gn("rpbase", medepth)].value = start + k/sribs * (end-start);  //<< todo factor in rref
                        uniformsp.k.value = k;
                        horns[h.subname].renderh(genes, uniformsp, rendertarget, hset, key, num);
                    }
                } else {
                    // n.b. _active and _rpbase NOT used as uniforms for 'modern' rendering, to check TODO
                    uniformsp[this.gn("active", medepth)].value = 0;
                    uniformsp[this.gn("rpbase", medepth)].value = startgn in genes ? startgn : start;  //<< todo factor in rref
                    var range = end-start;
                    var pa = uniformsp[this.gn("para", medepth)].value;
                    var pb = uniformsp[this.gn("parb", medepth)].value;
                    var pnumsa = uniformsp.parnumsa.value;
                    var pnumsb = uniformsp.parnumsb.value;
                    if (lev===0) { pa.x = range; pnumsa.x = sribs; }
                    else if (lev===1) { pa.y = range; pnumsa.y = sribs; }
                    else if (lev===2) { pa.z = range; pnumsa.z = sribs; }
                    else if (lev===3) { pa.w = range; pnumsa.z = sribs; }
                    else if (lev===4) { pb.x = range; pnumsb.x = sribs; }
                    else if (lev===5) { pb.y = range; pnumsb.y = sribs; }
                    else if (lev===6) { pb.z = range; pnumsb.z = sribs; }
                    else if (lev===7) { pb.w = range; pnumsb.z = sribs; }

                    else throwe("sub too deep");
                    uniformsp.k.value = 9999;  // was undefined k, probably not used for !oldrender?
                    var subnum = num*Math.ceil(sribs+1);
                    // we want different hornrun for the two different sides of the cage
                    // so we don't do either of these.  TODO remove soon 1 March 2016
                    //hset.hornid = savehornid;  // so that calls to reflected cage do not get double counted but have same id
                    //hset.hornid -= refl;  // so that calls to reflected cage do not get double counted but have same id
                    hset.parents[hset.hornid] = hornid;
                    horns[h.subname].renderh(genes, uniformsp, rendertarget, hset, subkey, subnum);
                    pa.x = pa.y = pa.z = pa.w = pb.x = pb.y = pb.z = pb.w = 0;
                    }
            }   // refl
            if (this.hascage) uniformsp[this.gn("reflx", medepth)].value = 1;

        }  // i in _subs
    } // sub/head/tail
};

/** symbolic compile for subs, called BEFORE sub itself run */
HP._postcompilesub = function(genes, uniformsp, rendertarget, hset, key, num, h, refl, parenthornid) {
    var hornid = hset.hornid;  // the hornid that will be active for that sub
    if (opmode !== 'postcompile') return;
    function c(name, val) {
        cc.push(name + "_" + hornid + " = " + val + ';');
    }
    var U; // = undefined;
    var cc = ['//' + key];
    // var ribs = this._resolve(this._ribs, "ribs"); // genes[this.gn("ribs")];
    var ribs = this._resolvesym(this._ribs, "ribs"); // genes[this.gn("ribs")];
    // c('ribs', ribs); // not needed

    //    var sribsgn = this.gn("S_" + h.subname + "_num");
    //    if (this._genenames[sribsgn]) var sribs = genes[sribsgn];  // sometimes left over genes sribsgn not relevant to this object
    //var sribs = genes[sribsgn];
    //if (sribs === undefined) sribs = h.num;
    //if (sribs === undefined) sribs = ribs;
    var sribsgn = this.gn("S_" + h.subname + "_num");
    if (this._genenames[sribsgn]) var sribs = sribsgn;
    else if (h.num !== U) sribs = h.num;
    else sribs = (ribs);
    //c('sribs', sribs);
    hset.sribs[hornid]= sribs;

    //var start = FIRST(genes[startgn], h.start, 0);
    //var end = FIRST(genes[endgn], h.end, 1);
    var startgn = this.gn("S_" + h.subname + "_start");
    var endgn = this.gn("S_" + h.subname + "_end");

    if (startgn in genes) var start = startgn;
    else if (h.start !== U) start = h.start;
    else start = '0.';
    if (endgn in genes) var end = endgn;
    else if (h.end !== U) end = h.end;
    else end = '1.';

    //c('start', start);
    //c('end', end);
    var range = end*1 - start*1;
    range = isNaN(range) ? '(' + end + '-' + start + ')' : floatstring(range);
    // c('range', '(' + end + '-' + start + ')');

    var lev = key.split("+").length-2;  // -2, -1 because split works that wya, -2 because this level is already in the key

    if (lev===0) var o = 'a.x';
    else if (lev===1) o = 'a.y';
    else if (lev===2) o = 'a.z';
    else if (lev===3) o = 'a.w';
    else if (lev===4) o = 'b.x';
    else if (lev===5) o = 'b.y';
    else if (lev===6) o = 'b.z';
    else if (lev===7) o = 'b.w';


    //if (lev===0) { var o = 'pa.x = range; pnumsa.x = sribs;' }
    //    var pa = uniforms[this.gn("para", medepth)].value;
    //    var pb = uniforms[this.gn("parb", medepth)].value;
    //    var pnumsa = uniforms.parnumsa.value;
    //    var pnumsb = uniforms.parnumsb.value;
    var medepth = key.split(this.name).length - 2;  // -2, -1 because split works that way, -2 because this level is already in the key
    var pn = this.gn("par", medepth);
    var reflxn = this.gn("reflx", medepth);

    //cc.push(pn + o + ' = range_' + hornid + ';');
    if (!hset.parentcode) hset.parentcode = [];
    if (Math.floor(sribs) === sribs) sribs = Math.floor(sribs) + '.';
    hset.parentcode[hornid] =
        pn + o + ' = ' + range + ';\n' +
        ((this.hascage) ? ( reflxn + ' = ' + (refl ? '-1.' : '1.') + ';\n') : "") +
        'parnums' + o + ' = ' + sribs + ';\n';

    var pcode = parentcode(key, hset);
    pcode.push(hset.parentcode[hornid]);

    hset.code[hornid] = '\n' + pcode.join('\n') + '\n' + cc.join('\n');


}

/** code to generate parent details */
function parentcode(key, hset) {
    if (!hset.code) hset.code = [];
    var keys = key.split('+').slice(1);
    var pcode = [];
    for (let i=0; i< keys.length; i++) {
        var kk = keys[i].split('~')[1];
        //pcode.push(kk);
        if (hset.parentcode[kk]);
            pcode.push(hset.parentcode[kk]);
    }
    return pcode;
}



/** render a horn and subhorns
 * key is the list of subhorns this is nested (as string for easier copy)
 * num is the cumulative (product) number of instances of this */
HP.renderh = function(genes, uniformsp, rendertarget, hset, key, num) {
    var hornid = hset.hornid++;
    hset._adduniformX('cumcount' + hornid, 0, "f", true);  // this really is a uniform even for singlemulti

    //framelog("renderh", this.name, hset.hornid);

    /***** parents now recorded just before each renderh is called .. corrected for head/tail
    if (opmode === 'postcompile') {
        var keysplit = key.split('+');  // <<< todo simplify
        var parents = 0;
        for (let i=1; i < keysplit.length; i++) {
            parents = keysplit[i].post('~') * 1;
        }
        hset.parents[hornid] = parents;
    }
    /*****/

    hset.ribshow += this.name + "/" + num + "(";

    if (key.split("+").length > 8)
        return; // could happen if self-recursion given too big a value
    var medepth = key.split(this.name).length - 1;
    var i;
    var ribs = this._resolve(this._ribs, "ribs"); // genes[this.gn("ribs")];
    // make sure rref set up right if not defined in old version
    var rrefgn = this.gn("rref");
    if (genes[rrefgn] === undefined) {
        genes[rrefgn] = ribs;  // rref not defined, probably not used as gene but just in case ...
        setGUITranrule();  // needs updating
    }
    var rref = genes[rrefgn];
    // temp code to experiment with steering and old planets
    // which don't have properly defined rref
    if (hoverSteerMode) rref = 0;
    if (rref === 0 && uniformsp[rrefgn] !== undefined)
        uniformsp[rrefgn].value = ribs;   // rref === 0
    uniformsp.ribs.value = ribs;



    this._renderme(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid);
    this._rendersubs(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid);

    var horns = hset.horns;
    var subkey = key + "+" + 0 + this.name+ '~' + hornid;  // <<< TODO + 0 + should be + refl +
    var pcode = parentcode(subkey, hset);
    //*** * /
    if (!subsfortails) {        // we must do the heads and tails the old (pre April 2019) way
        for (i in this._tail) {
            uniformsp[this.gn("active", medepth)].value = 0;
            uniformsp[this.gn("rpbase", medepth)].value = 1;  // rref allowed for in setupcode
            if (opmode === 'postcompile') {
                hset.sribs[hset.hornid] = 0;
                hset.parents[hset.hornid] = hornid;
                hset.code[hset.hornid] = '// tail code here' + subkey + "\n" + pcode.join('\n') + '\n  ///// end tail code';
            }
            horns[this._tail[i]].renderh(genes, uniformsp, rendertarget, hset, key, num);
        }
        for (i in this._head) {
            uniformsp[this.gn("active", medepth)].value = 0;
            uniformsp[this.gn("rpbase", medepth)].value = 0;  // rref allowed for in setupcode
            if (opmode === 'postcompile') {
            hset.sribs[hset.hornid] = 0;
            hset.parents[hset.hornid] = hornid;
            hset.code[hset.hornid] = '// head code here' + key + "\n" + pcode.join('\n') + '\n  ///// end head code';
            }
            horns[this._head[i]].renderh(genes, uniformsp, rendertarget, hset, key, num);
        }
    }
    /***/
    uniformsp[this.gn("rpbase", medepth)].value = INACTIVE;
    uniformsp[this.gn("active", medepth)].value = INACTIVE;
    hset.ribshow += ")";

};

HP.toString = function() { return this._genecode; };

HP.htmlmainparm = function(genes, ggn) {
    var gn = this.gn(ggn);
    if (typeof this["_" + ggn] === "string") {
        var h = '<span class="' + ggn + ' gval" id="TR_' + gn + '">"' +  this["_" + ggn]+ '"</span>';
    } else {
        var xclass = (genedefs[gn] && genedefs[gn].free) ? ' gval' : ' gval frozen';
        h = '<span class="' + ggn + xclass + '" contenteditable="true" id="TR_' + gn + mmm + format(genes[gn]) +'</span>';
    }
    return h;
};

var hhh = '" tabindex="0" ';
hhh += ' onmousemove="hornmousemove(event);"';
hhh += ' onmouseover="hornmouseover(event);" ';
hhh += ' onmouseout="hornmouseout(event);" ';
hhh += ' onkeydown="hornkeydown(event);" ';
hhh += ' onkeyup="hornkeyup(event);" ';
hhh += '>';

W.htmlrulebox.tabIndex = "0";
W.htmlrulebox.onmousemove = hornmousemove;
W.htmlrulebox.onmouseover = hornmouseover;
W.htmlrulebox.onmouseout = hornmouseout;
W.htmlrulebox.onkeydown = hornkeydown;
W.htmlrulebox.onkeyup = hornkeyup;

/** render this horn with given genes in hset context, key to prevent recursion */
HP.html = function(genes, hset, key) {
var hhhh = '" tabindex="0">';


    if (key.indexOf("+" + this.name + "+") !== -1) return;
    var subkey = key + this.name + "+";
    var h = "";



    h += '<fieldset class="horn" id="H_' + this.name + hhhh;
    // towards adding open/close later
    // h += '<legend onclick="FCall(\'toggleFold\', this);">' + this.name +'</legend>';
    var leg = '<legend onclick="toggleFold(this);" oncontextmenu="horncontext(event);" ';
    h += leg + 'id="HL_' + this.name + hhhh + this.name +'</legend>';

    // head, to right of horn and subs
    if (this._head.length !== 0) {
        h += '<fieldset class="tails heads">';  // << ??? check css later
        h += leg + '>heads</legend>';
        for (let i=0; i<this._head.length; i++) {
            let ss = hset.horns[this._head[i]];
            if (ss)
                h += ss.html(genes, hset, subkey);
        }
        h += '</fieldset>';  // heads
    }


    h += '<span class="hornpref">'; // allow trans to right of basics, horn and subs
    h += '<span class="horndetails">'; // details of this horn, radius.../stack...
    h += '<span class="hornname2" id="H2_' + this.name + '"' + hhhh + this.name + '</span>';

    h += '<span class="hornpref hornhead">'; // allow tails to right of all including subs
    if (this._radius !== undefined)
        h += this.htmlmainparm(genes, "radius");
    h += this.htmlmainparm(genes, "ribs");
    h += this.htmlmainparm(genes, "rref");
    h += '</span>';  // hornpref hornhead

    if (this.trans.length !== 0) {
        h += '<span class="trans">';
        for (let i=0; i<this.trans.length; i++) {
            h += this.trans[i].html(genes, hset, this.name, i);
        }
        h += '</span>';  // trans
    }
    h += '</span>';             // details of this horn, radius.../stack...

    if (this._sub.length !== 0) {
        h += '<fieldset class="subs">';
        h += leg + '>subs</legend>';
        for (let i=0; i<this._sub.length; i++) {
            for (let rr = 0; rr < HornWrap.subrepeat; rr++) {
                var si = this._sub[i];
                let ss = hset.horns[si.subname];
                if (ss) {
                    if (si.cage && rr === 0)
                        h += '<span class="note">ribcage</span>';
                    h += ss.html(genes, hset, subkey);
                }
            }
        }
        h += '</fieldset>';  // subs
    }
    h += '</span>';  // hornpref inclduing subs


    // tail, to right of horn and subs
    if (this._tail.length !== 0) {
        h += '<fieldset class="tails">';
        h += leg + '>tails</legend>';
        for (let i=0; i<this._tail.length; i++) {
            var ss = hset.horns[this._tail[i]];
            if (ss)
                h += ss.html(genes, hset, subkey);
        }
        h += '</fieldset>';  // tails
    }

    h += '</fieldset>';  // horn
    return h;
};

this.HornSet = function() {
"use strict";
this.horns = {};            // keep track of all defined horns and their names

var first, sub, tail, branch, twig;  // needed for backward comptability with some saved files

//var trancode;
this.varyings = "";  // code varyings for rp values etc <<< TODO DEAD??
this.setupcode = "";  // code for setting up rp values etc
this.pickoutput = "";  // code for returning pick information
//this.segnames;   // names for horn segments
this.trancode = "";  // accumulated transform code
this.pretranrule = "";  // code to insert just before the tranrule
this._genecode = "";  // accumlated code showing gene names
this.uniforms = "";  // accumlated code for uniforms
this._springMap = undefined;  // set to true or array for automated spring mapping
this._gcode = "";    // global code, eg for extra variables
this._saveposset = {};  // set of savepos done, with true if not yet resolved

this.gbuffoffsets = [];     // keep track of skelbuffer/skeleton offsets after set by OPMAKESKELBUFF
this.skelnum = [];        // keep track of skelbuffer/skeleton resolutions after set by OPMAKESKELBUFF
};  // end HornSet

var HornSetP = this.HornSet.prototype;

/** break the tranrule into graphics and audio parts */
HornSetP.makeParts = function(tranrule) {
    //I may deprecate 'SynthBus' such that this method only gets used for old examples that use it.
    var pos = tranrule.indexOf('SynthBus');
    if (pos !== -1) {
        pos = tranrule.lastIndexOf('\n', pos);
        if (pos === -1) {
            throwe('No rule available before SynthBus line')
        }
        var synthCode = tranrule.substring(pos+1);
        tranrule = tranrule.substring(0,pos);
    } else {
        //there's no synth code... we should make sure any leftover stuff gets cleared
        synthCode = '';
    }
    return [tranrule, synthCode];
}

/** parse the hornset to see if it is at all possible, return name of mainhorn */
HornSetP.parsehorn = /*^^^async*/ function(tranrule) {
    log('parsing horn', tranrule.substring(0,40));
    /** called from within parsehorn */
    function tocompile() {
        // so the tranrule can define genes if needed
        function gene(name, def, min, max, delta, step, help, tag, free, internal, useuniform) {
            addgene(name, def, min, max, delta, step, help, tag, free, internal, useuniform);
            luniforms[name] = true;
            log('luniforms', name);
        }
        var ugene = gene; // for historic usage
        var pretranrule='', posttranrule='', luniforms = {}, overrides='', endoverrides='', extraIncludes='';
        nop('$$$');
        return {pretranrule, posttranrule, mainhorn, luniforms, overrides, endoverrides, extraIncludes};

        function pulse(name) {
            var n = name + "_";
            gene(n + 'pulserate', 1, 0, 1, 0.1, 0.1, 'rate for pulse efect', 'dyn', 0);
            gene(n + 'pulseperhorn', 1, 0, 3, 0.1, 0.1, 'number of pulses per horn', 'dyn', 0);
            gene(n + 'pulsepow', 5, 0, 21, 0.1, 0.01, 'power to make pulse strong', 'dyn', 0);
            gene(n + 'pulsescale', 0.1, 0, 1, 0.1, 0.01, 'scale for pulse efect', 'dyn', 0);
            gene(n + 'pulsemodrate', 0.7, 0, 5, 0.1, 0.01, 'FM mod ratio for pulse', 'dyn', 0);
            gene(n + 'pulsemodscale', 0.2, 0, 1, 0.1, 0.01, 'FM mod scale for pulse', 'dyn', 0);
            var p = "pulsescale  * pow(0.5 + 0.5 * sin(6.283185307179586 * (time * pulserate  - crp * pulseperhorn  + pulsemodscale / max(pulsemodrate, 0.01)  * sin(time * pulserate * pulsemodrate ))), pulsepow )";
            p = p.replaceall('pulse', n + 'pulse');
            log('pulse output', p);
            return p;
        }
        function pulser(name) {
            return 'r += 50. * ' + pulse(name) + ';\n';
        }
        function pulsermult(name) {
            return 'r *= 1. + ' + pulse(name) + ';\n';
        }
    }

    try {
        //if (this.preParse && tranrule !== 'horn("main");') this.preParse();
        if (tranrule !== 'horn("main");') {

            Maestro.trigger('preParse');
            //if (!W.SynthBus && tranrule !== 'horn("main");') {   // no synthesizer ready yet

            tranrule = this.makeParts(tranrule)[0];
        }
        this.hornrule = tranrule;  // just the horn part of the full tranrule
        this.horns = {};
        var tocompiles = tocompile.toString().post('{').slice(0, -1);
        var fun = tocompiles.replace("nop('$$$');", tranrule);
        _defaultHornSet = this;  // minimize active scope of nasty variable
        var answer;
        if (tranrule === 'horn("main");') {  // was also tranrule.contains('horn("Qsub").ribs(8).radius(15)') ||
            answer = xhorn();
        } else {
            // const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            answer = /*^^^await*/ (Function(fun)) ();
        }
    } finally {
        _defaultHornSet = undefined;
    }
    var mainh = answer.mainhorn;
    copyFrom(this, answer);
    var luniforms = answer.luniforms;
    var lluniforms = Object.keys(luniforms);
    var sluniforms = lluniforms.length === 0 ? "" : "uniform float " + lluniforms.join(',') + ';';

    this.header = sluniforms;
    if (mainh instanceof HornWrap.Horn) { mainh = mainh.name; }
    return mainh;
};

// check for changes to synthCode
HornSetP.monitorSynthdef = function() {
    if (currentHset)
        currentHset.synthCode = currentHset.makeParts(currentHset.tranrule)[1];
    if (hornSynth && currentHset && currentHset.synthCode !== mutSynthPendingCode) {
        mutSynthPendingCode = currentHset.synthCode;
        Maestro.trigger('newHornSynth');
    }
}
Maestro.onUnique('preframe', HornSetP.monitorSynthdef);



/** simple test to allow horns to be generated and optimized internally
This is needed for use with mangled code.
*/
function xhorn() {
// so the tranrule can define genes if needed
        function gene(name, def, min, max, delta, step, help, tag, free, internal, useuniform) {
            addgene(name, def, min, max, delta, step, help, tag, free, internal, useuniform);
            luniforms[name] = true;
            log('luniforms', name);
        }
        var ugene = gene; // for historic usage
        var pretranrule='', posttranrule='', luniforms = {}, overrides='', endoverrides='', extraIncludes='';
        horn("Qsub").ribs(8).radius(15).scale(0).twist(1440,{k:50}).stack(1000).bend(90,{k:"0."}).color();
horn("Qfirst").ribs(20).radius(50).scale(2).twist(500,{k:50}).stack(1200).bend(40,{k:"0."}).sub("Qsub");
mainhorn="Qfirst";
//SynthBus().WhiteNoise('amp', '0.8').VarTrem2().Resonz().Comb().Comb().Resonz().Comb().Comb().spatChorus('amp', '0.7');
//end of Synth rules
        return {pretranrule, posttranrule, mainhorn, luniforms, overrides, endoverrides, extraIncludes};

        function pulse(name) {
            var n = name + "_";
            gene(n + 'pulserate', 1, 0, 1, 0.1, 0.1, 'rate for pulse efect', 'dyn', 0);
            gene(n + 'pulseperhorn', 1, 0, 3, 0.1, 0.1, 'number of pulses per horn', 'dyn', 0);
            gene(n + 'pulsepow', 5, 0, 21, 0.1, 0.01, 'power to make pulse strong', 'dyn', 0);
            gene(n + 'pulsescale', 0.1, 0, 1, 0.1, 0.01, 'scale for pulse efect', 'dyn', 0);
            gene(n + 'pulsemodrate', 0.7, 0, 5, 0.1, 0.01, 'FM mod rate for pulse', 'dyn', 0);
            gene(n + 'pulsemodscale', 0.2, 0, 1, 0.1, 0.01, 'FM mod scale for pulse', 'dyn', 0);
            var p = "pulsescale  * pow(0.5 + 0.5 * sin(6.283185307179586 * (time * pulserate  - crp * pulseperhorn  + pulsemodscale / max(pulsemodrate, 0.01)  * sin(time * pulserate * pulsemodrate ))), pulsepow )";
            p = p.replaceall('pulse', n + 'pulse');
            log('pulse output', p);
            return p;
        }
        function pulser(name) {
            return 'r += 50. * ' + pulse(name) + ';\n';
        }
}


HornSetP.toString = function() { return this._genecode; };

HornSetP._addgene = function(gn, def, min, max, delta, step, help, tag, free, useuniform) {
    if (tag === undefined) tag = "geom";
    var gv = currentGenes[gn];
    addgene(gn, def, min, max, delta, step, help, tag, free, undefined, useuniform);
    this.geneDefaults[gn] = def;
    if (gv === undefined) gv = currentGenes[gn]; else currentGenes[gn] = gv;
    if (useuniform !== false) this.uniforms += parseUniforms.fixhorngenes    // fix shader defined genes for performance test, does not appear to help, June 2016
        ? "#define " + gn + " " + gv.toFixed(6) + "\n"
        : "uniform float " + gn + ";\n";

    // commented out below, sjpt 6 June 2016 and moved to HP._expr where a value has been explicitly specified.
    // Previously, some values (eg stardepth) were overwritten when loading a new hornrule (even if explicity set in the hornrule code)
    // If we are doing a full load form saved, establishing the saved should ensure they are set correctly.
    // if (tag !== "horncol")  // do not override colour for horncol
    //     currentGenes[gn] = target[gn] = s;
    return gn;
};

/** add a 'uniform'.
Where each horn type is rendered separately these really are uniforms.
For SINGLEMULTI they are compulted internally to the shader, except here forceunirofom set (eg for cumcount values)
*/
HornSetP._adduniformX = function(name, def, type, forceuniform) {
    if (this.addedUniforms[name]) return;
    var types = {f: "float", v3: "vec3", v4: "vec4" };  // types we use for automatic uniforms
    type = type || "f";
    var ty = types[type];
    var cuniform = inputs.SINGLEMULTI && !forceuniform ? "" : 'uniform ';
    this.uniforms += cuniform + ty + " " + name + ";\n";  // will be real uniform for old usage, global for single pass multihorn
    // log('adduniformx', name, type)
    adduniformX(name, def, type);
    this.addedUniforms[name] = true;
};

/** set up a horn given definition */
HornSetP.setuphorn = /*^^^async*/ function(tranrule) {
    this.mainhorn = /*^^^await*/ this.parsehorn(tranrule);
    if (!this.mainhorn) return undefined;
    setHornSet(tranrule, this)
    var ret = this._compilehs(tranrule);
    return ret;
};


/** get the main horn as a horn, not as a name */
HornSetP.getmain = function() {
    return this.horns[this.mainhorn] || this.horns.main;
};

var specgenes = {};
HornSetP._addgenespec = function(gn, s, min, max, delta, step, help, tag, free) {
    this._addgene(gn, s, min, max, delta, step, help, tag, free);
    specgenes[gn] = true;
};
/** compile a hornset from structure, create trancode, _genecode etc */
HornSetP._compilehs = function(tranrule) {
    // make sure all the compile collection items have been (re)initialized
    this.varyings = "";
    this.setupcode = "";
    this.pickoutput = "";
    this.segnames = [-999, -998];  // first slots are for raw x,y position, so reserve them; names -99x irrelevant
    this.code = [];
    this.parentcode = [];
    this.parents = [];
    this.sribs = []; this.sribs[3] = 0;
    this.addedUniforms = {};
    this.geneDefaults = {};
    this.hornid = 3;   // keep track, and don't use 0,1,2 as can be confused with background 0, opacity 1, cubemap 2
    this.hornrun = [];  // set of horns that will be called in a complete run
    this._saveposset = {};  // set of savepos done, with true if not yet resolved
    this.tranrule = tranrule;
    // this.slot = 2;  // slot to use for picking, 0,1 reserved for oposx/y
    this.trancode = this._gcode;
    if (this._springMap)
        if (this.springMap === true)
            this._genecode = "springMap()";
        else
            this._genecode = "springMap(['" + this._springMap.join("', '") + "']);\n";
    else
        this._genecode = "";

    // this.uniforms = ""; // may be set earlier by ugenes

    this._adduniformX("ribs", 1);  // #ribs in active
    this._adduniformX("radius", 0);  // radius for active
    adduniformX("parnumsa", new THREE.Vector4( 1, 1, 1, 1 ), "v4");  // identify number of instan
    adduniformX("parnumsb", new THREE.Vector4( 1, 1, 1, 1 ), "v4");  // identify number of instan
    adduniformX("hornid", 0, 'f');  // keep track of which horn being rendered
    //ces for sub/sub/sub

    // <<< clarify below
    var U = undefined;
    this._addgenespec("time", 0, -1, 1, U, 0.1, "time", "system", "frozen");
    this._addgenespec("nstar", 7, 0, 6, U, 0.1, "<b>number</b> of points in profile star", "geom");
    this._addgenespec("stardepth", 0, -0.5, 0.5, U, 0.01, "<b>depth</b> of indents in profile star", "geom");
    this._addgenespec("ribdepth", 0.0, 0, 1, U, 0.01, "depth of ribs", "geom", "free");
    this._addgenespec("gscale", 1, 0, 100, U, 0.1, "global scaling, used automatically for autoscale", "system", "frozen");
    //this._addgenespec("badnormals", 2, 0, 4, u, 1, "choice to take for backward facing normals<br>0=yellow, 1=ignore, 2=coerce, 3=flip, 4=coerce/flip", "system", "frozen");
    var mmsg = "How to compute normals etc for sweep.";
    mmsg += "<br>1: xmu cross random dir; twist where they clash";
    mmsg += "<br>2: cross of two adjacent directions, random when all straight";
    mmsg += "<br>3, use TRY2 unless very nearly straight, in which case TRY1";
    mmsg += "<br>4, track an offset point through the transforms";
    // define as gene if wanted this._addgenespec("NORMTYPE", 4, 1, 4, u, 1, mmsg, "system", "frozen");  // fixed in shader, remove from here to reduce confusion


    var mainh = this.getmain();
    mainh._compileh([], [], this);  // compile all the horns, checking for cirular references
    for (let hh in this._saveposset) {
        if (this._saveposset[hh] === true) this.trancode += "addpos(save_" + hh + ");\n";
        this.trancode = "vec3 save_" + hh + " = vec3(0.,0.,0.);\n" + this.trancode;
    }
    this._genecode += 'mainhorn="' + mainh.name + '";';
// remove old code for very simplistic centre
//    var stn = mainh.gn("stack");
//    var ri = mainh.gn("ribs");
//    var rr = mainh.gn("rref");
//    if (mainh._genenames.indexOf(stn) !== -1)
//        if (mainh._genenames.indexOf(ri) !== -1 && mainh._genenames.indexOf(rr) !== -1)
//            this.trancode += "stack(-" + stn + "*" + ri + "/" + rr + "*0.5)";
//        else
//            this.trancode += "stack(-" + stn + "*0.5)";

    //this.bundle = {trancode: this.trancode, trankey: this._genecode, uniforms: this.uniforms,
    //            varyings:this.varyings, setupcode:this.setupcode, pickoutput:this.pickoutput, segnames:this.segnames  };
    this.trankey = this._genecode;
    this.bundle = this;  // work towards retiring this.bundle
if (tranrule !== 'horn("main");') {

    currentHset = this;
    currentGenes.tranrule = tranrule;
    var codes = codeForUniforms(this);
    this.singlePassCode = codes[0];
    this.chooseHornCode = codes[1];
    // var tokill = 'opos---' + tranrule;
    // >>> TODO.  The line below is needed because with SINGLEMULTI a change in the tranrule with recompile
    // the lets getMaterial compile the OPOPOS code completely wrong.
    // We must find out why and fix, meanwhile this works as it forces a second getMaterial compile which is OK.
//    onframe(function() {
//        if (material.opos)
//            material.opos[tranrule.pre('SynthBus')] = undefined;
//    });
}

    return this.bundle;
};      // HornSetP._compilehs

HornSetP.html = function(genes) {
    genes = genes || currentGenes;
    if (!genes.tranrule) return "";
    var h = '<span class="hornset">';
    var hset = getHornSet(genes.tranrule);
    if (!hset) {
        // need two hornTrancodeForTranrule
        // one is async called when we really want to parse a new tranrule (may be variant of parsetranrule)
        // one is sync and complains if called while call to async one is in progress
        hornTrancodeForTranrule(genes.tranrule, genes); hset = getHornSet(genes.tranrule);
    }
    h += hset.getmain().html(genes, hset, "+");
    return h + '</span>';
};

/** render by rendering using single pass with prepared objects, return true if done */
HornSetP.rendersinglepmulti = function(genes, uniformsp, rendertarget, scenep) {
    if (scenep && scenep.name.startsWith('sceneCode')) scenep = undefined;  // old sceneCode not used by any multi ... todo retire that stuff completely
    if (inputs.resdyndeltaui !== 0) setInput(W.resdyndeltaui, 0);  // << only works with 0 for now, everything must be regular
    var cumcount = 0;
    this.mytotnum = [1];  // dummy for parent of starting horn hornid 3
    for (let h = 3; h < this.hornrun.length; h++) {
        var hr = this.hornrun[h];
        var sribs = this.sribs[h];
        sribs = ((!isNaN(sribs*1)) ? sribs * 1 : genes[sribs]) || 0;
        var ribs = Math.ceil(sribs) + 1;
        var mytotnum = ribs * this.mytotnum[this.parents[h]];
        if (hr.horn._radius)
            cumcount += mytotnum;  // do not allow for rendering 0 radius
        uniformsp['cumcount' + h].value = cumcount;

        this.mytotnum[h] = mytotnum;
    }
    this.horncount = cumcount;
    uniformsp.horncount.value = cumcount;

    if (!scenep) {
        // use standard multiscene but cheat the skelnum and gbuffoffset for now
        if (!multiScene.dummy) multiScene.dummy = { hornrun: { nohorn:{} }, trankey: '', gbuffoffsets: {}, skelnum: {} };
        multiScene.dummy.skelnum.nohorn = uniformsp.skelnum.value;
        multiScene.dummy.meshused = 0;
        //function multiScene(genes, num, key, dummy, hset, hornid)
        scenep = multiScene(genes, cumcount, "", false, multiScene.dummy, 'nohorn');
        if (!scenep.children[0]) {log('cannot rendersinglepmulti: no scene children for ' /*?? + kkopmode */, opmode, oplist[opmode]); return false; }
        uniformsp.gbuffoffset.value = 0;
    }
    if (opmode === OPMAKESKELBUFF) checkskelbuffer(cumcount, (uniformsp.skelnum.value + 2*uniformsp.skelends.value + 1));
    scenep.children[0].material.wireframe = usewireframe && (rendertarget.name === 'rtopos');
    rrender('bulkobject', scenep, render_camera, rendertarget);
    return true;
}

/** render by rendering mainhorn object */
HornSetP.renderHornobj = function(genes, uniformsp, rendertarget, scenep) {
    var k = -99;
    uniformsp.parnumsa.value.set(k,k,k,k);
    uniformsp.parnumsb.value.set(k,k,k,k);

    if (badshader) return;
    if (!genes.tranrule) return;   // can happen in odd case where this is called with non-horn
    if (genes.tranrule.indexOf("main") === -1) return oldrenderobj(genes, uniformsp, rendertarget);
    if (opmode !== OPPICK) prerender(genes, uniformsp);   // todo cleaner path for pick, for now don't upset special camera
    var hset = getHornSet(genes.tranrule);
    if (!hset) {
        hornTrancodeForTranrule(genes.tranrule, genes); hset = getHornSet(genes.tranrule);
    }
    hset.tranrule = genes.tranrule;   // << ?? todo optimize hset.synthCode by detection of change here ??
    hset.ribshow = "";
    currentHset = hset;  // convenience
    hset.horncount = 0;
    hset.cumcount = [];  // keep track of the cumulative count for each hornid
    hset.meshused = 0;
    hset.hornid = 3;  // keep track, and don't use 0,1,2 as can be confused with background 0, opacity 1, cubemap 2
    hset.parents[3] = 0;
    hset._renderscene = scenep;
    if (!uniformsp.gbuffoffset) uniformsp.gbuffoffset = { type: "f", value: 0 };
    hset.gbuffoffset = 0;
    if (inputs.SINGLEMULTI && rendertarget !== 'NOT A RENDERTARGET' && scenep !== 'noscene')
        var done = hset.rendersinglepmulti(genes, uniformsp, rendertarget, scenep);
    if (!done) {
        hset.getmain().renderh(genes, uniformsp, rendertarget, hset, "", 1);
    }
    postrender(genes, uniformsp);
    hobj = hset;
    hset.ribshow += "\nTOTAL=" + hset.horncount;
    // framelog("final gbuffoffset,", hset.lastgbuffoffset, "opmode", opmode, "horncount", hset.horncount, "meshused (M)", hset.meshused/1000000);

    if (HornWrapFUN.cubeEarly && (opmode === OPOPOS || opmode === OPSHAPEPOS)) {
        uniformsp.hornid.value = -1;
        if (opmode === OPOPOS) scenep = CubeMap.scene;
        CubeMap.RenderPass(genes, uniformsp, rendertarget, scenep);
    }

};

/** add a sub for struct mutation or explicit */
HP._addsub = function(hset) {
    var sh = horn(this.name + "_S", hset).ribs(10).radius(20).stack(200);
    sh.mutateStructH(hset);
    sh.mutateStructH(hset);
    this.sub(this.name + "_S");
};
/** add a tail for struct mutation or explicit */
HP._addtail = function(hset) {
    var sh = horn(this.name + "_T", hset).ribs(10).radius(20).stack(200);
    sh.mutateStructH(hset);
    sh.mutateStructH(hset);
    this.tail(this.name + "_T");
};
/** TODO addhead */

/** and a tran op to horn trans list */
HP._addtran = function(tran) {
    var pos = Math.random() * this.trans.length;
    this.trans.splice(pos, 0, tran);
};

var rr = Math.random;

/** mutate an array in place, can only swap or remove
Don't know what type to add.  */
function arraymut(arr) {
    if (arr.length === 0) return;
    let pos = arr.length * rr();
    if (rr() < 0.1) {  // swap adjacent
        var rem = arr.splice(pos,1);
        if (rem[0] === undefined) {
            var debug=0;
        } else {
            arr.splice(pos+1,0,rem[0]);
        }
    }
    if (rr() < 0.1) {  // remove random
        arr.splice(pos,1);
    }
    return arr;  // not generally used
}

/** mutate a horn structure, in place */
HP.mutateStructH = function(hset) {
    var r = Math.random();
    var l = this.trans.length;
    if (rr() < 0.1) this._addtran(["twist", [360]]);
    if (rr() < 0.1) this._addtran(["bend", [90]]);
    if (rr() < 0.1) this._addtran(["curl", [90]]);
    if (rr() < 0.1) this._addtran(["stack", [1000]]);
    if (rr() < 0.1) this._addtran(["scale", [2]]);
    if (rr() < 0.1) this._addsub(hset);  // add subhorn
    if (rr() < 0.1) this._addtail(hset);  // add tail
    // todo addhead
    arraymut(this.trans);
    arraymut(this._tail);
    arraymut(this._sub);
};

/** mutate a HornSet, in place */
HornSetP.mutateStructHs = function() {
    for (let h in this.horns) this.horns[h].mutateStructH(this);
    this._compilehs();
};

/** clone a HornSet.  **/
HornSetP.clone = function() {
    var hs = cloneNoCircle(this);
    hs.__proto__ = HornSetP;
    for (let h in hs.horns) {
        hs.horns[h].__proto__ = HP;
        var trans = hs.horns[h].trans;
        for (let t = 0; t < trans.length; t++)
            trans[t].__proto__ = TR;
    }
    return hs;
};

/** list of gene names used in HornSet */
HornSetP.getgenenames = function() {
    var r = {};
    copyFrom(r, specgenes);
    copyFrom(r, this.luniforms);
    for(var h in this.horns) copyFrom(r, this.horns[h]._genenames);
    if (this.getSynthGeneNames) copyFrom(r, this.getSynthGeneNames());
    return r;
};

var oldrenderobj = W.renderPass;  // old one for legacy test
W.renderPass = HornSetP.renderHornobj;
W.horn2html = HornSetP.html;

/** code to translate tranrule as stored into transform code: direct by default */
W.hornTrancodeForTranrule = function hornTrancodeForTranruleF(tranrule, genes) {
    // allow substitutions BEFORE looking in cache, but only in first part
    // no need for full makeParts
    const ss = tranrule.split('SynthBus')
    ss[0] = substituteExpressions(ss[0]);
    tranrule = ss.join('SynthBus');
    if (genes) genes.tranrule = tranrule;

    if (tranrule.indexOf("main") !== -1) {
        if (getHornSet(tranrule)) {
            getHornSet(tranrule).getgenenames();  // also puts into bundle
            var r = getHornSet(tranrule).bundle;
        } else {
            /*^^^debugger;*/
            var nhs = new HornWrap.HornSet();
            r = /*^^^await*/ nhs.setuphorn(tranrule);
        }
        //setTimeout( function() { kinectJupDyn.setup(r._springMap); }, 0);
        if (kinectJupDyn) kinectJupDyn.setup(r._springMap);
        return r;
    } else {
        throwe("support for old definition style removed");
    }
};


}  // HornWrapFUN
var HornWrap = new HornWrapFUN();

/** genecode for horn showing genes */
function genecode(genes) {
    genes = genes || currentGenes;
    trancodeForTranrule(genes.tranrule, genes);  // make sure it is built
    var ret =  getHornSet(genes.tranrule)._genecode;
    return ret;
}

/** valuecode for hornset, with current values
 * currently disabled as does not reflect correct detail, in particular no synth stuff */
function NOTvaluecode(genes) {
    genes = genes || currentGenes;
    return genesub(genecode(genes), genes);
}

/** substitute values for genes in a genecode */
function genesub(gcodep, genes) {
    var r = gcodep;
    for (let gn in genes) {
        r = r.replaceall('#' + gn + '#', genes[gn]);
    }
    return r;
}

/** function to marry two objects by randrule,
 * Currently just uses the first
 */
HornWrap.randrulemarry = function(genes, obj2) {
    var newrule = randrules(genes);
    trancodeForTranrule(newrule, genes);  // make sure rule is established
    var newobj = clone(genes);
    newobj.tranrule = newrule;
    if (genes.tranrule.indexOf('horn') === -1) return newobj;
    var genelist = getHornSet(newrule).getgenenames();
    for(var g=0; g<genelist.length; g++) {
        if (!(genelist[g] in newobj)) {
            var genename = genelist[g];
            newobj[genename] = genedefs[genename].def;
        }
    }
    return newobj;
};

var newplane = true;
var dotty = false;  // set to true to generate dotty scene: also used for skelbuffer generation
var bigsceneSet = {};  // cached scene set big enough for everything seen so far: one bigscene for each fac
var instanceIDs = [];   // buffer for instanceIDs, not needed in webgl2
var instanceIDBuff;
//var radnums = [2,3,4,6,8,12,16,24,32,48,64,96,128];
//var radnums = [2,3,4,5,7,11,15,23,31,47,63,63,63,63,63];  // radnums used for varying resolution, values above 65 or so give bugs
// this version of radnums modified to align with older equivalents for performance comparison
var radnums = [3,4,5,7,9,13,17,25,33,49,65,65,65,65,65];  // radnums used for varying resolution, values above 65 or so give bugs
//  old low/1/2/3/4/high -> 3/5/9/17/33/65 -> new 2/4/6/8/10
/** generate and return a scene for key key with num displayed objects
 * If newplane is set, we generate our own multi-plane that does not have all the three.js overhead,
 * and handle varying length for different circumstances by control of chunks.
 * Chunk control is fast, so a single multi-plane is used for different environments (variations of num)
 *
 * If dummy is set do computations and set uniforms, but do not assign/setup scene
 *
 * */

/*
 *   sphere end       body          shpere end
 *         SSSSBBBBBBBBBBBBBBBBBBBBSSSS
 *             --------------------            bodycnum <<< for skeleton === skelnum; recomputed as bodygnum in shaders
 *         ----------------------------        dlennum
 *           ++--------------------++???       dlennumX <<< for skeleton  ++ is skelends, --- is skelnum+1, ??? is extra

 skeleton has total width uniforms.skelbufferRes.value.x = skelbuffer.width
 it has  skelnum + 1 + 2*skelends  'active' points
 */
var resoverride = {};

/** this version uses instancing, for use with three.js v73 or later */
function multiScene(genes, num, key, dummy, hset, hornid) {
    if (!newplane) return multiSceneOld(genes, num, key);

     // choose dynamic resolution factor based on number of ribs
    // dynamic resolution
    var rb = inputs.resbaseui - inputs.resdyndeltaui * (Math.log(num) / Math.LN10) - resdelta;
    rb = Math.ceil(rb);
    if (rb < 0) rb = 0;
    hset.hornrun[hornid].num = num;
    hset.hornrun[hornid].res = rb;
    var dradnum = radnums[rb];      // dynamic number round
    var dlennum = dradnum * 5;      // dynamic number along, including sphere ends
    if (resoverride.lennum && resdelta === 0) dlennum = resoverride.lennum;
    if (resoverride.radnum && resdelta === 0) dradnum = resoverride.radnum;
    //dradnum = 3;    // for lots of particle spring experiments
    //dlennum = 15000; // 4096*2;
    rb = dlennum + "/" + dradnum;


    // skeleton is calculated just once each frame, so takes account of inputs.resdyndeltaui but not of resdelta
    var rbsk = inputs.resbaseui - inputs.resdyndeltaui * (Math.log(num) / Math.LN10);
    rbsk = Math.ceil(rbsk);
    if (rbsk < 0) rbsk = 0;
    //var lower = 2;  // was 2, but why skimp here which isn't too expensive ??? TODO check'
    //var bodycnum = Math.ceil(radnums[rbsk]*5/lower);     // lower resolution will do todox lower if we go cubic

    // align bodycnum with main use
    var spherenum = Math.floor(dlennum / 20);      // allocation for spherical ends, 5% at each end
    var bodycnum = dlennum - 2*spherenum;   // number of steps along length dedicated to main body (rest are for spherical ends)

    uniforms.lennum.value = dlennum;
    uniforms.radnum.value = dradnum;  // only used for skelbuffer (which isn't used)

    var dlennumX = dlennum;         // allows for extra beyond ends to help interpolation when we have skeleton
    if (inputs.USESKELBUFFER && opmode === OPMAKESKELBUFF) {
        var skelnum = bodycnum;
        if (hset.trankey.indexOf('ppost') !== -1 && skelnum > 127) skelnum = 127;  // so spring history sampling does not go silly, TODO replace with something more precise?
        if (hset.trankey.indexOf('ppos(') !== -1 && kinectJupDyn.getRibs())
            skelnum = kinectJupDyn.getRibs() - 5;  // so spring history sampling does not go silly, TODO replace with something more precise?
        if (resoverride.skelnum) skelnum = resoverride.skelnum;
        let skelends = uniforms.skelends.value = FIRST(resoverride.skelends, 2);
        var buffused = num * (skelnum + 2*skelends + 1);   // +5 as extended 2 backwards and forwards
        dlennum = skelnum;  // for checks lower down
        dradnum = 0;
        var meshused = buffused;
        var meshsize = skelnum + 1 + 2*skelends;
        rb = dlennum + "/" + dradnum + '!' + skelends; // rbsk+"!";   // and unique key so skeleton has its own bigscene
        hset.gbuffoffsets[hornid] = hset.gbuffoffset;  // call this BEFORE updating hset.gbuffoffset
        hset.skelnum[hornid] = skelnum;  // call this BEFORE updating hset.gbuffoffset
        // claim skelbuffer/skelbuffer space before calling subobjects/tails
        hset.gbuffoffset += buffused;
        hset.lastgbuffoffset = hset.gbuffoffset;  // keep for stats
    } else {
        meshsize = (dlennumX+1) * (dradnum+1);
        meshused = num * meshsize;
        hset.meshused += meshused;
    }
    // get right place/resolution for skeleton when generating or using skeleton; not used when no skeleton
    uniforms.skelnum.value = hset.skelnum[hornid];
    uniforms.gbuffoffset.value = hset.gbuffoffsets[hornid];

    // rb += '=' + inputs.resbaseui + '~' + resdelta + '~' + inputs.resdyndeltaui;  // uncomment to help debug


    if (!dummy) {
        // find appropriate bigscene for the bigsceneSet
        var bigscene = bigsceneSet[rb];
        if (!bigscene) {
            // make sure resoverride scenes don't stay around
            const okey = resoverride.lennum + '/' + resoverride.radnum;  // override key
            if (rb === okey && bigsceneSet.lastokey && bigsceneSet[bigsceneSet.lastokey]) {
                bigsceneSet[bigsceneSet.lastokey].geometry.dispose();
                delete bigsceneSet[bigsceneSet.lastokey];
            }
            bigsceneSet.lastokey = okey;

            var geometry = new THREE.InstancedBufferGeometry();

            // we make our own plane here rather than using THREE.PlaneGeometry
            // as that has a huge overhead that is not relevant to our application
            // make the vertices
            var xoff = 0;
            dlennumX = dlennum;
            if (dradnum === 0) {
                dlennumX += 2 * uniforms.skelends.value;
                xoff = - uniforms.skelends.value / dlennum;
                // no sjpt 30/12/2018
                // Just makes extra work using the excess points
                // and the excess ones actually damage the result (override sensible rp values near 0.5)
                // meshsize = nextpow2(dlennumX+1);
            }

            // We make the position vertex array even though we do not generally need it.
            // Ir we leave it out (for GPUGRIDN) we get complaints and no object
            // Also, GPUGRIDN does not get used effectively for OPMAKESKELBUFF
            if (inputs.GPUGRIDN && dradnum !== 0) {
                // simulate gl_VertexID with a relatively small attribute array, for WebGL 1
                var flarr = new Uint16Array(meshsize);  // << todo, allow for 32 bit needed
                //var flarr = new Float32Array(meshsize);
                var ii = 0;

                for (let i=0; i<=dradnum; i++) {
                    for (let j=0; j<=dlennumX; j++) {
                        flarr[ii] = ii;
                        ii++;
                    }
                }
                var vertices = new THREE.BufferAttribute(flarr, 1);
                geometry.addAttribute( 'positioni', vertices );
            } else {
                flarr = new Float32Array(meshsize*2);
                ii = 0;

                for (let i=0; i<=dradnum; i++) {
                    for (let j=0; j<=dlennumX; j++) {
                        flarr[ii++] = j / dlennum  - 0.5 + xoff;
                        flarr[ii++] = dradnum === 0 ? 0 : i / dradnum  - 0.5;
                        // flarr[ii++] = 0;
                    }
                }
                vertices = new THREE.BufferAttribute(flarr, 2);
                geometry.addAttribute( 'position', vertices );
            }

            // make the indices, unless it is the skeleton
            if (dradnum > 0) {
                if (multiScene.force32)
                    var uarr = new Uint32Array(dlennum * dradnum * 3 * 2 );
                else
                    uarr = new (meshsize > 65536 ? Uint32Array : Uint16Array)(dlennum * dradnum * 3 * 2 );
                let iii = 0;
                for (let i=0; i < dradnum; i++) {
                    for (let j=0; j < dlennum; j++) {
                        var a = i*(dlennum+1) + j;
                        var b = a + dlennum+1;
                        var c = a + 1;
                        var d = b + 1;

                        uarr[iii++] = a;
                        uarr[iii++] = b;
                        uarr[iii++] = c;
                        uarr[iii++] = c;
                        uarr[iii++] = b;
                        uarr[iii++] = d;
                        if (d >= meshsize)
                            d = +d;
                    }
                }
                // why ? var indices = new Uint32Array(uarr);
                geometry.setIndex( new THREE.BufferAttribute( uarr, 1 ) );
            }


               bigscene = { scene: newscene('bigsceneM_' + rb + "_"),  scenedot: newscene('bigscenedotM_' + rb + "_"), geometry: geometry };
            bigsceneSet[rb] = bigscene;

        }

        geometry = bigscene.geometry;
        multiInstances(bigscene, num);  // make sure enough instances

        var bscene = dotty ? bigscene.scenedot : bigscene.scene;
        if (!bscene.children[0]) {
            var mesh = dotty ? new THREE.Points(geometry) : new THREE.Mesh(geometry);
            mesh.frustumCulled = false;
            //mesh.position.z = i*mgroup;
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            mesh.frustumCulled = false;
            bscene.addX(mesh);
        }

        var mat = getMaterial(genes);
        bscene.children[0].material = mat;
               // bigscene.geometry.maxInstancedCount = num;

        //scene.buff used = buff used;
        //scene.mesh used = mesh used;
    }  // ! dummy, actaully generate the scene


    return bscene;  // will be undefined if dummy

}

/** make sure instances enough and registered for this bigscene */
function multiInstances(bigscene, num) {
    var geometry = bigscene.geometry;
    geometry.maxInstancedCount = num;

    if (isWebGL2) return;  // we can use gl_InstanceID directly for webgl2

    // extend the (shared) instances if necessary
    if (instanceIDs.length < num) {
        for (let i = instanceIDs.length; i < num * 1.3 + 50; i++) instanceIDs.push(i);
        instanceIDBuff = new THREE.InstancedBufferAttribute( new Float32Array(instanceIDs), 1, true );
    }
    instanceIDBuff.setDynamic(true);
    geometry.addAttribute( 'instanceID', instanceIDBuff ); // per mesh instance

}


var multiScenes = {}; // cache of scenes, with current enabled number, used for old style
var multigeom;
/** old stule of multiScene
 * If newplane is not set (obsolete), we use three.js planes, and control number by visibility.
 * In this case, to avoid too much visibility switching, we have different sets for different key contexts,
 * each with approximately the correct number of planes.
 *
 * @param {type} genes
 * @param {type} num
 * @param {type} key
 * @returns {Boolean}
 */
function multiSceneOld(genes, num, key) {
    var dradnum = radnum;
    var dlennum = lennum;
    // fall through here for (obsolete) standard plane code
    // still used for stl file generation
    var mat = getMaterial(genes);

    if (!multigeom || multigeom.vertices.length !== (lennum+1)*(radnum+1)) {
        // ??? which mgroup  mgroup = 1;
        multigeom = new THREE.PlaneGeometry(1, -1, lennum, radnum);
        multiScenes = {};
    }


    // get cached scene if possible
    var sc = multiScenes[key];
    // make sure scene exists
    if (!sc) {
        sc = { scene: newscene('bigsceneOld'),  scenedot: newscene('bigscenedotOld'), num: 0 };
        //sc.scene.autoUpdate = false;
        multiScenes[key] = sc;
    }

    var dscene = dotty ? sc.scenedot : sc.scene;

    // make sure scene contains enough elements
    var ch = dscene.getDescendants();
    for (let i = ch.length; i < num; i++) {
        var mesh = dotty ? new THREE.Points(multigeom) : new THREE.Mesh(multigeom);
        mesh.frustumCulled = false;
        mesh.position.z = i;  // just a way to pass extra information
        mesh.updateMatrix();
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
        dscene.addX(mesh);

    }

    // make sure exactly lowest num elements are visible, and record num
    ch = dscene.getDescendants();
    for (let i = num; i < sc.num; i++) ch[i].visible = false;
    for (let i = sc.num; i < num; i++) ch[i].visible = true;
    sc.num = num;
    // make sure they have the right material
    if (ch[0].material !== mat)
        for (let i = 0; i < ch.length; i++)
            ch[i].material = mat;
    return dscene;
}

// These are defined externally.
// as when defined internally, problems with Chrome crashing on error in the eval/new  Function call.
var _defaultHornSet;  // needed to have evel in safer scope
/** convenience function for new Horn(), or shared horn */
function horn(name, hset) {
    hset = hset || _defaultHornSet;
    if (hset.horns[name]) return hset.horns[name];
    return new HornWrap.Horn(name, hset || _defaultHornSet);
}
function springMap(val, hset) { (hset || _defaultHornSet)._springMap = (val === undefined ? true : val); }
function gcode(val, hset) { (hset || _defaultHornSet)._gcode = val; }


/** directory of built hornsets, keyed by tranrule */
var _hornSets = {};
function setHornSet(key, val) {
    if (key === undefined)      //
        _hornSets = {};
    else
        _hornSets[key.pre('SynthBus')] = val;
}
function getHornSet(key) {
    return _hornSets[key.pre('SynthBus')];
}

/** debug convenient last hornset object */
var hobj;

/** generate new hornset from genes, ready to edit/mutate */
function cloneHornset(genes) {
    // nb for JSON, circular uses horn.parent, horn.hset, horn.sub[*].parent
    genes = genes || currentGenes;
    return dstring(xstring(getHornSet(genes.tranrule)));
}

/** randrulesHorn defines rules for random structure mutation on hornset
 * returns a string version of new structure */
function randrulesHorn(genes) {
    var nhs = cloneHornset(genes);
    nhs.mutateStructHs();
    return genesub(nhs._genecode, genes);
}

W.randrulemarry = HornWrap.randrulemarry;

/** edit genes op using rule op
 * if the op already exists for the horn, edit it
 * otherwise create and edit it. */
function editobj(op, genes) {
    genes = genes || currentGenes;
    var eops = {B: "bend", C: "curl", T: "twist", O: "twistoffK", S: "stack", G: "scale", R: "ribs", A: "radius", F: "flapK", W: "sweepK"};
    var eopsy = {T: "twistoffK", W: "flapK", F: "sweepK"};
    var opn = op.length === 1 ? eops[op] : op;  // so we can use abbreviations or full names; eg 'alt,S'
    var opny = eopsy[op];

    // find the hornset and identified horn
    var hornset = getHornSet(currentGenes.tranrule);
    var hornname = currentpick.split("=")[0].trim();
    var thorn = hornset.horns[hornname];
    if (!thorn) { msgfix("incorrect horn element selected", '?'); return; }

    // find the gene if it is already there
    if (opn) {
        var ngn = thorn.gn(opn);
        if (hornset.getgenenames()[ngn]) {
            editgenex = genedefs[ngn];
            canvas.style.cursor = "";
            canvas.className = opn;
            if (genes === currentGenes)
                setGUITranrule();
        }
        if (opny) {
            var ngny = thorn.gn(opny);
            editgeney = genedefs[ngny];
        }
    }

    // if no gene yet, need to create new transform
    if (!editgenex) {
        var nhs = cloneHornset(genes);
        thorn = nhs.horns[hornname];
        if (op === 'alt,S') {
            var sh = horn(thorn.name + "_S", nhs).ribs(10).radius(20).stack(200);
            thorn.sub(thorn.name + "_S");
        } else {
            thorn.trans.push(new HornWrap.Tran(opn, []));
        }
        nhs.uniforms = "";
        nhs._compilehs();
        var res = genesub(nhs._genecode, currentGenes);
        setHornSet(res, nhs)
        currentGenes.tranrule = res;
        target.tranrule = res;
        setGUITranrule();
    }
}

/*    test
horn("first").ribs(20).radius(50).scale(2).twist(500).stack(1200).bend(40).sub("sub").tail("tail");
horn("sub").ribs(8).radius(5).scale(0).twist(1440).stack(1000).bend(90);
horn("tail").ribs(20).scale(2).twist(0).stack(500).bend(0).tail("branch");  // no radius for easily visible test
horn("branch").ribs(10).branch(1.).sub("twig");   // no radius because not much point
horn("twig").ribs(20).radius(50).scale(0).stack(700).bend(80);
mainhorn = "first";
*/
var oldrender = false;

/** make copies planes like 3d geom with less overhead,
where used for skelbuff it is just a line, but is extended 2 extra beackwards and forwards
if half is specified then just half is generated (all the points but half the indices)
May later make half more flexible for different segments generated ...
===
chunk control removed after version 5299, refer back there if chunks needed again
 */
function planeg( width, height, widthSegments, heightSegments, copies, half ) {
    copies = copies || 1;

    let ix, iz;
    const width_half = width / 2;
    const height_half = height / 2;

    const gridX = widthSegments;
    const gridZ = heightSegments;

    let gridX1 = gridX + 1;
    const gridZ1 = gridZ + 1;

    const segment_width = width / gridX;
    const segment_height = gridZ === 0 ? 0 : height / gridZ;

    // allow for extension back and forwards
    let xoff = 0;
    if (gridZ === 0) {
        gridX1 = gridX + 5;
        xoff = -2 * segment_width;
        //segment_height = 0; // not really relevant
   }


    const geometry = new THREE.BufferGeometry();
    geometry.vertsperrib = gridX1 * gridZ1;
    geometry.trisperrib = gridX * gridZ * 2;
    const possl = geometry.vertsperrib * 3 * copies;
    const inddl = geometry.trisperrib * 3 * copies;
    const poss = new Float32Array(geometry.vertsperrib * 3 * copies);
    let indd = possl > 65536 ? new Uint32Array(inddl) : new Uint16Array(inddl);

    //geometry.attributes = {
    //    index: { itemSize: 1, array: indd },
    //    position: { itemSize: 3, array: poss}
    //};
    geometry.ws = widthSegments;
    geometry.hs = heightSegments;

    let i = 0;
    for (let copy=0; copy < copies; copy++) {
        for ( iz = 0; iz < gridZ1; iz ++ ) {
            for ( ix = 0; ix < gridX1; ix ++ ) {
                const x = ix * segment_width - width_half + xoff;
                const y = iz * segment_height - height_half;
                // if (ix == 0 || ix == gridX) y = 0; // force texture towards end, concentrate error at 0-1 join (bad?)
                poss[i++] = x;
                poss[i++] = -y;
                poss[i++] = copy;
            }
        }
    }

    i = 0;
    for (let copy=0; copy < copies; copy++) {
        const ck = gridX1 * gridZ1 * copy;
        for ( iz = 0; iz < gridZ; iz ++ ) {
            for ( ix = 0; ix < (half ? iz + 1 : gridX); ix ++ ) {
                const a00 = ck + ix + gridX1 * iz;
                const a01 = ck + ix + gridX1 * (iz + 1);
                const a11 = ck + (ix + 1) + gridX1 * (iz + 1);
                const a10 = ck + (ix + 1) + gridX1 * iz;
                indd[i++] = a01;
                indd[i++] = a11;
                indd[i++] = a10;
                indd[i++] = a01;
                indd[i++] = a10;
                indd[i++] = a00;
            }
        }
    }
    if (half) indd = indd.slice(0, i);

    function disposeArray() {
        this.array = null;
    }
    geometry.setIndex( new THREE.BufferAttribute( indd, 1 )); // .onUpload( disposeArray ) ); // disposing of the index stops it working, todo find out why
	geometry.addAttribute( 'position', new THREE.BufferAttribute( poss, 3 ).onUpload( disposeArray ) );
    geometry.computeBoundingSphere();
    return geometry;
}

// there is a limit somewhere else ... try to track it down
// so if this limit is set > 400 bits go missing anyway
var MAXRIBS = 2000; // to limit toal number of ribs, especially with recursion

var oobj; // for revert
/** fix the rref of object genes to k */
function fixrref(genes, k) {
    genes = genes || currentGenes;
    if (k === undefined) k = 100;
    oobj = clone(genes);
    for (let gn in genes) {
        var gd = genedefs[gn];
        if (!gd) continue;
        if (gd.tag.indexOf("geom") === -1) continue;
        if (gn.indexOf("_") === -1) continue;
        if (gn.endsWith("K")) continue;
        if (gn.endsWith("_rref")) {
            genes[gn] = k;
            continue;
        }
        if (gn.endsWith("_ribs")) continue;
        if (gn.endsWith("_radius")) continue;
        if (gn[0] === "_") continue;
        var on = gn.pre("_");
        var oribs = oobj[on + "_ribs"];
        var orref = oobj[on + "_rref"] || oribs;
        //if (ribs !== rref)
            //console.log("? ribs/rref " + gn);
        var orat = oribs/orref;
        var ribs = oribs;
        if (ribs < k/2)
            ribs = k/2;
        if (ribs > k*2) ribs = k*2;
        genes[on + "_ribs"] = ribs;
        //genes[on + "_rref"] = k;
        var rref = k;
        var rat = (rref*oribs)/(orref*ribs);
        if (gn.endsWith("_scale"))
            genes[gn] = 1 + rat * (oobj[gn]-1);
        else
            genes[gn] = rat * oobj[gn];
        //console.log("<" + gn);
    }
    newframe();
    if (genes === currentGenes)
        setGUITranrule(genes);
}

/* fix rref all */
function fixrrefall() {
    for (let o in currentObjects)
        fixrref(currentObjects[o].genes);
    forcerefresh = true;
}

/** clean up planets so all use same model
 * The planets are all the same except some have first_bend and some don't.
 * 2 does and is used as basic tranrule
 * */
function cleanplanets() {
    var v = [];
    for(var i=1; i<=12;i++) {
        var eo = xxxgenes(i);
        v[i]=getHornSet(xxxgenes(i).tranrule).trankey;
        if (v[i].indexOf("first_bend") === -1) {
            eo.tranrule = xxxgenes(2).tranrule;
            eo.first_bend = 0;
        }
        for (let gn in genedefs) {
            var gd = genedefs[gn];
            if (eo[gn] > gd.max) gd.max = eo[gn];
            if (eo[gn] < gd.min) gd.min = eo[gn];
        }
    }
    forcerefresh = true;
    newframe();
}

/** set up planets when not is projection version */
function planets() {
    // load projection webgallery

    savedef = 'organicProjection';
    refreshGal(); // webGalNames = readWebGal();
    trysetele("vp12", "checked", true);
    trysetele("rotallcams", "checked", false);
    setViewports([2,6]);
    webgallery();
    loadcurrent( getWebGalByNum(0).name  );
    copyFrom(currentGenes, target);

    // clean them to use same model and fixed rref values
    //cleanplanets();

    //setTimeout( fixrrefall, 1000);
    //setTimeout( cleanplanets, 1500);
}

/** update the html rules display */
function updateHTMLRules(genes) {
    W.htmlouter.style.display = W.showhtmlrules.checked ? '' : 'none';
    var rules = W.showhtmlrules.checked ? horn2html(genes) : "";
    W.htmlrulebox.innerHTML = rules;
    //W.htmlrulebox.focus();  // << to consider, sometimes needed
    return rules;
}

var trlastx, trlasty, trlastgn, trlastsrc;
function trmousedown(evt) {
    saveundo();
    if (evt.button === 2) {
        trlastsrc = evt.target;
        trlastsrc.focus();
        trlastgn = trlastsrc.id.post("_");
        trlastx = evt.screenX; trlasty = evt.screenY;
        //return killev(evt);  // no we want mousewhich to be set
    }
}

function trmouseup(evt) {
    if (evt.button !== 2) // leave to trcontextmenu
        trlastgn = undefined;
    //    return killev(evt);
}

function trcontextmenu(evt) {
    if (trlastgn) {
        trlastgn = undefined;
        return killev(evt);
    }
}

function trmousemove(evt) {
    var gn = trlastgn;
    if (!gn) return; // called on document, usually irrelevant

    var dx = evt.screenX - trlastx;
    var dy = evt.screenY - trlasty;
    var v = currentGenes[gn];
    var gd = genedefs[gn];
    if (v !== undefined && gd && mousewhich === 8) {
        incgene(gn, dx/3, evt);
        trlastx = evt.screenX; trlasty = evt.screenY;
        return killev(evt);
    }
}

function trkeydown(evt) {
    var src = evt.target;
    var gn = src.id.post("_");
    var todo = geneonkeydown(evt, gn);
    if (!todo) return killev(evt);

    var k = 1;
    var ff = keyname(evt.keyCode);
    todo = false;
    switch (ff) {
       case "up arrow": incgene(gn, k, evt); break;
       case "down arrow": incgene(gn, -k, evt); break;
       case "enter":
            saveundo();
               var v = 1*src.textContent;
            if (!isNaN(v)) {
                setval(gn, v);
                src.style.backgroundColor = "";
            } else {
                src.style.backgroundColor = "red";
            }
            break;
       case "G":
           Director.plot(evt.target.id.replace("TR_", ""));
           break;
       case "H":
           Director.unplot();
           break;
       case 'Q':
           var name = evt.target.id.replace("TR_", "");
           msgfix(name, "$" + name);
           break;

       default: todo = true;
    }
    if (!todo) return killev(evt);
    return true;
}

function trkeyup(evt) {
    var src = evt.target;
    var gn = src.id.post("_");
    var v = 1*src.textContent;
    if (isNaN(v))
        src.style.backgroundColor = "red";
    else if (v !== +format(currentGenes[gn]))
        src.style.backgroundColor = "#fd0";
    else
        src.style.backgroundColor = "";

    return true;
}

function trwheel(evt) {
    var src = evt.target;
    var gn = src.id.post("_");
    console.log("shift " + evt.shiftKey);
    incgene(gn, evt.wheelDelta, evt);
    return killev(evt);
}
var _trmsg = "<h4>special keys</h4><dl><dt>&#8593;&#8595;</dt><dd>change values</dd><dt>&#8679;+&#8593;&#8595;</dt><dd>faster change value</dd><dt>F2</dt><dd>freeze</dd><dt>G</dt><dd>plot graph</dd><dt>H</dt><dd>remove graph</dd></dl>";
_trmsg += "<h4>alt keys</h4><dl><dt>-</dt><dd>negate</dd><dt>0</dt><dd>set 0</dd><dt>1</dt><dd>set 1</dd><dt>X</dt><dd>set last value</dd><dt>D</dt><dd>set default</dd><dt>R</dt><dd>rotate values</dd></dl>";

function trfocus(evt) {
    var n = evt.target.nextSibling;
    if (n === null) return;
    if (n.className === "help") n.innerHTML += _trmsg;
}
function trblur(evt) {
    var n = evt.target.nextSibling;
    if (n === null) return;
    if (n.className === "help") n.innerHTML = n.innerHTML.pre("<h4>");

}
var hornhighlight, hornsolo, solostarttime;
function hornmousemove(evt) {
    // hornmouseover(evt);  // repeat mouseover so shift can be more dynamic
}

function hornmouseover(evt) {
    hornhighlight = evt.target.id.post("_");
    if (evt.shiftKey) {
        hornsolo = evt.target.id.post("_");
        solostarttime = Date.now();
    } else {
        hornsolo = undefined;
    }
    newmain();
}

function hornmouseout(evt) {
    hornsolo = hornhighlight = undefined;
    newframe();
}

function hornkeydown(evt) {
    hornmouseover(evt);  // repeat mouseover so shift can be more dynamic
    var ff = keyname(evt.keyCode);
    var todo = false;
    switch (ff) {
        case 'S':
            if (W.htmlshowstruct) {
                document.body.removeChild(W.htmlshowstruct);
                HornWrap.setSubrepeat(1);
                HornWrap.setRotate(0);
            } else {
                var style = document.createElement('style');
                style.id = 'htmlshowstruct';
                style.innerHTML = ".trans, .hornhead, .horn legend, .subs > legend { display: none; } fieldset.horn { border: 0px; } fieldset.subs { border-top-width: 0px; }";
                document.body.appendChild(style);
                HornWrap.setSubrepeat(2);
                HornWrap.setRotate(1);
            }
            break;
        case 'T':
            if (evt.srcElement.classList.contains('hornname2')) {
                const p2 = evt.srcElement.parentNode.parentNode;
                if (p2.classList.contains('hornshow') )
                    p2.classList.remove('hornshow');
                else
                    p2.classList.add('hornshow');
            }

            break;
        case 'R':
            HornWrap.setRotate(-1);
            break;
        case '1':
        case '2':
        case '3':
            if (evt.target.classList.contains('gval')) // do not allow it to work on value elements
                todo = true;
            else
                HornWrap.setSubrepeat(ff-'0');
            break;

       default: todo = true;
    }
    if (!todo) return killev(evt);
    return true;
}

HornWrap.setSubrepeat = function(n) {
    if (HornWrap.subrepeat !== n) {
        HornWrap.subrepeat = n;
        updateHTMLRules();
        W.htmlrulebox.focus();
    }
}

/** set rotation, -1 toggle, 0/false off, 1/true on */
HornWrap.setRotate = function(n) {
    if (n < 0) n = !W.htmlshowrot;
    if (W.htmlshowrot) {
        document.body.removeChild(W.htmlshowrot);
    };
    if (n) {
        var style = document.createElement('style');
        style.id = 'htmlshowrot';
        style.innerHTML = ".subs > .horn {transform:  rotate(30deg);transform-origin: top left;}";
        document.body.appendChild(style);
    }
}

function hornkeyup(evt) {
    hornmouseover(evt);  // repeat mouseover so shift can be more dynamic
}


var srctranedit;
function trancontext(evt) {
    var src = evt.target;
    W.trancontextmenu.style.display = "";
    evt.preventDefault();
    W.trancontextmenu.style.left = evt.pageX + "px";
    W.trancontextmenu.style.top = evt.pageY + "px";
    var p = src.parentNode;  // group of tran name and value
    var pp = p.parentNode; // group of all tran
    var pos = Array.prototype.slice.call(pp.childNodes).indexOf(p);  // which tran
    var hornname = src.id.split('_').reverse().slice(2).reverse().join('_'); // remove _nnn_tranname

    srctranedit = {src: src, hornname: hornname, pos: pos};

    //trancontextmenu.left =
}

function swaptran(list, pos, delta) {
    if (pos + delta < 0 || pos.delta >= list.length) return;
    var t = list[pos];
    list[pos] = list[pos+delta];
    list[pos+delta] = t;
}
function trannamekeydown(evt) {
    var id = evt.target.id.split("_");

    //var p1 = evt.path[1], p2 = evt.path[2];
    //var pos = [].indexOf.call(p2.children,p1);
    //if (pos === -1) { serious("??? pos in trannamekeydown"); return; }

    srctranedit = {hornname: id[0], pos: id[1]*1};

    var ff = keyname(evt.keyCode);
    var todo = false;
    switch (ff) {
       case "up arrow": newops("move up"); break;
       case "down arrow": newops("move down"); break;
       default: todo = true;
   }
    if (!todo) return killev(evt);
    return true;

}

/** insert a new op in transform list from context menu
 * srctranedit will pass down details
 * */
function newop(evt) {
    cancelcontext();
    var op = evt.target.textContent;
    newops(op);
}

/** insert a new op in transform list, op gives op
 * */
function newops(op) {
    if (op === "cancel") return;
    var genes = currentGenes;
    var hornname = srctranedit.hornname;
    var pos = srctranedit.pos;

    var nhs = getHornSet(genes.tranrule);
    nhs = cloneHornset(genes);
    var thorn = nhs.horns[hornname];
    if (!thorn) { msgfix("incorrect horn element selected", '?'); return; }
    switch(op) {
        case "WRONG?delete":
            thorn.trans.splice(pos,1);
            break;
        case "toggle":
            var tr = thorn.trans[pos];
            if (tr.name[0] === 'x')
                tr.name = tr.name.substring(1);
            else
                tr.name = 'x' + tr.name;
            break;
        case "delete":
            thorn.trans.splice(pos+1,0, new HornWrap.Tran(op, []));
            break;
        case "move up":
            swaptran(thorn.trans, pos, -1);
            break;
        case "move down":
            swaptran(thorn.trans, pos, 1);
            break;
        case 'sub':
            var sh = horn(thorn.name + "_S", nhs).ribs(10).radius(20).stack(200);
            thorn.sub(thorn.name + "_S");
            break;
        default:
            thorn.trans.splice(pos+1, 0 , new HornWrap.Tran(op, []));
            //serious("unexpected op to norn newop: " + op);
    }

    nhs.uniforms = "";  // ??? TODO clean up pre-compile uniforms
    nhs._compilehs();
    var res = genesub(nhs._genecode, currentGenes);
    setHornSet(res, nhs)
    currentGenes.tranrule = res;
    target.tranrule = res;
    setGUITranrule();
}

var menu = "";
menu += '<p onclick="hornop(event)">delete</p>';
menu += '<p onclick="hornop(event)">sub</p>';
menu += '<p onclick="hornop(event)">cage</p>';
menu += '<p onclick="hornop(event)">head</p>';
menu += '<p onclick="hornop(event)">tail</p>';
W.horncontextmenu.innerHTML = menu;

// context on the legend of a horn html
function horncontext(evt) {
    var src = evt.target;
    W.horncontextmenu.style.display = "";
    evt.preventDefault();
    W.horncontextmenu.style.left = evt.pageX + "px";
    W.horncontextmenu.style.top = evt.pageY + "px";
    var hornname = src.textContent;
    W.srctranedit = {src: src, hornname: hornname};
}

function hornop(evt) {
    cancelcontext();
    var op = evt.target.textContent;
    if (op === "cancel") return;
    var genes = currentGenes;
    var hornname = srctranedit.hornname;

    var nhs = getHornSet(genes.tranrule);
    nhs = nhs.clone();
    var thorn = nhs.horns[hornname];
    if (!thorn) { msgfix("incorrect horn element selected", '?'); return; }

    if (op === "delete") {
        // thorn.name = "^" + thorn.name;  // this will prevent its use so be eliminated on compile
        delete nhs.horns[hornname];
    } else {
        var nname = hornname + "_" + op;
        if (getHornSet(nname)) {
            for (let n=0; true; n++) {
                nname = hornname + "_" + op + n;
                if (!getHornSet(nname + n)) break;
            }
        }
        var newh = new HornWrap.Horn(nname, nhs);
        newh.radius(20).ribs(20).rref("0").stack(1000);
        if (op === "tail")
            thorn._tail.push(nname);
        else if (op === "head")
            thorn._head.push(nname);
        else
            thorn._sub.push({subname: nname, cage: op === "cage"});
    }

    nhs._compilehs();
    var res = genesub(nhs._genecode, currentGenes);
    setHornSet(res, nhs)
    currentGenes.tranrule = res;
    target.tranrule = res;
    setGUITranrule();
}

function cancelcontext() {
    W.horncontextmenu.style.display = "none";
    W.trancontextmenu.style.display = "none";
}

// these become global to make sure of catching keyup
document.addEventListener("mousemove", trmousemove);
document.addEventListener("mouseup", trmouseup);
document.addEventListener("contextmenu", trcontextmenu);


var maxgloss = 1;
var maxshine = 30;
var glosspow = 2;   // force gloss to lower values
var vpow = 1/2;     // force v to higher values

/** special animation for recurseMutualPair2 */
function ppreframe() {
    if (!currentGenes.P_ribs) return;
    var scurve = function(x) { return (3-2*x)*x*x; };
    var t = 120*1000;  // overall time cycle
    var swt = 3*1000; // swap time
    var k = (frametime % t * 2) / t;
    var sw = 2*swt/t;
    if (k < sw) currentGenes.P_ribs = 1 + scurve(k/sw);
    else if (k < 1) currentGenes.P_ribs = 2;
    else if (k < 1 + sw) currentGenes.P_ribs = 2 - scurve((k-1)/sw);
    else currentGenes.P_ribs = 1.0000001;
    scalehalflife = 1500;
}
Maestro.on("preframe", ppreframe);



function colourTailor(hornid) { // return;
    var p = hornid;
    // COLOUR TAILORING CODE, TO MOVE <<<< TODO
    //uniforms.bumpstrength_A.value = Math.min(uniforms.bumpstrength_A.value, mbs);
    if (COL.num.shininess1) { // may be missing, eg for simplemode}
        COL.setG("shininess1", p, Math.min(COL.get("shininess1", p), maxshine));
        COL.setG("shininess2", p, Math.min(COL.get("shininess2", p), maxshine));
        COL.setG("shininess3", p, Math.min(COL.get("shininess3", p), maxshine));
        COL.setG("gloss1", p, Math.min(COL.get("gloss1", p), maxgloss));
        COL.setG("gloss2", p, Math.min(COL.get("gloss2", p), maxgloss));
        COL.setG("gloss3", p, Math.min(COL.get("gloss3", p), maxgloss));
        upow("gloss1", p, glosspow);
        upow("gloss2", p, glosspow);
        upow("gloss3", p, glosspow);
        // msgfix('specrat' + p, COL.get('subband1', p) * COL.get('shininess1', p),COL.get('subband2', p) * COL.get('shininess2', p),COL.get('subband3', p) * COL.get('shininess3', p));
        //
        // code for adjusting speck moved to lights.fs
    }

    // perform highlighting
    if (hornid !== WALLID && currentHset.hornrun[p].horn.name === hornhighlight) {
        var ccc = (frametime/1000 % 1 > 0.5) ? 'red' : 'green';
        for (let b = 1; b <= 3; b++) COL.setG(ccc + b, p, 5);
    }

    // tailor for fluorescence
    if (inputs.FLUORESC) {
        // pulsing width experiment
        //var qq = (frametime/370 % 31.4159);
        //COL.setG("fluwidth", p, Math.sin(qq));
        //upow("fluwidth", p, 3);
        //COL.setG("fluwidth", p, 1);
        //COL.get("fluwidth", p) *= 0.05;
        //
        // frametime in msec
        // G.time in secs
        var usetime = FIRST(currentGenes.time, frametime/1000)*1000; // genes.time set in setObjUniforms
        //if (genes === currentGenes) log("usertime", usetime, genes.time, frametime);
        //msgfix("_timeh", currentGenes.time);

        // rotating hue experiment (also uses )
        var qq = (usetime/70 % 31.4159);
        var h = (usetime/35000) % 1;
        //h += COL.get("hornid", p) * 0.17; // optional different hue for different horns
        COL.setG("fluorescH1", p, h);
        COL.setG("fluorescH2", p, h);
        COL.setG("fluorescH3", p, h);

        // force full v for n
        var v = COL.get("fluorescV2", p);
        v = 1; let s = 1;
        COL.setG("fluorescV1", p, v);
        COL.setG("fluorescV2", p, v);
        COL.setG("fluorescV3", p, v);
        COL.setG("fluorescS1", p, s);
        COL.setG("fluorescS2", p, s);
        COL.setG("fluorescS3", p, s);

        // enable to debug fluorescent band hue
        //COL.setG("iridescence1", p, 0);
        //COL.setG("iridescence2", p, 0);
        //COL.setG("iridescence3", p, 0);

        let qqq = (frametime/27770 % 31.4159);
    // width now controlled per band, and texscale compensation in shader
        //COL.setG("fluwidth", p, 0.5; // + (1+Math.sin(qq)));
        //COL.get("fluwidth_A.value[p] /= uniforms.texscale", p);
        currentGenes.flurange = 0;
    } else {
    }


    // tailor for hsv
    //COL.setG("hsvprop", p, 1);
    /**
    if  (COL.get("hsvprop", p) > 0.5) {
        upow(uniforms.blue1, p, vpow);
        upow(uniforms.blue2, p, vpow);
        upow(uniforms.blue3, p, vpow);
    }
    **/

    if (gValueForTexscale)
        COL.setG("texscale", p, COL.get(gValueForTexscale, p));  // to save bump texture

}

/** raise a uniform value to a power */
function upow(u, p, pow) {
        COL.setG(u, p, Math.pow(COL.get(u, p), pow));
}

/** performance debug helper */
function showres() {
    log(currentHset.hornrun.map(function(x) { return x.horn.name + ' ' + x.res + '/' + x.num;}));
}

function debugSimpleSkel(s = 5, e = 0, b = 0) {
    changeMat(`horn('main').ribs(20).scale('2').radius(50).stack('600').bend(0);
V.skip = true;
`, true);
    //baseShaderChanged();
    G.main_bend = b;
    G.main_radius = 50;
    G.ribdepth = 0;
    G.main_ribs = 1;
    G.bumpstrength=0;
    G.stardepth=0;
    G.starnum=4;
    G.band1=0; G.band2=999; G.band3=0; G.bandbetween = 0;
    setAllLots('irid', 0);
    setAllLots('flu', 0);
    setAllLots('refl', 0);
    checkvr();

    //setInput(NOSCALE, true); setInput(W.NOCENTRE, true);
    //setInput(GPUSCALE, false);  // so we can see scale values even if we don't use them
    setInput(W.doAutorot, false);

    resoverride.skelnum = s;
    resoverride.skelends = e;
    bigsceneSet={};
    minimizeSkelbuffer();
    centrescalenow();
    onpostframe( ()=>log(framenum, format(readWebGlFloat(skelbuffer)[1], 2)), 1);
    newmain(); // for (let i=0; i<1000; i+=100) setTimeout(newmain, i);
}
HornWrapFUN.cubeEarly = 1;  // default, where best to set it?

/** set the gene values from the tranrule */
function setGenesFromTranrule(tranrule = currentGenes.tranrule, trankey) {
    let msgl = [];

    try {
        if (!trankey) trankey = trancodeForTranrule(tranrule).trankey;
        const parts = trankey.split('#');
        const names = [];
        const vals = [];


        if (!tranrule.startsWith(parts[0]))
            throwe('tranrule does not match');
        tranrule = tranrule.substr(parts[0].length);

        // first pass parses and checks all ok, collecting info, error and no setting done if anything wrong
        for (let i = 1; i < parts.length; i += 2) {
            const pre = tranrule.pre(parts[i+1]);
            tranrule = tranrule.post(parts[i+1]);
            if (tranrule === undefined) throwe('tranrule does not match');
            names.push(parts[i]);
            vals.push(pre);
        }

        // second pass sets values where possible, error by gene, others are still set ok
        for (let i = 0; i < names.length; i++) {
            const pre = vals[i];
            let val;
            if (!isNaN(pre)) {
                val = +pre;
            } else {
                val = +evalIfPoss(pre);
                if (isNaN(val)) {
                    msgl.push(names[i] + '?=' + pre);
                    continue;
                }
            }
            currentGenes[names[i]] = val;
        }
    } catch(e) {
        msgl.push('invalid tranrule', e);
    }
    msgfix('tranrule gene errors', msgl.length ? msgl.join(', ') : undefined);
}



var xuniforms = {};
/** capture uniforms used to help decide how to merge passes for different objects */
function captureUniforms(hornid) {
    // return;  // uncomment this when if you really need to do uniform checking
    let hornname = currentHset && currentHset.hornrun[hornid] ? currentHset.hornrun[hornid].horn.name : undefined;
    if (!hornname) return;
    if (!xuniforms[hornid]) xuniforms[hornid] = {};
    for (let ns in uniforms) {
        const n = ns; //  as Xstring;
        if (!currentHset.addedUniforms[n] && currentHset.geneDefaults[n] === undefined) {
            // log("uniform in uniforms but not in currentHset.addedUniforms", n);
            continue;
        }
        if (n.endsWith('active') || n.endsWith('rpbase') || n.endsWith('parnumsa') || n.endsWith('parnumsb') || n.endsWith('para') || n.endsWith('parb') || n.endsWith('reflx')) {
            let v = clone(uniforms[n].value);
            //if (xuniforms[hornid][n] !== v) {
            //    // if (uniforms[n].type !== 't' && n !== 'parnumsa' && n !== 'parnumsb') log("xuniforms", hornname, hornid, n, uniforms[n].type, xuniforms[hornid][n], '->', v, opmode);
            xuniforms[hornid][n] = v;
            //}
        }
    }
}

/** code that replaces the per horn type uniforms with internal variable for all horn types simultaneously
 * SINGLEMULTI
return [full switching code, hornid switching code]
 */
function codeForUniforms(hset) {
    hset = hset || currentHset;
    // make sure current uniforms registered
    const saveopmode = opmode;
    opmode = "postcompile";
    xuniforms = {};
    hset.renderHornobj(currentGenes, uniforms, 'norenddrtarget', 'noscene');

    let s = [];  // to generate full singlemulti split code
    let sids = []; // to generate hornid  singlemulti split code
    let base = {}; // first entry, to common up where possible

    // set up with first horn as 'base', others will modify this as needed
    let xu3 = xuniforms[3];
    for (let n in xu3) {
        let v = xu3[n];
        let vv;
        if (typeof v === 'number') {
            vv = f(v);
            s.push(n + ' = ' + vv + ";");
        } else if (typeof v === 'string') {
            s.push(n + ' = ' + v + ";");
        } else {
            vv = "vec4(" + v.x + "," + v.y + "," + v.z + "," + v.w + ")"
            s.push(n + " = " + vv + ";");
        }
        base[n] = vv;
    }


    s.push("\n\nif (false) {");
    sids.push("\n\nif (false) {");
    for (let h = 3; h < 64; h++) {
        let xu = xuniforms[h];
        if (!xu) continue;
        let hornname = hset.hornrun[h].horn.name;
        s.push("} else if (vv < cumcount" + h + ") {                   " + "//~~~~~~~~~~ " + hornname);
        sids.push("} else if (vv < cumcount" + h + ") {                   " + "//~~~~~~~~~~ " + hornname);
        if (h > 3) s.push("vv -= cumcount" + (h - 1) + ';');
        s.push(hset.code[h]);
        for (let n in xu) {
            let v = xu[n];
            let pre = '';
            let vv;
            if (typeof v === 'number') {
                vv = f(v);
                // s.push(n + ' = ' + vv + ";");
            } else if (typeof v === 'string') {
                vv = v;
                // s.push(n + ' = ' + vv + ";");
            } else {
                vv = "vec4(" + v.x + "," + v.y + "," + v.z + "," + v.w + ")"
                pre = '//';     // we use these for recording what hight change but actaully set them symbolically
            }
            if (vv !== base[n])
                s.push(pre + '  ' + n + " = " + vv + ";");
        }

        s.push(' colourid = ' + h + '.;');
        s.push(' xhornid = ' + h + '.;');
        sids.push(' xhornid = ' + (h) + '.;');
        s.push(' radius = ' + hornname + '_radius;');
        s.push(' ribs = ' + hornname + '_ribs;\n\n\n');
        sids.push(' ribs = ' + hornname + '_ribs;\n\n\n');
    }
    s.push('} else {\n');
    sids.push('} else { xhornid = -1.; ribs = 77.; }\n');
    s.push(' radius = max(0.2, vv - 20.) * fract(time*0.25);\n');   // <<< this case should never happen
    s.push('}\n');
    s.push('ka = parnumsa; kb = parnumsb;');
    opmode = saveopmode;
    return [s.join('\n'), sids.join('\n')];
    function f(n) {
        return n + (n % 1 === 0 ? '.' : '');
    }
}

/** show uniforms that differ between different */
function checkUniforms() {
    let h = 3; // 'Qfirst';
    for (let n in xuniforms[h]) {  // all the uniforms we are capturing
        for (let p in xuniforms) {
            if (xuniforms[h][n] !== xuniforms[p][n])
                log('uniform diff', n, h, p, xuniforms[h][n], xuniforms[p][n]);
        }
    }
}

/** clean up lots of caches, unused genes etc */
function cleanall() {
    let cleaned = cleangenesall();
    for (let i in cleaned) delete uniforms[i];
    let gggg = clone(currentGenes);
    material = {};
    setHornSet();
    //setHornSet(currentGenes.tranrule, currentHset)
    currentHset = undefined;
    xuniforms = {};
    animatee();
    target = {};
    copyFrom(currentGenes, gggg);
    newmain();
}

function hornstats(hs = currentHset) {
    return hs.hornrun.filter(h=>h).map(h=>({name: h.horn.name, num: h.num}))
}

/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var writetextremote, yaml, S, readTextureAsVec4; // not needed by main readWebGLFloat
// save current skeleton
async function saveSkeleton(fid = 'test.skel') {
    if (uniforms.skelnum.value > 31 || !resoverride.skelends) {
        resoverride.skelnum = 7;
        resoverride.skelends = 0;
        minimizeSkelbuffer();
        await S.frame(2);
    }

    const cumcount = {};
    for (let i = 0; i < 30 ; i++) {
        const c = uniforms['cumcount' + i];
        if (c) cumcount[i] = c.value;
    }

    const hornnum = currentHset.horncount, skelnum = uniforms.skelnum.value;
    const data = readTextureAsVec4(skelbuffer, {width: skelnum+1, height: hornnum});
    const skel = {hornnum, skelnum, cumcount, data}
    if (fid) writetextremote(fid, yaml.safeDump(skel));
    return skel;
}


// test readback, read back over cycle of n*8 frames
function readtest(n=1, opts, buffer = skelbuffer) {
    const x = framenum /n;
    if (x%1) return;
    switch (x%8) {
        case 0: opts.mask = 'x'; readWebGlFloat.prep(buffer, opts, 'test'); break;
        case 1: opts.mask = 'x'; readtest.vvx = readWebGlFloat.finish('test').slice(0,4); break;
        case 2: opts.mask = 'y'; readWebGlFloat.prep(buffer, opts, 'test'); break;
        case 3: opts.mask = 'y'; readtest.vvy = readWebGlFloat.finish('test').slice(0,4); break;
        case 4: opts.mask = 'z'; readWebGlFloat.prep(buffer, opts, 'test'); break;
        case 5: opts.mask = 'z'; readtest.vvz = readWebGlFloat.finish('test').slice(0,4); break;
        case 6: opts.mask = 'w'; readWebGlFloat.prep(buffer, opts, 'test'); break;
        case 7: opts.mask = 'w'; readtest.vvw = readWebGlFloat.finish('test').slice(0,4); break;
    }
}
readtest.vvx = []; readtest.vvy = []; readtest.vvz = [];

// Maestro.remove('preframe', iii); iii = everyframe(() => readtest(1, {width:4, height:40, left: 10, top:100}))


/*********** horn query notes/examples
 *

//interface
hp.getPosition();  hp.getRadius(); hp.getMatrix(); hp.parent(n=1);
hp.getList(); hp.advance(); hp.advanceMe()
hornSet.makePath(list=[])

//example
let hornSet = currentHSet;
let hps = [hornSet.makePath()];
//let cp = 0;
onUpdate(() => {
  hps = hps.reduce( (nhps,hp) => nhps.concat(hp.advance(fun(hp, 0.01)), []) )


  //cp += 0.01
  //let p = hornSet.getPosition({Qfirst:0.44, Qsub: 0.89})
  //let pps = hornSet.getCumPositions(cp);
  //let pps = hornSet.getCumIds(cp);
})

//
hp.advance modifies hp to be advanced on 'same' horn
hp.advance calls ended() on hp if it isn't in result list (passsed of end of horn, or horn became invalid)

*/
