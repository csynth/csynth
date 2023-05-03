// declare things
type VOID = ()=>void;
type N = number; //PJT: was getting errors/warnings on addpull
interface Dictionary<T> { [Key: string]: T; }

declare type TSprings = {
    stop: VOID,
    start: VOID,
    step: (n?:number) => void,
    setfix: ((n:number, x?:number, y?:number, z?:number) => void) & ((n: number, vec:{x:number, y:number, z:number} ) => void),
    setfixdamp: ((n:number, damp:number, x?:number, y?:number, z?:number) => void) & ((n: number, vec:{x:number, y:number, z:number} ) => void),
    addpull: ((n:number, x?:number, y?:number, z?:number, str?: number) => void) &
        ((n: number, vec:{x:number, y:number, z:number}, ig1?: any, ig2?:any, str?: number ) => void),
    removeAllSprings: ((ai:N, n?: N) => void),
    removepull: (ai:N) => void,
    pullsToFix: (n?:N, restore?:boolean, mat?:THREE.Matrix4)=>{},
    finishFix: (n?:number) => void;
    settleHistory: VOID,
    setslot: (na: number, nb: number, len?: number, str?: number, pow? : number, type?: number) => boolean,
    clearTopology: (start?:N, end?:N) => void, getfix,
    setPARTICLES: (n:number, nn?:number) => number,
    dropslot: (n:number, nn:number) => void,
    clearall: VOID,
    getHISTLEN: () => number,
    setHISTLEN: (number) => void,
    getpos: (n?:N) => THREE.Vector3[],
    setpos: (p: (THREE.Vector3[] | Float32Array)) => void,
    setup: VOID,
    removefix,
    posNewvals,
    material,
    resettopology: VOID,
    running: string,
    topologyarr: Float32Array,
    setMAX_DEFS_PER_PARTICLE: (n:number) => void,
    addspring: (na: number, nb: number, len?: number, str?: number, pow? : number, type?: number) => boolean,
    addrod: (na: number, nb: number, min?: number, max?: number) => boolean,
    addspecial: (na: number, Z: number, x: number, y: number, z: number, w: number) => boolean,
    rodspeed: (na: number, v?: number | boolean, n?: number) => void,
    getrod: (na: number) => any[],
    pairsfor:(n: number, nn?:number, log?:boolean, showSpecial?:boolean) => any,
    setOverrides:(codeOverrides?: string, codePrepend?: string) => void,
    applyTransform: (opts?: {num?:number}) => void,
    newmat:() => void,
    SPEND: N,
    numInstances: N,
    numInstancesP2: N,
    NUMSPECIALS: N,
    onPostSpringStep: (fn: VOID) => void,
    postSpringStepFns: VOID[],
    isRunning: boolean,
    nonp2: boolean,
    contacts
}
declare let clamp, fininshExperiences, tad, tadkin;


declare let
    HW: {
        multiScenedummy,
        multiInstances,
        hornTrancodeForTranrule,
        nohorn,
        cubeEarly,
        getHornSet,
        setHornColours,
        dotty,
        setHornSet,
        updateHTMLRules,
        bigsceneSet,
        captureUniforms,
        resoverride,
        multiScene,
        radnums,
        randrulemarry,
        planeg, cancelcontext, setGenesFromTranrule, HornSet, alignskel
    },
    writetextremote, S, readTextureAsVec4,
    tadpoleSystem, guiFromGene, Gldebug, glsl, EX, fullscreen, deepCopy,
    ofirst, distxyz, distarr3, nircmd: (str: string)=>void, // fullscreen,
    // unused, lastrc,
    saveundo: VOID, randi:(l?:N, h?:N)=>N, throwe:(e:string)=>void, removeElement:<T>(arr:T[],ele:T)=>void,
    // autofillfun: VOID, clampAllGeneRanges: VOID, //why commented?
    tadsetexperiences: VOID, extrakeys: Dictionary<(()=>void) & ({fun:()=>void})>,
    random:(x?)=>any, forceCPUScale:VOID, readtext:(fid:string, quiet?:boolean)=>string, userlog: (msg:string) => void,
    // THREE,
    setExtraKey: (key:string, msg:string, fun: ()=>void) => void,
    setExtraKeyS: (key?:string, sound?:string, msg?:string, fun?: ()=>void) => any,
    UICom, nwfs, UIController,
    FrameSaver, frameSaver, geneGridColumns:VOID, geneids, // hornTrancodeForTranrule:(tr:string, genes?: any, norecurse?: boolean)=>any,
    Maestro, MaestroConstructor, ipad:boolean,
    findvalm, newframe, findval, makeName,
    showbaderror, NODO, nwwin, Shadows,Utils, CubeMap, oxcsynth,
    CSynth, fileTypeHandlers, GX,
    oMaestro,
    G, readWebGlFloat, readWebGlFloatDirect, readbinaryasync, readWebGlFloatAsync,
    NOVN, saveAs, hostname, Perftest,
    writeUrlImageRemote, onnextframe, FractEVO, $, funtry, clearPostCache,
    getWebGalByNum, appendtextremote, douows, runcommandphp, postCache, restoringInputState,
    springs: TSprings,
    ShadowP, COL, ctrlContextMenu, endCtrlContextMenu,
    nop, sleep, remote, deferuow,
    refall, loadStartTime, //process, require, //PJT: TS error, cannot redeclare block-scoped variable also declared in globals.d.ts
    startcommit, filterDOM,
    WALLID, currentHset, clearSelected,
    isWebGL2, getfiledata, onframe, badshader, saveInputToLocal, setNovrlights,
    establishObjpos, log, setGenesAndUniforms, copyFrom, clone,  filterGuiGenes, applyFilter, trysetele, tryseteleval,
    myinit, serious, gpuinfo, isANGLE, scaleGpuPrep, trgetele, refreshGal, killev, offx, showControls,
    reshowGenes, trygetele, getGal, setgenes, loadtarget, settarget, geneBounds, kinect, readJSON,
    savedef, stemLoad, webgallery, Touch2Init, countXglobals,
    Stats, olength, lru, getdamp, dodamp, xxxdispobj: (a?:any)=>Dispobj, forcerefresh, xxxhset,
    centrescale, msgfix, msgboxVisible, msgfixerror, msgfixerrorlog, FIRST, trygeteleval,
    saveSnap, cdispose, saveInputstate,
    sq, floor, addscript, saveInputState , FFT,
    offy, pickRenderTarget, FF,
    scaleDampTarget1, processFile, dat, startvr, xwin, registerInputs, format, remotesave, msgfixlog, mkdir, assert,
    setInput, inps, fft, searchValues, //Buffer, //PJT: TS error, cannot redeclare block-scoped variable also declared in globals.d.ts
    toggleFold, groupToggleFreeze,
    isControlShown, saveSkeleton,
    geneCallback, islocalhost, _boxsizew, windowset, dualmode, dualdrag, compareStruct,

    addElement, refts, aftercontrol, testnan, resoverride,
    docdrop, docdragover,
    msgupdate, jsyaml,
    getkey, getserveroao,
    copygenestoclip, pastecliptogenes, toggleFix, save, saven, resize, experiences, doexperience,randexperience,
    loadcurrent, updateGuiGenes, regenHornShader, ml, fadeOut, undo,
    brusselsNoAuto, qget, autostep, setInputg, msgtrack,
    getScreenSize, checkPixelRatio, interpretSearchString, localstartEarly,
    restoreFoldStates, localstartLate,
    _ininit, testDomOverride, toggleShare, fileChooser, openfiles, clipboard, docpaste, copyTextureToRenderTarget,

    EPSILON,
    healthMutateSettings,
    mininrow, maxinrow, testcputimes,
    rangeiprep,
    scaleSmoothGPU, getcentrescale, processNewframe,
    newframePending, updateggnn,
    reshowAllGuiGenes, performanceDisplay, scaleRenderTarget, scalePixelValues,
    setValuesFrom, evalIfPoss,

    geomgenes,
    trmat,
    renderObjJulia, renderObjTexture, renderObjImplicitShape,
    exeIfPoss,
    vivepick,
    savebig, getdesksave, quickscene, runkeys, runkeysQuiet, runkeysup, dockeydowninner,

    _, vrclick, vrnewpress, cMap, consoleTime, consoleTimeEnd,
    loadOao,
    gpuScaleNow, centrescalenow, VH,
    vrpresshold,
    //NW_SC, master, toggleSCLog, reloadAllSynths, startSC, setMasterVolume
    destroyObjInArr, randrules, autofillfun, geneBaseBounds,
    loadOag, pick, preloaded,
    CSynthFast, pickGPU,
    Background, Water, substituteShadercode, scale,
    lasttouchtime, touchlog, interacted, hoverMutate, stepeleval, isNode, test2,
    kinectJupDyn, restoreExtra, showScaleVariants, healthTarget, updateMat,
    basescale:number, nomess, geneOverrides, getstats, loadTime, savedMaterials, makeDraggable, toggleDraggable,
    isFirefox, Holo, CLeap,
    mirrorProperty: (toobj: object, toproperty: string, fromobj: object, fromproperty: string)=>void,
    everyframe, guifilter, filterDOMEv, seed, Plane,
    numInstances, numInstancesP2, Springs, readdir, fileExists, fileExistsAsync, posturiasync, fileDelete, getcurrentdir, getFileExtension, march2021,
    arraydiff: (a: any[], b: any[]) => any[],
    checkTranruleAll, safeFunction, setlight,
    fileOpenWrite, fileAppend, fileClose, fileOpenRead, fileRead, dateToFilename, cheatxr,

    vrresting: (()=>void) & { bypassResting?, angMult?, linMult?, dampToSleep?, dampToWake?, damped?, wakeThresh?, sleepThresh?, msg?,
        xrotsecs?, yrotsecs?, pistexrotsecs?, pisteyrotsecs?, mutatespeed?, extrawait?, fov?, lookup?
        },
    OrganicSpeech: {isRunning: boolean, replace},
    U: {[key:string] : any}, // U.xxx gives read/write access to uniforms.xxx.value
    _R, RG, RU, Rtadkin, RGXX,
    randvec3:(p?:N) => THREE.Vector3, randrange: (v:(N | [N] | [N,N]), v2?:N) => N,
    shaderFromFiles,
    randfrom: <T>(x: (Dictionary<T> | T[])) => T

    //OM /** OM contains lots of variables in an out-of-the-way namespace */
;

// declare some of our types
declare let
    inputs: {[name:string]: any},
    currentObjects: {[name: string]: Dispobj},
    newmain: (n?:number)=>void,
    resolveFilter: (x?:[string])=> Genes;

interface String {
    replaceall(from: string, to:string): string;
    pre(from: string): string;
    post(from: string): string;
}

// added for horn.ts
var showvals, nextpow2, onpostframe, minimizeSkelbuffer, xxxgenes:(x?:any)=>Genes, incgene, geneonkeydown, floatstring,
dstring, yamlSave, cloneNoCircle, substituteExpressions, xxxvn
;
//should make maestro TS //(also this is undefined at this point)
//const MEvents = MaestroConstructor; //would probably rather import EventEmitter for many things...
//const MEvents = () => new MaestroConstructor(); //this code is never evaluated, only effects compiler

// extend some 'standard' types with out of date details
// interface Navigator { getVRDisplays } // now standard
// not needed with es6 interface Math { sign, log2, log10 }
