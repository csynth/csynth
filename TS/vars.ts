// declare things
type VOID = ()=>void;
type N = number; //PJT: was getting errors/warnings on addpull
interface Dictionary<T> { [Key: string]: T; }

declare type TSprings = {
    stop: VOID,
    start: VOID,
    step: (n?:number) => void,
    setfix: ((n:number, x:number, y:number, z:number) => void) & ((n: number, vec:{x:number, y:number, z:number} ) => void),
    addpull: (ai:N, x:N,y:N,z:N,force?:N) => void,
    removepull: (ai:N) => void,
    finishFix: VOID;
    settleHistory: VOID,
    setslot: (na: number, nb: number, len?: number, str?: number, pow? : number, type?: number) => boolean,
    clearTopology: VOID, getfix,
    setPARTICLES: (n:number, nn?:number) => number,
    dropslot: (n:number, nn:number) => void,
    clearall: VOID,
    getHISTLEN: () => number,
    setHISTLEN: (number) => void,
    removefix,
    posNewvals,
    material,
    resettopology: VOID,
    running: string,
    topologyarr: Float32Array,
    setMAX_DEFS_PER_PARTICLE: (n:number) => void,
    addspring: (na: number, nb: number, len?: number, str?: number, pow? : number, type?: number) => boolean,
    addrod: (na: number, nb: number, len?: number) => boolean,
    pairsfor:(n: number) => any,
    newmat:(opts: {codeOverrides?: string, codePrepend?: string, force?: string}) => void,
    SPEND: N,
    numInstances: N,
    numInstancesP2: N,
    onPostSpringStep: (fn: VOID) => void,
    postSpringStepFns: VOID[],
    contacts
}
declare let clamp, fininshExperiences, tad, S;


declare let
    tadpoleSystem, guiFromGene, Gldebug, glsl,
    ofirst, distxyz, distarr3, nircmd: (str: string)=>void, // fullscreen,
    // unused, lastrc,
    saveundo: VOID, randi:(l?:N, h?:N)=>N, throwe:(e:string)=>void, removeElement:<T>(arr:T[],ele:T)=>void,
    // autofillfun: VOID, clampAllGeneRanges: VOID, //why commented?
    tadsetexperiences: VOID, extrakeys: Dictionary<VOID>,
    random:(x?)=>any, forceCPUScale:VOID, readtext:(fid:string)=>string, userlog: (msg:string) => void,
    // THREE,
    setExtraKey: (key:string, msg:string, fun: ()=>void) => void,
    UICom, nwfs, UIController,
    FrameSaver, frameSaver, geneGridColumns:VOID, hornTrancodeForTranrule:(tr:string, genes?: any)=>any,
    Maestro, MaestroConstructor, ipad:boolean,
    radnums:N[], bigsceneSet: Dictionary<any>, multiInstances: (bss:any, num:N)=>void, findvalm, newframe, findval,
    showbaderror, colourTailor, NODO, nwwin, Shadows,Utils, CubeMap, oxcsynth,
    CSynth, fileTypeHandlers, planeg, GX,
    oMaestro, HornWrapFUN, dotty,
    G, readWebGlFloat,
    NOVN, saveAs, hostname, Perftest,
    writeUrlImageRemote, onnextframe, FractEVO, $, funtry, clearPostCache,
    getHornSet, setHornSet, getWebGalByNum, writetextremote, douows, runcommandphp, postCache, restoringInputState,
    springs: TSprings,
    ShadowP, COL,
    nop, sleep, remote, deferuow,
    refall, loadStartTime, //process, require, //PJT: TS error, cannot redeclare block-scoped variable also declared in globals.d.ts
    startcommit, setGenesFromTranrule, filterDOM,
    WALLID, currentHset,
    isWebGL2, getfiledata, onframe, badshader, saveInputToLocal, setNovrlights,
    establishObjpos, log, setGenesAndUniforms, copyFrom, clone,  filterGuiGenes, trysetele, tryseteleval,
    myinit, serious, gpuinfo, isANGLE, scaleGpuPrep, trgetele, refreshGal, killev, offx, showControls,
    reshowGenes, trygetele, getGal, setgenes, loadtarget, settarget, geneBounds, kinect,
    savedef, stemLoad, webgallery, Touch2Init, countXglobals,
    Stats, olength, lru, getdamp, dodamp, xxxdispobj, forcerefresh,
    centrescale, msgfix, msgboxVisible, msgfixerror, FIRST, trygeteleval, updateHTMLRules,
    saveSnap, multigeom, cdispose, saveInputstate,
    sq, floor, addscript, saveInputState , FFT,
    resoverride, offy, pickRenderTarget, setHornColours, FF,
    scaleDampTarget1, processFile, dat, startvr, xwin, registerInputs, format, remotesave, msgfixlog, mkdir, assert,
    setInput, fft, searchValues, //Buffer, //PJT: TS error, cannot redeclare block-scoped variable also declared in globals.d.ts
    toggleFold, groupToggleFreeze,
    isControlShown,
    geneCallback, islocalhost,

    addElement, refts, aftercontrol, testnan,
    docdrop, docdragover,
    msgupdate, jsyaml,
    cancelcontext,
    keyname, getserveroao,
    copygenestoclip, pastecliptogenes, toggleFix, save, saven, resize, experiences, doexperience,randexperience,
    loadcurrent, updateGuiGenes, regenHornShader, ml, fadeOut, undo,
    brusselsNoAuto, qget, autostep, setInputg, msgtrack,
    getScreenSize, checkPixelRatio, interpretSearchString, localstartEarly,
    restoreFoldStates, prepautomode, localstartLate,
    _ininit, testDomOverride, toggleShare, fileChooser, openfiles, clipboard, docpaste,

    EPSILON,
    healthMutateSettings,
    mininrow, maxinrow, testcputimes,
    rangeiprep,
    scaleSmoothGPU, getcentrescale, processNewframe,
    multiScene, newframePending, updateggnn,
    reshowAllGuiGenes, performanceDisplay, scaleRenderTarget, scalePixelValues,
    setValuesFrom, evalIfPoss,

    geomgenes,
    trmat,
    renderObjJulia, renderObjTexture, renderObjImplicitShape,
    exeIfPoss,
    vivepick,
    savebig, getdesksave, quickscene, canvkeydown, canvkeyup, dockeydowninner,

    _, vrclick, vrnewpress, cMap, consoleTime, consoleTimeEnd,
    loadOao,
    gpuScaleNow, centrescalenow, VH,
    vrpresshold,
    //NW_SC, master, toggleSCLog, reloadAllSynths, startSC, setMasterVolume
    destroyObjInArr, randrules, autofillfun, geneBaseBounds,
    loadOag, pick,
    CSynthFast, pickGPU,
    Background, Water, substituteShadercode, scale,
    lasttouchtime, touchlog, interacted, hoverMutate, editobj, stepeleval, isNode, test2, usewireframe,
    kinectJupDyn, restoreExtra, showScaleVariants, hornhighlight, healthTarget, updateMat,
    basescale:number, nomess, geneOverrides, getstats, loadTime, savedMaterials, makeDraggable, captureUniforms,
    isFirefox, Holo, CLeap,
    mirrorProperty: (toobj: object, toproperty: string, fromobj: object, fromproperty: string)=>void,
    everyframe, guifilter, filterDOMEv, seed, Plane,
    numInstances, numInstancesP2, Springs,

    vrresting: (()=>void) & { bypassResting?, angMult?, linMult?, dampToSleep?, dampToWake?, damped?, wakeThresh?, sleepThresh?, msg?,
    xrotsecs?, yrotsecs?, pistexrotsecs?, pisteyrotsecs?, mutatespeed?, extrawait?, fov?, lookup?
}

    //OM /** OM contains lots of variables in an out-of-the-way namespace */
;

// declare some of our types
declare let
    inputs: {[name:string]: any},
    HornWrap,xxxgenes: (any) => Geneset,
    currentObjects: {[name: string]: Dispobj},
    newmain: ()=>void,
    resolveFilter: (x?:[string])=> any;

//should make maestro TS //(also this is undefined at this point)
//const MEvents = MaestroConstructor; //would probably rather import EventEmitter for many things...
//const MEvents = () => new MaestroConstructor(); //this code is never evaluated, only effects compiler

// extend some 'standard' types with out of date details
// interface Navigator { getVRDisplays } // now standard
// not needed with es6 interface Math { sign, log2, log10 }
