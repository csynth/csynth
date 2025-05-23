'use strict';
// This loads the data as provided around June 2017.
// We do not have contact data at the resolution corresponding to the xyz data.
// Therefore we generate dummy data for the range, and the contacts buttons become irrelevant.
// This version uses the full data without averaging to give 1200 particles.
const {G, GX, springdemo, DNASprings, CSynth, V, customLoadDone, nomess, setAllLots, W, S} = window;
springdemo( {
    minid: 32001350,
    res: 250,
    numInstances: 1200,
	xyzs: [ {filename: 'orient_red.xyz', shortname: 'Red'},  {filename: 'orient_white.xyz', shortname: 'White'} ],
	beds: ['extrude.bed','genes.bed','prom_enh.bed','ctcf.bed'],
	wigs: ['prom_enh.wig','ctcf.wig','nowig.wig'],
	etc: ''
});


W.customSettings = () => {
	//G.maxBackboneDist = 0.7;  // ignore the unreliable long distance contacts
    G.nonBackboneLen = 3;   // estimated aspect ratio, diam to length of cylindrical particle.
    G.springforce = 1;      // was default, but now
	G.scaleFactor = 50;
    //G.textScale = 0.1;  // smaller annotation text than usual
    // ... add more lines here
    G.selWidth = 1;  // width of selection relative to complete ribbon
    G.minTextScale = 1;  // relative size of text at edge of selection
    //if (CSynth.matrot) CSynth.matrot.rotation = 0.1;
    G.matZ = 0.03;
	DNASprings.stretch = true;
	G.springspreaddist = 120;
    CSynth.parseBioMart.setVisibility(true);  // << checking details: we have a code inconsistency here
    // CSynth.defaultCamera = new THREE.Vector3(0, -200, 300); // default z is 600
    // nomess('force');  // leave to defaults.js
    GX.setValue('Matrix/Colour/input A', 'current xyz');        // standard
    GX.setValue('Matrix/Colour/input B', 'current springdef');  // to become standard ???
    G.matDistNear = 0;
    G.matDistFar = 3;
}

// this will be called once when everything set up, so can add to the gui
W.customLoadDone = async () => {
    V.modesgui.addImageButtonPanel(4,
    {func: ()=>CSynth.bothBed(0) , tip: 'Regions', text: 'Regions'},
    {func: ()=>CSynth.bothBed(1) , tip: 'Genes', text: 'Genes'},
	{func: ()=>CSynth.bothBed(2) , tip: 'Switches', text: 'Switches'},
	{func: ()=>CSynth.bothBed(3) , tip: 'Boundaries', text: 'Boundaries'}
    ).setRowHeight(0.15).highlightLastPressed();


    V.modesgui.addImageButtonPanel(4,
    {func: ()=>CSynth.usewig(0) , tip: 'Switches', text: 'Switches'},
    {func: ()=>CSynth.usewig(1) , tip: 'Boundaries', text:'Boundaries'},
	{func: ()=>CSynth.usewig()  , tip: 'No wig', text: 'No wig'}
    ).setRowHeight(0.15).highlightLastPressed();

    CSynth.usewig(0)

    V.modesgui.add(CSynth.parseBioMart.toggler, 'visible').name('annotations')
        .listen().onChange(CSynth.parseBioMart.setVisibility);
    // V.laserAngle = -Math.PI/3;

    CSynth.onUnique('viveGPInit_left', CSynth.attachModesToHand);
    CSynth.applyXyzs(1);  // make sure springs for 1 are already loaded at start, save hiccup later
    CSynth.xyzsExact(0);    // start at given xyz, helps prevent knots
    CSynth.applyXyzs(0);   // and open to xyz springs

    GX.getgui('ribbon/diameter').setValue(3);
    await S.frame(30);
    CSynth.autoscale();
    await S.frame(30);
    CSynth.autoscale();
}
