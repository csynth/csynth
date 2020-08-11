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
        }); // this.thing.applyProp has extra funciton level?
        const rr = this.raw.length;
        this.events.trigger('push', rr); //TODO better argument passing
        return rr;
    }
    pop() {
        const r = this.raw.pop();
        this.events.trigger('pop', r);
        return r;
    }
}
// export var tadpoleSystem;
function TadpoleSystem() {
    var T = []; // list of current active things
    var TR = {}; // set of roles
    let events; // = MEvents();
    //constructor() {}
    // const me:{defaultStrength, fixscale, GROUP, WRISTLEN, WRISTSSTR, TADLEN, TADSTR, extramouse} = this;
    const me = this;
    let RIBS = 8, RESERVED = 4, HEADS, TADS = -1, SKELENDS = 0, KPARTICLES, KPARTICLESP2, numInstances;
    const MAX_DEFS_PER_PARTICLE = 32; // definitions allowed per particle
    const APOS_DEFS_PER_PARTICLE = MAX_DEFS_PER_PARTICLE * 4; // array slots, each definition is 4 array slots
    me.T = T;
    me.TR = TR;
    me.defaultStrength = 250000;
    me.fixscale = 1.5;
    me.GROUP = 3;
    me.WRISTLEN = 0; // distance to keep from wrist
    // me.WRISTSSTR = 100;
    me.TADLEN = 0.08; // length of tadpole
    me.TADSTR = 10;
    let tadprop; // array for properties, sets of 4, radii, colid, ?, ?
    me.tailpuffnum = 1; // number of particles to puff
    me.tailpuff = 2.5; // factor to puff last particle of tail
    me.extramouse = { mode: 0 };
    let things;
    let roles = me.roles = {};
    me.swapTime = 15000;
    me.swapRate = 100;
    let springset; // keep track of used slots in spring topology for each particle
    me.tadpow = 1; // power for generated roles/things
    // let attthing: Thing, repthing: Thing;   // things for attractors/repellors
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
        const thing = { role, springs, map: new TadkeyMap([]),
            applyThing: () => applyThing(thing), applyProp: (tid, mapid) => applyProp(thing, tid, mapid) };
        thing.map.thing = thing;
        things.push(thing);
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
    function applyThing({ role, springs: tsprings, map }) {
        if (map.length === 0)
            return; // do not waste time on 'inactive' things
        // We may want to consider changed structures if we find we have several things
        // with a large number of potential (role.springs) tadpoles but small but non-empty maps.
        //
        const rawMap = map.raw;
        const str = G[role.id]; // this will become more Thing based
        if (str === 0)
            return;
        // const rolenum = role.rolenum;    // not used, handed other ways
        const sta = springs.topologyarr;
        const maxpp = springs.SPEND * 4;
        tsprings.forEach(function makeRealSprings(r) {
            const [at, bt] = [r.at, r.bt];
            const att = rawMap[at[0]];
            const btt = rawMap[bt[0]];
            if (att === undefined || btt === undefined)
                return;
            // change below is minor optimization, but may significantly reduce garbage
            // by avoiding short list/tuple constuction
            if (r.type === 'pullspring') {
                springs.addpull((att * RIBS + at[1]), r.x, r.y, r.z, r.str);
            }
            else {
                // springs.setslot((att*RIBS + at[1]), (btt*RIBS + bt[1]), r.len, r.str * str, r.pow, rolenum)
                // optimize the setslot code.
                // This version will permit multiple springs between a and b; unlike setslot.
                const p = att * RIBS + at[1]; // particle a
                const pp = springset[p]; // array pos to use within particle
                if (pp >= maxpp)
                    return; // too many springs, give up without comment
                let s = p * APOS_DEFS_PER_PARTICLE + pp; // array slot
                const bi = btt * RIBS + bt[1]; // particle b
                const bp = (bi + 0.5) / KPARTICLESP2; // + rolenum;   // convert to internal form.  parti2p(bi) + type ... don't need rolenum here
                sta[s++] = bp; // fill in the array positions
                sta[s++] = r.len;
                sta[s++] = r.str * str;
                sta[s++] = r.pow;
                springset[p] += 4;
            }
        });
        // // remap the properties from Role.roleprops into tadprop, test version to verify dynamic version correct
        // if dynamics correct, calling this shouldn't make any difference
        me.TESTapplyProps = function applyProps() {
            const rats = 4 * RIBS; // # properties per tadpole
            const rmap = map.raw;
            for (let i = 0; i < rmap.length; i++) { // i index into rats entries in roleprops
                const tid = rmap[i]; // tid index into rats entries in tadprop
                if (tid !== undefined) {
                    tadprop.set(role.roleprops.slice(i * rats, (i + 1) * rats), tid * rats);
                }
            }
        };
        // applyProps();
    }
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
            tadprop[to + 1] = fromarr[from + 1]; // colid
            tadprop[to + 2] = fromarr[from]; // radius again, as target
            tadprop[to + 3] = fromarr[from + 3]; // ribs
            to += 4;
            from += 4;
        }
    }
    me.radHalflife = 2; // halflife for radius smoothing, seconds
    msgfix('!Things', () => T.map(t => [t.role.id, t.map.length]).join(' ')); //  lazy output of message
    const curpos = VEC3();
    me.fixpose = function () {
        if (renderer.vr.pose) {
            curpos.addVectors(me.fixpos, renderer.vr.pose.transform.position);
            G._camx = curpos.x;
            G._camy = curpos.y;
            G._camz = curpos.z;
        }
    };
    /** On each frame spring topolgy is set from the things */
    me.frame = function tadpole_frame() {
        // const done = me.flowBlock(); // does the transfer before we set the topology. now done on beat
        doReserved();
        // smoooth radii, separate function to help show on performance
        function smoothrad() {
            const k = 0.5 ** (framedelta / (1000 * me.radHalflife)), k1 = 1 - k;
            for (let i = 0; i < tadprop.length; i += 4) {
                const r = tadprop[i], tr = tadprop[i + 2]; // radius and target radius
                tadprop[i] = r * k + tr * k1; // set new radius
            }
            me.propTexture.needsUpdate = true;
        }
        smoothrad();
        const off = 0.03; // offset from wall where force starts (metres)
        uniforms.tadWallSize.value.set(-_boxsize * G.wallAspect - off, _boxsize - off, _boxsize - off);
    };
    me.tmat = new THREEA.Matrix4();
    /** on each frame set up the reserved slots for controllers/pseudo-controllers */
    function doReserved() {
        // compute real position for gamepad
        function ss(gp) {
            if (!gp)
                return;
            let v = gp.baitPosition;
            if (!v)
                v = gp.baitPosition = new THREEA.Vector3();
            tadpoleSystem.tmat.getInverse(V.rawscene.matrix); // lhs version of rot4
            tadpoleSystem.tmat.multiply(gp.raymatrix);
            v.set(0, 0, -G.tadBaitDist).applyMatrix4(tadpoleSystem.tmat);
            // make sure the bait is actually within the wall constraints
            const ws = uniforms.tadWallSize.value; // wall size
            const e = gp.raymatrix.elements; // for gp position
            let reduce = 1;
            if (v.x < -ws.x)
                reduce = Math.min(reduce, (-ws.x - e[12]) / (v.x - e[12]));
            if (v.x > ws.x)
                reduce = Math.min(reduce, (ws.x - e[12]) / (v.x - e[12]));
            if (v.y < -ws.y)
                reduce = Math.min(reduce, (-ws.y - e[13]) / (v.y - e[13]));
            if (v.y > ws.y)
                reduce = Math.min(reduce, (ws.y - e[13]) / (v.y - e[13]));
            if (v.z < -ws.z)
                reduce = Math.min(reduce, (-ws.z - e[14]) / (v.z - e[14]));
            if (v.z > ws.z)
                reduce = Math.min(reduce, (ws.z - e[14]) / (v.z - e[14]));
            if (reduce < 1) {
                v.set(0, 0, -G.tadBaitDist * reduce).applyMatrix4(tadpoleSystem.tmat);
            }
            gp.reduceBaitDist = reduce;
            return v;
        }
        ss(V.gpR);
        ss(V.gpL);
        // fixed positions ... todo align with controllers
        const s = (a) => me.fixscale * (0.3 * Math.sin(frametime / 100000 * a) + 0.2 * Math.cos(frametime * 1.7 / 100000 * a));
        springs.setfix((TADS + 0) * RIBS, s(13.6), s(11.2), s(19.7));
        springs.setfix((TADS + 1) * RIBS, s(7.7), s(15.4), s(23.2)); // OR 1 from mouse above
        springs.setfix((TADS + 2) * RIBS, s(13), s(11), s(19));
        springs.setfix((TADS + 3) * RIBS, s(23), s(15), s(7));
        if (V.gpRok)
            springs.setfix((TADS + 0) * RIBS, ss(V.gpL));
        if (V.gpLok)
            springs.setfix((TADS + 1) * RIBS, ss(V.gpR));
        // strong springs or rods for reserved
        for (let h = TADS; h < HEADS; h++) {
            let tadlen = me.tadlen[h] = me.TADLEN;
            let str = 1e20, pow = 0;
            const v = springs.getfix(h * RIBS);
            for (let k = 1; k < RIBS; k++) {
                springs.addrod(k + h * RIBS, k - 1 + h * RIBS, tadlen / RIBS);
                // only a few of these, don't bother to optimize
                // springs.addspring(k+h*RIBS, k-1+h*RIBS, tadlen/RIBS, str, pow);
                //v.x += tadlen; springs.setfix(k+h*RIBS, v);
            }
        }
    }
    // make a new Role and save it in roles.  Make a gene for its strength (todo change?)
    //PJT: 'get' not most intuitive name for 'make'
    //SJPT: it used to be 'get' with lazy 'make', but that was wrong
    function makeRole(id, val = 0, comment = 'gene ' + id, numtads = TADS) {
        // if (roles[id]) return roles[id];     // cache wrong in more dynamic case, not needed when roles are static
        const rolenum = Object.keys(roles).length + 1;
        const r = COL.NUM - 3; // 0,1,2 reserved
        const roleprops = new Float32Array(numtads * RIBS * 4);
        // set up initial values for roleprops, opten quickly overridden
        let p = 0;
        for (let tid = 0; tid < numtads; tid++) {
            const col = tid % r + 3;
            const rad = 1; // in tranrule G.vsub_ radius;
            for (let pid = 0; pid < RIBS; pid++) {
                roleprops[p++] = rad;
                roleprops[p++] = col;
                roleprops[p++] = rad; // radtarget
                roleprops[p++] = G.vsub_ribs; // ribs, initial value
            }
        }
        const role = roles[id] = { springs: [], id, defaultStrength: val, numtads, rolenum, roleprops, arguments: {} };
        // addgeneperm(gn, def, min, max, delta?, step?, help?, tag?, free?, internal?, useuniform?)
        addgeneperm(id, val, 0, 2000, 1, 1, comment, 'tadpole');
        G.id = val; // ensure this wins, not values saved in .oao or similar files
        return role;
    }
    // me.getRole = makeRole; // NOT external
    const XRIBS = RIBS * 1000000;
    /** tadpoleid to spring number coercion , tadpole id is [<head#>, <pos>], pos circles, so -1 is tail */
    // function toSnum (t: Xkey): Springkey { return (typeof t === 'number' ? t : t[0]*RIBS + (t[1]+XRIBS)%RIBS) as Springkey };
    function toTid(s) {
        return (typeof s === 'number' ? [Math.floor(s / RIBS), Math.round(s % RIBS)] : s);
    }
    ;
    /** Helper to build roles. store a slot (pending spring) in a role. */
    function setslot(ai, bi, len = 1, str = 1, pow = 0, role) {
        role.springs.push({ at: toTid(ai), bt: toTid(bi), len, str, pow, type: role.id });
    }
    // Helper to build roles.  local collection of spring information.
    // n.b. we do not allow for springs that don't work here, should not happen
    // all symmetric spring handling (addspring) is managed at this level
    // and we only use asymmetric setslot/removeslot at the springs level.
    function addspring(ai, bi, len = 1, str = 1, pow = 0, role) {
        setslot(ai, bi, len, str, pow, role);
        setslot(bi, ai, len, str, pow, role);
    }
    // me.addspring = addspring;  // ??? no, do not expose even for debug
    me.realscale = async function () {
        basescale = 1; // target scale of object if autoscaled
        camera.near = 0.1; // needs different camera near/far
        camera.far = 20; // needs different camera near/far
        _boxsize = 1.4; // was 2, but wallAspect mutliplies it for x
        me.fixpos = VEC3(0, 0, _boxsize * 0.9);
        V.wallAspect = -1.5; // -ve for absolute, not relative to screen
        G.wall_texscale = 0.2; // for room texture
        G.vfirst_scaleK = 1; // for tadpole global scale
        renderVR.scale = 1;
        G.shadowdepthoffZ = 0.01;
        V.baseroomsize = 1;
        E.baseshrinkradiusA = 0.01; // may change to scale related value, indirect sets G.shrinkradiusA for cutters
        E.baseshrinkradiusB = 0.01; // may change to scale related value
        V.keepinroom = false; // may change to scale related value
        V.forceheight = false; // may change to scale related value
        V.nosetroomsize = true;
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
            renderer.vr.getSession().addEventListener('inputsourceschange', e => {
                Maestro.trigger('vrInputSourcesChange', e);
            });
        }
    }
    let initdone;
    /** set up the agent mapping scheme, each agent is an independent head;
     * this is the initializer for a Tadpole scheme.
      */
    me.tad = function (n = -1, ribs = 8, skelends = 0, group) {
        addgeneperm('tadBaitDist', 0.5, 0, 2, 0.01, 0.01, 'distance of attractors from controller', 'tadpole', 0);
        //tadsetexperiences();    // get it in early (why was this needed. will below be early enough?
        log('### about to import tadExperiencesModule');
        import('./mod/sketch/tadExperiencesModule.js').then(tadExp => tadExp.default());
        // problem below with startvr, resting caused mutatation eg of vsub_ radius???
        // to cir more properly
        // gene ranges for wall texture and bump fixed, so resting allowed
        V.resting = false;
        vrresting.bypassResting = true; //  V.skip = true;    // to consider <<<< TODO
        if (!initdone) {
            // 'vrdisplaypresentchange' was a WebVR window event.
            // nb: newer versions of three have 'vr' rather than 'xr'
            //https://forums.oculusvr.com/developer/discussion/85985/vrdisplaypresentchange-not-firing-when-entering-webxr
            renderer.vr.addEventListener('sessionstart', onVRDisplayPresentChange, false);
            renderer.vr.addEventListener('sessionend', onVRDisplayPresentChange, false);
            initdone = true;
            setExtraKey('K,M', 'to new tadpole Thing', tadpoleSystem.newThing);
            setExtraKey('K,Z', 'various simplifications', () => {
                G.tadAttractorsL;
                G.tadAttractorsR = 0;
                me.flowRate = 1000;
                G._camz = 7; // G.tadBac kbone2 = 0;
                cMap.SetRenderState('color');
            });
        }
        log('tad called at frame .........................................', framenum, 'n=', n);
        me.events = events = MEvents();
        if (n === -1) {
            if (TADS === -1) {
                n = searchValues.tadnum || 508; // default for first entry
            }
            else {
                log('tad already set up');
                onframe(me.randcols);
                return;
            }
        }
        cleangenesall(me.roles, true);
        roles = me.roles = {};
        things = me.things = [];
        me.tadnum = me.TADS = TADS = n;
        me.GROUP = group || n < 256 ? 3 : 4;
        if (restoringInputState)
            return; // got a pseudo-click from menu
        springs.stop();
        me.fixstyle = true;
        uniforms.skelbufferRes.value.set(1, 1); // reduce buffers to minimum, help debug
        skelbuffer = 0;
        HEADS = me.HEADS = TADS + RESERVED;
        RIBS = me.RIBS = ribs;
        SKELENDS = skelends;
        KPARTICLES = numInstances = WA.numInstances = HEADS * RIBS;
        KPARTICLESP2 = springs.setPARTICLES(KPARTICLES, 0);
        springs.setMAX_DEFS_PER_PARTICLE(MAX_DEFS_PER_PARTICLE);
        resoverride.skelends = uniforms.skelends.value = SKELENDS;
        resoverride.skelnum = RIBS - 2 * SKELENDS - 1; // to align skeleton with particles, allowing for 2 extra at each end for splining
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
        // almost setSpringTopology but not quite
        springs.step(); // stop step doing resettopology later if things changed
        springs.resettopology();
        adduniform('HEADS', HEADS);
        adduniform('RIBS', RIBS);
        // adduniform('KPARTICLES', KPARTICLES);
        //extradefines='#define SKELPICK\n';
        //remakeShaders(true);  // force remake of shaders now we have done some changes
        me.tadlen = new Array(HEADS);
        //let role: Role;
        // springs to create one long backbone
        me.tadFullBackbone = makeRole('tadFullBackbone', 1000, 'forces to bring all tadpoles into one very long string');
        for (let h = 1; h < TADS; h++) {
            addspring(h * RIBS, h * RIBS - 1, me.TADLEN / RIBS, 1, 0, me.tadFullBackbone);
        }
        // some settings for Pompidou, ? should be in oao but more centralized here for now
        // from discussion with William, 14/1/20
        V.torchlight = false; // just use fixed lights
        V.headlight = false;
        // CSynth.setNovrlights();         // this ensures the non-horn rendering uses same lights as novrlights
        G.light0x = 350;
        G.light0y = 800;
        G.light0z = 440;
        G.light1x = 350;
        G.light1y = 350;
        G.light1z = 350;
        G.light2x = -100;
        G.light2y = -400;
        G.light2z = 400;
        G.light0dirx = G.light1diry = G.light1dirz = 999; // eg directional
        G.light0s = 0.7;
        G.light1s = 0.2;
        G.light2s = 0.07;
        shadows(7); // for two main lights
        cMap.SetRenderState('walls'); // no feedback, confusuing (and expensive)
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
        G.flatwallreflp = 0.975; // so a tiny bit of bumping shows on image 'reflection'
        onframe(() => currentHset.wallgenes.flatwallreflp = true);
        genedefs.flatwallreflp.free = 1;
        genedefs.flatwallreflp.min = 0.95;
        setInput(WA.showuiover, false);
        setInput(WA.FLATWALLREFL, true);
        setInput(WA.USESKELBUFFER, true);
        setInput(WA.FLATMAP, true);
        setInput(WA.FLATWALLREFL, false);
        setInput(WA.FLUORESC, true);
        // setInput(WA.tranrulebox, '->');
        setInput(WA.shadr2048, true);
        setInput(WA.shad1, true);
        SHADOWRESDIFF = 0;
        // lines below
        //setAllLots('wall_refl', 1);     // colours and strengths
        //G.wall_refl1 = 0.2; G.wall_refl2 = 0.1; G.wall_refl3 = 0.05;    // and then mutate
        //cMap.m_urls[0] = 'images/handdrawn2.jpg'; cMap.Init();  // load handdrawn image
        //cMap.wallType = [0,0,0,0,0,0];  // and use on all walls
        setInput(WA.NOSCALE, true);
        setInput(WA.NOCENTRE, true); // so spring space == model space
        baseShaderChanged(true); // prevent base shader initial frames optimization ... todo bettwe say
        onframe(function () {
            G.vfirst_ribs = HEADS - 1;
            genedefs.vfirst_ribs.free = 0;
            me.randcols(); // so all colors populated
            genedefs.vsub_radius.free = 0;
            genedefs.vsub_radius.min = 0.002;
            genedefs.vsub_radius.max = 0.020;
            genedefs.vsub_radius.delta = 0.0001;
            genedefs.vsub_radius.step = 0.0001;
            geneSpeed.vsub_radius = 0.001;
            G.vsub_radius = 0.02;
            G.ribdepth = 2;
            G.stardepth = 1; // nb significantly modulated in tranrule
            G.nstar = 5;
            renderer.setClearColor(ColorKeywords.black);
            renderer.clearTarget(skelbuffer); // << debug
            // work in real scale <<< some of these (V.baseroomsize) need repeating after entering VR
            me.realscale();
            centrescalenow();
            resetMat();
            springs.start();
            if (me.extraDetails)
                me.extraDetails(); // eg to be filled in in tranrule
            // everyframe(me.frame);  // no, unnecessary anonymous intermediate
            Maestro.on('preframe', me.frame);
            // collect all spring related genes here ... tune dynamics
            //G.modelSphereRadius = 2;  // 1 or 2 should be sensible but ...??? to tie in with _boxsize
            G.modelSphereForce = 0; // replaced with wall equivalent
            G.pullspringforce = 0.03; // for tadskel IF we are using pullsprings
            uniforms.pullspringmat.value.elements[14] = -0.5; // push skel form back (unless we get better distortion)
            G.xyzpow = 0; // for tadskel with distances
            // odd test, why not almost same after settling
            setExtraKey('K,A', 'swap pull and xyz forces', () => {
                if (G.pullspringforce === 0) {
                    G.pullspringforce = 0.03;
                    G.xyzforce = 0.0;
                }
                else {
                    G.pullspringforce = 0.00;
                    G.xyzforce = 0.003;
                }
                msgfix('!spr', `pull=${G.pullspringforce} dist:${G.xyzforce}`);
            });
            // G.pullspringforce=0.00; G.xyzforce = 0.003
            // G.pullspringforce=0.03; G.xyzforce = 0.0
            G.powBaseDist = 1;
            G.springpow = 0;
            G.pushapartlocalforce = 0; // ? 0.2
            G.backboneScale = 0.01;
            G.springrate = 0.1;
            G.springmaxvel = 0.01; // prevents overfast transistions: maybe later limit forces instead, this is easier
            setAllLots('tad', 250000); // this will set all the 'generic' ones
            //G.tad Backbone = 25000;       // part of each individual role
            // G.tadBack bone2 = 0;         // do not have hoped for effect and can cause zigzags
            G.backboneStrength = 1; // leave it to tad defined variants
            G.springCentreDamp = 1 - 1e-5; // very small attraction to keep centred
            G.pushapartforce = 7e-8;
            G.pushapartpow = -2; // -1.2;
            G.tadBaitDist = 1.6;
            G.twistBase = 0.002;
            // for (let id in roles) me.forcepow(roles[id], 1);  // VERY temporary I hope, use me.tadpow
            // me.forcepow(me.roles.tad Backbone, 2)     .. done at setup
            //msgfix('!radii', ()=>CSynth.stats().radii);  // help debug size
            //msgfix('!pows', ()=>springs.pairsfor(0).map(s=>s.pow));
            me.tune();
        }, 2);
        onframe(() => {
            guifilter.value = 'tad | spring | pushapart';
            filterDOMEv();
            updateGuiGenes();
        }, 3);
        /** override pow settings on a thing or role ... WARNING on thing may have side-effect on role */
        me.forcepow = function (thing, pow) {
            thing.springs.forEach(s => s.pow = pow);
        };
        me.extraDetails = () => {
            log('extra details in +++++++++++++++++');
            // tentative: TR will be used in experiences (such as mixThings, swapThing)
            // or maybe T will.    Both should only have displayable Things not manipulation things
            // var { TR } = tad;
            TR.horn3 = me.tadhorn(3);
            TR.horn2 = me.tadhorn(2);
            TR.tree32 = me.tadtree(3, 2);
            TR.tree12 = me.tadtree(1, 2);
            TR.tree35 = me.tadtree(3, 5);
            TR.tree15 = me.tadtree(1, 5);
            TR.skel = me.tadskel();
            TR.tadfree = me.tadfree();
            TR.tadfree1 = me.tadfree();
            me.seq.on('beat', () => { me.tadBeat(); return 0; }); // step, beat, bar, measure;  seq.step is number within beat, etc
            // TR.back2 = 'tadBack bone2';
            log('extraDetails set here');
            G.stepsPerStep = 4; // reasonable speed
            // CubeMap.SetRenderState('fixpeekfeedbackNOSET');
            // G.a_pulsepow = 1;
            // G.a_pulsescale = 0.0005;
            // G.a_pulseperhorn = 1.3;
            exhibitionMode = false; // for debug
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
        }; // me.extraDetails
        me.xspring(); // start the twist forces
        if (!me.greyevery) {
            me.colorCycle = 20;
            me.greyevery = everyframe(() => {
                tadpoleSystem.greywall();
                tadpoleSystem.track();
                G.g_hueshift = (G.time * 1 / me.colorCycle) % 1; // keep colours rotating very 20 seconds
            }); // () to allow for dynamic change of function
        }
    }; // end tad
    /** reposition the tadpoles in starter positions */
    me.remakePositions = function () {
        // set up and use a random map for the heads, the RESERVED may be overwritten very soon but it is a start
        doReserved(); // establish sensible positions compatible with dynamics ones
        me.reservedProps(); // and the reserved properties
        var p = 0;
        for (let h = 0; h < HEADS; h++) {
            var b = 0.5;
            var x = (Math.random() - b) * 2, y = (Math.random() - b) * 2, z = Math.random() * 2 - 1;
            var pos = new THREEA.Vector3(x, y, z); /// ??? me.positions[h] =
            if (h > TADS)
                pos = springs.getfix(h * RIBS); // reserved item
            for (var r = 0; r < RIBS; r++) {
                springs.setfix(p, pos);
                pos.x += me.tadlen[h] / RIBS; // so it starts ar correct length
                p++;
            }
        }
        uniforms.stepsSoFar.value = 4; // prevent the auto make helix working
        springs.finishFix();
    };
    /** convenience function to place head of one tadpole at tail of another */
    me.headToTail = function (head, tail, len, str = 1, pow = 0, role) {
        return addspring(head * RIBS, (tail + 1) * RIBS - 1, len, str, pow, role);
    };
    /** add backbone springs to role */
    function backboneSprings(role, len, str = 1, pow = 2) {
        for (let h = 0; h < TADS; h++) { // o head number (string number)
            let tadlen = len !== undefined ? len : (Math.random() + 1) * me.TADLEN; // random  factor <1 gives instability?
            me.tadlen[h] = tadlen;
            for (let k = 1; k < RIBS; k++) { // k is rib number
                addspring(k + h * RIBS, k - 1 + h * RIBS, tadlen / RIBS, 1, pow, role); // type 0 is backbone
            }
        }
    }
    /** join groups of tadpoles and add them to a role, utility for higher level role generation functions  */
    function groupSprings(role, group = me.GROUP, len, str, pow) {
        if (group <= 1)
            return;
        for (let i = 0; i < TADS; i += group) {
            const jend = Math.min(i + group, TADS); // last group may be short
            for (let j = i + 1; j < jend; j++) {
                me.headToTail(j, j - 1, len, str, pow, role);
            }
        }
    }
    /** make a Role that sets up tadpoles head to tail in groups: ??? not used ??? */
    me.tadgroup = function (group = me.GROUP, len = 0, str = 1, pow = 0) {
        let role = makeRole(`tadGroup_${group}`, me.defaultStrength);
        role.arguments = { group, len, str, pow };
        backboneSprings(role, undefined, str, undefined);
        groupSprings(role, group, len, str, pow); // join groups of tadpoles
        return role;
    };
    /** make a role for a tree from grouped tadpoles, defs is usually a structure, but can be value for group for backwards compatibility  */
    me.tadtree = function (defs = me.GROUP, pbranch = 2, len = 0, str = 1, pow = me.tadpow) {
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
        let role = makeRole(`tadTree_${group}_${branch}`, me.defaultStrength);
        role.arguments = defs;
        backboneSprings(role, undefined, str, undefined);
        groupSprings(role, group, len, str, pow);
        // arrange groups in a tree
        let parent = 0, child = gribs; // parent is particleid for head of parent, child is particleid for head of child
        tree: while (true) {
            let parenti = parent + start; // parenti is actual attachment point within parent
            let parente = parent + gribs - 1; // parente is last tadpoleid for group
            for (let b = 0; b < branch; b++) {
                addspring(child, parenti, len, str, pow, role);
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
        const coloff = branch * 3 + group; // colour offset so different styles coloured differently
        let p = 0, pid = 0; // arr entry number, particle number
        const basetadradius = 4;
        const lfac = branch ** -0.5;
        // me.tailids = [];
        atts: for (let lev = 0;; lev++) {
            const col = lev + coloff;
            const rad = basetadradius * lfac ** lev; // radius by level, no vsub_ radius in tranrule
            const n = branch ** lev * gribs; // number of particles at that level
            for (let i = 0; i < n; i++) {
                if (p >= arr.length)
                    break atts;
                arr[p++] = rad;
                arr[p++] = col;
                p += 2;
                pid++;
            }
        }
        puff(role, group, parent);
        return role;
    };
    /** apply puff to ends of groups above  */
    function puff(role, group, spid) {
        const gribs = group * RIBS; // number of particles in a group
        const arr = role.roleprops;
        for (let pid = spid; pid < HEADS * gribs; pid += gribs) {
            for (let pidi = pid - me.tailpuffnum; pidi < pid; pidi++) { // particles to puff
                let ppos = pidi * 4;
                arr[ppos++] *= me.tailpuff; // rad
                arr[ppos++] *= pid / gribs; // colid
                arr[ppos++] *= me.tailpuff; // target rad
                arr[ppos++] = 0; // ribs, smooth puff
            }
        }
    }
    /** make a role for a binary tree of ungrouped tadpoles */
    me.tadbintree = () => me.tadtree(1, 2); // compatibility
    /** make a role that pushes tadpoles oneto a sphere.  shaper not topology definer  */
    me.tadsphere = function () {
        // add a sphere
        let role = makeRole('tadSphere', 0, 'forces to push tadpole heads around sphere'); // BUT rods don't yet allow for role ....
        // role.arguments = {};
        const r = 0.4 / G.backboneScale;
        for (let h = 1; h < TADS; h++) {
            setslot(h * RIBS, 0, r, 1, 0, role); // asymmetric, can't have too many coming off 32
            // springs.addrod(i, 32, 0.4);
        }
        return role;
    };
    me.skelscale = 1 / 450;
    // /** use skeleton to fix tadpoles TODO remove when tadskel fully working? */
    // me.useSkeleton = function(fid = 'test.skel', k = me.skelscale) {
    //     const skel = typeof fid === 'string' ? yaml.safeLoad(readtext(fid)) : fid;
    //     const d = skel.data;
    //     const e = Math.min(TADS*RIBS, d.length);
    //     for (let i = 0; i < e; i++) {
    //         const dd = d[i];
    //         springs.setfix(i, dd.x*k, dd.y*k, dd.z*k);
    //     }
    //     springs.finishFix();
    // }
    /** use skeleton to make a Role using pullsprings */
    // me.tadskel = function(fid = 'test.skel', k:number = me.skelscale, len:N=0, str:N=0, pow:N = me.tadpow) : Role {
    me.tadskel = function ({ fid = 'testA.skel', k = me.skelscale, len = 0, str = 1, pow = me.tadpow, dopulls = true, dodists = false } 
    // experiments with strong typing
    // trying to get
    //  (a) strong typing,
    //  (b) no ? types,
    //  (c) defaults for individual fields same from (1) no input and (2) {} or underspecified input
    // Below works but absurdly verbose
    //: {fid: string, k:N, len:N, str:N, pow:N}
    //= {fid: 'test.skel', k: me.skelscale, len:0, str:0, pow: me.tadpow})
    = {}) {
        let role = makeRole(`tadskel_${fid}`, me.defaultStrength);
        role.arguments = { k };
        const skel = typeof fid === 'string' ? yaml.safeLoad(readtext(fid)) : fid;
        const d = skel.data;
        const e = Math.min(TADS * RIBS, d.length);
        const arr = role.roleprops;
        // compute lengths (used for #ribs)
        const lens = role.lengths = [];
        for (let tid = 0; tid < e / RIBS; tid++) {
            let l = 0;
            for (let i = tid * RIBS + 1; i < (tid + 1) * RIBS; i++) {
                l += distxyz(d[i], d[i - 1]);
            }
            lens[tid] = l * k;
        }
        // set up pullsprings to specific points, and colours, radii, etc
        const cum = skel.cumcount;
        let col = 0; // we will scan skel.cumcount to find original number (already offset)
        let sx = 0, sy = 0, sz = 0;
        for (let i = 0; i < e; i++) {
            const tid = Math.floor(i / RIBS);
            while (col < COL.NUM - 1 && (cum[col] === undefined || tid >= cum[col]))
                col++;
            const dd = d[i];
            const x = dd.x * k, y = dd.y * k, z = dd.z * k, r = dd.w * k;
            sx += x;
            sy += y;
            sz += z;
            if (dopulls) // create pullstring, head stronger so it leads the flow
                role.springs.push({ at: toTid(i), bt: toTid(0), type: 'pullspring', x, y, z, len, str: str * (i % RIBS ? 0.1 : 1), pow });
            arr[i * 4] = arr[i * 4 + 2] = r / G.vsub_radius; // will be multiplied up by vsub_radius in the tranrule
            arr[i * 4 + 1] = col;
            arr[i * 4 + 3] = 53 * lens[Math.floor(i / RIBS)]; // 53 arbitrary number but experimentally about right
        }
        log('skel cent', sx / e, sy / e, sz / e);
        /** compute distance map if requested */
        if (dodists) {
            const n = springs.numInstancesP2;
            const distarr = new Float32Array(n * n);
            distarr.fill(999); // 0 distance behaves very badly
            for (let i = 0; i < e; i++) {
                for (let j = i; j < e; j++) {
                    distarr[i + j * n] = distarr[j + i * n] = distxyz(d[i], d[j]) * k;
                }
            }
            const disttex = me.disttex = new THREEA.DataTexture(distarr, n, n, THREEA.LuminanceFormat, THREEA.FloatType);
            disttex.needsUpdate = true;
            uniforms.xyzbuff.value = disttex;
        }
        return role;
    };
    /** allow for free tadpoles to belong to a Thing; ??? allow it to have groups */
    me.tadfree = function (str = 1, pow) {
        let role = makeRole(`tadfree`, 0);
        backboneSprings(role, undefined, str, undefined);
        me.tadshape(role);
        return role;
    };
    /** shape tadpoles; can call dynamically with different values
    Mainly for free tadpoles, could be used for other forms */
    me.tadshape = function (role, rad = me.basefreeradius, frac = me.freeradfac) {
        const arr = role.roleprops;
        const coloff = 14; // colour offset so different styles coloured differently
        let p = 0, pid = 0; // arr entry number, particle number
        for (let tad = 0; tad < TADS; tad++) {
            const col = tad + coloff;
            for (let i = 0; i < RIBS; i++) {
                arr[p++] = rad * frac ** i;
                arr[p++] = col;
                p += 2; // nb leave ribs
                pid++;
            }
        }
        return role;
    };
    me.basefreeradius = 1;
    me.freeradfac = 0.7;
    /** make a toppolgy that corresponds to a horn structure.
     * This is not at all generic, but uses a builtin specific horn structure.
     */
    me.tadhorn = function (group = me.GROUP, len = 0, str = 1, pow = me.tadpow) {
        let role = makeRole(`tadHorn_${group}`, me.defaultStrength);
        role.arguments = { group, len, str, pow };
        backboneSprings(role, undefined, str, undefined);
        groupSprings(role, group, len, str, pow);
        /*
        ~~~~ V V V   | | | | | | ^^^^                   === vfirst
        ~~~~+++++++==============^^^^    ~~~~ ++++ head | | | cage ^^^
        ~~~~         | | | | | | ^^^^    brh   VVV  sub            brt
        
        All segments to have the same length at least initially (groups of tadpoles)
        to simplify correlation with horn skeleton.
        
             1          ========= 0                 vfirststart
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
        let vfirststart = 0;
        let headstart = vfirststart + k, vfirsttail = headstart - 1;
        let cage1start = headstart + k, headtail = cage1start - 1;
        let cage2start = cage1start + cagen * k;
        let substart = cage2start + cagen * k;
        let brhstart = substart + ssubn * k;
        let brtstart = brhstart + brhn * k;
        let brtend = brtstart + brtn * k;
        function as(a, b) { addspring(a, b, len, str, pow, role); } // add spring
        function aas(a, b) { setslot(a, b, len, str, pow, role); } // add asym spring
        const arr = role.roleprops;
        const coloff = 19 + group;
        // set properties for particle
        function prop(pid, rad, col) {
            col += coloff;
            // in tranrule rad *= G.vsub_ radius;
            let p = pid * 4;
            for (let i = 0; i < k; i++) {
                arr[p++] = rad;
                arr[p++] = col;
                p += 2; // leave ribs to default
            }
        }
        as(vfirststart, headstart); // head to head of vfirst and head
        prop(vfirststart, 3, 1);
        prop(headstart, 2, 2);
        for (let i = 0; i < cagen; i++) {
            as(cage1start + k * i, vfirststart + i); // cage off vfirst part 1
            // <<< todo, allow for 'duplicates' at head on one tadpole, tail of next
            prop(cage1start + k * i, 1, 3);
        }
        for (let i = 0; i < cagen; i++) {
            as(cage2start + k * i, vfirststart + i); // cage off vfirst part 2
            prop(cage2start + k * i, 1, 3);
        }
        for (let i = 0; i < ssubn; i++) {
            as(substart + k * i, headstart + i); // ribs off head
            prop(substart + k * i, 0.8, 4);
        }
        for (let i = 0; i < brhn; i++) {
            aas(brhstart + k * i, vfirsttail); // branch at vfirst tail
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
        return role;
    };
    /** apply random colours to the tadpoles */
    me.randcols = function randcols(kk) {
        G.colribs = 0;
        // COL.ignoreHornColours = true;
        const savewall = COL.array.slice(COL.PARMS * WALLID, COL.PARMS * (WALLID + 1));
        seed(kk || Math.random() * 234572);
        var rr = [0, 1];
        COL.setx({ '': 9999 });
        COL.setx({
            red: rr, green: rr, blue: rr, refl: 0, band: rr, bandbetween: [0, 0.3], bumpstrength: [0, 15],
            texalong: 0, texaround: 0, texribs: 0, iridescence: [-0.2, 0.2], bumpscale: [0.025, 0.1],
            flu: 0,
            plastic: rr, gloss: [0, 0.8], shin: 25, speck: 1, texscale: [0.01, 0.03], texrepeat: [1, 4],
            texfinal: 0, screenDoor: 0, texfract3d: 1, texdiv: 1, wob: 1,
            tex2dystretch: [1, 2], tex2dxstretch: [1, 10]
        });
        // test patch to above;
        COL.setx({ texscale: [0.05, 0.15], flu: 1, fluwidth: [0.0005, 0.001], fluorescH: [0, 1], texrepeat: [1, 3] });
        // i is colour property number
        for (let i = 0; i < COL.PARMS; i++)
            if (COL.get(i, 0) === 9999)
                log("unset", i, COL.names[i]);
        for (let i = 0; i < COL.PARMS; i++)
            if (isNaN(COL.get(i, 0)))
                log("nan", i, COL.names[i]);
        if (!savewall.every(x => x === 0))
            COL.array.set(savewall, COL.PARMS * WALLID); // restore wall details if there are any
        COL.randcols2(); // overwrite the red/green/blue
        COL.send(); // so the gpu sees them
        COL.alltogenes(); // so the genes are set appropriately
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
    // set up reserved radii, more dynamic to allow for baitWeight
    me.reservedRads = function () {
        for (let tid = TADS; tid < TADS + 2; tid++) {
            let p = tid * RIBS * 4; // position in array
            const baser = 2 * (tid === TADS ? me.baitWeightL : me.baitWeightR) ** 0.5 + 0.02;
            for (let i = 0; i < RIBS; i++) {
                tadprop[p] = tadprop[p + 2] = baser * (1 - i / RIBS);
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
            const baser = tid < TADS + 2 ? 2 : 0; // last two reserved not used/shown, why does -ve r not work ???
            const col = tid - TADS; // reserved colour
            for (let i = 0; i < RIBS; i++) {
                tadprop[p++] = baser * (1 - i / RIBS);
                tadprop[p++] = col;
                tadprop[p++] = baser * (1 - i / RIBS);
                tadprop[p++] = 8; // ribs
            }
        }
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
    function randFrom(x) {
        const keys = Object.keys(x);
        const key = keys[randi(keys.length)];
        return x[key];
    }
    /** */
    function newThing(tr) {
        if (!tr)
            tr = randFrom(TR);
        const t = me.addThing(tr);
        events.trigger('newThing', t);
        T.push(t);
    }
    me.newThing = newThing;
    // this will all smooth movement without insideoutness fro current to (second) tr
    // work by insideouting twice
    me.stealThing = function (tr) {
        if (!tr)
            tr = randFrom(TR);
        newThing(tr);
        onframe(() => newThing(tr));
    };
    me.addThingListener = (f) => {
        events.on('newThing', e => {
            f.newThing(e.eventParms); //eventParms somewhat ugly, sorry.
        });
        events.on('deadThing', e => {
            f.deadThing(e.eventParms);
        });
    };
    var nextFlowTime;
    /** called every frame to allow transfer of tads between active things */
    me.flowBlock = function tadFlowBlock(n = me.flowRate) {
        let done = 0; // number transferred
        if (T.length === 0) {
            const srole = ofirst(me.TR);
            // if (!srole) return; // nothing ready yet, should not be needed if startup in right order
            const thing = me.addThing(srole);
            T.push(thing);
            for (let i = 0; i < TADS; i++)
                thing.map.push(i); // populate its properties
            me.remakePositions();
            CSynth.hilbert(0.1); // set starting positions
            done = TADS;
        }
        let tt = T.length - 1; // index for target object
        // for (let i = 0; i < n; i++) {
        if (tt !== 0)
            while (frametime > nextFlowTime) {
                nextFlowTime += 1000 / me.flowRate;
                // if (T[tt].map.length >= T[tt]..max)
                T[tt].map.push(T[0].map.pop()); // transfer from source to target
                done++;
                if (T[0].map.length === 0) {
                    const i = things.indexOf(T[0]);
                    if (i === -1)
                        debugger;
                    things.splice(i, 1);
                    events.trigger('deadThing', T.splice(0, 1)[0]); // if source empty kill it off
                }
                if (T.length === 1) {
                    events.trigger('lastThing'); // signal that transfers are over
                    break; // only one object left, can't do any more tranfers
                }
                tt--;
                if (tt === 0)
                    tt = T.length - 1;
            }
        // tadpoles flowed, now make sure springs up to date
        if (done > 0) {
            springset.fill(0); // prepare the position optimization
            springs.clearTopology();
            things.forEach(applyThing);
            // setprop();
            me.propTexture.needsUpdate = true;
            events.trigger('tadFlow'); //use this for sound...
        }
        return done;
    };
    me.flowRate = 170; // number of tads to transfer per second
    // note: 2 Dec 2019.  All tadpole springs have strength = 1 and pow = 0 except for the attractor springs.
    me.gtranrule = `
horn('vsub').ribs(8).radius(0.005)
.code(\`//gl
  vec4 q=(ppos(floor(vfirst_rp * vfirst_ribs + 0.5)/HEADS + (vsub_rp * 7. + 0.5)/(8. * HEADS)));
  setxyz(q);
  r *= texture2D(tadprop, vec2(vsub_rp, vfirst_rp)).x;  // will have been set to vsub_radius
  r *= 0.3+fract(vfirst_rp*17.67); // random radius (multiplier by G.vsub_radius)
  // r *= 1.-vsub_rp;  // tadpole shape contracting towards tail
  // if (vfirst_rp * HEADS > vfirst_ribs - 3.) r = 0.3 * (1.-vsub_rp)*(0.00+vsub_rp);  // big reserved items
  // if (vfirst_rp < minActive || vfirst_rp > maxActive) r = 0.;       // out of range, probably debug only
  // if (vsub_rp>0.7 && mod(vfirst_rp*HEADS, 3.0) > 2.1) r = 0.05;  // experiment towards bulge at end
  // r = 0.01;  // help tree debug
///gl\`);

horn('vfirst').ribs(1023).sub('vsub').scale({k:1}); mainhorn ='vfirst';
// posttranrule=pulsermult('a');
overrides = \`//gl //vary star and ribdepth per tadpole
override vec2 makestar(Parpos parpos, vec4 lopos) {
    return vec2(mod(lopos.z, 3.) + 3., stardepth * max(0., fract(lopos.z * 13.43) - 0.6));  // 6 out of 10 no star, stars are 3,4,5
}
override float makeribdepth(Parpos parpos, vec4 lopos) {
    return ribdepth * (0.3 + fract(lopos.z * 1.137));  // everything a bit ribby
}
override float makeribs(Parpos parpos, vec4 lopos) {
    return texture2D(tadprop, vec2(lopos.x, lopos.z/HEADS)).w;
}
// this will set the hornid according to horn number.  TODO: update to look up in a tadpole properties texture
override void getPosNormalColid(out vec3 xmnormal, out vec4 shapepos, out float thornid, out float fullkey) {
  getPosNormalColid_base(xmnormal, shapepos, thornid, fullkey);
  if (thornid != 2.) {
    //' to remove TODO early Feb 2020
    //' needs more to get the indivdiual particles (from vsub_id in opos)
    //'thornid = mod(fullkey, 4096.);
    //'thornid = texture2D(tadprop, vec2(0.5, thornid/(vfirst_ribs+1.))).y;  // use value from tadprop
    //'thornid = mod((thornid), 29.) + 3.0;  // use horn number, do not use cols 0,1,2

    // access individual particles
    vec4 oopos = texture2D(rtopos, gl_FragCoord.xy/rtSize);  // oopos is {ox, oy, hornnum, hornid*}
    oopos.z = (oopos.z + 0.5) / (vfirst_ribs+1.);
    vec4 props = texture2D(tadprop, oopos.xz);  // props are
    thornid = props.y;
    thornid = mod((thornid), 29.) + 3.0;  // use horn number, do not use cols 0,1,2

  }
}
///gl
\`
// so refreshed after new tranrule, defer, and named intermediate function to help debug
// deferred because of suspicious issues when NOT deferred (or just 1 frame)
onframe(function tranrule_tadpoleSystem_randcols() {tadpoleSystem.randcols()}, 15);
`;
    me.skelrot = 5;
    me.skelpull = 0.5;
    const oldbpr = VEC3(); // old bait pos
    const oldbpl = VEC3();
    const dbpr = VEC3(); // delta bait pos
    const dbpl = VEC3();
    const obpr = VEC3(); // offset bait pos from centroid
    const obpl = VEC3();
    const xbpr = VEC3(); // cross
    const xbpl = VEC3();
    const ccc = VEC3(); // centroid of skel object
    me.skelExtraRot = 1;
    /** arrange the twist force parameters to be updated each frame  */
    me.springframe = function () {
        const t = G.twistBase;
        const bpr = uniforms.baitPositionR.value, bpl = uniforms.baitPositionL.value;
        function uset(t, e, bw) {
            // e[0], e[1] gives an idea of twist, how x axis is twisted up or down in y
            // e[10] gives idean of whether z is pointing forwards;  if not (especially if backwards) ignore
            // todo, allow > 90 degree twist to behave right
            const ang = Math.atan2(e[1], e[0]); // twist angle
            const tt = ang / Math.PI; // range 0..1
            const tta = Math.abs(tt); // abs value
            const dz = 0.1; // dead zone size
            const ttt = tta < dz ? 0 : tta - dz; // dead zone
            const tts = Math.sign(tt) * ttt * ttt; // shaped value
            const ttu = -t * 6 * tts * Math.max(0, bw); // final value to use
            return ttu;
        }
        function ubw(e) {
            return Math.max(0, e[10]); // bait weight to use
        }
        // get suitable radius for xsphere
        // pad left/right is puffer
        // trigger is attractor
        function xsphereRad(gp) {
            if (!(gp && gp.ok))
                return 0;
            const tr = gp.trigger.value;
            const ax = gp.pad.pressed ? Math.abs(gp.axesbias[0]) : 0;
            // we might use triggers to override pads
            // but sometimes triggers don't return quite to 0
            // so use test below
            return (tr > ax ? -tr : ax) * tadpoleSystem.maxXsphereRadius;
        }
        if (V.gpL) {
            const e = V.gpL.raymatrix.elements;
            // uniforms.con PositionL.value.set(e[12], e[13], e[14]);       // position of controller
            uniforms.condirL.value.set(e[8], e[9], e[10]); // z-direction
            if (V.gpL.baitPosition)
                bpl.copy(V.gpL.baitPosition); // may not be ready first time in?
            me.baitWeightL = ubw(e);
            G.twistL = uset(t, e, me.baitWeightL);
        }
        else {
            // uniforms.con PositionL.value.set(-0.5,0,2);
            uniforms.condirL.value.set(0, 0, -1);
            bpl.set(-0.5, 0, 0);
            me.baitWeightL = 1.;
            G.twistL = t;
        }
        if (V.gpR) {
            const e = V.gpR.raymatrix.elements;
            // uniforms.con PositionR.value.set(e[12], e[13], e[14]);
            uniforms.condirR.value.set(e[8], e[9], e[10]);
            if (V.gpR.baitPosition)
                bpr.copy(V.gpR.baitPosition);
            me.baitWeightR = ubw(e);
            G.twistR = uset(t, e, me.baitWeightR);
        }
        else {
            // uniforms.con PositionR.value.set(0.5,0,2);
            uniforms.condirR.value.set(0, 0, -1);
            bpr.set(0.5, 0, 0);
            me.baitWeightR = 1.;
            G.twistR = -t;
        }
        G.xradiusL = xsphereRad(V.gpL);
        G.xradiusR = xsphereRad(V.gpR);
        // set up attractors/bait according to if controller ok, and controller direction
        G.tadAttractorsL = me.defaultTadAttractors * me.baitWeightL;
        G.tadAttractorsR = me.defaultTadAttractors * me.baitWeightR;
        // move the pullspringmat, the imported form if any will follow
        const sm = uniforms.pullspringmat.value;
        const e = sm.elements;
        // work out deltas etc to twist by bait movement
        ccc.set(e[12], e[13], e[14]); // current centre of skel object
        dbpl.subVectors(bpl, oldbpl);
        oldbpl.copy(bpl); // movement of bait
        dbpr.subVectors(bpr, oldbpr);
        oldbpr.copy(bpr);
        obpl.subVectors(bpl, ccc); // offset of bait from skel object
        obpr.subVectors(bpr, ccc);
        xbpl.crossVectors(dbpl, obpl); // cross to give twisting
        xbpr.crossVectors(dbpr, obpr);
        const ll = xbpl.length(); // get length
        const rl = xbpr.length(); // and (below) apply twist
        if (ll !== 0)
            sm.premultiply(tmat4.makeRotationAxis(xbpl.multiplyScalar(1 / ll), -ll * me.skelExtraRot * me.baitWeightL));
        if (rl !== 0)
            sm.premultiply(tmat4.makeRotationAxis(xbpr.multiplyScalar(1 / rl), -rl * me.skelExtraRot * me.baitWeightR));
        // rotation from twist (already allows for baitWeight)
        sm.premultiply(tmat4.makeRotationAxis(uniforms.condirL.value, -tadpoleSystem.skelrot * G.twistL));
        sm.premultiply(tmat4.makeRotationAxis(uniforms.condirR.value, -tadpoleSystem.skelrot * G.twistR));
        // pull (below could be optimized, but well be changed anyway to use more than average of bait)
        let k = tadpoleSystem.skelpull * me.baitWeightL;
        e[12] = (1 - k) * e[12] + k * bpl.x;
        e[13] = (1 - k) * e[13] + k * bpl.y;
        e[14] = (1 - k) * e[14] + k * bpl.z;
        k = tadpoleSystem.skelpull * me.baitWeightR;
        e[12] = (1 - k) * e[12] + k * bpr.x;
        e[13] = (1 - k) * e[13] + k * bpr.y;
        e[14] = (1 - k) * e[14] + k * bpr.z;
        me.reservedRads(); // to show the bait weighting
    };
    me.tadBeat = function () {
        const n = me.flowBlock();
        msgfix('onbeat flowed', n, framenum);
    };
} // end TadpoleSystem
//var tadpoleSystem = new TadpoleSystem();
//would maybe prefer to make a fresh one when we want rather than have one persistent
//now declared in vars (as let not var) rest of system working & helped with some other experiment
tadpoleSystem = new TadpoleSystem();
//export let tads = tadpoleSystem; //this is not a module. not sure why that one export above is ok.
/** reset position (NOT orientation) */
tadpoleSystem.setPosition = function () {
    setTimeout(() => {
        G._camx = 0;
        G._camy = 0;
        G._camz = _boxsize * 0.9;
    }, 0);
};
/** patch lengths dynamically */
tadpoleSystem.newvals = function (newval, role) {
    if (typeof newval === 'number')
        newval = { len: newval };
    role.springs.forEach(ds => Object.assign(ds, newval));
};
// temporary debug display below
// tadpoleSystem.vleft = new THREEA.Vector3();
tadpoleSystem.tmat = new THREEA.Matrix4();
tadpoleSystem.track = function () {
    // tadpoleSystem.tmat.getInverse(V.rawscene.matrix);  // lhs version of rot4
    // function ss(gp) {
    //     if (!gp) return;
    //     if (!gp.realsphere) gp.realsphere = W.msynthScope.Sphere(0.02);
    //     let v = gp.realsphere.position;
    //     if (gp) {
    //         tadpoleSystem.tmat.getInverse(V.rawscene.matrix);  // lhs version of rot4
    //         tadpoleSystem.tmat.multiply(gp.raymatrix);
    //         //v.setFromMatrixPosition(tadpoleSystem.tmat);
    //         v.set(0, 0, -G.tadBaitDist).applyMatrix4(tadpoleSystem.tmat);
    //         //v.setFromMatrixPosition(gp.raymatrix);  // raymatrix already allows for some transforms, and pointer at end not wrist
    //         //v.applyMatrix4(tadpoleSystem.tmat);
    //     } else {
    //         v.set(999,999,999);
    //     }
    // }
    // ss(V.gpR);
    // ss(V.gpL);
};
tadpoleSystem.useGreyWall = true;
tadpoleSystem.greywall = (grey = tadpoleSystem.useGreyWall) => {
    if (grey) {
        G.wall_blue1 = 1; // bland walls
        G.wall_red1 = G.wall_green1 = G.wall_blue1;
        G.wall_red2 = G.wall_green2 = G.wall_blue2;
        G.wall_red3 = G.wall_green3 = G.wall_blue3;
        G.wall_iridescence1 = G.wall_iridescence2 = G.wall_iridescence3 = 0;
        G.wall_fluorescS1 = G.wall_fluorescS2 = G.wall_fluorescS3 = 0;
        G.wall_band1 = 99999;
        G.wall_gloss1 = 0;
        G.wall_bumpstrength = 0;
    }
    else {
        G.wall_fluorescS1 = G.wall_fluorescS2 = G.wall_fluorescS3 = 1;
    }
};
tadpoleSystem.tune = function () {
    const tad = tadpoleSystem;
    G.attractDist = 0.05;
    G.attractPow = -4;
    tad.defaultTadAttractors = 0.002;
};
/** set up extra forces around controller rays */
tadpoleSystem.xspring = function () {
    addgeneperm('twistBase', 0, 0, 1, 0.0001, 0.0001, 'base twist around controllers', 'tadspring', 0);
    addgeneperm('twistL', 0, 0, 1, 0.01, 0.01, 'twist around left controller', 'tadspring', 0);
    addgeneperm('twistDL', 0.3, 0, 1, 0.01, 0.01, 'offset to form twist', 'tadspring', 0);
    // adduniform('con PositionL', VEC3(), 'v3', 'tadspring');
    adduniform('condirL', VEC3(), 'v3', 'tadspring');
    adduniform('baitPositionL', VEC3(), 'v3', 'tadspring');
    addgeneperm('twistR', 0, 0, 1, 0.01, 0.01, 'twist around right controller', 'tadspring', 0);
    addgeneperm('twistDR', 0.3, 0, 1, 0.01, 0.01, 'offset to form twist', 'tadspring', 0);
    // adduniform('con PositionR', VEC3(), 'v3', 'tadspring');
    adduniform('condirR', VEC3(), 'v3', 'tadspring');
    adduniform('baitPositionR', VEC3(), 'v3', 'tadspring');
    // do early, roles may not be established, and code may remove them anyway later ..
    addgeneperm('tadAttractorsL', 250, 0, 2000, 1, 1, 'left attract', 'tadspring', 0);
    addgeneperm('tadAttractorsR', 250, 0, 2000, 1, 1, 'left attract', 'tadspring', 0);
    addgeneperm('attractDist', 0.05, 0, 0.2, 0.01, 0.01, 'length of attract "spring"', 'tadspring', 0);
    addgeneperm('attractPow', -4, -6, 0, 0.1, 0.1, 'power of attract "spring"', 'tadspring', 0);
    addgeneperm('xradiusL', 0, 0, 1, 0.01, 0.01, 'left sphere exclusion zone', 'tadspring', 0);
    addgeneperm('xradiusR', 0, 0, 1, 0.01, 0.01, 'right sphere exclusion zone', 'tadspring', 0);
    addgeneperm('xradiusforce', 1e20, 0, 1e30, 1, 1, 'force for sphere exclusion zone', 'tadspring', 0);
    adduniform('tadWallSize', VEC3(), 'v3', 'tadspring');
    addgeneperm('wallStr', 1, 0, 5, 0.1, 0.1, 'wall repulsion strength', 'tadspring', 0);
    G.xradiusforce = 1e20;
    // note: controller at con PositionL/con PositionR, bait at baitPositionL/baitPositionR
    // but controller position not actually needed.
    springs.newmat({
        codePrepend: `
            uniform float xradiusforce;
            uniform float twistL, twistDL, xradiusL; uniform vec3 condirL, baitPositionL; // con PositionL,
            uniform float twistR, twistDR, xradiusR; uniform vec3 condirR, baitPositionR; // con PositionR,
            uniform float tadAttractorsL, tadAttractorsR;
            uniform float attractDist, attractPow;
            uniform float wallStr; uniform vec3 tadWallSize;


            // attraction (repluse) forces to controller and ray
            // twisting force around single controller ray, also attract/repulse to ray
            vec3 attForce(vec3 mypos, vec3 condir, float twistf, float twistD, float att, float xradius, vec3 baitpos) { // vec3 con Position,
                float partn = part * VnumInstancesP2;  // partn ranges from 0.5..VnumInstancesP2-0.5
                vec3 frombait = mypos - baitpos;
                // vec3 fromcon = mypos - co nPosition;         // direction from controller to me
                vec3 tforce;
                if (floor(mod(partn, ${tadpoleSystem.RIBS}.0)) != 0.) {  // twist and attract by head only
                    tforce = vec3(0,0,0);
                } else {
                    if (twistf != 0.) { // twist
                        // note: frombait or from controller same for this cross, as bait and controller both on ray
                        vec3 twistx = cross(frombait, condir);  // cross with ray dir gives ...
                        float d = length(twistx);               // distance of me from ray
                        vec3 forcedir = twistx/d;               // direction for twist force
                        float btforce = twistf * d / ((twistD + d) * (twistD + d));   // shape force by distance
                        tforce = btforce * forcedir;            // compute complete twist force
                    }

                    // attract ... like spring attract but simpler
                    // no backbone, springlen, springpow, springforce, roleforce, boost, powBaseDist, minactive, maxactive ...???
                    float len = length(frombait);               // length of this spring
                    float ddist = len - attractDist;            // difference from target length (may be +ve or -ve)
                    // -1 on pow below as frombait/len is direction of force
                    // min below is not just for extreme cases, it applies a huge amount of the time
                    // to consider if it really should be like that
                    tforce -= frombait * (att * ddist * min(1., pow(len, attractPow - 1.)));

                    // // attract to ray experiment, not very good
                    // vec3 toraydir = normalize(cross(dir, twistx));      // direction from point to ray
                    // vec3 aforce = s * toraydir;


                }   // head only forces

                // repulse from walls;
                // ??? by heads only for better 'bounce' ?
                // but by all for better imported form squashed on wall
                float d;
                d = mypos.x - tadWallSize.x; if (d > 0.) tforce.x += -wallStr*d;
                d = mypos.y - tadWallSize.y; if (d > 0.) tforce.y += -wallStr*d;
                d = mypos.z - tadWallSize.z; if (d > 0.) tforce.z += -wallStr*d;
                d = -mypos.x - tadWallSize.x; if (d > 0.) tforce.x += wallStr*d;
                d = -mypos.y - tadWallSize.y; if (d > 0.) tforce.y += wallStr*d;
                d = -mypos.z - tadWallSize.z; if (d > 0.) tforce.z += wallStr*d;

                // sphere exclusion zones (all tads)
                float dd = length(frombait);
                if (dd < abs(xradius))
                    tforce += pow(xradius - dd, 3.) * xradiusforce * frombait;

                return tforce;

                // return aforce + tforce;
            }
        `,
        codeOverrides: `override vec3 customForce(vec3 mypos) {     // combination of the two twist forces
            vec3 l = attForce(mypos, condirL, twistL, twistDL, tadAttractorsL, xradiusL, baitPositionL);  // con PositionL,
            vec3 r = attForce(mypos, condirR, twistR, twistDR, tadAttractorsR, xradiusR, baitPositionR);  // con PositionR,
            return l+r;
        }`
    });
    // ensure the values get set now and every frame
    tadpoleSystem.springframe();
    if (!tadpoleSystem._sprframe)
        tadpoleSystem._sprframe = everyframe(() => tadpoleSystem.springframe());
};
/**
 * V.gpL.baitPosition: vec3 (same as raymatrix)
 * V.gpL.poseMatrix matrix (same as raymatrix?)
 * raymatrix: matrix
 * meshray: Line
 * V.gpL.threeObject.matrix (almost same as raymatrix)
 *
 */
COL.tcol3 = col3(); // save garbage
COL.randcols2 = function (options = {}, colnum) {
    const rrr = Math.random;
    let { h = rrr(), hr = 0.5, hrr = 0.1, s = 1, sr = 0.5, v = 1, vr = 0.5 } = options;
    if (colnum === undefined) {
        for (colnum = 0; colnum < COL.NUM; colnum++)
            COL.randcols2({ h, hr, s, sr, v, vr }, colnum);
        return;
    }
    const col = COL.tcol3;
    const rcol = () => col.setHSV(h - hr + 2 * hr * rrr(), s - sr + 2 * sr * rrr(), v - vr + 2 * vr * rrr());
    h = h - hr + 2 * hr * rrr();
    hr = hrr;
    s = 0.7;
    sr = 0;
    COL.setarr('red1', colnum, rcol());
    s = 1;
    sr = 0;
    COL.setarr('red2', colnum, rcol());
    s = 0.5;
    sr = 0;
    h += 0.5;
    COL.setarr('red3', colnum, rcol());
};
COL.bold = function () {
    COL.setx({ 'irid': 0, bump: 0, flu: 0 });
    const col = COL.tcol3;
    for (let colnum = 0; colnum < COL.NUM; colnum++) {
        col.setHSV(colnum * .715, 1, 1);
        COL.setarr('red1', colnum, col);
        COL.setarr('red2', colnum, col);
        COL.setarr('red3', colnum, col);
    }
};
/**
xrsess = renderer.vr.getSession();
xrsess.onend = ()=> log('end')
xrsess.onselect = ()=> log('select')
xrsess.onselectend = ()=> log('onselectend')
xrsess.onselectstart = ()=> log('onselectstart')
xrsess.onvisibilitychange = ()=> log('onvisibilitychange')
xrsess.oninputsourceschange = ()=> log('oninputsourceschange')
**/
//# sourceMappingURL=tadpole - Copy.js.map