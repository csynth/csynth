// demo to show use of Lorentz code and comparison
const {springdemo, CSynth, G, GX, addscript} = window;
springdemo( {
    contacts: [{filename: "NoY_All_interIntraContact_1M_nml.txt", shortname: "noise20"}],
    beds: "nogapbed.bed",
    showLorentzian: true
});

window.customLoadDone = () => {
    G.stepsPerStep = 2;
    G.damp = 0.9;
    G.endblobs = 0;
    G.powBaseDist = 20;
    // G.damp = 0.5;

    G.m_force = 0.5;
    G.xyzforce = 0;
    G.m_k = 5.323;          // experiment to align sqrt(trace)
    G.m_c = 7.35;          // experimental
    //CSynth.alignModels('lor');
    G.m_force = 0.5;
    //CSynth.alignForces('lor');

    GX.setValue('simulationsettings/autoalign', true);
    GX.setValue('ribbon/diameter', 7);

    G.matMinD = G.matMaxD = 0;
    G.matskipdiag = 0;

    addscript(CSynth.current.fullDir + '/videoLorDG.js');
    CSynth.orient.right = 97;
    CSynth.orient.up = 45;
}
