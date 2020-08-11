'use strict';
var CSynth, G, DNASprings, threshold, copyFrom, updateGuiGenes;

CSynth.defaultSprings = function() {
    //>>>> runtime spring details
    CSynth.defsprings = {
        damp: 0.985,
        springrate: 1,
        stepsPerStep: 2,
        springlen: 1,
        nonBackboneLen: 1,

        contactforce: 67,
        springforce: 0.1,  // this is NOT used for main model unless CSynth.useOldSprings set, but used for stretch etc
        xyzforce: 0,

        backboneStrength: 10,
        springpow: 0,
        backboneforce: 0.05,  // weak force tidies up look without really distorting result

        pushapartdelta: 0,
        pushapartcut: 0.02,
        pushapartforce: 0.0008, // 0.00031622776601683794, // 1e-7,       // weak global push apart
        pushapartpow: -1,           // linear fall-off
        pushapartlocalforce: 0.2,   // solid local separation force

        m_k: 4,
        m_alpha: 1.1,
        m_c: 10,
        m_force: 0,

        noiseprob: 1, // 0.01,    // amount of noise to apply to dynamics
        noiseforce: 0, // 0.01,    // amount of noise to apply to dynamics


        distanceCompensate: 0,
        maxBackboneDist: 1,

        torsionspringforce: 0.1,
        /**
        torsionspringforce", 0.1, 0
        backbonetorsionspringforce
        backbonetorsionspringangle
        backbonetorsionspringconst
        backbonetorsionspringdist",
        **/

        xyzMaxDist: 99999,  // limit them by nlist/slist arrangement
        makexyzSpringStrength: 1,
        // if (V) V.skip = true;

        springspreaddist: 50,    // distance apart of skewer springs
        springspreadforce: 1,    // strength of skewer springs,  G.springspreadforce: 5, ? with spring strength compensated by geometric distance
        springspreadpow: 0.01   // power falloff for skewer springspreaddist
    }
    copyFrom(G, CSynth.defsprings);
    updateGuiGenes();

    DNASprings.stretch = false;
    DNASprings.fixends = false;

    threshold = 0;   // min compensated contact probability for generation of spring from contact
    // setthresh(7); sets up springs, we just want to make sure they are set up right when they are set up
    DNASprings.bpup = 32177300; // pase pair for upward force
    DNASprings.upforce = 0.1;   // upward force on particle DNASprings.bpup to keep orientation
}
