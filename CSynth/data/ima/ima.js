// This loads data for Reidun IMA demonstration
// It can be tailored by some search values:
// for quick or limited start (eg testing, )
// one=  filters one (or none!) item based on shortname. eg one=SV40
// nosphere=1 to remove the sphere version of PAV
// metres=1 to arrange units in metres (renderVR.scale=1)
// lowry=1 to choose settings for lowry (implies metres=1)

// for hsv diagrams
// hsvstyle= for style to render HSV1
// hsvab= for alternative ab tiling
// hsvexclude= to exclude HSV12 chains KLMNO always exclude klmno)

// Line below gives access to relevant global javascript data without lint messages
const {
W, G, DNASprings, springdemo, CSynth, nomess, V, msgfix, onframe, resetMat, GX, dat,
VH, width, height, springs, THREE, Plane, runkeys, msgboxVisible, toKey, GLmolX, Maestro,
camera, VEC3, tmat4, setNovrlights, setInput, searchValues, viveAnim, log, col3, I, sleep, setBackgroundColor,
ambientOcclusionInit, copyFrom, onWindowResize, rrender, vtargetNow, everyframe, renderVR
} = window;

var ima = W.ima = {};  // permit ima. namespace
if (searchValues.lowry) {
    searchValues.metres = true;
    searchValues.nosphere = true;
    searchValues.one = false;
}
searchValues.hsvab = true;


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
    extraPDB: [
        {
            filename: '1sva.pdb', shortname: 'SV40', comment: 'Emergent Human Pathogen Simian Virus\nalso called HSV',
            // has biomt
            //tiling: 'sv40lines.wrl',
            //meshOrient: [0.493, -0.060, 0.060, 0, 0.083, 0.267, -0.415, 0, 0.018, 0.419, 0.273, 0, 0,0,0,1],
            tiling: [
                //{x: -21.346915896865433, y: 66.20536056832843, z: -71.8412097177503},
                //{x: -30.389703179036854, y: 81.55027525755085, z: -49.25462969211857},
                //{x: -46.93720120719336, y: 65.19653366135283, z: -59.55091217923984}
                {a: 0.45451063262124236, b: -0.1735073261813263, size: 100},
                {a: 0, b: 0, size: 100},
                {a: 0.07608244680159279, b: -0.6415763702842711, size: 100}
            ],

            scale: 0.5,
            orient: [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1]
            // XmeshOrient was my original interactively captured one
            // meshOrient assumes automatic centre: has opposite translate to allow for origin reflection
            // XmeshOrient: [0.493, -0.060, 0.060, 0, 0.083, 0.267, -0.415, 0, 0.018, 0.419, 0.273, 0, 24.6, -13.1, -24.7, 1],
        },  // SV40

        {
            filename: '6cgr_short.pdb', shortname: 'HSV1',
            // NO biomt, but hardcoded below
            style: searchValues.hsvstyle || 'smooth',
            colorBy: 'chain', colDistNear: 490, colDistFar: 611, // opacity: 0.5, transparent: true,
            comment: 'Herpes Simplex Virus\nlike Basilisk, fig 3b',
            //tiling: 'icos14.polys',  // herpes
            tiling: !searchValues.hsvab ? 'GeodesicIcosahedron25.polys' :      // pre Aug 19
            [ // post Aug 19, then replaced by GeodesicIcosahedron25 again, this ab tiling is still wobbly
                {a: 1, b: 0, size: 99.60515674918517},  // pentagons yellow
                {a: 0.5043645634880239, b: 0, size: 99.20374665156196},  // hex 1   green/gold
                {a: 0.2657419602284653, b: -0.733306819738863, size: 99.0790533995604}, // hex 2 green/yello
                {a: 0, b: 0,size: 99.0760686442865},  // hex3
                {a: 0.7821769488688209, b: -0.21782305113117853, size: 99.92576073766486},  // tri 1
                {a: 0.5272617433956593, b: 0.47273825529490177, size: 99.9068905073811},  // tri 2
                {a: 0.2566082373396572, b: -0.23737687807156496, size: 99.89979459735572},  // tri 3a
                {a: 0.25660824082065414, b: 0.2373768742057317, size: 99.8997947071859},  // tri 3b
                {a: 0, b: 0.4814983189272394, size: 99.8960463933496},  // tri 4
                {a: 0, b: -0.9999999981691525, size: 99.89479045079642}  // tri 5
            ],

                /** *
            tilexyz = [
                {x: 0, y: 0.041387, z: 99.076060, col: col3(1,0,0)},
                {x: 18.069422, y: 0, z: 98.248237, col: col3(1,1,0)},
                {x: 35.644668, y: 0, z: 93.318952, col: col3(1,0,1)},
                {x: 51.482570, y: -0.02770, z: 84.653429, col: col3(1,1,0)},
                {x: 16.905123, y: 30.507842, z: 93.620912, col: col3(0,1,0)},
                {x: 0, y: 29.522209, z: 94.709147, col: col3(0,0,1)},
                {x: 0, y: 52.365530, z: 84.729207, col: col3(0,1,0)},
                {x: 0, y: 62.910551, z: 77.636462, col: col3(1,0.5,0.5)},
                {x: 8.910442, y: -15.58544, z: 98.273430, col: col3(0.5, 1,0.5)},
                {x: 39.281307, y: 45.369579, z: 79.865820, col: col3(0.5, 0.5, 1)}
            ]

            tileab = [  // capture from xyz
                0: {a: 0.0006759006433281524, b: -8.716162320352347e-16, size: 99.0760686442865}
                1: {a: 2.364185132665976e-16, b: 0.4814983189272394, size: 99.8960463933496}
                2: {a: 1.8308488312054998e-9, b: -0.9999999981691525, size: 99.89479045079642}
                3: {a: 0.2657419602284653, b: -0.733306819738863, size: 99.0790533995604}
                4: {a: 0.5272617433956593, b: 0.47273825529490177, size: 99.9068905073811}
                5: {a: 0.5043645634880239, b: -6.001715732079978e-16, size: 99.20374665156196}
                6: {a: 0.9999999963821405, b: -3.6178589458667247e-9, size: 99.60515674918517}
                7: {a: 0.7821769488688209, b: -0.21782305113117853, size: 99.92576073766486}
                8: {a: 0.2566082373396572, b: -0.23737687807156496, size: 99.89979459735572}
                9: {a: 0.25660824082065414, b: 0.2373768742057317, size: 99.8997947071859}
            ]

            tileabclean = [  //     arbitrary order
                {a: 0, b: 0,size: 99.0760686442865},  // hex3
                {a: 0, b: 0.4814983189272394, size: 99.8960463933496},  // tri 4  1>
                {a: 0, b: -0.9999999981691525, size: 99.89479045079642},  // tri 5 2>
                {a: 0.2657419602284653, b: -0.733306819738863, size: 99.0790533995604}, // hex 2 3>
                {a: 0.5272617433956593, b: 0.47273825529490177, size: 99.9068905073811},  // tri 2 4>
                {a: 0.5043645634880239, b: 0, size: 99.20374665156196},  // hex 1   5>>
                {a: 1, b: 0, size: 99.60515674918517},  // pentagons 6>
                {a: 0.7821769488688209, b: -0.21782305113117853, size: 99.92576073766486, col: col3(7,7,7)},  // tri 1 7>
                {a: 0.2566082373396572, b: -0.23737687807156496, size: 99.89979459735572, col: col3(7,7,7)},  // tri 3a 8>
                {a: 0.25660824082065414, b: 0.2373768742057317, size: 99.8997947071859, col: col3(7,7,7)}  // tri 3b  9>
            ]
            **/



            colorScheme: [
                ['4,A,B,C,D,E,F', 0xffff00],
                ['M,N,O,S,T,U,V,W,X', 0xff6000],
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


        {
            filename: '1f8v.pdb', shortname: 'PAV\naffine extension',
            // has biomt
            comment: 'Pariacoto',
            spheres: 'pariacoto_full_export_563_*.pdb',
            tiling: {a:0.257, b:0, size: 100}, // a=4, b=0, 5/6 triangles
            style: 'cartoon', colorBy: 'chain', // opacity: 0.2, transparent: true,
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


        {
            filename: '1f8v.pdb', shortname: 'PAV',
            // has biomt
            comment: 'Pariacoto fig 4a',
            tiling: {a:0.257, b:0, size: 100},
            scale: 0.75,
            orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1]
        },  // PAV


        {
            filename: '2ms2.pdb', shortname: 'MS2',
            // has biomt
            comment: 'Bacteriophage MS2, fig 4b',
            tiling: [{x:0, y:0, z:1, size: 100}, {x:0.9, y:0, z:1, size: 100}], // a=0, b=0, rhomb  [0,0,1] [0.9, 0, 1]
            scale: 0.9,
            Xorient: [0.809017, 0.500000, 0.309017, 0, -0.30902, 0.809017, -0.50000, 0, -0.50000, 0.309017, 0.809017, 0, 0, 0, 0, 1], // for m2
            orient: [0.500, -0.309, 0.809, 0, 0.809, 0.500, -0.309, 0, -0.309, 0.809, 0.500, 0, 0, 0, 0, 1]
        },  // MS2

        {
            filename: '1a6cX.pdb', shortname: 'TRSV',
            // has biomt
            comment: 'Tobacco Ringspot Virus\nfig 4c',
            // tiling: 'GeodesicRT1.polys',
            // meshOrient: [49.6, -31.1, 81.1, 0, 81.2, 49.5, -30.7, 0, -30.6, 81.1, 49.8, 0, 0, 0, 0, 1],
            // NOTE: meshOrient needed for GeodesicRT1.polys; but NOT needed for tiling as below
            // CSynth.tiles({a: 0.3758987414465172, b: 0.617193999288073, size: 100}).pset[0].poly.points.map(p=>p.length())
            tiling: {a: 0.3758987414465172, b: 0.617193999288073, size: 100},
            scale: 0.8,
            colorBy: 'chaingroup',
            baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
            // meshOrient: [0.496, -0.311, 0.811, 0, 0.812, 0.495, -0.307, 0, -0.306, 0.811, 0.498, 0, 0, 0, 0, 1],
            orient: [-0.500, -0.309, -0.809, 0, -0.309, -0.809, 0.500, 0, -0.809, 0.500, 0.309, 0, 0, 0, 0, 1]
        } // TRSV


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
if (searchValues.nosphere) ima.demo.extraPDB.splice(2,1);
if (searchValues.one) ima.demo.extraPDB = ima.demo.extraPDB.filter(f => f.shortname === searchValues.one);
//if (searchValues.lowry) {}
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
    // GX.getgui('sphereparticles/diameter').max(150);

    GX.removeItem('Modes');
    GX.removeItem('Simulationsettings');
    GX.removeItem('Ribbon');
    GX.removeItem('Matrix');
    GX.removeItem('Annotations');
    GX.removeItem('HistoryTrace');
    GX.removeItem('SphereParticles');
    GX.removeItem('View');

    // GX.setValue('1aq3_full.pdb/visible', true);
    // ima.show(0);
    V.fog.near = 1800;  // camera distance for outside, starts fogging a midpoint
    V.fog.far = V.fog.near+200;  // 400 is approx size, so fade right out just behind back

    V.flyy = true;  // full 3d flying

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

ima.show = async function(n = ima.showing, selection = ima.selection) {
    // CSynth.xxxGlmol('1m4x').allgroup.scale.set(0.15, 0.15, 0.15);
    // we ned to make fade not happen when changing attribites rather than viruses,
    // and not to apply during seeded load
    if (ima.fadetime) for (let i = ima.fadetime; i >= 0; i -= 10) {
        V.l1.intensity = V.l1.saveIntensity * (i/ima.fadetime)**2;
        await sleep(10);
    }

    let nn = ima.demo.extraPDB.length;  // num to show
    let cc = CSynth.current;
    let glmolList = cc.extraPDB.map(nnn => CSynth.xxxGlmol(nnn.shortname));
    for (let i=0; i<nn; i++) {
        let l = glmolList[i];
        if (!l) continue;  // eg during load
        l.allgroup.visible = n === i;
        CSynth.optimizeVisible(l.allgroup);
    }

    let glmol = glmolList[n];
    const xx = cc.extraPDB[n];
    const shortname = xx.shortname;


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
            GX.setValue(glmol.id + '/smooth/res', 60);
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


    // apply tiling/spheres if any, and hide previous tiling if any
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
            mesh = xx.tilemesh = CSynth.tiles(tiling);
        }
        mesh.visible = true;
        const mesho = xx.meshOrient;
        if (mesho) {
            mesh.matrix.elements.set(mesho);
            mesh.matrixAutoUpdate = false;
            if (xx.spheres && xx.scale) {
                mesh.matrix.multiplyScalar(xx.scale);
                mesh.matrix.elements[15] = 1;
            }
        }
        mesh.visible = selection !== 'capsid'
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
    Maestro.on('preframe', ima.gui.open);  // prevent closing the gui
    const bb = [3];
    for (let i=0; i<nn; i++) {
        let l = list[i];
        const xx = cc.extraPDB[i];
        const sep = '\n    ';
        let tip = xx.shortname + sep + '-----';
        if (xx.comment) tip += sep + xx.comment;
        tip += sep;
        tip += sep + 'file:' + xx.filename;
        if (xx.tiling) tip += sep + 'tiling: ' + JSON.stringify(xx.tiling).replace(/"/g, '');
        if (xx.spheres) tip += sep + 'spheres: ' + JSON.stringify(xx.spheres).replace(/"/g, '');
        bb.push( { func: () => ima.show(i), tip, text: xx.shortname } );
    }
    // // experiment to use png in menu, not too helpful
    // bb[1].image = "CSynth/data/YorkStudents/images/2ms2.png";
    // delete bb[1].text;
    // bb[2].image = "CSynth/data/YorkStudents/images/1sva.png";
    // delete bb[2].text;
    ima.VirusButtons = imagui.addImageButtonPanel(...bb).setRowHeight(0.15).highlightLastPressed();

    ima.optbuttons = [];
    ima.SelectionButtons = imagui.addImageButtonPanel(3,
        {text: 'both', func: () => { ima.selection = 'both'; ima.show(); }},
        {text: 'capsid', func: () => { ima.selection = 'capsid'; ima.show(); }},
        {text: 'tiling', func: () => { ima.selection = 'tiling'; ima.show(); }}
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
}

/** show spheres even if not PAV */
CSynth.showSpheres = function(n) {
    for (let fid in CSynth.polySpheres) CSynth.polySpheres[fid].visible = false;
    const spheregroup = CSynth.polySpheres['pariacoto_full_export_563_*.pdb'];
    const nn = CSynth.polySpheres['pariacoto_full_export_563_' + n + '.pdb'];
    if (nn) {
        spheregroup.visible = true;
        nn.visible = true;
        CSynth.optimizeVisible(spheregroup);
    }
}

CSynth.customReset = function() {
    ima.selection = 'both';
    ima.show(0);
    onframe( () => {  // defer so highjlighting after reset highlights Inside and not Reset
        ima.VirusButtons.guiChildren[ima.showing].interaction.events.emit('onPressed',{})
        ima.SelectionButtons.guiChildren[0].interaction.events.emit('onPressed',{})
    });
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
    ima.showing = ima.showing || 0;
    const l = camera.position.length() / G.scaleFactor;

    // update lights according to where we are, avoid backlight
    let ld, ldo = Math.max(l*2, 1000), ldi = 80; // light distance
    const outr = 120, inr = 80; // innner and outer radii
    if (l > outr) ld = ldo;
    else if (l < inr) ld = ldi;
    else ld = ldi + (l-inr) * (ldo-ldi) / (outr-inr);

    V.l1.position.normalize().multiplyScalar(ld);
    V.l2.position.normalize().multiplyScalar(ld);

    // mesh (for herpes)
    const cc = CSynth.current;
    const xx = CSynth.current.extraPDB[ima.showing];
    if (xx.shortname === 'HSV1') {
        let d;
        const dd = 2;  // dist away when moving
        if (l > outr + dd) d = outr;
        else if (l < inr + dd) d = 80;
        else d = l - dd;
        if (d > 100) d = W.outscale;  // 1.2 was too high

        if (typeof cc.extraPDB[1].tiling !== 'string') d /= 100;       // now set using points already at 100
        if (typeof cc.extraPDB[1].tiling !== 'string') GX.setValueChanged(/planes.*edges\/rad/, W.tilerad);  // odd place, but we know it should be defined by now
        const tmesh = xx.tilemesh;
        if (tmesh) {
            tmesh.matrixAutoUpdate = false
            tmesh.matrix.makeScale(d,d,d);
        }
    }

    // make sure viveAnim works even outside VR
    viveAnim('ima')
};  // ima.preframe
W.outscale = 95;
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


// choose which set of imaoptbuttons to show, or none
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

// pictures on white background for Reidun, 2 Sept 2019
ima.SeptPics = async function(ii = 3.6) {
    await ima.show(1);
    CSynth.cameraToDist(5000); vtargetNow();
    setBackgroundColor(1,1,1);
    W.outscale = 100;
    // ima.setCamLights();
    GX.setValue('geodesicicosahedron25polys/color', col3(0,0,0));
    setInput(W.renderRatioUi, 0.5);
    setInput(W.imageasp, 1);
    setInput(W.previewAr, true);
    onWindowResize();   // otherwise previewAr may not work
    V.modesgui.visible = V.gui.visible = false;
    tmat4.makeRotationY(Math.PI/2);
    G._rot4_ele.set(tmat4.elements);

    CSynth.setNovrlights(true);
    V.l1.intensity = ii; V.l2.intensity = ii*0.5; V.l3.intensity = ii*0.5;
    V.lamb.intensity = 0.03;
    V.lamb.color = col3(1,0,1);  // purple shadows

    CSynth.xxxGlmol(1).cartoonMat.roughness = 0.24;
    CSynth.setShadows();  // if shadows active they will apply to everything (tiling not otherwise shadowed)
    onframe( () => {
        ambientOcclusionInit();
        rrender.effects.saoPass.setSize(1024, 1024);
        copyFrom(rrender.effects.saoPass.params, ima.saoParms);
        CSynth.fogfix();
        /**
        rrender.effects.saoPass.enabled = false;
        rrender.effects.saoPass.enabled = true;
        rrender.effects.saoPass.enabled ^= true;
        V.l1.castShadow = V.l2.castShadow ^= true;

        window.sp = rrender.effects.saoPass.params;
        copyFrom(sp, {saoIntensity: 0.5, saoScale: 20});

        rrender.effects.saoPass.setSize(width, height);

        // test to show big sao movement
        Maestro.on('preframe', () => {if (framenum%16 === 0) G._camqx *= -1; msgfix('cc', framenum, G._camqx); return 0;} )
        G._camqx = 0.0001;
         */
    }, 1);
}
// ima.SeptPics()

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
