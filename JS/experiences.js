/* eslint-disable object-curly-newline */
'use strict';
// experiences of different kinds; make 'default' experience the first of each group,
// it will be reused alternated with the others of the group
var randobj, random_colours, _boxsize, restore_start_form, restore_view_etc,
V, randsynth, log, viveAnim, msgfix, addtarget, inputs, genedefs, copyFrom, startvr, Maestro, nomess, vrresting,
G, newtarget, vrclick, mix, loadOao, camera, setAllLots, cleangenesall, currentGenes, getfiledata, dstringGenes,
runcommandphp, S, renderVR, posturiasync, writetextremote, yaml, msgtrack, sleep, makevr;

var experiences, E = {};

/** this sets up the experiences for clicking the different buttons, does NOT define presshold action */
function setexperiences() {
    experiences = {
    righttrigger: { prio: 0, opts: [{}] }, // dummy so something valid is there
    leftpadlr: { prio: 1, opts: [
        { _scale: 0.5, info:'normal size form', t: 4000, restt: 500 },
        { _scale: 0.1, info:'little form' },
        { _scale: 2.5, info:'very big form' },
        { _scale: 1, info:'big form' }
    ]},
    // use _lroomsize (log) so it grows more sensibly
    leftpadbt: { prio: 1, opts: [
        { _lroomsize: 1,    _posx: 0,  _posy: -250,  _posz: -_boxsize*0.6,  _scale: 0.5,   _camz: 300,    info:'standard room', t: 4000, restt: 500 },
        { _lroomsize: 0.4,  _posx: 0,  _posy: 300,   _posz: -_boxsize*0.5,  _scale: 0.5,   _camz: 300,    info:'"real" room size' },
        { _lroomsize: -0.2, _posx: 0,  _posy: 150,   _posz: -_boxsize*0.8,  _scale: 0.15,  _camz: 300,   info:'tiny room' },
        { _lroomsize: 1.7,  _posx: 0,  _posy: -100,  _posz: -_boxsize*0.6,  _scale: 0.8,   _camz: 300,    info:'big room' }
    ]},
    rightpadlr: { prio: 1, opts: [
        { light0s: 0.3, light1s: 0.6, light2s: 0.2, ambient: 0.002, info:'normal lights', t: 800, restt: 1000,
            light0r: 1, light0g: 1, light0b: 1,
            light1r: 1, light1g: 1, light1b: 1,
            light2r: 1, light2g: 1, light2b: 1 },
        //{ light0s: 0.6, light1s: 0.006, light2s: 0.001, ambient: 0.0001, info:'headlight only' } ,
        //{ light0s: 0.003, light1s: 0.6, light2s: 0.001, ambient: 0.0001, info:'torch only' } ,
        //{ light0s: 0.003, light1s: 0.006, light2s: 0.6, ambient: 0.0001, info:'fixed light only' } ,
        { light0s: 0.003, light1s: 0.006, light2s: 0.002, ambient: 0.0001, info:'dark' },
        { light0s: 0.3, light1s: 0.6, light2s: 0.2, ambient: 0.0001, info:'coloured lights',
            light0r: 1, light0g: 0, light0b: 0,
            light1r: 0, light1g: 1, light1b: 0,
            light2r: 0, light2g: 0, light2b: 1 }
    ]},
    rightpadbt: { prio: 0.1, opts: [  // move viewer, do NOT use as experience for now
        {_camx: 0, _camz: 400, info:'viewer to near back wall', t: 4000, restt: 500 },
        {_camx: 0, _camz: 0, info:'viewer to centre' }
    ]},
    leftsidebutton: { prio: 1, opts: [  // play with wall
        { wallAspect: -1, superwall: 0, info:'rectangular wall', t: 4000, restt: 500 },
        { wallAspect: -1, superwall: 0.4, info:'superegg wall', t: 4000, restt: 500 },
        { wallAspect: -1, superwall: 0.1, info:'angular wall', t: 4000, restt: 500 }
        // { wallAspect: -1, superwall: 0.5, info:'ellipse wall', t: 4000, restt: 500 }
    ]},
    reflchange:
        { prio: 1, fun: rand_refl,  t: 4000, restt: 500  },  // play with reflectivity
    lefttrigger:
        {prio: 1, t: 5000, restt: 2500, fun: E.random_form},
    lefttrigger_:
        {prio: 1, t: 20000, fun: function slow_mutate() { var ntarget = {}; return randobj(ntarget, false, ""); }},
    rightsidebutton:
        {prio: 1,  t: 500, restt: 1500, fun: random_colours},
// no, leave that to positioning when the room changes
//    leftsidebutton: {prio: 1, opts: [
//        {prio: 1,  _posx: 0, _posy: 0, _posz: -_boxsize, info:'form to back', t: 1000, restt: 500 },
//        { _posx: 0, _posy: -_boxsize, _posz: 0, info:'form moved down' }
//    ]},
    leftabovepadbutton:
        {prio: 1,  t: 2500, restt: 500, fun: restore_start_form},
    rightabovepadbutton:
        {prio: 1,  t:2000, restt: 500, fun: restore_view_etc},
    extratest:
        {prio: 3,  t:2000, restt: 500, fun: loadVariant}
    } // end experiences
    fininshExperiences();
}

/** tidy up experiences and make ready for runtime  */
function fininshExperiences() {
    let s = 0;
    for (let i in experiences) {
        const exp = experiences[i];
        if (!exp.opts) exp.opts = [exp];
        exp.pos = 0;
        if (exp.prio === undefined) exp.prio = 1;
        s += exp.prio;
    }
    randexperience.keys = Object.keys(experiences);   // make sure iteration order is consistent
    randexperience.cw = [];     // cumulative weights
    let ss = 0;
    for (let i= 0; i < randexperience.keys.length; i++) {
        const k = randexperience.keys[i];
        ss += experiences[k].prio;
        randexperience.cw[i] = ss/s;  // normalized cumulative wieght
    }
    randexperience.last = [99,99,99];
}

V.skipRightExperience = true;

/** perform an experience based on key */
function doexperience(key, dir = 1, exppos=undefined) {
    if (V.skipactions) return;
    if (V.resting) {  // disable roomsize if resting ... quick patch 11 Mar 19
        // similar done in anim.ts done elsewhere copyFrom(G, { _lroomsize: 1,    _posx: 0,  _posy: -250,  _posz: -_boxsize*0.6,  _scale: 0.5,   _camz: 300, _camy : -250} );
        if (key === 'leftpadbt') return;
    }
    // we seem to be getting piste random action on right trigger newpress, and then this call as well.  check TODO >>>
    // but no random in tadpole so patch to get it ok for tadpole
    if (key === 'righttrigger' && V.skipRightExperience)
        return;
    randsynth();
    // pad hit in middle, could add extra options but for now just use both lr and bt
    if (key.endsWith('pad')) {doexperience(key + 'lr'); doexperience(key + 'bt'); return; }
    var exp = experiences[key];
    if (!exp) { /** log('bad experience key click', key); **/ return; }
    const opts = exp.opts;

    let {t, mint, maxt} = opts[0] || {}; //  as any;  // extract override times if any
    if (t) { mint = 0.5 * t; maxt = 2*t; }
    viveAnim.time = maxt ? mint + Math.random() * (maxt - mint) : viveAnim.basetime;

    // alternate item 0 and other item
    //
    if (opts.length !== 1) {  // do not attempt others if only one
        exp.pos = (exp.pos + dir * 0.5 + opts.length - 1) % (opts.length - 1);
        var id = exp.pos % 1 === 0 ? exp.pos + 1 : 0;
    } else {
        id = 0;
    }
    if (exppos !== undefined) id = exppos;
    var msg;
    if (opts[id].fun) {
        let fun = opts[id].fun;
        var ntarget = fun();
        msg = msgfix('+click', key, fun.name.replace(/_/g, ' '), opts[id].info);
    } else {
        ntarget = opts[id];
        if (!ntarget) return;
        msg = msgfix('+click', key, ntarget.info);
    }
    if (inputs.using4d && ntarget && '_posx' in ntarget) return;  // way to stop attempted 4d movement
    addtarget(ntarget);
    return msg;
}


/** choose a pseudo-random experience */
function randexperience(button) {
    if (genedefs.gscale) genedefs.gscale.free = 0; // should always be, but ...??? no gscale for fano etc

    var keys = randexperience.keys;
    var msg;
    if (Math.random() < V.homeprob) {  // homeprob increases with each non-home choice
        // the home effect collects first values from each experience group and applies them all
        var v = {};
        for (let k in experiences) {
            const exp = experiences[k];
            if (typeof exp !== 'function') {
                copyFrom(v, exp.opts[0]);
                exp.pos = Math.floor(exp.pos) + 0.5;  // so it goes to non-home next time
            }
        }
        addtarget(v);
        msg = msgfix('+click', 'HOME');
        viveAnim.time = 2000;
        viveAnim.resttime = 150;
        V.homeprob = 0;

    } else {
        // choose between experiences, random, but avoid last 3 chosen
        let i;  // i will be the chosen index
        do {
            const r = Math.random();
            for (i = 0; i < keys.length; i++) // choose i acccording to weights
                if (r < randexperience.cw[i]) break;
        } while (randexperience.last.indexOf(i) !== -1);  // but make sure it is not a recent choice
        randexperience.last.push(i); randexperience.last.splice(0,1);
        var key = keys[i];
        msg = doexperience(key, 1);
        V.homeprob += 0.2;
    }
    return msg;
}

/** random reflection experience, can be primed for experiment */
function rand_refl(r = Math.random()) {
    const v = {};
    v.wall_refl1 = r;
    v.wall_refl2 = Math.sqrt(r);
    v.wall_refl3 = r * r;

    v.wall_bumpscale = mix(50,500,r);
    v.wall_bumpstrength = 50/v.wall_bumpscale;
    addtarget(v);
    return v;
}

/** simulate a vr button click, get a response  */
function simclick(key = 'righttrigger', dir = 1) {
    // first time
    if (!startvr && !V.pretendbutton.viveAnim) {
        V.pretendbutton.viveAnim = Maestro.on('postframe', ()=>viveAnim(V.pretendbutton));
        if (loadOao.lastfn === "gallery/startup.oao")
            loadOao("gallery/GalaxRefl.oao");
    }
    nomess(false);
    msgfix.all = true;
    vrresting.bypassResting = true;  // we are in simulation mode, get rid of resting confusion
    G._fov = 70;
    V.skip = false;

    let msg;
    if (key === 'righttrigger')
        msg = newtarget(V.pretendbutton);
    else
        msg = vrclick(V.pretendbutton, key, dir, 1);
    log('simulate ', key, msg);
}

/** keep in room, preserve height/y */
V.putinroomh = function(usewall, x) {
    return V.putinroom(usewall, x);  // << original was forcing camera to middle of smallish rooms with x.y being high
    const wt = G.walltype;
    let n = wt === 0 ? 0 : wt === 1 ? 0.5 : G.superwall;
    if (n < 0.01) n = 0.01;
    const p = 1/n;
    // k*x^p + k*z^p + y^p = r^p
    const r = usewall;
    const abs = Math.abs;
    const k = (abs(x.x) ** p + abs(x.z) ** p) / (r ** p - abs(x.y)**p);

    if (k > 1) {
        const rr = 1 / k ** n;
        x.x *= rr;
        x.z *= rr;
    }
}

/** keep in room */
V.putinroom = function(usewall, x) {
    const wt = G.walltype;
    let n = wt === 0 ? 0 : wt === 1 ? 0.5 : G.superwall;
    if (n < 0.01) n = 0.01;
    const p = 1/n;
    // k*x^p + k*z^p + y^p = r^p
    const r = usewall;
    const abs = Math.abs;
    const k = (abs(x.x) ** p + abs(x.y) ** p + abs(x.z)**p) / (r ** p );

    if (k > 1) {
        const rr = 1 / k ** n;
        x.x *= rr;
        x.y *= rr;
        x.z *= rr;
    }
}


E.usecurated = 0.75;  // probability of using curated form for random
E.random_form = function random_form() {
    if (Math.random() < E.usecurated && loadVariants.list && loadVariants.list.length !== 0) {
        const t = experiences.lefttrigger.opts[0].t;  // temp? way to share time for real random and curated variant
        return loadVariant(-1, t);
        // return {};  // loadVariant uses S.ramp for effect
    } else {
        var ntarget = {};
        loadVariant.lastn = -1;
        loadVariant.lastfn = 'none';
        msgfix('+leftload', 'random form');
        const r = randobj(ntarget, false, "");
        addtarget(ntarget);
        return r;
    }
}

/** set plain colours */
function setplain() {
    setAllLots( 'red|green|blue', {value:1, free:0});
    setAllLots( '_refl[123]', {value:0, free:0});
    setAllLots( 'gloss', {value:0.5, free:0});
    setAllLots( 'bumpstr', {value:1, free:0});
    setAllLots( 'wall_bumpstr', {value:0, free:0});
    setAllLots( 'superwall', {value:0, free:0});
}

/** load variants async, opts is the list of filenames, i is index */
E.loadvariantsn = function(opts, optsg, i) {
    if (i >= opts.length) {
        if (false && renderVR.invr()) {  // this is causing Canary 66.0.3350.0 to freeze, tab bombard bug
            makevr();  // for some reason this joggles things and helps with performance
            setTimeout( () => makevr(), 500);  // for some reason this joggles things and helps with performance
            setTimeout( () => makevr(), 5000);  // for some reason this joggles things and helps with performance
        }
        return;
    }
    const fn = opts[i].trim();
    const fng = fn.replace('.oao', '.oag');
    const useg = optsg.indexOf(fng) !== -1;
    const fnu = useg ? fng : fn;
    posturiasync('gallery\\' + fnu,
        function(data) {
            E.loadonevariant(data, i, fnu, fng);
            E.loadvariantsn(opts, optsg, i+1);
        });
}

E.loadonevariant = function(data,i, fn, fng) {
    if (!data) { log('cannot load variant', fn); return; }
    const dd = dstringGenes(data);
    const genes = dd.genes || dd;  // to allow for oao or oag

    for (let gn in genes) if (!(gn in currentGenes)) delete genes.gn; // clean

    if (i !== 0 && (dd.inputState || E.writeall)) {  // save short version, except of root fn
        writetextremote('gallery/' + fng, yaml.safeDump(genes));
    }
    if (genes.tranrule !== currentGenes.tranrule) {
        console.error('tranrule change for ', fn);
        genes.tranrule = currentGenes.tranrule
    }

    const ngenes = {};  // the genes we decide to keep
    loadVariants.list.push(ngenes);
    for (let gn in genes) {
        if (loadVariants.ignore.indexOf(gn) !== -1)  { /** / log('ignore gene', gn); /**/ continue; }
        if (gn.startsWith('light') && gn.slice(-1) !== 's') { /** log('ignore gene', gn); **/ continue; }
        if (gn.startsWith('_cam')) continue;
        // if (!genedefs[gn]) log('gene with no genedef', gn);
        if (! (gn in currentGenes)) { /* log('gene with no currentGene', gn); */ continue; }
        if (typeof genes[gn] !== 'number') continue;
        // if (genedefs[gn] && genedefs[gn].free === 0 && currentGenes[gn] !== genes[gn])  log('frozen gene difference', gn, currentGenes[gn], genes[gn]);
        // if (genedefs[gn] && genedefs[gn].free === 0) continue;
        const gd = genedefs[gn];
        if (gd) {
            if (genes[gn] > gd.max) {
                log('gene err exceeds max', gn, genes[gn], gd.max, fn);
                genes[gn] = gd.max;
            }
            if (genes[gn] < gd.min) {
                log('gene err less than min', gn, genes[gn], gd.max, fn);
                genes[gn] = gd.min;
            }
        }
        ngenes[gn] = genes[gn];
    }
    if (genes._camz > 450) {
        log('camz forced for',  fn, 'was',  genes._camz);
        ngenes._camz = 450;  // primitive keep in room in case of objectes saved out of vr
    }
    ngenes._filename = fn;
    log('loaded variant', i, fn);
}

/** load up variants, save the interesting genes in loadVariants.list */
function loadVariants() {
    cleangenesall();    // save too much wasted effort
    loadVariants.list = [];
    loadVariants.lastname = currentGenes.name;
    const opts = (runcommandphp('dir /b gallery\\' + currentGenes.name + '_*.oao') || '').trim().split('\r\n');
    const optsg = (runcommandphp('dir /b gallery\\' + currentGenes.name + '_*.oag') || '').trim().split('\r\n');
    // make sure we use the variants that are oag only
    for (let i = 0; i < optsg.length; i++) {
        const g = optsg[i].replace('.oag', '.oao');
        if (opts.indexOf(g) === -1) opts.push(g);
    }
    opts.push(currentGenes.name + '.oao');  // so we include the standard starter

    E.loadvariantsn(opts, optsg, 0);
    return;


    for(let i=0; i < opts.length; i++) {
        const fn = opts[i];
        const data = getfiledata('gallery\\' + fn);
    }
}
loadVariants.ignore = 'cutx cuty wallAspect time _camx _camy _camz _scale _posx _posy _posz'.split(' ');

/** delete (move) a curated slot */
function deletecurated() {
    const list = loadVariants.list;
    const n = loadVariant.lastn;
    const fn = loadVariant.lastfn;
    if (n === -1) return msgfix('+deletedeletecurated','nothing to delete, random form loaded last?');
    if (list[loadVariant.lastn]._filename !== fn)
        return msgfix('+deletedeletecurated','unexpected list confusion', n, fn, list[loadVariant.lastn]._filename);

    // move the files, most of the commands below will fail, this is quick code that should work
    try { runcommandphp('mkdir gallery\\removed') } catch(e) { /**/ }
    try { runcommandphp('move /y gallery\\' + fn.replace('.oao', '.oag') +  ' gallery\\removed') } catch(e) { /**/ }
    try { runcommandphp('move /y gallery\\' + fn.replace('.oag', '.oao') +  ' gallery\\removed') } catch(e) { /**/ }
    try { runcommandphp('move /y gallery\\' + fn.replace('.oao', '.jpg') +  ' gallery\\removed') } catch(e) { /**/ }
    try { runcommandphp('move /y gallery\\' + fn.replace('.oag', '.jpg') +  ' gallery\\removed') } catch(e) { /**/ }
    list.splice(n, 1);
    msgfix('+deletedeletecurated','removed', n, fn);
    loadVariant.lastn = -1;
}

/** load variant n (default random item) and step to it in time t (default 2 seconds) **/
function loadVariant(n = -1, t = 2000) {
    if (loadVariants.lastname !== currentGenes.name) loadVariants();
    if (n === -1 || n === undefined) n = Math.floor(Math.random() * loadVariants.list.length);
    const list = loadVariants.list[n];
    if (!list) {log('cannot load variant', n, 'num is', loadVariants.list.length); return; }

    //for (let gn in list)
    //    if (gn !== '_filename') S.ramp(currentGenes, gn, list[gn], t);
    // using different mechanisms can cause jumping if both get to see the same element
    // for now, 6/12/17 just use vtarget ... maybe later move all vtarget stuff to S.step
    const ret = {}; copyFrom(ret, list);

    // generate random form size and room wize for now, as not properly curated.  4/12/2017
    // leftpadbt sets sensible form size for room size, so no need for leftpadlr
    //if (Math.random() < 0.3)
    //    doexperience('leftpadlr');
    if (Math.random() < 0.3)
        doexperience('leftpadbt');

    msgfix('+leftload', 'lefttrigger curated',  n, list._filename);
    loadVariant.lastn = n;
    loadVariant.lastfn = list._filename;
    log('loaded variant with random sizes', n, list._filename);
    return ret;
}
loadVariant.lastn = -1;

/** function to be called after main vivecontrols done, place for tying genes together etc */
function aftercontrol() {
    G.shrinkradiusA =  E.baseshrinkradiusA / G._roomsize;
    G.shrinkradiusB =  E.baseshrinkradiusB * G._scale;
}
E.baseshrinkradiusA = 150;
E.baseshrinkradiusB = 200;

E.debug = function(n = 0) {
    nomess(false); msgfix.all = true;
    msgfix();
    msgtrack('_camz _camy _posy _roomsize _lroomsize renderVR.camera.pose.position')
    vrresting.bypassResting=true

    copyFrom(G, experiences.leftpadbt.opts[n]);
}

setexperiences();  // after all E.xxx function established

E.reviewVariants = async function(t=500) {
    if (!loadVariants.list || loadVariants.list.length === 0) loadVariants();
    for (let i=0; i < loadVariants.list.length; i++) {
        copyFrom(G, loadVariant(i));
        log('variant', i);
        await sleep(t);
    }
};
