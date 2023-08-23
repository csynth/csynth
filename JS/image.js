// some basic image processing
var THREE, renderer, rrender, camera, vec3, log, VEC4;

const imageProc = { vertexShader3: /*glsl*/`#version 300 es
in vec3 position;
precision highp float;
precision highp sampler2D;
void main (void) {
    gl_Position = vec4(position, 1.0 );
}
`,

geom: new THREE.PlaneGeometry(2,2)}


/** copy inim to outim */
function copyImage(inim, outim) {
    if (!imageProc.copyMat) {
        const fragmentShader = /*glsl*/`#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform sampler2D intex;
            out vec4 pc_FragColor;

            void main (void) {
                pc_FragColor = texelFetch(intex, ivec2(gl_FragCoord.xy), 0);
            }
        `
        const uniforms = imageProc.copyUniforms = {
            intex: {value: undefined},
        }
        const mat = imageProc.copyMat = new THREE.RawShaderMaterial({vertexShader: imageProc.vertexShader3, fragmentShader, uniforms});
        mat.depthWrite = false; mat.depthTest = false;
        imageProc.copyMesh = new THREE.Mesh(imageProc.geom, mat);
        imageProc.copyMesh.frustumCulled = false;
    }
    if (inim.texture) inim = inim.texture;
    const u = imageProc.copyUniforms;
    u.intex.value = inim;

    renderer.setRenderTarget(outim);
    renderer.render(imageProc.copyMesh, camera);
}


/** spread the speccol values, copy inim to outim
 * spread is either an integer spread (pixels) of full blackness (spreadcol) with spreadProp = 1
 * or a fractional value in which case the pixel spread is 1, but the spreadProp is reduced
 */
function spreadEdge(inim, outim, speccol = 0, spread = 1) {
    if (spread === 0) return copyImage(inim, outim);
    let spreadProp = 1;
    if (spread > 1 && spread%1 !== 0) debugger;
    if (spread < 1) {spreadProp = spread; spread = 1; }
    if (!imageProc.spreadMat) {

        const fragmentShader = /*glsl*/`#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform vec2 size, d1,d2,d3,d4;    // size and offsets for compare
            uniform vec4 speccol;
            uniform sampler2D intex;
            uniform float spreadProp;
            out highp vec4 pc_FragColor;

            void main (void) {
                vec4 r = texelFetch(intex, ivec2(gl_FragCoord.xy), 0);
                if (r != speccol) {
                    if (texelFetch(intex, ivec2(gl_FragCoord.xy+d1), 0) == speccol
                    ||  texelFetch(intex, ivec2(gl_FragCoord.xy+d2), 0) == speccol
                    ||  texelFetch(intex, ivec2(gl_FragCoord.xy+d3), 0) == speccol
                    ||  texelFetch(intex, ivec2(gl_FragCoord.xy+d4), 0) == speccol)
                        r = mix(r, speccol, spreadProp);
                }
                pc_FragColor = r;
            }
        `
        const uniforms = imageProc.spreadUniforms = {
            intex: {value: undefined},
            d1: {value: new THREE.Vector2(1,0)},
            d2: {value: new THREE.Vector2(-1,0)},
            d3: {value: new THREE.Vector2(0,1)},
            d4: {value: new THREE.Vector2(0,-1)},
            size: {value: new THREE.Vector2(1,1)},
            spreadProp: {value: 1},
            speccol: {value: new THREE.Vector4(0,0,0,0)}
        }
        const mat = imageProc.spreadMat = new THREE.RawShaderMaterial({vertexShader: imageProc.vertexShader3, fragmentShader, uniforms});
        mat.depthWrite = false; mat.depthTest = false;
        imageProc.spreadMesh = new THREE.Mesh(imageProc.geom, mat);
        imageProc.spreadMesh.frustumCulled = false;
    }
    if (inim.texture) inim = inim.texture;
    if (typeof speccol === 'number') speccol = VEC4(speccol, 0, speccol/2, 0);
    const u = imageProc.spreadUniforms;
    u.intex.value = inim;
    u.size.value.set(inim.image.width, inim.image.height);
    if (spread >= 0) {
        u.d1.value.set(spread, 0);
        u.d2.value.set(-spread, 0);
        u.d3.value.set(0, spread);
        u.d4.value.set(0, -spread);
    } else { // diagonal
        u.d1.value.set(spread, spread);
        u.d2.value.set(spread, -spread);
        u.d3.value.set(-spread, spread);
        u.d4.value.set(-spread, -spread);
    }
    u.speccol.value.copy(speccol);
    u.spreadProp.value = spreadProp;

    renderer.setRenderTarget(outim);
    renderer.render(imageProc.spreadMesh, camera);
}

var imageOpts = {
    // : [1],
    kk: ['?'],
    thickness: 1,
    speccol: VEC4(0,0,0,0),
    concentrateN: 0,
    baseres: 1920 * 2,   // eg standard with renderRatio 1/2
    // useres: 1920 * 2,   // eg standard with renderRatio 1/2 // ??? should be based on current size ??? ... use feed.viewfactor instead
    usethick: false      // use thickness, not baseksize
};


/** spread the speccol values, operate in pairs, inim is outim and tempim is a temporary for each pair, thickness is  */
function spreadEdge2(inoutim, tempim, speccol = VEC4(0,0,0,0), thickness = 1) {
    imageOpts.kk = ['n/a']
    const repeat = Math.floor(thickness - 1); //  / 2;
    const fthick = thickness % 1;
    if (thickness <= 1) return;  // cannot currently do sub 1 thickness, so leave as is
    // compute kk sequence to make up integer part of repeat
    let kk = imageOpts.kk = [];
    for (let i = 1, t = 0; t < repeat; i++) {
        const z = Math.min(i, repeat - t);  // extra to add for this round
        kk.push(z); // kk is the final list of distance
        t += z;
    }
    if (fthick) kk.push(fthick); //  **(1/2.2));     / add fractional part if any; ?? linear colour space
    if (kk.length % 2 === 1) kk.push(0);        // must be even so we end up in inoutim
    for (let i = 0; i < kk.length; i+=2) {
        spreadEdge(inoutim, tempim, speccol, kk[i]);
        spreadEdge(tempim, inoutim, speccol, kk[i+1]);
    }
}


// ~~~~~~~~~~~~~~~~~~~~~~~~
/** concentrate the lines without changing overall density, copy inim to outim */
function concentrateEdge(inim, outim, dx, dy) {
    if (!imageProc.concentrateMat) {

        const fragmentShader = /*glsl*/`#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform vec2 size, d;    // size and offsets for compare
            uniform sampler2D intex;
            out highp vec4 pc_FragColor;

            // don't try to be clever with colours, and invert so black is +ve
            void main (void) {
                float r = 1. - texelFetch(intex, ivec2(gl_FragCoord.xy), 0).x;
                float rn = 1. - texelFetch(intex, ivec2(gl_FragCoord.xy-d), 0).x;
                float rp = 1. - texelFetch(intex, ivec2(gl_FragCoord.xy+d), 0).x;
                float rr = r;

                if (rn < r) rr = min(1., r + rn);        // migrate from rn to r
                if (r < rp) rr = r + rp - min(1., r + rp);   // migrate from r to rp
                rr = 1. - rr;
                pc_FragColor = vec4(rr,rr,rr,1);
            }
        `
        const uniforms = imageProc.concentrateUniforms = {
            intex: {value: undefined},
            d: {value: new THREE.Vector2(1,1)},
            size: {value: new THREE.Vector2(1,1)},
        }
        const mat = imageProc.concentrateMat = new THREE.RawShaderMaterial({vertexShader: imageProc.vertexShader3, fragmentShader, uniforms});
        mat.depthWrite = false; mat.depthTest = false;
        imageProc.concentrateMesh = new THREE.Mesh(imageProc.geom, mat);
        imageProc.concentrateMesh.frustumCulled = false;
    }
    if (inim.texture) inim = inim.texture;
    const u = imageProc.concentrateUniforms;
    u.intex.value = inim;
    const im = inim.image;
    u.size.value.set(im.width, im.height);
    u.d.value.set(dx, dy);

    renderer.setRenderTarget(outim);
    renderer.render(imageProc.concentrateMesh, camera);
}

// /** set up for spreading and/or concentrating */
// function setupImageEdge(opts = {}, res = imageOpts.baseres) {
//     imageOpts.useres = res;
//     Object.assign(imageOpts, opts);
// }

function specialPostrender(inoutim, tempim) {
    let {speccol, thickness, concentrateN} = imageOpts;
    renderer.setRenderTarget(tempim); renderer.clearColor();
    // let thick = thickness * (imageOpts.useres || tempim.width) / imageOpts.baseres;  // let not const for debug
    let thick = thickness; // resolution already handled by res2uniforms
    if (typeof speccol === 'number') speccol = imageOpts.speccol = vec3(speccol);
    if (thick > 0)
        spreadEdge2(inoutim, tempim, speccol, thick);
    if (concentrateN > 0) {
        for (let i = 0; i < concentrateN; i++) {
            concentrateEdge(inoutim, tempim, 1, 0);
            concentrateEdge(tempim, inoutim, -1, 0);
            concentrateEdge(inoutim, tempim, 0, 1);
            concentrateEdge(tempim, inoutim, 0, -1);
        }
    }
}

/** clear spreading/concentrating */
function clearImageEdge() {
    imageOpts.thickness = imageOpts.concentrateN = 0;
    // specialPostrender = undefined;
}


var xxxdispobj, readWebGlFloatDirect;
/** check differences between texelFetch and texture, DEBUG only
seems fine, maybe try non 300 es version to check as well later? */
function checkImage(inim, outim) {
    if (inim === undefined) inim = xxxdispobj().rt;
    if (outim === undefined) outim = inim.clone();
    if (!imageProc.checkMat) {
        const vertexShader3 = /*glsl*/`#version 300 es
        in vec3 position;
        out vec2 vuv;
        precision highp float;
        precision highp sampler2D;
        void main (void) {
            vuv = position.xy * 0.5 + 0.5;
            gl_Position = vec4(position, 1.0 );
        }
        `

        const fragmentShader = /*glsl*/`#version 300 es
            precision highp float;
            precision highp sampler2D;
            uniform sampler2D intex;
            in vec2 vuv;
            out vec4 pc_FragColor;

            void main (void) {
                vec4 new = texelFetch(intex, ivec2(gl_FragCoord.xy), 0);
                vec4 old = texture(intex, vuv);
                pc_FragColor = new - old;
            }
        `
        const uniforms = imageProc.checkUniforms = {
            intex: {value: undefined}
        }
        const mat = imageProc.checkMat = new THREE.RawShaderMaterial({vertexShader: vertexShader3, fragmentShader, uniforms});
        mat.depthWrite = false; mat.depthTest = false;
        imageProc.checkMesh = new THREE.Mesh(imageProc.geom, mat);
        imageProc.checkMesh.frustumCulled = false;
    }
    if (inim.texture) inim = inim.texture;
    const u = imageProc.checkUniforms;
    u.intex.value = inim;

    renderer.setRenderTarget(outim);
    renderer.render(imageProc.checkMesh, camera);
    log('errs', readWebGlFloatDirect(outim).filter(x=>x).length);
    return outim;
}

