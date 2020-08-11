'use strict';

var doInclude, msgfix, getfiledata,exeIfPoss, onframe;

/** substitute the various bits of $$$xxx$$ with values for xxx
    also more advanced override.  undef is an object to share information about missing override matches
    (following are PJT comments as of 30/03/2017)
    Note that there is now also substituteVirtualShaderFunctions which only deals with virtual / override
    and requires less complex arguments.
    arguments:
  code: original code string.
  vals: value of vals.Foo will be substituted in place of $$$Foo$$ in code
    (but codevariant.Foo has precedence if present)
  codevariant: object with properties that are relevant here:
    overrides: a string with GLSL code containing overrides of virtual functions
    Foo (where "$$$Foo$$" is present shader code)
  type: 'vertex' or 'fragment'
  undef: an object to share information about missing override matches
    In the context of 'vertex' type, this will accumulate flags for any override
    that  exists in codevariant.overrides without corresponding 'virtual' in code.
    In the context of 'fragment' type, it will check for the presence of such a flag
    and if not found, report an error.
 */
function substituteShadercode(code, vals, codevariant, type, undef) {

    code = substituteVirtualShaderCode(code, codevariant.overrides, type, undef);

    // perform simple in-place replacements
    var arr = code.split('$$');
    for (var i = 0; i<arr.length; i++) {
        var part = arr[i];
        if (part[0] === '$') {
            part = part.substring(1);
            arr[i] = codevariant[part] || vals[part] || '/* not substituted $' + part + '*/';
        }
    }
    code = arr.join(' ');
    code = code.split("^").join("p");
    code = doInclude(code);  // consider multiplemutual recursion of doInclude and substituteShadercode
    dojavascript(code);
    code = stripjavascript(code);
    return code;
}

/**
 * Preprocess step for GLSL shader code.
 * 'override' functions in input code marked 'virtual'
 *
 *
 * @param {string} code - original input code, including some virtual functions.
 * @param {string} overrides - code with overrides for virtual functions.
 *      If not set, original code is returned unaltered.
 * @param {string} type - Optional. If this is 'vertex', missing override matches will add a flag to undef (if present),
 *      on the basis that a function not overriden in vertex may still be overriden by fragment.
 *      For non-vertex, undef (if present) will be checked to see if the
 * @param {object} undef - Optional.
 *      Object for sharing information about missing override matches.
 *      Either {} for passing in to 'vertex',
 *      or an object containing flags added by a previous pass of this function.
 *      You might not want to bother with this if you don't care much about the relation between
 *      vertex and fragment shaders (eg, you know only fragment code has virtuals).
 */
function substituteVirtualShaderCode(code, overrides, type, undef) {
    if (!overrides) return code;
    const hasUndef = undef !== undefined;
    // replace overrides in their correct position
    var oo = overrides.split('override ');
    for (var i =0; i<oo.length; i++) {
        var o = oo[i].trim();
        var def = o.pre('{').trim();
        if (def === '' || def.trim().substring(0,2) === '//') continue;
        def = 'virtual ' + def;     // this prevents overriding of functions unless the raw defintion has permitted it
        var body = o.post('{');
        var xpre = code.pre(def);
        var xpost = code.post(def)
        if (!xpost) {
            if (hasUndef && type === 'vertex') {    // no override in vertex, pend to check i fragment
                undef[def] = true;
            } else if (hasUndef && !undef[def]) {   // no override in fragment, but there was one for vertex
            } else {                    // no override in either, flag to the user
                console.error('overridable definition not found for replacement, ignored: ', def);
                msgfix('overridable definition not found for replacement, ignored: ', def);
            }
        } else {
            var base = base = def.replace('(', '_base(');
            xpost = base + '\n' + xpost;
            code = xpre + '\n' + base + ';\n' + def + ' { // from override\n' + body + '\n' + xpost;
        }
    }
    return code;
}

// parse and execute javascript from string
function dojavascriptfid(fid) {
    dojavascript(getfiledata(fid));
}

// parse and execute javascript from string
function dojavascript(s) {
    var ss = s.split('JAVASCRIPT');
    // http://stackoverflow.com/questions/19696015/javascript-creating-functions-in-a-for-loop, let usefule here
    for (let i=1; i < ss.length-1; i+=2) {
        var f = function() { exeIfPoss(ss[i].trim().substring(1).slice(0,-3)); } // evaluate removing leading ( and trailing )//
        f();
        onframe(f, 2);
    }
}

// strip javascript from string
function stripjavascript(s) {
    var ss = s.split('JAVASCRIPT');
    var sss = [];
    for (var i=0; i<ss.length; i+=2) {
        sss.push (ss[i]);
    }
    return sss.join('\n//javascript removed\n')
}

