/**
 * //////------ TSServer-TODO ------
 * maybe allow loading (& saving) config from a file (in user home dir?) at some point
 */

import * as os from 'os';
import * as fs from 'fs';

let logDir = os.tmpdir() + '/organiclogs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

export let synthdefDir = "synthdefs/bin";
export let synthdefSrcDir = "synthdefs";
export let synthCtrlNamesFile = "./synthdefs/map/ctrlNames.yaml";
export let scprotocol = 'tcp', clumsySend = 0, clumsyRec = 0;  // protocol tcp, udp, ws

let UDP_PORT = 57115, TCP_PORT = 57121, WS_PROXY_PORT = 57171, WS_IPC_PORT = 57122,
    HOST = "127.0.0.1", MAX_NODES = 8192, sampleRate = 44100,
    audioDevice = 'default', bufSize = undefined, VRAudioDevice = 'default',
    scsynth = 'default', sclang = 'default';

export { logDir, UDP_PORT, TCP_PORT, WS_PROXY_PORT, WS_IPC_PORT, HOST, MAX_NODES,
    audioDevice, bufSize, VRAudioDevice, scsynth, sclang, sampleRate
};
