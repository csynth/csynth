'use strict';
var genedefs, setvalr, currentGenes, uniforms, extradefines, regenHornShader, log, setAllLots, maxshine, msgfix, updateGuiGenes,
runscript, InspectedWin3js, posturi, inputs, HW, G, W, V, VH, copyFrom, nomess, msgtrack, camset,
camera,camToGenes, renderVR, showview, logload, genestoRot4, cc, CSynth, startvr, fixedgenes, setBackgroundColor, fs,
writetextremote, Blob, readbinaryasync, currentObjects, refall, pick, lastdocx, lastdocy, width, height, extrakeys, nop,
slots, mainvp, distxyz, material, EX, setInput, onframe, setViewports, Director, tad, showControls, mutateVisibleGenes, setSize, fullscreen, exitfullscreen,
cMap, _boxsize, basescale, searchValues, getdesksave, S, runcommandphp, nircmd, islocalhost, downloadImageGui, Buffer, vec3, SG, substituteExpressions,
currentHset, gl, showUniformsUsed, arraydiff, saveAs, everyframe, Maestro, msgfixerror, clearPostCache, runkeys, isCSynth, _R, GUIwallkeys,
shadows, usemask, inps, exportmyshaders, readtext, format, savesystem, centrescalenow, xxxvn, lastDownLayerX, lastDownLayerY, copyXflip, feed, fileExists


/** convenient look at uniforms, n.b. uniforms must be mentioned in the proxy else ownKeys does not work */
var U = new Proxy(uniforms, {
   // ???get : (ig, name) => name === 'ownKeys' ? () => Reflect.ownKeys(uniforms) : uniforms[name].value,
   get : (ig, name) => uniforms[name] && uniforms[name].value,
   set : (ig, name, v) =>  { if (!uniforms[name]) uniforms[name] = {}; uniforms[name].value = v; return true; },
   ownKeys : (o) => Reflect.ownKeys(uniforms)
});
var RU = _R(U);

// extra convenience functions often for single use
function bumprange() {
    for (var gn in genedefs) {
        var gd = genedefs[gn];
        if (gn.endsWith('_bumpstrength')) { gd.min = 0.5; gd.max = 2; }
        if (gn.endsWith('_bumpscale')) { gd.min = 2; gd.max = 8; }
        setvalr(gn, currentGenes[gn]);  //  force into range
    }
    gd = genedefs.wall_bumpscale; gd.min = 20; gd.max = 80;
    gd = genedefs.wall_bumpstrength; gd.min = 0.5; gd.max = 2;
    currentGenes.wall_bumpscale = 50;
    currentGenes.wall_bumpstrength = 1;
}

var wallwhite = {
    wall_red1: 1, wall_green1: 1, wall_blue1: 1, wall_refl1: 0,
    wall_red2: 1, wall_green2: 1, wall_blue2: 1, wall_refl2: 0,
    wall_red3: 1, wall_green3: 1, wall_blue3: 1, wall_refl3: 0,
    wall_band1: 0, wall_band2: 20, wall_band3: 0, wall_bandbetween: 0
};
// function whitewall() {

// }

// convert uniforms to constants to see if it helps performance
// does not work in this form,  also see parseUniforms.fixshadergenes in doIncludes()
function deuniform(a,b,c,d,e) {
    for (let gn in uniforms) {
        let gd = genedefs[gn];
        if (gd && gd.free === 0) {
            extradefines += '#define ' + gn + ' ' + currentGenes[gn] + '\n';
            delete uniforms[gn];
        }
    }
    regenHornShader();
}

// dummy function for writing experiments
function extras1(a,b,c,d,e) {
    // experiments with iterators etc http://es6-features.org/#GeneratorFunctionIteratorProtocol

    let test = {
        *[Symbol.iterator]() {
            var x = 0;
            for (let i = 0; i < 4; i++) {
                x += i;
                log(x);
                yield i;
            }
        }
    }

    // simple generator functions to improve for loop syntax
    function *range (start, end, step=1) {
        for (let i=start; i<=end; i+=step) yield i;
    }
    for (let i of range(0, 3)) {
        console.log('loop', i)
    }

    // !!! most useful of all to us?
    // simple function that will do things defined within a loop at controlled times
    // need to integrate with timedQueue for more accurate timing
    function *tt(n=4) {
        var x = 0;
        for (let i of range(0,n)) {
            x += i;
            log('>', i, x);
            yield i * 100;  // the yield is a timeout in millesec
        }
    }

    runscript(tt);

    return tt();

    //return;
    //setAllLots('shini', {max:10000, value: 10000});
    //maxshine = 10000;
}

function extras2(a,b,c,d,e) {
    msgtrack('springforce contactforce');
    if (a) { G.springforce = 1; G.contactforce = 0; G.pushapartforce=0.0008; G.backboneStrength = 10; return; }
// temp test for new springs with contact texture
    G.springforce = 0;
    G.contactforce = 67;

    G.backboneStrength = 1;

    G.pushapartforce=0.0008;
    G.pushapartpow = 0;

    CSynth.applyContacts(CSynth.current.selectedSpringSource);


    return;

    var fff = Function(`return {
    "name": "startup",
    "date": "Thu Mar 02 2017 09:03:46 GMT+0000 (GMT Standard Time)",
    "genes": {
        "time": 0.026941807323951687,
        "nstar": 5.926500207406939,
        "stardepth": 0.012425315495909072,        "ribdepth": 0.8131045453065705} }`);
    log('fff', fff());

    var ggg=eval('{name: "startup"}');
    log('ggg1', ggg); //  gives silly answer
    //var ggg=eval('{"name": "startup"}');  fails
    //log('ggg', ggg);
}

// maybe copy and paste to exectute just one or more prepared script bits
function extras3(a,b,c,d,e) {
    msgfix('!lightss', '>$light0s$ $light1s$ $light2s$ amb=$ambient')
}

var GD = {};  // genedef groupings
/** freeze/free for newsc */
function newscFreezeFree() {
    // categories of colour and how to free/freeze them
    GD = {};
    GD.basecol = {f:1, l:["red1", "green1", "blue1", "red2", "green2", "blue2", "red3", "green3", "blue3", "texscale", "band1", "band2", "band3", "bandbetween", "texrepeat", "texfinal"]};
    GD.refltex = {f:0, v:0, l:["refl1", "refl2", "refl3"]};
    GD.reflrefl = {f:0, v:1, l:["reflred", "reflgreen", "reflblue"]};
    GD.textextra = {f:0, l:["texfract3d", "texalong", "texaround", "texribs", "texalong1", "texaround1", "texribs1", "texalong2", "texaround2", "texribs2", "texdiv", "wob"]};
    GD.bump = {f:1, l:["bumpscale", "bumpstrength"]};
    GD.surftype = {f:1, l:["shininess1", "gloss1", "subband1", "plastic1", "shininess2", "gloss2", "subband2", "plastic2", "shininess3", "gloss3", "subband3", "plastic3"]};
    GD.flu = {f:0, l:["fluorescH1", "fluorescS1", "fluorescV1", "fluorescH2", "fluorescS2", "fluorescV2", "fluorescH3", "fluorescS3", "fluorescV3"]};
    GD.irid = {f:1, l:["iridescence1", "iridescence2", "iridescence3"]};
    GD.fluwidth = {f:1, l:["fluwidth"]};
    GD.screendoor = {f:0, l:["screenDoor"]};

    for (var cat in GD) {
        var list = GD[cat].l;
        var free = GD[cat].f;
        var v = GD[cat].v;
        for (var i = 0; i < list.length; i++) {
            var pgn = "_" + list[i];
            for (var gn in genedefs) {
                if (gn.endsWith(pgn)) {
                    if (free !== undefined)
                        if (newscFreezeFree.test) {
                            if (genedefs[gn].free !== free)
                                log('newscFreezeFree test', gn, genedefs[gn].free, free);
                        } else {
                            genedefs[gn].free = free;
                        }
                    if (v !== undefined) currentGenes[gn] = v;
                }
            }
        }
    }
    updateGuiGenes();
}

/** set values for branch genes */
function branchfree(v) {
    if (!genedefs.headtail_branchpK) return;
    genedefs.headtail_branchpK.free = v;
    genedefs.headtail_branchsK.free = v;
    genedefs.tail_branchpK.free = v;
    genedefs.tail_branchsK.free = v;
}


/**
code('r *= pow(fract(time*0.6 + crp*-.2), 0.05)');
**/





// patch for threejs inspector working with data.gioVR
var gxxx = function(type, data) {
    if (data) {
        var s = data.name;
        if (typeof data.name !== 'string') data.name = data.name.toString();
    }

        window.postMessage({
                type: type,
                data: data,
                source: 'threejs-extension-inspected-window'
        }, '*');

        if (data) data.name = s;
}
if (window.InspectedWin3js) InspectedWin3js.postMessageToPanel =  gxxx;

function setNovrlights() {
    copyFrom(currentGenes, setNovrlights.novrlights);
    for (let o in currentObjects)
        if (currentObjects[o] && currentObjects[o].genes)
            copyFrom(currentObjects[o].genes, setNovrlights.novrlights);
    refall();
    updateGuiGenes();
}

//showlights()
//utils.js:133  65427/1865.052+174600!!!!!!: light0 0.300 {x: 350, y: 800, z: 440, isVector3: true} directional
//utils.js:133  65427/1865.053+1: light0 0.600 {x: 1.50, y: 1.50, z: 1.50, isVector3: true} {x: -1, y: -1, z: -1, isVector3: true}
//utils.js:133  65427/1865.053+0: light0 0.200 {x: -300, y: -70, z: 80, isVector3: true} directional

setNovrlights.novrlights = {
    ambient: 0,
    light0s: 1,
    light1s: 0.2,
    light2s: 0.07,
    light0x: 350,  light0y: 800, light0z: 440,
    light1x: -350, light1y: 50,  light1z: 350,
    light2x: -300, light2y: -70, light2z: 80,

    light0r: 1,
    light0g: 1,
    light0b: 1,
    light1r: 1,
    light1g: 1,
    light1b: 1,
    light2r: 1,
    light2g: 1,
    light2b: 1,

    light0dirx: 500,  // so dir is not used, no need to set diry etc
    light1dirx: 500,
    light2dirx: 500,
    light0Spread: 0.075,
    light1Spread: 0.3,
    light2Spread: 0.5,
    light0HalfDist: 300,
    light1HalfDist: 300,
    light2HalfDist: 1300
}

/** set imposter tubes */
function setImposter() {
    if (W.IMPOSTER.checked) {  // inputs get set too late, after this is called,  TODO check
        HW.resoverride.radnum = 1;
        G.NORMTYPE = 5;
    } else {
        delete HW.resoverride.radnum;
        // leave G.NORMTYPE for noe
    }
}

function setImposterGUI() {
    msgfix.all = true;
    nomess(false);
    msgtrack('NORMTYPE HW.resoverride.radnum');
    G.NORMTYPE = 5;
    genedefs.NORMTYPE.max = 6;
    VH.killgui();
    VH.orgGUI('Imposter GUI', 'RMTYPE|ribdepth|stardepth|nstar');
    HW.resoverride.radnum = 1;
    setImposterGUI.lastRadnum = 1;
    let bb = V.gui.addButton( () => {
        const o = HW.resoverride.radnum;
        HW.resoverride.radnum = o === 0 ? 1 : o === 1 && setImposterGUI.lastRadnum !== 1 ? setImposterGUI.lastRadnum : 0;
        G.NORMTYPE = HW.resoverride.radnum ? 5 : 1;    // set NORMTYPE 5 for specials, 1 for standard
        bb.name('cycle radnum=' + HW.resoverride.radnum);
        }).name('cycle');
    let rr = V.gui.add(HW.resoverride, 'radnum', 1, 10).step(1);  // 0 is no override, use standard
    rr.onChange( (x) => { setImposterGUI.lastRadnum = x; bb.name('cycle radnum=' + HW.resoverride.radnum); } );
    logload();
    V.gui.add(logload.data, 'fullutil', 0, 2).step(0.01).listen();

    V.gui.addButton( () => {HW.dotty = false; HW.usewireframe = false;} ).name('full');
    V.gui.addButton( () => {HW.dotty = false; HW.usewireframe = true;} ).name('wire');
    V.gui.addButton( () => {HW.dotty = true; HW.usewireframe = true;} ).name('dots');
    V.gui.addButton( () => {camset();} ).name('rand view');
    V.raylength = 10000;
    VH.positionGUI();
}

// note, trying to reset as much as possible after NaN error
function repairnan(genes = currentGenes) {
    camera.quaternion.set(0,0,0,1);
    camera.position.set(0,0,0);
    camera.updateMatrix();
    camToGenes(genes);  // could repair genes for all objects ?
    renderVR.camera=0;
    showview();
    G._panx = G._pany = G._panz = 0;
    G._qux = G._quy = G._quz = 0;
    G._quw = 1;
    genestoRot4();
}

// setup for record VR-like video
function vrvideoprep() {
    startvr = false;  // prevent return VR
    fixedgenes._fov = camera.fov=40;
    camera.updateProjectionMatrix();

}

// set up for clear black white
function bwimage() {
    setAllLots('light[012]s', 0);  /// no lights
    G.ambient = 0;  // no ambient
    G.flulow = 100;  // so fluorescent bands are not visible
    setBackgroundColor('#ffffff');  // so background white
}

// tests for copying used parts of Anaconda
function copypy() {
    const r = fs.readFileSync('c:/utils/logfile.csv').toString();
    const l = r.split('\n');
    const files = {};
    for (let i=1; i<l.length;i++) {
        if (l[i].indexOf('Anaconda3') === -1) continue;
        if (l[i].indexOf('Read Data') === -1 && l[i].indexOf('Generic Read') === -1) continue;

        const f = l[i].post("D:").pre('"');
        files[f] = true;
    }
    let arr = Object.keys(files);
    arr.sort();
    let ndirs = 0, nfiles = 0, nbad = 0, size = 0, nnone = 0;
    for (let i=0; i<arr.length; i++) {
        const fid = 'd:/' + arr[i];
        const nfid = 'c:/' + arr[i];
        try {
            const stat = fs.lstatSync(fid);
            if (stat.isDirectory()) {
                ndirs++;
                fs.mkdirSync(nfid);
            } else if (stat.isFile()) {
                nfiles++;
                size += stat.size;
                fs.createReadStream(fid).pipe(fs.createWriteStream(nfid));
            } else {
                nbad++;
            }
        } catch(e) {
            nnone++;
        }
    }
    log('dirs', ndirs, 'files', nfiles, size, 'bad', nbad, 'none', nnone);
}



var posturiasync, serious, genbar, nwfs, posturibin, sleep, readdir, springdemo,
    startscript;
var dfid = 'CSynth/data/CrickLots/NGS-8179.2000.Genome.500.noself.normMatrix';
dfid = 'CSynth/data/CrickLots/NGS-9245.2000.III_ArmL.500.noself.normMatrix'
dfid = 'CSynth/data/CrickLots/NGS-8597.2000.Genome.500.noself.normMatrix'


/** code to load a matrix file, if data is given it will be used,
returns a promise that can be used to see the data */
function loadMatrix(fid = dfid, idata = undefined, nosave=false ) {
    msgfix('read', `pending<br>${genbar(0)}` )
    msgfix('process', `pending<br>${genbar(0)}` )

    return new Promise( (resolve, reject) => {

        console.time('loadMatrix');
        let header, n, ipos, startipos, iitems = 0,
            data, nzero = 0, nnzero = 0, min = 99999, max = -min, headerLine, headerStruct, reorder, trisize;
        let ci=0, cj=0;  // keep track of where we are so we can make triangle
        const asym = [];
        let asymn = 0;

        // new item found
        function item(str) {
            if (str.length === 0) return;
            const i = reorder[ci], j = reorder[cj];
            // log(i,j,opos,str);
            const opos = (i >= j) ? j + i*(i+1)/2 : i + j*(j+1)/2;
            const tv = data[opos];
            const v = +(str);

            if (v !== 0 && tv !== 0 && v !== tv) {
                const as = Math.min(v, tv)/Math.max(v, tv);
                asymn++;         // whether close or not
                if (as < 0.99)
                    asym.push({i, j, v, tv});
                // console.log('asymmetric entry for ',i, j, v, tv);
            }
            if (v === 0) {
                nzero++;        // nzero will be exaggerated for Yasu asymmetric either i,j or j,i style
            } else {
                nnzero++;
                min = Math.min(min, v);
                max = Math.max(max, v);
                data[opos] += v;
            }
            if (iitems % 2500000 === 0) {
                log('process progress', iitems, n*n, Math.round(iitems*100/(n*n)), '%');
            }
            iitems++;
            cj++;
            if (cj === n) { cj = 0; ci++; }

                // log('process progress', opos, trisize, Math.round(opos*100/trisize), '%');
        }  // item found

        // process the data d (so far) up to endpos
        async function process(d, endpos) {
            // find the header if not yet found
            if (!header) {
                const s = d.split('\n', 2);
                if (s[1] !== undefined) {
                    headerLine = s[0].trim();
                    ipos = headerLine.length + 1;
                    ( {header, headerStruct, reorder, headerLine} = CSynth.parseHeaderLine(headerLine, true) );
                    if (!headerLine) {
                        log('does not appear to be header line for file', fid);
                        ipos = 0;
                    }

                    startipos = ipos;

                    n = header.length;
                    log ('number of items', fid, n);
                    trisize = n*(n+1)/2;
                    data = new Float32Array(trisize);
                }
            }

            // parse extra available data
            // Assume sequence of blank, tab or newline between each entry
            // Usually we would expect tab along a row and newline between columns
            // but this was not always the case.
            if (header) {
                log('progress >>>', ipos, d.length);
                while(ipos < endpos) {                                 // available items
                    for (let xpos = ipos; xpos < d.length; xpos++) {  // scan for end item
                        if (d[xpos] <= ' ') {  // end of item found
                            item(d.substring(ipos, xpos));
                            if (iitems % 1000000 === 0) {
                                msgfix('process', `progress ${iitems} of ${n*n}<br>${genbar(iitems/(n*n))}` );
                                await sleep(0);
                            }
                            ipos = xpos+1;
                            while (d[ipos] <= ' ') ipos++;
                            xpos = ipos-1;
                        }
                    }    // scan for end item
                }  // available items
                log('progress <<<', iitems, n*n, Math.round(iitems*100/(n*n)), '%');

            }
        }

        async function finish(d) {
            // Aug 2023, d may already be parsed into lines, so rejoin.
            // TODO change header and process() code to use thje arrray more efficiently
            // and to allow for larger data that won't fit a Chrome string(>512MB)
            if (Array.isArray(d)) d = d.join('\n');
            await process(d, d.length);  // make sure processing finished

            // // check for bad data, assume separators \n, \t.  Seems OK
            // const lines = d.split('\n');
            // const lens = lines.map(l => l.split('\t').length);
            // lens.forEach((len, i) => {
            //     if (len !== n)
            //         log('wrong lenteh', i, len, n);
            // })

            const n2 = (d.length - headerLine.length - 1)/12;
            let ser = [];
            if (iitems !== n*n)
                ser.push(`unexpected lengths in ${fid}
expected ${n}**2 = ${n*n}, got ${iitems} items = ${iitems/n} rows`);

            if (asymn) {
                msgfix('asym', asymn, 'asymmetric items, ',  asym.length, '>1% error');
            } else {
                msgfix('asym')
            }
            if (asym.length !== 0)
                ser.push(`${asym.length} asymmetric items found, can be seen in CSynth.current.asym`)
            if (ser.length)
                serious(ser.join('\n'));
            CSynth.current.asym = asym;

            window.qqqq = {n , ipos, itarg: d.length, otarg: data.length, iitems, nn:n*n, min, max, nzero, nnzero};
            log('finished load', window.qqqq);
            console.timeEnd('loadMatrix');

            copyFrom(window.qqqq, {data, header, headerLine});
            const pref = headerLine.length+'/' + headerLine + '\n';


            if (nosave) { /**/
            } else if (nwfs) {
                writetextremote(fid + '.bintri', pref);
                writetextremote(fid + '.bintri', Buffer.from(data.buffer), true);
            } else {
                writetextremote(fid + '.bintri', new Blob([pref, data]))
            }
            resolve( {data, header, headerLine, headerStruct} );
        }

        // start body of loadMatrix
        if (idata) {  // data already avaialable, use
            // process(idata);
            finish(idata);
            return;
        }
        if (nwfs) {
            const d = nwfs.readFileSync(fid, 'ascii');
            // process(d);
            finish(d);
            return;
        }

        //const d = posturi(fid);
        //finish(d);
        //return;


        const req = posturiasync(fid, d => {
            msgfix('read', `complete ${d.length}<br>${genbar(1)}`)
            finish(d);
        });
        req.onprogress = function(e) {
            msgfix('read', `progress ${e.loaded} of ${e.total}<br>${genbar(e.loaded/e.total)}` )
        }

        //req.onload = function(evt) {
        //    req.onprogress(evt);  // in case last progress not reported
        //    finish(req.responseText);
        //    // debugger;
        //}
    });
}

async function loadMatrixBin(fid = dfid + '.binnmatrix') {
    log('start load matrix');
    const rdata = await readbinaryasync(fid);
    log('load matrix data loaded');
    const data = new Float32Array(rdata);
    log('load matrix data converted');
    loadMatrixBin.data = data; // for debug
    return data;
}

function normMatrixReader(data, fid) {
    log('in normMatrixReader', fid, data.length );
    loadMatrix(fid, data);
}
var normmatrixReader = normMatrixReader;

/** write a bintri from current data, by default all current data, however that data was derived */
function writeBintri(contact, num) {
    if (!contact) return CSynth.current.contacts.forEach((s,i) => writeBintri(s,i));
    const n = contact.numInstances;
    const r = new Float32Array(n*(n+1)/2);
    CSynth.contactsToTexture(num);      // make sure contacts have been concerted to texture
    const d = contact.textureData;
    let p = 0;
    for (let i = 0; i< n; i++)
        for (let j = 0; j <= i; j++)
            r[p++] = d[i + j*n];
    if (p !== r.length)
        console.error('writeBintri unexpected lengths', p, length(r));

    const s = [];
    for (let i=0; i < n; i++) {
        const hh = CSynth.getBPFromNormalisedIndex(i/(n-1));
        if (!hh)
           log('unexpected header', i, n);
        s.push(hh);
    }
    const ss = s.join('\t');
    const sss = ss.length + '/' + ss + '\n';

    const ff = contact.fid || contact.filename;
    saveAs(new Blob([sss, r]), ff + '.bintri');
    //     writetextremote(contact.fid + '.bintri', new Blob([sss, r]))
}

// read a pdb file for rcsb
// nb test for accessing remote data, rcsb permit CORS
function pdb(id = '4glf') {
    // const data = posturi('https://files.rcsb.org/download/' + id.toUpperCase() + '.pdb');
    const url = 'https://files.rcsb.org/download/' + id.toUpperCase() + '.pdb';
    CSynth.handlefileset( {eventParms: [{ canonpath: url}] })
}

// show data for Chromosome3D
function Chromosome3D(num=10, res = '1mb') {
    // code below will locate the data directory in different environments
    let dirn = startscript.pre('/data') + '/data/Chromosome3D/';
    if (startscript.startsWith('/csynth/serve?')) dirn = '/csynthstatic/data/Chromosome3D/'
    let dir = Object.keys(readdir(dirn));
    dir = dir.map(x => x.replace(/ /g, '_'));  // todo fid readdir
    const fid1 = 'chr' + num + '_' + res + '_matrix.txt';
    if (dir.indexOf(fid1) === -1) {
        console.error('no file', fid1);
        return;
    }
    const pref = 'chr' + num + '_' + res;
    const l = dir.filter(n => n.startsWith(pref) && n.endsWith('_a11.pdb'));
    if (l.length === 0) {
        console.error('no matching pdb file for', fid1);
        return;
    }
    log('using', fid1, l[0]);
    const o = {
        dir: dirn,
        currentLoadingDir: '',
        filename: pref + '\nautoloaded from Chromosome3D ',
        contacts: [{ filename: fid1, shortname: 'contact\n' + pref}],
        xyzs: [{ filename: l[0], shortname: 'pdb\n' + pref}]
    }
    springdemo(o);
//        CSynth.handlefileset( {eventParms: [{ canonpath: dirn+fid1}, { canonpath: dirn+l[0]}] });
}

var THREE, col3;
function fonttest(message = fonttest.toString(), size=10) {
    if (fonttest.font) {
        show(fonttest.font)
    } else {
        var loader = new THREE.FontLoader();
        loader.load( 'fonts/helvetiker_regular.typeface.json', show);
    }
    function show( font ) {
        fonttest.font = font;
        var matLite = new THREE.MeshBasicMaterial( {
            color: col3(1,1,1),
            transparent: true,
            opacity: 1, // 0.4,
            side: THREE.DoubleSide
        } );

        var shapes = font.generateShapes( message, size );
        var geometry = new THREE.ShapeBufferGeometry( shapes );
        geometry.computeBoundingBox();
        var xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
        geometry.translate( xMid, 0, 0 );

        // make shape ( N.B. edge view not visible )
        if (fonttest.text) V.camscene.remove(fonttest.text);
        var text = new THREE.Mesh( geometry, matLite );
        text.position.z = - 150;
        V.camscene.add( text );
        fonttest.text = text;

    }
}

// code below helps correct enterVR for superMedium
window.addEventListener('vrdisplayactivate', myenterVR);
var renderer, alert, onVRDisplayPresentChange, framenum;
function myenterVR() {
    msgfix('VRX', 'auto enter VR, invr=', renderVR.invr());
    renderVR.xrfs(true);
    // onVRDisplayPresentChange is not called in this context as it thinks it is already presenting
//    setTimeout(() => onVRDisplayPresentChange('from auto enter VR'), 500);
}

// make sure these do NOT return a value
window.addEventListener('vrdisplayactivate', () =>
    { msgfix('vrdisplayactivate', framenum); return; });
window.addEventListener('vrdisplayconnect', () =>
    { msgfix('vrdisplayconnect', framenum); return; });
window.addEventListener('vrdisplaydeactivate', () =>
    { msgfix('vrdisplaydeactivate', framenum); return; });
window.addEventListener('vrdisplaydisconnect', () =>
    { msgfix('vrdisplaydisconnect', framenum); return; });

/**
extrakeys['Q,Y'] = zoom Cam;
extrakeys['Q,U'] = () => zoom Cam(0);
 */

var XX = {};
// compare two matrices for almost same, truen trur or false
XX.compareMatrices = function (m1, m2, thresh = 0.001) {
    if (m1.elements) m1 = m1.elements;
    if (m2.elements) m2 = m2.elements;
    for (let i = 0; i < m1.length; i++)
        if (Math.abs(m1[i] - m2[i]) > thresh) return false;
    return true;
}

// compare two matrix sets, return two of sets containin unmatched items from the two input sets
XX.compareMatrixSets = function (ms1, ms2, thresh = 0.001) {
    ms1 = ms1.filter(x=>x);
    ms2 = ms2.filter(x=>x);
ii:    for (let i = ms1.length-1; i >= 0; i--) {
        for (let j = ms2.length-1; j >= 0; j--) {
            if (XX.compareMatrices(ms1[i], ms2[j], thresh)) {
                ms1.splice(i,1);
                ms2.splice(j,1);
                continue ii;
            }
        }
    }
    return [ms1, ms2];
}

// some variables made external to help debug/experiment
var glmol, Plane, sweep, axisOrder, VEC3, ima, m, ord, close35;

/**
 * test various symmetry generatin plans, and allow them to sweep
 * options are
 *      axes: the four axes (axis2, axis2x, axis3, axis5), by default using Plane.axis??
 *      sweep, the amount of sweep for each axis ({m5: 1, m3: 1, m2:1, m2x: 1})
 *      axisOrder: the order the axis rotations are
 *      log: a log function to output 'coverage' of this axis/saxisOrder set
 *      id: number identifying a extraPDB index
 */
//
//
XX.genSymmetry = function(options = {}) {
    // confirm axis3 and 5 as close as possible
    //log('planedot 3,5', Plane.axis5.dot(Plane.axis3));
    //var close3 = CSynth.symclose(Plane.axis5, Plane.axis3);
    //log('planedot 3,5', Plane.axis5.dot(close3));
    //var close3a = CSynth.symclose(glmol.pos.clone().normalize(), Plane.axis3);
    //var close5 = CSynth.symclose(glmol.pos.clone().normalize(), Plane.axis5);
    //log('planedot 3,5', close5.dot(close3a));

    // find a good orientation so that the 'base' instance is well aligned with axis3 and axis5
    // so that the rotations about those axes look right
    var ax35 = Plane.axis3.clone().add(Plane.axis5).normalize();
    if (ima && ima.demo) {
        var id = options.id || ima.showing;
        glmol = CSynth.xxxGlmol(id);
        if (!glmol.pos) CSynth.posStats(id);
        close35 = CSynth.symcloseAll(ax35, glmol.pos.clone().normalize());
    }

    function mr(ax,r) {
        const ang = r * 2 * Math.PI;
        return new THREE.Matrix4().makeRotationAxis(ax, ang);
    }
    var min = Math.min;

    var {axis2, axis2x, axis3, axis5} = options.axes || Plane;  // Plane is 'standard' axes
    sweep = {m5: 1, m3: 1, m2:1, m2x: 1};
    if (options.sweep) copyFrom(sweep, options.sweep);
    var oord = axisOrder = options.axisOrder || [5, 2, 3, -2].reverse();
    var dolog = options.log;

    // axis2 = VEC3({x: -0.8090169945271113, y: 0.5000000005770467, z: -0.30901699510050656})
    // axis2 = VEC3({x: -0.3090169940902913, y: 0.8090169953638635, z: -0.5000000004311589});
    // axis2 = VEC3({x: 0.201, y: 0.055, z: 0.978});
    // axis2 = VEC3(0,0,-1);
    // axis2x = VEC3(-0.808, -0.492, -0.324);

    // ord = [2, -2, 3, 5]
    var {m5, m3, m2, m2x} = sweep;
    // sym.splice(0, 10000)
    var sym = [], symCol = XX.symCol = [];
    m = {};
    let ci, cj, ck, cl;

    for (let j=0; j<2; j++) {
        m[2] = mr(axis2, cj = min(m2, j/2));
        for (let l=0; l<2; l++) {
            m[-2] = mr(axis2x, cl = min(m2x, l/2));
            for (let i=0; i<5; i++) {
                m[5] = mr(axis5, ci = min(m5, i/5));
                for (let k=0; k<3; k++) {
                    m[3] = mr(axis3, ck = min(m3, k/3));
                    var mm = new THREE.Matrix4();
                    for (let q=0; q<oord.length; q++) mm.multiply(m[oord[q]]);
                    if (close35) mm.multiply(close35.m);
                    sym.push(mm);
                    symCol.push(col3().setHSV( (10*ci+1)/12, (1-ck), cj ? 1 : 0.5));   // rgb  (i/5, (j+2*l)/4, k/3));
                    //if (i === 0) sym12.push(mk);
                    //if (k === 0) sym20.push(ml);
                    //symCol.push(col3(i/5, (j+2*l)/4, k/3));
                }
            }
        }
    }

    var comp = XX.compareMatrixSets(sym, CSynth.sym60);
    msgfix('compare sets', comp[0].length);
    if (dolog) dolog('compare sets', comp[0].length);
    return sym;
}
/*
XX.genSymmetry({axisOrder: [2, -2, 3, 5], log})
XX.genSymmetry({axisOrder: [5, 2, 3, -2], log});  // << this one works with initial definitions of axes
// CSynth.applyBiomt(id, 0, sym)
*/

/** map the distances from CA, to find 'far out' points for each residue type  */
XX.findFurthest = function(ats, ca = 'CA') {
    const cas = {};
    ats.forEach(at => {
        const k = at.resi + '_' + at.atom;
        cas[k] = at;
    });
    const mm = {};
    const bad = [];
    ats.forEach(at => {
        const k = at.resn + '_' + at.atom;
        const s = mm[k] = mm[k] || {n: 0, min: 1000, max: 0, s: 0, resn: at.resn};
        const caa = cas[at.resi + '_' + ca]
        if (caa) {
            const d = distxyz(at, caa);
            s.min = Math.min(s.min, d);
            s.max = Math.max(s.max, d);
            s.s += d;
            s.n++;
        } else {
            bad.push(at);
        }
    });
    for (const k in mm) mm[k].avg = mm[k].s / mm[k].n;

    const furthest = {};
    for (const k in mm) {
        const s = mm[k];
        const f = furthest[s.resn] = furthest[s.resn] || {avg: -999}
        if (s.avg > f.avg)
            furthest[s.resn] = s;
    }

    return {furthest, mm, bad};

}

var addscript, zzzz, dat, X;
function hornmeta() {
    addscript('shaders/marching.js')
    addscript('CSynth/metavis.js',z)
    function z() {
        zzzz = new CSynth.Metavis();
        V.rawscene.metavis.visible = true;
        V.gui = dat.GUIVR.createX('TESTTEST');
        V.gui.add(zzzz.createGUIVR());
        VH.positionGUI();
        X.spherePosScale.w = 1;
        X.sphereYin = true;
        G.vsub_radius = 0.001;
        V.camscene.onBeforeRender = V.rawscene.children[1].onBeforeRender; // patch for three bug
        G.scaleFactor = 1;
    }
}

EX.materials = [];
EX.baseTHREERawShaderMaterial = THREE.RawShaderMaterial;
THREE.RawShaderMaterial = function(...a) {
    const mat = new EX.baseTHREERawShaderMaterial(...a);
    EX.materials.push(mat);
    return mat;
}

// special console function queryObjects (NOT console.queryObjects) can collect the information very usefully
// but only from console, and result comes as null with an async listing of result
// function qqqq() {return queryObjects(EX.baseTHREERawShaderMaterial)};


/** iterate to find used uniforms */
function usedUniforms() {
    return showUniformsUsed().all;
}

/** find unused uniforms  */
function unusedUniforms() {
    return arraydiff(Object.keys(uniforms), usedUniforms());
}

/** prepare to save big images, set details for William 16/11/2020 */
function bigimprep(vp = 0) {
    renderVR.xrfs(false);
    onframe( () => {
        setViewports([vp,vp]);
        setInput(W.previewAr, true);
        setInput(W.layoutbox, 3);   // big top right
        V.wallAspect = G.wallAspect = 1;
        Director.framesFromSlots = nop; // director does not work right with layoutbox 3
        tad.continuousActive = false;
        tad.isInteract = false;
    },2);
}

var setExtraKey, newmain;
/** experiment with feedback */
function feedbacktests() {
    setInput(W.genefilter, '');
    setInput(W.fixcontrols, true);
    showControls(true);
    setInput(W.guifilter, 'feedsc | centrerefl | wall_bump | flatwall | wall_refl | wall_texsc | background | wall_band | light | aspect:');

    cMap.fixres = 4096;
    setExtraKey('Q,R,1', 'feedback res 32', () => cMap.fixres = 32)
    setExtraKey('Q,R,2', 'feedback res 64', () => cMap.fixres = 64)
    setExtraKey('Q,R,3', 'feedback res 128', () => cMap.fixres = 128)
    setExtraKey('Q,R,4', 'feedback res 256', () => cMap.fixres = 256)
    setExtraKey('Q,R,5', 'feedback res 512', () => cMap.fixres = 512)
    setExtraKey('Q,R,6', 'feedback res 1024', () => cMap.fixres = 1024)
    setExtraKey('Q,R,7', 'feedback res 2048', () => cMap.fixres = 2048)
    setExtraKey('Q,R,8', 'feedback res 4096', () => cMap.fixres = 4096)

    tad.greywall = ()=>{};
    GUIwallkeys();

    genedefs.flatwallreflp.min = 0;
    genedefs.wall_bumpscale.min = 0.1;
    genedefs.wall_bumpscale.max = 4 * basescale;
    genedefs.wall_bumpscale.delta = 0.1 * basescale;
    genedefs.wall_bumpscale.step = 0.01 * basescale;
    mutateVisibleGenes();
    updateGuiGenes();
    runkeys('K,J,5');

    G.wallAspect = V.wallAspect = 1;
    G.centrerefl = 1;
    if (V.gui) V.gui.visible = false;
    tad.colorCyclePerMin=0;
    setInput(W.resbaseui, 10);

    // not sure why this was needed, helps force feeback to happen
    onframe(()=> { cMap.fixcamera.position.set(800,700,-200); cMap.fixcamera.lookAt(0,0,0);}, 10);
}


/** set up view for big Shanghai image */
function shangbig({h = 3.8, w = 4, far = 4, veye = 1.3} = {}) {
    // var h = 4;      // height, metres
    // var w = 7;      // width, metres
    // var far = 4;    // dist of viewer from image
    // var veye = 1.3; // viewer eye height
    h *= basescale; w *= basescale; far *= basescale; veye *= basescale;

    _boxsize = h/2;
    setInput(W.imageasp, w/h);
    setInput(W.previewAr, true);
    G.wallAspect = V.wallAspect = 1;  // (or equivalently -w/h)

    G._camz = far;
    G._camy = veye - h/2;
    G._fov = 2 * Math.atan2(h/2, far) * 180 / Math.PI;

    camera.setViewOffset(width, height, 0, G._camy/h * height, width,height);
    camera.near = 2;
    camera.far = far + h/2 + 0.1;

    G.walltype = 0;
    G.wallSize = 1;
    genedefs.wall_bumpscale.min = 0;

    if (G.name.startsWith('GalaxRefl')) {
        genedefs.wall_bumpscale.max = 2000;

    //     setViewports([0,0]);
    //     G.wall_bumpstrength = 0;
    //     cMap.SetRenderState('walls');
        G._scale = 1.6;
        G.a_pulserate = G.b_pulserate = 0;
    //     setNovrlights();
    //     tad.wallkeys();
    //     extrakeys['K,J,8']();
    //     setAllLots('wall_', {free:0});
    }

    setInput(W.FLATWALLREFL, true);   // just in case
    setInput(W.FLATMAP, true);   // just in case
    setInput(W.resbaseui, 9);
    setInput(W.renderRatioUi, 0.5);

    updateGuiGenes();
    setSize();          // not sure why this is needed but helps the aspect etc actually happen
}

/** setup for March 2021 */
function march2021() {
    camera.clearViewOffset();       // ensure camera centred
    cMap.SetRenderState('walls');   // use walls
    plainwalls();
    tad.covdef.hideWalls = true; tad.covidSetScene();
}

/** make walls plain */
function plainwalls() {
    // cMap.newmesh(undefined, currentGenes, {x:10, y:10, z:1});   // walls very wide, only back wall seen.
    // use setAllLots below so all objects already created are changed
    if (extrakeys['K,J,8']) runkeys('K,J,8');   // so gui updated
    cMap.SetRenderState('walls')

    setAllLots('walltype', 0);      // so it's a plane wall, not superegg
    setAllLots('wallAspect', -1);   // -1 is 'real' square and gets shadows etc right
    if (!tad.docovid) setAllLots('_camy', 0);         // camera centre height (in case of previous distortion for shanhai wall)
    setAllLots('wall_band', 0);     // including bandbetween
    setAllLots('wall_band1', 9999);
    setAllLots('wall_bump', 0);
    setAllLots('wall_irid', 0);
    setAllLots('wall_flu', 0);
    setAllLots('wall_gloss', 0);
    setAllLots('wall_refl', 0);
    setAllLots('wall_subband', -1);
    setAllLots('wall_red', 1);
    setAllLots('wall_green', 1);
    setAllLots('wall_blue', 1);
    setAllLots('wall_', {free:0});  // freeze all wall genes
    if ('wall_bumpstrength' in genedefs) genedefs.wall_bumpstrength.min = 0;
    refall();
}

/** set up for GalaxReflB, partial record of differences from GalaxRefl */
function bigandbold() {
    setAllLots('_ribs', 200);
    setAllLots('_ribs', {min: 100, max: 300});
    setAllLots('texscale', 200);
    setAllLots('texscale', {min:50, max:500});
    G.colSaturation = 3

}

/*
n.b. launch old versions etc
http://localhost:8800/,,/,,/,,/,,/,,/,,/csynthstaticoldversions/rev8096/csynth.html?startscript=/csynth/data/Lorentz/lorentz.js

*/

var ZZtests = [
    ['threek.html?', 'threek'],
    ['threek.html?tadkin', 'tad'],
    ['csynth.html?', 'csynth'],
    ['csynth.html?startscript=rsse/loadrsse.js', 'rsse'],
    ['csynth.html?startscript=CrickLots/lots.js', 'crick'],
    ['csynth.html?startscript=ima/lowry.js', 'lowry'],
    ['csynth.html?startscript=YorkStudents/newtest_v5.js', 'york'],
    ['csynth.html?startscript=Lorentz/lorentz.js', 'lorentz'],
    ['csynth.html?startscript=SteveJan19/test.js', 'steve'],
    ['csynth.html?startscript=covid/spike.js', 'covid'],
    ['csynth.html?startscript=pdbs/1GFL.pdb', 'pdb'],
    ['csynth.html?startscript=tric/tric.js', 'tric'],

    // fails because of test= mixing wrong with javascript style ";
    // ['csynth.html?startscript="YorkStudents/capsid.pdb";if(window.onframe)onframe(()=>{G.springrate=5;G.stepsPerStep=20},4)', 'capsidBigpdb']
];
var searchReplace;
var tests = Object.entries(searchReplace);

var testtime = 15000;
/** runtest should be called with correct details in url ready set up  */
function runtest(n = searchValues.test) {
    if (n === false) return;
    if (n === true) endtest(isCSynth ? 1 : -1);
    setTimeout(endtest, testtime)
}

var startcommit;
/** called when one particular test ends */
async function endtest(n = searchValues.test) {
    const ds = islocalhost ? getdesksave().replace(/\//g, '\\') : '';
    if (n !== -1) {
        if (islocalhost) {
            EX.toFront();
            await sleep(200);
            await S.frame(2);
            runcommandphp('mkdir ' + ds + 'tests');
            nircmd('savescreenshotwin ' + ds + 'tests/' + tests[n][0] + '.jpg');
        } else {
            await downloadImageGui(tests[n][0], 'jpg')
        }
    }

    n++;
    if (n < tests.length) {
        //const bpath = location.pathname.split('/').slice(0, -1).join('/');
        //const nexttest = location.origin + bpath + '/' + tests[n][0] + '&test=' + n
        const nexttest = location.href.replace(location.search,'') + '?' + tests[n][0] + '&test=' + n;
        log(nexttest);
        location.href = nexttest;
    } else if (islocalhost) {
        const nn = 'tests_' + startcommit.split(' ')[2] + '_' + (new Date().toISOString()).replace(/:/g, ".")
        runcommandphp('rename ' + ds + 'tests ' + nn);
        msgfix('regression', 'test results in ' + nn);
        runcommandphp('start ' + ds + nn);
    } else {
        msgfix('regression', 'test results available in download directory');
    }
}

var dateToFilename = (pre = '', post='') => pre +  (new Date().toISOString()).replace(/:/g, ".") + post;

/** placeholder to put test java to see what the compiler thinks */
function testfun() {

}

/** can be called automatically on load of an oao file */
function checkoao(fn) {
}

/** patch pulse values to good ranges */
function patchPulse() {
    if (!genedefs.a_pulserate) return;
    // if (!confirm('overwrite pulse details?')) return;
    setAllLots('_pulserate', {step:0.001, delta:0.001, max: 0.2})
    setAllLots('a_pulserate', 0.073);
    setAllLots('b_pulserate', 0.057);
    //genedefs.a_pulserate.step = genedefs.a_pulserate.delta = 0.001
    //genedefs.a_pulserate.step = genedefs.a_pulserate.delta = 0.001
    setAllLots('a_pulsescale', 0.5);
    setAllLots('b_pulsescale', 0.4);
}


// ERROR: 0:60: 'r' : undeclared identifier
// ERROR: 0:60: 'tadprop' : undeclared identifier
// ERROR: 0:60: 'texture2D' : no matching overloaded function found
// ERROR: 0:60: 'x' :  field selection requires structure or vector on left hand side
// ERROR: 0:60: 'assign' : l-value required (can't modify a const)


/** check the shader for an hset compiles, return error string if fails */
function checkHsetShader(hset = currentHset) {
    const ss = `precision highp float; float crp, userp,x,y,z;
#define stack(s)
#define scale(q)
#define branchspiralX(s, p, rpb, rribs, rrref)
#define branchanimX(s, p, grownum, rpb, rribs, rrref)
#define warp(v,amp,offset)
#define reflx(v)
#define radiate(v)
#define topfollow

// for springs etc
#define HEADS 16
#define ppos(v) vec4(0)
#define setxyz(v)
#define texture2D(a,b) vec4(1,0,0,0)
float r;



${hset.uniforms}
struct Parpos { vec4 aq; vec4 bq; };
float dotParpos (const vec4 la, const vec4 lb, const Parpos r) { return dot(la, r.aq) + dot(lb, r.bq); }

void twr(inout float xx, inout float zz, const float v, const float offset) {}
void twr(inout float xx, inout float zz, const float v) {}
void twr(inout float xx, inout float zz, const float v, const float offset, const float phase) {}
uniform vec3 springCentre;    // tadpole specific? work out where to put correctly


void bb(){
    float rp;
    Parpos parpos;
    ${hset.setupcode}
    ${hset.trancode}
}
void main(){}` + ' '.repeat(150);

return _compileShader(ss, gl.FRAGMENT_SHADER);
// return ss;
}

/** compile a given string as a shader, return undefined for OK, or error string */
function _compileShader(string, type) {
    // log("TEST", string);
    // if (string.length < 100)
    //     string = "#version 140\n" + getfiledata(string).toString();

    let shader = gl.createShader(type);

    gl.shaderSource(shader, string);
    gl.compileShader(shader);

    const r = gl.getShaderInfoLog(shader);
    if (r !== '') {
        log('compileShader: gl.getShaderInfoLog()', type === gl.VERTEX_SHADER ? 'vertex' : 'fragment', r); // , addLineNumbers( string ) );
    }

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        // console.error('compileShader: Shader couldn\'t compile.');
        return r;
    }
}

// function testexp() {
//     _compileShader('exportShader/frag.fs', gl.FRAGMENT_SHADER);
//     _compileShader('exportShader/vert.vs', gl.VERTEX_SHADER);
//     // serious('tested');
// }


var _CodeMirrorInstance, HornSet, _testcompile, _lastchecked;
/** check a tranrule, and if x = console show times */
function checkTranruleAll(rcode = _CodeMirrorInstance.getValue(), x = {time: nop, timeEnd: nop}) {
    if (rcode === _lastchecked) return;
    _lastchecked = rcode;

    const code = substituteExpressions(rcode)
    // return;
    ////console.profileEnd('checkTranruleAll') // ??? just in case
    const s = [_testcompile, currentHset];
    currentHset = undefined;
    try {
        // nb, similar to setuphorn, may merge???
        _testcompile = true;
        ////console.profile('checkTranruleAll')
        x.time('parse');
        const dummyHset = new HornSet();
        window.xxhset = dummyHset;
        const rr = dummyHset.parsehorn( code, undefined, true);
        x.timeEnd('parse');
        if (rr.error) return 'parse error: ' + rr.error;
        dummyHset.tranrule = code;

        x.time('compile');
        try {
            dummyHset._compilehs(dummyHset.tranrule, {});
        } catch (e) {
            return 'our compile error: ' + e;
        } finally {
            x.timeEnd('compile');
        }

        x.time('gl check');
        const herr = checkHsetShader(dummyHset);
        x.timeEnd('gl check');
        if (herr) return 'gl compile error: ' + herr;
    } finally {
        ////console.profileEnd('checkTranruleAll')
        [_testcompile, currentHset] = s;
    }
}



// // from https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// async function* makeTextFileLineIterator(fileURL) {
//     const utf8Decoder = new TextDecoder('utf-8');
//     const response = await fetch(fileURL);
//     const reader = response.body.getReader();
//     let { value: chunk, done: readerDone } = await reader.read();
//     chunk = chunk ? utf8Decoder.decode(chunk) : '';

//     const re = /\n|\r|\r\n/gm;
//     let startIndex = 0;
//     let result;

//     for (;;) {
//       let _result = re.exec(chunk);
//       if (!_result) {
//         if (readerDone) {
//           break;
//         }
//         let remainder = chunk.substr(startIndex);
//         ({ value: chunk, done: readerDone } = await reader.read());
//         chunk = remainder + (chunk ? utf8Decoder.decode(chunk) : '');
//         startIndex = re.lastIndex = 0;
//         continue;
//       }
//       yield chunk.substring(startIndex, _result.index);
//       startIndex = re.lastIndex;
//     }
//     if (startIndex < chunk.length) {
//       // last line didn't end in a newline char
//       yield chunk.substr(startIndex);
//     }
//   }

// async function loadfile(urlOfFile) {
//     const lines = [];
//     for await (let line of makeTextFileLineIterator(urlOfFile)) {
//         lines.push(line);
//     }
//     return lines;
// }

/** from xyz
 *  await asyncFileReader(raw, lineSplitter((line, numLines, bytesProcessedSoFar, bytesReadSoFar, length) =>
 *      linex(line, numLines, bytesProcessedSoFar, bytesReadSoFar, length)));

await asyncFileReader(file, lineSplitter((line, numLines, bytesProcessedSoFar, bytesReadSoFar, length) => log(line)));

*/

/** read file in chunks and submit chunks to chunkProcess(chunk, bytesSoFar, length) */
async function asyncFileReader(file, chunkProcess = log, endProcess = () => log('end'), chunksize = 2**17) {
    let off = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const slice = file.slice(off, off + chunksize);
        const chunk = await slice.text();
        if (chunk.length === 0) break;
        off += chunksize;
        chunkProcess(chunk, off, file.size);
    }
    endProcess();
}

/** read file in chunks, break into lines, and submit lines to lineProcess(line, numLines, bytesProcessedSoFar, bytesReadSoFar, length) */
function lineSplitter(lineProcess = (l,n, b, bsf, len) => {if (n%100 === 0) log(n, l, b, bsf, len);} ) {
    let pend = '';
    let lines = 0, bytes = 0;
    return function(chunk, bytesSoFar, length) {
        const ll = chunk.split('\n');
        ll[0] = pend + ll[0];
        pend = ll[ll.length-1];
        for (let i = 0; i < ll.length-1; i++) {
            bytes += ll[i].length + 1;
            lineProcess(ll[i], ++lines, bytes, bytesSoFar, length);
        }
    }
}

/** determine if dom node is visible, based on dispelay none or hidebelow */
function isDisplayed(h) {
    if (h === document) return true;
    if (h.style.display === 'none') return false;
    if (h.classList.contains('hidebelow')) return false;
    return isDisplayed(h.parentNode);
}

/** clear various memory */
function clearMemory() {
    clearPostCache();
    for (let k in material) {
        const xx = material[k];
        for (let kk in xx) {
            const mat = xx[kk];
            if (!(mat instanceof THREE.Material)) continue;
            mat.vertexShader = mat.fragmentShader = undefined;
        }
    }
    renderer.info.programs = [];
    THREE.Cache.clear();
}

const _xxx = new Float32Array(1);
/** return value of number when saved as float32 */
function f32(x) {
    _xxx[0] = x;
    return _xxx[0];
}
var float32 = f32;

/** convenience function to set light parameters, eg setlight(0, {x:0, y:5, z:8}) */
function setlight(k, p) {
    const lk = 'light' + k;
    //const s = (n, v) => G[lk + n] = v;
    for (const n in p) {
        let v = p[n];
        if (Array.isArray(v)) v = vec3(v);
        if (n === 'pos') setlight(k, v)
        else if (n === 'dir') setlight(k,  {dirx: v.x, diry: v.y, dirz: v.z} )
        else if (n === 'targ') setlight(k, {dir: vec3().subVectors(v, SG[lk + 'xyz'])});
        else if (n === 'rgb') setlight(k, {r: v.x, g: v.y, b: v.z});
        else G[lk + n] = v;
    }
}

/** test function for tadpole interations, can change dynamically
 * to set for ui and ui+1
 *  U.twist[ui]
    U.linebaitAttractStrength[ui]
    U.excludeRadius[ui]
    U.excludeForce[ui]
    U.condir[ui]
*/
function tadmodetest(ui) {
    const me = tad;
    let bd = tad.batondata[ui];
}

/** find the uniforms in .opt. files */
async function findUniforms(fids = ['minicode/opos.opt.fs', 'minicode/opos.opt.vs'],
                           exclude = {modelViewMatrix: 1, projectionMatrix: 1}) {
    const uu = {};
    for (const fid of fids) {
        const t = await (await (await fetch(fid)).text()).split('\n');
        for (let line of t) {
            line = line.trim();
            if (line.startsWith('uniform')) {
                const name = line.split(';')[0].split(' ').pop().pre('[');
                if (!exclude[name])
                    uu[name] = U[name];
            }
        }
    }
    return uu;
}

//
// NOTE the combination blows up: usemask = -97; inps.USESKELBUFFER = false; inps.GPUSCALE = false;

async function genmini({all = true, exclude = {modelViewMatrix: 1, projectionMatrix: 1}, shorten=false, shortenh=true} = {}) {
    shadows(0);
    usemask = 4;
    inps.USESKELBUFFER = false;
    inps.GPUSCALE = false;
    await S.frame(5);
    regenHornShader();
    await S.frame(5);
    setViewports([0,0]);
    inps.tranrulebox = currentGenes.tranrule = currentGenes.tranrule.replace(/pulser\(.*?\)/g, "''")
    if (all) {
        // set up minimal rendering

        // export the relevant shaders
//        runcommandphp('del /s /q exportShader\\mini\\*');
        await exportmyshaders(undefined, 'mini');
//        runcommandphp('del minicode\\*.opt.*');
    }
    inps.USESKELBUFFER = true;   // otherwise gives issues with gscale and usemask=-97
    centrescalenow();
    await S.frame(5);

    // prepare and run minifier
    runcommandphp('copy exportShader\\mini\\*.opt.* minicode');
    runcommandphp('copy exportShader\\mini\\extras\\*B.* minicode');
    runcommandphp('copy exportShader\\mini\\extras\\*mini.* minicode');
    //// below now done by exportmyshaders()
    //let mc = readtext('exportShader\\mini\\extras\\oposB.vs')
    //mc = '#version 300 es\n' + mc;
    //writetextremote('minicode\\oposB.vs', mc);
    // const smopts = '--format text --preserve-externals --zformat js --zno-renaming --format indented'
    // const smcmd = `..\\glsl_optimize\\shader_minifier.exe ${smopts} minicode\\oposB.vs -o minicode\\oposmini.vs`
    // const rr = runcommandphp(smcmd);

    //// below to get an idea of size
    // const smcmd2 = `..\\glsl_optimize\\shader_minifier.exe ${smopts} minicode\\opos.opt.vs -o minicode\\oposminiopt.vs`
    // const rr2 = runcommandphp(smcmd2);

    // generate the uniforms file
    // const uu = await findUniforms(dd);
    const vv = showUniformsUsed().all;
    const uu = {};
    for (const gn of vv) if (!gn.endsWith('_cutoffset')) uu[gn] = U[gn];
    // showUniformsUsed().all should do this, but gets lots of xxx_cutoffset uniforms
    // the .opt method had some issues and required extra generation work, so reverted to showUniformsUsed() as above
    // For some reason showUniformsUsed() doesn't find lennum, but that is easily fixed.

    // generate the uniforms file
    const r = ['/* eslint-disable no-sparse-arrays */', 'var U, R, v2, v3, v4, m3, m4', `var sourcename='${inps.savename || G.name}'`];
    for (let gn in uu) {
        const gd = genedefs[gn];
        if (gd && gd.free && !gn.endsWith('_num') && !gn.endsWith('_ribs'))
            r.push(`R.${gn}=[${f(gd.min)},${f(gd.max)},${f(uu[gn])}]`)
        else
            r.push(`R.${gn}=[${f(uu[gn])}]`)
    }
    const miniuniforms = r.join('\n');
    writetextremote('minicode\\miniuniforms.js', miniuniforms);


    collectmini({exclude, shorten, shortenh, uu});


    function ff(v) { return format(v,6,true); }

    //
    function f(v) {
        if (typeof v === 'number') return ff(v);
        if (v === undefined) return 'undefined'
        if (v.isVector2) return `v2(${ff(v.x)},${ff(v.y)})`
        if (v.isVector3) return `v3(${ff(v.x)},${ff(v.y)},${ff(v.z)})`
        if (v.isVector4) return `v4(${ff(v.x)},${ff(v.y)},${ff(v.z)},${ff(v.w)})`
        if (v.isMatrix3) return `m3(${v.elements.map(z=>ff(z)).join(',')})`  // using ff(v.elements) gave extra []
        if (v.isMatrix4) return `m4(${v.elements.map(z=>ff(z)).join(',')})`  // using ff(v.elements) gave extra []
        if (Array.isArray(v)) return ff(v).replaceall('U,', ',')
        // if (Array.isArray(v)) return `[${v.map(x => x??'undefined').join(',')}]`
        return 'undefined /*?texture?*/'
    }

}

async function collectmini({exclude = {modelViewMatrix: 1, projectionMatrix: 1}, shorten=false, shortenh=true, uu} = {}) {
    let sizes = {}, totsize = 0;

    const miniuniforms = readtext('minicode\\miniuniforms.js');
    totsize+= sizes.miniuniforms = miniuniforms.length;

    // use the optimized versions to find uniforms actually used
    const dd = Object.keys(readdir('exportShader\\mini')).filter(n => n.indexOf('.opt.') !== -1)
        .map(n => 'minicode\\' + n);


    var allglsl = ''
    // read the source glsl files, hand tuned shaders or 'fix' version if available, otherwise auto generated mini version
    function glsl(id) {
        let vert = readtext('shaders\\' + id + '.vs', true);
        if (!vert) vert = readtext('minicode\\' + id + 'fix.vs', true);
        if (!vert) vert = readtext('minicode\\' + id + 'mini.vs');
        let frag = readtext('shaders\\' + id + '.fs', true);
        if (!frag) frag = readtext('minicode\\' + id + 'fix.fs', true);
        if (!frag) frag = readtext('minicode\\' + id + 'mini.fs');
        const rr = `
            S.${id}vert = \` ${vert}\`
            S.${id}frag = \` ${frag}\`
        `
        allglsl += rr;
        totsize+= sizes[id + 'vert'] = vert.length
        totsize+= sizes[id + 'frag'] = frag.length
        return rr;
    }

    // prepare total text
    const code = readtext('minicode\\miniorganics.js');
    totsize+= sizes.code = code.length;
    // const track = readtext('jsopen/TextureMaterial/minicode\\miniorganics.js');
//     let html = `<!DOCTYPE html><html style="background: black"><meta charset="utf-8"/><head>
//     <!-- <script src=",,/jsdeps/three127.js"></script> -->
//     <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> -->
//     <script src="https://threejs.org/build/three.js"></script>

//     <script type="text/javascript">
//     ${code}
//     ${glsl('opos')}
//     ${glsl('edge')}
//     ${miniuniforms}
//     var module={}
//     </script>

// <script src="https://cdn.jsdelivr.net/npm/three-trackballcontrols@0.0.8/index.min.js"></script>

//     </head></html>
//     `
    let html = readtext('minicode\\miniorganic.html');
    totsize+= sizes.html = html.length;

    html = html.replace('<script src="miniorganics.js"></script>', '');
    html = html.replace('<script src="miniuniforms.js"></script>',
`     <script type="text/javascript">
     ${code}
     ${glsl('opos')}
     ${glsl('edge')}
     ${miniuniforms}
     var module={}
     </script>
`);

    sizes.htmlpre = html.length;
    sizes.uniforms = miniuniforms.length;

    if (uu) {
        // find unused uniforms that did get skaken by the optimizer but didn't get shaken by the minimizer
        const usets = allglsl.split('uniform ');
        usets.shift();
        for (const uset of usets) {
            const sset = uset.pre(';').post(' ').split(',');
            for (const nu of sset) {
                const nnu = nu.pre('[');
                if (!exclude[nnu] && uu[nnu] === undefined) uu[nnu] = 'X';
            }
        }
        window.xxxuu = uu;
    }

    // shorten uniform names
    // three possibilities, 'U': used, 'X': unused but seen and needed in code, 'Q': not needed
    if (shorten && !uu) console.error('collectmini: shorten requested bbut no uu')
    if (shorten && uu) {
        const kuu = Object.keys(uu).sort((a,b) => a.length > b.length ? -1 : 0)
        kuu.forEach((v, i) => {
            let k = uu[v] === 'X' ? 'X' : 'U';
            const rg = new RegExp(`(\\W)${v}(\\W)`, 'g')
            const matches = html.match(rg).length;
            if (matches < 2) {
                // log('short split', v, spl.length);
                k = uu[v] = 'Q';
            }
            html = html.replace(rg, `$1${k}${shorten ? i : v}$2`)
            // html = spl.join(k + (shorten ? i : (v[0] + 'i' + v.substring(1))));
        });
    }

    if (shortenh) {
        let i = 0;
        const hornnames = miniuniforms.match(/R\.(.*?)_/g).filter((v,ii,a) => a.indexOf(v) === ii).map(x => x.substring(2))

        for (const hn of hornnames) {  // horn name, did use currentHset.horns, needed ${hn}_ below
            const hc = String.fromCharCode('A'.charCodeAt(0) + i++);  // horn character
            html = html.replace( new RegExp(`(\\W)${hn}`, 'g'), `$1${hc}_`);
        }
        const ss = {bend: 'b', twist: 't', stack: 's', ribs: 'r', ribdepth: 'd', radius: 'R',
                   cutoffset: 'C', twistoff: 'w', sweep: 'S', branch: 'B', flap: 'f'};
        for (const op in ss) {
            const sop = ss[op];
            html = html.replace( new RegExp(`_${op}(\\W)`, 'g'), `_${sop}$1`);
        }
    }
    log('sizes', sizes)
    log('totsize', totsize)
    log('shortensize', html.length)

    const handle = await savesystem.save('minicode', undefined, html, [{accept: {'text/html': '.html'}}])
    writetextremote('minicode\\test\\' + handle.name, html);


    log('genmini complete')
}

/** generate a shader from explict files, eg edge.vs and edgs.fs
 * Note: this still requires uniforms to be available in the shared uniform object
 */
function shaderFromFiles(name = 'edge', genes = currentGenes) {
    const vertexShader = readtext(`/shaders/${name}.vs`).replace('#version', '// # version');
    const fragmentShader = readtext(`/shaders/${name}.fs`).replace('#version', '// # version');

    const shader = new THREE.RawShaderMaterial({vertexShader, fragmentShader, uniforms});
    shader.glslVersion = THREE.GLSL3;
    if (!material.name) material.name = {};
    material[name]['horn("main");'] = shader;       // so it can be seen by getMaterial
    material[name][genes.tranrule.split('SynthBus')[0]] = shader;               // so it can be seen by getMaterial
    return shader;
}


// ~~~~~~~~~~~~~~~~~ below may live in genes.ts, here for quicker edit/debuf

var  resolveFilter, allGeneSets
/** rerange all genes matching pattern, set genedefs min/max */
function rerangeAllLots(ppattern, min, max, allg = []) {
    const pattern = resolveFilter(ppattern);
    const ggs = allGeneSets();

    for (var gn in pattern) {
        var gd = genedefs[gn];
        if (gd) {
            const omin = gd.min, omax = gd.max;
            const sc = (max - min) / (omax - omin)
            gd.min = min;
            gd.max = max;
            gd.delta *= sc;
            gd.delta *= sc;
            gd.def = (gd.def - omin) * sc + min;

            for (const gg of ggs) {
                if (typeof gg[gn] === 'number') {
                    const v = (gg[gn] - omin) * sc + min
                    if (gg[gn] !== v) log(xxxvn(gg), gn, gg[gn], v);
                    gg[gn] = v;
                } else {
                    log('cannot rerange', gn)
                }
            }
        }
    }
    updateGuiGenes();
    refall();
}

Object.defineProperty(window, 'edgecolour', {
    get: () => U.profcol.b === 0,
    set: (b) => {
        const c3 = col3;
        if (b === undefined) b = U.profcol.b !== 0;
        if (b) {
            U.fillcol = c3(1,1,1)
            U.edgecol = c3(0,0,0)
            U.occcol = c3(1,1,0)
            U.profcol = c3(1,0,0)
            U.backcol = c3(0.2,0.2,0.2)
            U.wallcol = c3(0,1,0.2)
            U.unkcol = c3(0,1,1)
        } else {
            U.fillcol = c3(1,1,1)
            U.edgecol = c3(0,0,0)
            U.occcol = c3(1,1,1)
            U.profcol = c3(1,1,1)
            U.backcol = c3(0.3, 0.3, 0.3)
            U.wallcol = c3(0,1,0.2)
            U.unkcol = c3(0,1,1)
        }
    }
});

/** function to protect writing of some builtin features (silly spec???) */
function protectWrite(name, o=window) {
    Object.defineProperty(o, name, {
        get: Object.getOwnPropertyDescriptor(o, name).get,
        set: v => {console.error('abuse of set', name, v); return}
    })
}
'innerWidth innerHeight devicePixelRatio'.split(' ').forEach(x => protectWrite(x));

/** find files used but not available in github */
function findnewfiles(src, done=[]) {
    if (!src) {
        const ff = readdir('networkruns')
        for (const fff of Object.keys(ff)) findnewfiles(fff, done);
        return done;
    }
    var data = readtext(`networkruns/${src}`)
    var d2 = data.split('\n')
    for (var l of d2) {
        var p = l.post('"url": "http://localhost:8800/')
        if (!p) continue;
        p = p.pre('"').pre('?')
        const targ = 'C:/gitProjects/csynth/' + p;
        if (fileExists(targ)) continue
        if (p.startsWith('fileexists/')) continue
        if (p.startsWith('eval/')) continue
        if (p.startsWith('runcmd.php')) continue
        if (p.startsWith('dir.php')) continue
        if (done.includes(p)) continue
        done.push(p)
        const from = p.replaceall('/', '\\')
        const to = targ.replaceall('/', '\\')
        const ccc = `copy ${from} ${to}`
        log('++++++++', ccc)
        runcommandphp(ccc);
    }
    return done
}
