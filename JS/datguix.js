// tracker version of dat.guiVR to capture fields
// we keep names and other details useful for save/restore
var dat, log, V, location, THREE,msgfixlog, fileTypeHandlers, localStorage, updateMat,
onframe, saveAs, writetextremote, CSynth, Blob, openfiles, posturi, evalx, sensible, Maestro, CLeap, killev, G, camToGenes;  // for lint

dat.GUIVR.globalEvents.on('onPressed', e => {
    Maestro.trigger('datguiclick', e);
    if (CLeap) CLeap.lastClickTime = Date.now();
    V.resting = false;
});

var GX = {};  // really const, var for easier sharing
GX.guilist = [];  // list of active gui leaf elements
GX.guiDictCache = undefined;
GX.clearAll = () => {
    dat.GUIVR.clearAll();
    GX.guilist = [];
    GX.guiDictCache = undefined;
}
GX.updateGuiDictCache = () => {
    return GX.guiDictCache = GX.guilist.reduce( (c,v) => { c[GX.keymap(v.mostName())] = v; return c}, {});
}
//guidict is called a lot, should be cached.
GX.guidict = (updateCache = false) => {
    if (updateCache || !GX.guiDictCache) GX.updateGuiDictCache();
    //return GX.guilist.reduce( (c,v) => { c[GX.keymap(v.mostName())] = v; return c}, {});
    return GX.guiDictCache;
}

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
    const vva = vv1.toLowerCase().replace(/[ `~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\]/gi, '').split('/');
    const vv2 = vva.map(v => GX.kmap[v] || v);
    return vv2.join('/');
}


GX.defaultHeight = 0.08;

/** add an item to a folder on the gui, mark up the item with its functional aspects, and keep track of added item */
GX.datGUIVRadd = function(object, propertyName, arg3, arg4) {
    if (object.isFolder) return this.addFolder(object);
    const xx = this.oldadd(object, propertyName, arg3, arg4);
    xx.object = object;
    xx.propertyName = propertyName;
    xx.guiName = propertyName;
    xx.folderParent = this; //already has folder property
    if (xx.setHeight) xx.setHeight(GX.defaultHeight);

    xx.oldname = xx.name;  // warning: must be after setHeight which redefines name
    xx.oldmin = xx.min;
    xx.oldmax = xx.max;
    xx.oldstep = xx.step;
    xx.oldOnchange = xx.onChange;
    xx.name = GX.datGUIVRname;
    xx.getValue = function() { return xx.object[xx.propertyName]; }
    xx.setValue = function(v) {
        if (xx.setting !== undefined && xx.setting === v) return;   // prevent recursion
        if (xx.setting !== undefined) console.error('bad recursive setValue', xx.fullName(), xx.setting, v);
        xx.setting = v;
        v = GX.valmap(v);
        xx.object[xx.propertyName] = v;
        // this helps make sure dropdowns got processed right, but can cause infinite recusion without changed check
        if (xx.userData.setValue) xx.userData.setValue(v);
        if (xx.changeFunction) xx.changeFunction(v);
        delete xx.setting;
    }
    xx.fullName = function() { return xx.folderParent.fullName() + '/' + xx.guiName; }
    xx.mostName = function() { return xx.folderParent.mostName() + '/' + xx.guiName; }
    xx.onChange = function(f) { xx.changeFunction = f; return xx.oldOnchange(f)}

    if (typeof object[propertyName] === 'number') {
        xx._min = arg3;
        xx._max = arg4;
        xx._step = 1;  // todo verify
        xx.min = function(v) { xx.oldmin(v); xx._min = v; return xx; }
        xx.max = function(v) { xx.oldmax(v); xx._max = v; return xx; }
        xx.step = function(v) { xx.oldstep(v); xx._step = v; return xx; }
        xx.normalizeRange = function(edge = 0.1) { GX.normalizeRange(xx, edge); }
    }
    GX.guilist.push(xx);
    GX.guiDictCache = undefined;
    return xx;
}

GX.exclude = [];

/** add a folder as child of another folder */
GX.datGUIVRaddFolder = function(folder) {
    if (!folder) return;
    folder.folderParent = this;
    const hide = (GX.exclude.includes(folder.folderName));

    if (this === V.gui || hide) folder.detachable = true;
    const r = this.oldaddFolder(folder);
    if (hide) {
        folder.detach();
        folder.visible = false;
        folder.position.set(10000,0,0);
    }
    GX.guilist.push(folder);
    GX.guiDictCache = undefined;
    return r;
}

GX.datGUIVRaddImageButtonPanel = function(n, ...details) {
    details.forEach(d => {
        if (!d.tip) {
            const key = d.key || d.text;
            d.tip = CSynth._msgs[key + '_hover'];
        }
    });
    const ret = this.oldaddImageButtonPanel(n, ...details);
    CSynth.ret = ret;
    const guic = ret.guiChildren;
    const rdetails = details.filter(d => d.text);
    if (guic.length !== rdetails.length)
        console.error('bad datGUIVRaddImageButtonPanel', ...details);
    rdetails.forEach((d,i) => {
        const xx = guic[i];
        xx.definition = d;
        xx.guiName = d.text;
        xx.folderParent = this;
        xx.fullName = function() { return xx.folderParent.fullName() + '/' + xx.guiName; }
        xx.mostName = function() { return xx.folderParent.mostName() + '/' + xx.guiName; }
        GX.guilist.push(xx);
    });

    return ret;
}

GX.datGUIVRname = function(name) {
    this.guiName = name;
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
    xx.oldadd = xx.add;
    xx.add = GX.datGUIVRadd;
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
        var prompt = `enter name for ${extension} file.
        Start with > for local save in browser.
        Start with ! for download as file.
        `
        if (_public)
            prompt += 'Undecorated will save in the browser, cannot save to server for public projects.';
        else
            prompt += 'Undecorated will save in the project at server.';
        name = window.prompt(prompt, '');
    }
    return name;
}

GX.saveguiString = function() {
    const r = {};
    GX.guilist.forEach(x => {
        if (x.getValue) {  // not for folders
            let v = x.getValue();
            if (v instanceof THREE.Color) v = {r: v.r, g:v.g, b: v.b, '$$=type': 'colour'};  // THREE does horrible things with toJSON()
            r[x.mostName()] = v;
        }
    });
    r._rot4_ele = G._rot4_ele;
    return r;
}


GX.savegui = function(name) {
    const extension = '.settings';
    name = GX.getNewFilename(name, extension);
    if (!name) { log('no name, GX.savegui aborted'); return; }
    const _public = location.host === "csynth.molbiol.ox.ac.uk" && location.search.indexOf('?p=') === -1;
    if (_public && name[0] !== '>' && name[0] !== '!') name = '>' + name;
    const r = GX.saveguiString();
    const vv = JSON.stringify(r, undefined, '\t');

    const fname = name + (name.endsWith(extension) ? '' : extension);
    GX.write(fname, vv);
}

/** GX.restoregui may be given just a filename, or data + filename */
GX.restoregui = function(pname='default', name2, allowmissing = false) {
    let name, sss;
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
    if (sss.trim()[0] !== '{') { evalx(sss, name); return; }  // allow for pure java settings files
    const ss = JSON.parse(sss);   // recover and parse saved set
    if (ss.target) {
        const targ = window[ss.target];
        delete ss.target;
        GX.restoreGeneral(ss, targ, ss.target);
    } else {
        GX.restoreGuiFromObject(ss);
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

/** get the gui element for a key, undefined if none */
GX.getgui = function(km) {
    const dict = GX.guidict();
    if (typeof km === 'string') {
        const k = GX.keymap(km);
        return dict[k];      // find the current gui object
    }
    // assume regex
    for (let gn in dict) {
        if (gn.match(km))
            return dict[gn];
    }
}

/** restore gui from object */
GX.restoreGuiFromObject = function(ss) {
    const dict = GX.guidict();                  // get current objects for the keys
    if (ss._rot4_ele) {G._rot4_ele = ss._rot4_ele; camToGenes(); }

    for (let km in ss) {
        const v = ss[km];
        const k = GX.keymap(km);
        const guio = dict[k];      // find the current gui object
        if (guio) {
            if (typeof v === 'object' && v['$$=type'] === 'colour')
                guio.getValue(v).setRGB(v.r, v.g, v.b);
            else
                guio.setValue(v);
        } else {
            msgfixlog('cannot recover key', k, 'value=', v);
        }
    }
    return true;

    /**
    ss.forEach(x => {
        if ('value' in x) {
            const guio = dict[x.mostName];      // find the current gui object
            if (guio) {
                 guio.setValue(x.value);
            } else {
                msgfixlog('cannot recover key', x.mostName, 'value=', x.value);
            }
        }
    });
    **/
}
fileTypeHandlers['.settings'] = GX.restoregui;

GX.getValue = function(k) {
    return GX.getgui(k).getValue();
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
        Maestro.on('preframe', dat.GUIVR.update);
    }
});

/***/

GX.localprefix = '>';
GX.downloadprefix = '!';
GX.localprefixkey = 'savelocal';
GX.localprefixfull = GX.localprefixkey + GX.localprefix;
GX.write = function(name, vv) {
    if (name[0] === GX.localprefix)
        localStorage[GX.localprefixkey + name] = vv;
    else if (name[0] === GX.downloadprefix)
        saveAs(new Blob([vv]), name.substring(1));
    else
        writetextremote(CSynth.current.fullDir + name, vv);
    CSynth.updateAvailableFiles();
}

GX.read = function(name, allowmissing) {
    let sss;
    if (name[0] === GX.localprefix)
        sss = localStorage[GX.localprefixkey + name];
    else if (name[0] === GX.downloadprefix)
        sss = openfiles.dropped[name.substring(1)];
    else
        sss = posturi(CSynth.current.fullDir + name, undefined, allowmissing);
    return sss;
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
    GX.guiDictCache = undefined;

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
GX.findHover = function() {
    const r = [];
    GX.guilist.forEach(i => {
        if (i.interaction) {
            if (i.interaction.hovering()) r.push(i);
        } else if (i.hitscan[0].interaction) {
            if (i.hitscan[0].interaction.hovering()) r.push(i);
        } else if (i.guiType === 'dropdown') {
        } else {
            let j = 7;
        }

    });
    return r;
}

/** normalize range according to current value */
GX.normalizeRange = function(xx, edge = 0.4, extremeEdge = 0.1) {
    if (xx === undefined) {
        const r = GX.findHover();
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

var W, lastdocx, lastdocy;
/** show an html menu for a hovered dataguivr one, the html menu has morte function  */
GX.html = function(xx = GX.findHover()[0]) {
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
            if (evt.code === 'Escape') {
                GX.html();
                killev(evt);
            }
        }
        GX.htmlele.innerHTML = `
    <div id="_GXname"><b>name</b></div><br>
    <table>${row('value')} ${row('min')} ${row('max')} ${row('step')}</table>
`
    }
    if (!xx || xx._step === undefined || xx === GX.htmlgx) {
        GX.htmlgx = undefined;
        htmlele.style.display = 'none';
        return;
    }
    GX.htmlgx = xx;

    htmlele.style.display = ''
    GX.htmlele.style.left = lastdocx + 'px';
    GX.htmlele.style.top = lastdocy + 'px';
    const hx = W._GXvalue;
    W._GXname.innerHTML = xx.mostName();
    W._GXmin.value = hx.min = xx._min;
    W._GXmax.value = hx.max = xx._max;
    W._GXstep.value = hx.step = xx._step;
    hx.value = xx.getValue();
    hx.onchange = () => xx.setValue(+hx.value);
    hx.focus();
    W._GXmin.onchange = () => xx.min(hx.min = +W._GXmin.value);
    W._GXmax.onchange = () => xx.max(hx.max = +W._GXmax.value);
    W._GXstep.onchange = () => xx.step(hx.step = +W._GXstep.value);
}

// show items with potential tool tips but none yet set
GX.notip = function() {
    return GX.guilist.filter(g => g.setToolTip && !g.getToolTip()).map((g,i) => `"${g.mostName()}": ""`).join('\n');
}
