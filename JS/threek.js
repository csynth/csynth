"use strict";
// declarations to prevent 'undeclared global' and work towards namespace cleanup
var W, THREE, badshader, inputs, Shadows, renderer, BLACK, WHITE,
    OPPOSITION, OPREGULAR, OPSHADOWS, OPPICK,
    scene, camera, gl, scalehalflife, mainvp, appToUse, debugframedelta, debugframedeltasize,
    oldlayerX, oldlayerY, height, getHornSet, init, slots, refall,
    x00,x01,x02,x03,x10,x11,x12,x13,x20,x21,x22,x23,x30,x31,x32,x33,
    lennum, radnum, savedef, inthreed, uniforms, width, currentGenes, assert, WebGLRenderTarget, nextscale, framenum,
    target, opmode, setObjUniforms, getMaterial, render_camera, dotty, resdelta, renderPass, msgfix, newframe, getdamp, rrender, newscene,
    getfiledata, renderObjs, renderVR, xxxdispobj, xxxgenes, genesToCam, xcamera,  V, hornhighlight, readWebGlFloat, currentpick, tryseteleval,
    setInput, makeGenetransform, tand, springs, dodamprate, renderObjPipe, VH, material, usemask,
    col3, onpostframe, format, CSynth, lastDispobj, serious, renderMainObject,
    G, log, newmain, renderObjsInner, skelbuffer, getstats, planeg, Director, searchValues
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
    if (!uniforms.skelbufferRes) uniforms.skelbufferRes = { type: 'v2', value: new THREE.Vector2(4096,1) };
}

uniforms = {
        k: { type: "f", value: 1.0 },     // instance number
        vn : { type: "f", value: 1.0 },   // viewport number
        lennum : { type: "f", value: 10.0 },   // x res of grid
        radnum : { type: "f", value: 10.0 },   // y res of grid
        skelnum : { type: "f", value: 10.0 },   // x res of skeleton
        skelends : { type: "f", value: 2 },     // number of extra points at each end of skeleton
        pointSize : { type: "f", value: 3 },     // pointsize (when rendering points)
        outpower : { type: "f", value: 1.0 },   // power to use on output of main render
        rot4 : { type: "m4", value: new THREE.Matrix4() },   // 4d rotation matrix
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
        pickrt: { type: "t" },  // pickrendertarget
        pickxslot: { type: "i", value: 0 }  // extra to add to slot for saving pick
    };
for (let u in uniforms) uniforms[u].framenum = -1;

function setGenesAndUniforms() {
    // now all performed in horn.js ... and in setObjUniforms in graphbase.js
}

var scalePixelValues = new Uint8Array(16*4);  // big enough for range plus more for experiment
var scaleRenderTarget={}, scaleDampTarget1={}, scaleDampTarget2={};

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
/** set up for scaling, return value (1) if not ok, undefined if setup ok */
function rangeiprep(genes, whichRange) {
    assert(whichRange === "now" || whichRange === "main");
    if (badshader) return defrr;
//    if (W.Shadows && !Shadows[0].m_camera)  return defrr;  // do not attempt if shadows not ready yet
    genes = genes || currentGenes;
    rangeiprep.lastGenes[whichRange] = genes;       // make sure it is not used inappropriately
    //checkglerror("found before scalepass");

    // NO special version for read back any more, use readWebGLFloat var type = inputs.GPUSCALE ? THREE.FloatType : THREE.UnsignedByteType;
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
        //renderer.setClearColor(BLACK);
        //renderer.clear(scaleRenderTarget[whichRange]);
        nextscale = 0; framenum = 0;
    }

    renderer.setRenderTarget(scaleRenderTarget[whichRange]);
    renderer.setClearColor(BLACK, 0);
    renderer.autoClear = false;
    renderer.clearTarget(scaleRenderTarget[whichRange], true, true, true); // it is cleared anyway, but to all white ... fixed by <<< false, true,true
    renderer.setViewport(0,0, scaleRenderTarget[whichRange].width,1);

    // TODO way is this 'not the way' save/restore needed? is it still?
    var savecurrent = currentGenes; // <<<< NOT THE WAY
    currentGenes = genes; // <<<< NOT THE WAY
    var savetarg = target; // <<<< NOT THE WAY
    target = {}; // <<<< NOT THE WAY

    opmode = OPPOSITION;  // must be BEFORE getMaterial
    setObjUniforms(genes, uniforms);
    var mat = getMaterial(genes);
    if (!mat) return defrr;

    //scene.getDescendants()[0].material = mat;
    scene.children[0].material = mat; // version 68 of three.js needs this, but probably not relevant by now
    render_camera = camera;
    var sdotty = dotty;
    dotty = true;
    resdelta = SCALERESDIFF;
    gl.depthFunc( gl.LEQUAL );  // just in case

    renderPass(genes, uniforms, scaleRenderTarget[whichRange]);

    resdelta = 0;
    dotty = sdotty;
    currentGenes = savecurrent; // <<<< NOT THE WAY
    target = savetarg; // <<<< NOT THE WAY
    opmode = OPREGULAR;  // regular
    if (!uniforms.scaleRenderTarget) uniforms.scaleRenderTarget = { type: 't', value: undefined };
    uniforms.scaleRenderTarget.value = scaleRenderTarget[whichRange].texture;
    //if (checkglerror("scalepass")) {
    //    genes.gscale = 1;
    //    return defrr;
    //} else {
        return undefined;
    //}
}
rangeiprep.lastGenes = {};

/** get the value prepared earlier, if using CPU feedback of scale */
function rangeiget(genes, whichRange) {
    assert(whichRange === "now" || whichRange === "main");
    if (rangeiprep.lastGenes[whichRange] === genes)
        rangeiprep(genes, whichRange);      // no prep, or inappropriate
    // assert(!inputs.GPUSCALE, 'rangeiget only for not GPUSCASLE');  // now allowed for peeking
    var npixels = 8;
    renderer.setRenderTarget(scaleRenderTarget[whichRange]);
    //var gl = renderer.context;
    //var now = Date.now();
    let pv = readWebGlFloat(scaleRenderTarget[whichRange], {mask:'x'});
    var rr = {};
    rr.lx = -pv[0];
    rr.hx = pv[1];
    rr.ly = -pv[2];
    rr.hy = pv[3];
    rr.lz = -pv[4];
    rr.hz = pv[5];
    rr.lw = -pv[6];
    rr.hw = pv[7];
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
function scaleSmoothGPU(whichRange, damp) {
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
    uniforms.scaleDampTarget[whichRange] = rt;      // record which the current correct target is
    uniforms.scaleDampTarget.value = rt.texture;      // record which the current correct target is
}

// prepare all the shaders and rendertargets for gpu scaling
function scaleGpuPrep() {
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
    var mat = new THREE.ShaderMaterial({
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
    scaleDampTarget1[undefined] = scaleDampTarget1[0];
    scaleDampTarget2[undefined] = scaleDampTarget2[0];
}

function range(genes) {
    return rangei(genes, "now");
}

/** do immediate gpu scale for genes, using and setting the 'whichRange' set, do NOT adjust rot4 */
function gpuScaleNow(genes, whichRange, damp) {
    genes.gscale = 1;
    genes._gcentre = new THREE.Vector4();
    if (whichRange === undefined) {
        var dispobj = xxxdispobj(genes);
        whichRange = ( (dispobj && dispobj.vn === mainvp) || renderObjs === renderVR) ? "main" : "now";
    }
    rangeiprep(genes, whichRange);
    scaleSmoothGPU(whichRange, damp);
}

/** get information needed to centre and scale and return in structure */
function getcentrescale(genes, phase) {
    // assert(!inputs.GPUSCALE, "getcentrescale should only be used with cpu scaling");
    if (appToUse !== "Horn") return undefined;  // eg, fano need better app structure

    // debugframedelta[framenum % debugframedeltasize] +=  phase === "get" ? 500000 : 100000;  // << used to check scale impact on fps
    genes = genes || currentGenes;
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
function centrescalenow(xxx, whichRange) {
    // msgfix('centrescalenow', framenum);
    return centrescale(xxx, whichRange, 1);
}

var defaultScale = 0.85;
/** centre and scale object, return values used if available in case helpful */
function centrescale(xxx = currentGenes, whichRange, damp) {
    if (searchValues.nohorn) return;
    var rr = establishObjpos(xxx, whichRange, damp);

    // and make rot4 behave (3d only)
    if (!inputs.using4d) {
        var r4 = currentGenes._rot4_ele;
        r4[3] = r4[7] = r4[11] = 0;
    }

    newframe();
    var dispobj = xxxdispobj(xxxgenes(xxx));
    if (dispobj && !dispobj.needsRender) dispobj.render();
    return rr;
}

// establish the object position and scale, but do not adjust user (rot4) position etc
function establishObjpos(xxx, whichRange, damp) {
//    if (inputs.using4d) return undefined;
//if (inputs.GPUSCALE) return;//<<<
    if (appToUse !== "Horn") return undefined;  // eg, fano need better app structure
    var genes;
    if (xxx) genes = xxxgenes(xxx);
    genes = genes || currentGenes;
    if (!genes.tranrule) return;
    genesToCam(genes);
    if (inputs.GPUSCALE) {
        gpuScaleNow(genes, whichRange, damp);
        return undefined;
    };

    // first set the object so it is centred and scaled before rot4
    var rr = getcentrescale(genes);
    if (!rr) return;
    genes.gscale = rr.gscale;
    if (!genes._gcentre) genes._gcentre = new THREE.Vector4();
    genes._gcentre.copy(rr);        // w irrelevant except in 4d mode
    dodamprate = {};  // prevent silly results, maybe just unset selected fields of dodamprate
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
    var mat = getMaterial(genes);
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


var pickRenderTarget;
var OUTSLOTS = 4;
var pickPixelValues = new Uint8Array(4 * OUTSLOTS);
var lastPick = "";

function setPickRenderTarget(doclear = true) {
    //var gl = renderer.context;
    if (!pickRenderTarget) {
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

        // prepare a bytes version for more efficient readWebGlFloat, all 4 channels at once
        pickRenderTarget.byteversion = WebGLRenderTarget(OUTSLOTS*4, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            stencilBuffer: false,
            type: THREE.UnsignedByteType,
            format: THREE.RGBAFormat
        }, 'pickRenderTarget byteversion' );
        pickRenderTarget.byteversion.texture.generateMipmaps = false;
    }
    if (doclear) {  // this clear only used at initialization
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
    if (!dispobj.genes) { msgfix("pickq", "pick not on pane", '?'); return; }
    if (x === undefined) { serious('required parameter x not given to pickGPU'); return; }
    // msgfix('>pickgpu', x, y);

    setPickRenderTarget(false);

    setObjUniforms(dispobj.genes, uniforms);
    if (slotoffmat > 0) {
        pickRenderTarget.scissorTest = true;
        pickRenderTarget.scissor.set(slotoff/4,0,2,1);
    } else {
        pickRenderTarget.scissorTest = false;
    }
    // if (camera !== render_camera) serious('unexpected camera mismatch');

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
    if (doclear) {
        renderer.setClearColor(pick.sillycol, 999);
        renderer.clearTarget(pickRenderTarget, true, true, true);
    }


    // make sure details correct for renderpass
    opmode = OPPICK;   // must be BEFORE getMaterial
    //var mat = getMaterial(dispobj.genes);

    // calling renderPass is adequate  for horn, but makes extra options complicated with matrix pick etc
    //renderPass(dispobj.genes, uniforms, pickRenderTarget);
    uniforms.pickxslot.value = slotoff;
    if (renderMainObject) renderObjPipe(scene, renderPass, dispobj.genes, uniforms, pickRenderTarget, 0, "pick");
//msgfix('>postcam', camera.matrix.elements);

    if (VH.matrix && VH.matrix.visible && slotoffmat >= 0) {
        if (!material.pick) material.pick = {}; // will get populated soon
        if (material.pick.matrix) material.pick.matrix.side = THREE.DoubleSide;
        let su = usemask;
        usemask = 'pick';
        uniforms.pickxslot.value = slotoffmat;
        VH.matrix.newRender(pickRenderTarget);
        usemask = su;
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
// should probably just be a callback function
function pick(dispobj, x,y, slotoff=0, slotoffmat=-1, doclear=true, callback) {
    if (badshader) return;
    if (!dispobj) dispobj = slots[mainvp].dispobj;
    pickGPU(dispobj, x, y, slotoff, slotoffmat, doclear);
    return showpick(dispobj, callback);
}

function setPick(slotoff=0, value) {
    //setup projection appropriately to render value to appropriate place in pickRenderTarget...
    //or 'just' set value in buffer with gl bufferSubData or similar?
}

/** show pick information, but only once per frame when possible multiple pick calls complete
 * or if a callback is specified then it will always run so that it can do what it has to do
 */
function showpick(dispobj, callback) {
    if (showpick.lastframe !== framenum || callback) {
        onpostframe(()=>realshowpick(callback));
        showpick.lastframe = framenum;
    }

    function realshowpick(callback1) {
        if (!dispobj || dispobj === 'nodispobj') dispobj = slots[mainvp].dispobj;
        if (!dispobj.genes) return;
        if (!pickRenderTarget) return;  // called before ready
        var ss = "";
        let picks = "";

        var segNames = getHornSet(dispobj.genes.tranrule).segnames;
        hornhighlight = '';
        var sss = [];
        let vv = pick.array = Array.from(readWebGlFloat(pickRenderTarget, {rtout: pickRenderTarget.byteversion, channels: 4}, 'pick'));
        let p = 16; // entries already filled in pick.array

        if (uniforms.userPicks) {
            for (let i = 0; i < uniforms.userPicks.value.length; i++) {
                vv[p++] = uniforms.userPicks.value[i];
            }
        }

        for (let i=0; i<segNames.length; i++) {
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

        let vvs = [];
        for (let i=0; i< vv.length; i++) {
            let v = vv[i];
            vvs.push(Math.abs(v - 999) < 0.01 ? '.' : format(v));
        }
        msgfix('xhit', vvs.join(' '));

        opmode = OPREGULAR;

        //tryseteleval('genefilter', picks + "_");
        //filter GuiGenes();
        hornhighlight = picks;
        if (CSynth && CSynth.showpick) CSynth.showpick(callback1);  // << test bridge to csynth
        return sss;
    }
}

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
                makeGenetransform(slots[i].dispobj.genes);
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

        const geom = planeg(1,1, numInstances-1, 3);
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
