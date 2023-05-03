'use strict';
var format, log;
/*
 * functions that may throw 'good' errors, separate file that can be blackboxed
 */

/** test if function is valid */
function funtry(fff) {
    return Function(fff);
}

/** throw an error */
function throwtry(xxx) {
    throw xxx;
}

/** evelauate expression if possible, if not just return expression.
If n is defined, foprmat result to n  */
function evalIfPoss(f, n) {
    if (typeof f === 'number') return f;
    try {
        var rr = Function('return ' + f)();
        if (n !== undefined) return format(rr, n);
        return rr;
    } catch(e) {
        return f;
    }
}

/** execulte javascript if possible, return value (or undefined) if ok, error if not
If n is defined, format result to n  */
function exeIfPoss(f) {
    try {
        let r = Function(f)();
        return r;
    } catch(e) {
        log('failed execution', e, f);
        return e;
    }
}

/** quiet version of eval, less likely to break on error if this file is bloackboxed */
function evalq(x) { return eval(x); }

//XXXXX introducing require in browser environment, so we'd better check environment some other way...
// https://www.npmjs.com/package/detect-node
// rather than install this as a package, I'm going to implement something similar.
// Another approach would be to have electronMain load the page with an extra argument to set a var
var _isNode; // caching this so that "Pause on Caught Exceptions" isn't too arduous.  In (usually sandboxed) errorHolder to mitigate this even more
function isNode() {
    if (_isNode !== undefined) return _isNode;
    if (navigator.userAgent.indexOf('Electron') !== -1) {
        _isNode = true;
    } else if (!window.global) {
        _isNode = false;
    } else {
         try {
            _isNode = Object.prototype.toString.call(window.global.process) === '[object process]';
        } catch (e) { _isNode = false; }
    }
    return _isNode;
}

/** throw an error quietly (sanboxed so no exception trap) */
function throwq(e) {
    throw new Error(e);
}

/** perform a reject that will not get caught as exception if this file is blackboxed  */
function quietReject(reject, r) {
    reject(r);
}

var stack, serious;
/** catch async errors */
function asyncError(e) {
    asyncError.last = e;
    asyncError.stack = stack();
    /** June 2022, Chrome starts throwing async errors for mistypes in the console
     * w.i.p. try to distinguish these from real async errors
     */
    if (!e.returnValue) {console.oldLog(e.message); return; }
    console.error('asyncError caught ................................', e.error.message);
    // console.error(e);
    // console.error('stack', asyncError.stack);
    serious('Async error found', e);
}
asyncError.listenerId = window.addEventListener('error', asyncError);

/** prepare a function, in errorHolder.js to prevent breaking on caught exceptions */
function safeFunction(a,b, fun) {
    return Function(a,b,fun);
}