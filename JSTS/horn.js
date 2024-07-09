import { THREE } from './tomodule.js'; // '.js' needed because of typescript rules we don't understand
// TODO May 2019 or so, bake these values in
// limit added 7 Mar 2021, just do not render horns above this limit
// var MAXHORNS_TO_RENDER = 4000;
// addgene('MAXHORNS_TO_RENDER', 4000, 500, 16000, 100, 100, 'maximum number of horns to render', 'geom',0);
// limit to the number of horntypes we can generate with structure mutation
var HORNSTYPES = 25;
var MAXPATHS = 28;
// max ribs for any one horn object
// ??? there is a limit somewhere else ... try to track it down
// ??? so if this limit is set > 400 bits go missing anyway
var MAXRIBS = 2000; // to limit toal number of ribs, especially with recursion
addgene("maxInstanceCount", Infinity, 0, 2000, 1, 1, "max instance count", "system", "frozen");
addgene("instanceOffset", 0, 0, 2000, 1, 1, "instance offset for reduced render", "system", "frozen");
COL.bounds = undefined;
COL.boundchange = function () {
    COL.bounds = [];
    for (let i = 1; i < 20; i++) {
        const f = window['BOUNDK' + i];
        if (!f)
            break;
        const k = f.value.trim();
        if (!k)
            continue;
        const max = window['BOUNDMAX' + i].value;
        const r = window['BOUNDV' + i].value;
        COL.bounds.push([new RegExp(k), 0, max * r / 100]);
    }
};
/** set all values in COL from genes, for range of colourids
 * optionally bound some values using bounds
 */
COL.genes2col = function (genes, low = 0, high = undefined, bounds = COL.bounds) {
    const hset = getHornSet(genes);
    if (!hset)
        return;
    const gns = hset.colgenenames;
    if (!gns)
        return; // temporary till we work out how to colour extra horn sets
    if (high === undefined)
        high = hset.hornrun.length - 1;
    const ulow = low * COL.PARMS, uhigh = (high + 1) * COL.PARMS;
    if (bounds)
        for (const p of bounds)
            if (p[2] === undefined)
                p[2] = p[1];
    for (let i = ulow; i < uhigh; i++) {
        const gn = gns[i];
        if (gn) {
            let v = genes[gn];
            if (bounds) {
                for (const p of bounds) {
                    if (gn.match(p[0])) {
                        if (p[1] > v)
                            v = p[1];
                        if (p[2] < v)
                            v = p[2];
                    }
                }
            }
            COL.array[i] = v;
        }
    }
    COL.send(true);
};
/** from COL array into genes */
COL.col2genes = function (genes = currentGenes || xxxgenes()) {
    const hset = getHornSet(genes);
    const gns = hset.colgenenames;
    if (!gns)
        return;
    const l = hset.hornrun.length * COL.PARMS;
    for (let i = 0; i < l; i++) {
        //PJT: hit an exception here with undefined gns (in Electron, while running tad-sa.oao I think);
        //accidentally committed r7490 with message 'colgenenames' while searching for related code...
        // also hit in new edge.  fixed (?) with !gtns test above
        if (gns[i])
            genes[gns[i]] = COL.array[i];
    }
    COL.send(true);
    newmain();
};
/** set all base colours from the genes */
COL.set0 = function (genes = currentGenes) {
    const hset = getHornSet(genes);
    for (let gn in COL.num)
        COL.setG(gn, -1, genes[gn], undefined, hset);
    COL.send();
};
/** (unused) code to copy gene values into COL mechanism */
COL.copygenes = function copygenes(genes) {
    genes = genes || currentGenes;
    for (let i in COL.num) {
        let vv = {};
        let v = genes[i];
        if (v !== undefined) {
            vv[i] = v;
            COL.setx(vv);
        }
    }
};
/** set a value for a single slot for one colid or for all nonwall colids, allow for genes, WALLID, etc */
COL.setG = function colsetG(name, num, val, gn, hset) {
    if (!COL.uniforms)
        COL.uniforms = uniforms;
    if (!hset) {
        if (appToUse === 'Horn')
            hset = getHornSet(currentGenes); //  || current Hset;
        else
            hset = { colgenenames: {} };
    }
    COL.needsUpdate = true;
    const id = COL.addname(name);
    if (id < 0)
        return; // message already issued
    if (num === -1) {
        const high = COL.NUM; // hset.hornrun.length; // not all COL.NUM
        for (let n = 0; n < high; n++) {
            if (n !== WALLID) {
                const k = (id + n * COL.PARMS);
                COL.array[k] = val;
                if (gn)
                    hset.colgenenames[k] = gn;
            }
        }
    }
    else {
        const k = (id + num * COL.PARMS);
        COL.array[k] = val;
        if (gn)
            hset.colgenenames[k] = gn;
    }
};
/** set consecutive slots (typically rgb) from array or colour */
COL.setarr = function colset(name, num, val) {
    if (val.r !== undefined)
        val = [val.r, val.g, val.b];
    // set sequential values from array
    function setarr(k) {
        for (let i = 0; i < val.length; i++) {
            COL.array[k + i] = val[i];
        }
    }
    COL.needsUpdate = true;
    const id = COL.addname(name);
    if (id < 0)
        return; // message already issued
    if (num === -1) {
        for (let n = 0; n < COL.NUM; n++)
            if (n !== WALLID) {
                const k = (id + n * COL.PARMS);
                setarr(k);
            }
    }
    else {
        const k = (id + num * COL.PARMS);
        setarr(k);
    }
};
/** set wall colours in COL array from horn definitions/genes */
export function setWallColours(genes) {
    for (let gn in COL.num) {
        const wgn = 'wall_' + gn;
        if (!(wgn in genes) && wgn in genedefs)
            genes[wgn] = genedefs[wgn].def;
        COL.set(gn, WALLID, genes[wgn]);
    }
    COL.send();
}
/** set colours in COL array from horn definitions/genes */
export function setHornColours(genes) {
    // if (!HornSet.useColGenes) return;  // no, too extreme
    if (tad && genes.tranrule.startsWith('//tadpoleTranrule')) {
        setWallColours(genes);
        return tad.useCOL(); //
    }
    const hset = getHornSet(genes);
    if (COL.ignoreHornColours === 'usewall') {
        COL.genes2col(genes, 2, 2);
    }
    ; // set just wall colours
    if (COL.ignoreHornColours && hset.colgenenames)
        return;
    // this will move elsewhere ....
    if (hset.colgenenames) {
        if (!renderVR.eye2) {
            COL.genes2col(genes);
            for (let hornid = 2; hornid < hset.hornrun.length; hornid++)
                colourTailor(hornid, genes); // just for special effects such as fluorescent bands and subband controls
        }
    }
    else { // establish mapping for the current horn
        hset.colgenenames = [];
        COL.setx(COL.defaultDef, WALLID); // set up walls in case genes[wgn] never makes it
        COL.setx('white', WALLID); // set up walls in case genes[wgn] never makes it
        for (let gn in COL.num) {
            if (!(gn in genes))
                genes[gn] = genedefs[gn].def;
            COL.setG(gn, -1, genes[gn], gn, hset);
            const wgn = 'wall_' + gn;
            if (!(wgn in genes) && wgn in genedefs)
                genes[wgn] = genedefs[wgn].def;
            if (!genes[wgn])
                genes[wgn] = COL.get(gn, WALLID);
            COL.setG(gn, WALLID, genes[wgn], wgn, hset);
        }
        // set up colours for hornruns
        for (let hornid = 3; hornid < hset.hornrun.length; hornid++) {
            const hrun = hset.hornrun[hornid];
            if (!hrun)
                continue;
            hrun.horn._colset(genes, uniforms, hrun.medepth, hornid);
        }
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

Example: m is mainhorn, t its tail, tt the tail of t, and s the sub of m.  (??? used to say s is the sub of t)
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
getHornSet(current Genes).toString() -> returns it redisplayed, but almost exactly the same numbers etc
genecode(genes) -> returns it showing the genes
DEAD ... valuecode(genes) -> returns it showing the current values

Some horn code is automatically generated to simplify adding horn functions.
so user horn.stack() is generated automatically from existence of internal horn.$stack()
Autogenerated user .stack() calls _addtrlow which assembles the horn structure.
This allows quick horn structure assembly to check basic syntax.
Horn compilation will call norn.$stack(), which calls horn.processTran() to do the bulk of compilation.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Compilation and run sequence
Compilation is in two steps, with one run step.
The dual step compilation steps derives from the historic code (pre inputs.SINGLEMULTI) when compile step 2 was the actual render step.
Currently (10 March 2021) the SINGLEMULTI = false route is broken.

    hornTrancodeForTrarule -> setuphorn -> _compilhs -> _compileh1 -> _compileh1/uselist/...
                                                     -> codeForUniforms -> renderHornobj -> _compileh2a/_rendersubs/_renderme
                                                     -> codeForUniforms -> renderHornobj -> rendersinglemulti

Some information is prepared in step 1 and saved in uniforms;
which are converted to xuniforms (indexed by horn paths) in step 2. (_compileh2a -> captureUniforms)
captureUniforms: it would be cleaner to generate xuniforms directly.

Step 2 also prepares hornrun (indexed by horn paths)

??? Step 1 allows for different paths, but does not correctly ??? allow for dual paths due to ribcage.
??? cage wrong where an object has a sub and a cage subset, both get to be cage???
??? colour sometimes wrong when we have fractal
??? number of ribs for ribbing effect sometimes wrong when we have fractal


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
// awkward temp way to globalize functions in Horn Wrap
//!!const HW.multiInstances;
//!!const trmousedown, trmouseup, trcontextmenu, trmousemove, trkeydown, trkeyup, trwheel, trfocus, trblur, alignskel,
//!!    captureUniforms, cancelcontext, updateHTMLRules, setGenesFromTranrule, colourTailor, horncontext, hornop, trancontext, newop, newops, planeg;
//!!function HornWrapFUN() {
"use strict";
/* for standalone debug */
// if (!adduniformX) adduniformX = function() { console.log("adduniformx"); };
// if (!addgene) addgene= function() { console.log("addgene"); };
// if (!currentGenes) currentGenes = {};
// key   !0<name>depth  !1<name2>depth
const KSEP = '  !';
const KLEFT = '<';
const KRIGHT = '>';
var u; // = undefined;      // convenient shorthand
var INACTIVE = 9999.0;
var forcerref = false; // force any object with rref 0 to rref=ribs
var subrepeat = 1; // for html display, number of instanaces of subhorns shown
var logdepth = 0;
WA.dohornlog = nop; // log;
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
//mmm += 'ondrag="trmousemove(event)"; ';
mmm += '>';
/** This is general way to make a string version of a simple basic type or object.
 * Primarily for OptType objects, including Object ones that never got properly made into OptStruts
 * Quite like JSON.stringify, but much simplified and with fewer "" round field names (even when they should be there!)
 */
export function toJava(o) {
    if (typeof o === 'string')
        return "'" + o.replace(/'/g, "\\'") + "'";
    if (typeof o === 'number')
        return o.toString();
    const r = [];
    for (const x in o)
        if (o[x] !== undefined)
            r.push(x + ': ' + toJava(o[x]));
    return '{' + r.join(', ') + '}';
}
WA.toJava = toJava; // debug
/** OptStruct class is really for (some concept of) type clarity.
 * In many cases we will just have a Javascript object with appropriate fields,
 * but which will NOT answer to 'o instanceof OptStruct'
 * and will not be able to use the OptStruct .toString() method.
 */
export class OptStruct {
    constructor(o = {}) {
        for (const x in o)
            this[x] = o[x];
    }
    // probably not used, except maybe in debug
    toString() {
        let r = [];
        for (const x of 'k,start,end,v,horn,rand,randp,randb,randc,randx'.split(','))
            if (this[x] !== undefined)
                r.push(x + ': ' + toJava(this[x]));
        return '{' + r.join(', ') + '}';
    }
}
// this.Tran = function(name, opts) {
class Tran {
    constructor(name, opts) {
        this.name = name;
        this.opts = opts;
    }
    html(genes, hset, name, i) {
        const dd = this.name[0] === "x" ? " disabled" : "";
        let g = this._genecode;
        if (!g)
            g = [];
        let h = '<span class="tran' + dd + '">';
        const id = name + "_" + i + "_tranname";
        h += '<button class="tranname" id="' + id + '"oncontextmenu="trancontext(event);" onkeydown="trannamekeydown(event);">' + this.name + '</button>';
        h += '<span class="tranparms">';
        for (let ii = 0; ii < g.length; ii++) {
            let gg = g[ii].toString();
            if (gg === '{}') {
                if (ii === g.length - 1)
                    break;
                gg = '--';
            }
            const gn = gg.split("#")[1];
            const v = format(genesub(gg, genes));
            // const sv = (v + "").substring(0,20);
            const sv = format(v);
            // str is formatted value, basic if can't find gene properly
            h += '<span class="tranparm">';
            let str = sv;
            if (gn) {
                let help = '<span class="help">' + genedefs[gn].help + "<br>" + gn + '</span>';
                const classs = genedefs[gn].free ? 'class="gval"' : 'class="gval frozen"';
                const post = gg.post('#');
                if (post) {
                    const pre = gg.pre('#');
                    str = `${pre}: <span ${classs} contenteditable="true" id="TR_${gn}${mmm}${xxxgenes()[gn]}</span>`;
                }
                else {
                    const struc = Function('return ' + v)();
                    if (typeof struc.k === "number") {
                        str = '<span class="tranbracket">{k:';
                        str += '<span ' + classs + ' contenteditable="true" id="TR_' + gn + mmm + format(struc.k) + '</span>';
                        str += help;
                        help = "";
                        str += '}</span>';
                    }
                }
                str += help;
            }
            h += str;
            h += '</span>';
        }
        h += '</span>'; // tranparms
        h += '</span>'; // tran
        return h;
    }
    ;
    toString() {
        // return `${this.name}(${this.opts.map(o => o.toString()).join(', ')})`;
        return `${this.name}(${this.opts.map(o => toJava(o)).join(', ')})`;
    }
}
; // end Tran
// var TR = this.Tran.prototype;
/** define a new Horn object */
// this.Horn = function(name, hset) {
export class Horn {
    constructor(name, hset) {
        this.trans = [];
        this._sub = [];
        this._tail = [];
        this._head = [];
        this._ribs = 10;
        this._ribdepth = 1;
        this._rref = undefined;
        this._cols = [];
        this._usescale = true;
        this._genenames = {};
        this.name = name;
        this.rp = this.gn('rp');
        if (hset)
            hset.horns[name] = this;
        this.hset = hset;
        // this._usescale = true;
    }
    /** return gene name in standard format, allowing for possible recursion */
    gn(gn, lev) { return this.name + "_" + (lev ? lev + "_" : "") + gn; }
    ;
    /** define number of ribs on a horn,
     * also be used for number of subhorns if no number in sub(horn,number) given */
    ribs(r) {
        this._ribs = r;
        return this;
    }
    ;
    /** define relative depth of ribs for horn */
    ribdepth(r) {
        this._ribdepth = r;
        return this;
    }
    ;
    /** ask for this horn not to be used in autoscaling */
    noautoscale() { this._usescale = false; return this; }
    ;
    /** define reference number of ribs on a horn */
    rref(r) {
        //if (r === 0 || r === "0") r = undefined;
        this._rref = r;
        return this;
    }
    ;
    // reminder .. addgene(name, def, min, max, delta, step, help, tag, free, internal)
    /** internal, add a new transform for a horn, and add corresponding gene */
    _addgene(fun, def, min, max, delta, step, help, tag, free = 1, useuniform = true, genes) {
        // generate unique name for this horn
        let gn = this.gn(fun);
        while (this._genenames[gn])
            gn += "X";
        this._genenames[gn] = true;
        // and add as hset gene
        this.hset._addgeneHS(gn, def, min, max, delta, step, help, tag, free, useuniform, genes);
        return gn;
    }
    ;
    /** return true if gn matches smap */
    _matchSpringmap(gn) {
        if (gn.indexOf("ribs") !== -1)
            return false;
        if (gn.indexOf("radius") !== -1)
            return false;
        const smap = this.hset._springMap;
        if (!smap)
            return false;
        if (smap === true)
            return true;
        for (let i = 0; i < smap.length; i++) {
            if (gn.indexOf(smap[i]) !== -1)
                return true;
        }
        return false;
    }
    ;
    /** return true unless springmap starts with a "onespring" option (more efficient and to test for performance) */
    _springmap2() {
        return this.hset._springMap[0] !== "onespring";
    }
    ;
    /** process an internal expression
    If a number, this will create a gene and return the expression for that gene
    If a string, this will return an expression for the string
    */
    _expr(fun, s, min, max, delta, step, help, tag = 'geom', free = 1, genes) {
        if (typeof s === "number") {
            const gn = this._addgene(fun, s, min, max, delta, step, help, tag, free === undefined ? "free" : free, undefined, genes);
            // _addgene will have set current Genes[gn] if necessary
            // current Genes[gn] = target[gn] = s;  // ??? should we respect old gene values if available ???
            if (this._matchSpringmap(gn)) {
                if (kinect.process)
                    genedefs[gn].free = 0;
                else {
                    genedefs[gn].free = 1;
                    //log("free ", gn);
                }
                //const gmap = this.gn(fun+"_map");
                //this._addgene(fun+"_map", 0, 0, 20, 1, 1, "particle to tie to this gene", "springmap", 0 );
                ////const xcode = "mvalt( (floor(" + gmap + ") + SUBP_rp*springl)*goff, SUBP_rp*histl, fract(" + gmap + ") ," + (min+0.0001) + "," + (max+0.0001) + ")";
                //const xcode = "kinxagg * mval( (floor(" + gmap + ") + SUBP_rp*springl)*goff, fract(" + gmap + ") ," + (min+0.0001) + "," + (max+0.0001) + ")";
                const gmap = this.gn(fun + "_map");
                this._addgene(fun + "_map", 0, 0, 2, 1, 1, "particle to tie to this gene", "springmap", 0, undefined, genes);
                const range = (max - min) / 2;
                let xcode;
                if (this._springmap2())
                    xcode = "kinxagg * mvalX2(" + gmap + "," + (range + 0.00001) + ", SMAP1, SMAP2)"; // gmap is 0.25, 0.5, 0.75, 1.25, 1.5, 1.75
                else
                    xcode = "kinxagg * mvalX1(" + gmap + "," + (range + 0.00001) + ", SMAP1)"; // gmap is 0.25, 0.5, 0.75
                const xgn = "/*" + gn + "*/"; // flag so _genecode gets simple value, not full xcode
                if (fun === "scale")
                    return xgn + "(" + gn + "*" + "exp2(" + xcode + "))";
                else
                    return xgn + "(" + gn + '+' + xcode + ")";
            }
            else {
                return gn;
            }
        }
        else if (typeof s === "string") {
            if (!isNaN(+s) && s.indexOf('.') === -1)
                s = s.trim() + "."; // turn "4" to "4."
            if (fun === "rref" && +s === 0)
                this.hset.setupcode += 'float ' + this.gn(fun) + "=" + this.gn("ribs") + ";\n";
            else if (fun === "rref" || fun === "ribs" || fun === "radius")
                this.hset.setupcode += 'float ' + this.gn(fun) + "=" + s + ";\n";
            return "(" + s + ")";
        }
        else {
            throwe("Unexpected expression '" + s + "' not type number/string but " + typeof s);
        }
    }
    ;
    /** convert _expr form to show form */
    _show(xp) {
        if (xp.substring(0, 1) === "(")
            return '"' + xp.substring(1, xp.length - 1) + '"'; // string
        if (xp.substring(0, 2) === "/*")
            xp = xp.substring(2).pre("*/");
        return "#" + xp + "#"; // gene
    }
    ;
    /** find for subhorn 0, to depth d */
    shorn(d) {
        if (d === undefined)
            d = 1;
        if (this._sub[0] === undefined)
            return undefined;
        const subh = this.hset.horns[this._sub[0].subname];
        if (!subh)
            return undefined;
        if (d === 1)
            return subh;
        return subh.shorn(d - 1);
    }
    ;
    /** find name for subhorn 0, to depth d */
    sname(d) {
        const h = this.shorn(d);
        return h ? h.name : "NOSUBFOR_" + this.name;
    }
    ;
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
    // processTran(code: string, tran: Tran, defs: OptType[][], opts: Dictionary<any>, genes: Genes) {
    processTran(code, tran, defs, opts, genes) {
        var _a;
        const userparms = tran.opts;
        for (const i in userparms)
            if (typeof userparms[i] === 'object')
                userparms[i] = new OptStruct(userparms[i]);
        if (opts === undefined)
            opts = {};
        const genecodel = [];
        let xp;
        for (let i = 0; i < defs.length; i++) { // merge specified arguments with default arguments
            const def = defs[i];
            const [fun, defvala, min, max, delta, step, help, tag, free, ptype] = def;
            let defval = defvala;
            if (typeof defval === 'object')
                def[1] = defval = new OptStruct(defval);
            let s = userparms[i];
            const explicit = s !== undefined;
            if (!explicit)
                s = defval;
            // toshow is used to decide if parameter should be included in  genecode
            // toshow = explicit shows almost exact input,
            // but fails when default genes are changed later
            // as the changed genes are not then displayed
            // decision must be made later.
            //toshow = JSON.stringify(s) === JSON.stringify(defval)
            const toshow = true;
            let mmmmr = new RegExp("MM" + i, 'g'); // replacement value with rp factored in
            let lllr = new RegExp("LL" + i, 'g'); // literal replacement value
            if ((typeof s === "number" || typeof s === "string") && ptype !== undefined) {
                const t = s;
                s = {};
                s[ptype] = t;
            }
            const repl = [], gc = [];
            const sq = s;
            // rr generates a 'confusion' multiplier so different uses of randf() give different answers for same main input
            const rr = (xx = '') => (1 + (0.27 * ((xp + xx).hashCode() * 123479 % 34583 / 34583))).toFixed(3);
            if (typeof s === "number" || typeof s === "string" || s.v !== undefined) {
                const ss = (_a = sq.v) !== null && _a !== void 0 ? _a : s; // why does this s.v give error, but above and below don't
                xp = this._expr(fun, ss, min, max, delta, step, help, tag, free, genes);
                if (opts.lowval === undefined) {
                    code = code.replace(lllr, ss);
                    repl.push("(" + xp + "*!RP)");
                }
                else {
                    repl.push("cubicmix(" + opts.lowval + "," + xp + ",!RP)");
                }
                if (toshow)
                    genecodel.push(this._show(xp));
            }
            if (typeof s === 'object') {
                if (sq.start !== undefined) {
                    const xps = this._expr(fun + "S", sq.start, min, max, delta, step, help, tag, free, genes);
                    const xpe = this._expr(fun + "E", sq.end, min, max, delta, step, help, tag, free, genes);
                    repl.push("cubicmix(" + xps + "," + xpe + ",!RP)");
                    if (toshow)
                        gc.push("start:" + this._show(xps) + ", end:" + this._show(xpe));
                }
                if (sq.k !== undefined) {
                    xp = this._expr(fun + "K", sq.k, min, max, delta, step, help, tag, free, genes);
                    repl.push(xp);
                    if (toshow)
                        gc.push("k:" + this._show(xp));
                }
                if (sq.rand !== undefined) {
                    xp = this._expr(fun + "_R", sq.rand, (min !== null && min !== void 0 ? min : 0) / 10, (max !== null && max !== void 0 ? max : 1) / 10, (delta !== null && delta !== void 0 ? delta : 0.1) / 10, (step !== null && step !== void 0 ? step : 0.1) / 10, help + ' random me based', tag, free, genes);
                    const xpp = `(randf(ribrp(rp,dribs),${rr()})*${xp})`;
                    repl.push(xpp);
                    if (toshow)
                        gc.push("rand:" + this._show(xp));
                }
                if (sq.randb !== undefined) {
                    xp = this._expr(fun + "_RB", sq.randb, (min !== null && min !== void 0 ? min : 0) / 10, (max !== null && max !== void 0 ? max : 1) / 10, (delta !== null && delta !== void 0 ? delta : 0.1) / 10, (step !== null && step !== void 0 ? step : 0.1) / 10, help + ' random me/parent based', tag, free, genes);
                    const xpp = `((randf(SUBP_rp - ribrp(rp,dribs),${rr()}))*${xp})`;
                    repl.push(xpp);
                    if (toshow)
                        gc.push("randb:" + this._show(xp));
                }
                if (sq.randp !== undefined) {
                    xp = this._expr(fun + "_RP", sq.randp, (min !== null && min !== void 0 ? min : 0) / 10, (max !== null && max !== void 0 ? max : 1) / 10, (delta !== null && delta !== void 0 ? delta : 0.1) / 10, (step !== null && step !== void 0 ? step : 0.1) / 10, help + ' random parent based', tag, free, genes);
                    const xpp = `(randf(SUBP_rp,${rr()})*${xp})`;
                    repl.push(xpp);
                    if (toshow)
                        gc.push("randp:" + this._show(xp));
                }
                if (sq.randc !== undefined) {
                    xp = this._expr(fun + "_RC", sq.randc, (min !== null && min !== void 0 ? min : 0) / 10, (max !== null && max !== void 0 ? max : 1) / 10, (delta !== null && delta !== void 0 ? delta : 0.1) / 10, (step !== null && step !== void 0 ? step : 0.1) / 10, help + ' random cumulative', tag, free, genes);
                    const xpp = `(randf(crp,${rr()})*${xp})`;
                    repl.push(xpp);
                    if (toshow)
                        gc.push("randc:" + this._show(xp));
                }
                if (sq.randx !== undefined) {
                    xp = this._expr(fun + "_RX", sq.randx, (min !== null && min !== void 0 ? min : 0) / 10, (max !== null && max !== void 0 ? max : 1) / 10, (delta !== null && delta !== void 0 ? delta : 0.1) / 10, (step !== null && step !== void 0 ? step : 0.1) / 10, help + ' random xyz', tag, free, genes);
                    const xpp = `(randf(x,${rr('x')})*${xp} + randf(y,${rr('y')})*${xp} + randf(z,${rr('z')})*${xp})`;
                    repl.push(xpp);
                    if (toshow)
                        gc.push("randx:" + this._show(xp));
                }
                // if (sq.vvv !== undefined) {
                //     xp = this._expr(fun + 'H' + s.horn, sq.v, min, max, delta, step, help, tag, free, genes);
                //     repl.push("(GG * " + sq.horn + "_rp)");
                //     if (toshow) genecodel.push("v:" + this._show(xp) + ", horn:'" + sq.horn + "'");
                // }
                genecodel.push('{' + gc.join(', ') + '}');
            }
            const repls = '((' + repl.join(')+(') + '))';
            code = code.replace(mmmmr, repls);
            if (code.includes('RIBS')) { // tran === 'branch' etc
                // current code (16 Dec 2023) does the sub calls firts even if later in tranrule.
                // To consider, interleave so sub(..., n1).branch(.1.)sub(...,n2).branch(.2.)
                // uses the n1 for branch1 and n2 for branch 2.
                // but we are unlikely? to want multiple brahces from same point so don't bother for now.
                const lastsub = this._sub.slice(-1)[0];
                let useribs, userref;
                if ((lastsub === null || lastsub === void 0 ? void 0 : lastsub.num) !== undefined) {
                    useribs = userref = this.gn('S_' + lastsub.subname + '_num');
                    // log(useribs, 'use for branch in ', this.name);
                    // if (this._genenames[this.gn("ribs")]) msgfixerrorlog('ribs() in' + this.name, 'probably not used') // no, rib genename is created implicitly
                    if (this._genenames[this.gn("radius")])
                        msgfixerrorlog('radius() in' + this.name, 'probably not used');
                }
                else {
                    useribs = this.gn("ribs");
                    userref = this.gn("rref");
                    console.error(msgfixlog(useribs, 'used for branch in', this.name, '. try sub(..., RIBS) style preferred'));
                }
                code = code.replace(/RIBS/g, useribs).replace(/RREF/g, userref);
            }
            code = code.replace(/GG/g, repls)
                .replace(/!RP/g, "userp")
                .replace(/HNAME/g, this.name)
                .replace(/ACT/g, this.gn("active"))
                .replace(/SUB1/g, this.sname(1))
                .replace(/SUB2/g, this.sname(2));
        }
        if (opts.global) {
            var bb1 = '{', bb2 = '}';
        }
        else {
            bb1 = bb2 = "";
        } // allow for global code insert
        this.trancode += bb1 +
            code
            + bb2 + "\n";
        if (defs.length === 0) {
            this._genecode += "." + code;
        }
        else {
            const funname = opts.funname || defs[0][0];
            tran._genecode = genecodel;
            this._genecode += "." + funname + "(" + genecodel.join(",") + ")";
        }
        return this;
    }
    ;
    // patch to use currentGenes till we work out how to pass genes through wig etc TODO
    _addgeneXX(fun, def, min, max, delta, step, help, tag, free = 1, useuniform = true) {
        return this._addgene(fun, def, min, max, delta, step, help, tag, free, useuniform, currentGenes);
    }
    /** wig modifies the first parameter of the previous transform entry.
    It finds the previous tranform, pixks up the first parameter, and replaces it with equivalent wig call */
    wig(low, high, timefreq, lenfreq) {
        const tr = this.trans[this.trans.length - 1];
        // const oldv = tr.opts[0];
        const oname = tr.name + '_';
        if (!this._genenames)
            this._genenames = {}; // [] if needed but wrong place
        if (low === undefined)
            low = -100; // ?? ? use
        if (high === undefined)
            high = 1;
        if (timefreq === undefined)
            timefreq = 1;
        if (lenfreq === undefined)
            lenfreq = 1;
        const ln = this._addgeneXX(oname + 'wiglow', low, -100, 100, 1, 0.1, 'low value for wiggle', 'geom', 1);
        const hn = this._addgeneXX(oname + 'wighigh', high, -100, 100, 1, 0.1, 'low value for wiggle', 'geom', 1);
        const tf = this._addgeneXX(oname + 'wigtimefreq', timefreq, 0.1, 10, 0.1, 0.01, 'time frequency (seconds) for wiggle', 'geom', 1);
        const lf = this._addgeneXX(oname + 'wiglenfreq', lenfreq, 0.1, 10, 0.1, 0.01, 'length frequency along horn for wiggle', 'geom', 1);
        tr.opts[0] = 'wig(' + ln + ', ' + hn + ', ' + tf + ', ' + lf + ', 0.)';
        //tr.opts[0] = '( (' + ln + '+ ' + hn + ')/2. + (' + hn + '-' + ln + ') * sin(3.14159 * (time * ' + tf + ' + rp * ' + lf + ')) )';
        return this;
    }
    /** It finds the previous tranform, pixks up the first parameter, and replaces it with equivalent wig call */
    pulse(low, high, timefreq, lenfreq, pulsewidth) {
        const tr = this.trans[this.trans.length - 1];
        // const oldv = tr.opts[0];
        const oname = tr.name + '_';
        if (!this._genenames)
            this._genenames = {}; // [] if needed but wrong place
        if (low === undefined)
            low = -100; // ?? ? use
        if (high === undefined)
            high = 1;
        if (timefreq === undefined)
            timefreq = 1;
        if (lenfreq === undefined)
            lenfreq = 1;
        if (pulsewidth === undefined)
            pulsewidth = 0.1;
        const ln = this._addgeneXX(oname + 'pulselow', low, -100, 100, 1, 0.1, 'low value for pulse', 'geom', 1);
        const hn = this._addgeneXX(oname + 'pulsehigh', high, -100, 100, 1, 0.1, 'low value for pulse', 'geom', 1);
        const tf = this._addgeneXX(oname + 'pulsetimefreq', timefreq, 0.1, 10, 0.1, 0.01, 'time frequency (seconds) for pulse', 'geom', 1);
        const lf = this._addgeneXX(oname + 'pulselenfreq', lenfreq, 0.1, 10, 0.1, 0.01, 'length frequency along horn for pulse', 'geom', 1);
        const pw = this._addgeneXX(oname + 'pulsewidth', pulsewidth, 0.01, 1, 0.1, 0.01, 'width of pulse (proportion of 1)', 'geom', 1);
        tr.opts[0] = 'pulse(' + ln + ', ' + hn + ', ' + tf + ', ' + lf + ', 0., ' + pw + ')';
        //tr.opts[0] = '( (' + ln + '+ ' + hn + ')/2. + (' + hn + '-' + ln + ') * sin(3.14159 * (time * ' + tf + ' + rp * ' + lf + ')) )';
        return this;
    }
    // code to process definition
    $stack(o, genes, s) { return o.processTran("stack(MM0)", s, [["stack", 1000, 0, 2000, u, 0.1, "stack for horn"]], {}, genes); }
    ;
    $stackx(o, genes, s) { return o.processTran("stackx(MM0)", s, [["stackx", 1000, 0, 2000, u, 0.1, "stack for horn"]], {}, genes); }
    ;
    $stacky(o, genes, s) { return o.processTran("stacky(MM0)", s, [["stacky", 1000, 0, 2000, u, 0.1, "stack for horn"]], {}, genes); }
    ;
    $stackz(o, genes, s) { return o.processTran("stackz(MM0)", s, [["stackz", 1000, 0, 2000, u, 0.1, "stack for horn"]], {}, genes); }
    ;
    $stackxyz(o, genes, s) {
        return o.processTran("stackxyz(MM0, MM1, MM2)", s, [
            ["x", 1000, 0, 2000, u, 0.1, "x horn"],
            ["y", 1000, 0, 2000, u, 0.1, "y horn"],
            ["z", 1000, 0, 2000, u, 0.1, "z horn"]
        ], {}, genes);
    }
    ;
    $code(o, genes, s) {
        const aa = [[]];
        const l = s.opts.length;
        if (l >= 2)
            aa.push(["code", 0, -1, 1, u, 0.01, "code 0"]);
        for (let i = 1; i <= l - 2; i++)
            aa.push(["code" + i, 0, -1, 1, u, 0.01, "code " + i]);
        return o.processTran("LL0;", s, aa, { funname: "code" }, genes);
    }
    ;
    $dynop(o, genes, s) { return o.processTran("dynop(MM0)", s, [["dynop", { k: 1 }, 0, 20, u, 1, "dynamic op", "geom", "fixed", "k"]], {}, genes); }
    ;
    // $cutzz(o: Horn, genes: Genes, s:Tran):Horn {
    //     /// vang, hang, off, offrange, sharp, leaveid
    //     return o.processTran("cut(MM0,MM1,MM2,MM3,MM4,MM5)", s, [
    //         ["cutvang", {k:0}, -1800, 1800, u, 1, "vertical rotate for cut (degrees)"],
    //         ["cuthang", {k:0}, -1800, 1800, u, 1, "horizontal rotate for cut (degrees)"],
    //         ["cutoff", {k:0}, -1000, 1000, u, 1, "offset of cut from centre"],
    //         ["cutrange", {k:100}, 0, 200, u, 1, "width of cut offset (progressive cut, big number long spike)<br>big gives smoother animation"],
    //         ["cutsharp", {k:0.2}, 0, 2, u, 0.1, "sharpness of cut<br>adjust profile of cut end"],
    //         ["cutleave", {k:30}, 3, 30, u, 1, "id of honrun to leave uncut"]
    //     ], {}, genes);
    // };
    $gcode(o, genes, s) {
        return o.processTran("LL0;", s, [
            [],
            ["code", 0, -1, 1, u, 0.01, "code 0"],
            ["code1", 0, -1, 1, u, 0.01, "code 1"],
            ["code2", 0, -1, 1, u, 0.01, "code 2"],
            ["code3", 0, -1, 1, u, 0.01, "code 3"]
        ], { funname: "gcode", global: true }, genes);
    }
    ;
    $bend(o, genes, s) {
        if (s.opts.length < 2) {
            return o.processTran("twr(x,y, MM0);", s, [
                ["bend", 90, -360, 360, u, 0.1, "bend for horn"]
            ], { funname: "bend" }, genes);
        }
        else {
            return o.processTran("twr(x,y, MM0, MM1);", s, [
                ["bend", 90, -360, 360, u, 0.1, "bend for horn"],
                ["bendoff", { k: "0" }, -200, 200, u, 0.1, "bend offset along horn", "geom", "free", "k"]
            ], { funname: "bend" }, genes);
        }
    }
    ;
    $wiggle(o, genes, s) {
        if (s.opts.length < 3) {
            return o.processTran("wiggle(x, MM0, MM1);", s, [
                ["wigfreq", 90, -360, 360, u, 0.1, "wiggle freq for horn"],
                ["wigamp", 90, -360, 360, u, 0.1, "wiggle amp for horn"]
            ], { funname: "wiggle" }, genes);
        }
        else {
            return o.processTran("wiggle(x, MM0, MM1, MM2);", s, [
                ["wiggle", 90, -360, 360, u, 0.1, "wiggle freq for horn"],
                ["wigamp", 90, -360, 360, u, 0.1, "wiggle amp for horn"],
                ["wigphase", { k: "0" }, -200, 200, u, 0.1, "phase of wiggle", "geom", "free"]
            ], { funname: "wiggle" }, genes);
        }
    }
    ;
    $curl(o, genes, s) {
        if (s.opts.length < 2) {
            return o.processTran("twr(y,z, MM0);", s, [
                ["curl", 90, -360, 360, u, 0.1, "curl for horn"]
            ], { funname: "curl" }, genes);
        }
        else {
            return o.processTran("twr(y,z, MM0, MM1);", s, [
                ["curl", 90, -360, 360, u, 0.1, "curl for horn"],
                ["curloff", { k: "0" }, -200, 200, u, 0.1, "curl offset along horn", "geom", "free", "k"]
            ], { funname: "curl" }, genes);
        }
    }
    ;
    $pintexture(o, genes, s) { return o.processTran("pintexture(MM0)", s, [["pintexture", 1000, 0, 2000, u, 0.1, "nominal stack for texture"]], {}, genes); }
    ;
    $clelia(o, genes, s) {
        return o.processTran("cleliac(rp, x,y,z,MM0,MM1,MM2,MM3,MM4);", s, [
            ["A", { k: 1 }, -10, 10, 0.1, 0.01, "scale"],
            ["G", { k: 5 }, -20, 20, 0.1, 1, "G value"],
            ["F", { k: 3 }, -20, 20, 0.1, 1, "F value"],
            ["gamma", { k: 0.3 }, -1, 1, 0.01, 0.001, "gamma value"],
            ["beta", { k: 0.7 }, -1, 1, 0.01, 0.001, "beta value"]
        ], {}, genes);
    }
    ;
    $clelia2(o, genes, s) {
        return o.processTran("clelia2(x,y,z,MM0,MM1,MM2,MM3,MM4,MM5,MM6,MM7);", s, [
            ["k", { k: 5 }, -20, 20, 0.1, 1, "k value"],
            ["j", { k: 3 }, -20, 20, 0.1, 1, "j value"],
            ["gamma", { k: 0.3 }, -1, 1, 0.01, 0.001, "gamma value"],
            ["beta", { k: 0.7 }, -1, 1, 0.01, 0.001, "beta value"],
            ["k2", { k: 7 }, -20, 20, 0.1, 1, "k2 value"],
            ["j2", { k: 11 }, -20, 20, 0.1, 1, "j2 value"],
            ["gamma2", { k: 0.3 }, -1, 1, 0.01, 0.001, "gamma2 value"],
            ["beta2", { k: 0.7 }, -1, 1, 0.01, 0.001, "beta2 value"]
        ], {}, genes);
    }
    ;
    $twist(o, genes, s) {
        if (s.opts.length < 3) {
            return o.processTran("twr(x,z, MM0, MM1);", s, [
                ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
                ["twistoff", { k: 50 }, -200, 200, u, 0.1, "twist offset along horn", "geom", "free", "k"]
            ], {}, genes);
        }
        else {
            return o.processTran("twr(x,z, MM0, MM1, MM2);", s, [
                ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
                ["twistoff", { k: 50 }, -200, 200, u, 0.1, "twist offset along horn", "geom", "free", "k"],
                ["twistphase", { k: "0" }, -200, 200, u, 0.1, "phase of twist", "geom", "free"]
            ], {}, genes);
        }
    }
    ;
    $twax(o, genes, s) {
        return o.processTran("twax(x,y,z, vec3(MM1, MM2, MM3), MM0);", s, [
            ["twist", 360, -1440, 1440, u, 0.1, "twist along horn"],
            ["twx", { k: 1 }, -1, 1, u, 0.01, "twist x axis", "geom", "free", "k"],
            ["twy", { k: 1 }, -1, 1, u, 0.01, "twist y axis", "geom", "free", "k"],
            ["twz", { k: 1 }, -1, 1, u, 0.01, "twist z axis", "geom", "free", "k"]
        ], {}, genes);
    }
    //??twaxv(v, ax) { return this.twax(v, ax.x, ax.y, ax.z); }
    twaxv(v, ax) { serious('something happened to twaxv when we move to class?'); }
    // >>> TODO verify MM0 below
    $scale(o, genes, s) {
        return o.processTran("scale(MM0)", s, [["scale", 1, 0.5, 2, u, 0.01, "scaling along horn: 1 regular, 0 to point"]], { lowval: "1." }, genes);
    }
    ;
    $branch(o, genes, s) {
        return o.processTran("branchanimX(MM0, MM1, MM2, !RP, RIBS, RREF)", s, [
            ["branchs", { k: 1 }, 0, 1, u, 0.1, "branch proportion", "geom", "free", "k"],
            ["branchp", { k: 1 }, 0, 5, u, 0.00005, "branch rotational pattern", "geom", "frozen", "k"],
            ["branchgrownum", { k: 10 }, 0, 50, 0.1, 1, "number of new ribs to be growing", "geom", "frozen", "k"]
        ], { funname: "branch" }, genes);
    }
    ;
    $spoke(o, genes, s) {
        return o.processTran("branchanimX(MM0, 360./( (MM1)*137.5) , MM2, !RP, RIBS, RREF)", s, [
            ["spokes", { k: 1 }, 0, 1, u, 0.1, "spoke spread proportion", "geom", "free", "k"],
            ["spoker", { k: 5 }, 0, 5, u, 0.0025, "spoke repeat pattern", "geom", "frozen", "k"],
            ["spokegrownum", { k: 0 }, 0, 50, 0.1, 1, "number of new spokes to be growing", "geom", "frozen", "k"]
        ], { funname: "spoke" }, genes);
    }
    ;
    $spiral(o, genes, s) {
        return o.processTran("branchspiralX(MM0, MM1, !RP, RIBS, RREF)", s, [["spirals", { k: 1 }, 0, 1, u, 0.1, "spiral proportion", "geom", "free", "k"],
            ["spiralp", { k: 1 }, 0, 5, u, 0.1, "spiral spiral pattern", "geom", "frozen", "k"]
        ], { funname: "spiral" }, genes);
    }
    ;
    $sweep(o, genes, s) { return o.processTran("twr(x,y, MM0, 0.);", s, [["sweep", { k: 90 }, -180, 180, u, 0.1, "sweep for horn", "geom", "free", "k"]], {}, genes); }
    ;
    $flap(o, genes, s) { return o.processTran("twr(x,z, MM0, 0.);", s, [["flap", { k: 0 }, -90, 90, u, 0.1, "flap for horn", "geom", "free", "k"]], {}, genes); }
    ;
    $tilt(o, genes, s) { return o.processTran("twr(y,z, MM0, 0.);", s, [["tilt", { k: 90 }, -180, 180, u, 0.1, "tilt for horn", "geom", "free", "k"]], {}, genes); }
    ;
    $swap(o, genes, s) { return o.processTran("swap(LL0,LL1)", s, [[], []], { funname: "swap" }, genes); }
    ;
    $swapn(o, genes, s) { return o.processTran("swapn(LL0,LL1)", s, [[], []], { funname: "swapn" }, genes); }
    ;
    $radiate(o, genes, s) {
        return o.processTran("radiate(MM0)", s, [["radiate", { k: 100 }, 0, 100000, u, 10, "radiate, parm gives y distance for full 360 degrees", "geom", "free", "k"]], {}, genes);
    }
    ;
    $warp(o, genes, s) {
        return o.processTran("warp(MM0,MM1,MM2)", s, [
            ["warp", { k: 1 }, 0, 4, u, 0.05, "number of warps ", "geom", "free", "k"],
            ["amp", { k: 0.02 }, 0, 0.1, u, 0.005, "amp", "geom", "free", "k"],
            ["offset", { k: 100 }, -1000, 1000, u, 10, "offset", "geom", "free", "k"]
        ], {}, genes);
    }
    ;
    $tw4(o, genes, s) {
        return o.processTran("twr(LL0,LL1, MM2, MM3);", s, [
            [],
            [],
            ["tw4", 360, -1440, 1440, u, 0.1, "twist along horn, 4d"],
            ["tw4off", { k: 0 }, -200, 200, u, 0.1, "twist offset along horn, 4d", "geom", "free", "k"]
        ], {}, genes);
    }
    ;
    $st4(o, genes, s) { return o.processTran("st(LL0, MM1)", s, [[], ["st4", 1000, 0, 2000, u, 0.1, "stack for horn, 4d"]], {}, genes); }
    ;
    $growpart(o, genes, s) {
        return o.processTran("growpart(MM0,!RP,PARENT_rp,PARENT_rref,PARENT_ribs)", s, [
            ["growpart", { k: 0.1 }, 0, 1, u, 0.01, "proportion at end with reduced growth", "geom", "fixed", "k"]
        ], {}, genes);
    }
    ;
    $growpartr(o, genes, s) {
        return o.processTran("growpartr(MM0,!RP,PARENT_rp,PARENT_rref,PARENT_ribs)", s, [
            ["growpartr", { k: 0.1 }, 0, 1, u, 0.01, "proportion at end with reduced radius", "geom", "fixed", "k"]
        ], {}, genes);
    }
    ;
    $web(o, genes, s) {
        return o.processTran("web(HNAME_rp, HNAME_ribs, HNAME_rref, SUB2_ribs, SUB2_rref, SUB2_stack, MM0,MM1,MM2,MM3)", s, [
            ["warp", { k: 1 }, 0, 5, u, 0.05, "number of warps for each radial segment", "geom", "free", "k"],
            ["amp", { k: 0.02 }, 0, 0.1, u, 0.005, "amplitude of the warps", "geom", "free", "k"],
            ["offset", { k: 100 }, 0, 1000, u, 10, "offset of web from centre", "geom", "free", "k"],
            ["prop", { k: 1 }, 0, 1, u, 0.05, "proportion of circle to sweep", "geom", "frozen", "k"]
        ], { funname: "web" }, genes);
    }
    ;
    $savepos(o, genes, s) {
        let id;
        if (s.opts.length > 0) {
            id = s.opts[0];
            this._genecode += ".savepos('" + id + "')";
        }
        else {
            id = this.name;
            this._genecode += ".savepos()";
        }
        const saveposset = this.hset._saveposset;
        if (saveposset[id] !== false)
            saveposset[id] = true; // must record it exists, but don't set for auto addpos if addpos already seen
        this.trancode += "savepos(save_" + id + ");\n";
        return this;
    }
    ;
    $addpos(o, genes, s) {
        const id = s.opts[0];
        this.hset._saveposset[id] = false;
        this._genecode += ".addpos('" + id + "')";
        this.trancode += "addpos(save_" + id + ");\n";
        return this;
    }
    ;
    /** full dualrot code, specify absolute values for rotation, let keyframes make it interesting */
    $dualrot(o, genes, s) {
        return o.processTran('twr(x,z,round(xhornid ) == round(cut_leaveid) ? MM1 : MM0);', s, [
            ["uncut", { k: 0 }, -3600, 3600, u, 0.05, "angle of rotation for uncut parts", "geom", "frozen", "k"],
            ["cut", { k: 0 }, -3600, 3600, u, 0.05, "angle of rotation for cut parts", "geom", "frozen", "k"],
        ], { funname: "dualrot" }, genes);
    }
    ;
    /** simple */
    $timerot(o, genes, s) {
        return o.processTran('twr(x,z, (round(xhornid ) == round(cut_leaveid) ? -1. : 1.) * MM0 * time);', s, [
            ["timerotrate", { k: 1 }, -5, 5, u, 0.05, "rate of rotation, -ve for cut object", "geom", "frozen", "k"]
        ], { funname: "dualrot" }, genes);
    }
    ;
    // $xytest() {} // test for illegal $x function
    // top level shim to collect definition
    _addtrlow(fun, args) {
        args = Array.prototype.slice.call(args, 0); // convert from Arguments type to array
        this.trans.push(new Tran(fun, args));
        return this;
    }
    ;
    radius(r) {
        this._radius = r;
        return this;
    }
    ;
    /** add horn specific colors */
    color(cols) {
        this._cols.push(cols);
        return this;
    }
    ;
    /** define a subhorn for a horn, optional with several parameters or structure */
    sub(h, num, start, end, depth) {
        // if a branch is involved ignore num: use ribs, not horn_S _sub_num
        // corrected 16 Dec 2023, to remove Han 2024
        // if (num !== undefined && this.trans.some(t=>t.name === 'branch')) {
        //     msgfixerrorlog('horn ' + this.name, `num parameter in sub(${h},${num}) ignored`);
        //     num = undefined;
        // }
        let hs;
        if (typeof num === "object") {
            hs = num;
            hs.subname = h;
        }
        else {
            hs = { subname: h, num: num, start, end, depth };
        }
        if (hs.depth !== undefined)
            hs.depth += ''; // force it to be a fixed (nongene) value; matcodes gets confused otherwise???
        else
            hs.depth = '2';
        this._sub.push(hs);
        return this;
    }
    ;
    /** define a ribcage for a horn, optional with several parameters or structure */
    ribcage(h, num, start, end, depth) {
        this.sub(h, num, start, end, depth);
        this._sub[this._sub.length - 1].cage = true;
        return this;
    }
    ;
    /** define a tail for a horn */
    tail(h) {
        if (HornSet.subsfortailsouter)
            this.sub(h, '0.', '1.', '1.');
        else if (HornSet.tailsToHead)
            this._head.push(h);
        else
            this._tail.push(h);
        return this;
    }
    ;
    /** define a head for a horn */
    head(h) {
        if (HornSet.subsfortailsouter)
            this.sub(h, '0.', '0.', '0.');
        else
            this._head.push(h);
        return this;
    }
    ;
    /** macro for web
     * spoken is name of spoke horn,
     * which must have a suitable sub defined; the sub will beome ringn
     * -
     * if spoken is not defined, suitable spoke and ring horns are defined automaticallyreplac
     * */
    webm(spoken) {
        const webh = this.name;
        let ringn, spokeh;
        if (spoken === undefined) {
            spoken = webh + "_s";
            spokeh = horn(spoken, this.hset).ribs(10).rref(10).radius(50).stack(1000).bend(0).curl(0).swapn("x", "y").color();
        }
        else {
            spokeh = this.hset.horns[spoken];
            if (spokeh === undefined) {
                console.log("web uses undefined sub " + spoken);
                return;
            }
        }
        let ringh = spokeh._sub[0];
        if (ringh === undefined) {
            ringn = webh + "_r";
            horn(ringn, this.hset).ribs(8).rref(8).radius(25).stack(500).swapn("x", "y").color();
            spokeh.sub(ringn);
        }
        else {
            ringn = ringh.subname;
        }
        //this.rref("0");
        this.web();
        this.sub(spoken);
        return this;
    }
    ;
    /** find genes used by horn and dependents (not actually used) */
    //allGenes(fun) { TODO if used allow for {} set not array
    //    var allgenes = this._genenames.slice(0);
    //    for (let i in this._tail) allgenes = allgenes.concat(horns[this._tail[i]].allGenes());
    //    for (let i in this._head) allgenes = allgenes.concat(horns[this._head[i]].allGenes());
    //    for (let i in this._sub) allgenes = allgenes.concat(horns[this._sub[i].subname].allGenes());
    //    return allgenes;
    //};
    /** check the tail, head and sub are ok,
     * generate code and return reduced list for those that are ok */
    uselist(list, parents, subparents, type, hset, genes, medepth) {
        // don't compile too deep, we can't execute it. (implementation limitation of splitk to track parents in shader)
        // total depth limit applies whether explict or recursive
        if (parents.length > 7 && list.length > 0) {
            msgfixerror('horndepth', 'child list too deep, ignored', 'children', list.map(x => x.subname), 'parents', subparents.slice(0, 999));
            list.splice(0, 999); // empty so it doesn't get used
            return [];
        }
        var ok = [];
        for (let i in list) {
            var item = list[i];
            let name = type === "_sub" ? item.subname : item;
            if (false) {
                //        } else if (parents.indexOf(name) !== -1) {
                //            console.log("ignoring recursive " + type + " " + name + " in " + this.name);
            }
            else if (!hset.horns[name]) {
                console.log("ignoring unfound " + type + " " + name + " in " + this.name);
            }
            else {
                if (type === "_sub") {
                    if (parents.slice(0, -1).indexOf(this.name) === -1) {
                        // var xx=['"'+name+'"'];
                        var xx = [];
                        if (item.num !== u)
                            xx.push("num: " + this._show(this._expr("S_" + name + "_num", item.num, 0, 50, 1, 0.1, "number of instances of " + name + " under " + this.name, 'geom', 'free', genes)));
                        if (item.start !== u)
                            xx.push("start: " + this._show(this._expr("S_" + name + "_start", item.start, 0, 1, 0.1, 0.1, "start pos of " + name + " under " + this.name, 'geom', 'free', genes)));
                        if (item.end !== u)
                            xx.push("end: " + this._show(this._expr("S_" + name + "_end", item.end, 0, 1, 0.1, 0.1, "end pos of " + name + " under " + this.name, 'geom', 'free', genes)));
                        if (item.depth !== u)
                            xx.push("depth: " + this._show(this._expr("S_" + name + "_depth", item.depth, 0, 7, 1, 1, "recursion depth of " + name + " under " + this.name, 'geom', 'free', genes)));
                        var nn = (item.cage) ? "ribcage" : "sub";
                        var parms = xx.length === 0 ? "" : ", {" + xx.join(",") + "}";
                        this._genecode += "." + nn + "(" + '"' + name + '"' + parms + ")";
                        this.hascage = this.hascage || item.cage;
                    }
                }
                else if (type === "_tail") {
                    this._genecode += '.tail("' + name + '")';
                }
                else if (type === "_head") {
                    this._genecode += '.head("' + name + '")';
                }
                else
                    throwe("unexpected type to this.uselist " + type);
                if (medepth >= item.depth) { // ||| one test for depth
                }
                else {
                    ok.push(list[i]); // push in the full form
                    hset.horns[name]._compileh1(parents, subparents, hset, genes);
                }
            }
        }
        return ok;
    }
    ;
    /** compile any special colour requests */
    _compilecols(hset, lev, genes) {
        if (_testcompile) {
            // for (let i in this._cols) {
            //     if (lev === 0) this._genecode += ".color()";
            // }
            return;
        }
        // work out our colour overrides (if any)
        // >>>> todo resolve where old values left in genedefs cause wrong colour for non color() spec
        // prepare to apply them at render time
        this._coluse = {}; // mapping to say if texture value has special local values, eg false use gloabal 'red1', true use 'Q_red1', or 'Q_3_red1'
        for (let name of COL.names)
            this._coluse[name] = name;
        for (let i in this._cols) {
            let cols = this._cols[i];
            if (cols === undefined) { // color() alone makes specific values for all
                for (let name of COL.names) {
                    let myname = this.gn(name, lev);
                    let xname = myname.post(this.name + "_");
                    let gd = genedefs[name];
                    this._addgene(xname, FIRST(genes[name], gd.def), gd.min, gd.max, gd.delta, gd.step, gd.help, "horncol", gd.free, false, genes);
                    this._coluse[name] = myname;
                }
                if (lev === 0)
                    this._genecode += ".color()";
            }
            else { // a specified list of attributes to override, eg color({red1:0.2})
                let xx = [];
                for (let name in cols) {
                    if (COL.num[name] === undefined) {
                        return msgfixerror('col:' + name, 'invaid colour name');
                    }
                    let gd = genedefs[name];
                    // if (!gd) continue;
                    let myname = this.gn(name, lev); // c was name, but probably wrong sjpt 15/8/2017
                    var xp = this._expr(name, cols[name], gd.min, gd.max, gd.delta, gd.step, gd.help, "horncol", gd.free, genes);
                    xx.push(name + ":" + this._show(xp));
                    this._coluse[name] = myname;
                }
                if (lev === 0)
                    this._genecode += ".color({" + xx.join(",") + "})";
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
    }
    ;
    /** roll out all code for a horn, using horns defined in the HornSet hset
    generates items .trancode, ._genenames, _genecode
        parents is complete list of elements this hangs off (sub, tail, ...)
        subparents is list of elements to which this has a sub relationship
        This is a first pass, followed by _compileh2
        **/
    _compileh1(parents, subparents, hset, genes) {
        const ddd = this.login('_compileh1');
        // don't compile too deep, we can't execute it.
        // total depth limit applies whether explict or recursive
        var me = this;
        var medepth = parents.reduce(function (p, n) { return p + (n === me.name ? 1 : 0); }, 0);
        this._addgene('cutoffset', 0, -4000, 4000, 1, 1, 'cut offset for this horn, 999999 means uncut', 'geom', 'frozen', true, genes);
        // if (this.hset && this.hset !== hset && this.hset !== cloneCircle) throwe("attempt to reuse horn in different hset");
        this.hset = hset;
        if (hset.segnames.indexOf(this.name) !== -1)
            return; // code already generated; but this unwraps wrong so not
        // initialize the output that will be collected
        var pretrancode = (parents.length === 0) ? '{ // ' + this.gn('always active') + '\n' : " if (" + this.gn("active", medepth) + " != 9999.){\n";
        pretrancode += "float level = " + medepth + ".0;\n";
        pretrancode += "float myrp = " + this.gn("rp", medepth) + ";\n";
        if (this.trans.length > 0) // 22Mar2024 we want crp to make pulse sweep in branch && this.trans[0].name !== 'branch') // ??? check for ANY is branch
            pretrancode += "crp += myrp;\n";
        if (subparents.length > 0)
            pretrancode += "float SUBP_rp = " + subparents[subparents.length - 1] + "_rp;\n";
        else
            pretrancode += "float SUBP_rp = 0.;\n"; // something other than 0 could give interesting delay effect
        if (medepth === 0) { // only compile the basic trancode once even if recursive
            this.trancode = "";
            this._genenames = {};
            this._genecode = 'horn("' + this.name + '")';
            var xp = this._expr("ribs", this._ribs, 1, 200, u, 0.1, "number of ribs in horn", "geom", 'free', genes);
            this._genecode += ".ribs(" + this._show(xp) + ")";
            if (forcerref && this._rref === undefined)
                this._rref = this._ribs;
            xp = this._expr("rref", this._rref === undefined ? "0" : this._rref, 0, 200, u, 0.1, "reference number of ribs in horn", "geom", "frozen", genes);
            if (this._rref !== undefined)
                this._genecode += ".rref(" + this._show(xp) + ")";
            if (this._ribdepth !== undefined) {
                var rd = this._expr("ribdepth", this._ribdepth, 0, 3, u, 0.1, "depth of ribs (relative to global ribdepth)", "geom", 'free', genes);
                this._genecode += ".ribdepth(" + this._show(rd) + ")";
            }
            if (this._radius !== undefined) {
                var minRadius = W.UICom.m_isProjVersion ? 13.0 : 0.0; // stop very small radii in proj version
                var maxRadius = 20; // was 50
                xp = this._expr("radius", this._radius, minRadius, maxRadius, u, 0.1, "radius for horn", 'geom', 'free', genes);
                this._genecode += ".radius(" + this._show(xp) + ")";
            }
            // unroll the transforms
            for (let t in this.trans) {
                var tran = this.trans[t];
                if (tran.name[0] !== "x")
                    this["$" + tran.name](this, genes, tran);
            }
        }
        if (this._matchSpringmap(this.name)) { // mval
            var gmap1 = this.gn("map1");
            this._addgene("map1", 0, 0, 20, 1, 1, "particle1 to tie to this horn", "springmap", 0, undefined, genes);
            pretrancode += "vec4 SMAP1 = ppos((floor(" + gmap1 + ") + SUBP_rp*springl)*goff);\n";
            if (this._springmap2()) {
                var gmap2 = this.gn("map2");
                this._addgene("map2", 0, 0, 20, 1, 1, "particle2 to tie to this horn", "springmap", 0, undefined, genes);
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
        hset._adduniformX(this.gn("para", medepth), new THREE.Vector4(0, 0, 0, 0), "v4");
        hset._adduniformX(this.gn("parb", medepth), new THREE.Vector4(0, 0, 0, 0), "v4");
        var xname = this.name;
        if (medepth)
            xname += "_" + medepth; // extra names for recursive elements
        hset.setupcode += "float X_rp01 = X_active * rp + X_rpbase + dotParpos(X_para, X_parb, parpos);\n".replace(/X/g, xname);
        // care with X_rref = 0, eg not specified and X_ribs=0
        hset.setupcode += "float X_rp = X_rp01".replace(/X/g, xname) + " * (X_rref == X_ribs ? 1. : X_ribs / X_rref);\n".replace(/X/g, this.name);
        this._sub = this.uselist(this._sub, parents, nsubparents, '_sub', hset, genes, medepth);
        this._tail = this.uselist(this._tail, parents, nsubparents, '_tail', hset, genes, medepth);
        this._head = this.uselist(this._head, parents, subparents, '_head', hset, genes, medepth);
        this._compilecols(hset, medepth, genes);
        //>>> TODO generation  for pickoutput wrong for recursive horns
        hset.pickoutput += "slot(" + hset.segnames.length + ", X_rp01);".replace(/X/g, this.name);
        hset.segnames.push(this.name);
        // hset.slot++;
        if (this.hascage) {
            hset._adduniformX(this.gn("reflx", medepth), INACTIVE);
            pretrancode += "reflx(" + this.gn("reflx", medepth) + ");\n";
        }
        // ltrancode is specific to this depth of recursion
        // TODO check interaction of recursion with PARENT/SUBPARENT
        var ltrancode = pretrancode + this.trancode + "}\n\n";
        ltrancode = ltrancode.replace(/SUBPARENT/g, subparents[subparents.length - 1]);
        ltrancode = ltrancode.replace(/PARENT/g, parents[parents.length - 2]);
        hset.trancode += ltrancode.replaceall(this.gn("rp"), this.gn("rp", medepth));
        if (medepth === 0) {
            this._genecode += ";";
            hset._genecode += this._genecode + "\n";
        }
        this.logout(ddd, '_compileh1');
    }
    ;
    /** prepare uniform colours for a hornrun
     * Separated to help performance profile
     */
    _colset(genes, uniformsp, lev, hornid) {
        if (tad && genes.tranrule.startsWith('//tadpoleTranrule'))
            return;
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
        coluse = this._coluse; // get all colours in _coluse
        const p = hornid;
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
                const hset = getHornSet(genes);
                COL.setG(name, p, vv, myname, hset);
            }
            else {
                if (COL.get(name, p) !== COL.get(name, 0))
                    debugger; // should not get here, if not explicity should be copied from default
            }
            //if (vv !== undefined && uniforms[namea] !== undefined) uniforms[namea].value = [vv];
        }
        colourTailor(p, genes);
        COL.send();
    }
    ;
    /** resolve a given value.
    spec is what was specificed in definition (eg, 15, "15", "Q_radius")
    role is the role we are looking up (eg "radius")
    */
    _resolve(spec, role) {
        if (spec === undefined)
            return undefined;
        if (typeof spec === "string" && !isNaN(+spec))
            return +spec; // constant number "15"
        if (typeof spec === "string")
            return uniforms[spec].value; // "Q_radius", does not allow for expressions
        return uniforms[this.gn(role)].value;
    }
    ;
    /** symbolic version of above for single pass multihorsn */
    _resolvesym(spec, role) {
        if (spec === undefined)
            return undefined;
        if (typeof spec === "string" && !isNaN(+spec))
            return +spec; // constant number "15"
        if (typeof spec === "string")
            return spec; // "Q_radius", does not allow for expressions
        return this.gn(role);
    }
    hlog(...a) {
        WA.dohornlog('%horn'.padStart(logdepth * 4), this.name, ...a);
    }
    login(...a) { logdepth++; this.hlog('>>', ...a); return logdepth; }
    logout(d, ...a) { logdepth = d; this.hlog('<<', ...a); }
    /** render this horn, used for setting up, but not every frame, see rendersinglpemulti (was _renderme) */
    _compileh2b(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid, parentHornid, subtype) {
        if (badshader)
            return;
        const ddd = this.login('_renderme', opmode);
        if (!this._usescale && opmode === OPPOSITION)
            return; // do not count this horn for autoscale/position
        // do in _compileh2a var hornid = hset.hornid ++;  // keep track of each horn render situation
        uniformsp.hornid.value = hornid;
        //framelog("renderme", this.name, hornid, oplist[opmode]);
        var medepth = key.split(KLEFT + this.name + KRIGHT).length - 1; // depth of self-recursion
        //framelog("render", this.name, hornid);
        var hornrun = hset.hornrun[hornid];
        if (hornrun.horn !== this || hornrun.medepth !== medepth || hornrun.hornid !== hornid)
            serious('inconsistent hornrun order', this.name, hornrun.horn.name, hornid);
        //else
        //    log('RIGHT compile?', this.name, hornrun ? hornrun.horn.name : "NOHORNRUN", hornid);
        // compute radius, may be in one of various forms
        var rad = this._resolve(this._radius, "radius");
        if (rad || inputs.SINGLEMULTI) { // zero or undefined will not show this object, but needs to be compiled for SINGLEMULTI
            if (!uniformsp[this.gn("active", medepth)]) { // should have been sorted earlier
                console.error('uniform fixed too late in _renderme', this.gn("active", medepth));
                hset._adduniformX(this.gn("active", medepth), INACTIVE);
                hset._adduniformX(this.gn("rpbase", medepth), INACTIVE);
            }
            uniformsp[this.gn("active", medepth)].value = 1;
            uniformsp[this.gn("rpbase", medepth)].value = 0;
            uniformsp.radius.value = rad;
            // n.b this should be moved to rendersinglpemulti to happen every frame
            if (uniformsp.light0s)
                uniformsp.light0s.value = genes.light0s * ((hornid === hset.hornhighlight) ? 5 : 1);
            // if (this.hset.horns[hset.horn so lo] && this.name !== hset.horn so lo) {
            //     var d = Math.exp((frametime - hset.so lostarttime) * 0.005);
            //     d = Math.min(d, 20);
            //     uniformsp.radius.value /= d;
            //     newframe();
            // }
            // Some very twisted objects need DoubleSide, but transparent ones we don't want to see the back
            // This gives an imperfect but adequate (?) compromise.
            //if (opmode === OPOPOS && uniforms.screenDoor)
            //    scene.children[0].material.side = uniforms.screenDoor.value ? THREE.FrontSide : THREE.DoubleSide;
            // NO, we always want front only.  Back also give some funny badnormals along edges
            scene.children[0].material.side = THREE.FrontSide; // NO scene was the wrong object to hit in most cases
            // note, experiment to keep multiScene down to 1 chunk and iterate at this level instead
            // was a performance disaster
            // must call multiScene even if sc not used, as it computes/sets bufferoffset etc uniforms
            var userenderscene = this.hset._renderscene && this.hset._renderscene !== scene;
            var sc = multiScene(genes, num, key, userenderscene, hset, hornid);
            if (sc)
                sc.overrideMaterial = scene.overrideMaterial;
            if (_testcompile) {
            }
            else if (HW.renderspecial) {
                HW.renderspecial(sc, render_camera, rendertarget);
            }
            else if (userenderscene) {
                rrender("hornxscene", this.hset._renderscene, render_camera, rendertarget);
            }
            else {
                sc.children[0].material.wireframe = HW.usewireframe;
                rrender("hornmutliscene", sc, render_camera, rendertarget);
            }
            // debug information in preparation for more complete 'compilation' of horn runs
            if (logframenum >= framenum) {
                var myvals = [];
                myvals.push(showvals('$lennum$radnum$skelnum')); // << will change with resolution change only, BUT that may change with ribs
                for (let hn in hset.horns) {
                    myvals.push(showvals('$' + hn + "_active" + '$' + hn + "_rpbase" + '$' + hn + "_para" + '$' + hn + "_parb"));
                }
                var myset = myvals.join('\n');
                if (!hset.hornrun[hornid].myset)
                    hset.hornrun[hornid].myset = myset;
                if (hset.hornrun[hornid].myset !== myset) {
                    log('differing myset');
                    hset.hornrun[hornid].myset = myset;
                }
            }
            //log("hrender$framenum$opmode", rendertarget.width + "x" + rendertarget.height);
            hset.horncount += num;
            hset.cumcount[hornid] = hset.horncount;
            uniformsp.cumcount.value[hornid] = hset.cumcount[hornid];
            if (this.hascage)
                uniformsp[this.gn("reflx", medepth)].value = 1;
            //console.log(this.name + ">" + uniforms.first_reflx.value);
            //
            uniformsp.ribsa.value[hornid] = genes[hset.hornrun[hornid].hornname + '_ribs'];
            uniformsp.lribdeptha.value[hornid] = genes[hset.hornrun[hornid].hornname + '_ribdepth'];
            checkgbuffer(hset.gbuffoffset);
            /**/
            /**/
        } // if rad
        this.logout(ddd, '_renderme');
    }
    ;
    /** render subs, including heads and tails if subsfortails is set, only during initial _renderme render phase?
    was _rendersubs */
    _compilesubs(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid, parentHornid, subtype) {
        const ddd = this.login('_rendersubs');
        assert(hornid === hset.hornid - 1, 'rendersubs hornid issue');
        var horns = hset.horns;
        var medepth = key.split(KLEFT + this.name + KRIGHT).length - 1; // self-recursive depth
        for (let ssubtype in { _sub: 0, _head: 0, _tail: 0 }) {
            const subtype = ssubtype;
            if (!HornSet.subsfortails && subtype !== '_sub')
                continue;
            for (let i in this[subtype]) {
                var item = this[subtype][i];
                if (subtype === '_head')
                    item = { subname: item, start: 0, end: 0, num: 0 };
                if (subtype === '_tail')
                    item = { subname: item, start: 1, end: 1, num: 0 };
                // // item.depth is the max to which it has been compiled
                // // There may also be an associated  gene, in which case we respect this to dynamically lower depth
                // var usedepth = genes[this.gn(" S_"   + item.subname + "_depth")];
                const usedepth = item.depth;
                if (usedepth <= medepth)
                    continue; // do not render this sub, too deep
                // use gene if possible, explicit non-gene value if not, parent/default if not
                var sribsgn = this.gn("S_" + item.subname + "_num");
                if (this._genenames[sribsgn])
                    var sribs = genes[sribsgn]; // sometimes left over genes sribsgn not relevant to this object
                if (sribs === undefined)
                    sribs = item.num;
                if (sribs === undefined)
                    sribs = ribs;
                if (item.num < 0)
                    sribs = -item.num * ribs;
                // limit the number of ribs from nested subs
                // could be slightly more smooth, but this will stop distaster slowdown
                var lev = key.split(KSEP).length - 1;
                hset.ribshow += "\n" + (new Array(lev).join("    ")) + Math.ceil(sribs);
                if (num * Math.ceil(sribs + 1) > MAXRIBS) {
                    sribs = Math.max(0, MAXRIBS / num - 1);
                    hset.ribshow += "!!" + format(sribs);
                    // if (sribs <= 0) continue;
                    //genes[this.name + "_ribs"] = sribs;
                    // animation special, not core horn function
                    // if a reverse was caused by ribs going too high then make sure the parent ribs are going down
                    // TODO check this, OPREGULAR check is certainly dated, and key may change details too
                    if (opmode === OPREGULAR && (framenum > lastRevFrame + 9 || framenum < lastRevFrame)) {
                        var path = key.split(KSEP).concat(this.name);
                        var maxr = -999, mrk;
                        var rrr = [];
                        for (let p = 0; p < path.length; p++) {
                            var rk = path[p].substr(1) + "_ribs"; // path includes 01 for rev
                            rrr.push(genes[rk]);
                            if (geneSpeed[rk] * inputs.animSpeed > 0 && genes[rk] > maxr) {
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
                // !!! leaving out brackets round (h.cage ? 2 : 1)
                // !!! led to terrible looping/hanging problems
                for (let refl = 0; refl < (item.cage ? 2 : 1); refl++) {
                    var subkey = key + KSEP + refl + KLEFT + this.name + KRIGHT + hornid;
                    this._postcompilesub(uniformsp, rendertarget, hset, subkey, num, item, refl, hornid);
                    if (this.hascage)
                        uniformsp[this.gn("reflx", medepth)].value = refl === 0 ? 1 : -1;
                    if (oldrender) {
                        var s_tartgno = this.gn("S_" + item.subname + "_start");
                        var e_ndgno = this.gn("S_" + item.subname + "_end");
                        var s_tarto = FIRST(genes[s_tartgno], item.start, 0);
                        var e_ndo = FIRST(genes[e_ndgno], item.end, 1);
                        for (let k = sribs; k > -1; k--) {
                            if (k < 0)
                                k = 0; // for final fractional rib
                            uniformsp[this.gn("active", medepth)].value = 0;
                            uniformsp[this.gn("rpbase", medepth)].value = s_tarto + k / sribs * (e_ndo - s_tarto); //<< todo factor in rref
                            uniformsp.k.value = k;
                            horns[item.subname]._compileh2a(genes, uniformsp, rendertarget, hset, key, num, hornid, subtype, refl);
                        }
                    }
                    else {
                        // n.b. _active and _rpbase NOT used as uniforms for 'modern' rendering, to check TODO
                        // it appears that they are NOT use as uniforms, but the active uniform values is used for information passing within javascript
                        // copied into xuniforms by captureUniforms()
                        // it seems the important one is ...
                        //// if (!WA.noztestact) {
                        uniformsp[this.gn("active", medepth)].value = 0;
                        //// }
                        uniformsp.k.value = 9999; // was undefined k, probably not used for !oldrender?
                        var subnum = num * Math.ceil(sribs + 1);
                        hset.parents[hset.hornid] = hornid;
                        horns[item.subname]._compileh2a(genes, uniformsp, rendertarget, hset, subkey, subnum, hornid, subtype, refl, item);
                    }
                } // refl
                if (this.hascage)
                    uniformsp[this.gn("reflx", medepth)].value = 1;
            } // i in _subs
        } // sub/head/tail
        this.logout(ddd, '_rendersubs');
    }
    ;
    /** symbolic compile for subs, called BEFORE sub compile itself run, but after parent compile run */
    _postcompilesub(uniformsp, rendertarget, hset, key, num, h, refl, parentHornid) {
        const ddd = this.login('_postcompilesub');
        var hornid = hset.hornid; // the hornid that will be active for that sub
        if (opmode !== 'postcompile')
            return;
        function c(name, val) {
            cc.push(name + "_" + hornid + " = " + val + ';');
        }
        const u = undefined;
        var cc = ['//' + key];
        // var ribs = this._resolve(this._ribs, "ribs"); // genes[this.gn("ribs")];
        var ribs = this._resolvesym(this._ribs, "ribs"); // genes[this.gn("ribs")];
        // c('ribs', ribs); // not needed
        //    var sribsgn = this.gn("S _" + h.subname + "_ num");
        //    if (this._genenames[sribsgn]) var sribs = genes[sribsgn];  // sometimes left over genes sribsgn not relevant to this object
        //var sribs = genes[sribsgn];
        //if (sribs === undefined) sribs = h.num;
        //if (sribs === undefined) sribs = ribs;
        var sribsgn = this.gn("S_" + h.subname + "_num");
        if (this._genenames[sribsgn])
            var sribs = sribsgn;
        else if (h.num !== u)
            sribs = h.num;
        else
            sribs = ribs; //???
        //c('sribs', sribs);
        hset.sribs[hornid] = sribs;
        if (genedefs[sribs]) { // test needed for subsfortailsouter = true, 6 Nov 23
            const help = genedefs[sribs].help;
            if (!help.match('mult:'))
                genedefs[sribs].help += ' mult:';
        }
        //var start = FIRST(genes[startgn], h.start, 0);
        //var end = FIRST(genes[endgn], h.end, 1);
        var startgn = this.gn("S_" + h.subname + "_start");
        var endgn = this.gn("S_" + h.subname + "_end");
        if (startgn in hset.geneDefaults)
            var start = startgn;
        else if (h.start !== u)
            start = h.start;
        else
            start = '0.';
        if (endgn in hset.geneDefaults)
            var end = endgn;
        else if (h.end !== u)
            end = h.end;
        else
            end = '1.';
        //c('start', start);
        //c('end', end);
        var range = +end - +start;
        range = isNaN(range) ? '(' + end + ' - ' + start + ')' : floatstring(range);
        // c('range', '(' + end + '-' + start + ')');
        var lev = key.split(KSEP).length - 2; // -2, -1 because split works that wya, -2 because this level is already in the key
        if (lev === 0)
            var o = 'a.x';
        else if (lev === 1)
            o = 'a.y';
        else if (lev === 2)
            o = 'a.z';
        else if (lev === 3)
            o = 'a.w';
        else if (lev === 4)
            o = 'b.x';
        else if (lev === 5)
            o = 'b.y';
        else if (lev === 6)
            o = 'b.z';
        else if (lev === 7)
            o = 'b.w';
        var medepth = key.split(KLEFT + this.name + KRIGHT).length - 2; // -2, -1 because split works that way, -2 because this level is already in the key
        var pn = this.gn("par", medepth);
        var reflxn = this.gn("reflx", medepth);
        //cc.push(pn + o + ' = range_' + hornid + ';');
        if (!hset.parentcode)
            hset.parentcode = [];
        if (sribs % 1 === 0)
            sribs = `float(${sribs})`;
        hset.parentcode[hornid] =
            pn + o + ' = ' + range + ';\n' +
                this.gn('rpbase') + ' = ' + floatstring(start) + ';\n' +
                ((this.hascage) ? (reflxn + ' = ' + (refl ? '-1.' : '1.') + ';\n') : "") +
                'k' + o + ' = ' + sribs + ';\n'; // k was parnums
        var pcode = Horn.parentcode(key, hset);
        pcode.push(hset.parentcode[hornid]);
        hset.code[hornid] = '\n' + pcode.join('\n') + '\n' + cc.join('\n');
        this.logout(ddd, '_postcompilesub');
    }
    /** code to generate parent details */
    static parentcode(key, hset) {
        if (!hset.code)
            hset.code = [];
        var keys = key.split(KSEP).slice(1);
        var pcode = [];
        for (let i = 0; i < keys.length; i++) {
            var kk = keys[i].split(KRIGHT)[1];
            //pcode.push(kk);
            if (hset.parentcode[kk])
                pcode.push(hset.parentcode[kk]);
        }
        return pcode;
    }
    /** render a horn and subhorns
     * key is the list of subhorns this is nested (as string for easier copy)
     * num is the cumulative (product) number of instances of this
     was renderh */
    _compileh2a(genes, uniformsp, rendertarget, hset, key, num, parentHornid, subtype, refl, item) {
        const ddd = this.login('_compileh2a');
        var hornid = hset.hornid++; // claim my hornid
        if (key.split(KSEP).length > 8)
            return; // could happen if self-recursion given too big a value
        const medepth = key.split(KLEFT + this.name + KRIGHT).length - 1;
        const depth = U.horndepth[hornid] = (parentHornid == -999) ? 0 : U.horndepth[parentHornid] + 1;
        const vdepth = U.hornvdepth[hornid] = (parentHornid == -999) ? 0 : U.hornvdepth[parentHornid]
            + (hset.hornrun[parentHornid].horn._radius === undefined ? 0 : 1);
        hset.hornrun[hornid] = { hornid, medepth, horn: this, hornname: this.name,
            start: -999, totnum: -999, cumnum: -999, num: -999, res: -999, key, parentHornid, subtype,
            depth, item,
            ribs: -999, refl }; // sribs: '?sribs', defribs: -999, parents: -999, , code: '?code'
        // hset._adduniformX('cum count' + hornid, 0, "f", true);  // this really is a uniform even for singlemulti
        //framelog("_compileh2a", this.name, hset.hornid);
        /***** parents now recorded just before each _compileh2a is called .. corrected for head/tail
        if (opmode === 'postcompile') {
            var keysplit = key.split('+ ');  // <<< todo simplify
            var parents = 0;
            for (let i=1; i < keysplit.length; i++) {
                parents = keysplit[i].post('~ ') * 1;
            }
            hset.parents[hornid] = parents;
        }
        /*****/
        hset.ribshow += this.name + "/" + num + "(";
        let i;
        const ribs = this._resolve(this._ribs, "ribs"); // genes[this.gn("ribs")];
        // make sure rref set up right if not defined in old version
        // ++++ to check if we should worry about regressive genes, ? check hset.geneDefaults ?
        var rrefgn = this.gn("rref");
        if (genes[rrefgn] === undefined) {
            genes[rrefgn] = ribs; // rref not defined, probably not used as gene but just in case ...
        }
        var rref = genes[rrefgn]; //++++ ? check hset.geneDefaults ?
        // temp code to experiment with steering and old planets
        // which don't have properly defined rref
        if (hoverSteerMode)
            rref = 0;
        if (rref === 0 && uniformsp[rrefgn] !== undefined)
            uniformsp[rrefgn].value = ribs; // rref === 0
        uniformsp.dribs.value = ribs;
        this._compileh2b(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid, parentHornid, subtype);
        this._compilesubs(genes, uniformsp, rendertarget, hset, key, num, ribs, hornid, parentHornid, subtype);
        var horns = hset.horns;
        var subkey = key + KSEP + 0 + KLEFT + this.name + KRIGHT + hornid; // <<< TODO + 0 + should be + refl +
        var pcode = Horn.parentcode(subkey, hset);
        //*** * /
        const hr = hset.hornrun[hset.hornid];
        if (!HornSet.subsfortails) { // we must do the heads and tails the old (pre April 2019) way
            for (i in this._tail) {
                uniformsp[this.gn("active", medepth)].value = 0;
                uniformsp[this.gn("rpbase", medepth)].value = 1; // rref allowed for in setupcode
                if (opmode === 'postcompile') {
                    hset.sribs[hset.hornid] = 0;
                    hset.parents[hset.hornid] = hornid;
                    hset.code[hset.hornid] = '// tail code here' + subkey + "\n" + pcode.join('\n') + '\n  ///// end tail code';
                }
                horns[this._tail[i]]._compileh2a(genes, uniformsp, rendertarget, hset, subkey, num, hornid, '_tail', 0); // ??? 19/11/2022 parentHornid);
            }
            for (i in this._head) {
                uniformsp[this.gn("active", medepth)].value = 0;
                uniformsp[this.gn("rpbase", medepth)].value = 0; // rref allowed for in setupcode
                if (opmode === 'postcompile') {
                    hset.sribs[hset.hornid] = 0;
                    hset.parents[hset.hornid] = hornid;
                    hset.code[hset.hornid] = '// head code here' + key + "\n" + pcode.join('\n') + '\n  ///// end head code';
                }
                horns[this._head[i]]._compileh2a(genes, uniformsp, rendertarget, hset, subkey, num, hornid, '_head', 0);
            }
        }
        /***/
        uniformsp[this.gn("rpbase", medepth)].value = INACTIVE;
        uniformsp[this.gn("active", medepth)].value = INACTIVE;
        hset.ribshow += ")";
        this.logout(ddd, '_compileh2a');
    }
    ;
    // toString() { return this._genecode; };
    htmlmainparm(genes, ggn) {
        var gn = this.gn(ggn);
        if (typeof this["_" + ggn] === "string") {
            var h = '<span class="' + ggn + ' gval" id="TR_' + gn + '">"' + this["_" + ggn] + '"</span>';
        }
        else {
            var xclass = (genedefs[gn] && genedefs[gn].free) ? ' gval' : ' gval frozen';
            h = '<span class="' + ggn + xclass + '" contenteditable="true" id="TR_' + gn + mmm + format(genes[gn]) + '</span>';
        }
        return h;
    }
    ;
    /** render this horn with given genes in hset context, key to prevent recursion and find hornid */
    html(genes, hset, key) {
        var hhhh = '" tabindex="0">';
        if (key.indexOf('<' + this.name + '+') !== -1)
            return;
        var subkey = key + this.name + '+';
        const hornid = hset.htmlkeyrun.indexOf(subkey);
        if (hornid === -1)
            return '??' + subkey;
        const xname = this.name + '/' + hornid;
        var h = "";
        h += '<fieldset class="horn" id="H_' + xname + hhhh;
        // towards adding open/close later
        // h += '<legend onclick="FCall(\'toggleFold\', this);">' + this.name +'</legend>';
        var leg = '<legend onclick="toggleFold(this);" oncontextmenu="horncontext(event);" ';
        h += leg + 'id="HL_' + xname + hhhh + this.name + '</legend>';
        // head, to right of horn and subs
        if (this._head.length !== 0) {
            h += '<fieldset class="tails heads">'; // << ??? check css later
            h += leg + '>heads</legend>';
            for (let i = 0; i < this._head.length; i++) {
                let ss = hset.horns[this._head[i]];
                if (ss)
                    h += ss.html(genes, hset, subkey);
            }
            h += '</fieldset>'; // heads
        }
        h += '<span class="hornpref">'; // allow trans to right of basics, horn and subs
        h += '<span class="horndetails">'; // details of this horn, radius.../stack...
        h += '<span class="hornname2" id="H2_' + xname + '"' + hhhh + xname + '</span>';
        h += '<span class="hornpref hornhead">'; // allow tails to right of all including subs
        if (this._radius !== undefined)
            h += this.htmlmainparm(genes, "radius");
        h += this.htmlmainparm(genes, "ribs");
        h += this.htmlmainparm(genes, "rref");
        h += '</span>'; // hornpref hornhead
        if (this.trans.length !== 0) {
            h += '<span class="trans">';
            for (let i = 0; i < this.trans.length; i++) {
                h += this.trans[i].html(genes, hset, xname, i);
            }
            h += '</span>'; // trans
        }
        h += '</span>'; // details of this horn, radius.../stack...
        if (this._sub.length !== 0) {
            h += '<fieldset class="subs">';
            h += leg + '>subs</legend>';
            for (let i = 0; i < this._sub.length; i++) {
                for (let rr = 0; rr < subrepeat; rr++) {
                    var si = this._sub[i];
                    let ss = hset.horns[si.subname];
                    if (ss) {
                        if (si.cage && rr === 0)
                            h += '<span class="note">ribcage</span>';
                        const r = ss.html(genes, hset, subkey);
                        if (r)
                            h += r;
                    }
                }
            }
            h += '</fieldset>'; // subs
        }
        h += '</span>'; // hornpref inclduing subs
        // tail, to right of horn and subs
        if (this._tail.length !== 0) {
            h += '<fieldset class="tails">';
            h += leg + '>tails</legend>';
            for (let i = 0; i < this._tail.length; i++) {
                var ss = hset.horns[this._tail[i]];
                if (ss)
                    h += ss.html(genes, hset, subkey);
            }
            h += '</fieldset>'; // tails
        }
        h += '</fieldset>'; // horn
        return h;
    }
    ;
    _newh(name, hset, genes, recurse) {
        const nn = hset._hornname(name);
        const prad = genes[this.name + '_radius'];
        const rad = rr() * (prad ? prad / 2 : Horn.newHornRadius);
        const pstack = genes[this.name + '_stack'];
        const stack = rr() * (pstack ? pstack / 2 : Horn.newHornStack);
        var sh = horn(nn, hset).ribs(10).radius(rad).stack(rr() * Horn.newHornStack)
            .twist(rr() * Horn.newHornTwist, new OptStruct({ k: rr() * Horn.newHornTwistOffset })).color();
        sh.mutateStructH(hset, genes, recurse);
        return nn;
    }
    /** add a sub for struct mutation or explicit */
    _addsub(hset, genes, recurse) {
        const nn = this._newh(this.name + 'S', hset, genes, recurse);
        this.sub(nn, rr() * 40);
    }
    ;
    /** add a tail for struct mutation or explicit */
    _addtail(hset, genes, recurse) {
        const nn = this._newh(this.name + 'T', hset, genes, recurse);
        this.tail(nn);
    }
    ;
    /** TODO addhead */
    /** and a tran op to horn trans list */
    _addtran(tran) {
        if (!tran._genecode)
            tran._genecode = [`#${this.name}_${tran.name}${this.trans.length}`];
        var pos = Math.random() * this.trans.length;
        const ttran = new Tran(tran.name, tran.opts);
        this.trans.splice(pos, 0, ttran);
    }
    ;
    // convert sub etc to string
    _tos(t, f) {
        if (f === 'sub' && t.cage)
            f = 'ribcage';
        let s = `.${f}('${t.subname}'`;
        s += ', ' + (t.num !== undefined ? toJava(t.num) : 'undefined');
        s += ', ' + (t.start !== undefined ? toJava(t.start) : 'undefined');
        s += ', ' + (t.end !== undefined ? toJava(t.end) : 'undefined');
        s += ', ' + (t.depth !== undefined && t.depth !== '2' ? toJava(t.depth) : 'undefined');
        s += ')';
        for (let i = 0; i < 5; i++)
            s = s.replace(', undefined)', ')'); // remove all unneeded trailing undefined
        return s;
    }
    /** string version of tranrule */
    toString() {
        let s = `horn('${this.name}')`;
        if (this._radius)
            s += `.radius(${toJava(this._radius)})`;
        if (this._ribs)
            s += `.ribs(${toJava(this._ribs)})`;
        if (this._ribdepth)
            s += `.ribdepth(${toJava(this._ribdepth)})`;
        s += this.trans.map(t => `.${t.toString()}`).join('');
        s += this._sub.map(t => this._tos(t, 'sub')).join('');
        s += this._head.map(t => `.head('${t}')`).join('');
        s += this._tail.map(t => `.tail('${t}')`).join('');
        s += this._cols.map(t => `.color()`).join('');
        return s;
    }
    /** mutate a horn structure, in place */
    mutateStructH(hset, genes, recurse) {
        var r = Math.random();
        if (this.trans.length < 10) {
            if (rr() < 0.1)
                this._addtran(new Tran("twist", [360, new OptStruct({ k: 200 })]));
            if (rr() < 0.1)
                this._addtran(new Tran("bend", [90]));
            if (rr() < 0.1)
                this._addtran(new Tran("curl", [90]));
            if (rr() < 0.1)
                this._addtran(new Tran("stack", [1000]));
            if (rr() < 0.1)
                this._addtran(new Tran("scale", [2]));
        }
        var hornn = Object.keys(hset.horns).length;
        if (recurse && hornn < HORNSTYPES) {
            if (rr() < 0.4)
                this._addsub(hset, genes, false); // add subhorn
            if (rr() < 0.1)
                this._addtail(hset, genes, false); // add tail
        }
        // todo addhead
        this.arraymut(this.trans);
        this.arraymut(this._tail);
        this.arraymut(this._sub);
        const rn = this.name + '_radius';
        if (genes[rn] < 10)
            genes[rn] = 10; // don't hide things
    }
    ;
    /** mutate an array in place, can only swap or remove
    Don't know what type to add.  */
    arraymut(arr) {
        if (arr.length === 0)
            return;
        let pos = arr.length * rr();
        if (rr() < 0.1) { // swap adjacent
            var rem = arr.splice(pos, 1);
            if (rem[0] === undefined) {
                var debug = 0;
            }
            else {
                arr.splice(pos + 1, 0, rem[0]);
            }
        }
        if (rr() < 0.1) { // remove random
            arr.splice(pos, 1);
        }
        return arr; // not generally used
    }
}
Horn.newHornStack = 400;
Horn.newHornRadius = 80;
Horn.newHornTwist = 770;
Horn.newHornTwistOffset = 70;
; // end Horn
function getHornSet(genes) {
    if (!genes)
        return undefined;
    const tranrule = genes.tranrule; // .pre('SynthBus');
    if (tranrule === 'matrix')
        return undefined;
    let hset = _hornSets[tranrule];
    if (!hset) {
        hornTrancodeForTranrule(tranrule, genes, false);
        hset = _hornSets[tranrule];
    }
    return hset;
}
// Object.defineProperty('currentHset', {
//     get: _=> xxxgenes().
// });
function xxxhset(xxx) {
    if (xxx instanceof HornSet)
        return xxx;
    const genes = xxxgenes(xxx);
    return getHornSet(genes);
}
function showtran(x) {
    const hset = xxxhset(x);
    console.table('###~~~', hset.toString());
}
var lastRevFrame = 0; // last frame a reverse happened
var hhh = '" tabindex="0" ';
hhh += ' onmousemove="hornHtmlMousemove(event);"';
hhh += ' onmouseover="hornHtmlMouseover(event);" ';
hhh += ' onmouseout="hornHtmlMouseout(event);" ';
hhh += ' onkeydown="hornHtmlKeydown(event);" ';
hhh += ' onkeyup="hornHtmlKeyup(event);" ';
hhh += '>';
W.htmlrulebox.tabIndex = 0;
W.htmlrulebox.onmousemove = hornHtmlMousemove;
W.htmlrulebox.onmouseover = hornHtmlMouseover;
W.htmlrulebox.onmouseout = hornHtmlMouseout;
W.htmlrulebox.onkeydown = hornHtmlKeydown;
W.htmlrulebox.onkeyup = hornHtmlKeyup;
var rr = Math.random;
// establish the user version of all the horn functions
// eg stack() { return this._addtrlow('stack', arguments); };
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
W.trancontextmenu.innerHTML = menu;
{ // make Horn functions such as stack() from $stack()
    const HP = Horn.prototype;
    const hhhp = Object.getOwnPropertyNames(HP); // HP; // new this.Horn();
    for (let op of hhhp) {
        if (op[0] === "$") {
            var opp = op.substring(1);
            if (opp[0] === "x") {
                // avoid functions $x.
                // if we really need one, we must change the prefix or use other mechansim
                serious("HORN FUNCTION STARTS $x WILL NOT WORK: " + op);
            }
            else {
                HP[opp] = Function("return this._addtrlow('" + opp + "', arguments);");
                HP["x" + opp] = Function("return this;  ");
                menu += '<p onclick="newop(event)">' + opp + '</p>';
            }
        }
    }
}
/** use more sensible skelbuffer for OPMAKESKELBUFF */
function checkskelbuffer(num, width) {
    num = nextpow2(num);
    width = nextpow2(width);
    if (isNaN(uniforms.skelbufferRes.value.x + uniforms.skelbufferRes.value.y))
        minimizeSkelbufferW();
    // checkskelbuffer(num*width); // temp during update
    uniforms.skelbufferRes.value.x = Math.max(uniforms.skelbufferRes.value.x, width);
    uniforms.skelbufferRes.value.y = Math.max(uniforms.skelbufferRes.value.y, num);
}
/** minimize size of skelbuffer/skelbuffer */
function minimizeSkelbufferW(low = 1) {
    if (uniforms.skelbufferRes.value.x === low)
        return;
    uniforms.skelbufferRes.value.set(low, 1);
    skelbuffer = 0;
    onpostframe(() => log('minimized skel buffer', skelbuffer.width, skelbuffer.height, 'frame', framenum));
}
window.minimizeSkelbuffer = minimizeSkelbufferW;
/** make sure skelbuffer big enough for required use */
function checkgbuffer(size) {
    if ((opmode === OPMAKESKELBUFF) && size > uniforms.skelbufferRes.value.x * uniforms.skelbufferRes.value.y) {
        var rr = size;
        rr = Math.ceil(rr / uniforms.skelbufferRes.value.x);
        rr = nextpow2(rr);
        if (rr > 4096) {
            console.log("required skelbuffer res too large " + rr);
            rr = 4096;
        }
        console.log(">>>> skelbufferRes overrun, set to " + rr);
        uniforms.skelbufferRes.value.y = rr;
    }
}
//this.HornSet = function() {
//"use strict";
export class HornSet {
    static current() { return currentHset; }
    // 7 July 2021, a bug in handling of Qfirst_S _Qsub_start etc meant *** the head was being placed on the tail true;
    // must fix *** above, meanwile don't use subsfortails
    // partly fixed, but not completely, 7 July 21
    // String.prototype.replaceall = function (a, b) { return this.split(a).join(b); };  // convenience function
    // 9 July 2021, discovered a bug in horn compilation that sometimes got tails wrong
    // orderbug = true will explicitly readd that bug for backward compatibility
    constructor() {
        this.horns = {};
        //var trancode;
        this.varyings = ""; // code varyings for rp values etc <<< TODO DEAD??
        this.setupcode = ""; // code for setting up rp values etc
        this.pickoutput = ""; // code for returning pick information
        //segnames;   // names for horn segments
        this.trancode = ""; // accumulated transform code
        this.pretranrule = ""; // code to insert just before the tranrule
        this._genecode = ""; // accumlated code showing gene names
        this.uniforms = ""; // accumlated code for uniforms
        this.addedUniforms = {}; // list of uniforms already added
        this._springMap = undefined; // set to true or array for automated spring mapping
        this._gcode = ""; // global code, eg for extra variables
        this._saveposset = {}; // set of savepos done, with true if not yet resolved
        this.gbuffoffsets = []; // keep track of skelbuffer/skeleton offsets after set by OPMAKESKELBUFF
        this.skelnum = []; // keep track of skelbuffer/skeleton resolutions after set by OPMAKESKELBUFF
        // horn so lo = undefined;       //name of so lo horn; now use hornhighlight && keysdown.includes('shift')
        this.hornhighlight = undefined; // name of highlight hoen
        this.geneDefaults = {}; // cut, pulse, etc may set this before compile
        this.wallgenes = {};
    }
    // const HornSetP = this;
    // var first, sub, tail, branch, twig;  // needed for backward comptability with some saved files
    /** break the tranrule into graphics and audio parts */
    static makeParts(tranrule) {
        //I may deprecate 'SynthBus' such that this method only gets used for old examples that use it.
        var pos = tranrule.indexOf('SynthBus');
        if (pos !== -1) {
            pos = tranrule.lastIndexOf('\n', pos);
            if (pos === -1) {
                throwe('No rule available before SynthBus line');
            }
            var synthCode = tranrule.substring(pos + 1);
            tranrule = tranrule.substring(0, pos);
        }
        else {
            //there's no synth code... we should make sure any leftover stuff gets cleared
            synthCode = '';
        }
        return [tranrule, synthCode];
    }
    /** parse the hornset to see if it is at all possible, return name of mainhorn */
    /*^^^async*/ parsehorn(tranrule, genes, testing = false) {
        if (!_testcompile)
            log('parsing horn', tranrule.substring(0, 40));
        /** called from within parsehorn */
        function tocompile(genes, hset) {
            var ugene = gene; // for historic usage
            var pretranrule = '', posttranrule = '', postautoscale = '', luniforms = {}, overrides = '', endoverrides = '', extraIncludes = '', mainhorn = undefined;
            nop('$$$');
            return { pretranrule, posttranrule, postautoscale, mainhorn, luniforms, overrides, endoverrides, extraIncludes };
            // so the tranrule can define genes if needed
            function gene(name, def, min, max, delta, step, help, tag, free, useuniform = true) {
                hset._addgeneHS(name, def, min, max, delta, step, help, tag, free, useuniform, genes);
            }
            function _pulse(name) {
                var n = name + "_";
                gene(n + 'pulserate', 1, 0, 1, 0.001, 0.001, 'rate for pulse efect', 'dyn', 0);
                gene(n + 'pulseperhorn', 1, 0, 3, 0.1, 0.1, 'number of pulses per horn', 'dyn', 0);
                gene(n + 'pulsepow', 5, 0, 21, 0.1, 0.01, 'power to make pulse strong', 'dyn', 0);
                gene(n + 'pulsescale', 0.1, 0, 1, 0.001, 0.001, 'scale for pulse efect', 'dyn', 0);
                gene(n + 'pulsemodrate', 0.7, 0, 5, 0.001, 0.001, 'FM mod ratio for pulse', 'dyn', 0);
                gene(n + 'pulsemodscale', 0.2, 0, 1, 0.001, 0.001, 'FM mod scale for pulse', 'dyn', 0);
                gene(n + 'pulsemax', 100, 0, 1000, 1, 1, 'max amount for pulse', 'dyn', 0);
                gene(n + 'pulseendfade', 0.05, 0, 1, 0.001, 0.001, 'portion of horn ends to fade the pulse effect', 'dyn', 0);
                // var p = "pulsescale  * pow(0.5 + 0.5 * sin(6.283185307179586 * (time * pulserate  - crp * pulseperhorn  + pulsemodscale / max(pulsemodrate, 0.01)  * sin(time * pulserate * pulsemodrate ))), pulsepow )";
                var p = "(pulserate, pulseperhorn, pulsepow, pulsescale, pulsemodrate, pulsemodscale, pulsemax, pulseendfade, crp, xrscale, rp, time)";
                p = 'pulsex' + p.replace(/pulse/g, n + 'pulse');
                return p;
            }
            // for backward compatability
            function pulser(name) {
                return pulsermult(name);
            }
            // pulse applied to radius
            function pulsermult(name) {
                const rr = 'xrscale = ' + _pulse(name) + ';\n';
                // log('pulser output', rr);
                postautoscale += rr; // for postautoscale implicit in tranrule .. before 22Mar2024, was posttranrule
                return rr; // for postautoscale = ... explicity in tranrule (backward compatability)
            }
            /** generate one or more cut planes
             * Using max means the cuts are effectively ORed.
             * The leaveid is common over all
             *
             * If a second instance of cut() is used that will be ANDed with the first,
             * and could have separate leaveid.
             *
             * if leavid < 998 it cuts all but cut_leaveid (backwards compatibility)
             * if leavid > 998, each horn is cut using cutoffset which is set on a per horn bases (XXX_cutoffset)
             * unless XXX_cutoffset > 999998 in which case it is not cut at all
             */
            function cut(pnames, perHornOffset = false) {
                const u = undefined;
                let names = pnames;
                if (typeof pnames === 'string')
                    names = [names];
                else if (typeof pnames === 'number')
                    names = new Array(names).fill(0).map((x, i) => 'cut' + i);
                setInput(WA.SHARPPOINT, true); // needed for good cutting
                const leaveid = (typeof pnames === 'number') ? 'cut_leaveid' : names[0] + "_leaveid";
                let rr = '';
                gene(leaveid, 999, 3, 30, u, 1, "id of honrun to leave uncut, >998 is on per hon bases", 'cut', 0);
                rr += `if (${leaveid} < 998.) cutoffset = xhornid == round(${leaveid}) ? 999999. : 0.;`; // backwards compatibility
                rr += `{float mm = 0.;`;
                for (const name of names) {
                    var n = name + "_";
                    gene(n + "vang", 0, -1800, 1800, u, 1, "vertical rotate for cut (degrees)", 'cut', 0);
                    gene(n + "hang", 0, -1800, 1800, u, 1, "horizontal rotate for cut (degrees)", 'cut', 0);
                    gene(n + "off", 0, -1000, 1000, u, 1, "offset of cut from centre", 'cut', 0);
                    gene(n + "range", 100, 0, 200, u, 1, "width of cut offset (progressive cut, big number long spike)<br>big gives smoother animation", 'cut', 0);
                    gene(n + "sharp", 0.2, 0, 2, u, 0.1, "sharpness of cut<br>adjust profile of cut end", 'cut', 0);
                    let p;
                    p = "cutxf(Xvang, Xhang, Xoff, Xrange, Xsharp,x,y,z, cutoffset)";
                    p = p.replace(/X/g, n);
                    rr += `mm = max(mm, ${p});`;
                }
                rr += 'r *= mm;}';
                // log('cut code generated', rr);
                postautoscale += rr; // for postautoscale implicit in tranrule
                return rr; // for postautoscale = ... explicity in tranrule (backward compatability)
            }
        } // end tocompile
        let answer;
        try {
            //if (this.preParse && tranrule !== 'horn("main");') this.preParse();
            if (tranrule !== 'horn("main");') {
                Maestro.trigger('preParse');
                //if (!W.SynthBus && tranrule !== 'horn("main");') {   // no synthesizer ready yet
                tranrule = HornSet.makeParts(tranrule)[0];
            }
            this.hornrule = tranrule; // just the horn part of the full tranrule
            let trstruct, usetranrule;
            // the will get the horns if there has been structure mutation
            if (tranrule.startsWith('yaml:')) {
                trstruct = dstring(tranrule.substring(5));
                this.horns = trstruct.horns;
                usetranrule = trstruct.basetranrule;
            }
            else {
                usetranrule = tranrule;
            }
            // In the 'old' no structure mutate example this will get all details including horns from tranrule
            // In the structure mutate case it will get all the other information.
            // In that case it will also get a spurious set of pre-mutate horns
            this.horns = {};
            var tocompiles = tocompile.toString().post('{').slice(0, -1);
            var fun = tocompiles.replace("nop('$$$');", usetranrule);
            _defaultHornSet = this; // minimize active scope of nasty variable
            try {
                const ffun = safeFunction('genes', 'hset', fun); // errfun is Function, in errorHolder.js to prevent breaking on caught exceptions
                answer = /*^^^await*/ ffun(genes, this);
            }
            catch (e) {
                if (testing)
                    return { error: e };
                serious('cannot compile horn function', e);
                badshader = true;
                throw (e);
            }
            if (answer.posttranrule.contains('pulse')) {
                alert('pulse should now be in postautoscale, not posttranrule\nMove, but be careful of other details such as cut.');
            }
            if (tranrule === 'horn("main");') { // was also tranrule.contains('horn("Qsub").ribs(8).radius(15)') ||
                answer.mainhorn = 'notused';
                // const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;// may be useful
            }
            // If there was structure mutation use the structure mutation version of the horns.
            if (trstruct) {
                this.horns = trstruct.horns; // take the structure mutated horns, just replace the horns in basetranrule
            }
        }
        finally {
            _defaultHornSet = undefined;
        }
        var mainh = answer.mainhorn;
        copyFrom(this, answer);
        var luniforms = answer.luniforms;
        var lluniforms = Object.keys(luniforms);
        var sluniforms = lluniforms.length === 0 ? "" : "uniform float " + lluniforms.join(',') + ';';
        this.header = sluniforms;
        if (mainh instanceof Horn) {
            serious('??? parse returned Horn');
            mainh = mainh.name;
        }
        // this.mainh = answer.mainhorn;
        return answer;
    }
    ; // end parsehorn
    // check for changes to synthCode
    static monitorSynthdef() {
        if (!WA.hornSynth || noaudio)
            return; // synth code not present, probably CSynth
        // Issues with multiple hornSets in some cases.
        // We assume that the audio always belongs to the main viewport here, using xxxgenes().tranrule
        // and that whatever happens in other viewports is irrelevant.
        // We had a bug when currentHset was being set inappropriately in tad.tadskel() which is now fixed,
        // but simpler and easier just to use xxxgenes().tranrule and not bother with currentHset.tranrule (HornSet.current())
        const tranrule = xxxgenes().tranrule;
        const synthCode = HornSet.makeParts(tranrule)[1];
        if (synthCode === mutSynthPendingCode)
            return; // quiet, this is the normal case.
        if (synthCode !== '' && !noaudio) {
            WA.mutSynthPendingCode = synthCode;
            msgfixlog('tad+', 'monitorSynthdef triggering newHornSynth');
            Maestro.triggerCheck('newHornSynth');
        }
        else {
            // msgfixlog('tad+', 'monitorSynthdef NOT triggering');
        }
    }
    _addgeneHS(gn, def, min, max, delta, step, help, tag, free, useuniform = true, genes) {
        if (tag === undefined)
            tag = "geom";
        addgene(gn, def, min, max, delta, step, help, tag, free, undefined, useuniform, undefined, genes);
        this.geneDefaults[gn] = def;
        const gv = genes ? genes[gn] : def; // for fixed value in case of parseUniformsFixhorngenes
        this._adduniformX(gn, def, undefined, true, useuniform, gv);
        // moved to _adduniformX, 15/07/2021
        // if (useuniform !== false) this.uniforms += WA.parseUniformsFixhorngenes    // fix shader defined genes for performance test, does not appear to help, June 2016
        //     ? "#define " + gn + " " + gv.toFixed(6) + "\n"
        //     : "uniform float " + gn + ";\n";
        // commented out below, sjpt 6 June 2016 and moved to this._expr where a value has been explicitly specified.
        // Previously, some values (eg stardepth) were overwritten when loading a new hornrule (even if explicity set in the hornrule code)
        // If we are doing a full load form saved, establishing the saved should ensure they are set correctly.
        // if (tag !== "horncol")  // do not override colour for horncol
        //     current Genes[gn] = target[gn] = s;
        return gn;
    }
    ;
    /** add a 'uniform'.
    Where each horn type is rendered separately these really are uniforms.
    For SINGLEMULTI they are compulted internally to the shader, except here forceunirofom set (eg for cumcount values)
    */
    _adduniformX(gn, def, type = 'f', forceuniform = false, useuniform = true, gv = def) {
        if (this.addedUniforms[gn])
            return;
        var types = { f: "float", v3: "vec3", v4: "vec4" }; // types we use for automatic uniforms
        type = type || "f";
        var ty = types[type];
        var cuniform = inputs.SINGLEMULTI && !forceuniform ? "" : 'uniform ';
        if (useuniform !== false)
            this.uniforms += WA.parseUniformsFixhorngenes // fix shader defined genes for performance test, does not appear to help, June 2016
                ? "#define " + gn + " " + gv.toFixed(6) + "\n"
                : cuniform + ty + " " + gn + ";\n";
        // this.uniforms += cuniform + ty + " " + gn + ";\n";  // will be real uniform for old usage, global for single pass multihorn
        // log('adduniformx', name, type)
        adduniformX(gn, def, type, 'hornx');
        this.addedUniforms[gn] = true;
    }
    ;
    /** set up a horn given definition */
    /*^^^async*/ _setuphorn(tranrule, genes) {
        /** let answer:_parseret = **/ /*^^^await*/ this.parsehorn(tranrule, genes); // parsehorn will set mainhorn etc
        if (!this.mainhorn)
            return undefined;
        setHornSet(tranrule, this);
        this._compilehs(tranrule, genes);
        return this;
    }
    ;
    /** get the main horn as a horn, not as a name */
    getmain() {
        if (!this.mainhorn)
            this.mainhorn = 'main';
        if (!this.horns[this.mainhorn])
            this.mainhorn = Object.keys(this.horns)[0];
        const r = this.horns[this.mainhorn];
        if (!r)
            console.error('no main horn found');
        return r;
    }
    ;
    //######### todo use genes
    _addgenespec(gn, s, min, max, delta, step, help, tag, free, genes) {
        this._addgeneHS(gn, s, min, max, delta, step, help, tag, free, undefined, genes);
        HornSet.specgenes[gn] = true;
    }
    ;
    _compilehs(tranrule, genes) {
        if (HornSet._incompilehs)
            serious('recursive call to _compilehs');
        msgfix('horndepth'); // clear if needed
        HornSet._incompilehs = true;
        try {
            this._compilehsI(tranrule, genes);
        }
        finally {
            HornSet._incompilehs = false;
        }
    }
    /** compile a hornset from structure, create trancode, _genecode etc */
    _compilehsI(tranrule, genes) {
        logdepth = 0;
        // make sure all the compile collection items have been (re)initialized
        //        this.xxxtranrule = skelReplace(genes.tranrule, this.horns);
        this.varyings = "";
        this.setupcode = "";
        this.pickoutput = "";
        // this.uniforms = ""; // initialized earlier as may be set by parse
        // this.addedUniforms = {}; // initialized earlier as may be set by parse
        this.segnames = [-999, -998]; // first slots are for raw x,y position, so reserve them; names -99x irrelevant
        this.code = [];
        this.parentcode = [];
        this.parents = [];
        this.sribs = [];
        this.sribs[3] = 0; // name for subcount gene
        //this.ribs = [];                     // #subhorns
        this.defribs = []; // definition for #subhorns (to allow precise placement)
        this.hornid = 3; // keep track, and don't use 0,1,2 as can be confused with background 0, opacity 1, cubemap 2
        this.hornrun = []; // set of horns that will be called in a complete run
        this._saveposset = {}; // set of savepos done, with true if not yet resolved
        // sjpt 14 July 2023 _basetranrule was set but never read, so commented out (at least for now)
        //???? if (!genes._basetranrule) genes._basetranrule = tranrule;
        // _basetranrule will be the pre structure mutation tranrule,
        // used to reconstruct non-horn details from the tranrule such as synth, bulges etc
        if (tranrule === 'dynamic') {
            // tranrule = 'mutatemain_' + HornSet.mutateStructHsId++;
            // tranrule = 'yaml:' + yamlSave({
            //     horns: this.horns,                  // this will hold the mutated horns
            //     basetranrule: genes._basetranrule,       // this will hold the original tranrule, including synthbus and special details such as pulse, and irrelevant horns
            //     // TODO review how these should be set
            //     endoverrides: "",
            //     extraIncludes: "",
            //     luniforms: {},
            //     mainhorn: "Qfirst",
            //     overrides: "",
            //     posttranrule: "",
            //     postautoscale: "",
            //     pretranrule: ""
            // });
            tranrule = skelReplace(genes.tranrule, this.horns);
            setHornSet(tranrule, this);
        }
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
        this._adduniformX("dribs", 1); // #ribs in active; does not change with makeribs() eg for tadpoles, only used for texribs 2d texture
        this._adduniformX("radius", 0); // radius for active
        adduniformX("hornid", 0, 'f', 'hornx'); // keep track of which horn being rendered
        adduniformX("extrahornid", 0, 'f', 'hornx'); // keep track of which horn being rendered when doing multiple passes
        //ces for sub/sub/sub
        // <<< clarify below
        var u = undefined;
        this._addgenespec("time", 0, -1, 1, u, 0.1, "time", "system", "frozen", genes);
        this._addgenespec("nstar", 7, 0, 6, u, 0.1, "<b>number</b> of points in profile star", "geom", 'free', genes);
        this._addgenespec("stardepth", 0, -0.5, 0.5, u, 0.01, "<b>depth</b> of indents in profile star", "geom", 'free', genes);
        this._addgenespec("ribdepth", 0.0, 0, 1, u, 0.01, "depth of ribs", "geom", "free", genes);
        this._addgenespec("gscale", 1, 0, 100, u, 0.1, "global scaling, used automatically for autoscale", "system", "frozen", genes);
        //this._addgenespec("badnormals", 2, 0, 4, u, 1, "choice to take for backward facing normals<br>0=yellow, 1=ignore, 2=coerce, 3=flip, 4=coerce/flip", "system", "frozen");
        var mmsg = "How to compute normals etc for sweep.";
        mmsg += "<br>1: xmu cross random dir; twist where they clash";
        mmsg += "<br>2: cross of two adjacent directions, random when all straight";
        mmsg += "<br>3, use TRY2 unless very nearly straight, in which case TRY1";
        mmsg += "<br>4, track an offset point through the transforms";
        // define as gene if wanted this._addgenespec("NORMTYPE", 4, 1, 4, u, 1, mmsg, "system", "frozen");  // fixed in shader, remove from here to reduce confusion
        var mainh = this.getmain();
        mainh._compileh1([], [], this, genes); // compile all the horns, checking for cirular references
        for (let hh in this._saveposset) {
            if (this._saveposset[hh] === true)
                this.trancode += "addpos(save_" + hh + ");\n";
            this.trancode = "vec3 save_" + hh + " = vec3(0.,0.,0.);\n" + this.trancode;
        }
        this._genecode += 'mainhorn="' + mainh.name + '";';
        this.trankey = this._genecode;
        // this.bundle = this;  // work towards retiring this.bundle
        if (tranrule !== 'horn("main");') {
            // if (genes === xxxgenes())   // <<<<< ??? TODO, how should currentHset be protected from non-main pane tranrules, this doesn't work
            currentHset = this;
            genes.tranrule = tranrule;
            // currentGenes.tranrule = tranrule;
            // monitorX(currentGenes, 'tranrule', genes)
            //if (!_testcompile) {
            var codes = codeForUniforms(this, genes);
            this.singlePassCode = codes[0];
            this.chooseHornCode = HornSet.interpCols ? '' : codes[1];
            //}
            // var tokill = 'opos---' + tranrule;
            // >>> TODO.  The line below is needed because with SINGLEMULTI a change in the tranrule with recompile
            // the lets getMaterial compile the OPOPOS code completely wrong.
            // We must find out why and fix, meanwhile this works as it forces a second getMaterial compile which is OK.
            //    onframe(function() {
            //        if (material.opos)
            //            material.opos[tranrule.pre('SynthBus')] = undefined;
            //    });
        }
        clearBigsceneSet(); //it should work between horns, ut doesn't seem to??? 23/11/2020
        return this; // .bundle;
    }
    ; // HornSetP._compilehs
    static htmlmain(genes = currentGenes) {
        if (!genes.tranrule)
            return "";
        var h = '<span class="hornset">';
        var hset = getHornSet(genes);
        // if (!hset.html keyrun) { // key in useful form for checking hornruns actually used
        //     // saves recreating the recursion check rules
        //     hset.html keyrun = hset.hornrun.map(x => x ? x.key.replace(/.*?<(.*?)>[^<]*/g, '+$1') + '+' + x.hornname + '+' : undefined);
        // }
        // if (!hset) {
        //     // need two hornTrancodeForTranrule
        //     // one is async called when we really want to parse a new tranrule (may be variant of parsetranrule)
        //     // one is sync and complains if called while call to async one is in progress
        //     hornTrancodeForTranrule(genes.tranrule, genes); hset = getHornSet(genes);
        // }
        h += hset.getmain().html(genes, hset, '+');
        return h + '</span>';
    }
    ;
    /** check horns and runs number to populate hornrun, cumcount etc
     * side effect to set hornrun related uniforms
     */
    _genhornrun(genes, uniformsp) {
        var cumcount = 0;
        this.mytotnum = [1]; // dummy for parent of starting horn hornid 3
        // this.ribs = [];
        for (let h = 3; h < this.hornrun.length; h++) {
            var hr = this.hornrun[h];
            if (!hr) {
                console.error('missing hornrun key', h, 'vn', xxxvn(genes));
                continue;
            } // <<<<<<<!!
            var sribs = this.sribs[h];
            let nsribs;
            if (isNaN(+sribs)) { // sribs is a gene anme
                nsribs = genes[sribs];
                if (nsribs < 0)
                    nsribs = genes[sribs] = 0;
            }
            else { // sribs is an absolute value
                nsribs = Math.max(0, +sribs);
            }
            // var nsribs = Math.max(0, ((!isNaN(+sribs)) ? +sribs : genes[sribs]) || 0);
            this.defribs[h] = nsribs;
            var ribs = hr.ribs = Math.ceil(nsribs) + 1;
            var mytotnum = hr.totnum = ribs * this.mytotnum[this.parents[h]];
            let show = typeof hr.horn._radius === 'string' || genes[hr.horn.gn('radius')]; // ok radius
            const kkk = keysdown.toString();
            if (this.hornhighlight) {
                if (kkk === 'Delete' && h === this.hornhighlight)
                    show = false; // <<< hide
                else if (kkk === 'Insert' && h !== this.hornhighlight)
                    show = false; // <<< solo
                else if (h == this.hornhighlight) { /// << highlight
                    var ccc = (frametime / 1000 % 1 > 0.5) ? 'red' : 'green';
                    for (let b = 1; b <= 3; b++)
                        COL.setG(ccc + b, h, 5, u, this);
                }
            }
            hr.start = cumcount;
            if (show)
                cumcount += mytotnum; // do not allow for rendering 0 radius
            this.cumcount[h] = hr.cumnum = cumcount;
            if (uniformsp) {
                uniformsp.cumcount.value[h] = cumcount;
                uniformsp.ribsa.value[h] = genes[hr.hornname + '_ribs']; // n.b. uniform for XXX_ribs will also be set
                uniformsp.lribdeptha.value[h] = genes[hr.hornname + '_ribdepth']; // n.b. uniform for XXX_ribs will also be set
            }
            this.mytotnum[h] = mytotnum;
        }
        this.fullHornCount = cumcount;
        if (cumcount > inputs.MAXHORNS_TO_RENDER)
            cumcount = inputs.MAXHORNS_TO_RENDER; // n/a to CSynth, but works ok
        this.horncount = cumcount;
        if (uniformsp)
            uniformsp.horncount.value = cumcount;
        return cumcount;
    }
    /** find parent position for start of each horn */
    parentplace() {
        const hrun = this.hornrun;
        // const dribs = this.defribs;
        const p = new Float32Array(this.horncount);
        p[0] = 0;
        for (let h = 4; h < hrun.length; h++) { // each hornrun, no parent/attachment for main h=3
            const hh = hrun[h];
            const parent = hh.parentHornid;
            const ph = hrun[parent];
            const pnum = ph.totnum;
            if (hh.totnum !== pnum * hh.ribs)
                console.error('wrong ribs');
            let si = hh.start;
            for (let pi = ph.start; pi < ph.cumnum; pi++) { // each parent horn
                for (let s = 0; s < hh.ribs; s++)
                    p[si++] = pi + ((s === hh.ribs - 1) ? 0.999 : s / (hh.ribs - 1));
            }
        }
        return p;
    }
    rendersinglemulti(genes, uniformsp, rendertarget, scenep) {
        if (_testcompile)
            return true;
        if (scenep && scenep.name.startsWith('sceneCode'))
            scenep = undefined; // old sceneCode not used by any multi ... todo retire that stuff completely
        if (inputs.resdyndeltaui !== 0)
            setInput(W.resdyndeltaui, 0); // << only works with 0 for now, everything must be regular
        const cumcount = this._genhornrun(genes, uniformsp);
        if (cumcount === 0)
            return true;
        if (!scenep) {
            // use standard multiscene but cheat the skelnum and gbuffoffset for now
            if (!HW.multiScenedummy)
                HW.multiScenedummy = { hornrun: { nohorn: {} }, trankey: '', gbuffoffsets: {}, skelnum: {} };
            HW.multiScenedummy.skelnum.nohorn = uniformsp.skelnum.value;
            HW.multiScenedummy.meshused = 0;
            //function multiScene(genes, num, key, dummy, hset, hornid)
            scenep = multiScene(genes, cumcount, "", false, HW.multiScenedummy, 'nohorn');
            if (!scenep.children[0]) {
                log('cannot rendersinglemulti: no scene children for ' /*?? + kkopmode */, opmode, oplist[opmode]);
                return false;
            }
            uniformsp.gbuffoffset.value = 0;
        }
        if (opmode === OPMAKESKELBUFF)
            checkskelbuffer(cumcount, (uniformsp.skelnum.value + 2 * uniformsp.skelends.value + 1));
        const mat = scenep.children[0].material;
        mat.wireframe = HW.usewireframe && (rendertarget.name === 'rtopos');
        if (usemask === -99) {
            mat.wireframe = opmode === 0;
            mat.needsUpdate = true;
        }
        rrender('bulkobject', scenep, render_camera, rendertarget);
        return true;
    }
    toString() {
        // const l = [];
        // for (const h of Object.values(this.horns)) l.push(h.toString());
        // return `${l.join('\n')}\nmainhorn='${this.mainhorn}';`;
        return skelReplace(this.tranrule, this.horns);
    }
    /** find the path for hornrun n */
    findPath(n, genes = currentGenes) {
        const p = this.parents;
        const tn = this.mytotnum;
        const gg = []; // list of genes contributing
        let gm = 1; // contibution of count from genes
        let km = 1; // contribution of count from fixed
        for (let k = n;; k = p[k]) {
            const h = this.hornrun[k];
            const hname = h.hornname;
            const pk = p[k];
            if (!pk)
                break;
            const ph = this.hornrun[pk];
            const phname = ph.hornname;
            const m = tn[k] / tn[pk]; // multiplier, should be integer
            if (m !== 1) {
                //let gn = phname + '_S _' + hname + '_ num';
                //if (!(gn in genes)) gn = phname + '_ribs';
                let gn = this.sribs[n]; // this should get the 'right' answer without experiment, or errors fro, unused genes
                if (gn in genes) {
                    gg.push({ gn, v: genes[gn], m });
                    gm *= m;
                }
                else {
                    km *= m;
                }
            }
        }
        return { gg, gm, km };
    }
    /** reduce the ribs for path to around given number */
    _reducePath(n, targ, genes = currentGenes) {
        const { gg, gm, km } = this.findPath(n, genes);
        const now = this.mytotnum[n];
        if (now < targ)
            return;
        // for now, reduce all equally, todo, reduce larget most
        const reduce = (targ / now) ** (1 / gg.length);
        const t = genes === currentGenes ? target : genes;
        for (let g of gg)
            target[g.gn] = genes[g.gn] * reduce;
    }
    /** reduce total number of horns based on given factor */
    static reduceHorns(dispobj = xxxdispobj(lastTouchedDispobj), fac = 0.8, genes = xxxgenes(dispobj)) {
        genes = xxxgenes(genes);
        const hset = xxxhset(dispobj);
        // recompoute totnum, might be wrong as hset shared between different dispobj, hornrun residual from last use
        hset._genhornrun(genes, uniforms);
        let max = 0, ii = -1;
        const hr = hset.hornrun;
        const tn = hset.mytotnum;
        for (let i = 0; i < hr.length; i++) {
            if (tn[i] > max) {
                max = tn[i];
                ii = i;
            }
        }
        hset._reducePath(ii, max * fac, genes);
        dispobj.render();
        if (inps.hovermode)
            onframe(() => dispmouseover({}, dispobj), 2); // force message, after render in next frame
    }
    /** reduce horns in selected dispobj to limit */
    static reduceHornsToLimit(dispobj = xxxdispobj(lastTouchedDispobj), fac = 0.8, genes = xxxgenes(dispobj), limit = inputs.MAXHORNS_TO_RENDER) {
        genes = xxxgenes(genes);
        const hset = xxxhset(dispobj);
        let i = 0;
        hset._genhornrun(genes, uniforms);
        const last = hset.fullHornCount;
        while (hset.fullHornCount > limit) {
            if (i++ > 100)
                return;
            const ffac = limit / hset.fullHornCount;
            HornSet.reduceHorns(dispobj, Math.max(ffac, fac), genes);
            copyFrom(genes, target);
            target = {};
            hset._genhornrun(genes, uniforms);
            if (hset.fullHornCount === last) {
                console.error('cannot reduce horn count, stuck at ', last);
                break;
            }
        }
    }
    /** reduce horns in all dispobj to limit */
    static reduceAllHornsToLimit() {
        slots.forEach(s => HornSet.reduceHornsToLimit(s.dispobj));
    }
    /** if on, control mutation by capturing individualDone event and reducing horns */
    static controlMutation(bool) {
        Maestro.remove("individualDone");
        if (bool) {
            Maestro.on("individualDone", e => {
                var { targDispobj, sdo1, sdo2 } = e;
                HornSet.reduceHornsToLimit(targDispobj);
            });
        }
    }
    /** mutate a HornSet */
    mutateStructHs(genes) {
        // copy here keeps things safe, but a bit expensive
        // TODO make sure we have cleaner path
        const s = [currentGenes, currentGenes.tranrule]; // todo, reduce importance of currentGenes, meanwhile save and restore
        currentGenes = undefined; // ensure nobody uses currentGenes who shouldn't
        try {
            WA.monitorX(window, 'currentGenes'); // and in particular nobody sneeks in a write of currentGenes
            const nhs = this.structCopy(); // deep copy, but only the interesting parts
            nhs.parentComplexity = this.hornrun.length;
            // mutate by mutating horns (may add sub or tail)
            for (let h in this.horns)
                nhs.horns[h].mutateStructH(nhs, genes, true); // use this.horns to get horn names, nhs.horns will be mutated during this loop
            // mutate by swapping sub roles ... very tentative
            const horns = Object.values(nhs.horns); // horns as array
            const nh = horns.length;
            for (let i = 0; i < 2; i++) {
                const h1 = horns[randi(nh)], h2 = horns[randi(nh)];
                if (h1 !== h2) {
                    [h1._sub, h2._sub] = [h2._sub, h1._sub];
                }
            }
            // // nhs._compilehs('dynamic', genes);
            const tranrule = genes.tranrule = nhs.tranrule = skelReplace(genes.tranrule, nhs.horns);
            //!!!!!!!!!!! special case till cutting more formal; make sure headtwig used if present
            const xxx = trancodeForTranrule(tranrule, genes);
            if (nhs.horns.headtwig && xxx.hornrun.filter(x => x.hornname === 'headtwig').length === 0) {
                WA.unmonitorX(window, 'currentGenes');
                [currentGenes, currentGenes.tranrule] = s;
                return this.mutateStructHs(genes);
            }
            return nhs;
        }
        finally {
            WA.unmonitorX(window, 'currentGenes');
            [currentGenes, currentGenes.tranrule] = s;
        }
    }
    /** make copy of main part of hornset, ready for mutation, save  */
    structCopy() {
        // // name2class doesn't understand classes, so teach it these
        // WA.xclass('HornSet', HornSet.prototype);
        // WA.xclass('Horn', Horn.prototype);
        // WA.xclass('Tran', Tran.prototype);
        const nhs = new HornSet();
        nhs.horns = deepCopy(this.horns, { hset: 1 });
        for (const h in nhs.horns)
            nhs.horns[h].hset = nhs;
        // const nhs = dstring(yamlSave(nhs1));  // make sure it is a deep copy
        // const nhs = deepCopy(nhs1);
        // // not needed as above was deep copy ... for (const h in nhs.horns) nhs.horns[h] = this.horns[h].structCopy(nhs);
        // needed as yamlSave loses undefined, so _cols = [undefined] is corrupted to []
        // for (let h in nhs.horns) if (nhs.horns[h]._cols.length === 0) nhs.horns[h]._cols = [undefined];
        //??for (const h in nhs.horns) nhs.horns[h] = this.horns[h].structCopy(nhs);
        nhs.mainhorn = this.mainhorn;
        // const hset2 = dstring(yamlSave(hset));  // make sure it is a deep copy
        return nhs;
    }
    /** create unique horn name based on name b */
    _hornname(b) {
        if (!this.horns[b])
            return b;
        for (let i = 2; i < 10; i++) {
            const nn = b + i;
            if (!this.horns[nn]) {
                this.horns[nn] = 'pending';
                return nn;
            }
        }
    }
    // /** clone a HornSet.  **/
    // clone() {
    //     var hs = cloneNoCircle(this);
    //     hs.__proto__ = HornSetP;
    //     for (let h in hs.horns) {
    //         hs.horns[h].__proto__ = HP;
    //         var trans = hs.horns[h].trans;
    //         for (let t = 0; t < trans.length; t++)
    //             trans[t].__proto__ = TR;
    //     }
    //     return hs;
    // };
    /** list of gene names used in HornSet */
    getgenenames() {
        var r = {};
        copyFrom(r, HornSet.specgenes);
        copyFrom(r, this.geneDefaults);
        // ?? copyFrom(r, this.luniforms); ?? found when making class
        for (var h in this.horns)
            copyFrom(r, this.horns[h]._genenames);
        if (this.getSynthGeneNames)
            copyFrom(r, this.getSynthGeneNames());
        return r;
    }
    ;
    /** convert ribs(xxx) to sub(...,xxx), ribsToNum */
    ribsToNum(genes) {
        if (genes === undefined) {
            for (const oo in currentObjects) {
                const dispobj = currentObjects[oo];
                xxxhset(dispobj).ribsToNum(dispobj.genes);
            }
            return;
        }
        genes = xxxgenes(genes);
        const nhs = this.structCopy();
        const gd = genes.ribdepth;
        genes.ribdepth = 1; // so each now individual
        let done = 0;
        for (const hn in nhs.horns) {
            const horn = nhs.horns[hn];
            for (const sub of horn._sub) {
                if (sub.num === undefined) {
                    sub.num = FIRST(genes[horn.name + '_ribs'], +horn._ribs);
                    const gd = genedefs[horn.name + '_ribs'];
                    if (gd) {
                        done++;
                        const sn = `${horn.name}_S_${sub.subname}_num`; // inherit most of new _S _ _num from old _ribs
                        addgene(sn, gd.def, gd.min, gd.max, gd.delta, gd.step, `number of ${sub.subname} as subhorns of ${horn.name}`, gd.tag, gd.free);
                        genes[sn] = sub.num; // keep current value of num
                        if (gd.max === 200)
                            gd.max = 1000; // now sensible to allow many more ribs
                    }
                }
            }
            genes[`${horn.name}_ribdepth`] = genes[`${horn.name}_ribdepth`] * gd;
        }
        // genes._basetranrule =  was set here but never used
        genes.tranrule = nhs.tranrule = skelReplace(this.tranrule, nhs.horns);
        updateGuiGenes(genes);
        log('converted ', xxxvn(genes), 'done=', done);
        return nhs;
    }
    /** set the horn highlight, will not work correctly if multiple hornruns end in same horn name  */
    setHighlight(horn) {
        if (horn === undefined)
            this.hornhighlight = undefined;
        else if (typeof horn === 'number')
            this.hornhighlight = horn;
        else {
            const r = this.hornrun.filter(r => r.hornname === horn);
            this.hornhighlight = r.length > 0 ? r[0].hornid : undefined;
        }
    }
}
HornSet.useColGenes = true; // false to use COL colours and ignore genes
HornSet.interpCols = false; // false generate xhornid from horn, false leave to interp
HornSet.tailsToHead = false;
HornSet.subsfortailsouter = true; // <<<<<<<<<<< bad bug where proper head/tail not working so changed to true. 6 Nov 2023
HornSet.subsfortails = false;
HornSet.orderbug = false;
HornSet.specgenes = {};
HornSet.mutateStructHsId = 0;
; // end class HornSet
HornSet.controlMutation(true);
WA.horn2html = HornSet.htmlmain;
//hack to avoid double-init of synth
setTimeout(() => Maestro.onUnique('preframe', HornSet.monitorSynthdef), 2000);
/** mutate the horn structure for given genes, with in/out dispobj for debug */
WA.mutateStructHs = function (genes, fromdo, todo) {
    const sgenes = {};
    copyFrom(sgenes, genes);
    const hset = getHornSet(genes);
    const nhs = hset.mutateStructHs(sgenes);
    sgenes.tranrule = nhs.tranrule;
    // console.log('~~smutate~~~', fromdo.vn, todo.vn, '\n', genes.tranrule, '\n', sgenes.tranrule);
    // console.table('~~~~~~~~~~~~~~~~~~\n' + nhs.toString());
    function col(n) {
        if (n <= 0)
            return;
        if (nhs.colgenenames) {
            COL.randcols2();
            COL.col2genes(sgenes);
        }
        else {
            onframe(() => col(n - 1));
        }
        todo.needsRender = 2;
    }
    col(20);
    return sgenes;
};
/** simple funtion for testing structure mutation */
WA.smtest = function () {
    resetMat();
    centrescalenow();
    setNovrlights();
    clearSelected();
    setInput('mutrate', 8);
    setInput(W.layoutbox, 5);
    if (vps[0] <= 1)
        setViewports([4, 4]);
    mutate({ structmutate: WA.mutateStructHs, onPopulationDone: slotstats });
};
/** code to translate tranrule as stored into transform code: direct by default */
function hornTrancodeForTranrule(tranrulea, genes, recurse = true) {
    // allow substitutions BEFORE looking in cache, but only in first part
    // no need for full makeParts
    // if (!genes.tranrule)
    //     debugger;
    // if (genes && tranrule !== "horn(\"main\");") genes.tranrule = tranrule;
    const tranrule = substituteExpressions(tranrulea);
    if (tranrule.indexOf("main") !== -1) {
        if (recurse && getHornSet(genes)) {
            getHornSet(genes).getgenenames(); // also puts into bundle
            var r = getHornSet(genes); // .bundle;
        }
        else {
            var nhs = new HornSet();
            nhs.tranrule = tranrule;
            r = /*^^^await*/ nhs._setuphorn(tranrule, genes);
            setHornSet(tranrulea, nhs);
        }
        //setTimeout( function() { kinectJupDyn.setup(r._springMap); }, 0);
        if (kinectJupDyn && r)
            kinectJupDyn.setup(r._springMap);
        return r;
    }
    else {
        throwe("support for old definition style removed");
    }
}
;
// These were defined externally, now moved inside HornWrapFun
// as when defined internally, problems with Chrome crashing on error in the eval/new Function call.
var _defaultHornSet; // needed to have evel in safer scope
/** convenience function for new horn, or shared horn */
/// type HornX = Horn & {ribs: ()=>HornX; rref: ()=>HornX; radius: ()=>HornX; stack: ()=>HornX; };
function horn(name, hset) {
    hset = hset || _defaultHornSet;
    if (hset.horns[name] && hset.horns[name] !== 'pending')
        return hset.horns[name];
    return new Horn(name, hset || _defaultHornSet);
}
WA.horn = horn;
WA.springMap = function (val, hset) { (hset || _defaultHornSet)._springMap = (val === undefined ? true : val); };
WA.gcode = function (val, hset) { (hset || _defaultHornSet)._gcode = val; };
/** directory of built hornsets, keyed by tranrule */
var _hornSets = {};
/** add to directory of built hornsets */
function setHornSet(key = undefined, val = undefined) {
    if (key === undefined) { //
        _hornSets = {};
    }
    else {
        _hornSets[key] = val;
        _hornSets[key.pre('SynthBus')] = val;
        const k2 = substituteExpressions(key);
        _hornSets[k2] = val;
        _hornSets[k2.pre('SynthBus')] = val;
    }
}
/** render by rendering mainhorn object, NOT a memner of HornSet */
function renderHornobj(genes, uniformsp, rendertarget, scenep, hset = getHornSet(genes)) {
    if (badshader)
        return;
    if (!genes.tranrule)
        return; // can happen in odd case where this is called with non-horn
    if (genes.tranrule.indexOf("main") === -1)
        return WA.oldrenderobj(genes, uniformsp, rendertarget);
    if (opmode !== OPPICK)
        prerender(genes, uniformsp); // todo cleaner path for pick, for now don't upset special camera
    //??? var hset = getHornSet(genes);
    // if (!hset) {
    //     hornTrancodeForTranrule(genes.tranrule, genes); hset = getHornSet(genes);
    // }
    hset.tranrule = genes.tranrule; // << ?? todo optimize hset.synthCode by detection of change here ??
    hset.ribshow = "";
    hset.horncount = 0;
    hset.cumcount = []; // keep track of the cumulative count for each hornid
    hset.meshused = 0;
    hset.hornid = 3; // keep track, and don't use 0,1,2 as can be confused with background 0, opacity 1, cubemap 2
    hset.parents[3] = 0;
    hset._renderscene = scenep;
    if (!uniformsp.gbuffoffset)
        uniformsp.gbuffoffset = { type: "f", value: 0 };
    hset.gbuffoffset = 0;
    // try a fast render assuming everything prepared
    if (inputs.SINGLEMULTI && scenep !== 'noscene')
        var done = hset.rendersinglemulti(genes, uniformsp, rendertarget, scenep);
    // If necessary do an initial  _compileh2a/_rendersubs recursion, which should complete the compileh recursion
    // This is mainly an extra prep between compile and rendersinglemulti render
    // A major part of this is setting up hornrun and xuniforms so they are ready for rendersinglemulti
    if (!done) {
        hset.getmain()._compileh2a(genes, uniformsp, rendertarget, hset, "", 1, -999, '_none', 0);
        hset.htmlkeyrun = hset.hornrun.map(x => x ? x.key.replace(/.*?<(.*?)>[^<]*/g, '+$1') + '+' + x.hornname + '+' : undefined);
        setGUITranrule(genes); // needs updating
    }
    postrender(genes, uniformsp);
    hobj = hset;
    hset.ribshow += "\nTOTAL=" + hset.horncount;
    // framelog("final gbuffoffset,", hset.lastgbuffoffset, "opmode", opmode, "horncount", hset.horncount, "meshused (M)", hset.meshused/1000000);
    if (HW.cubeEarly && (opmode === OPOPOS || opmode === OPSHAPEPOS)) {
        uniformsp.hornid.value = -1;
        if (opmode === OPOPOS)
            scenep = CubeMap.scene;
        CubeMap.RenderPass(genes, uniformsp, rendertarget, scenep);
    }
}
;
WA.oldrenderobj = WA.renderPass; // old one for legacy test
WA.renderPass = renderHornobj;
/** genecode for horn showing genes */
function genecode(genes = currentGenes) {
    trancodeForTranrule(genes.tranrule, genes); // make sure it is built
    var ret = getHornSet(genes)._genecode;
    return ret;
}
/** valuecode for hornset, with current values
 * currently disabled as does not reflect correct detail, in particular no synth stuff */
function NOTvaluecode(genes = currentGenes) {
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
function randrulemarry(genes, obj2) {
    var newrule = randrules(genes);
    trancodeForTranrule(newrule, genes); // make sure rule is established
    var newgenes = clone(genes);
    newgenes.tranrule = newrule;
    if (genes.tranrule.indexOf('horn') === -1)
        return newgenes;
    var genelist = getHornSet(newgenes).getgenenames();
    for (var g in genelist) {
        if (!(g in newgenes)) {
            var genename = g;
            newgenes[genename] = genedefs[genename].def;
        }
    }
    return newgenes;
}
;
/** this version uses instancing, for use with three.js v73 or later
 * It finds a slot in bigsceneSet if there, if not creates one.
 */
function multiScene(genes, num, key, dummy, hset, hornid) {
    if (_testcompile)
        return;
    // if (!newplane) return multiSceneOld(genes, num, key);
    // choose dynamic resolution factor based on number of ribs
    // dynamic resolution
    var rb = inputs.resbaseui - inputs.resdyndeltaui * (Math.log(num) / Math.LN10) - resdelta;
    rb = clamp(Math.ceil(rb), 0, HW.radnums.length - 1);
    hset.hornrun[hornid].num = num;
    hset.hornrun[hornid].res = rb;
    var dradnum = HW.radnums[rb]; // dynamic number round
    var dlennum = dradnum * 5; // dynamic number along, including sphere ends
    //<<<if (HW.resoverride.lennum && resdelta === 0) dlennum = HW.resoverride.lennum;
    //if (HW.resoverride.radnum && resdelta === 0) dradnum = HW.resoverride.radnum;
    if (HW.resoverride.lennum)
        dlennum = HW.resoverride.lennum;
    if (HW.resoverride.radnum)
        dradnum = HW.resoverride.radnum;
    dlennum = Math.ceil(dlennum);
    dradnum = Math.ceil(dradnum);
    //dradnum = 3;    // for lots of particle spring experiments
    //dlennum = 15000; // 4096*2;
    rb = "_" + dlennum + "_" + dradnum;
    // skeleton is calculated just once each frame, so takes account of inputs.resdyndeltaui but not of resdelta
    var rbsk = inputs.resbaseui - inputs.resdyndeltaui * (Math.log(num) / Math.LN10);
    rbsk = Math.ceil(rbsk);
    if (rbsk < 0)
        rbsk = 0;
    //var lower = 2;  // was 2, but why skimp here which isn't too expensive ??? TODO check'
    //var bodycnum = Math.ceil(HW.radnums[rbsk]*5/lower);     // lower resolution will do todox lower if we go cubic
    // align bodycnum with main use
    var spherenum = Math.floor(dlennum / 20); // allocation for spherical ends, 5% at each end
    var bodycnum = dlennum - 2 * spherenum; // number of steps along length dedicated to main body (rest are for spherical ends)
    uniforms.lennum.value = dlennum;
    radnum = uniforms.radnum.value = dradnum; // only used for skelbuffer (which isn't used)
    var dlennumX = dlennum; // allows for extra beyond ends to help interpolation when we have skeleton
    if (inputs.USESKELBUFFER && opmode === OPMAKESKELBUFF) {
        var skelnum = bodycnum;
        if (hset.trankey.indexOf('ppost') !== -1 && skelnum > 127)
            skelnum = 127; // so spring history sampling does not go silly, TODO replace with something more precise?
        if (hset.trankey.indexOf('ppos(') !== -1 && kinectJupDyn.getRibs())
            skelnum = kinectJupDyn.getRibs() - 5; // so spring history sampling does not go silly, TODO replace with something more precise?
        if (HW.resoverride.skelnum)
            skelnum = HW.resoverride.skelnum;
        let skelends = uniforms.skelends.value = FIRST(HW.resoverride.skelends, 2);
        var buffused = num * (skelnum + 2 * skelends + 1); // +5 as extended 2 backwards and forwards
        dlennum = skelnum; // for checks lower down
        dradnum = 0;
        var meshused = buffused;
        var meshsize = skelnum + 1 + 2 * skelends;
        rb = "_" + dlennum + "_" + dradnum + '__' + skelends; // rbsk+"!";   // and unique key so skeleton has its own bigscene
        hset.gbuffoffsets[hornid] = hset.gbuffoffset; // call this BEFORE updating hset.gbuffoffset
        hset.skelnum[hornid] = skelnum; // call this BEFORE updating hset.gbuffoffset
        // claim skelbuffer/skelbuffer space before calling subobjects/tails
        hset.gbuffoffset += buffused;
        hset.lastgbuffoffset = hset.gbuffoffset; // keep for stats
    }
    else {
        meshsize = (dlennumX + 1) * (dradnum + 1);
        meshused = num * meshsize;
        hset.meshused += meshused;
    }
    // get right place/resolution for skeleton when generating or using skeleton; not used when no skeleton
    uniforms.skelnum.value = hset.skelnum[hornid];
    uniforms.gbuffoffset.value = hset.gbuffoffsets[hornid];
    // rb += '=' + inputs.resbaseui + '~ ' + resdelta + '~ ' + inputs.resdyndeltaui;  // uncomment to help debug
    if (!dummy) {
        // find appropriate bigscene for the HW.bigsceneSet
        var bigscene = HW.bigsceneSet[rb];
        if (!bigscene) {
            // make sure HW.resoverride scenes don't stay around
            const okey = "_" + HW.resoverride.lennum + '_' + HW.resoverride.radnum; // override key
            if (rb === okey && HW.bigsceneSet_lastokkey && HW.bigsceneSet[HW.bigsceneSet_lastokkey]) {
                HW.bigsceneSet[HW.bigsceneSet_lastokkey].geometry.dispose();
                delete HW.bigsceneSet[HW.bigsceneSet_lastokkey];
            }
            HW.bigsceneSet_lastokkey = okey;
            var geometry = new THREE.InstancedBufferGeometry();
            // we make our own plane here rather than using THREE.PlaneGeometry
            // as that has a huge overhead that is not relevant to our application
            // make the vertices
            var xoff = 0;
            dlennumX = dlennum;
            if (dradnum === 0) {
                dlennumX += 2 * uniforms.skelends.value;
                xoff = -uniforms.skelends.value / dlennum;
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
                const ularr = new Uint16Array(meshsize); // << todo, allow for 32 bit needed
                //var flarr = new Float32Array(meshsize);
                var ii = 0;
                for (let i = 0; i <= dradnum; i++) {
                    for (let j = 0; j <= dlennumX; j++) {
                        ularr[ii] = ii;
                        ii++;
                    }
                }
                var vertices = new THREE.BufferAttribute(ularr, 1);
                geometry.setAttribute('positioni', vertices);
            }
            else {
                const flarr = new Float32Array(meshsize * 2);
                ii = 0;
                for (let i = 0; i <= dradnum; i++) {
                    for (let j = 0; j <= dlennumX; j++) {
                        flarr[ii++] = j / dlennum - 0.5 + xoff;
                        flarr[ii++] = dradnum === 0 ? 0 : i / dradnum - 0.5;
                        // flarr[ii++] = 0;
                    }
                }
                vertices = new THREE.BufferAttribute(flarr, 2);
                geometry.setAttribute('position', vertices);
            }
            // make the indices, unless it is the skeleton
            if (dradnum > 0) {
                let uarr;
                if (WA.multiSceneForce32)
                    uarr = new Uint32Array(dlennum * dradnum * 3 * 2);
                else
                    uarr = new (meshsize > 65536 ? Uint32Array : Uint16Array)(dlennum * dradnum * 3 * 2);
                let iii = 0;
                for (let i = 0; i < dradnum; i++) {
                    for (let j = 0; j < dlennum; j++) {
                        var a = i * (dlennum + 1) + j;
                        var b = a + dlennum + 1;
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
                geometry.setIndex(new THREE.BufferAttribute(uarr, 1));
            }
            bigscene = { scene: newscene('bigsceneM_' + rb + "_"), scenedot: newscene('bigscenedotM_' + rb + "_"), geometry: geometry };
            HW.bigsceneSet[rb] = bigscene;
        }
        geometry = bigscene.geometry;
        HW.multiInstances(bigscene, num); // make sure enough instances
        var bscene = HW.dotty ? bigscene.scenedot : bigscene.scene;
        if (!bscene.children[0]) {
            var mesh = HW.dotty ? new THREE.Points(geometry) : new THREE.Mesh(geometry);
            mesh.frustumCulled = false;
            //mesh.position.z = i*mgroup;
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            mesh.frustumCulled = false;
            bscene.addX(mesh);
        }
        var mat = getMaterial(genes.tranrule, genes);
        bscene.children[0].material = mat;
        // bigscene.geometry.instanceCount = num;
        //scene.buff used = buff used;
        //scene.mesh used = mesh used;
    } // ! dummy, actaully generate the scene
    return bscene; // will be undefined if dummy
} // multiScene
/** clear out HW.bigsceneSet */
function clearBigsceneSet() {
    if (_testcompile)
        return true;
    for (const gn in HW.bigsceneSet) {
        if (HW.bigsceneSet[gn].geometry)
            HW.bigsceneSet[gn].geometry.dispose();
    }
    HW.bigsceneSet = {};
}
/** make sure instances enough and registered for this bigscene */
function multiInstances(bigscene, num) {
    var geometry = bigscene.geometry;
    var ageometry = geometry;
    geometry.instanceCount = Math.min(U.maxInstanceCount, num - U.instanceOffset);
    if (ises300) {
        // next line patches bug in THREE.js, still (rev 121) does not allow for instanced geometry with no instance attributes
        if (ageometry._maxInstanceCount === undefined)
            ageometry._maxInstanceCount = Infinity;
        return; // we can use gl_InstanceID directly for es300 webgl2
    }
    // extend the (shared) instances if necessary
    if (HW.instanceids.length < num) {
        for (let i = HW.instanceids.length; i < num * 1.3 + 50; i++)
            HW.instanceids.push(i);
        HW.instanceIDBuff = new THREE.InstancedBufferAttribute(new Float32Array(HW.instanceids), 1, true);
    }
    ageometry._maxInstanceCount = num; // three.js does not allow for change of #instances, should we create new Geometry?
    HW.instanceIDBuff.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('instanceID', HW.instanceIDBuff); // per mesh instance
}
// WA.HW.multi Instances = HW.multi Instances;
var multiScenes = {}; // cache of scenes, with current enabled number, used for old style
var multigeom;
// /** old stule of multiScene
//  * If newplane is not set (obsolete), we use three.js planes, and control number by visibility.
//  * In this case, to avoid too much visibility switching, we have different sets for different key contexts,
//  * each with approximately the correct number of planes.
//  *
//  * @param {type} genes
//  * @param {type} num
//  * @param {type} key
//  * @returns {Boolean}
//  */
// function multiSceneOld(genes, num, key) {
//     var dradnum = radnum;
//     var dlennum = lennum;
//     // fall through here for (obsolete) standard plane code
//     // still used for stl file generation
//     var mat = get Material(genes);
//     if (!multigeom || multigeom.vert ices.length !== (lennum+1)*(radnum+1)) {
//         // ??? which mgroup  mgroup = 1;
//         multigeom = new THREE.PlaneGeometry(1, -1, lennum, radnum);
//         multiScenes = {};
//     }
//     // get cached scene if possible
//     var sc = multiScenes[key];
//     // make sure scene exists
//     if (!sc) {
//         sc = { scene: newscene('bigsceneOld'),  scenedot: newscene('bigscenedotOld'), num: 0 };
//         //sc.scene.autoUpdate = false;
//         multiScenes[key] = sc;
//     }
//     var dscene = HW.dotty ? sc.scenedot : sc.scene;
//     // make sure scene contains enough elements
//     var ch = dscene.getDescendants();
//     for (let i = ch.length; i < num; i++) {
//         var mesh = HW.dotty ? new THREE.Points(multigeom) : new THREE.Mesh(multigeom);
//         mesh.frustumCulled = false;
//         mesh.position.z = i;  // just a way to pass extra information
//         mesh.updateMatrix();
//         mesh.material = mat;
//         mesh.frustumCulled = false;
//         mesh.matrixAutoUpdate = false;
//         dscene.addX(mesh);
//     }
//     // make sure exactly lowest num elements are visible, and record num
//     ch = dscene.getDescendants();
//     for (let i = num; i < sc.num; i++) ch[i].visible = false;
//     for (let i = sc.num; i < num; i++) ch[i].visible = true;
//     sc.num = num;
//     // make sure they have the right material
//     if (ch[0].material !== mat)
//         for (let i = 0; i < ch.length; i++)
//             ch[i].material = mat;
//     return dscene;
// }
/** debug convenient last hornset object */
var hobj;
/** generate new hornset from genes, ready to edit/mutate */
function cloneHornset(genes = currentGenes) {
    const hset = getHornSet(genes);
    return deepCopy(hset);
}
// /** generate new hornset from genes, ready to edit/mutate */
// function cloneHornset(genes = currentGenes) {
//     const hset = getHornSet(genes);
//     // nb for JSON, circular uses HW.parent, HW.hset, HW.sub[*].parent
//     return yaml.safeLoad(yaml.safeDump(hset, {skipInvalid: true}));
//     // return dstring(xstring(getHornSet(genes)));
// }
// /** randrulesHorn defines rules for random structure mutation on hornset
//  * returns a string version of new structure */
// function randrulesHorn(genes) {
//     var nhs = cloneHornset(genes);
//     nhs.mutateStructHs();
//     return genesub(nhs._genecode, genes);
// }
/** edit genes op using rule op
 * if the op already exists for the horn, edit it
 * otherwise create and edit it. */
function editobj(op, genes = currentGenes) {
    var eops = { B: "bend", C: "curl", T: "twist", O: "twistoffK", S: "stack", "Q,S": "stack", G: "scale", R: "ribs", A: "radius", F: "flapK", W: "sweepK" };
    var eopsy = { T: "twistoffK", W: "flapK", F: "sweepK" };
    var opn = eops[op] || op; // so we can use abbreviations or full names; eg 'alt,S'
    var opny = eopsy[op];
    // find the hornset and identified horn
    var hornset = getHornSet(genes);
    var hornname = currentpick.split("=")[0].trim();
    var thorn = hornset.horns[hornname];
    if (!thorn) {
        msgfix("incorrect horn element selected", '?');
        return;
    }
    // find the gene if it is already there
    if (opn) {
        var ngn = thorn.gn(opn);
        if (hornset.getgenenames()[ngn]) {
            editgenex = genedefs[ngn];
            canvas.style.cursor = "";
            canvas.className = opn;
            // ?? if (genes === current Genes)
            setGUITranrule(genes);
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
        }
        else {
            thorn.trans.push(new Tran(opn, []));
        }
        nhs.uniforms = "";
        nhs._compilehs('dynamic', genes);
        var res = genesub(nhs._genecode, genes);
        setHornSet(res, nhs);
        genes.tranrule = res;
        target.tranrule = res;
        setGUITranrule(genes);
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
function planeg(width, height, widthSegments, heightSegments, copies, half) {
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
    geometry.userData.vertsperrib = gridX1 * gridZ1;
    geometry.userData.trisperrib = gridX * gridZ * 2;
    const possl = geometry.userData.vertsperrib * 3 * copies;
    const inddl = geometry.userData.trisperrib * 3 * copies;
    const poss = new Float32Array(geometry.userData.vertsperrib * 3 * copies);
    let indd = possl > 65536 ? new Uint32Array(inddl) : new Uint16Array(inddl);
    //geometry.attributes = {
    //    index: { itemSize: 1, array: indd },
    //    position: { itemSize: 3, array: poss}
    //};
    geometry.userData.ws = widthSegments;
    geometry.userData.hs = heightSegments;
    let i = 0;
    for (let copy = 0; copy < copies; copy++) {
        for (iz = 0; iz < gridZ1; iz++) {
            for (ix = 0; ix < gridX1; ix++) {
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
    for (let copy = 0; copy < copies; copy++) {
        const ck = gridX1 * gridZ1 * copy;
        for (iz = 0; iz < gridZ; iz++) {
            for (ix = 0; ix < (half ? iz + 1 : gridX); ix++) {
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
    if (half)
        indd = indd.slice(0, i);
    function disposeArray() {
        this.array = null;
    }
    geometry.setIndex(new THREE.BufferAttribute(indd, 1)); // .onUpload( disposeArray ) ); // disposing of the index stops it working, todo find out why
    geometry.setAttribute('position', new THREE.BufferAttribute(poss, 3).onUpload(disposeArray));
    geometry.computeBoundingSphere();
    return geometry;
}
var oobj; // for revert
/** fix the rref of object genes to k */
function fixrref(genes = currentGenes, k = 100) {
    oobj = clone(genes);
    for (let gn in genes) {
        var gd = genedefs[gn];
        if (!gd)
            continue;
        if (gd.tag.indexOf("geom") === -1)
            continue;
        if (gn.indexOf("_") === -1)
            continue;
        if (gn.endsWith("K"))
            continue;
        if (gn.endsWith("_rref")) {
            genes[gn] = k;
            continue;
        }
        if (gn.endsWith("_ribs"))
            continue;
        if (gn.endsWith("_radius"))
            continue;
        if (gn[0] === "_")
            continue;
        var on = gn.pre("_");
        var oribs = oobj[on + "_ribs"];
        var orref = oobj[on + "_rref"] || oribs;
        //if (ribs !== rref)
        //console.log("? ribs/rref " + gn);
        var orat = oribs / orref;
        var ribs = oribs;
        if (ribs < k / 2)
            ribs = k / 2;
        if (ribs > k * 2)
            ribs = k * 2;
        genes[on + "_ribs"] = ribs;
        //genes[on + "_rref"] = k;
        var rref = k;
        var rat = (rref * oribs) / (orref * ribs);
        if (gn.endsWith("_scale"))
            genes[gn] = 1 + rat * (oobj[gn] - 1);
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
    for (var i = 1; i <= 12; i++) {
        var eo = xxxgenes(i);
        v[i] = getHornSet(xxxgenes(i)).trankey;
        if (v[i].indexOf("first_bend") === -1) {
            eo.tranrule = xxxgenes(2).tranrule;
            eo.first_bend = 0;
        }
        for (let gn in genedefs) {
            var gd = genedefs[gn];
            if (eo[gn] > gd.max)
                gd.max = eo[gn];
            if (eo[gn] < gd.min)
                gd.min = eo[gn];
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
    setViewports([2, 6]);
    webgallery();
    loadcurrent(getWebGalByNum(0).name);
    copyFrom(currentGenes, target);
    // clean them to use same model and fixed rref values
    //cleanplanets();
    //setTimeout( fixrrefall, 1000);
    //setTimeout( cleanplanets, 1500);
}
/** update the html rules display */
function updateHTMLRules(genes) {
    if (!W.htmlouter)
        return; // for CSynth, odd module loading order
    W.htmlouter.style.display = W.showhtmlrules.checked ? '' : 'none';
    var rules = W.showhtmlrules.checked ? WA.horn2html(genes) : "";
    W.htmlrulebox.innerHTML = rules;
    //W.htmlrulebox.focus();  // << to consider, sometimes needed
    return rules;
}
var trlastx, trlasty, trlastgn, trcurrentDownTarget;
function trmousedown(evt) {
    saveundo();
    if (evt.button === 2) {
        trcurrentDownTarget = evt.target;
        trcurrentDownTarget.focus();
        trlastgn = trcurrentDownTarget.id.post("_");
        trlastx = evt.screenX;
        trlasty = evt.screenY;
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
    if (!gn)
        return; // called on document, usually irrelevant
    var dx = evt.screenX - trlastx;
    var dy = evt.screenY - trlasty;
    var v = currentGenes[gn];
    var gd = genedefs[gn];
    if (v !== undefined && gd && mousewhich === 8) {
        incgene(gn, dx / 3, evt);
        trlastx = evt.screenX;
        trlasty = evt.screenY;
        return killev(evt);
    }
}
function trkeydown(evt) {
    var src = evt.target;
    var gn = src.id.post("_");
    var todo = geneonkeydown(evt, gn);
    if (!todo)
        return killev(evt);
    var k = 1;
    var ff = getkey(evt);
    todo = false;
    switch (ff) {
        case "ArrowUp":
            incgene(gn, k, evt);
            break;
        case "ArrowDown":
            incgene(gn, -k, evt);
            break;
        case "Enter":
            saveundo();
            var v = 1 * src.textContent;
            if (!isNaN(v)) {
                setval(gn, v);
                src.style.backgroundColor = "";
            }
            else {
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
    if (!todo)
        return killev(evt);
    return true;
}
function trkeyup(evt) {
    var src = evt.target;
    var gn = src.id.post("_");
    var v = 1 * src.textContent;
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
    if (n === null)
        return;
    if (n.className === "help")
        n.innerHTML += _trmsg;
}
function trblur(evt) {
    var n = evt.target.nextSibling;
    if (n === null)
        return;
    if (n.className === "help")
        n.innerHTML = n.innerHTML.pre("<h4>");
}
function hornHtmlMousemove(evt) {
    // hornHtmlMouseover(evt);  // repeat mouseover so shift can be more dynamic
}
function hornHtmlMouseover(evt) {
    HornSet.current().hornhighlight = +evt.target.id.post("/");
    newmain();
}
function hornHtmlMouseout(evt) {
    HornSet.current().hornhighlight = undefined;
    newframe();
}
const htmlhidestruct = document.createElement('style');
htmlhidestruct.id = 'htmlshowstruct';
htmlhidestruct.innerHTML = ".trans, .hornhead, .horn legend, .subs > legend { display: none; } fieldset.horn { border: 0px; } fieldset.subs { border-top-width: 0px; }";
document.body.appendChild(htmlhidestruct);
// let hornHtmlKeys: Dictionary<boolean> = {};     // which keys are down in hornHtml, NO, use 'global' keysdown
function hornHtmlKeydown(evt) {
    // hornHtmlMouseover(evt);  // repeat mouseover so shift can be more dynamic; no was excatly wrong
    var ff = getkey(evt);
    // hornHtmlKeys[ff] = true;
    var todo = false;
    switch (ff) {
        case 'S':
            if (W.htmlshowstruct) {
                document.body.removeChild(W.htmlshowstruct);
                setSubrepeat(1);
                //setRotate(0);
            }
            else {
                document.body.appendChild(htmlhidestruct);
                setSubrepeat(1);
                //setRotate(1);
            }
            break;
        case 'T':
            if (evt.target.classList.contains('hornname2')) {
                const p2 = evt.target.parentNode.parentNode;
                if (p2.classList.contains('hornshow'))
                    p2.classList.remove('hornshow');
                else
                    p2.classList.add('hornshow');
            }
            break;
        case 'R':
            setRotate(-1);
            break;
        case '1':
        case '2':
        case '3':
            if (evt.target.classList.contains('gval')) // do not allow it to work on value elements
                todo = true;
            else
                setSubrepeat(+ff);
            break;
        default: todo = true;
    }
    if (!todo)
        return killev(evt);
    return true;
}
function setSubrepeat(n) {
    if (subrepeat !== n) {
        subrepeat = n;
        updateHTMLRules(currentGenes);
        W.htmlrulebox.focus();
    }
}
/** set rotation, -1 toggle, 0/false off, 1/true on */
function setRotate(n, rot = 30) {
    if (n < 0)
        n = !W.htmlshowrot;
    if (W.htmlshowrot) {
        document.body.removeChild(W.htmlshowrot);
    }
    ;
    if (n) {
        var style = document.createElement('style');
        style.id = 'htmlshowrot';
        style.innerHTML = `.subs > .horn {transform:  rotate(${rot}deg);transform-origin: top left;}`;
        document.body.appendChild(style);
    }
}
WA.hornHtmlSetRotate = setRotate; // for playing about
function hornHtmlKeyup(evt) {
    var ff = getkey(evt);
    // hornHtmlKeys[ff] = false;
    // hornHtmlMouseover(evt);  // repeat mouseover so shift can be more dynamic
}
var srctranedit;
function trancontext(evt) {
    var src = evt.target;
    W.trancontextmenu.style.display = "";
    evt.preventDefault();
    W.trancontextmenu.style.left = evt.pageX + "px";
    W.trancontextmenu.style.top = evt.pageY + "px";
    var p = src.parentNode; // group of tran name and value
    var pp = p.parentNode; // group of all tran
    var pos = Array.prototype.slice.call(pp.childNodes).indexOf(p); // which tran
    var hornname = src.id.split('_').reverse().slice(2).reverse().join('_'); // remove _nnn_tranname
    srctranedit = { src: src, hornname: hornname, pos: pos };
    //trancontextmenu.left =
}
function swaptran(list, pos, delta) {
    if (pos + delta < 0 || pos.delta >= list.length)
        return;
    var t = list[pos];
    list[pos] = list[pos + delta];
    list[pos + delta] = t;
}
function trannamekeydown(evt) {
    var id = evt.target.id.split("_");
    //var p1 = evt.path[1], p2 = evt.path[2];
    //var pos = [].indexOf.call(p2.children,p1);
    //if (pos === -1) { serious("??? pos in trannamekeydown"); return; }
    srctranedit = { hornname: id[0], pos: id[1] * 1 };
    var ff = getkey(evt);
    var todo = false;
    switch (ff) {
        case "ArrowUp":
            newops("move up");
            break;
        case "ArrowDown":
            newops("move down");
            break;
        default: todo = true;
    }
    if (!todo)
        return killev(evt);
    return true;
}
/** insert a new op in transform list from context menu
 * srctranedit will pass down details
 * */
function newop(evt) {
    HW.cancelcontext();
    var op = evt.target.textContent;
    newops(op);
}
/** insert a new op in transform list, op gives op
 * */
function newops(op) {
    if (op === "cancel")
        return;
    var genes = currentGenes;
    var hornname = srctranedit.hornname;
    var pos = srctranedit.pos;
    var nhs = getHornSet(genes);
    nhs = cloneHornset(genes);
    var thorn = nhs.horns[hornname.pre('/')];
    if (!thorn) {
        msgfix("incorrect horn element selected", '?');
        return;
    }
    switch (op) {
        case "WRONG?delete":
            thorn.trans.splice(pos, 1);
            break;
        case "toggle":
            var tr = thorn.trans[pos];
            if (tr.name[0] === 'x')
                tr.name = tr.name.substring(1);
            else
                tr.name = 'x' + tr.name;
            break;
        case "delete":
            thorn.trans.splice(pos + 1, 0, new Tran(op, []));
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
            thorn.trans.splice(pos + 1, 0, new Tran(op, []));
        //serious("unexpected op to norn newop: " + op);
    }
    nhs.uniforms = ""; // ??? TODO clean up pre-compile uniforms
    nhs._compilehs('dynamic', genes);
    var res = genesub(nhs._genecode, genes);
    setHornSet(res, nhs);
    genes.tranrule = target.tranrule = nhs.tranrule = res;
    setGUITranrule(genes);
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
    srctranedit = { src: src, hornname: hornname };
}
/** perform an operation on the current horn: delete, or add sub, cage, head, tail */
function hornop(evt) {
    HW.cancelcontext();
    var op = evt.target.textContent;
    if (op === "cancel")
        return;
    var genes = currentGenes;
    var hornname = srctranedit.hornname;
    var nhs = getHornSet(genes);
    nhs = deepCopy(nhs);
    var thorn = nhs.horns[hornname];
    if (!thorn) {
        msgfix("incorrect horn element selected", '?');
        return;
    }
    if (op === "delete") {
        // thorn.name = "^" + thorn.name;  // this will prevent its use so be eliminated on compile
        delete nhs.horns[hornname];
    }
    else {
        var nname = hornname + "_" + op;
        if (nhs.horns[nname]) {
            for (let n = 0; true; n++) {
                nname = hornname + "_" + op + n;
                if (!nhs.horns[nname + n])
                    break; // <<<<<<<<<<<<<<< WRONG, we need to check if a horn exists, nothing to do with getHornSet> ???nhs.horns[nname]???
            }
        }
        var newh = new Horn(nname, nhs);
        newh.radius(20).ribs(20).rref("0").stack(1000);
        if (op === "tail")
            thorn._tail.push(nname);
        else if (op === "head")
            thorn._head.push(nname);
        else
            thorn._sub.push({ subname: nname, cage: op === "cage" });
    }
    nhs._compilehs('dynamic', genes);
    var res = genesub(nhs._genecode, genes);
    setHornSet(res, nhs);
    genes.tranrule = target.tranrule = nhs.tranrule = res;
    setGUITranrule(genes);
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
var glosspow = 2; // force gloss to lower values
var vpow = 1 / 2; // force v to higher values
/** special animation for recurseMutualPair2 */
function ppreframe() {
    const genes = currentGenes;
    if (!genes.P_ribs)
        return;
    var scurve = function (x) { return (3 - 2 * x) * x * x; };
    var t = 120 * 1000; // overall time cycle
    var swt = 3 * 1000; // swap time
    var k = (frametime % t * 2) / t;
    var sw = 2 * swt / t;
    if (k < sw)
        genes.P_ribs = 1 + scurve(k / sw);
    else if (k < 1)
        genes.P_ribs = 2;
    else if (k < 1 + sw)
        genes.P_ribs = 2 - scurve((k - 1) / sw);
    else
        genes.P_ribs = 1.0000001;
    scalehalflife = 1500;
}
Maestro.on("preframe", ppreframe);
function colourTailor(hornid, genes) {
    var _a, _b;
    var p = hornid;
    let hset;
    if (appToUse === 'Horn')
        hset = getHornSet(genes); //  ?? current Hset;
    else
        hset = { colgenenames: {} };
    const u = undefined;
    // COLOUR TAILORING CODE, TO MOVE <<<< TODO
    //uniforms.bumpstrength_A.value = Math.min(uniforms.bumpstrength_A.value, mbs);
    if (COL.num.shininess1) { // may be missing, eg for simplemode}
        COL.setG("shininess1", p, Math.min(COL.get("shininess1", p), maxshine), u, hset);
        COL.setG("shininess2", p, Math.min(COL.get("shininess2", p), maxshine), u, hset);
        COL.setG("shininess3", p, Math.min(COL.get("shininess3", p), maxshine), u, hset);
        COL.setG("gloss1", p, Math.min(COL.get("gloss1", p), maxgloss), u, hset);
        COL.setG("gloss2", p, Math.min(COL.get("gloss2", p), maxgloss), u, hset);
        COL.setG("gloss3", p, Math.min(COL.get("gloss3", p), maxgloss), u, hset);
        upow("gloss1", p, glosspow, hset);
        upow("gloss2", p, glosspow, hset);
        upow("gloss3", p, glosspow, hset);
        // msgfix('specrat' + p, COL.get('subband1', p) * COL.get('shininess1', p),COL.get('subband2', p) * COL.get('shininess2', p),COL.get('subband3', p) * COL.get('shininess3', p));
        //
        // code for adjusting speck moved to lights.fs
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
        var usetime = ((_b = (_a = genes._fixtime) !== null && _a !== void 0 ? _a : genes.time) !== null && _b !== void 0 ? _b : frametime / 1000) * 1000; // genes.time set in setObjUniforms
        //if (genes === current Genes) log("usertime", usetime, genes.time, frametime);
        //msgfix("_timeh", current Genes.time);
        // rotating hue experiment (also uses )
        var qq = (usetime / 70 % 31.4159);
        var h = (usetime / 35000) % 1;
        //h += COL.get("hornid", p) * 0.17; // optional different hue for different horns
        COL.setG("fluorescH1", p, h, u, hset);
        COL.setG("fluorescH2", p, h, u, hset);
        COL.setG("fluorescH3", p, h, u, hset);
        // force full v for n
        var v = COL.get("fluorescV2", p);
        v = 1;
        let s = 1;
        COL.setG("fluorescV1", p, v, u, hset);
        COL.setG("fluorescV2", p, v, u, hset);
        COL.setG("fluorescV3", p, v, u, hset);
        COL.setG("fluorescS1", p, s, u, hset);
        COL.setG("fluorescS2", p, s, u, hset);
        COL.setG("fluorescS3", p, s, u, hset);
        // enable to debug fluorescent band hue
        //COL.setG("iridescence1", p, 0);
        //COL.setG("iridescence2", p, 0);
        //COL.setG("iridescence3", p, 0);
        let qqq = (frametime / 27770 % 31.4159);
        // width now controlled per band, and texscale compensation in shader
        //COL.setG("fluwidth", p, 0.5; // + (1+Math.sin(qq)));
        //COL.get("fluwidth_A.value[p] /= uniforms.texscale", p);
        genes.flurange = 0;
    }
    else { /**/
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
        COL.setG("texscale", p, COL.get(gValueForTexscale, p), u, hset); // to save bump texture
}
/** raise a uniform value to a power */
function upow(u, p, pow, hset) {
    COL.setG(u, p, Math.pow(COL.get(u, p), pow), undefined, hset);
}
/** performance debug helper */
function showres() {
    log(HornSet.current().hornrun.map(function (x) { return x.horn.name + ' ' + x.res + '/' + x.num; }));
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
    G.bumpstrength = 0;
    G.stardepth = 0;
    G.starnum = 4;
    G.band1 = 0;
    G.band2 = 999;
    G.band3 = 0;
    G.bandbetween = 0;
    setAllLots('irid', 0);
    setAllLots('flu', 0);
    setAllLots('refl', 0);
    checkvr();
    //setInput(NOSCALE, true); setInput(W.NOCENTRE, true);
    //setInput(GPUSCALE, false);  // so we can see scale values even if we don't use them
    setInput(W.doAutorot, false);
    HW.resoverride.skelnum = s;
    HW.resoverride.skelends = e;
    HW.bigsceneSet = {};
    minimizeSkelbuffer();
    centrescalenow();
    onpostframe(() => log(framenum, format(readWebGlFloat(skelbuffer)[1], 2)), 1);
    newmain(); // for (let i=0; i<1000; i+=100) setTimeout(newmain, i);
}
/** set the gene values from the tranrule */
function setGenesFromTranrule(ptranrule /* = currentGenes.tranrule */ /*, trankey=undefined*/, genes = currentGenes) {
    let dummyHset = new HornSet();
    let code = dummyHset.tranrule = ptranrule; // _CodeMirrorInstance.getValue()
    let tgenes = {};
    let rr = dummyHset.parsehorn(code, tgenes, true);
    dummyHset._compilehs(code, tgenes);
    const geneDefaults = dummyHset.geneDefaults;
    let seen = 0, changed = 0;
    let set = {};
    for (const gn in geneDefaults) {
        const nv = geneDefaults[gn];
        if (!dummyHset.trankey.includes('#' + gn + '#')) {
            // ignore colours
        }
        else if (gn in genes) {
            seen++;
            if (genes[gn] !== nv) {
                changed++;
                genes[gn] = nv;
                set[gn] = nv;
            }
        }
        else {
            console.error('unexpected gene', gn, nv);
        }
    }
    msgfixlog('setGenesFromTranrule', { seen, changed }, changed < 5 ? set : '');
    log('set', set);
    if (genes === currentGenes)
        updateGuiGenes();
}
/** set the gene values from the tranrule; this version unreliable with
 * eg ribdepth not in tranrule, bend({k:"90."}) syntax, ...??? to remove Dec 2023 */
function setGenesFromTranruleDEAD(ptranrule /* = currentGenes.tranrule */, trankey = undefined) {
    let msgl = [];
    try {
        if (!trankey)
            trankey = trancodeForTranrule(ptranrule, currentGenes).trankey;
        const parts = trankey.split('#');
        const names = [];
        const vals = [];
        if (!ptranrule.startsWith(parts[0]))
            throwe('tranrule does not match');
        let tranrule = ptranrule.substr(parts[0].length);
        // first pass parses and checks all ok, collecting info, error and no setting done if anything wrong
        for (let i = 1; i < parts.length; i += 2) {
            const steptranrule = tranrule;
            const pre = tranrule.pre(parts[i + 1]);
            tranrule = tranrule.post(parts[i + 1]);
            if (tranrule === undefined) {
                console.error('tranrule does not match', i, parts[i + 1], steptranrule);
                tranrule = steptranrule;
            }
            else {
                names.push(parts[i]);
                vals.push(pre);
            }
        }
        // second pass sets values where possible, error by gene, others are still set ok
        for (let i = 0; i < names.length; i++) {
            const pre = vals[i];
            let val;
            if (!isNaN(pre)) {
                val = +pre;
            }
            else {
                val = +evalIfPoss(pre);
                if (isNaN(val)) {
                    msgl.push(names[i] + '?=' + pre);
                    continue;
                }
            }
            currentGenes[names[i]] = val;
        }
    }
    catch (e) {
        msgl.push('invalid tranrule', e);
    }
    msgfix('tranrule gene errors', msgl.length ? msgl.join(', ') : undefined);
}
var xuniforms = {};
/** capture uniforms used to help decide how to merge passes for different objects */
function captureUniforms(hornid) {
    const hset = HornSet.current();
    // return;  // uncomment this when if you really need to do uniform checking
    let hornname = hset && hset.hornrun[hornid] ? hset.hornrun[hornid].hornname : undefined;
    if (!hornname)
        return;
    if (!xuniforms[hornid])
        xuniforms[hornid] = {};
    for (let ns in uniforms) {
        const n = ns; //  as Xstring;
        if (!hset.addedUniforms[n] && hset.geneDefaults[n] === undefined) {
            // log("uniform in uniforms but not in hset.addedUniforms", n);
            continue;
        }
        if (n.endsWith('active') || n.endsWith('rpbase') || n.endsWith('para') || n.endsWith('parb') || n.endsWith('reflx')) {
            let v = clone(uniforms[n].value);
            xuniforms[hornid][n] = v;
            //}
        }
    }
}
/** code that replaces the per horn type uniforms with internal variable for all horn types simultaneously
 * SINGLEMULTI
return [full switching code, hornid switching code]
 */
function codeForUniforms(hset, genes) {
    hset = hset || HornSet.current();
    // make sure current uniforms registered
    const saveopmode = opmode;
    opmode = "postcompile";
    xuniforms = {};
    renderHornobj(genes, uniforms, 'norenddrtarget', 'noscene', hset);
    let s = ['// setup code generated by codeForUniforms']; // to generate full singlemulti split code
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
        }
        else if (typeof v === 'string') {
            s.push(n + ' = ' + v + ";");
        }
        else {
            vv = "vec4(" + v.x + "," + v.y + "," + v.z + "," + v.w + ")";
            s.push(n + " = " + vv + ";");
        }
        base[n] = vv;
    }
    s.push("\n\nif (false) {");
    sids.push("\n\nif (false) {");
    for (let h = 3; h < MAXPATHS; h++) {
        let xu = xuniforms[h];
        if (!xu)
            continue;
        const hornname = hset.hornrun[h].hornname;
        const horn = hset.horns[hornname];
        s.push("} else if (vv < cumcount[" + h + "]) {                   " + "//~~~~~~~~~~ " + hornname);
        sids.push("} else if (vv < cumcount[" + h + "]) {                   " + "//~~~~~~~~~~ " + hornname);
        if (h > 3)
            s.push("vv -= cumcount[" + (h - 1) + "]" + ';');
        if (HornSet.orderbug && hset.code[h]) {
            s.push(' // xuniforms setup code TOO EARLY');
            s.push(hset.code[h]); // too early here
            s.push(' // end xuniforms setup code TOO EARLY');
        }
        for (let n in xu) {
            let v = xu[n];
            let pre = '';
            let vv;
            if (typeof v === 'number') {
                vv = f(v);
                // s.push(n + ' = ' + vv + ";");
            }
            else if (typeof v === 'string') {
                vv = v;
                // s.push(n + ' = ' + vv + ";");
            }
            else {
                vv = "vec4(" + v.x + "," + v.y + "," + v.z + "," + v.w + ")";
                pre = '//'; // we use these for recording what hight change but actaully set them symbolically
            }
            if (vv !== base[n])
                s.push(pre + '  ' + n + " = " + vv + ";");
        }
        if (hset.code[h]) {
            if (HornSet.orderbug) {
                s.push('// xuniforms setup code should be here, but orderbug requested earlier');
            }
            else {
                s.push('// xuniforms setup code');
                s.push(hset.code[h]);
                s.push('// end xuniforms setup code');
            }
        }
        else {
            s.push('// NO special hset code');
        }
        // s.push(' colourid = ' + h + '.;');
        s.push(' xhornid = ' + h + '.;');
        s.push(' cutoffset = ' + horn.gn('cutoffset') + ';');
        sids.push(' xhornid = ' + (h) + '.;');
        const hhr = horn._radius;
        if (typeof hhr === 'string')
            s.push(' radius = float(' + hhr + ');');
        else if (hhr === undefined) // we could supress compilation of this complete hornrun, but it would hardly save anything
            s.push(' radius = 0.; // not defined, not actually used');
        else
            s.push(' radius = ' + hornname + '_radius;');
        // const hrd = horn._ribdepth;
        // if (typeof hrd === 'string')
        //     s.push(' lribdepth = float(' + hhr + ');');
        // else if (hrd === undefined)     // we could supress compilation of this complete hornrun, but it would hardly save anything
        //     s.push(' lribdepth = 0.; // not defined, not actually used');
        // else
        //     s.push(' lribdepth = ' + hornname + '_ribdepth;');
        // The old XXX_ribs genes and uniforms are still saved,
        // but only used for some NORMTYPE values which use tr_i which is not SKEBUFFER aware
        // Could later optimize these too
        //s.push(' ribs = ' + hornname + '_ribs;\n\n\n');
        //sids.push(' ribs = ' + hornname + '_ribs;\n\n\n');
        // s.push(' ribs = ribsa[' + h + '];\n\n\n');
        // sids.push(' ribs = ribsa[' + h + '];\n\n\n');
        // s.push(' lribdepth = lribdeptha[' + h + '];\n\n\n');
        // sids.push(' lribdepth = lribdeptha[' + h + '];\n\n\n');
    }
    s.push('} else {\n');
    sids.push('} else { xhornid = 0.; float dribs = 77.; }\n');
    s.push(' radius = max(0.2, vv - 20.) * fract(time*0.25);\n'); // <<< this case should never happen
    s.push(' xhornid = 0.;\n');
    s.push('}\n');
    const comm = '{int ihornid = int(xhornid); /*??float */ dribs = ribsa[ihornid]; colourid = xhornid; lribdepth = lribdeptha[ihornid];}';
    s.push(comm);
    sids.push(comm);
    s.push('// <<<<<<<< end code generated by Codeforuniforms');
    opmode = saveopmode;
    return [s.join('\n'), sids.join('\n')];
    function f(n) {
        return n + (n % 1 === 0 ? '.' : '');
    }
}
/** show uniforms that differ between different */
function checkUniforms() {
    let h = 3; // 'Qfirst';
    for (let n in xuniforms[h]) { // all the uniforms we are capturing
        for (let p in xuniforms) {
            if (xuniforms[h][n] !== xuniforms[p][n])
                log('uniform diff', n, h, p, xuniforms[h][n], xuniforms[p][n]);
        }
    }
}
/** clean up lots of caches, unused genes etc */
function cleanall() {
    let cleaned = cleangenesall();
    for (let i in cleaned)
        delete uniforms[i];
    let gggg = clone(currentGenes);
    material = {};
    setHornSet();
    //setHornSet(currentGenes.tranrule, HornSet.current())
    currentHset = undefined;
    xuniforms = {};
    animatee(performance.now());
    target = {};
    copyFrom(currentGenes, gggg);
    newmain();
}
function hornstats(hs = HornSet.current()) {
    hs = xxxhset(hs);
    return hs.hornrun.filter(h => h).map(h => ({ name: h.hornname, num: h.num }));
}
function slotstats() {
    let ii = 0, mm = -1, bhs;
    slots.forEach((s, i) => {
        const hset = xxxhset(i);
        const c = olength(hset.horns);
        log(i, c, hset.horncount, hset.cumcount);
        if (c > mm) {
            ii = i;
            mm = c;
            bhs = hset;
        }
    });
    log(`++++++++ most horns: slot = ${ii}, horntypes = ${mm}, horns = ${bhs.horncount}`);
    showtran(ii);
}
;
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// save current skeleton,in fid (unless fid = '!temp') and return; also save colours if no fid
// always save in localStorage
async function saveSkeleton(fid, dispobj = lastTouchedDispobj !== null && lastTouchedDispobj !== void 0 ? lastTouchedDispobj : xxxdispobj()) {
    if (!fid) {
        const vn = dispobj.vn;
        const paneid = vn !== mainvp ? 'pane #' + vn : dualmode ? 'main pane PROBABLY INVALID' : 'main pane';
        const bfid = window.prompt('enter name for skeleton and colour files\n' + paneid + '\nor empty/escape for just browser storage', '');
        canvas.focus();
        // const bfid = dateToFilename();
        let colfid;
        if (bfid) {
            const dir = getdesksave() + 'exports/';
            mkdir(dir);
            fid = dir + bfid + '.skelj';
            colfid = dir + bfid + '.colourbin';
        }
        COL.genes2col(dispobj.genes);
        // COL.save(colfid); // now saved in skelj
        navigator.clipboard.writeText('tad.localStorageSkel()');
    }
    if (uniforms.skelnum.value > 31 || !HW.resoverride.skelends) {
        HW.resoverride.skelnum = 7;
        HW.resoverride.skelends = 0;
        minimizeSkelbuffer();
        await S.frame(2);
    }
    dispobj = xxxdispobj(dispobj);
    const genes = dispobj.genes;
    const hornnum = getHornSet(genes).horncount, skelnum = uniforms.skelnum.value;
    setObjUniforms(genes, uniforms);
    renderskelbuff(genes);
    const d = readTextureAsVec4(skelbuffer, { width: skelnum + 1, height: hornnum });
    const tr = new THREE.Matrix4().copy(uniforms.rot4.value).transpose();
    const v = new THREE.Vector3();
    for (let i = 0; i < d.length; i++) {
        v.copy(d[i]);
        v.applyMatrix4(tr);
        Object.assign(d[i], v); // x,y,z copied, w left as is
    }
    const cumcount = {};
    for (let i = 0; i < 30; i++) {
        // ??? to reverse uniforms.cumcount.value[i] = cumcount[i] || 0;
        // const c = uniforms['cumcount' + i];
        const c = uniforms.cumcount.value[i];
        if (c)
            cumcount[i] = c;
    }
    const skel = { hornnum, skelnum, cumcount, data: d, fid, genes, colarray: new Array(...COL.array) };
    // if (fid) writetextremote(fid, yaml.safeDump(skel));
    const skelj = JSON.stringify(skel);
    if (fid && fid !== '!temp')
        writetextremote(fid, skelj);
    localStorage.skelj = skelj;
    return skel;
}
// make a grid  with k items per skeleton point
// >>> with k power of 2 we get one extra line
// >>> with other even k we get 2 extra lines
function alignskel(k = 18, test = 1.5, dx = 0) {
    // my computations
    var skelnum = HW.resoverride.skelnum || uniforms.skelnum.value;
    var bodynum = k * (skelnum) + dx; // dx is extra points, 1 is added in makingthe grid, so 0 here?
    var skelends = Math.ceil(k / 2) * 2;
    lennum = bodynum + skelends;
    var capres = (skelends + 0.5) / lennum;
    HW.resoverride.lennum = lennum;
    G.capres = capres;
    // // backward check: not really needed now seeming to be working OK
    // // from trnoflat
    // var spherenum = Math.floor(HW.resoverride.lennum*capres * 0.5);
    // check('bodynum', bodynum, lennum - 2*spherenum);
    // check('spherenum', spherenum, skelends/2)
    // var lo = -spherenum;
    // var hi = bodynum+spherenum;
    // // vec4 ppp = rawp = lopos;   // raw input position; basically plane grid with z for id
    // // var rp = lopos.x;    // relative position along 'active' horn
    // var irp = spherenum + test * k;     // my test
    // var rp = Math.round(irp)/lennum;    // 'real' rp is lopos.x
    // var rpx = lo + rp * (hi - lo);  // position extended beyond horn ends for rounding, range -r .. sbodynum+r
    // var rpx1 = rpx/bodynum;
    // var ppx = rpx1;
    // // var ppx = clamp(rpx1, 0., 1.);    // position along horn, range 0..1
    // // from trdir
    // var dd = 1/skelnum;
    // var lowint = Math.floor(ppx * skelnum);  	// integer position of low end of segment 0..skelnum-1
    // var x = ppx * skelnum - lowint;  // x is fractional position within segment 0..1
    // var skxx = skelnum + 2 * skelends;
    // var xx = (x + 0.5)%1; // fract(x + 0.5)
    // return {lowint, x, xx, irp, lennum, capres, bodynum, skelends, spherenum, lo, hi, rp, rpx, rpx1, dd, skxx}
    // function check(str, a, b) {
    //     if (a !== b)
    //         log(str, a, b);
    // }
}
// test readback, read back over cycle of n*8 frames
function readtest(n = 1, opts = undefined, buffer = skelbuffer) {
    const x = framenum / n;
    if (x % 1)
        return;
    switch (x % 8) {
        case 0:
            opts.mask = 'x';
            readWebGlFloat.prep(buffer, opts, 'test');
            break;
        case 1:
            opts.mask = 'x';
            readtest.vvx = readWebGlFloat.finish('test').slice(0, 4);
            break;
        case 2:
            opts.mask = 'y';
            readWebGlFloat.prep(buffer, opts, 'test');
            break;
        case 3:
            opts.mask = 'y';
            readtest.vvy = readWebGlFloat.finish('test').slice(0, 4);
            break;
        case 4:
            opts.mask = 'z';
            readWebGlFloat.prep(buffer, opts, 'test');
            break;
        case 5:
            opts.mask = 'z';
            readtest.vvz = readWebGlFloat.finish('test').slice(0, 4);
            break;
        case 6:
            opts.mask = 'w';
            readWebGlFloat.prep(buffer, opts, 'test');
            break;
        case 7:
            opts.mask = 'w';
            readtest.vvw = readWebGlFloat.finish('test').slice(0, 4);
            break;
    }
}
readtest.vvx = [];
readtest.vvy = [];
readtest.vvz = [];
readtest.vvw = [];
/** very simpe setup for testing horns, eg with webgl2 issues */
function verysimple() {
    HW.resoverride.lennum = 20;
    HW.resoverride.radnum = 5;
    HW.resoverride.skelnum = 3; // check, where des one extra come in?
    HW.resoverride.skelends = 0;
    G.Qfirst_ribs = 4;
    minimizeSkelbuffer();
    onframe(() => {
        // log(readTextureAsVec4(skelbuffer).slice(0,10))
        log(readWebGlFloat(scaleRenderTarget.main)[0]);
    }, 10);
}
function setCurrentGenes() { currentGenes = slots[mainvp].dispobj.genes; }
/**
 * make a skeleton version from a tranrule
 * @param tr
 */
function skelTranrule(tr) {
    const ll = tr.split('\n');
    let state = '';
    const r = [];
    let notyet = true;
    for (const l of ll) {
        if (l.trim().startsWith('horn(')) {
            if (notyet)
                r.push('//!xhorns');
            notyet = false;
            const hname = l.post('horn(').pre(')').trim().slice(1, -1);
            r.push('//!horn:' + hname + ':');
            state = '.';
        }
        else if (state === '.' && l.trim().startsWith('.')) {
            //  ignore horn extension lines
        }
        else {
            r.push(l);
            state = '';
        }
    }
    return r.join('\n');
}
function skelReplace(tr, horns) {
    let sk = skelTranrule(tr);
    for (const h in horns) { // replace in place
        const key = '//!horn:' + h + ':';
        if (sk.indexOf(key) !== -1) {
            sk = sk.replace(key, horns[h].toString());
        }
        else { // replace before first horn
            sk = sk.replace('//!xhorns', horns[h].toString() + '\n' + '//!xhorns');
        }
    }
    return sk.replace('//!xhorns\n', '');
}
export const HW = {
    // GLOBAL horn details here
    usewireframe: false,
    newplane: true,
    dotty: false,
    //type SceneSet = { scene: Scene, scenedot: Scene, Geometry: InstancedBufferGeometry}
    //var HW.bigsceneSet: Dictionary<SceneSet> = {};  // cached scene set big enough for everything seen so far: one bigscene for each fac
    bigsceneSet: {},
    bigsceneSet_lastokkey: '',
    instanceids: [],
    instanceIDBuff: undefined,
    //var HW.radnums = [2,3,4,6,8,12,16,24,32,48,64,96,128];
    //var HW.radnums = [2,3,4,5,7,11,15,23,31,47,63,63,63,63,63];  // HW.radnums used for varying resolution, values above 65 or so give bugs
    // this version of HW.radnums modified to align with older equivalents for performance comparison
    // 30 Apr 2021, 65 limit does not seem to be needed
    radnums: [3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 91, 127, 177, 260],
    resoverride: {},
    multiSceneV: { dummy: undefined },
    // writetextremote, yaml, S, readTextureAsVec4; // not needed by main readWebGLFloat
    renderspecial: undefined,
    multiScenedummy: undefined,
    cubeEarly: 1,
    multiScene: multiScene,
    Horn, HornSet,
    trmousedown, trmouseup, trcontextmenu, trmousemove, trkeydown, trkeyup, trwheel, trfocus, trblur, trannamekeydown, editobj, alignskel,
    captureUniforms, cancelcontext, updateHTMLRules, setGenesFromTranrule, colourTailor, horncontext, hornop, trancontext, newop, newops, planeg,
    getHornSet, setHornColours, setHornSet, randrulemarry, multiInstances, hornTrancodeForTranrule,
    setCurrentGenes, saveSkeleton, hornstats, slotstats,
    cleanall, checkUniforms, showres, xxxhset, showtran,
    skelTranrule
}; // HW
/*********** horn query notes/examples
 *

//interface
hp.getPosition();  hp.getRadius(); hp.getMatrix(); hp.parent(n=1);
hp.getList(); hp.advance(); hp.advanceMe()
hornSet.makePath(list=[])

//example
let hornSet = current HSet;
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
//to get run names:
//currentHset.hornrun.map(h => h.key.replace(/.*?<(.*?)>[^<]*/g, '$1') + h.hornname)
/* eg
A
AD
ADM
AD
ADM
AB
ABE
ABEL
ABF
ABFI
ABFIJ
AC
ACG
ACGH
*/
//# sourceMappingURL=horn.js.map