/** various utilities to help create guis; many taken from tadpole.ts which was too local */

'use strict';
var GX, V, dat, runcommandphp, CSynth, nop, setExtraKeyS, extrakeys,searchValues, log, currentGenes, genedefs, setval,
GUIwallgui, G, cMap, RGXX, useKinect, RGG, setInput, WA, runkeys, updateGuiGenes, march2021, U, Rtad, Rtadkin, setBackgroundColor, bigcol, tadkin, inps, GGG,
mainvp, NODO, lastDispobj, saveimage1high, onframe, evalq, S, home, keysdown, imageOpts, ml, msgfix, DispobjC, clearObjzoom,
lastdocx, lastdocy, oldlayerX, oldlayerY, newmain, framenum, springs, xxxgenes, camera, xxxrt, copyXflip, width, height, fitCanvasToWindow,
usemask, ops, ctrl, alt, shift, right, left, middle, renderer, xxxdispobj, setExtraKey, getdesksave,
fixfeed, unfixfeed, canvas, everyframe, fixfeedcoreprep, fixfeedcoreend, shadows, sethighres, Viewedit, guinewbw, feed, renderVR, setAllLots

var tad

var sgui, bb = [], panelHeight = 0.15;

function GUIInit(title = 'generic gui') {
    // if (searchValues.notadgui) return; // too much depends on V.gui for now
    if (!V.gui) {
        V.gui = dat.GUIVR.createX(title);
        const bbb = [3,
            { func: () => GX.savegui(undefined, true), tip: "Save current settings from the gui,\n+orientation.", text: 'savegui' },
            { func: ()=>runcommandphp('explorer ' + runcommandphp('cd').split('\r')[0] + '\\settings'), tip: 'open settings in explorer', text: 'explore'},
        ];
        const savegubut = V.gui.addImageButtonPanel(...bbb).setRowHeight(0.100);
        savegubut._nosave = true;

        CSynth.current = {fullDir: './settings/'};      // directory for saves, todo refactor so not CSynth

        CSynth.updateAvailableFiles(V.gui);             // gui to load files

        // V.gui.add(springs, 'isRunning').listen().setToolTip('control spring running state');
        // V.modesgui = dat.GUIVR.createX('Tadpole modesgui');
        if (V.modesgui) V.gui.addFolder(V.modesgui);
        // V.modesgui = V.gui;
        if (!G.springrate) WA.getSpringUniforms(); // usually OK, needed for tadpomp?

        bb = [5];
    }
}

let _GUI_GUIKeyid = 0;
function GUISpacer(butwidth = 5) {
    if (bb.length <= 1) {bb = [butwidth]; return; }
    const ibp = sgui.addImageButtonPanel(...bb).highlightLastPressed().setRowHeight(panelHeight);
    bb = [butwidth];
    // const a = (extrakeys[key]) && (extrakeys[key]).sound;
    // if (a) {
    //     GUISubadd(...a);
    // }
    return ibp;
}


function GUIKey(key, sound = undefined, msg = '', fun = nop) {
    if (key === undefined) return console.error('back call to GUIKey with no key')
    var butwidth = 5;
    if (!CSynth) CSynth = {};
    const mykey = setExtraKeyS(key, sound, msg, fun);
    if (searchValues.notadgui) return;

    // if (!V.gui) _GUI_guiinit();

    const k = key; // for (const k in extrakeys) {

    // if (!k.match('K,') &&!k.match('L,') && !k.startsWith('Insert') && !k.startsWith('Delete')) {
    //     return console.error('unexpected key', k);
    // }
    // const GUIKey = extrakeys[k] as any;
    if (!mykey.extraname) return;        // do not show 'up hierachy' keystrokes with no name

    const ks = k + '\n' + (mykey.sound ? `~${mykey.sound.substring(0, 7)}\n` : '');
    // const text = (kk.extraname + '\n\n' + ks).replace('ArrowRight', '->').replace('ArrowLeft', '<-');
    const text = mykey.extraname;
    const kst = k + '\n' + (mykey.sound ? `\n~${mykey.sound}\n\n` : '');
    const tip = (kst + mykey.extraname).replace('ArrowRight', '->').replace('ArrowLeft', '<-');
    const funcs = [];

    for (let i=1; i <= k.length; i++)   // allow for 'up hierachy' keystrokes (such as K,J before K,J,3)
        if (extrakeys[k.substring(0,i)])
            funcs.push(extrakeys[k.substring(0,i)]);
    const func = () => {for (let f of funcs) f.fun()};
    mykey.sgui = sgui;
    mykey.mostname = GX.keymap(sgui.mostName() + '/' + mykey.extraname);

    bb.push({func, tip, text, key, sgui});
    return mykey;
}

/** finish off any outstanding panel, buffered into bb, return the panel */
function GUIFinishPanel() {
    let rrr;
    if (bb.length > 1) rrr = sgui.addImageButtonPanel(...bb).highlightLastPressed().setRowHeight(panelHeight).panel;
    bb = [5];
    return rrr;
}

/** add a new item under the current subgui */
function GUISubadd(...x) {
    if (!sgui) {
        console.error('no sgui for GUISubadd, create new', ...x);
        sgui = GUINewsub('FORCED');
    }
    return sgui.add(...x);
}

/** add a new log item under the current subgui */
function GUISubaddlog(...x) {
    return sgui.addlog(...x);
}

/** add new submenu and make  'active' (sgui) */
function GUINewsub(sname, msg = sname, parent) {
    sgui = dat.GUIVR.createX(sname);
	if (parent) {
		parent.addFolder(sgui);
	} else {
        //??? this kills sgui GUIEndsub();
        V.gui.addFolder(sgui);
	}
	return sgui;    // not generally needed, set by side-effect above
}

/** end a sub but don't start a new one; in particular clean up  */
function GUIEndsub() {
    GUIFinishPanel();
    bb = [5];
    sgui = undefined;
}

// create a gui item from a gene;
function guiFromGene(gui, gn, xgn) {
    if (typeof gui === 'string') [gui, gn, xgn] = [sgui, gui, gn];
    if (!xgn) xgn = gn;
	var gd = genedefs[gn];
    if (!gd) return log('cannot create gui for gene as no genedef', gn);
    if (currentGenes[gn] === undefined) currentGenes[gn] = gd.def;
    if (currentGenes[gn] === Infinity) currentGenes[gn] = gd.max; // ?? to fix lower in datagui
    let gg;

    if (gd.togui || gd.fromgui) {
        if (gd.togui === Math.log && !gd.fromgui) gd.fromgui = Math.exp;
        if (gd.togui === Math.log10 && !gd.fromgui) gd.fromgui = v => Math.pow(10, v);
        const x = {};
        Object.defineProperty(x, xgn, {
            get: () => { return gd.togui(currentGenes[gn]) },
            set: (v) => { currentGenes[gn] = gd.fromgui(v); }
        })
        gg = gui.add(x, xgn, gd.togui(gd.min), gd.togui(gd.max));
        gg.step = 0.01;
    } else {
        // need intermediate name between var name and description
        gg = gui.add(currentGenes, xgn, gd.min, gd.max);
        if (!gg?.name) {console.error('222NANANANAA', xgn); return; }
        gg.step(gd.step);
    }

    gg.listen();
    gg.name(xgn);
	gg.gn = gn;
	gg.onChange( function(s) {
		setval(gg.gn, gd.fromgui ? gd.fromgui(s) : s);   // this does not contain gg
    });
    if (gd.help) gg.setToolTip(gd.help + '\nGENE: ' + gn + (gd.togui ? ' fun:' + gd.togui.name : ''));
    guiFromGene.items[gn] = guiFromGene.items[xgn] = gg;
	return gg;
}
guiFromGene.items = {};

/** these are mainly not to do with tadpole, TODO, move.  */
async function GUIwallkeys() {
    GUIwallgui = GUINewsub('walls', 'various wall settings');
    GUIKey('K,J', '', '', () => GGG.wall_shadowstrength = 0);
    GUIKey('K,J,1', 'plain black colour', 'black', () => {tad.greywall(false); cMap.SetRenderState('color'); RGXX.backgroundwhite = 0; });
    GUIKey('K,J,2', 'plain white colour', 'white', () => {tad.greywall(false);cMap.SetRenderState('color'); RGXX.backgroundwhite = 1; });
    GUIKey('K,J,3', 'walls pattern', 'grey pattern', () => {cMap.SetRenderState('walls'); tad.greywall(G.wall_fluwidth = 0.001); tad.makewalls(); });
    GUIKey('K,J,4', 'walls mixed reflection', 'mixed reflection', () => {
        tad.greywall(false);
        cMap.SetRenderState(useKinect ? 'feedback' : 'fixpeekfeedbackbase');
        G.superwall = 0;
        RGG.wall_refl1 = 0.8; RGG.wall_refl2 = 0.2; RGG.wall_refl3 = 1;
        RGG.wall_reflred = RGG.wall_reflgreen = RGG.wall_reflblue = 0.99;
        tad.makewalls();
    });
    GUIKey('K,J,5', 'walls all reflection', 'all reflection', () => {
        tad.greywall(false);
        cMap.SetRenderState(useKinect ? 'feedback' : 'fixpeekfeedbackbase');
        setInput(WA.FLATMAP, true);
        // RGG.feed scale = 0.7
        feed.fp.scale = 1/0.7;
        RGG.centrerefl = 0.5;
        RGG.superwall = 0;
        RGG.wall_refl1 = RGG.wall_refl2 = RGG.wall_refl3 = 0.99;
        RGG.wall_reflred = RGG.wall_reflgreen = RGG.wall_reflblue = 1;
        tad.makewalls({hideWalls: false});
    });
    GUIKey('K,J,5X', 'big walls all reflection', 'big wall reflection', () => {
        runkeys('L,K,5')
        const d = tad.covdef ? tad.covdef.d : 3;
        tad.makewalls({hideWalls: true, d});
    });
    GUIKey('K,J,6', 'walls tinted reflection', 'tinted reflection', () => {
        tad.greywall(false);
        cMap.SetRenderState(useKinect ? 'feedback' : 'fixpeekfeedbackbase');
        G.superwall = 0;
        RGG.wall_refl1 = RGG.wall_refl2 = RGG.wall_refl3 = 0.99;
        RGG.wall_reflred = 1; RGG.wall_reflgreen = 0.2; RGG.wall_reflblue = 1;
        tad.makewalls();
    });
    GUIKey('K,J,7', 'inverse shadows', 'inverse shadows', () => tad.invshad());
    GUIKey('K,J,8', 'walls flat grey', 'flat grey', () => {
        cMap.SetRenderState('walls');
        tad.covdef.hideWalls = false;
        tad.covidSetScene()
        tad.greywall(G.wall_fluwidth = 0);
    });
    GUIKey('K,J,9', 'single back white wall', 'white back wall', () => {march2021(); });
    GUISpacer(7);


    GUIKey('K,J,0', 'square wall', 'sqr wall', () => {  if (cMap.renderState === 'color') runkeys('K,J,3'); tad.covidSetScene({w:3, h:3, aspect: 1}) });
    GUIKey('K,J,AA', 'Ax ratio wall', 'Ax ratio wall', () => {  if (cMap.renderState === 'color') runkeys('K,J,3'); tad.covidSetScene({aspect: Math.sqrt(2)}) });
    GUIKey('K,J,W', 'wide wall', 'wide wall', () => {  if (cMap.renderState === 'color') runkeys('K,J,3'); tad.covidSetScene({aspect: tadbwSetup.aspect}) });
    GUIKey('K,J,-', 'standard aspect wall', 'std wall', () => {  if (cMap.renderState === 'color') runkeys('K,J,3'); tad.covidSetScene({aspect: 1920/1080}) });
    GUIKey('K,J,A-', 'custom aspect wall', 'custom wall', async () => {
        const asps = prompt('enter aspect for wall, can be expressions such as "2911 / 2326" ', "2911 / 2326")
        const aspect = evalq(asps);
        if (cMap.renderState === 'color') runkeys('K,J,3');
        tad.covidSetScene({aspect})
    });
    if (tad.docovid) {
        // bb.push({})
        GUIKey('Home', 'home to tad.covidSetScene()', 'home', () => {
            home(lastDispobj);
            if (lastDispobj.vn === mainvp || lastDispobj === NODO) tad.covidSetScene()
            });
        GUIKey('shift,Home', 'home to default tad.covidSetScene()', 'default home', () => {
            if (lastDispobj.vn === mainvp || lastDispobj === NODO) {
                Object.assign(tad.covdef, tad.defaultCovdef);
                tad.covidSetScene();
            } else {
                runkeys('shift,Home', undefined, undefined, false);
            }
        });
    }

    tad.wallchoice = GUISpacer();
    GX.getgui('walls/black').highlight();

    // d.add(G, 'edgeprop', 0, 1, 0.01, 'definition of edges', 'range from colour to edgecol (default black)').listen();
    sgui.add(tad.covdef, 'w', 0, 20, 0.1, 'room width', 'room width, set from height and aspect if aspect not 0').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'h', 0, 20, 0.1, 'room height', 'room height').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'd', 0, 20, 0.1, 'room depth', 'room depth').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'aspect', 0, 3, 0.001, 'room aspect', 'room aspect, 0 use width and height').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'fixFloor', -3, 3, 0.01, 'floor', 'floor').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'hideWalls', 'hide side/top walls', 'hide side/top walls').listen().onChange(tad.covidSetScene)

    //sgui.add(tad.covdef, 'fov', 5, 50, 0.1, 'camera fov', 'camera fov').listen().onChange(tad.covidSetScene)
    sgui.add(tad.covdef, 'camz', -20, -5, 0.1, 'camera dist', 'camera dist (mouse wheel)').listen().onChange(tad.covidSetScene)
    // using
    sgui.add(tad.covdef, 'fovmult', 0.5, 2, 0.01, 'fov multiplier', 'fov relative to automatic camera fov').listen().onChange(tad.covidSetScene);
    // both _Uscale and _tad_h_scaleK had issues matching correct tadkin inputs
    // if (!('_Uscale' in G)) G._uScale = 1;
    // sgui.add(G, '_uScale', 0.5, 5, 0.01, 'object size', 'object size, mouse centre drag').listen().onChange(tad.covidSetScene);
    // if (!('_tad_h_scaleK' in G)) G._tad_h_scaleK = 1;
    // sgui.add(G, '_tad_h_scaleK', 0.5, 5, 0.01, 'object size', 'object size, mouse centre drag').listen().onChange(tad.covidSetScene);
    sgui.add(tad, 'rolescale', 0.5, 5, 0.01, 'object size', 'object size').listen().onChange(tad.covidSetScene);
    // sgui.add(xx, 'camdist', 0, 25, 0.01, 'camera distance', 'camera distance, mouse wheel');

    if (tadkin?.kincamscale) {
        sgui.add(tadkin.kincamscale, 'x', 0.1, 4, 0.01, 'x scale for interaction', 'x scale for interaction').listen();
        sgui.add(tadkin.kincamscale, 'y', 0.1, 4, 0.01, 'y scale for interaction', 'y scale for interaction').listen();
        sgui.add(tadkin.kincamscale, 'z', 0.1, 4, 0.01, 'z scale for interaction', 'z scale for interaction').listen();
    }


    GUISpacer(6);
    GUIKey('K,J,A', 'drawing', 'drawing mode (black/white)', () => {
        inps.EDGES = true;
        RGG.edgeprop = 1;
        RGG.fillprop = 1;
        RGG.edgeidlow = 3;  // so walls take normal texture etc etc
        RGG.wall_shadowstrength = 1;        // effectively no shadows
        Rtad.tadrad = 1;
        if (tadkin) tadkin.ribsPerMetre = 1000;
        U.edgecol.setScalar(0);
        U.fillcol.setScalar(1);
        RGXX.backgroundwhite = 1; RGXX.whitenessforfill = 1; RGXX.whitenessforedges = 0;
        onframe(() => updateGuiGenes());   // deferring this means it will happen after any other callers have done their bit
    });
    GUIKey('K,J,A,I', 'white/black', 'white/black', () => {
        runkeys('K,J,A');
        RGXX.backgroundwhite = 1; RGXX.whitenessforfill = 0; RGXX.whitenessforedges = 1;
    });
    GUIKey('K,J,A,S', 'stained glass', 'stained glass', () => {
        runkeys('K,J,A');
        RGG.fillprop = 0;
        RGXX.backgroundwhite = 1; RGXX.whitenessforfill = 1; RGXX.whitenessforedges = 0.33;
    });
    GUIKey('K,J,A,B', 'lino', 'lino style', () => {
        runkeys('K,J,A');
        Rtadkin.ribsPerMetre = 100;
        Rtad.tadrad = 0.3; updateGuiGenes();
        RGXX.backgroundwhite = 0; RGXX.whitenessforfill = 0; RGXX.whitenessforedges = 1;
    });
    GUIKey('K,J,A,C', 'minimal bw', 'minimal black.white', () => {runkeys('K,J,A'); Rtadkin.ribsPerMetre = 100; Rtad.tadrad = 0.3; });
    GUIKey('K,J,B', 'exit drawing', 'exit drawing mode', () => {
        RGG.edgeprop = 0;
        RGG.fillprop = 0;
        RGG.wall_shadowstrength = 0;
        Rtad.tadrad = 1;
        updateGuiGenes();
    });
    GUISpacer(6);
    GX.getgui('walls/exitdrawingmode').highlight();

    if (tadkin) {
        GUISpacer(6);
        GUIKey('K,J,H,D', 'man bw', 'man only in black.white', () => { runkeys('K,J,A'); runkeys('K,J,H,F'); });
        GUIKey('K,J,H,E', 'man dark', 'man very dark', () => { runkeys('K,J,H,D'); U.fillcol.setScalar(0.0004); });
        GUIKey('K,J,H,F', 'man special', 'man only in special', () => { G.edgeidlow = tadkin.mancol - tadkin.mancolnum + 1; G.edgeidhigh = tadkin.mancol; });
        GUIKey('K,J,H,G', 'all special', 'all special', () => { G.edgeidlow = 0; G.edgeidhigh = 31; });
        GUIKey('K,J,H,I', 'mixed special', 'mixed special', () => { G.edgeidlow = 8; G.edgeidhigh = 16; });
        GUIKey('K,J,H,L', 'none special', 'none special', () => { G.edgeidlow = 32; });
        GUIFinishPanel();
        GX.getgui('walls/nonespecial').highlight();
    }
    GUISpacer(6);

    if (!searchValues.notadgui) {
        const xx = {
            get back() { return bigcol.r ** (1/(currentGenes.gamma || 2.2)); },
            set back(v) { setBackgroundColor(v); },
            //get invert() { return U.edgecol.r; },
            //set invert(v) { U.edgecol.setRGB(v,v,v); U.fillcol.setRGB(1-v, 1-v, 1-v) ;},
            get edgewhite() { return U.edgecol.r ** 0.5; },
            set edgewhite(v) { U.edgecol.setScalar(v*v);},
            get fillwhite() { return U.fillcol.r ** 0.5; },
            set fillwhite(v) { U.fillcol.setScalar(v*v);},

        }
        const d = sgui.addFolder('drawing details')
        d.add(G, 'edgeprop', 0, 1, 0.01, 'definition of edges', 'range from colour to edgecol (default black)').listen();
        d.add(G, 'fillprop', 0, 1, 0.01, 'definition of fill area', 'range from colour to fiillcol (defaiult white)').listen();
        // d.add(xx, 'invert', 0, 1, 0.01, 'invert black/white', 'invert edgecol/fillcol\nn.b. colours available but no gui').listen();
        d.add(xx, 'edgewhite', 0, 1, 0.01, 'whiteness for edges', 'whiteness for edges\nn.b. colours available but no gui').listen();
        d.add(xx, 'fillwhite', 0, 1, 0.01, 'whiteness for fill', 'whiteness for fill\nn.b. colours available but no gui').listen();
        if ('tadrad' in tad) d.add(tad, 'tadrad', 0, 2, 0.01, 'relative tad radius', 'radius relative to normal').listen();
        if (tadkin) d.add(tadkin, 'ribsPerMetre', 0, 2500, 0.1, 'rib density (man)',
            'density of ribs, appproximately per metre\nApplies to green man style form only').listen();
        d.add(xx, 'back', 0, 1, 0.01, 'background white', 'whiteness of background').listen();
        guiFromGene(d, 'edgeidlow').listen();
        guiFromGene(d, 'edgeidhigh').listen();

        // await S.waitVal(() => tad.ribMult);
        const dd = sgui.addFolder('final save image details')
        const tga = WA.tgaspread;
        dd.add(tad, 'ribMult', 0, 5, 0.01, 'rib mult', 'rib mult').listen(); // ribMult now a property   .onChange(() => tad.applyRibMult());
        //dd.add(tga.feedback, 'thickness', 0, 3, 0.1, 'feedback thickness', 'feedback thickness').listen();
        //dd.add(tga.feedback, 'concentrateN', 0, 3, 1, 'feedback concentrate', 'feedback concentrate').listen();
        //dd.add(tga.main, 'thickness', 0, 3, 0.1, 'main thickness', 'main thickness').listen();
        //dd.add(tga.main, 'concentrateN', 0, 3, 1, 'main concentrate', 'main concentrate').listen();
        //dd.add(tga, 'usetga', 'use special', 'use special').listen();

        GUISpacer(7);
        GUIKey('K,save6k', 'save6k', 'save6k', async () => { await saveimage1high(1024*6); });
        GUIKey('K,8k', 'save8k', 'save8k', async () => { await saveimage1high(1024*8); });
        GUIKey('K,12k', 'save12k', 'save12k', async () => { await saveimage1high(1024*12); });
        GUIKey('K,16k', 'save16k', 'save16k', async () => { await saveimage1high(1024*16); });
        GUIKey('K,20k', 'save20k', 'save20k', async () => { await saveimage1high(1024*20); });
        GUIKey('K,30k', 'save30k', 'save30k', async () => { await saveimage1high(1024*30); });
        GUIKey('K,40k', 'save40k', 'save40k', async () => { await saveimage1high(1024*40); });
        GUIFinishPanel()._nosave = true;
    }
    guinewbw();
}

/** zoom camera in keeping shadows etc set */
function zoomCam(k = 4) {
    if (renderVR.invr()) return;  // cannot zoom camera in XR
    if (k < 0) return;  // work already done, rg by savegrametga tiling
    if (k <= 1) {camera.clearViewOffset(); return; }
    const C = new Proxy(canvas.style, {get: (o,n) => +(o[n].pre('px'))})
    // const x = feed.viewposx ?? lastdocx, y = (feed.viewposy ?? lastdocy);
    const ww = canvas.width; // C.width
    const hh = canvas.height; // C.height
    const x = oldlayerX, y = oldlayerY
    const xxx = copyXflip < 0 ? ww-x : x;
    camera.setViewOffset(ww*k, hh*k, xxx*k - 0.5*ww, (y*k) - 0.5*hh, ww, hh)

    //fitCanvasToWindow(1/k)
}


/** set up zooming preview; for edgezoom that is setting feed.viewfactor; which in turn causes camera.setViewOffset */
function showzoom(ff) {
    if (ff === 'clear') {
        if (feed.edgezoom) {
            feed.viewfactor = 0;
            fitCanvasToWindow();
        } else {
            if (keysdown[0] === 'ctrl') {
                DispobjC.fixlayerx = oldlayerX
                DispobjC.fixlayery = oldlayerY;
                return;
            }
            if (keysdown.length !== 0) return;  // do not get confused, eg after alt-p
            clearObjzoom();  // probably not needed as done immediately after zoom render33
            if (lastDispobj !== NODO) lastDispobj.render(); newmain(); onframe(newmain);
            DispobjC.zoom = 0;
            DispobjC.fixlayerx = DispobjC.fixlayery = undefined;
        }
        msgfix('zoom');
        return;
    }  // clear

    if (ml.capturingTime) return;  // do not allow this while capturing
    if (feed?.edgezoom) {
        feed.viewfactor = 4*ff || 10
        msgfix('zoom', `${feed.viewfactor} for ${feed.viewfactor*2}k image`);
    } else {
        DispobjC.zoom = Math.pow(2, ff/2);
        msgfix('zoom', DispobjC.zoom);
    }
}

function showzoomfix(ff) {
    if (ml.capturingTime) return;  // do not allow this while capturing
    if (ff == 'clear') {
        feed.viewfactor = 0;
        DispobjC.zoom = 0;
        feed.viewposx = feed.viewposy = undefined;
        return;
    }
    if (feed.edgezoom) {
        // showzoom('clear');
        feed.viewfactor = 4*ff;
        feed.viewposx = lastdocx;
        feed.viewposy = lastdocy;
        if (ff === 0) feed.viewposx = feed.viewposy = undefined;
    } else {
        DispobjC.zoom = (+ff || 10) * 1/inps.renderRatioUi
        msgfix('zoom', DispobjC.zoom);
    }

}

tadbwSetup.width = 10.7;  // 10.6 + 5cm left and right
tadbwSetup.height = 2.21;
tadbwSetup.aspect = tadbwSetup.width / tadbwSetup.height;

/** setup for bw rendering, especially wall */
async function tadbwSetup() {
    feed.test();
    G.OPOSZ=1;
    G.renderBackground=1;
    shadows(0);
    runkeys('K,J,3');
    await setviewedit();
    // feed.showfeed = true;
}

async function setviewedit() {
    new Viewedit({name: 'feed', top: "15px", left:"40%"})
    new Viewedit({name: 'edge', top: "15px", left:"60%"})
    new Viewedit({name: 'sys', top: "15px", left:"80%"})
    G._tad_h_ribs = tad.HEADS - 1;
    await S.frame(20);
    // sethighres(5e9);
    G._tad_h_ribs =  tad.HEADS - 1;
}

/** set up for potential China Creative Machine exhibition */
async function tadmanchesterSetup() {
    G.OPOSZ=1;
    G.renderBackground=1;
    shadows(7);
    await setviewedit();
    feed.showfeed = false;
}


function genfname(base = '', ext) {
    let f = getdesksave() + base +  (new Date().toISOString()).replace(/:/g, ".")
    if (ext) f += '.' + ext
    return f;
}

/** save lots of details */
async function saveLots(fid) {
    //const s = feed.corefixfeed
    //feed.corefixfeed = false
    //await S.frame();  // needed ?
    const nname = await GX.savegui(fid, true);    // save under user chosen name
    //feed.corefixfeed = s
    return nname;
}