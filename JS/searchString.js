/** interpret the search string
 * This is called twice, once pretty much before any code loaded, and then onload
 * eval1 and eval2 are called on first and second call resp.
*/
var serious, alert, localStorage, usesavedglsl, startvr=false, runtest, ises300, enterfullscreen, inps, setViewports, Touch2Init, W,
nomess, brusselsNoAuto, _isNode, onframe, appToUse, mutatetad, fileExists;   // so windows.startvr exists as bool
var searchValues = {};

var searchReplace = {
    tadopt: 'startobj = tad-fubu & docovid & useKinect & fastinit & noguigenes & notadgui & deferRender & splashuri=images/UI/startcovid.jpg',
    tadkin: 'startobj=tad-factory & docovid & useKinect & fastinit & noVR & splashuri=images/UI/startcovid.jpg',
    tadkinscript: 'tadkin & eval3=setTimeout(() => {fullscreen(); runkeys("Insert,S")}, 2000)',
    tadnoaudio: 'tadkin & noaudio',
    orgbw: 'standard & eval3=tadbwSetup();setViewports([0,0])',
    tadbw: 'tadnoaudio & eval1=usemask=1 & eval1=usemask=1 & eval3=tadbwSetup() & canvtop',
    tadmanchester: 'tadnoaudio & eval1=usemask=2 & eval1=usemask=2 & eval3=tadmanchesterSetup() & canvtop',
    tadchina: 'tadnoaudio & tadnoform & eval1=usemask=2 & eval1=usemask=2 & eval3=tadchinaSetup() & canvtop & tadnum=2000',
    tadsmall: 'tadkin & ribs=4 & tadnum = 600 & initrolename = tree15 & MAX_DEFS_PER_PARTICLE = 16 & startcam & startobj = tad-cammus',
    tadcam: 'tadkin & startcam',
    kintadmut: 'tadkin & notaddetails & noaudio & eval3=setTimeout(() => mutatetad = new mutateTad(),10000)',
    tadmutnoiseimage: 'tadkin & notaddetails & noaudio & nouseKinect & eval3=setTimeout(() => mutatetad = new mutateTad("tadmutnoiseimage"), 1)',   // setTimeout(tadmutnoiseimage,1000)
    tadpomp: 'startobj=tad & startvr & dotadpomp & initrolename=tree12',
    limaprojector: 'mutate & doublescreen & I.fullvp=true',  // prepared for Lima with touch screen and projector, not actually used
    lima: 'mutate & fullscreen & onebutton & simpledrag & eval3=limainitend() & splashzindex=999999999',
    mutate: 'testobj & noVR & inmutate & eval1=_isNode=false & eval2=setTimeout(mutlimasetup,1000) & noaudio',
    mutate1200: 'mutate & I.MAXHORNS_TO_RENDER=1200 & eval3=resoverride.skelnum=7,resoverride.skelends=0,GUIInit("mutwall test"),VH.positionGUI(),GUIwallkeys()',
    testobj: 'startobj=GalaxRefl2023Nov03 & I.fullvp=false',
    standard: 'testobj & eval3=setViewports([0,0]), centrescalenow()',
    imfind: 'standard & eval3=imcompareInteract()',
    sympaint: 'eval3=Tracker.init()',
    headless: 'noislocalhost & eval3=addscript("JS/headless.js")',
    fullfract: 'standard & startobj=GalaxReflFract',

    threek: 'startobj=startup',
    // csynth: 'startscript',
    rsse: 'startscript=wimm/rsse/loadrsse.js',
    crick: 'startscript=CrickLots/lots.js',
    newsc2023: "startscript=ima/newsc2023.js & startvr & fullscreen",   // nb: front for exhibition
    fullvir: "newsc2023 & nofront & nostartvr",
    ima: "startscript=ima/ima.js",
    lowry: 'startscript=ima/lowry.js',
    york: 'startscript=YorkStudents/newtest_v5.js',
    lorentz: 'startscript=Lorentz/lorentz.js',
    steve: 'startscript=wimm/SteveJan19/test.js',
    covid: 'startscript=covid/spike.js',
    covidzip: 'startscript=covid/spikezip.js',
    pdb: 'pdb=1GFL',
    triyork: 'startscript=tric/tric.js',
    fano: 'appToUse=Fano',
    julia: 'appToUse=Julia',
    texture: 'appToUse=Texture',
    mousetiff: 'startscript=C75X1200GitHub/loadtiff.js',
    mousenotiff: 'startscript=C75X1200GitHub/loadnotiff.js',
    mcgill: 'startscript=McGill/McGill.csyconfig',

    cexample1: 'rsse',
    cexample2: 'startscript=CrickGithub/loadcrick_chrII.js',
    cexample3: 'startscript=chr13multiresGitHub/load_50kb.js',
    cexample4: 'mousetiff',
    // cexample3_5: 'startscript=chr13multiresGitHub/load_5kb.js',
    cexample3_50: 'startscript=chr13multiresGitHub/load_50kb.js',
    // cexample3_data: 'startscript=chr13multiresGitHub/load_data.js',
    cexample3_smaller: 'startscript=chr13multiresGitHub/load_smaller.js',
    wimmdir: 'rsse & eval3=onframe(()=>CSynth.msgAllFiles("CSynth/data/wimm",true),10)',

};

var useForced;
function interpretSearchString(istring, error = serious || alert) {
    let var0 = '';
    if (istring === undefined) istring = decodeURIComponent(location.search.substring(1));
    if (istring === 'last')
        istring = localStorage.interpretSearchString_last || '';
    else
        localStorage.interpretSearchString_last = istring;

    if (istring === 'last')
        istring = localStorage.istring
    else
        localStorage.istring = istring;

    if (istring.search(/['";]/) !== -1) {  // use the search string as javascript
        try {
            eval(istring);
        } catch (e) {
            error("cannot eval search string '" + istring + ":'\n" + e);
        }
    } else {                        // parse search string by & = rules; also allow ! for & to help cmd files
        const vars = istring.split('!').join('&').split('&');
        var0 = vars[0];
        for (let i = 0; i < vars.length; i++) {
            let vi = vars[i].trim();
            while (searchReplace[vi]) {
                searchValues[vi] = true;
                vars.splice(i, 1, ...searchReplace[vi].split('&'));
                vi = vars[i].trim();
            }
            const mmm = vi.match(/(.*?)=(.*)/);
            if (mmm) {                      // form key=val
                let k = mmm[1].trim();
                let v = mmm[2].trim();
                if (v === 'true') v = true;
                else if (v === 'false') v = false;
                else if (!isNaN(v)) v = +v;
                searchValues[k] = v;
                if (k in window) window[k] = v;
            } else {                        // form key;  may be xxx or noxxx, knot will be noxxx/xxx respectively
                const k = vi;
                const knot = k.substring(0,2) === 'no' ? k.substring(2) : 'no' + k;
                searchValues[k] = true;
                searchValues[knot] = false
                if (typeof window[k] === 'boolean') window[k] = true;   // n.b. eg window.guigenes will NOT be set
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
    }

    if (searchValues.startscript || searchValues.pdb) useForced = 'csynth'
    else if (searchValues.startobj || searchValues.appToUse) useForced = 'threek'
    if (useForced === 'csynth' && !location.href.includes('csynth.html')) location.href = location.href.replace('threek.html', 'csynth.html');
    if (useForced === 'threek' && !location.href.includes('threek.html')) location.href = location.href.replace('csynth.html', 'threek.html');

    if (searchValues.fullscreen) setTimeout(enterfullscreen, 1);
    // handle testing if require, not at very start but on 2nd call to interpretSearchString
    if (runtest && 'test' in searchValues) {runtest(searchValues.test);}
    try {
        if (!interpretSearchString.done && searchValues.eval1) eval(searchValues.eval1);
    } catch(e) {
        console.error('interpretSearchString eval1', e, searchValues.eval1);
    }
    try {
        if (interpretSearchString.done && searchValues.eval2) eval(searchValues.eval2);
    } catch(e) {
        console.error('interpretSearchString eval2', e, searchValues.eval2);
    }
    if (interpretSearchString.done && searchValues.eval3) window.addEventListener('initdone', () => eval(searchValues.eval3));

    if (!interpretSearchString.done)
        document.title += ' ' + var0 + '   ...' + Date.now().toString().slice(-2);
    interpretSearchString.done = true;
}
interpretSearchString(undefined, console.error);

function checkSearchReplace(pre='CSynth/data/') {
    let bad = 0, good = 0;
    for (const [k,v] of Object.entries(searchReplace)) {
        const ss = v.post('startscript=')?.pre('&')?.trim()
        if (ss)
            if (!fileExists(pre + ss))
            {bad++; console.log(k, ': no file', ss, v)}
        else
            good++;
    }
    console.log('checkSearchReplace', 'bad', bad, 'good', good);
}
//console.clear()
//checkSearchReplace()
