//import { ChildProcess } from "child_process";
//import { write } from "fs"; // will make this a module, at which point nothing can find anything defined here.
//I think Intellisense did that accidentally at some point.
//XXX::: WARNING: changing this to var or const upsets other parts of code in a fatal way.
//var declaration in localstart.js may be (part of) problem...
var NW_SC = new function () {
    const synthNames = this.SynthNames = [];
    const synthNameListeners = [];
    //some extra housekeeping: not sure about this, currently very partial, not cleaned up properly
    //and probably not able to keep track of reloaded synths on different IDs etc etc.... should clarify status
    //referred to when trying to interpret /fail messages.
    this.synthsByAddTarget = {};
    this.checkLoadedIntervalTime = 5000;
    //hack to skip all this heavy housekeeping rubbish. Seems to work on when false.
    this.doCheckLoaded = false;
    this.dumpStatusOnBadVal = true;
    this.autoreloadSynthsOnBadValue = true;
    this.synths = () => Object.values(synths);
    this.hornFadeTime = 2;
    this.autoRecord = false; //XXXX:::: probably going to change this interface.
    //this.unconfirmedSynths = () => this.synths.filter(s=>!s.confirmedStartOn);
    this.addSynthNameListener = function (fn) {
        synthNameListeners.push(fn);
        fn(undefined, synthNames);
    };
    this.registerSynthName = function (name) {
        if (!name && name) {
            sclog("Trying to register undefined / empty / otherwise falsy synth name...");
            throwe("Trying to register undefined / empty / otherwise falsy synth name...");
        }
        if (synthNames.indexOf(name) !== -1)
            return;
        synthNames.push(name);
        //look here in 2020:
        //If I want to get back to this stuff outside nw / electron, need to alter proxy...
        //SC[synthname] = function() {} //constructor... call
        //SC[synthname].setPrototypeOf() //... make SCSynth ~superclass
        for (var i = 0; i < synthNameListeners.length; i++)
            synthNameListeners[i](name, synthNames);
    };
    /** hack to undo compression effect on master... */
    this.linearMaster = function () {
        sclog("[[[[[[[[[ Linear master bus settings applied; remember default behaviour won't be restored ]]]]]]]]]]");
        // >>> TODO consider why sometimes no master
        if (master)
            master.setParms({ slopeBelow: 1, slopeAbove: 1 });
    };
    /** For now, this just checks if it looks like a sensible number. Later we might allow novel things like */
    this.isValidSynthParm = v => {
        if (typeof +v === 'number')
            return !isNaN(v) && isFinite(v);
        //TODO: check other conditions
        return false;
    };
}();
//this stuff may want to change in relation to electron working directory etc.
//adding ../ but suspect other issues will pop up, not necessarily immediately (eg FractEVO)
//var synthdefDir = "../synthdefs/bin", synthdefSrcDir = "../synthdefs", synthCtrlNamesFile = "../synthdefs/map/ctrlNames.yaml";
let synthdefDir = "synthdefs/bin", synthdefSrcDir = "synthdefs", synthCtrlNamesFile = "./synthdefs/map/ctrlNames.yaml";
//----------> OSCWorker -------->
//TODO: try switching back to udp, has some issues.
let scprotocol = 'tcp', clumsySend = 0, clumsyRec = 0; // protocol tcp, udp, ws
if (!isNode())
    scprotocol = 'ws';
///// not used ?????
var xxbufs = [];
var xxbuffnum = 0;
/** stop/reduce risk of cross-context garbage collection, keep reference to buffer for some time */
function savebuf(buf) {
    xxbuffnum++;
    if (xxbuffnum > 100)
        xxbuffnum = 0;
    xxbufs[xxbuffnum] = buf;
}
function IntPool(capacity, base = 0) {
    this.capacity = capacity || 1000;
    this.base = base;
    this._available = []; //could consider using {} to make this a set...
    var i = 0;
    while (++i <= this.capacity) {
        this._available.push(i + this.base - 1);
    }
    let checkUnique = () => {
        return this._available.length === new Set(this._available).size;
    };
    this.claim = function (n) {
        if (searchValues.devMode && !checkUnique())
            debugger;
        if (this._available.length === 0)
            throwe("Capacity exceeded");
        //using a queue rather than stack to reduce re-use frequency... slower though,
        //could use 2 stacks http://jsperf.com/queue-push-unshift-vs-shift-pop
        //really don't expect speed of this to be important. Also, will reorder if I use claimContiguous anyway...
        if (typeof n === 'number' && n > 0)
            return this.claimContiguous(n);
        else {
            return this._available.shift();
        }
    };
    this.claimContiguous = function (n) {
        if (searchValues.devMode && !checkUnique())
            debugger;
        var avail = this._available;
        if (avail.length < n)
            throwe("Not enough capacity to claim " + n);
        avail.sort(function (a, b) { return a - b; }); //default sort does [1, 2, 10] -> [1, 10, 2] ?!
        var startI;
        for (let ii = 0; ii <= avail.length - n; ii++) {
            startI = ii;
            var streak = true;
            var startV = avail[ii];
            for (var j = 0; j < n; j++) {
                if (avail[ii + j] !== startV + j) {
                    streak = false;
                    // I suppose I could set i = i+j or similar here.... gain would be negligible,
                    // and it's not very clear, especially with obscurity of when i's incremented.
                    break;
                }
            }
            if (streak === true)
                break;
            else
                startI = undefined;
        }
        if (startI === undefined)
            throwe("Failed to find " + n + " contiguous elements.");
        return avail.splice(startI, n);
    };
    this.unclaim = function (v) {
        if (searchValues.devMode && !checkUnique())
            debugger;
        var a = this._available;
        //WOW this was slow (in particular as I increased MAX_NODES, but am glad I realised)
        // if (v instanceof Array) _.each(v, function (n) { a.push(n); });
        // else this._available.push(v);
        // this._available = _.uniq(this._available);
        if (searchValues.devMode)
            if (a.indexOf(v) !== -1)
                debugger;
        this._available = a.concat(v); //would it be better to use a Set?
        if (searchValues.devMode && !checkUnique())
            debugger;
        //Not checking duplicates for now, maybe I'll do that in a less-frequently called function.
        //Or maybe I'll wait for evidence that it ever actually happens.
    };
    this.hasFree = function () {
        if (searchValues.devMode && !checkUnique())
            debugger;
        return this._available.length > 0;
    };
    this.freeCount = () => this._available.length;
}
class TIntPool {
    constructor(capacity = 1000, base = 0, name) {
        this.capacity = capacity;
        this.base = base;
        this.name = name;
        this.available = new Set();
        for (let i = 0; i < capacity; i++) {
            this.available.add(i + base);
        }
    }
    claim(n = 1) {
        if (this.available.size < n)
            this.error(`Capacity exceeded`);
        if (n > 1)
            return this.claimContiguous(n);
        const v = this.available.values().next().value;
        this.available.delete(v);
        return v;
    }
    claimContiguous(n) {
        const avail = [...this.available].sort((a, b) => a - b);
        let startI;
        for (let ii = 0; ii <= avail.length - n; ii++) {
            startI = ii;
            let streak = true;
            let startV = avail[ii];
            for (var j = 0; j < n; j++) {
                if (avail[ii + j] !== startV + j) {
                    streak = false;
                    // I suppose I could set i = i+j or similar here.... gain would be negligible,
                    // and it's not very clear, especially with obscurity of when i's incremented.
                    break;
                }
            }
            if (streak === true)
                break;
            else
                startI = undefined;
        }
        if (startI === undefined)
            this.error(`Failed to find ${n} contiguous elements`);
        const result = avail.splice(startI, n);
        this.available = new Set(avail);
        return result;
    }
    unclaim(v) {
        if (!Array.isArray(v))
            v = [v];
        for (let i = 0; i < v.length; i++) {
            if (this.available.has(v[i])) {
                const msg = `Duplicate value '${v[i]}'`;
                this.error(msg);
                continue;
            }
            this.available.add(v[i]);
        }
    }
    hasFree(n = 1) {
        return this.available.size >= n;
    }
    freeCount() {
        return this.available.size;
    }
    error(msg) {
        const m = `${msg} in ${this.name}`;
        sclogE(m);
        if (searchValues.devMode) {
            throwe(m);
        }
    }
}
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Msg"] = 0] = "Msg";
    LogLevel[LogLevel["Code"] = 1] = "Code";
    LogLevel[LogLevel["Error"] = 2] = "Error";
    LogLevel[LogLevel["BadError"] = 3] = "BadError";
    LogLevel[LogLevel["StopTheWorld"] = 4] = "StopTheWorld";
})(LogLevel || (LogLevel = {}));
function scLogImpl() {
    //type SCLogDisplayItem = { ele: HTMLSpanElement, lines: number } //using tuple below, let's see how that feels...
    //nb if sclogHTMLBufferItemLimit is less than initial number of lines, it crashes.
    let logFile, sclogHTMLBufferItemLimit = 500, sclogItems = [], lastlogtime, lasttimeout;
    //attempting to restructure so that only new bits are processed... not well thought through.
    //What about cases where log is switched off for a long time? etc etc. FML.
    let pendingLogItems = [], removedLogItems = [], displayedLogChunks = [];
    function sclog(message, logLevel = LogLevel.Msg) {
        //TODO if message is number...
        const stack = message.stack;
        if (stack)
            message = stack.toString();
        if (fs) {
            if (!logFile)
                clearLog(true);
            fs.appendFile(logFile, message + "\n", function (err) {
                if (err)
                    console.log("sclog error: '" + err + "' logging " + message);
            });
        }
        else {
            ipcSend({ address: '/oa/sclog', args: [message, logLevel] });
        }
        if (!searchValues.devMode)
            return;
        //special characters: if we use el.innerHTML, then we can just submit a string including <span> etc
        //as well as raw < > which if not part of anything HTML like will still displat normally.
        //the browser seems to guard against anything *too* bad happening; I didn't seem to be able to
        //execute <script> injected into log message, and unbalanced tags didn't throw off error spans...
        //but this seems more by luck than good judgement.
        const msgEsc = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const logItem = { msg: msgEsc, level: logLevel };
        sclogItems.push(logItem); // maybe I want to push raw message including logLevel, then batch when really displaying.
        pendingLogItems.push(logItem); // seems to be some redundancy here...
        removedLogItems.push(...sclogItems.splice(0, sclogItems.length - sclogHTMLBufferItemLimit));
        pendingLogItems.splice(0, pendingLogItems.length - sclogHTMLBufferItemLimit);
        // if coming too fast, batch and display every half second
        const t = Date.now();
        if (!lastlogtime || t - lastlogtime < 500) {
            if (!lasttimeout)
                lasttimeout = setTimeout(displayLog, 500); // think of a batch in 0.5 second
            return;
        }
        else
            displayLog(); ///check
        ///XXX: this is now *really bad* for performance.
        function displayLog() {
            //console.log("go", t-lastlogtime);
            lastlogtime = t;
            lasttimeout = undefined;
            const logBox = document.getElementById('sclogbox');
            //different class for different logL (not just error). Maybe consider CodeMirror highlighting?
            const getClass = (lev) => {
                switch (lev) {
                    case LogLevel.Msg: return "log-msg";
                    case LogLevel.Error: return "log-error";
                    case LogLevel.Code: return "log-code";
                }
            };
            const getTag = (lev) => {
                const ele = document.createElement('span');
                ele.classList.add(getClass(lev));
                return ele;
            };
            //we now have pendingLogItems & removedLogItems...
            //we keep track of how many log items contribute to each HTML element in displayedLogChunks
            //so we can do some arithmetic to work out which chunks are (partially) discarded...
            let discardedChunkCount = 0, discardLineCount = 0;
            while (discardLineCount < removedLogItems.length) {
                //XXX: error displayedLogChunks[discardedChunkCount++] undefined.
                // (apparently, not sure I've seen it doesn't seem implausible...)
                // often happens after debug pause ... sjpt
                try {
                    const dd = displayedLogChunks[discardedChunkCount++];
                    if (!dd) { // catch this explicitly to reduce debug breakpoint noise
                        sclogE('unexpected error displaying log, bad displayedLogChunks[discardedChunkCount++]');
                        // ??? maybe clean up here to avoid repeated errors ???
                    }
                    else {
                        discardLineCount += dd[1];
                    }
                }
                catch (e) {
                    //alert(e);
                    sclogE(e);
                }
            }
            displayedLogChunks.splice(0, discardedChunkCount); //actual DOM manipulation is further down...
            //the last discarded chunk(s) may have covered some items that are to be retained.
            //>>> ?? this should actually always be just one (or zero) chunksToAdd?
            //I should remove the complex logic from here, but maybe also test that assertion.
            let linesToRecover = discardLineCount - removedLogItems.length;
            if (linesToRecover > 0) {
                let logL = sclogItems[0].level;
                let ele = getTag(logL);
                for (let i = 0; i < linesToRecover; i++) {
                    const logItem = sclogItems[i];
                    ele.innerHTML = ele.innerHTML + logItem.msg + `<br />`;
                }
                displayedLogChunks.unshift([ele, linesToRecover, logL]);
            }
            let chunksToAdd = [];
            //and then add pendingLogItems in chunk(s), possibly merging into the final chunk that was there before.
            if (pendingLogItems.length > 0) {
                let logL = pendingLogItems[0].level;
                const lastDisplayedChunk = displayedLogChunks[displayedLogChunks.length - 1];
                let ele = logBox.lastChild; //merge into last existing element...
                let innerLines;
                if (!ele || logL !== lastDisplayedChunk[2]) { //if it exists and is the right type
                    ele = getTag(logL); //otherwise start a new one.
                    innerLines = 0;
                }
                else
                    innerLines = lastDisplayedChunk[1];
                for (let i = 0; i < pendingLogItems.length; i++) {
                    const logItem = pendingLogItems[i];
                    if (logItem.level !== logL) {
                        logL = logItem.level;
                        chunksToAdd.push([ele, innerLines, logL]);
                        ele = getTag(logL);
                        innerLines = 0;
                    }
                    innerLines++;
                    ele.innerHTML = ele.innerHTML + logItem.msg + `<br />`;
                }
                chunksToAdd.push([ele, innerLines, logL]);
                displayedLogChunks.push(...chunksToAdd);
            }
            pendingLogItems = [];
            removedLogItems = [];
            //if falsey, logBox is hidden
            if (logBox.offsetParent) {
                //console.log("displayLog layout");
                const scrollToBottom = true; //logBox.scrollTop === logBox.scrollHeight;
                const displayedEles = displayedLogChunks.map(e => e[0]);
                while (logBox.firstChild instanceof HTMLSpanElement && logBox.firstChild !== displayedEles[0])
                    logBox.removeChild(logBox.firstChild);
                let i = displayedEles.indexOf(logBox.lastChild);
                logBox.append(...displayedEles.slice(i + 1));
                if (scrollToBottom)
                    logBox.scrollTop = logBox.scrollHeight;
            }
            else {
                //console.log("displayLog no layout"); //prints three times?!
            }
        }
    }
    function clearLog(newFile) {
        removedLogItems = sclogItems;
        sclogItems = [];
        pendingLogItems = [];
        if (!isNode())
            return; //>>==== todo server logging
        if (newFile) {
            var os = require('os');
            var t = new Date();
            //TODO: try to make sure this is somewhere that "Console" app on OSX will be able to see it.
            //turns out that might be a bit difficult on account of permissions
            //http://stackoverflow.com/questions/18096438/how-read-write-from-library-logs-of-mac
            var logDir = os.tmpdir() + "/organiclogs";
            if (!fs.existsSync(logDir))
                fs.mkdirSync(logDir);
            logFile = logDir + "/tElectron_" + os.hostname() + '_' + t.toISOString().replace(/:/g, '_').replace('T', '_').substr(0, 19) + ".log";
            //won't do any harm not deleting, will just write to the same one if run more than once in the same minute.
            //if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
            //purge all but recent files
            const maxFilesToKeep = 200;
            fs.readdir(logDir, (err, files) => {
                if (err) {
                    console.error("Error reading sclog files: " + err);
                    return;
                }
                files = files.filter(f => f.endsWith('.log'));
                if (files.length > maxFilesToKeep) {
                    //order should be oldest first because of filename
                    let filesToDelete = files.splice(0, files.length - maxFilesToKeep);
                    filesToDelete.forEach(f => {
                        fs.unlink(logDir + '/' + f, err2 => {
                            //arrow-code-orama: TODO require('fs/promises')
                            if (err2)
                                sclogE(`error deleting log file ${f} (${err2})`);
                            else
                                sclog(`deleted old log file ${f}`);
                        });
                    });
                    //sclog("Log files to delete:");
                    //sclog(filesToDelete.join('\n'));
                }
            });
        }
        sclog(new Date() + ": Log cleared");
    }
    function sclogE(message, logLevel = LogLevel.Error) {
        flashSCConsole(true);
        sclog(message, logLevel);
    }
    function flashSCConsole(isError) {
        //make a little flash
        const el = document.getElementById('sclogbox');
        el.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight; //trigger reflow
        el.style.animation = null;
        el.classList.remove('code-flash', 'code-flash-error');
        el.classList.add('code-flash' + (isError ? "-error" : ""));
    }
    return { sclog, sclogE, clearLog, flashSCConsole };
}
var { sclog, sclogE, clearLog, flashSCConsole } = scLogImpl();
/** Similar to SuperCollider Done: values for flag set by UGen when it finishes. */
var Done;
(function (Done) {
    /** do nothing when the UGen is finished */
    Done[Done["None"] = 0] = "None";
    /** pause the enclosing synth, but do not free it */
    Done[Done["PauseSelf"] = 1] = "PauseSelf";
    /** free the enclosing synth */
    Done[Done["FreeSelf"] = 2] = "FreeSelf";
    /** free both this synth and the preceding node */
    Done[Done["FreeSelfAndPrev"] = 3] = "FreeSelfAndPrev";
    /** free both this synth and the following node */
    Done[Done["FreeSelfAndNext"] = 4] = "FreeSelfAndNext";
    /** free this synth; if the preceding node is a group then do g_freeAll on it, else free it */
    Done[Done["FreeSelfAndFreeAllInPev"] = 5] = "FreeSelfAndFreeAllInPev";
    /** free this synth; if the following node is a group then do g_freeAll on it, else free it */
    Done[Done["FreeSelfAndFreeAllInNext"] = 6] = "FreeSelfAndFreeAllInNext";
    /** free this synth and all preceding nodes in this group */
    Done[Done["FreeSelfToHead"] = 7] = "FreeSelfToHead";
    /** free this synth and all following nodes in this group */
    Done[Done["FreeSelfToTail"] = 8] = "FreeSelfToTail";
    /** free this synth and pause the preceding node */
    Done[Done["FreeSelfPausePrev"] = 9] = "FreeSelfPausePrev";
    /** free this synth and pause the following node */
    Done[Done["FreeSelfPauseNext"] = 10] = "FreeSelfPauseNext";
    /** free this synth and if the preceding node is a group then do g_deepFree on it, else free it */
    Done[Done["FreeSelfAndDeepFreePrev"] = 11] = "FreeSelfAndDeepFreePrev";
    /** free this synth and if the following node is a group then do g_deepFree on it, else free it */
    Done[Done["FreeSelfAndDeepFreeNext"] = 12] = "FreeSelfAndDeepFreeNext";
    /** free this synth and all other nodes in this group (before and after) */
    Done[Done["FreeAllInGroup"] = 13] = "FreeAllInGroup";
    /** free the enclosing group and all nodes within it (including this synth) */
    Done[Done["FreeGroup"] = 14] = "FreeGroup";
})(Done || (Done = {}));
/**
 * Class based synth & group::: This stuff should be in a separate file
 * and perhaps largely superceded by SuperColliderJS.
 * See also TSCGroup further down this file at time of writing.
 */
///These should be superclass of (T)SCSynth & TSCGroup
class TSCNode {
    async before(otherNode) {
        writeOSC('/n_before', [otherNode.id, this.id]);
    }
    async after(otherNode) {
        writeOSC('/n_after', [otherNode.id, this.id]);
    }
    async query(queryReason = 'nothing specific') {
        return new Promise((resolve, reject) => {
            on('/n_info', (msg) => {
                if (msg.args[0] === this.id) {
                    //id, parent, previous (or -1), next (or -1), isGroup? if so: headID, tailID
                    resolve(true); //node info response
                }
            });
            onFail('/n_query', msg => {
                if (msg.args[1] !== "Node " + this.id + " not found")
                    return false;
                sclogE("[scsynth] /n_query failed... apparently " + this.type + this.id + " is AWOL");
                reject(msg);
                return true; ///XXXXX HOW TF DO WE CANCEL EVENTS AGAIN???
                //probably just by having an extra property on the msg object?
            });
        });
    }
    async run(v) {
        writeOSC('/n_run', [this.id, v ? 1 : 0]);
    }
}
class SCSynth extends TSCNode {
    async free(killReason = 'nothing specific') {
        //TODO
    }
}
class TSCSynth extends SCSynth {
}
/**
 * @constructor
 * @param {string} type name of synthdef
 * @param {Array} args  array consisting of interleaved keys, values for synth creation arguments.
 *    TODO: allow args to accept object with keys / values.
 * @param {Object} opts { addAction: int, addTarget: node or int, timetag: number } optional. Or just number for timetag
 **/
function Synth(type, args, opts) {
    if (!type)
        throwe("No type specified for Synth!"); //this actually happens... when adding a new SynthDef?
    this.type = type;
    args = args.filter(a => a !== undefined);
    var _s = this;
    //2020: think this is fairly irrelevant now.
    _s.autoReload = true; //consider making this false by default, but maybe true for existing SynthBus() code
    if (!args)
        args = [];
    //TODO: consider not calling _load automatically in constructor, but as async...
    //would need to work up call stack async-ifying.
    //Just noticed quite correct JSlint warning about not using constructor for side effects...
    _s._load(args, opts);
    _s.parms = {};
    for (var i = 0; i < args.length; i += 2) {
        _s.parms[args[i]] = args[i + 1];
    }
}
Synth.prototype.log_n_go = false;
var SCAddAction;
(function (SCAddAction) {
    SCAddAction[SCAddAction["AddHead"] = 0] = "AddHead";
    SCAddAction[SCAddAction["AddTail"] = 1] = "AddTail";
    SCAddAction[SCAddAction["AddBefore"] = 2] = "AddBefore";
    SCAddAction[SCAddAction["AddAfter"] = 3] = "AddAfter";
    SCAddAction[SCAddAction["AddReplace"] = 4] = "AddReplace";
})(SCAddAction || (SCAddAction = {}));
//var ADD_HEAD = 0, ADD_TAIL = 1, ADD_BEFORE = 2, ADD_AFTER = 3, ADD_REPLACE = 4;
Synth.prototype._load = function (args, opts) {
    var synth = this;
    (function prepareArguments() {
        //sclog(`${synth.type}: preparing arguments...`);
        if (opts) {
            //I've changed this so that opts might be just a number for timetag... would like to revise timetag some time
            var n = opts * 1; //<<<< get rid of that test now we did manage to work out timetag?
            synth.timetag = Number.isNaN(n) ? opts.timetag : n;
            synth.addAction = opts.addAction || 0;
            synth.addTarget = getID(opts.addTarget || 0);
        }
        else {
            synth.addAction = 0;
            synth.addTarget = 0;
            synth.timetag = 0;
        }
        //at this point, args is expected to be an array of alternating key/value
        for (let i in args) {
            if (args[i] instanceof SCBus) {
                var b = args[i];
                //sclog(`Mapping audio bus '${b.name}' (${b.id}) to ${synth.type}.${args[i - 1]}`);
                args[i] = "a" + b.id;
            }
            else if (args[i] instanceof SCKBus) {
                let bb = args[i];
                //sclog(`Mapping control bus '${b.name}' (${b.id}) to ${synth.type}.${args[i - 1]}`);
                args[i] = "c" + bb.id;
            }
            else if (args[i] instanceof SCBuffer) {
                let bb = args[i];
                //sclog(`Mapping audio buffer #${bb.id} to ${synth.type}.${args[i - 1]}`);
                args[i] = bb.id;
            }
        }
    })();
    //if (this.id) delete synths[this.id]; //DON'T DO THIS, it will happen in response to /n_free
    this.loadRequestTime = Date.now();
    //if I make _load() async, then I may want to establish ID earlier (in constructor)
    //check logic of that...
    var isReplace = this.addAction === SCAddAction.AddReplace;
    //var newID = this.id = isReplace ? this.id : freeNodeIDs.claim();
    var newID = this.id = freeNodeIDs.claim(); //server was complaining about duplicate node id. Was above ever right?
    synths[newID] = this;
    if (!NW_SC.synthsByAddTarget[this.addTarget])
        NW_SC.synthsByAddTarget[this.addTarget] = []; //remember to remove as well... when? /n_free?
    NW_SC.synthsByAddTarget[this.addTarget].push(this);
    const catcher = err => {
        const msg = `ERROR in ${synth.type}._load() : ${err}`;
        sclogE(msg);
        if (synth._checkLoaded)
            clearInterval(synth._checkLoaded);
        synth._checkLoaded = false;
        synth.killed = `ERROR in ${synth.type}._load() : ${err}`;
    };
    //can't await in regular functions...
    //but older Promise syntax would be better than this tangled mess, so let's take a step in that direction:
    //timeoutPromise(5000, checkTargetReady()).then(startSynthAndWaitForGo).then(synthGoConfirmed).catch(catcher);
    //checkTargetReady().then(startSynthAndWaitForGo).then(synthGoConfirmed).catch(catcher);
    //// checkTargetReady & timeoutPromise are also new and as of now not quite right, so let's finish refactoring old before using new...
    startSynthAndWaitForGo().then(synthGoConfirmed).catch(catcher);
    //trying to avoid a situation where we get /fail back because we tried to /s_new with an invalid addTarget
    //failing at that...
    function checkTargetReady() {
        return new Promise((resolve, reject) => {
            //sclog(`${synth.type}: check addTarget ${synth.addTarget} ready...`);
            const addTarget = synth.addTarget;
            if (addTarget === 0) {
                resolve(true);
                return;
            }
            //how sure are we that confirmedStartOn gives enough info? or that we even need check that for replace case?
            if (isReplace && synth.confirmedStartOn) {
                resolve(true);
                return;
            }
            let node = synths[addTarget];
            //and the node should still be found in synths[]... even if it's a Group rather than a Synth
            if (node && node.confirmedStartOn === node.id) {
                resolve(true);
                return;
            }
            else {
                //sclog(`waiting for /n_go on [${addTarget}] before starting ${synth.type}[${synth.id}]... is this likely?`);
                on('/n_go', msg => {
                    if (msg.args[0] === addTarget) {
                        //... ready to go! ...
                        //sclog(`Hooray! what are the chances of that happening?`);
                        resolve(true);
                        return true;
                    }
                    return false;
                }); //deal with /fail with outer timeout, consider other cases...
            }
        });
    }
    function startSynthAndWaitForGo() {
        return new Promise((resolve, reject) => {
            //sclog(`${synth.type}: startSynthAndWaitForGo...`);
            synth.confirmedStartOn = false;
            //let statusWarningMsg = `Synth ${synth.type} ${synth.id} unconfirmed...`;
            on("/n_go", function (msg) {
                if (msg.args[0] === synth.id) {
                    //FOR TESTING: don't resolve(true)...
                    resolve(true);
                    //sclog(`/n_go ${synth.id} received, but I'm ignoring it to test query() can resolve promise...`);
                    //this seems ok for a quick test
                    //obviously bad logic is obviously bad
                    //if (logSCStatusWarning === statusWarningMsg) setLogSCStatusWarning(false)
                    return true;
                }
                else
                    return false;
            });
            if (synth._checkLoaded) {
                sclog("----------- " + synth.id + " already had a _checkLoaded interval, reloaded again...");
                clearInterval(synth._checkLoaded);
                //synth._checkLoaded = false; // redundant, will be assigned below
            }
            var query = true;
            //hack to skip all this heavy housekeeping rubish.
            let setIntervalX = NW_SC.doCheckLoaded ? setInterval : () => { };
            synth._checkLoaded = setIntervalX(function () {
                if (synth.timetag > Date.now())
                    return;
                //setLogSCStatusWarning(statusWarningMsg);
                if (oscBundleElements) {
                    sclog("no /n_go #" + newID + "(" + synth.type + ") yet... ignoring for now as we're in the process of preparing an oscBundle.");
                    return;
                }
                if (!synth.killed && synth.confirmedStartOn !== newID) {
                    if (query) {
                        sclog("no /n_go #" + newID + "(" + synth.type + ") yet... querying node in case it is there but we missed the notification.");
                        synth.query('trying to confirm /s_new as not received /n_go', resolve);
                    }
                    else {
                        //this could hypothetically be the right thing to do, although it leads to hard to trace "duplicate node id" errors.
                        //... or maybe worse, the actual creation of countless duplicate synths in some conditions???
                        //... I'm currently debugging a problem where I get stuck in this loop after trying to pass a function instead of value somewhere(?)
                        //... (with the synth sound audible) ... starting to glitch after a while...
                        sclog("no /n_go #" + newID + "(" + synth.type + ") yet... trying another /s_new id=" + synth.id + " addtarget=" + synth.addTarget);
                        //writeOSC("/s_new", [synth.type, newID, synth.addAction, synth.addTarget].concat(args), synth.timetag);
                        trySNew();
                    }
                    query = !query;
                }
                else {
                    reject(new Error(`synth killed or something weird happened with id??`));
                    clearInterval(synth._checkLoaded);
                    synth._checkLoaded = false;
                }
            }, NW_SC.checkLoadedIntervalTime);
            function trySNew() {
                const error = writeOSC("/s_new", [synth.type, newID, synth.addAction, synth.addTarget].concat(args), synth.timetag);
                if (error) {
                    const msg = `bad args: [${error.badArgIndexes.map(i => args[i - 5] + ": " + args[i - 4]).join(', ')}]`;
                    sclogE(msg);
                    synth.killed = msg;
                    reject(msg); //why isn't this stopping us adequately?
                    throwe(msg); // will this stop better??
                }
            }
            try {
                // log("/s_new", this.type, newID, this.addAction, this.addTarget);
                // setTimeout(() => {
                //     sclog(`delayed /s_new "${synth.type}, ${newID}" to test query resolve mechanism...`);
                //     //this doesn't work with syncThen()...
                //     writeOSC("/s_new", [synth.type, newID, synth.addAction, synth.addTarget].concat(args), synth.timetag);
                // }, 100)
                //this is the main /s_new that should generally work...
                trySNew();
            }
            catch (e) {
                reject(e);
                sclogE("Exception in /s_new: " + e);
                sclog(synth.type + "#" + synth.id + " removed"); //TODO: Synth.toString().
                synth.free(e);
            }
        });
    }
    function synthGoConfirmed() {
        //sclog(`${synth.type} IS GO`);
        if (!synthsByType[synth.type])
            synthsByType[synth.type] = [];
        if (synth._checkLoaded) {
            clearInterval(synth._checkLoaded);
            synth._checkLoaded = false;
            //sclog(`/n_go[${synth.id}]: clearing _checkLoaded...`);
        }
        //XXX: for some reason I still seem to get these logs...
        //if (synth.log_n_go) sclog("/n_go " + synth.type + " #" + synth.id);
        if (!isReplace)
            synthsByType[synth.type].push(synth);
        synth.confirmedStartOn = synth.id;
        synth.freed = false;
        synth.reloading = false;
        //note: not setting "synth.killed = false" : I believe killing is supposed to be more final?
        //so in fact, let's log an anomoly in cases where synth.killed
        if (synth.killed) {
            sclog(`>>>> NOTE: unexpected '/n_go' for ${synth.type}#${synth.id} that was flagged as killed: "${synth.killed}".`);
            //debugger;
        }
        if (isReplace) {
            //There was some code, (I think by SJPT):
            //this might cause it to notice in /n_end that the reference is missing,
            //but that is no longer considered an error
            //removeSynthIDRef(synth.addTarget);
            //edit:: it is now considered an error... I want my sanity back...
            //the only thing we need to be sure if that the /n_end on old id won't cause problems;
            //we account for this by checking if the synth at the given slot in synths has the expected ID
            //I don't think it's the responsiblity of /n_go listener to remove the old thing...
            //I believe there may have been some bad side-effects of previous, although I suppose if /n_end
            //was missed we'd still be in a bad state.  If it's suspected that events may be missed, there are
            //other methods for housekeeping.
        }
        if (synth.needsParmRefresh) {
            synth.setParms(synth.parms);
            synth.needsParmRefresh = false;
        }
    }
    //some old comments:::
    //we can't necessarily rely on /n_go and /n_end keeping our housekeeping reliably up-to-date.
    //If we haven't received an /n_go after sending /s_new, it might be because our message didn't
    //get through, or it might be because the notification message didn't.
    //we can't tell which, (other than by querying the status).
    //The mechanism as it is now probably isn't enough to guarantee stable setup still, unfortunately...
    //*** when the old synth has indeed been replaced with new, but we somehow missed the /n_go,
    // we end up keeping on trying to load ourselves onto a node that's not there (with a duplicate id
    // requested for our 'new' one).
    //(----)
    //should be ok though, as long as it's safe to assume that the message that would cause the old id
    //to be anything but the old synth instance would be our /s_new messages
};
Synth.prototype.setParm = function (name, value) {
    //TODO: timetag could be useful here too... although there are bigger todos to do with parm properties...
    if (this.freed)
        return; //appears to make no difference to number of '/n_set: node not found'
    //todo: hoist this up to isValidSynthParm
    const inVal = value;
    if (typeof value === "string") {
        let num = Number.parseFloat(value);
        if (!isNaN(num))
            value = num;
        ///regex check for SCBus descriptor... quietly ignore
        if (!inVal.match(/^[ac]\d+$/)) {
            sclogE(log("bad synth value", name, inVal));
            return;
        }
    }
    if ((typeof value === 'number') && isNaN(value) && !isFinite(value)) {
        sclogE(log("bad synth number value", name, inVal));
        return;
    }
    this.parms[name] = value; //TODO: make a parm object? Or property with get / set?
    if (this.confirmedStartOn !== this.id) {
        //sclog(`${this.type}[${name}] set to ${value}, but we're not calling /n_set yet because not sure about status on server`);
        //take our chances at setting anyway, but still flag needsParmRefresh just in case?
        this.needsParmRefresh = true;
        //return;
    }
    const cNames = NW_SC.ctrlNames ? NW_SC.ctrlNames[this.type] : undefined;
    let ctrlIndex = cNames ? cNames.indexOf(name) : name;
    if (ctrlIndex === -1) {
        //I probably trigger this quite often in the wild while changing things around
        //probably just want to be quiet, actually, rather than log.
        if (!this['_reportedMissing_' + name]) { //todo flag differently.
            //sclogE(`no parameter '${name}' found for synth '${this.type}'`);
            this['_reportedMissing_' + name] = true;
        }
        ctrlIndex = name;
        return;
    }
    //for some reason making value: any wasn't enough to allow TS compiler to access value.id
    //casting to interface that may not be used longer term...
    let vID = value;
    if (value instanceof SCBus) {
        //sclog("Mapping audio bus '" + value.name + "' to " + this.type + "." + name);
        if (!this.bundle)
            writeOSC("/n_mapa", [this.id, ctrlIndex, vID.id]);
        else
            this.bundle.n_mapa.push(ctrlIndex, vID.id);
        return;
    }
    else if (value instanceof SCKBus) {
        //sclog("Mapping control bus '" + value.name + "' to " + this.type + "." + name);
        if (!this.bundle)
            writeOSC("/n_map", [this.id, ctrlIndex, vID.id]);
        else
            this.bundle.n_map.push(ctrlIndex, vID.id);
        return;
    }
    else {
        if (value instanceof SCBuffer) {
            //sclog("Assigning SCBuffer #" + value.id + " to " + this.type + "." + name);
            value = vID.id; //we still use /n_set for buffer, so code is similar as number value
        }
        if (!this.bundle)
            writeOSC("/n_set", [this.id, ctrlIndex, value]);
        else
            this.bundle.n_set.push(ctrlIndex, value);
    }
};
//Synth.prototype.modulateParm //TODO
Synth.prototype.setParms = function (parms) {
    for (let k in parms) {
        this.setParm(k, parms[k]);
    }
};
Synth.prototype.startBundle = function () {
    this.bundle = { n_set: [this.id], n_map: [this.id], n_mapa: [this.id] };
};
Synth.prototype.stopBundle = function () {
    this.bundle = false;
};
Synth.prototype.processBundle = function () {
    if (!this.bundle)
        return;
    if (this.bundle.n_set.length > 1) {
        writeOSC("/n_set", this.bundle.n_set);
        this.bundle.n_set = [this.id];
    }
    if (this.bundle.n_map.length > 1) {
        writeOSC("/n_map", this.bundle.n_map);
        this.bundle.n_map = [this.id];
    }
    if (this.bundle.n_mapa.length > 1) {
        writeOSC("/n_mapa", this.bundle.n_mapa);
        this.bundle.n_mapa = [this.id];
    }
};
Synth.prototype.getParmsArray = function () {
    var result = [];
    for (var k in this.parms) {
        result.push(k);
        result.push(this.parms[k]);
    }
    return result;
};
Synth.prototype.reload = function () {
    if (this.reloading)
        return; //reloading flag doesn't really add anything; could check _checkLoaded
    //note: while it's possible that the original /s_new message was lost, we deal with this in _load()
    //so it should be enough to just quickly exit this method.
    this.reloading = true;
    if (this._checkLoaded) {
        sclog("----------- " + this.id + " already had a _checkLoaded interval when told to reload again; clearing.");
        clearInterval(this._checkLoaded);
    }
    //No need to free() and wait for callback when we can just replace our own node...
    //we still need a new id, that is handled automatically (by us elsewhere)
    ///we need to check about releasing the old id though...
    sclog("[scsynth] reloading " + this.type + " #" + this.id);
    this._load(this.getParmsArray(), { addAction: SCAddAction.AddReplace, addTarget: this.id });
};
Synth.prototype.before = function (otherNode) {
    var id = getID(otherNode);
    sclog("Warning: Moving " + this.type + "#" + this.id + " before " + id + ", but this might leave some messy housekeeping.");
    writeOSC("/n_before", [this.id, id]);
};
Synth.prototype.after = function (otherNode) {
    var id = getID(otherNode);
    sclog("Warning: Moving " + this.type + "#" + this.id + " after " + id + ", but this might leave some messy housekeeping.");
    writeOSC("/n_after", [this.id, id]);
};
Synth.prototype.free = function (killReason = 'nothing specific') {
    //Are we killing them, or setting them free? Always a question one must ask.
    //(are we guaranteed to call this for every synth we expect to die? what about doneAction...)
    //careful now...
    const alreadyFreed = this.killed !== undefined;
    this.killed = alreadyFreed ? this.killed + ", " + killReason : `${this.type}.free( reason = "${killReason}" )`;
    //TODO: _checkFreed? Also check general /n_end /n_off...
    if (this._checkLoaded) {
        //sclog("-- " + this.id + " freed - aborting _checkLoaded. (nb. consider adding _checkFreed?)");
        clearInterval(this._checkLoaded);
    }
    if (this.listeners) {
        Object.entries(this.listeners).forEach(v => NW_SC.off(v));
    }
    if (!alreadyFreed)
        writeOSC("/n_free", this.id);
};
Synth.prototype.query = function (queryReason = 'nothing specified', resolve) {
    var synth = this;
    var id = synth.id;
    //cancel any pending /n_info handler for given node.
    let queryMsg = `query ${synth.type}#${synth.id} reason: "${queryReason}"`;
    //sclog(queryMsg);
    if (synth._infoHandler)
        off("/n_info", synth._infoHandler);
    synth._infoHandler = function (msg) {
        //debugger; //id, parent, previous (or -1), next (or -1), isGroup? if so: headID, tailID
        if (msg.args[0] === id) {
            sclog(`[scsynth] received info "${msg.args.join(', ')}" for "${queryMsg}"`);
            if (synths[id] !== synth)
                sclogE("[scsynth] ### PROBABLE ERROR ###, synths[" + id + "] mismatch");
            synth.confirmedStartOn = id;
            //not setting these flags here could cause errors in housekeeping if /n_go is missed.
            synth.freed = false;
            synth.reloading = false;
            //this is not a very proper Promise design, but should allow us to resolve a promise that calls query()
            //hoping for its resolve to happen... I might further promisify.
            //How best to test this? I could try slightly deferring /s_new messages (VERY temporarily...)
            if (resolve)
                resolve(true);
            off("/n_info", synth._infoHandler);
            synth._infoHandler = undefined;
            return true;
        }
    };
    on("/n_info", synth._infoHandler);
    onFail("/n_query", function (msg) {
        if (msg.args[1] !== "Node " + id + " not found")
            return false; //this message was not meant for us
        sclogE("[scsynth] /n_query failed... apparently " + synth.type + id + " is AWOL");
        //what does this mean? in the context of _load, we'll try again
        off("/n_info", synth._infoHandler);
        synth._infoHandler = undefined;
    });
    writeOSC("/n_query", [id]);
};
Synth.prototype.run = function (v) {
    v = v ? 1 : 0; //truthy falsy
    writeOSC("/n_run", [this.id, v]);
};
/** make each of the members of parms exposed as a property on Synth... */
Synth.prototype.defineParmProperties = function () {
    //remember that I want to make synth subtypes according to synth.type at some point... then I can do this to the prototype...
    const synth = this;
    for (var k in synth.parms) {
        if (Object.hasOwnProperty.call(synth, k))
            continue;
        let defProp = function (kp) {
            //log("defining property " + kp + " on " + " synth " + synth.type + "#" + synth.id);
            Object.defineProperty(synth, kp, {
                get: function () {
                    //console.log("getting " + kp);
                    return synth.parms[kp];
                },
                set: function (value) {
                    //console.log("setting " + kp);
                    synth.setParm(kp, value);
                }
            });
        };
        defProp(k);
    }
};
/**
 * Represents a Buffer on the scsynth server. The data may be from a soundfile, recorded in realtime, or provided as an array.
 * @param {type} opts Either an array of numbers to be written, or an object with cmd, maybe file...
 * TODO: document better etc.
 * @returns {SCBuffer}
 */
function SCBuffer(opts) {
    this.isBuffer = true;
    var b = this;
    var id = this.id = freeBufs.claim();
    var args = [this.id];
    b.readRequests = 0; // requests for data on this buffer
    b.readRequestsIgnored = 0; // requests ignored because of outstanding request
    b.readRequestsForced = 0; // requests forced because outstanding request too old
    b.readRequestsComplete = 0; // requests completed with at least some reply
    b.readRequestsCorrupt = 0; // requests completed but with corrupt reply
    if (opts) {
        if (Array.isArray(opts)) {
            var arr = opts;
            opts = {
                cmd: "/b_alloc",
                frames: arr.length,
                data: arr
            };
        }
        onDone(opts.cmd, function (msg) {
            if (opts.data)
                writeOSC("/b_setn", [id, 0, opts.frames].concat(opts.data));
            on("/b_info", function (msgi) {
                if (msgi.args[0] !== id)
                    return; //had been wrongly returning true here, might have been correct for some previous version of 'on'.
                b.allocStatus = true;
                b.nFrames = msgi.args[1];
                b.nChannels = msgi.args[2]; //??? undefined, even though appearing in log???
                b.sRate = msgi.args[3];
                // sclog("Received /b_info " + JSON.stringify(msg));
                if (b.readRequests) {
                    b.readRequests--;
                    b.requestData();
                }
                return true;
            });
            writeOSC("/b_query", id);
            if (opts.completionJS) {
                //Was this ever used?... yes, not once, not twice but thrice (by scope-ish things).
                //and they didn't use the msg argument, so it should be safe to change signature used by loadSound
                //!!! this may now be different to how completionJS is used elsewhere though.
                if (opts.objToCall)
                    opts.completionJS.call(opts.objToCall, b);
                else
                    opts.completionJS(b); //changing to b - 'this'
            }
        });
        if (opts.cmd === "/b_alloc") {
            args.push(opts.frames ? opts.frames : 1024);
            args.push(opts.channels ? opts.channels : 1);
            //prepComplete is a function will return an OSC message that should be done on completion of alloc (phew)
            //would actually be easier to just say on('/done /b_alloc')
            //also, if we do want to start using completion messages (which would require a bit more sophistication in our
            //client to be widely useful) then maybe we should call the something like completionOSC, and have a corresponding completionJS
            if (opts.prepComplete) {
                //args.push(opts.prepComplete(b));
            }
        }
        else if (opts.cmd === "/b_allocRead") {
            sclog("Allocating sound file " + opts.file + " to buf #" + id);
            args.push(opts.file); //we're not bothering with remaining optional arguments; starting frame, nFrames, completionMsg
            this.file = opts.file;
        }
        writeOSC(opts.cmd, args);
    }
    else {
        sclog("ERROR: opts argument to 'new SCBuffer()' is not optional");
        throwe("opts argument to 'new SCBuffer()' is not optional");
    }
    this.allocStatus = false;
}
SCBuffer.prototype.free = function () {
    writeOSC("/b_free", this.id);
    on("/done", msg => {
        //log("SCRecorder done 1", msg.args[0]);
        if (msg.args[0] === "/b_free" && msg.args[1] === this.id) {
            freeBufs.unclaim(this.id);
            return true; //could resolve a promise here I suppse
        }
    });
};
SCBuffer.prototype.play = function (amp = 1, pan = 0, rate = 1) {
    var s = new Synth("PlayBuf1", ["buf", this.id, "amp", amp, "pan", pan, "rate", rate]);
    s.autoReload = false;
    return s;
    //writeOSC("/s_new", ["PlayBuf1", -1, ADD_AFTER, master.id, "buf", this.id, "amp", amp, "pan", pan, "rate", rate]);
};
SCBuffer.prototype.requestData = function () {
    if (!this.allocStatus) {
        this.readRequests++;
        return;
    }
    var b = this;
    var dt = Date.now() - this.dataReceivedTime;
    if (this.pendingData && this.pendingData !== tcpSocketid) { //>>>?? tcpSocketid???
        this.pendingData = false;
        sclog("buffer data for #" + this.id + " requested with old request on old tcp socket outstanding");
        this.dataReceivedTime = Date.now();
    }
    if (dt > 2000 && this.pendingData) {
        this.pendingData = false;
        sclog("buffer data for #" + this.id + " requested while old request still pending for ms=" + dt);
        b.readRequestsForced++;
        this.dataReceivedTime = Date.now();
    }
    if (this.pendingData) {
        //sclog("buffer data for #"+ this.id +" requested while old request still pending.");
        b.readRequestsIgnored++;
        return;
    }
    b.readRequests++;
    //why is this complaining when I make Spectrogram?
    //is it complaining at other times too?
    writeOSC("/b_getn", [this.id, 0, this.nFrames]); //TODO: check for /fail
    //on("/b_setn", this.receiveData);
    b.pendingData = tcpSocketid;
    on("/b_setn", function (msg) {
        return b.receiveData(msg); //!!! I forgot to pass return value leading to buildup of request functions....
        //review: this version does still entail some garbage, which could be worth addressing. More important though is
        //the serious anti-pattern of the syntax that allows bugs like this to happen far too easily.
    });
};
SCBuffer.prototype.receiveData = function (msg) {
    if (msg.args[0] === this.id) {
        //buffer, start, count, values...
        //assume writing whole buffer: ignore potential multiple ranges
        //throw an error if starting index !== 0, or if samples to fill is too big
        //if (msg.args.length <= 2) return true;
        if (msg.args[1] !== 0) {
            throwe("unsupported /b_setn arguments" + JSON.stringify(msg) + "; we only support starting at index 0 for now.");
            //return true;
        }
        // Use special implementation in processOSC for /n_setn messages if available...
        //ability to receive partial data...
        var ddata = msg.data || _.map(msg.args.splice(3), function (e) { return e; });
        if (!ddata || ddata.length === 0) {
            this.readRequestsCorrupt++;
        }
        else {
            this.data = ddata;
        }
        this.dataReceivedTime = Date.now();
        if (this.recDataListeners)
            for (var k in this.recDataListeners)
                this.recDataListeners[k](this.data);
        this.pendingData = false;
        this.readRequestsComplete++;
        return true;
    }
    else
        return false;
};
SCBuffer.prototype.onRecData = function (f) {
    if (!this.recDataListeners)
        this.recDataListeners = [];
    this.recDataListeners.push(f);
};
SCBuffer.prototype.setData = function (d) {
    startOSCBundle();
    if (this.nFrames !== d.length) {
        this.nFrames = d.length;
        writeOSC("/b_alloc", [this.id, d.length, 1]);
    }
    writeOSC("/b_setn", [this.id, 0, d.length].concat(d));
    flushOSCBundle();
};
/** XXX: we still have some trouble knowing how to access the buffer from within completion
 * when we first try to use this in GrainContraption, so behaviour is still not really defined yet; reverting to on done*/
function loadSound(file, completionJS, reject) {
    if (fs && !fs.existsSync(file)) { //==== todo complete browser audio
        sclog("Attempted to load non-existant sound file: '" + file + "' @" + new Date());
        if (reject)
            reject(`loadSound('${file}') : file not found.`);
    }
    var buf;
    //TODO 2020: option to not use cache / watch & reload on server?
    if (soundFileCache[file]) {
        sclog("Getting '" + file + "' from cache.");
        //Could there be a risk of the cached buffer not being alive?
        //theoretically, could be worth a more sophisticated / less greedy cache, but ok for now.
        buf = soundFileCache[file];
        //XXXX::: need to fix argument spec.
        if (completionJS)
            completionJS(buf); //resolve promise. !! nb, buf or msg arg !!
    }
    else {
        buf = new SCBuffer({ cmd: "/b_allocRead", file: file, completionJS: completionJS });
        soundFileCache[file] = buf;
    }
    return buf;
}
async function loadSoundAsync(file) {
    //TODO: stronger type.
    return new Promise((resolve, reject) => {
        loadSound(file, (buf) => resolve(buf), reject);
    });
}
/**
 * For now, this is basically only used from mutsynth. I keep the housekeeping
 * of busses there for now, and will need to do some more work with it to use from
 * elsewhere.
 * @param {type} name
 * @param {Integer} n number of channels
 * @param {Integer} busID explicitly choose which bus to refer to, ignoring whether or not another SCBus uses it
 * @returns {SCBus}
 */
function SCBus(name, n = 1, busID) {
    /*
     if (bussesByName.hasOwnProperty(name)) {
     sclog("WARNING: Made new SCBus with name " + name + " that was already in use.");
     var oldBus = bussesByName[name];
     this.id = oldBus.id;
     this.replacedBus = oldBus;
     oldBus.replacedBy = this;
     } else {
     this.id = freeBusses.claim(); //TODO: mechanism for claiming multiple contiguous.
     }
     bussesByName[name] = this;*/
    this.n = n;
    let ids;
    if (busID !== undefined) {
        sclog(`making SCBus '${name}' with explicit busID '${busID}'`);
        ids = [];
        for (let i = 0; i < n; i++)
            ids.push(i + busID);
    }
    else {
        //claiming multiple contiguous, use lowest as 'id'.
        ids = this.busAllocator.claim(n);
    }
    this.id = ids.length ? ids[0] : ids;
    this.ids = ids;
    this.name = name;
    this.synths = [];
}
//nb this is actually undefined at start (initialised in startSC in the hopes of being able to restartSC...
//but many things would be likely to go wrong if that was attempted)
let freeBusses;
SCBus.prototype.busAllocator = freeBusses;
SCBus.prototype.free = function (msg = 'bus') {
    //nb, at one stage I had a 'cascade' argument relating to re-using bus names...
    //I should perhaps delete some old comments...
    //Although it's reasonably simple, I suspect the logic of this freeing many busses of same name
    //could be wrong... don't want to think about it very much now,
    //and not testing it right now either... try to avoid collisions...
    //        if (cascade) {
    //            if (this.replacedBus) this.replacedBus.free(true);
    //        }
    //        if (!this.replacedBy)
    this.busAllocator.unclaim(this.ids);
    this.freed = true;
    this.synths.forEach(s => s.free(`SCBus_${this.name}.free("${msg}")`));
    //for now I'm avoiding modifying bussesByName here, so that I can call this method while iterrating it.
    //UPDATE: that is easily avoided and might be causing me problems (clean FP style could be an ambition
    //...right now I'm not likely to get there, but at least move in that direction...)
};
SCBus.prototype.processBundle = function () {
    //some things, like Spectrogram etc, don't have a 'processBundle'...
    //for now, this should cover majority of active uses.
    this.synths.filter(s => s.processBundle).forEach(s => s.processBundle());
};
//this is not quite right...
//But I really should get on the case of making it possible to have control busses...
//Should then also make some kind of rule for what things attach to them... naming convention for K synths...
//Some things like Ana want multiple channels, that should be easy to access by name.
//Maybe that's not 'some things like Ana' but (at least in the short term) we could make Ana a special case.
//let ana = AnaBus(synthBusRef);
//ana.crest.linlin({})...
function SCKBus(name, n) {
    this.n = n = n || 1;
    let ids = this.busAllocator.claim(n);
    this.id = ids.length ? ids[0] : ids; //claiming multiple contiguous, and returning lowest.
    this.ids = ids;
    this.name = name;
    this.synths = [];
}
SCKBus.prototype.busAllocator = new TIntPool(4096, 0, "SCKBus allocator"); //not sure about base value. 0 probably ok. How to test?
SCKBus.prototype.free = function (msg = 'bus') {
    this.busAllocator.unclaim(this.ids);
    this.synths.forEach(s => s.free(`SCKBus_${this.name}.free("${msg}")`));
};
SCKBus.prototype.Set = function (v) {
    writeOSC('/c_set', this.id, v);
    return this;
};
SCKBus.prototype.processBundle = SCBus.prototype.processBundle;
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
////////////////////////////
////////////////////////////    Scope-y things...
////////////////////////////
function VUMeter(targetSynth, label) {
    var addOpt, bus;
    if (targetSynth) {
        bus = targetSynth.parms.bus || targetSynth.parms.outBus;
        if (bus === undefined)
            sclogE("VUMeter expects synth with bus or outBus (deprecated) parm set.");
        addOpt = naddAfter(targetSynth.id);
        this.targetSynth = targetSynth;
    }
    else {
        addOpt = naddTail();
        bus = 0;
    }
    var vu = this;
    this.synth = new Synth("vuMeter", ["bus", bus], addOpt);
    this.peak = 0;
    this.rms = 0;
    //marking for attention WRT lfOut...
    // on("/vuReply", function (msg) {
    //     if (msg.args[0] === vu.synth.id) {
    //         vu.rms = msg.args[2];
    //         vu.peak = msg.args[3];
    //         //if (isNaN(vu.rms)) SynthNaNdetected();
    //     }
    //     for (var i = 0; i < vu.listeners.length; i++) vu.listeners[i](vu.rms, vu.peak);
    // });
    vu.synth.on("/vuReply", (msg) => {
        vu.rms = msg.args[2];
        vu.peak = msg.args[3];
    });
    this.listeners = [];
    this.makeGraphics();
}
VUMeter.prototype.onData = function (fn) {
    this.listeners.push(fn);
};
VUMeter.prototype.makeGraphics = function () {
    var el = $('<div/>', { class: 'scScope' });
    this.div = el[0];
    $('#scScopes').append(el);
    var rms = $('<div/>', { class: 'hbar' });
    el.append(rms);
    var peak = $('<div/>', { class: 'hbar' });
    el.append(peak);
    this.onData(function (rmsV, peakV) {
        rms.css('width', rmsV * 200);
        peak.css('width', peakV * 400);
    });
};
VUMeter.prototype.free = function (reason = "") {
    this.synth.free(reason);
    $(this.el).remove();
    //TODO: check cleanup of listeners
};
var VUMeter2 = function VUMeter2(targetSynth) {
    var bus = targetSynth ? targetSynth.parms.bus || targetSynth.parms.outBus : 0;
    var addOpt = naddTail();
    var vu = this;
    //scope ids are actually redundant - we have the node id in messages received anyway...
    //but removing too hastily caused very short-term problem.
    this.synth = new Synth("vuMeter2", ["bus", bus], addOpt);
    this.peak = 0;
    this.rms = 0;
    vu.synth.on("/vuReply", function (msg) {
        var a = msg.args;
        //if (a[0] === vu.synth.id) { //?
        vu.rms = [a[2], a[4]];
        vu.peak = [a[3], a[5]];
        //if (isNaN(vu.rms)) SynthNaNdetected();
        //}
        for (var i = 0; i < vu.listeners.length; i++)
            vu.listeners[i](vu.rms, vu.peak);
    });
    this.listeners = [];
    this.makeGraphics();
};
VUMeter2.prototype.onData = function (fn) {
    this.listeners.push(fn);
};
VUMeter2.prototype.makeGraphics = function VUMeter2_prototype_makeGraphics() {
    var el = $('<div/>', { class: 'scScope' });
    this.div = el[0];
    $('#scScopes').append(el);
    var left = $('<div/>', { class: 'hbar' });
    el.append(left);
    var right = $('<div/>', { class: 'hbar' });
    el.append(right);
    var w = 480;
    this.onData(function VUMeter_display(rmsV, peakV) {
        if (VUMeter2.nometer)
            return; // sjpt todo for avoiding unneeded async work
        //TODO: in cases where we're buffering incoming data, maybe better just to directly update.
        setTimeout(function VUMeter_display_inner() {
            left.css('width', rmsV[0] * w);
            right.css('width', rmsV[1] * w);
        }, 0);
    });
};
VUMeter2.prototype.free = VUMeter.prototype.free;
function Ana(targetSynth, label) {
    if (targetSynth.parms.bus === undefined)
        throwe("expects synth with bus parm set.");
    var ana = this;
    this.targetSynth = targetSynth;
    this.synth = new Synth("ana", ["bus", targetSynth.parms.bus], naddAfter(targetSynth.id));
    this.listeners = [];
    this.data = { dissonance: 0, crest: 0, flux: 0, fluxPos: 0, spread: 0, flatness: 0, centroid: 0 };
    on("/ana", function (msg) {
        if (msg.args[0] === ana.synth.id) {
            var i = 2;
            var d = ana.data;
            d.dissonance = msg.args[i++];
            //if (isNaN(d.dissonance)) SynthNaNdetected();
            d.crest = msg.args[i++];
            d.flux = msg.args[i++];
            d.fluxPos = msg.args[i++];
            d.spread = msg.args[i++];
            d.flatness = msg.args[i++];
            d.centroid = msg.args[i++];
            for (i = 0; i < ana.listeners.length; i++) {
                ana.listeners[i](d);
            }
        }
    });
    this.makeGraphics();
}
Ana.prototype.onData = function (fn) {
    this.listeners.push(fn);
};
Ana.prototype.makeGraphics = function () {
    //TODO: refactor these graphic elements
    //consider using freewall.js layout.
    //Don't know what above is, but consider plotting everywhere (also MFCCgram)...
    var el = $('<div/>', { class: 'scScope' });
    this.div = el[0];
    $('#scScopes').append(el);
    el.bars = {};
    this.onData(function (d) {
        for (var k in d) {
            if (!el.bars[k]) {
                var label = $('<p>' + k + '</p>');
                //el.append(label);
                var bar = el.bars[k] = $('<div/>', { class: 'hbar' });
                bar.append(label);
                el.append(bar);
            }
            el.bars[k].css('width', d[k] * 480);
        }
    });
};
Ana.prototype.free = function () {
    $(this.div).remove();
    this.synth.free();
};
function FFTScope(target, label) {
    //TODO: make this take an SCBus as argument, and probably add to tail.
    if (target.parms.bus === undefined)
        throwe("FFTScope expects synth with bus parm set.");
    this.targetSynth = target;
    if (label)
        this.label = label;
    else if (target.mutID)
        this.label = target.mutID;
    this.label = "<em>FFT:</em> " + this.label;
    var fft = this;
    this.buf = new SCBuffer({
        cmd: "/b_alloc",
        frames: 1024,
        completionJS: this.initSynth,
        objToCall: this
    });
    this.makeCanvas();
    this.draw = function () {
        if (this.zombie)
            return;
        var b = this.buf;
        if (!b)
            return; // must have been freed, return and never try to draw again
        setTimeout(function fftscopeRequestData_defer() {
            b.requestData();
        }, 0);
        scdefer(function fftdrawscope_next() {
            fft.draw();
        });
        // don't bother to redraw if no new buffer
        if (this.readRequestsComplete === b.readRequestsComplete) {
            return;
        }
        this.readRequestsComplete = b.readRequestsComplete;
        var data = this.buf.data;
        if (!data)
            return;
        var ctx = fft.ctx;
        var w = fft.canvas.width, h = fft.canvas.height;
        ctx.setTransform(w, 0, 0, -h, 0, h);
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 0.003;
        var age = Math.floor(Math.min(Date.now() - this.buf.dataReceivedTime, 255)); //just cap at 255ms
        var col = "rgb(" + age + ",255,255)"; // #ADFF2F - greenyellow-ish, B according to age of data. Cyan now.
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        var logLen = Math.log(data.length);
        for (var i = 0; i < data.length; i++) {
            var ll = Math.log(i + 1) / logLen;
            ctx.lineTo(ll, data[i] / 6);
            //ctx.lineTo(ll, Math.log(data[i])*20); // ampdb
        }
        ctx.stroke();
    };
    fft.draw();
}
FFTScope.prototype.initSynth = function () {
    this.synth = new Synth("fftScopePull", ["buf", this.buf.id, "bus", this.targetSynth.parms.bus], naddAfter(this.targetSynth.id));
    return true;
};
FFTScope.prototype.free = function () {
    //XXX: sometimes free() isn't called, but just a flag set on killed while we kill a group for example.
    //but then this stuff doesn't get to happen...
    $(this.el).remove();
    this.buf.free();
    this.synth.free();
    this.buf = undefined;
    this.synth = undefined;
};
FFTScope.prototype.makeCanvas = function () {
    var div = $('<div/>', { class: 'scScope' }).height(120);
    this.el = div;
    this.canvas = $('<canvas/>').width(480).height(120)[0];
    div.append(this.canvas);
    $('#scScopes').append(div);
    if (this.label)
        div.append($('<p>' + this.label + '</p>'));
    this.ctx = this.canvas.getContext('2d');
};
/**
Yet more lazy copy and pasting / modifying code because I want to do something and can't be bothered
to work out best JS way of doing so.  Should consolidate all of these 'scope-ish' things in some way,
perhaps into a class hierarchy now that we have ES6 classes.
--> this is becoming relevant again as I implemented synth parameter bundling, but not for these...
and also because I probably want to change logic of how the receive data & draw.
*/
function Spectrogram(target, label) {
    //TODO: make this take an SCBus as argument, and probably add to tail.
    if (target.parms.bus === undefined)
        throwe("FFTScope expects synth with bus parm set.");
    this.targetSynth = target;
    if (label)
        this.label = label;
    else if (target.mutID)
        this.label = target.mutID; //XXX: polluting with mutsynth stuff...
    this.label = "<em>Spectrogram:</em> " + this.label;
    var fft = this;
    this.buf = new SCBuffer({
        cmd: "/b_alloc",
        frames: 1024,
        completionJS: this.initSynth,
        objToCall: this
    });
    //TODO: also hover div with settings, writing to texture... generally more HTML GUI stuff.
    this.makeCanvas();
    this.draw = function () {
        function ampDb(amp) { return 20 * Math.log10(amp); }
        if (this.zombie)
            return;
        var b = this.buf;
        if (!b)
            return; // must have been freed, return and never try to draw again
        setTimeout(function fftscopeRequestData_defer() {
            b.requestData();
        }, 0);
        scdefer(function fftdrawscope_next() {
            fft.draw();
        });
        // was avoiding redraw if no new buffer (for FFTScope), but since we want to keep scrolling,
        // I keep drawing regardless.
        // if (this.readRequestsComplete === b.readRequestsComplete) {
        //     return;
        // }
        // this.readRequestsComplete = b.readRequestsComplete;
        var data = this.buf.data;
        if (!data)
            return;
        var ctx = fft.ctx;
        var tempCtx = fft.tempCtx;
        var tempCanvas = fft.tempCanvas;
        var w = fft.canvas.width, h = fft.canvas.height;
        tempCtx.drawImage(fft.canvas, 0, 0, w, h);
        //var age = Math.floor(Math.min(Date.now() - this.buf.dataReceivedTime, 255)); //just cap at 255ms
        var logLen = Math.log(data.length);
        //var max = _.max(data), min = _.min(data);
        const logFreq = false;
        const minDB = 60;
        for (var i = 0; i < data.length; i++) {
            let y, binH, a;
            if (logFreq) {
                // to use log scale, will need to not draw 1x1px rects
                // ...and probably be a bit more careful about some other things.
                var ll = Math.log(i + 1) * h / logLen;
                var ll2 = Math.log(i + 2) * h / logLen;
                y = ll;
                a = ll2 - ll;
                binH = Math.ceil(a);
            }
            else {
                y = i * h / data.length;
                binH = 1;
                a = 1;
            }
            //... I should try to have a clearer idea of what the data is here... do I have phases too?
            var v = ampDb(Math.abs(data[i])); //should be a db, ie perceptually linear, max ~0, min -inf.
            v = Math.min(0, Math.max(-minDB, v));
            v = (v + minDB) * 256 / minDB;
            //var v = Math.log(Math.abs(data[i])) * 512;//255 * (data[i]+min) / (max-min); //approximately trying to get to range 0-255
            v = Math.floor(v);
            if (logFreq) {
                ctx.fillStyle = `rgba(0, ${v}, ${v}, ${Math.min(1, a)})`;
            }
            else
                ctx.fillStyle = "rgb(0, " + v + ", " + v + ")";
            ctx.fillRect(w - 1, h - y, 1, Math.max(1, binH));
        }
        ctx.translate(-1, 0);
        ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    //calling this straight away will cause b.requestData before it's ready, which prints FAILURE on console.
    fft.draw();
}
Spectrogram.prototype.initSynth = function () {
    this.synth = new Synth("fftScopePull", ["buf", this.buf.id, "bus", this.targetSynth.parms.bus], naddAfter(this.targetSynth.id));
    return true;
};
Spectrogram.prototype.free = function () {
    $(this.el).remove();
    this.buf.free();
    this.synth.free();
    this.buf = undefined;
    this.synth = undefined;
};
Spectrogram.prototype.makeCanvas = function () {
    var div = $('<div/>', { class: 'scScope' }).height(120);
    this.el = div;
    this.canvas = $('<canvas/>').width(480).height(120)[0];
    div.append(this.canvas);
    $('#scScopes').append(div);
    if (this.label)
        div.append($('<p>' + this.label + '</p>'));
    this.ctx = this.canvas.getContext('2d');
    this.tempCanvas = $('<canvas/>').width(480).height(120)[0];
    this.tempCtx = this.tempCanvas.getContext('2d');
};
function OscScope(target, label, displayFrames = 4096) {
    this.displayFrames = displayFrames;
    //TODO: make this take an SCBus as argument, and probably add to tail.
    if (target.parms.bus === undefined)
        throwe("OscScope expects synth with bus parm set.");
    this.targetSynth = target;
    if (label)
        this.name = label;
    else if (target.mutID)
        this.name = target.mutID;
    this.label = "<em>OscScope:</em> " + this.name;
    var _t = this;
    this.buf = new SCBuffer({
        cmd: "/b_alloc",
        frames: this.frames,
        completionJS: this.initSynth,
        objToCall: this
    });
    this.data = [];
    this.data.length = this.historySize;
    this.data.fill(0);
    let t = Date.now();
    let tFact = -1;
    this.buf.onRecData(newData => {
        const t1 = Date.now();
        //how much time has past compared to the length of the recieved buffer?
        let bufMS = 1000 * newData.length / NW_SC.sampleRate;
        let dtFactor = (t1 - t) / bufMS; //right is 1. <1 means we have duplicate data, >1 dropped data. Observation ~0.68
        tFact = tFact === -1 ? dtFactor : 0.99 * tFact + 0.01 * dtFactor;
        msgfix(`dtFactor ${this.name}`, () => format(tFact));
        //I suppose I could set a parm on synth to alter reply freq based on dtFactor
        //tempted to try to work out where the overlap is... (should resist and change to push from sc, but...)
        // let approxFrameDiscrepancy = (1-dtFactor) * newData.length;
        // let potentialOverlapStart = this.data.length - approxFrameDiscrepancy;
        // //find matching data... what if there are repeating signals (like a load of zeros)?
        // //**this is a stupid idea.**//
        // let potentialOverlap = this.data.slice(potentialOverlapStart);
        // let i = potentialOverlap.findIndex(v => v===newData[0]);
        var b = this.buf;
        //there are some incorrect assumptions here: that the data will arrive in coniguous frames...
        //we could attempt to resolve the discrepency with a timestamp (will be fiddly),
        //or perhaps rather have SuperCollider push rather than us pull.
        //Now changed so that we request data based on messages sent by scsynth at a frequency corresponding to buf length
        //that's not correct but it's better.
        this.data.splice(0, newData.length);
        this.data = this.data.concat(newData);
        t = t1;
        setTimeout(function scoperequestData_defer() {
            //TODO: get data pushed at appropriate intervals rather than pulling?
            if (b)
                b.requestData();
        }, 0);
    });
    this.buf.requestData();
    this.makeCanvas();
    this.draw = function () {
        if (this.zombie)
            return;
        var buf = this.buf;
        if (!buf)
            return; // must have been freed, return and never try to draw again
        this.drawRequests--;
        scdefer(function drawscope_next() {
            if (_t.drawRequests)
                return;
            _t.drawRequests++;
            _t.draw();
        });
        // don't bother to redraw if no new buffer
        if (this.readRequestsComplete === buf.readRequestsComplete) {
            return;
        }
        this.readRequestsComplete = buf.readRequestsComplete;
        var data = this.data.slice(this.data.length - this.displayFrames); //this.buf.data; //XXX
        if (!data || data.length === 0)
            return;
        const min = data.reduce((a, b) => a < b ? a : b);
        const max = data.reduce((a, b) => a > b ? a : b);
        //centre on zero if range is asymetric, always include -1,1 and always have some padding
        const absMax = Math.max(Math.abs(min), Math.abs(Math.max(max, 1)));
        const range = absMax * 1.1;
        var ctx = _t.ctx;
        var w = _t.canvas.width, h = _t.canvas.height;
        const vScale = -h / (2 * range), vTrans = h / 2;
        //ctx.setTransform(w, 0, 0, -h/absMax, 0, h*absMax/2);
        ctx.setTransform(w, 0, 0, -h / (2 * range), 0, h / 2);
        ctx.clearRect(0, -range, w, 2 * range);
        ctx.beginPath();
        ctx.lineWidth = 0.005;
        ctx.strokeStyle = '#999999';
        ctx.moveTo(0, 0);
        ctx.lineTo(1, 0);
        ctx.stroke();
        ctx.strokeStyle = '#AAAAAA';
        ctx.moveTo(0, 1);
        ctx.lineTo(1, 1);
        ctx.moveTo(0, -1);
        ctx.lineTo(1, -1);
        ctx.stroke();
        ctx.lineWidth = 0.003;
        var agemilli = Date.now() - this.buf.dataReceivedTime;
        var age = Math.min(Math.floor(agemilli /** *255/10000. **/), 255); //max 10sec?, and cap at 255
        ctx.strokeStyle = "rgb(" + age + ",255,255)"; // #ADFF2F - greenyellow-ish, B according to age of data. Cyan now.
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const step = Math.max(1, Math.floor(data.length / this.displaySteps));
        for (var i = 0; i < data.length; i += step) {
            var x = i / (data.length - 1), y = data[i];
            if (step > 1) {
                //y = data.slice(i, Math.min(i+step, data.length)).reduce((a, b) => a > b ? a : b);
            }
            this.ctx.lineTo(x, y);
        }
        ctx.stroke();
        this.rangeEl.innerHTML = format(absMax) + ` (${format(Math.pow(10, absMax / 20))}db)`;
    };
    this.drawRequests = 1;
    _t.draw();
}
OscScope.prototype.initSynth = function () {
    this.synth = new Synth(this.synthType, ["buf", this.buf.id, "bus", this.targetSynth.parms.bus], naddAfter(this.targetSynth.id));
    this.synth.on('/monoScopeData', msg => {
        //TODO;
        // //we'll call at approximately the right frequency vs requesting as we receive, but various aspects to do with latency etc
        // //mean it won't be perfectly aligned etc (especially with extra setTimeout deferral).
        // setTimeout(() => {  // request a new set of data, may arrive in time for next call
        //     // TODO: get data pushed at appropriate intervals rather than pulling?
        //     if (this.buf.readRequests > this.buf.readRequestsComplete+2) return;
        //     else this.buf.requestData();
        // }, 0);
        // this.buf.requestData();
    });
    return true;
};
OscScope.prototype.free = function () {
    //seems that we are not releasing all memory... are all refs to callbacks released?
    $(this.el).remove();
    this.buf.free();
    this.synth.free();
    this.buf = undefined;
    this.synth = undefined;
    this.data = [];
};
OscScope.prototype.makeCanvas = function () {
    var div = $('<div/>', { class: 'scScope' }).height(120);
    this.el = div;
    //TODO: hidpi
    let width = 480;
    this.canvas = $('<canvas/>').width(width).height(120)[0];
    $(this.canvas).on('mousedown', e => {
        this.displayFrames = this.historySize * (Math.pow(e.offsetX / width, 2));
        this.displayFrames = Math.floor(this.displayFrames);
        const t = format(this.displayFrames / NW_SC.sampleRate);
        sclog(`OscScope "${this.name}" displayFrames "${this.displayFrames}" t "${t}s`);
    });
    div.append(this.canvas);
    $('#scScopes').append(div);
    if (this.label)
        div.append($('<p>' + this.label + '</p>'));
    this.rangeEl = document.createElement('span');
    this.rangeEl.classList.add('scopeRangeIndicator');
    div.append($(this.rangeEl));
    // div.append($(`<span class="scopeRangeIndicator scopeRange_${this.name}">1</span>`));
    this.ctx = this.canvas.getContext('2d');
};
//Stuff that is per-scope-type factored out here...
OscScope.prototype.frames = 1024; //we could make it change size of buffer when this changes...
OscScope.prototype.historySize = 1024 * 1024;
OscScope.prototype.displayFrames = 4096; //how far back in buffer to read
OscScope.prototype.displaySteps = 800; //how many line-segments to draw
OscScope.prototype.synthType = "monoScope";
//"Mel frequency cepstral coefficients" timbral discriptors
//Note that this gets 'pushed' data from SendReply in SC.
//The Synth has a local buf about which JS side has no knowledge.
//All of this means current implementation is somewhat different to FFTScope & OscScope
function MFCC(target, label) {
    //TODO: make this take an SCBus as argument, and probably add to tail.
    if (target.parms.bus === undefined)
        throwe("MFCC expects synth with bus parm set.");
    this.targetSynth = target;
    if (label)
        this.label = label;
    else if (target.mutID)
        this.label = target.mutID;
    this.label = "<em>MFCC:</em> " + this.label;
    var mfcc = this;
    this.makeCanvas();
    this.synth = new Synth("mfcc", ["bus", this.targetSynth.parms.bus], naddAfter(this.targetSynth.id));
    this.receiveData = on("/mfcc", function (msg) {
        if (msg.args[0] !== mfcc.synth.id)
            return;
        mfcc.data = _.map(msg.args.splice(2), function (e) { return e; });
    });
    this.draw = function () {
        if (this.zombie)
            return;
        scdefer(function () {
            mfcc.draw();
        });
        //var data = this.buf.data;
        if (!this.data)
            return;
        var data = this.data;
        var ctx = mfcc.ctx;
        var w = mfcc.canvas.width, h = mfcc.canvas.height;
        ctx.setTransform(w, 0, 0, -h, 0, h);
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 0.003;
        // #ADFF2F - greenyellow-ish, B according to age of data. Cyan now.
        ctx.strokeStyle = "rgb(0,255,255)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (var i = 0; i < data.length; i++) {
            //I could setTransform such that I didn't need to scale x here.
            var x = i / (data.length - 1), y = data[i];
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    };
    scdefer(function () {
        mfcc.draw();
    });
}
MFCC.prototype.makeCanvas = function () {
    var div = $('<div/>', { class: 'scScope' }).height(120);
    this.el = div;
    this.canvas = $('<canvas/>').width(480).height(120)[0];
    div.append(this.canvas);
    $('#scScopes').append(div);
    if (this.label)
        div.append($('<p>' + this.label + '</p>'));
    this.ctx = this.canvas.getContext('2d');
};
MFCC.prototype.receiveData = function (msg) {
    if (msg.args[0] !== this.synth.id)
        return;
    var tdata = _.map(msg.args.splice(2), function (e) { return e; });
    if (tdata && tdata.length !== 0)
        this.data = tdata;
};
MFCC.prototype.free = function (reason = 'default') {
    off("/mfcc", this.receiveData);
    $(this.el).remove();
    this.synth.free(reason);
    this.synth = undefined;
};
function SCRecorder(name, fileFormat) {
    var _r = this;
    var bOpts = { cmd: "/b_alloc", frames: 65536, channels: 2 }; //, prepComplete: this.prepCompletionMsg };
    this.buf = new SCBuffer(bOpts);
    on("/done", function (msg) {
        log("SCRecorder done 1", msg.args[0]);
        if (msg.args[0] === "/b_alloc") { //should maybe check more carefully, or use an event on the buffer.
            sclog("/b_alloc done, starting write");
            writeOSC("/b_write", [_r.buf.id, name, "wav", fileFormat || "int16", 0, 0, 1]);
            return true;
        }
    });
    on("/done", function (msg) {
        log("SCRecorder done 2", msg.args[0]);
        if (msg.args[0] === "/b_write") {
            _r.startTime = Date.now();
            sclog("/b_write done, making Diskout2 node to do recording with buf " + _r.buf.id);
            log("/b_write done, making Diskout2 node to do recording with buf " + _r.buf.id);
            _r.recorder = new Synth("Diskout2", ["bufnum", _r.buf.id], naddTail());
            return true;
        }
    });
}
SCRecorder.prototype.free = function () {
    var _r = this;
    if (!_r.recorder) {
        sclog('attempt to free audio recorder before started, delay 1 sec');
        log('attempt to free audio recorder before started, delay 1 sec');
        setTimeout(function () { _r.free(); }, 1000);
        return;
    }
    sclog('freeing audio recorder for real');
    log('freeing audio recorder for real');
    on("/done", function (msg) {
        if (msg.args[0] === "/b_close") {
            _r.buf.free();
            if (_r.recorder)
                _r.recorder.free();
            return true;
        }
    });
    startOSCBundle();
    _r.recorder.run(0);
    on("/n_off", function (msg) {
        if (msg.args[0] === _r.recorder.id) {
            sclog("SCRecorder /n_off received... closing buffer.");
            writeOSC("/b_close", _r.buf.id);
            return true;
        }
    });
    flushOSCBundle();
};
/** Avoids getting tangled up in scRecorder not being null on done,
 * allows us to carry on using the same buffer, etc. */
SCRecorder.prototype.closeOldStartNew = function (newName, onDoneFn) {
    var _r = this;
    newName = newName || defaultAudioFileName();
    sclog(`recording audio to "${newName}"`);
    startOSCBundle();
    _r.recorder.run(0);
    on("/n_off", function (msg) {
        if (msg.args[0] === _r.recorder.id) {
            sclog("SCRecorder /n_off received... closing buffer.");
            writeOSC("/b_close", _r.buf.id);
            return true;
        }
    });
    onDone("/b_close", function () {
        if (onDoneFn)
            onDone("/b_write", onDoneFn());
        startOSCBundle();
        _r.recorder.run(1);
        writeOSC("/b_write", [_r.buf.id, newName, "wav", "int16", 0, 0, 1]);
        flushOSCBundle();
    });
    flushOSCBundle();
};
function defaultAudioFileName() {
    const t = new Date();
    //XXX: this might just overwrite old file if called more than once per minute.
    return "save/" + "orgAud" + t.getFullYear() + t.getMonth() + t.getDay() + "_" + t.getHours() + t.getMinutes() + t.getSeconds() + ".wav";
}
var scRecorder;
function startAudioRecording(name, onDoneFn) {
    if (!NW_SC.shuttingDown)
        return; // ?? best test for audio ??
    const t = new Date();
    if (isNode()) {
        var fs = require('fs');
        if (!name && !fs.existsSync('save'))
            fs.mkdirSync('save');
    }
    else {
        runcommandphp('mkdir save');
    }
    name = name || defaultAudioFileName();
    //while (fs.existsSync(name)) {
    //TODO don't overwrite
    //}
    if (scRecorder) {
        if (onDoneFn)
            onDoneFn();
        sclog("startAudioRecording called when already recording " + t);
        log("startAudioRecording called when already recording " + t);
    }
    else {
        sclog("Start audio recording " + name + " " + t);
        log("Start audio recording " + name + " " + t);
        if (onDoneFn)
            onDone("/b_write", onDoneFn);
        scRecorder = new SCRecorder(name);
    }
}
function stopAudioRecording(onDonep) {
    if (!NW_SC.shuttingDown)
        return; // ?? best test for audio ??
    //not the cleanest way, but quick way to ensure that the last block of audio is written.
    //I also reduced the size of buffer that SCRecorder uses to 65536 frames, which should make the amount lost smaller anyway.
    //
    // Stephen, 27 July 2015 experiments showed buffers chunks of about 0.7 secs, with 900ms the shortest time to reliably save any data
    // so 1 sec should be safe for no loss
    sclog("called stopAudioRecording... delaying execution by 1sec...");
    log("called stopAudioRecording... delaying execution by 1sec...");
    setTimeout(function () {
        if (scRecorder) {
            if (scRecorder.startTime)
                sclog("Stop recording after " + ((Date.now() - scRecorder.startTime) / 1000) + 's');
            else
                sclog("Stop recording at " + new Date() + "... but couldn't read startTime, which is a bad sign...");
            if (onDonep)
                onDonep("/b_close", onDonep);
            scRecorder.free();
            scRecorder = null;
        }
        else {
            if (onDonep)
                onDonep();
            sclog("stopAudioRecording called when not recording " + new Date());
        }
    }, 1000);
}
function setAudioRecording(v) {
    if (v === undefined)
        v = trygetele("audioRecord", "checked");
    if (v)
        startAudioRecording();
    else
        stopAudioRecording();
}
/**
 * Represent a group on scsynth server.
 * Currently makes no effort to keep track of children.
 * @param {string} name
 * @param {any} opt creation options (default naddTail(0))
 * @returns {TSCGroup}
 */
class TSCGroup extends TSCNode {
    constructor(name, opt = naddHead(0)) {
        super();
        this.id = freeNodeIDs.claim();
        synths[this.id] = this;
        on('/n_go', msg => {
            if (msg.args[0] === this.id) {
                this.confirmedStartOn = this.id;
                return true;
            }
            return false;
        });
        //not bothering with promises etc for this... or node hierarchy for now.
        writeOSC('/g_new', [this.id, opt.addAction, opt.addTarget]);
    }
    //could be common to synth & group.
    // async run(v: boolean) {
    //     writeOSC('/n_run', [this.id, v? 0:1]);
    // }
    queryProperties(callback) {
        const group = this;
        on("/g_queryTree.reply", function (msg) {
            //sclog("[scsynth] /queryTree.reply for SCGroup  @ " + new Date());
            const tree = {};
            let i = 0;
            const args = msg.args;
            const controls = args[i++] === 1;
            tree.rootNode = args[i++];
            if (tree.rootNode !== group.id)
                return false;
            if (!controls) {
                sclogE("SCGroup.queryProperties got a g_queryTree.reply without controls...");
                sclogE("I don't expect this to happen, but I suppose it could.");
                return false;
            }
            const children = args[i++];
            const serverIDs = [];
            //what I actually want at this minute (for implementing autocomplete) is
            //"the names of all controls for each SynthName"
            //I'll think about refactoring differently - is this going to end up being much the same info as tree?
            const controlNames = {};
            for (let j = 0; j < children; j++) {
                const nID = args[i++];
                serverIDs.push(nID);
                //note that maybe my synths[id] should really be nodes[id]
                //var isSynth = args[i++]; //XXX: NO!
                const nChildren = args[i++];
                const isSynth = nChildren === -1;
                const n = tree[nID] = {};
                if (!isSynth) {
                    n.type = "group";
                    //note: these messages don't contain any more info about nodes nested within subgroups:
                    //I believe it would be necessary to make another /g_queryTree with this nID to expand the entire tree.
                }
                if (isSynth) {
                    n.type = args[i++];
                    if (controlNames[n.type])
                        sclog("unexpected duplicate... nb, in general case this is ok, short-term debug...");
                    const cn = controlNames[n.type] = [];
                    n.parms = {};
                    const numControls = args[i++];
                    for (var k = 0; k < numControls; k++) {
                        const ctrlName = args[i++];
                        const ctrlVal = args[i++];
                        //we should deal with removing properties that are in parms but not seen in this reply message.
                        //maybe even put them into a 'lostParms' or something; could be useful if eg SynthDef changes to
                        //remove a parm, but then it gets added as well.
                        //note this could be a value or control bus mapping symbol (eg 'c1')...
                        if (typeof ctrlVal === 'string' && ctrlVal.match(/^[ac]\d+$/)) {
                            sclog(`found control bus mapping symbol ${ctrlVal} for ${ctrlName} of ${n.type}...`);
                        }
                        n.parms[ctrlName] = ctrlVal;
                        cn.push(ctrlName);
                    }
                }
            }
            if (callback)
                callback(controlNames);
            return true;
        });
        syncThen(function () { writeOSC("/g_queryTree", [group.id, 1]); });
    }
    order(opt) {
        if (opt.timetag)
            sclogE('timetag not implemented for group order...');
        writeOSC('/n_order', [opt.addAction, opt.addTarget, this.id]);
    }
    // Do we or do we not want to maintain graph in our client?
    // Perhaps there could even be different versions of group depending on whether they do or don't
    // but my inclination is not to go down this road for now.
    // I should review what SuperColliderJS does, and also KISS.
    //..    async free() //XXX: (how) is this syntax valid? couldn't reproduce in playground...
    //..    async free(childrenToFlag?: any[]) { }
    async free(killReason = 'nothing specific', childrenToFlag) {
        //nb, I didn't write this method earlier because of the issue with children not flagged as free...
        //so I either need to have a more complete representation of the node graph & traverse that,
        //or pay less attention to things being unexpectedly freed...
        //... or for now for the specific case of mutsynth parent node, just flag all of the synths in that context first...//
        childrenToFlag === null || childrenToFlag === void 0 ? void 0 : childrenToFlag.forEach(s => s.freed = `flagged as by free() of ${this.id}`);
        writeOSC('/g_deepFree', this.id);
    }
}
NW_SC.queryControlNamesForAllSynthNames = async function (chunkLength) {
    if (!isNode()) {
        sclog("queryControlNamesForAllSynthNames in browser version relies on last dump from Electron... TODO: move this to proxy (really todo review supercolliderjs)");
        // set NW_SC.SynthNames & NW_SC.ctrlNames from yaml (and make sure they're safe)
        const str = getfiledata(synthCtrlNamesFile);
        const data = yaml.safeLoad(str);
        NW_SC.ctrlNames = data;
        NW_SC.SynthNames = Object.keys(data);
        sclog(`data loaded for ${NW_SC.SynthNames.length} synth modules (many should be culled, some more will be added...)`);
        return;
    }
    //remember that I also want to be able to update specific synths types when they are reloaded.
    //It was causing problems receiving the reply (I think) when all of the synths were done together.
    //so I made it batch them into chunks... 60 was initially chosen as being ok with synths at time & max tcp msg length 1000
    //but seem to be able to easily do all in one chunk by increasing that limit.
    chunkLength = chunkLength || 200;
    var startTime = Date.now();
    startOSCBundle();
    var tempGroup = new TSCGroup("CtrlIntrospection for all synths");
    sclog(`queryControlNamesForAllSynthNames: tempGroup ${tempGroup.id}`);
    writeOSC("/n_run", [tempGroup.id, 0]); //pretty sure this propagates to children. Could have an interface for this
    //tempGroup.run(false);
    flushOSCBundle();
    NW_SC.ctrlNames = {};
    syncThen(function () {
        //was thinking of keeping a metadata structure, or keeping a complete set of Synths under the group, but actually,
        //the prototypes should work once I start adding the properties to them. Having said that, for now I'm making a
        //metadata structure, which is enough to be getting on with anyway.
        var l = NW_SC.SynthNames.length;
        doChunk(0);
        function doChunk(i) {
            sclog("--- starting chunk from " + i);
            var mSynths = [];
            var j = 0;
            for (; j < chunkLength; j++) {
                if (i + j >= l)
                    break;
                var name = NW_SC.SynthNames[i + j];
                //sclog("loading " + name);
                mSynths.push(new Synth(name, [], naddTail(tempGroup.id)));
            }
            //queryProperties will do its own sync... thought we wouldn't need it here,
            //but my logic may have been faulty as it appears I was having problems with the group being gone...
            //update: as with many things, would be good to transition to Promises. In this case, see Promise.all(...)
            syncThen(function () {
                tempGroup.queryProperties(function (ctrls) {
                    writeOSC("/g_deepFree", tempGroup.id); //with queryProperties done and the result recieved, we can free
                    //_.each(mSynths, function (s) { s.killed = `flagged as killed after /g_deepFree of ${tempGroup.id} in queryControlNamesForAllSynths` });
                    mSynths.forEach(s => s.killed = `flagged as killed after /g_deepFree of ${tempGroup.id} in queryControlNamesForAllSynths`);
                    //still getting 'trying to remove...' log noise, not thought through right.
                    sclog("...queried properties for chunk " + i + "-" + (i + j - 1));
                    i += j;
                    //almost thought it may be time to write my first ever progress bar...
                    //but since it is apparently unnecessary to chunk and the whole thing finishes in ~80-400ms...
                    for (var k in ctrls) {
                        //I could read from genedefs.json here for extra info.
                        //we'd need to understand ctrls[k] not being a string[].
                        NW_SC.ctrlNames[k] = ctrls[k]; //I could maintain record of corresponding ctrlIndex here, too
                    }
                    if (i < l)
                        doChunk(i);
                    else {
                        writeOSC("/n_free", tempGroup.id);
                        sclog("...queryControlNamesForAllSynthNames finished in " + (Date.now() - startTime) + "ms");
                        NW_SC.dumpControlNamesForAllSynths();
                    }
                });
            });
        }
    });
};
NW_SC.queryControlNamesForSynthName = function (name) {
    //Don't need to IPC or skip, only thing that needed node was dumpControlNamesForAllSynths
    //if (!isNode()) {
    //sclog(`skipping queryControlNamesForSynthName "${name}" (!isNode())`);
    //ipcSend({address: '/oa/queryControlNamesForSynthName', args: [name]});
    //return;
    //}
    startOSCBundle();
    //I think the only reason for group is that it was where queryProperties was implemented already.
    const tempGroup = new TSCGroup("CtrlIntrospection: " + name);
    writeOSC("/n_run", [tempGroup.id, 0]); //pretty sure this propagates to children.
    const tempSynth = new Synth(name, [], naddTail(tempGroup.id));
    flushOSCBundle();
    tempGroup.queryProperties(function (ctrls) {
        //var oldMeta = NW_SC.ctrlNames[name];
        NW_SC.ctrlNames[name] = ctrls[name];
        tempSynth.free(); //saves noise about unexpected...
        //are both of these necessary? certainly not doing any harm... would be nice to know if /n_free is enough.
        tempGroup.free();
        NW_SC.dumpControlNamesForAllSynths();
    });
};
/*
This is a step in the direction of probably refactoring away from genedefs.json for synths.
For now, it'll just be to update a file used to avoid the stupid situation I had before
where if I didn't manually add an element for new synthdef to genedefs.json, it wouldn't be available to use
in browser where the proxy doesn't do all the work of looking through the files. That'd also probably be
easy to fix... but I'm not familiar with that code.

For now, genedefs.json will remain manually editted, synthCtrlNames.yaml will just be written (w)
nb. map.json was an earlier idea of how to arrange gene mapping and is now dead.
*/
NW_SC.dumpControlNamesForAllSynths = function () {
    if (NW_SC.preparingCtrlNameDump)
        return; //I suppose there could be situation where later call got missed
    const newYaml = yaml.safeDump(NW_SC.ctrlNames, { sortKeys: true });
    if (!isNode()) {
        //send newYaml back to server. I could try to use preparingCtrlNameDump again
        //but that mechanism would be better replaced by async something, and really higher level changes anyway.
        ipcSend({ address: '/oa/dumpControlNames', args: newYaml });
        return;
    }
    NW_SC.preparingCtrlNameDump = true;
    setTimeout(() => {
        fs.readFile(synthCtrlNamesFile, {}, (readErr, data) => {
            NW_SC.preparingCtrlNameDump = false;
            if (readErr)
                sclog(readErr);
            //sclog(newYaml); //verbose logging to see what it's really done...
            if (data && newYaml !== data.toString()) {
                sclog("dumpCtrlNamesForAllSynths...");
                fs.writeFile(synthCtrlNamesFile, newYaml, err => sclog(err || "done."));
            }
        });
    }, 500);
};
NW_SC.checkSynthParmNaming = function () {
    //log information about some smells like inBus/outBus vs bus
};
function getID(v) {
    if (v === undefined)
        return 0;
    return (typeof v === "number") ? v : v.id || 0;
}
function naddHead(n, t) {
    n = getID(n);
    return { addAction: SCAddAction.AddHead, addTarget: n || 0, timetag: t };
}
function naddTail(n, t) {
    n = getID(n);
    return { addAction: SCAddAction.AddTail, addTarget: n || 0, timetag: t };
}
function naddAfter(n, t) {
    n = getID(n);
    return { addAction: SCAddAction.AddAfter, addTarget: n, timetag: t };
}
function naddBefore(n, t) {
    n = getID(n);
    return { addAction: SCAddAction.AddBefore, addTarget: n, timetag: t };
}
let scsynth, sclang, config; //typing as ChildProcess turns this into a module...
//----------> OSCWorker -------->
let oscWorker;
// scsender is default sender if nothing else specified
var osc, udp, tcpSocket, tcpSocketid = 0, scsender, scstatus, statusInterval, wssender;
const UDP_PORT = 57115, TCP_PORT = 57121, WS_PORT = 57171, WS_IPC_PORT = 57122, HOST = "127.0.0.1";
if (isNode()) {
    //holy JS-scope nonsence, batman. (!!!)
    var fs = require('fs'); // , path = require('path');
}
//var spatBus = 15;
//TODO: move some of this inside NW_SC... or make this be a module rather than global?
var MAX_NODES = 8192, freeNodeIDs, freeBufs, freeSyncIDs; // freeBusses moved up
var spat, freeverb, master, soundFileCache, //we'll make some assumptions for now that these won't be messed with behind our back...
synths, //Map<number, Tid>,
synthsByType, //Map<string, Tid[]>,
oscCallbacks; //Map<string, any[]>;    //associates expected responses (/status.reply, /done, /n_info etc) with arrays of functions(msg),
//to be removed on execution if they return true.
//XXX TODO:::: get rid of these globals....
function on(address, f) {
    if (!oscCallbacks[address])
        oscCallbacks[address] = [];
    oscCallbacks[address].push(f);
    return f; // make anonymous functions less anon
}
function off(address, f) {
    if (Array.isArray(address) && address.length === 2) {
        const fns = address[1];
        fns.forEach(fn => off(address[0], fn));
    }
    else
        removeElement(oscCallbacks[address], f);
    return f; // make anonymous functions less anon
}
NW_SC.on = on;
NW_SC.off = off;
Synth.prototype.on = function (k, fn) {
    //TODO::: this should be done in a way such that functions for disposed synth objects get removed.
    if (!this.listeners)
        this.listeners = {};
    if (!this.listeners[k])
        this.listeners[k] = [];
    let fn2 = NW_SC.on(k, (msg) => {
        if (msg.args[0] === this.id) {
            fn(msg);
        }
    });
    this.listeners[k].push(fn2);
    return fn2;
};
//TODO Dec17: review
/** helper function for responding to /done. f must *explicitly return false* if it has more stringent matching criteria
 * unlike normal on() functions, which must return something 'truthy' in order to be removed. TODO: SHOULD CHANGE THIS SOON. */
function onDone(address, f) {
    on("/done", function (msg) {
        if (msg.args[0] === address) {
            if (f(msg) !== false)
                return true;
        }
    });
}
/** helper function for responding to /fail. f must *explicitly return false* if it has more stringent matching criteria
 * unlike normal on() functions, which must return something 'truthy' in order to be removed. TODO: SHOULD CHANGE THIS SOON. */
function onFail(address, f) {
    on("/fail", function (msg) {
        if (msg.args[0] === address) {
            if (f(msg) !== false)
                return true;
        }
    });
}
var syncinfo = { ok: 0, bad: 0 };
//TODO: prime candidate for promise / async / await...
//also should be careful about bundle status.
function syncThen(f) {
    var id = freeSyncIDs.claim();
    var time = Date.now();
    sclog("--- sync " + id);
    on("/synced", sy);
    var timeout = setTimeout(sy, 30000); //  only let it last up to 30 secs then assume sync misssed
    function sy(msg) {
        if (msg === undefined || msg.args[0] === id) {
            if (msg === undefined) {
                sclog("[>>>>>>>>>>>>]syncThen timed out, performing now");
                syncinfo.bad++;
            }
            else {
                syncinfo.ok++;
            }
            // collect extra debug info that may help,
            // just type 'syncinfo' to console for info that will be fairly recent if times are hard ...
            syncinfo.time = (Date.now() - time);
            syncinfo.outstanding = oscCallbacks["/synced"].length;
            syncinfo.timeSinceLastReload = (Date.now() - debuglastReloadTried) / 1000;
            off("/synced", sy);
            sclog("sync took t=" + syncinfo.time);
            freeSyncIDs.unclaim(id);
            clearTimeout(timeout);
            if (typeof f !== "function") // may be syncing just for info
                log(f, "sync info", syncinfo);
            else
                f();
        }
        else {
            // >>> wrong assumption below, can have multiple syncs outstanding genuinely
            // eg overalapping reloadAllSynths
            // ? this only happened after an overflow, now avoided
            //oscCallbacks["/synced"] = [];
            //freeSyncIDs = new IntPool(128, 0);
            //sclog("[>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>] syncs out of sync, tidy up, some may be lost");
        }
    }
    writeOSC("/sync", id);
}
var scReady = false, scReadyFunc;
/** Execute given function straight away if synth is already running, or store for when it is running */
function whenSCReady(fn) {
    if (scReady)
        fn();
    else
        scReadyFunc = fn;
}
function dumpSCStatus(msg = "") {
    var t = Date.now();
    sclog(`\n\n------------ STATUS DUMP "${msg}" @${t}--------------\n`);
    sclog("Last status received from scsynth " + (t - scstatus.statusTime) / 1000 + " seconds ago:");
    sclog(JSON.stringify(scstatus, null, 2));
    sclog("\nLocal synths by id:");
    sclog(JSON.stringify(synths));
    sclog("\nLocal synths by type:");
    sclog(JSON.stringify(synthsByType));
    sclog("\nRequesting scsynth tree dump...");
    writeOSC("/g_dumpTree", [0, 1]);
}
/** run scsynth and sclang if requested */
function runProcesses() {
    runProcess();
    sclog('sclang : ' + config.sclang);
    if (config.sclang)
        runLangProcess();
}
/**
 * @param {type} isRetry is set to true so that it knows not to set up file watchers again.
 */
async function runProcess(isRetry) {
    if (noaudio)
        return; //==== todo complete browser audio
    let args = ["-u", '' + UDP_PORT, "-t", '' + TCP_PORT, "-m", 1024 * 64, "-a", 512, '-n', MAX_NODES]; //-S for sample rate, not used
    (function processConfigOptions() {
        let device = startvr ? config.VRAudioDevice : config.audioDevice;
        //maybe consider useSystemClock? (this is in ServerOptions in sclang, not sure about how to set over cmd line)
        NW_SC.sampleRate = 48000; //TODO: review sampleRate?
        if (device !== 'default')
            args.concat(["-H", device]);
        if (config.bufSize)
            args = args.concat(["-Z", config.bufSize]);
        //XXX HACK to act like we know we're on Windows
        // because for now, if we're in a browser (where there's no 'process'), we probably are.
        const isWindows = process ? process.platform === 'win32' : true;
        const isMac = process && process.platform === 'darwin';
        if (config.scsynth === 'default' && isWindows) {
            config.scsynth = '../SuperCollider/scsynth';
            sclog("Using our default local scsynth & ugenPluginPath '-U ../SuperCollider/plugins'");
            //Thought (again) about putting ugenPluginsPath in config, sometimes that's also fiddly.
            //*** Especially on other platforms where our default local copies will be the wrong build ...
            //Current expectation is that if you're in Windows and using our local default SC you will use local plugins
            //(for which we can add a hardcoded argument to scsynth)
            //otherwise you'll have SuperCollider + plugins installed (and probably want SC to look in the normal place,
            //by not providing a -U argument, as in useSCDefault)
            args = args.concat(["-U", '../SuperCollider/plugins']);
            //if (process.platform === 'win32') args.push("-U", "..\\SuperCollider\\plugins");
        }
        else {
            if (config.scsynth === 'default' && isMac) {
                config.scsynth = "/Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth";
                args = args.concat(['-Z', 64]);
            }
            sclog(`Either we're not on windows, or we're using non-local scsynth. Using default SC ugenPluginPath (no -U)`);
        }
    })();
    async function startSession() {
        //---> OSCWorker --->
        function initOSCWorker() {
            oscWorker = new Worker('JS/OSCWorker.js');
            W.encodeAndSendOSCBundle = msg => oscPost('encodeAndSendOSCBundle', msg);
            W.encodeAndSendOSCPacket = msg => oscPost('encodeAndSendOSCPacket', msg);
            function oscPost(cmd, oscArgs) {
                oscWorker.postMessage({ command: cmd, args: oscArgs });
            }
            oscWorker.onmessage = e => {
                const d = e.data;
                if (d.log)
                    sclog('[OSCWorker] ' + d.log);
                else if (d.error)
                    sclogE('[OSCWorker] ' + d.error);
                else if (d.osc)
                    processParsedOSC(d.osc);
                else if (d.oscArr)
                    d.oscArr.forEach(processParsedOSC);
                else if (d.connected)
                    SC_initialOSCMessages();
                else if (d.noaudio)
                    noaudio = true;
            };
            //TODO: maybe elsewhere, like preframe?
            Maestro.on("synthUpdate", () => oscWorker.postMessage({ command: 'pollIncomingMessages' }));
            oscWorker.onerror = e => {
                sclogE(`[OSCWorker] error in oscWorker: ${JSON.stringify(e)}`);
            };
            sclog("Requesting newSession from worker...");
            //oscPost('newSession', SC_initialOSCMessages);
            oscPost('newSession'); //will postMessage({connected: true}), then we call SC_initialOSCMessages.
        }
        if (scprotocol === 'ws' && !searchValues.noOscWorker) {
            initOSCWorker();
            setupWsIPC();
        }
        else {
            scsession = await newsession(SC_initialOSCMessages, SC_processOSC);
        }
    }
    ////////////////// Spawn proxy process ////////////////////////
    if (!isNode()) {
        //don't assume that !isNode() means windows server commands.
        //TODO: differentiate how to call in Electron.
        await fetch("/startSCSynth/", { method: "POST" });
        await startSession();
        return;
    }
    ////////////////// Spawn native process ////////////////////////
    (function spawnNative() {
        var spawn = require('child_process').spawn;
        scsynth = spawn(config.scsynth, args);
        sclog(`started '${config.scsynth} ${args.join(' ')}': pid = ${scsynth.pid}`);
        scsynth.on('exit', function (code, signal) {
            //----------> OSCWorker -------->
            sclog("[scsynth]Exit with code " + code + ", '" + signal + "'");
            const logStr = document.getElementById('sclogbox').textContent;
            NW_SC.nodevice = logStr.substr(-400).replaceall('<br />', '').replaceall('[sc=stdout]', '').indexOf("error: 'Device unavailable'") === -1;
            if (NW_SC.nodevice) {
                msgfix('Synths', '<span class="errmsg">Synths cannot run, maybe there is no sound input device connected to the computer.;</span>');
            }
            if (!NW_SC.shuttingDown && !NW_SC.nodevice) {
                sclog("      ---- we didn't intend for scsynth to shutdown, so will attempt to start again...");
                sclog("           If the problem was the TCP port not being ready yet after previous session, this should help");
                sclog("           If there's some other unexpected reason (not expected), it'll mean all of our housekeeping falls apart");
                //NOT TODO: the network connection from lang process. We're somewhat decided on not involving sclang much.
                setTimeout(function () { runProcess(true); }, 2000); //---> review retry attempt...
            }
        });
        scsynth.on('error', function (err) {
            sclog("[scsynth]Error " + err);
        });
        let sessionStarted = false;
        scsynth.stdout.on('data', async function (data) {
            //if (data.indexOf("command FIFO full" !== -1)) //todo something!
            /********/ //---> don't timeout, wait on a promise?
            //first stdout data probably means we're good to go. Seems ok. looking for 'server ready' anyway.
            //may not be reliable across all versions...
            if (!sessionStarted && data.indexOf('server ready') !== -1) {
                await startSession();
                sessionStarted = true;
            }
            sclog('[sc-stdout]' + data);
        });
        scsynth.stderr.on('data', function (data) {
            sclog('[sc-stderr]' + data);
        });
        scsynth.on('close', function (code) {
            //TODO: reset if necessary.
            sclog("scsynth closed with code " + code);
        });
        /********/
        if (!isRetry)
            NW_SC.startWatchingSynthDefBinFiles();
    })();
}
NW_SC.startWatchingSynthDefBinFiles = function () {
    var watchedFiles = [];
    function watchSynthDefBinFile(f) {
        if (!f.endsWith(".scsyndef")) {
            sclog("[scsynth] ignoring file " + f + " because it isn't .scsyndef");
            return;
        }
        sclog("[scsynth] started watching " + f);
        watchedFiles.push(f);
        var name = f.substring(f.lastIndexOf("/") + 1, f.lastIndexOf("."));
        try {
            NW_SC.registerSynthName(name);
        }
        catch (e) {
            sclog("!!!! exception caught in registerSynthName: " + e);
        }
        fs.watchFile(f, { persistent: true, interval: 500 }, function () {
            //would be nice to establish whether the file had really changed, or been recreated the same.
            //can this result in /d_load happening before socket is ready?
            //I think it depends on socket type; might be queued or dropped.
            //Saw some behaviour that seemed a bit bad when some synthdefs were new on start (TCP)...
            //doesn't seem to be reproduced...
            reloadSynthdef(f);
        });
    }
    fs.readdir(synthdefDir, function (err, files) {
        if (err)
            sclog("[sclang] ERROR: " + err);
        for (var i = 0; i < files.length; i++) {
            var f = synthdefDir + "/" + files[i];
            if (fs.statSync(f).isFile())
                watchSynthDefBinFile(f);
        }
    });
    //watch the directory for changes, and add any new files.
    fs.watchFile(synthdefDir, function () {
        fs.readdir(synthdefDir, function (err, files) {
            if (err)
                sclog("[scsynth] ERROR: " + err);
            for (var i = 0; i < files.length; i++) {
                var f = synthdefDir + "/" + files[i];
                if (watchedFiles.indexOf(f) === -1 && fs.statSync(f).isFile()) {
                    sclog("[scsynth] new file: " + f);
                    reloadSynthdef(f);
                    watchSynthDefBinFile(f);
                }
            }
        });
    }, { persistent: true, interval: 500 });
};
function sclangEval(m) {
    if (!sclang)
        return; //==== todo complete browser audio
    //TODO: some check if it's ok. "sclang.connected" is not the right property
    //I just had a bug where config for mac needed to change as they rearranged the SC bundle
    sclog("[sc3>]" + m + "\n");
    //http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
    m = m.split('\n').join(' ');
    //m = "(" + m + ")"; //wrapping string in brackets didn't seem to help much...
    //BUG: "NodeError: Cannot call write after a stream was destroyed"
    //Why was stream destroyed? We should check that. Don't know how to reproduce...
    //for now, I'm not doing connectLangToSynth() as that connection is not used and may be related.
    //NOTE::: special character \x0c to get sclang to actually execute.
    if (sclang.stdin.writable)
        sclang.stdin.write(m + "\n\x0c");
    else
        sclogE("^^^^ sclang.stdin not writable ^^^^");
}
function initSCLangTextarea() {
    var el = $("<textarea cols='60' rows='1'/>");
    var cmdMemory = [], cmdMemIndex = -1, unsubmittedCmd = '';
    el.keydown(function (e) {
        //did have e.ctrlKey for ^enter... for now, just going to use single line input with 'enter'
        if (e.which === 13) {
            var cmd = el.val();
            cmdMemory.push(cmd);
            sclangEval(el.val());
            el.val('');
            unsubmittedCmd = '';
            cmdMemIndex = -1;
            e.preventDefault();
        }
        else if (e.which === 38) {
            //'up' cursor
            if (cmdMemIndex === -1)
                cmdMemIndex = cmdMemory.length;
            if (cmdMemIndex >= 1)
                el.val(cmdMemory[--cmdMemIndex]);
        }
        else if (e.which === 40) {
            //'down' cursor
            if (cmdMemIndex === -1)
                return;
            if (cmdMemIndex >= cmdMemory.length - 1)
                el.val(unsubmittedCmd);
            else
                el.val(cmdMemory[++cmdMemIndex]);
        }
        else {
            //was thinking about storing current half-typed but unsubmitted cmd...
            unsubmittedCmd = el.val();
        }
    });
    var wrap = $("<div><span style='bottom: 5px'>sc3&gt;</span></div>");
    wrap.append(el);
    $('#scLangInput').append(wrap);
}
/* Connecting sclang to scsynth could allow us to use sclang for more musical purposes (not just recompiling SynthDefs)
  I don't believe this method was doing any harm, but at the moment we don't make use of any
  such features, so I'm not using it, and posting a message about it being experimental as a reminder if it does get used.
*/
function connectLangToSynth() {
    sclog("EPXERIMENTAL::: attaching sclang process to scsynth...");
    var cmd = '(\ns = Server.new(\\local, NetAddr("127.0.0.1", ' + TCP_PORT + '), clientID: 1);\n';
    cmd += 's.addr.connect; s.startAliveThread(0);\n)';
    //cmd += 's.doWhenBooted({"sclang connected to scsynth".postln; s.notify; s.initTree });\n)';
    sclangEval(cmd);
    syncThen(function () {
        //sclog("~~~~ NOTE: errors may be reported above (should fix that process)...");
        //sclog("   (in this case, the pudding will be '[scl-stdout]true', a 3 second long 100hz sin wave, etc)");
        //sclangEval("s.serverRunning");
        sclangEval("s.initTree");
        sclangEval("Server.default = s");
        //this'll lead to some confused housekeeping in our JS: (warnings on console, but no harm)
        //sclangEval('Synth("sinGrain", ["dur", 3, "freq", 100, "at", 0.2, "outBus", ' + spatBus + '])');
    });
}
async function runLangProcess() {
    if (!isNode())
        return; //==== todo complete browser audio
    //TODO: any arguments for lang? Can we make it stop winging about *.meta?
    //notice that it logs::
    // compiling class library...
    // NumPrimitives = 644
    // compiling dir: 'C:\code\gold\aaorganicart\SuperCollider\SCClassLibrary'
    // compiling dir: 'C:\Users\Peter\AppData\Local\SuperCollider\Extensions'
    //---> that last line should be discouraged.
    let langPath = config.sclang;
    if (langPath === 'default') {
        if (process.platform === 'darwin')
            langPath = "/Applications/SuperCollider/SuperCollider.app/Contents/Resources/sclang";
        if (process.platform === 'win32')
            langPath = "C:/Program Files/SuperCollider-3.10.3/sclang.exe"; //pending...
        else {
            sclog(`Please specify path to sclang executable in scconfig.json`);
            return;
        }
    }
    if (!require('fs').existsSync(langPath)) {
        sclog(`Not starting sclang, not found at '${langPath}'. Never mind.`);
        usingSCLang = false;
        return;
    }
    usingSCLang = true;
    sclang = require('child_process').spawn(langPath); //
    sclog(`started sclang '${langPath}': pid = ${sclang.pid}`);
    sclang.on('exit', function (code, signal) {
        sclogE("[sclang]Exit with code " + code + ", '" + signal + "'");
    });
    sclang.on('error', function (err) {
        sclogE("[sclang]Error " + err);
    });
    sclang.stdout.on('data', function (data) {
        if (data.toString().indexOf('ERROR:') !== -1)
            sclogE('[scl-stdout]' + data);
        else
            sclog('[scl-stdout]' + data);
    });
    sclang.stderr.on('data', function (data) {
        if (data.toString().indexOf('.*meta') !== -1)
            sclog('[scl-stderr]' + data);
        else
            sclogE('[scl-stderr]' + data);
    });
    //var sdDir = synthdefDir.replace(/\\/g, "/");
    sclangEval("SynthDef.synthDefDir = \"" + synthdefDir + "\".standardizePath;");
    sclangEval("SynthDef.synthDefDir;");
    //TODO: sort out SynthDesc stuff (necessary for Pbind)
    //SynthDescLib.global.read("synthdefs/default.scsyndef");
    //SynthDescLib.global.synthDescs.at(\default)
    //SynthDescLib.global.at(\default) // shortcut, same as line above
    (async function startWatchingSynthDefSourceFiles() {
        //recompile any synthdef sources that were modified since the latest binary was modified....
        var watchedFiles = [];
        function watchSourceFile(f) {
            sclog("[sclang] started watching " + f);
            watchedFiles.push(f);
            fs.watchFile(f, { persistent: true, interval: 500 }, function () {
                recompile(f);
            });
        }
        /* //not using this so far, not sure if we'll really want it. Maybe do, for defining a dictionary of helper fns?
         var startup = "SuperCollider-3.6.5/startup.sc"; //TODO: make this less hardcoded.
         recompile(startup);
         watchSourceFile(startup);
         */
        var latestmtime = Number.MIN_VALUE;
        var binfiles = fs.readdirSync(synthdefDir);
        for (var i = 0; i < binfiles.length; i++) {
            latestmtime = Math.max(fs.statSync(synthdefDir + '/' + binfiles[i]).mtimeMs, latestmtime);
        }
        var srcfiles = fs.readdirSync(synthdefSrcDir);
        for (i = 0; i < srcfiles.length; i++) {
            var file = synthdefSrcDir + '/' + srcfiles[i];
            watchSourceFile(file);
            //TODO: fix this bit, I don't think it's working
            // sjpt 8 Feb 19.  There was a mix of mtime/lastmtime showing up as character or number
            // Also slight time inconsistencies that meant files saved at almost the same time
            // seemed to have wrong order of mtime/lastestmtime.
            // 19.1 ms out in one example for me, 100 ms below is somewhat arbitrary,
            // but should still be safe against 'real' time differences.
            var fss = fs.statSync(file);
            if (fss.isDirectory())
                continue; // directory times erratic after copy/sync etc
            var mtime = fss.mtimeMs;
            if (mtime - latestmtime > 100)
                recompile(file);
        }
        fs.watchFile(synthdefSrcDir, function (curr, prev) {
            fs.readdir(synthdefSrcDir, function (err, files) {
                if (err)
                    sclog("[sclang] ERROR: " + err);
                for (let ii = 0; ii < files.length; ii++) {
                    var f = synthdefSrcDir + "/" + files[ii];
                    if (watchedFiles.indexOf(f) === -1 && fs.statSync(f).isFile()) {
                        sclog("[sclang] new file: " + f);
                        recompile(f);
                        watchSourceFile(f);
                    }
                }
            });
        }, { persistent: true, interval: 500 });
        //This *IS NOT RIGHT* yet, and I should *not* be thinking about things like this at time of writing...
        //Will be relevant for checking different versions of scsynth etc. Also if I have a purge on rubbish SynthDefs.
        //If/when I get back to this, I should remember to beware of how watchers above are effected
        //(src and bin watchers should be stopped at start, then restarted at end)
        // NW_SC.cleanSynthdefBuild = async () => {
        //     sclog("TODO:  ################## cleanSynthdefBuild ###################");
        //     return;
        //     await (async (resolve, reject) => {
        //         let remainingBinaries = binfiles.length;
        //         binfiles.forEach(f => {
        //             sclog(`deleting ${f}...`)
        //             fs.unlink(synthdefDir + '/' + f, err => {
        //                 if (err === undefined) {
        //                     if(--remainingBinaries === 0) resolve();
        //                 } else {
        //                     sclog(err);
        //                     reject(err);
        //                 }
        //             });
        //         });
        //     })();
        //     await ( async (resolve, reject) => {
        //         srcfiles.forEach(recompile);
        //         //will return before they're finished, hey-ho.
        //     })();
        // }
    })();
    initSCLangTextarea();
}
function recompile(file) {
    //write "(\""+ filePath.replace('\\', '/') + "\".standardizePath).load\n" to sclang.stdin
    showSCLog(true);
    sclog("[sclang] >> recompiling " + file);
    sclangEval("(\"" + file.replace(/\\/g, "/") + "\".standardizePath).load");
    //separate watcher on scsyndef files will reloadSynthDef from there.
}
let d_loadsPending = 0, d_loadActions = [];
function reloadSynthdef(path) {
    const name = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
    sclog("[scsynth] >> /d_load " + path + " (" + name + ")");
    d_loadsPending++;
    //if (name === '') sclogE('EMPTY NAME ** BEFORE ** CALLBACK');
    //syncThen( ()=>writeOSC("/d_load", path) ); // what would that do about OSCBundle?
    writeOSC("/d_load", path);
    on("/done", function (msg) {
        if (msg.args[0] !== "/d_load")
            return false; //return false means we're not done (might try to revise Maestro design...)
        if (name === '')
            sclogE('EMPTY NAME ** IN ** CALLBACK'); ////
        //can't work out why this is being inconsistent...
        //but then again, if anything should be deferred further, this should:
        NW_SC.queryControlNamesForSynthName(name); //XXX: name === ""
        if (!d_loadsPending)
            throwe("We got more '/done /d_load' callbacks than expected (or some other unwanted side effects took place...)");
        //still using a setTimeout to try to mitigate the effect of receiving /done messages before all /d_loads have gone out. (I think that was the problem)
        //XXX: this should be reviewed... promises, promises...
        setTimeout(function () {
            --d_loadsPending;
            const synArr = synthsByType[name];
            if (synArr && synArr.length) {
                sclog("[scsynth] /done /d_load.... queuing up reloads of " + synArr.length + " " + name + "s");
                const action = function (s) {
                    //sclog(name + ", " + s.length);
                    for (let i = 0; i < s.length; i++)
                        s[i].reload();
                };
                d_loadActions.push(function () {
                    action(synArr);
                });
            }
            if (d_loadsPending === 0) {
                flashSCConsole();
                sclog("[scsynth] All pending \"/done /d_load\" messages received; start reloading synths");
                for (let i = 0; i < d_loadActions.length; i++)
                    d_loadActions[i]();
                d_loadActions = [];
            }
            return true;
        }, 1000);
        return true;
    });
}
var usingSC = false, usingSCLang = false, noaudio = false;
window.addEventListener('beforeunload', stopSC);
var startSC = function () {
    if (staticAudio || noaudio || oxcsynth)
        return; // no synth
    //clearLog(true);
    usingSC = true;
    // allocate at start, helps (but does not fix) restart
    freeNodeIDs = new TIntPool(MAX_NODES, 1000, "Synth / group node id allocator");
    SCBus.prototype.busAllocator = freeBusses = new TIntPool(512 - 16, 16, "SCBus allocator.");
    //SCKbus.prototype
    freeBufs = new TIntPool(512, 0, "Buf id allocator");
    freeSyncIDs = new TIntPool(128, 0, "Sync id allocator");
    soundFileCache = {}; //we'll make some assumptions for now that these won't be messed with behind our back...
    synths = {}; //new Map<number, Tid>();// {}; //even though I make this a Map, I'm using it as {} - no entries etc...
    synthsByType = {}; //new Map<string, [Tid]>();
    oscCallbacks = {}; //new Map<string, [any]>();    //associates expected responses (/status.reply, /done, /n_info etc) with arrays of functions(msg),
    //to be removed on execution if they return true.
    sclog('startSC at ' + new Date());
    //// osc = require('osc-min');
    // on("/fail", function (msg) {
    //     sclog("[scsynth] /fail: " + msg.args[0] + ", " + msg.args[1]);
    // });
    //TODO: change config mechanism, tend to use default install location...
    var specialConf = './scconfigOverride.json';
    var hasOverride = getfiledata(specialConf, true); //second argument to allow for the file probably being missing
    config = JSON.parse(hasOverride || getfiledata('./scconfig.json'));
    sclog(`using scconfig: ${JSON.stringify(config)}`);
    if (!config) {
        sclog("no config file, skipping audio");
        return; //serious("no config!");
    }
    runProcesses();
};
var scsession;
//only used with 'ws' protocol (in browser) at present.
//should ideally make Electron/nw bits share server code, and communicate differently.
let ipcWS;
function setupWsIPC() {
    const ws = new WebSocket('ws://localhost:' + WS_IPC_PORT, 'binary');
    ipcWS = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
        sclog('opened WebSocket for IPC');
        Maestro.trigger('IPCstarted');
    };
    ws.onmessage = (msgEvent) => {
        try {
            const data = msgEvent.data;
            const msg = osc.readPacket(data, {}, 0);
            if (msg.address === '/oa/reloadSynthdef') {
                reloadSynthdef(msg.args[0]);
            }
            if (msg.address === '/oa/newTadmus') {
                sclog('---- newTadmus event on client ----');
                Maestro.trigger('newHornSynth'); //should be more forceful?
            }
        }
        catch (e) {
            sclogE(`error parsing IPC data as OSC: '${e}'`);
        }
    };
}
let ipcSend = (msg) => {
    if (!ipcWS)
        return;
    ipcWS.send(osc.writePacket(msg));
};
async function newsession(initialOSCMessages, i_processOSC) {
    let tcpconnectFail = 0;
    function processOSC(data) {
        try {
            i_processOSC(data);
        }
        catch (err) {
            //XXXXX:::: it used to be that the only known error case here was malformed TCP data.
            //we may now also send error strings, in particular socket errors are just sent as strings.
            //serious("processOSC error", err);
            // this will usually be caught by data length,
            // but may be caught here where there is bad data but length happens to be in range
            //what makes us think that starting (countless) newtcp will help??!
            sclogE(":::: Server output not (valid) OSC.  Could be an error message from proxy, or malformed TCP from scsynth?");
            sclogE(`"${err}"`);
            sclogE(`"${new TextDecoder('utf-8').decode(data)}"`);
            //W.scConsole.classList.add('sc-networkLost');
            //return newtcp("error trying to interpret data as OSC: \"" + err + "\"");
        }
    }
    var session = {};
    session.bufferSize = 10000; //PJT: I infer that the '10000' used in various places could be well represented this way...
    if (scprotocol === 'udp') {
        // remote.require can help in electron
        // but the various other async setTimeouts seem to have helped more
        udp = (remote && false ? remote.require : require)('dgram').createSocket('udp4');
        scsender = udp;
        udp.on('message', onudpdata);
        udp.on('error', function (ex) {
            //serious("UDP ERROR: " + ex);
            sclog("UDP ERROR: " + ex);
        });
        //setTimeout(initialOSCMessages, 100);
        initialOSCMessages(); // too soon after tcpconnect if doesn't work at once, maybe need delay for udp as well ???
    }
    else if (scprotocol === 'tcp') {
        tcpconnect(initialOSCMessages);
        session.tcpbuffer = new Uint8Array(session.bufferSize);
        session.tcpbuffer.pos = 0;
    }
    else if (scprotocol === 'ws') {
        setupWsIPC();
        for (let ttry = 0; ttry < 10; ttry++) {
            scsender = wssender = new WebSocket('ws://localhost:' + WS_PORT, 'binary');
            wssender.binaryType = 'arraybuffer';
            wssender.onopen = initialOSCMessages;
            wssender.onmessage = wsdata;
            wssender.type = 'ws';
            session.tcpbuffer = new Uint8Array(session.bufferSize);
            session.tcpbuffer.pos = 0;
            for (let ttry2 = 0; ttry2 < 100; ttry2++) {
                await sleep(1);
                if (wssender.readyState !== wssender.CONNECTING)
                    break;
                else
                    log('wssender still connecting');
            }
            if (wssender.readyState === wssender.OPEN) {
                log('wssender opened ok');
                break;
            }
            else {
                log('wssender status wrong', wssender.readyState);
            }
        }
    }
    else {
        serious('invalid protocol', scprotocol);
    }
    function wsdata(msg) {
        tcpdata3(msg.data);
    }
    // Some issues about how to call tcpreadall
    // on readable sometimes locks up, and the unshift sometimes seems to cause infinite recursion.
    // This setTimeout works quite well.
    // Might be better to use on data and do the extra work for package assembly.
    //
    // Runs often end with length out of range,
    // presumably because of internal ipc corruption???
    /** read all outstanding complete tcp osc messages */
    function tcpreadallOld() {
        //log("read");
        while (true) {
            var lbuf = tcpSocket.read(4);
            if (lbuf === null)
                break;
            var l = lbuf.readInt32BE(0);
            if (l < 0 || l > session.bufferSize) {
                // this should not happen, usually seems to be in extreme case
                // the newtcp patchup should recover things, but some messages will have been lost
                //////
                sclogE(`############ give up hope #############`);
                return newtcp("tcpreadallOld length out of range: " + l);
            }
            var data = tcpSocket.read(l);
            if (data === null) {
                tcpSocket.shifts++;
                tcpSocket.unshift(lbuf);
                break;
            }
            if (tcpSocket.shifts > 4)
                log("tcpSocket.shifts ", tcpSocket.shifts);
            tcpSocket.shifts = 0;
            processOSC(data);
        }
        setTimeout(tcpreadallOld, 10);
    }
    /** read not in callback, then do assembly etc work in function readfun */
    function tcpreadall(readfun) {
        var data = tcpSocket.read();
        if (data !== null)
            readfun(data);
        setTimeout(function () { tcpreadall(readfun); }, 10);
    }
    /** add data to a buffer. If there isn't enough space, make a new buffer big enough... */
    function bufadd(buff, data) {
        buff.pos = buff.pos || 0;
        if (buff.pos < 0)
            serious("buff.pos -ve", buff.pos);
        var newpos = buff.pos + data.length; // length after concat
        if (newpos > buff.length) {
            //??sclog(`expanding tcp buffer to ${newpos} (was ${buff.length})`);
            //??session.bufferLimit = newpos;
            var temp = new Uint8Array(newpos);
            // buff.copy(temp, 0, 0, buff.pos);
            temp.set(buff);
            temp.pos = buff.pos;
            buff = temp;
        }
        //data.copy(buff, buff.pos);
        // NO data.set(buff, buff.pos);
        buff.set(data, buff.pos);
        buff.pos = newpos;
        return buff;
    }
    var timeoutorder = { out: 0, in: 0, err: 0 };
    var tcphist = [];
    /** add new data and extract packets from tcp stream,
    method 2 uses buffer copying but much less allocation */
    function tcpdata2(data) {
        //log("in tcpdata2");
        tcphist[udpStats.receivedCalls % 10] = data; // help to review history
        udpStats.receivedCalls++;
        udpStats.receivedBytes += data.length;
        session.tcpbuffer = bufadd(session.tcpbuffer, data);
        var pos = 0;
        while (pos < session.tcpbuffer.pos) {
            var dv = new DataView(session.tcpbuffer.buffer);
            var l = dv.getInt32(pos); //data starts with an int for message length
            //nb, limit here was 100000
            if (l < 0 || l > 5000000) { // limit is debug test to capture parsing errors early and not try to read silly lengths of data
                sclog(`WARNING::: tcpdata2 deranged length (${l}), but we're going to attempt to plow on...`);
                //editing synthdefs with a lot of active synths often does it...
                //I should try to throttle messages before restarting connection or something
                //maybe timeout or promises here could help
                //may need to consider more drastic measures (or just limiting calls to newtcp)
                return newtcp("tcpdata2 length out of range: " + l);
            }
            if (pos + 4 + l <= session.tcpbuffer.pos) {
                var pac = session.tcpbuffer.slice(pos + 4, pos + 4 + l);
                //is it possible for pac to be undefined here?  Buffer overrun? (or did I think it was undefined because of devtools scope confusion)
                processOSC(pac);
                pos += 4 + l;
            }
            else {
                break; //we still haven't got the whole packet
            }
        }
        // shift remaining partial packet to start
        var newpos = session.tcpbuffer.pos - pos;
        if (newpos !== 0 && pos !== 0) {
            //session.tcpbuffer.copy(session.tcpbuffer, 0, pos, session.tcpbuffer.pos);
            session.tcpbuffer.copyWithin(0, pos, pos + newpos);
        }
        session.tcpbuffer.pos = newpos;
    }
    /** safer? async tcpdata2 */
    function tcpdata3(xdata) {
        //log("in tcpdata3");
        var data = new Uint8Array(xdata); // not sure if copy is needed
        deferuow(function tcpdata2_deferred() {
            tcpdata2(data);
        });
    }
    /** set up tcp connection then do initial messages */
    function tcpconnect(initmessfun) {
        tcpconnectFail = 0;
        tcpconnectin(initmessfun);
    }
    function tcpconnectin(initmessfun) {
        if (noaudio)
            return;
        var net = require('net');
        tcpSocketid++;
        tcpSocket = net.connect(TCP_PORT, 'localhost', tcpconnectComplete);
        tcpSocket.on('error', function () {
            if (!NW_SC.nodevice) {
                log('retry tcpconnection', tcpconnectFail++);
                sclog('retry tcpconnection ' + tcpconnectFail);
                if (tcpconnectFail > 10)
                    noaudio = true;
                setTimeout(function () { tcpconnectin(initmessfun); }, 500);
            }
        });
        function tcpconnectComplete() {
            sclog("tcp connected on port " + tcpSocket.localPort + "<->" + tcpSocket.remotePort);
            scsender = tcpSocket;
            //    tcpSocket = new net.Socket({type: 'tcp4', allowHalfOpen: false });
            tcpSocket.on("error", function (err) {
                sclog("TCP Error: \"" + err + "\"");
                console.error("TCP Error: \"" + err + "\"");
            });
            // experimental code below to see which is the most realiable way to read the data.
            // any option should be ok, but ...???
            // as it is, they all seem pretty good but none seems quite 100%
            ///PJT:::: "not quite 100%"" is meaning quite bad at times (not in exhibition runtime fingers crossed)...
            var xxx = '3';
            if (xxx === '1') {
                //tcppending = undefined;
                //tcpSocket.on('data', tcpdata);
            }
            else if (xxx === '2') {
                tcpSocket.on('data', tcpdata2);
            }
            else if (xxx === '3') {
                tcpSocket.on('data', tcpdata3);
            }
            else if (xxx === "allold") {
                tcpSocket.shifts = 0;
                setInterval(tcpreadallOld, 10);
            }
            else if (xxx === "all2") {
                tcpSocket.pause();
                tcpreadall(tcpdata2);
            }
            else if (xxx === "all3") {
                tcpSocket.pause();
                tcpreadall(tcpdata3);
            }
            else {
                serious("bad value for xxx");
            }
            //    tcpSocket.connect(TCP_PORT, 'localhost', function() {
            //        sclog("tcp connected on port " + tcpSocket.localPort + "<->" + tcpSocket.remotePort);
            //    });
            if (initmessfun)
                initmessfun();
        }
    }
    /** get a new tcp connection */
    function newtcp(reason) {
        console.error("restarting tcp: reason: " + reason);
        sclog("requesting new tcp socket, reason: " + reason);
        tcpSocket.destroy(); //
        tcpconnect(function renotify() {
            writeOSC("/notify", 1);
            sclog("tcp socket running");
        });
    }
    function onudpdata(xdata) {
        // this could happen if xdata already corrupted
        //XXX: or if there was a genuinely long message, like a buffer read. (or the result of querying all synth params at startup)
        //UDP is currently a bit broken for other reasons, but made this limit much longer which helps somewhat. (was 10000)
        if (xdata.length > 1000000 || xdata.length < 0) {
            serious('overlong processOSC data ignored, l=' + xdata.length);
            return;
        }
        var data = new Buffer(xdata); // make safe copy asap, Buffer ok for UDP
        processOSC(data);
        // do most of the work in separate work unit
        // to reduce risk of inappropriate things happening in the wrong place
        setTimeout(udpdprocessOSC, 0);
        function udpdprocessOSC() { processOSC(data); } // defer real work and return asap
    }
    return session;
} // newsession
// stop the current Synth (and clean up ???)
var stopSC = function () {
    if (!usingSC)
        return;
    if (scRecorder)
        stopAudioRecording();
    NW_SC.shuttingDown = true;
    writeOSC('/quit');
    if (usingSCLang) {
        var os = require('os');
        var isWin = /^win/.test(os.platform());
        if (!isWin)
            sclang.kill('SIGHUP');
        else
            sclang.kill();
    }
    freeNodeIDs = freeBusses = freeBufs = soundFileCache = synths = synthsByType = undefined;
};
// restart synth in case of emergency
// NOT reliable yet
function restartSC() {
    stopSC();
    setTimeout(startSC, 1000);
}
function globalSynthUpdate() {
    if (synths === undefined)
        return; // stopped
    startOSCBundle();
    Maestro.trigger("synthUpdate");
    flushOSCBundle(true);
}
var setMasterVolume = function (v) {
    if (v === undefined)
        v = trygeteleval("masterVolume");
    if (master) {
        master.setParm("db", v);
        W.masterVolume.value = master.parms.db;
    }
};
function showSCLog(v) {
    if (v === undefined)
        setInput(W.doShowSCLog, true);
    document.getElementById("scConsole").style.display = v ? "block" : "none";
    sclog("showSCLog " + v + " @ " + new Date());
}
function toggleSCLog() {
    setInput(W.doShowSCLog, !trygetele("doShowSCLog", "checked"));
}
var gsynthcopy;
var debuglastReloadTried;
function reloadAllSynths() {
    var n = Object.keys(synths).length;
    //    if (n > 32) {
    //        // restartSC();
    //        setTimeout(reloadAllSynths, 500);
    //        sclog("!!!! Too many synths " + n + " Reloading all synths DEFERRED AT " + new Date());
    //        return;
    //    }
    for (var s in synths) {
        var sy = synths[s];
        if (s !== sy.id * 1) {
            //Is there any reason to believe this could ever happen?
            sclog("???? potentially bad housekeeping encountered in reloadAllSynths ????");
            sclog("Synth duplicate, waiting for /n_end, n_go or cleanupSynthIDs before reloading " + s + " != " + sy.id + " type=" + sy.type);
            //delete synths[s];
            //freeNodeIDs.unclaim(s);
            syncThen(function () {
                cleanupSynthIDs(reloadAllSynths);
            });
            //setTimeout(reloadAllSynths, 1000);
            return;
        }
    }
    debuglastReloadTried = new Date();
    sclog("Reloading all " + n + " synths " + new Date());
    if (!gsynthcopy) {
        gsynthcopy = {};
        for (s in synths) {
            if (synths[s].autoReload)
                gsynthcopy[s] = synths[s];
        }
    }
    for (var k in gsynthcopy)
        gsynthcopy[k].reload();
    syncThen(cleanupSynthIDs);
}
var logSCStatusWarning = false;
function setLogSCStatusWarning(v) {
    if (v === undefined)
        v = trygetele("logStatWarning", "checked");
    sclog("logSCStatusWarning " + v + " " + new Date());
    logSCStatusWarning = v;
}
/** perform the initial sending of messages to scsynth to get that started properly,
 * and then inform anyone waiting on scReadyFunc
 */
function SC_initialOSCMessages() {
    sclog("initial OSC...");
    //writeOSC("/dumpOSC", 1);
    writeOSC('/status'); //newer version support '/version' query which looks sensible.
    var lastWarningTime = Date.now();
    statusInterval = setInterval(function statusIntervalFun() {
        if (noaudio) {
            clearInterval(statusInterval);
            return;
        }
        var t = Date.now();
        var dt = scstatus ? t - scstatus.statusTime : 0;
        if (logSCStatusWarning && dt > 5000) {
            if (t - lastWarningTime > 5000) {
                lastWarningTime = t;
                sclog("WARNING::: No /status.reply for " + dt / 1000 + " seconds.");
                dumpSCStatus();
            }
        }
        writeOSC('/status');
    }, 1000);
    on("/status.reply", function () {
        sclog("Initial /status.reply received, setting up... " + new Date());
        on("/done", function (msg) {
            if (msg.args[0] === "/notify") {
                sclog("/done /notify :::: Server should now notify us of relevant events");
                return true;
            }
        });
        if (scprotocol === "tcp")
            writeOSC("/notify", tcpSocketid);
        else
            writeOSC("/notify", 1); // ??? todo verify this, but 0 won't do
        writeOSC("/d_loadDir", synthdefDir);
        on("/done", function (msg) {
            if (msg.args[0] !== "/d_loadDir")
                return false;
            //TODO: un-hardcode this stuff... soon(TM)...
            //master = new Synth("MasterCompander", ["amp", 1, 'db', -200], { addAction: ADD_TAIL });
            master = new Synth("MasterCompander", [], { addAction: SCAddAction.AddTail });
            freeverb = new Synth("FreeVerb", ["damp", 0.1, "room", 0.9]);
            new VUMeter2();
            //spat = new Synth("spatStereoDopC", ["bus", spatBus, "pan", 0, "distance", 3]);
            //spat = new SpatNode();
            //spatBus = spat.bus;
            sclog("Hello audio...");
            // playChimes(Date.now());
            //this is not really used, not problematic AFAIK, but eliminates a source of potential confusion not doing it.
            // Consider revisit if I want to really use sclang eg for PBind lib... but that's a big change anyway.
            //connectLangToSynth();
            NW_SC.queryControlNamesForAllSynthNames();
            if (scReadyFunc)
                scReadyFunc();
            return true;
        });
        return true;
    });
}
// function setAlwaysOnTop(v) {
//     require("nw.gui").Window.get().setAlwaysOnTop(v);
// }
function playChimes(timetagStart) {
    var b = 15; //spatBus; //XXX
    if (timetagStart) {
        var t = timetagStart;
        //startOSCBundle();
        //TODO:
        //timetags not really working at the moment it seems... wrong number format?
        //^^ think I fixed that? although bundles & multiple timetags probably wrong.
        new Synth("sinGrain", ["dur", 1, "freq", 200, "at", 0.05, "outBus", 0], t);
        new Synth("sinGrain", ["dur", 2, "freq", 400, "at", 0.05, "outBus", 1], t + 300);
        new Synth("sinGrain", ["dur", 2, "freq", 600, "at", 0.05, "outBus", b], t + 600);
        new Synth("sinGrain", ["dur", 0.2, "freq", 800, "at", 0.05, "outBus", b], t + 650);
        new Synth("sinGrain", ["dur", 0.2, "freq", 1200, "at", 0.05, "outBus", b], t + 700);
        new Synth("sinGrain", ["dur", 0.2, "freq", 1600, "at", 0.05, "outBus", b], t + 750);
        new Synth("sinGrain", ["dur", 0.5, "freq", 1800, "at", 0.05, "outBus", b], t + 750);
        //flushOSCBundle();
    }
    else {
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 1, "freq", 200, "at", 0.05, "outBus", 0]);
        }, 0);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 2, "freq", 400, "at", 0.05, "outBus", 1]);
        }, 300);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 2, "freq", 600, "at", 0.05, "outBus", b]);
        }, 600);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 0.2, "freq", 800, "at", 0.05, "outBus", b]);
        }, 650);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 0.2, "freq", 1200, "at", 0.05, "outBus", b]);
        }, 700);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 0.2, "freq", 1600, "at", 0.05, "outBus", b]);
        }, 750);
        setTimeout(function () {
            new Synth("sinGrain", ["dur", 0.5, "freq", 1800, "at", 0.02, "outBus", b]);
        }, 750);
    }
}
function RandomMono() {
    this.synth = new Synth("mono2", ["bus", 0]);
    this.hold = 80;
    this.scale = [0, 1, 3, 5, 7];
    this.period = 200;
    this.octaves = 2;
    this.basePitch = 30;
    this.finished = false;
    var mtof = function (p) {
        return 440 * Math.pow(2, (p - 69) / 12);
    };
    var r = this;
    var chooseNote = function (base, octaves) {
        var i = Math.floor(Math.random() * r.scale.length);
        return base + r.scale[i] + 12 * (Math.floor(Math.random() * octaves));
    };
    /*
     this.interval = setInterval(function() {
     synth.setParm("freq", mtof(chooseNote(30,2))); synth.setParm("gate", 1);
     setTimeout(function(){synth.setParm("gate", 0);}, hold);
     }, period); */
    this.setPeriod = function (ms) {
        r.period = ms;
        clearInterval(this.interval);
        r.interval = setInterval(r.makeNote, r.period);
    };
    this.makeNote = function () {
        r.synth.setParm("freq", mtof(chooseNote(r.basePitch, r.octaves)));
        r.synth.setParm("gate", 1);
        setTimeout(function () {
            r.synth.setParm("gate", 0);
        }, r.hold);
        return r.finished;
    };
    this.stop = function () {
        r.finished = true;
        return true;
    };
    this.skipNextMeasure = function () {
        Maestro.on("measure", function () {
            r.stop();
            Maestro.on("measure", r.start);
            return true;
        });
        return true;
    };
    this.skipNextBar = function () {
        Maestro.on("bar", function () {
            r.stop();
            Maestro.on("bar", r.start);
            return true;
        });
        return true;
    };
    this.start = function () {
        r.finished = false;
        Maestro.on("beat", r.makeNote);
        return true;
    };
    Maestro.start();
    this.start();
    //this.setPeriod(this.period);
    //return { interval: interval, synth: synth };
}
function dumpTree() {
    writeOSC("/g_dumpTree", [0, 1]);
}
function cleanupSynthIDs(funafter) {
    /*
     var rejects = [];
     for (var k in synths) {
     if (synths[k].id !== k) {
     //if this is the case, we expect the addAction to be 4 (ADD_REPLACE) and addTarget to be k
     //we also expect an identical synth to be at synths[s.id]
     var s = synths[k];
     if (s.addAction !== ADD_REPLACE)
     }
     }
     */
    sclog("cleanupSynthIDs() called... >>> YMMV <<<");
    on("/g_queryTree.reply", function (msg) {
        //sclog("[scsynth] /queryTree.reply for cleanupSynthIDs  @ " + new Date());
        var tree = {};
        var i = 0;
        var args = msg.args;
        var controls = args[i++] === 1;
        tree.rootNode = args[i++];
        if (tree.rootNode !== 0)
            return false;
        var children = args[i++];
        var serverIDs = [];
        for (var j = 0; j < children; j++) {
            var nID = args[i++];
            serverIDs.push(nID);
            //note that maybe my synths[id] should really be nodes[id]
            //TODO: note if we encounter a group here and want to expand the entire tree,
            //I believe it will be necessary to make a recursive call to /g_queryTree...
            //would be handy if there was a way of querying this information in JSON format or something.
            var isSynth = args[i++] === -1;
            var n = tree[nID] = {};
            if (!isSynth)
                n.type = "group";
            if (isSynth) {
                n.type = args[i++];
                if (nID >= 0) {
                    if (!synths[nID])
                        sclog("[scsynth] found unexpected synth node #" + nID + " (" + n.type + ") in /queryTree.reply");
                    else if (synths[nID].type !== n.type)
                        sclog("[scsynth] ---- found synth type mismatch: we thought #" + nID + " was '" + synths[nID].type + "' not '" + n.type + "' ----");
                    else if (synths[nID].id !== nID)
                        sclog("[scsynth] found synth load oddity" + nID + " !='" + synths[nID].id);
                    //else sclog("[scsynth] #" + nID + " is '" + n.type + "' as expected.");
                }
                //controls will always be false in this context, but leaving in parsing logic for when I want it.
                if (controls) {
                    n.parms = {};
                    var numControls = args[i++];
                    for (var k = 0; k < numControls; k++) {
                        var ctrlName = args[i++];
                        var ctrlVal = args[i++];
                        if (ctrlVal.match(/^[ac]\d+$/))
                            sclog(`found control bus mapping symbol ${ctrlVal} for ${ctrlName} of ${n.type}...`);
                        n.parms[ctrlName] = ctrlVal; //could be something like "a17" for bus mapping
                    }
                }
            }
        }
        //remove nodes from synths where their key isn't in ids
        //trouble is that we don't put nodes back in if they get removed a bit early for example...
        //I'm not really convinced this helps...
        var t = Date.now() - 10000; // allow 10 secs to get things right
        var rejects = [];
        for (let kk in synths) {
            const kn = Number.parseInt(kk);
            if (serverIDs.indexOf(kn) === -1 && synths[kk].loadRequestTime < t)
                rejects.push(kk);
        }
        sclog("cleanupSynthIDs ids found=" + serverIDs.join(", "));
        if (rejects.length === 0) {
            sclog("clean synths setup found on cleanupSynthIDs");
        }
        else {
            sclog("[scsynth] removing [" + rejects.join(", ") + "] from synths that didn't have corresponding nodes on server");
            for (i = 0; i < rejects.length; i++) {
                var r = rejects[i];
                var synth = synths[r];
                sclog("[scsynth] remove old synth " + r + "replaced by " + synth.id);
                if (synths[r] !== synths[synth.addTarget] || synth.confirmedStartOn)
                    sclog("[scsynth] >>>>>>>>> unexpected state " + JSON.stringify(synth));
                freeNodeIDs.unclaim(r); // could be folded into removeSynthIDRef???
                //WTF: not sure why this is 'true'
                synth.confirmedStartOn = true; // could be folded into removeSynthIDRef???
                removeSynthIDRef(r);
            }
        }
        if (funafter)
            funafter();
        return true;
    });
    writeOSC("/g_queryTree", [0, 0]);
}
function processStatusReply(msg) {
    scstatus = {
        statusTime: new Date(),
        nUgens: msg.args[1],
        nSynths: msg.args[2],
        nGroups: msg.args[3],
        nSynthDefs: msg.args[4],
        cpuAvg: msg.args[5],
        cpuPeak: msg.args[6],
        nominalSR: msg.args[7],
        actualSR: msg.args[8]
    };
    /***
    $('#scCPU').html((Math.round(100 * scstatus.cpuAvg) / 100).toFixed(2) + '%');
    $('#scNSynths').html(scstatus.nSynths);
    $('#scNUgens').html(scstatus.nUgens);
    $('#scNGroups').html(scstatus.nGroups);
    $('#scUDPDelay').html((Math.round(100 * udpStats.meanSendDelay) / 100).toFixed(2) + 'ms');
    ***/
    W.scCPU.innerHTML = (Math.round(100 * scstatus.cpuAvg) / 100).toFixed(2) + '%';
    W.scNSynths.innerHTML = (scstatus.nSynths);
    W.scNUgens.innerHTML = (scstatus.nUgens);
    W.scNGroups.innerHTML = (scstatus.nGroups);
    W.scUDPDelay.innerHTML = ((Math.round(100 * udpStats.meanSendDelay) / 100).toFixed(2) + 'ms');
}
function processNEnd(msg) {
    var id = msg.args[0];
    // sclog('/n_end: ' + id);
    // sclog(JSON.stringify(synths[id]));
    if (freeNodeIDs)
        freeNodeIDs.unclaim(id); //be careful of unbalanced claiming / unclaiming...
    //^^^^^^^^^^^^^^^^ check this ^^^^^^^^^^^^^^^//
    removeSynthIDRef(id); //and this... 2020
}
function processBadValue(msg) {
    var type = msg.args.length <= 2 ? -1 : msg.args[2];
    var typeStr;
    switch (type) {
        case 0:
            typeStr = "normal";
            break; //not expected
        case 1:
            typeStr = "NaN";
            break;
        case 2:
            typeStr = "inf";
            break;
        case 3:
            typeStr = "denormal";
            break; //not expected
        default:
            typeStr = 'unexpected: ' + type;
    }
    if (type === 3 || type === -1) // sclog("denormal ignored...");
        return; //we don't care about denormals, thanks.
    var id = msg.args[0];
    var synth = synths[id];
    if (synth) {
        if (synth.id === id) {
            sclogE(`[scsynth] --------------- bad value (${typeStr}) on ${synth.mutID || synth.type} #{id} @${new Date()}`);
            sclog(`SendReply values: [${msg.args.join(', ')}]`);
            sclog("synth.parms at time of noticing this : " + JSON.stringify(synth.parms));
            if (NW_SC.dumpStatusOnBadVal) {
                dumpSCStatus(`shortly after detecting ${typeStr}`);
            }
            if (NW_SC.autoreloadSynthsOnBadValue) {
                synth.reload();
            }
        } // else sclog("[scsynth] ------------- bad value on " + synth.type + " #" + id +" that already appears to be reloading");
    }
    else
        sclog("[scsynth] ------ badValue on synth #" + id + " that is not in synths table.");
}
function processFail(msg) {
    sclog("[scsynth] +++++++++++++++ /fail::  " + msg.args.join(', '));
    const failedCommand = msg.args[0];
    if (failedCommand === '/s_new' || '/n_query') {
        let notFound = msg.args[1].match(/Node ([0-9]+) not found/);
        if (notFound) {
            const id = parseInt(notFound[1]);
            const node = synths[id] || "undefined";
            sclog(`(the node that wasn't found was ${node.type} in synths[${id}])`);
            //message doesn't tell us what the new node id was... so we attempt to keep track of that
            const childNodes = NW_SC.synthsByAddTarget[id];
            //although... a nodes id could change since it was last used as an addTarget, if it's reloaded...
            if (!childNodes) {
                sclog(`(no nodes currently referenced ${id} as addTarget according to our records)`);
                return;
            }
            const childStr = childNodes.map(n => `${n.type}#${n.id}`).join(', ');
            sclog(`(nodes that referenced ${id} as an addTarget at some point: [${childStr}])`);
            //const living = NW_SC.synthsByAddTarget[id] = childNodes.filter(n => !n.killed);
        }
        //what about "duplicate node id"?
    }
}
//----------> OSCWorker -------->
/* We were getting intermittent problems with reading OSC headers, that appear to be as a result
of having an extraneous length before header... detect that and try to remove it.
data is Uint8Array
*/
function checkOSCHeader(data) {
    //example bad data: [0, 0, 0, 20, 47, 100, 95, 114, 101, 109, 111, 118, 101, 100, 0, 0, 44, 115, 0, 0]
    // if first byte is non-zero, we assume it's ok
    if (data[0] !== 0)
        return data;
    // log that we seem to've hit a problem: at the moment, length still left in header where it's not wanted
    // appears to be the problem we're encountering, although
    // if first byte is zero, check that first four bytes provide a length of data.length - 4
    let l = data[0] << 4 | data[1] << 3 | data[2] << 2 | data[3];
    if (l + 4 !== data.length) {
        sclog(`Unexpected value (${l}) extracted from beginning of data packet in checkOSCHeader. Raw bytes:`);
        sclog(`"[${data.join(', ')}]"`);
        sclog(`As text: "${new TextDecoder('utf-8').decode(data)}"`);
    }
    // slice off first four bytes... return the rest (and hope for the best).
    const modifiedData = data.slice(4, l);
    sclog(`Attempting to fix OSC header by stripping length ("${new TextDecoder('utf-8').decode(modifiedData)}")`);
    return modifiedData;
}
//-------> OSCWorker -------->
/** parse and process the osc packet */
function SC_processOSC(originalData) {
    //document.getElementById('scConsole').classList.remove('sc-networkLost');
    if (synths === undefined)
        return; // stopped
    //
    let msg;
    udpStats.receivedBytes += originalData.length;
    udpStats.maxSize = Math.max(udpStats.maxSize, originalData.length);
    //if (data.length > 72) log("sc info len", data.length);
    //this doesn't really help much
    const data = checkOSCHeader(originalData);
    if (data.slice(0, 7).toString() === '/b_setn') { //==== osc.readString(dv, {idx:0}), but b_setc needs update if to be used
        msg = b_setnFromBuffer(data);
    }
    else {
        // msg = osco.fromBuffer(data);
        //any exception will be caught at the next level up of call stack
        msg = osc.readPacket(data, {}, 0);
    }
    if (clumsyRec && Math.random() < clumsyRec) {
        sclog("~~~~~~ clumsy dropped receive '" + msg + "'");
        return;
    }
    processParsedOSC(msg);
}
function processParsedOSC(msg) {
    if (msg.address === "/oa/reloadSynthdef") { //not expected here, see IPC...
        reloadSynthdef(msg.args[0]);
    }
    else if (msg.address === "/status.reply") {
        processStatusReply(msg);
    }
    else if (msg.address === "/n_end") {
        processNEnd(msg);
    }
    else if (msg.address === "/fail") {
        processFail(msg);
    }
    else if (msg.address === "/badValue") {
        processBadValue(msg);
    }
    if (oscCallbacks[msg.address]) {
        var fns = oscCallbacks[msg.address];
        var completed = [];
        for (var i = 0; i < fns.length; i++) {
            var fn = fns[i];
            if (fn(msg))
                completed.push(fn);
        }
        for (let ii = 0; ii < completed.length; ii++)
            destroyObjInArr(completed[ii], fns); //fns.destroy(completed[i]);
    }
}
//----------> OSCWorker -------->
/** optimized special case code to parse b_setn buffer
return msg in almost standard osco.fromBuffer() format */
function b_setnFromBuffer(data) {
    var l = (data.length - 28) / 5;
    var id = data.readInt32BE(16 + l);
    var argst = data.readInt32BE(20 + l);
    var arglen = data.readInt32BE(24 + l);
    var args = [{ type: 'integer', value: id }, { type: 'integer', value: argst }, { type: 'integer', value: arglen }];
    if (arglen !== l)
        serious("Bad assumption about /b_setn format");
    var p = 28 + l;
    var fbuff = new Array(l);
    for (var i = 0; i < l; i++) {
        fbuff[i] = data.readFloatBE(p);
        p += 4;
    }
    return { address: '/b_setn', data: fbuff, id: id, args: args };
}
function removeSynthIDRef(id) {
    var synth = synths[id];
    //freeNodeIDs.unclaim(id); //not safe here, we end up calling multiple times
    if (!synth) {
        sclog("trying to remove reference to node that isn't at synths[" + id + "]");
        return;
    }
    if (synth.id !== id) {
        // the synth must have been re-assigned to a new ID, i.e. when you call synth.reload()
        // it calls /s_new with ADD_REPLACE argument... in that case, we don't really want to
        // remove from synthsByType when /n_end comes in on the old copy... but we should remove reference
        // from the old redundant id in synths
        //sclog(`removing old reference ${id} for ${synth.type} synth now on ${synth.id}`);
        delete synths[id];
        return;
    }
    //this seems fishy; when we reload, the synth will (also) be in synths[newId] want to keep on _checkLoaded
    //and not treat itself as freed etc... but that doesn't explain why we hit the case above
    if (synth._checkLoaded) {
        clearInterval(synth._checkLoaded);
        synth._checkLoaded = undefined;
    }
    synth.freed = true;
    var arr = synthsByType[synth.type];
    if (arr && arr.length === 1)
        delete synthsByType[synth.type]; //TODO: this isn't happening?
    else
        destroyObjInArr(synth, arr); //arr.destroy(synth);
    delete synths[id];
}
var oscBundleElements, oscBundleTimetag, flushingOSCBundle = false;
//----------> OSCWorker -------->
function startOSCBundle(timetag) {
    //TODO: Promise version.
    if (oscBundleElements !== undefined) {
        sclog("WARNING: Multiple calls to startOSCBundle() without flush. Implicit flush invoked.");
        //TODO: allow bundle nesting.
        //We do support it to the extent that it's possible to call writeOSC with a timetag, which will
        //make a one element bundle with timetag.
        flushOSCBundle();
    }
    oscBundleElements = [];
    oscBundleTimetag = timetag;
}
function flushOSCBundle(canIgnore = false) {
    if (synths === undefined)
        return; // stopped
    flushingOSCBundle = true;
    //TODO::: OSCWorker logic with housekeeping etc, or just simplify it.
    if (udpHousekeeping.tried === udpHousekeeping.sent || !canIgnore) {
        if (oscBundleElements.length)
            writeOSCBundle(oscBundleElements, oscBundleTimetag);
    }
    else
        udpStats.skipped++;
    flushingOSCBundle = false;
    oscBundleElements = undefined;
    oscBundleTimetag = undefined;
}
//-----> OSCWorker -----> // this does some sanity checking and also encapsulates logic about bundling.
//only the part to do with actually encoding and sending a packet should be done in worker.
/** write osc message using optional timetag */
function writeOSC(address, args, timetag) {
    //is the server ready yet? This is no way to check - which is not what it's used for...
    //although, if server *isn't* ready, we may still quietly drop the message (I think, with WS or UDP?)
    //if we switch to supercolliderjs for networking, this may not be worth clarifying.
    if (synths === undefined)
        return; // stopped
    //checking if the format of this message is correct.
    //don't attempt to remove bad items, drop the whole msg and issue severe warning...
    let isNested = false;
    function isInvalidOSCAtom(a) {
        //http://opensoundcontrol.org/spec-1_0
        //valid: int32BE, OSC-timetag (64bit fixed BE - see osc.writeTimeTag), float32BE, OSC-string, OSC-blob
        const type = typeof a;
        if (a === undefined || null)
            return true;
        if (type === 'function')
            return true;
        if (type === 'number')
            return isNaN(a) || !isFinite(a);
        if (type === 'string')
            return false;
        if (Array.isArray(a)) {
            if (isNested)
                return true; //maybe nested arrays are allowed in spec? but not by us here.
            isNested = true; //it's the call to this method that's nested at this point.
            return a.find(b => isInvalidOSCAtom(b)) !== undefined;
        }
        return true; //not very careful about checking blobs, but at least we reject other nasties.
    }
    const i = Array.isArray(args) ? args.findIndex(isInvalidOSCAtom) : -1;
    if (i !== -1) {
        const badArgs = args.reduce((a, e, j) => {
            if (isInvalidOSCAtom(e))
                a.push(j);
            return a;
        }, []);
        const err = `WARNING::::: ${address}: invalid arg "${args[i]}" [${args.join(', ')}]!  MESSAGE DROPPED!`;
        sclogE(err);
        return { msg: err, badArgIndexes: badArgs }; //check this in eg /s_new and give up
    }
    if (timetag) { //expect this to be a js time in ms
        timetag = { raw: osc.jsToNTPTime(timetag), native: timetag };
    }
    var msg;
    msg = timetag ? { timetag: timetag, elements: [{ address: address, args: args }], oscType: 'bundle' }
        : { address: address, args: args };
    if (oscBundleElements && !flushingOSCBundle)
        oscBundleElements.push(msg);
    else {
        msg.packets = msg.elements; //---> do we really want packets AND elements? does it matter?
        msg.timeTag = msg.timetag; //==== todo complete browser audio remove need for this
        //----> OSCWorker ---->
        encodeAndSendOSCPacket(msg);
    }
}
//----> OSCWorker ----> //these two 'encodeAndSendOSC' functions will be overwritten if using worker
function encodeAndSendOSCPacket(msg) {
    var buf = osc.writePacket(msg);
    try {
        netSend(buf);
    }
    catch (e) {
        sclogE(e);
        throw e;
    }
}
function encodeAndSendOSCBundle(msg) {
    try {
        var buf = osc.writeBundle(msg);
        netSend(buf);
    }
    catch (e) {
        sclogE(e);
        throw e;
    }
}
/** write osc bundle using optional timetag,
nb, actual final encoding & sending is handled by encodeAndSendOSCBundle()
which will be a different implementation for worker vs local.
*/
function writeOSCBundle(elements, timetag) {
    if (!elements || elements.length === 0)
        return;
    if (timetag) { //expect this to be a js time in ms
        timetag = { raw: osc.jsToNTPTime(timetag), native: timetag };
    }
    var msg;
    msg = { oscType: 'bundle', timetag: timetag || 0, elements: elements };
    //var msg = {timetag: timetag || 0, elements: elements};
    if (oscBundleElements && !flushingOSCBundle) {
        sclogE("*** Nested bundling doesn't work (at least, not for now) ***");
        oscBundleElements.push(msg);
    }
    else {
        msg.packets = msg.elements;
        msg.timeTag = msg.timetag;
        //----> OSCWorker ---->
        encodeAndSendOSCBundle(msg);
    }
}
//nb, more general net stats, was UDP when first written
var udpStatsInit = {
    lastSendDelay: 0, minSendDelay: Number.MAX_VALUE, maxSendDelay: -1, meanSendDelay: undefined,
    skipped: 0, tried: 0, sent: 0, sentBytes: 0, receivedBytes: 0, receivedCalls: 0, maxSize: 0
};
var udpStats = clone(udpStatsInit);
var udpHousekeeping = { tried: 0, sent: 0 };
/** send a message using given sender, with either udp or tcp as appropriate.
If sender is not specified use default scsender. */
var netSend;
netSend = function (buf, sender) {
    sender = sender || scsender;
    if (!synths || !sender)
        return;
    var t = Date.now();
    //really, this only shows that a message has been sent since the last message was queued.
    udpStats.tried++;
    udpHousekeeping.tried++;
    var wasSent = function (timeOfRequest) {
        return function (err) {
            if ((err)) {
                sclog("Network send Error: " + err);
                if (err.message === "This socket is closed.") {
                    return;
                }
            }
            var t2 = Date.now();
            var dt = t2 - timeOfRequest;
            udpStats.sent++;
            udpHousekeeping.sent++;
            udpStats.lastSendDelay = dt;
            udpStats.minSendDelay = Math.min(dt, udpStats.minSendDelay);
            udpStats.maxSendDelay = Math.max(dt, udpStats.maxSendDelay);
            udpStats.meanSendDelay = udpStats.meanSendDelay === undefined ? dt : (udpStats.meanSendDelay + dt) / 2;
            udpStats.sentBytes += buf.length;
            //if (dt > 1000) sclog("slow udp send.");
            statSC.sendLEDOpacity = 1; //nb, if using websocket, this blinking is meaningless.
        };
    };
    if (sender.type === 'udp4') {
        if (clumsySend && Math.random() < clumsySend) {
            //var msg = osco.fromBuffer(buf);
            var msg = osc.readPacket(buf, {}, 0);
            sclog("~~~~~~ clumsy dropped send '" + JSON.stringify(msg + "'"));
            return;
        }
        //setTimeout(function() {
        //buf = new Buffer(buf);
        //savebuf(buf);  // stop/reduce risk of cross-context garbage collection
        sender.send(buf, 0, buf.length, UDP_PORT, 'localhost', wasSent(t));
        //}, 0);
    }
    else if (sender.type === 'ws') {
        if (wssender.readyState !== wssender.OPEN) {
            sclogE(msgfix('websocket', 'audio web socket in unexpected state', wssender.readyState, '... stopping audio'));
            noaudio = true;
            return;
        }
        netSend.dv.setInt32(0, buf.length);
        wssender.send(netSend.u8);
        wssender.send(buf);
        wasSent(t)(); // must assume that it was sent, no other evidence (???)
    }
    else { // tcp
        if (!sender.writable)
            return;
        var lbuf = netSend.bu;
        lbuf.writeUInt32BE(buf.length, 0);
        sender.write(lbuf);
        buf = Buffer.from(buf); // sjpt 22/8/17 new Buffer(buf);  // prepared as Uint8Array
        if (!sender.write(buf, undefined, wasSent(t))) { } // sclog("tcp data queued...");
    }
};
if (isNode())
    netSend.bu = new Buffer(4); //runtime exception: Buffer is not defined
netSend.u8 = new Uint8Array(4);
netSend.dv = new DataView(netSend.u8.buffer);
var scStats = function () {
    var s = this;
    this.sendLEDOpacity = 0;
    this.sendLED = document.getElementById('scSendLED');
    //TODO:
    //var graph = document.createElement('div');
    //graph.id = 'scStats';
    s.ledInterval = setInterval(function scStats_interval() {
        s.sendLEDOpacity *= 0.9;
        s.sendLED.style.opacity = s.sendLEDOpacity;
    }, 50);
    s.statsLogInterval = setInterval(function () {
        //sclog("udpStats: " + JSON.stringify(udpStats) + " " + new Date());
        //if (udpStats.receivedCalls === 0) document.getElementById('scConsole').classList.add('sc-networkLost');
        udpStats = clone(udpStatsInit);
    }, 10000);
};
var statSC = new scStats();
/*
var udpProxyWindow;
function setupUDPProxy() {
    udpProxyWindow = window.open("udp.html");

}
*/
var syInt1, syInt2;
function syKiller() {
    stopsyKiller();
    syInt1 = setInterval(reloadAllSynths, 3000);
    syInt2 = setInterval(reloadAllSynths, 2370);
}
function stopsyKiller() {
    clearInterval(syInt1); // doesn't matter if invalid
    clearInterval(syInt2);
    syInt1 = syInt2 = undefined;
}
var scdefertime = 100;
function scdefer(fun) {
    requestAnimationFrameD(fun, scdefertime);
}
/** degug infrmation on how long we havbe stayed up
setInterval( function showlasted() {
    var m = "lasted=" + ((Date.now() - loadStartTime)/1000) + " tcpSocketid=" + tcpSocketid;
    log(m);
    msgfix('?',m);
}, 5000);
**/
/** sizekill is for debugging, to stress the javascript thread and increase the chance of tcp errors */
var sizekillinterval;
var sizekillwait = 10e7, sizekillnum = 0;
function sizekill() {
    log("start sizekill");
    W.msgbox.style.display = "";
    sizekillinterval = setInterval(function () {
        sizekillnum++;
        setInput(W.fullvp, false);
        setInput(W.projvp, false);
        //if (renderer) renderer.setSize(Math.random() * 800, Math.random() * 600);
        //setViewports();
        for (var i = 0; i < sizekillwait; i++)
            var q = i * i * i;
        msgfix("sizekill", q / q, "tcpsocketid", tcpSocketid, "sizekillnum", sizekillnum);
    }, 200);
}
//# sourceMappingURL=nw_sc.js.map