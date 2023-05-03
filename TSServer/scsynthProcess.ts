import { sclogS, sclogSE, sclogRaw } from './sclog';
import { UDP_PORT, TCP_PORT, MAX_NODES } from './scconfig';
import * as config from './scconfig';
import * as scserver from './scserver'

import { ChildProcess, spawn } from 'child_process';

let scsynth: ChildProcess;


/**
 * was runProcess in nw_sc
 * @param {type} isRetry is set to true so that it knows not to set up file watchers again.
 */
export async function spawnSCSynth({isRetry=false, startvr=false}={}) {
    if (scsynth) quitSCSynth(); //still has some bug with e.g. sleep I think...

    console.log(`spawnSCSynth called... isRetry: ${isRetry}, startvr: ${startvr}`);
    let args = ["-u", '' + UDP_PORT, "-t", '' + TCP_PORT, "-m", 1024 * 64, "-a", 512, '-n', MAX_NODES, '-i', config.audioInputs];
    let scsynthPath;
    (function processConfigOptions() {
        let device = startvr ? config.VRAudioDevice : config.audioDevice;
        //maybe consider useSystemClock? (this is in ServerOptions in sclang, not sure about how to set over cmd line)
        ///NW_SC.sampleRate = 48000; //TODO: review sampleRate?
        if (device !== 'default') args.concat(["-H", device]);
        if (config.bufSize) args = args.concat(["-Z", config.bufSize]);

        const isWindows = process.platform === 'win32';
        const isMac = process.platform === 'darwin';
        if (config.scsynth === 'default' && isWindows) { //this gets mutated, ungood...
            //config.scsynth = '../SuperCollider/scsynth';
            scsynthPath = '../SuperCollider/scsynth';
            sclogS("Using our default local scsynth & ugenPluginPath '-U ../SuperCollider/plugins'");
            //Thought (again) about putting ugenPluginsPath in config, sometimes that's also fiddly.
            //*** Especially on other platforms where our default local copies will be the wrong build ...
            //Current expectation is that if you're in Windows and using our local default SC you will use local plugins
            //(for which we can add a hardcoded argument to scsynth)
            //otherwise you'll have SuperCollider + plugins installed (and probably want SC to look in the normal place,
            //by not providing a -U argument, as in useSCDefault)
            args = args.concat(["-U", '../SuperCollider/plugins']);
        } else {
            if (config.scsynth === 'default' && isMac) {
                scsynthPath = "/Applications/SuperCollider.app/Contents/Resources/scsynth";
                args = args.concat(['-Z', 64]);
            }
            sclogS(`Either we're not on windows, or we're using non-local scsynth. Using default SC ugenPluginPath (no -U)`); //was hitting this after mutating config.scsynth. Don't do that.
        }
        if (!isMac && !isWindows) {
            if (config.scsynth === 'default') {
                scsynthPath = 'scsynth';
            }
        }
    })();
    async function startSession() {
        await scserver.start();
        sclogS('---- startSession done ----');
    }

    let resolveHack;
    const promise = new Promise<void>((resolve, reject) => {
        resolveHack = resolve;
    });
    ////////////////// Spawn native process ////////////////////////
    (function spawnNative() {
        scsynth = spawn(scsynthPath, args.map(v => v.toString()));
        sclogS(`started '${scsynthPath} ${args.join(' ')}': pid = ${scsynth.pid}`);
        scsynth.on('spawn', runPostBootCmds);
        scsynth.on('exit', function (code, signal) {
            //----------> OSCWorker -------->
            sclogS("[scsynth]Exit with code " + code + ", '" + signal + "'");
        });
        scsynth.on('error', function (err) {
            sclogS("[scsynth]Error " + err);
        });
        let sessionStarted = false, sdata = ''; // accumulate data as it is broken up in random ways so 'server ready' test can fail
        scsynth.stdout.on('data', async function (data) { //log performance problem associated? some Electron Node / Renderer thread contention...
            //if (data.indexOf("command FIFO full" !== -1)) //todo something!
            /********/ //---> don't timeout, wait on a promise?
            //first stdout data probably means we're good to go. Seems ok. looking for 'server ready' anyway.
            //may not be reliable across all versions...
            if (!sessionStarted) {
                sdata += data;
                if (sdata.indexOf('server ready') !== -1) {
                    //if (data.indexOf('SuperCollider 3 server ready.') === -1)
                    //    console.log('server ready seen broken up', data);
                    await startSession(); // what does it mean for this to resolve?
                    sessionStarted = true;
                    resolveHack();
                }
            }
            //how to avoid broken lines?
            sclogRaw(data);
        });
        scsynth.stderr.on('data', function (data) {
            sclogS('[sc-stderr]' + data);
        });
        scsynth.on('close', function (code) {
            //TODO: reset if necessary.
            sclogS("scsynth closed with code " + code);
        })

        //////------ TSServer-TODO ------
        //if (!isRetry) NW_SC.startWatchingSynthDefBinFiles();
    })();

    return promise;
}

/** sometimes there might be things to execute on shell after scsynth boots.
 * These can be added to `.scconfig.json` "postBootShellCmds".
 * As of this writing, this applies to connecting jack inputs & outputs (on PiSound)
 */
export async function runPostBootCmds() {
    // there should be a better way of syncing this to when scsynth is ready, but for now, just sleep.
    await new Promise(resolve => setTimeout(resolve, 1500));
    for (const cmd of config.postBootShellCmds || []) {
        console.log('[scsynth postBootCmd]', cmd);
        const args = cmd.split(' ');
        const c = args.shift();
        const p = spawn(c, args);
        p.on('error', console.error);
        p.on('message', console.log);
        p.stdout.on('data', sclogRaw);
        await new Promise(resolve => {
            p.on('close', resolve);
            p.on('exit', resolve);
        });
    }
}

export function quitSCSynth() {
    if (scsynth && !scsynth.killed) {
        console.log("killing scsynth...");
        //TODO writeOSC('/quit'), or not.
        scsynth.kill();
    }
}

