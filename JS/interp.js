// helpers for interp glsl version
var readtext, THREE, U, adduniform,msgfixerrorlog, msgfix, COL, onframe, vec4,G, xxxgenes, readdir, remakeShaders, HornSet, log, inps,
setGenesFromTranrule, usemask, resoverride, addgene,setGUITranrule, rrender, _testcompile, V

var N, interp = {}
// generate global interp names N, so we can use N.stackx, etc
function interpnames() {
    const gflag = 256, kflag = 512;
    N = {gflag, kflag, stop: 0};
    const t = readtext('shaders/interp.vs');
    const sp = t.split(/case (.*):.*\/\/(.*)/);
    for (let i = 0; i < sp.length; i++) {
        let v = sp[i].trim().pre(' ')
        if (v != '' && !isNaN(v)) {
            v = +v
            const k = sp[i+1].trim().pre(' ');
            N[k] = v;
            N[k + 'g'] = gflag + v;
            N[k + 'k'] = kflag + v;
            N[k + 'gk'] = gflag + kflag + v;
        }
    }
    const xn = {bend: N.bend1z, bend2: N.bend2z,
                flap: N.bend1yk, flapk: N.bend1yk, stack: N.stacky,
                sweep: N.bend1zk, sweepk: N.bend1zk, twist: N.bend1y, twist1: N.bend1y, twist2: N.bend2y, code: N.noop}
    N = Object.assign(N, xn);
    // N.branchk = N.bend1y // WRONG, temp todo
    return N;
}

function interpprep() {
    let bc = interp.bc;
    if (bc) return;
    bc = interp.bc = new Float32Array(1000);
    interp.tex = new THREE.DataTexture(bc, bc.length/2, 1, THREE.RGFormat, THREE.FloatType);
    adduniform('bytecode', interp.tex);
    U.bytecode = interp.tex;
    interp.MAXHORNS = 40;
    interp.horns = new Array(interp.MAXHORNS).fill(0).map(x => vec4());
    adduniform('interphorns', interp.horns);

    // onframe(() => COL.manybold(), 10);
    U.backcol.setRGB(0,0,0);

    // HornSet.subs fortailsouter = false // no longe needed, item information passed in hornrun
    interpnames();
    msgfix('!useinterp', () => inps.useinterp);
}

function interpset(pp, genes) {
    // let genes = G   // <<< TODO correct G
    let p = pp.slice();  // preserve original
    for (let i = 0; i < p.length; i++) {
        if (typeof p[i] === 'string' && p[i][0] === '#') {
            const gn = p[i].substring(1);
            if (!(gn in G))
                log('bad gene in interpset', gn)
            else
                p[i] = G[gn]
        }
        if (isNaN(p[i])) {
            if (pp[i] !== '"topfollow;"') log('interpset nan', i, pp[i], p[i])
            p[i] = 0;
        }
    }
    const badi = p.filter(x => isNaN(x))
    if (badi.length) {
        msgfixerrorlog('interpset', 'interpset has NaN values', badi.length);
        const noop = 1;
        p = p.map(x => isNaN(x) ? noop : x);
    } else {
        msgfix('interpset');
    }
    interpprep();
    interp.bc.fill(0);
    interp.bc.set(p);
    interp.tex.needsUpdate = true;
}

function horns2Rules(ptranrule, genes) {
    if (!interp.bc) interpprep();
    // extract horn details from full horn code
    if (!ptranrule) ptranrule = readtext('data/bigfract.tranrule.js');
    if (ptranrule === interp.tranrule) {
        interp.hset._genhornrun(genes)
        return interp.bcs;
    }

    const bintranrule = inps.tranrulebox;
    // ?inps.tranrulebox???, rrender not changed
    const str = [addgene, setGUITranrule, _testcompile, inps.tranrulebox]; // inps.tranrulebox, rrender
    function reset() { [addgene, setGUITranrule, _testcompile, inps.tranrulebox] = str; }

    //const gnames = []

    // we shortcut large parts of horn compilation, time consuming and not needed
    // addgene sets the default value (eg as in the tranrule value) into our local set of genes
    _testcompile = true;
    // rrender = ()=>{};
    addgene = function taddgene(gn, def, min, max, delta, step, help, tag, free, internal=false, useuniform = true, addGui = true, unusedpassgenes = 0) {
        //if (genes !== passgenes)
        //    genes = genes;
        //let agenes = genes;
        if (!genes) {log('no agenes for gene', gn); return;}
        if (!(gn in genes)) genes[gn] = def
        //gnames.push(gn)
    }
        // setGUITranrule = rrender = ()=>{} // ?? done by _testcompile
    try {
        if (interp.profile) console.profile() // OUTSIDE console.time, because of significant overhead in setting up profile
        //console.time('hornset')
        let hset
        for (let i=0; i<1; i++) {
            hset = interp.sourceHornset = interp.hset = new HornSet();
            let code = hset.tranrule = ptranrule;
            let rr = hset.parsehorn( code, undefined, true); // this has hset.horns.<cage>.trans trans etc
            if (!genes) genes = interp.genes = {}
            // genedefs = interp.genedefs = {}
            hset._compilehs(code, genes);  // this has hornrun + lots of stuff we don't need, most of which se shortcut
            // setGenesFromTranrule(ptranrule, genes); // ?? not needed as addgene will have set correct ptranrule value
            hset._genhornrun(genes)
        }
        //console.timeEnd('hornset')
        if (interp.profile) {console.profileEnd(); interp.profile--;}
        inps.tranrulebox = bintranrule

        const horns = hset.horns;
        const r = {};
        const badnames = interp.badnames = {};
        for (const hrun of hset.hornrun) {
            if (!hrun) continue;
            const horn = hrun.horn; // horns[hname]
            const l = r[hrun.hornid] = [];
            l.push(N.setradk, horn._radius ?? 0);
            for (const tran of horn.trans) {
                const opts = tran.opts;

                const ll = opts.length;
                if (ll === 0) return;
                else for (let i = 0; i < ll; i++) {
                    const opt = opts[i];
                    const app = ll === 1 ? '' : ll
                    let v, name = i == 0 ? tran.name + app : 'noop';
                    if (typeof opt === 'number') {
                        v = opt;
                    } else if (typeof opt === 'object') {
                        if ('k' in opt) {name += 'k'; v = opt.k; }
                        else if ('v' in opt) {v = opt.v; }
                    } else {
                        log('?? ',horn.name, tran.name, v)
                        v = -999
                    }
                    let namek;
                    namek = N[name];
                    if (!namek) {
                        badnames[name] = name;
                        namek = name;
                    }

                    let gcode = tran._genecode[i];
                    gcode = gcode.match(/{k:"(.*)"}/)?.[1] ?? gcode.match(/(#.*)#/)?.[1] ?? gcode;  // k: handled in namek
                    // gcode should either be a number, or #<genename>
                    l.push(namek, gcode); //  v
                }
            }
            if (hrun.refl) l.push(N.scalexk, -1); // for second half of cage
            const p = hrun.parentHornid;
            if (p !== -999) l.push(N.parent, p-3);
        }

        const ihorns = interp.horns;
        for (let i = 3; i < hset.hornrun.length; i++) {
            const hrun = hset.hornrun[i];
            const h = ihorns[i-3];
            h.x = hrun.cumnum;
            h.y = hrun.ribs;
            h.z = 199; // fill in soon
            h.w = hrun.subtype === '_head' || hrun?.item?.end == 0 ? 1 : 999; // nb == NOT ===
        }
        // endid x, num y, label z, headflag w
        interp.tranrule = ptranrule;
        interp.bcs = r;
        return r;
    } finally {
        reset();
    }
}

function interptest(ptranrule, genes) {
    G.skelhornid = 6; // every time just in case

    horns2Rules(ptranrule, genes);

    // remakeShaders();
    const changetime = Object.values(readdir('shaders')).reduce((c,v) => v = Math.max(c, v.ctimeMs), 0)
    if (changetime > (interp.changetime??0)) {
        remakeShaders();
        interp.changetime = changetime;
        N = undefined;
    }
    if (!N) interpnames();  // nb inter.horns set except for labels
    const r = horns2Rules(ptranrule, genes);
    const t = [N.route, 0];  // start with a route node to get things going
    // establish labels for each horn
    for (let i = 3; i < interp.hset.hornrun.length; i++) {
        const label = interp.horns[i-3].z = t.length / 2;  // label, => 1st element = radius
        // const k = interp.hset.hornrun[i].hornname
        const k = i
        const v = r[k];
        t.push(...v);
        t.push(N.stop, 0);
    }
    // // endid x, num y, label z, totnum w
    interpset(t, genes)
    xxxgenes().Z_first_ribs = interp.sourceHornset.horncount - 2; // 25 - 2;
}

/** add some settings to test performance */
function interpsettings() {
    usemask = 4
    G.colby = 1
    G.baseksize = 0
    G.profileksize = 0
    G.frac_S_frac_num = 9
    inps.renderRatioUi = 2
    inps.NOSCALE = inps.NOCENTRE = true
    resoverride.skelnum = 5000
    V.camscene.visible = V.nocamscene.visible = false
}

interp.basetranrule = `//ZCODE
horn("Z_sub").radius(1)
horn("Z_first").ribs(99000).radius(1).sub("Z_sub").code("interpcall;");
mainhorn="Z_first"; `