import * as fs from "fs";
import * as http from "http";
import {Server as WebSocketServer} from "ws";
import * as WebSocket from "ws";
import * as cprocess from "child_process";
import * as https from "https";
import * as url from "url";
import * as path from "path";
import { networkInterfaces } from "os";
// import clipboard from 'clipboardy';

Object.assign(globalThis, {fs, http, WebSocket});

/**
 * 8001: WEBRTC_PORT webRTC.io server ??? signal server,(node listener, serverUtils.ts)
 * 8181: ws port client <=> Kinect server (Kinect server listener)
 * 8800: HTTP_PORT http port (node listener, serverUtils.ts)
 * 8801: HTTPS_PORT https port (node listener, serverUtils.ts)
 * 12345: broker ? for comms Organic <> Organic, or ??? Organic<>Camera  (signal url for webrtc?) (node listener, broker.ts)
 * 57115: UDP_PORT SuperCollider <=> server (scsynth listener)
 * 57121: TCP_PORT SuperCollider <=> server (scsynth listener)
 * 57122: WS_IPC_PORT (node listener, scInterProcessCommunication.ts)
 * 57171: WS_PROXY_PORT,  (node listener, scWebsocketProxy.ts)
 * 57777: WS_REFLECT_PORT, WebSocketReflector, also provides some private client<->server services (node listener, serverUtils.ts)
 * 57778: FSWRITER_PORT 'fileSocketWriter' (node listener, serverUtils.ts)
 * 57779: openVR server  (node listener, openvrServer.ts)
 *
 *
 */


const isWindows = process.platform === 'win32';
const connections = {};
const sharedStorage = {};

let lastClient; // last client to use websocketReflector; later allow for multiple clients
export let allowspecial = true;

function getIPAddress() {
    const interfaces = networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (const alias of iface) {
            if (alias.address.startsWith('192.168.') && alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}
console.log('IP address:', getIPAddress());
// // collect clipboard items
 const clipboards = [];
 let clipboard: any = null;
// let lastc = '';
// try {
//     console.log('trying to import clipboardy dynamically...');
//     import('clipboardy').then(c => {
//         clipboard = c.default;
//         setInterval( () => {
//             const n = clipboard.readSync();
//             if (n !== lastc) {
//                 console.log('new clip seen:', n.substring(0, 20));
//                 clipboards.push(n);
//                 if (lastClient) {
//                     console.log('new clip seen, sending to client:', n.substring(0, 20));
//                     lastClient.send('clipboard:' + n);
//                 } else {
//                     console.log('no client to send clip');
//                 }
//             }
//             lastc = n;
//         }, 500);
//     })
// } catch (error) {
//     console.error(`>>>> failed to load clipboardy: <<<< \n${error}`);
// }

process.on('uncaughtException', function (err) {
    console.error(err);
})

export let log = console.log;
//also used by 'reflector' below, fairly trivial.
export let http_request: http.RequestListener = function (request, response) {
    response.writeHead(403, {"content-type": "text/plain"});
    response.write("won't do http\n");
    response.end();
};
// Select 'binary' or 'base64' subprotocol, preferring 'binary'
export let selectProtocol = function (protocols, callback) {
    //# rules for this must have changed at some point
    //# callback is now a request object, and we return a protocol
    if (protocols.indexOf('binary') >= 0) {
        return 'binary'; //# callback(true, 'binary');
    } else if (protocols.indexOf('base64') >= 0) {
        return 'base64'; //# callback(true, 'base64');
    } else {
        console.log("Client must support 'binary' or 'base64' protocol");
        return false; //# callback(false);
    }
}

/** websocketReflector will send messages, especially to last client */
export function websocketReflector() {
    let source_host = '';
    let WS_REFLECT_PORT = 57777;

    // Handle new WebSocket client
    let new_refl_client = function (client: WebSocket, request: http.IncomingMessage) {
        let clientAddr = request.socket.remoteAddress;
        lastClient = client;            // note, no on open, if we get here already open???
        let log = function (...m) {
            console.log('<|>', clientAddr, ...m)
        }
        log('reflect: WebSocket connection, reflect', 'protocol:', client.protocol);
        client.on('message', function (data: any) {  // data should be WebSocket.Data
            lastClient = client;
            try {
                if (data.indexOf('!!!!') !== -1) {
                    log('reflect: no reflect:', data.substring(0, 50));
                } else if (data.startsWith('watch:')) {
                    fs.watch(data.substring(6), (event,filename) => {
                        client.send(`watch: ${event} ${filename}`);
                    })
                } else if (client.protocol === '') {
                    log('reflect: reflect message (empty protcol):', data.substring(0, 50));
                    client.send(data);
                } else if (client.protocol === 'base64') {
                    const sdata = Buffer.alloc(data).toString('base64');
                    log('reflect: reflect message (base64):', sdata.substring(0, 50));
                    client.send(sdata);
                } else {
                    log(`reflect: reflect message (?protocol${client.protocol}):`, data.substring(0, 50));
                    client.send(data, {binary: true});
                }
            } catch (e) {
                log("Client closed, cleaning up target");
            }
        });
        client.on('close', function (code, reason) {
            log('reflect: WebSocket client disconnected: ' + code + ' [' + reason + ']');
            lastClient = undefined;
        });
        client.on('error', function (a) {
            log('reflect: WebSocket client error: ' + a);
        });
    };

// send any input typed at console to last opened client
// https://www.dev2qa.com/node-js-get-user-input-from-command-line-prompt-example/
    var standard_input = process.stdin;  // Get process.stdin as the standard input object.
    standard_input.setEncoding('utf-8'); // Set input character encoding.
    log('listening on input to forward to client (if any)');

    function sendfile(key) {
        const fid = 'CSynth/data/' + key;
        const sdata = fs.readFileSync(fid, 'utf8');
        lastClient.send('file:' + key);
        lastClient.send(sdata);
    }

    setTimeout(()=>console.log('"cls<enter>" to clear console, "con<enter>" to vew number of connections'), 1000);
    standard_input.on('data', function (rawData) { // When user input data and click enter key.
        let data: string = rawData.toString();
        data = data.trimRight();
        // console.log('in data', data);
        if (data === 'cls') {console.clear(); return; }
        if (data === 'con') {console.log(JSON.stringify(connections)); return; }
        if (data === 'special') {allowspecial = true; console.log('allowspecial', allowspecial); return; }
        if (data === 'nospecial') {allowspecial = false; console.log('allowspecial', allowspecial); return; }

        if (lastClient) {
            try {
                if (data.startsWith('getfile:')) {
                    sendfile(data.substring(8).trim());
                } else if (data.startsWith('testfile:')) {
                    const key = data.substring(9).trim() || 'redobserved.contacts';
                    sendfile(key);
                    // const cmd = `springdemo({contacts: '${key}', key: 'sendtest', currentLoadingDir: ''})`;
                    const cmd = `springdemo({contacts: '${key}'})`;
                    lastClient.send(cmd);
                } else {
                    lastClient.send(data);
                }
            } catch (e) {
                log('lastClient send failed', e);
            }
        } else {
            log('no client to send data ...');
        }
    });


    console.log("reflect: Running minimal WebSocket reflector.  Settings: ");
    console.log("reflect:     - proxying from " + source_host + ":" + WS_REFLECT_PORT);
    //let webServer = http.createServer(http_request);
    let webServer = http.createServer(http_request);

    webServer.listen(WS_REFLECT_PORT, function () {
        const wsServer = new WebSocketServer({
            server: webServer,
            handleProtocols: selectProtocol
        });
        wsServer.on('connection', new_refl_client);
    });
} // end websocketReflector

export function mainServer() {
// var request = require('request')
//nb:::  we rely on cwd being aaorganicart/organicart but baseDirectory being aaorganicart
//having trouble with __dirname after webpack build?
// sjpt 2 Aug 2020, no good reason to server at parent directory ??? ??? my be general user directory if using open source?
    const cwd = process.cwd();
    const lastSlash = Math.max(cwd.lastIndexOf('/'), cwd.lastIndexOf('\\'));
    // const baseDirectory = cwd.substr(0, lastSlash); //__dirname
    const baseDirectory = cwd;

    console.log('serving ' + baseDirectory)

    const HTTP_PORT = 8800;
    const HTTPS_PORT = 8801;

    // console.log(';set up SIGTERM');
    // process.on('SIGTERM', () => {
    //     console.log(';end SIGTERM');
    //     require('child_process').exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"')
    // })
    // console.log(';set up exit');
    // process.on('exit', () => {
    //     console.log(';end exit');
    //     require('child_process').exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"')
    // })
    console.log(';set up SIGINT');
    process.on('SIGINT', () => {
       console.log(';end SIGINT 99');
       // require('child_process').exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"')
       // below works for ctrl-C end, but not more violent end
       // require('child_process').exec('start "fred" cmd /c ..\\nodejs\\node.exe dist\\organserver.js');
       setTimeout(() => process.exit(99), 200);      // do we need to be more graceful?
       return 99;
    })

    ////  XXX TODO: make this work / fail gracefully on non-Windows
    // emulate runcmd.php.
    // use of 'start' does not seem to be as asynchronous as I expected
    // and things still waited till the started process completed
    // so we explicitly make start even more async
    async function cmd(arg, response) {
        if (!isWindows) {
            writeresp(response, 500, "server cmd function only works on windows");
            log(`ignoring cmd '${arg}'`);
            return;
        }
        if (!allowspecial) {
            writeresp(response, 500, `cmd disabled, nospecial ${arg}`);
            log(`ignoring cmd '${arg}'`);
            return;
        }
        if (arg == "makevr") {
            log('makeVR....##########################################');
            arg = "cscript makeVR.vbs";
        }
        if (arg.startsWith('cmd ')) arg = 'cmd.exe ' + arg.substring(3);
        //console.log('cmd requesting', arg);
        let rr;
        if (arg.startsWith('start ')) {
            cprocess.exec(arg, (error, stdout, stderr) => {
                if (error)
                    console.log(`cmd return, ${arg} err:${error} stdout:${stdout} err: ${stderr}`);
                // these are much too late for a useful response
                // if (error) writeresp(response, 202, error.toString())
                // else writeresp(response, 200, stdout);
            });
            rr = 'process attempted async: ' + arg;
        } else {
            try {
                //rr = cprocess.execSync(arg);
                cprocess.exec(arg, (error, stdout, stderr) => {
                    if (error) {    // not sure when errors get caught here, and when by try catch
                        log('command', arg, 'error', error);
                        writeresp(response, 220, error);
                        return;
                    }
                    writeresp(response, 200, stdout);
                });
            } catch (e) {
                log('command', arg, 'error', e.message);
                writeresp(response, 220, e.message);
                return;
            }
        }

        // writeresp(response, 200, rr);
        return;
    }

// for directory listing
    function dir(tolist, response) {
        const unlist = unescape(tolist).split('/,,').join('\\..');;
        // log('dir tolist', tolist, unlist);
        const list = fs.readdirSync(unlist);
        // log('\ndir', unlist, list.length)
        const rr = {};
        list.forEach(n => {
            const ii = fs.statSync(unlist + '/' + n);
            (ii as any).isDir = ii.isDirectory();
            rr[n] = ii;
        });
        // workaround odd bug where last two characters of response lost for dir of '.'
        writeresp(response, 200, JSON.stringify(rr) + '     ');
    }

// emulate savefile.php
    function savefile(message, response, append = false) {
        const fid = message.headers["content-disposition"];
        console.log('saving file:' + fid);
        const file = fs.openSync(fid, append ? 'a' : 'w');

        // https://stackoverflow.com/questions/31006711/get-request-body-from-node-jss-http-incomingmessage
        const r = message;
        r.on('data', function (frag) {
            // console.log('frag ...' + frag);
            fs.writeSync(file, frag, 0, frag.length);
        });
        r.on('end', function () {
            fs.close(file, err => {
                if (err) {
                    const s = `failed to close file '${file}'`;
                    console.error(s);
                    writeresp(response, 500, s);
                }
                // console.log('file saved', fid);
                writeresp(response, 200, 'OK');
            });
        });
    }

// write response
    function writeresp(response: http.ServerResponse, rc: number, text?) {
        const headers = {
            "content-type": "text/plain",
            'Access-Control-Allow-Origin': '*'
        };
        if (text) {
            if (text.message) text = text.message;
            text = text.toString();
            headers["content-length"] = text.length;
            // log('content-length', text.length);
        }
        response.writeHead(rc, headers);
        if (text) response.write(text);
        response.end();
    }

// make a call on to a remote site
// do this fully async
    function remote(path, response) {
        console.log('request for remote data', path);
        https.get(path, (resp) => {
            //console.log('statusCode:', resp.statusCode);
            //console.log('headers:', resp.headers);
            // let len;
            // try {
            //     len = resp.headers["content-length"];
            //     console.log('load remote', path, 'length:', len);
            // } catch(e) {

            // }

            // const contentType = {"content-type": "text/plain"};
            // if (len !== undefined) contentType["content-length"] = len;
            // response.writeHead(resp.statusCode, contentType);
            if (resp.statusCode === 301) {
                console.log('forwarded >>>')
                return remote(resp.headers.location, response);
            }

            response.writeHead(resp.statusCode, resp.statusMessage, resp.headers);

            let chunks = 0;
            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                // console.log('chunk');
                // data += chunk;
                chunks++;
                response.write(chunk);
            });
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                console.log(path, 'ok response, chunks', chunks);
                response.end();
            })
        }).on("error", (err) => {
            console.log("Error: " + err.message);
            writeresp(response, 999, err);
        });
    } // remote

    const server = http.createServer(servfun).listen(HTTP_PORT);
    server.on('error', e => {
        console.error('server error', e);
        process.exit(1);
    });
    console.log("listening on port " + HTTP_PORT);

    try {
        const options = {
            // key: fs.readFile Sync('../webserver/test_key.pem'),
            // cert: fs.readFile Sync('../webserver/test_cert.pem')
            key: fs.readFileSync('./cert/CA/localhost/localhost.decrypted.key'),
            cert: fs.readFileSync('./cert/CA/localhost/localhost.crt')
        //    key: fs.readFile Sync('./RootCA.key'),
        //    cert: fs.readFile Sync('./RootCA.crt')
        //    key: fs.readFile Sync('./cert/key.pem'),
        //    cert: fs.readFile Sync('./cert/cert.pem')


        }
        https.createServer(options, servfun).listen(HTTPS_PORT);
        console.log("https listening on port " + HTTPS_PORT);
    } catch(e) {
        console.error("https NOT listening on port " + HTTPS_PORT, e.message);
    }

    // help parse things such as /eval/'test'
    function getarg(upath: string, cmd: string): string {
        if (upath.startsWith(cmd))
            return upath.substring(cmd.length);
        return undefined;
    }

    /**
     *
     * @param message Summary of serverfun features
     * will only work for what it considers localhost
     * 'normal' behaviour is to server requested file like a regulare webserver,        'test.test'
     *      also accepts fid|position|length for serving parts of a file,               'test.test|4|2'
     *      generally takes fid relative to base (organicart) folder                    '/test.test'
     *      fid starting '/!' allows access to anywhere in the filesystem               '/!c:\\temp/logsound.log'
     *      accepts ,, for ..                                                           ',,/AAA TadpoleVR.cmd'
     *                                                                                  '../../../../../../temp/logsound.log'
     * special cases such as /clear/, /runcmd.php, /savefile.php for running commands and saving files

     *
     * @param response
     */
    async function servfun(message:http.IncomingMessage, response:http.ServerResponse) {
        try {
            var requestUrl = url.parse(message.url);
            var upath = unescape(requestUrl.pathname);
            upath = upath.split('//').join('/').replace('https:/', 'https://');
            const host = message.headers.host;
            const client = message.connection.remoteAddress;
            if (!connections[client]) {
                log('first connection from', client, 'uses', host);
                connections[client] = 0;
            }
            connections[client]++;

            if (!(host.startsWith('localhost:')
                || host.startsWith('127.0.0.1:')
                || host.includes('.local:')
                || host.startsWith('192.168.'))) {
                    log('rejected connection from', host)
                    return writeresp(response, 999, `will only serve locally, host '${host}' refused.`);
            }

            if (allowspecial) {
                const xxpath = upath.split('/').slice(0, -1).join('/');
                const pref = '/remote/';  //handle remote before checking things like dir
                const pp = upath.split(pref);
                let arg;

                if (pp[1]) return remote(pp[1], response);
                // not sure why we have endsWith rather than ===
                if (upath.endsWith('/clipboard/')) {
                    if (clipboard === null) return;
                    const rr = clipboard.readSync();
                    writeresp(response, 200, rr);
                    return;
                }
                if (upath.endsWith('/clipboards/')) { const rr = clipboards.join('!£"'); writeresp(response, 200, rr); return; }

                if (upath.endsWith('/clear/')) { console.clear(); writeresp(response, 200, 'cleared'); return; }
                if (upath.endsWith('/runcmd.php')) return await cmd(unescape((message.headers as any).cmd), response);
                if (upath.endsWith('/savefile.php')) return savefile(message, response);
                if (upath.endsWith('/appendfile.php')) return savefile(message, response, true);
                if (arg = getarg(upath, '/eval/')) {
                    try {
                        const rr = eval(arg);
                        writeresp(response, 200, rr);
                    } catch (e) {
                        writeresp(response, 200, '!!!!!' + e.message);
                    }
                    return;
                }
                if (arg = getarg(upath, '/evalj/')) {
                    try {
                        const args = JSON.parse(arg);   // eg  '["fs","existsSync","threek.html"]'
                        const rr = eval(arg);
                        const obj = rr.shift();     // eg example fs
                        const item = rr.shift();    // eg existsSync
                        const res = globalThis[obj][item](...rr);   // eg fs.existsSync('threek.html')
                        writeresp(response, 200, JSON.stringify(res));
                    } catch (e) {
                        writeresp(response, 200, '!!!!!' + e.message);
                    }
                    return;
                }
                if (arg = getarg(upath, '/fileexists/')) {
                    return writeresp(response, 200, fs.existsSync(arg));
                }
                if (arg = getarg(upath, '/filedelete/')) {
                    return writeresp(response, 200, fs.unlinkSync(arg));
                }
                if (arg = getarg(upath, '/filesize/')) {
                    return writeresp(response, 200, fs.statSync(arg).size);
                }
                if (arg = getarg(upath, '/filestat/')) {
                    return writeresp(response, 200, JSON.stringify(fs.statSync(arg)));
                }
                if (arg = getarg(upath, '/st_get/')) {
                    return writeresp(response, 200, sharedStorage[arg]);
                }
                if (arg = getarg(upath, '/st_set/')) {
                    const v = arg.match(/(.*?)=(.*)/)
                    if (v[2] === '') {
                        let data = ''
                        message.on('data', frag => data += frag)
                        message.on('end', () => {
                            sharedStorage[v[1]] = data;
                            writeresp(response, 200, '');
                        });
                        return;
                    }

                    if (v) return writeresp(response, 200, sharedStorage[v[1]] = v[2]);
                    return writeresp(response, 404);
                }
                if (upath === '/leap-disconnected/') {
                    restartLeapService();
                    return writeresp(response, 200);
                }
                if (upath === '/startSCSynth/') {
                    // seems better not to block here.
                    const r = response;
                    //at what point should spawnSCSynth return control to the client?
                    spawnSCSynth().then(()=>writeresp(r, 200));
                    return;
                }
                if (upath === '/remoteURL/') {
                    const url = `http://${getIPAddress()}:${8800}/dist/vite/controls.html`;
                    writeresp(response, 200, url);
                }
                if (upath === '/remoteDevURL/') {
                    const url = `http://${getIPAddress()}:${5173}/controls.html`;
                    writeresp(response, 200, url);
                }
                if (upath === '/connections/') {
                    return writeresp(response, 200, JSON.stringify(connections));
                }

                    // if (requestUrl.query[0] === '/')
                    //     return dir(baseDirectory + requestUrl.query, response);
                    // else
                    //     return dir(baseDirectory + xxpath + '/' + requestUrl.query, response);

                // need to use path.normalize so people can't access directories underneath baseDirectory
                // but we can get at them anyway with runcmd so not that necessary
                // allow /! as escape for arbitrary path, eg '/!d:/temp/kilnpower.txt'
            } // ~~~~~~~~~~~~~~~ end of special

            if (upath.endsWith('/dir.php')) {
                // log ('in dir')
                return dir(_resolvePath(requestUrl.query), response);
            }

            function _resolvePath(upath) {
                //log ('in _resolvePath <', upath)
                const gdkey = '/gdrive';
                const gdfull = '/!' + process.env.USERPROFILE + '/Google Drive/organic/OrganicRuntime/organicart';
                if (upath.startsWith(gdkey)) upath = upath.replace(gdkey, gdfull)
                let fsPath = upath.startsWith('/!') ? upath.substr(2) : baseDirectory + '/' + path.normalize(upath);
                fsPath = fsPath.split('\\,,').join('\\..').split('/,,').join('/..');
                //log ('in _resolvePath >?', fsPath)
                return fsPath;
            }

            let fsPath = _resolvePath(upath);
            const fss = fsPath.split('|');      // parse out position andlength
            const partial = fss.length === 3
            if (fss.length !== 1 && !partial) return writeresp(response, 400);
            fsPath = fss[0];

            if (!fs.existsSync(fsPath)) {
                if (!fsPath.endsWith('.map')) log('no file: ' + fsPath);
                writeresp(response, 404);
                return;
            }
            let stats = fs.lstatSync(fsPath);
            if (stats.isDirectory()) {
                fsPath += '/index.html';
                stats = fs.statSync(fsPath)
            }
            // console.log('trying ' + upath)
            const fileSizeInBytes = stats.size;

            function doctt(len) {
                let ct = message.headers['content-type'];
                if (ct) {}
                else if (fsPath.endsWith('.js')) ct = 'application/javascript';
                else if (fsPath.endsWith('.wasm')) ct = 'application/wasm';
                else if (fsPath.endsWith('.html')) ct = 'text/html';
                else if (fsPath.endsWith('.css')) ct = 'text/css';

                let ctt = ct ? {'content-type': ct} : {};
                Object.assign(ctt, {
                    'X-Content-Type-Options': 'nosniff',
                    'content-length': len,
                    'Access-Control-Allow-Origin': '*',
                    // allow SharedArrayBuffers
                    // https://developer.chrome.com/blog/enabling-shared-array-buffer/#cross-origin-isolation
                    // https://web.dev/cross-origin-isolation-guide/
                    // 8 Feb 2022: do NOT use for now as we have cross-origin google docs and we aren't using SharedArrayBuffers yet
                    // "Cross-Origin-Opener-Policy": "same-origin",
                    // "Cross-Origin-Embedder-Policy": "require-corp",
                    // "Cross-Origin-Resource-Policy": "same-origin"
                })

                response.writeHead(200, 'OK', ctt);
            }

            if (partial) {
                const fh = fs.openSync(fsPath, 'r');    // could cache for repeated calls to same file, but doesn't help much
                const len = +fss[2], pos = +fss[1];
                const buffer = Buffer.alloc(len);
                const olen = fs.readSync(fh, buffer, 0, len, pos);
                fs.closeSync(fh);
                doctt(olen);
                response.write(olen === len ? buffer : buffer.slice(0, olen));
                response.end();
            } else {
                const fileStream = fs.createReadStream(fsPath);
                fileStream.pipe(response);
                fileStream.on('open', function () {
                    doctt(fileSizeInBytes);
                });
                fileStream.on('close', function () {
                    response.end()
                });
                fileStream.on('error', function () {
                    writeresp(response, 404)
                })
            }
        } catch (e) {
            writeresp(response, 404);
            console.log(e.stack)
        }
    }
}

export function shutdown() {
    //taskkill /f /t /FI "IMAGENAME eq chromevr*"
    cprocess.exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"');
    //runcommandphp('cmd /c ..\\killsteam.cmd');
    //runcommandphp('shutdown /s /t 5')
    cprocess.exec('shutdown /s /t 5');

}

function restartLeapService() {
    //would need to be running as admin, which seems like a bad idea especially given general lack-of security of this server.
    //(not confident we won't find it more open to the world than anticipated at some point)
    //maybe have another (admin) process whose only purpose is receiving message to restart and doing so?

    //maybe C:/Program Files/Leap Motion/Core Services/LeapSvc.exe --bg will be different?

    console.log('attempting to restart LeapService...');
    cprocess.exec('net start LeapService', (err, stdout, stderr) => {
        if (err) console.error(`error in restartLeapService: ${err}`);
        else console.log('finished restarting LeapService:');
        console.log(`stdout: ${stdout}`);
        if (stderr) console.log(`stderr: ${stderr}`);
    });
}

/** stream data to file; first packet is filename, subsequent packets are appended to file */
export function FileSocketWriter() {
    const FSWRITER_PORT = 57778;
    const nop = ()=>{};

    /** function called when new client connects */
    function onWSConnection(connection) {
        let read = false;
        let fid, file, append = false, buffer = new Uint8Array(0);
        try {
            connection.on('message', function (message) {
                // log('FileSocketWriter: ' + message);
                try {
                    if (!fid) {
                        fid = message;
                        read = fid[0] === '?';
                        if (read) fid = fid.substr(1);
                        log(`FileSocketWriter: ${fid} read ${read} file ${file}`);
                        file = fs.openSync(fid, read ? 'r' : append ? 'a' : 'w');
                    } else {
                    //log(`FileSocketWriter write: file ${file}, message ${message}`);
                        if (!read) {
                            fs.writeSync(file, message); // , nop);
                        } else {
                            const bb = message.split(' ');
                            const len = +bb[0], pos = +bb[1];
                            if (len > buffer.length) buffer = new Uint8Array(len);
                            //log('file readSync', len, +bb[0]);
                            const leno = fs.readSync(file, buffer, 0, len, pos);
                            log(`file readSync done len=${len}, pos=${pos}, leno=${leno}`);
                            //log('connection.writeSync'); // ??? these log messages don't appear even though the send() works?
                            connection.send(buffer.subarray(0, leno));
                            //log('connection.writeSync done');
                        }
                    }
                } catch(e) {
                    log(`FileSocketWriter read/write: error ${e}`);
                }
            });

            connection.on('close', function () {
                try {
                    if (file !== undefined) fs.close(file, nop);
                } catch (e) {
                    console.error('error closing file for closed websocket', e);
                }
            });
        } catch (ee) {
            log('error in FileSocketWriter.onWSConnection', ee);
        }
    }

    function initWebSocketServer() {
        const server = http.createServer();
        const wsrv = new WebSocketServer({server});
        wsrv.on('connection', onWSConnection);
        wsrv.on('error', (error) => log('FileSocketWriter error: ', error));
        server.listen(FSWRITER_PORT, () => {
            log('FileSocketWriter listening on port ' + FSWRITER_PORT);
        });
        return (wsrv);
    }
    const websocketServer = initWebSocketServer();
}

const WEBRTC_PORT = 8001
log("starting webrtc.io 'server' on port", WEBRTC_PORT)
try {
    var webRTC = require('webrtc.io').listen(WEBRTC_PORT);
    log("started webrtc.io 'server' on port", WEBRTC_PORT)
} catch (e) {
    console.error('cannot start webrtc.io server', e);
}

import {broker} from "./broker";
import { spawnSCSynth } from "./scsynthProcess";
log('broker imported', broker.config.port, broker);
