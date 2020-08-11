/** interpret the search string */
var serious, alert, location, localStorage, usesavedglsl, startvr=false;   // so windows.startvr exists as bool
var searchValues = {};
function interpretSearchString(error = serious || alert) {

    let istring = unescape(location.search.substring(1));
    if (istring === 'last')
        istring = localStorage.interpretSearchString_last || '';
    else
        localStorage.interpretSearchString_last = istring;

    if (istring.search(/['";]/) !== -1) {  // use the search string as javascript
        try {
            eval(istring);
        } catch (e) {
            error("cannot eval search string '" + istring + ":'\n" + e);
        }
    } else {                        // parse search string by & = rules; also allow ! for & to help cmd files
        const vars = istring.split('!').join('&').split('&');
        for (let i = 0; i < vars.length; i++) {
            const mmm = vars[i].match(/(.*?)=(.*)/);
            if (mmm) {                      // form key=val
                let v = mmm[2];
                if (v === 'true') v = true;
                else if (v === 'false') v = false;
                else if (!isNaN(v)) v = +v;
                searchValues[mmm[1]] = v;
                if (mmm[1] in window) window[mmm[1]] = v;
            } else {                        // form key;  may be xxx or noxxx, knot will be noxxx/xxx respectively
                const k = vars[i];
                const knot = k.substr(0,2) === 'no' ? k.substr(2) : 'no' + k;
                searchValues[k] = true;
                searchValues[knot] = false
                if (typeof window[k] === 'boolean') window[k] = true;
                if (typeof window[knot] === 'boolean') window[knot] = false;
            }
        }
        // special case for CSynth and structured startscript
        if (searchValues.startscript) {
            let s = searchValues.startscript;
            if (searchValues.p) s += '&p=' + searchValues.p;
            if (searchValues.file) s += '&file=' + searchValues.file;
            window.startscript = s;
        }

        // special case for lowry; cannot be done in lowry.js as that comes too late
        if (location.href.indexOf('lowry.js') !== -1 || location.href.indexOf('covid.js') !== -1) {
            if (searchValues.nohorn === undefined) searchValues.nohorn = true;
            if (searchValues.leap === undefined) searchValues.leap = true;
        }

        // spacial case for linux and usesavedglsl
        if (searchValues.opt) usesavedglsl='OPTIMIZE.opt';  // csynth use pre-optimized shader code
        if (!usesavedglsl) usesavedglsl = searchValues.usesavedglsl;
        if (navigator.platform.toLowerCase().indexOf('linux') !== -1 && !usesavedglsl)
            usesavedglsl='OPTIMIZE.opt';
    }
}
