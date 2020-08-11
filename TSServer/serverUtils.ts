import * as fs from "fs";
import * as http from "http";
import {Server as WebSocketServer} from "ws";
import * as cprocess from "child_process";
import * as https from "https";
import * as url from "url";
import * as scserver from "./scserver";
import * as path from "path";

const isWindows = process.platform === 'win32';

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

export function websocketReflector() {
    let source_host = '';
    let source_port = 57777;
    let lastClient;

    // Handle new WebSocket client
    let new_refl_client = function (client) {
        lastClient = client;
        let clientAddr = client._socket.remoteAddress;
        let log = function (...m) {
            console.log(clientAddr, ...m)
        }
        log('reflect: WebSocket connection, reflect');
        log('Version ' + client.protocolVersion + ', subprotocol: ' + client.protocol);

        client.on('message', function (data) {
            try {
                if (data.indexOf('!!!!') !== -1) {
                    log('reflect: no reflect: ' + data.substring(0, 50));
                } else if (client.protocol === '') {
                    log('reflect: reflect message: empty protcol: ' + data.substring(0, 50));
                    client.send(data);
                } else if (client.protocol === 'base64') {
                    const sdata = new Buffer(data).toString('base64');
                    log('reflect: reflect message: base64: ' + sdata.substring(0, 50));
                    client.send(sdata);
                } else {
                    log('reflect: reflect message: NOT base64: ' + data.substring(0, 50));
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

    standard_input.on('data', function (rawData) { // When user input data and click enter key.
        let data: string = rawData.toString();
        if (lastClient) {
            try {
                data = data.slice(0, -2)
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
    console.log("reflect:     - proxying from " + source_host + ":" + source_port);
    //let webServer = http.createServer(http_request);
    let webServer = http.createServer(http_request);

    webServer.listen(source_port, function () {
        const wsServer = new WebSocketServer({
            server: webServer,
            handleProtocols: selectProtocol
        });
        wsServer.on('connection', new_refl_client);
    });
}

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

    const port = 8800;
    const httpsport = 8801;

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
       require('child_process').exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"')
       return 99;
    })

    ////  XXX TODO: make this work / fail gracefully on non-Windows
    // emulate runcmd.php.
    // use of 'start' does not seem to be as asynchronous as I expected
    // and things still waited till the started process completed
    // so we explicitly make start even more async
    function cmd(arg, response) {
        if (!isWindows) {
            writeresp(response, 500, "server cmd function only works on windows");
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
                console.log(`cmd return, ${arg} err:${error} stdout:${stdout} err: ${stderr}`);
                // these are much too late for a useful response
                // if (error) writeresp(response, 202, error.toString())
                // else writeresp(response, 200, stdout);
            });
            rr = 'process attempted async: ' + arg;
        } else {
            try {
                rr = cprocess.execSync(arg);
            } catch (e) {
                log('command', arg, 'error', e.message);
                writeresp(response, 220, e.message);
                return;
            }
        }

        writeresp(response, 200, rr);
        return;
    }

// for directory listing
    function dir(tolist, response) {
        const unlist = unescape(tolist);
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
    function writeresp(response, rc, text?) {
        const contentType = {"content-type": "text/plain"};
        if (text) {
            if (text.message) text = text.message;
            text = text.toString();
            contentType["content-length"] = text.length;
            // log('content-length', text.length);
        }
        response.writeHead(rc, contentType);
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
            const len = resp.headers["content-length"];
            console.log('load remote', path, 'length:', len);

            const contentType = {"content-type": "text/plain"};
            contentType["content-length"] = len;
            response.writeHead(resp.statusCode, contentType);

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
    }

    http.createServer(servfun).listen(port);
    console.log("listening on port " + port);


    const options = {
    //   key: fs.readFileSync('../webserver/test_key.pem'),
    //   cert: fs.readFileSync('../webserver/test_cert.pem')
    };
    https.createServer(options, servfun).listen(httpsport);
    console.log("https listening on port " + httpsport);


    async function servfun(message, response) {
        try {
            var requestUrl = url.parse(message.url);
            var upath = unescape(requestUrl.pathname);
            upath = upath.split('//').join('/').replace('https:/', 'https://');

            if (!(message.headers.host.startsWith('localhost:')
                || message.headers.host.startsWith('127.0.0.1:')
                || message.headers.host.startsWith('192.168.')))
                return writeresp(response, 999, 'will only serve locally');

            const xxpath = upath.split('/').slice(0, -1).join('/');
            const pref = '/remote/';  //handle remote before checking things like dir
            const pp = upath.split(pref);
            if (pp[1]) return remote(pp[1], response);
            if (upath.endsWith('/runcmd.php')) return cmd(unescape(message.headers.cmd), response);
            if (upath.endsWith('/savefile.php')) return savefile(message, response);
            if (upath.endsWith('/appendfile.php')) return savefile(message, response, true);
            if (upath === '/leap-disconnected/') {
                restartLeapService();
                writeresp(response, 200);
                return;
            }
            if (upath === '/startSCSynth/') {
                await scserver.spawnSCSynth(); //this is async, TSC seems ok with that.
                writeresp(response, 200); //maybe I should consider exceptions here.
                return;
            }

            if (upath.endsWith('/dir.php')) return dir(baseDirectory + xxpath + '/' + requestUrl.query, response);

            // need to use path.normalize so people can't access directories underneath baseDirectory
            // but we can get at them anyway with runcmd so not that necessary
            // allow /! as escape for arbitrary path, eg '/!d:/temp/kilnpower.txt'

            let fsPath = upath.startsWith('/!') ? upath.substr(2) : baseDirectory + path.normalize(upath);
            fsPath = fsPath.split('\\,,').join('\\..');
            if (!fs.existsSync(fsPath)) {
                log('no file: ' + fsPath);
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

            const fileStream = fs.createReadStream(fsPath);
            fileStream.pipe(response);
            fileStream.on('open', function () {
                const ct = message.headers['content-type'];
                let ctt = ct ? {'content-type': ct} : undefined;
                if (!ctt && fsPath.endsWith('.js')) ctt = {'content-type': 'application/javascript'};
                if (ctt) ctt['content-length'] = fileSizeInBytes;
                if (ctt) ctt['Access-Control-Allow-Origin'] = '*';
                response.writeHead(200, ctt);
            });
            fileStream.on('close', function () {
                response.end()
            });
            fileStream.on('error', function () {
                writeresp(response, 404)
            })
        } catch (e) {
            writeresp(response, 404);
            console.log(e.stack)
        }
    }
}

export function shutdown() {
    //taskkill /f /t /FI "IMAGENAME eq chromevr*"
    require('child_process').exec('taskkill /f /t /FI "IMAGENAME eq chromevr*"');
    //runcommandphp('cmd /c ..\\killsteam.cmd');
    //runcommandphp('shutdown /s /t 5')
    require('child_process').exec('shutdown /s /t 5');

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
