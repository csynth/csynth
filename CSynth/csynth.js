    /* eslint-disable multiline-ternary */
/* eslint-disable object-curly-newline */
'use strict';

/* eslint-disable no-unused-vars */

//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var THREE, W, posturi,  checkvr, setInput, onframe, mcamera, log, numInstances, adduniform,
genedefs, setval, framenum, V, dat, addgeneperm, FIRST, guiFromGene, springs,  clearPostCache, uniforms,
currentGenes, msgfix, processFile, VH, Maestro, DNASprings, assert, G, renderVR, camera, CSynthFast, gl, posturibin,
nop, vrcanvCentreOnLeft, COL, shadows, numInstancesP2, currentLoadingDir, currentLoadingFile, throwe, msgfixlog, openfiles,
oxcsynth, aftercontrol, setDefaultExperiences, rot4toGenes, Director, copyFrom, inworker, loadwide,
msgfixerror, getstats, posturierror, ml, fileTypeHandlers, startvr, getFileName, lastopenfiles, nomess,
performance, getFileExtension, posturiasync, serious, customSettings,
indexedDB, posturimsgasync, genbar, searchValues, readtext, readbinaryasync,
array2Table, format, TextDecoder, consoleTime, consoleTimeEnd, uriclean, quietReject, setPickRenderTarget,
frametime, random, seed, GX, zip, loadTime, startscript, readdir, killev, JSZip,
springdemo, yaml, readTextureAsVec3, col3, VEC3, lastdocx, lastdocy, mousewhich, SG, FFG, distxyz, setNovrlights,
GLmolX, tmat4, sleep, BroadcastChannel, hilbertC, Plane, addtarget, runkeys, renderer, viveAnim, S, setExtraKey,
badshader, lastDispobj, slots, mainvp, pick, CLeap, newTHREE_DataTextureNamed, setBackgroundColor,bigcol,getVal, replaceAt,
HW, vrcanv, asyncFileReader, lineSplitter, THREESingleChannelFormat, vec3, clone, loadjs, Files, feed, buff2GenStruct, inputType,
blob2forEach, _binfiles, olength, blob2StringCB, searchReplace, interpretSearchString, readdirAsync, gilbert3d, xfetch, msgfixerrorlog, remotesave
;
//, msgbox, serious, slider1, slider2, uniforms, currentGenes, dat; // keep linter happy

var contactsReader, loadMatrix, ima;   // allow internal backward ref

if (!performance) performance = Date;  // odd for worker???

var CSynth = {};
CSynth.onUnique = Maestro.onUnique;
CSynth.trigger = Maestro.trigger;
CSynth.startGrabRotate = () => { V.alwaysRot = true; };
CSynth.stopGrabRotate = () => { V.alwaysRot = false; };
CSynth.defaultExpand = 1;

CSynth.files = {}; // loaded/loading files
var PICKNUM = 32;  // really const, var for easier sharing, 16 pick, 16 user markers
var PICKRES = 16;  // really const, reserved pick slots (first)
var PICKUSER = PICKNUM - PICKRES
var allpicks = new Float32Array(PICKNUM);       // array of all pick and marker slots
var userpicks = allpicks.subarray(PICKRES);     // just the user set markers

var usecache = FIRST(searchValues.usecache, false);
var writecache = FIRST(searchValues.writecache, false);

var inmutator = false;

// defined dummies for bits missing from stripped down csynth
//... a little bit awkward if trying to move to ts.
if (oxcsynth) { V.putinroom = aftercontrol = setDefaultExperiences
        = rot4toGenes = nop; // shortcut for missing experiences.js
    if (HW) HW.updateHTMLRules = nop;
    Director = { stop: nop, framesFromSlots: nop };
    ml = {};
}

var KILLRADLEN = 24;    // numbner of slots for killrads
/** initialize the system to set up renderers, scenes, etc. Executed only once on first drop.
 * Pretty irrelevant if inmutator (although we do now associate a maestro event with "pick")
 */
CSynth.init = function CSynth_init(quickout) {
    if (CSynth.initdone) return;  // so only one init
    CSynth.initdone = true;
    if (oxcsynth) msgfix.all = '';  // show serious (>) but not others

    fileTypeHandlers['.csyconfig'] = loadjs;  // allow .config files for .js (? too late here ?)
    fileTypeHandlers['.txt'] = contactsReader;  // allow .txt files for contacts

    W.fileDialog.multiple = true;
    W.fileDialog.accept = '.txt,.contacts,.xyz,.bed,.wig,.config,.js,.zip,.rawobserved,.rawObserved,.csv,.mat,.bintri';

    addgeneperm('nmPerUnit', 11, 0, 100, 1,1, 'number on nm per modelling unit', 'csynth', 'frozen');

    // establish uniforms early for sharing, real values will be set later
    adduniform('numSegs', 1);
    adduniform('numInstancesP2', 1);

    adduniform('killrads', new Array(KILLRADLEN).fill(-999), 'fv');

    // some fixes to make CSynth behave better
    V.controllersForShape = nop;        // this was expensive on Firefoxx for some reason
    vrcanv = ()=>vrcanvCentreOnLeft(1); // close up wanted for Organic, but fuller picture for CSynth
    onframe(() => COL.ignoreHornColours = true, 50);  // defer else matrix does not work, check why
    V.wallframe = nop;              // do not animate walls
    V.vraudioframe = nop;           // do not animate audio
    shadows(0);                     // NO shadows for now, only shadow from main light gets it wrong on matrix
    /** to consider/check for possible optimizations
     * organicRoomCamera
     * framescale
     * force dat.GUIVE update to after other work on frame? (requestAnimationFrame order)
     * pickGPU scissor test (probably needed?)
     */


    checkvr(); onframe(checkvr, 5);
    CSynth.setDefaults();  // load defaults now
    onframe(CSynth.setDefaults); // and again in case overrideen eg by loaded genes
    HW.resoverride.lennum = 5000;  // will almost certainly be overridden by wig loading resolution

    inmutator = window.horn;
    CSynth.ImageButtonPanel = true;

    // >>> TODO warning, tap event here may be Maestro event, and we should be using offx, not offsetx
    CSynth.onUnique('tap', e=>CSynth.select(e.clientX, e.clientY));

    CSynth.onUnique('viveGPInit_right', e=> {
    log("Initiliasing events for right hand (red)");
    const gp = e.gp, t = gp.threeObject;
    //TODO make slotOff & slotOffMat properties of gp & just pass gp to CSynth.select
    //although actually, for now we're hardcoding to use 8 & 12 that were supposed to be the slots for gpL
    //(yuck)
    //t.addEventListener('triggerdown', () => CSynth.select(gp.raymatrix, 0, e.slotOff, e.slotOffMat));
    t.addEventListener('triggerdown', () => CSynth.select(gp.raymatrix, 0));

    });

    CSynth.onUnique('viveGPInit_left', e=> {
    log("Initiliasing events for left hand (green)");
    const gp = e.gp, t = gp.threeObject;
    //other events are 'thumppad' 'groups' 'menu' up/down, also 'axischanged'
    //would need to review how to get thumnbpad x/y, looks like THREE.ViveController doesn't expose it.
    t.addEventListener('triggerdown', CSynth.startGrabRotate);
    t.addEventListener('triggerup', CSynth.stopGrabRotate);
    });

    feed.dofeed = false;

    if (inmutator) return;  // in mutator

    CSynth.initold(quickout);
}

/** process entire data (already read from file,  fid just for error message)
 * Expects three tab separated numbers per line and returns a flat Float32Array.
 * with some extra properties added for minid, maxid and maxv.
 * Also a function getNormalisedIndex(bp) which takes a base pair index and returns 0-1
 * for values in the range minid to maxid.
 * minid & maxid correspond to the min & max values found in first 2 cols (bp indices)
 * maxv corresponds to max value found in col 3.
 *
 * If !inmutator, each line will be made into a point in a point cloud
 * In current CSynth, they contain proximity value between a pair of indices
 * indices are raw bp number as read from file.
 *
 * optional contact can contain details in particular minid and maxid
 * handles extensions zip, csv, txt, mat, rawobserved
 * (? .mat was for finance only ?)
*/
contactsReader = async function contactsReaderF(dataStr, fid, contact = {}, isSubfile = false) {
    if (!dataStr && typeof fid === 'object') {
        const r = await CSynth.setRange(fid);
        return r;
    }
    fid = fid ?? dataStr.name ?? 'unknownfid.txt'
    const ext = getFileExtension(fid)

    if (!dataStr || dataStr instanceof Blob) {
        let blob;
        if (dataStr) {
            blob = dataStr
        } else {
            const fff  = await xfetch(fid);
            blob = fff.blob ? await fff.blob() : fff;   // <<<< TO VERIFY TODO
        }
        if (_binfiles.includes(ext) ) {
            //dataStr = new Uint8Array( await blob.arrayBuffer() );
            dataStr = await blob.arrayBuffer();
            // msgfix(urik, '<br>pending<br>' + genbar(0));
        } else {
            log(`file ${fid} length ${blob.size} to be read`)
            dataStr = await blob2forEach(blob, fid ); // canonpath);
        }
    }
    if (ext === '.bintri') {
        return bintriReader(dataStr, fid, contact);
    }
    if (fid.endsWith('_matrix.txt') || ext === '.mat' || ext === '.normmatrix')
        return bintriReader(dataStr, fid, contact, true);
    if (ext === '.zip') {
        dataStr = await CSynth.unzip(dataStr, fid);
        dataStr = blob2forEach(dataStr, fid);
    }
    if (dataStr instanceof Promise) {
        try {
            dataStr = await dataStr;  // 17/01/19, not sure why/when needed
            //this seems to happen when there's a 404, eg GET http://localhost:8800/CSynth/data/trivtest/b.RAWObserved 404 (Not Found)
            if (!dataStr) serious(`empty promise result for ${fid}`);
        } catch (e) {
            if (!dataStr) serious(e, `rejected promise for ${fid}`);
        }
    }
    let parsefun = CSynth.txtParser;
    const {usegen, lines, lines5} = inputType(dataStr);
    // const lines 5 = dataStr.lines 5 ? dataStr.lines 5 : Array.isArray(dataStr) ? dataStr : dataStr.substring(0, 1000).split('\n');
    if (fid.endsWith('.csv')) parsefun = CSynth.csvParser;
    const s = lines5[4];
    if (s && s.match(/.*:.*-.*\t.*:.*-.*\t/)) parsefun = CSynth.csvParser;
    if (fid.endsWith('allvalidPairs.txt')) parsefun = CSynth.contactsWithBP;

    contact.expand = FIRST(contact.expand, CSynth.defaultExpand);
    const stats = await parsefun(dataStr, fid, contact);
    return contactsReader2(fid, contact, isSubfile, stats, parsefun === CSynth.csvParser);
} // contactsReader
contactsReader.rawhandler = true;

function contactsReader2(fid, contact, isSubfile, stats, usedcsvparser) {
    contact.expand = FIRST(contact.expand, CSynth.defaultExpand);
    const {data, minv, maxv, rmaxv, sumv, sumv2, nonz, setz, diagset, minid, maxid} = stats;
    const datad = {};
    copyFrom(contact, {data, minv, maxv, rmaxv, fid, sumv, sumv2, nonz, setz, diagset,
        meannzv: nonz === 0 ? 0 : sumv/nonz, meanv: sumv/(setz+nonz), datad});

    // information fixed from parsing the data
    datad.minid = minid; // FIRST(contact.minid, minid);
    datad.maxid = maxid; // FIRST(contact.maxid, maxid);
    datad.res = contact.res;    // TODO tidy up what is in datad and contact
    contact.res = datad.res / contact.expand;
    datad.range = datad.maxid - datad.minid;
    if (usedcsvparser)
        datad.numInstances = datad.range + 1;       // still sorting out how bp and res and range handled 6 june 2021
    else
        datad.numInstances = datad.range / datad.res + 1;

    finalize(contact, contact.expand, fid, isSubfile);
    return contact;
}  // contactsReader2

/** dataStr may be
 * string,  to split
 * array of strings, ready split
 * info structure: gen is generator function, i is bytes processed so far, l is total bytes, lines5 is first 5 lines
 */
CSynth.txtParser = async function(dataStr, fid, contact) {
    let k = 0;
    const {usegen, lines, lines5} = inputType(dataStr);
    // const usegen = dataStr.gen;
    // const lines = dataStr.isBlobForEach ? dataStr :
    //     dataStr.gen ? dataStr.gen :
    //     (Array.isArray(dataStr) ? dataStr :
    //     dataStr.split('\n')).filter(v => v ? 1 : 0); //filter out empty lines
    // const lines 5 = dataStr.lines 5 ? dataStr.lines 5 : lines;

    // first experiment towards automatic file format detection
    const len1 = lines5[0].split(/[ \r\t,]/).length;
    let lineslength = dataStr.lines5 ? 1e6 : lines.length;
    if (len1 > 5 && lineslength > len1 - 1 && lineslength < len1 + 1) {
        return bintriReader(dataStr, fid, contact, true);
    }

    log("file " + fid + " lines=" + lineslength);
    if (!usegen) while (lines5[0].trim()[0] === '#') log('contact comment', fid, lines.shift());
    lineslength = lines.length ?? 1e6;
    log('lines split ' + lineslength);

    const stparse = performance.now();

    //"positions" often contains lines*[index, index, value]
    //although for some reason this function was also at some point used for rendering points
    //which are similar in terms of consisting of 3 numbers, but still I find it a bit confusing we call things
    //"positions" when they're really not.
    //changing to data

    const tres = FIRST(contact.res, CSynth.current.res, undefined)
    const enddiff = tres === undefined ? 0 : tres * (contact.expand-1)/2;  // difference in end particle for data and expanded
    let miniduse = FIRST(contact.minid, -1e20) + enddiff;
    let maxiduse = FIRST(contact.maxid, 1e20) - enddiff;
    // let data = new Array(lineslength * 3);  // was Float32Array, could not manage some large bp numbers
    let dataformat = Float32Array;
    let data = new dataformat(lineslength * 3);  // was Float32Array, could not manage some large bp numbers
    let maxid = miniduse, minid = maxiduse, minv = 1e50, maxv = 0, sumv = 0, sumv2 = 0, nonz = 0, setz = 0, badlines = 0, diagset = 0;
    let rmaxv = 0;  // non-diagonal max v
    let la = -1e20, lb = -1e20;
    let res = 1e20;
    let st = Date.now();
    const fidk = "parsing file: " + uriclean(fid);
    let i = 0;
    // for (const linei of lines) {
    await lines.forEach(async linei => {
        if (i % 10000 === 0) {
            let et = Date.now();
            if (et > st + 100) {
                st = et;
                const ii = usegen ? dataStr.i : i;
                const ll = usegen ? dataStr.len : lineslength;
                const bar = ''; //// '<br>' + genbar(ii/ll);
                const m = msgfix(fidk,'<br>' + ii + " of " + ll
                //  + "  " + Math.floor(i * 100 / lineslength) + "%");
                + bar);
                if (et > st + 10000) log(fidk + ii + " of " + ll, performance.memory)
                var zzzz = await sleep(0);
            }
        }
        const ff = linei.split("\t");
        if (!usegen) lines[i] = undefined;  // save space while loading
        i++;
        const na = +ff[0];
        const nb = +ff[1];
        const v = +ff[2];
        if (na < miniduse || nb < miniduse) return;
        if (na > maxiduse || nb > maxiduse) return;
        const maxf32int = 16777216;
        if (dataformat !== Float64Array && (na > maxf32int || nb > maxf32int)) {
            log('base pair number too big for float32, use Float64Array', fid, na, nb, 'line', i);
            dataformat = Float64Array;
            const ndata = new dataformat(data.length);
            ndata.set(data);
            data = ndata;
        }

        // has usually been 3
        // was 5 for NoY_All_interIntraContact_1M_nml.txt
        // part of sample data for https://github.com/BDM-Lab/LorDG
        if ((ff.length !== 3 && ff.length !== 5) || isNaN(na + nb + v)) {
            badlines++;
            return;
        }

        if (na !== la) res = Math.min(res, Math.abs(na - la));
        if (nb !== lb) res = Math.min(res, Math.abs(nb - lb));
        if (nb !== na) res = Math.min(res, Math.abs(nb - na));
        la = na; lb = nb;
        maxid = Math.max(maxid, ff[0], ff[1]);
        minid = Math.min(minid, ff[0], ff[1]);

        if (v === 0) {
            setz++;
        } else {
            if (k > data.length-3) {
                let mult = 2;
                if (lines.i / lines.len > 0.25)  // more than quater way through, estimate may be quite good
                    mult = lines.len / lines.i  * 1.1;
                log('extend data ', data.length, data.length * mult, mult, performance.memory);
                const ndata = new dataformat(data.length * mult);
                ndata.set(data);
                data = ndata;
            }
            data[k++] = na;
            data[k++] = nb;
            data[k++] = v;
            maxv = Math.max(v, maxv);
            minv = Math.min(v, minv);
            if (na !== nb) rmaxv = Math.max(v, rmaxv);
            sumv += v;
            sumv2 += v * v;
            nonz++;
            if (na === nb) diagset++;
        }
    });  // lines forEach

    const endparse = performance.now();
    if (minv > maxv) minv = maxv; // === 0, no non-zero entries at all

    if (nonz + setz === 0)
        serious(`File ${fid} parsed as triples (bpa/bpb/ifvalue) but no matching lines found`);
    if (badlines)
        msgfix('badlines', `File ${fid} parsed and ${badlines} bad lines found`);

    const tt = ((endparse-stparse)/1000).toLocaleString();
    log('lines parsed', fid, 'time', tt);
    msgfixlog(fidk,`<br>Complete in time ${tt}<br>`); /// + genbar(1));
    // setTimeout(()=>msgfixlog(fidk), 2000);
    if (k !== data.length) {
        log('extend data final reduce ', data.length, k, k/data.length, performance.memory);
        data = data.slice(0, k);
    }
    if (contact.res && contact.res !== res / contact.expand)
        msgfixerror('res' + fid, `speficied resolution ${contact.res} ignored, does not match found ${res}`);
    contact.res = res;

    return {data, minv, maxv, rmaxv, sumv, sumv2, nonz, setz, diagset, minid, maxid};
}

// CSynth.zipReader = async function(dataStr, fid, contact = {}, isSubfile = false) {
//     // const zdata = await readbinaryasync(fid);
//     const zip = new JSZip();
//     await zip.loadAsync(dataStr);
//     const ff = Object.keys(zip.files)[0];
//     const text = await zip.file(ff).async('string')
//     return contactsReader(text, fid + '#' + ff, contact = {}, isSubfile = false)
// }
if (fileTypeHandlers) fileTypeHandlers['.zip'] = contactsReader;

// bintrireader will usually be called with no data and get its own
// dropped files are one exception
// bintri is input data
// usually empty and it looks up its own
// can be a bintri file
// of can be structure of {headerLine, data}
async function bintriReader(bintri, fidd, details = {}, usetext = false) {
    details.fid = details.filename = fidd;
    const urikr = 'reading file: ' + uriclean(fidd);
    if (!bintri && usecache) {
        const cval = await CSynth.getIdbCacheOK(fidd);
        if (cval) {
            if (!cval.bintri || cval.bintri.byteLength === 0) {
                msgfixerror(urikr, '<br>bad value in cache ignored')
            } else {
                bintri = cval.bintri;
                msgfix(urikr, '<br>complete from cache<br>' + genbar(1));
            }
        }
    }
    if (!bintri) {
        bintri = await readbinaryasync(fidd);
        if (writecache) {
            await CSynth.setIdbCache( {key: fidd, bintri });
            log('bintri cached', fidd);
        }
    }

    // let headerLine, loadMatrixData;
    if (usetext) { // fidd.endsWith('.txt') || fidd.endsWith('.mat') || fidd.toLowerCase().endsWith('.normmatrix')){
        const loadMatrixData = await loadMatrix(fidd, bintri, true);  // convert on the fly
        copyFrom(details, loadMatrixData);
        // headerLine = loadMatrixData.headerLine;
    } else {
        // separate out the header
        var dec = new TextDecoder('ascii');
        var lenstr = dec.decode(bintri.slice(0, 10));  // enough to get length
        var hlen = lenstr.split('/')[0];            // header length
        var hstart = hlen.length+1;                 // length of length + '/'
        hlen = +hlen;                               // now we need it as number
        var dstart = hstart + hlen + 1;             // allow for length, header and \n
        const headerLine = dec.decode(bintri.slice(hstart, dstart-1));
        copyFrom(details, CSynth.parseHeaderLine(headerLine));

        var check = dec.decode(bintri.slice(dstart-1 , dstart));
        if (check !== '\n')
            serious('header and lengths out of sync in file', fidd);
    }
    const pnames = details.particleNames = details.header;

    // const pnames = details.particleNames = headerLine.trim().split(/[ \t,]/);
    const n = details.numInstances = pnames.length;

    const p0 = details.headerStruct[0];
    if (p0) {
        details.minid = p0.id;
        details.res = p0.res;
        let oldp = p0;
        const groups = {};
        let g = groups[p0.chr] = {startid: 0, startbp: p0.id, res: p0.res} ;
        let p;
        for (let i = 1; i < n; i++) {
            p = details.headerStruct[i];
            console.assert(p.res === p0.res, 'non-fixed reolution', p0, p);
            if (p.chr !== oldp.chr) {
                g.endid = i - 1;
                g.endbp = oldp.id;
                console.log((g.endbp - g.startbp) === (g.endid - g.startid) * g.res, 'check group parse', p.chr);
                g = groups[p.chr] = {startid: i, startbp: p.id, res: p0.res};
            }
            oldp = p;
        }
        g.endid = n - 1;
        g.endbp = p.id;
        if (olength(groups) > 1) {
            CSynth.applySchemesToGroups(groups);
            CSynth.breakGroups(groups);
            details.groups = groups;
        }
    } else {  // can't parse header usefully, just guess
        if (details.minid === undefined) details.minid = 0;
        if (details.res === undefined) details.res = 1;
    }
    details.maxid = details.minid + details.res * (details.numInstances -1);   // <<< to fix
    details.range = details.maxid - details.minid;

    let tt;
    if (details.data) {
        tt = details.data;
    } else {
        var left = bintri.byteLength - dstart;
        if (left/4 !== n*(n+1)/2)
            serious('wrong total length in file', fidd);
        let ttb = bintri.slice(dstart);                      // allow for bintri being ArrayBuffer or ? Unit8Array
        if (!(ttb instanceof ArrayBuffer)) ttb = ttb.buffer;
        tt = new Float32Array(ttb);          // triangle data
    }
    const td /** = details.textureData **/ = new Float32Array(n * n);   // square matrix data
    function tri2sq() {
        let ip = 0;
        consoleTime('bintri triToSquare ' + fidd);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                td[i + j*n] = td[j + i*n] = tt[ip++];
            }
        }
        const ttt1 = consoleTimeEnd('bintri triToSquare ' + fidd, n);  // , msgfixlog
    }
    tri2sq();
    details.rawData = td;

    const datad = { minid: details.minid, maxid: details.maxid,
        res: details.res, numInstances: details.numInstances};

    function stats() {
        let sumv = 0, sumv2 = 0, nonz = 0, setz = 0, minv = 9999999999999, maxv = 0;
        consoleTime('bintri tri stats ' + fidd);
        for (let i = 0; i < tt.length; i++) {
            const v = Math.max(tt[i], 0);   // may have -999 values, treat as 0 for stats
        // td.forEach( v => {
            sumv += v;
            sumv2 += v*v;
            if (v === 0) {
                setz++
            } else {
                nonz++;
                minv = Math.min(minv, v);
                maxv = Math.max(maxv, v);
                //if (v < minv) minv = v;  // improves Firefox from 16 to 14
                //if (v > maxv) maxv = v;

            }
        } //);
        const ttt2 = consoleTimeEnd('bintri tri stats ' + fidd, n); // , msgfixlog
        // otherwise no results shown in Edge ??? alert(`times to sq ${ttt1/1000}, stats ${ttt2/1000}`)
        const rmaxv = maxv;  // to correct, is it used anyway?  non-diagonal maxv
        // const o = { data, minv, maxv, rmaxv, fid, sumv, sumv2, nonz, setz, diagset, meannzv: sumv/nonz, datad };
        const o = { minv, maxv, rmaxv, fid: details.filename || details.fid, sumv, sumv2, nonz, setz,
            meannzv: nonz === 0 ? 0 : sumv/nonz, meanv: sumv/(setz+nonz), datad};
        return o;
    }
    const o = stats();
    copyFrom(details, o);
    const urik = 'parsing file: ' + uriclean(fidd);
    msgfix(urik, '<br>complete<br>' + genbar(1));
    CSynth.files[fidd] = details;
    details.expand = FIRST(details.expand, CSynth.defaultExpand);
    finalize(details, details.expand, fidd);
    return details;
}  // bintrireader

/** parse a header line and place information into the structure,
 * header ... array of headers (particle names)
 * headerStruct ... array of parsed headers
 * reorder ... array to map from index in input data to index in output data
 *
 */
CSynth.parseHeaderLine = function(headerLine, doreorder = false) {

    let header = headerLine.split(/[ \r\t,]/);
    const reorder = [];
    let headerStruct = [];
    if (!header.some(x => isNaN(x))) {
        headerLine = '';
        const res = header.reduce((c,x,i,a) => Math.min(c, i === 0 ? Infinity : (Math.abs(x - a[i-1]) || Infinity)), Infinity); 
        header = header.filter(x=>x).map((x,ii) => 'h' + x);
        for (let hi=0; hi < header.length; hi++) {
            reorder[hi] = hi;
            headerStruct[hi] = {chr: '?', id: hi, res, h: hi, l: hi, str: 'h' + hi, oi: hi };
        }
    } else {
        // parse and reorder header
        headerStruct = [];
        const rex = /(.*):(.*)-(.*)/;
        for (let oi=0; oi < header.length; oi++) {  // oi is original index
            const str = header[oi];
            const rdata = rex.exec(str);
            if (!rdata) continue;
            let chr = rdata[1], l = +rdata[2], h = +rdata[3];
            if ((h-l)%10 === 9) h++;
            headerStruct.push({chr, id: (l+h)/2, res: h-l, h, l, str, oi});
        }
        if (doreorder) {
            headerStruct.sort((a,b) =>
                a.chr < b.chr ? - 1 :
                a.chr > b.chr ? 1 :
                a.l < b.l ? -1 : 1);
        }
        for (let hi=0; hi < header.length; hi++) {  // hi is reordered index
            const hs = headerStruct[hi];
            header[hi] = hs.str;  // reconstitute header itself as used elsewhere
            reorder[hs.oi] = hi;  // reorder maps input order to required order
            const hsp = headerStruct[hi-1];
            if (hsp && hs.chr === hsp.chr && hs.l !== hsp.h)
                console.log(`unexpected header break chr:${hs.chr}, ${hsp.h}..${hs.l} w:${hs.l - hsp.h}`);
        }
        headerLine = header.join('\t');         // reconstitute headerLine itself as used elsewhere
    }
    return {header, headerStruct, reorder, headerLine};
}

// finalize the details for contacts, allow for extend
function finalize(o, expand, fid, isSubfile = false) {
    // deduce a full range that assumes data particles centred in region
    const datad = o.datad;
    o.minrange = datad.minid - datad.res / 2;
    o.maxrange = datad.maxid + datad.res / 2;

    // allow for extra particles from expand
    o.expand = expand;
    o.res = datad.res / expand;
    o.numInstances = numInstances = datad.numInstances * o.expand;
    if (o.numInstances%1 !== 0) {
        serious('unexpected data/sizes in ', fid, 'computed', {res:o.res, numInstances:o.numInstances + '?'});
        return undefined;
    }

    o.minid = o.minrange + o.res/2;     // centres of the min/max particle ranges
    o.maxid = o.maxrange - o.res/2;
    o.range = o.maxid - o.minid;
    if (!isSubfile)
        CSynth.checkRangePair(CSynth.current, o);  // needed for regular case, damaging for concatenated files case
    o.key = [o.fid, o.minid, o.maxid, o.expand].join('!');
    // CSynth.setIdbCache(o);  // cache before format function added

    if (inworker) return o;

    genedefs.R_ribs.free = 0;
    setval('R_ribs', o.numInstances - 1);
    genedefs.ribdepth.max = 5;

    CSynth.files[fid] = o;
    // function to format data better for debug,
    /*** * leave out for now, upsets db cache
    o.format = function() {
        const fdata = this.data;
        const structdata = []
        for (let i=0; i < fdata.length;)
            structdata.push( {i: fdata[i++], j: fdata[i++], prob: fdata[i++]})
        this.structdata = structdata;
        this.stats = getstats(fdata.filter( (a,i) => i%3===2 ));
    }
    ***/

    //if (inmutator)
        return o;

    // now start on standalong graphics aspects (deprecated)
    // obsolete CSynth.oldPostHandler(data, fid, minid, maxid, nonz, maxv, sumv, sumv2, lines, badlines);
}  // finalize


CSynth.contactStats = function (contactnum) {
    const contact = (typeof contactnum === 'number') ? CSynth.current.contacts[contactnum] : contactnum;
    if (!contact) {msgfixerror('contactStats called with no contacts for number', contactnum); return; }
    const dd = contact.data;
    const ii = bp => Math.round(CSynth.getNormalisedIndex(bp) * contact.numInstances);

    const n = contact.numInstances;
    const nn = new Array(n).fill(0);  // number by particle
    const s = new Array(n).fill(0);  // sum by particle
    const s2 = new Array(n).fill(0); // sum2 by particle

    const nnbbd = new Array(n).fill(0);  // number by backbone distance
    const sbbd = new Array(n).fill(0);  // sum by backbone distance
    const s2bbd = new Array(n).fill(0); // sum2 by by backbone distance
    for (let i=0; i < dd.length; ) {
        const a = ii(dd[i++]);
        const b = ii(dd[i++]);
        if (a < 0 || a >= n || b < 0 || b >= n) continue;
        const v = dd[i++];

        nn[a] ++;
        s[a] += v;
        s2[a] += v * v;
        if (a !== b) {
            nn[b] ++;
            s[b] += v;
            s2[b] += v * v;
        }

        const bbd = Math.abs(a - b);
        nnbbd[bbd]++;
        sbbd[bbd] += v;
        s2bbd[bbd] += v * v;
    }

    const nocontacts = []; for (let a = 0; a < n; a++) if (s[a] === 0) nocontacts.push(a);  // particles with no contacts
    const querycontacts = []; for (let a = 1; a < n; a++) if (s[a] < s[a-1]/2) querycontacts.push(a); // particles with suspicious contacts

    contact.stats = {nn, s, s2, nnbbd, sbbd, s2bbd, nocontacts, querycontacts};
    return contact.stats;
}

/** set the bounds for
CSynth.setArraySpring = function() {
    const cc = CSynth.current;
    const dd=cc.contacts[0].data.filter((v,k) => k%3 === 2).map(v=>Math.log(v))
}
/** read csv file, in York virus contacts format, e.g.
 chr2:1294000-1296000	chr3:30000-32000	0.000516145758628211
This was making several assumptions about the order of the input data
but these should be (largely?) resolved with the multipass approach, 5 June 2021
*/
CSynth.csvParser = async function csvParser(file, fid, contact = {}) {
    contact.fid = contact.filename = fid;
    // let lines, lines5;
    const {usegen, lines, lines5} = inputType(file);

    // if (typeof file === 'string') {
    //     lines = lines 5 = file.split('\n');
    // } else if (Array.isArray(file)) {
    //     lines = lines 5 = file;
    // } else if (file.gen) {
    //     lines = file.gen;
    //     lines 5 = file.lines5;
    // } else {
    //     fid = file.name;
    //     const urikread = 'reading csv file: ' + uriclean(fid);
    //     lines = lines 5 = [];
    //     let lastff = 0;
    //     await asyncFileReader(file, lineSplitter((line, numLines, bytesProcessedSoFar, bytesReadSoFar, length) => {
    //         const ff = bytesReadSoFar/file.size;
    //         if (ff > lastff + 0.001) {
    //             const m = `progress ${bytesReadSoFar} of ${file.size}`;
    //             msgfix(urikread, '<br>' + m + '<br>' + genbar(bytesReadSoFar/file.size));
    //             lastff = ff;
    //         }
    //         lines.push(line);
    //     }));
    //     msgfix(urikread, '<br>' + 'complete'+ '<br>' + genbar(1));
    // }
    let groups = contact.groups = {};

    let ssa = '_', ssb = '_', res = 1;  // York style
    if (lines5[5].contains(':')) {ssa = ':'; ssb = '-'; res = -1;}   // Crick style

    //?? let keys = {}; prep for new Crick files 20 Feb 2019
    let errs = 0;

    function check(p) {
        const a = p.split(ssa);
        const cn = a[0];
        const as = a[1].split(ssb);
        const ind = +(as[0]);
        const ad = as[1] - ind; // not used for York style
        if (res === -1)
            res = ad;
        //else
        //    if (res !== ad) console.error('unexpected d', res, ad, 'line', i, lines[i]);
        let cha = groups[cn];
        if (!cha) {
            cha = groups[cn] = {name: cn, startbp: ind, endbp: ind}
        } else {
            cha.startbp = Math.min(ind, cha.startbp);
            cha.endbp = Math.max(ind, cha.endbp);
        }
        return [cn, ind];
    }

    const p2keyparse = 'parsing file: ' + uriclean(fid)
    //msgfix(p2keyparse, genbar(0));

    // pass 1, parse and find chain info
    let ii = 0, ri = 0; // count lines with correct data
    await lines.forEach(line => {
    // for (const line of lines) {
        ri++;
        if (!line) return;  // allow for empty lines
        if (!line.contains(ssa)) return;
        const s = line.split('\t');
        //?? keys[s[0]] = true; keys[s[1]] = true; // continue;
        const a = check(s[0]);
        const b = check(s[1]);
        const v = +s[2];
        lines[ii++] = [a, b, v]; // reuse lines to save total memory

        if (ii%10000 === 0) {
            const [iii, lll] = file.gen ? [file.i, file.len] : [ri, lines.length]
            if (ii%100000 === 0) log('csvParser pass1', iii, 'of', iii);
            //msgfix(p2keyparse, genbar(iii/lll));
            // await sleep(1);
        }
    });
    //msgfix(p2keyparse, genbar(1));


    // sync up all groups if irrelevant
    let promises;
    if (openfiles.groups) {
        openfiles.groups.push(groups);
        promises = Object.values(openfiles.promises);
        if (openfiles.groups[0] === groups) {   // I'll be the mediator
            promises = promises.filter(p => p !== openfiles.promises[fid]);   // wait for everyone else
            await Promise.all(promises);
            console.log('~~~~~~~~~~~~~~~~~~~~~');
            for (let i=0; i<openfiles.groups.length; i++)
                console.oldLog(Object.keys(openfiles.promises)[i], '\n', JSON.stringify(openfiles.groups[i]).replaceall('"',''))

            for (const gid in groups) {
                const gg = groups[gid];
                for (const cgroup of openfiles.groups) {
                    const cgg = cgroup[gid];
                    // ? no need to SET cgroup, about to be dereferenced
                    gg.startbp = cgroup[gid].startbp = Math.min(gg.startbp, cgg.startbp);
                    gg.endbp = cgroup[gid].endbp = Math.max(gg.endbp, cgg.endbp);
                    // cgroup[gid].startbp = cgroup[gid].endbp = 'DO NOT USE'
                }
                console.log('>>>', gg.startbp, gg.endbp)
            }
            CSynth.current.groups = groups; // my group now becomes global
        }
    }

    // pass2, fill out chain info
    let pn = 0;  // particle number
    for (const gid in groups) {
        const ch = groups[gid];
        ch.startid = pn;
        ch.num = (ch.endbp - ch.startbp) / res + 1;
        ch.endid = ch.startid + ch.num - 1;
        ch.offset = ch.startid - ch.startbp/res;
        ch.res = res;
        log ('chain', ch);
        pn += ch.num;
    }
    log('total number of particles', pn);
    CSynth.current.numInstances = pn;

    // everyone waits till the mediation done
    if (promises) {
        openfiles.resolvers[fid]();
        await Promise.all(promises);
        groups = contact.groups = CSynth.current.groups;    // all share common groups
    }

    const p2keyfinish = 'finalizing ids for csv file: ' + uriclean(fid)
    msgfix(p2keyfinish, genbar(0));

    // pass3, fill in particle data
    let data = new Float32Array(ii * 3);
    let k = 0; // pos in data
    let maxv = 0, rmaxv = 0, sumv = 0, sumv2 = 0, nonz = 0, setz = 0, diagset = 0;
    let minv = 1e40;

    for (let i = 0; i < ii; i++) {
        const [a, b, v] = lines[i]
        const ap =  a[1] / res + groups[a[0]].offset;  // particle # for a
        const bp =  b[1] / res + groups[b[0]].offset;  // particle # for a

        // maxp = Math.max(maxp, ap, bp);
        maxv = Math.max(maxv, v);
        minv = Math.max(minv, v);
        if (ap !== bp) rmaxv = Math.max(rmaxv, v);
        if (ap === bp & v) diagset++;
        sumv += v;
        sumv2 += v*v;
        if (v) nonz++; else setz++;
        data[k++] = ap * res;       // getContactsZZ expects these to have res. could be easier if both worked in particles ??
        data[k++] = bp * res;
        data[k++] = v;
        if (i%100000 === 0) {
            log('csvParser pass3', i, 'of', ii);
            msgfix(p2keyfinish, genbar(i/ii));
            await sleep(1);
        }
        msgfix(p2keyfinish, 'complete', genbar(1));

        //if (a[0] !== b[0] || +a[1] !== +b[1]-1)  // check for backbone
        //    log(i, line);
    }  // pass3

    if (errs) console.error('unexpected second item errors', errs, 'in', fid);
    data = data.slice(0, k);
    const maxp = CSynth.current.numInstances-1;
    const minid = 0, maxid = maxp;
    copyFrom(contact, {data, minid, maxid, range: maxp, maxv, fid, backbonetype: 'none',
        numInstances: maxp+1, groups, res});
    CSynth.checkRangePair(CSynth.current, contact);
    numInstances = CSynth.current.numInstances;
    CSynth.current.groups = groups;

    CSynth.applySchemesToGroups(groups);
    CSynth.breakGroups(groups);


    CSynth.files[fid] = contact;

    const stats = {data, minv, maxv, rmaxv, sumv, sumv2, nonz, setz, diagset, minid, maxid};
    contactsReader2(fid, contact, false, stats, true);
    delete openfiles.pending[fid];  // ? openfile should await then do this ?
    return contact;

    // return {data, minv, maxv, rmaxv, sumv, sumv2, nonz, setz, diagset, minid, maxid};
} // csvParser

// if (!fileTypeHandlers) fileTypeHandlers = {};  // eg for workers?
// fileTypeHandlers['.csv'] = CSynth.csvParser;  // allow .csv files for contacts, do with othes
// CSynth.csvParser.rawhandler = true; //



/** check and fill in range values for o */
CSynth.checkRange = function(o) {
    const c = CSynth.checkone;
    // c(o, 'numInstances', numInstances);  // no, only consider global numInstances later
    c(o, 'maxid', o.minid + o.res * (o.numInstances - 1));
    c(o, 'range', o.maxid - o.minid);
    c(o, 'res', o.range / (o.numInstances - 1));
    c(o, 'numInstances', o.range / o.res + 1);
}

/** check one value for consistency, and fill in if necessary */
CSynth.checkone = function(o, n, b) {
    let a = o[n];
    if (isNaN(a)) a = undefined;
    if (isNaN(b)) b = undefined;
    if (a === undefined) a = b;
    if (b === undefined) b = a;
    if (a !== b)
        console.error('data mismatch', n, a, b, o);
    o[n] = a;
    return a;
}

/** check the various range values in a and b for consistency */
CSynth.checkRangePair = function(a, b) {
    let toshow = true;
    let cc = CSynth.current;
    function show() {
        if (toshow) {
            console.error(msgfix('bad range check', a===cc ? 'global' : a.filename, b === cc ? 'global' : b.filename, '~~~~~~~~~~~~~~~~~~~~~~~~~~~'));
            toshow = false;
        }
    }
    function checkItem(n) {
        if (a[n] === undefined) a[n] = b[n];
        if (b[n] === undefined) b[n] = a[n];
        if (CSynth.current.check && (a[n] !== b[n] && JSON.stringify([a[n]]) !== JSON.stringify([b[n]]))) {
            show();
            // todo, key on a and b for more info?
            console.error(msgfix(n, a[n], b[n]));
        }
    }
    'startbp endbp minid maxid range res numInstances'.split(' ').forEach(n => checkItem(n));

    const ag = a.groups, bg = b.groups;
    if (!ag) a.groups = clone(bg)
    else if (!bg) b.groups = clone(ag)
    else for (const gn in ag) {
        const agg = ag[gn], bgg = bg[gn];
        for (const k in agg) {
            if (agg[k] !== bgg[k]) {
                show();
                console.error('group', gn, k, agg[k], bgg[k])
            }
        }
    }
}

//previously getNormalisedPartpos. Using "Normalised" to describe 0-1 range
CSynth.getPartposFromBP = (bp) => Math.round(CSynth.getNormalisedIndex(bp) * numInstances);
CSynth.getTexCoFromNormalised = i => i * (numInstances-1) / numInstancesP2;
CSynth.maxAnnotations = 9999999;
/** Takes a file with tab separated values where the first line is used as a key for column headers.
 * This is oriented towards data like 'BioMartExport.bed' (with header) or genes.bed (without).
 * Heavy on side-effects: replaces CSynth.annotationGroup with the result....
 */
CSynth.parseBioMart = function (filename, data) {
    if (!filename || filename.endsWith('undefined') || !CSynth.parseBioMart.toggler.visible) {
        // CSynth.parseBioMart.setVisibility(false);
        V.rawscene.remove(CSynth.annotationGroup);
        return;
    }
    if (filename.indexOf('.') === -1) filename += '.bed';
    let key = filename;  //  may become  more detais, allow key to be getBed or full filename
    let pd;
    const b = CSynth.getBed(key);
    if (b && b.biomParsed)
        pd = b.biomParsed;
    else
        if (CSynth.useBedCache) pd = CSynth.parseBioMart.cache[key];
    if (pd) {
        V.rawscene.remove(CSynth.annotationGroup);
        CSynth.annotationGroup = pd.annotationGroup;
        if (pd.annotationGroup)
            V.rawscene.add(CSynth.annotationGroup);
        return;
    }

    const dataStr = data || b.bedtext || (filename === '$synth$' ? CSynth.synthbed() : posturierror(filename));
    if (!dataStr) { msgfixerror(filename, 'cannot read data'); return; }
    const lines = dataStr.split("\n").filter(v => v ? 1 : 0); //filter out empty lines
    log("file " + filename + " lines=" + lines.length);
    log('lines split ' + lines.length);

    //extract column headers to use as keys for dictionary / object.
    //shift will remove first line in the process, leaving only the data to iterate through
    //sjpt 20/01/22  surely we should hacve shifted lines. not colNames???
    // and now removing any bad lines (including header) in loop
    var colNames = lines[0].split("\t");
    if (false && isNaN(+colNames[2])) { // <<<< false to treat header as always fixed
        colNames.shift();
    } else {
        colNames = ['Chr', "Gene Start (bp)", "Gene End (bp)", "Associated Gene Name", '?1', '?2', '?3'].slice(0, colNames.length);
        colNames[8] = 'Color';
    }

    //maybe use an actual dictionary or something... more important, will want quick ways to address by bp.
    // const parsedData = {};
    // colNames.forEach(n=>parsedData[n] = []);
    // lines.forEach(line => {
    //     const els = line.split('\t');
    //     els.forEach((v, i)=>{
    //         const col = colNames[i];
    //         parsedData[col].push(v);
    //     });
    // });

    const parsedArr = [];
    let badLines = 0;
    let ignore = 0;
    lines.forEach(line => {
        const rows = line.split('\t');
        //if (rows.length !== colNames.length) badLines++;
        const obj = {};
        rows.forEach((v, i) => {
            const colName = colNames[i] || i;
            obj[colName] = v; //TODO: try to parseInt
        });
        obj.minBP = obj["Gene Start (bp)"];
        obj.maxBP = obj["Gene End (bp)"];
        obj.chr = obj.Chr;
        let min = obj.minI = CSynth.getNormalisedIndex(obj.minBP, obj.chr);
        let max = obj.maxI = CSynth.getNormalisedIndex(obj.maxBP, obj.chr);
        if (min > 1 || max < 0 || isNaN(min+max)) { // ignore header if there and other bad lines
            ignore++;
        } else {
            if (min < 0) min = 0;
            if (max > 1) max = 1;
            obj.midI = min + (max - min) / 2;
            obj.midI = Math.max(0, Math.min(1, obj.midI));
            parsedArr.push(obj);
        }
    });

    const parsedData = { filename };
    // we might change the way the data is stored, but hopefully will have consistent interface for access.
    parsedData.data = parsedArr;

    //attaching methods to CSynth for now.... should think more about this design.
    //(ie, there should be CSynth. BEDs and this should be a method on that,
    //current parseBioMart may be a constructor with "this" equivalent to parsedData)
    // do NOT atttach to parsedData, as this gives cloning/saving issues, sjpt, 9 Oct 18
    // not used 17 Feb 2019
    // CSynth.getAnnotationsForBP = (bp) => {
    //     return parsedData.find(v => v.minBP <= bp && v.maxBP >= bp);
    // };
    // CSynth.getAnnotationsForIndex = i => {
    //     const bp = CSynth.getBPFromNormalisedIndex(i);
    //     return CSynth.getAnnotationsForBP(bp);
    // }

    parsedData.make3dAnnotations = () => {
        if (parsedArr.length === 0) {
            msgfixlog('>annotations', 'no valid annotations for', parsedData.filename);
            return;
        }
        // prepare annotations, but a maximum of CSynth.maxAnnotations spaced out if needed
        const n = Math.min(CSynth.maxAnnotations, parsedArr.length);
        const step = parsedArr.length / n;
        for (let i = 0; i < parsedArr.length - 0.8; i += step ) {
            CSynth.createBEDAnnotation(parsedArr[Math.round(i)]);
        }
        //parsedArr.forEach(annot => {
        //    CSynth.createBEDAnnotation(annot);
        //});
        parsedData.annotationGroup = CSynth.annotationGroup;
        CSynth.consolidateTextBuffers();
        parsedData.annotationGroup.visible = !CSynthFast;
        msgfixlog('annotations', 'annotations loaded for', parsedData.filename);
    }

    // no, do not make it active just because we have read it
    // CSynth.BioMartData = parsedData;  // for now, later allow more than one active at once
    //XXX: PJT: this was causing new annotations not to be made after reset...
    let vis = true;                // whether we need to make the new annotations yet
    if (CSynth.annotationGroup) {
        vis = CSynth.annotationGroup.visible;    // we do need the new ones to replace the old ones
        V.rawscene.remove(CSynth.annotationGroup);
        CSynth.annotationGroup = null;
    }
    // CSynth.current Data.annotF = filename; // ??? this did not appear to get used anywhere
    if (vis)
        parsedData.make3dAnnotations();     // yes, we must make the annotations at once

    if (CSynth.useBedCache) CSynth.parseBioMart.cache[key] = parsedData;
    return parsedData;
};  // end ParseBioMart
CSynth.parseBioMart.cache = {};
CSynth.useBedCache = true;

CSynth.parseBioMart.toggler = {
    visible: false
};
CSynth.parseBioMart.setVisibility = (v=!CSynthFast) => {
    // if (!CSynth.BioMartData) v = false; // false, leave flag if we want it set
    if (!CSynth.annotationGroup && CSynth.BioMartData) CSynth.BioMartData.make3dAnnotations();
    if (CSynth.annotationGroup) CSynth.annotationGroup.visible = v;
    CSynth.parseBioMart.toggler.visible = v;
    const _activebed = CSynth.files._activebed;
    if (_activebed) {
        let name = _activebed.name;
        if (!name.endsWith('.pdb')) name += '.bed'; // unless synthetic from pdb
        CSynth.parseBioMart(name);
    }
};
CSynth.parseBioMart.setDefaultVisibility = () => CSynth.parseBioMart.setVisibility();

CSynth.refreshTextSource = function () {
    const gui = CSynth.annotgui;
    if (!gui) return;
    const sources = CSynth.current.beds.map(b=>b.shortname);
    if (sources.length) {
        const old = CSynth.parseBioMart.sourceGUI;
        let index;
        if (old) {
            gui.remove(old);
            index = old.guiIndex;
        }
        const s = CSynth.parseBioMart.sourceGUI = gui.add({x:sources[0]}, 'x', sources);
        s.guiIndex = index;
        s.name("Text source:").onChange(bed => {
            const fileName = CSynth.current.beds.find(b => b.shortname === bed).filename; //there is getBed or something for this
            CSynth.parseBioMart(fileName);
        }).listen(); //even though the object is anonymous, we can now do userData.setValue(), which will result in change...
    }
}

CSynth.parseBioMart.createGUIVR = () => {
    const gui = CSynth.annotgui = dat.GUIVR.createX("Annotations");
    // the listen below does not seem to work right
    CSynth.parseBioMart.togglerB = gui.add(CSynth.parseBioMart.toggler, 'visible').listen().onChange(CSynth.parseBioMart.setVisibility);
    CSynth.parseBioMart.togglerB.showInFolderHeader();
    // onframe(CSynth.parseBioMart.setDefaultVisibility, 5);  // check ordering and decide how to make synchronous
    //gui.add(CSynth.annotationGroup, 'color').listen(); // remains assigned to old object when text source is switched...

    CSynth.refreshTextSource();

    //addgeneperm("textScale", 0.1, 0, 0.2, 0.01, 0.001, "text scale", "text", "frozen");
    CSynth.addAnnotationGenes();
    // gene not ready yet
    guiFromGene(gui, 'textScale');
    guiFromGene(gui, 'textForward');
    guiFromGene(gui, 'selWidth');
    guiFromGene(gui, 'minTextScale');

    function inits() {if (CSynth.annotationGroup.initSprings) CSynth.annotationGroup.initSprings(1,1,1,gui);}
    function debugs() {if (CSynth.annotationGroup.createDebugGUI) CSynth.annotationGroup.createDebugGUI();}

    const bb = [2,
        { func: inits, tip: "Use spring forces to position annotations.", text: 'use springs' },
        { func: debugs, tip: "Generate (large) gui for annotation spring settings.", text: 'debug gui' }
    ];
    gui.addImageButtonPanel.apply(gui, bb).setRowHeight(0.100);

    return gui;
};

CSynth.rainbowArray = [
    255, 0 , 0, 1,
    255, 255, 0, 2,
    0, 255, 0, 3,
    0, 255, 255, 4,
    0, 0, 255, 5,
    255, 0, 255, 6,
    255, 0, 0, 7
];

CSynth.fixedBeds = {};  // beds defined by arrayToBed; usually fixed and rainbow
CSynth.arrayToBed = function(array, name) {
    const bedarr = new Uint8Array(array);
    const r = {
        filename: name,
        shortname: name,
        name,
        bedarr,
        isBed: true,
        /* [data, width, height,
            format, type, mapping,
            wrapS, wrapT, magFilter, minFilter,
            anisotropy, encoding] */
        texture: newTHREE_DataTextureNamed(name + 'BED', bedarr, array.length/ 4, 1,
            THREE.RGBAFormat, THREE.UnsignedByteType, undefined,
            undefined, undefined, THREE.LinearFilter, THREE.LinearFilter)
    }
    r.texture.needsUpdate = true;
    CSynth.fixedBeds[name] = r;

}

CSynth.markers2Bed = function markers2Bed(name = 'frommarkers', save) {
    const m = Object.values(CSynth.markers);    // compact
    //const v = Object.values(m).map(x => x.bp);     // find bps for markers
    //v.push(CSynth.current.minid); v.push(CSynth.current.maxid); // add bps for start and end
    //v.sort((x,y) => x-y);                                       // sort
    // msgfixlog('bedmarkers', `'bed being made with ${v.length} markers`);

    const lines = [];       // generate the bed lines

    for(let i = 0; i < m.length-1; i++) {     // get the matrix pairs
        if (m[i].type === 'matrix1' && m[i+1].type === 'matrix2')
            lines.push(['mat' + i, m[i].bp, m[i+1].bp, 'mat' + i].join('\t'));
    }

    m.push({bp: CSynth.current.minid}); m.push({bp: CSynth.current.maxid}); // add bps for start and end
    m.sort((x,y) => x.bp - y.bp);           // sort in base pair order
    for(let i = 1; i < m.length-1; i++) {   // get the non matrix pairs
        if (!m[i].type.startsWith('matrix')) {
            lines.push(['ribl' + i, m[i-1].bp, m[i].bp, 'ribl' + i].join('\t'));
            lines.push(['ribr' + i, m[i].bp, m[i+1].bp, 'ribr' + i].join('\t'));
        }
    }

    const ll = lines.join('\n');    // make complete bed text
    bedReader(ll, name);            // and use it
    if (save)
        remotesave((CSynth.current.contacts[0]?.filename ?? name) + '.bed', ll);
}


if (THREE) {    // not if in worker
    CSynth.arrayToBed([255,255,255,0], 'constant');
    CSynth.arrayToBed(CSynth.rainbowArray, 'rainbow');
}

/** get a bed structure from a source name, number, or readymade structure) */
CSynth.getBed = function(srcName) {
    if (srcName.isBed) return srcName;  // already a bed
    const beds = CSynth.current.beds;
    if (srcName.bedarr) return srcName;  // was already a bed
    if (typeof srcName === 'number') return beds[srcName];

    const fn = srcName.split('/').pop();
    if (CSynth.fixedBeds[fn]) return CSynth.fixedBeds[fn];
    let bb = CSynth.current.beds.findLast(x => x.filename === fn);
    if (bb) return bb;
    bb = CSynth.current.beds.find(x => x.shortname === fn);
    if (bb) return bb;
    bb = CSynth.current.beds.find(x => x.filename + '.bed' === fn);
    if (bb) return bb;
    msgfixlog(srcName, 'Cannot match bed');
    return srcName;
}

/** set up dynamics for tad bed marking, each new dropped contact file will get this setting */
CSynth.bedmarkerSetup = async function() {
    CSynth.globalCustomLoadDone = CSynth.bedmarkerSetup;
    G.pushapartpow = 0;
    if (CSynth.cols) CSynth.cols.colA = CSynth.cols.colB = 'current dynamics model'
    G.matDistFar = 20;
    GX.setValue(/ribbon.*diameter/, 15);
    G.springrate = 10
    G.stepsPerStep = 25
    springs.step(1000);
    for (let i=10; i>2; i-=2) {
        G.springrate = i
        await sleep(500);
        CSynth.showEigen(true);
        CSynth.autoscale();
    }

    G.springrate = 2
    // nb prefer direct set of genes rather tahn via gui
    G.matrixbedtint = 1;        // full colour of bed on matrix
    G.matrixbededge = 0.002;    // but only narrow lines at bed boundaries
    G.matrixBedSelTint = 0;     // and no tinting for selected beds

}
CSynth.globalCustomLoadDone = nop;


/** add a colour dropdown gui.
 *  'targetUniformsOrCallback' may be an object containing uniforms, or a callback.
 * will attempt to set t_ribbonbed values in uniforms (error if not present) */
CSynth.addColourGUI = (pgui, targetUniformsOrCallback) => {
    if (!CSynth.current || !CSynth.current.beds) return;
    const sources = CSynth.current.beds.map(b=>b.shortname).concat(Object.keys(CSynth.fixedBeds));//, 'selection']);

    let _source;

    const xx = {
        get source() { return _source; },
        set source(v) { onChange(v); }
    }
    function onChange(srcName) {
        if (sources.indexOf(srcName) === -1) return console.error('attempt to set colour wrong source', srcName);
        _source = srcName;
        if (typeof targetUniformsOrCallback === 'function') {
            targetUniformsOrCallback(srcName);
        } else {
            const targetUniforms = targetUniformsOrCallback;
            let source = CSynth.getBed(srcName);
            if (source && source.texture) {
                targetUniforms.t_ribboncol.value = source.texture;
            } else {
                targetUniforms.t_ribboncol.value = undefined;
            }
        }
    }
    onChange(sources[0]);
    if (!CSynth.colourGUIs) CSynth.colourGUIs = [];
    const gui = pgui.add(xx, 'source', sources).name("Colour source:").listen();//.onChange(onChange));
    gui.pgui = pgui;
    gui.targetUniformsOrCallback = targetUniformsOrCallback;
    CSynth.colourGUIs.push(gui);
    return gui;
};

/** refresh all the colour guis (eg on change of bed list) */
CSynth.refreshColourGUIs = function() {
    const old = CSynth.colourGUIs;
    if (!old) return;
    CSynth.colourGUIs = [];
    old.forEach(o => {
        GX.removeItem(o);
        const g = CSynth.addColourGUI(o.pgui, o.targetUniformsOrCallback);
        g.guiIndex = o.guiIndex;
    });
}

CSynth._wigsource = 'none';
CSynth._wigxx = {
    get wsource() { return CSynth._wsource; },
    set wsource(v) { CSynth.wigChange(v); },

    get wigscale() { return G.wigmult* G.nmPerUnit * 2; },
    set wigscale(v) { G.wigmult = v / G.nmPerUnit * 0.5; }
}

CSynth.wigChange = function wigchange(srcName) {
    CSynth._wsource = srcName;
    if (srcName === 'none') CSynth.usewig();
    else CSynth.usewig(CSynth._wsources.indexOf(srcName));
}


// add a wig dropdown if any wigs
// currently does not need second parameter as wigs only apply to Ribbon, set with usewig
CSynth.addWigGUI = (gui) => {
    if (CSynth.current.wigs.length === 0) return;
    CSynth._wsources = CSynth.current.wigs.map(b=>b.filename).concat(['none']);//, 'selection']);
    let _wsource;


    CSynth.wigChange(CSynth._wsources[0]);
    CSynth.wigGUI = gui.add(CSynth._wigxx, 'wsource', CSynth._wsources).name("Wig source:").listen().onChange(CSynth._wigChange);
    //gui.add(currentGenes, 'wigmult', 0, 5).name('Wig scale').step(0.1).listen();
    gui.add(CSynth._wigxx, 'wigscale', 0, 50).name('Wig scale').step(0.1).listen().setToolTip('scale for wig diameter effect');
}



CSynth.addSpringSourceGUI = (gui) => {
    return;  // currently broken, and didn't synv with other gui aspects, so disabled  sjpt, 13/12/18
    //TODO: use shortname rather than filename (but make sure it will work with arbitrary names)
    // const backbone = 'backbone only';
    // const sources = CSynth.current.contacts.concat(CSynth.current.xyzs).map(c=>c.shortname).concat(backbone);
    // //TODO: make sure that changes are reflected throughout system...
    // gui.add({x:sources[0]}, 'x', sources).name("Contact source:").onChange(srcName => {
    //     srcName = srcName.toLowerCase();
    //     if (srcName.endsWith('.xyz') || srcName.endsWith('.json')
    //          || srcName.endsWith('.pdb') || srcName.endsWith('.vdb')) {
    //         CSynth.applyXyzs(CSynth.current.xyzs.find(x => x.filename === srcName));
    //     } else if (srcName.endsWith('.contacts') || srcName.endsWith('.txt') || srcName.endsWith('.zip')
    //         || srcName.endsWith('.rawobserved')) {
    //         CSynth.applyContacts(CSynth.current.contacts.find(x => x.filename === srcName));
    //     } else if (srcName.match(backbone)) {
    //         loadwide(); //ugh
    //     } else {
    //         log(`Unexpected contact source "${srcName}"... ignored`);
    //     }
    // });
};


CSynth.xyzs = {};

/**
 * similar-ish to contactsReader only the xyz files we have have an extra column...
 * and the meaning of the columns is very different
 * filename input is a structured set of options
 */

CSynth.parseXYZ = function (xyzstruct, parseonly=false, all = CSynth.pdball) {
    if (!xyzstruct) return;

    // if we are loading with the xyz as a startscript we need to make a pseudo config file
    if (!CSynth.current) {
        currentLoadingDir = '';
        currentLoadingFile = xyzstruct.filename;
        springdemo({
            filename: xyzstruct.filename,
            xyzs: xyzstruct.filename
        });
        return;
    }
//if (CSynth.files[xyzstruct.filename])

    let o = xyzstruct;

    // TODO, sjpt 20/6/18
    // .xys input does not contain metadata
    // .json tadbit format does, but we are not using it (relying on config)
    // We should extract tadbit metadata and use it at least to set start and res:
    // probably assume skip and average; these relate to the difference between .xyz and .contact resolutions
    // but we should at least be able to set minid, maxid, range, res and numInstances

    const filename = o.filename.startsWith('/!') ? o.filename : CSynth.current.fullDir + o.filename;
    const average = o.average = FIRST(o.average, 1);
    const skip = FIRST(o.skip, 0);
    const start = FIRST(o.start, 0);
    const model = FIRST(o.model, 0);
    var rawXyzData = o.data;

    if (xyzstruct === '..spread..') return CSynth.spreadxyz();
    const key = o.key = [filename, average, skip, start, model].join('/');
    if (CSynth.xyzs[key]) {
        copyFrom(xyzstruct, CSynth.xyzs[key]);
        return xyzstruct;
    } // using this broke different pdb intersect things
    if (!rawXyzData && filename.startsWith('droppedFiles/')) rawXyzData = xfetch.droppedFiles[getFileName(filename)]?.data;
    if (!rawXyzData) rawXyzData = openfiles.dropped[filename];
    if (!rawXyzData) rawXyzData = posturierror(filename);
    if (!rawXyzData) { console.error('cannot load file', xyzstruct); return; }

    let coords = o.coords = [];
    let badLines = 0;

    const ext = getFileExtension(o.filename);
    if (ext === '.json') {
        const js = JSON.parse(rawXyzData);
        const dd = js.models[model].data;
        for (let i=0; i < dd.length;) {
            coords.push(new THREE.Vector3(dd[i++], dd[i++], dd[i++]));
        }
    } else if (ext === '.pdb') {
        const r = CSynth.parsePDB(rawXyzData, filename, all);
        coords = o.coords = r.coords;
        o.pdbdata = r.pdbdata;
    } else if (ext === '.vdb') {
        coords = o.coords = CSynth.parseVDB(rawXyzData, filename);
    } else {
        const lines = rawXyzData.split('\n').filter(v => v ? 1 : 0);
        //first line is number...
        //const num = lines.shift();
        //second line is description...
        //const info = lines.shift();

        for (var ln = start; ln < lines.length;) {
            // } && coords.length < numInstances;) {
            let x = 0, y = 0, z = 0;
            let n = 0;                // good lines read for this group
            for (let j = 0; n < average + skip && ln < lines.length; j++) {
                const l = lines[ln++].trim().split(/\s+/);
                const ll = l.length;
                if (l[0][0] === '#') {
                    // log('   ', xyzstruct, lines[ln]);          // comment
                } else {
                    const xx = +l[ll-3];        // take last 3; works for various files with 3, 4 or 5 entries per row
                    const yy = +l[ll-2];
                    const zz = +l[ll-1];
                    if (isNaN(xx + yy + zz)) {
                        badLines++;
                    } else {
                        if (n < average) {
                            x += xx;
                            y += yy;
                            z += zz;
                        }
                        n++;
                    }
                }

            }
            coords.push(new THREE.Vector3(x / average, y / average, z / average));
        }
    }

    const rat = Math.ceil(coords.length/gl.getParameter(gl.MAX_TEXTURE_SIZE));
    o.realcoords = coords;
    if (rat > 1) {
        msgfixlog(xyzstruct.filename, 'too big for texture, reduce resolution by', rat);
        o.coords = coords = coords.filter((x,i) => i%rat === 0);
    }

    o.numInstances = coords.length;
    o.parseonly = parseonly;
    CSynth.xyzs._last = CSynth.xyzs[key] = o; // xyzstruct;
    return CSynth.xyzs[key];
}   // parseXYZ

CSynth.finishXYZ = function(o, parseonly = o.parseonly) {
    // check numInstances defined in parent, we may have wasted a little parsing but never mind ...
    const {key, average, coords} = o;

    const nnn = CSynth.current.numInstances;
    if (nnn !== undefined) {
        if (nnn < coords.length) {
            if (average === 1 && (coords.length/nnn)%1 === 0) {
                o.average = coords.length/nnn;
                msgfixlog('>' + o.filename, 'averaged every ', o.average, 'to fit other data');
                const ro = CSynth.parseXYZ(o, parseonly);
                CSynth.finishXYZ(ro, parseonly);
                return ro;
            } else {
                msgfixlog('>' + o.filename, 'wrong length', coords.length,
                    'of xyz incompatible with', nnn, 'DATA TRUNCATED');
                coords.splice(nnn);
            }
        }
        if (nnn > coords.length && !CSynth.current.matchPairs)
            serious('not enough coords in xyz to satisfy global numInstances');
    }
    o.numInstances = coords.length;

    const stats = o.stats = arrayStats(coords);

    // log('read', xyzstruct.filename, 'lines', 'average', average, 'skip', skip, 'result len', coords.length, 'bad lines', badLines, 'last line', ln, 'stats', stats);
    CSynth.checkRangePair(o, CSynth.current);
    CSynth.checkRange(o);

    if (o.minid === undefined) o.minid = 0;
    if (o.res === undefined) o.res = 1;
    CSynth.checkRange(o);
    CSynth.checkRangePair(o, CSynth.current);
    if (CSynth.autocentrexyz) {
        const c = CSynth.stats(coords).centroid;
        coords.forEach(x => x.sub(c));
    }

    return CSynth.xyzs[key];
};

/** create a bed from a pdb */
CSynth.pdbToBedAndGroup = function(o, parseonly, filename) {
    // parse pdb to generate bed based on chains
    const p = o.pdbdata;
    if (!p) return;             // eg if input was xyz
    const gr = o.groups = {};
    p.forEach( (e,i) => {
        let ee = gr[e.chain];
        if (!ee) ee = gr[e.chain] = {minid: i, startbp: i, startid: i, num: 0, res: 1};
        ee.maxid = ee.endbp = ee.endid = i;
        ee.num++;
    });

    if (Object.keys(gr).length > 1 && !parseonly) {  // do not generate bed for single chain
        const bedtext = Object.keys(gr).map(k => [k, gr[k].minid, gr[k].maxid, 'ch_'+k].join('\t')).join('\n');
        const beds = CSynth.current.beds;
        const lastbed = beds[beds.length-1];
        const name = getFileName(filename);
        if (!lastbed || lastbed.bedtext !== bedtext) {  // do not generate duplicate identical beds
            CSynth.current.beds.push({filename, shortname: name, name, bedtext});
        }
    }
}

CSynth.autocentrexyz = true;
CSynth.parseXYZRed = () => CSynth.parseXYZ(CSynth.current.xyzs[0]);

/** stats for xyz data */
CSynth.xyzstats = function(n = 0, maxd = 10) {
    const coords = CSynth.current.xyzs[n].coords;
    for (let d=1; d <= maxd; d++) {
        const a = [];
        for (let i=d; i < coords.length; i++)
            a.push(coords[i].distanceTo(coords[i-d]));
        const s = getstats(a, {short:true});
        log(d, s);
    }
}

// make a spread
CSynth.spreadxyz = function(n=1200) {
    let coords=[];
    for (let i=0 ; i < n; i++)
        coords.push(new THREE.Vector3(i - n/2 + 0.5,0,0));
    return {coords};
}

CSynth.xyzscale = 1;
/** load some xyz data and display.  Input can be structure or index into xyzs  */
CSynth.xyzsExact = (xyzstruct) => {
    const cc = CSynth.current;
    if (xyzstruct === undefined) return;
    const tryid = cc.xyzs[xyzstruct];  // struct if input was id
    if (tryid) xyzstruct = tryid;

    const cn = cc.xyzs.indexOf(xyzstruct);
    if (cn !== -1) CSynth.pressFixed(cn);


    if (!xyzstruct.coords)
        CSynth.parseXYZ(xyzstruct);
    springs.resettopology(true);

    // fix the particles
    CSynth.coordsToFix(xyzstruct.coords, true);
}

/** remove the particle fixing */
CSynth.xyzClear = () => {
    for (let i = 0; i < numInstances; i++)
        springs.removefix(i);
    CSynth.xyzfixed = false;         // do appropriate fixing of ends
    CSynth.restorewide();
    DNASprings.dostretch();  // if stretching is defined reinstate the stretch springs
}

// Use data as provided in May 2017 https://docs.google.com/document/d/1XVXHCrpoBCUTJfYhD8KEvnhhg9CN8ki6w0PcwjnVoe4/
CSynth.NewExperimentalData = true;

CSynth.loadbed = function(fn) {
    CSynth.loadbedcol(fn);
    CSynth.loadbedannot(fn);
}

CSynth.loadbedcol = function(fn) {
    const bed = fn === '$synth$' ? CSynth.synthbed() : posturierror(fn);
    if (!bed) { msgfixlog('bad file', fn); return; }
    uniforms.matrixbed.value = uniforms.t_ribboncol.value = CSynth.bedParser(bed, fn).texture;
}

CSynth.loadbedannot = function(fn) {
    const biomParsed = CSynth.parseBioMart(fn);
    // CSynth.BioMartData = biomParsed; // do not make active just because it is parsed
}

/* load a wig using filename only, used by some special menu examples */
CSynth.loadwig = function(fn) {
    uniforms.t_ribbonrad.value = wigParser(undefined, fn).texture;
}

/** load the data according to the specifications in structure cc
 * If some required data is pending loading, defer the call to the next frame.
 */
CSynth.loadData = loadData;
async function loadData (cc, fid=cc.key) {
    if (!CSynth.setCamLightsFromGenes.lastlv) CSynth.setNovrlights(true);  // just once, but late enough
    if (searchValues.deleteallcache) await CSynth.deleteIdbDatabase();
    if (searchValues.deletecache) await CSynth.deleteIdbCache(fid);
    CSynth.statsres = 0;
    msgfixlog('datac');
    msgfixlog('datax');

    if (!cc.filename) cc.filename = fid;
    if (!cc.shortname) cc.shortname = getFileName(cc.filename);
    if (!cc.description) cc.description = cc.filename;
    if (!cc.project_name) cc.project_name = cc.shortname;
    if (!startvr) document.title = 'CSynth: ' + cc.project_name; // startvr relies on title for keystroke auto VR
    cc.ready = false;
    window.cc = CSynth.current = cc;  // window.cc to help debug
    CSynth.setDefaults(false);  // reload defaults now, but not any custom settings
    CSynth.xyzs = {};

    // ??? why needed, and why was it not caught as not defined ??? basevals = {};
    CSynth.checkRange(cc);
    const st = Date.now();
    CSynth.init(); //this seems to get called quite a number of times... actually does very little.
    clearPostCache('CSynth loadData');  // force reread in case of changed data

    // collect file names
    if (!cc.dir) cc.dir = '';
    console.log(`'loading data dir = '${cc.dir}' currentLoadingDir = '${currentLoadingDir}'`);
    if (cc.currentLoadingDir !== undefined) {
        if (currentLoadingDir)
            console.log('CSynth.loadData called with currentLoadingDir and o.currentLoadingDir', currentLoadingDir, cc.currentLoadingDir);
        currentLoadingDir = cc.currentLoadingDir
    } else {
        if (currentLoadingDir === undefined) {
            console.error('CSynth.loadData called with no currentLoadingDir');
            currentLoadingDir = '';
        } else {
            cc.currentLoadingDir = currentLoadingDir;
        }
    }

    cc.key = location.search;
    if (usecache && fid) {  // if no fid it is a dropped object and we don't try to use the cache
        if (!(fid in CSynth.cached)) {
            const rr = await CSynth.getIdbCacheOK(cc.key);
            log('await CSynth.getIdbCache complete', fid, typeof rr === 'string' ? rr : typeof rr);
        }
        const cv = CSynth.cached[fid];
        if (cv === 'pending') {
            msgfixlog('cache', 'get pending for', fid);
            return 'incomplete';  // signal to higher level to retry
        }
        if (cv && typeof cv === 'object' ) {
            if (cv.configData === cc.configData || +usecache === 99) {
                if (cv.representativeContact === undefined
                    || cv.contacts.some(c=>c.datad === undefined)
                    || !(cv.numInstances > 1)
                    || cv.contacts.some(c => c.particleNames && c.particleNames.join('').length === 0)
                ) {
                    msgfixlog('cache', 'cached values for', fid, 'are suspicious or not up to date with code release, ignoring cache');
                } else {
                    msgfixlog('cache', 'using cached values for', fid);
                    // sometimes three texture object is cached, which is not valid
                    cv.contacts.forEach(c => delete c.texture);
                    copyFrom(cc, cv);
                    CSynth.finishLoad(cc);
                    return;
                }
            } else {
                msgfixlog('cache', 'configData', fid, 'has changed since cache save, ignoring cache');
            }
        } else {
            msgfixlog('cache', 'real parse: no cache for', fid, cv);
        }
    } else {
        msgfixlog('cache', `real parse, usecache=${usecache}, or dropped`, fid);
    }

    let dir = cc.fullDir = cc.dir[0] === '/' || cc.currentLoadingDir === '' ? cc.dir : (cc.currentLoadingDir + '/' + cc.dir + '/');
    if (cc.currentLoadingDir && cc.currentLoadingDir.startsWith('/csynth/serve') && cc.dir === '')
        dir = cc.currentLoadingDir;


    /** check that values are consistent, return chosen (first) one */
    function check(name, def) {
        msgfix('defs ' + name);  // clear message
        for (let i = 1; i < arguments.length; i++)
            if (arguments[i] !== def) {
                msgfix('defs ' + name, 'inconsistent values');
                console.error('defs ' + name, 'inconsistent values');
            }
        return def;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~
    // normalize contact data, allowing for old style
    // special case for contacts being used to force details on xyzs
    if (cc.redcontacts && cc.redcontacts.num) {   // push details to higher level, don't bother with checking
        cc.numInstances = cc.redcontacts.num;
        cc.minid = cc.redcontacts.low;
        cc.res = cc.redcontacts.step;
        cc.maxid = cc.minid + cc.res * (numInstances - 1);
        cc.range = cc.maxid - cc.minid;
        delete cc.redcontacts;
    }
    if (cc.whitecontacts && cc.whitecontacts.num) {    // push details to higher level, don't bother with checking
        cc.numInstances = cc.whitecontacts.num;
        cc.minid = cc.whitecontacts.low;
        cc.res = cc.whitecontacts.step;
        cc.maxid = cc.minid + cc.res * (numInstances - 1);
        cc.range = cc.maxid - cc.minid;
        delete cc.whitecontacts;
    }

    // now allow for all old style with red/white rather than lists
    if (!cc.contacts) {
        cc.contacts = [];
        if (cc.redcontacts) cc.contacts.push(cc.redcontacts);
        if (cc.whitecontacts) cc.contacts.push(cc.whitecontacts);
    }
    if (!cc.xyzs) {
        cc.xyzs = [];
        if (cc.redxyz) cc.xyzs.push(cc.redxyz);
        if (cc.whitexyz) cc.xyzs.push(cc.whitexyz);
    }
    if (!cc.beds) {
        cc.beds = [];
        if (cc.bed) cc.beds.push(cc.bed);
        if (cc.annot) cc.beds.push(cc.annot);
    }
    if (!cc.wigs) {
        cc.wigs = [];
        if (cc.wig) cc.wigs.push(cc.wig);
    }
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~ end allow for old

    // check/fill in data
    CSynth.checkRange(cc);

    // now make all single items lists, and filename strings into structures
    cc.beds = normalizeInfo(cc.beds);
    cc.wigs = normalizeInfo(cc.wigs);
    cc.contacts = normalizeInfo(cc.contacts);
    cc.xyzs = normalizeInfo(cc.xyzs);
    function normalizeInfo(d) {
        if (!Array.isArray(d))
            d = [d];
        for (let i = 0; i < d.length; i++) {
            let di = d[i];
            if (typeof di === 'string') {
                di = d[i] = {filename: d[i]}
            }
            if (!di.filename) di.filename = 'nofile_' + i;
            const fn = typeof di.filename === 'string' ? di.filename : di.shortname ? di.shortname : di.filename[0];
            if (!di.shortname) di.shortname = getFileName(fn);
            if (!di.description) di.description = fn;
        }
        return d;
    }
    // show what we have to do
    cc.contacts.forEach(b => {
        let fn = b.filename;
        if (typeof fn === 'string') fn = [fn];
        // fn.forEach(bfn => {
        //     const k = uriclean(dir + bfn);
        //     msgfix('reading file: ' + k, '<br>pending ...<br>' + genbar(0));
        //     msgfix('parsing file: ' + k, '<br>pending ...<br>' + genbar(0));
        //     // msgfix('processing file pass2: ' + k, '<br>pending ...<br>' + genbar(0));
        // });
    });


    const _allfiles = [ cc.contacts, cc.xyzs, cc.beds, cc.wigs, cc.imagetidd ? [cc.imagetidd] : [] ]
    cc.allfiles = [].concat.apply([], _allfiles);

    // // very like openfile, to improve commonality
    // function UNUSEDrfile(f) {
    //     let _fid = uriclean(dir + f.filename);

    //     if (CSynth.files[_fid]) return; // already read
    //     if (openfiles.pen ding[_fid]) return;  // in process of beign read
    //     const ext = getFileExtension(_fid);
    //     let handler = fileTypeHandlers[ext];
    //     if (!handler) handler = window[ext.substring(1) + 'Reader'];
    //     openfiles.pen ding[_fid] = Date.now();

    //     const data = readtext(_fid);
    //     handler(data, _fid);
    //     delete openfiles.pen ding[_fid];
    //     CSynth.files[_fid] = data;

    // }
    // o.allfiles.forEach(f => rfile(f));  // dot yet, some sequence details not right, eg minid/maxid from contacts pars effects bed parse

    // do not run until all pending loads have completed
    function p(l) {
        for (let i = 0; i < l.length; i++) {
            let ll = uriclean(dir + l[i].filename);
            if (openfiles.pending[ll]) return true;
        }
        return false;
    }

    // if (p( cc.allfiles )) {
    //     // o.currentLoadingDir = currentLoadingDir;
    //     return 'incomplete';  // signal to higher level to retry
    //     //onframe(() => CSynth.loadData(o));
    //     //return;
    // }
    while (p( cc.allfiles )) {
        await sleep(10);
    }

    console.log(`loading data o.dir = '${dir}`);
    //??? removed 31 Mar 2021, was breaking Lorenz and not helping anything else
    //??? numInstances = cc.numInstances = cc.numInstances || 128;  // until defined or deduced #'#'#'

    // cc.contacts.forEach(c => await CSynth.getContacts(c, dir));  // is its own function so no await allowed!
    const proms = [];
    for (let i=0; i<cc.contacts.length; i++) {
        const contact = cc.contacts[i];
        Object.defineProperty(contact, 'texture', {
            get: () => CSynth.contactsToTexture(contact), // contact. _ texture,
            set: v => {console.error('attempt to set contact.texture')}
        })
        Object.defineProperty(contact, 'textureData', {
            get: () => contact.texture.source.data.data, // contact. _ texture,
            set: v => {console.error('attempt to set contact.textureData')}
        })
        proms.push(CSynth.getContacts(contact, dir));
    }
    await Promise.all(proms);
    cc.maxv = cc.contacts.reduce((c,v) => Math.max(c, v.maxv), 0);
    cc.representativeContact = FIRST(cc.representativeContact,
        cc.contacts.reduce((c,v) => Math.max(c, v.meannzv), 0));

    // if (cc.currentLoadingDir === 'droppedFiles' && cc.xyzs.length > 0) {
    //     msgfixerrorlog('cannot load xyzs from dropped config file')
    //     cc.xyzs = [];
    // }
    if (cc.xyzs.length > 0) {
        cc.xyzs.forEach( xx => CSynth.parseXYZ(xx) );
        CSynth.mergePdbs(cc);
        if (cc.matchPairs === undefined) cc.xyzs.every(x => x.pdbdata);  // default matching if input is pdbs
        CSynth.checkPdbs(cc);           // check pdbs for matching
        cc.xyzs.forEach( xx => CSynth.finishXYZ(xx) );
        const parseonly = false;
        cc.xyzs.forEach( xx => CSynth.pdbToBedAndGroup(xx, parseonly, xx.filename));
        const x0 = cc.xyzs[0];
        cc.groups = x0.groups;
        if (cc.groups) {
            CSynth.breakGroups(cc.groups);      // visual separation of groups
            if (x0.splitChain) {                // work out splitParticle
               cc.splitParticle = cc.groups[x0.splitChain].endid + 0.5;
               V.metavis.X.medialNeg = cc.splitParticle;
            }
            if (cc.xyzs[1] && JSON.stringify(cc.xyzs[1].groups) !== JSON.stringify(cc.groups))
                log(msgfixerror('groups', 'groups for xyzs do not agree'));
            else
                msgfix('groups');

        }

        if (cc.xyzsToDisplay || searchValues.xyzsToDisplay) {
            S.waitVal(() => V.gui).then(() => {
                cc.xyzs.forEach( xx => {            // when gui ready
                    if (xx.centre === undefined) xx.centre = true;
                    CSynth.loadExtraPDB(xx);
                });
            })
        }
    }
    numInstances = cc.numInstances; // '#'#'#'

    //    DNASprings();  // establish sizes etc '#'#'# maore explicit, check what it is really doing


    log('CSynth data load saving in cache');
    try {
        await CSynth.setIdbCache(cc);
    } catch (error) {
        console.error('cache save error', error);
    }

    const et = Date.now();
    CSynth.finishLoad(cc);
    log('CSynth data load ................. time', et-st);
}

/** interface for dropped bed files */
function bedReader(data, fn) {
    const bed = {filename: fn, shortname: fn, bedtext: data};
    const cc = CSynth.current;
    const obed = cc.beds.filter(b => b.filename === fn && b.shortname === fn)[0];
    CSynth.useBed(bed, cc, 'DROPPED:');
    if (obed) {
        Object.assign(obed, bed);
    } else {
        cc.beds.push(bed);
    }
    // CSynth.makegui(true);  // TODO, less expensive refresh of bed dropdowns
    CSynth.refreshBedGUIs();
    CSynth.chooseBed(fn);
}

/** setup and use a single bed, usually during initial load but sometimes more dynamically  */
CSynth.useBed = function(b, cc = CSynth.current, dir = '') {
    if (b.texture) return;      // only compile once
    b.isBed = true;
    b.minbpwidth = FIRST(b.minbpwidth, 0);
    if (!b.shortname) b.shortname = b.filename;
    let bedF;
    function bedparse(bedtext) {
        const beddata = CSynth.bedParser(bedtext, bedF, b);
        copyFrom(b, beddata);
        b.bedtext = bedtext;
        b.beddata = beddata;  // make it easier to check against CSynth.files

        b.biomParsed = CSynth.parseBioMart(bedF, b.bedtext);  // todo, get rid of second parseBioMart
        b.filebundle = beddata;  // not used? obsolete

        if (b === cc.beds[0]) {
            uniforms.matrixbed.value = uniforms.t_ribboncol.value = b.texture;
            if (uniforms.matrixbed) uniforms.matrixbed.value = b.texture;
            CSynth.files._activebed = b.beddata;
            CSynth.BioMartData = b.biomParsed;
        }
    }
    if (b.bedtext) {
        bedF = b.filename;
        bedparse(b.bedtext);
    } else if (b.filename && !b.filename.startsWith('nofile_')) {
        bedF = dir + b.filename;
        // ? TODO omore general async fid using pass1/pass2
        if (bedF.startsWith('droppedFiles/')) {
            (async () => {
                let ddata = await xfetch(bedF); //
                ddata = await ddata.text();
                bedparse(ddata);
            })()
        } else {
            const data = posturi(bedF);
            bedparse(data);
        }
    } else {
        b.filename = bedF = 'syn' + b.step;
        CSynth.checkRangePair(b, cc);  // make sure minid etc available
        const bedtext = CSynth.makeBed(b);
        bedparse(bedtext);
    }

}

/** do various tidy up at end of load */
CSynth.finishLoad = function(cc) {
    loadTime('model 2 finishLoad start');

    if (CSynth.objectSavePending) { onframe(() => CSynth.finishLoad(cc)); return }

    // make extra sure all information ties up
    // currentGenes.representativeContact = cc.representativeContact;
    cc.contacts.forEach( (x,n) => {
        const r = x.reduce = x.reduce || 1;
        //const irr = 1/(r*r);
        //const rn = Math.floor(x.datad.numInstances / r);  // do later
        //if (!x.numInstances) x.numInstances = rn * x.expand;

        CSynth.checkRangePair(cc, x);
        x.isContact = true;
        x.dists = {};
        window['ccc' + n] = x
    });
    cc.xyzs.forEach( (x,n) => {
        CSynth.checkRangePair(cc, x);
        x.isXyz = true;
        x.dists = {};
        window['ccx' + n] = x;
    });
    if (!numInstances) numInstances = cc.numInstances;  // usually already done, depends on async details
    if (!numInstances) {
        msgfixerror('finishLoad', 'could not establish loaded data correctly');
        return;
    }
    if (CSynth.statsres === 0) {
        if (cc.contacts.length > 0)
            CSynth.statsres = cc.contacts[0].datad.numInstances;
        else
            CSynth.statsres = numInstances;
    }

    CSynth.showSummary(cc);

    const dir = cc.fullDir

    numInstances = cc.numInstances; // '#'#'#'  establish global numInstances
    springs.setPARTICLES(numInstances);
    DNASprings();                   // '#'#'#'  also get numInstancesP2 early, may be too early for all springs

    // read and parse all beds and initial setup for t_ribboncol
    // needed to make sure everything is correctly populated, but we should be able to be les extreme?
    // CSynth.parseBioMart.cache = {};  // I think this is ok now we don't force visibilty false

    uniforms.matrixbed.value = uniforms.t_ribboncol.value = undefined;
    if (uniforms.matrixbed) uniforms.matrixbed.value = undefined;
    CSynth.files._activebed = undefined;
    CSynth.BioMartData = undefined;

    if (cc.extraContacts) CSynth.loadExtraContacts(dir + cc.extraContacts);

    if (cc.contacts[0] && cc.contacts[0].expand !== 1) {
        const ex = cc.contacts[0].expand;
        cc.beds.push({shortname: 'groups', description: `show ${ex} particle groups`, step: cc.res * ex})
    }
    cc.beds.forEach(b => CSynth.useBed(b, cc, dir));

    if (CSynth.parseBioMart.setVisibility) CSynth.parseBioMart.setVisibility(!!CSynth.BioMartData);

    // read and parse all wigs and initial setup for t_ribbonrad
    CSynth.usewig();
    cc.wigs.forEach( w => {
        w.isWig = true;
        const wigF = dir + w.filename;
        const req = posturiasync(wigF, function(wigtext) {
            const wigdata = wigParser(wigtext, wigF);
            if (!wigdata)
                msgfixerror('no data for wig', wigF);  // but let it continue ???
            else
                copyFrom(w, wigdata);
            if (w === cc.wigs[0]) {
                CSynth.usewig(0);
            }
        })  // async setup
        req.onerror = (e) => msgfixerror('cannot read', wigF);
    });     // wigs.forEach

    //TODO: ability to add many such layers with appropriate hierarchy to toggle on / off.
    //biomParsed.make3dAnnotations();

    /////
    if (cc.imagetiff) {
        if (typeof cc.imagetiff === 'string')
            cc.imagetiff = {filename: cc.imagetiff};

        const imageF = (dir + cc.imagetiff.filename); //  || 'CSynth/data/polymer/STED_example_mouse.tif';
        setTimeout(()=>CSynth.loadTiff(imageF), 5);  // wait till other IO done otherwise we get a 27 second hang
    }

    CSynth.checkone(cc, 'numInstances', numInstances);

    // customSettings();  // may not be ready quite yet
    // for (let i=0; i<=6; i+=3) onframe(customSettings, i);  // why ??? some bits like spheres not quite read?
    Maestro.on('demoready', () => customSettings());  // function needed in case customSettings is redefined
    cc.key = location.search; // cc.filename;
    uniforms.maxv.value = cc.maxv;
    setPickRenderTarget();      // make sure pick render target ok, stops initial spruious selections at start
    Maestro.trigger('finishload');
    loadTime('model 3 finishLoad end');

}

// set a maxbedlen and refresh bed files/textures
// sets all: no particular reason they should all have same bedlen
CSynth.setbedlen = function(n) {
    const cc = CSynth.current;
    const obed = GX.getValue('modes/beddatasource');
    CSynth.files= {};   // a bit extreme to stop use of cahce
    CSynth.maxbedlen = n;
    cc.beds.forEach(b => CSynth.useBed(b, cc, cc.dir)); // force the remake
    // force a change and then back to make sure the change happens
    GX.setValue('modes/beddatasource', cc.beds[0].filename);
    GX.setValue('modes/beddatasource', cc.beds[1].filename);
    GX.setValue('modes/beddatasource', obed);
}

CSynth.showSummary = function(cc = CSynth.current) {
    const cccs = cc.contacts;
    const sp = '&nbsp;&nbsp;';
    if (cccs.length !== 0) {
        const s = [`n=${cc.numInstances}`];
        for (let i=0; i < cccs.length; i++) {
            const ccc = cccs[i];
            const datan = ccc.numInstances === ccc.datad.numInstances ?
                `n=datan=${ccc.numInstances}` : `n=${ccc.numInstances} datan=${ccc.datad.numInstances}`;
            const expand = ccc.expand === 1 ? '' : `expand=${ccc.expand}`;
            const reduce = ccc.reduce === 1 ? '' : `reduce=${ccc.reduce}`;
            s.push(`${i}: ${datan} fn=${ccc.filename}
            <br>${sp}minid=${ccc.minid} maxid=${ccc.maxid} res=${ccc.res} ${reduce} ${expand}
            `)
        }
        msgfixlog('!datac', s.join('<br>'));
    } else {
        msgfixlog('!datac')
    }

    if (cc.xyzs.length !== 0)
        msgfixlog('!datax',
        `$cc.numInstances$$cc.xyzs[0].numInstances$
        <br>$cc.minid$$cc.maxid$$cc.res$$cc.xyzs[0].coords.length$
        <br>$cc.xyzs[0].filename$$cc.minid$
        `)
    else
        msgfixlog('!datax')
}

// Prepare the data, process a single contact
CSynth.getContacts = getContacts;
async function getContacts(contact, dir, isSubfile = false) {
    const fida = contact.filename;
    // prefile will happen after drop; openfile() will have done the work. check if other good reasons
    const prefile = CSynth.files['/' + fida] || CSynth.files[fida];
    if (prefile) {
        copyFrom(contact, prefile);
        return;
    }
    if (Array.isArray(fida)) { await multiRead(contact, dir); return; }
    const fidd = dir + fida;
    //let details = CSynth.files[fidd];      // get from cache if possible
    if (!contact) contact = {};
    if (contact.data) { console.error('unexpected contact with data ready'); debugger; }
    await contactsReader(undefined, fidd, contact, isSubfile);
    // if (!contact.data) {
    //     // details will be updated below
    //     const ext = getFileExtension(fida);  // will be lower case
    //     if (fida.endsWith('_matrix.txt') || fida.endsWith('.mat')) {
    //         const d = await posturimsgasync(fidd);  // do read here so bintri doesn't attempt binary read
    //         // but bintri will convert on the fly
    //         await bintriReader(d, fidd, contact);
    //     } else if (ext === '.contacts' || ext === '.txt'  || ext === '.zip' || ext === '.csv'
    //         || ext === '.rawobserved') {
    //         // const _rawdata = posturierror(fidd);  // must read data
    //         let _rawdata;
    //         const fff = await xfetch(fidd);
    //         const blob = await fff.blob();
    //         if (ext === '.zip') {
    //             _rawdata = new Uint8Array(await blob.arrayBuffer());
    //         } else {
    //             _rawdata = await blob2forEach(blob, fida);
    //         }
    //         //const bindata = await readbinaryasync(fidd);
    //         //const _rawdata = ext === '.zip' ? bindata : buff2GenStruct(bindata);  // must read data
    //         if (!_rawdata) throwe('cannot load file ' + fidd);
    //         if (!isSubfile)
    //             CSynth.checkRangePair(contact, CSynth.current);
    //         await contactsReader(_rawdata, fidd, contact, isSubfile);
    //     } else if (ext === '.bintri') {
    //         // bintriReader handles its own data read
    //         await bintriReader(undefined, fidd, contact);
    //     } else {
    //         serious('wrong file extension for contacts', ext);
    //     }
    // }
    // CSynth.checkRangePair(contact, details);
    if (!isSubfile)
        CSynth.checkRangePair(contact, CSynth.current);
    // copyFrom(contact, details);
}

// handle a request for multiple files used in single model
async function multiRead(topcontact, dir) {
    const fids = topcontact.filename;
    const subcontacts = [];
    // parse the parts
    let n = 0;      // total outupt length
    let datalen = 0;
    let meannzv = 0;
    let meanv = 0;
    let dres;
    for (let i=0; i < fids.length; i++) {
        const contact = {filename: fids[i]};
        await getContacts(contact, dir, true);
        subcontacts.push(contact);
        contact.datad.firstParticle = n;
        n += contact.datad.numInstances;
        contact.datad.lastParticle = n-1;
        datalen += contact.data.length;
        meannzv = Math.max(meannzv, contact.meannzv);
        meanv = Math.max(meanv, contact.meanv);
        if (i === 0) dres = contact.datad.res;
        if (dres !== contact.datad.res)
            serious('attempt to mix resolutions in multiRead');
    }

    // merge the parts
    const odata = topcontact.data = new Float32Array(datalen);
    topcontact.datad = {};
    topcontact.meannzv = meannzv;
    topcontact.meanv = meanv;
    let k = 0;  // to write to new array
    let bid = topcontact.datad.minid = subcontacts[0].datad.minid;
    for (let i=0; i < fids.length; i++) {
        const idata = subcontacts[i].data;
        const idatad = subcontacts[i].datad;
        const bpoff = bid - idatad.minid;    // offset to relocate bp numbers
        idatad.bpoff = bpoff;                // keep some extra information
        idatad.offminid = bid;
        idatad.minDataPoint = k;

        for (let j = 0; j < idata.length; ) {
            odata[k++] = idata[j++] + bpoff;
            odata[k++] = idata[j++] + bpoff;
            odata[k++] = idata[j++];
            // ??? todo summary data
        }
        bid = idatad.maxid + bpoff + dres;  // start point for next
        delete subcontacts[i].data;    // save wasted space, and maybe stop transaction getting too big
    }

    topcontact.datad.res = dres;
    topcontact.datad.maxid = bid - dres;
    topcontact.datad.numInstances = n;
    // o, contact.expand, fid
    finalize(topcontact, topcontact.expand || 1, topcontact.shortname, false);
    numInstances = topcontact.numInstances;
    topcontact.subcontacts = subcontacts;
    // copyFrom(topcontact, contacts[0]);  // temporary code just to use first
}

/** get the normalized index (range 0..1), allowing for groups if possible */
CSynth.getNormalisedIndex = function(bp, chr) {
    const cc = CSynth.current;
    const groups = cc.groups;
    if (typeof bp === 'string') {
        const mm = bp.match(/(.*):(.*)-(.*)/);
        if (mm) { chr = mm[1]; bp = (+mm[2] + +mm[3])/2; }
    }
    if (!groups || chr === undefined)        // we hope that chr is correct, but can't easily check here
        return (bp - CSynth.current.minid) / cc.range;
    const gr = groups[chr];
    if (!gr) {
        msgfix('getNormalisedIndex', 'lookup for incorrect chr', chr);
        return (bp - CSynth.current.minid) / cc.range;
    }
    if (bp < gr.startbp || bp > gr.endbp) return -999;
    return ((bp - gr.startbp) + gr.res * gr.startid ) / cc.range;
}

/** get name for base pair, using header or group information if available */
CSynth.getBPFromNormalisedIndex = i => {
    const cc = CSynth.current;
    const part = Math.round(i * (cc.numInstances - 1));
    const ccc0 = cc.contacts[0];
    if (ccc0 && ccc0.header) {
        return ccc0.header[Math.round(part)];
    } else if (cc.groups) {
        for (const gn in cc.groups) {
            const g = cc.groups[gn];
            if (g.startid <= part && part <= g.endid) {
                const bp = g.startbp + Math.floor(part-g.startid) * cc.res;
                const ebp = bp + cc.res;
                return(`${g.name}:${bp}-${ebp}`);
            }
        }
    } else {
        return Math.round(cc.minid + i * cc.range);
    }
}

CSynth.particle4bp = bp => (bp - CSynth.current.minid) / CSynth.current.res;
CSynth.bp4particle = part => part * CSynth.current.res + CSynth.current.minid;

CSynth.ni4bp = CSynth.getNormalisedIndex;
CSynth.bp4ni = CSynth.getBPFromNormalisedIndex;

/// below not used, and may be wrong (??? the -1)
// CSynth.ni4particle = part => part / (CSynth.current.numInstances - 1);
// CSynth.particle4ni = part => part * (CSynth.current.numInstances - 1);

CSynth.nearestbp = bp => CSynth.bp4particle(Math.round(CSynth.particle4bp(bp)));

/** find particle for id, id of form p<part>, bp<bp>, i<i> (not implemented) */
CSynth.particle4id = function(id) {
    if (typeof id === 'number') return CSynth.particle4bp(id);
    if (id[0] === 'p') return +id.substring(1);
    if (id.startsWith('bp')) return CSynth.particle4bp(+id.substring(2));
    // if (id[0] === 'i') return CSynth.particle4bp(+substring(id, 2));
    throwe('invalid call to particle4id', id);
}


/** count the total strength of contacts for each particle */
CSynth.countContacts = function(contacts) {
    if (typeof contacts === 'number') contacts = CSynth.current.contacts[contacts];

    const s = contacts.totstrength = new Array(CSynth.current.numInstances).fill(0);
    const minid = CSynth.current.minid, _res = CSynth.current.res;
    const d = contacts.data;
    for (let i=0; i < d.length; ) {
        const a = (d[i++] - minid) / _res;
        const b = (d[i++] - minid) / _res;
        const str = d[i++];
        s[a] += str;
        s[b] += str;
    }
    return s;
}

CSynth.loadTiff = async function(fid) {
    if (fid.endsWith('.map'))
        await posturibin(fid, CSynth.mapReader);  // async
    else
        await posturibin(fid, CSynth.tiffReader);
    const is = window.settings || searchValues.settings;
    if (is) processFile(CSynth.current.fullDir + is);

//        posturibin(fid + '?222', ()=>log('secondtiff'));
//    posturibin(fid + '?333', ()=>log('thirdtiff'));
}

/** call this when data ready */
CSynth.tiffReader = function(data, fid) {
    let tiff = window.require('tiff');
    CSynth.tiffdata = tiff.decode(data);
    log('got tiff data');
    if (!CSynth.imagevis) CSynth.imagevis = new CSynth.ImageVis();
    if (!CSynth.imagevis2) CSynth.imagevis2 = new CSynth.ImageVis2();
    if (!CSynth.imagevis3) CSynth.imagevis3 = new CSynth.ImageVis3();
    if (!CSynth.imagevis4) CSynth.imagevis4 = new CSynth.ImageVis4();
    CSynth.imagevis.newdata(CSynth.tiffdata, fid); //  = new CSynth.ImageVis();
    CSynth.imagevis2.newdata(CSynth.tiffdata, fid); //  = new CSynth.ImageVis();
    CSynth.imagevis3.newdata(CSynth.tiffdata, fid); //  = new CSynth.ImageVis();
    CSynth.imagevis4.newdata(CSynth.tiffdata, fid); //  = new CSynth.ImageVis();
    // V.gui.addFolder(VH.ImageVis.createGUIVR());
}
var tifReader = CSynth.tiffReader;

/** call this when data ready */
CSynth.mapReader = function(data, fid) {
    CSynth.imageVispInst = new CSynth.ImageVisp(data, fid); //  = new CSynth.ImageVis();
    // CSynth.imagevisp.newmapdata(data, fid); //  = new CSynth.ImageVis();
    // CSynth.imagevis2.newmapdata(data, fid); //  = new CSynth.ImageVis();
}
var mapReader = CSynth.mapReader;

// https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html
CSynth.formatp = [
    [1,4, 'atom', 'l'], //    â€œATOMâ€        character
    [7,11, 'atid', 'i'], //    Atom serial number    right    integer
    [14,16, 'atname', 'l'], //    Atom name    left*    character --- does not cater for 4 character
    [17,17, 'altloc', 'l'], //    Alternate location indicator        character
    [18,20, 'resname', 'r'], // Â§    Residue name    right    character
    [22,22, 'chain', 'l'], //     Chain identifier        character
    [23,26, 'resid', 'i'], //     Residue sequence number    right    integer
    [27,27, 'insert', 'l'], //     Code for insertions of residues        character
    [31,38, 'x', 8, 3], //     X orthogonal Ã… coordinate    right    real (8.3)
    [39,46, 'y', 8, 3], //     Y orthogonal Ã… coordinate    right    real (8.3)
    [47,54, 'z', 8, 3], //     Z orthogonal Ã… coordinate    right    real (8.3)
    [55,60,  'occupancy', 6, 2], // Occupancy    right    real (6.2)
    [61,66,  'tempfac', 6, 2], // Temperature factor    right    real (6.2)
    [73,76,  'segid', 'l'], // Segment identifierÂ¶    left    character
    [77,78, 'elesym', 'r'], //     Element symbol    right    character
    [80,81, 'sl_label', 'x']   // contact label for York virus
];

var pdbdatas;

CSynth.pdbskip = 1;         // only use sampled values from matching pdb atoms
CSynth.pdball = false;      // if true, match all atoms, not just 'special' ones
CSynth.pdbmaxnum = 16000;   // max number of pdb atoms to use, if too many sample
/** call this when data ready to pasePDB;
return array of coordinates
regular xyz processing will handle all the CSynth structure details
data is preread data from file
fid is file name
all true uses all parsed atoms, otherwise just 'special' ones 'CA', "C1'", '1'
plines is presplit lines
*/
CSynth.parsePDB = function(data, fid, all=CSynth.pdball, plines) {
    const formatp = CSynth.formatp;
    if (!data) data = posturi(fid);
    const lines = plines || data.split('\n');
    function xxn(v) {
        const vv = +v;
        return (isNaN (vv)) ? parseInt(v, 16) : vv;
    }

    const coords = [];
    const pdbdata = [];
    let i = 0;
    for (const l of lines) {
        if (l.substr(0,4) !== 'ATOM') continue;
        const atname = l.substring(13,16).trim();
        if (!all && !['CA', "C1'"].includes(atname)) continue;
        if (i++%CSynth.pdbskip !== 0) continue;
        const d = {
            atom: l.substring(0,4).trim(),
            atid: xxn(l.substring(6,11)),
            atname,
            altloc: l.substring(16,17).trim(),
            resname: l.substring(17,20).trim(),
            chain: l.substring(21,22).trim(),
            resid: +l.substring(22,26),
            insert: l.substring(26,27).trim(),
            x: +l.substring(30,38),
            y: +l.substring(38,46),
            z: +l.substring(46,54),
            occupancy: +l.substring(54,60),
            tempfac: +l.substring(60,66),
            segid: l.substring(72,76).trim(),
            elesym: l.substring(76,78).trim(),
            sl_label: l.substring(79,81).trim()
        }
        // const d = dd;

        // const d = {};
        // for (const f of formatp) {
        //     // if (!f) continue;  // final dummy one
        //     let v = l.substring(f[0] - 1, f[1]).trim();
        //     if (f[2] === 'atid') v = xxn(v)
        //     else if (!isNaN(v) && v.trim() !== '') v = +v;
        //     d[f[2]] = v;
        //     // const vv = Number(v);
        //     // d[f[2]] = isNaN(vv) ? v : vv;
        //     if ((f[2] !== 'atname' && dd[f[2]] !== d[f[2]] ) || dd[f[2]] != d[f[2]])
        //         debugger
        // }

        // coords.push(d);
        coords.push(new THREE.Vector3(d.x, d.y, d.z));
        pdbdata.push(d);
    }

    const oldl = coords.length;
    if (oldl === 0 && !all) {
        msgfixlog('pdball', 'pdb data set', fid, 'had no "special" atom types, trying all atoms');
        return CSynth.parsePDB(data, fid, true, lines);

    }
    if (oldl > CSynth.pdbmaxnum) {
        const rat = Math.ceil(oldl / CSynth.pdbmaxnum);
        const ncoords = coords.filter((v, j) => j%rat === 0)
        const npdbdata = pdbdata.filter((v, j) => j%rat === 0)
        msgfixlog('pdbmaxnum', 'reducing pdb data set', fid, 'len was', oldl, 'now', ncoords.length, 'ratio', rat);
        return {coords: ncoords, pdbdata: npdbdata};
    }
    return {coords, pdbdata};
}

/** rename chains starting at '1', based on control break and also break at position n
 * This can be used to rename data from the docking benchmark database
 * so that the _l and _r datasets are consistently named and can be compared.
 *
 * splitChain is returned and can be used to determin splitParticle after any particle elimination by useSubset.
 * interesting: 1E4K (?FoldSynth demo?), 3R9A, 1BXG, **1BKD **
 * bad matches 1AZS
*/
CSynth.rechainPDB = function(xi, n = -999) {
    const pdbdata = xi.pdbdata;
    let ch = 0, last = '!none', splitChain, resid, side = 'l';
    for (let i = 0; i < pdbdata.length; i++) {
        const d = pdbdata[i];
        if (d.chain !== last || i === n) {
            if (i === n) {splitChain = ch; side = 'r'; }
            ch++;
            last = d.chain;
            resid = d.resid % 100;
            if (d.resid !== 1) log('unexpected starting resid', xi.description, d.chain, side, d.resid, 'used', resid);
        }
        d.chain = ch+'';
        d.resid = resid++;
    }
    return splitChain;
}

// turn groups into array, lazy
CSynth.groupArr = function(groups = CSynth.current.groups) {
    let r = CSynth.current.groupArr;
    if (r) return r;
    if (!groups) return undefined;
    r = CSynth.current.groupArr = new Array(CSynth.current.numInstances);
    for (let gn in groups) {
        const g = groups[gn];
        for (let i = g.startid; i <= g.endid; i++) r[i] = gn;
    }
    return r;
}

CSynth.savepdb = function(fid) {
    const formatp = CSynth.formatp;
    const odata = getVal('CSynth.current.xyzs.0.pdbdata');
    const cc = CSynth.current;
    if (!fid) {
        fid = prompt('name for pdb file', cc.shortname + '.pdb');
        if (!fid) return;
        fid += '.pdb';
    }
    const ga = CSynth.groupArr();
    const pos = springs.getpos();
    const res = [];
    const o = x => res.push('REMARK 250 ' + x);
    o('saved by CSynth: ' + new Date().toGMTString());
    o('file: ' + cc.currentLoadingFile);

    for (let i = 0; i < pos.length; i++) {
        const r = {atom: 'ATOM', atid: i, atname: 'CA', altloc: '', resname: 'ALA', chain: ga ? ga[i] : 'A', resid: i, insert: '',
            occupancy: 1, tempfac: 10, segid: '', elesym: 'C', sl_label: 0};
        if (odata) Object.assign(r, odata[i]);
        Object.assign(r, pos[i]);

        let line = ' '.repeat(80);
        for (const k of formatp) {
            let [s1, e, id, f, fx] = k;
            const s = s1 - 1, l = e - s;
            const v = r[id];
            let ss;

            if (typeof f === 'number') ss = v.toFixed(fx).padStart(f);
            else if (f === 'i') ss = v.toFixed(0).padStart(l);
            else if (f === 'l') ss = v.toString().padEnd(l);
            else if (f === 'r') ss = v.toString().padStart(l);
            else continue;

            line = replaceAt(line, s, ss);
        }
        res.push(line);
    }
    res.push();
    // saveTextfile(res.join('\n'), fid);
    Files.write(fid, res.join('\n'));
}

CSynth.parseVDB = function(data, fid) {
    const lines = data.split('\n');
    const coords = [];
    lines.forEach( l => {
        if (l.substring(7,11) !== ' CA ') return;
        const d = {};
        const x = +l.substring(16,26);
        const y = +l.substring(26,36);
        const z = +l.substring(36,46);
        if (isNaN(x+y+z)) {log('unexpected vdb row', l); return; }
        coords.push(new THREE.Vector3(x, y, z));
    });
    return coords;
}


// read pdb goes via parseXYZ, with actual parsing diverted to parsePDB
// but common code for setting up CSynth details
var pdbReader = xyzReader;
var vdbReader = xyzReader;

//not using for now... let's re-adapt it for showing coordinates when clicking on matrix
// CSynth.onUniquePick = (event) => {
//     const p = event.eventParms;
//     const pickResult = p.pickResult;

//     if (!pickResult || pickResult.length < 2) return;
//     const i = pickResult[0]; //was pickResult[2].rp back in the days I had any idea WTF was going on.
//     const bp = CSynth.getBPFromNormalisedIndex(i);
//     if (CSynth.getAnnotationsForBP) {
//         //log(`Annotation for bp ${bp} (index ${i})`);
//         const annot = CSynth.getAnnotationsForBP(bp);
//         //log(annot);
//         if (!annot) return;
//         // if (!CSynth.annotationLabel) {
//         //     const a = CSynth.annotationLabel = dat.GUIVR.textCreator.create(annot.Description);
//         //     CSynth.annotationLabel.scale.set(400, 400, 400);
//         //     V.rawscene.add(CSynth.annotationLabel);
//         // } else CSynth.annotationLabel.updateLabel(annot.Description);
//         // //Should extract hit position for now...
//         // CSynth.annotationLabel.position.setFromMatrixPosition(p.source.threeObject.matrix);
//         // CSynth.createAnnotation(i, annot.Description);
//     }
// };

/**
 * Short term hack as current code is rather fixed in structure to expect WIG data to be in place.
 * @param {number} wiglen indirectly determines geometry resolution along strand
 */
function dummyWig(wiglen, val) {
    var wigarr = new Uint8Array(wiglen * 4);
    for (var i = 0; i < 4 * wiglen; i++) wigarr[i] = val;
    var texture = newTHREE_DataTextureNamed('dummywig', wigarr, wiglen, 1, THREE.RGBAFormat,
        THREE.UnsignedByteType, undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);
    texture.needsUpdate = true;

    uniforms.t_ribbonrad.value = texture;  // <<< temporary, too fixed
}





/**** experimental code does not work.  Why should drag-drop work but not copy-paste? * /
document.onpaste = function (event) {
  // use event.originalEvent.clipboard for newer chrome versions
  var items = (event.clipboardData  || event.originalEvent.clipboardData).items;
  console.log(JSON.stringify(items)); // will give you the mime types
  // find pasted image among pasted items
  var blob = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") === 0) {
      blob = items[i].getAsFile();
    }
  }
  // load image if there is a pasted image
  if (blob !== null) {
    var reader = new FileReader();
    reader.onload = function(event) {
      console.log(event.target.result); // data url!
    };
    reader.readAsDataURL(blob);
  }
}
/****/

// standard colours. Note that shaders also use different stdcolX and stdcolY arrays
CSynth.__stdcol = [
[127, 127, 127],    //
[255,0,0],          // chr1
[0,255,0],
[0,0,255],
[0,255,255],        // chr4
[255,0,255],
[255,255,0],
[63, 63, 63],
[255,127,0],        // chr8
[0,255,127],
[127,0,255],
[0, 127,255],
[255,0,127],        // chr12
[255,127,60],
[60,255,127],
[127,60,255],
[127,60,255],       // chr16
[60, 127,255],
[255,60,127]
];

/** color schemes */
CSynth.colorSchemes = {standard: CSynth.__stdcol};

// no localStorage in worker
if (localStorage && localStorage.colorSchemes) CSynth.colorSchemes = JSON.parse(localStorage.colorSchemes);


CSynth.maxbedlen = 1e20;  // will never be reached
/**** read bed files, data, filename, and (optional) bed structure */
CSynth.bedParser = function CSynth_bedParser(data, fn, bed) {
    if (!data) { msgfixlog('bad file', 'no data loaded for file', fn); return; }
    // prepare array version
    const bedLen = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), CSynth.maxbedlen);
    const minId = CSynth.current.minid;  // check for res TODO "�"�"�
    const maxId = CSynth.current.maxid;
    if (minId === undefined) return {};    // called too early
    const groups = CSynth.current.groups;
    let key = [fn, minId, maxId].join(';');
    // if (CSynth.files[key] && CSynth.files[key].bedarr) return CSynth.files[key];
    const range = maxId - minId;
    const bedArr = new Uint8Array(bedLen * 8);  // bed for graphics
    const minBpWidth = bed ? bed.minbpwidth : 0;
    log('bed resolution', range / bedLen);
    const colorScheme = bed.colorScheme || CSynth.__stdcol;

    // now read data and fill array
    const dd = data.split('\n');
    const bb = [];
    const col = new THREE.Color();
    for (let li = 0; li < dd.length; li++) {
        const dl = dd[li].trim();
        if (dl === '' || dl[0] === '#') continue;
        let d = dl.split('\t');
        const chr = d[0];
        let startBp = +d[1];
        let endBp = +d[2];
        if (isNaN(startBp + endBp)) {log('bed line ignored', fn, dl); continue; }
        if (endBp - startBp < minBpWidth) {
            let x = (minBpWidth - (endBp - startBp)) / 2;
            startBp -= x;
            endBp += x;
        }
        Object.assign(d, { chr, startbp: startBp, endbp: endBp, key: d[3], col: d[8], line: dl });  // start/end in bp
        const i = bb.length;
        bb.push(d);
        let s, e;
        const g = groups?.[chr];
        if (g && chr !== '!') {  // ! special case for older beds
            startBp = Math.max(startBp, g.startbp);
            endBp = Math.min(endBp, g.endbp);
            const startid = (startBp - g.startbp) / g.res + g.startid;
            const endid = (endBp - g.startbp) / g.res + g.startid;
            s = startid / (numInstances - 1);
            e = endid / (numInstances - 1);
        } else {
            s = s ?? Math.max(d.startbp - minId, 0) / range;  // ?? should it be (bedLen-1) ?
            e = e ?? Math.min(d.endbp - minId, range)/ range;
        }
        d.startfract = s;
        d.endfract = e;
        const mid = s + (e-s) / 2;
        s = Math.ceil(s * (bedLen - 1));
        e = Math.ceil(e * (bedLen - 1));    // was floor TODO "�"�"�
        if (s > e) s = e;  // make sure at least on point hit
        let c;
        if (W.bedline2col) {
            c = W.bedline2col(d);
        } else if (d.col) {
            c = d.col.split(',');
        } else {
            c = colorScheme[(i+1) % colorScheme.length];
        }
        if (typeof(c) === 'string') col.set(c);
        else if (c.r !== undefined) col.copy(c);
        else if (isNaN(c[0])) col.set(c[0]);
        else col.setRGB(c[0] / 255.99, c[1] / 255.99, c[2] / 255.99);

        for (let j = s; j <= e; j++) {      // TODO "�"�"� was <

        //changing to have one row of colour, then one row giving the range for which that colour applies...
            //store colour in texture data
            bedArr[j * 4 + 0] = col.r * 255.99;            // later multiplex beds ???
            bedArr[j * 4 + 1] = col.g * 255.99;
            bedArr[j * 4 + 2] = col.b * 255.99;
            bedArr[j * 4 + 3] = i + 1;            // for now, save index in alpha channel

            //should we save ranges for non-coloured regions?
            //if (j !== e) { // TODO "�"�"�
                const k = j + bedArr.length/8;
                bedArr[k * 4 + 0] = Math.round(255*mid);
                bedArr[k * 4 + 1] = Math.round(255*d.startfract);
                bedArr[k * 4 + 2] = Math.round(255*d.endfract);
                bedArr[k * 4 + 3] = 0; // we could use this channel (or x) to indicate whether inside or how far from region...
            //}
        }
    }

    /*
     sample bedline2col
     window.bedline2col = p => {
        let v = p[3];           // as in McGill sample
        v = Math.log10(clamp(v, 0.01, 100))/2;      // map to -1..1
        let r,g,b;
        if (v < 0) {                  // blue/red with white at 0
            b = 1; r = g = 1+v;
        } else {
            r = 1; g = b = 1-v;
        }
        r *=r; g *= g; b *= b;      // improve perceptual discrimination
        return {r, g, b};
     }
     */


    const texture = newTHREE_DataTextureNamed('bed', bedArr, bedLen, 2, THREE.RGBAFormat,
        THREE.UnsignedByteType, undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);
    texture.needsUpdate = true;

    const name = fn.replace('.bed', '');
    const bundle = { data: bb, bdata: bb, name, texture, bedarr: bedArr };
    CSynth.files[key] = bundle;
    // CSynth.files._activebed = bundle;  // do not activate just because read
    //uniforms.matrixbed.value = uniforms.t_ribboncol.value = texture;  // <<< temporary, too fixed. Now the responsibility of caller.
    return bundle;
}

/** synthesize a bed file */
CSynth.synthbed = function(start = CSynth.current.minid-CSynth.current.res/2, end = CSynth.current.maxid+CSynth.current.res/2, group = 16) {
    const rr = [];
    const step = group * CSynth.current.res;
    var r=255, g=126, b=0;
    for (let nb = start; nb < end; nb += step) {
        r = (r + 70) % 255; g = (g + 93) % 255; b = (b + 111) % 255;
        rr.push(['chr11', nb, nb+step-1, nb + '..' + (nb+step),'','','','',r + ',' + g + ',' + b].join('\t'));
    }
    return rr.join('\n');
}

// //XXX: there was already CSynth.getAnnotationsByBP function... we should consolidate CSynth.bedParser and parseBioMart...
// // out of data for multiple chromosomes, and unused 18 Feb 2019
// function bedhits(id, bedid = '_activebed') {
//     const bed = CSynth.files[bedid];
//     const h = [];
//     if (!bed) return h;
//     const data = bed.data;
//     for (let i = 0; i < data.length; i++) {
//         const d = data[i];
//         if (d.startbp <= id && id <= d.endbp) h.push(d.line);
//     }
//     return h;
// }

CSynth.bedhitsForFract = function(fract, pbed) {
    const beds = pbed ? [pbed] : CSynth.current.beds;
    const r = [];
    beds.forEach(bed => {
        if (bed.bdata)      // may not be ready, eg just after load
            bed.bdata.forEach(binfo => {
                if (binfo.startfract <= fract && fract <= binfo.endfract)
                    r.push(binfo);
            } );
    });
    return r;
}



var wigs = {};
/** should only be called from dynamic load of wig (not config loads) */
function wigReader(data, fn) {
    const b = wigParser(data, fn);
    b.filename = fn;
    b.shortname = b.name;
    CSynth.current.wigs.push(b);
    CSynth.makegui(true);
    CSynth.wigChange(b.filename);
}

/**** read wig files, will generally be called with data during load,
 * may be called with fn only from menu calls to loadwig()
 */
function wigParser(data, fn) {
    var minid = CSynth.current.minid;
    var maxid = CSynth.current.maxid;
    var key = [uriclean(fn), minid, maxid].join(';');
    if (wigs[key]) return wigs[key];
    if (!data) return;

    // prepare array version
    // now read data and fill array
    var dd = data.split('\n');
    var dlen = dd.length - 2;  // first line is header, last 'line' should be empty

    var wigres = dd[0].split('span=')[1] - 0;   // find wigres from first row of file if possible
    if (isNaN(wigres)) wigres = 1;              // if not assume 1 (until adjusted below)
    var maxlen = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    var k = Math.ceil((maxid - minid) / wigres / maxlen)
    wigres *= k;
    if (k > 1) msgfix('>wigload', 'wig resolution reduced by factor', k, 'to', wigres);
    /***  code assuming all wigress included in fail
        var start = dd[1].split('\t')[0] -0;
        if (start > minid) throwe('start > minid not supported for wig file read yet', start, minid);
        var end = dd[dlen].split('\t')[0] -0;
        if (end < maxid) throwe('end < maxid not supported for wig file read yet', end, maxid);
        if (start + wigres*(dlen-1) !== end) throwe('unexpected start/wigres/end');
    ***/
    const wiglen = Math.ceil((maxid - minid) / wigres) + 1;  // number in range
    log(`wiglen: ${wiglen}`);
    // TODO: if wiglen exceeds single texture dimension we will have to fold into 2d
    const wigparse1 = new Float32Array(wiglen);
    let max = 0;

    for (let i = 0; i < dlen; i++) {
        if (dd[i].contains('variableStep') || dd[i].contains('span')) continue;
        let d = dd[i].trim().split(/\s+/);
        if (d[0].startsWith === 'variableStep') continue;
        if (d[0][0] === '#') continue;
        if (isNaN(d[0])) d = d.slice(1);    // assume first token is (for now ignored) chromosome id
        let v = 0;
        if (isNaN(d[0] + d[1] + (d[2] || 0))) {log('unexpected line in wig', fn, i, dd[i]); continue; }

        if (d.length === 2) {
            const p = Math.ceil((d[0] - minid) / wigres);
            v = d[1];
            wigparse1[p] = Math.max(wigparse1[p], v);  // leave range check to typed array rules
        } else if (d.length === 3) {
            const start = Math.ceil((d[0] - minid) / wigres)
            const end = Math.ceil((d[1] - minid) / wigres)
            v = d[2];
            for (let p = start; p <= end; p++)
                wigparse1[p] = Math.max(wigparse1[p], v);  // leave range check to typed array rules
        } else {
            log('unexpected line in wig', fn, i, dd[i]);
        }
        max = Math.max(max, v);

        // we used to assume input monotone increasing p values, but now parse to end of file
    }
    // const stats = getstats(wigsum.filter(x=>x), {short:true})  // fails on nowig

    var wigarr = new Uint8Array(wiglen);
    for (let pp = 0; pp < wiglen; pp++) {
        let v = wigparse1[pp] / max;
        v = Math.round(Math.sqrt(v) * 255);  // sqrt to allow big ones, and *4 arbitrary to fit
        // if (v > 255) {
        //     log('v out of range at', pp, v, 'around', pp * wigres + minid);
        //     v = 255;
        // }
        wigarr[pp] = v;            // for now, just save index, later multiplex
    }

    var texture = newTHREE_DataTextureNamed('wig_'+fn, wigarr, wiglen, 1, THREESingleChannelFormat,
        THREE.UnsignedByteType, undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter, 1);
    texture.needsUpdate = true;
    texture.name = 'wigtex:' + fn;

    uniforms.t_ribbonrad.value = texture;  // >>> maybe not here, but usefule for dynamic change

    var name = fn.replace('.wig', '');
    var bundle = { name, texture, wigarr, wigres, max };
    //uniforms.t_ribbonrad.value = texture;  // <<< temporary, too fixed. now responsibility of caller
    wigs[key] = bundle;
    return bundle;

}

/** set both ribbon colouring and annotation for given bed */
CSynth.bothBed = function(psource) {
    let source = CSynth.getBed(psource);
    CSynth.ribbonBed(source);
    if (typeof source === 'string') {
        CSynth.parseBioMart(undefined)
        // CSynth.parseBioMart.setVisibility(false);
    } else {
        CSynth.parseBioMart(CSynth.current.fullDir + source.filename)
        //CSynth.parseBioMart.setVisibility(true);
    }
}

/** set the ribbon colouring frm given bed */
CSynth.ribbonBed = function(psource) {
    let source = CSynth.getBed(psource);
    if (source && source.texture) {
        uniforms.matrixbed.value = uniforms.t_ribboncol.value = source.texture;
        CSynth.files._activebed = source.beddata;
    } else {
        uniforms.matrixbed.value = uniforms.t_ribboncol.value = undefined;
    }
}

CSynth.Ribbon = function () {
    this.createGUIVR = function () {
        var gui = dat.GUIVR.createX("Ribbon");
        // make sure genes are established
        //if (!('R_radius' in currentGenes)) {
        //currentGenes.R_radius = 8;  // for defaults
        //currentGenes.wigmult = 50;
        //}

        const xx = W.xxx = {
            get diameter() { return G.R_radius * G.nmPerUnit * 2; },
            set diameter(v) { G.R_radius = v / G.nmPerUnit * 0.5; }
        }

        gui.add(W, 'renderMainObject').listen().name('visible').showInFolderHeader();
        CSynth.addColourGUI(gui, CSynth.ribbonBed);
        gui.add(xx, 'diameter', 1, 50).step(1).listen();
        // gui.add(currentGenes, 'R_radius', 1, 100).listen();
        CSynth.addWigGUI(gui);
        // gui.add(currentGenes, 'radTaper', 1, 100).listen();
        guiFromGene(gui, 'ribbonPickWidth').listen();
        guiFromGene(gui, 'ribbonPickExtra').listen();
        guiFromGene(gui, 'ribbonPickRangeExtra').listen();
        guiFromGene(gui, 'ribbonStart').listen();
        guiFromGene(gui, 'ribbonEnd').listen();
        guiFromGene(gui, 'killradwidth').listen();

        // guiFromGene(gui, 'ribdepth');

        return gui;
    }
}

/** create data etc to force a range; use when no suitable contacts, o contains low, num, step (res) */
CSynth.setRange = CSynthsetRange;
async function CSynthsetRange(o) {
    const low = o.low;
    const num = o.num;
    const step = o.step;
    const high = low + step * (num-1);
    // for now, prepare pseudo contacts data and process that
    // this simplifies consistency between processing real contact data and setRange
    const data = [
            [low, low, 1].join('\t'),
            [low, low+step, 1].join('\t'),
            [high, high, 1].join('\t'),
            ""].join('\n');
    const r = await contactsReader(data, ['dummy', low, num, step].join('/') );
    return  r;
}

/** parse and cache the xyz file, check to check numInstances etc (not for extra data eg virus fixed points) */
function xyzReader(data, fn, parseonly = false, all = CSynth.pdball) {
    return CSynth.parseXYZ( {filename: fn, data: data, average: 1}, parseonly, all);
}


function arrayStats(p, c = {}) {
    // measure backbone length and other stats ... todo move to initial reading
    let ds = 0, dmin = 99999, dmax = 0;
    for (let i=1; i < p.length; i++) {
        if (p[1-1] === void 0) continue;
        let d = distxyz(p[i], p[i-1]);  // p[i].distanceTo(p[i-1]); may have xyz but not be Vector3
        ds += d;
        dmin = Math.min(d, dmin);
        dmax = Math.max(d, dmax);
    }
    c.backboneDistance = ds;
    c.backboneMin = dmin;
    c.backboneMax = dmax;
    c.minx = p.map(r=>r.x).reduce((m,v)=>Math.min(m,v));
    c.maxx = p.map(r=>r.x).reduce((m,v)=>Math.max(m,v));
    c.rx = c.maxx - c.minx;
    c.miny = p.map(r=>r.y).reduce((m,v)=>Math.min(m,v));
    c.maxy = p.map(r=>r.y).reduce((m,v)=>Math.max(m,v));
    c.ry = c.maxy - c.miny;
    c.minz = p.map(r=>r.z).reduce((m,v)=>Math.min(m,v));
    c.maxz = p.map(r=>r.z).reduce((m,v)=>Math.max(m,v));
    c.rz = c.maxz - c.minz;
    c.diameter = Math.pow(c.rx * c.ry * c.rz, 1/3);
    return c;
}

/** report various stats based on the current data
see also https://docs.google.com/document/d/1uXDwrxbD1fmC-Va0fEu7DU1H-jgFrBlpX0zw7pxMGlQ/edit# */
CSynth.dataStats = () => {
    let pi = Math.PI;
    let f = (v) => Number(Math.round(v)).toLocaleString()

    // assumptions and basic calculations
    let DNABps = 6e9;
    const unwoundDNA = 2e9;
    const earthCircumference = 40000;  // in km, 40,075 km?
    const helRad = 1;  // helix radius
    const helStep = unwoundDNA / DNABps;  // = 0.3333, close to 0.338;

    const bpvol = pi * helRad * helRad * helStep; // base pair volume

    // calculations
    const minid = CSynth.current.minid;
    const maxid = CSynth.current.maxid;
    const resw = W.res;
    const range = maxid - minid + resw;
    assert (numInstances === range/resw);
    const particles = numInstances;
    const inversePropOfDNA = DNABps / range;
    const scaleToFullDNAbpModel = inversePropOfDNA * resw;
    const fullyUnwoundLength = unwoundDNA / inversePropOfDNA;

    const vol = bpvol * range;
    const fullPackedDiameter = 2 * Math.pow(3*vol/4/pi, 1/3);  // packed diameter if nothing else in volume

    const xyz = CSynth.current.xyzs[0];
    const modelResUnwondLength = xyz ? xyz.stats.backboneDistance : numInstances;
    const packedDiameter = xyz ? xyz.stats.diameter : Math.pow(numInstances, 1/3);
    const modelUnwindRatio = modelResUnwondLength / packedDiameter;
    const unshownUnwind = fullyUnwoundLength / modelResUnwondLength;
    const fullUnwindRatio = fullyUnwoundLength / packedDiameter;

    const scale = G.scaleFactor / renderVR.scale * 1e9;
    const scaleVR = G.scaleFactor / renderVR.scale;


    const r = {minid, maxid, range, resw, particles, inversePropOfDNA, scaleToFullDNAbpModel,
        modelResUnwondLength, fullyUnwoundLength, fullPackedDiameter, packedDiameter, modelUnwindRatio, fullUnwindRatio, unshownUnwind, scale};
    const fr = {minid:f(minid), maxid:f(maxid), range:f(range), res:f(resw), particles:f(particles),
        propOfDNA: '1/'+f(inversePropOfDNA), scaleToFullDNAbpModel: f(scaleToFullDNAbpModel),
        modelResUnwondLength,fullyUnwoundLength:  f(fullyUnwoundLength), fullPackedDiameter, packedDiameter, modelUnwindRatio, fullUnwindRatio, unshownUnwind,
        scale: f(scale), scaleVR, packedDiameterVR: packedDiameter * scaleVR + 'm', modelResUnwondLengthVR: modelResUnwondLength * scaleVR + 'm',
        fullyUnwoundLengthVR: (fullyUnwoundLength * scaleVR / 1000) + 'km',
        fullyUnwoundLengthDNAVR: f(unwoundDNA * scaleVR / 1000) + 'km',
        fullyUnwoundLengthDNAVRE: unwoundDNA * scaleVR / 1000 / earthCircumference + ' timesRoundEarth'
        };
    log ('stats', fr);
    return r;

}

// /** called to make the fog parameters match the camera setup */
// CSynth.fixfog = function() {
//     // ??? do we want this to apply to the matrix
//     let size = 20 * G.scaleFactor;
//     let d = camera.position.length();
//     G.fogstartdist = d - size * 0.1;  // just behind visible front
//     G.foghalfdepth = size * 0.1;
//     G.fogr = G.fogg = G.fogb = 0.01;
//     // G.foghalfdepth = 0; // to turn off
// }

/** stop wasting so much time recomputing matrices.
>>> TODO know casualty is the zoom display on the gui.  The zoom still works */
CSynth.testfix = function(fix=false) {
    V.camscene.traverse(f=>f.matrixAutoUpdate=fix);
    V.nocamscene.traverse(f=>f.matrixAutoUpdate=fix);
}

/** use wig defined by number (later to add name as alternative) */
CSynth.usewig = function(w = undefined) {
    const o = CSynth.current.wigs;
    const ww = o[w];
    if (CSynth.currentWig)
        CSynth.currentWig.scale = G.wigmult;    // save scale of previous wig
    CSynth.currentWig = ww;

    if (w === undefined) {
        uniforms.t_ribbonrad.value = undefined;
    } else if (ww) {
        uniforms.t_ribbonrad.value = ww.texture;
        if (ww.scale !== undefined) G.wigmult = ww.scale;
    } else {
        msgfixerror('usewig', 'cannot find wig for ', w);
        uniforms.t_ribbonrad.value = undefined;
    }
}

// never to be global, consider where to attach ... Maestro.onUnique('preframe', CSynth.fixfog);
var Worker;
/** test worker thread to load contacts */
function testworker(file) {
    const test = {
        dir: 'CSynth/data/Crick/',
        contacts: [
            {filename: 'Mitosis_chrII_rightarm.normMtx.s.txt', shortname: 'Mitosis'},
            {filename: 'Interphase_chrII_rightarm.normMtx.s.txt', shortname: 'Interphase'}],
        beds: ['yeast_chr_II_genes.bed', 'yeast_human_chrII_gene.bed', 'condensin_chrII.bed'],
        etc: ''
    };

    const w = new Worker('csynthWorker.js');
    testworker.last = w;
    w.onmessage = workermessage;
    w.postMessage(['item', test, 'contacts', 0, currentGenes]);
}
function testworkercorrel() {
    const w = new Worker('csynthWorker.js');
    testworker.last = w;
    w.onmessage = workermessage;
    const cc = CSynth.current;
    const ccc0 = cc.contacts[0];
    const cdata = CSynth.contactToDistArray(ccc0.textureData);
    w.postMessage(['correlCD', cdata, springs.getpos()]); //, G.m_alpha, G.m_k, cc.representativeContact,        {contactforcesc: 0}]);
    w.postMessage(['close']);
}
function testworkers(files = lastopenfiles) {
    nomess(false); msgfix.all = true;
    for (let i=0; i < files.length; i++) {
        testworker(files[i]);
    }
}

CSynth._patch = false;
Object.defineProperty(CSynth, 'patch', {
    get: () => CSynth._patch,
    set: v => {if (v) CSynth._patch2 = false; CSynth._patch = v; CSynth.applyContacts();}
});
CSynth._patch2 = false;
Object.defineProperty(CSynth, 'patch2', {
    get: () => CSynth._patch2,
    set: v => {if (v) CSynth._patch = false; CSynth._patch2 = v; CSynth.applyContacts();}
});
CSynth._normalize = false;
Object.defineProperty(CSynth, 'normalize', {
    get: () => CSynth._normalize,
    set: v => {CSynth._normalize = v; CSynth.applyContacts();}
});
CSynth._normalizeAvoid = 1; CSynth._normalizeLoops = 3;
Object.defineProperty(CSynth, 'normalizeAvoid', {
    get: () => CSynth._normalizeAvoid,
    set: v => {const z = CSynth._normalizeAvoid !== v; if (z) {CSynth._normalizeAvoid = v; CSynth.clearTextureVersions(); CSynth.applyContacts();} }
});
Object.defineProperty(CSynth, 'normalizeLoops', {
    get: () => CSynth._normalizeLoops,
    set: v => {const z = CSynth._normalizeLoops !== v; if (z) { CSynth._normalizeLoops = v; CSynth.clearTextureVersions(); CSynth.applyContacts();} }
});

CSynth.clearTextureVersions = function() {
    if (CSynth.current?.contacts) for (const c of CSynth.current.contacts) if (typeof c === 'object') c.textureVersions = {}
}


/** get a texture for contacts, allowing for variants (such as patch) */
CSynth.contactsToTexture = function(contactnum) {
    const contact = CSynth.getContactsZZ(contactnum);
    if (!contact) return undefined;
    if (!contact.textureVersions) {contact.textureVersions = {}; contact.dataVersions = {};}
    const ver = (CSynth._patch ? 'p' : '') + (CSynth._normalize ? 'n' : '') + (CSynth._patch2 ? 'q' : '')
    if (!ver) {
        contact.textureVersions[0] = contact.rawTexture;
        contact.dataVersions[0] = contact.rawTexture.source.data.data;
        return contact.rawTexture;  // original direct path
    }

    // this path allows for patching
    if (contact.textureVersions[ver]) return contact.textureVersions[ver];

    let td = contact.dataVersions[ver] = contact.rawData.slice();
    if (CSynth._patch) td = CSynth.patchmissing(td);
    if (CSynth._normalize) td = CSynth.donormalize(td);
    if (CSynth._patch2) td = CSynth.patchmissing(td);
    const tt = contact.textureType;
    const rn = contact.rn;
    const nt = contact.textureVersions[ver] = newTHREE_DataTextureNamed('contactversion' + ver, td, rn, rn, THREESingleChannelFormat, tt);
    nt.magFilter = nt.minFilter = contact.rawTexture.minFilter;
    nt.needsUpdate = true;
    return nt;
}
/** get a contact structure, make sure the rawTexture is set */
CSynth.getContactsZZ = function(contactnum) {
    const contact = (typeof contactnum === 'number') ? CSynth.current.contacts[contactnum] : contactnum;
    if (!contact) {msgfixerror('getContacts called with no contacts for number', contactnum); return; }
    if (!contact.datad) { log('getContacts called before contact ready'); return; }
    if (contact.rawTexture) return contact;
    let td;
    let n = contact.datad.numInstances;
    if (n > springs.MAXPARTICLES) {
        contact.reduce = Math.ceil(n/ springs.MAXPARTICLES);
        msgfixlog('>' + contact.filename, 'auto reduce', contact.reduce);
    }
    const tt = contact.textureType = contact.textureType || THREE.FloatType;
    const r = contact.reduce;
    const irr = 1/(r*r);
    const rn = contact.rn = Math.round(n / r);

    if (contact.rawData) {  // was if (contact.textureData) {
        td = contact.rawData;
    } else {
        if (!contact.data) return;  // data not ready yet
        const ttdata = tt === THREE.UnsignedByteType ? Uint8Array :
            tt === THREE.FloatType ? Float32Array :
            undefined;
        if (!ttdata) { log('wrong texture type ', contact.textureType, contact.fid); return; }

        const dd = contact.data;
        //const nn = new Array(n).fill(0);  // track counts for each a/b so we can patch later
        // const ii = bp => Math.round(CSynth.getNormalisedIndex(bp) * contact.datad.numInstances);
        // const ii = CSynth.particle4bp;  // broken for expand
        const cdd = contact.datad;
        const ii = bp => (bp - cdd.minid) / cdd.res;
        td = new ttdata(rn * rn);
        contact.nonzused = 0;
        contact.duplicates = 0;
        for (let i = 0; i < dd.length; ) {
            const a = ii(dd[i++]);
            const b = ii(dd[i++]);
            const v = dd[i++];
            if (a < 0 || a >= n || b < 0 || b >= n || a !== Math.floor(a) || b !== Math.floor(b))
                continue;
            contact.nonzused++;
            if (r === 1) {
                if (td[a + n*b] !== 0)
                    contact.duplicates++;
                td[a + n*b] = td[n*a + b] = v;
            } else {
                const ra = Math.floor(a/r);
                const rb = Math.floor(b/r);
                if (ra >= rn || rb >= rn) continue;
                td[ra + rn*rb] = td[rn*ra + rb] += v * irr;
            }
            // nn[a]++; nn[b]++;
        }
        // contact.texture Data = td;
        contact.datad.numInstances = n = rn; // now we have reduced the data the original n is irrelevant
    }

    // prepare counts for patch (either .contacts or .matrix format)
    contact.countStats = function() {
        const nn = new Array(n).fill(0);  // track counts for each a/b so we can patch later
        const vv = new Array(n).fill(0);  // track counts for each a/b so we can patch later
        for (let a = 0; a < n; a++) {
            for (let b = 0; b < n; b++) {
                const v = td[a + n*b];
                if (v >= 0) {
                    nn[a]++;
                    vv[a] += v;
                }
            }
        }
        contact.countsPerParticle = nn;
        contact.totalPerParticle = vv;
        return {countsPerParticle: nn, totalPerParticle: vv};
    }
    // contact.countStats(); // temp


    /** helpers for V2 patch and general use */
    contact.getab = function(a,b) {
        if (a<0 || a>=n || b<0 || b>=n) {
            console.error('contact get bad',a,b);
        } else {
            if (td[a*n+b] !== td[b*n+a])
            console.error('asymmetric',a,b, td[a*n+b], td[b*n+a]);
            return td[a*n+b];
        }
    }

    contact.setab = function(a,b,v) {
        if (a<0 || a>=n || b<0 || b>=n)
            log('contact set bad',a,b);
        else
            td[a*n+b] = td[b*n+a] = v;
    }

    contact.setRowCol = function(a, v) {
        for (let b=0; b < n; b++)
            contact.setab(a, b, v);
    }

    contact.diagonal = function(off=0) {
        const rr = new Array(n-off);
        for (let i=0; i<n-off; i++) rr[i] = contact.getab(i,i+off);
        return rr;
    }

    /** set all backbone values below threshold to given value v
     * Note that special -999 values will almost always be set.
     * For very high threshold, all backbone will be set
     */
    contact.setBackbone = function(v = -999, thresh = 0) {
        for (let a = 0; a < numInstances-1; a++) {
            const b = a+1;
            const x = contact.getab(a, b);
            const y = contact.getab(b, a);
            if (x <= thresh) td[a*n+b] = v;
            if (y <= thresh) td[b*n+a] = v;
            // if (x !== y) console.error('warning, asymmetric backbone', a, a+1, x, y);
        }
        contact.rawTexture.needsUpdate = true;
    }


    // find which particles are not connected to either neighbour
    contact.noNeighbour = [];
    for (let a = 1; a < n-1; a++) {
        if (contact.getab(a, a-1) <= 0 && contact.getab(a, a+1) <= 0) {
            contact.noNeighbour.push(a);
        }
    }

    if (contact.noNeighbour.length > contact.numInstances * 0.5) {
        msgfixlog('noNeighbour', `not using neighbour zombies, too many disconnected particles:
        ${contact.noNeighbour.length} of ${contact.numInstances}`)
    } else if (contact.noNeighbour.length === 0){
        msgfixlog('noNeighbour', 'all particles connected to neighbour');
    } else {
        contact.noNeighbour.forEach(a => contact.setRowCol(a,-999));
        msgfixlog('noNeighbour', `set disconnected particles to zombies: ${contact.noNeighbour.length} of ${contact.numInstances}`)
    }
    // if (contact.patch) CSynth.patchmissing(td); // use CSynth.patch flag instead

    // contact.zombies = [];

    // use groups here to prevent joins over boundaries
    if (contact.groups) {
        for (let gx in contact.groups) {
            const g = contact.groups[gx];
            //?contact.setRowCol(g.startid, -999);
            //contact.setab(g.startid, g.startid+1, 1);
            contact.setab(g.startid, g.startid-1, -9898);
            //?contact.setRowCol(g.endid, -999);
            //contact.setab(g.endid, g.endid-1, 1);
            contact.setab(g.endid, g.endid+1, -9898);
        }
        CSynth.breakGroups();   // break the visuals as well as the model
    }
    /***/


    /*****/
    /****/

    /***
    // patch missing data, copy contacts from contacts for a 'source' particle
    // for first few source is first non-0, for rest source is previous
    if (!searchValues.nopatch) {
        let source = nn.findIndex(c=>c);    // first non-0 particle
        for (let a = 1; a < n; a++) {
            if (nn[a] === 0) {
                for (let b=0; b < n; b++) {
                    const v = td[source + n*b];
                    td[a + n*b] = td[n*a + b] = v;
                }
            }
            source = a;
        }
    }
    /****/

    contact.meanv = contact.mean = td.reduce((c,v)=>c+Math.max(v,0), 0) / td.length;
    contact.rawTexture = newTHREE_DataTextureNamed('contactraw', td, rn, rn, THREESingleChannelFormat, tt);
    contact.rawData = td;
    // added sjpt 12/11/18 for expand !== 1, and 4 feb 19 for check
    // Also will be reset to linear retrospectively if CSynth.setParticlesDyn used.
    const f = contact.expand !== 1 || !CSynth.current.check ? THREE.LinearFilter : THREE.NearestFilter;
    contact.rawTexture.magFilter = contact.rawTexture.minFilter = f;
    contact.rawTexture.needsUpdate = true;
    return contact;
}
// note sjpt 12/11/18
// In principle, it should be better to use linear filter.
// More difficult to get right with special case values,
// and does not seem to give significantly different results in other areas so leave as false for now.
// sjpt 22/01/19
// Linear is much better when using expand, so replaced test for CSynth.UseLinearContactFilter above
// with test for contact.expand !== 1
// CSynth.UseLinearContactFilter = false;

/** patch the region after the start of a boundary from first non-0 in right region
CSynth.patchBoundaryNeedsMoreStats = function(contact, start) {
    let n = contact.numInstances;
    let td = contact.textureData;
    if (!td) return onframe(() => CSynth.patchBoundary(contact, start));
    for (let source = start; source < n; source++) {
        if (contact.countsPerParticle[source]) {
            for (let a = start; a < source; a++) {  // patch a
                for (let b=0; b < n; b++) {         // for all items
                    const v = td[source + n*b];
                    td[a + n*b] = td[n*a + b] = v;
                }
            }
            if (contact. _ texture) contact. _ texture.needsUpdate = true;
            return;
        }
    }
}
/*** */

/** patch the region after the start of a boundary with solid contacts
CSynth.patchBoundaryPending = function(contact, start, nn=1) {
    return;
    let n = contact.numInstances;
    let td = contact.textureData;
    if (!td) return onframe(() => CSynth.patchBoundary(contact, start));
    for (let a = start; a < start+nn; a++) {
        td[a * n + a + 1] = td[(a+1) * n + a] = 1;
        td[a * n + start] = td[start * n + a] = 0.1;
    }
    if (start !== 0) td[start * n + start-1] = td[(start-1) * n + start] = 0;
}
/*** */

/** get a texture for xyzs */
CSynth.xyzsToTexture = function(xyznum) {
    const xyz = (typeof xyznum === 'number') ? CSynth.current.xyzs[xyznum] : xyznum;
    if (!xyz) {
        if (G.xyzforce !== 0) msgfixerror('xyzsToTexture called with no xyzs for number', xyznum);
        return;
    }
    if (xyz.texture) return xyz.texture;
    const n = xyz.numInstances ?? xyz.length;
    const tt = THREE.FloatType;

    const td = new Float32Array(n * n);
    const dd = Array.isArray(xyz) ? xyz : xyz.coords;
    const dist= (vi,vj) => Math.sqrt((vi.x-vj.x)**2 + (vi.y-vj.y)**2 + (vi.z-vj.z)**2);
    for (let i = 0; i < n; i++) {
        for (let j = i+1; j < n; j++) {
            const d = td[i + n*j] = td[n*i + j] = dist(dd[i], dd[j]);
        }
    }

    xyz.textureData = td;
    xyz.mean = td.reduce((c,v)=>c+v, 0) / td.length;
    xyz.texture = newTHREE_DataTextureNamed('xyzstext_'+xyznum, td, n, n, THREESingleChannelFormat, tt);
    xyz.texture.needsUpdate = true;
    return xyz.texture; // vs code
}

/** set the ranges for contacts used to map contact strength -> target distance * /
CSynth.UNUSEDsetContactRange = function() {
    const cc = CSynth.current;
    if (!cc.contacts[0]) return;
    const dd = cc.contacts[0].data.filter((v,k) => k%3 === 2).map(v=>Math.log(v));
    const ss = getstats(dd, {short: true});
}
**/

/** make a distance texture from xyz values */
CSynth.xyzToTexture = function(xyznum) {
    const xyz = typeof xyznum === 'number' ? CSynth.current.xyzs[xyznum] : xyznum;
    if (!xyz) {
        if (G.xyzforce !== 0) msgfixerror('xyzsToTexture called with no xyzs for number', xyznum);
        return;
    }
    if (xyz.texture) return xyz.texture;
    if (!xyz.coords) return;  // we will try again later as needed
    const n = xyz.numInstances;

    const td = new Float32Array(n * n);//
    const dd = xyz.coords;
    const dist= (i,j) => Math.sqrt((i.x-j.x)**2 + (i.y-j.y)**2 + (i.z-j.z)**2);
    for (let i = 0; i < n; i++ ) {
        for (let j = i+1; j < n; j++ ) {
            td[i + n*j] = td[n*i + j] = dist(dd[i], dd[j]);
        }
    }
    xyz.textureData = td;
    xyz.texture = newTHREE_DataTextureNamed('xyztext_'+xyznum, td, n, n, THREESingleChannelFormat, THREE.FloatType);
    xyz.texture.needsUpdate = true;
    return xyz.texture;

}

// CSynth.markerNames = ['user0', 'user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7'];
CSynth.markers = new Array(PICKUSER);

CSynth.clearMarkers = () => CSynth.markers.forEach((v,i,a) => CSynth.setMarker(i, -1, '???'));
/** set a marker , id=0..7 -ve to autoassign, bp is base pair number, -ve to remove marker */
CSynth.setMarker = function(id, bp, name, type = '?') {
    id = +id;
    if (id < 0) {
        id = CSynth.markers.findIndex(m => m && m.bp === bp);
        if (id < 0)
            id = id = CSynth.markers.findIndex(m => !m);
        if (id < 0)
            {msgfixerror('marker', 'no space to allocate marker in CSynth.setMarker', bp, name); return; }
    }
    if (id < 0 || id > PICKUSER || isNaN(id)) {msgfixerror('marker', 'bad id to CSynth.setMarker', id); return; }

    if (bp < 0) {
        userpicks[id] = 999;
        delete CSynth.markers[id];
        return;
    }
    if (bp.bp !== undefined) bp = bp.bp;
    if (bp.partid !== undefined) bp = bp.partid;
    if (name === undefined)  name = 'bp_' + bp;
    const bpn = CSynth.getNormalisedIndex(bp);
    if (bpn < 0 || bpn > 1) log(`warning, bp ${bp} to CSynth.setMarker out of range ${CSynth.current.minid}..${CSynth.current.maxid}`)
    userpicks[id] = bpn;
    CSynth.markers[id] = {name, id, bp, bpn, type};
    return id;
}

CSynth.targetDistances = {}
// set target distance between bp a and b, d is array for each contact map
CSynth.setTargetDistance = function(a, b, d) {
    const ida = CSynth.setMarker(-1, a);
    const idb = CSynth.setMarker(-1, b);
    CSynth.targetDistances[a + ' ' + b] = d;  // nb format to match pairkey in showPickDist
}

// use target distances as springs
// k < 0 to clear
CSynth.useTargetDistances = function(k = 1 / G.nmPerUnit, n = 3, step = 2) {
    const td = CSynth.targetDistances;
    const op = k>=0 ? springs.addspring : springs.removespringF;
    for (let p in td) {
        const r = p.split(' ');
        const p0 = Math.round(CSynth.particle4bp(r[0]));
        const p1 = Math.round(CSynth.particle4bp(r[1]));
        const dist = td[p][CSynth.current.selectedSpringSource] * k;
        for (let pp0 = p0 - n * step; pp0 <= p0 + n * step; pp0 += step) {
            const s0 = 1 - Math.abs(pp0 - p0) / (n+1) / step;
            for (let pp1 = p1 - n * step; pp1 <= p1 + n * step; pp1 += step) {
                const s1 = 1 - Math.abs(pp1 - p1) / (n+1) / step;
                op(pp0, pp1, dist, s0 * s1);
            }
        }
    }
}

/** set ribbon selection marker in slot id, or matrix selection markers in slots id, id+1
 * If neither ribbon nor matrix selected, clear marker in slot id
 * If id is -ve slots will be allocated automatically
 */
CSynth.setMarkerFromSelection = function(id) {
    const p = CSynth.picks['g-matrix1'];
    const r = CSynth.picks['g-ribbon'];
    if (p) {
        CSynth.setMarker(id, p, undefined, 'matrix1');
        CSynth.setMarker(id+1, CSynth.picks['g-matrix2'], undefined, 'matrix2');
    } else if (r) {
        CSynth.setMarker(id, r, undefined, 'ribbon');
    } else {
        CSynth.setMarker(id, -1);
        // CSynth.setMarker(id+1, -1);
    }
}

/** toggle on/off a continuous test */
function workerRoundTrip() {
    if (!testworker.last) {  // start the test
        const w = testworker.last = new Worker('csynthWorker.js');
        w.onmessage = workermessage;
        Maestro.on('postframe', workerRoundTrip.test);  // fire workerRoundTrip.test() near the end of each frame
    } else {
        testworker.last.terminate();
        delete testworker.last;
        Maestro.remove('postframe', workerRoundTrip.test); // stop firing workerRoundTrip.test()

    }
}
/** function to call each frame, will request an echo from the worker with a timestamp */
workerRoundTrip.test = function() {
    testworker.last.postMessage(['echo', performance.now()]);
}

/** worker message callback, not inner function to testworker so it is easier to debug */
function workermessage(e) {
    workermessage.last = e;
    if (e.data[0] === 'details') {
        W.xxdetails = e.data[1];
        W.newcsynthcurrent = e.data[2];
        W.xxall = e;
        log('details recovered and saved in xxall, xxdetails and newcsynthcurrent, numInstances', W.xxdetails.numInstances);
    } else if (e.data[0] === 'echo test') {
        const et = performance.now();  // <<<< this is the echo with timestamp
        const st = e.data[1];           // so measure new time and log the difference
        log('echo time ', et-st);
    } else if (e.data[0] === 'logmessage') {
        msgfix('>' + e.data[1], e.data[2]);
    } else if (e.data[0] === 'contacts result') {
        const x = {}; copyFrom(x, e.data[1]); x.data = 'DATA';
        log('contacts result', x, e.data[2]);
    } else if (e.data[0] === 'contacts springs') {
        log('contacts springs recovered');
    } else {
        log('worker comment', e.data);
    }
}

CSynth.relativeCam = 3;
window.addEventListener('vrdisplaypresentchange', function() {
    if (renderVR.invr())
        G._camz /= CSynth.relativeCam;
    else
        G._camz *= CSynth.relativeCam;
}, false);

/** load a fixed skeleton, eg for York virus to bind to */
CSynth.loadFixedPoints = function(fid, maxn=99999) {
    // load up the fixed point data
    const xyzd = posturi(fid);
    const xyzv = xyzReader(xyzd, fid, true, true);  // n.b. true for parse only, true for all points
    const c = xyzv.coords;
    const b = springs.reserve('fixedPoints', c.length);      // make reservation

    // apply fix springs to fixed points
    const usen = Math.min(maxn, c.length);
    for (let i=0; i < usen; i++) {
        springs.setfix(b + i, c[i]);
    }
    CSynth.current.fixedPointsData = xyzv;
    CSynth.current.numFixedPoints = usen;

    onframe(() => {
        // show fixed points as spheres
        //VH.SphereParticles.setInstances(usen, numInstances);
        //V.rawscene.sphereparticles.visible = true;
        CSynth.drawFixedSpheres();
        Maestro.on('preframe', CSynth.rayToFixed);
    });
}


/** load extra contacts from main strand to fixed points and apply them */
CSynth.loadExtraContacts = function(fid) {
    const cc = CSynth.current;
    const rawd = posturi(fid);
    const lines = rawd.split('\n');
    const xc = CSynth.current.extraContacts = [];
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].split('#')[0].trim().split('-');  // allow for comments and any whitespace
        if (l.length !== 4 && l.length !== 6) continue;
        const id = l[0];
        const bpa = +l[1];
        const bpb = +l[2];
        const bp = +FIRST(l[4], Math.floor( (bpa+bpb)/2));
        let fpos = +l[3];   // index into extras file
        let flag = FIRST(l[5], '?').trim();

        const fposx = fpos + numInstances;  // index into particles array
        const details = {id, bp, bpa, bpb, fpos, fposx, flag};
        xc.push(details);
        CSynth.current.strandContacts[fpos] = details;
    }
    CSynth.extraContactsToBeds(xc);
}
CSynth.extraContactsType = 1;

/** force the springs to use the extra contacts */
CSynth.useExtraContacts = function(xc = CSynth.current.extraContacts, xstr = 1, xlen = 0, xpow = 0, xtype = CSynth.extraContactsType) {
    if (!xc) return;
    xc.forEach(c => {
        const bad = springs.addspring(c.bp, c.fposx, xlen, xstr, xpow, xtype);
        if (bad) log('cannot force spring for', c.bp, c.fposx, xlen, xstr);
    })
}

/** override the centre (NOCENTRE=false) option
 * patch 21 Feb 2019 while we decide how best to arrange it
 * Working towards being able to incoprprate and register simple things with no special shader.
 * loadExtraPDB() below is first example.
 */
var scaleSmoothGPU, scaleDampTarget1, scaleDampTarget2;
CSynth.__overrideCentre = function() {
    if (!uniforms.scaleDampTarget) return;
    const ff = new Float32Array(4); // will initialize to 0 to ensure no panning
    ff[3] = 1;  // not used as CSynth is NOSCALE
    const unitscale = newTHREE_DataTextureNamed('unitscale', ff,1,1, THREE.RGBAFormat, THREE.FloatType);
    unitscale.needsUpdate = true;
    uniforms.scaleDampTarget.value = unitscale;
    if (!CSynth.__overrideCentre.savescaleSmoothGPU) // just in case we want it back
        CSynth.__overrideCentre.savescaleSmoothGPU=scaleSmoothGPU;
    scaleSmoothGPU = nop;                           // so no attempt made to compute scaleDampTarget1
    scaleDampTarget1.main.texture = unitscale;      // and if they get used they are safe
    scaleDampTarget2.main.texture = unitscale;
}





/** test loading for York, assume contacts already loaded */
CSynth.yorktest = function(testnum = 99999) {
    CSynth.loadFixedPoints('CSynth/data/yorkstudents/bind60.xyz', testnum);
    CSynth.loadExtraContacts('CSynth/data/yorkstudents/test.xcontacts');
}

CSynth.deleteIdbDatabase = function() {
    if (!indexedDB) return CSynth.badIndexedDB('indexedDB not available');
    var request = indexedDB.deleteDatabase("CSynth");
    return new Promise( (resolve, reject) => {
        request.onerror = function(event) {
            msgfixlog('deleteallcache', 'delete database of cached CSynth data failed');
            reject(new Error('failed to delete database'));
        };
        request.onsuccess = function(event) {
            msgfixlog('deleteallcache', 'database of cached CSynth data deleted');
            resolve('database deleted OK');
        };
    });
}

CSynth.deleteIdbCache = function(key) {
    return CSynth.setIdbCache( {key}, true);
}

/** make sure indexedDB.open works even on Edge */
CSynth.indexedDBOpen = function(dbname, ver) {
    let ret;
    // test needed as Edge just hangs if second argument of undefined is given
    if (CSynth.idbCacheVer === undefined)
        ret = indexedDB.open(dbname);
    else
        ret = indexedDB.open(dbname, ver);
    return ret;
}

CSynth.idbCacheVer = undefined;
CSynth.setIdbCache = function(_contact, _delete = false) {
    const opMessage = (_delete ? ' delete ' : ' set ') + _contact.key;
    if (!writecache && !_delete) return Promise.resolve();
    CSynth.objectSavePending = true;
    if (!indexedDB) return CSynth.badIndexedDB('indexedDB not available');
    var request = CSynth.indexedDBOpen("CSynth", CSynth.idbCacheVer );
    const contact = {};
    copyFrom(contact, _contact);
    delete _contact.format;
    log('setIdbCache request set ', contact.key);
    return new Promise( (resolve, reject) => {
        const iresolve = r => {
            CSynth.objectSavePending = false;
            msgfixlog('setIdbCache', 'success', opMessage,  r);
            resolve(r);
        }
        const ireject = r => {
            msgfixlog('setIdbCache ERROR', opMessage, '<br>', r);
            CSynth.objectSavePending = false;
            quietReject(reject,new Error(r));
        }

        request.onerror = function(event) {
            CSynth.badIndexedDB();
            ireject("Why didn't you allow my web app to use IndexedDB?!");
        };

        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore("contacts", { keyPath: "key" });
            // Use transaction oncomplete to make sure the objectStore creation is finished before adding data into it.
            // or rather for test we will add data later
            //objectStore.transaction.oncomplete = function(event) {
            //}
            }

        request.onsuccess = function(event) {
            var db = event.target.result;
            let putrequest;

            const transaction = db.transaction(["contacts"], "readwrite");
            transaction.oncomplete = () => iresolve('saved cache complete');
            transaction.onabort = () => ireject('saved cache aborted');
            transaction.onerror = (evt) => {
                //const srequest = request;       // help debugger
                //const stransaction = transaction;
                // src should === putrequest?
                const src = evt.target;
                ireject('transaction.onerror\n' + src.error.message);
            }
            const contactsObjectStore = transaction.objectStore("contacts");
            if (contact.key) {  // not for drag/drop
                log('DB@ put ', contact.key);
                try {
                    if (_delete)
                        putrequest = contactsObjectStore.delete(contact.key);
                    else
                        putrequest = contactsObjectStore.put(contact);
                    // CSynth.objectSavePending = false;
                } catch (e) {
                    ireject('contactsObjectStore error thrown:' + e);
                }
            }
        };
    });
};

CSynth.badIndexedDB = function(reject) {
    msgfix('indexedDB', `indexedDB not available (are you incognito/private mode)
    <br>This will prevent caching and may slow down data load and startup.`);
    usecache = writecache = false;
    if (reject) return Promise.reject(reject);
}

CSynth.cached = {};
/** get a key from our cache, if not ok just return resolved promise of error string */
CSynth.getIdbCacheOK = async function(key) {
    let r ='pending';
    while (true) {
        try {
            r = await CSynth.getIdbCache(key);
        } catch (e) {
            console.error('CSynth.getIdbCacheOK', key, 'error', e);
            return '';
        }
        if (r !== 'pending') return r;
    }
    // return CSynth.getIdbCache(key).then(x => Promise.resolve(x), x => Promise.resolve(x));
}

/** get a key from our cache and return as promise resolve, if not ok reject */
CSynth.getIdbCache = function(key) {
    if (!indexedDB) return CSynth.badIndexedDB('indexedDB not available');
    var request = CSynth.indexedDBOpen("CSynth", CSynth.idbCacheVer);
    CSynth.cached[key] = 'pending';
    return new Promise((resolve, reject) => {
        const iresolve = r => {
            msgfixlog('getIdbCache', key, 'transaction resolved', typeof r === 'string' ? r : typeof r);
            CSynth.cached[key] = r;
            resolve(r);
        }
        const ireject = r => {
            CSynth.cached[key] = 'rejected: ' + r;
            msgfixlog('getIdbCache transaction ERROR', key, '<br>', r);
            // quietReject(reject,new Error(r));
            quietReject(reject, r);
        }

        request.onerror = function(event) {
            CSynth.badIndexedDB();
            // CSynth.clearCacheContent(key); // funciton does not exist
            ireject("Why didn't you allow my web app to use IndexedDB?!");
        };

        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore = db.createObjectStore("contacts", { keyPath: "key" });
            CSynth.cached[key] = 'created/upgraded';
            iresolve('created/upgraded');
            }

        request.onsuccess = function(event) {
            var db = event.target.result;

            const transaction = db.transaction(["contacts"], "readwrite");
            const contactsObjectStore = transaction.objectStore("contacts");
            const gos = contactsObjectStore.get(key);
            gos.onsuccess = function(e) {
                const r = e.target.result;
                try {
                    // experiment on Chrome indicates undefined returned if key not present
                    //  (agrees with https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/get)
                    // and null returned if key present but invalid in some way. sjpt 6/11/18
                    // with no exceptions in either case
                    if (r === null || r === undefined) {
                        const m = msgfixlog(key, 'encountered empty cache value');
                        // CSynth.deleteIdbCache(key);  // ? should we await.
                        return ireject(m);
                    }
                    CSynth.cached[key] = e.target.result;
                    log('get complete ok', key);
                } catch (ee) {
                    const m = log('get complete but failed', ee);
                    CSynth.cached[key] = m;
                    return ireject('gos.onsuccess error' + ee);
                }
                iresolve(r);
            }
            gos.onerror = function(e) { ireject('gos.onerror: ' + e); }
        };
    });
};


/** query the contacts and make list, if show then output as well */
CSynth.queryCacheContacts = function(show=false) {
    if (!indexedDB) return CSynth.badIndexedDB('indexedDB not available');
    var request = CSynth.indexedDBOpen("CSynth", CSynth.idbCacheVer);
    request.onerror = function(event) {
        CSynth.badIndexedDB();
    };

    request.onsuccess = function(event) {
        var db = event.target.result;
        const transaction = db.transaction(["contacts"]);
        const contactsObjectStore = transaction.objectStore("contacts");

        contactsObjectStore.openCursor().onsuccess = function(cevent) {
            var cursor = cevent.target.result;
            if (cursor) {
                const key = cursor.key;
                if (show) {
                    const v = cursor.value;
                    if (v.data && v.data.slice) v.data = v.data.slice(0, 10) + ' ... ' + v.data.length
                    log(key, v);
                }
                if (!(key in CSynth.cached)) CSynth.cached[key] = 'available';
                cursor.continue();
            } else {
                log("No more entries!");
            }
        }
    }
}
// xxx = indexedDB.deleteDatabase('CSynth'); xxx.onerror = (e => log('error', e)); xxx.onsuccess = (e => log('delete ok', e))

// make synthetic text for a bed
CSynth.makeBed = function(b) {
    if (!b.step) b.step = b.range/10;
    const step = b.step;
    const id = '!'; // temp for groups not handled yet b.id || 'id';
    const s = [];
    let l = b.minid;
    for (let h = l+step; l < b.maxid; h += step) {
        s.push([id, l, h, 'SY'+l].join('\t'));
        l = h;
    }
    return s.join('\n');
}

CSynth.showContacts = function(td, a, ar=3, b=a, br=ar) {
    if (typeof td === 'number') td = CSynth.current.contacts[td];
    if (td.textureData) td = td.textureData;
    a = Math.round(a);
    ar = Math.round(ar);
    b = Math.round(b);
    br = Math.round(br);
    const n = Math.sqrt(td.length);
    const x = [];
    for (let i = a-ar; i <= a + ar; i++) {
        const y = [];
        for (let j = b-br; j <= b + br; j++) {
            let f = format(td[i+j*n], 6);
            if (i === j) f = `<yellow>${f}</yellow>`;
            else if (i === a) f = `<green>${f}</green>`;
            else if (j === b) f = `<red>${f}</red>`;
            y.push(f);
        }
        x.push(y);
    }
    msgfix(`contacts ${a} ${b}`, `${a-ar} ${a+ar} ${b-br} ${b+br} ${array2Table(x)}`);
}

// edge does not support TextDecoder.  We only want very limited function
if (!TextDecoder) {
    TextDecoder = function(code) {
        this.decode = function(a) {
            const v = new Uint8Array(a);
            const r = v.reduce((s,x)=>s+=String.fromCharCode(x), '');
            return r;
        }
    }
}


CSynth.randpos = function(k = CSynth.referenceSize * 0.07, seedv = CSynth.randpos.seed || frametime ) {
    const r = () => random() - 0.5;
    let x=0, y=0, z=0, sx = 0, sy = 0, sz = 0;

    seed(seedv);
    for (let i=0; i<numInstances; i++) {
        x += r(); y += r(); z += r();
        sx += x; sy += y; sz += z;
    }
    sx /= numInstances; sy /= numInstances; sz /= numInstances;

    x=0; y=0; z=0;
    seed(seedv);
    for (let i=0; i<numInstances; i++) {
        x += r(); y += r(); z += r();
        springs.setfix(i, (x-sx) * k, (y-sy) * k, (z-sz) * k);
    }
    springs.finishFix();
}
CSynth.randpos.seed = 0;    // set to non 0 for fixed seed


/**  use the array (eg from hilbert or twist), pull may be true or 'pull' for pullsprings, false, undefined, etc 'fix' for fixsprings, always return array */
CSynth.usedata = function(arr, num = arr.length, pull) {
    if (!pull) pull = 'fix';        // false or undefined etc
    if (pull === true) pull = 'pull';
    if (pull === 'pull') {
        for (let i=0; i<num; i++) springs.addpull(i, arr[i]);
    } else if (pull === 'fix') {
        for (let i=0; i<num; i++)   springs.setfix(i, arr[i]);
        springs.finishFix();
    }
    return arr;
}

/**  make hilbert curve, pull may be true or 'pull' for pullsprings, false or 'fix' for fixsprings, otherwise return array
if fill is true the full curve is sampled to fill space with less regular form */
CSynth.hilbert = function(sc = 1, num = numInstances, cen = vec3(), pull=false, fill = false) {
    // 4 -> 64, 8->512,
    let ox,oy, oz, r, nnum;
    if (num[0]) {
        nnum = num[0] * num[1] * num[2];
        const k = num ** (1/3);
        ox = (num[0]-1)/2 - cen.x/sc, oy = (num[1]-1)/2 - cen.y/sc, oz = (num[2]-1)/2 - cen.z/sc;
        r = Array.from(gilbert3d(...num));
    } else {
        nnum = num;
        const k = num ** (1/3);
        const o = (k-1)/2;
        ox = o - cen.x/sc, oy = o - cen.y/sc, oz = o - cen.z/sc;
        r = hilbertC(k);
    }
    const arr = [];
    const rat = fill ? r.length / nnum : 1;
    for (let i=0; i<nnum; i++) {
        const ii = Math.round(i * rat);
        const {x,y,z} = r[ii];
        arr[i] = VEC3(sc*(x-ox), sc*(y-oy), sc*(z-oz));
    }
    return CSynth.usedata(arr, num, pull);
    // springs.reCentre();  // use -o above, attempt to read spring positions back too early on initialization otherwise
}

/** make a circle in x,y, rz is scale of random z value */
CSynth.circle = function({sc = 1, rz = 0.01, num=numInstances} = {}) {
    for (let i=0; i<num; i++) {
        const a = 2 * Math.PI * i / num;
        springs.setfix(i, sc*Math.cos(a), sc*Math.sin(a), sc*rz*(Math.random() - 0.5));
    }
    springs.finishFix();
}

/** make a twist, helix of rad r, twists n, bent into big circle of radius R
 * pull may be true or 'pull' for pullsprings, false or 'fix' for fixsprings, otherwise return array
 */
CSynth.twist = function({sc = 1, R = 1, r = 0.5, n = 17, num=numInstances, cen = vec3(), pull = false} = {}) {
    const arr = [];
    for (let i=0; i<num; i++) {
        const a = 2 * Math.PI * i / num;
        const b = n * 2 * Math.PI * i / num;
        const y1 = R + r * Math.sin(b), z1 = r * Math.cos(b);
        arr[i] = VEC3(sc * y1 * Math.cos(a) + cen.x, sc * y1 * Math.sin(a) + cen.y, sc*z1 + cen.z);
    }
    return CSynth.usedata(arr, num, pull);
}


/** random kick of given particle, or of all selected particles if none given */
CSynth.kick = function(bv=1, item=undefined, w=10) {
    const v = bv * G.backboneScale;
    const P = CSynth.picks || [];
    if (item === undefined) {
        let done = false;
        for (let i=0; i < PICKNUM; i++)
            if (P[i]) {
                CSynth.kick(v, P[i].partid, w);
                done = true;
            }
        if (done) return;
        item = 0; w = 1e20;
    }
    const oos = springs.getpos();
    if (oos.length === 0) return;
    for (let i=Math.max(item-w, 0); i < Math.min(item+w, numInstances-1); i++) {
        const oo = oos[i];
        const r = () => v * (Math.random()-0.5);
        springs.setfix(i, oo.x + r(), oo.y + r(), oo.z + r());
    }
    springs.step(4);
    for (let i=Math.max(item-w, 0); i < Math.min(item+w, numInstances-1); i++) {
        springs.removefix(i);
    }
}

/** work out a bed for no gap regions
 * todo: integrate better, use zombies?
 */
CSynth.nogapbed = function(ccc) {
    const cc = CSynth.current;
    if (typeof ccc === 'number') ccc = cc.contacts[ccc];
    const s = [];
    let seg=0;
    let start = 0;
    let flag = false;
    for (let i=1; i<numInstances; i++) {
        const nflag =(ccc.getab(i, i-1) < 0);
        if (nflag !== flag) {
            if (nflag) // switch to blank region
                s.push(['!', CSynth.bp4particle(start), CSynth.bp4particle(i), 'seg' + (seg++)].join('\t'));
            else
                start = i;  // start new blank region
        }
        flag = nflag;
    }
    return s.join('\n');
}

// prepare q wig-like texture for
// ??? registration ???
// it classifies particles according to
//    good: connected to neighbour
//    edge: good, but neighbour is bad
//    bad: not connected to neightbour
//
// runs in two modes switched by ty
// if ty is set then it generates 1, 0, -1 (for diameter 0, wigmult required diameter)
//   should go to point at each edge particle
// if ty not set it generates 0, 0, NaN ( for 'standard' diameter)
//   sharp cutoff at edge particles
CSynth.nogapwig = function(ccc=0, ty=undefined) {
    const vals = ty ? [0, 0, 0/0] : [1, 0, -1];
    const [ good, edge, bad ] =  vals;

    const cc = CSynth.current;
    if (typeof ccc === 'number') ccc = cc.contacts[ccc];
    let arr = new Float32Array(numInstances);
    arr[0] = good;
    arr[numInstances-1] = good;
    for (let i=1; i<numInstances-1; i++) {
        // arr[i] = good; // till proved otherwise
        // nflag will be 0 good, 1 edge, 2 bad
        const nflag = +(ccc.getab(i, i-1) < 0) + +(ccc.getab(i, i-1) < 0);
        arr[i] =  vals[nflag];
        //if (nflag) {  // this is bad
        //    arr[i] = bad; // till proved otherwise
        //    if (arr[i-1] === 1) arr[i-1] = edge;
        //} else {
        //    if (arr[1-1 === -1])  arr[i-1] = edge;
        //}
    }
    const wigtext = CSynth.nogapwig.texture = newTHREE_DataTextureNamed('wig', arr, numInstances, 1, THREESingleChannelFormat,
        THREE.FloatType, undefined,
        THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.NearestFilter, THREE.NearestFilter, 1);
    wigtext.needsUpdate = true;

    uniforms.t_ribbonrad.value = wigtext;
}

// get basic summary information for CSynth object
CSynth.summary = function(o = CSynth.current) {
    if (!o) return 'CSynth.summary no data';
    const subs = 'contacts xyzs beds wigs'.split(' ');
    const r = {};
    for (let x in o) {
        const ox = o[x];
        if (typeof ox === 'number' || (typeof ox === 'string' && ox.length < 30))
            r[x] = ox;
        if (subs.includes(x))
            r[x] = ox.map( item => CSynth.summary(item));
    }
    return r;
}

// get CSynth load files
CSynth.getAllFiles = async function(dir, ftlist='.js') {
    if (!dir) dir = startscript.includes('csynthstatic') ? '/csynthstatic/data' : 'CSynth/data';
    if (typeof ftlist === 'string') ftlist = [ftlist];
    const r = [];
    const list = await readdirAsync(dir);
    let n = 0;    // recursicve number of actual files
    let nd = 0;    // recursicve number of directories
    for (let f in list) {
        const lf = list[f];
        if (lf.isDir) {
            const [nn, xxx, nnd] = await CSynth.getAllFiles(dir + '/' + f)
            n += nn;
            nd += nnd;
            nd++;
            if (nn !== 0) r.push(xxx);
        } else if (ftlist.includes(getFileExtension(f)) || ftlist === '*') {
            r.push(`<a href="${location.origin + location.pathname + '?startscript=' + dir + '/' + f}">${f}</a>
            <span class="help">Click to load this file in current CSynth session
            <br>Ctrl-click to load new CSynth with this file in this tab
            <br>Alt-click to load new CSynth with this file in new tab
            <br>&emsp;(may not work if popups blocked)</span>`);
            n++;
        }
    }
    return [n, `<span class="files_dir">${dir}</span>
        <span class="help">Click to fold/unfold</span>`
    + '<ul style="display:none;"><li>' + r.join('</li><li>') + '</li></ul>', nd];
}

CSynth.msgAllFiles = async function(f, tidy=false) {
    if (tidy) {
        W.startscreen.style.display='none';
        msgfix.killMost();
    }

    msgfix('fff');
    const ff = (await CSynth.getAllFiles(f))[1]
    msgfix.force();

    msgfix('fff',
        `<div onclick="CSynth.getAllFiles.click(event)">
        <div>
        ${ff}
        </div></div>`
    );
    msgfix.force();
}

CSynth.getAllFiles.click = function (e) {
    const s = e.target;
    if (s.tagName === 'A') return;  // already handled by <a> link
    let path = s.dataset.path;
    if (path) {
        if (path.startsWith('CSynth/data/')) path = path.post('CSynth/data/');
        if (path.startsWith('/')) path = path.substring(1);
        // work out new href (not needed for plain click), prelace startscript in place
        let [pre, post] = location.href.split('startscript=');
        if (post === undefined) post = '';
        if (!pre.match(/\?/)) pre += '?';
        const ppost = post.post('&') || '';
        const newhref = `${pre}startscript=${path}&${ppost}`;
        msgfixlog('fffclick', path);
        if (e.altKey) {
            //const win = window.open(location.href + '&startscript=' + path, '_blank');
            const win = window.open(newhref, '_blank');
            if (win) win.focus();
        } else if (e.ctrlKey) {
            // location.href += '&startscript=' + path;
            location.href = newhref;
        } else {
            processFile(path);
        }
    } else {
        const sub = s.parentNode.getElementsByTagName('ul')[0]
        sub.style.display = sub.style.display ? '' : 'none';
        msgfixlog('fffclick', 'NO', s.childNodes[0].textContent.substring(0, 40));
    }
    return killev(e);
}

// read a json or yaml config file
CSynth.configReader = function(data, fid) {
    data = data.trim();
    let obj;
    if (data[0] === '{' || data[0] === '[')
        obj = JSON.parse(data);
    else
        obj = yaml.parse(data);
    springdemo(obj);
}


fileTypeHandlers['.config'] = CSynth.configReader;  // allow .config files
fileTypeHandlers['.txt'] = contactsReader;  // allow .txt files for contacts
fileTypeHandlers['.mat'] = contactsReader;  // allow .mat files for contacts
fileTypeHandlers['.rawobserved'] = contactsReader;  // allow .rawobserved files for contacts
fileTypeHandlers['.csv'] = contactsReader;  // allow .csv files for contacts
fileTypeHandlers['.normmatrix'] = contactsReader;  // allow .csv files for contacts



/** change number of particles on the fly */
CSynth.setParticlesDyn = function(k) {
    if (k === numInstances) return;
    // const old = {posw: springs.posWorkhist.texture, numInstances, numInstancesP2};
    k = Math.ceil(k);
    const cc = CSynth.current;
    const newvary = !springs.VARY;     // will need recompile first time, but not thereafter
    springs.VARY = 1;
    springs.setPARTICLES(k);
    if (newvary) springs.newmat();   // force that first recompile
    cc.numInstances = numInstances = k;
    numInstancesP2 = springs.numInstancesP2;
    uniforms.numSegs.value = HW.resoverride.skelnum = numInstances-1;

    springs.setup();
    // springs.uniforms.stepsSoFar.value = 8;          // TODO to remove Oct 2020?
    springs.copyworkhist();
    springs.step(1);

    cc.contacts.forEach(ccc => {
        CSynth.contactsToTexture(ccc);  // in case not done yet
        if (ccc.texture.magFilter !== THREE.LinearFilter) {
            ccc.texture.minFilter = ccc.texture.magFilter = THREE.LinearFilter; ccc.texture.needsUpdate = true;
            CSynth.setSelfIF(ccc, undefined, false);
        }
    });

    // todo: posW
    VH.SphereParticles.setInstances();
}
CSynth.selfIFFactor = 10;

/** set the diagonal values for a contact matrix, factor is relative to the max
 * if force is true set them all, otherwise just override 0 values.
*/
CSynth.setSelfIF = function (ccc, factor=CSynth.selfIFFactor, force=true) {
    ccc.texture.minFilter = ccc.texture.magFilter = THREE.LinearFilter;
    for (let i=0; i<ccc.datad.numInstances; i++) {
        if (force || ccc.getab(i,i) === 0)
            ccc.setab(i,i, ccc.maxv * factor);
    }
    ccc.texture.needsUpdate = true;
}

/** test for whether the particle mapping is working correctly */
var sb, ss;
CSynth.checkParticlesDyn = function pcheck(thresh = 0.01) {
    setInput(W.NOCENTRE, true);  // not, will not be in time first time round

    sb = readTextureAsVec3(window.skelbuffer);
    ss = readTextureAsVec3(springs.posNewvals);
    let bad = [];
    for (let i = 0; i < numInstances; i++) {
        const b = sb[i];
        const s = ss[i].multiplyScalar(G.scaleFactor);
        const d = b.distanceTo(s);
        if (d > thresh)
            bad.push([i, d, b, s]);
    }
    return bad;
}

/** use colour schemes to define chain beds */
CSynth.applySchemesToGroups = function(groups) {
    for (const sc in CSynth.colorSchemes) {
        CSynth.chainsToBed(groups, sc, CSynth.colorSchemes[sc]);
    }
    localStorage.colorSchemes = JSON.stringify(CSynth.colorSchemes);
}

/** make bed from chains
 * We construct as a string and have it parsed later,
 * as this is actually simpler within the code than the more logical creation of bed structure directly
 */
CSynth.chainsToBed = function(gr = CSynth.current.groups, name = 'fromchains', colorScheme = CSynth.colorSchemes[name]) {
    // bed line chr, startbp, endbp, text
    if (!gr) return;

    CSynth.current.beds = CSynth.current.beds.filter(b => b.shortname !== name)

    const lines = [];
    for(let gn in gr) {
        const g = gr[gn];
        lines.push([gn, g.startbp, g.endbp, gn].join('\t'));
    }
    const bed = {filename: name, shortname: name, description: 'colours generated from chains', bedtext: lines.join('\n'), colorScheme };
    CSynth.current.beds.push(bed);
    CSynth.useBed(bed);
    CSynth.refreshBedGUIs();
    CSynth.chooseBed(name);
}

CSynth.contactTypeCols = { S: '255,0,0',   D: '0,255,0', '?': '0,0,255'}

CSynth.extraContactsToBeds = function(xc = CSynth.extraContacts) {
    // bed line: chr, startbp, endbp, text
    // x contacts struct {id, bp, bpa, bpb, fpos, fposx}

    const ll = [];
    for (let i=0; i <= xc.length; i++) {
        const ca = i !== 0 ? xc[i-1] : {bpa:'?', bpb: 0, fpos: '?', flag: '?'};
        const cb = i !== xc.length? xc[i] : {bpa: numInstances, bpb:'?', fpos: '?', flag: '?'};
        ll.push(['!', ca.bpb, cb.bpa, `${ca.bpb}..${cb.bpa} ${ca.fpos}..${cb.fpos} ${ca.flag}..${cb.flag}`].join('\t'));
    }
    CSynth.current.beds.push({filename: 'Xgap', shortname: 'Xgap', description: 'Xgap',
        bedtext: ll.join('\n')});

    let bedtext = xc.map(c => [c.id, c.bpa, c.bpb, `${c.id}(${c.bp} (${c.flag}`].join('\t')).join('\n');
    CSynth.current.beds.push({filename: 'Xcontacts_BP', shortname: 'Xcontacts_BP', description: 'Xcontacts_BP', bedtext});

    const cols = { S: '255,0,0',   D: '0,255,0', '?': '0,0,255'}
    bedtext = xc.map(c => [c.id, c.bpa, c.bpb, `${c.id}(${c.bp} (${c.flag}`, '','','', '', cols[c.flag]].join('\t')).join('\n');
    CSynth.current.beds.push({filename: 'source', shortname: 'source', description: 'source', bedtext});


}

/** make contact between the selected particle and its closest contact point */
CSynth.contactClosest = function(xstr = 1, xlen = 0) {
    if (!CSynth.current.fixedPointsData) return msgfixerror('contactClosest', 'no fixed points');
    const c = CSynth.current.fixedPointsData.coords;
    const r = CSynth.picks['g-ribbon'];
    if (!r) return msgfixerror('contactClosest', 'no ribbon selection point');

    const p = springs.getpos()[r.partid];
    let d = 1e20, xi = -999;
    for (let i = 0; i < c.length; i++) {
        const dd = c[i].distanceTo(p);
        if (dd < d) {
            xi = i;
            d = dd;
        }
    }

    const bad = springs.addspring(r.partid, xi + numInstances, xlen, xstr);
        if (bad) log('cannot force spring for', r.partid, xi + numInstances, xlen, xstr);
    const res = {pick: r, xi, d};
    msgfixlog('contactClosest', res);
    return res;

}

CSynth.drawFixedSpheres = function(fps = CSynth.current.fixedPointsData, name = 'drawSpheres') {
    const c = fps.coords;
    // const contacts = CSynth.current.strandContacts;
    const s = new THREE.SphereGeometry(3, 16,12);
    const group = CSynth.fixedSphereGroup = new THREE.Group();
    group.name = 'fixedspheres';
    for (let i=0; i < c.length; i++) {
        // const details = contacts[i];
        const mat = CSynth.defaultMaterial.clone();

        const mesh = new THREE.Mesh(s, mat);
        mesh.position.copy(c[i]);
        mesh.name = 'fixedSphere:' + i;
        mesh.userData.index = i;
        group.add(mesh);
        CSynth.colourXContact(i);
    }
    CSynth.rawgroup.add(group);
    group.name = name;

    const pgui = V.gui;
    const vgui = dat.GUIVR.createX('fixed');
    vgui.myVisible = vgui.add(group, 'visible').listen().showInFolderHeader();
    // CSynth.materialGui(mat, vgui);  // mat varies over spheres, leave for now
    pgui.addFolder(vgui);
    return group;
}

if (THREE) {  // not in worker
    // CSynth.rawgroup.children.forEach(x=> {if (x.name=== 'drawSpheres') CSynth.rawgroup.remove(x); })
    CSynth.defaultMaterial = new THREE.MeshStandardMaterial();
    //CSynth.defaultMaterial = new THREE.MeshPhongMaterial();
    //CSynth.defaultMaterial.specular.setRGB(0.3, 0.3, 0.3);
    //CSynth.defaultMaterial.shininess = 20;
    CSynth.defaultMaterial.metalness = 0.6;
    CSynth.defaultMaterial.roughness = 0.5;
}

/** this can act as a proxy for meterialGUI, so that even if the underlying material is regenerated the properties are maintained */
CSynth.materialProperties = () => { return {
    transparent: false,
    opacity: 1,
    color: new THREE.Color().setRGB(1,1,1),
    metalness: 0.5,
    roughness: 0.5,
    wireframe: false
}};

CSynth.materialGui = function CSynth_materialGui(mat, vgui) {
    //TODO: something better in library side. Texture map options.
    mat.options = {     // no need to tie to mat, but might be helpful
        get transparent() { return mat.transparent; },
        set transparent(v) { mat.transparent = v; mat.depthWrite = !v; mat.blending = THREE.NormalBlending; }
    }
    vgui.add(mat.options, 'transparent').listen();
    vgui.add(mat, 'opacity').min(0).max(1).step(0.01).listen();
    vgui.add(mat, 'color'); // .listen(); listen breaks interactive change // onChange(updateColourGenes);
    if ('metalness' in mat) vgui.add(mat, 'metalness').min(0).max(1).step(0.01).listen();
    if ('roughness' in mat) vgui.add(mat, 'roughness').min(0).max(1).step(0.01).listen();
    vgui.add(mat, 'wireframe').listen();
}

CSynth.getray = function () {
    let raycaster;
    if (V.gpR) {
        const ee = V.gpR.raymatrix.elements;
        raycaster = new THREE.Raycaster(
            VEC3(ee[12], ee[13], ee[14]), VEC3(-ee[8],-ee[9],-ee[10]));
        raycaster.click = V.gpR.buttons[1].newpress;
    } else {
        const mouse = new THREE.Vector2();
        mouse.x = ( lastdocx / W.canvas.style.width.replace('px','') ) * 2 - 1;
        mouse.y = - ( lastdocy / W.canvas.style.height.replace('px','') ) * 2 + 1;
        //mouse.x = (lastdocx/width)*2-1;
        //mouse.y =-( (lastdocy/height)*2-1);
        raycaster = new THREE.Raycaster();
        raycaster.setFromCamera( mouse, camera );
        raycaster.click = CSynth.rayToFixed.lastmousewhich === 0 && mousewhich === 2;
        CSynth.rayToFixed.lastmousewhich = mousewhich;
    }
    return raycaster;
}



/** cast a ray from mouse or right controller into the fixed objects (eg York fixed contact points)
 *
*/
CSynth.rayToFixed = function() {
    var raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.1;
    var mouse = new THREE.Vector2();

    //>>> TODO handle menuMode; not just return as we must at least do restore any now unselected items at end

    // ~~~~~~~~ each frame?
    // update the picking ray with the camera and mouse position
    let click;
    if (V.gpR) {
        const ee = V.gpR.raymatrix.elements;
        raycaster = new THREE.Raycaster(
            VEC3(ee[12], ee[13], ee[14]), VEC3(-ee[8],-ee[9],-ee[10]));
        click = V.gpR.buttons[V.trigger].newpress;
    } else {
        mouse.x = ( lastdocx / W.canvas.style.width.replace('px','') ) * 2 - 1;
        mouse.y = - ( lastdocy / W.canvas.style.height.replace('px','') ) * 2 + 1;
        //mouse.x = (lastdocx/width)*2-1;
        //mouse.y =-( (lastdocy/height)*2-1);
        raycaster.setFromCamera( mouse, camera );
        click = CSynth.rayToFixed.lastmousewhich === 0 && mousewhich === 2;
        CSynth.rayToFixed.lastmousewhich = mousewhich;
    }

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects( CSynth.fixedSphereGroup.children, true );

    // msgfix('m', mouse, intersects.length, intersects);
    let fp;
    if (intersects[0]) {
        // beep();
        const o = intersects[0].object;                     // fixed object hit
        fp = o.userData.index;                        // index
        const details = CSynth.current.strandContacts[fp]; // details for hit fixed point
        const cpick = CSynth.picks['g-ribbon'];              // picked point on strand if any
        msgfix('fixed point', fp, o.position);

        let ncol = col3(0.2,0.2,0.2);                       // colour for 'unused' state
        let sc = 1;                                         // scale for pick
        if (cpick && !details) {                             // can add new contact
            ncol = col3(0,0,1);
            sc = 1.5;
            if (click) {
                CSynth.addXContact(fp, cpick.partid);
            }
        }
        // xxinter = intersects;
        if (!cpick && details) {                             // can remove contact
            ncol = col3(0,1,1);
            sc = 1.5;
            if (click) {
                CSynth.removeXContact(fp);
            }
        }
        CSynth.colourXContact(fp, ncol, sc);
    }
    // restore any now unselected items
    if (CSynth.rayToFixed.ofp !== fp )
        CSynth.colourXContact(CSynth.rayToFixed.ofp);
    CSynth.rayToFixed.ofp = fp;
}

/** add an extra contact,
 * fp: fixed point index,
 * partid: strand index,
 * type: type of contact,
 * xsim: whether to run 2 seconds of simulation  */
CSynth.addXContact = function(fp, partid, type = '*', xsim = true) {
    const details = CSynth.current.strandContacts[fp];
    springs.addspring(partid, fp + numInstances, 0, 1);
    CSynth.current.strandContacts[fp] = {id: '?', bp: partid, bpa: '?', bpb: '?',
        fpos:fp, flag: type, fposx: fp + numInstances };
    msgfix('XContact', 'add', partid, fp);
    CSynth.colourXContact(fp);
    if (xsim) CSynth.simulationBoost();
}

CSynth.simulationBoost = function(t = 2000) {
    if (GX.getValue('simulationsettings/dynamicsrunning') === false) {
        GX.setValue('simulationsettings/dynamicsrunning', true);
        setTimeout(()=>GX.setValue('simulationsettings/dynamicsrunning', false), t);
    }
}

/** remove xcontact from fixed point */
CSynth.removeXContact = function(fp, xsim = true) {
    const details = CSynth.current.strandContacts[fp];
    const partid = details.bp;
    springs.removespring(partid, fp + numInstances);
    msgfix('XContact', 'remove', partid, fp);
    delete CSynth.current.strandContacts[fp];
    if (xsim) CSynth.simulationBoost();
}

/** colour fixed point */
CSynth.colourXContact = function(fp, col, sc = 1) {
    if (!fp) return;
    const details = CSynth.current.strandContacts[fp];
    if (!col) {
        col = col3(1,1,1);
        if (details) {
            col = CSynth.contactTypeCols[details.flag];
            if (col)
                col = new THREE.Color(`rgb(${col})`);
            else
                col = col3(1,1,0);
        }
    }
    CSynth.fixedSphereGroup.children[fp].material.color.setRGB(col.r*0.5, col.g*0.5, col.b*0.5 );
    CSynth.fixedSphereGroup.children[fp].scale.set(sc,sc,sc);
}


// use coordinates to (temporarily) fix particles
CSynth.coordsToFix = function(p, perm = false) {
    let k = CSynth.xyzscale;
    for (let i = 0; i < p.length; i++)
        springs.setfix(i, p[i].x * k, p[i].y * k, p[i].z * k);

    // uniforms.stepsSoFar.value=4;    // stop springs auto-positioning          // TODO to remove Oct 2020
    springs.step(1);                 // establish the position
    springs.settleHistory();        // and make it fill history
    CSynth.xyzfixed = true;         // so we don't tanper with end springs even if fixed
    if (!perm) {
        for (let i = 0; i < numInstances; i++)
            springs.removefix(i);
        CSynth.xyzfixed = false;         // do appropriate fixing of ends
    }
}

// read and parse xyz file and fix particles
CSynth.xyzFileToFix = function(fid) {
    const o = {filename: fid};      // xyz structure
    CSynth.parseXYZ(o);             // will read and parse, populating o
    CSynth.coordsToFix(o.coords);   // and use to fix
}

CSynth.defaultShadowmapSize = 2048;
/** set the nonOrganic rendering lights to match the Organic ones from genes */
CSynth.setCamLightsFromGenes = function(force = false) {
    const lv = Object.values(FFG('light')).join(',') + G.ambient;
    if (!force && lv === CSynth.setCamLightsFromGenes.lastlv) return;
    CSynth.setCamLightsFromGenes.lastlv = lv;


    V.camscene.remove(V.lightGroup);
    V.lightGroup = new THREE.Group(); V.lightGroup.name = 'lightGroup';
    V.camscene.add(V.lightGroup);

    for (let i=0; i<3; i++) {
        let light, col = SG[`light${i}rgb`], pos = SG[`light${i}xyz`], dir = SG[`light${i}dirxyz`],
            strength = G[`light${i}s`], spread = G[`light${i}Spread`];
        let targ = VEC3().addVectors(pos, dir);

        if (dir.x >= 499) {
            light = new THREE.DirectionalLight( pos, G[`light${i}s`]);
        } else {
            light = new THREE.SpotLight(col, strength, 0, spread)
            const targetObject = new THREE.Object3D();
            light.target = targetObject;
            targetObject.position.copy(targ);
            V.lightGroup.add(light.target);  // >>> should this be scene?
            light.position.copy( SG[`light${i}xyz`]);
            // target and falloff not handled yet
        }
        V['l' + (i+1)] = light;
        light.receiveShadow = light.castShadow = searchValues.useshadows;
        light.shadow.mapSize.set(CSynth.defaultShadowmapSize, CSynth.defaultShadowmapSize);
        light.shadow.bias = -0.002;
        light.shadow.radius = 2;
        const cam = light.shadow.camera;
        cam.left = cam.bottom = -600; cam.right = cam.top = 600; cam.updateProjectionMatrix();
        light.position.copy(pos);
        V.lightGroup.add( light );
    }
    if (ima && ima.demo) ima.preframe = () => viveAnim('ima');

    const lighta = new THREE.AmbientLight( 0xffffff, G.ambient );
    lighta.name = 'ambientlight';
    CSynth.ambientlight = lighta;
    V.lightGroup.add(lighta);
    V.lamb = lighta;

    // log ('lights reset');
}

// turn shadows on/off dynamically, and make sure shadow cameras set up
// it seems that you need to be less dynamics, w.i.p.
// TODO: apply at optimizeVisible time as well
CSynth.setShadows = function(value = searchValues.useshadows) {
    renderer.shadowMap.enabled = value;
    renderer.shadowMap.needsUpdate = true;

    V.camscene.traverse(p => {
        if ('castShadow' in p && !p.isAmbientLight)
            p.castShadow = p.receiveShadow = value;
        if (p.material) p.material.needsUpdate = true;
    });
    searchValues.useshadows = value;

    V.lightGroup.traverse(l => {
        if (l.shadow && !l.isAmbientLight) {
            const len = l.position.length();
            const c = l.shadow.camera;
            const r = 150 * G.scaleFactor * G._uScale;
            c.near = Math.max(10, len - r);
            c.far = len + r;
            c.updateProjectionMatrix();
            l.shadow.mapSize.set(CSynth.defaultShadowmapSize, CSynth.defaultShadowmapSize);
            if (l.shadow.map)
                l.shadow.map.setSize(CSynth.defaultShadowmapSize, CSynth.defaultShadowmapSize);
        }
    })
}

CSynth.setNovrlights = function(force) {
    setNovrlights();
    CSynth.setCamLightsFromGenes(force);
    CSynth.setShadows();
}
// onframe(CSynth.setCamLightsFromGenes);

// coerce glmolp to glmol
CSynth.xxxGlmol = function(glmolp = ima.showing) {
    if (glmolp instanceof GLmolX) return glmolp;
    if (typeof glmolp === 'string') {
        let glmol = CSynth.glmol[glmolp];
        if (glmol) return glmol;
        glmol = CSynth.glmol[glmolp + '.pdb'];
        if (glmol) return glmol;
        for (let n in CSynth.glmol)
            if (n.startsWith(glmolp)) return CSynth.glmol[n];
        for (let n in CSynth.glmol)
            if (n.includes(glmolp)) return CSynth.glmol[n];
    }
    if (typeof glmolp === 'number') {
        let n = CSynth.current.extraPDB[glmolp];
        n = n.shortname || n;
        return CSynth.glmol[n];
    }
}

// find closest symmetrical point to given dir and symmetric to targ
CSynth.symclose = function(dir, targ, symset = CSynth.symMatrix) {
    return CSynth.symcloseAll(dir, targ, symset).t;
}
CSynth.symcloseAll = function(dir, targ, symset = CSynth.symMatrix) {
    return symset.map(m => {
            const t = targ.clone().applyMatrix4(m);
            return {t, p: dir.dot(t), m}
        })
        .sort((a,b) => b.p - a.p)[0];
}

CSynth.rotTo = async function(axis, maxang = 0.001, closest = true) {
    if (CSynth.skip) {CSynth.skip=0; return;}
    if (!camera) return;

    const mmat = V.rawscene.matrix  // model matrix could be derived from _rot4_ele but this is ready done

    const camrot = camera.matrix.clone(); camrot.setPosition(VEC3(0,0,0));  // view matrix
    const camroti = camrot.clone().transpose();

    const mvmat = new THREE.Matrix4().multiplyMatrices(camroti, mmat);  // modelview
    const zze = mvmat.elements
    const old2z = VEC3(zze[2], zze[6], zze[10]);  // point in model space pointing to Z

    const new2z = closest ? CSynth.symclose(old2z, axis) : axis;  // closest point to current symmetric with required axis

    let ang = old2z.angleTo(new2z);
    // // msgfixlog('ang', ang, 'maxang', maxang);
    // if (ang > maxang) {         // angle of rotation
    //     ang = maxang;
    //     onframe(() => CSynth.rotTo(axis, maxang))
    // } else {
    //     msgfixlog('----', '----');
    // }
    const about = VEC3().crossVectors(old2z, new2z).normalize();    // vector about wiich to rotate
    const steps = Math.ceil(ang/maxang);
    const stepang = ang/steps;
    for (let i = 0; i < steps; i++) {
        const rmat = new THREE.Matrix4().makeRotationAxis(about, -stepang); // required rotation as matrix
        tmat4.set(...G._rot4_ele);
        tmat4.multiplyMatrices(tmat4, rmat);
        tmat4.transpose();
        G._rot4_ele.set(tmat4.elements);
        await S.frame();
    }
}
//CSynth.rotTo(Plane.axis3, 9999);
//CSynth.rotTo(Plane.axis3, 9999);

// optimize visibility by hiding/showing objects, can save quite a lot on unused matrix computation
CSynth.optimizeVisible = function(o, recursive = false) {
    if (!o.isObject3D) return;      // sometimes happens for ima etc tiling

    if (!o.realParent && o.parent) o.realParent = o.parent;
    if (o.visible && !o.parent && o.realParent) {
        o.realParent.add(o);
    } else if (!o.visible && o.parent) {
        o.parent.remove(o);
    }
    if (recursive)
        for (let i = o.children.length-1; i >= 0; i--) // backwards because of remove; forEach does not work for same reason
            CSynth.optimizeVisible(o.children[i]);
    if (!('_visiblex' in o)) {
        o._visiblex = o.visible;
        delete o.visible;
        Object.defineProperty(o, 'visible', {
            get : () => o._visiblex,
            set : function(v) {
                o._visiblex = v;
                // this ensures automatic reattach if appropriate
                // automatic detach can cause issues with iteration over children of parent
                if (v)
                    CSynth.optimizeVisible(o);
            },
            enumerable: true
        });



    }
}

try {
    CSynth.bc = new BroadcastChannel('csynth');
    CSynth.bc.onmessage = function(ev) {
        const data = ev.data;
        const cmd = data.command;
        const funname = cmd === 'function' ? data.function : cmd;
        if (funname === 'setxyShow') return;    // intended for LMV, why did I see it??, TODO cleaner rules here
        const fun = CSynth[funname] || window[funname];
        if (fun) {
            fun(...data.args)
        } else {
            console.error('bad message', ev);
        }
    }
} catch (e) {
    console.error(msgfixerror('no CSynth BroadcastChannel', e));
}

/** send data (probably to LMV) */
CSynth.sendData = function(max = 2) {
    const ccc = CSynth.current.contacts;
    if (ccc.length === 0) return CSynth.bc.onmessage({command: '!nocontacts'})
    max = Math.min(max, ccc.length);
    for (let i = 0; i < max; i++) {
        CSynth.bc.postMessage({command: '!data', positions: ccc[i].data});
    }
    CSynth.bc.last = -99;  // force reselect
    CSynth.showpick();


}

/** use the image and bed to augment model */
CSynth.useImage = function({bedn = 0, remove = false, opacity}) {
    if (remove && !CSynth.imagevis4) return;
    const cc = CSynth.current;
    const bed = cc.beds[bedn];
    const k = springs.reserve('image', 3);    // points for reserved
    const cpp = CSynth.imagevis4.cpp;  // channels
    // we need a border for stats partly to avoid some bits of initial test case,
    // and partly so it looks better while marching cubes makes border to permit safe normals
    springs.setfix(k, CSynth.imagevis4.stats(0, undefined, 1).centroid);
    if (cpp >= 2) springs.setfix(k+1, CSynth.imagevis4.stats(1, undefined, 1).centroid);
    if (cpp >= 3) springs.setfix(k+2, CSynth.imagevis4.stats(2, undefined, 1).centroid);

    const ty = 1;   // role
    for (let i = 0; i < cpp; i++) {
        let l = 0, h = cc.numInstances-1;
        if (bed && bed.data && bed.data[i]) {
            const r = bed.data[i];  // assume 3 fields for now
            l = Math.max(l, Math.floor(CSynth.particle4bp(r.startbp)));
            h = Math.min(h, Math.ceil(CSynth.particle4bp(r.endbp)));
        }
        for (let p = l; p <= h; p++) {
            if (remove)
                springs.removespring(p, k+i, ty); // len=1, str=1, pow=1, type=1
            else
                springs.addspring(p, k+i, 0, 1, 1, ty); // len=1, str=1, pow=1, type=1
        }
    }
    springs.uniforms.roleforces.value[ty] = 1

    if (opacity !== undefined) {
        const c = CSynth.imagevis4.meshGroup.children;
        c.forEach(cn => {
            cn.material.transparent = opacity !== 1;
            cn.material.opacity = opacity;
        })
    }


}

// for compatibility with missing Mutator and other buts of Organic
var interfaceSounds;

CSynth.startLMV = function() {
    // nb third parameter will (on Chrome at least) make new window, not new tab
    // specs can be given instead of x, see e.g. https://www.w3schools.com/jsref/met_win_open.asp
    CSynth.LMVwin = window.open('CSynth/largeMatrix/matrixexplorer.html', '_blank', 'x');
}

/** read sparse contacts file with chr values */
CSynth.contactsWithBP = async function(data, fid, contact, [chr1C, bp1C, chr2C, bp2C, vC] = [1,2,4,5,7]) {
    const {usegen, lines, lines5} = inputType(data);
    // const lines = Array.isArray(data) ? data : data.split('\n');
    let badlines = 0;
    let good = contact.data = [];      // set of contacts, 5-tuple
    const groups = contact.groups = {};
    let res = 0;
    function llog (...x) { msgfixlog('contactsWithBP', ...x); }

    // collect raw data in chrs
    // for (let i=0; i < lines.length; i++) {
    llog('parsing', fid)
    await lines.forEach(function contactsWithBPParse(line) {
        line = line.trim();
        if (line[0] === '#') return;
        const cols = line.split(/[ \r\t,]/);
        const chr1 = cols[chr1C];
        const bp1 = +cols[bp1C];
        const chr2 = cols[chr2C];
        const bp2 = +cols[bp2C];
        const v = +cols[vC];
        if (isNaN(bp1 + bp2 + v)) {
            badlines++;
            return;
        }
        processPair(chr1, bp1);
        processPair(chr2, bp2);
        good.push([chr1, bp1, chr2, bp2, v])
    });
    llog('parsed', '#good contacts', good.length, '#groups', olength(groups))

    // pass over chrs to establish bead/particle ids
    let n = 0;
    let h = contact.header = [], hi = contact.invHeader = {};

    llog('about to process groups', olength(groups));
    for (let c in groups) {
        const grp = groups[c];
        grp.res = res;
        const num = grp.num = (grp.endbp - grp.startbp) / res + 1;
        const startid = grp.startid = n;
        grp.endid = n + grp.num - 1;
        for (let i = 0; i < grp.num; i++) {
            const bp = grp.startbp + i*res;
            const k = grp.chr + ':' + bp;
            hi[k] = h.length;
            h.push(k);
        }
        n = contact.numInstances = grp.endid + 1;
    }
    contact.res = res;
    llog('groups processed', olength(groups), 'numInstances', n);

    //now create the textureArrray
    const td = /** contact.textureData = **/ new Float32Array(n*n);
    td.fill(-999);
    let minv = 0, maxv = 0, rmaxv = 0, sumv = 0, sumv2 = 0, nonz = good.length, setx = 9999, diagset = 0, setz = 0,
    minid = 0, maxid = (n-1) * res;  // maxid is a pseudo maxid, based on what it would have been like with one chr


    llog('create texture array');
    for (let gi=0; gi<good.length; gi++) {
        const [chr1, bp1, chr2, bp2, v] = good[gi];
        const i = hi[chr1 + ':' + bp1], j = hi[chr2 + ':' + bp2];
        td[i + j*n] = td[i*n + j] = v;
        sumv += v;
        sumv2 += v*v;
        maxv = Math.max(v, maxv);
        if (v !== 0)
            minv = Math.min(v, minv);
        else
            setz++;
    }
    llog('texture array done');

    return {data, minv, maxv, rmaxv, sumv, sumv2, nonz, setz, diagset, minid, maxid};


    // process chr/np pair
    function processPair(chr, bp) {
        let grp = groups[chr];
        if (!grp) {
            grp = groups[chr] = {chr, startbp: bp, endbp: bp, res: 0}
        } else {
            res = hcf(bp - grp.startbp, hcf(bp - grp.endbp, res));
            grp.startbp = Math.min(bp, grp.startbp);
            grp.endbp = Math.max(bp, grp.endbp);
        }
    }
}

/** patch missing values in array, in place
works badly at start of mcgill test???
z=-999; CSynth.patchmissing([0,3,3,3, 3,z,3,3, 3,3,z,3, 3,3,3, 9])
*/
CSynth.patchmissing = function (a, m=-999, dv = -999.25) {
    const n = Math.round(a.length ** 0.5);
    let leftv, rightv, endgap;
    // scan along at given diagonal offset d to the right till we hit a good value, or end if bad value at end
    const scan = (d, ii) => {
        while (true) {
            const v = a[ii*n + d + ii];
            if (v !== m) return [v, ii];        // good value
            if (ii === n-1) return [leftv, ii]; // end
            ii++;
        }
    }

    for (let d = 0; d < n; d++) {
        endgap = -1;
        for (let i = 0; i < n - d; i++) {
            const p = i*n + i+d
            if (a[p] !== m) {leftv = a[p]; continue; }
            if (i >= endgap) {
                [rightv, endgap] = scan(d, i);
            }
            leftv = a[p] = a[i + (i+d)*n] = ((endgap-i) * leftv + rightv) / (endgap - i + 1);
            if (isNaN(leftv) || leftv === m)
                i=i+0
        }  // i
    } // d
    return a;
}  // patchmissing

// CSynth.normalizeAvoid = 0; CSynth.normalizeLoops = 5; ccc0.textureVersions = []; await S.frame(2); ccc0.texture.needsUpdate = true; U.contactbuff = ccc0.texture
// k = 2225; a = ccc0.dataVersions[0]; r=[]; for(let i = 0; i<numInstances; i++) r[i] = a[k + i*numInstances]; r = r.map(x => x === -999? NaN :  Math.log(x*1000)); getstats(r); CSynth.plot(r); r.slice(k-10, k+10)
// CSynth.matrixMesh.position.set(-0,0,0); CSynth.matrixMesh.scale.set(4,4,4); CSynth.matrixMesh.updateMatrix()
CSynth.normalizeAvoid = 1; CSynth.normalizeLoops = 3;
/** normalize a in place */
CSynth.donormalize = function(a, loops = CSynth.normalizeLoops, avoid = CSynth.normalizeAvoid, m=-999, plot = true) {
    console.time('donormalize')
    const n = Math.round(a.length ** 0.5);
    ss = new Float32Array(n);
    const pp = [];
    for (let r=0; r < loops; r++) {
        ss.fill(0);
        for (let i = 0; i < n; i++) {
            let s = 0;
            for (let j = 0; j < n; j++) {
                const v = a[i + j*n];
                if (v !== m && Math.abs(i-j) > avoid) s += v;
            }
            ss[i] = s;
        }
        if (plot && r === 0) pp.unshift({data: ss.map(x => x || NaN), label: 'ss'+r })
        for (let i = 0; i < n; i++) ss[i] = (ss[i] || 1) **-0.5;
        // log('post', ss.subarray(2215, 2235))

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const v = a[i + j*n];
                if (v !== m) a[i + j*n] *= ss[i] * ss[j];
            }
        }
    } // loops
    if (plot) {
        pp.unshift({data: ss.map(x => x || NaN), label: 'ssfinal', borderWidth: 2})
        CSynth.plot(pp);
    }

    console.timeEnd('donormalize')
    return a;
}

/** highest common factor */
function hcf(a, b) { return (b === 0) ? a : (a === 0) ? b : hcf(b, a % Math.abs(b)); }

CSynth.camnearmin = 0.1;
CSynth.camnearmax = 0.1;    // in metres, must be able to see controllers
CSynth.camnearVRReal = 0.1;  // for VR real size, controllers may be quite close
CSynth.camfarmin = 2;       // so we can see menu
CSynth.fogfarmin = 99999;  // effectively disable fog // was 10; // so we can see menu, anyway silly to fog small items
CSynth.referenceSize = 120;

/** fix camera near far and fog values:
 * n.b. fog is very helpful for diagrams
 * but can be confusing in VR especially is scale is allowed to vary
 */
CSynth.fogfix = function({sc = CSynth.referenceSize, fnear = 0, ffar = 1, t = 0} = {}) {
    let camz = camera.position.length();
    const ssc = sc*G.scaleFactor*G._uScale;
    let camnear = camz - ssc * 1.5;
    const camnearmin = Math.min(CSynth.camnearmin, ssc/10);
    if (camnear < camnearmin) camnear = camnearmin;
    if (camnear > CSynth.camnearmax * renderVR.scale) camnear = CSynth.camnearmax * renderVR.scale;
    if (renderVR.invr() && renderVR.scale === 1) camnear = CSynth.camnearVRReal ;
    let camfar = camz + ssc * 1.5;
    camfar = Math.max(camfar, CSynth.camfarmin);  // to see menu when item small ... but what about fog? ... fog only for big items
    let fognear = camz + fnear * ssc;
    let fogfar = Math.max(CSynth.fogfarmin, camz + ffar * ssc);
    if (camz < ssc) fogfar = ffar * ssc * 5;  // todo remove jump

    addtarget({t,
        camnear: {object: camera, property: 'near', value: camnear},
        camfar: {object: camera, property: 'far', value: camfar}
    });

    if (V.fog) addtarget({t,
        fognear: {object: V.fog, property: 'near', value: fognear},
        fogfar: {object: V.fog, property: 'far', value: fogfar}
    });

    V.lightGroup.children.forEach(l => {
        if (l.isAmbientLight) return;
        const cam = l.shadow.camera;
        const len = cam.position.length();
        cam.near = Math.max(10, len-ssc);
        cam.far = len + ssc;
        cam.left = cam.bottom = -ssc; cam.right = cam.top = ssc;
        l.shadow.bias = -0.002;
        cam.updateProjectionMatrix();
    });

    // No longer wanted, addtarget does that without killing other targets ... if (t === 0) vtargetNow();
}

var I;
/** take the given (default current) tiling and convert to interactive;
    set old tiling invisible
    prepare display of individual planes, but set visible
*/
CSynth.tileToInteractive = function(t) {
    if (!t) t = CSynth.current.extraPDB[ima.showing].tiling;
    if (!t) return msgfixlog('CSynth.tileToInteractive', 'bad input');
    if (typeof t === 'string') return msgfixlog('CSynth.tileToInteractive', 'string input not allowed');
    CSynth.current.extraPDB[ima.showing].tilemesh.visible = false;
    I.removeallfix();
    I.clearPlanes();
    if (!Array.isArray(t)) t = [t];
    t.forEach((p, i) => {
        const group = I.setplane(i, p, false).group;
        if (group) group.visible = false;
    });
    I.useplanes().visible = true;
}

CSynth.outdist = 1.5;
// toggle inside/outside
CSynth.posToggle = async function() {
    const td = (CSynth.camdist < 1) ? CSynth.outdist : 0;      //
    await S.rampP(CSynth, 'camdist', td, CSynth.cameraToDist.time, {scurve: true});
    CSynth.setLightDirFromCam();  // todo, animate as we move camera
}

// set light oritentations fromt camera
CSynth.setLightDirFromCam = function () {
    //const d = camera.position;
    const d = VEC3(camera.matrix.elements.slice(8,11));
    const l1p = V.l1.position;
    const l2p = V.l2.position;
    V.l1.position.set(d.z + d.x, 0, d.z-d.x );
    l1p.y = Math.sqrt((l1p.x**2 + l1p.z**2)/2);
    l1p.set(d.z + d.x, 0, d.z-d.x );
    l1p.y = Math.sqrt((l1p.x**2 + l1p.z**2)/2);
    l2p.set(-d.z + d.x, 0, d.z+d.x );
}

CSynth.rotPosGui = function(pgui) {
    if (!searchValues.lowry) {
        CSynth.SymButtons = pgui.addImageButtonPanel(3,
            {text: '5', func: () => {
                CSynth.rotTo(Plane.axis5, 0.03);
                //mat.makeRotationX(Math.atan(1/Plane.phi));
                //G._rot4_ele.set(mat.elements);
            }, tip: 'centre view on\n5-fold symmetry axis'},
            {text: '3', func: () => {
                CSynth.rotTo(Plane.axis3, 0.03);
                //mat.makeRotationX(Math.atan((2*Plane.phi+1)/Plane.phi));
                //mat1.makeRotationZ(Math.PI);
                //mat.multiplyMatrices(mat, mat1);
                //G._rot4_ele.set(mat.elements);
            }, tip: 'centre view on\n3-fold symmetry axis'},
            // {text: '2a', func: () => {
            //     CSynth.rotTo(Plane.axis2x, 0.03);
            //     //mat.identity();
            //     //G._rot4_ele.set(mat.elements);
            // }, tip: 'centre view on one\n2-fold symmetry axis'},
            {text: '2', func: () => {
                CSynth.rotTo(Plane.axis2, 0.03);
                //mat.makeRotationY(Math.PI/2);
                //G._rot4_ele.set(mat.elements);
            }, tip: 'centre view on other\n2-fold symmetry axis'}
            ).setRowHeight(0.15).highlightLastPressed();
        }

    //~~~~~~~~~~~~~~~~~~~~ pos
    Object.defineProperty(CSynth, 'camdist', {
        get: () => {
            const forward = VEC3(camera.matrix.elements.slice(8,11));
            const s = Math.sign(forward.dot(camera.position))
            return s * camera.position.length() / (CSynth.referenceSize * G.scaleFactor * G._uScale);
        },
        // todo, get damped movement working again, but make sure continuous movement works sensible too
        // without time 0 we get silly result just by holding mouse down on slider
        // below is (temporary) patch for damped from buttons but not slider, but does not work;
        // issue seems to be because fogfix called every frame with time 0
        set: v => { CSynth.cameraToDist(CSynth.referenceSize * G.scaleFactor * G._uScale * v, undefined, 0); } // (v*4)%1 === 0 ? undefined : 0)
    });

    const t = CSynth.cameraToDist.time;
    // CSynth.PosButtons = pgui.addImageButtonPanel(4,
    //     {text: 'inside\nback',   func: ()=>addtarget({t, campos: [CSynth, 'camdist', -0.65]}), tip: "'go to inside\nnear back 'wall'"},
    //     {text: 'inside\ncentre', func: ()=>addtarget({t, campos: [CSynth, 'camdist', 0    ]}),     tip: 'go to centre inside'},
    //     {text: 'near',           func: ()=>addtarget({t, campos: [CSynth, 'camdist', 1.25 ]}),  tip: 'go to just outside'},  // renderVR.scale
    //     {text: 'outside',        func: ()=>addtarget({t, campos: [CSynth, 'camdist', 2.5  ]}),   tip: 'go to outside view'}
    // ).setRowHeight(0.15).highlightLastPressed();
    // addtarget({t:10000, campos: {object: CSynth, property: 'camdist', value: 0}});
    CSynth.PosButtons = pgui.addImageButtonPanel(1,
        {text: 'inside\noutside',  func: CSynth.posToggle, tip: "toggle inside or outside view"}
    ).setRowHeight(0.15).highlightLastPressed();

    // removed as not that helpful, Stephen 25/10/19
    // CSynth.DistSlider = pgui.add(CSynth, 'camdist', -0.7, 2.5).step(0.01).setHeight(0.07).listen();

    //~~~~~~~~~~~~~~~~~~~~ size
    if (searchValues.lowry) {
        Object.defineProperty(CSynth, 'objsize', {
            get: () => Math.log10(G.scaleFactor * CSynth.referenceSize * G._uScale / renderVR.scale),
            set: s => {
                const save = CSynth.camdist;
                const k = G.scaleFactor = 10**s / (CSynth.referenceSize * G._uScale) * renderVR.scale;
                // <<<< TODO decide best way of making sure scale is set at right time
                // either make G.scaleGactor a property, or order 'preframe' for vtargets, etc etc
                // for now, just make sure it is set here
                CSynth.rawgroup.scale.set(k,k,k);
                CSynth.camdist = save;
            }
        })
        /***
        CSynth.SizeButtons = pgui.addImageButtonPanel(3,
            {text: 'small',     func: ()=>{
                addtarget({t, objsize: [CSynth, 'objsize', -1]});
                addtarget({t, campos: [CSynth, 'camdist', 2.5  ]});
            }, tip: "small object"},
            {text: 'medium',    func: ()=>addtarget({t, objsize: [CSynth, 'objsize',  0]}), tip: "medium object"},
            {text: 'large',     func: ()=>addtarget({t, objsize: [CSynth, 'objsize',  1]}), tip: "large object"}
        ).setRowHeight(0.15).highlightLastPressed();
        ***/

        // removed as not that helpful, Stephen 25/10/19
        //CSynth.SizeSlider = pgui.add(CSynth, 'objsize', -1, 1).name('size').setHeight(0.07).step(0.01).listen();
    }

    if (searchValues.lowry || searchValues.fullvir) {
        CSynth.ActionButtons = pgui.addImageButtonPanel(2,
            // eslint-disable-next-line no-return-await
            {text: 'construction',     func: async () => await CSynth.construction1(),
                tip: "script showing contsruction of capsid\nw.i.p. how to interrupt it"},
            {text: 'interactive\nsymmetry',     func: CSynth.intersweep.start,
                tip: "interactive contsruction of capsid\nw.i.p. for now interrupt by pressing again"}
            // {text: 'silly\nsymmetry',     func: CSynth.testsweepMad,
            //     tip: "quick construction by rotation about odd axes"}
        ).setRowHeight(0.15).highlightLastPressed();

    }

    CSynth.ResetButton = pgui.addImageButtonPanel(2,
        {text: 'reset', func: CSynth.reset, tip: 'reset virus and view'},
        {text: 'help',     func: CSynth.help, tip: "click for more help information"}
        ).setRowHeight(0.15);

}

CSynth.help = function() {
    CSynth.interrupt('help');
    CSynth.msgtag('help');
    if (!CLeap?.buttons?.help?.selected) return;
    CLeap.buttons.help.selected(true);
    setTimeout(() => CLeap.buttons.help.selected(false), 1000);
}

CSynth.reset = function() {
    onframe( () => {  // defer so highlighting after reset highlights Inside and not Reset
        if (CSynth.SymButtons) CSynth.SymButtons.guiChildren[0].interaction.events.emit('onPressed',{});   // choose first extraPDB
        // removed with in/out toggle
        // CSynth.PosButtons.guiChildren[1].interaction.events.emit('onPressed',{});   // and second distance (inside centre)
        CSynth.camdist = 0;     // start inside
        CSynth.objsize = 0.5;   // standard size
        CSynth.interrupt('reset');
        if (CLeap.buttons && CLeap.buttons.reset) {
            CLeap.buttons.reset.selected(true);
            setTimeout(() => CLeap.buttons.reset.selected(false), 1000);
        }
    });

    runkeys('shift,Home');
    runkeys('ctrl,Home');
    const mat = new THREE.Matrix4();
    mat.makeRotationX(Math.atan(1/Plane.phi));
    G._rot4_ele.set(mat.elements);
    if (CSynth.customReset) CSynth.customReset();
}


/**
 * previously named showPickAnnotation
 * use the CPU pick to set selection (slot offset 8 from preselection)
 */
CSynth.select = function CSynth_select(x, y, slotOff=8, slotOffMat=12) {
    if (V.gpR && V.gpR.menuMode) return;    // click from menu overrides click for selection
    //pick & show annotation result if we're in CSynth
    //TODO: trigger Maestro event established in CSynth
    if (!CSynth || !CSynth.getBPFromNormalisedIndex || badshader) return; //ugh. sorry. try to improve design before checking in...
    //get normalised index
    //we could consider associating slotOff & slotOffMat type info with gp some other way

    //need to fix slotOff in calling code

    //pick(slots[1].dispobj, gp.raymatrix, 0, slotOff, slotOffMat, true, pickResult=> {
    //callback is being called back excessively, particularly on touchmove.
    const dispobj = lastDispobj.genes ? lastDispobj : slots[mainvp].dispobj;
    pick(dispobj, x, y, slotOff, slotOffMat, true, (pickResult, pickTexts) => {
        const details = slotOffp => {
            const r = {};
            r.base = pickResult[slotOffp];
            r.TC = CSynth.getTexCoFromNormalised(r.base);
            r.BP = CSynth.getBPFromNormalisedIndex(r.base);
            r.beds = CSynth.bedhitsForFract(r.base);
            r.bedtext = r.beds.length === 0 ? 'no bed' : r.beds[0].line.split('\t')[3];
            r.text = r.BP + '(' + r.bedtext + ')';
            return r;
        }
        const ribbon = details(slotOff);
        const matrix1 = details(slotOffMat);
        const matrix2 = details(slotOffMat+1);

        //log(`pickResult: ${pickResult}, slotOff: ${slotOff}, [${pickResult[slotOff]}, ${pickResult[slotOff+1]}`);
        //log(`ribbon`)
        let group = CSynth.selectionAnnotationGroup;
        if (!group) {
            group = CSynth.selectionAnnotationGroup = new THREE.Group();
            group.visible = !CSynthFast;
            group.name = "selection annotations";
            V.rawscene.add(group);
        }

        if (ribbon.base <= 1) {
            if (!CSynth.RibbonSelectionAnnotation) CSynth.RibbonSelectionAnnotation = CSynth.createAnnotation(ribbon.text, ribbon.TC, group);
            else CSynth.RibbonSelectionAnnotation.updateAnnotation(ribbon.text, ribbon.TC);
            // TODO remove this comment and code immediately below if this is correct.
            // Currently can't select both at once,
            // but if matrix is not selected it will make its own anotations invisible.
            // If in future we can select both at once we don't want
            // ribbon selection to kill display of matrix and vica versa.
            //
            //if (CSynth.Matrix1SelectionAnnotation) {
            //    CSynth.Matrix1SelectionAnnotation.visible = CSynth.Matrix2SelectionAnnotation.visible = false;
            //}
        } else if (CSynth.RibbonSelectionAnnotation) CSynth.RibbonSelectionAnnotation.visible = false;

        if (matrix1.base <= 1) {
            if (!CSynth.Matrix1SelectionAnnotation) {
                CSynth.Matrix1SelectionAnnotation = CSynth.createAnnotation(matrix1.text, matrix1.TC, group);
                CSynth.Matrix2SelectionAnnotation = CSynth.createAnnotation(matrix2.text, matrix2.TC, group);
            }
            CSynth.Matrix1SelectionAnnotation.updateAnnotation(matrix1.text, matrix1.TC);
            CSynth.Matrix2SelectionAnnotation.updateAnnotation(matrix2.text, matrix2.TC);
            // if (CSynth.RibbonSelectionAnnotation) CSynth.RibbonSelectionAnnotation.visible = false;
        } else if (CSynth.Matrix1SelectionAnnotation) {
            CSynth.Matrix1SelectionAnnotation.visible = CSynth.Matrix2SelectionAnnotation.visible = false;
        }
    });
}

/** set up random colours,
 *
 * h and hr are middle value and range, ditto s,sr and v,vr
 * colorBy allows different things to be coloured
 *
 * pglmol may be a number, shortname, glmol, or default undefined for current
 *
  */
CSynth.randcols = function({h = 0.1, hr = 0.1, s = 1, sr = 0, v = 1, vr = 0, colorBy = 'chain', pglmol } = {}) {
    const glmol = CSynth.xxxGlmol(pglmol);
    // this will work on whatever was used to generate symmetry
    // will need to change if we are working on just a single group
    const xxxoptions = glmol.replicated.options;
    const rrr = Math.random;
    const col = col3();

    const colset = {
        chain: GLmolX.colors,
        residue: glmol.defaultResidueColors,
        chaingroup: GLmolX.chainColors
    }
    const cols = colset[colorBy] || GLmolX.colors;
    for (let c in cols) {
        cols[c] = col.setHSV(h - hr + 2*hr*rrr(), s - sr + 2*sr*rrr(), v - vr + 2*vr*rrr()).getHex()
    }
    const other = colorBy === 'chain' ? 'chaingroup' : 'chain';
    xxxoptions.setColorBy(other); xxxoptions.setColorBy(colorBy);
}
// CSynth.randcols({h:0.2, hr: 0.2, s:0.8, sr:0.2, v: 0.6, vr:0.4, colorBy: 'residue' })

/** message fixed relative to camera at time message created
 * CSynth.msgfix.xcam may be used for
 */
CSynth.msgfix = function CSynth_msgfix(...m) {
    if (!CSynth.msgfix.show) return;
    if (m[0]) m[0] = m[0].replace('\n', '\n~~~~~~~~~~~~~~~~~~~~~~~\n');  // force wider message
    W.infobox.style.display = 'inherit';
    let p = CSynth.msgfix.xcam;         // holder fixed to camera at time of message
    let o = CSynth.msgfix.threeobj;     // message itself
    if (!o) {
        p = CSynth.msgfix.xcam = new THREE.Group(); p.name = 'xcam';
        V.camscene.add(p);
        p.matrixAutoUpdate = false;
        o = CSynth.msgfix.threeobj = dat.GUIVR.textCreator.create('test');
        p.add(o);
        o.position.set(-0.25, -0.2,-0.8);  // todo orient for centre not left
    }
    CSynth.currentInfo = m;
    o.updateLabel(m.join('\n'));
    p.matrix.copy(camera.matrix);
    p.visible = renderVR.invr();
    // test case setInterval(() => CSynth.msgfix('test', framenum), 1000)
    // below will let it punch its way through to be visible even when behind
    // CSynth.msgfix.threeobj.traverse(n => {if (n.material) {let x=n.material; log(x.depthTest = x.depthWrite = false, x.transparent)} } )
    W.infobox.innerHTML = m.join('<br>').replace(/\n/g, '<br>');
}

/** display a fixed message from lookup of tag */
CSynth.msgtag = function CSynth_msgtag(tag) {
    tag = tag.replaceall('\n', ' ');
    CSynth.currentTag = tag;
    const m = CSynth._msgs;
    let mm = m[tag];
    if (!mm) {
        mm = 'no message for ' + tag;
        console.error(mm);
    }
    CSynth.msgfix(mm);
}
onframe(() => CSynth.msgtag('startup'));

/** append to current message, without moving */
CSynth.msgtagadd = function CSynth_msgtagadd(text) {
    const m = CSynth.currentInfo || [];
    m.push(text);
    CSynth.msgfix.threeobj.updateLabel(m.join('\n'))
    W.infobox.innerHTML = m.join('<br>').replace(/\n/g, '<br>');
}

CSynth.populateMessages = function() {
    const m =  {};
    const msource = searchValues.newsc2023 ? 'CSynth/newsc2023messages.txt' : 'CSynth/messages.txt'
    const data = posturi(msource);
    const xx = data.replace(/\r/g,'').split('\n*');
    xx.forEach(k => {
        m[k.pre('\n')] = k.trim().post('\n');
    });
    return m;
}

/** apply settings from the defs (probably from springdemo) */
CSynth.defsSettings = function(defs) {
    const menu = defs.menu;
    if (menu) {
        for (const k in menu) {
            GX.setValue(k, menu[k]);
        }
    }

    const genes = defs.genes;
    if (genes) Object.assign(currentGenes, genes);
}

CSynth._msgs = CSynth.populateMessages();


Object.defineProperty(CSynth, 'publish', {
    get: ()=> {return bigcol.r > 0.5},
    set: (val) => {
        if (val) {
            setBackgroundColor(1);
            GX.setValue('historytrace/subtractivecolor',  true);
            GX.setValue('sphereparticles/res',  50);
            if (CSynth.annotationGroup) CSynth.annotationGroup.color.set(0);
            setInput(W.renderRatioUi, 0.5);
            document.body.className = 'whiteback';
        } else {
            setBackgroundColor(0);
            GX.setValue('historytrace/subtractivecolor',  false);
            GX.setValue('sphereparticles/res',  17);
            if (CSynth.annotationGroup) CSynth.annotationGroup.color.set(0xffffff);
            setInput(W.renderRatioUi, 1);
            W.allbody.className = 'blackback';
        }
        Maestro.trigger('publishMode', val); //not really used...
    }
});


Maestro.on('backgroundColorChanged', () => {
    // log('backgroundColorChanged');
    if (bigcol.r > 0.5) {
        GX.setValue('historytrace/subtractivecolor',  true, false);  // false for no log error
    } else {
        GX.setValue('historytrace/subtractivecolor',  false, false);
    }

});

/** make a directory for pdbdata so we can more easily compare two */
CSynth.direct = function(pd) {
    const dir = pd.dict = {};
    const pdata = pd.pdbdata;
    pdata.forEach(e => dir[e.chain + ':' + e.resid] = e);
    return dir;
}

/** intersection based on keys of two sets, we only intersect/return keys, NOT the generalized intersect */
CSynth.intersection = function(plist) {
    const dlist = plist.map(p =>CSynth.direct(p));
    const d0 = dlist[0];            // choose first as seed, will compare with rest
    const r = {};                   // intersection results
    for (const k in d0) {
        if (dlist.every(d => k in d))
            r[k] = true;
    }
    return r;
}

/** use just a subset of input xyz struct, given a subset of acceptable keys, specific to pdb xyz structures */
CSynth.useSubset = function(xyz, subset) {
    const d = xyz.pdbdata;
    // work left to right and compact in wanted items in original arrays
    let o = 0;
    let unused = xyz.unused = [];
    for (let i = 0; i < d.length; i++) {
        const e = d[i];
        const key = e.chain + ':' + e.resid;
        if ((key) in subset) {
            d[o] = e;
            d[o].id = o;
            xyz.coords[o] = xyz.coords[i];
            xyz.realcoords[o] = xyz.realcoords[i];
            o++;
        } else {
            unused.push(key);
        }
    }
    if (unused.length !== 0) {
        msgfixlog('unused ' + xyz.shortname, unused.length, unused);
        d.splice(o);
        xyz.coords.splice(o);
        xyz.realcoords.splice(o);
        xyz.minid = 0;
        xyz.numInstances = o;
        xyz.maxid = xyz.range = o - 1;
    }
}

/** if requested try to match up the input xyzs if they are pdbs */
CSynth.checkPdbs = function(cc) {
    const pdbs = cc.xyzs.filter(p => p.pdbdata);
    if (cc.matchPairs && pdbs.length > 1) {
        const r = CSynth.intersection(pdbs); // find common keys
        pdbs.forEach(xyz => CSynth.useSubset(xyz, r));
        numInstances = cc.numInstances = pdbs[0].numInstances;
        cc.maxid = numInstances - 1; // ?? are there issues as ids are not dense ??
    }
}

/** merge matching pairs _l_/_r_ of pdbs for docking benchmark; eg
 * eg 1E4K_l_b.pdb with 1E4K_r_b.pdb
 * Thus given a set 1E4K_l_b.pdb, 1E4K_r_b.pdb, 1E4K_l_u.pdb, 1E4K_r_u.pdb
 * we end up with a pair; one for bound and one for unbound,
 * each comprising and _l and an _r
 *
 * Chain naming is odd in the benchmark database, so automatically rename the chains so they can match,
 * n.b. Interesting benchmark cases: 1E4K (?as used by FoldSynth demo?) 3R9A, 1GGX, 1AKJ, **1BKD** 1EAW ***1PXV >foldsynth***, 1R8S, ** 1XD3, * 1XQS
 * 1Y64 1ZM4 2AST
 * bad: 1SYX 1ZL1 ??? 2AYO
 */
CSynth.mergePdbs = function(cc) {
    const xyzs = cc.xyzs;
    const remove = [];
    for (let i = 0; i < xyzs.length;i++) {
        const xi = xyzs[i];
        const xis = xi.filename.split('_l_');
        if (xis.length !== 2) continue;
        for (let j = 0; j < xyzs.length; j++) {
            const xj = xyzs[j];
            const xjs = xj.filename.split('_r_');
            if (xjs.length !== 2) continue;
            if (xis[0] !== xjs[0] || xis[1] !== xjs[1]) continue;
            // if here found matching pair
            xi._tentativeSplitParticle = xi.numInstances; // this may be wrong if checkPDB merge eliminates some particles
            xi.coords = xi.coords.concat(xj.coords);
            xi.realcoords = xi.realcoords.concat(xj.realcoords);
            xi.pdbdata = xi.pdbdata.concat(xj.pdbdata);
            xi.splitChain = CSynth.rechainPDB(xi, xi.numInstances);
            xi.numInstances += xj.numInstances;
            xi.description += xj.description;
            remove.push(xj);
        }
    }
    for(const xj of remove) xyzs.splice(xyzs.indexOf(xj), 1);
}

CSynth.dock = async function(bfn = 'next') {
    setExtraKey('K,L', 'dock next', () => CSynth.dock());
    setExtraKey('K,J', 'dock previous', () => CSynth.dock('prev'));
    let ll = CSynth.dock.list;
    if (!ll) ll = CSynth.dock.list = window.fileEntries.filter(x=>x.name.endsWith('_l_b.pdb')).map(x => x.name.replace('_l_b.pdb', ''));
    if (bfn === 'next') bfn = ll[(ll.indexOf(CSynth.dock.last) + 1) % ll.length];
    if (bfn === 'prev') bfn = ll[(ll.indexOf(CSynth.dock.last) - 1 + ll.length) % ll.length];
    CSynth.dock.last = bfn;
    async function file(fn) {
        const e = window.fileEntries.filter(x=>x.name === fn)[0];
        let r;
        e.file(x => { r = x; Maestro.trigger('xxx')});
        await S.maestro('', 'xxx');
        return r;
    }
    const f = [];
    f[0] = await file(bfn + '_l_b.pdb');
    f[1] = await file(bfn + '_l_u.pdb');
    f[2] = await file(bfn + '_r_b.pdb');
    f[3] = await file(bfn + '_r_u.pdb');
    openfiles(f);
    await S.maestro('', 'finishload');
    onframe(() => {
        GX.restoregui('>docbench.settings');
        CSynth.xyzsExact(0);
        CSynth.separate();
        G.springrate = 0.1;

     }, 5);
}

/** separate two docking parts */
CSynth.separate = function(psep=20) {
    let sep = psep;
    const xyz = CSynth.current.xyzs[1];
    const c = xyz.coords;
    const split =  Math.ceil(CSynth.current.splitParticle);

    if (typeof sep === 'number') {
        const l = CSynth.stats(c.slice(0, split)).centroid;
        sep = CSynth.stats(c.slice(split)).centroid;
        sep.sub(l).normalize().multiplyScalar(psep);
    }
    for (let i = split; i < c.length; i++) {
        c[i].add(sep);
    }
    xyz.texture = undefined;
    CSynth.xyzToTexture(xyz);
    // CSynth.xyzsExact(1);
}

/** unzip and return blob */
CSynth.unzip = async function(dataStr, fid, use='') {
    // eslint-disable-next-line no-shadow
    const log = console.log;
    if (dataStr === 'test') {     // test
        const file = 'CSynth/data/Lorentz/NoY_All_interIntraContact_1M_nml.zip';
        dataStr = await posturibin(file);
    }
    console.log('././~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ZIPTIME')
    // note: 1 Feb 2022
    // zip much quicker than JSZip
    // because JSZip doImmediate/setTimeout,0 gets 4ms waste
    // Care needed with window/self to get JSZip working in web worker
    // JSZip kept more up to date though ...
    // note: 2 Deb 2022
    // 'patched' jszip from outside by out own shim (copied) for setImmediate in utils.js
    // n.b. code below copied into webworker test readzipfile in CSynthWorker.js without comments for full test
    //
    let blob;
    const kk = 'unzip ' + fid + ': ';
    msgfix(kk, 'starting ' + genbar(0))

    // if (use == 'both') {        // generally only use JSZip in tests
    //     console.time('././JSZip');
    //     const jszip = new JSZip();
    //     await jszip.loadAsync(new Uint8Array(dataStr));
    //     const ff = Object.keys(jszip.files)[0];
    //     let lastp = 0;
    //     text = await jszip.file(ff).async('string', m => {
    //         const p = m.percent;
    //         if (p > lastp + 10) {
    //             log(`././JSZip ${p.toFixed(2)}%`);
    //             lastp = p;
    //             msgfix('unzip')
    //         }
    //     });
    //     console.timeEnd('././JSZip');
    // }
    if (use === '' || use == 'both') {  // use zip by default
        console.time('././zip');
        // const tr = new zip.HttpReader(fid)
        const tr = new zip.Uint8ArrayReader(new Uint8Array(dataStr));
        const reader = new zip.ZipReader(tr)
        const entries = await reader.getEntries()
        let lastlog = 0;
        blob = await entries[0].getData( new zip.BlobWriter(), {
            onprogress: (index, max) => {
                const p = index/max * 100;
                if (p > lastlog + 10) {
                    msgfix(kk, `${index} of ${max}; ${p} ${genbar(p/100)}`);
                    lastlog = p;
                }
            }
        })
        msgfix(kk, `done${genbar(1)})`);
        console.timeEnd('././zip');
        await sleep(1);
    }

    // if (text !== textz) debugger

    return blob;
}

CSynth.addTooltips = function() {
    for (let tt in CSynth.xtooltips) {
        const g = GX.getgui(tt);
        if (!g) { log('no entry to set tooltip for', tt); continue; }
        if (!g.getToolTip) { log('no tooltip capability for', tt); continue; }
        if (g.getToolTip()) { log('key already has tool tip', tt, g.getToolTip()); continue; }
        if (!CSynth.xtooltips[tt]) { log('empty tool tip suggestion', tt); continue; }
        g.setToolTip(CSynth.xtooltips[tt]);
    }
}

CSynth.xtooltips = {
    "Save/Load/Files:": "Run a saved file, dropdown shows lsit of avaiable files.",
    "Modes/BED data source:": "Select a main BED file data source\nWill be applied in several places below.",
    //"Ribbon/Colour source:": "",
    //"HistoryTrace/Colour source:": "",
    //"SphereParticles/Colour source:": "",
    "Simulation settings/dynamics running": "Toggle dynamics to run or not.",
    "Simulation settings/normalize scaling": "CSynth attempts to normalize the scaling for different models.\nChoose measure to use for normalization.",
    "Simulation settings/More .../stretch": "Select for 'skewer' effect moving ends of ribbon outwards.",
    "Simulation settings/More .../strength": "Strength of the spring boosting effect.",
    "Ribbon/visible": "Toggle ribbon visibility.",
    "Ribbon/Colour source:": "Choose source for ribbon colouring.",
    "Ribbon/diameter": "Set diameter for ribbon.",
    "Annotations/visible": "Toggle annotation visibility.",
    "Annotations/annotation springs": "Set up annotations on 'springs' away from main object.\nExperimental .....",
    "Matrix/visible": "Toggle matrix visibility.",
    "Matrix/rotation": "Select rotation for matrix (about x axis)",
    "Matrix/Colour/input A": "First data source for matrix colouring.",
    "Matrix/Colour/input B": "Second data source for matrix colouring.",
    "Matrix/Colour/neither": "Colour for both data sources low value.",
    "Matrix/Colour/both": "Colour for both data sources high value.",
    "Matrix/Colour/current distances": "Colour where first input stronger than second.",
    "Matrix/Colour/current dynamics model": "Colour where second input stronger than first.",
    "HistoryTrace/visible": "Toggle history trace visibility.",
    "HistoryTrace/Colour source:": "Select colour source for history trace.",
    "HistoryTrace/Opacity": "Opacity for history trace.",
    "HistoryTrace/Saturation": "Saturation for history trace.",
    "HistoryTrace/Brightness": "Brightness for history trace.",
    "HistoryTrace/Pick Brightness": "Brightness for pick region as displayed on hitory trace.",
    "HistoryTrace/Pick Width": "Width to display pick region on history trace.",
    "HistoryTrace/Fade Factor": "Fade factor as positions age on history trace",
    "HistoryTrace/rotations": "Allow multiple roations of history trace.",
    "HistoryTrace/Echoes/Number of echoes": "experimental, echos for history trace.",
    "HistoryTrace/Echoes/Echo strength": "experimental, echo strngth for history trace.",
    "HistoryTrace/Echoes/Echo shape": "experimental, echo shape for history trace.",
    "HistoryTrace/Motion/x": "Offset along x for older values in history trace.",
    "HistoryTrace/Motion/y": "Offset along y for older values in history trace.",
    "HistoryTrace/Motion/z": "Offset along z for older values in history trace.",
    "SphereParticles/visible": "Toggle sphere particle visibility.",
    "SphereParticles/Colour source:": "Select colour source for sphere particles.",
    "SphereParticles/diameter": "diameter for sphere particles",
    "SphereParticles/selectedDiameter": "dimateter for selected sphere particles",
    "SphereParticles/res": "Grid resolution for sphere particles.",
    "Metavis/visible": "Toggle visibility for metaball view. Experimental ...",
    "Metavis/rad": "Base radius for metaball view.",
    "Metavis/radInfluence": "Spread of metaball sphere influence.\nFactor of sphere radius.",
    "Metavis/res": "Resolution for metaball rendering.",
    "Metavis/useSprings": "??",
    "linevis/visible": "Select visiblity for lines",
    "linevis/ifmax": "Max IF value used in setting line colouring/strength.",
    "View/Camera/near": "Near clip plane for camera.",
    "View/Camera/far": "Far clip plane for camera.",
    "View/Fog/active": "Toggle fog display.",
    "View/Fog/near": "Fog near plane.",
    "View/Fog/far": "Fog far plane.",
    "View/xrot": "Continuous x rotation speed.",
    "View/laser angle": "Angle of laser to controller (VR Vive)",
    "Extras/guidetail": "Set level of information displayed in messages/",
    "Extras/graphics/background": "",
    "Extras/dynamics running": "",
    "Extras/annotation spring uniforms GUI": ""
}

CSynth.shortcuts = {
    cov: 'covid/Corona-httpkorkinlab.org-wuhan/4. Models of viral-human protein complexes/wS_trimer-ACE2.js'
}

CSynth.runexample = function(n) {
    if (typeof n === 'number') n = 'cexample' + n;
    location.search = n;
    // below uses ready loaded shaders, but prevents back button
    // interpretSearchString(n);// this will set startscript etc
    // processFile('CSynth/data/' + startscript);
}

/** spring oddities at end of big pdb
 60 ok
 capsid.pdb, 11610, zigzag at end, alternate pairs fixed/free,12 pair/pairs (48 items)
 6atk.pdb, 2898, pairs as above, but just one pair very near end fixed (ima)
 6vxx.pdb, 2916, very simular to 6atk (6vxx covid spike closed)
 5tc1.pdb, 1594, two at end fixed

 *
 */

 /* parsing paths
 contactsReader handles txt, mat, rawobserved, zip

 openfile => contactsReader => txtParser => ***
                                         => bintriReader
                            => unzip, ...
                            => bintriReader
                            => csvParser
                            => contactsWithBP
loadData => getContacts => contactsReader => ... above
                        => zip ...
                        => bintriReader (for _matrix.txt, .mat, .normmatrix) => loadMatrix
                        => bintriReader (for .bintri)

csvParser for .csv or .txt with special format
txtParser for .txt
bintriReader for .bintri
bintriReader for .mat (finance only, broken)

some tests:
CrickMany/manyR.js      _matrix.txt
CrickMany/many.js       .bintri
cexample1               .zip
Yasu2023/littletest.js  .txt
Yasu2023/big.js         .txt (big)
CrickBig/big.js         .csv

fromHICcombined_10Kb.txt  .txt large bp numbers


  */
