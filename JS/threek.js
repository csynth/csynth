"use strict";
// declarations to prevent 'undeclared global' and work towards namespace cleanup
var W, THREE, badshader, inputs, Shadows, renderer, BLACK,
    OPPOSITION, OPREGULAR, OPSHADOWS, OPPICK, OPOPOS,
    scene, camera, gl, scalehalflife, mainvp, appToUse, debugframedelta, debugframedeltasize,
    oldlayerX, oldlayerY, height, init, slots, refall,
    x00,x01,x02,x03,x10,x11,x12,x13,x20,x21,x22,x23,x30,x31,x32,x33,
    lennum, radnum, savedef, inthreed, uniforms, width, currentGenes, assert, WebGLRenderTarget, nextscale, framenum,
    target, opmode, setObjUniforms, getMaterial, render_camera, HW, resdelta, renderPass, msgfix, newframe, getdamp, rrender, newscene,
    getfiledata, renderObjs, renderVR, xxxdispobj, xxxgenes, genesToCam, xcamera,  V, readWebGlFloat, currentpick, tryseteleval, currentHset, // hornhighlight,
    setInput, rot4toGenes, tand, springs, dodamprate, renderObjPipe, VH, material, usemask,
    col3, onpostframe, format, CSynth, lastDispobj, serious, renderMainObject,
    G, log, newmain, renderObjsInner, skelbuffer, getstats, Director, searchValues, renderskelbuff,
    readWebGlFloatDirect, prerender, nop, Maestro, xxxhset, WALLID, rendertargets, isCSynth, readTextureAsVec4,
    readWebGlFloatAsync, S, clone, copyFrom, resolveFilter, onframe, deferRender, inps, msgfixerror, copyXflip,
    xxxvn, resetCamera, VEC3, mutateOrientation
;

var basescale = 655;
//// organic specific
function myinit() {
    lennum = 25; radnum = 5;
    savedef = "organic";
    inthreed = true;

    if (!uniforms.ymin) uniforms.ymin = { type: 'f', value: -1000000 };
    if (!uniforms.ymax) uniforms.ymax = { type: 'f', value: 1000000 };
    if (!uniforms.lennum) uniforms.lennum = { type: 'f', value: 1 };
    if (!uniforms.radnum) uniforms.radnum = { type: 'f', value: 1 };
    if (!uniforms.fakeinstaceID) uniforms.fakeinstaceID = { type: 'f', value: 0 };

    // create uniforms as the shader expects them even if not used
    if (!uniforms.skelbuffer) uniforms.skelbuffer = { type: "t", value: undefined };
    if (!uniforms.gbuffoffset) uniforms.gbuffoffset = { type: "f", value: 0 };
    if (!uniforms.gbuffdot) uniforms.gbuffdot = { type: "v3", value: new THREE.Vector3() };

    uniforms.lennum.value = lennum;
    uniforms.radnum.value = radnum;
    if (!uniforms.skelbufferRes) uniforms.skelbufferRes = { type: 'v2', value: new THREE.Vector2(1,1) };
}

var dynUniforms = []; for (let i=0; i < 60; i++) dynUniforms.push(new THREE.Vector4());
var MAXPATHS = 30;
uniforms = {
        k: { type: "f", value: 1.0 },     // instance number
        vn : { type: "f", value: 1.0 },   // viewport number
        lennum : { type: "f", value: 10.0 },   // x res of grid
        radnum : { type: "f", value: 10.0 },   // y res of grid
        skelnum : { type: "f", value: 10.0 },   // x res of skeleton
        skelends : { type: "f", value: 2 },     // number of extra points at each end of skeleton
        pointSize : { type: "f", value: 3 },     // pointsize (when rendering points)
        rot4 : { type: "m4", value: new THREE.Matrix4() },   // 4d rotation matrix
        cMapRot4 : { type: "m4", value: new THREE.Matrix4() },   // 4d rotation matrix for walls
        rot44d : { type: "m4", value: new THREE.Matrix4() },   // 4d rotation matrix
        awayvec: { type: 'v3', value: new THREE.Vector3()},     // vector used to determine normal/mu directions
        rtSize: { type: "v2", value: new THREE.Vector2(width, height)}, // render target size
        _camd:  { type: "v4", value: new THREE.Vector4(1, 1000)}, // camera near and 1/range, and log versions in y,z
        //  cameraPosition : { type: "v3", value: new THREE.Vector3() },  // current camera position, needed for lighting, handled automatically by three.js
        cameraPositionModel : { type: "v3", value: new THREE.Vector3() },  // centre camera position in model space
        clearposA0 :    { type: "v3", value: new THREE.Vector3() },  // clear position, needed for VR repulsion effect
        clearposA1 :    { type: "v3", value: new THREE.Vector3() },  // clear position, needed for VR repulsion effect
        clearposB0 :    { type: "v3", value: new THREE.Vector3() },  // clear position, needed for VR repulsion effect
        clearposB1 :    { type: "v3", value: new THREE.Vector3() },  // clear position, needed for VR repulsion effect
        gpRmat :        { type: 'm4', value: new THREE.Matrix4() },  // controller matrix
        gpLmat :        { type: 'm4', value: new THREE.Matrix4() },  // controller matrix
        gcentre :       { type: "v4", value: new THREE.Vector4() },  // used for cpu centre of object
        gridExtra:      { type: "f", value: 1.0 },  // extra spread of grid so that some is wasted
        horncount:      { type: "f", value: 1.0 },  // total number of horns
        _boxsize:       { type: "f", value: 500 },  // reference size for box
        cumcount:       { value: new Array(MAXPATHS).fill(0)},    // for cumulative count of different horn types
        horndepth:      { value: new Array(MAXPATHS).fill(0)},    // nesting depth of honn of horns
        hornvdepth:     { value: new Array(MAXPATHS).fill(0)},    // visible nesting depth of honn of horns (eg ignore no radius)
        ribsa:          { value: new Array(MAXPATHS).fill(0)},    // ribs (for ribbing) of different horn types
        lribdeptha:     { value: new Array(MAXPATHS).fill(0)},    // ribdepth
        dynUniforms:    { value: dynUniforms},          // for dynamic oprations
        pickrt:         { type: "t" },  // pickrendertarget
        pickxslot:      { type: "i", value: 0 },  // extra to add to slot for saving pick
        projectionImage:{type: 't'},               // projection image, used for Kinect
        edgecol:        {value: col3(0,0,0)},  // target colour for edges if using EDGE
        fillcol:        {value: col3(1,1,1)},  // target colour for fill (nonedges) if using EDGE
        occcol:         {value: col3(0,1,1)},  // target colour for occlusion if using EDGE
        unkcol:         {value: col3(1,0,1)},  // target colour for unknown if using EDGE
        profcol:        {value: col3(1,1,1)},  // target colour for profile if using EDGE
        wallcol:        {value: col3(0,1,1)},  // target colour for wall if using EDGE
        backcol:        {value: col3(0,1,1)},  // target colour for wall if using EDGE
        custcol:        {value: new Array(8)}, // custom colours
        cameraAspect:   {value: 1},                     // camera aspect
        feedbackMatrix: {value: new THREE.Matrix3()},
        feedbackTintMatrix:   {value: new THREE.Matrix4()},
        feedtexture:    {value: undefined},
        numScalePositionActive: {value: 1e20}                //
        // scaleDampTarget:{type: 't'}                 // for gpu scaling
    };
for (let u in uniforms) uniforms[u].framenum = -1;
const ucc = uniforms.custcol.value;
for (let i = 0; i < ucc.length; i++) ucc[i] = col3(i & 1, i>>1 & 1, i>>2 & 1);
var baseuniforms = clone(uniforms);

function setGenesAndUniforms() {
    // now all performed in horn.js ... and in setObjUniforms in graphbase.js
}

var scalePixelValues = new Uint8Array(16*4);  // big enough for range plus more for experiment
var scaleRenderTarget={}, scaleDampTarget1={}, scaleDampTarget2={}, scaleInUnitTarget;

/** find the scale of an object */
function scale(genes) {
    genes = genes || currentGenes;
    var rr = range(genes);  // get the range and deduce the scale
    var max = Math.max(Math.max(rr.hx-rr.lx, rr.hy-rr.ly), rr.hz-rr.lz);
    var len = max/2;

    var isc = len === 0 ? 1 : basescale/len;
    genes.gscale = isc;
    return len;
}

/** decode a value passed by odd log, input pixel array and start position */
function decodeReturn(pv, start) {
    var a = pv[start];
    var b = pv[start+1];
    var w = pv[start+3];
    if (a === 0 && b === 0 && w === 0)
        return 0;  // no value seen, eg when all y +ve
    if (w !== 255) {
        //console.log("unexpected decode ~ probably empty object?");
        return NaN;
    }
    if (a === 0 && b === 0) return NaN;
    // var c = pv[2];
    var d = a + b/255;   // rejoin from split, four.fs ^^^^
    var scaleVary = d/127 - 1;  // work back to scaleVary, see four.fs %%%%
    var l = scaleVary;
    var ll = 0;
    if (l < 0) ll = Math.exp(-l*20);  // work back to len, see threek.vs %%%%
    if (l > 0) ll = -Math.exp(l*20);  // work back to len, see threek.vs %%%%
    return ll;
    //var mmsg = "pixel " + a + " " +  b + "  d=" + d + " scaleVary=" + scaleVary + " len=" + len + "   gscale=" + isc.toFixed(3);
    //console.log(mmsg);
}
/** find the range of an object, immediate calls to rangeiprep and to rangeiget */
function rangei(genes, whichRange) {
    assert(whichRange === "now" || whichRange === "main");
    var r = rangeiprep(genes, whichRange);
    return (r === undefined) ? rangeiget(genes, whichRange) : r;  // if rangeiprep did not do prepare, return it's value
}

var SCALERESDIFF = 3;  // was 99, but that was much too extreme
var defrr = {lx: -1, hx: -1, ly: -1, hy: -1, lz: -1, hz: -1};
var scalescene;
/** set up for scaling, return value (1) if not ok, undefined if setup ok */
function rangeiprep(genes, whichRange) {
    assert(whichRange === "now" || whichRange === "main");
    if (badshader) return defrr;
//    if (W.Shadows && !Shadows[0].m_camera)  return defrr;  // do not attempt if shadows not ready yet
    genes = genes || currentGenes;
    rangeiprep.lastGenes[whichRange] = genes;       // make sure it is not used inappropriately
    //checkglerror("found before scalepass");

    var type = THREE.FloatType;
    if (!scaleRenderTarget[whichRange] || scaleRenderTarget[whichRange].texture.type !== type) {
        scaleRenderTarget[whichRange] = WebGLRenderTarget(8, 1, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                type: type,
                stencilBuffer: false
            }, 'scalerendertarget' + whichRange);
        scaleRenderTarget[whichRange].texture.generateMipmaps = false;
        nextscale = framenum = 0;  // reset framenum as well as nextscale (bu why???)
        // nextscale = framenum;
    }

    // set gscale/gcentre or equivalent scaleDampTarget texture to unit values
    let sscaleDampTarget;
    if (scaleInUnitTarget) {
        sscaleDampTarget = uniforms.scaleDampTarget.value;
        uniforms.scaleDampTarget.value = scaleInUnitTarget.texture; // for GPUSCALE
    }
    // do not change genes, use uniforms for renderskebuff,
    // uniforms will be restored from genes when we get to setObjUniforms later
    setObjUniforms(genes, uniforms);
    uniforms.gscale.value = 1;                                  // for cpu scale
    uniforms.gcentre.value.set(0,0,0,0);
    uniforms.shrinkradiusA.value = uniforms.shrinkradiusB.value = 0;    // scale does not use shrink/cut
    if (!render_camera) render_camera = camera;

    renderskelbuff(genes);
    if (scaleInUnitTarget) uniforms.scaleDampTarget.value = sscaleDampTarget;

    renderer.setRenderTarget(scaleRenderTarget[whichRange]);
    renderer.setClearColor(BLACK, 0);
    renderer.autoClear = false;
    renderer.clearTarget(scaleRenderTarget[whichRange], true, true, true); // it is cleared anyway, but to all white ... fixed by <<< false, true,true
    renderer.setViewport(0,0, scaleRenderTarget[whichRange].width,1);

    // TODO <<< way is this 'not the way' save/restore needed?
    // force check with undefined 23 March 2021, then probably remove
    var savecurrent = currentGenes;
    var savetarg = target;
    currentGenes = target = undefined;

    opmode = OPPOSITION;  // must be BEFORE getMaterial
    setObjUniforms(genes, uniforms);
    //var mat = getMaterial(genes.tranrule, genes);
    //if (!mat) return defrr;

    //scene.getDescendants()[0].material = mat;
    //scene.children[0].material = mat; // version 68 of three.js needs this, but probably not relevant by now
    var sdotty = HW.dotty;
    HW.dotty = true;
    resdelta = SCALERESDIFF;
    gl.depthFunc( gl.LEQUAL );  // just in case
    if (!scalescene) {
        scalescene = new THREE.Scene();
        const geom = new THREE.BufferGeometry();
        const mat = getMaterial('NOTR', genes);
        const p = new Float32Array(3);
        const att = new THREE.BufferAttribute(p, 3);
        geom.setAttribute('position', att);
        const points = new THREE.Points(geom, mat);
        points.frustumCulled = false;
        scalescene.add(points);
    }
    const hset = HW.getHornSet(genes)
    scalescene.children[0].geometry.attributes.position.count = 8 * uniforms.skelnum.value * hset.horncount;

    try {
        rrender('newscale', scalescene, camera, scaleRenderTarget[whichRange])
        // renderPass(genes, uniforms, scaleRenderTarget[whichRange], scalescene);
    } finally {
        resdelta = 0;
        HW.dotty = sdotty;
        if (currentGenes !== undefined || target !== undefined) {
            console.error('bad change ???')
            debugger;
        }

        currentGenes = savecurrent; // <<<< NOT THE WAY
        target = savetarg; // <<<< NOT THE WAY
        opmode = OPREGULAR;  // regular
        if (!uniforms.scaleRenderTarget) uniforms.scaleRenderTarget = { type: 't', value: undefined };
        uniforms.scaleRenderTarget.value = scaleRenderTarget[whichRange].texture;

        // renderskelbuff(genes);
        //if (checkglerror("scalepass")) {
        //    genes.gscale = 1;
        //    return defrr;
        //} else {
        //    return undefined;
        //}
    }
}
rangeiprep.lastGenes = {};

/** get the value prepared earlier, if using CPU feedback of scale */
function rangeiget(genes, whichRange) {
    assert(whichRange === "now" || whichRange === "main");
    if (rangeiprep.lastGenes[whichRange] !== genes)
        rangeiprep(genes, whichRange);      // no prep, or inappropriate
    // assert(!inputs.GPUSCALE, 'rangeiget only for not GPUSCASLE');  // now allowed for peeking
    var npixels = 8;
    renderer.setRenderTarget(scaleRenderTarget[whichRange]);
    //var gl = renderer.context;
    //var now = Date.now();
    let k;
    let pv = readWebGlFloatDirect(scaleRenderTarget[whichRange]); k = 4;
    // let pv = readWebGlFloat(scaleRenderTarget[whichRange], {mask:'x'}); k = 1;
    var rr = {};
    rr.lx = -pv[0*k];
    rr.hx = pv[1*k];
    rr.ly = -pv[2*k];
    rr.hy = pv[3*k];
    rr.lz = -pv[4*k];
    rr.hz = pv[5*k];
    rr.lw = -pv[6*k];
    rr.hw = pv[7*k];
/***
    // gl.readPixels(0,0, npixels, 1, gl.RGBA, gl.UNSIGNED_BYTE, scalePixelValues);  // for rangeiget
    //log("read pixels", Date.now() - now);

    var rr = {};
    rr.lx = -decodeReturn(scalePixelValues, 0);
    rr.hx = decodeReturn(scalePixelValues, 4);
    rr.ly = -decodeReturn(scalePixelValues, 8);
    rr.hy = decodeReturn(scalePixelValues, 12);
    rr.lz = -decodeReturn(scalePixelValues, 16);
    rr.hz = decodeReturn(scalePixelValues, 20);
    rr.lw = -decodeReturn(scalePixelValues, 24);
    rr.hw = decodeReturn(scalePixelValues, 28);
***/
    msgfix('cpuscale range read', rr.lx, rr.hx, ',', rr.ly, rr.hy, ',', rr.lz, rr.hz, ',', rr.lw, rr.hw);  // ?? temporary for debug or long term value ??
    newframe();
    return rr;
}

var scaleScene, scaleMesh, scaleUniforms;
// run a smoothed scale
function scaleSmoothGPU(whichRange, damp, ismainvp) {
    assert(whichRange === "now" || whichRange === "main");
    //return;

    var rt;    // output of this scaleSmoothGPU round
    if (scaleUniforms.scaleDampTarget.value === scaleDampTarget1[whichRange].texture) {
        rt = scaleDampTarget1[whichRange];
        scaleUniforms.scaleDampTarget.value = scaleDampTarget2[whichRange].texture;
    } else {
        rt = scaleDampTarget2[whichRange];
        scaleUniforms.scaleDampTarget.value = scaleDampTarget1[whichRange].texture;
    }

    scaleUniforms.scaleRenderTarget.value = scaleRenderTarget[whichRange].texture;
    scaleUniforms.basescale.value = basescale;
    if (damp === undefined) damp = whichRange === "now" || !(inputs.doAnim || springs.running || Director.running) ? 1 : 1 - getdamp(scalehalflife);
    scaleUniforms.dampval.value = damp;
    opmode = "scaleSmooth";
    renderer.setRenderTarget(rt);
	renderer.clear(rt);
    rrender("scaleSmoothGPU", scaleScene, camera, rt);

    // copy to main if necessary.
    if (whichRange ==="now" && damp === 1 && ismainvp) {
        // below did not work: Failed to execute 'texSubImage2D' on 'WebGL2RenderingContext': Overload resolution failed.
        //renderer.setRenderTarget(null);
        //renderer.copyTextureToTexture({x:0, y:0}, rt.texture, scaleDampTarget1.main.texture)
        for (const rrt of [scaleDampTarget1.main, scaleDampTarget2.main]) {
            renderer.setRenderTarget(rrt);
            renderer.clear(rrt);
            rrender("scaleSmoothGPU", scaleScene, camera, rrt);
        }
    }
    uniforms.scaleDampTarget[whichRange] = rt;      // record which the current correct target is
    uniforms.scaleDampTarget.value = rt.texture;      // record which the current correct target is
}

// prepare all the shaders and rendertargets for gpu scaling
function scaleGpuPrep(force=false) {
    if (inputs.NOCENTRE && inputs.NOSCALE && !force) return;
    if (!uniforms.scaleDampTarget) uniforms.scaleDampTarget = { type: 't', value: undefined };
    scaleScene = newscene('scale');
    var xgeometry = new THREE.PlaneGeometry(-1, 1);
    scaleMesh = new THREE.Mesh(xgeometry);
    scaleMesh.frustumCulled = false;
    scaleScene.addX(scaleMesh);
    scaleUniforms = {
        scaleRenderTarget: { type: 't', value: undefined },
        scaleDampTarget: { type: 't', value: undefined },
        basescale:  { type: 'f', value: basescale },
        dampval:  { type: 'f', value: 0.01 }
    };
    var mat = new THREE.RawShaderMaterial({
            uniforms: scaleUniforms,
            vertexShader: getfiledata("shaders/scalesmooth.vs"),
            fragmentShader: getfiledata("shaders/scalesmooth.fs"),
            side: THREE.DoubleSide
        });
    mat.name = 'ScaleSmooth';

    scaleMesh.material = mat;
    xcamera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 0 );
    xcamera.matrixAutoUpdate = false;


    for(var v=0; v<=1; v++) {
        var whichRange = v ? "main" : "now";
        scaleDampTarget1[whichRange] = WebGLRenderTarget(1, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            type: THREE.FloatType
        },
        'scaleDampTarget1' + whichRange
        );
        scaleDampTarget1[whichRange].texture.generateMipmaps = false;
        scaleDampTarget2[whichRange] = WebGLRenderTarget(1, 1, {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                type: THREE.FloatType
            },
        'scaleDampTarget2' + whichRange
        );
        scaleDampTarget2[whichRange].texture.generateMipmaps = false;
        renderer.clear(scaleDampTarget1[whichRange]);
        renderer.clear(scaleDampTarget2[whichRange]);
    }
    scaleDampTarget1[undefined] = scaleDampTarget1[0]; //??
    scaleDampTarget2[undefined] = scaleDampTarget2[0];  //??

    // used for unit input instead of scaleDampTarget1/2, for making slekbuffer prior top OPPOSITION
    scaleInUnitTarget = WebGLRenderTarget(1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false,
        type: THREE.FloatType
        },
    'scaleInUnitTarget'
    );
    renderer.setClearColor(BLACK, 1);
    renderer.setRenderTarget(scaleInUnitTarget);
    renderer.clearColor();
    renderer.setRenderTarget(null);
}

function range(genes) {
    return rangei(genes, "now");
}

/** do immediate gpu scale for genes, using and setting the 'whichRange' set, do NOT adjust rot4 */
function gpuScaleNow(genes, whichRange, damp) {
    const s = genes.gscale;
    genes.gscale = 1;
    genes._gcentre = new THREE.Vector4();
    var dispobj = xxxdispobj(genes);
    if (whichRange === undefined) {
        whichRange = ( (dispobj && dispobj.vn === mainvp) || renderObjs === renderVR) ? "main" : "now";
    }
    rangeiprep(genes, whichRange);
    scaleSmoothGPU(whichRange, damp, dispobj && dispobj.vn === mainvp); // nb if this is made async it doesn't help significantly
    genes.gscale = s;
}

/** get information needed to centre and scale and return in structure */
function getcentrescale(genes = currentGenes, phase=undefined) {
    // assert(!inputs.GPUSCALE, "getcentrescale should only be used with cpu scaling");
    if (appToUse !== "Horn") return undefined;  // eg, fano need better app structure

    // debugframedelta[framenum % debugframedeltasize] +=  phase === "get" ? 500000 : 100000;  // << used to check scale impact on fps
    if (phase === 'prep' )
        return rangeiprep(genes, true);
    if (!genes.tranrule) return;

    var rr = (phase === "get") ? rangeiget(genes, "main") : range(genes);
    rr.wx = rr.hx-rr.lx;
    rr.wy = rr.hy-rr.ly;
    rr.wz = rr.hz-rr.lz;
    rr.ww = rr.hw-rr.lw;

    rr.wmax = Math.max(rr.wx, rr.wy, rr.wz, rr.ww);
    var len = rr.wmax/2;
    var isc = len === 0 ? 1 : basescale/len;
    rr.len = len;
    rr.gscale = isc;

    // x,y,z,w is the centre before scaling
    rr.x = (rr.lx+rr.hx)/2;
    rr.y = (rr.ly+rr.hy)/2;
    rr.z = (rr.lz+rr.hz)/2;
    rr.w = (rr.lw+rr.hw)/2;

    // NOTE: dampling implemented in framescale() in anim.ts

    // below was needed when this is to be used for smoothed centre
    // we now (sensibly?) autoscale BEFORE rot4, so x,y,z is correct and no rot4 compensation needed
    // remove all this after July 2017
    //var m = genes._rot4_ele;
    //let px = rr.x, py = rr.y, pz = rr.z;
    //rr.px = px*m[x00] + py*m[x01] + pz*m[x02];
    //rr.py = px*m[x10] + py*m[x11] + pz*m[x12];
    //rr.pz = px*m[x20] + py*m[x21] + pz*m[x22];
    msgfix('scale =>', rr.gscale, [rr.x, rr.y,rr.z]);
    return rr;
}

/** centre and scale object, return values used if available in case helpful */
function centrescalenow(xxx, whichRange = 'now') {
    // msgfix('centrescalenow', framenum);
    return centrescale(xxx, whichRange, 1);
}

var defaultScale = 0.85;
/** centre and scale object, return values used if available in case helpful */
function centrescale(xxx = currentGenes, whichRange=undefined, damp=undefined, anduser=true) {
    if (mutateOrientation === 'all') return;
    if (deferRender) { onframe(() => centrescale(xxx, whichRange, damp, anduser) ); return; }
    const genes = xxxgenes(xxx);
    if (searchValues.nohorn) return;

    var dispobj = xxxdispobj(genes);
    if (dispobj) dispobj.render();

    const predone = genes === centrescale.lastgenes && framenum === centrescale.lastframenum;
    // log(predone, 'vn', xxxvn(genes), 'oldvn', xxxvn(centrescale.lastgenes), 'framenum', framenum, 'oldframenum', centrescale.lastframenum);
    if (predone) return;
    centrescale.lastgenes = genes; centrescale.lastframenum = framenum;

    var rr = establishObjpos(genes, whichRange, damp);
    resetCamera(genes);

    // and make rot4 behave (3d only)
    // if anduser set (default for compatibility) we override user scale
    // we do NOT want to do this eg when user is zooming (G._uScale)
    if (!inputs.using4d && anduser) {
        var r4 = genes._rot4_ele;
        if (r4)
            r4[3] = r4[7] = r4[11] = 0;     // resets PAN
        genes._uScale =  1;             // reset zoom
        genes._panx = genes._pany = genes._panz = 0
    }
    if (rr === 'done') return;
    if (rr === 'notdone') { onframe(() => centrescale(xxx, whichRange, damp, anduser) ); return; }

    newframe();
    return rr;
}

/** establish the object position and scale, but do not adjust user (rot4) position etc
 * return 'notdone' if not yet ready to render
 * return 'done' if using gpuscale, it has dne the work as well as established
 * return rr structure otherwise, for higher level to use
*/
function establishObjpos(xxx, whichRange, damp) {
    if (framenum < 10) return 'notdone';
    var genes = xxx ? xxxgenes(xxx) : currentGenes;
    if (!genes?.tranrule) return;
    if (inputs.NOCENTRE && inputs.NOSCALE && !genes._Special) return;
//    if (inputs.using4d) return undefined;
//if (inputs.GPUSCALE) return;//<<<
    if (appToUse !== "Horn") return undefined;  // eg, fano need better app structure
    genesToCam(genes);
    if (inputs.GPUSCALE) {
        gpuScaleNow(genes, whichRange, damp);
        return 'done';
    }


    // first set the object so it is centred and scaled before rot4
    var rr = getcentrescale(genes);
    if (!rr) return;
    if (!genes._gcentre) genes._gcentre = new THREE.Vector4();
    genes._gcentre.copy(rr);    // w irrelevant except in 4d mode
    genes.gscale = rr.gscale;
    dodamprate = {};  // prevent silly results, maybe just unset selected fields of dodamprate
    uniforms.gscale.value = genes.gscale;
    uniforms.gcentre.value.copy(genes._gcentre);

    return rr;
}

var possize = 64;
var posPixelValues;
var posRenderTarget;

/** fix position for object, relative to screen */
function fixposition(genes) {
    if (badshader) return {ax:0, ay:0};
    genes = genes || currentGenes;
    setObjUniforms(genes, uniforms);
    //var gl = renderer.context;
    if (!posPixelValues || posPixelValues.length !== 4 * possize * possize) {
        posRenderTarget = WebGLRenderTarget(possize, possize, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false
        }, 'posRenderTarget' );
        posRenderTarget.texture.generateMipmaps = false;
        posPixelValues = new Uint8Array(4 * possize * possize);
    }
    renderer.setClearColor(BLACK);
    renderer.autoClear = false;
    renderer.clearTarget(posRenderTarget, true, true, true); // it is cleared anyway, but to all white ... fixed by <<< false, true,true
    renderer.setViewport(0,0, possize,possize);
    opmode = OPSHADOWS;  // must be BEFORE getMaterial, use OPSHADOWS because it is cheap
    var mat = getMaterial(genes.tranrule, genes);
    //mat.wireframe = false;
    scene.getDescendants()[0].material = mat;
    render_camera = camera;
    renderPass(genes, uniforms, posRenderTarget);

    gl.readPixels(0,0, possize, possize, gl.RGBA, gl.UNSIGNED_BYTE, posPixelValues);  // for fixposition
    var p = 0;
    var s=0, sx=0, sxx=0, sy=0, syy=0, sxy=0;
    for (var y=0; y<possize; y++) {
        for (var x=0; x<possize; x++) {
            if (posPixelValues[p] + posPixelValues[p+1] + posPixelValues[p+2] !== 0) {
                s++; sx+= x; sy+=y; sxx += x*x; syy += y*y; sxy += x*y;
            }
            p+=4;
        }
    }
    var ax = s === 0 ? 0 : sx / s / possize * 2 - 1;
    var ay = s === 0 ? 0 : sy / s / possize * 2 - 1;
    //console.log("avg x =" + ax + "avgy=" + ay) ;

    opmode = OPREGULAR;  // regular
    mat.wireframe = false;

    //newframe();
    return {ax:ax, ay:ay};
}

/** find deltas needed to centre, changes needed to rot4
 * scale depends on camera position etc */
function UnusedThreekfixpositionrot4(genes) {
    genes = genes || currentGenes;
    var pos = fixposition(genes);
    var dd={};
    dd.dx = -2*pos.ax * tand(camera.fov/2)*genes._camz;
    dd.dy = -2*pos.ay * tand(camera.fov/2)*genes._camz / camera.aspect;
    return dd;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ PICKING

var pickRenderTarget, pickOposTarget;
var OUTSLOTS = 4;
var pickPixelValues = new Uint8Array(4 * OUTSLOTS);
var lastPick = "";

function setPickRenderTarget(doclear = true) {
    //var gl = renderer.context;
    if (!pickRenderTarget && (isCSynth || window.oldpick)) {
        pickRenderTarget = WebGLRenderTarget(OUTSLOTS, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            stencilBuffer: false,
            type: THREE.FloatType,
            format: THREE.RGBAFormat
        }, 'pickRenderTarget' );
        pickRenderTarget.texture.generateMipmaps = false;
        uniforms.pickrt.value = pickRenderTarget.texture;
        pickRenderTarget.texture.name = 'pickrttexture'

        pickRenderTarget.byteversion = WebGLRenderTarget(OUTSLOTS*4, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            stencilBuffer: false,
            type: THREE.UnsignedByteType,
            format: THREE.RGBAFormat
        }, 'pickRenderTarget byteversion' );
        pickRenderTarget.byteversion.texture.generateMipmaps = false;
    }

    if (!pickOposTarget && !CSynth.current) {
        pickOposTarget = WebGLRenderTarget(1, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            stencilBuffer: false,
            type: THREE.FloatType,
            format: THREE.RGBAFormat
        }, 'pickOposTarget' );
        pickOposTarget.texture.generateMipmaps = false;
        // NO uniforms.pickrt.value = pickOposTarget.texture;
        pickOposTarget.texture.name = 'pickoposrttexture'

    }

    if (doclear && pickRenderTarget) {  // this clear only used at initialization
        renderer.setClearColor(pick.sillycol, 999);
        renderer.clearTarget(pickRenderTarget, true, true, true);
    }
}

/** find picked point on an  object, x,y may be screen (mouse) positions, or x a matrix
result is in GPU in pickRenderTarget, available as uniform pickrt
inputs: which dispobj to perform picking on
x,y: mouse position (if direct from screen)
x: matrix (if from ray)
slotoff:    offset from normal to put result in pickarray
slotoffmat: offset from normal to put result in pickarray
 */ //TODO: as well as pickRenderTarget, make pickednessRenderTarget (& damped version)
function pickGPU(dispobj, x,y, slotoff=0, slotoffmat=-1, doclear=true) {
    // TODO: XXX check camera usage here
    if (!dispobj.genes) { msgfix("pickpane", "pick not on pane", '?'); return; }  else { msgfix("pickpane", dispobj.vn); }
    if (x === undefined) { serious('required parameter x not given to pickGPU'); return; }
    // msgfix('>pickgpu', x, y);

    setPickRenderTarget(false);

    setObjUniforms(dispobj.genes, uniforms);
    // if (camera !== render_camera) serious('unexpected camera mismatch');

    if (pickRenderTarget) {
        if (slotoffmat > 0) {
            pickRenderTarget.scissorTest = true;
            pickRenderTarget.scissor.set(slotoff/4,0,2,1);
        } else {
            pickRenderTarget.scissorTest = false;
        }
    }

    // establish appropriate 'base' camera
    prerender(dispobj.genes, uniforms);

    // narrow camera to point just down required 'ray'
    var scamera = camera;
    var srcamera = render_camera;
    var sview = {}; Object.assign(sview, camera.view)
    if (typeof x === 'object') {    // x assumed to be input matrix from controller (or gaze?)
        if (!V.raycamera) V.raycamera = camera.clone();
        camera = V.raycamera;
        camera.near = scamera.near; camera.far = scamera.far;
        camera.matrixAutoUpdate = false;
        camera.matrix.copy(x);  // x assumed to be matrix
        camera.updateMatrixWorld(true);
        //x.decompose(camera.position, camera.quaternion, camera.scale);
        let s = 0.00001;
        camera.setViewOffset(1,1,  0.5 - s,0.5 - s,  2*s, 2*s);
    } else {
        if (!(x === 'c' || x === oldlayerX)) console.error('unexpected x in pickGPU', x);
        if (x === 'c') x = dispobj.width/2;
        if (y === 'c') y = dispobj.height/2;
        let s = 80000;
        if (sview.enabled) {
            camera.setViewOffset(dispobj.width, dispobj.height,
                (x-dispobj.left) * sview.width/sview.fullWidth + sview.offsetX - dispobj.width/s/2,
                (dispobj.height-(height-y-dispobj.bottom)) * sview.height/sview.fullHeight + sview.offsetY - dispobj.height/s/2,
                dispobj.width/s,dispobj.height/s);
        } else {
            camera.setViewOffset(dispobj.width, dispobj.height,
                x-dispobj.left-dispobj.width/s/2,
                dispobj.height-(height-y-dispobj.bottom)-dispobj.height/s/2,
                dispobj.width/s,dispobj.height/s);
        }
    }
    camera.updateProjectionMatrix();

    render_camera = camera;
    if (doclear && pickRenderTarget) {
        renderer.setClearColor(pick.sillycol, 999);
        renderer.clearTarget(pickRenderTarget, true, true, true);
    }

    if (CSynth.current || window.oldpick) {
        // make sure details correct for renderpass
        // work using old style Organic pick, also CSynth pick
        opmode = OPPICK;   // must be BEFORE getMaterial
        //var mat = get Material(dispobj.genes, dispobj.genes);

        // calling renderPass is adequate  for horn, but makes extra options complicated with matrix pick etc
        uniforms.pickxslot.value = slotoff;
        //renderPass(dispobj.genes, uniforms, pickRenderTarget);
        if (renderMainObject) renderObjPipe(scene, renderPass, dispobj.genes, uniforms, pickRenderTarget, 0, "pick");

        // handle matrix if present
        if (VH.matrix && VH.matrix.visible && slotoffmat >= 0) {
            if (!material.pick) material.pick = {}; // will get populated soon
            if (material.pick.matrix) material.pick.matrix.side = THREE.DoubleSide;
            let su = usemask;
            usemask = 'pick';
            uniforms.pickxslot.value = slotoffmat;
            VH.matrix.newRender(pickRenderTarget);
            usemask = su;
        }
    }

    if (!CSynth.current) {
        // work using new style Organic pick
        renderskelbuff(dispobj.genes);
        opmode = OPOPOS;
        // renderer.clearTarget(pickOposTarget, true, true, true);
    //    renderskelbuff(dispobj.genes);
        renderer.setRenderTarget(pickOposTarget);
        renderer.setClearColor(pick.sillycol, 999);
        renderer.clear(true, true, true);
        const s = prerender; prerender = nop;
        renderPass(dispobj.genes, uniforms, pickOposTarget, scene);
        // these below did not work??? why ?
        // if (renderMainObject) renderObjPipe(scene, renderPass, dispobj.genes, uniforms, pickOposTarget, 0, "pickopos");
        // rrender("pickopos", scene, render_camera, pickOposTarget);
        prerender = s;
    }

    if (sview.enabled) {
        camera.setViewOffset(sview.fullWidth, sview.fullHeight, sview.offsetX, sview.offsetY, sview.width, sview.height);
    } else {
        camera.clearViewOffset();
    }

    camera.updateProjectionMatrix();
    camera = scamera;
    render_camera = srcamera;
}

pick.sillycol = col3(999,999,999);
pick.array = new Array(20).fill(999);  // will be filled with 16 GPU values and 4 program values
/** perform pick on gpu and read back and display and return result, see pickGPU for details */
//PJT::: passing in an extra argument so that we can respond appropriately to different sources of event...
//
// phase 1 pick->pickGPU to do pick setup, and showpick;
// phase 2 realshowpick call async to read and process result of pick
function pick(dispobj, x,y, slotoff=0, slotoffmat=-1, doclear=true, callback=undefined) {
    if (badshader || dispobj === 'nodispobj') return;
    if (!dispobj) dispobj = slots[mainvp].dispobj;
    let reuseopos = false;      // true to use 'standard' opos buffer readback for pick
    if (dispobj === slots[mainvp].dispobj && !isCSynth) {    // TODO verify if it works with CSynth
        reuseopos = true;       // pick direct from rtopos
    } else {
        pickGPU(dispobj, x, y, slotoff, slotoffmat, doclear);
    }
    const hset = xxxhset(dispobj);
    return showpick(dispobj, callback, {cumcount: hset.cumcount.slice(0), hset, dispobj, x, y, reuseopos});
}

function setPick(slotoff=0, value=undefined) {
    //setup projection appropriately to render value to appropriate place in pickRenderTarget...
    //or 'just' set value in buffer with gl bufferSubData or similar?
}

/** showpick, end of phase 1, arrange for phase 2 realshowpck to be called async
 */
function showpick(dispobj, callback, pickenv) {
    if (showpick.lastframe !== framenum || callback) {
        onpostframe(()=>realshowpick(callback));
        showpick.lastframe = framenum;
    }

    /** show pick information, but only once per frame when possible multiple pick calls complete
    or if a callback is specified then it will always run so that it can do what it has to do
    side-effect, sets currentPick, currentHset.hornhighlight

    this is the 'phase 2' of picking,
    at the end of the frame when the picking was done, or start of the frame after the picking done
    **/
    async function realshowpick(callback1) {
        if (!dispobj || dispobj === 'nodispobj') dispobj = slots[mainvp].dispobj;
        if (!dispobj.genes) return;
        // if (!pickRenderTarget) return;  // called before ready

        // working towards new pick
        if (pickenv.reuseopos) {
            // compensate for renderRatio and copyXflip
            let rr = 1/inps.renderRatioUi;
            if (dispobj.vn === mainvp && inps.renderRatioUiMain !== 0) rr = inps.renderRatioUiMain;
            if (dispobj.vn === mainvp && inps.renderRatioUiProj !== 0 && slots[-1]) rr = inps.renderRatioUiProj; // <<<??? should be rr = 1/inps.... ????
            let left = pickenv.x - dispobj.left;
            if (copyXflip < 0) left = dispobj.width - left;
            left /= rr;
            let top = height - pickenv.y - dispobj.bottom
            top /= rr;

            const options = {width: 1, height: 1, left, top};
            const opos = rendertargets['rtopos' + dispobj.rt.width + 'x' + dispobj.rt.height];
            if (!opos) return msgfixerror('!pickopos', 'bad opos')
            const hitvals = await readWebGlFloatAsync(opos, options);
            if (hitvals[2] === -1) hitvals.fill(999);
            msgfix('!pickopos', top, left, '=>', hitvals);
            Maestro.trigger('pickdone', Object.assign(pickenv, {hitvals}));
        } else if  (pickOposTarget) {
            const hitvals = await readWebGlFloatAsync(pickOposTarget)    ;
            msgfix('!pickopos', hitvals);
            Maestro.trigger('pickdone', Object.assign(pickenv, {hitvals}));
        }

        if (pickRenderTarget) {
            // get pick data from gpu
            // let vv = pick.array = Array.from(readWebGlFloat(pickRenderTarget, {rtout: pickRenderTarget.byteversion, channels: 4}, 'pick'));
            // let vv = pick.array = Array.from(readWebGlFloatDirect(pickRenderTarget));
            if (!pickRenderTarget.farr) {   // save recreating buffers
                const size = pickRenderTarget.width * 4;    // 4 as always rgba
                pickRenderTarget.farr = new Float32Array(size);
                pickRenderTarget.arr = new Array(size);
            }
            await readWebGlFloatAsync(pickRenderTarget, {buffer: pickRenderTarget.farr});
            renderer.setRenderTarget(pickRenderTarget);
            pickRenderTarget.arr.set(pickRenderTarget.farr);
            const vv = pickRenderTarget.arr;
            pick.array.set(vv); // not sure the distinction between pickRenderTarget.arr and pick array, CSynth pick was broken 16July2022 without this

            // add user pick data if any (? CSynth only)
            let p = 16; // entries already filled in pick.array
            if (uniforms.userPicks) {
                for (let i = 0; i < uniforms.userPicks.value.length; i++) {
                    vv[p++] = uniforms.userPicks.value[i];
                }
            }

            // display pick data fairly raw (mainly debug)
            let vvs = [];
            for (let i=0; i< vv.length; i++) {
                let v = vv[i];
                vvs.push(Math.round(v) === 999 ? '.' : format(v));
            }
            msgfix('xhit', vvs.join(' '));

            // delegate processing for CSynth data
            if (CSynth && CSynth.current && CSynth.showpick) {
                CSynth.showpick(callback1);  // << test bridge to csynth
                return;
            }

            // handle old style Organic pick date, not correct with recursive horns
            var ss = "";
            let picks = "";

            var segNames = HW.getHornSet(dispobj.genes).segnames;
            currentHset.hornhighlight = undefined;
            var sss = [];

            // 'old' style Organic check ... wrong with
            for (let i=0; i<segNames.length; i++) {
                if (+segNames[i] < 990) continue; // ??? leading 'dummy' ones ??? named 999 etc
                var rp = vv[i];
                if (rp < 0 || rp > 1) continue;
                if (rp === 0) rp = "head";
                else if (rp === 1) rp = "tail";
                else rp = (rp).toFixed(6);
                ss += " " + segNames[i] + "=" + rp;
                sss.push({name: segNames[i], rp: rp});
                if (picks === "" && i >= 2) picks = segNames[i];
            }
            currentpick = ss;
            if (ss === "") {
                msgfix('hit', "miss>>> lastPick=" + lastPick);
            } else {
                msgfix('hit', '->>' + ss);
                lastPick = ss;
            }


            opmode = OPREGULAR;

            //tryseteleval('genefilter', picks + "_");
            //filter GuiGenes();
            currentHset.hornhighlight = picks;
            if(callback1) callback1(sss);
            return sss;
        }   // pickrendertarget, CSynth or old style organic
    }
}

// phase two of
function objhit(evt) {
    const {dispobj, hitvals, hset, cumcount} = evt.eventParms;
    const hnum = Math.round(hitvals[2]);
    const lnum = Math.round(hitvals[3]);
    hset.hornhighlight = undefined;
    dispobj.render(1); // so highlighting stops
    if (hnum === 999) {
        msgfix('newhit', 'NONE');
    } else if (lnum === WALLID) {
        msgfix('newhit', 'WALL');
    } else {
        // f() below Recursively tracks parents and find counts
        /* horn(A).sub(B); horn(B).sub(C); horn(C);
        1 horn  A, #0
        4 horns B, #1 to #4
        8 horns C, #5 to #12

        The individual C horns are wrapped by number as in CURRENT below;
        TODO? change to 'SENSIBLE' wrapping.
        That will need a change in the unwrapping code in hornmaker.vs
        and in f() below.
        Note it will not change the range of numbers used byu each horn type A,B,C

         CURRENT                'SENSIBLE'
           12 8                    12 11
        4 -'--'--|              4 -'--'--|
           11 7  |                 10 9  |
        3 -'--'--|              3 -'--'--|
           10 6  |                 8  7  |
        2 -'--'--|              2 -'--'--|
           9  5  |                 6  5  |
        1 -'--'--|              1 -'--'--|
                 |                       |
                 0                       0
        */
        const s = [];       // resulting array of hits (each entry display string)
        let dnum;           // offset of this horn in its range, [0..ribs-1], modified as f() calls unwound
        const f = (id) => {
            if (id < 0) return;
            const cc = hset.hornrun[id];
            f(cc.parentHornid);
            const rnum = dnum % cc.ribs;
            dnum = Math.floor(dnum / cc.ribs);
            s.push(`${cc.hornname}/${id} ${rnum} of ${cc.ribs-1}`);
        }
        for (let hornid= 3; hornid < cumcount.length; hornid++) {
            if (hnum < cumcount[hornid]) {
                const cc = hset.hornrun[hornid];
                dnum = hnum - (cumcount[hornid-1] || 0)
                f(hornid, hnum);
                msgfix('newhit', `vn=${dispobj.vn}  ${s.reverse().join(', ')}`);
                hset.hornhighlight = hornid;
                dispobj.render(Infinity); // so highlighting can work
                return;
            }
        }

        msgfix('newhit', '?????', hnum, cumcount);
    }

}
Maestro.on('pickdone', e=>objhit(e));

/** perform picking using both controllers, with appropriate slot offsets */
function vivepick() {
    if (searchValues.nohorn) return;    // pick only works on horn items, ribbon and matrix for CSynth
    if (!renderMainObject && !(VH.matrix && VH.matrix.visible)) return;  // do not try picking if nothing pickable visible
    // V.pickfun = V.pickfun || pickGPU;   // set V.pickfun = pick for seeing feedback
    const pickfun = renderVR.invr() ? pickGPU : pick;
    const slot = slots[1] || slots[mainvp];  // slots[1] when in stereo, slots[mainvp] as fallback
    if (!slot) { console.error('no slots to pick in'); return; }

    if (!V.BypassLeftLaser && V.gpL && renderVR.invr()) {
        V.picklist = pickfun(slot.dispobj, V.gpL.raymatrix, 0, 8, 12);
    }
    if (V.gpR && renderVR.invr()) {
        V.picklist = pickfun(slot.dispobj, V.gpR.raymatrix, 0, 0, 4);
    } else if (renderVR.invr()) {
        pickfun(slot.dispobj, 'c', 'c', 0, 4);  // effectively use gaze but mo
    } else if (oldlayerX !== undefined) {
        pickfun(lastDispobj, oldlayerX, oldlayerY, 0, 4);
    }
}

function forceCPUScale() {
    if (inputs.GPUSCALE) {
        setInput(W.GPUSCALE, false);
        msgfix("CPUSCALE", "warning: not using GPUSCALE so frames will be less smooth. <br>Needed for correct framing in director and recording.");
        for (var i = 0; i<slots.length; i++) {
            if (slots[i]) {
                var rr = centrescale(slots[i].dispobj.genes, "now", 1);
                newframe(slots[i].dispobj);
                rot4toGenes(slots[i].dispobj.genes);
            }
        }
        setTimeout(refall, 0);
    }
}

/** test the scale in different ways */
function testScale() {
    const ss = [inputs.resbaseui, SCALERESDIFF];
    for(let i=4; i<15; i++) {
        inputs.resbaseui = i;
        SCALERESDIFF = i===15 ? 0 : 3;  // test with standard value except for last test
        centrescalenow(G, 'now');
        const scrange = readWebGlFloat(scaleRenderTarget.now)[0];
        [0,2,4,6].forEach(x=>scrange[x] *= -1);
        log('scrange', i, uniforms.lennum.value, uniforms.radnum.value, scrange);
    }
    [inputs.resbaseui, SCALERESDIFF] = ss;

    const sss = [inputs.NOCENTRE, inputs.NOSCALE];
    // inputs.NOCENTRE = inputs.NOSCALE = true;
    setInput(W.NOCENTRE, true); setInput(W.NOSCALE, true);
    for (let i=0; i<3; i++) {
        newmain(); renderObjsInner();
        const sk = readWebGlFloat(skelbuffer);
        const skstats = sk.map(x => getstats(x));
        log('skerange', skstats.map(x=>[x.min, x.max]) );
    }

    setInput(W.NOCENTRE, sss[0]); setInput(W.NOSCALE, sss[1]);
    newmain(); renderObjsInner();
}

//window.addEventListener('load', init);
window.addEventListener("load", init);
// for jslint THREE, document, window, location, localStorage, Stats, Uint8Array, XMLHttpRequest, ActiveXObject


/*****
now  CPU:  establishObjPos -> getcentrescale -> range -> rangeiprep/rangeiget
main CPU:  establishObjPos -> getcentrescale -> range -> rangeiprep/rangeiget
                            | whichRange lost     | whichRange replaced with 'now'

now  GPU:  establishObjPos -> gpuScaleNow -> rangeiprep
main GPU:  animatee -> framescale => rangeiprep
**/


/** compute stats using gpu */
var numInstances, numInstancesP2;
function gpuStats() {
    if (!gpuStats.scene) {
        const guniforms = gpuStats.uniforms = {
            inpos: {type: 't'},
            ACTIVERANGE: { type: 'f', value: 1},
            OFF: { type: 'f', value: 1}

        };
        const vertexShader = `
            precision highp float;
            attribute vec3 position;  // input, range -0.5 .. 0.5
            varying vec2 p;        // range -0.5 .. 0.5
            void main() {
                gl_PointSize = 1.;
                p = position.xy;
                gl_Position = vec4(0, position.y * 1.5, 0, 1);  // map -0.5..0.5 to -0.75 .. 0.75
            }
        `;
        const fragmentShader = `
            precision highp float;
            varying vec2 p;        // range -0.5 .. 0.5
            uniform sampler2D inpos;
            uniform float ACTIVERANGE, OFF;
            void main() {
                vec4 pos = texture2D(inpos, vec2( 0.5, (p.x+0.5) * ACTIVERANGE + OFF));
                if (p.y < -0.4)
                    gl_FragColor = vec4(pos.xyz, 1);
                else if (p.y < 0.)
                    gl_FragColor = vec4(pos.xyz * pos.xyz, 1);
                else if (p.y < 0.4)
                    gl_FragColor = vec4(pos.y * pos.z, pos.z * pos.x, pos.x * pos.y, 1);
                else
                    gl_FragColor = vec4(1);
            }
        `
        const mat = gpuStats.material = new THREE.RawShaderMaterial({
            vertexShader, fragmentShader, uniforms: guniforms
        });
        mat.name = 'gpuStats_material';
        mat.blending = THREE.AdditiveBlending;
        mat.transparent = true;
        // mat.side = THREE.DoubleSide;
        mat.depthWrite = false;
        mat.depthTest = false;

        const geom = HW.planeg(1,1, numInstances-1, 3);
        geom.setIndex(null);        // not the most efficient, but convenient
        geom.name = 'gpuStats_geom';
        gpuStats.points = new THREE.Points(geom, gpuStats.material);
        gpuStats.points.name = 'gpuStats_points';
        gpuStats.scene = newscene('gpuStats_scene');
        gpuStats.scene.add(gpuStats.points);

        gpuStats.target = WebGLRenderTarget(1, 4, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        }, 'gpuStats.target'  );
        gpuStats.target.texture.generateMipmaps = false;

    }
    //gpuStats.uniforms.inpos.value = skelbuffer;
    //gpuStats.uniforms.ACTIVERANGE.value = (numInstances-1) / skelbuffer.width;
    //gpuStats.uniforms.OFF.value = 0.5/skelbuffer.width;
    gpuStats.uniforms.inpos.value = springs.posNewvals.texture;
    gpuStats.uniforms.ACTIVERANGE.value = (numInstances-1) / numInstancesP2;
    gpuStats.uniforms.OFF.value = 0.5/numInstancesP2;
    renderer.setRenderTarget(gpuStats.target);
    renderer.setClearColor(0, 0);
    renderer.clearColor();
    rrender('gpustats', gpuStats.scene, camera, gpuStats.target);

    // temp for testing
    return readWebGlFloat(gpuStats.target);
}

/** transfer view from main viewport on or all others */
async function transferView(to, from=mainvp) {
    if (to === undefined) {
        for (let s=1; s < slots.length; s++)
            if (slots[s] && s !== mainvp) {
                transferView(s, mainvp);
                await S.frame();
            }
        return;
    }
    const tg = xxxgenes(to);
    if (!tg) return;  // no genes at target
    const fg = xxxgenes(from);
    for (const x in fg) if (x[0] === '_') tg[x] = clone(fg[x]);
    const td = xxxdispobj(to);
    td.render();
}

/** compute scale from skeleton, w.i.p.
* If we want to use it do our own min/max stats and do not create lots of Vector4s
* Also, add/substract radius from x,y,z
*/
function skeletonscale(genes=currentGenes) {
    if (inputs.GPUSCALE) console.error('skeletonscale called with GPUSCALE')
    genes.gscale = 1;
    uniforms.gscale.value = 1;
    genes._gcentre.set(0,0,0);
    uniforms.gcentre.value.set(0,0,0);
    renderskelbuff(genes);
    const s = {}; copyFrom(s, genes);
    genes._panx = genes._pany = genes._panz = 0;
    genes._uScale = 1;


    const w = uniforms.skelnum.value;
    const h = uniforms.horncount.value;
    // const sk = readTextureAsVec4(skelbuffer, {width:w, height:h});
    // const stats = CSynth.stats(sk);
    // stats.gscale = basescale / stats.rmax * 2;
    // genes.gscale = stats.gscale * genes.gscale;
    // return stats;

    const sk = readWebGlFloatDirect(skelbuffer, {width:w, height:h});
    let lx = Infinity, hx = -Infinity;
    let ly = Infinity, hy = -Infinity;
    let lz = Infinity, hz = -Infinity;
    for (let i = 0; i < sk.length; i+=4) {
        const x = sk[i];
        const y = sk[i+1];
        const z = sk[i+2];
        const r = sk[i+3];
        lx = Math.min(lx, x-r); hx = Math.max(hx, x+r);
        ly = Math.min(ly, y-r); hy = Math.max(hy, y+r);
        lz = Math.min(lz, z-r); hz = Math.max(hz, z+r);
    }
    const wx = hx-lx;
    const wy = hy-ly;
    const wz = hz-lz;
    const wmax = Math.max(wx, wy, wz);
    const x = (hx+lx)/2;
    const y = (hy+ly)/2;
    const z = (hz+lz)/2;
    const gscale = basescale / wmax * 2
    genes.gscale = gscale * genes.gscale;
    genes._gcentre.set(x,y,z);

    xxxdispobj(genes).render();

    copyFrom(genes, s, resolveFilter('_pan | _uScale'));
    // return similar format to getcentrescale, but scaled by initial gscale
    return {lx, hx, ly, hy, lz, hz, wmax, wx, wy, wz, x,y,z}


}
