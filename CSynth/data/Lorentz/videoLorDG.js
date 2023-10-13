// This creates a scripted sequence to illustrate features of CSynth and its relactionship to LorDG.
// CSynth scripting is still under development.  in particular
//      * We will provide more documentation
//      * We will probably move to the use of Promises/async/await instead of yeild
//      *   (These were not available when we first started scripting experiments.)
//

'use strict';

var msgfix, GX, G, FF, S, V, cc, CSynth, onframe, randiNew, runkeys, loadopen,
    Maestro, log, setshowstats, sleep;
function msgbig(v) {
    msgfix.show('LorDG');  // in case removed interactively
    msgfix.show('next');
    msgfix('LorDG', '<br><span style="color:black; font-size: 150%" class="msgbig">' + v + '</span>');
}

function allInvisible() {
    const gd = GX.guidict();
    for (let gn in FF(gd, 'visible')) GX.setValue(gn, false);
}

async function videolor() {
    videolor.setup();
    await videolor.intro();
    await videolor.part1();
}
videolor.next = function() {
    if (videolor.started)
        S.next();
    else
        runlor();
}
videolor.setup = function vlsetup() {
    videolor.started = true;
    runkeys('home');
    runkeys('ctrl,home');
    GX.setValue('matrix/visible', false);
    GX.setValue('matrix/rotation', 0.5);
    GX.setValue('matrix/translationz', 0.25);
    GX.setValue('modes/scalefactor', 60);
    const folders = GX.folders();
    for (let f in folders) GX.closeFolder(f);
    V.gui.open();
    GX.openFolder('Modes');
    G.stepsPerStep = 2;
    G.damp = 0.9;
    G.endblobs = 0;
    G.powBaseDist = 5;
    CSynth.alignModels('lor');
    GX.guilist.forEach(x => {if (x.normalizeRange) x.normalizeRange(1); });
    CSynth.xyzsExact(1);

    const gd = GX.guidict();
    allInvisible();
    GX.setValue("Ribbon/visible", true);

    msgfix('next');
    msgfix('LorDG');
    msgfix();           // get rid of most
    msgfix.hideall();
    msgfix.show('LorDG');
    msgfix.show('next');
    setshowstats(false);    // so message is top left

}
videolor.intro = async function vlintro() {
    msgfix();   // clear up messages till wanted
    videolor.setup();
    CSynth.xyzsExact(1);        // has nice orientation
    msgbig(`Relationship between CSynth<sup>1</sup><br>
    and external modeller LorDG<sup>2</sup>
    <ol>
        <li>Use CSynth to visualize LorDG results</li>
        <li>Compare CSynth modelling with LorDG</li>
        <li>Emulate LorDG interactively within CSynth</li>
    </ol>
    <p>
    This walkthrough shows a LorDG comparison
    <br>but CSynth can be used to visualize results
    <br>from any external modeller.
    </p>
    <p>
    It can also be run live at:
    <br><a href="https://csynth.molbiol.ox.ac.uk/csynthstatic/latest/csynth.html?startscript=/csynthstatic/data/Lorentz/lorentz.js" target="_blank">
    https://csynth.molbiol.ox.ac.uk/csynthstatic/latest/csynth.html
    <br>?startscript=/csynthstatic/data/Lorentz/lorentz.js</a>
    </p>
    <span style="font-size: 60%">
        <p>[1] Stephen Todd, Peter Todd, Simon J. McGowan, James R. Hughes,
        <br>Yasutaka Kakui,Frederic Fol Leymarie1, William Latham1, Stephen Taylor
        <br><i>CSynth: A Dynamic Modelling and Visualisation Tool
        <br>for 3D Chromatin Structure</i>, bioRxiv
        <br><a href="https://www.biorxiv.org/content/biorxiv/early/2019/01/03/499806.full.pdf" target="_blank">
            https://www.biorxiv.org/content/biorxiv/early/2019/01/03/499806.full.pdf</a>
        </p>
        <p>[2] Trieu, T. & Cheng, J.
        <br><i>3D genome structure modeling by Lorentzian objective function.</i>
        <br>Nucleic Acids Res. 45, 1049–1058 (2017).
        <br>
        <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5430849/" target="_blank">
            https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5430849/</a>
        </p>
    </span>

    `);
    await S.waitnext();

}
videolor.part1 = async function vlpart1() {
    videolor.setup();
    CSynth.xyzsExact(0);
    msgfix.hide('rmse');

    msgbig(`Part 1: Use CSynth to explore LorDG results
    <ul>
    <li>3d visualization</li>
    <li>Heatmap (not shown in this video)</li>
    <li>Statistics</li>
    </ul>`);
    await S.waitnext();


    //const buttons = V.ImageButtonPanelC.children[0].children;
    msgbig(`Show the raw LorDG 3d results
    <p>LorDG modelling</p>
    <p>The 'positions' buttons set the conformation to match the LorDG results<br>
    loaded as input files to CSynth.</p>`);
    await S.repeatTillInteraction(() => CSynth.xyzsExact(randiNew(5)), runlor.wait, 'exact');
    await S.waitnext();

    msgbig(`Show the raw LorDG results
        <p>Square modelling, results loaded from LorDG test output</p>
        `);
    await S.repeatTillInteraction(() => CSynth.xyzsExact(randiNew(5) + 5), runlor.wait, 'exact5');
    await S.waitnext();

    msgbig(`Show the raw LorDG results
    <p>LorDG modelling, smooth interpolation</p>
    <ul>
    <li>Distances are computed from xyz values in .pdb files
        <br>output from LorDG and input to CSynth.</li>
    <li>These distances drive dynamics to allow smooth transition
        <br>bewteen the xyz conformations.</li>
    <li>The conformations are faithful to the source data
        <br>but the orientations align between the models</li>
    </ul>
    `);
    await sleep(runlor.wait);
    await S.repeatTillInteraction(() => CSynth.applyXyzs(randiNew(5)), runlor.wait, 'dists');
    await S.waitnext();


    GX.setValue("Ribbon/visible", false);
    GX.setValue("HistoryTrace/visible", true);
    GX.setValue('historytrace/colour source:', 'rainbow');
    GX.setValue('historytrace/saturation', 0.8);
    // GX.setValue('historytrace/opacity', 0.02);   // leave to lorenz.js

    msgbig(`Show the raw LorDG results<br>LorDG modelling, History Trace
    <p>Click between all the 'lorX dists' buttons to visualize
    <br>overall variation in different models,
    <br>or between two to compare their conformations.`);
    await sleep(500);
    await S.repeatTillInteraction(() => CSynth.applyXyzs(randiNew(5)), runlor.wait, 'distsHT');
    await S.waitnext();

    GX.setValue("Ribbon/visible", true);
    GX.setValue("HistoryTrace/visible", false);
    msgbig(`Show LorDG statistical comparisons
        <p>We correlate all the LorDG results
        <br>against the LorDG 'wish distances'.</p>
        <p>'Y' key, or 'Fixed stats' button.</p>
        <p>As discussed in the LorDG paper,
        <br>LorDG results are generally better then Square modelling ones,
        <br>with lower rmse values (~284 vs ~288)
        <br>and higher spearman values (~0.929 vs ~0.926).
    `);
    CSynth.applyContacts(0, 'contactLor'); // so comparisons will be with LorDG model, should be same after alignModels()
    CSynth.allstats();
    await S.waitnext();
    msgfix.hide('correlations');

    msgbig(`Summary Part 1: Use CSynth to explore LorDG results
    <p>We have seen the use of CSynth to visualize the results
    <br>of experiments with with an external (LorDG) modeller
    <br>and to apply simple statistics to those results.
    `)
    await S.waitnext();
    await videolor.part2();
}

videolor.part2 = async function vlpart2() {

    videolor.setup();
    msgbig(`Part 2: Compare CSynth modelling with LorDG
    <p>The 'CSynth IF' button uses CSynth modelling
    <br>with the 'noise20' interaction frequency data as input.</p>`);
    CSynth.applyContacts(0, 'contact');
    msgfix.hide('rmse');
    GX.setValue('simulationsettings/autoalign', false);
    await S.waitnext();

    msgbig(`Compare CSynth modelling with LorDG
    <p>The 'CSynth IF' button uses CSynth modelling
    <br>with the 'noise20' IF data as input.</p>
    <p>CSynth model parameters have been adjusted
    <br>so the CSynth implicit target distances
    <br>match the wish distances of the LorDG model.</p>`);
    await S.waitnext();

    //msgbig(`We can rerun the model with new starting positions
    //<br>Random ('R' key)`);
    //CSynth.randpos()
    // await sleep( 5000;
    msgbig(`We can rerun the model with new starting positions
    <br>Random ('R' key) or Helix 'ctrl-H' keys`);
    loadopen();
    await S.repeatTillInteraction(() => CSynth.randpos(), runlor.wait * 3, 'randpos1');
    await S.waitnext();

    msgbig(`Run faster if you just want results.
    <ul>
        <li>set <b>stepsPerStep</b> = 50</li>
        <li>set <b>damp</b> = 0.98</li>
    </ul>
    `);
    GX.openFolder('Simulation settings');
    GX.openFolder('Simulation settings/More ...');
    G.stepsPerStep = 20;
    G.damp = 0.98;
    CSynth.randpos();
    await sleep(1000);
    loadopen();
    await S.repeatTillInteraction(() => CSynth.randpos(), runlor.wait, 'randposFast');
    await S.waitnext();

    GX.closeFolder('Simulation settings/More ...');

    await playcsynth();
    await S.waitnext();
    videolor.setup();  // should be back where we started but just in case


    msgbig(`Realtime statistics
    <p>We can see simple statistics in realtime
    <br>Click '<b>rmse</b>' in 'hidden:' at the top of messages</p>
    <p>We are doing some 'random' so you can see the statistics moving.</p>
    `);
    msgfix.show('rmse');
    G.stepsPerStep = 2;
    G.damp = 0.9;
    await S.repeatTillInteraction(() => CSynth.randpos(), runlor.wait * 3, 'randposStats');
    await S.waitnext();

    // make sure it settles to a good value; 1 second should do it
    G.stepsPerStep = 20;
    G.damp = 0.98;
    await sleep(1000);
    G.stepsPerStep = 2;
    G.damp = 0.9;


    msgbig(`Detailed statistics
    <p>and full statistics for the current positions
    <br>with 'Cur stats' button or 'X' key</p>
    `);
    CSynth.curstats();
    await S.waitnext();

    msgbig(`Statistics compared
    <p>and compare with the LorDG stats<br>('Fixed stats' or 'Y' key)</p>
    `);
    msgfix.kill('correlations');  // so they reappear below current
    CSynth.allstats();
    await S.waitnext();

    msgbig(`Statistics compared
    <p>Generally the CSynth model produces marginally better stats
    <br>than either the LorDG or Square models.</p>
    <p>We do not consider this very important
    <br>as the stats are compared to a fairly arbitrary target.</p>
    <p>More important is the interactivity of the modelling.</p>
    `);
    await S.waitnext();

    msgbig(`Summary Part 2: Compare CSynth modelling with LorDG
    <p>We have seen CSynth modelling on an imported IF dataset
    <br>and statistically compared CSynth and LorDG modelling of that dataset.
    `);
    await S.waitnext();
    await videolor.part3();


    // TODO cleanup stats and a few other bits

}

videolor.part3 = async function vlpart3() {
    videolor.setup();

    msgbig(`Part 3: Emulate LorDG model interactively within CSynth
    <p>We have added rules to CSynth dynamics that emulate LorDG modelling.</p>
    <p>CSynth works in terms of dynamics forces rather than optimized cost functions.
    <br>The dynamics applies forces that are the derivative of the Lorentzian cost function.</p>
    <p>These forces operate pairwise on particles (beads)
    <br>and will not necessarily seek a global minimum.</p>
    `);
    CSynth.applyContacts(0, 'contactLor');
    GX.setValue('simulationsettings/autoalign', true);
    await S.waitnext();

    msgbig(`As with native CSynth modelling
    <br>we can rerun the model from random positions ('R' key).
    `);
    G.stepsPerStep = 20;
    G.damp = 0.9;
    await S.repeatTillInteraction(() => CSynth.randpos(), runlor.wait, 'randposLor');
    await S.waitnext();

    msgbig(`
    <p>We can compare our version of LorDG model
    <br>with the orignal by moving between a solved position
    <br>and CSynth version of LorDG modelling</p>
    <p>We see a slight difference, but very small.</p>
    `);
    await S.repeatTillInteraction([
        () => CSynth.xyzsExact(randiNew(5)),
        () => CSynth.applyContacts(0, 'contactLor')]
        ,runlor.wait * 2, 'randposLor');
    await S.waitnext();

    msgbig(`
    <p>And similarly compare CSynth model
    <br>and CSynth version of LorDG modelling</p>
    <p>There is a much more obvious difference here.</p>
    `);
    await S.repeatTillInteraction([
        () => CSynth.randpos(),
        () => CSynth.applyContacts(0, 'contactLor'),
        () => CSynth.applyContacts(0, 'contact')]
        ,runlor.wait * 2, 'randposLor');
    await S.waitnext();

    msgbig(`Summary Part 3: Emulate LorDG model interactively within CSynth
    <p>We have seen how other models (LorDG)
    <br>can be incorporated into CSynth</p>
    <ul>
        <li>run interactively</li>
        <li>visualized</li>
        <li>and compared with imported LorDG models</li>
        <li>and with native CSynth modelling</li>
    </ul>
    `);
    await S.waitnext();
    await videolor.end();

}
videolor.end = async function vlend() {
    msgbig(`Summary: Relationship between CSynth
    <br>and external modeller LorDG
    <ol>
        <li>Use CSynth to visualize LorDG results</li>
        <li>Compare CSynth modelling with LorDG</li>
        <li>Emulate LorDG interactively within CSynth</li>
    </ol>
    <p>... end ... </p>
    `);

    await S.waitnext();
    msgfix('LorDG');
}

async function blink(butt, tt=500, r=100) {
    // nb button has three children: text, ???, background
    for (let t=0; t < tt; t += r) {
        butt.visible = !butt.visible;
        await sleep(r);
    }
    butt.visible = true;
}

runlor.wait = 500;  // wait time for auto show.  Quick if we are going to follow up with manual

function runlor(op = videolor) {
    S.interrupt();
    onframe( () => {
        S.rate = 1;  // should be more automatic
        S.interruptFlag = false;  // should be more automatic
        S.skipping = false;
        S.waiting = false;
        // run TimedScript(op());
        op()
    });
}


async function play(obj, field, toval) {
    log('play', field, toval)
    msgbig(`Play with model<p>${field}</p>`);
    const old = obj[field];
    S.ramp(obj, field, toval, 1000)
    await sleep(1500);
    S.ramp(obj, field, old, 1000)
    await sleep(1500);
    // await S.waitnext();
}

var interactDownTime;  // todo, work out pattern for this
async function playcsynth() {
    CSynth.alignModels();  // should be back where we started but just in case

    G.stepsPerStep = 20;
    G.damp = 0.98;
    const start = interactDownTime;
    const test = () => start !== interactDownTime || S.skipping;
    while (true) {
        await play(G, 'contactforce', G.contactforce*2);
        if (test()) break;
        await play(G, 'pushapartforce', G.pushapartforce*2);
        if (test()) break;
        await play(G, 'pushapartpow', -1);
        if (test()) break;
        await play(G, 'springpow', -2);
        if (test()) break;
    }
    log('playcsynth finishing')
    // await S.waitnext();
    CSynth.alignModels();  // should be back where we started but just in case
}

// ??? does this need to be async
CSynth.makegui( function(pgui) {
    const bb = [4,

{ func: runlor, tip: `Run walkthrought from start.`, text: 'Walkthrough' },

{
        func: () => runlor(videolor.part1), tip: `Run part 1 of walkthrough.
Use CSynth to visualize LorDG results`, text: 'Part 1'
},

{
     func: () => runlor(videolor.part2), tip: `Run part 2 of walkthrough.
Compare CSynth modelling with LorDG
`, text: 'Part 2'
},

{
     func: () => runlor(videolor.part3), tip: `Run part 3 of walkthrough.
Emulate LorDG interactively within CSynth
`, text: 'Part 3'
},


{
    func: videolor.next, tip: `Move to next sequence in walkthrough.
'Z' key.

Note that ANY interaction will stop any auto-play
and allow you to interact and
experiment before moving on.`, text: 'Next'
}



    ];
    runlor.nextgui = pgui.addImageButtonPanel.apply(pgui, bb).setRowHeight(0.075);
    GX.color(runlor.nextgui, 0x800000);
});

