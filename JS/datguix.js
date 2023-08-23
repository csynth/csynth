// tracker version of dat.guiVR to capture fields
// we keep names and other details useful for save/restore
var dat, log, V, location, THREE,msgfixlog, fileTypeHandlers, localStorage, updateMat, W, S,
onframe, saveAs, writetextremote, CSynth, Blob, openfiles, posturi, sensible, Maestro, CLeap, killev, G, camToGenes, msgfix,
makeLogval, refall, readtext, loadjs, currentGenes, xxxgenes, mainvp, tad, U, springs, getdesksave, fileExists, feed, Viewedit;  // for lint

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

/** add an item to a folder on the gui, mark up the item with its functional aspects, and keep track of added item */
GX.datGUIVRadd = function(object, propertyName, min, max, step, guiname, tooltip, listen=true) {
    if (object.isFolder) return this.addFolder(object);
    if (object[propertyName] === undefined) return console.log('cannot find property', propertyName, 'on', object);
    if (min === undefined) min = 0;
    if (max === undefined) max = object[propertyName] * 2;
    if (step === undefined) step = (max-min)/100;
//    if (!Viewedit.findobject(object))
//        log('create gui for unkown object, prop = ', propertyName)
    const xx = this.oldadd(object, propertyName, min, max);
    xx.object = object;
    xx.propertyName = propertyName;
    xx.guiName = guiname || propertyName;
    xx.name(xx.guiName);    // original name function
    if (xx.min) xx.min(min);
    if (xx.max) xx.max(max);
    if (xx.step) xx.step(step);
    // if (xx.step && ! GX._mat) {       // somewhat arbitrary way to capture the material used on a slider titles
    if (!GX._mat) {       // somewhat arbitrary way to capture the material used on a slider titles
            GX._mat = xx.children[0].material;
        GX._hovermat = GX._mat.clone(); GX._hovermat.color.setRGB(3,3,0);
        GX._selmat = GX._mat.clone(); GX._selmat.color.setRGB(0,6,0);
        GX._maskmat = GX._mat.clone(); GX._maskmat.color.setRGB(3,0,6);
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
            if (xx.userData.setValue) xx.userData.setValue(v);
            if (xx.changeFunction) xx.changeFunction(v);
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
        xx.normalizeRange = function(edge = 0.1) { GX.normalizeRange(xx, edge); }
    }
    GX.addToDict(xx);
    // GX.guiDictCache = undefined;
    if (tooltip !== undefined) xx.setToolTip(tooltip);
    if (listen && xx.listen) xx.listen();
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
    const panel = {details, folderParent: me, isPanel: true}
    details.forEach(d => {
        if (!d.tip) {
            const key = d.key || d.text;
            d.tip = CSynth._msgs[key + '_hover'];
        }
        const func = d.func;
        d.func = () => { func(); panel.lastSelected = d}
    });
    const ibp = panel.ibp = me.oldaddImageButtonPanel(n, ...details);
    ibp.panel = panel;
    CSynth.ret = ibp;
    const guic = ibp.guiChildren;
    const rdetails = details.filter(d => d.text);
    if (guic.length !== rdetails.length)
        console.error('bad datGUIVRaddImageButtonPanel', ...details);
    if (rdetails.length === 0) return ibp;
    rdetails.forEach((d,i) => {
        const xx = guic[i];
        xx.definition = d;
        d.gui = xx;
        xx.guiName = d.text;
        xx.name = xx.guiName;
        xx.folderParent = me;
        xx.panelDetails = panel;
        xx.fullName = function() { return xx.folderParent.fullName() + '/' + xx.guiName; }
        xx.mostName = function() { return xx.folderParent.mostName() + '/' + xx.guiName; }
        xx.press = function() { xx.interaction.events.emit('onPressed',{}); }
        xx.highlight = function() { // highllight but don't do press action
            const s = d.func;
            d.func = () => {};
            panel.lastSelected = d;
            xx.interaction.events.emit('onPressed',{});
            d.func = s;
        }
        GX.addToDict(xx);
    });
    let panelname = rdetails[0].text;
    panelname = panelname[0] + '_' + panelname.substring(1); // insert _ to make name unique
    panel.guiName = panelname;
    panel.fullName = function() { return me.fullName() + '/' + panelname; }
    panel.mostName = function() { return me.mostName() + '/' + panelname; }
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

GX.getNewFilename = function(name, extension) {
    const _public = location.host === "csynth.molbiol.ox.ac.uk" && location.search.indexOf('?p=') === -1;
    if (!name) {
        let unp;
        if (_public)
            unp = 'Undecorated will save in the browser, cannot save to server for public projects.';
        else
            unp = "Undecorated will save in user's desktop/organicsaves.";
        var prompt = `enter name for ${extension} file.
        ${unp}
        Start with > for local save in browser.
        Start with ! for download as file.
        Start with + for save in Organic code.
        `
        name = window.prompt(prompt, '');
    }
    return name;
}

GX.saveguiString = function() {
    const r = {};
    const s = currentGenes; // in case called with currentGenes masked, temporarily unmask
    if (!currentGenes) currentGenes = xxxgenes(mainvp);
    GX.guilist.forEach(x => {
        if (x.getValue && !x._nosave) {  // not for folders
            let v = x.getValue();
            if (v instanceof THREE.Color) v = {r: v.r, g:v.g, b: v.b, '$$=type': 'colour'};  // THREE does horrible things with toJSON()
            r[x.mostName()] = v;
        }
    });
    currentGenes = s;
    return r;
}

/** save the gui, plus tad related details. TODO, make the extra detail saving more structured, eg callback */
GX.savegui = async function(name, full = false) {
    const extension = '.settings';
    name = GX.getNewFilename(name, extension);
    if (!name) { log('no name, GX.savegui aborted'); return; }
    const _public = location.host === "csynth.molbiol.ox.ac.uk" && location.search.indexOf('?p=') === -1;
    if (_public && name[0] !== '>' && name[0] !== '!') name = '>' + name;
    const r = GX.saveguiString();

    if (full) {
        if (tad?.TADS && tad?.T[0]) {
            // tad.captureOrientation({save: false});
            r._pullspringmat = U.pullspringmat;
        }
        // tad.captureOrientation should set _rot4_ele to identity anyway
        r._rot4_ele = G ? G._rot4_ele : [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
        r._uScale = G._uScale;
        // await S.frame()
        r._positions = springs.getpos()
        r._springlen = G.springlen
    }
    const vv = JSON.stringify(r, undefined, '\t');

    const fname = name + (name.endsWith(extension) ? '' : extension);
    GX.write(fname, vv);
    return fname;
}

/** GX.restoregui may be given just a filename, or data + filename */
GX.restoregui = function(pname='default', name2=undefined, allowmissing = false) {
    let name, sss; // savedSetString
    if (name2 === undefined) {
        name = pname;
        sss = GX.read(name, allowmissing);
    } else {
        name = name2;
        sss = pname;
    }

    if (!sss) {
        if (!allowmissing) msgfixlog('no saved gui set', name);
        return false;
    }
    // special case to catch irritating indireect by Oxford server for missing files
    // TODO: shuold not still be needed
    if (sss.trim()[0] === '<' && sss.indexOf('File is unknown in this project') !== -1) { msgfixlog('no saved gui set', name); return false; }
    if (sss.trim()[0] !== '{') { loadjs(sss, name); return; }  // allow for pure java settings files
    const r = JSON.parse(sss);   // recover and parse saved set
    if (r.target) {
        const targ = window[r.target];
        delete r.target;
        GX.restoreGeneral(r, targ, r.target);
    } else {
        GX.restoreGuiFromObject(r);
    }
    S.jump();
    lastset();

    // to repeat resotre of these over a few frames, they may get overridden async by side-effect of other parts of restore
    async function lastset() {
        for (let i = 0;i < 5; i++) {
            // apply these last, after jump() , .orient files may have been brought in when selecting the form
            if (r._rot4_ele) {G._rot4_ele.set(r._rot4_ele); camToGenes(G); }
            if (r._uScale) G._uScale = r._uScale;
            if (r._pullspringmat && tad?.TADS) U.pullspringmat.elements = r._pullspringmat.elements;
            if (r._positions) springs.setpos(r._positions);
            if (r._springlen) G.springlen = r._springlen;

            // consider how to make this more restoreGeneral
            feed.fixfeed = feed.corefixfeed = false;
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

/** restore gui from object */
GX.restoreGuiFromObject = function(ss) {
    const dict = GX.guidict();                  // get current objects for the keys

    // work in two passes. handle the buttons first, then the sliders which may have overridden the buttons
    for (let km in ss) {
        const v = ss[km];
        const k = GX.keymap(km);
        const guio = dict[k];      // find the current gui object
        if (guio && guio.isPanel && guio.guiName !== 's_avegui')
            guio.setValue(v);
    }

    // now the sliders etc
    for (let km in ss) {
        const v = ss[km];
        const k = GX.keymap(km);
        const guio = dict[k];      // find the current gui object
        if (guio) {
            if (typeof v === 'object' && v['$$=type'] === 'colour') {
                guio.getValue(v).setRGB(v.r, v.g, v.b);
            } else if (guio.setValue && !guio.isPanel) {
                if (S.rampTime) { // GX.restoreRamptime
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
    return true;
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
GX.savePositions = {};
GX.saveFolderLayout = function(id) {
    //TODO: some interface to get serializable format of folder.
    //the trouble with trying to save guiIndex here is that the un-detatched items will have an automatically generated guiIndex during layout.
    //perhaps if guiIndex was created more eagerly...
    const r = objmap(GX.folders(), (f, k) => ( {name: k, position: f.position.clone(), detachable: f.detachable, guiIndex: f.guiIndex, free: f.isFree(), visible: f.visible, collapsed: f.isCollapsed()} ));
    localStorage['layout' + id] = JSON.stringify(r);
    return GX.savePositions[id] = r;
}

GX.openFolder = function(name) {
    GX.folders()[name].open();
}

GX.closeFolder = function(name) {
    GX.folders()[name].close();
}

GX.restoreFolderLayout = function(id='default') {
    // clean up old and make new

    let d = GX.savePositions[id];
    if (!d) {
        const data = localStorage['layout' + id];
        if (!data) { console.error('bad local stoarage', 'layout' + id); return; }
        d = JSON.parse(localStorage['layout' + id]);
    }
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

//** temporary initializations to save/restore positions ***
GX.setupFolderLayoutVals = () => {
    const r = GX.saveFolderLayout('standard');    // standard is the setting from code before we play with it
    if (!r['']) { onframe(GX.setupFolderLayoutVals); return; }
    GX.restoreFolderLayout('auto');     // load the automatically saved layout from previous session; that will be the initial the user sees
    V.gui.visible = true;  // but force the gui to be visible
    GX.saveFolderLayout('initial');     // save the initial position

    const p = GX.localprefix;
    // GX.savegui(p + 'standard.settings'); // does not appear to be useful
    GX.write(p + 'previous.settings', GX.read(p + '!auto.settings'));
    // note, '>initial' set after customLoadDone() from springdemoinner onframe callback

    setInterval(() => {
        GX.saveFolderLayout('auto');
        GX.savegui(p + '!auto.settings');
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

GX.update = function() {
    if (!V.gui?.parent?.visible) {GX.interactions = []; return;}
    const interactions = GX.interactions = dat.GUIVR.update();
    if (GX.lasto && GX.lasto !== GX.selected)
        GX.lasto.children[0].material = GX.lasto.lastValue === undefined ? GX._mat : GX._maskmat; // GX.lasto.scale.set(1, 1, 1);
    GX.lasto = undefined;
    if (interactions.length !== 1) {
        return;
    }
    const maino = interactions[0].object.parent;
    if (!maino.guiName || !maino.propertyName) return;
    if (maino !== GX.selected) maino.children[0].material = GX._hovermat; //.scale.set(GX.hovscale, GX.hovscale, GX.hovscale);
    GX.lasto = maino;
}

GX.select = function(mouseEvent) {
    if (GX.selected) GX.selected.children[0].material = GX.selected === undefined ? GX._mat : GX._maskmat; //.scale.set(1, 1, 1);
    const s = GX.selected = GX.lasto;
    if (mouseEvent.button === 2) {
        if (!s) return;
        const curval = s.getValue();
        if (curval !== s.initialValue) {
            s.lastValue = curval;
            s.setValue(s.initialValue);
            s.children[0].material = GX._maskmat;
        } else {
            s.setValue(s.lastValue);
            s.children[0].material = GX._mat;
        }
        return;
    }
    // msgfix('!GX.selected', s ? s.guiName : 'none');
    if (s) s.children[0].material = GX._selmat; //.scale.set(GX.selectscale, GX.selectscale, GX.selectscale);
    GX.html();
}

GX._setselect = function() {
    if (W.canvas) {
        // note: 28 Apr 2022, was 'mouseup' as datguivr killed mousedown events
        // this meant sliding slider to left often gave a mouseup on the select area and brought up sn unwanted html gui
        // datguivr modified
        W.canvas.addEventListener('mousedown', GX.select)
    } else {
        setTimeout(GX._setselect, 100);
    }
}
GX._setselect();

/***/

GX.localprefix = '>';
GX.downloadprefix = '!';
GX.codesettingsprefix = '+';
GX.localprefixkey = 'savelocal';
GX.localprefixfull = GX.localprefixkey + GX.localprefix;
GX.write = function(name, vv) {
    if (name[0] === GX.localprefix) {
        localStorage[GX.localprefixkey + name] = vv;
    } else if (name[0] === GX.downloadprefix) {
        saveAs(new Blob([vv]), name.substring(1));
    } else if (name[0] === GX.codesettingsprefix) {
        if (name.contains('/') || name.contains('\\'))
            writetextremote(name, vv);
        else
            writetextremote((CSynth.current ? CSynth.current.fullDir : '') + name, vv);
    } else {  // no prefix => organicsaves
        const ds = getdesksave()
        writetextremote(name.startsWith(ds) ? name : (ds + name), vv)
    }
    if (CSynth.updateAvailableFiles) CSynth.updateAvailableFiles(undefined, name);
}

GX.read = function(name, allowmissing) {
    let sss;
    if (name[0] === GX.localprefix) {
        sss = localStorage[GX.localprefixkey + name];
    } else if (name[0] === GX.downloadprefix) {
        sss = openfiles.dropped[name.substring(1)];
    } else if (name[0] === GX.codesettingsprefix) {
        sss = readcode(name.substring(1))
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
    const lll = Object.keys(localStorage).filter(x=>x.startsWith(GX.localprefixfull)).map(x => x.substring(GX.localprefixkey.length));
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
GX.normalizeRange = function(xx, edge = 0.4, extremeEdge = 0.1) {
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
    else if (rpos < edge) k = 0.5;
    else if (rpos > (1-extremeEdge) && v !== 0) k = v * 3 / xx._max;
    else if (rpos > (1-edge)) k = 2;
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
        htmlele.style.backgroundColor = 'black';
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
                case 'KeyX': GX.hide(); GX.html(); break;
                // case 'KeyC': navigator.clipboard.writeText('!gkey:' + W._GXname.innerText); break;
                default: done = false;
            }
            GX.lasthtmlkey = k;
            if (done) killev(evt);
        }
        GX.htmlele.innerHTML = `
    <div id="_GXname"><b>name</b></div><br>
    <table>${row('value')} ${row('min')} ${row('max')} ${row('step')}</table>
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
    <!--
    <br>
    C: copy this gui item (eg for alt-C paste to new gui) PENDING
    <br>
    --->
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
        GX.htmlele.style.left = (lastdocx+10) + 'px';
        GX.htmlele.style.top = (lastdocy+10) + 'px';
        W._GXname.innerHTML = xx.mostName();
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
var RGXX, GXX, _R
GX.makegxx = function() {
    GX.updateGuiDictCache()
    // GXX uses pattern
    globalThis.GXX = new Proxy(GX.guiDictCache,{
        get: (o, n) => { const g = GX.getgui(new RegExp(n)); return g ? g.getValue() : undefined},
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
