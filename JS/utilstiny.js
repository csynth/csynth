/** various javascript utilities */
'use strict';
var log=console.log;

/** monitor a field by turning it into a property (not monitor, clashes with developer tools) */
function monitorX(object, field, option = 'debugchange') {
    if (typeof object === 'string') {
        const s = object.split('.');
        let o = window;
        for (let i = 0; i < s.length-1; i++) o = o[s[i]];
        object = o; field = s.pop();
    }
    const desc = Object.getOwnPropertyDescriptor(object, field);
    if (!desc) { log('no property to monitor'); return; }
    if (desc.get || desc.set) { log('cannot monitor property', field); return; }
    const v = object[field];
    log(`monitorX initial ${field} = ${v}`);
    Object.defineProperty(object, '..'+field, { // use property so we can prevent enumeration
        value: v,
        writable: true,
        enumerable: false,
        configurable: true    // configurable so we can remove it in unmonitorX
    });

    delete object[field];
    Object.defineProperty(object, field, {
        get : function() {
            if (option.indexOf('logget') !== -1) log(`monitorX get ${field} = ${object['..'+field]}`);
            return object['..'+field];
        },
        set : function(vs) { _monitor_fun(object, field, vs, option) },
        enumerable: true,
        configurable: true
    });
}

/** turn off monitoring, replace the property with a field */
function unmonitorX(object, field) {
    const v = object['..' + field];
    log(`unmonitorX initial ${field} = ${v}`);
    const ok = delete object[field]
    if (!ok) console.error('failed to unmonitor', object, field);
    object[field] = v;
    const ok2 = delete object['..'+field]
    if (!ok2) console.log('failed to remove temp from object', object, '..' + field);
}

function _monitor_fun(object, field, value, option) {
    const un = () => unmonitorX(object, field);    // quick unmonitor when stopped in this function, eg in debugger below
    if (option.indexOf('logset') !== -1) log(`monitorX set ${field} = ${value}`);
    if (object['..' + field] !== value) {
        if (option.indexOf('change') !== -1) log(`monitorX change ${field} = ${object['..' + field]} => ${value}`);
        if (option.indexOf('debugchange') !== -1)
            debugger;  // note: if this is overkill, go up one level in stack to 'set', and set option='change' (or whatever)
        object['..' + field] = value;
    }
}
