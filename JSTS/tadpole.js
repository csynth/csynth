// using THREEA till import issue fixed, revert to THREE when that is ok.
// import below fixes compile time errors but creates runtime ones
// If tadpole.js script tag uses type="module" then
//     Failed to resolve module specifier "THREE". Relative references must start with either "/", "./", or "../".
//     Presumably fixable by having a patched version of three module version???
//     and in the longer term, not even needing to patch three at all ???
// Else
//     Async error found Uncaught SyntaxError: Cannot use import statement outside a module
// import * as THREE from 'THREE'; // fixes compile time errors but creates runtime ones
//
// Issue seems to be confusion as to whether this is or is not a module.
// It looks as if typescript thinks it is.
/* tadpole.ts version, typescript for typing but no classes
 */
//
// model:
// There are numInstances individual spring particles.
// These are arranged into HEADS tadpoles of length RIBS each.
// A particle may be prepresented by a spring number (index into spring positions) or pair [tadpole#,rib#]
//
// A role is a template from which to make a Thing (name tbd)
//   It contains an array of Defsprings, which reference 'internal' tadpoles.
//   We have a set of roles (me.roles), (obsolete: each with associated gene for strength).
//   Most roles effectively create topology
//   Some roles have the effect of shaping the geometry (shapers).
//   We may want to formaize this more in future.  TODO
// Each thing references a role, and a map which maps 'internal' tadpole numbers to external tadpole numbers
//   We often expect roles to have 'core' elements at the start (low number internal tadpoles)
//   and twig ends at the end (high number internal tadpoles), and to grow from the core and decay from the twigs.
//   In this case the Thing map may be considerably shorter than the number of Role springs.
//   However, a tadpole can also be taken from a Thing by setting map elements to undefined.
//   The code does not distinguish between non-assigned tadpoles from a short map, or an internal undefined entry.
// On each frame the Things are used to set springs.
//   In future we may optimize this to detect changes to springs during tapole reassignment.
//   but the bulk reset of all springs is simpler and seems efficient enough (at least for now)
//   Reassignment optimization is more difficult for springs than for properties (below) as two particles are involved.
// interface Dictionary<T> { [Key: string]: T; }
// type N = number;  // shorthand
//
// PROPERTIES
//  Properties are assigned to individual particles, not just at the tadpole level
//  Each particle has four properties: radius, colourid, targetRadius, ribs
//
//  Properties start as roleprops for each Role.
//    roleprops is array with groups of 4: (dynamic) radius, colour, target radius, ribs
//  They are created and initialzed to default values in getRole();
//  They are refined in tadtree(), tadhornPOMP().
//
//  Properties are saved for use in me.tadprop, with values for each particle
//  me.tadprop is populated as tadpoles are transferred to a new thing
//  by applying the Thing.map to a Role.roleprops in thing.applyProp()
//
//  me.tadprop is exposed to the shaders as tadprop:
//     2 dimensional texture [rib, tadnum] of RGBA: radius, colourid, targetRadius, ribs
//
// PRIORITIES
//  Each spring in the role is assigned a priority (prio), typically 0..1,
//  and each thing has a threshold (prioThresh), default 0
//  Only role springs above the threshold are created as real springs
//  so that a thing may be fragmented by increasing the prioThresh
//  The role spring priorites are set using tad.prio directory and prioR for lookup and randomization.
//
// spring types and roles
//   13/08/2021 Different role springs (and hence different 'real' springs) can have different types
//   which are then modulated by spring uniforms.roleforces
//
//   This should not be confused with Roles such as tadcovid2, tadFree etc.
//   Originlly spring uniforms.roleforces was used for those different roles, now obsolete
//import {THREE} from './tomodule.js';    // '.js' needed because of typescript rules we don't understand
//import HornSet from '../JSTS/horn.js';
var GUIKey, GUIFinishPanel, GUISubadd, GUINewsub, GUIwallkeys, GUISpacer, xfetch;
var sgui; // temp
var useKinect = searchValues.useKinect;
msgfixlog('tad+', 'tadpole.ts loaded');
;
let MEvents = () => new MaestroConstructor();
class TadkeyMap {
    // constructor(thing: Thing, v: Tadkey[]) {
    constructor(v) {
        this.raw = v;
        // this.thing = thing;
        this.events = MEvents();
    }
    get length() {
        return this.raw.length;
    }
    /** add a new tad, and register its properties */
    push(...v) {
        const thing = this.thing;
        v.forEach(vv => {
            const r = this.raw.push(...v);
            thing.applyProp(r - 1, vv);
        }); // this.thing.applyProp has extra function level?
        const rr = this.raw.length;
        this.events.trigger('push', rr); //TODO better argument passing
        return rr;
    }
    /* remove a tad, from front or back of list */
    pop() {
        const r = this.raw[(tad.flowFirst ? 'shift' : 'pop')]();
        this.events.trigger('pop', r);
        return r;
    }
}
// export var tadpoleSystem;
var baseuniforms;
function TadpoleSystem() {
    const me = tad = this;
    const T = []; // list of current active things
    const TR = {}; // set of roles
    const TRA = []; // array of roles
    me.rolescales = {
        bowl5: 1.26,
        FlowE: 1.37,
        'space_0.1': 0.78,
        Tree_1_2: 1.29,
        // ??tree2: 1.29,
        Tree_1_5: 1.29,
        'Twist_0.6': 1.29,
        PAV: 1.37,
        TRSV: 1.48
    };
    let events; // = MEvents();
    me._horncontext = { currentGenes: {}, uniforms: undefined, genedefs: undefined, skelbuffer: undefined, currentObjects: {}, slots: [], guigenes: undefined };
    me._savecontext = {};
    me.enterHorncontext = function () {
        // resize while in the horn context really confused things when the standard context was restored.
        // For now, we just prevent any resize in that situation.
        // There may well be other sideeffects that upset the enterHorncontext/leaveHorncontext patter
        // but I can't think of a good general solution to that for now. sjpt 28 Feb 2023
        Object.assign(me._savecontext, { currentGenes, uniforms, genedefs, skelbuffer, currentObjects, slots, guigenes, noresize });
        // if (!me._horncontext.uniforms) me._horncontext.uniforms = uniforms;  // ??? share uniforms ???
        if (!me._horncontext.uniforms)
            me._horncontext.uniforms = clone(baseuniforms); // ??? share uniforms ???
        // we need at least the basif colour genes (red1 etc) so the horn will compile
        if (!me._horncontext.genedefs) {
            me._horncontext.genedefs = {};
            for (const gn in permgenes)
                me._horncontext.genedefs[gn] = clone(genedefs[gn]);
        }
        Object.assign(window, me._horncontext);
        noresize = true;
    };
    me.leaveHorncontext = function () {
        me._horncontext = { currentGenes, uniforms, genedefs, skelbuffer, currentObjects, slots, guigenes, noresize };
        Object.assign(window, me._savecontext);
    };
    //constructor() {}
    // const me:{defaultStrength, fixscale, GROUP, WRISTLEN, WRISTSSTR, TADLEN, TADSTR, extramouse} = this;
    me.docovid = searchValues.docovid || searchValues.tadnum === 1200; // 1200 for compatibility
    const COLSAFE = me.COLSAFE = 16; // first 'safe' colour
    const COLNSAFE = me.COLNSAFE = COL.NUM - COLSAFE;
    // w.i.p. 21 Oct 2022, CONTROLS should be 0 for useKinect, but that isn't working right *** sjpt 27/04/23 add useKinect check in doReserved() to compensate
    let CONTROLS = me.CONTROLS = searchValues.tadmutnoiseimage ? 0 : me.docovid ? 8 : 2; // number of bait controls (eg vive controllers)
    let FIXED = me.FIXED = 2, RESERVED = CONTROLS + FIXED; // CONTROL for trackers etc, FIXED for origin etc
    let LINEBAITS = CONTROLS; // number of line baits
    // [0, TADS)                        standard tadpoles (eg 1200)
    // [TADS, TADS+CONTROLS)            controls    (eg 8)
    // [TADS+TADS, TADS+RESERVED ]      fixed (eg 2 * RIBS, centre and ???)
    //
    // let RESERVED = 4;
    // LRIBS for short tadoles, held in uniform only
    let RIBS = 8, HEADS, TADS = -1, SKELENDS = 0, KPARTICLES /*| Iterable<number>*/, KPARTICLESP2, numInstances;
    // let deadBAITS = CONTROLS * (me.docovid ? RIBS : 1);
    const MAX_DEFS_PER_PARTICLE = searchValues.MAX_DEFS_PER_PARTICLE || 64; // definitions allowed per particle, Covid needs 47 +3 reserved
    const APOS_DEFS_PER_PARTICLE = MAX_DEFS_PER_PARTICLE * 4; // array slots, each definition is 4 array slots
    me.T = T;
    me.TR = TR;
    me.TRA = TRA;
    me.things = T; // the two were really identical (I hope) 5 March 2022, keep me.things as synomym for other users
    me.SKELS = Object.keys(readdir('data')).filter(x => x.endsWith('.skelj')).map(x => x.pre('.skelj')); // skeleton files to use
    me.defaultRoleStrength = 250000;
    me.roleStrengths = {}; // role strengths for each role ??? used to be a gene, not really used anyway ???
    me.fixscale = 1.5;
    me.GROUP = 3;
    me.WRISTLEN = 0; // distance to keep from wrist
    // me.WRISTSSTR = 100;
    me.TADLEN = 0.08; // length of tadpole
    me.TADSTR = 10;
    let tadprop; // array for properties, sets of 4: radius, colid, targetRadius, ribs
    me.tailpuffnum = 1; // number of particles to puff
    me.tailpuff = 2.5; // factor to puff last particle of tail
    me.pullspringforce = 200; // pull, 15 Oct 2020, much stronger as now scaled down by number of pullsprings
    me.springforce = 0.001; // force for 'standard' springs (modulated by roleforces), may change dynamically during transition
    me.basespringforce = 0.001; // force for 'standard' springs (modulated by roleforces)
    me.xyzforce = 0.001;
    tad.flowFirst = false; // true it takes tads from the front of the list
    tad.centre = new THREE.Vector3(); // centre
    me.dancerX = true; // used to establish dancerX mode
    me.useGlyph = false; // used to establish use of glyphs (defauot false trailing tadpoles)
    me.doBestTransfer = false; // use 'closest' code for transfer; still need debug
    me.docuts = false; // true for cutting
    me.cutangle = 90; // cut angle
    me.defaultScript = 'JS/tadscript.js'; // default script, probably Leeds dance
    me.extramouse = { mode: 0 };
    let roles = me.roles = {};
    // me.swapTime = 15000; no long used ???, use continousWait and continousWaitSkel
    // me.swapRate = 100;  no longer used 29/09/2020, use flowRate
    me.continuousActive = true;
    let springset; // keep track of used slots in spring topology for each particle
    me.tadpow = 0; // power for generated roles/things
    // let attthing: Thing, repthing: Thing;   // things for attractors/repellors
    me.orb = false; // true for orb rather than tadpole
    me.baseTrackerSize = 2; // tracker size
    // convience function to allow single debig breakpoint
    me.owow = function (...args) {
        const r = showvals(...args);
        console.error(r);
        return r;
    };
    // set up default lights? THIS FUNCTION MAY BE OVERWRITTEN in tadAug2022 or later script, tadkinecttune()
    me.lights = function () {
        setNovrlights(); // with no interesting shadows use 'standard' lights
        if (useKinect) {
            G.light0x *= -1;
            G.light1x *= -1;
            G.light2x *= -1;
            G.light0z *= -1;
            G.light1z *= -1;
            G.light2z *= -1;
        }
        return;
        // const dist = [2, 2, 2];
        // // 15 Feb, dropped lights
        // G.light0x = 0; G.light0y = 1; G.light0z =  0;
        // G.light1x = 500; G.light1y = 0; G.light1z =  500;
        // G.light2x = -300; G.light2y= 15; G.light2z = 400;
        // for (const i of [0,1,2]) {
        //     const d = Math.sqrt('xyz'.split('').reduce((c,j) => c += G['light' + i + j]**2, 0));
        //     for (const j of 'xyz') {
        //         G['light' + i + j] = G['light' + i + j] * dist[i]/d;
        //         G['light' + i + 'dir' + j] = -G['light' + i + j];
        //     }
        //     for (const j of 'rgb') {
        //         G['light' + i + j] = ['0r', '1g', '2b'].includes(i + j) ? 0 : 1;
        //     }
        // }
        // G.light0dirx = 9999;
        // G.light0r = G.light0g = G.light0b = 1;
        // G.light0s = 0.8; G.light1s = 0.4; G.light2s = 0.2;
        // G.ambient = 0;
        // old version setlight(0, {pos: [0,1,0], dirx: 9999})       // directional light directly above
        // warning this not always used, see me.tune instead???
        G.ambient = 0.001;
        setlight(0, { s: 1, pos: [0, 6, 3], targ: [0, 0, 1], Spread: 0.05, rgb: [0.7, 1, 1] }); // point light above and to front
        setlight(1, { s: 0.85, pos: [1.8, 0.1, 1.8], targ: tad.centre, Spread: 0.45, rgb: [1, 0.2, 1] });
        setlight(2, { s: 0.5, pos: [0, 0.9, 1.75], targ: tad.centre, Spread: 0.2, rgb: [1, 1, 0.7] }); // <<< from camera
        // G.light0dirx = G.light1dirx = G.light2dirx = 999;   // eg directional
        // G.light0s = 0.2; G.light1s = 0.7; G.light2s = 0.07;
        shadows(3); // for two main lights, not for camera light
    };
    /** add a new thing,
     * If mapall is true populate the map with all tadpoles
     * If maxtads is given it limits the number of tadpoles that can be used.
     * This will reduce overheads during applyThing interation
     * where we have multiple Things using relatively small number of tads
     *
    */
    const addThing = me.addThing = function (role, mapall = false, maxtads = role.numtads) {
        let springs = role.springs;
        if (maxtads < role.numtads)
            springs = springs.filter(s => s.at[0] < maxtads && s.bt[0] < maxtads);
        const thing = { role, springs, map: new TadkeyMap([]), prioThresh: 0,
            applyThing: () => applyThing(thing), applyProp: (tid, mapid) => applyProp(thing, tid, mapid) };
        thing.map.thing = thing;
        T.push(thing);
        if (mapall === true)
            mapall = maxtads;
        // <<< todo, this needs to come from a free tad pool? Also, event?
        // probably used for shapers not topology, so not from free pool???
        // mapall should not be used for topology things ... better clarity needed to separate topology/shapers
        if (mapall)
            thing.map.raw = [...Array(mapall).keys()];
        nextFlowTime = frametime;
        return thing;
    };
    /** use the role and map to create springs for this Thing. ? todo should be thing.doSprings() */
    function applyThing(thing) {
        const { role, springs: tsprings, map, prioThresh } = thing;
        // We may want to consider changed structures if we find we have several things
        // with a large number of potential (role.springs) tadpoles but small but non-empty maps.
        //
        const rawMap = map.raw;
        if (rawMap.length === 0)
            return; // do not waste time on 'inactive' things
        const roleStr = me.roleStrengths[role.id]; // this will become more Thing based (was G[])
        if (roleStr === 0)
            return;
        // const rolenum = role.rolenum;    // not used, handed other ways
        const sta = springs.topologyarr;
        const maxpp = springs.SPEND * 4; // max number of free array slots (spring slot*4)
        const o = me.centre;
        let lastSlotUsed = 0; // number of spring pairs needed (NOT *4)
        tsprings.forEach(function makeRealSprings(r) {
            if (r.prio < prioThresh)
                return;
            const [at, bt] = [r.at, r.bt];
            const att = rawMap[at[0]];
            const btx = rawMap[bt[0]];
            const btt = btx === undefined ? bt[0] : btx; // allow attachment to specials
            if (att === undefined || btt === undefined)
                return;
            // change below is minor optimization, but may significantly reduce garbage
            // by avoiding short list/tuple constuction
            const ai = att * RIBS + at[1]; // particle a
            const bi = btt * RIBS + bt[1]; // particle b
            const sc = me.rolescales[role.sid];
            if (r.type === 'pullspring') {
                springs.addpull(ai, r.x * sc + o.x, r.y * sc + o.y, r.z * sc + o.z, r.str * role.pullStrength);
            }
            else if (r.type === 'rod') {
                springs.addrod(ai, bi, r.len * sc, r.maxlen);
            }
            else if (r.type === 'pullsubpart') {
                springs.addspecial(ai, 0, bi, r.len, r.str, r.pow);
            }
            else {
                // springs.setslot((att*RIBS + at[1]), (btt*RIBS + bt[1]), r.len, r.str * str, r.pow, rolenum)
                // usually pretty much springs.addspring
                // optimize the setslot code.
                // This version will permit multiple springs between a and b; unlike setslot.
                const pp = springset[ai]; // array pos to use within particle
                lastSlotUsed = Math.max(lastSlotUsed, pp / 4); // keep track so we can reduce available later>
                if (pp >= maxpp) { // too many springs, give up without comment but keep stats
                    // me.owow('too many springs', role.id, ai, bi, pp/4, maxpp/4);
                    springset[ai] += 4;
                    return;
                }
                let s = ai * APOS_DEFS_PER_PARTICLE + pp; // array slot
                let bp = (bi + 0.5) / KPARTICLESP2; // + rolenum;   // convert to internal form.  parti2p(bi) + type ... don't need rolenum here
                if (typeof r.type === 'number')
                    bp += r.type; // in case of spring role/type
                sta[s++] = bp; // fill in the array positions
                sta[s++] = r.len * sc;
                sta[s++] = r.str * roleStr;
                sta[s++] = r.pow;
                springset[ai] += 4;
            }
        });
        role.lastSlotUsed = lastSlotUsed;
        if (lastSlotUsed > me.lastSlotUsed)
            me.lastSlotUsed = lastSlotUsed;
    } // applyThing();
    me.lastSlotUsed = 0;
    me.dyncols = true; // dynamically change colours as tadpoles flow
    // apply properties to a thing, or if no thing given to all active things
    me.TESTapplyProps = function (t) {
        if (t) {
            const rats = 4 * RIBS; // # properties per tadpole
            const rmap = t.map.raw;
            for (let i = 0; i < rmap.length; i++) { // i index into rats entries in roleprops
                const tid = rmap[i]; // tid index into rads entries in tadprop
                const rp = t.role.roleprops;
                if (tid !== undefined) {
                    if (me.dyncols || t.role.id === 'tadCovid2') {
                        tadprop.set(t.role.roleprops.slice(i * rats, (i + 1) * rats), tid * rats);
                    }
                    else {
                        for (let ii = 2; ii < rats; ii += 4) { // just copy target rads and optionally ribs,  //!!!! KEEP CONSTANT COVID COLOURS AND RIBS
                            let v = rp[i * rats + ii];
                            if (v === undefined)
                                v = -1;
                            tadprop[tid * rats + ii] = v;
                        }
                    }
                }
            }
        }
        else {
            T.forEach(t => me.TESTapplyProps(t));
        }
        me.propTexture.needsUpdate = true;
    };
    me._ribMult = 1;
    Object.defineProperty(me, 'ribMult', {
        get: () => me._ribMult,
        set: v => { if (v !== me._ribMult)
            me.applyRibMult(v); return true; }
    });
    /** dynamic override f rib density */
    me.applyRibMult = function (ribk = me.ribMult, t) {
        me._ribMult = ribk;
        if (t) {
            const rats = 4 * RIBS; // # properties per tadpole
            const rmap = t.map.raw;
            for (let i = 0; i < rmap.length; i++) { // i index into rats entries in roleprops
                const tid = rmap[i]; // tid index into rats entries in tadprop
                const rp = t.role.roleprops;
                for (let ri = 3; ri < rats; ri += 4) { // just copy ribs, rib index
                    if (ribk)
                        tadprop[tid * rats + ri] = rp[i * rats + ri] * ribk; //
                }
            }
        }
        else {
            T.forEach(t => me.applyRibMult(ribk, t));
        }
        if (me.propTexture)
            me.propTexture.needsUpdate = true;
    };
    /** copy data for one tadpole from roleprops into tadprop:
    but copy radius into radius_target for later smooth transition */
    function applyProp(thing, rolepropId, tid) {
        const rats = 4 * RIBS; // # properties per tadpole
        // tadprop.set(thing.role.roleprops.subarray(rolepropId * rats, (rolepropId + 1) * rats), tid * rats);
        let from = rolepropId * rats; // array pointer for to
        let to = tid * rats; // array pointer for from
        const fromarr = thing.role.roleprops; // from array
        for (let i = 0; i < RIBS; i++) {
            // tadprop[to] = fromarr[from];     // NOT radius, let it be smoothed from target
            tadprop[to + 2] = fromarr[from + 2]; // radius again, as target
            if (me.dyncols) {
                tadprop[to + 1] = fromarr[from + 1]; // colid //!!!! KEEP CONSTANT COVID
                tadprop[to + 3] = fromarr[from + 3]; // ribs //!!!! KEEP CONSTANT COVID
            }
            to += 4;
            from += 4;
        }
    }
    me.radHalflife = 2; // halflife for radius smoothing, seconds
    const curpos = VEC3();
    /** offset the pose,
     * when the user/headset is at steamVR seating position he/she will be placed at position rad.fixpos in the room  */
    me.fixpose = function () {
        const t = renderVR.posemat;
        if (t) { // <<< TODO TODO this will never be true without three.js patch
            const e = camera.matrix.elements;
            e.set(t);
            const f = me.fixpos;
            e[12] += f.x;
            e[13] += f.y;
            e[14] += f.z;
            camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
            //camera.position.add(curpos.copy(me.fixpos).applyMatrix4(tmat4.extractRotation(camera.matrix).transpose()));
            //camera.position.add(curpos.copy(me.fixpos).applyQuaternion(camera.quaternion));
            camera.updateMatrix();
            camToGenes(currentGenes);
            // onframe(()=>log('new mycam', renderVR.mycam))
        }
    };
    me.tadFixedRad = 1; // fixed radius for tadpoles if needed
    me.tadFixedRadProp = 0; // proportion of fixed radius to use
    // smoooth radii, or jump if k===0
    me.smoothrad = function smoothrad(k) {
        const abs = Math.abs, sign = Math.sign;
        if (k === undefined)
            k = 0.5 ** (framedelta / (1000 * me.radHalflife));
        const k1 = 1 - k, tf = me.tadFixedRadProp, tv = 1 - me.tadFixedRadProp;
        for (let i = 0; i < tadprop.length; i += 4) {
            const r = tadprop[i], tr = (me.tadFixedRad * tf + tadprop[i + 2] * tv) * me.tadrad; // radius and target radius
            tadprop[i] = (abs(r) * k + abs(tr) * k1) * sign(tr); // set new radius, cannot smooth sign
        }
        me.propTexture.needsUpdate = true;
    };
    me.tquat = new THREE.Quaternion();
    /** On each frame spring topolgy is set from the things */
    me.frame = function tadpole_frame() {
        V.resting = false;
        vrresting.bypassResting = true; // just in case; these should be irrelevant but ...
        me.skeldist();
        tad.setMode(); // first establish controller state
        // const done = me.flowBlock(); // does the transfer before we set the topology. now done on beat
        doReserved();
        me.smoothrad();
        me.springframe();
        if (me.oldseq && me.seq !== me.oldseq) {
            // check for dynamic change of me.seq
            console.log('tad+ tad.seq has changed, extra on beat required');
            me.oldseq = me.seq;
            me.seq.on('beat', () => { me.tadBeat(); return 0; }); // step, beat, bar, measure;  seq.step is number within beat, etc
        }
        if (!me.docovid) {
            const off = 0.03; // offset from wall where force starts (metres)
            // covidSetScene has -ve on the x, as boxsize is -ve because of view from back
            // view from back is really used by kinect setup, not nocessarily covid.
            // TODO check tests for tad.tocovid and window.useKinect
            const asp = Math.abs(G.wallAspect);
            uniforms.tadWallSize.value.set(_boxsize * asp - off, _boxsize - off, _boxsize * G.wallFrontExtra - off);
            uniforms.tadWallSizeN.value.set(_boxsize * asp - off, _boxsize - off, _boxsize - off);
        }
        if (G.camviewStr)
            U.camMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        // now handle controller visibility
        if (V.gpR)
            tad.gpR = V.gpR; // so we can turn it off if needed
        if (V.gpL)
            tad.gpL = V.gpL; // so we can turn it off if needed
        function setup(gp, tgp, resting) {
            me.setupPointerForFrame(gp); // set up with standard
            // ???
            // ???
            if (!gp && tgp) {
                tgp.meshray.visible = false;
                tgp.meshbox.visible = false;
                if (tgp.bigcontroller)
                    tgp.bigcontroller.visible = false;
            }
            else if (gp) {
                gp.meshray.visible = !resting;
                gp.meshbox.visible = !resting;
                if (gp.bigcontroller) {
                    gp.bigcontroller.visible = resting && !tad.headResting && gp.pose.visible;
                    // setupPointerForFrame set this just scaled, but in XR or ??? this is 45 degrees out
                    // TODO for now just patching as below to get orientation right in Tadpoles.  sjpt 14/2/20
                    gp.bigcontroller.quaternion.setFromAxisAngle(VEC3(1, 0, 0), Math.PI / 4);
                    gp.bigcontroller.updateMatrix();
                }
            }
        }
        if (!useKinect) {
            if (!_monitorTrackerHandle) { // todo, cleaner modes for kinect, trackers etc
                setup(V.gpL, tad.gpL, me.emul.left.resting);
                setup(V.gpR, tad.gpR, me.emul.right.resting);
            }
            else {
                U.excludeForce.fill(0);
                U.baitAttractStrength.fill(0);
                U.twist.fill(0);
            }
        }
        setrods();
        // use control twists to force global twist pullspringmat:
        // NB this ignores rotation axiz positions, uses just directions
        var rot = VEC3();
        for (let c = 0; c < CONTROLS; c++) {
            rot.addScaledVector(U.condir[c], U.twist[c] * tad.pullTwistForBait);
        }
        tmat4.makeRotationFromQuaternion(me.tquat.set(-rot.x, -rot.y, -rot.z, 1).normalize());
        U.pullspringmat.premultiply(tmat4);
        // springRotate is a per spring step (delta) rotation that rotates the particles
        // pullspringmat is a comulative rotation applied to the particles during pull; so inverse
        // U.springRotate first set as convenient intermediate value for computing new pullspringmat
        // and then set to 'correct' value
        // This is using the 'fixed' rotations set by rotx, roty, and rotz
        U.springRotate.makeRotationFromQuaternion(me.tquat.set(-me.rotx, -me.roty, -me.rotz, 1).normalize());
        for (let i = 0; i < G.stepsPerStep; i++)
            U.pullspringmat.premultiply(U.springRotate);
        U.springRotate.transpose();
        // me.li ghts();
    };
    tad.pullTwistForBait = 0.01;
    /** ensure rods have correct strength */
    function setrods() {
        let x = springs.getrod(1);
        if (x[0] < 0)
            x = springs.getrod(8); // for tree rods, no getrod(1)
        if (x[0] >= 0 && Math.abs(x[3] - me.backboneRods) > 0.0001) // x is in float32
            springs.rodspeed(0, me.backboneRods, TADS * RIBS);
    }
    me.tmat = new THREEA.Matrix4();
    // restPos structure created here and should not ever be replaced, just values changed in place
    // that is because it collects the associated THREE objects
    me.restPos = { left: VEC3(-999), right: VEC3(-999), head: VEC3(-999) };
    if (localStorage.restPos) {
        const p = JSON.parse(localStorage.restPos);
        if (p.left.x) // ignore old version where left was array
            me.restPos = { left: VEC3(p.left), right: VEC3(p.right), head: VEC3(p.head) };
    }
    me.restDistance = 0.3;
    /** call this to set resting positions on a given machine (K,=) */
    me.setResting = function () {
        const t = renderVR.posemat;
        if (V.gpLok && V.gpRok && renderVR.invr() && t) {
            // we dont want to make new structure and lose old gr fields
            const p = me.restPos;
            p.left.copy(V.gpL.threeObject.position);
            p.right.copy(V.gpR.threeObject.position);
            p.head.set(t[12], t[13], t[14]);
            // make new structure for JSON to hide the extra fields
            const r = { left: VEC3(p.left), right: VEC3(p.right), head: VEC3(p.head) };
            localStorage.restPos = JSON.stringify(r);
            msgfixlog('saved restPos', localStorage.restPos);
        }
        else {
            alert('Cannot set resting position\nYou must be in VR mode with both gamepads working');
        }
    };
    /** make decisions on mode  */
    me.setMode = function () {
        function set(em, gp, rr) {
            // we get an indication of live but invisible controller from XR getPose => three.js !controller.visible => getXrGamepads !gp.pose.visible
            let r;
            if (!gp)
                r = 'no gp';
            else if (!gp.ok)
                r = 'gp not ok';
            else if (!gp.pose.visible)
                r = 'gp not tracking';
            // else if (distarr3(gp.pose.position, rr) < tad.restDistance) r = 'resting';
            else if (gp.threeObject.position.distanceTo(rr) < tad.restDistance)
                r = 'resting';
            else
                r = 'ok';
            em.resting = r !== 'ok';
            em.mode = r;
        }
        set(tad.emul.left, V.gpL, tad.restPos.left);
        set(tad.emul.right, V.gpR, tad.restPos.right);
        // headset.
        // As far as I can see we do not get a reliable indication where headset tracking has failed,
        // but we do get an identity matrix.
        // Risk of exactly identity from actual tracking shoul be vanishly small.
        // We used to look in renderer. vr.pose.transform.matrix but that needed patch to be available
        // use renderVR.posemat instead, only rotation as position does have value anyway
        const t = renderVR.posemat;
        if (renderVR.invr() && t) {
            // note, cam position and quaternion not necessarily established.
            if (t[0] == 1 && t[1] == 0 && t[2] == 0 && t[3] == 0
                && t[4] == 0 && t[5] == 1 && t[6] == 0 && t[7] == 0
                && t[8] == 0 && t[9] == 0 && t[10] == 1 && t[11] == 0) {
                tad.headResting = true;
                tad.headMode = 'not tracking';
            }
            else {
                tad.headResting = distxyz({ x: t[12], y: t[13], z: t[14] }, tad.restPos.head) < tad.restDistance;
                tad.headMode = tad.headResting ? 'resting' : 'ok';
            }
        }
        else {
            tad.headResting = true;
            tad.headMode = 'no pose';
        }
        let text;
        if (renderVR.invr())
            text = `invr: yes,  head:${tad.headMode},  l:${tad.emul.left.mode},  r:${tad.emul.right.mode},  vrrestarts ${renderVR.xrfs.restarts}`;
        else
            text = `invr: no`;
        if (text !== me.lasttext) {
            userlog(text);
            me.lasttext = text;
        }
        msgfix('mode', text); // repeat even if not changed
        me.showResting();
    };
    //show the resting discs
    me.showResting = function () {
        if (!me.restPos.group) {
            const gr = me.restPos.group = new THREEA.Group();
            gr.name = 'tadRestposGroup';
            V.camscene.add(gr);
            me.restPos.group.visible = true;
        }
        me.restPos.group.visible = renderVR.invr();
        function setgr(oo) {
            if (!oo.gr) {
                const geom = new THREEA.CircleGeometry(1, 30);
                const mat = new THREEA.MeshBasicMaterial();
                mat.transparent = true;
                mat.opacity = 0.1;
                const mesh = oo.gr = new THREEA.Mesh(geom, mat);
                mesh.quaternion.setFromAxisAngle(VEC3(1, 0, 0), -Math.PI / 2);
                me.restPos.group.add(mesh);
            }
            if (oo.x)
                oo.gr.position.copy(oo);
            else
                oo.gr.position.set(oo[0], oo[1], oo[2]);
            oo.gr.position.z += renderVR.mycam.elements[14]; // allow for our (limited) mycam
            oo.gr.position.y -= 0.07; // allow for thickness of controllers
            oo.gr.scale.set(me.restDistance, me.restDistance, 1);
        }
        // setgr(me.restPos.head); // no point showing head resting point
        setgr(me.restPos.left);
        setgr(me.restPos.right);
    };
    /** on each frame set up the reserved slots for controllers/pseudo-controllers */
    function doReserved() {
        if (CONTROLS === 0)
            return; // todo check doReserved vs tad.showbait()
        // compute real position for gamepad
        function ss(gp) {
            if (!gp)
                return;
            let baitPosition = gp.baitPosition;
            if (!baitPosition)
                baitPosition = gp.baitPosition = new THREEA.Vector3();
            tad.tmat.copy(V.rawscene.matrix).invert(); // lhs version of rot4
            tad.tmat.multiply(gp.raymatrix); // overall
            baitPosition.set(0, 0, -G.tadBaitDist).applyMatrix4(tad.tmat);
            // make sure the bait is actually within the wall constraints
            const ws = uniforms.tadWallSize.value; // wall size (positive)
            const wsN = uniforms.tadWallSizeN.value; // wall size (negativeS)
            const e = gp.raymatrix.elements; // for gp position
            let reduce = 1;
            if (baitPosition.x < -wsN.x)
                reduce = Math.min(reduce, (-wsN.x - e[12]) / (baitPosition.x - e[12]));
            if (baitPosition.x > ws.x)
                reduce = Math.min(reduce, (ws.x - e[12]) / (baitPosition.x - e[12]));
            if (baitPosition.y < -wsN.y)
                reduce = Math.min(reduce, (-wsN.y - e[13]) / (baitPosition.y - e[13]));
            if (baitPosition.y > ws.y)
                reduce = Math.min(reduce, (ws.y - e[13]) / (baitPosition.y - e[13]));
            if (baitPosition.z < -wsN.z)
                reduce = Math.min(reduce, (-wsN.z - e[14]) / (baitPosition.z - e[14]));
            if (baitPosition.z > ws.z)
                reduce = Math.min(reduce, (ws.z - e[14]) / (baitPosition.z - e[14]));
            if (reduce < 1) {
                baitPosition.set(0, 0, -G.tadBaitDist * reduce).applyMatrix4(tad.tmat);
            }
            gp.reduceBaitDist = reduce;
            return baitPosition;
        }
        ss(V.gpR);
        ss(V.gpL);
        // fixed positions ... todo align with controllers
        const s = (a) => me.fixscale * (0.3 * Math.sin(frametime / 100000 * a) + 0.2 * Math.cos(frametime * 1.7 / 100000 * a));
        // strong springs or rods for reserved, why every frame?
        for (let h = TADS; h < TADS + CONTROLS; h++) {
            let tadlen = me.tadlen[h] = me.TADLEN;
            for (let k = 1; k < RIBS; k++) {
                springs.addrod(k + h * RIBS, k - 1 + h * RIBS, tadlen / RIBS);
                // only a few of these, don't bother to optimize
                // springs.addspring(k+h*RIBS, k-1+h*RIBS, tadlen/RIBS, str, pow);
                //v.x += tadlen; springs.set fix(k+h*RIBS, v);
            }
        }
        const sr = (TADS + CONTROLS) * RIBS; // first special fixed, not rendered, point, e.i.p
        springs.setfix(sr, me.centre); // fixed origin, w.i.p beyond reserved
    }
    function endTime(role) {
        console.timeEnd('[][]' + role.id);
        return role;
    }
    // make a new Role and save it in roles.  Make a gene for its strength (todo change?)
    async function makeRole(id, comment = 'gene ' + id, numtads = TADS) {
        console.time('[][]' + id);
        const rolenum = Object.keys(roles).length + 1;
        const r = COL.NUM - COLSAFE; // 0,1,2 reserved
        const roleprops = new Float32Array(numtads * RIBS * 4);
        // set up initial values for roleprops, often quickly overridden
        let p = 0;
        for (let tid = 0; tid < numtads; tid++) {
            const col = tid % r + COLSAFE;
            const rad = 2 * (508 / numtads) ** (1 / 3); // in tranrule G._tad_s_ radius; // '2 *' added 6 Apr 2023
            for (let pid = 0; pid < RIBS; pid++) {
                roleprops[p++] = rad;
                roleprops[p++] = col;
                roleprops[p++] = rad; // radtarget
                roleprops[p++] = G._tad_s_ribs; // ribs, initial value
            }
        }
        const role = roles[id] = { springs: [], id, numtads, rolenum, roleprops, arguments: {}, details: {}, pullStrength: 1 };
        // The value me.roleStrengths[id]] is used to generate springs as a thing is created from the role in applyThing()
        // addgeneperm(id, me.defaultRoleStrength, 0, 2000, 1,1, comment, 'tadpole');
        me.roleStrengths[id] = me.defaultRoleStrength; // ensure this wins, not values saved in .oao or similar files
        role.id = id;
        role.sid = id.replace('tad', '').replace('Virus_', '').replace('skel_', '').replace('_8_', '');
        if (!me.rolescales[role.sid])
            me.rolescales[role.sid] = 1;
        await pullSprings(role); // try to add pullsprings based on .positions file
        // await me.loadInfBin(role); // ??? overoptimization. reduces Covid by about 0.2 sec in 2 sec; gets wrong when CONTROLS value changes
        return role;
    }
    me.makeRole = makeRole; // NOT external
    const XRIBS = RIBS * 1000000;
    /** tadpoleid to spring number coercion , tadpole id is [<head#>, <pos>], pos circles, so -1 is tail */
    // function toSnum (t: Xkey): Springkey { return (typeof t === 'number' ? t : t[0]*RIBS + (t[1]+XRIBS)%RIBS) as Springkey };
    function toTid(s) {
        return (typeof s === 'number' ? [Math.floor(s / RIBS), Math.round(s % RIBS)] : s);
    }
    ;
    me.toTid = toTid;
    /** Helper to build roles. store a slot (pending spring) in a role. */
    function setslot(ai, bi, len = 1, str = 1, pow = 0, role, prio, type = role.id) {
        role.springs.push({ at: toTid(ai), bt: toTid(bi), len, str, pow, type, prio });
    }
    // Helper to build roles.  local collection of spring information.
    // n.b. we do not allow for springs that don't work here, should not happen
    // all symmetric spring handling (addspring) is managed at this level
    // and we only use asymmetric setslot/removeslot at the springs level.
    // NOTE: both springs of pair have same priority so are mapped consistently
    function addspring(ai, bi, len = 1, str = 1, pow = 0, role, prio, type = role.id) {
        setslot(ai, bi, len, str, pow, role, prio, type);
        setslot(bi, ai, len, str, pow, role, prio, type);
    }
    // me.addspring = addspring;  // ??? no, do not expose even for debug
    function addrod(role, n, from, minlen, maxlen = minlen) {
        role.springs.push({ at: toTid(n), bt: toTid(from), type: 'rod', len: minlen, maxlen,
            str: -999, pow: -999, prio: prioR(role.id) });
    }
    me.realscale = async function () {
        basescale = 1; // target scale of object if autoscaled
        camera.near = 0.1; // needs different camera near/far
        camera.far = 35; // needs different camera near/far .. increased to allow for camera further back
        _boxsize = 1.4; // was 2, but wallAspect mutliplies it for x
        G.wallFrontExtra = 1.5; // push back front wall; factor * _boxsize
        if (cMap.renderState !== 'color')
            cMap.newmesh();
        me.fixpos = VEC3(0, 0, _boxsize * 0.9);
        V.wallAspect = -1.5; // -ve for absolute, not relative to screen
        G.wall_texscale = 0.2; // for room texture
        G._tad_h_scaleK = 1; // for tadpole global scale
        renderVR.scale = 1;
        G.shadowdepthoffZ = 0.01;
        V.baseroomsize = 1;
        E.baseshrinkradiusA = 0.01; // may change to scale related value, indirect sets G.shrinkradiusA for cutters
        E.baseshrinkradiusB = 0.01; // may change to scale related value
        V.keepinroom = false; // may change to scale related value
        V.forceheight = false; // may change to scale related value
        V.nosetroomsize = true;
        onframe(me.nonvrview);
        // onframe(()=>{G._camx = G._camy = 0; G._camz=4.2;}, 3) // after initial vrtrack stuff settled
        onframe(me.fixpose, 1);
        // if (G.a_pulsescale) {
        //     G.a_pulsescale = 0.00025;
        //     G.a_pulserate = 0.5;
        //     G.a_pulsemodrate = 0.35;
        // }
        log('### about to import tadExperiencesModule in realScale');
        let tadExp = me.tadExp = await import('./mod/sketch/tadExperiencesModule.js'); // tadsetexperiences();
        tadExp.default();
        tadExp.tadcontinuous();
    };
    function onVRDisplayPresentChange() {
        if (!renderVR.invr())
            return; // leaving
        me.realscale();
        //what if we already had a listener on this session? is that possible / likely?
        //reducing risk by only adding in devMode for now.
        if (searchValues.devMode) {
            renderer.xr.getSession().addEventListener('inputsourceschange', e => {
                events.trigger('vrInputSourcesChange', e);
            });
        }
    }
    let initdone;
    /** set up the agent mapping scheme, each agent is an independent head;
     * this is the initializer for a Tadpole scheme.
      */
    me.tad = function (n = -1, ribs = searchValues.ribs || 8, skelends = 0, group) {
        G.OPOSZ = 1; // where should this be??? gets rid of odd bars on the walls. why?
        if (TADS !== -1) {
            console.log('tad+ tad.tad called second time');
            return;
        }
        msgfixlog('tad+', 'tad.tad() called');
        if (searchValues.notadgui) {
            console.error('notadgui not supported');
            searchValues.notadgui = false;
            searchValues.tadgui = true;
        }
        // deferRender = true;
        setInput(WA.EDGES, true);
        setInput(WA.menuAutoOpen, false); // not strictly tad, but tad tends to want some menus hanging around
        G.edgeprop = 0;
        G.fillprop = 0;
        Object.assign(COL.defaultDef, { texscale: 0.04, texrepeat: 1, texfract3d: 1, bandbetween: 0 });
        me.events = events = MEvents();
        addgeneperm('tadBaitDist', 0.5, 0, 2, 0.01, 0.01, 'distance of attractors from controller', 'tadpole', 0);
        addgeneperm('tadWrap', 0, 0, 1.2, 1, 1, '0 no wrap, n wrap at n * room ends', 'tadpole', 0);
        //tadsetexperiences();    // get it in early (why was this needed. will below be early enough?
        log('### about to import tadExperiencesModule');
        import('./mod/sketch/tadExperiencesModule.js').then(tadExp => tadExp.default());
        // problem below with startvr, resting caused mutation eg of _tad_s_ radius???
        // to cir more properly
        // gene ranges for wall texture and bump fixed, so resting allowed
        if (!initdone) {
            if (n === -1) {
                if (TADS === -1) {
                    me.docovid = searchValues.docovid || searchValues.tadnum === 1200; // 1200 for compatibility
                    n = searchValues.tadnum || (me.docovid ? 1200 : 508); // default for first entry
                }
                else {
                    log('tad already set up');
                    onframe(me.randcols);
                    return;
                }
            }
            me.tune(); // no harm if it is done more than once
            me.key2gui();
            // 'vrdisplaypresentchange' was a WebVR window event.
            // nb: newer versions of three have 'vr' rather than 'xr'
            //https://forums.oculusvr.com/developer/discussion/85985/vrdisplaypresentchange-not-firing-when-entering-webxr
            renderer.xr.addEventListener('sessionstart', onVRDisplayPresentChange);
            renderer.xr.addEventListener('sessionend', onVRDisplayPresentChange);
            initdone = true;
            // if (tad.allowTransitionMenu) {
            //     GUINewsub('transition', 'transition to different forms');
            //     // GUISpacer();
            //     GUIKey('L,V', 'transition covid', 'covid transition', () => me.transitionTo('V'));
            //     GUIKey('L,X', 'transition tree', 'tree transition', () => me.transitionTo('X,1'));
            //     GUIKey('L,R', 'transition random', 'random tadpoles transition', () => me.transitionTo('R'));
            //     GUIKey('L,T', 'transition twisted', 'twisted torus form transition', () => me.transitionTo('T'));
            //     GUIKey('L,S', 'transition space', 'space filling transition, ',() => me.transitionTo('S'));
            //     GUISpacer();
            //     GUIKey('L,1', 'transition covid', 'covid transition', () => me.transitionTo('V'));
            //     GUIKey('L,2', 'transition tree', 'tree transition', () => me.transitionTo('X,1'));
            //     GUIKey('L,3', 'transition random', 'random tadpoles transition', () => me.transitionTo('R'));
            //     GUIKey('L,4', 'transition twisted', 'twisted torus form transition', () => me.transitionTo('T'));
            //     GUIKey('L,5', 'transition space', 'space filling transition, ',() => me.transitionTo('S'));
            //     GUIKey('L,K,1', 'transition quick covid', 'covid transition quick', () => me.transitionTo('V', 1));
            //     GUIKey('L,K,2', 'transition quick tree', 'tree transition quick', () => me.transitionTo('X,1', 1));
            //     GUIKey('L,K,3', 'transition quick random', 'random tadpoles transition quick', () => me.transitionTo('R', 1));
            //     GUIKey('L,K,4', 'transition quick twisted', 'twisted torus form transition quick', () => me.transitionTo('T', 1));
            //     GUIKey('L,K,5', 'recenre quick', 'recenre quick', () => me.centreforce());
            //     GUIKey('L,:',   'clear transition ramps', 'clear transition ramps', () => S.jump());
            //     // GUIKey('L,K,5', 'transition quick space', 'space filling transition quick, ',() => me.transitionTo('S', 1));
            //     GUISpacer();
            //     GUIKey('shift,K,S', 'pull space', '!space filling pull, ',() => CSynth.hilbert(0.1, undefined, me.centre, true));
            //     GUIKey('shift,K,T', 'pull twisted', '!twisted torus form pull', () => CSynth.twist({sc:0.6, cen: me.centre, pull:true}));
            //     GUIKey('shift,K,R', 'pull random', '!random tadpoles pull', () => me.randposNEARDEAD({pull: true}));
            //     GUIKey('R', 'goto random', '!random tadpoles goto ', () => me.randposNEARDEAD({}));
            //     GUIKey('Delete,R', 'random bait', 'random bait ', () => me.randbait());
            //     GUIKey('shift,K,V', 'pull covid', '!covid pull', () => { runkeys('K,V,N');  runkeys('shift,K,,') }); // start covid and pull
            //     GUIKey('shift,K,X,1', 'pull tree', '!tree pull', () => { runkeys('K,X,1');  runkeys('shift,K,,') }); // start tree and pull
            //     GUIKey('shift,K,X,!', 'pull tree', '!tree pull', () => { runkeys('K,X,1');  runkeys('shift,K,,') }); // start tree and pull
            //     GUIKey(undefined, [tad, 'transitionTimeSecs', 0, 60, 0.1, 0.1, 'transition time (seconds)'] as any);
            // }
            GUINewsub('form', 'go to different forms');
            //GUIKey('K,V,X', '', 'virus test', () => me.testVirus());
            function virgui(n) {
                // if (!role) return;
                const vdef = me.virusDefs[n - 1];
                GUIKey('K,V,' + n, vdef.comment, vdef.shortname, () => me.newThing(me.TR['vir' + vdef.shortname]));
            }
            for (let i = 1; i <= 5; i++)
                virgui(i);
            // GUIKey('K,V,1', me.virusDefs[0].comment, 'SV40', () => me.newThing(me.TR.virSV40));
            // GUIKey('K,V,2', me.virusDefs[1].comment, 'HSV1', () => me.newThing(me.TR.virHSV1));
            // GUIKey('K,V,3', me.virusDefs[2].comment, 'PAV', () => me.newThing(me.TR.virPAV));
            // GUIKey('K,V,4', me.virusDefs[3].comment, 'MS2', () => me.newThing(me.TR.virMS2));
            // GUIKey('K,V,5', me.virusDefs[4].comment, 'TRSV', () => me.newThing(me.TR.virTRSV));
            // GUIKey('K,P', '', 'no p', () => {});
            WA.loadopen = nop; // prevent 'standard' K,H from operating (loadopen broken for non csynth)
            // GUIKey('K,H', '', 'no p', () => {});     // prevent 'standard' K,H from operating
            for (let i = 0; i < tad.SKELS.length; i++) { // add skeletons to form gui
                const n = tad.SKELS[i];
                const sn = n.length <= 12 ? n : 'horn ' + i;
                GUIKey('K,H,' + (i + 1), n, sn, () => me.newThing(me.TR[n]));
            }
            // GUIKey('K,L', 'green man', 'tadman', () => {
            //     if (tadkin._man) {
            //         msgfixlog('greenman', 'greenman already active')
            //     } else {
            //         msgfixlog('greenman', 'greenman activated')
            //         tadkin.manthing(tad.newThing(tad.TR.tadman));
            //     }
            // });
            GUIKey('K,F', 'loose now', 'free1', () => tad.newThing(tad.TR.tadfree));
            GUIKey('K,F,2', 'loose now 2', 'free2', () => tad.newThing(tad.TR.tadfreeL2));
            GUIKey('K,F,4', 'loose now', 'free4', () => tad.newThing(tad.TR.tadfreeL4));
            GUIKey('K,A', 'picasso 1', 'Picasso 1', () => { tad.newThing(tad.TR.picasso); WA.useColdict(); });
            GUIKey('K,X,1', 'branch 15', 'tree_1_5', () => me.newThing(me.TR.tree15));
            GUIKey('K,X,2', 'branch 12', 'tree_1_2', () => me.newThing(me.TR.tree12));
            GUIKey('K,X,3', 'branch 35', 'tree_3_5', () => me.newThing(me.TR.tree35));
            GUIKey('K,X,4', 'branch 32', 'tree_3_2', () => me.newThing(me.TR.tree32));
            GUIKey('K,X,5', 'branch 117', 'tree_1_17', async () => me.newThing(await me.tadtree(1, 17)));
            GUIKey('K,V,B', 'covid2', 'covid 2', () => { me.newThing(me.TR.tadcovid2); /* me.covidCol(); */ });
            GUIKey('K,S', 'space', 'space filling', () => { me.newThing(TR.tadspace); });
            // GUIKey('K,T', 'twisted', 'twisted torus form', () => { CSynth.twist({sc:0.6, cen: me.centre}); me.clearpull(); });
            GUIKey('K,T', 'twisted', 'twisted torus form', () => { me.newThing(TR.tadtwist); });
            GUIKey('K,R', 'random', 'random tadpoles', async () => { me.newThing(await me.tadrand()); }); // dynamic to pick up wallsize
            tad.formlistgui = GUISpacer();
            GX.getgui(/form\/covid/).highlight();
            const u = undefined;
            // cuts unreliable for now 2 Sept 2022
            // GUISubadd(tad, 'docuts', u,u,u, 'use cuts', 'use cutting').onChange(() => me.tunecuts());
            // GUISubadd(tad, 'cutangle', u,u,u, 'cut angle', 'cut angle').onChange(() => me.tunecuts());
            // GUISubadd(tad, 'doBestTransfer', u,u,u, 'best transfer', 'use transfer to closest')
            // both _Uscale and _tad_h_scaleK had issues matching correct tadkin inputs
            // GUISubadd(G, '_tad_h_scaleK', 0.5, 5, 0.01, 'vscale', 'vscale').listen();
            GUISubadd(tad, 'rolescale', 0.5, 5, 0.01, 'object size', 'object size').listen().onChange(tad.covidSetScene);
            // also scales red squares GUISubadd(G, '_uScale', 0.5, 5, 0.01, 'object size', 'object size, mouse centre drag').listen();
            // GUIKey('K,X,S', 'sphere', 'sphere', () => me.newThing(me.TR.tadsphere));
            // GUIKey('K,V,N', 'covid2 ordered', 'covid ordered', () => {runkeys('K,V,B'); runkeys('K,O'); });
            // // GUIKey('K,V,X', 'covjump', 'covjump', () => {
            // //     me.newThing(me.TR.tad covid);
            // //     me.covidCol();
            // //     GX.setValue(/ousact/, false);
            // //     GX.setValue(/isinter/, false);
            // //     tad.topos();
            // //     runkeys('K,J,1');
            // //     // me.colorCyclePerMin = 0;
            // // });
            // GUIKey('K,F,1', 'loose 1', 'tadfree1', () => me.tadfreego(1));
            // GUIKey('K,F,2', 'loose 2', 'tadfree2', () => me.tadfreego(2));
            // GUIKey('K,F,4', 'loose 4', 'tadfree4', () => me.tadfreego(4));
            // GUIKey('K,F,8', 'loose 8', 'tadfree8', () => me.tadfreego(8));
            // GUIKey('K,F,3', 'loose 3', 'tadfree3', () => me.tadfreego(3));
            // GUISpacer();
            GUIKey('K,,', '', 'JUMP to form', () => me.topos());
            GUIKey('K,D', '', 'normalize orientation', () => me.captureOrientation({ save: false }));
            GUIKey('K,>', '', 'save orientation', () => me.captureOrientation());
            GUIKey('K,<', '', 'restore orientation', () => me.restoreOrientation());
            GUIKey("K,'", '', 'flow all to form', () => tad.flowBlock(true));
            GUIKey('K,!', '', 'order tadpoles (technical)', () => tad.allOrdered(true));
            GUIKey('K,=', '', 'applyProps', () => tad.TESTapplyProps());
            GUIKey('K,C', 'centre', 'centre using pullspring', () => me.centreforce());
            GUIKey('Delete,S', 'prepare and save pulls', 'set up and save pullspring', () => me.prepAndSavePositions());
            GUIKey('Delete,D', 'save pulls', 'save pulls', () => me.savePositions());
            GUIKey('Delete,F', 'pure form toggle', 'pure form toggle', () => me.pureForm());
            GUIKey('K,G', 'grow', 'grow current form', () => me.grow());
            GUIKey('shift,K,C', 'show colours', 'show the different colours\nselect a differnt form to clear', () => tad.displaycolours());
            // GUIKey('shift,K,,', '', 'pull to form', () => me.to pos(undefined, undefined, true));
            // GUIKey('shift,K,<', '', 'pull to form', () => me.to pos(undefined, undefined, true));
            // GUIKey('shift,K,.', '', 'clear pull', () => me.clearpull());
            // GUIKey('shift,K,>', '', 'clear pull', () => me.clearpull());
            // GUIKey('K,G', '', 'gui',() => tad.testgui());
            GUISpacer().highlightLastPressed(0x002200).panel._nosave = true;
            GUINewsub('form control', 'form control settings');
            GUIKey('K,B', '', 'swap pull and dist forces', () => {
                if (G.pullspringforce === 0) {
                    G.pullspringforce = me.pullspringforce;
                    G.xyzforce = 0.0;
                }
                else
                    me.skeldist({});
            });
            GUISpacer().highlightLastPressed(0x002200).panel._nosave = true;
            // GUIKey('K,\\', '', 'go to skel position', () => {
            //     me.skelpos();
            //     uniforms.pullspringmat.value.identity();
            // });
            // GUIKey('K,]', '', 'fix skel',() => {
            //     G.twist Base=0; tad.baseBaitAttractStrength=0; G.baseExcludeForce=0;
            // });
            // GUIKey('K,[', '', 'free skel', () => tad.tune() );
            COL.colourkeys();
            GUIwallkeys();
            tad.normalView = function (fix = false) {
                renderObjs = renderObjsInner;
                const camz = -camera.position.distanceTo(tad.centre), fovmult = me.covdef.fovmult;
                tad.covidSetScene({ camz, fovmult });
                me.trackRoom(false);
                if (fix)
                    onframe(() => tad.covidSetScene({ camz, fovmult }));
            };
            GUINewsub('views', 'view settings');
            GUIKey('K,Q,1', 'normal', 'normal view', () => { setViewports([0, 0]); setSize(); tad.normalView(true); });
            GUIKey('K,Q,2', 'SIML real', 'SIML real', () => { tad.normalView(); WA.multiview(G._camz, tad.centre); });
            GUIKey('K,Q,3', '3 fit', '3 view single monitor', () => { tad.normalView(); WA.multiview(G._camz, tad.centre, true); });
            GUIKey('K,Q,4', 'SIML virtual', 'SIML virtual', () => me.renderroom());
            /** function for setting room camera */
            function cs(x, y, z, type = me.covdef, lookat = me.centre) {
                me.renderroom();
                const cam = me.roomcamera;
                if (!cam)
                    return;
                const yy = (y <= -9) ? y = me.centre.y : y * me.covdef.h * 0.99;
                if (lookat.y <= -9)
                    lookat.y = me.centre.y;
                cam.position.set(x * me.covdef.w * 0.47, yy, z * me.covdef.d * 0.47);
                cam.updateMatrix();
                cam.lookAt(lookat);
                cam.updateMatrix();
                me.orbitControls.target.copy(lookat);
                me.orbitControls.update();
                cam.fov = type.fovy || 40; // ?? let this 40 be more flexible TODO
                cam.aspect = type.fovx ? Math.atan(type.fovx / 2 * Math.PI / 180) / Math.atan(type.fovy / 2 * Math.PI / 180) : width / height;
                cam.updateProjectionMatrix();
            }
            GUIKey('K,Q,5', 'back', 'from back', () => cs(0, -99, 1));
            GUIKey('K,Q,6', 'centre', 'from cente', () => cs(0, -99, 0.01));
            GUIKey('K,Q,7', 'top right', 'from top right, wide fov', () => cs(1, 1, -1));
            GUIKey('K,Q,8', 'k2 centre', 'k2 from centre of front wall', () => cs(0, -99, -1, tadkin.k2));
            GUIKey('K,Q,9', 'k2 top right', 'k2 rom top right of front wall', () => cs(1, 1, -1, tadkin.k2));
            GUIKey('K,Q,0', 'k2 top centre', 'k2 from top centre of front wall', () => cs(0, 1, -1, tadkin.k2, VEC3(0, 0, 0)));
            GUIKey('K,Q,8X', 'k4 centre', 'k4 from centre of front wall', () => cs(0, -99, -1, tadkin.k4));
            GUIKey('K,Q,9X', 'k4 top right', 'k4 from top right of front wall', () => cs(1, 1, -1, tadkin.k4));
            GUIKey('K,Q,0X', 'k4 top centre', 'k4 from top centre of front wall', () => cs(0, 1, -1, tadkin.k4, VEC3(0, 0, 0)));
            GUISpacer();
            GX.getgui('views/normalview').highlight();
            // canvas.addEventListener('wheel', () => xx.camdist = -G._camz);
            // canvas.addEventListener('wheel', () => {me.covdef.camz = G._camz; me.covidSetScene(); });
            canvas.onwheel = evt => zoom(0, 0, -evt.deltaY / 1000, G); // override wheel completely, no interactive camera change
            GUINewsub('system', 'system settings');
            GUIKey('K,M', 'monitor Tackers', 'monitor Tackers', () => monitorTrackers());
            GUIKey('K,E', 'director start+odd/wrong form', 'director start+odd/wrong form', () => {
                Director.start();
                HornSet.orderbug = HornSet.subsfortails = true;
                regenHornShader();
            });
            GUIKey('K,ArrowLeft', 'previous', 'back tadpole Thing', () => {
                tad.nextThing -= 2;
                tad.newThing();
            });
            GUISpacer().highlightLastPressed(0x002200).panel._nosave = true;
            GUIKey('K,ArrowRight', 'next', 'next tadpole Thing', () => tad.newThing());
            GUIKey('K,Delete', '', 'clean view (no mess)', () => { nomess(); V.gui.visible = false; });
            GUIKey('K,Insert', '', 'show menus etc', () => { nomess('release'); V.gui.visible = true; });
            GUIKey('shift,K,Delete', '', 'clean for record video session, and higher res', () => tad.recordReady());
            GUIKey('shift,K,Insert', '', 'show details again', () => tad.recordOff());
            GUIKey('K,[', 'baton mode', 'baton mode (dyn)', () => { me.dancerX = false; me.imode = 'dyn'; });
            GUIKey('K,[,1', 'baton mode', 'baton mode (dyn)', () => { me.dancerX = false; me.imode = 'dyn'; });
            GUIKey('K,[,2', 'baton angles', 'baton mode (angles)', () => { me.dancerX = false; me.imode = 'angles'; });
            GUIKey('K,]', 'dancerX mode', 'dancerX mode', () => me.dancerX = true);
            GUIKey('K,.,1', '', 'render single particles', () => me.shortRender(1));
            GUIKey('K,.,2', '', '2 particle tads', () => me.shortRender(2));
            GUIKey('K,.,3', '', '3 particle tads\nodd wrapping expected', () => me.shortRender(3));
            GUIKey('K,.,4', '', '4 particle tads', () => me.shortRender(4));
            GUIKey('K,.,8', '', '8 particle tads', () => me.shortRender(8));
            // GUIKey('K,0', '', 'sleep as much as possible', tad.still);
            GUIKey('K,O', '', 'order map in role', () => me.allOrdered());
            GUIKey('K,Z', '', 'various simplifications', () => {
                me.emul.left.baitWeight = me.emul.right.baitWeight = 0;
                me.emul.left.twist = me.emul.right.twist = 0;
                U.baitAttractStrength[0] = U.baitAttractStrength[1] = 0;
                uniforms.pullspringmat.value.identity();
                me.flowRate = 1000;
                G._camz = 7; // G.tadBac kbone2 = 0;
                cMap.SetRenderState('color');
            });
            // GUIKey('K,N', '', 'normalize order of tads in first thing', () => {
            //     tad.T[0].map.raw.sort((a,b)=>a-b);
            //     tad.doApply()
            // });
            GUIKey('K,=', '', 'set resting position for controllers', () => tad.setResting());
            // });
            GUIKey('K,P,1', '', 'virus reset position', () => me.virpos());
            GUIKey('K,P,2', '', 'virus reset position rest 2', () => me.virposLineSpike());
            GUIKey('Insert,Delete', 'monitor trackers centre', 'monitor trackers centre, dancerX', () => {
                tad._trackerUse = undefined;
                msgfix('_trackerUse', 'pending');
                setTimeout(tad.monitorTrackersCentre, 2000);
            });
            GUIKey('Insert,0', 'clear object', 'clear object', () => tad.tadprop.fill(0, 0, 1200 * 4 * 8));
            GUIKey('Insert,1', 'show object', 'show object', () => tad.TESTapplyProps());
            GUIKey('Insert,W', 'wide trackers', 'expand tracker range (for testing)', () => tad.trackerScaling = 1.5);
            GUIKey('Insert,N', 'normal trackers', 'standard tracker range', () => tad.trackerScaling = 1);
            // GUIKey('Insert, D', 'dance demo', 'dance demo', () => addscript('JS/taddemo.js'));
            GUIKey('Insert,S', 'tadkin script', 'tadkin script', () => { tadkin.scriptx = {}; addscript(me.defaultScript); });
            GUIKey('Insert,F', 'tadkin script fixed', 'tadkin script fixed walls etc', () => { tadkin.scriptx = { fix: true }; addscript(me.defaultScript); });
            // GUIKey('S', 'dance script', 'dance descriptmo', () => addscript(me.defaultScript));      // 'S' for move
            // GUIKey('Insert,B', 'dance background script', 'dance background descriptmo', () => addscript('JS/leedsBackground.js'));
            GUIKey('Insert,B', 'sept8 extras', 'sept8x', () => { tadkin.scriptx = { extras: true }; addscript(me.defaultScript); });
            GUIKey('Insert,T,S', 'dance script', 'dance descriptmo', () => addscript('JS/tadscriptStephen.js'));
            GUIKey('Insert,ArrowRight', 'spring step', 'spring step', () => springs.step(1));
            GUIKey('shift,Insert,ArrowRight', 'spring ten step', 'spring step ten', () => springs.step(10));
            GUIKey('Insert,H', 'hide', 'hide and go to exhibition mode', () => tad.exhibspecial());
            GUISpacer();
            me.setupPointerForFrame = V.setupPointerForFrame; // so it can be done under our control
            V.setupPointerForFrame = nop;
            G._uScale = 1;
            log('tad called at frame .........................................', framenum, 'n=', n);
        } // initdone
        cleangenesall(me.roles, true);
        roles = me.roles = {};
        me.tadnum = me.TADS = TADS = n;
        me.GROUP = group || n < 256 ? 3 : 4;
        if (restoringInputState)
            return; // got a pseudo-click from menu
        me.TADLEN = 0.08 * (508 / n) ** (1 / 1.5); // more tadpoles must be smaller
        springs.stop();
        me.fixstyle = true;
        uniforms.skelbufferRes.value.set(1, 1); // reduce buffers to minimum, help debug
        skelbuffer = 0;
        HEADS = me.HEADS = TADS + RESERVED;
        RIBS = me.RIBS = ribs;
        SKELENDS = skelends;
        KPARTICLES = numInstances = WA.numInstances = HEADS * RIBS;
        springs.nonp2 = Math.log2(KPARTICLES) % 1 !== 0;
        springs.NUMSPECIALS = 4;
        KPARTICLESP2 = springs.setPARTICLES(KPARTICLES, 0);
        springs.setMAX_DEFS_PER_PARTICLE(MAX_DEFS_PER_PARTICLE);
        HW.resoverride.skelends = uniforms.skelends.value = SKELENDS;
        HW.resoverride.skelnum = RIBS - 2 * SKELENDS - 1; // to align skeleton with particles, allowing for 2 extra at each end for splining
        // me.setshader();  // reestablish goff etc in terms of RIBS etc
        tadprop = me.tadprop = new Float32Array(4 * numInstances);
        me.propTexture = new THREEA.DataTexture(me.tadprop, RIBS, HEADS, THREEA.RGBAFormat, THREEA.FloatType, undefined, // type,mapping
        undefined, undefined, // wrapping
        THREEA.NearestFilter, THREEA.NearestFilter);
        addtaggeduniform('tadpole', 'tadprop', me.propTexture, 't', true);
        // initial values for reserved
        // me.reservedProps(); // a bit later on first thing
        springset = new Int16Array(KPARTICLES); // keep track of used slots in spring topology for each particle
        springs.clearall();
        // setval("histStepsPerSec", 25.6);  // not used as no history used
        springs.setHISTLEN(0); // we do not usually use spring history at all and can have 0 here, but may want it for some situations
        // almost setSpringTopology but not quite, this will get done when needed, don't risk doing twice
        //?????springs.step(1);  // stop step doing resettopology later if things changed
        //????    springs.resettopology();
        adduniform('HEADS', HEADS);
        adduniform('RIBS', RIBS);
        adduniform('LRIBS', RIBS);
        // adduniform('KPARTICLES', KPARTICLES);
        //extradefines='#define SKELPICK\n';
        //remakeShaders(true);  // force remake of shaders now we have done some changes
        me.tadlen = new Array(HEADS);
        //let role: Role;
        // // springs to create one long backbone
        // // not actually used
        // me.tadFullBackbone = await makeRole('tadFullBackbone', 1000, 'forces to bring all tadpoles into one very long string');
        // for (let h = 1; h < TADS; h++) {
        //     addspring(h*RIBS, h*RIBS-1, me.TADLEN/RIBS, 1, 0, me.tadFullBackbone, 1);
        // }
        // some settings for Pompidou, ? should be in oao but more centralized here for now
        // from discussion with William, 14/1/20
        V.torchlight = false; // just use fixed lights
        V.headlight = false;
        // CSynth.setNovrlights();         // this ensures the non-horn rendering uses same lights as novrlights
        // from start Feb to 15 Feb
        // G.light0x = 350; G.light0y = 800; G.light0z =  440;
        // G.light1x = 350; G.light1y = 350; G.light1z =  350;
        // G.light2x = -100; G.light2y=-400; G.light2z = 400;
        me.lights();
        onframe(me.lights, 20); // in case overwritten by Vivecontrol torch handling
        cMap.SetRenderState(useKinect ? 'color' : 'walls'); // no feedback, confusuing (and expensive)
        V.skip = false; // do all wall mutation etc even if not in vr
        setAllLots('wall_red | wall_green | wall_blue', { free: 10 }); // let these work with wall mutation
        setAllLots('wall_refl', { value: 0, free: 0 }); // let these work with wall mutation
        // genedefs.wall_refl1.max = 0.6;
        // genedefs.wall_refl2.max = 0.3;
        // genedefs.wall_refl3.max = 0.1;
        G.wall_bumpstrength = 0.7; // bumping suitable for non-reflective walls
        G.wall_bumpscale = 0.06;
        G.wall_band1 = 9.63800048828125; // these are fixed by default
        G.wall_band2 = 2.4850783348083496;
        G.wall_band3 = 1.7756761312484741;
        G.wall_bandbetween = 1.947914481163025;
        copyFrom(G, {
            wall_red1: 0.09304509311914444,
            wall_green1: 0.7096248865127563,
            wall_blue1: 0.2015729695558548,
            wall_refl1: 0,
            wall_red2: 0.30622896552085876,
            wall_green2: 0.3034820258617401,
            wall_blue2: 0.21031445264816284,
            wall_refl2: 0,
            wall_red3: 0.4729572832584381,
            wall_green3: 0.4427034556865692,
            wall_blue3: 0.15553173422813416,
            wall_refl3: 0,
            wall_gloss1: 0.2
        });
        setAllLots('wall_flu', { value: 1, free: 0 });
        G.wall_fluwidth = 0.001;
        G.flatwallreflp = searchValues.tadbw ? 1 : 0.975; // so a tiny bit of bumping shows on image 'reflection'
        onframe(() => currentHset.wallgenes.flatwallreflp = true, 10);
        genedefs.flatwallreflp.free = 1;
        genedefs.flatwallreflp.min = 0.95;
        setInput(WA.showuiover, false);
        setInput(WA.USESKELBUFFER, true);
        setInput(WA.FLATMAP, true);
        // setInput(WA.FLATWALLREFL, true); // <<<??????? bug with y=0 floor
        setInput(WA.FLATWALLREFL, true); // works better with right scale and
        setInput(WA.FLUORESC, true);
        // setInput(WA.tranrulebox, '->');
        setInput(WA.shadr2048, true);
        setInput(WA.shad1, true);
        SHADOWRESDIFF = 0;
        HW.alignskel(10);
        // lines below
        //setAllLots('wall_refl', 1);     // colours and strengths
        //G.wall_refl1 = 0.2; G.wall_refl2 = 0.1; G.wall_refl3 = 0.05;    // and then mutate
        //cMap.m_urls[0] = 'images/handdrawn2.jpg'; cMap. Init();  // load handdrawn image
        //cMap.wallType = [0,0,0,0,0,0];  // and use on all walls
        setInput(WA.NOSCALE, true);
        setInput(WA.NOCENTRE, true); // so spring space == model space
        baseShaderChanged(true); // prevent base shader initial frames optimization ... todo bettwe say
        onframe(async function tadonframe() {
            G._tad_h_ribs = TADS + CONTROLS - 1; // there are actually ribs+1 subhorns
            // if (genedefs._tad_h_ribs === undefined) return;
            genedefs._tad_h_ribs.free = 0;
            COL.applyGui(); // me.randcols();  // so all colors populated
            genedefs._tad_s_radius.free = 0;
            genedefs._tad_s_radius.min = 0.002;
            genedefs._tad_s_radius.max = 0.020;
            genedefs._tad_s_radius.delta = 0.0001;
            genedefs._tad_s_radius.step = 0.0001;
            geneSpeed._tad_s_radius = 0.001;
            G._tad_s_radius = 0.02;
            G.ribdepth = 2; // 0.5;
            me.skelRibFac = 250; // for #ribs on skeleton based on length
            me.skelRibMax = 450; // up to maximum
            G.stardepth = 1; // nb significantly modulated in tranrule
            G.nstar = 5;
            renderer.setClearColor(ColorKeywords.black);
            renderer.clearTarget(skelbuffer, true, true, true); // << debug
            // work in real scale <<< some of these (V.baseroomsize) need repeating after entering VR
            me.realscale();
            // centrescalenow(); resetMat(); // ???? why, camera has y which gets broken, and scaling irrelevant? sjpt 27/12/2021
            springs.start();
            // everyframe(me.frame);  // no, unnecessary anonymous intermediate
            Maestro.on('preframe', me.frame);
            // collect all spring related genes here ... tune dynamics
            //G.modelSphereRadius = 2;  // 1 or 2 should be sensible but ...??? to tie in with _boxsize
            G.modelSphereForce = 0; // replaced with wall equivalent
            G.pullspringforce = me.pullspringforce; // ??? 0.03 for tadskel IF we are using pullsprings
            if (!me.docovid)
                uniforms.pullspringmat.value.elements[14] = -0.5; // push skel form back (unless we get better distortion)
            G.xyzpow = 0; // for tadskel with distances; 0 was very unstable but OK with no 0 distances, -0.1 seems better, -1 not that different???
            // odd test, why not almost same after settling
            G.powBaseDist = 1; // 4; // 1;  // ??? to change when underlying spring forumula correct?
            G.springpow = 0;
            G.backboneScale = 0.01;
            G.springrate = 0.1;
            G.springmaxvel = 0.01; // prevents overfast transistions: maybe later limit forces instead, this is easier
            // me.defaultSpringMaxvel = G.springmaxvel;    // used for dynamic change, but doesn't help bait going too fast for clump
            for (const rn in tad.roles)
                G[rn] = 26000; // this will set all the 'generic' ones, ? not used any more anyway ? 18Aug2022
            //G.tad Backbone = 25000;       // part of each individual role
            // G.tadBack bone2 = 0;         // do not have hoped for effect and can cause zigzags
            G.wallStr = 10; // was 10, changed to use camviewStr, reestablished as 10
            G.camviewRange = 0.9;
            G.camviewStr = 0.1;
            G.backboneStrength = 1; // leave it to tad defined variants
            G.springCentreDamp = 1 - 1e-5; // very small attraction to keep centred
            G.pushapartforce = 7e-7;
            me.pushapartforce = G.pushapartforce; // real value computed dynamically
            G.pushapartpow = -1; // 0 means very close particles don't blow apart, but then sphere does not work right
            G.tadBaitDist = 1.6;
            G.pushapartlocalforce = 0; // was 0.2, changed dynamically by triggers
            G.nonBackboneLen = 5;
            // for (let id in roles) me.forcepow(roles[id], 1);  // VERY temporary I hope, use me.tadpow
            // me.forcepow(me.roles.tad Backbone, 2)     .. done at setup
            //msgfix('!radii', ()=>CSynth.stats().radii);  // help debug size
            //msgfix('!pows', ()=>springs.pairsfor(0).map(s=>s.pow));
            // G.stepsPerStep = 4;                 // reasonable speed at 45fps
            // G.stepsPerStep = -0.18;                 // speed should be same on all hardware, -ve is stepsPerMs
            G.stepsPerStep = 2; // -ve suddenly became very irregular (why???)
            me.tune();
            if (me.extraDetails)
                await me.extraDetails(); // eg to be filled in in tranrule
            me.tunedone = true;
            log('tadpole tune done');
        }, 2);
        onframe(() => {
            guifilter.value = 'tad | spring | pushapart | width | snip';
            filterDOMEv();
            updateGuiGenes();
        }, 3);
        /** override pow settings on a thing or role ... WARNING on thing may have side-effect on role */
        me.forcepow = function (thing, pow) {
            thing.springs.forEach(s => s.pow = pow);
        };
        /** get all the models loaded async, just initial one loaded sync */
        me.extraDetails = async () => {
            if (searchValues.dotadpomp)
                return me.extraDetailsPomp();
            msgfixlog('tad+', 'extra details +++++++++++ (not Pomp');
            if (me.docovid) {
                setObjUniforms(G, uniforms); // make sure tuned genes set as uniforms
                springs.setup();
                // me.xspring(); // no longer need to repeat
                U.roleforces.set(_rfdefault); //  [1, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.01, 0.01, 0, 0.003, 0.001, 1, 1, 1, 1];
                for (let i = 0; i < TADS * RIBS; i++)
                    springs.setfix(i, i, -i, 999);
                for (let i = TADS * RIBS; i < (TADS + CONTROLS) * RIBS; i++)
                    springs.setfix(i, 999, 999, 999);
                springs.setfix((TADS + CONTROLS) * RIBS, me.centre);
                for (let i = (TADS + CONTROLS) * RIBS + 1; i < KPARTICLES; i++)
                    springs.setfix(i, NaN, NaN, NaN);
                springs.finishFix(TADS * RIBS);
                // me._tad covidbase = await me.tad covidbase();
                // patch for quick start of no covid ... todo make more generic by setting up TR as lazy list of functions so all can be ready asap
                if (searchValues.initcovid) {
                    (async () => TRA.push(TR.tadcovid2 = await me.tadcovid2()))();
                }
                else {
                    TRA.push(TR.tree15 = await me.tadtree(1, 5));
                }
            }
            else {
                TRA.push(TR.virSV40 = await me.tadVirus(me.virusDefs[0]));
            }
            me.flowBlock(); // so covid starts ready
            // me.topos();  // implied in initial flowBlock?
            // tad.firstvals = tadkin.interestingValues(); // debug
            if (deferRender) {
                // U.coreTwistForce = 0;
                // U.coreVelocityForce = 0;
                // U.coreEachBait = 0;
                // U.coreBestBait = 0;
                // springs.rodspeed(0, -0.1, 9600);
                // U.tadWallSize.set(999,999,999);
                // U.tadWallSizeN.set(999,999,999);
                // U.pullfixdamp = 0;
                // const a = springs.getpos(1)[0].x; springs.step(1); const b = springs.getpos(1)[0].x;
                // if (Math.abs(a-b) > 0.01)
                //     me.owow('tad+ unexpected springs', a, b);
                springs.stop();
                Maestro.on('firstRealRender', () => {
                    springs.start();
                    msgfixlog('tad++', 'main springs starting ~~~~~~~~~~~~~~~~~~~~~~');
                    // tad.latevals = tadkin.interestingValues();   // debug
                    // tad.changedvals = WA.objectDiff(tad.firstvals, tad.latevals);
                });
                // renderFrameInner(); // get the meterial compilation done
            }
            deferRender = false; // let rendering happen even if no seq
            me.covidSetScene(); // may have box size deferred
            if (noaudio) {
                setInterval(() => { me.tadBeat(); return 0; }, 500); // step, beat, bar, measure;  seq.step is number within beat, etc
            }
            else {
                (async () => {
                    await S.waitVal(() => me.seq);
                    me.oldseq = me.seq; // in case me.seq changes
                    me.seq.on('beat', () => { me.tadBeat(); return 0; }); // step, beat, bar, measure;  seq.step is number within beat, etc
                })();
            }
            // now we can start rendering
            deferRender = false;
            msgfixlog('tad+', 'extra details part 1 done, deferRender turned off');
            // and prepare other non-covid objects in background
            me.detailsAsync();
        };
        /** now all the other models, in background */
        me.detailsAsync = async () => {
            GX.makegxx(); // will be redone later, but get in early in case of load before all details ready
            log('tad+ detailsAsync set here');
            // CubeMap.SetRenderState('fixpeekfeedbackNOSET');
            // G.a_pulsepow = 1;
            // G.a_pulsescale = 0.0005;
            // G.a_pulseperhorn = 1.3;
            // exhibitionMode = false; // for debug, no, will usually be off anyway
            // showControls('fixon');    // for debug
            V.keepinroom = 'vr'; // keep in room, but only for vr
            // springs.helix({strength: 1000, step: 23, rad:34, pitch: 65})
            if (searchValues.simple) {
                cMap.SetRenderState('color');
                G.a_pulsescale = 0; // ?? is anyway
            }
            else {
                // onframe(() => {
                //     // modified from me.oao, but fixcamera feedback not used now anyway
                //     var ff = cMap.fixcamera;
                //     if (!ff) return;     // probably running with just colour, or ???
                //     ff.position.set(1.5, 0.3, -1.5); ff.lookAt(0,0,0);
                //     ff.near = 0.01; ff.far = 40; ff.fov=25; ff.updateProjectionMatrix();
                //     cMap.fixres = 512;    // too low, but right for performance, need filtering
                // }, 4);
                G.a_pulsescale = 0;
            }
            // tentative: TR will be used in experiences (such as mixThings, swapThing)
            // or maybe T will.    Both should only have displayable Things not manipulation things
            // var { TR } = tad;
            async function wwait() { await S.frame(); await sleep(1); }
            if (searchValues.notaddetails)
                return log('+++ notaddetails');
            if (!searchValues.initcovid)
                TRA.push(TR.tadcovid2 = await me.tadcovid2());
            for (const s of me.SKELS) { // load all skeletons (slowly)
                await wwait();
                TR[s] = await me.tadskel({ fid: s + '.skelj', relsize: 1.25 });
            }
            // TRA.push(TR.horn3 = me.tadhornPOMP(3));
            await wwait();
            TRA.push(TR.testc);
            await wwait();
            if (!TR.virSV40)
                TRA.push(TR.virSV40 = await me.tadVirus(me.virusDefs[0]));
            await wwait();
            TRA.push(TR.tree32 = await me.tadtree(3, 2));
            await wwait();
            TRA.push(TR.tadfree = await me.tadfree({ lenfac: 1 }));
            await wwait();
            TRA.push(TR.tadfreeL2 = await me.tadfree({ lenfac: 2 }));
            await wwait();
            TRA.push(TR.tadfreeL4 = await me.tadfree({ lenfac: 4 }));
            await wwait();
            TRA.push(TR.virHSV1 = await me.tadVirus(me.virusDefs[1]));
            await wwait();
            TRA.push(TR.tree12 = await me.tadtree(1, 2));
            await wwait();
            TRA.push(TR.testA);
            await wwait();
            TRA.push(TR.tree35 = await me.tadtree(3, 5));
            await wwait();
            TRA.push(TR.virPAV = await me.tadVirus(me.virusDefs[2]));
            await wwait();
            TRA.push(TR.tadfree1 = await me.tadfree());
            await wwait();
            if (!TR.tree15)
                TRA.push(TR.tree15 = await me.tadtree(1, 5));
            await wwait();
            TRA.push(TR.tadsphere = await me.tadsphere());
            await wwait();
            TRA.push(TR.virMS2 = await me.tadVirus(me.virusDefs[3]));
            // TRA.push(TR.horn2 = await me.tad horn(2));
            await wwait();
            TRA.push(TR.tadfree2 = await me.tadfree());
            await wwait();
            TRA.push(TR.testb);
            await wwait();
            TRA.push(TR.virTRSV = await me.tadVirus(me.virusDefs[4]));
            await wwait();
            TRA.push(TR.tadtwist = await me.tadtwist());
            await wwait();
            TRA.push(TR.tadspace = await me.tadspace());
            await wwait();
            // TRA.push(TR.tadrand = me.tadrand()); //no, pick up tandrand dynamically
            await wwait();
            TRA.push(TR.picasso = await WA.tadps());
            if (tadkin)
                TR.tadman = await tadkin.tadman();
            await wwait();
            // tad.patchcolours(); // temporary ? fix to use sensible ranges
            msgfixlog('tad+', 'extra details complete +++++++++++');
            WA._makevv(); // convenient VV. syntax
            GX.makegxx(); // convenient GXX. syntax
            WA.RGX = WA._R(WA.GXX);
        }; //detailsAsync
        me.extraDetailsPomp = async () => {
            log('extra details POMP in +++++++++++++++++');
            // tentative: TR will be used in experiences (such as mixThings, swapThing)
            // or maybe T will.    Both should only have displayable Things not manipulation things
            // var { TR } = tad;
            TRA.push(TR.horn3 = await me.tadhornPOMP(3));
            TRA.push(TR.skelcx = await me.tadskel({ fid: 'testc.skelj', relsize: 1.25 }));
            TRA.push(TR.tree32 = await me.tadtree(3, 2));
            TRA.push(TR.tadfree = await me.tadfree());
            TRA.push(TR.tree12 = await me.tadtree(1, 2));
            TRA.push(TR.skela = await me.tadskel({ fid: 'testA.skelj', relsize: 1.25 }));
            TRA.push(TR.tree35 = await me.tadtree(3, 5));
            TRA.push(TR.tadfree1 = await me.tadfree());
            TRA.push(TR.tree15 = await me.tadtree(1, 5));
            TRA.push(TR.skelc = await me.tadskel({ fid: 'testc.skelj', relsize: 1.25 }));
            TRA.push(TR.horn2 = await me.tadhornPOMP(2));
            TRA.push(TR.tadfree2 = await me.tadfree());
            TRA.push(TR.skelb = await me.tadskel({ fid: 'testb.skelj' }));
            me.seq.on('beat', () => { me.tadBeat(); return 0; }); // step, beat, bar, measure;  seq.step is number within beat, etc
            // TR.back2 = 'tadBack bone2';
            log('extraDetails set here');
            // G.stepsPerStep = 4;                 // reasonable speed at 45fps
            G.stepsPerStep = -0.18; // speed should be same on all hardware, -ve is stepsPerMs
            // CubeMap.SetRenderState('fixpeekfeedbackNOSET');
            // G.a_pulsepow = 1;
            // G.a_pulsescale = 0.0005;
            // G.a_pulseperhorn = 1.3;
            // exhibitionMode = false; // for debug, no, will usually be off anyway
            // showControls('fixon');    // for debug
            V.keepinroom = 'vr'; // keep in room, but only for vr
            // springs.helix({strength: 1000, step: 23, rad:34, pitch: 65})
            if (searchValues.simple) {
                cMap.SetRenderState('color');
                G.a_pulsescale = 0; // ?? is anyway
            }
            else {
                // onframe(() => {
                //     // modified from me.oao, but fixcamera feedback not used now anyway
                //     var ff = cMap.fixcamera;
                //     if (!ff) return;     // probably running with just colour, or ???
                //     ff.position.set(1.5, 0.3, -1.5); ff.lookAt(0,0,0);
                //     ff.near = 0.01; ff.far = 40; ff.fov=25; ff.updateProjectionMatrix();
                //     cMap.fixres = 512;    // too low, but right for performance, need filtering
                // }, 4);
            }
        }; // me.extraDetailsPomp
        /** make a toppolgy that corresponds to a horn structure.
         * This is not at all generic, but uses a builtin specific horn structure.
         */
        me.tadhornPOMP = async function (group = me.GROUP, len = 0, str = 1, pow = me.tadpow) {
            let role = await makeRole(`tadHorn_${group}`, me.defaultStrength);
            role.arguments = { group, len, str, pow };
            backboneSprings(role, { str });
            groupSprings(role, role.arguments);
            /*
            ~~~~ V V V   | | | | | | ^^^^                   === _tad_h
            ~~~~+++++++==============^^^^    ~~~~ ++++ head | | | cage ^^^
            ~~~~         | | | | | | ^^^^    brh   VVV  sub            brt
            
            All segments to have the same length at least initially (groups of tadpoles)
            to simplify correlation with horn skeleton.
            
                 1          ========= 0                 _tad_hstart
                 1          +++++++++ 1                 headstart
                 cagen      | | | |   2                 cage1start
                 cagen      | | | |   2+cn              cage2start
                 ssubn      V V V V   2+2*cn            substart
                 brhn       ~ ~ ~ ~   substart+ssubn    brhstart
                 brtn       ^ ^ ^ ^   brhstart+brtn     brtstart
            */
            const k = group * RIBS;
            const numgroup = Math.ceil(me.tadnum / group);
            let cagen = k;
            let ssubn = cagen;
            let hh = numgroup - (2 + 2 * cagen + ssubn);
            let brhn = Math.floor(hh / 3);
            let brtn = hh - brhn;
            let _tad_hstart = 0;
            let headstart = _tad_hstart + k, _tad_htail = headstart - 1;
            let cage1start = headstart + k, headtail = cage1start - 1;
            let cage2start = cage1start + cagen * k;
            let substart = cage2start + cagen * k;
            let brhstart = substart + ssubn * k;
            let brtstart = brhstart + brhn * k;
            let brtend = brtstart + brtn * k;
            function as(a, b) { addspring(a, b, len, str, pow, role, prioR('hornMain')); } // add spring
            function aas(a, b) { setslot(a, b, len, str, pow, role, prioR('hornBranch')); } // add asym spring
            const arr = role.roleprops;
            const coloff = 19 + group;
            // set properties for particle
            function prop(pid, rad, col) {
                col += coloff;
                // in tranrule rad *= G._tad_s_ radius;
                let p = pid * 4;
                for (let i = 0; i < k; i++) {
                    arr[p++] = rad;
                    arr[p++] = col;
                    p += 2; // leave ribs to default
                }
            }
            as(_tad_hstart, headstart); // head to head of _tad_h and head
            prop(_tad_hstart, 3, 1);
            prop(headstart, 2, 2);
            for (let i = 0; i < cagen; i++) {
                as(cage1start + k * i, _tad_hstart + i); // cage off _tad_h part 1
                // <<< todo, allow for 'duplicates' at head on one tadpole, tail of next
                prop(cage1start + k * i, 1, 3);
            }
            for (let i = 0; i < cagen; i++) {
                as(cage2start + k * i, _tad_hstart + i); // cage off _tad_h part 2
                prop(cage2start + k * i, 1, 3);
            }
            for (let i = 0; i < ssubn; i++) {
                as(substart + k * i, headstart + i); // ribs off head
                prop(substart + k * i, 0.8, 4);
            }
            for (let i = 0; i < brhn; i++) {
                aas(brhstart + k * i, _tad_htail); // branch at _tad_h tail
                prop(brhstart + k * i, 0.8, 5);
            }
            for (let i = 0; i < brtn; i++) {
                aas(brtstart + k * i, headtail); // branch at head tail
                prop(brtstart + k * i, 1, 1);
            }
            // const magrole = getRole(`tadMaggot_${group}`, 1000, 'maggot ends');
            // const e = Math.floor(RIBS*group * 0.6);         // to establish point to fold back on
            // for (let i = cage1start; i < brtend; i += k) {  // i is start of group each group
            //     aas(i + RIBS*group-1, i + e);
            // }
            puff(role, group, cage1start);
            return endTime(role);
        };
        me.prio.hornMain = 0.2;
        me.prio.hornBranch = 0.8;
        me.xspring(); // start the twist forces
        if (!me.greyeveryKey) {
            me.colorCyclePerMin = 0;
            me.greyeveryKey = everyframe(() => {
                me.greywall();
                me.slow();
                U.g_hueshift = (G.time * me.colorCyclePerMin / 60) % 1; // keep colours rotating every 20 seconds, 3 per minute
                // VH.fixguiForVR = me.headResting;     // this was stopping main gui being manually positioned. 5/2/22 Check when really needed?
            }); // () to allow for dynamic change of function
        }
        me.debugBestTransfer = true;
        /** work out a best assignment from one pos (eg current positions) to another (eg new target thing)
         * TODO
         * allow for pullspringmat
         * reuse arrays
         * do springs async and not getpos
         */
        me.bestTransfer = function tadbestTransfer(tpos = 'tadCovid2', fpos = springs.getpos(RIBS * TADS), tnum) {
            let dbg = me.debugBestTransfer;
            if (typeof tpos === 'string')
                tpos = me.roles[tpos].details.data;
            if (typeof fpos === 'string')
                fpos = me.roles[fpos].details.data;
            if (!tpos || !fpos)
                return msgfixerrorlog('tadbestTransfer does not have enough data');
            if (tnum === undefined)
                tnum = Math.min(me.TADS, tpos.length / RIBS);
            const fnum = fpos.length / RIBS;
            // allocate arrays, later TODO do not reallocate
            me.snapthings = Array.from(me.T);
            const hh = me.snapmap = new Int8Array(fnum);
            const fassigned = me.fassigned = new Int16Array(fnum);
            const tassigned = me.tassigned = new Int16Array(tnum);
            const tmind = new Float32Array(tnum);
            const oldd = new Float32Array(tnum); // 'old' unopt distance for reference/debug
            if (dbg) {
                hh.fill(-1);
                fassigned.fill(-1);
                tassigned.fill(-1);
            }
            me.T.forEach((t, i) => { const map = t.map.raw; for (const tidi of map)
                hh[tidi] = i; });
            let maxmind = 0;
            const distxyz2 = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z);
            for (let t = 0; t < tnum; t++) {
                const tp = tpos[RIBS * t];
                let mind = 1e20, bestf = -1;
                for (let f = 0; f < fnum; f++) {
                    if (fassigned[f] !== -1)
                        continue;
                    let d = distxyz2(tp, fpos[RIBS * f]);
                    if (isNaN(d))
                        d = 99999;
                    if (d < mind) {
                        mind = d;
                        bestf = f;
                    }
                }
                if (bestf === -1)
                    me.owow('bad bestf in tad.bestTransfer');
                fassigned[bestf] = t;
                tassigned[t] = bestf;
                mind = Math.sqrt(mind);
                tmind[t] = mind;
                oldd[t] = distxyz(tp, fpos[RIBS * t]);
                maxmind = Math.max(maxmind, mind);
            }
            if (dbg) {
                const test = arr => {
                    if (arr.some(v => v === -1))
                        return me.owow('arrray has -1');
                };
                test(hh);
                test(fassigned);
                test(tassigned);
            }
            return { fassigned, tassigned, tmind, maxmind, oldd };
        };
        /** show the room with projection on walls */
        me.renderroom = function tadrenderroom() {
            WA.hoverdisplay.style.display = 'none';
            const { h, w, d } = me.covdef;
            // setSize();
            // setViewports([0,0]);
            // camera.aspect = -width/height;
            // camera.updateProjectionMatrix();
            camera.aspect = 1920 / 1080;
            camera.updateProjectionMatrix();
            if (!me.roomscene) {
                me.roomrts = {};
                me.roomrts.left = WebGLRenderTarget(1920, 1080, undefined, 'leftwall rt');
                me.roomrts.right = WebGLRenderTarget(1920, 1080, undefined, 'rightwall rt');
                me.roomrts.front = WebGLRenderTarget(1920, 1080, undefined, 'frontwall rt');
                me.roomscene = new THREE.Scene();
                me.roomscene.name = 'roomscene';
                function wall(w, h, map) {
                    const g = new THREE.PlaneGeometry(-w, h); // reflection for room face images
                    const m = new THREE.MeshBasicMaterial();
                    m.side = THREE.BackSide;
                    if (map.r) {
                        m.color.set(map);
                    }
                    else {
                        m.map = map.texture;
                        m.map.encoding = THREE.LinearEncoding; // default, but make explicit
                    }
                    const r = new THREE.Mesh(g, m);
                    me.roomscene.add(r);
                    return r;
                }
                me.roomfront = wall(w, h, me.roomrts.front);
                me.roomfront.position.set(0, h / 2, -d / 2);
                me.roomleft = wall(d, h, me.roomrts.left);
                me.roomleft.rotateOnAxis(VEC3(0, 1, 0), Math.PI / 2);
                me.roomleft.position.set(-w / 2, h / 2, 0);
                me.roomright = wall(d, h, me.roomrts.right);
                me.roomright.rotateOnAxis(VEC3(0, 1, 0), -Math.PI / 2);
                me.roomright.position.set(w / 2, h / 2, 0);
                me.roomtop = wall(w, d, col3(0.002));
                me.roomtop.rotateOnAxis(VEC3(1, 0, 0), Math.PI / 2);
                me.roomtop.position.set(0, h, 0);
                me.roomback = wall(w, h, col3(0.02, 0.01, 0.01));
                me.roomback.rotateOnAxis(VEC3(1, 0, 0), Math.PI);
                me.roomback.position.set(0, h / 2, d / 2);
                me.roomfloor = wall(w, d, col3(0.004));
                me.roomfloor.rotateOnAxis(VEC3(1, 0, 0), -Math.PI / 2);
                // me.roomfloor.position.set(0, h, 0);
                // const g = new THREE.BoxBufferGeometry(w, h, d);
                // me.roombox = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
                // me.roombox.position.y = h/2;
                // me.roombox.material.wireframe = true;
                // me.roomscene.add(me.roombox);
                me.roomcamera = camera.clone();
                me.roomcamera.near = 0.1;
                me.roomcamera.far = 2 * (w + d + h);
                me.roomcamera.fov = me.covdef.fov;
                me.roomcamera.position.set(w * 3 / 8 - 0.2, 1, d / 2);
                me.roomcamera.updateMatrix(); // stop position corruption by lookAt()
                me.roomcamera.lookAt(0, me.centre.y, -d);
                me.roomcamera.updateProjectionMatrix();
                me.roomcamera.matrixAutoUpdate = true;
                me.roomcamera.updateMatrix();
                renderer.outputEncoding = THREE.sRGBEncoding;
            }
            renderObjs = me._renderroom;
            me.trackRoom();
        };
        me._renderroom = function tad_renderroom() {
            //genesToCam();
            const p = camera.position;
            const [cx, cy, cz] = [p.x, p.y, p.z];
            p.set(cx, cy, cz);
            camera.updateMatrix();
            camera.lookAt(me.centre);
            camToGenes();
            renderVR.eye2 = false;
            renderObj(slots[mainvp].dispobj, me.roomrts.front, false);
            rrender('camscene_rawscene_front', V.camscene, camera, me.roomrts.front);
            renderVR.eye2 = true;
            p.set(-cz, cy, cx);
            camera.updateMatrix();
            camera.lookAt(me.centre);
            camToGenes(); // nb cz is -ve, so this makes camera x +ve
            renderObj(slots[mainvp].dispobj, me.roomrts.right, false);
            rrender('camscene_rawscene_right', V.camscene, camera, me.roomrts.right);
            p.set(cz, cy, cx);
            camera.updateMatrix();
            camera.lookAt(me.centre);
            camToGenes();
            renderObj(slots[mainvp].dispobj, me.roomrts.left, false);
            rrender('camscene_rawscene_left', V.camscene, camera, me.roomrts.left);
            renderVR.eye2 = false;
            p.set(cx, cy, cz);
            camera.lookAt(me.centre);
            camera.updateMatrix();
            camToGenes();
            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.setViewport(0, 0, height * me.roomcamera.aspect, height);
            // if (me.roomcamera.aspect !== width/height) { me.roomcamera.aspect = width/height; me.roomcamera.updateProjectionMatrix();  }
            if (me.orbitControls && me.orbitControls.enabled)
                tad.orbitControls.usekeys();
            rrender('room', me.roomscene, me.roomcamera, null);
            rrender('room_camscene', V.camscene, me.roomcamera, null);
            // V.renderNocam(null); // move to postrender
        };
        me.trackRoom = function (track = true) {
            if (track) {
                canvTransEnabled = false;
                // eslint-disable-next-line
                if (!me.orbitControls)
                    me.orbitControls = new THREE.OrbitControls(me.roomcamera, canvas);
                me.orbitControls.update(); // establish start from camera. why isn't this part of new???
                me.orbitControls.autoRotate = false; // was is_webgl
                me.orbitControls.enabled = true; // false is just used for keys
            }
            else {
                canvTransEnabled = true;
                if (me.orbitControls)
                    me.orbitControls.enabled = false; // just used for keys
            }
        };
        me.cyls = function ({ rad = 0.2, height = 1.7, x = 1, z = -2 } = {}) {
            const g = new THREE.CylinderGeometry(rad, rad, height, 12, 1);
            const m = new THREE.MeshBasicMaterial();
            m.color.set('yellow');
            me.cylmesh = new THREE.Mesh(g, m);
            me.cylmesh.position.set(x, 0, z);
            V.camscene.add(me.cylmesh);
        };
        WA.killdown = tad.killdown;
        // GUIKey('V', '', 'close down',me.killdown);  // done in giodoc to catch key as long as focus is on us somewhere
        me.dynmessages();
        if (searchValues.dotadpomp)
            onframe(() => me.likePomp(), 10);
        msgfix('!Things', () => T.map(t => [t.role.id, t.map.length]).join(' ')); //  lazy output of message
        //??? if (me.docovid) Maestro.on('postSetSize', me.covidSetScene); // we may want some, but not camera, aspect, G._Uscale ???
    }; // end tad
    me.baitDisplayOffset = 0.02;
    me.baitDisplayShape = [1, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
    me.baitDisplayRad = 4;
    me.rb = {};
    me.rb.n = 2;
    me.rb.twist = 0.005;
    me.rb.twistD = 0.1;
    me.rb.attr = -0.001;
    me.rb.pow = -2;
    me.rb.allow = false;
    /** set up random bait, note twist and attr may be array of pairs for range */
    me.randbait = async function ({ n = me.rb.n, twist = me.rb.twist, twistD = me.rb.twistD, attr = me.rb.attr, pow = me.rb.pow, allow = me.rb.allow } = {}) {
        Object.assign(me.rb, { n, twist, twistD, attr, pow, allow });
        if (!allow)
            return;
        console.error('randbait disabled for AIUK');
        return;
        n = Math.min(n, CONTROLS);
        me.controlCols(); // get constrol clearly coloured
        G.twistBase = 0.005; // should be default for other uses, nb *170 below
        // tad.baseBaitAttractStrength = 1; // not used
        const o = me.baitDisplayOffset;
        U.twistD.fill(twistD);
        U.twist.fill(0);
        U.baitAttractStrength.fill(0);
        for (let i = n; i < CONTROLS; i++)
            U.baitPosition[i].set(9999, 0, 0);
        for (let i = 0; i < n; i++) {
            const bp = U.baitPosition[i].copy(randvec3().add(me.centre));
            const c = U.condir[i].copy(randvec3().normalize());
            U.baitAttractStrength[i] = randrange(attr);
            U.twist[i] = randrange(twist);
            // tad.displayControl(i, {orb: true, shape: me.baitDisplayShape, rad: me.baitDisplayRad, col: i,
            //     x:bp.x, y:bp.y, z:bp.z, dx: o*c.x, dy: o*c.y, dz: o*c.z });
        }
        me.showbait();
        await S.frame();
        me.dynbait(n);
    };
    me.dynbait = function (n) {
        if (me.dynevery)
            Maestro.remove('preframe', me.dynevery);
        if (n === 0)
            return;
        for (let i = 0; i < n * RIBS; i++) {
            springs.removefix(RIBS * TADS + i);
        }
        if (!me.baitpos)
            me.baitpos = new Float32Array(springs.numInstances * 4);
        me.dynevery = everyframe(async () => {
            const ppp = await readWebGlFloatAsync(springs.posNewvals, { buffer: me.baitpos });
            if (tadkin)
                tadkin.baitevery(n, ppp); // factored out and moved for easier bebug edit
            me.showbait();
        });
    };
    me.showbait = function () {
        for (let i = 0; i < CONTROLS; i++) {
            const bp = U.baitPosition[i], o = me.baitDisplayOffset, c = U.condir[i], att = U.baitAttractStrength[i];
            const rad = bp.x > 999 || att === 0 ? 0 : me.baitDisplayRad;
            tad.displayControl(i, { orb: true, shape: me.baitDisplayShape, rad, col: (i % me.numControlsCols) + me.baseControlCol,
                x: bp.x, y: bp.y, z: bp.z, dx: o * c.x, dy: o * c.y, dz: o * c.z });
        }
    };
    me.hide = new THREE.Vector3(999, 999, 999);
    /** clear bait */
    me.clearbait = function () {
        for (let i = 0; i < 8; i++) {
            const bp = U.baitPosition[i].copy(me.hide);
            U.condir[i].set(0, 0, -1);
            U.baitAttractStrength[i] = 0;
            U.twist[i] = 0;
            tad.displayControl(i, 'hide');
        }
    };
    /** reposition the tadpoles in starter positions */
    me.remakePositions = function () {
        // set up and use a random map for the heads, the RESERVED may be overwritten very soon but it is a start
        doReserved(); // establish sensible positions compatible with dynamics ones
        me.reservedProps(); // and the reserved properties
        var p = 0;
        for (let h = 0; h < TADS; h++) {
            var b = 0.5;
            var x = (Math.random() - b) * 2, y = (Math.random() - b) * 2, z = Math.random() * 2 - 1;
            var pos = new THREEA.Vector3(x, y, z); /// ??? me.positions[h] =
            // if (h > TADS) pos = springs.getfix(h*RIBS);  // reserved item; will get correct pretty soon
            for (var r = 0; r < RIBS; r++) {
                springs.setfix(p, pos);
                pos.x += me.tadlen[h] / RIBS; // so it starts ar correct length
                p++;
            }
        }
        uniforms.stepsSoFar.value = 4; // prevent the auto make helix working
        springs.finishFix(TADS * RIBS);
    };
    me.prio = {}; // list of base priorities for different springs
    function prioR(id) {
        let base = me.prio[id];
        if (base === undefined) {
            me.owow(`no tad.prio for ${id}, using 1`);
            base = me.prio[id] = 1;
        }
        if (base)
            return base + (1 - base) * random();
    }
    me.prioR = prioR;
    /** convenience function to place head of one tadpole at tail of another */
    me.headToTail = function (head, tail, len, str = 1, pow = 0, role) {
        return addspring(head * RIBS, (tail + 1) * RIBS - 1, len, str, pow, role, prioR('headToTail'));
    };
    me.prio.headToTail = 0.6;
    /** add backbone springs to role, len is overall len of single tad */
    function backboneSprings(role, { len = -1, str = 1, pow = 2, num = RIBS, type = me._cf['backbone'][0], userods = false, numtads = TADS } = {}) {
        for (let h = 0; h < numtads * RIBS / num; h++) { // o head number (string number)
            let tadlen = (len >= 0 ? len : me.TADLEN) * (Math.random() + 1); // random  factor <1 gives instability?
            me.tadlen[h] = tadlen;
            for (let k = 1; k < num; k++) { // k is rib number
                const n = k + h * num;
                const len = tadlen / num;
                addspring(n, n - 1, len, str, pow, role, 1, type); // type 12 is backbone
                if (userods)
                    addrod(role, n, n - 1, len / 2, len * 2);
            }
        }
    }
    tad.nopositions = []; // roles that did not have positions file
    /** add pullsprings, using details.data if available, .positions file if not */
    async function pullSprings(role, { str = 1, pow = 0, type = 0 } = {}) {
        // set up pullsprings to specific points, and colours, radii, etc
        if (role.details.pullsprings)
            return;
        let col = 0; // we will scan skel.cumcount to find original number (already offset)
        let sx = 0, sy = 0, sz = 0;
        let d = role.details.data;
        if (d) {
            log('rolepullsprings from role.details.data', role.id);
        }
        else {
            /** read any saved position data */
            const fid = 'data/' + role.id + '.positions';
            d = role.details.data = await readJSON(fid);
            if (d) {
                log('rolepullsprings from fid', role.id);
                const ss = role.details.stats = CSynth.stats(d);
                role.details.autoscale = me.targetHeight / ss.ry;
                role.details.pullsprings = fid;
            }
            else {
                tad.nopositions.push(role.id);
                return log('rolepullsprings no data', role.id);
            }
        }
        const e = Math.min(TADS * RIBS, d.length);
        const k = role.details.autoscale = role.details.autoscale || 1; // <<<???
        for (let i = 0; i < e; i++) {
            const tid = Math.floor(i / RIBS);
            // ??? while (col < COL.NUM-1 && (cum[col] === undefined || tid >= cum[col])) col++;
            const dd = d[i];
            const x = dd.x * k, y = dd.y * k, z = dd.z * k, r = dd.w * k;
            sx += x;
            sy += y;
            sz += z;
            const len = -999; // not used for pullspring??, may use as a flag
            role.springs.push({ at: toTid(i), bt: toTid(0), type: 'pullspring', x, y, z, len, str: str / e * (i % RIBS ? 0.1 : 1), pow, prio: prioR('skel') });
            // r = rtole.roleprops
            // arr[i*4] = arr[i*4 + 2] = r / G._tad_s_radius;   // will be multiplied up by _tad_s_radius in the tranrule
            // arr[i*4 + 1] = col;
            // arr[i*4+3] = 53 * lens[Math.floor(i/RIBS)];   // 53 arbitrary number but experimentally about right
        }
        role.details.pullsprings = '#data#';
        log('skel cent', sx / e, sy / e, sz / e);
    }
    tad.pullSprings = pullSprings;
    /** join groups of tadpoles and add them to a role, utility for higher level role generation functions  */
    function groupSprings(role, { group = me.GROUP, len = 0, str = 1, pow = 0, numtads = TADS } = {}) {
        if (group <= 1)
            return;
        for (let i = 0; i < TADS; i += group) {
            const jend = Math.min(i + group, numtads); // last group may be short
            for (let j = i + 1; j < jend; j++) {
                me.headToTail(j, j - 1, len, str, pow, role);
            }
        }
    }
    /** make a Role that sets up tadpoles head to tail in groups: ??? not used ??? */
    me.tadgroup = async function (group = me.GROUP, len = 0, str = 1, pow = 0, numtads = TADS) {
        let role = await makeRole(`tadGroup_${group}`);
        if (role.infdone)
            return endTime(role);
        role.arguments = { group, len, str, pow };
        backboneSprings(role, { str });
        groupSprings(role, { group, len, str, pow, numtads }); // join groups of tadpoles
        return endTime(role);
    };
    /** make a role for a tree from grouped tadpoles, defs is usually a structure, but can be value for group for backwards compatibility  */
    me.tadtree = async function (defs = me.GROUP, pbranch = 2, { len = 0, str = 1, pow = me.tadpow, numtads = TADS } = {}) {
        let group, branch, startp, endp;
        defs = (typeof defs === 'object') ? defs : { group: defs, branch: pbranch };
        ({ group = me.GROUP, branch = 2, startp = 1, endp = 1 } = defs);
        //role might ideally have 'group' and 'branch' where applicable.
        // start goes from 0 at head of group to group * RIBS-1 at tail
        // startp and endp go from 0 at head of group to 1 at tail of group
        // start should usually be 0 or greater, if not results are undefined
        //    (if interesting allow to stay, if silly arrange clamp)
        // end is clamped at 1, to give multiple branch at same point effect
        const gribs = group * RIBS; // number of particles in a group
        const start = (gribs - 1) * startp;
        const end = (gribs - 1) * endp;
        const step = (end - start) / (branch - 1);
        const rolekey = `tadTree_${group}_${branch}`;
        let role = await makeRole(rolekey);
        if (role.infdone)
            return endTime(role);
        me.prio[rolekey] = me.prio.treeCore;
        role.arguments = defs;
        role.numtads = numtads;
        backboneSprings(role, { str, userods: true, numtads });
        groupSprings(role, { group, len, str, pow, numtads });
        // arrange groups in a tree
        let parent = 0, child = gribs; // parent is particleid for head of parent, child is particleid for head of child
        tree: while (true) {
            let parenti = parent + start; // parenti is actual attachment point within parent
            let parente = parent + gribs - 1; // parente is last tadpoleid for group
            const type = me._cf.treestruct[0];
            for (let b = 0; b < branch; b++) {
                const prioid = (child < (TADS * RIBS) / branch) ? 'treeCore' : 'treeTwig';
                addspring(child, parenti, len, str, pow, role, prioR(prioid), type);
                addrod(role, child, parenti, 0, 0.004);
                // me.headToTail(h2, hh1, len, str, pow, role);
                child += gribs;
                if (child >= TADS * RIBS)
                    break tree;
                parenti += step;
                if (parenti >= parente)
                    parenti = parente; // left overs will branch from end
            }
            parent += gribs;
        }
        // everthing before final value of parent is parent of something
        // everything after is childless, and candidate for a tailpuff
        // prepare attributes according to level
        const arr = role.roleprops;
        const coltreeoff = 0; // me.docovid ? 23 : (branch * 3 + group);  // colour offset so different styles coloured differently
        let p = 0, pid = 0; // arr entry number, particle number
        let basetadradius = 3; // let not const for debug tests
        let lfac = branch ** -0.5;
        lfac = 0.9; // testing
        // me.tailids = [];
        let prio = me.prio.treeTwig;
        atts: for (let lev = 0;; lev++) {
            const col = safecol(lev + coltreeoff);
            const rad = basetadradius * lfac ** lev; // radius by level, no _tad_s_ radius in tranrule
            const n = branch ** lev * gribs; // number of particles at that level
            for (let i = 0; i < n; i++) {
                if (p >= arr.length)
                    break atts;
                // pending ... if ((p/4)%RIBS === 0) setslot(p/4, [TADS+CONTROLS, 0] as Tadposkey, lev/4, str, pow, role, prio, me._cf.headtocentre[0]);
                arr[p++] = rad;
                arr[p++] = col;
                arr[p++] = rad;
                p += 1;
                pid++;
            }
        }
        puff(role, group, parent);
        return endTime(role);
    };
    /** make a role for a tree from grouped tadpoles, defs is usually a structure, but can be value for group for backwards compatibility  */
    me.tadtwist = async function ({ defs = me.GROUP, sc = 0.6, len = 0, str = 1, pow = me.tadpow, num: numtads = TADS } = {}) {
        const rolekey = `tadTwist_${sc}`;
        let role = await makeRole(rolekey);
        if (role.infdone)
            return endTime(role);
        role.details.data = CSynth.twist({ sc: 0.6, pull: 'array', num: RIBS * numtads }); // cen: me.centre, is done by pullSprings
        pullSprings(role); // if no .positions file, after data established
        backboneSprings(role, { num: numtads * RIBS });
        role.numtads = numtads;
        return endTime(role);
    };
    /** make a role for a tree from grouped tadpoles, defs is usually a structure, but can be value for group for backwards compatibility  */
    me.tadspace = async function ({ defs = me.GROUP, sc = 0.1, len = 0, str = 1, pow = me.tadpow, num: numtads = TADS } = {}) {
        const rolekey = `tadspace_${sc}`;
        let role = await makeRole(rolekey);
        role.pullStrength = 1; // was 2.5;
        if (role.infdone)
            return endTime(role);
        const nn = (RIBS * numtads === 9600) ? [30, 20, 16] : RIBS * numtads;
        role.details.data = CSynth.hilbert(sc, nn, undefined, 'array'); // cen: me.centre, is done by pullSprings
        len = distxyz(role.details.data[0], role.details.data[1]);
        role.numtads = numtads;
        pullSprings(role); // if no .positions file, after data established
        backboneSprings(role, { num: numtads * RIBS, len: len * numtads * RIBS, str: 0.1 });
        return endTime(role);
    };
    me.prio.treeCore = 0.2;
    me.prio.treeTwig = 0.8;
    /** apply puff to ends of groups above  */
    function puff(role, group, spid) {
        const gribs = group * RIBS; // number of particles in a group
        const arr = role.roleprops;
        for (let pid = spid; pid < HEADS * gribs; pid += gribs) {
            for (let pidi = pid - me.tailpuffnum; pidi < pid; pidi++) { // particles to puff
                let ppos = pidi * 4;
                arr[ppos++] *= me.tailpuff; // rad
                ppos++; // arr[ppos++] *= pid / gribs;     // colid
                arr[ppos++] *= me.tailpuff; // target rad
                arr[ppos++] = 0; // ribs, smooth puff
            }
        }
    }
    /** make a role for a binary tree of ungrouped tadpoles */
    me.tadbintree = () => me.tadtree(1, 2); // compatibility
    /** make a role that pushes tadpoles oneto a sphere.  shaper not topology definer  */
    me.tadsphere = async function ({ numtads = TADS } = {}) {
        const str = 1;
        // add a sphere
        let role = await makeRole('tadSphere', 'forces to push tadpole heads around sphere'); // BUT rods don't yet allow for role ....
        if (role.infdone)
            return endTime(role);
        role.numtads = numtads;
        // role.arguments = {};
        const r = 0.4; //  / G.backboneScale;
        for (let h = 0; h < numtads; h++) {
            setslot(h * RIBS, numtads * RIBS, r, 1, 0, role, 1); // asymmetric, can't have too many coming off TADS * RIBS
            // springs.addrod(i, 32, 0.4);
        }
        backboneSprings(role, { str, numtads });
        return endTime(role);
    };
    // enum Covtype {shell, sym20, spikeend, spikeneck}; // different parts of covidbased on length of chain
    // let typeForLen = {5 5 : Covtype.shell, 8 8 : Covtype.sym20, 7 3 : Covtype.spikeend, 5 9 : Covtype.spikeneck}; // identify different parts of covid based on length of chain
    let typeForLen = { 55: 'shell', 88: 'sym20', 73: 'spikeend', 59: 'spikeneck' }; // identify different parts of covid based on length of chain
    me._covconsts = function () {
        tad.covcols = {
            shell: 25, sym20: [16, 22],
            sym20_1: [16, 17], sym20_2: [18, 19], sym20_3: [20, 22],
            spikeend: 23, spikeneck: 24 // spikes
            // also 23..26 or so for dancer/baton glyph
        };
        me.dancer1col = 0;
        me.dancer2col = 1;
        me.glyphendcol = 3;
        me.covrads = {
            shell: 0.5, sym20: [0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.02],
            spikeend: 0.4, spikeneck: 0.3 // spikes, bulge and neck
        };
        me.covradsc = 2;
        me.covids = { shell: [0, 20, 1], sym20: [20, 1020, 1], spikeend: [1020, 1200, 2], spikeneck: [1021, 1200, 2] };
    };
    me._covconsts();
    /** make a covid structure; Now tadcovid2 includes pullsprings this is no longer used as a role in its own right,
     * but is used to parse and prepare for tadcovid2. */
    me.tadcovidbase = async function tad_covidbase() {
        let role = { details: {}, springs: [], roleprops: [] }; // await makeRole('tad covidbase', me.default RoleStrength, 'tad Covid');
        // if (role.infdone) return endTime(role);
        me.prio.covid = 1;
        CSynth.pdbmaxnum = Infinity;
        const tdata = CSynth.parsePDB(undefined, 'CSynth/data/sars-cov-2-public-main/cg-virion.pdb', true); // must scan all
        const pdbdata = tdata.pdbdata;
        // const big = Math.sqrt(tdata.pdbdata.reduce((c,v) => c=Math.max(c, v.x**2+v.y**2+v.z**2), 0));
        const big = 800; // 888.2884702668384
        role.details.autoscale = 1; // scaling by 1/big in data setup
        // const stats = CSynth.stats(pdbdata);
        // scan the pdbdata to get info about the difxferent residues
        const _reslen = [], restype = role.details.restype = [], resstart = role.details.resstart = [], atinres = role.details.atinres = [];
        for (let p = 0; p < pdbdata.length; p++) {
            const resid = pdbdata[p].resid;
            if (resstart[resid] === undefined) {
                resstart[resid] = p;
                _reslen[resid] = 0;
            }
            _reslen[resid]++;
        }
        const str = 1, e = 1, pow = me.tadpow;
        const props = role.roleprops;
        // let covtype = tad.coltypes = {5 5 : 'shell', 8 8 : 'sym20', 7 3 : 'spikeend', 5 9 : 'spikeneck'}; // s identify different parts of covid based on length of chain
        let cols = tad.covcols;
        // r is reside/tadpole
        // extract RIBS length tadpoles from each residue
        let q = 0;
        const data = role.details.data = [];
        for (let r = 1; r <= Math.min(me.tadnum, _reslen.length - 1); r++) {
            const _reslen_ = _reslen[r];
            const _restype = typeForLen[_reslen_];
            restype[r] = _restype;
            // const _restype = restype[r];
            let start = 0, end = _reslen[r];
            if (_restype === 'spikeend') {
                start = 0;
                end = 48;
            } // bulge at end of spike
            else if (_restype === 'spikeneck') {
                start = 26;
                end = 49;
            } // neck of spike, 26 is outside
            else if (_restype === 'sym20') {
                start = 25;
                end = 12;
            } // sym20 ???bulk surface???
            else if (_restype !== 'shell') {
                me.owow('bad restype', _restype);
            }
            ;
            const acol = cols[_restype]; // possible colour numbers
            const col = Array.isArray(acol) ? acol[0] + randi(acol[1] - acol[0] + 1) : acol; // random choice, eg for surface tadpole
            const rad = me.covrads[_restype];
            const arad = (Array.isArray(rad)) ? rad : [rad, rad, rad, rad, rad, rad, rad, rad];
            for (let i = 0; i < RIBS; i++) { // i is tadpole number, p is pdbdata index, d pdbdata
                const p = resstart[r] + Math.floor(start + i * (end - start - 1) / (RIBS - 1));
                const d = pdbdata[p];
                d.x /= big;
                d.y /= big;
                d.z /= big;
                data.push(d);
                role.springs.push({ at: [r - 1, i], bt: toTid(0), type: 'pullspring', x: d.x, y: d.y, z: d.z, len: 0,
                    str: str / e * (i !== 0 ? 0.1 : 1), pow, prio: prioR('covid') });
                const irad = arad[i] * me.covradsc;
                props[q++] = irad; // radius (computed on the fly)
                props[q++] = col;
                // props[q++] = i === 0 ? 15 : col; // white ends for debug
                props[q++] = irad; // target radius
                props[q++] = end - start; // ribs, based on part of reslen actually used
            }
        }
        // me.dyncovrads(me.covrads, 2);
        // me.tadshape(role, RIBS);
        // backbone Springs(role, undefined, str);
        return role;
    };
    /** set the covid surface tadpole radii dynamically (assumes covid/covid2 active) */
    me.dyncovrads = function (rr = me.covrads, sc = me.covradsc) {
        if (me.T[0] && me.T[0].role !== TR.tadcovid2)
            return;
        for (const k in rr) {
            const rrk = rr[k];
            const a = Array.isArray(rrk) ? rrk : new Array(RIBS).fill(rrk);
            const ids = me.covids[k];
            for (let r = ids[0]; r < ids[1]; r += ids[2]) {
                for (let i = 0; i < RIBS; i++) {
                    me.tadprop[(r * RIBS + i) * 4 + 2] = me.tadprop[(r * RIBS + i) * 4] = a[i] * sc;
                }
            }
        }
    };
    /** apply role forces as onm covforces _cf */
    me.covroles = function () {
        // ?? tad.baseBaitAttractStrength = 0.01;       // n.b related to change in min to 1000 in tadpole.ts: min(1000., pow(len, baitAttractPow - 1.)
        for (const p of Object.values(me._cf))
            uniforms.roleforces.value[p[0]] = p[1];
    };
    // revamped 7 Dec 2021 to match covid default pow changed from 1 to 0
    // [0] is type number
    me._cf = {
        free: [0, 1],
        headtocentre: [1, 0.001],
        tailtocentre: [2, 0.001],
        sym20shapes: [3, 0.001],
        sym20distances: [7, 0.01],
        spikedistances: [4, 0.001],
        spikeshape: [5, 0.001],
        spikebackbone: [6, 0.001],
        spikefeet: [8, 0.01],
        cvfreebackbone: [9, 0],
        shellshapes: [10, 0.003],
        treestruct: [11, 0.001],
        backbone: [12, 1],
        close: [13, 100],
        tadfreebackbone: [14, 0.2],
    };
    const _rfdefault = new Float32Array(16);
    for (const n in me._cf)
        _rfdefault[me._cf[n][0]] = me._cf[n][1];
    /** convenient debug access to uniforms.roleforces.value.
     * name may be a name or a slot number
     * set of '' restores to default */
    WA.RF = me.RF = new Proxy(me._cf, {
        get: (_ig, name) => uniforms.roleforces && uniforms.roleforces.value[!isNaN(name) ? name : me._cf[name] ? me._cf[name][0] : undefined],
        set: (_ig, name, v) => { uniforms.roleforces.value[!isNaN(name) ? name : me._cf[name][0]] = (v === '' ? me.rfbase(name) : v); return true; },
        // enumerate: () => Object.keys(me._cf),
        ownKeys: () => Object.keys(me._cf)
    });
    WA.rfbase = me.rfbase = name => me._cf[name][1];
    WA.rfrestore = me.rfrestore = name => {
        if (name === undefined) {
            for (let nn in me._cf)
                me.rfrestore(nn);
        }
        else {
            me.RF[name] = me.rfbase(name);
        }
    };
    // unused me.covstype = function(s) { return me._cf[s][0]}
    /** make covid from weaker set of springs/constraints w.i.p. */
    me.tadcovid2 = async function () {
        const role = await makeRole('tadCovid2', 'tad Covid2');
        // if (me.docovid) me.covidCol();  // no, just use colours as they come
        msgfixlog('tad+', 'load tadcovid2', role.infdone ? 'using inf' : 'using fill parse');
        if (role.infdone)
            return endTime(role);
        me.prio.tadCovid2 = 1;
        const baserole = await me.tadcovidbase();
        const details = role.details = baserole.details; // share details with covid
        role.roleprops.set(baserole.roleprops); // same properties as covid
        const { resstart, restype, data } = details; // take (scaled) data from covid
        const str = 1, pow = 0, prio = 1;
        const origin = new THREE.Vector3(0, 0, 0);
        // position 'start' of each residue at dist from origin according to data
        // except spike necks contrained by their end, and spike bulges not constrained
        for (let r = 0; r < 1200; r++) {
            if (restype[r + 1] === 'spikeend')
                continue; // do NOT constrain bulge
            const i = restype[r + 1] === 'spikeneck' ? 7 : 1; // constrain spike necks END
            const len = distxyz(data[r * RIBS + i], origin);
            setslot([r, i], [TADS + CONTROLS, 0], len, str, pow, role, prio, me._cf.headtocentre[0]);
        }
        // // position residue pairs for pseudo-random pairs distance
        // splays out legs at root of neck
        // for (let r = 0; r < Math.min(me.tadnum, res en.length-1); r++) {
        //     const rr = (r * 77) % 1200;
        //     const len = distxyz(data[r*RIBS], data[rr*RIBS]);
        //     setslot([r, 0] as Tadposkey, [rr, 0] as Tadposkey, len, str, pow, role, prio);
        // }
        // position 'end' of the shell ones
        const R1 = RIBS - 1;
        for (let r = 0; r < 1020; r++) {
            const len = distxyz(data[r * RIBS + R1], origin);
            setslot([r, R1], [TADS + CONTROLS, 0], len, str, pow, role, prio, me._cf.tailtocentre[0]);
        }
        // 0..19 sym20, 20..1019 fillers, 1020..1199 spikes
        for (let i = 0; i < 20; i++) { // complete surface (non-spike) residue shapes sym 20
            makedists({ low: i, high: i + 1, max: 0.06, lowi: 0, highi: RIBS, stype: 'sym20shapes' });
        }
        for (let i = 20; i < 1020; i++) { // complete surface (non-spike) residue shapes, rest, exaggerated lengths
            makedists({ low: i, high: i + 1, max: 0.06, lowi: 0, highi: RIBS, xlen: 1.5, stype: 'shellshapes' });
        }
        makedists({ low: 0, high: 20, max: 0.7, stype: 'sym20distances' }); // sym 20 positions
        makedists({ low: 1021, high: 1200, step: 6, max: 1, lowi: RIBS - 1, highi: RIBS, stype: 'spikedistances' }); // format the spike positions
        // for (let i = 1020; i < 1200; i += 6) makedists(i, i+6, 2);   // group spike triples
        for (let i = 1020; i < 1200; i += 6) { // complete spike shapes, 48**2 springs per spike approx
            makedists({ low: i, high: i + 6, max: 0.1, lowi: 0, highi: RIBS, stype: 'spikeshape' }); // 0.03 too small spike
            makedists({ low: i + 1, high: i + 6, step: 2, lowi: RIBS - 1, highi: RIBS, stype: 'spikefeet' }); // spike triples
        }
        for (let i = 1020; i < 1200; i += 2) { // complete spike shapes, backbone
            makedists({ low: i, high: i + 2, lowi: 0, highi: RIBS, stype: 'spikebackbone' });
        }
        backboneSprings(role, { type: me._cf['cvfreebackbone'][0] });
        // rods for backbone
        for (let i = 0; i < 1200 * RIBS; i++) {
            if (i % RIBS === 0)
                continue;
            const l = distxyz(data[i], data[i - 1]);
            addrod(role, i, i - 1, l / 2, l * 2);
        }
        pullSprings(role); // if no .positions file, after data established
        function makedists({ low, high, step = 1, max = Infinity, lowi = 0, highi = 1, lstr = str, xlen = 1, stype }) {
            high = Math.min(high, me.tadnum);
            const type = me._cf[stype][0];
            for (let ir = low; ir < high; ir += step) {
                for (let ii = lowi; ii < highi; ii += 1) {
                    for (let jr = low; jr < high; jr += step) {
                        for (let ji = lowi; ji < highi; ji += 1) {
                            const len = distxyz(data[ir * RIBS + ii], data[jr * RIBS + ji]);
                            if (ir === jr && ii === ji)
                                continue;
                            if (ir === jr && [1, -1].includes(ii - ji)) // backbone, may want to make stronger
                                setslot([ir, ii], [jr, ji], len * xlen, lstr, pow, role, prio, type);
                            else if (len < max)
                                setslot([ir, ii], [jr, ji], len * xlen, lstr, pow, role, prio, type);
                        }
                    }
                }
            }
        }
        return endTime(role);
    };
    /** start with tetrahedron and subdivide for very regular l-system style branch */
    me.tetra = async function (num = TADS) {
        const role = await makeRole('tadTetra', 'tad Tetra');
        if (role.infdone)
            return endTime(role);
        const str = 1, pow = 0, prio = 1;
        const vv = role.details.trivert = []; //  as THREE.Vector3[];                  // for subdivision triangles
        const triind = role.details.triind = []; //  as [N,N,N, N, THREE.Vector3, N][];   // triangles, parent, centre and level
        vv.push(VEC3(0, 0, 0).normalize());
        vv.push(VEC3(1, 1, 1).normalize());
        vv.push(VEC3(1, -1, -1).normalize());
        vv.push(VEC3(-1, 1, -1).normalize());
        vv.push(VEC3(-1, -1, 1).normalize());
        tri(0, 0, 0, 0);
        tri(1, 2, 3, 0);
        tri(2, 3, 4, 0);
        tri(3, 4, 1, 0);
        tri(4, 1, 2, 0);
        // compute the children of parent ip
        for (let ip = 1; triind.length < num; ip++) {
            const [i1, i2, i3, ipp, parentCentre] = triind[ip];
            const v1 = vv[i1], v2 = vv[i2], v3 = vv[i3];
            const vx1 = VEC3(v2).lerp(v3, 0.5).normalize();
            const vx2 = VEC3(v3).lerp(v1, 0.5).normalize();
            const vx3 = VEC3(v1).lerp(v2, 0.5).normalize();
            const ix1 = vv.push(vx1) - 1;
            const ix2 = vv.push(vx2) - 1;
            const ix3 = vv.push(vx3) - 1;
            tri(ix1, ix2, ix3, ip);
            tri(i1, ix2, ix3, ip);
            tri(ix1, i2, ix3, ip);
            tri(ix1, ix2, i3, ip);
        }
        // make a triangle from vertices based on parent, and spring from parent centre to my centre
        // centres have level based radius and are around origin (NOT me.cen tre)
        function tri(i1, i2, i3, ip) {
            const level = ip === 0 ? 1 : triind[ip][5] + 1;
            const vc = VEC3().add(vv[i1]).add(vv[i2]).add(vv[i3]).normalize().multiplyScalar((level + 1) / 6); // .add(me.cen tre);
            const myi = triind.push([i1, i2, i3, ip, vc, level]);
            role.springs.push({ at: [myi, 0], bt: toTid(0), type: 'pullspring', x: vc.x, y: vc.y, z: vc.z, len: 0,
                str, pow, prio: prioR('tetra') });
            const pvc = triind[ip][4];
            // short term, fix/pull al points
            for (let i = 1; i < RIBS; i++) {
                role.springs.push({ at: [myi, i], bt: toTid(0), type: 'pullspring', x: pvc.x, y: pvc.y, z: pvc.z, len: 0,
                    str, pow, prio: prioR('tetra') });
            }
        }
        return endTime(role);
    };
    /** clear colours for covid, but with some textures */
    me.covidCol = function (old = false, gamma = 1) {
        // covcols use range starting 0, COL effectively starts at 3 because of wall convention
        const setx = (d, l, h = l) => COL.setx(d, l, h);
        COL.setx(COL.defaultDef);
        const cols = tad.covcols;
        const b = [0.5, 1], s = [0, 0.1]; // b for bigger rand value, s for smaller ome
        setx({ red: 2, green: 1, blue: s }, cols.shell); // 20 symmetric shell
        setx({ red: 1, green: s, blue: s }, cols.spikeend); // end of spike
        setx({ red: b, green: s, blue: b }, cols.spikeneck); // neck to spike
        // setx({red: 2, green:2, blue: 2}, 15, 15);   // first in each, debug
        if (old) {
            setx({ red: b, green: b, blue: b, gamma }, cols.sym20); // main shell
            setx({ red1: [1, 2], green1: 0.5, blue1: [0.5, 1], gamma }, cols.sym20); // main shell
            setx({ red2: [0.5, 1], green2: [1, 2], blue2: 0.5, gamma }, cols.sym20); // main shell
            setx({ red3: 0.5, green3: [0.5, 1], blue3: [1, 2], gamma }, cols.sym20); // main shell
        }
        else {
            setx({ red: b, green: s, blue: s, gamma }, cols.sym20_1); // main shell
            setx({ red: s, green: b, blue: s, gamma }, cols.sym20_2); // main shell
            setx({ red: s, green: s, blue: b, gamma }, cols.sym20_3); // main shell
            setx({ red2: s, green2: b, blue2: b, gamma }, cols.sym20_1); // main shell
            setx({ red2: b, green2: s, blue2: b, gamma }, cols.sym20_2); // main shell
            setx({ red2: b, green2: b, blue2: s, gamma }, cols.sym20_3); // main shell
        }
        // for dancerX
        setx({ '': 0, band1: 100, subband: -1, gloss: 1, shin: 40, plastic: 1 }, me.dancer1col); // dancer 1
        setx({ '': 0, band1: 100, subband: -1, gloss: 0.2, shin: 30, plastic: 1, red: 0.2 }, me.dancer2col); // dancer 2
        setx({ '': 0, red: 3, green: 3, blue: 3, band1: 100, subband: -1, gloss: 0, shin: 40, plastic: 1 }, me.glyphendcol); // glyph end (?baton?)
        me.controlCols();
        setx({ flu: 1, fluwidth: 0.0004 }, 12, 31); // flu bands on most
        COL.send();
        /* test
        COL.setx({col:'red'}, 15)
        COL.setx({col:'yellow'}, 16)
        COL.setx({col:'green'}, 17)
        COL.setx({col:'cyan'}, 18)
        COL.setx({col:'blue'}, 19)
        COL.setx({col:'magenta'}, 20)
        COL.setx({col:'white'}, 21)
        COL.setx({col:'black'}, 22)
        */
        // setx({'':0, red:3, green:3, blue:3, band1: 100, subband: -1, gloss: 0, shin: 40, plastic: 1}, 1, 1); // first controller
        // me.colorCyclePerMin = 0;
    };
    me.numControlsCols = 4;
    me.baseControlCol = 4;
    me.controlCols = function () {
        const setx = COL.setx;
        const bc = me.baseControlCol;
        // for classic independent
        setx({ '': 0, tex: 0, band1: 1, band2: 1, subband: -1,
            texscale: 0.02, texrepeat: 1, texfract3d: 1, texdiv: 1,
            // texalong: 0., texaround: 0., texribs:0,
            flu: 1, fluwidth: -1, fluorescS: 0, fluorescS1: 1, fluorescH1: 1 }, bc, me.numControlsCols + bc - 1);
        setx({ fluorescH1: 0 }, bc);
        setx({ fluorescH1: 1 / 3 }, bc + 1);
        setx({ fluorescH1: 2 / 3 }, bc + 2);
        setx({ fluorescH1: 1 / 6 }, bc + 3);
        // TODO correct use of numControlsCols
        // setx({fluorescH1: 3/6}, 8);
        // setx({fluorescH1: 5/6}, 9);
        // setx({fluorescV1: 0}, 10);
        // setx({fluorescS1: 0}, 11);
    };
    // me.skelscale = 1/450;
    me.targetHeight = 1.6;
    function safecol(x) { return x % COLNSAFE + COLSAFE; }
    /** use skeleton to make a Role using pullsprings */
    me.tadskel = async function ({ fid = undefined, k = undefined, len = 0, str = 1, pow = me.tadpow, dopulls = true, dodists = false, relsize = 1, data = undefined } 
    // experiments with strong typing
    // trying to get
    //  (a) strong typing,
    //  (b) no ? types,
    //  (c) defaults for individual fields same from (1) no input and (2) {} or underspecified input
    // Below works but absurdly verbose
    //: {fid: string, k:N, len:N, str:N, pow:N}
    //= {fid: 'test.skelj', k: me.skelscale, len:0, str:0, pow: me.tadpow})
    = {}) {
        var _a, _b, _c;
        if (!fid)
            fid = data.fid;
        let role = await makeRole(`tadskel_${fid.replace('.skelj', '')}`);
        role.isSkeleton = true;
        if (role.infdone)
            return endTime(role);
        role.fid = fid;
        role.arguments = { k };
        role.pullStrength = 1; // was 10 when skeletons seemed to need much fuller pulling; now 1 3/3/23 as other forces more even
        if (typeof data === 'string')
            data = JSON.parse(data);
        const skel = role.details.skel = data || JSON.parse(await (await xfetch('data/' + fid)).text());
        const d = role.details.data = skel.data;
        if (skel.colarray) {
            role.details.colarray = new Float32Array(skel.colarray);
        }
        else {
            const cfid = 'data/' + role.sid + '.colourbin';
            if (fileExists(cfid))
                role.details.colarray = await tad.colread(cfid);
        }
        const genes = role.details.genes = role.details.skel.genes;
        let hset;
        if (genes) { // no genes for older export/import style
            // const hset = role.details.hset = new WA.HornSet();
            //hset.setuphorn(genes.tranrule, genes);
            me.enterHorncontext();
            try {
                // don't corrupt currentHset, which is set as side-effect of hornTrancodeForTranrule
                // TODO: ? find more generic way of only setting currentHset when it is appropriate
                const sh = currentHset;
                hset = role.details.hset = WA.hornTrancodeForTranrule(genes.tranrule, genes);
                currentHset = sh;
                hset._genhornrun(genes); // no uniforms, populate the hornun details
            }
            finally {
                me.leaveHorncontext();
            }
        }
        const stats = CSynth.stats(d);
        const cv = VEC3(stats.min).add(stats.max).multiplyScalar(0.5);
        log('skel cent', role.id, cv);
        for (const v of d) {
            v.x -= cv.x;
            v.y -= cv.y;
            v.z -= cv.z;
        }
        ; // centre
        for (const v of d) { /* v.x *= -1; */
            v.z *= -1;
        }
        ; // because camera behind in tadkin ... ??? need some sort of tadkin/mirrormode ??? copyXflip
        // ????? if (!dualmode) for (const v of d) {[v.x, v.z] = [v.z, -v.x]}; // ??? TODO WHY 5 Sept 2022 ???
        // let maxrad = Math.max(...stats.radii);
        // if (maxrad > 1000) console.error('unexpected maxrad', maxrad);
        // if (k === undefined) k = 0.25 / maxrad * relsize;
        let maxheight = stats.ry;
        if (k === undefined)
            k = me.targetHeight / maxheight * relsize;
        role.details.autoscale = k;
        const numParticles = Math.min(TADS * RIBS, d.length);
        msgfixlog('tadskel', fid, 'tads used:', d.length / RIBS, 'of available', TADS);
        role.numtads = numParticles / RIBS;
        // compute lengths (used for #ribs) and make backbone using specific lengths
        const lens = role.lengths = new Float32Array(me.tadnum);
        role.oribs = new Float32Array(me.tadnum);
        const prio = 1;
        const backpow = 2;
        const backtype = me._cf['backbone'][0];
        for (let tid = 0; tid < numParticles / RIBS; tid++) {
            let l = 0;
            for (let i = tid * RIBS + 1; i < (tid + 1) * RIBS; i++) {
                const dist = distxyz(d[i], d[i - 1]) * k;
                let sstr = Math.min(0.0001, str / (dist * dist * 1000));
                addspring(toTid(i), toTid(i - 1), dist, sstr, backpow, role, prio, backtype);
                l += dist;
            }
            lens[tid] = l;
        }
        // set up pullsprings to specific points, and colours, radii, etc
        const arr = role.roleprops;
        const cum = skel.cumcount;
        let basecol = 0; // we will scan skel.cumcount to find original number (already offset)
        let sx = 0, sy = 0, sz = 0;
        const hrun = hset === null || hset === void 0 ? void 0 : hset.hornrun;
        let hh = 3; // index to hornrun
        for (let i = 0; i < numParticles; i++) {
            let ribs;
            const tid = Math.floor(i / RIBS); // tadpole #
            if (genes) {
                while (tid > ((_a = hrun[hh]) === null || _a === void 0 ? void 0 : _a.cumnum))
                    hh++; // ? patches issues where there are not enough horns to fill all particles
                ribs = (_c = genes[((_b = hrun[hh]) === null || _b === void 0 ? void 0 : _b.hornname) + '_ribs']) !== null && _c !== void 0 ? _c : 99;
            }
            else {
                ribs = Math.min(me.skelRibMax, me.skelRibFac * lens[Math.floor(i / RIBS)]);
            }
            while (basecol < COL.NUM - 1 && (cum[basecol] === undefined || tid >= cum[basecol]))
                basecol++;
            const dd = d[i];
            const x = dd.x * k, y = dd.y * k, z = dd.z * k, r = dd.w * k;
            sx += x;
            sy += y;
            sz += z;
            if (dopulls) { // create pullstring, head stronger so it leads the flow
                const str2 = str / numParticles * (i % RIBS ? 0.1 : 1); // test for wavier ends / Math.max(r,1);
                role.springs.push({ at: toTid(i), bt: toTid(0), type: 'pullspring', x, y, z, len, str: str2, pow, prio: prioR('skel') });
            }
            arr[i * 4] = arr[i * 4 + 2] = r / G._tad_s_radius; // will be multiplied up by _tad_s_radius in the tranrule
            /// arr[i*4 + 1] =((basecol*3 + (tid%6))) % COLNSAFE + COLSAFE - 3;    // COLSAFE for safe colours, -3 as skel from horns already has offset 3
            arr[i * 4 + 1] = safecol(basecol - 3); // -3 as skel from horns already has offset 3
            // arr[i*4 + 3] = Math.min(me.skelRibMax, me.skelRibFac * lens[Math.floor(i/RIBS)]);   // me.skelRibFac arbitrary number but experimentally about right
            arr[i * 4 + 3] = ribs;
            role.oribs[i] = ribs;
        }
        log('skel cent', role.id, sx / numParticles, sy / numParticles, sz / numParticles);
        // /** compute distance map if requested */
        // dodists = me.tadnum < 1024;
        // if (dodists) {
        //     me.makeRoleDistmap(role);
        // }
        if (hset) {
            const parents = hset.parentplace();
            const len = 0, str = 1, pow = 0;
            for (let i = 1; i < parents.length; i++) {
                const at = [i, 0];
                const p = parents[i];
                const bt = [Math.floor(p), p % 1 * RIBS];
                role.springs.push({ at, bt, type: 'pullsubpart', len, str, pow, prio: prioR('skel') });
            }
        }
        return endTime(role);
    }; // tadskel
    me.prio.skel = 0.3;
    /** set # ribs based on length of tadpole
    **/
    me.setRibsByLength = function (k = 100) {
        for (let i = 3; i < me.tadprop.length; i += 4)
            me.tadprop[i] = me.T[0].role.lengths[Math.floor(i / me.tadnum)] * k;
    };
    me.setMaxRibsByLength = function (k = 100) {
        const role = me.T[0].role;
        for (let i = 0; i < me.TADS * me.RIBS; i++) {
            const ti = Math.floor(i / me.RIBS);
            me.tadprop[i * 4 + 3] = Math.min(role.oribs[ti], role.lengths[ti] * k);
        }
    };
    // create and use a skeleton from dispobj mutation (dispobj=undefined uses lastDispobj)
    me.dynskel = async function (pdispobj) {
        const dispobj = xxxdispobj(pdispobj);
        const data = await saveSkeleton('!temp', dispobj);
        const role = await me.tadskel({ data, fid: '!temp' });
        me.newThing(role);
        // establish horn colour and use it for tadpole main window
        // COL.genes2col(dispobj.genes);
        const g = dispobj.genes;
        const a = COL.array;
        const k = role.details.autoscale || 1;
        for (const gn in g)
            if (gn.endsWith('texscale'))
                g[gn] *= k;
        HW.setHornColours(g);
        for (const gn in g)
            if (gn.endsWith('texscale'))
                g[gn] /= k;
        if (!me.savedCOL)
            me.savedCOL = COL.array.slice();
        me.savedCOL.set(COL.array);
        me.colload(me.savedCOL, 'dyn'); // ? may not be needed, useCOL will do it j.i.t. anyway ?
        // TODO get view
    };
    // use previously saved colours
    me.useCOL = function () {
        if (me.savedCOL)
            me.colload(me.savedCOL, 'dyn');
    };
    me.makeRoleDistmap = function (role) {
        if (!role.details || !role.details.data) {
            return console.error('no data for role', role.id);
        }
        const k = role.details.autoscale || 1;
        role.details.disttext = me.makedistmap(role.details.data, role.details.autoscale);
        if (role === tad.T[0].role)
            U.distbuff = role.details.disttext;
    };
    // make a distance texture from set of positions
    me.makedistmap = function (d, k = 1) {
        const e = Math.min(TADS * RIBS, d.length);
        const n = springs.numInstances;
        const distarr = new Float32Array(n * n);
        distarr.fill(Infinity); // 0 distance behaves very badly
        for (let i = 0; i < e; i++) {
            for (let j = i; j < e; j++) {
                const dx = Math.max(distxyz(d[i], d[j]) * k, me.minSkelDist);
                distarr[i + j * n] = distarr[j + i * n] = dx;
            }
        }
        const disttex = new THREEA.DataTexture(distarr, n, n, THREESingleChannelFormat, THREEA.FloatType);
        disttex.needsUpdate = true;
        return disttex;
    };
    // debug for checking what colour numbers are in use
    me.colsummary = function (role = tad.T[0].role) {
        return endTime(role).roleprops.filter((v, i) => i % 4 === 1).filter((v, i, a) => v !== a[i - 1]);
        // also tad.tadprop.filter((v,i) => i%4===1).filter((v,i,a) => v !== a[i-1])
    };
    me.minSkelDist = 0.001;
    /** use distances for skeleton if requested,
     * called every frame to ensure setup sensible
     * and if necesssary create the distance map
     */
    me.skeldist = function ({ role = tad.T[0] && tad.T[0].role } = {}) {
        if (!role)
            return msgfix('skeldist', 'no role');
        if (!me.useDists) { // && role.details.disttext <<< won't work except for horns at the moment
            G.xyzforce = 0;
            G.springforce = me.springforce;
            if (G.pullspringforce === 0 && !tad.animskelRunning)
                G.pullspringforce = me.pullspringforce;
            uniforms.distbuff.value = null;
            return msgfix('skeldist', 'NOT using distances for', role.id);
        }
        G.pullspringforce = 0.00;
        G.springforce = 0;
        G.xyzforce = me.xyzforce;
        G.springCentreDamp = 1;
        tad.skelpull = 0;
        uniforms.pullspringmat.value.identity();
        tad.skelcentre = 1;
        me.allOrdered(true);
        let disttex = role.details.disttext;
        if (disttex) {
            uniforms.distbuff.value = disttex;
            return msgfix('skeldist', 'using distances for', role.id);
        } // common quick out
        msgfix('skeldist', 'preparing distances for', role.id); // message never shows, blocked
        const skel = role.details.skel;
        const d = (skel || role.details).data;
        if (!d)
            return msgfix('skeldist', 'no distances for ', role.id);
        const k = role.details.autoscale;
        disttex = role.details.disttext = me.makedistmap(d, k);
        uniforms.distbuff.value = disttex;
    };
    me.tadVirusLengthFactor = 0.8;
    me.tadVirusPushDist = 1.6;
    me.tadVirusPushStr = 0;
    me.tadVirusPushPow = 0;
    // lay out using virus plane definition, computing edges
    me.tadVirus = async function (pdef = 0, opts = {}) {
        let def = pdef;
        if (typeof def === 'number')
            def = me.virusDefs[pdef];
        const sc = def.scale || 1;
        if (!Array.isArray(def.tiling))
            def.tiling = [def.tiling];
        def.tiling.forEach((t) => t.size = (t.size || 1) * sc);
        if (!def.rscale) {
            def.rscale = sc;
            def.scale = 1; // in case of revisit
        }
        const rsc = def.rscale;
        let { str, tadPerPlane, ribsBetweenEdges, virusSegDist, allowBad, numtads } = Object.assign({ str: 1, tadPerPlane: 0, ribsBetweenEdges: 0, virusSegDist: 0.01, allowBad: false, numtads: TADS }, opts);
        let len = virusSegDist, pow = 0, prio = 1;
        let role = await makeRole(`tadVirus_${def.shortname || '?'}`);
        if (opts.prep)
            role.springs = []; // clear previous position pullsprings
        role.details.def = def;
        if (role.infdone)
            return endTime(role);
        role.id4Edge = function (pln, edgen) {
            return pln * this.tadPerPlane * RIBS + edgen * this.ribsBetweenEdges; // this allows edges to flow smoothly over group of pln tadpoles
        };
        Plane.findPoint.thresh = 0.01;
        const pset = role.pset = Plane.planesetSymset(def.tiling || def);
        await sleep(1);
        Plane.processSet(pset);
        await sleep(1);
        pset.forEach((p, i) => p.id = i); // so planes are easily identified
        // for autoset max usage of tadpoles for a virus
        const maxTadPerPlane = Math.floor(numtads / pset.length); // was HEADS (why not TADS?)
        if (!tadPerPlane)
            log('auto tadPerPlane', tadPerPlane = maxTadPerPlane);
        if (tadPerPlane > maxTadPerPlane && !allowBad)
            log('forced max tadPerPlane', tadPerPlane = maxTadPerPlane);
        const maxRibsBetweenEdges = Math.floor(tadPerPlane * RIBS / 6);
        if (!ribsBetweenEdges)
            log('auto ribsBetweenEdges', ribsBetweenEdges = maxRibsBetweenEdges);
        if (ribsBetweenEdges < 0)
            log('auto -ve ribsBetweenEdges', ribsBetweenEdges = Math.max(1, maxRibsBetweenEdges + ribsBetweenEdges));
        if (ribsBetweenEdges > maxRibsBetweenEdges && !allowBad)
            log('forced max ribsBetweenEdges', ribsBetweenEdges = maxRibsBetweenEdges);
        Object.assign(role, { tadPerPlane, ribsBetweenEdges, virusSegDist });
        // Object.assign(me, [tadPerPlane, ribsBetweenEdges, virusSegDist]);
        return (me.useVirusPoints ? await tadVirusPoints : tadVirusEdges)();
        function tadVirusEdges() {
            // continue here for older topology/distance edge based  virus
            pset.forEach((p, i) => {
                const edges = p.edges = Plane.edges(p);
                edges.forEach((e, ei) => {
                    setslot(role.id4Edge(i, ei), role.id4Edge(e.oplane.id, e.oind), len, str, pow, role, prio); // cross tad edge contacts
                });
                addspring(role.id4Edge(i, 0), role.id4Edge(i, edges.length), len * 0.1, str * 10, pow, role, prio); // tad into circle
            });
            // force overall shape
            if (me.tadVirusPushStr) {
                pset.forEach((p1, i1) => {
                    pset.forEach((p2, i2) => {
                        if (i1 > i2) {
                            const dd = distxyz(p1.point, p2.point);
                            if (dd > me.tadVirusPushDist)
                                addspring(role.id4Edge(i1, 0), role.id4Edge(i2, 0), dd, me.tadVirusPushStr, me.tadVirusPushPow, role, prio);
                        }
                    });
                });
            }
            // n.b. backbone uses length for entire tadpole, reflen is just for ribsBetweenEdges segments
            const edge0 = Plane.edges(pset[0])[0];
            const reflen = edge0.p0.distanceTo(edge0.p1);
            const blen = reflen * RIBS / role.ribsBetweenEdges * me.tadVirusLengthFactor;
            backboneSprings(role, { len: blen, str });
            groupSprings(role, { group: role.tadPerPlane, len: 0, str: str * 1.01, pow: 2 }); // join groups of tadpoles
            // const headUsed = 3; // assume 3 parts of tadpole used for edges, rest are tail
            const rp = role.roleprops;
            // note 4 below is for 4 values per rp entry (rad, ?, torad, ?)
            // narrow tails not part of topology
            for (let i = 0; i < pset.length; i++) {
                const st = i * RIBS * role.tadPerPlane; // id for start
                const headUsed = pset[i].edges.length;
                const stt = st + headUsed * role.ribsBetweenEdges;
                const et = (i + 1) * RIBS * role.tadPerPlane; // id for start of next
                for (let k = stt; k < et; k++) {
                    rp[k * 4] = rp[k * 4 + 2] = 0.01 * rsc;
                }
            }
            // kill/hide unused tadpoles
            for (let i = pset.length * RIBS * role.tadPerPlane * 4; i < rp.length; i += 4) {
                rp[i] = rp[i + 2] = 0;
            }
            return endTime(role);
        }
        // lay out using virus plane definition, attract to points
        async function tadVirusPoints() {
            const rp = role.roleprops;
            pset.forEach((p, i) => p.id = i); // so planes are easily identified
            // count the number of points to be pulled so we can scale pullspring strength
            let e = 0;
            pset.forEach((ps, _psi) => {
                const points = ps.poly.points;
                e += points.length;
            });
            // pset.forEach( (ps: { poly: { points: any[]; }; }, psi: number) => {
            for (let psi = 0; psi < pset.length; psi++) {
                if (psi % 50 === 0)
                    await sleep(1);
                const ps = pset[psi];
                const points = ps.poly.points;
                const sk = role.id4Edge(psi, 0); // start of tadpole group
                const ek = role.id4Edge(psi + 1, 0); // end of tadpole group
                let euk; // end of part used form 'main' swipe
                for (let pi = 0; pi <= points.length; pi++) { // nb almost wraps in circle back to 0
                    const p = points[pi % points.length];
                    // correct last in circle so it doesn't exactly hit first (and thus cause instability)
                    if (pi === points.length)
                        p.clone().add(points[1]).multiplyScalar(0.5);
                    const { x, y, z } = p;
                    const skk = euk = sk + ribsBetweenEdges * pi;
                    role.springs.push({ at: toTid(skk), bt: toTid(0), type: 'pullspring', x, y, z, len, str: str / e * (pi % RIBS ? 0.99 : 1), pow, prio: prioR('skel') });
                    if (opts.prep)
                        role.details.data[skk] = VEC3(x, y, z); // so later point join works
                    let side = points[0].distanceTo(points[1]);
                    let zstr = 0.01, zlen = side * (me.tadxSpringSpike || 1.5);
                    if (pi !== points.length - 1)
                        addspring(skk, ek - 1, zlen, zstr, pow, role, prio); // spring to keep spike out
                }
                ;
                // edge rads
                for (let ck = sk; ck < euk; ck++) {
                    rp[ck * 4] = rp[ck * 4 + 2] *= me.tadEdgeRad * rsc;
                }
                // now give ice-cream cone spike
                let q = ribsBetweenEdges * points.length; // one cycle
                const dq = (q - me.tadxMinq) / (ek - euk);
                for (let ck = euk; ck < ek; ck++) {
                    const r = (ek - ck) / (ek - euk); // ratio, diminishing to 0 just after end
                    const str = me.tadxSpringStr * (r ** 3 + (1 - r ** 3) * me.tadxSpringEndStr);
                    if (me.doAddSpring)
                        addspring(toTid(ck), toTid(ck - Math.ceil(q)), me.tadxSpringLen, str, pow, role, prio);
                    q -= dq;
                    const rm = (ck === ek - 1) ? me.tadSpikeEndRad : (r * me.tadEdgeRad + (1 - r) * me.tadSpikeRad);
                    rp[ck * 4] = rp[ck * 4 + 2] *= rm * rsc; // spike rad
                }
                const usetiles = def.tiling.length !== 1;
                // colours
                for (let ck = sk; ck < ek; ck++) {
                    rp[ck * 4 + 1] = (usetiles ? ps.source.plane.tileid : psi) + COLSAFE;
                }
                const { x, y, z } = ps.poly.points.reduce((a, b) => a.add(b), VEC3()).multiplyScalar(me.tadSpike / points.length); // spike end
                // const {x,y,z} = (ps.point as THREE.Vector3).clone().multiplyScalar(me.tadSpike);
                //?? not needed ??? role.springs.push({at : toTid(ek-1), bt: toTid(0), type: 'pullspring', x, y, z, len, str: str / e, pow, prio: prioR('skel')});
            }
            // n.b. backbone uses length for entire tadpole, reflen is just for ribsBetweenEdges segments
            const reflen = pset[0].poly.points[0].distanceTo(pset[0].poly.points[1]);
            const blen = reflen * RIBS / role.ribsBetweenEdges * me.tadVirusLengthFactor;
            backboneSprings(role, { len: blen, str });
            groupSprings(role, { group: role.tadPerPlane, len: 0, str: str * 1.01, pow: 2 }); // join groups of tadpoles
            // kill/hide unused tadpoles
            for (let i = pset.length * RIBS * role.tadPerPlane * 4; i < rp.length; i += 4) {
                rp[i] = rp[i + 2] = 0;
                rp[i + 1] = 0; // TODO decide good colour, but its hidden anyway
            }
            // me.offset(role, me.centre);
            await me.joinClose(role); // force inter-face topology, would be better to generate using topology properly
            return endTime(role);
        }
    };
    me.tadSpike = 1.5; // spike height compared to main surfcae
    me.doAddSpring = true; // use the extra spike
    me.tadxSpringLen = 0.001; // length of the tad segments in the spike (??? should reduce)
    me.tadxSpringStr = 0.0001; // strength of spike springs at start
    me.tadxSpringEndStr = 3; // boost to strength of spike springs by end
    me.tadxMinq = 3; // min q for helix twist along spike
    me.tadEdgeRad = 3.0; // radius for main edge. nb three radii doubled, 6 Apr 2023
    me.tadSpikeRad = 1.4; // radius for end of spike (narrows over spike)
    me.tadSpikeEndRad = 4; // radius for very end of spike
    // me.tadEdgeRad = 1.5; me.tadSpikeRad = 0.8; me.tadxMinq = 3; me.tadxSpringLen = 0.01 * 0.1;     me.tadxSpringStr =  0.0001;  me.tadSpike = 1.4; me.newThing(me.tadVirus(4, {tadPerPlane: 0, ribsBetweenEdges: 3})); me.allOrdered();
    /** offset complete role by vector v */
    me.offset = function (role, v) {
        const d = role.details.data;
        if (d)
            for (const p of d) {
                p.x += v.x;
                p.y += v.y;
                p.z += v.z;
            }
        // for (const s of role.springs) {
        //     if (s.type === 'pullspring') {
        //         s.x += v.x; s.y += v.y; s.z += v.z;
        //     }
        // }
    };
    me.useVirusPoints = true;
    me.virusDefsX = {
        ///contacts: [{filename: 'triva.contacts', shortname: 'IF'}],
        colorScheme: [['A', 0x3030ff], ['B', 'green'], ['C', 'red']],
        //baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
        extraPDB: [
            {
                filename: '1sva.pdb', shortname: 'SV40', comment: 'Emergent Human Pathogen Simian Virus\nalso called HSV',
                tiling: [
                    { a: 0.45451063262124236, b: -0.1735073261813263, size: 1 },
                    { a: 0, b: 0, size: 1 },
                    { a: 0.07608244680159279, b: -0.6415763702842711, size: 1 }
                ],
                scale: 0.35,
                orient: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            },
            {
                filename: '6cgr.pdb', shortname: 'HSV1',
                style: searchValues.hsvstyle || 'smooth',
                colorBy: 'chain', colDistNear: 490, colDistFar: 611,
                comment: 'Herpes Simplex Virus\nlike Basilisk, fig 3b',
                tiling: //  !searchValues.hsvab ? 'GeodesicIcosahedron25.polys' :      // pre Aug 19
                [
                    { a: 1, b: 0, size: 0.9960515674918517 },
                    { a: 0.5043645634880239, b: 0, size: 0.9920374665156196 },
                    { a: 0.2657419602284653, b: -0.733306819738863, size: 0.990790533995604 },
                    { a: 0, b: 0, size: 0.990760686442865 },
                    { a: 0.7821769488688209, b: -0.21782305113117853, size: 0.9992576073766486 },
                    { a: 0.5272617433956593, b: 0.47273825529490177, size: 0.999068905073811 },
                    { a: 0.2566082373396572, b: -0.23737687807156496, size: 0.9989979459735572 },
                    { a: 0.25660824082065414, b: 0.2373768742057317, size: 0.998997947071859 },
                    { a: 0, b: 0.4814983189272394, size: 0.998960463933496 },
                    { a: 0, b: -0.9999999981691525, size: 0.9989479045079642 } // tri 5
                ],
                colorScheme: [
                    ['4,A,B,C,D,E,F', 0xffff00],
                    ['M,N,O,S,T,U,V,W,X', 0xff6000],
                    ['0,1,2,3,G,H,I,J,K,L,P,Q,R,Y,Z', 'green'],
                    ['5,8,b,e,h', 'red'],
                    ['6,7,9,a,c,d,f,g,i,j', 0x3030ff],
                    ['k,l,m,n,o', 'black']
                ],
                excludeChains: searchValues.hsvExclude ? 'KLMNOklmno' : 'klmno',
                scale: 0.36,
                orient: [-0.588, 0.688, -0.425, 0, -0.809, -0.500, 0.309, 0, 0, 0.526, 0.851, 0, 0, 0, 0, 1],
                XmeshOrient: [-80.7, -49.6, -31.0, 0, 30.3, -80.7, 50.1, 0, -50.1, 31.4, 80.7, 0, 0, 0, 0, 1],
                Xorient: [0.348, 0.811, 0.280, 0, -0.597, 0.012, 0.708, 0, 0.616, -0.447, 0.527, 0, 0, 0, 0, 1]
            },
            // { // 3
            //     filename: '1f8v.pdb', shortname: 'PAV\naffine extension',
            //     // has biomt
            //     comment: 'Pariacoto',
            //     spheres: 'pariacoto_full_export_563_*.pdb',
            //     tiling: {a:0.257, b:0, size: 1}, // a=4, b=0, 5/6 triangles
            //     style: 'cartoon', colorBy: 'chain', // opacity: 0.2, transparent: true,
            //     scale: 0.75,
            //     orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1],
            //     spheresOrient: [0.310, 0.812, -0.502, 0, -0.503, -0.309, -0.810, 0, -0.811, 0.500, 0.307, 0, 0, 0, 0, 1]
            // },  // PAV affine
            {
                filename: '1f8v.pdb', shortname: 'PAV',
                // has biomt
                comment: 'Pariacoto fig 4a',
                tiling: { a: 0.257, b: 0, size: 1 },
                scale: 0.5,
                orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1]
            },
            {
                filename: '2ms2.pdb', shortname: 'MS2',
                // has biomt
                comment: 'Bacteriophage MS2, fig 4b',
                tiling: [{ x: 0, y: 0, z: 1, size: 1 }, { x: 0.9, y: 0, z: 1, size: 1 }],
                scale: 0.5,
                Xorient: [0.809017, 0.500000, 0.309017, 0, -0.30902, 0.809017, -0.50000, 0, -0.50000, 0.309017, 0.809017, 0, 0, 0, 0, 1],
                orient: [0.500, -0.309, 0.809, 0, 0.809, 0.500, -0.309, 0, -0.309, 0.809, 0.500, 0, 0, 0, 0, 1]
            },
            {
                filename: '1a6cX.pdb', shortname: 'TRSV',
                // has biomt
                comment: 'Tobacco Ringspot Virus\nfig 4c',
                tiling: { a: 0.3758987414465172, b: 0.617193999288073, size: 1 },
                scale: 0.5,
                colorBy: 'chaingroup',
                baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
                orient: [-0.500, -0.309, -0.809, 0, -0.309, -0.809, 0.500, 0, -0.809, 0.500, 0.309, 0, 0, 0, 0, 1]
            } // TRSV
        ]
    };
    me.virusDefs = me.virusDefsX.extraPDB;
    // set initial positions just from centre of faces ... does not allow for role.map
    me.virposLineSpike = function (role = me.T[0].role) {
        const pset = role.pset;
        WA.pset = pset;
        for (let i = 0; i < pset.length; i++)
            for (let z = 0; z < RIBS * role.tadPerPlane; z++)
                springs.setfix(role.id4Edge(i, 0) + z, pset[i].point.clone().multiplyScalar(1 + (z - 4) / 20));
        springs.finishFix(TADS * RIBS);
    };
    // set initial positions from joining edges
    me.virpos = function (role = me.T[0].role) {
        const pset = role.pset;
        if (me.useVirusPoints)
            return me.virposPoints(role);
        me.virposLineSpike(role); // this will set the tails fairly sensibly
        const v = VEC3();
        for (let i = 0; i < pset.length; i++) {
            const edges = pset[i].edges;
            const lv = VEC3();
            const be = role.id4Edge(i, 0); // base position
            for (let ei = 0; ei <= edges.length; ei++) {
                const se = be + ei * role.ribsBetweenEdges; // spring id# for start of segment
                const sv = edges[ei % edges.length].pc; // position for start of segment
                // const ee = role.id4Edge(i, (ei+1));
                const ev = edges[(ei + 1) % edges.length].pc; // position for end of segment
                for (let ii = 0; ii < role.ribsBetweenEdges; ii++) { // for each popint along segment
                    lv.copy(sv).lerp(ev, ii / role.ribsBetweenEdges); // interpolate position
                    springs.setfix(se + ii, lv); // and set spring
                }
            }
        }
        springs.finishFix(TADS * RIBS);
    };
    // set initial positions from joining edges
    me.virposPoints = function (role = me.T[0].role) {
        const pset = role.pset;
        me.virposLineSpike(role); // this will set the tails fairly sensibly
        const v = VEC3();
        for (let i = 0; i < pset.length; i++) {
            const points = pset[i].poly.points;
            const lv = VEC3();
            const be = role.id4Edge(i, 0); // base position
            for (let ei = 0; ei <= points.length; ei++) {
                const se = be + ei * role.ribsBetweenEdges; // spring id# for start of segment
                const sv = points[ei % points.length]; // position for start of segment
                // const ee = role.id4Edge(i, (ei+1));
                const ev = points[(ei + 1) % points.length]; // position for end of segment
                for (let ii = 0; ii < role.ribsBetweenEdges; ii++) { // for each popint along segment
                    lv.copy(sv).lerp(ev, ii / role.ribsBetweenEdges); // interpolate position
                    springs.setfix(se + ii, lv); // and set spring
                }
            }
        }
        springs.finishFix(TADS * RIBS);
    };
    /** allow for free tadpoles to belong to a Thing; ??? allow it to have groups */
    me.tadfree = async function ({ str = 1, _pow = 0, num = RIBS, numtads = TADS, lenfac = 1 } = {}) {
        const key = `tadfree_${num}_${lenfac}`;
        const role = await makeRole(key);
        const len = lenfac * me.TADLEN;
        if (role.infdone)
            return endTime(role);
        me.prio[key] = 1;
        backboneSprings(role, { len, str, num, userods: true, numtads, type: me._cf['tadfreebackbone'][0] });
        role.numtads = numtads;
        me.tadshape(role);
        return endTime(role);
    };
    /** test to render short free tadpoles */
    me.tadfreego = async function (num = 4, numtads = TADS) {
        const tf = await me.tadfree({ num, numtads });
        me.shortTadrad(tf, num); // ?? shortTadrad may just be called from or integrated with tadfree ??
        me.newThing(tf);
        // tad.allOrdered();
        // me.shortRender(num);
        uniforms.LRIBS.value = num; // todo UNDO for new feature; allow head attraction for short tads
    };
    /** set up rendering for short tadpoles  */
    me.shortTadrad = function (tf, num = 1, off = 4) {
        const tp = tf.roleprops;
        const step = num * 4;
        for (let i = step - off; i < tp.length; i += step)
            tp[i + 2] = -tp[i + 2];
        setInput('SPLITTING', num !== 8);
    };
    /** set up rendering in short  */
    me.shortRender = function (num = 1, off = 4) {
        if (!me.tadprop)
            return;
        me.TESTapplyProps();
        const tp = me.tadprop;
        const step = num * 4;
        for (let i = step - off; i < tp.length; i += step)
            tp[i] = tp[i + 2] = -tp[i];
        setInput('SPLITTING', num !== 8);
    };
    /** shape tadpoles; can call dynamically with different values
    Mainly for free tadpoles, could be used for other forms
    Leave colouring to standard makeRole
    */
    me.tadshape = function (role, num = RIBS, rad = me.basefreeradius, frac = me.freeradfac) {
        const arr = role.roleprops;
        // const tadshapeoff = 14;      // colour offset so different styles coloured differently
        let p = 0, pid = 0; // arr entry number, particle number
        for (let tad = 0; tad < TADS * RIBS / num; tad++) {
            // const col = tad + tadshapeoff;
            for (let i = 0; i < num; i++) {
                arr[p++] = rad * frac ** i;
                p++; // leave col
                // arr[p++] = col;
                arr[p++] = rad * frac ** i;
                p++; // nb leave ribs
                pid++;
            }
        }
        return endTime(role);
    };
    me.basefreeradius = 2;
    me.freeradfac = 0.7;
    // tadhornPOMP obsolete??? 3 Nov 2021
    //     /** make a topolgy that corresponds to a horn structure.
    //      * This is not at all generic, but uses a builtin specific horn structure.
    //      */
    //     me.tad horn = function(group = me.GROUP, len = 0, str = 1, pow = me.tadpow) : Role {
    //         let role = makeRole(`tad Horn_${group}`);
    //         role.arguments = {group, len, str, pow};
    //         backboneSprings(role, {str});
    //         groupSprings(role, group, len, str, pow);
    // /*
    // ~~~~ V V V   | | | | | | ^^^^                   === _tad_h
    // ~~~~+++++++==============^^^^    ~~~~ ++++ head | | | cage ^^^
    // ~~~~         | | | | | | ^^^^    brh   VVV  sub            brt
    // All segments to have the same length at least initially (groups of tadpoles)
    // to simplify correlation with horn skeleton.
    //      1          ========= 0                 _tad_hstart
    //      1          +++++++++ 1                 headstart
    //      cagen      | | | |   2                 cage1start
    //      cagen      | | | |   2+cn              cage2start
    //      ssubn      V V V V   2+2*cn            substart
    //      brhn       ~ ~ ~ ~   substart+ssubn    brhstart
    //      brtn       ^ ^ ^ ^   brhstart+brtn     brtstart
    // */
    //         const k = group * RIBS;
    //         const numgroup = Math.ceil(me.tadnum / group);
    //         let cagen = k;
    //         let ssubn = cagen;
    //         let hh = numgroup - (2 + 2*cagen + ssubn);
    //         let brhn = Math.floor(hh/3);
    //         let brtn = hh - brhn;
    //         let _tad_hstart = 0;
    //         let headstart = _tad_hstart + k, _tad_htail = headstart - 1;
    //         let cage1start = headstart + k, headtail = cage1start-1;
    //         let cage2start = cage1start + cagen*k;
    //         let substart = cage2start + cagen*k;
    //         let brhstart = substart + ssubn*k;
    //         let brtstart = brhstart + brhn*k;
    //         let brtend = brtstart + brtn * k;
    //         function as(a: Xkey,b: Xkey) { addspring(a,b, len, str, pow, role, prioR('hornMain')); }       // add spring
    //         function aas(a: Xkey, b: Xkey) { setslot(a, b, len, str, pow, role, prioR('hornBranch')); }        // add asym spring
    //         const arr = role.roleprops;
    //         const COL OFF = 19 + group;
    //         // set properties for particle
    //         function prop(pid: number, rad: number, col: number) {
    //             col += COL OFF;
    //             // in tranrule rad *= G._tad_s_ radius;
    //             let p = pid * 4;
    //             for (let i = 0; i < k; i++) {
    //                 arr[p++] = rad;
    //                 arr[p++] = col;
    //                 p += 2;             // leave ribs to default
    //             }
    //         }
    //         as(_tad_hstart, headstart);     // head to head of _tad_h and head
    //         prop(_tad_hstart, 3, 1);
    //         prop(headstart, 2, 2);
    //         for (let i = 0; i < cagen; i++) {
    //             as(cage1start + k * i, _tad_hstart + i);    // cage off _tad_h part 1
    //             // <<< todo, allow for 'duplicates' at head on one tadpole, tail of next
    //             prop(cage1start + k * i, 1, 3);
    //         }
    //         for (let i = 0; i < cagen; i++) {
    //             as(cage2start + k * i, _tad_hstart + i);    // cage off _tad_h part 2
    //             prop(cage2start + k * i, 1, 3);
    //         }
    //         for (let i = 0; i < ssubn; i++) {
    //             as(substart + k * i, headstart + i);        // ribs off head
    //             prop(substart + k * i, 0.8, 4);
    //         }
    //         for (let i = 0; i < brhn; i++) {
    //             aas(brhstart + k * i, _tad_htail);        // branch at _tad_h tail
    //             prop(brhstart + k * i, 0.8, 5);
    //         }
    //         for (let i = 0; i < brtn; i++) {
    //             aas(brtstart + k * i, headtail);          // branch at head tail
    //             prop(brtstart + k * i, 1, 1);
    //         }
    //         // const magrole = getRole(`tadMaggot_${group}`, 1000, 'maggot ends');
    //         // const e = Math.floor(RIBS*group * 0.6);         // to establish point to fold back on
    //         // for (let i = cage1start; i < brtend; i += k) {  // i is start of group each group
    //         //     aas(i + RIBS*group-1, i + e);
    //         // }
    //         puff(role, group, cage1start);
    //         return endTime(role);
    //     }
    me.prio.hornMain = 0.2;
    me.prio.hornBranch = 0.8;
    me.basecoldefs = { '': 9999,
        red: 'rrx', green: 'rrx', blue: 'rrx',
        refl: 0, band: 'rr', bandbetween: [0, 0.3], bumpstrength: [0, 15],
        texalong: 0, texaround: 0, texribs: 0, iridescence: [-0.2, 0.2], bumpscale: [0.025, 0.1],
        flu: 1, fluwidth: [0.002, 0.006], fluorescH: [0, 1],
        plastic: 'rr', gloss: [0, 0.8], shin: 25, subband: -1, texscale: [], texrepeat: [1, 3],
        texfinal: 0, screenDoor: 0, texfract3d: 1, texdiv: 1, wob: 1,
        tex2dystretch: [1, 2], tex2dxstretch: [1, 10]
    };
    /** apply random colours to the tadpoles */
    me.randcols = function tadrandcols(kk = 0, l = 0, h = COL.NUM) {
        G.colribs = 0;
        // COL.ignoreHornColours = true;
        const savewall = COL.array.slice(COL.PARMS * WALLID, COL.PARMS * (WALLID + 1));
        const newseed = Math.floor(kk || Math.random() * 234572);
        if (newseed !== me.lastcolseed) {
            me.lastcolseed = newseed;
            COL.seed(newseed);
            log('tad.randcols seed ', newseed);
        }
        COL.setx(me.basecoldefs, l, h);
        // // i is colour property number, test to make sure all colours have been set by above
        // for (let i = 0; i < COL.PARMS; i++)
        //     if (COL.get(i, l) === 9999)
        //         log("unset", i, COL.names[i]);
        // for (let i = 0; i < COL.PARMS; i++)
        //     if (isNaN(COL.get(i, l)))
        //         log("nan", i, COL.names[i]);
        if (!savewall.every((x) => x === 0))
            COL.array.set(savewall, COL.PARMS * WALLID); // restore wall details if there are any
        COL.randcols2(-1, { colonly: true, hrr: 0.2, srr: 0, vrr: 0 }); // overwrite the red/green/blue, no overwriting too much
        COL.send(); // so the gpu sees them
        COL.col2genes(); // so the genes are set appropriately
        updateGuiGenes(); // and displayed
    };
    // /** utility, show the spring information */
    // me.showsprings = function() {
    //     const notused = RESERVED - 2;
    //     const n = HEADS-notused;
    //     let h=1, w = n*RIBS;
    //     if (uniforms.skelbufferRes.value.x === 1) { w=1; h = n*RIBS;}
    //     var spformat = format(readWebGlFloat(springs.posNewvals,  {top: notused*RIBS, height: n*RIBS})[0], 6);
    //     h=n; w=RIBS;
    //     var skformat = format(readWebGlFloat(skelbuffer, {height:h, width: w})[0], 6);
    //     if (spformat !== skformat) log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> buffer mismatch");
    //     log('springs', spformat);
    //     log('skelbuffx', skformat);
    //     log('skelbuffy', format(readWebGlFloat(skelbuffer, {height:h, width: w})[1], 6));
    //     log('skelbuffz', format(readWebGlFloat(skelbuffer, {height:h, width: w})[2], 6));
    //     log('skelbuffw', format(readWebGlFloat(skelbuffer, {height:h, width: w})[3], 6));
    //     log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> buffer ", spformat === skformat ? 'ok' : 'mismatch');
    // }
    /** set up reserved radii and colours, more dynamic to allow for baitWeight */
    me.reservedRads = function () {
        if (me.useGlyph)
            return; // set up in glyph
        if (me.baitWeightR === undefined)
            return;
        for (let tid = TADS; tid < TADS + CONTROLS; tid++) {
            let p = tid * RIBS * 4; // position in tadprop array
            let baser = me.baseTrackerSize * (tid === TADS ? me.baitWeightR : me.baitWeightL) ** 0.5 + 0.5; // let for debugger
            for (let i = 0; i < RIBS; i++) {
                tadprop[p] = tadprop[p + 2] = me.orb ? baser : baser * (1 - i / RIBS);
                tadprop[p + 1] = tid - TADS + 4; // 4 and a few for controllers
                p += 4;
            }
        }
        me.propTexture.needsUpdate = true;
    };
    // set up colours/radii for reserved items, all details but slower so setup not regular
    me.reservedProps = function () {
        COL.ignoreHornColours = 'usewall'; // prevent genes mapping to colours
        for (let tid = TADS; tid < HEADS; tid++) {
            let p = tid * RIBS * 4; // position in array
            const baser = tid < TADS + CONTROLS ? 2 : 0; // last two reserved not used/shown, why does -ve r not work ???
            const col = tid - TADS; // reserved colour
            for (let i = 0; i < RIBS; i++) {
                tadprop[p++] = baser * (1 - i / RIBS);
                tadprop[p++] = col;
                tadprop[p++] = baser * (1 - i / RIBS);
                tadprop[p++] = 8; // ribs
            }
        }
        if (me.propTexture)
            me.propTexture.needsUpdate = true;
        COL.setx({ red: 1, green: 0, blue: 0, id: 0 });
        COL.setx({ red: 0, green: 1, blue: 0, id: 1 });
        COL.send();
    };
    /** show info about the n'th tadpole */
    me.showtad = function (n) {
        let d = readWebGlFloat(springs.posNewvals, { top: n * RIBS, height: RIBS });
        let p = [];
        let dist = [];
        let td = 0;
        for (let r = 0; r < RIBS; r++)
            p.push(new THREEA.Vector3(d[0][r], d[1][r], d[2][r]));
        for (let r = 1; r < RIBS; r++) {
            dist.push(p[r].distanceTo(p[r - 1]));
            td += dist[r - 1];
        }
        log('pos', p);
        log('totlen', td, 'mylen', me.tadlen[n], 'stretch', td / me.tadlen[n]);
        return dist;
    };
    // function randFrom<T>(x: Dictionary<T>):T {
    //     const keys = Object.keys(x);
    //     const key = keys[randi(keys.length) ];
    //     return x[key];
    // }
    /** */
    me.nextThing = -1;
    me.useDists = false; // if set to true, horns etc will use distance springs
    function newThing(role) {
        var _a, _b;
        //if (TRA.length === 0) return; //in case we don't really have valid tadpole context.
        if (!role) { // role my ne undefined because of call with no parms, or because of explicit call with missing role
            me.nextThing++;
            if (me.nextThing >= TRA.length)
                me.nextThing = 0;
            role = TRA[me.nextThing];
        }
        if (keysdown.length === 1 && keysdown[0] === 'alt') {
            me.topos({ role });
            return T[0];
        }
        document.title = "TADKIN Organic Art: " + role.sid;
        if (me.doBestTransfer)
            me.bestTransfer(role.id);
        const t = me.addThing(role);
        events.trigger('newThing', t);
        // use distance maps if available and required, set forces accordingly
        uniforms.distbuff.value = role.details.disttext;
        if (keysdown.length === 1 && keysdown[0] === 'shift')
            tad.topos();
        uniforms.LRIBS.value = RIBS; // unless overridden after call to newThing
        let col = role.details.colarray;
        if (!col)
            col = (_b = (_a = me.roles.tadskel_BoneStack1) === null || _a === void 0 ? void 0 : _a.details) === null || _b === void 0 ? void 0 : _b.colarray;
        if (col)
            tad.colload(col);
        //else
        //    col();
        return t;
    }
    me.newThing = newThing;
    // this will all smooth movement without insideoutness fro current to (second) tr
    // work by insideouting twice
    me.stealThing = function (tr) {
        if (!tr)
            tr = randfrom(TR);
        newThing(tr);
        onframe(() => newThing(tr));
    };
    me.addThingListener = (f) => {
        events.on('newThing', (e) => {
            f.newThing(e.eventParms); //eventParms somewhat ugly, sorry.
        });
        events.on('deadThing', (e) => {
            f.deadThing(e.eventParms);
        });
    };
    var nextFlowTime;
    /** called to allow transfer of tads between active things (currently every beat) */
    me.flowBlock = function tadFlowBlock(all = false) {
        let done = 0; // number transferred
        let first = T.length === 0;
        if (first) {
            //const init rolename = searchValues.init rolename || 'tadcovid2';
            //const srole = me.TR[init rolename] /* || ofirst(me.TR) */ as Role;
            const srole = ofirst(me.TR);
            if (!srole)
                return; // nothing ready yet, should not be needed if startup in right order
            const thing = me.addThing(srole);
            GX.getgui('form/' + srole.sid.toLowerCase()).highlight();
            for (let i = 0; i < TADS; i++)
                thing.map.push(i); // populate its properties
            me.TESTapplyProps(); // get covid colours at start
            //me.remakePositions();
            //CSynth.hilbert(0.1);        // set starting positions
            // springs.pullsToFix(TADS*RIBS);           // start using pulls
            // onframe(() => springs.pullsToFix(TADS*RIBS), 2)
            done = TADS;
        }
        let tt = T.length - 1; // index for target object
        // for (let i = 0; i < n; i++) {
        if (me.snapmap) {
            const targthing = T[T.length - 1]; // will remain target till new one chosen
            const targmap = targthing.map; // do not use raw, full map push pushes raw and props
            const tassigned = me.tassigned;
            const snapmap = me.snapmap;
            const snapthings = me.snapthings;
            if (tt !== 0)
                while (frametime > nextFlowTime || all) {
                    nextFlowTime += 1000 / me.flowRate;
                    const n = targmap.length; // n'th tadpole will be set in tt
                    const ftadn = tassigned[n]; // the tadpole that is to be moved
                    const fromthing = snapthings[snapmap[ftadn]]; // the thing it will be moved from
                    const fmap = fromthing.map.raw; // the from thing's map
                    const fmappos = fmap.indexOf(ftadn); // where n the map the tadpole is
                    if (fmappos === -1)
                        me.owow('cannot find source tadpole', ftadn);
                    targmap.push(ftadn); // put that tadpole onto the target
                    fmap.splice(fmappos, 1); // and remove it from the source
                    done++;
                    if (fmap.length === 0) {
                        const j = T.indexOf(fromthing);
                        if (j === -1)
                            me.owow('cannot find thing in T active list', fromthing.role.id);
                        T.splice(j, 1);
                        events.trigger('deadThing', fromthing); // if source empty kill it off
                    }
                    if (targmap.length === targthing.role.numtads) {
                        me.snapmap = undefined;
                        me.tassigned = undefined;
                        break;
                    }
                }
        }
        else {
            let full = 0; // (approx) count of full objects, used to prevent loop when filling into thing with too few tads
            if (tt !== 0)
                while (frametime > nextFlowTime || all) {
                    nextFlowTime += 1000 / me.flowRate;
                    // if (T[tt].map.length >= T[tt]..max)
                    if (T[0].map.length === 0) {
                        const i = T.indexOf(T[0]);
                        if (i !== 0)
                            me.owow('something off removing from head T', T[0].role.id);
                        events.trigger('deadThing', T.splice(0, 1)[0]); // if source empty kill it off
                    }
                    else if (T[tt].map.length === T[tt].role.numtads) { // target full
                        full++;
                        //events.trigger('lastThing', T[0]);  // signal that transfers are over ??? rename
                        //break;                              // only one object left, can't do any more tranfers
                    }
                    else {
                        T[tt].map.push(T[0].map.pop()); // transfer from source to target
                        done++;
                    }
                    // if (T[tt].map.length === T[tt].role.numtads) {
                    //     break;
                    // }
                    if (T.length === 1 || full > 20) {
                        events.trigger('lastThing', T[0]); // signal that transfers are over
                        break; // only one object left, can't do any more tranfers
                    }
                    tt--;
                    if (tt === 0)
                        tt = T.length - 1;
                }
        }
        // tadpoles flowed, now make sure springs up to date
        if (done > 0) {
            me.doApply();
            events.trigger('tadFlow'); //use this for sound...
        }
        if (first)
            me.topos(); // springs.pullsToFix(TADS*RIBS);           // start using pulls
        return done;
    };
    me.flowRate = 170; // number of tads to transfer per second
    me.doApply = function () {
        springset.fill(0); // prepare the position optimization
        springs.clearTopology(0, TADS * RIBS);
        T.forEach(applyThing);
        // setprop();
        me.propTexture.needsUpdate = true;
    };
    // note: 2 Dec 2019.  All tadpole springs have strength = 1 and pow = 0 except for the attractor springs.
    me.gtranrule = /*glsl*/ `// start tadpoleTranrule
horn('_tad_s').ribs(8).radius(0.005)
.code(\`//gl
  vec4 q=(ppos(floor(_tad_h_rp * _tad_h_ribs + 0.5)/HEADS + (_tad_s_rp * 7. + 0.5)/(8. * HEADS)));
  setxyz(q);
  r *= texture2D(tadprop, vec2(_tad_s_rp, _tad_h_rp)).x;  // initial r will have been set to radius = _tad_s_radius
///gl\`);

horn('_tad_h').ribs(1023).sub('_tad_s').code('y-=springCentre.y').scale({k:1}).code('y+=springCentre.y'); mainhorn ='_tad_h';
posttranrule=pulsermult('a'); // + cut(3);
overrides = \`//gl //vary star and ribdepth per tadpole
override vec2 makestar(Parpos parpos, vec4 loposuvw) {
    return vec2(mod(hhornnum, 3.) + 3., stardepth * max(0., fract(hhornnum * 13.43) - 0.6));  // 6 out of 10 no star, stars are 3,4,5
}
override float makeribdepth(Parpos parpos, vec4 loposuvw) {
    return ribdepth * (0.3 + fract(hhornnum * 1.137));  // everything a bit ribby
}
override float makeribsraw(vec4 loposuvw) {
    return texture2D(tadprop, vec2(loposuvw.x, hhornnum/HEADS)).w;  // loposuvw.x approximates to rib as 0..1
}

// this will set the hornid according to horn number.
override void getPosNormalColid(out vec3 xmnormal, out vec4 shapepos, out float thornid, out float fullkey) {
    //#if OPMODE == OPOPOS2COL
    //    thornid = xhornid;
    //#else
        getPosNormalColid_base(xmnormal, shapepos, thornid, fullkey);
    //#endif
  if (thornid != WALLID && thornid != 0.) {
    // access individual particles
    //??vec4 oopos = texture2D(rtopos, gl_FragCoord.xy/rtSize);  // oopos is {ox, oy, hornnum, hornid*}
    //??oopos.z = (oopos.z + 0.5) / (_tad_h_ribs+1.);
    //??vec4 props = texture2D(tadprop, oopos.xz);  // props are
    float zzz = (oposHornnum + 0.5) / (_tad_h_ribs+1.);
    vec4 props = texture2D(tadprop, vec2(opos.x, zzz));
    #define COLSAFE float(${COLSAFE})
    thornid = props.y;
    if (thornid > COLNUM) thornid = mod((thornid), COLNUM-COLSAFE) + COLSAFE;  // use horn number: process to range 16..31 if it is big
  }
  colourid = thornid;
  xhornid = thornid;
}
///gl
\`
// so refreshed after new tranrule, defer, and named intermediate function to help debug
// deferred because of suspicious issues when NOT deferred (or just 1 frame)
onframe(function tranrule_tadpoleSystem_randcols() {COL.applyGui()}, 15);
// end tadpoleSystem.gtranrule
`;
    const oldbpr = VEC3(); // old bait pos
    const oldbpl = VEC3();
    const _dbp = VEC3(); // delta bait pos (working variable)
    const _obp = VEC3(); // offset bait pos from centroid (working variable)
    const _xbp = VEC3(); // cross (working variable)
    const _ccc = VEC3(); // centroid of skel object (working variable)
    me.baitSkelExtraRot = 1; //
    me.emul = {
        left: {
            sphererad: 0,
            twist: 1,
            condir: VEC3(0, 0, -1),
            baitPosition: VEC3(-0.5, -0.2, 0),
            baitWeight: 1,
            resting: true,
            left: true, right: false
        },
        right: {
            sphererad: 0,
            twist: -1,
            condir: VEC3(0, 0, -1),
            baitPosition: VEC3(0.5, -0.2, 0),
            baitWeight: 1,
            resting: true,
            right: true, left: false
        }
    };
    /* code path reminder
tracker path
monitorTracker -> emul -(*)> gp -(!)> uniforms
(*)tadpole_frame.setup (when real, doReserved() and gamepads)
(!)springframe.forgp:
    uniforms .baitPosition .condir
    me.baitWeightL, U.twist, U.excludeRadius, U.baitAttractStrength
    tad.xspring() sets up all the relevant uniforms (for js and xspring.codePrepend)
forGp uses these from gp: raymatrix, baitPosition, axesbias, pad, trigger
 */
    /** handle a single gamepad,  or emulated gamepad, or basic tracker */
    tad.forgp = function forgp(gp, bp, oldbp, /*out*/ condir, i, em) {
        function uset(e, bw) {
            // e[0], e[1] gives an idea of twist, how x axis is twisted up or down in y
            // e[10] gives idean of whether z is pointing forwards;  if not (especially if backwards) ignore
            // todo, allow > 90 degree twist to behave right
            const ang = Math.atan2(e[1], e[0]); // twist angle
            const tt = ang / Math.PI; // range 0..1
            const tta = Math.abs(tt); // abs value
            const dz = 0.1; // dead zone size
            const ttt = tta < dz ? 0 : tta - dz; // dead zone
            const tts = Math.sign(tt) * ttt * ttt; // shaped value
            const ttu = -G.twistBase * 6 * tts * Math.max(0, bw); // final value to use
            return ttu;
        }
        // get suitable radius for xsphere
        // pad left/right is puffer (+ve value)
        // trigger is attractor (-ve value)
        function xsphereRad(gp) {
            if (!gp || !gp.pad)
                return (em ? em.sphererad : 0) * tad.maxXsphereRadius; // no gp or gp resting
            const tr = gp.trigger.value;
            const ax = gp.pad.pressed ? Math.abs(gp.axesbias[0]) : 0;
            // we might use triggers to override pads
            // but sometimes triggers don't return quite to 0
            // so use test below
            return (tr > ax ? -tr : ax) * tad.maxXsphereRadius;
        }
        let baitWeight, twist;
        if (!gp)
            em.resting = true; // should be unnecessary now (11/2/20), some frame actions used to be in wrong order
        if (!em || !em.resting) {
            const e = gp.raymatrix.elements;
            // uniforms.con PositionL.value.set(e[12], e[13], e[14]);       // position of controller
            condir.set(e[8], e[9], e[10]); // z-direction
            if (gp.baitPosition)
                bp.copy(gp.baitPosition); // may not be ready first time in?
            baitWeight = Math.max(0, e[10]); // bait weight to use
            twist = uset(e, baitWeight);
        }
        else {
            condir.copy(em.condir);
            bp.copy(em.baitPosition);
            baitWeight = em.baitWeight;
            twist = em.twist * G.twistBase;
        }
        springs.setfix((TADS + i) * RIBS, bp);
        const excludeRadius = xsphereRad(gp);
        // set up attractors/bait according to if controller ok, and controller direction
        const baitAttractStrength = me.baseBaitAttractStrength * baitWeight;
        // move the pullspringmat, the imported or other pullspring form if any will follow
        const sm = uniforms.pullspringmat.value;
        const e = sm.elements;
        // work out deltas etc to twist by bait movement
        _ccc.set(e[12], e[13], e[14]); // current centre of skel object
        _dbp.subVectors(bp, oldbp);
        oldbp.copy(bp); // movement of bait
        _obp.subVectors(bp, _ccc); // offset of bait from skel object
        _xbp.crossVectors(_dbp, _obp); // cross to give twisting
        const ll = _xbp.length(); // get length
        if (ll !== 0)
            sm.premultiply(tmat4.makeRotationAxis(_xbp.multiplyScalar(1 / ll), -ll * me.baitSkelExtraRot * baitWeight));
        // rotation from twist (already allows for baitWeight)
        sm.premultiply(tmat4.makeRotationAxis(condir, -tad.skelrot * twist));
        // pull to bait and to centre
        const k = tad.skelpull * baitWeight * baitWeight; // extra baitWeight to stop extremes near edges
        const c = tad.skelcentre;
        e[12] = (c - k) * e[12] + k * bp.x;
        e[13] = (c - k) * e[13] + k * bp.y;
        e[14] = (c - k) * e[14] + k * bp.z;
        // handle bait
        if (gp && gp.pad) {
            const v = gp.axesbias[1];
            if (gp.pad.pressed && v) {
                const move = -v * tad.baitMoveRate;
                // if moving in a reduced to fit wall, move in from reduced value
                if (move < 0)
                    G.tadBaitDist *= Math.max(V.gpL ? V.gpL.reduceBaitDist : 0, V.gpR ? V.gpR.reduceBaitDist : 0);
                G.tadBaitDist = clamp(G.tadBaitDist + move, tad.baitMoveMin, tad.baitMoveMax);
            }
            else if (tad.dobaitrestore && framenum > tad.dobaitrestore) { // restore slowly to default ... could have timeout before starting restore ???
                // nb one gp may restore while other is trying to push out
                // should not be an issue as long as restore not too fast
                if (G.tadBaitDist > me.baitMoveHome)
                    G.tadBaitDist = Math.max(G.tadBaitDist - me.baitRestore, me.baitMoveHome);
                else
                    G.tadBaitDist = Math.min(G.tadBaitDist + me.baitRestore, me.baitMoveHome);
            }
        }
        return [baitWeight, twist, excludeRadius, baitAttractStrength];
    }; // forgp
    /** arrange the twist force parameters to be updated each frame
     * assumes gp and em.resting set up, will be as called from tad.frame()
     */
    me.springframe = function () {
        if (!_monitorTrackerHandle && !useKinect && me.CONTROLS >= 2) { // track the gamepads, but not if using trackers/pads or Kinect
            [me.baitWeightL, U.twist[0], U.excludeRadius[0], U.baitAttractStrength[0]] = me.forgp(V.gpL, U.baitPosition[0], oldbpl, /*out*/ U.condir[0], 0, me.emul.left);
            [me.baitWeightR, U.twist[1], U.excludeRadius[1], U.baitAttractStrength[1]] = me.forgp(V.gpR, U.baitPosition[1], oldbpr, /*out*/ U.condir[1], 1, me.emul.right);
            U.excludeForce[0] = U.excludeForce[1] = G.baseExcludeForce;
        }
        // special dynamics for trigger pressed: G.pushapartlocalforce, // for G.springmaxvel, didn't help clumping
        // if ((G.excludeRadiusL < 0 || G.excludeRadiusR < 0)) { // trigger pressed
        //     G.pushapartlocalforce = 0.2;  // 0.2 distorts objects, but helps stop attaction to point
        //     const dbpl = me.lastBaitPositionL.distanceTo(uniforms.baitPositionL.value);
        //     const dbpr = me.lastBaitPositionR.distanceTo(uniforms.baitPositionR.value);
        //     const dbp = Math.max(dbpl, dbpr) / G.stepsPerStep;
        //     G.springmaxvel = Math.max(tad.maxspringmaxvel, dbp);
        // } else {
        //     G.pushapartlocalforce = 0;  // 0.2 distorts objects, but helps stop attaction to point
        //     G.springmaxvel = tad.maxspringmaxvel;
        // }
        // msgfix('springmaxvel', G.springmaxvel);
        // me.lastBaitPositionL.copy(uniforms.baitPositionL.value);   // save old even if not
        // me.lastBaitPositionR.copy(uniforms.baitPositionR.value);
        // trigger -> 0ve exclude radius -> more pushapart
        if (!(me.docovid))
            G.pushapartlocalforce = (U.excludeRadius[0] < 0 || U.excludeRadius[1] < 0) ? 0.2 : 0; // 0.2 distorts objects, but helps stop attaction to point
        // special case G.pushapartforce for skel forms
        const lastThing = T[T.length - 1];
        const id = lastThing ? lastThing.role.id : '???';
        if (id.startsWith('tadskel_') || id.startsWith('tadps_'))
            G.pushapartforce = me.pushapartforce * (1 - lastThing.map.length / TADS);
        else
            G.pushapartforce = me.pushapartforce;
        me.reservedRads(); // to show the bait weighting
    };
    me.dobaitrestore = 990;
    me.lastBaitPositionL = VEC3();
    me.lastBaitPositionR = VEC3();
    me.baitMoveRate = 0.02;
    me.baitRestore = 0.001;
    me.baitMoveMax = 3.5; // ?? irrelevant with wall constraints ??
    me.baitMoveHome = 1.6; // ?? irrelevant with wall constraints ??
    me.baitMoveMin = 0.35;
    me.maxXsphereRadius = 0.5; // maximum exclusion radius, in m
    me.tadBeat = function () {
        const n = me.flowBlock();
        msgfix('onbeat flowed', n, framenum);
    };
    me.nonvrview = function () {
        if (me.docovid)
            return me.covidSetScene();
        if (deferRender) {
            Maestro.onUnique('firstRealRender', me.nonvrview);
            return;
        }
        if (tad.restState !== 'resting' || width !== canvas.width) {
            width = canvas.width = document.body.clientWidth;
            height = canvas.height = document.body.clientHeight;
            canvas.style.width = width / devicePixelRatio + 'px';
            canvas.style.height = height / devicePixelRatio + 'px';
            canvas.style.top = canvas.style.left = '0px';
            setViewports([0, 0]);
            tad.restState = 'resting';
        }
        G.cutx = G.cuty = 0;
        if (!useKinect) {
            G._fov = 60;
            G._camx = tad.fixpos.x;
            G._camy = tad.fixpos.y;
            G._camz = tad.fixpos.z;
            G._camqx = G._camqy = G._camqz = 0;
            G._camqw = 1;
        }
    };
    /** all tadpoles applied to last thing, in order */
    me.allOrdered = function (quick = false) {
        const map = T[0].map.raw;
        if (quick && T.length === 1 && map[0] === 0 && map[me.tadnum - 1] === me.tadnum - 1)
            return;
        // ?? 5 Mar 2022 do we need flowBlock, the apply should do the job ??
        // me.T.forEach((tt: { map: { raw: any[]; }; }) => tt.map.raw = []); // clear out other tadpole claims
        // tad.flowBlock(true);
        const oldt = T[0];
        T.splice(0, T.length - 1); // now just contains last element, which will be instantly promoted
        const t = T[0];
        let nt = t.role.numtads;
        if (nt > TADS) {
            console.error('allOrdered on role with too many tads, overflow ignored', nt, TADS);
            nt = TADS;
        }
        t.map.raw = new Array(nt).fill(0).map((_v, i) => i); // grab all the tapoles in order
        if (nt < TADS) {
            T[0] = oldt;
            T[1] = t;
            oldt.map.raw = new Array(TADS - nt).fill(0).map((_v, i) => i + nt); // extra tadpoles sent to old
        }
        me.TESTapplyProps(); // make sure props right
        me.doApply(); // make sure springs right
        me.fassigned = me.tassigned = me.snapmap = undefined; // clear out left over transistions
    };
    /** set active range for me (NOT OPTIMIZED) */
    me.setActive = function (p, v = 0.1) {
        if (p > 1)
            p = p / (tad.RIBS * tad.TADS);
        G.maxActive = p;
        const ep = Math.floor(tad.RIBS * tad.TADS * G.maxActive);
        // tad.TESTapplyProps();
        for (let p = 0; p < ep; p++)
            tad.tadprop[p * 4] = tad.tadprop[p * 4 + 2] = v;
        for (let p = ep; p < tad.RIBS * tad.TADS; p++)
            tad.tadprop[p * 4] = tad.tadprop[p * 4 + 2] = 0;
    };
    /** grow current object over time t, tad.grow() */
    me.grow = async function (t = 10000, efact = 5, delay = 0.9) {
        me.allOrdered(true);
        me.TESTapplyProps();
        const o = me.tadprop.slice();
        const st = frametime;
        for (let p = 0; p < RIBS * TADS; p++)
            me.tadprop[p * 4 + 2] = 0; // clear radii
        let ep = 0, lep = 0, lact = 0; // current and previous end particles, and last active
        while (true) {
            const l = (frametime - st) / t;
            let maxActive = Math.min(1, Math.exp(l * efact) / Math.exp(efact));
            if (G.maxActive !== lact && l !== 0) {
                log('tad.grow interrupted');
                break;
            } // somebody else has fiddled with it, leave visibility to them
            G.maxActive = lact = maxActive;
            ep = Math.floor((RIBS * TADS * maxActive) * (maxActive >= 1 ? 1 : delay));
            for (let p = lep; p < ep; p++) {
                me.tadprop[p * 4 + 2] = o[p * 4 + 2];
            }
            lep = ep;
            if (maxActive >= 1)
                break; // this break AFTER making everything visible
            await S.frame();
        }
        log('tad.grow finished');
    };
    /** grow current object over time t */
    me.growtest = async function (t = 5000) {
        me.allOrdered(true);
        me.TESTapplyProps();
        const o = me.tadprop.slice();
        for (let p = 0; p < RIBS * TADS; p++)
            me.tadprop[p * 4 + 2] = 0; // clear radii
        let step = 0;
        let ep = 0, lep = 0; // current and previous end particles
        while (true) {
            G.maxActive = Math.min(1, step++ / t);
            ep = Math.floor(RIBS * TADS * G.maxActive);
            for (let p = lep; p < ep; p++) {
                me.tadprop[p * 4 + 2] = o[p * 4 + 2];
            }
            lep = ep;
            if (G.maxActive === 1)
                break;
            await S.frame();
        }
    };
    /** reset position (NOT orientation) */
    me.setPosition = function () {
        setTimeout(() => {
            G._camx = 0;
            G._camy = 0;
            G._camz = _boxsize * 0.9;
        }, 0);
    };
    /** patch lengths dynamically */
    me.newvals = function (newval, role) {
        if (typeof newval === 'number')
            newval = { len: newval };
        role.springs.forEach(ds => Object.assign(ds, newval));
    };
    /** patch lengths dynamically, relative, spring lengths and (target) radii */
    me.rescale = function (sc, role = me.T[0].role) {
        role.springs.forEach(ds => ds.len *= sc);
        for (let i = 2; i < role.roleprops.length; i += 4)
            role.roleprops[i] *= sc;
        me.allOrdered();
    };
    // temporary debug display below
    // tad.vleft = new THREEA.Vector3();
    me.tmat = new THREEA.Matrix4();
    me.useGreyWall = G.wall_fluwidth = 0.001;
    me.greywall = (grey = me.useGreyWall) => {
        me.useGreyWall = grey;
        if (!slots)
            return;
        for (const s of slots)
            if (s) {
                const g = s.dispobj.genes;
                if (!g)
                    continue;
                if (grey !== false) {
                    g.wall_blue1 = 1; // bland walls
                    g.wall_red1 = g.wall_green1 = g.wall_blue1;
                    g.wall_red2 = g.wall_green2 = g.wall_blue2;
                    g.wall_red3 = g.wall_green3 = g.wall_blue3;
                    g.wall_iridescence1 = g.wall_iridescence2 = g.wall_iridescence3 = 0;
                    g.wall_fluorescS1 = g.wall_fluorescS2 = g.wall_fluorescS3 = 0;
                    g.wall_band1 = 99999;
                    g.wall_gloss1 = 0;
                    g.wall_bumpstrength = 0;
                    g.wall_refl1 = g.wall_refl2 = g.wall_refl3 = 0;
                    // G.wall_fluwidth = grey; // set directly
                }
                else if (g.wall_fluwidth >= 0) {
                    g.wall_fluorescS1 = g.wall_fluorescS2 = g.wall_fluorescS3 = 1;
                }
            }
    };
    me.tune = function () {
        const tad = tadpoleSystem;
        // these start ones are as used at Pompidou
        G.baitAttractDist = 0.05;
        G.baitAttractPow = -4;
        G.linebaitAttractDist = 0.05;
        G.linebaitAttractPow = -4;
        G.attractHeadMult = 1;
        G.attractMidMult = G.attractTailMult = 0.5;
        G.twistBase = 0.002; // +++WED ? 0 was 0.002, much too small
        me.baseBaitAttractStrength = 0.005;
        G.baseExcludeForce = 1;
        tad.pullTwistForBait = 0.01; // amount bait/control twists apply to pullspringmat
        me.skelrot = 1; // 5 too high, 19/2/20 Pomp Wed
        me.skelpull = 0.5; // pull force to bait
        me.skelcentre = 0.99; // damp to centre
        me.colorCyclePerMin = 0;
        me.rotx = 0;
        me.roty = 0; // was -1.0e-4;  changed 24/10/2022
        me.rotz = 0;
        // w.i.p.
        G.noisefieldforce = 0.01;
        G.noisefieldmod = 8;
        G.noisefieldscale = 1 / 1.6;
        G.noisefieldpartfac = 1.37;
        G.noisefieldtimefac = 0.3;
        G.noisefieldforce = 0.05;
        G.coreVelocityForce = 0;
        G.coreVelocityD = 0.1;
        G.coreVelocityPow = -2;
        me.transitionTimeSecs = 10; // seconds
        G.springmaxvel = 0.1; // prevents overfast transistions: maybe later limit forces instead, this is easier
        // me.defaultSpringMaxvel = G.springmaxvel;    // used for dynamic change, but doesn't help bait going too fast for clump
        if (me.docovid) { //  covtune
            /**
             * tad.emul.left.sphererad = 1.4; G.baseExcludeForce = 10  // repulse
             * tad.baseBaitAttractStrength = 0.1; tad.emul.left.baitWeight 1 // attract
             *
             */
            G.tadWrap = 0;
            G.springrate = 0.1;
            me.springforce = me.basespringforce = 0.001;
            G.pushapartpow = -2;
            tad.pushapartforce = 7e-8;
            G.pushapartlocalforce = 0; // <<<??? tocheck, muc better for trees
            G.baseExcludeForce = 1;
            G.maxXsphereRadius = 0.5;
            G.twistBase = 0.005;
            G.twistPow = -2;
            G.centrerefl = 0.9;
            //dead G.feed scale = 2.5;
            feed.fp.scale = 1 / 2.5;
            G.pullspringforce = me.pullspringforce = 0.01;
            // G.springmaxvel = 0.2;  // prevents overfast transistions: maybe later limit forces instead, this is easier
            G.springmaxvel = 1; // 7 Dec 2021, increased after tuning of me._cf
            me.defaultSpringMaxvel = G.springmaxvel; // used for dynamic change
            me.transitionPullspringforce = 0.3; // basic pullspringforce needed for transition (modified by transition speed)
            if (('roleforcesFix' in uniforms))
                U.roleforcesFix[9] = 0.00001; // tad.basespringforce    // this fixes backbones for now 8/10/21 and corrects transitionTo errors
            me.backboneRods = -0.1;
            G.backboneStrength = 10; // ?? to incorporate in backboneSpring definition?
            // for dyn baton
            me.twistRate = 1;
            me.excludeDampHalf = 1000;
            me.excludeDecelThresh = 10;
            me.excludeRadius = 0.7;
            me.twistDampHalf = 500;
            me.twistDampHalfUp = 200; // for increasing twist
            me.twistDampHalfDown = 2000; // for decreasing twist
            me.excludeSpeedThresh = 0.2;
            G.randvecscale = 0.0001;
            tad.baseBaitAttractStrength = 0.1;
            G.baitAttractDist = 0.1;
            G.baitAttractPow = -3;
            tad.baseLinebaitAttractStrength = 0.1; // used for global strength scale, NOT used with tad audio?
            G.linebaitAttractDist = 0.1;
            G.linebaitAttractPow = -3;
            // U.springCentre.copy(me.centre) in covid Set Scene
            G.springCentreDamp = 1; // 0.9999
            G.g_huepunch = 2.5;
            G.shrinkradiusA = G.shrinkradiusB = 0;
            if (me.roles.tadCovid2) {
                me.covroles();
                runkeys('K,J,1'); // plain wall etc
                // runkeys('K,V,N');                   // to covid
                // tad.topos();                     // fixed start
                // runkeys('K,M');                     // start trackers
                // runkeys('K,V,B');   // start with covid
                // don't bother with covidcol, 24 Feb 22, ... onframe(() => me.covidCol(), 50);   // start correct colours
            }
            tad.continuousActive = false; // just stick to covid
            WA.organicRoomCamera = () => { }; // prevent vivecontrol undoing some covid Set Scene work
            me.covidSetScene(); // set walls, camera, etc
            me.greywall(0); //for initial values
            onframe(() => {
                me.greywall(0);
                me.useGreyWall = false;
            }, 30);
            me.flowRate = 100000;
            G.wall_fluwidth = 0;
            tad.tailpuff = 1.5;
            uniforms.numScalePositionActive.value = HEADS; // G.numPositionActive = HEADS; // now uniform 1 Aug 2022
            me.usetrackers = true;
            tad.leedstune(); // may override some of the above
            G.ambient = 0;
            if (tadkin)
                tadkin.tadkinecttune(); // may override some of the above
        }
        me.usetrackers = true; // whether covid or not
        me.tunecuts();
    };
    me.tunecuts = function (gap = me.cutangle) {
        G.cut0_vang = 90 + gap / 2;
        G.cut0_hang = 0;
        G.cut0_off = 0;
        G.cut0_range = 0.001; // probably too sharp but cleaner for test
        G.cut0_sharp = 0.2;
        G.cut1_vang = 270 - gap / 2;
        G.cut1_hang = 0;
        G.cut1_off = 0;
        G.cut1_range = 0.001; // probably too sharp but cleaner for test
        G.cut1_sharp = 0.2;
        G.cut2_vang = 0;
        G.cut2_hang = 110;
        G.cut2_off = 1; // because of centre should vary with angle
        G.cut2_range = 0.001; // probably too sharp but cleaner for test
        G.cut2_sharp = 0.2;
        G.cut_leaveid = me.docuts ? 999 : 4;
    };
    // turn off our interactions
    me.interact = function (v) {
        me.interact.off = !v;
        if (!me.interact.save)
            me.interact.save = [me.continuousActive, G.twistBase, me.baseBaitAttractStrength, G.baseExcludeForce, me.skelpull, G.springCentreDamp, me.skelcentre];
        if (v) {
            [me.continuousActive, G.twistBase, me.baseBaitAttractStrength, G.baseExcludeForce, me.skelpull, G.springCentreDamp, me.skelcentre] = me.interact.save;
        }
        else {
            G.twistBase = 0;
            tad.baseBaitAttractStrength = 0;
            G.baseExcludeForce = 0;
            me.skelpull = 0;
            G.springCentreDamp = 1;
            me.skelcentre = 1;
            uniforms.pullspringmat.value.identity();
            G.coreAttractForce = G.coreTwistForce = G.coreChangeForce = G.coreVelocityForce = 0;
            G.noisefieldforce = 0;
        }
    };
    Object.defineProperty(me, 'isInteract', { get: () => !me.interact.off, set: v => me.interact(v) });
    Object.defineProperty(me, 'rolescale', { get: () => me.T[0] ? me.rolescales[me.T[me.T.length - 1].role.sid] : 1, set: v => {
            const role = me.T[me.T.length - 1].role;
            me.rolescales[role.sid] = v;
            me.newThing(role); // so springs are redefined
            me.topos();
        } });
    /** how far outside the walls is point x,y,x. (-ve for inside) */
    tad.outside = function (x, y, z) {
        const p = uniforms.tadWallSize.value;
        const n = uniforms.tadWallSizeN.value;
        return Math.max(x - p.x, -x - n.x, y - p.y, -y - n.y, z - p.z, -z - n.z);
    };
    /* make an array of values for controls */
    function UV(v, size = CONTROLS) {
        const r = new Array(size);
        if (typeof v !== 'object')
            return r.fill(v);
        for (let i = 0; i < size; i++)
            r[i] = v.clone();
        return r;
    }
    /** set up extra forces around controller rays */
    tad.xspring = function () {
        addgeneperm('twistBase', 0, 0, 1, 0.0001, 0.0001, 'base twist around controllers', 'tadspring', 0);
        adduniform('twist', UV(0), 'twist around left controller', 'tadspring');
        adduniform('twistD', UV(0.3), 'offset to form twist', 'tadspring');
        adduniform('condir', UV(VEC3(0, 0, -1)), 'v3', 'tadspring');
        adduniform('excludeRadius', UV(0), 'sphere exclusion zone for (negative) bait', 'tadspring');
        adduniform('excludeForce', UV(0), 'force for sphere exclusion zone', 'tadspring');
        adduniform('baitPosition', UV(VEC3(9999, 0, 0)), 'v3', 'tadspring');
        adduniform('baitAttractStrength', UV(0), 'left attract', 'tadspring');
        // do early, roles may not be established, and code may remove them anyway later ..
        addgeneperm('baitAttractDist', 0.05, 0, 0.2, 0.01, 0.01, 'length of attract "spring"', 'tadspring', 0);
        addgeneperm('baitAttractPow', -4, -6, 0, 0.1, 0.1, 'power of attract "spring"', 'tadspring', 0);
        addgeneperm('attractHeadMult', 1, 0, 1, 0.01, 0.01, 'relative attract/twist for head, bait and core', 'tadspring', 0);
        addgeneperm('attractMidMult', 0.5, 0, 1, 0.01, 0.01, 'relative attract/twist for middle, bait and core', 'tadspring', 0);
        addgeneperm('attractTailMult', 0.5, 0, 1, 0.01, 0.01, 'relative attract/twist for tail, bait and core', 'tadspring', 0);
        addgeneperm('twistPow', -2, -6, 0, 0.1, 0.1, 'power falloff of twist "spring"', 'tadspring', 0);
        addgeneperm('twistBaitProp', 0, 0, 1, 0.01, 0.01, 'prop of baitdistance to use, 1-prop is ray dist', 'tadspring', 0);
        adduniform('linebaitPosition', UV(VEC3(9999, 0, 0), LINEBAITS * 2), 'bait for line bait position, odd/even pairs', 'tadspring');
        adduniform('linebaitAttractStrength', UV(0, LINEBAITS * 2), 'strength for line bait, odd/even pairs', 'tadspring');
        addgeneperm('linebaitAttractDist', 0.05, 0, 0.2, 0.01, 0.01, 'length of attract to line', 'tadspring', 0);
        addgeneperm('linebaitAttractPow', -4, -6, 0, 0.1, 0.1, 'power of attract to line', 'tadspring', 0);
        addgeneperm('baseExcludeForce', 1e20, 0, 1e30, 1, 1, 'force for sphere exclusion zone', 'tadspring', 0);
        addgeneperm('wallStr', 1, 0, 5, 0.1, 0.1, 'wall repulsion strength', 'tadspring', 0);
        addgeneperm('camviewStr', 0, 0, 5, 0.1, 0.1, 'camera view repulsion strength', 'tadspring', 0);
        addgeneperm('camviewRange', 0.7, 0, 1, 0.01, 0.01, 'camera view range, keep somewhat inside/outside view', 'tadspring', 0);
        addgeneperm('pullSubpartForce', 0, 0, 10, 0.01, 0.01, 'force to pull to fractional position', 'tadspring', 0);
        adduniform('tadWallSize', VEC3(), 'v3', 'tadspring'); // wall size for spring repulse (+ve)
        adduniform('tadWallSizeN', VEC3(), 'v3', 'tadspring'); // wall size for spring repulse (-ve)
        adduniform('camMat', new THREE.Matrix4(), 'm4', 'tadspring');
        adduniform('roomSize', VEC3(), 'v3', 'tadspring'); // room size for lookup of image
        adduniform('currentRtopos', undefined, 'tex3', 'tadspring'); // current image
        adduniform('coreImageDiffBoost', 1, 'f', 'tadspring'); // boost for core points not in current image
        adduniform('coreImageDiffThresh', 2.5, 'f', 'tadspring'); // threshold (xhornid scale) for core points not in current image
        tad.newmat();
    };
    tad.newmat = function () {
        // note: baitPosition computed from controller position in
        const codePrepend = /*glsl*/ `
            #if ${CONTROLS} > 0
                uniform float excludeForce[${CONTROLS}];
                uniform float twist[${CONTROLS}], twistD[${CONTROLS}], excludeRadius[${CONTROLS}];
                uniform vec3 condir[${CONTROLS}]; // con PositionL,
                uniform float baitAttractStrength[${CONTROLS}]; // tadAttractorsR;
                uniform vec3 baitPosition[${CONTROLS}];
            #endif
            uniform float twistPow;
            uniform float LRIBS;
            uniform float wallStr, camviewStr, camviewRange; uniform vec3 tadWallSize, tadWallSizeN;
            uniform float pullSubpartForce;
            uniform mat4 camMat;

            uniform float baitAttractDist, baitAttractPow, twistBaitProp, attractHeadMult, attractMidMult, attractTailMult;

            #if ${LINEBAITS} > 0
                uniform float linebaitAttractStrength[${LINEBAITS * 2}];
                uniform vec3 linebaitPosition[${LINEBAITS * 2}];
            #endif
            uniform float linebaitAttractDist, linebaitAttractPow;
            uniform float tadWrap;

            // shared variables set in customForce
            float partn;        // partn ranges from 0.5..VnumInstancesP2-0.5
            float ribnum;       // rib number, 0..7
            float headTailMidMult;    // multiplier for force to attract heads/body/tails

            /** twist forces.
             * mypos, my position,
             * condir: ray direction to twist about
             * twistf: twist force
             * twistD: twist 'diameter'
             * frombait: vector from me to bait (or bait to me?)
             *  */
            vec3 twistForce(vec3 mypos, vec3 condir, float twistf, float twistD, vec3 frombait) {
                if (twistf == 0.) return vec3(0);
                // note: frombait or from controller same for this cross, as bait and controller both on ray
                vec3 twistx = cross(frombait, condir);  // cross with ray dir gives ...
                float dray = length(twistx);               // distance of me from ray
                float dbait = length(frombait);            // distance of me from bait
                float d = mix(dbait, dray, twistBaitProp);  // mix distance
                if (d < 1e-19) return vec3(0);
                vec3 forcedir = twistx;               // direction and strength for twist force
                float btforce = twistf * pow(twistD + d, twistPow);   // shape force by distance
                return btforce * forcedir;            // compute complete twist force
            }

            // sphere exclusion
            vec3 excludeForceF(vec3 frombait, float excludeRadius, float xradforce) {
                // sphere exclusion zones, or attract for -ve excludeRadius (all tads)
                float dd = length(frombait);
                if (dd >= abs(excludeRadius)) return vec3(0);
                // float ddd = abs(excludeRadius) - dd;
                // return ddd*ddd*ddd * xradforce * frombait;
                float ddd = excludeRadius - dd;
                return max(-1e10, ddd*ddd*ddd * xradforce) * frombait;
                // tforce += clamp(ddd*ddd*ddd * xradforce, -1e10, 1e10) * frombait;

                //???? change here for Pomp
            }

            // attraction (repluse) forces to bait (controller and ray)
            // twisting force around single controller ray, also attract/repulse to ray
            vec3 baitForce(vec3 mypos, vec3 condir, float twistf, float twistD, float att, float excludeRadius, float xradforce, vec3 baitpos) {
                // perform at layer above if (baitpos.x >= 999.) return vec3(0);
                vec3 frombait = mypos - baitpos;
                // vec3 fromcon = mypos - co nPosition;         // direction from controller to me
                vec3 tforce;
                tforce = twistForce(mypos, condir, twistf, twistD, frombait);

                // attract ... like spring attract but simpler
                // no backbone, springlen, springpow, spring force, roleforce, boost, powBaseDist, minactive, maxactive ...???
                float len = length(frombait);               // length of this spring
                float ddist = len - baitAttractDist;            // difference from target length (may be +ve or -ve)
                // -1 on pow below as frombait/len is direction of force
                // min below is not just for extreme cases, it applies a huge amount of the time
                // to consider if it really should be like that
                // ??? dodo, len range where force is flat, should help two close attractors behave like line, min does something like that?

                // the min value was 1 at Pompidou, we had a brief experiment with 1000
                // min(1. ... is equivalent to baitAttractDist=1 below
                // tforce -= frombait * (att * ddist * min(1., pow(len, baitAttractPow - 1.)));

                // version after saving graphs for dance 8 Sept 2021
                // https://www.desmos.com/calculator/ruvuvcz8uv
                //???? NOT for pomp
                tforce -= frombait * att * ddist * pow(max(len, baitAttractDist), baitAttractPow - 1.);

                tforce *= headTailMidMult;
                // if (floor(mod(partn, LRIBS)) != 0.) tforce *= attractMidMult;  // twist and attract stronger by head, modulated for tail

                // repulse from walls moved from here, do it just once, not once per controller

                // sphere exclusion zones, or attract for -ve excludeRadius (all tads, head/tail equally)
                tforce += excludeForceF(frombait, excludeRadius, xradforce);
                return tforce;

                // return aforce + tforce;
            }

            const float subpartpos = (SPRINGS + 3.5) / MAX_DEFS_PER_PARTICLE;
            vec3 poso(float o);

            /* pull to a 'sub' particle (between two partices) */
            vec3 pullSubpart(vec3 mypos, float part) {
                vec4 spr = texture2D(topologybuff, vec2(subpartpos, part));
                float targ = spr.x;
                if (targ == NOSPRING) return vec3(0);
                float targni = floor(targ);
                float x = fract(targ);
                float targn = targni * INVPARTICLESP2;

                float s0 = targn - INVPARTICLESP2;
                float s1 = targn;
                float s2 = targn + INVPARTICLESP2;
                float s3 = targn + 2. * INVPARTICLESP2;

                float whereInTad = mod(targni, LRIBS);
                vec3 p0 = poso(s0);
                vec3 p1 = poso(s1);
                vec3 p2 = poso(s2);
                vec3 p3 = poso(s3);
                // below to match hornmaker
                if (whereInTad == 0.) p0 = 3.*(p1 - p2) + p3;
                if (whereInTad == 7.) p3 = 3.*(p2 - p1) + p0;

                vec3 a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
                vec3 b =  1.0 * p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
                vec3 c = -0.5 * p0            + 0.5 * p2           ;
                vec3 d =                   p1                      ;
                vec3 aa = a*x*x*x + b*x*x + c*x + d;

                // below modified from springsfs, pull()
                vec3 otherpos = aa;             // others 'current' (previous) position
                float lspringlen = spr.y * springlen;
                float lspringforce = spr.z * pullSubpartForce;
                float lspringpow = spr.w + springpow;

                vec3 dir = otherpos - mypos;                   // direction from mypos to other
                float len = length(dir);                    // length of spring
                if (len == 0.) return vec3(0.,0.,0.);       // no reliable direction
                float sforce = (len - lspringlen) * lspringforce * min(1000., pow(len/powBaseDist, lspringpow));
            //    sforce *= pow(abs(len - lspringlen), springdiffpow);
            //    if (spr.z == 0.) sforce *= pow(abs(len - lspringlen), springzeropow);
            //    sforce *= (backbonedist < INVPARTICLESP2 * 1.1) ? backboneStrength : 1.;

                float k = min(sforce / len, 0.5 / springrate);   // prevent overshoot, 0.5 in case the other end is shooting our way too

                return dir * k;                                 // dir/len is normalized direction
            }

            float nearpointOnLine(vec3 p, vec3 l1, vec3 l2, out vec3 nearp);  // forward ref
            /** compute force for line baits */
            vec3 linebaitForces(vec3 pos) {
                vec3 v = vec3(0);
                // return v; // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< there are bugs in the logic below, disable for now
                #if ${LINEBAITS} > 0
                    if (ribnum != 0.) return v;   // head only force
                    for (int i = 0; i < ${2 * LINEBAITS}; i += 2) {
                        vec3 v1 = linebaitPosition[i], v2 = linebaitPosition[i+1];
                        if (v1.x >= 999.) continue;      // used to prevent this slot working as a lineBait
                        float s1 = linebaitAttractStrength[i], s2 = linebaitAttractStrength[i+1];

                        // nearpointOnLine(vec3 p, vec3 l1, vec3 l2, out vec3 nearp)
                        vec3 nearp;
                        float t = nearpointOnLine(pos, v1, v2, nearp);
                        vec3 frombait = pos - nearp;
                        float len = length(frombait);
                        float ddist = len - linebaitAttractDist;            // difference from target length (may be +ve or -ve)
                        float att = mix(s1, s2, t);                         // set up right can allow scuttle from end to end ...

                        v -= frombait * att * ddist * pow(max(len, linebaitAttractDist), linebaitAttractPow - 1.);
                        int i2 = i/2; // The arrays below are shared with point bait code;
                        // We don't have ability to set them differently for two ends of a line and interpolate.
                        v += excludeForceF(frombait, excludeRadius[i2], excludeForce[i2]);
                        v += twistForce(pos, condir[i2], twist[i2], twistD[i2], frombait);
                    }
                #endif
                return v;
            }

            ${tadkin ? tadkin.corePrepend() : '\n// NO tadkin\n'}
            `;
        const codeOverrides = /*glsl*/ `override vec3 customForce(vec3 mypos) {     // combination of the two twist forces, old is 'start' position
            // set globals shared bewteen tadpole.tadkin extra features
            partn = part * VnumInstancesP2;  // partn ranges from 0.5..VnumInstancesP2-0.5
            ribnum = floor(mod(partn, LRIBS));
            headTailMidMult = ribnum == 0. ? attractHeadMult : ribnum == 7. ? attractTailMult : attractMidMult;
            vec3 v = vec3(0);
            #if ${CONTROLS} > 0
                for (int i = 0; i < ${CONTROLS}; i++) {
                    if (baitPosition[i].x >= 999.) continue;  // prevent this slot working as a point bait
                    v += baitForce(mypos, condir[i], twist[i], twistD[i], baitAttractStrength[i], excludeRadius[i], excludeForce[i], baitPosition[i]);
                }
            #endif

            v += linebaitForces(mypos);

            v += (vec4(mypos,1) * springRotate).xyz - mypos;  // continuous rotation by force

            // repulse from walls;
            // ??? by heads only for better 'bounce' ?
            // but by all for better imported form squashed on wall
            if (wallStr != 0.) {
                float d;
                d = mypos.x - tadWallSize.x; if (d > 0.) v.x += -wallStr*d;
                d = mypos.y - tadWallSize.y; if (d > 0.) v.y += -wallStr*d;
                d = mypos.z - tadWallSize.z; if (d > 0.) v.z += -wallStr*d;
                d = -mypos.x - tadWallSizeN.x; if (d > 0.) v.x += wallStr*d;
                d = -mypos.y - tadWallSizeN.y; if (d > 0.) v.y += wallStr*d;
                d = -mypos.z - tadWallSizeN.z; if (d > 0.) v.z += wallStr*d;
            }
            if (camviewStr != 0.) {
                float d = camviewRange; // for debug so we can see what is happening, will probably be 1 in the end
                vec4 mptr = camMat * vec4(mypos, 1.);
                mptr /= mptr.w;
                if (mptr.x > d) v.x += camviewStr * (mptr.x-d);
                if (mptr.x < -d) v.x += camviewStr * (mptr.x+d);
                if (mptr.y > d) v.y -= camviewStr * (mptr.y-d);
                if (mptr.y < -d) v.y -= camviewStr * (mptr.y+d);
                //????? TODO find why this isn't working right and re-enable it
                //??if (mptr.z > d) v.z -= camviewStr * (mptr.z-d);
                //??if (mptr.z < -d) v.z -= camviewStr * (mptr.z+d);

            }

            ${tadkin ? tadkin.coreOverride() : '\n//NO tadkin\n'}

            if (pullSubpartForce != 0.)
                v += pullSubpart(mypos, part);

            // return l+r;
            return v;
        }

        override vec3 finalFixPos(vec3 v) {
            if (tadWrap != 0.) {
                #define RIBS float(${RIBS})
                // keep the tadpole intact, wrap all parts together
                float hk = floor(partn / RIBS) * RIBS;      // index for head
                float hpart = (hk + 0.5) / VnumInstancesP2;  // part for head
                vec4 hpos = poso4(hpart);               // head position
                if (hpos.x < -tadWallSizeN.x) v.x += tadWallSizeN.x + tadWallSize.x;
                if (hpos.x > tadWallSize.x) v.x -= tadWallSizeN.x + tadWallSize.x;
                if (hpos.y < -tadWallSizeN.y) v.y += tadWallSizeN.y + tadWallSize.y;
                if (hpos.y > tadWallSize.y) v.y -= tadWallSizeN.y + tadWallSize.y;
                if (hpos.z < -tadWallSizeN.z) v.z += tadWallSizeN.z + tadWallSize.z;
                if (hpos.z > tadWallSize.z) v.z -= tadWallSizeN.z + tadWallSize.z;
            }
            return v;
        }

        `;
        springs.setOverrides(codeOverrides, codePrepend);
    };
    //     WA.specialShader = function(opname) {  // specialShader disabled, did not have pulse
    //         if (opname !== 'makeskelbuff') return [undefined, undefined];
    //     me.skelvert = /*glsl*/`
    // // custom shader to take spring positions and tadprop radius and build skelbuffer
    // uniform vec2 skelbufferRes;  // eg 8, 2048
    // uniform highp sampler2D posNewvals;
    // uniform float _tad_s_radius;
    // uniform float RIBS;
    // uniform highp sampler2D tadprop;
    // uniform mat4 rot44d;
    // out vec4 objpos;
    // void main()
    // {
    //     int hnum = gl_InstanceID; // 0..1199
    //     int pnum = gl_VertexID;   // 0..7
    //     int tnum = hnum*int(RIBS) + pnum;
    //     vec4 pos = texelFetch(posNewvals, ivec2(0, tnum), 0);
    //     pos.w = 1.;
    //     pos *= rot44d;
    //     float r = _tad_s_radius * texelFetch(tadprop, ivec2(pnum, hnum), 0).x;
    //     objpos = vec4(pos.xyz, r);
    //     gl_PointSize = 1.0;
    //     gl_Position = vec4( (vec2(pnum, hnum) + 0.5) / skelbufferRes * 2. - 1., 0., 1.);
    // }
    // `
    //     me.skelfrag = /*glsl*/`
    // precision highp float;
    // out vec4 glFragColor;
    // in vec4 objpos;
    // void main() {
    //     glFragColor = objpos;
    // }
    // `
    //     return [me.skelvert, me.skelfrag];
    //     }
    /**
     * V.gpL.baitPosition: vec3 (same as raymatrix)
     * V.gpL.poseMatrix matrix (same as raymatrix?)
     * raymatrix: matrix
     * meshray: Line
     * V.gpL.threeObject.matrix (almost same as raymatrix)
     *
     */
    /**
    xrsess = renderer. vr.getSession();
    xrsess.onend = ()=> log('end')
    xrsess.onselect = ()=> log('select')
    xrsess.onselectend = ()=> log('onselectend')
    xrsess.onselectstart = ()=> log('onselectstart')
    xrsess.onvisibilitychange = ()=> log('onvisibilitychange')
    xrsess.oninputsourceschange = ()=> log('oninputsourceschange')
    **/
    // tad.loadskel = async function(fid: { name: any; }, data) {
    tad.loadskel = async function (data, path) {
        if (TADS === -1) { // load when no tadpole system
            const j = JSON.parse(data);
            copyFrom(currentGenes, j.genes);
            COL.array.set(j.colarray);
            COL.col2genes();
            inps.savename = currentGenes.name = path.replaceall('\\', '/').split('/').pop().trim();
            return;
        }
        if (data.hornnum !== tad.TADS) { // make excessa tadpoles as unobtrusive as possible
            tad.newThing(await me.tadrand());
            tad.topos();
        }
        const role = await tad.tadskel({ fid: path, data });
        tad.newThing(role);
        tad.allOrdered();
        tad.topos({ role });
        return endTime(role);
    };
    tad.localStorageSkel = async function () {
        const role = await tad.loadskel(JSON.parse(localStorage.skelj), '!localStorage');
        // AFTER loading role, to make tad.coltexscale() work correctly
        // now more integrated
        //const coldata = localStorage.colarray.split(',');
        //tad.colload(coldata, '!localStorage')
    };
    // tad.loadskel.rawhandler = true;
    WA.fileTypeHandlers['.skelj'] = tad.loadskel;
    // kill if v held for 5 secs
    tad.killdown = async function killdown() {
        if (!exhibitionMode)
            return;
        log('tad.killdown');
        nomess('release');
        W.msgbox.style.display = "";
        msgboxVisible(true);
        // let noshut = false;
        // if (!exhibitionMode) {
        //     for (let i = 5; i > 0; i--) {
        //         log('tad.killdown', i)
        //         msgfix('!<h1>SHUTDOWN', 'hit key to stop', i, '</h1>');
        //         const xx = S.interact().then(()=>noshut = true);
        //         const tt = sleep(1000);
        //         await Promise.race([xx,tt]);
        //         msgfix();
        //         if (noshut) {tad.tad =
        //             msgfix('!<h1>SHUTDOWN', 'interrupted', i, '</h1>')
        //             return;
        //         }
        //     }
        // }
        const st = frametime;
        msgfix('!<h1>SHUTDOWN', 'HOLD V KEY FOR 5 SECONDS TO SHUTDOWN</h1>');
        msgfix();
        while (frametime < st + 5000) {
            if (keysdown.toString() !== 'V') {
                msgfix('!<h1>SHUTDOWN', 'interrupted, V key released</h1>');
                return;
            }
            await sleep(1);
        }
        msgfix('!<h1>SHUTDOWN', 'happening</h1>');
        ipcSend({ address: '/oa/shutdown' });
    };
    //GUIKey('ArrowLeft,ArrowDown,ArrowRight', '', 'kill logoff', ()=>{
    //    msgfix('KILL', 'KILL');
    //    //killdown();
    //});
    me.saves = {};
    /** save enough to recreate main graphics, NOT fully to restore state for now */
    me.save = function (name) {
        // todo: time for colour shift and bulge
        const position = readWebGlFloatDirect(springs.posNewvals);
        const tadprop = me.tadprop.slice(0);
        const r = { position, tadprop, time: G.time };
        me.saves[name || '$last'] = r;
        return r;
    };
    me.restore = function (pv = '$last') {
        let v = (typeof pv === 'string') ? me.saves[pv] : pv;
        springs.setpos(v.position);
        me.tadprop.set(v.tadprop);
        G._fixtime = v.time;
        springs.stop();
    };
    /* go to positions for role with offset, if pull is specified set up pull springs */
    me.topos = function ({ role = undefined, offset = me.centre, pull = false, notran = false, mat = uniforms.pullspringmat.value, restore = true } = {}) {
        if (!role) {
            me.allOrdered(true); // order if we are initialising, but not for jumping
            role = me.T[me.T.length - 1].role; // do not check till after allOrdered, which may have changed last T[...]
            // there will generally be a single item in T by now, but if the last had <TADS tadpoles there will be more
        }
        if (G.pullspringforce === 0)
            mat = new THREE.Matrix4(); // do not destroy incoming mat just in case
        if (notran)
            mat.identity(); //
        if (restore)
            me.restoreOrientation();
        const data = role.details.data;
        if (data) { // ???} && role.fid && !role.isSkeleton) {
            const sc = me.rolescales[role.sid] * (role.details.autoscale || 1);
            const o = new THREE.Vector3();
            const op = pull ? springs.addpull : springs.setfix;
            const uselen = Math.min(data.length, TADS * RIBS);
            for (let i = 0; i < uselen; i++)
                op(i, o.copy(data[i]).multiplyScalar(sc).applyMatrix4(mat).add(offset));
            if (!pull)
                springs.finishFix(TADS * RIBS);
        }
        else {
            springs.pullsToFix(TADS * RIBS, true, mat);
        }
        tad.tadrad = 1;
        G.springlen = 1;
    };
    me.captureOrientation = function ({ save = true } = {}) {
        const fid = 'data/' + me.T[0].role.sid + '.orient';
        const s = G._uScale;
        U.pullspringmat.premultiply(tmat4.set(...G._rot4_ele)).premultiply(tmat4.makeScale(s, s, s));
        springs.applyTransform({ num: TADS * RIBS });
        G._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        tad.tadrad *= s;
        tad.smoothrad(0); // apply change instantly
        G.springlen *= s;
        G._uScale = 1;
        if (tad.capturetopos)
            tad.topos({ restore: false });
        const str = JSON.stringify(U.pullspringmat);
        if (save)
            writetextremote(fid, JSON.stringify(U.pullspringmat));
        return str;
    };
    me.restoreOrientation = function (str) {
        const fid = 'data/' + me.T[0].role.sid + '.orient';
        if (!str) {
            str = readtext(fid, true);
        }
        if (str) {
            U.pullspringmat.copy(JSON.parse(str));
        }
        else {
            console.log('no orientation file', fid);
            U.pullspringmat.identity();
        }
        me.topos({ restore: false });
        resetMat('all');
        G._uScale = 1;
    };
    /** clear pull springs */
    me.clearpull = function () {
        for (let i = 0; i < RIBS * TADS; i++)
            springs.removepull(i);
    };
    let _monitorTrackersTests = 0, _monitorTrackerHandle, _monitorTrackerOrigin, _realTrackerGPS = []; // tracker in order from openVR
    me._lastTrackerParse = undefined;
    me._lastTrackedTime = 0;
    me._lastTrackedDelta = 0;
    let _oldbp = new THREE.Vector3();
    me._trackerRotmat = new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1);
    me.trackerOffsetHand = new THREE.Vector3(0, -0.08, -0.12); // these offsets only use for oldDancerX, and not correct for the later straps
    me.trackerOffsetElbow = new THREE.Vector3(0, -0.08, 0.25);
    me.trackerOffsetFoot = new THREE.Vector3(0, -0.08, -0.12);
    me.trackerOffsetKnee = new THREE.Vector3(0, -0.08, 0.20); // measure about 0.36
    me.trackerScaling = 1; // ? correct later by 'k' scale in model itself ??
    me._trackerUse; // order of trackers
    me._trackerNum = 0; // current number of trackers
    me._monitorTrackerGPS = []; // only use me.
    me._realTrackerGPS = _realTrackerGPS; // help debug
    let ETrackingResult;
    (function (ETrackingResult) {
        ETrackingResult[ETrackingResult["TrackingResult_Uninitialized"] = 1] = "TrackingResult_Uninitialized";
        ETrackingResult[ETrackingResult["TrackingResult_Calibrating_InProgress"] = 100] = "TrackingResult_Calibrating_InProgress";
        ETrackingResult[ETrackingResult["TrackingResult_Calibrating_OutOfRange"] = 101] = "TrackingResult_Calibrating_OutOfRange";
        ETrackingResult[ETrackingResult["TrackingResult_Running_OK"] = 200] = "TrackingResult_Running_OK";
        ETrackingResult[ETrackingResult["TrackingResult_Running_OutOfRange"] = 201] = "TrackingResult_Running_OutOfRange";
        ETrackingResult[ETrackingResult["TrackingResult_Fallback_RotationOnly"] = 300] = "TrackingResult_Fallback_RotationOnly";
    })(ETrackingResult || (ETrackingResult = {}));
    me.makegp = function (ri) {
        const gp = {
            raymatrix: new THREE.Matrix4(),
            rawPos: new THREE.Vector3(),
            baitPosition: new THREE.Vector3(),
            oldBaitPosition: new THREE.Vector3(),
            jointPosition: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            oldVelocity: new THREE.Vector3(),
            twistCross: new THREE.Vector3(),
            twistCrossDamp: new THREE.Vector3(),
            // oldRadius: 0,
            oldExcludeForce: 0,
            realIndex: ri,
            okFrames: 0,
            missedFrames: 0,
            closeDistance: Infinity // distance to closest other tracker
        };
        me._monitorTrackerGPS.push(gp);
        return gp;
    };
    /** handle each incoming tracker message, pp is the parsed version
     * This effectively runs in two modes.
     * If _trackerUse is set it only works on the real trackers identified by trackerUse.
     * If a used tracker is not seen, its effect since when last seen will not be replaced;
     * this should work appropriately for short term loss of tracker visibility.
     *   _monitorTrackerGPS should have 4 elements per dancer, left hand, right hand, left foot, right foot.
     * If _trackerUse is not set, it looks at all elements, and saves all appropriate (tracker/controller) ones
     */
    function monitorTrackersMessage(pp = me._lastTrackerParse) {
        if (kinect.handleSkeleton)
            return; // don't use skeleton AND trackers for now, 27 Oct 2021
        const now = performance.now();
        me._lastTrackedDelta = me._lastTrackedTime - now;
        if (me._lastTrackedDelta > 50)
            me._lastTrackedDelta = 0;
        me._lastTrackedTime = now;
        const ppa = pp;
        if (ppa.attempts) {
            msgfix('headset', 'error', ppa.attempts, ppa.error);
        }
        else if (pp[0] && pp[0].deviceToAbsoluteTracking) {
            const t = pp[0].deviceToAbsoluteTracking;
            msgfix('headset', 'at', t[0][3], t[1][3], t[2][3]);
        }
        else {
            msgfix('headset', 'not seen');
        }
        me._lastTrackerParse = pp; // .filter(tr => tr && [2,3].includes(tr.trackedDeviceClass));
        // if (me._trackerUse) pp = me._trackerUse.map(ri => pp[ri]);
        me._trackerNum = 0;
        // let uix = 0;     // user index if no _trackerUse
        for (let ri = 0; ri < 20; ri++) { // ri is 'real' index from openvr, 20 slightly arbitrary number in case tracker with high ri turned off
            // convert openVR data to our tracker/gp format (raymatrix and baitposition, centred)
            if (me._trackerUse && me._trackerUse[ri] === undefined)
                continue; // unused real index; only for dancer/baton
            const tr = pp[ri];
            let gp = _realTrackerGPS[ri];
            if (gp && !tr) {
                gp.missedFrames++;
                gp.okFrames = 0;
                continue;
            } // known device but not present this frame
            if (!(tr && [2, 3].includes(tr.trackedDeviceClass)))
                continue;
            if (me._trackerUse && !me._trackerUse[ri])
                continue; // found a tracker that is not actually being used (dancer/baton)
            if (!gp)
                gp = me.makegp(ri);
            _realTrackerGPS[ri] = gp;
            gp.missedFrames = 0;
            gp.okFrames++;
            gp.opvrIndex = ri;
            me._trackerNum++;
            const a = tr.deviceToAbsoluteTracking;
            gp.rawPos.set(a[0][3], a[1][3], a[2][3]);
            gp.oldVelocity.copy(gp.velocity);
            gp.velocity.fromArray(tr.velocity);
            gp.oldBaitPosition.copy(gp.baitPosition);
            const bp = gp.baitPosition, jp = gp.jointPosition;
            if (me.oldDancerX && me.dancerX) { // work out details for dancer
                if (!_monitorTrackerOrigin)
                    _monitorTrackerOrigin = new THREE.Vector3().copy(bp);
                bp.subVectors(gp.rawPos, _monitorTrackerOrigin);
            }
            else { // assume the seated position has been set
                bp.copy(gp.rawPos);
            }
            jp.copy(bp);
            // _oldbp.copy(gp.baitPosition);
            const e = gp.raymatrix.elements;
            e.splice(0, 12, ...a.flat());
            if (tr.trackedDeviceClass === 3) { // fix orientation of tracker, looks more like controller
                gp.raymatrix.premultiply(tad._trackerRotmat);
            }
            // derive forward offset positions for 'definitive' bait and backwards for joint
            for (const xp of [bp, jp]) {
                if (me.dancerX && me.oldDancerX) {
                    const o = xp === bp ?
                        ((ri % 4 < 2) ? me.trackerOffsetHand : me.trackerOffsetFoot) : // fix offset of tracker, for now treat controller/tracker same
                        ((ri % 4 < 2) ? me.trackerOffsetElbow : me.trackerOffsetKnee);
                    xp.x += o.x * e[0] + o.y * e[1] + o.z * e[2];
                    xp.y += o.x * e[4] + o.y * e[5] + o.z * e[6];
                    xp.z += o.x * e[8] + o.y * e[9] + o.z * e[10];
                }
                xp.multiplyScalar(me.trackerScaling); // fix scaling of tracker
            }
            e[3] = bp.x;
            e[7] = bp.y;
            e[11] = bp.z; // make sure compensated baitPostition applied in matrix form
        }
        me.useTrackers();
        // clear the ones beyond range
        U.twist.fill(0, me._trackerNum);
        U.baitAttractStrength.fill(0, me._trackerNum);
        U.excludeRadius.fill(0, me._trackerNum);
        if (me.useGlyph)
            me.glyph();
    }
    me.batondata = [];
    me.angthresh = 20;
    me.imode = 'dyn';
    /** clear the display of all controls */
    me.clearControlDisplay = function () {
        for (let i = 0; i < me.CONTROLS; i++) // clear all
            me.displayControl(i, 'hide');
        // springs.setfix( (me.TADS + i) * me.RIBS, 9 9,9 9,9 9);
    };
    /** display a control in orb or tad style at given position */
    me.displayControl = function (ui, opts) {
        me.displayTad(ui + TADS, opts);
    };
    me.tailcol = 31; // colour number for tail
    me.taillen = 0; // > 7 means  no tail
    // set the tail colours for ALL tadpoles
    me.setTailLen = function (len = me.taillen, tcol = me.tailcol) {
        me.taillen = len = clamp(len, 0, RIBS - 1);
        me.tailcol = tcol;
        const start = RIBS - len;
        for (let t = 0; t < 1200; t++) { // t is tadpole
            const c = me.getCols(t * RIBS);
            for (let i = 1; i < start; i++) {
                if (me.getCols(t * RIBS + i) === tcol)
                    me.setCols(t * RIBS + i, c);
            }
            for (let i = start; i < RIBS; i++) {
                me.setCols(t * RIBS + i, tcol);
            }
        }
    };
    /** display a tadpole in orb or tad style at given position,
     * can also set up with pull springs (NOT RELIABLE, 24/11/2021)
     * pull false/0 for fix, nonzero for strength of pull
     * If wavy is false a fixed linear
     * Otherwise just the ends are fixed and backbone springs added
     * wavy=1 and backbone springs should be matching length, otherwise expanded/reduced

     */
    me.displayTad = function (ti, opts) {
        if (ti >= TADS + CONTROLS)
            return; // quietly ignore tads out of range
        if (!opts) {
            if (U.baitPosition[ti])
                ({ x, y, z } = U.baitPosition[ti]);
        }
        else if (opts === 'hide') {
            x = y = z = 999;
            rad = 0;
        }
        else {
            var { orb = false, wavy = false, str = 25000, x, y, z, pull = false, pullend = pull, rad, ribs, shape = tadkin.shape, col, colends, dx = 0, dy = 0, dz = 0.0001 } = opts;
        }
        springs.removeAllSprings(ti * RIBS, RIBS);
        const fix = (i, x, y, z, pull) => (pull ? springs.addpull : springs.setfix)(i, x, y, z, pull);
        fix(ti * RIBS, x, y, z, pull); // for tad display of bait position
        const f = orb ? fix : springs.removefix;
        if (wavy !== false && wavy >= 0) { // wavy could well be tadkin.wavyhair, just
            const ei = RIBS - 1;
            f(ti * RIBS + ei, x + dx * ei, y + dy * ei, z + dz * ei, pullend);
            let len = Math.sqrt(dx * dx + dy * dy + dz * dz) * +wavy; // let to allow experiment
            for (let i = 1; i < RIBS; i++) {
                springs.addspring(ti * RIBS + i, ti * RIBS + i - 1, len, str); // str may be tadkin.hairstr
            }
        }
        else {
            for (let i = 1; i < RIBS; i++)
                f(ti * RIBS + i, x + dx * i, y + dy * i, z + dz * i, pull);
        }
        if (typeof rad === 'number') {
            if (shape) {
                for (let i = 0; i < RIBS; i++)
                    me.tadprop[(ti * RIBS + i) * 4] = me.tadprop[(ti * RIBS + i) * 4 + 2] = rad * shape[i];
            }
            else {
                for (let i = 0; i < RIBS; i++)
                    me.tadprop[(ti * RIBS + i) * 4] = me.tadprop[(ti * RIBS + i) * 4 + 2] = rad;
            }
        }
        else if (Array.isArray(rad)) {
            const r0 = rad[0], dr = (rad[1] - rad[0]) / (RIBS - 1);
            for (let i = 0; i < RIBS; i++)
                me.tadprop[(ti * RIBS + i) * 4] = me.tadprop[(ti * RIBS + i) * 4 + 2] = r0 + i * dr;
        }
        if (col === '=') {
            col = me.tadprop[(ti * RIBS) * 4 + 1];
            // for (let i=0; i<RIBS; i++)   // will be done in next case
            //     me.tadprop[(ti*RIBS + i)*4 + 1] = col;
        }
        const tailst = RIBS - clamp(me.taillen, 0, RIBS - 1);
        if (typeof col === 'number') {
            for (let i = 0; i < tailst; i++)
                me.tadprop[(ti * RIBS + i) * 4 + 1] = col;
        }
        // // should be set by setTailCol in advance
        // if (typeof colends === 'number') {          // waste if col and colends set
        //     for (let i = tailst; i<RIBS; i++)
        //         me.tadprop[(ti*RIBS + i)*4 + 1] = colends;
        // }
        if (typeof ribs === 'number') {
            for (let i = 0; i < RIBS; i++) {
                me.tadprop[(ti * RIBS + i) * 4 + 3] = ribs; // * (dx*dx+dy*dy+dz*dz)**0.5;
            }
        }
    };
    /** use the captured trackers in _monitorTrackerGPS to create effects  */
    me.useTrackers = function () {
        U.twist.fill(0);
        U.baitAttractStrength.fill(0);
        U.excludeRadius.fill(0);
        U.excludeForce.fill(0);
        U.linebaitAttractStrength.fill(0);
        me.clearControlDisplay();
        if (!me.usetrackers)
            return;
        for (let ui = 0; ui < this._monitorTrackerGPS.length; ui++) {
            const gp = me._monitorTrackerGPS[ui];
            gp.closeDistance = Infinity;
            if (gp.okFrames < 3)
                continue;
            for (let ui2 = 0; ui2 < me._monitorTrackerGPS.length; ui2++) {
                const gp2 = me._monitorTrackerGPS[ui2];
                if (gp2.okFrames < 3 || gp === gp2)
                    continue;
                gp.closeDistance = Math.min(gp.closeDistance, gp.baitPosition.distanceTo(gp2.baitPosition));
            }
        }
        if (me.dancerX) {
            for (let ui = 0; ui < me._monitorTrackerGPS.length; ui++) {
                const gp = me._monitorTrackerGPS[ui];
                const bp = gp.baitPosition;
                U.baitPosition[ui].copy(bp);
                U.twist[ui] = 0;
                const e = gp.raymatrix.elements;
                // >>> TODO simplify below when confirmed
                if (me.oldDancerX) {
                    let ed = ui % 4 >= 2 ? -1 : e[6]; // const, let for debug. feet always repel
                    if (ed > 0) { // ed is a measure of pointing up/down, -1 is fully up (repel)
                        U.excludeRadius[ui] = 0;
                        U.baitAttractStrength[ui] = ed ** 2 * me.baseBaitAttractStrength;
                    }
                    else {
                        U.excludeRadius[ui] = ed ** 2 * me.maxXsphereRadius;
                        U.baitAttractStrength[ui] = 0;
                    }
                    // x (e[0], e[1], e[2]) cross up (0,0,1) = (e[2], 0, -e[0])
                    //const tw = e[2]*e[8] - e[0]*e[10];     // (x cross up) dot z
                    //U.twist[i] = tw * G.twistBase;
                    U.twist[ui] = -(e[4] ** 3) * G.twistBase;
                    U.condir[ui].set(e[2], e[6], e[10]);
                }
                else {
                    // standard independent 23 Sept 2021 approx covtrack
                    if (gp.missedFrames) {
                        // for (let i = 0; i < RIBS; i++) springs.setfix( (me.TADS + ui) * me.RIBS + i, 9 9,9 9,9 9);
                        me.displayControl(ui, 'hide');
                        continue;
                    }
                    // if (gp.okFrames < 3) continue;
                    msgfix('vel' + ui, gp.velocity);
                    // below was when gp.velocity was suspect, but seems ok
                    // msgfix('velx' + ui, gp.velocity.subVectors(gp.baitPosition, gp.oldBaitPosition).multiplyScalar(1000/me._lastTrackedDelta))
                    gp.speed = gp.velocity.length();
                    const sdamp = getdamp(100); // just a few frames for noise
                    gp.dampSpeed = sdamp * (gp.dampSpeed || 0) + (1 - sdamp) * gp.speed;
                    msgfix('speed' + ui, gp.dampSpeed, gp.speed);
                    gp.oldSpeed = gp.oldVelocity.length();
                    // deceleration, maybe to use for repulse
                    gp.accel = (gp.speed - gp.oldSpeed) * 1000 / me._lastTrackedDelta;
                    gp.amin = Math.min(gp.amin || 0, gp.accel);
                    gp.amax = Math.max(gp.amax || 0, gp.accel);
                    msgfix('accel' + ui, gp.amin, gp.amax, gp.accel);
                    me.leedsi(gp, RIBS, ui);
                    // U.baitAttractStrength[ui] = me.baseBaitAttractStrength // * -dspeed/me.excludeSpeedThresh;
                    // msgfix('bait' + ui, 'attract', U.baitAttractStrength[ui] );
                    // // sharp attack, slow release repulse, radiusforce based
                    // let tt = Math.max(0, -gp.accel - me.excludeDecelThresh)
                    // let rr = G.baseExcludeForce / 10 * tt**2;  // /10 for similar range
                    // let ef;
                    // if (rr > gp.oldExcludeForce) {
                    //     ef = rr;
                    // } else {
                    //     const damp = getdamp(me.excludeDampHalf);
                    //     ef = damp * gp.oldExcludeForce + (1-damp) * rr;
                    // }
                    // if (isNaN(ef)) ef = 0;
                    // U.excludeForce[ui] = Math.min(ef, 1000);    // sometimes went to Infinity and stuck
                    // gp.oldExcludeForce = U.excludeForce[ui];
                    // U.excludeRadius[ui] = me.excludeRadius;       // fixed
                    // if (!me.closeDist) {
                    //     me.closeDist = 0.1; // closer repel is max value
                    //     me.zeroDist = 0.2;  // here is neither attract nor repel
                    //     me.maxDist = 1;     // here attract is max value
                    // }
                    // const d = gp.closeDistance;
                    // let v;  // attract
                    // if (d < me.closeDist) {
                    //     U.excludeForce[ui] = G.baseExcludeForce;
                    //     U.baitAttractStrength[ui] = 0;
                    // } else if (d < me.zeroDist) {
                    //     U.excludeForce[ui] = G.baseExcludeForce * (me.zeroDist - d) / (me.zeroDist - me.closeDist);
                    //     U.baitAttractStrength[ui] = 0;
                    // } else if (d < me.maxDist) {
                    //     U.excludeForce[ui] = 0;
                    //     U.baitAttractStrength[ui] = me.baseBaitAttractStrength * (d - me.zeroDist) / (me.maxDist - me.zeroDist);
                    // } else {
                    //     U.excludeForce[ui] = 0;
                    //     U.baitAttractStrength[ui] = me.baseBaitAttractStrength;
                    // }
                    // U.excludeRadius[ui] = me.excludeRadius;     // fixed
                    // // twist covtwist
                    // gp.twistCross.crossVectors(gp.velocity, gp.oldVelocity);
                    // const newl = gp.twistCross.length();
                    // const oldl = gp.twistCrossDamp.length();
                    // const damp = getdamp(newl > oldl ? me.twistDampHalfUp : me.twistDampHalfDown);
                    // gp.twistCrossDamp.lerp(gp.twistCross, 1-damp);
                    // const l = gp.twistCrossDamp.length();
                    // U.twist[ui] = l * G.twistBase * 100;    // *100 keeps it in similar range as other twist experiments
                    // if (l !== 0) U.condir[ui].copy(gp.twistCrossDamp).multiplyScalar(1/l);
                }
                const bpx = gp.okFrames < 3 ? 9999 : bp.x; // stop jumps as bait appears, on okFrames === 3 it will be fixed in new position
                me.displayControl(ui, { orb: me.orb || gp.okFrames <= 3, x: bpx, y: bp.y, z: bp.z });
                me.baitWeightR = me.baitWeightL = 1; // ? only used for radii, to tidy
                msgfix('rot.' + ui, gp.raymatrix.toString());
            }
            // // line bait dancer, w.i.p
            // if (me.dancerCentre && me._monitorTrackerGPS.length >= 4) {
            //     for (let i=0; i < 16; i++)
            //         U.line baitAttractStrength[i] = me.baseLine baitAttractStrength;
            //     let i = 0;
            //     for (let ui = 0; ui < 4; ui++) {
            //         const gp = me._monitorTrackerGPS[ui];
            //         U.line baitAttractStrength[i] = me.baseLine baitAttractStrength;
            //         U.line baitPosition[i++].copy(gp.baitPosition);
            //         U.line baitAttractStrength[i] = 0 * me.baseLine baitAttractStrength;
            //         U.line baitPosition[i++].copy(gp.jointPosition);
            //         U.line baitAttractStrength[i] = me.baseLine baitAttractStrength;
            //         U.line baitPosition[i++].copy(gp.jointPosition);
            //         U.line baitAttractStrength[i] = 0 * me.baseLine baitAttractStrength;
            //         U.line baitPosition[i++].copy(me.dancerCentre);
            //     }
            // }
        }
        else { // use batons
            // for now we just want to make sure we have even number
            for (let ui = 0; ui + 1 < me._monitorTrackerGPS.length; ui += 2) {
                // const gp = me._monitorTrackerGPS[ui];
                // const bp = gp.baitPosition;
                // U.baitPosition[ui].copy(bp);
                // U.twist[ui] = 0;
                // const e = gp.raymatrix.elements;
                // let ed = ui%4 >= 2 ? -1 : e[6];  // const, let for debug. feet always repel
                // ed = ui%2 ? 1 : -1;               // const, version for two ends of stick
                // derive some useful values
                let bd = me.batondata[ui];
                let newbd = false;
                if (!bd) {
                    bd = me.batondata[ui] = {
                        centre: VEC3(), velocity: VEC3(), oldCentre: VEC3(), direction: VEC3(), oldDirection: VEC3(), twistv: VEC3(),
                        speed: 0, twistSpeed: 0,
                        twist: 0, excludeRadius: 0, linebaitAttractStrength: 0, condir: VEC3() // cumulative 'damped' values
                    };
                    newbd = true;
                }
                bd.centre.addVectors(me._monitorTrackerGPS[ui].baitPosition, me._monitorTrackerGPS[ui + 1].baitPosition).multiplyScalar(0.5);
                bd.velocity.subVectors(bd.centre, bd.oldCentre).multiplyScalar(1000 / me._lastTrackedDelta);
                bd.direction.subVectors(me._monitorTrackerGPS[ui].baitPosition, me._monitorTrackerGPS[ui + 1].baitPosition).normalize();
                bd.speed = bd.velocity.length();
                bd.twistv.crossVectors(bd.oldDirection, bd.direction).multiplyScalar(1000 / me._lastTrackedDelta);
                bd.twistSpeed = bd.twistv.length();
                // save old
                bd.oldCentre.copy(bd.centre);
                bd.oldDirection.copy(bd.direction);
                // reset things till proved otherwise
                U.twist[ui] = U.twist[ui + 1] = 0;
                U.linebaitAttractStrength[ui] = U.linebaitAttractStrength[ui + 1] = 0;
                U.excludeRadius[ui] = U.excludeRadius[ui + 1] = 0;
                U.linebaitPosition[ui].copy(me._monitorTrackerGPS[ui].baitPosition);
                U.linebaitPosition[ui + 1].copy(me._monitorTrackerGPS[ui + 1].baitPosition);
                if (newbd)
                    return;
                // now try to use the original and derived data
                if (me.imode === 'angles') {
                    let y = bd.direction.y;
                    if (y < 0) {
                        bd.direction.multiplyScalar(-1);
                        y = -y;
                    }
                    const ang = Math.asin(y) * 180 / Math.PI;
                    const at = me.angthresh;
                    if (ang < at) { // flattish, attract
                        const a = U.linebaitAttractStrength[ui] = U.linebaitAttractStrength[ui + 1] = me.baseLinebaitAttractStrength * (1 - ang / at);
                        msgfix('baton', 'attract', a);
                    }
                    else if (ang < 90 - at) { // angled, twist
                        U.condir[ui].crossVectors(bd.direction, VEC3(0, 1, 0)).normalize();
                        // U.twistD[ui] // fixed?
                        // const l = U.condir[ui].length();
                        const l = 1 - Math.abs(ang - 45) / (45 - at);
                        U.twist[ui] = l * G.twistBase;
                        // U.condir[ui].multiplyScalar(1/l);
                        msgfix('baton', 'twist', U.twist[ui]);
                    }
                    else { //
                        const l = 1 - (90 - ang) / at;
                        U.excludeRadius[ui] = U.excludeRadius[ui + 1] = l * me.maxXsphereRadius;
                        msgfix('baton', 'exclude', U.excludeRadius[ui]);
                    }
                }
                else if (me.imode === 'dyn') {
                    // sharp attack, slow release twist
                    const ss = bd.twistSpeed * me.twistRate ** 2;
                    if (ss > bd.twist) {
                        U.condir[ui].copy(bd.twistv);
                        U.twist[ui] = ss;
                    }
                    else {
                        const damp = getdamp(me.twistDampHalf);
                        U.twist[ui] = damp * bd.twist + (1 - damp) * ss;
                    }
                    msgfix('batontwist', bd.twistSpeed, bd.twist);
                    // sharp attack, slow release repulse
                    let tt = Math.max(0, bd.speed - me.excludeSpeedThresh);
                    let rr = me.excludeRadius * tt ** 2;
                    if (rr > bd.excludeRadius) {
                        U.excludeRadius[ui] = rr;
                    }
                    else {
                        const damp = getdamp(me.excludeDampHalf);
                        U.excludeRadius[ui] = damp * bd.excludeRadius + (1 - damp) * rr;
                    }
                    msgfix('batonexcl', bd.speed, U.excludeRadius[ui]);
                    // constant attract
                    U.linebaitAttractStrength[ui] = U.linebaitAttractStrength[ui + 1] = me.baseLinebaitAttractStrength;
                }
                else {
                    WA.tadmodetest(ui);
                }
                // keep persistent versions that won't be reset
                bd.twist = U.twist[ui];
                bd.excludeRadius = U.excludeRadius[ui];
                bd.linebaitAttractStrength = U.linebaitAttractStrength[ui];
                bd.condir.copy(U.condir[ui]);
            }
        } // use batons
    }; // useTrackers
    me.linebaitTest = function () {
        runkeys('K,F');
        U.twist.fill(0);
        U.baitAttractStrength.fill(0);
        U.linebaitAttractStrength[0] = U.linebaitAttractStrength[1] = 1;
        U.linebaitPosition[0].set(-1, 0.8, 0);
        U.linebaitPosition[1].set(1, 0.8, 0);
    };
    /** define tracker origin, used for dancerX ? */
    me.monitorTrackersCentre = function monitorTrackersCentre() {
        // reestablish all trackers
        me._trackerUse = undefined;
        monitorTrackersMessage();
        const gg = me._monitorTrackerGPS;
        if (gg.length < 4)
            return msgfixlog('trackerOrder', 'not set, num trackers=', gg.length);
        _monitorTrackerOrigin = me._monitorTrackerOrigin = gg.reduce((c, v) => c.add(v.rawPos), new THREE.Vector3()).multiplyScalar(1 / gg.length);
        const miny = gg.reduce((c, v) => c = Math.min(c, v.rawPos.y), Infinity);
        _monitorTrackerOrigin.y = miny + me.trackerOffsetFoot.z;
        for (const v of gg)
            v.baitPosition.subVectors(v.rawPos, _monitorTrackerOrigin);
        const to = me._trackerUse = [];
        /* should order left hand, right hand, left foot, right foot */
        for (const tr of gg) { // ri is index into raw data
            const ui = +(tr.baitPosition.x > 0) + 2 * +(tr.baitPosition.y < 0.2); // ui is index for our use, note y=0 is floor
            to[tr.opvrIndex] = ui;
        }
        msgfixlog('_trackerUse', to);
        return to;
    };
    const badv3 = new THREE.Vector3(NaN, NaN, NaN);
    me._glyphpos = new Array();
    for (let i = 0; i < CONTROLS * 2; i++)
        me._glyphpos.push(new THREE.Vector3());
    me.randrate = 0.03;
    me.randdiff = 0.15;
    me.simsize = 0.3;
    me.randrate = 0.03;
    me.spineup = 0.0; // spine up/down size: with 0 we just get X shape, preferred 3 Sept 2021
    me.spinedown = 0.0; // spine up/down size
    me.frontback = 0.01; // forward/back dist at spine wrap
    /** test glyphs for dancer, stick */
    me.glyph = function () {
        if (me.dancerX)
            return me.glyphTwoX();
        // look up basic positions, and simulate more if needed
        const gps = me._monitorTrackerGPS;
        let si = 0, ui = 0;
        const nd = Math.floor(gps.length / 2);
        const tva = VEC3(), tvb = VEC3();
        for (let d = 0; d < nd; d++) { // d is offset for dancer
            const set = p => springs.setfix(TADS * RIBS + si++, p);
            const setp = p => set(tva.copy(a).multiplyScalar(p).add(tvb.copy(b).multiplyScalar(1 - p)));
            //const kpos = pos.slice(d+J, d+J + 4);   // take centre from joints, not bait
            // const c = kpos.reduce((c,v) => c.add(v), new THREE.Vector3()).multiplyScalar(1/kpos.length);    // centre
            //const setn = n => set(pos[n + d]);
            const a = gps[ui++].baitPosition;
            const b = gps[ui++].baitPosition;
            for (let p = 0; p < RIBS; p++)
                setp(p / (RIBS - 1));
        } // two
        const R = 0.5 * me.trackerScaling; // base radius
        for (let p = TADS * RIBS; p < (TADS + 4) * RIBS; p++) {
            const ii = p % RIBS;
            const end = ii === 0 || ii === RIBS - 1;
            me.tadprop[p * 4] = me.tadprop[p * 4 + 2] = R * (end ? 2 : 1); // radius, big ends
            me.tadprop[p * 4 + 1] = end ? me.glyphendcol : me.dancer1col + +(p >= (TADS + 2) * RIBS); // colour id, dancer 1/2 are 0,1, baton end is 3
            me.tadprop[p * 4 + 3] = 0;
        }
        // for (let i=0; i < RIBS*2; i++) set(badv3); // invalidate other two
    }; // glyph
    /** test glyphs for dancer, two tadpole X */
    me.glyphTwoX = function () {
        // look up basic positions, and simulate more if needed
        const gps = me._monitorTrackerGPS;
        const pos = me._glyphpos;
        const nn = me._trackerNum;
        let simz = -0.3; // simulated foot
        const J = CONTROLS; // offset in glypos for joint
        const left = 0, right = 1, hand = 0, foot = 2, elbow = hand + J, knee = foot + J;
        let rk = 17.3;
        let d = 0.01; // size for making extra points
        const r = x => x + me.randdiff * Math.sin(frametime * me.randrate / (rk++)); // random sin purturb
        const setrx = (i, x, y, z) => pos[i].set(r(x), r(y), r(z));
        const setx = (i, x, y, z) => pos[i].set(x, y, z);
        for (let i = 0; i < gps.length; i++) {
            pos[i].copy(gps[i].baitPosition);
            pos[i + J].copy(gps[i].jointPosition);
        }
        if (nn === 0) {
            setrx(0, -me.simsize, me.simsize, me.simsize);
            setrx(J, -me.simsize, me.simsize, me.simsize);
        }
        if (nn < 2) {
            setx(1, pos[0].x, pos[0].y, pos[0].z + d);
            setx(J + 1, pos[J].x, pos[J].y, pos[J].z + d);
        }
        if (nn < 4)
            for (let i = 0; i < 2; i++) {
                setx(i + 2, pos[i].x, pos[i].y + d, pos[i].z);
                setx(i + 2 + J, pos[i + J].x, pos[i + J].y + d, pos[i + J].z);
            }
        if (nn < 8)
            for (let i = 0; i < 4; i++) {
                setx(i + 4, pos[i].x + d, pos[i].y, pos[i].z);
                setx(i + 4 + J, pos[i + J].x + d, pos[i + J].y, pos[i + J].z);
            }
        let si = 0;
        for (let d = 0; d < 4; d += 4) { // d is offset for dancer
            const set = p => springs.setfix(TADS * RIBS + si++, p);
            const kpos = pos.slice(d + J, d + J + 4); // take centre from joints, not bait
            const c = kpos.reduce((c, v) => c.add(v), new THREE.Vector3()).multiplyScalar(1 / kpos.length); // centre
            me.dancerCentre = c; // just one dancer for now!!
            const setn = n => set(pos[n + d]);
            // so we can set front and back correctly, 'forwards' is right angles to xz direction between hands
            const le = pos[left + elbow + d], re = pos[right + elbow + d];
            let dx = re.x - le.x, dz = re.z - le.z, ld = Math.sqrt(dx * dx + dz * dz);
            if (ld > 0.05) {
                dx *= 1 / ld;
                dz *= 1 / ld;
            }
            dx *= me.frontback;
            dz *= me.frontback;
            const chf = { x: c.x + dz, y: c.y + me.spineup * me.trackerScaling, z: c.z - dx }; // high centre front
            const chb = { x: c.x - dz, y: c.y + me.spineup * me.trackerScaling, z: c.z + dx }; // high centre front
            const clf = { x: c.x + dz, y: c.y - me.spinedown * me.trackerScaling, z: c.z - dx }; // low centre back
            const clb = { x: c.x - dz, y: c.y - me.spinedown * me.trackerScaling, z: c.z + dx }; // low centre back
            setn(left + foot);
            setn(left + foot);
            setn(left + knee);
            set(clf);
            set(chb);
            setn(right + elbow);
            setn(right + hand);
            setn(right + hand);
            setn(right + foot);
            setn(right + foot);
            setn(right + knee);
            set(clb);
            set(chf);
            setn(left + elbow);
            setn(left + hand);
            setn(left + hand);
        } // two
        const R = 1 * me.trackerScaling; // base radius
        for (let p = TADS * RIBS; p < (TADS + 4) * RIBS; p++) {
            me.tadprop[p * 4] = me.tadprop[p * 4 + 2] = R * (p % 8 === 7 ? 2 : 1); // radius, big hands
            me.tadprop[p * 4 + 1] = me.dancer1col + +(p >= (TADS + 2) * RIBS); // colour id
            me.tadprop[p * 4 + 3] = 0;
        }
        // for (let i=0; i < RIBS*2; i++) set(badv3); // invalidate other two
    };
    /** test glyphs for dancer, single tadpole X plus */
    me.glyphS = function () {
        // look up basic positions, and simulate more if needed
        const bps = U.baitPosition;
        const pos = me._glyphpos;
        const nn = me._trackerNum;
        let simz = -0.3; // simulated foot
        let rk = 17.3;
        const r = x => x + me.randdiff * Math.sin(frametime * me.randrate / (rk++)); // random sin purturb
        const setx = (i, x, y, z) => pos[i].set(r(x), r(y), r(z));
        for (let i = 0; i < bps.length; i++)
            pos[i].copy(bps[i]);
        if (nn === 0)
            setx(0, -me.simsize, me.simsize, me.simsize);
        if (nn < 2)
            setx(1, pos[0].x, pos[0].y, -pos[0].z);
        if (nn < 4)
            for (let i = 0; i < 2; i++)
                setx(i + 2, pos[i].x, simz, pos[i].z);
        if (nn < 8)
            for (let i = 0; i < 4; i++)
                setx(i + 4, -pos[i].x, pos[i].y, pos[i].z);
        let si = 0;
        for (let k = 0; k < 2; k++) {
            const set = p => springs.setfix(TADS * RIBS + si++, p);
            const kpos = pos.slice(k * 4, k * 4 + 4);
            const setn = n => set(kpos[n]);
            const c = kpos.reduce((c, v) => c.add(v), new THREE.Vector3()).multiplyScalar(1 / kpos.length); // centre
            const ch = { x: c.x, y: c.y + 0.2, z: c.z }; // high centre
            // const cl = {x: c.x, y: c.y - 0.2, z: c.z}   // low centre
            setn(2); // left foot
            set(c);
            setn(3); // right foot
            set(c);
            setn(0); // left hand
            set(ch);
            setn(1); // right hand
            set(c);
        }
        for (let p = TADS * RIBS; p < (TADS + 2) * RIBS; p++)
            me.tadprop[p * 4] = me.tadprop[p * 4 + 2] = 1 * me.trackerScaling;
        // for (let i=0; i < RIBS*2; i++) set(badv3); // invalidate other two
    };
    /** monitor trackers every frame */
    function monitorTrackers() {
        let id;
        if (_monitorTrackerHandle) {
            _monitorTrackerHandle.close();
            _monitorTrackerOrigin = undefined;
            me._trackerUse = undefined;
        }
        let handle = _monitorTrackerHandle = new WebSocket(`ws://${location.hostname}:57779`);
        handle.onmessage = message => monitorTrackersMessage(JSON.parse(message.data));
        handle.onclose = () => {
            if (id)
                Maestro.remove(undefined, id);
            id = undefined;
            if (handle === _monitorTrackerHandle)
                _monitorTrackerHandle = undefined;
            handle = undefined;
            msgfix('monitorTrackers', 'closed');
        };
        handle.onerror = (e) => {
            handle.onclose(undefined);
            msgfixerror('monitorTrackers', 'error', e);
        };
        handle.onopen = () => {
            msgfix('monitorTrackers', 'opened');
            me._monitorTrackerGPS.splice(0, 100); // clear
            id = everyframe(() => {
                if (!handle)
                    return log('monitorTrackers everyframe no handle');
                if (handle.readyState !== 1)
                    return log('monitorTrackers everyframe not ready', handle.readyState);
                handle.send('?');
            });
        };
    }
    /** default room setup */
    me.covdef = {
        w: 5,
        h: 3.1,
        d: 5,
        fixFloor: -0.001,
        hideWalls: false,
        cenx: 0,
        ceny: undefined,
        cenz: 0,
        camx: 0,
        camy: undefined,
        camz: -17.5,
        fov: undefined,
        fovmult: 1.2,
        off: 0.03,
        size: undefined,
        cen: undefined,
        cam: undefined,
        near: undefined,
        far: undefined,
        standardObjectSize: 2.5,
        aspect: 16 / 9,
        wallFrontExtra: 0,
        wallBackExtra: 10 // set back because camera s -ve z
    };
    me.defaultCovdef = Object.assign({}, me.covdef);
    /** set up the room, based on floor origin */
    me.covidSetScene = function (props = {}) {
        const lprops = Object.assign(me.covdef, props);
        let { w, h, d, fixFloor, hideWalls, cenx, ceny, cenz, camx, camy, camz, fov, fovmult, off, size, cen, cam, near, far, aspect, wallFrontExtra, wallBackExtra } = lprops;
        if (!me.docovid)
            return msgfixerrorlog('docovid', 'bad call to covidSetScene not in covid mode');
        // camz *= -1;
        // if (!dualmode) setSize(); // useful at initial setup, really confuses mutation in dualmode
        //?if (aspect === undefined) aspect = inputs.previewAr ? eval(inputs.imageasp) : 9/5;
        if (size !== undefined)
            [w, h, d] = size;
        if (cen !== undefined)
            [cenx, ceny, cenz] = cen;
        if (cam !== undefined)
            [camx, camy, camz] = cam;
        if (aspect != 0) {
            w = me.covdef.w = h * aspect;
            inps.previewAr = true;
            inps.imageasp = aspect;
        }
        else {
            aspect = w / h; // only local, do NOT change covdef.aspect
        }
        if (ceny === undefined)
            ceny = h / 2; // local change, NOT covdef
        if (camy === undefined)
            camy = ceny; // was h*0.45
        camera.position.set(camx, camy, camz);
        me.centre.set(cenx, ceny, cenz); // centre of covid etc
        const dist = me.centre.distanceTo(camera.position);
        if (near === undefined)
            near = clamp(dist - d / 2 - 0.1, 0.1, 1); // near/far are used for position of objects if camview
        if (far === undefined)
            far = Math.max(d * 2, dist + d / 2 + 0.1 + 5); // +5 sjpt 20Mar2023, too much isn't important, was giving odd shadow effect
        G.wallFrontExtra = wallFrontExtra; // any large number so the side walls and floor extend at least enough
        G.wallBackExtra = wallBackExtra; // set back because camera s -ve z
        // set up so values are in metres with no 'help' from cMap on aspect etc
        _boxsize = 1;
        G.wallAspect = V.wallAspect = 0;
        if (width === 1920 && height == 1079)
            height = 1080; // chrome sometimes reports window.innderHeight at 1079 on standard monitor
        const hr = Math.round(innerWidth / aspect), wr = Math.round(innerHeight * aspect);
        if (innerHeight > hr)
            setSize(innerWidth, hr);
        else if (wr < innerWidth)
            setSize(wr, innerHeight);
        else
            setSize(innerWidth, innerHeight);
        const useh = hideWalls ? 9999 : h, usew = hideWalls ? 9999 : w / 2, used = d / 2;
        const boxdef = cMap.boxtdef = { x: usew, y: useh, z: used, fixFloor: hideWalls ? undefined : fixFloor };
        if (!deferRender)
            cMap.newmesh();
        adduniform('tadWallSize', VEC3(), 'v3', 'tadspring');
        adduniform('tadWallSizeN', VEC3(), 'v3', 'tadspring');
        adduniform('roomSize', VEC3(), 'v3', 'tadspring'); // room size for lookup of image
        U.roomSize.set(w, h, d);
        // front z a little arbitrary, but keep most visible; certainly don't want to use G.wallFrontExtra
        const computedWallAspect = cMap.computedWallAspect || 1;
        uniforms.tadWallSize.value.set(_boxsize * computedWallAspect * usew - off, _boxsize * useh - off, _boxsize * used - off);
        uniforms.tadWallSizeN.value.set(_boxsize * computedWallAspect * usew - off, _boxsize * useh - off, _boxsize * used - off);
        if (fixFloor !== undefined)
            uniforms.tadWallSizeN.value.y = fixFloor;
        runkeys('ctrl,Home');
        if (fov === undefined) {
            // // fits fov to make sides at 'front' fit
            // fov = 2 * 180 / Math.PI * Math.atan2(U.tadWallSize.x * height/width, camz-U.tadWallSizeN.z) * fovmult;
            // fits fov to make width at 'centre' fit, using width and aspect ration as guide
            fov = 2 * 180 / Math.PI * Math.atan2(w / 2 * height / width, dist) * fovmult;
            fov = Math.min(fov, 179);
        }
        camera.updateMatrix(); // do not let lookAt kill position if no auto update
        camera.lookAt(cenx, ceny, cenz);
        camera.updateMatrix();
        // const off = 0.03; // offset from wall where force starts (metres)
        camera.fov = G._fov = fov;
        // Maybe we could have used -ve aspect and saved introduction of copyXflip
        // but now copyXflip is established leave as is.  sjtp 20 Apr 2023
        camera.aspect = G._camaspect = aspect;
        copyXflip = -1; // - to get reflection for 'normal' image
        camera.far = G._camfar = far;
        camera.near = G._camnear = near;
        camera.updateProjectionMatrix();
        camToGenes();
        // NOTE: z = 1.1 is right for closeup
        G._posx = G._posy = G._posz = 0;
        if (uniforms.springCentre)
            U.springCentre.copy(me.centre); // use centre for springs
        if (tadkin)
            tadkin.sendCamMat();
        // onWindowResize();    // for central placement
        fitCanvasToWindow(); // for central placement
    };
    me.prio.randCore = 1;
    /** make a role for randomly placed tadpoles */
    me.tadrand = async function ({ defs = me.GROUP, sc = 0.1, len = 0, str = 1, pow = me.tadpow, numtads = TADS, tr = U.tadWallSize, bl = U.tadWallSizeN, l = 0, s = 0.01 } = {}) {
        const rolekey = `tadrand_${sc}`;
        let role = await makeRole(rolekey);
        me.prio[rolekey] = me.prio.randCore;
        if (role.infdone)
            return endTime(role);
        const data = role.details.data = [];
        const d = VEC3().addVectors(tr, bl); // add as bl is -ve of what it means
        const rr = Math.random;
        for (let i = l; i < numtads; i++) {
            // const x = tr.x - d.x*rr(), y = tr.y - d.y*rr(), z = tr.z - d.z*rr(); // centre in room
            const x = d.x / 2 - d.x * rr(), y = d.y / 2 - d.y * rr(), z = d.z / 2 - d.z * rr(); // centre at origin (and move later)
            for (let ti = 0; ti < me.RIBS; ti++) {
                data[i * me.RIBS + ti] = VEC3(x, y - ti * s, z);
            }
        }
        backboneSprings(role, { userods: true });
        role.numtads = numtads;
        pullSprings(role); // if no .positions file, after data established
        me.tadshape(role, RIBS);
        return endTime(role);
    };
    /** random positions */
    me.randposNEARDEAD = function ({ tr = U.tadWallSize, bl = U.tadWallSizeN, l = 0, h = me.TADS, s = 0.01, pull = false, num = U.LRIBS } = {}) {
        const d = VEC3().addVectors(tr, bl); // add as bl is -ve of what it means
        const rr = Math.random;
        const op = pull ? springs.addpull : springs.setfix;
        let x, y, z;
        for (let i = l * RIBS; i < h * RIBS; i++) { // i index to individual segment of tadpole
            let ii = i % num; // ii is position within tadpole
            if (ii === 0) {
                x = tr.x - d.x * rr(), y = tr.y - d.y * rr(), z = tr.z - d.z * rr();
            }
            op(i, x, y - ii * s, z);
        }
        if (!pull)
            springs.finishFix(TADS * RIBS);
    };
    // get/set ribs and other propertly values for one or more particles
    function getProp(off, s, l) {
        if (s === undefined) {
            s = 0;
            l = TADS * RIBS;
        }
        if (l === undefined)
            return me.tadprop[+s * 4 + off];
        const r = [];
        for (let i = s; i < s + l; i++)
            r.push(me.tadprop[i * 4 + off]);
        return r;
    }
    function setProp(off, s, vl, vv) {
        if (vv === undefined)
            me.tadprop[s * 4 + off] = vl;
        else if (typeof vv === 'number')
            for (let i = s; i < s + vl; i++)
                me.tadprop[i * 4 + off] = vv;
        else
            for (let i = s; i < s + vl; i++)
                me.tadprop[i * 4 + off] = vv[i - s];
    }
    me.getRibs = (s, l) => getProp(3, s, l);
    me.setRibs = (s, vl, vv) => setProp(3, s, vl, vv);
    me.getRads = (s, l) => getProp(0, s, l);
    me.setRads = (s, vl, vv) => { setProp(0, s, vl, vv); setProp(2, s, vl, vv); };
    me.getTargRads = (s, l) => getProp(2, s, l);
    me.setTargRads = (s, vl, vv) => setProp(2, s, vl, vv);
    me.getCols = (s, l) => getProp(1, s, l);
    me.setCols = (s, vl, vv) => setProp(1, s, vl, vv);
    /** save current positions */
    me.savePositions = function (role = me.T[0].role, offset = me.centre) {
        const d = springs.getpos(RIBS * TADS);
        d.forEach(x => x.sub(offset));
        writetextremote('data/' + role.id + '.positions', JSON.stringify(d));
        role.details.data = d;
    };
    /** save enough information for role. sOnly seems worthwhile for covid?  */
    me.saveInf = function (role = me.T[0].role) {
        const d = { springs: role.springs, roleprops: Array.from(role.roleprops), numtads: role.numtads };
        writetextremote('data/' + role.id + '.inf', JSON.stringify(d));
    };
    me.loadInf = async function (role = me.T[0].role) {
        const d = await readJSON('data/' + role.id + '.inf');
        role.infdone = !!d;
        if (d) {
            d.roleprops = new Float32Array(d.roleprops);
            Object.assign(role, d);
        }
    };
    me.saveInfBin = async function (role = me.T[0].role) {
        const h = fileOpenWriteWS('data/' + role.id + '.infbin');
        await fileAppendWS(h, Float32Array.from([role.numtads, role.springs.length, role.roleprops.length]));
        await fileAppendWS(h, me.springsToFloat(role));
        await fileAppendWS(h, role.roleprops);
        fileCloseWS(h);
    };
    me.loadInfBin = async function (role = me.T[0].role) {
        const fid = 'data/' + role.id + '.infbin';
        if (!await fileExistsAsync(fid)) {
            role.infdone = false;
            return;
        }
        const h = fileOpenReadWS(fid);
        let o = 0;
        let l = 3 * 4;
        const [numtads, springlen, roleprolen] = new Float32Array(await fileReadWS(h, l, o));
        o += l;
        role.numtads = numtads;
        l = springlen * 9 * 4;
        role.springs = me.floatToSprings(new Float32Array(await fileReadWS(h, l, o)));
        o += l;
        l = roleprolen * 4;
        role.roleprops = new Float32Array(await fileReadWS(h, l, o));
        o += l;
        log('tad+ data read', fid, o);
        role.infdone = true;
        fileCloseWS(h);
    };
    // me.typedict = {pullspring: -1000, rod: -1001};
    // me.typedicti = {'-1000': 'pullspring', '-1001': 'rod'};
    // serialize springs as float array
    me.springsToFloat = function (role = me.T[0].role) {
        const ss = role.springs;
        const a = new Float32Array(ss.length * 9);
        let p = 0;
        for (const s of ss) {
            a[p++] = s.at[0];
            a[p++] = s.at[1];
            a[p++] = s.bt[0];
            a[p++] = s.bt[1];
            let ty = s.type;
            if (ty === 'pullspring') {
                a[p++] = s.x;
                a[p++] = s.y;
                a[p++] = s.z;
                ty = -1000;
            }
            else if (ty === 'rod') {
                a[p++] = s.len;
                a[p++] = s.maxlen;
                p++;
                ty = -1001;
            }
            else {
                a[p++] = s.len;
                a[p++] = s.pow;
                a[p++] = s.prio;
            }
            a[p++] = s.str;
            if (typeof ty !== 'number')
                me.owow('unexpected spring type', s.type);
            a[p++] = ty;
        }
        return a;
    };
    // deserialize springs from float array
    me.floatToSprings = function (a) {
        console.time('tad+floatToSprings');
        const ss = new Array(a.length / 9);
        let p = 0;
        for (let i = 0; i < ss.length; i++) {
            const s = ss[i] = { at: [a[p++], a[p++]], bt: [a[p++], a[p++]], len: a[p++], pow: a[p++], prio: a[p++], str: a[p++], type: a[p++] };
            const ty = s.type;
            if (ty === -1000) {
                s.x = s.len;
                s.y = s.pow;
                s.z = s.prio;
                s.type = 'pullspring';
                s.len = s.pow = s.prio = undefined; // not sure why needed, but ...
            }
            else if (ty === -1001) {
                // use s.len as is
                s.maxlen = s.pow;
                s.type = 'rod';
                // } else {
            }
        }
        console.timeEnd('tad+floatToSprings');
        return ss;
    };
    /** use pullsprings to transition to known place */
    me.transitionTo = async function (k = 'T', time = me.transitionTimeSecs) {
        S.jump(); // help ensure no old garbage, could make more precise
        let special = k === 'S' || k === 'T' || k === 'R'; // twist, space and random aren't proper Things right now,
        if (special) {
            runkeys('K,F K,O');
        }
        // 0.01 => 25 secs
        me.springforce = 0; // just pull to start with, copied to G.springforce each frame
        const tm = time * 1000;
        let springmaxvel = 25 / time * 0.01;
        if (springmaxvel > G.springmaxvel) { // allow temporary increase of springmaxvel for fast transition
            G.springmaxvel = springmaxvel;
            setTimeout(() => G.springmaxvel = me.defaultSpringMaxvel, tm);
        }
        const pullsp = tad.transitionPullspringforce / time;
        // >>>>>>> U.roleforcesFix[9] used to keep backbones during transition, to consider if more needed 8/10/2021
        //    log('transition', pullsp,  springmaxvel);
        G.pullspringforce = 1e-10; // should be already?
        //    G.springmaxvel = 0;
        runkeys(`shift,K,${k}`);
        //    S.rampP(G, 'springmaxvel', springmaxvel, tm/2, {scurve:true});
        await S.rampP(G, 'pullspringforce', pullsp, tm / 2, { scurve: true });
        log('pull springs now up');
        // await sleep(tm);
        //    G.springmaxvel = me.defaultSpringMaxvel;
        log('pullsprings down, others up');
        S.rampP(G, 'pullspringforce', special ? 0.01 : 1e-10, tm / 2, { scurve: true }); // relax the pullsprings, or correct for special
        await S.rampP(me, 'springforce', me.basespringforce, tm / 2, { scurve: true }); // increase the real springs
        // runkeys(`shift,K,>`);               // and remove them
        log('transition complete', k, time);
    };
    /**  */
    me.centreforce = async function (time = 100, low = 0.9) {
        const s = G.springCentreDamp;
        G.springCentreDamp = low;
        await sleep(100);
        G.springCentreDamp = s;
    };
    /** hide the controls, tuck out way */
    me.hideControls = function () {
        if (me._monitorTrackerGPS)
            for (const gp of me._monitorTrackerGPS)
                gp.baitPosition.copy(me.hide);
        // ??? not sure about this change, but it was certainly wrong with tad.displayControl() with no args
        // if (TADS > 0) for (let i = TADS*RIBS; i < (TADS + CONTROLS)*RIBS; i++) tad.displayControl();
        if (TADS > 0)
            for (let i = 0; i < CONTROLS; i++)
                tad.displayControl(i, 'hide');
    };
    /** setup and then save positions for the current role,
     * especially for forms with some pullsprings but not enough (eg some virus's) */
    me.prepAndSavePositions = async function () {
        msgfix('pullsave', 'preparing', me.T[0].role.id);
        G.baseExcludeForce = 0;
        G.noisefieldforce = 0;
        G.pullfixdamp = 1;
        G.coreAttractForce = G.coreTwistForce = G.coreChangeForce = G.coreVelocityForce = 0;
        tad.topos();
        await sleep(1000);
        runkeys('K,C');
        tad.clearControlDisplay();
        await sleep(5000);
        me.savePositions();
        msgfix('pullsave', 'saved', me.T[0].role.id);
    };
    me.purelist = 'baseExcludeForce coreTwistForce noisefieldforce coreAttractForce coreChangeForce pullfixdamp'.split(' ');
    /** set or toggle pure form (no interaction) */
    me.pureForm = function (v = !me.savedForces) {
        if (v) { // no saved forces, so save some and set them all to 0 (or 1)
            me.savedForces = {};
            for (const gn of me.purelist) {
                me.savedForces[gn] = G[gn];
                G[gn] = 0;
            }
            G.pullfixdamp = 1;
        }
        else { // saved forces, so restore them
            for (const gn of me.purelist) {
                G[gn] = me.savedForces[gn];
            }
            me.savedForces = undefined;
        }
    };
    me.springstats = function (role) {
        if (role === undefined) {
            let m = 0;
            for (const r of me.TRA) {
                const mm = me.springstats(r);
                log(r.id, mm);
                m = Math.max(m, mm);
                S.frame();
            }
            log('>>> MAX', m);
            return;
        }
        tad.newThing(role);
        tad.allOrdered();
        const max = springs.pairsfor(0, TADS * RIBS, false, false).map(x => x.length).reduce((c, v) => c = Math.max(c, v));
        return max;
    };
    me.showall = async function (n = 1) {
        for (const role of me.TRA) {
            log(role.id);
            tad.newThing(role);
            tad.allOrdered();
            tad.topos();
            await S.frame(n);
        }
    };
    me.likePomp = function () {
        me.baseBaitAttractStrength = 0.005; // ? 0.00001
        G.pullspringforce = 300; // 1000,100,10
        G.noisefieldforce = 0;
        G.twistPow = -2;
        G.a_pulsescale = 0;
        G._uScale = 1;
        G._camz = 2.5;
        G._fov = 60;
        G.twistBaitProp = 1; // 1 is ray (like Pomp), 0 is bait
        me.dynmessages();
        setInterval(() => { me.tadBeat(); return 0; }, 500); // step, beat, bar, measure;  seq.step is number within beat, etc
        G.pushapartforce = 7e-8;
        me.pushapartforce = G.pushapartforce; // real value computed dynamically
        G.pushapartpow = -2; // -1.2;
        me.baseLinebaitAttractStrength = 0;
        U.linebaitAttractStrength.fill(0);
        G.baseExcludeForce = 1e7; // ???? G.xradiusforce=1
        G.baitAttractPow = -4;
        tad.baseBaitAttractStrength = 0.005; // defaultTadAttractors?
    };
    me.dynmessages = function () {
        msgfix('!twist', () => U.twist);
        msgfix('!condir', () => U.condir);
        msgfix('!excludeRadius', () => U.excludeRadius);
        msgfix('!excludeForce', () => U.excludeForce);
        msgfix('!baitAttractStrength', () => U.baitAttractStrength);
        msgfix('!baitpos', () => U.baitPosition);
        msgfix('!force', () => `attract=${tad.baseBaitAttractStrength} xradforce=${G.baseExcludeForce} twist=${G.twistBase} continuous=${tad.continuousActive}`);
        msgfix('!spr', () => `pullspringforce=${U.pullspringforce} pullfixdamp=${U.pullfixdamp} xyzforce=${U.xyzforce} springforce=${U.springforce}`);
        msgfix('skel', () => `rot ${tad.skelrot} pull${tad.skelpull}`);
    };
    /** join close points by springs to make distance based topology
     * If we have a cluster of points (eg a,b,d,c) it will just create pairs a-b, b-c, c-d
     * This should still hold them all together, but prevents o n-squared springs for a cluster of n.
     * eg a branch horn structure can have a cluster for quite large n.
     * The logic for this will not work properly for non-0 maxlem, as 'b' and 'c' may both be close to 'a' but not to each otber
     * */
    me.joinClose = async function (role, { maxlen = 1e-20, str = 0.0001, pow = -1 } = {}) {
        const closetype = me._cf.close[0];
        me.removeClose(role);
        const d = role.details.data;
        let n = 0;
        for (let i = 0; i < d.length; i++) {
            if (i % 500 === 0)
                await S.frame();
            const pi = d[i];
            for (let j = i + 1; j < d.length; j++) {
                const len = distxyz(pi, d[j]);
                if (len <= maxlen) {
                    addspring(i, j, len, str, pow, role, 1, closetype);
                    n++;
                    break;
                }
            }
        }
        console.log('me.joinClose added springs', n, role.id);
    };
    me.removeClose = function (role) {
        const closetype = me._cf.close[0];
        const l = role.springs.length;
        role.springs = role.springs.filter(s => s.type !== closetype);
        const ll = role.springs.length;
        log(`removeClose, ${l}=>${ll}, removed ${l - ll}`);
    };
    me.debug = function () { debugger; }; // way to get devtdools into tad context
    me.showpulls = function () {
        var _a;
        for (const r in tad.roles) {
            const rr = tad.roles[r];
            const pp = ((_a = rr.springs.filter(s => s.type === 'pullspring')[1]) === null || _a === void 0 ? void 0 : _a.str) + '';
            if (!pp.startsWith('0.0000104166'))
                log(r, pp);
        }
    };
} // end tadpolesystem
//var tadpoleSystem = new TadpoleSystem();
//would maybe prefer to make a fresh one when we want rather than have one persistent
//now declared in vars (as let not var) rest of system working & helped with some other experiment
tad = tadpoleSystem = new TadpoleSystem();
var Rtad = _R(tad);
//export let tads = tadpoleSystem; //this is not a module. not sure why that one export above is ok.
/** set up inverse shadows (experimental) */
tad.invshad = function (max = 0.04, s = 1000) {
    const k = 1 / s;
    setAllLots('wall_refl', 0);
    setAllLots('wall_red', k);
    setAllLots('wall_green', k);
    setAllLots('wall_blue', k);
    setAllLots('wall_irid', 0);
    setAllLots('wall_flu', 0);
    cMap.SetRenderState('walls');
    G.wall_shadowstrength = s * max;
    tad.greywall(false);
};
tad.slowdown = 3;
tad.tadrad = 1;
var GUIInit;
tad._guiinit = function () {
    GUIInit('Tadpole tester');
    const u = undefined;
    V.gui.add(S, 'defaultWait', 0, 120, 1, 'script wait time secs', 'script wait time secs').listen().nosave();
    V.gui.add(tad, 'record', u, u, u, 'record', 'record').listen().nosave();
    V.gui.add(tad, 'makevid', u, u, u, 'make video', 'make video').listen().nosave();
    if (tadkin)
        tadkin.gui();
};
/** set up gui from keys and manually */
tad.key2gui = function () {
    tad._guiinit();
    G.wall_fluwidth = 0.001; // needed for noaudio ???
    // done already tad.tune(); // make sure fields are defined
    if (searchValues.notadgui)
        return;
    // set up replacements for misunderstood words
    const replace = {
        reflect: 'reflection',
        paris: 'virus',
        be: 'b',
        bee: 'b',
        see: 'c',
        sea: 'c',
        for: '4',
        won: '1',
        // I think these are done automatically???
        one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9'
    };
    Object.assign(OrganicSpeech.replace, replace);
    // V.gui.add(G, 'stepsPerStep', -0.6, -0).step(0.01).listen().name('slowness').setToolTip('pull to right to slow movements');
    const u = undefined;
    GUISubadd(G, 'springrate', 0, 0.5, u, 'dynamics speed', 'dynamics speed\ntoo high will give instabilities');
    GUISubadd(tad, 'tadrad', u, u, u, 'tadradius', 'tadpole radius multiplier for all tadpoles');
    GUISubadd(tad, 'trackerScaling', 0, 2, u, 'tracker scaling', 'scaling of tracker movements\nhelpful when experimenting sitting');
    GUISubadd(tad, 'backboneRods', -0.1, 1.5, u, 'backbone Rods', 'use of backbone rods for free mode');
    GUISubadd(tad, 'orb', 'use orb for tracker').setToolTip('use orb for tracker');
    GUISubadd(tad, 'usetrackers', 'use trackers').setToolTip('use tracker2');
    GUISubadd(tad, 'baseTrackerSize', 0, 10, u, 'base tracker size', 'tracker display size (relative)');
    GUISubadd(tad, 'colorCyclePerMin', 0, 10, u, 'colour cycles per minute', 'colour cycles per minute');
    GUISubadd(tad, 'rotx', -0.002, 0.002, 0.00002, 'x rotation', 'x rotation (of particles)');
    GUISubadd(tad, 'roty', -0.002, 0.002, 0.00002, 'y rotation', 'y rotation (of particles)');
    GUISubadd(tad, 'rotz', -0.002, 0.002, 0.00002, 'z rotation', 'z rotation (of particles)');
    tad._savepulse = undefined;
    const xx = {
        get pulse() { return !tad._savepulse; },
        set pulse(v) {
            if (tad._savepulse) {
                copyFrom(currentGenes, tad._savepulse);
                tad._savepulse = undefined;
            }
            else {
                tad._savepulse = setAllLots('pulsescale', 0);
            }
        }
    };
    _animskel(); // make sure animskelRunning etc are defined in time to set gui
    GUISubadd(xx, 'pulse', 'toggle pulse').setToolTip('toggle pulse');
    GUISubadd(tad, 'animskelRunning', 'animate horn').setToolTip('animate horn');
    GUISubadd(inps, 'animSpeed', -2, 2, 0.02, 'animSpeed', 'animSpeed');
    GUISpacer(7);
    GUIKey('K,xno1', 'o1', 'goto obj 1', () => tad.animjump(1));
    GUIKey('K,xno2', 'o2', 'goto obj 2', () => tad.animjump(2));
    GUIKey('K,xno3', 'o3', 'goto obj 3', () => tad.animjump(3));
    GUIKey('K,xno4', 'o4', 'goto obj 4', () => tad.animjump(4));
    GUIKey('K,xno5', 'o5', 'goto obj 5', () => tad.animjump(5));
    GUIKey('K,xno6', 'o6', 'goto obj 6', () => tad.animjump(6));
    GUIKey('K,xno7', 'o7', 'goto obj 7', () => tad.animjump(7));
    GUIFinishPanel();
    if (G.pullskelforce === undefined)
        G.pullskelforce = 0;
    G.pullskelscale = 1; // so we can add the gui
    GUISubadd(G, 'pullskelforce', 0, 1, u, u, 'pull to dynamic skeleton');
    GUISubadd(G, 'pullskelscale', 0, 2, u, u, 'dynamic skeleton scale');
    GUISubadd(G, 'noisefieldforce', 0, 0.1, u, u, 'force for noise field');
    const csgui = sgui;
    onframe(() => csgui.add(tad.RF, 'backbone', 0, 1, 0.01, 'backbone strength', 'strength of backbone'), 20);
    // ~~~~~~~~~~~~
    GUINewsub('randbait');
    const bbb = [6,
        { func: () => tad.randbait({ allow: true }), tip: "random bait test\nwith parameters below", text: 'rand' },
        { func: () => tad.randbait({ allow: true, n: 3, twist: 0.21, twistD: 0.1, attr: -0.01, pow: -3 }), tip: "random bait test 2", text: 'rand 2' },
        { func: () => tad.randbait({ allow: true, n: 4, twist: 0.1, twistD: 0.1, attr: -0.01, pow: -4 }), tip: "random bait test 3", text: 'rand 3' },
        { func: () => tad.randbait({ allow: true, n: 5, twist: 0.4, twistD: 0.1, attr: -0.01, pow: -3 }), tip: "random bait test 4", text: 'rand 4' },
        { func: () => tad.randbait({ allow: true, n: 8, twist: 1.41, twistD: 0.1, attr: -0.01, pow: -5 }), tip: "random bait test 5", text: 'rand 5' },
        { func: () => {
                // get rid of (most) other forces and tune bait ones
                G.coreAttractForce = G.coreTwistForce = G.coreChangeForce = G.coreVelocityForce = 0;
                G.springCentreDamp = 0.9995;
                G.noisefieldforce = 0;
            }, tip: "clear other forces", text: 'pure bait' }
    ];
    sgui.addImageButtonPanel(...bbb).setRowHeight(0.100);
    GUISubadd(tad.rb, 'n', 0, 8, 1, 'num').setToolTip('number of bait').onChange(() => tad.randbait());
    GUISubadd(tad.rb, 'twist', 0, 1, 0.01, 'twist').setToolTip('twist strength').onChange(v => { for (let i = 0; i < tad.rb.n; i++)
        U.twist[i] = randrange(v); });
    GUISubadd(tad.rb, 'twistD', 0.01, 0.5, 0.01, 'twistD').setToolTip('twist offset').onChange(v => U.twistD.fill(v));
    GUISubadd(tad.rb, 'attr', -0.1, 0.1, 0.001, 'attr').setToolTip('attraction of bait').onChange(v => { for (let i = 0; i < tad.rb.n; i++)
        U.baitAttractStrength[i] = randrange(v); });
    GUISubadd(tad.rb, 'pow', -5, -1, 0.1, 'pow').setToolTip('power trailoff of twist').onChange(v => G.randPow = v);
    const bbc = [5,
        { func: () => { G.wallStr = 100; G.tadWrap = 0; }, tip: "fairly robust wall", text: 'wall' },
        { func: () => { G.wallStr = 1e6; G.tadWrap = 0; }, tip: "very robust wall", text: 'strong wall' },
        { func: () => { G.wallStr = 0; G.tadWrap = 1; }, tip: "wrap room edges", text: 'wrap' },
    ];
    sgui.addImageButtonPanel(...bbc).highlightLastPressed().setRowHeight(0.100);
    // in transitions ... GUISubadd(tad, 'transitionTimeSecs', 0, 60, 0.1, 0.1, 'transition time (seconds)');
    // ~~~~~~~~~~~~
    GUINewsub('leeds');
    tad.leedsgui(sgui);
    // ~~~~~~~~~~~~
    GUINewsub('oldcontrols');
    GUISubadd(tad, 'twistRate', u, u, u, u, 'speed of twist');
    GUISubadd(tad, 'twistDampHalf', u, u, u, u, 'halflife of twist');
    GUISubadd(tad, 'excludeSpeedThresh', u, u, u, u, 'lowest speed to use as exclude');
    GUISubadd(tad, 'maxXsphereRadius', u, u, u, 'exclude radius', 'exclusion radius');
    // ~~~~~~~~~~~~
    GUINewsub('syscontrols');
    GUISubadd(S, 'rampTime', 0, 5000, 10, 'time for transition ramp. millesec');
    GUISubadd(tad, 'slowdown', 0.5, 5, 0.01, 'slowdown', 'pull to right to slow movements');
    GUISubadd(renderVR, 'ratio', 0.3, 1, 0.01, 'vr res', 'render VR scale relative to standard');
    GUISubadd(G, 'wall_fluwidth', 0, 0.003, 0.0002, 'width of wall flu stripe');
    G.light0s = 0.368;
    G.light1s = 0.903;
    G.light2s = 0.07;
    GUISubadd(G, 'light0s', 0, 1, 0.001, 'light 0 strength');
    GUISubadd(G, 'light1s', 0, 1, 0.001, 'light 1 strength');
    GUISubadd(G, 'light2s', 0, 1, 0.001, 'light 2 strength');
    GUISubadd(tad, 'continuousActive', u, u, u, 'allow automatic flow to new objects');
    GUISubadd(tad, 'isInteract', u, u, u, '(pseudo)controller interaction on/off');
    GUISubadd(springs, 'isRunning', u, u, u, 'control spring running state');
    GUISubadd(tad, 'useDists', u, u, u, 'use distances where possible (horns)');
    GUISubadd(tad, 'flowFirst', u, u, u, 'checked flow from first tad, else flow from last');
    GUISubadd(OrganicSpeech, 'isRunning', u, u, u, 'listen', 'listen to commands on microphone').name('speechRunning');
    // panelHeight = 0.15; // panel height
    GUIFinishPanel();
    VH.positionGUI();
};
// called every frame to slow down various features
tad.slow = function () {
    if (!tad.continousWait)
        return; // not ready yet
    if (!tad.slowbase)
        tad.slowbase = { sps: G.stepsPerStep, cwsk: tad.continousWaitSkel, cw: tad.continousWait, fr: tad.flowRate };
    const z = tad.slowbase;
    const r = tad.slowdown;
    G.stepsPerStep = z.sps / r;
    tad.continousWaitSkel = z.cwsk,
        tad.continousWait = z.cw * r;
    tad.flowRate = z.fr / r;
};
tad.recordReady = function () {
    setTimeout(() => fullscreen(), 1000);
    nomess();
    HW.resoverride.lennum = 0; // was set for alignment, not relevant right now
    setInput(W.renderRatioUi, 1 / 2);
    setInput(W.resbaseui, 12);
    // ??? also cMap.fixres ???
    V.gui.visible = false;
};
tad.recordOff = function () {
    nomess('release');
    setInput(W.renderRatioUi, 1);
    setInput(W.resbaseui, 10);
    V.gui.visible = true;
};
tad.oksave = 0;
tad.badsave = 0;
tad.framesPerSave = 1; // now we are using websocket file write 1 should be fine
tad.presave = 'postspringstep';
tad.whensave = 'animateStart';
var AsyncReadPixels; // work in progress, this will be named sensibly soon
tad.getpos = function (tadn) {
    return springs.getpos().slice(tadn * tad.RIBS, (tadn + 1) * tad.RIBS);
};
tad.getsprings = function (tadn) {
    return springs.pairsfor(tadn * tad.RIBS, tad.RIBS);
};
tad.prepsave = function (framesPerSave = tad.framesPerSave) {
    tad.framesPerSave = framesPerSave;
    const channels = 4, saves = 2, bytes = 4, fps = 60;
    if (!tad.springbuffer)
        tad.springbuffer = new Float32Array(springs.numInstances * channels);
    tad.floatsperframe = springs.numInstances * channels * saves + 1; // 2 saves for springs and tadprop, +1 for time
};
tad._record = false;
Object.defineProperty(tad, 'record', {
    get: () => tad._record,
    set: v => { tad._record = v; (v ? tad.startsave : tad.stopsave)(); }
});
tad._makevid = false;
Object.defineProperty(tad, 'makevid', {
    get: () => tad._makevid,
    set: v => { tad._makevid = v; (v ? tad.tadsave : tad.stoprestore)(); }
});
tad.savekeys = {
    SPRINGS: { skey: '>>>s' },
    PROPS: { skey: '>>>p' },
    GENES: { skey: '>>>g' },
    COLS: { skey: '>>>c' },
    WALL: { skey: '>>>w' },
    EXTRAS: { skey: '>>>x' },
    ENDFRAME: { skey: '>>><' },
    ENDFILE: { skey: '>>>!' }
};
const _encoder = new TextEncoder();
for (const k in tad.savekeys) {
    const ss = tad.savekeys[k];
    ss.u8key = _encoder.encode(ss.skey);
    if (ss.u8key.length !== 4)
        serious('bad makehead', ss.skey);
    ss.head = new Uint32Array(2);
    const u8 = new Uint8Array(ss.head.buffer);
    u8.set(ss.u8key);
    ss.enckey = ss.head[0];
}
tad.startsave = async function (id, framesPerSave = tad.framesPerSave) {
    if (id === undefined) {
        const cc = tad.T.slice(-1)[0].role.sid;
        id = prompt('enter filename for tad save file', cc + frametime.toFixed());
        S.trigger('mouseup'); // prompt has 'hidden' the mouse up and confused dataguivr
        if (id === null)
            return;
        if (id === '')
            id = 'test ' + frametime.toFixed();
    }
    WA.enterfullscreen();
    await S.frame(20);
    tad.lastSaveId = id;
    if (!tad.asread)
        tad.asread = new AsyncReadPixels(renderer);
    if (tad.maestrosaveid)
        return log('tad alaready saving');
    tad.ws = new WebSocket(`ws://${location.hostname}:57778`);
    tad.ws.binaryType = 'arraybuffer';
    tad.prepsave(framesPerSave);
    const allocspace = tad.floatsperframe * framesPerSave;
    const allocbuff = new Float32Array(allocspace);
    const encoder = new TextEncoder();
    // make a header, type+length
    // todo: greywall, background
    // ? other uniforms: xx = showUniformsUsed().all.filter(v => U[v] !== G[v])
    let colsent = 0; // keep track of whether COL has changed
    let renderstate = '?'; // keep track of cMap.renderState
    function writeseg(type, pdata = undefined) {
        const data = ArrayBuffer.isView(pdata) ? pdata :
            typeof pdata === 'object' ? encoder.encode(JSON.stringify(pdata)) :
                typeof pdata === 'string' ? encoder.encode(pdata) :
                    pdata === undefined ? undefined :
                        serious('Unexpected data to writeseg', pdata);
        type.head[1] = data === undefined ? 0 : data.byteLength;
        tad.ws.send(type.head);
        if (data !== undefined)
            tad.ws.send(data);
    }
    tad.ws.onopen = function () {
        tad.framestart = framenum;
        tad.framestarttime = frametime;
        G._fixtime = 0;
        tad.ws.send(getdesksave('tadsaves', id) + id + '.tadsave'); // first packet is filename
        GX.savegui(getdesksave('tadsaves', id) + id + '.settings');
        tad.maestrosaveidP = Maestro.on(tad.presave, function tadPrepSpringRead() {
            tad.asread.prep(springs.posNewvals);
            //? tad.readspringsPromise = readWebGlFloatAsync(springs.posNewvals);
        });
        //? renderer.setAnimationLoop(null);
        //? requestAnimationFrame(animateNum);
        tad.maestrosaveid = Maestro.on(tad.whensave, async function tadSaveFrame() {
            // await sleep(0);
            //? renderer.setAnimationLoop(null);
            tad.framenum++;
            // readWebGlFloat(springs.posNewvals, {buffer: tad.springbuffer});
            // renderer.readRenderTargetPixels(springs.posNewvals,0,0,1,springs.numInstances, tad.springbuffer)
            tad.asread.finish(tad.springbuffer);
            //?tad.springbuffer = await tad.readspringsPromise;
            const kk = tad.savekeys;
            if (tad.oldSave) {
                allocbuff.set(tad.springbuffer, tad.bufferpos);
                tad.bufferpos += tad.springbuffer.length;
                allocbuff.set(tad.tadprop, tad.bufferpos);
                tad.bufferpos += tad.tadprop.length;
                allocbuff[tad.bufferpos - 1] = G.time;
                tad.bufferpos++;
                if (tad.framenum % framesPerSave === 0) {
                    if (tad.bufferpos !== allocbuff.length)
                        tad.owow('wrong framebuffer filling');
                    // todo save to user directory (eg desktop/organicsaves)
                    // tad.savex('tadsaves/' + id + '_' + (tad.framenum - framesPerSave) + '.tadsave'); // <<< todo new websocket with extra server support
                    tad.ws.send(allocbuff);
                    tad.reqsaves++;
                    tad.bufferpos = 0;
                }
                msgfix('tadsave', `pending ${tad.reqsaves - tad.oksave} ok ${tad.oksave} bad ${tad.badsave} `);
            }
            else { // new style
                writeseg(kk.GENES, G);
                writeseg(kk.SPRINGS, tad.springbuffer);
                writeseg(kk.PROPS, tad.tadprop);
                if (COL.numSent > colsent)
                    writeseg(kk.COLS, COL.array);
                if (renderstate !== cMap.renderState) {
                    renderstate = cMap.renderState;
                    writeseg(kk.WALL, renderstate);
                }
                writeseg(kk.EXTRAS, { bigcol, usegreywall: tad.useGreyWall });
                writeseg(kk.ENDFRAME);
            }
            //?requestAnimationFrame(animateNum);
        });
        tad.framenum = 0;
        tad.reqsaves = 0;
        tad.oksave = tad.badsave = 0;
        tad.bufferpos = 0;
    }; // end onopen
    springs.start();
}; // end startsave
// tad.makewalls = function(s = tad.covdef) {
//     if (s) cMap.boxtdef = {x: s.w/2, y:s.h, z: s.d/2, fixFloor: FIRST(s.fixFloor, -0.001)};
//     if (!deferRender) cMap.newmesh();
// }
tad.makewalls = function (s) {
    tad.covidSetScene(s);
};
tad.stopsave = function () {
    if (!tad.maestrosaveid)
        return (log('tad.stopsave when stopped'));
    Maestro.remove(tad.whensave, tad.maestrosaveid);
    Maestro.remove(tad.presave, tad.maestrosaveidP);
    tad.ws.send(tad.fileendhead);
    tad.frames = framenum - tad.framestart;
    tad.frametime = frametime - tad.framestarttime;
    log('frames', `${tad.frames} in ${tad.frametime.toFixed()} for ${(tad.frames / tad.frametime * 1000).toFixed(2)}fps`);
    Maestro.remove('preframe', tad.maestrosaveid);
    tad.maestrosaveid = tad.maestrosaveidP = 0;
    tad.ws.close();
    //? renderer.setAnimationLoop(animateNum);
};
tad.runtadsave = function (file) {
    const name = file.name.pre('.');
    tad.lastSaveId = name;
    tad.tadsave({ id: name });
};
fileTypeHandlers['.tadsave'] = tad.runtadsave;
tad.runtadsave.rawhandler = true;
/** run restoresave with override graphics */
tad.tadsave = async function ({ id = tad.lastSaveId, k4 = false, lennum = 200, rr = 2, showonly = false } = {}) {
    if (!id)
        return msgfixerror('no id to tad.tadsave');
    tad._makevid = true;
    const save = [width, height, resoverride.lennum, inps.renderRatioUi, V.camscene.visible, V.nocamscene.visible];
    const restore = () => {
        [width, height, resoverride.lennum, inps.renderRatioUi, V.camscene.visible, V.nocamscene.visible] = save;
        setSize(width, height);
        tad._makevid = false;
    };
    const dir = getdesksave('tadsaves', id);
    const imdir = getdesksave('tadsaves', id, 'images');
    // getdesksave('tadsaves', id, 'tadsave');
    FrameSaver.saveHelpers(dir);
    GX.restoregui(getdesksave('tadsaves', id) + id + '.settings');
    S.jump();
    await S.frame(20);
    const k = k4 ? 2 : 1;
    setSize(1920 * k, 1080 * k);
    resoverride.lennum = lennum;
    inps.renderRatioUi = 1 / rr;
    V.camscene.visible = false;
    V.nocamscene.visible = false;
    try {
        await tad.restoresave({ id, showonly });
    }
    finally {
        restore();
    }
};
/** inefficient test version */
tad.restoresave = async function ({ id = tad.lastSaveId, frames = [0, Infinity], showonly = false }) {
    const dir = getdesksave('tadsaves', id);
    const imdir = getdesksave('tadsaves', id, 'images');
    tad.restoreFrames = frames;
    tad.prepsave();
    const size = readdir('/!' + dir)[id + '.tadsave'].size;
    tad.framesRecorded = size / (tad.floatsperframe * 4);
    tad.wsread = new WebSocket(`ws://${location.hostname}:57778`);
    tad.wsread.binaryType = 'arraybuffer';
    tad.wsread.onmessage = function (buff) {
        tad.abuff = buff.data;
        S.trigger('messageReady');
    };
    frames[1] = Math.min(frames[1], tad.framesRecorded);
    frames[2] = size;
    springs.stop();
    tad.wsread.onopen = async function () {
        tad.wsread.send('?' + dir + id + '.tadsave'); // first packet is filename, ? for read mode
        WA.tadRenderLoop(dir, frames, showonly);
    };
    tad.restoreid = id;
    await S.waitEvent('loopdone');
    tad._makevid = false;
    // if we want to allow for irregular frames during record, see
    // https://stackoverflow.com/questions/30453276/ffmepg-video-from-uneven-sequence-of-png-images
    const cmd = `runffmpeg.cmd "${dir.replace(/\//g, '\\')}" 60 000000`;
    log('tad.restoresave making video: ', cmd);
    runcommandphp(cmd);
    tad.restoreid = undefined;
    tad.restoreFrames = undefined;
    springs.start();
    G._fixtime = 0;
    // todo: connect to record software
    // todo: use frames so consistent across runs, probably extra save data
    // todo: ??? read ahead as well so buffer ready in plenty of time, not that important for intended slow render/make video usage
    // todo: stop continuousActive and interaction on playback
    // todo: arrange reset of G-_fixtime etc later
    // todo: correct smoothed radius
    // todo: ? new websocket with extra server support
    // todo: save to user directory
    // todo:
};
tad.stoprestore = function () {
    if (tad.restoreFrames)
        tad.restoreFrames[1] = 0;
    tad._makevid = false;
};
/*
connect to director/record
... no, instead connect to frameSaver, should be cleaner ...

TURN OFF GUI ETC
D = Director
kkk = framesRecorded = 3036
D.inbetween = function(p) { k = Math.floor(p*kkk); log('frame ' + k); tad.restoresave('test', [k, k+1]) }
// beware, restoresave is async

D.fps = 60
setInput(animlen, kkk/D.fps)
D.renderStart = 0
D.setframe(.4)
// D.step(1)

frameSaver.prev = {_recordTime: -999, _rot4_ele: []}
frameSaver.next = {_recordTime: -999, _rot4_ele: []}

frameSaver.saveframe = 0
frameSaver.renderDirectory = '.'
Director.record(true); frameSaver.quickout= true;



// scrubbing
everyframe( () => {if (mousewhich === 8) D.setframe(lastdocx / width) })

*/
// space in tb for secs secs saving
tad.spacex = function (secs) {
    const channels = 4, saves = 2, bytes = 4, fps = 60;
    return (springs.numInstances * channels * saves * bytes * fps * secs) / 1e9;
};
/*
kkkk = everyframe(() => {if (framenum % 10 === 0) tad.savex()}); tad.framestart = framenum; tad.oksave = tad.badsave = 0;
Maestro._callbacks.preframe.pop(); tad.frameend = framenum; log('frames', tad.frameend - tad.framestart, tad.oksave)

*/
// if (searchValues.noaudio)
//     onframe(tad.tad, 10);
tad.maxsprings = () => new Array(numInstances).fill(0).reduce((c, _v, i) => { let j = springs.pairsfor(i).length; return j > c[1] ? [i, j] : c; }, [0, 0]);
/** w.i.p
float dist_to_segment_squared(float px, float py, float pz, float lx1, float ly1, float lz1, float lx2, float ly2, float lz2) {
    float line_dist = dist_sq(lx1, ly1, lz1, lx2, ly2, lz2);
    if (line_dist == 0) return dist_sq(px, py, pz, lx1, ly1, lz1);
    float t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1) + (pz - lz1) * (lz2 - lz1)) / line_dist;
    t = constrain(t, 0, 1);
    return dist_sq(px, py, pz, lx1 + t * (lx2 - lx1), ly1 + t * (ly2 - ly1), lz1 + t * (lz2 - lz1));
  }
*/
tad.exhiballowed = 'Enter Z Home'.split(' '); // keys that are allowed even when for exhibspecial
/** arrange covid exhibition */
tad.onkeydown = function (evt) {
    let k = evt.code;
    if (k.startsWith('Key'))
        k = k[3].toUpperCase();
    if (tad.exhiballowed.includes(k))
        return runkeys(k);
    switch (k) {
        case 'S':
            addscript(tad.defaultScript);
            break;
        case 'B':
            addscript('JS/leedsBackground.js');
            break;
        case 'X':
            if (evt.ctrlKey)
                tad.exhibspecialEnd();
            break;
        case 'W': tad.trackerScaling = 1.5;
        case 'H': {
            msgfix.hideall();
            msgfix.show('dancedemo');
            nomess.msgvisible = !nomess.msgvisible;
            W.msgbox.style.display = nomess.msgvisible ? '' : 'none';
        }
        case 'Control': break;
        default: tad.owow('key not known in tad.exhibspecial mode', k);
    }
};
tad.onkeyup = function (evt) { };
tad.exhibspecial = function () {
    document.onkeydown = tad.onkeydown;
    document.onkeyup = tad.onkeyup;
    nomess();
    V.gui.visible = false;
    onframe(() => V.gui.visible = false, 10);
    setInput(WA.menuAutoOpen, false);
    EX.startToFront();
    document.body.style.cursor = 'none';
};
tad.exhibspecialEnd = function () {
    document.onkeydown = dockeydown; // chrome does not 'see' onkeydown for some elements, including our canvas
    document.onkeyup = dockeyup;
    nomess('release');
    V.gui.visible = true;
    setInput(WA.menuAutoOpen, true);
    EX.stopToFront();
    document.body.style.cursor = '';
};
/** debug code to check strengh of pullsprings on one or all roles   */
tad.checkpulls = function (role) {
    if (!role) {
        const r = {};
        for (let rn in tad.roles)
            r[rn] = tad.checkpulls(tad.roles[rn]);
        return r;
    }
    const springs = role.springs;
    const ps = springs.filter(x => x.type === 'pullspring');
    let min = Infinity, max = 0, n = 0;
    for (const s of ps) {
        min = Math.min(min, s.str);
        max = Math.max(max, s.str);
        n++;
    }
    return { min, max, n };
};
/** show the colours used by different roles */
tad.showcolours = function () {
    for (const rn in tad.roles) {
        const role = tad.roles[rn];
        const props = role.roleprops;
        const s = new Set();
        for (let i = 1; i < role.numtads * tad.RIBS * 4; i += 4)
            s.add(props[i]);
        log(rn, Array.from(s).sort((a, b) => a - b));
    }
};
/** display the 32 colours */
tad.displaycolours = function (rad = 10) {
    GX.getgui(/model/).press();
    G.a_pulsescale = 0;
    G.a_pulsemax = rad;
    tad.tadprop.fill(0);
    for (let i = 0; i < COL.NUM; i++) {
        const x = (i % 8 - 4) * 0.4, y = (3 - floor(i / 8)) * 0.4 + 0.2, z = 0;
        tad.displayTad(i, { orb: true, x, y, z, rad, col: i });
    }
};
/** patch the colours used by different roles into range l to h
 * temporary while reviewing colour assignment
 */
tad.patchcolours = function (l = 16, h = 31) {
    const range = h - l + 1;
    for (const rn in tad.roles) {
        const role = tad.roles[rn];
        const props = role.roleprops;
        for (let i = 1; i < props.length; i += 4)
            props[i] = (props[i] - l + range * 4) % range + l;
    }
};
// var COL, dateToFilename, writetextremote, readbinaryasync;
COL.save = function (fid = dateToFilename('settings/col', '.colourbin')) {
    localStorage.colarray = COL.array;
    if (fid)
        writetextremote(fid, COL.array);
};
/** read data for horn saved colour file
May go away if all .colourbin files are merged into .skelj ones */
tad.colread = async function (fid) {
    const bdata = await readbinaryasync(fid);
    const data = new Float32Array(bdata);
    return data;
};
/** load colour data derived from horn, so allow offset
 * the data may be provided in bdata (eg from previously read and stored data, or read from file fid.)
 */
tad.colload = async function (bdata, fid, fromstart = 3, tostart = tad.COLSAFE, num = tad.COLNSAFE) {
    const cdata = bdata || await tad.colread(fid);
    const data = new Float32Array(cdata);
    const p = COL.PARMS;
    // COL.array.subarray(0).set(data.subarray(0, p));
    COL.array.subarray(tostart * p).set(data.subarray(fromstart * p, (fromstart + num) * p));
    COL.send(true);
    await S.frame(5); // in case loaded at same time as skeleton
    tad.coltexscale(tostart, num);
};
tad.coltexscale = function (tostart = 0, num = COL.NUM) {
    const k = tad.T[tad.T.length - 1].role.details.autoscale;
    if (k)
        for (let n = tostart; n < tostart + num; n++) {
            let t = COL.get('texscale', n);
            if (t > 1)
                COL.set('texscale', n, t * k);
            t = COL.get('bumpscale', n);
            if (t > 1)
                COL.set('bumpscale', n, t * k);
        }
    COL.send(true);
};
WA._binfiles.push('.colourbin');
fileTypeHandlers['.colourbin'] = (...a) => tad.colload(...a);
// tad.animskelRunning = false;
var dstringGenes, getHornSet;
function _animskel() {
    let usegenes, ggg, ggskel, genes;
    function setup() {
        scaleGpuPrep(true);
        springs.newmat(); // not quite sure why this is needed
        // ogenes = copyFrom({}, G);
        runkeys('K,H,4');
        runkeys('K,,'); // get some interesting lenghts and radii
        // get data
        const fid = 'gallery/GalaxRefl2023Nov03.oao';
        const data = getfiledata(fid);
        ggg = tad.ggg = dstringGenes(data);
        genes = ggg.genes;
        //??? todo use enterHorncontext
        // save standard skelbuffer and make new one
        const ssskel = skelbuffer;
        skelbuffer = undefined;
        //ggg1 = ggg.slots[1].dispobj.genes
        //ggg2 = ggg.slots[2].dispobj.genes
        // make sure uniforms set up before the shader is generated
        for (const gn in genes) {
            if (!(gn in uniforms)) {
                if (typeof genes[gn] !== 'number')
                    console.log('unexpected gene in tad.animskel', gn, genes[gn]);
                adduniform(gn, genes[gn], 'f', 'dynskel');
            }
            U[gn] = genes[gn];
        }
        renderskelbuff(genes);
        ggskel = ggg.ggskel = skelbuffer; // remember our new skelbuffer
        ggskel.name = 'dynskelbuffer';
        skelbuffer = ssskel; // and restore
        U.pullskelbuff = ggskel.texture;
        //G.pullskelforce = 0.2 // leave to animskelRunning set:
        //G.pullspringforce = 0 // leave to animskelRunning set:
        G.pullskelscale = 1;
        G.coreAttractForce = 0.00005;
        U.pullskelwidth = 8;
        inps.animSpeed = 0.7;
        tad.useanimstep = true;
        GX.setValue(/baitattractstrength\/factor/, 0);
        // newgenes = objdiff(G, ogenes)
        const hornnames = Object.keys(getHornSet(ggg.genes).horns);
        usegenes = {};
        for (const gn in ggg.genedefs) {
            const pre = gn.pre('_');
            if (ggg.genedefs[gn].tag === 'geom' && hornnames.includes(pre) && !gn.endsWith('_ribs') && !gn.includes('_S_') && gn in uniforms) {
                usegenes[gn] = ggg.genedefs[gn]; /// ??? ggg.genedefs
                usegenes[gn].activerate = () => 1;
            }
        }
    } // setup
    // perform single cycle of dynamic change
    function dynchangeCycle() {
        const save = [skelbuffer, currentGenes, genedefs];
        if (usegenes === undefined)
            setup();
        try {
            tad.ggskel = skelbuffer = ggskel;
            currentGenes = genes;
            // genedefs = usegenes
            if (tad.useanimstep)
                animStep(false, usegenes);
            // genesToCam(); // camera not used for skeleton
            // renderskebuff and gene->uniforms are performed as side-effect of gpuScaleNow
            // Not only do we not want it to run twice for performance reasons,
            // letting it run twice gives some odd misplaced and unexplained long spearlike tadpoles.
            // renderskelbuff(genes);
            gpuScaleNow(genes, 'now', 0.9); // this gets in below inps.NOSCALE etc???
        }
        finally {
            [skelbuffer, currentGenes, genedefs] = save;
            setObjUniforms(currentGenes, uniforms);
        }
    }
    let mkey;
    tad.pullskelforcePend = 0.2;
    Object.defineProperty(tad, 'animskelRunning', {
        set: v => {
            if (v) {
                if (mkey === undefined)
                    mkey = Maestro.on('preframe', () => dynchangeCycle());
                if (G.pullskelforce === 0)
                    G.pullskelforce = tad.pullskelforcePend || 0.2;
                tad.pullspringforcePend = G.pullspringforce;
                G.pullspringforce = 0;
            }
            else {
                if (mkey !== undefined) {
                    Maestro.remove('preframe', mkey);
                    mkey = undefined;
                }
                if (G.pullspringforce === 0)
                    G.pullspringforce = tad.pullspringforcePend;
                tad.pullskelforcePend = G.pullskelforce;
                G.pullskelforce = 0;
            }
        },
        get: () => !!mkey
    });
    // jump to one of the ggg slots
    tad.animjump = async function (n) {
        if (!(ggg === null || ggg === void 0 ? void 0 : ggg.genes))
            return;
        copyFrom(ggg.genes, ggg.slots[n].dispobj.genes, usegenes);
        const s = G.pullskelforce;
        G.pullskelforce = 100;
        await S.frame(5);
        G.pullskelforce = s;
    };
}
/*
Some colour assignments
tadfree: 14..huge (in tadshape())
covid: 13..22
new horns: 3..16
old horns: 3..31
SV40: 16..18 (60 kit    es, 60 rhombs, 30 rhombs)
HSV1: 16..25 (12 pentagons, 150 hexagons (3 lots), 320 triangles (6 lots))
PAV: 16..75 (60 trianlges)
TRSV: 16..75 (60 kites)
MS2: 16..17 (60 rhombs, 30 rhombs)

tree: 23..33 (less for some trees)

dancerX/glyph: 0..1
glyph end (?baton?): 3
classic independent: 4..11 colours with white for orb etc

redtail: 31

tadkin.mancol: 11,12,13,14,15 (mancol and mancolnum)
wall: 2

*/
// // sao won't work for Organic renderer for now 13/10/2021
// tad.saoParms = {
//     output: 0,
//     saoBias: 0.5,
//     saoBlur: true,
//     saoBlurDepthCutoff: 0.01,
//     saoBlurRadius: 16,
//     saoBlurStdDev: 4,
//     saoIntensity: 0.2, // 1, // 0.18,
//     saoKernelRadius: 100,
//     saoMinResolution: 0,
//     saoScale: 1
// }
// tad.sao= function() {
//     ambientOcclusionInit();
//     rrender.effects.saoPass.setSize(1024, 1024);
//     copyFrom(rrender.effects.saoPass.params, tad.saoParms);
// }
/* collect relevant controls for 10 may 2022 demo
noisefieldforce
all from twisttest
    twtestgui.add(G, 'coreTwistForce', 0, 0.1, 0.001, 'coreTwistForce', 'coreTwistForce').listen(); // defalt 0.025
    twtestgui.add(G, 'coreTwistD', 0, 0.5, 0.01, 'coreTwistD', 'coreTwistD').listen();
    twtestgui.add(G, 'twistPow', -5, 0, 0.01, 'twistPow', 'twistPow').listen();
    twtestgui.add(me, 'dotadtwistpull', 0, 2, 0.01, 'twistPull', 'how twist applies to skeleton of forms').listen();
NO, old, leave at 0: tadkin.coreMoveRot to enable core movement to twist skeleton/pullspringmat (multiplied by tadkin.dotadtwistpull)
tadkin.dotadtwistpull kinect core twist force,

NOT
pullTwistForBait
tad.baitSkelExtraRot

relatedness as per paper
r = async function(a,b) {
    v = await xfetch(`https://api.conceptnet.io/relatedness?node1=/c/en/${a}&node2=/c/en/${b}`);
    j = (await v.json()).value;
    return j
}


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ notes for restore sensible interaction 16 Feb 2023
2 Mar, pullSprings default strength (before divide by #particles) 0.001 => 1, for tree, space, torus, ...
pullspringforce order 1e5, 1e6, on tree15
pullspringforce 1e3 on bowl5, or 7e2
G.pullspringforce = 7e2
G.powBaseDist = 4 => 1
? U.roleforces[11]

*/ 
//# sourceMappingURL=tadpole.js.map