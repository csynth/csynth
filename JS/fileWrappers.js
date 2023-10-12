var nwfs, posturi, post, uriclean, msgfix, genbar, posturibin, startscript, frametime, S, Maestro, sleep,
log, saveTextfile, msgfixlog, XMLHttpRequest, File, FormData, $, runcommandphp, WebSocket, throwe, HW, Buffer, islocalhost, getdesksave,
CSynth, showDirectoryPicker;
function readtext(fid, quiet = false) {
    if (nwfs) {
        return nwfs.readFileSync(fid, 'ascii');
    } else {
        if (quiet && !fileExists(fid)) return;
        if (fid[1] === ':') fid = '!' + fid;
        return posturi(fid);
    }
}

function fileExists(fid, quiet=true) {
    let r
    if (nwfs)
        r = nwfs.existsSync(fid);
    else if (islocalhost)
        r = posturi('/fileexists/'+fid, undefined, quiet) === 'true';
    else {
         var http = new XMLHttpRequest();
          http.open('HEAD', fid, false);
          http.send();
          r = http.status != 404;
    }
    if (!r && !quiet) console.trace('file not found', fid)
    return r
}

async function fileExistsAsync(fid) {
    if (nwfs)
        return nwfs.existsSync(fid);    // TODO, make sure what nwfs.exists returns
    else {
        const r = await fetch('/fileexists/'+fid);
        const rr = await r.text();
        return rr === 'true';
    }
}


function fileDelete(fid) {
    if (nwfs)
        return nwfs.unlinkSync(fid);
    else
        return posturi('/filedelete/'+fid);
}

function fileStat(fid) {
    if (nwfs)
        return nwfs.statSync(fid);
    else
        return JSON.parse(posturi('/filestat/'+fid));
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
        const urik = 'reading file: ' + uriclean(fid);
        msgfix(urik, '<br>complete (nwfs sync)<br>' + genbar(1));

        return new Promise( (resolve, reject) => {
            try {
                if (!fileExists(fid)) reject(new Error('no file' + fid));
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


/** save to a remote location, effectively synonym of writetextremote  */
function remotesave(fid, newVersion) {
    var newVersionString = (typeof newVersion === 'string') ? newVersion : JSON.stringify(newVersion, undefined, 2);
    if (nwfs) {
         writetextremote(fid, newVersionString);
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
        return saveTextfile(text, fid.substr(1));  // for save as download
    if (nwfs) {
        nwfs.writeFileSync(fid, text);
        return;
    }
    if (location.href.contains('csynth.github.io')) {
        msgfixlog('No upload to github, saved as download:', fid);
        return saveTextfile(text, fid);  // for save as download
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

    // log("POST text");
    var oReq = new XMLHttpRequest();
    oReq.open("POST", append ? "appendfile.php" : "savefile.php", false);
    oReq.setRequestHeader("Content-Disposition", fid);
    oReq.send(text);
    if (oReq.responseText !== 'OK') log("writetextremote", fid, "response text", oReq.responseText);
}

function _Files() {
    const me= this
    me.dirhandle;
    me.setDirectory = async function(sys) {
        if (!sys) sys = location.href.toLowerCase().includes('csynth') ? 'CSynth' : 'Organic';
        if (!me.dirhandle) {
            try {
                me.dirhandle = (await CSynth.getIdbCache('dirhandle' + sys)).data
                log('[[[[ got orgsaveHandle from IDB')
            } catch (e) {
                // alert('Hit enter, then please choose root directory for all future saves. eg Desktop/' + sys);
                me.dirhandle = await showDirectoryPicker({startIn: 'documents', mode:'readwrite'})
                await CSynth.setIdbCache({key: 'dirhandle/' + sys, data: me.dirhandle});
            }
        }
        const ok = await me.dirhandle.queryPermission({mode:'readwrite'})
        if (!ok) me.dirhandle = await window.showDirectoryPicker({startIn: me.dirhandle, mode:'readwrite'});
        return me.dirhandle; // not generally used, implicity in read/write
    }

    me.write = async function (fid, data, append) {
        if (!me.dirhandle) return writetextremote(fid, data, append);

        if (fid.contains(':\\')) {
            const dd = getdesksave();  // remove desksave prefix if there to help backwards compatability
            if (fid.startsWith(dd)) fid = fid.substring(dd.length);
        }

        const fileHandle = await me.dirhandle.getFileHandle(fid, {create:true})
        const writeable = await fileHandle.createWritable();
        if (append) {
            // https://stackoverflow.com/questions/68069145/is-it-possible-to-append-to-an-existing-file-with-chromes-file-system-access-ap
            let offset = (await fileHandle.getFile()).size
            writeable.seek(offset)
        }
        await writeable.write(data);
        writeable.close();
    }

    me.read  = function(fid) {
        alert('read pending')
    }
}
var Files = new _Files();

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

// make a directory, todo add on-nwfs supprort
function mkdir(dir) {
    if (fileExists(dir)) return;
    if (dir[0] !== '"') dir = '"' + dir + '"';
	if (nwfs) {
		if (!fileExists(dir)) nwfs.mkdirSync(dir);
	} else {
		const rr = runcommandphp('mkdir ' + dir.replace(/\//g, '\\'));
        if (rr) throwe(`error making directory "${dir}"   ${rr}`)
	}
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
        list.forEach(n=> {rr[n] = fileStat(dir + '/' + n)});
        result = rr;

    } else if (location.href.indexOf('/csynth/serve') !== -1) {
        // this version for Oxford private project
        const r = {};
        const proj = startscript.post('p=').pre('&');
        const odir = posturi(`/csynth/settings?p=${proj}&t=${frametime}`);
        const dirl = odir.split('\n');
        for (let i=1; i<dirl.length; i++) { // skip first header line
            if (!dirl[i]) continue;          // probably empty last line
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
    } else if ( location.href.contains('csynth.github.io')) {
        console.error('no sync readdir for csynth.github.io');
        result = {};
    } else if (location.href.indexOf('https://csynth.molbiol.ox.ac.uk') !== -1
            || location.href.indexOf('https://programbits.co.uk/Mutspace') !== -1) {
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
        let urlx
        if (location.href.includes('/!')) {
            const pre = location.href.pre('/!')
            const post = location.href.post('/!')
            urlx = pre + '/dir.php?/!' + post.pre('csynth.html') + '/';
        } else {
            urlx = 'dir.php?';
        }
        const fileNames = posturi(urlx + dir.replace(/\/\//g,'/'));
        try {
            result = fileNames[0] === '{' ? JSON.parse(fileNames) : fileNames.split(',');
        } catch (e) {
            console.error('error reading directory, return empty', dir, e);
            result = [];
        }
    }

    // cumulative size
    function nsize(s) {
        if (s === '-') return 0;
        if (!isNaN(s)) return +s;
        if (s.endsWith('K')) return 1024 * +s.substring(0, s.length-1);
        if (s.endsWith('M')) return 1024 * 1024 * +s.substring(0, s.length-1);
        log('odd size format ', s); return 0;
    }

    for (const n in result) result[n].nsize = nsize(result[n].size);
    return result;
}

async function readdirAsync(dir) {
    if ( location.href.contains('csynth.github.io')) {
        const response = await fetch('https://api.github.com/repos/csynth/CSynth/contents/');
        const rr = await response.json();
        const result = {};
        for (const di of rr) result[di.name] = {name: di.name, isDir: di.type==='dir' };
        return result;
    }
    return readdir(dir);
}

// read directory recursive,
function readdirRec(dir, list=[]) {
    const r = readdir(dir);
    for (const f in r) {
        if (r[f].isDir) {
            readdirRec(dir + '/' + f, list)
        } else {
            r[f].path = dir + '/' + f;
            list.push(r[f]);
        }
    }
    return list;
}

//~~~~~~~~~~~~~~~~~ websocket based IO ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/** open a file for random access read, using websocket */
function fileOpenReadWS(fid) {
    if (nwfs) {
        return nwfs.openSync(fid);
    } else {
        const handle =  new WebSocket(`ws://${location.hostname}:57778`);
        handle.binaryType = 'arraybuffer';

        handle.onmessage = function(buff) {
            Maestro.trigger('messageReady', buff.data);
        }
        handle.onopen = function() {
            handle.send('?' + fid); // first packet is filename, ? for read mode
        }
        return handle;
    }
}

/** read part of file, return a buffer */
async function fileReadWS(handle, length, pos) {
    if (nwfs) {
        const buffer = Buffer.alloc(length);
        const l = nwfs.read(handle, buffer, 0, length, pos);
        return l === length ? buffer : buffer.slice(0, l);
    } else {
        while (handle.readyState === WebSocket.CONNECTING) await sleep(1);
        if (handle.readyState !== WebSocket.OPEN) throwe('fileReadWS websocket in bad state ' + handle.readyState)
        handle.send(length + ' ' + pos + ' ');
        const pend = await S.maestro('messageReady');
        const buff = pend.data;
        return buff;
    }
}

// // INCORRECT experiment, need to use base64 to make it correct?
// function fileReadBinarySync(fid, length, pos) {
//     if (nwfs) {

//     } else {
//         if (length !== undefined) fid = [fid, pos, length].join('|');
//         const xx = posturi(fid);
//         return new Uint8Array([...xx].map(char => char.charCodeAt(0)));
//     }
// }

/** open a file for (streamed?) write */
function fileOpenWriteWS(fid) {
    if (nwfs) {
        return nwfs.openSync(fid);
    } else {
        const h = new WebSocket(`ws://${location.hostname}:57778`);
        h.binaryType = 'arraybuffer';
        h.onopen = function() {h.send(fid);}
        return h;
    }
}

/** write to file (append) TODO: check if early calls can get out of order from this async */
async function fileAppendWS(handle, data) {
    while (handle.readyState === WebSocket.CONNECTING) await sleep(1);
    if (handle.readyState !== WebSocket.OPEN) throwe('fileAppendWS websocket in bad state ' + handle.readyState)
    handle.send(data);
}

/** close file */
function fileCloseWS(handle) {
    return nwfs ? nwfs.closeSync(handle) : handle.close();
}

/** write binary */
async function fileWriteWS(fid, data) {
    const h = fileOpenWriteWS(fid);
    await fileAppendWS(h, data);
    fileCloseWS(h);
}



/**
 * notes on nwfs usage
 *  mkdir(fid)
 *  readtext(fid)
 *  fileExists(fid)
 *  fileStat(fid)
 *  readbinaryasync(fid)
 *  remotesave(fid, text)
 *  writetextremote(fid, text, append)
 *  readdir(dir)
 *
 *  genBoundsFromPrefixFS(stem) <<< nwfs only
 *  stemSave(stem) <<< nwfs only
 *  nysetForAnim, nyset <<< nwfs only
 *
 *  FrameSaver._Start, StartRender.ffd, Render, Endup <<<<<<<<< w.i.p.
 *
 *
 * note using /eval/, fs must be replaced by fs__WEBPACK_IMPORTED_MODULE_0__
 */

/**
 * note on operating contexts
 * Electron:            isNode() === true, nwfs defined,
 * our node server:     posturi('/eval/1') === '1'
 *                      homedir = posturi('/eval/process.env.USERPROFILE')
 *                      serverdir = posturi('/eval/process.cwd()')
 * Oxford server:       oxcsynth === true
 */

