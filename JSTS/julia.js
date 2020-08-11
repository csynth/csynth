//   var scene, camera, controls;
var Julia = new function () {
    function setGenesAndUniforms() {
        genedefs = {};
        var u = undefined;
        if (!uniforms)
            uniforms = {
                k: { type: "f", value: 1.0, framenum },
                vn: { type: "f", value: 1.0, framenum },
                rot4: { type: "m4", value: new THREE.Matrix4(), framenum } // 4d rotation matrix
            };
        if (!uniforms.camInvProjMat)
            uniforms.camInvProjMat = { type: "m4", value: new THREE.Matrix4(), framenum }; // camera projectiopn inverse
        if (!uniforms.invrot4)
            uniforms.invrot4 = { type: "m4", value: new THREE.Matrix4(), framenum }; // 4d rotation matrix, camera inverse
        if (!uniforms.camMatrixWorld)
            uniforms.camMatrixWorld = { type: "m4", value: new THREE.Matrix4(), framenum }; // 4d rotation matrix, camera
    }
    function prerender(genes, u) {
        trmat(genes, genes._rot4_ele, function (gn, v) { u[gn].value = v; });
        baseprerender(genes, u);
    }
    var inittodo = true;
    /** initialize */
    this.init = function init() {
        if (!inittodo)
            return;
        // appToUse='Julia';  // probably already set, more a typescript test
        setGenesAndUniforms();
        // overwrite a few 'standard' functions
        setRes = function (r) { }; // not used in fano
        scale = function () { };
        applyScale = function JuliaApplyScale(sc, genes) {
            genes = applyAll(applyScale, [sc], genes);
            if (!genes)
                return;
            xmat4.elements = genes._rot4_ele;
            xmat4.scale({ x: sc, y: sc, z: sc }); // THREEA
        };
        fixrot4scale = function () { };
        lennum = 1;
        radnum = 1;
        savedef = "julia";
        trysetele("RAND", 'checked', true);
        trysetele("SHADOWS", 'checked', false);
        trysetele("projvp", 'checked', false);
        trysetele("doAnim", 'checked', false);
        trysetele("doAnim", 'checked', false);
        trysetele("doAutorot", 'checked', false);
        tryseteleval("layoutbox", '0');
        tryseteleval("mutrate", '5');
        dragmode = false;
        setval('viewRad', 1000);
        var shaders = { Texture: "implicitTexture.fs", Julia: "juliaA.fs", Fano: "fanoc.fs" };
        getShaders("implictVertex.vs", shaders[appToUse] || appToUse + '.fs');
        /**
        setval("texscale", 0);
        setval("band1", 1);
        setval("band2", 0);
        setval("band3", 0);
        setval("bandbetween", 0);
        setval("bumpscale", 0.1);
        **/
        setval("red1", 0.5);
        setval("green1", 0.5);
        setval("blue1", 1);
        setval("light0s", 0.8);
        setval("light1s", 0.4);
        setval("light2s", 0.3);
        setval("iridescence1", -0.1);
        setTimeout(function () { setViewports([3, 4]); mutate(); }, 100);
        if (startvr) {
            currentGenes.perspective = 1;
            alwaysNewframe = 1e15;
            V.alwaysRot = false;
            V.keepinroom = false;
            V.forceheight = false;
            V.moveByController = true;
            V.staticSpeedMax = 20;
            V.minroomsize = 0.1;
            V.maxroomsize = 1000;
            G.raystartd = 0.2;
            G.rayendd = 10;
            G.intervals = 200;
            forcevr();
        }
        //mySetFragFid();
        shadows(0);
        inittodo = false;
    };
    /** called (by F6) to apply view to object and reset view */
    function reformRule() {
        newframe();
    }
    /** scaling for view, van be used by V key -> showScaleVariants -> viewscale */
    ////DEADfunction viewscale(genes, sc) { genes.viewRad *= sc; }
}();
/** render the scene */
function renderImplicit(event) {
    Julia.init();
    if (event) {
        var parms = event.eventParms;
        var dispobj = parms.dispobj;
        var genes = dispobj.genes;
        if (!dispobj.genes)
            return;
        var rendertarget = parms.rendertarget;
        egobj = xxxgenes(genes);
    }
    if (!Julia.trandone && genes._rot4_ele) { // set initial scale
        var k = 1;
        copyFrom(genes._rot4_ele, [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1]);
        currentGenes._camz = 150; // pan about right in non-perspective, cmaz irrelevant otherwise in non-perspective
        Julia.trandone = true;
    }
    setObjUniforms(genes, uniforms);
    trmat(genes, genes._rot4_ele, function (gn, v) { uniforms[gn].value = v; });
    render_camera = camera;
    opmode = OPREGULAR;
    baseRenderPass(genes, uniforms, rendertarget);
}
renderObjJulia = renderImplicit;
renderObjTexture = renderImplicit;
renderObjImplicitShape = renderImplicit;
// test class Rectangle {  constructor(height, width) {   this.height = height;   this.width = width;  } };
/******* app dependent methods etc

appToUse used in
    implicit fragment shader
    getcentrescale test
    establishObjpos test
    usedgenes test
    getMaterial debug msg
    init1 some Horn specific init
    renderObj<appToUse>
    baseRenderPass -> getMaterial
    <appToUse>SetFragFid  // fanoc/fanoc1 only
    localstartLate

app dependent methods:
    renderPass -> HornSetP.renderHornobj | baseRenderPass
    renderObj -> renderObj<appToUse> -> renderObjHorn | renderImplicit
    base shaders
    trancodeForTranrule -> hornTrancodeForTranrule | baseTrancodeForTranrule
    setRes, lennum, radnum -> setRes | nop
    scale -> scale | nop  .. find scale of object ?? only used by F7, and must be cpuscale  and irrelevant even then,
    applyScale -> applyScale | JuliaApplyScale -> _camz Z | rot4ele
    fixrot4scale -> fixrot4scale | nop
    savedef  mainly (only?) for localStorage
    SetFragFid  <appToUse>SetFragFid  // fanoc/fanoc1 only
**/
//class OrganicApplication {
//
//}
//# sourceMappingURL=julia.js.map