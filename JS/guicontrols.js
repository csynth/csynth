/*
 * Code to help display of the main HTML gui panel
 * Part of organicart.  Copyright Goldsmiths, Stephen Todd, Peter Todd, 2015.
 */
"use strict";

/** for encapsulation verification */
var MouseEvent, localStorageGet, localStorageSet;

var foldStates = {}; // fold state structure, also saved as string in local storage
/** toggle fold state, and remember it */
function toggleFold(e) {
    if (e instanceof MouseEvent)
        e = e.target;  // might be called with event or with element
    var pn = e.parentNode;
    if (pn.classList.contains('hidebelow'))
        pn.classList.remove('hidebelow');
    else
        pn.classList.add('hidebelow');
    if (pn.id) {
        foldStates[pn.id] = pn.classList.contains('hidebelow');
        localStorageSet("foldStates", foldStates);
    }
}

function restoreFoldStates() {
    foldStates = localStorageGet("foldStates");
    if (foldStates === undefined) foldStates = {};
    for (var f in foldStates) {
        var ff = document.getElementById(f);
        if (ff && foldStates[f] !== ff.classList.contains('hidebelow'))
            toggleFold(ff.firstChild);
    }
}
