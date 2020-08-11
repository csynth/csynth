/*
 * Apologies for the pompous sounding name.
 * This is supposed to handle musical logic, which also relates to being a kind of
 * master event-source for time-based parts of a program.
 *
 * Now mostly used as central EventEmitter type thing for OrganicArt / CSynth.
 *
 * TODO: factor out music related stuff elsewhere.
 *
 * Not entirely clear at the time of writing whether this will just be a metronome thing,
 * or maybe also have some knowledge of harmony etc... for now, we're starting with a very
 * crude notion of musical time, probably soon adding an even cruder notion of tonality...
 *
 */
"use strict";

// var ; // keep joiner short happy
var serious, startOSCBundle, flushOSCBundle, sclog, sclogE, Worker; //OSC & sc stuff only used with nw_sc / mutsynth.

//http://stackoverflow.com/questions/5767325/remove-specific-element-from-an-array
var destroyObjInArr = function(obj, arr){
    // Return null if no objects were found and removed
    if (arr === undefined) return null;
    var destroyed = null;
    for(var i = 0; i < arr.length; i++){
        // Use while-loop to find adjacent equal objects
        while(arr[i] === obj){
            // Remove this[i] and store it within destroyed
            destroyed = arr.splice(i, 1)[0];
        }
    }
    return destroyed;
};

var MaestroConstructor = function(useWorker = false) {

    //associates named events ("beat", "bar"...) with arrays of
    //function(msg) returning true when they are ready to be removed
    var callbacks = {};
    this._callbacks = callbacks;  // for debug
    this.regid = 0;

    //we might want to have a way of controlling order of operations within these,
    //rather than always using push()
    this.on = function(k, fn, onParms, once) {
        if (typeof fn !== 'function') return serious('bad call to Maestro.on', 'not a function', fn);
        if (!callbacks[k]) callbacks[k] = [];
        m.regid++;
        callbacks[k].push({fn: fn, onParms: onParms, once: once, msgtype: k, regid: m.regid});
        return m.regid;
    };

    //add a callback, but if function already there remove old one
    this.onUnique = function(k, fn, onParms, once) {
        m.remove(k, fn);
        m.on(k, fn, onParms, once);
    };

    /** remove object with regid from callback k,
     * or all callbacks if k 0 or undefined
     * (DO NOT return event removed, or undefined if none.)
     * regid may be
     *     the allocated id,
     *     the allocated function, in which case all matching that function are cleared
     *     0 or undefined, in which case all are cleared
     *      */
    this.remove = function(k, regid) {
        if (!k && !regid) {
            callbacks = {};
        } else if (k && !regid) {
            delete callbacks[k];
        } else if (k) {
            if (callbacks[k])
                for (var i=callbacks[k].length-1; i >= 0;  i--) {
                    if (!regid || callbacks[k][i].regid === regid || callbacks[k][i].fn === regid)
                        callbacks[k].splice(i,1)[0];  // eslint-disable-line  no-unused-expressions
                }
        } else {
            for (var kk in callbacks) {
                var ev = this.remove(regid, kk);
                if (ev) return ev;
            }
        }
    };

    /** count matches, k and regid must be given */
    this.count = function(k, regid) {
        let n = 0;
        for (var i=callbacks[k].length-1; i >= 0;  i--) {
            if (!regid || callbacks[k][i].regid === regid || callbacks[k][i].fn === regid)
                n++
        }
        return n;
    }

    this.terminate = function() {
        callbacks = {};
        worker.terminate();
    }


    this.ignoreQuarantined = true;

    /** trigger listeners on the specified event, and on "*"
     * We could have a more generic wildcard system,
     * but that could be much more expensive/complicated if the number of callback events was high.
     * (may consider this for more localised instances vs global monolithic event router...)
     * */
    this.trigger = function(k, eventParms) {
        var list = [k, "*"];
        for (var ii = 0; ii < list.length; ii++) {
            var kk = list[ii];
            var fns = callbacks[kk];
            var event = {maestro: m, msgtype: k, eventParms: eventParms};
            // copy all parms to base event object to save writing e.eventParms.foo the whole time
            for (const ek in eventParms) event[ek] = eventParms[ek];
            if (fns) {
                fns = fns.slice(0); //avoid modifying the same array we are looping through.
                var completed = [];
                for (var i=0; i<fns.length; i++) {
                    var fn = fns[i];
                    if (this.ignoreQuarantined || !fn.quarantined) {
                        try {
                            event.onParms = fn.onParms;
                            //often functions have other ideas about what arguments they want
                            //fn(event) is irritating.
                            //PJT 2020: (backwards) return value is not working out well.
                            //... but how much would we break...?
                            //adding a check for 'cancelled' flag on event object, checked after fn invocation...
                            //although, had been considering not passing event object... so...
                            if(fn.fn(event) || event.cancelled || fn.once) completed.push(fn);
                        } catch (err){
                            if (!fn.quarantined && !this.ignoreQuarantined) { // only report one err
                                console.log("[Maestro]Quarantine function "+ JSON.stringify(fn) +" as it threw error " + err);
                                console.log(err.stack);
                            }
                            fn.quarantined = err;  // but remember last one
                            if (fn.once)  completed.push(fn);
                        }
                    }
                }
                completed.map(function(el) { destroyObjInArr(el, callbacks[kk]); });
                if (callbacks[kk] && callbacks[kk].length === 0) delete callbacks[kk];
            }
        }
    };

    //TODO: factor out music related stuff elsewhere.
    //consider better facilitation of polyrhythmic structures (or even just triplets)
    //--triplet idea::: not tied to main timer, but I could encode a sequence with computed timetags...
    //--polymeter::: make more than one & be sure to clean up after.
    //TODO: check whether our timer is causing significant problems in heavy VR graphics context
    //Moving to worker.  Maybe consider larger shift of audio related stuff to worker.
    const worker = useWorker ? new Worker('../JS/maeswork.js') : null;
    let skipCount = 0;
    if (worker) {
        worker.onmessage = e => {
            const d = e.data;
            //some messages like start I'm sending back for not much reason.
            //main thing I care about is step (& skip I suppose, just in case).
            if (d.step) doStep(d.step);
            if (d.simpleStep) {
                const err = d.simpleStep;
                if (this.averageTimeError === undefined) this.averageTimeError = err;
                this.averageTimeError = (this.averageTimeError + err) / 2;
                doStep();
            }
            if (d.skip) {
                skipCount = d.skip;
                sclogE('skip ' + skipCount);
            }
        }
    }
    var audioContext, acStartTime; //not used, see notes in .start()
    var running = false;
    var interval;
    if (!sclog) sclog = function(msg) { console.log(msg); };
    if (!sclogE) sclogE = function(msg) { console.error(msg); };
    var m = this;
    var startTime, lastStepTime, targetStepTime; //what is lastStepTime really for?
    this._intervalTime = 1;
    this.stepsPerBeat = 4;
    this.beatsPerBar = 4;
    this.barsPerMeasure = 4;
    this.step = 0;
    this.beat = 0;
    this.bar = 0;
    this.measure = 0;
    this.skipCount = 0;
    this.time = 0;
    let preemptTime = 30; //TODO consider timing of visuals
    let stepTime = 200;
    Object.defineProperties(this, {
        preemptTime: {
            get: () => preemptTime,
            set: v => {
                if (worker) worker.postMessage({preemptTime: v});
                preemptTime = v;
            }
        },
        stepTime: {
            get: () => stepTime,
            set: v => {
                if (worker) worker.postMessage({stepTime: v});
                stepTime = v;
            }
        }
    });
    this.preemptTime = preemptTime;
    this.stepTime = stepTime;
    function metronomeLoop() {
        //work out where we are in time, which callbacks correspond to that & execute them.
        //pass in some state information while we're at it...
        //(TODO: revise passing in of information - often more trouble than it's worth)

        var t = getTime();
        m.time = t - startTime; //???? not really sure what for here
        let isStep;
        //referring a bit to http://stackoverflow.com/questions/13160122/
        var margin = m.preemptTime; //TODO: figure out what we can get away with here.
        var dif = targetStepTime - t;

        m.trigger("tick");//deprecated
        if (dif < -margin) {  // we have gone way beyond beat, let beat continue from here
            //targetstepTime += m.stepTime;
            targetStepTime -= dif;
            m.skipCount++;
            m.trigger("skip");
        }

        if (dif < margin) {  // we have reached close enough to beat that we should schedule it
            isStep = true;
        }

        if (isStep) doStep();

        //??? do we use this? old trailing comment...
        m.time = t - startTime;  // time we actually have

    }  // mainloop

    function doStep(targetTime) {
        let isBeat, isBar, isMeasure;

        m.time = targetTime - startTime;  // time beat should have happened
        startOSCBundle(targetTime);
        m.step = (m.step + 1) % m.stepsPerBeat;
        if (m.step === 0) {
            isBeat = true;
        }
        if (isBeat) {
            m.beat = (m.beat + 1) % m.beatsPerBar;
            if (m.beat === 0) {
                isBar = true;
                m.bar = (m.bar + 1) % m.barsPerMeasure;
            }
        }

        if (isBar && m.bar === 0) {
            isMeasure = true;
            m.measure++;
        }
        //order always starts from longest time first;
        //in some circumstances, may want to alter state effecting subsequent events (eg, change chord on new bar)
        if (isMeasure) m.trigger("measure");
        if (isBar) m.trigger("bar");
        if (isBeat) m.trigger("beat");
        m.trigger("step");


        // defer to end in case a client changes BPM / stepTime
        targetStepTime += m.stepTime;


        m.trigger('prepareBundle'); // listen to this so that synth.processBundle() etc happen
        flushOSCBundle();
    }

    this.start = function() {
        running = true;
        if (!audioContext) {
            // nb, tried using AudioContext for time, seem to have less good results
            // audioContext.currentTime is relative to start
            // attempting to use acStartTime to go back to system time didn't seem to work well
            // if we were actually using it for WebAudio it'd probably make sense (without need for acStartTime).

            // audioContext = new AudioContext();
            // acStartTime = new Date().getTime();
        }
        startTime = lastStepTime = getTime();
        targetStepTime = lastStepTime + m.stepTime;
        if (useWorker) {
            worker.postMessage('start');
        } else interval = setInterval(metronomeLoop, m._intervalTime);
    };

    this.pause = function() {
        running = false;
        //sclog("clearing interval...");
        if (useWorker) worker.postMessage('pause');
        else clearInterval(interval);
    };

    this.stop = function() {
        this.beat = 0;
        this.bar = 0;
        this.measure = 0;
        this.pause();
    };

    this.setBPM = function(bpm) {
        //TODO: run at finer time resolution
        //fix if stepsPerBeat changes while playing
        this.stepTime = this.bpmToMS(bpm) / this.stepsPerBeat;
        if (m.stepTime < m.preemptTime) {
            //sclog(`WARNING: maestro stepTime ${m.stepTime} < preemptTime ${m.preemptTime}`);
            m.preemptTime = m.stepTime;
        }
        if (running && !worker) {
            //this.stop(); //WTF?
            this.pause();
            this.start();
        }
        this.trigger('bpm', bpm);
    };

    function getTime() {
        if (audioContext) return acStartTime + audioContext.currentTime * 1000;
        else return Date.now(); //maybe an async request to whattimeisitrightnow.com?
    }

    this.bpmToMS = function(bpm) { return 60000/bpm; };

    this.mtof = function(mm) { return 440*Math.pow(2, (mm-69)/12); };


    var modal = [0, 2, 4, 6, 7, 9, 11]; //Dorian scale according to Modal Space sc example [0, 2, 3.2, 5, 7, 9, 10]
    var IONIAN=0, DORIAN=1, PHRYGIAN=2, LYDIAN=3, MIXOLYDIAN=4, AEOLIAN=5, LOCRIAN=6;
    function generateModalIntervals(mode) {
        //TODO
    }
};
var Maestro = new MaestroConstructor(false);
