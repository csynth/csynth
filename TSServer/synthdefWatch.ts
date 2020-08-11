import {synthdefDir, synthdefSrcDir} from './scconfig';
import {sclogS, sclogSE} from './sclog';
import {sclangEval} from './sclangProcess';
import * as fs from 'fs';
import { EventEmitter } from 'events';



export async function startWatchingSynthDefSourceFiles() {
    if (!fs.existsSync(synthdefSrcDir)) return console.error("cannot watch synthdef source files, does not exist", synthdefSrcDir);

    //recompile any synthdef sources that were modified since the latest binary was modified....
    var watchedFiles = [];
    function watchSourceFile(f) {
        sclogS("[sclang] started watching " + f);
        watchedFiles.push(f);
        fs.watchFile(f, { persistent: true, interval: 500 }, function () {
            recompile(f);
        });
    }

    /* //not using this so far, not sure if we'll really want it. Maybe do, for defining a dictionary of helper fns?
     var startup = "SuperCollider-3.6.5/startup.sc"; //TODO: make this less hardcoded.
     recompile(startup);
     watchSourceFile(startup);
     */

    var latestmtime = Number.MIN_VALUE;
    var binfiles = fs.readdirSync(synthdefDir);
    for (var i = 0; i < binfiles.length; i++) {
        latestmtime = Math.max(fs.statSync(synthdefDir + '/' + binfiles[i]).mtimeMs, latestmtime);
    }
    var srcfiles = fs.readdirSync(synthdefSrcDir);
    for (i = 0; i < srcfiles.length; i++) {
        var file = synthdefSrcDir + '/' + srcfiles[i];
        watchSourceFile(file);
        //TODO: fix this bit, I don't think it's working
        // sjpt 8 Feb 19.  There was a mix of mtime/lastmtime showing up as character or number
        // Also slight time inconsistencies that meant files saved at almost the same time
        // seemed to have wrong order of mtime/lastestmtime.
        // 19.1 ms out in one example for me, 100 ms below is somewhat arbitrary,
        // but should still be safe against 'real' time differences.
        var fss = fs.statSync(file);
        if (fss.isDirectory()) continue;    // directory times erratic after copy/sync etc
        var mtime = fss.mtimeMs;
        if (mtime - latestmtime > 100) recompile(file);
    }

    fs.watchFile(synthdefSrcDir, { persistent: true, interval: 500 }, function (curr, prev) {
        fs.readdir(synthdefSrcDir, function (err, files) {
            if (err) sclogS("[sclang] ERROR: " + err);
            for (let ii = 0; ii < files.length; ii++) {
                var f = synthdefSrcDir + "/" + files[ii];
                if (watchedFiles.indexOf(f) === -1 && fs.statSync(f).isFile()) {
                    sclogS("[sclang] new file: " + f);
                    recompile(f);
                    watchSourceFile(f);
                }
            }
        });
    });

    //This *IS NOT RIGHT* yet, and I should *not* be thinking about things like this at time of writing...
    //Will be relevant for checking different versions of scsynth etc. Also if I have a purge on rubbish SynthDefs.
    //If/when I get back to this, I should remember to beware of how watchers above are effected
    //(src and bin watchers should be stopped at start, then restarted at end)
    // NW_SC.cleanSynthdefBuild = async () => {
    //     sclog("TODO:  ################## cleanSynthdefBuild ###################");
    //     return;
    //     await (async (resolve, reject) => {
    //         let remainingBinaries = binfiles.length;
    //         binfiles.forEach(f => {
    //             sclog(`deleting ${f}...`)
    //             fs.unlink(synthdefDir + '/' + f, err => {
    //                 if (err === undefined) {
    //                     if(--remainingBinaries === 0) resolve();
    //                 } else {
    //                     sclog(err);
    //                     reject(err);
    //                 }
    //             });
    //         });
    //     })();
    //     await ( async (resolve, reject) => {
    //         srcfiles.forEach(recompile);
    //         //will return before they're finished, hey-ho.
    //     })();
    // }
}

/**
 * .scsyndef files may change as a result of svn update or sclang recompile...
 * In former case, there may be some issues with generating code etc that conflicts with
 * incoming changes, this function should probably NOT BE INVOKED WHEN SCLANG NOT AROUND
 * ...Also, we should be able to load into scsynth, query & regenerate bindings when browser client not around.
 */
export const startWatchingSynthDefBinFiles = async function () {
    if (!fs.existsSync(synthdefDir)) return console.error("cannot watch synthdef source files, does not exist", synthdefDir);

    var watchedFiles = [];
    function watchSynthDefBinFile(f) {
        if (!f.endsWith(".scsyndef")) {
            sclogS("[scsynth] ignoring file " + f + " because it isn't .scsyndef");
            return;
        }
        sclogS("[scsynth] started watching " + f); //I could make this less noisy.
        watchedFiles.push(f);
        var name = f.substring(f.lastIndexOf("/") + 1, f.lastIndexOf("."));
        try {
            //---->>>>>  NW_SC.registerSynthName(name); //TODO ?
        } catch (e) { sclogS("!!!! exception caught in registerSynthName: " + e); }
        fs.watchFile(f, { persistent: true, interval: 500 }, function () {
            //would be nice to establish whether the file had really changed, or been recreated the same.
            //can this result in /d_load happening before socket is ready?
            //I think it depends on socket type; might be queued or dropped.
            //Saw some behaviour that seemed a bit bad when some synthdefs were new on start (TCP)...
            //doesn't seem to be reproduced...
            reloadSynthdef(f);
        });
    }

    fs.readdir(synthdefDir, function (err, files) {
        if (err) sclogS("[sclang] ERROR: " + err);
        for (var i = 0; i < files.length; i++) {
            var f = synthdefDir + "/" + files[i];
            if (fs.statSync(f).isFile()) watchSynthDefBinFile(f);
        }
    });


    //watch the directory for changes, and add any new files.
    fs.watchFile(synthdefDir, { persistent: true, interval: 500 }, function () {
        fs.readdir(synthdefDir, function (err, files) {
            if (err) sclogS("[scsynth] ERROR: " + err);
            for (var i = 0; i < files.length; i++) {
                var f = synthdefDir + "/" + files[i];
                if (watchedFiles.indexOf(f) === -1 && fs.statSync(f).isFile()) {
                    sclogS("[scsynth] new file: " + f);
                    reloadSynthdef(f);
                    watchSynthDefBinFile(f);
                }
            }
        });
    });
}


const events = new EventEmitter();
const reload = 'reloadSynthdef';
function reloadSynthdef(file: string) {
    //TODO: callback to browser, update generated TypeScript if necessary.
    //keep on server side as much as possible.
    events.emit(reload, file);
}

type synthListener = (file: string) => void;
export function addSynthdefReloadListener(callback: synthListener) {
    events.addListener(reload, callback);
}
export function removeSynthdefReloadListener(callback: synthListener) {
    events.removeListener(reload, callback);
}

function recompile(file) {
    sclogS("[sclang] >> recompiling " + file);
    sclangEval("(\"" + file.replace(/\\/g, "/") + "\".standardizePath).load");
    //separate watcher on scsyndef files will reloadSynthDef from there: TODO: move that to server.
}
