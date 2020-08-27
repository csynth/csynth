"use strict";
var W = window;
var THREEA = THREE;
;
var WA = window;
var useCutdown = false;
var uniforms;
var canv2d;
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
var usesavedglsl; // set to use precomputed shaders
var renderMainObject = true; // set to false to stop render of main object
var graphbase = {};
var THREEX = { RGBFormat: THREE.RGBFormat };
// patch below as Nightly would not run with RBAFormat
//if (navigator.userAgent.indexOf('Firefoxx/') !== -1)
//    THREEX.RGBFormat = THREE.RGBAFormat;
// patch below as Edge would not run with Angle points
var isEdge = (navigator.userAgent.indexOf('Edge/') !== -1);
// if (isEdge) THREE.SKIPINSTANCES = true;
let newTHREE_DataTextureItems = {};
let newTHREE_DataTextureId = 0;
const newTHREETypeSize = {};
newTHREETypeSize[THREE.UnsignedByteType] = 1;
newTHREETypeSize[THREE.FloatType] = 4;
const newTHREEFormatSize = {};
newTHREEFormatSize[THREE.RGBAFormat] = 4;
newTHREEFormatSize[THREE.LuminanceFormat] = 1;
let newTHREE_DataTextureSize = 0;
function _registerTexture(dt, args, width, height, format, type) {
    const fms = newTHREEFormatSize[format];
    const tys = newTHREETypeSize[type];
    let size = width * height * tys * fms;
    if (isNaN(size)) {
        console.error('bad texture', width, height, TK(format), fms, TK(type), tys);
        size = 0;
    }
    dt.realDispose = dt.dispose;
    const id = newTHREE_DataTextureId++;
    newTHREE_DataTextureItems[id] = { dt: new WeakSet([dt]), args, width, height, format, type, fms, tys, size };
    newTHREE_DataTextureSize += size;
    dt.dispose = () => {
        newTHREE_DataTextureSize -= size;
        delete newTHREE_DataTextureItems[id];
        dt.realDispose();
    };
    return dt;
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
    if (isWebGL2 && args[3] === THREE.LuminanceFormat)
        args[3] = THREE.RedFormat; // horrid but works (or at least helps)
    //@ts-ignore
    const dt = new THREE.DataTexture(...args);
    dt.name = name;
    return _registerTexture(dt, args, dt.image.width, dt.image.height, dt.format, dt.type);
}
// wrapper for new rendertarget, with added name option
function WebGLRenderTarget(widthp, heightp, options, name) {
    const maxt = gl.getParameter(gl.MAX_TEXTURE_SIZE); // in case created renderTarget very early
    const max = Math.max(widthp, heightp);
    if (max > maxt) {
        const ox = widthp + 'x' + heightp;
        widthp = Math.floor(widthp * maxt / max);
        heightp = Math.floor(heightp * maxt / max);
        const nx = widthp + 'x' + heightp;
        console.error(msgfixerror('!res' + name, `resolution ${ox} too high, reduced to ${nx}`));
    }
    let r = new THREE.WebGLRenderTarget(widthp, heightp, options);
    r.name = name; // THREEA
    return _registerTexture(r, [widthp, heightp, options, name], widthp, heightp, r.texture.format, r.texture.type);
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
var OPREGULAR, OPSHADOWS, OPPICK, OPMAKEGBUFFX, OPPOSITION, OPOPOS, OPOPOS2COL, OPSHAPEPOS, OPTSHAPEPOS2COL, OPTEXTURE, OPBUMPNORMAL, OPMAKESKELBUFF, OPTEST;
var oplist = ['regular', 'shadows', 'pick', 'makegbuffx', 'position', 'opos', 'opos2col', 'shapepos', 'tshapepos2col', 'texture', 'bumpnormal', 'makeskelbuff', 'test'];
var OPDEFINE = "";
(function () {
    for (let i = 0; i < oplist.length; i++) {
        let uname = "OP" + oplist[i].toUpperCase();
        W[uname] = i;
        OPDEFINE += '#define ' + uname + " " + i + "\n";
    }
    OPDEFINE += '#define virtual\n';
    OPDEFINE += '#define OUT\n';
    OPDEFINE += '$$$uniforms$$\n';
    OPDEFINE += '$$$varyings$$\n';
    OPDEFINE += '$$$header$$\n';
})();
var PROJ_STEM_DIR = 'projection_stems/';
var camera, scene, renderer, canvas;
var opmode = OPREGULAR;
var geometry;
var material = {}; // material holds cache of materials (key includes opcode), and assembled code (no opcodein key)
var width, height;
var stats;
var running = true;
var viewtarget = new THREE.Vector3();
var gl; // gl context, updated each frame in case
var threeClock = new THREE.Clock();
var renderRatio = 1;
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
var extradefines = ""; // used for test/debug
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
    scenen.autoUpdate = false;
    scenen.name = s + newscene.id++;
    scenen.frustumCulled = false;
    return scenen;
};
newscene.id = 0;
/** tidy geometry when we know it won't change again */
THREEA.Geometry.prototype.tidy = function () {
    this.normals = [];
    this.vertices = [];
    this.faceVertexUvs = [];
    this.faces = [];
    this.faceUvs = [];
};
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
    s = s.replaceall('\\\r\n', ''); // line continuation
    return s;
}
const parseUniformsK = {};
/**
 *
 * @param {string} shader
 * @param {object} myshadergenes
 * @param {array} texturedefines
 */
function parseUniforms(shader, myshadergenes, texturedefines) {
    //                     name          val         min         max         delta      step               help
    //let rx = /gene\s*?\(\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?)\s*?,\s*?(\S*?),\s*?(\S*?)\s*?\)\s*?\/\/\s*?(.*?)\n/g
    //                  parms          help
    let nn = 0, nt = 0, used = {};
    shader = shader.replaceall('//gene', '// g e n e').replaceall('// gene', '// g e n e'); // hide commented out genes
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
            addgeneperm(name, val, min, max, delta, step, help, tag, free, true);
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
    if (!gl) { /* onframe(baseShaderChanged);*/
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
function getMaterial(matvariant, quickout) {
    let opname = oplist[opmode];
    if (matvariant.tranrule) { // matvariant is (probably?) genes
        matvariant = matvariant.tranrule;
    }
    let matopmode = material[opname];
    if (!matopmode)
        matopmode = material[opname] = {};
    // get precomputed materials for quicker startup, requires savedMaterials.usesaved = true
    // not currently working; probably side-effects such as uniform generation still needed (pending 19 Jan 19)
    if (savedMaterials && savedMaterials.usesaved && savedMaterials[opname] && savedMaterials[opname][matvariant]) {
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
    const matkey = matvariant.pre('SynthBus');
    // experiment to save recompiling passes that don't need it
    // currently not working right???
    if (inputs.USESKELBUFFER && /** !inputs.SINGLEMULTI && */ matvariant !== "NOTR" && matvariant.indexOf('overrides') === -1) {
        if ([OPMAKESKELBUFF, OPOPOS, OPSHAPEPOS, OPPOSITION, OPPICK].indexOf(opmode) === -1) // <<< these are the ones that must have their own specific shader
            matvariant = 'horn("main");';
    }
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
        log('>>> creating material', opname, origmatvariant.substring(0, 20).replaceall('\n', '    '));
        // todo check 'true' below. removed sjpt 19 Jan 19
        if ( /* true || */!material.shadergenes) { // first time in after reset, establish common shader code; BEFORE horn compiles colours
            if (shaderlog)
                log("assembling common material");
            let defines = htmlDefines();
            material.defines = defines;
            material.shadergenes = {};
            let texturedefines = [];
            // extract the main vertex shader and matvariant, and merge them appropriately
            var vertcode = getfiledata("shaders/" + vertfid);
            vertcode = "// !!!!!!! VERT " + vertfid + "\n" + doInclude(vertcode);
            parseUniforms(vertcode, material.shadergenes, texturedefines);
            material.basevertcode =
                //"#define VERTEX 1\n#define textureget(s,p) texture2DLod(s,p,0.)\n"
                "#define VERTEX 1\n#define textureget(s,p) texture2D(s,p)\n"
                    + OPDEFINE + vertcode;
            texturedefines = [];
            var fragcode = getfiledata("shaders/" + fragfid);
            fragcode = "// !!!!!!! FRAG " + fragfid + "\n" + doInclude(fragcode);
            parseUniforms(fragcode, material.shadergenes, texturedefines);
            material.basefragcode =
                //"#define VERTEX 0\n#define textureget(s,p) texture2D(s,p,-16.)\n"
                "#define VERTEX 0\n#define textureget(s,p) texture2D(s,p)\n"
                    + OPDEFINE
                    + fragcode;
            if (shaderlog)
                log("common material assembled");
            material.defines += "\n\n//<< automatically generated macros to access genes defined in shader genet() (red1 etc) based on (global) xhornid\n";
            material.defines += texturedefines.join('\n') + '\n\n';
            // here so shared between horns, fano, etc
            material.defines += "\n//<< NONU set from NONUNIFORMS to either include or not include associated code (x)\n";
            material.defines += inputs.NONUNIFORM ? '#define NONU(x) x\n' : '#define NONU(x)\n';
        }
        let codevariant = matvariant === "NOTR" ? notrvariant : trancodeForTranrule(matvariant);
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
        setObjUniforms(currentGenes, uniforms); // for horns
        if (!material.matcodes)
            material.matcodes = {};
        let matcodes = material.matcodes[fulltrankey];
        if (!matcodes) { // first time in for this trankey
            // these vary more often so must be taken out of prework above
            let sdefines = "";
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
            vertcode = substituteShadercode(vertcode, vals, codevariant, 'vertex', undef);
            // TODO separate uniforms and colour/texture part of parseUniforms
            parseUniforms(vertcode, material.shadergenes, []);
            fragcode = sdefines + material.basefragcode;
            fragcode = substituteShadercode(fragcode, vals, codevariant, 'fragment', undef);
            parseUniforms(fragcode, material.shadergenes, []);
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
        let oppre = '\n' // initial \n needed for three.js bug ?
            + "precision " + precision + " sampler2D;\n"
            + "precision " + precision + " float;\n"
            + "\n#define OPMODE " + xopmode + " // ubershader variant for " + oplist[xopmode]
            + "\n#define MAXH 16\n"
            + "\n#define COLNUM " + ffloat(COL.NUM) + "      //<< used to define how many different coloured objects there are, depends on the horndef.\n"
            + "\n#define COLPARMS " + ffloat(COL.PARMS / 4) + "  //<< used to give range of how many different genet definitiona are allowed (4 definitions for each entry as it is a vec4)\n"
            + material.defines + extradefines + "\n"
            + (normloop ? "\n#define NORMLOOP " + ffloat(normloop) + "\n" : "\n");
        let vertpre = "", fragpre = "";
        if (!matvariant || matvariant === "NOTR") { // for walls etc
            oppre += "#define NOTR\n";
        }
        else if (matvariant === 'horn("main");') {
            oppre += '#define COMMON\n';
        }
        if (isWebGL2) {
            vertpre += "#version 300 es\n";
            //    vertpre += "#extension GL_EXT_gpu_shader4 : enable\n";
            vertpre += "precision " + precision + " float;\n";
            vertpre += "#define attribute in\n";
            vertpre += "#define varying out\n";
            fragpre += "#version 300 es\n";
            //    fragpre += "#extension GL_EXT_gpu_shader4 : enable\n";
            fragpre += "precision " + precision + " float;\n";
            fragpre += "#define attribute in\n";
            fragpre += "#define varying in\n";
            fragpre += "#define gl_FragColor glFragColor\n";
            fragpre += "out vec4 glFragColor;\n";
            oppre = "#define texture2D texture\n" + oppre;
            oppre = "#define textureCube texture\n" + oppre;
        }
        // if (inputs.GPUGRIDN)  // only one of the below is used at any one time, but no harm to generate both
        // easier with experiments as skelbuffer etc can or cannot use positioni
        vertpre += "attribute float positioni;\n";
        //else
        vertpre += "attribute vec2 position2;\n";
        vertpre += "attribute vec3 position;\n";
        vertpre += "attribute vec3 normal;\n";
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
        let mattype = THREE.RawShaderMaterial;
        let vertpost = "";
        //if (inputs.SINGLEMULTI && currentHset && matvariant !== 'NOTR' && opmode === OPPOSITION)
        //    vertpost = '\n void testtest() { \n' + currentHset.singlePassCode + '\n}';               // debug if singlePassCode will even compile
        //log("compile material", oplist[xopmode], matvariant.substring(0, 20));
        //let save = material;
        let vertexShader = vertpre + oppre + matcodes.vertcode + vertpost;
        let fragmentShader = fragpre + oppre + matcodes.fragcode;
        // used prepared shaders for given key, if avalable use an 'opt' shader
        // common usage is usesavedglsl='_XX.opt'; remakeShaders()
        // or in url  &usesavedglsl=_XX.opt
        usesavedglsl = FIRST(usesavedglsl, searchValues.usesavedglsl);
        if (usesavedglsl && opname) {
            let kname = '';
            if (matvariant === 'NOTR')
                kname = 'NOTR';
            if (matvariant === 'horn("main");')
                kname = 'COMMON';
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
            if (!vv) {
                vv = getfiledata(pre + '.vs?' + Date.now());
                vvuse = pre + '.vs?';
            }
            if (vv)
                vertexShader = vv.split(wrong).join(correct);
            else
                vvuse = 'standard';
            let ff, ffuse;
            if (!ff) {
                ff = getfiledata(pre + '.fs?' + Date.now());
                ffuse = pre + '.fs?';
            }
            if (ff)
                fragmentShader = ff.split(wrong).join(correct);
            else
                ffuse = 'standard';
            msgfixlog('usesavedglsl', `${usesavedglsl} opname=${opname} kname=${kname} ffuse=${ffuse} vvuse=${vvuse}`);
        }
        try {
            // define the material using the matvariant
            mat = new mattype({
                uniforms: uniforms,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.FrontSide
            });
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
            log('>>> material created', opname, origmatvariant.substring(0, 20).replaceall('\n', '    '));
            //consoleTimeEnd('end windup material created testmat', 'log');
        }
        catch (e) {
            msgfix('shader', "Shader error (old shader used): " + e);
        }
        //consoleTimeEnd('end windup material created testmat', 'leave on error');
        //if (!currentGenes.tranrule)
        //currentGenes.tranrule = matvariant;
        //target.tranrule = matvariant;
        matopmode[matkey] = mat;
        matopmode[fulltrankey] = mat;
        let name = typeof matvariant === 'string' ? matvariant.substring(0, 40).replaceall('\n', ' ') : appToUse;
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
        //testmaterial.test(mat);
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
    function clog(a, b, c) { log(a, b, c); }
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
    ///  if (tryWebGL2 === undefined) tryWebGL2 = startvr; /// webgl2 suddenly broken 3/3/2017 ???? why
    //setGenesAndUniforms();
    //geneCallbacks();
    // <editor-fold desc="set up renderer, camera etc">
    // set up basic graphics >>>> pjt todo verify speed/quality of this antialias
    // logarithmicDepthBuffer improves rendering, eg of sheets, but can break text in dat.guivr
    // if (searchValues.nohorn) rca.logarithmicDepthBuffer = true;
    isWebGL2 = false;
    if (searchValues.tryWebGL2) {
        canvas = document.createElement('canvas');
        // Try creating a WebGL 2 context first
        gl = canvas.getContext('webgl2', rca);
        if (!gl) {
            gl = canvas.getContext('experimental-webgl2', rca);
        }
        isWebGL2 = !!gl;
    }
    try {
        if (isWebGL2) {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl });
            // patches until THREE does this
            gl.drawArraysInstancedANGLE = gl.drawArraysInstanced;
            gl.drawElementsInstancedANGLE = gl.drawElementsInstanced;
            gl.vertexAttribDivisorANGLE = gl.vertexAttribDivisor;
            if (gldebug === undefined)
                gldebug = 1; // bug somewhere where I use a texture too impatiently, which this seems to resolve
        }
        else {
            renderer = new THREE.WebGLRenderer(rca);
            gl = renderer.context;
            canvas = renderer.domElement;
        }
        canvas.id = 'canvas';
        THREEA.NoFloatBlending = !gl.getExtension('EXT_float_blend');
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
    // three.js default (at 106) is 'local-floor', which should be supported but is not on Chrome 79.0.3942.0 and 81.0.4006.0
    if (renderer.vr.setReferenceSpaceType)
        renderer.vr.setReferenceSpaceType('local'); // ('bounded-floor');
    // not local-floor, for three rev 106: ??? for XR
    //  bounded-floor, local-floor, unbounded, viewer seems valid from Canary 27/07/2019
    //  NObounded-floor, NOlocal-floor, NOunbounded, viewer, local seems valid from Canary 81.0.4006.0
    // https://www.w3.org/TR/webxr/#enumdef-xrreferencespacetype
    // 22/10/2019, OK local,viewer   NOK bounded-floor, local-floor, unbounded
    searchValues.useshadows = !!searchValues.useshadows;
    if (searchValues.useshadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    }
    // add back for convenience, this has been deprecated in three.js for some reason
    renderer.clearTarget = function (renderTarget, color, depth, stencil) {
        // console.warn( 'THREE.WebGLRenderer: .clearTarget() has been deprecated. Use .setRenderTarget() and .clear() instead.' );
        this.setRenderTarget(renderTarget);
        this.clear(color, depth, stencil);
    };
    // renderer.setPixelRatio( window.devicePixelRatio ); // no, only changed later
    if (!isFirefox) {
        VRSCinit(); // as soon as possible after renderer defined check VR devices and start audio
        clog('VRSCinit done as soon as possible');
    }
    else {
        // for some reason, Firefox loses connection if there is heavy work after getting the device
        // so wait till things fairly normal
        onframe(VRSCinit, 50);
    }
    if (!renderer.extensions.get('OES_texture_float') && !isWebGL2 && !searchValues.nohorn) {
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
    scaleGpuPrep();
    clog('scaleGpuPrep done');
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
    onWindowResize();
    clog('onWindowResize done');
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
    // <editor-fold desc="set callbacks">
    // we always want this even if the others are removed
    canvas.addEventListener('mousemove', function (evt) {
        if (badmouse(evt))
            return killev(evt); // TODO: check this really prevents it coming up in exhibition mode
        if (exhibitionMode)
            return;
        //msgfix('move', offx(evt), offy(evt), 'sx', evt.screenX);
        const canvoff = canvas.style.left.replace('px', '');
        const offfx = evt.offsetX; // offx(evt) wrong here as it allows for canvas display not 1::1
        if ((offfx <= 20 - canvoff || evt.clientX < 20) && W.controls && !oxcsynth && !reserveSlots) {
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
        getMaterial("NOTR", true); // force genes to be generated, eg for lights
        clog('initialGeneGeneration done');
        clog('initialGeneGeneration done 2');
        renderer.sortObjects = false;
        renderer.autoClear = false;
        renderer.autoClearColor = false;
        renderer.autoClearDepth = false;
        renderer.autoClearStencil = false;
        //###    setViewports([0, 0]);  // until proven otherwise, at least mainvp and slots will be consistent
        clog('setviewports done');
        if (hornTrancodeForTranrule)
            trancodeForTranrule = hornTrancodeForTranrule; // may not be for Fano
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
        }
        else {
            currentGenes = settarget({ tranrule: "horn('main').ribs(20).radius(50).stack(1200); mainhorn='main'", name: "default" });
        }
        loadOao.lasttime = frametime;
        if (startscript) {
            if (!startscript.includes('/data/') && !(startscript[0] === '/')) {
                const dir = location.href.includes('/csynthstatic/') ? '../data/' : 'CSynth/data/';
                startscript = dir + startscript;
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
                makeGenetransform();
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
    // </editor-fold>
    // if (!nwfs) W.showfull.style.display = "none"; // no, full useful even without nwwin
    if ("ontouchstart" in window && !V.BypassHammer)
        Touch2Init(); // Touch.Init();
    log("extra windows. globals used=", countXglobals());
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
    if (inputs.fixcontrols)
        return; // don't lose if it is fixed
    if (lastsrc)
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
        if (sl && (vn !== sl.dispobj.vn || !sl.dispobj.visible))
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
    }
}
function makevr2() {
    if (!islocalhost)
        return;
    renderVR.xrfs.lastrequest = true;
    EX.toFront();
    // EX.toFront();  // also stops it being maximized
    nircmd(`sendkey f2 press`);
    log('xrfs f2 sent by makevr2');
}
var viewsnapHalflife = 150;
var rendall = false; // set to true to render all every time; in case layoutChanged optimization fails
/** render the objects */
var renderFrame = function (rt) {
    // poll to keep xr running: could easily be generalized for webVR: states are opening, unguarded and force retry
    if (!searchValues.devMode)
        if (renderVR.xrfs.lastrequest && !renderVR.invr() && renderVR.xrfs.state === 'unguarded') { // } && !searchValues.devMode) {
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
    if (renderVR.invr())
        renderObjs = renderVR; // force two window render, check every frame for confusion after change
    if (startvr)
        if (renderer.vr.isxr)
            msgfix('>XR isPresenting', renderer.vr.isPresenting(), renderObjs.name, canvas.width / 2, canvas.height);
        else
            msgfix('>VR isPresenting', renderer.vr.getDevice() ? renderer.vr.getDevice().isPresenting : 'no device', renderObjs.name, canvas.width / 2, canvas.height);
    // compute forward direction allowing for camera and rot4, to use for best normals
    // do this before splitting stereo, we want consistent value between eyes
    // note on rotations:
    // standard transform is  viewMatrix * (pos * rot4)
    //     = viewMatrix * rot4' * position
    //     = camera.matrixWorld**-1 * rot4' * position
    // we are only interested in rotations on orthonormal transformation, so inverse is equivalent to transpose, so
    //     ?= camera.matrixWorld' * rot4' * pos
    //     = (rot4 * camera.matrixWorld)' * pos
    let r4 = uniforms.rot4.value;
    let vme = renderFrame.mmm.multiplyMatrices(uniforms.rot4.value, camera.matrixWorld).elements;
    uniforms.awayvec.value.set(vme[8], vme[9], vme[10]);
    // correctNWsize();  // Should not be needed
    // if (framenum === Gldebug.stopframe) Gldebug.stop(); // managed by Gldebug now ...
    Maestro.trigger("preframe", { rendertarget: bigrt });
    if (WA.CLeap && CLeap.camera)
        CLeap.camera.copy(camera); // may be vr camera 0 or nonvr camera
    rt = rt || (WA.Holo && Holo.source); // if using Holo/Looking Glass we render to that buffer
    renderObjs(rt);
    Maestro.trigger("postframe", { rendertarget: bigrt });
}; // renderFrame
renderFrame.mmm = new THREE.Matrix4();
;
var renderObjsInner = function fRenderObjsInner(rt, novr) {
    // if (CLeap && CLeap.camera && !renderVR.eye2) CLeap.camera.copy(camera);  // may be vr camera 0 or nonvr camera
    // if (usevr && !novr) { renderVR(rt); return; }
    if (renderObjsInner.direct) {
        renderer.setRenderTarget(slots[0].dispobj.rt);
        renderer.clearDepth(true);
        renderer.setRenderTarget(rt);
        renderer.clear(true, true, true);
        renderObj(slots[0].dispobj, "canvas");
        rrender('camscene_rawscene', V.camscene, camera, rt);
        if (V.nocamscene)
            rrender('nocam', V.nocamscene, V.nocamcamera, rt);
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
    let lruo = lru();
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
        if (!(isDragobj(dispobjj) /* && dragObj.dispobj.overmain */)) {
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
        listo = listo.filter(o => o.needsRender);
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
        if ((dispobj.needsRender || refresh) && dispobj.vn !== -1) {
            const scamera = camera;
            try {
                if (dispobj.camera) {
                    camera = dispobj.camera;
                    camToGenes(dispobj.genes);
                }
                renderObj(dispobj);
                V.render(dispobj.rt);
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
    renderer.setViewport(0, 0, width, height);
    renderer.clear(layoutChanged, true, true);
    renderer.sortObjects = layoutChanged;
    vpxQuadScene.autoUpdate = layoutChanged;
    vpxQuadScene.matrixAutoUpdate = layoutChanged;
    vpxQuadScene.autoUpdate = layoutChanged;
    vpxSceneRenderCamera.matrixAutoUpdate = layoutChanged;
    if (vpxQuadScene.children.length > 0)
        rrender(opmode, vpxQuadScene, vpxSceneRenderCamera, rt);
    renderer.setClearColor(ColorKeywords.green); //< use main viewport color for clearing the canvas
    renderer.sortObjects = false;
    layoutChanged = false;
    //Maestro.trigger("postframe", {dispobj:dispobj});  //just once on entire display
    //checkglerror("end of renderObjs");
    /*** experiment with textgeometry, it is much more complicated now ... ** /
    if (!renderObjsInner.textscene) {
        renderObjsInner.textscene = new THREE.Scene();
        let textmat = new THREE.MeshBasicMaterial();
        let textgeom = new THREE.TextGeometry('test', {font: new THREE.Font("source sans pro") });
        let textmesh = new THREE.Mesh(textgeom, textmat);
        renderObjsInner.textscene.add(textmesh);
    }
    rrender('text', renderObjsInner.textscene, vpxSceneRenderCamera, rt);
    /*****/
    /*** incomplete experiment with textgeometry, it is much more complicated now ... ** /
    if (true || !renderObjsInner.textscene) {
        renderObjsInner.textscene = new THREE.Scene();
        let element = document.createElement( 'div' );
        element.innerHTML = 'testtesttest';
        let object = new THREE.CSS3DObject( element );
        object.position.x = 0*Math.random();
        object.position.y = 0*Math.random();
        object.position.z = 0*Math.random();
        renderObjsInner.textscene.add(object);
    }
    rrender('text', renderObjsInner.textscene, vpxSceneRenderCamera, rt);
    /****/
};
var renderObjs = renderObjsInner; // by default, may be changed eg renderVR, renderQuad
renderObjsInner.extraFramesTime = 100;
// <editor-fold  defaultstate="collapsed" desc="fold for operations on rot4">
/** no-op delta matrix */
function matnop() { return new THREE.Matrix4(); } // could optimize, but ...
var inthreed = false;
/** zoom using genes._uScale, reeturns unit matix so will not change gene._rot4_ele etc ; ignore x,y */
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
/** rotation matrix for pair of axes and angle */
function rot(x, y, a, genes, mm = new THREE.Matrix4()) {
    if (!isFinite(a))
        return undefined;
    let s = Math.sin(a);
    let c = Math.cos(a);
    mm.elements[x + 4 * x] = c;
    mm.elements[y + 4 * y] = c;
    mm.elements[x + 4 * y] = s;
    mm.elements[y + 4 * x] = -s;
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
    if (!isFinite(a))
        return undefined;
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
var tranInteractDelay = oxcsynth ? 1e98 : 60000;
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
    makeGenetransform();
    refreshLastTouched();
}
var x00 = 0, x01 = 1, x02 = 2, x03 = 3, x10 = 4, x11 = 5, x12 = 6, x13 = 7, x20 = 8, x21 = 9, x22 = 10, x23 = 11, x30 = 12, x31 = 13, x32 = 14, x33 = 15;
/** reset the transform, or some aspect of it ~ still for from correct */
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
            let g = genes;
            g._camx = 0;
            g._camy = 0;
            g._camz = zoomdef.camz0 * basescale; // why should this scale change camera??? * renderVR.scale / 400;
            g._camqx = 0;
            g._camqy = 0;
            g._camqz = 0;
            g._camqw = 1;
            g._fov = zoomdef.fov;
            g._uScale = 1;
            genesToCam(g);
            centrescale(g);
            break;
    }
    if (isNaN(e[15])) {
        log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> resetMat post error in matrix");
        genes._rot4_ele = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    makeGenetransform(genes);
    newframe(xxxdispobj(genes));
    genesToCam(genes);
    camera.updateMatrix();
    camera.updateMatrixWorld();
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
    const smain = slots[mainvp];
    const ss = smain.width * smain.height / renderRatio ** 2;
    // reduce risk of running out of memory.
    // there may be more sets of renderTargets, and depth buffers etc not accounted for
    // and anyway we don't know storage available, so this is all a guess but better than nothing.
    const maxsize = 2e9; // arbitrary max size of render buffers; to do see if we can improve on this sensibly
    if (ss * 16 * 4 > maxsize) { // *16 for 16 bytes per pixel in 4 channel float buffer, *4 for 4 rendertargets for pipeline
        const orr = renderRatio;
        const nrr = renderRatio * Math.sqrt(ss * 16 * 4 / maxsize);
        setInput(W.renderRatioUi, nrr);
        msgfixerror('renderRatio', `attempt to set too small ${orr}, set to ${nrr} instead`);
        return;
    }
    clearrendertargets();
    for (let s in slots)
        if (slots[s] && slots[s].dispobj) {
            slots[s].dispobj.rt.dispose();
            slots[s].dispobj.rt = undefined;
        }
    for (let o in currentObjects) {
        currentObjects[o].rt.dispose();
        currentObjects[o].rt = undefined;
    }
}
/** function to resize windows etc */
function onWindowResize() {
    if (restoringInputState)
        return;
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
    if (inputs.fixcontrols) { // test for overlay
        showControls(true);
        // allow for whether or not controls has scroll, width is width left for canvas
        // scroll width is controls.offsetWidth - controls.clientWidth; 0 if not present
        width = mmwidth - W.controlscore.clientWidth - W.controls.offsetWidth + W.controls.clientWidth;
        reshowGenes();
    }
    else {
        width = mmwidth;
        showControls(false);
    }
    W.controls.style.display = savedisp;
    height = window.innerHeight;
    canvas.style.left = (mmwidth - width) + "px"; // mmwidth * 0.3;
    canvas.style.top = '0px';
    if (ipad) {
        height /= 4;
        width /= 4;
    }
    if (ipad) {
        height = 256;
        width = 256;
    }
    height = Math.floor(height);
    width = Math.floor(width);
    setSize(width, height);
    W.controls.onmousemove(undefined); // single place to compute controls size/position
    saveInputToLocal();
    if (!renderVR.invr()) {
        canvas.style.height = height + "px";
        canvas.style.width = width + "px";
    }
    else {
        vrcanv(); // may well be too early
    }
    refall();
    canv2d.style.top = canvas.style.top;
    canv2d.style.left = canvas.style.left;
    canv2d.style.height = canvas.style.height;
    canv2d.style.width = canvas.style.width;
    canv2d.width = width;
    canv2d.height = height;
    if (V.nocamcamera) {
        const aspect = width / height;
        V.nocamcamera.left = -aspect;
        V.nocamcamera.right = aspect;
        V.nocamcamera.updateProjectionMatrix();
    }
}
/** set the controls opacity from its control*/
function setControlOpacity(opacity) {
    let o = FIRST(opacity, trygeteleval("controlOpacity", 100));
    W.controlscore.style.backgroundColor = "rgba(13,13,13," + (o / 100) + ")";
    saveInputToLocal();
}
/** set the size of render window to a specific size,
force allows sizes beyond what the canvas can manage
return true if size requested created
*/
function setSize(wwidth, hheight, force) {
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
    wwidth = wwidth || (window.innerWidth);
    hheight = hheight || (window.innerHeight); //
    clearrendertargets();
    // appears to correct window scaling issues, sjpt 31/01/2014
    // not sure how often it needs to be done.
    // It seems our explicit setting of renderer size etc overrides windows.devicePixelRatio
    // I think three.js just sets renderer.devicePixelRatio once near start, but ...???
    // PJT 15/02/2019: having trouble related to this on Macbook...
    ////renderer.devicePixelRatio = 1; //don't think this property is used now
    if (renderer.getPixelRatio() !== 1)
        renderer.setPixelRatio(1);
    let wwhh = imsize();
    // not sure why this was here - commented out to get tall animation, 22/6/19
    // if (inputs.layoutbox * 1 !== 0 && wwhh[0] < wwhh[1]) wwhh = wwhh.reverse();
    width = wwidth || screens[0].width;
    height = hheight || screens[0].height;
    if (trygetele("previewAr", "checked", "") === 1) {
        let ww = wwhh[0];
        let hh = wwhh[1];
        if (width * hh / ww <= height)
            height = Math.floor(width * hh / ww);
        else
            width = Math.floor(height * ww / hh / 2) * 2;
    }
    // do NOT use render Ratio, it does not apply at the last composition render
    // renderer.setSize(width/render Ratio, height/render Ratio);
    let ok;
    if (!renderVR.invr()) { // do not upset if in vr, it will onlyt get set back gain and cause flicker
        ok = width === gl.drawingBufferWidth && height === gl.drawingBufferHeight;
        if (!ok)
            renderer.setSize(width, height);
        ok = width === gl.drawingBufferWidth && height === gl.drawingBufferHeight;
        if (!ok && !force) {
            log("implementation limitation: requested width not possible", width, height, " != ", gl.drawingBufferWidth, gl.drawingBufferHeight);
            width = gl.drawingBufferWidth - gl.drawingBufferWidth % 4;
            height = gl.drawingBufferHeight - gl.drawingBufferHeight % 4;
            log("retry with size", width, height);
            renderer.setSize(width, height);
            if (width !== gl.drawingBufferWidth || height !== gl.drawingBufferHeight) {
                serious("requested width not available even after retry");
            }
        }
    }
    renderer.setRenderTarget();
    setViewports(vps, width, height);
    camera.updateProjectionMatrix();
    document.body.style.maxHeight = window.innerHeight + 'px';
    return ok;
}
function setRunning() {
    running = inputs.running;
    newframe();
    //animate();
}
/** set uniforms for object, u may be uniforms */
function setObjUniforms(genes, u) {
    if (renderVR.eye2)
        return;
    copyFrom(genes, fixedgenes);
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
            // log ("added missing gene", gn,"to", genes.name, xxxdispobj(genes).xid);
            //} else {
            //    log("cannot find gene or genedef for uniform", gn);
            if (u[gn].type === "f")
                genes[gn] *= 1; // sometimes they get set to character string values
        }
    }
    if (genes._gcentre)
        u.gcentre.value.copy(genes._gcentre);
    if (!u.time)
        u.time = { type: 'f' };
    u.time.value = (frametime & 0x3ffffff) / 1000.;
    if (currentGenes._recordTime !== undefined && Director.slotsUsed > 0) // was (frameSaver.renderDirectory)
        u.time.value = (+currentGenes._recordTime & 0x3ffffff) / 1000.;
    currentGenes.time = u.time.value; // time in seconds
    // check if there a new uniforms, if so make three do its shader/uniforms work
    if (Object.keys(u).length !== WA.lastlength) {
        log('new uniforms detected, refreshing materials: frame', framenum, WA.ulastlength, Object.keys(u).length);
        WA.lastlength = Object.keys(u).length;
        updateShadersThree();
    }
    u._lastSetFrame = framenum;
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
var selcol = col3(0.13, 0.13, 0.2);
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
    makeGenetransform(genes);
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
    if (genes._uScale) {
        if (inputs.using4d) {
            for (let i = 0; i < 16; i++)
                fr.elements[i] *= s;
        }
        else {
            fr.scale({ x: s, y: s, z: s });
        }
    }
    if (V.usecentre && !inputs.using4d) {
        fr.elements[3] = genes._rot4_ele[3] * s;
        fr.elements[7] = genes._rot4_ele[7] * s;
        fr.elements[11] = genes._rot4_ele[11] * s;
    }
}
// <editor-fold desc="rendering functions">
function prerender(genes, u) {
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
        uniforms.camInvProjMat.value.getInverse(camera.projectionMatrix);
    }
    if (uniforms.invrot4) {
        let d = uniforms.rot4.value.determinant();
        let sc = Math.pow(d, 1 / 3);
        currentGenes.viewRad = sc;
        uniforms.invrot4.value.getInverse(uniforms.rot4.value);
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
**/
function render_depth_shadows(genes) {
    if (genes.shadowstrength === 1)
        return; // need to make sure reset
    if (!inputs.SHADOWS)
        return; // no check box asking for shadows
    if (!Shadows)
        return;
    if (renderVR.eye2)
        return;
    if (inputs.SHADOWS)
        Shadows[0].RenderShadow(genes, camera, uniforms); // to track main light
    if (inputs.SHADOWS1)
        Shadows[1].RenderShadow(genes, camera, uniforms); // to track main light
    if (inputs.SHADOWS2)
        Shadows[2].RenderShadow(genes, camera, uniforms); // to track main light
    // Shadows.TrackCamera(genes, camera, uniforms);  // NEEDS to be done twice, to chase up
}
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
    resdelta = SHADOWRESDIFF;
    // try to do shadown in bulk if possible ... relies on using skeletons and all skeletons being at same resolution
    let bigscene, dradnum, dlennum;
    if (inputs.resdyndeltaui === 0 && inputs.USESKELBUFFER) {
        let rb = inputs.resbaseui - resdelta;
        rb = Math.ceil(rb);
        if (rb < 0)
            rb = 0;
        dradnum = radnums[rb]; // dynamic number round
        dlennum = dradnum * 5; // dynamic number along, including sphere ends
        if (resoverride.radnum)
            dradnum = Math.min(dradnum, resoverride.radnum);
        if (resoverride.lennum)
            dlennum = Math.min(dlennum, resoverride.lennum);
        let rbx = dlennum + "/" + dradnum;
        bigscene = bigsceneSet[rbx];
        if (bigscene && bigscene.scene.children.length === 0)
            bigscene = undefined;
    }
    else {
        bigscene = undefined;
    }
    if (bigscene) { // yes, shadown in bulk
        let num = currentHset.horncount;
        multiInstances(bigscene, num); // make sure enought instances
        uniforms.radius.value = 0; // not used, already saved in skeleton, clear to double-check
        uniforms.gbuffoffset.value = 0;
        uniforms.lennum.value = dlennum;
        uniforms.radnum.value = dradnum;
        let mat = getMaterial(genes);
        bigscene.scene.children[0].material = mat;
        rrender('bulkshadow', bigscene.scene, render_camera, drt);
    }
    else {
        renderPass(genes, uniforms, drt);
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
    renderer.clearTarget(Water.m_reflectionRenderTexture);
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
        renderPipe(genes, uniforms, Water.m_reflectionRenderTexture, 2); // from render_reflection
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
    let mat = getMaterial(appToUse);
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
var usemask = 2; // set to -2 for nothing, -1 very old (no mask), 0 old render (mask), 1 to use opq rendering, 2 multistep opq with improved flu bands
var normloop = 0; // set to 0 or undefined to skip normloop.  loops on normals to improve glossy highlights
var rendertargets = {}; // to hold render targets for opq style render
// let qscene;    // scene for opq style render
var colneg = new THREE.Color(-1, -1, -1); // negative colour used to indicate transparent
function clearrendertargets() {
    for (let i in rendertargets) {
        rendertargets[i].dispose();
    }
    rendertargets = {};
}
function getrendertarget(purpose, p) {
    let sizer = p.sizer;
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
            log('prepare mask size', widthix, heightix, s);
        rendertargets[key] = rrtq = WebGLRenderTarget(widthix, heightix, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            depthBuffer: p.depthBuffer,
            stencilBuffer: false
        }, purpose);
        if (p.depthBuffer) {
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
    uniforms.screen.value.x = 1 / widthi;
    uniforms.screen.value.y = 1 / heighti;
    renderer.setRenderTarget(rrtq);
    return rrtq;
}
// set shared depth buffer for render target
function renderTargetDepth(rt) {
    if (!renderer.extensions.get('WEBGL_depth_texture'))
        return;
    let keyd = 'depth' + rt.width + "x" + rt.height;
    let rrtd = rendertargets[keyd];
    if (!rrtd) {
        rendertargets[keyd] = rrtd = new THREE.DepthTexture(rt.width, rt.height);
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
}
// THREEA.DepthType = THREE.UnsignedIntType;  // not use, see above
var rtoposx = 1; // for perf tests
var gValueForTexscale = "texscale"; // used to make OPTEXTURE compute bump texture
/** perform an operation in pipeline pipeop({genes: genes, opmode: popmode, rendertarget: "?", sizer: sizer, clearcol: clearcol }); */
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
    let mat = getMaterial(genes);
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
    many = many || OPMODE === OPOPOS || OPMODE === OPTEST;
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
function renderPipe(genes, uniformsp, rendertarget, rdelta) {
    setHornColours(genes);
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
    if (!HornWrap.nohorn) // TODO >>>  (in wrong place, need to consider shadows)
        renderObjPipe(scene, renderPass, genes, uniformsp, rendertarget, rdelta, usemask);
    // VERY experimental pass for rendering extra objects
    // lots of limitations, such as colour, etc, etc
    let tranrule = genes._extratranrule;
    if (tranrule)
        extraRender({ tranrule, scene, renderPass, genes, uniformsp, rendertarget, rdelta, usemask });
    if (!HornWrapFUN.cubeEarly && CubeMap && CubeMap.renderState !== 'color')
        renderObjPipe(CubeMap.wallScene, CubeMap.RenderPass, genes, uniformsp, rendertarget, rdelta, usemask);
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
function renderObjPipe(pscene, prenderPass, genes, uniformsp, rendertarget, rdelta, usemaskp) {
    /** call pipeop with correct renderPass function */
    function ipipeop(p) {
        p.renderPass = prenderPass;
        pipeop(p);
    }
    resdelta = rdelta || 0;
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
        ipipeop({ genes: genes, opmode: WA.forceop || OPSHADOWS, rendertarget: rendertarget, sizer: sizer, clearcol: colneg, scene: pscene });
        uniforms.USELOGDEPTH.value = s;
        gl.depthFunc(gl.EQUAL);
        //pscene.children[0].material.depthFunc = THREE.EqualDepth;
        // <<< does not work because meterial is about to be switched
        // need to pass depth function throught the structure and apply to the correct material
        ipipeop({ genes: genes, opmode: OPREGULAR, rendertarget: rendertarget, scene: pscene });
        //pscene.children[0].material.depthFunc = THREE.LessEqualDepth;
        gl.depthFunc(gl.LEQUAL);
    }
    else if (usemaskp === -1 || usemaskp === -2) {
        ipipeop({ genes: genes, opmode: OPREGULAR, rendertarget: rendertarget, scene: pscene });
    }
    else if (usemaskp === 'pick') {
        ipipeop({ genes: genes, opmode: OPPICK, rendertarget: rendertarget, scene: pscene });
    }
    else if (usemaskp === 1) {
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        // perform second pass; work out horn details and shading
        // using the result of OPOPOS pass as texture
        ipipeop({ genes: genes, opmode: OPOPOS2COL, rendertarget: rendertarget, scene: qscene });
    }
    else if (usemaskp === 1.5) { // n.b. this gives better normals than usemask=1, but texture positioned wrong (27/2/2017)
        // perform separated Q3
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes: genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer: sizer, scene: qscene, clearcol: colneg });
        ipipeop({ genes: genes, opmode: OPTSHAPEPOS2COL, rendertarget: rendertarget, scene: qscene });
    }
    else if (usemaskp === 2) { // n.b. this gives much better fluorescent bands than usemask === 1 or 1.5
        // perform separated Q3
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes: genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer: sizer, scene: qscene, clearcol: colneg });
        if (normloop) // e.g. for 3x3 normal smooth
            ipipeop({ genes: genes, opmode: OPBUMPNORMAL, rendertarget: 'rtnormal', sizer: sizer, scene: qscene });
        ipipeop({ genes: genes, opmode: OPTEXTURE, rendertarget: 'rttexture', sizer: sizer, scene: qscene });
        ipipeop({ genes: genes, opmode: OPTSHAPEPOS2COL, rendertarget: rendertarget, scene: qscene });
    }
    else if (usemaskp === 3) {
        // perform separated Q3
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes: genes, opmode: OPSHAPEPOS, rendertarget: 'rtshapepos', sizer: sizer, scene: qscene, clearcol: colneg });
        ipipeop({ genes: genes, opmode: OPTEXTURE, rendertarget: 'rtbumptexture', sizer: sizer, scene: qscene, texscale: "bumpscale" });
        if (normloop) // e.g.for 3x3 normal smooth:
            ipipeop({ genes: genes, opmode: OPBUMPNORMAL, rendertarget: 'rtnormal', sizer: sizer, scene: qscene });
        ipipeop({ genes: genes, opmode: OPTEXTURE, rendertarget: 'rttexture', sizer: sizer, scene: qscene });
        ipipeop({ genes: genes, opmode: OPTSHAPEPOS2COL, rendertarget: rendertarget, scene: qscene });
    }
    else if (usemaskp === 111) { // debug, performance, (or ml) just OPOPOS direct to output
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: rendertarget, sizer: sizer, clearcol: colneg, scene: pscene });
    }
    else if (usemaskp === 112) { // debug, performance, (or ml) OPOPOS and OPSHAPEPOS direct to output
        // TODO does not work fully as many of the outputs are <0 and get trucated
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes: genes, opmode: OPSHAPEPOS, rendertarget: rendertarget, sizer: sizer, scene: qscene, clearcol: colneg });
    }
    else if (usemaskp === 113) { // debug, performance
        ipipeop({ genes: genes, opmode: OPTEST, rendertarget: rendertarget, sizer: sizer, clearcol: colneg, scene: pscene });
    }
    else if (usemaskp === 124) { // fft test
        ipipeop({ genes: genes, opmode: OPOPOS, rendertarget: 'rtopos', sizer: sizer, clearcol: colneg, scene: pscene });
        ipipeop({ genes: genes, opmode: OPOPOS2COL, rendertarget: rendertarget, scene: qscene, clearcol: colneg });
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
/** switch via Maestro to ensure correct application called on renderObj
* switch to renderObj<appToUse>,  eg renderObjHorn
* This will not render directly into the screen:
* it will render into a viewport specific renderTarget
* */
function renderObj(dispobj, rt) {
    if (!dispobj || !dispobj.visible)
        return;
    if (rt === "canvas") { // special case to allow direct render to canvas
        renderer.setRenderTarget();
        rt = undefined;
        renderer.setViewport(0, 0, width, height);
    }
    else {
        if (!rt)
            rt = dispobj.rt; // usual case, rt only specified for image snap
        const maxt = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (slots[dispobj.vn] && !isDragobj(dispobj) && rt.width < maxt && rt.height < maxt &&
            rt.width < slots[dispobj.vn].width / renderRatio - 2) { // check size, tiny margin for nonstandard viewport sizes
            if (dispobj.vn === 0 && renderVR.addSlot0) {
                log("correct render target 0 in vr recording too small");
                rt = dispobj.rt = WebGLRenderTarget(slots[dispobj.vn].width / renderRatio, slots[dispobj.vn].height / renderRatio, undefined, 'special vr record rt');
            }
            else {
                log("render target too small");
            }
            //debugger;
        }
        // deferred till skeletons and shadows done
        // if (CubeMap) CubeMap.renderfeedback(dispobj);
        renderer.setRenderTarget(rt);
        renderer.setViewport(0, 0, rt.width, rt.height);
    }
    // color below does not matter if transparent, eg highlighting by backdrop
    // let selected = vp.dispobj.selected || parentvps.indexOf(vn) !== -1;
    //renderer.setClearColor(vn === mainvp ? bigcol : selected ? selcol : noselcol, 0.5);
    // always render with clear background
    renderer.setClearColor(bigcol, 0);
    // debug for Firefoxx Nightly, no ANGLE
    /**
    let rc = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (rc !== gl.FRAMEBUFFER_COMPLETE) {
        log("wrong framebuffer status ", rc, findval(gl, rc));
        msgfix("wrong framebuffer status", '<b style="color:red">' + rc + findval(gl, rc) + '</b>');
        gl.bindTexture(gl.TEXTURE_2D, null);  // looks as if it has already been done, but ...???
    }
    **/
    renderer.clearTarget(rt);
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
/** render object into viewport */
var renderObjHorn = function (event) {
    let parms = event.eventParms;
    let dispobj = parms.dispobj;
    let genes = dispobj.genes;
    if (!dispobj.genes)
        return;
    // constrainGenes(genes);  // not used at the moment, and should be called higher up less often if reinstated
    let vn = dispobj.vn;
    setObjUniforms(genes, uniforms);
    if (slots[vn].dispobj !== dispobj) { // note, this is false for saveimage
        //    log("query dispobj", vn, slots[vn].dispobj.xid, dispobj.xid); return;
    }
    // prepare scaling
    let whichRange = genes === currentGenes || renderObjs === renderVR ? "main" : "now";
    if (whichRange === "now" || lastGenes[whichRange] !== genes || framenum < 3) {
        //if (whichRange === "main")
        //    log("dispobj", dispobj.xid, whichRange, dispobj.vn);
        if (renderObjHorn.centreOnDisplay) {
            centrescale(genes, whichRange, 1); // force immediate
        }
        lastGenes[whichRange] = genes;
    }
    uniforms.scaleDampTarget.value = condTexture(uniforms.scaleDampTarget[whichRange]);
    //log("renderObj " + vn);
    let rendertarget = parms.rendertarget;
    if (badshader)
        return;
    prerender(genes, uniforms);
    scene.overrideMaterial = null; // ? not needed     // NO, scene should not be used by Horn any more
    render_camera = camera;
    uniforms.vn.value = vn * 1.0;
    // do the setup stuff, only for the first eye in VR
    if (!renderVR.eye2) {
        renderskelbuff(genes);
        render_depth_shadows(genes);
        render_reflection(genes);
        cMap.renderFeedback(dispobj);
    }
    renderer.setRenderTarget();
    // render dof
    const DOF = W.DOF;
    if (DOF && DOF.useDOF) {
        // careful to reset the background color
        renderer.setClearColor(vn === 0 ? bigcol : dispobj.selected ? selcol : noselcol, 1);
        renderer.clearTarget(DOF.rtTextureColor, true, true, true);
        opmode = OPSHADOWS;
        renderPipe(genes, uniforms, DOF.rtTextureColor, 0); // called for DOF
        opmode = OPREGULAR;
        render_depth(genes, DOF.rtTextureDepth);
        DOF.Render(renderer, rendertarget);
    }
    else {
        renderPipe(genes, uniforms, rendertarget, 0); // called for renderObjHorn
    }
    geometry.tidy(); // it will now be safely established
    postrender(genes, uniforms);
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
    let sdotty = dotty;
    dotty = true;
    //renderPass(genes, uniforms); // debug
    //renderPass(genes, uniforms, skelbuffer);  // <<<<<<<<<<<<<<<<<<<<<!!!!!!!!!!!!!!!!!!!!!!!!! if !skelbuffer ????
    // generate skelbuffer if necessary
    if (!skelbuffer || uniforms.skelbufferRes.value.x !== skelbuffer.width || uniforms.skelbufferRes.value.y !== skelbuffer.height) {
        //if (skelbuffer) { skelbuffer.displose(); skelbuffer = undefined; }
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
    dotty = sdotty;
    opmode = OPREGULAR;
    if (!uniforms.skelbuffer)
        uniforms.skelbuffer = { type: "t", value: skelbuffer.texture, framenum };
    if (!uniforms.gbuffoffset)
        uniforms.gbuffoffset = { type: "f", value: 0., framenum };
    uniforms.skelbuffer.value = skelbuffer.texture;
}
// <editor-fold desc="saving functions">
var savesize = 4096;
var saveaspect = 1;
var maxblob = 36000000; // 6000 * 6000;
/** work out image size for saving */
function imsize(ww, hh, ar, forceUsear) {
    maxblob = nwfs ? 936000000 : 36000000; // 6000 * 6000;
    let dww = eval(trygeteleval('imageres', savesize));
    ww = Math.round(ww || dww);
    let dhh;
    if (ar) {
        dhh = typeof ar === 'string' ? eval(ar) : ar;
    }
    else if (forceUsear || trygetele('previewAr', 'checked', false)) {
        dhh = eval(trygeteleval('imageasp', saveaspect)); // height or aspect from gui
        if (dhh !== 1 * dhh) {
            serious("Invalid value in 'height or aspect' field, 16/9 used.");
            tryseteleval('imageasp', '16/9');
            dhh = 4 / 3;
        }
    }
    else {
        dhh = width / height; // actual aspect from screen
    }
    hh = hh || dhh;
    hh = hh > 10 ? hh : Math.round(ww / hh); // if hh <= 10 use it as aspect
    // specific size requested, check it
    if (arguments.length !== 0 && (ww * hh > maxblob || hh > maxTextureSize || ww > maxTextureSize)) {
        let ratio = Math.sqrt(maxblob / (ww * hh));
        ratio = Math.min(ratio, maxTextureSize / hh);
        ratio = Math.min(ratio, maxTextureSize / ww);
        ww = Math.floor(ww * ratio / 2) * 2; // even
        hh = Math.floor(hh * ratio);
        //tryseteleval('imageres', maxsize);
        let mm = "Size for saving limited to " + maxTextureSize + " each side by GL implementation\n";
        mm += "and to area " + maxblob + " by Chrome blob implementation.\n";
        mm += "Size set to " + ww + "x" + hh;
        msgfix('texture info', mm);
        console.log(mm);
    }
    return [ww, hh];
}
/** save a big image a given size setting */
function saveframe1(ww, hh, fid, comp, type) {
    let savefull = inputs.fullvp;
    setInput(W.fullvp, false);
    let viewports = vps;
    setViewports([0, 0]);
    saveframe2(ww, hh, fid, comp, type, review);
    function review() {
        setInput(W.fullvp, savefull);
        setViewports(viewports);
    }
}
/** save a frame with a given size setting */
function saveframe2(ww, hh, fid, comp, type, endfun) {
    let sww = width, shh = height;
    log("saveframe2 size", ww, hh);
    setSize(ww, hh);
    newframe();
    canvas.style.display = "none";
    // setTimeout(dosave, 100);
    Maestro.on("postframe", nextsave, undefined, true);
    function nextsave() {
        newframe();
        Maestro.on("postframe", dosave, undefined, true);
    }
    function dosave() {
        log("saveframe2 rsave size", width, height);
        saveframe(fid, comp, type);
        log("saveframe2 restore size", ww, hh, "to", sww, shh);
        setSize(sww, shh);
        canvas.style.display = "";
        if (endfun)
            endfun();
    }
}
var savebuff; // saved buffer to avoid unnecessary buffer realloc
/** convert bgra to rgba (for reading/saving canvas)
factored out because that sometimes optimizes better */
function _conv(im) {
    for (let i = 0; i < im.length; i += 4) {
        let t = im[i];
        im[i] = im[i + 2];
        im[i + 2] = t;
        if (i % 1000000 === 0)
            log('conv', i, im.length, Math.floor(i * 100 / im.length));
    }
}
/** save current frame, readPixels, process and save.
If fid is not defined we will do a readPixels,
and then process and save on the next call with a fid
*/
var saveframetga = function (fid, rt, kkk = 3) {
    const usert = kkk === 4 ? rt : saveframetga.rt;
    if (!saveframetga.convertDone && kkk !== 4)
        saveframetga.convert(rt); // first time in
    let widthi = (usert || canvas).width * 4 / kkk;
    let heighti = (usert || canvas).height;
    // read out of the converted canvas
    // this is in correct format and has had all processing applied
    // buffer has 18 bytes head + 4 bytes per pixel image data
    renderer.setRenderTarget(usert);
    if (!savebuff || savebuff.byteLength < kkk * widthi * heighti + 18) {
        savebuff = new ArrayBuffer(kkk * widthi * heighti + 18);
    }
    let imageview = new Uint8Array(savebuff, 18); // view of buffer offset to hold just image data
    let xbpv3 = new Uint8Array(savebuff);
    if (saveframetga.prepread) {
        saveframetga.prepread = false;
    }
    else {
        gl.flush(); // I thought readPixels would do this, but ...???
        gl.readPixels(0, 0, widthi * kkk / 4, heighti, gl.RGBA, gl.UNSIGNED_BYTE, imageview); // read offset so we can safely move data inplace
        gl.flush(); // I thought readPixels would do this, but ...???
        if (!rt)
            _conv(imageview);
    }
    saveframetga.convertDone = false;
    if (kkk !== 4)
        saveframetga.convert(rt); // ready for next frame
    if (!fid) { // this was a preread call
        saveframetga.prepread = true;
        return;
    }
    if (!fid.endsWith('.tga')) {
        log('saveframetga called with wrong type, no-op', fid);
        return;
    }
    // note, saveframe1 and saveframe2 are wrappers for saveframe
    // log("write sync", fid);  // around 1 sec 17MB
    // older machine
    //     with new Buffer around 300ms, 6.6MB (correct)
    //     saveframe around 750ms, 4.2MB
    //     saveimage with prealloc around 200ms
    //     saveframetga around 250ms with prealloc
    //     saveframetga with both prealloc, around 50ms
    // stephen laptop
    //      saveframe1 with reorder (and to 3 byte) around 123ms; reduced to 79ms with careful use of buffer types
    //      saveframetga with both prealloc, no reorder around 24ms
    //      it would be good to find an acceaptable rgba uncompressed image format
    //      saveframe 290ms
    // reorder pixels, works best where both sides are Uint8Array, various similar loops trivially more expensive
    //for (let i=0, j=18; i<width*height*4; i+=4) { xbpv3[j++] = imageview[i+2]; xbpv3[j++] = imageview[i+1]; xbpv3[j++] = imageview[i]; }
    // header 18
    //  0   0 imageid length
    //  1   0 color map type
    //  2   2 image tyupe (uncomp0 color)
    //  3   0,0,0,0,0 color map
    //  8   0,0 left
    // 10   0,0 top
    // 12   w,w width  90 06
    // 14   h,h height F2 03
    // 16   32 pixel depth  (? x18=24 for rgb)
    // 17   ? image descriptor 00 for rgb, ? 8 for rgba (8 bits alpha)
    // imageid 0
    // colour map spec 0
    let bbb = xbpv3;
    bbb[2] = 2;
    bbb[12] = widthi & 255;
    bbb[13] = widthi >> 8;
    bbb[14] = heighti & 255;
    bbb[15] = heighti >> 8;
    bbb[16] = kkk * 8; // bits per pixel
    if (kkk === 4)
        bbb[17] = 8;
    let sync = true;
    if (!nwfs) {
        log("make blob");
        // todo ppm requires raster order reversal
        let bb = new Blob([savebuff]);
        log("saveAs");
        saveAs(bb, fid);
    }
    else if (sync) {
        let xbpv3b = new Buffer(savebuff); // fast, control length in write
        let fd = nwfs.openSync(fid, 'w');
        //nwfs.writeSync(fd, bbb, 0, bbb.length);
        nwfs.writeSync(fd, xbpv3b, 0, 18 + widthi * heighti * kkk);
        nwfs.closeSync(fd);
        //nwfs.writeFileSync(fid, xbpv3);
        //log("write sync", fid, 18 + width*height*kkk);
    }
    else {
        let xbpv3b = new Buffer(savebuff); // fast, control length in write
        // async in this form gloes slower (partly larger file), and might need synchronization, extra buffers to ensure right answer
        nwfs.writeFile(fid, xbpv3b, nop);
        log("write async", fid);
    }
};
saveframetga.convert = function (rt) {
    if (!rt) {
        saveframetga.intex = saveframetga.intex || new THREE.Texture(canvas, undefined, // define just once
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter);
        rt = saveframetga.intex;
        let widthi = rt.image.width;
        let heighti = rt.image.height;
        saveframetga.intex.needsUpdate = true;
    }
    else {
        let im = rt.image || rt;
        let widthi = im.width;
        let heighti = im.height;
        if (!widthi)
            debugger;
    }
    rt.needsUpdate = true;
    if (!saveframetga.rt || saveframetga.rt.width !== width * 3 / 4 || saveframetga.rt.height !== height) {
        saveframetga.rt = WebGLRenderTarget(width * 3 / 4, height, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            depthBuffer: false,
            stencilBuffer: false
        }, 'saveframetga.convert');
        saveframetga.rt.texture.generateMipmaps = false;
    }
    if (!saveframetga.material) {
        saveframetga.uniforms = {
            intex: { type: 't' },
            res: { type: 'v2', value: new THREE.Vector2(0, 0) }
        };
        saveframetga.material = new THREE.ShaderMaterial({
            uniforms: saveframetga.uniforms,
            vertexShader: getfiledata("shaders/copy43.vs?" + Date.now()),
            fragmentShader: getfiledata("shaders/copy43.fs?" + Date.now()),
            depthTest: false, depthWrite: false,
            transparent: false,
            side: THREE.FrontSide
        });
        saveframetga.material.name = 'saveframetga';
        saveframetga.scene = newscene('saveframetga');
        let xgeometry = new THREE.PlaneGeometry(2, 2);
        let xmesh = new THREE.Mesh(xgeometry, saveframetga.material);
        xmesh.frustumCulled = false;
        saveframetga.scene.addX(xmesh);
    }
    //saveframetga.rt = undefined;
    saveframetga.uniforms.res.value.x = width;
    saveframetga.uniforms.res.value.y = height;
    saveframetga.uniforms.intex.value = rt.texture || rt; // make sure relevant rt is used as input
    // saveframetga.uniforms.intex.value = slots[0].dispobj.rt;
    //let renderer = renderer2;
    renderer.setClearColor(ColorKeywords.black, 0);
    renderer.setRenderTarget(saveframetga.rt);
    renderer.setViewport(0, 0, width, height);
    renderer.clear();
    rrender('tgaconvert', saveframetga.scene, camera, saveframetga.rt); // reason, scene, camera not used, target, flag
    saveframetga.convertDone = true;
};
/** save current frame as image, at current size
options o also allow specific region,
or a slot number, or a dispobj
*/
function saveframe(fid, comp, type, options, callback) {
    let t = new Date().toISOString().replaceall(":", ".");
    let tt = fid ? fid.post('.') : undefined;
    type = type || tt || "jpeg";
    const ds = getdesksave(); //XXX hit "Cannot find module 'os'" - tiff2.js require() strikes again.
    if (!fid)
        fid = (ds ? (getdesksave() + '/') : '') + currentGenes.name + '_' + t;
    // if (!fid) fid = fid = getdesksave() + '/' + currentGenes.name + '_' + t;
    if (type === 'tga' && !options)
        return saveframetga(fid);
    let ctype = "image/" + (type === "jpg" ? "jpeg" : type);
    comp = comp || 0.9;
    if (tt === undefined)
        fid += "." + (type === "jpeg" ? "jpg" : type);
    let canvasn = canvas;
    if (options) {
        let o = options;
        if (typeof o === 'number' || typeof o === 'string')
            o = slots[o].dispobj;
        canvasn = document.createElement('canvas');
        canvasn.width = o.width;
        canvasn.height = o.height;
        canvasn.getContext('2d').drawImage(canvas, o.left, canvas.height - o.top, o.width, o.height, 0, 0, o.width, o.height);
    }
    let dataurl = canvasn.toDataURL(ctype, comp);
    if (nwfs) {
        let sdataurl = dataurl.substr(dataurl.indexOf(",") + 1);
        if (callback) {
            nwfs.writeFile(fid, sdataurl, 'base64', callback);
        }
        else {
            nwfs.writeFileSync(fid, sdataurl, 'base64');
        }
    }
    else {
        // ??? this failed for Guido, whey ???
        writeUrlImageRemote(fid, dataurl, ctype);
    }
    log("saveframe file written", fid, canvas.width, canvas.height, 'uScale', G._uScale);
}
/** save single image: size is taken from parameter ss, or if none from imageres, or if none from savesize */
function saveimage1(ww, hh, bmp) {
    saveimage(ww, hh, bmp, true);
}
/** save single image high quality: size is taken from parameter ss, or if none from imageres, or if none from savesize */
function saveimage1high(ww, hh, bmp) {
    saveimagehigh(ww, hh, bmp, true);
}
/** save image: size is taken from parameter ss, or if none from imageres, or if none from savesize */
function saveimagehigh(ww, hh, bmp, oneonly) {
    let sres = inputs.resbaseui;
    let srr = inputs.renderRatioUi;
    let srres = inputs.imageres;
    let sww = width, shh = height;
    setSize(100, 100); // this may help having mutiple lots of big buffers around at once
    clearrendertargets();
    setInput(W.resbaseui, 12);
    //    setInput(W.renderRatioUi, 1);  // << tradeoff here, value such as 0.5 means imageres must be reduced
    setInput(W.imageres, 6 * 1024); // << would like 8*
    saveimage(ww, hh, bmp, oneonly);
    setInput(W.resbaseui, sres);
    setInput(W.renderRatioUi, srr);
    setInput(W.imageres, srres);
    setSize(sww, shh);
}
var xpv4, xpv3; // save realloc if done in advance
/** save image: size is taken from parameter ss, or if none from imageres, or if none from savesize */
function saveimage(ww, hh, bmp, oneonly, ffid) {
    let fullww = (slots[-1]) ? slots[-1].x : width; // don't include projvp
    let asp = inputs.previewAr ? inputs.imageasp : fullww / height;
    let wwhh = imsize(ww, hh, asp);
    ww = wwhh[0];
    hh = wwhh[1];
    log("save image starting ...", ww, hh, 'bmp', bmp, 'oneolny', oneonly);
    let iname = trygeteleval('imagename', "organic");
    inputs.resbaseui += 1;
    let vfast = false && ww === canvas.width && hh === canvas.height; // todo, decide if/when this can be used
    let rt, sww, shh, svp0, svp1;
    if (!vfast) {
        sww = width, shh = height, svp0 = vps[0], svp1 = vps[1];
    }
    if (vfast) {
        renderer.setRenderTarget();
        /******* renderTarget method disabled 4 Sept 2016 ... for unknown reason the copy phase was just giving plain coloured images  *** /
        } else if (/**inputs.renderRatioUi*1 === 1 &&** / (slots.length === 1 || oneonly)) {  // save using renderTarget. ??? higher quality, but does not allow for viewports (all laid on top of each other)

            // this initial incantation seems to ensure that the gamma copy stage works correctly
            // otherwise it works just sometimes, eg if two saveimage() are done with no 'standard' rendering in between
            // TODO: find out why
            setSize(width, height); renderFrame();  //todo
            //setSize(ww,hh); renderFrame();  //todo

            let bdispobj = slots[(inputs.projvp) ? -1 : mainvp].dispobj; // dispobj to establish aspect ration
            let wwhh = imsize(ww, hh, bdispobj.width/bdispobj.height);

            // We make this look like a standard Dispobj with vpx composition rendering
            // Mayne overkill, and would be easier to make our own scene
            // but for now we are sure to get details such as Dispobj.tune consistent this way.
            let dr = new Dispobj();                       // dispobj for actual rendering
            dr.genes = bdispobj.genes;
            dr.vn = bdispobj.vn;  // not really true
            dr.needssUpdate = true;
            dr.needsRender = 1;

            ww = wwhh[0]; hh=wwhh[1];
            log("... save image starting ...", ww, hh, 'bmp', bmp, 'oneolny', oneonly);
            let rr = inputs.renderRatioUi;
            dr.width = ww; dr.height = hh;
            dr.cx = ww/2; dr.cy = hh/2;
            let scene = dr.scene;
            scene.position.x = dr.cx; scene.position.y = dr.cy;
            scene.position.z = 0;
            scene.scale.x = dr.width; scene.scale.y = dr.height;


            clearrendertargets();   // maxmize GPU space free
            for (let i=0; i<25; i++) renderObj(dr);  // loop for feedback
            if (checkglerror("gl after saveimage renderObj"))
                debugger;

            // extra step here for gamma, soft clipping, etc
            while (vpxQuadScene.children.length > 0)
                vpxQuadScene.remove(vpxQuadScene.children[0]);
            let vpxSceneRenderCamera = new THREE.OrthographicCamera(0, ww, hh, 0, -100, 100);
            //vpxSceneRenderCamera.matrixAutoUpdate = false;

            dr.visible = true;  // add to vpxquadscene

            let inrt = dr.rt;
            let rt = getrendertarget( 'rtopos', {sizer: {width:ww, height: hh}} ); // reuse one to save memory
            renderer.setRenderTarget(rt);
            // renderer.setClearColor(selcol);   // not needed? for debug
            renderer.clear();
            // dr.uniforms.intex.value = inrt;  // already true

            rrender("saveimage final copy", vpxQuadScene, vpxSceneRenderCamera, rt);
            checkglerror("gl after savimage final copy");
            renderer.setRenderTarget(rt);
        /********************* end disabled section **************/
    }
    else { // save by resizing the main window
        //let fullww = (slots[-1]) ? slots[-1].x : width;  // don't include projvp
        //let wwhh = imsize(ww, hh, fullww/height);
        //ww = wwhh[0]; hh=wwhh[1];
        if (oneonly)
            vps = [0, 0];
        let sfull = inputs.fullvp; // save special vp rules
        let sproj = inputs.projvp;
        inputs.fullvp = false; // ignore for image save
        inputs.projvp = false;
        clearrendertargets(); // have as little extra memory in use as possible
        let ok = setSize(ww, hh, true); // make sure all the slots dispobj etc set to correct size, maybe too big for canvas so use force
        if (!ok) {
            rt = WebGLRenderTarget(ww, hh, {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                wrapS: THREE.ClampToEdgeWrapping,
                wrapT: THREE.ClampToEdgeWrapping,
                //depthBuffer: false,
                stencilBuffer: false
            }, 'saveimage big buffer');
            rt.texture.generateMipmaps = false;
        }
        checkglerror("gl after setsize");
        forcerefresh = true;
        log("start render");
        const loop = cMap.renderState === 'color' ? 1 : 25;
        for (let i = 0; i < loop; i++) { // make sure up to date, even including feedback
            refall();
            renderFrame(rt);
            framenum++; // update for
        }
        checkglerror("gl after renderFrame");
        inputs.fullvp = sfull; // restore
        inputs.projvp = sproj;
        renderer.setRenderTarget(rt);
    }
    inputs.resbaseui -= 1;
    /*** prepare for output ***/
    let t = new Date().toISOString().replaceall(":", ".");
    let nmsg = t + "_" +
        "-w" + ww +
        "-h" + hh +
        "-" + inputs.resbaseui +
        "-" + inputs.resdyndeltaui +
        "-" + inputs.renderRatioUi +
        "";
    let fid = iname + nmsg + ".tga";
    if (ffid)
        fid = ffid;
    if (nwfs)
        fid = process.env.USERPROFILE + "\\Desktop\\" + fid;
    /***** save using tga code ******/
    if (rt)
        saveframetga.convert(rt); // dont convert canvas
    saveframetga(fid, rt, rt ? 3 : 4);
    /*********************************************  disabled, slower than tga version and wrong for large images ************ /
    // save by readpixels, and copy the image from 4 bytes per pix to 3
    let hrat = hh;  // rows at a time
    for (let i = 0; ; i++) {
        try {
            let pv4 = xpv4 || new Uint8Array(4*ww*hrat);
            if (!bmp) let pv3 = xpv3 || nwfs ? new Buffer(3*ww*hh) : new Uint8Array(3*ww*hh);
            break;
        } catch (e) {
            hrat = Math.ceil(hrat / 2);
            if (hrat < 100) break;
        }
    }
    if (!pv4) {
        alert("failed to allocate space to save image");
        if (rt) rt.dispose();
        rt = undefined; // help garbage collection ~ I hope this frees GL resources
        pv4 = undefined;  // help garbage collection
    } else {
        let p3=0, i;
        for (let row=0; row<hh; row+=hrat) {
            if (row+hrat > hh) hrat = hh-row;
            let p4 = 0;
            //log("start readPixesl", row);
            gl.readPixels(0,row, ww, hrat, gl.RGBA, gl.UNSIGNED_BYTE, pv4);
            if (bmp) {
                //surely it's wrong to call this for every row.
                //assuming this code hasn't been checked recently
                let pre = _bmp(ww,hh, "","", 32,0);
                let bb = new Blob([pre, pv4]);
                saveAs(bb, iname + ".bmp");
                return;
            }
            checkglerror("gl after readPixels");
            //log("start copy");
            for (let srow=row; srow<row+hrat; srow++) {  // row at a time to allow to upsidedown
                p3 = (hh-srow-1)*ww*3;
                for (i=0; i<ww; i++) { pv3[p3++]=pv4[p4++]; pv3[p3++]=pv4[p4++]; pv3[p3++]=pv4[p4++]; p4++; }
            }
        }


        if (rt) rt.dispose();
        rt = undefined; // help garbage collection ~ I hope this frees GL resources
        pv4 = undefined;  // help garbage collection
        let mmsg = "# Saved by organic" +
            ", res=" + inputs.resbaseui +
            ", delta=" + inputs.resdyndeltaui +
            ", renderRatio=" + inputs.renderRatioUi +
            "";

        let str = "P6\n" + mmsg + "\n" + ww + " " + hh + "\n255\n";
        let fid = iname + nmsg + ".ppm";
        if (nwfs) {
            let fid = process.env.USERPROFILE + "\\Desktop\\" + fid;

            //let fid = iname + ".ppm";
            let tiffid = fid.replace(".ppm", ".tif");
            nwfs.writeFileSync(fid, str);
            let fd = nwfs.openSync(fid, 'a');
            nwfs.writeSync(fd, pv3, 0, ww*hh*3);
            nwfs.closeSync(fd);
       } else {
            log("make blob");
            // todo ppm requires raster order reversal
            let bb = new Blob([str, pv3]);

            log("saveAs");
            saveAs(bb, fid);
        }
        //log("all done, restore");
    }
    /************************/
    /**** convert saved image if possible */
    if (nwfs) {
        let tiffid = fid.replace(".ppm", ".tif").replace(".tga", ".tif");
        // compress saved file to .tif with tifc=1, lzw
        let iview = "C:\\Program Files (x86)\\IrfanView\\i_view32.exe";
        if (!nwfs.existsSync(iview))
            iview = "C:\\Program Files\\IrfanView\\i_view64.exe";
        if (nwfs.existsSync(iview)) {
            let spawn = require('child_process').spawn;
            let args = [fid, "/convert=" + tiffid, "/tifc=1"];
            let proc = spawn(iview, args);
            proc.on("close", function (evt) {
                log("iview close", evt, proc.exitCode, "converted to", tiffid);
                if (evt === 0)
                    nwfs.unlink(fid, nop);
            });
        }
        else {
            //we should use ImageMagick to be more cross-platform compatible.
            log("No irfanview found, cannot replace .ppm file with .tif");
        }
    }
    // restore
    clearrendertargets(); // clean up any huge buffers
    if (sww) { // restore the size if necessary ~~ view ports
        vps[0] = svp0;
        vps[1] = svp1;
        setSize(sww, shh);
        refall(); // should redo things and lose our big rendertarget
    }
}
// </editor-fold>
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
        if (evt && evt.ctrlKey && evt.keyCode === 13) {
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
    changeMat.oldgenes = currentGenes;
    changeMat.oldgenedefs = genedefs;
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
        setHornSet();
        forcerefresh = true;
    }
    badshader = false; // we hope
    //???    testmaterial.test(W.tranrulebox.textContent); // to check, this causes an invalid material.opos entry. whey ???
    if (badshader)
        return false;
    currentMaterialChanged();
    /*^^^
    // WA.hornTrancodeForTranrule(W.tranrulebox.textContent);
    var nhs = new HornWrap.HornSet();
    var r = nhs.setuphorn(W.tranrulebox.textContent);
    */
    // below needed if genedefs/genes cleared at beginning, effectively nop if they were not cleared
    for (let gn in permgenes) {
        if (!genedefs[gn])
            genedefs[gn] = changeMat.oldgenedefs[gn];
        if (!currentGenes[gn])
            currentGenes[gn] = changeMat.oldgenes[gn];
    }
    // scale();  // leave this till render time
    filterGuiGenes();
    reshowGenes();
    updateHTMLRules();
    refall();
    W.tranrulebox.autosize();
    target = {};
    return true;
};
/** base shader change, on ctrl-enter */
function cchangeBaseShader(evt) {
    if (evt.ctrlKey && evt.keyCode === 13)
        baseShaderChanged();
}
var dispobjMipmaps = false;
var despeckle = 2; // clamp value to reduce sparkle
var copymaterial;
/** Dispobj class for displayable objects */
let Dispobj = /** @class */ (() => {
    class Dispobj {
        constructor() {
            this.toString = function () { return "Dispobj { vn=" + this.vn + "}"; };
            /** distance from me to another */
            this.dist = function (xxx2) {
                let d2 = xxxdispobj(xxx2);
                return Math.sqrt(sq(this.cx - d2.cx) + sq(this.cy - d2.cy));
            };
            this.placeatslot = function (vn) {
                this.cx = slots[vn].cx;
                this.cy = slots[vn].cy;
            };
            this.Init = function () {
                //log("init dispobj, rr=" + renderRatio);
                this.setUniforms();
                //this.renderRatio = renderRatio;
                //let pre = "#define R 0.5\n#define S " + renderRatio + "\n";
                //if (renderRatio >= 1)
                //    pre = "#define DESPECKLE\n#define R 0.\n#define S 1.\n";
                let pre = ""; // may use #define again in future
                let materiali = new THREE.ShaderMaterial({
                    uniforms: this.uniforms,
                    vertexShader: getfiledata("shaders/copy.vs"),
                    // note, conditional below as we sometimes need to use copyX.fs for debugging
                    fragmentShader: pre + "\n" + getfiledata(simplemode ? "shaders/copyX.fs" : "shaders/copy.fs"),
                    side: THREE.FrontSide
                });
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
                this.needsRender = n || (inputs.backgroundSelect !== 'color' ? 10 : this._rts ? 2 : 1);
            };
            this.dispose = function () {
                this.scene.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
                if (this._rts)
                    this._rts.forEach(r => r.dispose());
                if (this._renderTarget)
                    this._renderTarget.dispose();
            };
            this.tune = function (rt) {
                // make sure aspect ratio comes out the same on render target and viewport
                // this can be wrong eg where mainvp shares render target with projvp, but they have different aspect ratios
                // (or on any other vp where the aspect might get wrong in future)
                this.uniforms.textureToUse.value.y = this.uniforms.textureToUse.value.x = 1;
                let ardiff = (this.width / this.height) / (rt.width / rt.height);
                if (ardiff > 1)
                    this.uniforms.textureToUse.value.y = 1 / ardiff;
                if (ardiff < 1)
                    this.uniforms.textureToUse.value.x = ardiff;
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
                let ulx = FIRST(Dispobj.olx, oldlayerX);
                let uly = FIRST(Dispobj.oly, oldlayerY);
                let yy = (height - uly - this.bottom) / this.height;
                this.uniforms.zoompos.value.set((ulx - this.left) / this.width, yy);
                //msgfix('zoom', (oldlayerX-this.left)/this.width, yy, this.bottom, this.top, oldlayerY, height-oldlayerY);
                //this.uniforms.R.value = 1; // 0.51 to allow rounding
                //this.uniforms.S.value =  this.uniforms.R.value/1;
                this.uniforms.outpower.value = 1 / +currentGenes.gamma;
                this.uniforms.bwthresh.value = this.genes ? this.genes.bwthresh : 0.25;
                this.uniforms.bwuse.value = inputs.bwset ? 1 : 0;
                this.uniforms.distortpixk.value = currentGenes.distortpixk;
                this.uniforms.softt.value = currentGenes.softt;
                this.uniforms.screenR.value = currentGenes.screenR;
                this.uniforms.screenG.value = currentGenes.screenG;
                this.uniforms.screenB.value = currentGenes.screenB;
                // these should not really be genes, only genes for sliders, copy to other objects so shared
                if (currentGenes.gamma) {
                    for (let o in slots) {
                        if (!slots[o])
                            continue;
                        let g = slots[o].dispobj.genes;
                        if (!g)
                            continue;
                        g.gamma = currentGenes.gamma;
                        g.screenR = currentGenes.screenR;
                        g.screenG = currentGenes.screenG;
                        g.screenB = currentGenes.screenB;
                        g.projGamma = currentGenes.projGamma;
                        g.projR = currentGenes.projR;
                        g.projG = currentGenes.projG;
                        g.projB = currentGenes.projB;
                        g.softt = currentGenes.softt;
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
                    u.outpower.value = 1 / +currentGenes.projGamma;
                    u.bwthresh.value = this.genes.bwthresh;
                    u.bwuse.value = inputs.bwset ? 1 : 0;
                    u.screenR.value = currentGenes.projR;
                    u.screenG.value = currentGenes.projG;
                    u.screenB.value = currentGenes.projB;
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
                    m.getInverse(m);
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
            return this;
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
                    type: THREE.FloatType,
                    stencilBuffer: false
                };
                if (isDragobj(this))
                    log("unexpected dragObj.dispobj no rt");
                if (this.vn === -1) {
                    // rt = slots[mainvp].dispobj.rt;
                    log("should not try to render -1");
                    debugger;
                    return;
                }
                else if (this.vn === mainvp && slots[-1]) {
                    let vpp = slots[-1];
                    if (slots[mainvp].width > vpp.width)
                        vpp = slots[mainvp]; // proj slot SMALLER than mainvp slot
                    // ??? do we want different renderRatio for main projection screen ???
                    rt = WebGLRenderTarget(Math.round(vpp.width / renderRatio), Math.round(vpp.height / renderRatio), opts, 'dispobj mainvn' + this.vn);
                }
                else {
                    rt = WebGLRenderTarget(Math.round(this.width / renderRatio), Math.round(this.height / renderRatio), opts, 'dispobj origvn' + this.vn);
                    // log('new rt', this.vn, rt.width, rt.height, 'frame', framenum);
                }
                renderTargetDepth(rt);
                if (this.vn === mainvp && bigrt === "notsetyet") {
                    bigrt = rt;
                    if (slots[-1])
                        slots[-1].dispobj.rt = rt;
                }
                rt.texture.generateMipmaps = dispobjMipmaps;
                let s = rt.width * rt.height * 12 / 1024 / 1024 / 1024;
                if (s > 0.25)
                    log("rendertarget size ", rt.width, rt.height, s, "gb");
                this._renderTarget = rt;
                this.scene.main.material.map = rt.texture;
                rt.dispobj = this; // help debug
            }
            this.tune(rt);
            if (bigrt !== "notsetyet" && !renderVR.addSlot0 && bigrt.width * renderRatio < slots[mainvp].width - 1 && slots.length > 1)
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
    Dispobj.corners = [{ x: -0.5, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }];
    Dispobj.zoom = 0;
    return Dispobj;
})();
; // end class dispobj
var DispobjC = Dispobj; // use by non typescript files to reference Dispobj without lint errors
//TODO: consider putting these in a config file (or maybe localStorageGet is better)
var screens = [{ width: 1920, height: 1080 }, { width: 1024, height: 768 }];
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
var lastvps = [0, 0];
/** set slots from spec nnn, www and hhh are optional overall width and height */
function setViewports(nnn, www = undefined, hhh = undefined) {
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
    if (!(CSynth && CSynth.init) && W.vp0 && W.vp0.value !== 'false' && !trysetele("vp" + (nnn[0] * nnn[1]), "checked", true)) {
        // no vp0 etc if in CSynth
        // the vp is not a preset so untick all
        // above check is a little wrong as vp8 sets [2,4], but [1,8] will also check vp8
        // Don't change now as that will upset lots of existing .oao files.
        Array.from(W.vp0.parentElement.getElementsByTagName('input')).forEach(bi => setInput(bi, false));
    }
    // may be called before inputs. cache ready
    // if only mainvp then ignore screens[1] request
    let fullvp = inputs.fullvp;
    let usescreenB = inputs.projvp && (nnn[0] * nnn[1] !== 0) && screens[1];
    //log("view size in", www,hhh, usescreenB, fullvp);
    let layout = inputs.layoutbox * 1;
    let nobigvp = layout !== 0;
    //if (nwwin) log("setViewports input    nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth ,document.body.clientHeight);
    let w, h;
    if (fullvp) { // if we can resize the entire thing, do so
        if (usescreenB) {
            w = screens[0].width + screens[1].width;
            h = Math.max(screens[0].height, screens[1].height);
        }
        else {
            w = screens[0].width;
            h = screens[0].height;
        }
        if (width !== w) {
            if (W.nwwin) {
                log("setViewports resize to", w, h, "was nwwin", nwwin.width, nwwin.height, "window", width, height, "doc", document.body.clientWidth, document.body.clientHeight);
                nwwin.leaveFullscreen(); // otherwise resize won't work
                nwwin.resizeTo(w, h);
                nwwin.moveTo(0, 0);
            }
            canvas.width = width = w;
            canvas.height = height = h;
            canvas.style.height = height + "px";
            canvas.style.width = width + "px";
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
    if (usescreenB && fullvp) {
        www = screens[0].width;
        hhh = screens[0].height;
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
        W.UI_overlay.style.top = (screens[0].height - 70) + "px";
    }
    else if (usescreenB && !fullvp) { // sort of 'emulation' of dual screen
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
    trysetele("vp" + (nx * ny), "checked", true); // so gui tells us what we have; wn't work if no such gui radio button
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
            mainfac = 3;
            if (vps[0] < 4 || vps[1] < 4)
                mainfac = 1; // no room for a big one ...
            mainx = floor((nx - 1) / 2); // slightly random, but get top right for 3x3
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
        default: // separate big
            vw = nx === 0 ? www : www / (nx + ny); // set so aspect of main vp same as aspect of small ones
            slots[0] = { x: floor(vw * nx + b), y: 0 + b, width: floor(www - vw * nx - 2 * b), height: floor(hhh - 2 * b), selected: false, col: 50 };
            mainx = -999;
            mainy = -999;
            parentvps = [];
            break;
    }
    if (vps[0] > 2 || vps[1] > 1)
        dustbinvp = nx * (ny - 1) + 1; // dustbinvp except for few viewports
    mainvp = mainx === -999 ? 0 : mainy * nx + mainx + 1;
    let vni = 0;
    let vp;
    for (let vny = ny - 1; vny >= 0; vny--) {
        for (let vnx = 0; vnx < nx; vnx++) {
            vni++;
            if (excludevp.indexOf(vni) !== -1)
                continue;
            // use of floor makes borders all consistent, rounding errors go into viewport sizes
            vp = slots[vni] = {
                x: floor(vw * vnx + b), y: floor(vh * vny + b + touchoffy),
                width: floor(vw * (vnx + 1)) - floor(vw * vnx) - 2 * b,
                height: floor(vh * (vny + 1)) - floor(vh * vny) - 2 * b,
                row: ny - vny - 1, col: vnx
            };
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
    for (let vn = -1; vn < slots.length; vn++) {
        vp = slots[vn];
        if (vp) {
            vp.cx = vp.x + vp.width / 2;
            vp.cy = vp.y + vp.height / 2;
        }
    }
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
        let genes = (vn === mainvp) ? currentGenes : (vn === -1) ? undefined : pendingObjects.pop();
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
    const ss = W.UI_overlay.style.display;
    W.UI_overlay.style.display = 'block'; // so details computed (more) correctly
    W.UI_overlay.style.left = '0'; // so it calculates clientWidth right if poss
    W.UI_overlay.style.left = (canvas.offsetLeft + www / 2 - W.UI_overlay.clientWidth / 2 + screens[0].offset) + "px";
    W.UI_overlay.style.display = ss;
    // ### todo recover ??? autofillfun(numdone);
    onframe(refall);
    lastDispobj = lastTouchedDispobj = NODO;
    dragObj = undefined;
    debugCurrentObjectsSize = olength(currentObjects);
}
/** rotate object each frame */
function camrot() {
    // always rot if we are rotating, mouse or no mouse
    //if (mousewhich !== 0) return;
    if (!currentGenes._rot4_ele)
        return; // not set up yet
    if (!inputs.doAutorot && !inputs.doFixrot)
        return;
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
    const dev = renderer.vr.getDevice();
    if (dev && dev.isPresenting)
        dev.exitPresent(); // just in case the cleanup isn't done by the system browser
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
var VEC = function (a, b, c, d) {
    return (Array.isArray(a)) ?
        VEC(a[0], a[1], a[2], a[3]) :
        new THREE.Vector4(a || 0, b || 0, c || 0, d || 1);
};
var VEC3 = function (a, b, c) {
    return (Array.isArray(a)) ? VEC3(a[0], a[1], a[2]) :
        typeof a === 'object' ? VEC3(a.x, a.y, a.z) :
            new THREE.Vector3(a || 0, b || 0, c || 0);
};
var VEC2 = function (a, b) {
    return (Array.isArray(a)) ? VEC2(a[0], a[1]) :
        typeof a === 'object' ? VEC2(a.x, a.y) :
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
THREEA.Color.prototype.setHSV = function (h, s, v, ret) {
    hsv2rgb(h, s, v, this);
    return this;
};
/** from http://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
* changed for input range 0..1 and output range 0..1 */
function rgb2hsv(r, g, b) {
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
    return { h: h, s: s, v: v };
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
        if (nwfs && nwfs.existsSync(stemFilePath)) {
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
    bigsceneSet = {};
}
/** swap positions/objects of two vps */
function swapvp(do1, do2) {
    // console.log("swap " + vn1 + " " + vn2);
    if (typeof do1 === "number")
        do1 = xxxdispobj(do1);
    if (typeof do2 === "number")
        do2 = xxxdispobj(do2);
    let vn1 = do1.vn;
    let vn2 = do2.vn;
    let vp1 = slots[vn1];
    let vp2 = slots[vn2];
    vp1.dispobj = do2;
    vp2.dispobj = do1;
    do1.vn = vn2;
    do2.vn = vn1;
    // make sure currentGenes is kept in correct sync
    if (vn1 === mainvp)
        currentGenes = do2.genes;
    if (vn2 === mainvp)
        currentGenes = do1.genes;
    // make sure the big render target is made available to the object in the mainvp slot
    // and that the effected renderTargets are redrawn
    if (vn1 === mainvp || vn2 === mainvp) {
        let rt = do1.rt;
        do1.rt = do2.rt;
        do2.rt = rt;
        updatevp(vn1);
        updatevp(vn2);
        fixscale(); // so we use expected size for currectObj <<< are there other places we should call this
        do2.width = vp1.width;
        do2.height = vp1.height;
        do1.width = vp2.width;
        do1.height = vp2.height;
    }
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
    let dead = slots[dustbinvp].dispobj;
    if (dead) {
        dispobj.selected = false;
        swapvp(dead, dispobj);
    }
    else {
        dead = dispobj;
    }
    mutate([dead], undefined, undefined, true);
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
    let reuse = slots[dustbinvp].dispobj;
    let current = slots[mainvp].dispobj;
    swapvp(reuse, lru());
    reuse.genes = clone(current.genes);
    reuse.cx = current.cx;
    reuse.cy = current.cy;
    reuse.render();
    reuse.lastTouchedDate = Date.now();
}
function centreall() {
    for (let o in currentObjects) {
        let d = currentObjects[o];
        // resetMat(undefined, d);
        centrescale(d, undefined, 1);
        d.render();
    }
}
function imageaspkeydown(evt) {
    if (evt.keyCode === 13) {
        W.imageasp.style.color = "#000";
        onWindowResize();
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
    this.test = function (mat, popmode = 'unknown') {
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
        let mmat = (typeof mat === "string") ? getMaterial(mat) : mat;
        tmesh.material = mmat;
        // mmat.uniforms.rot4.value.elements.set(trot4.elements);
        try {
            rrender("Testmaterial", tscene, camera, tbuff);
            let rc = checkglerror("testing new material");
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
if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
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
var rrender = function (reason, scenep, camerap, target, flag) {
    reason = rrender.xtag.join('_') + '_' + reason;
    // bad experiment but something similar may be useful again renderer.capabilities.logarithmicDepthBuffer = reason.endsWith("_rawscene");
    /**/
    if (camerap)
        uniforms.cameraPositionModel.value.setFromMatrixPosition(camerap.matrixWorld);
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
            rrender.xmatrixInverse.getInverse(xmatrix);
            // uniforms.cameraPositionModel.value.setFromMatrixPosition( camera.matrixWorld );
            uniforms.cameraPositionModel.value.applyMatrix4(rrender.xmatrixInverse);
        }
    }
    /**/
    if (opmode === 'undefinedopmode')
        log('unexpected opmode in reason', reason);
    if (flag)
        console.error('clear flag deprecated on rrender');
    if (logframenum === framenum && opmode === OPMAKESKELBUFF) {
        //renderer.clearTarget(uniforms.skelbuffer.value);  // << debug
        renderer.clearTarget(skelbuffer); // << debug
    }
    if (scenep !== 'noscene' && scenep.children.length === 0)
        return;
    let hornid = uniforms.hornid ? uniforms.hornid.value : 'n/a';
    if (opmode === 'postcompile') {
        captureUniforms(hornid);
        return;
    }
    if (usemask === -2 && opmode === OPREGULAR && (hornid === 3 || hornid === -1))
        return;
    let tt = target || canvas;
    uniforms.rtSize.value.set(tt.width, tt.height);
    // TODO remove many tests below, now done more efficiently in renderPipe
    let OPMODE = opmode;
    if (scenep.frustumCulled || scenep.children[0].frustumCulled)
        reason = reason + ""; // debugger;
    if (scenep.children.length !== 1) // we never really use scenes in any interesting way
        reason = reason + ""; // debugger;
    if (scenep.matrixAutoUpdate && !scenep.name.startsWith('textsc') && !scenep.autoUpdate) {
        scenep.updateMatrix();
        //scene.matrixWorldNeedsUpdate = true;
        scenep.matrixAutoUpdate = false;
        //        if (format(scene.matrix.elements,1) !== "{0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1}")
        //            reason = reason; // debugger;
        log(scenep.name, 'autoupdate on scene <<<<<<<<< frame', framenum);
        reason = reason + ""; // debugger;
    }
    let ch0 = scenep.children[0];
    if (scenep.children[0].matrixAutoUpdate) {
        ch0.updateMatrix();
        //ch0.matrixWorldNeedsUpdate = true;
        ch0.matrixAutoUpdate = false;
        //log(scene.name, 'autoupdate on children <<<<<<<<<<<<<');
        //        if (format(ch0.matrix.elements,1) !== "{0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1}")
        //            reason = reason; // debugger;
        reason = reason + ""; // debugger;
    }
    let many = typeof OPMODE !== 'number' || OPMODE === OPOPOS2COL || OPMODE === OPREGULAR || OPMODE === OPOPOS || OPMODE === OPTEST || OPMODE === OPMAKESKELBUFF || OPMODE === OPSHADOWS || OPMODE === OPSHAPEPOS || OPMODE === OPPOSITION || OPMODE === OPPICK || OPMODE === OPTSHAPEPOS2COL;
    // captureUniforms(hornid);
    if (logframenum === framenum)
        framelog('rrender', 'reason=' + reason, 'opmode=' + oplist[opmode], 'gbuffoffset=' + uniforms.gbuffoffset.value, "res=" + uniforms.lennum.value + '/' + uniforms.radnum.value + '/' + uniforms.skelnum.value + '/' + uniforms.skelends.value, 'hornid=', hornid, "hornname=", currentHset && currentHset.hornrun[hornid] ? currentHset.hornrun[hornid].horn.name : "n/a", "scene=", scenep.name, "material=", ch0.material ? '#' + (ch0.material.name + "").substring(0, 25) + '# depth=' + ch0.material.depthTest : "nomaterial", "target=", target ? target.name : 'notarget');
    if (groupcol && !many && hornid !== 2) {
        if (hornid > rrender.last) {
            if (logframenum === framenum)
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
            let ff = (rrenderCore + '').replace('rrenderCore', kcore.replaceall(' ', '_'));
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
    core(rr, camerap, scenep, ch0, target, flag);
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
    if (logframenum === framenum && opmode === OPMAKESKELBUFF) {
        logframenum = 0;
        //log('skelbuff', format(readWebGlFloat(uniforms.skelbuffer.value, {height:1, width: 40})[0], 2));
        logframenum = framenum;
    }
    // temp debug while sorting merged horn/wall
    if (0 && opmode === OPTEXTURE && uniforms.hornid.value !== WALLID) {
        let s = uniforms.hornid.value;
        uniforms.hornid.value = WALLID;
        rrender(reason, scenep, camerap, target, flag);
        uniforms.hornid.value = s;
    }
};
rrender.cores = {};
rrender.preeach = nop;
rrender.preall = nop;
rrender.posteach = nop;
rrender.postall = nop;
function rrenderCore(rr, camerap, scenep, ch0, target, flag) {
    //consoleTime(key);
    // timing even with gl.finish() not helpful, maybe because of extra gpu process and async?
    if (logframenum === framenum)
        consoleTime(opmode);
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
            if (+THREE.REVISION < 100) {
                renderer.render(scenep, camerap, target, flag); // works up to V100?
            }
            else {
                renderer.setRenderTarget(target || null); //  || null); // for V102, care with null etc, but breaks with earlier
                if (flag)
                    renderer.clear();
                renderer.render(scenep, camerap);
            }
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
    if (logframenum === framenum) {
        gl.finish();
        consoleTimeEnd(opmode);
    }
}
function remakeShaders(force = false) {
    // baseShaderChanged();  done in getShaders()
    msgfix('rebuilding shaders', '<span class="errmsg">rebuilding shaders</span>');
    onframe(() => msgfix('rebuilding shaders'), 3);
    badshader = false;
    onframe(() => {
        clearPostCache('remakeShaders');
        forcerefresh = true;
        dotty = false;
        slots[mainvp].dispobj.renew(); // recompile the copy shader as well
        onframe(function () { getShaders(undefined, undefined, force); });
    });
}
/*** shaderhere
remakeShaders clears postCache
getShaders set vertfid/fragfid
baseShaderChanged cleans all material (including dispose) so they are regenerated
regenHornShader cleans postCache and getHornSet

remakeShaders -> getShaders -> baseShaderChanged
regeneHornShader -> getShaders

ctrk,shift,m -> regenHornShader
ctrl,m -> remakeShaders

***/
// show the uniforms actually used for each material (debug)
function showUniformsUsed() {
    const k = {};
    for (let opm in material) {
        let matops = material[opm];
        if (typeof matops === 'string')
            continue;
        for (let m in matops) {
            if (m === 'defines')
                continue; // extra infor stored
            // if (m.indexOf('#') !== -1) continue;  // duplicate for specific and generic forms] unreliable test
            let mm = matops[m];
            if (!(mm instanceof THREE.ShaderMaterial))
                continue;
            // We used to catch uniformsList be patch to three.js, but that is not necessary
            // It is also available without patch as renderer.properties.get(mm).uniformsList
            // AND as shader.program.getUniforms().seq
            // seq also includes projectionMatrix etc when used, so the preferred option
            //let ul = mm.uniformsList;
            let ulold = renderer.properties.get(mm).uniformsList;
            let ul = mm.program.getUniforms().seq; // THREEA
            if (!ul)
                ul = [[0, 0, '???']];
            let nn = ul.map(function (x) { return x.id; }).join(", ");
            log(opm, m.trim().substr(0, 18), '       uniforms', olength(ul), olength(ulold)); // ,  + m.substr(-20));
            k[opm + '.' + m] = nn;
        }
    }
    return k;
}
// clean up materials, get rid of the long strings ... but lots are still hidden somewhere else
function cleanMaterials() {
    for (let opm in material) {
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
            mm.program.code = '!cleaned!';
        }
    }
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
        format: THREE.RGBFormat,
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false
    }, 'testnightly');
    rt.texture.generateMipmaps = false; // without this also fails generating mipmaps at setRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(bigcol); //< use main viewport color for clearing the canvas
    renderer.clear(true, true, true);
    Gldebug.stop();
}
var renderVR = function (rt) {
    if (renderVR.lastRatio !== renderVR.ratio) {
        // ratio has changed, we must leave VR and reenter for this to take
        dockeydowninner('F4'); // leave VR and do other tidy implied by this key
        forcevr(1);
        renderVR.lastRatio = renderVR.ratio;
    }
    if (!renderVR.invr() && !renderVR.showstereo) {
        return renderObjsInner(rt);
    }
    if (renderVR.prevr) {
        const rr = renderVR.prevr({ rt });
        renderer.setRenderTarget(); // ??? needed ??, put in prevr ???
        renderer.vr.submitFrame(); // ??? sjtp 15/2/20
        if (rr)
            return;
    }
    genesToCam(currentGenes);
    const rs = renderer.getSize(new THREE.Vector2());
    // renderer.getSize() could be non-integer;
    // canvas should have correct width/height, but MAY be wrong if devicePixelRatio !== 1
    // and wrong if odd width
    if (renderer.vr.isxr) { // in xr
        const bl = renderer.vr.getSession().renderState.baseLayer;
        rs.width = bl.framebufferWidth;
        rs.height = bl.framebufferHeight;
    }
    else {
        rs.width = rs.width || rs.x; // compatability between three versions, renderer.getSize changed specs.
        rs.height = rs.height || rs.y;
    }
    const ww = Math.floor(rs.width / 2) * 2;
    const hh = Math.floor(rs.height);
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
        setViewports([2, 1], rs.width, rs.height);
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
    // note, the call to renderer.vr.getCamera has set matrixWorld and matrixWorldInverse but NOT matrix for the stereo cameras
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
    // ensure updateMatrix() does not forget new matrix
    cameras[0].matrix.decompose(cameras[0].position, cameras[0].quaternion, cameras[0].scale);
    cameras[1].matrix.decompose(cameras[1].position, cameras[1].quaternion, cameras[1].scale);
    // Correct near/far (especially for XR) without upsetting rest of projection matrix
    // Should be unnecessary if (when?) camera is in meteres and not scaled
    // We do not bother with near/far values for renderVR.camera, renderVR.cameras or renderVR.cameras.cameras[0/1]
    // In webVR the effect may be transmitted to the VR stereo cameras (renderVR.cameras.cameras[0/1])
    // by the renderer.vr.getCamera() call in VRTrack and we used (pre Dec 2019) to reply on that.
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
    if (!slots[2].dispobj.genes)
        slots[2].dispobj.genes = {}; // in case there was only one object before
    //copyFrom(slots[2].dispobj.genes, slots[1].dispobj.genes);  // but the objects in the two viewports are both the same
    slots[2].dispobj.genes = slots[1].dispobj.genes;
    //mmm    if (renderer.setScissorTest) renderer.setScissorTest(true);
    slots[1].dispobj.needsRender = 1; // make sure we render into viewport 1 using first object
    slots[2].dispobj.needsRender = 0;
    //    renderer.vr.enabled = false; // ???
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
    renderObjsInner(rt);
    rrender.xtag.pop();
    // now offset the camera and render into viewport 2 using second (identical) object
    // let cam2 = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
    if (!V.resting)
        camera = cameras[1];
    camToGenes(slots[2].dispobj.genes);
    // camera.position.x = renderVR.disp;
    slots[1].dispobj.needsRender = 0;
    slots[2].dispobj.needsRender = 1;
    if (camera.layers) {
        camera.layers.enable(2);
        camera.layers.disable(1);
    }
    dispobj = slots[2].dispobj;
    //mmm    renderer.setScissor(dispobj.left, dispobj.bottom, dispobj.width, dispobj.height);
    // Prevent attempts to autopan on non-main viewport.  Could do by modifying currentGenes to make this "Main"
    let savertr = renderObjHorn.centreOnDisplay;
    renderObjHorn.centreOnDisplay = false;
    renderVR.eye2 = true;
    rrender.xtag.push('vr');
    renderObjsInner(rt);
    rrender.xtag.pop();
    // msgfix('RVR', 'rendered cam1');
    // only restore eye2 after slots[0] pass
    //   renderer.vr.enabled = true; // ???
    renderObjHorn.centreOnDisplay = savertr;
    render_camera = camera = savecam;
    camToGenes();
    // msgfix('RVR', 'render stereo done');
    //mmm    if (renderer.setScissorTest) renderer.setScissorTest(false);
    if (!renderVR.nosubmit && renderVR.invr() && !inputs.AFAP) {
        // renderer.vr.getDevice().submitFrame();
        renderer.vr.submitFrame(); // slightly more 'official' way
        // msgfix('RVR', 'render frame submitted');
    }
    else {
        // msgfix('RVR', 'render frame NOT submitted');
    }
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
    if (isWebGL2 || renderer.vr.isxr) { // ?? test here, but with Chrome and webgl2 the main screen is blank otherwise, TODO could be cheaper bitblt?
        // obsolete sample https://github.com/immersive-web/webxr-samples/blob/master/spectator-mode.html
        // also comments by klausw 7:54 PM 29 July 2019  https://app.slack.com/client/T0EEAMLFP/C0FDV7WGG/whats_new
        renderer.setFramebuffer(null);
        slots[1].dispobj.needsPaint = true;
        //slots[2].dispobj.needsPaint = true;
        renderObjsInner(rt);
    }
    renderVR.eye2 = false;
    //if (renderVR.invr()) return;  // temp todo remove sjpt DO NOT CHECK IN
    // ensure SteamVR settings as we want
    // could be done elsewhere, but doing it here (a) ensures steamVR running and (b) gives us more chance to experiment
    // Firefox lines below for renderVR settings.  BUT running this caused Firefoxx to crash
    if (!renderVR.settingdone && renderVR.invr() && (navigator.userAgent.indexOf('Firefox') === -1) && !oxcsynth) {
        const rcmd = (navigator.userAgent.indexOf('Firefox') === -1) ? renderVR.setting : renderVR.settingFF;
        log('run', rcmd);
        runcommandphp(rcmd);
        renderVR.settingdone = true;
    }
    // now we really know the vr demo is started clear the messages
    if (startvr && !renderVR.clearmessdone) {
        nomess('force');
        renderVR.clearmessdone = true;
    }
}; // renderVR
rrender.xtag = [];
// renderVR.setting = "..\\vrsettings\\vrsettings steamvr allowAsyncReprojection 0 steamvr allowInterleavedReprojection 0 steamvr forceReprojection 1";
renderVR.setting = navigator.appVersion.indexOf('Chrome/56.0.2902.0') === -1 ? "mutatorvrsettings.cmd" : "mutatorvrsettingsOldChrome.cmd";
renderVR.settingFF = "mutatorvrsettingsFF.cmd";
renderVR.settingdone = false;
renderVR.scale = 100;
renderVR.moveScale = 1; // relative movement speed to scale
renderVR.ratio = renderVR.lastRatio = 1; // 0.65;
/** initialize VR, and also initialize Supercollider.
 * The two are related becuase Supercollider cannot reliably use HTC audio until we are sure any SteamVR etc is ready.
 */
function VRSCinit() {
    log("VRinit asking for displays zzz");
    renderer.vr.enabled = false; // that is for dual eye rendering from single three render call, not for our VR
    /** do automatic start for startvr for xr or vr */
    function tryAutoVR() {
        if (startvr) {
            //onframe(()=>forcevr(50,100,1.1), 10);  // don't try this until things are a bit settled
            setTimeout(onframe(() => forcevr(renderer.vr.isxr ? 1 : 50, 250, 1.1), 100), 14000); // don't try this until things are a bit settled
            log("forcevr called now we have a device zzz");
        }
        else {
            log("forcevr we have device but no automatic call as not in startvr zzz");
        }
        msgfixerror("VR", 'device found, F2 or F6 to enter VR');
    }
    // test for different startup if in WebXR
    if (renderer.vr.isxr) { // eg, in xr
        // to check, it should be impoissible for isxr to be true unless allowXR is true
        if (!WA.allowXR && !searchValues.allowXR) {
            msgfixerror('VRXR', 'Organic/CSynth does not support VR when WebXR enabled');
            return;
        }
        WA.XXXmyRequestAnimationFrame = myRequestAnimationFrame;
        myRequestAnimationFrame = nop;
        renderer.setAnimationLoop(animateNum);
        if (WA.WEBVR)
            document.body.appendChild(WA.WEBVR.createButton(renderer));
        // todo startSC at right time
        if (startSC) {
            startSC(); // TODO defer till now incase of VR devices with audio
        }
        tryAutoVR();
        return;
    }
    const nav = navigator;
    const gvr = navigator.getVRDisplays;
    if (!nav.getVRDisplays) {
        onframe(() => nomess('release'));
        msgfixerror("VR", "VRinit no getVRDisplays, so no VR zzz");
        if (startSC)
            startSC(); // defer till now incase of VR devices with audio
        return;
    }
    consoleTime('VRinit getVRDisplays zzz');
    msgfixerror("VR", "trying to get device zzz");
    nav.getVRDisplays().then(function (displays) {
        consoleTimeEnd('VRinit getVRDisplays zzz');
        if (startSC)
            startSC(); // defer till now so we can use Vive audio if Vive available
        //if (displays.length > 1) {
        //    console.error('too many displays', displays.length);
        //    debugger;
        //}
        if (displays[0]) {
            tryAutoVR();
            // if (displays.length === 0 || !displays[0]) alert('no vr devices');
            renderer.vr.setDevice(displays[0]);
            if (isFirefox)
                msgfix('connected', () => renderer.vr.getDevice().isConnected);
        }
        else {
            msgfixerror("VR", 'VR capability around but no devices found zzz');
            if (startvr) {
                nomess(false);
                msgfix.all = true;
                msgfixerror('no devices', 'VR capability around but no devices found and startvr specified zzz');
            }
            msgfixerror('VR', 'VR available but no devices');
        }
    }, function (e) {
        msgfixerror('VR', 'VR available but getVRDisplays request rejected<br>', e);
    }); // end then ...
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
    // if (!renderer.vr.getDevice()) return;  // removed for XR ~~~
    if (!renderVR.invr()) {
        if (renderVR.camera)
            renderVR.camera.matrix.identity(); // in case going back to non-vr
        return;
    }
    if (!renderVR.camera) {
        renderVR.camera = new THREE.PerspectiveCamera(camera);
        renderVR.inv = new THREE.Matrix4();
        renderVR.mycam = new THREE.Matrix4();
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
    renderVR.inv.getInverse(vcam); // get old inverse  vcam**-1 ... todo optimize this, we usually alreay have it
    //    renderVR. controls.update();        // get new values <<<<<<<, it has set position and quaternion in renderVR.camera
    // near and far are input to getCamera(), other input camera information ignored
    // side effect is input camera values are set
    // and output is stereo pair of cameras (used later for display) with matrixWorld and matrixWorldInverse set (but NOT matrix)
    // renderVR.camera.near = camera.near; renderVR.camera.far = camera.far;  // handle near/far in renderVR instead
    renderVR.cameras = renderer.vr.getCamera(renderVR.camera); // ++++ <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<!!!!! real work here
    // renderVR.cameras.matrix isn't really a good place to save the reference pose
    // and compute its difference each frame, BUT that is how it worked for VR
    // and the lines below should make it work the same for XR.
    if (renderer.vr.isxr) {
        renderVR.camera.matrix.elements.set(renderer.vr.pose.transform.matrix);
        renderVR.camera.matrix.decompose(renderVR.camera.position, renderVR.camera.quaternion, renderVR.camera.scale);
    }
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
        renderVR.stereo[0].multiplyMatrices(cameras[0].matrixWorldInverse, renderVR.camera.matrixWorld);
        renderVR.stereo[1].multiplyMatrices(cameras[1].matrixWorldInverse, renderVR.camera.matrixWorld);
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
        //renderVR.sitstand.getInverse(renderVR.sitstand);  // << NO, camera is inverse of his view
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
    camera.applyMatrix(renderVR.mycam); // to get camera' = mycam * vcam'
    renderVR.inv.getInverse(vcam); // get old inverse  vcam**-1
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
/** enter and leave xr */
renderVR.xrfs = async function xrenderVRfs(bool = true) {
    // log('renderVR.xrfs', bool)
    renderVR.xrfs.lastrequest = bool; // remembers if we want to be in XR
    if (renderVR.invr() === bool)
        return; // already in correct
    //??if (renderVR.xrfsdone && Date.now() - renderVR.xrfsdone < 1000) return log('renderVR.xrfs repeat request too soon');
    if (WA.WEBVR.button.textContent === "XR NOT FOUND") {
        WA.WEBVR.button.style.display = 'none';
        WA.makevr2 = nop; //  no point in goin on trying
        return;
    }
    log('renderVR.xrfs change', bool);
    renderer.vr.setFramebufferScaleFactor(renderVR.ratio);
    WA.WEBVR.onclick(); // click the button to enter/leave
    if (!bool)
        return; // we've asked it to go away, that seems safe
    if (renderVR.xrfs.state === 'opening')
        return log('xrfs reopen attempt');
    renderVR.xrfs.state = 'opening';
    const callnum = renderVR.xrfs.startcalls++;
    // USE POLLING INSTEAD
    // // start listening early; needed to restart vr if it chooses to stop itself
    // // we have seen it stop on timeout (?) which can restart.  There may be cases we can't restart???
    // renderVR.xrfs.mm = Maestro.on('xrsessionstarted', () => {
    //     const session = renderer.vr.getSession();
    //     if (!session) serious('session not found in renderVR.xrfs');
    //     const sessionEndListener = async () => {
    //         session.removeEventListener('end', sessionEndListener);
    //         if (renderVR.xrfs.lastrequest) {    // our last request was to start vr, so this end was not from our request
    //             renderVR.xrfs.restarts++;
    //             await sleep(1000);              // ??? if we retry too fast it things there is already a session
    //                                             // actually, it seems there is even after this wait ???
    //             msgfixlog('renderXR', 'restart XR after timeout', renderVR.xrfs.restarts);
    //             forcevr();                      // this will do the simulated F2 etc
    //         }
    //     }
    //     session.addEventListener('end', sessionEndListener);
    // }, undefined, true);
    // repeat the click loop
    if (!searchValues.devMode && bool && !renderVR.xrfsdone) {
        // make sure in front and fullscreen before we start poking
        EX.toFront();
        // await document.body.requestFullscreen();        // this level should have come from (simulated?) keystroke
        await sleep(500);
        for (let i = 0; i < 1; i++) { // several may be needed if openVR wasn't ready
            if (renderer.vr.getSession())
                break;
            // tryclick(); // obsolete with Chrome 86
            if (renderer.vr.getSession())
                break;
            log('xrfs clicks before sleep', i, callnum);
            await sleep(2000);
            log('xrfs clicks after sleep', i, callnum);
        }
        renderVR.xrfsdone = Date.now();
    }
    await sleep(500);
    if (!renderVR.invr())
        log('xrfs leave renderVR.xrfs still not in XR', callnum);
    else
        log('xrfs leave renderVR.xrfs in XR OK', callnum);
    renderVR.xrfs.state = 'unguarded';
    // // tryclick no longer needed as Chrome 86 has more sensible security arrangement.
    // // click loop to click irritating security button
    // function tryclick() {
    //     if (!islocalhost) return;
    //     // runcommandphp('..\\nircmd\\nircmd.exe setcursor 905 220');
    //     //
    //     // this loop should hit it as long as Chrome is fullscreen on window
    //     // whether the address bar etc is displayed or Organic is fullscreen in chrome
    //     // bottom and work up so we don't
    //     EX.toFront();
    //     for (let i=25; i > 10; i -= 2) {
    //         nircmd(`setcursorwin ${(width*0.5+100)*devicePixelRatio} ${height*i/100*devicePixelRatio}`);
    //         nircmd(`sendmouse left click`)
    //         if (renderer.vr.getSession()) break;
    //     }
    //     // final click in middle
    //     nircmd(`setcursorwin ${width/2} ${height/2}`);
    //     nircmd(`sendmouse left click`)
    //     //  not sure why it is sometimes hidden but this should bring it back
    //     setTimeout( () => EX.toFront(), 500);
    // }
}; // renderVR.xrfs
renderVR.xrfs.restarts = 0;
renderVR.xrfs.lastRestartTime = 0;
renderVR.xrfs.startcalls = 0;
renderVR.xrfs.state = 'unguarded';
/** enter and leave vr */
renderVR.fs = function xrenderVRfs(bool = true) {
    if (renderer.vr.isxr)
        return renderVR.xrfs(bool);
    if (!!renderVR.invr() === bool) {
        log('zzz renderVR.fs request when already in correct mode', bool);
        return;
    }
    const dev = renderer.vr.getDevice();
    if (!dev) {
        msgfixerror('VR mode', 'request to enter VR when no VR device available.');
        return;
    }
    /** stereo not working right * /
    if (!dev && bool) {  // no device, but try stereo
        const cam2 = renderVR.cameras;
        if (!cam2.cameras) cam2.cameras = [camera.clone(), camera.clone()];
        renderVR.showstereo = true;
        renderObjs = renderVR;
        return;
    }
    /***/
    if (!renderVR.listenerdone) {
        window.addEventListener('vrdisplaypresentchange', __onVRDisplayPresentChange, false);
        renderVR.listenerdone = true;
    }
    const time = Date.now();
    // do not show this 30/08/2017 W.entervr.style.display = "block";
    // if (bool === undefined) bool = true;
    if (navigator.getVRDisplays && dev) {
        if (renderVR.lastrequest.bool === bool && time - renderVR.lastrequest.time < 100) {
            log('repeated request too soon, ignored');
            return;
        }
        renderVR.lastrequest = { bool, time, framenum };
        // should this be in onvrdisplaypresentchange
        if (bool) {
            V.skip = false;
            dat.GUIVR.disableMouse();
        }
        else {
            dat.GUIVR.enableMouse(V.nocamcamera, renderer);
        }
        if (bool) {
            // reset resolution in advance, otherwise we have to cancel presentation and retry
            // no longer need the extra checks now the underlying WebVR implementations are improved
            // leave to three.js
            // We rely on vrdisplaypresentchange for detecting when VR is ready.
            // At one time oddities in Firefox seemed to make change detection in the the 'then()' clause below more reliable
            // We now only use the then clause for diagnostics
            msgfixlog('requestPresent', 'requested');
            setTimeout(() => { if (!renderVR.invr())
                nomess('release'); }, 3000);
            dev.requestPresent([{ source: canvas }])
                .then(function dresolve() {
                msgfixlog('requestPresent', 'promise resolved');
            }, function dreject(e) {
                msgfixlog('>requestPresent', 'promise rejected<br>', e);
                msgfixlog('>requestPresentX', `### promise rejected ###<br>${e}
                    <br>This is probably due to previous WebVR errors.
                    <br>It will be necessary to refresh the page.
                    <br>It may be necessary to resart WebVR or the browser.`);
                msgboxVisible(true);
                renderVR.lastrequest = { bool: 'rejected', time: -9999, framenum: -9999 };
            });
            // renderVR.eff ect.setSize();  // this should reestablish correct size if anything goes wrong
            rendertargets = {}; // force refresh just in case
            W.entervr.style.display = "none";
        }
        else {
            dev.exitPresent();
            renderObjs = renderObjsInner;
            log('dev.exitPresent called  zzz', bool, renderObjs.name);
        }
    }
    /************
            // if (bool) renderer.setSize(1080*2, 1200);  // is case upset by VREffect ignoring ratio
            renderVR.promise = renderVR.eff ect.setFullScreen(bool);
            renderVR.promise.then(
                function(res) { // fullscreen ok
                    msgfix('FSstatus1', res === undefined ? "OK" : '>' + res);   // confirm to user
                    // make sure everything else appropriate ready
                    if (bool) {
                        // renderVR.eff ect.setSize();  // this should reestablish correct size if anything goes wrong
                        renderObjs = renderVR;  // force two window render
                        rendertargets = {};     // force refresh just in case
                        W.entervr.style.display = "none";
                    }
                    if (fun)
                        fun();
                },
                function(err) { msgfix('FSstatus1', err.toString()); renderVR.err = err; }
            );
            if (!bool) {
                clearTimeout(renderVR.newfsTimeout);
                renderObjs = renderObjsInner; // keep VR even though only partial
            }
        } else {  // no real vr
            //if (!bool) {
                renderObjs = bool ? renderVR : renderObjsInner; // keep VR even though only partial
                msgfix('>NOVR', 'vr not supported on this browser');
            //}
        }
    ****/
};
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
    if (!renderer.vr)
        return false;
    if (typeof renderer.vr.isPresenting === 'boolean')
        return renderer.vr.isPresenting; // added for 117
    if (renderer.vr.isPresenting)
        return renderer.vr.isPresenting();
    if (renderer.vr.getDevice())
        return renderer.vr.getDevice().isPresenting; // legacty webvr older three.js
};
renderVR.keys = function xrenderVRkeys(kkk) {
    //if (renderObjs !== renderVR) return undefined;
    let handled = true;
    switch (kkk) {
        case 'shift': break; // so details are shown
        // note scale inverted so it is object scale
        case 'shift,insert':
            renderVR.scale /= 1.1;
            break;
        case 'shift,delete':
            renderVR.scale *= 1.1;
            break;
        //case 'shift,home': renderVR.moveScale *= 1.1; break;
        //case 'shift,end': renderVR.moveScale /= 1.1; break;
        case 'shift,page up':
            if (currentGenes.shrinkradiusA === 0)
                currentGenes.shrinkradiusA = 10;
            currentGenes.shrinkradiusA *= 1.1;
            break;
        case 'shift,page down':
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
        W.tranrulebox.style.display = 'none';
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
    //if (nwfs) {
    writetextremote('exportShader/vertHLSL.txt', hlslv);
    writetextremote('exportShader/fragHLSL.txt', hlslf);
    //writetextremote('exportShader/bothHLSL.txt','~~~~~frag\n' + hlslf + '\n\n~~~~~vert\n' + hlslv);
    //}
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
function testexp() {
    compileShader('exportShader/frag.fs', gl.FRAGMENT_SHADER);
    compileShader('exportShader/vert.vs', gl.VERTEX_SHADER);
    // serious('tested');
}
function compileShader(string, type) {
    log("TEST", string);
    if (string.length < 100)
        string = "#version 140\n" + getfiledata(string).toString();
    let shader = gl.createShader(type);
    gl.shaderSource(shader, string);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        console.error('THREE.WebGLShader: Shader couldn\'t compile.');
    }
    if (gl.getShaderInfoLog(shader) !== '') {
        log('THREE.WebGLShader: gl.getShaderInfoLog()', type === gl.VERTEX_SHADER ? 'vertex' : 'fragment', gl.getShaderInfoLog(shader)); // , addLineNumbers( string ) );
    }
}
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
        log('shadows', inputs.SHADOWS, inputs.SHADOWS1, inputs.SHADOWS2);
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
    if (renderer.vr.getDevice() && renderer.vr.getDevice().resetPose)
        renderer.vr.getDevice().resetPose();
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
/** fit the canvas display to the window, or scale it.  Keep aspect ration of renderer/canvas */
function fitCanvasToWindow(sc = undefined) {
    if (!sc) {
        let sc1 = window.innerWidth / canvas.width;
        let sc2 = window.innerHeight / canvas.height;
        sc = Math.min(sc1, sc2);
    }
    canvas.style.left = inputs.fixcontrols ? '360px' : '0px';
    canvas.style.top = '0px';
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
    // if (renderVR.hasPresented) { msgfix("forcevr direct retry as already presented"), renderVR.fs(true); }
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
    //options may include resoverride, extratranrule, scene, renderPass, genes, uniforms, rendertarget, rdelta, usemask
    //let gsave = {};
    //copyFrom(gsave, options);    // save the options, will be flat with keys such as 'inputs.USESKELBUFFER'
    //copyFromN(W, options);       // and apply them
    if (badshader)
        return;
    let genes = options.genes || currentGenes;
    let save = [genes.tranrule, currentHset, genes._rot4_ele, inputs.USESKELBUFFER, resoverride, trancodeForTranrule, extradefines, dotty, uniforms.NORMTYPE.value];
    let changed;
    try {
        const WW = window;
        // these are localized
        let scenei = options.scene || WW.scene;
        let renderPassi = options.renderPass || WW.renderPass;
        resoverride = options.resoverride || WW.resoverride;
        let uniformsi = options.uniforms || WW.uniforms;
        let rendertarget = options.rendertarget;
        // these are global
        resoverride = options.resoverride || WW.resoverride;
        genes.tranrule = options.tranrule;
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
            dotty = options.dotty;
        if (options.NORMTYPE !== undefined)
            uniforms.NORMTYPE.value = options.NORMTYPE;
        if (0 && !getHornSet(genes.tranrule)) { // todo only for horns
            hornTrancodeForTranrule(genes.tranrule, genes);
            changed = true;
        }
        currentHset = getHornSet(genes.tranrule);
        renderObjPipe(scenei, renderPassi, genes, uniformsi, rendertarget, FIRST(options.rdelta, WW.inputs.resdyndeltaui), FIRST(options.usemask, WW.usemask));
        let m = material.opos ? material.opos[genes.tranrule] : undefined; //there might be a chance of getting to here before appropriate opos entry is established.
        //this happened when adding mouse picking code within vivecontrol method for csynth...
        if (m)
            m.side = THREE.DoubleSide; // set once material established
    }
    finally {
        [genes.tranrule, currentHset, genes._rot4_ele, inputs.USESKELBUFFER, resoverride, trancodeForTranrule, extradefines, dotty, uniforms.NORMTYPE.value] = save;
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
/** set camera from position and quaternion rotation.
If no rotation given, camera does a lookat origin
If x not defined taken as distance, with x,y,z random
If x is vector (x.x exists) it is used as xyz
*/
function camset(g = G, x = 1200, y, z, qx, qy, qz, qw) {
    if (x.x !== undefined)
        [x, y, z] = [x.x, x.y, x.z];
    const R = () => Math.random() * 2 - 1;
    if (y === undefined) {
        z = R() * x, y = R() * x, x = R() * x;
    }
    g._camx = x;
    g._camy = y;
    g._camz = z;
    if (qx === undefined) {
        genesToCam(g);
        camera.lookAt(new THREE.Vector3());
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
function userset(x, y, z, rx, ry, rz, sc) {
    let r = `${G._panx = x}, ${G._pany = y}, ${G._panz = z} / ${G._uXrot = rx}, ${G._uYrot = ry}, ${G._uZrot = rz}  / ${G._uScale = sc}`;
    return r;
}
/** show all details that mich effect view */
function showview() {
    log('camera', 'pos', camera.position, 'range', camera.near, camera.far, 'fov', camera.fov, 'rot', camera.rotation);
    log(FF(G, '_cam'));
    log(FF(G, '_pan'));
    log(FF(G, '_qu'));
    log(FF(G, '_u'));
    log('Grot4', G._rot4_ele);
    log('Urot4', uniforms.rot4.value.elements);
    log('$basescale');
    log('$NOSCALE$  $NOCENTRE$  $GPUSCALE$');
    if (uniforms.gscale)
        log('autosc', uniforms.gscale.value, uniforms.gcentre.value, '(smoothed, correct if cpuscale)');
    // log(FF(G, '_pos'));  // derived from _rot4ele
    let dt = readWebGlFloat(scaleDampTarget1.main);
    log('autoscgpu', dt[3][0], { x: dt[0][0], y: dt[1][0], z: dt[2][0] });
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
            if (nwfs) {
                nwfs.writeFileSync('exportShader/vert.vs.c', "#define varying out\n" + mat.vertexShader);
                nwfs.writeFileSync('exportShader/frag.fs.c', "#define varying in\n" + mat.fragmentShader);
                nwfs.writeFileSync('exportShader/uniforms.txt', exportShaders.formatVals);
                COL.randcols();
                if (tad)
                    tad.reservedProps(); // we have just overridden those, put them back, ??? should be in tad.randcols()???
                nwfs.writeFileSync('exportShader/colData.txt', COL.array.join(',\n'));
                let ss = [];
                // ss.push("struct Material{ float");
                let cn = COL.names;
                for (let i = 0; i < cn.length; i += 4)
                    ss.push(cn[i] + "," + cn[i + 1] + "," + cn[i + 2] + "," + cn[i + 3]);
                let sss = ss.join(",\n");
                sss = "struct Material{ float\n" + sss + "\n;\n};";
                nwfs.writeFileSync('exportShader/colStruct.txt', sss);
                serious('to fix prefompile -> optimizeShaders');
                require('child_process').exec('precompile.cmd vert.vs', { cwd: 'exportShader' });
                require('child_process').exec('precompile.cmd frag.fs', { cwd: 'exportShader' });
                exportShaders.fixcols = false;
                setInput(W.GPUSCALE, true); // at least for now
                remakeShaders();
            }
            else {
                msgfix("exportShaders", "no nwfs for writings shaders");
            }
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
        mat = getMaterial(currentGenes, true);
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
    //let mm = mat.fragmentShader.split('float vv = lopos.z + 0.5;')[1];
    //log('>>>> fragment of fragment shader', mm.substring(0, 400).replaceall("$","!"));
    let op = mat.opmode + extra;
    let xcode = code || '_XX';
    if (nwfs) {
        let dir = 'exportShader/' + xcode + '/';
        mkdir(dir);
        let place = dir + op;
        if (!nwfs.existsSync(`${dir}/optimizeShaders.cmd`)) {
            const optimizeShaders = nwfs.readFileSync('optimizeShaders.cmd');
            nwfs.writeFileSync(`${dir}/optimizeShaders.cmd`, optimizeShaders);
        }
        nwfs.writeFileSync(place + '.vs.c', mat.vertexShader);
        nwfs.writeFileSync(place + '.fs.c', mat.fragmentShader);
        require('child_process').exec('optimizeShaders.cmd ' + op, { cwd: dir });
    }
    else {
        let dir = 'exportShader\\' + xcode + '\\';
        mkdir(dir);
        let place = dir + op;
        runcommandphp(`copy optimizeShaders.cmd exportShader\\${xcode}\\optimizeShaders.cmd`);
        remotesave(place + '.vs.c', mat.vertexShader);
        remotesave(place + '.fs.c', mat.fragmentShader);
        runcommandphp(dir + '\\optimizeShaders.cmd ' + op);
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
    usesavedglsl = key;
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
function printGraph(obj, extrafun, expdepth = 0, depth = 0) {
    const xx = extrafun ? extrafun(obj) : '';
    (depth >= expdepth ? console.groupCollapsed : console.group)('%s: %s %s <%O>', obj.type, obj.name, xx, obj);
    obj.children.forEach(x => printGraph(x, extrafun, expdepth, depth + 1));
    console.groupEnd();
}
;
let OM = {};
OM.tmat = new THREE.Matrix4();
OM.tvec3 = new THREE.Vector3();
/** make a separate transfrom and save in genes, should interwork with useGeneTransforms, but ... todo 30/03/17 */
function makeGenetransform(genes = currentGenes) {
    if (inputs.using4d)
        return;
    if (!genes._rot4_ele)
        return;
    var xxmat4 = OM.tmat;
    xxmat4.elements.set(genes._rot4_ele);
    xquat.setFromRotationMatrix(xxmat4);
    genes._qux = xquat.x;
    genes._quy = xquat.y;
    genes._quz = xquat.z;
    genes._quw = xquat.w;
    // TODO: verify and tidy
    var v3 = OM.tvec3;
    v3.set(genes._rot4_ele[3], genes._rot4_ele[7], genes._rot4_ele[11]);
    v3.applyMatrix4(xxmat4);
    genes._panx = v3.x;
    genes._pany = v3.y;
    genes._panz = v3.z;
}
/** make a separate transfrom and save in genes */
function useGenetransform(genes) {
    if (inputs.using4d)
        return;
    genes = genes || currentGenes;
    xquat.x = genes._qux;
    xquat.y = genes._quy;
    xquat.z = genes._quz;
    xquat.w = genes._quw;
    xquat.normalize();
    if (!genes._rot4_ele)
        genes._rot4_ele = [];
    xmat4.elements = genes._rot4_ele;
    xmat4.makeRotationFromQuaternion(xquat);
    // TODO: verify and tidy
    var xxmat4 = new THREE.Matrix4();
    xxmat4.copy(xmat4);
    xxmat4.transpose();
    var v3 = new THREE.Vector3();
    v3.set(genes._panx, genes._pany, genes._panz);
    v3.applyMatrix4(xxmat4);
    genes._rot4_ele[3] = v3.x;
    genes._rot4_ele[7] = v3.y;
    genes._rot4_ele[11] = v3.z;
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
function saogui(pgui = V.gui) {
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