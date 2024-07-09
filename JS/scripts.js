var log, Maestro, framenum, onframe, CSynth, frametime, serious, msgfix, msgfixlog,
resolveFilter, format, interactDownTime, refmain;

var S = {}; // run TimedScript;     // convenience name
S.rate = 1;
S.defaultWait = 20; // default wait in seconds


// timeout broken into parts, so S.rate effective quicker
S.btimeout = function(f, t, gap=100) {
    if (t <= 0 || S.skipping)
        f();
    else
        setTimeout( () => S.btimeout(f, (t - gap * S.rate), gap), gap);
}


//S.nextmessage = `
//<span "onclick=S.S.next(); return killev()">Hit Z key or click here</span> to move to next frame.
//`;
S.nextmessage = `Hit Z key or click 'Next' to move to next frame.`;
S.waitForInteraction = function(k) {
    if (S.skipping) return true;
    if (S.interactStart) {
        if (S.interactStart !== interactDownTime || S.skipping) {
            S.interactStart = undefined;
            log('wait for interaction completed', interactDownTime, k);
            return true;
        } else {
            // log('wait for interaction still waiting', interactDownTime, k);
            return false;
        }
    } else {
        log('wait for interaction initiated', interactDownTime, k);
        msgfix('next', `${S.nextmessage}
        <br>Any other interaction will stop auto play
        <br>and allow you to experiment for yourself.`);
        S.interactStart = interactDownTime;
        return false;
    }
}

/** run a function until some interaction seen: wait waittime between each interaction, k is key for debig messages */
S.repeatTillInteraction = function* (fun, waittime = 0, k = '?') {
    if (typeof fun === 'function') fun = [fun];
    let i = 0;
    while (!S.waitForInteraction(k)) {
        fun[i++ % fun.length]();
        yield waittime;
    }
}

S._going = new Map();

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

S.noramp = false;

/** add a ramp to process, if first char is ! resolveFilter is used to fill it out, return promise */
S.rampP = function SrampP(obj, fieldPattern, target, time, options = {}) {
    // if (fieldPattern === '*') {
    //     const a = [];
    //     for (let f in obj) a.push(S.rampP(obj, f, target[f], time, options)); // too many f
    //     return Promise.all(a);
    // }
    if (S.noramp) { obj[fieldPattern] = target; return true; } // ? is true as good as a promise?

    const {next=undefined, dolog = true, fun = undefined, scurve = false} = options;
    if (!S.started) { Maestro.on('postframe', () => S.process()); S.started = true; } // indirect S.process in case changed in debug
    if (time === undefined) { log('no time specified in S.ramp'); return 0; }

    if (fieldPattern[0] === '!')
        var fields = resolveFilter(fieldPattern.substring(1));
    else
        fields = {}; fields[fieldPattern] = true;

    let promise;
    if (!S._going.has(obj)) {  // this will hold the individual actions on obj
        S._going.set(obj, {});
    }
    const ogoing = S._going.get(obj);
    for (const field in fields) {
        if (obj[field] === target) {delete ogoing[field]; continue; }
        let v = ogoing[field];
        ogoing[field] = v = {obj, field}
        v.fun = fun;
        const ttype = typeof target;
        if (ttype === 'function') v.fun = target;  // backward compatibility
        v.type = v.fun ? 'func': obj.setValue ? 'setramp' : 'ramp';
        v.startt = frametime;
        v.startv = obj.getValue ? obj.getValue() : obj[field];
        // v.ramp = (target - v.startv) / time;
        v.target = target;
        v.time = v.timeleft = (ttype === 'number' || ttype === 'function') ? time : -999;
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
S.kill = false;
S.rampTime = 2000;

S.process = function Sprocess(force) {
    // handling dt like this is marginally less efficient
    // but allows S.speedup to be changted dynamically
    // n.b. sometimes frametime is reset during startup
    // the throttle on dt helps with that, and with debug interruptions
    if (S._lasttime === undefined) S._lasttime = frametime;
    let dt = force || S.kill ? Infinity : Math.min((frametime - S._lasttime), 100) * S.speedup; // const, let for debug

    S._lasttime = frametime;

    const msgl = [];
    refmain();
    for (const [obj, ogoing] of S._going) {
        for (let k in ogoing) {
            const v = ogoing[k];
            v.timeleft -= dt;
            if (v.timeleft <= 0) {
                switch (v.type) {
                    case 'ramp': v.obj[v.field] = v.target; break;
                    case 'setramp': v.obj.setValue(v.target); break;
                    case 'func': v.obj[v.field] = v.fun(1, v, v.target); break;
                }
                delete ogoing[k];
                if (v.next) v.next();
                if (S.kill) {
                    if (v.reject) v.reject();
                } else {
                    if (v.resolve) v.resolve(v);
                }
            } else {
                //const dt = t - v.startt;            // delta time since start
                //const pt = dt / v.time;             // proprortion of time
                //const lv = v.startv + v.ramp * dt;  // linear
                const pt = (v.time - v.timeleft) / v.time;
                const pts = v.scurve ? ( (3 - 2*pt) * pt * pt) : pt;
                const lv = v.startv + (v.target - v.startv) * pts;
                switch (v.type) {
                    case 'ramp': v.obj[v.field] = lv; break;
                    case 'setramp': v.obj.setValue(lv); break;
                    case 'func': v.obj[v.field] = v.fun(pt, v, lv); break;
                    default:
                        serious('unexpected S.process type', v.type);
                        break;
                }
            }  // normal interpolate
            if (v.log) msgl.push(v.field + '=' + format(v.obj[v.field]));
        }  // different fields within ogoing

        if (Object.keys(ogoing).length === 0) {
            S._going.delete(obj);
        }
    }   // different 'host' objects obj
    if (msgl.length === 0)
        { /**/ } // S.log('S');
    else
        S.log('S', msgl.join(', '));
}

/** force all pending changes not */
S.jump = function() {
    S.process(true);
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

/** promise wait until a Maestro event is fired */
S.maestro = function S_maestro(msg, mevent, maes = Maestro) {
    if (mevent === undefined && msg) return S.maestro(undefined, msg);
    let mk;
    const show = msg && typeof msg === 'string' && msg.length < 50;
    if (show) {
        mk = 'Maestro ' + mevent + ' to continue';
        msgfix(mk, '\n' + msg)
    }
    return new Promise(resolve => {
        const listener = event => {
            maes.remove(mevent, listener);
            if (show) msgfix(mk);
            resolve({maestro: 'maestro', msg, mevent, event, data: event.eventParms});
        }
        maes.on(mevent, listener);
    });
}

/** promise wait until a function returns non-empty value */
S.waitVal = async function(f) {
    let i = 0;
    while (!f()) {
        i++;
        await S.frame();
    }
    return f();
}

/** wait for an event to be dispatched */
S.waitEvent = async function(id) {
    return new Promise(resolve => {
        addEventListener(id, resolve, {once: true})
    })
}

/** fire an event */
S.trigger = function(id) {
    window.dispatchEvent(new Event(id));
}

/** promise wait for n frames */
S.frame = function S_frame(n = 1) {
    return new Promise(resolve => {
        onframe(resolve, n);
    });
}

/** promise wait for ms millesecs; do NOT consider S.kill */
function sleep(ms) {
    return new Promise(function awaitsleep(resolve) {setTimeout(resolve, ms/S.speedup);});
}

/** wait for secs, or allow enter (Maestro.trigger('wake')) or kill */
S.sleep = async function sleepP(ms = 5) {
    // ???? S.jump();   // in case going through quickly, may ? be other things to jump???.
    // W() in leedsBackground does not include jump() as there are several concuurent W's at same time
    await Promise.race([Maestro.await('wake'), sleep(ms)]);
    if (S.kill)
        throw new Error('killing script');
}
S.W = async function (secs) {return await S.sleep(secs*1000);}

/** like S.sleep, but keep frames moving */
S.nap = async function(ms) {
    const et = Date.now() + ms;
    while (Date.now() < et) await S.frame();
}


S.log = msgfix;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ obsolescent code below here, old style scripts
S.interruptTime = 0;


// /** controller function to execute a script ww
//  * run TimedScript itself is (almost) obsolete, using async scripts instead
//  * run TimedScript is effectively just the namespace S
//  * Some features such as S.ramp() are still used
//  */
//  function runDEADTimedScript(ww) {
//     const start = Date.now();
//     function gogo() {
//         if (S.interruptTime > start) {
//             msgfixlog('next', 'timed script interrupted');
//             return;
//         }
//         let { value, done } = ww.next();
//         if (done) {
//             msgfixlog('next', ">>> timed script complete");
//         } else if (value === 'scriptNext') {
//             msgfix('next', `${S.nextmessage}
//             <br>You can first try your own interactions to experiment before moving on.`);
//             Maestro.on(value, () => {
//                 // S.rate = 1;
//                 S.waiting = false;
//                 // msgfix('next', 'hit Z key to move to next frame');
//                 gogo()
//                 }, undefined, true);
//         } else if (typeof value === 'string') {
//             Maestro.on(value, gogo, undefined, true);
//         } else if (typeof value === 'number') {
//             S.btimeout(gogo, value);
//         } else if (value instanceof Promise) {
//             value.then(x=> {value.result = x; gogo();});
//         } else {
//             console.error('unexpected value in script yield', value, '. Continuing immediately.');
//             gogo();
//         }

//     }
//     gogo();
// }


/** obsolete? move on to next 'wait' point, called from 'Z' key */
S.next = function() {
    if (!S.waiting) S.skipping = true;
    onframe(() => Maestro.trigger('scriptNext'));
}

// obsolete?interrupt any running timed scripts
S.interrupt = function() {
    S.interruptTime = Date.now();
    S.next();
}

// obsolete?mark a wait point, S.next() to move past this point ('Z' key)
S.waitnext = async function() {
    if (S.skipping) {       // next() already called before we got to the wait point
        S.skipping = false;
        return 0;           // move immediately over the wait point
    }
    S.skipping = false;
    S.waiting = true;
    msgfix('next', 'waitnext');
    await S.maestro('scriptNext');
    // return 'scriptNext';        // wait for the call to next()
}



// function promisetest(x) {
//     return new Promise( (resolve, reject) => {
//         if (x === 'fail') reject(new Error('fail'));
//         //console.log('setting up promisetest', framenum);
//         setTimeout(() => {
//             //console.log ('resolving promisetest', framenum);
//             resolve({x, framenum});
//             //console.log ('promisetest resolved', framenum);
//         }, 1000);
//     });
// }

// // sample script, called by run TimedScript(testscriptx())
// function *testscriptx(a = 5, b, c) {
//     log('hi1', framenum);
//     yield 200;
//     log('hi2', framenum);
//     for (let i=0; i<20; i++) yield 'postframe'
//     log('hi3', framenum);
//     yield {};
//     log('hi4', framenum);
//     const y = promisetest(77);
//     yield y;
//     log('hi5 after promise', y.result, framenum);


//     return;

//     for (let i = 0; i < a; i++) {
//         CSynth.xyzSpringsRed();
//         yield 1000;
//         CSynth.xyzSpringsWhite();
//         yield 1000;
//     }
// }

// /** test frame and work with yield, use around slottime time before each yield */
// function *testframes(testint = 1000, slottime = 100, tot = 1000000) {
//     let st = performance.now();
//     const sst = st;
//     let slotsn = 0;
//     for (let i=0; i<tot; i++) {
//         if (i%testint === 0) {
//             let et = performance.now();
//             if (et > st+slottime) {
//                 msgfix('i', i, slotsn, '%done', ((i/tot)*100).toFixed(1));
//                 yield 'postframe';
//                 slotsn++;
//                 st = performance.now();
//             }
//         }
//     }
//     const eet = performance.now();
//     msgfixlog('testframes complete, slots', slotsn, 'time', ((eet-sst)/1000).toFixed(3));
// }
