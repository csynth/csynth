// demo to show use of Lorentz code and comparison
const {springdemo, CSynth, G, GX, addscript} = window;
springdemo( {
    contacts: [{filename: "poisson_chainDres25_List_noise20_1.txt", shortname: "noise20"}],
    xyzs: [
        { filename: "lorentz_noise20_1_1471906221366.pdb", shortname: "lor1"},
        { filename: "lorentz_noise20_1_1471906215578.pdb", shortname: "lor2"},
        { filename: "lorentz_noise20_1_1471906217597.pdb", shortname: "lor3"},
        { filename: "lorentz_noise20_1_1471906219872.pdb", shortname: "lor4"},
        { filename: "lorentz_noise20_1_1471906214023.pdb", shortname: "lor5"},
        { filename: "square_noise20_1_1471941782835.pdb", shortname: "sq1"},
        { filename: "square_noise20_1_1471941797798.pdb", shortname: "sq2"},
        { filename: "square_noise20_1_1471941823966.pdb", shortname: "sq3"},
        { filename: "square_noise20_1_1471941840395.pdb", shortname: "sq4"},
        { filename: "square_noise20_1_1471941855147.pdb", shortname: "sq5"}
    ],
    showLorentzian: true,
    customSettings: {
        damp: 0.95
    }
});

window.customLoadDone = () => {
    G.stepsPerStep = 2;
    G.damp = 0.9;
    G.endblobs = 0;
    // G.powBaseDist = 5;
    // G.damp = 0.5;

    G.m_force = 0.5;
    G.xyzforce = 0.1;
    G.m_k = 5.323;          // experiment to align sqrt(trace)
    G.m_c = 7.35;          // experimental
    G.backboneforce = 0;        // use the 'pure' CSynth or Lorenz models
    G.pushapartlocalforce = 0;

    CSynth.alignModels('lor');
    G.m_force = 0.5;
    CSynth.alignForces('lor');
    G.scaleFactor = 60;

    G.matMinD = G.matMaxD = 0;
    G.matskipdiag = 0;

    G.histStepsPerSec = 25;
    CSynth.newhtres({histlen: 128, histalongres: 4});

    addscript(CSynth.current.fullDir + '/videoLorDG.js?' + Date.now(), () => {
        GX.setValue('simulationsettings/autoalign', true);
        GX.setValue('ribbon/diameter', 7);
        GX.setValue('view/publish', true);
        GX.setValue('historytrace/visible', true);
        GX.setValue('historytrace/opacity', 0.5);
        GX.setValue('historytrace/saturation', 1);
        GX.setValue('modes/beddatasource', 'rainbow');
    });
    CSynth.orient.right = 97;
    CSynth.orient.up = 45;
}
