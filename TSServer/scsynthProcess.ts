import { sclogS, sclogSE, sclogRaw } from './sclog';
import { UDP_PORT, TCP_PORT, MAX_NODES } from './scconfig';
import * as config from './scconfig';

import { ChildProcess, spawn } from 'child_process';

let scsynth: ChildProcess;


/**
 * was runProcess in nw_sc
 * @param {type} isRetry is set to true so that it knows not to set up file watchers again.
 */
export async function spawnSCSynth({isRetry=false, startvr=false}={}) {
    if (scsynth) quitSCSynth(); //still has some bug with e.g. sleep I think...

    console.log(`spawnSCSynth called... isRetry: ${isRetry}, startvr: ${startvr}`);
    let args = ["-u", '' + UDP_PORT, "-t", '' + TCP_PORT, "-m", 1024 * 64, "-a", 512, '-n', MAX_NODES];
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
                scsynthPath = "/Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth";
                args = args.concat(['-Z', 64]);
            }
            sclogS(`Either we're not on windows, or we're using non-local scsynth. Using default SC ugenPluginPath (no -U)`); //was hitting this after mutating config.scsynth. Don't do that.
        }
    })();
    async function startSession() {
        //TODO: figure out proxy vs Electron messaging?
        //scsession = await newsession(SC_initialOSCMessages, SC_processOSC);
    }


    ////////////////// Spawn native process ////////////////////////
    (function spawnNative(){

        scsynth = spawn(scsynthPath, args.map(v => v.toString()));
        sclogS(`started '${scsynthPath} ${args.join(' ')}': pid = ${scsynth.pid}`);
        scsynth.on('exit', function (code, signal) {
            //----------> OSCWorker -------->
            sclogS("[scsynth]Exit with code " + code + ", '" + signal + "'");
            //const logStr: any = document.getElementById('sclogbox').textContent;
            //////------ TSServer-TODO ------
            // NW_SC.nodevice = logStr.substr(-400).replaceall('<br />', '').replaceall('[sc=stdout]', '').indexOf("error: 'Device unavailable'") === -1;
            // if (NW_SC.nodevice) {
            //     msgfix('Synths', '<span class="errmsg">Synths cannot run, maybe there is no sound input device connected to the computer.;</span>')
            // }
        });
        scsynth.on('error', function (err) {
            sclogS("[scsynth]Error " + err);
        });
        let sessionStarted = false;
        scsynth.stdout.on('data', async function (data) { //log performance problem associated? some Electron Node / Renderer thread contention...
            //if (data.indexOf("command FIFO full" !== -1)) //todo something!
            /********/ //---> don't timeout, wait on a promise?
            //first stdout data probably means we're good to go. Seems ok. looking for 'server ready' anyway.
            //may not be reliable across all versions...
            if (!sessionStarted && data.indexOf('server ready') !== -1) {
                await startSession();
                sessionStarted = true;
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
}

export function quitSCSynth() {
    if (scsynth && !scsynth.killed) {
        console.log("killing scsynth...");
        //TODO writeOSC('/quit'), or not.
        scsynth.kill();
    }
}

