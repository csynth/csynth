//nb... comments below from original nodeserver.js, subject to revision...
//to build this version you currently need to "npx webpack" from organicart folder.
//to run on a dev machine with node etc installed:
// "npm install" then "npm run server" or launch "organserver" in vscode.

// to run in cmd line
// cd C:\GoldsmithsSVN\aaorganicart\organicart (or equivalent under Google Drive)
// ..\nodejs\node dist\organserver.js
// Google Drive has a build version copied in, from svn you'll need to npm install etc as above.

// This is is two parts:
// Part 1 is a webserver coded to emulate the micro-apache server
// Part 2 is the websocket bridge for OSC superCollider

////////////////////////////////////////////////////////////////////////////////////////////
// Part 1: webserver coded to emulate the micro-apache server
// This has been coded to serve files in the usual way,
// and also to emulate the few php files used on the Apache server, runcmd.pfp and ssavefile.php
//
// Thus it is running in organicart current directory,
// but serving files from the aaorganicart level (or OrganicRuntime or whatever)
// with lots of help from http://stackoverflow.com/questions/6084360/using-node-js-as-a-simple-web-server

// import * as scserver from './scserver'
import {mainServer, websocketReflector, FileSocketWriter} from './serverUtils';

import {startIPCServer} from "./scInterProcessCommunication";

mainServer();
// scserver.start(); //called by spawnSCSynth() -> startSession() after first getting data from
console.log('in main organserver.ts');
// startIPCServer();  // no need for await ?, this was part of scserver.start() but not spawnSCSynth() -> startSession()???
websocketReflector();
FileSocketWriter();

try {
    import('./openvrServer').then(openVRServer => openVRServer.openVRServer());
} catch (error) {
    console.log(`Error loading openVRServer: '${error}'`);
}
