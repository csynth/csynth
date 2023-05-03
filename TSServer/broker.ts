import * as http from "http";
import {Server as WebSocketServer} from "ws";
import * as WebSocket from "ws";

let log = console.log
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ to factor out
// from comms.js


//import * as http from "http";
// import {Server as WebSocketServer} from "ws";

// websockets broker, derived from https://www.npmjs.com/package/wsbroker
// but with many features removed (in particular, JSON, matching, and back end support)

// var hostname; //, require;

interface WebSocketX extends WebSocket{
    broker: typeof Broker;
    wskey: string;  // compound information string about connection
    target: string; // target to which messages from this connection will be made. Default is broadcase
    id: string;     // id for this connection
}

const BrokerSplitter = '\t';  // for parsing broker messages

var Broker = function (config) {
    log('starting broker on port: ', config.port)
    const broker = this;
    broker.config = config;
    broker.onClientMessage = config.onClientMessage || defaultOnClientMessage;
    if (!require) return;

    const Http = http; // require('http');
    // const WebSocketServer = Server; //require('ws').Server;

    broker.config = config;
    broker.broadcast = broadcast;
    broker.log = broker.config.log || (()=>{});    // can be overridden later
    const websocketServer = initWebSocketServer();

    /** function called when client closed, will callback if specificed */
    function onWSClose(connection: WebSocketX) {
        broker.log('← connection closed', connection.wskey);
        if (broker.config.onClientDisconnect)
            broker.config.onClientDisconnect(connection, broker);
        broadcast(clients(['!left']), connection);
    }

    function defaultOnClientMessage(message, connection: WebSocketX, broker) {
        log('MESSAGE RECEIVED!', message);
        broker.broadcast(message, connection);
    }


    /** broadcast message.
     * if fromconnection is specified do not send to that connection
     * if fromconnection.target is specified send only to
     * */
    function broadcast(message, fromconnection?: WebSocketX) {
        if (Array.isArray(message)) message = message.join(BrokerSplitter);
        const recipients = [];
        websocketServer.clients.forEach(function (toconnection: WebSocketX) {
            let send = true;    // default is to send to (almost) everyone
            if (fromconnection?.target && toconnection.id !== fromconnection?.target) send = false; // if target, send only to target(s)
            if (!fromconnection?.target && toconnection === fromconnection) send = false; //if not target, send to everyone except self
            if (send) {
                sendClientMessage(toconnection, message);
                recipients.push(toconnection);
            }
        });
        broker.log('← sent to ' + (recipients.length) + '/' + (websocketServer.clients.size) + ' clients', message);
    }

    /** function called when client message arrives, process as broker message (!...) or callback */
    function onClientMessage(fromconnection: WebSocketX, message) {
        broker.log('→ from client', fromconnection.wskey, message);
        if (message[0] === '!')
            handleBrokerMessage(fromconnection, message);
        if (broker.onClientMessage)
            broker.onClientMessage(message, fromconnection, broker);
    }

    function sendToId(id: string, msg) {
        websocketServer.clients.forEach( (c:WebSocketX) => {if (id === c.id) c.send(msg); } )
    }

    /** handle special message (first char !) at broker */
    function handleBrokerMessage(fromconnection: WebSocketX, message) {
        const mm = message.split(BrokerSplitter);
        switch (mm[0]) {
            case '!clients': sendClientMessage(fromconnection, clients(['!clients'])); break;
            case '!id': fromconnection.id = mm[1]; fromconnection.wskey += '_' + mm[1]; break;
            case '!to': sendToId(mm[1], mm[2]); break;              // target for this specific message
            case '!target': fromconnection.target = mm[1]; break;   // target for future sent messages
            default:
                log('unexpected broker message ignored:', message);
                sendClientMessage(fromconnection, message + ' UNEXPECTEDMESSAGE');
            break;
        }
    }

    /** return array of clients, prepended by other details */
    function clients(pre = []) {
        websocketServer.clients.forEach( (c: WebSocketX) =>
            pre.push(c.wskey)
        )
        return pre;
    }

    /* send message to specific client, message may be string or array */
    function sendClientMessage(toconnection, message) {
        if (Array.isArray(message)) message = message.join(BrokerSplitter);
        // if (typeof message === 'object') message =
        try {
            toconnection.send(message);
            broker.log('← to client', toconnection.wskey, message);
        } catch (ee) { broker.log('failed to send message to client', toconnection.wskey)}
    }
    broker.sendClientMessage = sendClientMessage;

    /** function called when new client connects */
    function onWSConnection(connection: WebSocketX) {
        try {
            connection.broker = broker;
            connection.wskey = [onWSConnection.id++, Date.now()].join('_');
            broker.log('↪ new connection', connection.wskey);
            connection.on('message', function (message) { onClientMessage(connection, message); });
            connection.on('close', function () { onWSClose(connection); });
            broker.broadcast(clients(['!join', connection.wskey, '!clients']));
            if (broker.config.onClientConnect)
                broker.config.onClientConnect(connection);
        } catch (ee) {
            broker.log('! Connection Error', ee);
        }
    }
    onWSConnection.id = 1;


    function initWebSocketServer() {
        const server = Http.createServer();
        const wsrv = new WebSocketServer({server});
        wsrv.on('connection', onWSConnection);
        wsrv.on('error', (error) => broker.log('websocket server error: ', error));
        server.listen(broker.config.port, () => {
            broker.status = 'ready';
            broker.log('➥ websocket server listening on port ' + broker.config.port);
        });

        return (wsrv);
    }
}

export var broker = new Broker({
    port: 12345
});



//// easy initial test
/**
var broker = new Broker({
    port: 12345,
    // log,     // could be nop, or not defined, or some other function
    onClientMessage: function (message, connection, broker) {
        log('MESSAGE RECEIVED!', message);
        broker.broadcast(message);
    }
});

var log, WebSocket;
var wss1 = new WebSocket(`ws://${location.hostname}:12345`);    // var for test, we may want to redefine
var wss2 = new WebSocket(`ws://${location.hostname}:12345`);    // var for test, we may want to redefine
wss1.onmessage = (msg) => log('wss1 in', msg.data);
wss2.onmessage = (msg) => log('wss2 in', msg.data);
setTimeout(() => wss1.send('test'), 3000)
**/
