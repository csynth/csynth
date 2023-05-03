/**
 * Gldebug implements a mechanism for wrapping and monitoring all gl calls.
 * Gldebug.start(opts) applies a wrapper to all gl and gl extension functions.
 * Gldebug.stop() restores the original gl builtin functions.
 *
 * Gldebug imposes a very significant overhead so should be used sparingly,
 * but can be very helpful for debugging without the need to make lots of code changes.
 *
 * The wrapper can check for gl errors before (should be unnecessary) and after every gl call.
 * The wrapper logs some statistics, and takes optional actions, depending on 'action' and any error found.
 * 'action' is a string that can contain one or more of
 *  logall:         all gl calls are logged
 *  logerr:         gl error calls are logged
 *  breakall:       debugger break on every gl call
 *  breakerr:       debugger break on error gl calls
 *  checkbefore:    checks are carried out before each call (by default they are not)
 *  nocheckafter:   checks are not carried out after each call (by default they are)
 *
 * Gldebug.start() takes an options object as input, which can contain
 *  gl:         gl context, if not given this may be deduced from window.sk or Gldebug.gl
 *  action:     action string as above: defaults to 'logerr'
 *  frames:     number of frames to debug before automatic stop: defaults to Infinity.
 *  frameOwner: object in which the frame counter lives: defaults to window
 *  frameName:  name of frame counter field within frameOwner: defaults to 'framenum'
 *              It is the user program responsibility to update frameOwner[frameName].
 *              Framecounting will depend on exactly where in the frame cycle the start call and framenum update happen.
 *  filter:     regex to filter which gl functions are patched
 *
 * As a shortcut Gldebug.start() may be called with an integer (frames) or a string (action)
 *
 * Example calls:
 * Gldebug.start(1)                                     // check all gl calls and log errors, until stop
 * Gldebug.start(1)                                     // check all gl calls for 1 frame and log errors
 * Gldebug.start({gl, action: 'logall', frames: 1})     // leg all gl calls for 1 frame
 *
 * Additionally: Gldebug.checkglerr() may be called at any point of a user program
 *      to check for outstanding gl errors and take appropriate action.
 */

var Gldebug = { // var for sharing, was const
    ops: {}, errs: [], errnum: 0,                                           // these collect statistics of calls and errors
    serious: console.error, showbaderror: console.error, error: console.error, log: console.log,  // these can be tailored if required
    start: function startgldebug(opts = {}) {
        Gldebug.checkglerr('Check for gl errors outstanding before call to Gldebug.start().');
        let lastop, stopframe;
        if (!opts) return;
        if (typeof opts === 'string') opts = {action: opts};
        else if (typeof opts === 'number') opts = {frames: opts};
        else if (typeof opts !== 'object') opts = {};                       // most likely boolean
        const filter = opts.filter || '';

        let {gl, action = 'logerr', frames = Infinity, frameOwner = window, frameName = 'framenum'} = opts;

        gl = gl || Gldebug.gl || window.gl;
        if (!gl) {Gldebug.showbaderror('cannot find gl context for Gldebug.start()'); return; }
        Gldebug.log('Gldebug.start at frame', frameOwner[frameName]);

        if (!Gldebug.consts) {
            Gldebug.consts = {};
            for (const n in gl) {
                const v = gl[n];
                if (typeof v === 'number' && v > 8)
                    Gldebug.consts[v] = n + '/' + v;  // allow for multiple???
            }
        }

        // compute gllist list of extensions
        function allglex() {
            const gllist = [gl];
            // const gl = renderer.getContext();
            let exts = gl.getSupportedExtensions();
            for (let i = 0; i < exts.length; i++) gllist.push(gl.getExtension(exts[i]));
            return gllist;
        }
        stopframe = frameOwner[frameName] + frames;
        Gldebug.gl = gl;
        if (gl.old) { Gldebug.error("already debugging"); return; }
        if (!Gldebug.gllist) Gldebug.gllist = allglex();
        const gllist = Gldebug.gllist;
        Gldebug.errs = [];
        Gldebug.errnum = 0;

        // iterate over basic gl + all extensions
        let ggl;
        for (let i = 0; i < gllist.length; i++) {
            ggl = gllist[i];
            ggl.old = {};
            for (let f in ggl) {  // iterate over functions within ggl
                if (typeof ggl[f] === "function" && f !== "getError" && f !== "finish" && f.match(filter)) {
                    ggl.old[f] = ggl[f];
                    (function (ff, of, ggll) {
                        ggll[ff] = function () {
                            if (frameOwner[frameName] > stopframe) {
                                Gldebug.log('Gldebug.stop at first call in frame', frameOwner[frameName]);
                                Gldebug.stop();
                            }
                            if (action.indexOf('checkbefore') !== -1)
                                Gldebug.checkglerr(`"debug wrapped !!! BEFORE ${ff} (lastop ${lastop})` , action, arguments, gl);
                            let r = of.apply(ggll, arguments);
                            Gldebug.ops[ff] = (Gldebug.ops[ff] || 0) + 1;
                            if (action.indexOf('nocheckafter') === -1)
                                Gldebug.checkglerr("debug wrapped " + ff, action, arguments, gl);
                            lastop = [ff, arguments];
                            return r;
                        };
                    })(f, ggl[f], ggl);
                }
            }
        }
    },

    /** stop current debug session */
    stop: function (gl = Gldebug.gl) {
        if (!gl.old) { Gldebug.error("not currently debugging"); return; }
        for (let i = 0; i < Gldebug.gllist.length; i++) {
            let ggll = Gldebug.gllist[i];
            for (let f in ggll.old) {
                ggll[f] = ggll.old[f];
            }
            ggll.old = undefined;
        }
    },

    /** check for current GL error status:
     * Called internally during Gldebug session before and after every gl call.
     * May also be called externally to checkl errors at explicit parts of a user program.
     */
    checkglerr: function(msg, action = 'logerr', args, gl = Gldebug.gl || window.gl) {
        if (!gl) { Gldebug.error('checkglerr called without available context gl'); return -999; }
        gl.finish();
        let rc = gl.getError();
        let errmsg = (rc) ? findval(gl, rc) : 'OK';
        const ff = x => Gldebug.consts[x] || (x+'').substring(0, 20);

        if (args) {
            msg += "  (" + [].slice.call(args).map(ff).join(", ") + ")";
        }

        if (action.indexOf('logall') !== -1)
            Gldebug.log(">> gl" + msg + "            " + errmsg[0] + " (" + rc + " 0x" + rc.toString(16) + ")");
        if (action.indexOf('breakallall') !== -1)
            debugger;

        if (rc) {
            const emsg = errmsg[0] + " (" + rc + " 0x" + rc.toString(16) + ") in " + msg;
            Gldebug.errnum++;
            if (Gldebug.errnum < 20) Gldebug.errs.push(emsg);
            if (action.indexOf('logerr') !== -1)
            Gldebug.error(">> webgl error " + emsg);
            if (action.indexOf('breakerr') !== -1)
                debugger;
            if (action.indexOf('seriouserr') !== -1)
                Gldebug.serious(msg);
        }

        if (rc === gl.CONTEXT_LOST_WEBGL) {
            Gldebug.showbaderror("WebGL context lost ~ you will probably need to refresh.");
        }
        return rc;
    }
}


/** find exact value in object, return (list of) keys */
function findval(obj, val) {
    var s = [];
    for (var nq in obj) if (obj[nq] === val) s.push(nq);
    return s;
}

