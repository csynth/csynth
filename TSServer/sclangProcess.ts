import {ChildProcess, spawn} from 'child_process'
import {sclogS, sclogSE} from './sclog'
import * as fs from 'fs'
import * as config from './scconfig'

let sclang: ChildProcess;

async function findLangPath() {
    let p;
    //TODO check if sclang in path.
    //review https://github.com/springernature/hasbin/blob/master/lib/hasbin.js
    if (process.platform === 'darwin') p = "/Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang";
    if (process.platform === 'win32') p = "C:/Program Files/SuperCollider-3.10.3/sclang.exe";  //pending...
    //if (process.platform === 'linux') p = "sclang"; //hope for the best?

    if (p) {
        if (!fs.existsSync(p)) return undefined;
    }
    return p;
}

//nb, there may be reasons for wanting to fire off multiple processes.
//NRT rendering, synth compilation... we're NOT planning on using it to interact with scsynth(!)
//but for now, we'll just have the one, thanks
// - and only call this function once in lifetime of server.
// - and only when the user has SuperCollider installed separately is it expected to do anything.
export async function maybeSpawnSCLang() {
    quitSCLang();
    const langPath = await findLangPath();
    if (!langPath) return false; //expected behaviour on many systems.
    sclang = spawn(langPath);
    sclogS(`started sclang '${langPath}': pid = ${sclang.pid}`);
    sclang.on('exit', function (code, signal) {
        sclogSE("[sclang]Exit with code " + code + ", '" + signal + "'");
    });
    sclang.on('error', function (err) {
        sclogSE("[sclang]Error " + err);
    });
    sclang.stdout.on('data', function (data) {
        if (data.toString().indexOf('ERROR:') !== -1) sclogSE('[scl-stdout]' + data);
        else sclogS('[scl-stdout]' + data);
    });
    sclang.stderr.on('data', function (data) {
        if (data.toString().indexOf('.*meta') !== -1) sclogS('[scl-stderr]' + data);
        else sclogSE('[scl-stderr]' + data);
    });

    //var sdDir = synthdefDir.replace(/\\/g, "/");
    sclangEval("SynthDef.synthDefDir = \"" + config.synthdefDir + "\".standardizePath;");
    sclangEval("SynthDef.synthDefDir;");

    return true;
}

export async function sclangEval(code: string) {
    if (!sclang) return;
    if (!sclang) return; //==== todo complete browser audio
    //TODO: some check if it's ok. "sclang.connected" is not the right property
    //I just had a bug where config for mac needed to change as they rearranged the SC bundle
    sclogS("[sc3>]" + code + "\n");
    //http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
    code = code.split('\n').join(' ');
    //m = "(" + m + ")"; //wrapping string in brackets didn't seem to help much...
    //BUG: "NodeError: Cannot call write after a stream was destroyed"
    //Why was stream destroyed? We should check that. Don't know how to reproduce...
    //for now, I'm not doing connectLangToSynth() as that connection is not used and may be related.
    //NOTE::: special character \x0c to get sclang to actually execute.
    if (sclang.stdin.writable) sclang.stdin.write(code + "\n\x0c");
    else sclogSE("^^^^ sclang.stdin not writable ^^^^");
}

function quitSCLang() {
    if (sclang && !sclang.killed) {
        console.log('killing sclang...');
        sclang.kill();
    }
}