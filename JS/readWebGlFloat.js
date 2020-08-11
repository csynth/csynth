/*
 * derived from: http://concord-consortium.github.io/lab/experiments/webgl-gpgpu/script.js
 */
'use strict';

var THREE, renderer;

function readWebGlFloat(rtin, options={}, id) {
    if (id) {
        if (!readWebGlFloat.pend[id])
            readWebGlFloat.prep(rtin, options, id);
        const r = readWebGlFloat.finish(id);
        if (readWebGlFloat.predict)
            readWebGlFloat.prep(rtin, options, id);
        return r;
    } else {
        const r = readWebGlFloat.prep(rtin, options, '!STD!');
        if (r) return r;    // for old style 'all' etc prep has (recursively) done all the work
        return readWebGlFloat.finish('!STD!')
    }
}
function FIRSTV(...x) { for (let i in x) if (x[i] !== undefined) return x[i]; }

readWebGlFloat.rtout = {};

readWebGlFloat.prep = function readWebGlFloatprep(rtin, options={}, id) {
    const rttext = rtin.texture || rtin;
    if (!(rttext instanceof THREE.Texture)) {
        console.error('input to readWebGlFloat not correct texture', rttext);
        return;
    }
    const checkglerror = ()=>{};  // yse window.checkglerror if we really want to check
    checkglerror('before readWebGlFloat');
// ========================================================================
    // The first method of encoding floats based on:
    // https://github.com/cscheid/facet/blob/master/src/shade/bits/encode_float.js
    //
    // After rendering to RGBA, UNSIGNED_BYTE texture just call gl.readPixels with
    // an Uint8Array array and cast it to Float32Array.
    // e.g.:
    // const output = new Uint8Array(size);
    // (render to RGBA texture)
    // gl.readPixels(..., output);
    // const result = new Float32Array(output.buffer);
    //
    // 'result' array should be filled with float values.
    //
    if (!readWebGlFloat.mat) {  // initialization
        readWebGlFloat.vertShader = `
            void main() {
                gl_Position = vec4(position.xy, 0, 1);
            }`;
        readWebGlFloat.fragShader =  `uniform sampler2D textureD; // 'texture' reserved name in WebGL2
            uniform vec4 dotsel;
            uniform float l, t, texw, texh;
            uniform float channels, skipx, skipy;
            bool isNaN(float v) { return !(v <= 0. || v >= 0.); }

            float shift_right(float v, float amt) {
                v = floor(v) + 0.5;
                return floor(v / exp2(amt));
            }
            float shift_left(float v, float amt) {
                return floor(v * exp2(amt) + 0.5);
            }

            float mask_last(float v, float bits) {
                return mod(v, shift_left(1.0, bits));
            }
            float extract_bits(float num, float from, float to) {
                from = floor(from + 0.5);
                to = floor(to + 0.5);
                return mask_last(shift_right(num, from), to - from);
            }
            vec4 encode_float(float val) {
                if (val == 0.0) return vec4(0);
                if (isNaN(val)) return vec4(0,0, 192./255., 127./255.);
                float sign = val > 0.0 ? 0.0 : 1.0;
                val = abs(val);
                float exponent = floor(log2(val));
                float biased_exponent = exponent + 127.0;
                float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;

                float t = biased_exponent / 2.0;
                float last_bit_of_biased_exponent = fract(t) * 2.0;
                float remaining_bits_of_biased_exponent = floor(t);

                float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;
                float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;
                float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;
                float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;
                return vec4(byte4, byte3, byte2, byte1);
            }
            void main() {
                vec2 cc;
                vec4 dotselx;
                if (channels == 0.) {
                    cc = (gl_FragCoord.xy * vec2(skipx, skipy) + vec2(l,t)) / vec2(texw, texh);
                    dotselx = dotsel;
                } else {
                    float k = gl_FragCoord.x - 0.5;
                    float channel = mod(k, channels);
                    if (channel < 0.5) dotselx = vec4(1,0,0,0);
                    else if (channel < 1.5) dotselx = vec4(0,1,0,0);
                    else if (channel < 2.5) dotselx = vec4(0,0,1,0);
                    else if (channel < 3.5) dotselx = vec4(0,0,0,1);
                    else dotselx = vec4(10,0,0,0);  // should never happen
                    cc = vec2( (floor(k/channels) * skipx + 0.5 + l)/texw, (gl_FragCoord.y * skipy + t)/texh);
                }
                vec4 data = texture2D(textureD, cc);
                gl_FragColor = encode_float(dot(data, dotselx));
            }`;

        readWebGlFloat.uniforms = {
            dotsel: { type: 'v4', value: new THREE.Vector4(0,0,1,0) },
            l: { type: 'f' },
            t: { type: 'f' },
            skipx: { type: 'f' },
            skipy: { type: 'f' },
            texw: { type: 'f' },
            texh: { type: 'f' },
            channels: { type: 'f' },
            textureD: { type: 't'}
        };

        // define the material using the matvariant
        readWebGlFloat.mat = new THREE.ShaderMaterial({
            uniforms: readWebGlFloat.uniforms,
            vertexShader: readWebGlFloat.vertShader,
            fragmentShader: readWebGlFloat.fragShader,
            side: THREE.DoubleSide
        });

        readWebGlFloat.mesh = new THREE.Mesh(new THREE.PlaneGeometry(4,4), readWebGlFloat.mat);
        readWebGlFloat.camera = new THREE.OrthographicCamera(); // not used, placebo for three.js
    }    // initialization

    // image size
    const imw = options.width || rtin.width || rtin.image.width;
    const imh = options.height || rtin.height || rtin.image.height;

    const v = options || {};
    const w = v.width || imw;
    const h = v.height || imh;
    const l = FIRSTV(v.left, (imw - w)/2);  // centre if not explicit
    const t = FIRSTV(v.top, (imh - h)/2);  // centre if not explicit
    const skipx = v.skipx || 1, skipy = v.skipy || 1;
    const channels = v.channels || 0;
    let m = v.mask || 'xyzw';
    if (typeof m === 'string' && channels === 0) {
        if (m === 'all') m = 'xyzw';
        if (m === 'x') m = [1,0,0,0];
        else if (m === 'y') m = [0,1,0,0];
        else if (m === 'z') m = [0,0,1,0];
        else if (m === 'w') m = [0,0,0,1];
        else {
            const r = [];
            const vv = {}; Object.assign(vv, v);  // shallow clone, in case render target included
            for (let i = 0; i < m.length; i++) {
                const c = m[i];
                switch(c) {
                    case 'x': vv.mask = [1,0,0,0]; r.push(readWebGlFloat(rtin, vv)); break;
                    case 'y': vv.mask = [0,1,0,0]; r.push(readWebGlFloat(rtin, vv)); break;
                    case 'z': vv.mask = [0,0,1,0]; r.push(readWebGlFloat(rtin, vv)); break;
                    case 'w': vv.mask = [0,0,0,1]; r.push(readWebGlFloat(rtin, vv)); break;
                    default: console.error('invalid char', c, 'in readWebGlFloat mask', m);
                }
            }
            return r;
        }
    }
    const ds = readWebGlFloat.uniforms.dotsel.value;
    ds.x = m[0]; ds.y = m[1]; ds.z = m[2]; ds.w = m[3];

    // todo, if to be used extensively, cache rtout
    // todo, if to be used extensively for selective area, filter area before conversion, not on readPixels.
    // caller responsibility to make rtout appropriate if used in options
    const chw = Math.max(channels, 1);
    const fullw = w * chw;
    const key = fullw + 'x' + h;

    let rtout = readWebGlFloat.rtout[key];
    if (options.rtout) {
        rtout = options.rtout
    } else if (rtout && rtout.width === fullw && rtout.height === h) {

    } else {
        rtout = readWebGlFloat.rtout[key] = options.rtout || new THREE.WebGLRenderTarget(fullw, h, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });
        rtout.name = 'readwebglfloat';
    }
    rtout.texture.generateMipmaps = false;
    const u = readWebGlFloat.uniforms;
    u.l.value = l;
    u.t.value = t;
    u.skipx.value = skipx;
    u.skipy.value = skipy;
    u.channels.value = channels;
    u.texw.value = rtin.width || rtin.image.width;
    u.texh.value = rtin.height || rtin.image.height;

    // qscene.children[0].material = readWebGlFloat.mat;
    u.textureD.value = rttext;
    // reason, scene, camera, target, flag
    renderer.setRenderTarget(rtout);
    renderer.render(readWebGlFloat.mesh, readWebGlFloat.camera);
    renderer.setRenderTarget(null);

    // gl.finish();
    checkglerror('after readWebGlFloat readBackFloat');
    readWebGlFloat.pend[id] = {rtout, fullw, h, checkglerror};
}
readWebGlFloat.pend = {};

/** part 2 of readWebGlFloat, read back the converted buffer and view as float buffer
 * optionally an ibuff may be given by caller which will be used to hold the converted buffer
 * Whether preallocated ort not, the buffer will have two views, Uint8Array for readPixels and Float32Array for result
 */
readWebGlFloat.finish = function readWebGlFloatfinish(id, ibuff) {
    const data = readWebGlFloat.pend[id];
    delete readWebGlFloat.pend[id];
    if (!data) { console.error('readWebGlFloat.finish without prep', id); return; }
    const {rtout, fullw, h, checkglerror} = data;

    renderer.setRenderTarget(rtout);
    const len = fullw * h * 4;
    const buff = new Uint8Array(ibuff ? ibuff.buffer : len);
    // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
    // note that the required area has already been extracted
    const gl = renderer.getContext();
    gl.readPixels(0, 0, fullw, h, gl.RGBA, gl.UNSIGNED_BYTE, buff);
    renderer.setRenderTarget(null);

    checkglerror('after readWebGlFloat readPixels');
    const output = new Float32Array(buff.buffer);
    return output;
}


// read pixel from rendertarget
function pix(rt, x,y) {
    const rr = readWebGlFloat(rt);
    const k = x + rt.width * y;
    return [rr[0][k], rr[1][k], rr[2][k], rr[3][k]];
}

// read as vector
function readTextureAsVec3(t, start = 0, len) {
    const d = readWebGlFloat(t, {mask:'xyz'});
    if (!len) len = d[0].length;
    var s = [];
    for (let i=start; i < start+len; i++) {
        s.push( new THREE.Vector3().set(d[0][i], d[1][i], d[2][i]));    // avoid NaN bug
    }
    return s;
}

// read as vector
function readTextureAsVec4(t, options = {}) {
    options.mask = 'xyzw';
    const d = readWebGlFloat(t, options);
    const start = options.start || 0;
    const len = options.len || d[0].length;
    var s = [];
    for (let i=start; i < start+len; i++) {
        s.push( new THREE.Vector4().set(d[0][i], d[1][i], d[2][i], d[3][i]));    // avoid NaN bug
    }
    return s;
}
