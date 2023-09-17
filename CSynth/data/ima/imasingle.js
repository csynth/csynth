// This loads data for Reidun IMA demonstration

// Line below gives access to relevant global javascript data without lint messages
const {W, G, DNASprings, springdemo, CSynth, nomess, V, msgfix, onframe, resetMat, GX, dat,
VH, width, height, springs, THREE, Plane, runkeys, msgboxVisible, toKey, GLmolX, Maestro,
camera, VEC3, tmat4, setNovrlights, setInput, searchValues, viveAnim, log, col3, I, sleep} = window;

var ima = W.ima = {};  // permit ima. namespace

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

springdemo( {
    contacts: [{filename: 'triva.contacts', shortname: 'IF'}],
    colorScheme: [['A', 0x3030ff], ['B', 'green'], ['C', 'red']],
    baseRadius: 0.5, multiplierRadius: 2, ssNarrowRad: 0.4, ssBroadRad: 2, ssSheetBroadRad: 2, ssArrowSize: 2,
    extraPDB: [
        {filename: '1f8v.pdb', shortname: 'PAV',
            comment: 'Pariacoto fig 4a',
            // tiling: {a:4, b:0, size: 100}, // a=4, b=0, 5/6 triangles
            tiling: {x: 0.16, y: 0.99, z: 0, size: 100}, // a=4, b=0, 5/6 triangles
            scale: 0.75,
            orient: [-0.792, -0.557, -0.251, 0, 0.393, -0.778, 0.490, 0, -0.468, 0.289, 0.835, 0, 115.8, 16.5, -66.7, 1]}  // PAV
    ]

});

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
    // CSynth.randpos();   // start from a random position
    G.scaleFactor = 4;  // this scale factor works well
    resetMat();         // set viewing transforms to standard
    onframe(ima.makegui, 10);
    onframe(CSynth.reset, 11);
    // onframe(()=>msgboxVisible(false), 1);  // defer needed to make first 'esc' key to work, todo find out why
    setTimeout(()=>msgboxVisible(false), 4000);
    CSynth.castExtra = () => ({hitdist: 'nocast'});  // prevent raycast, slightly expensive and odd with symmetry
    V.headlight = false;
    V.torchlight = false;
    setNovrlights(true);
}

ima.selection = 'both';
ima.fadetime = 0;  // time for fade out/in

ima.show = async function(n = ima.showing, selection = ima.selection) {
    let nn = 1;  // num to show
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
    if (oldtiling && oldxx.tiling) {
        oldxx.tiling.visible = false;
        CSynth.optimizeVisible(oldxx.tiling);
    }

    const tiling = xx.tiling;
    if (tiling) {
        let mesh = xx.tilemesh;
        if (!mesh) {
            mesh = xx.filemesh = CSynth.tiles(shortname, tiling);
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
    let nn = 1;  // num to show
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

    CSynth.rotPosGui(imagui);

    // separate and position the gui
    VH.positionGUI();
    V.gui.position.y = 0.35;  // don't hide for imasingle, we want to access it
    // V.gui.position.x += 0.1; // so mainly hidden but we can find for debug
    V.gui.updateMatrix()
    V.gui.close();
    imagui.detach();
    const u = undefined; VH.positionGUI(u,u,u,imagui);

    CSynth.modesToHand = true;
    V.modesgui = imagui;
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
ima.setCamLights = function imasetCamLights() {
    V.camscene.remove(V.lightGroup);
    V.lightGroup = new THREE.Group(); V.lightGroup.name = 'lightGroup';
    V.camscene.add(V.lightGroup);

    const l1 = V.l1 = new THREE.PointLight()
    V.lightGroup.add(l1);
    l1.saveIntensity = l1.intensity = 0.7;
    l1.position.set( 1000, 1000, 1000)
    l1.castShadow = searchValues.useshadows;

    const l2 = V.l2 = new THREE.PointLight()
    V.lightGroup.add(l2);
    l2.saveIntensity = l2.intensity = 0.3;
    l2.position.set( 0,0,120 * 4)
    l2.position.set( -1000, 0, 1000)
    l1.castShadow = searchValues.useshadows;

    //const light = new THREE.DirectionalLight( 0x808080 );
    //light.position.set( 1, 1, 1 ).normalize();
    //V.lightGroup.add( light );

    const lighta = new THREE.AmbientLight( 0xffffff, 0.01 );
    lighta.name = 'ambientlight';
    V.ambientlight = lighta;
    V.lightGroup.add(lighta);
}
ima.setCamLights();


// make sure this frame does not get hidden, and lights are ok
Maestro.on('preframe', () => {
    ima.showing = ima.showing || 0;
    const l = camera.position.length() / G.scaleFactor;

    // update lights according to where we are, avoid backlight
    let ld, ldo = 1000, ldi = 80; // light distance
    const outr = 120, inr = 80; // innner and outer radii
    if (l > outr) ld = ldo;
    else if (l < inr) ld = ldi;
    else ld = ldi + (l-inr) * (ldo-ldi) / (outr-inr);

    V.l1.position.normalize().multiplyScalar(ld);
    V.l2.position.normalize().multiplyScalar(ld);

    // make sure viveAnim works even outside VR
    viveAnim('ima')


});



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
