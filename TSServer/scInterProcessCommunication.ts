import * as WS from 'ws'
import * as http from 'http'
import * as net from 'net'
import { WS_IPC_PORT } from './scconfig'
import {addSynthdefReloadListener, removeSynthdefReloadListener} from "./synthdefWatch";
import * as osc from "@supercollider/osc";
import {http_request, selectProtocol, shutdown} from "./serverUtils";
import {dumpCtrlNames} from "./SynthInterfaceGenerator";
import { sclogS, LogLevel } from './sclog';
import {promises as fs, watchFile} from 'fs'

export function startIPCServer() {
    const webServer = http.createServer(http_request);
    webServer.listen(WS_IPC_PORT, () => {
        const wsServer = new WS.Server({server: webServer, handleProtocols: selectProtocol});
        wsServer.on('connection', startIPCClient);
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
        const msg = osc.packMessage({address: '/oa/newTadmus', args: []});
        client.send(msg);//d'oh...
    }

    client.on('close', (code, reason) => {
        removeSynthdefReloadListener(synthReloadCallback);
        activeTadmusWatchCallback = null;
    });

    client.on('message', (data) => {
        const msg = osc.unpackMessage(data as Buffer); //assuming protocol binary
        //sclog(`ipc message: '${JSON.stringify(msg)}'`);
        switch (msg.address) {
            case '/oa/dumpControlNames':
                //get the data into the system... how?
                //By writing yaml again and then letting our own watcher spot it?
                //not very clever... however, I do want the yaml to be updated,
                //and already have the watcher in place...
                //This could all be rethought:
                //give the server had more direct communication with scsynth & do saner stuff...
                dumpCtrlNames(msg.args[0].toString());
                break;
            case '/oa/sclog':
                sclogS(msg.args[0].toString(), msg.args[1] as LogLevel);
                break;
            case '/oa/pompidouDevWatch':
                sclogS('----------- /oa/pompidouDevWatch ------------');
                activeTadmusWatchCallback = tadmusWatchCallback;
                tadmusWatch();
                break;
            case '/oa/shutdown':
                shutdown();
                break;
        }
    });
}
let activeTadmusWatchCallback;
let fsWatching = false;
function tadmusWatch() {
    sclogS('tadmusWatch called');
    if (fsWatching) {
        sclogS('---------------- fs already watching, client registered -----------------');
        return;
    }
    fsWatching = true;
    sclogS("Starting tadmus watch");
    watchFile('./dist/tadmus--r.js', {persistent: true, interval: 500}, () => {
        sclogS('tadmus change detected...');
        if (activeTadmusWatchCallback) {
            sclogS('notifying client.');
            activeTadmusWatchCallback();
        }
    });
}
