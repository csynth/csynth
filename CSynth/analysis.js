'use strict';

var CSynth, msgfixlog, springs, spearson, G, format, msgfix, sleep, log, numInstances, distxyz, col3, throws,
Eigenvalues, VEC3, uniforms, geneOverrides, copyFrom, inworker, Worker, currentGenes, applyMatop, height, width, GO, framenum, glsl, S, array2Table, getstats,$;

var setViewports, genedefs, mutate, slots, vps, setObjUniforms, renderObjsInner, mainvp, V, rot4toGenes, refmain, setAllLots, msgfixerrorlog,
    clamp, U, addscript, makeDraggable;

// get positions for key or ready made positions
CSynth.pos = function(inputDef) {
    const cc = CSynth.current;
    let use;
    // Allow for all sorts of inputs
    if (inputDef === 'model') {                                   // use current model as used by dynamics
        throws('cannot use "model" to compute positions');
    } else if (typeof inputDef[0] === 'number') {    // ready made distances (correct format assumed), Array.isArray(inputDef)
        throws('cannot use distance array to compute positions');
    } else if (Array.isArray(inputDef) && 'z' in inputDef[0]) {   // array of points
        use = {coords: inputDef, reason: 'points as input'};
    } else if (!isNaN(parseInt(inputDef))) {                      // implicit index into xyzs
        use = cc.xyzs[inputDef];
    } else if (typeof(inputDef) === 'string' && inputDef[0] === 'x') {  // explict index into xyzs
        const ssss = + inputDef.substring(1);
        use = cc.xyzs[ssss];
    } else if (inputDef.isXyz) {                                  // xyz structure
        use = inputDef;
    } else if (inputDef.startsWith('cur')) {                       // current positions
        use = {coords: springs.getpos(), reason: 'current positions'};
    } else if (typeof(inputDef) === 'string' && inputDef[0] === 'c') {  // explicit index into contacts
        throws('cannot use contact numnber to compute positions');
    } else if (inputDef.isContact) {                              // contact structure
        throws('cannot use contacts to compute positions');
    } else {
        throw new Error('Invalid input to CSynth.dists', inputDef)
    }
    return use.coords;
}

/** compute dists for positions, return [distances, reason], dres can have array ready for distances */
CSynth.dists = function csynthdists(inputDef, statsres = CSynth.statsres, dres=undefined) {
    const cc = CSynth.current;
    let use;

    // Allow for all sorts of inputs
    // If this resolves to contacts,  return associated distances
    // If already array of numbers assume ready made distances
    // If it resolves to points, compute distances
    if (inputDef === 'model') {                                   // use current model as used by dynamics
        const sss = cc.selectedSpringSource;
        const ncc = cc.contacts.length;
        if (sss < ncc) use = cc.contacts[sss];
        else use = cc.xyzs[sss-ncc];
    } else if (typeof inputDef[0] === 'number') {    // ready made distances (correct format assumed), Array.isArray(inputDef) fails on typed arrays
        return [inputDef, 'dists as input'];
    } else if (inputDef.length === 2 && typeof inputDef[0][0] === 'number' && typeof inputDef[1] === 'string') {    // ready made dist pair
        return inputDef;
    } else if (Array.isArray(inputDef) && 'z' in inputDef[0]) {   // array of points
        use = {coords: inputDef, reason: 'points as input'};
    } else if (!isNaN(parseInt(inputDef))) {                      // implicit index into xyzs
        use = cc.xyzs[inputDef];
    } else if (inputDef.startsWith('cur')) {                       // current positions
        // special caching for current, handle and return
        if (CSynth.dists.framenum === framenum && CSynth.dists.stepsSoFar === springs.getStepsSoFar())
            return CSynth.dists.framedists;
        CSynth.dists.framenum = framenum;
        CSynth.dists.stepsSoFar = springs.getStepsSoFar();
        return CSynth.dists.framedists = [gendists(springs.getpos()), 'current positions']
    } else if (typeof(inputDef) === 'string' && inputDef[0] === 'x') {  // explict index into xyzs
        const ssss = + inputDef.substring(1);
        use = cc.xyzs[ssss];
    } else if (typeof(inputDef) === 'string' && inputDef.startsWith('cap')) {  // explict index into contacts
        const ssss = + inputDef.substring(3);
        return [CSynth.captures[ssss].dists[0], 'capture' + ssss];
    } else if (inputDef.isXyz) {                                  // xyz structure
        use = inputDef;
    } else if (inputDef.isContact) {                              // contact structure
        use = inputDef;
    } else {
        throw new Error('Invalid input to CSynth.dists', inputDef)
    }
    let key = statsres + inputDef;
    if (use.isContact)  // check for changed details that effect contact distances
        key += 'contactforcesc,patchval,pushapartforce,powBaseDist,pushapartpow,m_k,m_alpha,representativeContact,wrongfade'
            .split(',').map(k=>GO[k]).join(',');

    let result = use.dists && use.dists[key];
    if (result) return result;

    if (use.isContact) {
        result = [CSynth.contactToDistArray(use), use.shortname];
    } else {
        result = [gendists(use.coords), use.shortname || use.reason];
    }
    if (use.dists) { use.dists = {}; use.dists[key] = result; } // do not keep more than one
    return result;

    function gendists(s) {
        // resample to correct resolution if necessary
        if (s.length !== statsres)
            s = CSynth.sample(s, statsres);

        // and generate distances
        const n = s.length;
        const d = dres || new Float32Array(n * (n-1)/2);
        let k = 0;
        for (let i=0; i<n; i++)
            for (let j=i+1; j<n; j++)
                d[k++] = distxyz(s[i], s[j]);  // do not use .distanceTo, may not be THREE vectors
        return d;
    }
}

/** compute correlation between two distance maps
flags may be any (string) combination of rmse wrmse pearson spearman to choose stats to compute
and nonormalize to prevent normalization
dres1 and dres2 are optional arrays to hold distances for s1 and s2
*/
CSynth.correl = function csynthcorrel(s1, s2, flags='all', statsres=undefined, dres1=undefined, dres2=undefined) {
    flags = ' ' + flags + ' ';
    if (flags.indexOf(' all ') !== -1) flags += ' rmse wrmse pearson spearman '; // bucket ';
    let [d1, reason1] = CSynth.dists(s1, statsres, dres1);
    let [d2, reason2] = CSynth.dists(s2, statsres, dres2);
    if (d1.length !== d2.length) {msgfixlog('rmse', 'cannot compare rmse, wrong lengths', d1.length, d2.length)}

    if (flags.indexOf(' filter1 ') !== -1) {
        const mm = d1.reduce((c,x) => Math.max(c,x), 0);  // why does d1.reduce(Math.max) not work
        // const mm = Math.max(...d1);  // blows it up
        let d1a = [], d2a = [];
        for (let i = 0; i < d1.length; i++) {
            if (d1[i] !== mm) {
                d1a.push(d1[i]);
                d2a.push(d2[i]);
            }
        }
        d1 = d1a; d2 = d2a;
    }

    const r = {};
    if (flags.indexOf( ' nonormalize ') === -1) {
        const ss1 = d1.reduce((c,x) => c + x, 0);
        const ss2 = d2.reduce((c,x) => c + x, 0);
        r.scale = ss1/ss2;
        if (CSynth.correlNormBase) {
            //log('correl Normalize to base', ss1, ss2, CSynth.correlNormBase);
            const scale1 = CSynth.correlNormBase/ss1;
            const scale2 = CSynth.correlNormBase/ss2;
            d1 = d1.map(x => x * scale1);
            d2 = d2.map(x => x * scale2);
        } else {
            //log('correl Normalize to first', ss1, ss2);
            d2 = d2.map(x => x * r.scale);
        }
    }

    if (flags.indexOf( ' rmse ') !== -1) r.rmse = CSynth.rmse(d1, d2);
    if (flags.indexOf( ' wrmse ') !== -1) r.wrmse = CSynth.wrmse(d1, d2);
    if (flags.indexOf( ' pearson ') !== -1) r.pearson = spearson.correlation.pearson(d1, d2);  // same as spearson.correl
    if (flags.indexOf( ' oldpearson ') !== -1) r.oldpearson = spearson.correlation.oldpearson(d1, d2);
    if (flags.indexOf( ' spearman ') !== -1) r.spearman = spearson.correlation.spearman(d1, d2, 'quick');
    if (flags.indexOf( ' oldspearman ') !== -1) r.oldpearman = spearson.correlation.spearman(d1, d2, true);
    if (flags.indexOf( ' bucket ') !== -1) r.bucket = spearson.correlation.bucket(d1, d2);
    // const sp2 = spearmanCorrelation(d1,d2);
    return r;
}
CSynth.correlNormBase = 0; // 1000000; beware changes when using workers, <<<

/** root mean square error */
CSynth.rmse = function csynthrmse(d1, d2) {
    const n = d1.length;
    let ss = 0;
    if (d1[0].x === undefined) {
        for (let i=0; i<n; i++)
            ss += (d1[i]-d2[i]) ** 2;
    } else {
        for (let i=0; i<n; i++) {
            const v1 =  d1[i], v2 = d2[i];
            ss += (v1.x-v2.x) ** 2 + (v1.y-v2.y) ** 2 + (v1.z-v2.z) ** 2;
        }
    }
    return Math.sqrt(ss / n);
}

/** weighted root mean square error */
CSynth.wrmse = function csynthwrmse (d1, d2) {
    const n = d1.length;
    let ss = 0, sw = 0;
    for (let i=0; i<n; i++) {
        const w = 1 / Math.max(d1[i], d2[i]);
        ss += (w * (d1[i]-d2[i])) ** 2;
        sw += w * w; // was 1, before that w ???
    }
    return Math.sqrt(ss / sw);
}


// from https://stackoverflow.com/questions/15886527/javascript-library-for-pearson-and-or-spearman-correlations
// used as cross-check.
// This version is only valid where all contact/distance values are distinct.
function spearmanCorrelation(p1, p2){
    const N=p1.length;
    const order=[];
    let sum=0;

    for(let i=0;i<N;i++){
        order.push([p1[i], p2[i]]);
    }

    order.sort(function(a,b){
        return a[0]-b[0]
    });

    for(let i=0;i<N;i++){
        order[i].push(i+1);
    }

    order.sort(function(a,b){
        return a[1]-b[1]
    });

    for(let i=0;i<N;i++){
        order[i].push(i+1);
    }
    for(let i=0;i<N;i++){
        sum+=Math.pow((order[i][2])-(order[i][3]), 2);
    }

    const r=1-(6*sum/(N*(N*N-1)));

    return r;
}

/** compute equivalent wish dist for gien contacts value with current settings */
CSynth.contact2Dist = function(contact, opts = U) {
    let {contactforcesc, pushapartforce, powBaseDist, pushapartpow, m_k, m_alpha, representativeContact, patchval} = U;
    let contactMult, contactPow;
    // const buff = U.contactbuff.source.data.data;
    if (contactforcesc !== 0) {
        contactMult = contactforcesc / pushapartforce * (powBaseDist ** pushapartpow);
        contactPow = (1 / (pushapartpow - 1));
    } else {
        contactMult = m_k ** (1/-m_alpha) / representativeContact;
        contactPow = -m_alpha;
    }
    if (contact < 0) contact = patchval;
    const d = (contact * contactMult) ** contactPow;  // regular distance
    return d;

}


/** compute complete array of target/wish dists for contacts,
 * input may be number, contact or array
 * if contactforcesc is nonzero assume CSynth implicit distances
 * else assume v **-alpha style
 * see CSynth.alignModels in csynth.js for some workings to deduce formula below
 * and also compare with nval() in matrix.js
 */
CSynth.contactToDistArray = function(c, alpha = G.m_alpha, k = G.m_k ) {
    const cc = CSynth.current;
    if (typeof(c) === 'number') c = cc.contacts[c];
    const minv = c.minv ? c.minv : 0.00001;  // should usually be minv

    if (c.isContact) {
        CSynth.contactsToTexture(c);    // in case not already done
        c = c.textureData;
    }
    if (!(c instanceof Float32Array)) {
        log('CSynth.contactToDistArray input not array', c);  // not serious may be fixed in a frame or so
        return;
    }


    const basen = Math.sqrt(c.length);  // particles for real data
    const n = CSynth.statsres || basen; //sample # particles
    const ds = new Array(n * (n-1)/2);
    // const pow = (a,b) => a**b;

    // use overridden distances, and cache them for efficiency
    const {contactforcesc, patchval, pushapartforce, powBaseDist, pushapartpow, wrongfade} = GO;
    const representativeContact = cc.representativeContact;
    let contactMult, contactPow, path;
    if (contactforcesc !== 0) {
        contactMult = contactforcesc / pushapartforce * (powBaseDist ** pushapartpow);
        contactPow = (1 / (pushapartpow - 1));
        path = 'csynth';
    } else {
        contactMult = k ** (1/-alpha) / representativeContact;
        contactPow = -alpha;
        path = 'lor';
    }
    if (n < 4) log('contactToDistArray', path, contactMult, contactPow);  // debug

    if (n === basen) {      // original quick version
        let p = 0;
        for (let i=0; i<n; i++) {
            for (let j=i+1; j<n; j++) {
                let contact = c[i*n + j]; //  / representativeContact;
                if (contact < 0) contact = patchval;
                else if (contact < minv) contact = minv;
                const d = (contact * contactMult) ** contactPow;  // regular distance
                ds[p++] = d;
            }
        }
    } else {    // version allowing sample
        const ss = CSynth.sample(new Array(basen).fill(0).map((x,i) => i), n); // sample inddices
        let p = 0;
        for (let i=0; i<n; i++) {
            const ii = ss[i];
            for (let j=i+1; j<n; j++) {
                let contact = c[ii*basen + ss[j]]; //  / representativeContact;
                if (contact < 0) contact = patchval;
                else if (contact < minv) contact = minv;
                const d = (contact * contactMult) ** contactPow;  // regular distance
                ds[p++] = d;
            }
        }
    }
    return ds;
}

/** get and cache mean distances --- WARNING no check on model parameters changing cached values  */
CSynth.meandists = function(contact) {
    const dists = CSynth.contactToDistArray(contact);
    const n = contact.numInstances;
    const c = contact.textureData;
    let sv=0, swd = 0, sd = 0, p = 0;
    for (let i=0; i<n; i++) {   // complicated as c is square, dists triangular
        for (let j=i+1; j<n; j++) {
            const d = dists[p];     // MAY GET OUT OF DATE
            const v = c[i*n + j];
            if (v >= 0) {
                sd += d;
                swd += d * v;
                sv += v;
            }
            p++;
        }
    }
    const alpha = -1 / (G.pushapartpow - 1);
    const r = {
        wmeandist: swd / sv, meandist: sd / p, meanndv: sv / p,
        wmeandistI: sv / swd, meandistI: p / sd,
        wmeandistC: (swd / sv) ** (-1/alpha), meandistC: (sd / p) ** (-1/alpha)
    } ;
    copyFrom(contact, r);  // << may get out of date
    return r;
}

// compare the weights, assume two IF inputs, for debug
var yaml;
CSynth.compareWeights = function() {
    const cc = CSynth.current, ccc0 = cc.contacts[0], ccc1 = cc.contacts[1];
    CSynth.meandists(ccc0);
    CSynth.meandists(ccc1);
    const  r = {};
    CSynth.representativeSources.forEach(s => {
        let a = ccc0[s];
        let b = ccc1[s];

        const rat = b/a;
        r[s] = {s,a,b,rat}
    });
    log(yaml.safeDump(r, {skipInvalid: true}));
    return r;
}

/** show all stats relative to current model, older version without workers */
CSynth.allstatsSlow = async function allstatsSlow(statsres) {
    msgfix.show('correlations');
    msgfixlog('correlations', 'pending');
    const cc = CSynth.current;
    let [refd, refreason] = CSynth.dists('model', statsres);
    const msg = ['vs ' + refreason + '.  "Y" to recompute.'];
    // msg.push('current: ' + format(CSynth.correl(refd, 'current'), 6));
    for (let i=0; i < cc.xyzs.length; i++) {
        msgfix('correlations', msg.join('<br>'), '<br>...');
        await sleep(0);
        const xyz = cc.xyzs[i];
        const mm = log(xyz.shortname + ': ' + format(CSynth.correl(refd, i), 6));
        msg.push(mm);
    }
    msgfixlog('correlations', msg.join('<br>'), '<br>done');
}
CSynth.workers = [];
CSynth.statsFields = Object.keys({scale: 1.196170, rmse: 6.396037, wrmse: 0.238274, pearson: 0.721054, spearman: 0.929094});

/** show all stats relative to current model using workers */
CSynth.allstats = async function allstats(statsres = CSynth.statsres) {
    msgfix.show('correlations');
    msgfixlog('correlations', 'pending');
    const cc = CSynth.current;
    let [refd, refreason] = CSynth.dists('model', statsres);
    const msg = ['vs ' + refreason + '.  "Y" to recompute.', format(CSynth.statsFields, 8)];
    // msg.push('current: ' + format(CSynth.correl(refd, 'current'), 6));
    for (let i=0; i < cc.xyzs.length; i++) {
        const xyz = cc.xyzs[i];
        let w = CSynth.workers[i];
        if (!w) {
            w = CSynth.workers[i] = new Worker('csynthWorker.js');
        }
        w.onmessage = e => {
            msg[i+2] = xyz.shortname + ': ' + format(Object.values(e.data[1]), 6);
            msgfix('correlations', msg.join('<br>'));
        };
        w.postMessage(['correlCD', refd, xyz.coords, 'all', statsres]);
        msg.push(xyz.shortname + ': ...');
        await sleep(0);
    }
}

CSynth.clearWorkers = function() {
    CSynth.workers.forEach(w => w.postMessage(['close']));
    CSynth.workers = [];
}


CSynth.curstats = function(statsres) {
    msgfix.show('cstats');
    let [refd, refreason] = CSynth.dists('model', statsres);

    msgfix('cstats', 'current vs ' + refreason + '<br>' + format(CSynth.correl('c0', 'current'), 6));
}

/** run n tests and collect stats against distance derived from contact map 0 (c0) */
CSynth.statsn = function(opts) {
    let {n, w, base} = Object.assign({n: 5, w: 2000, base: 'c0'}, opts);
    const basedists = CSynth.dists(base);
    const r = [];
    for (let i = 1; i <= n; i++) {
        CSynth.randpos(undefined, i);
        springs.step(w);
        r.push(`csynth${i}: ${format(Object.values(CSynth.correl(basedists, 'current')), 6)}`);
        msgfix('statsn', 'csynth against ref IF<br>', r.join('<br>'));
    }
}

/** clear the captured data */
CSynth.clearCaptures = function() {
    return CSynth.captures = []; // {sr: [], dists: [], positions: []};
};
CSynth.captures = CSynth.clearCaptures();

/** capture data into a capture set and show stats so far */
CSynth.capture = function({set = CSynth.captures, correl = false} = {}) {
    // const {sr, dists, positions} = set;
    const i = set.length;
    const sr = [];
    const positions = springs.getpos();
    const dists = CSynth.dists('current'); // collect the distances from the simulated positions
    const genes = Object.assign({}, G);
    set.push({sr, positions, dists, genes})
    if (correl) {
        for (let j = 0; j < i; j++) {       // compare run i with previous runs j
            sr[j] = CSynth.correl(dists, set[j].dists, correl);           // perform correlation
        }
        CSynth.displayCaptureStats(set);
    }
}

/** goto a particular capture, w.i.p. */
CSynth.gotoCapture = function(n = 0, set = CSynth.captures) {
    // const {sr, dists, positions} = set;
    const s = set[n];
    if (!s) return msgfixlog('cannot go to capture item ', n);
    springs.setpos(s.positions);
    Object.assign(currentGenes, s.genes);
    setObjUniforms(currentGenes, uniforms);
}

/** display stats information about a set (probably captures) */
CSynth.displayCaptureStats = function(set = CSynth.captures, name = 'captures', msg = 'stats for captured data' ) {
    // const {sr, dists, positions} = CSynth.captures;
    const r = [];
    if (set.length < 2) return 'not enough capture data';
    const tto = ['', ''];
    tto.push(...Object.keys(set[1].sr[0]))
    r.push(tto)
    for (let i = 0; i < set.length; i++) {
        for (let j = 0; j < i; j++) {
            const tt = [i,j]
            tt.push(...Object.values(set[i].sr[j]).map(c => c.toFixed(3)))

            // let tt = `csynth ${i} ${j} ${format(Object.values(set[i].sr[j]), 6)}`
            //if (j === 0) tt = `'<green>${tt}</green>`
            r.push(tt);   // and format
            if (j === 0) r.push( r.pop().map(c => '<green>' + c + '</green>'));
        }
    }
    msgfix(name, msg + array2Table(r));
    //msgfix(name, msg + '<br>' + r.join('<br>'));
}

/** generate an Array from a definition object (def) and options
 * def is an object;
 * each field value is either
 *  an object {from, to, [step]}; the field name will take appropriate values (to inclusive)
 *  an array; the field name will take values from each element of the array
 *  other: the field name will take the given value
 * The result is an array of objects, with the same keys as the definition object
 * but with each element of the array taking one of the candidate values.
 *
 * To consider: make genArray a generator
  */
CSynth.genArray = function(def, popts = {}) {
    const opts = Object.assign({
        keys: Object.keys(def), // the object keys still to iterate
        vals: {},               // the object to hold each result in turn
        res: []                 // the array to accumulate the result
    }, popts);
    const {keys, vals, fun, res} = opts;
    const key = keys[0];
    let litem = def[key];

    const xopts = Object.assign({}, opts);
    xopts.clear = false;
    xopts.keys = keys.slice(1);
    if (litem.from !== undefined) { //
        const x = [];
        for(let v=litem.from; v <= litem.to; v += litem.step || 1) x.push(v);
        litem = x;
    }
    if (!Array.isArray(litem)) litem = [litem];
    for (const v of litem) {
        xopts.vals[key] = v;
        if (keys.length === 1) {
            res.push(Object.assign({}, xopts.vals));
        } else {
            CSynth.genArray(def, xopts);
        }
    }
    return res;
}

var Maestro;
// capture a set of stats given ab
CSynth.capture8 = function(w = 5000, opts={}) {
    CSynth.captures = CSynth.clearCaptures();
    const arr = CSynth.genArray({contactforce: [100,400], pushapartpow: [0, -1], springpow: [0, -2] });
    for (const item of arr) {
        Object.assign(currentGenes, item);
        // Maestro.trigger('prespringstep');
        setObjUniforms(currentGenes, uniforms);
        CSynth.randpos(undefined, 2);       // generate random positions from seed i
        springs.step(w);                    // run w simulation steps
        if (opts.autoscale) CSynth.autoscale();
        // framenum++;
        // await S.frame();
        CSynth.capture();
    }
}

var GX, setBackgroundColor, vpborder, onframe;
// reminder of contruction of paperS1X
CSynth.paperS1X = function() {
    // http://localhost:8800/csynth.html?startscript=C75X1200/load_data.js
    V.gui.visible = false;
    GX.setValue('matrix/visible', false);
    setBackgroundColor(1);
    vpborder = 0;
    CSynth.capture8(5000, {autoscale: true});
    onframe(CSynth.draw8);
}

/** run n simulations of w simulation steps against different seeds,
 * and collect stats against each other */
CSynth.comparen = function(n = 5, w = 10000) {
    const sr = [], r = [];
    const dists = [];                       // collect the distance maps
    for (let i = 1; i <= n; i++) {
        sr[i] = [];
        CSynth.randpos(undefined, i);       // generate random positions from seed i
        springs.step(w);                    // run w simulation steps
        dists[i] = CSynth.dists('current'); // collect the distances from the simulated positions
        for (let j = 1; j < i; j++) {       // compare run i with previous runs j
            sr[i][j] = CSynth.correl(dists[i], dists[j]);           // perform correlation
            r.push(`csynth ${i} ${j} ${format(Object.values(sr[i][j]), 6)}`);   // and format
        }
        msgfix('statsij', `CSynth against each other <br>${r.join('<br>')}`);    // display output
    }
    return sr;  // return structured output for further analysis (if wanted)
}

/** compare n LorDG models */
CSynth.comparex = function(n = 5) {
    const sr = [], r = [];
    const dists = [];                       // collect the distance maps
    for (let i = 1; i <= n; i++) {
        sr[i] = [];
        dists[i] = CSynth.dists('x' + (i-1)); // collect the distances from the simulated positions
        for (let j = 1; j < i; j++) {       // compare run i with previous runs j
            sr[i][j] = CSynth.correl(dists[i], dists[j]);           // perform correlation
            r.push(`LorDG ${i} ${j} ${format(Object.values(sr[i][j]), 6)}`);   // and format
        }
        msgfix('statslorij', `LorDG against each other <br>${r.join('<br>')}`);    // display output
    }
    return sr;  // return structured output for further analysis (if wanted)
}

CSynth.maxRealtimeStatsSize = 1000;

/** cache and compute referenceDistances if necessary  */
CSynth.referenceDistances = function refdist() {
    const cc = CSynth.current;
    if (!cc || !cc.contacts || !cc.contacts[0]) return;
    const ccc0 = cc.contacts[0];
    let check=[];
    if (!CSynth._referenceDistances || cc.contacts[0].referenceDistances !== CSynth._referenceDistances
        || G.m_alpha !== check[0] || G.m_k !== check[1]) {
        cc.contacts[0].referenceDistances = CSynth._referenceDistances = CSynth.contactToDistArray(0, G.m_alpha, G.m_k);
        check = [G.m_alpha, G.m_k];
    }
    return CSynth._referenceDistances;
}

CSynth.startDynamicStats = function(flag = 'all') {
    const cc = CSynth.current;

    for (let i=0; i < cc.contacts.length; i++)
        msgfix('!stats cur c' + i, ()=>CSynth.correl('c' + i, 'current', flag));
    for (let i=0; i < cc.xyzs.length; i++)
        msgfix('!stats cur x' + i, ()=>CSynth.correl('x' + i, 'current', flag));
}

CSynth.fixedStats = function(flag = 'all') {
    const cc = CSynth.current;
    let cl = cc.contacts.length, tl = cl + cc.xyzs.length;
    for (let i = 0; i < tl; i++) {
        const ii = i < cl ? 'c' + i : 'x' + (i-cl);
        for (let j = i+1; j < tl; j++) {
            const jj = j < cl ? 'c' + j : 'x' + (j-cl);
            msgfix('stats ' + ii + ' ' + jj, CSynth.correl(ii,jj));
        }
    }
}

var gpuStats;
// get 'volume' of array of points, current points by default
// return eigenvalues and 'volume'
CSynth.stats = function(p = springs.getpos()) {
    // let x=0, y=0, z=0, xx=0, yy=0, zz=0, xy=0, yz=0, zx=0;
    let max = VEC3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    let min = VEC3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    const n = p.length;

    // compute raw sums
    let sx=0, sy=0, sz=0, sxx=0, syy=0, szz=0, sxy=0, syz=0, szx=0;
    for (let i=0; i < n; i++) {
        const v = p[i];
        sx += v.x;
        sy += v.y;
        sz += v.z;
        max = max.max(v);
        min = min.min(v);
        sxx += v.x * v.x;
        syy += v.y * v.y;
        szz += v.z * v.z;
        sxy += v.x * v.y;
        syz += v.y * v.z;
        szx += v.z * v.x;
    }
    const r =CSynth._stats2({sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n})
    r.min = min; r.max = max;
    r.rx = max.x - min.x; r.ry = max.y - min.y; r.rz = max.z - min.z;
    r.rmax = Math.max(r.rx, r.ry, r.rz);
    return r;
}

/** shared function for anayzing cumulative statistics */
CSynth._stats2 = function({sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n}) {
    // compare raw sum values with equivalent values from gpuStats
    // debug
    //const r = gpuStats();
    //const [bx, by, bz, bxx, byy, bzz, byz, bzx, bxy] =
    //    [r[0][0], r[1][0], r[2][0], r[0][1], r[1][1], r[2][1], r[0][2], r[1][2], r[2][2]];
    //log('x,y,z', sx, bx, sy,by, sz,bz);
    //log(sxx, bxx, syy,byy, szz,bzz, sxy,bxy, syz,byz, szx,bzx);
    //log(f(sxx- bxx)+'', f(syy-byy)+'', f(szz-bzz)+'', f(sxy-bxy)+'', f(syz-byz)+'', f(szx-bzx)+'');

    // 'compensated' sums for more convenient stats
    const xx = sxx - sx*sx/n;
    const yy = syy - sy*sy/n;
    const zz = szz - sz*sz/n;
    const xy = sxy - sx*sy/n;
    const yz = syz - sy*sz/n;
    const zx = szx - sz*sx/n;
    const x = sx/n;
    const y = sy/n;
    const z = sz/n;

    // now derive the various stats from the raw sum figures
    const mat3 = [xx/n, xy/n, zx/n,   xy/n, yy/n, yz/n,   zx/n, yz/n, zz/n];
    const trace = xx/n + yy/n + zz/n;
    let eigv = Eigenvalues.eigenvalues(mat3);
    const trace2 = eigv[0] + eigv[1] + eigv[2];        // for crosscheck
    // log('traces', trace, trace2, f(trace2-trace)+'');
    // const hessenberg = Eigenvalues.hessenberg(mat3);
    const centroid = VEC3(x, y, z);
    let radii = eigv.map(v=> Math.sqrt(v));
    const volume = 4/3 * Math.PI * radii[0] * radii[1] * radii[2];


    // compuute eigenvectors using Cayley–Hamilton theorem
    // https://en.wikipedia.org/wiki/Eigenvalue_algorithm#Hessenberg_and_tridiagonal_matrices
    // https://en.wikipedia.org/wiki/Cayley%E2%80%93Hamilton_theorem
    const {full, d1,d2,d3,s1,s2,s3} = CSynth.stats.mats;  // CSynth.stats.mats contains useful working objects
    full.elements = mat3;
    d1.copy(full); d1.elements[0] -= eigv[0]; d1.elements[4] -= eigv[0]; d1.elements[8] -= eigv[0];
    d2.copy(full); d2.elements[0] -= eigv[1]; d2.elements[4] -= eigv[1]; d2.elements[8] -= eigv[1];
    d3.copy(full); d3.elements[0] -= eigv[2]; d3.elements[4] -= eigv[2]; d3.elements[8] -= eigv[2];
    s1.multiplyMatrices(d2,d3);
    s2.multiplyMatrices(d3,d1);
    s3.multiplyMatrices(d1,d2);
    let eigenvectors = [
        VEC3(s1.elements).normalize().multiplyScalar(radii[0]),
        VEC3(s2.elements).normalize().multiplyScalar(radii[1]),
        VEC3(s3.elements).normalize().multiplyScalar(radii[2])
    ]

    // order eigenvalues, eigenvectors and radii
    const oo = eigv.map((v,i) => [v,i]).sort((a,b)=>b[0] - a[0]).map(v=>v[1]);
    eigv = oo.map(v=> eigv[v]);
    eigenvectors = oo.map(v=> eigenvectors[v]);
    radii = oo.map(v=> radii[v]);


    return { eigenvalues: eigv, radii, volume, centroid, trace, eigenvectors} ;
}
var THREE, ColorKeywords;
if (!inworker)
CSynth.stats.mats = {
    full: new THREE.Matrix3(), d1: new THREE.Matrix3(), d2: new THREE.Matrix3(), d3: new THREE.Matrix3(),
    s1: new THREE.Matrix3(), s2: new THREE.Matrix3(), s3: new THREE.Matrix3()
};

/** show the eigenvectors and centroid, d is a stats object */
CSynth.showEigen = function(doOrient, d = CSynth.stats()) {
    const lineGeometry = new THREE.BufferGeometry(), positions=[], colors=[];
    const vert = /*glsl*/`
        precision highp float;
        ${CSynth.CommonShaderCode()}
        // attribute vec3 position;
        attribute vec3 color;
        varying vec3 vcol;
        // const float xx = 1.;
        void main() {
            vec4 p= pposToWorld(vec4(position, 1));
            p.w = 1.;
            gl_Position = logdepth(projectionMatrix * viewMatrix * p); // model part already in partposWSorld
            vcol = color;
        }
    `;
    const frag = /*glsl*/`
        precision highp float;
        varying vec3 vcol;
        void main() {
            gl_FragColor = vec4(vcol, 1);
        }
    `;
    // const lineMaterial = new THREE.LineBasicMaterial( { linewidth:1, color: 0xffffff, vertexColors: THREE.VertexColors } );
    const lineMaterial = new THREE.RawShaderMaterial({
        fragmentShader: frag, vertexShader: vert, uniforms: uniforms
    });

    if (CSynth.eigenLine) V.rawscene.remove(CSynth.eigenLine);

    const line = CSynth.eigenLine = new THREE.LineSegments(lineGeometry, lineMaterial);
    V.rawscene.add(line);
    const kcols = ['red','green','blue'].map(c=>new THREE.Color(c));
    const pushv = (v) => positions.push(v.x, v.y, v.z);
    const pushc = (v) => colors.push(v.r, v.g, v.b);
    for (let i = 0; i < 3; i++) {
        pushv(d.centroid.clone().sub(d.eigenvectors[i]));
        pushv(d.centroid.clone().add(d.eigenvectors[i]));
        pushc(kcols[i]);
        pushc(kcols[i]);
    }
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));


    if (doOrient) {
        const e = d.eigenvectors;
        for (let i=0; i<2; i++) e[i].normalize();
        const t = currentGenes._rot4_ele;
        e[2].crossVectors(e[0], e[1]);  // third eigenvector sometimes give -ve determinant

        const x = e[0], y = e[1], z = e[2];
        G._rot4_ele = [x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0,0,0,1];

        if (doOrient === 'angled')
            applyMatop(0,1, Math.atan2(height, width));
        else
            rot4toGenes();
        refmain();
    }
}

/** orient with centroid to middle,particle # px to the right and py to the top */
CSynth.orient = function(px = CSynth.orient.right, py = CSynth.orient.up) {
    if (typeof px === 'string') {
        const p = CSynth.picks['g-ribbon'];
        if (p < 0) return msgfix('orient', 'no particle selected for RIGHT/UP');
        CSynth.orient[px] = p.partid;
        msgfix('orient', `particles are ${CSynth.orient.right} RIGHT and ${CSynth.orient.up} UP.`)
        return;
    }
    if (px === undefined) px = Math.round(numInstances/2);
    if (py === undefined) py = numInstances - 1;

    const p = springs.getpos();
    const c = p.reduce((cc,v) => cc.add(v), VEC3()).multiplyScalar(1 / numInstances);
    const x = p[px].sub(c).normalize();
    const y1 = c.clone().sub(p[py]);
    const z = y1.cross(x).normalize();
    const y = z.clone().cross(x);
    G._rot4_ele = [x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, 0,0,0,1];
}

/** tilt so x axis aligns with screen diagonal */
CSynth.tilt = function() {applyMatop(0,1, Math.atan2(height, width));}


/** work out forces for different force styles at given distance with current settings:
This uses G values without override, so computes forces whether or not they are enabled.
If no length is provided, use representativeDistance = wish length from Lorentz model based on representativeContact.
If no contact provided, use representativeContact.
+ve attraction force for long distance  */
CSynth.forces = function(len, contact = CSynth.current.representativeContact) {

    const cc = CSynth.current;
    const {pow, sqrt, max} = Math;
    const {representativeContact} = cc;
    // const g = {}; copyFrom(g, G); copyFrom(g, geneOverrides);
    const {pushapartforce, powBaseDist, pushapartpow, xyzforce, m_k, m_force, m_alpha, m_c, contactthreshold} = G;
    const r = {}
    const rc = cc.representativeContact;

    const targlen = m_k * pow(contact/representativeContact, -m_alpha)

    // lor forces
    const rcontact = contact/representativeContact;
    const d = m_k * pow(rcontact, -m_alpha);     // target distance
    if (len === undefined) len = d;
    const dd = d - len;
    const dem = m_c * m_c + dd*dd;
    r.lorforce = m_force * rcontact * -2 * m_c * m_c * dd / (dem*dem);

    // csynth forces, note r._ values just for debug
    const ccontact = max(0, contact - contactthreshold);
    const contactforcesc = G.contactforce * 1e-6 / CSynth.current.representativeContact;
    const contactforce = r._contactforce = contactforcesc * ccontact * len;

    const globalpushapart = r._globalpushapart = pushapartforce * pow(len/powBaseDist, pushapartpow);
    r.csyforce = contactforce - globalpushapart;

    let dlen = len - targlen;
    // sqrt a bit arbitrary here, but helped ensure correct refolding of e.g. different lor examples
    r.xyzforce = dlen * xyzforce / sqrt(targlen);

    return r;
}

/** work out forces at representativeDistance to check they all stabalize at 0,
and at k (default 1.1) times to find effective force from different forces */
CSynth.forcetest = function(k = 1.1, errlevel = 1e-10, len = G.m_k) {
    const r0 = CSynth.forces(len);
    // log(r0);
    const abs = Math.abs;
    for (let f in r0)
        if (f[0] !== '_' && Math.abs(r0[f]) > errlevel)
            console.error(`Force ${f} not balanced ${r0[f]} at representative length ${len}.`);
    const r = CSynth.forces(len*k);
    // log(r);
    return r;
}

/** align force strengths to put all into same range; e.g. same value for reference distance * 1.1 */
CSynth.alignForces = function(use = 'lor') {

    for (const gn in CSynth.defvals) G[gn] = G[gn] || CSynth.defvals[gn]; // set 0 values to defval value, this should render then necxt few lines unnecessary
    const v = G.contactforce * G.pushapartforce * G.m_force * G.xyzforce;
    if (v === 0 || isNaN(v)) {
        console.error('cannot align forces while one is 0 or NaN');
        return;
    }
    const r = CSynth.forcetest(1.01, 1e-15);  // list of current changes
    switch (use.replace('force','')) {
        case 'lor':
            G.contactforce *= r.lorforce / r.csyforce;
            G.pushapartforce *= r.lorforce / r.csyforce;
            G.xyzforce *= r.lorforce / r.xyzforce;
            break;
        case 'csy':
        case 'old':
            G.m_force *= r.csyforce / r.lorforce;
            G.xyzforce *= r.csyforce / r.xyzforce;
            break;
        case 'xyz':
            G.contactforce *= r.xyzforce / r.csyforce;
            G.pushapartforce *= r.xyzforce / r.csyforce;
            G.m_force *= r.xyzforce / r.lorforce;
            break;
        default:
            console.error('bad parameter to CSynth.alignForces', use);
    }

}

/** align models to given model (? that is, align Lorenz m_ values with our  contactforce etc values */
CSynth.alignModels = function(type = 'auto') {
    // Lorentz, wish distance = m_k / if ** m_alpha
    // CSynth, implicit wish distance (if * contactforce/pushapartforce) ** (1/(pushapartpow-1))
    // = (if * contactforce/pushapartforce) ** -alpha
    // = (contactforce/pushapartforce) ** -alpha / if ** m_alpha
    /*****
    Workings for CSynth implicit wish distance (allowing for )

    contactforcesc = contactforce * 1e-6 / representativeContact
    f = contactforcesc * contact * len
    f = pushapartforce * pow(len/powBaseDist, pushapartpow)
      = pushapartforce / pow(powBaseDist, pushapartpow) * pow(len, pushapartpow)

    contactforcesc * contact / pushapartforce * pow(powBaseDist, pushapartpow) = pow(len, pushapartpow-1)
    len = pow(contactforcesc * contact / pushapartforce * pow(powBaseDist, pushapartpow), 1/(pushapartpow-1))
     */

    const oal = CSynth.lastAlign;
    // const nal = [G.pushapartpow, G.contactforce, G.m_alpha, G.m_k];

    const types = CSynth.forcetypes; // defined CSynth.switchSpringSettings

    let forceChanged = true;
    if (type === 'auto') {
        // track the types and find the last one to have changed
        //if (types.every(x => oal[x[1]] === G[x[0]] ))
        //    return;                                 // nothing changed
        types.forEach( (p,i) => {if (oal[i][1] !== G[p[0]]) type = p[1];} );
        if (type === 'auto') return;                  // nothing changed
        forceChanged = oal.some( x => x[0].endsWith('force') && x[1] !== G[x[0]])
    }


    const x = {};
    // both models want to be 'pure' of extra forces; NO leave to the calling environment
    // x.backboneforce = 0;
    // x.pushapartlocalforce = 0;

    // -alpha = 1 / (pushapartpow-1)
    if (type === 'lor') {
        x.pushapartpow = 1 - 1 / G.m_alpha;
        x.contactforce = 1e6 * G.pushapartforce / G.powBaseDist * (G.m_k / G.powBaseDist) ** (-1/G.m_alpha)
        //if (CSynth.springSettings.contact)
        //    copyFrom(CSynth.springSettings.contact, x);
        //else
        //    copyFrom(G, x);
    } else if (type === 'csy') {
        x.m_alpha = -1 / (G.pushapartpow - 1);
        x.m_k = G.powBaseDist * Math.pow(G.contactforce/1e6/G.pushapartforce * G.powBaseDist, -x.m_alpha);

        // // check debug, at distance m_k what are the csy forces
        // copyFrom(G, x);
        // var len = x.m_k
        // var repv = CSynth.current.representativeContact
        // var backboneScale = 0.00001 // ???
        // var contactforcesc = G.contactforce * 1e-6 / repv; // === G.contactforcesc
        // var cforce = repv * contactforcesc  * len
        // var pforce = G.pushapartforce * Math.pow(Math.max(len,backboneScale)/G.powBaseDist, G.pushapartpow)
        // log('forces len', CSynth.forces(len))
        // log('forces len', CSynth.forces(len))
        // var xx = {cforce, pforce}
        // log('test', xx)
        // xx=xx
        // //if (CSynth.springSettings.contact Lor)
        // //    copyFrom(CSynth.springSettings.contact Lor, x);
        // //else
        // //    copyFrom(G, x);
    } else if (type === 'xyz') { //

    } else {
        console.error(`Unexpected type '${type}' in CSynth.alignModels.`);
    }
    copyFrom(G, x);

    CSynth.alignForces(forceChanged ? type : 'old');

    // G.m_k = G.powBaseDist * Math.pow(G.contactforce/1e6/G.pushapartforce * G.powBaseDist, -G.m_alpha)

    // make x apply to both current and pending (if any)

    // const q = {};    // for debug logging
    // q.m_alpha = -1 / (G.pushapartpow - 1)
    // q.m_k = G.powBaseDist * Math.pow(G.contactforce/1e6/G.pushapartforce * G.powBaseDist, -G.m_alpha)
    // log (`diffs, m_alpha ${q.m_alpha} ${G.m_alpha} ... ${q.m_k} ${G.m_k}`);
    CSynth.lastAlign = types.map(p => [p[0], G[p[0]]]);
}
CSynth.lastAlign = [];

CSynth.saveRuns = async function CSynth_compareRuns({nruns=10, fid, time1=4000, time2=1000}) {
    if (!fid) fid = '>csynth_' + (new Date()).toJSON().replace(/:/g, ".") + '_';
    G.stepsPerStep = 40;
    for (let run=0; run<nruns; run++) {
        CSynth.randpos(6);
        G.damp=1;
        await sleep(time1)
        G.damp=0.99;
        await sleep(time2)
        springs.save(fid + ('00000' + run).substr(-6) + '.xyz');
        msgfix('runs', run+1, nruns);
        if (CSynth.compareRuns.break) {
            CSynth.compareRuns.break = false;
            break;
        }
    }
}


CSynth.compareRuns = async function CSynth_compareRuns(nruns=10) {
    G.stepsPerStep = 40;
    let runs = CSynth.compareRuns.runs = [];
    for (let run=0; run<nruns; run++) {
        CSynth.randpos(6);
        G.damp=1;
        await sleep(4000)
        G.damp=0.99;
        await sleep(1000)
        const a = {coords: springs.getpos(), numInstances}
        // CSynth.xyzToTexture(a)
        runs.push(a)
        msgfix('runs', run, nruns);
        if (CSynth.compareRuns.break) {
            CSynth.compareRuns.break = false;
            break;
        }
    }
    return CSynth.statsForRuns(runs);
}

CSynth.statsForRuns = function CSynth_statsForRuns(runs = CSynth.compareRuns.runs) {
    const stats = new Array(numInstances)
    const nruns = runs.length;
    const pp = new Array(nruns);
    for (let p=0; p < numInstances; p++) {
        for (let r=0; r < nruns; r++) {
            pp[r] = runs[r].coords[p];
        }
        stats[p] = CSynth.stats(pp);
    }

    const radv = stats.map(v=>v.radii[0] + v.radii[1] + v.radii[2] )
    const res =  {runs, stats, radv};
    CSynth.compareRuns.res = res;
    msgfix('runs', 'complete: stats ready');
    return res;

    // CSynth.xyzsExact(runs[1])

    /**
    const r = [];
    for (let run=0; run<nruns; run++) {
        r[run] = [];
        for (let run1=0; run1<run; run1++) {
            const rmse = CSynth.rmse(runs[run].textureData, runs[run1].textureData);
            r[run][run1] = r[run1][run] = rmse
        }
    }
    return {runs, r}
    **/
}
// let rundata = CSynth.compareRuns(5)

var Plane;
/**
Make planes to illustrate the inside packing of the 60 capsid chain groups.
*/
CSynth.planesForInside = function(glmol = CSynth.glmol["All_capsid_proteins.pdb"], maxd=120, chains=undefined, pgroup = CSynth.rawgroup) {
    if (typeof glmol === 'string') glmol = CSynth.glmol[glmol];
    const planes = CSynth.planes = [];
    const atoms = glmol.atoms;
    let ccc = [];
    let lastChaingroup, lastcol, lastResi;
    glmol.colorByChaingroup();
    const bychain = typeof maxd === 'string';
    for (let i=0; i<atoms.length; i++) {
        const atom = atoms[i];
        if (!atom) continue;
        if (chains && chains.indexOf(atom.chain) === -1) continue;
        if (atom.chaingroup !== lastChaingroup || atom.resi < lastResi)
            makePlane(lastcol);
        lastChaingroup = atom.chaingroup;
        lastResi = atom.resi;
        lastcol = atom.color;
        if (bychain ? atom.chain === maxd : atom.originDistance < maxd)
            ccc.push(atom);
    }
    makePlane();
    return Plane.drawSet(planes, 'planesInside');

    function makePlane(col) {
        if (ccc.length === 0) return;
        const stats = CSynth.stats(ccc);
        const ax3 = stats.eigenvectors[2].normalize();
        const dot = ax3.dot(stats.centroid);
        if (dot < 0)
            ax3.multiplyScalar(-1);
        planes.push(new Plane(ax3, stats.centroid, col3().set(col)));
        ccc = [];
    }

}

CSynth.manyPlanes = function(show = false, fid=undefined, chains=undefined) {
    if (fid) CSynth.planesForInside(fid, undefined, chains).visible = show;
    if (CSynth.current.fixedPointsData) CSynth.planesForFixed().visible = show;
    Plane.icosa().visible = show;
    Plane.dodeca().visible = show;
    Plane.varying().visible = show;
}

// sample array to get n samples, a can be an array of anything
CSynth.sample = function CSynth_sample(a, n) {
    const r = [];
    const l = a.length;
    for (let i = 0.5; i < n; i++) {
        const k = Math.floor(i*l / n);
        r.push(a[k]);
    }
    return r;
}

// sample array to get n averaged samples, a should be array of numbers
CSynth.average = function CSynth_sample(a, n) {
    const r = [];
    const l = a.length;
    let j = 0;
    for (let i = 1; i <= n; i++) {   // as we are going to compute END of range
        let k = Math.floor(i*l / n);
        let nn = k - j;
        if (nn === 0) {
            r.push(a[k])
        } else {
            let s = 0;
            for( ;j < k; j++) s += a[j] ;
            r.push(s/nn);
        }
    }
    return r;
}


// look at the gaps between fixed points in backbone dustance and geometric distance
// if flag, only use
CSynth.fixedCheck = function(flag) {
    const cc = CSynth.current;
    const cos = cc.fixedPointsData.coords;
    let xc = cc.extraContacts;
    if (flag) xc = xc.filter( e => e.flag === flag);
    const r = [];
    for (let i = 1; i < xc.length; i++) {
        const xa = xc[i-1];
        const xb = xc[i];
        const bpa = xa.bp;
        const bpb = xb.bp;
        const bpdist = bpb - bpa;
        const fposa = xa.fpos;
        const fposb = xb.fpos;
        const pa = cos[fposa];
        const pb = cos[fposb];
        const gdist = pa.distanceTo(pb);
        r.push({bpdist, gdist, rel: gdist/bpdist, bpa, bpb, flags: xa.flag + xb.flag});
    }
    log(r);
    return r;
}

/** compute average dist for given backbone dist, idef can be coordinates or code (see CSynth.pos)  */
CSynth.avgDist = function(idef = 'cur', bd = 1) {
    const d = CSynth.pos(idef);
    let sd = 0;
    for (let i = bd; i < d.length; i++) {
        sd += d[i].distanceTo(d[i-bd]);
    }
    return sd / (d.length - bd);
}

/** get volume, very course grid based estimate */
CSynth.volume = function({res = 1, p = springs.getpos()} = {}) {
    const st = CSynth.stats(p);
    const lx = Math.floor(st.min.x / res), hx = Math.floor(st.max.x / res), nx = hx-lx+1;
    const ly = Math.floor(st.min.y / res), hy = Math.floor(st.max.y / res), ny = hy-ly+1;
    const lz = Math.floor(st.min.z / res), hz = Math.floor(st.max.z / res), nz = hz-lz+1;
    const n = new Uint16Array(nx*ny*nz);
    p.forEach(v => {
        const ix = Math.floor(v.x/res) - lx, iy = Math.floor(v.y/res) - ly, iz = Math.floor(v.z/res) - lz;
        //if (ix < 0 || ix > nx || iy < 0 || iy > ny || iz < 0 || iz > nz)
        //    log('err');
        n[ix + iy * nx + iz * nx * ny]++;
    });
    const v = n.reduce((c,x) => c + (x > 0), 0);
    log('vol', v, 'of', n.length);
    return v;
}

/** work in progress, mutation for CSynth parameters */
CSynth.mutate = async function(w = 2000, use = 'pushapartpow springpow'.split(' ')) {
    if (vps[0] + vps[1] === 0) setViewports([3,3]);
    // V.gui.visible = false;
    for (let gn in genedefs) {genedefs[gn].free = +use.includes(gn)}
    mutate();
    for (const slot of slots) {
        if (slot === undefined) continue;
        const dispobj = slot.dispobj;
        setObjUniforms(dispobj.genes, uniforms);
        CSynth.randpos(undefined, 1);
        springs.step(w);
        CSynth.autoscale();
        dispobj.render(1);
        await S.frame();
    }
}

// w.i.p. display 8 objects
var alwaysNewframe, dustbinvp, refall;
CSynth.draw8 = function() {
    // the prerenderObj callback will ensure correct spring positions and genes
    // before the slot/dispobj is rerendered
    if (CSynth.prerenderObj) Maestro.remove('prerenderObj', CSynth.prerenderObj)
    Maestro.on('prerenderObj', (evt,a,b,c) => {
        const dispobj = evt.dispobj;
        const vn = dispobj.vn;
        CSynth.gotoCapture(vn);
        slots[vn].dispobj.genes = currentGenes;
    });
    // alwaysNewframe = 0;     //
    if (vps[0] + vps[1] === 0) setViewports([4,2]);
    refall();               // ensure all objects are repainted
    dustbinvp = 99;
}

var skelbuffer, readWebGlFloatDirect;
/** make stats from skeleton */
function skelstats() {
    const d = readWebGlFloatDirect(skelbuffer, {width:U.skelnum+1 + 2*U.skelends, height: U.horncount})
    let maxx = -Number.MAX_VALUE, maxy = -Number.MAX_VALUE, maxz = -Number.MAX_VALUE;
    let minx = Number.MAX_VALUE, miny = Number.MAX_VALUE, minz = Number.MAX_VALUE;
    const mxx = Math.max;
    const mnn = Math.min;
    const n = d.length;

    // compute raw sums, assuming the w is radius used as weight
    let sx=0, sy=0, sz=0, sxx=0, syy=0, szz=0, sxy=0, syz=0, szx=0, sw = 0;
    for (let i=0; i < n; ) {
        const x = d[i++], y = d[i++], z = d[i++], w = d[i++];
        sx += x * w;
        sy += y * w;
        sz += z * w;
        maxx = mxx(maxx, x); maxy = mxx(maxy, y); maxz = mxx(maxz, z);
        minx = mnn(maxx, x); miny = mnn(maxy, y); minz = mnn(maxz, z);
        sxx += x * x * w;
        syy += y * y * w;
        szz += z * z * w;
        sxy += x * y * w;
        syz += y * z * w;
        szx += z * x * w;
        sw += w;
    }
    const r = CSynth._stats2({sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n:sw})
    Object.assign(r, {minx, miny, minz, maxx, maxy, maxz})
    r.rx = maxx - minx; r.ry = maxy - miny; r.rz = maxz - minz;
    r.rmax = Math.max(r.rx, r.ry, r.rz);
    return r;
}
// CSynth.showEigen('angleed', skelstats());

/** align the current conformation (assumed distances for now) with the given fixed positions
using pullsprings */
CSynth.alignConformation = async function({maxpull = 1, minpull = 0.001, degrade = 0.9} = {}) {
    console.time('align')
    const cc = CSynth.current;
    if (!CSynth.alignmentTarget) return msgfixerrorlog('align request with no target set');

    setAllLots('force', 1e-26); // not sure why 0 fails
    G.springmaxvel = 9999;  // make high so we can get really fast convergence
    G.xyzforce = 0.01;      // strongest we can get away with for Lorentz initial test
    G.pullskelforce = 0;    // relevant ???
    springs.finishFix();    // in case in a fixed position already

    CSynth.alignmentTarget.forEach((v,i,a) => springs.addpull(i, v.x, v.y, v.z, 1));
    let p = maxpull, i = 0;
    while (p > minpull) {
        G.pullspringforce = p;
        springs.step(1);
        if (i++ % 40 === 0) {
            await S.frame();
            log(i, 'pull', p)
        }
        p *= degrade;
    }
    G.pullspringforce = 0;
    log(i, 'alignment complete with pull', p);
    console.timeEnd('align')

}

/** test alignment between two xyz's, by default move current to previously set target */
CSynth.alignConformationtest = async function(opts = {}) {

    GX.setValue('simulationsettings/autoalign', false);

    const cc = CSynth.current;
    const src = opts.src ?? 'current';
    if (typeof src === 'number') {
        const sname = cc.xyzs[src].shortname
        GX.getgui('modes/' + sname + '\npositions').press();
        await S.frame();
        GX.getgui('modes/' + sname + '\ndists').press();
        await S.frame();
    } else {
        log('capture current position as distance texture')
        const texture = CSynth.xyzsToTexture(springs.getpos());
        U.distbuff = texture;
    }

    await CSynth.alignConformation(opts);
}

/** set the alignment target, but do not use it yet */
CSynth.setAlignmentTarget = function(targ = 'current') {
    const cc = CSynth.current;
    if (typeof targ === 'number')
        CSynth.alignmentTarget = cc.xyzs[targ].coords;
    else
        CSynth.alignmentTarget = springs.getpos();
}

CSynth.alignConformationNow = async function(opts = {}) {
    if (!CSynth.alignmentTarget) return msgfixerrorlog('align request with no target set');
    const p2 = springs.getpos();
    CSynth.alignTransform(CSynth.alignmentTarget, p2, {apply: true});
    CSynth.usedata(p2);
}

/** align by transform two array vectors p1 and p2 */
CSynth.alignTransform = function(p1, p2, {
        loop = 1000, apply = false,
        sample = 1, tol = 1e-3, vdamprate = 0.8,
        t = [0,0,0,0,0,0], mirror = false,
        imax = 6, loglow = 2, lograte = 50
    } = {}) {
    console.time('aligntr')
    const cc = CSynth.current;
    if (typeof p1 === 'number') p1 = cc.xyzs[p1].coords;
    if (typeof p2 === 'number') p2 = cc.xyzs[p2].coords;
    let mmirror = new THREE.Matrix4().makeScale(-1, 1, 1);
    let m = new THREE.Matrix4();
    const dp = 0.1, dr = 0.1;
    let del = [dp, dp, dp,  dr, dr, dr];
    const tv = new THREE.Vector3();
    function makem() {
        m.makeRotationFromEuler({x:t[3], y:t[4], z:t[5], order: 'XYZ'}).setPosition(t[0], t[1], t[2]);
        if (mirror) m.multiply(mmirror);
        return m;
    }
    let l;

    const dd = (p) => p1[p].distanceToSquared(tv.copy(p2[p]).applyMatrix4(m));  // error or particle
    // const ddd = () => { makem(); return p1.reduce( (c,v,p) => c + dd(p), 0); }; // overall error
    const ddd = (ss = sample) => { makem(); let c = 0; for (let p=0; p < p1.length; p += ss) c += dd(p); return c; }; // overall error
    let dampv = ddd();  // used for convergence test
    let err = () => Math.min(dampv, Math.abs(ddd()-dampv) / dampv);

    // perform one test interation on one variable; could do several on given i so only need fewer ddd() tests
    function test(i, d = del[i]) {
        const t1 = t[i];
        const v1 = ddd();
        const t2 = t[i] = t1 + d;
        const v2 = ddd();
        let v;
        if (v1 > v2) {
            del[i] *= 1.1;
            v = v2;
        } else {
            del[i] *= -0.9;
            t[i] = t1;
            v = v1;
        }
        if (l < loglow) log('test', {l, i, d, t1, t2, v1, v2, v, dampv, err: err()})
        if (l%lograte === 0 && i === 0) log({l, del, t, v , dampv, err: err().toString()});
        return v;
    }
    const test6 = _=> { let v; for (let i = 0; i < imax; i++) v = test(i); return v; }; // perform single iteration on all variables

    const drate = vdamprate;
    const vv = new Float32Array(loop);
    // W.xvv = vv;
    for (l = 0; l < loop; l++) {
        const v = test6();         // perform all iterations on all variables
        vv[l] = v;
        dampv = drate * dampv + (1-drate) * v;
        if (l > 20 && err() < tol)
            break;
    }
    log('finish at', {l, vsamp: ddd(), vfull: ddd(1), dampv, err: err(), del, t});

    if (apply) {
        for (let p = 0; p < p2.length; p++) p2[p].applyMatrix4(m);
        const f = cc.xyzs.find(x => x.coords === p2);
        if (f)
            GX.getgui('modes/' + f.shortname + '\npositions').press();
    }
    log('mat', m.toString());
    log('t', t.toString())
    console.timeEnd('aligntr')
    return m;
}

springs.velstats = function() {
    const a = springs.getpos()
    springs.step(1)
    const b = springs.getpos()
    const v = a.map((x,i) => x.distanceTo(b[i]));
    return getstats(v);
}

/** compute running stats of half width w, eg point i will use values for i-w to i+w, 2*w+1 items */
CSynth.runningStats = function(w = 10, p = springs.getpos()) {
    // const stats1 = {sx:0, sy: 0, sz: 0, sxx: 0, syy:0, szz:0, sxy: 0, syz:0, szx: 0, n:0 }
    const ccx = 1, ccy = 1, ccz = 1;  // ?? not used in a signficant way
    let sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n=0;

    const zero = () => { sx = 0, sy= 0, sz= 0, sxx= 0, syy=0, szz=0, sxy= 0, syz=0, szx= 0, n=0; }
    zero();
    const r = [];
    const add = pi => {
        if (!pi) return;
        const {x, y, z} = pi;
        sx += x; sy += y; sz += z;
        sxx += x*x; syy += y*y; szz += z*z;
        sxy += x*y; syz += y*z; szx += z*x;
        n++;
    }
    const sub = pi => {
        if (!pi) return;
        const {x, y, z} = pi;
        sx -= x; sy -= y; sz -= z;
        sxx -= x*x; syy -= y*y; szz -= z*z;
        sxy -= x*y; syz -= y*z; szx -= z*x;
        n--;
    }
    // for (let i = 0; i < w; i++) {
    //     add(p[i]);
    // }
    for (let i = 0; i < p.length+w; i++) {
        add(p[i]);
        if (p[i-w]) {
            const
            xx = (sxx - sx * sx / n) / n * ccx * ccx,
            yy = (syy - sy * sy / n) / n * ccy * ccy,
            zz = (szz - sz * sz / n) / n * ccz * ccz,
            xy = (sxy - sx * sy / n) / n * ccx * ccy,
            yz = (syz - sy * sz / n) / n * ccy * ccz,
            zx = (szx - sz * sx / n) / n * ccz * ccx,
            cx = sx / n, // * ccx;
            cy = sy / n, // * ccy;
            cz = sz / n, // * ccz;
            tr = (xx + yy + zz) ** 0.5;

            r[i-w] = {i: i-w, x:cx, y:cy,z:cz, tr, xx, yy, zz, xy, yz, zx, n}     // , sx, sy, sz, sxx, syy, szz, sxy, syz, szx, n, }
        }
        sub(p[i - 2*w]);
    }

    const rl = r[0], rh = r[p.length-1];
    r.forEach((x,i,a) => {
        x.dw = distxyz(a[i-w] ?? rl, a[i+w] ?? rh);  // inter block dist
        // x.tr1 = a[i-w]?.tr;           // trace to leftinter block dist
    });

    return r;
}

/** generate bed file automatically, w is running width */
CSynth.genbed = function(w = 10, thresh = 15, peakwidth = 5) {
    const rs = CSynth.runningStats(w);
    const r = rs.map(x => x.dw);
    const tr = rs.map(x => x.tr);  // /20
    //const tr1 = rs.map(x => x.tr1/20);

    /** max value from i-n to i+n */
    const mm = (a, i, n) => a.slice(i-n, i+n).reduce((c,v) => Math.max(c,v), -Infinity);

    CSynth.clearMarkers();
    r.forEach((x,i,a) => {
        if (x > thresh && x === mm(r, i, peakwidth) && mm(tr, i, peakwidth) < x)
            CSynth.setMarker(-1, i*5000)
    });
    CSynth.markers2Bed();

    CSynth.plot([{data: r, label: 'dw'}, {data:tr, label: 'tr'}]);
}


var Chart;
CSynth.plotev = function plotev(e) {
    const chart = CSynth.chart;
    // coordinates of click relative to canvas
    const { x, y } = Chart.helpers.getRelativePosition(e, chart);
    // can also use const x = e.native.offsetX, y = e.native.offsetY;

    // get values relative to chart axes
    const dataX = chart.scales.x.getValueForPixel(x);
    // const dataY = chart.scales.y.getValueForPixel(y);
    CSynth.setMarker(15, CSynth.bp4particle(dataX), 'chart');
}

// xx=(data,label) => ({data:CSynth.makess(data).map(x=>Math.log10(x)), label}); CSynth.plot([xx(ccc1.unitData, 'raw'), xx(ccc1.textureData, 'csynorm'),xx(ccc0.unitData, 'xnorm'), xx(ccc0.textureData, 'xnorm,csynorm')] )
CSynth.plot = function(rlabel) {
    if (!Chart) {
        log('adding Chart')
        addscript("https://cdn.jsdelivr.net/npm/chart.js");
        setTimeout(() => CSynth.plot(rlabel), 1000);
        return;
    }
    if (Array.isArray(rlabel) && typeof rlabel[0] === 'number') rlabel = [{data: rlabel, label: '?'}]
    if (!Array.isArray(rlabel)) rlabel = [rlabel];

    let div = CSynth.plotdiv, canvas = CSynth.plotcanvas;
    if (!div) {
        div = CSynth.plotdiv = document.createElement('div');
        div.style = 'position:fixed; top:0px; right:0px; z-index:9999; width:600px; height: 400px; background: rgba(0,0,0,0.9); border: 1px green solid'
        document.body.appendChild(div);
        canvas = CSynth.plotcanvas = document.createElement('canvas');
        div.appendChild(canvas);
        div.addEventListener('mousemove', CSynth.plotev);
        makeDraggable(div, {button: 1, movecallback: canvsize, upcallback: sizechange});
    }
    if (CSynth.chart) CSynth.chart.destroy();
    function canvsize() {  // size so you can see what is happening
        canvas.style.width = div.style.width;
        canvas.style.height = div.style.height;
    }
    function sizechange() {   // proper redraw for decent quality
        const h = +div.style.height.pre('px'), w = +div.style.width.pre('px');
        if (canvas.width === w && canvas.height === h) return;
        CSynth.chart.options.aspectRatio = w/h;
        CSynth.chart.resize(w, h);
    }

    let chart;
    const datasets = [];
    for (let i=0; i<rlabel.length; i++)
        datasets.push(Object.assign(
        {   borderWidth: 1,  // borderWidth is lineWidth
            pointRadius: 0}, rlabel[i]))

    const cfg = {
        type: 'line',
        data: {
            datasets,
            labels: new Array(rlabel[0].data.length).fill(''), // labels needed otherwise it collapses x, to give a vertical line
        },
        options: {
            responsive: false,      // we'll handle in makeDraggable
            aspectRatio: CSynth.plotdiv.clientWidth / CSynth.plotdiv.clientHeight,
            onClick: CSynth.plotev,
            onMousemove: CSynth.plotev,
            onMouseMove: CSynth.plotev,
            animation: false
        }
        // labels: r,
    }

    chart = CSynth.chart = new Chart(CSynth.plotcanvas, cfg);
    sizechange();
    // chart corrupts the size, so reset it

    //await sleep(500)
    //CSynth.plotdiv.style.width = '600px'; // = 'position:fixed; top:0px; right:0px; z-index:9999; width:600px; height: 400px;'
    //CSynth.plotdiv.style.height = '400px';
    //log(cfg)
}

/** compute medial filter for near diagonal elements */
CSynth.medial = function({c = U.contactbuff.source.data.data, h = 50, hstep = 5, w = 5, wstep = 1, perc = 0.9, maxr = Infinity, avoid = 1} = {}) {
    console.time('medial');
    const n = Math.round(c.length ** 0.5);
    const r = new Float32Array(n);                   // to collect result
    const dr = new Float32Array(n);                   // to collect result
    const xy = new Float32Array(h * (2*w + 1));      // to collect contributing elements, reuse each i
    for (let i=0; i < n; i++) {  // for each particle
        if (c[i*n + i] < 0) {r[i] = r[i-1] ?? 0; continue; }    // to handle blank regions
        let p = 0;
        for (let x = i-w; x <= i+w; x += wstep) {          // for neighbours
            if (x < 0 || x >= n) continue;
            for (let y = x-h; y < x+h; y += hstep) {
                if (y < 0 || y >= n || Math.abs(x-y) <= avoid) continue;
                const v = c[y*n + x];
                if (v < 0) continue;       // eg -999
                xy[p++] = v;
            }
        }
        const ss = xy.subarray(0,p).sort((x,y) => x-y);
        r[i] = p === 0 ? 0 : Math.min(maxr, xy[Math.floor(p * perc)]);
    }
    console.timeEnd('medial');

    const rl = r[0], rh = r.slice(-1)[0];
    for (let i=0; i < n; i++) {
        dr[i] = (r[i+w]??rh) - (r[i-w]??rl)
    }
    return [{data: r, label: 'medial'}, {data: dr, label: 'dmedial'}];
}
