'use strict';
var THREE, posturi, throwe, rrender, renderer, log, clearrendertargets, opmode;

/** perform fxaa, nb outrt is undefined/null for output to canvas */
function fxaa(intex, outrt) {
    if (!fxaa.scene) fxaa.MakeScene();
    if (outrt && (intex.image.width !== outrt.width || intex.image.height !== outrt.height))
        throwe('wrong sizes to fxaa');
    if (intex.minFilter !== fxaa.filter) {
        log('wrong txaa input fiter, regenerating all rendertargets');
        clearrendertargets();
        //attempt to change filters on texture itself gave gl error
        //intex.minFilter = intex.magFilter = fxaa.filter;
        //intex.needsUpdate = true;
    }
    fxaa.uniforms.resolution.value.set(intex.image.width, intex.image.height);
    fxaa.uniforms.intex.value = intex;
    renderer.setRenderTarget(outrt || null);
    // clearing depth buffer prevents rawscene.camscene interacting properly
    // ((( ???? should rxaa come AFTER those anyway >>>)))
    // clearing main buffer should be irelevant as fxaa should set every pixel
    // clearing stancil buffer should be irrelevant as not generally used
    // renderer.clear(true, true, true);
    opmode = 'fxaa';
    rrender('fxaa', fxaa.scene, fxaa.camera, outrt);
}

fxaa.filter = THREE.LinearFilter;
fxaa.use = true;

/** make a scene (at least a mesh) and return it. Main work is the material */
fxaa.MakeScene = function() {

    const vertexShader =
/*glsl*/`precision highp float;
attribute vec3 position;

void main() {
    gl_Position = vec4(position.xy, 0, 1);
}`;

    const fxaax = posturi('shaders/fxaa.glsl');

    const fragmentShader =
    /*glsl*/`precision highp float;
precision highp sampler2D;
uniform sampler2D intex;
uniform vec2 resolution;    // we could do the inverse just once, bui ...
uniform float fxaaoutpower; // output power for FXAA

${fxaax}
// vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,
//     vec2 v_rgbNW, vec2 v_rgbNE,
//     vec2 v_rgbSW, vec2 v_rgbSE,
//     vec2 v_rgbM)
void main() {
    vec2 pos = gl_FragCoord.xy / resolution; //  + 1. * 0.5;
    float ix = 1./resolution.x;
    float iy = 1./resolution.y;
    vec4 o;
    o = fxaa(intex, gl_FragCoord.xy, resolution,
        pos + vec2(-ix, -iy), pos + vec2(ix, -iy),
        pos + vec2(-ix,  iy), pos + vec2(ix,  iy),
        pos);
//    o = texture2D(intex, pos);

    if (fxaaoutpower != 1.) o = pow(o, vec4(vec3(fxaaoutpower), 1));
    gl_FragColor = o;
}`
    const uniforms = fxaa.uniforms = {
        resolution: {value: new THREE.Vector2(1,1)},
        intex: {value: null},
        FXAA_REDUCE_MIN: {value: (1.0/ 128.0)},
        FXAA_REDUCE_MUL: {value: (1.0 / 8.0)},
        FXAA_SPAN_MAX: {value: 8.0},
        fxaaoutpower: {value: 1}
    }
    const mat = fxaa.mat = new THREE.RawShaderMaterial({vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false});
    const pgeom = new THREE.PlaneGeometry(2,2);
    const geom = fxaa.geom = pgeom; //]] new THREE.BufferGeometry().fromGeometry(pgeom);
    const mesh = fxaa.mesh = new THREE.Mesh(geom, mat);
    const scene = fxaa.scene = new THREE.Scene();
    scene.add(mesh);
    fxaa.camera = new THREE.OrthographicCamera(); // not used, placebo for three.js
    return scene;
}
