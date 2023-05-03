// arrange set of colour/texture definitions as THREE texture buffer
// They behave like uniforms, only this mechanism allows a much larger set of values than uniforms do
// the fields use .x, .y, .z, .w
var THREE, updateGuiGenes;

// PARMS is the number of distinct colour/texture parameters expected for one particular colourId
// NUM is the number of distinct colourId values expected
var COL = {PARMS: 64, NUM: 32, names: [], num: {}, needsUpdate: true, genenames: []};
COL.array = new Float32Array(COL.PARMS*COL.NUM);

COL.log = (...a) => (window.log || console.log)(...a);
COL.msgfixerror = (...a) => (window.msgfixerror || console.log)(...a);

COL._xxx = new Float32Array(1);
/** return value of number when saved as float32 */
COL.f32 = x => { COL._xxx[0] = x; return COL._xxx[0]; }

/** set a value for a single slot for one colid or for all (num = -1) colids */
COL.set = function colsetCol(name, num, val) {
    val = COL.f32(val)

    if (!COL.uniforms) COL.uniforms = window.uniforms;
    let up = 0;
    // COL.needsUpdate = true;
    var id = COL.addname(name);
    if (id < 0) return;  // message already issued
    if (num === -1) {
       for (let n=0; n<COL.NUM; n++) {
            var k = (id + n*COL.PARMS);
            if (COL.array[k] !== val) {
            COL.array[k] = val;
                up++;
            }
        }
    } else {
        k = (id + num*COL.PARMS);
        if (COL.array[k] !== val) {
            COL.array[k] = val;
            up++;
        }
    }
    if (up !== 0) COL.needsUpdate = true;
};

/** get current setting for given name and colourId */
COL.get = function colget(name, num) {
    var id = COL.addname(name);
    var v1 = COL.array[(id + num*COL.PARMS)];
    return v1;
};

/** add a new name to the current set of names */
COL.addname = function coladdname(name) {
    if (typeof name === 'number') return name;
    if (COL.num[name] === undefined) {
        if (COL.names.length >= COL.PARMS) {
            console.error(COL.msgfixerror('COL'+name, 'index out of colour range'));
            return -1;
        }
        COL.num[name] = COL.names.length;
        COL.names.push(name);
    }
    return COL.num[name];
};

COL.numSent = 0;

/** send COL changes if needed, if force specified send anyway */
COL.send = function(force) {
    if (!force && !COL.needsUpdate) return;

    var w = COL.PARMS/4;
    if (!COL.buff || COL.buff.width !== w || COL.buff.height !== COL.NUM ) {
        if (!COL.array) COL.array = new Float32Array(COL.PARMS*COL.NUM);  // may be wrong for one cycle
        COL.buff = new THREE.DataTexture(COL.array, w, COL.NUM, THREE.RGBAFormat,
            THREE.FloatType, undefined, // type,mapping
            THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.LinearFilter,THREE.LinearFilter );        // linearFilter allows colourid interpolation
        COL.buff.width = w;
        COL.buff.height = COL.NUM;
        COL.buff.generateMipmaps = false;

        if (COL.uniforms) {
            if (!COL.uniforms.colbuff) COL.uniforms.colbuff = { type: "t", value: COL.buff };
            COL.uniforms.colbuff.value = COL.buff;
        }
    }
    COL.buff.needsUpdate = true;
    COL.needsUpdate = false;
    if (globalThis.newmain) globalThis.newmain();
    COL.numSent++;

};

COL.macros = {rr: [0, 1], rr2: [0,1, (x) => x*x], rrx: -9};
/** convenience bulk setter function
 * list is an object of key:value pairs.
 * key (setn) is matched with startsWith, so red matches red1, red2, etc
 * alternatively, key may be a regexp (string starting with '/')
 * value may be a number, or range consisting of array of two numbers
 *     for range, a random value in the range is used for each setting
 *     and optional third function
 *     string values (eg 'rr') will be substituted from COL.macros.
 *
 * javascript key iteration order is deterministic, so eg
 * {red: 0, red2: 1} will result in red1 = red3 = 0 and red2 = 1
 * {red2: 0, red: 1} will result in red1 = red2 = red3 = 0
 *
 *
 * The list may also contain id, start and end keys. (mainly backward compatibility)
 * These limit the range of colourids set
 *     id has priority over start and end; default is the complete range of colour numbers
 *
 * low and high give range of colourids (inclusive)
 *      If neither given full range is used.
 *      If only low given just that one id is used.
 * */
COL.setx = function setx(list, low, high) {
    if (typeof list === 'string' || list instanceof THREE.Color) list = {col: list};
    if (list.id !== undefined) list.start = list.end = list.id; // list id/start/end for backwards compatiblity
    if (list.start === undefined) list.start = 0;
    if (list.end === undefined) list.end = COL.NUM - 1;
    if (low === undefined) {low = 0; high = COL.NUM - 1;}
    if (Array.isArray(low)) [low, high] = low;
    if (high === undefined) high = low;
    low = Math.max(low, list.start, 0);
    high = Math.min(high, list.end, COL.NUM - 1);

    if (list.col || list.col1 || list.col2 || list.col3) {
        //    list = Object.assign({}, list);// safe copy
        const col = new THREE.Color();
        const r = {};
        const c1 = list.col1 || list.col; if (c1) { col.set(c1); r.red1 = col.r; r.green1 = col.g, r.blue1 = col.b; }
        const c2 = list.col2 || list.col; if (c2) { col.set(c2); r.red2 = col.r; r.green2 = col.g, r.blue2 = col.b; }
        const c3 = list.col3 || list.col; if (c3) { col.set(c3); r.red3 = col.r; r.green3 = col.g, r.blue3 = col.b; }
        list = Object.assign({}, list, r);
    }

    for (let setn in list) {                            // all names specified in call: eg red1, refl2, ...
        let v = list[setn];                             // v is value for this list entry
        if (typeof v === 'string') v = COL.macros[v];
        const regexp = setn[0] === '/' ? Function(' return ' + setn)() : undefined;
        for (let coln in COL.num) {                     // search all property names, red1, etc etc
            if (regexp ? coln.match(regexp) : coln.startsWith(setn)) {              // to test if it matches
                // warning, next line not as silly as it looks ...  we want to avoid unnecessary regexp match, and && is NOT commutative
                const gamma =  list.gamma && coln.match(/(red|green|blue)[123]/) && list.gamma;
                for (let r = low; r <= high; r++) {     // set for all colour numbers r (horntypes) (used or not, and including wall)
                    if (list.exclude && list.exclude.indexOf[r] !== -1) continue;   // can exclude, e.g. walls
                    if (typeof v === 'number') {
                        COL.set(coln, r, gamma ? v**gamma : v);        // fixed value for all
                    } else {
                        let vv = COL.prand(r,coln) * (v[1] - v[0]) + v[0];
                        if (v[2]) vv = v[2](vv);
                        COL.set(coln, r, gamma ? vv**gamma : vv);  // random value in range
                    }
                    //if (COL.get('red1', 29) !== kkk) debugger
                } // r
                //if (COL.get('red1', 29) !== kkk) debugger
            } // match
            //if (COL.get('red1', 29) !== kkk) debugger
        } // coln
        //if (COL.get('red1', 29) !== kkk) debugger
     } // setn
    //if (COL.get('red1', 29) !== kkk) debugger
    if (list.notgenes)
        COL.genes2col();   // overwrite what we have just done with gene values
    else if (COL.col2genes)
        COL.col2genes();    // make sure gene values are updated
} // function setx

/** get all values for clourid in range and key matching keys */
COL.getx = function(keys={'':0}, low, high) {
    if (typeof keys === 'string') keys = keys.split(' ').reduce((c,v) => {c[v] = 0; return c}, {})
    if (low === undefined) {low = 0; high = COL.NUM - 1;}
    if (high === undefined) high = low;
    low = Math.max(low, 0);
    high = Math.min(high, COL.NUM - 1);
    if (typeof keys === 'string') keys = keys.split(/[,\s]+/);
    if (typeof keys === 'object' && !Array.isArray(keys)) keys = Object.keys(keys);
    const rr = {};
    for (let r = low; r <= high; r++) {
        const s={};
        keys.forEach((setn) => {
            const regexp = setn[0] === '/' ? Function(' return ' + setn)() : undefined;
            for (let coln in COL.num) {
                // if (coln.startsWith(setn))
                if (regexp ? coln.match(regexp) : coln.startsWith(setn)) {              // to test if it matches
                    s[coln] = COL.get(coln, r);
                }
            }
        });
        rr[r] = s;
    }
    return rr;
}

COL.defaultDef = {'': 0.0, red:1, band:1, gloss:0.8, plastic:0.5, shininess: 40, texsc:50, texrepeat: 1, texfract3d: 1, subb: -1};

COL.randcols = function randcols(kk=0, opts = {}) {
    COL.seed(kk);
    var rr = [0, 1];
    var rr2 = [0, 1, x => x*x];
    // COL.setx( {'': 9999} );
    const defaults = {
        red: rr2, green: rr2, blue: rr2, refl: rr, band: rr, bandbetween: [0, 0.3], bumpstrength: rr,
        iridescence: [-0.4, 0.4], bumpscale: [0, 30],
        flu: 0, texalong: 0, texaround: 0, texribs: 0, texfinal: 0, screenDoor: 0,
        texscale: [30, 300], texrepeat: [1, 1],
        texdiv: 1, wob: 1, tex2dystretch: [1,2], tex2dxstretch: [1,10]
    };
    const all = Object.assign({'': 9999}, COL.defaultDef, defaults, opts);
    COL.setx( all);
    for (let i=0; i<64; i++) if (COL.get(i, 0) === 9999) COL.log("unset", i, COL.names[i]);
    for (let i=0; i<64; i++) if (isNaN(COL.get(i, 0))) COL.log("nan", i, COL.names[i]);

    COL.send();
}

// Takes any integer, i=0 or undefined does random seed, -ve leaves seed
COL.seed = function(i) {
    i = +i;
    if (i < 0) return;
    if (!i) i = 1234576543;

    // from https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    function mulberry32(a) {
        return function() {
          var t = a += 0x6D2B79F5;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }
    COL._mulb = mulberry32(i);

    //~~ from https://gist.github.com/banksean/300494
    //~~ worked well but quite complex
    //~~ COL._mt = new MersenneTwister(i);

    //## // from http://stackoverflow.com/questions/521295/javascript-random-seeds
    //## // used for quite a time, but proved very unrandom for our purposes, 13 May 2021
    //## COL._w = i;
    //## COL._z = 987654321;
    COL.baseseed = i;
}
COL.seed(123456789);

// Returns number between 0 (inclusive) and 1.0 (exclusive),
// or random from array or object
// like Math.random() but seeded
// No longer used 27 April 2022,
// we don't use sequences of random number, but randomize each (prand) on determined parameters
COL.DEADrandom = function() {
    return COL._mulb();
    //~~ return COL._mt.random();
    //## var mask = 0xffffffff;
    //## COL._z = (36969 * (COL._z & 65535) + (COL._z >> 16)) & mask;
    //## COL._w = (18000 * (COL._w & 65535) + (COL._w >> 16)) & mask;
    //## var result = ((COL._z << 16) + COL._w) & mask;
    //## result /= 4294967296;
    //## return result + 0.5;
}

COL.baseseed = 99;
/** pseudo-random number based on colour number, property and basic seed */
COL.prand = function(colnum, prop, baseseed = COL.baseseed) {
    if (colnum === undefined || prop === undefined)
        console.error('bad call to COL.prand');
    const propseed = prop.split('').reduce((c,v,i) => c += v.charCodeAt(0) * i, 0)
    let seed = (colnum+7) * 37 + propseed + baseseed;
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    const pr = ((t ^ t >>> 14) >>> 0) / 4294967296;
    return pr;
}

/** initial names for default texture setup: groups of 4 significant */
COL.initnames = function() {
    COL.names = [
        "red1", "green1", "blue1", "refl1",
        "red2", "green2", "blue2", "refl2",
        "red3", "green3", "blue3", "refl3",
        "reflred", "reflgreen", "reflblue", "texscale",
        "band1", "band2", "band3", "bandbetween",
        "texrepeat", "texfinal", "texfract3d", "texalong",
        "texaround", "texribs", "texalong1", "texaround1",
        "texribs1", "texalong2", "texaround2", "texribs2",
        "texdiv", "wob", "bumpscale", "bumpstrength",
        "shininess1", "gloss1", "subband1", "plastic1",
        "shininess2", "gloss2", "subband2", "plastic2",
        "shininess3", "gloss3", "subband3", "plastic3",
        "fluorescH1", "fluorescS1", "fluorescV1", "iridescence1",
        "fluorescH2", "fluorescS2", "fluorescV2", "iridescence2",
        "fluorescH3", "fluorescS3", "fluorescV3", "iridescence3",
        "tex2dxstretch", "tex2dystretch", "fluwidth", "screenDoor"
    ];
    COL.num = {};
    COL.names.forEach( (n,i) => COL.num[n] = i);
}

/** generate #defines so shaders can look up values by name from the colbuff texture
 * #defines are are individual values/fields (one of rgba), and for groups of 4 (rgba set)
 */
COL.generateDefines = function() {
    const n = COL.names;
    const r = ['// defines generated by COL.generateDefines'];
    for (let i=0; i < n.length; i += 4) {
        let n4 = '';
        for (let j = 0; j < 4; j++) {
            r.push(`#define ${COL.names[i+j]} (textureget(colbuff,vec2(( ${i/4}.5)/COLPARMS, (colourid+0.5)/COLNUM )).${'rgba'[j]})`);
            n4 += COL.names[i+j];
        }
        r.push(`#define ${n4} (textureget(colbuff,vec2(( ${i/4}.5)/COLPARMS, (colourid+0.5)/COLNUM )))`);
    }
    r.push('// end generated defines', '');
    return r.join('\n');
}

COL.plain = function(kk, col, low, high) {
    COL.seed(kk);
    if (low === undefined) {low = 0; high = COL.NUM - 1;}
    if (high === undefined) high = low;

    COL.setx(COL.defaultDef, low, high); COL.col2genes();
    if (col) {
        const cc = new THREE.Color(col);
        COL.setx({red: cc.r, green: cc.g, blue: cc.b}, low, high);
    } else {
        const nn = Object.keys(THREE.Color.NAMES);
        for (let colnum=low; colnum <= high; colnum++) {
            const cc = new THREE.Color(nn[COL.randii(nn.length, colnum)]);
            COL.setx({red: cc.r, green: cc.g, blue: cc.b}, colnum,colnum);
        }
    }
}

COL.tcol3 = new THREE.Color(); // save garbage
/** set random colours, originally part of Tadpole:
 * kk is seed (undefined for random)
 * h is hue, hr is hue range for each number, hrr is hue range between bands within colour number,
 * s is saturation, sr is saturation range, srr is range between bands within colour number,
 * v is strength, vr i strength range, vrr is range between bands within colour number,
 */
COL.randcols2 = function(kk = 0, options = {}, colnum) {
    COL.seed(kk);
    let {h = COL.prand(0,'baseh'), hr = 0.5, hrr = 0.1, s = 1, sr = 0.5, srr = 0.5, v = 1, vr = 0.5, vrr = 0.5, colonly = false} = options;

    if (colnum === undefined) colnum = [0, COL.NUM-1];
    if (Array.isArray(colnum)) {
        for (let icolnum = colnum[0]; icolnum <= colnum[1]; icolnum++)
            COL.randcols2(-1, {h, hr, hrr, s, sr, srr, v, vr, vrr, colonly}, icolnum);
        return;
    }
    const rrr = p => COL.prand(colnum,p);
    if (!options.colonly) COL.setx(COL.defaultDef, colnum);
    const col = COL.tcol3;
    const rcol = (b) => col.setHSV(h - hr + 2*hr*rrr('hr'+b), s - sr + 2*sr*rrr('sr'+b), v - vr + 2*vr*rrr('vr'+b));

    // establish base colour for this colour id
    h = h - hr + 2*hr*rrr('h');
    s = s - sr + 2*sr*rrr('s');
    v = v - vr + 2*vr*rrr('v');

    // and use ranges of colour for three bands
    hr = hrr;
    sr = srr;
    vr = vrr;
    COL.setarr('red1', colnum, rcol(1));
    COL.setarr('red2', colnum, rcol(2));
    COL.setarr('red3', colnum, rcol(3));
}

/** set bold colours, originally from Tadpole */
COL.bold = function() {
    COL.setx({'irid': 0, bump: 0, flu: 0});
    const col = COL.tcol3;
    for (let colnum = 0; colnum < COL.NUM; colnum++) {
        col.setHSV( colnum * 0.715, 1,1);
        COL.setarr('red1', colnum, col);
        COL.setarr('red2', colnum, col);
        COL.setarr('red3', colnum, col);
    }
}

/** return random integer range l..h-1, or 0..l-1 if h undefined */
COL.randii = function randii(h=100, colnum=0) {
    return Math.floor(h * COL.prand(colnum, "randii"));
}

