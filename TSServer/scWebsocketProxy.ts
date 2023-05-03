////////////// (was from organserver part 2 websocket proxy)
import * as net from 'net';
import * as http from 'http';
import * as WS from 'ws'
import * as conf from './scconfig';
import {addSynthdefReloadListener, removeSynthdefReloadListener} from './synthdefWatch';
import * as osc from '@supercollider/osc'
import {http_request, selectProtocol} from "./serverUtils";
import { sclogSE } from './sclog';

const source_host = '',
WS_PROXY_PORT = conf.WS_PROXY_PORT,
target_host = conf.HOST,
target_port = conf.TCP_PORT;
let webServer: http.Server, wsServer: WS.Server;

// Handle new WebSocket client. Called by webServer.on('connection')
let new_client = function(client: WS) {
    //const client = clientWS as any; //~T some existing usage in code didn't work with strong type.

    //~T let clientAddr = client._socket.remoteAddress;
    let logc = function (msg) {
        //~T console.log(' ' + clientAddr + ': '+ msg);
        console.log('scWebsocket logc: '+ msg);
    };
    logc('WebSocket connection protocol: ' + client.protocol);
    //~T logc('Version ' + client.protocolVersion + ', subprotocol: ' + client.protocol);

    let tries = 10;
    tryToConnect();

    function tryToConnect() {
        const myTry = tries;

        let target = net.createConnection(target_port, target_host, function() {
            logc('connecting to target myTry:' + myTry);
        });

        function targetBad(type) {
            if (!target) logc('attempt to handle message on dead target ' + type + ' myTry:' + myTry);
            return !target;
        }

        target.on('data', function(data) {
            if (targetBad('data')) return;
            //log("sending message: " + data);
            try {
                if (client.protocol === 'base64') {
                    client.send(new Buffer(data).toString('base64'));
                } else {
                    client.send(data); //~T ,{binary: true});
                }
            } catch(e) {
                logc("Client closed, cleaning up target" + ' myTry:' + myTry);
                target.destroy();
                target = undefined;
            }
        });
        target.on('end', function() {
            if (targetBad('end')) return;
            logc('target disconnected' + ' myTry:' + myTry);
            client.close();
        });
        //https://stackoverflow.com/questions/40141005/property-code-does-not-exist-on-type-error
        target.on('error', function(err: NodeJS.ErrnoException) {
            if (targetBad('error')) return;
            logc(`target connection error: '${err}'  tries left ${tries}` + ' myTry:' + myTry);
            //signal to browser (which will now need to understand strings as well as OSC messages)
            target.destroy();
            target = undefined;
            if (err.code === 'ECONNREFUSED') {
                tries--;
                if (tries) {
                    logc(`target connection error: retry ... tries left ${tries}` + ' myTry:' + myTry);
                    setTimeout(tryToConnect, 100);
                    return;
                }
            }
            client.send(err.message);
            client.close();
        });

        target.on('ready', function() {

            client.on('message', function(msg: WS.Data) {
                if (targetBad('client message')) return;
                //log('got message: ' + msg);
                if (client.protocol === 'base64') {
                    //~T WS.Data defined as "type Data = string | Buffer | ArrayBuffer | Buffer[];"
                    target.write(new Buffer(msg as string, 'base64'));
                } else {
                    target.write(msg as Buffer,'binary');
                }
            });
            client.on('close', function(code, reason) {
                if (targetBad('client close')) return;
                logc('WebSocket client disconnected: ' + code + ' [' + reason + ']' + ' myTry:' + myTry);
                // target.end(target.destroy); //hit an exception (once? on 25/11/20), maybe we shouldn't pass target.destroy
                // docs say it's only necessary in case of errors.
                target.end();
                //target.destroy();
                target = undefined;
            });
            client.on('error', function(a) {
                if (targetBad('client error')) return;
                logc('WebSocket client error: ' + a + ' myTry:' + myTry);
                target.end(target.destroy);
                //target.destroy();
                target = undefined;
                //TODO: kill the process too. (at the moment I think it kills old on start)
                //would require a bit more knowledge on the server side.
            });
        });   // target ready
    }; // tryconnection
};  // new_client



export let startProxyServer = async function startServer(attempt = 0) {
    if (webServer) { console.log('continue using scsynth proxy webServer'); return; }
    console.log("Running minimal WebSocket proxy.  Settings: ");
    console.log("    - proxying from " + source_host + ":" + WS_PROXY_PORT +
                " to " + target_host + ":" + target_port);

    return new Promise<void>((resolve, reject) => {
        try {
            webServer = http.createServer(http_request);
            // if (attempt < 3) throw new Error('scWebsocketProxy: test error');
            webServer.listen(WS_PROXY_PORT, function() {
                wsServer = new WS.Server({server: webServer, handleProtocols: selectProtocol});
                wsServer.on('connection', (ws) => {
                    new_client(ws);
                });
                wsServer.on('error', (error) => {
                    console.error('wsserver failed to work', error);
                })
                resolve();
            });
            webServer.on('error', error=>{ console.error('webserver for proxy error', error) });
            webServer.on('clientError', error=>{ console.error('webserver for proxy client error', error) });
        } catch (e) {
            //reject(e);
            if (attempt > 10) {
                reject(e);
            } else {
                sclogSE(`Error '${e}' starting websocket proxy server, retrying in 0.5 seconds (${attempt+1}/10)`);
                setTimeout(() => {
                    startServer(attempt + 1).then(resolve);//.catch(reject);
                }, 500);
            }
        }
    });
}
