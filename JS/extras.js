'use strict';
var genedefs, setvalr, currentGenes, uniforms, extradefines, regenHornShader, log, setAllLots, maxshine, msgfix, updateGuiGenes,
runscript, InspectedWin3js, posturi, inputs, resoverride, G, W, V, VH, dotty, usewireframe, copyFrom, nomess, msgtrack, camset,
camera,camToGenes, renderVR, showview, logload, useGenetransform, cc, CSynth, startvr, fixedgenes, setBackgroundColor, fs,
writetextremote, Blob, readbinaryasync, currentObjects, refall, pick, lastdocx, lastdocy, width, height, extrakeys, nop,
slots, mainvp, distxyz, material, EX;


/** convenient look at uniforms */
var U = new Proxy({}, {
   get : (ig, name) => name === 'ownKeys' ? () => Reflect.ownKeys(uniforms) : uniforms[name].value,
   set : (ig, name, v) => uniforms[name].value = v,
   ownKeys : (o) => {
       let x = Reflect.ownKeys(uniforms);
       log('...', x);
       return x;
   }   // Object.keys(U) calls this, and x is ok, but returns []
   // !!! enumerate maynot work ...
});

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
}

//showlights()
//utils.js:133  65427/1865.052+174600!!!!!!: light0 0.300 {x: 350, y: 800, z: 440, isVector3: true} directional
//utils.js:133  65427/1865.053+1: light0 0.600 {x: 1.50, y: 1.50, z: 1.50, isVector3: true} {x: -1, y: -1, z: -1, isVector3: true}
//utils.js:133  65427/1865.053+0: light0 0.200 {x: -300, y: -70, z: 80, isVector3: true} directional

setNovrlights.novrlights = {
    ambient: 0.01,
    light0s: 0.7,
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
        resoverride.radnum = 1;
        G.NORMTYPE = 5;
    } else {
        delete resoverride.radnum;
        // leave G.NORMTYPE for noe
    }
}

function setImposterGUI() {
    msgfix.all = true;
    nomess(false);
    msgtrack('NORMTYPE resoverride.radnum');
    G.NORMTYPE = 5;
    genedefs.NORMTYPE.max = 6;
    VH.killgui();
    VH.orgGUI('Imposter GUI', 'RMTYPE|ribdepth|stardepth|nstar');
    resoverride.radnum = 1;
    setImposterGUI.lastRadnum = 1;
    let rr = V.gui.add(resoverride, 'radnum', 1, 10).step(1);  // 0 is no override, use standard
    rr.onChange( (x) => { setImposterGUI.lastRadnum = x; bb.name('cycle radnum=' + resoverride.radnum); } );
    let bb = V.gui.addButton( () => {
        const o = resoverride.radnum;
        resoverride.radnum = o === 0 ? 1 : o === 1 && setImposterGUI.lastRadnum !== 1 ? setImposterGUI.lastRadnum : 0;
        G.NORMTYPE = resoverride.radnum ? 5 : 1;    // set NORMTYPE 5 for specials, 1 for standard
        bb.name('cycle radnum=' + resoverride.radnum);
        }).name('cycle');
    logload();
    V.gui.add(logload.data, 'fullutil', 0, 2).step(0.01).listen();

    V.gui.addButton( () => {dotty = false; usewireframe = false;} ).name('full');
    V.gui.addButton( () => {dotty = false; usewireframe = true;} ).name('wire');
    V.gui.addButton( () => {dotty = true; usewireframe = true;} ).name('dots');
    V.gui.addButton( () => {camset();} ).name('rand view');
    V.raylength = 10000;
    VH.positionGUI();
}

// note, trying to reset as much as possible after NaN error
function repairnan() {
    camera.quaternion.set(0,0,0,1);
    camera.position.set(0,0,0);
    camera.updateMatrix();
    camToGenes();
    renderVR.camera=0;
    showview();
    G._panx = G._pany = G._panz = 0;
    G._qux = G._quy = G._quz = 0;
    G._quw = 1;
    useGenetransform();
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
function loadMatrix(fid = dfid, idata, nosave=false ) {
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


            if (nosave) {
            } else if (nwfs) {
                nwfs.writeFileSync(fid + '.bintri', pref);
                nwfs.writeFileSync(fid + '.bintri', Buffer.from(data.buffer), {flag:'a'});
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
    dir = dir.map(x => x.replaceall(' ', '_'));  // todo fid readdir
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
    renderVR.fs(true);
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

/** zoom camera in keeping shadows etc set */
function zoomCam(n = 4) {
    if (n === 0 && zoomCam.save) {
        pick = zoomCam.save.pick;
        const dispobj = slots[mainvp].dispobj;
        camera.setViewOffset(dispobj.width, dispobj.height, 0,0, dispobj.width, dispobj.height);
        G._fov = zoomCam.save.fov;
        zoomCam.save = undefined;
        return;
    }
    zoomCam.save = {pick, fov: G._fov};
    pick = nop;
    G._fov /= n;  // << todo improve
    const v = camera.view;
    v.offsetX = (lastdocx - width/2) * n;
    v.offsetY = (lastdocy - height/2) * n;
}
/**
extrakeys['Q,Y'] = zoomCam;
extrakeys['Q,U'] = () => zoomCam(0);
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
    };

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
function usedUniformsO() {
    const uu = {};
    for (let mm in material) {
        const mlist = material[mm];
        for (let tr in mlist) {
            const mat = mlist[tr];
            if (mat.program) Object.assign(uu, mat.program.getUniforms().map);
        }
    }
    return uu;
}

/** iterate to find used uniforms */
function usedUniforms() {
    const uu = {};
    for (let mat of EX.materials) {
        if (mat.program) Object.assign(uu, mat.program.getUniforms().map);
    }
    return uu;
}

/** find unused uniforms  */
function unusedUniforms() {
    const uu = usedUniforms();
    const uuu = [];
    for (let u in uniforms) {
        if (!uu[u]) uuu.push(u);
    }
    return uuu;
}


