import * as WS from 'ws'
import * as http from 'http'
import { WS_IPC_PORT } from './scconfig'
import {addSynthdefReloadListener, removeSynthdefReloadListener} from "./synthdefWatch";
import * as osc from "@supercollider/osc";
import {http_request, selectProtocol, shutdown} from "./serverUtils";
import {dumpCtrlNames} from "./SynthInterfaceGenerator";
import { sclogS, LogLevel, sclogSE } from './sclog';
import {promises as fs, watchFile} from 'fs'
import { watchModule, loadModule } from './ModuleWatcher';  // ~~~~~~~~~~~~ sjpt uncommented

let webServer;

export async function startIPCServer(attempt = 0) {
    if (webServer) { console.log('continue using IPCServer'); return; }
    console.log('startIPCServer on port', WS_IPC_PORT);
    return new Promise<void>((resolve, reject) => {
        webServer = http.createServer(http_request);
        webServer.listen(WS_IPC_PORT, () => {
            function fail(error: Error) {
                sclogSE(`scsynth IPCServer error: '${error.message}'`);
                //reject(error);
                if (attempt < 5) {
                    setTimeout(() => {
                        startIPCServer(attempt + 1).then(resolve);
                    }, 1000);
                } else {
                    reject(error);
                }
            }
            try {
                const wsServer = new WS.Server({server: webServer, handleProtocols: selectProtocol});
                wsServer.on('connection', (ws) => {
                    startIPCClient(ws);
                });
                webServer.on('error', fail);
                webServer.on('clientError', fail);
                resolve();
            } catch (error) {
                fail(error);
            }
        });
    });
}

function startIPCClient(client: WS) {
    const synthReloadCallback = arg => {
        //Let client know via OSC message, with /oa/ prefix on address.
        const msg = osc.packMessage({address: '/oa/reloadSynthdef', args: [arg]});
        client.send(msg);
    };
    addSynthdefReloadListener(synthReloadCallback);
    const tadmusWatchCallback = () => {
        console.log("sending /oa/newTadmus");
        const msg = osc.packMessage({address: '/oa/newTadmus', args: []});
        client.send(msg);
    }

    client.on('close', (code, reason) => {
        removeSynthdefReloadListener(synthReloadCallback);
        //if a watch is running, we should stop it.
        //(also, it should be a bit cleverer about association with client)
        activeTadmusWatchCallback = null;
    });
    client.on('error', (err) => {
        sclogSE(`scsynth IPCClient error: '${err.message}'`);
    });

    client.on('message', async (data) => {
        if (typeof data == 'string') {
            console.warn('scInterProcessCommunication got string, expected OSC buffer', data);
        } else {
            const msg = osc.unpackMessage(data as Buffer); //assuming protocol binary
            //sclog(`ipc message: '${JSON.stringify(msg)}'`);
            switch (msg.address) {
                case '/oa/dumpControlNames':
                    //get the data into the system... how?
                    //By writing yaml again and then letting our own watcher spot it?
                    //not very clever... however, I do want the yaml to be updated,
                    //and already have the watcher in place...
                    //This could all be rethought:
                    //give the server more direct communication with scsynth & do saner stuff...
                    dumpCtrlNames(msg.args[0].toString());
                    break;
                case '/oa/sclog':
                    sclogS(msg.args[0].toString(), msg.args[1] as LogLevel);
                    break;
                case '/oa/loadModule':
                    const name = msg.args[0].toString();
                    sclogS(`----------- /oa/loadModule '${name}' ------------`);
    //~~~~????????? uncommented sjpt
                    const ok = await loadModule(name);
                    if (ok) {
                        client.send(osc.packMessage({address: '/oa/moduleReady', args: [name]}));
                        activeTadmusWatchCallback = tadmusWatchCallback;
                        tadmusWatch(name);
                    } else {
                        sclogSE(`loadModule('${name}') not ok...`);
                    }
                    break;
                case '/oa/shutdown':
                    shutdown();
                    break;
                case '/oa/ping':
                    client.send(data);
                    break;
            }
        }
    });
}
let activeTadmusWatchCallback;
let fsWatching = '';
//refactoring towards more general system, starting with existing hard-coded case.
function tadmusWatch(name = "tadmus") {
    sclogS('tadmusWatch called');
    if (fsWatching === name) { //but what if it was watching the wrong thing?
        sclogS(`---------------- fs already watching '${name}' -----------------`);
        return;
    }
    fsWatching = name;
    sclogS("NOT Starting tadmus watch :(");
    watchModule(name, () => {
        sclogS(name + ' change detected...');
        if (activeTadmusWatchCallback) {
            sclogS('notifying client.');
            activeTadmusWatchCallback();
        }
    });
}
