////////////// (was from organserver part 2 websocket proxy)
import * as net from 'net';
import * as http from 'http';
import * as WS from 'ws'
import * as conf from './scconfig';
import {addSynthdefReloadListener, removeSynthdefReloadListener} from './synthdefWatch';
import * as osc from '@supercollider/osc'
import {http_request, selectProtocol} from "./serverUtils";

const source_host = '',
source_port = conf.WS_PROXY_PORT,
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
                target.end(target.destroy);
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



export let startProxyServer = function startServer() {
    console.log("Running minimal WebSocket proxy.  Settings: ");
    console.log("    - proxying from " + source_host + ":" + source_port +
                " to " + target_host + ":" + target_port);
    webServer = http.createServer(http_request);

    webServer.listen(source_port, function() {
        wsServer = new WS.Server({server: webServer, handleProtocols: selectProtocol});
        wsServer.on('connection', new_client);
    });
}
