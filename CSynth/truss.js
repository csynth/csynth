// experiments to compare with Assessing the limits of restraint-based 3D modeling of genomes and genomic domains

// paper at
// https://academic.oup.com/nar/article/43/7/3465/2414621

// data from:
// http://sgt.cnag.cat/3dg/datasets/files/20150115_Trussart_Dataset.zip
// referenced at:
// http://sgt.cnag.cat/3dg/datasets/

// Toy_Models\res_40\set_0\model_1.xyz
// Toy_Models\res_40_TAD\set_0\model_1.xyz

//        Simulated_HiC\res_40\40_NonTADlike_alpha_50_set0.mat
// Reconstructed_Models\res_40\40_NonTADlike_alpha_50_set0.xyz
//        Simulated_HiC\res_40_TAD\40_TADlike_alpha_50_set0.mat
// Reconstructed_Models\res_40_TAD\40_TADlike_alpha_50_set0.xyz
//
// 3 resolutions (40, 75, 150) (#particles 626, 402, 202)
// 2 styles (tad, nontad)
// 7 levels of structural variability (sets 0..6)
// 4 levels of noise (alpha 50, 100, 150, 200) ,,, added to matrix, NOT to contributing toy model


var CSynth, springdemo, customLoadDone, G, currentLoadingDir, log, sleep, onframe, GX, S, extrakeys, loadopen, msgfixlog,
format, numInstances, msgfix;

var T = {};
T.base = '/!D:/temp/20150115_Trussart_Dataset/'
T.ntoy = 100;
T.sampstep = 10;

T.loadset = async function loadset({res = 40, set = 0, alpha = 50, tad = true, fold = true} = {}) {
    T.toys = [];
    const dtad = tad ? '_TAD' : '';
    const tlike = tad ? 'TADlike' :  'NonTADlike';

    for (let i = 1; i <= T.ntoy; i++) {
        T.toys[i] = CSynth.parseXYZ({filename: `${T.base}Toy_Models/res_${res}${dtad}/set_${set}/model_${i}.xyz`}, true).coords;
    }
    T.curset = `CC${res}_${tlike}_${set}_${alpha}`;

    currentLoadingDir = '';
    T.cc =  {
        key: T.curset,
        contacts: {filename: `${T.base}Simulated_HiC/res_${res}${dtad}/${res}_${tlike}_alpha_${alpha}_set${set}.mat`,
            shortname: `M${res}_${tlike}_${set}_${alpha}`},
        xyzs:  [{filename: `${T.base}Reconstructed_Models/res_${res}${dtad}/${res}_${tlike}_alpha_${alpha}_set${set}.xyz`,
            shortname: `X${res}_${tlike}_${set}_${alpha}`}],
        showLorentzian: false
    }
    for (let model=1; model <= T.ntoy; model += T.sampstep) {
        T.cc.xyzs.push({
            filename: `${T.base}Toy_Models/res_${res}${dtad}/set_${set}/model_${model}.xyz`,
                shortname: `T${res}_${tlike}_${set}#${model}`
        })
    }
    T.rad = CSynth.stats(T.toys[1]).radii[0];
    G.matDistFar = T.rad;

    await springdemo(T.cc);

    customLoadDone = () => {
        G.xyzforce = 0.25;
        G.pushapartpow = -0.5;
        G.springpow = -0.5;
        G.pushapartforce = 0.0002;
        G.contactforce = 100;
        G.backboneforce = 0.1;
        G.springrate = 5;
        G.stepsPerStep = 200;
        CSynth.referenceSize = G.powBaseDist = 200;
        G.m_k = G.backboneScale = CSynth.avgDist(T.toys[1]);  // m_k so randpos is right scale

        GX.setValue('ribbon/coloursource', 'rainbow');
        GX.setValue('ribbon/diameter', 60);
        GX.setValue('sphereparticles/diameter', 80);
        GX.setValue('sphereparticles/visible', true);

        if (fold)
            T.fold();
        else
            CSynth.randpos();
    };

}

// T.loadset()

// compare the stats of given model against all 100 (or ntoy) toy instances
T.stats = function(ntoy = T.ntoy, objs = ['cur', 'x0']) {
    const r = {};
    msgfixlog('###', T.curset, 'pushapartpow', G.pushapartpow);
    const dres = new Float32Array(numInstances * (numInstances-1)/2);
    let statsres;
    let flags; //  = 'all filter1'; we have real distances so should not filter
    objs.forEach(obj => {
        let rmse = 0, wrmse = 0, spearman = 0;
        const objdist = CSynth.dists(obj)[0];
        for (let i = 1; i <= ntoy;i++) {
            const c = CSynth.correl(T.toys[i], objdist, flags, statsres, dres); // , 'rmse wrmse');
            rmse += c.rmse;
            wrmse += c.wrmse;
            spearman += c.spearman;
        }
        r[obj] = {rmse: rmse/ntoy, wrmse: wrmse/ntoy, spearman: spearman/ntoy};
        msgfixlog('### ' + obj, r[obj]);
    })
    return r;
}
// T.stats(undefined, 10);

// run stats for all cases
T.statsall = async function() {
    const r = {};
    const fold = false;
    for (let res in {40:0, 75:0, 150:0}){
        for (let alpha in {50:0, 100:0, 150:0, 200:0}){
            for (let set = 0; set <= 6; set++){
                for (let tad = 0; tad <= 1; tad++) {
                    await T.loadset({res, alpha, set, tad, fold});
                    const c = await T.opt();
                    r[T.curset] = c;
                    if (T.stop) return;
                }
            }
        }
    }
    return r;
}

// // load all cases (debug)
// T.loadall = async function tloadall() {
//     const r = {};
//     const fold = false;
//     for (let res in {40:0, 75:0, 150:0}){
//         for (let alpha in {50:0, 100:0, 150:0, 200:0}){
//             for (let set = 0; set <= 6; set++){
//                 for (let tad = 0; tad <= 1; tad++) {
//                     await T.loadset({res, alpha, set, tad, fold});
//                     await S.frame(10);
//                 }
//             }
//         }
//     }
//     return r;
// }


/** fold from twist with gradually decreasing pushapartpow */
T.fold = async function() {
    CSynth.twist({sc: T.rad});
    G.pushapartpow = 0;
    await S.rampP(G, 'pushapartpow', -4, 10000);
    // T.stats();
}

/** fold from twist with gradually decreasing pushapartpow ... optimize */
T.opt = async function({settle1 = 2000, settle2 = 500} = {}) {
    msgfix('opt', 'pending ...');
    await T.optrad({settle1, settle2});

    const s = T.optres = {};
    G.pushapartpow = 0;
    CSynth.twist({sc: T.rad});
    await sleep(settle1);
    let best = {pushapartpow: 0, val: -99999};
    let flags = 'all filter1';

    for (let v = 60; v >= -500; v -= 20) {
        G.pushapartpow = v/100;
        await sleep(settle2);
        // s[G.pushapartpow] = T.stats(10); // cheating, we don't 'know' the toys to optimize against
        const ss = s[G.pushapartpow] = CSynth.correl('c0', 'cur', flags);
        msgfix('opt', format(s).replace(/},/g, '},<br>'));
        const val = ss.spearman;
        if (val > best.val) best = {pushapartpow : G.pushapartpow, val};
        if (T.stop) return;
    }
    log('opt', format(s).replace(/},/g, '},\n'));

    G.pushapartpow = best.pushapartpow;
    await sleep(settle1);
    const stats = T.stats();
    return T.optall = {s, best, stats};
}

/** set up so the object is about the correct size (t)
 * output is side animateeffect of setting contactforce and pushapartforce
 */
T.optrad = async function({tr = T.rad, thresh = 0.1, settle1 = 2000, settle2 = 500} = {}) {
    msgfixlog('optrad', 'pending', tr);
    G.pushapartpow = -2;
    let d = 2;
    const cf = G.contactforce = 100;
    const pp = G.pushapartforce = 0.0002;

    async function rfun(k) {
        G.contactforce = cf / k;
        G.pushapartforce = pp * k;
        await sleep(settle2);
        return CSynth.stats().radii[0];
    }

    let k0 = 1, k1 = 1, r0, r1;
    // await sleep(settle1)
    r0 = r1 = await rfun(k1);
    const fac = 5;  // higher for quicker bounds but more converge
    // get some upper/lower bounds
    if (r0 > tr) {
        while (r0 >= tr) {
            msgfixlog('optrad', 'boundstest', {k0, r0, k1, r1, tr});
            k0 = k0/fac;
            r0 = await rfun(k0);
            if (T.stop) return;
        }
    } else {
        while (r1 <= tr) {
            msgfixlog('optrad', 'boundstest', {k0, r0, k1, r1, tr});
            k1 = k1*fac;
            r1 = await rfun(k1);
            if (T.stop) return;
        }
    }
    msgfixlog('optrad', 'bounds', {k0, r0, k1, r1, tr});

    // converge
    let k, r, i;
    for (i = 0; i < 20; i++) {
        k = k0 + (tr-r0) / (r1-r0) * (k1 - k0);
        r = await rfun(k);
        if (Math.abs(tr-r)/tr < thresh)
            break;
        if (r > tr) { k1 = k; r1 = r}
        else { k0 = k; r0 = r}
        msgfixlog('optrad', 'converge', {k0, r0, k1, r1, tr});
        if (T.stop) return;
    }
    msgfixlog('optrad', 'result', {k, r, trcontactforce: G.contactforce, pushapartforce: G.pushapartforce, i});

}

extrakeys['K,T'] = () => CSynth.twist({sc: T.rad});
extrakeys['K,C'] = () => CSynth.circle({sc: T.rad});
extrakeys['K,F'] = () => T.fold();
extrakeys['K,R'] = () => CSynth.randpos(G.backboneScale);
extrakeys['K,H'] = () => loadopen();
extrakeys['K,S'] = () => T.stats(10);
extrakeys['shift,K,S'] = () => T.stats();
extrakeys['K,O'] = () => T.opt();

/**
addscript('CSynth/truss.js')
onframe(OP => {
    T.loadset({res:40, alpha:50, set:6, tad:1})
    T.opt()
}, 5)
 */
