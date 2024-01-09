// demo to show covid spike, open and closed positions
const {springdemo, CSynth, G, GX, addscript} = window;
springdemo( {
    xyzs: [
        { filename: "6vxx.pdb", shortname: "closed"},
        { filename: "6vyb.pdb", shortname: "open"}
    ],
    customSettings: {
        damp: 0.95
    },
    matchPairs: true
});

window.customLoadDone = () => {
    G.stepsPerStep = 2;
    G.damp = 0.9;
    G.endblobs = 0;
    G.powBaseDist = 5;


    GX.setValue('ribbon/diameter', 7);
    G._rot4_ele = [
        0.9949736457470463, 0.09633884965896193, 0.02731794859098052, -124.28625,
        0.005558687652545543, 0.21924799623698013, -0.9756533283588229, -206.24312500000008,
        -0.09998272480990385, 0.9709012010459444, 0.2176104605645828, 0,
        0, 0, 0, 1
    ];
    CSynth.xyzsExact(0);
}
