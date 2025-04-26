// tracker version of dat.guiVR to capture fields
// we keep names and other details useful for save/restore
var dat, log, V, THREE,msgfixlog, fileTypeHandlers, localStorage, updateMat, W, S, getObjnames, getFileName, clone, throwe, keysdown,
onframe, saveAs, writetextremote, CSynth, Blob, openfiles, posturi, sensible, Maestro, CLeap, killev, G, camToGenes, msgfix, isCSynth, msgflash, openfile, islocalhost, serious,
makeLogval, refall, readtext, loadjs, currentGenes, xxxgenes, mainvp, tad, U, springs, getdesksave, fileExists, feed, Viewedit, readdir, renderVR, guiFromGene, objectDiff,
animdebugger, canvas, animdebugnewscene, defaultCanvasCursor,
patch_restoreGuiFromObject, nop, evalq, searchValues, running;  // for lint

dat.GUIVR.globalEvents.on('onPressed', e => {
    Maestro.trigger('datguiclick', e);
    if (CLeap) CLeap.lastClickTime = Date.now();
    V.resting = false;
});

var GX = {};  // really const, var for easier sharing
GX.guilist = [];  // list of active gui leaf elements
GX.hiddenlist = [];
GX.guiDictCache = {};
GX.clearAll = () => {
    dat.GUIVR.clearAll();
    GX.guilist = [];
    GX.guiDictCache = {};
}
GX.updateGuiDictCacheCount = 0;
/** update the cache, called when lookup fails
 * Attempt to keep sensibly up to date failed,
 * as creating new folders but not attaching them to a parent in time meant wrong mostName() keys were created.
 *
 * This means it gets called slightly more than it should, but that isn't too expensive.
*/
GX.updateGuiDictCache = () => {
    GX.updateGuiDictCacheCount++;
    return GX.guiDictCache = GX.guilist.reduce( (c,v) => {
        const k = GX.keymap(v.mostName());
        c[k] = v; return c}
    , {});
}
//guidict is called a lot, should be cached. ~~ cache is refreshed on cache failures
GX.guidict = () => GX.guiDictCache;

// Permit mapping as values in gui change
// This is not really a very extensible mechanism, we may want to add a guid, canonical name or similar
// first mapping for values
GX.vmap = {
    'current springdef': 'current dynamics model',
    'current xyz': 'current distances'
};
GX.valmap = function(v) {
    return GX.vmap[v] || v;
}

// NOTE that CSynth.press() in springsynth.js also fiddles near internals of dat.guiVR

// then mapping for keys (needs to allow for / structure)
GX.kmap = {
    'bed annotation data': 'annotations'
}
GX.keymap = function(vv1) {
    // ignore case and many special characters, keep _
    // no just ignore case and blanks
    // const vva = vv1.toLowerCase().replace(/[ `~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\]/gi, '').split('/');
    const vva = vv1.toLowerCase().replace(/ /g,'').split('/');
    const vv2 = vva.map(v => GX.kmap[v] || v);
    return vv2.join('/');
}


GX.defaultHeight = 0.08;

/** add an item to the list, guiDictCache will be updated later on cache lookup failure */
GX.addToDict = function(xx) {
    GX.guilist.push(xx);
}

GX.addButton = function addButton(func, propertyName, tip = propertyName) {
    return this.addImageButtonPanel(3,
        {},
        {text: propertyName,  func, tip}
        ).setRowHeight(0.075);
}


var tadkin, edge, COL, RGXX, OrganicSpeech, inps
GX.objname = function(o) {
    const nn = {G: currentGenes, U, tad, tadkin, W, feed, edge, COL, S, RGXX, inps, renderVR, springs, OrganicSpeech}
    // 'tadkin.sv': tadkin.sv, "COL.hsvopts": COL.hsvopts, "COL.ranges": COL.ranges, 'COL._randseed': COL._randseed, 'tad.rb': tad.rb,
    if (!GX.objmap) {
        const map = GX.objmap = new Map();
        for (const n in nn) map.set(nn[n], n);
    }
    const r = GX.objmap.get(o);
    if (r) return r;

    // try second level
    for (const n in nn) {
        if (!nn[n]) continue;
        const i = Object.values(nn[n]).indexOf(o);
        if (i !== -1)
            return n + '.' + Object.keys(nn[n])[i]
    }
}
GX.objmap = undefined;

/** add an item to a folder on the gui, mark up the item with its functional aspects, and keep track of added item */
GX.datGUIVRadd = function datGUIVRadd(object, propertyName, min, max, step, guiname, tooltip = guiname, listen=true) {
    if (object.isGXObject || object.isIBP || object.isPanel) {
        let o = object;
        if (o.isIBP) o = o.panel;
        const r = o.isPanel ?
            this.addImageButtonPanel(o.n, ...o.details) :
            this.add(o.object, o.propertyName, o._min, o._max, o._step, o.guiName, o.getToolTip())
        if (o.changeFunction) r.onChange(o.changeFunction);
        r.basekey = o.basekey ?? o.mostName();  // remember how we were created
        return r;
    }
    if (object.isFolder) return this.addFolder(object);
    const oname = GX.objname(object) || '?object?';
    tooltip = (tooltip ?? '') + '\n\n' + oname + '.' + propertyName;
    if (object.objName) {
        const nn = getObjnames();
        object = nn[object.ownerName][object.objName]
    }
    if (object[propertyName] === undefined) return console.log('cannot find property', propertyName, 'on', object);
    if (min === undefined) min = 0;
    if (max === undefined) max = object[propertyName] * 2;
    if (step === undefined) step = (max-min)/100;
//    if (!Viewedit.findobject(object))
//        log('create gui for unkown object, prop = ', propertyName)
    const xx = this.oldadd(object, propertyName, min, max);
    if (!xx.name) {
         console.error('NANANANANAANA', object, propertyName); return;
         debugger
    }
    xx.isGXObject = true;
    xx.object = object;
    xx.propertyName = propertyName;
    xx.guiName = guiname || propertyName;
    xx.name(xx.guiName);    // original name function
    if (xx.min) xx.min(min);
    if (xx.max) xx.max(max);
    if (xx.step) xx.step(step);
    // if (xx.step && ! GX._mat) {       // somewhat arbitrary way to capture the material used on a slider titles
    if (!GX._mat) {       // somewhat arbitrary way to capture the material used on a slider titles
        GX._mat = xx.children[0].material;  // steal reference material from standard
        GX._hovermat = GX._mat.clone();
        GX._selmat = GX._mat.clone();
        GX._mselmat = GX._mat.clone();
        GX._maskmat = GX._mat.clone();
        // colour setting left to update, otherwise datagui sometimes kills it
    }
    xx.folderParent = this; //already has folder property
    if (xx.setHeight) xx.setHeight(GX.defaultHeight);
    xx.lastValue = xx.initialValue = object[propertyName];

    xx.oldname = xx.name;  // warning: must be after setHeight which redefines name
    xx.oldmin = xx.min;
    xx.oldmax = xx.max;
    xx.oldstep = xx.step;
    xx.oldOnchange = xx.onChange;
    xx.oldSetToolTip = xx.setToolTip;
    xx.name = GX.datGUIVRname;
    xx.getValue = function() { return xx.object[xx.propertyName]; }
    xx.setValue = function(v) {
        if (xx.setting !== undefined && xx.setting === v) return;   // prevent recursion
        if (xx.setting !== undefined) console.error('bad recursive setValue', xx.fullName(), xx.setting, v);
        xx.setting = v;
        try {
            v = GX.valmap(v);
            xx.object[xx.propertyName] = v;
            // this helps make sure dropdowns got processed right, but can cause infinite recusion without changed check
            if (xx.userData.setValue) {
                if (xx.guiType === 'dropdown' && v === '')
                    log('?? dropdown', xx?.fullName(), xx.propertyName) // <<< TODO patch, why is this an issue
                else
                    xx.userData.setValue(v);
            }
            if (xx.changeFunction) xx.changeFunction(v);
            // if (xx.mychoose) xx.mychoose(v);    // set but not used yet, can cause some odd loops todo debug some time not urgent
        } catch (e) {
            log('error setting value for', xx.mostName(), v);
        }
        delete xx.setting;
    }
    xx.fullName = function() { return xx.folderParent.fullName() + '/' + xx.guiName; }
    xx.mostName = function() { return xx.folderParent.mostName() + '/' + xx.guiName; }
    xx.onChange = function(f) {
        xx.changeFunction = f;
        if (typeof xx.oldOnchange !== 'function') {
            console.error('no onChange for datgui property', propertyName, xx.mostName(), '. Possible error in gui.add() call arguments');
            return xx;
        } else {
            return xx.oldOnchange(f)
        }
    }
    xx.setToolTip = t => { xx.oldSetToolTip(t); return xx; }

    xx.hide = function() {
        if (xx._hidden) return;     // already hidden
        GX.hiddenlist.push(xx);
        xx._hidden = xx.spacing;    // spacing and height the same ???
        xx.setHeight(1e-10);
        onframe(() => GX.hiddenlist.forEach(x => x.visible = false));
    }

    xx.nosave = function(v = true) {xx._nosave = v; }

    xx.show = function() {
        if (!xx._hidden) return;     // already showing
        GX.hiddenlist = GX.hiddenlist.filter(i => i !== xx);
        xx.setHeight(xx._hidden );
        xx._hidden = undefined;
        xx.visible = true;

        onframe(() => GX.hiddenlist.forEach(x => x.visible = false));
    }


    if (typeof object[propertyName] === 'number') {
        xx._min = min;
        xx._max = max;
        xx._step = step;
        xx.min = function(v) { xx.oldmin(v); xx._min = v; return xx; }
        xx.max = function(v) { xx.oldmax(v); xx._max = v; return xx; }
        xx.step = function(v) { xx.oldstep(v); xx._step = v; return xx; }
        xx.normalizeRange = function(pedge = 0.1) { GX.normalizeRange(xx, pedge); }
    }
    GX.addToDict(xx);
    // GX.guiDictCache = undefined;
    if (tooltip !== undefined) xx.setToolTip(tooltip);
    if (listen && xx.listen) xx.listen();
    //??xx.basekey = xx.mostName();
    return xx;
}

GX.exclude = [];

/** add a folder as child of another folder */
GX.datGUIVRaddFolder = function(folder) {
    if (!folder) return;
    if (typeof folder === 'string') folder = dat.GUIVR.createX(folder);
    folder.folderParent = this;
    const hide = (GX.exclude.includes(folder.folderName));

    if (this === V.gui || hide) folder.detachable = true;
    const r = this.oldaddFolder(folder);
    if (hide) {
        folder.detach();
        folder.visible = false;
        folder.position.set(10000,0,0);
    }
    GX.addToDict(folder);
    // GX.guiDictCache = undefined;
    return folder;
}

/** note, extra complication as the original three objects get replaced somewhere during processing,
 * so xx as captured below it not what is seen in the real three graph.
  */
GX.datGUIVRaddImageButtonPanel = function(n, ...details) {
    const me = this;
    const panel = {details, n, folderParent: me, isPanel: true}
    details.forEach(d => {
        if (!d.tip) {
            const key = d.key || d.text;
            d.tip = CSynth._msgs[key + '_hover'];
        }
        const func = d.func;
        d.func = () => { func(); panel.lastSelected = d}
    });
    const ibp = panel.ibp = me.oldaddImageButtonPanel(n, ...details);
    ibp.isIBP = true;
    ibp.panel = panel;
    CSynth.ret = ibp;
    const guics = [ibp.guiChildren, ibp.children[0].children.slice(1)]
    const rdetails = details.filter(d => d.text);
    if (rdetails.length === 0) return ibp;
    for (const guic of guics) {
        if (guic.length !== rdetails.length)
            console.error('bad datGUIVRaddImageButtonPanel', ...details);
            rdetails.forEach((d,i) => {
                const xx = guic[i];
                //xx.definition = d;
                // d.gui = xx;
                // xx.guiName = d.text;
                // xx.name = xx.guiName;
                // xx.folderParent = me;
                // xx.panelDetails = panel;
                // xx.fullName = function() { return xx.folderParent.fullName() + '/' + xx.guiName; }
                // xx.mostName = function() { return xx.folderParent.mostName() + '/' + xx.guiName; }
                // xx.press = function() { xx.interaction.events.emit('onPressed',{}); }
                // xx.highlight = function() { // highllight but don't do press action
                //     const s = d.func;
                //     d.func = () => {};
                //     panel.lastSelected = d;
                //     xx.interaction.events.emit('onPressed',{});
                //     d.func = s;
                // }
                // GX.addToDict(xx);
        });
    }
    let panelname = rdetails[0].text;
    panelname = panelname[0] + '_' + panelname.substring(1); // insert _ to make name unique
    ibp.guiName = panel.guiName = panelname;
    ibp.fullName = panel.fullName = function() { return me.fullName() + '/' + panelname; }
    ibp.mostName = panel.mostName = function() { return me.mostName() + '/' + panelname; }
    panel.getValue = function() {
        if (!panel.lastSelected) return undefined;
        if (panel.lastSelected.mostName) return panel.lastSelected.mostName();
        if (panel.lastSelected.gui?.mostName) return panel.lastSelected.gui.mostName();
        return undefined;
    }
    panel.setValue = function(str) { const gui = panel.lastSelected = GX.getgui(str); gui.press(); }    // todo more checking

    GX.addToDict(panel);

    return ibp;
}

GX.datGUIVRname = function(name) {
    delete GX.guiDictCache[GX.keymap(this.mostName())];
    this.guiName = name;
    GX.guiDictCache[GX.keymap(this.mostName())] = this;
    //bad bad not good. Exception occurs in seemingly innocuous circumstances: as encountered in springsynth extras:
    //extras.add({go: ()=>CSynth.annotationGroup.init Springs()}, 'go').name('annotation springs (experimental)');
    //bizarre WTF 'oldname === ""' in datguix when this line is added????
    //extras.add({xoxo: ()=>CSynth.annotationGroup.init SpringsB()}, 'go2').name('annotation springs');


    return this.oldname(name);
}

dat.GUIVR.createX = function(guiName) {
    // if (GX.exclude.includes(name)) return;  // too early to kill ... the caller wants a gui to fill in to

    // log('addFolder', guiName);
    const xx = dat.GUIVR.createOLD(guiName);
    xx.guiName = guiName;
    xx.name(xx.guiName);
    xx.oldadd = xx.add;
    xx.add = GX.datGUIVRadd;
    xx.addButton = GX.addButton;
    xx.addlog = (obj, prop, ...args) => xx.add(makeLogval(obj, prop), prop, ...args);
    //xx.oldaddDropdown = xx.addDropdown;
    //xx.addDropdown = GX.datGUIVRaddDropdown;
    xx.oldaddFolder = xx.addFolder;
    xx.addFolder = GX.datGUIVRaddFolder;
    xx.oldaddImageButtonPanel = xx.addImageButtonPanel;
    xx.addImageButtonPanel = GX.datGUIVRaddImageButtonPanel;
    xx.oldname = xx.name;
    xx.name = GX.datGUIVRname;
    xx.folderName = guiName;
    xx.folderList = function() { const l = (this.folderParent ? this.folderParent.folderList() : []); l.push(this); return l; };
    xx.fullName = function() { return this.folderList().map(x=>x.folderName).join('/'); };
    xx.mostName = function() { return this.folderList().slice(1).map(x=>x.folderName).join('/'); }
    xx.isFree = function() { return this.parent === V.nocamscene };

    xx.folderParent = null;
    return xx;
}
dat.GUIVR.createOLD = dat.GUIVR.create;
dat.GUIVR.create = dat.GUIVR.createX;

GX.getNewFilename = function(name, extension, force=false) {
    if (!name || force) {
        const p = `enter name for ${extension} file.

${GX.prompt}`;
        if (name !== '>initial.settings') name = window.prompt(p, name ?? '');
    }
    return name;
}

GX.saveguiString = function(pref='') {
    const r = {};
    const s = currentGenes; // in case called with currentGenes masked, temporarily unmask
    if (!currentGenes) currentGenes = xxxgenes(mainvp);
    GX.guilist.forEach(x => {
        const name = x.mostName();
        if (x.getValue && !x._nosave && name.startsWith(pref)) {  // not for folders
            let v = x.getValue();
            if (v instanceof THREE.Color) v = {r: v.r, g:v.g, b: v.b, '$$=type': 'colour'};  // THREE does horrible things with toJSON()
            r[name] = v;
        }
    });
    currentGenes = s;
    return r;
}

/** save the gui, plus tad related details. TODO, make the extra detail saving more structured, eg callback */
GX.savegui = async function(name = '', full = false, xextension = '') {
    let extension = '.settings';
    if (xextension) extension = '.' + xextension + extension;
    name = GX.getNewFilename(name || GX.getValue('/Files:').replace('.settings',''), extension, !name.contains('!'));
    if (!name) { log('no name, GX.savegui aborted'); return; }
    const r = GX.saveguiString(xextension ? xextension + '/' : '');

    if (tad?.TADS && tad?.T[0]) {
        // tad.captureOrientation({save: false});
        r._pullspringmat = U.pullspringmat;
    }
    // tad.captureOrientation should set _rot4_ele to identity anyway
    r._rot4_ele = G ? G._rot4_ele : [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    r._uScale = G._uScale;
    // await S.frame()
    r._springlen = G.springlen
    r.EVAL = GX.EVAL;
    if (full)
        r._positions = springs.getpos()
    const vv = JSON.stringify(r, undefined, '\t');

    const fname = name + (name.endsWith(extension) ? '' : extension);
    GX.write(fname, vv);
    return fname;
}

/** GX.restoregui may be given just a filename, or data + filename */
GX.restoregui = function(pname, opt = {}) {
    if (!pname) throwe('GX.restoregui required pname parameter')
    let name, sss, tyopt = typeof opt, allowmissing, adddefault, xname; // savedSetString
    if (tyopt === 'object') {
        name = pname;
        ({allowmissing, adddefault, xname} = opt)
        sss = typeof name === 'object' ? name : GX.read(name, allowmissing);
    } else if (tyopt === 'string') { // drag drop, copy paste
        name = opt;
        sss = pname;
    }

    if (!sss) {
        if (!allowmissing) msgfixlog('no saved gui set', name);
        return false;
    }
    // special case to catch irritating indireect by Oxford server for missing files
    // TODO: should not still be needed
    if (typeof sss === 'string') {
        if (sss.trim()[0] === '<' && sss.indexOf('File is unknown in this project') !== -1) { msgfixlog('no saved gui set', name); return false; }
        if (sss.trim()[0] !== '{') { loadjs(sss, name); return; }  // allow for pure java settings files
    }
    const r = typeof sss === 'object' ? sss : JSON.parse(sss);   // recover and parse saved set
    if (r.target) {
        const targ = window[r.target];
        delete r.target;
        GX.restoreGeneral(r, targ, r.target);
    } else {
        r._sourceName = opt.xname;
        GX.restoreGuiFromObject(r);
    }
    S.jump();
    lastset();
    xname = xname ?? name.split('/').pop();
    const gui = GX.getgui('files/files.settings')
    for (const fn of gui.files) if (fn.toLowerCase() === xname.toLowerCase()) xname = fn;
    GX.getgui('/files:').setValue(xname);
    gui.setValue(xname);


    // to repeat restore of these over a few frames, they may get overridden async by side-effect of other parts of restore
    async function lastset(n = 5) {
        if (searchValues.tadchina && r['kinect/g_reen man highres'] === 'kinect/green man highres') return;
        for (let i = 0; i < n; i++) {
            // apply these last, after jump() , .orient files may have been brought in when selecting the form
            if (r._rot4_ele) {G._rot4_ele.set(r._rot4_ele); camToGenes(G); }
            if (r._uScale) G._uScale = r._uScale;
            if (r._pullspringmat && tad?.TADS) U.pullspringmat.elements = r._pullspringmat.elements;
            if (r._positions) springs.setpos(r._positions);
            if (r._springlen) G.springlen = r._springlen;

            springs.pullsToFix(undefined, true, U.pullspringmat)

            // consider how to make this more restoreGeneral
            if (feed.fixfeed) feed.fixfeed = false;
            if (feed.corefixfeed) feed.corefixfeed = false;
            await S.frame();
        }
    }
}

/** restore lots of values into existing object(recursive): generic code, should not be in GX */
GX.restoreGeneral = function(ss, targ = window, env='') {
    if (!targ) return msgfixlog(env, `Cannot set fields in empty ${env}`);
    if (typeof targ !== 'object') return msgfixlog(env, `Cannot set fields in non-object ${targ} in ${env}`);
    for (let field in ss) {
        const nenv = env + '.' + field;
        if (field in targ) {
            const v = ss[field];
            if (typeof v === 'object') {
                GX.restoreGeneral(v, targ[field], nenv);
            } else {
                targ[field] = v;
            }
        } else {
            msgfixlog(nenv, `Cannot set field ${field} in ${env}`);
        }
    }
}

/** get the gui element for a key, undefined if none
 *  If an initial failure happens, update the cache and tries again.
 */
GX.getgui = function(km, retry = true) {
    const dict = GX.guiDictCache;
    let r;
    if (typeof km === 'string') {
        const k = GX.keymap(km);
        r = dict[k];      // find the current gui object
    } else {
        // assume regex
        for (let gn in dict) {
            if (gn.match(km)) {
                r = dict[gn];
                break;
            }
        }
    }
    if (retry && !r) {
        GX.updateGuiDictCache();
        r = GX.getgui(km, false);
    }
    return r;
}

// GX.restoreRamptime = 0;

// nb ^xxx$
GX.doNotRestore = ['files/Files.settings', 'files/Files.orgscript', '/Files:', "views/n_ormal view", 'syscontrols/speechRunning']; // , "randbait/" now in tadchinasetup
GX.restoreLast = ['files/Files.colourbin']

/** restore gui from object */
GX.restoreGuiFromObject = function(ss, opt) {
    window.dispatchEvent(new Event('prerestore'));  // if extra features are added not in old save files, prerestore can make them correct default
    const adddefault = opt?.adddefault ?? !keysdown.includes('Insert')
    if (adddefault && GX.defaultSettings) ss = Object.assign(clone(GX.defaultSettings), ss);
    const dict = GX.guidict();                  // get current objects for the keys
    // for (const km of GX.doNotRestore) delete ss[km];
    let n = 0;
    //await inttest('pass1')

    for (let km in ss) {
        for (const kill of GX.doNotRestore) {
            if (km.startsWith(kill))
                delete ss[km];
        }
    }
    if (ss['kinect/g_reen man highres'] === 'kinect/green man highres')
        delete ss['form/S_V40']

    // work in three passes. handle the buttons first, then the sliders which may have overridden the buttons, then the restoreLast
    for (let km in ss) {
        const v = ss[km];
        const k = GX.keymap(km);
        const guio = dict[k];      // find the current gui object
        if (guio && guio.isPanel && !(guio.guiName.startsWith('s_avegui'))) { // wertw4rtrwetrewtwet
            //await inttest(km,v)
            guio.setValue(v);
        }
    }
    S.process(true);

    //await inttest('pass2')
    // now the sliders etc
    COL.randcols2Pending = 1;  // avoid lots of repeated work as colour controls are updated, TODO more general mechanism??
    for (let km in ss) {
        const v = ss[km];
        const k = GX.keymap(km);
        // if (W.killcol && k.startsWith('colour/')) continue;    // <<<<< temp todo specific for china debug, now china specific doNotRestore for colour/
        const guio = dict[k];      // find the current gui object
        if (guio) {
            //await inttest(km,v)
            if (typeof v === 'object' && v['$$=type'] === 'colour') {
                guio.getValue(v).setRGB(v.r, v.g, v.b);
            } else if (guio.setValue && !guio.isPanel) {
                if (S.rampTime && !S.noramp) { // GX.restoreRamptime
                    S.ramp(guio, 'unused', v, S.rampTime); // was GX.restoreRamptime
                } else {
                    guio.setValue(v);
                }
            //else {} // done in first pass
            }
        } else {
            msgfixlog('cannot recover key', k, 'value=', v);
        }
    }
    log('calling randcols2 after pending calls', COL.randcols2Pending);
    COL.randcols2Pending = 0;  // avoid lots of repeated work as colour controls are updated, TODO more general mechanism??
    // S.process(true); // experiment to stop flashing, no help


    // now the special cases
    //await inttest('pass3')

    // restoreLast is probably only restoreLast case, so simplify
    // for (const km of GX.restoreLast) {
    //     const g = GX.getgui(km), v = ss[km];
    //     if (g && v !== undefined) {
    //         //await inttest(km,v)
    //         if (km === 'files/Files.colourbin' && v) {
    //             const hideload = async function () {
    //                 running = false;
    //                 await tad.colload(undefined, 'data/' + v)  // why does setValue not work for this case???, mychoose should help but causes loops
    //                 running = true;
    //             };
    //             hideload();
    //         } else {
    //             g.setValue(v);
    //         }
    //     }
    // }
    // probably not the best place to arbitarate between randcols2 and .colourbin ???
    const cbin = ss['files/Files.colourbin'];
    if (cbin && cbin !== '_none_.colourbin') {
        const hideload = async function () {
            // this prevents animatee displaying an inappropriate half and half frame,
            // but in experiments the async colload has always completed before the nexat animatee new frame anyway
            running = false;
            await tad.colload(undefined, 'data/' + cbin)  // why does setValue not work for this case???, mychoose should help but causes loops
            running = true;
        };
        hideload();
    } else {
        COL.applyGui();
        // COL.randcols2();
    }

    (patch_restoreGuiFromObject ?? nop)(ss)  // final custom patch, eg for china
    if (ss.EVAL) {
        evalq(ss.EVAL)
        for (let i=0; i < 5; i++) onframe(() => evalq(ss.EVAL), i)
    }
    GX.EVAL = ss.EVAL;


    //await inttest('pass endup')
    S.process(true); // experiment to stop flashing, no help
    if (tad.tadnum) tad.topos();

    animdebugger = animdebugnewscene; // force waits on each anim cycle to check bad transitions

    dispatchEvent(new Event('gxrestored'));
    return true;

    async function inttest(k,v) {
        W.xxxtest = W.xxxtest ?? 99999999
        n++
        log('inttest', n, k,v)
        if (n % W.xxxtest === 0 ) {
            log('WAIT', n, k,v)
            await S.interact();
        }
    }
}
fileTypeHandlers['.settings'] = GX.restoregui;

GX.getValue = function(k) {
    return GX.getgui(k)?.getValue();
}
GX.setValue = function(k, v, logerr = true) {
    const dictk = GX.getgui(k);
    if (dictk)
        dictk.setValue(v);
    else
        if (logerr) log('cannot set value', k, v);
    return v;
}
GX.setValueChanged = function(k, v, logerr = true) {
    const dictk = GX.getgui(k);
    if (!dictk) {
        if (logerr) log('cannot set value', k, v);
        return;
    }
    if (GX.getgui(k).getValue() !== v)
        dictk.setValue(v);
}

GX.incValue = function(km, v) {
    return GX.setValue(km, GX.getValue(km) + v);
}


/** apply a map over an object, function f is given object ane kay (often ignored) as parameters */
function objmap(o, f) {
    const r = {};
    for (let k in o) r[k] = f(o[k], k);
    return r;
}

/** filterr an object, function f is given object ane kay (often ignored) as parameters */
function objfilter(o, f) {
    const r = {};
    for (let k in o) if (f(o[k], k)) r[k] = o[k];
    return r;
}

// GX.folders = () => [...new Set(GX.guilist.map(g=>g.folderParent))];
GX.folders = () => GX.guilist.reduce((c,v) => {c[v.folderParent.mostName()] = v.folderParent; return c;}, {})
GX.layoutext = '.guilayout'
//GX.savePositions = {};
GX.saveFolderLayout = function(id) {
    const ext = GX.layoutext;
    if (!id) id = GX.getNewFilename('', ext)
    if (!id) return;
    if (!id.endsWith(ext)) id += ext;
    //TODO: some interface to get serializable format of folder.
    //the trouble with trying to save guiIndex here is that the un-detatched items will have an automatically generated guiIndex during layout.
    //perhaps if guiIndex was created more eagerly...
    // if (GX.guilist.length === 0) return;
    const r = objmap(GX.folders(), (f, k) => ( {name: k, position: f.position.clone(), detachable: f.detachable, guiIndex: f.guiIndex, free: f.isFree(), visible: f.visible, collapsed: f.isCollapsed()} ));
    GX.write(id, JSON.stringify(r));
    return r; // GX.savePositions[id] = r;
}

GX.restoreFolderLayout = function(id='>default') {
    // clean up old and make new
    const ext = GX.layoutext;
    let data;
    if (id[0] === '{') {
        data = id;
    } else {
        if (!id.endsWith(ext)) id += ext;
        data = GX.read(id);
    }
    if (!data && id === GX.browserprefix + 'auto') data = localStorage['layout' + id]; // backward compatability
    if (!data) { console.error('bad local stoarage', 'layout' + id); return; }
    let d = JSON.parse(data); // (localStorage['layout' + id]);
    if (!d) { console.error('bad local stoarage', 'layout' + id); return; }
    objmap(GX.folders(), function(f,k) {   // iterate over NEW folders
        const old = d[k];
        if (!old) return;
        f.visible = old.visible;
        if (old.free) {
            if (k !== '') f.detach();
            f.position.copy(old.position);
            f.updateMatrix();
            f.matrixWorldNeedsUpdate = true;
        } else {
            f.reattach();
            //f.updateMatrix(); //doesn't work here, but does work in performLayout (even before any properties are set)
            //onframe(f.updateMatrix);
        }
        if (old.collapsed) f.close(); else f.open();
    });
    //PJT: shouldn't be necessary, for some reason stopped working. Now doing child.updateMatrix in folder performLayout
    //don't fully understand why.
    //if (V.gui) V.gui.traverse(f => updateMat(f));  // sometimes needed after reattach ? of multiple folders
}

GX.openFolder = function(name) {
    if (name === undefined) for (const f of Object.values(GX.folders())) f.open()
    else GX.folders()[name].open();
}

GX.closeFolder = function(name) {
    if (name === undefined) for (const f of Object.values(GX.folders())) f.close()
    else GX.folders()[name].close();
}

GX.attachFolder = function(name) {
    if (name === undefined) for (const f of Object.values(GX.folders())) f.reattach()
    else GX.folders()[name].reattach();
}

GX.detachFolder = function(name) {
    if (name === undefined) for (const f of Object.values(GX.folders())) f.detach()
    else GX.folders()[name].detach();
}

//** temporary initializations to save/restore positions ***
GX.setupFolderLayoutVals = () => {
    if (GX.guilist.length === 0) { onframe(GX.setupFolderLayoutVals); return; }
    const r = GX.saveFolderLayout(GX.browserprefix + 'standard');    // standard is the setting from code before we play with it
    // if (!r['']) { onframe(GX.setupFolderLayoutVals); return; }
    GX.restoreFolderLayout(GX.browserprefix + 'auto');     // load the automatically saved layout from previous session; that will be the initial the user sees
    V.gui.visible = true;  // but force the gui to be visible
    GX.saveFolderLayout(GX.browserprefix + 'initial');     // save the initial position

    const p = GX.browserprefix;
    // GX.savegui(p + 'standard.settings'); // does not appear to be useful
    GX.write(p + 'previous.settings', GX.read(p + '!auto.settings'));
    // note, '>initial' set after customLoadDone() from springdemoinner onframe callback

    setInterval(() => {
        if (V.nocamscene.visible === false) return;
        GX.saveFolderLayout(GX.browserprefix + 'auto');
        GX.savegui(p + '!auto.settings');
        for (const f of Object.values(GX.folders())) if (f.isFree()) localStorage['lastfree' + f.guiName] = JSON.stringify(f.position);
    }, 1000);   // save the automatic position on a regular bases
};

window.addEventListener('load', ()=> {
    GX.setupFolderLayoutVals();
    //doesn't really belong in here, but Maestro undefined when script is first run...
    if (dat.GUIVR.autoUpdate) {
        dat.GUIVR.autoUpdate = false;
        Maestro.on('preframe', () => GX.update());
    }
});

GX.hovscale = 1.02;
GX.selectscale = 1.05;

GX.setcol = function(s, hover=true) {
    if (s === 'all') {
        GX.updateGuiDictCache();
        for (const x of Object.values(GX.guidict())) GX.setcol(x)
        return;
    }
    if (!s?.children?.[0]) return canvas.style.cursor = defaultCanvasCursor;
    canvas.style.cursor = '';
    if (s.isFolder) return; // don't change the folder materials, more complicated
    s.children[0].material = s === GX.selected ? GX._selmat :
        GX.sellist.includes(GX.lasto) ? GX._mselmat :
        s.folderParent === GX.lastSelectedFolder ? GX._mselmat :
        hover && s === GX.lasto ? GX._hovermat :
        GX._mat; // GX.lasto.scale.set(1, 1, 1);
}

GX.lastfree = {}

GX.update = function() {
    if (V.gui?.parent && !V.gui.parent.visible) {GX.interactions = []; GX.lasto = undefined; return;} // nv in VR, no gui.parent
    GX.lastmult0
    const interactions = GX.interactions = dat.GUIVR.update();

    // let folder = interactions[0]?.object;
    // while (folder && !folder.folderParent) folder = folder.parent;
    // let folderParent = GX.folderParent = folder?.folderParent;

        // below dynamic because dat.GUIVR.update() can upset it
    if (GX._hovermat) {
        GX._hovermat.color.setRGB(20,0,0);
        GX._selmat.color.setRGB(0,0,20);
        GX._mselmat.color.setRGB(0,20,0);
        GX._maskmat.color.setRGB(10,0,20);
    }
    GX.setcol(GX.lasto, false)
    GX.lasto = undefined;
    const f = interactions[0]?.object?.folder;
    const n = f?.guiName
    if (n && f.isFree()) {
        if (!GX.lastfree[n] && localStorage['lastfree' + n])
            f.position.copy(JSON.parse(localStorage['lastfree' + n]));  // first time seen this session, use localStorage
        if (GX.lastfree[n]?.beenfix)
            f.position.copy(GX.lastfree[n].pos)     // just been freed, so reset prefix position
        GX.lastfree[n] = {n, pos: f.position.clone(), f, beenfix: false}; // capture position while free
        localStorage['lastfree' + n] = JSON.stringify(f.position);
    } else if (GX.lastfree[n]) {
        GX.lastfree[n].beenfix = true;              // record this has been fixed so is candidate for restore
    }

    if (interactions.length !== 1) return;

    const maino = interactions[0].object.parent;
    // if (!maino.guiName && maino.guiType !== 'imagebuttongrid') {log('maino no guiName'); return; }
    if (!maino.guiName && maino.guiType !== 'imagebuttongrid') return;  // happens on hover over dropdown item
    // if (!maino.guiName || !maino.propertyName) return;
    // if (maino !== GX.selected) maino.children[0] .material = GX._hovermat; //.scale.set(GX.hovscale, GX.hovscale, GX.hovscale);
    GX.lasto = V.nocamscene.visible && !renderVR.invr() ? maino : undefined;
    GX.setcol(maino)
}

GX.saveFolder = function(f) {
    const list = f.guiChildren.filter(x=>x.isGXObject || x.isIBP).map(x => x.basekey).join('\n')
    GX.write('+' + f.mostName() + '.gxmenu', list)
}

GX.loadFolder = function(data, fn) {
    const fname = getFileName(fn.replace('.gxmenu',''));
    const old = GX.getgui(fname);
    if (old) GX.removeItem(old);
    const nn = V.gui.addFolder(fname);
    for (const l of data.split('\n')) {
        const s = GX.getgui(l);
        if (s)
            nn.add(s)
        else if (l.startsWith('GENE/'))
            guiFromGene(nn, l.post('/'));
        else
            log('cannot find gui for', l)
    }
    nn.open();
    nn.detach();
    nn.performLayout();
    nn.position.set(0.8, 0.8, 0.8);
    GX.lastSelectedFolder = nn;
    GX.setcol('all');
}
fileTypeHandlers['.gxmenu'] = GX.loadFolder;
fileTypeHandlers['.guilayout'] = GX.restoreFolderLayout;

GX.sellist = [];
GX.keyselect = async function(kev) {
    const s = GX.lasto;
    if (!s) return;
    switch(s.guiType) {

        case 'folder': {
            switch(kev.key) {
                case 's': GX.savegui('', false, s.guiName); break;
                case 'o': {
                    const r = await W.showOpenFilePicker({id: 'settings', types: [ {description: 'settings', accept: {'application/settings': ['.' + s.guiName + ".settings"]}} ]})
                    if (r?.[0]) openfile(r[0]);
                } break;
            }
        } break;

        case 'slider': {
            switch(kev.key) {
                case 'ArrowRight': s.setValue(s.getValue() + s._step); break;
                case 'ArrowLeft': s.setValue(s.getValue() - s._step); break;
                case 'ArrowUp': s.setValue(s.getValue() + s._step*10); break;
                case 'ArrowDown': s.setValue(s.getValue() - s._step*10); break;
            }
        } break;
    }
    killev(kev);  // kill whether handled or not
}

GX.mouseselect = function(mouseEvent) {
    const s = GX.lasto;
    let f = GX.lastSelectedFolder;
    try {
        if (mouseEvent.ctrlKey) {
            if (!s) { GX.lastSelectedFolder = undefined; return; }
            if (s.isFolder) { f = GX.lastSelectedFolder = s; return; }
            if (!f) {
                const name = prompt('name for new folder?', 'new folder');
                if (!name) return;
                f = GX.lastSelectedFolder = V.gui.addFolder(name)
                f.open();
                f.detach();
                f.position.set(0.8, 0.8, 0.8);
            }

            if (s.isGXObject || s.isIBP) {
                f.add(s);
            } else {
                let msg = 'ctrlclick';
                if (!s?.isGXObject) msg += '\nno appropriate item selected to add'
                msgfix(msg);
                msgflash({col: 'darkred', time: 500});
            }
            f.performLayout();  // just in case
            GX.saveFolder(f);
            return;
        }  // ctrlKey

        if (!s) { GX.selected = undefined; GX.html(); return; }
        GX.selected = GX.lasto;
        if (mouseEvent.button === 2) {
            if (!s?.getValue) return;
            const curval = s.getValue();
            if (curval !== s.initialValue) {
                s.lastValue = curval;
                s.setValue(s.initialValue);
            } else {
                s.setValue(s.lastValue);
            }
            return;
        }  // mouseEvent.button === 2
        GX.html();
    } finally {
        GX.setcol('all');
    }

// experiment for multiple select, but now just put straight into new menu
// if (mouseEvent.ctrlKey) {
//     const i = GX.sellist.indexOf(s);
//     if (i === -1) {
//         GX.sellist.push(s);
//         //s.children[0] .material = GX._mselmat;
//     } else {
//         GX.sellist.splice(i, 1);
//         //s.children[0] .material = GX._mat;
//     }
//     GX.setcol(s);
//     return;
// }
// if (mouseEvent.shiftKey) {
//     return;
// }

} // select()

GX._setselect = function() {
    if (W.canvas) {
        // note: 28 Apr 2022, was 'mouseup' as datguivr killed mousedown events
        // this meant sliding slider to left often gave a mouseup on the select area and brought up sn unwanted html gui
        // datguivr modified
        W.canvas.addEventListener('mousedown', GX.mouseselect)
        W.canvas.addEventListener('keydown', GX.keyselect)
    } else {
        setTimeout(GX._setselect, 100);
    }
}
GX._setselect();

/** x */

GX.browserprefix = '>';
GX.desktopprefix = '<';
GX.downloadprefix = '!';
GX.codesettingsprefix = '+';
GX.prefixes = GX.browserprefix + GX.desktopprefix + GX.downloadprefix + GX.codesettingsprefix;
GX.browserprefixkey = 'savelocal';
GX.browserprefixfull = GX.browserprefixkey + GX.browserprefix;
if (islocalhost) {
    GX.prompt = "Undecorated will save in Organic code settings directory";
    GX.defaultprefix = GX.codesettingsprefix
} else {
    GX.prompt = 'Undecorated will save in the browser local storage.';
    GX.defaultprefix = GX.browserprefix
}
GX.prompt += `
Start with ${GX.browserprefix} for local save in browser local storage.
Start with ${GX.desktopprefix} for local save in desktop/organicsaves.
Start with ${GX.downloadprefix} for download as file.
Start with ${GX.codesettingsprefix} for save in Organic code settings directory
`


GX.write = function(pname, vv) {
    const [prefix, nname] = GX.prefixes.contains(pname[0]) ? [pname[0], pname.substring(1)] : [GX.defaultprefix, pname]
    if (prefix === GX.browserprefix) {
        localStorage[GX.browserprefixkey + nname] = vv;
    } else if (prefix === GX.downloadprefix) {
        saveAs(new Blob([vv]), nname);
    } else if (prefix === GX.codesettingsprefix) {
        if (nname.contains('/') || nname.contains('\\'))
            writetextremote(nname, vv);
        else if (!isCSynth)
            writetextremote('settings/' + nname, vv);
        else
            writetextremote((CSynth.current ? CSynth.current.fullDir : '') + nname, vv);
    } else if (prefix === GX.desktopprefix) {  // no prefix => organicsaves
        const ds = getdesksave()
        writetextremote(name.startsWith(ds) ? name : (ds + name), vv)
    } else {
        serious('wrong prefix for GX.write')
    }
    if (CSynth.updateAvailableFiles) CSynth.updateAvailableFiles(undefined, name);
}

GX.read = function(pname, allowmissing) {
    const [prefix, nname] = GX.prefixes.contains(pname[0]) ? [pname[0], pname.substring(1)] : [GX.defaultprefix, pname]
    let sss;
    if (prefix === GX.browserprefix) {
        sss = localStorage[GX.browserprefixkey + nname];
    } else if (prefix === GX.downloadprefix) {
        sss = openfiles.dropped[nname];
    } else if (prefix === GX.codesettingsprefix) {
        sss = readcode(nname)
        // posturi((CSynth.current ? CSynth.current.fullDir : '') + cname, undefined, allowmissing);
    } else {  // no prefix => organicsaves
        const fname = getdesksave() + name;
        if (fileExists(fname)) {
            sss = readtext(fname);
        } else {
            sss = readcode(name);  // for backward compatibility
        }
    }
    return sss;

    // read from code/project directory, or anywhere if / or \ given
    function readcode(cname) {
        let ssss;
        if (cname.contains('/') || cname.contains('\\')) {
            ssss = readtext('/!' + cname);
        } else {
            ssss = posturi((CSynth.current ? CSynth.current.fullDir : '') + cname, undefined, allowmissing);
        }
        return ssss;
    }
}

GX.locallist = function() {
    const lll = Object.keys(localStorage).filter(x=>x.startsWith(GX.browserprefixfull)).map(x => x.substring(GX.browserprefixkey.length));
    Object.keys(openfiles.dropped).forEach(k => lll.push(GX.downloadprefix + k));
    return lll;
}

// change colors for item to
GX.color = function(item, col = 'restore') {
    const  gg = typeof item === 'string' ? GX.getgui(item) : item;
    if (!gg) return log('GX.color cannot find item', item);
    gg.traverse(n=> {
        if (n.material && n.material.color) {
            if (!n.basematerial) {
                n.basematerial = n.material;       // establish base/original just once
                n.colmaterial = n.material.clone();
                // n.colmaterial.color = n.colmaterial.color.clone();   // material clone did this
            }
            if (col === 'restore') {
                n.material = n.basematerial;
            } else {
                n.material = n.colmaterial;
                n.material.color.set(col);
            }
        }
    });
}

// remove item from gui; todo clean up way we preven picking working on removed items
GX.removeItem = function(key) {
    let ccc = typeof key === 'object' ? key : GX.getgui(key);
    if (!ccc || !ccc.folderParent) return log('attempt to remove bad gui item', key);

    // clean from guilist
    const mostName = ccc.mostName();
    for (let i = GX.guilist.length - 1; i >= 0; i--) {
        if (GX.guilist[i].mostName().startsWith(mostName)) {
            log('remove', GX.guilist[i].mostName());
            GX.guilist.splice(i, 1);
        }
    }
    delete GX.guiDictCache.key; //  = undefined;

    // clean from dat.GIOVR (mainly potential hit items they call controllers)
    // let guiParent = ccc.parent;
    // while (true) {
    //     if (guiParent.isFolder) break;
    //     guiParent = guiParent.parent;
    //     if (!guiParent) return console.error('attempt to remove bad gui item, no guiParent', key);
    // }
    const guiParent = ccc.folderParent;
    // if (!guiParent) return console.error('attempt to remove bad gui item, no guiParent', key);
    guiParent.remove(ccc);
    // return;

    // That should be enough but isn't, obliterate all children.
    const l = [];
    ccc.traverse(c => l.push(c));   // safe copy before tree destroys itself
    l.forEach(c => {
        c.visible = false;
        if (c.detach) c.detach();
        c.position.x = 99999;
        c.updateMatrix();
        if (c.parent) c.parent.remove(c);
    });
    GX.updateGuiDictCache();
    V.gui.requestLayout();
}

// close all folders
GX.closeAll = function() {
    for (const f in GX.folders()) if (f) GX.getgui(f).close()
}

// w.i.p. to find items currently hovered over
GX.findSelected = function() {
    return GX.selected ? [GX.selected] : [];
    // old findHover
    // const r = [];
    // GX.guilist.forEach(i => {
    //     if (i.interaction) {
    //         if (i.interaction.hovering()) r.push(i);
    //     } else if (i.hitscan[0].interaction) {
    //         if (i.hitscan[0].interaction.hovering()) r.push(i);
    //     } else if (i.guiType === 'dropdown') { //
    //     } else {
    //         let j = 7;
    //     }

    // });
    // return r;
}

/** normalize range according to current value */
GX.normalizeRange = function(xx, pedge = 0.4, extremeEdge = 0.1) {
    if (xx === undefined) {
        const r = GX.findSelected();
        if (r.length === 1)
            xx = r[0];
        else
            return msgfixlog('normalizeRange', 'wrong hover')
    }
    const old = [xx._min, xx._max, xx._step];  // for debug, to remove later
    if (isNaN(xx._min + xx._max + xx._step) || !xx.getValue)
        return msgfixlog('normalizeRange', 'unexpected value', xx.mostName(), xx._min, xx._max, xx._step);
    const v = xx.getValue();

    let rpos = (v - xx._min) / (xx._max - xx._min);
    let k = 1;
    if (rpos < extremeEdge && v !== 0 && xx._min !== 0) k = v / 3 / xx._min;
    else if (rpos < extremeEdge && v !== 0) k = v * 3 / xx._max;
    else if (rpos < pedge) k = 0.5;
    else if (rpos > (1-extremeEdge) && v !== 0) k = v * 3 / xx._max;
    else if (rpos > (1-pedge)) k = 2;
    xx.max(sensible(xx._max * k));
    xx.min(sensible(xx._min * k));
    xx.step(sensible(xx._step * k));


    msgfixlog('normalizeRange', 'normalized', xx.mostName(), v, xx._min, xx._max);
}

/** normalize ALL ranges (some are really not suited as the initial settings have meaningful limits) */
GX.normalizeRangeAll = () => GX.guilist.forEach(g => GX.normalizeRange(g));

var lastdocx, lastdocy;

/** hide hover element */
GX.hide = function(xx = GX.findSelected()[0]) {
    if (!xx) return;
    xx.hide();
}

/** show hover element */
GX.show = function(xx = GX.hiddenlist.pop()) {
    if (!xx) return;
    xx.show();
}

/** change value for hover element */
GX.hstep = function(steps, xx = GX.findSelected()[0]) {
    if (!xx) return;
    xx.setValue(xx.getValue() + steps * xx._step);
}

/** change scale and optionally value for hover element, relative to their current values */
GX.hscale = function(scalefac, xx = GX.findSelected()[0], changeValue = true) {
    if (!xx) return;
    if (changeValue) xx.setValue(xx.getValue() * scalefac);
    xx.min(xx._min * scalefac);
    xx.max(xx._max * scalefac);
    xx.step(xx._step * scalefac);
    GX.htmlUpdate(GX.htmlgx);
}

/** change scale for hover element as factor of current value*/
GX.autoscale = function(autofac = 2, xx = GX.findSelected()[0]) {
    const newmax = xx.getValue() * xx._max;
    let scalefac = newmax / xx._max;
    if (scalefac === 1) scalefac = 2;
    xx.min(xx._min * scalefac);
    xx.max(newmax);
    xx.step(xx._step * scalefac);
}



/** restore intial value */
GX.hinitval = function(xx = GX.findSelected()[0]) {
    if (!xx) return;
    xx.setValue(xx.initialValue);
    GX.htmlUpdate(GX.htmlgx);
}

/** copy item */
GX.copyitem = function(xx = GX.findSelected()[0]) {
    if (!xx) return;
    const nn='guiName propertyName _min  _max _step initialValue fullName'.split(' ')
    const r = {object: Viewedit.findobject(xx.object)}
    if (!r.object) return alert('cannot find owner object for ' + xx.fullName());
    for (const n of nn) r[n] = (typeof xx[n] === 'function') ? xx[n]() : xx[n];
    r.tooltip = xx.getToolTip();
    const t = JSON.stringify(r);
    log(t)
    if (document.hasFocus()) navigator.clipboard.writeText(t);
}

GX.pasteitem = async function(xx = GX.findSelected()[0]) {
    if (!xx) return;
    const text = await navigator.clipboard.readText()
    const r = JSON.parse(text);
    if (!r?.guiName) return alert('no guiName in pasted item');
    const par = xx.folderParent;
    const i = par.guiChildren.indexOf(xx)
    if (i === -1) return alert("'can't find gui position");
    const rr = par.add(r.object, r.propertyName, r._min, r._max, r._step, r.guiName,  r.tooltip, true);
    const ll = par.children[2].children;
    const rrr = ll.pop();
    if (rr !== rrr) return alert('unexpted positions')
    ll.splice(i+1,0,rr);
    par.performLayout();
}


/** change the current html element by factor */
GX.htmlfac = function(k) {
    if (GX.htmlele.display) return;
    // W._GXmin.value *= k;
    // W._GXmax.value *= k;
    // W._GXstep.value *= k;
    // W._GXvalue.value *= k;
    // W._GXvalue.onchange();
    GX.hscale(k, GX.htmlgx);
    GX.htmlUpdate(GX.htmlgx);
}

/** show an html menu for a hovered dataguivr one, the html menu has more function,
 * call with null to clear
  */
GX.html = function(xx = GX.findSelected()[0]) {
    let htmlele = GX.htmlele;
    if (!htmlele) {
        htmlele = GX.htmlele = document.createElement('div');
        htmlele.style.position = 'fixed';
        htmlele.style.zIndex = 99999;
        htmlele.style.backgroundColor = 'rgba(0,0,0,0.8)';
        document.body.append(GX.htmlele);
        const row = n => `
            <tr>
                <td>${n}</td>
                <td>
                    <input id="_GX${n}"  style="z-index: 9999; background-color: black; width: 10em;" type="number"></input>
                </td>
            </tr>
        `
        htmlele.onkeydown = (evt) => {
            let done = true;
            let k = evt.code;
            if (evt.shiftKey) k = 'S/' + k;
            switch (k) {
                case 'Escape':  GX.html(); break;
                case 'Enter': if (GX.lasthtmlkey === k) GX.html(); else done = false; break;
                case 'PageUp': GX.hscale(10); break;
                case 'PageDown': GX.hscale(1/10); break;
                case 'S/PageUp': GX.hscale(10, undefined, false); break;
                case 'S/PageDown': GX.hscale(1/10, undefined, false); break;
                case 'KeyD': GX.hinitval(); break;
                case 'KeyC': GX.copyitem(); break;
                case 'KeyX': GX.hide(); GX.html(); break;
                case 'KeyV': GX.pasteitem(); GX.html(); break;
                // case 'KeyC': navigator.clipboard.writeText('!gkey:' + W._GXname.innerText); break;
                default: done = false;
            }
            GX.lasthtmlkey = k;
            if (done) killev(evt);
        }
        GX.htmlele.innerHTML = `
    <div id="_GXname"><b>name</b></div><br>
    <table style="left: 10em">${row('value')} ${row('min')} ${row('max')} ${row('step')}</table>
    <br>
    Escape: exit box
    <br>
    D: reset default value
    <br>
    PageUp/Down: in/dec-crease value and range by 10
    <br>
    Shift~PageUp/Down: in/dec-crease range by 10
    <br>
    X: hide this gui item
    <br>
    C: copy this gui item (eg for alt-C paste to new gui) PENDING
    <br>
    V: paste copied item PENDING
    <br>
    .
`
    }
    if (!xx || xx._step === undefined || xx === GX.htmlgx) {
        GX.htmlgx = undefined;
        htmlele.style.display = 'none';
        return;
    }
    GX.htmlUpdate(xx);
}
GX.htmlUpdate = function (xx) {
    GX.lasthtmlkey = '';
    const hx = W._GXvalue;
    if (GX.htmlgx !== xx) {
        GX.htmlgx = xx;

        GX.htmlele.style.display = ''
        GX.htmlele.style.left = '';
        GX.htmlele.style.right = (innerWidth - lastdocx + 60) + 'px';
        GX.htmlele.style.top = (lastdocy+0) + 'px';
        W._GXname.innerHTML = xx.mostName();
        W._GXname.background = 'black';
        hx.onchange = () => xx.setValue(+hx.value);
        hx.focus();
        W._GXmin.onchange = () => xx.min(hx.min = +W._GXmin.value);
        W._GXmax.onchange = () => xx.max(hx.max = +W._GXmax.value);
        W._GXstep.onchange = () => xx.step(hx.step = +W._GXstep.value);
        // stop click-through, just mousemove seems enough, don't need mouse up/down or click?
        GX.htmlele.onmousemove = e => killev(e);
    }
    W._GXmin.value = hx.min = xx._min;
    W._GXmax.value = hx.max = xx._max;
    W._GXstep.value = hx.step = xx._step;
    hx.value = xx.getValue();
    setTimeout(() => {W._GXvalue.focus();}, 1)
}

// show items with potential tool tips but none yet set
GX.notip = function() {
    return GX.guilist.filter(g => g.setToolTip && !g.getToolTip()).map((g,i) => `"${g.mostName()}": ""`).join('\n');
}

/** make convenient objects for getting/setting gui values
 *
*/
var GXX, _R
GX.makegxx = function() {
    GX.updateGuiDictCache()
    // GXX uses pattern
    globalThis.GXX = new Proxy(GX.guiDictCache,{
        get: (o, n) => { const g = GX.getgui(new RegExp(n)); return g?.getValue ? g.getValue() : undefined},
        set: (o, n, v) => {const g = GX.getgui(new RegExp(n)); if (!g) return false; g.setValue(v); refall(); return true},
        ownKeys : (o) => Reflect.ownKeys(o)
    });
    RGXX = _R(GXX);


    // GX._ requires exact match
    GX._ = new Proxy(GX.guiDictCache,{
        get: (o, n) => o[n].getValue(),
        set: (o, n, v) => {if (!o[n]) return false; o[n].setValue(v); return true},
        ownKeys : (o) => Reflect.ownKeys(o)
    });
}

GX.lastfile = ''
GX.restorenextfile = function(r) {
    var files = Object.keys(readdir('settings')).filter(n=>n.endsWith('.settings'))
    files.sort();
    if (r) files.reverse();
    GX.lastfile = files[(files.indexOf(GX.lastfile) + 1) % files.length]
    log('restored file is', GX.lastfile)
    GX.restoregui(GX.lastfile)
}

GX.fileguis = {};
GX.filesGui = function(parent, ext, dir) {
    let files = readdir(dir);
    files = Object.keys(files).filter(x => x.endsWith(ext)).sort((a,b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    const fstr = files.join(',');                   // quick out if no change
    let fgui = GX.fileguis[ext];
    if (fstr === fgui?.last) return;

    let place, lastfile;

    if (fgui) {
        place = fgui.guinode.guiIndex;
        parent.remove(fgui.guinode);
    } else {
        fgui = GX.fileguis[ext] = {lastfile: '', last: fstr}
    }
    fgui.last = fstr
    const mychoose = fid => {
        log('>>>> load file', fid);
        const ffid = dir + '/' + fid;
        openfile({name: ffid, canonpath: ffid});
    };
    fgui.guinode = parent.add(fgui, 'lastfile' , files).name("Files" + ext).onChoose(mychoose);
    fgui.guinode.mychoose = mychoose;  // set but not used yet, can cause some odd loops todo debug some time not urgent
    if (place !== undefined) fgui.guinode.guiIndex = place;
    fgui.files = fgui.guinode.files = files

}

/** add a gene based item from the 'old' alt-C menu */
GX.addgene = function(gn) {
    const s = GX.lastSelectedFolder;
    if (!s) return;
    const gg = guiFromGene(s, gn);
    s.performLayout();  // just in case
    GX.saveFolder(s);
}

GX.compareSettings = function(a,b, {dir = 'settings/', ext='.settings', diff =  objectDiff, ignoreundefined = true} = {}) {
    let oa, ob;
    if (!a) {
        oa = GX.saveguiString()
    } else {
        const sa = GX.read(dir + a + ext)
        oa = JSON.parse(sa)
    }

    if (!b) {
        ob = GX.defaultSettings
    } else {
        const sb = GX.read(dir + b + ext)
        ob = JSON.parse(sb)
    }
    return diff(oa, ob, ignoreundefined)
}
