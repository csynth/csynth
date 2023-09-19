// This loads data for Reidun --Lowry-- demonstration

// (edit of ima.js)

// It can be tailored by some search values:
// for quick or limited start (eg testing, )

// metres=1 to arrange units in metres (renderVR.scale=1)  now lowry always works that way
// lowry=1 to choose settings for lowry (implies metres=1) <<< ALWAYS ASSUMED
// leap=0 do not use leap
// startvr=0 do not do automatic start of vr
// warmup=0 do not do automatic warmup
//
// nohorn=true;  This should always be set, but cannot be defaulted here as it comes too late.
// Defualted as true for lowry.js as special case in interpretSearchString() in searchValues.js

// for hsv diagrams
// hsvstyle= for style to render HSV1
// hsvab= for alternative ab tiling
// hsvexclude= to exclude HSV12 chains KLMNO always exclude klmno)

// Line below gives access to relevant global javascript data without lint messages
const {
W, G, DNASprings, springdemo, CSynth, nomess, V, msgfix, onframe, resetMat, GX, dat,
VH, width, height, springs, THREE, Plane, runkeys, msgboxVisible, toKey, GLmolX, Maestro,
camera, VEC3, tmat4, setNovrlights, setInput, searchValues, viveAnim, log, col3, I, sleep, setBackgroundColor,
ambientOcclusionInit, copyFrom, onWindowResize, rrender, vtargetNow, everyframe, renderVR, CLeap, addtarget, S,
vrresting, EX, location, rotcentre, fxaa
} = window;

var ima = W.ima = {};  // permit ima. namespace
searchValues.lowry = false;
searchValues.metres = true;
searchValues.one = false;
searchValues.hsvab = true;
if (searchValues.leap === undefined) searchValues.leap = false;
if (searchValues.startvr === undefined) searchValues.startvr = true;
if (searchValues.warmup === undefined) searchValues.warmup = true;
window.startvr = searchValues.startvr;


// springdemo is the main configuration
// see https://docs.google.com/document/d/13Z8-SL9d2mDIjpoA3T59vdrogJDKKVoXqFJBu15Mbn0/edit#heading=h.c4bhp1kgvfh2
// for details on files supported, including configuration files
//
// notes on sources
// https://www.uniprot.org/uniprot/P03610
// https://www.ebi.ac.uk/pdbe/entry/pdb/5TC1
// https://www.rcsb.org/structure/5TC1
// https://www.ebi.ac.uk/pdbe/entry/emdb/EMD-8397
// ftp://ftp.ebi.ac.uk/pub/databases/emdb/structures/EMD-8397/map/emd_8397.map.gz
// also see emd-8397.xml for metadata on the map
// details on map format http://www.ccp4.ac.uk/html/maplib.html

ima.demo = {
    contacts: [{filename: 'triva.contacts', shortname: 'IF'}],
    colorScheme: [['A', 0x3030ff], ['B', 'green'], ['C', 'red']],
    baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
    extraPDB: [{
            filename: '1sva.pdb', shortname: 'SV40', comment: 'Emergent Human Pathogen Simian Virus\nalso called HSV',
            // has biomt
            //tiling: 'sv40lines.wrl',
            //meshOrient: [0.493, -0.060, 0.060, 0, 0.083, 0.267, -0.415, 0, 0.018, 0.419, 0.273, 0, 0,0,0,1],
            tiling: [
                //{x: -21.346915896865433, y: 66.20536056832843, z: -71.8412097177503},
                //{x: -30.389703179036854, y: 81.55027525755085, z: -49.25462969211857},
                //{x: -46.93720120719336, y: 65.19653366135283, z: -59.55091217923984}
                {a: 0.45451063262124236, b: -0.1735073261813263, size: 99.99},
                {a: 0, b: 0, size: 100},
                {a: 0.07608244680159279, b: -0.6415763702842711, size: 100}
            ],

            scale: 0.5,
            orient: [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1],
            baseRadius: 0.5, multiplierRadius: 1, ssNarrowRad: 1, ssBroadRad: 1, ssSheetBroadRad: 2, ssArrowSize: 1
            // XmeshOrient was my original interactively captured one
            // meshOrient assumes automatic centre: has opposite translate to allow for origin reflection
            // XmeshOrient: [0.493, -0.060, 0.060, 0, 0.083, 0.267, -0.415, 0, 0.018, 0.419, 0.273, 0, 24.6, -13.1, -24.7, 1],
        },  // SV40

        {
            filename: '6cgr.pdb', shortname: 'HSV1',
            // NO biomt, but hardcoded below
            style: searchValues.hsvstyle || 'smooth',
            colorBy: 'chain', colDistNear: 490, colDistFar: 611, // opacity: 0.5, transparent: true,
            comment: 'Herpes Simplex Virus\nlike Basilisk, fig 3b',
            //tiling: 'icos14.polys',  // herpes
            tiling: !searchValues.hsvab ? 'GeodesicIcosahedron25.polys' :      // pre Aug 19
            [ // post Aug 19, then replaced by GeodesicIcosahedron25 again, this ab tiling is still wobbly
                {a: 1, b: 0, size: 99.60515674918517},  // pentagons yellow ... white
                {a: 0.5043645634880239, b: 0, size: 99.20374665156196},  // hex 1   green/gold ...red
                {a: 0.2657419602284653, b: -0.733306819738863, size: 99.0790533995604}, // hex 2 green/yellow ... green
                {a: 0, b: 0,size: 99.0760686442865},  // hex3 ... blue
                {a: 0.7821769488688209, b: -0.21782305113117853, size: 99.92576073766486},  // tri 1 ...4 cyan; white, 2 red
                {a: 0.5272617433956593, b: 0.47273825529490177, size: 99.9068905073811},  // tri 2 ...5 purple;, green, 2 red
                {a: 0.2566082373396572, b: -0.23737687807156496, size: 99.89979459735572},  // tri 3a ...6 yellow; red, green, blue
                {a: 0.25660824082065414, b: 0.2373768742057317, size: 99.8997947071859},  // tri 3b ...7  dark orange; red, green, blue
                {a: 0, b: 0.4814983189272394, size: 99.8960463933496},  // tri 4 ...8 grey; blue, 2 green
                {a: 0, b: -0.9999999981691525, size: 99.89479045079642}  // tri 5 ... dark red; 3 green
            ],
            tilerad: 0.6,

            colorScheme: [
                ['4,A,B,C,D,E,F', 0xffff00],
                ['M,N,O,S,T,U,V,W,X', 0x0000ff],
                ['0,1,2,3,G,H,I,J,K,L,P,Q,R,Y,Z', 'green'],
                ['5,8,b,e,h', 'red'],
                ['6,7,9,a,c,d,f,g,i,j', 0x3030ff],
                ['k,l,m,n,o', 'black']
            ],
            excludeChains: searchValues.hsvExclude ? 'KLMNOklmno' : 'klmno',
            // excludeChains: 'KLMNOklmno',    // pre Aug 19, and corrected Sept; but interesting holes, use for Lowry?
            // excludeChains: 'klmno',         // pre Aug 19, and corrected Sept
            scale: 0.18,
            orient: [-0.588, 0.688, -0.425, 0, -0.809, -0.500, 0.309, 0, 0, 0.526, 0.851, 0, 0, 0, 0, 1],
            // meshOrient: [-0.807, -0.496, -0.310, 0, 0.303, -0.807, 0.501, 0, -0.501, 0.314, 0.807, 0, 0, 0, 0, 1],
            XmeshOrient: [-80.7, -49.6, -31.0, 0, 30.3, -80.7, 50.1, 0, -50.1, 31.4, 80.7, 0, 0, 0, 0, 1],
            Xorient: [0.348, 0.811, 0.280, 0, -0.597, 0.012, 0.708, 0, 0.616, -0.447, 0.527, 0, 0, 0, 0, 1]
        }, // herpes HSV1

        // {shortname: 'HSV1X', like: 'HSV1', tiling: 'GeodesicIcosahedron25.polys'},

        {
            filename: '1a6cX.pdb', shortname: 'TRSV',
            // has biomt
            comment: '*nfig 4c',
            // tiling: {a: 0.3758987414465172, b: 0.617193999288073, size: 100},
            tiling: {a: 0.382, b: 0.618, size: 100},  // refined 18 Sept 2023 to make ref point at average of vertices, nb a+b = 1
            scale: 0.8,
            colorBy: 'chaingroup',
            baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
            // meshOrient: [0.496, -0.311, 0.811, 0, 0.812, 0.495, -0.307, 0, -0.306, 0.811, 0.498, 0, 0, 0, 0, 1],
            orient: [-0.500, -0.309, -0.809, 0, -0.309, -0.809, 0.500, 0, -0.809, 0.500, 0.309, 0, 0, 0, 0, 1]
        }, // TRSV

        {
            shortname: 'TRSVX', like: 'TRSV',
            tiling: [ // {a: 0.3758987414465172, b: 0.617193999288073, size: 100},
                {a: 0.343, b: 0.451, size: 100},
                {a: 0.235, b: -0.309, size: 100},
                {a: 0.594, b: -0.119, size: 100}],
                // {a: 0.343, b: 0.451, size: 100},
                // {a: 0.244, b: -0.280, size: 100},
                // {a: 0.594, b: -0.119, size: 100}],
        }, // TRSVX

        {
            filename: '2ms2.pdb', shortname: 'MS2',
            // has biomt
            comment: 'Bacteriophage MS2, fig 4b',
            tiling: [{x:0.89402, y:0, z:1, size: 100}, {x:0, y:0, z:1, size: 100}], // a=0, b=0, rhomb  [0,0,1] [0.9, 0, 1]
            scale: 0.9,
            Xorient: [0.809017, 0.500000, 0.309017, 0, -0.30902, 0.809017, -0.50000, 0, -0.50000, 0.309017, 0.809017, 0, 0, 0, 0, 1], // for m2
            orient: [0.500, -0.309, 0.809, 0, 0.809, 0.500, -0.309, 0, -0.309, 0.809, 0.500, 0, 0, 0, 0, 1]
        },  // MS2

        {
            filename: '1f8v.pdb', shortname: 'PAV',
            // has biomt
            comment: '* fig 4a',
            // tiling: {a:0.257, b:0, size: 100},           // set by ?
            // tiling: {a: 0.160357, b: 0, size: 100},      // set by use of Planes.tri etc 17 Sept 2023
            tiling: {a: 0.313, b: 0, size: 100},             // set to make ab ref point (almost) coincide with centre 17 Sept 2023
            scale: 0.75,
            orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1]
        },  // PAV

        {
            filename: '1f8v.pdb', shortname: 'PAV\naffine extension',
            // has biomt
            comment: 'Pariacoto',
            spheres: 'pariacoto_full_export_563_*.pdb',
            // tiling: {a:0.257, b:0, size: 100},           // set by ?
            // tiling: {a: 0.160357, b: 0, size: 100},      // set by use of Planes.tri etc 17 Sept 2023
            tiling: {a: 0.313, b: 0, size: 100},            // set to make ab ref point (almost) coincide with centre 17 Sept 2023
            style: 'cartoon', colorBy: 'chain',             // opacity: 0.2, transparent: true,
            scale: 0.75,
            orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1],
            // meshOrient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 0,0,0,1]
            // scaled 0.75
            // meshOrient: [-0.594, -0.418, -0.188, 0, 0.295, -0.584, 0.367, 0, -0.351, 0.217, 0.626, 0, 0, 0, 0, 1]
            // refined
            // meshOrient: [-0.614, -0.372, -0.217, 0, 0.231, -0.604, 0.381, 0, -0.364, 0.246, 0.608, 0, 0, 0, 0, 1]
            // 3/5 computed
            spheresOrient: [0.310, 0.812, -0.502, 0, -0.503, -0.309, -0.810, 0, -0.811, 0.500, 0.307, 0, 0, 0, 0, 1]
        },  // PAV affine


        // {filename: '2qqp.pdb', shortname: '2qqp providence',
        //     orient: [-0.850, -0.357, 0.389, 0, 0.500, -0.309, 0.809, 0, -0.168, 0.882, 0.441, 0, 0, 0, 0, 1]},  // for providence

        // {filename: '1m4x.pdb', shortname: '1m4x PBCV-1',
        //     orient: [0.809, 0.500, 0.309, 0, -0.309, 0.809, -0.500, 0, -0.500, 0.309, 0.809, 0, 0, 0, 0, 1]},  //  PBCV-1

        // {filename: '1cwp.pdb', shortname: '1cwp CCMV',
        //     Xorient: [0.348, 0.811, 0.280, 0, -0.597, 0.012, 0.708, 0, 0.616, -0.447, 0.527, 0, 0, 0, 0, 1]} //  CCMV

        // {name: 'm2 extras', files: [
        //     'All_capsid_proteins.pdb',
        //     {filename: '1aq3_full.pdb', centre: true},
        //     '1aq3.pdb',
        //     '5tc1.pdb'
        // ]},
        // 'fromCCMV_most.pse.pdb'  // _full as exported, _most removes the extra 15 copies a chains A,B,C
    ]

};
if (searchValues.one) ima.demo.extraPDB = ima.demo.extraPDB.filter(f => f.shortname === searchValues.one);
springdemo(ima.demo);

// this will be called after everything set up,
// and can be reset after changes with alt-shift-S
W.customSettings = () => {
    CSynth.parseBioMart.setVisibility(false);  // << checking details: we have a code inconsistency here

    springs.stop();     // simulationsettings may already be not there
    W.renderMainObject = false;
    GX.setValue('simulationsettings/dynamicsrunning', false);
    GX.setValue('ribbon/visible', false);
    GX.setValue('matrix/visible', false);

    GX.removeItem('Modes');
    GX.removeItem('Simulationsettings');
    GX.removeItem('Ribbon');
    GX.removeItem('Matrix');
    GX.removeItem('Annotations');
    GX.removeItem('HistoryTrace');
    GX.removeItem('SphereParticles');
    GX.removeItem('View');

    V.fog.near = 1800;  // camera distance for outside, starts fogging a midpoint
    V.fog.far = V.fog.near+200;  // 400 is approx size, so fade right out just behind back

    V.flyy = true;  // full 3d flying
    fxaa.uselate = true;
    // vrresting.bypassResting = false;

    }

// this will be called once when everything set up, so can add to the gui
W.customLoadDone = () => {
    // CSynth.onUnique('viveGPInit_left', CSynth.attachModesToHand);   // in vr, start with atttached menu
    // set the main modelling parameters
    G.pushapartforce=1e-8;      // push all a bit out a little to get 'rounder' shape
    G.pushapartpow = -4;        // stronger locally
    G.pushapartlocalforce = 0;  // leave it to regular pushapart
    G.stepsPerStep = 4;         // for fast dynamics
    // 117.67903150944097 fixed point distance
    G.modelSphereRadius = 117;  // this tries to constrain all strand particles within this radius
    G.modelSphereForce = 1;
    G.powBaseDist = 100;        //
    G.springforce = 1;          // this forces close
    G.backboneforce = 0.2;
    G.backboneScale = 6;

    const cc = CSynth.current;
    const ccc0 = cc.contacts[0];
    // make sure backbone gets proper treatment; the York IF file is so sparse the backbone if often missing
    for (let i=1; i < cc.numInstances; i++)
        ccc0.setab(i, i-1, -999);
    ccc0.texture.needsUpdate = true;


    // section below calls the extra functions needed for the York extra contacts
    var dir = CSynth.current.fullDir
    // These lines load the fixed point file and the contacts file
    // CSynth.loadFixedPoints() accepts pdb files with or without the SL labels
    // CSynth.loadExtraContacts() uses format described in sample file
    //CSynth.loadFixedPoints(dir + 'CA_THR45_A.pdb');
    //CSynth.loadExtraContacts(dir + 'SL_list_v2.txt');
    //CSynth.loadExtraPDB(dir + 'All_capsid_proteins.pdb');


    // CSynth.randpos();   // start from a random position
    G.scaleFactor = 0.04 * (searchValues.metres ? 1: 100);  // this scale factor works well
    resetMat();         // set viewing transforms to standard
    onframe(ima.makegui, 10);
    if (searchValues.leap) onframe(ima.lowryLeapGui, 10);

    // CSynth.alignModels('csy');
    // GX.setValue('simulationsettings/autoalign', true);
    // CSynth.manyPlanes(false);

    onframe(CSynth.reset, 11);
    // onframe(()=>msgboxVisible(false), 1);  // defer needed to make first 'esc' key to work, todo find out why
    setTimeout(()=>msgboxVisible(false), 4000);
    CSynth.castExtra = () => ({hitdist: 'nocast'});  // prevent raycast, slightly expensive and odd with symmetry
    V.headlight = false;
    V.torchlight = false;
    //setNovrlights();
    //CSynth.setCamLightsFromGenes();
    // Maestro.on('preframe', () => CSynth.setCamLightsFromGenes())  // update every frame if
    // setInput(W.renderRatioUi, 0.5); // no makeing fuzzy


}

ima.selection = 'both';
ima.fadetime = 0;  // time for fade out/in

ima.shownum = 0;
/** ima.show called from gui */
ima.showg = async function(pn, selection) {
    if (pn !== undefined) {                 // called for (new) virus
        Maestro.trigger('selectvirus');
        CSynth.interrupt('showg');
    }
    ima.show(pn, selection);
}

/** show new extraPDB, or change selection type (capsid, tiling, ...) on current one */
ima.show = async function(pn, selection = ima.selection) {
    const shownum = ima.shownum++;      // not used but can help with debug
    ima.selection = selection;
    let n = pn;
    let cc = CSynth.current;
    if (typeof n === 'string')
        n = cc.numForName[n];

    if (n === undefined)    // called for selection change
        n = ima.showing;

    let nn = ima.demo.extraPDB.length;  // num to show
    let glmolList = cc.extraPDB.map(nnn => CSynth.xxxGlmol(nnn.shortname));
    let glmol = glmolList[n];
    const xx = cc.extraPDB[n];
    const shortname = xx.shortname;
    ima.currentShortname = shortname;
    if (searchValues.leap) {
        cc.extraPDB.forEach(s => CLeap.buttons[s.shortname].selected(s.shortname === shortname));
        ['both', 'capsid', 'tiling'].forEach(s => CLeap.buttons[s].selected(s === selection));
    }

    if (pn !== undefined) CSynth.msgtag(shortname + '_hover')

    await ima.warmup();  // after msgtag so end warmup message is seen


    // CSynth.xxxGlmol('1m4x').allgroup.scale.set(0.15, 0.15, 0.15);
    // we ned to make fade not happen when changing attribites rather than viruses,
    // and not to apply during seeded load
    if (ima.fadetime) for (let i = ima.fadetime; i >= 0; i -= 10) {
        V.l1.intensity = V.l1.saveIntensity * (i/ima.fadetime)**2;
        await sleep(10);
    }

    for (let i=0; i<nn; i++) {
        let l = glmolList[i];
        if (!l) continue;  // eg during load
        l.allgroup.visible = n === i;
        CSynth.optimizeVisible(l.allgroup);
    }

    // colors ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    GLmolX.setColors();  // default till overridden
    const cs = xx.colorScheme || cc.colorScheme;
    if (cs) {
        const col = new THREE.Color();
        cs.forEach( ([chains, pcol]) => {
            const hcol = col.set(pcol).getHex();
            chains.split(',').forEach(chain => GLmolX.colors[chain] = hcol);
        } )
    }
    const colorBy = xx.colorBy || 'chain';
    const style = xx.style || 'cartoon';
    const pref = xx.shortname + '/' + style + '/';
    const pref2 = pref + 'geometryoptions/';
    for (let prop in cc) { // set as much as possible from global
        if (prop !== 'colorBy') GX.setValue(pref + prop, cc[prop], false);
        if (prop !== 'colorBy') GX.setValue(pref2 + prop, cc[prop], false);
    }
    for (let prop in xx) { // set as much as possible, lots will fail
        if (prop !== 'colorBy') GX.setValue(pref + prop, xx[prop], false);
        if (prop !== 'colorBy') GX.setValue(pref2 + prop, xx[prop], false);
    }
    GX.setValue(pref + 'colorBy', colorBy);


    // make sure we have correct reference matrix
    if (glmol.allgroup.matrixAutoUpdate)
        glmol.allgroup.updateMatrix();
    glmol.allgroup.matrixAutoUpdate = false;

    // apply orientation/scale, if any, before rendering in case of incremental render
    const o = xx.orient;
    if (o)
        glmol.allgroup.matrix.fromArray(o);
    else
        glmol.allgroup.matrix.identity();

    if (xx.scale) {
        glmol.allgroup.matrix.multiplyScalar(xx.scale);
        glmol.allgroup.matrix.elements[15] = 1;
    }


    // rendering ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if (!glmol.symgroup) {
        if (xx.style === 'smooth') {
            glmol.smoothMesh.visible = true;
            GX.setValue(glmol.id + '/smooth/res', 100);
            CSynth.xxxGlmol(glmol.id).redrawSmooth()
            CSynth.applyBiomt(glmolList[n], glmol.smoothMesh);     // and complete for all BIOMT
            glmol.smoothMesh.visible = false;
        } else if (xx.style === 'wire') {
            glmol.wiregroup.visible = true;  // draw cartoon of single part
            CSynth.applyBiomt(glmolList[n], glmol.wiregroup);     // and complete for all BIOMT
            glmol.wiregroup.visible = false; // but do not display the underlying cartoon now it is used
        } else {
            glmol.cartoonGroup.visible = true;  // draw cartoon of single part
            glmol.symgroup = 999;   // make sure we dont get repeated async calls
            await glmol.redrawCartoon();           // make sure all completed synchronously
            CSynth.applyBiomt(glmolList[n], glmol.cartoonGroup);     // and complete for all BIOMT
            glmol.cartoonGroup.visible = false; // but do not display the underlying cartoon now it is used
        }
    }


    glmol.allgroup.visible = selection !== 'tiling';
    CSynth.optimizeVisible(glmol.allgroup);

    // gui
    // needs to come before tiling/spheres otherwise the imaspherering colours don't initialize
    let opt = 99;  // will clear all
    if (shortname.includes('affine')) opt = 0;
    if (shortname === 'MS2') opt = 1;
    ima.opt(opt);

    // apply tiling if any, and hide previous tiling if any
    const oldxx = cc.extraPDB[ima.showing];
    const oldtiling = oldxx && (oldxx.tiling);
    if (oldtiling && oldxx.tilemesh) {
        oldxx.tilemesh.visible = false;
        CSynth.optimizeVisible(oldxx.tiling);
    }
    const oldspheres = oldxx && (oldxx.spheres);
    if (oldspheres && CSynth.polySpheres[oldspheres]) {
        CSynth.polySpheres[oldspheres].visible = false;
        CSynth.optimizeVisible(CSynth.polySpheres[oldspheres]);
    }

    const tiling = xx.tiling;
    if (tiling) {
        let mesh = xx.tilemesh;
        if (!mesh) {
            // xx passes more than needed, but may include tilerad or ???
            mesh = xx.tilemesh = glmol.tilemesh = CSynth.tiles(shortname, tiling, undefined, undefined, xx);
            if (!mesh.isMesh) {
                xx.tileplanes = glmol.tileplanes = mesh.children[0];
                xx.tileedges = glmol.tileedges = mesh.children[1];
            }
        }
        mesh.visible = true;
        const mesho = xx.meshOrient;
        if (mesho) {
            mesh.matrix.elements.set(mesho);
            mesh.matrixAutoUpdate = false;
        }
        mesh.visible = selection !== 'capsid'
        if (xx.tileplanes) {
            xx.tileplanes.visible = true; // selection === 'tiling';
            const mm = xx.tileplanes.material;
            mm.transparent = true;
            mm.depthWrite = false;
            mm.opacity = selection === 'tiling' ? 0.3 : 0.04;
            mm.metalness = 0.6;
            mm.roughness = 0.45;
        }
        CSynth.optimizeVisible(mesh);
    }

    const spheres = xx.spheres
    if (spheres) {
        // always turn all the spheres on initially ... and that will ensure correct gui colors
        let spheregroup = CSynth.polySpheres[spheres];
        if (!spheregroup) {
            xx.numSpheres = await CSynth.spheres(xx.spheres);
            spheregroup = CSynth.polySpheres[spheres];
        }
        if (xx.numSpheres) for (let i=1; i<=xx.numSpheres; i++) ima.spherering(i, true);
        spheregroup.visible = true;
        const sphereso = xx.spheresOrient;
        if (sphereso) {
            spheregroup.matrix.elements.set(sphereso);
            spheregroup.matrixAutoUpdate = false;
            if (xx.scale) {
                spheregroup.matrix.multiplyScalar(xx.scale);
                spheregroup.matrix.elements[15] = 1;
            }
        }
        CSynth.optimizeVisible(spheregroup);
    }

    if (!searchValues.lowry) {
        if (shortname === 'MS2' && !ima.HamMesh) ima.makeh();
        ima.hamilton(undefined, shortname === 'MS2');
    }

    ima.showing = n;
    ima.selection = selection;


    ima.showing = n;
    ima.selection = selection;

    // below for testing
    msgfix('chains', () => CSynth.xxxGlmol(ima.showing).chains.length)
    msgfix('graphcount', () => {n=0; V.camscene.traverse(x => n++); return n})

    if (ima.fadetime) for (let i = 0; i <= ima.fadetime; i += 10) {
        V.l1.intensity = V.l1.saveIntensity * (i/ima.fadetime)**2;
        await sleep(10);
    }

}

ima.makegui = function() {
    let nn = ima.demo.extraPDB.length;  // num to show
    let cc = CSynth.current;
    let list = cc.extraPDB.map(nnn => CSynth.xxxGlmol(nnn.shortname));
    GX.removeItem('IMA');
    let imagui = ima.gui = dat.GUIVR.createX("IMA").name('Viral Geometry Explorer');
    if (searchValues.leap) {
        // imagui.oldaddImageButtonPanel2 = imagui.addImageButtonPanel;
        // imagui.addImageButtonPanel = (...p) => {
        //     const panel = imagui.oldaddImageButtonPanel2(...p);
        //     window.CLeap.menuPanel.addImageButtonPanel(...p);
        //     return panel;
        // }
    }

    Maestro.on('preframe', ima.gui.open);  // prevent closing the gui
    const bb = [3];
    for (let i=0; i<nn; i++) {
        let l = list[i];
        const xx = cc.extraPDB[i];
        const sep = '\n    ';
        let tip = xx.shortname + sep + '-----';
        xx.comment = CSynth._msgs[xx.shortname + '_hover']
        if (xx.comment) tip += sep + xx.comment;
        let image = `${CSynth.current.fullDir}/lowryIcons/${xx.shortname}_w.png`;
        bb.push( { func: () => ima.showg(i), tip, text: xx.shortname, image: image } );
    }
    // // experiment to use png in menu, not too helpful
    // bb[1].image = "CSynth/data/YorkStudents/images/2ms2.png";
    // delete bb[1].text;
    // bb[2].image = "CSynth/data/YorkStudents/images/1sva.png";
    // delete bb[2].text;
    ima.VirusButtons = imagui.addImageButtonPanel(...bb).setRowHeight(0.15).highlightLastPressed();
    ima.VirusButtons.definition = bb;

    ima.optbuttons = [];
    ima.SelectionButtons = imagui.addImageButtonPanel(3,
        {text: 'both', func: () => { ima.selection = 'both'; ima.showg(); }},
        {text: 'capsid', func: () => { ima.selection = 'capsid'; ima.showg(); }},
        {text: 'tiling', func: () => { ima.selection = 'tiling'; ima.showg(); }}
    ).setRowHeight(0.15).highlightLastPressed();

    const bx = [];
    for (let i=1; i<=11; i++) {
        if (i === 10) i = 11;
        bx.push({text: ''+i, func: () => ima.spherering(i), tip: 'row ' + i});
    }

    if (!searchValues.lowry) {
        ima.SphereButtons = ima.optbuttons[0] = imagui.addImageButtonPanel(10, ...bx).setRowHeight(0.15);

        ima.HamiltonButtons = ima.optbuttons[1] = imagui.addImageButtonPanel(2,
            {text: 'RNA\npolyhedron', func: () => ima.hamilton(0), tip: 'show the graph\nof potential connections'},
            {text: 'RNA\nHamiltonian path', func: () => ima.hamilton(1), tip: 'show sample\nHamiltonian path'}
        ).setRowHeight(0.15).highlightLastPressed();
    }

    CSynth.rotPosGui(imagui);

    // separate and position the gui
    VH.positionGUI();
    // V.gui.position.y -= 0.8;
    // V.gui.position.x += 0.1; // so mainly hidden but we can find for debug
    V.gui.position.set(-1.7, 0.8, 0.1);  // handy at left
    V.gui.updateMatrix()
    V.gui.close();
    imagui.detach();
    const u = undefined; VH.positionGUI(u,u,u,imagui);

    CSynth.modesToHand = true;
    V.modesgui = imagui;

    if (searchValues.leap) ima.initLeapMenu();

}

// make the menu skeleton early so it can be added to easily
// ima.initLeapMenu = function() {
//     if (!CLeap.textureLoader) CLeap.startLeap();
//     const menu = CLeap.menuPanel = new THREE.Group();
//     //V.nocamscene.add(menu);

//     CLeap.textureLoader.setPath(CSynth.current.fullDir + 'lowryIcons/');
//     menu.userData.planes = [];
//     menu.bottom = 0;
//     const add = menu.addImageButtonPanel = function add(panelSpec, ...buttonSpecs) {
//         if (typeof panelSpec === 'object') {
//             buttonSpecs.splice(0,0,panelSpec);
//             panelSpec = buttonSpecs.length;
//         }
//         const panel = CLeap.makePanel({panelSpec, buttonSpecs});
//         menu.bottom -= panel.userData.height;
//         panel.position.y = menu.bottom;  // -CLeap.pdbPanel.userData.height;
//         menu.add(panel);
//         const w = menu.userData.width;
//         if (w === undefined || w < panel.userData.width) menu.userData.width = panel.userData.width;
//         menu.userData.planes.push(...panel.userData.planes);
//         return panel;
//     }
//     ima.VirusButtons.definition[0] = 5;
//     //-- ugly --
//     ima.VirusButtons.definition.forEach((x,i) => {
//         if (i) {
//             const j = x.image.lastIndexOf('/');
//             x.image = x.image.substr(j+1).replace('_w.', '.');
//         }
//     });

//     ima.leapvirus = add(...ima.VirusButtons.definition);

//     ima.leapview = add(
//         {text: 'both',   func: () => ima.showg(undefined, 'both'),   image: 'both.png'},
//         {text: 'capsid', func: () => ima.showg(undefined, 'capsid'), image: 'capsid.png'},
//         {text: 'tiling', func: () => ima.showg(undefined, 'tiling'), image: 'tiling.png'},
//         undefined, //empty space here, but experimentatal 'xExpand: -0.5' on next line fills half of it...
//         {text: 'inside\noutside',  func: CSynth.posToggle, tip: "toggle inside or outside view", key: 'inout', image: 'inout.png', xExpand: -0.5}


//         /***,

//         {text: 'small',     func: ()=>{
//             addtarget({t, objsize: [CSynth, 'objsize', -1]});
//             addtarget({t, campos: [CSynth, 'camdist', 2.5  ]});
//         }, tip: "small object", image: 'small.png'},
//         {text: 'medium',    func: ()=>addtarget({t, objsize: [CSynth, 'objsize',  0]}), tip: "medium object", image: 'medium.png'},
//         {text: 'large',     func: ()=>addtarget({t, objsize: [CSynth, 'objsize',  1]}), tip: "large object", image: 'large.png'}
//         ***/
//     );

//     const t = CSynth.cameraToDist.time;
//     // addtarget version got changes out of sync so menu juddered as this worked
//     //     {text: 'near',           func: ()=>addtarget({t, campos: [CSynth, 'camdist', 1.25 ]}), tip: 'go to just outside'},  // renderVR.scale
//     // S,ramp keeps menu stable as it moves with camera
//     const o = {scurve: true};
//     // add(
//     //     {text: 'inside\nback',   func: ()=>S.ramp(CSynth, 'camdist', -0.65, t, o), tip: "go to inside\nnear back 'wall'"},
//     //     {text: 'inside\ncentre', func: ()=>S.ramp(CSynth, 'camdist', 0    , t, o), tip: 'go to centre inside'},
//     //     {text: 'near',           func: ()=>S.ramp(CSynth, 'camdist', 1.25 , t, o), tip: 'go to just outside'},  // renderVR.scale
//     //     {text: 'outside',        func: ()=>S.ramp(CSynth, 'camdist', 2.5  , t, o), tip: 'go to outside view'}
//     // );

//     add(
//         {
//             text: 'construction',     func: async ()=>{let r = await CSynth.construction1(); return r;}, image: 'symSequence.png',
//             tip: "script showing contsruction of capsid\nw.i.p. how to interrupt it", key: 'construct'
//         },
//         {
//             text: 'interactive\nsymmetry',     func: CSynth.intersweep.start, key: 'isweep', image: 'interactiveSym.png',
//             tip: "interactive contsruction of capsid"
//         },
//         // {text: 'silly\nsymmetry',     func: CSynth.testsweepMad,
//         //     tip: "quick construction by rotation about odd axes"},
//         undefined,

//         {text: 'reset', func: CSynth.reset, tip: 'reset virus and view', image: 'reset.png'},
//         {text: 'help',  func: CSynth.help, image: 'help.png'}
//     );

// }
// if (searchValues.leap) onframe(ima.initLeapMenu);

// finalize the menu and set up its dynamics
// //}

CSynth.customReset = async function() {
    ima.selection = 'both';
    await ima.show(0);
    ima.VirusButtons.guiChildren[ima.showing].interaction.events.emit('onPressed',{})
    ima.SelectionButtons.guiChildren[0].interaction.events.emit('onPressed',{})
}

// special chain colourings because of patched 6cgr to for chaingroups
GLmolX.chainColors = [];
for (let i = 0; i < 10; i++) {
    GLmolX.chainColors[i*2] = GLmolX.colors[i+1];
}

// set up simple lights (override standard ones)
ima.setCamLights = function imasetCamLights(one, ssize = CSynth.defaultShadowmapSize) {
    V.camscene.remove(V.lightGroup);
    V.lightGroup = new THREE.Group(); V.lightGroup.name = 'lightGroup';
    V.camscene.add(V.lightGroup);

    const l1 = V.l1 = new THREE.PointLight()
    V.lightGroup.add(l1);
    l1.saveIntensity = l1.intensity = 0.9;
    l1.position.set( 1000, 1000, 1000)
    l1.castShadow = searchValues.useshadows;

    if (!one) {  // just one light, helps in debug
        const l2 = V.l2 = new THREE.PointLight()
        V.lightGroup.add(l2);
        l2.saveIntensity = l2.intensity = 0.35;
        l2.position.set( 0,0,120 * 4)
        l2.position.set( -1000, 0, 1000)
        l2.castShadow = searchValues.useshadows;

        //const light = new THREE.DirectionalLight( 0x808080 );
        //light.position.set( 1, 1, 1 ).normalize();
        //V.lightGroup.add( light );

        const lighta = new THREE.AmbientLight( 0xffffff, 0.01 );
        lighta.name = 'ambientlight';
        V.ambientlight = lighta;
        V.lightGroup.add(lighta);
    }
    CSynth.fogfix();
}
ima.setCamLights();


// make sure this frame does not get hidden, and lights are ok
ima.preframe = () => {
    if (CSynth.objsize === undefined) return;
    ima.showing = ima.showing || 0;
    const l = camera.position.length(); // in metres / G.scaleFactor;

    const objsize = 10 ** CSynth.objsize;

    // update lights according to where we are, avoid backlight
    let ld, ldo = l*2, ldi = objsize * 0.7; // light distance for outside and inside
    const outr = objsize * 1.20, inr = objsize * 0.80; // innner and outer radii
    if (l > outr) ld = ldo;
    else if (l < inr) ld = ldi;
    else ld = ldi + (l-inr) * (ldo-ldi) / (outr-inr);

    V.l1.position.normalize().multiplyScalar(ld);
    V.l2.position.normalize().multiplyScalar(ld);

    // mesh (for herpes) moves in as camera is in, out as camera is out
    const cc = CSynth.current;
    const xx = CSynth.current.extraPDB[ima.showing];
    if (xx.shortname.startsWith('HSV1')) {
        let d;                              // d is in units around 100, nominal radius for all viruses
        const dd = 2 * renderVR.scale/400;  // dist away when moving; ??? units
        if (l > outr + dd) d = W.outscale;
        else if (l < inr + dd) d = 80;
        else d = l - dd;

        if (typeof xx.tiling !== 'string') d /= 100;       // now set using points already at 100
        const tmesh = xx.tilemesh;
        if (tmesh) {
            tmesh.matrixAutoUpdate = false
            tmesh.matrix.makeScale(d,d,d);
        }
    }

    viveAnim('ima')     // make sure viveAnim works even outside VR
    if (searchValues.leap) {
        CLeap.buttons.inout.selected(CSynth.camdist < 1); // changes as we walk through surface or any other reason to change
        if (!renderVR.invr()) CLeap.updateGuiFromHead();  // so it displays nonvr
    }

    // // This will rotate while not interacting, but not resting either
    // // The rotation effect from inside is rather odd, so not used.
    // if (Date.now() > CLeap.lastClickTime + ima.randloopwait) {  //  not interacting ... a little like resting
    //     let k = W.framedelta * 2 * Math.PI / 1000;
    //     rotcentre(k / vrresting.xrotsecs, k / vrresting.yrotsecs, 0);
    // }


};  // ima.preframe
W.outscale = 97.5;
W.tilerad = 0.7;
Maestro.on('preframe', () => ima.preframe());  // extra function in case ima.preframe changed



CSynth.biomtMatrices['6cgr.pdb'] = [
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [0.30901699,0.95105652,-4e-8,0,-0.95105651,0.309017,-5e-8,0,-4e-8,5e-8,1,0,0,0,0,1],
    [-0.809017,0.58778525,-1e-7,0,-0.58778525,-0.80901699,-3e-8,0,-9e-8,3e-8,1,0,0,0,0,1],
    [-0.80901699,-0.58778525,-1e-7,0,0.58778525,-0.809017,4e-8,0,-9e-8,-3e-8,1,0,0,0,0,1],
    [0.309017,-0.95105652,-3e-8,0,0.95105651,0.30901699,5e-8,0,-4e-8,-5e-8,1,0,0,0,0,1],
    [-0.63819652,0.26286559,-0.72360685,0,0.26286558,-0.809017,-0.52573109,0,-0.72360686,-0.5257311,0.44721352,0,0,0,0,1],
    [0.05278648,-0.68819093,-0.72360681,0,0.68819093,-0.5,0.52573115,0,-0.72360682,-0.52573115,0.44721352,0,0,0,0,1],
    [0.67082042,-0.68819093,0.27639322,0,0.1624598,0.5,0.85065081,0,-0.72360679,-0.52573115,0.44721357,0,0,0,0,1],
    [0.36180339,0.26286559,0.89442718,0,-0.58778525,0.80901699,-3e-8,0,-0.72360681,-0.5257311,0.4472136,0,0,0,0,1],
    [-0.44721357,0.85065084,0.27639315,0,-0.52573107,0,-0.85065083,0,-0.72360685,-0.52573107,0.44721357,0,0,0,0,1],
    [-0.05278648,0.68819093,0.72360681,0,0.68819093,-0.5,0.52573115,0,0.72360682,0.52573115,-0.44721352,0,0,0,0,1],
    [0.63819652,-0.26286559,0.72360685,0,0.26286559,-0.80901699,-0.52573109,0,0.72360686,0.5257311,-0.44721352,0,0,0,0,1],
    [0.44721357,-0.85065084,-0.27639315,0,-0.52573106,0,-0.85065083,0,0.72360685,0.52573107,-0.44721357,0,0,0,0,1],
    [-0.36180339,-0.26286558,-0.89442718,0,-0.58778525,0.809017,-4e-8,0,0.72360681,0.5257311,-0.4472136,0,0,0,0,1],
    [-0.67082042,0.68819093,-0.27639321,0,0.16245981,0.5,0.85065081,0,0.72360679,0.52573115,-0.44721357,0,0,0,0,1],
    [-0.30901699,-0.95105652,4e-8,0,-0.95105651,0.30901699,-6e-8,0,4e-8,-5e-8,-1,0,0,0,0,1],
    [-1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1],
    [-0.30901699,0.95105652,3e-8,0,0.95105651,0.30901699,5e-8,0,4e-8,5e-8,-1,0,0,0,0,1],
    [0.80901699,0.58778525,1e-7,0,0.58778525,-0.80901699,3e-8,0,9e-8,3e-8,-1,0,0,0,0,1],
    [0.80901699,-0.58778526,1e-7,0,-0.58778525,-0.80901699,-3e-8,0,9e-8,-3e-8,-1,0,0,0,0,1],
    [-0.13819666,0.42532545,0.89442715,0,-0.95105651,-0.309017,-5e-8,0,0.27639317,-0.85065079,0.44721366,0,0,0,0,1],
    [-0.94721362,-0.1624598,0.27639312,0,-0.1624598,-0.5,-0.85065081,0,0.27639313,-0.85065083,0.44721363,0,0,0,0,1],
    [-0.44721357,-0.52573107,-0.72360684,0,0.85065083,0,-0.52573106,0,0.27639316,-0.85065084,0.44721358,0,0,0,0,1],
    [0.67082042,-0.1624598,-0.72360678,0,0.68819093,0.5,0.52573114,0,0.27639322,-0.85065082,0.44721358,0,0,0,0,1],
    [0.86180337,0.42532545,0.27639322,0,-0.42532545,0.30901699,0.85065078,0,0.27639323,-0.85065079,0.44721363,0,0,0,0,1],
    [-0.36180339,0.26286559,-0.89442718,0,0.58778525,0.80901699,3e-8,0,0.72360681,-0.5257311,-0.4472136,0,0,0,0,1],
    [0.44721357,0.85065084,-0.27639315,0,0.52573107,0,0.85065083,0,0.72360685,-0.52573107,-0.44721357,0,0,0,0,1],
    [0.63819652,0.26286558,0.72360685,0,-0.26286558,-0.809017,0.52573109,0,0.72360686,-0.5257311,-0.44721352,0,0,0,0,1],
    [-0.05278648,-0.68819093,0.72360682,0,-0.68819093,-0.5,-0.52573114,0,0.72360682,-0.52573115,-0.44721352,0,0,0,0,1],
    [-0.67082042,-0.68819093,-0.27639321,0,-0.1624598,0.5,-0.85065081,0,0.72360679,-0.52573115,-0.44721357,0,0,0,0,1],
    [-0.44721357,-0.85065084,0.27639316,0,0.52573106,0,0.85065083,0,-0.72360685,0.52573107,0.44721357,0,0,0,0,1],
    [0.36180339,-0.26286559,0.89442718,0,0.58778525,0.809017,3e-8,0,-0.72360681,0.5257311,0.4472136,0,0,0,0,1],
    [0.67082042,0.68819093,0.27639321,0,-0.16245981,0.5,-0.85065081,0,-0.72360679,0.52573115,0.44721357,0,0,0,0,1],
    [0.05278648,0.68819093,-0.72360682,0,-0.68819093,-0.5,-0.52573114,0,-0.72360682,0.52573115,0.44721352,0,0,0,0,1],
    [-0.63819652,-0.26286559,-0.72360685,0,-0.26286559,-0.80901699,0.5257311,0,-0.72360686,0.5257311,0.44721352,0,0,0,0,1],
    [0.94721362,0.1624598,-0.27639313,0,-0.1624598,-0.5,-0.85065081,0,-0.27639313,0.85065082,-0.44721363,0,0,0,0,1],
    [0.13819666,-0.42532545,-0.89442715,0,-0.95105651,-0.30901699,-5e-8,0,-0.27639317,0.85065079,-0.44721366,0,0,0,0,1],
    [-0.86180337,-0.42532545,-0.27639322,0,-0.42532545,0.309017,0.85065077,0,-0.27639323,0.85065079,-0.44721363,0,0,0,0,1],
    [-0.67082041,0.1624598,0.72360678,0,0.68819093,0.5,0.52573114,0,-0.27639322,0.85065083,-0.44721358,0,0,0,0,1],
    [0.44721357,0.52573107,0.72360684,0,0.85065083,0,-0.52573106,0,-0.27639316,0.85065084,-0.44721358,0,0,0,0,1],
    [-0.13819666,-0.95105652,0.27639317,0,0.42532545,-0.309017,-0.85065077,0,0.89442717,-5e-8,0.44721366,0,0,0,0,1],
    [0.36180339,-0.58778525,-0.7236068,0,0.26286559,0.80901699,-0.52573109,0,0.89442719,-3e-8,0.44721361,0,0,0,0,1],
    [0.36180339,0.58778525,-0.7236068,0,-0.26286558,0.80901699,0.52573109,0,0.89442719,3e-8,0.44721361,0,0,0,0,1],
    [-0.13819667,0.95105652,0.27639317,0,-0.42532544,-0.30901699,0.85065078,0,0.89442717,5e-8,0.44721366,0,0,0,0,1],
    [-0.44721369,0,0.89442714,0,0,-1,0,0,0.89442715,0,0.44721369,0,0,0,0,1],
    [-0.44721357,0.52573107,-0.72360684,0,-0.85065083,0,0.52573106,0,0.27639316,0.85065084,0.44721357,0,0,0,0,1],
    [-0.94721362,0.1624598,0.27639312,0,0.1624598,-0.5,0.85065081,0,0.27639313,0.85065082,0.44721362,0,0,0,0,1],
    [-0.13819666,-0.42532545,0.89442715,0,0.95105652,-0.30901699,6e-8,0,0.27639317,0.85065079,0.44721365,0,0,0,0,1],
    [0.86180337,-0.42532545,0.27639322,0,0.42532545,0.309017,-0.85065078,0,0.27639323,0.85065079,0.44721362,0,0,0,0,1],
    [0.67082041,0.1624598,-0.72360678,0,-0.68819093,0.5,-0.52573115,0,0.27639321,0.85065082,0.44721357,0,0,0,0,1],
    [0.94721363,-0.1624598,-0.27639312,0,0.1624598,-0.5,0.85065081,0,-0.27639313,-0.85065082,-0.44721362,0,0,0,0,1],
    [0.44721357,-0.52573107,0.72360684,0,-0.85065083,0,0.52573106,0,-0.27639316,-0.85065084,-0.44721357,0,0,0,0,1],
    [-0.67082042,-0.1624598,0.72360678,0,-0.68819093,0.5,-0.52573115,0,-0.27639322,-0.85065082,-0.44721357,0,0,0,0,1],
    [-0.86180337,0.42532545,-0.27639323,0,0.42532545,0.30901699,-0.85065078,0,-0.27639322,-0.85065079,-0.44721362,0,0,0,0,1],
    [0.13819666,0.42532545,-0.89442715,0,0.95105651,-0.309017,5e-8,0,-0.27639317,-0.85065079,-0.44721365,0,0,0,0,1],
    [-0.36180339,0.58778525,0.72360679,0,0.26286558,0.80901699,-0.5257311,0,-0.89442719,3e-8,-0.44721361,0,0,0,0,1],
    [0.13819666,0.95105652,-0.27639317,0,0.42532544,-0.30901699,-0.85065078,0,-0.89442717,5e-8,-0.44721366,0,0,0,0,1],
    [0.44721369,0,-0.89442714,0,0,-1,0,0,-0.89442715,0,-0.44721369,0,0,0,0,1],
    [0.13819666,-0.95105652,-0.27639316,0,-0.42532545,-0.30901699,0.85065078,0,-0.89442717,-5e-8,-0.44721366,0,0,0,0,1],
    [-0.36180339,-0.58778525,0.7236068,0,-0.26286559,0.80901699,0.52573109,0,-0.89442719,-3e-8,-0.44721361,0,0,0,0,1]]


// choose which set of ima.optbuttons to show, or none
ima.opt = function(n) {
    if (!ima.optbuttons) return; // eg during load
    ima.optbuttons.forEach( x => {
        x.visible = true;
        x.setRowHeight(-0.014);
    })
    const y = ima.optbuttons[n];
    if (y) y.setRowHeight(0.15);

    ima.gui.performLayout();

    ima.optbuttons.forEach( x=> {
        x.visible = false;
    });
    if (y) y.visible = true;
}

// set visibility of a ring
ima.spherering = function (n, visible) {
    let ng = n;  // gui number
    if (n >= 10 ) [n,ng] = [11,10]
    const nn = n === 10 ? 11 : n;
    if (visible === undefined)
        visible = !CSynth.polySpheres['pariacoto_full_export_563_' + n + '.pdb'].visible;
    CSynth.polySpheres['pariacoto_full_export_563_' + n + '.pdb'].visible = visible
    const guic = ima.SphereButtons && ima.SphereButtons.guiChildren[ng-1];
    if (guic)
        GX.color(guic, visible ? CSynth.sphereCol(n) : col3(0,0,0));
}


// make the graph and hamiltonian
ima.makeh = function() {
    const basepoint = VEC3({x: -2.00811927767349, y: -75.74295541321584, z: 76.96084824271517});
    const pp = VEC3(13.338, 113.972, 26.569).applyMatrix4(CSynth.xxxGlmol('MS2').allgroup.matrix);
    const nn = CSynth.symclose(basepoint, pp);
    const {htox, xtoh, mesh} = I.hamiltonian(nn);
    ima.HamMesh = ima.hams[1] = mesh;

    const nn5 = nn.clone().applyMatrix4(CSynth.sym60[30]);
    const nnx = nn.clone().applyMatrix4(CSynth.sym60[5]);
    const lines = [[nn, nn5, {color:col3(0,0,1)}], [nn, nnx, {color:col3(0.3,0.3, 1)}]];
    const meshp = CSynth.cylinderGeomForLines(lines, {name: 'mesh5', radius: 1, pgroup: CSynth.rawgroup, pgui: V.gui})
    ima.PentMesh = ima.hams[0] = CSynth.applySym(meshp);
    meshp.visible = false;
}
ima.hams = [];

ima.hamilton = function(n, visible) {
    if (n === undefined) {
        ima.hamilton(0, visible);
        ima.hamilton(1, visible);
        return;
    }
    const obj = ima.hams[n];
    if (!obj) return;
    if (visible === undefined) visible = !obj.visible;
    obj.visible = visible;
    let col = n === 0 ? col3(0,0,1) : col3(0.5,0.2,0);
    if (!visible) col = col3(0,0,0);

    if (ima.HamiltonButtons)
        GX.color(ima.HamiltonButtons.guiChildren[n], col);
}

// temp stuff for quick prep of images, 21/08/19
// onframe( () => extrakeys['Q,\\'] = () => V.modesgui.visible = V.gui.visible = !V.gui.visible, 100)
W.extrakeys['Q,\\'] = () => V.modesgui.visible = V.gui.visible = !V.gui.visible
ima.journalpics = () => {
    setInput(W.imageres, 1400)
    setInput(W.imageasp, 1320)
    setInput(W.previewAr, true);
    // setInput(W.renderRatioUi, 0.33);
    CSynth.setNovrlights(true);
    G._fov = 20;
    G._camz = 3000;
    V.fog.near = 3000;
    V.fog.far = 3040;
    camera.near = 1500;
}

ima.saoParms = {
    output: 0,
    saoBias: 0.5,
    saoBlur: true,
    saoBlurDepthCutoff: 0.01,
    saoBlurRadius: 16,
    saoBlurStdDev: 4,
    saoIntensity: 0.2, // 1, // 0.18,
    saoKernelRadius: 100,
    saoMinResolution: 0,
    saoScale: 1
}
if (rrender.effects) copyFrom(rrender.effects.saoPass.params, ima.saoParms)

everyframe(CSynth.fogfix);

if (searchValues.metres) {
    G.scaleFactor = G.scaleFactor/renderVR.scale;
    renderVR.scale = 1;
    CSynth.camnearmin = 0.1;
}

// do a warmup so all functions will run quickly during demo
ima.warmup = async function() {
    if (ima.warmup.done || !searchValues.warmup) return;
    ima.warmup.done = true;  // at start to prevent recursion with ima.show
    CSynth.msgtag('warmup')
    const xx = CSynth.current.extraPDB;
    for (let i = 0; i < xx.length; i++) {
        await ima.show(i);
        CSynth.msgtag('warmup')
        //await S.maestro('postframe');  // not sure why this isn't working
        await sleep(200);
    }
    await ima.show('SV40');
    CSynth.msgtag('warmup')
    await sleep(200);
    await CSynth.construction1({prepareonly: true, sweep: false});
    CSynth.reset();
    CSynth.msgtag('warmupdone');
    log('warmup complete');
}

ima.numrand = 0;
ima.randfunc = async function() {

    // if (ima.numrand++%6 === 0) return CSynth.posToggle();// extra inside, outside
	CSynth.camdist = 0;

    if (searchValues.leap) while (true) {
        const k = Object.keys(CLeap.buttons);
        const i = window.randi(k.length);
        const name = k[i];
        if (name === 'isweep' || name === 'construct' || name === 'help' || name === '') continue;
        const but = CLeap.buttons[name];
        const r = await but.sourceFunc()  // return await .... gave 'redundant' warning, but why ???
        return r;
    }
	CSynth.camdist = 0;
}

CLeap.lastClickTime = 0;
ima.randlooptime = 4000;
ima.randloopwait = 60000;
ima.randloop = async function() {

    //>> show leap menu
    while (true) {
        if (CSynth.running)
            CLeap.lastClickTime = Date.now();  // do not interrupt
        if (Date.now() > CLeap.lastClickTime + ima.randloopwait)
            await ima.randfunc()
        await sleep(ima.randlooptime)
    }
}
setTimeout(ima.randloop, 20000); // start randloop when everything properly started

// vrresting.bypassResting = false;
vrresting.xrotsecs = 93*3;  // number of seconds for complete x rotation when resting
vrresting.yrotsecs = 40*3;  // number of seconds for complete y rotation when resting


// resting
// resting works ok with randloop()
// needs vrresting.bypassResting = false (set true in default.js, we set false in customload and radloop )
// resting rotates, too fast?
if (searchValues.startvr && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) EX.startToFront();
CSynth.msgfix.show = true;  // show the CSynth messages in headset and on html
