// arrange set of colour/texture definitions as THREE texture buffer
// They behave like uniforms, only this mechanism allows a much larger set of values than uniforms do
// the fields use .x, .y, .z, .w
var THREE;

// PARMS is the number of distinct colour/texture parameters expected for one particular colourId
// NUM is the number of distinct colourId values expected
var COL = {PARMS: 64, NUM: 32, names: [], num: {}, needsUpdate: true, genenames: []};
COL.array = new Float32Array(COL.PARMS*COL.NUM);

COL.log = (...a) => (window.log || console.log)(...a);
COL.msgfixerror = (...a) => (window.msgfixerror || console.log)(...a);

/** set a value for a single slot for one colid or for all (num = -1) colids */
COL.set = function colset(name, num, val) {
    if (!COL.uniforms) COL.uniforms = window.uniforms;
    COL.needsUpdate = true;
    var id = COL.addname(name);
    if (id < 0) return;  // message already issued
    if (num === -1) {
       for (let n=0; n<COL.NUM; n++) {
            var k = (id + n*COL.PARMS);
            COL.array[k] = val;
        }
    } else {
        k = (id + num*COL.PARMS);
        COL.array[k] = val;
    }
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

};

/** convenience bulk setter function
 * list is an object of key:value pairs.
 * key is matched with startsWith, so red matches red1, red2, etc
 * value may be a number, or range consisting of array of two numbers
 *     for range, a random value in the range is used for each setting
 *
 * javascript key iteration order is deterministic, so eg
 * {red: 0, red2: 1} will result in red1 = red3 = 0 and red2 = 1
 * {red2: 0, red: 1} will result in red1 = red2 = red3 = 0
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
    if (list.id !== undefined) list.start = list.end = list.id; // list id/start/end for backwards compatiblity
    if (list.start === undefined) list.start = 0;
    if (list.end === undefined) list.end = COL.NUM - 1;
    if (low === undefined) {low = 0; high = COL.NUM - 1;}
    if (high === undefined) high = low;
    low = Math.max(low, list.start, 0);
    high = Math.min(high, list.end, COL.NUM - 1);

    for (let setn in list) {                        // all names specified in call: eg red1, refl2, ...
        var v = list[setn];                         // v is value for this list entry
        for (let coln in COL.num) {                 // search all properties
            if (coln.startsWith(setn)) {            // to test if it matches
                for (let r = low; r <= high; r++) {     // set for all horntypes (used or not, and including wall)
                    if (typeof v === 'number')
                        COL.set(coln, r, v);        // fixed value for all
                    else
                        COL.set(coln, r, COL.random() * (v[1] - v[0]) + v[0]);  // random value in range
                } // ok
            } // r
        } // coln

    } // setn
} // function setx

/** get all values for clourid in range and key matching keys */
COL.getx = function(keys, low, high) {
    if (low === undefined) {low = 0; high = COL.NUM - 1;}
    if (high === undefined) high = low;
    low = Math.max(low, 0);
    high = Math.min(high, COL.NUM - 1);
    if (typeof keys === 'string') keys = keys.split(/[,\s]+/);
    if (typeof keys === 'object' && !Array.isArray(keys)) keys = Object.keys(keys);
    const rr = {};
    for (let r = low; r <= high; r++) {
        const s={};
        keys.forEach((key) => {
            for (let coln in COL.num) {
                if (coln.startsWith(key)) s[coln] = COL.get(coln, r);
            }
        });
        rr[r] = s;
    }
    return rr;
}


COL.randcols = function randcols(kk, opts = {}) {
    COL.seed(kk || 99);
    var rr = [0, 1];
    COL.setx( {'': 9999} );
    const defaults = {
        red: rr, green: rr, blue: rr, refl: rr, band: rr, bandbetween: [0, 0.3], bumpstrength: rr,
        texalong: 0, texaround: 0, texribs: 0, iridescence: [-0.4, 0.4], bumpscale: [0, 30],
        flu: 0,
        plastic: 0.5, gloss: 0.8, shin: 25, subband: -1, texscale: [30, 300], texrepeat: [1, 4],
        texfinal: 0, screenDoor: 0, texfract3d: 1, texdiv: 1, wob: 1, tex2dystretch: [1,2], tex2dxstretch: [1,10]
    };
    Object.assign(defaults, opts);
    COL.setx( defaults);
    for (let i=0; i<64; i++) if (COL.get(i, 0) === 9999) COL.log("unset", i, COL.names[i]);
    for (let i=0; i<64; i++) if (isNaN(COL.get(i, 0))) COL.log("nan", i, COL.names[i]);

    COL.send();
}

// from http://stackoverflow.com/questions/521295/javascript-random-seeds
// Takes any integer
COL.seed = function(i) {
    COL._w = i;
    COL._z = 987654321;
}
COL.seed(123456789);

// Returns number between 0 (inclusive) and 1.0 (exclusive),
// or random from array or object
// like Math.random() but seeded
COL.random = function() {
    var mask = 0xffffffff;
    COL._z = (36969 * (COL._z & 65535) + (COL._z >> 16)) & mask;
    COL._w = (18000 * (COL._w & 65535) + (COL._w >> 16)) & mask;
    var result = ((COL._z << 16) + COL._w) & mask;
    result /= 4294967296;
    return result + 0.5;
}

/** initial names for default texture setup */
COL.initnames = function() {
    COL.names = [
        "red1", "green1", "blue1", "refl1", "red2", "green2", "blue2", "refl2", "red3", "green3", "blue3", "refl3", "reflred", "reflgreen", "reflblue",
        "texscale", "band1", "band2", "band3", "bandbetween", "texrepeat", "texfinal", "texfract3d", "texalong", "texaround", "texribs",
        "texalong1", "texaround1", "texribs1", "texalong2", "texaround2", "texribs2", "texdiv", "wob", "bumpscale", "bumpstrength",
        "shininess1", "gloss1", "subband1", "plastic1", "shininess2", "gloss2", "subband2", "plastic2", "shininess3", "gloss3", "subband3", "plastic3",
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
