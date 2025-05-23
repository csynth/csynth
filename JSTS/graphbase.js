"use strict";
var W = window;
var THREEA = THREE;
;
var WA = window;
var useCutdown = false;
var uniforms;
var canv2d;
var THREESingleChannelFormat; // different for webgl and webgl2
var ises300;
var copyXflip = 1; // -1 to flip x
var feedbackPrepFrames = 50;
var useoldbigfeedback = true;
var rca = {}; // renderer attributes
// defaults from https://www.khronos.org/registry/webgl/specs/latest/1.0/#WEBGLCONTEXTATTRIBUTES
rca.alpha = true; // NOT like THREE
rca.depth = true;
rca.stencil = false; // NOT like THREE
rca.antialias = true; // NOT like THREE
rca.premultipliedAlpha = true;
rca.preserveDrawingBuffer = false;
rca.powerPreference = "default";
rca.failIfMajorPerformanceCaveat = false;
// three defaults
//_alpha = parameters.alpha !== undefined ? parameters.alpha : false,
//_depth = parameters.depth !== undefined ? parameters.depth : true,
//_stencil = parameters.stencil !== undefined ? parameters.stencil : true,
//_antialias = parameters.antialias !== undefined ? parameters.antialias : false,
//_premultipliedAlpha = parameters.premultipliedAlpha !== undefined ? parameters.premultipliedAlpha : true,
//_preserveDrawingBuffer = parameters.preserveDrawingBuffer !== undefined ? parameters.preserveDrawingBuffer : false;
// our default overrides
rca.premultipliedAlpha = false;
rca.preserveDrawingBuffer = false; // as suggested at https://github.com/toji/chrome-webvr-issues/issues/156
rca.logarithmicDepthBuffer = false; // true does not apply to our custom shaders in any case, three specific
// in fact, enable it and three.js interferes even with raw shaders and breaks ours, sjpt, 1 May 2018
// despite preserveDrawingBuffer false being recommended, it stops correct display on the main monitor (Canary 65, Jan 2018)
// and setting to true does not seem to make performance worse at least for now ...
rca.preserveDrawingBuffer = true;
var slots;
// tryWebGL2 = false;  // true to try to use webGL2 if it is available.
var simplemode = false; // set to true for some machines
var shaderlog = false;
// note, gldebug during startup helps ensure all buffers etc ready before being used (did get incomplete buffer messages
var gldebug = false; // set to true to start with Gldebug.start(), or integer for n initial frames of debug, or function for debug action, or {frames: , action: }
var nightly = false; // set to true to test nighly
// let usevr = false;  // now modify renderObjs
// var usesavedglsl: string;  // set to use precomputed shaders
var renderMainObject = true; // set to false to stop render of main object
var graphbase = {};
// 27July2022, latest three does not support RGBFormat, remove THREEX &c that allowed it sometimes
// patch below as Edge would not run with Angle points
var isEdge = (navigator.userAgent.indexOf('Edge/') !== -1);
// if (isEdge) THREE.SKIPINSTANCES = true;
let newTHREE_DataTextureItems = {};
let newTHREE_DataTextureId = 0;
const newTHREETypeSize = {};
newTHREETypeSize[THREE.UnsignedByteType] = 1;
newTHREETypeSize[THREE.FloatType] = 4;
newTHREETypeSize[THREE.ShortType] = 2;
newTHREETypeSize[THREE.UnsignedShortType] = 2;
newTHREETypeSize[THREE.UnsignedIntType] = 4;
const newTHREEFormatSize = {};
newTHREEFormatSize[THREE.RGBAFormat] = 4;
newTHREEFormatSize[THREE.LuminanceFormat] = 1;
newTHREEFormatSize[THREE.RedFormat] = 1;
newTHREEFormatSize[THREE.RedIntegerFormat] = 1; //newTHREEFormatSize[THREE.RGBFormat] = 3;
newTHREEFormatSize[THREE.DepthFormat] = 1;
let newTHREE_DataTextureSize = 0;
function _registerTexture(dt, args, width, height, format, type) {
    if (newTHREE_DataTextureItems[dt.id])
        console.error('attempt to reregister texture', dt.id);
    const fms = newTHREEFormatSize[format];
    const tys = newTHREETypeSize[type];
    let size = width * height * tys * fms;
    if (isNaN(size)) {
        console.error('bad texture', width, height, TK(format), fms, TK(type), tys);
        size = 0;
    }
    dt.realDispose = dt.dispose;
    const name = dt.name || ('unnamed' + dt.id);
    newTHREE_DataTextureItems[dt.id] = { dt: new WeakSet([dt]), name, size, args, width, height, format, type, fms, tys };
    newTHREE_DataTextureSize += size;
    dt.dispose = _textureDispose;
    return dt;
}
/** dispose of a dataTexture, external function to avoid need to keep scope information from _registerTexture */
function _textureDispose() {
    const dt = this;
    const dti = newTHREE_DataTextureItems[dt.id];
    newTHREE_DataTextureSize -= dti.size;
    delete newTHREE_DataTextureItems[dt.id];
    dt.dispose = () => { }; // in case we try it twice!
    dt.realDispose();
}
// // wrapper for new THREE.DataTexture
// function newTHREE_DataTexture(...args) {
//     // const [data, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, encoding] = args;
//     //@ts-ignore
//     const dt = new THREE.DataTexture(...args);
//     dt.name = 'unnamed DataTexture';
//     return _registerTexture(dt, args, dt.image.width, dt.image.height, dt.format, dt.type);
// }
function newTHREE_DataTextureNamed(name, ...args) {
    // const [data, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, encoding] = args;
    // the line below was needed at some point without the FloatType test and was horrid
    // but by 9/10/2020 we seem to need the line with the FloatType test (even horrider)
    if (isWebGL2 && args[3] === THREE.LuminanceFormat && args[4] === THREE.FloatType)
        args[3] = THREE.RedFormat; // horrid but works (or at least helps)
    //@ts-ignore
    const dt = new THREE.DataTexture(...args);
    dt.name = name;
    return _registerTexture(dt, args, dt.image.width, dt.image.height, dt.format, dt.type);
}
// wrapper for new rendertarget, with added name option
function WebGLRenderTarget(widthp, heightp, options, name, killold = true) {
    const maxt = gl.getParameter(gl.MAX_TEXTURE_SIZE); // in case created renderTarget very early
    const max = Math.max(widthp, heightp);
    if (rendertargets[name]) {
        if (killold) {
            rendertargets[name].dispose();
        }
        else {
            console.error('attempt to remake texture', name);
        }
    }
    if (max > maxt) {
        const ox = widthp + 'x' + heightp;
        widthp = Math.floor(widthp * maxt / max);
        heightp = Math.floor(heightp * maxt / max);
        const nx = widthp + 'x' + heightp;
        console.error(msgfixerror('!res' + name, `resolution ${ox} too high, reduced to ${nx}`));
    }
    const rt = new THREE.WebGLRenderTarget(widthp, heightp, options);
    const rta = rt;
    rta.name = name; // THREEA
    rendertargets[name] = rt;
    rt.texture.name = name;
    _registerTexture(rt.texture, [widthp, heightp, options, name], widthp, heightp, rt.texture.format, rt.texture.type);
    rta.realDispose = rt.dispose;
    rt.dispose = _mydisposeRenderTarget;
    return rt;
}
function _mydisposeRenderTarget() {
    const rt = this;
    const name = rt.name;
    if (!rendertargets[name])
        console.error('attempt to dispose unregistered render target', name);
    delete rendertargets[name];
    rt.texture.dispose();
    rt.realDispose();
    rt.dispose = () => { }; // don't try to dispose twice
}
// let controls = window.getElementById("controls"); declaring/using implicit controls or window.controls confuses NetBeans
/*
* This file contains graphics related code
* for use in organic contexts.
    *
*  Handles use of three.js
*  n.b. indentation corrected with http://courses.cs.washington.edu/courses/cse341/10au/indent.html
*/
// OPMAKEGBUFF is used for 'standard' skelbuffer (removed), OPMAKEGBUFFX is used for stl generation (almost certainly dead)
// define these as let for NetBeans
var OPREGULAR, OPSHADOWS, OPPICK, OPMAKEGBUFFX, OPPOSITION, OPOPOS, OPOPOS2COL, OPSHAPEPOS, OPTSHAPEPOS2COL, OPTEXTURE, OPBUMPNORMAL, OPMAKESKELBUFF, OPEDGE, OPEDGE2;
// var oplist = ['regular', 'shadows', 'pick', 'makegbuffx', 'position', 'opos', 'opos2col', 'shapepos', 'tshapepos2col', 'texture', 'bumpnormal', 'makeskelbuff', 'edge', 'test'];
var oplist = 'regular shadows pick makegbuffx position opos opos2col shapepos tshapepos2col texture bumpnormal makeskelbuff edge edge2 test'.split(' ');
var OPDEFINE = "\n//^^^^^ OPDEFINE\n";
var OPDEFINE2 = "\n//^^^^^ OPDEFINE2\n";
(function () {
    for (let i = 0; i < oplist.length; i++) {
        let uname = "OP" + oplist[i].toUpperCase();
        W[uname] = i;
        OPDEFINE += '#define ' + uname + " " + i + "\n";
    }
    OPDEFINE += '#define virtual\n';
    OPDEFINE += '#define OUT\n';
    OPDEFINE += '#define INOUT\n';
    OPDEFINE2 += '$$$uniforms$$\n';
    OPDEFINE2 += '$$$varyings$$\n';
    OPDEFINE2 += '$$$header$$\n';
})();
var PROJ_STEM_DIR = 'projection_stems/';
var camera, scene, renderer, canvas;
var opmode = OPREGULAR;
var geometry;
var material = {}; // material holds cache of materials (key includes opcode), and assembled code (no opcodein key)
var width, height;
var maxInnerHeight = Infinity; // until proved otherwise
var stats;
var running = true;
var viewtarget = new THREE.Vector3();
var gl; // gl context, updated each frame in case
var threeClock = new THREE.Clock();
var renderRatio = 1;
var renderRatioMain = -999; // non 0 used to overwrite renderRatio for main vp, 'unset to trigger newRenderRatio() call
var renderRatioProj = 0; // non 0 used to overwrite renderRatio for main vp when using proj viewport
var extraDispobj;
var render_camera; //camera used for rendering, TODO XXX check use of camera/render_camera
var projectionWindow = false; // set to true for projection window
var lastSceneCode = 1;
var appToUse;
if (!appToUse)
    appToUse = "Horn";
// these will probably be overridden by the application, and really uniforms.lennumn.value is definitive
var lennum = 1, radnum = 1;
var resdelta = 0; // set temporarily for lower res, eg for shadows
var extradefines = ""; // used for test/debug, may be function for easier dynamic change
/** code to define a simple scene with n planes.
* This is used in simple cases, and with horns used many times per frame.
* More advanced horn usage generates its own multi-plane scene and ignores this one.
*     */
function sceneCode(n = lastSceneCode) {
    scene = newscene('sceneCode_' + lastSceneCode + '_');
    //geometry = new THREE.PlaneGeometry(1, -1, Math.min(65,lennum), Math.min(65*6,radnum));
    geometry = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < lastSceneCode; i++) {
        let mesh = new THREE.Mesh(geometry);
        mesh.frustumCulled = false;
        mesh.position.z = i;
        scene.addX(mesh);
    }
}
/** create a new identified scene */
var newscene = function (s) {
    let scenen = new THREE.Scene();
    scenen.matrixAutoUpdate = false;
    scenen.name = s + newscene.id++;
    scenen.frustumCulled = false;
    return scenen;
};
newscene.id = 0;
// /** tidy geometry when we know it won't change again */
// if (THREEA.Geometry)
// THREEA.Geometry.prototype.tidy = function () {
//     this.normals = [];
//     this.vertices = [];
//     this.faceVertexUvs = [];
//     this.faces = [];
//     this.faceUvs = [];
// };
// <editor-fold desc="process materials from tranrule">
/** process #include, return new string
 * Also adds #defines for tuse 0, gene() & genet() --- might be an idea to move those.
 */
function doInclude(s) {
    let cache = [];
    while (true) {
        let include = "#include ";
        let il = include.length;
        let i = s.search(/#include\s+[a-zA-Z]/); // do NOT find #include <xxx>, compatibility with three shader chunks
        if (i === -1)
            break;
        let pre = s.substring(0, i);
        let ei = s.indexOf(";", i + il);
        let fn = s.substring(i + il, ei).replace('"', "").replace('"', "");
        if (cache.indexOf(fn) === -1) {
            const data = fn === 'texture.fs' ? THREE.ShaderChunk.O_texture : getfiledata("shaders/" + fn);
            var inner = "// !!!!!!!!!!! include   " + fn + "\n" + data + "\n// END!!!!!!!!!!! include   " + fn + "\n";
            cache.push(fn); //
        }
        else {
            inner = "// +!+!+!+! " + fn + " ALREADY INCLUDED\n";
        }
        let posts = s.substring(ei + 1);
        s = pre + inner + posts;
    }
    //s = "#define gene(name, value, min, max, step, delta) uniform float name;\n" + s;
    s = "#define tuse 0\n" + s; // which slot of array texture uniform to use, would be hornid but broken
    // fix shader defined genes for performance test, does not appear to help, June 2016
    // July 2017 we have seen a dignificant improvement from fixshadergenes>  approx 0.55 load => 0.41 load
    if (parseUniformsK.fixshadergenes)
        // changeMat(undefined, true); parseUniformsK.fixhorngenes = false; parseUniformsK.fixshadergenes = false; getserveroao('gallery/York_perf.oao')
        s = "#define gene(name, value, min, max, step, delta, class, free)\n" + s;
    else
        s = "#define gene(name, value, min, max, step, delta, class, free) uniform float name;\n" + s;
    s = "#define genet(name, value, min, max, step, delta, class, free)\n" + s;
    s = s.replace(/\\\r\n/g, ''); // line continuation
    return s;
}
const parseUniformsK = {};
/**
 *
 * @param {string} shader
 * @param {object} myshadergenes
 * @param {array} texturedefines
 */
function parseUniforms(shader, myshadergenes, texturedefines, genes) {
    //                     name          val         min         max         delta      step               help
    //let rx = /gene\s*?\(\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?),\s*?(\S*?)\s*?\)\s*?\/\/\s*?(.*?)\n/g
    //                  parms          help
    let nn = 0, nt = 0, used = {};
    // shader = shader.replaceall('//gene', '// g e n e').replaceall('// gene', '// g e n e');  // hide commented out genes
    shader = shader.replace(/\/\/gene/g, '// g e n e').replace(/\/\/ gene/g, '// g e n e'); // hide commented out genes
    // parse for both gene() and genet()
    let pats = [/gene\s*\((.*?)\)\s*\/\/\s*(.*)/g, /genet\s*\((.*?)\)\s*\/\/\s*(.*)/g];
    pats.forEach(rx => {
        while (true) {
            let r = rx.exec(shader);
            if (r === null)
                break;
            // name, val, min, max, delta, step, class, free // help
            let pr = r[1].split(",");
            let i = 0;
            let name = pr[i++].trim().split('"').join('');
            if (used[name])
                continue;
            used[name] = true;
            let val = pr[i++].trim();
            let min = pr[i++].trim();
            let max = pr[i++].trim();
            let delta = pr[i++].trim();
            let step = pr[i++].trim();
            let tag = pr[i++].trim();
            if (tag === 'texture') {
                nt++;
                let id = COL.addname(name);
                let id4 = Math.floor(id / 4);
                let idf = 'rgba'[id % 4];
                // note stephen 20 March 2016
                // For some reason during the upgrade to THREE.js v74 the colour/hornid numbers got turned inside/out.
                // Not sure why ... the second version of this code allows for the change.
                //texturedefines.push('#define ' + name + ' (textureget(colbuff,vec2(( ' + id4 + '.5)/COLPARMS, (COLNUM - xhornid-0.5)/COLNUM )).' + idf +')');
                if (exportShaders.fixcols)
                    texturedefines.push('#define ' + name + ' ' + (+currentGenes[name]).toFixed(6));
                else
                    texturedefines.push('#define ' + name + ' (textureget(colbuff,vec2(( ' + id4 + '.5)/COLPARMS, (colourid+0.5)/COLNUM )).' + idf + ')');
            }
            else {
                if (parseUniformsK.fixshadergenes) // fix shader defined genes for performance test, does not appear to help, June 2016
                    texturedefines.push('const float ' + name + ' = ' + (+currentGenes[name]).toFixed(6) + ';');
                else
                    myshadergenes[name] = true;
            }
            let free = pr[i++].trim();
            let help = r[2];
            if (help.trim() === "/")
                help = undefined;
            //console.debug("shader uniform >> '" + name + "' help=" + help);
            addgeneperm(name, val, min, max, delta, step, help, tag, free, true, genes);
            nn++;
        }
        //log('genes found in parseUniforms pat', nn, nt, rx);
    });
    // generate grouped #defines, eg red1gree1blue1refl1
    let four = "";
    for (let i = 0; i < COL.PARMS; i++) {
        four += COL.names[i];
        if (i % 4 === 3) {
            let id4 = Math.floor(i / 4);
            texturedefines.push('#define ' + four + ' (textureget(colbuff,vec2(( ' + id4 + '.5)/COLPARMS, (colourid+0.5)/COLNUM )))');
            four = "";
        }
    }
    //log('genes found in parseUniforms', nn, nt);
}
/** add a uniform, or change its value if it already exists
* nb don't just create a new one, can confuse three.js uniform cache */
function adduniform(name, def, type = 'f', tag = 'untagged', overwrite = true) {
    const un = uniforms[name];
    if (un && (overwrite || !('value' in un)))
        un.value = def;
    else
        uniforms[name] = { type: type, value: def, tag, framenum };
}
/** add a tagged uniform */
function addtaggeduniform(tag, name, def, type, overwrite = true) {
    adduniform(name, def, type, tag, overwrite);
}
//horngenedefs = {};  // genedefs generated by horn
/** add a uniform and record as 'local' ... ??? obsolete */
var adduniformX = function (name, def, type, tag) {
    type = type || "f";
    adduniform(name, def, type, tag);
};
//const bxs:Xstring = "" as Xstring;
/** code to translate tranrule as stored into transform code: direct by default */
var baseTrancodeForTranrule = function (tranrule, genes) {
    return {
        tranrule: tranrule, pretranrule: "", posttranrule: "", overrides: "",
        trankey: tranrule, varyings: "", setupcode: "", pickoutput: "", extraIncludes: "",
        segnames: [],
        singlePassCode: "", chooseHornCode: "",
        getgenenames: () => { return {}; }
    };
};
var trancodeForTranrule = baseTrancodeForTranrule;
/** force three to do its shader update */
var updateShadersThree = function () {
    for (let op in material) {
        let mop = material[op];
        if (typeof mop === 'object') {
            for (let m in mop) {
                if (mop[m] && mop[m].fragmentShader)
                    mop[m].needsUpdate = true;
            }
        }
    }
    log('recompileShaders, shaders marked for update', framenum);
};
/** base shader has changed so all are invalid, clear material{} cache and they will be regenerated as necessary */
var baseShaderChanged = function (force = false) {
    if (!gl) { /* onframe(baseShaderChanged); */
        return;
    }
    // We had excessive calls to baseShaderChanged during initialization which was slowing things down.
    // Make sure we get one real one, but not too many.
    // baseShaderChanged.lastskipframe = 5 for nonvr csynth
    baseShaderChanged.lastframe = framenum;
    if (framenum < 7 && baseShaderChanged.done && !force) {
        baseShaderChanged.lastskipframe = framenum;
        baseShaderChanged.skipped++;
        return;
    }
    for (let op in material) {
        let mop = material[op];
        if (typeof mop === 'object') {
            for (let m in mop) {
                if (mop[m] && mop[m].fragmentShader)
                    mop[m].dispose(); // clean up old materials
            }
        }
    }
    badshader = false; // we hope so: we'll find out later
    material = {};
    saveInputToLocal();
    refall();
    // probably fixed by making sure uniforms reset from genes after new materials generated
    // if all ok, remove this after July 2017
    //    setTimeout(refall, 0);  // todo, find out why this needed ~ and still not enough!
    //    setTimeout(refall, 50);  // todo, find out why this needed
    nextscale = 0; // ensure the scaling gets redone
    establishObjpos(); // in case gpuscale/cpuscale has changed, mainly gpr/cpu scale swap
    baseShaderChanged.done = true;
};
baseShaderChanged.skipped = 0;
var notrvariant = { setupcode: "", trancode: "", pretranrule: "", posttranrule: "", overrides: '', uniforms: "", varyings: "", extraIncludes: "", trankey: "NOTR" };
var debugLastMat;
var shaderdefs = {}; // generated from input fields
function shaderdef(k, b) { shaderdefs[k] = b; }
var precision = 'highp';
/** set the main material : todo neaten up issues when using file: and no shaders yet available */
function getMaterial(matvariant, genes, quickout) {
    var _a, _b;
    let opname = oplist[opmode];
    // if (matvariant.tranrule) {  // matvariant is (probably?) genes
    //     matvariant = genes.tranrule;
    // }
    let matopmode = material[opname];
    if (!matopmode)
        matopmode = material[opname] = {};
    // get precomputed materials for quicker startup, requires savedMaterials.usesaved = true
    // not currently working; probably side-effects such as uniform generation still needed (pending 19 Jan 19)
    if (WA.savedMaterials && savedMaterials.usesaved && savedMaterials[opname] && savedMaterials[opname][matvariant]) {
        const mm = savedMaterials[opname][matvariant];
        if (mm.material)
            return mm.material;
        const mat = mm.material = new THREE.RawShaderMaterial({
            uniforms: uniforms,
            vertexShader: mm.vertexShader,
            fragmentShader: mm.fragmentShader,
            side: THREE.FrontSide
        });
        matopmode[matvariant] = mat;
        return mat;
    }
    const origmatvariant = matvariant;
    // Decide if shader needs its own matvariant specific code. Only applies if we have skeleton and some other details
    if (inputs.USESKELBUFFER && /** !inputs.SINGLEMULTI && */ matvariant !== "NOTR" && matvariant.indexOf('overrides') === -1) {
        // Even if that is satisfied, it only applies for appropriate NORMTYPES.
        // These NORMTYPES do not refer back to delta position to derived normal
        // BUT sjpt 26 Mar 2021
        // we can't optimize till we have generic handling of cumcount and ribs, getting colours and ribs wrong
        const needsRecompile = [1, 5, 6].includes(genes.NORMTYPE) ?
            [OPMAKESKELBUFF, OPOPOS, OPPOSITION, /**/ OPSHAPEPOS, OPPICK] :
            [OPMAKESKELBUFF, OPOPOS, OPSHAPEPOS, OPPOSITION, OPPICK];
        if (!needsRecompile.includes(opmode))
            matvariant = 'horn("main");'; // yes, safe to share code for this opmode between different matvariants (tranrules)
    }
    // Now see if we have a suitable saved version
    const matkey = matvariant.split('SynthBus')[0];
    try {
        // check for exact match in material cache ... todo add hash to matvariants so this is simpler and more reliable
        let mat = matopmode[matkey];
        if (mat) {
            //!!NOW AUTOMATED if (framenum < 3 && mat.framenum !== framenum) {  // framenum test in case initial setup calls things in wrong order and uniforms not ready in time
            //     mat.needsUpdate = true;
            // }
            mat.framenum = framenum;
            return mat;
        }
        log('>>> creating material', opname, origmatvariant.substring(0, 20).split('\n').join('    '));
        if (fileExists(`shaders/${opname}.vs`) && fileExists(`shaders/${opname}.fs`)) { // load from files if they are present
            return shaderFromFiles(opname, genes);
        }
        // todo check 'true' below. removed sjpt 19 Jan 19, added 20 June 2022 for multiple tranrules at once
        if (true || !material.shadergenes) { // first time in after reset, establish common shader code; BEFORE horn compiles colours
            if (shaderlog)
                log("assembling common material");
            let defines = htmlDefines();
            material.defines = defines;
            material.shadergenes = {};
            let texturedefines = [];
            // extract the main vertex shader and matvariant, and merge them appropriately
            var vertcode = getfiledata("shaders/" + vertfid);
            vertcode = "// !!!!!!! VERT " + vertfid + "\n" + doInclude(vertcode);
            parseUniforms(vertcode, material.shadergenes, texturedefines, genes);
            material.basevertcode =
                //"#def ine VERTEX 1\n#define textureget(s,p) texture2DLod(s,p,0.)\n"
                "#define textureget(s,p) texture2D(s,p)\n"
                    + OPDEFINE2 + vertcode;
            texturedefines = [];
            var fragcode = getfiledata("shaders/" + fragfid);
            fragcode = "// !!!!!!! FRAG " + fragfid + "\n" + doInclude(fragcode);
            parseUniforms(fragcode, material.shadergenes, texturedefines, genes);
            material.basefragcode =
                //"#def ine VERTEX 0\n#define textureget(s,p) texture2D(s,p,-16.)\n"
                "#define textureget(s,p) texture2D(s,p)\n"
                    + OPDEFINE2
                    + fragcode;
            if (shaderlog)
                log("common material assembled");
            material.defines += "\n\n//<< automatically generated macros to access genes defined in shader genet() (red1 etc) based on (global) xhornid\n";
            material.defines += texturedefines.join('\n') + '\n\n';
            // here so shared between horns, fano, etc
            material.defines += "\n//<< NONU set from NONUNIFORMS to either include or not include associated code (x)\n";
            material.defines += inputs.NONUNIFORM ? '#define NONU(x) x\n' : '#define NONU(x)\n';
        }
        let codevariant = matvariant === "NOTR" ? notrvariant : trancodeForTranrule(matvariant, genes);
        if (codevariant === undefined) {
            console.error("No codevariant in getMaterial");
            badshader = "No codevariant in getMaterial";
            return undefined;
        }
        const fulltrankey = codevariant.trankey + codevariant.overrides;
        // check for trankey match in material cache (eg same structure, different constants
        mat = matopmode[fulltrankey];
        if (mat) {
            matopmode[matkey] = mat; // so it is got at earlier test next time round
            //!!NOW AUTOMATED if (framenum < 3) mat.needsUpdate = true;   // in case initial setup calls things in wrong order and uniforms not ready in time
            return mat;
        }
        newframe();
        // make sure uniforms reestablished in case upset by processing the material definition
        setGenesAndUniforms(); // no-op for horn */
        setObjUniforms(genes, uniforms); // for horns
        if (!material.matcodes)
            material.matcodes = {};
        let matcodes = material.matcodes[fulltrankey];
        if (!matcodes) { // first time in for this trankey
            // these vary more often so must be taken out of prework above
            let sdefines = "\n//^^^^^sdefines\n";
            for (let i in shaderdefs)
                sdefines += "#define " + i + " " + shaderdefs[i] + "\n";
            vertcode = sdefines + material.basevertcode;
            let vals = { singlePassCode: "", chooseHornCode: "", shadowType: shadowType };
            if (inputs.SINGLEMULTI && matvariant !== 'NOTR' && codevariant.singlePassCode) {
                vals.singlePassCode = codevariant.singlePassCode;
            }
            if (inputs.SINGLEMULTI && codevariant.chooseHornCode) {
                vals.chooseHornCode = codevariant.chooseHornCode;
            }
            else {
                vals.chooseHornCode = "";
            }
            let undef = {};
            // OPDEFINE2 = substituteShadercode(OPDEFINE2, vals, codevariant, 'vertex', undef);
            vertcode = substituteShadercode(vertcode, vals, codevariant, 'vertex', undef);
            // TODO separate uniforms and colour/texture part of parseUniforms
            parseUniforms(vertcode, material.shadergenes, [], genes);
            fragcode = sdefines + material.basefragcode;
            fragcode = substituteShadercode(fragcode, vals, codevariant, 'fragment', undef);
            parseUniforms(fragcode, material.shadergenes, [], genes);
            let genenames = {};
            if (codevariant.getgenenames)
                copyFrom(genenames, codevariant.getgenenames());
            copyFrom(genenames, material.shadergenes);
            matcodes = material.matcodes[fulltrankey] = { vertcode: vertcode, fragcode: fragcode, genenames: genenames };
            if (shaderlog)
                log("material basic vertcode/fragcode assembled");
        }
        /**
        // special test code for timings
        let test = document.getElementById('test').value.trim();
        if (test !== "") {
        fragcode = fragcode.replace("void main", "void xmain");
        test = "void main() { vec4 col = vec4(objpos, 1.); " + test + "gl_FragColor = col/2.; gl_FragColor.w = 1.; }";
        fragcode += test;
        }
        **/
        if (quickout)
            return undefined; // for first gene establish call
        //if (typeof opmode !== "number")
        //    opmode = -1;
        let xopmode = typeof opmode === "number" ? opmode : -1;
        const extradefinesx = typeof extradefines === 'function' ? extradefines() : extradefines;
        let oppre = '\n//^^^^^ oppre\n' // initial \n needed for three.js bug ?
            + OPDEFINE
            + "precision " + precision + " sampler2D;\n"
            + "precision " + precision + " float;\n"
            + "\n#define OPMODE " + xopmode + " // ubershader variant for " + oplist[xopmode]
            + "\n#define MAXH 16\n"
            + "\n#define COLNUM " + ffloat(COL.NUM) + "      //<< used to define how many different coloured objects there are, depends on the horndef.\n"
            + "\n#define COLPARMS " + ffloat(COL.PARMS / 4) + "  //<< used to give range of how many different genet definitiona are allowed (4 definitions for each entry as it is a vec4)\n"
            + material.defines + extradefinesx + "\n"
            + (normloop ? "\n#define NORMLOOP " + ffloat(normloop) + "\n" : "\n");
        let vertpre = "//^^^^^ vertpre\n", fragpre = "//^^^^^ fragpre\n";
        if (!matvariant || matvariant === "NOTR") { // for walls etc
            oppre += "#define NOTR\n";
        }
        else if (matvariant === 'horn("main");') {
            oppre += '#define COMMON\n';
        }
        if (isWebGL2) { // values below don't seem to make any difference
            // vertpre += "#extension EXT_color_buffer_float : enable\n";
            // fragpre += "#extension EXT_color_buffer_float : enable\n";
            //            vertpre += "#extension OES_texture_float : enable\n";
            //            fragpre += "#extension OES_texture_float : enable\n";
            // vertpre += "#extension WEBGL_color_buffer_float : enable\n";
            // fragpre += "#extension WEBGL_color_buffer_float : enable\n";
            // fragpre += "#extension silly : enable\n";
        }
        vertpre += "precision " + precision + " float;\n";
        fragpre += "precision " + precision + " float;\n";
        fragpre += "#define VERTEX 0\n";
        let glver;
        [vertpre, fragpre, oppre, glver] = testes300(vertpre, fragpre, oppre);
        // if (inputs.GPUGRIDN)  // only one of the below is used at any one time, but no harm to generate both
        // easier with experiments as skelbuffer etc can or cannot use positioni
        vertpre += "attribute float positioni;\n";
        //else
        vertpre += "attribute vec2 position2;\n";
        vertpre += "attribute vec3 position;\n";
        vertpre += "attribute vec3 normal;\n";
        vertpre += "#define VERTEX 1\n";
        oppre += "uniform vec3 awayvec;\n";
        oppre += "uniform vec3 cameraPositionC;\n";
        oppre += "uniform vec4 _camd;\n";
        oppre += "uniform vec3 clearposA0;\n";
        oppre += "uniform vec3 clearposA1;\n";
        oppre += "uniform vec3 clearposB0;\n";
        oppre += "uniform vec3 clearposB1;\n";
        oppre += "uniform vec3 cameraPosition;\n";
        oppre += "uniform mat4 gpRmat;\n";
        oppre += "uniform mat4 gpLmat;\n";
        oppre += "uniform mat4 viewMatrix;\n uniform mat4 modelMatrix;\n";
        oppre += "precision " + precision + " float; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; \n";
        oppre += "#define JAVASCRIPT(x)   \n"; // permit embedded javascript in shaders
        let vertpost = "\n//^^^^^ vertpost\n";
        //if (inputs.SINGLEMULTI && currentHset && matvariant !== 'NOTR' && opmode === OPPOSITION)
        //    vertpost = '\n void test test() { \n' + currentHset.singlePassCode + '\n}';               // debug if singlePassCode will even compile
        //log("compile material", oplist[xopmode], matvariant.substring(0, 20));
        //let save = material;
        let vertexShader = vertpre + oppre + '\n//^^^^^matcodes.vertcode\n' + matcodes.vertcode + vertpost;
        let fragmentShader = fragpre + oppre + matcodes.fragcode;
        // used prepared shaders for given key, if avalable use an 'opt' shader
        // common usage is usesavedglsl='_XX.opt'; remakeShaders()
        // or in url  &usesavedglsl=_XX.opt
        let usesavedglsl = searchValues.usesavedglsl;
        let opt = searchValues.opt;
        // if (navigator.platform.toLowerCase().indexOf('linux') !== -1 && !usesavedglsl) opt = true;
        if (opt && !usesavedglsl)
            usesavedglsl = ises300 ? 'OPTIMIZE.opt' : 'OPTIMIZENOT300.opt';
        if (usesavedglsl && opname) {
            let kname = '';
            if (matvariant === 'NOTR')
                kname = 'NOTR';
            if (matvariant === 'horn("main");')
                kname = ''; // 'COMMON';
            if (matvariant === 'matrix')
                kname = 'MATRIX';
            let pre;
            if (usesavedglsl.endsWith('opt'))
                pre = 'exportShader/' + usesavedglsl.pre('.opt') + '/' + opname + kname + '.opt';
            else
                pre = 'exportShader/' + usesavedglsl + '/' + opname + kname;
            let vv, vvuse;
            const wrong = 'while (true) {'; // the optimizer generates invalid code, patch it here
            const correct = 'for (int zzz=0; zzz<1000000; zzz++) { /* WAS while (true) {*/';
            const unique = frametime < 10000 ? '' : '?' + Date.now(); // loading use preread, dynamic use as dynamic
            if (!vv) {
                vv = getfiledata(pre + '.vs' + unique);
                vvuse = pre + '.vs?';
            }
            if (vv)
                vertexShader = vv.split(wrong).join(correct).replace('#version 300 es\n', '');
            else
                vvuse = 'standard';
            let ff, ffuse;
            if (!ff) {
                ff = getfiledata(pre + '.fs' + unique);
                ffuse = pre + '.fs?';
            }
            if (ff)
                fragmentShader = ff.split(wrong).join(correct).replace('#version 300 es\n', '');
            else
                ffuse = 'standard';
            msgfixlog('usesavedglsl', `${usesavedglsl} opname=${opname} kname=${kname} ffuse=${ffuse} vvuse=${vvuse}`);
        }
        if (WA.specialShader) { // override complete shader, or just vertex or fragment
            const [vs, fs] = WA.specialShader(opname);
            vertexShader = vs !== null && vs !== void 0 ? vs : vertexShader;
            fragmentShader = fs !== null && fs !== void 0 ? fs : fragmentShader;
        }
        try {
            // define the material using the matvariant, patch (once only) if requested
            mat = new THREE.RawShaderMaterial({
                uniforms: uniforms,
                vertexShader: (_a = WA.patchvertex) !== null && _a !== void 0 ? _a : vertexShader,
                fragmentShader: (_b = WA.patchfragment) !== null && _b !== void 0 ? _b : fragmentShader,
                side: THREE.FrontSide
            });
            if (glver)
                mat.glslVersion = glver;
            WA.patchvertex = WA.patchfragment = undefined;
            mat.genes = clone(matcodes.genenames);
            mat.opmode = oplist[opmode];
            // renderer.initMaterial(mat,[]);  // might help debug ???
            let dt = Date.now() - loadStartTime;
            if (shaderlog)
                console.log(oplist[xopmode] + " shader assembled at " + dt);
            // msgfix('shader', oplist[opmode] + " shader assembled at " + dt);
            if (xopmode === OPMAKESKELBUFF) {
                mat.depthTest = mat.depthWrite = false;
                debugLastMat = mat;
            }
            // trying to catch odd performance behavious here
            // a high score for elapsed time often shown in log between immed1 and immed2
            //consoleTime('end windup material created testmat');
            //consoleTimeEnd('end windup material created testmat', 'immed1');
            //consoleTimeEnd('end windup material created testmat', 'immed2');
            //consoleTimeEnd('end windup material created testmat', 'immed3');
            log('>>> material created', opname, origmatvariant.substring(0, 20).split('\n').join('    '));
            //consoleTimeEnd('end windup material created testmat', 'log');
        }
        catch (e) {
            msgfix('shader', "Shader error (old shader used): " + e);
        }
        //consoleTimeEnd('end windup material created testmat', 'leave on error');
        //if (!current Genes.tranrule)
        //current Genes.tranrule = matvariant;
        //target.tranrule = matvariant;
        matopmode[matkey] = mat;
        matopmode[fulltrankey] = mat;
        let name = typeof matvariant === 'string' ? matvariant.substring(0, 40).replace(/\n/g, ' ') : appToUse;
        mat.name = (oplist[opmode] || opmode) + ' ' + name;
        //console.log("setmat " + matvariant.substring(0,30) + oplist[opmode] + ">>>" + trankey.substring(0,30));
        //log("setmat", mat.name);
        if (framenum > 50)
            filterGuiGenes(); // not during startup
        badshader = false; // we hope so: we'll find out later
        newframe();
        // adding a test here validates the material for errors as soon as possible
        // and also helps account for where time is going
        //consoleTime('material created testmat');
        //testmaterial.test(mat, undefined, genes);
        //consoleTimeEnd('material created testmat');
        return mat;
    }
    catch (e) {
        msgfix("Cannot load shader", e);
        badshader = "Cannot load shader: " + e;
        throw (e);
        // return undefined;
    }
}
function testes300(vertpre, fragpre, oppre) {
    let glver;
    if (ises300) {
        //    vertpre += "#extension GL_EXT_gpu_shader4 : enable\n";
        vertpre += "#define ISES300 1\n";
        vertpre += "#define attribute in\n";
        vertpre += "#define varying out\n";
        //    fragpre += "#extension GL_EXT_gpu_shader4 : enable\n";
        fragpre += "#define ISES300 1\n";
        fragpre += "#define attribute in\n";
        fragpre += "#define varying in\n";
        fragpre += "#define gl_FragColor glFragColor\n";
        fragpre += "out vec4 glFragColor;\n";
        oppre = "#define texture2D texture\n" + oppre;
        oppre = "#define textureCube texture\n" + oppre;
        glver = THREE.GLSL3;
    }
    return [vertpre, fragpre, oppre, glver];
}
function htmlDefines() {
    let defs = document.getElementsByClassName("def");
    let defines = "\n\n//<< various settings automatically generated from threek.html, inputs shown in gui with class objsave\n";
    defines += [].map.call(defs, (def) => {
        return inputs[def.id] === false ? "" : `#define ${def.id} ${inputs[def.id]}\n`;
    }).join("");
    return defines;
}
/** make sure n looks like a float to glsl */
function ffloat(n) {
    n = n + '';
    if (n.indexOf('.') !== -1)
        return n;
    if (n.indexOf('e') !== -1)
        return n;
    if (n.indexOf('E') !== -1)
        return n;
    return n + '.0';
}
// </editor-fold>
var shadowType = 4, lastst = 2;
trysetele("shad" + shadowType / 2, "checked", true);
/** set shadow type */
function setShad(st = lastst) {
    shadowType = st > 0 ? st * 2 : st; // because value is not total count, not count each side of centre
    trysetele("shad" + st, "checked", true);
    lastst = st;
    // baseShaderChanged();
    if (usemask == 2)
        refts(); // only force the ones involving shadows,  could optimize for other cases as well
    else
        baseShaderChanged();
}
// basically, we want to always keep the object in view
// so, every x ms, we pull the camera back towards the original pos
// currently polling it at 30hz
var camTarget = -99999; // the original camera location
var keepInViewDuration = 100; // in frames, integer
var keepInViewFactor = 1.0 / keepInViewDuration;
var keepInViewBuffer = 400;
var keepInViewTime = 15000; // keep in view will kick in x seonds after the last interaction time
/** keep current object in view by adjusting camz.
* only used in proj version
*  ??? should use scale() and fixpositionrot4(), or even variant of framescale() ???
* @type String
*/
function asyncKeepInView() {
    let t = (new Date()).getTime() - interacttime;
    //console.log( t );
    // give it 20 seconds since the last interact time
    if (camTarget > -99999 && t > keepInViewTime) {
        //let absDif = Math.abs(camTarget - genes._camz );
        // diference between the original and what we have now divided by duration
        let deltaz = +currentGenes._camz * (1.0 - keepInViewFactor) + (camTarget + keepInViewBuffer) * keepInViewFactor; //(( ( camTarget + buffer ) - genes._camz) + EPSILON) / keepInViewDuration;    // epsilon to avoid 0 / x
        currentGenes._camz = deltaz;
    }
    setTimeout(asyncKeepInView, 32);
}
/* check if the user has interacted in the last x seconds
and randomly picks another shape if not */
var startobj = 'startup';
var startscript;
var maxTextureSize;
//For reusing rendering in projector and main vp
var projRT, projQuadScene, projOrthoCamera;
/** init1 sets up window sizes, callbacks, etc */
function init1() {
    if (exhibitionMode) {
        graphbase.interval = setInterval(() => {
            if (!exhibitionMode) {
                clearInterval(graphbase.interval); // unset bring to front for debug
                $('*').css({ cursor: '' }); // unset cursor off
            }
            else {
                EX.toFront();
            }
        }, 5000);
        $('*').css({ cursor: 'none' }); // start with cursor off for exhibition
        // fullscreen();       // probably done by launch
        setExtraKey('K,/', 'stop push to front', () => clearInterval(graphbase.interval));
        WA.attribbox.style.display = localStorage.attribbox || 'none';
        setExtraKey('K,L', 'change attrib visibility', () => {
            localStorage.attribbox = WA.attribbox.style.display = WA.attribbox.style.display === 'none' ? 'block' : 'none';
        });
    }
    Maestro.on('IPCstarted', () => {
        userlog(`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
        userlog(location.href);
        const rcopy = {};
        for (let g in navigator)
            rcopy[g] = navigator[g];
        userlog(JSON.stringify(rcopy, undefined, '\t'));
        userlog('~~~');
    }, {}, true);
    function clog(...a) { log(...a); }
    clog('start init');
    if (searchValues.gldebug)
        gldebug = searchValues.gldebug;
    if (useCutdown || ipad)
        simplemode = true; // legacy use of useCutdown, no merged with simplemode
    tuningGenes();
    clog('genes tuned');
    if (!startvr) {
        V.skip = true;
        vrresting.bypassResting = true;
    }
    //TODO: KILL IT IN THE FACE ::: lots of bits hacked in here during exhibition setup, would be nice to rationalise
    /* preventing this corruption for Edinburgh
    // arrange high res projector and letterbox for Dundee
    if (hostname.startsWith("msccge")) {
        let ar = 4/3;
    let s2height = 1200;
    let s2uwidth = Math.round(ar * s2height);
        screens[1] = {width: 1920, height: s2height, usewidth: s2uwidth};  // << TODO recompute width
    } */
    //Edinburgh machines: "msccge-pc-a" "msccge-pc-b" "msccge-pc-c"
    if (hostname.startsWith("msccge-pc-a")) {
        let ar = 12.5 / 9;
        let s2height = 1080;
        let s2uwidth = Math.round(ar * s2height);
        screens[1] = { width: 1920, height: s2height, usewidth: s2uwidth }; // << TODO recompute width
    }
    if (hostname.startsWith("msccge-pc-b")) {
        let ar = 12.85 / 9;
        let s2height = 1080;
        let s2uwidth = Math.round(ar * s2height);
        screens[1] = { width: 1920, height: s2height, usewidth: s2uwidth }; // << TODO recompute width
    }
    if (hostname.startsWith("msccge-pc-c")) {
        let ar = 16 / 9;
        let s2height = 1080;
        let s2uwidth = Math.round(ar * s2height);
        screens[1] = { width: 1920, height: s2height, usewidth: s2uwidth }; // << TODO recompute width
    }
    //switching these machines around to use three outputs on projection machine with new gfx cards
    if (hostname === "DOCW3211") {
        let k = 0.65;
        screens[0].width = 1280; // *= k;
        screens[0].height = 720; // *= k;
    }
    else if (hostname.startsWith("DOCW") && hostname !== "DOCW3211") { // 3211 is William's 860M laptop
        //let ar = 16/9; // bit crazy to keep this logic just for using full resolution, but...
        let ar = 250 / 244; //should be right for filling two mirror panels.
        let s2height = 1080;
        let s2uwidth = Math.round(ar * s2height);
        screens[1] = { width: 1920, height: s2height, usewidth: s2uwidth, left: 0 }; // << TODO recompute width
    }
    // if (hostname === "toddlap" ) screens[1] = {width: 1680, height: 1050};
    if (hostname.startsWith("Fractal"))
        screens[1] = { width: 1920, height: 1080, usewidth: 1920 };
    if (hostname === "DOCW1135") {
        screens[1] = { width: 1920, height: 1080 };
        trysetele(W.revscreen, "checked", true);
    }
    //if (hostname.startsWith("William")) FractEVO.exhibitionStart();
    myinit();
    clog('myinit done');
    clog('THREE.REVISION AS SPECIFIED: ' + THREE.REVISION);
    THREE.REVISION = THREE.REVISION.substring(0, 3);
    clog('THREE.REVISION AS USED: ' + THREE.REVISION);
    try {
        renderer = new (searchValues.forcewebgl1 ? THREE.WebGL1Renderer : THREE.WebGLRenderer)(rca);
        canvas = renderer.domElement;
        gl = renderer.getContext();
        isWebGL2 = renderer.capabilities.isWebGL2;
        ises300 = isWebGL2 && !searchValues.noes300;
        canvas.id = 'canvas';
        THREEA.NoFloatBlending = !isWebGL2 && !gl.getExtension('EXT_float_blend');
        if (THREEA.NoFloatBlending)
            msgfixerror('EXT_float_blend', 'extension not available: some graphics will be corrupted');
    }
    catch (e) {
        serious('exception getting renderer', e);
        console.error(e);
    }
    if (renderer === undefined) {
        // serious above can get overridden, to consider
        document.body.innerHTML = `<b style="font-size:300%">Cannot create WebGL renderer,
        <br>try refresh (F5) or forced refresh (ctrl-F5)
        <br>or restarting browser</b>`;
        return;
    }
    // renderer.debug.checkShaderErrors = false;  // to consider for performance tune, faster load
    // 28/11/2020 next line related to https://github.com/mrdoob/three.js/issues/20715 ... may become unnecessary in future
    // also no type info for makeXRCompatible
    // now corrected by three.js, 4 March 21
    // (renderer.getContext() as any).makeXRCompatible().then(x =>
    //     log('XR compatibility set', x)
    // );
    if (THREEA.VertexColors === undefined)
        THREEA.VertexColors = true; // for three 142 and later
    THREESingleChannelFormat = (isWebGL2) ? THREE.RedFormat : THREE.LuminanceFormat;
    // if (+THREE.REVISION <= 151) {
    //     renderer.outputEncoding = THREE.sRGBEncoding;   // not used by Organic render, but used by camscene/nocamscene etc
    // } else {
    // this gives backwards compatible lighting etc for 157 etc with 150 and before
    // we may tine lights later to take advantage of the later three.js features, but as of 10 Sept 2023 just play it safe with old tuned values
    renderer.useLegacyLights = true;
    // below seems sensible,
    //   BUT seems to make no difference either way to horn or semi-standard (eg extrapdb molecules for ima etc)
    //   AND the datagui menu behaves properly with this left to default SRGBColorSpace
    //       datgui menu much too dark if LinearSRGBColorSpace used
    //       ... it would be good if ColourSpace could be set as a material property ???
    // (renderer as any).outputColorSpace  = (THREE as any).LinearSRGBColorSpace; // final copy applies gamma
    // }
    // three.js default (at 106) is 'local-floor', which should be supported but is not on Chrome 79.0.3942.0 and 81.0.4006.0
    if (renderer.xr.setReferenceSpaceType)
        renderer.xr.setReferenceSpaceType('local'); // ('bounded-floor');
    // not local-floor, for three rev 106: ??? for XR
    //  bounded-floor, local-floor, unbounded, viewer seems valid from Canary 27/07/2019
    //  NObounded-floor, NOlocal-floor, NOunbounded, viewer, local seems valid from Canary 81.0.4006.0
    // https://www.w3.org/TR/webxr/#enumdef-xrreferencespacetype
    // 22/10/2019, OK local,viewer   NOK bounded-floor, local-floor, unbounded
    codeDetails();
    const ur = gpuinfo.parms['Unmasked Renderer'];
    if (ur.startsWith('Adreno') || ur.startsWith('Mali'))
        onframe(() => WA.simpleTest(), 20);
    searchValues.useshadows = !!searchValues.useshadows;
    if (searchValues.useshadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    }
    // add back for convenience, this has been deprecated in three.js for some reason
    renderer.clearTarget = function (renderTarget, color, depth, stencil) {
        // console.warn( 'THREE.WebGLRenderer: .clearTarget() has been deprecated. Use .setRenderTarget(null) and .clear() instead.' );
        if (renderTarget === undefined) {
            console.warn('undefined renderTarget in clearTarget');
            return;
        }
        this.setRenderTarget(renderTarget);
        this.clear(color, depth, stencil);
    };
    if (!isFirefox) {
        VRSCinit(); // as soon as possible after renderer defined check VR devices and start audio
        clog('tad+ VRSCinit done as soon as possible');
    }
    else {
        // for some reason, Firefox loses connection if there is heavy work after getting the device
        // so wait till things fairly normal
        onframe(VRSCinit, 50);
    }
    if (!isWebGL2 && !renderer.extensions.get('OES_texture_float') && !searchValues.nohorn) {
        W.startscreen.style.display = "none";
        canvas.style.display = "none";
        document.body.innerHTML = "<h1>Float textures not supported.  Will not support Organic.</h1>";
        serious("Float textures not supported.  Will not support Organic.\nIgnore future errors and give up.");
        renderer = null;
        return;
    }
    if (isWebGL2 && !renderer.extensions.get('EXT_color_buffer_float') && !searchValues.nohorn) {
        W.startscreen.style.display = "none";
        canvas.style.display = "none";
        document.body.innerHTML = "<h1>Float textures not supported.  Will not support Organic.</h1>";
        serious("Float textures not supported.  Will not support Organic.\nIgnore future errors and give up.");
        renderer = null;
        return;
    }
    renderer.xcontext = gl; // used for hiding gl, so it can be unset if 'wrong' context and restored again in context
    //simplemode = hostname.toLowerCase().startsWith("pete") || navigator.appVersion.indexOf(".NET") !== -1;
    if (simplemode)
        simpleset();
    if (gldebug)
        Gldebug.start(gldebug); // gldebug cxan be set on url call
    if (nightly)
        testNightly();
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    let s = navigator.userAgent + gpuinfo();
    // s += navigator.userAgent + "<br>ANGLE: " + isANGLE(gl);  // angle test no longer reliable?
    s += "<br>codetime: " + startcommit;
    W.versiondata.innerHTML = s;
    renderer.autoClear = false;
    //canvas.style.float = "";
    canvas.tabIndex = 0; // so it will accept keystrokes
    // near arbitrary value in sensible range, set peculiar so easily recognizable in debug
    camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 11.73, 10000);
    currentGenes._fov = camera.fov;
    //currentGenes._near = camera.near;
    //currentGenes._far = camera.far;
    //mirrorProperty(G, '_near', camera, 'near');
    //mirrorProperty(G, '_far', camera, 'far');
    camera.matrixAutoUpdate = false;
    let ih = document.getElementById("canvasspan");
    let ip = ih.parentNode;
    ip.replaceChild(canvas, ih);
    canvas.id = "renderercanvas";
    canv2d = document.createElement("canvas");
    ip.appendChild(canv2d);
    canv2d.width = canvas.width;
    canv2d.height = canvas.height;
    canv2d.style.display = 'none';
    canv2d.id = "canv2d";
    //if (!deferRender) {
    onWindowResize();
    clog('onWindowResize done');
    //}
    // collect code from 'real' code and copy into textarea
    // we don't put it in textarea initially to allow an editor to format it
    let cc = sceneCode.toString().split("\n");
    cc.splice(0, 1);
    cc.splice(cc.length - 1, 1);
    tryseteleval('code', cc.join("\n"));
    sceneCode();
    clog('sceneCode done');
    // </editor-fold>
    running = trygetele("running", "checked", true);
    refreshGal(); // perform early, todo make async
    setInput(WA.menuAutoOpen, !oxcsynth);
    // <editor-fold desc="set callbacks">
    // we always want this even if the others are removed
    canvas.addEventListener('mousemove', function (evt) {
        if (badmouse(evt))
            return killev(evt); // TODO: check this really prevents it coming up in exhibition mode
        if (exhibitionMode)
            return;
        //msgfix('move', offx(evt), offy(evt), 'sx', evt.screenX);
        const canvoff = +canvas.style.left.replace('px', '');
        const offfx = evt.offsetX; // offx(evt) wrong here as it allows for canvas display not 1::1
        if (inputs.menuAutoOpen && (offfx <= 20 - canvoff || evt.clientX < 20) && W.controls && !reserveSlots) {
            showControls(true);
            reshowGenes();
        }
        else if (W.controlscore.clientWidth > 0 && offfx > W.controlscore.clientWidth * 1.5 + W.controls.clientLeft - canvoff)
            showControls(false);
    });
    setCanvasEvents();
    clog('setCanvasEvents done');
    canvas.onselect = function (evt) { keysdown = []; };
    W.controlscore.onmouseout = controlsmouseout;
    trysetele("tranrulebox", 'onkeyup', cchangeMat);
    trysetele("directorrulebox", 'onkeyup', cchangeMat);
    trysetele('doAnim', 'onchange', newframe);
    trysetele('doAutorot', 'onchange', newframe);
    window.addEventListener('resize', onWindowResize, false);
    if (W.DOF)
        W.DOF.Init(); // might be more specific to horns, but init anyway
    // </editor-fold>
    if (!stats)
        newstats();
    clog('newstats done');
    if (W.optionContainer)
        CubeMap.SetRenderState('color');
    clog('SetRenderState done');
    // <editor-fold desc="setup and materials/shaders only for organic">
    // setup and materials/shaders only for organic, but some bit ? still needed for CSynth
    if (appToUse === "Horn" /*&& !searchValues.nohorn*/) {
        // baseShaderChanged();  // get this done as soon as possible .. but not TOO soon
        registerInputs(); // so getMaterial has them right, but this may all be overwritten later
        clog('registerInputs done');
        getMaterial("NOTR", currentGenes, true); // force genes to be generated, eg for lights
        clog('initialGeneGeneration done');
        clog('initialGeneGeneration done 2');
        renderer.sortObjects = false;
        renderer.autoClear = false;
        renderer.autoClearColor = false;
        renderer.autoClearDepth = false;
        renderer.autoClearStencil = false;
        //###    setViewports([0, 0]);  // until proven otherwise, at least mainvp and slots will be consistent
        clog('setviewports done');
        if (HW.hornTrancodeForTranrule)
            trancodeForTranrule = HW.hornTrancodeForTranrule; // may not be for Fano
        baseShaderChanged(); // just clear things up
        clog('baseShaderChanged done');
        loadTime('loadobj 1 pregetgal');
        const gg = getGal(startobj);
        // make sure the tranrule gets saved asap
        // we had issues with the orignal tranrule sometimese creeping back in ... probably async issue ???
        WA.tranrulebox.textContent = gg.genes.tranrule;
        inputs.tranrulebox = gg.genes.tranrule;
        // debug to catch issue, this may be helpful in future??? 13/1/20
        //WA.monitorX(inputs,'tranrulebox');
        //for (let dd in gg.currentObjects) WA.monitorX(gg.currentObjects[dd].genes, 'tranrule');
        if (gg) {
            clog('getGal done');
            loadTime('loadobj 2 preloadtarget');
            currentGenes = loadtarget(gg, true, true); // too soon here?
            loadTime('loadobj 3 loadtarget done');
            clog('loadtarget done');
            if (Object.values(FF(genedefs, 'subb')).filter(g => g.free).length) {
                const ok = confirm('unsupported subband usage, do you want to clean up and re-save?');
                if (ok) {
                    setAllLots('subband', { free: 0, value: -1 }); // to review, but for now disable subbands
                    save();
                }
            }
        }
        else {
            currentGenes = settarget({ tranrule: "horn('main').ribs(20).radius(50).stack(1200); mainhorn='main'", name: "default" });
        }
        WA.RG = _R(currentGenes);
        loadOao.lasttime = frametime;
        if (searchValues.pdb) {
            startscript = 'https://files.rcsb.org/download/' + searchValues.pdb.toUpperCase() + '.pdb';
            const r = processFile(startscript);
        }
        else if (startscript) {
            if (CSynth.shortcuts && CSynth.shortcuts[startscript])
                startscript = CSynth.shortcuts[startscript];
            if (!startscript.includes('/data/') && startscript[0] !== '/' && !startscript.startsWith('https:')) {
                const dir = location.href.includes('/csynthstatic/') ? '../data/' : 'CSynth/data/';
                startscript = dir + startscript;
            }
            if (!startscript.startsWith('http') && !fileExists(startscript)) {
                const s = 'start file does not exist:<br>' + startscript;
                showbaderrornogl(s);
                throw new Error(s);
            }
            const r = processFile(startscript);
        }
        //currentMaterialChanged();
        setgenes(mainvp, currentGenes);
        target = clone(currentGenes);
        defaultObj = clone(currentGenes);
        // must be AFTER currentGenes created
        if (simplemode) {
            simpleset();
            onframe(simpleset, 155);
        }
        // after tranrule in case it establishes no need for it
        scaleGpuPrep();
        clog('scaleGpuPrep done');
    }
    // </editor-fold>
    let renderfun = W["renderObj" + appToUse];
    if (!renderfun)
        serious("Cannot run app '" + appToUse + "'");
    else
        currentrenderObjEvent = Maestro.on("renderObj", renderfun);
    // <editor-fold desc="projection version stuff">
    if (UICom && UICom.m_isProjVersion) { // in init1
        staticAudio = true;
        playingAudioEl = document.getElementById("audio1");
        playingAudioEl.loop = true;
        playingAudioEl.play();
        let ss = document.createElement("link");
        ss.type = "text/css";
        ss.rel = "stylesheet";
        ss.href = "proj.css";
        document.getElementsByTagName("head")[0].appendChild(ss);
        // hide controls here
        document.getElementById('mystats').style.display = "none";
        document.getElementById('msg').style.display = "none";
        document.getElementById('controlsouter').style.display = "none";
        // load projection webgallery
        savedef = 'organicProjection';
        // perform on demand
        // refreshGal(); // webGalByNum = readWebGal();
        let ls = getfiledata("stems/projection_stems/Neptune1/Neptune1.stem");
        let jsonStem = JSON.parse(ls);
        stemLoad('projection_stems/Neptune1/Neptune1');
        setTimeout(function () {
            webgallery();
            loadtarget(getWebGalByNum(0).name);
            // TDR  temporary fix for rotation issues
            setTimeout(function () {
                let genes = currentGenes; // TODO XXX check
                genes._rot4_ele = clone(getWebGalByNum(0).genes._rot4_ele);
                rot4toGenes();
                genes._camz = getWebGalByNum(0).genes._camz;
                camTarget = +genes._camz;
                asyncKeepInView();
                updatevp(0);
                updatevp(-1);
            }, 150);
            //mutate();
            UIController.Init();
            UIController.InitSpeedValues("animSpeed", jsonStem["animSpeed"]);
            UIController.InitSpeedValues("xzrot", jsonStem["xzrot"]);
        }, 150);
        // or simply load bounded animation
        /*
        genBoundsFromPrefix("projection_stems/jeffx");
        */
    }
    delayTurnoffCursor(5000);
    canvready();
    // </editor-fold>
    if ("ontouchstart" in window && !V.BypassHammer)
        Touch2Init(); // Touch.Init();
    log("extra windows. globals used=", countXglobals());
    onframe(WA.callibrateGPU, 50);
} // end init1
/** set all the features of simplemode, may be called often */
function simpleset() {
    //usemask = 1;
    //Gldebug.start();
    if (nwwin) {
        nwwin.showDevTools();
        nwwin.resizeTo(800, 600);
    }
    screens = [{ width: 800, height: 600 }];
    setInput(W.SIMPLESHADE, true);
    shadows(0);
    setInput(W.USESKELBUFFER, false);
    THREEA.SKIPINSTANCES = true;
    usemask = -1;
    gldebug = 100;
    THREEA.LinearFilter = THREE.NearestFilter;
    setval("ribs0", 3);
    setval("first_ribs", 3);
    target.ribs0 = 3;
    target.first_ribs = 3;
    setViewports([0, 0]);
    setRes(5);
    renderObjsInner.direct = true;
    G.red1 = 1;
    //Gldebug.start();
    THREEA.LinearFilter = THREE.NearestFilter; // extreme, but .....
    V.skip = true;
    vrresting.bypassResting = true;
}
/** make new Stats object (new min/max values), alas, no Stats.reset() */
function newstats() {
    let mode = 0;
    if (stats) {
        document.getElementById('mystats').removeChild(stats.domElement);
        mode = stats.mode || 0;
    }
    stats = new Stats();
    stats.setMode(mode);
    stats.mode = mode;
    //stats.update();
    //stats.end();
    //onframe(stats.begin);
    document.getElementById('mystats').appendChild(stats.domElement);
    let de = stats.domElement;
    de.style.display = "inline-block";
    de.style.position = "";
    de.style.width = '';
    for (let i = 0; i < de.children.length; i++) {
        de.children[i].style.height = '96px';
        de.children[i].style.width = '160px';
    }
    //   W.msText.style.fontSize = W.fpsText.style.fontSize = '';
    //   W.msText.style.lineHeight = W.fpsText.style.lineHeight = '';
}
var currentrenderObjEvent; // remember our Maestro registration so we can undo it if needed
function controlsmouseout(e) {
    // ??? this didn't do anything except return sjpt 7 Feb 2023
    // or give exception if no e.relatedTarget.hasParent
    return;
    if (inputs.fixcontrols)
        return; // don't lose if it is fixed
    if (currentDownTarget)
        return; // don't lose while manipulating a control
    if (W.tranrulebox && e.target !== this && W.tranrulebox.hasParent(e.target))
        return; // don't lose if box shrinks while editing tranrule
    if (e.relatedTarget === null || e.relatedTarget === this || e.relatedTarget.hasParent(this))
        return; // didn't really leave, false
}
/** cached variables to help clear */ var xscene, xcamera, xmaterial;
/** clear the current viewport to given THREE color */
function vpclear(pcol3, rendertarget, force) {
    if (!xscene) {
        //let l = 1;
        xscene = newscene('vpclear');
        let xgeometry = new THREE.PlaneGeometry(-3, 3);
        let xmesh = new THREE.Mesh(xgeometry);
        xmesh.frustumCulled = false;
        xscene.addX(xmesh);
        xmaterial = new THREE.MeshBasicMaterial();
        xmaterial.name = 'clear';
        xmesh.material = xmaterial;
        xcamera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 0);
        xcamera.matrixAutoUpdate = false;
        // renderer.clear(false, true, false);  // does not work to clear depth buffer ???
    }
    xmaterial.color = pcol3;
    gl.depthFunc(gl.ALWAYS);
    rrender("vpclear", xscene, xcamera, rendertarget, force);
    gl.depthFunc(gl.LEQUAL); // reset in case nobody else does
}
// adds a single vp/object to a render list
function updatevp(vn) {
    let dispobj = xxxdispobj(vn);
    newframe(dispobj);
}
var bigrt = "notsetyet";
var debugCurrentObjectsSize;
/** get number of bad slots */
function baddispobjs() {
    let nok = [];
    for (let o in currentObjects) {
        let dispobj = currentObjects[o];
        if (dispobj !== extraDispobj && !isDragobj(dispobj) && dispobj.vn !== -1 && slots[dispobj.vn].dispobj !== dispobj)
            nok.push(dispobj);
    }
    return nok;
}
/** get bad slots */
function badslots() {
    let nok = [];
    for (let vn = 0; vn < slots.length; vn++) {
        let sl = slots[vn];
        if (sl && (vn !== sl.dispobj.vn || (sl.dispobj !== extraDispobj && !sl.dispobj.visible)))
            nok.push(vn);
    }
    return nok;
}
/** find dispobj with bigrt */
function finddispobjforbigrt() {
    for (let o in currentObjects) {
        let dispobj = currentObjects[o];
        if (dispobj.rt === bigrt)
            return dispobj;
    }
    return undefined;
}
/** */
function findslotfordispobj(dispobj) {
    let nok = [];
    for (let vn = 0; vn < slots.length; vn++) {
        let sl = slots[vn];
        if (sl && sl.dispobj === dispobj)
            return vn;
    }
    return undefined;
}
/** correct the slot situation */
function correctSlots() {
    let maindo = slots[mainvp].dispobj;
    // const [rt1, rt2] = maindo._rts || [maindo.rt, maindo.rt]
    const wrongtest = maindo._rts ? (maindo._rts[0] !== bigrt && maindo._rts[1] !== bigrt) : maindo.rt !== bigrt;
    if (maindo.rt && wrongtest && bigrt !== "notsetyet") {
        // >>> check the need/reason for line below
        // It helps with a viewport change to remove proj viewport
        //    issues with wrong rendering and nonmain slots not displaying
        // but if it is enabled when there is a proj viewport the proj viewport comes out red
        if (!slots[-1] && maindo.rt.width === bigrt.width && maindo.rt.height === bigrt.height && !renderVR.addSlot0) {
            maindo.rt = bigrt;
        }
        else {
            log("correct bigrt");
            setViewports(); // a little extreme, but works better
            refall();
            /**  this code did not always correct things. not sure why ???
            let sl = finddispobjforbigrt();
            if (sl) {
                sl.rt = maindo.rt;
                maindo.rt = bigrt;
            }
            **/
        }
    }
    if (debugCurrentObjectsSize !== olength(currentObjects))
        log("current objects lost?");
    let badd = baddispobjs();
    if (badd.length === 0)
        return;
    log("attempt correct slots");
    let bads = badslots();
    if (bads.length !== badd.length)
        console.log("wrong lengths in correctSlots..."); // debugger;
    for (let i = 0; i < badd.length; i++) {
        badd[i].vn = bads[i];
        slots[bads[i]].dispobj = badd[i];
        badd[i].visible = true;
    }
}
function makevr2() {
    if (!islocalhost)
        return;
    if (WA.WEBVR.novr)
        return msgfixerrorlog('XR', "makevr2, No attempt send F2 and to enter XR as it isn't available.");
    renderVR.xrfs.lastrequest = true;
    EX.toFront();
    // EX.toFront();  // also stops it being maximized
    onframe(() => {
        nircmd(`sendkey f2 press`);
        log('xrfs f2 sent by makevr2');
    }, 15);
}
var viewsnapHalflife = 150;
var rendall = false; // set to true to render all every time; in case layoutChanged optimization fails
var deferRender = false;
var _firstRealRender = 0;
/** render the objects */
var renderFrame = function (rt) {
    // poll to keep xr running: could easily be generalized for webVR: states are opening, unguarded and force retry
    if (deferRender) {
        Maestro.trigger('preframe');
        Maestro.trigger('postframe');
        return;
    }
    if (isCSynth && !CSynth.active)
        return msgfix('CSynthPending', 'waiting for ready before rendering');
    msgfix('CSynthPending');
    _firstRealRender++;
    if (_firstRealRender <= 3)
        msgfixlog('tad+', 'real render, framenum=', framenum, _firstRealRender);
    if (_firstRealRender === 1)
        Maestro.trigger('firstRealRender');
    renderFrameInner(rt !== null && rt !== void 0 ? rt : null);
    if (_firstRealRender <= 3)
        msgfixlog('tad+', 'real render done, framenum=', framenum, _firstRealRender);
    if (_firstRealRender === 2) {
        msgfixlog('tad++', 'remove startscreen, framenum=', framenum, _firstRealRender);
        W.startscreen.style.display = 'none';
    }
};
var renderFrameInner = function (rt) {
    if (!searchValues.devMode) {
        if (renderVR.xrfs.lastrequest && !renderVR.invr() && renderVR.xrfs.state === 'unguarded') { // } && !searchValues.devMode) {
            if (renderVR.xrfs.restarts >= renderVR.xrfs.maxrestarts) {
                if (renderVR.xrfs.restarts === renderVR.xrfs.maxrestarts) {
                    msgfixerrorlog("XR restarts exceeded", renderVR.xrfs.maxrestarts);
                    renderVR.xrfs.restarts++; // so we don't repeat error
                }
            }
            else {
                (async function xrfsretry() {
                    const retry = renderVR.xrfs.restarts++;
                    const dt = frametime - renderVR.xrfs.lastRestartTime;
                    renderVR.xrfs.lastRestartTime = frametime;
                    log(`xrfs forced retry on poll ${retry} timegap: ${new Date(dt).toISOString().substring(11)}`);
                    renderVR.xrfs.state = 'force retry';
                    makevr2();
                    await sleep(500);
                    if (renderVR.xrfs.state === 'force retry') {
                        renderVR.xrfs.state = 'unguarded';
                        log('xrfs force retry guard dropped', retry);
                    }
                })();
            }
        }
    }
    if (renderVR.invr())
        renderObjs = renderVR; // force two window render, check every frame for confusion after change
    if (startvr)
        // to remove/tidy Nov 2020
        // if (renderer. vr.is xr)
        msgfix('>XR isPresenting', renderer.xr.isPresenting, renderObjs.name, canvas.width / 2, canvas.height);
    //else
    //    msgfix('>VR isPresenting', renderer. vr.get Device() ? renderer. vr.get Device().isPresenting : 'no device',
    //        renderObjs.name, canvas.width/2, canvas.height);
    // compute forward direction allowing for camera and rot4, to use for best normals
    // do this before splitting stereo, we want consistent value between eyes
    // note on rotations:
    // standard transform is  viewMatrix * (pos * rot4)
    //     = viewMatrix * rot4' * position
    //     = camera.matrixWorld**-1 * rot4' * position
    // we are only interested in rotations on orthonormal transformation, so inverse is equivalent to transpose, so
    //     ?= camera.matrixWorld' * rot4' * pos
    //     = (rot4 * camera.matrixWorld)' * pos
    let vme = renderFrame.mmm.multiplyMatrices(uniforms.rot4.value, camera.matrixWorld).elements;
    uniforms.awayvec.value.set(vme[8], vme[9], vme[10]);
    // correctNWsize();  // Should not be needed
    // if (framenum === Gldebug.stopframe) Gldebug.stop(); // managed by Gldebug now ...
    Maestro.trigger("preframe", { rendertarget: bigrt });
    if (WA.CLeap && CLeap.camera)
        CLeap.camera.copy(camera); // may be vr camera 0 or nonvr camera
    rt = rt || (WA.Holo && Holo.source); // if using Holo/Looking Glass we render to that buffer
    if (cheatxr)
        renderObjs = renderObjsInner;
    renderObjs(rt !== null && rt !== void 0 ? rt : null);
    Maestro.trigger("postframe", { rendertarget: bigrt });
}; // renderFrameInner
renderFrame.mmm = new THREE.Matrix4();
/** viewport in canvas width coordinates */
function rendererSetViewportCanv(x, y, width, height) {
    renderer.setViewport(x / devicePixelRatio, y / devicePixelRatio, width / devicePixelRatio, height / devicePixelRatio);
}
;
var renderObjsInner = function fRenderObjsInner(rt, novr) {
    // if (CLeap && CLeap.camera && !renderVR.eye2) CLeap.camera.copy(camera);  // may be vr camera 0 or nonvr camera
    // if (usevr && !novr) { renderVR(rt); return; }
    if (renderObjsInner.direct) {
        renderer.setRenderTarget(slots[0].dispobj.rt); // need to clear the 'real' shared depthBuffer
        renderer.clearDepth();
        // dummyrt.depthTexture = renderTargetDepth(canvas);    // experiment to clear depthBuffer without unneccarily creating big renderTarget
        // renderer.setRenderTarget(dummyrt);
        // renderer.clearDepth();
        renderer.setRenderTarget(rt !== null && rt !== void 0 ? rt : null);
        renderer.clear(true, true, true);
        renderObj(slots[0].dispobj, "canvas");
        rrender('camscene_rawscene', V.camscene, camera, rt);
        // V.renderNocam(rt); // ? move to postrender
        return;
    }
    //checkglerror("start of renderObjs");
    let layoutChanged = rendall; // set when layout changed, eg object dragged, and we need to repaint all
    if (currentGenes === target) {
        console.error("??????? currentGenes === target");
    }
    correctSlots();
    // slide viewport objects to correct position/slot (dragmode)
    // and get correct styling
    // let lruo = lru();
    for (let o in currentObjects) {
        let dispobjj = currentObjects[o];
        let vn = dispobjj.vn;
        let vp = slots[vn]; // viewport
        if (!vp)
            continue; // some dispobj may not have valid slots
        //???if (dispobj !== vp.dispobj) { console.log("unexpected dispobj"); debugger; }           // genes that belongs there
        // sometimes the matrices were not getting correctly reset
        // not the correct place to fix this?, but cheap and effective
        if (dispobjj.scene.matrixWorld.elements[0] === 1) {
            dispobjj.scene.updateMatrix();
            dispobjj.scene.updateMatrixWorld();
        }
        if (isDragobj(dispobjj)) { // this one is being dragged
            //!!!dispobj.mesh.$$$material.color.setRGB(0.5,1.5,0.5);
            dispobjj.z = 20;
            newframe();
        }
        else {
            dispobjj.z = 0; // vp.col;  // << column not colour
            if (isNaN(dispobjj.cx + dispobjj.cy)) {
                dispobjj.cx = 0;
                dispobjj.cy = 0;
            } // compare position to 'correct' position in viewport
            let k = 0.15; // damping factor
            var dd = ((dispobjj.cx - vp.cx) * (dispobjj.cx - vp.cx) + (dispobjj.cy - vp.cy) * (dispobjj.cy - vp.cy));
            if (dispobjj.vn === mainvp) { // already ok or force mainvp never move
                dispobjj.cx = vp.cx;
                dispobjj.cy = vp.cy;
            }
            else if (dd === 0 || dispobjj.vn === mainvp) { // already ok or force mainvp never move
                //dispobj.mesh.$$$$material.color.setRGB(1,1,1);
            }
            else if (dd < 0.1) {
                dispobjj.cx = vp.cx;
                dispobjj.cy = vp.cy;
                newframe();
            }
            else {
                let damp = getdamp(viewsnapHalflife);
                //!!!dispobj.mesh.$$$material.color.setRGB(1,0.5,0.5);
                dispobjj.cx = dodamp(dispobjj.cx, vp.cx, viewsnapHalflife);
                dispobjj.cy = dodamp(dispobjj.cy, vp.cy, viewsnapHalflife);
                dispobjj.z = 2; // vp.col;
                if (dispobjj.visible && (dispobjj.cx - vp.cx) * (dispobjj.cx - vp.cx)
                    + (dispobjj.cy - vp.cy) * (dispobjj.cy - vp.cy) < 1) {
                    dispobjj.cx = vp.cx;
                    dispobjj.cy = vp.cy;
                }
                else {
                    newframe();
                }
            }
        }
        if (!(isDragobj(dispobjj) /* && dragObj.dispobj.overmain ? _overmain */)) {
            dispobjj.width = vp.width;
            dispobjj.height = vp.height;
        }
        let scenei = dispobjj.scene;
        scenei.rotation.z = 0;
        let border = 0;
        if (dispobjj.selected)
            border = 4;
        if (dispobjj.vn <= reserveSlots)
            border = 4;
        if (isDragobj(dispobjj)) {
            border = 8;
            //scene.rotation.z = -0.05;
            dispobjj.needsPaint = true;
        }
        if (dispobjj.borderwidth !== undefined)
            border = dispobjj.borderwidth;
        if (inputs.revscreen) {
            // todo
        }
        else {
            if (dispobjj.vn !== -1 && slots[-1]) {
                let maxr = slots[-1].x - 4; // keep clear of proj screen
                let slot = slots[dispobjj.vn]; // but may be allocated nearer
                if (slot)
                    maxr = Math.max(maxr, slot.x + slot.width);
                if (dispobjj.right > maxr) // do not let dispobj poke into proj screen
                    dispobjj.cx = maxr - dispobjj.width / 2;
            }
        }
        scenei.position.x = dispobjj.cx;
        scenei.position.y = dispobjj.cy;
        scenei.position.z = dispobjj.z;
        scenei.scale.x = dispobjj.width;
        scenei.scale.y = dispobjj.height;
        //dispobj.scene.border.visible = false;  // not used right now
        let back = scenei.back;
        back.scale.x = 1 + border / vp.width;
        back.scale.y = 1 + border / vp.height;
        // color dying opbjects ~~~ ??? use border instead ???
        let backcol = back.material.color;
        let sssr = backcol.r, sssg = backcol.g, sssb = backcol.b;
        back.position.z = -1;
        back.material.opacity = 1;
        if (dispobjj.backcolor)
            backcol.set(dispobjj.backcolor);
        else if (dispobjj.vn === dustbinvp) {
            back.position.z = 1;
            back.material.transparent = true;
            // fade from fully transparent to 0.3 as it nears slot
            let op = Math.max(0, 0.3 - 0.3 * Math.sqrt(dd) / dispobjj.width);
            back.material.opacity = op;
            backcol.setRGB(0.5, 0, 0);
        }
        else if (dispobjj.vn === -1)
            backcol.setRGB(0, 0, 0);
        else if (dispobjj.vn === mainvp && dispobjj.selected && W.clearColor.value === "#000000")
            backcol.setRGB(0.04, 0.04, 0.04);
        else if (dispobjj.vn === mainvp)
            //backcol.setRGB(0,0,0);
            // backcol.set(W.clearColor.value);
            backcol.set(maincol);
        else if (isDragobj(dispobjj))
            backcol.setRGB(0.2, 0.2, 0.4);
        else if (dispobjj.selected)
            // backcol.setRGB(0.13,0.13,0.2);
            backcol.set(selcol);
        //else if (dispobj === lruo)
        //    backcol.setRGB(0.2,0.2,0);
        else if (dispobjj.vn === Director.slot)
            backcol.set(directorcol);
        else if (dispobjj.vn <= reserveSlots)
            backcol.set(rescol);
        else {
            backcol.setRGB(0, 0, 0);
            back.scale.x = back.scale.y = 1;
        }
        //let pppr = dispobj.pppr;  // for colour by distance
        //if (pppr)
        //    backcol.setRGB(pppr, 1-pppr, 0);
        // check for change
        if (!(sssr === backcol.r && sssg === backcol.g && sssb === backcol.b))
            layoutChanged = true;
        if (dispobjj.cx !== dispobjj.lcx || dispobjj.cy !== dispobjj.lcy) {
            dispobjj.lcx = dispobjj.cx;
            dispobjj.lcy = dispobjj.cy;
            layoutChanged = true;
        }
    }
    // setgenes(-1, currentGenes);  // no need, viewport displayed in different way ???
    setgenes(mainvp, currentGenes); // just in case they got out of step
    let refresh = forcerefresh || inputs.rotallcams;
    forcerefresh = false;
    //serious("debug here");
    // the following forces slots[-1].dispobj.rt to be seen, not sure why it sometimes got missed ??? sjpt 26 Oct 2015
    // if (slots[-1]) let unusedrt = slots[-1].dispobj.rt;  // ??? resolved by correct bigrt forcing full setViewports()
    // make sure all dispobj rendertarget filled in up to date
    // may defer some if it gets too expensive, so collect and sort on those most in need of render
    // debug let rendered = [];
    let listk = Object.keys(currentObjects);
    let listo = listk.map(k => currentObjects[k]);
    if (!refresh)
        listo = listo.filter(o => o.needsRender); // ??  || o.needsPaint);
    listo = listo.sort((o1, o2) => o2.needsRender - o1.needsRender);
    // .filter(k => k !== maink).splice(0,0, maink);
    let st;
    for (let i = 0; i < listo.length; i++) {
        if (i === 1)
            st = Date.now(); // render 1 then start counting
        const dispobj = listo[i];
        if (i >= 2 && Date.now() > st + renderObjsInner.extraFramesTime) {
            // log(`breaking during render panes ${i} of ${listo.length}, needsRender  ${dispobj.needsRender}`);
            break; // restshould get done next frame or asap
        }
        if (!dispobj) {
            const o = dispobj.xid;
            log("unexpected empty currentObject in renderObjs", o);
            delete currentObjects[o];
            continue;
        }
        if (typeof dispobj.vn !== 'number')
            continue;
        if (!dispobj.genes)
            continue; // mutating, vps made but not properly populated yet
        if ((dispobj.needsRender || refresh) && dispobj.vn !== -1 && !cheatxr) {
            const scamera = camera;
            try {
                if (dispobj.camera) {
                    camera = dispobj.camera;
                    camToGenes(dispobj.genes);
                }
                const temprt = WA.fxaa.uselate ? getrendertarget('prefxaalate', { sizer: dispobj.rt }) : dispobj.rt;
                renderObj(dispobj, temprt);
                V.render(temprt);
                if (WA.fxaa.uselate)
                    WA.fxaa(temprt.texture, dispobj.rt);
                Maestro.trigger('postDispobj', dispobj);
            }
            catch (e) {
                log("cannot render dispobj", dispobj.vn, e.toString());
                break;
            }
            finally {
                if (dispobj.camera) {
                    camera = scamera;
                    camToGenes(dispobj.genes);
                }
            }
            //rendered.push(dispobj.vn);
        }
        let dorend = layoutChanged || dispobj.needsRender || dispobj.vn === -1 || dispobj.needsPaint;
        dispobj.scene.visible = dorend;
        for (let ii = 0; ii < dispobj.scene.children.length; ii++)
            dispobj.scene.children[ii].visible = dorend;
        if (dispobj.needsRender)
            dispobj.needsRender--;
        dispobj.needsPaint = dispobj.alwaysPaint;
        //dispobj.scene.border.visible = false;
    }
    //if (rendered.length > 2) log("renderObjs rendered objects ...", rendered.join(" "), "frame", framenum);
    // below moved, and dispob/rendertarget rempoved todo delete this Dec 2017
    // Maestro.trigger("postframe", { dispobj: dispobj, rendertarget: bigrt }); // render onto BOTH bigrt
    // all the objects now have correct renderTargets
    // so render the entire screen using three.js compositing
    opmode = 'vpx layout'; // clarify debug if copy shader does not compile
    renderer.setRenderTarget(rt);
    renderer.setClearColor(bigcol); //< use main viewport color for clearing the canvas
    //renderer.setClearColor(ColorKeywords.red);     //< use main viewport color for clearing the canvas
    //renderer.setViewport(-width,-height,2*width, 2*height);
    rendererSetViewportCanv(0, 0, width, height);
    renderer.clear(layoutChanged, true, true);
    renderer.sortObjects = layoutChanged;
    vpxQuadScene.matrixWorldAutoUpdate = layoutChanged;
    vpxQuadScene.matrixAutoUpdate = layoutChanged;
    vpxQuadScene.matrixWorldAutoUpdate = layoutChanged;
    vpxSceneRenderCamera.matrixAutoUpdate = layoutChanged;
    vpxQuadScene.children[0].children[0].onBeforeRender = cheatxr ? WA.doinsiderender : () => { };
    if (vpxQuadScene.children.length > 0)
        rrender(opmode, vpxQuadScene, vpxSceneRenderCamera, rt);
    renderer.setClearColor(ColorKeywords.green); //< use main viewport color for clearing the canvas
    renderer.sortObjects = false;
    layoutChanged = false;
};
var renderObjs = renderObjsInner; // by default, may be changed eg renderVR, renderQuad
renderObjsInner.extraFramesTime = 100;
// <editor-fold  defaultstate="collapsed" desc="fold for operations on rot4">
/** no-op delta matrix */
function matnop() { return new THREE.Matrix4(); } // could optimize, but ...
var inthreed = false;
/** zoom using genes._uScale, returns unit matix so will not change gene._rot4_ele etc ; ignore x,y */
function zoom(x, y, a, genes, mm = new THREE.Matrix4()) {
    if (!isFinite(a))
        return undefined;
    let sc = Math.pow(3, a);
    if (!('_uScale' in genes))
        genes._uScale = 1;
    genes._uScale *= sc;
    /***
    let e = mm.elements;
    e[0] = e[5] = e[10] = sc;
    ***/
    return mm;
}
var tmat4a = new THREE.Matrix4();
var tmat4b = new THREE.Matrix4();
var tmat4c = new THREE.Matrix4();
/** rotation matrix for pair of axes and angle */
function rot(x, y, a, genes, mm = new THREE.Matrix4()) {
    var _a;
    if (!isFinite(a))
        return undefined;
    a *= copyXflip * ((_a = genes._camaspect) !== null && _a !== void 0 ? _a : 1);
    let s = Math.sin(a);
    let c = Math.cos(a);
    mm.elements[x + 4 * x] = c;
    mm.elements[y + 4 * y] = c;
    mm.elements[x + 4 * y] = s;
    mm.elements[y + 4 * x] = -s;
    if (tad === null || tad === void 0 ? void 0 : tad.centre) {
        tmat4b.makeTranslation(tad.centre.x, tad.centre.y, tad.centre.z).transpose();
        tmat4c.makeTranslation(-tad.centre.x, -tad.centre.y, -tad.centre.z).transpose();
        tmat4a.multiplyMatrices(tmat4c, mm).multiply(tmat4b);
        mm.copy(tmat4a);
    }
    return mm;
}
/** flatten a single axis (or reflect or increase */
function flatten(x, y, a, genes, mm = new THREE.Matrix4()) {
    mm.elements[x] *= a;
    mm.elements[x + 4] *= a;
    mm.elements[x + 8] *= a;
    mm.elements[x + 12] *= a;
    return mm;
}
/** skew matrix for pair of axes and angle */
function skew(x, y, a, genes, mm = new THREE.Matrix4()) {
    if (!isFinite(a))
        return undefined;
    mm.elements[x + 4 * x] = 1;
    mm.elements[y + 4 * y] = 1;
    mm.elements[x + 4 * y] = a;
    mm.elements[y + 4 * x] = a;
    return mm;
}
/** pan matrix for axes and distance (ignore y) */
function pan(x, y, a, genes, mm = new THREE.Matrix4()) {
    var _a;
    if (!isFinite(a))
        return undefined;
    a *= copyXflip * ((_a = genes._camaspect) !== null && _a !== void 0 ? _a : 1) / G._uScale;
    if (inthreed)
        mm.elements[x * 4 + 3] = -a * genes._camz * 0.05; // works for three
    else
        mm.elements[x + 4 * 3] = a; // works for fano
    // no version works for four yet ???
    return mm;
}
/** persp matrix for axes and amount (ignore y) */
function persp(x, y, a, genes, mm = new THREE.Matrix4()) {
    if (!isFinite(a))
        return undefined;
    mm.elements[3 + 4 * x] += a * 10;
    return mm;
}
/** refresh lastTouchedDispobj, which is the one various matops will have modified */
function refreshLastTouched() {
    //// sjpt 14 Oct 2014, removed, we don't like the slowdown or the sparkle
    //// sparkle is due to springs ...
    //if (lastTouchedDispobj !== NODO) if (lastTouchedDispobj !== 0)
    //    updatevp(lastTouchedDispobj);
}
/** apply operation to all objects if appropriate,
if so, return undefined (as all already done)
if not, return single object to apply to (either given object, or xxxgenes(lastTouchedDispobj))
if xxxgenes(lastTouchedDispobj) is used but not defined, the overall effect will be a noop
'appropriate' is if no explicit object defined and rotate all is checked */
function applyAll(fun, parms, genes) {
    if (genes)
        genes = xxxgenes(genes);
    if (!genes && inputs.rotallcams) {
        for (let o in currentObjects) {
            let xo = currentObjects[o].genes;
            if (xo)
                fun.apply(undefined, parms.concat(xo));
        }
        return undefined;
    }
    else if (!genes) {
        // apply to main object
        let xo = currentGenes;
        if (xo)
            fun.apply(undefined, parms.concat(xo));
        //// apply to lastTouchedDispobj if different
        //// sjpt 14 Oct 2014, removed, we don't like the slowdown
        //slots[mainvp].dispobj.render();
        //if (lastTouchedDispobj.genes !== currentGenes) {
        //    lastTouchedDispobj.render();
        //    if (parms[2]) parms[2] *= -1;  // reverse
        //    let xo = lastTouchedDispobj.genes;
        //    if (xo) fun.apply(undefined, parms.concat(xo));
        //}
        return undefined;
    }
    else {
        return genes !== undefined ? genes : lastTouchedDispobj.genes;
    }
}
var lastTraninteracttime = 0;
var tranInteractDelay = Infinity; // no, default to never and set if wanted oxcsynth ? 1e98 : 60000;
function tranInteract() { return frametime > lastTraninteracttime + tranInteractDelay; }
/** function dolly */
function dollyZoom(k, genes) {
    genes = applyAll(dollyZoom, [k], genes);
    if (!genes)
        return;
    genes._camx *= k;
    genes._camy *= k;
    genes._camz *= k;
    lastTraninteracttime = frametime;
    refreshLastTouched();
    let w = Math.tan(genes._fov / 2 * (Math.PI / 180));
    w /= k;
    genes._fov = 2 * 180 / Math.PI * Math.atan(w);
    newframe(genes);
}
var applyScale = function (sc, genes) {
    genes = applyAll(applyScale, [sc], genes);
    if (!genes)
        return;
    genes._camz *= sc;
    lastTraninteracttime = frametime;
    refreshLastTouched();
    newframe(genes);
};
var zoomdef = { camz0: 2.75, camz1: 1, fov: 40 }; // camz0 is framed zoomed out (used by home), camz1 is max zoom in on slider
// called on zoomgui changed, eg slider moved directly
// OR indirectly from showzoomrot/setInput when G._camz changes
function zoomguichange() {
    inputs.zoomgui = W.zoomgui.value; // just in case auto is to late
    let camz = zoomdef.camz0 * basescale * Math.pow(zoomdef.camz1 / zoomdef.camz0, inputs.zoomgui);
    lastTraninteracttime = frametime;
    currentGenes._camz = camz;
    newmain();
}
function showzoomrot() {
    // if we are not showing the overlay don't let it limit the zooming
    // earlier issue with side-effects of callback limiting zoomgui range in VR
    // resolved by not using this code when overlay not displayed
    if (W.UI_overlay.style.display !== 'none') {
        let ival = Math.log(+currentGenes._camz / (zoomdef.camz0 * basescale)) / Math.log(zoomdef.camz1 / zoomdef.camz0);
        if (Math.abs(inputs.zoomgui - ival) > 0.0001)
            setInput(W.zoomgui, ival);
    }
    // normalize and show rotation elements
    let x = inputs.doxrot ? inputs.yzrot : 0;
    let y = inputs.doyrot ? inputs.xzrot : 0;
    let z = inputs.dozrot ? inputs.xyrot : 0;
    let xw = inputs.doxwrot ? inputs.xwrot : 0;
    let yw = inputs.doywrot ? inputs.ywrot : 0;
    let zw = inputs.dozwrot ? inputs.zwrot : 0;
    let s = Math.sqrt(x * x + y * y + z * z + xw * xw + yw * yw + zw * zw);
    let lgrot = inputs.grot;
    if (s === 0)
        lgrot = 0;
    if (isNaN(s * lgrot)) {
        x = 0;
        y = 0.7;
        z = 0;
        s = 2;
        lgrot = 0.7; //brussels 2 => 0.7....
    }
    if (!inputs.USEGROT)
        lgrot = 1;
    W.grot.max = '1';
    setInput(W.grot, lgrot);
    W.grot.style.display = inputs.USEGROT ? '' : 'none';
    if (!inputs.USEGROT) {
        setInput(W.grot, 1);
    }
    else if (0.95 < s && s < 1.05) {
    }
    else {
        if (inputs.doxrot)
            setInput(W.yzrot, x / s);
        if (inputs.doyrot)
            setInput(W.xzrot, y / s);
        if (inputs.dozrot)
            setInput(W.xyrot, z / s);
        if (inputs.doxwrot)
            setInput(W.xwrot, xw / s);
        if (inputs.doywrot)
            setInput(W.ywrot, yw / s);
        if (inputs.dozwrot)
            setInput(W.zwrot, zw / s);
        setInput(W.grot, inputs.grot * Math.pow(s, 1 / 3));
    }
}
/** temp matrix used so we can use three matrix operations on raw array element date */
var xmat4 = new THREE.Matrix4();
var ttmat4 = new THREE.Matrix4();
var xquat = new THREE.Quaternion();
/** apply operation op (persp/pan/skew/rot) for pair of axes and amount */
function applyMatop(x, y, a, op, genes) {
    if (a === 0)
        return;
    genes = applyAll(applyMatop, [x, y, a, op], genes);
    if (!genes)
        return;
    if (!genes._rot4_ele) // ??? should be return ????
        genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    if (op === undefined)
        op = rot;
    newframe(genes);
    let mm = op(x, y, a, genes, ttmat4.identity());
    if (mm === undefined)
        return; // error in touch logic causes this
    xmat4.elements = genes._rot4_ele;
    xmat4.multiply(mm);
    rot4toGenes();
    refreshLastTouched();
}
var x00 = 0, x01 = 1, x02 = 2, x03 = 3, x10 = 4, x11 = 5, x12 = 6, x13 = 7, x20 = 8, x21 = 9, x22 = 10, x23 = 11, x30 = 12, x31 = 13, x32 = 14, x33 = 15;
/** reset the transform, or some aspect of it ~ still for from correct
 * op may be string 'all', or a matrix op such as rot
 * default is to reset the camera (eg op === undefined, or op === matnop)
 */
function resetMat(op, genes) {
    genes = applyAll(resetMat, [op], genes);
    if (!genes)
        return;
    let e = genes._rot4_ele;
    if (!e || isNaN(e[15]) || isNaN(e[0])) {
        log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> resetMat pre error in matrix");
        genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    switch (op) {
        case "all":
            genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            genes._uScale = 1;
            newframe();
            break;
        case rot:
            //genes._rot4_ele = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
            e[x00] = e[x11] = e[x22] = 1;
            e[x01] = e[x12] = e[x20] = 0;
            e[x02] = e[x10] = e[x21] = 0;
            e[x33] = 1;
            break;
        case pan:
            e[x03] = e[x13] = e[x23] = 0;
            break;
        case skew:
            // TODO: XXX check: m does not exist?
            // m.setRotationFromQuaternion(m.decompose()[1]);
            break;
        case persp:
            e[x30] = e[x31] = e[x32] = 0;
            break;
        default:
            //xmat4.elements = genes._rot4_ele;
            //xmat4.makeScale(1,1,1);  // it was probably never disturbed
            resetCamera(genes);
            centrescale(genes); // this does the autoscale, and also resets the pan and scale of _rot4_ele
            break;
    }
    if (isNaN(e[15])) {
        log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> resetMat post error in matrix");
        genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    rot4toGenes(genes);
    newframe(xxxdispobj(genes));
    // genesToCam(genes);
    camera.updateMatrix();
    camera.updateMatrixWorld();
}
/** reset camera to 'typical' view */
function resetCamera(g = currentGenes) {
    if (!g)
        return;
    g._camx = 0;
    g._camy = 0;
    g._camz = zoomdef.camz0 * basescale; // why should this scale change camera??? * renderVR.scale / 400;
    g._camqx = 0;
    g._camqy = 0;
    g._camqz = 0;
    g._camqw = 1;
    g._fov = zoomdef.fov;
    genesToCam(g);
}
var interacttime = 0;
// to keep track of all modifiers
var ctrl = 16, shift = 32, alt = 64, cmd = 128, left = 2, right = 8, middle = 4;
var mousewhich = 0, keywhich = 0;
// rot, zoom, pan, skew, squash
// zrot, rotw, persp
// use key modifiers
function rotw() { } // tag for name, should not be called\
function rotz() { } // tag for name, should not be called\
function rotzw() { } // tag for name, should not be called\
// >>>> note that cmd key is '\'\
var ops = [];
ops[0] = ops[left] = rot;
ops[ctrl] = ops[ctrl + left] = zoom;
ops[shift] = ops[shift + left] = pan;
ops[ctrl + shift] = ops[ctrl + shift + left] = skew;
ops[alt] = ops[alt + left] = persp;
ops[cmd] = ops[cmd + left] = rotw;
// use mouse modifiers
ops[right] = pan; // overridden in code if inputs.using4d
ops[middle] = zoom;
ops[left + right] = rotz;
ops[alt + left + right] = rotzw;
ops[left + middle] = skew;
/** find which op will happen for the given evt, also display feedback */
function findMatop(evt) {
    //if (evt.ctrlKey !== undefined)
    keywhich = (evt ? ((evt.ctrlKey ? ctrl : 0) + (evt.shiftKey ? shift : 0) + (evt.altKey ? alt : 0)) : 0) + (keysdown.indexOf('\\') !== -1 ? cmd : 0);
    for (let k = 0; k < keysdown.length; k++) {
        let kk = keysdown[k];
        if (kk !== "shift" && kk !== "ctrl" && kk !== "alt" && kk !== '\\')
            keywhich = 999;
    }
    let op = ops[mousewhich + keywhich];
    if (op === undefined)
        op = matnop;
    if (inputs.using4d && op === pan)
        op = rotw;
    canvas.style.cursor = "";
    let m = keysdown.join(" ");
    if (inedit) {
        if (editgenex) {
            m += "edit: " + editgenex.name;
            canvas.style.cursor = "move"; //XXX PJT: weird glitches related to cursor stuff...
        }
        else {
            m += "hunting, op= " + keysdown[0];
            canvas.className = "";
        }
    }
    else {
        //canvas.className = op.name; // this was both distracting and Chrome got it wrong
        //fixCursorBug(op);  // this helped correct Chrome bugs at one time, but no longer
        m += "->" + op.name;
    }
    msgfix('op', m);
    delayTurnoffCursor(); // must not do until canvas style set
    // hover feedback of op
    let h = document.getElementById("hovercursor");
    if (h) {
        if (evt.clientY !== undefined) {
            h.style.top = (evt.clientY + 20) + "px";
            h.style.left = evt.clientX + "px";
        }
        if (mousewhich + keywhich !== 0 && evt.type !== "mousemove") { // only set for mousedown
            h.style.display = "inline";
            h.textContent = op.name;
        }
        else {
            h.style.display = "none";
        }
    }
    return op;
}
var turnOffKey;
/** turn off the cursor after a delay time, and turn back on if not on */
function delayTurnoffCursor(t = 3000) {
    if (turnOffKey)
        clearTimeout(turnOffKey);
    turnOffKey = setTimeout(noCanvasCursor, t);
    if (W.canvas.style.cursor === "none") {
        findMatop();
        //console.log("delayTurnoffCursor my caller ", mycaller());
        //console.error("<<<<<<<<<<<<<<<<<<<<< cursor set .........");
    }
}
/** set for no cursor on canvas */
function noCanvasCursor() {
    // we need both these settings
    // a value set in style.cursor = "none" is ignored for some time  (? details)
    // a value set in className is overridden by something else setting style.cursor
    //W.canvas.className = "nocurs"; //XXX
    //W.canvas.style.cursor = "none";
    turnOffKey = undefined;
}
// all the below trying to get round chrome bug to force cursor repaint
// seems to fix for mouseup, but not mousedown
function fixCursorBug(op, evt) {
    if (nwwin)
        return; // <<< inefficient in node webkit
    newframe();
    canvas.scrollLeft += 1;
    canvas.scrollLeft -= 1;
    canvas.style.cursor = "url(" + op.name + ".png) 12 12,crosshair";
}
/** fix the position to centre ~ may be overwritten otherwise duummy */
function unusedGraphbasefixpositionrot4(genes) { return { dx: 0, dy: 0 }; }
// </editor-fold>  operations on rot4
// I found bad health made the object too difficult to see too early, Stephen
/** show the health of each viewport (in hovermutate mode) */
function showObjectHealth() {
    let de = canvas;
    for (let o in currentObjects) {
        let dispobj = currentObjects[o];
        // let vp = slots[i];
        // ### TODO !!!!! use color of dispobj
        // vph.style.opacity = (280-dispobj.hoverHealth)/300;
    }
}
/** reset size of main viewport to standard size */
function clearObjzoom() {
    let dispobj = slots[mainvp].dispobj; // warning ... ??? all slightly different shapes
    camera.setViewOffset(dispobj.width, dispobj.height, 0, 0, dispobj.width, dispobj.height);
    newmain();
}
var vps = [0, 0]; // [2,4];  // number of slots
var realNumslots; // number of slots actually used
/** turn stats display on/off and register what the value is */
function setshowstats(val) {
    if (val !== undefined)
        setInput(W.showstats, val);
    W.mystats.style.display = inputs.showstats ? "" : "none";
    showControls(isControlShown);
    //    if (val !== undefined) trysetele('showstats', 'checked', val);
    //    W.mystats.style.display = trygetele('showstats', 'checked') ? "" : "none";
}
/** correct nw window size:  WARNING, the initial check is expensive, one of those width tests must be expensive ... */
var correctNWsize = function () {
    if (!nwwin || nwwin.isFullscreen)
        return;
    if (nwwin && nwwin.width !== document.body.clientWidth + xwin.border) { // } || window.height !== document.body.clientHeight) { /// n.b. clientHeight often === 0
        correctNWsize.fixcount = correctNWsize.fixcount ? correctNWsize.fixcount + 1 : 1;
        if (correctNWsize.fixcount > 10)
            return;
        log("onWindowResize widths wrong nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight, "fixcount", correctNWsize.fixcount);
        // ?? overkill method to correct issue where document gets out of sync
        let w = nwwin.width, h = nwwin.height;
        log("pre  FORCE resize", w, h, "was nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight);
        if (nwwin.width === w) {
            nwwin.resizeTo(w + 1, h + 1);
            log("mid  FORCE resize", w, h, "was nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight);
        }
        nwwin.resizeTo(w, h);
        log("post FORCE resize", w, h, "was nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight);
        setTimeout(correctNWsize, 1000);
    }
    else {
        correctNWsize.fixcount = 0;
    }
};
/** renderRatio changed */
function newRenderRatio() {
    renderRatio = inputs.renderRatioUi = +W.renderRatioUi.value;
    renderRatioMain = inputs.renderRatioUiMain = +W.renderRatioUiMain.value;
    renderRatioProj = inputs.renderRatioUiProj = +W.renderRatioUiProj.value;
    if (renderRatioMain === 0)
        renderRatioMain = renderRatio;
    if (renderRatioProj === 0)
        renderRatioProj = renderRatioMain;
    if (!slots)
        return;
    const smain = slots[mainvp];
    const ss = smain.width * smain.height / renderRatio ** 2;
    // reduce risk of running out of memory.
    // there may be more sets of renderTargets, and depth buffers etc not accounted for
    // and anyway we don't know storage available, so this is all a guess but better than nothing.
    const maxsize = WA.maxsize || 4e9; // arbitrary max size of render buffers; to do see if we can improve on this sensibly
    if (ss * 16 * 4 > maxsize) { // *16 for 16 bytes per pixel in 4 channel float buffer, *4 for 4 rendertargets for pipeline
        const orr = renderRatio;
        const nrr = renderRatio * Math.sqrt(ss * 16 * 4 / maxsize);
        setInput(W.renderRatioUi, nrr);
        msgfixerrorlog('renderRatio', `attempt to set too small ${orr}, set to ${nrr} instead`);
        return;
    }
    clearrendertargets();
    for (let s in slots)
        if (slots[s] && slots[s].dispobj) {
            slots[s].dispobj.dispose();
        }
    for (let o in currentObjects) {
        currentObjects[o].dispose();
    }
    setViewports();
}
var oldwidth, oldheight;
/** function to resize windows etc */
function onWindowResize(force = undefined) {
    console.log('window resize', oldwidth, oldheight, '=>', outerWidth, outerHeight);
    const hc = innerHeight - oldheight;
    if (force !== true && innerWidth === oldwidth && (hc === 0 || hc === -1))
        return log('false window resize', oldwidth, oldheight, '=>', innerWidth, innerHeight);
    oldwidth = innerWidth;
    oldheight = innerHeight;
    let _width, _height;
    if (restoringInputState)
        return;
    if (frameSaver.renderDirectory) {
        console.error(msgfixerror('rendersize', 'cannot change render size during animation capture'));
        return;
    }
    correctNWsize();
    inputs.fixcontrols = W.fixcontrols.checked; // in case saveInputState has not yet registered change
    inputs.projvp = W.projvp.checked; // in case saveInputState has not yet registered change
    inputs.fullvp = W.fullvp.checked; // in case saveInputState has not yet registered change
    let savedisp = W.controls.style.display;
    if (renderer === undefined) {
        msgfix("renderer undefined in OnWindowResize", '?');
        return;
    }
    let mmwidth = document.body.clientWidth;
    renderRatio = W.renderRatioUi.value * 1;
    let clost = 0;
    if (inputs.fixcontrols) { // test for overlay
        showControls(true);
        // allow for whether or not controls has scroll, width is width left for canvas
        // scroll width is controls.offsetWidth - controls.clientWidth; 0 if not present
        clost = W.controlscore.clientWidth + W.controls.offsetWidth - W.controls.clientWidth;
        _width = mmwidth - clost;
        reshowGenes();
    }
    else {
        _width = mmwidth;
        showControls(false);
    }
    W.controls.style.display = savedisp;
    _height = window.innerHeight;
    //canvas.style.left = (mmwidth - _width) + "px"; // mmwidth * 0.3;
    //canvas.style.top = '0px';
    if (ipad) {
        _height /= 4;
        _width /= 4;
    }
    if (ipad) {
        _height = 256;
        _width = 256;
    }
    _height = Math.round(_height);
    _width = Math.round(_width);
    setSize(_width, _height); // that will also set global width, height
    _width = width;
    _height = height; // may have been changed, eg because of previewAr/'use aspect'
    if (W.controls.style.display !== 'none')
        W.controls.onmousemove(undefined); // single place to compute controls size/position
    saveInputToLocal();
    if (!renderVR.invr()) {
        const cswidth = canvas.width / devicePixelRatio, csheight = canvas.height / devicePixelRatio;
        canvas.style.width = cswidth + "px";
        canvas.style.height = csheight + "px";
        canvas.style.left = Math.round((innerWidth - cswidth + clost) / 2) + 'px';
        canvas.style.top = Math.round((innerHeight - csheight) / 2) + 'px';
    }
    else {
        vrcanv(); // may well be too early
    }
    refall();
    canv2d.style.top = canvas.style.top;
    canv2d.style.left = canvas.style.left;
    canv2d.style.height = canvas.style.height;
    canv2d.style.width = canvas.style.width;
    canv2d.width = _width;
    canv2d.height = _height;
    if (V.nocamcamera) {
        const aspect = _width / _height;
        V.nocamcamera.left = -aspect;
        V.nocamcamera.right = aspect;
        V.nocamcamera.updateProjectionMatrix();
    }
}
/** set the controls opacity from its control*/
function setControlOpacity(opacity) {
    let o = FIRST(opacity, trygeteleval("controlOpacity", 100));
    W.controlscore.style.backgroundColor = "rgba(0,0,0," + (o / 100) + ")";
    saveInputToLocal();
}
let _savesize;
var noresize = false;
/** set the size of render window/canvas to a specific size,
force forces exactly what asked, and allows sizes beyond what the canvas can manage
return true if size requested created
*/
function setSize(wwidth, hheight, force) {
    if (noresize)
        return; // for special hybrid horn/tadpole context, avoid setSize side-effects
    if (frameSaver.renderDirectory) {
        console.error(msgfixerror('rendersize', 'cannot change render size during animation capture'));
        return;
    }
    if (deferRender) {
        _savesize = { wwidth, hheight };
        Maestro.onUnique('firstRealRender', setSize);
        return;
    }
    if (wwidth && wwidth.msgtype) { // eg the firstRealRender callback
        ({ wwidth, hheight } = _savesize);
    }
    const owidth = width, oheight = height;
    if (simplemode)
        simpleset();
    if (nwfs && (wwidth === 'screen' || wwidth === 'screen0')) {
        wwidth = screens[0].width;
        hheight = screens[0].height;
    }
    if (nwfs && (wwidth === 'screen1')) {
        wwidth = screens[1].width;
        hheight = screens[1].height;
    }
    if (Array.isArray(wwidth)) {
        hheight = wwidth[1];
        wwidth = wwidth[0];
    }
    if (wwidth && wwidth[0]) {
        hheight = wwidth[1];
        wwidth = wwidth[0];
    }
    if (wwidth && !hheight)
        hheight = wwidth;
    if (wwidth < 4)
        wwidth = screens[0].width * wwidth;
    if (hheight < 4)
        hheight = screens[0].height * hheight;
    wwidth = Math.round((wwidth || window.innerWidth) * devicePixelRatio);
    hheight = Math.round((hheight || window.innerHeight) * devicePixelRatio); //
    msgfixlog('rendersize', 'setting', wwidth, hheight);
    // appears to correct window scaling issues, sjpt 31/01/2014
    // not sure how often it needs to be done.
    // It seems our explicit setting of renderer size etc overrides windows.devicePixelRatio
    // I think three.js just sets renderer.pixelRatio once near start, but ...???
    // PJT 15/02/2019: having trouble related to this on Macbook...
    ////renderer. device PixelRatio = 1; //don't think this property is used now agreed.
    const dpr = window.devicePixelRatio;
    if (renderer.getPixelRatio() !== dpr)
        renderer.setPixelRatio(dpr);
    let wwhh = force ? [wwidth, hheight] : imsize();
    // not sure why this was here - commented out to get tall animation, 22/6/19
    // if (inputs.layoutbox * 1 !== 0 && wwhh[0] < wwhh[1]) wwhh = wwhh.reverse();
    // NO, sometimes needed ... if (width === wwidth && height === hheight) { msgfixlog('rendersize', 'already', wwidth, hheight); return; }
    width = wwidth || screens[0].width;
    height = hheight || screens[0].height;
    if (trygetele("previewAr", "checked", "") === 1) {
        let ww = wwhh[0];
        let hh = wwhh[1];
        if (width * hh / ww <= height)
            height = Math.round(width * hh / ww);
        else
            width = Math.round(height * ww / hh / 2) * 2;
    }
    // do NOT use render Ratio, it does not apply at the last composition render
    // renderer.setSize(width/render Ratio, height/render Ratio);
    let ok;
    if (!renderVR.invr()) { // do not upset if in vr, it will onlyt get set back gain and cause flicker
        ok = width === gl.drawingBufferWidth && height === gl.drawingBufferHeight;
        if (!ok)
            renderer.setSize(width / devicePixelRatio, height / devicePixelRatio);
        ok = width === gl.drawingBufferWidth && height === gl.drawingBufferHeight;
        if (!ok && !force) {
            log("implementation limitation: requested width not possible", width, height, " != ", gl.drawingBufferWidth, gl.drawingBufferHeight);
            width = gl.drawingBufferWidth - gl.drawingBufferWidth % 4;
            height = gl.drawingBufferHeight - gl.drawingBufferHeight % 4;
            log("retry with size", width, height);
            renderer.setSize(width / devicePixelRatio, height / devicePixelRatio);
            if (width !== gl.drawingBufferWidth || height !== gl.drawingBufferHeight) {
                // todo allow for devicePixelRatio ???
                serious("requested width not available even after retry");
            }
        }
    }
    renderer.setRenderTarget(null);
    if (owidth !== width || oheight !== height || !slots) {
        setViewports(vps, width, height);
        clearrendertargets();
    }
    camera.updateProjectionMatrix();
    document.body.style.maxHeight = window.innerHeight + 'px';
    Maestro.trigger('postSetSize');
    return ok;
}
/** set size in pixels */
function setSizePX(wwidth, hheight, force) {
    const rr = devicePixelRatio; // note: setSize will set renderer.pixelRatio
    return setSize(wwidth / rr, hheight / rr, force);
}
function setRunning() {
    running = inputs.running;
    newframe();
    //animate();
}
let lastuniforms = [];
/** quick copy genes to uniforms, */
function genes2uniforms(genes, u, tocopy = genes) {
    var _a;
    for (const gn in tocopy)
        if (gn in uniforms)
            uniforms[gn].value = (_a = geneOverrides[gn]) !== null && _a !== void 0 ? _a : genes[gn];
}
/** set uniforms for object, u may be uniforms */
function setObjUniforms(genes, u, quick = framenum > 100) {
    if (renderVR.eye2)
        return;
    if (quick) {
        genes2uniforms(genes, uniforms);
    }
    else {
        copyFrom(genes, fixedgenes);
        if (xxxvn(genes) === mainvp)
            copyFrom(genes, fixedgenesmain);
        //    for (let gn in genes) if (u[gn]) u[gn].value = genes[gn];
        //        myObjUniforms(genes, u);
        for (let gn in u) {
            if (gn === "time")
                continue;
            if (gn in geneOverrides) {
                u[gn].value = geneOverrides[gn];
            }
            else if (gn in genes) {
                u[gn].value = genes[gn];
            }
            else if (gn in genedefs) {
                u[gn].value = genes[gn] = genedefs[gn].def;
                // log ("GGGG added missing gene", gn,"to", genes.name, xxxdispobj(genes).xid);
                if (u[gn].type === "f")
                    genes[gn] *= 1; // sometimes they get set to character string values
            }
            else {
                // log("GGGG cannot find gene or genedef for uniform", gn);
            }
        }
    }
    if (genes._gcentre)
        u.gcentre.value.copy(genes._gcentre);
    if (!u.time)
        u.time = { type: 'f' };
    u.time.value = genes._fixtime || (frametime & 0x3ffffff) / 1000.;
    if (genes._recordTime !== undefined && Director.slotsUsed > 0) // was (frameSaver.renderDirectory)
        u.time.value = (+genes._recordTime & 0x3ffffff) / 1000.;
    genes.time = u.time.value; // time in seconds
    // check if there are new uniforms, if so make three do its shader/uniforms work
    if (framenum % 100 === 0) {
        const ukeys = Object.keys(u);
        const xkeys = ukeys.length - lastuniforms.length;
        if (xkeys !== 0) {
            log('new uniforms detected, refreshing materials: frame', framenum, lastuniforms.length, ukeys.length);
            if (xkeys < 20) {
                const diff = ukeys.filter(n => !lastuniforms.includes(n));
                log('new uniforms >>>', diff);
            }
            else {
                log('new uniforms >>>', xkeys, lastuniforms.length, '->', ukeys.length);
            }
            lastuniforms = Object.keys(u);
            updateShadersThree();
        }
    }
    u._lastSetFrame = framenum;
    u.cameraAspect.value = camera.aspect;
    if (material.opos)
        Object.values(material.opos).map(mat => mat.side = camera.aspect < 0 ? 1 : 0);
    S.trigger('setObjUniforms'); // give others a chance to 'distort' uniforms, eg based on viewfactor
}
var selectionElement;
// same as below, only for single selection
//function showSingleSelectionRectangleDeadmaywantagain()
//{
//     let de = canvas;
//    for (let i=0; i<view ports.length; i++)
//    {
//        let vp = view ports[i];
//        if( vp.singleSelect )
//        {
//            if( !selectionElement )
//            {
//                selectionElement=document.createElement("div");
//                //selectionElement.src="select.png";
//                selectionElement.style.position = "fixed";
//                // <<<>>> NO selectionElement.style.z Index = 100;
//                document.body.insertBefore(selectionElement, de);
//            }
//
//            let border = 2;
//            selectionElement.style.pointerEvents = 'none';        // force overlay to be ignored in pointer logic ( makes it non blocking )
//            selectionElement.style.width = (vp.width - border * 2.5) +'px';
//            selectionElement.style.height = (vp.height - border )+'px';
//            selectionElement.style.left = (de.offsetLeft + vp.x ) + "px";
//            selectionElement.style.top = (de.offsetTop + de.offsetHeight - ( vp.y + vp.height )) + "px";
//            selectionElement.style.display = "";
//            selectionElement.style.border = border+'px solid white';
//        }
//    }
//}
var vphis = []; // viewport highlights
/** show selected */
function showSelectedSlots() {
    // used to show butterflys ~ recreate with objects if wanted
    //    let de = canvas;
    //    for (let i=0; i<view ports.length; i++) {
    //        let vp = view ports[i];
    //        if (!vp) continue;
    //        let vphi = vphis[i];
    //        if(!vphi) {
    //            vphi=document.createElement("img");
    //            vphi.className = "showselect";
    //            vphi.src= "images/UI/butterfly_grad32.png"; //select.png";
    //            vphi.style.position = "fixed";
    //            // no do statically in css vphi.style.z Index = 100;
    //            vphis[i] = vphi;
    //            document.body.insertBefore(vphi, de);
    //        }
    //        vphi.style.left = (de.offsetLeft + vp.x + 2) + "px";
    //        vphi.style.top = (de.offsetTop + de.offsetHeight - vp.y - 35) + "px";
    //        vphi.style.display = vp.dispobj.selected ? "" : "none";
    //    }
    if (WA.geneGridColumns)
        geneGridColumns();
}
/** application specific function  for uniforms */
function myObjUniforms(genes, u) { }
function col3(r = 1, g = r, b = g) { return new THREE.Color().setRGB(r, g, b); }
var selcol = col3(1, 0, 0); // remove  col3(0.13, 0.13, 0.2);
var maincol = col3(0, 0, 0);
var rescol = col3(0.1, 0.4, 0.1);
var directorcol = col3(0.4, 0.1, 0.1);
var singleSelcol = col3(1.0, 1.0, 1.0);
var noselcol = col3(0.0, 0.0, 0.0);
var bigcol = col3(0.0, 0.0, 0.0);
var blackcol = col3(0.0, 0.0, 0.0);
var backall = col3(1.0, 1.0, 1.0);
/** sets the viewport color, takes a 0-1 rgb triplet, or #rrggbb, or r,g,b */
function setBackgroundColor(r, g = r, b = r) {
    let rgb;
    if (typeof r === 'number') {
        rgb = { r, g, b };
    }
    else if (typeof r === 'string') {
        rgb = new THREE.Color(r);
    }
    else if (r.r !== undefined) {
        rgb = r;
    }
    else {
        rgb = Utils.HexToRGB(r);
        rgb.r /= 255;
        rgb.g /= 255;
        rgb.b /= 255;
    }
    rgb.r = Math.pow(rgb.r, +currentGenes.gamma);
    rgb.g = Math.pow(rgb.g, +currentGenes.gamma);
    rgb.b = Math.pow(rgb.b, +currentGenes.gamma);
    bigcol.copy(rgb);
    rotateBackground(W.colrot.value);
    if (V.camscene.fog)
        V.camscene.fog.color.setRGB(rgb.r, rgb.g, rgb.b);
    refall();
    Maestro.trigger('backgroundColorChanged');
}
/** fix scale */
var fixrot4scale = function (genes) {
    xmat4.elements = genes._rot4_ele;
    let dett = Math.abs(xmat4.determinant());
    if (dett < 0.99 || dett > 1.01) { // small change wandered because of rotation
        if (dett < 0.9 || dett > 1.1)
            log(">>> unexpected determinant ", dett, genes.name);
        let sc = Math.pow(dett, -1 / 3);
        xmat4.scale({ x: sc, y: sc, z: sc }); //will change === genes._rot4_ele, THREEA
    }
    rot4toGenes(genes);
};
var tmat4 = new THREE.Matrix4(); // working matrix
function rot4uniforms(genes, u) {
    if (genes._rot4_ele.length === undefined)
        genes._rot4_ele.length = 16; // sometimes from awkward clone or ???
    // if we are using 4d then the rotation is applied by rot44d and horns saved rotated in skelbuffer
    // rot4 is then identity
    // if we are not using 4d then rot4 is applied later in pipeline, and rot44d is identity
    let fr;
    if (inputs.using4d) {
        fr = uniforms.rot44d.value;
        uniforms.rot4.value.identity();
    }
    else {
        fr = uniforms.rot4.value;
        uniforms.rot44d.value.identity();
    }
    fr.elements.set(genes._rot4_ele);
    if (V.usecentre && !inputs.using4d)
        fr.elements[3] = fr.elements[7] = fr.elements[11] = 0;
    // used for controlled rotation during Director video
    if (genes._uXrot) {
        tmat4.makeRotationX(genes._uXrot * 2 * Math.PI);
        fr.multiply(tmat4);
    }
    if (genes._uYrot) {
        tmat4.makeRotationY(genes._uYrot * 2 * Math.PI);
        fr.multiply(tmat4);
    }
    if (genes._uZrot) {
        tmat4.makeRotationZ(genes._uZrot * 2 * Math.PI);
        fr.multiply(tmat4);
    }
    let s = genes._uScale;
    if (s === undefined)
        s = 1;
    if (s !== 1) {
        if (inputs.using4d) {
            for (let i = 0; i < 16; i++)
                fr.elements[i] *= s;
        }
        else {
            fr.scale({ x: s, y: s, z: s });
        }
    }
    if (tad && tad.centre) {
        const o = tad.centre;
        fr.elements[3] = (genes._rot4_ele[3] - o.x) * s + o.x;
        fr.elements[7] = (genes._rot4_ele[7] - o.y) * s + o.y;
        fr.elements[11] = (genes._rot4_ele[11] - o.z) * s + o.z;
    }
    if (V.usecentre && !inputs.using4d) {
        fr.elements[3] = genes._rot4_ele[3] * s;
        fr.elements[7] = genes._rot4_ele[7] * s;
        fr.elements[11] = genes._rot4_ele[11] * s;
    }
}
// <editor-fold desc="rendering functions">
function prerender(genes, u) {
    if (_testcompile)
        return;
    //return;
    // set up view/rot for this object
    if (!(genes._rot4_ele))
        genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    fillCamGenes(genes); // just in case we have an old load and some camera genes do not even exist
    genesToCam(genes); // and always make sure correct camera set up from genes
    fixrot4scale(genes);
    rot4uniforms(genes, u);
    // set various inverse matrices etc needed by implicit surface
    if (uniforms.camInvProjMat) {
        uniforms.camInvProjMat.value.copy(camera.projectionMatrix).invert();
    }
    if (uniforms.invrot4) {
        let d = uniforms.rot4.value.determinant();
        let sc = Math.pow(d, 1 / 3);
        genes.viewRad = sc;
        uniforms.invrot4.value.copy(uniforms.rot4.value).invert();
        let sc2 = sc; //*sc;
        uniforms.invrot4.value.scale({ x: sc2, y: sc2, z: sc2 });
    }
    if (uniforms.camMatrixWorld) {
        uniforms.camMatrixWorld.value = camera.matrixWorld;
    }
    const ln = Math.log;
    uniforms._camd.value.x = camera.near;
    uniforms._camd.value.y = 1 / (camera.far - camera.near);
    uniforms._camd.value.z = ln(camera.near);
    uniforms._camd.value.w = 1 / (ln(camera.far) - ln(camera.near));
    camera.position.z = genes._camz;
    camera.fov = genes._fov;
    //if (genes._near === undefined) genes._near = camera.near;
    //if (genes._far === undefined) genes._far = camera.far;
    //camera.near = genes._near;
    //camera.far = genes._far;
    if (renderObjs !== renderVR && !camera.projectionMatrixFixed)
        camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    camera.updateMatrix();
    if (cameraExtratran) {
        camera.matrix.multiply(cameraExtratran);
        camera.matrixAutoUpdate = false;
    }
} // called just before rendering an object, may be used if the uniforms are not quite the same as the genes
var baseprerender = prerender;
function postrender(genes, u) {
} // called just after rendering, may be used to patch anything done by prerender
var WHITE = new THREE.Color();
var BLACK = new THREE.Color().setRGB(0, 0, 0);
/*
Render the scene from the POV of a light into a depth texture
var to make it overridable
**/
var render_depth_shadows = function (genes) {
    if (genes.shadowstrength === 1)
        return; // need to make sure reset
    if (!inputs.SHADOWS)
        return; // no check box asking for shadows
    if (!Shadows)
        return;
    if (renderVR.eye2)
        return;
    if (usemask === 4)
        return;
    if (inputs.SHADOWS)
        Shadows[0].RenderShadow(genes, camera, uniforms); // to track main light
    if (inputs.SHADOWS1)
        Shadows[1].RenderShadow(genes, camera, uniforms); // to track main light
    if (inputs.SHADOWS2)
        Shadows[2].RenderShadow(genes, camera, uniforms); // to track main light
    // Shadows.TrackCamera(genes, camera, uniforms);  // NEEDS to be done twice, to chase up
};
var SHADOWRESDIFF = 2;
var bigdepthclearcol = col3(9999, 9999, 9999);
/* render into depth texture */
function render_depth(genes, drt) {
    // The clear colour shouldn't matter,
    // as every part that can be seen will be.
    // Useful for debug, and if we ever want to render parts of the scene
    // that do not themselves cast shadows
    renderer.setRenderTarget(drt);
    renderer.setClearColor(bigdepthclearcol, 1);
    renderer.clearTarget(drt, true, true, true);
    opmode = OPSHADOWS;
    resdelta = SHADOWRESDIFF; /// <<<<
    // try to do shadown in bulk if possible ... relies on using skeletons and all skeletons being at same resolution
    let bigscene, dradnum, dlennum;
    if (inputs.resdyndeltaui === 0 && inputs.USESKELBUFFER) {
        let rb = inputs.resbaseui - resdelta;
        rb = clamp(Math.ceil(rb), 0, HW.radnums.length - 1);
        dradnum = HW.radnums[rb]; // dynamic number round
        dlennum = dradnum * 5; // dynamic number along, including sphere ends
        if (HW.resoverride.radnum)
            dradnum = HW.resoverride.radnum;
        if (HW.resoverride.lennum)
            dlennum = HW.resoverride.lennum;
        let rbx = "_" + dlennum + "_" + dradnum;
        bigscene = HW.bigsceneSet[rbx];
        if (!bigscene) {
            WA.multiScene(genes, 1, '', false, HW.multiScenedummy, 'nohorn');
            bigscene = HW.bigsceneSet[rbx];
        }
        if (bigscene && bigscene.scene.children.length === 0)
            bigscene = undefined;
    }
    else {
        bigscene = undefined;
    }
    if (bigscene) { // yes, shadown in bulk
        let num = currentHset.horncount;
        HW.multiInstances(bigscene, num); // make sure enough instances
        uniforms.radius.value = 0; // not used, already saved in skeleton, clear to double-check
        uniforms.gbuffoffset.value = 0;
        uniforms.lennum.value = dlennum;
        uniforms.radnum.value = dradnum;
        let mat = getMaterial(genes.tranrule, genes);
        bigscene.scene.children[0].material = mat;
        rrender('bulkshadow', bigscene.scene, render_camera, drt);
    }
    else {
        renderPass(genes, uniforms, drt); // <<<< TODO, this path does not create correct shadows ... ensure bigscene created
    }
    resdelta = 0;
    opmode = OPREGULAR;
}
/** set up sameple shadows */
function quickShadows() {
    currentGenes.light0s = 2;
    currentGenes.light1s = 0.2;
    currentGenes.light2s = 0.2;
    currentGenes.shadowstrength = 0;
    trysetele("SHADOWS", "checked", true);
    baseShaderChanged();
    newframe();
}
var cameraExtratran; // extra transforms to apply to camera
/** render inverted scene into reflection render_target
inversion is actually done by texture offset matrix ( simple Y inversion )
Everything still not exactly right (or even close)
*/
function render_reflection(genes) {
    if (!Water || !Water.m_renderReflection || !Water.m_renderWater)
        return;
    renderer.clearTarget(Water.m_reflectionRenderTexture, true, true, true);
    gl.cullFace(gl.FRONT);
    let plane = new THREE.Vector4(0.0, 1.0, 0.0, -genes.waterHeight); //< plane normal. W is plane height from origin
    // reflect about plane on origin
    alert('check order of set in render_reflection');
    cameraExtratran = new THREE.Matrix4().set((1.0 - 2.0 * plane.x * plane.x), (-2.0 * plane.y * plane.x), (-2.0 * plane.z * plane.x), (-2.0 * plane.w * plane.x), (-2.0 * plane.x * plane.y), (1.0 - 2.0 * plane.y * plane.y), (-2.0 * plane.z * plane.y), (-2.0 * plane.w * plane.y), (-2.0 * plane.x * plane.z), (-2.0 * plane.y * plane.z), (1.0 - 2.0 * plane.z * plane.z), (-2.0 * plane.w * plane.z), 0.0, 0.0, 0.0, 1.0);
    let s = Water.m_renderWater;
    Water.m_renderWater = false;
    // don't render reflections for things under the water
    // set ymax not ymin because all upside-down.
    // Offset for waterAmplitude ,
    // better to have some extra reflections than a gap in reflection.
    // 5 random constant by trial and error
    //
    // nb genes may not have valid water values, copy from uniforms if so
    if (uniforms.waterHeight === undefined) {
        console.error("render_reflection called without genes set up");
    }
    else {
        uniforms.ymax.value = uniforms.waterHeight.value + uniforms.waterAmplitude.value * 5;
        renderPipe(genes, uniforms, Water.m_reflectionRenderTexture, 2, null /*dispobj */); // from render_reflection
    }
    uniforms.ymax.value = 1000000;
    uniforms.ymin.value = -1000000;
    Water.m_renderWater = s;
    gl.cullFace(gl.BACK);
    cameraExtratran = undefined;
}
/** render single object ~~~ NOTE overridden for threek new horns
* called from render_depth, renderPipe, skelbuffer */
function baseRenderPass(genes, uniformsp, rendertarget) {
    if (badshader)
        return;
    // first establish the material
    let mat = getMaterial(appToUse, genes);
    let meshes = scene.children;
    if (meshes.length !== 0 && meshes[0].material !== mat)
        for (let mm = 0; mm < meshes.length; mm++)
            meshes[mm].material = mat;
    COL.set0(genes);
    prerender(genes, uniformsp); // temp ??
    for (let k = genes.ribs0 || 0; k > -1; k--) {
        if (k < 0)
            k = 0; // for final fractional rib
        uniformsp.k.value = k;
        try {
            rrender("baseRenderPass", scene, render_camera, rendertarget);
        }
        catch (e) {
            serious("render failure: ", e);
            badshader = "render failure: " + e;
        }
    }
    postrender(genes, uniformsp);
}
var renderPass = baseRenderPass; // until overwridden
/** check for gl errors, with a choice of one or more actions (just a concatenated string)
logerr: (default) log errors
logall: log all
breakerr: break on errors
breakall: break on every call
*/
function checkglerror(msg) {
    const fmsg = msg + '  opmode=' + opmode + ' ' + oplist[opmode];
    return Gldebug.checkglerr(fmsg);
}
var usemask = usemask !== null && usemask !== void 0 ? usemask : 2; // set to -2 for nothing, -1 very old (no mask), 0 old render (mask), 1 to use opq rendering, 2 multistep opq with improved flu bands
var normloop = 0; // set to 0 or undefined to skip normloop.  loops on normals to improve glossy highlights
var rendertargets = {}; // to hold render targets for opq style render
// let qscene;    // scene for opq style render
var colneg = new THREE.Color(-1, -1, -1); // negative colour used to indicate transparent
var clearrendertargets_exclusions = []; // buffers that won't be cleared
async function clearrendertargets() {
    log('before clearrendertargets, current totsize', newTHREE_DataTextureSize / 1e6);
    const rr = {};
    for (let i in rendertargets) {
        if (i == 'scaleInUnitTarget' || i.startsWith('spring') || (i.startsWith('dispobj_') && !i.startsWith('dispobj_origvnno'))
            || i.startsWith('scaleDamp') || i.startsWith('scaleRender') || clearrendertargets_exclusions.includes(i))
            rr[i] = rendertargets[i];
        else if (rendertargets[i] instanceof THREE.DepthTexture) // todo tidy registration of depthTextures
            rendertargets[i].dispose();
        else
            rendertargets[i].dispose();
    }
    rendertargets = rr;
    log('1 after clearrendertargets, current totsize', newTHREE_DataTextureSize / 1e6, 2);
    await S.frame(2);
    log('2 after clearrendertargets, current totsize', newTHREE_DataTextureSize / 1e6);
    log(Object.keys(rendertargets));
}
function getrendertarget(purpose, p) {
    var _a;
    let sizer = p ? p.sizer : xxxdispobj().rt;
    let widthi = sizer.width, heighti = sizer.height;
    let widthix = widthi, heightix = heighti;
    if (WA.rtoposExtra && purpose === 'rtopos') {
        widthix *= WA.rtoposExtra;
        heightix *= WA.rtoposExtra;
    } // prep for possible special antialias
    let key = purpose + widthix + "x" + heightix;
    let rrtq = rendertargets[key];
    if (!rrtq) {
        let s = widthi * heighti * 16 / 1024 / 1024 / 1024;
        if (s > 0.25)
            log('prepare rendertarget size', widthix, heightix, s, purpose, 'current totsize', newTHREE_DataTextureSize / 1e6);
        const filter = purpose.startsWith('prefxaa') ? WA.fxaa.filter : THREE.NearestFilter;
        const depthBuffer = (_a = p.depthBuffer) !== null && _a !== void 0 ? _a : sizer.depthBuffer;
        rendertargets[key] = rrtq = WebGLRenderTarget(widthix, heightix, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: filter,
            magFilter: filter,
            depthBuffer,
            stencilBuffer: false
        }, key);
        if (depthBuffer) {
            renderTargetDepth(rrtq);
        }
        // NO LONGER SUPPORTED rrtq.shareDepthFrom = p.shareDepthFrom;  // this must be got in early, but can't be set on initial options
        rrtq.texture.generateMipmaps = false;
        if (!uniforms[purpose])
            uniforms[purpose] = { type: "t", value: undefined, framenum };
        if (!uniforms.screen)
            uniforms.screen = { type: "v2", value: new THREE.Vector2(), framenum };
    }
    uniforms[purpose].value = rrtq.texture;
    uniforms.screen.value.x = 1 / widthi; // often (?always) also done in pipeop()
    uniforms.screen.value.y = 1 / heighti;
    renderer.setRenderTarget(rrtq);
    return rrtq;
}
// set shared depth buffer for render target
function renderTargetDepth(rt, ...args) {
    if (!isWebGL2 && !renderer.extensions.get('WEBGL_depth_texture'))
        return;
    let keyd = 'depth' + rt.width + "x" + rt.height;
    let rrtd = rendertargets[keyd];
    if (!rrtd) {
        rendertargets[keyd] = rrtd = new THREE.DepthTexture(rt.width, rt.height);
        rrtd.name = keyd;
        _registerTexture(rrtd, args, rt.width, rt.height, rrtd.format, rrtd.type);
        rrtd.type = isWebGL2 ? THREE.FloatType : THREE.UnsignedInt248Type;
        if (!isWebGL2)
            rrtd.format = THREE.DepthStencilFormat;
        // ??? three.js ignores the type, and deduces the appropriate one from the format ???
        // It seems GL_DEPTH_COMPONENT32 isn't necessarily supported
        // and experimentally gives the same result as 24 bit depth with UnsignedInt248Type
        // so no point in trying to use 32 bit THREE.UnsignedIntType
        // rrtd.type = THREEA.DepthType;
        // rrtd.format = THREEA.DepthType === THREE.UnsignedInt248Type ? THREE.DepthStencilFormat : THREE.DepthFormat;
    }
    rt.depthTexture = rrtd;
    return rrtd;
}
// THREEA.DepthType = THREE.UnsignedIntType;  // not use, see above
var rtoposx = 1; // for perf tests
var gValueForTexscale = "texscale"; // used to make OPTEXTURE compute bump texture
/** perform an operation in pipeline pipeop({genes, opmode: popmode, rendertarget: "?", sizer, clearcol: clearcol }); */
function pipeop(p) {
    if (badshader)
        return;
    if (!p.scene)
        serious("pipeop called without scene");
    let pscene = p.scene;
    let renderTarget = p.rendertarget;
    let genes = p.genes;
    let clearCol = p.clearcol;
    let sizer = p.sizer || renderTarget;
    gValueForTexscale = p.texscale; // || "texscale";
    opmode = p.opmode;
    if (p.depthBuffer === undefined)
        p.depthBuffer = true;
    let mat = getMaterial(genes.tranrule, genes);
    if (pscene === qscene) {
        qscene.children[0].material = mat;
        mat.depthTest = mat.depthWrite = false;
        p.depthBuffer = false;
    }
    assert(pscene.children.length === 1);
    // mucky logic to (temporarily) help debug
    if (pscene.children[0].material !== mat && pscene !== CubeMap.scene) {
        pscene.children[0].material = mat;
    }
    if (renderTarget === "rtopos")
        p.sizer = { width: sizer.width * rtoposx, height: sizer.height * rtoposx };
    if (typeof p.rendertarget === 'string')
        renderTarget = getrendertarget(renderTarget, p);
    if (!uniforms.screen)
        uniforms.screen = { type: "v2", value: new THREE.Vector2(), framenum };
    uniforms.screen.value.x = 1 / (renderTarget ? renderTarget.width : width);
    uniforms.screen.value.y = 1 / (renderTarget ? renderTarget.height : height);
    renderer.setRenderTarget(renderTarget);
    if (clearCol) {
        renderer.setClearColor(clearCol, 0);
        renderer.clearColor();
        //renderer.clear(true,true,true);
    }
    // todo fit this with currentGenes.cutx/y, but doesn't help much anyway
    // TODO maybe this does help, but we need renderTarget.scissor/Test
    if (renderTarget && renderTarget !== pickRenderTarget && renderVR.dx !== undefined) {
        renderTarget.scissorTest = renderVR.scissor;
        let dx = renderVR.dx, dy = renderVR.dy;
        renderTarget.scissor.set(dx, dy, renderTarget.width - 2 * dx, renderTarget.height - 2 * dy);
    }
    if (p.renderPass === CubeMap.RenderPass)
        uniforms.hornid.value = WALLID;
    let OPMODE = opmode;
    // 'many' indicates whether this pass must be repeated for each horn in the hornset
    // or whether the pass involves just one render call
    let many = typeof OPMODE !== 'number' || OPMODE === OPOPOS2COL || OPMODE === OPREGULAR || OPMODE === OPMAKESKELBUFF || OPMODE === OPSHADOWS || OPMODE === OPSHAPEPOS || OPMODE === OPPOSITION || OPMODE === OPPICK;
    many = many || OPMODE === OPOPOS;
    if (many || uniforms.hornid.value === WALLID) {
        p.renderPass(p.genes, uniforms, renderTarget, pscene);
    }
    else {
        uniforms.hornid.value = -1;
        rrender('pipeop', pscene, camera, renderTarget);
    }
}
/** render a single pass using a set of pipe operations, object plus extras (Water, CubeMap)
* renderPipe: called from render_reflection, DOF code and 'regular' display */
function renderPipe(genes, uniformsp, rendertarget, rdelta, dispobj) {
    // HW.setHornColours(genes);
    rrender.last = 9999;
    // clear depths on all the intermediate rendertargets that are about to be used
    // we need to make sure the depths are passed between the horn phase and the wall phase
    // so more complicated to clear them within renderObjPipe
    if (rendertarget) // todo check there should only be a single shared one???
        for (let t in rendertargets) {
            let rt = rendertargets[t];
            if (rt.depthBuffer && rt.width === rendertarget.width && rt.height === rendertarget.height) {
                renderer.setRenderTarget(rt);
                renderer.clearDepth();
            }
        }
    renderer.setRenderTarget(rendertarget);
    renderer.clearDepth();
    if (!HW.nohorn) // TODO >>>  (in wrong place, need to consider shadows)
        renderObjPipe(scene, renderPass, genes, uniformsp, rendertarget, rdelta, usemask, dispobj);
    // VERY experimental pass for rendering extra objects
    // lots of limitations, such as colour, etc, etc
    let tranrule = genes._extratranrule;
    if (tranrule)
        extraRender({ tranrule, scene, renderPass, genes, uniformsp, rendertarget, rdelta, usemask });
    if (!HW.cubeEarly && CubeMap && CubeMap.renderState !== 'color')
        renderObjPipe(CubeMap.wallScene, CubeMap.RenderPass, genes, uniformsp, rendertarget, rdelta, usemask, dispobj);
    if (Water)
        Water.Render(genes, render_camera, rendertarget);
}
var qscene = newscene('qscene');
{
    let g = new THREE.PlaneGeometry(4, 4);
    let m = new THREE.Mesh(g);
    m.frustumCulled = false;
    qscene.add(m);
}
/** render a single pass using a set of pipe operations, object plus extras (Water, CubeMap)
* renderPipe: called from render_reflection, DOF code and 'regular' display */
function renderObjPipe(pscene, prenderPass, genes, uniformsp, rendertarget, rdelta, usemaskp, dispobj) {
    var _a;
    /** call pipeop with correct renderPass function */
    function ipipeop(p) {
        p.renderPass = prenderPass;
        pipeop(p);
    }
    /** process any special functions, and then aa */
    function ipipeopEndup(p) {
        let temprt;
        if (WA.fxaa.use || specialPostrender) {
            const dobj = dispobj; //  ?? xxxdispobj(p.genes);
            assert(p.rendertarget === dobj.rt || renderer.xr.isPresenting, 'check reuse of rt for fxaa');
            // temprt = dobj.rtback;
            temprt = getrendertarget('prefxaa', { sizer });
            //renderer.setRenderTarget(temprt); // breaks if temprt is feedback texture
            //renderer.clearColor();
        }
        if (WA.fxaa.use) {
            const pp = Object.assign({}, p, { rendertarget: temprt }); // , clearcol: bigcol}); now just clear ar start of phase so CSynth matrix does not kill ribbon
            ipipeop(pp);
            if (specialPostrender)
                specialPostrender(temprt, rendertarget);
            WA.fxaa(temprt.texture, rendertarget);
        }
        else {
            ipipeop(p);
            if (specialPostrender)
                specialPostrender(rendertarget, temprt);
        }
    }
    resdelta = rdelta || 0;
    // U.feedtexture = (_fixinfo.feedrt ?? xxxdispobj(genes).rtback).texture;  // was null
    U.feedtexture = ((_a = _fixinfo.feedrt) !== null && _a !== void 0 ? _a : dispobj.rtback).texture; // was null
    gl.depthFunc(gl.LEQUAL); // unless overridden
    // prepare scene if not already prepared
    let sizer = rendertarget || canvas; // canvas is default rendertarget, used for size
    // render pass to make buffer containing enough data to
    //   1) decide which horn where and do z work
    //   2) identify horn generation source details so we can do details and shading in OPOPOS2COL
    // With usemaskp = -1 or 0 we lose the sharp ribbing effect derived from normals, as expected.
    // With usemaskp = -1 or 0 and USESKELBUFFER the ribs are phase shifted, why ???
    // With usemask = 1.5 we get very odd texture effects caried over from previous frame
    if (usemaskp === 0) {
        // gl.depthFunc(gl.LEQUAL);    // explicity confirm default LEQUAL
        // perform cheap prerender for deferred rendering, usemask < 0 will skip this:
        // this pass just to establish depth, no need for output if we could avoid it,
        // XXXWRONG 20/04/2020 and output must NOT go to rendertarget; ??? doesn't matter, will be overwritetn anyway
        // OPSHADOWS or OPOPOS are cheap ways to get the depth
        // either OPOPOS or OPSHADOWS should be pretty similar here, the only point is to set the depth buffer cheaply
        // however, OPOPOS does not behave as we would expect/want
        // this seems to be associated partly with USESKELBUFFER, and also with ribbing.
        // with USESKELBUFFER, OPOPOS gives different colours, but OK at sphere ends!
        // With G.ribdepth = 0 OPOPOS works correctly with or without USESKELBUFFER
        // NOTE, setting depth this way is dangerous now three.js supports depth 'properly'
        // however we are getting away with it for now as three doesn't notice and so doesn't do its settings
        // transfer what should be 'properly' via scene material does not work as scene may be changed before it is used!
        // shadows use logdepth by default
        const s = uniforms.USELOGDEPTH.value;
        uniforms.USELOGDEPTH.value = 9999;
        ipipeop({ genes, opmode: WA.forceop || OPSHADOWS, rendertarget, sizer, clearcol: colneg, scene: pscene });
        uniforms.USELOGDEPTH.value = s;
        gl.depthFunc(gl.EQUAL);
        //pscene.children[0].material.depthFunc = THREE.EqualDepth;
        // <<< does not work because meterial is about to be switched
        // need to pass depth function throught the structure and apply to the correct material
        ipipeopEndup({ genes, opmode: OPREGULAR, rendertarget, clearcol: 5, scene: pscene });
        //pscene.children[0].material.depthFunc = THREE.LessEqualDepth;
        gl.depthFunc(gl.LEQUAL);
    }
    else if (usemaskp === -99) { // special case for hidden wireframe
        // this gets some lines we certainly don't want (diagonals over mesh elements)
        // and misses many we do (polygon/polygon intersections)
        WA.fxaa.use = false;
        WA.usewireframe = true;
        // if (!inps.SIMPLESHADE) onframe(() => inps.SIMPLESHADE = true);
        inps.renderRatioUi = 1;
        const snear = camera.near;
        if (WA.camoffset === undefined)
            WA.camoffset = 0.001; // gl.EQUAL does not get everything, maybe difference between line and area interpolations.
        inps.doAutorot = false;
        ipipeop({ genes, opmode: WA.forceop || OPOPOS, rendertarget, sizer, clearcol: colneg, scene: pscene });
        if (WA.camoffset) {
            camera.near *= 1 + WA.camoffset;
            camera.updateProjectionMatrix();
        }
        ipipeopEndup({ genes, opmode: OPREGULAR, rendertarget, clearcol: bigcol, scene: pscene });
        if (WA.camoffset) {
            camera.near = snear;
            camera.updateProjectionMatrix();
        }
    }
    else if (usemaskp === 4 || usemaskp === -97) { // special case for edge
        // WA.fxaa.use = false;
        if (usemaskp === 4) {
            ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
            ipipeopEndup({ genes, opmode: OPEDGE2, rendertarget, scene: qscene });
        }
        else {
            // U.OPOSZ = 2
            ipipeopEndup({ genes, opmode: OPOPOS, rendertarget, sizer, clearcol: colneg, scene: pscene });
        }
    }
    else if (usemaskp === -1 || usemaskp === -2) {
        ipipeopEndup({ genes, opmode: OPREGULAR, rendertarget, scene: pscene });
    }
    else if (usemaskp === 'pick') {
        ipipeop({ genes, opmode: OPPICK, rendertarget, scene: pscene });
    }
    else if (usemaskp === 1 || usemaskp === 5) { // 5 for debug convenience
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeopEndup({ genes, opmode: OPOPOS2COL, rendertarget, scene: qscene });
    }
    else if (usemaskp === 1.5) { // n.b. this gives better normals than usemask=1, but texture positioned wrong (27/2/2017)
        // perform separated Q3
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer, scene: qscene, clearcol: colneg });
        ipipeopEndup({ genes, opmode: OPTSHAPEPOS2COL, rendertarget, scene: qscene });
    }
    else if (usemaskp === 2) { // n.b. this gives much better fluorescent bands than usemask === 1 or 1.5
        // perform separated Q3
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer, scene: qscene, clearcol: colneg });
        if (normloop) // e.g. for 3x3 normal smooth
            ipipeop({ genes, opmode: OPBUMPNORMAL, rendertarget: 'rtnormal', sizer, scene: qscene });
        ipipeop({ genes, opmode: OPTEXTURE, rendertarget: 'rttexture', sizer, scene: qscene });
        ipipeopEndup({ genes, opmode: OPTSHAPEPOS2COL, rendertarget, scene: qscene, clearcol: bigcol });
        // if (WA.fxaa.use) {
        //     ipipeop({ genes, opmode: OPTSHAPEPOS2COL, rendertarget: 'prefxaa', sizer, scene: qscene, clearcol: bigcol });
        //     WA.fxaa(getrendertarget('prefxaa', {sizer}).texture, rendertarget);
        // } else {
        //     ipipeop({ genes, opmode: OPTSHAPEPOS2COL, rendertarget, scene: qscene });
        // }
    }
    else if (usemaskp === 3) {
        // perform separated Q3
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer, scene: qscene, clearcol: colneg });
        ipipeop({ genes, opmode: OPTEXTURE, rendertarget: 'rtbumptexture', sizer, scene: qscene, texscale: "bumpscale" });
        if (normloop) // e.g.for 3x3 normal smooth:
            ipipeop({ genes, opmode: OPBUMPNORMAL, rendertarget: 'rtnormal', sizer, scene: qscene });
        ipipeop({ genes, opmode: OPTEXTURE, rendertarget: 'rttexture', sizer, scene: qscene });
        ipipeop({ genes, opmode: OPTSHAPEPOS2COL, rendertarget, scene: qscene });
    }
    else if (usemaskp === 111) { // debug, performance, (or ml) just OPOPOS direct to output
        ipipeop({ genes, opmode: OPOPOS, rendertarget, sizer, clearcol: colneg, scene: pscene });
    }
    else if (usemaskp === 112) { // debug, performance, (or ml) OPOPOS and OPSHAPEPOS direct to output
        // TODO does not work fully as many of the outputs are <0 and get trucated
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes, opmode: OPSHAPEPOS, rendertarget, sizer, scene: qscene, clearcol: colneg });
    }
    else if (usemaskp === 124) { // fft test
        ipipeop({ genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes, opmode: OPOPOS2COL, rendertarget, scene: qscene, clearcol: colneg });
        let xxx = getrendertarget('fftin', sizer);
        fft.renderFFT(rendertarget, xxx);
        fft.renderFFT(xxx, rendertarget, true);
    }
    else {
        // -2 do nothing
    }
    //    opmode = 'undefinedopmode';
    opmode = OPREGULAR;
    gl.depthFunc(gl.LEQUAL); // unless overridden
    //checkglerror("renderpass " + oplist[opmode]);
}
// debug function to compare q render vs standard render
var testq = function () { usemask = 0; setTimeout(function () { usemask = 2; }, 2000); };
var hideMainObj = false;
/** switch via Maestro to ensure correct application called on renderObj
* switch to renderObj<appToUse>,  eg renderObjHorn
* This will not render directly into the screen:
* it will render into a viewport specific renderTarget
* */
function renderObj(dispobj, rt, checkrtsize = true) {
    if (hideMainObj) {
        renderer.setClearColor('black');
        renderer.setRenderTarget(xxxdispobj().rt);
        renderer.clear();
        return;
    }
    const g = dispobj.genes;
    const s = {}; // saved values
    if ('_Special' in g) {
        if ('_GPUSCALE' in g) {
            s._GPUSCALE = inputs.GPUSCALE;
            inputs.GPUSCALE = g._GPUSCALE;
        }
        if ('_NOSCALE' in g) {
            s._NOSCALE = inputs.NOSCALE;
            inputs.NOSCALE = g._NOSCALE;
        }
        if ('_NOCENTRE' in g) {
            s._NOCENTRE = inputs._NOCENTRE;
            inputs.NOCENTRE = g._NOCENTRE;
        }
        if ('_boxsize' in g) {
            s._boxsize = _boxsize;
            _boxsize = g._boxsize;
        }
    }
    // sometimes needed for multiple tranrules ???
    if (g.gscale)
        uniforms.gscale.value = g.gscale;
    if (g._gcentre)
        uniforms.gcentre.value.copy(g._gcentre);
    try {
        _renderObjInner(dispobj, rt, checkrtsize);
    }
    catch (e) {
        console.error('error in renderObj', e.message);
    }
    finally {
        if ('_Special' in g) {
            if ('_GPUSCALE' in g) {
                inputs.GPUSCALE = s._GPUSCALE;
            }
            if ('_NOSCALE' in g) {
                inputs.NOSCALE = s._NOSCALE;
            }
            if ('_NOCENTRE' in g) {
                inputs.NOCENTRE = s._NOCENTRE;
            }
            if ('_boxsize' in g) {
                _boxsize = s._boxsize;
            }
        }
    }
}
function _renderObjInner(dispobj, rt, checkrtsize = true) {
    if (!dispobj || !dispobj.visible)
        return;
    if (rt === "canvas") { // special case to allow direct render to canvas
        renderer.setRenderTarget(null);
        rt = undefined;
        rendererSetViewportCanv(0, 0, width, height);
    }
    else {
        if (!rt)
            rt = dispobj.rt; // usual case, rt only specified for image snap
        const maxt = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const rr = dispobj.vn === mainvp ? renderRatioProj : renderRatio;
        if (checkrtsize && slots[dispobj.vn] && !isDragobj(dispobj) && rt.width < maxt && rt.height < maxt &&
            rt.width < slots[dispobj.vn].width / rr - 2) { // check size, tiny margin for nonstandard viewport sizes
            if (dispobj.vn === 0 && renderVR.addSlot0) {
                log("correct render target 0 in vr recording too small");
                rt = dispobj.rt = WebGLRenderTarget(slots[dispobj.vn].width / rr, slots[dispobj.vn].height / rr, undefined, 'special vr record rt');
            }
            else {
                log("render target too small");
            }
            //debugger;
        }
        // deferred till skeletons and shadows done
        // if (CubeMap) CubeMap.renderfeedback(dispobj);
        renderer.setRenderTarget(rt);
        rendererSetViewportCanv(0, 0, rt.width, rt.height); // seems setViewport works in scaled coords, not canvas
    }
    // always render with clear background
    renderer.setClearColor(bigcol, 1); // alpha was 0, but did not work with WebGL2
    // debug for Firefoxx Nightly, no ANGLE
    /**
    let rc = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (rc !== gl.FRAMEBUFFER_COMPLETE) {
        log("wrong framebuffer status ", rc, findval(gl, rc));
        msgfix("wrong framebuffer status", '<b style="color:red">' + rc + findval(gl, rc) + '</b>');
        gl.bindTexture(gl.TEXTURE_2D, null);  // looks as if it has already been done, but ...???
    }
    **/
    renderer.clearTarget(rt, true, true, true);
    // not sure how often this is needed, but needed to steop matrix on ribbon off displayin old ribbon
    // TODO check real rules for fxaa and its relationship to any extra renders
    if (WA.fxaa.use)
        renderer.clearTarget(getrendertarget('prefxaa', { sizer: rt }), true, true, true); // clear once, not per phase (eg if matrix extra render phase)
    Maestro.trigger("prerenderObj", { dispobj: dispobj, rendertarget: rt });
    if (renderMainObject && !searchValues.nohorn)
        Maestro.trigger("renderObj", { dispobj: dispobj, rendertarget: rt });
}
var lastTime = 0;
/************** constrain genes to reduce blanks, obsolete *
function constrainGenes(genes) {
    return; //
    let r = 0;
    // note sjpt 12/122016 , this code was broken with use of material key, maybe mended but pretty much dead anyway???
    if (!material.shadows || !material.shadows[currentGenes.tranrule]) return;
    let ugenes = material.shadows[currentGenes.tranrule].genes;
    if (!ugenes) return;
    for (let gn in genes) if (gn.endsWith("_radius") && ugenes[gn])
        r += genes[gn];
    if (r < 10) {
        //log("Radius coerced", r);
        //for (let gn in genes) if (gn.endsWith("_radius")) genes[gn] = 50;
    }
}
************************/
var lastGenes = {}; // to force rescale e.g. of object dragged onto mainvp
/** render object into viewport,
 * 'safe' version to verify/prevent incorrect use of currentGenes
 * also allow for interp alternative
 */
var interp, interptest, setHornColours;
var renderObjHorn = function (event) {
    let parms = event.eventParms; // collect input from event in sensible form
    let dispobj = parms.dispobj;
    let genes = dispobj.genes;
    let realtr = genes.tranrule;
    const s = [currentGenes, genes, genes.tranrule, setHornColours];
    try {
        if (inps.useinterp) { // use interpreter version
            genes.tranrule = interp.basetranrule;
            setHornColours = () => { };
            interptest(realtr, genes);
            genes.tranrule = interp.basetranrule;
        }
        console.assert(currentGenes === slots[mainvp].dispobj.genes); // currentGenes checks
        currentGenes = undefined;
        if (inps.useguibox) { // override genes with guibox genes
            genes = Object.assign({}, genes, guiboxgenes);
        }
        return _renderObjHorn(parms, dispobj, genes);
    }
    finally {
        console.assert(currentGenes === undefined);
        [currentGenes, dispobj.genes, dispobj.genes.tranrule, setHornColours] = s;
        if (inps.useinterp)
            setHornColours(genes);
    }
};
/** render object into viewport */
var _renderObjHorn = function (parms, dispobj, genes) {
    if (!(genes === null || genes === void 0 ? void 0 : genes.tranrule))
        return;
    let hset = currentHset = HW.getHornSet(genes);
    // constrainGenes(genes);  // not used at the moment, and should be called higher up less often if reinstated
    let vn = dispobj.vn;
    if (typeof vn !== 'number')
        return; // in rare cases getHornSet(genes) could interpret the tranrule and rebuild the dispobjs (eg via setSize)
    setObjUniforms(genes, uniforms);
    // if (slots[vn].dispobj !== dispobj) {  // note, this is false for saveimage
    //     //    log("query dispobj", vn, slots[vn].dispobj.xid, dispobj.xid); return;
    // }
    // prepare scaling
    if (!(inputs.NOCENTRE && inputs.NOSCALE)) {
        let whichRange = vn === mainvp || genes === currentGenes || renderObjs === renderVR ? "main" : "now";
        if (whichRange === "now" || lastGenes[whichRange] !== genes || framenum < 3) {
            //if (whichRange === "main")
            //    log("dispobj", dispobj.xid, whichRange, dispobj.vn);
            if (renderObjHorn.centreOnDisplay) {
                centrescale(genes, whichRange, 1, false); // force immediate, but do not upset G._uScale
            }
            lastGenes[whichRange] = genes;
        }
        uniforms.scaleDampTarget.value = condTexture(uniforms.scaleDampTarget[whichRange]);
    }
    //log("renderObj " + vn);
    let rendertarget = parms.rendertarget;
    if (badshader)
        return;
    HW.setHornColours(genes);
    prerender(genes, uniforms);
    scene.overrideMaterial = null; // ? not needed     // NO, scene should not be used by Horn any more
    render_camera = camera;
    uniforms.vn.value = vn * 1.0;
    // do the setup stuff, only for the first eye in VR
    if (!renderVR.eye2) {
        renderskelbuff(genes);
        if (usemask !== 4) {
            render_depth_shadows(genes);
            render_reflection(genes);
            cMap.renderFeedback(dispobj);
        }
    }
    renderer.setRenderTarget(null);
    // render dof
    const DOF = W.DOF;
    if (DOF && DOF.useDOF) {
        // careful to reset the background color
        renderer.setClearColor(vn === 0 ? bigcol : dispobj.selected ? selcol : noselcol, 1);
        renderer.clearTarget(DOF.rtTextureColor, true, true, true);
        opmode = OPSHADOWS;
        renderPipe(genes, uniforms, DOF.rtTextureColor, 0, dispobj); // called for DOF
        opmode = OPREGULAR;
        render_depth(genes, DOF.rtTextureDepth);
        DOF.Render(renderer, rendertarget);
    }
    else {
        renderPipe(genes, uniforms, rendertarget, 0, dispobj); // called for renderObjHorn
    }
    if (geometry.tidy)
        geometry.tidy(); // it will now be safely established, but may not have tidy (THREE.Geometry ???)
    postrender(genes, uniforms);
    // prepare hoverMessage message and display
    const cc = hset.cumcount;
    dispobj.hoverMessage = `runs=${cc.length - 3} horns=${hset.horncount} ${cc[cc.length - 1]}`;
    if (dispobj === hoverDispobj)
        W.hovermessage.innerHTML = dispobj.hoverMessage;
};
renderObjHorn.centreOnDisplay = true; // until set false by Director
// </editor-fold>
var skelbuffer; // skelbuffer
/** render into skelbuffer */
function renderskelbuff(genes) {
    if (!inputs.USESKELBUFFER)
        return;
    if (renderVR.eye2)
        return;
    opmode = OPMAKESKELBUFF;
    let sdotty = HW.dotty;
    HW.dotty = true;
    //renderPass(genes, uniforms); // debug
    //renderPass(genes, uniforms, skelbuffer);  // <<<<<<<<<<<<<<<<<<<<<!!!!!!!!!!!!!!!!!!!!!!!!! if !skelbuffer ????
    try {
        // generate skelbuffer if necessary
        if (!skelbuffer || uniforms.skelbufferRes.value.x !== skelbuffer.width || uniforms.skelbufferRes.value.y !== skelbuffer.height) {
            if (skelbuffer) {
                skelbuffer.dispose();
                skelbuffer = undefined;
            }
            log('new skelbuffer', uniforms.skelbufferRes.value.x, uniforms.skelbufferRes.value.y, 'frame', framenum);
            let filter = THREE.LinearFilter;
            filter = THREE.NearestFilter; // for cubic
            //if (W.xxxx) filter = xxxx;  // debug
            skelbuffer = WebGLRenderTarget(uniforms.skelbufferRes.value.x, uniforms.skelbufferRes.value.y, {
                minFilter: filter,
                magFilter: filter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                type: THREE.FloatType
            }, 'skelbuff');
            //type: THREE.UnsignedByteType} );
            skelbuffer.texture.generateMipmaps = false;
            // now we have a useful skelbuffer and know the sizes, render properly
            // marginally wasteful, but only applies when buffer sizes change
            // and saves a horrible bad frame where the skeleton used the wrong skelbuffer
            renderPass(genes, uniforms, skelbuffer);
        }
        renderPass(genes, uniforms, skelbuffer); // <<<<<<<<<<<<<<<<<<<<<!!!!!!!!!!!!!!!!!!!!!!!!! if !skelbuffer ????
    }
    finally {
        HW.dotty = sdotty;
        opmode = OPREGULAR;
        if (!uniforms.skelbuffer)
            uniforms.skelbuffer = { type: "t", value: skelbuffer.texture, framenum };
        if (!uniforms.gbuffoffset)
            uniforms.gbuffoffset = { type: "f", value: 0., framenum };
        uniforms.skelbuffer.value = skelbuffer.texture;
    }
}
/** change res old style */
var setRes = function (r, r2 = r * 5) {
    radnum = r;
    uniforms.radnum.value = radnum;
    uniforms.lennum.value = lennum;
    let vars = document.getElementById("vars");
    if (vars)
        vars.innerHTML = "lennum = " + lennum + ", radnum = " + radnum + ";";
    trysetele("res" + r, "checked", true);
    sceneCode();
    saveInputToLocal();
    refall();
};
/** change res, new style */
function newres() {
    //res base = W.resbaseui.value * 1;
    //res dyndelta = W.resdyndeltaui.value * 1;
    refall();
}
/* use the contents of tranrule to set the currentGenes tranrule, or 'default' if no tranrule */
function currentMaterialChanged() {
    currentGenes.tranrule = target.tranrule = getGUITranrule();
}
/** conditional change of material only, on ctrl-enter */
function cchangeMat(evt) {
    let box = evt.target;
    box.autosize();
    try {
        let ff = funtry(box.value);
        if (evt && evt.ctrlKey && evt.code === 'Enter') {
            inputs[box.id] = box.value;
            if (box === W.tranrulebox)
                changeMat(undefined, evt.shiftKey);
            else if (box === W.directorrulebox)
                Director.updateRules();
            else
                serious("cchangeMat called with unexpected box " + box);
        }
        box.style.backgroundColor = (inputs[box.id] === box.value) ? "" : "#fc4";
    }
    catch (e) {
        box.style.backgroundColor = "#fcc";
    }
}
/** change the material using tranrulebox, optionally set and optionally force genes
always perform while in gl context */
var changeMat = function (trule, force) {
    changeMat.oldgenes = clone(currentGenes);
    changeMat.oldgenedefs = clone(genedefs);
    //pending, for all genes taken from tranrule
    //currentGenes = {};
    //genedefs = {};
    if (!gl) {
        onnextframe(function () { changeMat(trule, force); });
        return;
    }
    if (trule) {
        if (typeof trule === "function")
            trule = (trule + "%%%").toString().post("{").replace("}%%%", "");
        setInput(W.tranrulebox, trule);
        $('#tranrulebox').trigger("change");
    }
    if (force) {
        clearPostCache('changemat force postCache');
        HW.setHornSet();
        forcerefresh = true;
    }
    badshader = false; // we hope
    //???    testmaterial.test(W.tranrulebox.textContent); // to check, this causes an invalid material.opos entry. whey ???
    if (badshader)
        return false;
    currentMaterialChanged();
    // below needed if genedefs/genes cleared at beginning, effectively nop if they were not cleared
    // Should be unnecessary if cleangenes etc properly allow for permgenes, but ...
    for (let gn in permgenes) {
        if (!genedefs[gn])
            genedefs[gn] = changeMat.oldgenedefs[gn];
        if (currentGenes[gn] === undefined)
            currentGenes[gn] = changeMat.oldgenes[gn];
    }
    // scale();  // leave this till render time
    filterGuiGenes();
    reshowGenes();
    HW.updateHTMLRules(currentGenes);
    refall();
    W.tranrulebox.autosize();
    target = {};
    return true;
};
/** base shader change, on ctrl-enter - replaced by CodeMirror version? */
function cchangeBaseShader(evt) {
    if (evt.ctrlKey && getkey(evt) === 'Enter')
        baseShaderChanged();
}
var dispobjMipmaps = false;
var despeckle = 2; // clamp value to reduce sparkle
// var copymaterial;
var copyvert; //  = fetch("shaders/copy.vs");
var copyfrag; // = fetch("shaders/copy.fs");
var copyfragx; // = fetch("shaders/copyX.fs");
/** Dispobj class for displayable objects */
class Dispobj {
    constructor() {
        this.toString = function () { return "Dispobj { vn=" + this.vn + "}"; };
        /** distance from me to another */
        this.dist = function (xxx2) {
            let d2 = xxxdispobj(xxx2);
            return Math.sqrt(sq(this.cx - d2.cx) + sq(this.cy - d2.cy));
        };
        // placeatslot = function (vn) {
        //     this.cx = slots[vn].dispobj.cx;
        //     this.cy = slots[vn].dispobj.cy;
        // };
        this.Init = function () {
            //log("init dispobj, rr=" + renderRatio);
            this.setUniforms();
            //this.renderRatio = renderRatio;
            //let pre = "#define R 0.5\n#define S " + renderRatio + "\n";
            //if (renderRatio >= 1)
            //    pre = "#define DESPECKLE\n#define R 0.\n#define S 1.\n";
            if (!copyvert)
                copyvert = getfiledata("shaders/copy.vs");
            if (!simplemode && !copyfrag)
                copyfrag = getfiledata("shaders/copy.fs");
            if (simplemode && !copyfragx)
                copyfragx = getfiledata("shaders/copyX.fs");
            let pre = ""; // may use #define again in future
            let materiali = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                // vertexShader: getfiledata("shaders/copy.vs"),
                // // note, conditional below as we sometimes need to use copyX.fs for debugging
                // fragmentShader: pre + "\n" + getfiledata(simplemode ? "shaders/copyX.fs" : "shaders/copy.fs"),
                vertexShader: copyvert,
                fragmentShader: pre + "\n" + (simplemode ? copyfragx : copyfrag),
                side: THREE.FrontSide
            });
            // depth test is needed to separte the highlight background from the possible highlight
            // materiali.depthTest = materiali.depthWrite = false;
            materiali.name = 'dispobjMateriali';
            //renderer.initMaterial(material, []); // may help debug; beware fixed uniforms, or not gl context
            let geometryi = new THREE.PlaneGeometry(1, 1);
            let lmain = new THREE.Mesh(geometryi, materiali); // 'main' confuses NetBeans
            geometryi = new THREE.PlaneGeometry(1, 1);
            let back = new THREE.Mesh(geometryi);
            back.material.name = 'dispobj back'; // THREEA
            //let geometry = new THREE.PlaneGeometry(1, 1);
            //let border = new THREE.Mesh( geometry );
            lmain.frustumCulled = false;
            back.frustumCulled = false;
            this.scene = newscene("rendertargetScene");
            this.scene.addX(lmain);
            this.scene.main = lmain;
            this.scene.addX(back);
            this.scene.back = back;
            this.scene.dispobj = this;
            //this.scene.addX(border);  this.scene.border = border;
            this.visible = true;
        };
        /** mainly for debug, force recompile of copy shader */
        this.renew = function () {
            clearPostCache('disopobj renew force postCache');
            this.visible = false;
            this.Init();
            this.visible = true;
            badshader = false; // we hope
        };
        this.render = function (n = 0) {
            if (isNaN(this.needsRender)) {
                console.error('needsrender is nan, patched for ', this.vn);
                this.needsRender = 1;
            }
            this.needsRender = Math.max(+this.needsRender, n || (cMap.renderMap ? 10 : this._rts ? 2 : 1));
        };
        this.dispose = function () {
            this.scene.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
            if (this._rts)
                this._rts.forEach(r => r.dispose());
            if (this._renderTarget && rendertargets[this._renderTarget.name])
                this._renderTarget.dispose(); // _renderTarget may be same as _rts[?]
            this._rts = this._renderTarget = undefined;
        };
        this.tune = function (rt) {
            // make sure aspect ratio comes out the same on render target and viewport
            // this can be wrong eg where mainvp shares render target with projvp, but they have different aspect ratios
            // (or on any other vp where the aspect might get wrong in future)
            const genes = this.genes;
            if (!genes)
                return; // preparing for mutation
            this.uniforms.textureToUse.value.y = this.uniforms.textureToUse.value.x = 1;
            let ardiff = (this.width / this.height) / (rt.width / rt.height);
            if (ardiff > 1)
                this.uniforms.textureToUse.value.y = 1 / ardiff;
            if (ardiff < 1)
                this.uniforms.textureToUse.value.x = ardiff;
            this.uniforms.textureToUse.value.x *= copyXflip;
            let intex = (this.overwritedisplay || rt); // allow overwrite by texture or by rendertarget
            if (intex.texture)
                intex = intex.texture;
            this.uniforms.intex.value = intex;
            //this.uniforms.intex.value = rt.texture;
            this.uniforms.res.value.x = rt.width;
            this.uniforms.res.value.y = rt.height;
            this.uniforms.despeckle.value = despeckle;
            this.uniforms.renderRatio.value = renderRatio;
            //this.uniforms.R.value = 0.51 / renderRatio - 0.5; // 0.51 to allow rounding
            //this.uniforms.R.value = Math.ceil(0.51 / renderRatio);
            this.uniforms.R.value = (0.49 / renderRatio); // for valAVG in copy shader
            this.uniforms.S.value = 1;
            //this.uniforms.R.value = 1.01;
            this.uniforms.zoom.value = Dispobj.zoom;
            let ulx = FIRST(Dispobj.fixlayerx, oldlayerX);
            let uly = FIRST(Dispobj.fixlayery, oldlayerY);
            let yy = (height - uly - this.bottom) / this.height;
            let xx = (ulx - this.left) / this.width;
            if (copyXflip === -1)
                xx = 1 - xx;
            this.uniforms.zoompos.value.set(xx, yy);
            //msgfix('zoom', (oldlayerX-this.left)/this.width, yy, this.bottom, this.top, oldlayerY, height-oldlayerY);
            //this.uniforms.R.value = 1; // 0.51 to allow rounding
            //this.uniforms.S.value =  this.uniforms.R.value/1;
            this.uniforms.outpower.value = 1 / +genes.gamma;
            this.uniforms.bwthresh.value = this.genes ? this.genes.bwthresh : 0.25;
            this.uniforms.bwuse.value = inputs.bwset ? 1 : 0;
            this.uniforms.distortpixk.value = genes.distortpixk;
            this.uniforms.softt.value = genes.softt;
            this.uniforms.screenR.value = genes.screenR;
            this.uniforms.screenG.value = genes.screenG;
            this.uniforms.screenB.value = genes.screenB;
            // these should not really be genes, only genes for sliders, copy to other objects so shared
            if (genes.gamma) {
                for (let o in slots) {
                    if (!slots[o])
                        continue;
                    let g = slots[o].dispobj.genes;
                    if (!g)
                        continue;
                    g.gamma = genes.gamma;
                    g.screenR = genes.screenR;
                    g.screenG = genes.screenG;
                    g.screenB = genes.screenB;
                    g.projGamma = genes.projGamma;
                    g.projR = genes.projR;
                    g.projG = genes.projG;
                    g.projB = genes.projB;
                    g.softt = genes.softt;
                }
            }
            if (slots[-1] && this.vn === mainvp) {
                //slots[-1].dispobj.rt = this.rt;
                let u = slots[-1].dispobj.uniforms;
                u.despeckle.value = despeckle;
                u.res.value.x = rt.width;
                u.res.value.y = rt.height;
                u.renderRatio.value = renderRatio;
                u.R.value = this.uniforms.R.value;
                u.S.value = this.uniforms.S.value;
                u.intex.value = this.uniforms.intex.value;
                u.outpower.value = 1 / +genes.projGamma;
                u.bwthresh.value = this.genes.bwthresh;
                u.bwuse.value = inputs.bwset ? 1 : 0;
                u.screenR.value = genes.projR;
                u.screenG.value = genes.projG;
                u.screenB.value = genes.projB;
                // keystone and rotation
                // UI for projection, http://jsfiddle.net/dFrHS/1/ for help on that
                // or http://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/  neater but coffeescript
                // Also see mirror code (when written!)
                let m = u.xmatrix.value;
                let h = 0.5;
                let c = Dispobj.corners;
                let t = general2DProjection(c[0].x, c[0].y, -h, -h, c[1].x, c[1].y, -h, h, c[2].x, c[2].y, h, -h, c[3].x, c[3].y, h, h);
                for (let i = 0; i !== 9; ++i)
                    t[i] = t[i] / t[8];
                m.set(t[0], t[1], 0, t[2], t[3], t[4], 0, t[5], 0, 0, t[8], 0, t[6], t[7], 0, t[8]);
                m.copy(m).invert();
            }
        };
        this.setUniforms = function () {
            this.uniforms = {
                intex: { type: 't' },
                despeckle: { type: 'f' },
                renderRatio: { type: 'f' },
                R: { type: 'f' },
                S: { type: 'f' },
                softt: { type: 'f' },
                outpower: { type: 'f' },
                bwthresh: { type: 'f' },
                bwuse: { type: 'f', value: 0 },
                screenR: { type: 'f' },
                screenG: { type: 'f' },
                screenB: { type: 'f' },
                distortpixk: { type: 'f' },
                res: { type: 'v2', value: new THREE.Vector2(0, 0) },
                zoom: { type: 'f', value: 0 },
                zoompos: { type: 'v2', value: new THREE.Vector2(0.5, 0.5) },
                textureToUse: { type: 'v2', value: new THREE.Vector2(1, 1) },
                xmatrix: { type: 'm4', value: new THREE.Matrix4() }
            };
        };
        this.mmm = new THREE.Matrix4(); // for reuse of temp matrix;
        this.createDate = this.lastTouchedDate = Date.now();
        this.cx = this.cy = this.height = this.width = 0;
        this.xid = "do_" + (nextDispobjId++);
        this.Init(); // prepare the scene
        this.hoverMessage = '';
        this.needsRender = 0;
        return this;
    }
    static get usebyte() { return Dispobj._usebyte; }
    ;
    static set usebyte(v) {
        Dispobj._usebyte = v;
        for (const dobj in currentObjects) {
            currentObjects[dobj].dispose();
        }
        if (rendertargets[bigrt])
            bigrt.dispose(); // may/should have been disposed as part of a currentObject
        bigrt = "notsetyet";
    }
    get left() { return this.cx - this.width / 2; }
    ;
    get right() { return this.cx + this.width / 2; }
    ;
    get top() { return this.cy + this.height / 2; }
    ; // measured from BOTTOM of screen
    get bottom() { return this.cy - this.height / 2; }
    ;
    get ar() { return this.width / this.height; }
    ;
    get rt() {
        if (this._rts)
            this._renderTarget = this._rts[framenum % 2];
        let rt = this._renderTarget;
        if (!rt) { // set up render target, jit
            let ff = inputs.PIXELS ? THREE.NearestFilter : THREE.LinearFilter; // may be copied in various ways
            let opts = {
                minFilter: ff,
                magFilter: ff,
                format: THREE.RGBAFormat,
                type: Dispobj.usebyte ? THREE.UnsignedByteType : THREE.FloatType,
                stencilBuffer: false
                // encoding: THREE.sRGBEncoding // only to modify three.js generated shaders
            };
            if (renderRatioMain === -999)
                newRenderRatio(); // make sure setup done
            if (isDragobj(this))
                log("unexpected dragObj.dispobj no rt");
            if (this.vn === -1) {
                // rt = slots[mainvp].dispobj.rt;
                log("should not try to render -1");
                debugger;
                return;
                //} else if (renderVR.invr() && (this.vn === 1 || this.vn === 2)) {
                //    rt = WebGLRenderTarget(this.width, this.height, opts, 'dispobj_vr' + this.vn);
            }
            else if (this.vn === mainvp) { // big mapinvp because doubling for large projection vp -1
                let vpp = slots[mainvp], rr = renderRatioMain;
                if (slots[-1]) {
                    vpp = slots[-1];
                    rr = renderRatioProj;
                }
                if (slots[mainvp].width > vpp.width)
                    vpp = slots[mainvp]; // proj slot SMALLER than mainvp slot
                rt = WebGLRenderTarget(Math.round(vpp.width / rr), Math.round(vpp.height / rr), opts, 'dispobj_mainvn' + this.vn);
            }
            else {
                rt = WebGLRenderTarget(Math.round(this.width / renderRatio), Math.round(this.height / renderRatio), opts, 'dispobj_origvn' + this.vn);
                // log('new rt', this.vn, rt.width, rt.height, 'frame', framenum);
            }
            rt.texture.wrapS = rt.texture.wrapT = THREE.MirroredRepeatWrapping;
            renderTargetDepth(rt);
            if (this.vn === mainvp && bigrt === "notsetyet") {
                bigrt = rt;
                if (slots[-1])
                    slots[-1].dispobj.rt = rt;
            }
            rt.texture.generateMipmaps = dispobjMipmaps;
            let s = rt.width * rt.height * 12 / 1024 / 1024 / 1024;
            if (s > 0.25)
                log("rendertarget size ", rt.width, rt.height, s, "gb", 'dispobj');
            this._renderTarget = rt;
            this.scene.main.material.map = rt.texture;
            rt.dispobj = this; // help debug
        }
        this.tune(rt);
        if (bigrt !== "notsetyet" && !renderVR.addSlot0 && bigrt.width * renderRatioProj < slots[mainvp].width - 1 && slots.length > 1)
            console.log("wrong bigrt");
        return rt;
    }
    ;
    set rt(rt) {
        if (this._rts && (rt === this._rts[0] || rt === this._rts[1]))
            return;
        this._renderTarget = rt;
        this.scene.main.material.map = rt ? rt.texture : rt;
        this._rts = undefined; // no double buffer for now
    }
    ;
    /** get the back buffer, forces double buffering if necessary */
    get rtback() {
        if (!this._rts) {
            const rt1 = this.rt;
            const rt2 = rt1.clone();
            rt2.name = rt1.name + '_2';
            rendertargets[rt2.name] = rt2;
            this._rts = (framenum % 2) ? [rt2, rt1] : [rt1, rt2];
        }
        return this._rts[1 - framenum % 2];
    }
    // setting visible on scene does not work, needs to be set on the subparts, so easier just to add/remove
    get visible() {
        return vpxQuadScene.children.indexOf(this.scene) !== -1;
    }
    ;
    set visible(v) {
        if (this.visible !== v)
            if (v)
                vpxQuadScene.add(this.scene);
            else
                vpxQuadScene.remove(this.scene);
    }
    ;
}
Dispobj._usebyte = false;
Dispobj.corners = [{ x: -0.5, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }];
Dispobj.zoom = 0;
; // end class dispobj
var DispobjC = Dispobj; // use by non typescript files to reference Dispobj without lint errors
//TODO: consider putting these in a config file (or maybe localStorageGet is better)
var screens; // typescript has some very odd rules with array lengths; https://github.com/Microsoft/TypeScript/pull/17765
//////     = [{ width: 1920, height: 1080 }, { width: 1024, height: 768 }];
setTimeout(getScreenSize, 0);
var vpxQuadScene; // scene containing a plane for each object (viewport)
var vpxSceneRenderCamera; // camera to render the entire scene
var vpxParentBack; // backdrops for main and parent areas
var mainvp = 0; // number for the main viewport that will show current object
// usually 0, but cols where no big main vp
var parentvps; // vps where parents live
var dustbinvp; // dustbin slot
var doublemain = true; // double size of main window
var pendingObjects = []; // heap of pending objects
var nextDispobjId = 0;
var vpborder = 1; // border size
var vpalleq = 'sides'; // sides=>big borders at sides, borders=>different border sizes, panes=>different pane sizes
var lastvps = [0, 0];
var allowDustbin = true;
/** set slots from spec nnn, www and hhh are optional overall width and height */
function setViewports(nnn, www = undefined, hhh = undefined) {
    saveInputState(); // make sure details such as projvp correct
    if (screens.length === 0 || !camera)
        return; // not ready for screen set
    if (!nnn)
        nnn = vps; // ??? was [0, 0];
    if (nnn[0] !== vps[0] || nnn[1] !== vps[1])
        lastvps = vps.slice();
    // remember requested values even if restoringInputState in case of later calls with null
    www = www || width || 800;
    hhh = hhh || height || 600;
    nnn = nnn || vps;
    width = www;
    height = hhh;
    vps = nnn;
    if (restoringInputState)
        return; // don't keep saving viewport info when lots of changes expected
    badshader = false; // may have been set for wrong reason, so give it another chance
    // ??? should we clear their renderTargets?
    // clean currentObject slots
    for (let o in currentObjects)
        currentObjects[o].vn = NOVN;
    // save all the genes for currrent objects away:
    // many may reappear instantly in new objects
    // but if number of slots is reduced (eg to 0) we may want same old ones back later
    // none of this is probably relevant tdo exhibition with more fixed slots.
    if (slots) {
        for (let vn = slots.length - 1; vn >= 0; vn--) { // save genes on reorg vps
            if (!slots[vn])
                continue;
            let dispobj = slots[vn].dispobj;
            if (dispobj) { // may be missing after previous error
                dispobj.lcx = -999;
                // dispobj.scene.dispose();            // clean up as much as three will let us
                if (vn !== mainvp && dispobj.genes) // mainvp genes moved via currentGenes
                    pendingObjects.push(dispobj.genes);
            }
        }
        if (slots[-1] && slots[-1].dispobj)
            vpxQuadScene.remove(slots[-1].dispobj.scene);
        slots.forEach(s => s.dispobj.dispose());
    }
    for (let o in currentObjects)
        currentObjects[o].rt = undefined;
    bigrt = "notsetyet";
    slots = [];
    currentObjects = {};
    if (!(CSynth && CSynth.init) && W.vp0 && W.vp0.value !== 'false' && !trysetele("vp" + nnn[0] + '_' + nnn[1], "checked", true)) {
        // no vp0 etc if in CSynth
        // the vp is not a preset so untick all
        // above check is a little wrong as vp8 sets [2,4], but [1,8] will also check vp8
        // Don't change now as that will upset lots of existing .oao files.
        Array.from(W.vp0.parentElement.getElementsByTagName('input')).forEach(bi => setInput(bi, false));
    }
    // may be called before inputs. cache ready
    // if only mainvp then ignore screens[1] request
    let _fullvp = inputs.fullvp;
    let usescreenB = inputs.projvp && (nnn[0] * nnn[1] !== 0) && screens[1];
    //log("view size in", www,hhh, usescreenB, fullvp);
    let layout = inputs.layoutbox * 1;
    let nobigvp = layout !== 0;
    //if (nwwin) log("setViewports input    nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth ,document.body.clientHeight);
    let w, h;
    if (_fullvp) { // if we can resize the entire thing, do so
        if (usescreenB) {
            w = screens[0].width + screens[1].width;
            h = Math.min(Math.max(screens[0].height, screens[1].height), maxInnerHeight);
        }
        else {
            w = screens[0].width;
            h = screens[0].height;
        }
        if (width !== w || height !== h) {
            if (W.nwwin) {
                log("setViewports resize to", w, h, "was nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight);
                nwwin.leaveFullscreen(); // otherwise resize won't work
                nwwin.resizeTo(w, h);
                nwwin.moveTo(0, 0);
            }
            else {
                windowset(w, h, 0, false); // false prevents awkward screen sizes
            }
            canvas.width = width = w;
            canvas.height = height = h;
            canvas.style.height = height / devicePixelRatio + "px";
            canvas.style.width = width / devicePixelRatio + "px";
            // return;  // the resize will force another call to
        }
        else {
            //log("oksize",w,h, "was", nwwin.width, nwwin.height, "window", width, height);
        }
    }
    let touchoffy = 0; // offset for y on touch screen. If proj screen is deeper we can't see y=0 on touch screen.
    W.UI_overlay.style.top = ""; // unless explicitly set otherwise
    let revscreen = W.revscreen.checked;
    screens[0].offset = 0; // offset for screen 1
    if (usescreenB && _fullvp) {
        www = screens[0].width;
        hhh = Math.min(screens[0].height, maxInnerHeight);
        if (screens[1].usewidth === undefined)
            screens[1].usewidth = screens[1].width;
        if (screens[1].left === undefined)
            screens[1].left = (screens[1].width - screens[1].usewidth) / 2;
        screens[1].offset = (revscreen ? 0 : www) + screens[1].left;
        if (revscreen)
            screens[0].offset = screens[1].width;
        screens[1].usewidth = screens[1].usewidth || screens[1].width;
        // temp? force projection screen to use
        let forcear = inputs.previewAr;
        forcear = true;
        screens[1].useheight = forcear ? Math.round(screens[1].usewidth * screens[0].height / screens[0].width) : screens[1].height;
        slots[-1] = {
            x: screens[1].offset, y: Math.max(0, screens[0].height - screens[1].useheight),
            width: screens[1].usewidth, height: screens[1].useheight, row: 99, col: 99
        };
        touchoffy = Math.max(0, screens[1].height - screens[0].height);
        // W.UI_overlay.style.top = (screens[0].height - 70) + "px";
    }
    else if (usescreenB && !_fullvp) { // sort of 'emulation' of dual screen
        let r = hhh / www;
        www = screens[0].width * screens[0].width / (screens[0].width + screens[1].width);
        www = Math.ceil(www);
        hhh = r * www;
        hhh = Math.ceil(hhh);
        w = width - www;
        h = w * screens[1].height / screens[1].width;
        h = Math.ceil(h);
        slots[-1] = { x: www, y: height - h, width: w, height: h, row: 99, col: 99 };
    }
    else {
        //slots[-1] = undefined; //problems when iterating eg in resetGenes
        delete slots[-1];
    }
    if (nnn[0] * nnn[1] === 0 && nobigvp) {
        layout = 0;
        nobigvp = false;
    }
    vps = nnn;
    let nx = vps[0], ny = vps[1]; // nx is cols, ny is rows
    trysetele("vp" + nx + ny, "checked", true); // so gui tells us what we have; wn't work if no such gui radio button
    // vh and vw are widths of small slots
    let vh = ny === 0 ? hhh : hhh / ny;
    let vw = (www - (inputs.projvp ? 4 : 0)) / nx; // -4 allows for border even when selected, so right does not impling projection vp
    let b = nx + ny === 0 ? 0 : vpborder; // border size [ in pixels ? ]
    /**
    <br>0: Separate big window
    <br>1: Small top right
    <br>2: Large centre
    <br>3: Large top right
    <br>4: Spiral
    **/
    let mainx, mainy, mainfac = 1, excludevp = [];
    parentvps = [];
    dustbinvp = undefined;
    switch (layout) {
        case 1: // Small top right
            mainx = nx - 1;
            mainy = 0;
            parentvps = [];
            for (let r = 0; r < ny; r++)
                parentvps.push(r * nx + mainx + 1);
            break;
        case 2:
        case 4: // Large centre or spiral
            const nn = [1, 1, 1, 1, 2, 2, 3, 3, /*8*/ 5, 5, 6, 6];
            mainfac = (Math.floor(Math.min(vps[0], vps[1]) / 2) + 1) || 7;
            // if (vps[0] < 4 || vps[1] < 4) mainfac = 1;  // no room for a big one ...
            mainx = floor((nx - mainfac) / 2); // slightly random, but get top right for 3x3
            mainy = floor((ny - mainfac) / 2);
            mainvp = mainy * nx + mainx + 1;
            //parentvps = [mainvp, mainvp-1, mainvp+2, mainvp+nx-1, mainvp+nx+2,
            //    mainvp-nx, mainvp+2*nx, mainvp+1-nx, mainvp+1+2*nx];
            parentvps = [];
            excludevp = [];
            for (let i = 0; i < mainfac; i++) {
                for (let j = 0; j < mainfac; j++) {
                    if (i + j !== 0)
                        excludevp.push(mainvp + i + nx * j);
                }
            }
            break;
        case 3: // large top right
            mainx = nx - 2;
            mainy = 0;
            mainvp = nx - 1;
            parentvps = [mainvp, mainvp - 1, mainvp - 1 + nx,
                mainvp - 1 + 2 * nx, mainvp + 2 * nx, mainvp + 1 + 2 * nx];
            excludevp = [mainvp + 1, mainvp + nx, mainvp + nx + 1];
            mainfac = 2;
            break;
        case 5: // large top right, no special
            const mm = Math.min(nx, ny);
            mainfac = mm === 4 ? 3 : Math.ceil(mm / 2);
            mainx = nx - mainfac;
            mainy = 0;
            parentvps = [];
            excludevp = [];
            for (let i = 0; i < mainfac; i++) {
                for (let j = 0; j < mainfac; j++) {
                    if (i + j !== 0)
                        excludevp.push(mainx + 1 + i + nx * j);
                }
            }
            break;
        default: // separate big
            vw = nx === 0 ? www : www / (nx + ny); // set so aspect of main vp same as aspect of small ones
            slots[0] = { x: floor(vw * nx + b), y: 0 + b, width: floor(www - vw * nx - 2 * b), height: floor(hhh - 2 * b), selected: false, col: 50 };
            mainx = -999;
            mainy = -999;
            parentvps = [];
            break;
    }
    if (allowDustbin && (vps[0] > 2 || vps[1] > 1))
        dustbinvp = nx * (ny - 1) + 1; // dustbinvp except for few viewports
    mainvp = mainx === -999 ? 0 : mainy * nx + mainx + 1;
    let vni = 0;
    let vp;
    let vwi = floor(vw), vhi = floor(vh); // integer size for equal panes
    let xw = floor((www - nx * vwi) / 2), xh = floor((hhh - ny * vhi) / 2); // excess borders for 'sides'
    for (let vny = ny - 1; vny >= 0; vny--) {
        for (let vnx = 0; vnx < nx; vnx++) {
            vni++;
            if (excludevp.indexOf(vni) !== -1)
                continue;
            // var vpalleq = 'sides';    // sides=>big borders at sides, borders=>different border sizes, panes=>different pane sizes
            // use of floor makes borders all consistent, rounding errors go into viewport sizes
            if (vpalleq === 'panes') {
                vp = slots[vni] = {
                    x: floor(vw * vnx + b), y: floor(vh * vny + b + touchoffy),
                    width: floor(vw * (vnx + 1)) - floor(vw * vnx) - 2 * b,
                    height: floor(vh * (vny + 1)) - floor(vh * vny) - 2 * b
                };
            }
            else if (vpalleq === 'borders') {
                vp = slots[vni] = {
                    x: floor(vw * vnx + b), y: floor(vh * vny + b + touchoffy),
                    width: vwi - 2 * b,
                    height: vhi - 2 * b
                };
            }
            else { // if (vpalleq === 'sides') { default, ??? never set to anything else ???
                vp = slots[vni] = {
                    x: vwi * vnx + b + xw, y: vhi * vny + b + xh + touchoffy,
                    width: vwi - 2 * b,
                    height: vhi - 2 * b
                };
            }
            vp.row = ny - vny - 1;
            vp.col = vnx;
        }
    }
    // establish exact details for mainvp when rest are established
    // so that rounding details and borders are consistent
    if (mainfac > 1) {
        vp = slots[mainvp];
        vp.y = slots[mainvp + (mainfac - 1) * nx - 1].y;
        if (mainvp % nx + mainfac > nx) // right edge
            vp.width = www - vp.x - 2 * b;
        else
            vp.width = slots[mainvp + mainfac].x - vp.x - 2 * b;
        if (mainvp < nx) // in top row
            vp.height = height - vp.y - 2 * b;
        else
            vp.height = slots[mainvp - nx].y - vp.y - 2 * b;
    }
    let specSlot;
    if (vni > 0) { // create extra slot to match special object, shouldn't need slot but ...
        specSlot = clone(slots[1]);
        specSlot.x = 9999;
        slots.push(specSlot);
    }
    if (renderVR.addSlot0) {
        slots[0] = clone(renderVR.addSlot0);
    }
    // make sure all screens have correct offset
    if (screens[0].offset)
        for (let vn = 0; vn < slots.length; vn++)
            if (slots[vn])
                slots[vn].x += screens[0].offset;
    // make sure all slots got correct centres
    let realvn = 0;
    for (let vn = -1; vn < slots.length; vn++) {
        vp = slots[vn];
        if (vp) {
            vp.cx = vp.x + vp.width / 2;
            vp.cy = vp.y + vp.height / 2;
            vp.vn = vn;
            vp.realvn = realvn++; // 'compact' contiguous slot numbers
        }
    }
    realNumslots = realvn;
    vp = slots[mainvp] || slots[1];
    camera.aspect = vp.width / vp.height;
    // NO, this requires parameters, to revisit camera.setViewOffset();
    camera.updateProjectionMatrix();
    forcerefresh = true;
    saveInputToLocal();
    if (selectionElement)
        selectionElement.style.display = "none";
    // clean up vpxQuadScene
    if (!vpxQuadScene)
        vpxQuadScene = newscene('vpxQuadScene');
    while (vpxQuadScene.children.length > 0)
        vpxQuadScene.remove(vpxQuadScene.children[0]);
    // log("cleaned up, vpxleft = ", vpxQuadScene.children.length);
    vpxSceneRenderCamera = new THREE.OrthographicCamera(0, width, height, 0, -100, 100);
    vpxSceneRenderCamera.matrixAutoUpdate = false;
    ///// threex.domevent setup.
    // Note that we may actually care about the difference between 'object oriented' and 'standalone' API
    // but assuming the vpxScene is the only one we want these events on, this should suffice, meaning
    // we can use the simple 'mesh.on('event', function(){...})' syntax
    //THREE.Object3D._threexDomEvent._domElement = canvas; // we should notify the author, for now this should work
    //THREE.Object3D._threexDomEvent.camera(vpxSceneRenderCamera);
    if (layout === 4)
        spiralvps();
    let numdone = pendingObjects.length + 1; // +1 for mainvp/currentGenes
    // prepare Dispobjs etc, backwards so -1 done last
    // This should be done somewhere else to strengthen Dispobj/viewport separation
    for (let vn = -1; vn < slots.length; vn++) { // prepare Dispobjs for slots
        if (!slots[vn])
            continue;
        vp = slots[vn];
        // find a dispobj (maybe old, maybe new)
        let genes = (vn === mainvp) ? currentGenes : (vn === -1 || mutreserved[vn]) ? undefined : pendingObjects.pop();
        let dispobj = new Dispobj(); // always a new one
        dispobj.genes = genes;
        currentObjects[dispobj.xid] = dispobj;
        vp.dispobj = dispobj;
        dispobj.render();
        dispobj.vn = vn;
        vp.dispobj = dispobj;
        dispobj.cx = vp.cx;
        dispobj.cy = vp.cy;
        dispobj.cz = vp.col;
        dispobj.width = vp.width;
        dispobj.height = vp.height;
        dispobj.rt = undefined;
        dispobj.visible = true;
        //vpxQuadscene.addX(dispobj.scene);
        if (vp === specSlot) {
            extraDispobj = dispobj;
            extraDispobj.visible = false;
        }
        // dispobj.vn = vn;  // not used yet
    }
    // note vpxParentBack only applies to back of one parent
    // but they the different backs share material.
    // thus they can be coloured together but not moved together
    let materiali = new THREE.MeshBasicMaterial({ color: selcol });
    materiali.name = 'selcol';
    /*
       for (vn in parentvps) {
           let ww = 0.505; //??
           geometry = new THREE.PlaneGeometry(ww*2, ww*2);
           vpxParentBack = new THREE.Mesh( geometry, material );
           vpxQuadscene.addX(vpxParentBack);
           vp = slots[parentvps[vn]];
           vpxParentBack.position.x = vp.cx;
           vpxParentBack.position.y = vp.cy;
           vpxParentBack.scale.x = vp.width;
           vpxParentBack.scale.y = vp.height;
           vpxParentBack.position.z = -96;
       }
    */
    centreuiover();
    // ### todo recover ??? autofillfun(numdone);
    onframe(() => refall());
    lastDispobj = lastTouchedDispobj = NODO;
    dragObj = undefined;
    debugCurrentObjectsSize = olength(currentObjects);
}
function centreuiover() {
    if (inputs.showuiover) {
        const ss = W.UI_overlay.style.display;
        W.UI_overlay.style.display = 'block'; // so details computed (more) correctly
        W.UI_overlay.style.left = '0'; // so it calculates clientWidth right if poss
        W.UI_overlay.style.left = (canvas.offsetLeft + width / 2 - W.UI_overlay.clientWidth / 2 + screens[0].offset) + "px";
        W.UI_overlay.style.display = ss;
    }
}
/** rotate object each frame */
function camrot() {
    // always rot if we are rotating, mouse or no mouse
    //if (mousewhich !== 0) return;
    if (!inputs.doAutorot && !inputs.doFixrot)
        return;
    if (!currentGenes._rot4_ele)
        return; // not set up yet
    if (inputs.doyrot)
        applyRotf(0, 2, "xzrot");
    if (inputs.doxrot)
        applyRotf(1, 2, "yzrot");
    if (inputs.dozrot)
        applyRotf(0, 1, "xyrot");
    if (inputs.doywrot)
        applyRotf(1, 3, "ywrot");
    if (inputs.doxwrot)
        applyRotf(0, 3, "xwrot");
    if (inputs.dozwrot)
        applyRotf(2, 3, "zwrot");
}
// no autoopause, even during interaction itself
var autopause = -10000000000000; // 1000;  // time to pause auto rot after interaction
var autopauseramp = 1000.0; // time to ramp up
var rotbytime = true; // true to speed by timer
/** apply rotation using value from named element */
function applyRotf(x, y, id) {
    let rotv = 0.01 * Math.pow(inputs.grot, 3) * inputs[id];
    //if (rotv === 0) return;
    if (rotbytime)
        rotv = rotv * framedelta / 33;
    if (!UICom.m_isProjVersion) // different autorot rules for proj version, no autopause but had and defaultSpeed timeout
     {
        // note, 27 March 2014, autopause effectively disabled
        let t = new Date().getTime();
        let dt = t - interacttime;
        if (dt < autopause)
            return;
        if (dt < autopause + autopauseramp)
            rotv *= (dt - autopause) / autopauseramp;
    }
    else {
        let dt = Date.now() - interacttime;
        if (dt > handTimeout) {
            showHands(dt);
        }
        else
            hideHands();
        if (dt > defaultSpeedTimeout) {
            UIController.SetDefaultSpeeds();
        }
    }
    applyMatop(x, y, rotv, rot);
}
var handsShowing = false, handEl = document.getElementById("gestureHelp"), handTimeout = 15000;
var defaultSpeedTimeout = 100000;
function showHands(dt) {
    if (!handsShowing) {
        handsShowing = true;
        handEl.style.display = "block";
    }
    handEl.style.opacity = "" + (.5 + .5 * Math.sin(dt / 1000));
}
function hideHands() {
    if (handsShowing) {
        handsShowing = false;
        handEl.style.display = "none";
    }
}
/** remember shaders for easy test reload */
// setFragFid-> getShaders -> baseShaderChanged
// baseShaderChanged cleans up and waits for others to regenerate
var vertfid, fragfid;
/** get the shaders */
function getShaders(vert = vertfid, frag = fragfid, force = false) {
    vertfid = vert;
    fragfid = frag;
    baseShaderChanged(force); // force regeneration of all materials
}
/** set the shader and make it happen, called from GUI menu */
function setFragFid(fragfidp) {
    if (fragfidp.startsWith("fano"))
        vertfid = "implictVertex.vs";
    getShaders(undefined, fragfidp);
    // baseShaderChanged();  // getShaders does this
    newframe();
    tryseteleval("fragfidbox", fragfidp);
    let appf = window[appToUse + "SetFragFid"];
    if (appf)
        appf(fragfidp);
}
function showbad(e) {
    let mmm = "<b>Cannot create WebGL renderer : " + e + "</b>";
    if (detectWebGL())
        mmm = "Temporary issue? Try refresh (F5) or forced refresh (ctrl-F5)";
    else {
        mmm = "WebGL not available.  Maybe<ol>";
        mmm += "<li>WebGL has crashed and have just been asked to reload it.</li>";
        mmm += "<li>WebGL has crashed and you need a complete restart of the browser.";
        mmm += "<br>If you hit 'shift-esc' to Chrome and task manager does not show a 'GPU process', this may well be the case.";
        mmm += "</li>";
        mmm += "<li>Your system does not support WebGL.</li>";
        mmm += "</ol>";
        mmm += 'If the problem persists <a href="chrome://gpu/">chrome://gpu</a> will give more information.';
    }
    mmm += "<br>";
    mmm += '<a href="http://xinaesthetic.net/organicart/organicart/threek.html?simplemode=true">Also, click here to try the simplified version.</a>';
    showbaderror(mmm, e);
    W.baderror.style.display = "block";
}
function cleanup3() {
    saveInputToLocal();
    if (W.savesnapatend && W.savesnapatend.checked)
        saveSnap(); // "endsession.oao"); // if I give this explifit fid, opera adds an '.opdownload'
    if (UICom && UICom.m_window)
        UICom.m_window.close();
    if (!oxcsynth)
        stopSC();
    running = false;
    // const dev = renderer. vr.get Device();
    // if (dev && dev.isPresenting) dev.exitPresent();  // just in case the cleanup isn't done by the system browser
    return; // cleanup was only necessary because of Chome bugs but cleaning up webgl
    //document.body.innerHTML = "refreshing ...";
    // return; // code below not theoretically needed, but needed with some versions of Chrome
    /***
    cdispose(geometry); geometry = undefined;
    cdispose(xscene.children[0].geometry); xscene.children[0].geometry = undefined;
    if (multigeom) cdispose(multigeom); multigeom = undefined;
    baseShaderChanged();     // should clean up shaders
    if (Shadows) ShadowP.cleanup();
    if (CubeMap) CubeMap.cleanup();
    // ? add cleanup code here if possible if (renderer) renderer.dispose();
    ***/
}
/** find THREE constant, for debug */
function TK(val) { return findval(THREE, val); }
/* mutltiply matrices */
THREEA.Matrix4.prototype.M = function (m) {
    let r = new THREE.Matrix4();
    r.multiplyMatrices(this, m);
    return r;
};
/* mutltiply matrices */
THREEA.Vector4.prototype.M = function (m) {
    let r = new THREE.Vector4();
    r.copy(this);
    r.applyMatrix4(m);
    return r;
};
var VEC4 = function (a, b, c, d) {
    return (Array.isArray(a)) ? VEC4(...a) :
        typeof a === 'object' ? VEC4(a.x || 0, a.y || 0, a.z || 0, a.w === undefined ? 1 : a.w) :
            new THREE.Vector4(a || 0, b || 0, c || 0, d === undefined ? 1 : d);
};
var VEC = VEC4;
WA.vec4 = VEC4;
var VEC3 = function (a, b, c) {
    return (Array.isArray(a)) ? VEC3(...a) :
        typeof a === 'object' ? VEC3(a.x, a.y, a.z) :
            new THREE.Vector3(a || 0, b || 0, c || 0);
};
WA.vec3 = VEC3;
var VEC2 = function (a, b) {
    return (Array.isArray(a)) ? VEC2(...a) :
        typeof a === 'object' ? VEC2(a.x || 0, a.y || 0) :
            new THREE.Vector2(a || 0, b || 0);
};
/** textures for feedback */
var rtt1, rtt2, rttswitch;
/*  http://rephrase.net/box/bitmap/jsbmp.js
Create the binary contents of a bitmap file.

This is not a public interface and is subject to change.

Arguments:

width -- width of the bitmap
height -- height of the bitmap
palette -- array of 'rrggbb' strings (if appropriate)
imgdata -- pixel data in faux-binary escaped text
bpp -- bits per pixel; use in conjunction with compression
compression -- compression mode (e.g. uncompressed, 8-bit RLE, 4-bit RLE)
*/
function _bmp(widthp, heightp, palette, imgdata, bpp, compression) {
    let imgdatasize = imgdata.length;
    let palettelength = palette.length;
    let palettesize = palettelength * 4; // 4 bytes per colour
    let filesize = 64 + palettesize + imgdatasize; // size of file
    let pixeloffset = 54 + palettesize; // pixel data offset
    let data = [
        "BM",
        _pack(widthp),
        "\x00\x00\x00\x00",
        _pack(pixeloffset),
        "\x28\x00\x00\x00",
        _pack(widthp),
        _pack(heightp),
        "\x01\x00",
        _pack(bpp, 2),
        _pack(compression),
        _pack(imgdatasize),
        "\x13\x0B\x00\x00",
        "\x13\x0B\x00\x00",
        _pack(palettelength),
        "\x00\x00\x00\x00" // all colours are important
        // END OF HEADER
    ];
    for (let i = 0; i < palette.length; ++i) {
        data.push(_pack(parseInt(palette[i], 16)));
    }
    data.push(imgdata);
    return data.join("");
}
/*
Pack JS integer (signed big-endian?) `num` into a little-endian binary string
of length `len`.
*/
function _pack(num, len) {
    let o = [];
    len = ((typeof len === 'undefined') ? 4 : len);
    for (let i = 0; i < len; ++i) {
        o.push(String.fromCharCode((num >> (i * 8)) & 0xff));
    }
    return o.join("");
}
/** data to blob, from https://gist.github.com/kosso/4246840 */
function dataURItoBlob(dataURI, type) {
    type = type || "png";
    let ii = dataURI.indexOf(",");
    let binary = atob(dataURI.substring(ii + 1)); // split(',')[1]);
    let array = [];
    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: 'image/' + type });
}
/**  http://snipplr.com/view.php?codeview&id=14590
* HSV to RGB color conversion
*
* H, S, V run from 0 to 1
*
* Ported from the excellent java algorithm by Eugene Vishnevsky at:
* http://www.cs.rit.edu/~ncs/color/t_convert.html
*/
function hsv2rgb(h, s, v, ret) {
    if (typeof (h) !== "number") {
        s = h.s;
        v = h.v;
        h = h.h;
    }
    let r, g, b;
    let i;
    let f, p, q, t;
    // Make sure our arguments stay in-range
    h = h % 1 * 360;
    s = Math.max(0, Math.min(1, s));
    //v = Math.max(0, Math.min(1, v));
    if (s === 0) {
        // Achromatic (grey)
        r = g = b = v;
        // return new THREEA.Color(r, g, b);
    }
    else {
        h /= 60; // sector 0 to 5
        i = Math.floor(h);
        f = h - i; // factorial part of h
        p = v * (1 - s);
        q = v * (1 - s * f);
        t = v * (1 - s * (1 - f));
        switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default: // case 5:
                r = v;
                g = p;
                b = q;
        }
    }
    if (!ret)
        ret = new THREE.Color();
    ret.setRGB(r, g, b);
    return ret;
}
// polyfill to backfit hsv
THREEA.Color.prototype.setHSV = function (h, s = 1, v = 1, ret) {
    hsv2rgb(h, s, v, this);
    return this;
};
/** from http://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
* changed for input range 0..1 and output range 0..1 */
function rgb2hsv(r, g, b, ret) {
    if (typeof (r) !== "number") {
        g = r.g;
        b = r.b;
        r = r.r;
    }
    let rr, gg, bb, h, s, v = Math.max(r, g, b), diff = v - Math.min(r, g, b), diffc = function (c) {
        return (v - c) / 6 / diff + 1 / 2;
    };
    if (diff === 0) {
        h = s = 0;
    }
    else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);
        if (r === v) {
            h = bb - gg;
        }
        else if (g === v) {
            h = (1 / 3) + rr - bb;
        }
        else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }
        else if (h > 1) {
            h -= 1;
        }
    }
    if (ret) {
        ret.h = h;
        ret.g = g;
        ret.b = b;
        return ret;
    }
    return { h, s, v };
}
// from https://github.com/mrdoob/three.js/blob/master/examples/js/Detector.js
function detectWebGL() {
    try {
        return !!W.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
    }
    catch (e) {
        return false;
    }
}
/** transform an old 2band texture to 3band */
function transformTexture(x) {
    if (x.band3 === undefined) {
        for (let gnxs in x) {
            const gn = gnxs;
            if (gn.endsWith("red2") || gn.endsWith("green2") || gn.endsWith("blue2") || gn.endsWith("refl2")) {
                x[gn.substring(0, gn.length - 1) + "3"] = x[gn];
                if (gn.endsWith("red2")) {
                    let gns = gn.substring(0, gn.length - 4);
                    let toff = x[gns + "texoffset"];
                    x[gns + "band1"] = 1 - toff;
                    x[gns + "band2"] = 0;
                    x[gns + "band3"] = 1 + toff;
                }
            }
        }
    }
    if (x.bumpfreq) {
        for (let gn in x) {
            if (gn.endsWith("bumpfreq")) {
                x[gn.replace("bumpfreq", "bumpscale")] = 1 / x[gn];
                //x[gn.replace("bumpfreq", "bumpstrength")] *= x[gn];
                delete x.gn;
            }
        }
    }
}
/** performance test */
function perftest(force) {
    if (Perftest && !force) {
        Perftest.sizes();
        return;
    }
    addscript("JS/perftest.js", perftest);
}
/** swr up standard performance */
function perfset() {
    setSize(1024, 768);
    currentGenes = clone(loadtarget("basep", false));
    setRes(33);
    W.SHADOWS.checked = true;
    W.BUMP.checked = true;
    W.PERLIN.checked = true;
    W.RAND.checked = true;
    W.REFLECTION.checked = false;
    W.doAutorot.checked = true;
    W.doAnim.checked = false;
    W.xzrot.value = 0;
    saveInputState();
    baseShaderChanged();
}
////////////////////////////////////////////////////////////
// currently homeless functions
function playStaticAudio(vn) {
    //if (playingAudioEl) playingAudioEl.pause();
    let els = document.getElementsByTagName("audio");
    for (let i = 0; i < els.length; i++) {
        try {
            if (i !== (vn - 1)) {
                let el = els[i];
                el.volume = 0;
                if (!el.paused)
                    el.pause();
            }
        }
        catch (e) { }
    }
    playingAudioEl = document.getElementById("audio" + vn);
    playingAudioEl.loop = true;
    playingAudioEl.volume = 1;
    playingAudioEl.play();
}
function loadStemForViewport(vn) {
    // TDR todo >> checkbox to enable/ disable auto stem loading
    // we delay the stem loading to give settarget a chance to correctly load everything
    setTimeout(function () {
        // this should not fall-over if there is no stem file with this name
        let objName = xxxgenes(vn).name === undefined ? "nostem" : xxxgenes(vn).name;
        let stemFilePath = 'stems/' + PROJ_STEM_DIR + objName + '/' + objName + '.stem';
        if (fileExists(stemFilePath)) {
            console.log('Loaded stem: ' + objName);
            // load the stem with this objects name
            // this is a really bad thing for quickly switching between shapes.
            stemLoad(PROJ_STEM_DIR + objName + '/' + objName);
            newframe();
            setTimeout(function () {
                let genes = currentGenes; // TODO XXX check
                /* this fix in only for proj mode for now  since it is not really a fix */
                // genes._rot4_ele = clone( xxxgenes(vn)._rot4_ele );
                genes._camz = getWebGalByNum(0).genes._camz;
                // ???? camera.updateCamera
                updatevp(0);
                updatevp(-1);
                // force a rotate ?
                setTimeout(function () {
                    mousewhich = 0;
                    camrot();
                }, 100);
            }, 100);
            // load animation/ mutation settings for the ui
            let ls = getfiledata(stemFilePath);
            let jsonStem = JSON.parse(ls);
            UIController.InitSpeedValues("animSpeed", jsonStem["animSpeed"]);
            UIController.InitSpeedValues("xzrot", jsonStem["xzrot"]);
        }
    }, 150);
} // load stem
/** override some inputs so we only get them if we really want */
function overrideRestoredInputs() {
    // return;  // till more sure
    trysetele("AFAP", "checked", false);
    trysetele("CHECKGL", "checked", false);
    trysetele("DEBUG", "checked", false);
    saveInputState();
}
var orenderer;
/** redefine renderer */
function newrender() {
    canvas.style.display = "none";
    cleanup3();
    init1();
    //onWindowResize();
    //baseShaderChanged();
    ShadowP.cleanup(); // force regen of depthRenderTarget
    xscene = undefined;
    HW.bigsceneSet = {};
}
/** swap positions/objects of two vps */
function swapvp(do1, do2) {
    // console.log("swap " + vn1 + " " + vn2);
    do1 = xxxdispobj(do1);
    do2 = xxxdispobj(do2);
    let vn1 = do1.vn;
    let vn2 = do2.vn;
    if (vn1 === mainvp || vn2 === mainvp)
        return console.error('ignore attempt to swap mainvp', vn1, vn2);
    slots[vn1].dispobj = do2;
    do2.vn = vn1;
    slots[vn2].dispobj = do1;
    do1.vn = vn2;
    // // ??? if (vn1 === vn2) return;
    // let vp1 = slots[vn1];
    // let vp2 = slots[vn2];
    // vp1.dispobj = do2;
    // vp2.dispobj = do1;
    // do1.vn = vn2;
    // do2.vn = vn1;
    // // make sure currentGenes is kept in correct sync
    // if (vn1 === mainvp && vn2 === mainvp) {}        // change has happened and we've mutated on a little too, keep that
    // else if (vn1 === mainvp) copyFrom(currentGenes, do2.genes);
    // else if (vn2 === mainvp) copyFrom(currentGenes, do1.genes);
    // // make sure the big render target is made available to the object in the mainvp slot
    // // and that the effected renderTargets are redrawn
    // if (vn1 === mainvp || vn2 === mainvp) {
    //     let rt = do1.rt;
    //     do1.rt = do2.rt;
    //     do2.rt = rt;
    //     updatevp(vn1); updatevp(vn2);
    //     // ??? this causes blackouts during/after swapvp() fixscale();  // so we use expected size for currectObj <<< are there other places we should call this
    //     do2.width = vp1.width; do2.height = vp1.height;
    //     do1.width = vp2.width; do1.height = vp2.height;
    //}
    //pjt: swap sound effect
    //let pan = (vp1.x/1920)-0.5;
    if (interfaceSounds) // eg not there for fano
        interfaceSounds.bsoft1.play(2, 0, 1);
    newframe();
    correctSlots();
    Director.framesFromSlots();
}
// kill object in slot vn
function killDispobj(dispobj) {
    var _a;
    let dead = (_a = slots[dustbinvp]) === null || _a === void 0 ? void 0 : _a.dispobj;
    if (dead) {
        dispobj.selected = false;
        swapvp(dead, dispobj);
    }
    else {
        dead = dispobj;
    }
    mutate({ nosel: [dead], animate: true });
    dragObj = undefined;
    newframe();
}
/** layout vps on sprial */
function spiralvps() {
    let n = 3, phi = 0;
    let mv = slots[mainvp];
    let cx = mv.x + mv.width / 2; // sometimes mv.cx not ready yet
    let cy = mv.y + mv.height / 2;
    for (let vn = 0; vn < slots.length; vn++) { // lay out sprial slots
        if (vn === mainvp)
            continue;
        let vp = slots[vn];
        if (!vp)
            continue;
        n++;
        let r = Math.sqrt(n);
        phi += 6 / (2 * Math.PI * r);
        vp.cx = r * Math.sin(phi) * vp.width + cx;
        vp.cy = r * Math.cos(phi) * vp.height + cy;
        vp.x = vp.cx - vp.width / 2;
        vp.y = vp.cy - vp.height / 2;
    }
    newframe();
}
/** capture current animation object and put in lru position,
lru goes to dustbin */
function snap() {
    let dustdo = slots[dustbinvp].dispobj;
    let current = slots[mainvp].dispobj;
    let lrudo = lru();
    let lruvn = lrudo.vn;
    slots[dustbinvp].dispobj = lrudo;
    lrudo.vn = dustbinvp;
    copyFrom(lrudo.genes, current.genes);
    slots[lruvn].dispobj = dustdo;
    dustdo.vn = lruvn;
    dustdo.cx = current.cx;
    dustdo.cy = current.cy;
    dustdo.render();
    dustdo.lastTouchedDate = lrudo.lastTouchedDate = Date.now();
}
function centreall() {
    for (let o in currentObjects) {
        let d = currentObjects[o];
        if (d && d.genes) {
            // resetMat(undefined, d);
            centrescale(d, undefined, 1);
            d.render();
        }
    }
}
function imageaspkeydown(evt) {
    if (getkey(evt) === 'Enter') {
        W.imageasp.style.color = "#fff";
        onWindowResize(true);
    }
    else {
        W.imageasp.style.color = "#F80";
    }
    evt.cancelBubble = true;
    return true;
}
function det(g) { let gg = xxxgenes(g); xmat4.elements = gg._rot4_ele; return xmat4.determinant(); }
function Testmaterial() {
    let tbuff, tscene, tgeometry, tmesh, trot4;
    this.test = function (mat, popmode = 'unknown', genes = currentGenes) {
        // ??? if (usemask) opmode = OPOPOS;
        if (!tbuff) {
            tbuff = WebGLRenderTarget(1, 1, undefined, 'testmat');
            tbuff.texture.generateMipmaps = false;
            tscene = newscene('testmaterial');
            tgeometry = new THREE.PlaneGeometry(1, -1);
            tmesh = new THREE.Mesh(tgeometry);
            tmesh.frustumCulled = false;
            tscene.addX(tmesh);
            trot4 = new THREE.Matrix4();
        }
        let mmat = (typeof mat === "string") ? getMaterial(mat, genes) : mat;
        tmesh.material = mmat;
        // mmat.uniforms.rot4.value.elements.set(trot4.elements);
        try {
            // rrender("Testmaterial", tscene, camera, tbuff);
            const k = '### rrender compile ' + popmode + oplist[popmode];
            console.time(k);
            renderer.compile(tscene, camera);
            // console.timeLog(k)  // very little lost in extra checkglerror(); probably already done by THREE.
            let rc = checkglerror("testing new material");
            console.timeEnd(k);
            if (rc) {
                log("glerror in material", mat);
                return false;
            }
        }
        catch (e) {
            log("Failure to use material: " + e);
            return false;
        }
        finally {
        }
        return true;
    };
}
var testmaterial = new Testmaterial();
/** set up debug wrapper for gl */
Gldebug.stopx = function () {
    msgfix('gldebug');
    if (Gldebug.errnum) {
        serious('gldebug', '\n', Gldebug.errnum, `found in debug test for gl errors.

This could be causing incorrect behaviour,
such as data not being displayed or displayed incorrectly.

There may be more information in the debug console.
Usually accessed with F12.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Errors below:

`, Gldebug.errs.join('\n'));
    }
    log('gldebug test run, errors =', Gldebug.errs);
    Gldebug.stop();
    setInput(W.CHECKGL, false);
};
/** add the copy shader tuning genes */
function tuningGenes() {
    addgeneperm("projGamma", 2.2, 1, 3, 0.01, 0.01, "gamma for projector", "system", 0); // transferred for copy shader
    addgeneperm("projR", 1, 0, 2, 0.01, 0.001, "proj r", "system", 0); // transferred for copy shader
    addgeneperm("projG", 1, 0, 2, 0.01, 0.001, "proj g", "system", 0); // transferred for copy shader
    addgeneperm("projB", 1, 0, 2, 0.01, 0.001, "proj b", "system", 0); // transferred for copy shader
    addgeneperm("gamma", 2.2, 1, 3, 0.01, 0.01, "gamma", "system", 0); // transferred for copy shader
    addgeneperm("bwthresh", 0.25, 0, 1, 0.01, 0.01, "bwthresh", "system", 1); // used individually per object, in copy shader
    addgeneperm("screenR", 1, 0, 2, 0.01, 0.001, "screen r", "system", 0); // transferred for copy shader
    addgeneperm("screenG", 1, 0, 2, 0.01, 0.001, "screen g", "system", 0); // transferred for copy shader
    addgeneperm("screenB", 1, 0, 2, 0.01, 0.001, "screen b", "system", 0); // transferred for copy shader
    addgeneperm("softt", 0.97, 0.9, 1, 0.01, 0.001, "soft clip", "system", 0); // transferred for copy shader
}
/** possibly start a keystone drag */
function startKeystone(x, y) {
    if (!slots[-1])
        return undefined;
    let s = slots[-1];
    let cd = [{ x: -0.5, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }];
    for (let ki = 0; ki < 4; ki++) {
        msgfix("cc" + ki);
        let c = Dispobj.corners[ki];
        let cx = s.cx + c.x * s.width;
        let cy = s.cy + c.y * s.height;
        let d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 < 10000) {
            return ki;
        }
    }
    msgfix("chosend", 'none');
    return undefined;
}
function Dispobjmodcorners(ki, dx, dy) {
    if (!slots[-1])
        return;
    //msgfix("move", x,y, dx, dy);
    let s = slots[-1];
    let cd = [{ x: -0.5, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }];
    let c = Dispobj.corners[ki];
    c.x += dx / s.width;
    c.y -= dy / s.width;
    c.x = Math.max(-0.5, Math.min(0.5, c.x));
    c.y = Math.max(-0.5, Math.min(0.5, c.y));
}
/*********************************************************************/
/** renew all copy shaders */
function copyrenew() {
    for (let o in slots)
        if (o !== '-1')
            slots[o].dispobj.renew();
}
/**/
function testUnitMatrix(m, msg) {
    const str = m.elements.toString();
    const isUnit = str === "1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1";
    if (msg && !isUnit)
        log('non unit matrix', msg, str);
    return isUnit;
}
var renderstats = { baseloops: 1 };
var groupcol = true;
// var dummyrt = WebGLRenderTarget(1, 1, {}, 'dummy');
var xmatrix; // set to test matrix behaviour
;
/** catcher for rendering, to allow performance tests etc */
var rrender = function (reason, scenep, camerap, target = null, flag) {
    var _a, _b, _c, _d, _e, _f;
    if (WA.rrender2)
        if (WA.rrender2(reason, scenep, camerap, target, flag))
            return;
    if (scenep.visible == false)
        return; // n.b. there are special cases of scenep, hence convoluted test
    reason = rrender.xtag.join('_') + '_' + reason;
    // bad experiment but something similar may be useful again renderer.capabilities.logarithmicDepthBuffer = reason.endsWith("_rawscene");
    /**/
    if (camerap)
        uniforms.cameraPositionModel.value.setFromMatrixPosition(camerap.matrixWorld);
    if ((target === null || target === void 0 ? void 0 : target.texture) && target.texture === U.feedtexture) {
        console.error('potential loop detected and cleared', reason, opmode, oplist[opmode]);
        U.feedtexture = null;
    }
    // experiment towards using real size world and model matrix to scale/position/orient
    if (xmatrix) {
        if ([OPREGULAR, OPSHADOWS, OPOPOS, OPSHAPEPOS, OPOPOS2COL, OPTSHAPEPOS2COL].indexOf(opmode) !== -1) {
            testUnitMatrix(scenep.matrixWorld, 'scene.matrixWorld');
            const ch = scenep.children[0];
            // ch.scale.set(W.kkk,W.kkk,W.kkk); ch.updateMatrix(); ch.updateMatrixWorld();
            ch.matrixAutoUpdate = false;
            ch.matrix.copy(xmatrix);
            ch.updateMatrixWorld(true);
            if (!rrender.xmatrixInverse)
                rrender.xmatrixInverse = new THREE.Matrix4();
            rrender.xmatrixInverse.copy(xmatrix).invert();
            // uniforms.cameraPositionModel.value.setFromMatrixPosition( camera.matrixWorld );
            uniforms.cameraPositionModel.value.applyMatrix4(rrender.xmatrixInverse);
        }
    }
    /**/
    if (opmode === 'undefinedopmode')
        log('unexpected opmode in reason', reason);
    if (flag)
        console.error('clear flag deprecated on rrender');
    if (logframenum >= framenum && opmode === OPMAKESKELBUFF) {
        //renderer.clearTarget(uniforms.skelbuffer.value);  // << debug
        renderer.clearTarget(skelbuffer, true, true, true); // << debug
    }
    if (scenep !== 'noscene' && scenep.children.length === 0 && !scenep.isMesh)
        return;
    let hornid = uniforms.hornid ? uniforms.hornid.value : 'n/a';
    if (opmode === 'postcompile') {
        HW.captureUniforms(hornid);
        return;
    }
    if (usemask === -2 && opmode === OPREGULAR && (hornid === 3 || hornid === -1))
        return;
    let tt = target || canvas;
    uniforms.rtSize.value.set(tt.width, tt.height);
    // TODO remove many tests below, now done more efficiently in renderPipe
    let OPMODE = opmode;
    let ch0 = (_a = scenep.children[0]) !== null && _a !== void 0 ? _a : scenep;
    if (scenep.frustumCulled || ch0.frustumCulled)
        reason = reason + ""; // debugger;
    if (scenep.children.length !== 1) // we never really use scenes in any interesting way
        reason = reason + ""; // debugger;
    if (scenep.matrixAutoUpdate && !scenep.name.startsWith('textsc') && !scenep.matrixWorldAutoUpdate) {
        scenep.updateMatrix();
        //scene.matrixWorldNeedsUpdate = true;
        scenep.matrixAutoUpdate = false;
        //        if (format(scene.matrix.elements,1) !== "{0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1}")
        //            reason = reason; // debugger;
        log(scenep.name, 'autoupdate on scene <<<<<<<<< frame', framenum);
        reason = reason + ""; // debugger;
    }
    if (scenep !== vpxQuadScene && ch0.matrixAutoUpdate) {
        ch0.updateMatrix();
        //ch0.matrixWorldNeedsUpdate = true;
        ch0.matrixAutoUpdate = false;
        //log(scene.name, 'autoupdate on children <<<<<<<<<<<<<');
        //        if (format(ch0.matrix.elements,1) !== "{0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1}")
        //            reason = reason; // debugger;
        reason = reason + ""; // debugger;
    }
    let many = typeof OPMODE !== 'number' || OPMODE === OPOPOS2COL || OPMODE === OPREGULAR || OPMODE === OPOPOS || OPMODE === OPMAKESKELBUFF || OPMODE === OPSHADOWS || OPMODE === OPSHAPEPOS || OPMODE === OPPOSITION || OPMODE === OPPICK || OPMODE === OPTSHAPEPOS2COL;
    // HW.captureUniforms(hornid);
    if (logframenum >= framenum && logframefull)
        framelog('rrender', 'reason=' + reason, 'opmode=' + oplist[opmode], 'gbuffoffset=' + uniforms.gbuffoffset.value, "res=" + uniforms.lennum.value + '/' + uniforms.radnum.value + '/' + uniforms.skelnum.value + '/' + uniforms.skelends.value, 'hornid=', hornid, "hornname=", currentHset && currentHset.hornrun[hornid] ? currentHset.hornrun[hornid].horn.name : "n/a", "scene=", scenep.name, "material=", ch0.material ? '#' + (ch0.material.name + "").substring(0, 25) + '# depth=' + ch0.material.depthTest : "nomaterial", "target=", target ? target.name : 'notarget');
    if (groupcol && !many && hornid !== 2) {
        if (hornid > rrender.last) {
            if (logframenum >= framenum)
                framelog("-------skipped");
            return;
        }
        rrender.last = hornid;
        if (hornid > 2)
            uniforms.hornid.value = -1;
    }
    let opmodes = typeof opmode === 'string' ? opmode : oplist[opmode];
    let key = reason + "_" + opmodes; //  + "_" + uniforms.hornid.value;
    if (!renderstats[key])
        renderstats[key] = { calls: 0, xloops: 0 };
    let rr = renderstats[key];
    //if (target) framelog("target", target.width, target.height);
    //gl.finish();
    if (renderstats.baseloops === undefined)
        renderstats.baseloops = 1;
    rr.calls++;
    // Electron "0.30.8" and maybe others compiled/ran shaders in such a way that
    // texture uniforms that should have been ignored were used,
    // which gave errors when the (unused) texture was the same as the target texture,
    // or indeed sometimes for undefined texture uniforms (maybe three left the old bindings in that case?)
    // The code below dummies out uniform texture values that could cause issues, and then reestablishes them later.
    // commented out with //@@ as not needed at the moment, and significantly costly
    //@@    let fix = {};
    //@@    let u = scene.children[0].material && scene.children[0].material.uniforms || {};
    //@@    for(let un in u) if (u[un].type === 'tt' && (u[un].value === target || u[un].value === undefined)) {
    //@@        fix[un] = u[un].value;
    //@@        u[un].value = dummyrt;
    //@@    }
    // jiggery pokery to help bring out useful detail in performance tests
    let core;
    if (rrender.usekey) {
        const kcore = 'rrenderCore_' + key;
        core = rrender.cores[kcore];
        if (!core) {
            let ff = (rrenderCore + '').replace('rrenderCore', kcore.replace(/ /g, '_'));
            ff = 'rrender.cores["' + kcore + '"] = ' + ff;
            const ee = eval(ff);
            core = rrender.cores[kcore];
            if (!core) {
                serious('cannot make core file for key', kcore);
                core = rrender.cores[kcore] = rrenderCore;
            }
        }
    }
    else {
        core = rrenderCore;
    }
    core(rr, camerap, scenep, ch0, target, flag, reason);
    //consoleTimeEnd(key);
    //@@    for (un in fix) u[un].value = fix[un];
    if (opmode === OPREGULAR && exportShaders.ulnames) { // export uniforms which are actively used
        for (let u = 0; u < exportShaders.ulnames.length; u++) {
            let uu = exportShaders.ulnames[u];
            let v = uniforms[uu].value;
            if (uniforms[uu].type !== 't')
                v = clone(v);
            exportShaders.ulvals[uu] = v;
        }
    }
    // temp debug while sorting merged horn/wall
    if (0 && opmode === OPTEXTURE && uniforms.hornid.value !== WALLID) {
        let s = uniforms.hornid.value;
        uniforms.hornid.value = WALLID;
        rrender(reason, scenep, camerap, target, flag);
        uniforms.hornid.value = s;
    }
    if (logframenum >= framenum && !logframefull) {
        let err = '?';
        if (logframeflush) {
            gl.finish();
            gl.flush();
            err = gl.getError();
        }
        const nt = performance.now();
        const dt = +((nt - logframetime).toFixed(2));
        logframetime = nt;
        logframetable.push({ dt, reason, opmode: (_b = oplist[opmode]) !== null && _b !== void 0 ? _b : opmode,
            scene: scenep.name,
            material: (_e = (_d = (_c = ch0 === null || ch0 === void 0 ? void 0 : ch0.material) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.post(' ')) === null || _e === void 0 ? void 0 : _e.substring(0, 10), depth: (_f = ch0 === null || ch0 === void 0 ? void 0 : ch0.material) === null || _f === void 0 ? void 0 : _f.depthTest,
            target: target === null || target === void 0 ? void 0 : target.name, err });
    }
}; // rrender
rrender.cores = {};
rrender.preeach = nop;
rrender.preall = nop;
rrender.posteach = nop;
rrender.postall = nop;
function rrenderCore(rr, camerap, scenep, ch0, target, flag, reason) {
    if (target === 'canvas')
        target = null;
    //consoleTime(key);
    // timing even with gl.finish() not helpful, maybe because of extra gpu process and async?
    if (logframenum >= framenum)
        consoleTime(opmode);
    const st = performance.now();
    rrender.preall();
    for (let i = 0; i < rr.xloops + renderstats.baseloops; i++) {
        rrender.preeach();
        if (opmode === OPOPOS && i > 0) {
            renderer.setRenderTarget(target);
            renderer.clear();
        }
        if (opmode === "updateCubeMap")
            camerap.update(renderer, scenep);
        else if (quickscene.use && scenep.children.length === 1 && ch0.children.length === 0)
            quickscene(scenep, camerap, target, flag);
        else {
            if (THREEA.NoFloatBlending) // recursively force all materials to use NoBlending
                scenep.traverse(n => { if (n.material)
                    n.material.blending = THREE.NoBlending; });
            renderer.setRenderTarget(target || null); //  || null); // for V102, care with null etc, but breaks with earlier
            if (flag)
                renderer.clear();
            renderer.render(scenep, camerap);
            if (rrender.effects && scenep === V.camscene) { //if (experimental) effects are attached, use that...
                rrender.effects.render(scenep, camerap, target, flag);
            }
        }
        if (rr.xloops + renderstats.baseloops > 1) {
            //gl.finish();  // consider these for performance tests using xloops
            //checkglerror('perftest');
        }
        rrender.posteach();
    }
    rrender.postall();
    if (logframenum >= framenum) {
        gl.finish();
        consoleTimeEnd(opmode);
    }
    const dt = performance.now() - st;
    if (dt > _rrenderwarn)
        log('### rrender ', opmode, oplist[opmode], reason, dt);
}
let _rrenderwarn = 50;
async function remakeShaders(force = false, dolog = true) {
    // baseShaderChanged();  done in getShaders()
    msgfix('rebuilding shaders', '<span class="errmsg">rebuilding shaders</span>');
    badshader = false;
    preloaded = {}; // force reload
    await S.frame();
    clearPostCache('remakeShaders');
    forcerefresh = true;
    HW.dotty = false;
    if (slots)
        slots[mainvp].dispobj.renew(); // recompile the copy shader as well
    await S.frame();
    getShaders(undefined, undefined, force);
    if (dolog)
        logframe();
    await S.frame(2);
    msgfix('rebuilding shaders');
}
/*** shaderhere
remakeShaders clears postCache
getShaders set vertfid/fragfid
baseShaderChanged cleans all material (including dispose) so they are regenerated
regenHornShader cleans postCache and HW.getHornSet

remakeShaders -> getShaders -> baseShaderChanged
regeneHornShader -> getShaders

ctrk,shift,m -> regenHornShader
ctrl,m -> remakeShaders

***/
// show the uniforms actually used for each material (debug)
function showUniformsUsed(tranrule = currentGenes.tranrule) {
    const k = { all: [] };
    if (tranrule)
        tranrule = tranrule.split('SynthBus')[0];
    for (let opm in material) {
        let matops = material[opm];
        if (typeof matops === 'string')
            continue;
        for (let m in matops) {
            if (tranrule && m !== tranrule)
                continue;
            if (m === 'defines')
                continue; // extra infor stored
            const mshow = m.trim().substring(0, 18);
            // if (m.indexOf('#') !== -1) continue;  // duplicate for specific and generic forms] unreliable test
            let mat = matops[m];
            if (!(mat instanceof THREE.ShaderMaterial))
                continue;
            // We used to catch uniformsList be patch to three.js, but that is not necessary as below
            // ul route below also includes projectionMatrix etc when used, so the preferred option
            const matprop = renderer.properties.get(mat);
            let ulold = matprop.uniformsList.map(x => x.id);
            const prog = matprop.programs.entries().next().value[1];
            const ul = prog.getUniforms().seq.map(x => x.id);
            const r1 = arraydiff(ulold, ul);
            if (r1.length)
                log('old extra', opm, mshow, r1);
            const r2 = arraydiff(ul, ulold);
            if (r2.length)
                log('new extra', opm, mshow, r2);
            k.all = k.all.concat(ul);
            log(opm, mshow, '       uniforms', olength(ulold), olength(ul)); //
            k[opm + '_' + m] = ul; // nn;
        }
    }
    k.all = k.all.sort().filter((x, i, a) => !i || x != a[i - 1]);
    return k;
}
// clean up materials, get rid of the long strings ... but lots are still hidden somewhere else
function cleanMaterials(ops) {
    for (let opm in material) {
        if (!opm.match(ops))
            continue;
        let matops = material[opm];
        for (let m in matops) {
            if (m === 'defines')
                continue; // extra infor stored
            if (m.indexOf('#') !== -1)
                continue; // duplicate for specific and generic forms]
            let mm = matops[m];
            if (!(mm instanceof THREEA.ShaderMaterial))
                continue;
            mm.vertexShader = mm.fragmentShader = '!cleaned!';
            if (mm.__webglShader)
                mm.__webglShader.vertexShader = mm.__webglShader.fragmentShader = '!cleaned!';
            if (mm.program)
                mm.program.code = '!cleaned!';
        }
    }
    material = {};
}
/** quick test for Organic use */
function testfft(res) {
    res = res || 1024;
    setSize(res);
    setInput(W.vp0, true);
    fft = new FFT(renderer, 1024);
    // Gldebug.start();
    setTimeout(function () { usemask = 4; }, 1000);
}
/**
 *
 */
function setBw(val) {
    for (let o in currentObjects) {
        if (currentObjects[o]) {
            if (currentObjects[o].genes) {
                if (currentObjects[o].genes.bwthresh === undefined)
                    currentObjects[o].genes.bwthresh = Math.pow(Math.random(), 2.1);
                //log(currentObjects[o].genes.bwthresh );
            }
        }
    }
    refall();
}
/** set a rotation background */
var rotateBackground = function (rate) {
    rate *= 1;
    if (isNaN(rate))
        rate = 0;
    let bcol = rgb2hsv(bigcol);
    if (rate !== undefined)
        rotateBackground.rate = rate;
    if (rotateBackground.ii)
        clearInterval(rotateBackground.ii);
    if (rate)
        rotateBackground.ii = setInterval(set, 30);
    else
        delete rotateBackground.ii;
    function set() {
        let usetime = FIRST(currentGenes.time, frametime / 1000); // time to use, in seconds
        let h = usetime / rotateBackground.rate % 1;
        bigcol.copy(hsv2rgb(h, bcol.s, bcol.v));
        //log (usetime, h, bigcol);
        // very primitive colour balance
        bigcol.r *= 1;
        bigcol.b *= 2;
        bigcol.g *= 0.7;
    }
};
/********************************************************************************************/
// borrowed from http://jsfiddle.net/dFrHS/1/
// could recode to use THREE, but not worth it....
// used to support keystone setup
function general2DProjection(x1s, y1s, x1d, y1d, x2s, y2s, x2d, y2d, x3s, y3s, x3d, y3d, x4s, y4s, x4d, y4d) {
    let s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
    let d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
    return multmm(d, adj(s));
    function adj(m) {
        return [
            m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
            m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
            m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]
        ];
    }
    function multmm(a, b) {
        let c = Array(9);
        for (let i = 0; i !== 3; ++i) {
            for (let j = 0; j !== 3; ++j) {
                let cij = 0;
                for (let k = 0; k !== 3; ++k) {
                    cij += a[3 * i + k] * b[3 * k + j];
                }
                c[3 * i + j] = cij;
            }
        }
        return c;
    }
    function multmv(m, v) {
        return [
            m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
        ];
    }
    function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
        let m = [
            x1, x2, x3,
            y1, y2, y3,
            1, 1, 1
        ];
        let v = multmv(adj(m), [x4, y4, 1]);
        return multmm(m, [
            v[0], 0, 0,
            0, v[1], 0,
            0, 0, v[2]
        ]);
    }
}
function testNightly() {
    let rt = WebGLRenderTarget(256, 256, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false
    }, 'testnightly');
    rt.texture.generateMipmaps = false; // without this also fails generating mipmaps at setRenderTarget(null);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(bigcol); //< use main viewport color for clearing the canvas
    renderer.clear(true, true, true);
    Gldebug.stop();
}
var renderVR = function (rt) {
    // skipHeadset will render only to the canvas even in VR mode.
    // needed when we want VR controllers but without headset (eg for Dancer exhibition)
    // with nothing to VR it goes to 45fps. Dummy to VR might make it 90fps,
    // but possibly no better on screen anyway?
    // Working, but care needed with setup sequence, eg set skipHeadset before entering VR
    const ort = rt; // original rt
    if (renderVR.skipHeadset) {
        if (vps[0] !== 1) {
            setSize();
            setViewports([1, 1]);
        }
        renderer.setFramebuffer(null); //type defs currently out of sync between three loaded in script tag vs npm (09/21)
        slots[1].dispobj.needsPaint = true;
        slots[1].dispobj.needsRender += 100;
        return renderObjsInner(rt);
    }
    if (renderVR.lastRatio !== renderVR.ratio) {
        // ratio has changed, we must leave VR and reenter for this to take
        renderVR.reenter = true;
        renderVR.lastRatio = renderVR.ratio;
        renderVR.xrfs(false);
    }
    if (!renderVR.invr() && !renderVR.showstereo) {
        return renderObjsInner(rt);
    }
    if (renderVR.prevr) {
        const rr = renderVR.prevr({ rt });
        renderer.setRenderTarget(null); // ??? needed ??, put in prevr ???
        if (rr)
            return;
    }
    genesToCam(currentGenes);
    // const rs = renderer.getSize(new THREE.Vector2());
    // renderer.getSize() could be non-integer;
    // canvas should have correct width/height, but MAY be wrong if devicePixelRatio !== 1
    // and wrong if odd width
    // todo remove/tidy Nov 2020
    //if (renderer. vr.is xr) { // in xr
    const bl = renderer.xr.getSession().renderState.baseLayer;
    const rswidth = bl.framebufferWidth;
    const rsheight = bl.framebufferHeight;
    //} else {
    //    rs.width = rs.width || rs.x;    // compatability between three versions, renderer.getSize changed specs.
    //    rs.height = rs.height || rs.y;
    //}
    const ww = Math.floor(rswidth / 2) * 2;
    const hh = Math.floor(rsheight);
    msgfix('VR res', 'framebuffer', rswidth / 2, rsheight); //, 'rt', fb.width/2*renderVR.ratio, fb.height*renderVR.ratio)
    // nb with old Vive/1080 and render resolution auto is 150%:  framebufferWidth: 3704 (1852), framebufferHeight: 2056
    // 150% => 1852 x 2056
    // 100% => 1512 x 1680
    // 52%  => 1088 x 1208
    // real resolution is 1080 x 1200
    //fitCanvasToWindow();
    renderVR.newfsTimeout = undefined;
    setInput(W.projvp, false);
    setInput(W.fullvp, false);
    setInput(W.layoutbox, 2);
    //// if (currentGenes.distortpixk === 0) currentGenes.distortpixk = 0.45;
    currentGenes.distortpixk = 0; // gave problems with distorted object postitions such as lights and cutting controller
    setInput(W.DISTORTPIX, false); // kill distortpix even deader
    if (currentGenes.cutx === 0 || currentGenes.cutx === 0.8)
        currentGenes.cutx = 2.5; // 2.5 if not using distortpixk
    if (currentGenes.cuty === 0 || currentGenes.cuty === 0.8)
        currentGenes.cuty = 2.2; // 2.2 if not using distortpixk
    // msgfix('RVR', 'starting render stereo');
    // set up two viewports in an Organic friendly way
    setInput('layoutbox', 2);
    vpborder = 0;
    if (vps[0] !== 2 || vps[1] !== 1 || slots[1].width * 2 !== ww - 4 * vpborder || slots[1].height !== hh) {
        rendertargets = {};
        setViewports([2, 1], rswidth, rsheight);
        vrcanv(); // now we know width and height try vrcanv again
        dustbinvp = undefined;
        return; // wait for viewports to be ready
    }
    // make sure some features set right
    dustbinvp = undefined; // not sure why this is sometimes reset after setViewports
    camera.near = renderVR.near || camera.near; // all override for VR, but not generally needed
    let cameras = renderVR.cameras.cameras;
    // msgfix('RVR', 'got cameras', cameras);
    if (!cameras)
        return; // non VR rendering has been performed at lower level
    // note, the call to renderer. vr.getCamera has set matrixWorld and matrixWorldInverse but NOT matrix for the stereo cameras
    // cameras = [cameras[0].clone(), cameras[1].clone()]; // ??? needed for webxr
    if (!V.usegprascam) { // NOT attach camera to right controller
        // compensate for scale, TODO incorporate this into renderVR.mycam
        const mysc = renderVR.scale * renderVR.moveScale; // moveScale allows exaggerated movements
        let e = cameras[0].matrixWorld.elements;
        e[12] *= mysc;
        e[13] *= mysc;
        e[14] *= mysc;
        e = cameras[1].matrixWorld.elements;
        e[12] *= mysc;
        e[13] *= mysc;
        e[14] *= mysc;
        // compensate for renderVR.mycam, get transformation into matrix, and make sure decomposed in case recomposed later (in updateMatrix())
        cameras[0].matrix.multiplyMatrices(renderVR.mycam, cameras[0].matrixWorld); // ++++
        cameras[1].matrix.multiplyMatrices(renderVR.mycam, cameras[1].matrixWorld);
    }
    // name cameras, used as flag to stop inappropriate updateProjectionMatrix()
    cameras[0].name = 'eye_left';
    cameras[1].name = 'eye_right';
    // ensure updateMatrix() does not forget new matrix
    cameras[0].matrix.decompose(cameras[0].position, cameras[0].quaternion, cameras[0].scale);
    cameras[1].matrix.decompose(cameras[1].position, cameras[1].quaternion, cameras[1].scale);
    // Correct near/far (especially for XR) without upsetting rest of projection matrix
    // Should be unnecessary if (when?) camera is in meteres and not scaled
    // We do not bother with near/far values for renderVR.camera, renderVR.cameras or renderVR.cameras.cameras[0/1]
    // In webVR the effect may be transmitted to the VR stereo cameras (renderVR.cameras.cameras[0/1])
    // by the renderer. vr.getCamera() call in VRTrack and we used (pre Dec 2019) to reply on that.
    // We now impose the 'definitive' camera.near/far on renderVR.cameras.cameras[0/1] projection matrices (slots 10 and 14)
    // as webXR makes the projection matrix conveniently available but NOT the component fov/near/far,
    // and this also works for WebVR.
    const near = camera.near, far = camera.far;
    var c = -(far + near) / (far - near);
    var d = -2 * far * near / (far - near);
    cameras[0].projectionMatrix.elements[10] = cameras[1].projectionMatrix.elements[10] = c;
    cameras[0].projectionMatrix.elements[14] = cameras[1].projectionMatrix.elements[14] = d;
    if (V.resting) { // fov for resting
        camera.fov = currentGenes._fov = vrresting.fov;
        camera.updateProjectionMatrix();
        cameras[0].projectionMatrix.copy(camera.projectionMatrix);
        cameras[1].projectionMatrix.copy(camera.projectionMatrix);
    }
    let savecam = camera;
    //if (!slots[2].dispobj.genes) slots[2].dispobj.genes = {};  // in case there was only one object before
    //copyFrom(slots[2].dispobj.genes, slots[1].dispobj.genes);  // but the objects in the two viewports are both the same
    slots[2].dispobj.genes = slots[1].dispobj.genes;
    //mmm    if (renderer.setScissorTest) renderer.setScissorTest(true);
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ render first
    slots[1].dispobj.needsRender = 1; // make sure we render into viewport 1 using first object
    slots[2].dispobj.needsRender = 0;
    let dispobj = slots[1].dispobj;
    //mmm    renderer.setScissor(dispobj.left, dispobj.bottom, dispobj.width, dispobj.height);
    if (!V.resting)
        camera = cameras[0]; // have not got correct compensation in cameras[0] for resting, TODO
    if (camera.layers) {
        camera.layers.enable(1);
        camera.layers.disable(2);
    }
    camToGenes(slots[1].dispobj.genes);
    rrender.xtag.push('vr');
    // msgfix('RVR', 'rendered cam0');
    if (!ort && +THREE.REVISION >= 150) {
        rt = cheatxrRenderTarget;
        if (renderer.xr.getBaseLayer) { // for three150 cheatxr
            const baseLayer = renderer.xr.getBaseLayer();
            if (baseLayer && rt)
                renderer.setRenderTargetFramebuffer(rt, baseLayer.framebuffer);
        }
        renderer.setViewport(camera.viewport);
    }
    renderObjsInner(rt);
    rrender.xtag.pop();
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ render sedond
    // now use the second camera and render into viewport 2 using second (identical) object
    // Prevent attempts to autopan on non-main viewport.  Could do by modifying currentGenes to make this "Main"
    let savertr = renderObjHorn.centreOnDisplay;
    renderObjHorn.centreOnDisplay = false;
    renderVR.eye2 = true;
    slots[1].dispobj.needsRender = 0;
    slots[2].dispobj.needsRender = 1;
    dispobj = slots[2].dispobj; // probably the same as slots[1].dispobj
    //mmm    renderer.setScissor(dispobj.left, dispobj.bottom, dispobj.width, dispobj.height);
    if (!V.resting)
        camera = cameras[1];
    if (camera.layers) {
        camera.layers.enable(2);
        camera.layers.disable(1);
    }
    camToGenes(slots[2].dispobj.genes);
    rrender.xtag.push('vr');
    if (!ort && +THREE.REVISION >= 150) {
        rt = cheatxrRenderTarget;
        if (renderer.xr.getBaseLayer) { // for three150 cheatxr
            const baseLayer = renderer.xr.getBaseLayer();
            if (baseLayer && rt)
                renderer.setRenderTargetFramebuffer(rt, baseLayer.framebuffer);
        }
        renderer.setViewport(camera.viewport);
    }
    renderObjsInner(rt);
    rrender.xtag.pop();
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ end XR render pair, restore
    renderObjHorn.centreOnDisplay = savertr;
    render_camera = camera = savecam;
    camToGenes(dispobj.genes);
    //mmm    if (renderer.setScissorTest) renderer.setScissorTest(false);
    // do an extra rendering pass to slots[0] if it exists
    if (slots[0]) {
        renderer.setRenderTarget(rt);
        // renderer.clear();  // might be needed sometimes
        let s = [+currentGenes.cutx, +currentGenes.cuty, renderRatio];
        currentGenes.cutx = currentGenes.cuty = 0.001;
        renderRatio = inputs.renderRatioUi = 1;
        currentGenes.screenR = currentGenes.screenG = currentGenes.screenB = 2;
        currentGenes.gamma = 1.8;
        slots[1].dispobj.needsRender = 0;
        slots[2].dispobj.needsRender = 0;
        slots[0].dispobj.needsRender = 1;
        renderObjsInner(rt);
        slots[0].dispobj.needsRender = 0;
        currentGenes.cutx = s[0];
        currentGenes.cuty = s[1];
        renderRatio = inputs.renderRatioUi = s[2];
        currentGenes.screenR = currentGenes.screenG = currentGenes.screenB = 1;
        currentGenes.gamma = 2.2;
    }
    if (!renderVR.hidemain) {
        // if (+THREE.REVISION <= 127) {
        //         // this should render to the canvas/screen, just with the layout copy phase
        //         (renderer as any).setFramebuffer(null); //type defs currently out of sync between three loaded in script tag vs npm (09/21)
        //         slots[1].dispobj.needsPaint = true;
        //         //slots[2].dispobj.needsPaint = true;
        //         renderObjsInner(rt);
        // } else {
        // main screen vr for 150 ??
        renderer.setRenderTarget(null);
        //?? renderer.setViewport(0,0,canvas.width,canvas.height);
        slots[1].dispobj.needsPaint = true;
        //slots[2].dispobj.needsPaint = true;
        gl.bindFramebuffer(36160, null);
        renderObjsInner(null);
        // }
    }
    renderVR.eye2 = false;
    // now we really know the vr demo is started clear the messages
    if (startvr && !renderVR.clearmessdone) {
        nomess('force');
        renderVR.clearmessdone = true;
    }
}; // renderVR
rrender.xtag = [];
renderVR.mycam = new THREE.Matrix4();
// renderVR.setting = "..\\vrsettings\\vrsettings steamvr allowAsyncReprojection 0 steamvr allowInterleavedReprojection 0 steamvr forceReprojection 1";
// renderVR.setting = navigator.appVersion.indexOf('Chrome/56.0.2902.0') === -1 ? "mutatorvrsettings.cmd" : "mutatorvrsettingsOldChrome.cmd";
// renderVR.settingFF = "mutatorvrsettingsFF.cmd";
// renderVR.settingdone = false;
renderVR.scale = 100;
renderVR.moveScale = 1; // relative movement speed to scale
renderVR.ratio = renderVR.lastRatio = 1; // 0.65;
/** initialize VR, and also initialize Supercollider.
 * The two are related becuase Supercollider cannot reliably use HTC audio until we are sure any SteamVR etc is ready.
 */
function VRSCinit() {
    log("VRinit asking for displays zzz");
    renderer.xr.enabled = false; // that is for dual eye rendering from single three render call, not for our VR
    /** do automatic start for startvr for xr or vr */
    function tryAutoVR() {
        if (startvr) {
            //onframe(()=>forcevr(50,100,1.1), 10);  // don't try this until things are a bit settled
            setTimeout(onframe(
            // tidy/remove nov 2020 ()=>forcevr(renderer. vr.is xr ? 1 : 50,250,1.1)
            () => forcevr(1, 250, 1.1), 100), 14000); // don't try this until things are a bit settled
            log("forcevr called now we have a device zzz");
        }
        else {
            log("forcevr we have device but no automatic call as not in startvr zzz");
        }
    }
    // test for different startup if in WebXR
    // if (renderer. vr.is xr) { // eg, in xr
    // to check, it should be impoissible for is xr to be true unless allowXR is true
    if (!WA.allowXR && !searchValues.allowXR) {
        msgfixerror('VRXR', 'Organic/CSynth does not support VR when WebXR enabled');
        return;
    }
    WA.XXXmyRequestAnimationFrame = myRequestAnimationFrame;
    myRequestAnimationFrame = nop;
    renderer.setAnimationLoop(animateNum);
    if (searchValues.noVR)
        return;
    WA.WEBVR.setup();
    tryAutoVR();
    return;
    // }
    alert('should never get here, no webVR');
}
// find a good resolution based on renderVR.ratio and multiple of 4
function goodres(r) {
    return Math.round(r * renderVR.ratio / 4) * 4;
}
// set up and poll controls, should not matter if there won't be any
// should be called with camera correct and returns modified camera
// it is the caller's responsibility to do correct camera/gene operations
//
// This permits the camera (camera) to be loosly linked to the headset camera (renderVR.camera).
// renderVR.mycam gives the relationship between the two
// In the VR context we will sometimes want a more direct relationship,
// renderVR.mycam is either unit transform, or maybe a displacement.
// In this case much of this code is unnecessary, but not (significantly) damaging
// vcam is renderVR.camera.matrix (in 'standard' room=1000 coordinates, or for tadpoles in metres)
//    Could get slightly out of kilter from cumulative incremental updates
//    camera = mycam * vcam
//    mycam = camera * vcam**-1
//    camera' = mycam * vcam'
function VRTrack() {
    // if (!renderer. vr.get Device()) return;  // removed for XR ~~~
    if (!renderVR.invr()) {
        if (renderVR.camera)
            renderVR.camera.matrix.identity(); // in case going back to non-vr
        return;
    }
    if (!renderVR.camera) {
        renderVR.camera = new THREE.PerspectiveCamera(camera);
        renderVR.inv = new THREE.Matrix4();
        //??? renderVR.my cam = new THREE.Matrix4();
        // renderVR.sitstand = new THREE.Matrix4();
        renderVR.stereo = [new THREE.Matrix4(), new THREE.Matrix4()]; // to capture current stereo details (may change as Vive eye distance changed)
    }
    // note: different webVR and webXR values:
    // webvr:
    //     renderVR.camera.matrix sensible, works
    //     renderVR.camera.matrixWorld small pan values
    //     renderVR.cameras.matrix, unit matrix
    //     renderVR.cameras.matrixWorld, same as renderVR.camera.matrixWorld
    // webxr:
    //     renderVR.camera.matrix unit matrix
    //     renderVR.camera.matrixWorld small pan values
    //     renderVR.cameras.matrix, same as renderVR.camera.matrixWorld
    //     renderVR.cameras.matrixWorld, same as renderVR.camera.matrixWorld (if no parent. assured by code)
    //
    // note: matrices apply right to left, horrid but there it is
    // camera = mycam * vcam
    // mycam = camera * vcam**-1
    // camera' = mycam * vcam'
    let vcam = renderVR.camera.matrix; // left from last frame
    let myscale = renderVR.scale * renderVR.moveScale; // moveScale allows exaggerated movements
    camera.updateMatrix();
    camera.updateMatrixWorld();
    //testnan(camera);
    //testnan(renderVR.camera);
    let sss = false; //??? experiment in stabalization, to stop shimmer even when (almost) static,  not a success, sss = true to retry
    if (sss)
        var c = renderVR.camera, p = c.position, q = c.quaternion, px = p.x, py = p.y, pz = p.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    renderVR.inv.copy(vcam).invert(); // get old inverse  vcam**-1 ... todo optimize this, we usually alreay have it
    //    renderVR. controls.update();        // get new values <<<<<<<, it has set position and quaternion in renderVR.camera
    // near and far are input to getCamera(), other input camera information ignored
    // side effect is input camera values are set
    // and output is stereo pair of cameras (used later for display) with matrixWorld and matrixWorldInverse set (but NOT matrix)
    // renderVR.camera.near = camera.near; renderVR.camera.far = camera.far;  // handle near/far in renderVR instead
    // if (+THREE.REVISION > 130)
    renderer.xr.updateCamera(renderVR.camera);
    // three 150 strict typing does not like the renderVR.camera argument, but some earlier versions require it. hence as any
    renderVR.cameras = renderer.xr.getCamera(renderVR.camera); // ++++ <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<!!!!! real work here
    renderVR.posemat = renderVR.cameras.cameras[0] && renderVR.cameras.cameras[0].matrix.elements.slice(0);
    // will later phase out posemat and use posematrix
    renderVR.posematrix = renderVR.cameras.cameras[0] && renderVR.cameras.cameras[0].matrix.clone();
    // renderVR.cameras.matrix isn't really a good place to save the reference pose
    // and compute its difference each frame, BUT that is how it worked for VR
    // and the lines below should make it work the same for XR.
    // TODO TODO  line below never true without sjpt patch to set renderer. vr.pose; why does it still work???
    if (Math.abs(renderVR.camera.quaternion.x) > 1e5)
        return; // horrid Firefox error ???
    // override camera with other things but keep stereo
    // work out directly after call to getCamera, as that will have set the various values we need
    // then used below by recomputeStereo()
    const cameras = renderVR.cameras.cameras;
    if (cameras) {
        // // shimmer detection, prevention
        // // this does not work well in this form; left in case it may be useful later
        // const pose = renderVR.camera.pose;
        // if (pose && pose.position && pose.orientation) {
        //     if (!renderVR.lastCameras) renderVR.lastCameras = {l:cameras[0].clone(), r:cameras[1].clone(),
        //         position: pose.position.slice(), orientation: pose.orientation.slice()};
        //     const last = renderVR.lastCameras;
        //     function d(a1, a2) {
        //         let dd = 0;
        //         for (let i = 0; i < a1.length; i++)
        //             dd += Math.abs(a1[i] - a2[i])
        //         return dd;
        //     }
        //     const cd = d(pose.position, last.position) / 100 +
        //         d(pose.orientation, last.orientation)
        //     if (cd < (renderVR.shimmerThreshold || 0)) {
        //         cameras[0].copy(renderVR.lastCameras.l);
        //         cameras[1].copy(renderVR.lastCameras.r);
        //     } else {
        //         renderVR.lastCameras.l.copy(cameras[0]);
        //         renderVR.lastCameras.r.copy(cameras[1]);
        //         last.position.set(pose.position);
        //         last.orientation.set(pose.orientation);
        //     }
        // }
        //testnan(cameras[0]);
        //testnan(cameras[1]);
        // Prepare stereo information in case needed for non-standard camera (eg resting, camera attached to controller)
        // Not used in normal case.
        if (cameras.length >= 2) {
            renderVR.stereo[0].multiplyMatrices(cameras[0].matrixWorldInverse, renderVR.camera.matrixWorld);
            renderVR.stereo[1].multiplyMatrices(cameras[1].matrixWorldInverse, renderVR.camera.matrixWorld);
        }
        // We used to updateProjectionMatrix() here if near and far were not right
        // near and far for these cameras are now handled in renderVR;
        // and for XR we must NOT updateProjectionMatrix() as they are given as raw matrix from webXR pose
        // and fields like near/far/fov are not set in a relevant manner.
    }
    renderVR.camera.position.multiplyScalar(myscale); //++++
    renderVR.camera.updateMatrix();
    //msgfix('cmpos', renderVR.camera.position);
    if (sss) {
        let a = Math.abs;
        if ((a(px - p.x) + a(py - p.y) + a(pz - p.z)) / renderVR.scale + a(qx - q.x) + a(qy - q.y) + a(qz - q.z) + a(qw - q.w) < 0.001)
            return;
    }
    if (V.resting) { // if resting ignore headset, and look slightly up
        // TODO it might be better to delay/damp the looking up
        renderVR.camera.position.set(0, 0, 0);
        let r4m = uniforms.rot4.value.elements;
        let tt = V.tempv;
        tt.set(r4m[3], r4m[7], r4m[11]); // (approx) position of centre of object
        tt.sub(camera.position);
        tt.y *= vrresting.lookup; // look up but not quite to centre
        if (tt.z > -10)
            tt.z = -10; // never look back even if we are somehow a little in front of object
        renderVR.camera.lookAt(tt);
        recomputeStereo();
    }
    else if (V.usegprascam && V.gpR) { // w.i.p. for using right controller to hold camera
        renderVR.camera.matrix.copy(V.gpR.raymatrix);
        renderVR.camera.matrix.decompose(renderVR.camera.position, renderVR.camera.quaternion, renderVR.camera.scale);
        recomputeStereo();
    }
    /** recompute the stereo, only used if resting (where irrelevant???) and usegprascam */
    function recomputeStereo() {
        renderVR.camera.updateMatrix();
        renderVR.camera.updateMatrixWorld(true);
        if (cameras) {
            for (let i in [0, 1]) {
                cameras[i].matrix.multiplyMatrices(renderVR.stereo[i], renderVR.camera.matrixWorld);
                cameras[i].matrixAutoUpdate = false;
                cameras[i].updateMatrixWorld();
            }
        }
    }
    renderVR.camera.updateMatrix(); // make sure they get into matrix renderVR.camera.matrix === vcam
    // compensate for stage, from https://github.com/toji/webvr-samples/blob/master/05-room-scale.html
    // we do not use inverse on sitstand, and reverse multiplication with camera, as we are working with camera which is view invserse
    /** this seems to be almost working, but we also need to compensate the controllers if we do this, so leave till later ** /
    if (renderVR. controls.vrInput) {
        let sp = renderVR. controls.vrInput.stageParameters;
        msgfix('renderVR camera1', renderVR.camera.matrix.elements);
        renderVR.sitstand.elements.set(sp.sittingToStandingTransform);

        msgfix('sitstand    ', renderVR.sitstand.elements);
        //renderVR.sitstand.copy(renderVR.sitstand).invert();  // << NO, camera is inverse of his view
        msgfix('sitstand inv', renderVR.sitstand.elements);
        renderVR.camera.matrix.multiplyMatrices(renderVR.sitstand, renderVR.camera.matrix);
        msgfix('renderVR camera2', renderVR.camera.matrix.elements);
        renderVR.camera.matrix.elements[12] *= myscale;
        renderVR.camera.matrix.elements[13] *= myscale;
        renderVR.camera.matrix.elements[14] *= myscale;
        msgfix('renderVR camera3', renderVR.camera.matrix.elements);
    }
    /***********************************/
    // now we've got the data compute the new matrix
    renderVR.mycam.multiplyMatrices(camera.matrix, renderVR.inv); // mycam = camera * vcam**-1
    camera.matrix.copy(vcam); // copy vcam'
    camera.applyMatrix4(renderVR.mycam); // to get camera' = mycam * vcam'
    renderVR.inv.copy(vcam).invert(); // get old inverse  vcam**-1
    // Do not allow roomsize changes to move the viewer more than needed to keep away from walls
    // _camx etc will have the position pre-change, so we just use them to restore things
    // Maybe would be cleaner to track the detailed effect of renderVR.scale more carefully,
    // but this seems to do a pretty good job.
    if (renderVR.lastscale !== myscale) {
        let mm = camera.matrix.elements;
        mm[12] = camera.position.x = currentGenes._camx;
        mm[13] = camera.position.y = currentGenes._camy;
        mm[14] = camera.position.z = currentGenes._camz;
        renderVR.lastscale = myscale;
    }
    //    camera.updateMatrix();
    //    camera.updateMatrixWorld();
    renderVR.ntime = ++renderVR.ntime % renderVR.ntimes;
    renderVR.times[renderVR.ntime] = renderVR.lasttime - renderVR.camera.timestamp;
    renderVR.lasttime = renderVR.camera.timestamp;
}
renderVR.times = [];
renderVR.ntimes = 100;
renderVR.ntime = 0;
renderVR.lasttime = 0;
renderVR.lastrequest = { bool: 'none', time: -9999, framenum: -9999 };
/** enter and leave xr in WebVR106SJTP.js */
/** called on change of vr display.
 * n.b. up to early 18 could be called twice because of requestPresent.then() clause helping Firefox.
*/
function __onVRDisplayPresentChange(details) {
    const nowPresenting = renderVR.invr();
    if (!nowPresenting) {
        (WA).xxxdetails = details;
    }
    else {
    }
    msgfixlog('__onVRDisplayPresentChange ours', 'zzz, nowPresenting', nowPresenting, typeof details === 'string' ? details : 'probably from window callback');
    if (startvr && !nowPresenting) { // it has changed to non-vr, force back to vr
        // setTimeout(()=>forcevr(10), 500);
        log('zzz we exited VR mode when in startvr, so using forcevr to re-enter VR');
        onframe(() => forcevr(10));
    }
    onframe(() => { onWindowResize(); vrcanv(); });
}
/** check if in vr (presenting).  may return undefined, null, or false if note */
renderVR.invr = function xrenderVRinvr() {
    if (!renderer.xr)
        return false;
    if (typeof renderer.xr.isPresenting === 'boolean')
        return renderer.xr.isPresenting; // added for 117
    serious('unexpected renderer.xr');
    // if (renderer.xr.isPresenting) return renderer.xr.isPresenting();
    // if (renderer. vr.get Device()) return renderer. vr.get Device().isPresenting; // legacty webvr older three.js
};
renderVR.keys = function xrenderVRkeys(kkk) {
    //if (renderObjs !== renderVR) return undefined;
    let handled = true;
    switch (kkk) {
        case 'shift': break; // so details are shown
        // note scale inverted so it is object scale
        case 'shift,Insert':
            renderVR.scale /= 1.1;
            break;
        case 'shift,Delete':
            renderVR.scale *= 1.1;
            break;
        //case 'shift,Home': renderVR.moveScale *= 1.1; break;
        //case 'shift,End': renderVR.moveScale /= 1.1; break;
        case 'shift,PageUp':
            if (currentGenes.shrinkradiusA === 0)
                currentGenes.shrinkradiusA = 10;
            currentGenes.shrinkradiusA *= 1.1;
            break;
        case 'shift,PageDown':
            currentGenes.shrinkradiusA /= 1.1;
            break;
        default:
            handled = false;
            break;
    }
    if (handled) {
        msgfix("renderVR scale", renderVR.scale);
        msgfix("renderVR movescale", renderVR.moveScale);
        //msgfix("shrinkradii", currentGenes.shrinkradiusA, currentGenes.shrinkradiusB);
        newmain();
        return true;
    }
    return undefined;
};
/** render four views */
function renderQuad(rt) {
    genesToCam();
    //msgfix("start", currentGenes._camqx, currentGenes._camqy, currentGenes._camqz, currentGenes._camqw, '....', camera.matrix.elements.toString());
    let asp = 1920 / 1080;
    if (vps[0] < 4) {
        //setInput(W.projvp', false);
        //setInput(W.layoutbox', 2);
        //setSize(document.body.clientWidth, document.body.clientWidth / asp / 4);
        vpborder = 0;
        setViewports([8, 8]);
        //dustbinvp=undefined;
        W._tranrule.style.display = 'none';
        W.msgbox.style.top = slots[1].height + "px";
        W.stats.domElement.style.top = slots[1].height + "px";
        W.UI_overlay.style.bottom = "15%";
        W.UI_overlay.style.top = "";
        return; // wait for viewports to be ready
    }
    // Prevent attempts to autopan on non-main viewport.  Could do by modifying currentGenes to make this "Main"
    let savertr = renderObjHorn.centreOnDisplay;
    renderObjHorn.centreOnDisplay = false;
    // first do the regular render without the specials
    let nvp = vps[0] * vps[1];
    for (let j = nvp - 3; j <= nvp; j++)
        if (j !== mainvp)
            slots[j].dispobj.needsRender = 0;
    renderObjsInner(rt);
    let saveneeds = {};
    for (let j = 1; j < nvp - 3; j++) {
        if (slots[j] && slots[j].dispobj.needsRender) {
            saveneeds[j] = slots[j].dispobj.needsRender;
            slots[j].dispobj.needsRender = 0; // don't let them intersperse with the qual rendering'
        }
    }
    genesToCam();
    // horizontal fov is 90, but we need vertical fov
    let savecmap = CubeMap.renderMap;
    CubeMap.renderMap = false;
    let fov = Math.atan(1 / asp) * 180 / Math.PI * 2;
    currentGenes._fov = fov;
    camera.updateProjectionMatrix();
    genesToCam();
    camera.rotateY(Math.PI / 2);
    camToGenes(); // so left is first viewport and front is second of four
    for (let j = nvp - 3; j <= nvp; j++) {
        slots[j].dispobj.selected = false;
        slots[j].dispobj.genes = {};
        for (let i = nvp - 3; i <= nvp; i++)
            slots[i].dispobj.needsRender = i === j ? 1 : 0;
        copyFrom(slots[j].dispobj.genes, currentGenes); // but the objects in the two viewports are both the same
        //msgfix("jx" + j,  uniforms.rot4.value.elements.toString());
        //msgfix("ja " + j, currentGenes._camqx, currentGenes._camqy, currentGenes._camqz, currentGenes._camqw, '....', camera.matrix.elements.toString());
        CubeMap.renderMap = j === mainvp;
        renderObjsInner(rt);
        //msgfix("jb " + j, currentGenes._camqx, currentGenes._camqy, currentGenes._camqz, currentGenes._camqw, '....', camera.matrix.elements.toString());
        genesToCam();
        camera.rotateY(-Math.PI / 2);
        camToGenes();
    }
    //camera.rotation.set(0,0,0);
    //camera.updateMatrix();
    //camera.updateMatrixWorld();
    genesToCam();
    camera.rotateY(-Math.PI / 2);
    camToGenes();
    //msgfix("end", currentGenes._camqx, currentGenes._camqy, currentGenes._camqz, currentGenes._camqw);
    CubeMap.renderMap = savecmap;
    renderObjHorn.centreOnDisplay = savertr;
    for (let j in saveneeds)
        slots[j].dispobj.needsRender = saveneeds[j];
}
/** convert shader to hlsl version,  requires --enable-privileged-webgl-extension
http://www.ianww.com/blog/2013/01/14/debugging-angle-errors-in-webgl-on-windows/
*/
function shader2hlsl(mat) {
    mat = mat || debugLastMat;
    let ext = gl.getExtension("WEBGL_debug_shaders");
    if (!ext) {
        log("no extension WEBGL_debug_shaders");
        return;
    }
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, mat.vertexShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        console.log("Invalid shader : " + gl.getShaderInfoLog(vsh));
        let lines = mat.vertexShader.split('\n');
        for (let i in lines) {
            log(i, lines[i]);
        }
    }
    ;
    let crcr = String.fromCharCode(0x21bf); // the shader is returned with funny newlines, so replace
    let hlslv = gl.getExtension("WEBGL_debug_shaders").getTranslatedShaderSource(vsh).replaceall(crcr, '\n');
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, mat.fragmentShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        console.log("Invalid shader : " + gl.getShaderInfoLog(fsh));
        let lines = mat.fragmentShader.split('\n');
        for (let i in lines) {
            log(i, lines[i]);
        }
    }
    ;
    let hlslf = gl.getExtension("WEBGL_debug_shaders").getTranslatedShaderSource(fsh).replaceall(crcr, '\n');
    writetextremote('exportShader/vertHLSL.txt', hlslv);
    writetextremote('exportShader/fragHLSL.txt', hlslf);
    //writetextremote('exportShader/bothHLSL.txt','~~~~~frag\n' + hlslf + '\n\n~~~~~vert\n' + hlslv);
    return { vert: hlslv, frag: hlslf };
}
/****************************/
/** matrix usage  from https://github.com/mrdoob/three.js/issues/1188
object.matrixWorld => modelMatrix // since r50

camera.projectionMatrix => projectionMatrix
camera.matrixWorldInverse => viewMatrix
camera.matrixWorldInverse * object.matrixWorld => modelViewMatrix

modelViewMatrix, modelMatrix, normalMatrix  apply to regular object but not to camera?

camera.matrix is a local that is accumulated into camera.matrixWorld if the camera has a parent.

? bindMatrix, bindMatrixInverse, boneMatrices

~~~~
standard transformation for fragment shader

gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
Alternatively

gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 ); // since r50

~~~
from shadow prep code above
uniforms.lightProjectionMatrixX.value = Shadows[X].m_camera.projectionMatrix;
uniforms.lightViewMatrixX.value = Shadows[X].m_camera.matrixWorldInverse;

used in threek.
vec4 ooo = projectionMatrix * modelViewMatrix * vec4(rt.xyz, 1.);
// vertex proj from light's POV then nudged. into 0 - 1 space
vPosition = OffsetMatrix * lightProjectionMatrix * lightViewMatrix * modelMatrix * vec4(rt.xyz, 1.);


***/
/**
check precompiler for shader ... save shader with extension .c
D:\chromeWebVR\general\Chrome-bin>C:\Software\Octave3.6.2_gcc4.6.2\mingw32\bin\gcc.exe -E
    "D:\GoldsmithsSVN\aaorganicart\organicart\OPTSHAPEPOS2COL.c" >"D:\GoldsmithsSVN\aaorganicart\organicart\OPTSHAPEPOS2COL.cPRE"
*/
/** shopw bottom left and top right corners, e.g  to debug horn/wall shading */
function showTextureCorners() {
    let p = { width: 1, height: 1 };
    for (let i = 0; i < 2; i++) {
        log('rtopos', readWebGlFloat(rendertargets.rtopos1920x1080, p).map(function (x) { return x[0]; }).join(", "));
        log('rtshapepos', readWebGlFloat(rendertargets.rtshapepos1920x1080, p).map(function (x) { return x[0]; }).join(", "));
        log('rtnormal', readWebGlFloat(rendertargets.rtnormal1920x1080, p).map(function (x) { return x[0]; }).join(", "));
        log('rttexture', readWebGlFloat(rendertargets.rttexture1920x1080, p).map(function (x) { return x[0]; }).join(", "));
        log('dispobj', readWebGlFloat(slots[0].dispobj.rt, p).map(function (x) { return x[0]; }).join(", "));
        p = { width: 1, height: 1, left: 1919, top: 1079 };
    }
}
/** quick debug set/query of shadow */
function shadows(n = undefined) {
    if (n === undefined) {
        // log('shadows', inputs.SHADOWS, inputs.SHADOWS1, inputs.SHADOWS2);
        return inputs.SHADOWS * 1 + inputs.SHADOWS1 * 2 + inputs.SHADOWS2 * 4;
    }
    else if (n === 'toggle') {
        return shadows() ? shadows(0) : shadows(7);
    }
    if (n >= 7)
        n = 7;
    setInput(W.SHADOWS, !!(n & 1));
    setInput(W.SHADOWS1, !!(n & 2));
    setInput(W.SHADOWS2, !!(n & 4));
    return n;
}
function allunit(g = currentGenes) {
    //renderObjHorn.centreOnDisplay = false;
    tranInteractDelay = 1e96; // stop autoscale after no interaction
    //setInput(W.GPUSCALE, false);
    //setInput(W.NOSCALE, true); setInput(W.NOCENTRE, true);
    setInput(W.doAutorot, false);
    setInput(W.mutrate, 0.001);
    setInput(W.doAnim, true);
    // if (renderVR. controls) renderVR. controls.resetPose();
    // if (renderer. vr.get Device() && renderer. vr.get Device().resetPose) renderer. vr.get Device().resetPose();
    renderVR.near = camera.near = 0.01; // note, VERY different from standard value, maybe too small ??
    renderVR.far = camera.far = 100;
    renderVR.scale = 1;
    camera.updateProjectionMatrix();
    VRTrack();
    g._camqx = g._camqy = g._camqz = 0;
    g._camqw = 1;
    g._camx = g._camy = 0;
    g._camz = 2;
    g._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    g._uScale = 1;
    g._panx = g._pany = g._panz = 0;
    g.gscale = 1;
    g._fov = 35;
    G._qux = G._quy = G._quz = 0;
    G._quw = 1;
    genesToCam(g);
    //msgfix("camera matrix", "$camera.matrix.elements$");
    //msgfix("gscale", "$gscale$");
    //msgfix("rot4", "$_rot4_ele$");
    newmain();
}
/** set up simplest rendering */
function simplerender() {
    springs.stop();
    usemask = -1;
    shadows(0);
    setInput(W.USESKELBUFFER, false);
    logframe();
    material = {};
    debugLastMat = undefined;
}
// we use scenes in a very limited way, so this makes it easier to optimize our setup calls
THREEA.Scene.prototype.addX = function sceneaddX(m) {
    this.add(m);
    /*** /
    m.updateMatrix();
    this.updateMatrix();
    m.updateMatrixWorld();
    this.updateMatrixWorld();
    m.matrixAutoUpdate = false;
    this.matrixAutoUpdate = false;
    /***/
};
/** fit the canvas display to the window, or scale it.  Keep aspect ratio of renderer/canvas */
function fitCanvasToWindow(sc = undefined) {
    if (!sc) {
        let sc1 = window.innerWidth / canvas.width;
        let sc2 = window.innerHeight / canvas.height;
        sc = Math.min(sc1, sc2);
    }
    canvas.style.left = inputs.fixcontrols ? '360px' : (window.innerWidth - canvas.width * sc) / 2 + 'px';
    canvas.style.top = searchValues.canvtop ? '0' : (window.innerHeight - canvas.height * sc) / 2 + 'px';
    canvas.style.width = Math.floor(canvas.width * sc) + 'px';
    canvas.style.height = Math.floor(canvas.height * sc) + 'px';
}
function basetest() {
    shadows(0);
    usemask = -1;
    setInput(W.USESKELBUFFER, false);
    setInput(W.GPUSCALE, false);
    setInput(W.resbaseui, 1); // << lennum 20, skelnum 18
    setInput(W.resdyndeltaui, 0);
}
// use the texture of a renderTarget, if available
function condTexture(rt) {
    return rt ? rt.texture : rt;
}
// force vr, go on trying till works
var forcevr = function (n = forcevr.maxtries, t = 100, dt = 1.1, initn = 1) {
    if (!WA.islocalhost)
        return;
    //if (navigator.userAgent.indexOf('Firefoxx/') !== -1) return;  // not yet set up for Firefoxx
    if (renderVR.invr()) {
        msgfix("forcevr now in VR ... tries left ", n);
        return;
    }
    // if we have already presented might work at once, but not always so fallback as well
    // this gives issues on Chrome, so leave
    // if (renderVR.hasPresented) { msgfix("forcevr direct retry as already presented"), renderVR.xrfs(true); }
    if (n === 0) {
        msgfixlog("forcevr tries", 'exceeds maximum zzz');
        // do not show this 30/08/2017 W.entervr.style.display = "block";
        return;
    }
    msgfixlog("forcevr tries zzz", initn, 'of', n, 'time', t);
    makevr();
    setTimeout(() => onframe(() => forcevr(n - 1, t * dt, dt, initn + 1)), t); // reissue, but not too fast
};
forcevr.maxtries = 10; // tries before giving up
function makevr() {
    log('xrfs makevr => makevr2');
    makevr2();
    // runcommandphp(`start /min "makeVR" cscript makeVR.vbs "${document.title}"`);
}
// force vr + video display
// if slot is given it is used for the video display slot
// if slot is false, no special video display
// if slot is true or undefined, default video display slot
function vrvideo(slot) {
    if (slot === undefined || slot === true)
        slot = { col: 0, height: 1080, width: 1920, x: 0, y: 0 };
    renderVR.addSlot0 = slot;
    setViewports();
    if (slot) {
        camera.aspect = slot.width / slot.height;
        camera.fov = 50;
        camera.updateProjectionMatrix();
        // assumes we have a 1920x1080 window
        if (window.innerWidth !== 1920 || window.innerHeight !== 1080)
            msgfix('vrvideo', "> window not 1920x1080", window.innerWidth, window.innerHeight);
        else
            msgfix('vrvideo', "window size OK ... 1920x1080");
    }
    // maybe this should not be automatic like this?
    // setInput(W.renderRatioUi, slot ? 2 : 1);  // headset will be lower res, but main view full res
    // fit top left, often will be fill window
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.style.left = '0px';
    canvas.style.top = (slot ? slot.height - canvas.height : 0) + 'px';
}
var ColorKeywords = {};
for (let k in { red: 0, green: 0, black: 0, white: 0 })
    ColorKeywords[k] = new THREE.Color(k);
function showmaterials(f) {
    for (let m in material) {
        if (m === 'shadergenes' || m === 'matcodes')
            continue;
        let mm = material[m];
        if (typeof mm !== 'object')
            continue;
        for (let t in mm) {
            let mmm = mm[t];
            let mmmt = f ? f(mmm) : mmm;
            log(m.substr(0, 20), t.substr(0, 20), mmmt);
        }
    }
}
// perform an extra (non-horn) render pass
// save old values, use options to override special ones, make the call, and restore the standard values
function extraRender(options) {
    // if (!options._tranrule) return;  // no options
    //options may include HW.resoverride, extratranrule, scene, renderPass, genes, uniforms, rendertarget, rdelta, usemask
    //let gsave = {};
    //copyFrom(gsave, options);    // save the options, will be flat with keys such as 'inputs.USESKELBUFFER'
    //copyFromN(W, options);       // and apply them
    if (badshader)
        return;
    let genes = options.genes || currentGenes;
    let save = [genes.tranrule, currentHset, genes._rot4_ele, inputs.USESKELBUFFER, HW.resoverride, trancodeForTranrule, extradefines,
        HW.dotty, uniforms.NORMTYPE.value, U.renderBackground];
    let changed;
    try {
        const WW = window;
        // these are localized
        let scenei = options.scene || WW.scene;
        let renderPassi = options.renderPass || WW.renderPass;
        HW.resoverride = options.resoverride || HW.resoverride;
        let uniformsi = options.uniforms || WW.uniforms;
        let rendertarget = options.rendertarget;
        // these are global
        HW.resoverride = options.resoverride || HW.resoverride;
        genes.tranrule = options.tranrule;
        U.renderBackground = 0; // don't let 'feedback' overwrite the real render with this extra one
        if (options.rot4)
            genes._rot4_ele = options.rot4;
        if (options.trancodeForTranrule)
            trancodeForTranrule = options.trancodeForTranrule;
        if (options.extradefines)
            extradefines = options.extradefines;
        // prerender(genes, uniforms);   // get back uniforms.rot4 and others
        rot4uniforms(genes, uniformsi); // get back uniforms.rot4 and others
        if (options.useskelbuffer !== undefined)
            inputs.USESKELBUFFER = options.useskelbuffer;
        if (options.dotty !== undefined)
            HW.dotty = options.dotty;
        if (options.NORMTYPE !== undefined)
            uniforms.NORMTYPE.value = options.NORMTYPE;
        if (0 && !HW.getHornSet(genes)) { // todo only for horns
            HW.hornTrancodeForTranrule(genes.tranrule, genes);
            changed = true;
        }
        currentHset = HW.getHornSet(genes);
        // const baddispobj = xxxdispobj(genes);
        renderObjPipe(scenei, renderPassi, genes, uniformsi, rendertarget, FIRST(options.rdelta, WW.inputs.resdyndeltaui), FIRST(options.usemask, WW.usemask), options.dispobj);
        let m = material.opos ? material.opos[genes.tranrule] : undefined; //there might be a chance of getting to here before appropriate opos entry is established.
        //this happened when adding mouse picking code within vivecontrol method for csynth...
        if (m)
            m.side = THREE.DoubleSide; // set once material established
    }
    finally {
        [genes.tranrule, currentHset, genes._rot4_ele, inputs.USESKELBUFFER, HW.resoverride, trancodeForTranrule, extradefines,
            HW.dotty, uniforms.NORMTYPE.value, U.renderBackground] = save;
        //copyFromN(W, gsave);  // restore the options, unflattening the keys if needed
        if (changed) {
            setInput(W.tranrulebox, genes.tranrule);
            W.showrules.onchange(undefined);
        }
        rot4uniforms(genes, uniforms); // get back uniforms.rot4 and others
        // prerender(genes, uniforms);   // get back uniforms.rot4 and others
    }
}
function camshow() {
    return `${G._camx}, ${G._camy}, ${G._camz} / ${G._camqx}, ${G._camqy}, ${G._camqz}, ${G._camqw}`;
}
/** set camera from position and lookat or quaternion
 * either position or x,y,z gives position
 * if neither set, position is set using random x,y,z values from -distance to distance
 *
 * either lookat or lx,ly,lz gives lookat
 * if lookat not given in either form, quat or qx, qy, qz, qw is used for quaternion
 * if neither lookat nor quat is given, lookat is set to origin
 *
 * These rules mean if given a THREE.Vector3 as input this is used for position, with lookat origin

*/
//function camset(g = G, x:any = 1200, y = undefined, z = undefined, tx=0, ty=0, tz=0) {
function camset({ g = G, position = undefined, x = undefined, y = undefined, z = undefined, lookat = undefined, lx = undefined, ly = 0, lz = 0, quat = undefined, qx = undefined, qy = 0, qz = 0, qw = 1, distance = 1200 } = {}) {
    //function camset({g = G, x:any = 1200, y = undefined, z = undefined, tx=0, ty=0, tz=0} = {}) {
    if (position !== undefined)
        ({ x, y, z } = position);
    if (lookat !== undefined)
        ({ x: lx, y: ly, z: lz } = lookat);
    if (quat !== undefined)
        ({ x: qx, y: qy, z: qz, w: qw } = quat);
    if (qx === undefined && lx === undefined)
        lx = ly = lz = 0;
    const R = () => Math.random() * 2 - 1;
    if (x === undefined) {
        z = R() * distance, y = R() * distance, x = R() * distance;
    }
    g._camx = x;
    g._camy = y;
    g._camz = z;
    // TODO fov
    if (lx !== undefined) {
        genesToCam(g);
        camera.lookAt(new THREE.Vector3(lx, ly, lz));
        camera.updateMatrix();
        camToGenes(g);
    }
    else {
        g._camqx = qx;
        g._camqy = qy;
        g._camqz = qz;
        g._camqw = qw;
        genesToCam(g);
    }
}
function usershow() {
    return `${G._panx}, ${G._pany}, ${G._panz} / ${G._uXrot}, ${G._uYrot}, ${G._uZrot}  / ${G._uScale}`;
}
function userset(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sc = 1) {
    let r = `${G._panx = x}, ${G._pany = y}, ${G._panz = z} / ${G._uXrot = rx}, ${G._uYrot = ry}, ${G._uZrot = rz}  / ${G._uScale = sc}`;
    return r;
}
/** show all details that mich effect view */
function showview(k = mainvp) {
    const dobj = xxxdispobj(k);
    const g = dobj.genes;
    camToGenes(g);
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log(`view for ${dobj.vn}`);
    log('camera', 'pos', camera.position, 'range', camera.near, camera.far, 'fov', camera.fov, 'rot', camera.rotation);
    log('cameraview', camera.view);
    log(FF(g, '_cam'));
    log(FF(g, '_pan'));
    log(FF(g, '_qu'));
    log(FF(g, '_u'));
    log('Grot4', g._rot4_ele);
    log('Urot4', uniforms.rot4.value.elements);
    log('$basescale');
    log(`genes NOSCALE=${g._NOSCALE}  NOCENTRE=${g._NOCENTRE}  GPUSCALE=${g._GPUSCALE}`);
    log('$NOSCALE$  $NOCENTRE$  $GPUSCALE$');
    if (g.gscale)
        log('G autosc', g.gscale, g._gcentre, '(genes, smoothed, correct if cpuscale)');
    if (uniforms.gscale)
        log('U autosc', uniforms.gscale.value, uniforms.gcentre.value, '(uniforms, smoothed, correct if cpuscale)');
    // log(FF(G, '_pos'));  // derived from _rot4ele
    const sdt = uniforms.scaleDampTarget && uniforms.scaleDampTarget.value;
    if (sdt) {
        let dt = readWebGlFloat(sdt);
        log('autoscgpu', dt[3][0], { x: dt[0][0], y: dt[1][0], z: dt[2][0] });
    }
    else {
        log('autoscgpu', 'not set up');
    }
}
/** show lights data */
function showlights() {
    let dir = G.light0dirx > 499.9 ? 'directional' : SG.light0dirxyz;
    log('light0', G.light0s, SG.light0xyz, dir);
    dir = G.light1dirx > 499.9 ? 'directional' : SG.light1dirxyz;
    log('light1', G.light1s, SG.light1xyz, dir);
    dir = G.light2dirx > 499.9 ? 'directional' : SG.light2dirxyz;
    log('light2', G.light2s, SG.light2xyz, dir);
}
/******************* calling sequence
renderObjsInner
trigger
renderObj           prepare feedback (call CubeMap) ->
renderObjHorn       scaling, make skellbuff, shadows, reflection ->
renderPipe          colopuring (wrong place?), clear depths, ->
renderObjPipe       contains sequence of ipipeop calls, based on usemask, ->
ipipeop             javascript convenience, ->
pipeop              makes/uses/clears rendertargets, fiddles with depth details, -> either renderPass or rrender
renderPass          complicated horn stuff, eventually -> rrender
rrender             front end to renderer.render, logging, performance, ? some multi decisions ->

**********************************/
/** copy texture to targ from from, with given ranges */
function NONOtextureCopy(targ, from, tx, ty, sx, sy, w, h) {
    // !!! targ and from wrong way round
    // !!! also apparently clips value to range 0..1
    // !!! TODO find good way to copy
    let textfrom = from.texture || from; // may be passed renderTarget or texture
    let lowfrom = renderer.properties.get(textfrom).__webglTexture;
    renderer.setRenderTarget(targ);
    let state = renderer.state;
    state.activeTexture(gl.TEXTURE0);
    state.bindTexture(gl.TEXTURE_2D, lowfrom);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, tx, ty, sx, sy, w, h);
    //gl.copyTexImage2D( gl.TEXTURE_2D, 0, gl.RGB, screenPositionPixels.x, screenPositionPixels.y, 16, 16, 0 );
    //gl.glCopyTexSubImage2D
    /* void glCopyTexSubImage2D(
        GLenum target,          gl.TEXTURE_2D
        GLint level,          0
        GLint xoffset,        targ x
        GLint yoffset,        targ y
        GLint x,              source x
        GLint y,              source y
        GLsizei width,
        GLsizei height);

    void glCopyTexImage2D(
        GLenum target,         gl.TEXTURE_2D
          GLint level,              0
          GLenum internalformat,    gk.RGB
          GLint x,                  source x
          GLint y,                  source y
          GLsizei width,
          GLsizei height,
          GLint border);            0

     */
}
/** this exports shaders suitable for use in the c++ code version */
var exportShaders = function () {
    let s = springs.running;
    setInput(W.SHADOWS, false);
    setInput(W.SHADOWS1, false);
    setInput(W.SHADOWS2, false);
    setInput(W.USESKELBUFFER, true); // at least for now, if false use 'regular---' + currentGenes.tranrule] below
    setInput(W.GPUSCALE, false); // at least for now
    usemask = -1;
    exportShaders.fixcols = false; // true;
    material = {};
    renderstats = {};
    Maestro.on('postframe', function () {
        log('material', olength(material), 'renderstats', olength(renderstats));
        // let mat = material.regular[currentGenes.tranrule];
        let mat = material.regular['horn("main");'];
        // let ul = mat.uniformsList;
        let ul = mat.program.getUniforms().seq;
        exportShaders.ulnames = ul.map(function (x) { return x.id; });
        exportShaders.ulvals = {};
        WA.ulnames = exportShaders.ulnames; // while debugging
        log('ulnames:', exportShaders.ulnames.join('  '));
        Maestro.on('postframe', function () {
            exportShaders.formatVals = exportShaders.ulnames.map(function (u) {
                let v = exportShaders.ulvals[u];
                let fv = v.minFilter ? "TEXTURE" : format(v);
                if (u === 'rot4')
                    fv = '[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]';
                if (u === 'gscale')
                    fv = 1;
                return u + '=' + fv;
            }).join('\n');
            // log(exportShaders.formatVals);
            writetextremote('exportShader/vert.vs.c', "#define varying out\n" + mat.vertexShader);
            writetextremote('exportShader/frag.fs.c', "#define varying in\n" + mat.fragmentShader);
            writetextremote('exportShader/uniforms.txt', exportShaders.formatVals);
            COL.randcols();
            if (tad)
                tad.reservedProps(); // we have just overridden those, put them back, ??? should be in tad.randcols()???
            writetextremote('exportShader/colData.txt', COL.array.join(',\n'));
            let ss = [];
            // ss.push("struct Material{ float");
            let cn = COL.names;
            for (let i = 0; i < cn.length; i += 4)
                ss.push(cn[i] + "," + cn[i + 1] + "," + cn[i + 2] + "," + cn[i + 3]);
            let sss = ss.join(",\n");
            sss = "struct Material{ float\n" + sss + "\n;\n};";
            writetextremote('exportShader/colStruct.txt', sss);
            serious('to fix prefompile -> optimizeShaders');
            require('child_process').exec('precompile.cmd vert.vs', { cwd: 'exportShader' });
            require('child_process').exec('precompile.cmd frag.fs', { cwd: 'exportShader' });
            exportShaders.fixcols = false;
            setInput(W.GPUSCALE, true); // at least for now
            remakeShaders();
        }, undefined, true);
    }, undefined, true);
    if (s)
        setTimeout(springs.start, 500);
};
/** export shaders, using code for the names */
function exportmyshaders(mat = 'ALL', code, extra = '') {
    const tranrule = currentGenes.tranrule.pre('SynthBus');
    if (typeof mat === 'number') {
        opmode = mat;
        mat = getMaterial(currentGenes.tranrule, currentGenes, true);
    }
    if (mat === 'ALL') {
        for (let mk in material) {
            if (!material[mk])
                continue;
            if (mk === 'matcodes' || mk === 'defines')
                continue;
            if (material[mk][tranrule])
                exportmyshaders(material[mk][tranrule], code);
            if (material[mk].matrix)
                exportmyshaders(material[mk].matrix, code, 'MATRIX');
            if (material[mk].NOTR)
                exportmyshaders(material[mk].NOTR, code, 'NOTR');
            if (material[mk]["horn(\"main\");"])
                exportmyshaders(material[mk]["horn(\"main\");"], code, 'COMMON');
        }
        if (springs && springs.material) { // export the 'main' springs
            springs.material.opmode = 'springs';
            exportmyshaders(springs.material, code, 'springs');
        }
        return;
    }
    mat = mat || debugLastMat || material.regular[tranrule];
    //let mm = mat.fragmentShader.split('float vv = lopos .z + 0.5;')[1];
    //log('>>>> fragment of fragment shader', mm.substring(0, 400).replace(/$/g,"!"));
    let op = mat.opmode + extra;
    let xcode = code || '_XX';
    const x300 = ises300 ? '#version 300 es\n' : '';
    if (nwfs) {
        let dir = 'exportShader/' + xcode + '/';
        mkdir(dir);
        let place = dir + op;
        if (!fileExists(`${dir}/loptimizeShaders.cmd`)) {
            const loptimizeShaders = nwfs.readFileSync('loptimizeShaders.cmd');
            writetextremote(`${dir}/loptimizeShaders.cmd`, loptimizeShaders);
        }
        writetextremote(place + '.vs.c', x300 + mat.vertexShader);
        writetextremote(place + '.fs.c', x300 + mat.fragmentShader);
        require('child_process').exec('loptimizeShaders.cmd ' + op, { cwd: dir });
    }
    else {
        let dir = 'exportShader\\' + xcode + '\\';
        mkdir(dir);
        let place = dir + op;
        runcommandphp(`copy loptimizeShaders.cmd exportShader\\${xcode}\\loptimizeShaders.cmd`);
        remotesave(place + '.vs.c', x300 + mat.vertexShader);
        remotesave(place + '.fs.c', x300 + mat.fragmentShader);
        runcommandphp(dir + '\\loptimizeShaders.cmd ' + op);
    }
}
/** save the current shader information in a file
 * This will later be able to be used in getMaterial with savedMaterials.usesaved=true
 * Currenty not complete; we need to capture some getMaterial side effects as well (e.g. setting uniforms?)
*/
function saveCurrentShaders(fid) {
    const mmx = {};
    for (let m in material) {
        const mm = material[m];
        if (typeof mm === 'object') {
            mmx[m] = {};
            for (let x in mm) {
                const mmxx = mm[x];
                if (mmxx.fragmentShader) {
                    mmx[m][x] = { fragmentShader: mmxx.fragmentShader, vertexShader: mmxx.vertexShader };
                    if (mmxx.uniforms !== uniforms)
                        log('bad uniforms', m, x);
                }
            }
        }
    }
    writetextremote(fid, 'var savedMaterials = ' + JSON.stringify(mmx));
    return mmx;
}
/** test precompiled optimized */
function testprec(key = 'onetestsmX') {
    //function *go() {
    Gldebug.stop();
    simplemode = true;
    simpleset();
    setInput(W.SINGLEMULTI, false);
    remakeShaders();
    searchValues.usesavedglsl = key;
    remakeShaders();
    nomess();
    setshowstats(true);
    stats.mode = 0;
    stats.setMode(stats.mode);
    setInput(W.resbaseui, 4);
    //}
}
/* utility to save custom graph to console
ideas from https://github.com/mrdoob/three.js/issues/10961#issuecomment-292193243
obj is the object to show,
extrafrun is an optional function to display extra features from the object
extdepth is the depth to which the tree should be pr-expanded
e.g. printGraph(V.camscene, x=> format(x.scale))
 */
function printGraph(obj, extrafun, expdepth = 0, depth = 0, place = '') {
    const xx = extrafun ? extrafun(obj) : '';
    const name = (!obj.name || typeof obj.name === 'function') ? (obj.guiName || '.') : obj.name;
    (depth >= expdepth ? console.groupCollapsed : console.group)('%s %s: %s %s <%O>', place, obj.type, name, xx, obj);
    obj.children.forEach((x, i) => printGraph(x, extrafun, expdepth, depth + 1, place + '/' + i));
    console.groupEnd();
}
;
let noNaNreport = 10;
/** check input for NaN, return a  */
function noNaN(v, a = 0) {
    if (isNaN(v)) {
        if (noNaNreport-- > 0)
            console.error('NaN value replaced in roatation/scale/pan');
        return a; // coded like this to make easy to set breakpoint
    }
    return v;
}
const defaultPsuedogenes = { _qux: 0, _quy: 0, _quz: 0, _quw: 1, _panx: 0, _pany: 0, _panz: 0, _uScale: 1 };
const defaultMateles = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/** fix nans for given fields in an object (probably genes) */
function noNaNG(genes, set = defaultPsuedogenes) {
    let bad = 0;
    for (const gn in set) {
        if (!(gn in genes))
            if (noNaNreport-- > 0)
                console.error(gn, 'not found in genes');
        if (isNaN(genes[gn])) {
            if (noNaNreport-- > 0)
                console.error('NaN value replaced in rotation/scale/pan', gn, set[gn]);
            genes[gn] = set[gn];
            bad++;
        }
    }
    return bad;
}
let OM = {};
OM.tmat = new THREE.Matrix4();
OM.tvec3 = new THREE.Vector3();
OM.tpos = new THREE.Vector3();
OM.tquot = new THREE.Quaternion();
OM.tscale = new THREE.Vector3();
/** make a separate transfrom and save in genes, should interwork with genestoRot4, but ... todo 30/03/17
 * 8 June 2021, prior to this data code was trying to make rotation and pan work in other order,
 * but was failing and just getting pan wrong.
 *
 * As of 8 June 2021 we are not trying to reverse rotation and pan order,
 * so code is simpler and 'correct'.
*/
function rot4toGenes(genes = currentGenes) {
    if (inputs.using4d)
        return;
    if (!genes._rot4_ele)
        return;
    noNaNG(genes._rot4_ele, defaultMateles);
    var xxmat4 = OM.tmat, e = xxmat4.elements;
    e.set(genes._rot4_ele);
    // e[3] = e[7] = e[11] = 0;
    xquat.setFromRotationMatrix(xxmat4);
    genes._qux = noNaN(xquat.x);
    genes._quy = noNaN(xquat.y);
    genes._quz = noNaN(xquat.z);
    genes._quw = noNaN(xquat.w, 1);
    genes._panx = noNaN(genes._rot4_ele[3]);
    genes._pany = noNaN(genes._rot4_ele[7]);
    genes._panz = noNaN(genes._rot4_ele[11]);
}
/** make a separate transfrom and save in genes */
function genestoRot4(genes = currentGenes) {
    if (inputs.using4d)
        return;
    noNaNG(genes);
    xquat.x = noNaN(genes._qux);
    xquat.y = noNaN(genes._quy);
    xquat.z = noNaN(genes._quz);
    xquat.w = noNaN(genes._quw, 1);
    xquat.normalize();
    if (!genes._rot4_ele)
        genes._rot4_ele = [];
    xmat4.elements = genes._rot4_ele;
    xmat4.makeRotationFromQuaternion(xquat);
    // TODO: verify and tidy
    //var xxmat4 = new THREE.Matrix4();
    //xxmat4.copy(xmat4);
    //xxmat4.transpose();
    var v3 = new THREE.Vector3();
    v3.set(genes._panx, genes._pany, genes._panz);
    //v3.applyMatrix4(xxmat4);
    genes._rot4_ele[3] = noNaN(genes._panx);
    genes._rot4_ele[7] = noNaN(genes._pany);
    genes._rot4_ele[11] = noNaN(genes._panz);
}
var ambientOcclusionInit = function () {
    //https://threejs.org/examples/webgl_postprocessing_sao.html
    //maybe also see https://github.com/wizgrav/aframe-effects
    if (!THREEA.EffectComposer) {
        $('head').append(`
            <script src="JSdeps/postprocessing/EffectComposer.js"></script>
            <script src="JSdeps/postprocessing/RenderPass.js"></script>
            <script src="JSdeps/postprocessing/ShaderPass.js"></script>
            <script src="JSdeps/postprocessing/SAOPass.js"></script>

            <script src="JSdeps/shaders/CopyShader.js"></script>
            <script src="JSdeps/shaders/SAOShader.js"></script>
            <script src="JSdeps/shaders/DepthLimitedBlurShader.js"></script>
            <script src="JSdeps/shaders/UnpackDepthRGBAShader.js"></script>
        `);
    }
    const saoPass = new THREEA.SAOPass(V.camscene, camera, true, false); // depthTexture, useNormals
    saoPass.params.saoScale = 1; // <<< this is critical and different in different cases
    // <<< varies between 1 and 100.  NONO Is this from the 254 bit depth target??? NONO
    // <<< used in shader as relative to camera.far, hence smaller when working in metres
    //now, make it so that the composer will be called during display...
    rrender.effects = {
        // composer: composer, renderPass: renderPassL,  useComposer: false,
        saoPass: saoPass,
        render: (scenep, camerap, target, flag) => {
            // the effects how follow the 'standard' render rather than instead
            //renderer.setRenderTarget(target);
            //renderer.render(scenep, camerap);
            // arrange size separately
            // If we change size we also need to change things like saoBlurRadius and saoScale ?
            // and unnecessarily gpu memory consuming where size is large
            // saoPass.setSize(target.width, target.height);
            if (saoPass.enabled)
                saoPass.render(renderer, 0, target); // writeBuffer not used, target is input and output
        }
    };
    saogui();
};
/** show decontructed projection matrix, e may be camera, three projection matrix or elements */
function showprojmat(e) {
    if (e.projectionMatrix)
        e = e.projectionMatrix;
    if (e.elements)
        e = e.elements;
    const r = {};
    r.fov = 2 * Math.atan(1 / e[5]) * 180 / Math.PI;
    r.near = e[14] / (e[10] - 1.0);
    r.far = e[14] / (e[10] + 1.0);
    log(r);
    return r;
}
/** convert image to high quiality jpg using ifranview, return new fid if ok, else undefined */
async function tgaconv(fid, nfid, q = 100) {
    // ffmpeg quality in -q:v is 1 highest, 31 lowest
    // not sure why we are not using ffmpeg???
    // runcommandphp(runcommandphp(`..\\ffmpeg\\ffmpeg -y -i "${fid}"  -q:v 1 "${fid}.jpg"`))
    // %iv% %fid% /convert=%fid%.iv80.jpg /jpgq=80
    fid = fid.split('/').join('\\');
    const iv = 'c:\\Program Files\\IrfanView\\i_view64.exe';
    const gray = (G.fillprop === 1) ? '/gray' : '';
    if (!nfid)
        nfid = `${fid}.iv${q}.jpg`;
    const cmd = `"${iv}" "${fid}" ${gray} /convert=${nfid} /jpgq=${q}`;
    const rr = runcommandphp(cmd);
    // should convert to use Promises. n.b. await S.frame() doesn't seem to work here ...
    if (rr === '' && fileExists(nfid)) {
        const cmd1 = `start "iview" "${iv}" "${nfid}"`;
        const rr1 = runcommandphp(cmd1);
        return nfid;
    }
    else {
        alert(`tgaconv error:\n${cmd}\n${rr}\nMay be irfanView 64 bit not found where expected`);
        console.error(`tgaconv error:\n${cmd}\n${rr.responseText}`);
    }
}
var tgaspreadusetga = true; // var for sharing
var imageOpts, specialPostrender, setupImageEdge, clearImageEdge; // from image.js
function saogui(pgui = V.gui) {
    if (!pgui)
        return;
    const sao = rrender.effects.saoPass;
    const p = sao.params;
    const gui = V.saogui = dat.GUIVR.createX("SAO");
    pgui.addFolder(gui);
    gui.add(sao, 'enabled').listen().showInFolderHeader();
    gui.add(p, 'output', 0, 4).step(1).listen();
    gui.add(p, 'saoBias', 0, 1).step(0.1).listen();
    gui.add(p, 'saoIntensity', 0, 1).step(0.01).listen();
    gui.add(p, 'saoScale', 0, 2).step(0.01).listen();
    gui.add(p, 'saoKernelRadius', 0, 200).step(1).listen();
    gui.add(p, 'saoMinResolution', 0, 0.005).step(0.0001).listen();
    gui.add(p, 'saoBlur').listen();
    gui.add(p, 'saoBlurRadius', 0, 20).step(1).listen();
    gui.add(p, 'saoBlurStdDev', 0, 10).step(1).listen();
    gui.add(p, 'saoBlurDepthCutoff', 0, 0.1).step(0.01).listen();
    // output: 0,
    // saoBias: 0.5,
    // saoIntensity: 0.18,
    // saoScale: 1,
    // saoKernelRadius: 100,
    // saoMinResolution: 0,
    // saoBlur: true,
    // saoBlurRadius: 8,
    // saoBlurStdDev: 4,
    // saoBlurDepthCutoff: 0.01
}
//# sourceMappingURL=graphbase.js.map