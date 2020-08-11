var log, Maestro, framenum, onframe, performance, CSynth, frametime, serious, msgfix, msgfixlog,
resolveFilter, format, interactDownTime;

runTimedScript.rate = 1;
runTimedScript.interruptTime = 0;
// controller function to execute a script ww
function runTimedScript(ww) {
    const start = Date.now();
    function gogo() {
        if (runTimedScript.interruptTime > start) {
            msgfixlog('next', 'timed script interrupted');
            return;
        }
        let { value, done } = ww.next();
        if (done) {
            msgfixlog('next', ">>> timed script complete");
        } else if (value === 'scriptNext') {
            msgfix('next', `${runTimedScript.nextmessage}
            <br>You can first try your own interactions to experiment before moving on.`);
            Maestro.on(value, () => {
                // runTimedScript.rate = 1;
                S.waiting = false;
                // msgfix('next', 'hit Z key to move to next frame');
                gogo()
                }, undefined, true);
        } else if (typeof value === 'string') {
            Maestro.on(value, gogo, undefined, true);
        } else if (typeof value === 'number') {
            S.btimeout(gogo, value);
        } else if (value instanceof Promise) {
            value.then(x=> {value.result = x; gogo();});
        } else {
            console.error('unexpected value in script yield', value, '. Continuing immediately.');
            gogo();
        }

    }
    gogo();
}
var S = runTimedScript;

// timeout broken into parts
S.btimeout = function(f, t, gap=100) {
    if (t <= 0 || S.skipping)
        f();
    else
        setTimeout( () => S.btimeout(f, (t - gap * runTimedScript.rate), gap), gap);
}

// move on to next 'wait' point, called from 'Z' key
runTimedScript.next = function() {
    if (!S.waiting) S.skipping = true;
    onframe(() => Maestro.trigger('scriptNext'));
}

// interrupt any running timed scripts
runTimedScript.interrupt = function() {
    S.interruptTime = Date.now();
    S.next();
}

//runTimedScript.nextmessage = `
//<span "onclick=S.runTimedScript.next(); return killev()">Hit Z key or click here</span> to move to next frame.
//`;
runTimedScript.nextmessage = `Hit Z key or click 'Next' to move to next frame.`;
runTimedScript.waitForInteraction = function(k) {
    if (S.skipping) return true;
    if (runTimedScript.interactStart) {
        if (runTimedScript.interactStart !== interactDownTime || S.skipping) {
            runTimedScript.interactStart = undefined;
            log('wait for interaction completed', interactDownTime, k);
            return true;
        } else {
            // log('wait for interaction still waiting', interactDownTime, k);
            return false;
        }
    } else {
        log('wait for interaction initiated', interactDownTime, k);
        msgfix('next', `${runTimedScript.nextmessage}
        <br>Any other interaction will stop auto play
        <br>and allow you to experiment for yourself.`);
        runTimedScript.interactStart = interactDownTime;
        return false;
    }
}

/** run a function until some interaction seen: wait waittime between each interaction, k is key for debig messages */
runTimedScript.repeatTillInteraction = function* (fun, waittime = 0, k = '?') {
    if (typeof fun === 'function') fun = [fun];
    let i = 0;
    while (!S.waitForInteraction(k)) {
        fun[i++ % fun.length]();
        yield waittime;
    }
}

// mark a wait point, runTimedScript.next() to move past this point ('Z' key)
runTimedScript.waitnext = function() {
    if (S.skipping) {       // next() already called before we got to the wait point
        S.skipping = false;
        return 0;           // move immediately over the wait point
    }
    S.skipping = false;
    S.waiting = true;
    msgfix('next', 'waitnext');
    return 'scriptNext';        // wait for the call to next()
}

function promisetest(x) {
    return new Promise( (resolve, reject) => {
        if (x === 'fail') reject(new Error('fail'));
        //console.log('setting up promisetest', framenum);
        setTimeout(() => {
            //console.log ('resolving promisetest', framenum);
            resolve({x, framenum});
            //console.log ('promisetest resolved', framenum);
        }, 1000);
    });
}

// sample script, called by runTimedScript(testscriptx())
function *testscriptx(a = 5, b, c) {
    log('hi1', framenum);
    yield 200;
    log('hi2', framenum);
    for (let i=0; i<20; i++) yield 'postframe'
    log('hi3', framenum);
    yield {};
    log('hi4', framenum);
    const y = promisetest(77);
    yield y;
    log('hi5 after promise', y.result, framenum);


    return;

    for (let i = 0; i < a; i++) {
        CSynth.xyzSpringsRed();
        yield 1000;
        CSynth.xyzSpringsWhite();
        yield 1000;
    }
}

/** test frame and work with yield, use around slottime time before each yield */
function *testframes(testint = 1000, slottime = 100, tot = 1000000) {
    let st = performance.now();
    const sst = st;
    let slotsn = 0;
    for (let i=0; i<tot; i++) {
        if (i%testint === 0) {
            let et = performance.now();
            if (et > st+slottime) {
                msgfix('i', i, slotsn, '%done', ((i/tot)*100).toFixed(1));
                yield 'postframe';
                slotsn++;
                st = performance.now();
            }
        }
    }
    const eet = performance.now();
    msgfixlog('testframes complete, slots', slotsn, 'time', ((eet-sst)/1000).toFixed(3));
}

S._going = [];   // list of objects with ongoing actions

/** add a ramp to process, if first char is ! resolveFilter is used to fill it out, return time (for yield) */
S.ramp = function Sramp(obj, fieldPattern, target, time, options) {
    S.rampP(obj, fieldPattern, target, time, options);
    return time;
}

/** not very efficient but convenient ramp for vectors
 * eg S.rampPV(tad.emul.left.baitPosition, VEC3(-1,0,0), 1000, {scurve:true})
 */
S.rampPV = function SrampP(obj, target, time, options = {}) {
    const a = [];
    a.push(S.rampP(obj, 'x', target.x, time, options));
    a.push(S.rampP(obj, 'y', target.y, time, options));
    a.push(S.rampP(obj, 'z', target.z, time, options));
    return Promise.all(a);
}

/** add a ramp to process, if first char is ! resolveFilter is used to fill it out, return promise */
S.rampP = function SrampP(obj, fieldPattern, target, time, options = {}) {
    // if (fieldPattern === '*') {
    //     const a = [];
    //     for (let f in obj) a.push(S.rampP(obj, f, target[f], time, options)); // too many f
    //     return Promise.all(a);
    // }

    const {next=undefined, dolog = true, fun = undefined, scurve = false} = options;
    if (!S.started) { Maestro.on('postframe', () => S.process()); S.started = true; } // indirect S.process in case changed in debug
    if (time === undefined) { log('no time specified in S.ramp'); return 0; }

    if (fieldPattern[0] === '!')
        var fields = resolveFilter(fieldPattern.substring(1));
    else
        fields = {}; fields[fieldPattern] = true;

    let promise;
    if (!obj._going) {  // this will hold the individual actions on obj
        obj._going = {};
        S._going.push(obj);
    }
    for (const field in fields) {

        let v = obj._going[field];
        //if (v) {
        //    if (v.obj !== obj) serious('same field in different objs not supported in S.ramp');
        //} else {
            obj._going[field] = v = {obj, field}
        //}
        v.fun = fun;
        if (typeof target === 'function') v.fun = target;  // backward compatibility
        v.type = v.fun ? 'func': 'ramp';
        v.startt = frametime;
        v.startv = obj[field];
        // v.ramp = (target - v.startv) / time;
        v.target = target;
        v.time = v.timeleft = time;
        v.log = dolog;
        v.next = next;
        v.scurve = scurve;
        if (!promise) promise = new Promise((resolve, reject) => v.resolve = resolve );
    }
    return promise;  // may then get used in yield for timed script
}

// function for log change; pt 0..1
S.log = (pt, v) => v.startv * (v.target/v.startv)**pt;
S.speedup = 1;

S.process = function Sprocess() {
    // handling dt like this is marginally less efficient
    // but allows S.speedup to be changted dynamically
    // n.b. sometimes frametime is reset during startup
    // the throttle on dt helps with that, and with debug interruptions
    if (S._lasttime === undefined) S._lasttime = frametime;
    const dt = Math.min((frametime - S._lasttime), 100) * S.speedup;

    S._lasttime = frametime;

    const msgl = [];
    for (let i = S._going.length -1; i >= 0; i--) {
        const obj = S._going[i];
        for (let k in obj._going) {
            const v = obj._going[k];
            v.timeleft -= dt;
            if (v.timeleft <= 0) {
                switch (v.type) {
                    case 'ramp': v.obj[v.field] = v.target; break;
                    case 'func': v.obj[v.field] = v.fun(1, v, v.target); break;
                }
                delete obj._going[k];
                if (Object.keys(obj._going).length === 0) {
                    delete obj._going;
                    S._going.splice(i, 1);
                }
                if (v.next) v.next();
                if (v.resolve) v.resolve(v);
            } else {
                //const dt = t - v.startt;            // delta time since start
                //const pt = dt / v.time;             // proprortion of time
                //const lv = v.startv + v.ramp * dt;  // linear
                const pt = (v.time - v.timeleft) / v.time;
                const pts = v.scurve ? ( (3 - 2*pt) * pt * pt) : pt;
                const lv = v.startv + (v.target - v.startv) * pts;
                switch (v.type) {
                    case 'ramp':
                        v.obj[v.field] = lv;
                        break;
                    case 'func':
                        v.obj[v.field] = v.fun(pt, v, lv);
                        break;
                    default:
                        serious('unexpected S.process type', v.type);
                        break;
                }
            }  // normal interpolate
            if (v.log) msgl.push(v.field + '=' + format(v.obj[v.field]));
        }  // different fields

    }   // different objects
    if (msgl.length === 0)
        {} // S.log('S');
    else
        S.log('S', msgl.join(', '));
}

S.interact = function S_keystroke(msg = '', object = document, event = 'keydown') {
    const mk = event + ' to continue';
    msgfixlog(mk, '\n' + msg)
    return new Promise(resolve => {
        const listener = () => {
            object.removeEventListener(event, listener);
            msgfixlog(mk);
            resolve(['interact', msg, object, event]);
        }
        object.addEventListener(event, listener);
    });
}

S.maestro = function S_maestro(msg = '', event, maes = Maestro) {
    const mk = 'Maestro ' + event + ' to continue';
    msgfix(mk, '\n' + msg)
    return new Promise(resolve => {
        const listener = () => {
            maes.remove(event, listener);
            msgfix(mk);
            resolve(['maestro', msg, event]);
        }
        maes.on(event, listener);
    });
}

S.waitVal = async function(f) {
    while (!f())
        await S.frame();
    return f();
}


S.frame = function S_frame(n = 1) {
    return new Promise(resolve => {
        onframe(resolve, n);
    });
}

S.log = msgfix;

