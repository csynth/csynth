var showvals, copyFrom, confirm, nwwin, W, location, saveTextfile, gl, gpuinfo, gpuparms, writeerroxford,
    CSynth, GX, clone, yaml, jsyaml, badshader, sleep, userlog, searchValues;
/** serious error */
function serious() {
    yaml = yaml || jsyaml;      // make sure defined early enought in case of caught error during load
    var smsg = showvals.apply(undefined, arguments);
    console.error(smsg);
    if (nwwin) nwwin.showDevTools();
    const stack = new Error().stack;
    const ncopy = {}; for (let g in navigator) ncopy[g] = navigator[g];
    const tolog = {
        summary: CSynth ? CSynth.summary() : 'n/a', settings: GX.saveguiString(),
        location: clone(location), navigator: ncopy
    };
    if (gl) {
        gpuinfo(gl);  // probably already available, but make sure we capture it
        tolog.gpuinfo = gpuinfo.parms;
        tolog.gpuparms = gpuparms(gl);
    } else {
        tolog.gpu = 'No gl renderer object yet created';
    }

    const fullmsg =`Unexpected error: ${smsg}
~~~~~~~~~~~~~~~~~~~~~~~
Stack:
${stack}
~~~~~~~~~~~~~~~~~~~~~~~
Etc:
${yaml.safeDump(tolog, {skipInvalid: true})}
`;
    userlog(fullmsg);
    if (searchValues.exhibitionMode) {
            return;
    }

    W.seriousbox.style.display = "";
    W.seriousbody.value = fullmsg;

    W.seriousbody.rows = W.seriousbody.value.split('\n').length + 2;
    W.seriousbody.cols = 100;
    if (!serious.nodebug)
        debugger;
    // check if the real reason was lost context;
    // the contextLost only comes through after the causing thread yields
    async function checkContext() {
        if (gl) {
            const rc = gl.getError();
            await sleep(1);
            if (gl.isContextLost()) {
                W.seriousContextLost.innerHTML = `
<h3>GL context lost</h3>
<p>This is probably becuase there are not enough GPU resources available to satisfy the last request.</p>
<p>Sadly, we cannot recover from this; you must restart the session with F5 or similar.</p>
<h3>The details below are probably only side-effects of this issue, but reported just in case.</h3>
`
            }
        }
    }
    checkContext();

    return smsg;
}

serious.saveLocal = function() {
    saveTextfile(W.seriousbody.value, 'CSynth' + ((new Date()).toISOString().replaceall(":",".")) + '_error.log');
}

serious.selectAll = function() {
    W.seriousbody.focus();
    W.seriousbody.select();
}
serious.upload = function() {
    const r = writeerroxford(W.seriousbody.value);
    const msg = r || 'Error information uploaded to server OK';
    W.seriousbody.value = msg + '\n\n\n' + W.seriousbody.value;
}
serious.clear = function() {
    W.seriousbox.style.display = "none";
    badshader = false;
}

serious.nodebug = function() {
    serious.nodebug = true;
}
