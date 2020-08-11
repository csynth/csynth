/*
 * code to handle file IO, saving and loading of objects, etc
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015, 2019
 */
"use strict";

/** for encapsulation verification */
var W, genedefs, mainvp, savedef, nwfs, camera, THREE, keysdown, inputs,
        vpxQuadScene, zoomdef, permgenes, NODO, posturi, yaml,
        framenum, width, height, vps, frametime, Director, require, process,
        killev, log, getFileExtension, FileReader, serious, msgfix, getDispobj,  currentGenes, clone,
        xxxgenes, refall, settarget, newframe, currentObjects, XMLHttpRequest, dataURItoBlob, getfiledata, dstring,
        resolveFilter, setval, trysetele, tryseteleval, updateGuiGenes, newmain, restoreInputState, genBoundsFromObjects,
        onframe, copyFrom, target, trygeteleval, autofillfun, saveframe, HTMLElement, HTMLDocument, mapOnce, saveInputState, slots, extraDispobj,
        localStorageGet, localStorageSet, xxxxobj, CLASSNAME, fixrot4scale, setInput, getcentrescale, centrescalenow, clearSelected,
        Genedef, setViewports, baseShaderChanged, defaultObj, trancodeForTranrule, setGUITranrule, transformTexture, setHornSet, cleangenesall,
        addGenesToExtraObjects, setSize, forceCPUScale, inputsanimsave, imsize, format, saveframetga, wasRecordingWithAnim,
        msgfixlog, throwe, renderObjs, renderQuad, vpborder, framedelta, startAudioRecording, stopAudioRecording, setAllLots, saveimage,
        basescale, postCache, startscript, startvr, currentLoadingFile, currentLoadingDir, msgfixerror, oxcsynth, Maestro,
        consoleTime, consoleTimeEnd, _insinit, currentLoadingData, CSynth, location, File, FormData, $,
        loadStartTime, genbar, posturibin, uriclean, saveTextfile, islocalhost
;
var FrameSaver = {};  // psuedo-class
var frameSaver = {};
var dragDropDispob = NODO;  // dispobj just dropped onto
var dragOverDispobj = NODO; // dispobj being dragged over


/** handlers for different file types; in each case pass in data content of file */
var fileTypeHandlers = { ".oao": loadOao, ".stem": loadStem, '.oag': loadOag, '.js': evalx, '.binary': loadRunSave };

/** use .binary dropped file to render a saved scene, uses entire directory */
function loadRunSave(file) {
    frameSaver.lastSaveDirectory = file.path + '/../';
    FrameSaver.StartRender();
}
loadRunSave.rawhandler = true;

/** handle the input file selection */
function openfileevt(evt) {
    openfiles(evt.target.files);
    return killev(evt);
}

var lastopenfiles;
/** handle the input file selection, also dragdrop */
function openfiles(files) {
    if (!files) files = lastopenfiles;
    lastopenfiles = files;
    for (let f=0; f<files.length; f++) {
        if (files[f].path)
            files[f].canonpath = files[f].path.replaceall('\\', '/');
        else
            files[f].canonpath = files[f].name;
        openfiles.pending[files[f].canonpath] = Date.now();
    }
    Maestro.trigger('preopenfiles', files);  // escape may want to change, e.g. sort files?
    for (let f=0; f<files.length; f++) openfile(files[f]);
    Maestro.trigger('postopenfiles', files);
}
openfiles.pending = {};
openfiles.dropped = {};  // contents of dropped and other opened files

/** read and process a single file, given a File object */
function openfile(file) {
    var ext = getFileExtension(file.name);
    var handler = fileTypeHandlers[ext];
    const canonpath = file.canonpath;
    if (!handler) handler = window[ext.substring(1) + 'Reader'];

    if (handler && handler.rawhandler) {
        handler(file);
    } else if (handler) {
        var reader = new FileReader();
        // ??? reader.fff = f;
        // Closure to capture the file information.
        reader.onload = async function(e) {
            var data = e.target.result;
            openfiles.dropped[file.name] = data;
            if (CSynth && CSynth.updateAvailableFiles) CSynth.updateAvailableFiles();
            const hh = handler(data, canonpath);
            if (hh instanceof Promise) await hh;
            delete openfiles.pending[canonpath];
        };
        let t = Date.now();
        const urik = 'reading file ' + uriclean(file.name);
        msgfix(urik, '<br>pending<br>' + genbar(0));  // get in early/synchronous so they appear in correct order
        reader.onprogress = function(e) {
            const tt = Date.now();
            const m = `progress ${e.loaded} of ${e.total}`;
            const n = 100;
            const p = Math.round(n * e.loaded/e.total);
            msgfix(urik, '<br>' + m + '<br>' + genbar(e.loaded/e.total));
            if (tt > t+1000) {
                console.log(file.name, m);
                t = tt;
            }
        }
        if (['.tif', '.bintri', '.zip', '.map'].includes(ext) )
            reader.readAsArrayBuffer(file);        // start read in the data file
        else
            reader.readAsText(file);        // start read in the data file
    } else {
        serious("attempt to open file of wrong filetype " + file.name);
    }
}

/** handle js files, correct directory + eval + debug */
function evalx(data, fname) {
    if (!data)
        return msgfixerror('eval', `<span style="font-size:200%">
            bad or empty file for javascript evaluation<br>in file ${fname}</span>`);
    if (data.startsWith('<')) {
        return msgfixerror('eval',
        `<span style="font-size:200%">unexpected javascript for ${fname}<br>
         ... maybe you have tried to load a CSynth project with incorrect link<br>
         or link to which you do not currently have access.<br>
         in file ${fname}</span>`);
    }
    var sdata = fname || data.substring(0,100).replaceall('\n', '<br>');
    const saver = [currentLoadingFile, currentLoadingDir];
    try {
        currentLoadingFile = fname;
        if (fname) {
            if (fname.startsWith('/csynth/serve'))
                currentLoadingDir = fname.pre('&file=') + '&file=';
            else
                currentLoadingDir = fname.substring(0,Math.max(fname.lastIndexOf('/'), fname.lastIndexOf('\\')));
        }
        currentLoadingData = data;
        var r = eval(data);
        currentLoadingData = undefined;
        currentLoadingFile = currentLoadingDir = undefined;
        // msgfix('eval', sdata , '<br>=>', r);
        return false;
    } catch(e) {
        msgfixerror('eval', `<span style="font-size:200%">evaluation failed<br>${e.message}'<br>'in file ${fname}</span>`);
        log("failure to eval", sdata, e);
        return e;
    } finally {
        [currentLoadingFile, currentLoadingDir] = saver;
    }
}


/** read and process file given filename */
function processFile(fn, ext) {
    consoleTime('loading_' + fn);
    if (!ext) ext = getFileExtension(fn);
    var handler = fileTypeHandlers[ext];
    if (!handler) handler = window[ext.substring(1) + 'Reader'];
    delete postCache[fn];
    let data = posturi(fn);
    if (data === undefined) msgfixerror(fn, 'cannot read file');
    const r = handler(data, fn);
    consoleTimeEnd('loading_' + fn);
    return r;
}

/** helper for docdrop to scan directories, top level for debug,
returns full list but does not process
N.b. it seems that you can drop mixed files/directories, but CANNOT open them (ctrl-o)
TODO, handle the fact that readEntries is async */
function _scanFiles(item, fileEntries = []) {
    log('entry item', item)
    if (item.isDirectory) {
        let directoryReader = item.createReader();
        directoryReader.readEntries(function(entries) {
            entries.forEach(function(entry) {
                _scanFiles(entry, fileEntries);
                log('entry', entry, fileEntries)
            });
        });
    } else if (item.isFile) {
        log('file found', item);
        fileEntries.push(item);
   }
    return fileEntries;
}

function docdrop(evt) {
    try {
        // currentLoadingDir = '';
        _docdrop(evt);
    } catch (e) {
        serious('Unexpected error found during docdrop', e);
    } finally {
        currentLoadingDir = undefined;
    }
}

/** document drop, if ctrl key keep dragDropDispobj which may be used by loader
dragOverDispobj will be destroyed too soon because of asynchronous loader */
function _docdrop(evt) {
    var dt = evt.dataTransfer;
    if (!dt) { serious("unexpected dragdrop onto mutator"); return killev(evt); }
    dt.dropEffect = 'copy';

    if (evt.ctrlKey && dragOverDispobj === NODO) { log("drop onto no dispobj"); return killev(evt); }
    dragDropDispob = (evt.ctrlKey) ? dragOverDispobj : NODO;

    // code below allows for directories, not complete
    let isdir = false;
    let fileEntries = [];
    for(let i=0; i < dt.items.length; i++) {
        const item = dt.items[i].webkitGetAsEntry();
        if (!item) continue;
        isdir |= item.isDirectory;
        log('item', item);
        _scanFiles(item, fileEntries);
    }
    // if (isdir) return;

    var data = dt.getData("text/plain");

    if (dt.files.length > 0) {   // file dragdrop
        openfiles(dt.files);
    } else if (data !== "") { // data drag/drop TODO
        try {
            if (data.startsWith('http:') || data.startsWith('https:')) {  // drag/drop of url
                CSynth.handlefileset( {eventParms: [{ canonpath: data}] })
            } else {
                msgfix('evaluate', data);
                var r = eval(data);
                msgfix('evaluate', data, 'result', r);
            }
        } catch (e) {
            msgfix('evaluate', data, 'failed', e.message);
        }
        // Poem.start(data); for now disable poem start by text drop
        // does not work, 5 Mar 2014
    }
    dragOverDispobj = NODO;

    return killev(evt);
}

/** document drop  */
function docdragover(evt) {
    dragOverDispobj = getDispobj(evt);
    evt.dataTransfer.dropEffect = 'copy';

    msgfix("drag over", dragOverDispobj === NODO ? "no dispobj" : dragOverDispobj.vn + "  ctrl:" + evt.ctrlKey + " keys:" + keysdown);
    return killev(evt);
}

/** document paste, works for strings but not files? */
async function docpaste(evt) {
    const data = evt.clipboardData.getData('Text');
    log ('#files', evt.clipboardData.files.length);
    log ('target type', evt.target.tagName);
    log ('data', data);
    // document.body for when dropped on canvas, not quite sure why not canvas
    // if (evt.target === document.body)  // todo, consider what drop/copy etc can apply where,

    //PJT:::: Since when does pasting into tranrule box mean we want to immediately eval????
    //SJPT:::: changed to apply only to body (for some reason canvas.onpaste = does not work)
    //SJPT, we were using event.target instead of document.activeElement, but that was not reliable
    if (W.doEvalOnPaste && document.activeElement === document.body && !evt.target.isContentEditable) {
        if (data.startsWith('http:') || data.startsWith('https:')) {  // drag/drop of url
            CSynth.handlefileset( {eventParms: [{ canonpath: data}] })
        } else {
            evalx(data);
        }
    }
}
W.doEvalOnPaste = true;


var lastval={};  // last 'interesting' value overridden by key press
function saveInteresting(name) {
    var v = currentGenes[name];
    if (v===1 || v===0 || v===genedefs[name].def) return;
    lastval[name] = v;
}


var saveExtraObjects;  // saves genes from all current objects
function saveExtra() {
    newframe();
    if (!saveExtraObjects) {
        saveExtraObjects = {};
        for (let o in currentObjects)
            saveExtraObjects[o] = clone(currentObjects[o].genes);
    }
}

function restoreExtra(evt) {
    if (!saveExtraObjects) return;
    for (let o in currentObjects)
        currentObjects[o].genes = clone(saveExtraObjects[o]);
    currentGenes = xxxgenes(mainvp);
    saveExtraObjects = undefined;
    refall();
}

/** save an undo point */
function saveundo() {
    saves.push(JSON.stringify(currentGenes));
}

/** undo */
function undo() {
    if (saves.length > 0) settarget( JSON.parse(saves.pop()), false);
}

function readtext(fid) {
    if (nwfs)
        return nwfs.readFileSync(fid, 'ascii');
    else
        return posturi(fid);
}

async function readbinaryasync(fid) {
    if (nwfs) {
        // for some reason, async is much slower than sync. Maybe we should stream the async?
        //return new Promise( (resolve, reject) => {
        //    nwfs.readFile(fid, (err,data) => {
        //        if (err) reject(err);
        //        resolve(data);
        //    });
        //} );
        const urik = 'reading file ' + uriclean(fid);
        msgfix(urik, '<br>complete (nwfs sync)<br>' + genbar(1));

        return new Promise( (resolve, reject) => {
            try {
                if (!nwfs.existsSync(fid)) reject(new Error('no file' + fid));
                const r = nwfs.readFileSync(fid);
                resolve(r.buffer);
            } catch (e) {
                reject(e);
            }
        } );
    } else {
        return posturibin(fid);
    }
}

/** save to a remote location  */
function remotesave(fid, newVersion) {
    var newVersionString = (typeof newVersion === 'string') ? newVersion : JSON.stringify(newVersion, undefined, 2);
    if (nwfs) {
         nwfs.writeFileSync(fid, newVersionString);
    } else {
        writetextremote(fid, newVersionString);
    }
    log("saving to " + fid);
    msgfix('saving to', '<span class="errmsg">' + fid + '</span>');
}

/** append text to remote file, synchronous */
function appendtextremote(fid, text) {
    writetextremote(fid, text, true);
}


/** write text to remote file, synchronous */
function writetextremote(fid, text, append = false) {
    if (fid[0] === '>')
        return saveTextfile(text, fid.substr(1));  // for save into downloads
    if (nwfs) {
        nwfs.writeFileSync(fid, text);
        return;
    }
    if (location.host === "csynth.molbiol.ox.ac.uk") {
        const mm = location.search.match(/.*\?p=(.*?)&.*/);
        if (!mm) {
            msgfixlog('Sorry: upload files to public project not supported.');
            return;
        }
        const project = mm[1];
        writetextoxford(fid.post('file='), text, project);
        return;
    }

    log("POST text");
    var oReq = new XMLHttpRequest();
    oReq.open("POST", append ? "appendfile.php" : "savefile.php", false);
    oReq.setRequestHeader("Content-Disposition", fid);
    oReq.send(text);
    log("writetextremote", fid, "response text", oReq.responseText);
}

/** write text to Oxford server
 * does not work on Edge, https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9551546/
 */
function writetextoxford(fid, text, project) {
    var file = new File([text], fid);  // is there a direct way without making a 'pseudo' file?
    var myFormData = new FormData();
    myFormData.append('file_desc_long', 'long');
    myFormData.append('file_desc_short', 'short');
    myFormData.append('file', file);
    myFormData.append('project', project);

    var r = $.ajax({
        url: '/csynth/upload',
        type: 'POST',
        processData: false, // important
        contentType: false, // important
        dataType : 'json',
        async: false,
        data: myFormData
    });
    r.msg = r.responseText.post('role="alert">').pre('</')
    return r;
}

/** write log text to Oxford server */
function writeerroxford(text) {
    const file = new File([text], 'nofid');  // is there a direct way without making a 'pseudo' file?
    const myFormData = new FormData();
    myFormData.append('e', file);

    const r = $.ajax({
        url: '/errors/cgi-bin/csynth.cgi',
        type: 'POST',
        processData: false, // important
        contentType: false, // important
        dataType : 'json',
        async: false,
        data: myFormData
    });
    if (r.status !== 200) return log('error upload failed', r.status, r.statusText);
    const msg = r.responseText;
    const ret = (msg.indexOf('updating log')  !== -1) ? 0 : msg;
    return ret;
}


/** run a command from php, if quiet is specified (non false) it is run async and so return,
and if 'quiet' is a function, it will be called on completion with the response text.
If there is an async error reject will be called if present, or flagged quiet if no reject
quiet=false => sync, no message, return value
quiet=undefined => sync, message, return value
  */
function runcommandphp(cmd, quiet, reject) {
    if (!islocalhost && cmd.indexOf('--query-gpu') === -1 && cmd.indexOf('mkdir') === -1
         && cmd.indexOf('exportShader') === -1)
        serious('runcommandphp should not be called in oxcsynth mode');
    if (nwfs) {
        try {
            if (quiet) {
                if (typeof quiet === 'function')
                    return require('child_process').exec(cmd, quiet).toString();
                else
                    return require('child_process').exec(cmd).toString();
            } else {
                const r = require('child_process').execSync(cmd).toString();  // << correct for async
                return r;
            }
        } catch(e) {
            log('runcommandphp error', e.message, cmd);
            return undefined;
        }
    }
    //TODO: probably use fetch() instead.
    const oReq = new XMLHttpRequest();
    oReq.open("POST", "runcmd.php", !!quiet);
    oReq.setRequestHeader("cmd", cmd);
    oReq.send("");
    if (typeof quiet === 'function') {
        oReq.onload =  function(e) {
            if (oReq.status === 200)
                quiet(oReq.responseText);
            else if (reject)
                reject(oReq.status + ' ' +  oReq.statusText);
            else
                quiet('!!!!!!! ERROR RETURN ' + oReq.status);
        };
        return oReq;  // in case caller wants to check details on callback
    }
    if (!quiet) {
        // lovely.
        if (quiet === undefined) {
            log("runcommandphp", cmd, "response text", oReq.responseText.substring(0,50));
        }
        return oReq.responseText;
    }
}



/** write image in url form to remote file */
function writeUrlImageRemote(fid, urldata, ctype) {
    log("POST image blob");
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "savefile.php", false);
    oReq.setRequestHeader("Content-Type", ctype);
    oReq.setRequestHeader("Content-Disposition", fid);
    oReq.send(dataURItoBlob(urldata));
    log("writeUrlImageRemote complete", fid);
}

/** linend used by the server */ var linend = "\r\n";
var lastFiletime = "$$$";

/** test get oao file from server */
function getserveroao(fid) {
    var s = getfiledata(fid);
    if (s[0] !== "{" && !s.startsWith('name:'))  // allow for json or yaml
        msgfix("Incorrect data not loaded", "for fid=", fid, s.substring(0, 40));
    else
        loadOao(s, fid);
}

// parse the data and make gene save specific corrections (for tranrule saving optimization)
function dstringGenes(data) {
    // backward compatability of oag and other files
    data = data.replaceall('texbetween', 'bandbetween');

    var r = dstring(data);
    if (r.genes && r.genes.tranrule) {
        if (Array.isArray(r.genes.tranrule))
            r.genes.tranrule = r.genes.tranrule.join('\n');
        if (r.inputState && (!r.inputState.tranrulebox || r.inputState.tranrulebox === '->'))
            r.inputState.tranrulebox = r.genes.tranrule;
        for (let o in r.currentObjects) {
            var obj = r.currentObjects[o];
            if (obj.genes && obj.genes.tranrule === '->')
                obj.genes.tranrule = r.genes.tranrule;
        }
    }

    for (let gn in r.genes) {
        if (gn.endsWith('_speck1') || gn.endsWith('_speck2') || gn.endsWith('_speck3')
        || gn === 'speck1' || gn === 'speck2' || gn === 'speck3') {
            delete r.genes[gn];
            delete r.genedefs[gn];
        }
    }

    return r;
}

/** open object from data (.oao file) */
function loadOao(data, fn) {
    if (data.indexOf("{") === -1) {
        fn = data;
        if (fn.indexOf('.') === -1) fn = 'gallery/' + fn + '.oao';
        data = getfiledata(fn);
    }
    if (fn) log("loadoao fn=", fn);  // loaded from loadfil
    msgfix('loaded file', fn);
    Maestro.trigger('beginLoadOao', fn);

    loadOao.lastfn = fn;
    loadOao.lasttime = frametime;
    var sb = fn.split('/').pop().split('__')[0].replace('.oao','');
    // mapOnce();  // not needed, classes found
    var x = dstringGenes(data);
    // experiment in loading just filtered genes, to refine
    if (keysdown.indexOf('\\') !== -1) {
        var f = resolveFilter();
        var g = x.genes;
        for (let gn in f) if (gn in g) setval(gn, g[gn]);
        return;
    }
    x.name = sb;
    x.genes.name = sb;
    //loadxobjGetGenes(x, true, true);
    var targ, genes;
    if (dragDropDispob !== NODO) {
        x = { genes: x.genes, genedefs: x.genedefs, name: x.name, date: x.date};
        targ = dragDropDispob;
        genes = targ.genes;
        newframe(targ);
    }
    loadcurrent(x, true, true, genes);

    tryseteleval("savename", sb);
    if (inputs.backgroundSelect !== 'color') { // so feedback gets a chance to be seen
        // nframes(refall, 10);
        refall();   // the repeat will be handled by dispobj.render() for each frame
    }

    cleanvr();
    onframe(()=>Maestro.trigger('doneLoadOao', fn));
}

/** repeat function every frame for i frames */
function nframes(fun, i) {
    if (i <= 0) return;
    fun();
    onframe(function() {nframes(fun, i-1);});
}

/** open control data  (.stem file) */
function loadStem(data) {
    var x = JSON.parse(data);
    restoreInputState(x);
}

/** open oag file */
function loadOag(data) {
    if (data.indexOf('{') === -1) {
        data = posturi(data + '?frametime');
    }
    var g = dstring(data);      // may be json or yaml
    copyFrom(currentGenes, g);
    // do not save name for oag, only for oao
    // if (g.name) tryseteleval("savename", g.name);  // early, so we know what it was if it fails
    // setgenes(mainvp, currentGenes = g);
    target = {};
    updateGuiGenes();
    newmain();
}

/** generate animation bounds from objects by name prefix */
function genBoundsFromPrefixFS(stem) {
    var files = nwfs.readdirSync(baseroot + stem);
    var o = [];  // object to use as bounds
    for (let i=0; i<files.length; i++) {
        var fid = files[i];
        var ffid = baseroot + stem + "/" + fid;
        if (fid.endsWith(".oao")) {
            let d = getfiledata(ffid);
            o.push(JSON.parse(d));
        } else if (fid.endsWith(".stem")) {
            let d = getfiledata(ffid);
            restoreInputState(JSON.parse(d));
        } else {
            console.error("file not processed in genBoundsFromPrefixFS " + ffid);
        }
    }
    if (o.length > 0) {
        genBoundsFromObjects(o);
        var obj1 = o[0];
        settarget(loadgenes(obj1.genes));
        trysetele("doAnim", "checked", 1);
    } else {
        msgfix("no objects found in stem directory", baseroot + stem);
    }
}

/** generate animation bounds from objects by name prefix */
function genBoundsFromPrefixGal(prefix) {
    if (!prefix) prefix = trygeteleval("boundsprefix", "xxx");
    try { stemLoad(prefix); } catch (e) {}
    var o = [];
    for (let n in allGal) {
        if (n.startsWith(prefix)) o.push(getGal(n));
    }
    if (o.length > 0) {
        genBoundsFromObjects(o);
        loadtarget(o[0].name);
        trysetele("doAnim", "checked", 1);
    } else {
        msgfix("no objects match prefix", prefix);
    }
}

/** load stem file and activate */
function stemLoad(stem) {
    stem = (stem !== undefined) ? stem : trygeteleval("boundsprefix", "xxx");
    var ls = getfiledata("stems/"+stem+".stem");
    if (ls) {
        var s = JSON.parse(ls);
        restoreInputState(s);
    }
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// gallery functions

/** names of save files * ~~~ / var localGalNames = []; */
/** structure of gallery */ var allGal = {};
/** array of recent values */ var saves = [];

/** get populated gallery for name */
function getGal(name) {
    var v = allGal[name];

// don't use allGal cache as it is somehow getting corrupted
//    if (v.genes)
//        return v;  // already populated
// will be ...???    allGal[name] = loadOao("gallery/" + name + ".oao");

    var fid = name;
    if (fid.indexOf('/') === -1) fid = 'gallery/' + name + '.oao';
    // don't even let browser cache, force unique request
    var json = posturi(fid + "?" + framenum + '/' + loadStartTime);
    allGal[name] = dstringGenes(json);
    if (allGal[name].genes) allGal[name].genes.name = name;
    getGal.lastname = name;
    getGal.lasttime = frametime;

    return allGal[name];
}

/** get populated gallery for number */
function getWebGalByNum(num) {
    var name = webGalByNum[num].name;
    return getGal(name);
}

/** refresh and redisplay gal; sets both allGal and webGalByNum */
function refreshGal(op) {
    op = op || 'date';
    var name;
    allGal = {};
    //~~~ getLocalGalNames();
    allGal = readWebGalX();
    var ss = [];
    // patch up errors in gallery, and turn to array ss for sort into webGalByNum
    for(name in allGal) {
        var entry = allGal[name];
        if (entry.name === "")
            entry.name = name;
        if (entry.name !== name) {
            var debug=0;
        }
        if (isNaN(Date.parse(entry.date)))
            entry.date = new Date('2013-1-1');
        // entry.genes.name = name;  // no genes yet
        ss.push(entry);
    }
    var sss;
    if (op === 'name')
        sss = ss.sort( function(a,b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
    else
        sss = ss.sort( function(a,b) { return a.date < b.date ? 1 : -1; });

    var s = "";
    webGalByNum = sss;
    for (let v = 0; v<sss.length; v++) {
        name = sss[v].name;
        s += '<span class="savename" onclick="FCall(\'loadOao\',\'' + name + '\')">' + name+ '</span> ';
    }
    document.getElementById("loads").innerHTML = s;
}


var webgalnum = 0;
function webgallery(start) {
    if (webGalByNum.length === 0) return;  // no gallery to load
    start = start || 1;    // do not overwrite currentGenes 0
    for (let o in currentObjects) {
        if (!currentObjects[o].selected) {
            currentObjects[o].genes = loadgenes(getWebGalByNum(webgalnum).genes);
            currentObjects[o].genes.name = getWebGalByNum(webgalnum).name;    // keep the object's name here as well, just in case
            webgalnum = (++webgalnum % webGalByNum.length);
        }
    }
    autofillfun = webgallery;
    refall();
}

/** load n objects from web gallery */
function webgalload(num) {
    var xobj = getWebGalByNum(webGalByNum.length - num);
    log("loaded " + xobj.name);
    loadgenes(xobj);
    newframe();
}

/** save with serial number */
function saven(genes, name, savedir) {
    genes = genes || currentGenes;
    name = name || trygeteleval("savename") || genes.name;
    for (let num = 0; true; num++) {
        var lname = name + "__" + (num < 100 ? (num+100+"").substr(-2) : num);

        if (allGal[lname]) continue;
        if (savedir && nwfs && nwfs.existsSync(savedir + '/' + lname)) continue;
        break;
    }
    // add two digit serial, unless >= 100
    save(genes, lname);
    return lname;
}

/** duplicate of saven */
var saveSnap = saven;

/** save genes in the current savename, or given name if specified */
function save(genes, name) {
    genes = genes || currentGenes;
    name = name || trygeteleval("savename") || genes.name;
    //log( camera );
    //~~~ localStorageX[savedef + name] = JSON.stringify(newVersion );
    name = name.replace('.oao','');  // just in case .oao given
    var usegallery = name.indexOf('/') === -1 && name.indexOf('\\') === -1;
    var fidn = usegallery ? "gallery/" + name : name;
    saveSnapInternal(genes, fidn + ".oao");
    saveframe(fidn + ".jpg", 0.8);
    refreshGal();
    if (usegallery) recent(name);
}


/** save full snap in file storage fid, maybe with extra (or overwrite) fields too */
function saveSnapInternal(genes, fid) {
    const s = yamlString(genes);
    if (!fid) {
        var d = (new Date()).toJSON().replaceall(":", ".");
        fid = "org" + d + ".oao";
    }
    remotesave(fid, s);
}

function yamlString(genes = currentGenes, extras) {
    const ignoreclasses = [THREE.Object3D, THREE.WebGLRenderTarget, THREE.Texture, THREE.Scene, HTMLElement, HTMLDocument];
    var polluted = [];
    // replacer for yaml ... maybe move to xstring.
    function replacer(key, object) {
        if (typeof object !== 'object' || object === null) return object;
        for (let i=0; i<ignoreclasses.length; i++) if (object instanceof ignoreclasses[i]) return undefined;
        if (object.__proto__[CLASSNAME]) {
            //Object.defineProperty(value, '##c', { enumerable: true, writable: true});
            object['##c'] = object.__proto__[CLASSNAME];
            polluted.push(object);
        } else if (Object.keys(object.__proto__).length !== 0) {
            console.log("Warning: unexpected object found with no class info", object);
        }

        return object;
    }
    // cleangenesall();  // can kill synth mapping, >>> to consider
    mapOnce();
    var newVersion = {
        name: genes.name,
        date: Date(),
        genes: genes,
        inputState: saveInputState(),
        genedefs: genedefs,
        currentObjects: currentObjects,
        vps: vps,
        slots: slots,
        extraDispobj: extraDispobj,
        geneids: geneids,
        frameSaver: frameSaver
    };
    if (extras) copyFrom(newVersion, extras);

    var trsave = genes.tranrule;
    let inconsistentTranruleEncountered = false;
    try {  // modify to force cleaner tranrule saving
        if (genes.tranrule) genes.tranrule = genes.tranrule.replaceall('\t', '    ');
        //genes.tranrule = trsave.split('\n');
        newVersion.inputState.tranrulebox = '->';
        for (let o in currentObjects) {
            const obj = currentObjects[o];

            if (obj.genes) {
                const tr = obj.genes.tranrule;
                if (!tr) continue;
                if (tr === trsave) {
                    //if we modify a shared genes object we'll be in trouble
                    //if it's a different object it should flag as reference(->) rather than store complete tr
                    if (obj.genes !== genes) obj.genes.tranrule = '->';
                } else {
                    //there are interesting things to be done with more than one type of code spec simultaneously...
                    //It does cause problems with current (10/18) SynthBus system, so I'm flagging heavily in sclog...
                    obj.genes.tranrule = tr.replaceall('\t', '    '); //replace(/\t/g, '    ')
                    inconsistentTranruleEncountered = true;
                    let logStr = `\n\n\t---WARNING---\n\n`;
                    logStr = logStr + `Encountered different version of tranrule in genes of currentObjects[${o}] while building YAML\n`;
                    logStr = logStr + `---------- Not fully supported by synth code at the moment ------------\n\n`;
                    if (W.sclog) W.sclog(logStr);
                    log(logStr);
                }
            }
        }

        delete THREE.Object3D.prototype.toJSON;  // <<< patch for bug??? in three v74 TODO TODO chase/report
        delete THREE.Texture.prototype.toJSON;  // <<< patch for bug??? in three v74 TODO TODO chase/report
        delete THREE.Scene.prototype.toJSON;  // <<< patch for bug??? in three v74 TODO TODO chase/report
        // actually blew up on json of a mesh.
        // object got jsoned BEFORE escape for key/value in xstring, and that caused the exception
        // var s = xstring(newVersion, { ignoreclasses } );
        var s = yaml.safeDump(newVersion, {replacer, skipInvalid: true, lineWidth: 9999, flowLevel: 999});

    } finally {  // restore modifications from above
        genes.tranrule = trsave;
        newVersion.inputState.tranrulebox = trsave; // probably clone about to be thrown away ???
        for (let o in currentObjects) {
            let obj = currentObjects[o];
            if (obj.genes && obj.genes.tranrule === '->')
                obj.genes.tranrule = trsave;
        }
        for (let object in polluted) delete object['#cc']
    }
    return s;
}


/** optionally put name on recent list, and refresh list */
function recent(name) {
    if (typeof name !== 'string') return;  // or could use name.name where name is an object ?
    var sss = localStorageGet("recent") || [];
    if (name) {
        if (sss.indexOf(name) !== -1) sss.splice(sss.indexOf(name), 1);
        sss.push(name);
        if (sss.length > 20) sss.splice(0, 1);
    }

    // work in reverse so (a)html in wanted order, (b) easier to remove dead items
    var s = "";
    for (let v = sss.length - 1; v >= 0; v--) {
        name = sss[v];
        if (allGal[name])
            s += '<span class="savename" onclick="FCall(\'loadOao\',\'' + name + '\')">' + name+ '</span> ';
        else
          sss.splice(v, 1);
    }
    localStorageSet("recent", sss);

    document.getElementById("recentlist").innerHTML = s;

}


/** load genes for the given name into target; if  */
function loadtarget(xxx, incfrozen, loadinputs) {
    var xobj = xxxxobj(xxx);
    if (incfrozen === undefined) incfrozen = keysdown.indexOf("ctrl") === -1;
    tryseteleval("savename", xobj.name);  // early, so we know what it was if it fails
    var t = settarget(loadxobjGetGenes(xobj, incfrozen, loadinputs));
    updateGuiGenes();
    return t;
}

/** load into current genes */
function loadcurrent(xxx, incfrozen, loadinputs, genes) {
    if (!xxx) return;  // can happen with eg fano etc
    genes = genes ? xxxgenes(genes) : currentGenes;
    var xobj = xxxxobj(xxx);
    if (incfrozen === undefined) incfrozen = keysdown.indexOf("ctrl") === -1;  // ctrl prevents frozen loading
    if (loadinputs === undefined) loadinputs = keysdown.indexOf("shift") === -1; // shift prevents inputs loading
    tryseteleval("savename", xobj.name);  // early, so we know what it was if it fails
    var newgenes = loadxobjGetGenes(xobj, incfrozen, loadinputs);
    recent(xxx);
    for (let gn in genes) if (!(gn in newgenes)) log("inherited", gn, genes[gn]);  // added for info while cleaning up
    copyFrom(genes, newgenes);  // add changed ones, do not kill old ones
    // setgenes(mainvp, currentGenes);
    if (slots[mainvp].dispobj.genes !== currentGenes) serious("currentGenes mismatch");
    target = {};
    fixrot4scale(genes); // fix _rot4_ele in case not det 1
    if (inputs.using4d) {
        // no reliable scale/position for 4d yet
        genes.gscale = 1;
        setInput(W.GPUSCALE, false);  // gpuscale upsets by trying to interpose
    } else if (!inputs.GPUSCALE) {
        var sss = getcentrescale(genes);  // fix gscale in case not recorded right
        log("fixing gscale for", genes.name, genes.gscale, sss.gscale);
        genes.gscale = sss.gscale;
    } else {
        genes.gscale = 1;
        if (!_insinit) centrescalenow(genes); // added sjpt 6 Spet 2016
    }
    updateGuiGenes();
    Director.framesFromSlots();

    addNewGenes();
    loadOao.lasttime = frametime;  // todo rename .... and clean up
    loadOao.lastgenes = {}; copyFrom(loadOao.lastgenes, genes);
}

/** add newly defined missing genes for backward compatibility */
function addNewGenes() {
    for (let o in currentObjects) {
        var genes = currentObjects[o].genes;
        if (genes) {
            if (!('_uScale' in genes)) genes._uScale = 1;
        }
    }
}



/** load details for the given name or object,
 * return just the genes,
 * but action other parts (eg genedefs)
 * If incfrozen is set, load all genes including frozen ones
*/
function loadxobjGetGenes(xxx, incfrozen, loadinputs) {
    clearSelected();  // no longer relevant with new objects
    var xobj = xxxxobj(xxx);
    recent(xobj.name);
    if (xobj.inputState && loadinputs) {
        if (!xobj.inputState.tranrulebox && xobj.genes.tranrule)
            xobj.inputState.tranrulebox = xobj.genes.tranrule;
        restoreInputState(xobj.inputState);
    }


    // clean out all but permament genedefs, NO, might be other objects around that want them
    // var fullobj = getHornSet(xobj.genes.tranrule);
    // var fullnames = fullobj && fullobj.getgenenames ? fullobj.getgenenames() : {};
    // for (let gn in genedefs) if (!permgenes[gn] && !fullnames[gn]) delete genedefs[gn];
    // and load our genedefs
    if (xobj.genedefs) {
        // make Genedef objects in case old .oao loaded
        for (let gn in xobj.genedefs) xobj.genedefs[gn] = new Genedef(xobj.genedefs[gn]);
        copyFrom(genedefs, xobj.genedefs);
    }

    // now we load the genes (all or just the free ones)
    if (xobj.genes) {
        var resgenes = loadgenes(xobj.genes, incfrozen);
        if (!resgenes.name) resgenes.name = xobj.name;
    }
    // now we (re)establish the genedefs
    // loadgenes may call addgene which may override genes
    // so establish them all first with loadgenes
    // then override those available from saved object
    if (xobj.genedefs) {
        copyFrom(genedefs, xobj.genedefs);
    }
    if (xobj.slots)
        slots = xobj.slots;
    if (xobj.vps && !startvr)
        vps = xobj.vps;
    if (xobj.extraDispobj)
        extraDispobj = xobj.extraDispobj;

    if (xobj.currentObjects) {
        currentObjects = xobj.currentObjects;
        while (vpxQuadScene.children.length > 0)
            vpxQuadScene.remove(vpxQuadScene.children[0]);
        for (let o in xobj.currentObjects) {
            currentObjects[o].visible = true;
            if (!currentObjects[o].genes) {
                log('unexpected genes missing during load (loadxobjGetGenes) for object', o);
                currentObjects[o].genes = clone(currentGenes);
            }
            if (regularizeTranruleOnLoad || !currentObjects[o].genes.tranrule) {
                currentObjects[o].genes.tranrule = xobj.genes.tranrule;; //currentObjects.do_23.genes.tranrule;
            }
            if (inputs.GPUSCALE && !_insinit) {
                // added sjpt 7 Spet 2016 to help scaling on load
                //timeout added PJT 25/10/18 as this was causing tranrule to be parsed twice which seems a bad idea
                //this was causing signficant problems with synths in particular.
                const genes = currentObjects[o].genes;  // capture genes in case o goes away before
                onframe(()=>centrescalenow(genes));
                // centrescalenow(genes)
            }
            currentObjects = xobj.currentObjects;  // can be upset by centrescalenow if it has to do real work for hornTrancodeForTranrule, sjpt 7/1/18
        }
//        baseShaderChanged();  // added sjpt 7 Spet 2016 // not sure why but this resolved some scaling on load in addition to above

        refall();

        setViewports();
        currentGenes = xxxgenes(mainvp);
        if (!currentGenes.tranrule)
            currentGenes.tranrule = xobj.genes.tranrule;
        target = clone(currentGenes);
        defaultObj = clone(currentGenes);

    }

    if (xobj.geneids)
        geneids = xobj.geneids;

    if (xobj.frameSaver)
        frameSaver = xobj.frameSaver;

    if (xobj.evaluate)
        eval(xobj.evaluate);
    newmain();
    return resgenes;
}
var regularizeTranruleOnLoad = false;



/** load genes for the given genes, return object.  If incfrozen is set, load even frozen genes  */
function loadgenes(genes, incfrozen) {
    var bundle = trancodeForTranrule(genes.tranrule, genes);
    if (!bundle) { serious('attempt to load bad object'); return undefined; }
    setGUITranrule(genes);  // do this early so we can see it even if it fails

    //console.log(genes);
    // compatibility
    if (genes.reflStrength !== undefined && genes.refl1 === undefined) {
        genes.refl1 = genes.refl2 = genes.reflStrength;
        delete genes.reflStrength;
    }
    if (savedef === "organic")
        genes.tranrule = genes.tranrule.replace(" stack(-st0*0.5,t); autoscale", "");  // in case of legacy
    transformTexture(genes);

    //
    var resgenes = {};
    if (bundle.getgenenames)
        for (let gn in bundle.getgenenames())
            if (genedefs[gn]) resgenes[gn] = genedefs[gn].def;                // make sure all genes included in case genes/currentGenes incomplete
    copyFrom(resgenes, incfrozen ? genes : currentGenes);   // and replace as appropriate
    resgenes.tranrule = genes.tranrule;
    for (let gn in genedefs) {   // load those from genes that may be genes
        if (!incfrozen && genedefs[gn].free === 0) continue;
        if (genes[gn] !== undefined && genes[gn] !== null) {  // may be null,  TODO check why
            var v = genes[gn].value !== undefined ? genes[gn].value : genes[gn];  // allow for old save of uniforms or new save of genes
            resgenes[gn] = v;
        }
    }

    // extra non-gene features
    if (!resgenes._rot4_ele) resgenes._rot4_ele = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    if (!resgenes._camz) resgenes._camz = zoomdef.camz0 * basescale;
    if (!resgenes._fov) resgenes._fov = zoomdef.fov;

//  we never want to scale, the object has been saved with its camera etc information which we want to preserve
//  sjpt 19 Jan 2014
//    // TDR, this breaks 2 very specific shapes ( Neptune1 & Sun1 )
//    // does not seem to do anything of immediate consequence to the rest
//    if( !self.UICom.m _isProjVersion ) { // scale in loadgenes breaks 2 very specific shapes ( Neptune1 & Sun1 )
//        scale(resgenes);
//    }

    return resgenes;
}


var webGalByNum;  // same as allGal, but array sorted by name or date
/** read data from web, gets names and data; */
function readWebGalX() {
    if (oxcsynth) return {csynth1: {  name: "csynth1",  date: "2018-01-19T10:41:29.000Z" }};
    const res  = {};
    if (nwfs) {
        const files = nwfs.readdirSync("gallery");
        for (let f=0; f<files.length; f++) {
            const ff = files[f].split("\t");
            const fid = ff[0];
            if (fid.endsWith(".oao")) {
                const name = fid.replace('.oao','');
                const date = nwfs.statSync("gallery/" + fid).mtime;
                res[name] = {name: name, date: date };
            }
        }
    } else {
        // use robocopy rather than dir because it gives seconds
        // https://stackoverflow.com/questions/15113245/a-more-accurate-windows-command-prompt-dir-modified-time
        //XXX TODO::: don't use windows specific commands
        const files = runcommandphp('cmd /k robocopy gallery . *.oao /L /TS').split('\r\n');
        for (let f=0; f<files.length; f++) {
            const ff = files[f];
            const d = ff.substr(26, 19);
            if (!d.startsWith("20")) continue;
            const date = new Date(d);
            const name = ff.substr(46).pre('.oao');
            res[name] = {name, date};
        }
    }
        // files = posturi("addr.php", "dir=gallery&op=DIR&from=XXX&to=XXX").split("\n");
    return res;
}

var baseroot = "stems/";

/** save input configuration to local file */
function stemSave(stem) {
    if (!nwfs) { serious("no stemSave outside node webkit"); return; }

    stem = stem !== undefined ? stem : trygeteleval("boundsprefix", "xxx");
    var fstem = stem === "" ? "all" : stem;
    var s = saveInputState();
    s = JSON.stringify(s,undefined,2);
    try { nwfs.mkdirSync(baseroot + fstem); } catch(e) {}
    nwfs.writeFileSync(baseroot + fstem + "/" + fstem + ".stem", s);

    for (let n in allGal) {
        if (n.startsWith(stem))
            saveObjToFS(n, getGal(n), fstem);
    }
}

/** save gallery to filesystem; only used for migration process */
function saveGalToFS(root) {
    for (let name in allGal) {
        saveObjToFS(name, getGal(name), root);
    }
}

/** save object to filesystem */
function saveObjToFS(name, xobj, root) {
    if (root === undefined) root = "";
    if (root !== "") {
        root = root + "/";   // nb double // do not matter in name
        try { nwfs.mkdirSync(root); } catch(e) {};
    } else {
        // root = baseroot;
    }
    var fid = root + name + ".oao";
    nwfs.writeFileSync(fid, JSON.stringify(xobj, undefined, 2));
    var date = dd(xobj.date);

    var pp = require('child_process');
    fid = fid.replace("/", "\\");
    //// could have used fs.utimesSync(path, atime, mtime) ???
    pp.spawn('C:\\utils\\nircmd.exe', ['setfiletime', fid, date, date]);
    function dd(d) { d =d.toISOString(); return d.substr(8,2)+"-"+d.substr(5,2)+"-"+d.substr(0,4) + " " + d.substr(11,8); }
}

/** clean object */
function cleanoao(fid) {
    currentGenes = {};
    setHornSet();
    for (let gn in genedefs) if (!permgenes[gn]) delete genedefs[gn];
    var data = getfiledata(fid);
    loadOao(data, fid);
    //Maestro.on("postframe", function() {
    cleangenesall();
    addGenesToExtraObjects();
    save(fid + "CLEAN");
    //}, undefined, true);
}

FrameSaver.Save = function() {
    frameSaver.resbaseui = inputs.resbaseui;
    frameSaver.resdyndeltaui = inputs.resdyndeltaui;
    frameSaver.renderRatioUi = inputs.renderRatioUi;
    frameSaver.projvp = inputs.projvp;
    frameSaver.fullvp = inputs.fullvp;
    frameSaver.vps = vps;
    frameSaver.size = [width, height];
};

 FrameSaver.Restore = function() {
    // restore original resolution
    setInput(W.resbaseui, frameSaver.resbaseui);
    setInput(W.resdyndeltaui, frameSaver.resdyndeltaui);
    setInput(W.renderRatioUi, frameSaver.renderRatioUi);
    setInput(W.projvp, frameSaver.projvp);
    setInput(W.fullvp, frameSaver.fullvp);
    setSize(frameSaver.size);
    setViewports(frameSaver.vps);
};

// get a subdirectory in temp
function tmpdir(subdir) {
    const tmp = runcommandphp('set tmp').post('=').trim() + '\\' + subdir;
    runcommandphp('mkdir ' + tmp);
    return tmp;
}

// get the organic desktop (or other save) dir
function getdesksave() {
    try {
        var os = require('os');
    } catch (e) {
        return '';
    }
    let desksave;
    if (nwfs.existsSync('D:/organicsaves')) {
        desksave = 'D:/organicsaves';
    } else {
        var deskdir = os.homedir ? os.homedir() : process.env.USERPROFILE;  // no os.homedir() in nw.js
        if (!deskdir) { deskdir = 'save'; if (!nwfs.existsSync(deskdir)) nwfs.mkdirSync(deskdir);}   // for mac nwjs
        if (!nwfs.existsSync(deskdir + "/Desktop")) deskdir = deskdir.replace("C:", "D:");  // william's laptop install with aliased desktop march 17
        if (!nwfs.existsSync(deskdir + "/Desktop")) deskdir = "C:";  // for Windows 7 ???, at least for DOCW1135
        if (!nwfs.existsSync(deskdir)) serious("Cannot find a suitable Desktop to save in");
        desksave = deskdir + "/Desktop/organicsaves";
    }
    //Error: ENOENT: no such file or directory, access 'C:\Users\Peter/Desktop/organicsaves' at Object.fs.accessSync...
    //in fs.exisitsSync .... why would it fail on that and not earlier?
    if (!nwfs.existsSync(desksave)) nwfs.mkdirSync(desksave);
    return desksave;
}

var geneids = [];
/** start frameSaver sequence, set up for recording genes for each frame
 * Only called internally to FrameSaver.
 */
FrameSaver._Start = function() {
    log('FrameSaver._Start');
    frameSaver = { type: frameSaver.type, quickout: frameSaver.quickout };
    frameSaver.models = [];
    frameSaver.fps = 60;  // may be overridden before rendering
    frameSaver.num = -1;
    FrameSaver.Save();
    setInput(W.resbaseui, 9);       // resolutions to use for prerun
    setInput(W.resdyndeltaui, 1);
    setInput(W.renderRatioUi, 1);
    if (Director.inbetween === Director.keyframesInbetween) forceCPUScale();

    geneids = [];
    for (let gn in currentGenes) if (typeof currentGenes[gn] === "number") geneids.push(gn);

    if (frameSaver.renderDirectory) log("start frame saving with rerendering incomplete, rest will be ignored in", frameSaver.renderDirectory);
    frameSaver.renderDirectory = undefined;
    if (nwfs) {         // create special directory
        var desksave = getdesksave();

        // frameSaver.saveId = currentGenes.name + "_" + ((new Date()).toISOString().replaceall(":","."));
        frameSaver.saveId = saven(undefined, undefined, desksave);  // save in gallery, also make sure we dont conflict with desksave saves
        frameSaver.saveDirectory = desksave + "/" + frameSaver.saveId;
        // try { nwfs.mkdirSync('save'); } catch(e) {}
        nwfs.mkdirSync(frameSaver.saveDirectory);
        nwfs.mkdirSync(frameSaver.saveDirectory + "/models");
        nwfs.mkdirSync(frameSaver.saveDirectory + "/images");
        if (frameSaver.type === "buffer") {
            frameSaver.modelstream = nwfs.createWriteStream(frameSaver.saveDirectory + "/genes.binary");
            frameSaver.recordlen = (geneids.length + 16) * 4;
            // saveSnap(frameSaver.lastSaveDirectory + "/" + frameSaver.lastSaveDirectory + ".oao");
        }


        // save helper file to run ffmpeg
        var runff = 'rem - run ffmpeg using organicart runffmpeg.cmd\r\n';
        runff += "pushd %~dp0\r\n";
        runff += 'call "' + process.cwd() + '/runffmpeg.cmd" . ' + frameSaver.fps + ' %*\r\n';
        runff += 'echo ffmpeg complete, code %ERRORLEVEL%\r\n';
        // runff += 'pause Hit any key to finish.\r\n';
        runff += "popd\r\n";
        remotesave(frameSaver.saveDirectory + "/runffmpegL.cmd", runff);

        // and image delete helper file
        var delff = 'rem - delete most image files, save every 100\r\n';
        delff += "mkdir saveimages\r\n";
        delff += "move images\\*000.* saveimages\r\n";
        delff += "del /q images\r\n";
        remotesave(frameSaver.saveDirectory + "/deleteMostImages.cmd", delff);

        // save oao file last to leave sensible message
        save(undefined, frameSaver.saveDirectory  + '/' + frameSaver.saveId);
    } else {        // save to autosave
        frameSaver.saveDirectory = "autosave";
    }
    frameSaver.totsize = 0;
    currentGenes._recordTime = 0;

};

frameSaver.baseTime = 0;

/** (optionally) set up frame and save data on every frame, also control calling other frameSave functions */
FrameSaver.PreStep = function() {
    if (inputsanimsave) {
        var savefid = trygeteleval("imagename", "anim");
        var savefidl = savefid + (framenum + 1000000).toString().substring(1);
        if (!frameSaver.saveDirectory) {   // start of new animation save
            FrameSaver._Start();
        }

        if (frameSaver.num === -1) {   // very fisrt, ignore to gives times chance to get regular
            frameSaver.num++;
            return;
        } else if (frameSaver.num === 0) {   // first one in, start audio record
            frameSaver.baseTime = frametime;
            currentGenes._recordTime = 0;
            // start recording after all the other 'overhead' things finished
            // may mean audio is a tad behind rather than a tad ahead, to consider ....
            //if (trygetele("saveAnimAudio", "checked")) {
            if (!frameSaver.quickout) {
                log("~~~~~~~~ starting audio recording ~~~~~~~~~~");
                wasRecordingWithAnim = true;
                startAudioRecording(frameSaver.saveDirectory + "/audio.wav");
            }
            //}

        } else {
            currentGenes._recordTime = frametime - frameSaver.baseTime;
            if (frameSaver.num < 10) {
                log("time frame", frameSaver.num, frametime - frameSaver.lasttime);
            }
        }
        frameSaver.lasttime = frametime;


        if (inputs.realtimeimages) {
            var sgenes = { name: currentGenes.name, date: Date(), genes: currentGenes };
            remotesave(frameSaver.saveDirectory + "/" + savefidl + ".oao", sgenes);
            var sss = imsize(0,0,0,true);  // get size from GUI
            if (width === sss[0] && height === sss[1])
                saveframe(savefidl, inputs.animquality, "png" );
            else
                setSize(sss);
        } else {
            var sg = genesToBuffer();
            frameSaver.totsize += sg.length * (genesToBuffer.JSON ? 1 : 4);
            msgfix("saveanim", "saving frames, saved=", frameSaver.num , "secs=",  currentGenes._recordTime/1000, "frames=", Math.floor(currentGenes._recordTime/1000 * frameSaver.fps),
                "average record fps", format(frameSaver.num * 1000/currentGenes._recordTime, 1)); // "MB=" + Math.floor(frameSaver.totsize/1024/1024));
            if (frameSaver.type === "buffer") {
                frameSaver.modelstream.write(sg);
            } else if (frameSaver.type === "director") {
                if (frameSaver.quickout) {
                    frameSaver.quickout = false;
                    inputsanimsave = false; // setInput(W.animsave, false);
                }
            } else {
                frameSaver.models.push(sg);
            }
            frameSaver.num++;
        }
    } else if (frameSaver.saveDirectory) {  // saving just finished, prepare for rendering
        FrameSaver.StopRecord();
    }

    // render outstanding models in frameSaver.renderDirectory, if any
    if (frameSaver.renderDirectory) {
        frameSaver.stopNext = !FrameSaver.Render();
    }
};


/** (optionally) save data on every frame, also control calling other frameSave functions */
FrameSaver.PostStep = function() {
    if (frameSaver.defersave) {
        saveframetga.convert();             // start convertion of this frame's result asap
        saveframetga(frameSaver.defersave); // this will save the old one read at the start of this frame
        frameSaver.defersave = undefined;
    }
    if (frameSaver.pendBatch) {
        // ??? this is the place to add to ranges.txt
        FrameSaver.Runffmpeg(frameSaver.renderDirectory, frameSaver.pendBatch);
        frameSaver.pendBatch = undefined;
    }

    if (frameSaver.stopNext) {
        FrameSaver.Endup();        // stop using feedback from FrameSaver.Render()
        frameSaver.stopNext = false;
    }
};


/** save genes into a buffer for recovery later */
function genesToBuffer(genes) {
    genes = genes || currentGenes;
    var sg;
    if (frameSaver.type === "JSON") {
        sg = JSON.stringify(currentGenes);
    } else if (frameSaver.type === "F32Array") {
        sg = new Float32Array(geneids.length + 16);
        let i;
        for (i=0; i < geneids.length; i++) sg[i] = currentGenes[geneids[i]];
        for (let j=0; j<16; j++) sg[i++] = currentGenes._rot4_ele[j];
    } else if (frameSaver.type === "buffer") {
        sg = new Buffer(frameSaver.recordlen);
        let i;
        for (i=0; i < geneids.length; i++) sg.writeFloatLE(currentGenes[geneids[i]], i*4);
        for (let j=0; j<16; j++) sg.writeFloatLE(currentGenes._rot4_ele[j], i++ * 4);
    } else if (frameSaver.type === "director") {
        sg = "";         // ??? maybe this should just be invalid ???
    } else serious("bad frameSaver.type ", frameSaver.type);
    return sg;
}
frameSaver.type = "buffer";

/** recover genes from buffer, for buffer n is a number of frames to be smoothed */
function genesFromBuffer(sg, genes, n) {
    // if (!sg) return;  // TODO find out why, looks like we are 1 frame out ???  may end up with two identical frames if so
    genes = genes || currentGenes;
    if (frameSaver.type === "JSON") {
        var newgenes = JSON.parse(sg);
        copyFrom(genes, newgenes);
    } else if (frameSaver.type === "F32Array") {
        let i;
        for (i=0; i < geneids.length; i++) genes[geneids[i]] = sg[i];
        for (let j=0; j<16; j++) genes._rot4_ele[j] = sg[i++];
    } else if (frameSaver.type === "buffer") {
            // average over several frames
        // var n = sg.length / frameSaver.recordlen;
        var p = 0;  // position

        for (let i=0; i < geneids.length; i++) genes[geneids[i]] = 0;
        for (let j=0; j<16; j++) genes._rot4_ele[j] = 0;

        for (let rr = 0; rr < n; rr++) {
            for (let i=0; i < geneids.length; i++) genes[geneids[i]] += sg.readFloatLE(p++ * 4);
            for (let j=0; j<16; j++) genes._rot4_ele[j] += sg.readFloatLE(p++ * 4);
        }

        for (let i=0; i < geneids.length; i++) genes[geneids[i]] /= n;
        for (let j=0; j<16; j++) genes._rot4_ele[j] /= n;

        if (W.wrongtime) {
            var s = genes._recordTime;
            genes._recordTime = frameSaver.nexttime;
            frameSaver.nexttime = s;
        }
    } else serious("bad frameSaver.type ", frameSaver.type);
}

FrameSaver.StopRecord = function() {
    log("~~~~~~ stopping recording ~~~~~~~~ time=", (frametime - frameSaver.baseTime)/1000 );
    msgfix("saveanim", "END recording frames, ctrl-shift-Q to render them.", 'dir=', frameSaver.saveDirectory);
    if (frameSaver.lastSaveDirectory) {  // TODO cleaner state machine for recording/rendering
        if (frameSaver.saveDirectory) {
            serious('very odd status in FrameSaver.StopRecord');
        } else {
            log("stopping already stopped recording ignored", frameSaver.lastSaveDirectory);
            return;
        }
    }
    if (wasRecordingWithAnim) {
        wasRecordingWithAnim = false;
        stopAudioRecording();
    }
    // FrameSaver.StartRender(frameSaver.saveDirectory);
    frameSaver.lastSaveDirectory = frameSaver.saveDirectory;
    delete frameSaver.saveDirectory;
    if (frameSaver.type === "buffer") {
        frameSaver.modelstream.close();
    }
    delete frameSaver.modelstream;

    // repeat save so that currentGenes._recordTime is correct, pending best way to do it
    //save(undefined, frameSaver.saveId);
    //save(undefined, frameSaver.lastSaveDirectory  + '/' + frameSaver.saveId);

    FrameSaver.Restore();
    frameSaver.saved = frameSaver.num;
    if (frameSaver.type === 'director') {
        // leave to director to set
    } else {
        frameSaver.lastRecordTime = currentGenes._recordTime;
    }
    // done at start saveSnap(frameSaver.lastSaveDirectory + "/" + frameSaver.lastSaveDirectory + ".oao");
    // done at start saveSnap("save/" + frameSaver.saveId + ".oao");
};


// start the process of replay.
// If frameSaver.showonly is set this is just a replay
// If it is not set, the frames are saved and appopriate video recording form saved frames initiated
// For details of video generation timing see
//     https://docs.google.com/document/d/1IeUvq-HQucrA7Wz7AqOzumHLj5iXkBeQ-OM---WR9WA/edit#heading=h.6vgoecfqido8

//
FrameSaver.StartRender = function(rdir, fps = Director.fps) {
    if (frameSaver.renderDirectory) {
        msgfix('stopping render', 'StartRender called while already rendering.');
        frameSaver.renderDirectory = undefined;
        return;
    }
    frameSaver.fps = fps;

    if (!inputs.realtimeimages) {
        rdir = rdir || frameSaver.lastSaveDirectory;
        if (!rdir) {    // after load from gallery, find and use corresponding desktop/organicsaves directory
            var fn = loadOao.lastfn.replace('gallery/', '').replace('.oao', '');
            var ffn = getdesksave() + '/' + fn;
            if (nwfs && nwfs.existsSync(ffn + '/genes.binary'))
                rdir = frameSaver.lastSaveDirectory = ffn;
        }
        if (!rdir) { msgfix(">saveanim", "no available data from which to rerun/render"); return; }
        if (geneids.length === 0) { msgfix(">saveanim", "no saved geneids, cannot rerun/render"); return; }
        frameSaver.renderDirectory = rdir;
        log("~~~~~~ starting rendering recorded models ~~~~~~~~");
        if (frameSaver.type === "buffer") {
            frameSaver.nexttime = 0;
            var fid = frameSaver.renderDirectory + "/genes.binary";
            frameSaver.streamlen = nwfs.statSync(fid).size;
        // check information to match the stream with geneids
        // will usually detect errors by not having exact number of records
        // will try to correct errors by recomputing geneids
        //   this should not be necessary with 'modern' saves that should have correct geneids
            frameSaver.recordlen = (geneids.length + 16) * 4;
            frameSaver.numInputRecords = frameSaver.streamlen / frameSaver.recordlen;
            if (frameSaver.numInputRecords%1 !== 0) {
                let mmmm = msgfix('>loadgenestream', 'stream len', frameSaver.streamlen, 'not integer mult record len', frameSaver.recordlen, 'recs', frameSaver.numInputRecords);

                var ol = geneids.length;
                // try a patch with new geneids
                geneids = [];
                for (let gn in currentGenes) if (typeof currentGenes[gn] === "number") geneids.push(gn);
                frameSaver.recordlen = (geneids.length + 16) * 4;
                frameSaver.numInputRecords = frameSaver.streamlen / frameSaver.recordlen;
                if (frameSaver.numInputRecords%1 !== 0) {
                    frameSaver.renderDirectory = undefined;
                    mmmm = msgfix('>loadgenestreampatch', 'stream len', frameSaver.streamlen, 'not integer mult record len', frameSaver.recordlen, 'recs', frameSaver.numInputRecords);
                    throwe(mmmm);
                }
                msgfix('>patched geneid used, len', ol, ' -> ', geneids.length);
            }

            // read last record to find time
            var ffd = nwfs.openSync(fid, 'r');
            frameSaver.inbuff = new Buffer(frameSaver.recordlen);
            var l = nwfs.readSync(ffd, frameSaver.inbuff, 0, frameSaver.recordlen, frameSaver.streamlen - frameSaver.recordlen );
            if (l !== frameSaver.recordlen) {
                frameSaver.renderDirectory=undefined;
                let mmmm = log('unexpected read');
                throwe(mmmm);
            }
            nwfs.closeSync(ffd);
            var g = { _rot4_ele: [] };
            g._recordTime = 99999999999;

            W.wrongtime = false;  // always false // temp for Peterburg till record corrected for playback when recorded frames have time stamp on wrong buffer frame
            genesFromBuffer(frameSaver.inbuff, g, 1);
            //W.wrongtime = true;   // TODO, temp for Peterburg till record corrected for playback when recorded frames have time stamp on wrong buffer frame
            frameSaver.lastRecordTime = g._recordTime;

            frameSaver.inputfd = nwfs.openSync(fid, 'r');
            if (frameSaver.replaysmooth === undefined) frameSaver.replaysmooth = 10;
            frameSaver.inbuff = new Buffer(frameSaver.recordlen * frameSaver.replaysmooth);
            // frameSaver.modelstream = nwfs.createReadStream(fid);
            msgfix('inputstream', 'size', frameSaver.streamlen, 'genes', geneids.length, 'reclen', frameSaver.recordlen, 'records', frameSaver.numInputRecords, 'time', frameSaver.lastRecordTime);
        }  // type === buffer
        frameSaver.saveframe = -15;  // ensure feedback ok before starting for real
        frameSaver.num = 0;
        frameSaver.framesToRender = Math.floor(frameSaver.lastRecordTime / 1000 * frameSaver.fps) + 1;
        frameSaver.prev = { _recordTime: -1, _rot4_ele: [] };
        frameSaver.next = { _recordTime: -1, _rot4_ele: [] };

        FrameSaver.Save();
        if (!frameSaver.showonly) { // setup for save image/record
            setInput(W.resbaseui, 12);      // resolutions to use for main run if saving rendered frames
            setInput(W.resdyndeltaui, 1);
            setInput(W.renderRatioUi, 1);  // 1/3 was MUCH slower

            //setInput(W.resbaseui, 10);
            //setInput(W.resdyndeltaui, 1);
            //setInput(W.renderRatioUi, 1);

            setInput(W.fullvp, false);
            setInput(W.projvp, false);
            var sss = imsize(0,0,0,true);
            if (renderObjs === renderQuad) {  // renderQuad was for York 4 wall recording
                vpborder = 0;
                setViewports([4,1]);
                sss[0] *= 4;
                //## sss = [1920*4, 1200];
            } else {
                setViewports([0,0]);
            }
            setSize(sss);
            log('set up start render', sss[0], sss[1]);
            frameSaver.safeRenderFrame = true;  // make sure no frame gets recorded before vps etc reset
            frameSaver.startRecordTime = Date.now();

            FrameSaver.Asyncffmpeg = undefined;
            frameSaver.ffmPending = {};
        // save the ranges.txt file if running ffmpeg in batches
        // and set up ffmPending to wait till they are all ready
            if (FrameSaver.batchSize) {
                var batch = Math.floor(frameSaver.framesToRender / FrameSaver.batchSize);
                var fbatch = (batch + 1000000).toString().substring(1);
                // ??? nothig to ffmpeg yet ??? FrameSaver.Runffmpeg(frameSaver.renderDirectory, fbatch);
                var s = "";
                for (let b = 0; b <= batch; b++) {
                        fbatch = (b + 1000000).toString().substring(1);
                        s += 'file B_' + fbatch + ".mp4\n";
                        frameSaver.ffmPending[b] = 'pending';
                }
                remotesave(frameSaver.renderDirectory + "/ranges.txt", s);
            }
        }  // end setup for save image/record

        //  msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
    }  // not realtime image save
};

/** called each frame for rendering given correct fps, return false if no correct frame available */
FrameSaver.Render = function() {
    newframe();

    if (frameSaver.safeRenderFrame) { delete frameSaver.safeRenderFrame; return true; }
    while(true) {  // loop in case frame already rendered
        var rendertime = frameSaver.saveframe / frameSaver.fps * 1000;
        var keepGoing = true;   // allow for one extra frame at end because of readPixel timing

        // establish next frame, either from recording or from directdor
        if (frameSaver.type === "director") {
            keepGoing = Director.setframenum(frameSaver.saveframe);
        } else {

            var sg;
            msgfix('times', frameSaver.prev._recordTime, '...' , frameSaver.next._recordTime, rendertime);
            while (frameSaver.next._recordTime <= rendertime) {
                copyFrom(frameSaver.prev, frameSaver.next);
                var framesRead = 1;  // unless overridden by buffer
                if (frameSaver.type === "buffer") {
                    if (frameSaver.num * (frameSaver.recordlen) === frameSaver.streamlen) {
                        msgfix('playback', 'end of stream stopped playback at', frameSaver.saveframe);
                        return false;
                    }

                    //sg = frameSaver.modelstream.read(frameSaver.recordlen * frameSaver.replaysmooth);
                    //if (!sg)
                    //    return true;  // try again next frame, read is oddly async <<<<< TODO FIX THIS
                    var framesToRead = frameSaver.num === 0 ? 1 : frameSaver.replaysmooth;
                    var l = nwfs.readSync(frameSaver.inputfd, frameSaver.inbuff, 0, framesToRead * frameSaver.recordlen );
                    framesRead = l / frameSaver.recordlen;
                    //if (framesRead !== framesToRead)
                    //    debugger;  // temp test, will usually fail at end of stream
                    frameSaver.num += framesRead;
                    msgfix('input stream records', frameSaver.num, 'of', frameSaver.numInputRecords);
                    sg = frameSaver.inbuff;

                } else {
                    sg = frameSaver.models.shift();
                    frameSaver.num++;
                }
                if (sg) {
                    genesFromBuffer(sg, frameSaver.next, framesRead);
                } else {
                    frameSaver.next._recordTime = 99999999;
                    frameSaver.saveframe = 99999999;
                    log("unexpected read past end of modelstream");
                    return false;
                }
            }
            // linear interp to get current
            var p = (rendertime - frameSaver.prev._recordTime) / (frameSaver.next._recordTime -frameSaver.prev._recordTime);
            for (let gn in frameSaver.next)
                if (typeof frameSaver.prev[gn] === "number")
                    currentGenes[gn] = (1-p) * frameSaver.prev[gn] + p * frameSaver.next[gn];
            if (frameSaver.prev._rot4_ele.length === 16 && frameSaver.next._rot4_ele.length === 16)
                for (let i=0; i<16; i++) currentGenes._rot4_ele[i] = (1-p) * frameSaver.prev._rot4_ele[i] + p * frameSaver.next._rot4_ele[i];
            //log ("frameSaver.num", frameSaver.num, p, "_camz", currentGenes._camz);
        }

        // display and optionally save frame
        // frameSaver.showonly = true;  // to change when we get recording working again
        if (frameSaver.saveframe  > frameSaver.framesToRender) {
            msgfix('playback', 'all records processed stopped playback at', frameSaver.saveframe);
            return false;
        }
        msgfix('playback', frameSaver.saveframe, 'of', frameSaver.framesToRender, currentGenes._recordTime);
        if (frameSaver.showonly) {
            frameSaver.saveframe += framedelta * frameSaver.fps / 1000;
            return keepGoing;
        } else { // save frame, and if all finished start video making

            //getserveroao(frameSaver.renderDirectory + "/" + model + ".oao");
            var realframenum = frameSaver.saveframe - 1; // allow for early saveframetga/readPixesl
            var savefidl = frameSaver.renderDirectory + "/images/";
            if (FrameSaver.batchSize) {
                var batch = Math.floor(realframenum/FrameSaver.batchSize);
                var num = realframenum%FrameSaver.batchSize;

                var fbatch = (batch + 1000000).toString().substring(1);
                var fnum = (num + 1000000).toString().substring(1);
                savefidl += inputs.imagename + fbatch + 'x' + fnum + ".tga";
                if (num === FrameSaver.batchSize-1)
                    frameSaver.pendBatch = fbatch;
            } else {
                savefidl += inputs.imagename + (realframenum + 1000000).toString().substring(1) + ".tga";
            }
            frameSaver.saveframe++;
            if (nwfs.existsSync(savefidl)) {
                // we are recording and this one already exists
                // the loop will just take up to the next frame to test

            } else {  // we have a real frame to record
                newmain();
                //renderFrame();  // doing this here will mean the renderFrame() in the main animate wil effectively be a noop
                //saveframetga(savefidl);
                if (realframenum >= 0) {
                    //###saveframetgaOLD(savefidl);
                    //### saveframetga.convertDone = false;
                    //###for (let i=0; i < 1000; i++) gl.flush();
                    //###saveframetga.convert();
                    //###for (let i=0; i < 1000; i++) gl.flush();
                    //###saveframetga(savefidl);
                    saveframetga();  // this will do initial readPixels but not the save itself
                    frameSaver.defersave = savefidl;  // arrange for saving at end of frame
                }
                if ((frameSaver.ffmframe > realframenum - 2*FrameSaver.AsyncStep || realframenum >= frameSaver.framesToRender) && FrameSaver.Asyncffmpeg === 'paused') {
                    var spawn = W.require('child_process').spawn;
                    spawn('../ffmpeg/pssuspend.exe', ['-r', 'runffmpeg']);
                    FrameSaver.Asyncffmpeg = 'running';
                    msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
                }
                if (realframenum > 2*FrameSaver.AsyncStep && FrameSaver.Asyncffmpeg === 'pending') {
                    FrameSaver.Runffmpeg(frameSaver.renderDirectory);
                }

                // saveframe(savefidl, inputs.animquality, "png");
                // saveframe3(savefidl);
                // log("saveframe3", savefidl);
                // saveimage(width, height);
                msgfix("saveanim", "rendering frames",
                    "   done=", realframenum, " left=", frameSaver.framesToRender - realframenum,"of", + frameSaver.framesToRender);
                break;  // found a useful one, so continue
            }  //  we have recorded a real frame
        }
    }  // loop looking for useful one to render
    return keepGoing;
};


/** finish frameSaver, spawn video maker and restore settings */
FrameSaver.Endup = function() {
    if (frameSaver.modelstream) frameSaver.modelstream.close();
    frameSaver.modelstream = undefined;
    if (frameSaver.inputfd !== undefined) nwfs.closeSync(frameSaver.inputfd);
    frameSaver.inputfd = undefined;
// all models rendered, save video if possible and go back to normal mode
    msgfix("saveanim", "time taken", Date.now() - frameSaver.startRecordTime);
// ffmpeg conversion ...
// %ff% -framerate 30 -i organic%06d.png -c:v libx264 -r 30 out.mp4
    if (!FrameSaver.Asyncffmpeg && !frameSaver.showonly) {
        if (FrameSaver.batchSize) {
            var batch = Math.floor(frameSaver.framesToRender / FrameSaver.batchSize);
            var fbatch = (batch + 1000000).toString().substring(1);
            // ??? or save complete ranges.txt here ???
            FrameSaver.Runffmpeg(frameSaver.renderDirectory, fbatch);
            //remotesave(frameSaver.renderDirectory + "/catffmpeg.cmd", "ffmpeg.exe -f concat -i mylist.txt -c copy out.mp4");
        } else {
            FrameSaver.Runffmpeg(frameSaver.renderDirectory);
        }
    }

    frameSaver.lastRenderDirectory = frameSaver.renderDirectory;
    frameSaver.renderDirectory = undefined;
    saveframetga.convertDone = false;       // do not use last frame at start of next sequence

    FrameSaver.Restore();
};

/** runffmpeg on movie or range (optional) of movie */
FrameSaver.Runffmpeg = function(dir, range) {
    dir = dir.replaceall('\\', '/');

    if (W.isNode() && frameSaver.saveframe !== 99999999) {
        var isWin = /^win/.test(require('os').platform());
        if (!isWin) {
            var ffmpeg = require('fluent-ffmpeg');
            var path = require('path');
            var command = ffmpeg();
            var crf = 18, preset = 'slow';
            var audioFile = frameSaver.renderDirectory + '/audio.wav';
            if (nwfs.existsSync(audioFile)) command.addInput(audioFile);
            command.addInput(path.normalize(dir + '/images/organic%06d.png'))
                .inputFPS(frameSaver.fps).fps(frameSaver.fps)
                .videoCodec('libx264').addOptions(['-crf '+crf, '-preset '+preset])
                .output(dir + '/organic_'+crf+'_'+preset+'.mp4')
                .on('end', function(){log('finished writing video in ' + dir); })
                .run();
        } else {
            if (range) frameSaver.ffmPending[range*1] = 'running';
            frameSaver.ffmframes = [];
            frameSaver.ffmframe = 0;
            var spawn = W.require('child_process').spawn;
            // var args = ['-framerate', '30', '-i', 'organic%06d.png', '-c:v', 'libx264', '-r',  '30',  'out.mp4'];
            //var ffm = spawn('runffmpeg.cmd', ['"' + dir.replaceall("/", "\\") + '"']);
            var ffm = spawn(dir + '/runffmpegL.cmd', range ? [range] : undefined);
            if (FrameSaver.Asyncffmpeg === 'pending') {
                FrameSaver.Asyncffmpeg = 'running';
                msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
            }

            ffm.on('exit', function(code, signal) {
                msgfixlog("[ffm]", range, 'Exit with code ' + code + ', "' + signal + '"<br>' + ffm.fid);
                log('ffmpeg complete, frames seen', frameSaver.ffmframes.join(','));
                if (FrameSaver.Asyncffmpeg) {
                    FrameSaver.Asyncffmpeg = 'ended';
                    msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
                }
                delete frameSaver.ffmPending[range*1];
                if (range && Object.keys(frameSaver.ffmPending).length === 0)
                    FrameSaver.Runffmpeg(dir);
            });
            ffm.on('error', function(err) {
                msgfixlog("[ffm-error]", range, err);
                if (FrameSaver.Asyncffmpeg) {
                    FrameSaver.Asyncffmpeg = 'ended error';
                    msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
                }
                delete frameSaver.ffmPending[range*1];
                if (range && Object.keys(frameSaver.ffmPending).length === 0)
                    FrameSaver.Runffmpeg(dir);
            });
            ffm.stdout.on('data', function(data) {
                // this will come from the wrapper .cmd but not from ffmpeg itself
                data = "" + data;
                if (data.indexOf('Writing to') !== -1) {
                    var p = data.lastIndexOf('Writing to');
                    ffm.fid = data.substr(p).pre('\n');
                    msgfixlog('[ffm]', range, ffm.fid);
                }
                log('[ffm-stdout]', "" + data);
            });
            ffm.stderr.on('data', function(data) {
                // ffmpeg itself issues all 'console' output as stderr
                //if (data.indexOf("command FIFO full" !== -1)) //todo something!
                data = "" + data;
                var fdata = data.post('frame=');
                if (fdata) {
                    var p = data.lastIndexOf('frame=');
                    var ffmdetails = 'frame= ' + fdata.pre('\n');
                    frameSaver.ffmframe = fdata.trim().pre(' ') * 1;
                    frameSaver.ffmframes.push(frameSaver.ffmframe);
                    if (!isNaN(frameSaver.ffmframe)) {
                        if (frameSaver.ffmframe > frameSaver.saveframe - FrameSaver.AsyncStep && FrameSaver.Asyncffmpeg === 'running') {
                            spawn('../ffmpeg/pssuspend.exe', ['runffmpeg']);
                            FrameSaver.Asyncffmpeg = 'paused';
                            msgfixlog("[asyncffmpeg]", FrameSaver.Asyncffmpeg);
                        }
                    }
                    msgfix('[ffm]', range, ffmdetails + '<br>' + ffm.fid);
                }
                console.info('[ffm-stderr]' + data);
            });
        }
    }
};
FrameSaver.AsyncStep = 100;  // amount ffmpeg allowed to get ahdead/behind
//FrameSaver.Asyncffmpeg;      // leave as undefined and the machanism won't kick in
FrameSaver.batchSize = 300;     // batch of images before running ffmpeg


/***  comments during cleanup of saves
 * saveCilly ->saveTextfile                 saves Cilly definitions
 * stl output -> saveTextfile               saves stl file (coords for 3d)
 *
 *   saveTextfile -> saveAs                 saves text [only used by stl and cilly]
 *
 *   saveframe -> saveAs                    captures using canvas.canvas.toDataURL
 *             -> writeUrlImageRemote
 *   saveimage -> saveAs                    captures using readPixel, ppm and bmp only
 *
 *
 *   saveAs                             FileSaver.js, saves as download
 *   nwfs.writeFileSync                 saves where told by parm
 *
 *
 *   writetextremote                    saves text using XMLHttpRequest and savefile.php
 *   writeUrlImageRemote                saves image using XMLHttpRequest and savefile.php
 *
 *
 *   saveSnap -> remotesave             saves full .oao
 *   saven -> save
 *   save -> remotesave
 *   remotesave -> writetextremote      save using writetextremote
 *
 *   animsave -> nwfs.writeFileSync     for continuous animation save
 *   saveStem -> nwfs.writeFileSync     for save stem, obsolete?
 *              -> saveObjToFS
 *   saveGalToFS -> saveObjToFS         save gal from dataorganic to separate file format
 *   saveObjToFS -> nwfs.writeFileSync
 *
 *   GX.write -> localStorage | saveAs | writetextremote
 *
 *
 *    ~~~~~~~~~~~~~~~ gallery
 *    allGal contains populated list of gallery as Object   -> getGal()
 *    webGalByNum  same as allGal, but sorted array         -> readWebGal()  [was webGalNames)
 */

/** function for bulk render of New Scientist images, may be reworked later
note some special cases below
also, to get 13/19/23 to render we must first load 31 ...??? not sure why
 */
function nysetForAnim(num) {
    if (num === undefined) num = [57, 51, 56,     28, 59, 69,   23, 77, 47,    19, 64, 70,   66, 13, 31, 30,    63];
    for (let i=0; i<num.length; i++) {
        var fid = 'C:/Users/Organic/Dropbox/Organicart/organicart/gallery/York_15x_NewS2__' + num[i] + '.oao';
        var data = nwfs.readFileSync(fid).toString();
        var xx = dstringGenes(data);
        copyFrom(slots[i+1].dispobj.genes, xx.genes);
    }
    setAllLots('wallAspect', 1);
    refall();
}


/** function for bulk render of New Scientist images, may be reworked later
 */
function nyset(num) {
    if (Array.isArray(num)) {
        if (num.length === 0) return;
        var n = num.pop();
        var rest = num;
        num = n;
    }

    if (nwfs.existsSync(process.env.USERPROFILE + '/desktop/newsc_' + num + '.tif')) {
        log('do not replace file', num);
        if (rest) nyset(rest);
    } else {
        var fid = 'C:/Users/Organic/Dropbox/Organicart/organicart/gallery/York_15x_NewS2__' + num + '.oao';
        var data = nwfs.readFileSync(fid).toString();

        //loadOao(data, fid);
    var xx = dstringGenes(data);
    var x = {genes: xx.genes, name: 'newsc_' + num};
    loadcurrent(x, true, true, currentGenes);  // incfrozen/loadinputs

        msgfix('file', fid);
        setInput(W.resbaseui, 12);      // resolution to use for nyset special image saving
        setInput(W.resdyndeltaui, 0);
        setInput(W.USESKELBUFFER, false);
        for (let t = 0; t < 1000; t += 50) setTimeout(newmain, t);

        // nyset.fid = 'Q:/Dropbox/iMAL Mutator 1 + 2 2014/NewScientist/round3/newsc_' + num;
        setTimeout(function() {
            saveimage(8192, 8192, undefined, undefined, 'newsc_' + num + ".tga");
            if (rest) nyset(rest);
        }, 1000);
     }
}


 // nyset([57, 51, 56,     28, 59, 69,   23, 77, 47,    19, 64, 70,   66, 13, 31, 30,    63]);

 /** loading calls



    loadOao (dstringGenes)
        loadcurrent(xxx, incfrozen, loadinputs, genes)
            xxxobj  (in mutbase)
                getGal
                    posturi (and dstringGenes)
            loadxobjGetGenes


    loadtarget -> xxxobj, loadxobjGetGenes
    loadcurrent -> xxxobj, loadxobjGetGenes
    loadxobjGetGenes -> xxxobj

    nyset -> loadcurrent (special for preparing new scientist images)

    docdrop -> openfiles -> openfile -> handler -> loadOaO (with DATA)
        handler ... { ".oao": loadOao, ".stem": loadStem, '.oag': loadOag, '.js': evalx, '.binary': loadRunSave };

 ***/

function reloadIfNeeded() {
    const ff = lastopenfiles[0].path.replaceall('\\','/');
    if (ff !== startscript) {
        window.location.href += ';startscript = "' + ff + '"'
    }
}

/** clean up VR related settings if not in VR; see also checkvr in vivecontrol.ts */
var renderVR, V, G, fitCanvasToWindow;
function cleanvr() {
    if (startvr || renderVR.invr()) return;  // clean if in vr or intending to be
    V.keepinroom = false;
    G.cutx = G.cuty = 0;
    if (vps[0] === 2 && vps[1] === 1)
        setViewports([1,1]);
    fitCanvasToWindow();
    if (G.wallAspect === -1) G.wallAspect = 1;
}


/** save big image */
function savebig() {
    const w = 4096, h=4096*3/4;
    const nframe = 20;  // frames for feedback
    if (vps[0] + vps[1] !== 0) {
        const sv = vps, sw = width, sh = height;
        // prepare setup as single for now, then restore
        setInput(W.previewAr, false);
        setViewports([0,0]);
        savebig();
        onframe( function() {
            setSize(sw, sh);
            setViewports(sv);
        }, nframe+3);
        return;
    }

    if (width !== w && width !== h) {
        setSize(w,h);
        fitCanvasToWindow();
        onframe(()=>saveframe(undefined, 0.9, 'jpg'),nframe);
    } else {
        saveframe(undefined, 0.9, 'jpg');
    }
}

/** parse a json file */
function jsonReader(data, fid) {
    jsonReader.parse = JSON.parse(data);
    return jsonReader.parse;
}
var geojsonReader = jsonReader;


/** prompt to save a file */
function promptAndSave(data, extension = 'txt', msg) {
    const cc = CSynth && CSynth.current;
    // let available = cc ? cc.available Files : [];
    const dir = cc ? cc.fullDir : '';
    const name = window.prompt(`enter name for ${extension} file\n${msg}`, '');
    const fid = dir + name + '.' + extension;
    writetextremote(fid, data);
}

/** sample return from local server version
    atime: "2018-10-10T14:03:32.200Z"
    atimeMs: 1539180212199.6782
    birthtime: "2018-10-03T19:12:44.689Z"
    birthtimeMs: 1538593964689.2727
    ctime: "2018-10-11T08:59:38.650Z"
    ctimeMs: 1539248378650.2507
    dev: 584555679
    gid: 0
    ino: 18295873486214340
    mode: 33206
    mtime: "2018-10-11T08:59:38.650Z"
    mtimeMs: 1539248378650.2507
    nlink: 1
    rdev: 0
    size: 3039
    uid: 0
    isDir: false
**/
/** Oxford url styles (see
 * https://docs.google.com/document/d/1uXDwrxbD1fmC-Va0fEu7DU1H-jgFrBlpX0zw7pxMGlQ/edit#heading=h.ileo70levzo8
 *
 *
 Oxford url styles
for private projects
https://csynth.molbiol.ox.ac.uk/csynth/
    top level, all private projects/settings files/project names
https://csynth.molbiol.ox.ac.uk/csynth/serve?p=20&file=load_data.js
    config load file for private project, or data file within project
https://csynth.molbiol.ox.ac.uk/csynth/serve?p=20&file=settings.txt
    list of all files within private project

for public projects
https://csynth.molbiol.ox.ac.uk/csynthstatic/public/p_3ad38c2f-83db-4afb-870b-7b602fca8b96/load_data.js
    config file for public project, or data files within project
https://csynth.molbiol.ox.ac.uk/csynthstatic/public/p_1f2d99f4-938b-411d-910c-4fda1f055a27/
    list of all files within public project
https://csynth.molbiol.ox.ac.uk/csynthstatic/public/
    list of all directories containing public projects


for 'special upload' projects *
https://csynth.molbiol.ox.ac.uk/csynthstatic/data/Lorentz/lorentz.js
     top level config file, or referenced data file
https://csynth.molbiol.ox.ac.uk/csynthstatic/data/Lorentz/
    list of all files within special project (including some subdirectories/projects)
https://csynth.molbiol.ox.ac.uk/csynthstatic/data
   list of all special projects (and some top level files, that should be removed)

*/
/** read directory */
function readdir(dir) {
    let result;
    if (nwfs) {
        // this version for Electron
        const list = nwfs.readdirSync(dir);
        const rr = {};
        list.forEach(n=> {rr[n] = nwfs.statSync(dir + '/' + n)});
        result = rr;

    } else if (location.href.indexOf('https://csynth.molbiol.ox.ac.uk/csynth/serve') !== -1) {
        // this version for Oxford private project
        const r = {};
        const proj = startscript.post('p=').pre('&');
        const odir = posturi(`/csynth/settings?p=${proj}&t=${frametime}`);
        const dirl = odir.split('\n');
        for (let i=1; i<dirl.length; i++) {
            const rr = dirl[i].split('\t');
            r[rr[2]] = {name: rr[2], size: rr[1], mtime: rr[0]};
        }
        result = r;
    } else if (location.host === 'localhost:8807') {  // for microApache
        result = {};
        const odir = posturi(dir);
        const rawlist = odir.post('Parent Dir').split('href="').slice(1);
        rawlist.forEach(lll => {
            const name = lll.pre('"');
            result[name] = {name, isDir: name.endsWith('/')};
        });
    } else if (location.href.indexOf('https://csynth.molbiol.ox.ac.uk') !== -1) {
        // this version for Oxford public project or one of our csynthstatic/data directories
        const r = {};
        const odir = posturi(dir);
        if (!odir) {  // no files

        } else if (odir.indexOf('Parent Dir') !== -1) {
            const rawlist = odir.post('Parent Dir').split('href="').slice(1);
            rawlist.forEach(lll => {
                let aa = lll.match(/(.*?)".*?right">(.*?)<.*?right">(.*?)</);
                r[aa[1]] = {name: aa[1], mtime: aa[2].trim(), size: aa[3].trim()};  // leave date and size as strings
                r[aa[1]].isDir = r[aa[1]].size === '-';
            });
        } else {
            const rawlist = odir.split('<tr>').slice(2);
            rawlist.forEach(lll => {
                let aa = lll.match(/<small>(.*?)<\/small>/);
                r[aa[1]] = {name: aa[1]}; //
            });

        }
        result = r;
        // [aa,bb,cc,dd] = lll.match(/(.*?)".*?right">(.*?)<.*?right">(.*?)</)
// ...href="Interphase_chrII.normMtx.txt">Interphase_chrII.nor..&gt;</a></td><td align="right">2018-01-08 10:17  </td><td align="right"> 66M</td><td>&nbsp;</td></tr>
    } else {
        // this version for local server nodeserver.js
        const fileNames = posturi('dir.php?' + dir.replaceall('//','/'));
        try {
            result = fileNames[0] === '{' ? JSON.parse(fileNames) : fileNames.split(',');
        } catch (e) {
            console.error('error reading directory, return empty', dir, e);
            result = [];
        }
    }
    return result;
}

// make a directory, todo add on-nwfs supprort
function mkdir(dir) {
	if (nwfs) {
		if (!nwfs.existsSync(dir)) nwfs.mkdirSync(dir);
	} else {
		runcommandphp('mkdir ' + dir);
	}
}

/** save oags for curated objects, by default top row from animation */
function saveoags({fn = currentGenes.name, start = 1, end = 8, offset = 0}) {
    for (let i=start; i <= end; i++) {
        const s = slots[i];
        if (!s) { msgfixlog('saveoags no slot', i); continue; }
        const ss = yaml.dump(s.dispobj.genes);
        remotesave('gallery/' + fn + '__' + (i+offset) + '.oag', ss);
    }
}
