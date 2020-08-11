'use strict';
// worker code to assist CSynth
// note: this is in the organicart level directory so paths are consistent between main thread and worker

var springs, log, posturi, contactsReader, throwe, CSynth, showvals, posturiasync, copyFrom;
var nop = ()=>{}, adduniform = nop, addgeneperm = nop, isNode = nop, osetTimeout = nop, minimizeSkelbuffer = nop;
var window = { setTimeout, addEventListener: ()=>{} },
HTMLTextAreaElement={}, HTMLElement={}, document = {}, Maestro = {on: nop}, V = {}, VH = {};    // lots of uses of W will be invalid because of this
HTMLElement.prototype={};
HTMLTextAreaElement.prototype={};
var postmsg = postMessage;  // use postmsg to reduce number of errors reported by lint
var loadStartTime;
var G, currentGenes;  // we will set both
loadStartTime = Date.now();


console.log('starting worker');
var inworker = true;
function newframe(f) { console.log('no newframe for worker'); }
importScripts('JS/searchString.js', 'JS/utils.js', 'JS/springs.js', 'CSynth/csynth.js',
    'CSynth/springsynth.js', 'CSynth/analysis.js', 'JSdeps/spearson.js');

springs.newmat = nop;
const clog = log;
var myfile = 'nofile';
// log = function() { const m = clog.apply(undefined, arguments); postmsg(['logmessage', myfile, m]); }
log = function() { const m = showvals.apply(undefined, arguments); postmsg(['logmessage', myfile, m]); }

// log('worker scripts loaded');
onmessage = function(e) {
    const data = e.data;
    // log('Message received from main script', e,data[0]);
    if (data[0] === 'contacts') {
        CSynth.current = {};
        const fidd = data[1];
        const _rawdata = posturi(fidd);  // must read data
        if (!_rawdata) throwe('cannot load file ' + fidd);
        const details = contactsReader(_rawdata, fidd);
        postmsg(['details', details, CSynth.current]);
    } else if (data[0] === 'debugger') {
        debugger;
    } else if (data[0] === 'setsprings') {
        springs = data[1];
        postmsg('springs set');
    } else if (data[0] === 'getsprings') {
        postmsg(['springs =', springs]);
    } else if (data[0] === 'close') {
        postmsg('closing');
        close();
    } else if (data[0] === 'sum') {
        let n = data[1];
        let s = 0;
        for (let i=0; i<n ; i++) {
            s += i;
        }
        postmsg(['test s', s]);
    } else if (data[0] === 'echo') {
        postmsg(['echo test', data[1]]);
    } else if (data[0] === 'dofun') {
        postmsg(['dofun', this[data[1]]()]);
    } else if (data[0] === 'ni') {
        postmsg(['echo ni xx', data[1].numInstances]);
    } else if (data[0] === 'item') {   // takes 'item', config struct, sort, num, currentGenes
        log('item requested');
        CSynth.current = data[1];
        const sort = data[2];
        G = currentGenes = data[4];
        if (sort === 'contacts') {
            const contact = CSynth.current.contacts[data[3]];
            myfile = CSynth.current.dir + contact.filename;
            const req = posturiasync(myfile, (rdata) => dataWorker(rdata, myfile, contact));
            req.onprogress = ee => { log('progress', myfile, ee.loaded, ee.total); }
        }
    } else if (data[0] === 'correlCD') { // correlate, first contact map, second dists
        //const c = data[1];
        //const s = data[2];
        //const flag = data[2];
        //const res = data[2];
        const r = CSynth.correl(...(data.slice(1))); // (c,s,flag,res);
        postmsg(['correlCD', r]);

    } else if (data[0] === 'file') {   // takes file, filename|File, CSynth.current
        log('requested');
        CSynth.current = data[2];
        const file = data[1];
        if (typeof file === 'string') {
            myfile = file;
            const req = posturiasync(file, (rdata) => dataWorker(rdata, file));
            req.onprogress = ee => { log('progress', file, ee.loaded, ee.total); }
        } else {
            myfile = file.name;
            const reader = new FileReader();
            reader.onload = function(ee) {
                const rdata = this.result;
                dataWorker(rdata, file.name)
            }
            reader.onerror = function(ee) {
                log('error', ee);
            };
            reader.onprogress = function(ee) {
                log(`${ee.loaded} of ${ee.total} = ${(ee.loaded/ee.total*100).toFixed()}%`);
            };
            reader.readAsText(file);
        }
    } else {
        postmsg(['invalid', data[0]]);
    }
}

function dataWorker(data, fid, contact) {
    // postmsg(['file', this.result.substring(0,40)]); // this.result is the read file as an ArrayBuffer.
    log('read done', fid);
    const details = contactsReader(data, fid);
    CSynth.checkRangePair(contact, details);
    CSynth.checkRangePair(contact, CSynth.current);
    copyFrom(contact, details);

    postmsg(['contacts result', contact, CSynth.current]);  //may have too much data?
    if (contact) {
        springs.setPARTICLES(contact.numInstances);
        springs.setMAX_DEFS_PER_PARTICLE(CSynth.current.MAX_DEFS_PER_PARTICLE || 256);
        CSynth.current.maxv = contact.maxv; // <<<<< incorrect, we must wait for ALL contacts before we choose maxv
        CSynth.contactsToSprings(contact, 0, contact.numInstances);
        // log(['contacts springs', springs.topologyarr]);
        postmsg(['contacts springs', springs.topologyarr]);
    }
    //debugger;
    close();  // my work now done
}
