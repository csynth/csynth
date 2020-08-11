import * as os from 'os';
import * as fs from 'fs';
import * as https from 'https';
import * as querystring from 'querystring';

import {logDir} from './scconfig'

let logFile : string;
const badLogFile = `${logDir}/tErrors_${os.hostname()}_${
    new Date().toISOString().replace(/:/g, '_')
        .replace('T', '_').substr(0, 19)
}.log`;
const appLogFile = `${logDir}/tApp_${os.hostname()}_${
    new Date().toISOString().replace(/:/g, '_')
        .replace('T', '_').substr(0, 19)
}.log`;
const heartbeatFile = `${logDir}/heartbeat.log`;

//nb, copy/pasted from nw_sc rather than actually using same type for now...
//may not be too hard to send an email to us when BadError or StopTheWorld happen?
export enum LogLevel { Msg=0, Code=1, Error=2, BadError=3, StopTheWorld=4, Heartbeat=-1, App = -2}

export function sclogS(message: string, logLevel?: LogLevel) {
    if (logLevel === LogLevel.Heartbeat) {
        // this will often just be a write as the monitor will delete the old one
        fs.appendFile(heartbeatFile, message, err => {
            if (err) console.log("sclog error: '" + err + "' while saving heartbeat " + message);
        });
        return;
    }
    if (logLevel === LogLevel.App) {
        fs.appendFile(appLogFile, message, err => {
            if (err) console.log("sclog error: '" + err + "' while saving appLogFile " + message);
        });
        return;
    }

    if (!logFile) clearLog(true);
    const d = new Date().toTimeString().substr(0, 8);
    console.log(`[sclog] ${d}: ${message}`);
    if (logLevel >= 2) {
        const errMsg = `${d}:\t${message}\n`;
        fs.appendFile(badLogFile, errMsg, err => {
            if (err) console.log("sclog error: '" + err + "' while logging error " + errMsg);
        });
        if (logLevel >= 3) {
            //sendEmail(errMsg); //not directly - we'd need local email credentials
            postMessageToServer(errMsg);
        }
    }
    fs.appendFile(logFile, message + '\n', err => {
        if (err) console.log("sclog error: '" + err + "' logging " + message);
    });
}

function postMessageToServer(msg: string) {
    const API = "https://9om1r34xq4.execute-api.us-east-1.amazonaws.com/default/OrganicErrorEmail";
    const host = "9om1r34xq4.execute-api.us-east-1.amazonaws.com";
    const path = "/default/OrganicErrorEmail?";
    const secret = "I am not a hacker, honest guv";
    //https://stackoverflow.com/questions/40537749/how-do-i-make-a-https-post-in-node-js-without-any-third-party-module
    //see comment there on JSON (which didn't work with AWS config on first try)
    ///.... expecting query params instead of postData - which is what querystring is for... maybe these aren't params?
    /// can the path string not be seen?
    const postData = querystring.stringify({'errorMsg': msg, 'secret': secret});
    console.log('querystring: ' + postData);
    const options = {
        hostname: host, path: path+postData, port: 443, method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': 0 }
    };
    sclogS('Posting message to server...');
    const req = https.request(options, res => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        res.on('data', d => process.stdout.write(d));
    });
    req.on('error', e => console.error(e));
    //req.write(null);
    req.end();
}

export function sclogRaw(message: string) {
    if (!logFile) clearLog(true);
    //console.log('[sclog] ' + message);
    console.log(message.toString());
    fs.appendFile(logFile, message, err => {
        if (err) console.log("sclog error: '" + err + "' logging " + message);
    });
}

export function sclogSE(message: string) {
    console.log('[sclogE] >> ' + message);
    sclogS(message, LogLevel.Error);
}

export function clearLog(newFile: boolean) {
    if (newFile) {
        const t = new Date();
        //TODO: try to make sure this is somewhere that "Console" app on OSX will be able to see it.
        //turns out that might be a bit difficult on account of permissions
        //http://stackoverflow.com/questions/18096438/how-read-write-from-library-logs-of-mac
        logFile = logDir + "/tOrganserver_" + os.hostname() + '_' + t.toISOString().replace(/:/g, '_').replace('T', '_').substr(0, 19) + ".log";
        //won't do any harm not deleting, will just write to the same one if run more than once in the same minute.
        //if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

        //purge all but recent files
        const maxFilesToKeep = 200;
        fs.readdir(logDir, (err, files) => {
            if (err) {
                console.error("Error reading sclog files: " + err);
                return;
            }
            files = files.filter(f=>f.endsWith('.log'));
            if (files.length > maxFilesToKeep) {
                //order should be oldest first because of filename
                let filesToDelete = files.splice(0, files.length - maxFilesToKeep);
                filesToDelete.forEach(f => {
                    fs.unlink(logDir + '/' + f, err2 => {
                        //arrow-code-orama: TODO require('fs/promises')
                        if (err2) sclogSE(`error deleting log file ${f} (${err2})`);
                        else sclogS(`deleted old log file ${f}`);
                    });
                });
                //sclog("Log files to delete:");
                //sclog(filesToDelete.join('\n'));
            }
        });
    }
    sclogS(new Date() + ": Log cleared");
}
