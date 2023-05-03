alert('comms.js no longer relevant, function in serverUtils')
// // websockets broker, derived from https://www.npmjs.com/package/wsbroker
// // but with many features removed (in particular, JSON, matching, and back end support)
// var log, hostname, require;

// var Broker = function (config) {
//     const broker = this;
//     if (!require) return;

//     const Http = require('http');
//     const WebSocketServer = require('ws').Server;

//     broker.config = config;
//     broker.broadcast = broadcast;
//     broker.log = broker.config.log || (()=>{});    // can be overridden later
//     const websocketServer = initWebSocketServer();

//     /** function called when client closed, will callback if specificed */
//     function onWSClose(connection) {
//         broker.log('← connection closed', connection.wskey);
//         if (broker.config.onClientDisconnect)
//             broker.config.onClientDisconnect(connection, broker);
//         broadcast(clients(['!left', connection.wskey, '!clients']));
//     }

//     /** broadcast message.  if fromwskey is specified do not send to that key */
//     function broadcast(message, fromwskey) {
//         if (Array.isArray(message)) message = message.join(Broker.splitter);
//         const recipients = [];
//         websocketServer.clients.forEach(function (toconnection) {
//             if (toconnection.wskey !== fromwskey) {
//                 sendClientMessage(toconnection, message);
//                 recipients.push(toconnection);
//             }
//         });
//         broker.log('← sent to ' + (recipients.length) + '/' + (websocketServer.clients.length) + ' clients', message);
//     }

//     /** function called when client message arrives, process as broker message (!...) or callback */
//     function onClientMessage(fromconnection, message) {
//         broker.log('→ from client', fromconnection.wskey, message);
//         if (message[0] === '!')
//             handleBrokerMessage(fromconnection, message);
//         if (broker.config.onClientMessage)
//             broker.config.onClientMessage(message, fromconnection, broker);
//     }

//     /** handle special message (first char !) at broker */
//     function handleBrokerMessage(fromconnection, message) {
//         const mm = message.split(Broker.splitter);
//         switch (mm[0]) {
//             case '!clients':
//                 sendClientMessage(fromconnection, clients(['!clients']));
//             break;
//             default:
//                 log('unexpected broker message ignored:', message);
//                 sendClientMessage(fromconnection, message + ' UNEXPECTEDMESSAGE');
//             break;
//         }
//     }

//     /** return array of clients, prepended by other details */
//     function clients(pre = []) {
//         websocketServer.clients.forEach( (c) => pre.push(c.wskey) )
//         return pre;
//     }

//     /* send message to specific client, message may be string or array */
//     function sendClientMessage(toconnection, message) {
//         if (Array.isArray(message)) message = message.join(Broker.splitter);
//         // if (typeof message === 'object') message =
//         try {
//             toconnection.send(message);
//             broker.log('← to client', toconnection.wskey, message);
//         } catch (ee) { broker.log('failed to send message to client', toconnection.wskey)}
//     }
//     broker.sendClientMessage = sendClientMessage;

//     /** function called when new client connects */
//     function onWSConnection(connection) {
//         try {
//             connection.broker = broker;
//             connection.wskey = [onWSConnection.id++, hostname, Date.now()].join('_');
//             broker.log('↪ new connection', connection.wskey);
//             connection.on('message', function (message) { onClientMessage(connection, message); });
//             connection.on('close', function () { onWSClose(connection); });
//             broker.broadcast(clients(['!join', connection.wskey, '!clients']));
//             if (broker.config.onClientConnect)
//                 broker.config.onClientConnect(connection);
//         } catch (ee) {
//             broker.log('! Connection Error', ee);
//         }
//     }
//     onWSConnection.id = 1;


//     function initWebSocketServer() {
//         const server = Http.createServer();
//         const wsrv = new WebSocketServer({server});
//         wsrv.on('connection', onWSConnection);
//         wsrv.on('error', (error) => broker.log('websocket server error: ', error));
//         server.listen(broker.config.port, () => {
//             broker.status = 'ready';
//             broker.log('➥ websocket server listening on port ' + broker.config.port);
//         });

//         return (wsrv);
//     }

// }
// Broker.splitter = '\t';  // for parsing broker messages



// //// easy initial test
// /**
// var broker = new Broker({
//     port: 12 345,
//     // log,     // could be nop, or not defined, or some other function
//     onClientMessage: function (message, connection, broker) {
//         log('MESSAGE RECEIVED!', message);
//         broker.broadcast(message);
//     }
// });

// var log, WebSocket;
// var wss1 = new WebSocket(`ws://${location.hostname}:12 345`);    // var for test, we may want to redefine
// var wss2 = new WebSocket(`ws://${location.hostname}:12 345`);    // var for test, we may want to redefine
// wss1.onmessage = (msg) => log('wss1 in', msg.data);
// wss2.onmessage = (msg) => log('wss2 in', msg.data);
// setTimeout(() => wss1.send('test'), 3000)
// **/
