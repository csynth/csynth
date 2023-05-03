/*
 * Code to help display of the main HTML gui panel
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";

/** for encapsulation verification */
var MouseEvent, localStorageGet, localStorageSet, lastToggleGuiAction,
W, killev, makeRegexp, makeRegexpStr, genedefs, FIRST, filterGuiGenes, dispmouseover, xxxdispobj, mainvp, deferRender
;

var foldStates = {}; // fold state structure, also saved as string in local storage

/** toggle fold state, and remember it */
function toggleFold(e) {
    lastToggleGuiAction = 'toggle'
    if (e instanceof MouseEvent)
        e = e.target;  // might be called with event or with element
    var ff = e.parentNode;
    setFoldState(ff, !getFoldState(ff));
    // saveFoldStates();
}

function restoreFoldStates() {
    const _foldStates = localStorageGet("foldStates");
    for (var id in _foldStates) {
        setFoldState(id, _foldStates[id]);
    }
}

// function saveFoldStates() {
//     for (var id in foldStates) {
//         var ff = document.getElementById(id);
//         if (ff) foldStates[id] = ff.classList.contains('hidebelow');
//     }
//     localStorageSet("foldStates", foldStates);
// }

function getFoldState(ff) {
    if (typeof ff === 'string') ff = document.getElementById(ff);
    if (!ff) return;
    return (ff.classList.contains('hidebelow'));
}

function setFoldState(ff, v) {
    if (typeof ff === 'string') ff = document.getElementById(ff);
    if (!ff) return;
    const id = ff.id;
    if (v)
        ff.classList.add('hidebelow');
    else
        ff.classList.remove('hidebelow');
    foldStates[id] = v;
    localStorageSet("foldStates", foldStates);
}

let maxHistStringLength = 200;
const filterDOMEvHistory = JSON.parse(localStorage.filterHistory || "[]").filter(x => x.length < maxHistStringLength);
let filterDOMEvTimeout = undefined;
let filterDOMEvTimeoutTime = 1000;
let filterDOMEvHistoryMaxLength = 10;
/** use an event to filter gui */
// var fieldsets, lastfold;
function filterDOMEv(event = {target: W.guifilter}) {
    // // restore fold state to value after last fold interaction
    // // not sure this is really useful?
    // if (lastToggleGuiAction === 'toggle' || !lastfold) {
    //     lastToggleGuiAction = 'filter';
    //     lastfold = fieldsets.map(fs => [fs, fs.classList]);
    // } else {
    //     for (const [fs, fsc] of lastfold) fs.classList = fsc;
    // }
    if (deferRender) return;

    const src = event.target;
    if (event.type === 'change' && filterDOMEv.last === src.value) {
        return;  // change already dealt with by keyup; redo for keyup with no change to allow simpler testing
    // log('filterDOMEv', event.type, src.value );
    } else if (event.key === "ArrowDown" && event.ctrlKey) {
        showAllButBottom(); killev(event); return;
    } else if (event.key === "ArrowUp" && event.ctrlKey) {
        for (const fs in foldStates) setFoldState(fs, false); killev(event); return;
    } else if (event.key === "ArrowLeft" && event.ctrlKey) {
        for (const fs in foldStates) setFoldState(fs, true); killev(event); return;
    } else if (event.key === "ArrowRight" && event.ctrlKey) {
        showAllButBottom(); killev(event); return;
    } else if (event.key === "Control") {
        return; //otherwise up on control stops ctrl,arrowdown working
    } else if (event.key === "Escape") {
        src.value = '';
    } else if (event.key === "F2" && src.value[0] !== '/') {
        src.value = '/' + makeRegexpStr(src.value);
    }
    filterDOM(makeRegexp(src), W.controlscore, 0, src);
    filterDOMEv.last = src.value;


    filterGuiGenes();

    /** add a timeout on any filter that lasts more than  */
    if (filterDOMEvTimeout) { clearTimeout(filterDOMEvTimeout); filterDOMEvTimeout = undefined; }
    filterDOMEvTimeout = setTimeout(() => {
        addFilterHistory(src.value);
        filterDOMEvTimeout = undefined;
    }, filterDOMEvTimeoutTime);
}

function addFilterHistory(v) {
    if (v.length > maxHistStringLength) return console.error('attempt to add overlong string to filter history', v.substring(0, 40));
    const old = filterDOMEvHistory.indexOf(v);
    if (old !== -1) filterDOMEvHistory.splice(old,1);
    filterDOMEvHistory.unshift(v);
    filterDOMEvHistory.splice(filterDOMEvHistoryMaxLength);
    localStorage.filterHistory = JSON.stringify(filterDOMEvHistory);
    W.filterhistorylist.innerHTML = '<li>' + filterDOMEvHistory.join('&nbsp;</li><li>').replace(/\n/g, '<br>') + '&nbsp;<li>';
}

function filterDOMClick(evt) {
    W.guifilter.value = evt.target.innerHTML.replace(/<br>/g, '\n').replace(/&nbsp;/g, '');
    addFilterHistory(W.guifilter.value);    // instant, no wait
    filterDOMEv();
}

/** show all but not expanded */
function showAllButBottom() {
    for (const fs in foldStates)
        if (window[fs]) setFoldState(fs, window[fs].getElementsByTagName('fieldset').length === 0);
}

/** clear filtering from filterDOM */
function clearDOMFilter(ele) {
    if (ele.oldd !== undefined) {
        ele.style.display = ele.oldd;
        delete ele.oldd;
    } else if (ele.style) {
        ele.style.display = '';
    }
    for (let i=0; i<ele.childNodes.length; i++) {
        clearDOMFilter(ele.childNodes[i]);
    }
}

/** filter a dom element for hits, testregexp is test regexp, ele is top element for filter/search
if testregexp is empty or undefined, the hidden statis is resotored recursively
 */
function filterDOM(testregexp, ele = W.maincontrols, lev = 0, b=undefined, c=undefined, d=undefined, e=undefined) {
    if (ele.id === 'samplegene') return;  // otherwise more recently added genes get a corrupt start in life

    if (lev === 0) clearDOMFilter(ele);   // clean old search before starting new one
    if (!testregexp || testregexp+'' === '/^/') return;  // done


    // Now start the real search =========================
    // Work down to the loweest level and then back up again; otherwise NOT cases do not work well.
    // However, we then consolidate lower level groups to try to make sure everything is displayed with enough context.
    // We may sometimes get too much context, but not usually enough to worry.
    // That can be resolved by refining the original GUI dom structure.

    // if a gene filter is defined, it overrides the global filter for the gene subsection
    if (ele.id === 'genefieldset' && W.genefilter.value.trim())
        testregexp = makeRegexp(W.genefilter.value);

    const cl = ele.classList;
    let cn = ele.childNodes, hitstring = undefined;

    if (cl && cl.contains('gene')) {  // special case for genes
        let gd = genedefs[ele.name];
        if (!gd)
            gd = {tag: 'unknown no genedef'};
        hitstring = [ele.name, ele.genehelpEle.textContent, (gd.free ? 'free' : 'frozen'), gd.tag, 'gene'].join(' '); //check tag matching...
        cn = [];
    } else if (cl && cl.contains('key')) {  // special case for keys
        hitstring = [ele.textContent, 'key'].join(' ');
        cn = [];
    } else if (cn.length === 0) {   // general case for hit at the loweest level
        hitstring = ele.textContent + (ele.value || '') + (ele.id || '');
    }

    let hit = ( hitstring !== undefined &&  testregexp.test(hitstring) )    // main test for lowest (or very low) level hits
        || ele.id === 'genefilter';     // special case for genefilter, very confusing if it is nonempy/active but invisible

    for (let i=0; i < cn.length; i++) hit |= filterDOM(testregexp, cn[i], lev+1, b);    // iterate all the childNodes  (except special case cn)

    if (cl) {  // do not process #text elements (or others without classList if any?)
        if (hit) {
            if ( // so lowest level groups display coherently;  this could be optimized if it becomes and issue
               (ele.getElementsByClassName('group').length
                + ele.getElementsByTagName('fieldset').length
                + ele.getElementsByClassName('key').length
                + ele.getElementsByClassName('savename').length
                + ele.getElementsByClassName('gene').length === 0)
            )
            clearDOMFilter(ele);    // unhide all the bits below we may have just hidden
            if (W.guifilter.value.length > 3)
                makevisGUI(ele);        // is this a good level to do it at?
        } else {  // !hit, so hide the element
            if (ele.tagName !== 'LEGEND') {  // don't hide legends as they are useful context, but still return appropriate value of hit
                ele.oldd = FIRST(ele.oldd, ele.style.display);
                ele.style.display = 'none';
            }
        }
    }
    if (ele === W.filterhistory) clearDOMFilter(ele);   // always keep filterHistory visible
    if (lev === 0 && W.controls && W.controls.onmousemove) W.controls.onmousemove();
    return hit;
}

/** make sure element e is not folded away */
function makevisGUI(e) {
    while (e !== document) {
        e.classList.remove('hidebelow');
        e = e.parentNode;
    }
}

// make sure playing with (current) genes in the gui is reflected in mainvp
W.controlsouter.onmouseenter = () => dispmouseover(0, xxxdispobj(mainvp))