'use strict';
// This loads the data as provided around June 2017.
// We do not have contact data at the resolution corresponding to the xyz data.
// Therefore we generate dummy data for the range, and the contacts buttons become irrelevant.
// This version uses the full data without averaging to give 1200 particles.
const {G, GX, springdemo, DNASprings, CSynth, V, customLoadDone, nomess, setAllLots, W} = window;
springdemo( {
    minid: 32001350,
    res: 250,
    numInstances: 1200,
	xyzs: [ {filename: 'orient_red.xyz', shortname: 'Red'},  {filename: 'orient_white.xyz', shortname: 'White'} ],
	beds: ['extrude.bed','genes.bed','prom_enh.bed','ctcf.bed'],
	wigs: ['prom_enh.wig','ctcf.wig','nowig.wig', { filename: 'stevewig.wig', scale: 4}],
	etc: ''
});


W.customSettings = () => {
	//G.maxBackboneDist = 0.7;  // ignore the unreliable long distance contacts
    G.nonBackboneLen = 3;   // estimated aspect ratio, diam to length of cylindrical particle.
    G.springforce = 1;      // was default, but now
	G.scaleFactor = 35;
    //G.textScale = 0.1;  // smaller annotation text than usual
    // ... add more lines here
    G.selWidth = 1;  // width of selection relative to complete ribbon
    G.minTextScale = 1;  // relative size of text at edge of selection
    //if (CSynth.matrot) CSynth.matrot.rotation = 0.1;
    G.matZ = 0.3;
	DNASprings.stretch = true;
	G.springspreaddist = 120;
    CSynth.parseBioMart.setVisibility(true);  // << checking details: we have a code inconsistency here
    // CSynth.defaultCamera = new THREE.Vector3(0, -200, 300); // default z is 600
    // nomess('force');  // leave to defaults.js
    GX.setValue('Matrix/Colour/input A', 'current xyz');        // standard
    GX.setValue('Matrix/Colour/input B', 'current springdef');  // to become standard ???
    GX.setValue('ribbon/diameter', 2);
    G.matDistNear = 0;
    G.matDistFar = 3;
}


const {loadwide, springs, guiFromGene, dat} = window;
W.customLoadDone = function() {
    //GX.removeItem('save/load');
    GX.removeItem('modes');
    //GX.removeItem('simulationsettings');
    //GX.removeItem('ribbon');
    //GX.removeItem('annotations');
    //GX.removeItem('matrix');
    //GX.removeItem('historytrace');
    //GX.removeItem('sphereparticles');
    //GX.removeItem('view');
    //GX.removeItem('extras');

    const gui = V.modesgui = dat.GUIVR.createX('demo');
    V.gui.addFolder(gui);

    // arguments to addImageButtonPanel are objects describing individual buttons
    // { func, image, tip }
    gui.addImageButtonPanel( 3, //first argument can be an int, in which case it will be the number of columns
        //putting commas at start of lines to make them easier to comment in / out.
        {func:   ()=>{run(); CSynth.xyzSpringsWhite()}, image: "CSynth/icons/whitecell256.png", tip: "White Polymer Model"}
        , {func: ()=>{run(); CSynth.xyzSpringsRed()}, image: "CSynth/icons/redcell256.png", tip: "Red Polymer Model"}
        , {func: ()=>{run(); loadwide()}, image: "CSynth/icons/unfolded512.png", tip: "Unfolded"}
    ).highlightLastPressed();
    // V.rrr.children[0].children[1] is Regions
    // V.rrr.children[0].children[2] is Genes, ...
    // V.rrr.children[0].children[1].children[0] is text group for Regions
    // V.rrr.children[0].children[4].children[0].position contains the x to set for centre
    // V.rrr.children[0].children[1].children[0].children[0] is mesh for text
    // V.rrr.children[0].children[1].children[0].children[0].geometry is TextGeometry

    V.rrr = gui.addImageButtonPanel( 3, //first argument can be an int, in which case it will be the number of columns
        {func: ()=>CSynth.loadbed('CSynth/data/rsse/extrude.bed'), text: "Regions", textXx: 0.08}
        , {func: ()=>CSynth.loadbed('CSynth/data/rsse/genes.bed'), text: "Genes", textXx: 0.1}
        , {func: ()=>{CSynth.loadbed('CSynth/data/rsse/ctcf.bed'); CSynth.loadwig('CSynth/data/rsse/ctcf.wig');}, text: "Boundaries", textXx: 0.06}
        , {func: ()=>{CSynth.loadbed('CSynth/data/rsse/prom_enh.bed'); CSynth.loadwig('CSynth/data/rsse/prom_enh.wig');}, text: "Switches", textXx: 0.08}
    //	, {func: ()=>{CSynth.loadbed('CSynth/data/rsse/nobed.bed'); CSynth.loadwig('CSynth/data/rsse/nowig.wig');}, text: "Reset"}
    //	, {func: ()=>CSynth.loadbed('CSynth/data/rsse/extrude_plus_genes.bed'), text: "Extrude/Genes", textX: 0.03 }
    //	, {func: ()=>CSynth.loadbed('CSynth/data/rsse/extrude_plus_genes.bed'), text: "Extrude/Genes", textX: 0.03 }
    //	, {func: ()=>CSynth.osubmit(), text: "Reorient"}
    //	, {func: ()=>CSynth.loadbed('CSynth/data/polymer/Globin_Enh_Prom.bed'), text: "Elements Bed"}
    //	, {func: ()=>CSynth.loadwig('CSynth/data/polymer/Globin_Enh_Prom.wig'), text: "Elements Wig"}
    ).highlightLastPressed(0x0530ae); // .setRowHeight(0.15);



    let running = true;
    function run() {
        if (!running) {
            running = true;
            springs.start();
        }
    }
    function toggleRunning() {
        running = !running;
        if (running) springs.start();
        else springs.stop();
    }

    gui.addImageButtonPanel( 3, //first argument can be an int, in which case it will be the number of columns
        //putting commas at start of lines to make them easier to comment in / out.
        {func: toggleRunning, text: "Pause", textX: 0.1}
    );

    //gui.add(CSynth.annotationGroup, 'visible').name("BED annotations").onChange(CSynth.loadbed('CSynth/data/polymer/geneslong.bed'));
    gui.addImageButtonPanel( 3, //first argument can be an int, in which case it will be the number of columns
        //putting commas at start of lines to make them easier to comment in / out.
        {func: CSynth.autoscale, text: "Autoscale", textX: 0.06}
    );
    CSynth.scgui = guiFromGene(gui, 'scaleFactor').name('Zoom').listen().setHeight(0.2);
    gui.open();
    V.gui.performLayout();

    CSynth.usewig(0)
    CSynth.onUnique('viveGPInit_left', CSynth.attachModesToHand);
    CSynth.applyXyzs(1);  // make sure springs for 1 are already loaded at start, save hiccup later
    CSynth.xyzsExact(0);    // start at given xyz, helps prevent knots
    CSynth.applyXyzs(0);   // and open to xyz springs


}  // customLoadDoneX

